/* ==========================================================================
   LOGIN — credentials are NOT stored in this file, and the browser never
   reads the Google Sheet directly. Every sign-in, sign-up, and admin
   "Users" list goes through a single Apps Script Web App (SETUP below),
   which runs privately under your Google account and is the only thing
   with access to the sheet. This means:
     • The sheet does NOT need to be shared publicly. Set it back to
       private (only you / other admins can open it) — the app no longer
       needs "Anyone with the link" access at all.
     • The browser's source code (visible to anyone via View Source or
       DevTools) contains no sheet ID, no sheet link, and no way to read
       the sheet's contents directly. All it has is the Apps Script's
       public /exec URL, which only answers narrow, purpose-built
       questions ("is this password correct for this mobile number?") —
       it never hands back raw sheet data to an unauthenticated caller.
     • Passwords are stored as salted SHA-256 hashes, not plain text. Any
       existing plain-text rows (e.g. from before this change) are
       upgraded to a hash automatically the next time that person signs
       in successfully — nothing for you to do by hand.
     • After a correct sign-in, the script issues a signed, 12-hour
       session token. The admin-only "Users" list and Drive-folder
       creation require that token and re-check the caller's role
       against the sheet itself — a student account can't forge admin
       access by editing values in the browser.

   Sheet columns expected (any left-to-right order, matched by header
   text case-insensitively — so "Recent Login DateTIme" or any other
   capitalization still matches): User Id, Name, Mobile Number, Email
   ID, User Name, Password, Role, Recent Login DateTime, Birth Date.

   SETUP — do this once in the Google Sheet:
   1. Set the sheet's sharing back to private / restricted — it no longer
      needs to be link-shared, since the app never reads it directly.
   2. Give any account that should manage the archive Role = "admin" in
      the Role column. Leave Role blank (or "user") for ordinary students
      — sign-ups always get "user".
   3. Open Extensions → Apps Script on the sheet, delete ALL existing
      code (including any older version of this script), and paste in
      the script below.
   4. ⚠️ Near the top of the pasted script, REPLACE TOKEN_SECRET and
      PASSWORD_PEPPER with your own new random strings before deploying.
      The two values pre-filled below are placeholders generated during
      this setup — since they've been shared with you in a chat/file,
      treat them as already-public and swap them out, the same way you
      wouldn't reuse a password someone emailed you. Any long random
      string works (30+ random characters); generate one however you
      like. Whatever you choose must stay only in this Apps Script, never
      copied into the website's own files — anyone who learns
      TOKEN_SECRET could forge admin sessions, so treat it like a
      password.
   5. Deploy → New deployment → Web app → Execute as: Me → Who has
      access: Anyone. Paste the resulting /exec URL into
      SHEET_WEBAPP_URL below (this file, a few lines down).
   6. If you're updating an EXISTING deployment instead of creating a new
      one: Deploy → Manage deployments → Edit (pencil) → Version: New
      version → Deploy. Saving the code alone does not update what's
      live — this step does. The /exec URL stays the same in that case,
      so you don't need to change SHEET_WEBAPP_URL below.

   Unlike earlier versions of this app, sign-in now requires the Apps
   Script to be deployed and working — there is no client-only fallback
   anymore, because a client-only fallback is exactly what exposed the
   sheet publicly in the first place.

        // ====== CONFIGURATION — replace with your own random strings ======
        var TOKEN_SECRET = "d0345d4e8ba68338361353afdeaf559fc6da6ce70c1e64ec8b7f9e4e5cfb2d0b";
        var PASSWORD_PEPPER = "a94a1b9cd3df897303e4c12449e3d3d2dbad9b5dae12a60dd2d4f66ae1eb094c";
        var TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 hours

        function doPost(e) {
          var body = JSON.parse(e.postData.contents);
          var action = body.action;
          var out;
          if (action === 'login') {
            out = handleLogin(body);
          } else if (action === 'signup') {
            out = handleSignup(body);
          } else if (action === 'listUsers') {
            out = handleListUsers(body);
          } else if (action === 'ensureFolder') {
            out = handleEnsureFolder(body);
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

        // Reads row 1 and returns { "Canonical Header": columnNumber (1-based) },
        // matched CASE-INSENSITIVELY against a known list of expected
        // headers. This is deliberate: real sheets drift from the "ideal"
        // spelling over time (e.g. "Recent Login DateTIme" vs "...DateTime"),
        // and a case-sensitive match would silently treat that column as
        // missing rather than erroring loudly — exactly the kind of bug
        // that's hard to notice until a feature quietly stops working.
        var CANONICAL_HEADERS_ = [
          'User Id', 'Name', 'Mobile Number', 'Email ID', 'User Name',
          'Password', 'Role', 'Recent Login DateTime', 'Birth Date'
        ];
        function headerMap_(sheet) {
          var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          var byLower = {};
          headers.forEach(function (h, i) { byLower[String(h).trim().toLowerCase()] = i + 1; });
          var map = {};
          CANONICAL_HEADERS_.forEach(function (name) {
            var col = byLower[name.toLowerCase()];
            if (col) map[name] = col;
          });
          return map;
        }

        // Every data row as an object keyed by header text, plus a
        // "_row" field giving that row's 1-based sheet row number (so
        // callers can write back to the exact row they read).
        function allRows_(sheet, cols) {
          var values = sheet.getDataRange().getValues();
          var rows = [];
          for (var i = 1; i < values.length; i++) {
            var row = { _row: i + 1 };
            Object.keys(cols).forEach(function (header) {
              row[header] = values[i][cols[header] - 1];
            });
            if (String(row['User Name'] || '').trim() !== '') rows.push(row);
          }
          return rows;
        }

        function toHex_(bytes) {
          return bytes.map(function (b) {
            var v = (b < 0 ? b + 256 : b).toString(16);
            return v.length === 1 ? '0' + v : v;
          }).join('');
        }

        function hashPassword_(password) {
          return toHex_(Utilities.computeDigest(
            Utilities.DigestAlgorithm.SHA_256,
            String(password) + PASSWORD_PEPPER,
            Utilities.Charset.UTF_8
          ));
        }

        function signToken_(username, role, expiry) {
          return toHex_(Utilities.computeHmacSha256Signature(
            username + '|' + role + '|' + expiry, TOKEN_SECRET
          ));
        }

        function roleOf_(row) {
          return String(row['Role'] || '').trim().toLowerCase().indexOf('admin') === 0 ? 'admin' : 'user';
        }

        function verifyToken_(username, role, expiry, token) {
          if (!expiry || Number(expiry) < Date.now()) return false;
          return signToken_(username, role, expiry) === token;
        }

        // Re-derives the caller's role from the sheet itself (never
        // trusts a role the client claims) and checks their token.
        // Returns the caller's row if they're a valid, current admin —
        // null otherwise.
        function requireAdmin_(sheet, cols, data) {
          var rows = allRows_(sheet, cols);
          var user = rows.filter(function (r) {
            return String(r['User Name']).trim() === String(data.username || '').trim();
          })[0];
          if (!user) return null;
          var role = roleOf_(user);
          if (role !== 'admin') return null;
          if (!verifyToken_(data.username, role, data.tokenExpiry, data.token)) return null;
          return user;
        }

        function formatDateTime_(d) {
          if (!(d instanceof Date) || isNaN(d.getTime())) return String(d || '');
          return Utilities.formatDate(d, Session.getScriptTimeZone(), "d MMMM yyyy 'at' HH:mm:ss");
        }

        function handleLogin(data) {
          var sheet = loginSheet_();
          var cols = headerMap_(sheet);
          var rows = allRows_(sheet, cols);
          var column = data.mode === 'email' ? 'Email ID' : 'Mobile Number';
          var identifier = String(data.identifier || '').trim().toLowerCase();
          var user = rows.filter(function (r) {
            return String(r[column] || '').trim().toLowerCase() === identifier;
          })[0];
          if (!user) return { status: 'not_found' };

          var stored = String(user['Password'] || '');
          var submittedHash = hashPassword_(data.password);
          var matches = stored === submittedHash;

          // Legacy plain-text row from before hashing was added: accept
          // once, then silently upgrade the cell to a hash.
          if (!matches && stored !== '' && stored === String(data.password)) {
            matches = true;
            sheet.getRange(user._row, cols['Password']).setValue(submittedHash);
          }
          if (!matches) return { status: 'wrong_password' };

          var role = roleOf_(user);
          var expiry = Date.now() + TOKEN_LIFETIME_MS;
          var token = signToken_(user['User Name'], role, expiry);

          if (cols['Recent Login DateTime']) {
            sheet.getRange(user._row, cols['Recent Login DateTime']).setValue(new Date());
          }

          return {
            status: 'ok',
            username: user['User Name'],
            name: user['Name'],
            role: role,
            userId: user['User Id'],
            token: token,
            tokenExpiry: expiry
          };
        }

        function handleSignup(data) {
          var sheet = loginSheet_();
          var cols = headerMap_(sheet);
          var rows = allRows_(sheet, cols);

          var mobile = String(data.mobile || '').trim();
          if (rows.some(function (r) { return String(r['Mobile Number'] || '').trim() === mobile; })) {
            return { status: 'error', message: 'That mobile number is already registered.' };
          }
          var username = String(data.username || '').trim();
          if (rows.some(function (r) { return String(r['User Name'] || '').trim().toLowerCase() === username.toLowerCase(); })) {
            return { status: 'error', message: 'That user name is already taken.' };
          }

          var firstName = String(data.firstName || '').trim();
          var middleName = String(data.middleName || '').trim();
          var lastName = String(data.lastName || '').trim();
          var fullName = [firstName, middleName, lastName].filter(function (p) { return p; }).join(' ');

          var base = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() + String(data.birthDate || '').slice(0, 4);
          var existingIds = {};
          rows.forEach(function (r) { existingIds[String(r['User Id'] || '').trim().toUpperCase()] = true; });
          var userId = base, suffix = 2;
          while (existingIds[userId.toUpperCase()]) { userId = base + '-' + suffix; suffix++; }

          var row = new Array(sheet.getLastColumn()).fill('');
          function set(header, value) { var idx = cols[header]; if (idx) row[idx - 1] = value; }
          set('User Id', userId);
          set('Name', fullName);
          set('Mobile Number', mobile);
          set('Email ID', String(data.email || '').trim());
          set('User Name', username);
          set('Password', hashPassword_(data.password));
          set('Role', 'user');
          set('Birth Date', data.birthDate);
          // "Recent Login DateTime" is intentionally left blank until
          // the person's first sign-in.
          sheet.appendRow(row);

          return { status: 'ok', userId: userId };
        }

        function handleListUsers(data) {
          var sheet = loginSheet_();
          var cols = headerMap_(sheet);
          if (!requireAdmin_(sheet, cols, data)) return { status: 'error', message: 'Not authorized.' };
          var rows = allRows_(sheet, cols).map(function (r) {
            return {
              'User Id': r['User Id'],
              'Name': r['Name'],
              'Mobile Number': r['Mobile Number'],
              'Email ID': r['Email ID'],
              'User Name': r['User Name'],
              'Role': r['Role'],
              'Recent Login DateTime': formatDateTime_(r['Recent Login DateTime'])
              // Password intentionally omitted — never sent back to the browser.
            };
          });
          return { status: 'ok', users: rows };
        }

        function handleEnsureFolder(data) {
          var sheet = loginSheet_();
          var cols = headerMap_(sheet);
          if (!requireAdmin_(sheet, cols, data)) return { status: 'error', message: 'Not authorized.' };
          var parent = DriveApp.getFolderById(data.parentId);
          var existing = parent.getFoldersByName(data.name);
          var folder = existing.hasNext() ? existing.next() : parent.createFolder(data.name);
          return { status: 'ok', url: 'https://drive.google.com/drive/folders/' + folder.getId() };
        }

   ========================================================================== */
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwXBaHcV7Guk7Z4Fb1EQgv0rs8KFkP-oBC6dwzH5u3SOFo8FmonUNBwez2IHnPd3bXbSw/exec"; // your Apps Script /exec URL
const ROOT_DRIVE_FOLDER_ID = "1xZb6NpUFa5EZ2Fw7yKeiBw4qBATWVh4s"; // your archive Drive folder

/* Shows a plain browser alert the first time we detect the device itself
   is offline (navigator.onLine === false), before even attempting a
   network call. This is deliberately separate from the on-page error
   banners: those cover the Apps Script being unreachable for other
   reasons (down, mis-deployed, etc.), while this covers "you have no
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

/* Posts one action to the Apps Script Web App and returns the parsed
   response object regardless of its status field (so callers can
   distinguish e.g. 'not_found' from 'wrong_password' from 'ok'), or
   null only when the call itself couldn't be made at all (offline, not
   configured, network/parse failure). */
async function callSheetWebApp(payload) {
  if (!SHEET_WEBAPP_URL) return null;
  if (isOffline()) return null;
  try {
    const res = await fetch(SHEET_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids a CORS preflight against Apps Script
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    return data || null;
  } catch (e) {
    console.warn('Apps Script call failed:', payload.action, e);
    return null;
  }
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
   admins can still paste a folder link by hand from the folder bar.
   Requires a valid admin session token — the script re-checks the
   caller's role against the sheet itself, so this can't be spoofed by
   editing values in the browser. */
async function ensureUniversityFolder(name) {
  if (!session) return;
  const data = await callSheetWebApp({
    action: 'ensureFolder',
    parentId: ROOT_DRIVE_FOLDER_ID,
    name,
    username: session.username,
    token: session.token,
    tokenExpiry: session.tokenExpiry
  });
  if (data && data.status === 'ok' && data.url) {
    FOLDERS[name] = data.url;
    persistFolders();
    render();
  }
}

/* ---------- Session / auth ---------- */
let session = null; // { username, role, name, userId, token, tokenExpiry }

function tryRestoreSession() {
  try {
    const raw = lsGet(LS_SESSION);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.username || !parsed.role) return;
    // A session without a token (or an expired one) can't be used for
    // anything admin-gated server-side, and sign-in itself now always
    // requires re-checking the sheet, so treat an expired token as a
    // signed-out state rather than trusting stale client-only data.
    if (!parsed.token || !parsed.tokenExpiry || Number(parsed.tokenExpiry) < Date.now()) {
      lsRemove(LS_SESSION);
      return;
    }
    session = parsed;
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
  if (!identifier || !p) return;

  if (!SHEET_WEBAPP_URL) {
    errEl.textContent = "Sign-in isn't connected yet — an administrator needs to deploy the Apps Script and add its URL to this file (see the comment at the top of the script).";
    errEl.classList.add('show');
    return;
  }

  setButtonBusy(btn, true, 'Checking…', 'Sign in');
  try {
    const data = await callSheetWebApp({ action: 'login', mode, identifier, password: p });

    if (!data) {
      errEl.textContent = "Couldn't reach the sign-in service — check your connection, or that the Apps Script is deployed and its URL is correct.";
      errEl.classList.add('show');
      return;
    }
    if (data.status === 'not_found') {
      errEl.textContent = mode === 'email'
        ? "No account found with that email ID."
        : "No account found with that mobile number.";
      errEl.classList.add('show');
      return;
    }
    if (data.status === 'wrong_password') {
      errEl.textContent = "Password doesn't match.";
      errEl.classList.add('show');
      return;
    }
    if (data.status !== 'ok') {
      errEl.textContent = data.message || 'Sign-in failed — please try again.';
      errEl.classList.add('show');
      return;
    }

    session = {
      username: data.username,
      role: data.role === 'admin' ? 'admin' : 'user',
      name: data.name || '',
      userId: data.userId || '',
      token: data.token,
      tokenExpiry: data.tokenExpiry
    };
    saveJSON(LS_SESSION, session);
    document.getElementById('loginForm').reset();
    updateLoginModeUI();
    showApp();
  } catch (err) {
    console.error('Sign-in failed:', err);
    errEl.textContent = "Couldn't reach the sign-in service — check your connection, or that the Apps Script is deployed and its URL is correct.";
    errEl.classList.add('show');
  } finally {
    setButtonBusy(btn, false, 'Checking…', 'Sign in');
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
/* Live-preview of what the auto-generated User ID will likely look like,
   so the person sees something concrete as they type. This is only a
   preview — the server (which alone has an authoritative, private view
   of existing IDs) computes and returns the real one at submit time,
   appending a disambiguating suffix if this base turns out to be taken. */
function userIdBase(firstName, lastName, birthDate) {
  const fi = (firstName || '').trim().charAt(0).toUpperCase();
  const li = (lastName || '').trim().charAt(0).toUpperCase();
  const year = birthDate ? birthDate.slice(0, 4) : '';
  if (!fi || !li || year.length !== 4) return '';
  return fi + li + year;
}
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
    // Mobile-number/username uniqueness and the final User ID are all
    // decided server-side now — the browser never sees the sheet's
    // contents to check this itself.
    const data = await callSheetWebApp({
      action: 'signup',
      firstName: values.firstName,
      middleName: values.middleName,
      lastName: values.lastName,
      mobile: values.mobile,
      email: values.email,
      username: values.username,
      password: values.password,
      birthDate: values.birthDate
    });
    if (!data) {
      throw new Error("Couldn't reach the sign-up service — check your connection, or that the Apps Script is deployed and its URL is correct.");
    }
    if (data.status !== 'ok') {
      throw new Error(data.message || 'Sign-up failed — please try again.');
    }

    document.getElementById('suUserId').value = data.userId;
    okEl.textContent = `Account created (User ID ${data.userId}) — you can sign in now.`;
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
   stamped server-side as part of a successful action:'login' call). This
   is a display of the sheet's own data, so there is nothing to persist
   locally — it always reflects the sheet.
   ========================================================================== */
function renderUsersView() {
  if (!isAdmin()) { currentView = 'archive'; updateTabsUI(); render(); return; }

  $crumbs.innerHTML = "";
  const cur = document.createElement('span');
  cur.className = 'crumb-current';
  cur.textContent = "Users";
  $crumbs.appendChild(cur);
  $levelLbl.textContent = "Registered Users";

  $content.innerHTML = `<div class="empty"><strong>Loading users…</strong>Asking the sign-in service for the current list.</div>`;
  loadAndRenderUsers();
}

async function loadAndRenderUsers() {
  const data = await callSheetWebApp({
    action: 'listUsers',
    username: session.username,
    token: session.token,
    tokenExpiry: session.tokenExpiry
  });
  if (currentView !== 'users') return; // user navigated away while this was loading

  if (!data) {
    $content.innerHTML = `<div class="empty"><strong>Couldn't load users</strong>Check your connection, or that the Apps Script is deployed and its URL is correct.</div>`;
    return;
  }
  if (data.status !== 'ok') {
    $content.innerHTML = `<div class="empty"><strong>Couldn't load users</strong>${escapeHtml(data.message || 'Your session may have expired — try signing out and back in.')}</div>`;
    return;
  }
  const users = data.users || [];

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
