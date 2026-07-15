// ========== UBAH DENGAN KREDENSIAL SUPABASE ANDA ==========
const SUPABASE_URL = 'https://vmumjgmjiimhshirvfdt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_K9-ejUbEbzWlw5o2EhdwcQ_3_8seFrP';

// ─── Random Sentences (completely unrelated to fonts) ────────────────────────
const sentences = [
    "Kucing tetangga naik ke atap membawa 3 ekor ikan tongkol (ASLI)!",
    "Alien mendarat di sawah Pak Budi, lalu panen 500kg gabah.",
    "Nenek belajar skateboard di halaman rumah, skor: 99/100!",
    "17 astronot memasak rendang di luar angkasa, hasilnya? LUAR BIASA.",
    "Bebek menyeberang jalan tol jam 3 pagi — tidak ada yang protes.",
    "Gunung berapi mengeluarkan es krim rasa durian: fenomena abad ke-21.",
    "Robot kecil bernama BOB-7 memenangkan lomba makan kerupuk se-RT.",
    "Seorang kakek berusia 103 tahun lulus ujian pilot helikopter!",
    "Di tahun 2099, semua kucing bisa bicara — tapi mereka memilih diam.",
    "Paus biru bernyanyi karaoke di Selat Malaka, lagu dangdut!",
    "Harga cabai turun 200%!! — ini bukan berita bohong (mungkin).",
    "Planet Jupiter melarang penggunaan sendok garpu — alasannya rahasia.",
    "Kelinci Arctic berhasil membobol brankas berisi 1 juta wortel.",
    "5 pohon kelapa berjalan ke supermarket untuk membeli susu sapi.",
    "Komputer kuno dari tahun 1987 tiba-tiba mengirim email ke NASA.",
    "Seekor gurita memenangkan turnamen catur internasional — 8 langkah!",
    "BREAKING: hujan bakso di Bandung selama 47 menit tanpa henti.",
    "Profesor ilmu roket bingung cara membuka toples selai kacang.",
    "Sekelompok penguin membuka restoran di gurun Sahara — selalu ramai!",
    "100 semut mengangkat lemari es setinggi 2 meter — wow!",
    "Kakaktua bernama Ciko bisa menghitung perkalian sampai angka 99.",
    "Dinosaurus ternyata masih hidup — di balik sofa rumah Anda.",
    "Seorang pria memecahkan rekor dunia: makan 73 roti bakar dalam 1 jam.",
    "Satelit menangkap gambar awan berbentuk nasi goreng — viral!",
    "Monyet luar angkasa bernama Zeno berhasil mendarat di Pluto.",
    "Stasiun kereta bawah laut Jakarta-Sydney dibuka tahun 2077!",
    "SIARAN PERS: kepiting raksasa ditemukan di kolam renang hotel bintang 5.",
    "3 kambing menulis novel sepanjang 800 halaman — best seller!",
    "Petani wortel di Mars panen 12 ton wortel ungu organik.",
    "Ikan paus membuat podcast tentang kehidupan di dasar laut Pasifik."
];

function getRandomSentence() {
    return sentences[Math.floor(Math.random() * sentences.length)];
}

// ─── DOM References ──────────────────────────────────────────────────────────
const previewText = document.getElementById('preview-text');
const sizeSlider = document.getElementById('size-slider');
const sizeLabel = document.getElementById('size-label');
const btnRandomize = document.getElementById('btn-randomize');
const btnPause = document.getElementById('btn-pause');
const pauseIcon = document.getElementById('pause-icon');
const pauseLabel = document.getElementById('pause-label');
const fontListContainer = document.getElementById('font-list');
const loadingIndicator = document.getElementById('loading-indicator');

// ─── State ───────────────────────────────────────────────────────────────────
let isCustomText = false;
let isPaused = false;

// Constant: desired scroll speed in pixels per second (consistent at all sizes)
const SCROLL_SPEED_PX_PER_SEC = 60;

// Initial text
previewText.value = getRandomSentence();

// Set responsive initial size based on viewport
const isMobile = window.innerWidth < 640;
if (isMobile) {
    sizeSlider.value = 36;
    sizeLabel.textContent = '36px';
} else {
    sizeSlider.value = 48;
    sizeLabel.textContent = '48px';
}

// ─── Dynamic Speed Calculation ───────────────────────────────────────────────
// Measures actual track width and sets animation-duration so that
// the speed in pixels-per-second stays constant regardless of font size.
function recalcAllSpeeds() {
    document.querySelectorAll('.font-preview-item .marquee-track').forEach(track => {
        const trackWidth = track.scrollWidth;
        if (trackWidth > 0) {
            // One iteration moves -50% of total width
            const distancePerIteration = trackWidth / 2;
            const duration = distancePerIteration / SCROLL_SPEED_PX_PER_SEC;
            track.style.animationDuration = `${duration}s`;
        }
    });
}

// ─── Size Slider ─────────────────────────────────────────────────────────────
sizeSlider.addEventListener('input', (e) => {
    sizeLabel.textContent = `${e.target.value}px`;
    document.querySelectorAll('.font-preview-item .marquee-container').forEach(el => {
        el.style.fontSize = `${e.target.value}px`;
    });
    // Recalculate speed after font size change (track width changes)
    requestAnimationFrame(() => recalcAllSpeeds());
});

// ─── Pause / Play Toggle ─────────────────────────────────────────────────────
btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseIcon.textContent = isPaused ? 'play_arrow' : 'pause';
    if (pauseLabel) pauseLabel.textContent = isPaused ? 'Play' : 'Pause';
    
    document.querySelectorAll('.font-preview-item .marquee-track').forEach(track => {
        if (isPaused) {
            track.classList.add('paused');
        } else {
            track.classList.remove('paused');
        }
    });
});

// ─── Random Button ───────────────────────────────────────────────────────────
btnRandomize.addEventListener('click', () => {
    isCustomText = false;
    previewText.value = getRandomSentence();
    rebuildAllMarquees();
    // Reset loop counters
    resetLoopCounters();
});

// ─── Custom Text Input ──────────────────────────────────────────────────────
// Running text keeps running even when user types custom text
previewText.addEventListener('input', () => {
    isCustomText = previewText.value.trim().length > 0;
    rebuildAllMarquees();
});

// ─── 3-Loop Rotation for Random Text ─────────────────────────────────────────
// Each marquee track counts its animation iterations.
// After 3 full loops, if in random mode, swap to a new sentence.
const loopCounters = new Map(); // track element -> iteration count

function resetLoopCounters() {
    loopCounters.clear();
}

function onMarqueeIteration(e) {
    const track = e.target;
    if (!track.classList.contains('marquee-track')) return;
    
    // Only rotate text in random (non-custom) mode
    if (isCustomText) return;
    
    const count = (loopCounters.get(track) || 0) + 1;
    loopCounters.set(track, count);
    
    if (count >= 3) {
        // Swap to a new random sentence for ALL tracks
        loopCounters.clear();
        const newSentence = getRandomSentence();
        previewText.value = newSentence;
        rebuildAllMarquees();
    }
}

// ─── Marquee Builder ─────────────────────────────────────────────────────────
function buildMarqueeHTML(text) {
    const segment = `<span class="marquee-segment">${escapeHTML(text)}</span>`;
    // 20 copies ensures seamless coverage at any font size
    const repeated = segment.repeat(20);
    return `<div class="marquee-track${isPaused ? ' paused' : ''}">${repeated}</div>`;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function rebuildAllMarquees() {
    const text = previewText.value || getRandomSentence();
    document.querySelectorAll('.font-preview-item .marquee-container').forEach(container => {
        // Remove old track (and its event listener)
        const oldTrack = container.querySelector('.marquee-track');
        if (oldTrack) {
            oldTrack.removeEventListener('animationiteration', onMarqueeIteration);
            oldTrack.remove();
        }
        
        // Build new track
        container.insertAdjacentHTML('beforeend', buildMarqueeHTML(text));
        
        // Attach iteration listener for 3-loop rotation
        const newTrack = container.querySelector('.marquee-track');
        if (newTrack) {
            newTrack.addEventListener('animationiteration', onMarqueeIteration);
        }
    });
    
    // Recalculate speeds for the new content
    requestAnimationFrame(() => recalcAllSpeeds());
}

// ─── Supabase Fetching ───────────────────────────────────────────────────────
async function loadFonts() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        loadingIndicator.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-red-500 mb-4">error</span>
            <p class="text-[10px] uppercase tracking-[0.2em] text-red-400">Supabase URL & Key belum diisi di src/preview.js</p>
        `;
        return;
    }

    try {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const { data: fonts, error } = await supabase
            .from('font_previews')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        
        loadingIndicator.classList.add('hidden');
        
        if (!fonts || fonts.length === 0) {
            fontListContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-32 text-gray-500">
                    <span class="material-symbols-outlined text-[32px] mb-2 opacity-50">sentiment_dissatisfied</span>
                    <p class="text-[10px] uppercase tracking-[0.2em]">Belum ada font yang diupload.</p>
                </div>
            `;
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const highlightId = urlParams.get('id');

        // Create @font-face rules
        const styleEl = document.createElement('style');
        let cssRules = '';
        const currentSize = sizeSlider.value;
        
        fonts.forEach((font, i) => {
            const fontName = `Font_${String(font.id).replace(/-/g, '_')}`;
            cssRules += `
                @font-face {
                    font-family: '${fontName}';
                    src: url('${font.font_url}') format('opentype');
                    font-display: swap;
                }
            `;
            
            const isHighlighted = font.id === highlightId;
            const date = new Date(font.created_at).toLocaleDateString();
            const authorStr = font.author_name && font.author_name !== 'Unknown' 
                ? `<span class="font-author">by ${font.author_name}</span>` 
                : '';
            
            const displayText = previewText.value || getRandomSentence();
            
            const item = document.createElement('div');
            item.className = 'font-preview-item';
            if (isHighlighted) item.style.backgroundColor = 'rgba(59,130,246,0.05)';
            
            item.innerHTML = `
                <div class="preview-meta">
                    <div class="meta-left">
                        <span class="font-title">${font.font_name}</span>
                        ${authorStr}
                        <span class="font-date">${date}</span>
                    </div>
                    <div class="meta-right">
                        <a href="${font.font_url}" download="${font.font_name}.otf">
                            <span class="material-symbols-outlined text-[14px]">download</span>
                            Download
                        </a>
                    </div>
                </div>
                <div class="marquee-container" style="font-family: '${fontName}', sans-serif; font-size: ${currentSize}px; line-height: 1.15; color: #e0e0e0;">
                    ${buildMarqueeHTML(displayText)}
                </div>
            `;
            
            fontListContainer.appendChild(item);
            
            // Attach iteration listener
            const track = item.querySelector('.marquee-track');
            if (track) {
                track.addEventListener('animationiteration', onMarqueeIteration);
            }
        });

        styleEl.innerHTML = cssRules;
        document.head.appendChild(styleEl);
        
        // After fonts are rendered, recalculate speeds
        // Use a longer timeout to allow @font-face to load and affect layout
        setTimeout(() => recalcAllSpeeds(), 500);
        setTimeout(() => recalcAllSpeeds(), 2000);

    } catch (e) {
        console.error("Error loading fonts:", e);
        loadingIndicator.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-red-500 mb-4">error</span>
            <p class="text-[10px] uppercase tracking-[0.2em] text-red-400">Gagal memuat font: ${e.message}</p>
        `;
    }
}

// Load fonts on start
loadFonts();

// ─── Dynamic Title Animation ────────────────────────────────────────────────
const dynamicTitle = document.getElementById('dynamic-title');
if (dynamicTitle) {
    const spans = [];
    
    function buildTitleSpans(text) {
        dynamicTitle.innerHTML = '';
        spans.length = 0;
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
    }
    
    // Initial build
    buildTitleSpans('Ngefont!');
    
    // Toggle title text every 4 seconds
    let titleToggle = false;
    setInterval(() => {
        titleToggle = !titleToggle;
        buildTitleSpans(titleToggle ? 'Font Object!' : 'Ngefont!');
    }, 4000);

    const titleFonts = ['sans-serif', 'serif', 'monospace', 'cursive', 'system-ui'];
    const titleWeights = ['300', '400', '600', '800', '900'];
    const titleTransforms = ['uppercase', 'lowercase'];
    const titleStyles = ['normal', 'italic'];

    function animateTitle() {
        spans.forEach(item => {
            if (Math.random() < 0.3) {
                const f = titleFonts[Math.floor(Math.random() * titleFonts.length)];
                const w = titleWeights[Math.floor(Math.random() * titleWeights.length)];
                const t = titleTransforms[Math.floor(Math.random() * titleTransforms.length)];
                const s = titleStyles[Math.floor(Math.random() * titleStyles.length)];
                
                item.el.style.fontFamily = f;
                item.el.style.fontWeight = w;
                item.el.style.textTransform = t;
                item.el.style.fontStyle = s;
                
                item.el.style.opacity = (0.7 + Math.random() * 0.3).toString();
            }
        });
    }

    setInterval(animateTitle, 300);
}
