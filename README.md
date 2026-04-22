# Bar Tracker

React Native + TypeScript starter for managing a bar inventory (spirits, mixers, garnish, tools).

## Getting started
- Install prerequisites for React Native (Node 18+, Xcode for iOS, Android SDK/Java for Android, Watchman on macOS).
- Install dependencies: `npm install`
- Start the Metro bundler: `npm run start`
- Run the app: `npm run ios` or `npm run android` (simulator/emulator must be running).

## Tooling
- Lint: `npm run lint` (ESLint with React Native, TypeScript, import sorting, and the provided strict ruleset)
- Format: `npm run format` (Prettier)
- TypeScript: `tsconfig.json` extends `@tsconfig/react-native` with strict type-checking.

## Project structure
- `src/App.tsx`: App entry and navigation wrapper.
- `src/screens/InventoryScreen.tsx`: Inventory overview with summary stats.
- `src/components/InventoryList.tsx` / `InventoryListItem.tsx`: Inventory list rendering.
- `src/data/sampleInventory.ts`: Seed data for demo content.
- `src/types/inventory.ts`: Shared inventory types.
- `src/theme/colors.ts`: Centralized palette.

## Next steps
- Replace `sampleInventory` with data from storage or an API.
- Add CRUD flows for items (add, edit, archive) plus quantity adjustments.
- Hook up authentication or syncing if you plan multi-device use.
