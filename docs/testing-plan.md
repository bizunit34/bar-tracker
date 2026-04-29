# Testing Plan

`bar-tracker/package.json` does not currently define a test script or a configured test runner. Do not add a large framework until the project chooses React Native test tooling.

Recommended first tests once a runner is added:

- `guestInventoryMapping`: excludes private notes, archived items, excluded items, and disabled categories; respects public notes, brand, and tag share settings.
- `inventoryTransfer`: parses valid JSON/CSV, rejects malformed JSON/CSV, clamps negative quantities, reports duplicate imports, and leaves existing inventory intact after failed parse.
- Bar filter/sort helpers: filters by name, brand, category, stock status, archive status, and sorts by name/rating/quantity/updated date.
- Data integrity helpers: updates preserve `createdAt`, updates refresh `updatedAt`, archive sets `archivedAt`, restore clears `archivedAt`, duplicate creates a new id and active state.
- Equipment helpers: common/custom tools and glassware normalize names and avoid duplicate active records.
- Theme/status helpers: stock and visibility statuses produce text labels and semantic tones.
- Add/edit serialization: required name validation, mixer items omit alcohol-only fields, negative holdings clamp to zero, ratings clamp to 0-5.
