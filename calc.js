(function() {
    'use strict';
    if (document.getElementById('floatspace-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'floatspace-hud';
    hud.innerHTML = `
        <div id="fs-header" style="cursor: move; background: rgba(26, 115, 232, 0.85); color: white; padding: 12px; border-radius: 12px 12px 0 0; font-weight: bold; display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(5px);">
            <span style="letter-spacing: 1px; font-size: 14px;">FLOATSPACE</span>
            <span id="fs-close" style="cursor: pointer; font-size: 20px;">×</span>
        </div>
        <div id="fs-content" style="padding: 15px; height: 250px; overflow-y: auto; color: #333; background: rgba(255, 255, 255, 0.7);">
            <p style="font-size: 11px; color: #555; margin-top: 0;">User: ${localStorage.getItem('floatspace_user_id') || 'Guest'}</p>
            <div id="fs-messages" style="font-size: 14px; line-height: 1.5;">Welcome to your floating workspace!</div>
        </div>
        <div style="padding: 12px; background: rgba(248, 249, 250, 0.8); border-radius: 0 0 12px 12px; backdrop-filter: blur(5px);">
            <input type="text" id="fs-input" placeholder="Type a message..." style="width: 100%; padding: 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; box-sizing: border-box; background: rgba(255,255,255,0.9);">
        </div>
    `;

    Object.assign(hud.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '320px',
        zIndex: '9999999',
        backgroundColor: 'rgba(255, 255, 255, 0.4)', // The glass base
        backdropFilter: 'blur(12px) saturate(180%)', // The frosted effect
        webkitBackdropFilter: 'blur(12px) saturate(180%)', // Support for Safari/iPad
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    document.body.appendChild(hud);

    // Close logic
    document.getElementById('fs-close').onclick = () => hud.remove();

    // Touch dragging for iPad
    const header = document.getElementById('fs-header');
    let isDragging = false;
    header.addEventListener('touchstart', (e) => { isDragging = true; });
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        let touch = e.touches[0];
        hud.style.left = (touch.clientX - 160) + 'px';
        hud.style.top = (touch.clientY - 20) + 'px';
        hud.style.right = 'auto';
    }, { passive: false });
    document.addEventListener('touchend', () => { isDragging = false; });
})();
