/**
 * Study Helper - Multi-User Calculator
 * CORS-bypass version
 */

(function() {
    'use strict';
    
    // Prevent duplicates
    if (document.getElementById('study-calc')) return;
    
    // CONFIG - YOUR GOOGLE APPS SCRIPT URL
    const RELAY_URL = 'https://script.google.com/macros/s/AKfycbw7IGWIvlxwOVHAEEs4AZeGL4KEuJTUsuuqxCQ_pnorXzJGMr4_3UUp3txIQdxmHFPBkA/exec';
    
    // State
    let room = localStorage.getItem('study_room') || 'Study_' + Math.random().toString(36).substr(2, 6);
    let user = localStorage.getItem('study_user') || 'User_' + Math.random().toString(36).substr(2, 4);
    let c = '';
    let k = 0;
    let syncInterval = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // Save room and user
    localStorage.setItem('study_room', room);
    localStorage.setItem('study_user', user);
    
    // Dynamic site name
    let h = location.hostname.replace('www.','').split('.')[0];
    h = h.charAt(0).toUpperCase() + h.slice(1) + ' Comments';
    
    const u = () => {
        const m = document.getElementById('msg-input');
        if (m) m.innerText = c || 'Type a message...';
    };
    
    // Build UI
    const calc = document.createElement('div');
    calc.id = 'study-calc';
    calc.innerHTML = '<div style="position:fixed;bottom:50px;right:20px;z-index:999999;width:450px;height:40vh;background:rgba(255,255,255,0.85);box-shadow:-5px 0 30px rgba(0,0,0,0.1);overflow:hidden;border:1px solid #ccc;display:flex;flex-direction:column;font-family:sans-serif;border-radius:8px"><div id="drag-header" style="padding:10px 15px;border-bottom:1px solid #eee;font-size:10px;color:#444;background:rgba(249,249,249,0.85);cursor:move;user-select:none"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-weight:600;font-size:11px">' + h + '</span><span onclick="window.closeCalc()" style="cursor:pointer;color:#000;font-size:16px;padding:4px 8px;margin:-4px -8px -4px 0">✕</span></div><div style="font-size:9px;color:#666">Room: <span style="color:#0a84ff;font-weight:600">' + room + '</span> | You: <span style="color:#0a84ff;font-weight:600">' + user + '</span></div></div><div id="msg-area" style="flex-grow:1;padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px"></div><div style="padding:10px 12px;border-top:1px solid #eee;background:rgba(249,249,249,0.85)"><div id="msg-input" contenteditable="true" inputmode="tel" style="color:#000;font-size:14px;outline:none;min-height:35px;overflow-y:auto;padding:8px;border:1px solid #ddd;border-radius:8px;background:#fff" onfocus="if(this.innerText===\'Type a message...\')this.innerText=\'\'" onblur="if(this.innerText===\'\')this.innerText=\'Type a message...\'">Type a message...</div></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;padding:1px;background:rgba(238,238,238,0.9)">' + 
    ['7','8','9','÷','4','5','6','×','1','2','3','−','0','C','=','+','ABC','SEND'].map(x => {
        let isSpecial = x === 'ABC' || x === 'SEND';
        let style = 'padding:' + (isSpecial ? '8px 0' : '8px 0') + ';background:rgba(255,255,255,0.95);border:none;font-weight:600;color:#000;font-size:' + (isSpecial ? '10px' : '14px') + ';cursor:pointer;transition:background 0.2s';
        if (isSpecial) style += ';grid-column:span 2;border-top:1px solid #eee';
        return '<button onclick="window.handleBtn(\'' + x + '\')" onmouseover="this.style.background=\'rgba(240,240,240,0.95)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.95)\'" style="' + style + '">' + x + '</button>';
    }).join('') + 
    '</div></div>';
    
    document.body.appendChild(calc);
    
    // Make draggable
    const header = document.getElementById('drag-header');
    const calcElem = document.getElementById('study-calc').firstChild;
    
    header.addEventListener('mousedown', function(e) {
        isDragging = true;
        dragOffset.x = e.clientX - calcElem.offsetLeft;
        dragOffset.y = e.clientY - calcElem.offsetTop;
        header.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        calcElem.style.left = (e.clientX - dragOffset.x) + 'px';
        calcElem.style.top = (e.clientY - dragOffset.y) + 'px';
        calcElem.style.bottom = 'auto';
        calcElem.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
        }
    });
    
    // Send message - Using dynamic script tag to bypass CORS
    async function sendMsg(msg) {
        if (!msg || msg === 'Type a message...') return;
        
        try {
            // Create URL with query parameters for GET request
            const url = RELAY_URL + 
                '?action=post' +
                '&room=' + encodeURIComponent(room) +
                '&user=' + encodeURIComponent(user) +
                '&msg=' + encodeURIComponent(msg) +
                '&timestamp=' + encodeURIComponent(new Date().toISOString());
            
            // Use script tag injection to bypass CORS
            const script = document.createElement('script');
            script.src = url;
            document.head.appendChild(script);
            
            // Clean up after 2 seconds
            setTimeout(() => script.remove(), 2000);
            
            // Clear input
            c = '';
            const m = document.getElementById('msg-input');
            if (m) m.innerText = 'Type a message...';
            
            // Add to local display immediately
            addLocalMsg(msg, true);
            
            console.log('[STUDY] Message sent');
        } catch(e) {
            console.log('[STUDY] Send failed:', e);
        }
    }
    
    // Add message to local display (optimistic update)
    function addLocalMsg(msg, isMe) {
        const container = document.getElementById('msg-area');
        if (!container) return;
        
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = 'display:flex;flex-direction:column;align-items:' + (isMe ? 'flex-end' : 'flex-start');
        msgDiv.innerHTML = '<div style="font-size:9px;color:#999;margin-bottom:2px;' + (isMe ? 'margin-right:4px' : 'margin-left:4px') + '">' + (isMe ? 'You' : user) + ' • ' + time + '</div><div style="background:' + (isMe ? 'rgba(10,132,255,0.9)' : 'rgba(242,242,247,0.9)') + ';color:' + (isMe ? '#fff' : '#000') + ';padding:8px 12px;border-radius:16px;max-width:75%;word-break:break-word;font-size:14px">' + msg + '</div>';
        
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    // Fetch messages - Using JSONP callback
    async function fetchMsgs() {
        try {
            const url = RELAY_URL + '?room=' + encodeURIComponent(room) + '&callback=handleMsgs';
            const script = document.createElement('script');
            script.src = url;
            document.head.appendChild(script);
            setTimeout(() => script.remove(), 5000);
        } catch(e) {
            console.log('[STUDY] Fetch idle');
        }
    }
    
    // Handle incoming messages
    window.handleMsgs = function(data) {
        if (data.messages && data.messages.length > 0) {
            displayMsgs(data.messages);
        }
    };
    
    // Display messages in UI
    function displayMsgs(messages) {
        const container = document.getElementById('msg-area');
        if (!container) return;
        
        container.innerHTML = messages.slice(-10).map(m => {
            const isMe = m.user === user;
            const time = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            return '<div style="display:flex;flex-direction:column;align-items:' + (isMe ? 'flex-end' : 'flex-start') + '"><div style="font-size:9px;color:#999;margin-bottom:2px;' + (isMe ? 'margin-right:4px' : 'margin-left:4px') + '">' + (isMe ? 'You' : m.user) + ' • ' + time + '</div><div style="background:' + (isMe ? 'rgba(10,132,255,0.9)' : 'rgba(242,242,247,0.9)') + ';color:' + (isMe ? '#fff' : '#000') + ';padding:8px 12px;border-radius:16px;max-width:75%;word-break:break-word;font-size:14px">' + m.msg + '</div></div>';
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    }
    
    // Start syncing
    function startSync() {
        fetchMsgs();
        syncInterval = setInterval(fetchMsgs, 5000);
        console.log('%c[STUDY] Syncing room: ' + room, 'color: #0a84ff; font-weight: bold;');
    }
    
    // Stop syncing
    function stopSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }
    
    // Close calculator
    window.closeCalc = function() {
        stopSync();
        calc.remove();
    };
    
    // Button handler
    window.handleBtn = function(x) {
        const m = document.getElementById('msg-input');
        
        if (x === 'C') {
            c = '';
            if (m) m.innerText = 'Type a message...';
        } else if (x === 'ABC') {
            k = !k;
            if (m) {
                m.setAttribute('inputmode', k ? 'text' : 'tel');
                m.focus();
            }
        } else if (x === 'SEND') {
            const text = m ? m.innerText.trim() : '';
            if (text && text !== 'Type a message...') {
                sendMsg(text);
            }
        } else if (x === '=') {
            if (c) {
                try {
                    const expr = c.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
                    const result = eval(expr);
                    sendMsg(c + ' = ' + result);
                    c = '';
                } catch(e) {
                    c = '';
                }
            }
        } else {
            let val = x;
            if (x === '÷') val = '/';
            if (x === '×') val = '*';
            if (x === '−') val = '-';
            c += val;
            u();
        }
    };
    
    startSync();
    
    console.log('%c[STUDY] ● Connected', 'color: #00ff00; font-weight: bold;');
    console.log('%c[TIP] Drag header to move. Room: ' + room, 'color: #ffaa00;');
    
})();
