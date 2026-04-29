# Bar Tracker Mobile App

React Native + TypeScript app for managing a local-first home bar inventory, preparing guest-safe share snapshots, and optionally creating public share links through the Bar Tracker API.

## What The App Does

- Tracks inventory items across spirits, liqueurs, wine, beer, mixers, bitters, syrups, juices, garnishes, tools, glassware, and other bar items.
- Supports add, edit, archive, restore, permanent delete with confirmation, duplicate, open/unopened toggles, guest-visibility cycling, search, filters, sorting, and low-detail inventory cards.
- Stores local inventory, share settings, locally created share-link management records, saved recipes, tool data, and catalog data in the local SQLite database.
- Imports and exports inventory backup data as JSON and CSV.
- Manages tools and glassware as normal inventory records with specialized checklist-style screens.
- Builds guest-safe sharing previews from sanitized inventory data.
- Creates backend-backed public share links when `EXPO_PUBLIC_BAR_TRACKER_API_BASE_URL` is configured.
- Keeps created share links locally so the owner can copy, preview, share, and disable them later from the same device.

## What The App Does Not Do Yet

- It does not have user accounts or cross-device sync.
- Locally saved share-link management records are device-local.
- Native file picker/save integration for import/export is intentionally minimal; current import supports pasted JSON/CSV content and export uses the platform share sheet.

## Getting Started

Install prerequisites for React Native: Node 18+, Watchman on macOS, Xcode for iOS, and Android SDK/Java for Android.

```bash
npm install
```

For iOS after installing dependencies or changing native packages:

```bash
cd ios
bundle exec pod install
cd ..
```

Run the app:

```bash
npm run start
npm run ios
npm run android
```

## Environment

Copy `.env.example` if needed and configure:

```env
EXPO_PUBLIC_BAR_TRACKER_API_BASE_URL=http://localhost:10000
```

When this variable is missing, the app still works locally but backend share-link creation is disabled and the Share screens show the missing-API state. For local API development, point it at the locally running `bar-tracker-api`. For Render, use the deployed Render service URL without a trailing slash.

## Navigation Map

- **Home**
  - Daily-use dashboard for quick bar decisions.
  - Primary actions for Add Item, Share My Bar, Tools & Glassware, and Import / Export.
  - Inventory summary for active items, spirits, mixers/garnishes, tools/glassware, and guest-visible items.
  - Guest sharing status with Preview Guest View, Manage Sharing, and Copy Latest Link when available.
  - Recently updated items with quick open/archive/edit actions.
  - Category count chips that jump into Bar filtered by category.

- **Bar**
  - Full inventory manager.
  - Add/edit/archive/restore/delete items.
  - Duplicate items.
  - Toggle open/unopened.
  - Cycle visibility between Private, Shared, and Guest Visible.
  - Always-visible search, compact active filter chips, filter/sort sheet, active/archived views, and list/display modes.
  - Scannable list rows and display cards with stock, rating, visibility, and archived status badges.
  - Secondary item actions are grouped in an overflow action sheet so rows stay compact.
  - Add/Edit is organized around basics, stock, rating/notes, sharing, photo, and advanced details.
  - Tools & Glassware and Import / Export are available from the Bar controls.

- **Share**
  - Sharing hub for guest-safe previews and public link creation.
  - Shows guest-visible item count, sharing settings summary, latest-link actions, and guest preview.
  - Links to Manage Sharing, Share Links, and Bar setup.

- **Recipes**
  - Secondary saved recipe and recommendation workspace currently present in the app.
  - Uses local inventory and tool context.

- **More**
  - Groups secondary utilities so the main navigation stays focused.
  - Bar Setup: Tools & Glassware, Import / Export.
  - Sharing: Manage Sharing, Share Links.
  - Future: Shopping Cart, Connected Bars.

- **Tools & Glassware**
  - Checklist-style management for common bar tools and glassware.
  - Creates/restores inventory items only when selected.
  - Supports custom tools and glassware.
  - Accessible from Home, Bar, and More.

- **Import / Export**
  - Export inventory as JSON or CSV.
  - Parse and preview JSON/CSV imports.
  - Import with duplicate protection and clear safe-default copy.

- **Share Links**
  - Local owner-side management for links created on this device.
  - Shows active and disabled links.
  - Copy, preview, native share, and disable actions.

- **Manage Sharing**
  - Configure share title, description, included categories, excluded items, and visibility rules.

- **Connected Bars**
  - Placeholder route for future multi-bar/account functionality.

- **Shopping Cart**
  - Placeholder route for future shopping workflow.

## Project Structure

- `src/App.tsx`: App shell and route map.
- `src/catalog/`: Local catalog import, normalization, SQLite schema, seed loading, and repository logic.
- `src/components/`: Shared inventory list components.
- `src/components/bar/`: Bar-specific row/card, action sheet, badge, icon, and empty-state components.
- `src/config/api.ts`: API base URL configuration.
- `src/data/`: Local repositories, stores, inventory transfer helpers, share settings, share links, and guest-safe mapping.
- `src/features/recipes/`: Recipe-related local data, hooks, AI prompt plumbing, and recommendation helpers.
- `src/screens/`: Route-level UI screens.
- `src/services/`: API service clients.
- `src/theme/`: Shared design tokens for palette, colors, typography, spacing, radii, shadows, component patterns, and semantic status tones.
- `src/types/`: Shared TypeScript models.
- `src/generated/catalog.seed.json`: Bundled catalog seed generated by `bar-scripts`.

## Visual Theme

The app uses React Native TypeScript theme tokens instead of global CSS. There is no CSS pipeline in this native app, so `src/theme/tokens.ts` and the files it exports are the source of truth.

- Use `src/theme` exports instead of hardcoded hex values, one-off font sizes, or custom spacing.
- Add raw colors only in `src/theme/palette.ts`, then expose them through semantic roles in `src/theme/colors.ts`.
- Use typography roles from `src/theme/typography.ts` for screen titles, section titles, body text, labels, captions, and buttons.
- Use `spacing`, `radii`, `shadows`, and `componentTokens` for cards, buttons, chips, inputs, modals, and action sheets.
- Use semantic helpers such as `getStockStatusTone` and `getVisibilityTone` for badges. Badges should always include text labels, not color alone.
- Primary actions use the amber `primary` tone, secondary actions use raised neutral surfaces, and destructive actions use the red `danger` tone.

The current palette is a warm premium dark theme with espresso surfaces, cream/sand text, amber primary actions, copper secondary accents, sage success, gold warning, blue info, and red danger. Text and controls were chosen to keep normal text and important UI boundaries readable on dark surfaces.

## Catalog Seed Updates

The app consumes the generated catalog seed at `src/generated/catalog.seed.json`.

From this repo:

```bash
npm run build:catalog
```

This delegates to `../bar-scripts`.

## Quality

```bash
npx tsc --noEmit
npm run lint
npm run format
```

There is currently no test script configured.

Manual QA lives in [`docs/QA.md`](docs/QA.md). The recommended future automated test coverage is documented in [`docs/testing-plan.md`](docs/testing-plan.md).

Diagnostics should use `src/utils/logging.ts` so errors remain useful without logging full inventory records, private notes, pasted import contents, full share payloads, or share management tokens.
