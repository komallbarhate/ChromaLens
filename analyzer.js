/* ════════════════════════════════════════════
   ChromaLens – Color Analysis Engine
   ════════════════════════════════════════════

   ALGORITHM OVERVIEW
   ──────────────────
   1. Draw image onto a hidden <canvas>
   2. Read every pixel via ImageData (getImageData)
   3. Convert RGB → HSL (perceptually uniform)
   4. Classify each pixel into one of 11 buckets:
      White, Black, Gray, Red, Orange, Yellow,
      Green, Blue, Purple, Pink, Brown
   5. Count buckets, compute percentages
   6. Render doughnut + bar charts via Chart.js
*/

'use strict';

/* ──────────────────────────────────────────── */
/*  COLOR DEFINITIONS (display order + swatches) */
/* ──────────────────────────────────────────── */
const COLOR_DEFS = [
  { name: 'Yellow',  hex: '#F5E642', textColor: '#000' },
  { name: 'Green',   hex: '#4CAF50', textColor: '#fff' },
  { name: 'Blue',    hex: '#2196F3', textColor: '#fff' },
  { name: 'White',   hex: '#F0F0F0', textColor: '#000' },
  { name: 'Gray',    hex: '#9E9E9E', textColor: '#fff' },
  { name: 'Black',   hex: '#212121', textColor: '#fff' },
  { name: 'Red',     hex: '#E53935', textColor: '#fff' },
  { name: 'Orange',  hex: '#FF6D00', textColor: '#fff' },
  { name: 'Brown',   hex: '#795548', textColor: '#fff' },
  { name: 'Purple',  hex: '#9C27B0', textColor: '#fff' },
  { name: 'Pink',    hex: '#F06292', textColor: '#fff' },
];

/* Build a lookup map for quick access */
const COLOR_MAP = {};
COLOR_DEFS.forEach(c => { COLOR_MAP[c.name] = c; });

/* ──────────────────────────────────────────── */
/*  RGB → HSL CONVERSION                        */
/* ──────────────────────────────────────────── */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l   = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6;               break;
      case b: h = ((r - g) / d + 4) / 6;               break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/* ──────────────────────────────────────────── */
/*  CLASSIFICATION ENGINE                       */
/* ──────────────────────────────────────────── */
/**
 * Classify a single pixel (r,g,b) into one of the 11 named color buckets.
 *
 * Decision tree (evaluated top-to-bottom):
 *  1. Achromatic axis first (lightness gating + saturation floor)
 *     • L > 88%  → White
 *     • L < 12%  → Black
 *     • S < 16%  → Gray  (catches near-neutrals at any mid lightness)
 *
 *  2. Chromatic path (H, S, L)
 *     • Brown    : warm hues (0–40°), S 15–55 %, L 15–45 %
 *     • Pink     : H 315–360 or 0–10, high L (≥60 %) or low-S reds
 *     • Red      : H 0–14 or 345–360
 *     • Orange   : H 15–44
 *     • Yellow   : H 45–72
 *     • Green    : H 73–165
 *     • Blue     : H 166–265
 *     • Purple   : H 266–314
 *     • Pink     : H 315–360 fallback
 */
function classifyPixel(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);

  /* ── Achromatic ── */
  if (l >= 88)          return 'White';
  if (l <= 12)          return 'Black';
  if (s < 16)           return 'Gray';

  /* ── Brown: warm hue, moderate sat, dark-ish ── */
  if (h >= 0 && h <= 40 && s >= 15 && s <= 60 && l >= 15 && l <= 46) {
    return 'Brown';
  }
  /* Also catch orange-browns in 10-40 range */
  if (h > 10 && h <= 44 && s >= 15 && s <= 55 && l > 22 && l <= 44) {
    return 'Brown';
  }

  /* ── Pink: reddish + high lightness ── */
  if ((h >= 315 || h <= 14) && l >= 60 && s >= 15) return 'Pink';
  if ((h >= 315 || h <= 14) && s < 50 && l >= 46)  return 'Pink';

  /* ── Hue wheel classification ── */
  if (h <= 14  || h >= 345) return 'Red';
  if (h <= 44)              return 'Orange';
  if (h <= 72)              return 'Yellow';
  if (h <= 165)             return 'Green';
  if (h <= 265)             return 'Blue';
  if (h <= 314)             return 'Purple';
  return 'Pink';
}

/* ──────────────────────────────────────────── */
/*  PIXEL SAMPLING & COUNTING                   */
/* ──────────────────────────────────────────── */
function analyzeImage(imageElement) {
  const canvas = document.getElementById('hiddenCanvas');
  const ctx    = canvas.getContext('2d');

  /* Downscale for speed (max 400px on longest side) */
  const MAX = 400;
  const scale = Math.min(1, MAX / Math.max(imageElement.naturalWidth, imageElement.naturalHeight));
  canvas.width  = Math.round(imageElement.naturalWidth  * scale);
  canvas.height = Math.round(imageElement.naturalHeight * scale);

  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const totalPixels = width * height;

  /* Tally buckets */
  const counts = {};
  COLOR_DEFS.forEach(c => { counts[c.name] = 0; });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 20) continue;               // skip transparent
    const label = classifyPixel(r, g, b);
    counts[label]++;
  }

  /* Build result array, sorted descending */
  const results = COLOR_DEFS.map(c => ({
    name:       c.name,
    hex:        c.hex,
    textColor:  c.textColor,
    count:      counts[c.name],
    percentage: (counts[c.name] / totalPixels * 100).toFixed(2),
  })).sort((a, b) => b.count - a.count);

  return results;
}

/* ──────────────────────────────────────────── */
/*  CHART RENDERING                             */
/* ──────────────────────────────────────────── */
let doughnutChart = null;
let barChart      = null;

const CHART_FONT = { family: 'Inter', color: '#1e1b3a' };

function renderCharts(results) {
  const labels  = results.map(r => r.name);
  const data    = results.map(r => parseFloat(r.percentage));
  const colors  = results.map(r => r.hex);
  const borders = results.map(() => 'rgba(255,255,255,0.12)');

  /* Destroy old charts */
  if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null; }
  if (barChart)      { barChart.destroy();      barChart      = null; }

  /* ── Doughnut ── */
  const dCtx = document.getElementById('doughnutChart').getContext('2d');
  doughnutChart = new Chart(dCtx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data, backgroundColor: colors, borderColor: borders,
        borderWidth: 1.5, hoverOffset: 12,
      }],
    },
    options: {
      cutout: '58%',
      animation: { animateScale: true, duration: 1000 },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(2)}%`,
          },
          bodyFont: CHART_FONT,
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderColor: 'rgba(22,163,74,0.20)',
          borderWidth: 1,
          padding: 12,
        },
      },
    },
  });

  /* ── Bar ── */
  const bCtx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(bCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '% of Image',
        data,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: colors.map(c => c + 'cc'),
      }],
    },
    options: {
      indexAxis: 'y',
      animation: { duration: 900 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.x.toFixed(2)}%` },
          bodyFont: CHART_FONT,
          backgroundColor: 'rgba(17,20,32,0.95)',
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1, padding: 12,
        },
      },
      scales: {
        x: {
          ticks: { color: '#6b6f8e', font: { family: 'Inter', size: 11 }, callback: v => v + '%' },
          grid:  { color: 'rgba(22,163,74,0.08)' },
        },
        y: {
          ticks: { color: '#1e1b3a', font: { family: 'Inter', size: 12 } },
          grid:  { display: false },
        },
      },
    },
  });
}

/* ──────────────────────────────────────────── */
/*  STATS + SWATCH RENDERING                    */
/* ──────────────────────────────────────────── */
function renderStats(results, filename) {
  /* Image label */
  document.getElementById('previewLabel').textContent =
    filename + '  |  ' + results.reduce((a, r) => a + parseFloat(r.percentage), 0).toFixed(1) + '% analysed';

  /* Stats bars */
  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = '';
  results.forEach(r => {
    const pct = parseFloat(r.percentage);
    if (pct < 0.1) return;           // skip negligible
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-swatch" style="background:${r.hex}"></span>
      <span class="stat-name">${r.name}</span>
      <div class="stat-bar-wrap">
        <div class="stat-bar" style="background:${r.hex}; width:0%"
             data-target="${Math.min(100, pct * (100 / results[0].percentage))}%"></div>
      </div>
      <span class="stat-pct">${pct.toFixed(1)}%</span>
    `;
    statsGrid.appendChild(row);
  });

  /* Animate bars after paint */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.stat-bar').forEach(el => {
      el.style.width = el.dataset.target;
    });
  }));

  /* Swatch legend */
  const swatchGrid = document.getElementById('swatchGrid');
  swatchGrid.innerHTML = '';
  results.forEach(r => {
    const item = document.createElement('div');
    item.className = 'swatch-item';
    item.innerHTML = `
      <div class="swatch-box" style="background:${r.hex}"></div>
      <div class="swatch-info">
        <span class="swatch-name">${r.name}</span>
        <span class="swatch-pct">${r.percentage}%</span>
      </div>
    `;
    swatchGrid.appendChild(item);
  });
}

/* ──────────────────────────────────────────── */
/*  DOWNLOAD HELPERS                            */
/* ──────────────────────────────────────────── */
function downloadChart(chartId, filename) {
  const canvas = document.getElementById(chartId);
  const link   = document.createElement('a');
  link.download = filename + '.png';
  link.href     = canvas.toDataURL('image/png');
  link.click();
}

/* ──────────────────────────────────────────── */
/*  COLOR PICKER — CLICK ON IMAGE               */
/* ──────────────────────────────────────────── */

/** Convert r,g,b (0–255) to uppercase hex string e.g. "#A3F2B1" */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Returns the actual rendered rect of the image content inside an
 * <img> element styled with object-fit:contain.
 * Needed to map a click on the element to the correct image pixel.
 */
function getContainedImageRect(imgEl) {
  const ew = imgEl.clientWidth;
  const eh = imgEl.clientHeight;
  const iw = imgEl.naturalWidth;
  const ih = imgEl.naturalHeight;
  if (!iw || !ih) return null;
  const scale = Math.min(ew / iw, eh / ih);
  const rw = iw * scale;
  const rh = ih * scale;
  return { x: (ew - rw) / 2, y: (eh - rh) / 2, w: rw, h: rh };
}

let pickerDismissTimer = null;

function showColorTooltip(clientX, clientY, colorName, r, g, b) {
  const tooltip  = document.getElementById('colorTooltip');
  const swatch   = document.getElementById('tooltipSwatch');
  const catEl    = document.getElementById('tooltipCategory');
  const hexEl    = document.getElementById('tooltipHex');
  const dot      = document.getElementById('pickerDot');

  const hex = rgbToHex(r, g, b);

  /* Update content */
  swatch.style.background = hex;
  catEl.textContent = colorName;
  hexEl.textContent = hex;

  /* Position & animate the pulse dot */
  dot.style.left = clientX + 'px';
  dot.style.top  = clientY + 'px';
  dot.style.background = hex;
  dot.classList.remove('pulse', 'fade-out');
  /* Force reflow so animation restarts on repeated clicks */
  void dot.offsetWidth;
  dot.classList.add('pulse');

  /* Position tooltip — prefer top-right of cursor, flip if near edges */
  const TW = 210, TH = 74;
  let tx = clientX + 18;
  let ty = clientY - TH - 12;
  if (tx + TW > window.innerWidth - 8)  tx = clientX - TW - 18;
  if (ty < 8)                           ty = clientY + 18;

  tooltip.style.left = tx + 'px';
  tooltip.style.top  = ty + 'px';

  /* Trigger enter transition */
  tooltip.classList.remove('show');
  void tooltip.offsetWidth;          // reflow
  tooltip.classList.add('show');

  /* Auto-dismiss after 3 s */
  clearTimeout(pickerDismissTimer);
  pickerDismissTimer = setTimeout(() => {
    tooltip.classList.remove('show');
    dot.classList.remove('pulse');
    void dot.offsetWidth;
    dot.classList.add('fade-out');
  }, 3000);
}


function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;

  const overlay  = document.getElementById('processingOverlay');
  const results  = document.getElementById('resultsSection');
  const preview  = document.getElementById('previewImg');
  const upload   = document.getElementById('uploadCard');

  overlay.classList.add('visible');
  results.hidden = true;

  const reader = new FileReader();
  reader.onload = e => {
    preview.onload = () => {
      setTimeout(() => {
        try {
          const analysisResults = analyzeImage(preview);
          renderStats(analysisResults, file.name);
          renderCharts(analysisResults);
          upload.hidden  = true;
          results.hidden = false;
          results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
          console.error('Analysis failed:', err);
          alert('Could not analyze image. Please try a different file.');
        } finally {
          overlay.classList.remove('visible');
        }
      }, 80);           // let the overlay render first
    };
    preview.onerror = () => {
      overlay.classList.remove('visible');
      alert('Failed to load the image. Please try a different file.');
    };
    preview.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ──────────────────────────────────────────── */
/*  EVENT LISTENERS                             */
/* ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  const fileInput   = document.getElementById('fileInput');
  const dropZone    = document.getElementById('dropZone');
  const uploadCard  = document.getElementById('uploadCard');

  /* File input */
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

  /* Click on card opens file dialog — skip if click came from label/input to avoid double-trigger */
  uploadCard.addEventListener('click', e => {
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'label' || tag === 'input') return;
    fileInput.click();
  });

  /* ── Color Picker: click anywhere on the preview image ── */
  const previewImg = document.getElementById('previewImg');
  previewImg.addEventListener('click', e => {
    const canvas = document.getElementById('hiddenCanvas');
    if (!canvas.width || !canvas.height) return;   // no image analyzed yet

    const rect     = previewImg.getBoundingClientRect();
    const clickX   = e.clientX - rect.left;
    const clickY   = e.clientY - rect.top;

    /* Map from displayed (object-fit:contain) coords → canvas coords */
    const contained = getContainedImageRect(previewImg);
    if (!contained) return;

    const relX = clickX - contained.x;
    const relY = clickY - contained.y;
    if (relX < 0 || relY < 0 || relX > contained.w || relY > contained.h) return;

    const cx = Math.min(canvas.width  - 1, Math.round((relX / contained.w) * canvas.width));
    const cy = Math.min(canvas.height - 1, Math.round((relY / contained.h) * canvas.height));

    const [r, g, b, a] = canvas.getContext('2d').getImageData(cx, cy, 1, 1).data;
    if (a < 20) return;   // transparent pixel

    const colorName = classifyPixel(r, g, b);
    showColorTooltip(e.clientX, e.clientY, colorName, r, g, b);
  });

  /* Drag-and-drop */
  ['dragenter','dragover'].forEach(ev => {
    uploadCard.addEventListener(ev, e => {
      e.preventDefault(); uploadCard.classList.add('drag-over');
    });
  });
  ['dragleave','drop'].forEach(ev => {
    uploadCard.addEventListener(ev, e => {
      e.preventDefault(); uploadCard.classList.remove('drag-over');
    });
  });
  uploadCard.addEventListener('drop', e => {
    handleFile(e.dataTransfer.files[0]);
  });

  /* Download buttons */
  document.getElementById('downloadDoughnutBtn').addEventListener('click', () => {
    downloadChart('doughnutChart', 'color-distribution-doughnut');
  });
  document.getElementById('downloadBarBtn').addEventListener('click', () => {
    downloadChart('barChart', 'color-distribution-bar');
  });

  /* Reset */
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('resultsSection').hidden = true;
    document.getElementById('uploadCard').hidden     = false;
    fileInput.value = '';
    /* Clear color picker */
    document.getElementById('colorTooltip').classList.remove('show');
    document.getElementById('pickerDot').classList.remove('pulse');
    clearTimeout(pickerDismissTimer);
    document.getElementById('uploadCard').scrollIntoView({ behavior: 'smooth' });
  });
});
