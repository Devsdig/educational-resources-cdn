(function() {
    if (document.getElementById('math-hud')) return;

    // 1. Create the HUD (Glass Skin)
    const hud = document.createElement('div');
    hud.id = 'math-hud';
    hud.style = "position:fixed; top:20px; right:20px; width:280px; height:350px; background:rgba(255,255,255,0.9); backdrop-filter:blur(10px); border:1px solid #ddd; border-radius:12px; z-index:999999; box-shadow:0 8px 32px rgba(0,0,0,0.15); font-family:sans-serif; display:flex; flex-direction:column; overflow:hidden;";

    hud.innerHTML = `
        <div id="math-header" style="padding:10px; background:#4285f4; color:white; cursor:move; display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:bold;">
            <span>Standard Utility v1.2</span>
            <span style="font-weight:normal; font-size:10px; opacity:0.8;">[Esc] to Hide</span>
        </div>
        <div style="flex:1; padding:10px; display:flex; flex-direction:column;">
            <div id="math-chat" style="flex:1; background:#f9f9f9; border:1px solid #eee; border-radius:6px; margin-bottom:10px; padding:8px; font-size:11px; overflow-y:auto; color:#444;">
                <b>System:</b> Secure link active. Resources loaded.
            </div>
            <input type="text" id="math-input" placeholder="Type here..." style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; outline:none; font-size:12px;">
        </div>
    `;

    document.body.appendChild(hud);

    // 2. The Panic Key (Esc)
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") hud.remove();
    });

    // 3. Draggable Logic
    let isDragging = false, offset = [0,0];
    document.getElementById('math-header').onmousedown = (e) => {
        isDragging = true;
        offset = [hud.offsetLeft - e.clientX, hud.offsetTop - e.clientY];
    };
    document.onmousemove = (e) => {
        if (!isDragging) return;
        hud.style.left = (e.clientX + offset[0]) + 'px';
        hud.style.top = (e.clientY + offset[1]) + 'px';
    };
    document.onmouseup = () => { isDragging = false; };
})();
