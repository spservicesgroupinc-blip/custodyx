
/**
 * VerityNow.AI Backend - Distinct Accounts & Dual-Sync
 * v4.1 - Robust File Storage & Privacy
 */

const CONFIG = {
  ROOT_FOLDER_NAME: "VerityNow_AI_Master",
  MASTER_DB_NAME: "Master_User_DB",
  LOCK_WAIT_MS: 30000,
  MIME_JSON: ContentService.MimeType.JSON
};

const MASTER_SHEETS = {
  USERS: 'Users',
  PENDING_LINKS: 'PendingLinks',
  SESSIONS: 'Sessions'
};

const COLS = {
  USERS: { ID: 0, USERNAME: 1, PASS: 2, LINK_ID: 3, FOLDER: 4, SS_ID: 5 },
  PENDING: { ID: 0, REQUESTER: 1, TARGET: 2, DATE: 3 },
  SESSIONS: { TOKEN: 0, USER_ID: 1, EXPIRY: 2 }
};



const USER_SHEETS = {
  PROFILE: 'Profile',
  REPORTS: 'Reports',
  DOCUMENTS: 'Documents', 
  SHARED_EVENTS: 'SharedEvents',
  MESSAGES: 'Messages',
  TEMPLATES: 'Templates'
};

const MSG_HEADER = ['id', 'sender_id', 'recipient_id', 'content', 'timestamp', 'read_status'];



// --- HTTP HANDLERS ---
function doGet(e) { return router(e); }
function doPost(e) { return router(e); }

function router(e) {
  if (!e) return response({ status: 'error', message: 'No request data' });
  let lock = LockService.getScriptLock();
  let params = e.parameter || {};
  
  if (e.postData && e.postData.contents) {
    try {
      params = { ...params, ...JSON.parse(e.postData.contents) };
    } catch (err) {
      return response({ status: 'error', message: 'Invalid JSON body' });
    }
  }

  const action = params.action;
  
  try {
    // Actions that modify data require a lock to prevent race conditions
    const writeActions = ['signup', 'linkByUsername', 'saveItems', 'sendMessage', 'saveSharedEvent', 'saveSharedEventsBatch', 'respondToInvite'];
    if (writeActions.includes(action)) {
      if (!lock.tryLock(CONFIG.LOCK_WAIT_MS)) return response({ status: 'error', message: 'Server busy. Please try again.' });
      
      // Enforce Session Validation for writes
      if (action !== 'signup' && action !== 'login') {
         if (!params.sessionToken || !validateSession(params.sessionToken, params.userId)) {
             return response({ status: 'error', message: 'Unauthorized: Invalid or expired session' });
         }
      }
    }

    let result = {};
    switch (action) {
      // Auth & Setup
      case 'setup': result = setup(); break;
      case 'setup': result = setup(); break;
      case 'signup': result = registerUser(params.username, params.password); break;
      case 'login': result = loginUser(params.username, params.password); break;
      case 'logout': result = logoutUser(params.sessionToken); break;
      
      // Core Data
      case 'sync': result = syncData(params.userId); break;
      
      // Private Data (Single User Write)
      case 'saveItems': result = saveItems(params.userId, params.type, params.items); break;
      case 'getDocumentContent': result = getDocumentContent(params.userId, params.docId); break;
      
      // Linking
      case 'linkByUsername': result = linkAccountsByUsername(params.userId, params.targetUsername); break;
      case 'getPendingInvites': result = getPendingInvites(params.userId); break;
      case 'respondToInvite': result = respondToInvite(params.userId, params.inviteId, params.accept); break;
      
      // Shared Data (Dual User Write)
      case 'sendMessage': result = sendMessage(params.userId, params.content); break;
      case 'getMessages': result = getMessages(params.userId, params.after); break;
      case 'saveSharedEventsBatch': result = saveSharedEventsBatch(params.userId, params.events); break;
      case 'getSharedEvents': result = getSharedEvents(params.userId); break;
      
      // AI Proxy
      case 'generateAI': result = generateAI(params.model, params.payload); break;
      
      default: throw new Error('Unknown action: ' + action);
    }
    return response(result);
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(CONFIG.MIME_JSON);
}

// --- CORE HELPERS ---

function getMasterSS() {
  const props = PropertiesService.getScriptProperties();
  const cachedId = props.getProperty('MASTER_SS_ID');
  if (cachedId) {
    try { return SpreadsheetApp.openById(cachedId); } catch(e) {}
  }
  const folders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (!folders.hasNext()) throw new Error("System not initialized. Run setup()");
  const ss = SpreadsheetApp.open(folders.next().getFilesByName(CONFIG.MASTER_DB_NAME).next());
  props.setProperty('MASTER_SS_ID', ss.getId());
  return ss;
}

function getUserContext(userId) {
  const ss = getMasterSS();
  const data = ss.getSheetByName(MASTER_SHEETS.USERS).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COLS.USERS.ID]) === String(userId)) {
      return {
        rowIdx: i + 1,
        userId: data[i][COLS.USERS.ID],
        username: data[i][COLS.USERS.USERNAME],
        linkedUserId: data[i][COLS.USERS.LINK_ID],
        folderId: data[i][COLS.USERS.FOLDER],
        spreadsheetId: data[i][COLS.USERS.SS_ID]
      };
    }
  }
  throw new Error("User not found: " + userId);
}

function getUserContextByUsername(username) {
  const ss = getMasterSS();
  const data = ss.getSheetByName(MASTER_SHEETS.USERS).getDataRange().getValues();
  const search = String(username).toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COLS.USERS.USERNAME]).toLowerCase().trim() === search) {
      return {
        rowIdx: i + 1,
        userId: data[i][COLS.USERS.ID],
        username: data[i][COLS.USERS.USERNAME],
        password: data[i][COLS.USERS.PASS],
        linkedUserId: data[i][COLS.USERS.LINK_ID],
        folderId: data[i][COLS.USERS.FOLDER],
        spreadsheetId: data[i][COLS.USERS.SS_ID]
      };
    }
  }
  return null;
}

// --- SETUP & AUTH ---

function setup() {
  const props = PropertiesService.getScriptProperties();
  const folders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  const root = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
  props.setProperty('ROOT_FOLDER_ID', root.getId());
  
  let masterSS;
  const files = root.getFilesByName(CONFIG.MASTER_DB_NAME);
  if (files.hasNext()) masterSS = SpreadsheetApp.open(files.next());
  else {
    masterSS = SpreadsheetApp.create(CONFIG.MASTER_DB_NAME);
    DriveApp.getFileById(masterSS.getId()).moveTo(root);
  }
  props.setProperty('MASTER_SS_ID', masterSS.getId());

  const ensure = (name, h) => {
    if (!masterSS.getSheetByName(name)) masterSS.insertSheet(name).appendRow(h);
  };
  ensure(MASTER_SHEETS.USERS, ['user_id', 'username', 'password_hash', 'linked_user_id', 'data_folder_id', 'data_spreadsheet_id', 'created_at']);
  ensure(MASTER_SHEETS.PENDING_LINKS, ['id', 'requester_id', 'target_username', 'created_at']);
  ensure(MASTER_SHEETS.SESSIONS, ['token', 'user_id', 'expiry']);
  
  return { status: 'success' };
}

function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

function generateSessionToken() {
  return Utilities.getUuid();
}

function createSession(userId) {
  const masterSS = getMasterSS();
  const sSheet = masterSS.getSheetByName(MASTER_SHEETS.SESSIONS);
  const token = generateSessionToken();
  // Set expiry for 30 days from now
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  
  sSheet.appendRow([token, userId, expiry]);
  return token;
}

function logoutUser(token) {
  if (!token) return { status: 'success' };
  const masterSS = getMasterSS();
  const sSheet = masterSS.getSheetByName(MASTER_SHEETS.SESSIONS);
  const data = sSheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(token)) {
      sSheet.deleteRow(i+1);
      break;
    }
  }
  return { status: 'success' };
}

function validateSession(token, userId) {
  if (!token || !userId) return false;
  const masterSS = getMasterSS();
  const sSheet = masterSS.getSheetByName(MASTER_SHEETS.SESSIONS);
  const data = sSheet.getDataRange().getValues();
  
  const now = new Date();
  
  for(let i=1; i<data.length; i++) {
    // Check token and userId match
    if (String(data[i][0]) === String(token) && String(data[i][1]) === String(userId)) {
      const expiry = new Date(data[i][2]);
      if (expiry > now) {
        return true;
      } else {
        // Expired, cleanup
        sSheet.deleteRow(i+1);
        return false;
      }
    }
  }
  return false;
}

function registerUser(username, password) {
  const clean = String(username).trim();
  if (getUserContextByUsername(clean)) throw new Error("Username already taken");

  const userId = Utilities.getUuid();
  const props = PropertiesService.getScriptProperties();
  const rootId = props.getProperty('ROOT_FOLDER_ID');
  const rootFolder = DriveApp.getFolderById(rootId);

  // 1. Create PRIVATE folder and spreadsheet for this user
  const folder = rootFolder.createFolder("VerityNow_User_" + clean);
  const ss = SpreadsheetApp.create("VerityNow_Data_" + clean);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  
  // 2. Initialize Sheets
  const h = {
    [USER_SHEETS.PROFILE]: ['user_id', 'data', 'updated_at'],
    [USER_SHEETS.REPORTS]: ['id', 'user_id', 'data', 'incident_date', 'updated_at', 'is_deleted'],
    [USER_SHEETS.DOCUMENTS]: ['id', 'user_id', 'meta', 'drive_file_id', 'updated_at', 'is_deleted'],
    [USER_SHEETS.SHARED_EVENTS]: ['id', 'creator_id', 'participants', 'data', 'start_time', 'updated_at'],
    [USER_SHEETS.MESSAGES]: MSG_HEADER,
    [USER_SHEETS.TEMPLATES]: ['id', 'user_id', 'data', 'updated_at', 'is_deleted']
  };
  Object.keys(h).forEach(k => {
    const s = ss.insertSheet(k);
    s.appendRow(h[k]);
  });
  const def = ss.getSheetByName('Sheet1');
  if (def) ss.deleteSheet(def);

  // 3. Register in Master DB
  const masterSS = getMasterSS();
  masterSS.getSheetByName(MASTER_SHEETS.USERS).appendRow([
    userId, 
    clean, 
    hashPassword(password), 
    "", // No linked user initially
    folder.getId(), 
    ss.getId(), 
    new Date()
  ]);
  
  // 4. Check for Pending Invites (Automatic Linking)
  try { processPendingInvites(masterSS, userId, clean); } catch(e) {}

  return { status: 'success', userId: userId, username: clean, sessionToken: createSession(userId) };
}

function processPendingInvites(masterSS, userId, username) {
  const pSheet = masterSS.getSheetByName(MASTER_SHEETS.PENDING_LINKS);
  const pData = pSheet.getDataRange().getValues();
  const cleanName = String(username).toLowerCase();
  
  let requesterId = null;
  let rowsToDelete = [];

  for(let i=1; i<pData.length; i++) {
    // New Schema: id, requester, target, date. Target is index 2.
    if(String(pData[i][2]).toLowerCase() === cleanName) {
      requesterId = pData[i][1];
      rowsToDelete.push(i+1);
      // We only process one implicit link at signup for simplicity/security
      break; 
    }
  }

  if (requesterId) {
    // Perform Link
    const uSheet = masterSS.getSheetByName(MASTER_SHEETS.USERS);
    const uData = uSheet.getDataRange().getValues();
    let myRow = -1, reqRow = -1;
    
    for(let i=1; i<uData.length; i++) {
      if(String(uData[i][0]) === String(userId)) myRow = i+1;
      if(String(uData[i][0]) === String(requesterId)) reqRow = i+1;
    }
    
    if(myRow > 0 && reqRow > 0) {
      uSheet.getRange(myRow, 4).setValue(requesterId);
      uSheet.getRange(reqRow, 4).setValue(userId);
    }
    
    // Clean up pending
    for(let i=rowsToDelete.length-1; i>=0; i--) pSheet.deleteRow(rowsToDelete[i]);
  }
}

function loginUser(username, password) {
  const user = getUserContextByUsername(username);
  if (!user) return { status: 'error', message: 'Invalid credentials' };
  
  const inputHash = hashPassword(password);
  
  // Backwards compatibility for existing plain text passwords:
  // If stored password doesn't look like a SHA-256 hash (64 hex chars), assume legacy plain text
  // NOTE: This checks specifically if it matches the legacy plain text FIRST.
  if (String(user.password) === String(password)) {
     // Migrate to hash immediately
     const masterSS = getMasterSS();
     const uSheet = masterSS.getSheetByName(MASTER_SHEETS.USERS);
     uSheet.getRange(user.rowIdx, 3).setValue(inputHash);
     return { status: 'success', userId: user.userId, username: user.username, linkedUserId: user.linkedUserId, sessionToken: createSession(user.userId) };
  }

  // Normal Hash Check
  if (String(user.password) === String(inputHash)) {
    return { status: 'success', userId: user.userId, username: user.username, linkedUserId: user.linkedUserId, sessionToken: createSession(user.userId) };
  }
  
  return { status: 'error', message: 'Invalid credentials' };
}

// --- DATA SYNC (Reads from Private Sheet) ---

function syncData(userId) {
  const ctx = getUserContext(userId);
  const userSS = SpreadsheetApp.openById(ctx.spreadsheetId);
  
  // Helper to read JSON from sheets
  const parse = (name, isSingle, isMeta) => {
    const s = userSS.getSheetByName(name);
    if (!s) return isSingle ? null : [];
    const vals = s.getDataRange().getValues();
    if (vals.length < 2) return isSingle ? null : [];
    
    // Auto-detect columns based on name
    // Profile: data is col 1
    // Reports/Templates: data is col 2
    // Documents: meta is col 2
    const dIdx = (name === USER_SHEETS.PROFILE) ? 1 : 2;
    const delIdx = vals[0].indexOf('is_deleted');
    
    const res = [];
    for (let i = 1; i < vals.length; i++) {
      if (delIdx > -1 && vals[i][delIdx] === true) continue;
      try {
        let obj = JSON.parse(vals[i][dIdx]);
        if (isMeta) obj.id = vals[i][0];
        res.push(obj);
      } catch(e) {}
    }
    return isSingle ? (res.length ? res[0] : null) : res;
  };

  return {
    status: 'success',
    data: {
      reports: parse(USER_SHEETS.REPORTS),
      templates: parse(USER_SHEETS.TEMPLATES),
      profile: parse(USER_SHEETS.PROFILE, true),
      documents: parse(USER_SHEETS.DOCUMENTS, false, true),
      // Shared events are stored locally (via dual-write), so just read local
      sharedEvents: getSharedEventsList(userSS), 
      linkedUserId: ctx.linkedUserId
    }
  };
}

// --- LINKING (Updates Pointer Only) ---

function linkAccountsByUsername(userId, targetUsername) {
  const masterSS = getMasterSS();
  // const ctx = getUserContext(userId); // Not needed for ID check
  const target = getUserContextByUsername(targetUsername);
  
  if (target && target.userId === userId) throw new Error("Cannot link to self");

  // ALWAYS create a pending invite. No more auto-linking.
  const pSheet = masterSS.getSheetByName(MASTER_SHEETS.PENDING_LINKS);
  
  // Check if invite already exists to avoid duplicates
  const pData = pSheet.getDataRange().getValues();
  const tClean = String(targetUsername).toLowerCase();
  for(let i=1; i<pData.length; i++) {
    if (String(pData[i][COLS.PENDING.REQUESTER]) === String(userId) && 
        String(pData[i][COLS.PENDING.TARGET]).toLowerCase() === tClean) {
       return { status: 'pending', message: "Invite already sent" };
    }
  }

  const inviteId = Utilities.getUuid();
  pSheet.appendRow([inviteId, userId, tClean, new Date()]);
  return { status: 'pending', message: "Invite sent" };
}

function getPendingInvites(userId) {
  const ctx = getUserContext(userId);
  const masterSS = getMasterSS();
  const pSheet = masterSS.getSheetByName(MASTER_SHEETS.PENDING_LINKS);
  const pData = pSheet.getDataRange().getValues();
  
  // We need to look for rows where target_username matches THIS user's username
  const myUsername = String(ctx.username).toLowerCase();
  const invites = [];
  
  // Pre-fetch user map to resolve requester usernames
  const uSheet = masterSS.getSheetByName(MASTER_SHEETS.USERS);
  const uData = uSheet.getDataRange().getValues();
  const userMap = new Map();
  for(let i=1; i<uData.length; i++) userMap.set(String(uData[i][0]), uData[i][1]); // ID -> Username

  for(let i=1; i<pData.length; i++) {
    if (String(pData[i][COLS.PENDING.TARGET]).toLowerCase() === myUsername) {
      invites.push({
        id: pData[i][COLS.PENDING.ID],
        requesterId: pData[i][COLS.PENDING.REQUESTER],
        requesterName: userMap.get(String(pData[i][COLS.PENDING.REQUESTER])) || "Unknown",
        createdAt: pData[i][COLS.PENDING.DATE]
      });
    }
  }
  
  return { status: 'success', invites: invites };
}

function respondToInvite(userId, inviteId, accept) {
  const masterSS = getMasterSS();
  const pSheet = masterSS.getSheetByName(MASTER_SHEETS.PENDING_LINKS);
  const pData = pSheet.getDataRange().getValues();
  
  let inviteRow = -1;
  let requesterId = null;

  for(let i=1; i<pData.length; i++) {
    if (String(pData[i][COLS.PENDING.ID]) === String(inviteId)) {
      inviteRow = i+1;
      requesterId = pData[i][COLS.PENDING.REQUESTER];
      break;
    }
  }
  
  if (inviteRow === -1) throw new Error("Invite not found");

  if (accept) {
    const uSheet = masterSS.getSheetByName(MASTER_SHEETS.USERS);
    const uData = uSheet.getDataRange().getValues();
    let myRow = -1, reqRow = -1;
    
    for(let i=1; i<uData.length; i++) {
      if(String(uData[i][0]) === String(userId)) myRow = i+1;
      if(String(uData[i][0]) === String(requesterId)) reqRow = i+1;
    }
    
    if(myRow > 0 && reqRow > 0) {
      uSheet.getRange(myRow, 4).setValue(requesterId);
      uSheet.getRange(reqRow, 4).setValue(userId);
    } else {
       throw new Error("User record mismatch during link");
    }
  }
  
  // Delete invite in both cases
  pSheet.deleteRow(inviteRow);
  
  return { status: 'success', linked: accept };
}

// --- PRIVATE DATA (Single Write) ---

function saveItems(userId, type, items) {
  if (!items || items.length === 0) return { status: 'success' };
  
  const ctx = getUserContext(userId);
  const ss = SpreadsheetApp.openById(ctx.spreadsheetId);
  let sheetName;
  
  if(type==='reports') sheetName=USER_SHEETS.REPORTS;
  else if(type==='templates') sheetName=USER_SHEETS.TEMPLATES;
  else if(type==='documents') sheetName=USER_SHEETS.DOCUMENTS;
  else if(type==='profile') sheetName=USER_SHEETS.PROFILE;
  else throw new Error("Invalid type");

  const sheet = ss.getSheetByName(sheetName);
  
  if (type === 'profile') {
    const p = JSON.stringify(items[0]);
    if (sheet.getLastRow() > 1) sheet.getRange(2, 2, 1, 2).setValues([[p, new Date()]]);
    else sheet.appendRow([userId, p, new Date()]);
    return { status: 'success' };
  }

  // Batch Save logic
  const existing = sheet.getDataRange().getValues();
  const idMap = new Map();
  for(let i=1; i<existing.length; i++) idMap.set(String(existing[i][0]), i+1);
  
  const inserts = [], updates = [], ts = new Date();
  
  items.forEach(item => {
    let row;
    if (type === 'documents') {
      let fid = idMap.has(item.id) ? existing[idMap.get(item.id)-1][3] : "";
      if (item.data) { // New file upload
        const blob = Utilities.newBlob(Utilities.base64Decode(item.data), item.mimeType, item.name);
        // Save to USER'S private folder
        fid = DriveApp.getFolderById(ctx.folderId).createFile(blob).getId();
      }
      const meta = JSON.stringify({id:item.id, name:item.name, mimeType:item.mimeType, createdAt:item.createdAt, folder:item.folder, structuredData:item.structuredData});
      row = [item.id, userId, meta, fid, ts, false];
    } else {
      row = [item.id, userId, JSON.stringify(item), item.createdAt ? new Date(item.createdAt) : ts, ts, false];
    }
    
    if(idMap.has(item.id)) updates.push({r:idMap.get(item.id), v:row});
    else inserts.push(row);
  });

  if (inserts.length) sheet.getRange(sheet.getLastRow()+1, 1, inserts.length, inserts[0].length).setValues(inserts);
  updates.forEach(u => sheet.getRange(u.r, 1, 1, u.v.length).setValues([u.v]));
  
  return { status: 'success' };
}

// --- SHARED DATA (Dual Write) ---

function sendMessage(userId, content) {
  const ctx = getUserContext(userId);
  const msgId = Utilities.getUuid();
  const ts = new Date().toISOString();
  
  // 1. Write to My Sheet
  const mySS = SpreadsheetApp.openById(ctx.spreadsheetId);
  const row = [msgId, userId, ctx.linkedUserId || "", content, ts, 'unread'];
  appendRowSafe(mySS, USER_SHEETS.MESSAGES, row);
  
  // 2. Write to Their Sheet (if linked)
  if (ctx.linkedUserId) {
    try {
      const linkedCtx = getUserContext(ctx.linkedUserId);
      const theirSS = SpreadsheetApp.openById(linkedCtx.spreadsheetId);
      appendRowSafe(theirSS, USER_SHEETS.MESSAGES, row);
    } catch(e) {
      Logger.log("Failed to sync message to linked user: " + e);
    }
  }
  
  return { status: 'success', message: { id: msgId, senderId: userId, recipientId: ctx.linkedUserId, content, timestamp: ts } };
}

function getMessages(userId, after) {
  const ctx = getUserContext(userId);
  const ss = SpreadsheetApp.openById(ctx.spreadsheetId);
  const sheet = ss.getSheetByName(USER_SHEETS.MESSAGES);
  if(!sheet) return { status: 'success', messages: [] };
  
  const data = sheet.getDataRange().getValues();
  const res = [];
  for(let i=1; i<data.length; i++) {
    const ts = data[i][4];
    if (!after || ts > after) {
      res.push({
        id: data[i][0],
        senderId: data[i][1],
        recipientId: data[i][2],
        content: data[i][3],
        timestamp: ts
      });
    }
  }
  return { status: 'success', messages: res };
}

function saveSharedEventsBatch(userId, events) {
  const ctx = getUserContext(userId);
  
  // 1. Save to My Sheet
  processEventsForSS(ctx.spreadsheetId, userId, ctx.linkedUserId, events);
  
  // 2. Save to Their Sheet
  if (ctx.linkedUserId) {
    try {
      const linkedCtx = getUserContext(ctx.linkedUserId);
      processEventsForSS(linkedCtx.spreadsheetId, userId, ctx.linkedUserId, events);
    } catch(e) {
      Logger.log("Failed to sync event: " + e);
    }
  }
  return { status: 'success' };
}

function processEventsForSS(ssId, modifierId, otherId, events) {
  const ss = SpreadsheetApp.openById(ssId);
  let sheet = ss.getSheetByName(USER_SHEETS.SHARED_EVENTS);
  if (!sheet) {
    // Lazy creation of SharedEvents sheet
    sheet = ss.insertSheet(USER_SHEETS.SHARED_EVENTS);
    // Add header row: id, creator_id, participants, data, start_time, updated_at
    sheet.appendRow(['id', 'creator_id', 'participants', 'data', 'start_time', 'updated_at']);
  }
  const existing = sheet.getDataRange().getValues();
  const idMap = new Map(); // ID -> {row, creatorId}
  
  for(let i=1; i<existing.length; i++) {
    idMap.set(String(existing[i][0]), { row: i+1, creatorId: existing[i][1] });
  }
  
  const inserts = [], updates = [], ts = new Date();
  const participants = JSON.stringify([modifierId, otherId].filter(Boolean));

  events.forEach(e => {
    let creatorId = modifierId;
    let rIdx = -1;
    
    if(idMap.has(e.id)) {
      const ex = idMap.get(e.id);
      creatorId = ex.creatorId; // Preserve original creator
      rIdx = ex.row;
    }
    
    // Cols: id, creator_id, participants, data, start_time, updated_at
    const row = [e.id, creatorId, participants, JSON.stringify(e), e.start, ts];
    
    if(rIdx > 0) updates.push({r: rIdx, v: row});
    else inserts.push(row);
  });

  if(inserts.length) sheet.getRange(sheet.getLastRow()+1, 1, inserts.length, inserts[0].length).setValues(inserts);
  updates.forEach(u => sheet.getRange(u.r, 1, 1, u.v.length).setValues([u.v]));
}

function getSharedEvents(userId) {
  const ctx = getUserContext(userId);
  const ss = SpreadsheetApp.openById(ctx.spreadsheetId);
  return { status: 'success', events: getSharedEventsList(ss) };
}

function getSharedEventsList(ss) {
  const sheet = ss.getSheetByName(USER_SHEETS.SHARED_EVENTS);
  if(!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const res = [];
  for(let i=1; i<data.length; i++) {
    try { res.push(JSON.parse(data[i][3])); } catch(e){}
  }
  return res;
}

// --- UTILS ---

function appendRowSafe(ss, sheetName, row) {
  let sheet = ss.getSheetByName(sheetName);
  if(!sheet) sheet = ss.insertSheet(sheetName);
  sheet.appendRow(row);
}

function getDocumentContent(userId, docId) {
  const ctx = getUserContext(userId);
  const ss = SpreadsheetApp.openById(ctx.spreadsheetId);
  const sheet = ss.getSheetByName(USER_SHEETS.DOCUMENTS);
  const data = sheet.getDataRange().getValues();
  
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(docId)) {
      const fid = data[i][3];
      const blob = DriveApp.getFileById(fid).getBlob();
      return { status: 'success', data: Utilities.base64Encode(blob.getBytes()) };
    }
  }
  throw new Error("Document not found");
}

// --- AI PROXY ---

function generateAI(model, payload) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error("Backend Configuration Error: GEMINI_API_KEY not set in Script Properties.");

  // Default to flash if not specified
  const modelName = model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  const response = UrlFetchApp.fetch(url, options);
  const respCode = response.getResponseCode();
  const respText = response.getContentText();

  if (respCode >= 400) {
    throw new Error(`AI API Error (${respCode}): ${respText}`);
  }

  return JSON.parse(respText);
}
