# Question Paper Archive — Changelog & Setup

This README documents everything that changed from the original single-file
version of the app, and what you need to do (if anything) to have it fully
working.

---

## 1. Folder structure

The app was split out of one `.html` file into this layout:

```
University_Question_Paper_Project/
├── index.html         # redirects straight into html/main.html
├── html/
│   └── main.html        # the actual application
├── css/
│   └── style.css         # all styles (was index.css)
└── js/
    └── script.js          # all app logic (was index.js)
```

Keep the four files in this exact relative arrangement — `main.html` loads
its CSS/JS via `../css/style.css` and `../js/script.js`, so moving files
around without keeping their relative paths will break the app.

Open `index.html` (or `html/main.html` directly) in a browser to run it.

---

## 2. Login credentials — no longer hardcoded

**Before:** sign-in checked a hardcoded username/password in the code.

**Now:** every sign-in reads live from your Google Sheet, **"Login
Credentials QPapers"**, via its public gviz JSON feed:

- The feed is fetched by the sheet's **gid** (`gid=0`), not by tab name —
  so it keeps working even if you rename the "Sheet1" tab later.
- Sheet columns used: `User Id | Name | Mobile Number | User Name |
  Password | Role | Recent Login DateTime`.
- A row's `Role` column decides access: anything starting with "admin"
  signs the person in as an administrator; everything else (including
  blank) signs them in as a student.
- The sheet must stay shared as **"Anyone with the link → Viewer"** for
  the feed to be readable.

No credentials live in the code anymore — `js/script.js` only stores the
sheet's ID and gid (`SHEET_ID`, `SHEET_GID`), both of which are just
public identifiers, not secrets.

---

## 3. Optional Apps Script Web App

Three features need write access to the sheet/Drive, which a public share
link can't do on its own. A small Google Apps Script Web App
(`SHEET_WEBAPP_URL` in `js/script.js`) adds these, all optional and
non-breaking:

| Feature | What it does | Without the Web App |
|---|---|---|
| **Sign-up** | Appends a new row to the sheet for self-registered students (birth date goes to a new column **H**, so it doesn't collide with column G). | Sign-up form shows a "not connected yet" message. |
| **Last-login stamping** | Writes the current date/time into column **G ("Recent Login DateTime")** every time that user signs in. | Column G is simply never updated. |
| **Drive folder provisioning** | Auto-creates (or reuses) a same-named subfolder inside your archive Drive folder whenever an admin adds a new university. | Admins can still paste a folder link by hand from the "Add folder link" button — nothing auto-creates. |

The full Apps Script code and step-by-step deploy instructions are in the
comment block at the top of `js/script.js`. In short:

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Paste in the script from the comment block.
3. **Deploy → New deployment → Web app** → Execute as *Me* → Who has
   access *Anyone*.
4. Copy the resulting `/exec` URL into `SHEET_WEBAPP_URL` near the top of
   `js/script.js`.
5. The first deploy will prompt you to authorize Drive + Sheets access —
   that's expected, it's what lets the script create folders and write
   rows on your behalf.

Sign-in works immediately with **no** Apps Script setup — only sign-up,
last-login stamping, and automatic folder creation depend on it.

---

## 4. University-wise Google Drive folders

- `ROOT_DRIVE_FOLDER_ID` in `js/script.js` points at your shared archive
  Drive folder.
- When an admin adds a new university, the app calls the Apps Script Web
  App to create (or reuse) a same-named subfolder inside that root
  folder, and links it automatically.
- Right after entering a university, a **"University Drive folder"** bar
  shows the linked folder with an **Open folder** link, and (for admins)
  a **Create in Drive** / **Change link** button.
- The existing per-term **"Course Drive folder"** links still work the
  same way as before, unchanged.

---

## 5. Admin "Users" tab

- Admin accounts now see a small tab bar under the header: **Archive** /
  **Users**. Students never see it.
- The **Users** tab reads live from the login sheet and lists every
  registered user in a table: **User Id, Name, Mobile Number, User Name,
  Role, Recent Login DateTime**.
- A **Refresh** button re-pulls the latest rows from the sheet.
- This table is a live view of the sheet — there's nothing to save
  locally, so it can't drift out of sync with the sheet itself.
- Users who have never signed in show "Never signed in" instead of a
  blank last-login cell.

---

## 7. Sign-up form validation & auto-generated User ID

- **Mobile number must be unique.** Sign-up checks the sheet's `Mobile
  Number` column and rejects the submission ("That mobile number is
  already registered.") if it's already taken.
- **Email ID field added.** A new required "Email ID" field was added to
  the form (and a new `Email ID` column, **I**, in the sheet). Unlike
  mobile numbers, email addresses are **not** required to be unique —
  multiple accounts may share the same email.
- **User ID is generated automatically**, not typed in. It's built from
  the first letter of the first name, the first letter of the surname,
  and the birth year (e.g. "Aditi Rao Sharma", born 2005 → `AS2005`). If
  that combination is already taken, a `-2`, `-3`, … suffix is appended
  until it's unique. The generated ID previews live in a read-only field
  as the person fills in their name and birth date, and the final,
  disambiguated ID is only settled right before the account is created.
- **Full name is split into three fields:** First name and Surname are
  required; Middle name is optional. They're joined together (skipping a
  blank middle name) into the sheet's single `Name` column.

## 8. Sign-in form: mobile / email instead of username

- The "Username" field was replaced with a radio choice — **Mobile
  number** or **Email ID** — plus one input field that switches its type,
  placeholder and label to match whichever is selected.
- Error messages are now specific about what went wrong:
  - No matching account for that mobile number / email → *"No account
    found with that mobile number."* or *"No account found with that
    email ID."*
  - Account found but the password is wrong → *"Password doesn't
    match."*
  - Sheet unreachable → the existing connection-error message.

## 9. Sheet columns — updated

The sheet now needs headers through column **I**:

```
A User Id | B Name | C Mobile Number | D User Name | E Password
| F Role | G Recent Login DateTime | H Birth Date | I Email ID
```

Add **Birth Date** (H) and **Email ID** (I) as column headers in the
sheet if they aren't there already — sign-up writes to them by position,
and the admin Users table reads Email ID by its header label. The Apps
Script's `handleSignup` function was updated to write the email into
column I (see the comment block at the top of `js/script.js` for the
full script). The admin **Users** tab now also shows an **Email ID**
column alongside the existing ones.

---

## 10. Nothing else changed

The browsing hierarchy (University → Branch → Year → Term → Papers),
paper add/edit/delete, search, the PDF viewer, admin Users tab, Drive
folder provisioning, and local-storage-backed archive data all behave
exactly as before — only the sign-up/sign-in forms and validation
described above are new.

## 11. Bug fixes: header-based sheet writes, offline detection

Three issues were reported and fixed:

**a) Sign-up's Email ID wasn't being saved / sign-in showed "Couldn't
reach the login sheet."**
The Apps Script was writing new sign-up rows by fixed column *position*
(A, B, C…), but the actual sheet has `Email ID` in column D rather than
where the script assumed. That mismatch shifted every value one column
over, so Email ID, Password, Role, etc. all landed in the wrong cells.

**Fix:** the Apps Script (see the comment block at the top of
`js/script.js`) now looks up every column **by its header text**
(`headerMap_()`), not by position — so it works correctly no matter what
order your columns are in, including your current layout with `Email ID`
in column D. This matches how the read side (the gviz feed) already
worked.

**⚠️ You must update your live Apps Script,** not just this file — copy
the new script from the comment block into Extensions → Apps Script on
the sheet, replacing the old code, then **Deploy → Manage deployments →
Edit → Version: New version → Deploy**. Editing this project's files
doesn't change code that's already deployed on Google's side.

**b) "Recent Login DateTime" wasn't updating for new users.**
Same root cause as (a) — `handleUpdateLastLogin` was hardcoded to write
to column G, but in your sheet, `Recent Login DateTime` is column H. Now
fixed by the same header-lookup change; redeploying the Apps Script (as
above) resolves this too.

**c) No warning when the device has no internet connection.**
Sign-in, sign-up, the Users tab, and Drive folder actions all funnel
through two functions (`fetchSheetUsers()` and `callSheetWebApp()`).
Both now check `navigator.onLine` before attempting a network call, and
show a plain `alert("Check your internet connection.")` if the device is
offline — instead of a fetch simply failing with a generic error. This
is separate from (and in addition to) the existing on-page message for
when the sheet itself can't be reached for other reasons.
