# 🎨 ChromaLens — Pixel-Level Image Color Analyzer

> **Decode every color in your image — instantly, privately, and for free.**

ChromaLens is a browser-based tool that accepts any image, analyzes it at the **pixel level**, and produces an interactive visual report showing the **percentage breakdown of colors** across 11 universal categories — no sign-up, no server, no data ever leaves your browser.

![ChromaLens Demo](https://img.shields.io/badge/Status-Live-brightgreen?style=flat-square)
![Made With](https://img.shields.io/badge/Made%20With-HTML%20%7C%20CSS%20%7C%20JS-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📂 **Drag & Drop Upload** | Drag any image or click to browse — PNG, JPG, WEBP supported |
| 🔬 **Pixel-Level Analysis** | Reads every single pixel using the HTML5 Canvas API |
| 🎨 **11 Color Categories** | White, Black, Gray, Red, Orange, Yellow, Green, Blue, Purple, Pink, Brown |
| 📊 **Interactive Charts** | Doughnut chart + horizontal bar chart with hover tooltips |
| 🖱️ **Color Picker** | Tap anywhere on the image to identify that pixel's exact color & hex |
| ⬇️ **Export Charts** | Download doughnut or bar chart as PNG |
| 🔒 **100% Private** | All processing is client-side — zero data sent to any server |
| ⚡ **Fast** | Results in under 2 seconds for typical images |

---

## 🚀 Live Demo

Open `index.html` directly in your browser — no installation needed.

```bash
# Clone the repo
git clone https://github.com/komallbarhate/ChromaLens.git

# Open in browser
cd ChromaLens
open index.html        # macOS
start index.html       # Windows
```

Or run a local server:

```bash
npx serve .
# → http://localhost:3000
```

---

## 🖥️ How It Works

### 1. Upload
Drag & drop or browse to select an image file.

### 2. Analysis Pipeline
```
Image File
   ↓
Draw to hidden <canvas> (downscaled to max 400px)
   ↓
Read every pixel via getImageData()
   ↓
RGB → HSL conversion (perceptually uniform color space)
   ↓
14-rule Decision Tree → 11 color buckets
   ↓
Count pixels → compute percentages
   ↓
Render charts + summary
```

### 3. Results
- **Analysis Summary** — animated percentage bars per color
- **Doughnut Chart** — color distribution ring chart
- **Bar Chart** — horizontal percentage breakdown
- **Color Legend** — swatches with exact percentages

### 4. Color Picker
After analysis, tap any point on the image — a floating tooltip shows:
- The color **category** (e.g. "Green")
- The exact **hex value** of that pixel (e.g. `#3A8C45`)
- A **color swatch** of the actual pixel

---

## 🎯 The 11 Color Categories

| Color | Example Shades |
|---|---|
| ⬜ **White** | Ivory, cream, off-white, snow |
| ⬛ **Black** | Jet, charcoal, very dark navy |
| 🔘 **Gray** | Silver, ash, slate, dark gray |
| 🔴 **Red** | Scarlet, crimson, burgundy, maroon |
| 🟠 **Orange** | Amber, tangerine, pumpkin |
| 🟡 **Yellow** | Gold, lemon, mustard, khaki |
| 🟢 **Green** | Lime, olive, forest, emerald, teal |
| 🔵 **Blue** | Navy, sky blue, cobalt, indigo |
| 🟣 **Purple** | Violet, lavender, mauve, plum |
| 🩷 **Pink** | Rose, hot pink, blush, salmon |
| 🟤 **Brown** | Beige, tan, sienna, chocolate |

---

## 🧮 Color Classification Algorithm

Each pixel goes through an **RGB → HSL → Decision Tree** pipeline:

1. **RGB → HSL Conversion** — converts raw pixel values to Hue (0–360°), Saturation (0–100%), and Lightness (0–100%)
2. **Achromatic Detection** — pixels with L ≥ 88% → White; L ≤ 12% → Black; S < 16% → Gray
3. **Brown / Pink Refinement** — separated from Red/Orange using combined S + L thresholds
4. **Hue Wheel Classification** — remaining pixels sorted by hue angle into Red, Orange, Yellow, Green, Blue, Purple, Pink

> See the full algorithm specification in [`ChromaLens_PRD.pdf`](./ChromaLens_PRD.pdf)

---

## 🗂️ Project Structure

```
ChromaLens/
├── index.html          — Page structure & UI components
├── style.css           — Light green/white theme, animations
├── analyzer.js         — Color engine, charts, picker logic
├── ChromaLens_PRD.pdf  — Full Product Requirements Document
└── README.md           — This file
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5 Canvas API** | Pixel-level image reading (`getImageData`) |
| **Vanilla JavaScript** | Classification engine, event handling |
| **Chart.js 4.4.0** | Doughnut and bar charts |
| **Vanilla CSS** | Styling, animations, glassmorphism |
| **Google Fonts** | Inter + Space Grotesk typography |

**No framework. No build step. No backend. No dependencies to install.**

---

## 📋 PRD

The full Product Requirements Document (PRD) is included in this repo as [`ChromaLens_PRD.pdf`](./ChromaLens_PRD.pdf).

It covers:
- Problem statement & use cases
- User personas
- Complete input/output specification
- Full color-mapping algorithm with decision tree & worked examples
- Functional & non-functional requirements
- 17 acceptance criteria
- Technical architecture
- Future roadmap

---

## 📸 Screenshots

### Upload Screen
Clean drag-and-drop interface with green & white theme.

### Results Screen
Interactive charts, animated summary bars, and color legend with exact percentages.

### Color Picker
Click/tap anywhere on the image to identify the exact pixel color with a smooth tooltip animation.

---

## 🔮 Roadmap

- [ ] Batch processing (multiple images at once)
- [ ] Dominant hex palette extraction (top 5 exact colors)
- [ ] Custom color bucket configuration
- [ ] REST API endpoint
- [ ] Figma plugin

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 👤 Author

**Komal Barhate**
Product Management Intern Prototype

*Built with [Antigravity](https://antigravity.dev) — AI coding assistant by Google DeepMind*
