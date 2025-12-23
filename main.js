import { generateIdentity } from './utils.js';
import { NetworkManager } from './network.js';

// DOM Elements
const radar = document.getElementById('radar');
const myNameEl = document.getElementById('my-name');
const myIconEl = document.getElementById('my-icon');
const installBtn = document.getElementById('installBtn');
const scanningMsg = document.getElementById('scanning-msg');

// State
let identity = JSON.parse(localStorage.getItem('netdrop-id'));
if (!identity) {
    identity = generateIdentity();
    localStorage.setItem('netdrop-id', JSON.stringify(identity));
}

// Render "Me" in header
if (myNameEl) myNameEl.textContent = identity.name;
if (myIconEl) myIconEl.textContent = identity.icon;

// UI Handlers - name editing with checkmark
const saveNameBtn = document.getElementById('save-name-btn');

function saveName() {
    const newName = myNameEl.textContent.trim();
    if (newName && newName !== identity.name) {
        identity.name = newName;
        localStorage.setItem('netdrop-id', JSON.stringify(identity));
    }
    saveNameBtn?.classList.add('hidden');
    myNameEl?.blur();
}

myNameEl?.addEventListener('focus', () => {
    saveNameBtn?.classList.remove('hidden');
});

myNameEl?.addEventListener('blur', () => {
    // Small delay to allow click on checkmark
    setTimeout(() => {
        if (document.activeElement !== saveNameBtn) {
            saveName();
        }
    }, 100);
});

myNameEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        saveName();
    }
});

saveNameBtn?.addEventListener('click', saveName);

// PWA Install
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installBtn.style.display = 'block';
    installBtn.onclick = () => {
        e.prompt();
        installBtn.style.display = 'none';
    };
});

// Networking
const netMap = new Map(); // peerId -> DOM Element

// Debug Helper (duplicated for main.js scope)
function log(msg) {
    const el = document.getElementById('debug-log');
    if (el) {
        const line = document.createElement('div');
        line.textContent = `> ${msg}`;
        el.appendChild(line);
        el.scrollTop = el.scrollHeight;
    }
    console.log(msg);
}

// Debug panel toggle and close
const toggleDebugBtn = document.getElementById('toggle-debug');
const debugLog = document.getElementById('debug-log');
const closeDebugBtn = document.getElementById('close-debug');

toggleDebugBtn?.addEventListener('click', () => {
    debugLog.style.display = 'block';
});

closeDebugBtn?.addEventListener('click', () => {
    debugLog.style.display = 'none';
});

const onPeerFound = (peer) => {
    if (netMap.has(peer.id)) return;

    log(`Peer found: ${peer.name} (${peer.id})`);

    // Hide scanning message when we find peers
    if (scanningMsg) scanningMsg.style.display = 'none';

    const node = document.createElement('div');
    node.className = 'device-node glass-panel';
    node.innerHTML = `
    <div class="device-icon">${peer.icon}</div>
    <div class="device-name">${peer.name}</div>
  `;

    // File Drop Zone
    node.addEventListener('dragover', (e) => {
        e.preventDefault();
        node.style.borderColor = 'var(--accent-color)';
    });

    node.addEventListener('dragleave', (e) => {
        e.preventDefault();
        node.style.borderColor = 'var(--glass-border)';
    });

    node.addEventListener('drop', (e) => {
        e.preventDefault();
        node.style.borderColor = 'var(--glass-border)';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            log(`Dropping ${files.length} file(s) to ${peer.name}`);
            // Send all files
            for (const file of files) {
                network.sendFile(peer.id, file);
            }
        }
    });

    // Click to simulate select/send
    node.addEventListener('click', () => {
        log(`Clicked on ${peer.name}, opening file picker...`);
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true; // Allow multiple file selection
        input.onchange = async () => {
            log(`${input.files.length} file(s) selected`);
            if (input.files.length > 0) {
                const totalFiles = input.files.length;
                let sentCount = 0;

                for (const file of input.files) {
                    showTransferToast('📤', `Sending ${file.name}...`);
                    await network.sendFile(peer.id, file);
                    sentCount++;
                    updateToastProgress((sentCount / totalFiles) * 100);
                    addToHistory('sent', file.name, file.size, peer.name);
                }

                setTimeout(() => {
                    showTransferToast('✅', `${totalFiles} file(s) sent!`);
                    setTimeout(hideTransferToast, 2000);
                }, 500);
            }
        };
        input.click();
    });

    radar.appendChild(node);
    netMap.set(peer.id, node);
};

const onPeerLost = (peerId) => {
    const node = netMap.get(peerId);
    if (node) {
        node.remove();
        netMap.delete(peerId);
    }
};

// ====== FILE PREVIEW SYSTEM ======
const previewModal = document.getElementById('preview-modal');
const previewList = document.getElementById('preview-list');
const downloadAllBtn = document.getElementById('download-all-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const showFilesBtn = document.getElementById('show-files-btn');
const fileCountEl = document.getElementById('file-count');
const floatingFileCountEl = document.getElementById('floating-file-count');

// ====== TRANSFER HISTORY SYSTEM ======
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const showHistoryBtn = document.getElementById('show-history-btn');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyCountEl = document.getElementById('history-count');
const transferToast = document.getElementById('transfer-toast');

// Load history from localStorage
let transferHistory = JSON.parse(localStorage.getItem('netdrop-history') || '[]');

function saveHistory() {
    // Keep only last 20 items
    transferHistory = transferHistory.slice(0, 20);
    localStorage.setItem('netdrop-history', JSON.stringify(transferHistory));
    updateHistoryCount();
    renderHistory();
}

function updateHistoryCount() {
    if (historyCountEl) historyCountEl.textContent = transferHistory.length;
}

function addToHistory(type, fileName, fileSize, peerName) {
    transferHistory.unshift({
        type, // 'sent' or 'received'
        fileName,
        fileSize,
        peerName,
        timestamp: Date.now()
    });
    saveHistory();
}

function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = '';

    if (transferHistory.length === 0) {
        historyList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No transfers yet</div>';
        return;
    }

    transferHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = `history-item ${item.type}`;
        div.innerHTML = `
            <div class="item-icon">${item.type === 'sent' ? '📤' : '📥'}</div>
            <div class="item-info">
                <div class="item-name">${item.fileName}</div>
                <div class="item-meta">${item.type === 'sent' ? 'Sent to' : 'From'} ${item.peerName || 'Unknown'} • ${formatTimeAgo(item.timestamp)}</div>
            </div>
        `;
        historyList.appendChild(div);
    });
}

function showHistoryPanel() {
    historyPanel?.classList.remove('hidden');
}

function hideHistoryPanel() {
    historyPanel?.classList.add('hidden');
}

function showTransferToast(icon, message) {
    if (!transferToast) return;
    transferToast.querySelector('.toast-icon').textContent = icon;
    transferToast.querySelector('.toast-name').textContent = message;
    transferToast.querySelector('.toast-progress-fill').style.width = '0%';
    transferToast.classList.remove('hidden');
}

function updateToastProgress(percent) {
    if (!transferToast) return;
    transferToast.querySelector('.toast-progress-fill').style.width = `${percent}%`;
}

function hideTransferToast() {
    transferToast?.classList.add('hidden');
}

// History event listeners
showHistoryBtn?.addEventListener('click', showHistoryPanel);
closeHistoryBtn?.addEventListener('click', hideHistoryPanel);

// Initialize history
updateHistoryCount();
renderHistory();

const receivedFiles = []; // Array of { blob, name, mime, url }
const pendingFiles = new Map(); // peerId -> Array of { name, mime }

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(mime) {
    if (mime?.startsWith('image/')) return '🖼️';
    if (mime?.startsWith('video/')) return '🎬';
    if (mime?.startsWith('audio/')) return '🎵';
    if (mime?.includes('pdf')) return '📄';
    if (mime?.includes('zip') || mime?.includes('rar')) return '📦';
    return '📁';
}

function updateFileCount() {
    const count = receivedFiles.length;
    if (fileCountEl) fileCountEl.textContent = count;
    if (floatingFileCountEl) floatingFileCountEl.textContent = count;
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''} ago`;
}


function showPreviewModal() {
    previewModal.classList.remove('hidden');
    showFilesBtn?.classList.add('hidden');
}

function minimizePreviewModal() {
    previewModal.classList.add('hidden');
    if (receivedFiles.length > 0) {
        showFilesBtn?.classList.remove('hidden');
    }
}

function renderFileCard(file, index) {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.dataset.index = index;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'file-preview';

    if (file.mime?.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = file.url;
        img.alt = file.name;
        previewDiv.appendChild(img);
    } else if (file.mime?.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = file.url;
        video.controls = true;
        video.muted = true;
        previewDiv.appendChild(video);
    } else {
        const icon = document.createElement('span');
        icon.className = 'file-icon';
        icon.textContent = getFileIcon(file.mime);
        previewDiv.appendChild(icon);
    }

    const infoDiv = document.createElement('div');
    infoDiv.className = 'file-info';
    infoDiv.innerHTML = `
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-meta">${formatFileSize(file.blob.size)} • ${file.mime?.split('/')[1] || 'file'}</div>
        <div class="file-time" data-timestamp="${file.receivedAt}">${formatTimeAgo(file.receivedAt)}</div>
    `;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'file-actions';
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-accent';
    downloadBtn.textContent = '⬇️ Download';
    downloadBtn.onclick = () => downloadFile(index);
    actionsDiv.appendChild(downloadBtn);

    card.appendChild(previewDiv);
    card.appendChild(infoDiv);
    card.appendChild(actionsDiv);

    return card;
}

function addFileToPreview(file) {
    // Add timestamp
    file.receivedAt = Date.now();
    receivedFiles.unshift(file); // Add to beginning (newest first)
    updateFileCount();
    const card = renderFileCard(file, 0);
    // Prepend to list so newest is at top
    previewList.insertBefore(card, previewList.firstChild);
    // Update indexes for other cards
    updateCardIndexes();
    showPreviewModal();
}

function updateCardIndexes() {
    const cards = previewList.querySelectorAll('.file-card');
    cards.forEach((card, i) => {
        card.dataset.index = i;
        const btn = card.querySelector('.btn-accent');
        if (btn) btn.onclick = () => downloadFile(i);
    });
}

function downloadFile(index) {
    const file = receivedFiles[index];
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function downloadAllFiles() {
    receivedFiles.forEach((_, i) => downloadFile(i));
}

// Event listeners
minimizeBtn?.addEventListener('click', minimizePreviewModal);
showFilesBtn?.addEventListener('click', showPreviewModal);
downloadAllBtn?.addEventListener('click', downloadAllFiles);

// ====== DATA RECEIVE HANDLER ======
const onDataReceived = (peerId, data) => {
    log(`Data received from ${peerId}: ${typeof data}`);

    // Handle file metadata - add to queue
    if (data && data.type === 'file-meta') {
        log(`Incoming file: "${data.name}" (${data.size} bytes)`);
        if (!pendingFiles.has(peerId)) {
            pendingFiles.set(peerId, []);
        }
        pendingFiles.get(peerId).push({ name: data.name, mime: data.mime, size: data.size });

        // Show receiving notification with count
        const count = pendingFiles.get(peerId).length;
        if (count === 1) {
            showTransferToast('📥', `Receiving: ${data.name}`);
        } else {
            showTransferToast('📥', `Receiving ${count} files...`);
        }
        return;
    }

    // Handle file data
    let binaryData = null;

    if (data instanceof Blob || data instanceof ArrayBuffer) {
        binaryData = data;
        log(`File data received as ${data instanceof Blob ? 'Blob' : 'ArrayBuffer'}!`);
    } else if (data && typeof data === 'object' && ('0' in data || data[0] !== undefined)) {
        log(`Converting object to ArrayBuffer...`);
        const keys = Object.keys(data).filter(k => !isNaN(parseInt(k))).map(Number).sort((a, b) => a - b);
        if (keys.length > 0) {
            const uint8Array = new Uint8Array(keys.length);
            keys.forEach((k) => uint8Array[k] = data[k]);
            binaryData = uint8Array.buffer;
            log(`Converted ${keys.length} bytes`);
        }
    }

    if (binaryData) {
        // Get metadata from queue (FIFO)
        const queue = pendingFiles.get(peerId) || [];
        const meta = queue.shift() || { name: 'received_file', mime: 'application/octet-stream' };

        const blob = binaryData instanceof Blob ? binaryData : new Blob([binaryData], { type: meta.mime });
        const url = URL.createObjectURL(blob);

        log(`File "${meta.name}" ready for preview!`);

        // Show completion toast
        showTransferToast('✅', `Received ${meta.name}`);
        setTimeout(hideTransferToast, 3000);

        // Add to history
        addToHistory('received', meta.name, blob.size, 'Unknown');

        // Add to preview instead of auto-download
        addFileToPreview({
            blob,
            name: meta.name,
            mime: meta.mime,
            url
        });
    } else {
        log(`Unknown data type - binaryData is null`);
    }
};

const onStatusUpdate = (status, roomId) => {
    const el = document.getElementById('status-line');
    if (status === 'connected') {
        el.innerHTML = `Status: <span style="color:#4ade80">Online</span> | Room: <span style="color:#fbbf24">${roomId}</span> <button id="toggle-debug" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #94a3b8; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; margin-left: 10px;">🐛 Debug</button>`;
        // Re-attach debug toggle listener
        const newToggleBtn = document.getElementById('toggle-debug');
        newToggleBtn?.addEventListener('click', () => {
            const debugLogEl = document.getElementById('debug-log');
            const isHidden = debugLogEl.style.display === 'none';
            debugLogEl.style.display = isHidden ? 'block' : 'none';
            newToggleBtn.textContent = isHidden ? '🐛 Hide' : '🐛 Debug';
        });
    }
};


const network = new NetworkManager(identity, onPeerFound, onPeerLost, onDataReceived, onStatusUpdate);
network.init();
