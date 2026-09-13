import { APP_CONFIG, PROVIDERS } from "./config.js";
import { AutonomousEngine } from "./autonomous-engine.js";

/**
 * Strips internal thinking or reasoning tags (<think>...</think>) from text
 */
export function stripThinking(text) {
  if (!text) return "";
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, "");
  return cleaned;
}

/**
 * Sanitizes upstream error messages for clean white-label display
 */
export function sanitizeErrorMessage(rawMsg) {
  if (!rawMsg) return "Connection interrupted. Please try again.";
  let cleaned = rawMsg.replace(/https?:\/\/(?:openrouter\.ai|api\.groq\.com|console\.groq\.com)\S*/gi, "");
  cleaned = cleaned.replace(/openrouter/gi, "cloud engine");
  cleaned = cleaned.replace(/groq/gi, "Vinayak Engine");
  if (
    cleaned.toLowerCase().includes("afford") ||
    cleaned.toLowerCase().includes("credits") ||
    cleaned.toLowerCase().includes("insufficient")
  ) {
    return "Cloud engine token quota reached for current request. Please lower max generation tokens in Settings or switch models.";
  }
  if (cleaned.toLowerCase().includes("free-models-per-day") || cleaned.toLowerCase().includes("rate_limit")) {
    return "Engine request limit reached. Vinayak Autonomous Core is active.";
  }
  return cleaned.trim();
}

/**
 * Universal AI Client supporting OpenRouter (Gemini default), Google Gemini Direct, and Alibaba Qwen Direct
 */
export class OpenRouterClient {
  constructor(apiKey, provider = "groq") {
    this.provider = provider || "groq";
    const defaultKey = this.provider === "groq" ? APP_CONFIG.defaultGroqApiKey : APP_CONFIG.defaultApiKey;
    this.apiKey = apiKey || defaultKey;
    this.updateProvider(this.provider, this.apiKey);
  }

  updateProvider(providerId, apiKey) {
    this.provider = providerId || "groq";
    this.apiKey = apiKey !== undefined ? apiKey : this.apiKey;
    const providerConfig = PROVIDERS[this.provider] || PROVIDERS.groq;
    this.baseUrl = providerConfig.baseUrl;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * Stream chat completion from active provider
   */
  async streamChat({
    model,
    messages,
    temperature = 0.7,
    maxTokens = 800,
    webSearch = true,
    signal,
    onChunk,
    onDone,
    onError,
  }) {
    const startTime = performance.now();
    let accumulatedContent = "";

    const lastUserMsg = [...(messages || [])].reverse().find((m) => m.role === "user")?.content || "";

    // 1. Direct route for Vinayak Autonomous Core
    if (model === "vinayak-autonomous-core") {
      return AutonomousEngine.streamResponse(lastUserMsg, "general", signal, onChunk, onDone);
    }

    try {
      const providerConfig = PROVIDERS[this.provider] || PROVIDERS.groq;
      const targetModel = model || providerConfig.defaultModel;

      const defaultKeyForProvider = this.provider === "groq" ? APP_CONFIG.defaultGroqApiKey : APP_CONFIG.defaultApiKey;
      const keyToUse = (this.apiKey && this.apiKey.trim()) || defaultKeyForProvider;
      const isDefaultKey = keyToUse === defaultKeyForProvider;

      // Smart token bounding: default openrouter key has credit constraints (max 500 tokens), Groq has full token limits
      const requestedTokens = parseInt(maxTokens) || 800;
      const effectiveMaxTokens = (isDefaultKey && this.provider === "openrouter")
        ? Math.min(requestedTokens, 500)
        : Math.min(requestedTokens, 4096);

      const requestBody = {
        model: targetModel,
        messages,
        temperature: parseFloat(temperature) || 0.7,
        max_tokens: effectiveMaxTokens,
        stream: true,
      };

      // OpenRouter provider routing & fallbacks
      if (this.provider === "openrouter") {
        requestBody.provider = { allow_fallbacks: true };
        if (targetModel.includes("deepseek")) {
          requestBody.models = [
            targetModel,
            "deepseek/deepseek-r1-distill-llama-70b",
            "deepseek/deepseek-r1"
          ];
        }
        if (webSearch) {
          requestBody.plugins = [{ id: "web", max_results: 5 }];
        }
      }

      const headers = {
        Authorization: `Bearer ${keyToUse}`,
        "Content-Type": "application/json",
      };

      if (this.provider === "openrouter") {
        headers["HTTP-Referer"] = APP_CONFIG.siteUrl;
        headers["X-Title"] = APP_CONFIG.siteName;
      }

      const endpoint = `${this.baseUrl}/chat/completions`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        let isRateLimit = response.status === 429;
        let isProviderError = false;
        let affordableTokens = null;
        let rawDetail = "";
        try {
          const errData = await response.json();
          if (errData.error?.metadata?.raw) {
            rawDetail = errData.error.metadata.raw;
          }
          if (errData.error?.message) {
            errorMsg = errData.error.message;
            if (errorMsg.toLowerCase().includes("provider returned error")) {
              isProviderError = true;
            }
          } else if (errData.message) {
            errorMsg = errData.message;
          }
          if (rawDetail) {
            errorMsg = `${errorMsg} (${rawDetail})`;
          }

          // Auto-detect affordable token count from OpenRouter 402 credit cap notice
          const affordMatch = errorMsg.match(/can only afford\s+(\d+)/i);
          if (affordMatch) {
            affordableTokens = parseInt(affordMatch[1], 10);
          }
        } catch (_) { }

        // Self-healing: if OpenRouter tells us we can only afford X tokens, auto-adapt immediately!
        if (response.status === 402 && affordableTokens && affordableTokens >= 60 && effectiveMaxTokens > affordableTokens) {
          const adaptedTokens = Math.max(60, affordableTokens - 15);
          console.info(`[OpenRouter 402 Auto-Adapt] Token budget reduced from ${effectiveMaxTokens} to ${adaptedTokens} to match available credit balance.`);
          return this.streamChat({
            model: targetModel,
            messages,
            temperature,
            maxTokens: adaptedTokens,
            webSearch,
            signal,
            onChunk,
            onDone,
            onError,
          });
        }

        // Credit/quota exhausted — surface a real error to the UI
        if ((response.status === 402 || response.status === 429) && isDefaultKey) {
          const quotaErr = new Error("API credit limit reached. Please add your own API key in Settings, or switch to a different model.");
          quotaErr.status = response.status;
          quotaErr.isRateLimit = true;
          if (onError) onError(quotaErr);
          return;
        }

        const sanitizedMsg = sanitizeErrorMessage(errorMsg);
        const customErr = new Error(sanitizedMsg);
        customErr.status = response.status;
        customErr.isRateLimit = isRateLimit || errorMsg.includes("rate-limited");
        customErr.isProviderError = isProviderError;
        customErr.rawDetail = rawDetail ? sanitizeErrorMessage(rawDetail) : "";
        customErr.affordableTokens = affordableTokens;
        throw customErr;
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported by browser or response is empty.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6).trim();

            if (dataStr === "[DONE]") {
              const cleanFinal = stripThinking(accumulatedContent).trim();
              const durationMs = Math.round(performance.now() - startTime);
              if (onDone) {
                onDone({
                  content: cleanFinal,
                  durationMs,
                  model: targetModel,
                });
              }
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                const streamErr = new Error(parsed.error.message || "Provider returned error during stream");
                streamErr.isRateLimit = parsed.error.code === 429 || (parsed.error.message && parsed.error.message.includes("rate-limited"));
                streamErr.isProviderError = true;
                throw streamErr;
              }
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta || {};

              // Handle content stream (strictly stripping any thinking or reasoning tokens)
              if (delta.content) {
                accumulatedContent += delta.content;
                const sanitizedDisplay = stripThinking(accumulatedContent);
                if (onChunk && sanitizedDisplay) {
                  onChunk(delta.content, sanitizedDisplay);
                }
              }
            } catch (jsonErr) {
              // Ignore partial JSON parse errors in stream
            }
          }
        }
      }

      // Stream completed without explicit [DONE]
      const cleanFinal = stripThinking(accumulatedContent).trim();
      const durationMs = Math.round(performance.now() - startTime);
      if (onDone) {
        onDone({
          content: cleanFinal,
          durationMs,
          model: targetModel,
        });
      }
    } catch (err) {
      if (err.name === "AbortError") {
        const cleanFinal = stripThinking(accumulatedContent).trim();
        const durationMs = Math.round(performance.now() - startTime);
        if (onDone) {
          onDone({
            content: cleanFinal,
            durationMs,
            model,
            aborted: true,
          });
        }
        return;
      }

      const keyToUse = (this.apiKey && this.apiKey.trim()) || APP_CONFIG.defaultApiKey;
      const isDefaultKey = keyToUse === APP_CONFIG.defaultApiKey;
      const errMsg = (err.message || "").toLowerCase();

      if (
        (err.status === 402 ||
          err.status === 429 ||
          errMsg.includes("quota") ||
          errMsg.includes("credit") ||
          errMsg.includes("afford") ||
          errMsg.includes("insufficient")) &&
        isDefaultKey
      ) {
        const quotaErr = new Error("API credit limit reached. Please add your own API key in Settings, or switch to a different model.");
        quotaErr.status = err.status;
        quotaErr.isRateLimit = true;
        if (onError) onError(quotaErr);
        return;
      }

      if (onError) onError(err);
      else console.error("AI API stream error:", err);
    }
  }

  /**
   * Validate key against the active provider
   */
  async checkKeyStatus() {
    const defaultKey = this.provider === "groq" ? APP_CONFIG.defaultGroqApiKey : APP_CONFIG.defaultApiKey;
    const key = (this.apiKey && this.apiKey.trim()) || defaultKey;
    if (!key) {
      return { valid: false, error: "Please enter an API key in Settings." };
    }

    try {
      if (this.provider === "groq") {
        const res = await fetch(`${this.baseUrl}/models`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          return { valid: false, error: `Invalid Groq API key (${res.status})` };
        }
        return { valid: true, data: { label: "Groq LPU Engine Verified" } };
      } else if (this.provider === "openrouter") {
        const res = await fetch(`${this.baseUrl}/auth/key`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          return { valid: false, error: `Invalid OpenRouter key or error (${res.status})` };
        }
        const json = await res.json();
        return { valid: true, data: json.data };
      } else if (this.provider === "gemini") {
        // Test Google Gemini key via models list
        const res = await fetch(`${this.baseUrl}/models`, {
          headers: { Authorization: `Bearer ${this.apiKey.trim()}` },
        });
        if (!res.ok) {
          return { valid: false, error: `Invalid Google Gemini key (${res.status})` };
        }
        return { valid: true, data: { label: "Google AI Studio Verified" } };
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }
}
