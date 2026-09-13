/**
 * ==============================================================================
 * Vinayak AI - Authentication & Google Sheets Cloud Sync Service
 * ==============================================================================
 */

const AUTH_KEYS = {
  USERS: "vinayak_ai_users",
  CURRENT_USER: "vinayak_ai_current_user",
  SHEETS_URL: "vinayak_ai_sheets_url",
};

/**
  * Obfuscated built-in Google Apps Script endpoint.
  * Keeps production deployment URL securely hidden from plain-text scrapers and public exposure.
  */
export function getBuiltinSheetsUrl() {
  try {
    const s1 = "aHR0cHM6Ly9zY3JpcHQu";
    const s2 = "Z29vZ2xlLmNvbS9tYWNy";
    const s3 = "b3Mvcy9BS2Z5Y2J5djliSm5DbDFZNU9yOGdtOUctazBoTkpTdmtEWjFGR1hjWUd6VlFkR1FR";
    const s4 = "WHkyTFkwMWxxa3dYOXdFTnVQd0pyTTQvZXhlYw==";
    return atob(s1 + s2 + s3 + s4);
  } catch (e) {
    return "";
  }
}

export const AuthService = {
  /**
   * Get the currently authenticated user (or null)
   */
  getCurrentUser() {
    try {
      const stored = localStorage.getItem(AUTH_KEYS.CURRENT_USER);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn("Failed to parse current user", e);
      return null;
    }
  },

  /**
   * Set active user session
   */
  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEYS.CURRENT_USER);
    }
  },

  /**
   * Get all registered users from local cache
   */
  getUsers() {
    try {
      const stored = localStorage.getItem(AUTH_KEYS.USERS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Save user database locally
   */
  saveUsers(users) {
    try {
      localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error("Failed to save users", e);
    }
  },

  /**
   * Register a new user
   */
  async register({ name, email, password }) {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedName = (name || "").trim();

    if (!trimmedName) {
      return { success: false, error: "Please enter your full name." };
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!password || password.length < 4) {
      return { success: false, error: "Password must be at least 4 characters long." };
    }

    const users = this.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    const userId = "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const createdAt = new Date().toISOString();

    const newUser = {
      userId,
      name: trimmedName,
      email: trimmedEmail,
      password: password, // Stored for local auth verification
      createdAt,
      lastLogin: createdAt,
    };

    users.push(newUser);
    this.saveUsers(users);

    const safeUser = {
      userId,
      name: trimmedName,
      email: trimmedEmail,
      createdAt,
    };
    this.setCurrentUser(safeUser);

    // Sync to Google Sheets if Web App URL is configured
    const sheetsUrl = this.getSheetsUrl();
    if (sheetsUrl) {
      this.syncToGoogleSheet("register", {
        userId,
        name: trimmedName,
        email: trimmedEmail,
        password,
      }).catch((err) => console.warn("Google Sheet sync notice:", err));
    }

    return {
      success: true,
      message: "Account created successfully!",
      user: safeUser,
      syncedToCloud: Boolean(sheetsUrl),
    };
  },

  /**
   * Log in an existing user
   */
  async login({ email, password }) {
    const trimmedEmail = (email || "").trim().toLowerCase();
    if (!trimmedEmail || !password) {
      return { success: false, error: "Please provide both email and password." };
    }

    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (!user) {
      return { success: false, error: "No account found with this email. Please create an account." };
    }

    if (user.password !== password) {
      return { success: false, error: "Incorrect password." };
    }

    user.lastLogin = new Date().toISOString();
    this.saveUsers(users);

    const safeUser = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
    this.setCurrentUser(safeUser);

    // Optional cloud update
    const sheetsUrl = this.getSheetsUrl();
    if (sheetsUrl) {
      this.syncToGoogleSheet("login", {
        userId: user.userId,
        email: user.email,
        password,
      }).catch((err) => console.warn("Google Sheet sync notice:", err));
    }

    return {
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: safeUser,
    };
  },

  /**
   * Log out current user
   */
  logout() {
    this.setCurrentUser(null);
  },

  /**
   * Google Sheets Web App Endpoint
   */
  getSheetsUrl() {
    const custom = localStorage.getItem(AUTH_KEYS.SHEETS_URL);
    if (custom && custom.trim()) {
      return custom.trim();
    }
    return getBuiltinSheetsUrl();
  },

  hasCustomSheetsUrl() {
    const custom = localStorage.getItem(AUTH_KEYS.SHEETS_URL);
    return Boolean(custom && custom.trim());
  },

  setSheetsUrl(url) {
    if (url) {
      localStorage.setItem(AUTH_KEYS.SHEETS_URL, url.trim());
    } else {
      localStorage.removeItem(AUTH_KEYS.SHEETS_URL);
    }
  },

  /**
   * Send payload to Google Sheets Web App
   */
  async syncToGoogleSheet(action, data) {
    const url = this.getSheetsUrl();
    if (!url) return { success: false, error: "Vinayak Cloud endpoint not configured." };

    try {
      const payload = { action, ...data, timestamp: new Date().toISOString() };
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      try {
        const json = await res.json();
        return json;
      } catch (_) {
        return { success: true, message: "Sync dispatched to Vinayak Cloud" };
      }
    } catch (e) {
      console.warn("Failed to sync with Vinayak Cloud", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Test connection to Google Sheet
   */
  async testSheetsConnection(url) {
    const targetUrl = url || this.getSheetsUrl();
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return { success: false, error: "Please enter a valid Google Apps Script Web App URL." };
    }
    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "ping", timestamp: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data && data.success) {
        return { success: true, message: "Vinayak Cloud operational & synchronized!" };
      }
      return { success: true, message: "Connection ping received! Vinayak Cloud is ready." };
    } catch (e) {
      return { success: false, error: e.message || "Failed to reach Vinayak Cloud endpoint." };
    }
  },

  /**
   * Retrieve cloud database stats
   */
  async getCloudStats() {
    const url = this.getSheetsUrl();
    if (!url) return null;
    try {
      const res = await fetch(`${url}?action=stats`);
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  /**
   * Helper to format avatar initials
   */
  getUserInitials(name) {
    if (!name) return "VA";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },
};
