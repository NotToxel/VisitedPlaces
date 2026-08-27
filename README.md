# 🌍 VisitedPlaces

**An interactive world travel tracker** — mark countries and regions you've visited, explore your travel analytics, and compare maps with friends using serverless shareable codes.

[![Version](https://img.shields.io/badge/version-2.3.5-blue.svg)](package.json)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](tsconfig.app.json)

---

## 📸 Overview & Interface Preview

### 🗺️ Interactive World Map
Track visited places, bucket-list destinations, revisit goals, and avoided regions with smooth zooming, panning, and microstate support.

![Interactive World Map](docs/screenshots/01-world-map.png)

---

### ⬡ Hexagonal Grid View
A stylized honeycomb grid visualization providing equal visual weight to nations and territories across the globe.

![Hexagonal Honeycomb Map](docs/screenshots/02-hexagon-map.png)

---

### 📊 Travel Analytics & Traveler Persona
Deep dive into your travel footprint with continent coverage breakdowns, progress toward world exploration milestones, regional comparison charts, and gamified traveler badges.

![Travel Analytics Dashboard](docs/screenshots/04-analytics-dashboard.png)

---

### 🤝 Social Compare Mode
Compare travel maps side-by-side with friends using compact, serverless share codes. Identify mutual destinations, discover trip recommendations, and see travel overlaps in real time.

![Social Compare Mode](docs/screenshots/05-compare-mode.png)

---

### 🏛️ Sub-Region Drill-Down & Territory Exploration
Drill down into sub-national states, provinces, and territories (US states, Canadian provinces, UK counties, and admin-1 divisions worldwide) directly on the interactive map or through the dedicated sub-regions explorer panel.

| Interactive Regional Drill-down (US States) | Sub-regions Explorer Drawer |
|:---:|:---:|
| ![Regional Drill-down](docs/screenshots/06-regional-drilldown.png) | ![Sub-region Explorer](docs/screenshots/07-subregions-drawer.png) |

---

### 📋 Searchable Country Directory
Browse 199+ countries grouped by continent with progress bars, sorting options, and quick status actions.

![Country Directory](docs/screenshots/03-country-directory.png)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **Interactive World Map** | Click countries to open a context menu to change their status or drill into sub-regions (US states, UK counties, and admin-1 sub-divisions globally). |
| ⬡ **Hexagon Map** | Alternative hexagonal honeycomb visualization for an equalized, stylized view of global coverage. |
| 📋 **Country Directory** | Searchable directory of 199+ countries grouped by continent, with sub-region expansion, sorting, and stats. |
| 📊 **Analytics Dashboard** | Coverage stats, continent breakdowns, regional distribution charts, and gamified milestone levels. |
| 🤝 **Compare Mode** | Paste friends' share codes to see a merged map highlighting common destinations, individual travels, and overlaps. |
| 🔄 **Zero-Server Share Codes** | Export your map as a compact, URL-safe base64 code. Import codes from friends to compare or restore backups. |
| 🌓 **Dark & Light Mode** | Sleek modern dark mode interface with light theme support. |
| 🔒 **Privacy First** | Zero servers, zero telemetry, zero accounts. 100% of your data remains in your browser's local storage. |

### Status Types

- 🟢 **Visited** — Places you have traveled to
- 🟣 **Wishlist** — Bucket-list destinations you plan to visit
- 🟠 **Revisit** — Places you've loved and want to return to
- 🔴 **Avoid** — Places you do not wish to visit

---

## 🗃️ Data Sources

VisitedPlaces utilizes high-quality, open-source datasets to power interactive maps, country metadata, and sub-national flags:

*   **World Map Geometries:** TopoJSON boundaries from the [world-atlas](https://github.com/topojson/world-atlas) project (110m resolution).
*   **Global Sub-division Geometries:** Natural Earth admin-1 (states and provinces) 10m resolution GeoJSON from the [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector) repository.
*   **National Flags:** High-resolution vector flags served by [Flagpedia / FlagCDN](https://flagcdn.com/).
*   **Sub-National Flags:** Sub-national state, province, and regional flag assets from [amckenna41/iso3166-flags](https://github.com/amckenna41/iso3166-flags).
*   **Country Metadata:** Static country metadata (names, codes, continents, regions) compiled from the [REST Countries API](https://restcountries.com/).

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm 10+

### Install & Run

```bash
git clone https://github.com/your-username/VisitedPlaces.git
cd VisitedPlaces
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Automated Screenshots

Generate the latest high-resolution screenshots with demo travel data automatically:

```bash
# With dev server running on localhost:5173
npm run screenshots
```

### Build for Production

```bash
npm run build     # TypeScript check + Vite production bundle → dist/
npm run preview   # Preview the production build locally
```

The `dist/` folder is a static site — deploy it to GitHub Pages, Netlify, Vercel, or any static host. No backend required.

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React 19 + TypeScript (strict mode) | React 19.2 |
| Build | Vite 7 | Vite 7.3 |
| Styling | TailwindCSS 4 + Vanilla CSS Variables | Tailwind 4.3 |
| State | Zustand 5 + localStorage persistence | Zustand 5.0 |
| Routing | React Router 7 | React Router 7.13 |
| Maps | react-simple-maps + D3 (TopoJSON & Hexbin) | react-simple-maps 3.0 |
| Charts | Recharts | Recharts 3.8 |
| Icons | Lucide React | Lucide 0.577 |
| Testing & Automation | Vitest + Playwright | Vitest 4.1 / Playwright 1.62 |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # Reusable UI components (FlagImage)
│   ├── layout/          # AppLayout, Navbar, SettingsModal
│   └── map/             # StandardMap, HexagonMap, CompareMap, MapContainer, TerritoryListPanel
├── config/              # Constants, url endpoints, drill-down registry
├── data/                # Static countries data, territories, UK/US regional mappings
├── hooks/               # useDrilldownGeography, useMapAnimation
├── pages/               # Home, List, Analytics, Compare, About
├── store/               # Zustand store (places, theme, actions)
└── utils/               # Map utilities, serialization, CacheStorage, TopoJSON processing
```

---

## 🤝 How Sharing Works

1. Open **Settings** → your travel map is encoded as a compact, URL-safe base64 string
2. Copy the code and share it with a friend
3. Your friend pastes it into the **Compare** page
4. A merged visualization shows mutual destinations, unique travels, and trip overlaps

No server or database involved — your travel state is stored directly within the compact share code.

---

## 🧑‍💻 Contributing

Contributions are welcome! Please read the [AGENTS.MD](AGENTS.MD) file for:
- Architecture overview and design decisions
- Coding standards (TypeScript strict mode, BEM CSS, Zustand patterns)
- Step-by-step guides for adding new features
- Testing strategy and quality gates

### Development Workflow

```bash
npm run dev       # Start dev server with HMR
npm run lint      # Run ESLint
npm run test:run  # Run Vitest unit tests
npm run build     # Type-check + production build
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add trip dates to country data
fix: resolve projection error on UK drill-down
chore: update dependencies
refactor: extract map tooltip into component
```

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0** — see the [LICENSE](LICENSE) file for details.
