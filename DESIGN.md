# VisitedPlaces design direction

The survey desk is a quiet, map-led workspace for recording places and seeing coverage. It uses familiar cartographic cues without pretending to be a paper artifact. The map is the primary surface; the directory, analytics, comparison, and settings screens share the same type, color, and rule system.

## Visual system

- **Light:** warm off-white ground, pale paper surfaces, fine grey-green rules, dark green text.
- **Dark:** deep blue-green ground, lighter ink panels, warm ivory text, brighter status accents. Dark mode is designed independently for contrast rather than inverting light values.
- **Type:** self-hosted Newsreader for headings and figures; self-hosted DM Sans for controls and body text. System fallbacks remain available offline.
- **Status colors:** green visited, violet wishlist, ochre revisit, coral avoid. Always pair color with a label or icon in controls.
- **Surfaces:** solid backgrounds, restrained borders, tight radii, and minimal shadows. Motion is limited to feedback and respects reduced-motion preferences.

## Interaction and layout

- Desktop map has a permanent status sidebar and a wide map canvas. Search and view controls are centered over the canvas; the smaller zoom reset sits at its lower right. World and Hex remain equal choices.
- In a country drill-down, the back link and country name become the sidebar heading on desktop and a compact header above the map search on mobile.
- The map's place pop-up, territory list, tooltip, and region cards use solid survey surfaces, ruled borders, and semantic status accents. On mobile, place options open as a bottom sheet over a dimmed map.
- Territory lists start collapsed when the viewport is at most 1100 pixels wide or 700 pixels tall; users can expand them from the header, and a search match opens the list automatically.
- Checkboxes share an 18-pixel survey control with a clear checked mark, token-based colors, and visible keyboard focus. Compact map controls use the same shape at 16 pixels.
- Express marking uses the same map control surface and semantic status colors in both themes, with a compact selector below the search controls.
- Mobile map uses a fixed status sheet above a four-item bottom navigation. The sheet expands to reveal status visibility toggles. In country drill-downs, Reset Zoom sits beside the country header and the territory list sits below search; Express marking moves the list beneath its controls.
- The Places directory uses readable rows with direct status actions. Analytics favors clear figures and continent coverage. Compare keeps share-code setup prominent.
- Narrowed Places filters use filled continent or status colors and a persistent result summary with a clear action. Marked directory rows carry a faint status tint and a colored badge.
- A new user starts in light mode. Existing persisted theme preferences are respected. Theme can be changed in Settings.
- The app keeps bundled country data, local storage, and the existing offline model. Fonts are bundled with the app.

## Implementation

Design tokens and survey-specific components are in `src/survey.css`; the shared semantic tokens remain compatible with existing map and chart components. New UI should use those tokens, avoid inline visual values, and check desktop and mobile in both themes.
