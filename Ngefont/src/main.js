// ─── Guides ──────────────────────────────────────────────────────────────────
const GUIDES = {
    ascender:  { y: 31,  label: 'Ascender',   color: 'rgba(255,80,80,0.8)' },
    capHeight: { y: 128, label: 'Cap Height', color: 'rgba(255,80,80,0.8)' },
    xHeight:   { y: 241, label: 'x-Height',   color: 'rgba(255,80,80,0.8)'  },
    baseline:  { y: 358, label: 'Baseline',   color: 'rgba(255,50,50,0.9)' },
    descender: { y: 435, label: 'Descender',  color: 'rgba(255,80,80,0.8)' },
};
const guideCanvas = document.getElementById('guide-canvas');
const guideCtx    = guideCanvas.getContext('2d');
let   showGuides  = true;

function drawGuides() {
    guideCtx.clearRect(0, 0, 512, 512);
    if (!showGuides) return;
    [25, 487].forEach(x => {
        guideCtx.strokeStyle = 'rgba(255,80,80,0.5)';
        guideCtx.lineWidth = 1; guideCtx.setLineDash([4, 4]);
        guideCtx.beginPath(); guideCtx.moveTo(x, 0); guideCtx.lineTo(x, 512); guideCtx.stroke();
    });
    guideCtx.setLineDash([]);
    for (const [key, g] of Object.entries(GUIDES)) {
        const isBaseline = key === 'baseline';
        guideCtx.strokeStyle = g.color;
        guideCtx.lineWidth = isBaseline ? 1.5 : 1;
        guideCtx.setLineDash(isBaseline ? [] : [5, 4]);
        guideCtx.beginPath(); guideCtx.moveTo(0, g.y); guideCtx.lineTo(512, g.y); guideCtx.stroke();
        guideCtx.setLineDash([]); guideCtx.fillStyle = g.color;
        guideCtx.font = '9px monospace'; guideCtx.textAlign = 'right';
        guideCtx.fillText(g.label, 510, g.y - 2);
    }
}
document.getElementById('toggle-guides').addEventListener('change', e => { showGuides = e.target.checked; drawGuides(); });
drawGuides();

// ─── State ──────────────────────────────────────────────────────────────────
const charsList = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{};':\",./\<>?\\|`~ ".split('');
const chars = {};
let activeChar = 'A';
let kerningGroups = [];

const mainCanvas = document.getElementById('main-canvas');
const mainCtx    = mainCanvas.getContext('2d', { willReadFrequently: true });
const transformCanvas = document.getElementById('transform-overlay');
const transformCtx    = transformCanvas.getContext('2d');

function getCharData(char) {
    if (!chars[char]) {
        const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 512;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 512, 512);
        chars[char] = {
            sourceCanvas: cvs, bgTolerance: 20, ditherLevel: 0,
            processedImageData: null, populated: false,
            history: [ctx.getImageData(0,0,512,512)], historyIndex: 0
        };
    }
    return chars[char];
}

const charGrid = document.getElementById('char-grid');
charsList.forEach(c => {
    if (c === ' ') return;
    const div = document.createElement('div');
    div.className = 'char-item aspect-square bg-white/5 border border-white/10 flex items-center justify-center text-lg font-light hover:bg-white/20 cursor-pointer relative transition-colors';
    div.id = 'char-' + c.charCodeAt(0);
    div.innerHTML = `<span style="z-index:2;mix-blend-mode:difference;color:#fff;">${c}</span><div class="char-thumb" id="thumb-${c.charCodeAt(0)}"></div>`;
    div.onclick = () => selectChar(c);
    charGrid.appendChild(div);
});

// ─── Mobile Drawer Logic ──────────────────────────────────────────────────────
const btnToggleDrawer = document.getElementById('btn-toggle-drawer');
const btnToggleSettings = document.getElementById('btn-toggle-settings');
const charGridContainer = document.getElementById('char-grid-container');
const settingsSidebar = document.getElementById('settings-sidebar');
const drawerBackdrop = document.getElementById('drawer-backdrop');

function closeAllDrawers() {
    charGridContainer?.classList.remove('open');
    settingsSidebar?.classList.remove('open');
    drawerBackdrop?.classList.add('hidden');
    document.getElementById('mobile-more-panel')?.classList.add('hidden');
}

function openDrawer(drawer) {
    closeAllDrawers();
    drawer?.classList.add('open');
    drawerBackdrop?.classList.remove('hidden');
}

if (btnToggleDrawer && charGridContainer) {
    btnToggleDrawer.addEventListener('click', () => {
        if (charGridContainer.classList.contains('open')) {
            closeAllDrawers();
        } else {
            openDrawer(charGridContainer);
        }
    });
}

if (btnToggleSettings && settingsSidebar) {
    btnToggleSettings.addEventListener('click', () => {
        if (settingsSidebar.classList.contains('open')) {
            closeAllDrawers();
        } else {
            openDrawer(settingsSidebar);
        }
    });
}

// Backdrop click closes all drawers
if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeAllDrawers);
}

// ─── Mobile Bottom Toolbar & More Panel ────────────────────────────────────
const mobileMorePanel = document.getElementById('mobile-more-panel');
const btnMore = document.getElementById('btn-more');

if (btnMore && mobileMorePanel) {
    btnMore.addEventListener('click', () => {
        const wasHidden = mobileMorePanel.classList.contains('hidden');
        closeAllDrawers();
        if (wasHidden) {
            mobileMorePanel.classList.remove('hidden');
            drawerBackdrop?.classList.remove('hidden');
        }
    });
}
document.getElementById('btn-close-more')?.addEventListener('click', closeAllDrawers);

// Draw / Erase / Move / Undo / Redo — mobile bottom bar mirrors the desktop toolbar.
// setTool(), undo() and redo() are function declarations defined later in this file,
// but hoisted, so they're safe to reference here.
document.getElementById('btn-draw-mobile')?.addEventListener('click', () => setTool('draw'));
document.getElementById('btn-eraser-mobile')?.addEventListener('click', () => setTool('erase'));
document.getElementById('btn-move-mobile')?.addEventListener('click', () => setTool('transform'));
document.getElementById('btn-undo-mobile')?.addEventListener('click', () => undo());
document.getElementById('btn-redo-mobile')?.addEventListener('click', () => redo());

// "More" panel buttons delegate to their desktop equivalents so there's a single
// source of truth for clear/camera/upload/AI-bg/crop behavior.
[
    ['btn-clear-mobile', 'btn-clear'],
    ['btn-camera-mobile', 'btn-camera'],
    ['btn-upload-mobile', 'btn-upload'],
    ['btn-ai-bg-mobile', 'btn-ai-bg'],
    ['btn-autocrop-mobile', 'btn-autocrop'],
].forEach(([mobileId, desktopId]) => {
    document.getElementById(mobileId)?.addEventListener('click', () => {
        document.getElementById(desktopId)?.click();
        closeAllDrawers();
    });
});

// ─── Brush Size Sync (desktop slider <-> mobile Settings-drawer slider) ────
const brushSizeDesktop = document.getElementById('brush-size');
const brushSizeMobile = document.getElementById('brush-size-mobile');
const brushValDesktop = document.getElementById('brush-size-val');
const brushValMobile = document.getElementById('brush-size-val-mobile');

function syncBrushSize(value) {
    if (brushSizeDesktop) brushSizeDesktop.value = value;
    if (brushSizeMobile) brushSizeMobile.value = value;
    if (brushValDesktop) brushValDesktop.innerText = value;
    if (brushValMobile) brushValMobile.innerText = value;
}
brushSizeDesktop?.addEventListener('input', e => syncBrushSize(e.target.value));
brushSizeMobile?.addEventListener('input', e => syncBrushSize(e.target.value));

// ─── Live Preview relocation (main workspace on desktop, Settings drawer on mobile) ──
const livePreviewBlock = document.getElementById('live-preview-block');
const livePreviewAnchor = document.getElementById('live-preview-anchor');
const livePreviewMobileSlot = document.getElementById('live-preview-mobile-slot');
const mobileBreakpointMQ = window.matchMedia('(max-width: 767px)');

function placeLivePreview(isMobile) {
    if (!livePreviewBlock) return;
    if (isMobile && livePreviewMobileSlot) {
        livePreviewMobileSlot.appendChild(livePreviewBlock);
        livePreviewBlock.classList.add('mobile-in-drawer');
    } else if (livePreviewAnchor) {
        livePreviewAnchor.parentNode.insertBefore(livePreviewBlock, livePreviewAnchor.nextSibling);
        livePreviewBlock.classList.remove('mobile-in-drawer');
    }
}
placeLivePreview(mobileBreakpointMQ.matches);
mobileBreakpointMQ.addEventListener('change', e => placeLivePreview(e.matches));

// ─── Tool Setup & Touch ─────────────────────────────────────────────────────
let currentTool = 'draw';
let cropState = null;
let cropMode = null;
let cropStartMouse = null;
let cropStartObj = null;

function setTool(tool) {
    // If exiting transform mode, bake the transform
    if (currentTool === 'transform' && tool !== 'transform') {
        bakeTransformToCanvas();
    }
    
    currentTool = tool;
    
    const applyBtn = document.getElementById('btn-apply-crop');
    if (tool === 'crop') {
        if (!cropState) cropState = {x: 100, y: 100, w: 312, h: 312};
        if (applyBtn) applyBtn.hidden = false;
    } else {
        cropState = null;
        if (applyBtn) applyBtn.hidden = true;
    }

    // Update desktop toolbar active states
    ['btn-draw','btn-eraser','btn-move','btn-autocrop'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const active = (id === 'btn-' + (tool==='transform'?'move':tool));
        btn.classList.toggle('bg-white', active);
        btn.classList.toggle('text-black', active);
        btn.classList.toggle('border-white', active);
        btn.classList.toggle('bg-[#1a1a1a]', !active);
        btn.classList.toggle('text-white', !active);
        btn.classList.toggle('border-white/10', !active);
    });

    // Update mobile bottom toolbar active states
    [['btn-draw-mobile','draw'],['btn-eraser-mobile','erase'],['btn-move-mobile','transform']].forEach(([id, matchTool]) => {
        document.getElementById(id)?.classList.toggle('active', tool === matchTool);
    });
}

// Desktop toolbar buttons
document.getElementById('btn-draw').onclick   = () => setTool('draw');
document.getElementById('btn-eraser').onclick = () => setTool('erase');
document.getElementById('btn-move').onclick   = () => setTool('transform');

// ─── History ────────────────────────────────────────────────────────────────
function saveState() {
    const data = getCharData(activeChar);
    const idata = data.sourceCanvas.getContext('2d').getImageData(0,0,512,512);
    data.history = data.history.slice(0, data.historyIndex + 1);
    data.history.push(idata);
    if (data.history.length > 20) data.history.shift(); else data.historyIndex++;
}
function undo() { const d = getCharData(activeChar); if (d.historyIndex > 0) { d.historyIndex--; d.sourceCanvas.getContext('2d').putImageData(d.history[d.historyIndex],0,0); updateDisplay(); } }
function redo() { const d = getCharData(activeChar); if (d.historyIndex < d.history.length-1) { d.historyIndex++; d.sourceCanvas.getContext('2d').putImageData(d.history[d.historyIndex],0,0); updateDisplay(); } }
document.getElementById('btn-undo').onclick = undo;
document.getElementById('btn-redo').onclick = redo;

// ─── AI Background Removal (Google MediaPipe - Lazy Loaded) ────────────────
document.getElementById('btn-ai-bg').onclick = async () => {
    const btn = document.getElementById('btn-ai-bg');
    if (btn.disabled) return;
    
    const overlay = document.getElementById('ai-loading-overlay');
    const statusEl = document.getElementById('ai-loading-status');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin opacity-80 text-[20px]">refresh</span>';
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    
    try {
        if (!window._bgSegmenter) {
            statusEl.textContent = 'Downloading AI engine (~10MB)...';
            // Lazy load the WASM and ES module
            const { FilesetResolver, ImageSegmenter } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs');
            
            const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm');
            
            statusEl.textContent = 'Loading AI model (~4MB)...';
            window._bgSegmenter = await ImageSegmenter.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
                    delegate: 'GPU'
                },
                runningMode: 'IMAGE',
                outputCategoryMask: false,
                outputConfidenceMasks: true
            });
        }

        
        statusEl.textContent = 'Processing image with AI...';
        const cvs = getCharData(activeChar).sourceCanvas;
        
        // Create a temporary image element from the canvas for MediaPipe
        const tempImg = new Image();
        const dataUrl = cvs.toDataURL('image/png');
        
        await new Promise((resolve, reject) => {
            tempImg.onload = resolve;
            tempImg.onerror = reject;
            tempImg.src = dataUrl;
        });
        
        // Run segmentation
        const result = window._bgSegmenter.segment(tempImg);
        
        if (!result || !result.confidenceMasks || result.confidenceMasks.length === 0) {
            throw new Error('No segmentation mask returned');
        }
        
        statusEl.textContent = 'Rendering result...';
        const mask = result.confidenceMasks[0];
        const maskData = mask.getAsFloat32Array();
        const w = mask.width, h = mask.height;
        
        // Get original image data
        const srcCtx = cvs.getContext('2d');
        const srcData = srcCtx.getImageData(0, 0, 512, 512);
        
        // Create result canvas
        const resCvs = document.createElement('canvas');
        resCvs.width = 512; resCvs.height = 512;
        const resCtx = resCvs.getContext('2d');
        const resData = resCtx.createImageData(512, 512);
        
        // Apply mask: white background + foreground where mask confidence > 0.5
        for (let y = 0; y < 512; y++) {
            for (let x = 0; x < 512; x++) {
                const si = (y * 512 + x) * 4;
                // Map canvas pixel to mask pixel
                const mx = Math.floor(x * w / 512);
                const my = Math.floor(y * h / 512);
                const mi = my * w + mx;
                const confidence = maskData[mi] || 0;
                
                if (confidence > 0.3) {
                    // Foreground: keep original pixel
                    resData.data[si]     = srcData.data[si];
                    resData.data[si + 1] = srcData.data[si + 1];
                    resData.data[si + 2] = srcData.data[si + 2];
                    resData.data[si + 3] = 255;
                } else {
                    // Background: white
                    resData.data[si]     = 255;
                    resData.data[si + 1] = 255;
                    resData.data[si + 2] = 255;
                    resData.data[si + 3] = 255;
                }
            }
        }
        
        resCtx.putImageData(resData, 0, 0);
        
        // Draw result back to source canvas
        srcCtx.fillStyle = 'white'; srcCtx.fillRect(0, 0, 512, 512);
        srcCtx.drawImage(resCvs, 0, 0);
        
        // Close the mask to free memory
        result.close();
        
        btn.innerHTML = '<span class="material-symbols-outlined opacity-80 text-[20px]">magic_button</span>';
        btn.disabled = false;
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        updateDisplay(); saveState();
    } catch (e) {
        console.error('AI BG removal error:', e);
        btn.innerHTML = '<span class="material-symbols-outlined opacity-80 text-[20px]">magic_button</span>';
        btn.disabled = false;
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        alert('AI BG removal failed:\n' + e.message);
    }
};

// ─── Select Char & Thumbnails ───────────────────────────────────────────────
function updatePopulatedStats() {
    const tot = charsList.length - 1; let pop = 0;
    for (const d of Object.values(chars)) { if (d.populated) pop++; }
    document.getElementById('populated-count').innerText = `Populated: ${pop} / ${tot}`;
    document.getElementById('populated-bar').style.width = (tot>0 ? Math.round((pop/tot)*100) : 0) + '%';
}
function selectChar(c) {
    if (currentTool === 'transform') setTool('draw'); // Bake before switching chars
    if (activeKernIndex >= 0) exitKernEditMode(); // Exit kern edit mode
    if (c === ' ') return;
    document.querySelectorAll('.char-item').forEach(el => el.classList.remove('active'));
    document.getElementById('char-'+c.charCodeAt(0))?.classList.add('active');
    activeChar = c; document.getElementById('active-char-label').innerText = c;
    const d = getCharData(c);
    document.getElementById('slider-bg').value = d.bgTolerance; document.getElementById('val-bg').innerText = d.bgTolerance;
    document.getElementById('slider-dither').value = d.ditherLevel; document.getElementById('val-dither').innerText = d.ditherLevel;
    updateDisplay(); updatePopulatedStats();
    // Close drawer on mobile after selecting a glyph
    if (window.innerWidth < 768) closeAllDrawers();
}

const thumbCtx = document.createElement('canvas').getContext('2d', {willReadFrequently:true});
thumbCtx.canvas.width = 64; thumbCtx.canvas.height = 64;
function updateCharThumbnail(char, cvs) {
    if (char === ' ') return;
    const t = document.getElementById('thumb-'+char.charCodeAt(0));
    if (t) t.style.backgroundImage = `url(${cvs.toDataURL()})`;
    thumbCtx.fillStyle='white'; thumbCtx.fillRect(0,0,64,64);
    thumbCtx.drawImage(cvs,0,0,64,64);
    const d = thumbCtx.getImageData(0,0,64,64).data; let pop = false;
    for (let i=0; i<d.length; i+=4) if (d[i+3]>0 && (d[i]<240 || d[i+1]<240 || d[i+2]<240)) { pop=true; break; }
    getCharData(char).populated = pop; updatePopulatedStats();
}

// ─── Filters & Display ──────────────────────────────────────────────────────
const filterCvs = document.createElement('canvas'); filterCvs.width=512; filterCvs.height=512;
const filterCtx = filterCvs.getContext('2d', {willReadFrequently:true});

function applyFilters(imgD, bgTol, dith) {
    const w = imgD.width, h = imgD.height, out = new ImageData(w,h), od = out.data, s = imgD.data;
    const gr = new Float32Array(w*h), al = new Uint8Array(w*h);
    for (let i=0; i<w*h; i++) { const id=i*4; gr[i]=0.299*s[id]+0.587*s[id+1]+0.114*s[id+2]; al[i]=s[id+3]; }
    const bgT = 255 - bgTol*2.55, dF = dith/100;
    for (let y=0; y<h; y++) {
        for (let x=0; x<w; x++) {
            const i=y*w+x, id=i*4;
            if (al[i]<128) { od[id+3]=0; continue; }
            const v = Math.max(0, Math.min(255, gr[i]));
            if (v >= bgT) { od[id+3]=0; }
            else if (dith > 0) {
                const nv = v<128?0:255; const err=(v-nv)*dF;
                if (nv===0) { od[id]=0; od[id+1]=0; od[id+2]=0; od[id+3]=255; } else { od[id+3]=0; }
                const sa = (ex,ey,f) => { if(ex>=0&&ex<w&&ey>=0&&ey<h) { const ni=ey*w+ex; gr[ni]=Math.max(0,Math.min(255,gr[ni]+err*f)); } };
                sa(x+1,y,7/16); sa(x-1,y+1,3/16); sa(x,y+1,5/16); sa(x+1,y+1,1/16);
            } else { od[id]=0; od[id+1]=0; od[id+2]=0; od[id+3]=255; }
        }
    }
    return out;
}

function updateDisplay() {
    // Don't overwrite canvas during kern preview
    if (activeKernIndex >= 0) { updateLivePreview(); return; }
    
    if (currentTool === 'transform' && tfState) {
        // While in transform, we render the transformed snapshot on the main canvas
        mainCtx.fillStyle = 'white'; mainCtx.fillRect(0,0,512,512);
        
        mainCtx.save();
        mainCtx.translate(tfState.cx, tfState.cy);
        mainCtx.rotate(tfState.angle);
        mainCtx.scale(tfState.scale, tfState.scale);
        mainCtx.drawImage(tfSnapshot, -tfState.init.cx, -tfState.init.cy);
        mainCtx.restore();
        
        // Also apply filters to transformed image for live preview updating!
        const td = mainCtx.getImageData(0,0,512,512);
        const data = getCharData(activeChar);
        const pd = applyFilters(td, data.bgTolerance, data.ditherLevel);
        filterCtx.clearRect(0,0,512,512); filterCtx.putImageData(pd,0,0);
        data.processedImageData = pd;
        
        mainCtx.fillStyle = 'white'; mainCtx.fillRect(0,0,512,512);
        mainCtx.drawImage(filterCvs, 0,0);
        
        updateTransformOverlay();
    } else {
        const data = getCharData(activeChar);
        mainCtx.fillStyle = 'white'; mainCtx.fillRect(0,0,512,512);
        
        const sd = data.sourceCanvas.getContext('2d').getImageData(0,0,512,512);
        const pd = applyFilters(sd, data.bgTolerance, data.ditherLevel);
        filterCtx.clearRect(0,0,512,512); filterCtx.putImageData(pd,0,0);
        mainCtx.drawImage(filterCvs, 0,0);
        data.processedImageData = pd;
        updateCharThumbnail(activeChar, filterCvs);
    }
    updateLivePreview();
}

let sliderTimer = null;
function schedUpd() { if(sliderTimer)clearTimeout(sliderTimer); sliderTimer=setTimeout(()=>{sliderTimer=null;updateDisplay();}, 30); }
document.getElementById('slider-bg').addEventListener('input', e => { getCharData(activeChar).bgTolerance=parseInt(e.target.value); document.getElementById('val-bg').innerText=e.target.value; schedUpd(); });
document.getElementById('slider-dither').addEventListener('input', e => { getCharData(activeChar).ditherLevel=parseInt(e.target.value); document.getElementById('val-dither').innerText=e.target.value; schedUpd(); });

// ─── Bounding Box & Transform Tool ──────────────────────────────────────────
let tfState = null; // { cx, cy, w, h, angle, scale, init }
let tfMode = null;  // 'move', 'rot', 'tl', 'tr', 'bl', 'br'
let tfSnapshot = document.createElement('canvas'); tfSnapshot.width=512; tfSnapshot.height=512;

function getBounds(cvs) {
    const px = cvs.getContext('2d').getImageData(0,0,512,512).data;
    let minX=512, minY=512, maxX=-1, maxY=-1;
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
        if(px[(y*512+x)*4]<200){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
    }
    if(maxX<minX) return null;
    return { cx: minX+(maxX-minX)/2, cy: minY+(maxY-minY)/2, w: maxX-minX+1, h: maxY-minY+1 };
}

function initTransformMode() {
    const data = getCharData(activeChar);
    const b = getBounds(data.sourceCanvas);
    if (!b) { 
        const ws = document.getElementById('workspace');
        if (ws) ws.style.cursor = 'default';
        mainCanvas.style.cursor = 'default'; 
        tfState = null; return; 
    }
    
    // Create snapshot ONLY ONCE upon entering Transform Mode
    tfSnapshot.getContext('2d').clearRect(0,0,512,512);
    tfSnapshot.getContext('2d').drawImage(data.sourceCanvas, 0,0);
    
    tfState = { cx: b.cx, cy: b.cy, w: b.w, h: b.h, angle: 0, scale: 1, init: b };
    
    updateDisplay();
}

function updateTransformOverlay() {
    transformCtx.clearRect(0,0,1536,1536);
    
    // ─── Crop Mode Rendering ───────────────────────────────────────────
    if (currentTool === 'crop' && cropState) {
        // Draw dark overlay
        transformCtx.fillStyle = 'rgba(0,0,0,0.5)';
        transformCtx.fillRect(0, 0, 1536, 1536);
        // Cut out the crop box
        transformCtx.clearRect(512 + cropState.x, 512 + cropState.y, cropState.w, cropState.h);
        
        // Draw crop border
        transformCtx.strokeStyle = '#00ffaa';
        transformCtx.lineWidth = 2;
        transformCtx.setLineDash([4,4]);
        transformCtx.strokeRect(512 + cropState.x, 512 + cropState.y, cropState.w, cropState.h);
        transformCtx.setLineDash([]);
        
        // Draw handles
        const ch = [
            {x: cropState.x, y: cropState.y},
            {x: cropState.x+cropState.w, y: cropState.y},
            {x: cropState.x, y: cropState.y+cropState.h},
            {x: cropState.x+cropState.w, y: cropState.y+cropState.h}
        ];
        transformCtx.fillStyle = 'white';
        transformCtx.strokeStyle = '#00ffaa';
        for(const p of ch) {
            transformCtx.beginPath();
            transformCtx.arc(512+p.x, 512+p.y, 8, 0, Math.PI*2);
            transformCtx.fill();
            transformCtx.stroke();
        }
        return;
    }

    if (currentTool !== 'transform' || !tfState) return;

    const {cx, cy, w, h, angle, scale} = tfState;
    const dw = w*scale, dh = h*scale;

    transformCtx.save();
    transformCtx.translate(512 + cx, 512 + cy);
    transformCtx.rotate(angle);

    // Draw box
    transformCtx.strokeStyle = '#00aaff';
    transformCtx.lineWidth = 1.5;
    transformCtx.setLineDash([4,4]);
    transformCtx.strokeRect(-dw/2, -dh/2, dw, dh);
    transformCtx.setLineDash([]);

    // Draw handles
    const handles = [
        {x: -dw/2, y: -dh/2}, {x: dw/2, y: -dh/2},
        {x: -dw/2, y: dh/2},  {x: dw/2, y: dh/2},
        {x: 0, y: -dh/2 - 25} // rotate handle
    ];
    
    // Line to rot handle
    transformCtx.beginPath();
    transformCtx.moveTo(0, -dh/2);
    transformCtx.lineTo(0, -dh/2 - 25);
    transformCtx.stroke();

    transformCtx.fillStyle = 'white';
    transformCtx.strokeStyle = '#00aaff';
    transformCtx.lineWidth = 2;
    for (const p of handles) {
        transformCtx.beginPath();
        transformCtx.arc(p.x, p.y, 8, 0, Math.PI*2); // Increased radius for mobile
        transformCtx.fill();
        transformCtx.stroke();
    }
    transformCtx.restore();
}

function bakeTransformToCanvas() {
    if(!tfState) return;
    const data = getCharData(activeChar);
    const ctx = data.sourceCanvas.getContext('2d');
    const {cx, cy, scale, angle, init} = tfState;
    
    ctx.fillStyle='white'; ctx.fillRect(0,0,512,512);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.drawImage(tfSnapshot, -init.cx, -init.cy);
    ctx.restore();
    
    tfState = null;
    saveState();
}

let tfStartMouse = null, tfStartObj = null;

// Drawing & Transform logic
let isDrawing = false, lastX=0, lastY=0;
function getCanvasPos(cx,cy) { const r=mainCanvas.getBoundingClientRect(); return {x:(cx-r.left)*(512/r.width),y:(cy-r.top)*(512/r.height)}; }

const workspace = document.getElementById('workspace');
workspace.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    if (activeKernIndex >= 0) return; // Don't draw while in kern preview mode
    isDrawing = true;
    const pos = getCanvasPos(e.clientX, e.clientY);
    lastX = pos.x; lastY = pos.y;
    
    if (currentTool === 'transform') {
        if (!tfState) return;
        tfStartMouse = {x: pos.x, y: pos.y};
        tfStartObj = {...tfState};
        
        // Inverse transform mouse to local bounding box coords to check handles
        const dx = pos.x - tfState.cx, dy = pos.y - tfState.cy;
        const cos = Math.cos(-tfState.angle), sin = Math.sin(-tfState.angle);
        const lx = dx*cos - dy*sin, ly = dx*sin + dy*cos;
        const dw = tfState.w*tfState.scale, dh = tfState.h*tfState.scale;
        
        const hDist = 24; // Increased hit detection radius for touch targets
        if (Math.hypot(lx-0, ly - (-dh/2-25)) < hDist+5) tfMode = 'rot';
        else if (Math.hypot(lx - (-dw/2), ly - (-dh/2)) < hDist) tfMode = 'tl';
        else if (Math.hypot(lx - (dw/2), ly - (-dh/2)) < hDist) tfMode = 'tr';
        else if (Math.hypot(lx - (-dw/2), ly - (dh/2)) < hDist) tfMode = 'bl';
        else if (Math.hypot(lx - (dw/2), ly - (dh/2)) < hDist) tfMode = 'br';
        else if (Math.abs(lx) <= dw/2 && Math.abs(ly) <= dh/2) tfMode = 'move';
        else {
            tfMode = null; 
            isDrawing = false;
        }
    } else if (currentTool === 'crop' && cropState) {
        cropStartMouse = {x: pos.x, y: pos.y};
        cropStartObj = {...cropState};
        const hDist = 24;
        if (Math.hypot(pos.x - cropState.x, pos.y - cropState.y) < hDist) cropMode = 'tl';
        else if (Math.hypot(pos.x - (cropState.x+cropState.w), pos.y - cropState.y) < hDist) cropMode = 'tr';
        else if (Math.hypot(pos.x - cropState.x, pos.y - (cropState.y+cropState.h)) < hDist) cropMode = 'bl';
        else if (Math.hypot(pos.x - (cropState.x+cropState.w), pos.y - (cropState.y+cropState.h)) < hDist) cropMode = 'br';
        else if (pos.x >= cropState.x && pos.x <= cropState.x+cropState.w && pos.y >= cropState.y && pos.y <= cropState.y+cropState.h) cropMode = 'move';
        else { cropMode = null; isDrawing = false; }
    }
});

window.addEventListener('pointermove', e => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    const ws = document.getElementById('workspace');
    
    if (currentTool === 'transform' && tfState && !isDrawing) {
        const dx = pos.x - tfState.cx, dy = pos.y - tfState.cy;
        const cos = Math.cos(-tfState.angle), sin = Math.sin(-tfState.angle);
        const lx = dx*cos - dy*sin, ly = dx*sin + dy*cos;
        const dw = tfState.w*tfState.scale, dh = tfState.h*tfState.scale;
        if (ws) {
            if (Math.hypot(lx-0, ly - (-dh/2-25)) < 13) ws.style.cursor = 'grab';
            else if (Math.hypot(lx - (-dw/2), ly - (-dh/2)) < 8 || Math.hypot(lx - (dw/2), ly - (dh/2)) < 8) ws.style.cursor = 'nwse-resize';
            else if (Math.hypot(lx - (dw/2), ly - (-dh/2)) < 8 || Math.hypot(lx - (-dw/2), ly - (dh/2)) < 8) ws.style.cursor = 'nesw-resize';
            else if (Math.abs(lx) <= dw/2 && Math.abs(ly) <= dh/2) ws.style.cursor = 'move';
            else ws.style.cursor = 'default';
        }
    }

    if (!isDrawing) return;
    
    if (currentTool === 'transform') {
        if (!tfMode || !tfState) return;
        const dx = pos.x - tfStartMouse.x, dy = pos.y - tfStartMouse.y;
        
        if (tfMode === 'move') {
            tfState.cx = tfStartObj.cx + dx;
            tfState.cy = tfStartObj.cy + dy;
        } else if (tfMode === 'rot') {
            const angleStart = Math.atan2(tfStartMouse.y - tfStartObj.cy, tfStartMouse.x - tfStartObj.cx);
            const angleNow = Math.atan2(pos.y - tfStartObj.cy, pos.x - tfStartObj.cx);
            tfState.angle = tfStartObj.angle + (angleNow - angleStart);
        } else {
            const dCenterStart = Math.hypot(tfStartMouse.x - tfStartObj.cx, tfStartMouse.y - tfStartObj.cy);
            const dCenterNow = Math.hypot(pos.x - tfStartObj.cx, pos.y - tfStartObj.cy);
            if (dCenterStart > 0) {
                const ratio = dCenterNow / dCenterStart;
                tfState.scale = Math.max(0.1, tfStartObj.scale * ratio);
            }
        }
        updateDisplay();
    } else if (currentTool === 'crop' && cropMode && cropState) {
        const dx = pos.x - cropStartMouse.x, dy = pos.y - cropStartMouse.y;
        if (cropMode === 'move') {
            cropState.x = cropStartObj.x + dx;
            cropState.y = cropStartObj.y + dy;
        } else if (cropMode === 'tl') {
            cropState.x = cropStartObj.x + dx; cropState.w = cropStartObj.w - dx;
            cropState.y = cropStartObj.y + dy; cropState.h = cropStartObj.h - dy;
        } else if (cropMode === 'tr') {
            cropState.w = cropStartObj.w + dx;
            cropState.y = cropStartObj.y + dy; cropState.h = cropStartObj.h - dy;
        } else if (cropMode === 'bl') {
            cropState.x = cropStartObj.x + dx; cropState.w = cropStartObj.w - dx;
            cropState.h = cropStartObj.h + dy;
        } else if (cropMode === 'br') {
            cropState.w = cropStartObj.w + dx;
            cropState.h = cropStartObj.h + dy;
        }
        // Prevent negative width/height
        if (cropState.w < 20) { cropState.w = 20; if(cropMode==='tl'||cropMode==='bl') cropState.x = cropStartObj.x + cropStartObj.w - 20; }
        if (cropState.h < 20) { cropState.h = 20; if(cropMode==='tl'||cropMode==='tr') cropState.y = cropStartObj.y + cropStartObj.h - 20; }
        updateTransformOverlay();
    } else {
        const ctx = getCharData(activeChar).sourceCanvas.getContext('2d');
        const bsInput = document.getElementById('brush-size');
        const bs = bsInput ? parseInt(bsInput.value, 10) : (currentTool === 'erase' ? 24 : 18);

        [ctx, mainCtx].forEach(c => {
            c.strokeStyle = currentTool === 'erase' ? 'white' : 'black';
            c.lineWidth = bs; c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath(); c.moveTo(lastX, lastY); c.lineTo(pos.x, pos.y); c.stroke();
        });
        lastX = pos.x; lastY = pos.y;
    }
});

window.addEventListener('pointerup', () => {
    if (isDrawing) {
        isDrawing = false;
        if (currentTool === 'transform') {
            tfMode = null; tfStartMouse = null; tfStartObj = null;
            // DO NOT bake here! The user can still drag again. Wait until tool switch.
        } else {
            updateDisplay(); saveState();
        }
    }
});

// ─── Crop ──────────────────────────────────────────────────────────────
document.getElementById('btn-autocrop').onclick = () => {
    if (currentTool === 'crop') setTool('draw');
    else setTool('crop');
};

document.getElementById('btn-apply-crop').onclick = () => {
    if (!cropState) return;
    const data = getCharData(activeChar);
    const src = data.sourceCanvas.getContext('2d').getImageData(cropState.x, cropState.y, cropState.w, cropState.h);
    const tmp = document.createElement('canvas'); tmp.width=cropState.w; tmp.height=cropState.h;
    tmp.getContext('2d').putImageData(src,0,0);
    const sc = Math.min((512-50)/cropState.w, (512-50)/cropState.h, 1);
    const dw = Math.round(cropState.w*sc), dh = Math.round(cropState.h*sc);
    const ctx = data.sourceCanvas.getContext('2d');
    ctx.fillStyle='white'; ctx.fillRect(0,0,512,512);
    ctx.drawImage(tmp, Math.floor((512-dw)/2), Math.floor((512-dh)/2), dw, dh);
    
    setTool('draw');
    updateDisplay(); saveState();
};
document.getElementById('btn-clear').onclick = () => {
    if (currentTool === 'transform') setTool('draw');
    getCharData(activeChar).sourceCanvas.getContext('2d').fillStyle='white';
    getCharData(activeChar).sourceCanvas.getContext('2d').fillRect(0,0,512,512);
    updateDisplay(); saveState();
};
document.getElementById('btn-upload').onclick = () => document.getElementById('file-upload').click();
document.getElementById('file-upload').onchange = e => {
    const f=e.target.files[0]; if(!f) return;
    if (currentTool === 'transform') setTool('draw');
    const u=URL.createObjectURL(f), img=new Image();
    img.onload = () => {
        const ctx=getCharData(activeChar).sourceCanvas.getContext('2d'); ctx.fillStyle='white'; ctx.fillRect(0,0,512,512);
        const s=Math.min(512/img.width,512/img.height);
        ctx.drawImage(img,(512-img.width*s)/2,(512-img.height*s)/2,img.width*s,img.height*s);
        URL.revokeObjectURL(u); e.target.value=''; updateDisplay(); saveState();
    }; img.src=u;
};
const video = document.getElementById('camera-video'), btnCap = document.getElementById('btn-capture');
let stream = null;
document.getElementById('btn-camera').onclick = async () => {
    if (currentTool === 'transform') setTool('draw');
    mainCanvas.hidden=true; transformCanvas.hidden=true; guideCanvas.hidden=true;
    video.hidden=false; btnCap.hidden=false;
    try { stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}); video.srcObject=stream; } 
    catch(e) { alert('Camera denied'); mainCanvas.hidden=false; transformCanvas.hidden=false; guideCanvas.hidden=false; video.hidden=true; btnCap.hidden=true; }
};
btnCap.onclick = () => {
    if(!stream) return;
    const ctx = getCharData(activeChar).sourceCanvas.getContext('2d');
    const vw=video.videoWidth||512, vh=video.videoHeight||512, sz=Math.min(vw,vh);
    ctx.fillStyle='white'; ctx.fillRect(0,0,512,512);
    ctx.drawImage(video, (vw-sz)/2, (vh-sz)/2, sz, sz, 0,0,512,512);
    stream.getTracks().forEach(t=>t.stop()); stream=null; video.srcObject=null;
    video.hidden=true; btnCap.hidden=true; mainCanvas.hidden=false; transformCanvas.hidden=false; guideCanvas.hidden=false;
    updateDisplay(); saveState();
};

// ─── Undo / Redo ────────────────────────────────────────────────────────────
document.getElementById('btn-undo').onclick = undo;
document.getElementById('btn-redo').onclick = redo;

window.addEventListener('keydown', (e) => {
    // Only intercept if we're not typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Cmd or Ctrl
    if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        }
    }
});

// ─── Kerning Group Editor ───────────────────────────────────────────────────
let activeKernIndex = -1;

function enterKernEditMode(index) {
    activeKernIndex = index;
    const kg = kerningGroups[index];
    
    // Show edit panel
    const panel = document.getElementById('kern-edit-panel');
    panel.classList.remove('hidden');
    document.getElementById('kern-edit-label').textContent = 'Group ' + (index + 1);
    document.getElementById('kern-left').value = kg.left;
    document.getElementById('kern-right').value = kg.right;
    document.getElementById('kern-value').value = kg.value;
    
    // Render the kern preview on the main canvas
    renderKernPreview();
    renderKerningGroups();
}

function exitKernEditMode() {
    if (activeKernIndex < 0) return;
    activeKernIndex = -1;
    document.getElementById('kern-edit-panel').classList.add('hidden');
    
    // Restore the glyph editor view
    updateDisplay();
    renderKerningGroups();
}

function renderKernPreview() {
    if (activeKernIndex < 0) return;
    const kg = kerningGroups[activeKernIndex];
    if (!kg) return;
    
    const leftChars = kg.left.split('');
    const rightChars = kg.right.split('');
    const val = kg.value || 0;
    
    // Canvas setup
    const W = 512, H = 512;
    mainCtx.fillStyle = 'white';
    mainCtx.fillRect(0, 0, W, H);
    
    // Calculate glyph drawing scale (fit glyph into ~220px wide)
    const glyphScale = 220 / W;
    const glyphH = H * glyphScale;
    const glyphW = W * glyphScale;
    
    // Kern boundary = center of canvas (origin point)
    const originX = Math.round(W / 2);
    
    // Kern shift in pixels (val is in em units, 1em ≈ canvas width conceptually)
    const kernPx = Math.round(val * glyphW);
    
    // ── Baseline guide (horizontal) ──
    const baselineY = Math.round(H * 0.72); // approximate baseline position
    mainCtx.strokeStyle = '#ccc';
    mainCtx.lineWidth = 1;
    mainCtx.beginPath();
    mainCtx.moveTo(0, baselineY);
    mainCtx.lineTo(W, baselineY);
    mainCtx.stroke();
    
    // ── Vertical guide lines at kern boundary ──
    // Left edge (origin)
    mainCtx.strokeStyle = '#8b5cf6'; // purple, like Glyphr Studio
    mainCtx.lineWidth = 1;
    mainCtx.setLineDash([]);
    mainCtx.beginPath();
    mainCtx.moveTo(originX, 0);
    mainCtx.lineTo(originX, H);
    mainCtx.stroke();
    
    // Right edge (shifted by kern value)
    mainCtx.strokeStyle = '#8b5cf6';
    mainCtx.setLineDash([4, 4]);
    mainCtx.beginPath();
    mainCtx.moveTo(originX + kernPx, 0);
    mainCtx.lineTo(originX + kernPx, H);
    mainCtx.stroke();
    mainCtx.setLineDash([]);
    
    // ── Kern indicator bar at the bottom ──
    const barY = baselineY + 15;
    const barH = Math.max(4, Math.abs(kernPx) > 0 ? 6 : 2);
    if (kernPx !== 0) {
        mainCtx.fillStyle = '#a78bfa'; // purple bar
        const barX = Math.min(originX, originX + kernPx);
        const barW = Math.abs(kernPx);
        mainCtx.fillRect(barX, barY, barW, barH);
    }
    
    // ── Draw left group glyphs (Glyphr style: stacked with 1/n opacity) ──
    const leftAlpha = Math.max(0.25, 1 / leftChars.length);
    const leftStartX = originX - glyphW; // left group ends at origin
    leftChars.forEach((ch) => {
        const data = chars[ch];
        if (!data) return;
        mainCtx.globalAlpha = leftAlpha;
        if (data.processedImageData) {
            filterCtx.clearRect(0, 0, 512, 512);
            filterCtx.putImageData(data.processedImageData, 0, 0);
            mainCtx.drawImage(filterCvs, leftStartX, baselineY - glyphH + 20, glyphW, glyphH);
        } else {
            mainCtx.drawImage(data.sourceCanvas, leftStartX, baselineY - glyphH + 20, glyphW, glyphH);
        }
    });
    
    // ── Draw right group glyphs (shifted by kern value) ──
    const rightAlpha = Math.max(0.25, 1 / rightChars.length);
    const rightStartX = originX + kernPx; // right group starts at origin + kern
    rightChars.forEach((ch) => {
        const data = chars[ch];
        if (!data) return;
        mainCtx.globalAlpha = rightAlpha;
        if (data.processedImageData) {
            filterCtx.clearRect(0, 0, 512, 512);
            filterCtx.putImageData(data.processedImageData, 0, 0);
            mainCtx.drawImage(filterCvs, rightStartX, baselineY - glyphH + 20, glyphW, glyphH);
        } else {
            mainCtx.drawImage(data.sourceCanvas, rightStartX, baselineY - glyphH + 20, glyphW, glyphH);
        }
    });
    
    mainCtx.globalAlpha = 1.0;
    
    // ── Labels ──
    // Value label (centered between the two guide lines)
    mainCtx.fillStyle = '#a78bfa';
    mainCtx.font = 'bold 13px monospace';
    mainCtx.textAlign = 'center';
    mainCtx.fillText('kern: ' + val.toFixed(2) + ' em', originX + kernPx / 2, barY + barH + 18);
    
    // Group labels at top
    mainCtx.font = '10px sans-serif';
    mainCtx.fillStyle = '#555';
    mainCtx.fillText(kg.left, leftStartX + glyphW / 2, 18);
    mainCtx.fillText(kg.right, rightStartX + glyphW / 2, 18);
    mainCtx.textAlign = 'start';
    
    // Hide transform overlay during kern preview
    transformCtx.clearRect(0, 0, 1536, 1536);
}

function renderKerningGroups() {
    const list = document.getElementById('kerning-list');
    list.innerHTML = '';
    
    kerningGroups.forEach((kg, i) => {
        const div = document.createElement('div');
        const isActive = (i === activeKernIndex);
        div.className = 'flex items-center justify-between px-3 py-2 border text-xs cursor-pointer transition-colors ' +
            (isActive 
                ? 'bg-white/15 border-green-500/50 text-white' 
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10');
        
        const label = document.createElement('span');
        label.className = 'font-mono truncate';
        label.textContent = kg.left + ' ↔ ' + kg.right;
        
        const valSpan = document.createElement('span');
        valSpan.className = 'text-green-400 text-[10px] ml-2 whitespace-nowrap';
        valSpan.textContent = (kg.value || 0).toFixed(2) + 'em';
        
        div.appendChild(label);
        div.appendChild(valSpan);
        
        div.onclick = () => enterKernEditMode(i);
        list.appendChild(div);
    });
}

// "New Kern Group" button
document.getElementById('btn-new-kern').onclick = () => {
    kerningGroups.push({ left: 'A', right: 'V', value: -0.05 });
    enterKernEditMode(kerningGroups.length - 1);
    updateLivePreview();
};

// "Delete Kern Group" button
document.getElementById('btn-delete-kern').onclick = () => {
    if (activeKernIndex < 0) return;
    kerningGroups.splice(activeKernIndex, 1);
    exitKernEditMode();
    updateLivePreview();
};

// Value up/down arrows
document.getElementById('kern-val-up').onclick = () => {
    if (activeKernIndex < 0) return;
    const input = document.getElementById('kern-value');
    input.value = (parseFloat(input.value) + 0.01).toFixed(2);
    kerningGroups[activeKernIndex].value = parseFloat(input.value);
    renderKernPreview();
    updateLivePreview();
};
document.getElementById('kern-val-down').onclick = () => {
    if (activeKernIndex < 0) return;
    const input = document.getElementById('kern-value');
    input.value = (parseFloat(input.value) - 0.01).toFixed(2);
    kerningGroups[activeKernIndex].value = parseFloat(input.value);
    renderKernPreview();
    updateLivePreview();
};

// Live update when typing in the edit inputs
document.getElementById('kern-value').addEventListener('input', (e) => {
    if (activeKernIndex < 0) return;
    kerningGroups[activeKernIndex].value = parseFloat(e.target.value) || 0;
    renderKernPreview();
    renderKerningGroups();
    updateLivePreview();
});
document.getElementById('kern-left').addEventListener('input', (e) => {
    if (activeKernIndex < 0) return;
    kerningGroups[activeKernIndex].left = e.target.value;
    renderKernPreview();
    renderKerningGroups();
    updateLivePreview();
});
document.getElementById('kern-right').addEventListener('input', (e) => {
    if (activeKernIndex < 0) return;
    kerningGroups[activeKernIndex].right = e.target.value;
    renderKernPreview();
    renderKerningGroups();
    updateLivePreview();
});

// ─── Fast Raster Live Preview ───────────────────────────────────────────────
const previewInput = document.getElementById('preview-input'), previewRender = document.getElementById('preview-render');

function updateLivePreview() {
    const text = previewInput.value; 
    previewRender.innerHTML = '';
    
    // Calculate global font dimensions to properly position base lines
    const asc = GUIDES.ascender.y, dsc = GUIDES.descender.y;
    // For rendering, we can just treat the 512x512 canvas as an image,
    // and rely on vertical-align and margin for layout.
    // CSS trick to align baselines: images are inline-block.
    
    for (let i=0; i<text.length; i++) {
        const c = text[i];
        let kv = 0; if (i<text.length-1) { const kern=kerningGroups.find(k=>k.left.includes(c)&&k.right.includes(text[i+1])); if(kern)kv=kern.value; }
        
        if (c === ' ') {
            const sp=document.createElement('span'); sp.style.width='0.3em'; sp.style.display='inline-block';
            if(kv!==0) sp.style.marginRight = kv+'em';
            previewRender.appendChild(sp);
            continue;
        }
        
        const data = chars[c];
        if (data && data.processedImageData && data.populated) {
            const tempC = document.createElement('canvas'); tempC.width=512; tempC.height=512;
            tempC.getContext('2d').putImageData(data.processedImageData,0,0);
            
            // To make the background completely transparent in the preview instead of white/black:
            // The processedImageData already drops alpha where appropriate. But wait, applyFilters sets white to alpha=0.
            // So it IS transparent! Let's display it.
            tempC.className = "inline-block h-[1.5em] w-auto object-contain filter invert";
            tempC.style.verticalAlign = "baseline"; // Needs manual CSS fine-tuning
            
            if(kv!==0) tempC.style.marginRight = (kv*100)+'%';
            
            previewRender.appendChild(tempC);
        } else {
            const sp = document.createElement('span'); sp.style.display='inline-block'; sp.textContent = c;
            sp.className = "text-white text-[1.5em] font-mono leading-none";
            if(kv!==0) sp.style.marginRight = kv+'em';
            previewRender.appendChild(sp);
        }
    }
}
previewInput.addEventListener('input', updateLivePreview);

// ─── Save / Load Project ────────────────────────────────────────────────────
document.getElementById('btn-save-project').onclick = () => {
    const projectData = {
        chars: {},
        kerningGroups: kerningGroups,
        filename: document.getElementById('export-filename').value
    };
    
    for (const [ch, data] of Object.entries(chars)) {
        if (data.populated) {
            projectData.chars[ch] = {
                imageDataURL: data.sourceCanvas.toDataURL('image/png'),
                bgTolerance: data.bgTolerance,
                ditherLevel: data.ditherLevel,
                populated: true
            };
        }
    }
    
    const blob = new Blob([JSON.stringify(projectData)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (projectData.filename || 'Ngefont') + '.ngefont';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

document.getElementById('btn-load-project').onclick = () => document.getElementById('file-load-project').click();
document.getElementById('file-load-project').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.filename) document.getElementById('export-filename').value = data.filename;
            
            kerningGroups = data.kerningGroups || [];
            renderKerningGroups();
            
            for (const ch of charsList) {
                if (ch === ' ') continue;
                const charObj = getCharData(ch);
                
                if (data.chars && data.chars[ch]) {
                    const cData = data.chars[ch];
                    charObj.bgTolerance = cData.bgTolerance || 20;
                    charObj.ditherLevel = cData.ditherLevel || 0;
                    charObj.populated = cData.populated;
                    
                    const img = new Image();
                    await new Promise(r => { img.onload = r; img.src = cData.imageDataURL; });
                    const ctx = charObj.sourceCanvas.getContext('2d');
                    ctx.clearRect(0, 0, 512, 512);
                    ctx.drawImage(img, 0, 0);
                    
                    charObj.history = [ctx.getImageData(0,0,512,512)];
                    charObj.historyIndex = 0;
                    charObj.processedImageData = applyFilters(charObj.history[0], charObj.bgTolerance, charObj.ditherLevel);
                } else {
                    charObj.populated = false;
                    charObj.history = [charObj.sourceCanvas.getContext('2d').getImageData(0,0,512,512)];
                    charObj.historyIndex = 0;
                    charObj.processedImageData = null;
                }
                updateCharThumbnail(ch, chars[ch].sourceCanvas);
            }
            updatePopulatedStats();
            updateDisplay();
            updateLivePreview();
            alert('Project loaded successfully!');
        } catch(err) {
            alert('Failed to load project: ' + err.message);
        }
        e.target.value = ''; // reset
    };
    reader.readAsText(file);
};

// ─── Export ─────────────────────────────────────────────────────────────────
document.getElementById('btn-export').onclick = () => {
    if (currentTool === 'transform') setTool('draw'); // Bake before export
    const btn = document.getElementById('btn-export'); 
    btn.innerText = 'Vectorizing & Exporting...'; 
    btn.disabled = true;
    
    setTimeout(async () => {
        try {
            const font = generateFontObj();
            const fmt = document.getElementById('export-format').value;
            const fname = (document.getElementById('export-filename').value || 'Ngefont').trim();
            
            // Generate base TTF for WOFF/WOFF2 conversions
            const baseFormat = (fmt === 'otf') ? 'otf' : 'ttf';
            let arrayBuffer = font.export({ format: baseFormat });
            let mimeType = 'font/opentype';
            
            if (fmt === 'woff') {
                try {
                    // Try native WOFF export first
                    arrayBuffer = font.export({ format: 'woff' });
                    mimeType = 'font/woff';
                } catch(err) {
                    console.warn('Native WOFF export failed, trying external compression or falling back to TTF', err);
                    alert('Export WOFF mungkin belum sepenuhnya didukung oleh mesin ini. Hasil mungkin berupa TTF.');
                }
            } else if (fmt === 'woff2') {
                btn.innerText = 'Compressing WOFF2...';
                if (!window.Module || !window.Module.compress) {
                    window.Module = {};
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://unpkg.com/wawoff2@2.0.1/build/compress_binding.js';
                        script.onload = () => {
                            if (window.Module.calledRun) resolve();
                            else window.Module.onRuntimeInitialized = resolve;
                        };
                        script.onerror = () => reject(new Error('Gagal memuat modul kompresi WOFF2. Pastikan koneksi internet aktif.'));
                        document.head.appendChild(script);
                    });
                }
                const input = new Uint8Array(arrayBuffer);
                arrayBuffer = window.Module.compress(input);
                mimeType = 'font/woff2';
            }
            
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); 
            a.href = url; 
            a.download = fname + '.' + fmt;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            if (kerningGroups.length > 0) {
                setTimeout(() => {
                    const ku = URL.createObjectURL(new Blob([JSON.stringify(kerningGroups, null, 2)], {type: 'application/json'}));
                    const ak = document.createElement('a'); 
                    ak.href = ku; 
                    ak.download = fname + '-Kerning.json'; 
                    ak.click();
                    setTimeout(() => URL.revokeObjectURL(ku), 1000);
                }, 800);
            }
        } catch(e) { 
            console.error(e); 
            alert('Error: ' + e.message); 
        }
        btn.innerText = 'Export Font'; 
        btn.disabled = false;
    }, 50);
};

// ─── Bitmap-to-Vector: Rectangle Run-Length Encoding ────────────────────────
// Converts bitmap glyph to vector contours by downsampling, run-length
// encoding rows, merging vertically, and outputting rectangle contours
// with correct CCW winding for CFF/OTF fonts.
function buildVectorContours(pid, scale, asc, xoff) {
    const contours = [];
    const srcW = pid.width, srcH = pid.height;
    
    // Downsample 512→128 (factor 4) for good resolution with manageable rect count
    const ds = 4;
    const gw = Math.ceil(srcW / ds), gh = Math.ceil(srcH / ds);
    const grid = new Uint8Array(gw * gh);
    
    for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
            let filled = 0, total = 0;
            for (let dy = 0; dy < ds && gy*ds+dy < srcH; dy++) {
                for (let dx = 0; dx < ds && gx*ds+dx < srcW; dx++) {
                    total++;
                    if (pid.data[((gy*ds+dy)*srcW + (gx*ds+dx))*4 + 3] > 128) filled++;
                }
            }
            grid[gy * gw + gx] = (filled > total * 0.3) ? 1 : 0;
        }
    }
    
    // Run-length encode rows & merge rectangles vertically
    const used = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
        let gx = 0;
        while (gx < gw) {
            if (grid[gy * gw + gx] === 1 && !used[gy * gw + gx]) {
                // Find end of horizontal run
                let gx2 = gx;
                while (gx2 < gw && grid[gy * gw + gx2] === 1 && !used[gy * gw + gx2]) gx2++;
                
                // Extend downward: check if exact same run [gx..gx2) exists below
                let gy2 = gy + 1;
                while (gy2 < gh) {
                    let ok = true;
                    for (let xx = gx; xx < gx2; xx++) {
                        if (grid[gy2 * gw + xx] !== 1 || used[gy2 * gw + xx]) { ok = false; break; }
                    }
                    if (!ok) break;
                    gy2++;
                }
                
                // Mark all cells in this merged rectangle as used
                for (let yy = gy; yy < gy2; yy++)
                    for (let xx = gx; xx < gx2; xx++)
                        used[yy * gw + xx] = 1;
                
                // Convert grid coords → pixel coords → font coords
                const px1 = gx * ds, px2 = gx2 * ds;
                const py1 = gy * ds, py2 = gy2 * ds;
                const fx1 = Math.round((px1 + xoff) * scale);
                const fx2 = Math.round((px2 + xoff) * scale);
                const fy1 = Math.round(asc - py1 * scale);   // top (higher Y in font)
                const fy2 = Math.round(asc - py2 * scale);   // bottom (lower Y in font)
                
                // CCW winding for CFF: top-left → bottom-left → bottom-right → top-right
                contours.push([
                    { type: 'M', x: fx1, y: fy1 },
                    { type: 'L', x: fx1, y: fy2 },
                    { type: 'L', x: fx2, y: fy2 },
                    { type: 'L', x: fx2, y: fy1 },
                ]);
                
                gx = gx2;
            } else {
                gx++;
            }
        }
    }
    
    return contours;
}

function generateFontObj() {
    if (!window._FontFlux) throw new Error('FontFlux belum dimuat. Pastikan koneksi internet aktif dan refresh halaman.');
    const FontFlux = window._FontFlux;
    const upm=1000, asc=800, dsc=-200, scale=upm/512;
    const familyName = (document.getElementById('export-filename').value || 'Ngefont Custom').trim();
    
    const font = FontFlux.create({
        family: familyName,
        unitsPerEm: upm,
        ascender: asc,
        descender: dsc,
    });
    font.info.styleName = 'Regular';
    
    // .notdef glyph
    font.addGlyph({
        name: '.notdef', unicode: 0, advanceWidth: Math.round(512*scale),
        contours: [[
            { type: 'M', x: Math.round(50*scale), y: Math.round(asc - 50*scale) },
            { type: 'L', x: Math.round(462*scale), y: Math.round(asc - 50*scale) },
            { type: 'L', x: Math.round(462*scale), y: Math.round(asc - 462*scale) },
            { type: 'L', x: Math.round(50*scale), y: Math.round(asc - 462*scale) }
        ]]
    });
    
    // space glyph
    font.addGlyph({ name: 'space', unicode: 32, advanceWidth: 300, contours: [] });
    
    for (const [ch, data] of Object.entries(chars)) {
        if (ch===' ' || !data.processedImageData) continue;
        const px = data.processedImageData.data, W=512;
        let minX=W, maxX=-1;
        for (let y=0;y<512;y++) for(let x=0;x<W;x++) if (px[(y*W+x)*4+3]>128) { if(x<minX)minX=x; if(x>maxX)maxX=x; }
        let xoff=0, aw=Math.round(512*scale);
        if (maxX>=minX) { xoff=-minX+25; aw=Math.round((maxX-minX+50)*scale); }
        
        const contours = buildVectorContours(data.processedImageData, scale, asc, xoff);
        font.addGlyph({
            name: ch, unicode: ch.charCodeAt(0), advanceWidth: aw, contours
        });
    }
    
    // Embed kerning pairs into the font if available
    if (kerningGroups.length > 0 && typeof font.addKerning === 'function') {
        for (const kg of kerningGroups) {
            try {
                // Expand groups into individual pairs
                const leftChars = kg.left.split('');
                const rightChars = kg.right.split('');
                for (const l of leftChars) {
                    for (const r of rightChars) {
                        font.addKerning({ left: l, right: r, value: Math.round(kg.value * upm) });
                    }
                }
            } catch(e) { console.warn('Kerning pair skipped:', e.message); }
        }
    }
    
    return font;
}

// ─── Init ───────────────────────────────────────────────────────────────────
selectChar('A');
updatePopulatedStats();

// ─── Dynamic Title Animation ────────────────────────────────────────────────
const dynamicTitle = document.getElementById('dynamic-title');
if (dynamicTitle) {
    const text = dynamicTitle.textContent;
    dynamicTitle.innerHTML = '';
    const spans = [];
    
    // Split into spans
    for (const char of text) {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.display = 'inline-block';
        span.style.transition = 'all 0.2s ease';
        dynamicTitle.appendChild(span);
        spans.push({
            el: span,
            char: char
        });
    }

    const fonts = ['sans-serif', 'serif', 'monospace', 'cursive', 'system-ui'];
    const weights = ['300', '400', '600', '800', '900'];
    const transforms = ['uppercase', 'lowercase'];
    const styles = ['normal', 'italic'];

    function animateTitle() {
        spans.forEach(item => {
            // Random chance to change this letter on this tick (e.g., 30% chance)
            if (Math.random() < 0.3) {
                const f = fonts[Math.floor(Math.random() * fonts.length)];
                const w = weights[Math.floor(Math.random() * weights.length)];
                const t = transforms[Math.floor(Math.random() * transforms.length)];
                const s = styles[Math.floor(Math.random() * styles.length)];
                
                item.el.style.fontFamily = f;
                item.el.style.fontWeight = w;
                item.el.style.textTransform = t;
                item.el.style.fontStyle = s;
                
                // Keep the text color white but maybe slight opacity variation
                item.el.style.opacity = (0.7 + Math.random() * 0.3).toString();
            }
        });
    }

    setInterval(animateTitle, 300);
}
