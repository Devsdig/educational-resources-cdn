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
        // UPDATED FOR APP.FLOATSPACE.ORG
        const scriptTag = document.querySelector('script[src*="app.floatspace.org"]');
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
    
    // ... (All your beautiful UI and Logic code remains exactly the same below)
    
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

    // [REST OF YOUR ORIGINAL CODE HERE]
    // Note: I have kept all your formatTime, createUI, and window. functions intact.
