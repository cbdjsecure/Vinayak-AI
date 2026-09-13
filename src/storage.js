import { APP_CONFIG, PERSONAS } from "./config.js";

const STORAGE_KEYS = {
  SETTINGS: "nexus_ai_settings",
  SESSIONS: "nexus_ai_sessions",
  ACTIVE_SESSION: "nexus_ai_active_session_id",
  SESSION_PREFIX: "nexus_ai_msgs_",
  TRAINING_DATASET: "vinayak_training_dataset",
};

export const Storage = {
  // Settings
  getSettings() {
    const defaultGroqKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_API_KEY) || APP_CONFIG.defaultGroqApiKey;
    const defaultOpenRouterKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENROUTER_API_KEY) || APP_CONFIG.defaultApiKey;
    const defaultGeminiKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) || "";

    const defaults = {
      provider: "groq",
      groqApiKey: defaultGroqKey,
      apiKey: defaultOpenRouterKey,
      geminiApiKey: defaultGeminiKey,
      model: APP_CONFIG.defaultModel,
      autoRouting: true,
      persona: "tax",
      temperature: 0.7,
      maxTokens: 800,
      customPrompt: "",
      stream: true,
      webSearch: true,
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Scrub any sensitive backend API keys from client localStorage
          delete parsed.groqApiKey;
          delete parsed.apiKey;
          delete parsed.geminiApiKey;
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
        }

        const clampedTokens = parsed.maxTokens && parsed.maxTokens <= 1500 ? parsed.maxTokens : 800;
        return {
          ...defaults,
          ...parsed,
          provider: parsed.provider === "openrouter" ? "groq" : (parsed.provider || "groq"),
          groqApiKey: defaultGroqKey,
          apiKey: defaultOpenRouterKey,
          geminiApiKey: defaultGeminiKey,
          maxTokens: clampedTokens,
        };
      }
    } catch (e) {
      console.warn("Error reading settings from localStorage", e);
    }
    return defaults;
  },

  saveSettings(settings) {
    try {
      const sanitized = { ...settings };
      // Never store sensitive API keys in plaintext in client localStorage
      delete sanitized.groqApiKey;
      delete sanitized.apiKey;
      delete sanitized.geminiApiKey;
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(sanitized));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  },

  // Sessions list
  getSessions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn("Failed to load sessions", e);
      return [];
    }
  },

  saveSessions(sessions) {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save sessions", e);
    }
  },

  getActiveSessionId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  },

  setActiveSessionId(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
  },

  createSession(initialTitle = "New Conversation", personaId = "general", modelId = APP_CONFIG.defaultModel) {
    const id = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const session = {
      id,
      title: initialTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      persona: personaId,
      model: modelId,
    };

    const sessions = this.getSessions();
    sessions.unshift(session);
    this.saveSessions(sessions);
    this.setActiveSessionId(id);
    this.saveSessionMessages(id, []);
    return session;
  },

  updateSession(id, updates) {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates, updatedAt: Date.now() };
      this.saveSessions(sessions);
      return sessions[index];
    }
    return null;
  },

  deleteSession(id) {
    let sessions = this.getSessions();
    sessions = sessions.filter((s) => s.id !== id);
    this.saveSessions(sessions);
    localStorage.removeItem(STORAGE_KEYS.SESSION_PREFIX + id);

    if (this.getActiveSessionId() === id) {
      const nextSession = sessions[0];
      this.setActiveSessionId(nextSession ? nextSession.id : null);
      return nextSession ? nextSession.id : null;
    }
    return this.getActiveSessionId();
  },

  clearAllSessions() {
    const sessions = this.getSessions();
    sessions.forEach((s) => localStorage.removeItem(STORAGE_KEYS.SESSION_PREFIX + s.id));
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  },

  // Messages per session
  getSessionMessages(sessionId) {
    if (!sessionId) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION_PREFIX + sessionId);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn("Failed to get messages for session " + sessionId, e);
      return [];
    }
  },

  saveSessionMessages(sessionId, messages) {
    if (!sessionId) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_PREFIX + sessionId, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save messages", e);
    }
  },

  addMessageToSession(sessionId, message) {
    const messages = this.getSessionMessages(sessionId);
    messages.push(message);
    this.saveSessionMessages(sessionId, messages);

    // Auto-update title if it's the first user message
    if (message.role === "user" && messages.filter((m) => m.role === "user").length === 1) {
      let title = message.content.trim().slice(0, 36);
      if (message.content.trim().length > 36) title += "...";
      this.updateSession(sessionId, { title });
    } else {
      this.updateSession(sessionId, {}); // touch updatedAt
    }

    return messages;
  },

  updateMessageFeedback(sessionId, messageId, rating) {
    const messages = this.getSessionMessages(sessionId);
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      msg.rating = rating;
      this.saveSessionMessages(sessionId, messages);
    }
  },

  // Self-Learning Dataset Storage
  recordTrainingFeedback({ query, response, rating, model, persona, alternateAiResponse }) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRAINING_DATASET);
      const dataset = stored ? JSON.parse(stored) : [];
      const item = {
        id: "train_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        query,
        response,
        alternateAiResponse: alternateAiResponse || null,
        rating, // "thumbs_up" or "thumbs_down"
        model: model || "gemini-2.0-flash",
        persona: persona || "general",
      };
      dataset.unshift(item);
      if (dataset.length > 1000) dataset.length = 1000;
      localStorage.setItem(STORAGE_KEYS.TRAINING_DATASET, JSON.stringify(dataset));
      return item;
    } catch (e) {
      console.warn("Failed to record training feedback", e);
      return null;
    }
  },

  getTrainingDataset() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRAINING_DATASET);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  exportTrainingDataAsJsonl() {
    const dataset = this.getTrainingDataset();
    return dataset
      .filter((d) => d.rating === "thumbs_up" || d.rating === "positive")
      .map((d) =>
        JSON.stringify({
          messages: [
            { role: "system", content: "You are Vinayak, an authoritative AI legal, tax, and compliance advisor." },
            { role: "user", content: d.query },
            { role: "assistant", content: d.response },
          ],
          metadata: {
            model: d.model,
            persona: d.persona,
            timestamp: d.timestamp,
          },
        })
      )
      .join("\n");
  },

  exportChatAsMarkdown(session, messages) {
    let md = `# ${session.title}\n`;
    md += `*Date: ${new Date(session.createdAt).toLocaleString()} | Persona: ${session.persona}*\n\n---\n\n`;

    messages.forEach((msg) => {
      const roleName = msg.role === "user" ? "🧑 You" : "🤖 Vinayak AI";
      md += `### ${roleName}\n\n${msg.content}\n\n`;
    });

    return md;
  },
};
