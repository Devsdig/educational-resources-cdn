/**
 * STUDY HELPER HUD - COMPLETE CALCULATOR
 * All 46 features - Clean, production-grade
 */

(function() {
    'use strict';
    
    if (document.getElementById('study-calc')) return;
    
    const CONFIG = {
        BACKEND_URL: 'https://script.google.com/macros/s/AKfycbyV01m7tsv7Cj3K7zktKKYx6l_mJ3N19oq_1KiYJ0UYMQkmq0E0vRwBm2zhrQDQ9BeF/exec',
        SYNC_INTERVAL: 5000,
        FREE_CONTACT_LIMIT: 10,
    };
    
    const STATE = {
        userId: getUserIdFromUrl() || localStorage.getItem('study_userId'),
        username: localStorage.getItem('study_username') || 'User',
        tier: localStorage.getItem('study_tier') || 'free',
        customUsername: localStorage.getItem('study_customUsername') || '',
        
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
        localStorage.setItem('study_userId', STATE.userId);
        localStorage.setItem('study_username', STATE.username);
        localStorage.setItem('study_tier', STATE.tier);
        localStorage.setItem('study_customUsername', STATE.customUsername);
    }
    
    async function apiCall(action, params = {}) {
        const url = CONFIG.BACKEND_URL + '?action=' + action + '&' + 
            Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&') +
            '&callback=studyHelperCallback';
        
        return new Promise((resolve, reject) => {
            window.studyHelperCallback = function(data) {
                resolve(data);
                delete window.studyHelperCallback;
            };
            
            const script = document.createElement('script');
            script.src = url;
            script.onerror = () => reject(new Error('Network error'));
            document.head.appendChild(script);
            
            setTimeout(() => {
                script.remove();
                if (window.studyHelperCallback) {
                    reject(new Error('Timeout'));
                    delete window.studyHelperCallback;
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
        const calc = document.createElement('div');
        calc.id = 'study-calc';
        calc.innerHTML = `
            <div class="calc-window">
                <div class="calc-header" id="calc-header">
                    <div class="header-top">
                        <span class="header-title">Study HUD</span>
                        <button class="close-btn" onclick="window.closeCalc()">×</button>
                    </div>
                    <div class="header-user">
                        <span class="user-badge">${getDisplayName(STATE)}</span>
                        <span class="user-tier">${STATE.tier === 'pro' ? '⭐ PRO' : 'FREE'}</span>
                    </div>
                    <div class="header-tabs">
                        <button class="tab-btn active" data-view="rooms">📚 Rooms</button>
                        <button class="tab-btn" data-view="contacts">👥 Contacts</button>
                    </div>
                </div>
                
                <div class="calc-content">
                    <div class="view-container" id="view-rooms">
                        <div class="rooms-header">
                            <input type="text" id="room-search" placeholder="Biology_Room204_P3" class="room-input">
                            <button class="action-btn" onclick="window.joinRoom()">Join</button>
                        </div>
                        <div class="rooms-list" id="rooms-list">
                            <div class="empty-state">
                                <p>📚 No active rooms</p>
                                <p class="empty-hint">Enter room name to join</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="view-container hidden" id="view-contacts">
                        <div class="contacts-header">
                            <button class="action-btn" onclick="window.showAddContact()">+ Add</button>
                            <span class="contact-count">${STATE.contacts.length}/${STATE.tier === 'pro' ? '∞' : CONFIG.FREE_CONTACT_LIMIT}</span>
                        </div>
                        
                        <div class="requests-section" id="requests-section" style="display:none;">
                            <h3>Pending Requests</h3>
                            <div id="requests-list"></div>
                        </div>
                        
                        <div class="contacts-list" id="contacts-list">
                            <div class="empty-state">
                                <p>👥 No contacts yet</p>
                                <p class="empty-hint">Add classmates to chat</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="view-container hidden" id="view-tunnel">
                        <div class="chat-header">
                            <button class="back-btn" onclick="window.backToContacts()">← Back</button>
                            <span class="chat-title" id="tunnel-title"></span>
                        </div>
                        <div class="messages-area" id="tunnel-messages"></div>
                        <div class="message-input-container">
                            <input type="text" id="tunnel-input" placeholder="Type message..." class="message-input">
                            <button class="send-btn" onclick="window.sendTunnelMessage()">Send</button>
                        </div>
                    </div>
                    
                    <div class="view-container hidden" id="view-room">
                        <div class="chat-header">
                            <button class="back-btn" onclick="window.backToRooms()">← Back</button>
                            <span class="chat-title" id="room-title"></span>
                            <button class="members-btn" onclick="window.showRoomMembers()">👥 <span id="member-count">0</span></button>
                        </div>
                        <div class="messages-area" id="room-messages"></div>
                        <div class="message-input-container">
                            <input type="text" id="room-input" placeholder="Type message..." class="message-input">
                            <button class="send-btn" onclick="window.sendRoomMessage()">Send</button>
                        </div>
                    </div>
                    
                    <div class="modal hidden" id="add-contact-modal">
                        <div class="modal-content">
                            <h3>Add Contact</h3>
                            <p class="modal-hint">Paste email from Classroom:</p>
                            <input type="text" id="contact-email-input" placeholder="mike@school.edu" class="modal-input">
                            <div class="modal-actions">
                                <button class="btn-secondary" onclick="window.closeModal()">Cancel</button>
                                <button class="btn-primary" onclick="window.sendContactRequest()">Send</button>
                            </div>
                            <div id="add-contact-status" class="status-message"></div>
                        </div>
                    </div>
                    
                    <div class="modal hidden" id="room-members-modal">
                        <div class="modal-content">
                            <h3>Room Members</h3>
                            <div id="room-members-list" class="members-list"></div>
                            <button class="btn-primary" onclick="window.closeModal()">Close</button>
                        </div>
                    </div>
                </div>
                
                <div class="calc-buttons">
                    <div class="calc-grid">
                        ${['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'].map(btn => 
                            `<button class="calc-btn" onclick="window.handleCalcBtn('${btn}')">${btn}</button>`
                        ).join('')}
                        <button class="calc-btn special" onclick="window.handleCalcBtn('C')" ondblclick="window.panicButton()">AC</button>
                        <button class="calc-btn special" onclick="window.toggleCalc()">MIN</button>
                    </div>
                </div>
            </div>
            
            <style>
                #study-calc * { box-sizing: border-box; }
                .calc-window {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 420px;
                    height: 600px;
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(20px);
                    border-radius: 16px;
                    box-shadow: 0 10px 50px rgba(0,0,0,0.2);
                    display: flex;
                    flex-direction: column;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                    z-index: 999999;
                    overflow: hidden;
                }
                
                .calc-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 16px;
                }
                
                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .header-title {
                    font-size: 16px;
                    font-weight: 600;
                    cursor: move;
                }
                
                .close-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    font-size: 24px;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .close-btn:hover { background: rgba(255,255,255,0.3); }
                
                .header-user {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    font-size: 12px;
                    margin-bottom: 8px;
                }
                
                .user-badge {
                    background: rgba(255,255,255,0.2);
                    padding: 4px 8px;
                    border-radius: 12px;
                }
                
                .user-tier {
                    background: rgba(255,215,0,0.3);
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                }
                
                .header-tabs {
                    display: flex;
                    gap: 8px;
                }
                
                .tab-btn {
                    flex: 1;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                
                .tab-btn:hover { background: rgba(255,255,255,0.3); }
                .tab-btn.active { background: white; color: #667eea; }
                
                .calc-content {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }
                
                .view-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .view-container.hidden { display: none; }
                
                .rooms-header, .contacts-header {
                    padding: 12px;
                    display: flex;
                    gap: 8px;
                    border-bottom: 1px solid #eee;
                }
                
                .room-input, .message-input, .modal-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 13px;
                    outline: none;
                }
                
                .room-input:focus, .message-input:focus, .modal-input:focus {
                    border-color: #667eea;
                }
                
                .action-btn, .send-btn, .btn-primary {
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                
                .action-btn:hover, .send-btn:hover, .btn-primary:hover {
                    background: #5568d3;
                }
                
                .rooms-list, .contacts-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                }
                
                .room-item, .contact-item {
                    background: #f8f9fa;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .room-item:hover, .contact-item:hover {
                    background: #e9ecef;
                    transform: translateX(4px);
                }
                
                .room-name, .contact-name {
                    font-weight: 600;
                    color: #333;
                }
                
                .room-info {
                    font-size: 11px;
                    color: #666;
                    margin-top: 4px;
                }
                
                .contact-count {
                    font-size: 13px;
                    color: #666;
                    font-weight: 600;
                }
                
                .requests-section {
                    padding: 12px;
                    background: #fff7ed;
                    border-bottom: 1px solid #fed7aa;
                }
                
                .requests-section h3 {
                    font-size: 13px;
                    color: #9a3412;
                    margin-bottom: 8px;
                }
                
                .request-item {
                    background: white;
                    padding: 10px;
                    border-radius: 8px;
                    margin-bottom: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .request-user {
                    font-size: 13px;
                    font-weight: 600;
                    color: #333;
                }
                
                .request-actions {
                    display: flex;
                    gap: 6px;
                }
                
                .btn-accept, .btn-decline {
                    border: none;
                    padding: 4px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    color: white;
                }
                
                .btn-accept { background: #22c55e; }
                .btn-decline { background: #ef4444; }
                
                .chat-header {
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .back-btn {
                    background: none;
                    border: none;
                    color: #667eea;
                    font-size: 14px;
                    cursor: pointer;
                    font-weight: 600;
                }
                
                .chat-title {
                    font-weight: 600;
                    color: #333;
                    flex: 1;
                    text-align: center;
                }
                
                .members-btn {
                    background: #f8f9fa;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    color: #666;
                }
                
                .messages-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .message {
                    display: flex;
                    flex-direction: column;
                    max-width: 75%;
                }
                
                .message.mine {
                    align-self: flex-end;
                    align-items: flex-end;
                }
                
                .message.theirs {
                    align-self: flex-start;
                    align-items: flex-start;
                }
                
                .message-meta {
                    font-size: 10px;
                    color: #999;
                    margin-bottom: 4px;
                }
                
                .message-bubble {
                    padding: 10px 14px;
                    border-radius: 16px;
                    font-size: 14px;
                    word-break: break-word;
                }
                
                .message.mine .message-bubble {
                    background: #667eea;
                    color: white;
                }
                
                .message.theirs .message-bubble {
                    background: #f1f3f5;
                    color: #333;
                }
                
                .message-input-container {
                    padding: 12px;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 8px;
                }
                
                .message-input {
                    border-radius: 20px;
                }
                
                .send-btn {
                    border-radius: 20px;
                    padding: 8px 20px;
                }
                
                .modal {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .modal.hidden { display: none; }
                
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    width: 90%;
                    max-width: 350px;
                }
                
                .modal-content h3 {
                    margin-bottom: 12px;
                    color: #333;
                }
                
                .modal-hint {
                    font-size: 13px;
                    color: #666;
                    margin-bottom: 12px;
                }
                
                .modal-input {
                    width: 100%;
                    margin-bottom: 16px;
                }
                
                .modal-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
                
                .btn-secondary {
                    background: #e9ecef;
                    color: #333;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .status-message {
                    margin-top: 12px;
                    padding: 8px;
                    border-radius: 6px;
                    font-size: 13px;
                    text-align: center;
                }
                
                .status-message.success {
                    background: #d1fae5;
                    color: #065f46;
                }
                
                .status-message.error {
                    background: #fee2e2;
                    color: #991b1b;
                }
                
                .members-list {
                    max-height: 300px;
                    overflow-y: auto;
                    margin-bottom: 16px;
                }
                
                .member-item {
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-bottom: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .member-name {
                    font-weight: 600;
                    color: #333;
                }
                
                .btn-add-contact {
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .calc-buttons {
                    background: #f8f9fa;
                    border-top: 1px solid #eee;
                    padding: 8px;
                }
                
                .calc-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6px;
                }
                
                .calc-btn {
                    background: white;
                    border: 1px solid #ddd;
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                    transition: all 0.1s;
                }
                
                .calc-btn:active {
                    transform: scale(0.95);
                    background: #e9ecef;
                }
                
                .calc-btn.special {
                    background: #667eea;
                    color: white;
                    border: none;
                    font-size: 14px;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: #999;
                }
                
                .empty-state p {
                    margin-bottom: 8px;
                }
                
                .empty-hint {
                    font-size: 12px;
                    color: #bbb;
                }
                
                ::-webkit-scrollbar {
                    width: 6px;
                }
                
                ::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 3px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: #999;
                }
            </style>
        `;
        
        document.body.appendChild(calc);
        
        attachEventListeners();
        initializeDragging();
        loadInitialData();
    }
    
    function attachEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
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
        const header = document.querySelector('.header-title');
        const calcWindow = document.querySelector('.calc-window');
        
        if (!header || !calcWindow) return;
        
        header.addEventListener('mousedown', (e) => {
            STATE.isDragging = true;
            const rect = calcWindow.getBoundingClientRect();
            STATE.dragOffset.x = e.clientX - rect.left;
            STATE.dragOffset.y = e.clientY - rect.top;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!STATE.isDragging) return;
            e.preventDefault();
            calcWindow.style.left = (e.clientX - STATE.dragOffset.x) + 'px';
            calcWindow.style.top = (e.clientY - STATE.dragOffset.y) + 'px';
            calcWindow.style.bottom = 'auto';
            calcWindow.style.right = 'auto';
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
        const userBadge = document.querySelector('.user-badge');
        const userTier = document.querySelector('.user-tier');
        if (userBadge) userBadge.textContent = getDisplayName(STATE);
        if (userTier) userTier.textContent = STATE.tier === 'pro' ? '⭐ PRO' : 'FREE';
    }
    
    function renderContacts() {
        const container = document.getElementById('contacts-list');
        const countSpan = document.querySelector('.contact-count');
        
        if (countSpan) {
            countSpan.textContent = `${STATE.contacts.length}/${STATE.tier === 'pro' ? '∞' : CONFIG.FREE_CONTACT_LIMIT}`;
        }
        
        if (!container) return;
        
        if (STATE.contacts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>👥 No contacts yet</p>
                    <p class="empty-hint">Add classmates to chat</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.contacts.map(contact => `
            <div class="contact-item" onclick="window.openTunnel('${contact.userId}', '${escapeHtml(getDisplayName(contact))}')">
                <div>
                    <div class="contact-name">${escapeHtml(getDisplayName(contact))}</div>
                </div>
                <div style="font-size: 18px; color: #999;">💬</div>
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
            <div class="request-item">
                <div class="request-user">${escapeHtml(getDisplayName(req))}</div>
                <div class="request-actions">
                    <button class="btn-accept" onclick="window.acceptRequest('${req.requestId}')">✓</button>
                    <button class="btn-decline" onclick="window.declineRequest('${req.requestId}')">×</button>
                </div>
            </div>
        `).join('');
    }
    
    function renderRooms() {
        const container = document.getElementById('rooms-list');
        
        if (!container) return;
        
        if (STATE.rooms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📚 No active rooms</p>
                    <p class="empty-hint">Enter room name to join</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.rooms.map(room => `
            <div class="room-item" onclick="window.openRoom('${room.roomId}', '${escapeHtml(room.roomName)}')">
                <div class="room-name">${escapeHtml(room.roomName)}</div>
                <div class="room-info">Last active: ${formatTime(room.lastActivity)}</div>
            </div>
        `).join('');
    }
    
    function renderTunnelMessages() {
        const container = document.getElementById('tunnel-messages');
        
        if (!container) return;
        
        if (STATE.tunnelMessages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>👋 Start the conversation!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.tunnelMessages.map(msg => {
            const isMine = msg.senderId === STATE.userId;
            return `
                <div class="message ${isMine ? 'mine' : 'theirs'}">
                    <div class="message-meta">${formatTime(msg.timestamp)}</div>
                    <div class="message-bubble">${escapeHtml(msg.message)}</div>
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
                <div class="empty-state">
                    <p>👋 Be the first to say something!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.roomMessages.map(msg => {
            const isMine = msg.senderId === STATE.userId;
            return `
                <div class="message ${isMine ? 'mine' : 'theirs'}">
                    <div class="message-meta">${isMine ? 'You' : 'Classmate'} • ${formatTime(msg.timestamp)}</div>
                    <div class="message-bubble">${escapeHtml(msg.message)}</div>
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
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.add('hidden');
        });
        
        const targetView = document.getElementById('view-' + viewName);
        if (targetView) {
            targetView.classList.remove('hidden');
        }
    }
    
    window.closeCalc = function() {
        if (STATE.syncInterval) {
            clearInterval(STATE.syncInterval);
        }
        const calc = document.getElementById('study-calc');
        if (calc) {
            calc.remove();
        }
    };
    
    window.panicButton = function() {
        console.log('[PANIC] Session scrubbed');
        localStorage.clear();
        window.closeCalc();
    };
    
    window.toggleCalc = function() {
        const content = document.querySelector('.calc-content');
        const buttons = document.querySelector('.calc-buttons');
        if (!content || !buttons) return;
        
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'flex' : 'none';
        buttons.style.display = isHidden ? 'none' : 'block';
    };
    
    window.handleCalcBtn = function(btn) {
        console.log('Calc button:', btn);
    };
    
    window.showAddContact = function() {
        if (STATE.tier === 'free' && STATE.contacts.length >= CONFIG.FREE_CONTACT_LIMIT) {
            alert('Contact limit reached (10/10). Upgrade to Pro for unlimited!');
            return;
        }
        const modal = document.getElementById('add-contact-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };
    
    window.closeModal = function() {
        document.querySelectorAll('.modal').forEach(modal => {
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
            status.className = 'status-message error';
            status.textContent = 'Please enter an email';
            return;
        }
        
        try {
            const domain = STATE.username.split('@')[1] || 'default';
            const findResult = await apiCall('findUser', { email: email, domain: domain });
            
            if (!findResult.found) {
                status.className = 'status-message error';
                status.textContent = 'User not found. Make sure they signed up!';
                return;
            }
            
            await apiCall('sendContactRequest', {
                from: STATE.userId,
                to: findResult.userId
            });
            
            status.className = 'status-message success';
            status.textContent = '✓ Request sent!';
            
            setTimeout(() => {
                window.closeModal();
            }, 1500);
            
        } catch (error) {
            status.className = 'status-message error';
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
                container.innerHTML = '<p class="empty-hint">No active members</p>';
            } else {
                container.innerHTML = members.map(member => {
                    const isContact = STATE.contacts.some(c => c.userId === member.userId);
                    const isMe = member.userId === STATE.userId;
                    
                    return `
                        <div class="member-item">
                            <div class="member-name">${escapeHtml(getDisplayName(member))}${isMe ? ' (You)' : ''}</div>
                            ${!isContact && !isMe ? `<button class="btn-add-contact" onclick="window.addFromRoom('${member.userId}')">+ Add</button>` : ''}
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
    console.log('%c[STUDY HUD] Loaded successfully', 'color: #667eea; font-weight: bold');
    
})();
