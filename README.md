# 🌍 VisitedPlaces

**An interactive, offline-first world travel tracker** — mark countries and regions you've visited, explore your travel analytics, and compare maps with friends using shareable codes.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](tsconfig.app.json)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **Interactive World Map** | Click countries to mark them. Right-click to drill into sub-regions (US states, UK counties). |
| 📋 **Country Directory** | Searchable list of all countries grouped by continent, with sub-region expansion. |
| 📊 **Analytics Dashboard** | Coverage stats, continent breakdowns, pie charts, and traveler persona badges. |
| 🤝 **Compare Mode** | Paste friends' share codes to see a side-by-side map with common destinations and recommendations. |
| 🔄 **Share Codes** | Export your map as a compact base64 code. Import codes from friends to compare or restore backups. |
| 🌓 **Dark & Light Mode** | Toggle between dark and light themes from the Settings panel. |
| ⬡ **Hexagon Map** | Alternative hexagonal visualization for a unique view of global coverage. |
| 🔒 **Privacy First** | Zero server, zero accounts. All data stays in your browser's `localStorage`. |

### Status Types

- ✅ **Visited** — You've been there
- 💜 **Wishlist** — You want to go
- 🔄 **Revisit** — You'd go back
- 🚫 **Avoid** — Not interested

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
npm run build     # TypeScript check + Vite build → dist/
npm run preview   # Preview the production build locally
```

The `dist/` folder is a static site — deploy it to GitHub Pages, Netlify, Vercel, or any static host. No server or environment variables needed.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript (strict mode) |
| Build | Vite 7 |
| State | Zustand 5 + localStorage persistence |
| Routing | React Router 7 |
| Maps | react-simple-maps + D3 (TopoJSON) |
| Charts | Recharts |
| Icons | Lucide React |
| Styling | Vanilla CSS with custom properties |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/          # AppLayout, Navbar, SettingsModal
│   └── map/             # StandardMap, HexagonMap, CompareMap, MapContainer
├── config/              # Constants, drill-down registry
├── data/                # Static country data, territory markers
├── hooks/               # useDrilldownGeography, useMapAnimation
├── pages/               # Home, List, Analytics, Compare
├── store/               # Zustand store (places, theme, actions)
└── utils/               # Map utilities, serialization, caching
```

---

## 🤝 How Sharing Works

1. Open **Settings** → your map is encoded as a compact base64 string
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
