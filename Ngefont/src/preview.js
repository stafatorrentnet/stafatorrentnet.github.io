// ========== UBAH DENGAN KREDENSIAL SUPABASE ANDA ==========
const SUPABASE_URL = 'https://vmumjgmjiimhshirvfdt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_K9-ejUbEbzWlw5o2EhdwcQ_3_8seFrP';

const sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "Jived fox nymph grabs quick waltz.",
    "Glib jocks quiz nymph to vex dwarf.",
    "Sphinx of black quartz, judge my vow.",
    "How vexingly quick daft zebras jump!",
    "The five boxing wizards jump quickly.",
    "Pack my box with five dozen liquor jugs.",
    "Ngefont makes creating your own typefaces incredibly easy.",
    "Desain huruf digital kini ada di ujung jari Anda."
];

function getRandomSentence() {
    return sentences[Math.floor(Math.random() * sentences.length)];
}

const previewText = document.getElementById('preview-text');
const sizeSlider = document.getElementById('size-slider');
const sizeLabel = document.getElementById('size-label');
const btnRandomize = document.getElementById('btn-randomize');
const fontListContainer = document.getElementById('font-list');
const loadingIndicator = document.getElementById('loading-indicator');

// Initial text
previewText.value = getRandomSentence();

// Controls
sizeSlider.addEventListener('input', (e) => {
    sizeLabel.textContent = `${e.target.value}px`;
    document.querySelectorAll('.font-preview-item .preview-text-render').forEach(el => {
        el.style.fontSize = `${e.target.value}px`;
    });
});

btnRandomize.addEventListener('click', () => {
    previewText.value = getRandomSentence();
    updatePreviewTexts();
});

previewText.addEventListener('input', updatePreviewTexts);

function updatePreviewTexts() {
    const text = previewText.value || ' ';
    document.querySelectorAll('.font-preview-item .preview-text-render').forEach(el => {
        el.textContent = text;
    });
}

// Supabase fetching
async function loadFonts() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        loadingIndicator.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-red-500 mb-4">error</span>
            <p class="text-xs uppercase tracking-widest text-red-400">Supabase URL & Key belum diisi di src/preview.js</p>
        `;
        return;
    }

    try {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Fetch fonts descending by created_at
        const { data: fonts, error } = await supabase
            .from('font_previews')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        
        loadingIndicator.classList.add('hidden');
        
        if (!fonts || fonts.length === 0) {
            fontListContainer.innerHTML = `
                <div class="text-center py-10 text-gray-500">
                    <span class="material-symbols-outlined text-[32px] mb-2 opacity-50">sentiment_dissatisfied</span>
                    <p class="text-xs uppercase tracking-widest">Belum ada font yang diupload.</p>
                </div>
            `;
            return;
        }

        // Parse query params to highlight a specific font if opened from editor
        const urlParams = new URLSearchParams(window.location.search);
        const highlightId = urlParams.get('id');

        // Create a style element for font-faces
        const styleEl = document.createElement('style');
        let cssRules = '';
        
        fonts.forEach((font, i) => {
            const fontName = `Font_${font.id.replace(/-/g, '_')}`;
            cssRules += `
                @font-face {
                    font-family: '${fontName}';
                    src: url('${font.font_url}') format('opentype');
                    font-display: swap;
                }
            `;
            
            const isHighlighted = font.id === highlightId;
            const date = new Date(font.created_at).toLocaleDateString();
            
            const item = document.createElement('div');
            item.className = `font-preview-item ${isHighlighted ? 'ring-2 ring-blue-500/50 p-4 rounded-xl bg-blue-500/5' : ''}`;
            item.style.animationDelay = `${i * 0.1}s`;
            
            item.innerHTML = `
                <div class="flex justify-between items-end mb-4 border-b border-white/5 pb-2">
                    <div>
                        <h2 class="text-lg font-bold text-white tracking-tight">${font.font_name}</h2>
                        <span class="text-[10px] uppercase tracking-widest text-gray-500">Uploaded ${date}</span>
                    </div>
                    <a href="${font.font_url}" download="${font.font_name}.otf" class="text-xs text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">download</span>
                        Download
                    </a>
                </div>
                <div class="preview-text-render break-words" style="font-family: '${fontName}', sans-serif; font-size: ${sizeSlider.value}px; line-height: 1.2;">
                    ${previewText.value}
                </div>
            `;
            
            fontListContainer.appendChild(item);
        });

        styleEl.innerHTML = cssRules;
        document.head.appendChild(styleEl);

    } catch (e) {
        console.error("Error loading fonts:", e);
        loadingIndicator.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-red-500 mb-4">error</span>
            <p class="text-xs uppercase tracking-widest text-red-400">Gagal memuat font: ${e.message}</p>
        `;
    }
}

// Load fonts on start
loadFonts();
