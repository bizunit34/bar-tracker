# Bar Tracker QA / Release Checklist

Use this checklist for manual release validation on a clean simulator/device and at least one device with existing data.

## Pre-Release Smoke Test

- Launch app successfully on iOS.
- Launch app successfully on Android.
- Add one custom spirit, edit it, archive it, restore it, and permanently delete it with confirmation.
- Export JSON, import the same JSON, and verify duplicates are skipped.
- Open Share, preview guest view, and verify private notes are absent.
- Create a share link when `EXPO_PUBLIC_BAR_TRACKER_API_BASE_URL` is configured.
- Restart the app and verify inventory, sharing settings, local share links, tools/glassware, and recipes remain.

## New User / Empty App

- Launch app with no inventory.
- Verify Home empty state is readable and primary actions are reachable.
- Verify Bar empty state offers Add Item and Import / Export.
- Verify Share empty state explains that guest-visible items are needed.
- Verify Tools & Glassware empty/setup state shows common tools/glassware and custom add input.

## Inventory

- Add custom item.
- Add catalog item.
- Edit item.
- Duplicate item and verify new id/name and active state.
- Toggle open/unopened.
- Change visibility through Private, Shared, and Guest Visible.
- Archive item.
- Restore item.
- Permanently delete item with confirmation.
- Search by name.
- Search by brand.
- Filter by category.
- Filter by stock status.
- Sort by name, rating, quantity, and recently updated.
- Reset filters.
- Switch list/display modes if still supported.

## Add / Edit

- Add spirit with proof/ABV.
- Add mixer and verify alcohol-specific fields are not required.
- Add tool/glassware.
- Add photo if camera/gallery permissions are available.
- Set rating.
- Set private notes.
- Set public notes.
- Validate name required.
- Prevent invalid or negative quantities.

## Tools & Glassware

- Select common tool.
- Deselect/archive/restore tool if supported.
- Add custom tool.
- Add common glassware.
- Add custom glassware.
- Verify duplicate names restore/update existing equipment instead of creating duplicates.

## Import / Export

- Export JSON.
- Export CSV.
- Import valid JSON.
- Import valid CSV.
- Import malformed JSON.
- Import malformed CSV, including an unclosed quoted field.
- Verify duplicate handling skips repeated imports.
- Verify import summary counts imported/skipped/errors.
- Verify app data remains intact after failed import.

## Sharing

- Mark item private.
- Mark item shared.
- Mark item guest visible.
- Configure Manage Sharing.
- Preview guest view.
- Verify private notes do not appear.
- Verify archived items do not appear.
- Verify public notes appear only when configured.
- Create share link when API URL is configured.
- Handle missing API URL.
- Copy/share latest link.
- Disable link.
- Manage active/disabled links.

## Persistence

- Restart app and verify inventory remains.
- Restart app and verify share settings remain.
- Restart app and verify share links remain.
- Restart app and verify tools/glassware remain.
- Restart app and verify recipes remain if applicable.

## Theme / Accessibility

- Check dark theme readability on Home, Bar, Share, Tools & Glassware, Import / Export, Recipes, and More.
- Check status badges have text labels and are not color-only.
- Check major buttons are reachable by screen reader focus.
- Check modal/action sheet close buttons have useful labels.
- Check selected chips/options expose selected or checked state where possible.
- Check iOS and Android smoke tests.
- Check small/large font scaling if possible.
