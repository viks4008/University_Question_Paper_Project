:root{
  --ink:#1B2430;
  --ink-2:#212B38;
  --ink-3:#293445;
  --line: rgba(237,230,214,0.14);
  --parchment:#EDE6D6;
  --parchment-2:#E3D9BF;
  --accent:#C98A3E;
  --accent-soft: rgba(201,138,62,0.16);
  --brick:#A6503B;
  --brick-soft: rgba(166,80,59,0.18);
  --text-dark:#24211B;
  --text-muted:#5B564A;
  --text-light:#F2EEE3;
  --text-light-muted: rgba(242,238,227,0.62);
  --font-display: Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
  --font-body: 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  --radius: 3px;
}
*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  background:
    radial-gradient(1200px 600px at 8% -10%, rgba(201,138,62,0.10), transparent 55%),
    radial-gradient(900px 500px at 100% 0%, rgba(166,80,59,0.10), transparent 50%),
    var(--ink);
  color:var(--text-light);
  font-family:var(--font-body);
  min-height:100vh;
  display:flex;
  flex-direction:column;
}
a{ color:inherit; }
button{ font-family:inherit; }
input, select{ font-family:inherit; }
::selection{ background:var(--accent-soft); }

/* ---------- Login screen ---------- */
#loginScreen{
  position:relative;
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  overflow:hidden;
  background:
    repeating-linear-gradient(
      to bottom,
      rgba(237,230,214,0.05) 0px,
      rgba(237,230,214,0.05) 1px,
      transparent 1px,
      transparent 30px
    ),
    radial-gradient(1200px 600px at 8% -10%, rgba(201,138,62,0.10), transparent 55%),
    radial-gradient(900px 500px at 100% 0%, rgba(166,80,59,0.10), transparent 50%),
    var(--ink);
}
/* Decorative scattered answer sheets behind the login card */
.examSheet{
  position:absolute;
  width:280px;
  height:370px;
  border-radius:5px;
  background:
    linear-gradient(to right, transparent 0 40px, rgba(166,80,59,0.38) 40px 41px, transparent 41px 100%),
    repeating-linear-gradient(to bottom, transparent 0 26px, rgba(36,33,27,0.09) 26px 27px),
    var(--parchment);
  box-shadow:0 24px 50px -20px rgba(0,0,0,0.65);
  z-index:0;
  pointer-events:none;
}
.examSheet.sheetA{ top:-8%; left:6%; transform:rotate(-11deg); }
.examSheet.sheetB{ bottom:-10%; right:4%; transform:rotate(8deg); }
.examSheet .stamp{
  position:absolute;
  top:38px; right:26px;
  width:74px; height:74px;
  border-radius:50%;
  border:2px dashed rgba(166,80,59,0.55);
  color:rgba(166,80,59,0.6);
  font-family:var(--font-mono);
  font-size:9.5px;
  font-weight:700;
  letter-spacing:.05em;
  text-transform:uppercase;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  transform:rotate(-14deg);
}
@media (max-width:720px){
  .examSheet{ display:none; }
}
.loginCard{
  position:relative;
  z-index:1;
  width:100%;
  max-width:400px;
  max-height:88vh;
  overflow-y:auto;
  background:var(--parchment);
  color:var(--text-dark);
  border-radius:6px;
  padding:32px 30px 28px;
  box-shadow:0 30px 60px -20px rgba(0,0,0,0.6);
}
.loginCard .eyebrow{ color:var(--brick); }
.loginCard h1{
  font-family:var(--font-display);
  font-size:24px;
  margin:0 0 6px;
}
.loginCard p.lead{
  font-size:13.5px;
  color:var(--text-muted);
  margin:0 0 22px;
  line-height:1.5;
}
.field{ margin-bottom:14px; }
.field label{
  display:block;
  font-family:var(--font-mono);
  font-size:11px;
  letter-spacing:.06em;
  text-transform:uppercase;
  color:var(--text-muted);
  margin-bottom:6px;
}
.field input, .field select{
  width:100%;
  padding:10px 12px;
  border-radius:4px;
  border:1px solid rgba(0,0,0,0.18);
  background:#fff;
  color:var(--text-dark);
  font-size:14px;
  outline:none;
}
.field input:focus, .field select:focus{ border-color:var(--brick); }
.pwField{ position:relative; }
.pwField input{ padding-right:40px; }
.pwToggle{
  position:absolute;
  right:4px;
  top:50%;
  transform:translateY(-50%);
  background:none;
  border:none;
  cursor:pointer;
  padding:6px 8px;
  color:var(--text-muted);
  font-size:11px;
  font-family:var(--font-mono);
  letter-spacing:.04em;
  text-transform:uppercase;
}
.pwToggle:hover{ color:var(--text-dark); }
.fieldHint{
  display:block;
  font-size:11px;
  color:var(--text-muted);
  margin-top:5px;
}
.fieldOptional{
  text-transform:none;
  font-weight:400;
  letter-spacing:0;
  color:var(--text-muted);
  font-family:var(--font-body);
  font-size:11px;
}
.radioRow{
  display:flex;
  gap:16px;
  padding:2px 0 2px;
}
.field .radioOpt{
  display:flex;
  align-items:center;
  gap:6px;
  font-family:var(--font-body);
  font-size:13.5px;
  color:var(--text-dark);
  text-transform:none;
  letter-spacing:0;
  cursor:pointer;
}
.radioOpt input[type="radio"]{
  width:auto;
  margin:0;
  accent-color:var(--brick);
  cursor:pointer;
}
.field input[readonly]{
  background:var(--parchment-2);
  color:var(--text-muted);
  cursor:not-allowed;
}
.loginBtn{
  width:100%;
  padding:11px;
  border-radius:4px;
  border:none;
  background:var(--brick);
  color:#fff;
  font-size:14px;
  font-weight:700;
  cursor:pointer;
  transition:background .15s, opacity .15s;
}
.loginBtn:hover{ background:#8B4230; }
.loginBtn:disabled{ opacity:.6; cursor:wait; }
.switchLine{
  text-align:center;
  font-size:12.5px;
  color:var(--text-muted);
  margin:16px 0 0;
}
.linkBtn{
  background:none;
  border:none;
  padding:0;
  color:var(--brick);
  font-weight:700;
  font-size:12.5px;
  cursor:pointer;
  text-decoration:underline;
}
.loginError{
  color:var(--brick);
  font-size:12.5px;
  margin:0 0 14px;
  display:none;
}
.loginError.show{ display:block; }
.loginSuccess{
  color:#4C7A4C;
  font-size:12.5px;
  margin:0 0 14px;
  display:none;
}
.loginSuccess.show{ display:block; }

/* ---------- Header ---------- */
header.top{
  padding: 34px clamp(18px,4vw,56px) 20px;
  border-bottom:1px solid var(--line);
}
.topRow{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
}
.sessionBadge{
  display:flex;
  align-items:center;
  gap:10px;
  font-family:var(--font-mono);
  font-size:12px;
  color:var(--text-light-muted);
  white-space:nowrap;
}
.roleTag{
  padding:3px 9px;
  border-radius:20px;
  font-size:10.5px;
  letter-spacing:.05em;
  text-transform:uppercase;
  font-weight:700;
}
.roleTag.admin{ background:var(--accent-soft); color:var(--accent); }
.roleTag.user{ background:rgba(255,255,255,0.08); color:var(--text-light-muted); }
.signOutBtn{
  background:none;
  border:1px solid var(--line);
  color:var(--text-light-muted);
  padding:5px 12px;
  border-radius:20px;
  font-size:11.5px;
  cursor:pointer;
  transition:color .15s, border-color .15s;
}
.signOutBtn:hover{ color:var(--text-light); border-color:var(--text-light-muted); }

.eyebrow{
  font-family:var(--font-mono);
  font-size:11px;
  letter-spacing:.16em;
  text-transform:uppercase;
  color:var(--accent);
  margin:0 0 10px;
}
h1.title{
  font-family:var(--font-display);
  font-weight:700;
  font-size:clamp(28px,4vw,42px);
  margin:0 0 6px;
  letter-spacing:-0.01em;
}
.subtitle{
  color:var(--text-light-muted);
  font-size:14.5px;
  max-width:640px;
  line-height:1.5;
  margin:0 0 22px;
}

.searchRow{
  display:flex;
  gap:10px;
  align-items:center;
  max-width:560px;
}
.searchBox{
  position:relative;
  flex:1;
}
.searchBox input{
  width:100%;
  background:var(--ink-3);
  border:1px solid var(--line);
  color:var(--text-light);
  padding:11px 14px 11px 38px;
  border-radius:var(--radius);
  font-size:14px;
  font-family:var(--font-body);
  outline:none;
  transition:border-color .15s, background .15s;
}
.searchBox input::placeholder{ color:var(--text-light-muted); }
.searchBox input:focus{ border-color:var(--accent); background:var(--ink-2); }
.searchBox svg{
  position:absolute; left:12px; top:50%; transform:translateY(-50%);
  width:15px; height:15px; opacity:.55; pointer-events:none;
}

/* ---------- Main tabs (admin only: Archive / Users) ---------- */
.mainTabs{
  display:flex;
  gap:6px;
  padding: 18px clamp(18px,4vw,56px) 0;
}
.tabBtn{
  background:none;
  border:1px solid transparent;
  color:var(--text-light-muted);
  padding:8px 16px;
  border-radius:20px;
  font-size:13px;
  font-weight:600;
  cursor:pointer;
  transition:background .15s, color .15s, border-color .15s;
}
.tabBtn:hover{ color:var(--text-light); border-color:var(--line); }
.tabBtn.active{
  background:var(--accent-soft);
  color:var(--accent);
  border-color:rgba(201,138,62,0.45);
}

/* ---------- Users table (admin) ---------- */
.usersToolbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
  margin-bottom:14px;
}
.usersToolbar .count{
  font-family:var(--font-mono);
  font-size:12px;
  color:var(--text-light-muted);
}
.usersTableWrap{
  border:1px solid var(--line);
  border-radius:6px;
  overflow:auto;
}
table.usersTable{
  width:100%;
  border-collapse:collapse;
  font-size:13px;
}
table.usersTable th{
  text-align:left;
  font-family:var(--font-mono);
  font-size:10.5px;
  letter-spacing:.06em;
  text-transform:uppercase;
  color:var(--text-light-muted);
  background:var(--ink-3);
  padding:11px 14px;
  white-space:nowrap;
  border-bottom:1px solid var(--line);
  position:sticky;
  top:0;
}
table.usersTable td{
  padding:11px 14px;
  border-bottom:1px solid var(--line);
  color:var(--text-light);
  white-space:nowrap;
}
table.usersTable tbody tr:last-child td{ border-bottom:none; }
table.usersTable tbody tr:nth-child(even){ background:var(--ink-3); }
table.usersTable tbody tr:hover{ background:rgba(255,255,255,0.05); }
table.usersTable .userRoleTag{
  padding:2px 9px;
  border-radius:20px;
  font-size:10.5px;
  letter-spacing:.05em;
  text-transform:uppercase;
  font-weight:700;
  display:inline-block;
}
table.usersTable .userRoleTag.admin{ background:var(--accent-soft); color:var(--accent); }
table.usersTable .userRoleTag.user{ background:rgba(255,255,255,0.08); color:var(--text-light-muted); }
table.usersTable .muted{ color:var(--text-light-muted); }

/* ---------- Breadcrumb ---------- */
nav.crumbs{
  padding: 16px clamp(18px,4vw,56px) 0;
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:6px;
  font-family:var(--font-mono);
  font-size:12.5px;
  color:var(--text-light-muted);
}
nav.crumbs button{
  background:none; border:none; color:var(--text-light-muted);
  cursor:pointer; padding:4px 2px; font-family:var(--font-mono); font-size:12.5px;
  border-bottom:1px solid transparent;
  transition:color .15s, border-color .15s;
}
nav.crumbs button:hover{ color:var(--accent); border-color:var(--accent); }
nav.crumbs .crumb-current{ color:var(--parchment); }
nav.crumbs .sep{ opacity:.4; }

/* ---------- Main ---------- */
main{
  flex:1;
  padding: 22px clamp(18px,4vw,56px) 60px;
}
.levelBar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin: 6px 0 16px;
  flex-wrap:wrap;
}
.levelLabel{
  font-family:var(--font-mono);
  font-size:11px;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:var(--text-light-muted);
}
.addBtn{
  background:var(--accent-soft);
  color:var(--accent);
  border:1px solid rgba(201,138,62,0.45);
  padding:8px 16px;
  border-radius:20px;
  font-size:12.5px;
  font-weight:700;
  cursor:pointer;
  transition:background .15s, color .15s;
  white-space:nowrap;
}
.addBtn:hover{ background:var(--accent); color:#1B2430; }

/* ---------- Folder link bar (term view) ---------- */
.folderBar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
  background:var(--ink-2);
  border:1px solid var(--line);
  border-radius:6px;
  padding:12px 16px;
  margin-bottom:16px;
}
.folderBar .info{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.folderBar .label{
  font-family:var(--font-mono);
  font-size:10.5px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:var(--text-light-muted);
}
.folderBar .value{
  font-size:13px;
  color:var(--text-light);
}
.folderBar .actions{ display:flex; gap:8px; }
.folderBtn{
  background:rgba(255,255,255,0.06);
  color:var(--text-light);
  border:1px solid var(--line);
  padding:7px 13px;
  border-radius:20px;
  font-size:12px;
  cursor:pointer;
  text-decoration:none;
  display:inline-flex;
  align-items:center;
  gap:6px;
}
.folderBtn:hover{ background:rgba(255,255,255,0.12); }

/* ---------- Catalog card grid (Uni / Branch / Year / Term) ---------- */
.grid{
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap:16px;
}
.card{
  position:relative;
  background: var(--parchment);
  color:var(--text-dark);
  border-radius: 5px;
  overflow:hidden;
  padding: 20px 18px 16px;
  text-align:left;
  cursor:pointer;
  border:none;
  box-shadow: 0 1px 0 rgba(0,0,0,0.25), 0 10px 20px -14px rgba(0,0,0,0.6);
  transition: transform .14s ease, box-shadow .14s ease;
  font-family:var(--font-body);
  display:flex;
  flex-direction:column;
  gap:10px;
  min-height:104px;
  width:100%;
}
.card::before{
  /* punched hole, card-catalog signature */
  content:"";
  position:absolute;
  top:12px; left:12px;
  width:8px; height:8px;
  border-radius:50%;
  background: var(--ink);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
}
.card::after{
  /* torn/tab corner */
  content:"";
  position:absolute;
  top:0; right:0;
  width:0; height:0;
  border-style:solid;
  border-width:0 22px 22px 0;
  border-color: transparent var(--parchment-2) transparent transparent;
}
.card:hover{
  transform: translateY(-3px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.25), 0 18px 30px -16px rgba(0,0,0,0.75);
}
.card:focus-visible{
  outline:2px solid var(--accent);
  outline-offset:2px;
}
.card .cardName{
  font-family:var(--font-display);
  font-weight:700;
  font-size:17px;
  line-height:1.25;
  padding-left:16px;
  margin-top:2px;
}
.card .cardMeta{
  font-family:var(--font-mono);
  font-size:11px;
  letter-spacing:.04em;
  color:var(--text-muted);
  padding-left:16px;
  text-transform:uppercase;
}
.cardLogo{
  width:44px; height:44px;
  margin-left:14px;
  border-radius:50%;
  overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  background:var(--parchment-2);
  border:1px solid rgba(0,0,0,0.08);
  flex-shrink:0;
}
.cardLogo img{
  width:100%; height:100%;
  object-fit:contain;
  padding:5px;
  background:#fff;
}
.cardLogo--fallback{
  font-family:var(--font-display);
  font-weight:700;
  font-size:15px;
  color:var(--brick);
  background:var(--accent-soft);
}
.cardAdminRow{
  position:absolute;
  top:8px; right:8px;
  display:flex;
  gap:6px;
  z-index:2;
}
.cardAdminBtn{
  width:24px; height:24px;
  border-radius:50%;
  border:1px solid rgba(0,0,0,0.15);
  background:rgba(255,255,255,0.85);
  color:var(--text-dark);
  font-size:12px;
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  padding:0;
}
.cardAdminBtn:hover{ background:#fff; }
.cardAdminBtn.danger:hover{ background:var(--brick); color:#fff; }

.addCard{
  background:transparent;
  border:1.5px dashed var(--line);
  color:var(--text-light-muted);
  border-radius:5px;
  min-height:104px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  cursor:pointer;
  font-size:13.5px;
  font-weight:600;
  transition:border-color .15s, color .15s, background .15s;
}
.addCard:hover{ border-color:var(--accent); color:var(--accent); background:rgba(201,138,62,0.05); }
.addCard .plus{ font-size:18px; line-height:1; }

/* ---------- Paper list (final level) ---------- */
.paperList{
  display:flex;
  flex-direction:column;
  border:1px solid var(--line);
  border-radius:6px;
  overflow:hidden;
}
.paperRow{
  display:grid;
  grid-template-columns: 1fr auto auto auto;
  gap:18px;
  align-items:center;
  padding:14px 18px;
  background:var(--ink-2);
  border-bottom:1px solid var(--line);
}
.paperRow:last-child{ border-bottom:none; }
.paperRow:nth-child(even){ background:var(--ink-3); }
.paperRow.isAdmin{ grid-template-columns: 1fr auto auto auto auto auto; }
.paperTitle{
  font-size:14.5px;
  font-weight:600;
  color:var(--text-light);
}
.paperCode{
  font-family:var(--font-mono);
  font-size:11.5px;
  color:var(--text-light-muted);
  background:rgba(255,255,255,0.04);
  padding:3px 8px;
  border-radius:20px;
  border:1px solid var(--line);
  white-space:nowrap;
}
.paperDate{
  font-family:var(--font-mono);
  font-size:12px;
  color:var(--text-light-muted);
  white-space:nowrap;
}
.viewBtn{
  background:var(--brick-soft);
  color:#F0C9BE;
  border:1px solid rgba(166,80,59,0.5);
  padding:7px 14px;
  border-radius:20px;
  font-size:12.5px;
  font-weight:600;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:6px;
  transition:background .15s, color .15s;
  white-space:nowrap;
}
.viewBtn:hover{ background:var(--brick); color:#fff; }
.rowIconBtn{
  width:28px; height:28px;
  border-radius:50%;
  border:1px solid var(--line);
  background:transparent;
  color:var(--text-light-muted);
  cursor:pointer;
  font-size:12px;
  display:flex; align-items:center; justify-content:center;
}
.rowIconBtn:hover{ color:var(--text-light); border-color:var(--text-light-muted); }
.rowIconBtn.danger:hover{ color:#fff; background:var(--brick); border-color:var(--brick); }

/* ---------- Search results (flat) ---------- */
.resultRow{
  display:flex;
  flex-direction:column;
  gap:4px;
  padding:14px 18px;
  background:var(--ink-2);
  border-bottom:1px solid var(--line);
  cursor:pointer;
  transition:background .12s;
}
.resultRow:hover{ background:var(--ink-3); }
.resultRow:last-child{ border-bottom:none; }
.resultPath{
  font-family:var(--font-mono);
  font-size:11px;
  color:var(--accent);
  text-transform:uppercase;
  letter-spacing:.04em;
}
.resultTitle{ font-size:14.5px; font-weight:600; }

/* ---------- Empty state ---------- */
.empty{
  border:1px dashed var(--line);
  border-radius:6px;
  padding:44px 24px;
  text-align:center;
  color:var(--text-light-muted);
}
.empty strong{ color:var(--parchment); display:block; margin-bottom:6px; font-family:var(--font-display); font-size:17px; }
.empty code{
  font-family:var(--font-mono);
  background:rgba(255,255,255,0.06);
  padding:2px 6px;
  border-radius:3px;
  font-size:12px;
}

/* ---------- Overlays (viewer + form modal) ---------- */
.overlay{
  position:fixed; inset:0;
  background:rgba(15,19,26,0.78);
  backdrop-filter: blur(2px);
  display:none;
  align-items:center;
  justify-content:center;
  z-index:50;
  padding: 24px;
}
.overlay.open{ display:flex; }
.viewerPanel{
  background:var(--parchment);
  color:var(--text-dark);
  width:min(920px, 100%);
  height:min(88vh, 900px);
  border-radius:6px;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  box-shadow:0 30px 60px -20px rgba(0,0,0,0.7);
}
.viewerHead{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:16px;
  padding:16px 20px;
  border-bottom:1px solid rgba(0,0,0,0.12);
  background:var(--parchment-2);
}
.viewerHead h3{
  font-family:var(--font-display);
  margin:0 0 4px;
  font-size:18px;
}
.viewerHead .meta{
  font-family:var(--font-mono);
  font-size:11.5px;
  color:var(--text-muted);
  text-transform:uppercase;
}
.closeBtn{
  background:none;
  border:1px solid rgba(0,0,0,0.2);
  color:var(--text-dark);
  width:30px; height:30px;
  border-radius:50%;
  cursor:pointer;
  font-size:16px;
  line-height:1;
  flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
}
.closeBtn:hover{ background:rgba(0,0,0,0.08); }
.viewerBody{ flex:1; background:#3a3a3a; }
.viewerBody iframe{ width:100%; height:100%; border:none; }
.viewerBody .noFile{
  height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:10px;
  color:#cfcfcf;
  text-align:center;
  padding:30px;
  background:var(--parchment);
}
.viewerBody .noFile strong{ color:var(--text-dark); font-family:var(--font-display); font-size:16px; }
.viewerBody .noFile p{ color:var(--text-muted); font-size:13px; max-width:420px; line-height:1.6; margin:0; }
.viewerBody .noFile code{ font-family:var(--font-mono); background:rgba(0,0,0,0.06); padding:2px 6px; border-radius:3px; }

.formPanel{
  background:var(--parchment);
  color:var(--text-dark);
  width:min(440px, 100%);
  border-radius:6px;
  overflow:hidden;
  box-shadow:0 30px 60px -20px rgba(0,0,0,0.7);
}
.formPanel .viewerHead{ background:var(--parchment-2); }
.formBody{ padding:20px; }
.formActions{
  display:flex;
  justify-content:flex-end;
  gap:10px;
  padding:14px 20px;
  border-top:1px solid rgba(0,0,0,0.1);
}
.btnGhost{
  background:none;
  border:1px solid rgba(0,0,0,0.2);
  color:var(--text-dark);
  padding:9px 16px;
  border-radius:20px;
  font-size:13px;
  font-weight:600;
  cursor:pointer;
}
.btnGhost:hover{ background:rgba(0,0,0,0.05); }
.btnPrimary{
  background:var(--brick);
  border:1px solid var(--brick);
  color:#fff;
  padding:9px 18px;
  border-radius:20px;
  font-size:13px;
  font-weight:700;
  cursor:pointer;
}
.btnPrimary:hover{ background:#8B4230; }

footer.foot{
  padding: 16px clamp(18px,4vw,56px) 28px;
  font-family:var(--font-mono);
  font-size:11px;
  color: var(--text-light-muted);
  border-top:1px solid var(--line);
}

@media (max-width:520px){
  .paperRow{ grid-template-columns: 1fr; row-gap:8px; }
  .paperRow.isAdmin{ grid-template-columns: 1fr; }
  .paperCode, .paperDate{ justify-self:start; }
  .topRow{ flex-direction:column; }
}
