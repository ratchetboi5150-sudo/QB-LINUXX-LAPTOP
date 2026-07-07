let zIndexCounter = 10000; // Start above dock (z-index: 9999) so windows always appear on top
let currentExplorerTab = 'home';
let windowDragged = null;
let dragX = 0, dragY = 0;
let bootInterval = null;
let uptimeSeconds = 0;


let playerData = {
    name: "root",
    job: "Cyber Operative",
    grade: "Admin",
    bank: 25800,
    cash: 3400,
    citizenid: "ULT-9402"
};

// Listen for messages from client script
window.addEventListener('message', function(event) {
    let msg = event.data;
    
    if (msg.action === "open") {
        bootOS();
    } else if (msg.action === "close") {
        shutdownLaptopImmediate();
    } else if (msg.action === "receivePlayerData") {
        playerData = msg.data;
        updateSystemInfo();
    } else if (msg.action === "receiveNote") {
        document.getElementById('notepad-text').value = msg.text;
    } else if (msg.action === "notify") {
        showNotification(msg.title, msg.text);
    } else if (msg.action === "setDealingStatus") {
        setDealingStatusUI(msg.active);
    } else if (msg.action === "receiveDrugOrder") {
        receiveDrugOrderUI(msg.order);
    } else if (msg.action === "updatePlayerLocation") {
        updateFooglePlayerLocation(msg.x, msg.y);

    }
});

// ESC Key listener to close laptop
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        shutdownLaptop();
    }
});

// Click outside start menu to close it
document.addEventListener('click', function(event) {
    const menu = document.getElementById('start-menu');
    if (!menu.classList.contains('hidden')) {
        // Check if click was outside start-menu and not on a start-menu trigger
        const trigger = event.target.closest('.brand-menu, .user-dropdown-trigger, .dock-item[onclick*="toggleStartMenu"]');
        const insideMenu = event.target.closest('#start-menu');
        if (!trigger && !insideMenu) {
            menu.classList.add('hidden');
        }
    }
});


// Boot OS Simulation
function bootOS() {
    changeWallpaper(localStorage.getItem('laptop_wallpaper') || 'default');
    const overlay = document.getElementById('os-overlay');
    const screen = document.getElementById('laptop-screen');
    const overlayText = document.getElementById('overlay-text');
    const bootFill = document.getElementById('boot-fill');
    
    overlay.classList.remove('hidden');
    screen.classList.add('hidden');
    bootFill.style.width = "0%";
    overlayText.innerText = "Grub Loading: TDT MEDIA LINUXX LAPTOP...";
    
    // Request data from server
    fetch(`https://${GetParentResourceName()}/requestData`, { method: 'POST' });
    
    let progress = 0;
    if (bootInterval) clearInterval(bootInterval);
    
    bootInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress > 100) progress = 100;
        
        bootFill.style.width = `${progress}%`;
        
        if (progress < 30) {
            overlayText.innerText = "Loading kernel modules...";
        } else if (progress < 60) {
            overlayText.innerText = "Mounting file systems... [OK]";
        } else if (progress < 85) {
            overlayText.innerText = "Initializing network interface card... [OK]";
        } else {
            overlayText.innerText = "Starting GNOME GUI interface...";
        }
        
        if (progress >= 100) {
            clearInterval(bootInterval);
            setTimeout(() => {
                overlay.classList.add('hidden');
                screen.classList.remove('hidden');
                showNotification("System Initialized", "Bash shell secure node loaded.");
            }, 500);
        }
    }, 150);
}

// Update clock, conky, and system stats
function updateClockAndStats() {
    // 1. Top Panel Clock
    const clockEl = document.getElementById('panel-clock');
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    
    const timeStr = `${hours}:${minutes}:${seconds} ${ampm}`;
    const dateStr = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
    clockEl.innerText = `${timeStr} - ${dateStr}`;
    
    // Desktop Clock Widget
    const desktopTimeStr = `${hours}:${minutes}`;
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const desktopDateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    const deskTimeEl = document.getElementById('desktop-clock-time');
    const deskDateEl = document.getElementById('desktop-clock-date');
    if (deskTimeEl) deskTimeEl.innerText = desktopTimeStr;
    if (deskDateEl) deskDateEl.innerText = desktopDateStr;
    
    // CCTV clock update
    const cctvTime = document.getElementById('cctv-timestamp');
    if (cctvTime) {
        cctvTime.innerText = dateStr + " " + now.toTimeString().split(' ')[0];
    }
    
    // 2. Conky stats and top-panel cpu bar
    const cpuUsage = Math.floor(Math.random() * 20) + 8; // Random fluctuate cpu
    document.getElementById('top-cpu').innerText = `${cpuUsage}%`;
    document.getElementById('conky-cpu').innerText = `${cpuUsage}%`;
    document.getElementById('conky-cpu-bar').style.width = `${cpuUsage}%`;
    
    // Fluctuate memory slightly
    const ramUsage = (4.5 + Math.random() * 0.4).toFixed(1);
    document.getElementById('conky-ram').innerText = `${ramUsage} GB / 32 GB`;
    document.getElementById('conky-ram-bar').style.width = `${(ramUsage / 32) * 100}%`;
    
    // Increment uptime
    uptimeSeconds++;
    let uptMins = Math.floor(uptimeSeconds / 60);
    let uptHours = Math.floor(uptMins / 60);
    document.getElementById('conky-uptime').innerText = `${uptHours}h ${uptMins % 60}m`;
}
setInterval(updateClockAndStats, 1000);

// Start Menu Applications
function toggleStartMenu() {
    const menu = document.getElementById('start-menu');
    menu.classList.toggle('hidden');
}

// Window system management
function makeActive(winId) {
    const win = document.getElementById(winId);
    if (!win) return;
    
    // Remove active class from all windows
    document.querySelectorAll('.window').forEach(w => {
        w.classList.remove('active-win');
    });
    
    zIndexCounter++;
    win.style.zIndex = zIndexCounter;
    win.classList.add('active-win');
    win.classList.remove('minimized');
}

function openApp(appName) {
    const win = document.getElementById(`win-${appName}`);
    if (win) {
        if (typeof extState !== 'undefined' && extState.burn) {
            win.classList.add('burn-opening');
            setTimeout(() => win.classList.remove('burn-opening'), 400);
        }
        win.classList.add('opened');
        win.classList.add('active-win');
        win.classList.remove('minimized');
        makeActive(`win-${appName}`);
        
        if (appName === 'explorer') {
            loadExplorerFiles();
        } else if (appName === 'browser') {
            loadBrowserHome();
        } else if (appName === 'cctv') {
            loadCCTVList();
        } else if (appName === 'cmd') {
            focusCmd();
        } else if (appName === 'mail') {
            refreshMails();
        } else if (appName === 'market') {
            refreshMarket();
        } else if (appName === 'silkstreet') {
            loadSilkCatalog();
        } else if (appName === 'kingpin') {
            loadKingpinConfig();
        } else if (appName === 'directorder') {
            loadDirectCatalog();
        } else if (appName === 'ubereats') {
            loadUeMenu();
        } else if (appName === 'foogleearth') {
            initFoogleEarth();
        } else if (appName === 'trollcontrol') {
            initTrollControlApp();
        } else if (appName === 'jobboard') {
            initJobBoard();
        } else if (appName === 'warstock') {
            initWarstock();
        } else if (appName === 'business') {
            initBusiness();
        } else if (appName === '3dprint') {
            switchGlockTab('print');
        } else if (appName === 'lstrader') {
            loadTraderData();
        } else if (appName === 'dynasty8') {
            loadDynasty8Data();
        }
    }
}

function closeApp(appName) {
    const win = document.getElementById(`win-${appName}`);
    if (win) {
        if (typeof extState !== 'undefined' && extState.burn) {
            win.classList.add('burn-closing');
            setTimeout(() => {
                win.classList.remove('burn-closing');
                win.classList.remove('opened');
                win.classList.remove('active-win');
            }, 380);
        } else {
            win.classList.remove('opened');
            win.classList.remove('active-win');
        }
        if (appName === 'cctv') {
            closeCameraView();
        }
    }
}

function minimizeApp(appName) {
    const win = document.getElementById(`win-${appName}`);
    if (win) {
        win.classList.add('minimized');
    }
}

function toggleMaximize(winId) {
    const win = document.getElementById(winId);
    if (!win) return;
    
    if (win.style.width === '100%') {
        win.style.width = win.dataset.oldWidth || '600px';
        win.style.height = win.dataset.oldHeight || '400px';
        win.style.top = win.dataset.oldTop || '15%';
        win.style.left = win.dataset.oldLeft || '20%';
    } else {
        win.dataset.oldWidth = win.style.width;
        win.dataset.oldHeight = win.style.height;
        win.dataset.oldTop = win.style.top;
        win.dataset.oldLeft = win.style.left;
        
        win.style.width = '100%';
        win.style.height = 'calc(100% - 28px)';
        win.style.top = '28px';
        win.style.left = '0px';
    }
}

// Simple drag logic
function dragStart(e, winId) {
    makeActive(winId);
    
    const win = document.getElementById(winId);
    if (win.style.width === '100vw') return; 
    
    windowDragged = win;
    dragX = e.clientX - win.offsetLeft;
    dragY = e.clientY - win.offsetTop;
    
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
}

function dragMove(e) {
    if (!windowDragged) return;
    windowDragged.style.left = `${e.clientX - dragX}px`;
    windowDragged.style.top = `${e.clientY - dragY}px`;
}

function dragEnd() {
    windowDragged = null;
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
}

// File Manager - Linux Paths
function switchExplorerTab(tab) {
    currentExplorerTab = tab;
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    loadExplorerFiles();
}

function loadExplorerFiles() {
    const pane = document.getElementById('explorer-files');
    pane.innerHTML = '';
    
    let files = [];
    if (currentExplorerTab === 'home') {
        files = [
            { name: "Documents", icon: "fa-folder-open", type: "dir", target: "documents" },
            { name: "Downloads", icon: "fa-download", type: "dir", target: "downloads" },
            { name: "var", icon: "fa-folder", type: "dir", target: "system" }
        ];
    } else if (currentExplorerTab === 'documents') {
        files = [
            { name: "Cyber_Script.sh", icon: "fa-file-code", type: "txt", content: "echo 'Initializing cybersecurity network audit tool...'\nssh -t admin@192.168.1.1" },
            { name: "Notes.txt", icon: "fa-file-lines", type: "txt", content: "System credentials set to administrative bypass. Keep Gedit editor synced with main server database." }
        ];
    } else if (currentExplorerTab === 'downloads') {
        files = [
            { name: "bazaar_manifest.json", icon: "fa-file-code", type: "txt", content: '{\n  "vendor": "Red_Network",\n  "version": 1.2\n}' },
            { name: "nic_driver.tar.gz", icon: "fa-file-zipper", type: "zip", content: "driver source files compressed. extract using tar -xzf in console." }
        ];
    } else if (currentExplorerTab === 'system') {
        files = [
            { name: "bin", icon: "fa-folder", type: "dir", target: "system" },
            { name: "etc", icon: "fa-folder", type: "dir", target: "system" },
            { name: "root", icon: "fa-triangle-exclamation", type: "warning", content: "root node restricted. require sudo clearance." }
        ];
    }
    
    files.forEach(f => {
        const item = document.createElement('div');
        item.className = 'explorer-file';
        item.innerHTML = `<i class="fa-solid ${f.icon}"></i><span>${f.name}</span>`;
        item.onclick = () => {
            if (f.type === 'dir') {
                switchExplorerTab(f.target);
            } else if (f.type === 'txt' || f.type === 'warning' || f.type === 'zip') {
                showNotification(f.name, f.content);
            }
        };
        pane.appendChild(item);
    });
}

// Direfox web browser loading
function loadBrowserHome() {
    const pane = document.getElementById('browser-content');
    document.getElementById('browser-url').value = "https://www.eyefind.info";
    
    pane.innerHTML = `
        <div class="eyefind-container">
            <div class="eyefind-header">
                <div class="eyefind-logo">eye<span>find</span></div>
                <div class="eyefind-search">
                    <input type="text" value="Browse secure domains..." readonly>
                    <button><i class="fa-solid fa-magnifying-glass"></i></button>
                </div>
            </div>
            <div class="eyefind-links">
                <div class="web-portal-card" onclick="loadMazeBank()">
                    <i class="fa-solid fa-building-columns"></i>
                    <h4>Maze Bank</h4>
                    <p>Secure virtual banking interface</p>
                </div>
                <div class="web-portal-card" onclick="loadDarknet()">
                    <i class="fa-solid fa-mask"></i>
                    <h4>Red Network onion</h4>
                    <p>Subnet peer network marketplace</p>
                </div>
                <div class="web-portal-card" onclick="loadGtaDev('home')">
                    <i class="fa-solid fa-code text-purple"></i>
                    <h4>GTADev.org</h4>
                    <p>GTA V Developer repository & code hub</p>
                </div>
            </div>
        </div>
    `;
}

function loadMazeBank() {
    const pane = document.getElementById('browser-content');
    document.getElementById('browser-url').value = "https://www.mazebank.com/portal";
    
    pane.innerHTML = `
        <div class="mazebank-page">
            <div class="maze-header">
                <div class="maze-logo">MAZE<span>BANK</span></div>
                <div style="font-size:11px; opacity:0.8; font-family:var(--font-mono)">NODE_ID: ${playerData.name}</div>
            </div>
            <div class="maze-dash">
                <div class="maze-card">
                    <h4>Accounts Portal</h4>
                    <br>
                    <div style="font-size:10px; opacity:0.7;">Online Account Node:</div>
                    <div class="maze-balance">$${playerData.bank.toLocaleString()}</div>
                    <div style="font-size:10px; opacity:0.7;">Liquid Cash Reserve:</div>
                    <div style="font-size:16px; font-weight:600; color:#ff0055; margin-top:5px;">$${playerData.cash.toLocaleString()}</div>
                </div>
                <div class="maze-card">
                    <h4>Log Records</h4>
                    <ul class="maze-trans">
                        <li class="pos"><span>Direct deposit</span><span>+$1,200</span></li>
                        <li class="neg"><span>Weapon cache order</span><span>-$1,500</span></li>
                        <li class="neg"><span>NIC bypass buy</span><span>-$800</span></li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function loadDarknet() {
    const pane = document.getElementById('browser-content');
    document.getElementById('browser-url').value = "https://rednet.onion/bazaar";
    
    pane.innerHTML = `
        <div class="darknet-page">
            <div class="darknet-logo">> ENCRYPTED BAZAAR NODE // RED_NETWORK</div>
            <div class="darknet-grid">
                <div class="darknet-item">
                    <div>
                        <h4>Security Decryptor Kit</h4>
                        <p style="font-size:10px; color:#64748b;">Decrypt vehicle interfaces or alarm networks.</p>
                    </div>
                    <div>
                        <div class="darknet-price">$1,500</div>
                        <button class="darknet-btn" onclick="buyDarknetItem('Security Decryptor Kit')">BUY NODE</button>
                    </div>
                </div>
                <div class="darknet-item">
                    <div>
                        <h4>VPN Scrambler Card</h4>
                        <p style="font-size:10px; color:#64748b;">Conceal server locations from security nodes.</p>
                    </div>
                    <div>
                        <div class="darknet-price">$800</div>
                        <button class="darknet-btn" onclick="buyDarknetItem('VPN Scrambler Card')">BUY NODE</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buyDarknetItem(itemName) {
    showNotification("Purchase Completed", `Encrypted packet secured for: ${itemName}.`);
    fetch(`https://${GetParentResourceName()}/darknetPurchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: itemName })
    });
}

function refreshBrowser() {
    const url = document.getElementById('browser-url').value;
    if (url.includes("mazebank")) {
        loadMazeBank();
    } else if (url.includes("rednet")) {
        loadDarknet();
    } else if (url.includes("gtadev")) {
        loadGtaDev();
    } else {
        loadBrowserHome();
    }
}

// Settings Glow theme toggle
function setGlowTheme(color) {
    const root = document.documentElement;
    if (color === 'green') {
        root.style.setProperty('--glow-color', '#00ff66');
        root.style.setProperty('--glow-shadow', '0 0 10px rgba(0, 255, 102, 0.4)');
        root.style.setProperty('--border-glass-dark', 'rgba(0, 255, 102, 0.2)');
    } else if (color === 'red') {
        root.style.setProperty('--glow-color', '#ff0055');
        root.style.setProperty('--glow-shadow', '0 0 10px rgba(255, 0, 85, 0.4)');
        root.style.setProperty('--border-glass-dark', 'rgba(255, 0, 85, 0.2)');
    } else {
        root.style.setProperty('--glow-color', '#00f3ff');
        root.style.setProperty('--glow-shadow', '0 0 10px rgba(0, 243, 255, 0.4)');
        root.style.setProperty('--border-glass-dark', 'rgba(0, 243, 255, 0.2)');
    }
    showNotification("Glow Aesthetic", `UI accent changed to neon ${color}.`);
}

function switchSettingsTab(tab) {
    document.querySelectorAll('.settings-sidebar-item').forEach(el => {
        el.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    document.getElementById('settings-personalization').style.display = 'none';
    document.getElementById('settings-system-info').style.display = 'none';
    const extPane = document.getElementById('settings-extensions');
    if (extPane) extPane.style.display = 'none';
    const rssPane = document.getElementById('settings-rss');
    if (rssPane) rssPane.style.display = 'none';

    if (tab === 'personalization') {
        document.getElementById('settings-personalization').style.display = 'block';
    } else if (tab === 'system-info') {
        document.getElementById('settings-system-info').style.display = 'block';
    } else if (tab === 'extensions' && extPane) {
        extPane.style.display = 'block';
    } else if (tab === 'rss' && rssPane) {
        rssPane.style.display = 'block';
        loadRSSConfig();
    }
}

function changeWallpaper(style) {
    const wallpaper = document.getElementById('desktop-wallpaper');
    if (!wallpaper) return;

    const wallpapers = {
        'default':     { bg: 'linear-gradient(135deg, #020617 0%, #0b0f19 50%, #1e112a 100%)', size: 'auto' },
        'sunset':      { bg: 'linear-gradient(135deg, #0f051d 0%, #180325 50%, #3a001a 100%)', size: 'auto' },
        'neon':        { bg: 'linear-gradient(135deg, #030712 0%, #0c101d 50%, #022c22 100%)', size: 'auto' },
        'forest':      { bg: 'linear-gradient(135deg, #020804 0%, #06150a 50%, #0b240f 100%)', size: 'auto' },
        'abstract-1':  { bg: "url('./wallpapers/wp1.jpg')", size: 'cover' },
        'abstract-2':  { bg: "url('./wallpapers/wp2.jpg')", size: 'cover' },
        'abstract-3':  { bg: "url('./wallpapers/wp3.jpg')", size: 'cover' },
        'abstract-4':  { bg: "url('./wallpapers/wp4.jpg')", size: 'cover' },
        'abstract-5':  { bg: "url('./wallpapers/wp5.jpg')", size: 'cover' },
        'abstract-6':  { bg: "url('./wallpapers/wp6.jpg')", size: 'cover' },
        'abstract-7':  { bg: "url('./wallpapers/wp7.jpg')", size: 'cover' },
        'abstract-8':  { bg: "url('./wallpapers/wp8.jpg')", size: 'cover' },
        'abstract-9':  { bg: "url('./wallpapers/wp9.jpg')", size: 'cover' },
        'abstract-10': { bg: "url('./wallpapers/wp10.jpg')", size: 'cover' }
    };

    const chosen = wallpapers[style] || wallpapers['default'];
    wallpaper.style.background = chosen.bg;
    wallpaper.style.backgroundSize = chosen.size;
    wallpaper.style.backgroundPosition = 'center';
    wallpaper.style.backgroundRepeat = 'no-repeat';
    localStorage.setItem('laptop_wallpaper', style);
    showNotification("Wallpaper", "Desktop wallpaper updated.");
}

function updateSystemInfo() {
    document.getElementById('owner-name').innerText = playerData.name;
    document.getElementById('start-user-name').innerText = "root@" + playerData.name.replace(/\s+/g, '').toLowerCase();
    document.getElementById('start-user-status').innerText = "Job: " + playerData.job;
    
    // Conky
    document.getElementById('conky-id').innerText = playerData.citizenid;
    document.getElementById('conky-job').innerText = playerData.job;
    document.getElementById('conky-bank').innerText = "$" + playerData.bank.toLocaleString();
}

let cctvActive = false;

// CCTV Cameras list
const cameras = [
    { id: 1, name: "Pacific Bank CAM#1", x: 257.45, y: 210.07, z: 109.08, rX: -25.0, rY: 0.0, rZ: 28.05 },
    { id: 2, name: "Limited Ltd Grove St.", x: -53.1433, y: -1746.714, z: 31.546, rX: -35.0, rY: 0.0, rZ: -168.9182 },
    { id: 3, name: "Premium Deluxe Motorsport", x: -60.01, y: -1099.78, z: 30.26, rX: -25.0, rY: 0.0, rZ: 193.3 }
];

function loadCCTVList() {
    const list = document.getElementById('cctv-list');
    list.innerHTML = '';
    
    cameras.forEach(cam => {
        const item = document.createElement('div');
        item.className = 'cctv-item';
        item.innerHTML = `<i class="fa-solid fa-eye"></i> <span>${cam.name}</span>`;
        item.onclick = () => {
            document.querySelectorAll('.cctv-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            viewCamera(cam);
        };
        list.appendChild(item);
    });
}

let cctvHoleLoop;
function startCCTVHolePunch() {
    function update() {
        if (!cctvActive) return;
        const vp = document.getElementById('cctv-display');
        const wallpaper = document.getElementById('desktop-wallpaper');
        const win = document.getElementById('win-cctv');
        const blocker = document.getElementById('screen-blocker');
        if (vp && wallpaper) {
            const rect = vp.getBoundingClientRect();
            const left = rect.left + 'px';
            const top = rect.top + 'px';
            const right = rect.right + 'px';
            const bottom = rect.bottom + 'px';
            
            const clipPathVal = `polygon(0% 0%, 0% 100%, ${left} 100%, ${left} ${top}, ${right} ${top}, ${right} ${bottom}, ${left} ${bottom}, ${left} 100%, 100% 100%, 100% 0%)`;
            wallpaper.style.clipPath = clipPathVal;
            
            if (blocker) {
                blocker.style.display = 'block';
                blocker.style.clipPath = clipPathVal;
            }
            
            if (win) {
                win.style.background = 'transparent';
                win.style.backdropFilter = 'none';
                win.style.boxShadow = 'none';
            }
            const bodyEl = win ? win.querySelector('.cctv-body') : null;
            if (bodyEl) bodyEl.style.background = 'transparent';
        } else {
            if (wallpaper) wallpaper.style.clipPath = '';
            if (blocker) {
                blocker.style.display = 'none';
                blocker.style.clipPath = 'none';
            }
        }
        cctvHoleLoop = requestAnimationFrame(update);
    }
    update();
}

function stopCCTVHolePunch() {
    if (cctvHoleLoop) cancelAnimationFrame(cctvHoleLoop);
    const wallpaper = document.getElementById('desktop-wallpaper');
    const win = document.getElementById('win-cctv');
    const blocker = document.getElementById('screen-blocker');
    if (wallpaper) wallpaper.style.clipPath = '';
    if (blocker) {
        blocker.style.display = 'none';
        blocker.style.clipPath = 'none';
    }
    if (win) {
        win.style.background = '';
        win.style.backdropFilter = '';
        win.style.boxShadow = '';
        const bodyEl = win.querySelector('.cctv-body');
        if (bodyEl) bodyEl.style.background = '';
    }
}

function viewCamera(cam) {
    document.getElementById('cctv-current-name').innerText = cam.name;
    const feed = document.getElementById('cctv-display');
    feed.innerHTML = '';
    feed.style.background = 'transparent';
    
    // Start hole punch instead of fullscreen
    cctvActive = true;
    startCCTVHolePunch();
    
    fetch(`https://${GetParentResourceName()}/viewCamera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cam)
    });
}

function closeCameraView() {
    if (cctvActive) {
        cctvActive = false;
        stopCCTVHolePunch();
        fetch(`https://${GetParentResourceName()}/closeCamera`, { method: 'POST' });
        
        // Put back offline static
        const feed = document.getElementById('cctv-display');
        if (feed) {
            feed.innerHTML = '<div class="cctv-static"><i class="fa-solid fa-ban"></i> OFFLINE</div>';
            feed.style.background = '';
        }
        const nameEl = document.getElementById('cctv-current-name');
        if (nameEl) nameEl.innerText = 'SELECT STREAM NODE';
    }
}

document.addEventListener('keydown', function(e) {
    if (!cctvActive) return;
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) {
        fetch(`https://${GetParentResourceName()}/rotateCamera`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key })
        });
    }
});

// Gedit Notepad Save & Clear
function saveNote() {
    const text = document.getElementById('notepad-text').value;
    fetch(`https://${GetParentResourceName()}/saveNote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: text })
    });
}

function clearNote() {
    document.getElementById('notepad-text').value = '';
    showNotification("Gedit", "Buffer editor cleared.");
}

// Linux bash terminal shell simulator
function focusCmd() {
    document.getElementById('cmd-input').focus();
}

document.getElementById('cmd-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const inputVal = this.value.trim();
        this.value = '';
        if (inputVal === '') return;
        
        handleTerminalCommand(inputVal);
    }
});

function handleTerminalCommand(cmdText) {
    const history = document.getElementById('cmd-history');
    history.innerHTML += `<div><span class="cmd-prompt">user@ultimate-pc:~$</span>${cmdText}</div>`;
    
    let output = "";
    const lowerCmd = cmdText.toLowerCase();
    
    if (lowerCmd === 'help') {
        output = `
            Ultimate Shell Utilities:<br>
            - help       : Display shell documentation<br>
            - clear      : Flush console history<br>
            - uname -a   : Display Linux kernel build parameters<br>
            - whoami     : Current security context level<br>
            - ifconfig   : Network card statistics<br>
            - sudo apt update: Query package archives
        `;
    } else if (lowerCmd === 'clear') {
        history.innerHTML = '';
        return;
    } else if (lowerCmd === 'uname -a') {
        output = `Linux ultimate-pc 6.2.0-7.5-generic #42-Arch SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`;
    } else if (lowerCmd === 'whoami') {
        output = `uid=0(root) gid=0(root) groups=0(root)<br>Citizen Node: ${playerData.citizenid}<br>Active Agent: ${playerData.name}`;
    } else if (lowerCmd === 'ifconfig') {
        output = `eth0: flags=4163&lt;UP,BROADCAST,RUNNING,MULTICAST&gt;  mtu 1500<br>
                  inet 192.168.1.144  netmask 255.255.255.0  broadcast 192.168.1.255<br>
                  rx packets 120593 bytes 84029103  tx packets 84920 bytes 9482910`;
    } else if (lowerCmd === 'sudo apt update' || lowerCmd === 'sudo pacman -syu') {
        output = `<span style="color:#00ff66;">Hit:1 https://archive.ultimate-edition.org/arch core InRelease<br>
                  Fetch:2 https://archive.ultimate-edition.org/arch extra InRelease<br>
                  Reading package lists... Done<br>
                  Building dependency tree... Done<br>
                  All packages are up to date.</span>`;
    } else if (lowerCmd.startsWith('sudo-')) {
        const cheat = lowerCmd.substring(5);
        const allowedCheats = [
            'hoptoit', 'incendiary', 'hothands', 'highex', 'skydive',
            'floater', 'liquor', 'powerup', 'slowmo', 'skyfall',
            'bandit', 'comet', 'rocket', 'offroad', 'rapidgt',
            'vinewood', 'trashed', 'buzzoff', 'barnstorm', 'deadeye',
            'painkiller', 'turtle', 'catchme', 'gotgills', 'fugitive',
            'lawyerup', 'makeitrain', 'snowday'
        ];
        if (allowedCheats.includes(cheat)) {
            fetch(`https://${GetParentResourceName()}/triggerTerminalCheat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cheat: cheat })
            });
            output = `<span style="color:#00ff66; font-weight:bold;">[SUCCESS] Cheat payload injection authorized: ${cheat.toUpperCase()}</span>`;
        } else {
            output = `<span style="color:#ff3333;">[ERROR] Unauthorized cheat payload: ${cheat}</span>`;
        }
    } else {
        output = `bash: ${cmdText}: command not found`;
    }
    
    history.innerHTML += `<div>${output}</div><br>`;
    
    // Scroll
    const winBody = document.querySelector('.cmd-body');
    winBody.scrollTop = winBody.scrollHeight;
}

// Notifications system
function showNotification(title, text) {
    const container = document.getElementById('notification-container');
    const noti = document.createElement('div');
    noti.className = 'notification';
    noti.innerHTML = `
        <div class="noti-header">
            <span>${title}</span>
            <i class="fa-solid fa-bell"></i>
        </div>
        <div class="noti-body">${text}</div>
    `;
    container.appendChild(noti);
    
    setTimeout(() => { noti.classList.add('show'); }, 50);
    
    setTimeout(() => {
        noti.classList.remove('show');
        setTimeout(() => { noti.remove(); }, 300);
    }, 4500);
}

// Close session and call parent resource
function shutdownLaptop() {
    const overlay = document.getElementById('os-overlay');
    const overlayText = document.getElementById('overlay-text');
    const bootFill = document.getElementById('boot-fill');
    
    overlay.classList.remove('hidden');
    bootFill.style.width = "100%";
    overlayText.innerText = "Closing kernel threads... System halt.";
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        document.getElementById('laptop-screen').classList.add('hidden');
        fetch(`https://${GetParentResourceName()}/close`, { method: 'POST' });
    }, 1000);
}

function shutdownLaptopImmediate() {
    document.getElementById('os-overlay').classList.add('hidden');
    document.getElementById('laptop-screen').classList.add('hidden');
}

// Mail Account States
let mailLoggedIn = false;
let activeMailUser = "";
let currentMailFolder = "inbox";
let allMails = []; // Store fetched emails

function toggleMailPortalCard(showLogin) {
    if (showLogin) {
        document.getElementById('mail-login-card').classList.remove('hidden');
        document.getElementById('mail-register-card').classList.add('hidden');
    } else {
        document.getElementById('mail-login-card').classList.add('hidden');
        document.getElementById('mail-register-card').classList.remove('hidden');
    }
}

function previewMailAddress() {
    let val = document.getElementById('mail-reg-username').value.trim();
    if (val) {
        document.getElementById('mail-preview-addr').innerText = `Your address: ${val}@fivemail.com`;
    } else {
        document.getElementById('mail-preview-addr').innerText = "";
    }
}

function mailSignIn() {
    let user = document.getElementById('mail-login-username').value.trim();
    let pass = document.getElementById('mail-login-password').value;
    let err = document.getElementById('mail-login-error');
    err.innerText = "";
    
    if (!user || !pass) {
        err.innerText = "Please fill in all fields.";
        return;
    }
    
    fetch(`https://${GetParentResourceName()}/mailSignIn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    }).then(res => res.json()).then(res => {
        if (res.status === "ok") {
            mailLoggedIn = true;
            activeMailUser = user;
            document.getElementById('mail-active-address').innerText = `${user}@fivemail.com`;
            document.getElementById('mail-portal').classList.add('hidden');
            document.getElementById('mail-app-layout').classList.remove('hidden');
            refreshMails();
        } else {
            err.innerText = res.message || "Invalid credentials.";
        }
    });
}

function mailSignUp() {
    let user = document.getElementById('mail-reg-username').value.trim();
    let pass = document.getElementById('mail-reg-password').value;
    let confirm = document.getElementById('mail-reg-confirm').value;
    let err = document.getElementById('mail-reg-error');
    err.innerText = "";
    
    if (!user || !pass || !confirm) {
        err.innerText = "Please fill in all fields.";
        return;
    }
    if (pass !== confirm) {
        err.innerText = "Passwords do not match.";
        return;
    }
    
    fetch(`https://${GetParentResourceName()}/mailSignUp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    }).then(res => res.json()).then(res => {
        if (res.status === "ok") {
            showNotification("Registration", "Account created successfully!");
            toggleMailPortalCard(true);
            document.getElementById('mail-login-username').value = user;
        } else {
            err.innerText = res.message || "Username already taken.";
        }
    });
}

function mailSignOut() {
    mailLoggedIn = false;
    activeMailUser = "";
    document.getElementById('mail-portal').classList.remove('hidden');
    document.getElementById('mail-app-layout').classList.add('hidden');
    document.getElementById('mail-login-password').value = "";
}

function loadMailFolder(folder) {
    currentMailFolder = folder;
    document.querySelectorAll('.mail-folder').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('mail-folder-title').innerText = folder.charAt(0).toUpperCase() + folder.slice(1);
    
    closeMailCompose();
    closeMailRead();
    renderMailsList();
}

function refreshMails() {
    if (!mailLoggedIn) return;
    
    fetch(`https://${GetParentResourceName()}/getMails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: activeMailUser })
    }).then(res => res.json()).then(data => {
        allMails = data || [];
        renderMailsList();
    });
}

function renderMailsList() {
    let container = document.getElementById('mail-list-container');
    container.innerHTML = "";
    
    let filtered = allMails.filter(m => {
        if (currentMailFolder === "inbox") {
            return m.to === activeMailUser;
        } else {
            return m.from === activeMailUser;
        }
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; font-size: 11px; color: #64748b;">No messages in this folder</div>`;
        return;
    }
    
    filtered.forEach(m => {
        let dateStr = new Date(m.timestamp * 1000).toLocaleDateString();
        let item = document.createElement('div');
        item.className = `mail-item ${(!m.read && m.to === activeMailUser) ? 'unread' : ''}`;
        item.innerHTML = `
            <div class="mail-item-left">
                <span class="mail-item-sender">${m.from}@fivemail.com</span>
                <span class="mail-item-subject">${m.object}</span>
            </div>
            <span class="mail-item-date">${dateStr}</span>
        `;
        item.onclick = () => readMail(m);
        container.appendChild(item);
    });
}

function readMail(mail) {
    document.getElementById('mail-list-view').classList.add('hidden');
    document.getElementById('mail-read-view').classList.remove('hidden');
    
    document.getElementById('mail-read-subject').innerText = mail.object;
    document.getElementById('mail-read-meta').innerText = `From: ${mail.from}@fivemail.com | To: ${mail.to}@fivemail.com`;
    document.getElementById('mail-read-body').innerText = mail.text;
    
    let replyBtn = document.getElementById('mail-reply-btn');
    replyBtn.onclick = () => {
        showMailCompose();
        document.getElementById('mail-compose-to').value = `${mail.from}@fivemail.com`;
        document.getElementById('mail-compose-subject').value = `Re: ${mail.object}`;
    };
    
    if (!mail.read && mail.to === activeMailUser) {
        mail.read = true;
        fetch(`https://${GetParentResourceName()}/readMail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mail.id })
        });
    }
}

function closeMailRead() {
    document.getElementById('mail-list-view').classList.remove('hidden');
    document.getElementById('mail-read-view').classList.add('hidden');
    renderMailsList();
}

function showMailCompose() {
    document.getElementById('mail-compose-view').classList.remove('hidden');
    document.getElementById('mail-list-view').classList.add('hidden');
    document.getElementById('mail-read-view').classList.add('hidden');
    
    document.getElementById('mail-compose-to').value = "";
    document.getElementById('mail-compose-subject').value = "";
    document.getElementById('mail-compose-body').value = "";
    document.getElementById('mail-compose-error').innerText = "";
}

function closeMailCompose() {
    document.getElementById('mail-compose-view').classList.add('hidden');
    document.getElementById('mail-list-view').classList.remove('hidden');
}

function sendMail() {
    let toInput = document.getElementById('mail-compose-to').value.trim();
    let sub = document.getElementById('mail-compose-subject').value.trim();
    let body = document.getElementById('mail-compose-body').value.trim();
    let err = document.getElementById('mail-compose-error');
    err.innerText = "";
    
    if (!toInput || !body) {
        err.innerText = "Recipient and message body are required.";
        return;
    }
    
    let toUser = toInput.replace("@fivemail.com", "");
    
    fetch(`https://${GetParentResourceName()}/sendMail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: activeMailUser,
            to: toUser,
            object: sub || "(No Subject)",
            text: body
        })
    }).then(res => res.json()).then(res => {
        if (res.status === "ok") {
            showNotification("Mail System", "Message sent successfully!");
            closeMailCompose();
            refreshMails();
        } else {
            err.innerText = res.message || "Failed to send message. Recipient not found.";
        }
    });
}

// Market Logic
let marketListings = [];

function refreshMarket() {
    fetch(`https://${GetParentResourceName()}/getMarketListings`, {
        method: 'POST'
    }).then(res => res.json()).then(data => {
        marketListings = data || [];
        renderMarketListings();
    });
}

function renderMarketListings() {
    let container = document.getElementById('market-listings-container');
    container.innerHTML = "";
    
    if (marketListings.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; font-size: 11px; color: #64748b;">No active listings found</div>`;
        return;
    }
    
    marketListings.forEach(item => {
        let dateStr = new Date(item.timestamp * 1000).toLocaleDateString();
        let isOwner = item.seller === playerData.citizenid;
        
        let elem = document.createElement('div');
        elem.className = "market-item";
        elem.innerHTML = `
            <h4>${item.title}</h4>
            <div class="market-item-desc">${item.description}</div>
            <div class="market-item-meta">
                <span>Seller: ${item.seller_name || 'Anonymous'}</span>
                <span>${dateStr}</span>
            </div>
            ${isOwner ? `<i class="fa-solid fa-trash-can market-item-delete" onclick="deleteMarketPost(${item.id})"></i>` : ""}
        `;
        container.appendChild(elem);
    });
}

function publishMarketPost() {
    let title = document.getElementById('market-post-title').value.trim();
    let desc = document.getElementById('market-post-desc').value.trim();
    let err = document.getElementById('market-post-error');
    err.innerText = "";
    
    if (!title || !desc) {
        err.innerText = "Please fill in all fields.";
        return;
    }
    
    fetch(`https://${GetParentResourceName()}/postMarket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: title,
            description: desc,
            seller: playerData.citizenid,
            seller_name: playerData.name
        })
    }).then(res => res.json()).then(res => {
        if (res.status === "ok") {
            showNotification("Cyber Market", "Listing posted successfully!");
            document.getElementById('market-post-title').value = "";
            document.getElementById('market-post-desc').value = "";
            refreshMarket();
        } else {
            err.innerText = res.message || "Failed to publish listing.";
        }
    });
}

function deleteMarketPost(id) {
    fetch(`https://${GetParentResourceName()}/deleteMarketPost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, seller: playerData.citizenid })
    }).then(res => res.json()).then(res => {
        if (res.status === "ok") {
            showNotification("Cyber Market", "Listing deleted.");
            refreshMarket();
        } else {
            showNotification("Error", "Could not delete listing.");
        }
    });
}

// GTADev.org Website Implementation
let currentGtaDevPage = "home";
let selectedGtaDevScript = null;

let gtaDevScripts = [
    {
        sid: 1,
        title: "Simple Vehicle Spawner",
        description: "A lightweight ASI script in C++ to spawn vehicles by model name.",
        ctype: "C++ (ASI)",
        author: "Meth0d",
        date: "08/12/2016",
        rawcode: `#include "sdk.h"\n\nvoid SpawnVehicle(const char* model) {\n    Hash hash = GetHashKey(model);\n    if (IsModelInCdimage(hash)) {\n        RequestModel(hash);\n        while (!HasModelLoaded(hash)) Wait(0);\n        Vector3 coords = GetEntityCoords(PlayerPedId(), true);\n        CreateVehicle(hash, coords.x, coords.y, coords.z, 0.0f, true, false);\n    }\n}`
    },
    {
        sid: 2,
        title: "God Mode and Inf Ammo",
        description: ".NET script hook script to toggle God Mode and infinite ammunition.",
        ctype: ".NET (ScriptHookVDotNet)",
        author: "HackerOne",
        date: "09/15/2016",
        rawcode: `using GTA;\nusing System.Windows.Forms;\n\npublic class GodMode : Script {\n    public GodMode() {\n        KeyDown += OnKeyDown;\n    }\n    private void OnKeyDown(object sender, KeyEventArgs e) {\n        if (e.KeyCode == Keys.F5) {\n            Game.Player.Character.IsInvincible = !Game.Player.Character.IsInvincible;\n            UI.Notify("GodMode: " + Game.Player.Character.IsInvincible);\n        }\n    }\n}`
    },
    {
        sid: 3,
        title: "Ped Controller Menu",
        description: "Lua script using GTA Lua Plugin to manipulate nearby NPCs.",
        ctype: "LUA (GTA Lua Plugin)",
        author: "LuaDev",
        date: "10/01/2016",
        rawcode: `-- Lua Ped Control\nfunction FreezePeds()\n    local peds = get_all_peds()\n    for _, ped in ipairs(peds) do\n        if not is_ped_a_player(ped) then\n            freeze_entity_position(ped, true)\n        end\n    end\nend`
    }
];

function loadGtaDev(pageName) {
    if (pageName) currentGtaDevPage = pageName;
    const pane = document.getElementById('browser-content');
    document.getElementById('browser-url').value = `https://www.gtadev.org/${currentGtaDevPage}`;
    
    pane.innerHTML = `
        <div class="gtadev-site" style="display: flex; height: 100%; text-align: left; background: #fff; color: #333; font-family: 'Open Sans', sans-serif;">
            <div class="gtadev-sidebar" style="width: 210px; background: linear-gradient(to bottom, #563e80, #133259); padding: 25px 20px; color: #fff; display: flex; flex-direction: column; gap: 18px; height: 100%; box-sizing: border-box; flex-shrink: 0;">
                <div class="gtadev-logo" style="font-weight: 700; font-size: 20px; color: #fff; margin-bottom: 20px; display: inline-block; background: rgba(255,255,255,0.15); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.25); text-align: center;">
                    <i class="fa-solid fa-code"></i> GTADev<span style="font-size: 11px; font-weight: 300;">.org</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <a onclick="loadGtaDev('home')" class="gtadev-nav-link ${currentGtaDevPage === 'home' ? 'active' : ''}" style="color: #fff; cursor: pointer; font-size: 12px; text-decoration: none; padding: 6px 12px; border-radius: 4px; display: block; font-weight: 600; background: ${currentGtaDevPage === 'home' ? 'rgba(255,255,255,0.2)' : 'transparent'}">Home</a>
                    <a onclick="loadGtaDev('send')" class="gtadev-nav-link ${currentGtaDevPage === 'send' ? 'active' : ''}" style="color: #fff; cursor: pointer; font-size: 12px; text-decoration: none; padding: 6px 12px; border-radius: 4px; display: block; font-weight: 600; background: ${currentGtaDevPage === 'send' ? 'rgba(255,255,255,0.2)' : 'transparent'}">Send a Script</a>
                    <a onclick="loadGtaDev('scripts')" class="gtadev-nav-link ${currentGtaDevPage === 'scripts' ? 'active' : ''}" style="color: #fff; cursor: pointer; font-size: 12px; text-decoration: none; padding: 6px 12px; border-radius: 4px; display: block; font-weight: 600; background: ${currentGtaDevPage === 'scripts' ? 'rgba(255,255,255,0.2)' : 'transparent'}">Scripts Database</a>
                    <a onclick="loadGtaDev('tutorials')" class="gtadev-nav-link ${currentGtaDevPage === 'tutorials' ? 'active' : ''}" style="color: #fff; cursor: pointer; font-size: 12px; text-decoration: none; padding: 6px 12px; border-radius: 4px; display: block; font-weight: 600; background: ${currentGtaDevPage === 'tutorials' ? 'rgba(255,255,255,0.2)' : 'transparent'}">Tutorials</a>
                    <a onclick="loadGtaDev('changelog')" class="gtadev-nav-link ${currentGtaDevPage === 'changelog' ? 'active' : ''}" style="color: #fff; cursor: pointer; font-size: 12px; text-decoration: none; padding: 6px 12px; border-radius: 4px; display: block; font-weight: 600; background: ${currentGtaDevPage === 'changelog' ? 'rgba(255,255,255,0.2)' : 'transparent'}">Changelog</a>
                </div>
                <div style="margin-top: auto; font-size: 10px; opacity: 0.8; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px;">
                    <b>2016 &copy; GTADev.org by Meth0d</b><br>
                    All available content is only for educational purposes and pure entertainment.
                </div>
            </div>
            <div class="gtadev-main" id="gtadev-main-pane" style="flex-grow: 1; padding: 30px; overflow-y: auto; text-align: left; background: #fff; color: #333; height: 100%; box-sizing: border-box;">
                <!-- Dynamic Content Load -->
            </div>
        </div>
    `;
    
    renderGtaDevContent();
}

function renderGtaDevContent() {
    const mainPane = document.getElementById('gtadev-main-pane');
    if (!mainPane) return;
    
    if (currentGtaDevPage === "home") {
        mainPane.innerHTML = `
            <h2 style="margin-bottom: 15px; font-weight: 600;">Welcome to GTADev.org</h2>
            <p style="margin-bottom: 20px; color: #555; line-height: 1.6;">A place for GTA V mod developers!</p>
            
            <h3 style="font-size: 16px; margin-bottom: 8px; font-weight: 700;">GTADev.org</h3>
            <p style="margin-bottom: 20px; color: #555; line-height: 1.6;">
                GTA Dev is a website made by modders for modders created to organize and centralize all the stuff related to GTA V coding, like scripts/snippets, tutorials, game code lists and much more.
                Our members help to build the script database, sending their own scripts.
            </p>
            
            <h3 style="font-size: 16px; margin-bottom: 8px; font-weight: 700;">What we want!</h3>
            <p style="margin-bottom: 20px; color: #555; line-height: 1.6;">
                We want to be the biggest GTA V database of code/scripts snippets, tutorials, game code lists and also to be useful for new developers to learn how to code mods.
            </p>
            
            <h3 style="font-size: 16px; margin-bottom: 8px; font-weight: 700;">Learn and Contribute</h3>
            <p style="margin-bottom: 20px; color: #555; line-height: 1.6;">
                We are a LEARN-CONTRIBUTE community, all the scripts/codes are made by GTA mod developers. Feel free to add and learn new stuff at any moment, for FREE.
            </p>
            
            <h3 style="font-size: 16px; margin-bottom: 8px; font-weight: 700;">The Scripts Database</h3>
            <p style="margin-bottom: 25px; color: #555; line-height: 1.6;">
                Support for 4 game script languages: <b>C++ (ASI)</b>, <b>.NET (ScriptHookVDotNet)</b>, <b>LUA (GTA Lua Plugin)</b>, <b>RAGE (RagePluginHook)</b>.
            </p>
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #563e80;">
                <button onclick="loadGtaDev('send')" style="background: #22c55e; border: none; padding: 8px 16px; font-weight: bold; color: white; border-radius: 4px; cursor: pointer; margin-right: 10px;">Send a Script</button> 
                or <a onclick="loadGtaDev('scripts')" style="color: #4f46e5; font-weight: 600; cursor: pointer; text-decoration: underline;">Explore Scripts Database</a>
            </div>
        `;
    }
    
    else if (currentGtaDevPage === "send") {
        mainPane.innerHTML = `
            <h2 style="margin-bottom: 15px; font-weight: 600;">Send a Script</h2>
            <p style="margin-bottom: 20px; color: #555; line-height: 1.6;">Share your code snippet with the GTA V modding community.</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 500px;">
                <div>
                    <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 5px; color: #475569;">Title</label>
                    <input type="text" id="gtadev-send-title" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; box-sizing: border-box;" placeholder="e.g. Teleport to Waypoint">
                </div>
                <div>
                    <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 5px; color: #475569;">Script Language</label>
                    <select id="gtadev-send-type" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; box-sizing: border-box; background: #fff;">
                        <option value="C++ (ASI)">C++ (ASI)</option>
                        <option value=".NET (ScriptHookVDotNet)">.NET (ScriptHookVDotNet)</option>
                        <option value="LUA (GTA Lua Plugin)">LUA (GTA Lua Plugin)</option>
                        <option value="RAGE (RagePluginHook)">RAGE (RagePluginHook)</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 5px; color: #475569;">Author</label>
                    <input type="text" id="gtadev-send-author" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; box-sizing: border-box;" placeholder="Your Developer Handle">
                </div>
                <div>
                    <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 5px; color: #475569;">Description</label>
                    <input type="text" id="gtadev-send-desc" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; box-sizing: border-box;" placeholder="Brief summary of what this code does">
                </div>
                <div>
                    <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 5px; color: #475569;">Source Code</label>
                    <textarea id="gtadev-send-code" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; height: 150px; box-sizing: border-box; font-family: monospace; font-size: 11px; resize: none;" placeholder="Paste raw code here..."></textarea>
                </div>
                <button onclick="submitGtaDevScript()" style="background: #563e80; border: none; padding: 10px 20px; font-weight: bold; color: white; border-radius: 4px; cursor: pointer; align-self: flex-start;">Submit Script</button>
                <div id="gtadev-send-error" style="color: #ef4444; font-size: 12px; margin-top: 10px;"></div>
            </div>
        `;
    }
    
    else if (currentGtaDevPage === "scripts") {
        if (selectedGtaDevScript) {
            mainPane.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <a onclick="selectedGtaDevScript=null; renderGtaDevContent();" style="color: #4f46e5; cursor: pointer; font-size: 12px; font-weight: 600;"><i class="fa-solid fa-arrow-left"></i> Back to Database</a>
                </div>
                <h2 style="margin-bottom: 5px; font-weight: 600;">${selectedGtaDevScript.title}</h2>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 15px;">
                    Language: <span style="background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 3px; font-weight: 600; font-size: 10px;">${selectedGtaDevScript.ctype}</span> &middot; Author: <b>${selectedGtaDevScript.author}</b> &middot; Date: ${selectedGtaDevScript.date}
                </div>
                <p style="margin-bottom: 20px; font-size: 13px; color: #334155; background: #f8fafc; padding: 10px; border-radius: 4px;">${selectedGtaDevScript.description}</p>
                <h3 style="font-size: 14px; margin-bottom: 8px; font-weight: 700;">Raw Code</h3>
                <pre style="background: #0f172a; color: #38bdf8; padding: 15px; border-radius: 6px; overflow: auto; max-height: 250px; font-family: monospace; font-size: 11px; text-align: left; line-height: 1.5; white-space: pre-wrap;">${selectedGtaDevScript.rawcode}</pre>
            `;
        } else {
            let listHtml = "";
            gtaDevScripts.forEach(s => {
                listHtml += `
                    <div onclick="viewGtaDevScript(${s.sid})" style="padding: 12px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                        <div style="font-weight: 600; color: #1e293b; font-size: 13px; margin-bottom: 4px;">${s.title}</div>
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${s.description}</div>
                        <div style="font-size: 9px; display: flex; gap: 8px; align-items: center;">
                            <span style="background: #e0e7ff; color: #4338ca; padding: 1px 6px; border-radius: 2px; font-weight: 600;">${s.ctype}</span>
                            <span>By: <b>${s.author}</b></span>
                            <span>${s.date}</span>
                        </div>
                    </div>
                `;
            });
            
            mainPane.innerHTML = `
                <h2 style="margin-bottom: 10px; font-weight: 600;">Scripts Database</h2>
                <p style="margin-bottom: 20px; color: #555; font-size: 12px;">Browse snippets shared by GTA developers.</p>
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff;">
                    ${listHtml}
                </div>
            `;
        }
    }
    
    else if (currentGtaDevPage === "tutorials") {
        let cardsHtml = "";
        let tuts = [
            { title: "How To Rig Custom Weapons For GTA V", author: "TheNathanNS", url: "https://www.youtube.com/watch?v=c7C6xABz3Vg", img: "https://i.ytimg.com/vi/c7C6xABz3Vg/hqdefault.jpg", date: "08/11/2016" },
            { title: "Convert Weapon - How to Edit YDR files", author: "Zagor TV", url: "https://www.youtube.com/watch?v=G552Euni-6k", img: "https://i.ytimg.com/vi/G552Euni-6k/hqdefault.jpg", date: "08/11/2016" },
            { title: "Convert WDR model to YDR ", author: "GTA X Scripting", url: "https://www.youtube.com/watch?v=ZbuWWL-dmCs", img: "https://i.ytimg.com/vi/ZbuWWL-dmCs/hqdefault.jpg", date: "08/11/2016" },
            { title: "Editing Gun Models", author: "Trophi Hunter", url: "https://www.youtube.com/watch?v=un6I-zpdQuo", img: "https://i.ytimg.com/vi/un6I-zpdQuo/hqdefault.jpg", date: "08/11/2016" },
            { title: "Gun Animation Tutorial", author: "Trophi Hunter", url: "https://www.youtube.com/watch?v=lbars9Xbx_M", img: "https://i.ytimg.com/vi/lbars9Xbx_M/hqdefault.jpg", date: "08/11/2016" },
            { title: "How to open a YFT file", author: "Arkhantia Studio", url: "https://www.youtube.com/watch?v=C5veGzgQoBI", img: "https://i.ytimg.com/vi/C5veGzgQoBI/hqdefault.jpg", date: "08/11/2016" },
            { title: "Basic Ped Component Replacement", author: "ZModeler3", url: "https://www.youtube.com/watch?v=iNH2EN9B0ds", img: "https://i.ytimg.com/vi/iNH2EN9B0ds/hqdefault.jpg", date: "08/11/2016" },
            { title: "How To Cut Or Trim Cars Properly", author: "iSMACKZi", url: "https://www.youtube.com/watch?v=jvLKclK6QJ4", img: "https://i.ytimg.com/vi/jvLKclK6QJ4/hqdefault.jpg", date: "08/11/2016" },
            { title: "Creating a new GXT2 file for a DLCPack", author: "SonofUgly", url: "https://www.youtube.com/watch?v=0mLvfBJZlXU", img: "https://i.ytimg.com/vi/0mLvfBJZlXU/hqdefault.jpg", date: "08/11/2016" },
            { title: "GTA Scripting Tutorial - Mod Menus", author: "Metiri Personal", url: "https://www.youtube.com/watch?v=6bNairKXjrM", img: "https://i.ytimg.com/vi/6bNairKXjrM/hqdefault.jpg", date: "08/11/2016" }
        ];
        
        tuts.forEach(t => {
            cardsHtml += `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; width: 140px; box-sizing: border-box; flex-shrink: 0;">
                    <a href="${t.url}" target="_blank" style="display:block; width:100%; height:90px; overflow:hidden;">
                        <img src="${t.img}" style="width:100%; height:100%; object-fit:cover;">
                    </a>
                    <div style="padding: 8px; display: flex; flex-direction: column; flex-grow: 1;">
                        <a href="${t.url}" target="_blank" style="font-weight: 700; font-size: 10px; text-decoration: none; color: #1e293b; margin-bottom: 6px; line-height: 1.3; display: block; overflow: hidden; height: 2.6em;">${t.title}</a>
                        <span style="font-size: 8px; color: #64748b; margin-top: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">By: <b>${t.author}</b></span>
                    </div>
                </div>
            `;
        });
        
        mainPane.innerHTML = `
            <h2 style="margin-bottom: 10px; font-weight: 600;">Tutorials</h2>
            <p style="margin-bottom: 20px; color: #555; font-size: 12px;">Useful guides to create mods and custom game contents.</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${cardsHtml}
            </div>
        `;
    }
    
    else if (currentGtaDevPage === "changelog") {
        mainPane.innerHTML = `
            <h2 style="margin-bottom: 10px; font-weight: 600;">Changelog</h2>
            <p style="margin-bottom: 20px; color: #555; font-size: 12px;">See website development updates.</p>
            
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div>
                    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">v1.3</h3>
                    <ul style="margin-left: 20px; font-size: 12px; color: #475569; line-height: 1.6;">
                        <li>Added new category "Tutorials"</li>
                        <li>XSS Protection Enabled</li>
                    </ul>
                </div>
                <div>
                    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">v1.2</h3>
                    <ul style="margin-left: 20px; font-size: 12px; color: #475569; line-height: 1.6;">
                        <li>New script languages support (ASI, .NET, LUA, RAGE)</li>
                        <li>Filter scripts by category</li>
                        <li>Added funcs.js (javascript extra codes)</li>
                    </ul>
                </div>
                <div>
                    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">v1.1</h3>
                    <ul style="margin-left: 20px; font-size: 12px; color: #475569; line-height: 1.6;">
                        <li>Code verification improvements</li>
                        <li>Added blocked IP's system</li>
                        <li>Facebook Plugin in English Version</li>
                    </ul>
                </div>
                <div>
                    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">v1.0</h3>
                    <ul style="margin-left: 20px; font-size: 12px; color: #475569; line-height: 1.6;">
                        <li>Initial release</li>
                    </ul>
                </div>
            </div>
        `;
    }
}

function viewGtaDevScript(sid) {
    let script = gtaDevScripts.find(s => s.sid === sid);
    if (script) {
        selectedGtaDevScript = script;
        renderGtaDevContent();
    }
}

function submitGtaDevScript() {
    let title = document.getElementById('gtadev-send-title').value.trim();
    let type = document.getElementById('gtadev-send-type').value;
    let author = document.getElementById('gtadev-send-author').value.trim();
    let desc = document.getElementById('gtadev-send-desc').value.trim();
    let code = document.getElementById('gtadev-send-code').value.trim();
    let err = document.getElementById('gtadev-send-error');
    err.innerText = "";
    
    if (!title || !author || !desc || !code) {
        err.innerText = "Please fill in all fields.";
        return;
    }
    
    let newScript = {
        sid: gtaDevScripts.length + 1,
        title: title,
        description: desc,
        ctype: type,
        author: author,
        date: new Date().toLocaleDateString(),
        rawcode: code
    };
    
    gtaDevScripts.push(newScript);
    showNotification("GTADev.org", "Script submitted successfully!");
    loadGtaDev('scripts');
}

// ==========================================
// SILK STREET APPLICATION LOGIC
// ==========================================
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
    { id: "meth", name: "Meth Crystals", price: 700, category: "contraband" },
    { id: "oxy", name: "Oxycodone Pill", price: 300, category: "contraband" },
    { id: "perc_5", name: "Percocet 5mg", price: 100, category: "contraband" },
    { id: "perc_7_5", name: "Percocet 7.5mg", price: 150, category: "contraband" },
    { id: "perc_10", name: "Percocet 10mg", price: 200, category: "contraband" },
    { id: "perc_15", name: "Percocet 15mg", price: 300, category: "contraband" },
    { id: "perc_30", name: "Percocet 30mg", price: 500, category: "contraband" },
    { id: "perc_30_bottle", name: "Percocet 30mg Bottle", price: 12000, category: "contraband" },
    { id: "weed_whitewidow_seed", name: "White Widow Seed", price: 80, category: "seeds" },
    { id: "weed_skunk_seed", name: "Skunk Seed", price: 80, category: "seeds" },
    { id: "weed_purplehaze_seed", name: "Purple Haze Seed", price: 90, category: "seeds" },
    { id: "weed_ogkush_seed", name: "OG Kush Seed", price: 90, category: "seeds" },
    { id: "weed_amnesia_seed", name: "Amnesia Seed", price: 100, category: "seeds" },
    { id: "weed_ak47_seed", name: "AK47 Seed", price: 100, category: "seeds" },
    { id: "rolling_paper", name: "Rolling Papers", price: 15, category: "supplies" },
    { id: "empty_weed_bag", name: "Empty Baggies", price: 5, category: "supplies" },
    { id: "weed_nutrition", name: "Plant Fertilizer", price: 150, category: "supplies" },
    { id: "weapon_knife", name: "Combat Knife", price: 150, category: "weapons" },
    { id: "weapon_molotov", name: "Molotov Cocktail", price: 500, category: "weapons" },
    { id: "weapon_pistol", name: "9mm Pistol", price: 1500, category: "weapons" },
    { id: "weapon_microsmg", name: "Micro SMG", price: 5000, category: "weapons" },
    { id: "weapon_assaultrifle", name: "Assault Rifle", price: 12500, category: "weapons" }
];

let silkCart = {};
let silkActiveTab = 'contraband';
let silkDutyActive = false;
let silkDealingActive = false;

function switchSilkTab(tabName) {
    silkActiveTab = tabName;
    document.querySelectorAll('.silkstreet-nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.silk-section').forEach(el => el.classList.add('hidden'));
    
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
    if (show) drawer.classList.remove('hidden');
    else drawer.classList.add('hidden');
}

function renderSilkCart() {
    const container = document.getElementById('silk-cart-items');
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
    
    const delivery = document.querySelector('input[name="silk-delivery"]:checked').value;
    
    // Calculate real total from catalog prices
    let totalCost = 0;
    Object.entries(silkCart).forEach(([id, qty]) => {
        const p = SilkProductCatalog.find(prod => prod.id === id);
        if (p) totalCost += p.price * qty;
    });
    
    fetch(`https://${GetParentResourceName()}/purchaseSilkStreetContraband`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, delivery, totalCost })
    }).then(() => {
        showNotification("Silk Street", `Escrow order placed! $${totalCost.toLocaleString()} charged to bank.`);
        silkCart = {};
        document.getElementById('silk-cart-count').innerText = 0;
        toggleSilkCart(false);
        loadSilkCatalog();
        closeApp('silkstreet');
    });
}

function loadSilkContracts() {
    const container = document.getElementById('silk-contracts');
    container.innerHTML = '';
    
    const contracts = [
        { id: "union_vault", label: "Union Depository Raid", dll: "SinglePlayerHeists.dll" },
        { id: "dispensary_raid", label: "Dispensary Robbery", dll: "DispensaryHeist.dll" },
        { id: "island_temple", label: "Cayo Temple Intrusion", dll: "IslandTempleHeist.dll" },
        { id: "beef_slaughterhouse", label: "The Slaughterhouse Deal", dll: "The beef.dll" },
        { id: "dealer_ambush", label: "Street Distributor Drop", dll: "DaPlug.dll" },
        { id: "home_invasion", label: "SP Home Invasion", dll: "HomeInvasion.dll" }
    ];
    
    contracts.forEach(c => {
        const row = document.createElement('div');
        row.className = 'silk-contract-row';
        row.innerHTML = `
            <div>
                <span style="font-weight:bold; color:white; font-size:11px;">${c.label}</span>
                <div style="font-size:9px; color:#5b5f7a; font-family:var(--font-mono); margin-top:2px;">Binary: ${c.dll}</div>
            </div>
            <button class="silk-btn-action" onclick="injectSilkContract('${c.id}')">Inject Route</button>
        `;
        container.appendChild(row);
    });
}

function injectSilkContract(name) {
    fetch(`https://${GetParentResourceName()}/acceptDarkContract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: name })
    }).then(() => {
        showNotification("Silk Street", `Contract payload injected: ${name}`);
        closeApp('silkstreet');
    });
}

function orderSilkMerc() {
    fetch(`https://${GetParentResourceName()}/silkStreetOrderMerc`, {
        method: 'POST'
    }).then(res => res.json()).then(res => {
        if (res && res.success) {
            showNotification("Silk Street", "Tactical mercenary hired successfully!");
            closeApp('silkstreet');
        } else {
            showNotification("Silk Street Error", res.error || "Insufficient funds!");
        }
    });
}

function toggleSilkDuty() {
    let nextVal = !silkDutyActive;
    fetch(`https://${GetParentResourceName()}/silkStreetToggleDuty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextVal })
    }).then(() => {
        silkDutyActive = nextVal;
        const badge = document.getElementById('silk-duty-badge');
        if (silkDutyActive) {
            badge.innerText = "ON-DUTY";
            badge.className = "silk-status-badge online";
        } else {
            badge.innerText = "OFF-DUTY";
            badge.className = "silk-status-badge offline";
        }
        showNotification("Silk Street VIP", `Security duty toggled to ${silkDutyActive ? 'ON' : 'OFF'}`);
    });
}

function toggleSilkDealing() {
    let nextVal = !silkDealingActive;
    fetch(`https://${GetParentResourceName()}/silkStreetToggleDealing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextVal })
    }).then(res => res.json()).then(res => {
        if (res && res.success) {
            setDealingStatusUI(nextVal);
        } else {
            showNotification("Silk Street Error", res.error || "Failed to toggle drug trade line");
        }
    });
}

function setDealingStatusUI(active) {
    silkDealingActive = active;
    const badge = document.getElementById('silk-dealing-badge');
    if (active) {
        badge.innerText = "ONLINE";
        badge.className = "silk-status-badge online";
        showNotification("Silk Street Dealing", "Encrypted dealer network online.");
    } else {
        badge.innerText = "OFFLINE";
        badge.className = "silk-status-badge offline";
        document.getElementById('silk-active-deal-card').classList.add('hidden');
        showNotification("Silk Street Dealing", "Encrypted dealer network offline.");
    }
}

function receiveDrugOrderUI(order) {
    if (!order) return;
    const card = document.getElementById('silk-active-deal-card');
    card.classList.remove('hidden');
    document.getElementById('silk-deal-details').innerHTML = `
        Buyer: <b>${order.clientName}</b><br/>
        Item: <b>${order.qty}x ${order.itemLabel}</b><br/>
        Payout: <span style="color:#00ff66;">$${order.payout}</span>
    `;
    showNotification("New Drug Order Received", `Client ${order.clientName} is requesting delivery.`);
}

// ==========================================
// KINGPIN APPLICATION LOGIC
// ==========================================
let kingpinActiveTab = 'status';
let kingpinConfig = null;
let kingpinActiveWaypoint = null;

function switchKingpinTab(tabName) {
    kingpinActiveTab = tabName;
    document.querySelectorAll('.kingpin-nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.kingpin-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`kp-${tabName}-sec`).classList.remove('hidden');
}

function loadKingpinConfig() {
    fetch(`https://${GetParentResourceName()}/ds-get-config`, {
        method: 'POST'
    }).then(res => res.json()).then(data => {
        if (data && data.success) {
            kingpinConfig = data;
            
            // Render Rep status
            const save = data.saves?.[0] || { xp: 0, hideoutbought: 0, vehiclelevel: 0 };
            const xp = save.xp || 0;
            document.getElementById('kp-rank-name').innerText = getTrapRankName(xp);
            
            const nextXp = getNextLevelXP(xp);
            const minXp = getCurrentLevelMinXP(xp);
            const progressPercent = Math.min(100, Math.max(0, Math.floor(((xp - minXp) / (nextXp - minXp)) * 100)));
            
            document.getElementById('kp-rep-text').innerText = `${xp.toLocaleString()} / ${nextXp.toLocaleString()} XP`;
            document.getElementById('kp-rep-bar').style.width = progressPercent + '%';
            
            // Hideout
            const hideoutBadge = document.getElementById('kp-hideout-status');
            if (save.hideoutbought === 1) {
                hideoutBadge.innerText = "YES (ACTIVE)";
                hideoutBadge.className = "text-green";
            } else {
                hideoutBadge.innerText = "NO";
                hideoutBadge.className = "text-red";
            }
            
            // Transport
            document.getElementById('kp-vehicle-level').innerText = `Level ${save.vehiclelevel || 0}`;
            
            // Inventory Table
            const invTable = document.getElementById('kp-inv-table');
            invTable.innerHTML = '';
            const drugs = [
                { id: "weed", label: "Weed Stock" },
                { id: "cocaine", label: "Cocaine Stock" },
                { id: "meth", label: "Meth Crystals" },
                { id: "heroin", label: "Heroin Stock" },
                { id: "morphine", label: "Morphine Stock" },
                { id: "tramadol", label: "Tramadol Stock" },
                { id: "kratom", label: "Kratom Stock" },
                { id: "oxycodone", label: "Oxycodone Stock" }
            ];
            drugs.forEach(d => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color:#8e9bb5;">${d.label}</td>
                    <td style="text-align:right; font-weight:bold; color:white;">${(save[d.id] || 0)}g</td>
                `;
                invTable.appendChild(tr);
            });
            
            // Render Deals / Buyer List
            renderKingpinDeals(data.customers || []);
            
            // Render Depots
            renderKingpinDepots(data.dealers || []);
        }
    });
}

function getTrapRankName(xp) {
    if (xp >= 10000) return "Cartel Kingpin";
    if (xp >= 5000) return "Major Distributor";
    if (xp >= 2000) return "Street Lord";
    if (xp >= 800) return "Experienced Pusher";
    if (xp >= 300) return "Active Hustler";
    return "Street Runner";
}
function getNextLevelXP(xp) {
    if (xp >= 10000) return 25000;
    if (xp >= 5000) return 10000;
    if (xp >= 2000) return 5000;
    if (xp >= 800) return 2000;
    if (xp >= 300) return 800;
    return 300;
}
function getCurrentLevelMinXP(xp) {
    if (xp >= 10000) return 10000;
    if (xp >= 5000) return 5000;
    if (xp >= 2000) return 2000;
    if (xp >= 800) return 800;
    if (xp >= 300) return 300;
    return 0;
}

function getNeighborhood(x, y) {
    if (x < -1000 && y < -1000) return "La Puerta / Airport Area";
    if (x < 0 && y < -1000) return "South Los Santos / Davis";
    if (x > 0 && y < -1000) return "Cypress Flats / Terminal";
    if (x < 0 && y > -1000 && y < 0) return "Chamberlain Hills / Strawberry";
    if (x > 0 && y > -1000 && y < 0) return "El Burro Heights / Murrieta";
    if (x < -1000 && y > -1000 && y < 1000) return "Banham Canyon / Pacific Bluffs";
    if (x < 0 && y > 0 && y < 1000) return "Rockford Hills / Vinewood";
    if (x > 0 && y > 0 && y < 1000) return "Mirror Park / Land Act";
    if (y > 1000 && y < 4000) return "Sandy Shores / Grand Senora";
    if (y > 4000) return "Paleto Bay / Mount Chiliad";
    return "Los Santos County";
}

function renderKingpinDeals(customers) {
    const container = document.getElementById('kp-buyer-list');
    container.innerHTML = '';
    
    if (customers.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:#5b5f7a; font-size:10px;">No buyer coordinates online.</div>';
        return;
    }
    
    customers.forEach((c, index) => {
        const isCurrent = kingpinActiveWaypoint === index;
        const row = document.createElement('div');
        row.className = 'kp-row';
        row.innerHTML = `
            <div>
                <span style="font-weight:bold; color:white; font-size:11px;">Deal Coordinate #${index + 1}</span>
                <div style="font-size:9px; color:#00ff66; margin-top:2px;">Sector: ${getNeighborhood(c.x, c.y)}</div>
            </div>
            <button class="kp-gps-btn ${isCurrent ? 'active' : ''}" onclick="toggleKingpinGPS(${JSON.stringify(c)}, ${index})">
                <i class="fa-solid fa-location-arrow"></i>
            </button>
        `;
        container.appendChild(row);
    });
}

function toggleKingpinGPS(customer, index) {
    event.stopPropagation();
    const isCurrent = kingpinActiveWaypoint === index;
    if (isCurrent) {
        fetch(`https://${GetParentResourceName()}/ds-clear-gps`, { method: 'POST' }).then(() => {
            kingpinActiveWaypoint = null;
            loadKingpinConfig();
            showNotification("Kingpin GPS", "Target coordinates cleared.");
        });
    } else {
        fetch(`https://${GetParentResourceName()}/ds-set-gps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: customer.x, y: customer.y, z: customer.z })
        }).then(() => {
            kingpinActiveWaypoint = index;
            loadKingpinConfig();
            showNotification("Kingpin GPS", "Buyer drop point locked on minimap!");
        });
    }
}

function renderKingpinDepots(dealers) {
    const container = document.getElementById('kp-depots-list');
    container.innerHTML = '';
    
    dealers.forEach((d, idx) => {
        const card = document.createElement('div');
        card.className = 'kp-depot-card';
        card.innerHTML = `
            <h4>Supply Depot #${idx + 1}</h4>
            <div style="font-size:9px; display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; justify-content:space-between;"><span>Weed Limit:</span> <span style="color:#00ff66;">${d.weed}g</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Coke Limit:</span> <span style="color:#00ff66;">${d.cocaine}g</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Heroin Limit:</span> <span style="color:#00ff66;">${d.heroin}g</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Oxy Limit:</span> <span style="color:#00ff66;">${d.oxycodone}g</span></div>
            </div>
        `;
        container.appendChild(card);
    });
}

function syncKingpinConfig() {
    showNotification("Kingpin Firewall", "Initiating config query...");
    setTimeout(() => {
        loadKingpinConfig();
        showNotification("Kingpin Database", "Config re-synced successfully!");
    }, 1000);
}

// ==========================================
// DIRECT ORDER APPLICATION LOGIC
// ==========================================
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
    "3d_printer": { name: "3D Printer", price: 15000, icon: "ð¨ï¸" },
    "home_monitor": { name: "Home Monitor", price: 3500, icon: "ð¥" }
};

const DirectMotorCatalog = {
    tempesta: { name: "Pegassi Tempesta", price: 750000, img: "https://i.imgur.com/Wp7DQL2.png" },
    zentorno: { name: "Pegassi Zentorno", price: 950000, img: "https://i.imgur.com/eB3Rcr4.png" },
    nero: { name: "Truffade Nero", price: 1600000, img: "https://i.imgur.com/hYyXy51.png" },
    deathbike: { name: "Western Deathbike", price: 1200000, img: "https://i.imgur.com/vHq4wJg.png" }
};

let directCart = {};
let directActiveTab = 'gear';

function switchDirectTab(tabName) {
    directActiveTab = tabName;
    document.querySelectorAll('.do-nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.do-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`do-${tabName}-sec`).classList.remove('hidden');
}

function loadDirectCatalog() {
    // Render Gear
    const gearGrid = document.getElementById('do-gear-catalog');
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

    // Render Motors
    const motorGrid = document.getElementById('do-motors-catalog');
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

    // Update displays
    document.getElementById('do-loan-debt').innerText = '$' + (playerData.loanDebt || 0).toLocaleString();
    document.getElementById('do-credit-balance').innerText = '$' + (playerData.creditBalance || 0).toLocaleString() + ' / $1,000,000';
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
    if (show) drawer.classList.remove('hidden');
    else drawer.classList.add('hidden');
}

function renderDirectCart() {
    const container = document.getElementById('do-cart-items');
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
    
    const delivery = document.querySelector('input[name="do-delivery"]:checked').value;
    
    // Calculate real total from catalog prices
    let totalCost = 0;
    Object.entries(directCart).forEach(([id, data]) => {
        const info = data.type === 'standard' ? DirectGearCatalog[id] : DirectMotorCatalog[id];
        if (info) totalCost += info.price * data.qty;
    });
    
    fetch(`https://${GetParentResourceName()}/chooseDirectDelivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, delivery, totalCost })
    }).then(res => res.json()).then(res => {
        if (res && res.success) {
            showNotification("Direct Order", `Purchase confirmed! $${totalCost.toLocaleString()} charged to bank.`);
            playerData.bank -= totalCost;
            updateSystemInfo();
            if (document.getElementById('browser-url').value === "https://www.mazebank.com/portal") {
                openMazeBank();
            }
            directCart = {};
            document.getElementById('do-cart-count').innerText = 0;
            toggleDirectCart(false);
            loadDirectCatalog();
            closeApp('directorder');
        } else {
            showNotification("Direct Order Ã¢â‚¬â€ Payment Failed", res.error || "Insufficient bank funds!");
        }
    });
}

function takeDoLoan() {
    const amount = parseInt(document.getElementById('do-loan-input').value);
    if (!amount || amount <= 0) return;
    fetch(`https://${GetParentResourceName()}/takeFleecaLoan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    }).then(res => res.json()).then(res => {
        if (res.success) {
            playerData.loanDebt = res.newDebt;
            playerData.bank += amount;
            updateSystemInfo();
            if (document.getElementById('browser-url').value === "https://www.mazebank.com/portal") {
                openMazeBank();
            }
            loadDirectCatalog();
            showNotification("Direct Order Bank", `Micro Loan of $${amount} drawn.`);
        }
    });
}
function repayDoLoan() {
    const amount = parseInt(document.getElementById('do-loan-input').value);
    if (!amount || amount <= 0) return;
    fetch(`https://${GetParentResourceName()}/repayFleecaLoan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    }).then(res => res.json()).then(res => {
        if (res.success) {
            playerData.loanDebt = res.newDebt;
            playerData.bank -= amount;
            updateSystemInfo();
            if (document.getElementById('browser-url').value === "https://www.mazebank.com/portal") {
                openMazeBank();
            }
            loadDirectCatalog();
            showNotification("Direct Order Bank", `Loan repayment of $${amount} accepted.`);
        }
    });
}
function withdrawDoCredit() {
    const amount = parseInt(document.getElementById('do-credit-input').value);
    if (!amount || amount <= 0) return;
    fetch(`https://${GetParentResourceName()}/lombankWithdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    }).then(res => res.json()).then(res => {
        if (res.success) {
            playerData.creditBalance = res.newBalance;
            playerData.bank += amount;
            updateSystemInfo();
            if (document.getElementById('browser-url').value === "https://www.mazebank.com/portal") {
                openMazeBank();
            }
            loadDirectCatalog();
            showNotification("LomBank Credit", `Withdrew $${amount} from credit line.`);
        }
    });
}
function repayDoCredit() {
    const amount = parseInt(document.getElementById('do-credit-input').value);
    if (!amount || amount <= 0) return;
    fetch(`https://${GetParentResourceName()}/lombankRepay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    }).then(res => res.json()).then(res => {
        if (res.success) {
            playerData.creditBalance = res.newBalance;
            playerData.bank -= amount;
            updateSystemInfo();
            if (document.getElementById('browser-url').value === "https://www.mazebank.com/portal") {
                openMazeBank();
            }
            loadDirectCatalog();
            showNotification("LomBank Credit", `Paid $${amount} towards credit line.`);
        }
    });
}

function triggerDoBlackout() {
    showNotification("City Grid", "Transmitting EMP overrider protocols...");
    fetch(`https://${GetParentResourceName()}/paigeTriggerBlackout`, { method: 'POST' }).then(() => {
        closeApp('directorder');
    });
}

function hackDoATM() {
    showNotification("Signal Scanner", "Scanning nearby network lines...");
    fetch(`https://${GetParentResourceName()}/paigeHackATM`, { method: 'POST' }).then(res => res.json()).then(res => {
        if (res.success) {
            showNotification("Paige Bypass Link", "ATM Signal scanner initiated. Check GPS.");
            closeApp('directorder');
        } else {
            showNotification("Paige Link Failure", res.error || "No ATMs in local network.");
        }
    });
}

// ==========================================
// UBER EATS APPLICATION LOGIC
// ==========================================
const UeFoodCatalog = [
    { id: "bleeder_burger", name: "Bleeder Burger", price: 45, icon: "🍔", desc: "Triple-patty beef burger with cheese and signature Bleeder sauce." },
    { id: "classic_burger", name: "Classic Burger", price: 30, icon: "🍔", desc: "Grilled beef patty with fresh lettuce, tomatoes, and pickles." },
    { id: "double_burger", name: "Double Burger", price: 40, icon: "🍔", desc: "Double juicy beef patties with extra cheddar and special relish." },
    { id: "chicken_nuggets", name: "Chicken Nuggets", price: 25, icon: "🍗", desc: "6 pieces of golden crispy chicken nuggets with honey mustard sauce." },
    { id: "fastfood_bag", name: "Gen Fastfood Bag", price: 85, icon: "🛍️", desc: "A complete combo meal with burger, fries, and a soft drink." },
    { id: "food_bag", name: "Gen Food Bag", price: 75, icon: "🛍️", desc: "Large Uber Eats paper bag filled with hot, freshly prepared foods." },
    { id: "combo_box", name: "Combo Meal Box", price: 110, icon: "🥡", desc: "A delivery bag containing a mix of nuggets, burger, and sides." }
];

let ueCart = {};

function loadUeMenu() {
    const container = document.getElementById('ue-menu');
    container.innerHTML = '';
    ueCart = {};
    document.getElementById('ue-bag-count').innerText = 0;

    UeFoodCatalog.forEach(f => {
        const card = document.createElement('div');
        card.className = 'ue-food-card';
        card.id = 'ue-card-' + f.id;
        card.innerHTML = `
            <div class="ue-food-img" style="background: #e2e8f0; display:flex; align-items:center; justify-content:center; font-size:42px;">${f.icon}</div>
            <div class="ue-food-info">
                <h4>${f.name}</h4>
                <p>${f.desc}</p>
                <div class="ue-food-footer">
                    <span class="ue-price">$${f.price}</span>
                    <div class="ue-qty-ctrl" id="ue-qty-${f.id}" style="display:none; align-items:center; gap:6px;">
                        <button class="ue-add-btn" style="background:#fee2e2;color:#ef4444;" onclick="updateUeCart('${f.id}', -1)">−</button>
                        <span class="ue-qty-label" id="ue-qty-num-${f.id}" style="font-weight:700;font-size:13px;min-width:16px;text-align:center;">0</span>
                        <button class="ue-add-btn" onclick="updateUeCart('${f.id}', 1)">+</button>
                    </div>
                    <button class="ue-add-btn" id="ue-add-${f.id}" onclick="updateUeCart('${f.id}', 1)">+</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateUeCart(id, delta) {
    let current = ueCart[id] || 0;
    let next = current + delta;
    if (next <= 0) {
        delete ueCart[id];
        next = 0;
    } else {
        ueCart[id] = next;
    }

    // Update card UI
    const addBtn = document.getElementById('ue-add-' + id);
    const qtyCtrl = document.getElementById('ue-qty-' + id);
    const qtyNum = document.getElementById('ue-qty-num-' + id);
    const card = document.getElementById('ue-card-' + id);

    if (next > 0) {
        if (addBtn) addBtn.style.display = 'none';
        if (qtyCtrl) qtyCtrl.style.display = 'flex';
        if (qtyNum) qtyNum.innerText = next;
        if (card) card.style.border = '2px solid #06c167';
    } else {
        if (addBtn) addBtn.style.display = '';
        if (qtyCtrl) qtyCtrl.style.display = 'none';
        if (card) card.style.border = '';
    }

    let totalItems = Object.values(ueCart).reduce((a, b) => a + b, 0);
    document.getElementById('ue-bag-count').innerText = totalItems;

    renderUeCart();
}

function toggleUeCart(show) {
    const drawer = document.getElementById('ue-cart-drawer');
    if (show) drawer.classList.remove('hidden');
    else drawer.classList.add('hidden');
}

function renderUeCart() {
    const container = document.getElementById('ue-cart-items');
    container.innerHTML = '';
    
    let total = 0;
    Object.entries(ueCart).forEach(([id, qty]) => {
        const p = UeFoodCatalog.find(item => item.id === id);
        if (p) {
            total += p.price * qty;
            const row = document.createElement('div');
            row.className = 'ue-item-row';
            row.innerHTML = `
                <span>${p.name} (x${qty})</span>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-weight:bold; color:#06c167;">$${p.price * qty}</span>
                    <button style="border:none; background:#fee2e2; color:#ef4444; border-radius:4px; font-size:9px; cursor:pointer; padding:2px 5px;" onclick="updateUeCart('${id}', -1)">Remove</button>
                </div>
            `;
            container.appendChild(row);
        }
    });
    
    document.getElementById('ue-cart-total').innerText = '$' + total;
}

function checkoutUeCart() {
    let cartEntries = Object.entries(ueCart);
    if (cartEntries.length === 0) {
        showNotification("Uber Eats", "Your bag is empty!");
        return;
    }

    // Calculate total cost
    let totalCost = 0;
    let orderItems = [];
    cartEntries.forEach(([id, qty]) => {
        const p = UeFoodCatalog.find(item => item.id === id);
        if (p) {
            totalCost += p.price * qty;
            orderItems.push({ id: id, qty: qty, price: p.price, name: p.name });
        }
    });

    if (orderItems.length === 0) return;

    showNotification("Uber Eats", "Processing your order...");

    // Send all items in one request
    fetch(`https://${GetParentResourceName()}/payUberEats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            price: totalCost,
            foodName: orderItems.map(i => i.name).join(", "),
            items: orderItems,
            itemId: orderItems[0].id,
            qty: orderItems[0].qty
        })
    }).then(res => res.json()).then(success => {
        if (success) {
            playerData.bank -= totalCost;
            updateSystemInfo();
            if (document.getElementById("browser-url").value === "https://www.mazebank.com/portal") {
                openMazeBank();
            }
            showNotification("Uber Eats", "Order complete! Items delivered to inventory.", "success");
            ueCart = {};
            document.getElementById("ue-bag-count").innerText = 0;
            // Reset all card UIs
            UeFoodCatalog.forEach(f => {
                const addBtn = document.getElementById("ue-add-" + f.id);
                const qtyCtrl = document.getElementById("ue-qty-" + f.id);
                const card = document.getElementById("ue-card-" + f.id);
                if (addBtn) addBtn.style.display = "";
                if (qtyCtrl) qtyCtrl.style.display = "none";
                if (card) card.style.border = "";
            });
            toggleUeCart(false);
            closeApp("ubereats");
        } else {
            showNotification("Uber Eats", "Order failed - insufficient funds.", "error");
        }
    }).catch(() => {
        showNotification("Uber Eats", "Order failed - server error.", "error");
    });
}

// ==========================================
// FOOGLE EARTH APPLICATION LOGIC
// Now uses gtaweb.eu GTA Online interactive map via iframe
// ==========================================

function initFoogleEarth() {
    // Map is an iframe Ã¢â‚¬â€ nothing to initialize in JS
    // The iframe auto-loads https://gtaweb.eu/gtao-map/ls/0
}

function updateFooglePlayerLocation(x, y) {
    // Player location tracking via Leaflet removed (iframe map)
}

// ============================================================================
// TROLL CONTROL APP LOGIC
// ============================================================================
let trollActiveTab = 'all';
let trollCooldowns = {};
let trollGlobalCooldownEndTime = 0;
let trollUpdateInterval = null;

const trollAbilities = [
    // PHYSICS
    { id: 'ragdoll', name: 'Ragdoll Fall', emoji: 'Ã°Å¸Â¤Â¸', cd: 15, category: 'physics', desc: 'Forces target to collapse/fall over.' },
    { id: 'launch_sky', name: 'Launch into Sky', emoji: 'Ã°Å¸Å¡â‚¬', cd: 45, category: 'physics', desc: 'Launches target high into the sky.' },
    { id: 'super_jump', name: 'Super Jump', emoji: 'Ã°Å¸Â¦Ëœ', cd: 20, category: 'physics', desc: 'Gives the target gravity-defying super jumping.' },
    { id: 'drunk_effect', name: 'Drunk Effect', emoji: 'Ã°Å¸Â¥Â´', cd: 30, category: 'physics', desc: 'Applies drunk visual and movement mechanics.' },
    { id: 'moon_gravity', name: 'Moon Gravity', emoji: 'Ã°Å¸Å’â€¢', cd: 40, category: 'physics', desc: 'Reduces gravity on target player.' },
    { id: 'zero_gravity', name: 'Zero Gravity', emoji: 'Ã°Å¸Å’Å’', cd: 50, category: 'physics', desc: 'Sets targets gravity to zero.' },
    
    // VEHICLE CHAOS
    { id: 'burst_tires', name: 'Pop Tires', emoji: 'Ã°Å¸Å½Â¯', cd: 30, category: 'vehicle', desc: 'Pops all tires of targets current vehicle.' },
    { id: 'explode_car', name: 'Explode Vehicle', emoji: 'Ã°Å¸â€™Â¥', cd: 120, category: 'vehicle', desc: 'Damages and sets fire to targets engine.' },
    { id: 'brake_failure', name: 'Brake Failure', emoji: 'Ã°Å¸â€ºâ€˜Ã¢ÂÅ’', cd: 45, category: 'vehicle', desc: 'Disables targets brakes for 15s.' },
    { id: 'stuck_gas', name: 'Stuck Gas Pedal', emoji: 'Ã°Å¸ÂÅ½Ã¯Â¸ÂÃ°Å¸â€™Â¨', cd: 60, category: 'vehicle', desc: 'Forces vehicle throttle to 100% for 10s.' },
    { id: 'eject', name: 'Ejector Seat', emoji: 'Ã°Å¸â€™ÂºÃ°Å¸Å¡â‚¬', cd: 60, category: 'vehicle', desc: 'Ejects target out of their vehicle into the air.' },
    { id: 'engine_stall', name: 'Engine Stall', emoji: 'Ã°Å¸â€Å’', cd: 30, category: 'vehicle', desc: 'Stalls current vehicle engine.' },
    { id: 'rgb_car', name: 'RGB Rainbow Car', emoji: 'Ã°Å¸Å’Ë†', cd: 40, category: 'vehicle', desc: 'Makes targets car paint flash rainbow colors.' },

    // NPC SPAWNS
    { id: 'sudden_deer', name: 'Sudden Deer', emoji: 'Ã°Å¸Â¦Å’', cd: 15, category: 'npc', desc: 'Spawns a wild deer directly in front of target.' },
    { id: 'spawn_bodybuilders', name: 'Bodybuilders Attack', emoji: 'Ã°Å¸â€™Âª', cd: 90, category: 'npc', desc: 'Spawns hostile bodybuilders to attack target.' },
    { id: 'alien_attack', name: 'Alien Attack', emoji: 'Ã°Å¸â€˜Â½', cd: 90, category: 'npc', desc: 'Spawns aggressive aliens with weapons.' },

    // VISUALS & HUD
    { id: 'hide_ui', name: 'Hide HUD/Radar', emoji: 'Ã°Å¸â„¢Ë†', cd: 30, category: 'visual', desc: 'Hides targets radar minimap for 15s.' },
    { id: 'bw_filter', name: 'B/W Filter', emoji: 'Ã°Å¸Å½Å¾Ã¯Â¸Â', cd: 45, category: 'visual', desc: 'Forces black and white screen filter for 15s.' },
    { id: 'drunk_aim', name: 'Drunk Camera', emoji: 'Ã°Å¸Å½Â¥', cd: 30, category: 'visual', desc: 'Shakes target camera screen violently.' },

    // SOUNDS
    { id: 'sound_horn', name: 'Blast Horn', emoji: 'Ã°Å¸â€œÂ¯', cd: 10, category: 'sound', desc: 'Blasts vehicle horn sound repeatedly.' },
    { id: 'sound_alarm', name: 'Siren Alarm', emoji: 'Ã°Å¸Å¡Â¨', cd: 15, category: 'sound', desc: 'Triggers loud warning sirens around player.' },
    { id: 'sound_fail', name: 'Sad Trombone', emoji: 'Ã°Å¸â€œâ€°', cd: 10, category: 'sound', desc: 'Plays fail sound effect.' }
];

function initTrollControlApp() {
    trollActiveTab = 'all';
    document.querySelectorAll('.troll-nav-item').forEach(el => el.classList.remove('active'));
    const allTab = document.querySelector(".troll-nav-item[onclick*='all']");
    if (allTab) allTab.classList.add('active');
    
    document.getElementById('troll-search-input').value = '';
    
    refreshTrollPlayers();
    renderTrollGrid();
    
    if (trollUpdateInterval) clearInterval(trollUpdateInterval);
    trollUpdateInterval = setInterval(updateTrollCooldownUI, 100);
}

function refreshTrollPlayers() {
    const select = document.getElementById('troll-target-select');
    select.innerHTML = '<option value="self">Self (Local Player)</option>';
    
    fetch(`https://${GetParentResourceName()}/getPlayers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
        .then(res => res.json())
        .then(players => {
            if (players && players.length > 0) {
                players.forEach(p => {
                    if (p.id !== 'self') {
                        const opt = document.createElement('option');
                        opt.value = p.id;
                        opt.innerText = `[${p.id}] ${p.name}`;
                        select.appendChild(opt);
                    }
                });
            }
        }).catch(err => {
            console.error("Failed to fetch player list", err);
        });
}

function switchTrollTab(tabId) {
    trollActiveTab = tabId;
    document.querySelectorAll('.troll-nav-item').forEach(el => {
        el.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    renderTrollGrid();
}

function renderTrollGrid() {
    const grid = document.getElementById('troll-abilities-grid');
    const search = document.getElementById('troll-search-input').value.toLowerCase();
    grid.innerHTML = '';
    
    let items = trollAbilities;
    if (trollActiveTab !== 'all') {
        items = items.filter(a => a.category === trollActiveTab);
    }
    
    if (search) {
        items = items.filter(a => a.name.toLowerCase().includes(search) || a.desc.toLowerCase().includes(search));
    }
    
    items.forEach(action => {
        const card = document.createElement('div');
        card.className = 'troll-card';
        card.id = `troll_card_${action.id}`;
        card.title = action.desc;
        
        card.innerHTML = `
            <span class="emoji">${action.emoji}</span>
            <span class="title">${action.name}</span>
            <span class="cooldown-badge">CD: ${action.cd}s</span>
            <span class="card-cooldown-text" id="troll_cdtext_${action.id}"></span>
        `;
        
        card.onclick = () => triggerTrollAction(action);
        grid.appendChild(card);
    });
    
    updateTrollCooldownUI();
}

function updateTrollCooldownUI() {
    const now = Date.now();
    
    // Ability local cooldowns
    trollAbilities.forEach(action => {
        const card = document.getElementById(`troll_card_${action.id}`);
        const text = document.getElementById(`troll_cdtext_${action.id}`);
        const endTime = trollCooldowns[action.id] || 0;
        
        if (now < endTime) {
            const timeLeft = ((endTime - now) / 1000).toFixed(1);
            if (card) {
                card.classList.add('on-cooldown');
                card.classList.add('disabled');
            }
            if (text) text.innerText = `Ã¢ÂÂ³ ${timeLeft}s`;
        } else {
            if (card) {
                card.classList.remove('on-cooldown');
                card.classList.remove('disabled');
            }
            if (text) text.innerText = '';
            delete trollCooldowns[action.id];
        }
    });

    // Global cooldown update
    const globalWidget = document.getElementById('troll-global-cooldown-badge');
    const globalText = document.getElementById('troll-global-cd-text');
    if (now < trollGlobalCooldownEndTime) {
        if (globalWidget) globalWidget.classList.add('active');
        if (globalText) globalText.innerText = ((trollGlobalCooldownEndTime - now) / 1000).toFixed(1) + 's';
        
        // Also disable cards during global cooldown
        trollAbilities.forEach(action => {
            const card = document.getElementById(`troll_card_${action.id}`);
            if (card) card.classList.add('disabled');
        });
    } else {
        if (globalWidget) globalWidget.classList.remove('active');
        if (globalText) globalText.innerText = '0.0s';
    }
}

function triggerTrollAction(action) {
    const now = Date.now();
    if (now < trollGlobalCooldownEndTime) return;
    if (trollCooldowns[action.id] && now < trollCooldowns[action.id]) return;
    
    const targetSelect = document.getElementById('troll-target-select');
    const selectedTarget = targetSelect.value;
    
    trollGlobalCooldownEndTime = now + 5000; // 5 seconds global cooldown
    trollCooldowns[action.id] = now + (action.cd * 1000);
    updateTrollCooldownUI();
    
    fetch(`https://${GetParentResourceName()}/triggerTrollAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            targetId: selectedTarget,
            action: action.id,
            cd: action.cd
        })
    }).then(res => res.json()).then(data => {
        if (data && data.status === 'ok') {
            showNotification("Troll Injected", `Dispatched ${action.name} to target.`);
        } else {
            showNotification("Troll Failed", data.error || "Unable to send command.");
            delete trollCooldowns[action.id];
            trollGlobalCooldownEndTime = 0;
            updateTrollCooldownUI();
        }
    }).catch(err => {
        console.error("Troll dispatch error", err);
        showNotification("Connection Error", "Failed to contact target server.");
        delete trollCooldowns[action.id];
        trollGlobalCooldownEndTime = 0;
        updateTrollCooldownUI();
    });
}

// --- NES Emulator Logic ---
let nes = null;
let nesAnimationFrame = null;

function initNes() {
    if (nes) return;
    
    nes = new jsnes.NES({
        onFrame: function(frameBuffer) {
            const canvas = document.getElementById('nes-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 256, 240);
            
            for (let i = 0; i < 256 * 240; i++) {
                imageData.data[i*4 + 0] = frameBuffer[i] & 0xFF; // R
                imageData.data[i*4 + 1] = (frameBuffer[i] >> 8) & 0xFF; // G
                imageData.data[i*4 + 2] = (frameBuffer[i] >> 16) & 0xFF; // B
                imageData.data[i*4 + 3] = 0xFF; // A
            }
            
            ctx.putImageData(imageData, 0, 0);
        },
        onAudioSample: function(left, right) {
            // Audio skip for now to simplify
        }
    });

    const keyMap = {
        38: jsnes.Controller.BUTTON_UP,    // Up
        40: jsnes.Controller.BUTTON_DOWN,  // Down
        37: jsnes.Controller.BUTTON_LEFT,  // Left
        39: jsnes.Controller.BUTTON_RIGHT, // Right
        90: jsnes.Controller.BUTTON_A,     // Z
        88: jsnes.Controller.BUTTON_B,     // X
        13: jsnes.Controller.BUTTON_START, // Enter
        16: jsnes.Controller.BUTTON_SELECT // Shift
    };

    document.addEventListener('keydown', (e) => {
        const win = document.getElementById('win-nesemulator');
        if (win && win.classList.contains('opened') && keyMap[e.keyCode] !== undefined) {
            nes.buttonDown(1, keyMap[e.keyCode]);
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        const win = document.getElementById('win-nesemulator');
        if (win && win.classList.contains('opened') && keyMap[e.keyCode] !== undefined) {
            nes.buttonUp(1, keyMap[e.keyCode]);
            e.preventDefault();
        }
    });
}

function runNesFrame() {
    const win = document.getElementById('win-nesemulator');
    if (nes && win && win.classList.contains('opened')) {
        nes.frame();
    }
    nesAnimationFrame = requestAnimationFrame(runNesFrame);
}

function loadNesRom() {
    const romFile = document.getElementById('nes-rom-select').value;
    if (!romFile) {
        showNotification("NES Emulator", "Please select a ROM first.", "error");
        return;
    }
    
    initNes();
    
    fetch(`roms/${encodeURIComponent(romFile)}`)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            const data = new Uint8Array(buffer);
            let binaryString = "";
            for (let i = 0; i < data.length; i++) {
                binaryString += String.fromCharCode(data[i]);
            }
            nes.loadROM(binaryString);
            
            if (!nesAnimationFrame) {
                runNesFrame();
            }
            showNotification("NES Emulator", `Loaded ${romFile}`, "success");
        })
        .catch(err => {
            console.error("Failed to load ROM", err);
            showNotification("NES Emulator", "Failed to load ROM file.", "error");
        });
}

function resetNesRom() {
    if (nes) {
        nes.reset();
        showNotification("NES Emulator", "Reset the console.", "success");
    }
}

function openExplorerPhotos() {
    openApp('explorer');
}

// ==========================================
// GHOST GLOCK 3D PRINTER APPLICATION LOGIC
// ==========================================

let glockPrinting = false;
let glockSwitchPrinting = false;
let glockAssembling = false;

function switchGlockTab(tabName) {
    document.querySelectorAll('.glock-nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('glock-nav-' + tabName).classList.add('active');
    document.querySelectorAll('.glock-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('glock-' + tabName + '-sec').classList.remove('hidden');
}

function startGlockPrint() {
    if (glockPrinting) return;
    glockPrinting = true;

    const btn = document.getElementById('glock-print-btn');
    const progressWrap = document.getElementById('glock-print-progress');
    const fill = document.getElementById('glock-progress-fill');
    const pct = document.getElementById('glock-print-pct');
    const status = document.getElementById('glock-print-status');

    btn.disabled = true;
    status.textContent = '';
    status.className = 'glock-status';

    // Tell server to check items & start print
    fetch(`https://${GetParentResourceName()}/glockCheckPrintItems`, {
        method: 'POST'
    }).then(res => res.json()).then(res => {
        if (res && res.success) {
            progressWrap.classList.remove('hidden');
            let elapsed = 0;
            const total = 30000; // 30 seconds
            const interval = setInterval(() => {
                elapsed += 500;
                const percent = Math.min(100, Math.floor((elapsed / total) * 100));
                fill.style.width = percent + '%';
                pct.textContent = percent + '%';
                if (elapsed >= total) {
                    clearInterval(interval);
                    progressWrap.classList.add('hidden');
                    fill.style.width = '0%';
                    pct.textContent = '0%';
                    btn.disabled = false;
                    glockPrinting = false;
                    status.className = 'glock-status success';
                    status.textContent = '✔ Ghost Glock frame printed! Check your inventory for ghost_glock_print.';
                    showNotification('3D Printer', 'Ghost Glock frame successfully fabricated!');
                    
                    fetch(`https://${GetParentResourceName()}/glockPrintComplete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ itemType: 'frame' })
                    });
                }
            }, 500);
        } else {
            btn.disabled = false;
            glockPrinting = false;
            status.className = 'glock-status error';
            status.textContent = '✖ ' + (res && res.error ? res.error : 'Missing required materials!');
            showNotification('3D Printer Error', status.textContent.replace('✖ ', ''));
        }
    }).catch(() => {
        btn.disabled = false;
        glockPrinting = false;
        status.className = 'glock-status error';
        status.textContent = '✖ Server connection failed.';
    });
}

function startGlockSwitchPrint() {
    if (glockSwitchPrinting) return;
    glockSwitchPrinting = true;

    const btn = document.getElementById('glock-printswitch-btn');
    const progressWrap = document.getElementById('glock-printswitch-progress');
    const fill = document.getElementById('glock-printswitch-fill');
    const pct = document.getElementById('glock-printswitch-pct');
    const status = document.getElementById('glock-printswitch-status');

    btn.disabled = true;
    status.textContent = '';
    status.className = 'glock-status';

    // Tell server to check items & start print
    fetch(`https://${GetParentResourceName()}/glockCheckSwitchPrintItems`, {
        method: 'POST'
    }).then(res => res.json()).then(res => {
        if (res && res.success) {
            progressWrap.classList.remove('hidden');
            let elapsed = 0;
            const total = 30000; // 30 seconds
            const interval = setInterval(() => {
                elapsed += 500;
                const percent = Math.min(100, Math.floor((elapsed / total) * 100));
                fill.style.width = percent + '%';
                pct.textContent = percent + '%';
                if (elapsed >= total) {
                    clearInterval(interval);
                    progressWrap.classList.add('hidden');
                    fill.style.width = '0%';
                    pct.textContent = '0%';
                    btn.disabled = false;
                    glockSwitchPrinting = false;
                    status.className = 'glock-status success';
                    status.textContent = '✔ Glock Switch printed! Check your inventory for black_switch.';
                    showNotification('3D Printer', 'Glock Switch successfully fabricated!');
                    
                    fetch(`https://${GetParentResourceName()}/glockPrintComplete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ itemType: 'switch' })
                    });
                }
            }, 500);
        } else {
            btn.disabled = false;
            glockSwitchPrinting = false;
            status.className = 'glock-status error';
            status.textContent = '✖ ' + (res && res.error ? res.error : 'Missing required materials!');
            showNotification('3D Printer Error', status.textContent.replace('✖ ', ''));
        }
    }).catch(() => {
        btn.disabled = false;
        glockSwitchPrinting = false;
        status.className = 'glock-status error';
        status.textContent = '✖ Server connection failed.';
    });
}

function startGlockAssemble() {
    if (glockAssembling) return;
    glockAssembling = true;

    const btn = document.getElementById('glock-assemble-btn');
    const status = document.getElementById('glock-assemble-status');

    btn.disabled = true;
    status.textContent = '';
    status.className = 'glock-status';

    fetch(`https://${GetParentResourceName()}/glockCheckAssemblyItems`, {
        method: 'POST'
    }).then(res => res.json()).then(res => {
        if (res && res.success) {
            // Simulated skill check UI (WASD timing)
            status.className = 'glock-status';
            status.textContent = 'Ã¢Å¡Â¡ Skill check: press the highlighted key in time!';
            runGlockSkillCheck(['W', 'A', 'S', 'D'], 0, function(passed) {
                if (passed) {
                    fetch(`https://${GetParentResourceName()}/glockAssembleWeapon`, { method: 'POST' })
                        .then(r => r.json()).then(r2 => {
                            btn.disabled = false;
                            glockAssembling = false;
                            if (r2 && r2.success) {
                                status.className = 'glock-status success';
                                status.textContent = 'Ã¢Å“â€ Ghost Glock assembled! WEAPON_GHOSTGLOCK added to inventory.';
                                showNotification('Assembly Complete', 'Ghost Glock is ready!');
                            } else {
                                status.className = 'glock-status error';
                                status.textContent = 'Ã¢Å“â€“ ' + (r2 && r2.error ? r2.error : 'Assembly failed server-side.');
                            }
                        });
                } else {
                    btn.disabled = false;
                    glockAssembling = false;
                    status.className = 'glock-status error';
                    status.textContent = 'Ã¢Å“â€“ Skill check failed! Assembly unsuccessful.';
                    showNotification('Assembly Failed', 'You failed to assemble the Ghost Glock.');
                }
            });
        } else {
            btn.disabled = false;
            glockAssembling = false;
            status.className = 'glock-status error';
            status.textContent = 'Ã¢Å“â€“ ' + (res && res.error ? res.error : 'Missing required parts or printed frame!');
            showNotification('Assembly Error', status.textContent.replace('Ã¢Å“â€“ ', ''));
        }
    }).catch(() => {
        btn.disabled = false;
        glockAssembling = false;
        status.className = 'glock-status error';
        status.textContent = 'Ã¢Å“â€“ Server connection failed.';
    });
}

// Simple skill check: flash key prompts, player presses the right key within window
function runGlockSkillCheck(keys, index, callback) {
    if (index >= keys.length) { callback(true); return; }
    const key = keys[index];
    const status = document.getElementById('glock-assemble-status');
    status.innerHTML = `Ã¢Å¡Â¡ Press <span style="background:#b026ff;color:white;padding:1px 7px;border-radius:3px;font-weight:bold;">${key}</span> now!`;

    let done = false;
    const timeout = setTimeout(() => {
        if (!done) {
            done = true;
            document.removeEventListener('keydown', handler);
            callback(false);
        }
    }, 2000);

    const handler = (e) => {
        if (e.key.toUpperCase() === key && !done) {
            done = true;
            clearTimeout(timeout);
            document.removeEventListener('keydown', handler);
            status.innerHTML = `Ã¢Å“â€ <span style="color:#00ff66;">${key}</span> Ã¢â‚¬â€ step ${index + 1}/${keys.length} passed!`;
            setTimeout(() => runGlockSkillCheck(keys, index + 1, callback), 400);
        }
    };
    document.addEventListener('keydown', handler);
}

// ============================================================
// GNOME WILD EXTENSIONS LOGIC
// ============================================================

let extState = {
    flypie: false,
    burn: false,
    blur: false,
    clock: false,
    conky: true
};

function toggleExtension(ext) {
    const el = document.getElementById(`toggle-${ext}`);
    if (!el) return;
    const isChecked = el.checked;
    extState[ext] = isChecked;
    
    if (ext === 'blur') {
        if (isChecked) {
            document.getElementById('top-panel').classList.add('blur-shell');
            document.querySelectorAll('.window').forEach(w => w.classList.add('blur-shell'));
        } else {
            document.getElementById('top-panel').classList.remove('blur-shell');
            document.querySelectorAll('.window').forEach(w => w.classList.remove('blur-shell'));
        }
    } else if (ext === 'conky') {
        const conkyWidget = document.getElementById('conky-widget');
        if (conkyWidget) conkyWidget.style.display = isChecked ? 'block' : 'none';
    } else if (ext === 'clock') {
        const clockWidget = document.getElementById('desktop-clock');
        if (clockWidget) {
            if (isChecked) {
                clockWidget.classList.remove('hidden');
            } else {
                clockWidget.classList.add('hidden');
            }
        }
    }
}

// Right click for Fly-Pie
document.getElementById('desktop').addEventListener('contextmenu', function(e) {
    if (extState.flypie) {
        e.preventDefault();
        const menu = document.getElementById('fly-pie-menu');
        if (menu) {
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            menu.classList.remove('hidden');
        }
    }
});

function closeFlyPie() {
    const menu = document.getElementById('fly-pie-menu');
    if (menu) menu.classList.add('hidden');
}

// Close flypie on click elsewhere
document.addEventListener('click', function(e) {
    if (!e.target.closest('#fly-pie-menu')) {
        closeFlyPie();
    }
});

// ==========================================
// LS TRADER APPLICATION LOGIC
// ==========================================
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

function switchTraderTab(tabName) {
    lstraderActiveTab = tabName;
    document.querySelectorAll('#win-lstrader .lstrader-nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
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
    document.getElementById(`lt-asset-${coin.toLowerCase()}`).classList.add('active');
    
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
    fetch(`https://${GetParentResourceName()}/lstrader-get-data`, {
        method: 'POST'
    }).then(res => res.json()).then(data => {
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
            eventText = "ELON TWEET: 'Dogecoin is the people's currency!' Ã°Å¸Å¡â‚¬ DOGE price spikes!";
            lstraderPrices.DOGE *= 1.25;
            lstraderChange.DOGE += 25.0;
        } else if (eventId === 1) {
            eventText = "CHINA REGULATORY ALERT: Crypto exchanges declared illegal! Ã°Å¸â€œâ€° Market panic!";
            lstraderPrices.BTC *= 0.88;
            lstraderPrices.ETH *= 0.85;
            lstraderChange.BTC -= 12.0;
            lstraderChange.ETH -= 15.0;
        } else if (eventId === 2) {
            eventText = "INSTITUTIONAL BUY: Major hedge fund adopts Ethereum for smart contracts! Ã°Å¸Å¡â‚¬ ETH spikes!";
            lstraderPrices.ETH *= 1.12;
            lstraderChange.ETH += 12.0;
        } else if (eventId === 3) {
            eventText = "SEC ETF APPROVAL: Spot Bitcoin ETFs officially listed! Ã°Å¸Å¡â‚¬ BTC surges!";
            lstraderPrices.BTC *= 1.08;
            lstraderChange.BTC += 8.0;
        } else if (eventId === 4) {
            eventText = "WHALE DUMP: Dormant wallet transfers 50M DOGE to exchange! Ã°Å¸â€œâ€° DOGE drops!";
            lstraderPrices.DOGE *= 0.92;
            lstraderChange.DOGE -= 8.0;
        } else if (eventId === 5) {
            eventText = "NETWORK BUG: Staking contract vulnerability discovered in Ethereum node! Ã°Å¸â€œâ€° ETH slips!";
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
        
        showNotification("LS Cryptowire Alert", eventText.substring(0, 60) + "...");
        
        while (newsFeed.children.length > 25) {
            newsFeed.removeChild(newsFeed.lastChild);
        }
    }
}

function executeTraderTrade(action) {
    const amt = parseFloat(document.getElementById('lt-trade-amount').value);
    if (isNaN(amt) || amt <= 0) {
        showNotification("LS Trader Error", "Please input a valid trade amount!");
        return;
    }
    
    const coin = lstraderSelectedAsset;
    const price = lstraderPrices[coin];
    
    if (action === 'buy') {
        if (lstraderWallet.usd < amt) {
            showNotification("LS Trader Error", "Insufficient USD cash balance inside your trade account!");
            return;
        }
        
        const qty = amt / price;
        lstraderWallet.usd -= amt;
        lstraderWallet[coin] += qty;
        
        showNotification("LS Trader", `Successfully bought ${qty.toFixed(6)} ${coin}!`);
    } else {
        const coinBalance = lstraderWallet[coin];
        const requestedQty = amt / price;
        if (coinBalance < requestedQty) {
            showNotification("LS Trader Error", `Insufficient ${coin} balance! You only have ${coinBalance.toFixed(6)} ${coin}.`);
            return;
        }
        
        lstraderWallet.usd += amt;
        lstraderWallet[coin] -= requestedQty;
        
        showNotification("LS Trader", `Successfully sold ${requestedQty.toFixed(6)} ${coin} for $${amt.toLocaleString()} USD!`);
    }
    
    document.getElementById('lt-trade-amount').value = '';
    
    fetch(`https://${GetParentResourceName()}/lstrader-save-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lstraderWallet)
    });
    
    if (lstraderActiveTab === 'markets') {
        drawTraderChart();
    }
}

function executeTraderTransfer(action) {
    if (action === 'deposit') {
        const amt = parseInt(document.getElementById('lt-deposit-amount').value);
        if (isNaN(amt) || amt <= 0) return;
        
        fetch(`https://${GetParentResourceName()}/lstrader-deposit-withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deposit', amount: amt })
        }).then(res => res.json()).then(res => {
            if (res.success) {
                lstraderWallet.usd += amt;
                playerData.bank = res.newBank;
                updateSystemInfo();
                if (document.getElementById('browser-url').value === "https://www.mazebank.com/portal") {
                    openMazeBank();
                }
                document.getElementById('lt-deposit-amount').value = '';
                showNotification("LS Trader Wallet", `Successfully deposited $${amt.toLocaleString()} USD from Bank.`);
            } else {
                showNotification("LS Trader Wallet", res.error || "Deposit failed!");
            }
        });
    } else {
        const amt = parseInt(document.getElementById('lt-withdraw-amount').value);
        if (isNaN(amt) || amt <= 0) return;
        if (lstraderWallet.usd < amt) {
            showNotification("LS Trader Wallet", "Insufficient available trading cash to withdraw!");
            return;
        }
        
        fetch(`https://${GetParentResourceName()}/lstrader-deposit-withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'withdraw', amount: amt })
        }).then(res => res.json()).then(res => {
            if (res.success) {
                lstraderWallet.usd -= amt;
                playerData.bank = res.newBank;
                updateSystemInfo();
                if (document.getElementById('browser-url').value === "https://www.mazebank.com/portal") {
                    openMazeBank();
                }
                document.getElementById('lt-withdraw-amount').value = '';
                showNotification("LS Trader Wallet", `Successfully withdrew $${amt.toLocaleString()} USD to Bank.`);
            } else {
                showNotification("LS Trader Wallet", res.error || "Withdrawal failed!");
            }
        });
    }
}

// ==========================================
// RSS FEED SETTINGS LOGIC
// ==========================================
function loadRSSConfig() {
    fetch(`https://${GetParentResourceName()}/getRSSConfig`, {
        method: 'POST'
    }).then(res => res.json()).then(config => {
        if (config) {
            document.getElementById('rss-url-input').value = config.url || '';
            document.getElementById('toggle-rss').checked = config.enabled || false;
        }
    });
}

function saveRSSConfig() {
    const url = document.getElementById('rss-url-input').value;
    const enabled = document.getElementById('toggle-rss').checked;
    
    fetch(`https://${GetParentResourceName()}/saveRSSConfig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, enabled })
    }).then(() => {
        showNotification("RSS Feed", "RSS Feed Configuration Saved!");
    });
}

function toggleRSSFeed() {
    // Optional visual state handling
}

// ==========================================
// MOCK RECYCLE BIN LOGIC
// ==========================================
function emptyTrash() {
    const list = document.getElementById('trash-list');
    const msg = document.getElementById('trash-empty-msg');
    if (list && msg) {
        list.style.display = 'none';
        msg.style.display = 'block';
        showNotification("Recycle Bin", "Recycle bin emptied successfully.");
    }
}

function restoreTrash() {
    const list = document.getElementById('trash-list');
    const msg = document.getElementById('trash-empty-msg');
    if (list && msg) {
        list.style.display = 'flex';
        msg.style.display = 'none';
        showNotification("Recycle Bin", "Files restored to their original locations.");
    }
}

// ==========================================
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
                <button class="job-apply-btn" onclick="applyForJob('${job.id}', '${job.title}', '${job.job_id}')">APPLY NOW</button>
            </div>
        `;
    });
}

function applyForJob(id, title, job_id) {
    showNotification("Job Board", `Applying for ${title}...`);
    
    fetch(`https://${GetParentResourceName()}/jobboard-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, title: title, job_id: job_id })
    }).then(res => res.json()).then(resp => {
        if (resp && resp.status === 'ok') {
            showNotification("Job Board", `Application approved! You are now a ${title}.`);
        } else {
            showNotification("Job Board", "Application failed or denied.");
        }
    }).catch(err => {
        showNotification("Job Board", `Server event triggered for ${title}.`);
    });
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

/* ============================================================================
   DYNASTY 8 HOUSING APP LOGIC
   ============================================================================ */

let dynastyHouses = [];
let currentDynastyFilter = 'all';
let dynastyPriceFilter = 5000000;
let currentPreviewHouse = null;
let previewSlideIndex = 0;

function loadDynasty8Data() {
    // Update player bank display
    document.getElementById('dynasty-player-bank').innerText = `$${(playerData.bank || 0).toLocaleString()}`;
    
    // Clear and show loading state
    const grid = document.getElementById('dynasty-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #f58220;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Retrieving listings...</div>';
    
    fetch(`https://${GetParentResourceName()}/dynasty8GetHouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    }).then(res => res.json()).then(houses => {
        dynastyHouses = houses || [];
        renderDynasty8();
    }).catch(err => {
        console.error("Failed to load Dynasty 8 houses:", err);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><br><br>Connection failed. Check server status.</div>';
    });
}

function getPropertyMeta(house) {
    let beds = 2;
    let baths = 2;
    let garage = 10;
    let tier = "Medium";
    let desc = "A beautiful property in Los Santos.";
    let mainImg = "dynasty8/eclipse-towers.jpg";
    let gallery = ["dynasty8/eclipse-towers.jpg"];
    
    let lowerId = (house.id || "").toLowerCase();
    let shell = (house.shell || "").toLowerCase();
    
    if (lowerId.includes("eclipse") || shell.includes("luxury") || shell.includes("high") || house.price >= 1000000) {
        beds = 3;
        baths = 3;
        garage = 10;
        tier = "Luxury";
        desc = "This premium high-end residence features sprawling open-plan living, floor-to-ceiling windows with panoramic city views, and top-of-the-line finishes throughout. Located in one of the most exclusive districts, it includes private secure access and a massive multi-car garage.";
        mainImg = "dynasty8/eclipse-towers.jpg";
        gallery = [
            "dynasty8/eclipse-towers.jpg",
            "dynasty8/GTAOnline_Apartment_HighEndUpdated_02_LivingRoom-521-512.jpg",
            "dynasty8/GTAOnline_Apartment_HighEndUpdated_06_Kitchen-517-512.jpg",
            "dynasty8/GTAOnline_Apartment_HighEndUpdated_09_Bedroom-514-512.jpg"
        ];
    } else if (lowerId.includes("stilt") || shell.includes("stilt")) {
        beds = 4;
        baths = 4;
        garage = 10;
        tier = "Luxury Villa";
        desc = "Architectural masterpiece perched high in the Vinewood Hills. Featuring private balconies, scenic views, customized premium interiors, and multi-level floor plan, this stilt house represents the peak of San Andreas luxury living.";
        mainImg = "dynasty8/Dynasty8-GTAV-HighEnd-3655WildOatsDrive.webp";
        if (lowerId.includes("conker")) {
            mainImg = "dynasty8/Dynasty8-GTAV-HighEnd-2045NorthConkerAvenue.webp";
        }
        gallery = [
            mainImg,
            "dynasty8/GTAOnline_Apartment_StiltHouse_02_LivingRoom-1192-512.jpg",
            "dynasty8/GTAOnline_Apartment_StiltHouse_05_Balcony-1189-512.jpg",
            "dynasty8/GTAOnline_Apartment_StiltHouse_07_Bedroom-1187-512.jpg"
        ];
    } else if (lowerId.includes("tinsel")) {
        beds = 2;
        baths = 2;
        garage = 10;
        tier = "High-End";
        desc = "Spacious modern apartment in Tinsel Towers, central Los Santos. Features sleek contemporary styling, premium built-in kitchen, large bedrooms, and gorgeous night-sky views.";
        mainImg = "dynasty8/TinselTowers-GTAV.png";
        gallery = [
            "dynasty8/TinselTowers-GTAV.png",
            "dynasty8/GTAOnline_Apartment_HighEnd_04_Kitchen-508-512.jpg",
            "dynasty8/GTAOnline_Apartment_HighEnd_09_Bedroom-503-512.jpg"
        ];
    } else if (lowerId.includes("procopio") || lowerId.includes("paleto") || shell.includes("low") || house.price < 400000) {
        beds = 2;
        baths = 1;
        garage = 2;
        tier = "Low-End";
        desc = "A cozy, budget-friendly property located in the outskirts. Perfect starter home or hideout, featuring essential amenities and a smaller garage space.";
        mainImg = "dynasty8/4401ProcopioDrive-GTAV.png";
        gallery = [
            "dynasty8/4401ProcopioDrive-GTAV.png",
            "dynasty8/GTAOnline_Apartment_LowEnd_1_LivingRoom-493-512.jpg",
            "dynasty8/GTAOnline_Apartment_LowEnd_3_Bedroom-491-512.jpg"
        ];
    } else {
        beds = 2;
        baths = 2;
        garage = 6;
        tier = "Medium";
        desc = "Comfortable residential property offering a balanced lifestyle in Los Santos. Includes custom interior design, modern layout, and a medium-sized garage.";
        mainImg = "dynasty8/RichardsMajestic-GTAV.png";
        gallery = [
            "dynasty8/RichardsMajestic-GTAV.png",
            "dynasty8/GTAOnline_Apartment_Medium_1_LivingRoom-499-512.jpg",
            "dynasty8/GTAOnline_Apartment_Medium_3_Bedroom-497-512.jpg"
        ];
    }
    
    return { beds, baths, garage, tier, desc, mainImg, gallery };
}

function renderDynasty8() {
    const grid = document.getElementById('dynasty-grid');
    grid.innerHTML = '';
    
    const searchVal = document.getElementById('dynasty-search').value.toLowerCase();
    
    let filtered = dynastyHouses.filter(house => {
        // Search filter
        let label = (house.label || "").toLowerCase();
        let id = (house.id || "").toLowerCase();
        if (searchVal && !label.includes(searchVal) && !id.includes(searchVal)) {
            return false;
        }
        
        // Price filter
        if (house.price > dynastyPriceFilter) {
            return false;
        }
        
        // Nav Category filter
        if (currentDynastyFilter === 'luxury') {
            return house.price >= 1000000 || id.includes("eclipse") || id.includes("stilt");
        } else if (currentDynastyFilter === 'apartment') {
            return id.includes("tinsel") || id.includes("majestic") || id.includes("apt") || id.includes("suite");
        } else if (currentDynastyFilter === 'owned') {
            return house.owner === playerData.citizenid;
        }
        
        return true;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;"><i class="fa-solid fa-house-circle-xmark fa-2x"></i><br><br>No properties found matching filters.</div>';
        return;
    }
    
    filtered.forEach(house => {
        const meta = getPropertyMeta(house);
        const card = document.createElement('div');
        card.className = 'dynasty-card';
        
        let statusBadge = '';
        let isOwner = false;
        let isOtherOwned = false;
        
        if (house.owner) {
            if (house.owner === playerData.citizenid) {
                statusBadge = '<span class="dynasty-badge owned"><i class="fa-solid fa-key"></i> Owned</span>';
                isOwner = true;
            } else {
                statusBadge = `<span class="dynasty-badge other-owned"><i class="fa-solid fa-user-lock"></i> Owned</span>`;
                isOtherOwned = true;
            }
        } else {
            statusBadge = '<span class="dynasty-badge unowned">For Sale</span>';
        }
        
        const priceFormatted = `$${(house.price || 0).toLocaleString()}`;
        
        card.innerHTML = `
            <div class="dynasty-card-img-wrapper">
                <img src="${meta.mainImg}" alt="${house.label}">
                <div class="dynasty-card-badges">
                    <span class="dynasty-badge luxury">${meta.tier}</span>
                    ${statusBadge}
                </div>
            </div>
            <div class="dynasty-card-body">
                <h4 class="dynasty-card-title">${house.label}</h4>
                <div class="dynasty-card-specs">
                    <span><i class="fa-solid fa-bed"></i> ${meta.beds}</span>
                    <span><i class="fa-solid fa-bath"></i> ${meta.baths}</span>
                    <span><i class="fa-solid fa-car"></i> ${meta.garage}</span>
                </div>
                <div class="dynasty-card-price">${priceFormatted}</div>
                <div class="dynasty-card-actions">
                    <button class="dynasty-btn secondary" onclick="locateDynastyHouse('${house.id}')" title="Mark GPS waypoint"><i class="fa-solid fa-map-pin"></i> Locate</button>
                    <button class="dynasty-btn primary" onclick="openDynastyPreview('${house.id}')">View Details</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterDynasty(category) {
    currentDynastyFilter = category;
    
    document.querySelectorAll('.dynasty-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNav = document.getElementById(`nav-dynasty-${category}`);
    if (activeNav) activeNav.classList.add('active');
    
    renderDynasty8();
}

function searchDynasty() {
    renderDynasty8();
}

function updateDynastyPriceFilter(val) {
    dynastyPriceFilter = parseInt(val);
    document.getElementById('dynasty-price-val').innerText = `$${dynastyPriceFilter.toLocaleString()}`;
    renderDynasty8();
}

function openDynastyPreview(houseId) {
    const house = dynastyHouses.find(h => h.id === houseId);
    if (!house) return;
    
    currentPreviewHouse = house;
    const meta = getPropertyMeta(house);
    previewSlideIndex = 0;
    
    document.getElementById('dynasty-modal-title').innerText = house.label;
    document.getElementById('modal-spec-beds').innerText = meta.beds;
    document.getElementById('modal-spec-baths').innerText = meta.baths;
    document.getElementById('modal-spec-garage').innerText = meta.garage;
    document.getElementById('modal-spec-tier').innerText = meta.tier;
    document.getElementById('modal-spec-desc').innerText = meta.desc;
    document.getElementById('modal-spec-price').innerText = `$${(house.price || 0).toLocaleString()}`;
    
    // Set up photo slider
    updateSliderImage();
    
    // Set up slider dots
    const dots = document.getElementById('dynasty-slider-dots');
    dots.innerHTML = '';
    meta.gallery.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = `slider-dot ${idx === 0 ? 'active' : ''}`;
        dot.onclick = () => setDynastySlide(idx);
        dots.appendChild(dot);
    });
    
    // Actions button config
    const actions = document.getElementById('modal-spec-actions');
    actions.innerHTML = '';
    
    if (house.owner) {
        if (house.owner === playerData.citizenid) {
            // Player owns it, can sell it
            const refund = Math.floor(house.price * 0.5);
            actions.innerHTML = `
                <button class="dynasty-btn danger" onclick="sellDynastyHouse('${house.id}')" style="width: 100%;"><i class="fa-solid fa-hand-holding-dollar"></i> Sell Property ($${refund.toLocaleString()})</button>
            `;
        } else {
            // Owned by someone else
            actions.innerHTML = `
                <button class="dynasty-btn secondary" disabled style="width: 100%;"><i class="fa-solid fa-lock"></i> Property Owned</button>
            `;
        }
    } else {
        // For sale
        const canAfford = (playerData.bank || 0) >= house.price;
        actions.innerHTML = `
            <button class="dynasty-btn primary" onclick="buyDynastyHouse('${house.id}')" ${!canAfford ? 'disabled' : ''} style="width: 100%;">
                <i class="fa-solid fa-cart-shopping"></i> Purchase Property
            </button>
        `;
    }
    
    document.getElementById('dynasty-preview-modal').classList.remove('hidden');
}

function closeDynastyPreview() {
    document.getElementById('dynasty-preview-modal').classList.add('hidden');
    currentPreviewHouse = null;
}

function updateSliderImage() {
    if (!currentPreviewHouse) return;
    const meta = getPropertyMeta(currentPreviewHouse);
    document.getElementById('dynasty-slider-img').src = meta.gallery[previewSlideIndex];
    
    // Update dots status
    document.querySelectorAll('.slider-dot').forEach((dot, idx) => {
        if (idx === previewSlideIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function changeDynastySlide(n) {
    if (!currentPreviewHouse) return;
    const meta = getPropertyMeta(currentPreviewHouse);
    previewSlideIndex += n;
    
    if (previewSlideIndex >= meta.gallery.length) {
        previewSlideIndex = 0;
    } else if (previewSlideIndex < 0) {
        previewSlideIndex = meta.gallery.length - 1;
    }
    
    updateSliderImage();
}

function setDynastySlide(index) {
    previewSlideIndex = index;
    updateSliderImage();
}

function locateDynastyHouse(houseId) {
    const house = dynastyHouses.find(h => h.id === houseId);
    if (!house || !house.enterCoords) return;
    
    showNotification("Dynasty 8", "GPS location synced with vehicle navigator.", "success");
    
    fetch(`https://${GetParentResourceName()}/dynasty8Locate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            x: house.enterCoords.x, 
            y: house.enterCoords.y, 
            label: house.label 
        })
    });
}

function buyDynastyHouse(houseId) {
    const house = dynastyHouses.find(h => h.id === houseId);
    if (!house) return;
    
    closeDynastyPreview();
    showNotification("Dynasty 8", "Initiating purchase deed...", "success");
    
    fetch(`https://${GetParentResourceName()}/dynasty8Buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseId: houseId })
    }).then(res => res.json()).then(data => {
        // Re-load to get updated ownership state
        setTimeout(loadDynasty8Data, 1000);
    });
}

function sellDynastyHouse(houseId) {
    const house = dynastyHouses.find(h => h.id === houseId);
    if (!house) return;
    
    closeDynastyPreview();
    showNotification("Dynasty 8", "Initiating property deed release...", "success");
    
    fetch(`https://${GetParentResourceName()}/dynasty8Sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseId: houseId })
    }).then(res => res.json()).then(data => {
        // Re-load to get updated ownership state
        setTimeout(loadDynasty8Data, 1000);
    });
}



