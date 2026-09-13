/**
 * ==============================================================================
 * Vinayak AI - Unified Google Sheets Backend Web App (Google Apps Script)
 * ==============================================================================
 * Handles:
 * 1. User Authentication (Register & Login with password security)
 * 2. Self-Learning Training Data Logging (Prompt, Vinayak Answer, Alternate AI, Rating)
 * 3. Chat Session Synchronization & Backups
 * 4. Full CORS support (Works seamlessly with web clients)
 * 
 * QUICK SETUP INSTRUCTIONS:
 * 1. Create a new Google Spreadsheet at https://sheets.new
 * 2. Rename it to "Vinayak AI Cloud Database"
 * 3. In the top menu, go to: Extensions > Apps Script
 * 4. Paste this entire code, replacing any existing code.
 * 5. Click "Save" (Floppy icon).
 * 6. Click "Deploy" > "New deployment".
 * 7. Click the gear icon > Select "Web app".
 * 8. Set:
 *    - Description: "Vinayak AI Unified Backend v2.0"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (allows Vinayak AI client to sync securely)
 * 9. Click "Deploy", approve permissions.
 * 10. Copy your private "Web app URL" (ends in /exec).
 * ==============================================================================
 */

function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : "";
    var data = {};
    if (rawData) {
      try {
        data = JSON.parse(rawData);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    var action = (data.action || "").toLowerCase();
    var result = {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "register") {
      result = handleRegister(ss, data);
    } else if (action === "login") {
      result = handleLogin(ss, data);
    } else if (action === "log_training_data" || action === "training_data") {
      result = handleLogTrainingData(ss, data);
    } else if (action === "sync_chat" || action === "save_chat") {
      result = handleSyncChat(ss, data);
    } else {
      result = {
        success: true,
        message: "Vinayak AI Backend operational",
        timestamp: new Date().toISOString()
      };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var action = (e.parameter && e.parameter.action) ? e.parameter.action.toLowerCase() : "status";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "stats") {
    var trainingSheet = ss.getSheetByName("Training_Data");
    var usersSheet = ss.getSheetByName("Users");
    var trainingCount = trainingSheet ? Math.max(0, trainingSheet.getLastRow() - 1) : 0;
    var usersCount = usersSheet ? Math.max(0, usersSheet.getLastRow() - 1) : 0;

    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      service: "Vinayak AI Unified Cloud Backend",
      totalApprovedTrainingPairs: trainingCount,
      totalUsers: usersCount,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Vinayak AI Unified Cloud Backend",
    version: "2.0",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 1. User Registration Handler
 */
function handleRegister(ss, data) {
  var sheet = getOrCreateSheet(ss, "Users", [
    "User ID", "Full Name", "Email", "Password Hash / Encrypted", "Created At", "Last Login", "Role"
  ]);

  var email = (data.email || "").trim().toLowerCase();
  var name = (data.name || "").trim();
  var password = (data.password || "").trim();
  var userId = data.userId || "usr_" + new Date().getTime();
  var now = new Date().toISOString();

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  // Check for duplicate account
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][2] && values[i][2].toString().toLowerCase() === email) {
      return { success: false, error: "An account with this email already exists." };
    }
  }

  // Simple secure hash for storage
  var passwordHash = hashString(password);

  sheet.appendRow([userId, name, email, passwordHash, now, now, "Professional"]);

  return {
    success: true,
    message: "Vinayak AI account created successfully",
    user: {
      userId: userId,
      name: name,
      email: email,
      createdAt: now
    }
  };
}

/**
 * 2. User Login Handler
 */
function handleLogin(ss, data) {
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    return { success: false, error: "Users table not yet initialized. Please register first." };
  }

  var email = (data.email || "").trim().toLowerCase();
  var password = (data.password || "").trim();
  var now = new Date().toISOString();

  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var rowEmail = (values[i][2] || "").toString().toLowerCase();
    var rowPass = (values[i][3] || "").toString();

    if (rowEmail === email) {
      var enteredHash = hashString(password);
      if (rowPass === enteredHash || rowPass === password) {
        sheet.getRange(i + 1, 6).setValue(now);
        return {
          success: true,
          message: "Login successful",
          user: {
            userId: values[i][0],
            name: values[i][1],
            email: values[i][2],
            createdAt: values[i][4]
          }
        };
      } else {
        return { success: false, error: "Invalid password. Please try again." };
      }
    }
  }

  return { success: false, error: "No account found with this email." };
}

/**
 * 3. Self-Learning Training Data Logger
 */
function handleLogTrainingData(ss, data) {
  var sheet = getOrCreateSheet(ss, "Training_Data", [
    "Log ID", "Timestamp", "User ID", "User Prompt / Question", "Vinayak Response", 
    "Alternate AI Response", "User Rating", "AI Model", "Advisory Domain", "Review Status"
  ]);

  var logId = data.id || "train_" + new Date().getTime();
  var now = new Date().toISOString();
  var userId = data.userId || "guest";
  var prompt = data.query || "";
  var response = data.response || "";
  var altResponse = data.alternateAiResponse || "None (Direct Output)";
  var rating = data.rating || "thumbs_up";
  var model = data.model || "gemini-2.0-flash";
  var persona = data.persona || "general";
  var reviewStatus = rating === "thumbs_up" ? "Approved for Fine-Tuning / RAG" : "Needs Review";

  sheet.appendRow([
    logId, now, userId, prompt, response, altResponse, rating, model, persona, reviewStatus
  ]);

  return {
    success: true,
    message: "Training data logged successfully to Vinayak Cloud",
    logId: logId
  };
}

/**
 * 4. Chat History & Conversation Synchronization
 */
function handleSyncChat(ss, data) {
  var sheet = getOrCreateSheet(ss, "Chat_History", [
    "Timestamp", "User Email", "Session ID", "User Prompt / Question", "Vinayak AI Response", "AI Model", "Advisory Persona"
  ]);

  var now = new Date().toISOString();
  var email = data.email || "Guest";
  var sessionId = data.sessionId || "";
  var userPrompt = data.userPrompt || data.prompt || data.title || "";
  var aiResponse = data.aiResponse || data.response || "";
  var model = data.model || "gemini-2.5-flash";
  var persona = data.persona || "general";

  sheet.appendRow([
    now,
    email,
    sessionId,
    userPrompt,
    aiResponse,
    model,
    persona
  ]);

  return { success: true, message: "Chat history recorded in Google Sheet" };
}

/**
 * Helper to ensure a sheet tab exists with headers and emerald theme styling
 */
function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#059669")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Simple hash helper
 */
function hashString(str) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  var txt = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    txt += byteHex;
  }
  return txt;
}
