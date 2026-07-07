/* ============================================================
   HOME COMPUTER — app.js
   Full application logic for the QBCore home computer NUI
   ============================================================ */

'use strict';

// ─── FiveM NUI message listener ───────────────────────────────────────────────
window.addEventListener('message', function(e) {
  const data = e.data;
  if (!data) return;

  if (data.action) {
    switch (data.action) {
      case 'openComputer':
        if (data.playerData) {
          playerData = data.playerData;
          updateHomeSystemInfo();
        }
        bootAndOpen(data.note || '');
        break;
      case 'closeComputer':
        shutdownUI();
        break;
      case 'addTvChannel':
        handleNetworkAddTvChannel(data.channel);
        break;
      case 'deleteTvChannel':
        handleNetworkDeleteTvChannel(data.channelId);
        break;
      case 'sendNotification':
        if (data.title && data.content) {
          showNotification(data.title, data.subtitle || 'System Alert', data.content, data.category || 'news', data.icon || '🔔');
        }
        break;
      case 'radioSetFrequency':
      case 'radioSetChannels':
      case 'radioSetTalkers':
        handleRadioMessage(data);
        break;
      case 'receivePlayerData':
        if (data.data) {
          playerData = data.data;
          updateHomeSystemInfo();
        }
        break;
      case 'receiveDrugOrder':
        receiveDrugOrderUI(data.order);
        break;
      case 'setDealingStatus':
        setDealingStatusUI(data.active);
        break;
    }
  }

  if (data.type) {
    handleGlitchMessage(data);
  }
});

// ─── FIVEM FETCH HELPER ───────────────────────────────────────────────────────
function nuiFetch(event, data) {
  const resourceName = typeof GetParentResourceName !== 'undefined' ? GetParentResourceName() : 'home_computer';
  return fetch(`https://${resourceName}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  }).then(res => res.json().catch(() => null));
}

// Detect if we're in FiveM or standalone preview
const IN_FIVEM = typeof GetParentResourceName !== 'undefined';

// ─── BOOT & SHUTDOWN ──────────────────────────────────────────────────────────
let booted = false;

function bootAndOpen(savedNote) {
  // Re-enable pointer events so the UI is interactive
  document.body.style.pointerEvents = 'auto';
  document.body.style.display = '';
  
  // Apply saved wallpaper on boot
  const savedWP = localStorage.getItem('homepc_wallpaper');
  if (savedWP) {
    const d = document.getElementById('desktop');
    if (d) {
      d.style.background = '';
      d.style.background = savedWP;
      if (savedWP.startsWith('url(')) {
        d.style.backgroundSize = 'cover';
        d.style.backgroundPosition = 'center';
        d.style.backgroundRepeat = 'no-repeat';
      } else {
        d.style.backgroundSize = '';
        d.style.backgroundPosition = '';
        d.style.backgroundRepeat = '';
      }
    }
  }
  
  // Apply saved transparency settings on boot
  const transVal = localStorage.getItem('homepc_transparency') !== 'false';
  document.body.classList.toggle('no-transparency', !transVal);

  if (booted) {
    // Already booted, just restore desktop
    document.getElementById('desktop').style.display = '';
    document.getElementById('taskbar').style.display  = 'flex';
    if (savedNote) document.getElementById('notepad-text').value = savedNote;
    return;
  }
  booted = true;
  if (savedNote) document.getElementById('notepad-text').value = savedNote;

  const boot = document.getElementById('boot');
  boot.style.display = 'flex';
  setTimeout(() => {
    boot.classList.add('done');
    setTimeout(() => {
      boot.remove();
      document.getElementById('desktop').style.display = '';
      document.getElementById('taskbar').style.display  = 'flex';
    }, 650);
  }, 2600);
}

function shutdownUI() {
  // Disable pointer events FIRST — prevents any further input stealing
  document.body.style.pointerEvents = 'none';
  // Close all apps
  openApps.forEach(id => closeApp(id));
  document.getElementById('desktop').style.display = 'none';
  document.getElementById('taskbar').style.display  = 'none';
  document.body.style.display = 'none';
}

function closeComputer() {
  if (IN_FIVEM) {
    // Disable pointer events immediately — don't wait for the Lua round-trip
    document.body.style.pointerEvents = 'none';
    nuiFetch('closeComputer', {});
  } else {
    shutdownUI();
  }
}

// Auto-boot in standalone preview (not FiveM)
if (!IN_FIVEM) {
  document.addEventListener('DOMContentLoaded', () => {
    bootAndOpen(localStorage.getItem('homepc_note') || '');
  });
}

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function updateClock() {
  const now   = new Date();
  const h     = now.getHours().toString().padStart(2, '0');
  const m     = now.getMinutes().toString().padStart(2, '0');
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const mons  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('clock-time').textContent = `${h}:${m}`;
  document.getElementById('clock-date').textContent =
    `${days[now.getDay()]}, ${mons[now.getMonth()]} ${now.getDate()}`;
}
updateClock();
setInterval(updateClock, 1000);

// ─── WINDOW MANAGEMENT ────────────────────────────────────────────────────────
const openApps = new Set();
let zTop    = 1100;
let maxWins = {};

const appMeta = {
  browser:     { icon: '🌐', label: 'Browser' },
  notepad:     { icon: '📝', label: 'Notepad' },
  explorer:    { icon: '📁', label: 'Files' },
  calc:        { icon: '🧮', label: 'Calculator' },
  taskmgr:     { icon: '📊', label: 'Task Mgr' },
  minesweeper: { icon: '💣', label: 'Minesweeper' },
  settings:    { icon: '⚙️', label: 'Settings' },
  glitch:      { icon: '🔮', label: 'Glitch' },
  livetv:      { icon: '📺', label: 'Live TV' },
  radio:       { icon: '📻', label: 'Radio' },
  silkstreet:  { icon: '👤', label: 'Silk Street' },
  lstrader:    { icon: '📈', label: 'LS Trader' },
  directorder: { icon: '🚚', label: 'Direct Order' },
      edibles:     { icon: '??', label: 'Edibles Kitchen' },
    drone:       { icon: '??', label: 'Drone Pilot' },
    arena:       { icon: '???', label: 'Arena War' },
  cloner:      { icon: '??', label: 'Card Cloner' },
  printer:     { icon: '??', label: 'Check Forge' },
  jobboard:    { icon: '??', label: 'Job Board' },
  warstock:    { icon: '🚗', label: 'Warstock' },
  business:    { icon: '💼', label: 'SecuroServ' },
  blackmarket: { icon: '🔫', label: 'Black Market' },
};

// ─── FOLDER MANAGEMENT ──────────────────────────────────────────────────────
function openFolder(folderId) {
  const w = document.getElementById('win-folder-' + folderId);
  if (!w) return;
  w.classList.add('open');
  zTop++;
  w.style.zIndex = zTop;
  closeStart();
}

function closeFolder(folderId) {
  const w = document.getElementById('win-folder-' + folderId);
  if (w) w.classList.remove('open');
}

// ─── DESKTOP WIDGETS ─────────────────────────────────────────────────────────
let widgetInterval = null;
let simCpu = 22;
let simRam = 58;
let simBat = 87;

function initWidgets() {
  updateWidgetClock();
  widgetInterval = setInterval(() => {
    updateWidgetClock();
    updateWidgetCPU();
    updateWidgetRAM();
    updateWidgetBattery();
    updateWidgetNetwork();
  }, 2000);
}

function updateWidgetClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const el = document.getElementById('w-clock-time');
  const el2 = document.getElementById('w-clock-date');
  if (el) el.textContent = h + ':' + m;
  if (el2) el2.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
}

function updateWidgetCPU() {
  simCpu += Math.floor(Math.random() * 15) - 7;
  simCpu = Math.max(5, Math.min(95, simCpu));
  const el = document.getElementById('w-cpu-bar');
  const val = document.getElementById('w-cpu-val');
  if (el) el.style.width = simCpu + '%';
  if (val) val.textContent = simCpu + '%';
}

function updateWidgetRAM() {
  simRam += Math.floor(Math.random() * 6) - 3;
  simRam = Math.max(30, Math.min(85, simRam));
  const el = document.getElementById('w-ram-bar');
  const val = document.getElementById('w-ram-val');
  if (el) el.style.width = simRam + '%';
  if (val) val.textContent = simRam + '%';
}

function updateWidgetBattery() {
  simBat = Math.max(10, simBat - (Math.random() > 0.7 ? 1 : 0));
  const el = document.getElementById('w-bat-bar');
  const val = document.getElementById('w-bat-val');
  if (el) {
    el.style.width = simBat + '%';
    if (simBat < 20) el.style.background = '#e74c3c';
    else if (simBat < 50) el.style.background = '#f39c12';
    else el.style.background = '#27ae60';
  }
  if (val) val.textContent = Math.round(simBat) + '%';
}

function updateWidgetNetwork() {
  const up = (Math.random() * 120 + 5).toFixed(1);
  const down = (Math.random() * 850 + 20).toFixed(1);
  const elUp = document.getElementById('w-net-up');
  const elDown = document.getElementById('w-net-down');
  if (elUp) elUp.textContent = up + ' KB/s';
  if (elDown) elDown.textContent = down + ' KB/s';
}

function updateVolIcon(val) {
  const pct = document.getElementById('w-vol-pct');
  const icon = document.getElementById('w-vol-icon');
  if (pct) pct.textContent = val + '%';
  if (icon) {
    if (val == 0) icon.textContent = '🔇';
    else if (val < 33) icon.textContent = '🔈';
    else if (val < 66) icon.textContent = '🔉';
    else icon.textContent = '🔊';
  }
}

// Start widgets when desktop is shown
const _origBootAndOpen = typeof bootAndOpen === 'function' ? bootAndOpen : null;
document.addEventListener('DOMContentLoaded', () => {
  // Fallback: start widgets after a delay if bootAndOpen isn't available
  setTimeout(() => { if (!widgetInterval) initWidgets(); }, 2000);
});

function focusWin(id) {
  document.querySelectorAll('.win').forEach(w => w.classList.remove('focused'));
  const w = document.getElementById('win-' + id);
  if (w) { zTop++; w.style.zIndex = zTop; w.classList.add('focused'); }
}

function openApp(id) {
  const w = document.getElementById('win-' + id);
  if (!w) return;
  if (!openApps.has(id)) {
    openApps.add(id);
    w.classList.add('show');
    onAppOpen(id);
    addTbApp(id);
  } else {
    w.classList.add('show');
  }
  focusWin(id);
  updateTb();
  closeStart();
}

function closeApp(id) {
  const w = document.getElementById('win-' + id);
  if (!w) return;
  w.classList.remove('show');
  openApps.delete(id);
  removeTbApp(id);
  updateTb();
  onAppClose(id);
}

function minimizeWin(id) {
  const w = document.getElementById('win-' + id);
  if (!w) return;
  const isShowing = w.classList.contains('show');
  if (isShowing) { w.classList.remove('show'); }
  else           { w.classList.add('show'); focusWin(id); }
  updateTb();
}

function maximizeWin(winId) {
  const w = document.getElementById(winId);
  if (!w) return;
  if (maxWins[winId]) {
    w.style.cssText = maxWins[winId];
    delete maxWins[winId];
  } else {
    maxWins[winId] = w.style.cssText;
    Object.assign(w.style, {
      top: '0', left: '0', width: '100vw',
      height: 'calc(100vh - var(--taskbar-h))',
      borderRadius: '0'
    });
  }
}

function refreshDesktop() {
  // Subtle flash effect
  const d = document.getElementById('desktop');
  d.style.opacity = '0.5';
  setTimeout(() => { d.style.opacity = '1'; }, 300);
}

// ─── TASKBAR APPS ─────────────────────────────────────────────────────────────
function addTbApp(id) {
  const meta = appMeta[id]; if (!meta) return;
  const el   = document.createElement('div');
  el.className = 'tb-app'; el.id = 'tb-' + id;
  el.innerHTML = `<span class="t-icon">${meta.icon}</span>${meta.label}`;
  el.onclick   = () => minimizeWin(id);
  document.getElementById('tb-apps').appendChild(el);
}
function removeTbApp(id) {
  const el = document.getElementById('tb-' + id);
  if (el) el.remove();
}
function updateTb() {
  openApps.forEach(id => {
    const btn = document.getElementById('tb-' + id);
    const win = document.getElementById('win-' + id);
    if (btn && win) btn.classList.toggle('active', win.classList.contains('show'));
  });
}

// ─── DRAG ─────────────────────────────────────────────────────────────────────
let drag = null;

function startDrag(e, winId) {
  const w = document.getElementById(winId);
  focusWin(winId.replace('win-', ''));
  if (!w || e.target.closest('.win-ctrls')) return;
  const rect = w.getBoundingClientRect();
  drag = { win: w, ox: e.clientX - rect.left, oy: e.clientY - rect.top };

  document.onmousemove = ev => {
    if (!drag) return;
    let x = ev.clientX - drag.ox;
    let y = ev.clientY - drag.oy;
    x = Math.max(0, Math.min(window.innerWidth  - drag.win.offsetWidth,  x));
    y = Math.max(0, Math.min(window.innerHeight - 44 - drag.win.offsetHeight, y));
    drag.win.style.left = x + 'px';
    drag.win.style.top  = y + 'px';
  };
  document.onmouseup = () => {
    drag = null;
    document.onmousemove = null;
    document.onmouseup   = null;
  };
}

// ─── START MENU ───────────────────────────────────────────────────────────────
let startOpen = false;

function toggleStart() {
  startOpen = !startOpen;
  document.getElementById('start-menu').classList.toggle('open', startOpen);
}
function closeStart() {
  startOpen = false;
  document.getElementById('start-menu').classList.remove('open');
}
function filterApps(q) {
  q = q.toLowerCase();
  document.querySelectorAll('#sm-grid .sm-item').forEach(item => {
    const name = item.querySelector('span').textContent.toLowerCase();
    item.style.display = name.includes(q) ? '' : 'none';
  });
}

// Close start on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('#start-menu') && !e.target.closest('#start-btn')) closeStart();
});

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────────
document.addEventListener('contextmenu', e => {
  if (e.target.closest('.win')) return; // don't hijack inside windows
  e.preventDefault();
  const m  = document.getElementById('ctx-menu');
  m.style.left = Math.min(e.clientX, window.innerWidth  - 180) + 'px';
  m.style.top  = Math.min(e.clientY, window.innerHeight - 170) + 'px';
  m.classList.add('show');
});
document.addEventListener('click', () => closeCtx());
function closeCtx() {
  document.getElementById('ctx-menu').classList.remove('show');
}

// ─── ESC KEY ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeStart(); closeCtx();
    if (IN_FIVEM) closeComputer();
  }
});

// ─── APP OPEN / CLOSE HOOKS ───────────────────────────────────────────────────
function onAppOpen(id) {
  if (id === 'browser')     initBrowser();
  if (id === 'explorer')    feNav('documents');
  if (id === 'calc')        calcClear();
  if (id === 'taskmgr')     initTaskMgr();
  if (id === 'minesweeper') msInit();
  if (id === 'settings')    initSettings('personalization');
  if (id === 'notepad')     updateNotepadStatus();
  if (id === 'glitch')      initGlitch();
  if (id === 'livetv')      initLiveTV();
    if (id === 'cctv')        initCctv();
  if (id === 'jobboard')    if(typeof initJobBoard === 'function') initJobBoard();
  if (id === 'warstock')    if(typeof initWarstock === 'function') initWarstock();
  if (id === 'business')    if(typeof initBusinessHub === 'function') initBusinessHub();
  if (id === 'uno')         initUnoApp();
  if (id === 'picchat')     initPicchatApp();
  if (id === 'radio')       initRadioApp();
  if (id === 'silkstreet')  initSilkStreet();
  if (id === 'lstrader')    initLsTrader();
  if (id === 'directorder') initDirectOrder();
  if (id === 'edibles')     initEdibles();
  if (id === 'hackz')       initHackz();
  if (id === 'troll')       initTrollApp();
  if (id === 'blackmarket') initBlackMarket();
}
function onAppClose(id) {
  if (id === 'taskmgr') stopTaskMgr();
  if (id === 'minesweeper') msDestroy();
  if (id === 'glitch')      closeGlitch();
  if (id === 'livetv')      closeLiveTV();
  if (id === 'cctv')        closeCctv();
  if (id === 'uno')         closeUnoApp();
  if (id === 'picchat')     closePicchatApp();
  if (id === 'radio')       closeRadioApp();
  if (id === 'lstrader')    closeLsTrader();
}

// ─── BROWSER ──────────────────────────────────────────────────────────────────
let brTab = 'news';

const brPages = {
  news: () => `
    <div class="page-hero">
      <h1>📰 Los Santos City News</h1>
      <p>Your trusted source for local events, crime reports, and city updates.</p>
    </div>
    <div class="news-grid">
      <div class="news-card">
        <div class="tag breaking">BREAKING</div>
        <h3>Major heist at Pacific Standard Bank leaves city in shock</h3>
        <p>Authorities report losses exceeding $3.4M following a coordinated robbery early this morning. Suspects remain at large.</p>
      </div>
      <div class="news-card">
        <div class="tag local">LOCAL</div>
        <h3>New business district development approved by City Council</h3>
        <p>The downtown expansion will bring 200+ new jobs and modern infrastructure to the Rockford Hills area.</p>
      </div>
      <div class="news-card">
        <div class="tag crime">CRIME</div>
        <h3>LSPD issues warning about street racing on the highway</h3>
        <p>Multiple reports of illegal racing near the freeway have prompted police to increase night patrols.</p>
      </div>
      <div class="news-card">
        <div class="tag local">LOCAL</div>
        <h3>City announces new community center opening next month</h3>
        <p>The Vinewood community center will offer free services and events for all residents starting July 15th.</p>
      </div>
    </div>`,

  dark: () => `
    <div class="page-hero" style="background:linear-gradient(135deg,#0d0005,#180010);border-color:rgba(150,0,50,0.3)">
      <h1 style="color:#ff4488">🕸️ The Undernet — Tor Gateway</h1>
      <p style="color:#994466">⚠️ WARNING: You are accessing a restricted area. All activity is logged.</p>
    </div>
    <div class="news-grid">
      <div class="news-card" style="border-color:rgba(150,0,50,0.3)">
        <div class="tag" style="background:rgba(200,0,50,0.2);color:#ff4488">LISTING</div>
        <h3>Anonymous document drop — encrypted vault</h3>
        <p style="color:#aa6688">Encrypted drop zone for sensitive files. Access requires a valid 256-bit key.</p>
      </div>
      <div class="news-card" style="border-color:rgba(150,0,50,0.3)">
        <div class="tag" style="background:rgba(100,0,150,0.2);color:#c084fc">MARKET</div>
        <h3>Contraband listings — [REDACTED]</h3>
        <p style="color:#aa6688">Content restricted. Clearance level 3 required for access.</p>
      </div>
      <div class="news-card" style="border-color:rgba(150,0,50,0.3)">
        <div class="tag" style="background:rgba(200,0,50,0.2);color:#ff4488">FORUM</div>
        <h3>Anonymous tip board — City insiders</h3>
        <p style="color:#aa6688">Verified insider tips about law enforcement movements and patrol schedules.</p>
      </div>
    </div>`,

  jobs: () => `
    <div class="page-hero" style="background:linear-gradient(135deg,#040d0a,#081a12);border-color:rgba(0,180,100,0.2)">
      <h1 style="color:#4ade80">💼 CitizenWork — Job Board</h1>
      <p>Browse available positions across Los Santos. Updated daily.</p>
    </div>
    <div class="news-grid">
      ${[
        ['Delivery Driver',   'UPS City Logistics',   '$120/hr', '🚚'],
        ['Mechanic',          "Benny's Garage",        '$180/hr', '🔧'],
        ['Security Guard',    'Maze Bank Tower',       '$200/hr', '🛡️'],
        ['Fishing Crew',      'Sandy Shores Marina',   '$90/hr',  '🎣'],
        ['Garbage Collector', 'Los Santos Sanitation', '$95/hr',  '🗑️'],
        ['Taxi Driver',       'Downtown Cab Co.',      '$110/hr', '🚕'],
      ].map(([t,c,p,i]) => `
      <div class="news-card" style="display:flex;align-items:center;gap:12px">
        <div style="font-size:28px">${i}</div>
        <div style="flex:1">
          <div class="tag local" style="margin-bottom:4px">${c}</div>
          <h3>${t}</h3>
          <p>Starting pay: <span style="color:#4ade80;font-weight:600">${p}</span></p>
        </div>
        <button onclick="this.textContent='Applied ✓';this.style.color='#4ade80';this.disabled=true"
          style="padding:6px 14px;border-radius:6px;border:1px solid rgba(74,222,128,0.4);background:rgba(74,222,128,0.1);color:#4ade80;cursor:pointer;font-size:11px;font-family:inherit">
          Apply
        </button>
      </div>`).join('')}
    </div>`,

  hackz: () => `
    <div class="page-hero" style="background:linear-gradient(135deg,#120024,#280036);border-color:rgba(120,0,255,0.3)">
      <h1 style="color:#d946ef">🔮 HACKZ Anti-Cheat Bypass Console</h1>
      <p style="color:#f472b6">⚠️ Root exploit loaded. Inject client hooks to enable the system cheats panel.</p>
    </div>
    <div style="padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
      <div id="hackz-status-box" style="text-align: center; color: var(--text-dim);">
         ${isHackzInstalled ? `
            <span style="color:#22c55e; font-size: 16px; font-weight: bold;">✓ HACKZ Bypass Active</span>
            <p style="margin-top: 5px; color:#e9d5ff;">Double-click the HACKZ icon on your Desktop to open the Control Panel.</p>
         ` : `
            <span style="color:#e11d48; font-size: 16px; font-weight: bold;">✕ Hack App Not Installed</span>
            <p style="margin-top: 5px; color:#e9d5ff;">Inject bypass hooks to mount the local control panel.</p>
         `}
      </div>
      
      ${isHackzInstalled ? '' : `
         <div id="hackz-install-container" style="width: 100%; max-width: 320px; text-align: center;">
            <button id="hackz-install-btn" class="do-hack-btn" onclick="startHackzInstallation()" style="background: linear-gradient(135deg, #a855f7 0%, #d946ef 100%); font-weight: bold; width: 100%; color: #fff; padding: 10px; border-radius: 6px; cursor: pointer; border: none;">
               <i class="fa-solid fa-download"></i> Inject HACKZ Payload
            </button>
            <div id="hackz-progress-bar" class="hidden" style="margin-top: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden; height: 16px; border: 1px solid rgba(255,255,255,0.1);">
               <div id="hackz-progress-fill" style="width: 0%; height: 100%; background: #d946ef; transition: width 0.1s linear;"></div>
            </div>
            <div id="hackz-progress-text" class="hidden" style="margin-top: 5px; font-size: 11px; color: #d946ef;">Downloading...</div>
         </div>
      `}
    </div>`
};

let isHackzInstalled = false;

function brUrlKey(e) {
    if (e.key === 'Enter') {
        const val = e.target.value.trim().toLowerCase();
        if (val.includes('hackz')) {
            switchBrTab('hackz');
        } else if (val.includes('troll')) {
            switchBrTab('troll');
        } else if (val === 'citynews.local' || val.includes('news')) {
            switchBrTab('news');
        } else if (val === 'undernet.onion' || val.includes('dark')) {
            switchBrTab('dark');
        } else if (val === 'citizenwork.local' || val.includes('job')) {
            switchBrTab('jobs');
        } else {
            document.getElementById('br-content').innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-dim);">
                    <h2 style="color: var(--text-bright);">🔍 Search Results for "${e.target.value}"</h2>
                    <p style="margin: 15px 0;">No direct site found for this address. Did you mean:</p>
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                        <a href="#" onclick="switchBrTab('news')" style="color: var(--accent); text-decoration: none;">citynews.local</a>
                        <a href="#" onclick="switchBrTab('dark')" style="color: var(--accent); text-decoration: none;">undernet.onion</a>
                        <a href="#" onclick="switchBrTab('jobs')" style="color: var(--accent); text-decoration: none;">citizenwork.local</a>
                        <a href="#" onclick="switchBrTab('hackz')" style="color: #ff3333; text-decoration: none; font-weight: bold;">hackz.onion</a>
                        <a href="#" onclick="switchBrTab('troll')" style="color: #ef4444; text-decoration: none; font-weight: bold;">troll.onion</a>
                    </div>
                </div>
            `;
        }
    }
}

function startHackzInstallation() {
    const btn = document.getElementById('hackz-install-btn');
    const container = document.getElementById('hackz-progress-bar');
    const fill = document.getElementById('hackz-progress-fill');
    const text = document.getElementById('hackz-progress-text');
    
    if (btn) btn.classList.add('hidden');
    if (container) container.classList.remove('hidden');
    if (text) text.classList.remove('hidden');
    
    let progress = 0;
    const stages = [
        "Connecting to Undernet proxy...",
        "Downloading HACKZ core binaries...",
        "Bypassing LSPD network firewall...",
        "Injecting shellcodes into memory...",
        "Installation complete!"
    ];
    
    const interval = setInterval(() => {
        progress += 2;
        if (fill) fill.style.width = progress + '%';
        
        const stageIdx = Math.min(stages.length - 1, Math.floor(progress / 20));
        if (text) text.innerText = stages[stageIdx] + ` (${progress}%)`;
        
        if (progress >= 100) {
            clearInterval(interval);
            isHackzInstalled = true;
            
            // Show desktop icon
            const desktopIcon = document.getElementById('desktop-hackz-icon');
            if (desktopIcon) desktopIcon.classList.remove('hidden');
            
            // Reload the tab content
            loadBrPage('hackz');
            showAppNotification("HACKZ Installed", "Exploit panel successfully added to your Desktop!");
        }
    }, 50);
}

const HackzCheats = [
  { id: "random_explosion", name: "Random Explosion / Phone Change", code: "1-999-367-3767", desc: "Causes a sudden local detonation and disrupts phone cellular modules.", icon: "💥" },
  { id: "incendiary_ammo", name: "Flaming Bullets", code: "1-999-462-363-4279 (INCENDIARY)", desc: "Ignites targets upon impact with firearm bullets.", icon: "🔥" },
  { id: "explosive_ammo", name: "Explosive Bullets", code: "1-999-444-439 (HIGHEX)", desc: "Firearm rounds detonate on contact with surfaces or entities.", icon: "💣" },
  { id: "explosive_melee", name: "Explosive Melee Attack", code: "1-999-4684-2637 (HOTHANDS)", desc: "Physical punches release an explosive shockwave.", icon: "👊" },
  { id: "give_parachute", name: "Give Parachute", code: "1-999-759-3483 (SKY-DIVE)", desc: "Adds a deployable safety parachute gear to your inventory.", icon: "🪂" },
  { id: "low_gravity", name: "Low Gravity", code: "1-999-356-2837 (FLOATER)", desc: "Decreases local gravitational force, causing higher jumps.", icon: "🌌" },
  { id: "drunk_mode", name: "Drunk Mode", code: "1-999-547-861 (LIQUOR)", desc: "Impairs visual coordination and alters walking physics.", icon: "🥴" },
  { id: "power_up", name: "Recharge Ability", code: "1-999-769-3787 (POWER-UP)", desc: "Restores running stamina, physical health, and armor to maximum.", icon: "⚡" },
  { id: "slow_mo", name: "Slow Motion", code: "1-999-756-966 (SLOW-MO)", desc: "Alters the simulation time scale (toggle between speeds).", icon: "⏳" },
  { id: "skyfall", name: "Skyfall", code: "1-999-759-3255 (SKY-FALL)", desc: "Launches you into the stratosphere for tactical skydiving.", icon: "🌌" },
  { id: "spawn_bmx", name: "Spawn BMX", code: "1-999-226-348 (BANDIT)", desc: "Materializes a sport BMX bicycle directly in front of you.", icon: "🚲" },
  { id: "spawn_comet", name: "Spawn Comet", code: "1-999-266-38 (COMET)", desc: "Spawns a fast Pegassi Comet sports car.", icon: "🚗" },
  { id: "spawn_rocket", name: "Spawn PCJ-600 Motorcycle", code: "1-999-762-538 (ROCKET)", desc: "Materializes a PCJ-600 sports motorcycle.", icon: "🏍️" },
  { id: "spawn_sanchez", name: "Spawn Sanchez Dirt Bike", code: "1-999-633-7623 (OFF-ROAD)", desc: "Materializes an off-road Sanchez dirt bike.", icon: "🏍️" },
  { id: "spawn_rapid_gt", name: "Spawn Rapid GT", code: "1-999-727-4348 (RAPID-GT)", desc: "Materializes a luxury Rapid GT roadster.", icon: "🏎️" },
  { id: "spawn_limo", name: "Spawn Limo", code: "1-999-846-39663 (VINEWOOD)", desc: "Materializes an executive stretch limousine.", icon: "🚘" },
  { id: "spawn_trash", name: "Spawn Trashmaster", code: "1-999-872-433 (TRASHED)", desc: "Spawns a heavy sanitation trash utility truck.", icon: "🚛" },
  { id: "spawn_buzzard", name: "Spawn Buzzard Helicopter", code: "1-999-289-9633 (BUZZ-OFF)", desc: "Spawns a military-grade Buzzard attack helicopter.", icon: "🚁" },
  { id: "spawn_deathcar", name: "Spawn Duke O'Death", code: "1-999-3328-4227 (DEATHCAR)", desc: "Spawns an armored Duke O'Death muscle car.", icon: "💀" },
  { id: "spawn_bubbles", name: "Spawn Kraken Sub", code: "1-999-282-2537 (BUBBLES)", desc: "Spawns a Kraken deep-sea research submarine.", icon: "🤿" },
  { id: "spawn_extinct", name: "Spawn Dodo", code: "1-999-398-4628 (EXTINCT)", desc: "Spawns a Dodo propeller seaplane.", icon: "🛩️" },
  { id: "spawn_stunt", name: "Spawn Stunt Plane", code: "1-999-2276-78676 (BARN STORM)", desc: "Spawns an agile stunt plane for aerial maneuvers.", icon: "✈️" },
  { id: "deadeye", name: "Slow Motion Aiming", code: "1-999-332-3393 (DEAD-EYE)", desc: "Enters a bullet-time slowdown when free-aiming firearms.", icon: "🎯" },
  { id: "painkiller", name: "Invincibility", code: "1-999-724-654-5537 (PAIN-KILLER)", desc: "Renders you immune to all damage forms (toggled active).", icon: "🛡️" },
  { id: "turtle", name: "Max Health & Armor", code: "1-999-887-853", desc: "Fully restores health and armor layers instantly.", icon: "🐢" },
  { id: "catchme", name: "Fast Run", code: "1-999-228-8463 (CATCH ME)", desc: "Greatly increases your base running speed.", icon: "🏃" },
  { id: "fugitive", name: "Raise Wanted Level", code: "1-999-3844-8483 (FUGITIVE)", desc: "Adds one star to your police pursuit wanted level.", icon: "⭐" },
  { id: "lawyerup", name: "Lower Wanted Level", code: "1-999-5299-3787 (LAWYERUP)", desc: "Instantly wipes all wanted level stars.", icon: "⚖️" },
  { id: "makeitrain", name: "Change Weather", code: "1-999-625-348-7246 (MAKE IT RAIN)", desc: "Cycles local atmospheric and weather conditions.", icon: "🌧️" },
  { id: "snowday", name: "Slippery Cars (Drifting)", code: "1-999-766-9329 (SNOWDAY)", desc: "Removes traction from tires for custom drifting dynamics.", icon: "❄️" }
];

function initHackz() {
  const grid = document.querySelector('#win-hackz .hackz-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  HackzCheats.forEach(c => {
    const card = document.createElement('div');
    card.style.background = 'rgba(255, 255, 255, 0.03)';
    card.style.border = '1px solid rgba(168, 85, 247, 0.2)';
    card.style.borderRadius = '6px';
    card.style.padding = '12px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'space-between';
    card.style.transition = 'all 0.2s ease';
    card.className = 'hackz-card';
    
    card.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 20px;">${c.icon}</span>
        <div style="flex: 1;">
          <h4 style="margin: 0; font-size: 13px; color: #f472b6;">${c.name}</h4>
          <span style="font-size: 9px; color: #a78bfa; font-family: monospace; display: block; margin-top: 2px;">${c.code}</span>
          <p style="margin: 6px 0 0 0; font-size: 10px; color: #d8b4fe; line-height: 1.3;">${c.desc}</p>
        </div>
      </div>
      <button onclick="executeHackzCheat('${c.id}')" style="margin-top: 10px; padding: 6px; background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.5); color: #e9d5ff; border-radius: 4px; cursor: pointer; font-size: 10px; font-family: inherit; transition: background 0.2s;">
         <i class="fa-solid fa-bolt"></i> Execute Cheat
      </button>
    `;
    grid.appendChild(card);
  });
}

function executeHackzCheat(cheatId) {
  nuiFetch('executeCheat', { cheatId: cheatId }).then(res => {
     if (res && res.message) {
         showAppNotification("HACKZ Status", res.message);
     }
  });
}

let isTrollInstalled = false;

function startTrollInstallation() {
    const btn = document.getElementById('troll-install-btn');
    const container = document.getElementById('troll-progress-bar');
    const fill = document.getElementById('troll-progress-fill');
    const text = document.getElementById('troll-progress-text');
    
    if (btn) btn.classList.add('hidden');
    if (container) container.classList.remove('hidden');
    if (text) text.classList.remove('hidden');
    
    let progress = 0;
    const stages = [
        "Connecting to Undernet relay proxy...",
        "Downloading Troll core payload...",
        "Hooking system inputs listener...",
        "Initializing synchronization bridge...",
        "Troll Control application installed!"
    ];
    
    const interval = setInterval(() => {
        progress += 2;
        if (fill) fill.style.width = progress + '%';
        
        const stageIdx = Math.min(stages.length - 1, Math.floor(progress / 20));
        if (text) text.innerText = stages[stageIdx] + ` (${progress}%)`;
        
        if (progress >= 100) {
            clearInterval(interval);
            isTrollInstalled = true;
            
            // Show desktop icon
            const desktopIcon = document.getElementById('desktop-troll-icon');
            if (desktopIcon) desktopIcon.classList.remove('hidden');
            
            // Reload the tab content
            loadBrPage('troll');
            showAppNotification("Troll Panel", "Control center successfully added to your Desktop!");
        }
    }, 50);
}

const TrollCheats = [
  { id: "ragdoll", category: "Physics & Chaos", name: "Force Ragdoll", desc: "Forces the target to lose footing and trip repeatedly.", icon: "🥴" },
  { id: "launch_sky", category: "Physics & Chaos", name: "Launch into Sky", desc: "Teleports target high up into the air with a safety parachute.", icon: "🪂" },
  { id: "super_jump", category: "Physics & Chaos", name: "Super Jump Loop", desc: "Enables perpetual high jumps for the next 20 seconds.", icon: "🐇" },
  { id: "drunk_effect", category: "Physics & Chaos", name: "Drunk Movement", desc: "Forces heavy swaying and blurry vision on target.", icon: "🍺" },
  { id: "moon_gravity", category: "Physics & Chaos", name: "Moon Gravity", desc: "Reduces target's local gravity vector by 70%.", icon: "🌒" },
  { id: "zero_gravity", category: "Physics & Chaos", name: "Zero Gravity", desc: "Simulates space physics by near-zeroing gravity index.", icon: "🌌" },

  { id: "burst_tires", category: "Vehicle Chaos", name: "Burst Tyres", desc: "Instantly pops all tires on the target's current vehicle.", icon: "🛞" },
  { id: "explode_car", category: "Vehicle Chaos", name: "Stall/Fire Engine", desc: "Damages target vehicle engine, creating severe black smoke/fire.", icon: "🔥" },
  { id: "brake_failure", category: "Vehicle Chaos", name: "Brake Failure", desc: "Brakes fail entirely and engine loses power for 15s.", icon: "🛑" },
  { id: "stuck_gas", category: "Vehicle Chaos", name: "Sticky Accelerator", desc: "Forces vehicle throttle wide open for 10 seconds.", icon: "🏎️" },
  { id: "eject", category: "Vehicle Chaos", name: "Eject Driver", desc: "Ejects target driver out of the vehicle cabin immediately.", icon: "🪟" },
  { id: "engine_stall", category: "Vehicle Chaos", name: "Engine Stall", desc: "Stalls engine and renders vehicle undriveable for 10s.", icon: "🔌" },
  { id: "rgb_car", category: "Vehicle Chaos", name: "RGB Neon Pulse", desc: "Rapidly cycles vehicle primary/secondary paint colors.", icon: "🌈" },

  { id: "sudden_deer", category: "NPC Spawns", name: "Sudden Deer Charge", desc: "Spawns a charging wild deer right in front of the target.", icon: "🦌" },
  { id: "spawn_bodybuilders", category: "NPC Spawns", name: "Bat-Wielding Bodybuilders", desc: "Spawns 3 angry bodybuilders armed with bats to attack.", icon: "🏋️" },
  { id: "alien_attack", category: "NPC Spawns", name: "Alien Raygun Assault", desc: "Spawns 3 movie aliens armed with laser guns.", icon: "👽" },

  { id: "hide_ui", category: "Visuals & HUD", name: "Blackout Mini-Map", desc: "Hides target radar/mini-map layout for 15 seconds.", icon: "🗺️" },
  { id: "bw_filter", category: "Visuals & HUD", name: "Static Screen Filter", desc: "Applies a gray staticy interference visual overlay.", icon: "📺" },
  { id: "drunk_aim", category: "Visuals & HUD", name: "Aim Shake (Bullet-Time)", desc: "Triggers heavy screen shaking when weapon is aimed.", icon: "🎯" },

  { id: "sound_horn", category: "Sounds", name: "Stuck Horn Sound", desc: "Forces target's vehicle horn to sound continuously for 8s.", icon: "📢" },
  { id: "sound_alarm", category: "Sounds", name: "Deafening Siren", desc: "Plays a loud DLC Airhorn alarm sound near the target ped.", icon: "🚨" },
  { id: "sound_fail", category: "Sounds", name: "Frontend Fail Chime", desc: "Plays Waste/Fail screen flash front-end audio.", icon: "🔔" }
];

function refreshTrollPlayers() {
  nuiFetch('getPlayers', {}).then(players => {
    const select = document.getElementById('troll-target-select');
    if (!select) return;
    select.innerHTML = '<option value="self">Local Player (Standalone)</option>';
    if (players && players.forEach) {
        players.forEach(p => {
            if (p.id !== 'self') {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `[ID: ${p.id}] ${p.name}`;
                select.appendChild(opt);
            }
        });
    }
  });
}

function initTrollApp() {
  refreshTrollPlayers();
  
  const grid = document.querySelector('#win-troll .troll-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  TrollCheats.forEach(c => {
    const card = document.createElement('div');
    card.style.background = 'rgba(255, 255, 255, 0.02)';
    card.style.border = '1px solid rgba(239, 68, 68, 0.15)';
    card.style.borderRadius = '6px';
    card.style.padding = '12px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'space-between';
    card.style.transition = 'all 0.2s ease';
    card.className = 'troll-card';
    
    card.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 20px;">${c.icon}</span>
        <div style="flex: 1;">
          <h4 style="margin: 0; font-size: 13px; color: #fca5a5;">${c.name}</h4>
          <span style="font-size: 8px; color: #ef4444; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; display: block; margin-top: 2px;">${c.category}</span>
          <p style="margin: 6px 0 0 0; font-size: 10px; color: #fca5a5; opacity: 0.8; line-height: 1.3;">${c.desc}</p>
        </div>
      </div>
      <button onclick="executeTrollAction('${c.id}')" style="margin-top: 10px; padding: 6px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #fecaca; border-radius: 4px; cursor: pointer; font-size: 10px; font-family: inherit; transition: background 0.2s; width: 100%;">
         <i class="fa-solid fa-skull"></i> Send Exploit
      </button>
    `;
    grid.appendChild(card);
  });
}

function executeTrollAction(actionId) {
  const select = document.getElementById('troll-target-select');
  const targetId = select ? select.value : 'self';
  
  nuiFetch('triggerTrollAction', { targetId: targetId, action: actionId }).then(res => {
     if (res && res.status === "ok") {
         showAppNotification("Troll Action", "Exploit delivered successfully.");
     }
  });
}

function initBrowser()   { loadBrPage('news'); }
function loadBrTab()     { loadBrPage(brTab); }
function loadBrPage(t)   {
  const fn = brPages[t] || brPages['news'];
  document.getElementById('br-content').innerHTML = fn();
}
function switchBrTab(t) {
  brTab = t;
  document.querySelectorAll('.br-tab').forEach(el => el.classList.remove('active'));
  const tabEl = document.getElementById('tab-' + t);
  if (tabEl) tabEl.classList.add('active');
  const urls = { news: 'citynews.local', dark: 'undernet.onion', jobs: 'citizenwork.local', hackz: 'hackz.onion' };
  document.getElementById('br-url').value = urls[t] || t;
  loadBrPage(t);
}

// ─── NOTEPAD ──────────────────────────────────────────────────────────────────
let noteUnsaved = false;

function onNoteInput() {
  noteUnsaved = true;
  document.getElementById('notepad-title').textContent = 'Notepad — Untitled*';
  document.getElementById('np-save-status').textContent = '';
  updateNotepadStatus();
}

function updateNotepadStatus() {
  const ta   = document.getElementById('notepad-text');
  const val  = ta.value;
  const lines = val.split('\n').length;
  document.getElementById('np-chars').textContent = val.length + ' chars';
  document.getElementById('np-lines').textContent = lines + ' line' + (lines > 1 ? 's' : '');
  const pos    = ta.selectionStart || 0;
  const before = val.substring(0, pos);
  const ln     = before.split('\n').length;
  const col    = before.split('\n').pop().length + 1;
  document.getElementById('np-ln').textContent = `Ln ${ln}, Col ${col}`;
}

function saveNote() {
  const val = document.getElementById('notepad-text').value;
  if (IN_FIVEM) {
    nuiFetch('saveNote', { note: val });
  } else {
    localStorage.setItem('homepc_note', val);
  }
  noteUnsaved = false;
  document.getElementById('notepad-title').textContent = 'Notepad — Untitled';
  document.getElementById('np-save-status').textContent = '✔ Saved';
  setTimeout(() => {
    const el = document.getElementById('np-save-status');
    if (el) el.textContent = '';
  }, 2000);
}

function notepadKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNote(); }
  if (e.key === 'Tab') {
    e.preventDefault();
    const ta = e.target;
    const s  = ta.selectionStart;
    ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = s + 2;
  }
  setTimeout(updateNotepadStatus, 0);
}

// ─── FILE EXPLORER ────────────────────────────────────────────────────────────
const feData = {
  documents: [
    {icon:'📄',name:'resume.txt'},{icon:'📊',name:'budget.xlsx'},
    {icon:'📝',name:'notes.txt'},{icon:'📋',name:'lease_agreement.pdf'},
    {icon:'📁',name:'Work Files'},{icon:'📁',name:'Personal'},
  ],
  pictures: [
    {icon:'🖼️',name:'vacation.jpg'},{icon:'🖼️',name:'selfie.png'},
    {icon:'📷',name:'heist_plan.jpg'},{icon:'📁',name:'Screenshots'},
    {icon:'🖼️',name:'wallpaper.jpg'},
  ],
  downloads: [
    {icon:'📦',name:'setup.exe'},{icon:'🎵',name:'song.mp3'},
    {icon:'🎬',name:'movie.mp4'},{icon:'📄',name:'manual.pdf'},
    {icon:'📦',name:'update_v2.zip'},
  ],
  music: [
    {icon:'🎵',name:'playlist1.m3u'},{icon:'🎵',name:'lofi_mix.mp3'},
    {icon:'📁',name:'Albums'},{icon:'🎵',name:'theme.ogg'},
  ],
  desktop: [
    {icon:'🖥️',name:'This PC'},{icon:'📄',name:'Shortcut.lnk'},
    {icon:'📝',name:'todo.txt'},
  ],
  trash: [
    {icon:'🗑️',name:'old_plan.txt'},{icon:'🗑️',name:'temp.exe'},
  ],
};
const fePaths = {
  documents:'This PC > Documents', pictures:'This PC > Pictures',
  downloads:'This PC > Downloads', music:'This PC > Music',
  desktop:'Desktop', trash:'Recycle Bin',
};
let feHistory = ['documents'];

function feNav(folder) {
  feHistory.push(folder);
  document.querySelectorAll('.fe-side-item').forEach(el => el.classList.remove('active'));
  const si = document.getElementById('fsi-' + folder);
  if (si) si.classList.add('active');
  document.getElementById('fe-path').value = fePaths[folder] || folder;
  const files = feData[folder] || [];
  document.getElementById('fe-files').innerHTML = files.map(f =>
    `<div class="fe-file"><div class="fi">${f.icon}</div><span>${f.name}</span></div>`
  ).join('');
}

function feBack() {
  if (feHistory.length > 1) {
    feHistory.pop();
    feNav(feHistory[feHistory.length - 1]);
    feHistory.pop(); // feNav pushes again
  }
}

// ─── CALCULATOR ───────────────────────────────────────────────────────────────
let calcState = { num: '0', expr: '', op: null, prev: null, fresh: false };

function calcDisplay() {
  document.getElementById('calc-num').textContent  = calcState.num;
  document.getElementById('calc-expr').textContent = calcState.expr;
}
function calcClear() {
  calcState = { num: '0', expr: '', op: null, prev: null, fresh: false };
  calcDisplay();
}
function calcDigit(d) {
  if (calcState.fresh) { calcState.num = d; calcState.fresh = false; }
  else calcState.num = calcState.num === '0' ? d : calcState.num + d;
  calcDisplay();
}
function calcDot() {
  if (!calcState.num.includes('.')) { calcState.num += '.'; calcDisplay(); }
}
function calcOp(op) {
  calcState.prev  = parseFloat(calcState.num);
  calcState.op    = op;
  const sym = { '/':'÷', '*':'×', '-':'−', '+':'+' }[op] || op;
  calcState.expr  = `${calcState.num} ${sym}`;
  calcState.fresh = true;
  calcDisplay();
}
function calcEquals() {
  if (calcState.op === null || calcState.prev === null) return;
  const a = calcState.prev, b = parseFloat(calcState.num);
  let r;
  switch (calcState.op) {
    case '+': r = a + b; break;
    case '-': r = a - b; break;
    case '*': r = a * b; break;
    case '/': r = b === 0 ? 'Error' : a / b; break;
    default:  r = b;
  }
  const sym = { '/':'÷', '*':'×', '-':'−', '+':'+' }[calcState.op] || calcState.op;
  calcState.expr  = `${a} ${sym} ${b} =`;
  calcState.num   = String(typeof r === 'number' ? parseFloat(r.toFixed(10)) : r);
  calcState.op    = null;
  calcState.prev  = null;
  calcState.fresh = true;
  calcDisplay();
}
function calcToggleSign() {
  calcState.num = String(-parseFloat(calcState.num) || 0);
  calcDisplay();
}
function calcPercent() {
  calcState.num = String(parseFloat(calcState.num) / 100);
  calcDisplay();
}

// ─── TASK MANAGER ─────────────────────────────────────────────────────────────
const tmProcs = [
  { name:'CitizenFX.exe',    pid:1024, baseCpu:8,  baseMem:512 },
  { name:'NUI_Browser.exe',  pid:2048, baseCpu:3,  baseMem:180 },
  { name:'System.exe',       pid:4,    baseCpu:0.5, baseMem:64 },
  { name:'AudioEngine.exe',  pid:3200, baseCpu:1,  baseMem:96 },
  { name:'NetworkCore.exe',  pid:1500, baseCpu:2,  baseMem:128 },
  { name:'RenderThread.exe', pid:2200, baseCpu:12, baseMem:320 },
  { name:'ScriptHost.exe',   pid:1800, baseCpu:5,  baseMem:200 },
  { name:'Lua_Runtime.exe',  pid:2900, baseCpu:4,  baseMem:150 },
  { name:'EventBus.exe',     pid:3600, baseCpu:1,  baseMem:80  },
];

const tmStartup = [
  { name:'CitizenFX Core', publisher:'Rockstar/FiveM', impact:'High',   enabled:true  },
  { name:'Audio Driver',   publisher:'System',         impact:'Medium', enabled:true  },
  { name:'NUI Renderer',   publisher:'FiveM',          impact:'High',   enabled:true  },
  { name:'Anticheat',      publisher:'FiveM',          impact:'Low',    enabled:true  },
  { name:'DiscordRPC',     publisher:'Discord Inc.',   impact:'Low',    enabled:false },
];

let tmInterval  = null;
let tmTabActive = 'processes';

function initTaskMgr()   { tmTabActive = 'processes'; renderTmTab(); stopTaskMgr(); tmInterval = setInterval(renderTmTab, 1500); }
function stopTaskMgr()   { if (tmInterval) clearInterval(tmInterval); tmInterval = null; }

function tmTabSwitch(el, tab) {
  document.querySelectorAll('.tm-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  tmTabActive = tab;
  renderTmTab();
}

function renderTmTab() {
  const el = document.getElementById('tm-content');
  if (!el) return;
  if (tmTabActive === 'processes') renderTmProcesses(el);
  else if (tmTabActive === 'performance') renderTmPerformance(el);
  else renderTmStartup(el);
}

function renderTmProcesses(el) {
  el.innerHTML = `<table class="tm-table">
    <thead><tr>
      <th>Name</th><th>PID</th><th>CPU</th><th>Memory</th><th>Status</th>
    </tr></thead>
    <tbody>${tmProcs.map(p => {
      const cpu = Math.max(0, p.baseCpu + (Math.random()*2-1)).toFixed(1);
      const mem = Math.round(p.baseMem + (Math.random()*20-10));
      const n   = parseFloat(cpu);
      const cls = n < 5 ? 'usage-low' : n < 10 ? 'usage-mid' : 'usage-high';
      return `<tr>
        <td>${p.name}</td>
        <td style="color:var(--text-dim)">${p.pid}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="min-width:32px;font-size:10px">${cpu}%</span>
            <div class="usage-bar"><div class="usage-fill ${cls}" style="width:${Math.min(n*5,100)}%"></div></div>
          </div>
        </td>
        <td style="color:var(--text-dim);font-size:10px">${mem} MB</td>
        <td><span style="font-size:10px;color:#4ade80">Running</span></td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function renderTmPerformance(el) {
  const cpu = (Math.random()*30+10).toFixed(0);
  const ram = (Math.random()*3+5).toFixed(1);
  el.innerHTML = `<div style="padding:16px;display:flex;flex-direction:column;gap:14px">
    <div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">CPU Usage — ${cpu}%</div>
      <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
        <div style="width:${cpu}%;height:100%;background:linear-gradient(90deg,#0078d4,#60cdff);border-radius:4px;transition:width 0.8s"></div>
      </div>
    </div>
    <div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">RAM Usage — ${ram} GB / 16 GB</div>
      <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
        <div style="width:${(ram/16*100).toFixed(0)}%;height:100%;background:linear-gradient(90deg,#7c3aed,#c084fc);border-radius:4px;transition:width 0.8s"></div>
      </div>
    </div>
    <div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Disk I/O — ${(Math.random()*20).toFixed(1)} MB/s</div>
      <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
        <div style="width:${(Math.random()*40).toFixed(0)}%;height:100%;background:linear-gradient(90deg,#059669,#34d399);border-radius:4px;transition:width 0.8s"></div>
      </div>
    </div>
  </div>`;
}

function renderTmStartup(el) {
  el.innerHTML = `<table class="tm-table">
    <thead><tr><th>Name</th><th>Publisher</th><th>Impact</th><th>Enabled</th></tr></thead>
    <tbody>${tmStartup.map(s => `<tr>
      <td>${s.name}</td>
      <td style="color:var(--text-dim)">${s.publisher}</td>
      <td style="color:${s.impact==='High'?'#f87171':s.impact==='Medium'?'#fbbf24':'#4ade80'}">${s.impact}</td>
      <td><span style="font-size:10px;color:${s.enabled?'#4ade80':'var(--text-dim)'}">${s.enabled?'Enabled':'Disabled'}</span></td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// ─── MINESWEEPER ──────────────────────────────────────────────────────────────
const MS_COLS  = 10, MS_ROWS = 10, MS_MINES = 10;
let msBoard    = [], msRevealed = [], msFlagged = [];
let msGameOver = false, msTimerInt = null, msSeconds = 0, msStarted = false;

function msInit() {
  clearInterval(msTimerInt);
  msSeconds = 0; msStarted = false; msGameOver = false;
  document.getElementById('ms-face').textContent  = '🙂';
  document.getElementById('ms-timer').textContent = '000';
  document.getElementById('ms-mines').textContent = String(MS_MINES).padStart(3,'0');

  msBoard    = Array.from({length:MS_ROWS}, () => Array(MS_COLS).fill(0));
  msRevealed = Array.from({length:MS_ROWS}, () => Array(MS_COLS).fill(false));
  msFlagged  = Array.from({length:MS_ROWS}, () => Array(MS_COLS).fill(false));

  let placed = 0;
  while (placed < MS_MINES) {
    const r = Math.floor(Math.random() * MS_ROWS);
    const c = Math.floor(Math.random() * MS_COLS);
    if (msBoard[r][c] !== -1) { msBoard[r][c] = -1; placed++; }
  }
  for (let r = 0; r < MS_ROWS; r++) {
    for (let c = 0; c < MS_COLS; c++) {
      if (msBoard[r][c] === -1) continue;
      let cnt = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r+dr, nc = c+dc;
        if (nr>=0&&nr<MS_ROWS&&nc>=0&&nc<MS_COLS&&msBoard[nr][nc]===-1) cnt++;
      }
      msBoard[r][c] = cnt;
    }
  }
  msRender();
}

function msRender() {
  const g = document.getElementById('ms-grid');
  if (!g) return;
  g.style.gridTemplateColumns = `repeat(${MS_COLS}, 24px)`;
  g.innerHTML = '';
  for (let r = 0; r < MS_ROWS; r++) {
    for (let c = 0; c < MS_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'ms-cell';
      if (msRevealed[r][c]) {
        cell.classList.add('revealed');
        const v = msBoard[r][c];
        if (v === -1)  { cell.textContent = '💥'; cell.classList.add('mine-hit'); }
        else if (v > 0){ cell.textContent = v;    cell.classList.add('n'+v); }
      } else if (msFlagged[r][c]) {
        cell.textContent = '🚩'; cell.classList.add('flagged');
      }
      cell.addEventListener('click',       () => msTap(r, c));
      cell.addEventListener('contextmenu', e => { e.preventDefault(); msFlag(r, c); });
      g.appendChild(cell);
    }
  }
}

function msTap(r, c) {
  if (msGameOver || msRevealed[r][c] || msFlagged[r][c]) return;
  if (!msStarted) {
    msStarted = true;
    msTimerInt = setInterval(() => {
      msSeconds = Math.min(msSeconds + 1, 999);
      document.getElementById('ms-timer').textContent = String(msSeconds).padStart(3,'0');
    }, 1000);
  }
  if (msBoard[r][c] === -1) {
    msGameOver = true;
    clearInterval(msTimerInt);
    msRevealAll();
    msRender();
    document.getElementById('ms-face').textContent = '😵';
    return;
  }
  msReveal(r, c);
  msRender();
  if (msCheckWin()) {
    msGameOver = true;
    clearInterval(msTimerInt);
    document.getElementById('ms-face').textContent = '😎';
  }
}

function msReveal(r, c) {
  if (r<0||r>=MS_ROWS||c<0||c>=MS_COLS||msRevealed[r][c]||msFlagged[r][c]) return;
  msRevealed[r][c] = true;
  if (msBoard[r][c] === 0)
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) msReveal(r+dr, c+dc);
}
function msFlag(r, c) {
  if (msGameOver || msRevealed[r][c]) return;
  msFlagged[r][c] = !msFlagged[r][c];
  const cnt = MS_MINES - msFlagged.flat().filter(Boolean).length;
  document.getElementById('ms-mines').textContent = String(cnt).padStart(3,'0');
  msRender();
}
function msRevealAll() {
  for (let r=0;r<MS_ROWS;r++) for (let c=0;c<MS_COLS;c++) msRevealed[r][c] = true;
}
function msCheckWin() {
  for (let r=0;r<MS_ROWS;r++) for (let c=0;c<MS_COLS;c++)
    if (msBoard[r][c]!==-1 && !msRevealed[r][c]) return false;
  return true;
}
function msDestroy() {
  clearInterval(msTimerInt);
  msTimerInt = null;
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
const wallpapers = [
  "url('./images/wallpapers/ultimate_edition.png')",
  'radial-gradient(ellipse 80% 60% at 20% 80%, rgba(0,78,160,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(96,0,180,0.28) 0%, transparent 55%), #060810',
  'radial-gradient(ellipse at 50% 100%, rgba(180,0,0,0.3) 0%, transparent 60%), #0a0508',
  'radial-gradient(ellipse at 50% 100%, rgba(0,160,80,0.28) 0%, transparent 55%), #050a07',
  'radial-gradient(ellipse at 30% 70%, rgba(180,100,0,0.28) 0%, transparent 60%), #0a0705',
  'radial-gradient(ellipse at 70% 30%, rgba(100,0,180,0.35) 0%, transparent 55%), #080510',
  'linear-gradient(135deg, #060810, #0a1020)',
  "url('./images/wallpapers/13082021-RETRO-HD.png')",
  "url('./images/wallpapers/360_F_1324891413_wQErXbzWMdQBpOXr5e3BzI7ZXIHgQzpD.png')",
  "url('./images/wallpapers/360_F_1324893910_P1DnFSHXHImzfPYKHs5vXUeVn4OLkocy.png')",
  "url('./images/wallpapers/HEROSCREEN2025021914.png')",
  "url('./images/wallpapers/WALLPAPER-202504270958188.png')",
  "url('./images/wallpapers/beautiful-magical-world-wallpaper-1202013.png')",
  "url('./images/wallpapers/cool-desktop-wallpaper-1920x1080-4k-and-8k-avaliable-v0-m4h2hhjze8w71.png')",
  "url('./images/wallpapers/heroscreen-wallpaper-4k.png')"
];
let selWP = localStorage.getItem('homepc_wallpaper_type') === 'custom' ? -1 : (parseInt(localStorage.getItem('homepc_wallpaper_index')) || 0);

const settingsPages = {
  personalization: () => {
    const isCustom = localStorage.getItem('homepc_wallpaper_type') === 'custom';
    const activeIdx = isCustom ? -1 : (parseInt(localStorage.getItem('homepc_wallpaper_index')) || 0);
    const customUrl = localStorage.getItem('homepc_wallpaper_custom') || '';
    const transVal = localStorage.getItem('homepc_transparency') !== 'false';
    return `
    <div class="s-section-title">Personalization</div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Wallpaper</div>
    <div class="wallpaper-grid" id="wp-grid">
      ${wallpapers.map((w,i) => `
        <div class="wp-option ${i===activeIdx?'selected':''}" style="background:${w}"
          onclick="selectWallpaper(${i})"></div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--text-dim);margin-top:12px;margin-bottom:4px">Custom Image URL (16:9 aspect ratio recommended)</div>
    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <input type="text" placeholder="https://example.com/wallpaper.jpg" id="custom-wp-url" style="flex-grow:1;padding:6px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2);color:white;font-size:11px;" value="${customUrl}">
      <button onclick="setCustomWallpaper()" style="padding:6px 12px;border:none;border-radius:4px;background:var(--accent);color:white;font-size:11px;font-weight:bold;cursor:pointer;">Apply</button>
    </div>
    <div class="s-row" style="margin-top:4px">
      <div class="s-row-info"><label>Transparency Effects</label><small>Glassmorphism blur on windows</small></div>
      <label class="toggle"><input type="checkbox" ${transVal?'checked':''} id="tog-glass" onchange="toggleGlass(this)"><span class="toggle-slider"></span></label>
    </div>
    <div class="s-row">
      <div class="s-row-info"><label>Dark Mode</label><small>Always on for this device</small></div>
      <label class="toggle"><input type="checkbox" checked disabled><span class="toggle-slider"></span></label>
    </div>`;
  },

  system: () => `
    <div class="s-section-title">System</div>
    <div class="s-row"><div class="s-row-info"><label>Display Resolution</label><small>Recommended</small></div><span style="font-size:11px;color:var(--text-dim)">1920×1080</span></div>
    <div class="s-row"><div class="s-row-info"><label>Sound Output</label><small>Default System Audio</small></div><span style="font-size:11px;color:var(--text-dim)">100%</span></div>
    <div class="s-row"><div class="s-row-info"><label>Power Mode</label><small>Optimized for performance</small></div><span style="font-size:11px;color:var(--accent2)">Performance</span></div>
    <div class="s-row">
      <div class="s-row-info"><label>Notifications</label><small>Show app alerts</small></div>
      <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
    </div>`,

  network: () => `
    <div class="s-section-title">Network & Internet</div>
    <div class="s-row"><div class="s-row-info"><label>Wi-Fi</label><small>CityNet_5G — Connected</small></div><span style="font-size:18px">📶</span></div>
    <div class="s-row">
      <div class="s-row-info"><label>VPN</label><small>ProtonVPN — Inactive</small></div>
      <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
    </div>
    <div class="s-row">
      <div class="s-row-info"><label>Firewall</label><small>Active — High Security</small></div>
      <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
    </div>`,

  privacy: () => `
    <div class="s-section-title">Privacy & Security</div>
    <div class="s-row">
      <div class="s-row-info"><label>Activity History</label><small>Track recently opened apps</small></div>
      <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
    </div>
    <div class="s-row">
      <div class="s-row-info"><label>Location Services</label><small>Allow apps to access location</small></div>
      <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
    </div>
    <div class="s-row">
      <div class="s-row-info"><label>Full Disk Encryption</label><small>All data is encrypted at rest</small></div>
      <span style="font-size:11px;color:#4ade80">🔒 Active</span>
    </div>`,

  about: () => `
    <div class="s-section-title">About This Device</div>
    <div class="s-row"><div class="s-row-info"><label>OS Version</label></div><span style="font-size:11px;color:var(--text-dim)">Home OS v2.4.1</span></div>
    <div class="s-row"><div class="s-row-info"><label>Processor</label></div><span style="font-size:11px;color:var(--text-dim)">Intel Core i7-12700</span></div>
    <div class="s-row"><div class="s-row-info"><label>RAM</label></div><span style="font-size:11px;color:var(--text-dim)">16.0 GB DDR5</span></div>
    <div class="s-row"><div class="s-row-info"><label>Storage</label></div><span style="font-size:11px;color:var(--text-dim)">512 GB NVMe SSD</span></div>
    <div class="s-row"><div class="s-row-info"><label>Registered To</label></div><span style="font-size:11px;color:var(--accent2)" id="about-citizen">CitizenID: —</span></div>`,
};

function initSettings(page) { renderSettingsPage(page); }
function settingsNav(el, page) {
  document.querySelectorAll('.sn-item').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  renderSettingsPage(page);
}
function renderSettingsPage(page) {
  const fn = settingsPages[page] || settingsPages['personalization'];
  document.getElementById('settings-content').innerHTML = fn();
}
function selectWallpaper(i) {
  selWP = i;
  const d = document.getElementById('desktop');
  if (d) {
    d.style.background = '';
    d.style.background = wallpapers[i];
    if (wallpapers[i].startsWith('url(')) {
      d.style.backgroundSize = 'cover';
      d.style.backgroundPosition = 'center';
      d.style.backgroundRepeat = 'no-repeat';
    } else {
      d.style.backgroundSize = '';
      d.style.backgroundPosition = '';
      d.style.backgroundRepeat = '';
    }
  }
  localStorage.setItem('homepc_wallpaper', wallpapers[i]);
  localStorage.setItem('homepc_wallpaper_type', 'default');
  localStorage.setItem('homepc_wallpaper_index', i);
  document.querySelectorAll('.wp-option').forEach((el,j) => el.classList.toggle('selected', j===i));
}
function setCustomWallpaper() {
  const input = document.getElementById('custom-wp-url');
  if (!input) return;
  const url = input.value.trim();
  if (url === '') {
    showAppNotification("Settings", "Please enter a valid wallpaper URL.");
    return;
  }
  const bgValue = `url('${url}')`;
  const d = document.getElementById('desktop');
  if (d) {
    d.style.background = '';
    d.style.background = bgValue;
    d.style.backgroundSize = 'cover';
    d.style.backgroundPosition = 'center';
    d.style.backgroundRepeat = 'no-repeat';
  }
  
  localStorage.setItem('homepc_wallpaper', bgValue);
  localStorage.setItem('homepc_wallpaper_type', 'custom');
  localStorage.setItem('homepc_wallpaper_custom', url);
  
  // deselect default options
  document.querySelectorAll('.wp-option').forEach(el => el.classList.remove('selected'));
  showAppNotification("Settings", "Custom wallpaper applied successfully!");
}
function toggleGlass(el) {
  document.body.classList.toggle('no-transparency', !el.checked);
  localStorage.setItem('homepc_transparency', el.checked ? 'true' : 'false');
}

// ─── GLITCH STREAMING APP LOGIC ───────────────────────────────────────────────
let glitchActiveStreams = {};
let glitchCurrentPage = 'home';
let glitchStreaming = false;
let glitchWatching = false;
let glitchStreamId = 0;
let glitchPeers = {};
let glitchRTC = null;
let glitchFollowedChannels = new Set();
let glitchCategoryFilter = null;
let glitchMockChatInterval = null;
let glitchSimulatedStreamId = null;

const GLITCH_RTC_SERVERS = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ],
  iceCandidatePoolSize: 10
};

// Simulated stream configurations
const GLITCH_MOCK_STREAMS = {
  glitch_gaming: {
    name: 'glitch_gaming',
    avatar: '🎮',
    title: 'VALORANT WITH VIEWERS! 🔫 [Drops Enabled]',
    category: 'GTA V RP',
    viewers: '1.2k',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    chatComments: [
      "OMG! INSANE IN THE CHAT!",
      "Sheesh that spray transfer!",
      "POGGERS",
      "Is this guy hacking? Kappa",
      "what sensitivity do you use?",
      "lmfao no way he hit that",
      "w7 in the chat!",
      "KEKW",
      "Can we play next game?",
      "Mod me pls",
      "Love the stream bro!",
      "Sub hype!! 💜"
    ]
  },
  loscantos_racing: {
    name: 'loscantos_racing',
    avatar: '🏁',
    title: 'Los Santos Grand Prix - Qualification Session! 🏎️💨',
    category: 'Racing',
    viewers: '824',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    chatComments: [
      "That corner was clean!!",
      "crash incoming lol",
      "Who is in 1st place?",
      "damn he's fast",
      "Is that keyboard or wheel?",
      "P2 is closing in!",
      "POGGGGG",
      "Let's goooo Racing!",
      "spin out!",
      "rip engine"
    ]
  },
  synthwave_radio: {
    name: 'synthwave_radio',
    avatar: '🎵',
    title: 'Synthwave / Lofi Beats to hack/code to 🌌 [24/7 Live]',
    category: 'Music',
    viewers: '3.5k',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    chatComments: [
      "vibes are immaculate ✨",
      "Love this track, name?",
      "Chill streams are the best",
      "coding python right now listening to this",
      "Greetings from Liberty City!",
      "💜 purple glow vibes 💜",
      "Absolute gem of a radio",
      "synthwave is life",
      "Who else is studying?"
    ]
  }
};

const GLITCH_MOCK_USERNAMES = [
  "PixelPirate", "QuantumCoder", "NeonNinja", "SynthWaver", "GlitchLord",
  "CyberSamurai", "AlphaGamer", "ZeroCool", "RetroWave", "CodeSlinger",
  "BubbleGum", "SpitFire", "ChronoTrigger", "GamerGirl99", "SpeedyG"
];

const GLITCH_USER_COLORS = [
  "#9146ff", "#00f0ff", "#ff007f", "#00ad07", "#ffb300", 
  "#ff3c00", "#0051ff", "#e0007b", "#2ade7f", "#3ec0f8"
];

// Initialize Glitch App
function initGlitch() {
  glitchCurrentPage = 'home';
  glitchCategoryFilter = null;
  switchGlitchPage('home');
  
  // Clear any existing logs
  document.getElementById('glitch-chat-messages').innerHTML = '';
  document.getElementById('glitch-sidebar-channels').innerHTML = '';
  
  // Set up forms
  document.getElementById('glitch-input-title').value = '';
  document.getElementById('glitch-select-category').value = 'Just Chatting';
  
  // Hide canvas preview, show placeholder
  document.getElementById('glitch-stream-canvas').style.display = 'none';
  document.querySelector('.glitch-preview-placeholder').style.display = 'flex';
  
  // Setup control buttons
  document.getElementById('glitch-btn-start').style.display = 'block';
  document.getElementById('glitch-btn-stop').style.display = 'none';
  
  // Fetch active streams
  refreshGlitchStreams();
}

// Close Glitch App
function closeGlitch() {
  stopWatchingGlitchStream();
  if (glitchStreaming) {
    stopGlitchLive();
  }
}

// Refresh streams list
function refreshGlitchStreams() {
  nuiFetch('glitchGetStreams', {}).then(streams => {
    glitchActiveStreams = streams || {};
    renderGlitchChannels();
  }).catch(() => {
    // Standalone fallback
    renderGlitchChannels();
  });
}

// Render active streams to sidebar and home grid
function renderGlitchChannels() {
  const sidebarList = document.getElementById('glitch-sidebar-channels');
  const activeGrid = document.getElementById('glitch-active-grid');
  
  sidebarList.innerHTML = '';
  activeGrid.innerHTML = '';
  
  let playerStreamCount = 0;
  
  // Render real player streams
  for (let id in glitchActiveStreams) {
    const stream = glitchActiveStreams[id];
    if (!stream) continue;
    
    // Skip if category filter is active and doesn't match
    if (glitchCategoryFilter && stream.category !== glitchCategoryFilter) continue;
    
    playerStreamCount++;
    
    // Sidebar item
    const sidebarItem = document.createElement('div');
    sidebarItem.className = 'glitch-sidebar-channel';
    sidebarItem.onclick = () => watchPlayerStream(stream.streamId, stream.streamerName, stream.title, stream.category);
    sidebarItem.innerHTML = `
      <div class="glitch-channel-avatar">${stream.streamerName.charAt(0).toUpperCase()}</div>
      <div class="glitch-channel-info">
        <div class="glitch-channel-name">${stream.streamerName}</div>
        <div class="glitch-channel-game">${stream.category}</div>
      </div>
      <div class="glitch-channel-status live">🔴 Live</div>
    `;
    sidebarList.appendChild(sidebarItem);
    
    // Grid item
    const gridItem = document.createElement('div');
    gridItem.className = 'glitch-stream-card';
    gridItem.onclick = () => watchPlayerStream(stream.streamId, stream.streamerName, stream.title, stream.category);
    gridItem.innerHTML = `
      <div class="glitch-card-thumbnail">
        📺
        <div class="glitch-card-live-tag">LIVE</div>
        <div class="glitch-card-viewers-tag">1 watcher</div>
      </div>
      <div class="glitch-card-content">
        <div class="glitch-card-avatar">${stream.streamerName.charAt(0).toUpperCase()}</div>
        <div class="glitch-card-meta">
          <div class="glitch-card-title">${stream.title}</div>
          <div class="glitch-card-streamer">${stream.streamerName}</div>
          <div class="glitch-card-category">${stream.category}</div>
        </div>
      </div>
    `;
    activeGrid.appendChild(gridItem);
  }
  
  // Render simulated mock streams (always live, unless filtered out by category)
  for (let key in GLITCH_MOCK_STREAMS) {
    const mock = GLITCH_MOCK_STREAMS[key];
    if (glitchCategoryFilter && mock.category !== glitchCategoryFilter) continue;
    
    // Grid item
    const gridItem = document.createElement('div');
    gridItem.className = 'glitch-stream-card';
    gridItem.onclick = () => watchMockStream(key, mock.name);
    gridItem.innerHTML = `
      <div class="glitch-card-thumbnail">
        ${mock.avatar}
        <div class="glitch-card-live-tag">LIVE</div>
        <div class="glitch-card-viewers-tag">${mock.viewers}</div>
      </div>
      <div class="glitch-card-content">
        <div class="glitch-card-avatar">${mock.avatar}</div>
        <div class="glitch-card-meta">
          <div class="glitch-card-title">${mock.title}</div>
          <div class="glitch-card-streamer">${mock.name}</div>
          <div class="glitch-card-category">${mock.category}</div>
        </div>
      </div>
    `;
    activeGrid.appendChild(gridItem);
  }
  
  if (playerStreamCount === 0 && !glitchCategoryFilter) {
    // Show nice helper message in grid if no player streams
    const emptyGridMsg = document.createElement('div');
    emptyGridMsg.className = 'no-streams-msg';
    emptyGridMsg.innerHTML = 'No active player streams. Check out the recommended mock channels or go live yourself!';
    activeGrid.prepend(emptyGridMsg);
  }
}

// Switch categories on home page
function setGlitchCategory(category) {
  if (glitchCategoryFilter === category) {
    glitchCategoryFilter = null; // Toggle off
  } else {
    glitchCategoryFilter = category;
  }
  
  // Update category cards active styling
  document.querySelectorAll('.glitch-category-card').forEach(el => {
    const name = el.querySelector('.cat-name').textContent;
    el.classList.toggle('active', glitchCategoryFilter === name);
  });
  
  renderGlitchChannels();
}

// Navigation between Home, Watch, and Dashboard pages
function switchGlitchPage(page) {
  glitchCurrentPage = page;
  
  document.querySelectorAll('.glitch-page').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.glitch-nav-item').forEach(el => el.classList.remove('active'));
  
  const targetPage = document.getElementById(`glitch-page-${page}`);
  if (targetPage) targetPage.style.display = 'flex';
  
  const targetNav = document.getElementById(`glitch-nav-${page}`);
  if (targetNav) targetNav.classList.add('active');
  
  // If leaving watch page, stop media stream
  if (page !== 'watch') {
    stopWatchingGlitchStream();
  }
  
  // If entering dashboard page and streaming, show preview canvas
  if (page === 'dashboard' && glitchStreaming) {
    document.getElementById('glitch-stream-canvas').style.display = 'block';
    document.querySelector('.glitch-preview-placeholder').style.display = 'none';
  }
}

// Watch real player WebRTC Stream
function watchPlayerStream(streamId, streamerName, title, category) {
  if (glitchStreaming || glitchWatching) return;
  
  switchGlitchPage('watch');
  glitchWatching = true;
  glitchStreamId = Number(streamId);
  
  // Setup UI details
  document.getElementById('glitch-watch-avatar').textContent = streamerName.charAt(0).toUpperCase();
  document.getElementById('glitch-watch-name').textContent = streamerName;
  document.getElementById('glitch-watch-title').textContent = title;
  document.getElementById('glitch-watch-category').textContent = category;
  document.getElementById('gp-viewers').textContent = '1 viewer';
  
  // Reset follow button
  const followBtn = document.querySelector('.glitch-follow-btn');
  followBtn.textContent = glitchFollowedChannels.has(streamerName) ? 'Following' : 'Follow';
  followBtn.classList.toggle('following', glitchFollowedChannels.has(streamerName));
  
  // Establish WebRTC connection
  nuiFetch("tryJoinStream", { streamId: glitchStreamId }).then(serverId => {
    if (serverId) {
      startGlitchWebRTCWatcher(glitchStreamId, serverId);
    } else {
      glitchWatching = false;
      addGlitchChatMessage("SYSTEM", "Failed to connect to stream. Channel offline.", "#ff3c00", "mod");
    }
  }).catch(() => {
    glitchWatching = false;
    addGlitchChatMessage("SYSTEM", "Offline standalone preview. Try simulated channels!", "#ff3c00", "mod");
  });
}

// Watch Simulated Stream (Plays looping stock video)
function watchMockStream(channelId, name) {
  if (glitchStreaming || glitchWatching) return;
  
  const mock = GLITCH_MOCK_STREAMS[channelId];
  if (!mock) return;
  
  switchGlitchPage('watch');
  glitchWatching = true;
  glitchSimulatedStreamId = channelId;
  
  // UI details
  document.getElementById('glitch-watch-avatar').textContent = mock.avatar;
  document.getElementById('glitch-watch-name').textContent = mock.name;
  document.getElementById('glitch-watch-title').textContent = mock.title;
  document.getElementById('glitch-watch-category').textContent = mock.category;
  document.getElementById('gp-viewers').textContent = `${mock.viewers} viewers`;
  
  // Reset follow button
  const followBtn = document.querySelector('.glitch-follow-btn');
  followBtn.textContent = glitchFollowedChannels.has(mock.name) ? 'Following' : 'Follow';
  followBtn.classList.toggle('following', glitchFollowedChannels.has(mock.name));
  
  // Show simulated video player, hide WebRTC player
  document.getElementById('glitch-video').style.display = 'none';
  const simulatedVideo = document.getElementById('glitch-video-simulated');
  simulatedVideo.style.display = 'block';
  simulatedVideo.src = mock.videoUrl;
  simulatedVideo.volume = document.getElementById('gp-volume').value;
  simulatedVideo.play().catch(() => {});
  
  // Clear chat logs and send welcome chat
  const chatMessages = document.getElementById('glitch-chat-messages');
  chatMessages.innerHTML = '';
  addGlitchChatMessage("GlitchBot", `Welcome to ${mock.name}'s stream chat room! Keep it friendly.`, "#9146ff", "mod");
  
  // Start simulated chat loop
  if (glitchMockChatInterval) clearInterval(glitchMockChatInterval);
  glitchMockChatInterval = setInterval(() => {
    if (!glitchWatching) return;
    const randomUser = GLITCH_MOCK_USERNAMES[Math.floor(Math.random() * GLITCH_MOCK_USERNAMES.length)];
    const randomComment = mock.chatComments[Math.floor(Math.random() * mock.chatComments.length)];
    const randomColor = GLITCH_USER_COLORS[Math.floor(Math.random() * GLITCH_USER_COLORS.length)];
    
    // Choose random badge
    const r = Math.random();
    let badge = "";
    if (r < 0.1) badge = "mod";
    else if (r < 0.25) badge = "vip";
    else if (r < 0.5) badge = "sub";
    
    addGlitchChatMessage(randomUser, randomComment, randomColor, badge);
  }, Math.random() * 4000 + 2000);
}

// Stop watching stream and clean players
function stopWatchingGlitchStream() {
  if (glitchMockChatInterval) {
    clearInterval(glitchMockChatInterval);
    glitchMockChatInterval = null;
  }
  
  if (glitchSimulatedStreamId) {
    const simulatedVideo = document.getElementById('glitch-video-simulated');
    simulatedVideo.pause();
    simulatedVideo.src = '';
    simulatedVideo.style.display = 'none';
    glitchSimulatedStreamId = null;
  }
  
  if (glitchWatching && glitchRTC) {
    nuiFetch("leaveStream", { streamId: glitchStreamId });
    glitchRTC.close();
    glitchRTC = null;
    
    const video = document.getElementById('glitch-video');
    video.pause();
    video.srcObject = null;
    video.style.display = 'none';
  }
  
  glitchWatching = false;
  glitchStreamId = 0;
  document.getElementById('glitch-chat-messages').innerHTML = '';
}

// Start Streamer's Live Stream
function startGlitchLive() {
  if (glitchStreaming || glitchWatching) return;
  
  const title = document.getElementById('glitch-input-title').value.trim() || 'My Awesome Live Stream';
  const category = document.getElementById('glitch-select-category').value;
  
  glitchStreaming = true;
  glitchStreamId = Date.now();
  
  // Show preview canvas
  const canvas = document.getElementById('glitch-stream-canvas');
  canvas.style.display = 'block';
  document.querySelector('.glitch-preview-placeholder').style.display = 'none';
  
  // Start canvas rendering from Game WebGL
  if (window.MainRender) {
    window.MainRender.renderToTarget(canvas);
  }
  
  // Send start event to client Lua
  nuiFetch("startStreaming", { streamId: glitchStreamId, title: title, category: category });
  
  // Update buttons
  document.getElementById('glitch-btn-start').style.display = 'none';
  document.getElementById('glitch-btn-stop').style.display = 'block';
  
  // Clear streamer chat
  document.getElementById('glitch-dashboard-chat-messages').innerHTML = '';
  addGlitchChatMessage("DASHBOARD", "You are now live! Start talking to your chat.", "#00f0ff", "mod", true);
}

// Stop Streamer's Live Stream
function stopGlitchLive() {
  if (!glitchStreaming) return;
  
  // Stop Lua/game camera
  nuiFetch("stopStream", { streamId: glitchStreamId });
  
  // Stop Three.js game rendering
  if (window.MainRender) {
    window.MainRender.stop();
  }
  
  // Reset preview elements
  const canvas = document.getElementById('glitch-stream-canvas');
  canvas.style.display = 'none';
  document.querySelector('.glitch-preview-placeholder').style.display = 'flex';
  
  // Close RTC connections
  for (let sid in glitchPeers) {
    if (glitchPeers[sid] && glitchPeers[sid].RTC) {
      glitchPeers[sid].RTC.close();
    }
  }
  glitchPeers = {};
  
  glitchStreaming = false;
  glitchStreamId = 0;
  
  // Update buttons
  document.getElementById('glitch-btn-start').style.display = 'block';
  document.getElementById('glitch-btn-stop').style.display = 'none';
  
  document.getElementById('glitch-dashboard-chat-messages').innerHTML = '';
}

// WebRTC Signaling Handlers (Called by handleGlitchMessage)
function handleGlitchMessage(data) {
  switch (data.type) {
    case 'chatentry':
      if (data.streamId === glitchStreamId) {
        addGlitchChatMessage(data.sender || "User", data.message, "#adadb8", "");
      }
      break;
    case 'newStream':
      glitchActiveStreams[String(data.stream.streamId)] = data.stream;
      renderGlitchChannels();
      break;
    case 'stopstream':
      if (glitchStreamId === Number(data.streamId)) {
        addGlitchChatMessage("SYSTEM", "The streamer has ended the broadcast.", "#ff3c00", "mod");
        stopWatchingGlitchStream();
      }
      break;
    case 'joinstream':
      // Streamer side: Watcher joined
      setupStreamerPeerForWatcher(data);
      break;
    case 'receiveoffer':
      // Watcher side: Offer received
      handleStreamerRTCOffer(data);
      break;
    case 'receiveanswer':
      // Streamer side: Answer received
      handleWatcherRTCAnswer(data);
      break;
    case 'icecandidatestreamer':
      // Watcher side: Streamer candidate
      if (glitchRTC) {
        let candidate = new RTCIceCandidate(data.candidate);
        glitchRTC.addIceCandidate(candidate).catch(e => console.error(e));
      }
      break;
    case 'icecandidatewatcher':
      // Streamer side: Watcher candidate
      if (glitchPeers[data.serverid] && glitchPeers[data.serverid].RTC) {
        let candidate = new RTCIceCandidate(data.candidate);
        glitchPeers[data.serverid].RTC.addIceCandidate(candidate).catch(e => console.error(e));
      }
      break;
    case 'leavestream':
      // Streamer side: Watcher left
      if (glitchPeers[data.serverid]) {
        if (glitchPeers[data.serverid].RTC) glitchPeers[data.serverid].RTC.close();
        delete glitchPeers[data.serverid];
      }
      break;
    case 'cameraStopped':
      // Game camera closed via backspace/ESC
      stopGlitchLive();
      break;
  }
}

// WebRTC Watcher side: Initiate connection
async function startGlitchWebRTCWatcher(id, serverid) {
  if (glitchRTC) glitchRTC.close();
  glitchRTC = new RTCPeerConnection(GLITCH_RTC_SERVERS);
  
  const video = document.getElementById('glitch-video');
  video.srcObject = new MediaStream();
  
  glitchRTC.onicecandidate = (event) => {
    if (event.candidate) {
      let candidate = new RTCIceCandidate(event.candidate);
      nuiFetch("newIceCandidateWatcher", { streamId: id, candidate: candidate, serverid: serverid });
    }
  };
  
  glitchRTC.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => {
      video.srcObject.addTrack(track);
    });
  };
  
  nuiFetch("joinStream", { streamId: id, serverid: serverid });
}

// WebRTC Watcher side: Handle offer
async function handleStreamerRTCOffer(data) {
  if (!glitchRTC) return;
  
  let sessionDesc = new RTCSessionDescription(data.offer);
  await glitchRTC.setRemoteDescription(sessionDesc);
  
  let candidateAnswer = await glitchRTC.createAnswer();
  await glitchRTC.setLocalDescription(candidateAnswer);
  
  let answerObject = {
    sdp: candidateAnswer.sdp,
    type: candidateAnswer.type
  };
  
  nuiFetch("sendRTCAnswer", { streamId: data.streamId, serverid: data.serverid, answer: answerObject });
}

// WebRTC Streamer side: Set up peer for incoming watcher
async function setupStreamerPeerForWatcher(data) {
  if (!glitchStreaming || glitchWatching) return;
  if (glitchPeers[data.serverid]) return;
  
  glitchPeers[data.serverid] = { serverid: data.serverid, RTC: null, ready: false };
  glitchPeers[data.serverid].RTC = new RTCPeerConnection(GLITCH_RTC_SERVERS);
  
  glitchPeers[data.serverid].RTC.onicecandidate = (event) => {
    if (event.candidate) {
      let candidate = new RTCIceCandidate(event.candidate);
      nuiFetch("newIceCandidateStreamer", { streamId: data.streamId, serverid: data.serverid, candidate: candidate });
    }
  };
  
  const canvas = document.getElementById('glitch-stream-canvas');
  let stream = canvas.captureStream(30);
  
  stream.getTracks().forEach(track => {
    glitchPeers[data.serverid].RTC.addTrack(track, stream);
  });
  
  let candidateOffer = await glitchPeers[data.serverid].RTC.createOffer();
  await glitchPeers[data.serverid].RTC.setLocalDescription(candidateOffer);
  
  let offerObject = {
    sdp: candidateOffer.sdp,
    type: candidateOffer.type
  };
  
  nuiFetch("sendRTCOffer", { streamId: data.streamId, serverid: data.serverid, offer: offerObject });
}

// WebRTC Streamer side: Handle answer
async function handleWatcherRTCAnswer(data) {
  if (glitchPeers[data.serverid]) {
    let answer = new RTCSessionDescription(data.answer);
    await glitchPeers[data.serverid].RTC.setRemoteDescription(answer);
    glitchPeers[data.serverid].ready = true;
  }
}

// Send chat message
function sendGlitchChatMessage(text, asStreamer = false) {
  if (!text || text.trim() === '') return;
  
  if (glitchSimulatedStreamId) {
    // Simulated stream: show user chat instantly
    addGlitchChatMessage("You", text, "#e2b6ff", "sub");
  } else {
    // Real stream: send via server signaling
    nuiFetch("sendChatMessage", { streamId: glitchStreamId, message: text });
  }
}

// Add chat message UI entry
function addGlitchChatMessage(sender, text, color, badge = "", isDashboard = false) {
  const container = document.getElementById(isDashboard ? 'glitch-dashboard-chat-messages' : 'glitch-chat-messages');
  if (!container) return;
  
  const msgEl = document.createElement('div');
  msgEl.className = 'glitch-chat-entry';
  
  let badgeEl = '';
  if (badge === 'mod') {
    badgeEl = '<span class="glitch-chat-badge badge-mod">Mod</span>';
  } else if (badge === 'vip') {
    badgeEl = '<span class="glitch-chat-badge badge-vip">VIP</span>';
  } else if (badge === 'sub') {
    badgeEl = '<span class="glitch-chat-badge badge-sub">Sub</span>';
  }
  
  msgEl.innerHTML = `
    ${badgeEl}
    <span class="glitch-chat-username" style="color:${color}">${sender}:</span>
    <span class="glitch-chat-text">${text}</span>
  `;
  
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

// Follow/Unfollow channels
function toggleFollow(btn) {
  const channelName = document.getElementById('glitch-watch-name').textContent;
  if (glitchFollowedChannels.has(channelName)) {
    glitchFollowedChannels.delete(channelName);
    btn.textContent = 'Follow';
    btn.classList.remove('following');
  } else {
    glitchFollowedChannels.add(channelName);
    btn.textContent = 'Following';
    btn.classList.add('following');
  }
}

// Setup Event Listeners for Glitch
document.addEventListener('DOMContentLoaded', () => {
  // Go Live Button
  document.getElementById('glitch-btn-start').addEventListener('click', startGlitchLive);
  // Stop Live Button
  document.getElementById('glitch-btn-stop').addEventListener('click', stopGlitchLive);
  
  // Watch Chat Send
  const watchInput = document.getElementById('glitch-chat-input');
  const watchSendBtn = document.getElementById('glitch-chat-send');
  
  const triggerWatchSend = () => {
    const text = watchInput.value.trim();
    if (text !== '') {
      sendGlitchChatMessage(text, false);
      watchInput.value = '';
    }
  };
  if (watchSendBtn) watchSendBtn.addEventListener('click', triggerWatchSend);
  if (watchInput) watchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerWatchSend();
  });
  
  // Streamer Dashboard Chat Send
  const dashInput = document.getElementById('glitch-dashboard-chat-input');
  const dashSendBtn = document.getElementById('glitch-dashboard-chat-send');
  
  const triggerDashSend = () => {
    const text = dashInput.value.trim();
    if (text !== '') {
      sendGlitchChatMessage(text, true);
      dashInput.value = '';
    }
  };
  if (dashSendBtn) dashSendBtn.addEventListener('click', triggerDashSend);
  if (dashInput) dashInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerDashSend();
  });

  // Custom Video Player Controls
  const videoPlayer = document.getElementById('glitch-video');
  const simulatedPlayer = document.getElementById('glitch-video-simulated');
  const playBtn = document.getElementById('gp-play-btn');
  const muteBtn = document.getElementById('gp-mute-btn');
  const volumeSlider = document.getElementById('gp-volume');
  const fsBtn = document.getElementById('gp-fs-btn');
  
  // Play/Pause
  if (playBtn) playBtn.addEventListener('click', () => {
    const player = glitchSimulatedStreamId ? simulatedPlayer : videoPlayer;
    if (player.paused) {
      player.play().catch(() => {});
      playBtn.textContent = '⏸';
    } else {
      player.pause();
      playBtn.textContent = '▶';
    }
  });
  
  // Mute/Unmute
  if (muteBtn) muteBtn.addEventListener('click', () => {
    const player = glitchSimulatedStreamId ? simulatedPlayer : videoPlayer;
    player.muted = !player.muted;
    muteBtn.textContent = player.muted ? '🔇' : '🔊';
  });
  
  // Volume slider
  if (volumeSlider) volumeSlider.addEventListener('input', () => {
    const player = glitchSimulatedStreamId ? simulatedPlayer : videoPlayer;
    player.volume = volumeSlider.value;
    player.muted = volumeSlider.value == 0;
    muteBtn.textContent = player.muted ? '🔇' : '🔊';
  });
  
  // Fullscreen
  if (fsBtn) fsBtn.addEventListener('click', () => {
    const player = glitchSimulatedStreamId ? simulatedPlayer : videoPlayer;
    if (player.requestFullscreen) {
      player.requestFullscreen();
    } else if (player.webkitRequestFullscreen) {
      player.webkitRequestFullscreen();
    }
  });
});

/* ============================================================
   LIVE TV APP LOGIC
   ============================================================ */
let tvChannels = [];
let tvCategories = [];
let tvSelectedCategory = 'All';
let tvSelectedChannelId = null;
let tvHlsInstance = null;

function initLiveTV() {
  tvSelectedCategory = 'All';
  tvSelectedChannelId = null;
  document.getElementById('livetv-search-input').value = '';
  
  // Close any running streams first
  closeTvPlayer();
  
  // Fetch channels list
  nuiFetch('getTvChannels', {}).then(channels => {
    tvChannels = channels || [];
    
    // Extract unique categories
    const cats = new Set();
    tvChannels.forEach(c => {
      if (c.category) cats.add(c.category);
    });
    tvCategories = Array.from(cats);
    
    renderTvCategories();
    selectTvCategory('All');
  }).catch(() => {
    // Standalone fallback
    tvChannels = [
      { id: 1, name: "Weazel News Live", category: "News", url: "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8", logo: "📰" },
      { id: 2, name: "NASA Space TV", category: "Science", url: "https://ntv1.akamaized.net/hls/live/2014027/NASA-GUIDE-1/master.m3u8", logo: "🚀" },
      { id: 3, name: "Los Santos Music Channel", category: "Music", url: "https://d2zihajmogu5jn.cloudfront.net/bipbop/bipbop.m3u8", logo: "🎵" },
      { id: 4, name: "Maze Bank Sports", category: "Sports", url: "https://rbmn-live.akamaized.net/hls/live/590964/sports/master.m3u8", logo: "⚽" }
    ];
    
    const cats = new Set();
    tvChannels.forEach(c => {
      if (c.category) cats.add(c.category);
    });
    tvCategories = Array.from(cats);
    
    renderTvCategories();
    selectTvCategory('All');
  });
}

function renderTvCategories() {
  const container = document.getElementById('livetv-sidebar-categories');
  if (!container) return;
  container.innerHTML = '';
  
  // Add 'All' category
  const allEl = document.createElement('div');
  allEl.className = 'livetv-cat-item' + (tvSelectedCategory === 'All' ? ' active' : '');
  allEl.innerHTML = `<span>📂</span> All`;
  allEl.onclick = () => selectTvCategory('All');
  container.appendChild(allEl);
  
  tvCategories.forEach(cat => {
    const el = document.createElement('div');
    el.className = 'livetv-cat-item' + (tvSelectedCategory === cat ? ' active' : '');
    
    let emoji = '📁';
    if (cat.toLowerCase().includes('news')) emoji = '📰';
    else if (cat.toLowerCase().includes('sport')) emoji = '⚽';
    else if (cat.toLowerCase().includes('music')) emoji = '🎵';
    else if (cat.toLowerCase().includes('science')) emoji = '🚀';
    else if (cat.toLowerCase().includes('movie') || cat.toLowerCase().includes('cinema')) emoji = '🍿';
    else if (cat.toLowerCase().includes('game') || cat.toLowerCase().includes('play')) emoji = '🎮';
    
    el.innerHTML = `<span>${emoji}</span> ${cat}`;
    el.onclick = () => selectTvCategory(cat);
    container.appendChild(el);
  });
}

function selectTvCategory(cat) {
  tvSelectedCategory = cat;
  
  // Update categories visual active state
  document.querySelectorAll('#livetv-sidebar-categories .livetv-cat-item').forEach(el => {
    const isMatched = el.textContent.trim().toLowerCase().endsWith(cat.toLowerCase()) || 
                      (cat === 'All' && el.textContent.trim().toLowerCase().endsWith('all'));
    el.classList.toggle('active', isMatched);
  });
  
  // Re-render category title (view.php style)
  document.getElementById('livetv-current-category').textContent = cat;
  
  // Render channels under this category
  renderTvChannels();
}

function renderTvChannels(filterWord = '') {
  const container = document.getElementById('livetv-sidebar-channels');
  if (!container) return;
  container.innerHTML = '';
  
  const searchVal = (filterWord || document.getElementById('livetv-search-input').value).toLowerCase();
  
  const filtered = tvChannels.filter(ch => {
    const catMatch = tvSelectedCategory === 'All' || ch.category.toLowerCase() === tvSelectedCategory.toLowerCase();
    const searchMatch = ch.name.toLowerCase().includes(searchVal) || ch.category.toLowerCase().includes(searchVal);
    return catMatch && searchMatch;
  });
  
  if (filtered.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.style.padding = '10px';
    emptyEl.style.fontSize = '11px';
    emptyEl.style.color = 'var(--text-dim)';
    emptyEl.style.textAlign = 'center';
    emptyEl.textContent = 'No channels found.';
    container.appendChild(emptyEl);
    return;
  }
  
  filtered.forEach(ch => {
    const el = document.createElement('div');
    el.className = 'livetv-channel-item' + (tvSelectedChannelId === ch.id ? ' active' : '');
    el.innerHTML = `
      <div class="livetv-ch-logo">${ch.logo || '📺'}</div>
      <div class="livetv-ch-info">
        <div class="livetv-ch-name">${ch.name}</div>
        <div class="livetv-ch-cat">${ch.category}</div>
      </div>
      <button class="livetv-ch-del" title="Delete Channel" onclick="event.stopPropagation(); deleteTvChannel(${ch.id})">✕</button>
    `;
    el.onclick = () => playTvChannel(ch);
    container.appendChild(el);
  });
}

function filterTvChannels() {
  renderTvChannels();
}

function playTvChannel(ch) {
  tvSelectedChannelId = ch.id;
  
  // Highlight chosen channel in sidebar
  document.querySelectorAll('#livetv-sidebar-channels .livetv-channel-item').forEach(el => {
    const nameEl = el.querySelector('.livetv-ch-name');
    const isCurrent = nameEl && nameEl.textContent === ch.name;
    el.classList.toggle('active', isCurrent);
  });
  
  closeTvPlayer();
  
  const container = document.getElementById('livetv-player-container');
  if (!container) return;
  container.innerHTML = '';
  
  const url = ch.url.trim();
  
  // Check if it's a YouTube link
  let ytId = null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch) ytId = ytMatch[1];
  
  if (ytId) {
    // Render iframe for youtube
    const iframe = document.createElement('iframe');
    iframe.className = 'livetv-iframe-tag';
    iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&rel=0`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    container.appendChild(iframe);
  } else if (url.includes('.m3u8') || url.includes('/master') || url.includes('/playlist')) {
    // Render HTML5 video with HLS.js
    const video = document.createElement('video');
    video.className = 'livetv-video-tag';
    video.controls = true;
    video.autoplay = true;
    container.appendChild(video);
    
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      tvHlsInstance = new Hls();
      tvHlsInstance.loadSource(url);
      tvHlsInstance.attachMedia(video);
      tvHlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play().catch(() => {});
      });
      tvHlsInstance.on(Hls.Events.ERROR, function(event, data) {
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS: Network error, trying recovery...");
              tvHlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS: Media error, trying recovery...");
              tvHlsInstance.recoverMediaError();
              break;
            default:
              console.error("HLS: Unrecoverable error");
              closeTvPlayer();
              showTvPlayerError("Failed to decode video stream.");
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari/iOS native HLS support
      video.src = url;
      video.addEventListener('loadedmetadata', function() {
        video.play().catch(() => {});
      });
    } else {
      showTvPlayerError("HLS playback is not supported on this browser.");
    }
  } else {
    // Fallback: standard HTML5 video tag or iframe
    const isDirectVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');
    if (isDirectVideo) {
      const video = document.createElement('video');
      video.className = 'livetv-video-tag';
      video.src = url;
      video.controls = true;
      video.autoplay = true;
      container.appendChild(video);
    } else {
      // General iframe fallback
      const iframe = document.createElement('iframe');
      iframe.className = 'livetv-iframe-tag';
      iframe.src = url;
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
    }
  }
}

function showTvPlayerError(message) {
  const container = document.getElementById('livetv-player-container');
  if (container) {
    container.innerHTML = `
      <div class="livetv-placeholder" style="color:#ff4d4d">
        <span class="livetv-placeholder-icon">⚠️</span>
        <h2>Playback Error</h2>
        <p>${message}</p>
      </div>
    `;
  }
}

function closeTvPlayer() {
  if (tvHlsInstance) {
    tvHlsInstance.destroy();
    tvHlsInstance = null;
  }
  const container = document.getElementById('livetv-player-container');
  if (container) {
    container.innerHTML = `
      <div class="livetv-placeholder">
        <span class="livetv-placeholder-icon">📺</span>
        <h2>Select a Channel</h2>
        <p>Choose a category and select a TV channel from the sidebar list to start streaming live content.</p>
      </div>
    `;
  }
}

function closeLiveTV() {
  closeTvPlayer();
  closeAddTvModal();
}

function openAddTvModal() {
  const modal = document.getElementById('livetv-add-modal');
  if (modal) modal.classList.add('show');
}

function closeAddTvModal() {
  const modal = document.getElementById('livetv-add-modal');
  if (modal) modal.classList.remove('show');
  // Clear inputs
  const nameInp = document.getElementById('livetv-input-name');
  const catInp = document.getElementById('livetv-input-category');
  const urlInp = document.getElementById('livetv-input-url');
  const logoInp = document.getElementById('livetv-input-logo');
  
  if (nameInp) nameInp.value = '';
  if (catInp) catInp.value = '';
  if (urlInp) urlInp.value = '';
  if (logoInp) logoInp.value = '📺';
}

function submitAddTvChannel() {
  const name = document.getElementById('livetv-input-name').value.trim();
  const category = document.getElementById('livetv-input-category').value.trim();
  const url = document.getElementById('livetv-input-url').value.trim();
  const logo = document.getElementById('livetv-input-logo').value.trim() || '📺';
  
  if (!name || !category || !url) {
    if (IN_FIVEM) nuiFetch('notify', { text: 'All fields are required!', type: 'error' });
    else alert('All fields are required!');
    return;
  }
  
  const data = { name, category, url, logo };
  
  nuiFetch('addTvChannel', data).then(() => {
    closeAddTvModal();
  }).catch(() => {
    // Standalone fallback: simulate network event addition
    const fakeId = tvChannels.length > 0 ? Math.max(...tvChannels.map(c => c.id)) + 1 : 1;
    handleNetworkAddTvChannel({ id: fakeId, ...data });
    closeAddTvModal();
  });
}

function deleteTvChannel(id) {
  nuiFetch('deleteTvChannel', { id: id }).then(() => {
    // Wait for server event callback
  }).catch(() => {
    // Standalone fallback
    handleNetworkDeleteTvChannel(id);
  });
}

function handleNetworkAddTvChannel(channel) {
  if (!tvChannels.some(c => c.id === channel.id)) {
    tvChannels.push(channel);
    
    // Recalculate categories
    const cats = new Set(tvChannels.map(c => c.category));
    tvCategories = Array.from(cats);
    
    renderTvCategories();
    renderTvChannels();
    
    if (IN_FIVEM) nuiFetch('notify', { text: `Channel '${channel.name}' added.`, type: 'success' });
  }
}

function handleNetworkDeleteTvChannel(channelId) {
  const idNum = Number(channelId);
  const index = tvChannels.findIndex(c => c.id === idNum);
  if (index !== -1) {
    const deletedName = tvChannels[index].name;
    tvChannels.splice(index, 1);
    
    // If deleted channel was currently playing, close the player
    if (tvSelectedChannelId === idNum) {
      closeTvPlayer();
      tvSelectedChannelId = null;
    }
    
    // Recalculate categories
    const cats = new Set(tvChannels.map(c => c.category));
    tvCategories = Array.from(cats);
    
    // If the selected category is no longer present, reset filter
    if (tvSelectedCategory !== 'All' && !tvCategories.includes(tvSelectedCategory)) {
      tvSelectedCategory = 'All';
    }
    
    renderTvCategories();
    renderTvChannels();
    
    if (IN_FIVEM) nuiFetch('notify', { text: `Channel '${deletedName}' deleted.`, type: 'success' });
  }
}

/* ═══════════════════════════════════════════════════
   NOTIFICATION SYSTEM LOGIC
   ═══════════════════════════════════════════════════ */

let notificationsHistory = [];
let unreadNotificationsCount = 0;
let newsAlerts = [];
let weatherAlerts = [];
let temperatureAlerts = [];
let currentSystemWeather = "Clear";
let currentSystemTemp = 22;
let notificationsEnabled = true;
let nextNotificationTimeout = null;
const TemperatureUnit = 'C';

// Parse XML files
async function loadNotificationData() {
  try {
    // Load News
    const newsRes = await fetch('data/News_EN.xml');
    if (newsRes.ok) {
      const newsXmlText = await newsRes.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(newsXmlText, "text/xml");
      const categories = xmlDoc.getElementsByTagName("Category");
      
      newsAlerts = [];
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const catId = cat.getAttribute("id");
        const title = cat.getAttribute("title") || "Weazel News";
        const subtitle = cat.getAttribute("subtitle") || "Breaking News";
        const items = cat.getElementsByTagName("Item");
        for (let j = 0; j < items.length; j++) {
          const entry = items[j].getElementsByTagName("Entry")[0]?.textContent;
          if (entry) {
            newsAlerts.push({ catId, title, subtitle, entry });
          }
        }
      }
    }

    // Load Weather
    const weatherRes = await fetch('data/Weather_EN.xml');
    if (weatherRes.ok) {
      const weatherXmlText = await weatherRes.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(weatherXmlText, "text/xml");
      const lines = xmlDoc.getElementsByTagName("Line");
      
      weatherAlerts = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const weatherType = line.getAttribute("weather");
        const text = line.textContent;
        if (text) {
          weatherAlerts.push({ weatherType, text });
        }
      }
    }

    // Load Temperature
    const tempRes = await fetch('data/Temperature_EN.xml');
    if (tempRes.ok) {
      const tempXmlText = await tempRes.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(tempXmlText, "text/xml");
      const ranges = xmlDoc.getElementsByTagName("Range");
      
      temperatureAlerts = [];
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const rangeId = range.getAttribute("id");
        const minTemp = parseInt(range.getAttribute("min") || "0", 10);
        const maxTemp = parseInt(range.getAttribute("max") || "30", 10);
        const icon = range.getAttribute("icon") || "temp_mild";
        const lines = range.getElementsByTagName("Line");
        for (let j = 0; j < lines.length; j++) {
          const text = lines[j].textContent;
          if (text) {
            temperatureAlerts.push({ rangeId, minTemp, maxTemp, icon, text });
          }
        }
      }
    }

    console.log(`[Notification System] Loaded ${newsAlerts.length} news items, ${weatherAlerts.length} weather items, ${temperatureAlerts.length} temp items.`);
    
    // Initialize UI elements
    updateWeatherWidget();
    setupNotificationSettingsToggle();
    
    // Start notification timers
    scheduleNextNotification();
    
    // Populate dynamic City News app
    renderDynamicNewsFeed();

  } catch (err) {
    console.error("[Notification System] Error loading XML data:", err);
  }
}

// Map category ID to emoji
function getCategoryEmoji(catId) {
  const mapping = {
    crime: "🚨",
    police: "👮",
    politics: "🏛️",
    economy: "📈",
    traffic: "🚗",
    entertainment: "🎬",
    sports: "⚽",
    tech: "📱",
    wanted1: "👮",
    wanted2: "👮",
    wanted3: "👮",
    wanted4: "👮",
    wanted5: "🚨",
    civilian_incident: "🚑",
    civilian_multiple: "🚨",
    weather: "🌤️",
    temperature: "🌡️"
  };
  return mapping[catId] || "🔔";
}

// Generate random notification
function generateRandomNotification() {
  const isComputerOpen = document.getElementById('desktop').style.display !== 'none';
  if (!isComputerOpen || !notificationsEnabled) {
    scheduleNextNotification();
    return;
  }

  const typeChance = Math.random();
  let title = "";
  let subtitle = "";
  let content = "";
  let catId = "news";
  let icon = "🔔";

  if (typeChance < 0.6 && newsAlerts.length > 0) {
    const item = newsAlerts[Math.floor(Math.random() * newsAlerts.length)];
    title = item.title;
    subtitle = item.subtitle;
    content = item.entry;
    catId = item.catId;
    icon = getCategoryEmoji(catId);
  } else if (typeChance < 0.8 && weatherAlerts.length > 0) {
    const item = weatherAlerts[Math.floor(Math.random() * weatherAlerts.length)];
    title = "Weazel Weather";
    subtitle = "Local Forecast";
    content = item.text;
    catId = "weather";
    icon = "🌤️";
    currentSystemWeather = item.weatherType;
    updateWeatherWidget();
  } else if (temperatureAlerts.length > 0) {
    const item = temperatureAlerts[Math.floor(Math.random() * temperatureAlerts.length)];
    const tempVal = Math.floor(Math.random() * (item.maxTemp - item.minTemp + 1)) + item.minTemp;
    title = "Temperature Alert";
    subtitle = "Current Conditions";
    content = `${item.text} Temperature is ${tempVal}°${TemperatureUnit}.`;
    catId = "temperature";
    icon = "🌡️";
    currentSystemTemp = tempVal;
    updateWeatherWidget();
  }

  showNotification(title, subtitle, content, catId, icon);
  scheduleNextNotification();
}

// Schedule next notification (randomized between 50 and 100 seconds)
function scheduleNextNotification() {
  if (nextNotificationTimeout) clearTimeout(nextNotificationTimeout);
  const minTime = 50 * 1000;
  const maxTime = 100 * 1000;
  const nextTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  nextNotificationTimeout = setTimeout(generateRandomNotification, nextTime);
}

// Show a notification toast
function showNotification(title, subtitle, content, catId, icon) {
  const container = document.getElementById('notifications-container');
  if (!container) return;

  const id = Date.now();
  const toast = document.createElement('div');
  toast.className = `toast-notification ${catId}`;
  toast.id = `toast-${id}`;
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <div class="toast-header">
        <span class="toast-title">${title} • ${subtitle}</span>
        <span class="toast-time">Just now</span>
      </div>
      <div class="toast-content">${content}</div>
    </div>
    <button class="toast-close" onclick="closeToast(${id})">✕</button>
  `;

  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
    playNotificationChime();
  }, 50);

  setTimeout(() => {
    closeToast(id);
  }, 8000);

  addNotificationToHistory(title, subtitle, content, catId, icon);
}

// Close a single toast
function closeToast(id) {
  const toast = document.getElementById(`toast-${id}`);
  if (!toast) return;
  toast.classList.remove('show');
  toast.classList.add('hide');
  setTimeout(() => {
    toast.remove();
  }, 400);
}

// Notification chime synthesizer
function playNotificationChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    gain1.gain.setValueAtTime(0, audioCtx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.35);
    
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0, audioCtx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    
    osc2.start(audioCtx.currentTime + 0.12);
    osc2.stop(audioCtx.currentTime + 0.50);
  } catch (e) {
    console.warn("Chime generation failed:", e);
  }
}

// Add to Notification Center history
function addNotificationToHistory(title, subtitle, content, catId, icon) {
  const item = {
    id: Date.now(),
    title,
    subtitle,
    content,
    catId,
    icon,
    time: new Date()
  };
  
  notificationsHistory.unshift(item);
  
  if (notificationsHistory.length > 20) {
    notificationsHistory.pop();
  }
  
  unreadNotificationsCount++;
  updateBellBadge();
  renderNotificationCenter();
}

// Update the unread badge
function updateBellBadge() {
  const badge = document.getElementById('bell-badge');
  if (!badge) return;
  
  if (unreadNotificationsCount > 0) {
    badge.textContent = unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Format relative time
function getRelativeTimeString(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// Render the Notification Center list
function renderNotificationCenter() {
  const list = document.getElementById('nc-list');
  if (!list) return;
  
  if (notificationsHistory.length === 0) {
    list.innerHTML = `<div class="nc-empty">No new notifications</div>`;
    return;
  }
  
  list.innerHTML = notificationsHistory.map(item => `
    <div class="nc-item" id="nc-item-${item.id}">
      <div class="nc-item-icon">${item.icon}</div>
      <div class="nc-item-body">
        <div class="nc-item-header">
          <span class="nc-item-title">${item.title} • ${item.subtitle}</span>
          <span class="nc-item-time">${getRelativeTimeString(item.time)}</span>
        </div>
        <div class="nc-item-content">${item.content}</div>
      </div>
      <button class="nc-item-delete" onclick="deleteHistoryItem(${item.id})">✕</button>
    </div>
  `).join('');
}

// Delete single item from history
function deleteHistoryItem(id) {
  const index = notificationsHistory.findIndex(item => item.id === id);
  if (index !== -1) {
    notificationsHistory.splice(index, 1);
    renderNotificationCenter();
  }
}

// Clear all notifications
function clearAllNotifications() {
  notificationsHistory = [];
  unreadNotificationsCount = 0;
  updateBellBadge();
  renderNotificationCenter();
}

// Toggle Notification Center Panel
function toggleNotificationCenter(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('notification-center');
  if (!panel) return;
  
  closeStart();
  
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
  } else {
    panel.classList.add('open');
    unreadNotificationsCount = 0;
    updateBellBadge();
    renderNotificationCenter();
  }
}

// Close Notification Center if clicked outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notification-center');
  const bell = document.getElementById('tray-bell');
  if (panel && panel.classList.contains('open')) {
    if (!panel.contains(e.target) && !bell.contains(e.target)) {
      panel.classList.remove('open');
    }
  }
});

// Weather Widget Update
function updateWeatherWidget() {
  const widgetIcon = document.getElementById('weather-widget-icon');
  const widgetTemp = document.getElementById('weather-widget-temp');
  if (!widgetIcon || !widgetTemp) return;
  
  const weatherIcons = {
    ExtraSunny: "☀️",
    Clear: "☀️",
    Clouds: "⛅",
    Overcast: "☁️",
    Raining: "🌧️",
    ThunderStorm: "⛈️",
    Foggy: "🌫️",
    Smog: "😷"
  };
  
  widgetIcon.textContent = weatherIcons[currentSystemWeather] || "☀️";
  widgetTemp.textContent = `${currentSystemTemp}°C`;
}

// Dynamic Settings Toggle for Notifications
function setupNotificationSettingsToggle() {
  const settingsCard = document.querySelector('.sn-item[onclick*="system"]');
  if (settingsCard) {
    const origRender = renderSettingsPage;
    renderSettingsPage = function(page) {
      origRender(page);
      if (page === 'system') {
        const toggle = document.querySelector('#settings-content input[type="checkbox"]');
        if (toggle) {
          toggle.checked = notificationsEnabled;
          toggle.onchange = function() {
            notificationsEnabled = this.checked;
            console.log(`[Notification System] Enabled: ${notificationsEnabled}`);
          };
        }
      }
    };
  }
}

// Dynamic News Feed Generator for Browser
function renderDynamicNewsFeed() {
  brPages.news = () => {
    if (newsAlerts.length === 0) {
      return `
        <div class="page-hero">
          <h1>📰 Los Santos City News</h1>
          <p>Your trusted source for local events, crime reports, and city updates.</p>
        </div>
        <div class="news-grid">
          <div class="news-card">
            <h3>No news available</h3>
            <p>Please check back later.</p>
          </div>
        </div>`;
    }

    const displayAlerts = [];
    const tempAlerts = [...newsAlerts];
    
    for (let i = 0; i < 4; i++) {
      if (tempAlerts.length > 0) {
        const index = (i * 3) % tempAlerts.length;
        displayAlerts.push(tempAlerts.splice(index, 1)[0]);
      }
    }

    const tagColors = {
      crime: "breaking",
      police: "crime",
      wanted1: "breaking",
      wanted2: "breaking",
      wanted3: "breaking",
      wanted4: "breaking",
      wanted5: "breaking",
      civilian_incident: "breaking",
      civilian_multiple: "breaking",
      politics: "local",
      economy: "crime",
      traffic: "crime",
      entertainment: "local",
      sports: "local",
      tech: "local"
    };

    return `
      <div class="page-hero">
        <h1>📰 Los Santos City News</h1>
        <p>Your trusted source for local events, crime reports, and city updates.</p>
      </div>
      <div class="news-grid">
        ${displayAlerts.map(a => `
          <div class="news-card">
            <div class="tag ${tagColors[a.catId] || 'local'}">${a.title.toUpperCase()}</div>
            <h3>${a.subtitle}</h3>
            <p>${a.entry}</p>
          </div>
        `).join('')}
      </div>
    `;
  };
}

// Expose globals for HTML clicks
window.toggleNotificationCenter = toggleNotificationCenter;
window.clearAllNotifications = clearAllNotifications;
window.closeToast = closeToast;
window.deleteHistoryItem = deleteHistoryItem;

// Start the loading
loadNotificationData();

/* ═══════════════════════════════════════════════════
   CCTV APP SYSTEM LOGIC
   ═══════════════════════════════════════════════════ */

let cctvCamerasList = [];
let cctvActiveCameraId = null;
let cctvDragStart = null;
let cctvHudTimer = null;

async function initCctv() {
  refreshCctvList();
  setupCctvHudClock();
}

async function refreshCctvList() {
  const refreshBtn = document.querySelector('.cctv-refresh-btn');
  if (refreshBtn) refreshBtn.classList.add('loading');

  try {
    const listArea = document.getElementById('cctv-list-area');
    if (!listArea) return;
    
    listArea.innerHTML = `<div class="nc-empty" style="padding:20px;">Scanning network...</div>`;
    
    let cams = [];
    if (IN_FIVEM) {
      cams = await nuiFetch('cctvGetCameras', {}) || [];
    } else {
      cams = [
        { id: "pacific", name: "Pacific Standard Bank", group: "Downtown", destroyed: false, isMock: true },
        { id: "mazebank", name: "Maze Bank Plaza", group: "Downtown", destroyed: false, isMock: true },
        { id: "police", name: "Vespucci Police Dept", group: "Vespucci", destroyed: false, isMock: true },
        { id: "jewelry", name: "Vangelico Jewelry", group: "Rockford Hills", destroyed: false, isMock: true },
        { id: "airport", name: "LS International Airport", group: "LSIA", destroyed: false, isMock: true },
        { id: "legion", name: "Legion Square Park", group: "Downtown", destroyed: false, isMock: true }
      ];
    }
    
    cctvCamerasList = cams;
    renderCctvList();
  } catch (err) {
    console.error("CCTV list fetch error:", err);
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('loading');
  }
}

function renderCctvList() {
  const listArea = document.getElementById('cctv-list-area');
  if (!listArea) return;
  
  if (cctvCamerasList.length === 0) {
    listArea.innerHTML = `<div class="nc-empty" style="padding:20px;">No cameras detected</div>`;
    return;
  }
  
  listArea.innerHTML = cctvCamerasList.map(cam => {
    const statusText = cam.destroyed ? "OFFLINE" : "ONLINE";
    const statusClass = cam.destroyed ? "offline" : "online";
    const activeClass = (cctvActiveCameraId === cam.id) ? "active" : "";
    
    return `
      <div class="cctv-item ${activeClass}" onclick="selectCctvCamera('${cam.id}')">
        <div class="cctv-item-header">
          <span class="cctv-item-title">${cam.name}</span>
          <span class="cctv-item-status ${statusClass}">${statusText}</span>
        </div>
        <span class="cctv-item-desc">Net ID: ${cam.id.toString().substring(0, 8)} • Group: ${cam.group}</span>
      </div>
    `;
  }).join('');
}

async function selectCctvCamera(cameraId) {
  const cam = cctvCamerasList.find(c => c.id === cameraId);
  if (!cam) return;
  
  if (cctvActiveCameraId === cameraId) return;
  
  await disconnectCctv();
  
  cctvActiveCameraId = cameraId;
  renderCctvList();
  
  const placeholder = document.getElementById('cctv-placeholder-area');
  if (placeholder) {
    placeholder.innerHTML = `
      <span class="cctv-placeholder-icon" style="animation: spin 1s linear infinite">🔄</span>
      <h2>Connecting Feed...</h2>
      <p>Negotiating encrypted connection to node ${cameraId.toString().substring(0, 8)}.</p>
    `;
  }
  
  if (IN_FIVEM) {
    await nuiFetch('cctvSelectCamera', { id: cameraId });
  }
  
  const hudName = document.getElementById('cctv-hud-name');
  if (hudName) hudName.textContent = cam.name.toUpperCase();
  
  const canvas = document.getElementById('cctv-canvas');
  const overlay = document.getElementById('cctv-overlay-hud');
  const viewport = document.getElementById('cctv-viewport-area');
  
  if (placeholder) placeholder.style.display = 'none';
  if (canvas) canvas.style.display = 'block';
  if (overlay) overlay.style.display = 'flex';
  if (viewport) {
    viewport.classList.add('active');
    if (cam.destroyed) {
      viewport.classList.add('static-noise');
    } else {
      viewport.classList.remove('static-noise');
    }
  }
  
  if (window.MainRender && !cam.destroyed) {
    window.MainRender.renderToTarget(canvas);
  }
  
  setupCctvInputEvents();
}

async function disconnectCctv() {
  if (!cctvActiveCameraId) return;
  
  if (window.MainRender) {
    window.MainRender.stop();
  }
  
  if (IN_FIVEM) {
    await nuiFetch('cctvCloseCamera', {});
  }
  
  cctvActiveCameraId = null;
  renderCctvList();
  
  const canvas = document.getElementById('cctv-canvas');
  const overlay = document.getElementById('cctv-overlay-hud');
  const placeholder = document.getElementById('cctv-placeholder-area');
  const viewport = document.getElementById('cctv-viewport-area');
  
  if (canvas) canvas.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  if (viewport) {
    viewport.classList.remove('active');
    viewport.classList.remove('static-noise');
  }
  if (placeholder) {
    placeholder.style.display = 'flex';
    placeholder.innerHTML = `
      <span class="cctv-placeholder-icon">📹</span>
      <h2>No Active Feed</h2>
      <p>Select a camera from the security list on the left to initialize the monitor connection.</p>
    `;
  }
  
  removeCctvInputEvents();
}

function closeCctv() {
  disconnectCctv();
  if (cctvHudTimer) clearInterval(cctvHudTimer);
}

function setupCctvHudClock() {
  if (cctvHudTimer) clearInterval(cctvHudTimer);
  
  const dateEl = document.getElementById('cctv-hud-date');
  const timeEl = document.getElementById('cctv-hud-time');
  
  function update() {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    if (dateEl) dateEl.textContent = `${d}/${m}/${y}`;
    
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const min = now.getMinutes().toString().padStart(2, '0');
    const sec = now.getSeconds().toString().padStart(2, '0');
    if (timeEl) timeEl.textContent = `${hours.toString().padStart(2, '0')}:${min}:${sec} ${ampm}`;
  }
  
  update();
  cctvHudTimer = setInterval(update, 1000);
}

function setupCctvInputEvents() {
  const canvas = document.getElementById('cctv-canvas');
  if (!canvas) return;
  
  canvas.addEventListener('mousedown', onCctvMouseDown);
  window.addEventListener('mouseup', onCctvMouseUp);
  window.addEventListener('mousemove', onCctvMouseMove);
  canvas.addEventListener('wheel', onCctvWheel);
}

function removeCctvInputEvents() {
  const canvas = document.getElementById('cctv-canvas');
  if (!canvas) return;
  
  canvas.removeEventListener('mousedown', onCctvMouseDown);
  window.removeEventListener('mouseup', onCctvMouseUp);
  window.removeEventListener('mousemove', onCctvMouseMove);
  canvas.removeEventListener('wheel', onCctvWheel);
}

function onCctvMouseDown(e) {
  cctvDragStart = { x: e.clientX, y: e.clientY };
}

function onCctvMouseUp() {
  cctvDragStart = null;
}

function onCctvMouseMove(e) {
  if (!cctvDragStart || !cctvActiveCameraId) return;
  
  const dx = e.clientX - cctvDragStart.x;
  const dy = e.clientY - cctvDragStart.y;
  
  cctvDragStart = { x: e.clientX, y: e.clientY };
  
  if (IN_FIVEM) {
    nuiFetch('cctvRotateCamera', { dx: dx, dy: dy });
  }
}

function onCctvWheel(e) {
  if (!cctvActiveCameraId) return;
  
  const zoomChange = e.deltaY > 0 ? 3.0 : -3.0;
  
  if (IN_FIVEM) {
    nuiFetch('cctvZoomCamera', { zoom: zoomChange });
  }
}

window.refreshCctvList = refreshCctvList;
window.selectCctvCamera = selectCctvCamera;
window.disconnectCctv = disconnectCctv;

/* ═══════════════════════════════════════════════════
   UNO CARD GAME SYSTEM LOGIC
   ═══════════════════════════════════════════════════ */

let unoDeck = [];
let unoDiscardPile = [];
let unoPlayers = [
  { id: 0, name: "Citizen (You)", cards: [], isAI: false },
  { id: 1, name: "AI Opponent 1", cards: [], isAI: true },
  { id: 2, name: "AI Opponent 2", cards: [], isAI: true },
  { id: 3, name: "AI Opponent 3", cards: [], isAI: true }
];
let unoCurrentTurn = 0;
let unoDirection = 1; // 1 = clockwise, -1 = counterclockwise
let unoActiveColor = '';
let unoHasShoutedThisTurn = false;
let unoShoutTimeout = null;
let unoIsGameActive = false;
let unoPendingDrawPenalty = false;
let unoPlayedWildCard = null;

// Audio context helper for synthesized chimes
function playUnoSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'play') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'draw') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'uno') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.error("Audio Context playback error:", e);
  }
}

function initUnoApp() {
  switchUnoScreen('menu');
  loadUnoStats();
}

function closeUnoApp() {
  quitUnoMatch();
}

function switchUnoScreen(screenName) {
  document.querySelectorAll('.uno-screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`uno-screen-${screenName}`);
  if (target) target.classList.add('active');
}

// Stats persistence
function loadUnoStats() {
  const stats = JSON.parse(localStorage.getItem('uno_stats')) || { played: 0, won: 0, lost: 0 };
  document.getElementById('uno-stat-played').textContent = stats.played;
  document.getElementById('uno-stat-won').textContent = stats.won;
  document.getElementById('uno-stat-lost').textContent = stats.lost;
  
  const ratio = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  document.getElementById('uno-stat-ratio').textContent = `${ratio}%`;
}

function resetUnoStats() {
  localStorage.setItem('uno_stats', JSON.stringify({ played: 0, won: 0, lost: 0 }));
  loadUnoStats();
}

function saveUnoResult(won) {
  const stats = JSON.parse(localStorage.getItem('uno_stats')) || { played: 0, won: 0, lost: 0 };
  stats.played++;
  if (won) stats.won++; else stats.lost++;
  localStorage.setItem('uno_stats', JSON.stringify(stats));
  loadUnoStats();
}

// UNO Deck Generator
function createUnoDeck() {
  const deck = [];
  const colors = ['red', 'blue', 'green', 'yellow'];
  
  colors.forEach(color => {
    // 0 Card
    deck.push({ color, value: 0 });
    
    // 1-9 Cards (two of each)
    for (let i = 1; i <= 9; i++) {
      deck.push({ color, value: i });
      deck.push({ color, value: i });
    }
    
    // Action Cards (Skip, Reverse, Draw Two)
    const actions = ['skip', 'reverse', 'draw2'];
    actions.forEach(action => {
      deck.push({ color, value: action });
      deck.push({ color, value: action });
    });
  });
  
  // Wild Cards (Wild, Wild Draw 4) - four of each
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild' });
    deck.push({ color: 'wild', value: 'wild4' });
  }
  
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

function startUnoGame() {
  unoDeck = createUnoDeck();
  unoDiscardPile = [];
  unoDirection = 1;
  unoCurrentTurn = 0;
  unoHasShoutedThisTurn = false;
  unoIsGameActive = true;
  unoPendingDrawPenalty = false;
  unoPlayedWildCard = null;
  
  if (unoShoutTimeout) clearTimeout(unoShoutTimeout);
  
  document.getElementById('uno-color-modal').style.display = 'none';
  document.getElementById('uno-end-modal').style.display = 'none';
  document.getElementById('uno-dir-indicator').classList.remove('ccw');
  
  // Deal cards (7 to each)
  unoPlayers.forEach(p => p.cards = []);
  for (let i = 0; i < 7; i++) {
    unoPlayers.forEach(p => {
      p.cards.push(unoDeck.pop());
    });
  }
  
  // Draw first discard card (must not be a wild/draw4)
  let firstCard = unoDeck.pop();
  while (firstCard.color === 'wild') {
    unoDeck.unshift(firstCard);
    firstCard = unoDeck.pop();
  }
  
  unoDiscardPile.push(firstCard);
  unoActiveColor = firstCard.color;
  
  // Apply immediate effects if first card is action
  if (firstCard.value === 'skip') {
    unoCurrentTurn = 1;
  } else if (firstCard.value === 'reverse') {
    unoDirection = -1;
    unoCurrentTurn = 3;
    document.getElementById('uno-dir-indicator').classList.add('ccw');
  } else if (firstCard.value === 'draw2') {
    unoPlayers[0].cards.push(unoDeck.pop(), unoDeck.pop());
    unoCurrentTurn = 1;
  }
  
  setUnoMsg(`Match started! Top Card: ${firstCard.color.toUpperCase()} ${firstCard.value.toString().toUpperCase()}`);
  
  switchUnoScreen('game');
  updateDirectionIndicator();
  
  renderUnoHand();
  renderUnoOpponents();
  renderUnoDiscard();
  
  if (unoPlayers[unoCurrentTurn].isAI) {
    aiPlayTurn();
  }
}

function quitUnoMatch() {
  unoIsGameActive = false;
  if (unoShoutTimeout) clearTimeout(unoShoutTimeout);
  switchUnoScreen('menu');
}

function setUnoMsg(msg) {
  const msgBox = document.getElementById('uno-msg-box');
  if (msgBox) msgBox.textContent = msg;
}

function updateDirectionIndicator() {
  const dirEl = document.getElementById('uno-dir-indicator');
  if (!dirEl) return;
  if (unoDirection === 1) {
    dirEl.classList.remove('ccw');
  } else {
    dirEl.classList.add('ccw');
  }
}

function getUnoCardMarkup(card, idx, playable) {
  if (!card) return '';
  
  let displayValue = '';
  let valueClass = '';
  let cornerValue = '';
  
  const val = card.value;
  if (typeof val === 'number') {
    displayValue = val.toString();
    cornerValue = val.toString();
  } else if (val === 'skip') {
    displayValue = '⊘';
    cornerValue = '⊘';
    valueClass = 'skip';
  } else if (val === 'reverse') {
    displayValue = '⇄';
    cornerValue = '⇄';
    valueClass = 'reverse';
  } else if (val === 'draw2') {
    displayValue = '+2';
    cornerValue = '+2';
    valueClass = 'draw2';
  } else if (val === 'wild') {
    displayValue = 'W';
    cornerValue = 'W';
    valueClass = 'wild';
  } else if (val === 'wild4') {
    displayValue = '+4';
    cornerValue = '+4';
    valueClass = 'wild4';
  }
  
  const playableClass = playable ? ' playable' : '';
  const clickAttr = (idx !== undefined && idx !== null) ? `onclick="playCardFromHand(${idx})"` : '';
  
  return `
    <div class="uno-card ${card.color}${playableClass}" ${clickAttr}>
      <div class="corner-value top-left">${cornerValue}</div>
      <div class="inner-oval">
        <div class="value ${valueClass}">${displayValue}</div>
      </div>
      <div class="corner-value bottom-right">${cornerValue}</div>
    </div>
  `;
}

function renderUnoHand() {
  const container = document.getElementById('uno-p0-cards');
  if (!container) return;
  
  const myTurn = (unoCurrentTurn === 0);
  const cards = unoPlayers[0].cards;
  
  document.getElementById('uno-turn-status').textContent = myTurn ? "Your Turn" : "Opponents Turning...";
  document.getElementById('uno-turn-status').className = `status-turn ${myTurn ? '' : 'wait'}`;
  
  container.innerHTML = cards.map((card, idx) => {
    const playable = myTurn && checkCardPlayable(card);
    return getUnoCardMarkup(card, idx, playable);
  }).join('');
}

function renderUnoOpponents() {
  for (let i = 1; i <= 3; i++) {
    const ai = unoPlayers[i];
    const panel = document.getElementById(`uno-p-${i}`);
    if (panel) {
      if (unoCurrentTurn === i) {
        panel.classList.add('active-turn');
      } else {
        panel.classList.remove('active-turn');
      }
    }
    
    const countEl = document.getElementById(`uno-p${i}-count`);
    if (countEl) countEl.textContent = `${ai.cards.length} cards`;
    
    const cardsEl = document.getElementById(`uno-p${i}-cards`);
    if (cardsEl) {
      cardsEl.innerHTML = Array(ai.cards.length).fill(0).map(() => `
        <div class="card-back-tiny">
          <div style="transform:rotate(-25deg);color:#fff;font-weight:900;">U</div>
        </div>
      `).join('');
    }
  }
}

function renderUnoDiscard() {
  const anchor = document.getElementById('uno-discard-anchor');
  if (!anchor) return;
  
  const topCard = unoDiscardPile[unoDiscardPile.length - 1];
  anchor.innerHTML = getUnoCardMarkup(topCard);
  
  const indicator = document.getElementById('uno-active-color-indicator');
  if (indicator) {
    indicator.className = `uno-active-color-ring ${unoActiveColor}`;
  }
  
  const sizeEl = document.getElementById('uno-deck-size');
  if (sizeEl) sizeEl.textContent = unoDeck.length;
}

function checkCardPlayable(card) {
  const topCard = unoDiscardPile[unoDiscardPile.length - 1];
  
  if (card.color === 'wild') return true;
  if (card.color === unoActiveColor) return true;
  if (card.value === topCard.value) return true;
  
  return false;
}

function playCardFromHand(index) {
  if (!unoIsGameActive || unoCurrentTurn !== 0) return;
  
  const player = unoPlayers[0];
  const card = player.cards[index];
  
  if (!checkCardPlayable(card)) return;
  
  if (player.cards.length === 2 && !unoHasShoutedThisTurn) {
    unoPendingDrawPenalty = true;
    document.getElementById('uno-shout-action').style.display = 'flex';
    unoShoutTimeout = setTimeout(() => {
      if (unoPendingDrawPenalty) {
        setUnoMsg("Failed to shout UNO! Draws 2 cards penalty.");
        drawCardsForPlayer(0, 2);
        playUnoSound('draw');
        unoPendingDrawPenalty = false;
        document.getElementById('uno-shout-action').style.display = 'none';
        renderUnoHand();
      }
    }, 1800);
  }
  
  player.cards.splice(index, 1);
  unoDiscardPile.push(card);
  playUnoSound('play');
  
  if (player.cards.length === 0) {
    if (unoShoutTimeout) clearTimeout(unoShoutTimeout);
    document.getElementById('uno-shout-action').style.display = 'none';
    endUnoGame(true);
    return;
  }
  
  if (card.color === 'wild') {
    unoPlayedWildCard = card;
    document.getElementById('uno-color-modal').style.display = 'flex';
    renderUnoHand();
    renderUnoDiscard();
  } else {
    unoActiveColor = card.color;
    resolveActionCard(card);
  }
}

function selectWildColor(color) {
  document.getElementById('uno-color-modal').style.display = 'none';
  if (!unoPlayedWildCard) return;
  
  unoActiveColor = color;
  const card = unoPlayedWildCard;
  unoPlayedWildCard = null;
  
  setUnoMsg(`You set wild color to ${color.toUpperCase()}`);
  resolveActionCard(card);
}

function playerDrawCard() {
  if (!unoIsGameActive || unoCurrentTurn !== 0) return;
  
  const player = unoPlayers[0];
  const drawn = drawCardFromDeck();
  player.cards.push(drawn);
  playUnoSound('draw');
  
  setUnoMsg(`You drew a ${drawn.color.toUpperCase()} ${drawn.value.toString().toUpperCase()}`);
  
  if (checkCardPlayable(drawn)) {
    renderUnoHand();
  } else {
    setTimeout(() => {
      advanceTurn();
      if (unoIsGameActive && unoPlayers[unoCurrentTurn].isAI) {
        aiPlayTurn();
      }
    }, 1000);
  }
  
  renderUnoHand();
  renderUnoDiscard();
}

function drawCardFromDeck() {
  if (unoDeck.length === 0) {
    const topCard = unoDiscardPile.pop();
    unoDeck = unoDiscardPile;
    unoDiscardPile = [topCard];
    
    for (let i = unoDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unoDeck[i], unoDeck[j]] = [unoDeck[j], unoDeck[i]];
    }
    setUnoMsg("Reshuffling discard pile back into deck...");
  }
  return unoDeck.pop();
}

function drawCardsForPlayer(playerIndex, count) {
  const p = unoPlayers[playerIndex];
  for (let i = 0; i < count; i++) {
    p.cards.push(drawCardFromDeck());
  }
}

function shoutUno() {
  playUnoSound('uno');
  unoHasShoutedThisTurn = true;
  unoPendingDrawPenalty = false;
  document.getElementById('uno-shout-action').style.display = 'none';
  setUnoMsg("You shouted: UNO!");
}

function advanceTurn() {
  unoCurrentTurn = getNextPlayerIndex();
  unoHasShoutedThisTurn = false;
  
  renderUnoHand();
  renderUnoOpponents();
}

function getNextPlayerIndex() {
  let next = unoCurrentTurn + unoDirection;
  if (next > 3) next = 0;
  if (next < 0) next = 3;
  return next;
}

function resolveActionCard(card) {
  if (card.value === 'skip') {
    const skipped = getNextPlayerIndex();
    setUnoMsg(`${unoPlayers[skipped].name} was SKIPPED!`);
    advanceTurn();
    advanceTurn();
  } else if (card.value === 'reverse') {
    unoDirection = -unoDirection;
    setUnoMsg(`Direction of play REVERSED!`);
    updateDirectionIndicator();
    if (unoPlayers.length === 2) {
      advanceTurn();
    }
    advanceTurn();
  } else if (card.value === 'draw2') {
    const nextPlayer = getNextPlayerIndex();
    setUnoMsg(`${unoPlayers[nextPlayer].name} draws 2 cards and is skipped!`);
    drawCardsForPlayer(nextPlayer, 2);
    advanceTurn();
    advanceTurn();
  } else if (card.value === 'wild4') {
    const nextPlayer = getNextPlayerIndex();
    setUnoMsg(`${unoPlayers[nextPlayer].name} draws 4 cards and is skipped!`);
    drawCardsForPlayer(nextPlayer, 4);
    advanceTurn();
    advanceTurn();
  } else {
    advanceTurn();
  }
  
  if (unoIsGameActive && unoPlayers[unoCurrentTurn].isAI) {
    aiPlayTurn();
  }
}

function aiPlayTurn() {
  if (!unoIsGameActive) return;
  if (unoCurrentTurn === 0) return;
  
  const ai = unoPlayers[unoCurrentTurn];
  setUnoMsg(`${ai.name} is thinking...`);
  
  setTimeout(() => {
    const playableCards = ai.cards.filter(c => checkCardPlayable(c));
    
    if (playableCards.length > 0) {
      const selectedCard = playableCards[Math.floor(Math.random() * playableCards.length)];
      const cardIndex = ai.cards.indexOf(selectedCard);
      
      ai.cards.splice(cardIndex, 1);
      unoDiscardPile.push(selectedCard);
      playUnoSound('play');
      
      if (selectedCard.color === 'wild') {
        const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
        ai.cards.forEach(c => {
          if (c.color !== 'wild') counts[c.color]++;
        });
        let bestColor = 'red';
        let max = -1;
        for (let col in counts) {
          if (counts[col] > max) {
            max = counts[col];
            bestColor = col;
          }
        }
        unoActiveColor = bestColor;
        setUnoMsg(`${ai.name} played a ${selectedCard.value.toUpperCase()} (Color set to ${bestColor.toUpperCase()})`);
      } else {
        unoActiveColor = selectedCard.color;
        setUnoMsg(`${ai.name} played a ${selectedCard.color.toUpperCase()} ${selectedCard.value.toString().toUpperCase()}`);
      }
      
      if (ai.cards.length === 1) {
        if (Math.random() < 0.8) {
          setTimeout(() => {
            playUnoSound('uno');
            setUnoMsg(`${ai.name} shouted: UNO!`);
          }, 400);
        } else {
          setTimeout(() => {
            if (ai.cards.length === 1) {
              setUnoMsg(`${ai.name} forgot to say UNO! Draws 2 cards penalty.`);
              drawCardsForPlayer(unoCurrentTurn, 2);
              playUnoSound('draw');
              renderUnoOpponents();
            }
          }, 1500);
        }
      }
      
      if (ai.cards.length === 0) {
        endUnoGame(false, ai.name);
        return;
      }
      
      resolveActionCard(selectedCard);
      
    } else {
      setUnoMsg(`${ai.name} draws a card.`);
      const drawn = drawCardFromDeck();
      ai.cards.push(drawn);
      playUnoSound('draw');
      
      if (checkCardPlayable(drawn)) {
        setTimeout(() => {
          const idx = ai.cards.indexOf(drawn);
          ai.cards.splice(idx, 1);
          unoDiscardPile.push(drawn);
          playUnoSound('play');
          
          if (drawn.color === 'wild') {
            const colors = ['red', 'blue', 'green', 'yellow'];
            unoActiveColor = colors[Math.floor(Math.random() * 4)];
          } else {
            unoActiveColor = drawn.color;
          }
          setUnoMsg(`${ai.name} played drawn card: ${drawn.color.toUpperCase()} ${drawn.value.toString().toUpperCase()}`);
          
          if (ai.cards.length === 0) {
            endUnoGame(false, ai.name);
            return;
          }
          resolveActionCard(drawn);
        }, 800);
        return;
      } else {
        advanceTurn();
      }
    }
    
    renderUnoOpponents();
    renderUnoDiscard();
    renderUnoHand();
  }, 1000 + Math.random() * 800);
}

function endUnoGame(won, winnerName = "") {
  unoIsGameActive = false;
  if (unoShoutTimeout) clearTimeout(unoShoutTimeout);
  
  const endModal = document.getElementById('uno-end-modal');
  const title = document.getElementById('uno-end-title');
  const msg = document.getElementById('uno-end-message');
  
  if (won) {
    title.textContent = "Victory!";
    title.style.color = "#4ade80";
    msg.textContent = "Congratulations! You discarded all your cards and won the match!";
    playUnoSound('win');
  } else {
    title.textContent = "Defeat!";
    title.style.color = "#ef4444";
    msg.textContent = `${winnerName} discarded all their cards first and won the match. Better luck next time!`;
    playUnoSound('lose');
  }
  
  saveUnoResult(won);
  if (endModal) endModal.style.display = 'flex';
}

window.startUnoGame = startUnoGame;
window.quitUnoMatch = quitUnoMatch;
window.switchUnoScreen = switchUnoScreen;
window.resetUnoStats = resetUnoStats;
window.playCardFromHand = playCardFromHand;
window.selectWildColor = selectWildColor;
window.playerDrawCard = playerDrawCard;
window.shoutUno = shoutUno;

/* ═══════════════════════════════════════════════════
   PICCHAT SOCIAL APP SYSTEM LOGIC
   ═══════════════════════════════════════════════════ */

let pcCurrentUser = null;
let pcActiveFriend = null;
let pcActiveFriendData = null;
let pcContacts = [];
let pcMessages = [];
let pcStories = [];

let pcStoryViewerTimer = null;
let pcStoryViewerIndex = 0;
let pcActiveStoryReel = [];

let pcSelectedPresetImageUrl = '';

async function initPicchatApp() {
  document.getElementById('pc-auth-err-msg').textContent = '';
  if (IN_FIVEM) {
    try {
      const logged = await nuiFetch('picchatGetLoggedIn', {});
      if (logged && logged.username) {
        pcCurrentUser = logged;
        loadPicchatDashboard();
        return;
      }
    } catch (err) {
      console.error("PicChat auto login error:", err);
    }
  }
  switchPicchatScreen('login');
}

function closePicchatApp() {
  if (pcStoryViewerTimer) clearInterval(pcStoryViewerTimer);
}

function switchPicchatScreen(screenName) {
  document.querySelectorAll('.picchat-screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`pc-screen-${screenName}`);
  if (target) target.classList.add('active');
}

async function picchatAuthAction(type) {
  const user = document.getElementById('pc-input-user').value.trim();
  const pass = document.getElementById('pc-input-pass').value.trim();
  const errEl = document.getElementById('pc-auth-err-msg');
  
  if (!user || !pass) {
    errEl.textContent = "Please fill in all fields.";
    return;
  }
  
  errEl.textContent = "Authenticating...";
  
  if (IN_FIVEM) {
    try {
      const res = await nuiFetch(type === 'login' ? 'picchatLogin' : 'picchatRegister', { username: user, password: pass });
      if (res && !res.error) {
        pcCurrentUser = res;
        loadPicchatDashboard();
      } else {
        errEl.textContent = res.error || "Authentication failed.";
      }
    } catch (e) {
      errEl.textContent = "Error contacting server.";
    }
  } else {
    setTimeout(() => {
      pcCurrentUser = {
        username: user,
        displayName: user.charAt(0).toUpperCase() + user.slice(1),
        avatar: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
        points: 450
      };
      loadPicchatDashboard();
    }, 800);
  }
}

async function picchatLogoutAction() {
  if (IN_FIVEM) {
    await nuiFetch('picchatLogout', {});
  }
  pcCurrentUser = null;
  pcActiveFriend = null;
  switchPicchatScreen('login');
}

async function loadPicchatDashboard() {
  switchPicchatScreen('main');
  
  document.getElementById('pc-user-name').textContent = pcCurrentUser.displayName || pcCurrentUser.username;
  document.getElementById('pc-user-avatar').src = pcCurrentUser.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
  document.getElementById('pc-user-points').textContent = `🟡 ${pcCurrentUser.points || 0} pts`;
  
  document.getElementById('pc-active-chat-header').style.display = 'none';
  document.getElementById('pc-active-chat-footer').style.display = 'none';
  document.getElementById('pc-chat-messages-container').innerHTML = `
    <div class="pc-chat-empty">
      <span class="icon">💬</span>
      <h3>No Chat Selected</h3>
      <p>Select a friend from the left sidebar panel to start chatting or send snaps!</p>
    </div>
  `;
  
  await refreshPicchatStories();
  await refreshPicchatContacts();
}

async function refreshPicchatStories() {
  const container = document.getElementById('pc-stories-container');
  if (!container) return;
  
  let stories = [];
  if (IN_FIVEM) {
    try {
      stories = await nuiFetch('picchatGetStories', {}) || [];
    } catch(e) {}
  } else {
    stories = [
      {
        username: "officer_frank",
        displayName: "Officer Frank",
        avatar: "https://cdn.pixabay.com/photo/2016/11/21/12/42/man-1845110_1280.jpg",
        viewed: false,
        snaps: [
          { id: 1, link: "https://cdn.pixabay.com/photo/2020/09/21/20/05/los-angeles-5591146_1280.jpg", time: "10m ago" },
          { id: 2, link: "https://cdn.pixabay.com/photo/2015/03/26/10/28/desert-691350_1280.jpg", time: "5m ago" }
        ]
      },
      {
        username: "hacker_joe",
        displayName: "Hacker Joe",
        avatar: "https://cdn.pixabay.com/photo/2021/08/04/13/06/software-developer-6521720_1280.jpg",
        viewed: true,
        snaps: [
          { id: 3, link: "https://cdn.pixabay.com/photo/2017/08/01/20/06/city-2567670_1280.jpg", time: "1h ago" }
        ]
      }
    ];
  }
  
  pcStories = stories;
  
  if (stories.length === 0) {
    container.innerHTML = `<span style="font-size:9px;color:var(--text-dim);padding:5px;">No stories</span>`;
    return;
  }
  
  container.innerHTML = stories.map((s, idx) => `
    <div class="pc-story-bubble ${s.viewed ? 'viewed' : ''}" onclick="playPicchatStory(${idx})">
      <div class="avatar-ring">
        <img src="${s.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}">
      </div>
      <span class="name">${s.displayName || s.username}</span>
    </div>
  `).join('');
}

async function refreshPicchatContacts() {
  const container = document.getElementById('pc-chats-container');
  if (!container) return;
  
  let contacts = [];
  if (IN_FIVEM) {
    try {
      contacts = await nuiFetch('picchatGetContacts', {}) || [];
    } catch(e) {}
  } else {
    contacts = [
      { username: "officer_frank", displayName: "Officer Frank", avatar: "https://cdn.pixabay.com/photo/2016/11/21/12/42/man-1845110_1280.jpg", lastMessage: "Send snaps!", lastMessageTime: "10:30 AM", unread: true, streak: 5 },
      { username: "hacker_joe", displayName: "Hacker Joe", avatar: "https://cdn.pixabay.com/photo/2021/08/04/13/06/software-developer-6521720_1280.jpg", lastMessage: "System secure.", lastMessageTime: "Yesterday", unread: false, streak: 12 },
      { username: "biker_sally", displayName: "Sally Biker", avatar: "https://cdn.pixabay.com/photo/2018/01/21/14/12/biker-3096700_1280.jpg", lastMessage: "Snap sent 📸", lastMessageTime: "2 days ago", unread: false, streak: 0 }
    ];
  }
  
  pcContacts = contacts;
  
  if (contacts.length === 0) {
    container.innerHTML = `<div class="nc-empty" style="padding:20px;">No friends found</div>`;
    return;
  }
  
  container.innerHTML = contacts.map(c => {
    const activeClass = (pcActiveFriend === c.username) ? 'active' : '';
    const unreadClass = c.unread ? 'unread' : '';
    return `
      <div class="pc-chat-thread ${activeClass} ${unreadClass}" onclick="selectPicchatFriend('${c.username}')">
        <img class="avatar" src="${c.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}">
        <div class="info">
          <div class="info-header">
            <span class="name">${c.displayName || c.username}</span>
            <span class="time">${c.lastMessageTime || ''}</span>
          </div>
          <span class="last-msg">${c.lastMessage || 'Tap to chat'}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function selectPicchatFriend(friendUsername) {
  pcActiveFriend = friendUsername;
  const friend = pcContacts.find(c => c.username === friendUsername);
  if (!friend) return;
  pcActiveFriendData = friend;
  
  friend.unread = false;
  refreshPicchatContacts();
  
  document.getElementById('pc-active-friend-name').textContent = friend.displayName || friend.username;
  document.getElementById('pc-active-friend-avatar').src = friend.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
  
  const streakEl = document.getElementById('pc-active-friend-streak');
  if (friend.streak > 0) {
    streakEl.style.display = 'inline';
    streakEl.textContent = `🔥 ${friend.streak} streak`;
  } else {
    streakEl.style.display = 'none';
  }
  
  document.getElementById('pc-active-chat-header').style.display = 'flex';
  document.getElementById('pc-active-chat-footer').style.display = 'flex';
  
  if (IN_FIVEM) {
    try {
      await nuiFetch('picchatMarkPostsAsOpened', { username: friendUsername });
    } catch(e) {}
  }
  
  await refreshPicchatMessages();
}

async function refreshPicchatMessages() {
  if (!pcActiveFriend) return;
  const container = document.getElementById('pc-chat-messages-container');
  if (!container) return;
  
  let messages = [];
  if (IN_FIVEM) {
    try {
      messages = await nuiFetch('picchatGetMessages', { friendUsername: pcActiveFriend }) || [];
    } catch(e) {}
  } else {
    messages = [
      { id: 1, sender: pcActiveFriend, content: "Hey! Look at this photo of Legion Square!", attachment: "https://cdn.pixabay.com/photo/2020/09/21/20/05/los-angeles-5591146_1280.jpg", time: "10:20 AM" },
      { id: 2, sender: "me", content: "Nice capture! Looks cool.", attachment: null, time: "10:25 AM" },
      { id: 3, sender: pcActiveFriend, content: "Check this snap out!", attachment: "https://cdn.pixabay.com/photo/2015/03/26/10/28/desert-691350_1280.jpg", time: "10:29 AM", unreadSnap: true }
    ];
  }
  
  pcMessages = messages;
  
  if (messages.length === 0) {
    container.innerHTML = `<div class="pc-chat-empty"><h4>No messages yet</h4><p>Send a text or photo to start chatting!</p></div>`;
    return;
  }
  
  container.innerHTML = messages.map(m => {
    const isMe = (m.sender === "me" || m.sender === pcCurrentUser.username);
    const alignClass = isMe ? 'outgoing' : 'incoming';
    
    let attachmentMarkup = '';
    if (m.attachment) {
      const snapUnreadClass = (!isMe && m.unreadSnap) ? 'snap-unread' : '';
      attachmentMarkup = `
        <div class="pc-msg-attachment ${snapUnreadClass}" onclick="viewPicchatAttachedSnap(this, '${m.attachment}')">
          <img src="${m.attachment}">
        </div>
      `;
    }
    
    let textMarkup = '';
    if (m.content) {
      textMarkup = `<div class="pc-msg-bubble">${m.content}</div>`;
    }
    
    return `
      <div class="pc-msg-wrap ${alignClass}">
        ${textMarkup}
        ${attachmentMarkup}
        <span class="msg-meta">${m.time || ''}</span>
      </div>
    `;
  }).join('');
  
  container.scrollTop = container.scrollHeight;
}

function viewPicchatAttachedSnap(element, url) {
  element.classList.remove('snap-unread');
  pcActiveStoryReel = [{ link: url, time: "Received Snap" }];
  pcStoryViewerIndex = 0;
  openPicchatStoryViewer();
}

function playPicchatStory(storyIndex) {
  const story = pcStories[storyIndex];
  if (!story || !story.snaps || story.snaps.length === 0) return;
  
  story.viewed = true;
  refreshPicchatStories();
  
  if (IN_FIVEM) {
    nuiFetch('picchatMarkStoriesAsViewed', { stories: [story.id], username: story.username });
  }
  
  pcActiveStoryReel = story.snaps.map(s => ({
    link: s.link,
    time: s.time || "Recent",
    avatar: story.avatar,
    displayName: story.displayName || story.username
  }));
  
  pcStoryViewerIndex = 0;
  openPicchatStoryViewer();
}

function openPicchatStoryViewer() {
  const modal = document.getElementById('pc-story-viewer-modal');
  if (!modal) return;
  
  renderActiveStorySlide();
  modal.style.display = 'flex';
}

function renderActiveStorySlide() {
  const slide = pcActiveStoryReel[pcStoryViewerIndex];
  if (!slide) {
    closePicchatStoryViewer();
    return;
  }
  
  document.getElementById('pc-story-user-avatar').src = slide.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
  document.getElementById('pc-story-user-name').textContent = slide.displayName || "PicChat User";
  document.getElementById('pc-story-time').textContent = slide.time;
  document.getElementById('pc-story-img').src = slide.link;
  
  const progressFill = document.getElementById('pc-story-progress-fill');
  if (progressFill) progressFill.style.width = '0%';
  
  if (pcStoryViewerTimer) clearInterval(pcStoryViewerTimer);
  
  let elapsed = 0;
  pcStoryViewerTimer = setInterval(() => {
    elapsed += 50;
    const percent = Math.min(100, (elapsed / 5000) * 100);
    if (progressFill) progressFill.style.width = `${percent}%`;
    
    if (elapsed >= 5000) {
      clearInterval(pcStoryViewerTimer);
      pcStoryViewerIndex++;
      renderActiveStorySlide();
    }
  }, 50);
}

function closePicchatStoryViewer() {
  if (pcStoryViewerTimer) clearInterval(pcStoryViewerTimer);
  const modal = document.getElementById('pc-story-viewer-modal');
  if (modal) modal.style.display = 'none';
}

function openPicchatPostMediaModal(isStory = false) {
  const modal = document.getElementById('pc-post-modal');
  if (!modal) return;
  
  document.getElementById('pc-post-input-url').value = '';
  pcSelectedPresetImageUrl = '';
  document.querySelectorAll('.preset-item').forEach(el => el.classList.remove('selected'));
  
  const title = document.getElementById('pc-post-modal-title');
  title.textContent = isStory ? "Publish to Story" : "Send Snap Photo";
  
  modal.dataset.isStory = isStory ? "true" : "false";
  modal.style.display = 'flex';
}

function closePicchatPostMediaModal() {
  const modal = document.getElementById('pc-post-modal');
  if (modal) modal.style.display = 'none';
}

function selectPicchatPresetImage(url) {
  if (url.includes('cfx-nui-homecomputer')) {
    const resourceName = typeof GetParentResourceName !== 'undefined' ? GetParentResourceName() : 'home_computer';
    url = url.replace('cfx-nui-homecomputer', `cfx-nui-${resourceName}`);
  } else if (url.includes('cfx-nui-home_computer')) {
    const resourceName = typeof GetParentResourceName !== 'undefined' ? GetParentResourceName() : 'home_computer';
    url = url.replace('cfx-nui-home_computer', `cfx-nui-${resourceName}`);
  }
  pcSelectedPresetImageUrl = url;
  document.getElementById('pc-post-input-url').value = url;
  
  document.querySelectorAll('.preset-item').forEach(el => el.classList.remove('selected'));
  if (typeof event !== 'undefined' && event && event.currentTarget) {
    event.currentTarget.classList.add('selected');
  } else if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('selected');
  }
}

async function submitPicchatPostMedia() {
  const url = document.getElementById('pc-post-input-url').value.trim();
  const modal = document.getElementById('pc-post-modal');
  const isStory = (modal.dataset.isStory === "true");
  
  if (!url) return;
  
  if (IN_FIVEM) {
    try {
      if (isStory) {
        await nuiFetch('picchatSendStory', { link: url });
      } else {
        await nuiFetch('picchatSendPost', { recipients: [pcActiveFriend], link: url });
      }
    } catch(e) {}
  } else {
    if (isStory) {
      let myStory = pcStories.find(s => s.username === pcCurrentUser.username);
      if (!myStory) {
        myStory = {
          username: pcCurrentUser.username,
          displayName: pcCurrentUser.displayName,
          avatar: pcCurrentUser.avatar,
          viewed: true,
          snaps: []
        };
        pcStories.unshift(myStory);
      }
      myStory.snaps.push({ id: Math.random(), link: url, time: "Just Now" });
      refreshPicchatStories();
    } else {
      pcMessages.push({
        id: Math.random(),
        sender: "me",
        content: null,
        attachment: url,
        time: "Just Now"
      });
      refreshPicchatMessages();
    }
  }
  
  closePicchatPostMediaModal();
}

async function sendPicchatTextMessage() {
  const input = document.getElementById('pc-chat-text-input');
  const content = input.value.trim();
  if (!content || !pcActiveFriend) return;
  
  input.value = '';
  
  if (IN_FIVEM) {
    try {
      await nuiFetch('picchatSendMessage', { username: pcActiveFriend, content: content });
    } catch(e) {}
  } else {
    pcMessages.push({
      id: Math.random(),
      sender: "me",
      content: content,
      attachment: null,
      time: "Just Now"
    });
    
    setTimeout(() => {
      pcMessages.push({
        id: Math.random(),
        sender: pcActiveFriend,
        content: `Got it! Mock reply back to: "${content}"`,
        attachment: null,
        time: "Just Now"
      });
      refreshPicchatMessages();
    }, 1500);
  }
  
  refreshPicchatMessages();
}

async function searchPicchatUsers(query) {
  if (!query.trim()) return;
  
  let results = [];
  if (IN_FIVEM) {
    try {
      results = await nuiFetch('picchatSearchUsers', { search: query }) || [];
    } catch(e) {}
  } else {
    results = [
      { username: "detective_dan", displayName: "Detective Dan", avatar: "https://cdn.pixabay.com/photo/2014/07/09/10/04/man-388104_1280.jpg", status: "none" },
      { username: "biker_sally", displayName: "Sally Biker", avatar: "https://cdn.pixabay.com/photo/2018/01/21/14/12/biker-3096700_1280.jpg", status: "friends" }
    ];
  }
  
  const modal = document.getElementById('pc-search-modal');
  const list = document.getElementById('pc-search-results-list');
  if (!modal || !list) return;
  
  if (results.length === 0) {
    list.innerHTML = `<span style="font-size:11px;color:var(--text-dim);">No users found.</span>`;
  } else {
    list.innerHTML = results.map(r => {
      let btnMarkup = '';
      if (r.status === 'none') {
        btnMarkup = `<button class="pc-btn primary small" onclick="addPicchatFriendAction(this, '${r.username}')">Add Friend</button>`;
      } else if (r.status === 'pending') {
        btnMarkup = `<span style="font-size:10px;color:var(--text-dim);">Pending</span>`;
      } else {
        btnMarkup = `<span style="font-size:10px;color:#fffc44;font-weight:600;">Friends</span>`;
      }
      return `
        <div class="pc-search-item">
          <img class="avatar" src="${r.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}">
          <span class="name">${r.displayName || r.username}</span>
          ${btnMarkup}
        </div>
      `;
    }).join('');
  }
  
  modal.style.display = 'flex';
}

function closePicchatSearchModal() {
  const modal = document.getElementById('pc-search-modal');
  if (modal) modal.style.display = 'none';
}

async function addPicchatFriendAction(button, friendUsername) {
  button.disabled = true;
  button.textContent = "Adding...";
  
  if (IN_FIVEM) {
    try {
      await nuiFetch('picchatAddFriend', { username: friendUsername });
    } catch(e) {}
  }
  
  button.className = "pc-btn secondary small";
  button.textContent = "Request Sent";
}

window.picchatAuthAction = picchatAuthAction;
window.picchatLogoutAction = picchatLogoutAction;
window.searchPicchatUsers = searchPicchatUsers;
window.closePicchatSearchModal = closePicchatSearchModal;
window.selectPicchatFriend = selectPicchatFriend;
window.viewPicchatAttachedSnap = viewPicchatAttachedSnap;
window.playPicchatStory = playPicchatStory;
window.closePicchatStoryViewer = closePicchatStoryViewer;
window.openPicchatPostMediaModal = openPicchatPostMediaModal;
window.closePicchatPostMediaModal = closePicchatPostMediaModal;
window.selectPicchatPresetImage = selectPicchatPresetImage;
window.submitPicchatPostMedia = submitPicchatPostMedia;
window.sendPicchatTextMessage = sendPicchatTextMessage;
window.addPicchatFriendAction = addPicchatFriendAction;

// ─── RADIO STATE ─────────────────────────────────────────────────────────────
let radioActiveFreq = null;
let radioVolume = 50;
let radioMyServerId = null;
let radioMutedPlayers = new Set();
let radioTalkers = {};
let radioChannels = {}; // frequency -> channel data
let radioPredefinedChannels = [
  { freq: '1', name: 'LSPD Dispatch', type: 'police' },
  { freq: '2', name: 'EMS Radio', type: 'ems' },
  { freq: '3', name: 'Sheriff Dispatch', type: 'sheriff' },
  { freq: '4', name: 'TAC 1', type: 'police' },
  { freq: '5', name: 'TAC 2', type: 'police' }
];

function initRadioApp() {
  nuiFetch('radioGetChannels', {}).then(res => {
    if (res) {
      if (res.predefined) radioPredefinedChannels = res.predefined;
      if (res.myServerId) radioMyServerId = res.myServerId;
      radioActiveFreq = res.activeFreq || null;
      radioVolume = res.volume !== undefined ? res.volume : radioVolume;
      radioChannels = res.channels || {};
      
      // Update slider UI
      const volRange = document.getElementById('radio-volume-range');
      if (volRange) {
        volRange.value = radioVolume;
        document.getElementById('radio-volume-label').textContent = radioVolume + '%';
      }
      
      renderRadioChannels();
      if (radioActiveFreq) {
        radioUpdateActiveFrequency();
      } else {
        switchRadioScreen('disconnected');
      }
    }
  });
}

function closeRadioApp() {
  // nothing special needed
}

function renderRadioChannels() {
  const listEl = document.getElementById('radio-channels-list');
  if (!listEl) return;
  listEl.innerHTML = radioPredefinedChannels.map(ch => {
    const activeClass = (radioActiveFreq === ch.freq) ? 'active' : '';
    return `
      <div class="radio-channel-item ${activeClass}" onclick="radioSelectChannel('${ch.freq}')">
        <span class="channel-name">${ch.freq} MHz - ${ch.name}</span>
        <span class="channel-tag">${ch.type}</span>
      </div>
    `;
  }).join('');
}

function radioSelectChannel(freq) {
  document.getElementById('radio-freq-input').value = freq;
  radioConnectAction(freq);
}

function radioConnectAction(customFreq) {
  const freqInput = document.getElementById('radio-freq-input');
  const passInput = document.getElementById('radio-pass-input');
  const freq = customFreq || freqInput.value.trim();
  const pass = passInput.value.trim();
  
  if (!freq) return;
  
  nuiFetch('radioConnect', { frequency: freq, password: pass }).then(res => {
    if (res && res.status === 'ok') {
      radioActiveFreq = freq;
      radioUpdateActiveFrequency();
    }
  });
}

function radioDisconnectAction() {
  nuiFetch('radioDisconnect', {}).then(res => {
    radioActiveFreq = null;
    switchRadioScreen('disconnected');
    renderRadioChannels();
  });
}

function radioChangeVolumeAction(val) {
  document.getElementById('radio-volume-label').textContent = val + '%';
  radioVolume = parseInt(val);
  nuiFetch('radioChangeVolume', { volume: radioVolume });
}

function radioSendMessageAction() {
  const input = document.getElementById('radio-chat-input');
  const text = input.value.trim();
  if (!text || !radioActiveFreq) return;
  
  nuiFetch('radioSendMessage', { frequency: radioActiveFreq, message: text });
  input.value = '';
}

function radioMutePlayerAction(serverId, btnEl) {
  const isMuted = radioMutedPlayers.has(serverId);
  if (isMuted) {
    radioMutedPlayers.delete(serverId);
    btnEl.classList.remove('muted');
    btnEl.textContent = '🔊';
    nuiFetch('radioMutePlayer', { player: serverId, state: false });
  } else {
    radioMutedPlayers.add(serverId);
    btnEl.classList.add('muted');
    btnEl.textContent = '🔇';
    nuiFetch('radioMutePlayer', { player: serverId, state: true });
  }
}

function switchRadioScreen(screen) {
  document.querySelectorAll('#win-radio .radio-screen').forEach(s => s.classList.remove('active'));
  const activeScreen = document.getElementById('radio-screen-' + screen);
  if (activeScreen) activeScreen.classList.add('active');
}

function radioUpdateActiveFrequency() {
  if (!radioActiveFreq) return;
  switchRadioScreen('connected');
  renderRadioChannels();
  
  const channel = radioChannels[radioActiveFreq] || { label: '', members: [], chat: [] };
  
  document.getElementById('radio-active-channel-title').textContent = `Frequency: ${radioActiveFreq} MHz`;
  document.getElementById('radio-active-channel-desc').textContent = channel.label || 'Standard Frequency';
  
  // Render Chat
  const chatEl = document.getElementById('radio-chat-messages');
  if (chatEl) {
    const messagesHtml = (channel.chat || []).map(msg => {
      const isSelf = msg.id === radioMyServerId;
      const sender = isSelf ? 'You' : msg.name;
      const selfClass = isSelf ? 'self' : '';
      return `
        <div class="radio-chat-bubble ${selfClass}">
          <div class="radio-chat-bubble-sender">${sender}</div>
          <div class="radio-chat-bubble-content">${msg.content}</div>
        </div>
      `;
    }).join('');
    chatEl.innerHTML = messagesHtml;
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  
  // Render Members
  const membersEl = document.getElementById('radio-members-list');
  const membersCountEl = document.getElementById('radio-members-count');
  if (membersEl) {
    const members = channel.members || [];
    membersCountEl.textContent = members.length;
    
    membersEl.innerHTML = members.map(m => {
      const isTalking = radioTalkers[m.id] === true;
      const talkingClass = isTalking ? 'talking' : '';
      const isMuted = radioMutedPlayers.has(m.id);
      const muteClass = isMuted ? 'muted' : '';
      const muteIcon = isMuted ? '🔇' : '🔊';
      
      // Don't show mute button next to self
      const muteButtonHtml = (m.id === radioMyServerId) ? '' : `
        <button class="radio-member-mute-btn ${muteClass}" onclick="radioMutePlayerAction(${m.id}, this)">
          ${muteIcon}
        </button>
      `;
      
      return `
        <div class="radio-member-item">
          <div class="radio-member-avatar ${talkingClass}">👤</div>
          <div class="radio-member-name">${m.name}</div>
          ${muteButtonHtml}
        </div>
      `;
    }).join('');
  }
}

function handleRadioMessage(data) {
  if (data.action === 'radioSetFrequency') {
    radioActiveFreq = data.frequency;
    if (radioActiveFreq) {
      radioUpdateActiveFrequency();
    } else {
      switchRadioScreen('disconnected');
      renderRadioChannels();
    }
  } else if (data.action === 'radioSetChannels') {
    radioChannels = data.channels || {};
    if (radioActiveFreq) {
      radioUpdateActiveFrequency();
    }
  } else if (data.action === 'radioSetTalkers') {
    radioTalkers = data.talkers || {};
    if (radioActiveFreq) {
      const channel = radioChannels[radioActiveFreq];
      if (channel) {
        const membersEl = document.getElementById('radio-members-list');
        if (membersEl) {
          const members = channel.members || [];
          membersEl.innerHTML = members.map(m => {
            const isTalking = radioTalkers[m.id] === true;
            const talkingClass = isTalking ? 'talking' : '';
            const isMuted = radioMutedPlayers.has(m.id);
            const muteClass = isMuted ? 'muted' : '';
            const muteIcon = isMuted ? '🔇' : '🔊';
            
            const muteButtonHtml = (m.id === radioMyServerId) ? '' : `
              <button class="radio-member-mute-btn ${muteClass}" onclick="radioMutePlayerAction(${m.id}, this)">
                ${muteIcon}
              </button>
            `;
            
            return `
              <div class="radio-member-item">
                <div class="radio-member-avatar ${talkingClass}">👤</div>
                <div class="radio-member-name">${m.name}</div>
                ${muteButtonHtml}
              </div>
            `;
          }).join('');
        }
      }
    }
  }
}

window.radioConnectAction = radioConnectAction;
window.radioDisconnectAction = radioDisconnectAction;
window.radioChangeVolumeAction = radioChangeVolumeAction;
window.radioSendMessageAction = radioSendMessageAction;
window.radioMutePlayerAction = radioMutePlayerAction;
window.radioSelectChannel = radioSelectChannel;

/* ============================================================================
   SILK STREET ANONYMOUS MARKET LOGIC
   ============================================================================ */
let playerData = {
  name: "Citizen",
  job: "Unemployed",
  grade: "None",
  bank: 0,
  cash: 0,
  citizenid: "N/A",
  loanDebt: 0,
  creditBalance: 0
};

function updateHomeSystemInfo() {
  const citizenEl = document.getElementById('about-citizen');
  if (citizenEl && playerData.citizenid) {
    citizenEl.innerText = 'CitizenID: ' + playerData.citizenid;
  }
}

function showAppNotification(title, content) {
  showNotification(title, "System Alert", content, "news", "🔔");
}

const SilkProductCatalog = [
    { id: 'wet_weed', name: 'Moist Weed', price: 500, category: 'contraband' },
    { id: 'coke', name: 'Cocaine', price: 500, category: 'contraband' },
    { id: 'coca_leaf', name: 'Cocaine leaves', price: 500, category: 'contraband' },
    { id: 'cannabis', name: 'Cannabis', price: 500, category: 'contraband' },
    { id: 'marijuana', name: 'Marijuana', price: 500, category: 'contraband' },
    { id: 'chemicals', name: 'Chemicals', price: 500, category: 'contraband' },
    { id: 'poppyresin', name: 'Poppy resin', price: 500, category: 'contraband' },
    { id: 'heroin', name: 'Heroin', price: 500, category: 'contraband' },
    { id: 'lsa', name: 'LSA', price: 500, category: 'contraband' },
    { id: 'lsd', name: 'LSD', price: 500, category: 'contraband' },
    { id: 'meth', name: 'Meth', price: 500, category: 'contraband' },
    { id: 'hydrochloric_acid', name: 'Hydrochloric Acid', price: 500, category: 'contraband' },
    { id: 'sodium_hydroxide', name: 'Sodium Hydroxide', price: 500, category: 'contraband' },
    { id: 'sulfuric_acid', name: 'Sulfuric Acid', price: 500, category: 'contraband' },
    { id: 'thionyl_chloride', name: 'Thionyl Chloride', price: 500, category: 'contraband' },
    { id: 'liquidmix', name: 'Liquid Chem Mix', price: 500, category: 'contraband' },
    { id: 'bakingsoda', name: 'Baking Soda', price: 500, category: 'contraband' },
    { id: 'chemicalvapor', name: 'Chemical Vapors', price: 500, category: 'contraband' },
    { id: 'trimming_scissors', name: 'Trimming Scissors', price: 500, category: 'contraband' },
    { id: "joint", name: "Weed Joint", price: 200, category: "contraband" },
    { id: "weed_whitewidow", name: "White Widow 2g", price: 300, category: "contraband" },
    { id: "weed_skunk", name: "Skunk 2g", price: 300, category: "contraband" },
    { id: "weed_purplehaze", name: "Purple Haze 2g", price: 350, category: "contraband" },
    { id: "weed_ogkush", name: "OG Kush 2g", price: 350, category: "contraband" },
    { id: "weed_amnesia", name: "Amnesia 2g", price: 400, category: "contraband" },
    { id: "weed_ak47", name: "AK47 2g", price: 400, category: "contraband" },
    { id: "cokebaggy", name: "Cocaine Baggy", price: 500, category: "contraband" },
    { id: "crack_baggy", name: "Crack Baggy", price: 600, category: "contraband" },
    { id: "meth_crystals", name: "Meth Crystals", price: 700, category: "contraband" },
    { id: "oxy", name: "Oxycodone Pill", price: 300, category: "contraband" },
    { id: "perc_5", name: "Percocet 5mg", price: 100, category: "contraband" },
    { id: "perc_7_5", name: "Percocet 7.5mg", price: 150, category: "contraband" },
    { id: "perc_10", name: "Percocet 10mg", price: 200, category: "contraband" },
    { id: "perc_15", name: "Percocet 15mg", price: 300, category: "contraband" },
    { id: "perc_30", name: "Percocet 30mg", price: 500, category: "contraband" },
    { id: "perc_30_bottle", name: "Percocet 30mg Bottle", price: 12000, category: "contraband" },
    { id: "weed_whitewidow_seed", name: "White Widow Seed", price: 80, category: "contraband" },
    { id: "weed_skunk_seed", name: "Skunk Seed", price: 80, category: "contraband" },
    { id: "weed_purplehaze_seed", name: "Purple Haze Seed", price: 90, category: "contraband" },
    { id: "weed_ogkush_seed", name: "OG Kush Seed", price: 90, category: "contraband" },
    { id: "weed_amnesia_seed", name: "Amnesia Seed", price: 100, category: "contraband" },
    { id: "weed_ak47_seed", name: "AK47 Seed", price: 100, category: "contraband" },
    { id: "rolling_paper", name: "Rolling Papers", price: 15, category: "contraband" },
    { id: "empty_weed_bag", name: "Empty Baggies", price: 5, category: "contraband" },
    { id: "weed_nutrition", name: "Plant Fertilizer", price: 150, category: "contraband" },
    { id: "weapon_knife", name: "Combat Knife", price: 150, category: "contraband" },
    { id: "weapon_molotov", name: "Molotov Cocktail", price: 500, category: "contraband" },
    { id: "weapon_pistol", name: "9mm Pistol", price: 1500, category: "contraband" },
    { id: "weapon_microsmg", name: "Micro SMG", price: 5000, category: "contraband" },
    { id: "weapon_assaultrifle", name: "Assault Rifle", price: 12500, category: "contraband" }
];

let silkCart = {};
let silkActiveTab = 'contraband';
let silkDutyActive = false;
let silkDealingActive = false;

function initSilkStreet() {
  silkCart = {};
  silkActiveTab = 'contraband';
  
  document.querySelectorAll('#win-silkstreet .silkstreet-nav-item').forEach(el => el.classList.remove('active'));
  const firstNav = document.querySelector('#win-silkstreet .silkstreet-nav-item');
  if (firstNav) firstNav.classList.add('active');
  
  document.querySelectorAll('#win-silkstreet .silk-section').forEach(el => el.classList.add('hidden'));
  document.getElementById('silk-contraband-sec').classList.remove('hidden');
  
  document.getElementById('silk-cart-count').innerText = '0';
  toggleSilkCart(false);
  loadSilkCatalog();
}

function switchSilkTab(tabName, element) {
    silkActiveTab = tabName;
    document.querySelectorAll('#win-silkstreet .silkstreet-nav-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else if (typeof event !== 'undefined' && event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
    
    document.querySelectorAll('#win-silkstreet .silk-section').forEach(el => el.classList.add('hidden'));
    
    if (tabName === 'contraband') {
        document.getElementById('silk-contraband-sec').classList.remove('hidden');
        loadSilkCatalog();
    } else if (tabName === 'contracts') {
        document.getElementById('silk-contracts-sec').classList.remove('hidden');
        loadSilkContracts();
    } else if (tabName === 'security') {
        document.getElementById('silk-security-sec').classList.remove('hidden');
    } else if (tabName === 'dealing') {
        document.getElementById('silk-dealing-sec').classList.remove('hidden');
    }
}

function loadSilkCatalog() {
    const catalog = document.getElementById('silk-catalog');
    if (!catalog) return;
    catalog.innerHTML = '';
    
    SilkProductCatalog.forEach(p => {
        const qty = silkCart[p.id] || 0;
        const card = document.createElement('div');
        card.className = 'silk-card';
        card.innerHTML = `
            <div>
                <h4>${p.name}</h4>
                <div class="silk-price">$${p.price}</div>
            </div>
            <div class="silk-card-actions">
                <button class="silk-btn-qty" onclick="updateSilkCartQty('${p.id}', -1)">-</button>
                <span class="silk-qty-display">${qty}</span>
                <button class="silk-btn-qty" onclick="updateSilkCartQty('${p.id}', 1)">+</button>
            </div>
        `;
        catalog.appendChild(card);
    });
}

function updateSilkCartQty(id, delta) {
    let current = silkCart[id] || 0;
    let next = current + delta;
    if (next <= 0) {
        delete silkCart[id];
    } else {
        silkCart[id] = next;
    }
    
    let totalItems = Object.values(silkCart).reduce((a, b) => a + b, 0);
    document.getElementById('silk-cart-count').innerText = totalItems;
    
    loadSilkCatalog();
    renderSilkCart();
}

function toggleSilkCart(show) {
    const drawer = document.getElementById('silk-cart-drawer');
    if (!drawer) return;
    if (show) {
        drawer.classList.remove('hidden');
        renderSilkCart();
    } else {
        drawer.classList.add('hidden');
    }
}

function renderSilkCart() {
    const container = document.getElementById('silk-cart-items');
    if (!container) return;
    container.innerHTML = '';
    
    let total = 0;
    
    Object.entries(silkCart).forEach(([id, qty]) => {
        const p = SilkProductCatalog.find(prod => prod.id === id);
        if (p) {
            total += p.price * qty;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.fontSize = '11px';
            row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            row.style.padding = '6px 0';
            row.innerHTML = `
                <span>${p.name} (x${qty})</span>
                <span style="color:#b026ff;">$${(p.price * qty).toLocaleString()}</span>
            `;
            container.appendChild(row);
        }
    });
    
    document.getElementById('silk-cart-total').innerText = '$' + total.toLocaleString();
}

function checkoutSilkCart() {
    const items = Object.entries(silkCart).map(([id, qty]) => ({ id, qty }));
    if (items.length === 0) return;
    
    const deliveryRadio = document.querySelector('input[name="silk-delivery"]:checked');
    const delivery = deliveryRadio ? deliveryRadio.value : 'drone';
    
    let totalCost = 0;
    Object.entries(silkCart).forEach(([id, qty]) => {
        const p = SilkProductCatalog.find(prod => prod.id === id);
        if (p) totalCost += p.price * qty;
    });
    
    nuiFetch('purchaseSilkStreetContraband', { items, delivery, totalCost }).then(() => {
        showAppNotification("Silk Street", `Escrow order placed! $${totalCost.toLocaleString()} charged to bank.`);
        silkCart = {};
        document.getElementById('silk-cart-count').innerText = 0;
        toggleSilkCart(false);
        loadSilkCatalog();
        closeApp('silkstreet');
    });
}

let convertedHeists = {};
let scannedSPFiles = [];
let activeWorkspaceHeist = null;
let stagedFiles = { dll: false, pdb: false, ini: false };
let isCompiling = false;

try {
    const saved = localStorage.getItem('silk_street_converted_heists');
    if (saved) {
        convertedHeists = JSON.parse(saved);
    }
} catch (e) {
    console.error("Failed to load converted heists", e);
}

const silkStreetContracts = [
    { id: "union_vault", label: "Union Depository Raid", dll: "UnionDepository.dll", pdb: "UnionDepository.pdb", ini: "UnionDepository.ini", reward: "$25,000" },
    { id: "dispensary_raid", label: "Dispensary Robbery", dll: "Rob_Fleeca_V2.dll", pdb: "Rob_Fleeca_V2.pdb", ini: "RobFleeca.ini", reward: "$18,000" },
    { id: "island_temple", label: "Cayo Temple Intrusion", dll: "CayoPericoHeistInSP.dll", pdb: "CayoPericoHeistInSP.pdb", ini: "config.ini", reward: "$30,000" },
    { id: "beef_slaughterhouse", label: "The Slaughterhouse Deal", dll: "The beef.dll", pdb: "The beef.pdb", ini: "The beef.ini", reward: "$22,000" },
    { id: "dealer_ambush", label: "Street Distributor Drop", dll: "Stockade Stickups.dll", pdb: "Stockade Stickups.pdb", ini: "StockadeStickups.ini", reward: "$15,000" },
    { id: "home_invasion", label: "SP Home Invasion", dll: "PaletoBankHeist.dll", pdb: "PaletoBankHeist.pdb", ini: "PaletoBankHeist.ini", reward: "$20,000" },
    { id: "chaos_gang_war", label: "Chaos Gang War", dll: "ChaosGangWar.dll", pdb: "ChaosGangWar.pdb", ini: "ChaosGangWar.ini", reward: "$35,000" },
    { id: "breaking_v", label: "Breaking V Heist", dll: "PacificStandard.dll", pdb: "PacificStandard.pdb", ini: "PacificStandard.ini", reward: "$24,000" },
    { id: "faction_warfare", label: "Faction Warfare Outpost", dll: "LS_FactionWarfare.dll", pdb: "LS_FactionWarfare.pdb", ini: "LS_FactionWarfare.ini", reward: "$28,000" },
    { id: "rapper_life", label: "Rapper Luxury Case", dll: "Vangelico.dll", pdb: "Vangelico.pdb", ini: "Vangelico.ini", reward: "$16,000" },
    { id: "reseller_life", label: "Reseller Pawn Robbery", dll: "Reseller.dll", pdb: "Reseller.pdb", ini: "Reseller.ini", reward: "$20,000" }
];

function loadSilkContracts() {
    nuiFetch('scanSPHeists').then(files => {
        scannedSPFiles = files || [];
        renderContractsList();
    }).catch(err => {
        console.error("Failed to scan directory, loading offline", err);
        scannedSPFiles = [];
        renderContractsList();
    });
}

function renderContractsList() {
    const container = document.getElementById('silk-contracts');
    if (!container) return;
    container.innerHTML = '';
    
    silkStreetContracts.forEach(c => {
        const isConverted = !!convertedHeists[c.id];
        const dllFound = scannedSPFiles.includes(c.dll);
        
        let statusTag = '';
        if (isConverted) {
            statusTag = '<span style="color:#00ffcc; font-size:8px; font-weight:bold; border:1px solid rgba(0,255,204,0.3); padding:1px 4px; border-radius:3px; background:rgba(0,255,204,0.05); text-transform:uppercase;">CONVERTED</span>';
        } else if (dllFound) {
            statusTag = '<span style="color:#ffaa00; font-size:8px; font-weight:bold; border:1px solid rgba(255,170,0,0.3); padding:1px 4px; border-radius:3px; background:rgba(255,170,0,0.05); text-transform:uppercase;">READY</span>';
        } else {
            statusTag = `<span style="color:#ff4f5e; font-size:8px; border:1px solid rgba(255,79,94,0.2); padding:1px 4px; border-radius:3px; background:rgba(255,79,94,0.02);">MISSING DLL</span>`;
        }
        
        const row = document.createElement('div');
        row.className = 'silk-contract-row';
        row.style.cursor = 'pointer';
        row.style.background = activeWorkspaceHeist && activeWorkspaceHeist.id === c.id ? '#211a2d' : '#171320';
        row.style.border = activeWorkspaceHeist && activeWorkspaceHeist.id === c.id ? '1px solid #b026ff' : '1px solid #211a2d';
        
        row.onclick = () => selectSilkHeist(c.id);
        
        row.innerHTML = `
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:white; font-size:11px;">${c.label}</span>
                    ${statusTag}
                </div>
                <div style="font-size:9px; color:#5b5f7a; font-family:var(--font-mono); margin-top:2px;">Binary: ${c.dll}</div>
            </div>
        `;
        container.appendChild(row);
    });
    
    if (activeWorkspaceHeist) {
        updateWorkspaceUI();
    }
}

function selectSilkHeist(id) {
    if (isCompiling) return;
    const heist = silkStreetContracts.find(c => c.id === id);
    if (!heist) return;
    
    activeWorkspaceHeist = heist;
    stagedFiles = { dll: false, pdb: false, ini: false };
    
    document.getElementById('silk-converter-empty').classList.add('hidden');
    document.getElementById('silk-converter-active').classList.remove('hidden');
    
    renderContractsList();
}

function updateWorkspaceUI() {
    if (!activeWorkspaceHeist) return;
    
    document.getElementById('active-heist-name').innerText = activeWorkspaceHeist.label;
    document.getElementById('active-heist-dll-info').innerText = `Binary: ${activeWorkspaceHeist.dll} | Reward: ${activeWorkspaceHeist.reward}`;
    
    const isConverted = !!convertedHeists[activeWorkspaceHeist.id];
    const dllExists = scannedSPFiles.includes(activeWorkspaceHeist.dll);
    const pdbExists = scannedSPFiles.includes(activeWorkspaceHeist.pdb);
    const iniExists = scannedSPFiles.includes(activeWorkspaceHeist.ini);
    
    const nameDll = document.getElementById('slot-dll-name');
    const statusDll = document.getElementById('slot-dll-status');
    
    if (isConverted || stagedFiles.dll) {
        nameDll.innerText = activeWorkspaceHeist.dll;
        nameDll.style.color = '#00ffcc';
        statusDll.innerText = 'STAGED';
        statusDll.style.color = '#00ffcc';
        statusDll.style.background = 'rgba(0, 255, 204, 0.1)';
    } else if (dllExists) {
        nameDll.innerText = `${activeWorkspaceHeist.dll} (Click to Stage)`;
        nameDll.style.color = '#7f84a3';
        statusDll.innerText = 'READY';
        statusDll.style.color = '#ffaa00';
        statusDll.style.background = 'rgba(255, 170, 0, 0.1)';
    } else {
        nameDll.innerText = `${activeWorkspaceHeist.dll} (Not found in sp_heists/)`;
        nameDll.style.color = '#5b5f7a';
        statusDll.innerText = 'MISSING';
        statusDll.style.color = '#ff4f5e';
        statusDll.style.background = 'rgba(255, 79, 94, 0.1)';
    }
    
    const namePdb = document.getElementById('slot-pdb-name');
    const statusPdb = document.getElementById('slot-pdb-status');
    
    if (isConverted || stagedFiles.pdb) {
        namePdb.innerText = activeWorkspaceHeist.pdb;
        namePdb.style.color = '#00ffcc';
        statusPdb.innerText = 'STAGED';
        statusPdb.style.color = '#00ffcc';
        statusPdb.style.background = 'rgba(0, 255, 204, 0.1)';
    } else if (pdbExists) {
        namePdb.innerText = `${activeWorkspaceHeist.pdb} (Click to Stage)`;
        namePdb.style.color = '#7f84a3';
        statusPdb.innerText = 'READY';
        statusPdb.style.color = '#ffaa00';
        statusPdb.style.background = 'rgba(255, 170, 0, 0.1)';
    } else {
        namePdb.innerText = `${activeWorkspaceHeist.pdb} (Optional - Not found)`;
        namePdb.style.color = '#5b5f7a';
        statusPdb.innerText = 'OPTIONAL';
        statusPdb.style.color = '#7f84a3';
        statusPdb.style.background = 'rgba(127, 132, 163, 0.05)';
    }
    
    const nameIni = document.getElementById('slot-ini-name');
    const statusIni = document.getElementById('slot-ini-status');
    
    if (isConverted || stagedFiles.ini) {
        nameIni.innerText = activeWorkspaceHeist.ini;
        nameIni.style.color = '#00ffcc';
        statusIni.innerText = 'STAGED';
        statusIni.style.color = '#00ffcc';
        statusIni.style.background = 'rgba(0, 255, 204, 0.1)';
    } else if (iniExists) {
        nameIni.innerText = `${activeWorkspaceHeist.ini} (Click to Stage)`;
        nameIni.style.color = '#7f84a3';
        statusIni.innerText = 'READY';
        statusIni.style.color = '#ffaa00';
        statusIni.style.background = 'rgba(255, 170, 0, 0.1)';
    } else {
        nameIni.innerText = `${activeWorkspaceHeist.ini} (Optional - Not found)`;
        nameIni.style.color = '#5b5f7a';
        statusIni.innerText = 'OPTIONAL';
        statusIni.style.color = '#7f84a3';
        statusIni.style.background = 'rgba(127, 132, 163, 0.05)';
    }
    
    const btn = document.getElementById('btn-convert-silk-heist');
    const consoleIndicator = document.getElementById('compiler-status-indicator');
    
    if (isConverted) {
        btn.disabled = false;
        btn.innerText = 'Inject Route Payload';
        btn.style.background = '#b026ff';
        btn.style.color = 'white';
        btn.style.cursor = 'pointer';
        btn.style.border = '1px solid #b026ff';
        btn.style.boxShadow = '0 0 12px rgba(176, 38, 255, 0.6)';
        btn.onclick = () => injectSilkContract(activeWorkspaceHeist.id);
        
        consoleIndicator.innerText = 'Payload Ready';
        consoleIndicator.style.color = '#00ffcc';
        
        const consoleEl = document.getElementById('compiler-console');
        consoleEl.innerHTML = `
            <div style="color: #4b4f6a;">[SYS] Workstation idle.</div>
            <div style="color: #00ffcc;">[SUCCESS] Route injection binary compiled.</div>
            <div style="color: #00ffcc;">[SUCCESS] Ready to broadcast location vectors to GPS receiver.</div>
        `;
    } else if (isCompiling) {
        btn.disabled = true;
        btn.innerText = 'Compiling...';
        btn.style.background = '#281a33';
        btn.style.color = '#5b5f7a';
        btn.style.cursor = 'not-allowed';
        btn.style.border = '1px solid #332040';
        btn.style.boxShadow = 'none';
        
        consoleIndicator.innerText = 'Processing';
        consoleIndicator.style.color = '#ffaa00';
    } else {
        const allStaged = stagedFiles.dll; // Only DLL is mandatory!
        btn.disabled = !allStaged;
        btn.onclick = startSilkConversion;
        
        if (allStaged) {
            btn.innerText = 'Convert to Silk Street Heist';
            btn.style.background = '#b026ff';
            btn.style.color = 'white';
            btn.style.cursor = 'pointer';
            btn.style.border = '1px solid #b026ff';
            btn.style.boxShadow = '0 0 10px rgba(176, 38, 255, 0.3)';
            
            consoleIndicator.innerText = 'Ready';
            consoleIndicator.style.color = '#00ffcc';
        } else {
            btn.innerText = 'Convert to Silk Street Heist';
            btn.style.background = '#1a1424';
            btn.style.color = '#5b5f7a';
            btn.style.cursor = 'not-allowed';
            btn.style.border = '1px solid #211a2d';
            btn.style.boxShadow = 'none';
            
            consoleIndicator.innerText = 'Awaiting DLL';
            consoleIndicator.style.color = '#7f84a3';
        }
    }
}

function stageSilkFile(type) {
    if (isCompiling || !activeWorkspaceHeist) return;
    if (convertedHeists[activeWorkspaceHeist.id]) return;
    
    const fileName = type === 'dll' ? activeWorkspaceHeist.dll : (type === 'pdb' ? activeWorkspaceHeist.pdb : activeWorkspaceHeist.ini);
    const fileExists = scannedSPFiles.includes(fileName);
    
    if (!fileExists) {
        showAppNotification("Compiler Error", `Source file ${fileName} was not found in sp_heists/ directory!`);
        return;
    }
    
    if (stagedFiles[type]) return;
    
    const statusEl = document.getElementById(`slot-${type}-status`);
    statusEl.innerText = 'STAGING...';
    statusEl.style.color = '#ffaa00';
    statusEl.style.background = 'rgba(255, 170, 0, 0.1)';
    
    setTimeout(() => {
        stagedFiles[type] = true;
        
        const consoleEl = document.getElementById('compiler-console');
        const logLine = document.createElement('div');
        logLine.style.color = type === 'dll' ? '#b026ff' : (type === 'pdb' ? '#ffaa00' : '#00ccff');
        logLine.innerText = `[STAGING] Staged ${fileName} into memory buffer at 0x00FF${Math.floor(Math.random() * 89 + 10)}A`;
        consoleEl.appendChild(logLine);
        consoleEl.scrollTop = consoleEl.scrollHeight;
        
        updateWorkspaceUI();
    }, 400);
}

function startSilkConversion() {
    if (isCompiling || !activeWorkspaceHeist) return;
    
    const allStaged = stagedFiles.dll;
    if (!allStaged) return;
    
    isCompiling = true;
    updateWorkspaceUI();
    
    const consoleEl = document.getElementById('compiler-console');
    consoleEl.innerHTML = '';
    
    const logs = [
        { text: `[SYS] Starting compile pipeline for ${activeWorkspaceHeist.label}...`, color: '#7f84a3', delay: 100 },
        { text: `[DECOMPILER] Reading memory map of ${activeWorkspaceHeist.dll}...`, color: '#b026ff', delay: 400 },
        { text: `[DECOMPILER] Decompiled class assembly mapping successfully.`, color: '#b026ff', delay: 700 }
    ];
    
    let currentDelay = 700;
    
    if (stagedFiles.pdb) {
        logs.push({ text: `[SYMBOLS] Parsing symbol library ${activeWorkspaceHeist.pdb}...`, color: '#ffaa00', delay: currentDelay + 400 });
        logs.push({ text: `[SYMBOLS] Mapped internal mod assembly offsets and natives.`, color: '#ffaa00', delay: currentDelay + 750 });
    } else {
        logs.push({ text: `[WARNING] Debug symbols (PDB) missing. Memory re-mapping skipped.`, color: '#ffaa00', delay: currentDelay + 400 });
    }
    currentDelay += 750;
    
    if (stagedFiles.ini) {
        logs.push({ text: `[PARSER] Extracting config parameters from ${activeWorkspaceHeist.ini}...`, color: '#00ccff', delay: currentDelay + 400 });
        logs.push({ text: `[PARSER] Configuration parsed. Custom reward parameter validated.`, color: '#00ccff', delay: currentDelay + 750 });
    } else {
        logs.push({ text: `[WARNING] Config file (INI) missing. Staging default settings...`, color: '#00ccff', delay: currentDelay + 400 });
    }
    currentDelay += 750;
    
    logs.push({ text: `[TRANSLATOR] Bridging GTA memory hooks to server network handlers...`, color: '#7f84a3', delay: currentDelay + 400 });
    logs.push({ text: `[COMPILER] Packing client script hooks and assets...`, color: '#b026ff', delay: currentDelay + 800 });
    logs.push({ text: `[COMPILER] Bundling route injection payload...`, color: '#b026ff', delay: currentDelay + 1200 });
    logs.push({ text: `[SUCCESS] ${activeWorkspaceHeist.dll} successfully compiled to Silk Street format!`, color: '#00ffcc', delay: currentDelay + 1600 });
    logs.push({ text: `[SUCCESS] Decrypted GPS payload registered in active contracts database.`, color: '#00ffcc', delay: currentDelay + 1900 });
    
    logs.forEach(log => {
        setTimeout(() => {
            const line = document.createElement('div');
            line.style.color = log.color;
            line.innerText = log.text;
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
            
            if (log.text.startsWith('[SUCCESS] Decrypted GPS payload')) {
                isCompiling = false;
                convertedHeists[activeWorkspaceHeist.id] = true;
                
                try {
                    localStorage.setItem('silk_street_converted_heists', JSON.stringify(convertedHeists));
                } catch(e) {
                    console.error("Failed to save converted heists", e);
                }
                
                showAppNotification("Silk Street", `${activeWorkspaceHeist.label} converted! Route ready for injection.`);
                renderContractsList();
            }
        }, log.delay);
    });
}


function injectSilkContract(id) {
    nuiFetch('acceptDarkContract', { id: id }).then(() => {
        showAppNotification("Silk Street", `Contract payload injected successfully!`);
        closeApp('silkstreet');
    });
}


function orderSilkMerc() {
    nuiFetch('silkStreetOrderMerc').then(res => {
        if (res && res.success) {
            showAppNotification("Silk Street", "Tactical mercenary hired successfully!");
            closeApp('silkstreet');
        } else {
            showAppNotification("Silk Street Error", (res && res.error) || "Insufficient funds!");
        }
    });
}

function toggleSilkDuty() {
    let nextVal = !silkDutyActive;
    nuiFetch('silkStreetToggleDuty', { active: nextVal }).then(() => {
        silkDutyActive = nextVal;
        const badge = document.getElementById('silk-duty-badge');
        if (badge) {
            if (silkDutyActive) {
                badge.innerText = "ON-DUTY";
                badge.className = "silk-status-badge online";
            } else {
                badge.innerText = "OFF-DUTY";
                badge.className = "silk-status-badge offline";
            }
        }
        showAppNotification("Silk Street VIP", `Security duty toggled to ${silkDutyActive ? 'ON' : 'OFF'}`);
    });
}

function toggleSilkDealing() {
    let nextVal = !silkDealingActive;
    nuiFetch('silkStreetToggleDealing', { active: nextVal }).then(res => {
        if (res && res.success) {
            setDealingStatusUI(nextVal);
        } else {
            showAppNotification("Silk Street Error", (res && res.error) || "Failed to toggle drug trade line");
        }
    });
}

function setDealingStatusUI(active) {
    silkDealingActive = active;
    const badge = document.getElementById('silk-dealing-badge');
    if (badge) {
        if (active) {
            badge.innerText = "ONLINE";
            badge.className = "silk-status-badge online";
            showAppNotification("Silk Street Dealing", "Encrypted dealer network online.");
        } else {
            badge.innerText = "OFFLINE";
            badge.className = "silk-status-badge offline";
            const dealCard = document.getElementById('silk-active-deal-card');
            if (dealCard) dealCard.classList.add('hidden');
            showAppNotification("Silk Street Dealing", "Encrypted dealer network offline.");
        }
    }
}

function receiveDrugOrderUI(order) {
    const card = document.getElementById('silk-active-deal-card');
    if (!card) return;
    if (!order) {
        card.classList.add('hidden');
        return;
    }
    card.classList.remove('hidden');
    const details = document.getElementById('silk-deal-details');
    if (details) {
        details.innerHTML = `
            Buyer: <b>${order.clientName}</b><br/>
            Item: <b>${order.qty}x ${order.itemLabel}</b><br/>
            Payout: <span style="color:#00ff66;">$${order.payout}</span>
        `;
    }
    showAppNotification("New Drug Order Received", `Client ${order.clientName} is requesting delivery.`);
}

/* ============================================================================
   DIRECT ORDER TERMINAL LOGIC
   ============================================================================ */
const DirectGearCatalog = {
    medkit: { name: "Trauma Medkit", price: 2500, icon: "🏥" },
    armor: { name: "Tactical Armor Core", price: 3000, icon: "🛡️" },
    lockpick: { name: "Slick Lockpick Set", price: 800, icon: "🔑" },
    repairkit: { name: "Mechanic Repair Kit", price: 1500, icon: "🔧" },
    phone: { name: "Phone", price: 500, icon: "📱" },
    radio: { name: "Radio", price: 300, icon: "📻" },
    iphone: { name: "iPhone", price: 1200, icon: "📱" },
    samsungphone: { name: "Samsung S10", price: 1000, icon: "📱" },
    laptop: { name: "Laptop", price: 2500, icon: "💻" },
    tablet: { name: "Tablet", price: 1500, icon: "📱" },
    fitbit: { name: "Fitbit", price: 250, icon: "⌚" },
    radioscanner: { name: "Radio Scanner", price: 800, icon: "📻" },
    pinger: { name: "Pinger", price: 600, icon: "🔍" },
    cryptostick: { name: "Crypto Stick", price: 1500, icon: "💾" },
    rolex: { name: "Golden Watch", price: 5000, icon: "⌚" },
    diamond_ring: { name: "Diamond Ring", price: 3000, icon: "💍" },
    diamond: { name: "Diamond", price: 4000, icon: "💎" },
    goldchain: { name: "Golden Chain", price: 2000, icon: "⛓️" },
    tenkgoldchain: { name: "10k Gold Chain", price: 3500, icon: "⛓️" },
    metal_scraps: { name: "Metal Scraps", price: 100, icon: "⚙️" },
    blueprint_glock: { name: "Glock Blueprint", price: 5000, icon: "📜" },
    trigger_kit: { name: "Trigger Kit", price: 1000, icon: "🔫" },
    slide_kit: { name: "Slide Kit", price: 1200, icon: "🔫" },
    barrel: { name: "Barrel", price: 1500, icon: "🔫" },
    frame: { name: "Frame", price: 1800, icon: "🔫" },
    ghost_glock_print: { name: "Ghost Glock Print", price: 2500, icon: "🔫" },
    torso: { name: "Torso / Jacket", price: 150, icon: "🧥" },
    tshirt: { name: "T-Shirt", price: 50, icon: "👕" },
    arms: { name: "Arms / Gloves", price: 75, icon: "🧤" },
    jeans: { name: "Pants / Jeans", price: 120, icon: "👖" },
    shoes: { name: "Shoes / Sneakers", price: 150, icon: "👟" },
    bag: { name: "Bag / Backpack", price: 200, icon: "🎒" },
    chain: { name: "Chain / Necklace", price: 300, icon: "⛓️" },
    mask: { name: "Mask", price: 100, icon: "🎭" },
    helmet: { name: "Helmet / Hat", price: 180, icon: "⛑️" },
    ears: { name: "Ears Accessory", price: 80, icon: "💎" },
    watches: { name: "Watch", price: 250, icon: "⌚" },
    glasses: { name: "Glasses", price: 120, icon: "🕶️" },
    bracelet: { name: "Bracelet", price: 150, icon: "📿" },
    "3d_printer_filament": { name: "3D Printer Filament", price: 750, icon: "🖨️" },
    "3d_printer": { name: "3D Printer", price: 15000, icon: "🖨️" },
    "home_monitor": { name: "Home Monitor", price: 3500, icon: "🖥️" }
};

const DirectMotorCatalog = {
    tempesta: { name: "Pegassi Tempesta", price: 750000, img: "https://i.imgur.com/Wp7DQL2.png" },
    zentorno: { name: "Pegassi Zentorno", price: 950000, img: "https://i.imgur.com/eB3Rcr4.png" },
    nero: { name: "Truffade Nero", price: 1600000, img: "https://i.imgur.com/hYyXy51.png" },
    deathbike: { name: "Western Deathbike", price: 1200000, img: "https://i.imgur.com/vHq4wJg.png" }
};

let directCart = {};
let directActiveTab = 'gear';

function initDirectOrder() {
  directCart = {};
  directActiveTab = 'gear';
  
  document.querySelectorAll('#win-directorder .do-nav-item').forEach(el => el.classList.remove('active'));
  const firstNav = document.querySelector('#win-directorder .do-nav-item');
  if (firstNav) firstNav.classList.add('active');
  
  document.querySelectorAll('#win-directorder .do-section').forEach(el => el.classList.add('hidden'));
  document.getElementById('do-gear-sec').classList.remove('hidden');
  
  document.getElementById('do-cart-count').innerText = '0';
  toggleDirectCart(false);
  loadDirectCatalog();
}

function switchDirectTab(tabName, element) {
    directActiveTab = tabName;
    document.querySelectorAll('#win-directorder .do-nav-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else if (typeof event !== 'undefined' && event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
    
    document.querySelectorAll('#win-directorder .do-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`do-${tabName}-sec`).classList.remove('hidden');
}

function loadDirectCatalog() {
    const gearGrid = document.getElementById('do-gear-catalog');
    if (gearGrid) {
        gearGrid.innerHTML = '';
        Object.entries(DirectGearCatalog).forEach(([id, item]) => {
            const qty = directCart[id]?.qty || 0;
            const card = document.createElement('div');
            card.className = 'do-card';
            card.innerHTML = `
                <div style="font-size:24px;">${item.icon}</div>
                <h4 style="margin:8px 0 4px 0;">${item.name}</h4>
                <div class="do-price">$${item.price.toLocaleString()}</div>
                <div class="do-card-actions">
                    <button class="do-btn-qty" onclick="updateDirectCart('${id}', -1, 'standard')">-</button>
                    <span class="do-qty">${qty}</span>
                    <button class="do-btn-qty" onclick="updateDirectCart('${id}', 1, 'standard')">+</button>
                </div>
            `;
            gearGrid.appendChild(card);
        });
    }

    const motorGrid = document.getElementById('do-motors-catalog');
    if (motorGrid) {
        motorGrid.innerHTML = '';
        Object.entries(DirectMotorCatalog).forEach(([id, m]) => {
            const card = document.createElement('div');
            card.className = 'do-motor-card';
            card.innerHTML = `
                <div class="do-motor-img" style="background-image:url('${m.img}')">
                    <span class="do-motor-price-badge">$${m.price.toLocaleString()}</span>
                </div>
                <div class="do-motor-info">
                    <h4>${m.name}</h4>
                    <button class="do-add-motor-btn" onclick="updateDirectCart('${id}', 1, 'motor')">Add To Cart</button>
                </div>
            `;
            motorGrid.appendChild(card);
        });
    }

    const loanDebtEl = document.getElementById('do-loan-debt');
    if (loanDebtEl) loanDebtEl.innerText = '$' + (playerData.loanDebt || 0).toLocaleString();
    const creditBalEl = document.getElementById('do-credit-balance');
    if (creditBalEl) creditBalEl.innerText = '$' + (playerData.creditBalance || 0).toLocaleString() + ' / $1,000,000';
}

function updateDirectCart(id, delta, type) {
    let current = directCart[id] || { qty: 0, type: type };
    let nextQty = current.qty + delta;
    if (nextQty <= 0) {
        delete directCart[id];
    } else {
        directCart[id] = { qty: nextQty, type: type };
    }
    
    let totalItems = Object.values(directCart).reduce((a, b) => a + b.qty, 0);
    document.getElementById('do-cart-count').innerText = totalItems;
    
    loadDirectCatalog();
    renderDirectCart();
}

function toggleDirectCart(show) {
    const drawer = document.getElementById('do-cart-drawer');
    if (!drawer) return;
    if (show) {
        drawer.classList.remove('hidden');
        renderDirectCart();
    } else {
        drawer.classList.add('hidden');
    }
}

function renderDirectCart() {
    const container = document.getElementById('do-cart-items');
    if (!container) return;
    container.innerHTML = '';
    
    let total = 0;
    
    Object.entries(directCart).forEach(([id, item]) => {
        const info = item.type === 'standard' ? DirectGearCatalog[id] : DirectMotorCatalog[id];
        if (info) {
            total += info.price * item.qty;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.fontSize = '11px';
            row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            row.style.padding = '6px 0';
            row.innerHTML = `
                <span>${info.name} (x${item.qty})</span>
                <span style="color:#ff9900;">$${(info.price * item.qty).toLocaleString()}</span>
            `;
            container.appendChild(row);
        }
    });
    
    document.getElementById('do-cart-total').innerText = '$' + total.toLocaleString();
}

function checkoutDirectCart() {
    const items = Object.entries(directCart).map(([id, data]) => ({ id, qty: data.qty, type: data.type }));
    if (items.length === 0) return;
    
    const deliveryRadio = document.querySelector('input[name="do-delivery"]:checked');
    const delivery = deliveryRadio ? deliveryRadio.value : 'drop';
    
    let totalCost = 0;
    Object.entries(directCart).forEach(([id, data]) => {
        const info = data.type === 'standard' ? DirectGearCatalog[id] : DirectMotorCatalog[id];
        if (info) totalCost += info.price * data.qty;
    });
    
    nuiFetch('chooseDirectDelivery', { items, delivery, totalCost }).then(res => {
        if (res && res.success) {
            showAppNotification("Direct Order", `Purchase confirmed! $${totalCost.toLocaleString()} charged to bank.`);
            playerData.bank -= totalCost;
            updateHomeSystemInfo();
            directCart = {};
            document.getElementById('do-cart-count').innerText = 0;
            toggleDirectCart(false);
            loadDirectCatalog();
            closeApp('directorder');
        } else {
            showAppNotification("Direct Order — Payment Failed", (res && res.error) || "Insufficient bank funds!");
        }
    });
}

function takeDoLoan() {
    const amount = parseInt(document.getElementById('do-loan-input').value);
    if (!amount || amount <= 0) return;
    nuiFetch('takeFleecaLoan', { amount }).then(res => {
        if (res && res.success) {
            playerData.loanDebt = res.newDebt;
            playerData.bank += amount;
            updateHomeSystemInfo();
            loadDirectCatalog();
            document.getElementById('do-loan-input').value = '';
            showAppNotification("Direct Order Bank", `Micro Loan of $${amount} drawn.`);
        }
    });
}

function repayDoLoan() {
    const amount = parseInt(document.getElementById('do-loan-input').value);
    if (!amount || amount <= 0) return;
    nuiFetch('repayFleecaLoan', { amount }).then(res => {
        if (res && res.success) {
            playerData.loanDebt = res.newDebt;
            playerData.bank -= amount;
            updateHomeSystemInfo();
            loadDirectCatalog();
            document.getElementById('do-loan-input').value = '';
            showAppNotification("Direct Order Bank", `Loan repayment of $${amount} accepted.`);
        }
    });
}

function withdrawDoCredit() {
    const amount = parseInt(document.getElementById('do-credit-input').value);
    if (!amount || amount <= 0) return;
    nuiFetch('lombankWithdraw', { amount }).then(res => {
        if (res && res.success) {
            playerData.creditBalance = res.newBalance;
            playerData.bank += amount;
            updateHomeSystemInfo();
            loadDirectCatalog();
            document.getElementById('do-credit-input').value = '';
            showAppNotification("LomBank Credit", `Withdrew $${amount} from credit line.`);
        }
    });
}

function repayDoCredit() {
    const amount = parseInt(document.getElementById('do-credit-input').value);
    if (!amount || amount <= 0) return;
    nuiFetch('lombankRepay', { amount }).then(res => {
        if (res && res.success) {
            playerData.creditBalance = res.newBalance;
            playerData.bank -= amount;
            updateHomeSystemInfo();
            loadDirectCatalog();
            document.getElementById('do-credit-input').value = '';
            showAppNotification("LomBank Credit", `Paid $${amount} towards credit line.`);
        }
    });
}

function triggerDoBlackout() {
    showAppNotification("City Grid", "Transmitting EMP overrider protocols...");
    nuiFetch('paigeTriggerBlackout').then(() => {
        closeApp('directorder');
    });
}

function hackDoATM() {
    showAppNotification("Signal Scanner", "Scanning nearby network lines...");
    nuiFetch('paigeHackATM').then(res => {
        if (res && res.success) {
            showAppNotification("Paige Bypass Link", "ATM Signal scanner initiated. Check GPS.");
        }
    });
}

function hireDoEliteGuard() {
    showAppNotification("Elite Security", "Hiring tactical bodyguard...");
    nuiFetch('hireEliteGuard').then(res => {
        if (res && res.success) {
            showAppNotification("Elite Security", "Bodyguard hired and assigned to escort!");
        } else {
            showAppNotification("Elite Security Error", (res && res.error) || "Hiring failed!");
        }
    });
}

function dismissDoEliteGuards() {
    nuiFetch('dismissEliteGuards').then(res => {
        showAppNotification("Elite Security", "Tactical escorts dismissed.");
    });
}

/* ============================================================================
   LS TRADER CRYPTO TERMINAL LOGIC
   ============================================================================ */
let lstraderActiveTab = 'portfolio';
let lstraderSelectedAsset = 'BTC';
let lstraderPrices = { BTC: 52430.50, ETH: 3120.75, DOGE: 0.1425 };
let lstraderChange = { BTC: 1.25, ETH: 0.82, DOGE: -2.35 };
let lstraderCharts = {
    BTC: [51200, 51800, 51600, 52100, 52000, 52300, 52200, 52500, 52400, 52430.50],
    ETH: [3050, 3080, 3110, 3100, 3130, 3120, 3140, 3150, 3110, 3120.75],
    DOGE: [0.1510, 0.1480, 0.1490, 0.1470, 0.1460, 0.1450, 0.1430, 0.1440, 0.1410, 0.1425]
};
let lstraderWallet = { usd: 0.0, BTC: 0.0, ETH: 0.0, DOGE: 0.0 };
let lstraderInterval = null;

function initLsTrader() {
  lstraderActiveTab = 'portfolio';
  lstraderSelectedAsset = 'BTC';
  
  document.querySelectorAll('#win-lstrader .lstrader-nav-item').forEach(el => el.classList.remove('active'));
  const firstNav = document.querySelector('#win-lstrader .lstrader-nav-item');
  if (firstNav) firstNav.classList.add('active');
  
  document.querySelectorAll('#win-lstrader .lstrader-section').forEach(el => el.classList.add('hidden'));
  document.getElementById('lt-portfolio-sec').classList.remove('hidden');
  
  loadTraderData();
}

function closeLsTrader() {
    if (lstraderInterval) {
        clearInterval(lstraderInterval);
        lstraderInterval = null;
    }
}

function switchTraderTab(tabName, element) {
    lstraderActiveTab = tabName;
    document.querySelectorAll('#win-lstrader .lstrader-nav-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else if (typeof event !== 'undefined' && event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
    
    document.querySelectorAll('#win-lstrader .lstrader-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`lt-${tabName}-sec`).classList.remove('hidden');
    
    if (tabName === 'portfolio') {
        renderTraderPortfolio();
    } else if (tabName === 'markets') {
        selectTraderAsset(lstraderSelectedAsset);
        updateTraderPricesUI();
    }
}

function selectTraderAsset(coin) {
    lstraderSelectedAsset = coin;
    document.querySelectorAll('#win-lstrader .lt-asset-item').forEach(el => el.classList.remove('active'));
    const assetEl = document.getElementById(`lt-asset-${coin.toLowerCase()}`);
    if (assetEl) assetEl.classList.add('active');
    
    document.getElementById('lt-selected-asset-label').innerText = `Trading ${coin}`;
    document.getElementById('lt-chart-title').innerText = `${coin === 'BTC' ? 'Bitcoin' : coin === 'ETH' ? 'Ethereum' : 'Dogecoin'} Price Trend`;
    
    drawTraderChart();
}

function drawTraderChart() {
    const svg = document.getElementById('lt-chart-svg');
    const path = document.getElementById('lt-chart-path');
    if (!svg || !path) return;
    
    const history = lstraderCharts[lstraderSelectedAsset];
    if (!history || history.length === 0) return;
    
    const min = Math.min(...history) * 0.999;
    const max = Math.max(...history) * 1.001;
    const range = max - min;
    
    const width = 400;
    const height = 120;
    const padding = 10;
    
    let points = [];
    for (let i = 0; i < history.length; i++) {
        const x = (i / (history.length - 1)) * (width - padding * 2) + padding;
        const normalizedY = range === 0 ? 0.5 : (history[i] - min) / range;
        const y = height - (normalizedY * (height - padding * 2) + padding);
        points.push(`${x},${y}`);
    }
    
    path.setAttribute('d', `M ${points.join(' L ')}`);
    
    const change = lstraderChange[lstraderSelectedAsset];
    if (change >= 0) {
        path.setAttribute('stroke', '#10b981');
    } else {
        path.setAttribute('stroke', '#ef4444');
    }
}

function loadTraderData() {
    nuiFetch('lstrader-get-data').then(data => {
        if (data) {
            lstraderWallet = data;
            renderTraderPortfolio();
        }
    });
    
    if (!lstraderInterval) {
        lstraderInterval = setInterval(updateSimulatedMarkets, 4000);
    }
}

function renderTraderPortfolio() {
    let totalHoldingsVal = 0;
    totalHoldingsVal += lstraderWallet.BTC * lstraderPrices.BTC;
    totalHoldingsVal += lstraderWallet.ETH * lstraderPrices.ETH;
    totalHoldingsVal += lstraderWallet.DOGE * lstraderPrices.DOGE;
    
    const totalVal = lstraderWallet.usd + totalHoldingsVal;
    
    document.getElementById('lt-total-value').innerText = `$${totalVal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} USD`;
    document.getElementById('lt-trading-cash').innerText = `$${lstraderWallet.usd.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} USD`;
    
    const table = document.getElementById('lt-holdings-table');
    if (table) {
        table.innerHTML = `
            <tr>
                <td><b>Bitcoin (BTC)</b></td>
                <td>${lstraderWallet.BTC.toFixed(6)} BTC</td>
                <td>$${lstraderPrices.BTC.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                <td>$${(lstraderWallet.BTC * lstraderPrices.BTC).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
            </tr>
            <tr>
                <td><b>Ethereum (ETH)</b></td>
                <td>${lstraderWallet.ETH.toFixed(6)} ETH</td>
                <td>$${lstraderPrices.ETH.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                <td>$${(lstraderWallet.ETH * lstraderPrices.ETH).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
            </tr>
            <tr>
                <td><b>Dogecoin (DOGE)</b></td>
                <td>${lstraderWallet.DOGE.toFixed(2)} DOGE</td>
                <td>$${lstraderPrices.DOGE.toFixed(4)}</td>
                <td>$${(lstraderWallet.DOGE * lstraderPrices.DOGE).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
            </tr>
        `;
    }
}

function updateTraderPricesUI() {
    Object.entries(lstraderPrices).forEach(([coin, price]) => {
        const priceEl = document.getElementById(`lt-price-${coin.toLowerCase()}-val`);
        const changeEl = document.getElementById(`lt-change-${coin.toLowerCase()}`);
        if (priceEl) {
            priceEl.innerText = coin === 'DOGE' ? `$${price.toFixed(4)}` : `$${price.toLocaleString(undefined, {minimumFractionDigits:2})}`;
        }
        if (changeEl) {
            const ch = lstraderChange[coin];
            changeEl.innerText = `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`;
            if (ch >= 0) {
                changeEl.className = 'lt-coin-change positive';
            } else {
                changeEl.className = 'lt-coin-change negative';
            }
        }
    });
}

function updateSimulatedMarkets() {
    const coins = ['BTC', 'ETH', 'DOGE'];
    const newsFeed = document.getElementById('lt-news-container');
    
    let eventHappened = false;
    let eventText = "";
    
    coins.forEach(coin => {
        const factor = coin === 'DOGE' ? 0.015 : 0.006;
        const changePercent = (Math.random() - 0.5) * factor;
        lstraderPrices[coin] = Math.max(0.0001, lstraderPrices[coin] * (1 + changePercent));
        lstraderChange[coin] += changePercent * 100;
        
        lstraderCharts[coin].push(lstraderPrices[coin]);
        if (lstraderCharts[coin].length > 15) lstraderCharts[coin].shift();
    });
    
    if (Math.random() < 0.15) {
        const eventId = Math.floor(Math.random() * 6);
        eventHappened = true;
        if (eventId === 0) {
            eventText = "ELON TWEET: 'Dogecoin is the people's currency!' 🚀 DOGE price spikes!";
            lstraderPrices.DOGE *= 1.25;
            lstraderChange.DOGE += 25.0;
        } else if (eventId === 1) {
            eventText = "CHINA REGULATORY ALERT: Crypto exchanges declared illegal! 📉 Market panic!";
            lstraderPrices.BTC *= 0.88;
            lstraderPrices.ETH *= 0.85;
            lstraderChange.BTC -= 12.0;
            lstraderChange.ETH -= 15.0;
        } else if (eventId === 2) {
            eventText = "INSTITUTIONAL BUY: Major hedge fund adopts Ethereum for smart contracts! 🚀 ETH spikes!";
            lstraderPrices.ETH *= 1.12;
            lstraderChange.ETH += 12.0;
        } else if (eventId === 3) {
            eventText = "SEC ETF APPROVAL: Spot Bitcoin ETFs officially listed! 🚀 BTC surges!";
            lstraderPrices.BTC *= 1.08;
            lstraderChange.BTC += 8.0;
        } else if (eventId === 4) {
            eventText = "WHALE DUMP: Dormant wallet transfers 50M DOGE to exchange! 📉 DOGE drops!";
            lstraderPrices.DOGE *= 0.92;
            lstraderChange.DOGE -= 8.0;
        } else if (eventId === 5) {
            eventText = "NETWORK BUG: Staking contract vulnerability discovered in Ethereum node! 📉 ETH slips!";
            lstraderPrices.ETH *= 0.94;
            lstraderChange.ETH -= 6.0;
        }
    }
    
    if (lstraderActiveTab === 'markets') {
        drawTraderChart();
        updateTraderPricesUI();
    } else if (lstraderActiveTab === 'portfolio') {
        renderTraderPortfolio();
    }
    
    if (eventHappened && newsFeed) {
        const item = document.createElement('div');
        item.className = 'lt-news-item';
        const now = new Date();
        const timeStr = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
        item.innerHTML = `<span class="lt-news-time">${timeStr}</span><span class="lt-news-text">${eventText}</span>`;
        newsFeed.prepend(item);
        
        showAppNotification("LS Cryptowire Alert", eventText.substring(0, 60) + "...");
        
        while (newsFeed.children.length > 25) {
            newsFeed.removeChild(newsFeed.lastChild);
        }
    }
}

function executeTraderTrade(action) {
    const amt = parseFloat(document.getElementById('lt-trade-amount').value);
    if (isNaN(amt) || amt <= 0) {
        showAppNotification("LS Trader Error", "Please input a valid trade amount!");
        return;
    }
    
    const coin = lstraderSelectedAsset;
    const price = lstraderPrices[coin];
    
    if (action === 'buy') {
        if (lstraderWallet.usd < amt) {
            showAppNotification("LS Trader Error", "Insufficient USD cash balance inside your trade account!");
            return;
        }
        
        const qty = amt / price;
        lstraderWallet.usd -= amt;
        lstraderWallet[coin] += qty;
        
        showAppNotification("LS Trader", `Successfully bought ${qty.toFixed(6)} ${coin}!`);
    } else {
        const coinBalance = lstraderWallet[coin];
        const requestedQty = amt / price;
        if (coinBalance < requestedQty) {
            showAppNotification("LS Trader Error", `Insufficient ${coin} balance! You only have ${coinBalance.toFixed(6)} ${coin}.`);
            return;
        }
        
        lstraderWallet.usd += amt;
        lstraderWallet[coin] -= requestedQty;
        
        showAppNotification("LS Trader", `Successfully sold ${requestedQty.toFixed(6)} ${coin} for $${amt.toLocaleString()} USD!`);
    }
    
    document.getElementById('lt-trade-amount').value = '';
    
    nuiFetch('lstrader-save-wallet', lstraderWallet);
    
    if (lstraderActiveTab === 'markets') {
        drawTraderChart();
    }
}

function executeTraderTransfer(action) {
    if (action === 'deposit') {
        const amt = parseInt(document.getElementById('lt-deposit-amount').value);
        if (isNaN(amt) || amt <= 0) return;
        
        nuiFetch('lstrader-deposit-withdraw', { action: 'deposit', amount: amt }).then(res => {
            if (res && res.success) {
                lstraderWallet.usd += amt;
                playerData.bank = res.newBank;
                updateHomeSystemInfo();
                document.getElementById('lt-deposit-amount').value = '';
                showAppNotification("LS Trader Wallet", `Successfully deposited $${amt.toLocaleString()} USD from Bank.`);
            } else {
                showAppNotification("LS Trader Wallet", (res && res.error) || "Deposit failed!");
            }
        });
    } else {
        const amt = parseInt(document.getElementById('lt-withdraw-amount').value);
        if (isNaN(amt) || amt <= 0) return;
        if (lstraderWallet.usd < amt) {
            showAppNotification("LS Trader Wallet", "Insufficient available trading cash to withdraw!");
            return;
        }
        
        nuiFetch('lstrader-deposit-withdraw', { action: 'withdraw', amount: amt }).then(res => {
            if (res && res.success) {
                lstraderWallet.usd -= amt;
                playerData.bank = res.newBank;
                updateHomeSystemInfo();
                document.getElementById('lt-withdraw-amount').value = '';
                showAppNotification("LS Trader Wallet", `Successfully withdrew $${amt.toLocaleString()} USD to Bank.`);
            } else {
                showAppNotification("LS Trader Wallet", (res && res.error) || "Withdrawal failed!");
            }
        });
    }
}

// Expose functions globally for HTML onclick execution
window.selectWallpaper = selectWallpaper;
window.setCustomWallpaper = setCustomWallpaper;
window.toggleGlass = toggleGlass;
window.settingsNav = settingsNav;
window.switchSilkTab = switchSilkTab;
window.toggleSilkCart = toggleSilkCart;
window.updateSilkCartQty = updateSilkCartQty;
window.checkoutSilkCart = checkoutSilkCart;
window.injectSilkContract = injectSilkContract;
window.stageSilkFile = stageSilkFile;
window.startSilkConversion = startSilkConversion;

window.orderSilkMerc = orderSilkMerc;
window.toggleSilkDuty = toggleSilkDuty;
window.toggleSilkDealing = toggleSilkDealing;

window.switchDirectTab = switchDirectTab;
window.toggleDirectCart = toggleDirectCart;
window.updateDirectCart = updateDirectCart;
window.checkoutDirectCart = checkoutDirectCart;
window.takeDoLoan = takeDoLoan;
window.repayDoLoan = repayDoLoan;
window.withdrawDoCredit = withdrawDoCredit;
window.repayDoCredit = repayDoCredit;
window.triggerDoBlackout = triggerDoBlackout;
window.hackDoATM = hackDoATM;

window.switchTraderTab = switchTraderTab;
window.selectTraderAsset = selectTraderAsset;
window.executeTraderTrade = executeTraderTrade;
window.executeTraderTransfer = executeTraderTransfer;

// Edibles Kitchen Globals
window.switchEdiblesTab = switchEdiblesTab;
window.cookEdibleItem = cookEdibleItem;

// ─── EDIBLES KITCHEN APP LOGIC ──────────────────────────────────────────────────
let ediblesActiveTab = 'cook';

function initEdibles() {
    switchEdiblesTab('cook');
    // Fetch latest player data to make sure inventory counts are completely accurate
    fetch(`https://${GetParentResourceName()}/getPlayerData`, { method: 'POST' }).then(r => r.json()).then(data => {
        if (data) {
            playerData = data;
            updateEdiblesRecipes();
            updateEdiblesTolerance();
        }
    });
}

function switchEdiblesTab(tabId) {
    ediblesActiveTab = tabId;
    document.querySelectorAll('#win-edibles .edibles-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Hide all tabs
    const cookTab = document.getElementById('edibles-cook-tab');
    const tolTab = document.getElementById('edibles-tolerance-tab');
    if (cookTab) cookTab.classList.add('hidden');
    if (tolTab) tolTab.classList.add('hidden');
    
    // Set active link style
    if (tabId === 'cook') {
        const item = document.querySelector('#win-edibles .edibles-nav-item[onclick*="cook"]');
        if (item) item.classList.add('active');
        if (cookTab) cookTab.classList.remove('hidden');
        updateEdiblesRecipes();
    } else {
        const item = document.querySelector('#win-edibles .edibles-nav-item[onclick*="tolerance"]');
        if (item) item.classList.add('active');
        if (tolTab) tolTab.classList.remove('hidden');
        updateEdiblesTolerance();
    }
}

function getPlayerInventoryCount(itemName) {
    if (!playerData || !playerData.items) return 0;
    // QBCore sends items as objects keyed by slots or standard arrays
    for (let key in playerData.items) {
        let it = playerData.items[key];
        if (it && it.name === itemName) {
            return it.amount || 0;
        }
    }
    return 0;
}

function updateEdiblesRecipes() {
    const moistWeed = getPlayerInventoryCount('wet_weed');
    const chemicals = getPlayerInventoryCount('chemicals');
    const bakingSoda = getPlayerInventoryCount('bakingsoda');
    const emptyBags = getPlayerInventoryCount('empty_weed_bag');

    function setIngLabel(elementId, current, required) {
        const el = document.getElementById(elementId);
        if (el) {
            const span = el.querySelector('.ing-qty');
            if (span) {
                span.innerText = `${current} / ${required}`;
            }
            if (current >= required) {
                el.className = 'ing-item met';
            } else {
                el.className = 'ing-item missing';
            }
        }
    }

    setIngLabel('ing-stone-weed', moistWeed, 2);
    setIngLabel('ing-stone-chem', chemicals, 1);
    setIngLabel('ing-stone-bag', emptyBags, 5);

    setIngLabel('ing-jolly-weed', moistWeed, 2);
    setIngLabel('ing-jolly-soda', bakingSoda, 1);
    setIngLabel('ing-jolly-bag', emptyBags, 5);

    setIngLabel('ing-stoney-weed', moistWeed, 3);
    setIngLabel('ing-stoney-chem', chemicals, 2);
    setIngLabel('ing-stoney-bag', emptyBags, 5);

    setIngLabel('ing-whis-weed', moistWeed, 2);
    setIngLabel('ing-whis-soda', bakingSoda, 2);
    setIngLabel('ing-whis-bag', emptyBags, 5);

    function checkAndSetButton(buttonId, hasIngs) {
        const btn = document.getElementById(buttonId);
        if (btn) btn.disabled = !hasIngs;
    }

    checkAndSetButton('btn-cook-stone', moistWeed >= 2 && chemicals >= 1 && emptyBags >= 5);
    checkAndSetButton('btn-cook-jolly', moistWeed >= 2 && bakingSoda >= 1 && emptyBags >= 5);
    checkAndSetButton('btn-cook-stoney', moistWeed >= 3 && chemicals >= 2 && emptyBags >= 5);
    checkAndSetButton('btn-cook-whis', moistWeed >= 2 && bakingSoda >= 2 && emptyBags >= 5);
}

function updateEdiblesTolerance() {
    // Pull tolerance value from metadata
    let tolerance = 0;
    if (playerData && playerData.metadata && playerData.metadata.ediblesTolerance) {
        tolerance = playerData.metadata.ediblesTolerance;
    } else if (playerData && playerData.metadata && playerData.metadata.cannabis_tolerance) {
        tolerance = playerData.metadata.cannabis_tolerance;
    }
    
    const pctLabel = document.getElementById('tolerance-pct-label');
    if (pctLabel) pctLabel.innerText = `${tolerance}%`;

    const bar = document.getElementById('tolerance-bar-fill');
    if (bar) bar.style.width = `${tolerance}%`;

    const desc = document.getElementById('tolerance-status-desc');
    if (desc) {
        if (tolerance < 25) {
            desc.innerText = "Active state: Low tolerance. Infusions will have maximum intensity.";
            desc.style.color = "#a8ffb2";
        } else if (tolerance < 60) {
            desc.innerText = "Active state: Moderate tolerance. Moderate high; less chance of panic attacks.";
            desc.style.color = "#ffe066";
        } else {
            desc.innerText = "Active state: High tolerance. Diminished effects; higher quantities required to feel high.";
            desc.style.color = "#ff6b6b";
        }
    }
}

function cookEdibleItem(itemName) {
    showAppNotification("Cooking Lab", "Preparing recipe ingredients...");
    fetch(`https://${GetParentResourceName()}/craftEdible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: itemName })
    }).then(r => r.json()).then(res => {
        if (res && res.success) {
            showAppNotification("Cooking Lab", "Successfully cooked package. Product delivered to your inventory!");
            // Re-fetch player data
            fetch(`https://${GetParentResourceName()}/getPlayerData`, { method: 'POST' }).then(r => r.json()).then(data => {
                if (data) {
                    playerData = data;
                    updateEdiblesRecipes();
                }
            });
        } else {
            showAppNotification("Cooking Lab", (res && res.error) || "Cooking failed!");
        }
    });
}





// JOB BOARD APP LOGIC
// ==========================================

const jobListings = [
    { id: 'internet', title: 'Internet Technician', desc: 'Install routers and fix internet outages across Los Santos.', icon: 'fa-wifi', category: 'tech', pay: '$500/hr', job_id: 'technician' },
    { id: 'driver', title: 'Delivery Driver', desc: 'Deliver packages and freight. Time is money.', icon: 'fa-truck', category: 'labor', pay: '$300/trip', job_id: 'driver' },
    { id: 'farmer', title: 'Farmer', desc: 'Cultivate fields, plant seeds, and harvest crops in Grapeseed.', icon: 'fa-tractor', category: 'labor', pay: 'Varies', job_id: 'farmer' },
    { id: 'mechanic', title: 'Mechanic On Call', desc: 'Respond to vehicle breakdowns and provide roadside assistance.', icon: 'fa-wrench', category: 'labor', pay: '$400/job', job_id: 'mechanic' },
    { id: 'oil', title: 'Oil Rig Worker', desc: 'Heavy machinery operation and oil extraction.', icon: 'fa-oil-well', category: 'labor', pay: '$1000/hr', job_id: 'oilworker' },
    { id: 'rental', title: 'Vehicle Rental Agent', desc: 'Manage luxury and exotic vehicle rentals.', icon: 'fa-car', category: 'street', pay: 'Commission', job_id: 'rental' },
    { id: 'reseller', title: 'Street Reseller', desc: 'Hustle designer gear to clients across the city.', icon: 'fa-shirt', category: 'street', pay: 'High Risk/Reward', job_id: 'reseller' },
    { id: 'invest', title: 'Global Investor', desc: 'Invest in Los Santos businesses and manage portfolios.', icon: 'fa-chart-line', category: 'tech', pay: 'Passive Income', job_id: 'investor' }
];

function initJobBoard() {
    filterJobs('all');
}

function filterJobs(category) {
    // Hide mods section, show listings
    document.getElementById('jobboard-listings-sec').classList.remove('hidden');
    document.getElementById('jobboard-mods-sec').classList.add('hidden');
    
    // Update nav classes
    document.querySelectorAll('.jobboard-nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.getElementById('nav-job-' + category);
    if (navItem) navItem.classList.add('active');

    const grid = document.getElementById('jobboard-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = category === 'all' ? jobListings : jobListings.filter(j => j.category === category);

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="color: #8b9bb4;">No jobs found in this category.</div>';
        return;
    }

    filtered.forEach(job => {
        let actionBtn = '';
        const isCurrentJob = playerData && playerData.job === job.title;
        
        if (isCurrentJob) {
            if (job.id === 'driver') {
                actionBtn = `<button class="job-apply-btn active-job-btn" style="background:#22c55e;color:white;" onclick="startDeliveryJobClick()">START ROUTE</button>`;
            } else {
                actionBtn = `<button class="job-apply-btn" style="background:rgba(74,222,128,0.15);color:#4ade80;cursor:default;" disabled>CURRENT JOB</button>`;
            }
        } else {
            actionBtn = `<button class="job-apply-btn" onclick="applyForJob('${job.id}', '${job.title}', '${job.job_id}')">APPLY NOW</button>`;
        }
        
        grid.innerHTML += `
            <div class="job-card">
                <div style="display:flex; gap: 15px; align-items: flex-start;">
                    <div class="job-icon"><i class="fa-solid ${job.icon}"></i></div>
                    <div style="flex-grow:1;">
                        <div class="job-title">${job.title}</div>
                        <div class="job-badges">
                            <span class="job-badge pay">${job.pay}</span>
                            <span class="job-badge" style="text-transform:uppercase;">${job.category}</span>
                        </div>
                    </div>
                </div>
                <div class="job-desc">${job.desc}</div>
                ${actionBtn}
            </div>
        `;
    });
}

function applyForJob(id, title, job_id) {
    if (job_id === 'driver' && localStorage.getItem('job_driver_compiled') !== 'true') {
        showNotification("Job Board", "This job requires the DriverJobs.dll mod to be compiled in the Mod Workstation first!");
        const modNavItem = document.getElementById('nav-job-mods');
        if (modNavItem) openJobModWorkstation(modNavItem);
        return;
    }
    
    showNotification("Job Board", `Applying for ${title}...`);
    
    fetch(`https://${GetParentResourceName()}/jobboard-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, title: title, job_id: job_id })
    }).then(res => res.json()).then(resp => {
        if (resp && resp.status === 'ok') {
            showNotification("Job Board", `Application approved! You are now a ${title}.`);
            // Refresh player data
            fetch(`https://${GetParentResourceName()}/getPlayerData`, { method: 'POST' }).then(r => r.json()).then(data => {
                if (data) {
                    playerData = data;
                    filterJobs('all');
                }
            });
        } else {
            showNotification("Job Board", "Application failed or denied.");
        }
    }).catch(err => {
        showNotification("Job Board", `Server event triggered for ${title}.`);
    });
}

function startDeliveryJobClick() {
    showNotification("Job Board", "Starting delivery route... Benson vehicle dispatched.");
    fetch(`https://${GetParentResourceName()}/startDriverJob`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
}

// ==========================================
// JOB BOARD HUSTLE.NET MOD WORKSTATION LOGIC
// ==========================================

let jobMods = [
    { id: "driver_mod", label: "Delivery Driver Mod", dll: "DriverJobs.dll", jobsXml: "Missions/Jobs.xml", tuningXml: "Tuning/TuningRequests.xml", description: "Enables simulated local package deliveries." }
];

let activeWorkspaceJobMod = null;
let scannedJobFiles = { dll: false, jobsXml: false, tuningXml: false };
let stagedJobFiles = { dll: false, jobsXml: false, tuningXml: false };
let isJobCompiling = false;

function loadJobMods() {
    nuiFetch('scanSPJobs', {}).then(status => {
        scannedJobFiles = status || { dll: false, jobsXml: false, tuningXml: false };
        renderJobModsList();
    }).catch(err => {
        console.error("Failed to scan job directory", err);
        scannedJobFiles = { dll: false, jobsXml: false, tuningXml: false };
        renderJobModsList();
    });
}

function renderJobModsList() {
    const container = document.getElementById('jobboard-mods-list');
    if (!container) return;
    container.innerHTML = '';
    
    jobMods.forEach(m => {
        const isCompiled = localStorage.getItem('job_driver_compiled') === 'true';
        const dllFound = scannedJobFiles.dll;
        
        let statusTag = '';
        if (isCompiled) {
            statusTag = '<span style="color:#00ffcc; font-size:8px; font-weight:bold; border:1px solid rgba(0,255,204,0.3); padding:1px 4px; border-radius:3px; background:rgba(0,255,204,0.05); text-transform:uppercase;">COMPILED</span>';
        } else if (dllFound) {
            statusTag = '<span style="color:#ffaa00; font-size:8px; font-weight:bold; border:1px solid rgba(255,170,0,0.3); padding:1px 4px; border-radius:3px; background:rgba(255,170,0,0.05); text-transform:uppercase;">READY</span>';
        } else {
            statusTag = `<span style="color:#ff4f5e; font-size:8px; border:1px solid rgba(255,79,94,0.2); padding:1px 4px; border-radius:3px; background:rgba(255,79,94,0.02);">MISSING DLL</span>`;
        }
        
        const row = document.createElement('div');
        row.className = 'jobboard-mod-row';
        if (activeWorkspaceJobMod && activeWorkspaceJobMod.id === m.id) {
            row.classList.add('active');
        }
        
        row.onclick = () => selectJobMod(m.id);
        
        row.innerHTML = `
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:white; font-size:12px;">${m.label}</span>
                    ${statusTag}
                </div>
                <div style="font-size:10px; color:#64748b; margin-top:3px;">${m.description}</div>
            </div>
        `;
        container.appendChild(row);
    });
    
    if (activeWorkspaceJobMod) {
        updateJobWorkspaceUI();
    }
}

function selectJobMod(modId) {
    if (isJobCompiling) return;
    
    activeWorkspaceJobMod = jobMods.find(m => m.id === modId);
    
    stagedJobFiles = { dll: false, jobsXml: false, tuningXml: false };
    
    document.getElementById('job-compiler-empty').classList.add('hidden');
    document.getElementById('job-compiler-active').classList.remove('hidden');
    
    const consoleEl = document.getElementById('job-compiler-console');
    consoleEl.innerHTML = '<div style="color: #475569;">[SYS] Workstation initialized. Awaiting staged files...</div>';
    
    renderJobModsList();
}

function updateJobWorkspaceUI() {
    if (!activeWorkspaceJobMod) return;
    
    document.getElementById('job-active-mod-name').innerText = activeWorkspaceJobMod.label;
    
    const slots = ['dll', 'jobsXml', 'tuningXml'];
    slots.forEach(slotType => {
        const fileFound = scannedJobFiles[slotType];
        const fileStaged = stagedJobFiles[slotType];
        
        const slotNameEl = document.getElementById(`job-slot-${slotType}-name`);
        const slotStatusEl = document.getElementById(`job-slot-${slotType}-status`);
        
        const fileName = slotType === 'dll' ? activeWorkspaceJobMod.dll : (slotType === 'jobsXml' ? activeWorkspaceJobMod.jobsXml : activeWorkspaceJobMod.tuningXml);
        
        slotNameEl.innerText = fileName;
        
        if (fileStaged) {
            slotStatusEl.innerText = 'STAGED';
            slotStatusEl.style.color = '#22c55e';
            slotStatusEl.style.background = 'rgba(34, 197, 94, 0.1)';
        } else if (fileFound) {
            slotStatusEl.innerText = 'READY';
            slotStatusEl.style.color = '#ffaa00';
            slotStatusEl.style.background = 'rgba(255, 170, 0, 0.1)';
        } else {
            slotStatusEl.innerText = 'MISSING';
            slotStatusEl.style.color = '#ef4444';
            slotStatusEl.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    });
    
    const btn = document.getElementById('btn-convert-job-mod');
    const isCompiled = localStorage.getItem('job_driver_compiled') === 'true';
    
    if (isJobCompiling) {
        btn.disabled = true;
        btn.innerText = 'COMPILING INTEGRATION...';
    } else if (isCompiled) {
        btn.disabled = true;
        btn.innerText = 'INTEGRATION ACTIVE';
        btn.style.color = '#00ffcc';
        btn.style.borderColor = 'rgba(0, 255, 204, 0.2)';
    } else if (stagedJobFiles.dll && stagedJobFiles.jobsXml) {
        btn.disabled = false;
        btn.innerText = 'Compile Mod Integration';
        btn.style.color = '#c084fc';
        btn.style.borderColor = 'rgba(168, 85, 247, 0.3)';
    } else {
        btn.disabled = true;
        btn.innerText = 'Awaiting Staged Binaries';
        btn.style.color = '#475569';
        btn.style.borderColor = 'rgba(255,255,255,0.05)';
    }
}

function stageJobFile(type) {
    if (isJobCompiling || !activeWorkspaceJobMod) return;
    const isCompiled = localStorage.getItem('job_driver_compiled') === 'true';
    if (isCompiled) return;
    
    const fileExists = scannedJobFiles[type];
    const fileName = type === 'dll' ? activeWorkspaceJobMod.dll : (type === 'jobsXml' ? activeWorkspaceJobMod.jobsXml : activeWorkspaceJobMod.tuningXml);
    
    if (!fileExists) {
        showNotification("Compiler Error", `Source file ${fileName} was not found in sp_jobs/ directory!`);
        return;
    }
    
    if (stagedJobFiles[type]) return;
    
    const statusEl = document.getElementById(`job-slot-${type}-status`);
    statusEl.innerText = 'STAGING...';
    statusEl.style.color = '#ffaa00';
    statusEl.style.background = 'rgba(255, 170, 0, 0.1)';
    
    setTimeout(() => {
        stagedJobFiles[type] = true;
        
        const consoleEl = document.getElementById('job-compiler-console');
        const logLine = document.createElement('div');
        logLine.style.color = type === 'dll' ? '#a855f7' : (type === 'jobsXml' ? '#00f3ff' : '#eab308');
        logLine.innerText = `[STAGING] Buffered ${fileName} to decompiler stream 0xDE${Math.floor(Math.random() * 89 + 10)}B`;
        consoleEl.appendChild(logLine);
        consoleEl.scrollTop = consoleEl.scrollHeight;
        
        updateJobWorkspaceUI();
    }, 450);
}

function startJobModConversion() {
    if (isJobCompiling || !activeWorkspaceJobMod) return;
    
    isJobCompiling = true;
    updateJobWorkspaceUI();
    
    const consoleEl = document.getElementById('job-compiler-console');
    consoleEl.innerHTML = '';
    
    const logs = [
        { text: `[SYS] Executing compilation pipeline for ${activeWorkspaceJobMod.label}...`, color: '#64748b', delay: 100 },
        { text: `[DECOMPILER] Reading MSIL class assembly map of ${activeWorkspaceJobMod.dll}...`, color: '#a855f7', delay: 500 },
        { text: `[DECOMPILER] Successfully decompiled veocode.DriverJobs class structures.`, color: '#a855f7', delay: 900 },
        { text: `[PARSER] Loading XML structures from ${activeWorkspaceJobMod.jobsXml}...`, color: '#00f3ff', delay: 1300 },
        { text: `[PARSER] Parsed 47 vehicle cargo jobs and customer pools mapping.`, color: '#00f3ff', delay: 1700 }
    ];
    
    let currentDelay = 1700;
    
    if (stagedJobFiles.tuningXml) {
        logs.push({ text: `[PARSER] Loading tuning calibration data from ${activeWorkspaceJobMod.tuningXml}...`, color: '#eab308', delay: currentDelay + 400 });
        logs.push({ text: `[PARSER] Configured 3 vehicle repair classes and customer modifiers.`, color: '#eab308', delay: currentDelay + 800 });
        currentDelay += 800;
    } else {
        logs.push({ text: `[WARNING] Tuning requests data skipped. Utilizing default pricing multiplier.`, color: '#eab308', delay: currentDelay + 400 });
        currentDelay += 400;
    }
    
    logs.push({ text: `[TRANSLATOR] Translating GTAV single-player ScriptHookV APIs to FiveM Client-Server handlers...`, color: '#64748b', delay: currentDelay + 400 });
    logs.push({ text: `[COMPILER] Bundling lua route wrappers and visual assets...`, color: '#a855f7', delay: currentDelay + 900 });
    logs.push({ text: `[SUCCESS] Compiled ${activeWorkspaceJobMod.dll} and configs to FiveM job resource structure!`, color: '#00ffcc', delay: currentDelay + 1400 });
    logs.push({ text: `[SUCCESS] Delivery Driver job registry unlocked in HUSTLE.NET network active database.`, color: '#00ffcc', delay: currentDelay + 1800 });
    
    logs.forEach(log => {
        setTimeout(() => {
            const line = document.createElement('div');
            line.style.color = log.color;
            line.innerText = log.text;
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
            
            if (log.text.startsWith('[SUCCESS] Delivery Driver job registry')) {
                isJobCompiling = false;
                localStorage.setItem('job_driver_compiled', 'true');
                showNotification("Job Board", "Delivery Driver Mod integration successfully compiled!");
                renderJobModsList();
            }
        }, log.delay);
    });
}

function openJobModWorkstation(el) {
    // Hide listings, show mods section
    document.getElementById('jobboard-listings-sec').classList.add('hidden');
    document.getElementById('jobboard-mods-sec').classList.remove('hidden');
    
    document.querySelectorAll('.jobboard-nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');
    
    loadJobMods();
}


// ==========================================
// WARSTOCK APP LOGIC
// ==========================================
const WarstockCatalog = [
    { id: 'weapon_9mmarpred', name: '9MM ARP RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_9mmarpgreen', name: '9MM ARP GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_9mmarpblue', name: '9MM ARP BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_9mmarpblue2', name: '9MM ARP BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_9mmarpblack', name: '9MM ARP BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_9mmarppurple', name: '9MM ARP PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_9mmarpyellow', name: '9MM ARP YELLOW VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_9mmarporange', name: '9MM ARP ORANGE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsgold', name: 'AUG VVS GOLD', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsblack', name: 'AUG VVS BLACK', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsblue', name: 'AUG VVS BLUE', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsblue2', name: 'AUG VVS BLUE2', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsorange', name: 'AUG VVS ORANGE', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvspurple', name: 'AUG VVS PURPLE', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsgreen', name: 'AUG VVS GREEN', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvspink', name: 'AUG VVS PINK', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsrose', name: 'AUG VVS ROSE', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsplat', name: 'AUG VVS PLAT', price: 50000, img: 'fa-gun' },
    { id: 'weapon_augvvsred', name: 'AUG VVS RED', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarp', name: 'ARP SKELETON VVS GOLD', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarpblack', name: 'ARP SKELETON VVS BLACK', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarpblue', name: 'ARP SKELETON VVS BLUE', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarpblue2', name: 'ARP SKELETON VVS BLUE2', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarpgreen', name: 'ARP SKELETON VVS GREEN', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarpred', name: 'ARP SKELETON VVS RED', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarppurple', name: 'ARP SKELETON VVS PURPLE', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarporange', name: 'ARP SKELETON VVS ORANGE', price: 50000, img: 'fa-gun' },
    { id: 'weapon_skeletonarppink', name: 'ARP SKELETON VVS PINK', price: 50000, img: 'fa-gun' },
    { id: 'weapon_akv9', name: 'AKV9 VVS GOLD', price: 50000, img: 'fa-gun' },
    { id: 'weapon_hk33vvs', name: 'HK33 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_hk33vvsred', name: 'HK33 RED VVS ', price: 50000, img: 'fa-gun' },
    { id: 'weapon_hk33vvsblue', name: 'HK33 BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_hk33vvsblue2', name: 'HK33 BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_hk33vvspurple', name: 'HK33 PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_hk33vvsorange', name: 'HK33 ORANGE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_hk33vvsgreen', name: 'HK33 GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_hk33vvspink', name: 'HK33 PINK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mp5vvs', name: 'MP5 GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mp5vvsred', name: 'MP5 RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mp5vvsgreen', name: 'MP5 GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mp5vvsblue', name: 'MP5 BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mp5vvsblue2', name: 'MP5 BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mp5vvspurple', name: 'MP5 PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mp5vvsblack', name: 'MP5 BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mp5vvspink', name: 'MP5 PINK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_m10', name: 'M10 GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsrose', name: 'DRACO ROSEGOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsgold', name: 'DRACO GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsplat', name: 'DRACO PLATINUM VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsred', name: 'DRACO RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsblue', name: 'DRACO BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsblue2', name: 'DRACO BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsblack', name: 'DRACO BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsorange', name: 'DRACO ORANGE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvsgreen', name: 'DRACO GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvspurple', name: 'DRACO PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_dracovvspink', name: 'DRACO PINK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsgold', name: '300 BLACKOUT GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsred', name: '300 BLACKOUT RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsblue', name: '300 BLACKOUT BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsblue2', name: '300 BLACKOUT BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsgreen', name: '300 BLACKOUT GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsblack', name: '300 BLACKOUT BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsrose', name: '300 BLACKOUT ROSE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsplat', name: '300 BLACKOUT PLAT VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvspurple', name: '300 BLACKOUT PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvsorange', name: '300 BLACKOUT GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_300bovvspink', name: '300 BLACKOUT PINK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchpurple', name: 'G SWITCH PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchred', name: 'G SWITCH RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchblack', name: 'G SWITCH BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchgreen', name: 'G SWITCH GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchblue', name: 'G SWITCH BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchorange', name: 'G SWITCH ORANGE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchwhite', name: 'G SWITCH WHITE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchblue2', name: 'G SWITCH BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchyellow', name: 'G SWITCH PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchdragon', name: 'G SWITCH DRAGON VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_switchcartel', name: 'G SWITCH CARTEL VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18_appistol', name: 'G18 GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18red', name: 'G18 RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18blue', name: 'G18 BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18blue2', name: 'G18 BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18green', name: 'G18 GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18black', name: 'G18 BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18purple', name: 'G18 PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18orange', name: 'G18 ORANGE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g18pink', name: 'G18 PINK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_rkvvs', name: 'RENETTI VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_gdrumvvs', name: 'GSWITCH DRUM VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_scorpionvvs', name: 'SCORPION VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_redarp', name: 'ARP RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_bluearp', name: 'ARP BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_blue2arp', name: 'ARP BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_greenarp', name: 'ARP GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_purplearp', name: 'ARP PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_yellowarp', name: 'ARP YELLOW VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_orangearp', name: 'ARP ORANGE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_pinkarp', name: 'ARP PINK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_blackarp', name: 'ARP BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mpxvvs', name: 'MPX GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_mpa', name: 'MPA GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_velvvs', name: 'VEL GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26v2', name: 'G26 LASER GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26vvsred', name: 'G26 LASER RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26vvspurple', name: 'G26 LASER PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26vvsorange', name: 'G26 LASER ORANGE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26vvsgreen', name: 'G26 LASER GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26vvsblue', name: 'G26 LASER BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26vvsblue2', name: 'G26 LASER BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26vvsblack', name: 'G26 LASER BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_g26vvsyellow', name: 'G26 LASER YELLOW VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_cx9_smg', name: 'CX9 GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrum', name: 'DEAGLE DRUM GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumred', name: 'DEAGLE DRUM RED VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumblue', name: 'DEAGLE DRUM BLUE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumblue2', name: 'DEAGLE DRUM BLUE2 VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumgreen', name: 'DEAGLE DRUM GREEN VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumorange', name: 'DEAGLE DRUM ORANGE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumblack', name: 'DEAGLE DRUM BLACK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumrose', name: 'DEAGLE DRUM ROSE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumplat', name: 'DEAGLE DRUM PLAT VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumpink', name: 'DEAGLE DRUM PINK VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_deagledrumpurple', name: 'DEAGLE DRUM PURPLE VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_haha74u', name: 'AK74U GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_sos', name: 'SHOTGUN PUMP GOLD VVS', price: 50000, img: 'fa-gun' },
    { id: 'weapon_jak12', name: 'JAK12 GOLD VVS', price: 50000, img: 'fa-gun' },

    { id: 'weapon_assaultrifle', name: 'AK12 Assault Rifle', price: 15000, img: 'fa-gun' },
    { id: 'weapon_assaultsmg', name: 'Groza SMG', price: 12000, img: 'fa-gun' },
    { id: 'weapon_apistol', name: 'Glock 18', price: 5000, img: 'fa-gun' },
    { id: 'weapon_carbinerifle', name: 'HK416', price: 18000, img: 'fa-gun' },
    { id: 'weapon_heavysniper', name: 'M110 Sniper', price: 35000, img: 'fa-crosshairs' },
    { id: 'weapon_advancedrifle', name: 'MK18', price: 20000, img: 'fa-gun' },
    { id: 'weapon_smg', name: 'MP5 SD', price: 11000, img: 'fa-gun' },
    { id: 'weapon_compactrifle', name: 'P90', price: 14000, img: 'fa-gun' },
    { id: 'weapon_machinepistol', name: 'PP Bizon', price: 8500, img: 'fa-gun' },
    { id: 'weapon_bullpuprifle', name: 'TAR 21', price: 16000, img: 'fa-gun' },
    { id: 'weapon_microsmg', name: 'MP7', price: 9000, img: 'fa-gun' },
    { id: 'weapon_pistol', name: '1911 Sand Storm', price: 3500, img: 'fa-gun' },
    { id: 'weapon_specialcarbine', name: 'AS VAL', price: 19000, img: 'fa-gun' },
    { id: 'weapon_combatpistol', name: 'Beretta M9', price: 4000, img: 'fa-gun' },
    { id: 'weapon_combatmg', name: 'PKM', price: 25000, img: 'fa-gun' },
    { id: 'heavyarmor', name: 'Heavy Body Armor', price: 2500, img: 'fa-shield-halved' }
];

let warstockCart = {};

function initWarstock() {
    warstockCart = {};
    renderWarstockCatalog();
    renderWarstockCart();
}

function renderWarstockCatalog() {
    const grid = document.getElementById('warstock-grid');
    if (!grid) return;
    grid.innerHTML = '';

    WarstockCatalog.forEach(item => {
        grid.innerHTML += `
            <div style="background: rgba(30, 35, 20, 0.8); border: 1px solid #364020; border-radius: 4px; padding: 15px; display: flex; flex-direction: column; align-items: center; text-align: center;">
                <i class="fa-solid ${item.img}" style="font-size: 32px; color: #8c9e47; margin-bottom: 10px;"></i>
                <div style="color: #c4d683; font-weight: bold; font-size: 14px; margin-bottom: 5px;">${item.name}</div>
                <div style="color: #a6b571; font-size: 12px; margin-bottom: 15px;">$${item.price.toLocaleString()}</div>
                <button onclick="addToWarstockCart('${item.id}')" style="width: 100%; padding: 8px; background: transparent; border: 1px solid #7d8a36; color: #c4d683; cursor: pointer; transition: all 0.2s;">Add to Cart</button>
            </div>
        `;
    });
}

function addToWarstockCart(id) {
    if (warstockCart[id]) {
        warstockCart[id]++;
    } else {
        warstockCart[id] = 1;
    }
    renderWarstockCart();
}

function removeFromWarstockCart(id) {
    if (warstockCart[id]) {
        warstockCart[id]--;
        if (warstockCart[id] <= 0) delete warstockCart[id];
    }
    renderWarstockCart();
}

function renderWarstockCart() {
    const container = document.getElementById('warstock-cart-items');
    if (!container) return;
    container.innerHTML = '';
    
    let total = 0;
    
    Object.entries(warstockCart).forEach(([id, qty]) => {
        const item = WarstockCatalog.find(p => p.id === id);
        if (item) {
            total += item.price * qty;
            container.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(125, 138, 54, 0.2); padding: 8px 0; font-size: 12px;">
                    <div style="flex-grow: 1;">
                        <div style="color: #c4d683;">${item.name}</div>
                        <div style="color: #8c9e47;">$${item.price.toLocaleString()} x ${qty}</div>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="removeFromWarstockCart('${id}')" style="background: transparent; border: 1px solid #dc2626; color: #dc2626; cursor: pointer; padding: 2px 6px;">-</button>
                        <button onclick="addToWarstockCart('${id}')" style="background: transparent; border: 1px solid #7d8a36; color: #c4d683; cursor: pointer; padding: 2px 6px;">+</button>
                    </div>
                </div>
            `;
        }
    });
    
    document.getElementById('warstock-cart-total').innerText = '$' + total.toLocaleString();
}

function checkoutWarstock() {
    const items = Object.entries(warstockCart).map(([id, qty]) => ({ id, qty }));
    if (items.length === 0) {
        showNotification("Warstock", "Your cart is empty.");
        return;
    }
    
    let totalCost = 0;
    Object.entries(warstockCart).forEach(([id, qty]) => {
        const p = WarstockCatalog.find(prod => prod.id === id);
        if (p) totalCost += p.price * qty;
    });
    
    showNotification("Warstock", "Processing transaction...");
    
    fetch(`https://${GetParentResourceName()}/warstock-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items, totalCost: totalCost })
    }).then(res => res.json()).then(resp => {
        if (resp && resp.status === 'ok') {
            warstockCart = {};
            renderWarstockCart();
            showNotification("Warstock", "Transaction successful. Items delivered.", "success");
        } else {
            showNotification("Warstock", resp.error || "Transaction failed.", "error");
        }
    }).catch(err => {
        showNotification("Warstock", "Server unreachable.");
    });
}

// ==========================================
// BUSINESS HUB APP LOGIC
// ==========================================
const BusinessCatalog = [
    { id: 'cocaine', name: 'Cocaine Lockup', type: 'OpenRoad', icon: 'fa-box', supplyCost: 75000, maxStockValue: 420000 },
    { id: 'meth', name: 'Methamphetamine Lab', type: 'OpenRoad', icon: 'fa-flask', supplyCost: 75000, maxStockValue: 357000 },
    { id: 'bunker', name: 'Gunrunning Bunker', type: 'Disruption Logistics', icon: 'fa-shield-halved', supplyCost: 75000, maxStockValue: 1050000 },
    { id: 'warehouse', name: 'Special Cargo', type: 'SecuroServ', icon: 'fa-boxes-stacked', supplyCost: 18000, maxStockValue: 2220000 },
    { id: 'arena', name: 'Arena War Workshop', type: 'MazeBank', icon: 'fa-car-burst', supplyCost: 50000, maxStockValue: 1000000 }
];

let activeBizId = null;

function initBusiness() {
    const nav = document.getElementById('business-nav-list');
    if (!nav) return;
    nav.innerHTML = '';
    
    BusinessCatalog.forEach((biz) => {
        nav.innerHTML += `
            <div class="sidebar-item" id="nav-biz-${biz.id}" onclick="selectBusiness('${biz.id}')" style="display: flex; align-items: center; gap: 10px; padding: 15px 20px; cursor: pointer; border-bottom: 1px solid #222; transition: all 0.2s;">
                <i class="fa-solid ${biz.icon}" style="color: #b89345; width: 20px; text-align: center;"></i>
                <div>
                    <div style="font-weight: bold; color: #fff;">${biz.name}</div>
                    <div style="font-size: 10px; color: #888;">${biz.type}</div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('business-dashboard').style.display = 'none';
    if (BusinessCatalog.length > 0) selectBusiness(BusinessCatalog[0].id);
}

function selectBusiness(id) {
    activeBizId = id;
    document.querySelectorAll('#business-nav-list .sidebar-item').forEach(el => el.style.background = 'transparent');
    document.getElementById('nav-biz-' + id).style.background = 'rgba(184, 147, 69, 0.1)';
    
    const biz = BusinessCatalog.find(b => b.id === id);
    document.getElementById('biz-title').innerText = biz.name;
    
    document.getElementById('business-loader').style.display = 'flex';
    document.getElementById('business-dashboard').style.display = 'none';
    
    fetch(`https://${GetParentResourceName()}/business-get-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    }).then(res => res.json()).then(data => {
        document.getElementById('business-loader').style.display = 'none';
        document.getElementById('business-dashboard').style.display = 'block';
        
        updateBizUI(data);
    }).catch(err => {
        document.getElementById('business-loader').style.display = 'none';
        showNotification("SecuroServ", "Network error. Cannot sync with server.", "error");
    });
}

function updateBizUI(data) {
    document.getElementById('biz-supplies-pct').innerText = Math.round(data.supplies) + '%';
    document.getElementById('biz-supplies-bar').style.width = data.supplies + '%';
    
    document.getElementById('biz-stock-pct').innerText = Math.round(data.stock) + '%';
    document.getElementById('biz-stock-bar').style.width = data.stock + '%';
    
    document.getElementById('biz-stock-value').innerText = '$' + Math.floor(data.stockValue).toLocaleString();
    document.getElementById('biz-lifetime').innerText = '$' + Math.floor(data.lifetimeEarnings || 0).toLocaleString();
    
    const logs = document.getElementById('biz-logs');
    logs.innerHTML = '';
    (data.logs || ["[SYSTEM] Connected to SecuroServ Network."]).forEach(msg => {
        logs.innerHTML += `<div>${msg}</div>`;
    });
    logs.scrollTop = logs.scrollHeight;
}

function buyBizSupplies() {
    if (!activeBizId) return;
    const biz = BusinessCatalog.find(b => b.id === activeBizId);
    showNotification("SecuroServ", "Ordering supplies for $" + biz.supplyCost.toLocaleString() + "...", "success");
    fetch(`https://${GetParentResourceName()}/business-buy-supplies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeBizId, cost: biz.supplyCost })
    }).then(res => res.json()).then(data => {
        if (data.status === 'ok') {
            updateBizUI(data.bizData);
            showNotification("SecuroServ", "Supplies ordered successfully.", "success");
        } else {
            showNotification("SecuroServ", data.error || "Failed to order supplies.", "error");
        }
    });
}

function sellBizStock() {
    if (!activeBizId) return;
    showNotification("SecuroServ", "Initiating sale...", "success");
    fetch(`https://${GetParentResourceName()}/business-sell-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeBizId })
    }).then(res => res.json()).then(data => {
        if (data.status === 'ok') {
            updateBizUI(data.bizData);
            showNotification("SecuroServ", "Stock sold successfully! Funds deposited.", "success");
        } else {
            showNotification("SecuroServ", data.error || "Failed to sell stock.", "error");
        }
    });
}






function launchDrone() {
    closeComputer();
    nuiFetch('launchDrone', {});
}

function launchArena() {
    closeComputer();
    nuiFetch('launchArena', {});
}


// ─── THE BLACK MARKET CONTROLLER ───────────────────────────────────────────────

const BlackMarketWeapons = [
  { id: 'weapon_compactrifle', name: 'Compact Rifle', price: 15000, desc: "Half the size, all the power, double the recoil: there's no riskier way to say 'I'm compensating for something'" },
  { id: 'weapon_revolver', name: 'Heavy Revolver', price: 10000, desc: "A handgun with enough stopping power to drop a crazed rhino, and heavy enough to beat it to death if you're out of ammo." },
  { id: 'weapon_combatpdw', name: 'Combat PDW', price: 11000, desc: "Who said personal weaponry couldn't be worthy of military personnel? Thanks to our lobbyists, not Congress. Integral suppressor." },
  { id: 'weapon_pistol50', name: 'Pistol .50', price: 4000, desc: "High-impact pistol that delivers immense power but with extremely strong recoil. Holds 9 rounds in magazine." },
  { id: 'weapon_smg', name: 'SMG', price: 2000, desc: "This is known as a good all-around submachine gun. Lightweight with an accurate sight and 30-round magazine capacity." },
  { id: 'weapon_machinepistol', name: 'Machine Pistol', price: 5000, desc: "This fully automatic is the snare drum to your twin-engine V8 bass: no drive-by sounds quite right without it." },
  { id: 'weapon_carbinerifle', name: 'Carbine Rifle', price: 20000, desc: "Powerful rifle. Untraceable serial number. Military standard issue carbine." },
  { id: 'weapon_pumpshotgun', name: 'Pump Shotgun', price: 12000, desc: "Powerful at medium to close range. Untraceable serial number. Ideal crowd control." },
  { id: 'weapon_combatpistol', name: 'Combat Pistol', price: 5000, desc: "Handy sidearm. Untraceable serial number. Lightweight tactical frame." },
  { id: 'weapon_assaultrifle', name: 'Assault Rifle', price: 17000, desc: "This standard assault rifle boasts a large capacity magazine and long distance accuracy." }
];

const BlackMarketCustomizations = [
  { id: 'extendedclip', name: 'Drum Magazine', price: 10000, desc: "Extended capacity magazine, holding more than an extended clip. Compatible with assault rifles and submachine guns." },
  { id: 'suppressor', name: 'Suppressor', price: 30000, desc: "Reduces noise and muzzle flash. Ideal for tactical night ops and covert infiltration." }
];

const BlackMarketDealersStatic = [
  { id: 1, name: "Lester's Warehouse", area: "Murrieta Heights", coords: "1295.10, -1699.53, 54.10" },
  { id: 2, name: "Grove Street Alleyway", area: "Davis", coords: "284.94, -1772.87, 27.08" },
  { id: 3, name: "Vespucci Back-lot", area: "Vespucci Canals", coords: "-1259.31, -824.02, 16.12" },
  { id: 4, name: "Sandy Shores Depot", area: "Sandy Shores", coords: "1706.81, 3844.84, 33.95" },
  { id: 5, name: "Paleto Bay Warehouse", area: "Paleto Bay", coords: "-173.86, 6395.59, 30.51" }
];

let bmActiveItem = null;

function initBlackMarket() {
  nuiFetch('scanBlackMarket', {}).then(status => {
    const statusVal = document.getElementById('bm-dll-status');
    if (!statusVal) return;
    if (status.dll) {
      statusVal.innerText = 'ONLINE';
      statusVal.style.color = '#00ff66';
    } else {
      statusVal.innerText = 'OFFLINE';
      statusVal.style.color = '#ff4f5e';
    }
  }).catch(e => {
    console.error("Failed scanning Black Market files", e);
  });

  renderBlackMarketCatalog();
  renderBlackMarketCustom();
  renderBlackMarketDealers();
}

function switchBlackMarketTab(tabId, el) {
  const sidebar = el.closest('.blackmarket-sidebar');
  sidebar.querySelectorAll('.bm-nav-item').forEach(item => item.classList.remove('active'));
  el.classList.add('active');

  const parent = el.closest('.win-body');
  parent.querySelectorAll('.bm-section').forEach(sec => sec.classList.add('hidden'));
  
  if (tabId === 'weapons') {
    document.getElementById('bm-weapons-sec').classList.remove('hidden');
  } else if (tabId === 'custom') {
    document.getElementById('bm-custom-sec').classList.remove('hidden');
  } else if (tabId === 'dealers') {
    document.getElementById('bm-dealers-sec').classList.remove('hidden');
  }
}

function renderBlackMarketCatalog() {
  const container = document.getElementById('bm-weapons-catalog');
  if (!container) return;
  container.innerHTML = '';

  BlackMarketWeapons.forEach(w => {
    const card = document.createElement('div');
    card.className = 'bm-card';
    card.innerHTML = `
      <div class="bm-card-name">${w.name}</div>
      <div class="bm-card-desc">${w.desc}</div>
      <div class="bm-card-footer">
        <div class="bm-card-price">$${w.price.toLocaleString()}</div>
        <button class="bm-card-btn" onclick="openBMCheckout('${w.id}', '${w.name}', ${w.price})">Order</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderBlackMarketCustom() {
  const container = document.getElementById('bm-custom-catalog');
  if (!container) return;
  container.innerHTML = '';

  BlackMarketCustomizations.forEach(c => {
    const card = document.createElement('div');
    card.className = 'bm-card';
    card.innerHTML = `
      <div class="bm-card-name">${c.name}</div>
      <div class="bm-card-desc">${c.desc}</div>
      <div class="bm-card-footer">
        <div class="bm-card-price">$${c.price.toLocaleString()}</div>
        <button class="bm-card-btn" onclick="openBMCheckout('${c.id}', '${c.name}', ${c.price}, true)">Order</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderBlackMarketDealers() {
  const container = document.getElementById('bm-dealers-list');
  if (!container) return;
  container.innerHTML = '';

  BlackMarketDealersStatic.forEach(d => {
    const row = document.createElement('div');
    row.className = 'bm-dealer-row';
    row.innerHTML = `
      <div>
        <div class="bm-dealer-name">${d.name}</div>
        <div class="bm-dealer-coords">Area: ${d.area} | Vector: [${d.coords}]</div>
      </div>
      <div class="bm-dealer-status">Online</div>
    `;
    container.appendChild(row);
  });
}

function openBMCheckout(itemId, name, price, isCustom = false) {
  bmActiveItem = { id: itemId, name, price, isCustom };
  
  const modal = document.getElementById('bm-checkout-modal');
  document.getElementById('bm-modal-title').innerText = `Secure Shipment: ${name}`;
  document.getElementById('bm-modal-desc').innerText = `Establish encryption line for ordering ${name} costing $${price.toLocaleString()}. Select your preferred delivery protocol below.`;
  
  const radioDealer = document.querySelector('input[name="bm-delivery"][value="dealer"]');
  if (isCustom) {
    radioDealer.disabled = true;
    document.querySelector('input[name="bm-delivery"][value="direct"]').checked = true;
    toggleBMDealerSelect(false);
  } else {
    radioDealer.disabled = false;
  }
  
  modal.classList.remove('hidden');
}

function toggleBMDealerSelect(show) {
  const wrapper = document.getElementById('bm-dealer-select-wrapper');
  if (show) {
    wrapper.classList.remove('hidden');
  } else {
    wrapper.classList.add('hidden');
  }
}

function closeBMCheckout() {
  const modal = document.getElementById('bm-checkout-modal');
  modal.classList.add('hidden');
  bmActiveItem = null;
}

function confirmBMPurchase() {
  if (!bmActiveItem) return;
  
  const delivery = document.querySelector('input[name="bm-delivery"]:checked').value;
  const dealerIndex = document.getElementById('bm-dealer-select').value;
  
  closeBMCheckout();
  
  nuiFetch('purchaseBlackMarketWeapon', {
    itemId: bmActiveItem.id,
    price: bmActiveItem.price,
    delivery,
    dealerIndex
  }).then(res => {
    if (res.success) {
      if (res.direct) {
        showAppNotification("The Black Market", `${bmActiveItem.name} ordered successfully and direct dropped to your inventory!`);
      } else {
        const dealerName = BlackMarketDealersStatic.find(d => d.id == dealerIndex).name;
        showAppNotification("The Black Market", `Encryption tunnel locked. Pickup coordinates established at ${dealerName}. Drive to location.`);
      }
    } else {
      showAppNotification("The Black Market Error", res.error || "Transaction failed.");
    }
  }).catch(e => {
    console.error("Failed black market purchase NUI", e);
  });
}

// Make functions globally accessible
window.switchBlackMarketTab = switchBlackMarketTab;
window.openBMCheckout = openBMCheckout;
window.toggleBMDealerSelect = toggleBMDealerSelect;
window.closeBMCheckout = closeBMCheckout;
window.confirmBMPurchase = confirmBMPurchase;


