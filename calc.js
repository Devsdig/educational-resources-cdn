/**
 * FLOATSPACE - Your Floating Workspace
 * Domain: app.floatspace.org
 */

(function() {
    'use strict';

    // Prevent multiple instances
    if (document.getElementById('floatspace-hud')) return;

    const CONFIG = {
        BACKEND_URL: 'https://script.google.com/macros/s/AKfycb.../exec', // Ensure this matches your Apps Script URL
        SYNC_INTERVAL: 5000
    };

    const STATE = {
        userId: localStorage.getItem('floatspace_user_id') || 'Guest',
        isDragging: false,
        currentPos: { x: 20, y: 20 }
    };

    // --- 1. Create the HUD Element ---
    const hud = document.createElement('div');
    hud.id = 'floatspace-hud';
    hud.innerHTML = `
        <div id="fs-header" style="cursor: move; background: #1a73e8; color: white; padding: 10px; border-radius: 8px 8px 0 0; font-weight: bold; display: flex; justify-content: space-between;">
            <span>FLOATSPACE</span>
            <span id="fs-close" style="cursor: pointer;">×</span>
        </div>
        <div id="fs-content" style="padding: 15px; background: white; height: 200px; overflow-y: auto; color: #333;">
            <p style="font-size: 12px; color: #666;">User: ${STATE.userId}</p>
            <div id="fs-messages">Welcome to your floating workspace!</div>
        </div>
        <div style="padding: 10px; border-top: 1px solid #eee; background: #f8f9fa; border-radius: 0 0 8px 8px;">
            <input type="text" id="fs-input" placeholder="Type a message..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
        </div>
    `;

    // --- 2. Styles ---
    Object.assign(hud.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '300px',
        zIndex: '999999',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        fontFamily: 'sans-serif'
    });

    document.body.appendChild(hud);

    // --- 3. Close Functionality ---
    document.getElementById('fs-close').onclick = () => hud.remove();

    // --- 4. Dragging Logic for iPad/Touch ---
    const header = document.getElementById('fs-header');
    
    const onMove = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        hud.style.left = (touch.clientX - 150) + 'px';
        hud.style.top = (touch.clientY - 20) + 'px';
        hud.style.right = 'auto';
    };

    header.addEventListener('touchstart', () => {
        document.addEventListener('touchmove', onMove);
    });

    document.addEventListener('touchend', () => {
        document.removeEventListener('touchmove', onMove);
    });

    console.log("FloatSpace HUD Active on " + window.location.hostname);
})();
