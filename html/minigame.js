/* Process Logic (CMD + Minigame) */
let isHacking = false;
let gameActive = false;
let hackTimer = null;
let logTimer = null;
let sequenceIndex = 0;
let scamType = 'cloner'; // 'cloner' or 'printer'

const audioBeep = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');

function startScamProcess(type) {
    scamType = type;
    document.getElementById('win-' + type).classList.add('hidden');
    document.getElementById('cmd-window').classList.remove('hidden');
    
    // Bring CMD window to front
    let zIndex = 100;
    $('.win').each(function() {
        let z = parseInt($(this).css('z-index')) || 0;
        if(z > zIndex) zIndex = z;
    });
    $('#cmd-window').css('z-index', zIndex + 1);

    isHacking = true;
    sequenceIndex = 0;
    document.getElementById('cmd-logs').innerHTML = '';
    runHackingSequence();
}

function runHackingSequence() {
    const logs = [
        { text: "Initializing exploit...", type: "log-info" },
        { text: "Connecting to remote database...", type: "log-info" },
        { text: "Bypassing Proxy (192.168.0.1)...", type: "log-warn" },
        { text: "Scanning ports [22, 80, 443]...", type: "log-info" },
        { text: "Port 443 OPEN. Injecting payload...", type: "log-success" },
        { text: "Downloading user credentials...", type: "log-info" },
        { text: "Decrypting RSA key...", type: "log-info" },
        { text: "Access Granted.", type: "log-success" },
        { text: "Wait... Security Alert Detected!", type: "log-error" }, 
        { text: "Attempting to bypass firewall...", type: "log-warn" },
        { text: "Writing data...", type: "log-info" },
        { text: "Verifying checksum...", type: "log-info" },
        { text: "Checksum valid. Finalizing...", type: "log-success" },
        { text: "Disconnecting...", type: "log-info" }
    ];

    logTimer = setInterval(() => {
        if (!isHacking) {
            clearInterval(logTimer);
            return;
        }

        if (sequenceIndex === 8) {
            clearInterval(logTimer);
            startMinigame(function (success) {
                if (success) {
                    addLog("Firewall Bypassed Successfully!", "log-success");
                    sequenceIndex++; 
                    runHackingSequence(); 
                } else {
                    addLog("Bypass Failed! Connection Terminated.", "log-error");
                    failScam();
                }
            });
            return;
        }

        if (sequenceIndex >= logs.length) {
            clearInterval(logTimer);
            completeScam();
            return;
        }

        addLog(logs[sequenceIndex].text, logs[sequenceIndex].type);
        sequenceIndex++;
    }, 1500);
}

function addLog(text, className) {
    let div = document.createElement('div');
    div.className = 'log-line ' + className;
    div.innerText = '[ROOT]> ' + text;
    document.getElementById('cmd-logs').appendChild(div);
    let container = document.getElementById('cmd-logs');
    container.scrollTop = container.scrollHeight;
}

function startMinigame(callback) {
    gameActive = true;
    const overlay = document.getElementById('minigame-overlay');
    overlay.classList.remove('hidden');

    const cursor = document.querySelector('.hack-cursor');
    const targetZone = document.querySelector('.hack-target-zone');

    const minLeft = 10;
    const maxLeft = 80;
    const targetLeft = Math.floor(Math.random() * (maxLeft - minLeft + 1)) + minLeft;
    targetZone.style.left = targetLeft + '%';

    let cursorPosition = 0;
    let direction = 1;
    const speed = 2; 

    audioBeep.play().catch(e => { });

    hackTimer = setInterval(() => {
        cursorPosition += speed * direction;
        if (cursorPosition >= 98 || cursorPosition <= 0) {
            direction *= -1;
        }
        cursor.style.left = cursorPosition + '%';
    }, 20);

    const keyHandler = function (e) {
        if (e.code === 'Space' && gameActive) {
            e.preventDefault();
            clearInterval(hackTimer);
            gameActive = false;
            window.removeEventListener('keydown', keyHandler);

            const cursorRect = cursor.getBoundingClientRect();
            const targetRect = targetZone.getBoundingClientRect();

            const isSuccess = (cursorRect.left >= targetRect.left && cursorRect.right <= targetRect.right);

            setTimeout(() => {
                overlay.classList.add('hidden');
                callback(isSuccess);
            }, 1000);
        }
    };

    window.addEventListener('keydown', keyHandler);
}

function completeScam() {
    isHacking = false;
    setTimeout(() => {
        document.getElementById('cmd-window').classList.add('hidden');
        nuiFetch('scamResult', { success: true, app: scamType });
        let win = document.getElementById('win-' + scamType);
        win.classList.remove('hidden');
        win.innerHTML = '<div class="win-titlebar" onmousedown="startDrag(event,\'win-' + scamType + '\')"><span class="win-title">Success</span><div class="win-ctrls"><button class="wbtn close" onclick="closeApp(\'' + scamType + '\')">✕</button></div></div><div class="win-body" style="background:#0b0f19; color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:20px;"><i class="fas fa-check-circle" style="font-size:40px; color: #4caf50; margin-bottom:15px;"></i><h3>Operation Successful</h3><p>Data written. Disconnect securely.</p></div>';
    }, 2000);
}

function failScam() {
    isHacking = false;
    setTimeout(() => {
        document.getElementById('cmd-window').classList.add('hidden');
        nuiFetch('scamResult', { success: false, app: scamType });
        let win = document.getElementById('win-' + scamType);
        win.classList.remove('hidden');
        win.innerHTML = '<div class="win-titlebar" onmousedown="startDrag(event,\'win-' + scamType + '\')"><span class="win-title">Failed</span><div class="win-ctrls"><button class="wbtn close" onclick="closeApp(\'' + scamType + '\')">✕</button></div></div><div class="win-body" style="background:#0b0f19; color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:20px;"><i class="fas fa-times-circle" style="font-size:40px; color: #ff3b30; margin-bottom:15px;"></i><h3>Operation Failed</h3><p>Firewall caught the connection. Aborted.</p></div>';
    }, 2000);
}
