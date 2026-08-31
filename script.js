/* ==========================================================================
   AUTHENTICATION MUST HAPPEN SERVER-SIDE IN APPS SCRIPT.

   The browser must never read the Google Sheet directly; it should only send
   credentials to the Sheet Web App at /exec, and the script should check them
   against the private sheet behind the scenes. The spreadsheet itself can be
   kept private (not shared publicly), and the gviz feed is no longer needed
   for login or user management.

   Paste this into the Google Sheet's Apps Script, deploy it as a Web App,
   then copy the /exec URL into SHEET_WEBAPP_URL below.

      function doPost(e) {
        var body = JSON.parse(e.postData.contents || '{}');
        var action = body.action || 'login';
        var out;
        if (action === 'login') {
          out = handleLogin(body);
        } else if (action === 'signup') {
          out = handleSignup(body);
        } else if (action === 'listUsers') {
          out = handleListUsers(body);
        } else if (action === 'ensureFolder') {
          out = handleEnsureFolder(body);
        } else if (action === 'updateLastLogin') {
          out = handleUpdateLastLogin(body);
        } else {
          out = { status: 'error', message: 'Unknown action: ' + action };
        }
        return ContentService
          .createTextOutput(JSON.stringify(out))
          .setMimeType(ContentService.MimeType.JSON);
      }

      function loginSheet_() {
        return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
      }

      function hashPassword(value) {
        var raw = String(value || '');
        var digest = Utilities.computeDigest(
          Utilities.DigestAlgorithm.SHA_256,
          raw,
          Utilities.Charset.UTF_8
        );
        return digest.map(function (b) {
          return ('0' + (b & 0xFF).toString(16)).slice(-2);
        }).join('');
      }

      function headerMap_(sheet) {
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var map = {};
        headers.forEach(function (h, i) { map[String(h).trim()] = i + 1; });
        return map;
      }

      function handleLogin(data) {
        var sheet = loginSheet_();
        var cols = headerMap_(sheet);
        var unameCol = cols['User Name'];
        var passCol = cols['Password'];
        var mobileCol = cols['Mobile Number'];
        var emailCol = cols['Email ID'];
        var loginCol = cols['Recent Login DateTime'];

        if (!unameCol || !passCol || !mobileCol || !emailCol || !loginCol) {
          return {
            status: 'error',
            message: 'The login sheet is missing one or more required headers.'
          };
        }

        var mode = String(data.mode || 'mobile').trim().toLowerCase();
        var identifier = String(data.identifier || data.username || '').trim();
        var passwordHash = hashPassword(data.password);
        var values = sheet.getDataRange().getValues();

        for (var i = 1; i < values.length; i++) {
          var row = values[i];
          var username = String(row[unameCol - 1] || '').trim();
          if (!username) continue;

          var mobile = String(row[mobileCol - 1] || '').trim().toLowerCase();
          var email = String(row[emailCol - 1] || '').trim().toLowerCase();
          var storedHash = String(row[passCol - 1] || '').trim();

          var isMatch = false;
          if (mode === 'email') {
            isMatch = email === String(identifier).trim().toLowerCase();
          } else {
            isMatch = mobile === String(identifier).trim().toLowerCase();
          }

          if (!isMatch && String(data.username || '').trim() && username === String(data.username).trim()) {
            isMatch = true;
          }

          if (!isMatch) continue;
          if (storedHash !== passwordHash) {
            return { status: 'error', message: 'Invalid password.' };
          }

          sheet.getRange(i + 1, loginCol).setValue(new Date());
          return {
            status: 'ok',
            username: username,
            role: String(row[cols['Role'] - 1] || 'user').trim() || 'user',
            name: String(row[cols['Name'] - 1] || '').trim(),
            userId: String(row[cols['User Id'] - 1] || '').trim()
          };
        }

        return { status: 'error', message: 'No matching account was found.' };
      }

      function handleSignup(data) {
        var sheet = loginSheet_();
        var cols = headerMap_(sheet);
        var row = new Array(sheet.getLastColumn()).fill('');
        function set(header, value) {
          var idx = cols[header];
          if (idx) row[idx - 1] = value;
        }
        set('User Id', data.userId);
        set('Name', data.name);
        set('Mobile Number', data.mobile);
        set('Email ID', data.email);
        set('User Name', data.username);
        set('Password', hashPassword(data.password));
        set('Role', data.role);
        set('Birth Date', data.birthDate);
        sheet.appendRow(row);
        return { status: 'ok' };
      }

      function handleListUsers() {
        var sheet = loginSheet_();
        var cols = headerMap_(sheet);
        var values = sheet.getDataRange().getValues();
        var users = [];
        for (var i = 1; i < values.length; i++) {
          var row = values[i];
          var username = String(row[cols['User Name'] - 1] || '').trim();
          if (!username) continue;
          users.push({
            'User Id': String(row[cols['User Id'] - 1] || '').trim(),
            'Name': String(row[cols['Name'] - 1] || '').trim(),
            'Mobile Number': String(row[cols['Mobile Number'] - 1] || '').trim(),
            'Email ID': String(row[cols['Email ID'] - 1] || '').trim(),
            'User Name': username,
            'Role': String(row[cols['Role'] - 1] || '').trim(),
            'Recent Login DateTime': String(row[cols['Recent Login DateTime'] - 1] || '').trim()
          });
        }
        return { status: 'ok', users: users };
      }

      function handleUpdateLastLogin(data) {
        var sheet = loginSheet_();
        var cols = headerMap_(sheet);
        var unameCol = cols['User Name'];
        var loginCol = cols['Recent Login DateTime'];
        if (!unameCol || !loginCol) {
          return { status: 'error', message: 'Sheet is missing a "User Name" or "Recent Login DateTime" column.' };
        }
        var values = sheet.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][unameCol - 1]).trim() === String(data.username).trim()) {
            sheet.getRange(i + 1, loginCol).setValue(new Date());
            break;
          }
        }
        return { status: 'ok' };
      }

      function handleEnsureFolder(data) {
        var parent = DriveApp.getFolderById(data.parentId);
        var existing = parent.getFoldersByName(data.name);
        var folder = existing.hasNext() ? existing.next() : parent.createFolder(data.name);
        return { status: 'ok', url: 'https://drive.google.com/drive/folders/' + folder.getId() };
      }

   The spreadsheet can now stay private, and the browser only needs the Web App URL.
   ========================================================================== */
const SHEET_ID = "1z3sukkBDsJuaiHc3az8G6_K9AD71_PsN60gYNKozaT0";
const SHEET_GID = "0";
//const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw_o_GDxvdo7HSUiWu3KCZzOqqpNYDDww5BEXOfEOMUR4ccnu2-UuqDZgvIFTG2uwE0wA/exec"; // Old URL paste your Apps Script /exec URL here
//const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyQP60dKDImYBKArNVlf2hJ2n-s6dvw2vBkruJHmsKz6gqQQJSVfqPDzlmEDeqPDOIiBA/exec"; // 2nd URL paste your Apps Script /exec URL here
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxQfqkl3k__DbFpkNiQbBURrgKhIZXwp3Xz1h4tkqUwqP8VKyfYu80CramYxKKS9f68zg/exec"; // Hashing Pass URL paste your Apps Script /exec URL here
const ROOT_DRIVE_FOLDER_ID = "1xZb6NpUFa5EZ2Fw7yKeiBw4qBATWVh4s"; // your archive Drive folder

function gvizUrl() {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}&_=${Date.now()}`;
}

/* Shows a plain browser alert the first time we detect the device itself
   is offline (navigator.onLine === false), before even attempting a
   network call. This is deliberately separate from the on-page error
   banners: those cover the sheet/server being unreachable for other
   reasons (down, mis-shared, etc.), while this covers "you have no
   internet connection at all" as directly as possible. A short cooldown
   stops it from popping repeatedly if several network calls fire in
   quick succession while offline. */
let lastOfflineAlertAt = 0;
function isOffline() {
  if (navigator.onLine === false) {
    const now = Date.now();
    if (now - lastOfflineAlertAt > 3000) {
      lastOfflineAlertAt = now;
      alert('Check your internet connection.');
    }
    return true;
  }
  return false;
}

/* Posts one action to the Apps Script Web App and returns the parsed JSON
   response, or null if the web app isn't configured or the call fails.
   Any action may return { status: 'error', ... } for validation/auth failures;
   callers must inspect the returned status instead of assuming everything is ok.
   The browser no longer queries the sheet directly. */
async function callSheetWebApp(payload) {
  if (!SHEET_WEBAPP_URL) {
    console.log('[Auth] No SHEET_WEBAPP_URL configured.');
    return null;
  }
  if (isOffline()) {
    console.log('[Auth] Browser offline; skipping Apps Script request.');
    return null;
  }

  console.log('[Auth] Sending to Apps Script:', payload);
  try {
    const res = await fetch(SHEET_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids a CORS preflight against Apps Script
      body: JSON.stringify(payload)
    });

    console.log('[Auth] HTTP status:', res.status, res.statusText);
    const data = await res.json().catch(() => null);
    console.log('[Auth] Apps Script response:', data);

    if (!data) return null;
    return data;
  } catch (e) {
    console.warn('[Auth] Apps Script call failed:', payload.action, e);
    return null;
  }
}

/* Fetches every non-empty user row via the Apps Script backend instead of
   reading the private sheet through the public gviz JSON feed. */
async function fetchSheetUsers() {
  if (isOffline()) throw new Error('You appear to be offline.');
  const data = await callSheetWebApp({ action: 'listUsers' });
  if (!data || data.status !== 'ok' || !Array.isArray(data.users)) {
    throw new Error((data && data.message) || 'Unable to load users from the Apps Script backend.');
  }
  return data.users;
}

function roleFromRow(row) {
  const raw = String(row['Role'] || '').trim().toLowerCase();
  return raw.startsWith('admin') ? 'admin' : 'user';
}

/* ==========================================================================
   DEFAULT_DATA — the starting hierarchy, used only the first time the app
   runs on a browser (after that, admin edits are saved to this browser's
   local storage and take over). Each paper's "pdf" field should be a
   Google Drive share link (e.g.
   "https://drive.google.com/file/d/FILE_ID/view?usp=sharing") — it is
   converted automatically to an embeddable preview so it opens inside this
   app's viewer, not a new tab. Leave "pdf": "" for papers not linked yet.
   ========================================================================== */
const DEFAULT_DATA = {
  "Savitribai Phule Pune University": {
    "Computer Engineering": {
      "First Year": {
        "Term 1": [
          { title: "Engineering Mathematics I", code: "BE-CE-101", date: "Dec 2024", pdf: "" },
          { title: "Basic Electrical Engineering", code: "BE-CE-102", date: "Dec 2024", pdf: "" }
        ],
        "Term 2": [
          { title: "Engineering Mathematics II", code: "BE-CE-151", date: "May 2025", pdf: "" }
        ]
      },
      "Second Year": {
        "Term 1": [
          { title: "Data Structures & Algorithms", code: "BE-CE-201", date: "Dec 2024", pdf: "" },
          { title: "Digital Electronics", code: "BE-CE-202", date: "Dec 2024", pdf: "" }
        ],
        "Term 2": [
          { title: "Database Management Systems", code: "BE-CE-251", date: "May 2025", pdf: "" }
        ]
      }
    },
    "Mechanical Engineering": {
      "First Year": {
        "Term 1": [
          { title: "Engineering Mechanics", code: "BE-ME-101", date: "Dec 2024", pdf: "" }
        ],
        "Term 2": [
          { title: "Thermodynamics I", code: "BE-ME-151", date: "May 2025", pdf: "" }
        ]
      }
    }
  },
  "Mumbai University": {
    "Civil Engineering": {
      "Third Year": {
        "Term 1": [
          { title: "Structural Analysis", code: "MU-CV-301", date: "Nov 2024", pdf: "" }
        ],
        "Term 2": [
          { title: "Geotechnical Engineering", code: "MU-CV-351", date: "Apr 2025", pdf: "" }
        ]
      }
    }
  }
};

const DEFAULT_LOGOS = {
  "Savitribai Phule Pune University": "",
  "Mumbai University": ""
};

const DEFAULT_FOLDERS = {}; // key -> Google Drive folder URL. Key is either a bare
// university name (its own storage folder) or a full
// path.join('|') (a term's Course Drive folder).

/* ---------- Local storage-backed state ---------- */
const LS_DATA = 'qpa.data.v1';
const LS_LOGOS = 'qpa.logos.v1';
const LS_FOLDERS = 'qpa.folders.v1';
const LS_SESSION = 'qpa.session.v1';

/* Fail-safe storage: some browsers/preview frames block localStorage
   entirely (throws on getItem/setItem instead of just returning null).
   These wrappers fall back to an in-memory store for the current tab so
   the app (and login) keeps working even when persistence isn't
   available — it just won't survive a page reload in that case. */
const memoryStore = {};
let storageOk = true;
function lsGet(key) {
  if (storageOk) {
    try { return localStorage.getItem(key); } catch (e) { storageOk = false; }
  }
  return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
}
function lsSet(key, value) {
  if (storageOk) {
    try { localStorage.setItem(key, value); return; } catch (e) { storageOk = false; }
  }
  memoryStore[key] = value;
}
function lsRemove(key) {
  if (storageOk) {
    try { localStorage.removeItem(key); return; } catch (e) { storageOk = false; }
  }
  delete memoryStore[key];
}

function loadJSON(key, fallback) {
  try {
    const raw = lsGet(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt storage, fall back */ }
  lsSet(key, JSON.stringify(fallback));
  return JSON.parse(JSON.stringify(fallback));
}
function saveJSON(key, value) {
  lsSet(key, JSON.stringify(value));
}

let DATA = loadJSON(LS_DATA, DEFAULT_DATA);
let LOGOS = loadJSON(LS_LOGOS, DEFAULT_LOGOS);
let FOLDERS = loadJSON(LS_FOLDERS, DEFAULT_FOLDERS);

function persistData() { saveJSON(LS_DATA, DATA); }
function persistLogos() { saveJSON(LS_LOGOS, LOGOS); }
function persistFolders() { saveJSON(LS_FOLDERS, FOLDERS); }

/* University-wise Drive folders. FOLDERS is keyed by path.join('|'), so a
   university's own folder lives under its bare name (e.g.
   FOLDERS["Mumbai University"]), same scheme already used for per-term
   "Course Drive folder" links deeper in the hierarchy. When the Apps
   Script Web App is configured, adding a university auto-creates (or
   reuses) a same-named subfolder inside ROOT_DRIVE_FOLDER_ID; otherwise
   admins can still paste a folder link by hand from the folder bar. */
async function ensureUniversityFolder(name) {
  const data = await callSheetWebApp({ action: 'ensureFolder', parentId: ROOT_DRIVE_FOLDER_ID, name });
  if (data && data.url) {
    FOLDERS[name] = data.url;
    persistFolders();
    render();
  }
}

/* ---------- Session / auth ---------- */
let session = null; // { username, role, name, userId }

function tryRestoreSession() {
  try {
    const raw = lsGet(LS_SESSION);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.username && parsed.role) { session = parsed; }
  } catch (e) { /* ignore */ }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appRoot').style.display = 'none';
  document.getElementById('mainTabs').style.display = 'none';
  currentView = 'archive';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appRoot').style.display = 'block';
  document.getElementById('sessionUser').textContent = session.name || session.username;
  const tag = document.getElementById('sessionRoleTag');
  tag.textContent = session.role === 'admin' ? 'Admin' : 'Student';
  tag.className = 'roleTag ' + session.role;
  document.getElementById('footNote').textContent = session.role === 'admin'
    ? 'Signed in as administrator — you can add, edit and remove items in the archive.'
    : 'Papers are for reference viewing only — no editing or uploading from this screen.';
  document.getElementById('mainTabs').style.display = isAdmin() ? 'flex' : 'none';
  currentView = 'archive';
  updateTabsUI();
  path = [];
  render();
}

/* ---------- Main tabs: Archive / Users (admin only) ---------- */
let currentView = 'archive'; // 'archive' | 'users'
const $tabArchive = document.getElementById('tabArchive');
const $tabUsers = document.getElementById('tabUsers');

function updateTabsUI() {
  $tabArchive.classList.toggle('active', currentView === 'archive');
  $tabUsers.classList.toggle('active', currentView === 'users');
  document.getElementById('searchRow').style.display = currentView === 'users' ? 'none' : 'flex';
}
$tabArchive.addEventListener('click', () => {
  currentView = 'archive';
  updateTabsUI();
  $search.value = '';
  path = [];
  render();
});
$tabUsers.addEventListener('click', () => {
  if (!isAdmin()) return;
  currentView = 'users';
  updateTabsUI();
  $search.value = '';
  render();
});

function setButtonBusy(btn, busy, busyLabel, idleLabel) {
  btn.disabled = busy;
  btn.textContent = busy ? busyLabel : idleLabel;
}

/* ---- Show/hide password toggles ---- */
document.querySelectorAll('.pwToggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.toggleFor);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.textContent = showing ? 'Show' : 'Hide';
  });
});

/* ---- Sign-in identifier switches between Mobile number / Email ID ---- */
const $loginIdentifier = document.getElementById('loginIdentifier');
const $loginIdentifierLabel = document.getElementById('loginIdentifierLabel');

function loginMode() {
  const checked = document.querySelector('input[name="loginMode"]:checked');
  return checked ? checked.value : 'mobile';
}
function updateLoginModeUI() {
  const mode = loginMode();
  if (mode === 'email') {
    $loginIdentifierLabel.textContent = 'Email ID';
    $loginIdentifier.type = 'email';
    $loginIdentifier.placeholder = 'you@example.com';
    $loginIdentifier.autocomplete = 'email';
  } else {
    $loginIdentifierLabel.textContent = 'Mobile number';
    $loginIdentifier.type = 'tel';
    $loginIdentifier.placeholder = '10 digit number';
    $loginIdentifier.autocomplete = 'tel';
  }
}
document.querySelectorAll('input[name="loginMode"]').forEach(r => r.addEventListener('change', updateLoginModeUI));

/* ---- Sign in ---- */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginSubmitBtn');
  errEl.classList.remove('show');
  const mode = loginMode();
  const identifier = $loginIdentifier.value.trim();
  const p = document.getElementById('loginPass').value;

  console.log('[Auth] Login submit:', { mode, identifier, passwordLength: p.length });

  if (!identifier || !p) return;

  setButtonBusy(btn, true, 'Checking credentials…', 'Sign in');
  try {
    const data = await callSheetWebApp({
      action: 'login',
      identifier,
      mode,
      password: p
    });

    console.log('[Auth] Login result:', data);

    if (!data || data.status !== 'ok') {
      errEl.textContent = (data && data.message) || (mode === 'email'
        ? "No account found with that email ID."
        : "No account found with that mobile number.");
      errEl.classList.add('show');
      return;
    }

    session = {
      username: String(data.username || '').trim(),
      role: String(data.role || 'user').trim().toLowerCase() === 'admin' ? 'admin' : 'user',
      name: String(data.name || '').trim(),
      userId: String(data.userId || '').trim()
    };
    console.log('[Auth] Session created:', session);
    saveJSON(LS_SESSION, session);
    document.getElementById('loginForm').reset();
    updateLoginModeUI();
    showApp();
    callSheetWebApp({ action: 'updateLastLogin', username: session.username });
  } catch (err) {
    console.error('[Auth] Sign-in failed:', err);
    errEl.textContent = "Couldn't reach the login backend — check your connection or the Apps Script deployment.";
    errEl.classList.add('show');
  } finally {
    setButtonBusy(btn, false, 'Checking credentials…', 'Sign in');
  }
});

document.getElementById('signOutBtn').addEventListener('click', () => {
  session = null;
  lsRemove(LS_SESSION);
  showLogin();
});

function isAdmin() { return session && session.role === 'admin'; }

/* ---- Switch between sign-in / sign-up panels ---- */
document.getElementById('goToSignup').addEventListener('click', () => {
  document.getElementById('signInView').style.display = 'none';
  document.getElementById('signUpView').style.display = 'block';
});
document.getElementById('goToSignin').addEventListener('click', () => {
  document.getElementById('signUpView').style.display = 'none';
  document.getElementById('signInView').style.display = 'block';
});

/* ---- Sign up ---- */
function userIdBase(firstName, lastName, birthDate) {
  const fi = (firstName || '').trim().charAt(0).toUpperCase();
  const li = (lastName || '').trim().charAt(0).toUpperCase();
  const year = birthDate ? birthDate.slice(0, 4) : '';
  if (!fi || !li || year.length !== 4) return '';
  return fi + li + year;
}

/* Live-preview the auto-generated User ID as the person fills in their
   name and birth date. The final ID (with a disambiguating suffix if this
   base is already taken) is only settled at submit time, once the sheet
   has been checked — see the signupForm submit handler below. */
function refreshUserIdPreview() {
  const base = userIdBase(
    document.getElementById('suFirstName').value,
    document.getElementById('suLastName').value,
    document.getElementById('suBirthDate').value
  );
  document.getElementById('suUserId').value = base;
}
['suFirstName', 'suLastName', 'suBirthDate'].forEach(id => {
  document.getElementById(id).addEventListener('input', refreshUserIdPreview);
});

function validateSignup(v) {
  if (!v.firstName) return 'Please enter your first name.';
  if (!v.lastName) return 'Please enter your surname.';
  if (!/^\d{10}$/.test(v.mobile)) return 'Mobile number must be exactly 10 digits.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return 'Please enter a valid email address.';
  if (!v.birthDate) return 'Please select your birth date.';
  if (!v.username) return 'Please choose a user name.';
  if (v.password.length < 6) return 'Password must be at least 6 characters.';
  if (v.password !== v.retype) return "Passwords don't match.";
  return null;
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('signupError');
  const okEl = document.getElementById('signupSuccess');
  const btn = document.getElementById('signupSubmitBtn');
  errEl.classList.remove('show');
  okEl.classList.remove('show');

  const values = {
    firstName: document.getElementById('suFirstName').value.trim(),
    middleName: document.getElementById('suMiddleName').value.trim(),
    lastName: document.getElementById('suLastName').value.trim(),
    mobile: document.getElementById('suMobile').value.trim(),
    email: document.getElementById('suEmail').value.trim(),
    birthDate: document.getElementById('suBirthDate').value,
    username: document.getElementById('suUsername').value.trim(),
    password: document.getElementById('suPassword').value,
    retype: document.getElementById('suRetype').value
  };

  const validationError = validateSignup(values);
  if (validationError) {
    errEl.textContent = validationError;
    errEl.classList.add('show');
    return;
  }

  if (!SHEET_WEBAPP_URL) {
    errEl.textContent = "Sign-up isn't connected yet — an administrator needs to deploy the Apps Script and add its URL to this file (see the comment at the top of the script).";
    errEl.classList.add('show');
    return;
  }

  setButtonBusy(btn, true, 'Creating account…', 'Create account');
  try {
    const users = await fetchSheetUsers();

    // Mobile numbers must be unique — reject a duplicate outright.
    if (users.some(row => String(row['Mobile Number'] || '').trim() === values.mobile)) {
      throw new Error('That mobile number is already registered.');
    }
    // Email IDs are allowed to repeat across accounts — no uniqueness check.
    if (users.some(row => String(row['User Name'] || '').trim().toLowerCase() === values.username.toLowerCase())) {
      throw new Error('That user name is already taken.');
    }

    // User ID is generated from name + birth year, then disambiguated
    // against the sheet if that base is already taken.
    const base = userIdBase(values.firstName, values.lastName, values.birthDate);
    const existingIds = new Set(users.map(row => String(row['User Id'] || '').trim().toUpperCase()));
    let userId = base;
    let suffix = 2;
    while (existingIds.has(userId.toUpperCase())) {
      userId = `${base}-${suffix}`;
      suffix++;
    }
    document.getElementById('suUserId').value = userId;

    const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(' ');

    const data = await callSheetWebApp({
      action: 'signup',
      userId,
      name: fullName,
      mobile: values.mobile,
      email: values.email,
      username: values.username,
      password: values.password,
      role: 'user',
      birthDate: values.birthDate
    });
    if (!data) {
      throw new Error('Sign-up failed — please try again.');
    }

    okEl.textContent = `Account created (User ID ${userId}) — you can sign in now.`;
    okEl.classList.add('show');
    document.getElementById('signupForm').reset();
    setTimeout(() => {
      document.getElementById('signUpView').style.display = 'none';
      document.getElementById('signInView').style.display = 'block';
      document.getElementById('loginModeMobile').checked = true;
      updateLoginModeUI();
      $loginIdentifier.value = values.mobile;
      okEl.classList.remove('show');
    }, 1400);
  } catch (err) {
    console.error('Sign-up failed:', err);
    errEl.textContent = err.message || 'Sign-up failed — please try again.';
    errEl.classList.add('show');
  } finally {
    setButtonBusy(btn, false, 'Creating account…', 'Create account');
  }
});


/* ==========================================================================
   Browsing state and rendering
   ========================================================================== */
let path = [];          // e.g. ["Savitribai Phule Pune University","Computer Engineering"]
const $content = document.getElementById('content');
const $crumbs = document.getElementById('crumbs');
const $levelLbl = document.getElementById('levelLabel');
const $search = document.getElementById('searchInput');
const $overlay = document.getElementById('overlay');
const $viewerBody = document.getElementById('viewerBody');
const $viewerTitle = document.getElementById('viewerTitle');
const $viewerMeta = document.getElementById('viewerMeta');

const LEVEL_LABELS = ["Universities", "Branches", "Years", "Terms", "Question Papers"];
const LEVEL_SINGULAR = ["University", "Branch", "Year", "Term"];

function getNodeAtPath(p) {
  let node = DATA;
  for (const key of p) { node = node[key]; if (!node) return null; }
  return node;
}

function render() {
  if (currentView === 'users') { renderUsersView(); return; }
  if ($search.value.trim()) { renderSearchResults($search.value.trim()); return; }
  renderCrumbs();
  const node = getNodeAtPath(path);
  const depth = path.length;
  $levelLbl.textContent = LEVEL_LABELS[depth] || "";

  if (depth < 4) {
    renderCardGrid(node, depth);
    if (depth === 1) {
      // Just entered a university — show its dedicated Drive storage folder.
      $content.prepend(buildFolderBar(path[0], 'University Drive folder', { allowAutoCreate: true }));
    }
  } else {
    renderPaperList(node || []);
  }
}

/* Shared "Drive folder" bar used both for a university's own storage
   folder (depth 1, keyed by university name) and for a term's Course
   Drive folder (depth 4, keyed by the full path). `allowAutoCreate` shows
   a "Create in Drive" button that provisions the folder automatically via
   the Apps Script Web App, instead of only accepting a hand-pasted link. */
function buildFolderBar(folderKey, label, { allowAutoCreate = false } = {}) {
  const folderUrl = FOLDERS[folderKey] || "";
  const folderBar = document.createElement('div');
  folderBar.className = 'folderBar';
  folderBar.innerHTML = `
    <div class="info">
      <span class="label">${escapeHtml(label)}</span>
      <span class="value">${folderUrl ? escapeHtml(folderUrl) : 'No folder linked yet'}</span>
    </div>
    <div class="actions"></div>
  `;
  const actions = folderBar.querySelector('.actions');
  if (folderUrl) {
    const openLink = document.createElement('a');
    openLink.href = folderUrl; openLink.target = '_blank'; openLink.rel = 'noopener';
    openLink.className = 'folderBtn';
    openLink.textContent = 'Open folder ↗';
    actions.appendChild(openLink);
  }
  if (isAdmin()) {
    if (allowAutoCreate && !folderUrl && SHEET_WEBAPP_URL) {
      const createBtn = document.createElement('button');
      createBtn.type = 'button';
      createBtn.className = 'folderBtn';
      createBtn.textContent = 'Create in Drive';
      createBtn.onclick = () => { createBtn.disabled = true; createBtn.textContent = 'Creating…'; ensureUniversityFolder(folderKey); };
      actions.appendChild(createBtn);
    }
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'folderBtn';
    editBtn.textContent = folderUrl ? 'Change link' : 'Add folder link';
    editBtn.onclick = () => openFolderLinkForm(folderKey, folderUrl);
    actions.appendChild(editBtn);
  }
  return folderBar;
}

function renderCrumbs() {
  $crumbs.innerHTML = "";
  const home = document.createElement('button');
  home.textContent = "Home";
  home.onclick = () => { path = []; render(); };
  $crumbs.appendChild(home);

  path.forEach((seg, i) => {
    const sep = document.createElement('span');
    sep.className = 'sep'; sep.textContent = '/';
    $crumbs.appendChild(sep);

    if (i === path.length - 1) {
      const cur = document.createElement('span');
      cur.className = 'crumb-current';
      cur.textContent = seg;
      $crumbs.appendChild(cur);
    } else {
      const btn = document.createElement('button');
      btn.textContent = seg;
      btn.onclick = () => { path = path.slice(0, i + 1); render(); };
      $crumbs.appendChild(btn);
    }
  });
}

function renderCardGrid(node, depth) {
  const keys = node ? Object.keys(node) : [];
  const isUniLevel = depth === 0;

  const grid = document.createElement('div');
  grid.className = 'grid';

  keys.forEach(key => {
    const child = node[key];
    const count = countLeaf(child, depth);
    const card = document.createElement('button');
    card.className = 'card';

    let logoHtml = '';
    if (isUniLevel) {
      const logoUrl = LOGOS[key];
      logoHtml = logoUrl
        ? `<div class="cardLogo"><img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(key)} logo"></div>`
        : `<div class="cardLogo cardLogo--fallback">${escapeHtml(initials(key))}</div>`;
    }

    card.innerHTML = `
      ${logoHtml}
      <div class="cardName">${escapeHtml(key)}</div>
      <div class="cardMeta">${count}</div>
    `;
    card.onclick = () => { path = [...path, key]; render(); };

    if (isAdmin()) {
      const adminRow = document.createElement('div');
      adminRow.className = 'cardAdminRow';
      adminRow.innerHTML = `
        <button type="button" class="cardAdminBtn" title="Rename">✎</button>
        <button type="button" class="cardAdminBtn danger" title="Delete">✕</button>
      `;
      adminRow.querySelectorAll('button')[0].onclick = (e) => { e.stopPropagation(); openRenameForm(depth, key); };
      adminRow.querySelectorAll('button')[1].onclick = (e) => { e.stopPropagation(); confirmDeleteKey(depth, key); };
      card.appendChild(adminRow);
    }

    grid.appendChild(card);
  });

  if (isAdmin()) {
    const addCard = document.createElement('button');
    addCard.className = 'addCard';
    addCard.type = 'button';
    addCard.innerHTML = `<span class="plus">+</span> Add ${LEVEL_SINGULAR[depth]}`;
    addCard.onclick = () => openAddForm(depth);
    grid.appendChild(addCard);
  }

  $content.innerHTML = "";
  if (grid.children.length === 0) { renderEmpty(); return; }
  $content.appendChild(grid);
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function countLeaf(node, depth) {
  if (depth === 0) { const n = Object.keys(node).length; return `${n} branch${n === 1 ? '' : 'es'}`; }
  if (depth === 1) { const n = Object.keys(node).length; return `${n} year${n === 1 ? '' : 's'}`; }
  if (depth === 2) { const n = Object.keys(node).length; return `${n} term${n === 1 ? '' : 's'}`; }
  if (depth === 3) { const n = (node || []).length; return `${n} paper${n === 1 ? '' : 's'}`; }
  return "";
}

function renderPaperList(papers) {
  $content.innerHTML = "";

  // Course Drive folder bar
  const folderKey = path.join('|');
  $content.appendChild(buildFolderBar(folderKey, 'Course Drive folder'));

  if (!papers.length && !isAdmin()) { renderEmptyInto($content); return; }

  const wrap = document.createElement('div');
  wrap.className = 'paperList';

  papers.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'paperRow' + (isAdmin() ? ' isAdmin' : '');
    row.innerHTML = `
      <div class="paperTitle">${escapeHtml(p.title)}</div>
      <div class="paperCode">${escapeHtml(p.code || '—')}</div>
      <div class="paperDate">${escapeHtml(p.date || '')}</div>
      <button class="viewBtn" type="button">View ›</button>
    `;
    row.querySelector('.viewBtn').onclick = () => openViewer(p);

    if (isAdmin()) {
      const editBtn = document.createElement('button');
      editBtn.className = 'rowIconBtn'; editBtn.type = 'button'; editBtn.title = 'Edit';
      editBtn.textContent = '✎';
      editBtn.onclick = () => openPaperForm(idx, p);
      row.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'rowIconBtn danger'; delBtn.type = 'button'; delBtn.title = 'Delete';
      delBtn.textContent = '✕';
      delBtn.onclick = () => confirmDeletePaper(idx, p);
      row.appendChild(delBtn);
    }

    wrap.appendChild(row);
  });

  if (isAdmin()) {
    const addBtnWrap = document.createElement('div');
    addBtnWrap.style.marginBottom = '14px';
    const addBtn = document.createElement('button');
    addBtn.className = 'addBtn';
    addBtn.type = 'button';
    addBtn.textContent = '+ Add paper';
    addBtn.onclick = () => openPaperForm(null, null);
    addBtnWrap.appendChild(addBtn);
    $content.appendChild(addBtnWrap);
  }

  if (papers.length) { $content.appendChild(wrap); }
  else if (isAdmin()) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `<strong>No papers filed here yet</strong>Use "Add paper" above to link one.`;
    $content.appendChild(empty);
  }
}

function renderEmpty() {
  renderEmptyInto($content);
}
function renderEmptyInto(target) {
  const el = document.createElement('div');
  el.className = 'empty';
  el.innerHTML = isAdmin()
    ? `<strong>Nothing filed here yet</strong>Use "Add ${LEVEL_SINGULAR[path.length] || 'item'}" above to get started.`
    : `<strong>Nothing filed here yet</strong>Check back once an administrator has added papers here.`;
  target.appendChild(el);
}

/* ==========================================================================
   Users view (admin only) — a live read-out of every row in the login
   sheet, including each user's last sign-in ("Recent Login DateTime",
   stamped by callSheetWebApp({action:'updateLastLogin', ...}) on every
   successful sign-in). This is a display of the sheet's own data, so
   there is nothing to persist locally — it always reflects the sheet.
   ========================================================================== */
function renderUsersView() {
  if (!isAdmin()) { currentView = 'archive'; updateTabsUI(); render(); return; }

  $crumbs.innerHTML = "";
  const cur = document.createElement('span');
  cur.className = 'crumb-current';
  cur.textContent = "Users";
  $crumbs.appendChild(cur);
  $levelLbl.textContent = "Registered Users";

  $content.innerHTML = `<div class="empty"><strong>Loading users…</strong>Requesting the login data from the Apps Script backend.</div>`;
  loadAndRenderUsers();
}

async function loadAndRenderUsers() {
  let users;
  try {
    users = await fetchSheetUsers();
  } catch (err) {
    console.error('Failed to load users:', err);
    $content.innerHTML = `<div class="empty"><strong>Couldn't load users</strong>Check your connection or the Apps Script deployment.</div>`;
    return;
  }
  if (currentView !== 'users') return; // user navigated away while this was loading

  const toolbar = document.createElement('div');
  toolbar.className = 'usersToolbar';
  toolbar.innerHTML = `
    <span class="count">${users.length} user${users.length === 1 ? '' : 's'}</span>
  `;
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'folderBtn';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.onclick = () => renderUsersView();
  toolbar.appendChild(refreshBtn);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'usersTableWrap';
  const table = document.createElement('table');
  table.className = 'usersTable';
  table.innerHTML = `
    <thead>
      <tr>
        <th>User Id</th>
        <th>Name</th>
        <th>Mobile Number</th>
        <th>Email ID</th>
        <th>User Name</th>
        <th>Role</th>
        <th>Recent Login DateTime</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">No users found in the sheet yet.</td></tr>`;
  } else {
    users.forEach(u => {
      const role = roleFromRow(u);
      const lastLogin = String(u['Recent Login DateTime'] || '').trim();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(u['User Id'] || '—')}</td>
        <td>${escapeHtml(u['Name'] || '—')}</td>
        <td>${escapeHtml(u['Mobile Number'] || '—')}</td>
        <td>${escapeHtml(u['Email ID'] || '—')}</td>
        <td>${escapeHtml(u['User Name'] || '—')}</td>
        <td><span class="userRoleTag ${role}">${role === 'admin' ? 'Admin' : 'Student'}</span></td>
        <td class="${lastLogin ? '' : 'muted'}">${lastLogin ? escapeHtml(lastLogin) : 'Never signed in'}</td>
      `;
      tbody.appendChild(row);
    });
  }

  tableWrap.appendChild(table);
  $content.innerHTML = "";
  $content.appendChild(toolbar);
  $content.appendChild(tableWrap);
}

/* ---------- Search across every paper ---------- */
function flattenPapers() {
  const out = [];
  for (const uni in DATA) {
    for (const branch in DATA[uni]) {
      for (const year in DATA[uni][branch]) {
        for (const term in DATA[uni][branch][year]) {
          DATA[uni][branch][year][term].forEach(paper => {
            out.push({ uni, branch, year, term, paper });
          });
        }
      }
    }
  }
  return out;
}

function renderSearchResults(q) {
  $crumbs.innerHTML = "";
  const back = document.createElement('button');
  back.textContent = "Home";
  back.onclick = () => { $search.value = ""; path = []; render(); };
  $crumbs.appendChild(back);
  const sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = '/';
  $crumbs.appendChild(sep);
  const cur = document.createElement('span'); cur.className = 'crumb-current';
  cur.textContent = `Search: "${q}"`;
  $crumbs.appendChild(cur);

  const ql = q.toLowerCase();
  const matches = flattenPapers().filter(({ paper }) =>
    paper.title.toLowerCase().includes(ql) || (paper.code || '').toLowerCase().includes(ql)
  );

  $levelLbl.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'}`;

  if (!matches.length) {
    $content.innerHTML = `<div class="empty"><strong>No papers match "${escapeHtml(q)}"</strong>Try a different title or code.</div>`;
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'paperList';
  matches.forEach(({ uni, branch, year, term, paper }) => {
    const row = document.createElement('div');
    row.className = 'resultRow';
    row.innerHTML = `
      <div class="resultPath">${escapeHtml(uni)} / ${escapeHtml(branch)} / ${escapeHtml(year)} / ${escapeHtml(term)}</div>
      <div class="resultTitle">${escapeHtml(paper.title)} <span style="opacity:.6; font-family:var(--font-mono); font-size:12px;">· ${escapeHtml(paper.code || '')}</span></div>
    `;
    row.onclick = () => openViewer(paper);
    wrap.appendChild(row);
  });
  $content.innerHTML = "";
  $content.appendChild(wrap);
}

/* ==========================================================================
   PDF Viewer — Google Drive share links are converted to their embeddable
   /preview form so they open inside this app, not a new tab.
   ========================================================================== */
function toEmbeddableUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com')) {
    let m = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) m = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  return trimmed;
}

function openViewer(paper) {
  $viewerTitle.textContent = paper.title;
  $viewerMeta.textContent = `${paper.code || '—'} · ${paper.date || ''}`;
  if (paper.pdf) {
    const src = toEmbeddableUrl(paper.pdf);
    $viewerBody.innerHTML = `<iframe src="${src}" title="${escapeHtml(paper.title)}" allow="autoplay"></iframe>`;
  } else {
    $viewerBody.innerHTML = `
      <div class="noFile">
        <strong>No file linked yet</strong>
        <p>${isAdmin()
        ? 'Edit this paper and paste a Google Drive share link into the PDF field.'
        : 'Check back once an administrator has linked this paper\'s PDF.'}</p>
      </div>`;
  }
  $overlay.classList.add('open');
}
document.getElementById('closeViewer').onclick = () => {
  $overlay.classList.remove('open');
  $viewerBody.innerHTML = "";
};
$overlay.addEventListener('click', (e) => { if (e.target === $overlay) { $overlay.classList.remove('open'); $viewerBody.innerHTML = ""; } });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($overlay.classList.contains('open')) { $overlay.classList.remove('open'); $viewerBody.innerHTML = ""; }
  if ($formOverlay.classList.contains('open')) { closeFormModal(); }
});

/* ==========================================================================
   Admin CRUD — generic form modal + operations on DATA / LOGOS / FOLDERS
   ========================================================================== */
const $formOverlay = document.getElementById('formOverlay');
const $formTitle = document.getElementById('formTitle');
const $formBody = document.getElementById('formBody');
const $formSave = document.getElementById('formSave');
const $formCancel = document.getElementById('formCancel');
const $closeForm = document.getElementById('closeForm');

function openFormModal({ title, fields, onSave }) {
  $formTitle.textContent = title;
  $formBody.innerHTML = "";
  const inputs = {};
  fields.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.textContent = f.label;
    label.setAttribute('for', 'f_' + f.key);
    const input = document.createElement('input');
    input.type = f.type || 'text';
    input.id = 'f_' + f.key;
    input.value = f.value || '';
    if (f.placeholder) input.placeholder = f.placeholder;
    wrap.appendChild(label);
    wrap.appendChild(input);
    $formBody.appendChild(wrap);
    inputs[f.key] = input;
  });

  const save = () => {
    const values = {};
    for (const key in inputs) { values[key] = inputs[key].value.trim(); }
    const ok = onSave(values);
    if (ok !== false) closeFormModal();
  };
  $formSave.onclick = save;
  $formOverlay.classList.add('open');
  const firstInput = $formBody.querySelector('input');
  if (firstInput) setTimeout(() => firstInput.focus(), 30);
}
function closeFormModal() {
  $formOverlay.classList.remove('open');
  $formBody.innerHTML = "";
}
$formCancel.onclick = closeFormModal;
$closeForm.onclick = closeFormModal;
$formOverlay.addEventListener('click', (e) => { if (e.target === $formOverlay) closeFormModal(); });

/* -- Add container item (university / branch / year / term) -- */
function openAddForm(depth) {
  const fields = [{ key: 'name', label: `${LEVEL_SINGULAR[depth]} name`, placeholder: `e.g. ${['Savitribai Phule Pune University', 'Computer Engineering', 'First Year', 'Term 1'][depth]}` }];
  if (depth === 0) { fields.push({ key: 'logo', label: 'Logo URL (optional)', placeholder: 'https://…/logo.png' }); }

  openFormModal({
    title: `Add ${LEVEL_SINGULAR[depth]}`,
    fields,
    onSave: (values) => {
      const name = values.name;
      if (!name) { alert('Please enter a name.'); return false; }
      const node = getNodeAtPath(path);
      if (node && node[name] !== undefined) { alert('That name already exists here.'); return false; }
      if (depth === 0) {
        DATA[name] = {};
        if (values.logo) { LOGOS[name] = values.logo; persistLogos(); }
        ensureUniversityFolder(name); // fire-and-forget; re-renders itself when it resolves
      } else {
        node[name] = depth === 3 ? [] : {};
      }
      persistData();
      render();
    }
  });
}

/* -- Rename container item -- */
function openRenameForm(depth, oldKey) {
  const fields = [{ key: 'name', label: `${LEVEL_SINGULAR[depth]} name`, value: oldKey }];
  if (depth === 0) { fields.push({ key: 'logo', label: 'Logo URL (optional)', value: LOGOS[oldKey] || '', placeholder: 'https://…/logo.png' }); }

  openFormModal({
    title: `Rename ${LEVEL_SINGULAR[depth]}`,
    fields,
    onSave: (values) => {
      const newName = values.name;
      if (!newName) { alert('Please enter a name.'); return false; }
      const node = getNodeAtPath(path);
      if (newName !== oldKey && node[newName] !== undefined) { alert('That name already exists here.'); return false; }

      if (newName !== oldKey) {
        const rebuilt = {};
        Object.keys(node).forEach(k => { rebuilt[k === oldKey ? newName : k] = node[k]; });
        // write rebuilt object back onto the parent container
        if (path.length === 0) {
          Object.keys(DATA).forEach(k => delete DATA[k]);
          Object.assign(DATA, rebuilt);
        } else {
          const parent = getNodeAtPath(path);
          Object.keys(parent).forEach(k => delete parent[k]);
          Object.assign(parent, rebuilt);
        }
        if (depth === 0 && LOGOS[oldKey] !== undefined) {
          LOGOS[newName] = LOGOS[oldKey];
          delete LOGOS[oldKey];
        }
      }
      if (depth === 0) {
        LOGOS[newName] = values.logo || '';
        persistLogos();
      }
      persistData();
      render();
    }
  });
}

function confirmDeleteKey(depth, key) {
  if (!confirm(`Delete "${key}" and everything filed under it? This can't be undone.`)) return;
  const node = getNodeAtPath(path);
  delete node[key];
  if (depth === 0) { delete LOGOS[key]; persistLogos(); }
  persistData();
  render();
}

/* -- Paper add/edit/delete -- */
function openPaperForm(index, existing) {
  const isEdit = existing !== null;
  openFormModal({
    title: isEdit ? 'Edit paper' : 'Add paper',
    fields: [
      { key: 'title', label: 'Paper title', value: existing ? existing.title : '', placeholder: 'e.g. Data Structures & Algorithms' },
      { key: 'code', label: 'Paper code', value: existing ? existing.code : '', placeholder: 'e.g. BE-CE-201' },
      { key: 'date', label: 'Exam date', value: existing ? existing.date : '', placeholder: 'e.g. Dec 2024' },
      { key: 'pdf', label: 'Google Drive PDF link', value: existing ? existing.pdf : '', placeholder: 'https://drive.google.com/file/d/…/view' }
    ],
    onSave: (values) => {
      if (!values.title) { alert('Please enter a paper title.'); return false; }
      const node = getNodeAtPath(path); // array of papers
      const paper = { title: values.title, code: values.code, date: values.date, pdf: values.pdf };
      if (isEdit) { node[index] = paper; } else { node.push(paper); }
      persistData();
      render();
    }
  });
}

function confirmDeletePaper(index, paper) {
  if (!confirm(`Delete "${paper.title}"? This can't be undone.`)) return;
  const node = getNodeAtPath(path);
  node.splice(index, 1);
  persistData();
  render();
}

/* -- Course Drive folder link -- */
function openFolderLinkForm(folderKey, existingUrl) {
  openFormModal({
    title: 'Course Drive folder',
    fields: [
      { key: 'url', label: 'Google Drive folder link', value: existingUrl, placeholder: 'https://drive.google.com/drive/folders/…' }
    ],
    onSave: (values) => {
      if (values.url) { FOLDERS[folderKey] = values.url; } else { delete FOLDERS[folderKey]; }
      persistFolders();
      render();
    }
  });
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

$search.addEventListener('input', render);

/* ---------- Boot ---------- */
tryRestoreSession();
if (session) { showApp(); } else { showLogin(); }
