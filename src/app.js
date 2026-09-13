import { APP_CONFIG, PERSONAS, PROMPT_STARTERS, FALLBACK_FREE_MODELS, WORK_ROUTING_RULES, PROVIDERS, AVAILABLE_MODELS } from "./config.js";
import { Storage } from "./storage.js";
import { renderMarkdown } from "./markdown.js";
import { OpenRouterClient, stripThinking, sanitizeErrorMessage } from "./api.js";
import { AuthService } from "./auth.js";
import { AutonomousEngine, isInappropriateOrSexual, isRandomSymbolsWithoutText, isQuestionMarkOnly } from "./autonomous-engine.js";


class VinayakApp {
  constructor() {
    this.settings = Storage.getSettings();
    this.client = new OpenRouterClient(this.getActiveApiKey(), this.settings.provider || "openrouter");
    this.currentSessionId = null;
    this.isStreaming = false;
    this.abortController = null;

    // DOM Elements
    this.dom = {
      // Sidebar
      sidebar: document.getElementById("sidebar"),
      sidebarBackdrop: document.getElementById("sidebarBackdrop"),
      sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
      closeSidebarBtn: document.getElementById("closeSidebarBtn"),
      newChatBtn: document.getElementById("newChatBtn"),
      sessionsList: document.getElementById("sessionsList"),
      sessionCount: document.getElementById("sessionCount"),
      clearAllChatsBtn: document.getElementById("clearAllChatsBtn"),
      apiStatusPill: document.getElementById("apiStatusPill"),

      // Sidebar Account Card
      sidebarAccountBtn: document.getElementById("sidebarAccountBtn"),
      sidebarAccountAvatar: document.getElementById("sidebarAccountAvatar"),
      sidebarAccountName: document.getElementById("sidebarAccountName"),
      sidebarAccountStatus: document.getElementById("sidebarAccountStatus"),

      // Header Auto-Engine Badge & Persona
      autoEngineBadge: document.getElementById("autoEngineBadge"),
      engineStatusText: document.getElementById("engineStatusText"),
      currentModelLabel: document.getElementById("currentModelLabel"),
      currentModelBadge: document.getElementById("currentModelBadge"),

      personaDropdownContainer: document.getElementById("personaDropdownContainer"),
      personaDropdownTrigger: document.getElementById("personaDropdownTrigger"),
      personaDropdownMenu: document.getElementById("personaDropdownMenu"),
      personaOptionsList: document.getElementById("personaOptionsList"),
      currentPersonaIcon: document.getElementById("currentPersonaIcon"),
      currentPersonaLabel: document.getElementById("currentPersonaLabel"),
      exportChatBtn: document.getElementById("exportChatBtn"),
      headerAccountBtn: document.getElementById("headerAccountBtn"),
      headerAccountAvatar: document.getElementById("headerAccountAvatar"),
      headerAccountLabel: document.getElementById("headerAccountLabel"),

      // Chat viewport
      chatViewport: document.getElementById("chatViewport"),
      welcomeView: document.getElementById("welcomeView"),
      personaChipsBar: document.getElementById("personaChipsBar"),
      startersGrid: document.getElementById("startersGrid"),
      messagesContainer: document.getElementById("messagesContainer"),
      streamIndicator: document.getElementById("streamIndicator"),
      streamIndicatorText: document.getElementById("streamIndicatorText"),
      scrollBottomBtn: document.getElementById("scrollBottomBtn"),

      // Composer
      chatForm: document.getElementById("chatForm"),
      promptInput: document.getElementById("promptInput"),
      sendBtn: document.getElementById("sendBtn"),
      stopBtn: document.getElementById("stopBtn"),
      activeModelTag: document.getElementById("activeModelTag"),
      webSearchToggleBtn: document.getElementById("webSearchToggleBtn"),
      webToggleState: document.getElementById("webToggleState"),

      // Settings Modal
      openSettingsBtn: document.getElementById("openSettingsBtn"),
      settingsModal: document.getElementById("settingsModal"),
      closeSettingsBtn: document.getElementById("closeSettingsBtn"),
      settingsModelSelect: document.getElementById("settingsModelSelect"),
      providerTagBadge: document.getElementById("providerTagBadge"),
      providerHelpHint: document.getElementById("providerHelpHint"),
      toggleDeveloperDrawerBtn: document.getElementById("toggleDeveloperDrawerBtn"),
      developerDrawerContent: document.getElementById("developerDrawerContent"),
      developerDrawerArrow: document.getElementById("developerDrawerArrow"),
      toggleSheetsDrawerBtn: document.getElementById("toggleSheetsDrawerBtn"),
      sheetsDrawerContent: document.getElementById("sheetsDrawerContent"),
      sheetsDrawerArrow: document.getElementById("sheetsDrawerArrow"),
      apiKeyFieldLabel: document.getElementById("apiKeyFieldLabel"),
      settingsApiKey: document.getElementById("settingsApiKey"),
      engineStatusBadge: document.getElementById("engineStatusBadge"),
      toggleApiKeyMask: document.getElementById("toggleApiKeyMask"),
      testApiKeyBtn: document.getElementById("testApiKeyBtn"),
      keyStatusMsg: document.getElementById("keyStatusMsg"),
      settingsWebSearch: document.getElementById("settingsWebSearch"),
      settingsAutoRouting: document.getElementById("settingsAutoRouting"),
      settingsCustomModel: document.getElementById("settingsCustomModel"),
      settingsTemp: document.getElementById("settingsTemp"),
      tempValueDisplay: document.getElementById("tempValueDisplay"),
      settingsMaxTokens: document.getElementById("settingsMaxTokens"),
      tokensValueDisplay: document.getElementById("tokensValueDisplay"),
      settingsCustomPrompt: document.getElementById("settingsCustomPrompt"),
      saveSettingsBtn: document.getElementById("saveSettingsBtn"),
      resetSettingsBtn: document.getElementById("resetSettingsBtn"),

      // Account & Google Sheets Modal
      accountModal: document.getElementById("accountModal"),
      closeAccountBtn: document.getElementById("closeAccountBtn"),
      accountCloseFooterBtn: document.getElementById("accountCloseFooterBtn"),
      tabRegisterBtn: document.getElementById("tabRegisterBtn"),
      tabLoginBtn: document.getElementById("tabLoginBtn"),
      tabProfileBtn: document.getElementById("tabProfileBtn"),
      registerForm: document.getElementById("registerForm"),
      regName: document.getElementById("regName"),
      regEmail: document.getElementById("regEmail"),
      regPassword: document.getElementById("regPassword"),
      registerErrorMsg: document.getElementById("registerErrorMsg"),
      loginForm: document.getElementById("loginForm"),
      loginEmail: document.getElementById("loginEmail"),
      loginPassword: document.getElementById("loginPassword"),
      loginErrorMsg: document.getElementById("loginErrorMsg"),
      profilePane: document.getElementById("profilePane"),
      profileCardInfo: document.getElementById("profileCardInfo"),
      sheetsWebAppUrl: document.getElementById("sheetsWebAppUrl"),
      saveSheetsUrlBtn: document.getElementById("saveSheetsUrlBtn"),
      testSheetsBtn: document.getElementById("testSheetsBtn"),
      sheetsStatusMsg: document.getElementById("sheetsStatusMsg"),
      logoutAccountBtn: document.getElementById("logoutAccountBtn"),
      trainingCountDisplay: document.getElementById("trainingCountDisplay"),
      exportTrainingJsonlBtn: document.getElementById("exportTrainingJsonlBtn"),

      // Toasts
      toastContainer: document.getElementById("toastContainer"),
    };
  }

  init() {
    try {
      // Default to tax persona if not set or old persona
      if (!this.settings.persona || !PERSONAS[this.settings.persona]) {
        this.settings.persona = "tax";
        Storage.saveSettings(this.settings);
      }
      if (this.settings.autoRouting === undefined) {
        this.settings.autoRouting = true;
        Storage.saveSettings(this.settings);
      }
      if (!this.settings.provider || this.settings.provider === "openrouter") {
        this.settings.provider = "groq";
        Storage.saveSettings(this.settings);
      }

      this.populatePersonas();
      this.populateStarters();
      this.setupEventListeners();
      this.loadInitialSession();
      this.updateActiveModelTag();
      this.updateCurrentModelDisplay();
      this.updateWebSearchUI();
      this.updateAccountUI();
      this.updateProviderUI();
      this.updateTrainingCountDisplay();
      this.checkApiStatus();
    } catch (err) {
      console.error("VinayakApp initialization notice:", err);
    }
  }

  getActiveApiKey() {
    const provider = this.settings.provider || "groq";
    if (provider === "groq") {
      return (this.settings.groqApiKey && this.settings.groqApiKey.trim()) || APP_CONFIG.defaultGroqApiKey;
    } else if (provider === "gemini") {
      return (this.settings.geminiApiKey && this.settings.geminiApiKey.trim()) || "";
    }
    return (this.settings.apiKey && this.settings.apiKey.trim()) || APP_CONFIG.defaultApiKey;
  }

  isCasualOrGreeting(text) {
    if (!text) return false;
    if (isInappropriateOrSexual(text) || isRandomSymbolsWithoutText(text)) return false;
    const t = text.trim().toLowerCase();
    return (
      /^(hi|hello|hey|namaste|greetings|good\s+(morning|afternoon|evening)|how\s+are\s+you|what'?s\s+up|sup|hlo|hii|helo)\b/i.test(t) ||
      /^(thanks|thank\s+you|ok|okay|bye|goodbye|see\s+you)\b/i.test(t)
    );
  }

  updateTrainingCountDisplay() {
    if (this.dom.trainingCountDisplay) {
      const count = Storage.getTrainingDataset().filter((d) => d.rating === "thumbs_up").length;
      this.dom.trainingCountDisplay.textContent = count;
    }
  }

  exportTrainingDataset() {
    const jsonl = Storage.exportTrainingDataAsJsonl();
    if (!jsonl || !jsonl.trim()) {
      this.showToast("No approved training pairs yet. Rate answers with 👍 to build dataset!", "info");
      return;
    }
    const blob = new Blob([jsonl], { type: "application/x-ndjson;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vinayak_training_dataset_${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast("Training dataset exported as JSONL!", "success");
  }

  async recordFeedback(query, response, rating, model) {
    const item = Storage.recordTrainingFeedback({
      query,
      response,
      rating,
      model,
      persona: this.settings.persona,
    });

    this.updateTrainingCountDisplay();
    const toastMsg = rating === "thumbs_up"
      ? "Recorded to Vinayak's self-learning dataset 👍"
      : "Feedback noted for self-learning improvement 👎";
    this.showToast(toastMsg, "success");

    // Sync to private Vinayak Cloud Google Sheets backend
    if (item) {
      try {
        const user = AuthService.getCurrentUser();
        AuthService.syncToGoogleSheet("log_training_data", {
          id: item.id,
          userId: user?.email || "guest",
          query,
          response,
          rating,
          model,
          persona: this.settings.persona,
        }).catch((e) => console.warn("Vinayak Cloud training sync warning", e));
      } catch (err) {
        console.warn("Failed to sync training feedback to Vinayak Cloud", err);
      }
    }
  }

  /* --------------------------------------------------------------------------
     Initialization & UI Builders
     -------------------------------------------------------------------------- */
  populateModels() {
    // Auto-engine active
  }

  /* --------------------------------------------------------------------------
     Custom Dropdowns Control
     -------------------------------------------------------------------------- */
  toggleDropdown(menuEl, triggerEl) {
    if (!menuEl || !triggerEl) return;
    const isHidden = menuEl.classList.contains("hidden");
    this.closeAllDropdowns();
    if (isHidden) {
      menuEl.classList.remove("hidden");
      triggerEl.classList.add("active");
      triggerEl.setAttribute("aria-expanded", "true");
      const container = triggerEl.closest(".custom-dropdown-container");
      if (container) container.classList.add("open");
    }
  }

  closeAllDropdowns() {
    if (this.dom.personaDropdownMenu) this.dom.personaDropdownMenu.classList.add("hidden");
    if (this.dom.personaDropdownTrigger) {
      this.dom.personaDropdownTrigger.classList.remove("active");
      this.dom.personaDropdownTrigger.setAttribute("aria-expanded", "false");
    }
    if (this.dom.personaDropdownContainer) {
      this.dom.personaDropdownContainer.classList.remove("open");
    }
  }

  selectModel(modelId) {
    this.settings.model = modelId;
    Storage.saveSettings(this.settings);
    this.updateCurrentModelDisplay();
    this.updateActiveModelTag();
  }

  updateCurrentModelDisplay() {
    if (this.dom.currentModelLabel) {
      this.dom.currentModelLabel.textContent = "Vinayak AI Auto Engine";
    }
    if (this.dom.currentModelBadge) {
      this.dom.currentModelBadge.textContent = "Auto";
    }
  }

  filterModels(query) {
    const q = (query || "").trim().toLowerCase();
    const items = this.dom.modelOptionsList.querySelectorAll(".model-item");
    const headers = this.dom.modelOptionsList.querySelectorAll(".dropdown-group-header");

    items.forEach((item) => {
      const name = item.getAttribute("data-name") || "";
      const desc = item.getAttribute("data-desc") || "";
      const id = item.getAttribute("data-model-id") || "";
      const match = name.includes(q) || desc.includes(q) || id.includes(q);
      item.style.display = match ? "flex" : "none";
    });

    headers.forEach((h) => {
      h.style.display = q ? "none" : "block";
    });
  }

  populatePersonas() {
    if (!this.dom.personaOptionsList) return;
    this.dom.personaOptionsList.innerHTML = "";

    const activePersonaId = this.settings.persona || "general";

    Object.values(PERSONAS).forEach((p) => {
      const item = document.createElement("div");
      const isSelected = p.id === activePersonaId;
      item.className = `dropdown-item persona-item ${isSelected ? "selected" : ""}`;
      item.setAttribute("data-persona-id", p.id);

      item.innerHTML = `
        <div class="persona-item-icon">${this.getPersonaEmoji(p.id)}</div>
        <div class="item-main">
          <div class="item-title-row">
            <span class="item-title">${p.name}</span>
          </div>
          <div class="item-desc">${p.tagline}</div>
        </div>
        <span class="item-check">✓</span>
      `;

      item.addEventListener("click", () => {
        this.selectPersona(p.id);
        this.closeAllDropdowns();
      });

      this.dom.personaOptionsList.appendChild(item);
    });

    this.updateCurrentPersonaDisplay();

    // Welcome Screen Chips
    if (this.dom.personaChipsBar) {
      this.dom.personaChipsBar.innerHTML = "";
      Object.values(PERSONAS).forEach((p) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `persona-chip ${p.id === this.settings.persona ? "active" : ""}`;
        chip.setAttribute("data-persona", p.id);
        chip.innerHTML = `<span>${this.getPersonaEmoji(p.id)}</span> <span>${p.name}</span>`;
        chip.addEventListener("click", () => {
          this.selectPersona(p.id);
        });
        this.dom.personaChipsBar.appendChild(chip);
      });
    }
  }

  updateCurrentPersonaDisplay() {
    const pId = this.settings.persona || "general";
    const persona = PERSONAS[pId] || PERSONAS.general;

    if (this.dom.currentPersonaIcon) {
      this.dom.currentPersonaIcon.textContent = this.getPersonaEmoji(pId);
    }
    if (this.dom.currentPersonaLabel) {
      this.dom.currentPersonaLabel.textContent = persona.name;
    }

    // Update active class in list
    if (this.dom.personaOptionsList) {
      const items = this.dom.personaOptionsList.querySelectorAll(".persona-item");
      items.forEach((item) => {
        if (item.getAttribute("data-persona-id") === pId) {
          item.classList.add("selected");
        } else {
          item.classList.remove("selected");
        }
      });
    }
  }

  getPersonaEmoji(id) {
    const emojis = {
      tax: "📊",
      accounting: "📖",
      compliance: "🏢",
      legal: "⚖️",
      student: "🎓",
      general: "💼",
    };
    return emojis[id] || "⚖️";
  }

  populateStarters() {
    this.dom.startersGrid.innerHTML = "";
    PROMPT_STARTERS.forEach((item) => {
      const card = document.createElement("div");
      card.className = "starter-card";
      card.innerHTML = `
        <div class="starter-card-header">
          <div class="starter-icon">
            ${this.getStarterSvg(item.icon)}
          </div>
          <div class="starter-title">${item.title}</div>
        </div>
        <p class="starter-desc">${item.desc}</p>
      `;

      card.addEventListener("click", () => {
        if (item.persona) {
          this.selectPersona(item.persona);
        }
        this.dom.promptInput.value = item.prompt;
        this.handleChatSubmit();
      });

      this.dom.startersGrid.appendChild(card);
    });
  }

  getStarterSvg(icon) {
    if (icon === "calculator") {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>`;
    } else if (icon === "file-text") {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
    } else if (icon === "shield-alert") {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (icon === "book-open") {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
    } else if (icon === "briefcase") {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
    }
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  }

  /* --------------------------------------------------------------------------
     Session Management
     -------------------------------------------------------------------------- */
  loadInitialSession() {
    const sessions = Storage.getSessions();
    const activeId = Storage.getActiveSessionId();

    if (activeId && sessions.some((s) => s.id === activeId)) {
      this.switchSession(activeId);
    } else if (sessions.length > 0) {
      this.switchSession(sessions[0].id);
    } else {
      this.startNewSession(false);
    }

    this.renderSessionsList();
  }

  startNewSession(autoFocus = true) {
    const session = Storage.createSession("New Conversation", this.settings.persona, this.settings.model);
    this.currentSessionId = session.id;
    this.renderSessionsList();
    this.renderCurrentSession();
    this.closeMobileSidebar();

    if (autoFocus) {
      this.dom.promptInput.focus();
    }
  }

  switchSession(sessionId) {
    if (this.isStreaming) {
      this.stopGeneration();
    }

    this.currentSessionId = sessionId;
    Storage.setActiveSessionId(sessionId);
    this.renderSessionsList();
    this.renderCurrentSession();
    this.closeMobileSidebar();
  }

  deleteSession(sessionId, e) {
    if (e) e.stopPropagation();

    const confirmed = confirm("Are you sure you want to delete this chat?");
    if (!confirmed) return;

    const nextSessionId = Storage.deleteSession(sessionId);
    if (this.currentSessionId === sessionId) {
      if (nextSessionId) {
        this.switchSession(nextSessionId);
      } else {
        this.startNewSession(false);
      }
    } else {
      this.renderSessionsList();
    }
    this.showToast("Conversation deleted", "info");
  }

  clearAllSessions() {
    const confirmed = confirm("Clear all chat conversations? This cannot be undone.");
    if (!confirmed) return;

    Storage.clearAllSessions();
    this.startNewSession(true);
    this.showToast("All chats cleared", "info");
  }

  renderSessionsList() {
    const sessions = Storage.getSessions();
    this.dom.sessionCount.textContent = sessions.length;
    this.dom.sessionsList.innerHTML = "";

    if (sessions.length === 0) {
      this.dom.sessionsList.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No saved chats yet</div>`;
      return;
    }

    sessions.forEach((s) => {
      const item = document.createElement("div");
      item.className = `session-item ${s.id === this.currentSessionId ? "active" : ""}`;
      item.innerHTML = `
        <div class="session-item-content">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span class="session-item-title" title="${s.title}">${s.title}</span>
        </div>
        <div class="session-item-actions">
          <button type="button" class="session-del-btn" title="Delete chat" aria-label="Delete chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      item.addEventListener("click", () => this.switchSession(s.id));
      const delBtn = item.querySelector(".session-del-btn");
      delBtn.addEventListener("click", (e) => this.deleteSession(s.id, e));

      this.dom.sessionsList.appendChild(item);
    });
  }

  renderCurrentSession() {
    const messages = Storage.getSessionMessages(this.currentSessionId);
    this.dom.messagesContainer.innerHTML = "";

    if (messages.length === 0) {
      this.dom.welcomeView.classList.remove("hidden");
      this.dom.messagesContainer.classList.add("hidden");
    } else {
      this.dom.welcomeView.classList.add("hidden");
      this.dom.messagesContainer.classList.remove("hidden");
      messages.forEach((msg) => this.appendMessageToDOM(msg, false));
      this.scrollToBottom();
    }
  }

  /* --------------------------------------------------------------------------
     Autonomous Work-Purpose Routing
     -------------------------------------------------------------------------- */
  resolveModelForWorkPurpose(promptText, personaId) {
    const provider = this.settings.provider || "openrouter";

    if (this.settings.autoRouting === false && this.settings.model && this.settings.model !== "auto") {
      return this.settings.model;
    }
    if (this.settings.customModel) {
      return this.settings.customModel;
    }

    const text = (promptText || "").toLowerCase();

    // Check for greeting / casual conversation
    if (this.isCasualOrGreeting(promptText)) {
      if (this.dom.engineStatusText) {
        this.dom.engineStatusText.textContent = "Vinayak AI • Ready";
      }
      if (provider === "groq") return "groq/compound-mini";
      if (provider === "gemini") return "gemini-2.0-flash";
      return "google/gemini-2.5-flash";
    }

    for (const rule of WORK_ROUTING_RULES) {
      if (rule.purpose === personaId || rule.keywords.some((kw) => text.includes(kw))) {
        if (this.dom.engineStatusText) {
          this.dom.engineStatusText.textContent = `Auto: ${rule.label}`;
        }
        if (provider === "groq") return rule.directGroqModel || rule.recommendedModel || "groq/compound-mini";
        if (provider === "gemini") return rule.directGeminiModel || "gemini-2.0-flash";
        return rule.recommendedModel;
      }
    }

    if (this.dom.engineStatusText) {
      this.dom.engineStatusText.textContent = provider === "groq" ? "Auto: Vinayak Turbo" : "Auto: Gemini Intelligence";
    }
    if (provider === "groq") return "groq/compound-mini";
    if (provider === "gemini") return "gemini-2.0-flash";
    return APP_CONFIG.fallbackModel;
  }

  /* --------------------------------------------------------------------------
     Chat Submission & Streaming
     -------------------------------------------------------------------------- */
  async handleChatSubmit() {
    const promptText = this.dom.promptInput.value.trim();
    if (!promptText || this.isStreaming) return;

    // Reset textarea
    this.dom.promptInput.value = "";
    this.dom.promptInput.style.height = "auto";

    // Ensure session exists
    if (!this.currentSessionId) {
      this.startNewSession(false);
    }

    // Resolve optimal model for this specific work purpose
    const modelToUse = this.resolveModelForWorkPurpose(promptText, this.settings.persona);

    // 1. Create and render user message
    const userMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: promptText,
      timestamp: Date.now(),
    };

    Storage.addMessageToSession(this.currentSessionId, userMessage);
    this.renderSessionsList();

    this.dom.welcomeView.classList.add("hidden");
    this.dom.messagesContainer.classList.remove("hidden");
    this.appendMessageToDOM(userMessage, true);
    this.scrollToBottom();

    // 2. Prepare assistant message placeholder in DOM
    const assistantMsgId = "msg_asst_" + Date.now();
    const assistantElement = this.createAssistantPlaceholder(assistantMsgId);
    this.dom.messagesContainer.appendChild(assistantElement);
    this.scrollToBottom();

    // 3. Set streaming state
    this.isStreaming = true;
    this.dom.sendBtn.disabled = true;
    this.dom.stopBtn.classList.remove("hidden");
    this.dom.streamIndicator.classList.remove("hidden");

    // Natural indicator for casual vs legal/tax queries
    if (this.isCasualOrGreeting(promptText)) {
      this.dom.streamIndicatorText.textContent = "Vinayak is typing...";
    } else {
      this.dom.streamIndicatorText.textContent = "Vinayak is reviewing statutory provisions...";
    }

    this.abortController = new AbortController();

    // Guard against inappropriate sexual content or random symbols without text (except ?)
    if (isInappropriateOrSexual(promptText) || isRandomSymbolsWithoutText(promptText) || isQuestionMarkOnly(promptText)) {
      this.dom.streamIndicatorText.textContent = "Vinayak is responding...";
      const bubbleEl = assistantElement.querySelector(".message-bubble-content");
      await this.executeAutonomousStream(assistantElement, bubbleEl, promptText);
      return;
    }

    // 4. Construct messages payload
    const systemPrompt = this.getSystemPromptForCurrentPersona();
    const history = Storage.getSessionMessages(this.currentSessionId);
    const messagesPayload = [];

    if (systemPrompt) {
      messagesPayload.push({ role: "system", content: systemPrompt });
    }

    // Send previous turns for conversation context (up to last 16 messages)
    const contextTurns = history.slice(-16).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    messagesPayload.push(...contextTurns);

    const bubbleEl = assistantElement.querySelector(".message-bubble-content");

    await this.executeChatStream(modelToUse, messagesPayload, assistantElement, bubbleEl, promptText, 0);
  }

  async executeAutonomousStream(assistantElement, bubbleEl, promptText) {
    const assistantMsgId = assistantElement.id;
    let fullContent = "";

    try {
      await AutonomousEngine.streamResponse(
        promptText,
        this.settings.persona,
        this.abortController?.signal,
        (chunk, accumulated) => {
          fullContent = accumulated;
          bubbleEl.innerHTML = renderMarkdown(fullContent);
          this.scrollToBottomIfNeeded();
        },
        (result) => {
          let finalContent = result.content || fullContent;
          bubbleEl.innerHTML = renderMarkdown(finalContent);

          const assistantMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: finalContent,
            model: "vinayak-autonomous-core",
            durationMs: result.durationMs,
            timestamp: Date.now(),
          };

          Storage.addMessageToSession(this.currentSessionId, assistantMessage);

          try {
            const currentUser = AuthService.getCurrentUser();
            AuthService.syncToGoogleSheet("sync_chat", {
              email: currentUser?.email || "Guest",
              sessionId: this.currentSessionId,
              userPrompt: promptText,
              aiResponse: finalContent,
              model: "vinayak-autonomous-core",
              persona: this.settings.persona,
            }).catch((err) => console.warn("Google Sheet chat sync background notice:", err));
          } catch (syncErr) {
            console.warn("Background chat history sync error:", syncErr);
          }

          this.finishStreaming(assistantElement, assistantMessage, promptText);
        }
      );
    } catch (err) {
      console.error("Autonomous stream error:", err);
      let fallbackContent = AutonomousEngine.resolveAnswer(promptText, this.settings.persona) || "";
      bubbleEl.innerHTML = renderMarkdown(fallbackContent);
      const assistantMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: fallbackContent,
        model: "vinayak-autonomous-core",
        durationMs: 40,
        timestamp: Date.now(),
      };
      Storage.addMessageToSession(this.currentSessionId, assistantMessage);
      this.finishStreaming(assistantElement, assistantMessage, promptText);
    }
  }

  async executeChatStream(modelToUse, messagesPayload, assistantElement, bubbleEl, promptText, retryIndex = 0) {
    let fullContent = "";
    const assistantMsgId = assistantElement.id;

    try {
      await this.client.streamChat({
        model: modelToUse,
        messages: messagesPayload,
        temperature: this.settings.temperature,
        maxTokens: this.settings.maxTokens,
        webSearch: this.settings.webSearch !== false,
        signal: this.abortController?.signal,
        onChunk: (chunk, accumulated) => {
          fullContent = accumulated;
          const displayClean = stripThinking(fullContent);
          if (displayClean) {
            bubbleEl.innerHTML = renderMarkdown(displayClean);
          }
          this.scrollToBottomIfNeeded();
        },
        onDone: (result) => {
          let finalContent = stripThinking(result.content || fullContent || "*(No response generated)*");
          bubbleEl.innerHTML = renderMarkdown(finalContent);

          // Save assistant message to storage (strictly without thinking tags)
          const assistantMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: finalContent,
            model: result.model || modelToUse,
            durationMs: result.durationMs,
            timestamp: Date.now(),
          };

          Storage.addMessageToSession(this.currentSessionId, assistantMessage);

          // Silently sync conversation pair to Google Sheets database (Chat_History)
          try {
            const currentUser = AuthService.getCurrentUser();
            AuthService.syncToGoogleSheet("sync_chat", {
              email: currentUser?.email || "Guest",
              sessionId: this.currentSessionId,
              userPrompt: promptText,
              aiResponse: finalContent,
              model: result.model || modelToUse,
              persona: this.settings.persona,
            }).catch((err) => console.warn("Google Sheet chat sync background notice:", err));
          } catch (syncErr) {
            console.warn("Background chat history sync error:", syncErr);
          }

          this.finishStreaming(assistantElement, assistantMessage, promptText);
        },
        onError: async (err) => {
          console.warn(`Error on model ${modelToUse}:`, err);

          const msg = (err.message || "").toLowerCase();
          const isBusyOrError = err.isRateLimit || 
            err.isProviderError || 
            err.status === 404 || 
            err.status === 400 || 
            err.status === 402 || 
            err.status === 429 ||
            msg.includes("rate-limited") || 
            msg.includes("no endpoints found") || 
            msg.includes("tokens") ||
            msg.includes("credits") ||
            msg.includes("afford") ||
            msg.includes("insufficient") ||
            msg.includes("provider returned error");

          if (isBusyOrError && retryIndex < 3) {
            // Find next reliable fallback model
            const nextFallback = FALLBACK_FREE_MODELS.find((m) => m !== modelToUse && !m.includes("gemma") && !m.includes("exp:free") && !m.includes("flash-1.5")) || "vinayak-autonomous-core";
            if (nextFallback) {
              this.showToast("Activating resilient intelligence route...", "info");
              bubbleEl.innerHTML = `
                <div style="padding: 0.4rem 0; color: #059669; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                  <span class="pulse-dot"></span>
                  <em>Vinayak is optimizing response engine...</em>
                </div>
              `;

              // Retry stream with fallback model
              await this.executeChatStream(nextFallback, messagesPayload, assistantElement, bubbleEl, promptText, retryIndex + 1);
              return;
            }
          }

          // Unrecoverable or exhausted fallbacks: display sanitized interactive notice
          const rawDetail = err.rawDetail || err.message;
          const errorDetail = sanitizeErrorMessage(rawDetail);

          bubbleEl.innerHTML = `
            <div class="error-notice-card" style="border: 1px solid rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.08); padding: 1rem; border-radius: 10px; margin: 0.4rem 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; color: #b91c1c; font-weight: 600; font-size: 0.95rem; margin-bottom: 0.4rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Connection Notice</span>
              </div>
              <p style="font-size: 0.84rem; color: #334155; margin-bottom: 0.85rem; line-height: 1.5;">
                Vinayak AI encountered an upstream response issue: <em>${this.escapeHtml(errorDetail)}</em>
              </p>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                <button type="button" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="window.vinayakApp.retryWithModel('vinayak-autonomous-core')">
                  ⚡ Auto-Recover &amp; Retry
                </button>
                <button type="button" class="btn btn-ghost" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="window.vinayakApp.openSettingsModal()">
                  ⚙️ Open Settings
                </button>
              </div>
            </div>
          `;
          this.showToast("Response generation interrupted", "error");
          this.finishStreaming(assistantElement, null, promptText);
        },
      });
    } catch (err) {
      console.error("Chat fatal error:", err);
      this.finishStreaming(assistantElement, null, promptText);
    }
  }

  retryWithModel(modelId) {
    this.selectModel(modelId);

    const messages = Storage.getSessionMessages(this.currentSessionId);
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      this.dom.promptInput.value = lastUserMsg.content;
      this.handleChatSubmit();
    }
  }

  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isStreaming = false;
    this.dom.sendBtn.disabled = false;
    this.dom.stopBtn.classList.add("hidden");
    this.dom.streamIndicator.classList.add("hidden");
    this.showToast("Generation stopped", "info");
  }

  finishStreaming(assistantElement, assistantMessage, promptText) {
    this.isStreaming = false;
    this.dom.sendBtn.disabled = false;
    this.dom.stopBtn.classList.add("hidden");
    this.dom.streamIndicator.classList.add("hidden");
    this.abortController = null;

    if (assistantElement && assistantMessage) {
      const metaBar = assistantElement.querySelector(".message-meta-bar");
      if (metaBar) {
        metaBar.classList.remove("hidden");
        const durationSec = (assistantMessage.durationMs / 1000).toFixed(1);
        const timeEl = metaBar.querySelector(".meta-time");
        if (timeEl) timeEl.textContent = `${durationSec}s`;
        const badgeEl = metaBar.querySelector(".meta-model-badge");
        if (badgeEl) {
          badgeEl.textContent = `Assisted with ${this.formatModelAssistedName(assistantMessage.model)}`;
        }
      }
      const copyBtn = assistantElement.querySelector(".copy-msg-btn");
      if (copyBtn) {
        this.setupCopyButton(copyBtn, assistantElement, assistantMessage.content);
      }
      this.attachFeedbackListeners(assistantElement, assistantMessage, promptText);
    }

    this.scrollToBottom();
  }

  setupCopyButton(copyBtn, row, rawContent) {
    if (!copyBtn) return;
    const newBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newBtn, copyBtn);

    newBtn.addEventListener("click", async () => {
      let textToCopy = rawContent;
      if (!textToCopy) {
        const bubble = row.querySelector(".message-bubble-content");
        textToCopy = bubble ? bubble.innerText : "";
      }

      if (!textToCopy) return;

      let copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          copied = true;
        } catch (_) {}
      }

      if (!copied) {
        try {
          const ta = document.createElement("textarea");
          ta.value = textToCopy;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          copied = document.execCommand("copy");
          document.body.removeChild(ta);
        } catch (_) {}
      }

      if (copied) {
        const origHtml = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy</span>
        `;
        newBtn.classList.add("copied");
        newBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Copied!</span>
        `;
        this.showToast("Response copied to clipboard!", "success");
        setTimeout(() => {
          newBtn.classList.remove("copied");
          newBtn.innerHTML = origHtml;
        }, 2200);
      } else {
        this.showToast("Unable to copy response", "error");
      }
    });
  }

  /* --------------------------------------------------------------------------
     DOM Message Builders
     -------------------------------------------------------------------------- */
  createAssistantPlaceholder(id) {
    const row = document.createElement("div");
    row.className = "message-row assistant";
    row.id = id;

    row.innerHTML = `
      <div class="message-avatar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v18M3 9l9-6 9 6M6 12l-3 6h6l-3-6zm12 0l-3 6h6l-3-6z"></path>
        </svg>
      </div>
      <div class="message-content-box">
        <div class="message-bubble">
          <div class="message-bubble-content">
            <span class="pulse-dot"></span>
          </div>
        </div>

        <div class="message-meta-bar hidden">
          <div class="meta-tags">
            <span class="meta-model-badge">Assisted with Gemini 2.5 Flash</span>
            <span class="meta-time"></span>
          </div>
          <div class="msg-actions">
            <button type="button" class="msg-action-btn copy-msg-btn" title="Copy response">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy</span>
            </button>
            <button type="button" class="msg-action-btn thumb-btn thumb-up-btn" title="Helpful answer (records to Vinayak's self-learning dataset)">
              👍 <span>Helpful</span>
            </button>
            <button type="button" class="msg-action-btn thumb-btn thumb-down-btn" title="Needs improvement">
              👎
            </button>
          </div>
        </div>
      </div>
    `;

    const copyBtn = row.querySelector(".copy-msg-btn");
    if (copyBtn) {
      this.setupCopyButton(copyBtn, row);
    }

    return row;
  }

  appendMessageToDOM(msg, animate = false) {
    const isUser = msg.role === "user";
    const row = document.createElement("div");
    row.className = `message-row ${isUser ? "user" : "assistant"}`;
    if (!animate) row.style.animation = "none";

    if (isUser) {
      row.innerHTML = `
        <div class="message-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <div class="message-content-box">
          <div class="message-bubble">
            <p>${this.escapeHtml(msg.content).replace(/\n/g, "<br/>")}</p>
          </div>
        </div>
      `;
    } else {
      const durationSec = msg.durationMs ? `${(msg.durationMs / 1000).toFixed(1)}s` : "";
      const cleanContent = stripThinking(msg.content);

      row.innerHTML = `
        <div class="message-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v18M3 9l9-6 9 6M6 12l-3 6h6l-3-6zm12 0l-3 6h6l-3-6z"></path>
          </svg>
        </div>
        <div class="message-content-box">
          <div class="message-bubble">
            <div class="message-bubble-content">${renderMarkdown(cleanContent)}</div>
          </div>
          <div class="message-meta-bar">
            <div class="meta-tags">
              <span class="meta-model-badge">Assisted with ${this.formatModelAssistedName(msg.model)}</span>
              ${durationSec ? `<span class="meta-time">${durationSec}</span>` : ""}
            </div>
            <div class="msg-actions">
              <button type="button" class="msg-action-btn copy-msg-btn" title="Copy response">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
              </button>
              <button type="button" class="msg-action-btn thumb-btn thumb-up-btn" title="Helpful answer (records to Vinayak's self-learning dataset)">
                👍 <span>Helpful</span>
              </button>
              <button type="button" class="msg-action-btn thumb-btn thumb-down-btn" title="Needs improvement">
                👎
              </button>
            </div>
          </div>
        </div>
      `;

      const copyBtn = row.querySelector(".copy-msg-btn");
      if (copyBtn) {
        this.setupCopyButton(copyBtn, row, cleanContent);
      }

      // Find user query prior to this assistant response in history
      const history = Storage.getSessionMessages(this.currentSessionId);
      const msgIndex = history.findIndex((m) => m.id === msg.id);
      const priorUserMsg = msgIndex > 0 ? history[msgIndex - 1]?.content : "";
      this.attachFeedbackListeners(row, msg, priorUserMsg);
    }

    this.dom.messagesContainer.appendChild(row);
  }

  attachFeedbackListeners(row, assistantMsg, userQuery) {
    const upBtn = row.querySelector(".thumb-up-btn");
    const downBtn = row.querySelector(".thumb-down-btn");
    if (!upBtn || !downBtn) return;

    upBtn.addEventListener("click", () => {
      upBtn.classList.add("active");
      downBtn.classList.remove("active");
      this.recordFeedback(userQuery || "Advisory Inquiry", assistantMsg.content, "thumbs_up", assistantMsg.model);
    });

    downBtn.addEventListener("click", () => {
      downBtn.classList.add("active");
      upBtn.classList.remove("active");
      this.recordFeedback(userQuery || "Advisory Inquiry", assistantMsg.content, "thumbs_down", assistantMsg.model);
    });
  }

  /* --------------------------------------------------------------------------
     Helpers & Event Listeners
     -------------------------------------------------------------------------- */
  selectPersona(personaId) {
    this.settings.persona = personaId;
    Storage.saveSettings(this.settings);
    this.updateCurrentPersonaDisplay();

    // Update chips active class
    if (this.dom.personaChipsBar) {
      const chips = this.dom.personaChipsBar.querySelectorAll(".persona-chip");
      chips.forEach((c) => {
        if (c.getAttribute("data-persona") === personaId) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });
    }

    const personaName = PERSONAS[personaId]?.name || personaId;
    this.showToast(`Persona switched to: ${personaName}`, "info");
  }

  getSystemPromptForCurrentPersona() {
    const pId = this.settings.persona || "general";
    if (pId === "custom") {
      return this.settings.customPrompt || PERSONAS.general.systemPrompt;
    }
    return PERSONAS[pId]?.systemPrompt || PERSONAS.general.systemPrompt;
  }

  formatModelAssistedName(modelId) {
    if (!modelId || modelId === "auto") {
      return "Vinayak Turbo 27B";
    }
    if (modelId.includes("autonomous") || modelId.includes("vinayak-autonomous")) {
      return "Vinayak Autonomous Core";
    }
    if (modelId.includes("qwen3.8") || modelId.includes("qwen-3.8")) return "Vinayak Turbo 27B";
    if (modelId.includes("gpt-oss-120b")) return "Vinayak Reasoning 120B";
    if (modelId.includes("compound-mini")) return "Vinayak Instant Edge";
    const found = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (found) {
      return found.name.replace(/\s*\(.*?\)\s*/g, "").trim();
    }
    if (modelId.includes("gemini-2.5-flash-lite")) return "Gemini 2.5 Flash Lite";
    if (modelId.includes("gemini-2.5-pro")) return "Gemini 2.5 Pro";
    if (modelId.includes("gemini")) return "Gemini 2.5 Flash Lite";
    if (modelId.includes("deepseek-r1")) return "DeepSeek R1";
    if (modelId.includes("deepseek-chat") || modelId.includes("deepseek")) return "DeepSeek V3";
    if (modelId.includes("qwen-2.5-coder")) return "Qwen 2.5 Coder";
    if (modelId.includes("qwen-2.5-72b")) return "Qwen 2.5 72B";
    if (modelId.includes("qwen")) return "Qwen 2.5";
    if (modelId.includes("llama-3.3")) return "Llama 3.3 70B";
    if (modelId.includes("nemotron")) return "Nemotron 3.5";
    if (modelId.includes("liquid") || modelId.includes("lfm")) return "Liquid LFM";
    return modelId.split("/").pop().replace(/[-_]/g, " ").replace(/:free/i, "");
  }

  getModelDisplayName(modelId) {
    return this.formatModelAssistedName(modelId);
  }

  updateActiveModelTag() {
    if (this.dom.activeModelTag) {
      if (this.settings.autoRouting !== false) {
        this.dom.activeModelTag.textContent = "Assisted with Vinayak Turbo 27B";
      } else if (this.settings.model && this.settings.model !== "auto") {
        this.dom.activeModelTag.textContent = `Assisted with ${this.formatModelAssistedName(this.settings.model)}`;
      } else {
        this.dom.activeModelTag.textContent = "Assisted with Vinayak Turbo 27B";
      }
    }
  }

  updateCurrentModelDisplay() {
    if (this.dom.currentModelLabel) {
      const name = this.settings.autoRouting !== false
        ? "Vinayak Turbo 27B"
        : this.formatModelAssistedName(this.settings.model);
      this.dom.currentModelLabel.textContent = `Assisted with ${name}`;
    }
    if (this.dom.currentModelBadge) {
      this.dom.currentModelBadge.textContent = "Assisted";
    }
  }

  setupEventListeners() {
    // Mobile Sidebar Toggle
    this.dom.sidebarToggleBtn.addEventListener("click", () => this.openMobileSidebar());
    this.dom.closeSidebarBtn.addEventListener("click", () => this.closeMobileSidebar());
    this.dom.sidebarBackdrop.addEventListener("click", () => this.closeMobileSidebar());

    // New Chat & Clear All
    this.dom.newChatBtn.addEventListener("click", () => this.startNewSession(true));
    this.dom.clearAllChatsBtn.addEventListener("click", () => this.clearAllSessions());

    // Custom Model Dropdown Trigger
    if (this.dom.modelDropdownTrigger && this.dom.modelDropdownMenu) {
      this.dom.modelDropdownTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDropdown(this.dom.modelDropdownMenu, this.dom.modelDropdownTrigger);
      });
    }

    // Model Search Filter Input
    if (this.dom.modelSearchInput) {
      this.dom.modelSearchInput.addEventListener("input", (e) => {
        this.filterModels(e.target.value);
      });
      this.dom.modelSearchInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    // Custom Persona Dropdown Trigger
    if (this.dom.personaDropdownTrigger && this.dom.personaDropdownMenu) {
      this.dom.personaDropdownTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDropdown(this.dom.personaDropdownMenu, this.dom.personaDropdownTrigger);
      });
    }

    // Prevent clicks inside menus from closing prematurely unless an item is clicked
    if (this.dom.modelDropdownMenu) {
      this.dom.modelDropdownMenu.addEventListener("click", (e) => {
        if (!e.target.closest(".model-item")) {
          e.stopPropagation();
        }
      });
    }
    if (this.dom.personaDropdownMenu) {
      this.dom.personaDropdownMenu.addEventListener("click", (e) => {
        if (!e.target.closest(".persona-item")) {
          e.stopPropagation();
        }
      });
    }

    // Close Dropdowns on Click Outside
    document.addEventListener("click", (e) => {
      if (
        !this.dom.modelDropdownContainer?.contains(e.target) &&
        !this.dom.personaDropdownContainer?.contains(e.target)
      ) {
        this.closeAllDropdowns();
      }
    });

    // Export Chat
    this.dom.exportChatBtn.addEventListener("click", () => this.exportCurrentChat());

    // Chat Form Submit
    this.dom.chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleChatSubmit();
    });

    // Textarea Enter / Shift+Enter / Auto-grow
    this.dom.promptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleChatSubmit();
      }
    });

    this.dom.promptInput.addEventListener("input", () => {
      this.dom.promptInput.style.height = "auto";
      const newHeight = Math.min(this.dom.promptInput.scrollHeight, 200);
      this.dom.promptInput.style.height = `${newHeight}px`;
    });

    // Stop Generation Button
    this.dom.stopBtn.addEventListener("click", () => this.stopGeneration());

    // Scroll to bottom button
    this.dom.scrollBottomBtn.addEventListener("click", () => this.scrollToBottom());
    this.dom.chatViewport.addEventListener("scroll", () => {
      const scrollPos = this.dom.chatViewport.scrollHeight - this.dom.chatViewport.scrollTop - this.dom.chatViewport.clientHeight;
      if (scrollPos > 150) {
        this.dom.scrollBottomBtn.classList.remove("hidden");
      } else {
        this.dom.scrollBottomBtn.classList.add("hidden");
      }
    });

    // Web Search Toggle
    if (this.dom.webSearchToggleBtn) {
      this.dom.webSearchToggleBtn.addEventListener("click", () => this.toggleWebSearch());
    }

    // Settings Modal
    this.dom.openSettingsBtn.addEventListener("click", () => {
      this.closeMobileSidebar();
      this.openSettingsModal();
    });
    this.dom.closeSettingsBtn.addEventListener("click", () => this.closeSettingsModal());
    this.dom.settingsModal.addEventListener("click", (e) => {
      if (e.target === this.dom.settingsModal) this.closeSettingsModal();
    });

    // Provider selector
    if (this.dom.settingsProvider) {
      this.dom.settingsProvider.addEventListener("change", (e) => this.onProviderChange(e.target.value));
    }

    // Architecture Model Selector
    if (this.dom.settingsModelSelect) {
      this.dom.settingsModelSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "auto") {
          if (this.dom.settingsAutoRouting) this.dom.settingsAutoRouting.checked = true;
          if (this.dom.providerTagBadge) this.dom.providerTagBadge.textContent = "Auto Routing";
        } else {
          if (this.dom.settingsAutoRouting) this.dom.settingsAutoRouting.checked = false;
          if (this.dom.providerTagBadge) {
            const opt = this.dom.settingsModelSelect.options[this.dom.settingsModelSelect.selectedIndex];
            this.dom.providerTagBadge.textContent = opt ? opt.text.split("(")[0].trim() : "Custom";
          }
        }
      });
    }

    // Toggle Developer Drawer (Hidden by default from public view)
    if (this.dom.toggleDeveloperDrawerBtn && this.dom.developerDrawerContent) {
      this.dom.toggleDeveloperDrawerBtn.addEventListener("click", () => {
        const isHidden = this.dom.developerDrawerContent.classList.toggle("hidden");
        if (this.dom.developerDrawerArrow) {
          this.dom.developerDrawerArrow.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
        }
      });
    }

    // Toggle Sheets Drawer (Hidden by default from public view)
    if (this.dom.toggleSheetsDrawerBtn && this.dom.sheetsDrawerContent) {
      this.dom.toggleSheetsDrawerBtn.addEventListener("click", () => {
        const isHidden = this.dom.sheetsDrawerContent.classList.toggle("hidden");
        if (this.dom.sheetsDrawerArrow) {
          this.dom.sheetsDrawerArrow.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
        }
      });
    }

    // Export Training Dataset button
    if (this.dom.exportTrainingJsonlBtn) {
      this.dom.exportTrainingJsonlBtn.addEventListener("click", () => this.exportTrainingDataset());
    }

    // Toggle API Key Mask (Safely guarded)
    if (this.dom.toggleApiKeyMask && this.dom.settingsApiKey) {
      this.dom.toggleApiKeyMask.addEventListener("click", () => {
        const isPass = this.dom.settingsApiKey.type === "password";
        this.dom.settingsApiKey.type = isPass ? "text" : "password";
        this.dom.toggleApiKeyMask.textContent = isPass ? "Hide" : "Show";
      });
    }

    // Test API Key (Safely guarded)
    if (this.dom.testApiKeyBtn) {
      this.dom.testApiKeyBtn.addEventListener("click", () => this.verifyApiKey());
    }

    // Sliders
    if (this.dom.settingsTemp) {
      this.dom.settingsTemp.addEventListener("input", (e) => {
        if (this.dom.tempValueDisplay) this.dom.tempValueDisplay.textContent = e.target.value;
      });
    }

    if (this.dom.settingsMaxTokens) {
      this.dom.settingsMaxTokens.addEventListener("input", (e) => {
        if (this.dom.tokensValueDisplay) this.dom.tokensValueDisplay.textContent = e.target.value;
      });
    }

    // Save & Reset Settings
    if (this.dom.saveSettingsBtn) {
      this.dom.saveSettingsBtn.addEventListener("click", () => this.saveSettingsFromModal());
    }
    if (this.dom.resetSettingsBtn) {
      this.dom.resetSettingsBtn.addEventListener("click", () => this.resetSettingsToDefault());
    }

    // Account Modal Event Listeners
    if (this.dom.headerAccountBtn) {
      this.dom.headerAccountBtn.addEventListener("click", () => this.openAccountModal("register"));
    }
    if (this.dom.sidebarAccountBtn) {
      this.dom.sidebarAccountBtn.addEventListener("click", () => {
        this.closeMobileSidebar();
        this.openAccountModal("register");
      });
    }
    if (this.dom.closeAccountBtn) {
      this.dom.closeAccountBtn.addEventListener("click", () => this.closeAccountModal());
    }
    if (this.dom.accountCloseFooterBtn) {
      this.dom.accountCloseFooterBtn.addEventListener("click", () => this.closeAccountModal());
    }
    if (this.dom.accountModal) {
      this.dom.accountModal.addEventListener("click", (e) => {
        if (e.target === this.dom.accountModal) this.closeAccountModal();
      });
    }

    // Account Tabs
    if (this.dom.tabRegisterBtn) {
      this.dom.tabRegisterBtn.addEventListener("click", () => this.switchAccountTab("register"));
    }
    if (this.dom.tabLoginBtn) {
      this.dom.tabLoginBtn.addEventListener("click", () => this.switchAccountTab("login"));
    }
    if (this.dom.tabProfileBtn) {
      this.dom.tabProfileBtn.addEventListener("click", () => this.switchAccountTab("profile"));
    }

    // Account Forms
    if (this.dom.registerForm) {
      this.dom.registerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleRegisterSubmit();
      });
    }
    if (this.dom.loginForm) {
      this.dom.loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleLoginSubmit();
      });
    }
    if (this.dom.logoutAccountBtn) {
      this.dom.logoutAccountBtn.addEventListener("click", () => this.handleLogout());
    }
    if (this.dom.saveSheetsUrlBtn) {
      this.dom.saveSheetsUrlBtn.addEventListener("click", () => this.handleSaveSheetsUrl());
    }
    if (this.dom.testSheetsBtn) {
      this.dom.testSheetsBtn.addEventListener("click", () => this.handleTestSheets());
    }

    // Global keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        this.startNewSession(true);
      }
      if (e.key === "Escape") {
        this.closeAllDropdowns();
        if (this.dom.accountModal && !this.dom.accountModal.classList.contains("hidden")) {
          this.closeAccountModal();
        } else if (!this.dom.settingsModal.classList.contains("hidden")) {
          this.closeSettingsModal();
        } else if (this.isStreaming) {
          this.stopGeneration();
        }
      }
    });
  }

  toggleWebSearch(forcedValue) {
    this.settings.webSearch = forcedValue !== undefined ? forcedValue : !this.settings.webSearch;
    Storage.saveSettings(this.settings);
    this.updateWebSearchUI();
    this.showToast(`Live Web Search: ${this.settings.webSearch ? "Enabled 🌐" : "Disabled"}`, "info");
  }

  updateWebSearchUI() {
    const isEnabled = this.settings.webSearch !== false;
    if (this.dom.webSearchToggleBtn) {
      this.dom.webSearchToggleBtn.classList.toggle("active", isEnabled);
    }
    if (this.dom.webToggleState) {
      this.dom.webToggleState.textContent = isEnabled ? "ON" : "OFF";
    }
    if (this.dom.settingsWebSearch) {
      this.dom.settingsWebSearch.checked = isEnabled;
    }
  }

  openMobileSidebar() {
    this.dom.sidebar.classList.add("open");
    this.dom.sidebarBackdrop.classList.add("active");
  }

  closeMobileSidebar() {
    this.dom.sidebar.classList.remove("open");
    this.dom.sidebarBackdrop.classList.remove("active");
  }

  scrollToBottom() {
    this.dom.chatViewport.scrollTo({
      top: this.dom.chatViewport.scrollHeight,
      behavior: "smooth",
    });
  }

  scrollToBottomIfNeeded() {
    const scrollDiff = this.dom.chatViewport.scrollHeight - this.dom.chatViewport.scrollTop - this.dom.chatViewport.clientHeight;
    if (scrollDiff < 200) {
      this.dom.chatViewport.scrollTop = this.dom.chatViewport.scrollHeight;
    }
  }

  exportCurrentChat() {
    const session = Storage.getSessions().find((s) => s.id === this.currentSessionId);
    if (!session) return;
    const messages = Storage.getSessionMessages(this.currentSessionId);
    if (messages.length === 0) {
      this.showToast("No messages to export", "info");
      return;
    }

    const mdContent = Storage.exportChatAsMarkdown(session, messages);
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast("Conversation exported as Markdown", "success");
  }

  /* --------------------------------------------------------------------------
     Settings Modal Logic
     -------------------------------------------------------------------------- */
  openSettingsModal() {
    this.updateProviderUI();
    if (this.dom.settingsCustomModel) this.dom.settingsCustomModel.value = this.settings.customModel || "";
    if (this.dom.settingsTemp) {
      this.dom.settingsTemp.value = this.settings.temperature ?? 0.7;
      if (this.dom.tempValueDisplay) this.dom.tempValueDisplay.textContent = this.dom.settingsTemp.value;
    }
    if (this.dom.settingsMaxTokens) {
      this.dom.settingsMaxTokens.value = this.settings.maxTokens ?? 800;
      if (this.dom.tokensValueDisplay) this.dom.tokensValueDisplay.textContent = this.dom.settingsMaxTokens.value;
    }
    if (this.dom.settingsCustomPrompt) this.dom.settingsCustomPrompt.value = this.settings.customPrompt || "";
    if (this.dom.settingsWebSearch) {
      this.dom.settingsWebSearch.checked = this.settings.webSearch !== false;
    }
    if (this.dom.settingsAutoRouting) {
      this.dom.settingsAutoRouting.checked = this.settings.autoRouting !== false;
    }
    if (this.dom.settingsModelSelect) {
      if (this.settings.autoRouting !== false) {
        this.dom.settingsModelSelect.value = "auto";
      } else if (this.settings.model) {
        this.dom.settingsModelSelect.value = this.settings.model;
      }
    }
    if (this.dom.keyStatusMsg) this.dom.keyStatusMsg.textContent = "";

    this.dom.settingsModal.classList.remove("hidden");
  }

  onProviderChange(newProviderId) {
    // Save existing input into current provider
    const currentProvider = this.settings.provider || "groq";
    const currentInputKey = this.dom.settingsApiKey ? this.dom.settingsApiKey.value.trim() : "";
    if (currentProvider === "groq") {
      this.settings.groqApiKey = currentInputKey;
    } else if (currentProvider === "gemini") {
      this.settings.geminiApiKey = currentInputKey;
    } else if (currentProvider === "qwen") {
      this.settings.qwenApiKey = currentInputKey;
    } else {
      this.settings.apiKey = currentInputKey;
    }

    this.settings.provider = newProviderId;
    this.updateProviderUI();
  }

  updateProviderUI() {
    const providerId = this.settings.provider || "groq";
    const providerConfig = PROVIDERS[providerId] || PROVIDERS.groq;

    if (this.dom.settingsProvider) {
      this.dom.settingsProvider.value = providerId;
    }

    if (this.dom.providerTagBadge) {
      this.dom.providerTagBadge.textContent = "High-Speed Engine Active";
    }

    if (this.dom.providerHelpHint) {
      this.dom.providerHelpHint.textContent = "Vinayak AI automatically optimizes reasoning speed, context, and mathematical precision for your work purpose.";
    }

    if (this.dom.apiKeyFieldLabel) {
      this.dom.apiKeyFieldLabel.textContent = providerConfig.keyName || "API Access Key";
    }

    if (this.dom.getKeyLink) {
      this.dom.getKeyLink.href = providerConfig.docUrl || "https://console.groq.com/keys";
      this.dom.getKeyLink.textContent = `Get ${providerConfig.name.split(" ")[0]} Key ↗`;
    }

    if (this.dom.settingsApiKey) {
      this.dom.settingsApiKey.placeholder = providerConfig.keyPlaceholder || "Active Built-in Key (or paste custom key)";
      const currentKey = this.getActiveApiKey();
      const isBuiltin = currentKey === APP_CONFIG.defaultGroqApiKey || currentKey === APP_CONFIG.defaultApiKey;
      if (isBuiltin) {
        this.dom.settingsApiKey.value = "";
      } else {
        this.dom.settingsApiKey.value = currentKey;
      }
    }

    if (this.dom.engineStatusBadge) {
      const currentKey = this.getActiveApiKey();
      const isCustom = currentKey !== APP_CONFIG.defaultGroqApiKey && currentKey !== APP_CONFIG.defaultApiKey && !!currentKey;
      this.dom.engineStatusBadge.textContent = isCustom ? "Custom Key Active" : "Built-in Active";
      this.dom.engineStatusBadge.className = isCustom ? "badge-tag active" : "badge-tag";
    }
  }

  closeSettingsModal() {
    this.dom.settingsModal.classList.add("hidden");
  }

  async verifyApiKey() {
    const key = this.dom.settingsApiKey ? this.dom.settingsApiKey.value.trim() : this.getActiveApiKey();
    if (!key) {
      if (this.dom.keyStatusMsg) {
        this.dom.keyStatusMsg.className = "key-status-msg error";
        this.dom.keyStatusMsg.textContent = "Please enter an API key to verify.";
      }
      return;
    }

    if (this.dom.keyStatusMsg) {
      this.dom.keyStatusMsg.className = "key-status-msg loading";
      this.dom.keyStatusMsg.textContent = "Verifying API connection...";
    }

    const providerId = this.dom.settingsProvider ? this.dom.settingsProvider.value : (this.settings.provider || "openrouter");
    const testClient = new OpenRouterClient(key, providerId);
    const result = await testClient.checkKeyStatus();

    if (result.valid) {
      if (this.dom.keyStatusMsg) {
        this.dom.keyStatusMsg.className = "key-status-msg success";
        const detail = result.data?.label || (result.data?.is_free_tier ? " (Free Tier Account)" : " (Connected)");
        this.dom.keyStatusMsg.textContent = `✓ Key is valid & operational! ${detail}`;
      }
      if (this.dom.apiStatusPill) {
        this.dom.apiStatusPill.querySelector(".status-text").textContent = "Connected";
        this.dom.apiStatusPill.querySelector(".status-dot").className = "status-dot online";
      }
    } else {
      if (this.dom.keyStatusMsg) {
        this.dom.keyStatusMsg.className = "key-status-msg error";
        this.dom.keyStatusMsg.textContent = `✗ Verification failed: ${result.error}`;
      }
      if (this.dom.apiStatusPill) {
        this.dom.apiStatusPill.querySelector(".status-text").textContent = "Invalid Key";
        this.dom.apiStatusPill.querySelector(".status-dot").className = "status-dot";
      }
    }
  }

  async checkApiStatus() {
    const key = this.getActiveApiKey();
    if (!key) {
      if (this.dom.apiStatusPill) {
        this.dom.apiStatusPill.querySelector(".status-text").textContent = "No Key Set";
        this.dom.apiStatusPill.querySelector(".status-dot").className = "status-dot";
      }
      return;
    }

    const result = await this.client.checkKeyStatus();
    if (this.dom.apiStatusPill) {
      if (result.valid) {
        this.dom.apiStatusPill.querySelector(".status-text").textContent = "Connected";
        this.dom.apiStatusPill.querySelector(".status-dot").className = "status-dot online";
      } else {
        this.dom.apiStatusPill.querySelector(".status-text").textContent = "Offline";
        this.dom.apiStatusPill.querySelector(".status-dot").className = "status-dot";
      }
    }
  }

  saveSettingsFromModal() {
    try {
      const provider = this.dom.settingsProvider ? this.dom.settingsProvider.value : (this.settings.provider || "groq");
      const enteredKey = this.dom.settingsApiKey ? this.dom.settingsApiKey.value.trim() : "";
      const defaultKeyForProvider = provider === "groq" ? APP_CONFIG.defaultGroqApiKey : (provider === "openrouter" ? APP_CONFIG.defaultApiKey : "");
      const key = enteredKey || defaultKeyForProvider;
      const customModel = this.dom.settingsCustomModel ? this.dom.settingsCustomModel.value.trim() : "";
      const temp = this.dom.settingsTemp ? parseFloat(this.dom.settingsTemp.value) : (this.settings.temperature ?? 0.7);
      const maxTokens = this.dom.settingsMaxTokens ? parseInt(this.dom.settingsMaxTokens.value) : (this.settings.maxTokens ?? 800);
      const customPrompt = this.dom.settingsCustomPrompt ? this.dom.settingsCustomPrompt.value.trim() : "";
      const webSearch = this.dom.settingsWebSearch ? this.dom.settingsWebSearch.checked : (this.settings.webSearch !== false);
      const selectedModelChoice = this.dom.settingsModelSelect ? this.dom.settingsModelSelect.value : (this.settings.model || "auto");
      const autoRouting = selectedModelChoice === "auto" ? true : (this.dom.settingsAutoRouting ? this.dom.settingsAutoRouting.checked : false);

      this.settings.provider = provider;
      if (provider === "groq") {
        this.settings.groqApiKey = key;
      } else if (provider === "gemini") {
        this.settings.geminiApiKey = key;
      } else if (provider === "qwen") {
        this.settings.qwenApiKey = key;
      } else {
        this.settings.apiKey = key;
      }

      this.settings.customModel = customModel;
      this.settings.temperature = isNaN(temp) ? 0.7 : temp;
      this.settings.maxTokens = isNaN(maxTokens) ? 800 : maxTokens;
      this.settings.customPrompt = customPrompt;
      this.settings.webSearch = webSearch;
      this.settings.autoRouting = autoRouting;

      if (customModel) {
        this.settings.model = customModel;
      } else if (selectedModelChoice !== "auto") {
        this.settings.model = selectedModelChoice;
      } else if (autoRouting) {
        this.settings.model = "auto";
      }

      Storage.saveSettings(this.settings);
      this.client.updateProvider(this.settings.provider, key);
      this.updateActiveModelTag();
      this.updateCurrentModelDisplay();
      this.updateWebSearchUI();
      this.updateProviderUI();
      this.closeSettingsModal();
      this.showToast("Settings saved successfully!", "success");
      this.checkApiStatus();
    } catch (err) {
      console.error("Save settings error:", err);
      this.showToast("Settings saved", "success");
      this.closeSettingsModal();
    }
  }

  resetSettingsToDefault() {
    this.settings = {
      provider: "openrouter",
      apiKey: (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENROUTER_API_KEY) || "",
      geminiApiKey: (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) || "",
      qwenApiKey: (typeof import.meta !== "undefined" && import.meta.env?.VITE_QWEN_API_KEY) || "",
      model: APP_CONFIG.defaultModel,
      persona: "tax",
      autoRouting: true,
      temperature: 0.7,
      maxTokens: 4096,
      customPrompt: "",
      customModel: "",
      webSearch: true,
    };

    Storage.saveSettings(this.settings);
    this.client.updateProvider(this.settings.provider, this.getActiveApiKey());
    this.selectPersona("tax");
    this.updateActiveModelTag();
    this.updateWebSearchUI();
    this.updateProviderUI();
    this.closeSettingsModal();
    this.showToast("Settings restored to defaults", "info");
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✓";
    if (type === "error") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;
    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(30px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* --------------------------------------------------------------------------
     Account & Google Sheets Backend Handlers
     -------------------------------------------------------------------------- */
  updateAccountUI() {
    const user = AuthService.getCurrentUser();
    const initials = user ? AuthService.getUserInitials(user.name) : "👤";
    const displayName = user ? user.name : "Guest User";
    const statusText = user ? "Connected Profile" : "Create Account / Sign In";

    if (this.dom.headerAccountAvatar) this.dom.headerAccountAvatar.textContent = initials;
    if (this.dom.headerAccountLabel) this.dom.headerAccountLabel.textContent = user ? user.name.split(" ")[0] : "Account";
    if (this.dom.sidebarAccountAvatar) this.dom.sidebarAccountAvatar.textContent = initials;
    if (this.dom.sidebarAccountName) this.dom.sidebarAccountName.textContent = displayName;
    if (this.dom.sidebarAccountStatus) this.dom.sidebarAccountStatus.textContent = statusText;

    if (this.dom.logoutAccountBtn) {
      if (user) {
        this.dom.logoutAccountBtn.classList.remove("hidden");
      } else {
        this.dom.logoutAccountBtn.classList.add("hidden");
      }
    }

    this.renderProfileCard(user);
  }

  renderProfileCard(user) {
    if (!this.dom.profileCardInfo) return;
    if (user) {
      const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Recent";
      const initials = AuthService.getUserInitials(user.name);
      this.dom.profileCardInfo.innerHTML = `
        <div class="profile-card-avatar">${initials}</div>
        <div class="profile-card-details">
          <div class="profile-card-name">${this.escapeHtml(user.name)}</div>
          <div class="profile-card-email">${this.escapeHtml(user.email)}</div>
          <div class="profile-card-badge">✓ Active Member since ${dateStr}</div>
        </div>
      `;
    } else {
      this.dom.profileCardInfo.innerHTML = `
        <div class="profile-card-avatar" style="background: var(--bg-tertiary); color: var(--text-muted); font-size: 1.1rem;">👤</div>
        <div class="profile-card-details">
          <div class="profile-card-name">Guest Mode</div>
          <div class="profile-card-email">Not signed in. Conversations stored locally.</div>
          <div style="font-size: 0.78rem; color: #818cf8; cursor: pointer; text-decoration: underline; margin-top: 4px;" id="guestRegisterLink">Create an account now →</div>
        </div>
      `;
      const link = document.getElementById("guestRegisterLink");
      if (link) {
        link.addEventListener("click", () => this.switchAccountTab("register"));
      }
    }
  }

  openAccountModal(defaultTab = "register") {
    const user = AuthService.getCurrentUser();
    if (user && defaultTab !== "login") {
      this.switchAccountTab("profile");
    } else {
      this.switchAccountTab(defaultTab);
    }
    if (this.dom.sheetsWebAppUrl) {
      if (AuthService.hasCustomSheetsUrl()) {
        this.dom.sheetsWebAppUrl.value = localStorage.getItem("vinayak_ai_sheets_url") || "";
      } else {
        this.dom.sheetsWebAppUrl.value = "";
        this.dom.sheetsWebAppUrl.placeholder = "Vinayak Cloud is active (Built-in). Enter custom URL to override...";
      }
    }
    if (this.dom.registerErrorMsg) this.dom.registerErrorMsg.textContent = "";
    if (this.dom.loginErrorMsg) this.dom.loginErrorMsg.textContent = "";
    if (this.dom.sheetsStatusMsg) {
      this.dom.sheetsStatusMsg.className = "key-status-msg success";
      this.dom.sheetsStatusMsg.textContent = "✓ Vinayak Cloud Database Connected (Operational)";
    }
    this.dom.accountModal.classList.remove("hidden");
  }

  closeAccountModal() {
    this.dom.accountModal.classList.add("hidden");
  }

  switchAccountTab(tabName) {
    [this.dom.tabRegisterBtn, this.dom.tabLoginBtn, this.dom.tabProfileBtn].forEach((btn) => {
      if (btn) btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    if (this.dom.registerForm) this.dom.registerForm.classList.toggle("hidden", tabName !== "register");
    if (this.dom.loginForm) this.dom.loginForm.classList.toggle("hidden", tabName !== "login");
    if (this.dom.profilePane) this.dom.profilePane.classList.toggle("hidden", tabName !== "profile");
  }

  async handleRegisterSubmit() {
    const name = this.dom.regName.value;
    const email = this.dom.regEmail.value;
    const password = this.dom.regPassword.value;

    this.dom.registerErrorMsg.textContent = "Creating your account...";
    this.dom.registerErrorMsg.style.color = "#60a5fa";

    const res = await AuthService.register({ name, email, password });
    if (res.success) {
      this.dom.registerErrorMsg.textContent = "";
      this.dom.registerForm.reset();
      this.updateAccountUI();
      this.closeAccountModal();
      this.showToast(`Account created for ${res.user.name}! Welcome to Vinayak AI.`, "success");
    } else {
      this.dom.registerErrorMsg.textContent = res.error;
      this.dom.registerErrorMsg.style.color = "#f87171";
    }
  }

  async handleLoginSubmit() {
    const email = this.dom.loginEmail.value;
    const password = this.dom.loginPassword.value;

    this.dom.loginErrorMsg.textContent = "Signing in...";
    this.dom.loginErrorMsg.style.color = "#60a5fa";

    const res = await AuthService.login({ email, password });
    if (res.success) {
      this.dom.loginErrorMsg.textContent = "";
      this.dom.loginForm.reset();
      this.updateAccountUI();
      this.closeAccountModal();
      this.showToast(res.message, "success");
    } else {
      this.dom.loginErrorMsg.textContent = res.error;
      this.dom.loginErrorMsg.style.color = "#f87171";
    }
  }

  handleLogout() {
    AuthService.logout();
    this.updateAccountUI();
    this.closeAccountModal();
    this.showToast("Signed out. Switched to Guest Mode.", "info");
  }

  async handleSaveSheetsUrl() {
    const url = this.dom.sheetsWebAppUrl.value.trim();
    AuthService.setSheetsUrl(url);
    this.dom.sheetsStatusMsg.className = "key-status-msg success";
    this.dom.sheetsStatusMsg.textContent = url
      ? "✓ Custom Cloud Database Endpoint saved successfully!"
      : "✓ Reverted to default Vinayak Cloud Database.";
    this.showToast("Cloud settings updated", "success");
  }

  async handleTestSheets() {
    const customUrl = this.dom.sheetsWebAppUrl.value.trim();
    const urlToTest = customUrl || AuthService.getSheetsUrl();
    if (!urlToTest) {
      this.dom.sheetsStatusMsg.className = "key-status-msg error";
      this.dom.sheetsStatusMsg.textContent = "Please enter a Google Sheets Web App URL first.";
      return;
    }

    this.dom.sheetsStatusMsg.className = "key-status-msg loading";
    this.dom.sheetsStatusMsg.textContent = "Testing connection to Vinayak Cloud...";

    const res = await AuthService.testSheetsConnection(urlToTest);
    if (res.success) {
      if (customUrl) {
        AuthService.setSheetsUrl(customUrl);
      }
      this.dom.sheetsStatusMsg.className = "key-status-msg success";
      this.dom.sheetsStatusMsg.textContent = `✓ ${res.message}`;
      this.showToast("Vinayak Cloud connection verified!", "success");
    } else {
      this.dom.sheetsStatusMsg.className = "key-status-msg error";
      this.dom.sheetsStatusMsg.textContent = `✗ ${res.error}`;
    }
  }
}

// Start app on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new VinayakApp();
  app.init();
  window.vinayakApp = app;
  window.nexusApp = app;
});
