/**
 * FLOATSPACE - Your Floating Workspace
 * Clean, minimal, Google Docs aesthetic
 */

(function() {
    'use strict';
    
    if (document.getElementById('floatspace-hud')) return;
    
    const CONFIG = {
        BACKEND_URL: 'https://script.google.com/macros/s/AKfycbyV01m7tsv7Cj3K7zktKKYx6l_mJ3N19oq_1KiYJ0UYMQkmq0E0vRwBm2zhrQDQ9BeF/exec',
        SYNC_INTERVAL: 5000,
        FREE_CONTACT_LIMIT: 10,
    };
    
    const STATE = {
        userId: getUserIdFromUrl() || localStorage.getItem('floatspace_userId'),
        username: localStorage.getItem('floatspace_username') || 'User',
        tier: localStorage.getItem('floatspace_tier') || 'free',
        customUsername: localStorage.getItem('floatspace_customUsername') || '',
        
        contacts: [],
        contactRequests: [],
        
        currentView: 'rooms',
        currentTunnelId: null,
        currentRoomId: null,
        currentContactId: null,
        
        rooms: [],
        tunnelMessages: [],
        roomMessages: [],
        
        syncInterval: null,
        dragOffset: { x: 0, y: 0 },
        isDragging: false,
    };
    
    function getUserIdFromUrl() {
        const scriptTag = document.currentScript;
        if (scriptTag && scriptTag.src) {
            const url = new URL(scriptTag.src);
            return url.searchParams.get('uid');
        }
        return null;
    }
    
    function saveState() {
        localStorage.setItem('floatspace_userId', STATE.userId);
        localStorage.setItem('floatspace_username', STATE.username);
        localStorage.setItem('floatspace_tier', STATE.tier);
        localStorage.setItem('floatspace_customUsername', STATE.customUsername);
    }
    
    async function apiCall(action, params = {}) {
        const url = CONFIG.BACKEND_URL + '?action=' + action + '&' + 
            Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&') +
            '&callback=floatspaceCallback';
        
        return new Promise((resolve, reject) => {
            window.floatspaceCallback = function(data) {
                resolve(data);
                delete window.floatspaceCallback;
            };
            
            const script = document.createElement('script');
            script.src = url;
            script.onerror = () => reject(new Error('Network error'));
            document.head.appendChild(script);
            
            setTimeout(() => {
                script.remove();
                if (window.floatspaceCallback) {
                    reject(new Error('Timeout'));
                    delete window.floatspaceCallback;
                }
            }, 10000);
        });
    }
    
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    function getDisplayName(user) {
        if (user.customUsername) {
            return user.customUsername + ' ⭐';
        }
        return user.username;
    }
    
    function createUI() {
        const hud = document.createElement('div');
        hud.id = 'floatspace-hud';
        hud.innerHTML = `
            <div class="fs-window">
                <div class="fs-header" id="fs-header">
                    <div class="fs-header-top">
                        <span class="fs-logo">FLOATSPACE</span>
                        <button class="fs-close-btn" onclick="window.closeFloatSpace()">×</button>
                    </div>
                    <div class="fs-user-info">
                        <span class="fs-username">${getDisplayName(STATE)}</span>
                        ${STATE.tier === 'pro' ? '<span class="fs-pro-badge">PRO</span>' : ''}
                    </div>
                    <div class="fs-tabs">
                        <button class="fs-tab active" data-view="rooms">Rooms</button>
                        <button class="fs-tab" data-view="contacts">Contacts</button>
                        <button class="fs-tab" data-view="tools">Tools</button>
                    </div>
                </div>
                
                <div class="fs-content">
                    <!-- ROOMS VIEW -->
                    <div class="fs-view" id="view-rooms">
                        <div class="fs-input-row">
                            <input type="text" id="room-search" placeholder="Enter room name" class="fs-input">
                            <button class="fs-btn-primary" onclick="window.joinRoom()">Join</button>
                        </div>
                        <div class="fs-list" id="rooms-list">
                            <div class="fs-empty">
                                <p>No active rooms</p>
                                <p class="fs-hint">Enter a room name above to get started</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CONTACTS VIEW -->
                    <div class="fs-view hidden" id="view-contacts">
                        <div class="fs-input-row">
                            <button class="fs-btn-primary" onclick="window.showAddContact()">Add Contact</button>
                            <span class="fs-count">${STATE.contacts.length}/${STATE.tier === 'pro' ? '∞' : CONFIG.FREE_CONTACT_LIMIT}</span>
                        </div>
                        
                        <div class="fs-requests" id="requests-section" style="display:none;">
                            <div class="fs-requests-header">Pending Requests</div>
                            <div id="requests-list"></div>
                        </div>
                        
                        <div class="fs-list" id="contacts-list">
                            <div class="fs-empty">
                                <p>No contacts yet</p>
                                <p class="fs-hint">Add people to communicate</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- TOOLS VIEW (Calculator) -->
                    <div class="fs-view hidden" id="view-tools">
                        <div class="fs-calc">
                            <div class="fs-calc-display">0</div>
                            <div class="fs-calc-grid">
                                ${['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'].map(btn => 
                                    `<button class="fs-calc-btn" onclick="window.handleCalcBtn('${btn}')">${btn}</button>`
                                ).join('')}
                                <button class="fs-calc-btn fs-calc-clear" onclick="window.handleCalcBtn('C')" ondblclick="window.panicButton()">AC</button>
                                <button class="fs-calc-btn" onclick="window.minimizeFloatSpace()">MIN</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- TUNNEL CHAT VIEW -->
                    <div class="fs-view hidden" id="view-tunnel">
                        <div class="fs-chat-header">
                            <button class="fs-back-btn" onclick="window.backToContacts()">← Back</button>
                            <span class="fs-chat-title" id="tunnel-title"></span>
                        </div>
                        <div class="fs-messages" id="tunnel-messages"></div>
                        <div class="fs-input-row">
                            <input type="text" id="tunnel-input" placeholder="Type message..." class="fs-input">
                            <button class="fs-btn-primary" onclick="window.sendTunnelMessage()">Send</button>
                        </div>
                    </div>
                    
                    <!-- ROOM CHAT VIEW -->
                    <div class="fs-view hidden" id="view-room">
                        <div class="fs-chat-header">
                            <button class="fs-back-btn" onclick="window.backToRooms()">← Back</button>
                            <span class="fs-chat-title" id="room-title"></span>
                            <button class="fs-members-btn" onclick="window.showRoomMembers()"><span id="member-count">0</span> members</button>
                        </div>
                        <div class="fs-messages" id="room-messages"></div>
                        <div class="fs-input-row">
                            <input type="text" id="room-input" placeholder="Type message..." class="fs-input">
                            <button class="fs-btn-primary" onclick="window.sendRoomMessage()">Send</button>
                        </div>
                    </div>
                    
                    <!-- ADD CONTACT MODAL -->
                    <div class="fs-modal hidden" id="add-contact-modal">
                        <div class="fs-modal-content">
                            <h3>Add Contact</h3>
                            <p class="fs-modal-hint">Enter email address:</p>
                            <input type="text" id="contact-email-input" placeholder="email@school.edu" class="fs-input">
                            <div class="fs-modal-actions">
                                <button class="fs-btn-secondary" onclick="window.closeModal()">Cancel</button>
                                <button class="fs-btn-primary" onclick="window.sendContactRequest()">Send Request</button>
                            </div>
                            <div id="add-contact-status" class="fs-status"></div>
                        </div>
                    </div>
                    
                    <!-- ROOM MEMBERS MODAL -->
                    <div class="fs-modal hidden" id="room-members-modal">
                        <div class="fs-modal-content">
                            <h3>Room Members</h3>
                            <div id="room-members-list" class="fs-members-list"></div>
                            <button class="fs-btn-primary" onclick="window.closeModal()">Close</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                #floatspace-hud * { box-sizing: border-box; }
                
                .fs-window {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 400px;
                    height: 600px;
                    background: #ffffff;
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15);
                    display: flex;
                    flex-direction: column;
                    font-family: 'Product Sans', 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    z-index: 999999;
                    overflow: hidden;
                }
                
                .fs-header {
                    background: #ffffff;
                    border-bottom: 1px solid #dadce0;
                    padding: 16px;
                }
                
                .fs-header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .fs-logo {
                    font-size: 12px;
                    font-weight: 500;
                    color: #5f6368;
                    letter-spacing: 0.5px;
                    cursor: move;
                }
                
                .fs-close-btn {
                    background: none;
                    border: none;
                    color: #5f6368;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .fs-close-btn:hover { background: #f1f3f4; }
                
                .fs-user-info {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .fs-username {
                    font-size: 14px;
                    color: #202124;
                    font-weight: 500;
                }
                
                .fs-pro-badge {
                    background: #ffd700;
                    color: #000;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: 600;
                }
                
                .fs-tabs {
                    display: flex;
                    gap: 4px;
                    border-bottom: 1px solid #e8eaed;
                    margin: 0 -16px;
                    padding: 0 16px;
                }
                
                .fs-tab {
                    background: none;
                    border: none;
                    color: #5f6368;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }
                
                .fs-tab:hover { color: #202124; }
                .fs-tab.active { color: #1a73e8; border-bottom-color: #1a73e8; }
                
                .fs-content {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }
                
                .fs-view {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .fs-view.hidden { display: none; }
                
                .fs-input-row {
                    padding: 12px 16px;
                    display: flex;
                    gap: 8px;
                    border-bottom: 1px solid #e8eaed;
                }
                
                .fs-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    font-size: 14px;
                    color: #202124;
                    outline: none;
                }
                
                .fs-input:focus { border-color: #1a73e8; }
                
                .fs-btn-primary {
                    background: #1a73e8;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                
                .fs-btn-primary:hover { background: #1765cc; }
                
                .fs-btn-secondary {
                    background: #ffffff;
                    color: #5f6368;
                    border: 1px solid #dadce0;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .fs-count {
                    font-size: 14px;
                    color: #5f6368;
                    padding: 8px 12px;
                }
                
                .fs-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }
                
                .fs-item {
                    background: #ffffff;
                    border: 1px solid #e8eaed;
                    padding: 12px;
                    border-radius: 4px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .fs-item:hover {
                    background: #f8f9fa;
                    box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3);
                }
                
                .fs-item-name {
                    font-weight: 500;
                    color: #202124;
                    margin-bottom: 4px;
                }
                
                .fs-item-info {
                    font-size: 12px;
                    color: #5f6368;
                }
                
                .fs-empty {
                    text-align: center;
                    padding: 60px 20px;
                    color: #80868b;
                }
                
                .fs-empty p {
                    margin-bottom: 8px;
                }
                
                .fs-hint {
                    font-size: 12px;
                    color: #9aa0a6;
                }
                
                .fs-requests {
                    background: #fef7e0;
                    border-bottom: 1px solid #f9ab00;
                    padding: 12px 16px;
                }
                
                .fs-requests-header {
                    font-size: 13px;
                    font-weight: 500;
                    color: #ea8600;
                    margin-bottom: 8px;
                }
                
                .fs-request-item {
                    background: white;
                    padding: 8px;
                    border-radius: 4px;
                    margin-bottom: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .fs-request-user {
                    font-size: 13px;
                    font-weight: 500;
                    color: #202124;
                }
                
                .fs-request-actions {
                    display: flex;
                    gap: 6px;
                }
                
                .fs-btn-accept, .fs-btn-decline {
                    border: none;
                    padding: 4px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    color: white;
                    font-weight: 500;
                }
                
                .fs-btn-accept { background: #1e8e3e; }
                .fs-btn-decline { background: #d93025; }
                
                .fs-chat-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid #e8eaed;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .fs-back-btn {
                    background: none;
                    border: none;
                    color: #1a73e8;
                    font-size: 14px;
                    cursor: pointer;
                    font-weight: 500;
                }
                
                .fs-chat-title {
                    font-weight: 500;
                    color: #202124;
                    flex: 1;
                    text-align: center;
                }
                
                .fs-members-btn {
                    background: #f1f3f4;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    color: #5f6368;
                }
                
                .fs-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .fs-message {
                    display: flex;
                    flex-direction: column;
                    max-width: 70%;
                }
                
                .fs-message.mine {
                    align-self: flex-end;
                    align-items: flex-end;
                }
                
                .fs-message.theirs {
                    align-self: flex-start;
                    align-items: flex-start;
                }
                
                .fs-message-time {
                    font-size: 11px;
                    color: #80868b;
                    margin-bottom: 4px;
                }
                
                .fs-message-bubble {
                    padding: 10px 14px;
                    border-radius: 8px;
                    font-size: 14px;
                    word-break: break-word;
                }
                
                .fs-message.mine .fs-message-bubble {
                    background: #1a73e8;
                    color: white;
                }
                
                .fs-message.theirs .fs-message-bubble {
                    background: #f1f3f4;
                    color: #202124;
                }
                
                .fs-calc {
                    padding: 16px;
                }
                
                .fs-calc-display {
                    background: #f8f9fa;
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    padding: 20px;
                    text-align: right;
                    font-size: 32px;
                    font-weight: 300;
                    color: #202124;
                    margin-bottom: 16px;
                    min-height: 80px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                }
                
                .fs-calc-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                }
                
                .fs-calc-btn {
                    background: #ffffff;
                    border: 1px solid #dadce0;
                    padding: 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 18px;
                    font-weight: 400;
                    color: #202124;
                    transition: all 0.1s;
                }
                
                .fs-calc-btn:hover {
                    background: #f8f9fa;
                    box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3);
                }
                
                .fs-calc-btn:active {
                    transform: scale(0.95);
                }
                
                .fs-calc-clear {
                    background: #ea4335;
                    color: white;
                    border: none;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .fs-modal {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .fs-modal.hidden { display: none; }
                
                .fs-modal-content {
                    background: white;
                    border-radius: 8px;
                    padding: 24px;
                    width: 90%;
                    max-width: 350px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                }
                
                .fs-modal-content h3 {
                    margin-bottom: 16px;
                    color: #202124;
                    font-weight: 400;
                    font-size: 20px;
                }
                
                .fs-modal-hint {
                    font-size: 14px;
                    color: #5f6368;
                    margin-bottom: 12px;
                }
                
                .fs-modal-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                    margin-top: 16px;
                }
                
                .fs-status {
                    margin-top: 12px;
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 13px;
                    text-align: center;
                }
                
                .fs-status.success {
                    background: #e6f4ea;
                    color: #1e8e3e;
                }
                
                .fs-status.error {
                    background: #fce8e6;
                    color: #d93025;
                }
                
                .fs-members-list {
                    max-height: 300px;
                    overflow-y: auto;
                    margin-bottom: 16px;
                }
                
                .fs-member-item {
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    margin-bottom: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .fs-member-name {
                    font-weight: 500;
                    color: #202124;
                }
                
                ::-webkit-scrollbar {
                    width: 8px;
                }
                
                ::-webkit-scrollbar-track {
                    background: #f1f3f4;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: #dadce0;
                    border-radius: 4px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: #bdc1c6;
                }
            </style>
        `;
        
        document.body.appendChild(hud);
        
        attachEventListeners();
        initializeDragging();
        loadInitialData();
    }
    
    function attachEventListeners() {
        document.querySelectorAll('.fs-tab').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });
        
        const roomInput = document.getElementById('room-search');
        if (roomInput) {
            roomInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.joinRoom();
            });
        }
        
        const tunnelInput = document.getElementById('tunnel-input');
        if (tunnelInput) {
            tunnelInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.sendTunnelMessage();
            });
        }
        
        const roomMsgInput = document.getElementById('room-input');
        if (roomMsgInput) {
            roomMsgInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.sendRoomMessage();
            });
        }
    }
    
    function initializeDragging() {
        const header = document.querySelector('.fs-logo');
        const hudWindow = document.querySelector('.fs-window');
        
        if (!header || !hudWindow) return;
        
        header.addEventListener('mousedown', (e) => {
            STATE.isDragging = true;
            const rect = hudWindow.getBoundingClientRect();
            STATE.dragOffset.x = e.clientX - rect.left;
            STATE.dragOffset.y = e.clientY - rect.top;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!STATE.isDragging) return;
            e.preventDefault();
            hudWindow.style.left = (e.clientX - STATE.dragOffset.x) + 'px';
            hudWindow.style.top = (e.clientY - STATE.dragOffset.y) + 'px';
            hudWindow.style.bottom = 'auto';
            hudWindow.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            STATE.isDragging = false;
        });
    }
    
    async function loadInitialData() {
        try {
            const userInfo = await apiCall('getUser', { userId: STATE.userId });
            if (userInfo.success) {
                STATE.username = userInfo.username;
                STATE.tier = userInfo.tier;
                STATE.customUsername = userInfo.customUsername;
                saveState();
                updateUserDisplay();
            }
            
            await loadContacts();
            await loadContactRequests();
            await loadRooms();
            
            startSync();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }
    
    async function loadContacts() {
        try {
            const result = await apiCall('getContacts', { userId: STATE.userId });
            STATE.contacts = result.contacts || [];
            renderContacts();
        } catch (error) {
            console.error('Failed to load contacts:', error);
        }
    }
    
    async function loadContactRequests() {
        try {
            const result = await apiCall('getContactRequests', { userId: STATE.userId });
            STATE.contactRequests = result.requests || [];
            renderContactRequests();
        } catch (error) {
            console.error('Failed to load requests:', error);
        }
    }
    
    async function loadRooms() {
        try {
            const domain = STATE.username.split('@')[1] || 'default';
            const result = await apiCall('listRooms', { domain: domain });
            STATE.rooms = result.rooms || [];
            renderRooms();
        } catch (error) {
            console.error('Failed to load rooms:', error);
        }
    }
    
    function startSync() {
        STATE.syncInterval = setInterval(() => {
            if (STATE.currentView === 'tunnel' && STATE.currentTunnelId) {
                syncTunnelMessages();
            } else if (STATE.currentView === 'room' && STATE.currentRoomId) {
                syncRoomMessages();
            }
            loadContactRequests();
            loadRooms();
        }, CONFIG.SYNC_INTERVAL);
    }
    
    async function syncTunnelMessages() {
        try {
            const result = await apiCall('getTunnelMessages', { 
                tunnelId: STATE.currentTunnelId 
            });
            STATE.tunnelMessages = result.messages || [];
            renderTunnelMessages();
        } catch (error) {
            console.error('Sync error:', error);
        }
    }
    
    async function syncRoomMessages() {
        try {
            const result = await apiCall('getRoomMessages', { 
                roomId: STATE.currentRoomId 
            });
            STATE.roomMessages = result.messages || [];
            renderRoomMessages();
            
            const membersResult = await apiCall('getRoomMembers', {
                roomId: STATE.currentRoomId
            });
            const memberCount = document.getElementById('member-count');
            if (memberCount) {
                memberCount.textContent = (membersResult.members || []).length;
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    }
    
    function updateUserDisplay() {
        const username = document.querySelector('.fs-username');
        if (username) username.textContent = getDisplayName(STATE);
    }
    
    function renderContacts() {
        const container = document.getElementById('contacts-list');
        const countSpan = document.querySelector('.fs-count');
        
        if (countSpan) {
            countSpan.textContent = `${STATE.contacts.length}/${STATE.tier === 'pro' ? '∞' : CONFIG.FREE_CONTACT_LIMIT}`;
        }
        
        if (!container) return;
        
        if (STATE.contacts.length === 0) {
            container.innerHTML = `
                <div class="fs-empty">
                    <p>No contacts yet</p>
                    <p class="fs-hint">Add people to communicate</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.contacts.map(contact => `
            <div class="fs-item" onclick="window.openTunnel('${contact.userId}', '${escapeHtml(getDisplayName(contact))}')">
                <div class="fs-item-name">${escapeHtml(getDisplayName(contact))}</div>
            </div>
        `).join('');
    }
    
    function renderContactRequests() {
        const section = document.getElementById('requests-section');
        const container = document.getElementById('requests-list');
        
        if (!section || !container) return;
        
        if (STATE.contactRequests.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        container.innerHTML = STATE.contactRequests.map(req => `
            <div class="fs-request-item">
                <div class="fs-request-user">${escapeHtml(getDisplayName(req))}</div>
                <div class="fs-request-actions">
                    <button class="fs-btn-accept" onclick="window.acceptRequest('${req.requestId}')">Accept</button>
                    <button class="fs-btn-decline" onclick="window.declineRequest('${req.requestId}')">Decline</button>
                </div>
            </div>
        `).join('');
    }
    
    function renderRooms() {
        const container = document.getElementById('rooms-list');
        
        if (!container) return;
        
        if (STATE.rooms.length === 0) {
            container.innerHTML = `
                <div class="fs-empty">
                    <p>No active rooms</p>
                    <p class="fs-hint">Enter a room name above to get started</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.rooms.map(room => `
            <div class="fs-item" onclick="window.openRoom('${room.roomId}', '${escapeHtml(room.roomName)}')">
                <div class="fs-item-name">${escapeHtml(room.roomName)}</div>
                <div class="fs-item-info">Last active: ${formatTime(room.lastActivity)}</div>
            </div>
        `).join('');
    }
    
    function renderTunnelMessages() {
        const container = document.getElementById('tunnel-messages');
        
        if (!container) return;
        
        if (STATE.tunnelMessages.length === 0) {
            container.innerHTML = `
                <div class="fs-empty">
                    <p>Start the conversation</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.tunnelMessages.map(msg => {
            const isMine = msg.senderId === STATE.userId;
            return `
                <div class="fs-message ${isMine ? 'mine' : 'theirs'}">
                    <div class="fs-message-time">${formatTime(msg.timestamp)}</div>
                    <div class="fs-message-bubble">${escapeHtml(msg.message)}</div>
                </div>
            `;
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    }
    
    function renderRoomMessages() {
        const container = document.getElementById('room-messages');
        
        if (!container) return;
        
        if (STATE.roomMessages.length === 0) {
            container.innerHTML = `
                <div class="fs-empty">
                    <p>Be the first to say something</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.roomMessages.map(msg => {
            const isMine = msg.senderId === STATE.userId;
            return `
                <div class="fs-message ${isMine ? 'mine' : 'theirs'}">
                    <div class="fs-message-time">${isMine ? 'You' : 'Member'} • ${formatTime(msg.timestamp)}</div>
                    <div class="fs-message-bubble">${escapeHtml(msg.message)}</div>
                </div>
            `;
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function switchView(viewName) {
        STATE.currentView = viewName;
        
        document.querySelectorAll('.fs-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        document.querySelectorAll('.fs-view').forEach(view => {
            view.classList.add('hidden');
        });
        
        const targetView = document.getElementById('view-' + viewName);
        if (targetView) {
            targetView.classList.remove('hidden');
        }
    }
    
    window.closeFloatSpace = function() {
        if (STATE.syncInterval) {
            clearInterval(STATE.syncInterval);
        }
        const hud = document.getElementById('floatspace-hud');
        if (hud) {
            hud.remove();
        }
    };
    
    window.panicButton = function() {
        console.log('[PANIC] Session cleared');
        localStorage.clear();
        window.closeFloatSpace();
    };
    
    window.minimizeFloatSpace = function() {
        const hudWindow = document.querySelector('.fs-window');
        if (!hudWindow) return;
        
        if (hudWindow.style.height === '52px') {
            hudWindow.style.height = '600px';
        } else {
            hudWindow.style.height = '52px';
        }
    };
    
    window.handleCalcBtn = function(btn) {
        const display = document.querySelector('.fs-calc-display');
        if (!display) return;
        
        if (btn === 'C') {
            display.textContent = '0';
        } else if (btn === '=') {
            try {
                const expr = display.textContent.replace('×', '*').replace('÷', '/').replace('−', '-');
                display.textContent = eval(expr);
            } catch {
                display.textContent = 'Error';
            }
        } else {
            if (display.textContent === '0') {
                display.textContent = btn;
            } else {
                display.textContent += btn;
            }
        }
    };
    
    window.showAddContact = function() {
        if (STATE.tier === 'free' && STATE.contacts.length >= CONFIG.FREE_CONTACT_LIMIT) {
            alert('Contact limit reached. Upgrade to Pro for unlimited contacts!');
            return;
        }
        const modal = document.getElementById('add-contact-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };
    
    window.closeModal = function() {
        document.querySelectorAll('.fs-modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        const emailInput = document.getElementById('contact-email-input');
        if (emailInput) emailInput.value = '';
        const status = document.getElementById('add-contact-status');
        if (status) status.innerHTML = '';
    };
    
    window.sendContactRequest = async function() {
        const input = document.getElementById('contact-email-input');
        const status = document.getElementById('add-contact-status');
        
        if (!input || !status) return;
        
        const email = input.value.trim();
        
        if (!email) {
            status.className = 'fs-status error';
            status.textContent = 'Please enter an email';
            return;
        }
        
        try {
            const domain = STATE.username.split('@')[1] || 'default';
            const findResult = await apiCall('findUser', { email: email, domain: domain });
            
            if (!findResult.found) {
                status.className = 'fs-status error';
                status.textContent = 'User not found';
                return;
            }
            
            await apiCall('sendContactRequest', {
                from: STATE.userId,
                to: findResult.userId
            });
            
            status.className = 'fs-status success';
            status.textContent = 'Request sent!';
            
            setTimeout(() => {
                window.closeModal();
            }, 1500);
            
        } catch (error) {
            status.className = 'fs-status error';
            status.textContent = 'Error sending request';
            console.error(error);
        }
    };
    
    window.acceptRequest = async function(requestId) {
        try {
            await apiCall('acceptContactRequest', { requestId: requestId });
            await loadContacts();
            await loadContactRequests();
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };
    
    window.declineRequest = async function(requestId) {
        try {
            await apiCall('declineContactRequest', { requestId: requestId });
            await loadContactRequests();
        } catch (error) {
            console.error('Error declining request:', error);
        }
    };
    
    window.openTunnel = async function(contactId, contactName) {
        try {
            const result = await apiCall('getTunnel', {
                user1: STATE.userId,
                user2: contactId
            });
            
            STATE.currentTunnelId = result.tunnelId;
            STATE.currentContactId = contactId;
            STATE.currentView = 'tunnel';
            
            const tunnelTitle = document.getElementById('tunnel-title');
            if (tunnelTitle) {
                tunnelTitle.textContent = contactName;
            }
            
            switchView('tunnel');
            
            await syncTunnelMessages();
            
        } catch (error) {
            console.error('Error opening tunnel:', error);
        }
    };
    
    window.sendTunnelMessage = async function() {
        const input = document.getElementById('tunnel-input');
        
        if (!input) return;
        
        const message = input.value.trim();
        
        if (!message) return;
        
        try {
            await apiCall('sendTunnelMessage', {
                tunnelId: STATE.currentTunnelId,
                senderId: STATE.userId,
                message: message
            });
            
            input.value = '';
            await syncTunnelMessages();
            
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };
    
    window.backToContacts = function() {
        STATE.currentTunnelId = null;
        STATE.currentContactId = null;
        switchView('contacts');
    };
    
    window.joinRoom = async function() {
        const input = document.getElementById('room-search');
        
        if (!input) return;
        
        const roomName = input.value.trim();
        
        if (!roomName) return;
        
        try {
            const domain = STATE.username.split('@')[1] || 'default';
            
            const createResult = await apiCall('createRoom', {
                roomName: roomName,
                creatorId: STATE.userId,
                domain: domain
            });
            
            const roomId = createResult.roomId;
            
            await apiCall('joinRoom', {
                roomId: roomId,
                userId: STATE.userId
            });
            
            input.value = '';
            await loadRooms();
            window.openRoom(roomId, roomName);
            
        } catch (error) {
            console.error('Error joining room:', error);
        }
    };
    
    window.openRoom = async function(roomId, roomName) {
        STATE.currentRoomId = roomId;
        STATE.currentView = 'room';
        
        const roomTitle = document.getElementById('room-title');
        if (roomTitle) {
            roomTitle.textContent = roomName;
        }
        
        switchView('room');
        
        await apiCall('joinRoom', {
            roomId: roomId,
            userId: STATE.userId
        });
        
        await syncRoomMessages();
    };
    
    window.sendRoomMessage = async function() {
        const input = document.getElementById('room-input');
        
        if (!input) return;
        
        const message = input.value.trim();
        
        if (!message) return;
        
        try {
            await apiCall('sendRoomMessage', {
                roomId: STATE.currentRoomId,
                senderId: STATE.userId,
                message: message
            });
            
            input.value = '';
            await syncRoomMessages();
            
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };
    
    window.backToRooms = async function() {
        if (STATE.currentRoomId) {
            await apiCall('leaveRoom', {
                roomId: STATE.currentRoomId,
                userId: STATE.userId
            });
        }
        
        STATE.currentRoomId = null;
        switchView('rooms');
        await loadRooms();
    };
    
    window.showRoomMembers = async function() {
        try {
            const result = await apiCall('getRoomMembers', {
                roomId: STATE.currentRoomId
            });
            
            const members = result.members || [];
            const container = document.getElementById('room-members-list');
            
            if (!container) return;
            
            if (members.length === 0) {
                container.innerHTML = '<p class="fs-hint">No active members</p>';
            } else {
                container.innerHTML = members.map(member => {
                    const isContact = STATE.contacts.some(c => c.userId === member.userId);
                    const isMe = member.userId === STATE.userId;
                    
                    return `
                        <div class="fs-member-item">
                            <div class="fs-member-name">${escapeHtml(getDisplayName(member))}${isMe ? ' (You)' : ''}</div>
                            ${!isContact && !isMe ? `<button class="fs-btn-primary" onclick="window.addFromRoom('${member.userId}')">Add</button>` : ''}
                        </div>
                    `;
                }).join('');
            }
            
            const modal = document.getElementById('room-members-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Error loading members:', error);
        }
    };
    
    window.addFromRoom = async function(userId) {
        try {
            await apiCall('sendContactRequest', {
                from: STATE.userId,
                to: userId
            });
            alert('Request sent!');
            window.closeModal();
        } catch (error) {
            console.error('Error sending request:', error);
        }
    };
    
    createUI();
    console.log('%c[FLOATSPACE] Loaded successfully', 'color: #1a73e8; font-weight: bold');
    
})();
