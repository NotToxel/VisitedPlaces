# 🌍 VisitedPlaces

**An interactive world travel tracker** — mark countries and regions you've visited, explore your travel analytics, and compare maps with friends using shareable codes.

[![Version](https://img.shields.io/badge/version-2.2.4-blue.svg)](package.json)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](tsconfig.app.json)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **Interactive World Map** | Click countries to open a context menu to change their status or drill into sub-regions (US states, UK counties, and admin-1 sub-divisions globally). |
| 📋 **Country Directory** | Searchable list of all countries grouped by continent, with sub-region expansion and stats. |
| 📊 **Analytics Dashboard** | Coverage stats, continent breakdowns, pie charts, and traveler persona badges. |
| 🤝 **Compare Mode** | Paste friends' share codes to see a side-by-side map with common destinations, recommendations, and overlaps. |
| 🔄 **Share Codes** | Export your map as a compact base64 code. Import codes from friends to compare or restore backups. |
| 🌓 **Dark & Light Mode** | Toggle between dark and light themes from the Settings panel. |
| ⬡ **Hexagon Map** | Alternative hexagonal visualization for a unique view of global coverage. |
| 🔒 **Privacy First** | Zero server, zero accounts. All data stays in your browser's local state. |

### Status Types

- ✅ **Visited** — You've been there
- 💜 **Wishlist** — You want to go
- 🔄 **Revisit** — You'd go back
- 🚫 **Avoid** — Not interested

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

### Build for Production

```bash
npm run build     # TypeScript check + Vite production bundle → dist/
npm run preview   # Preview the production build locally
```

The `dist/` folder is a static site — deploy it to GitHub Pages, Netlify, Vercel, or any static host. No server or environment variables needed.

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React 19 + TypeScript (strict mode) | React 19.2 |
| Build | Vite 7 | Vite 7.3 |
| Styling | TailwindCSS 4 + Vanilla CSS Variables | Tailwind 4.3 |
| State | Zustand 5 + localStorage persistence | Zustand 5.0 |
| Routing | React Router 7 | React Router 7.13 |
| Maps | react-simple-maps + D3 (TopoJSON) | react-simple-maps 3.0 |
| Charts | Recharts | Recharts 3.8 |
| Icons | Lucide React | Lucide 0.577 |
| Testing | Vitest | Vitest 4.1 |

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

1. Open **Settings** → your map is encoded as a compact, URL-safe base64 string
2. Copy the code and send it to a friend
3. Your friend pastes it into the **Compare** page
4. A merged map shows common destinations, recommendations, and travel overlaps

No server involved — the code contains your data directly.

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

In short: you're free to use, modify, and distribute this software, but if you run a modified version on a public server, you must make the source code available to users of that server.
