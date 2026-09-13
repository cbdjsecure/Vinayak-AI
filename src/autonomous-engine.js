/**
 * Vinayak AI Autonomous Knowledge & Advisory Engine
 * Handles identity, greetings, inappropriate content, and known domain-specific patterns.
 * For all other questions, returns null so they are handed off to the active LLM provider.
 */

export const SEXUAL_PATTERNS = [
  /\b(sex|sexy|sexual|sexuality|intercourse|coitus)\b/i,
  /\b(porn|porno|pornography|xxx|nsfw|erotic|erotica)\b/i,
  /\b(nude|nudes|nudity|naked|boobs|tits|titties|pussy|vagina|penis|dick|cock|clitoris)\b/i,
  /\b(masturbat\w*|orgasm\w*|ejaculat\w*|cumming|blowjob|handjob|dildo|vibrator)\b/i,
  /\b(horny|fetish|bdsm|kamasutra|stripper|strip\s*club|escort\s*service|prostitut\w*)\b/i,
  /\b(chut|choot|chudai|chudwana|lund|lauda|loda|gaand|bhosd\w*|mutth|sax\s*sux)\b/i
];

export function isInappropriateOrSexual(text) {
  if (!text) return false;
  return SEXUAL_PATTERNS.some((rgx) => rgx.test(text));
}

export function isRandomSymbolsWithoutText(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^\?+$/.test(trimmed)) return false;
  const hasAlphanumeric = /[\p{L}\p{N}]/u.test(trimmed);
  return !hasAlphanumeric;
}

export function isQuestionMarkOnly(text) {
  if (!text) return false;
  return /^\?+$/.test(text.trim());
}

export const AutonomousEngine = {
  /**
   * Generates a streaming response for content this engine can handle.
   * Returns empty and calls onDone with unhandled:true if the question should be
   * handed off to the LLM (resolveAnswer returned null).
   */
  async streamResponse(prompt, persona, signal, onChunk, onDone) {
    const startTime = performance.now();
    const content = this.resolveAnswer(prompt, persona);

    if (!content) {
      const durationMs = Math.round(performance.now() - startTime);
      if (onDone) {
        onDone({ content: "", durationMs, model: "vinayak-autonomous-engine", unhandled: true });
      }
      return "";
    }

    const words = content.split(" ");
    let accumulated = "";

    for (let i = 0; i < words.length; i++) {
      if (signal && signal.aborted) break;
      const token = (i === 0 ? "" : " ") + words[i];
      accumulated += token;
      if (onChunk) onChunk(token, accumulated);
      const delay = Math.min(25, Math.max(10, Math.floor(Math.random() * 18) + 8));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const durationMs = Math.round(performance.now() - startTime);
    if (onDone) {
      onDone({ content: accumulated, durationMs, model: "vinayak-autonomous-engine" });
    }
    return accumulated;
  },

  /**
   * Returns a string response if this engine can handle the prompt,
   * or null to signal the query should be forwarded to the LLM.
   */
  resolveAnswer(prompt, persona = "general") {
    const raw = (prompt || "").trim();
    const p = raw.toLowerCase();

    // 0a. Inappropriate or sexual content guard
    if (isInappropriateOrSexual(raw)) {
      return "I am **Vinayak AI**, an advisory intelligence built exclusively for Indian accounting, tax consultancy, corporate compliance, and legal advisory.\n\nI am not designed for sexual or explicit topics. Please let me know if you have any professional questions regarding business, finance, or taxation.";
    }

    // 0b. Random symbols without text (except ?)
    if (isRandomSymbolsWithoutText(raw)) {
      return "I didn't quite understand what you meant. Could you please rephrase your question?";
    }

    // 0c. Question mark only
    if (isQuestionMarkOnly(raw)) {
      return "Hello! It looks like you have a question. How can I assist you today?";
    }

    // 1. Identity & Creator queries
    if (
      p.includes("who made you") ||
      p.includes("who created you") ||
      p.includes("who developed you") ||
      p.includes("who is your creator") ||
      p.includes("made by")
    ) {
      return "I was created by **Saswata**, as a specialized, self-learning AI assistant designed to assist with legal research, direct and indirect tax consultancy, corporate compliance, and accounting advisory.\n\nI am engineered to assist Chartered Accountants (CAs), Company Secretaries (CSs), tax practitioners, lawyers, business owners, and commerce students.";
    }

    if (
      p.includes("who are you") ||
      p.includes("what is your name") ||
      p.includes("introduce yourself") ||
      p.includes("tell me about yourself")
    ) {
      return "Hello! I am **Vinayak AI**, your intelligent Legal, Tax, Corporate Compliance, Accounting & Business Advisory Assistant.\n\n### My Core Capabilities:\n- **Legal & Corporate Compliance:** Companies Act 2013, ROC/MCA annual filings (AOC-4, MGT-7), Board Resolutions, Secretarial Standards.\n- **Tax Consultancy:** Income Tax Act 1961, Section 115BAC calculations, Capital Gains, TDS provisions, GST compliance.\n- **Accounting & Tally Mastery:** Double-entry bookkeeping, Golden Rules, Tally Prime voucher shortcuts (F4-F9), BRS, depreciation.\n- **Financial Modeling:** CMA Data, DSCR calculations, working capital estimation, startup advisory.\n- **CA & CS Student Mentorship:** ICAI/ICSI case studies and conceptual clarity.\n\nHow can I assist you today?";
    }

    // 2. Simple greetings
    if (/^(hi|hello|hey|greetings|namaste|good morning|good afternoon|good evening)\b/i.test(p)) {
      return "Hello! I am **Vinayak AI**, your advisory partner for Legal, Tax, ROC Compliance, and Accounting.\n\nHow can I assist you today?";
    }

    // All other queries — return null to hand off to the active LLM.
    return null;
  },
};
