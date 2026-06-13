# AGENTS.MD — VisitedPlaces Project Guide

> **Version**: 1.0.0  
> **Last Updated**: 2026-06-13  
> **Status**: Active Development

---

## 1. Project Overview

**VisitedPlaces** is an interactive, offline-first world travel tracker built as an open-source showcase. Users mark countries and sub-regions with statuses (Visited, Wishlist, Avoid, Revisit), explore analytics about their travel coverage, and compare their data with others using shareable base64 codes.

### Value Proposition (Hybrid Model)

The app serves three complementary purposes, prioritized in this order:

1. **Personal Tracker** (Foundation) — Frictionless data entry for cataloging places you've been, want to visit, or want to revisit. This is the data entry layer; it must be fast and intuitive.
2. **Analytics Dashboard** (Reward) — Visual insights into travel coverage: continent breakdowns, progress bars, and statistics. This is the "payoff" — it should be visually engaging and make users want to add more data.
3. **Comparison Tool** (Social) — Side-by-side comparison of travel histories via shareable codes. This transforms it from a solo tool into a social discovery platform.

### Core Principles

| Principle | Description |
|---|---|
| **Privacy by Architecture** | Zero server, zero accounts. All data lives in `localStorage`. Data never leaves the browser unless the user explicitly exports it. |
| **Offline-First** | Core functionality (country-level tracking, analytics, sharing) works without network access. Sub-region drill-downs may require network for non-bundled countries. |
| **OSS Showcase** | Code quality, architecture, documentation, and testing matter as much as the product itself. Every PR should leave the codebase better than it found it. |
| **Visual Excellence** | The UI should feel premium. Glassmorphism, smooth animations, curated color palettes, and modern typography are non-negotiable. |

---

## 2. Architecture

### Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | React 19 + TypeScript | Strict typing enforced everywhere |
| Build | Vite 7 | Fast HMR, `define` used for compile-time version injection |
| State | Zustand 5 + `persist` middleware | Single store, persisted to `localStorage` |
| Routing | React Router 7 | 4 routes: Home (Map), List, Analytics, Compare |
| Maps | react-simple-maps 3 + D3 | TopoJSON rendering with drill-down support |
| Charts | Recharts 3 | Analytics page visualizations |
| Icons | Lucide React | Consistent icon set across the app |
| Styling | Vanilla CSS | CSS custom properties for theming, BEM-like class naming |

### Directory Structure

```
src/
├── components/
│   ├── layout/          # AppLayout, Navbar, SettingsModal
│   └── map/             # StandardMap, HexagonMap, MapContainer, MapGeographies,
│                        #   CompareMap, DrilldownControls, TerritoryListPanel
├── config/
│   ├── constants.ts     # UI_COLORS, MAP_DEFAULTS, API URLs
│   └── drilldownConfig.ts  # Per-country drill-down registry (projections, processing)
├── data/
│   ├── countries.ts     # Static country data bundle (offline, no REST API)
│   └── mapData.ts       # Territory markers, microstate data, obsolete region sets
├── hooks/
│   ├── useDrilldownGeography.ts  # Fetches & caches sub-region TopoJSON
│   └── useMapAnimation.ts       # Smooth pan/zoom transitions
├── pages/
│   ├── Home.tsx         # Map view (default landing page)
│   ├── List.tsx         # Directory view with search, filter, bulk actions
│   ├── Analytics.tsx    # Stats, charts, coverage breakdowns
│   └── Compare.tsx      # Side-by-side comparison via share codes
├── store/
│   └── useStore.ts      # Zustand store: places, theme, actions
├── utils/
│   ├── hexGridData.ts   # Pre-computed hex grid coordinates
│   ├── mapUtils.ts      # Color resolution, status-to-color mapping
│   ├── serialization.ts # Base64 encode/decode for share codes
│   └── topojsonCache.ts # In-memory cache for fetched TopoJSON data
├── globals.d.ts         # TypeScript declarations for Vite injected globals
├── App.tsx              # Root component with routing
├── App.css              # App-level styles
├── index.css            # Design system: variables, components, responsive
└── main.tsx             # Entry point
```

### Data Flow

```
User Interaction
       │
       ▼
  Zustand Store (useStore.ts)
       │
       ├── persist middleware ──► localStorage ('visited-places-storage')
       │
       ├── places: UserPlacesMap ──► Map/List/Analytics components
       │
       └── theme: 'dark' | 'light' ──► CSS class on <html>
```

### Key Type Definitions

```typescript
type PlaceStatus = 'VISITED' | 'WISHLIST' | 'AVOID' | 'REVISIT' | 'NONE';

interface CountryData {
  status: PlaceStatus;
  regions: { [regionCode: string]: PlaceStatus };
}

interface UserPlacesMap {
  [countryCode: string]: CountryData;  // Keys are ISO 3166-1 alpha-3 (e.g., 'USA', 'GBR')
}
```

### Status Cascade Logic

When a sub-region status is set, the parent country status is automatically updated:

- Setting any sub-region to `VISITED` → parent becomes `VISITED`
- Setting to `WISHLIST` → parent becomes `WISHLIST` (unless already `VISITED`)
- Setting to `REVISIT` → parent becomes `REVISIT` (unless already `VISITED`)
- Setting to `AVOID` → parent becomes `AVOID` (only if currently `NONE`)

This is intentional: visiting even one region of a country means you've "visited" that country.

---

## 3. Styling Guide

### Design System

All styling flows from CSS custom properties defined in `index.css`. **Never use inline styles** for colors, spacing, or typography — always reference the design tokens.

#### Color Tokens (Dark Mode)

| Token | Value | Usage |
|---|---|---|
| `--accent-visited` | `#9ece6a` | Visited status everywhere |
| `--accent-wishlist` | `#bb9af7` | Wishlist status |
| `--accent-avoid` | `#ef4444` | Avoid status |
| `--accent-revisit` | `#ff9e64` | Revisit status |
| `--accent-primary` | `#7aa2f7` | Interactive elements, links |
| `--accent-highlight` | `#fbbf24` | Search highlights |
| `--glass-bg` | `rgba(26, 27, 38, 0.45)` | Glass panel backgrounds |

#### CSS Class Naming

Follow BEM-like conventions:
- **Block**: `.navbar`, `.map-container`, `.analytics-card`
- **Element**: `.navbar__link`, `.analytics-card__title`
- **Modifier**: `.navbar__link--active`, `.status-badge--visited`

#### Adding New Status Colors

If a new `PlaceStatus` is added:
1. Add CSS variable in `:root` and `:root.light-mode` in `index.css`
2. Add to `UI_COLORS` in `config/constants.ts`
3. Add to `getStatusColor()` in `utils/mapUtils.ts`
4. Update the `PlaceStatus` union type in `store/useStore.ts`
5. Update comparison logic in `Compare.tsx` if applicable

---

## 4. Map System

### World Map

The world map uses `react-simple-maps` with a `geoMercator` projection. Country geometries come from `world-atlas@2.0.2` via CDN (the world TopoJSON URL in `constants.ts`).

### Drill-Down System

Sub-region views (e.g., US states, UK counties) are configured in `drilldownConfig.ts`:

```typescript
interface DrilldownConfig {
  id: string;                    // ISO alpha-3 code
  projection: 'geoAlbersUsa' | 'geoMercator';
  scale: number;
  center?: [number, number];
  defaultView: { center: [number, number]; zoom: number };
  territories?: MapMarker[];     // Non-geographic territories shown as a list
  territoryLabel?: string;
  processTopology?: (data) => data;  // Filter problematic geometries
}
```

**Currently bundled drill-downs**: USA (states), GBR (counties/UTLAs).

**Adding a new drill-down**:
1. Find a TopoJSON source for the country's sub-regions
2. Add an entry to `drilldownRegistry` in `drilldownConfig.ts`
3. If the TopoJSON has problematic geometries (islands that break projections), add a `processTopology` filter
4. Add territory markers in `data/mapData.ts` if the country has non-geographic territories
5. Test that the projection renders correctly without NaN/Infinity errors

### TopoJSON Caching

`topojsonCache.ts` provides an in-memory cache for fetched TopoJSON data. Data is fetched once per session and reused. This is not persistent across page reloads (by design — TopoJSON files are large).

### Hexagon Map

An alternative visualization using a pre-computed hexagonal grid (`hexGridData.ts`). Each country is represented by one or more hexagons. This view is decorative/fun, not a primary interaction mode.

---

## 5. Share Code System

### How It Works

1. User's `UserPlacesMap` is JSON-serialized
2. Encoded to base64 using `btoa` (with UTF-8 handling via `encodeURIComponent`/`escape`)
3. Made URL-safe by replacing `+` → `-`, `/` → `_`, stripping trailing `=`
4. The resulting string is the "share code"

### Decoding

The reverse process in `deserializePlaces()`. Error handling returns `null` on invalid input.

### Compatibility Considerations

- **Forward compatibility**: Old codes will always decode correctly. New fields added to `CountryData` or new `PlaceStatus` values will simply be ignored by older versions.
- **Backward compatibility**: New versions should treat unknown status values gracefully (fall back to `NONE`).
- The share code format is **not versioned** — it's raw JSON. If the schema changes fundamentally, consider adding a version prefix (e.g., `v2:base64data`).

---

## 6. Offline Data Strategy

### Static Country Data

`src/data/countries.ts` contains a pre-built bundle of all country metadata (names, codes, flags, regions, subregions). This replaced the previous dependency on the REST Countries API.

**Why**: Eliminates a runtime network dependency, makes the app truly offline for core functionality, and removes a point of failure.

**Updating**: If country data changes (new countries, name changes), update `countries.ts` manually or regenerate it from the REST Countries API.

### Drill-Down Data (Network-Dependent)

Sub-region TopoJSON files are fetched from CDNs at runtime. This is the one remaining network dependency.

**Future direction**: Bundle curated TopoJSON for the most popular countries (see Roadmap). For now, drill-downs gracefully degrade when offline (show loading state, then error).

---

## 7. Versioning

### Scheme

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** (`X.0.0`): Breaking changes to data format, share code compatibility, or fundamental UX overhaul
- **MINOR** (`0.X.0`): New features (new drill-downs, new status types, new pages)
- **PATCH** (`0.0.X`): Bug fixes, styling tweaks, refactors, dependency updates

### Current Version

`1.0.0` — First stable release with all core features: map tracking, list view, analytics, comparison, share codes, theme toggle, and REVISIT status.

### Display

The version is injected at build time via Vite's `define` config and displayed as a subtle badge in the bottom-right corner of the app (`AppLayout.tsx`). It's nearly invisible by default (0.35 opacity) and reveals on hover.

### Updating

1. Bump the `version` field in `package.json`
2. The app automatically picks up the new version at next build
3. Update this document's version header

---

## 8. Testing Strategy

### Quality Gates (Target)

| Gate | Tool | Status |
|---|---|---|
| Type Safety | `tsc -b` (strict mode) | ✅ Active |
| Linting | ESLint 9 | ✅ Active |
| E2E Tests | Playwright | 🔧 Spec exists, needs expansion |
| Unit Tests | Vitest (planned) | 📋 Planned |
| CI Pipeline | GitHub Actions (planned) | 📋 Planned |

### Testing Priorities

1. **Zustand store logic** — Status cascading, load/save, edge cases (unit tests)
2. **Serialization** — Encode/decode round-trips, malformed input handling (unit tests)
3. **Map interactions** — Click to toggle status, drill-down navigation (E2E)
4. **Share flow** — Generate code, paste code, compare view renders (E2E)
5. **Theme toggle** — CSS variables apply correctly in both modes (E2E)

### Running Tests

```bash
npm run lint          # ESLint
npm run build         # TypeScript + Vite build (catches type errors)
npx playwright test   # E2E tests (requires Playwright browsers installed)
```

---

## 9. Code Quality Standards

### TypeScript

- **Strict mode**: No `any` usage. Use `unknown` + type guards when dealing with external data.
- **Explicit return types**: Not mandatory on React components (inferred as `JSX.Element`), but required on utility functions.
- **Enums vs. unions**: Prefer string union types (`type PlaceStatus = 'VISITED' | ...`) over TypeScript enums.

### React Patterns

- **Functional components only**: No class components.
- **Hooks**: Custom hooks go in `src/hooks/`. Keep hooks focused on a single concern.
- **State**: All shared state goes through Zustand. Local UI state (modals, form inputs) stays in component `useState`.
- **Effects**: Keep `useEffect` dependency arrays complete. No lint suppressions for missing deps.

### CSS

- **No inline styles**: All styling through CSS classes defined in `index.css`.
- **Theme-aware**: Use CSS custom properties for any color, so light/dark mode works automatically.
- **Responsive**: All layouts must work on mobile. Use the existing media query breakpoint (`max-width: 768px`).

### Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
- Each commit should be atomic — one logical change per commit.
- Commit messages should explain *why*, not just *what*.

---

## 10. Feature Roadmap

### Phase 1: Polish (Current Priority) 🎯

> "Depth over breadth" — Perfect what exists.

- [ ] Richer map interactions: smooth zoom animations, informative tooltips, click feedback
- [ ] Enhanced analytics: continent heat maps, travel streak tracking, "most visited region" highlights
- [ ] Polished sharing UX: visual preview of share code content, one-click copy
- [ ] Bundle curated drill-down TopoJSON (USA, GBR, AUS, JPN, FRA, DEU)
- [ ] Full test coverage (unit + E2E)
- [ ] GitHub Actions CI pipeline
- [ ] Proper README with screenshots, feature list, and deployment instructions

### Phase 2: New Dimensions

> Cherry-picked from "breadth" — genuine utility without architectural upheaval.

- [ ] Trip dates / timeline view
- [ ] Travel goals / bucket list feature
- [ ] City-level tracking (major cities within visited countries)
- [ ] Export as image (share a visual snapshot of your map)

### Phase 3: Social Layer (Future Vision)

> Documented for aspiration, not committed.

- [ ] Public shareable profiles (static HTML export)
- [ ] "Travel compatibility" score between two share codes
- [ ] Embeddable map widget for blogs/social media
- [ ] Leaderboards (opt-in, serverless via share codes)

---

## 11. Common Tasks for AI Agents

### Adding a New Place Status

1. Add to `PlaceStatus` union in `store/useStore.ts`
2. Add CSS variable in `index.css` (both `:root` and `.light-mode`)
3. Add to `UI_COLORS` in `config/constants.ts`
4. Add to `getStatusColor()` in `utils/mapUtils.ts`
5. Update cascade logic in `setCountryStatus` and `setRegionStatus`
6. Add to comparison logic in `Compare.tsx`
7. Add filter option in `List.tsx`
8. Update serialization tests

### Adding a New Drill-Down Country

1. Identify TopoJSON source (Natural Earth, gadm.org, or similar)
2. Add entry to `drilldownRegistry` in `config/drilldownConfig.ts`
3. Test projection renders without errors
4. Add territory data to `data/mapData.ts` if applicable
5. Consider bundling the TopoJSON for offline support

### Adding a New Page/Route

1. Create component in `src/pages/NewPage.tsx`
2. Add route in `App.tsx`
3. Add nav link in `components/layout/Navbar.tsx`
4. Add appropriate icon from Lucide

### Modifying the Store

1. Update types in `store/useStore.ts`
2. Consider migration: will existing `localStorage` data break?
3. If schema changes are breaking, bump MAJOR version
4. Update serialization if share codes are affected
5. Test with existing saved data (clear `localStorage` and reimport)

---

## 12. Known Limitations & Gotchas

1. **`geoAlbersUsa` projection**: Cannot render geometries outside the continental US + Alaska + Hawaii + Puerto Rico. Other US territories (Guam, American Samoa, etc.) are filtered out in `processTopology` and shown as a separate territory list.

2. **UK TopoJSON**: Contains obsolete region codes that must be filtered via `OBSOLETE_UK_REGIONS`. If the TopoJSON source is updated, this filter may need revision.

3. **Share code size**: Base64-encoded JSON grows linearly with the number of tracked places. A user with extensive sub-region data may generate very long codes. Consider compression (e.g., pako/gzip) if this becomes a UX issue.

4. **localStorage limits**: Browsers typically allow 5-10MB. The `UserPlacesMap` is small, but if we add trip dates, photos, or journal entries, we may need IndexedDB.

5. **CSS `var()` in Canvas/SVG**: The `UI_COLORS` constants use `var(--...)` strings. These work in SVG `fill`/`stroke` attributes (rendered by the browser) but **not** in Canvas 2D contexts. If we add Canvas-based visualizations, resolve CSS variables to computed values at runtime.

6. **React Simple Maps types**: The `@types/react-simple-maps` package doesn't perfectly match the library's API. Some props may need `// @ts-expect-error` or custom type declarations.

---

## 13. Environment & Development

### Prerequisites

- Node.js 20+
- npm 10+

### Getting Started

```bash
npm install
npm run dev         # Start dev server (http://localhost:5173)
```

### Building for Production

```bash
npm run build       # TypeScript check + Vite build → dist/
npm run preview     # Preview production build locally
```

### Deployment

The app builds to a static `dist/` folder. Deploy to any static hosting:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

No server, no environment variables, no secrets required.

---

*This document is the single source of truth for project context. Keep it updated as the project evolves.*
