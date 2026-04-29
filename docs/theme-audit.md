# Theme Audit Notes

Checked with:

```bash
rg -n "#[0-9A-Fa-f]{3,8}|rgba?\(" src --glob "!src/theme/**"
```

No hardcoded hex or raw RGB/RGBA color values remain outside `src/theme`.

Remaining cleanup candidates:

- `src/screens/EquipmentScreen.tsx` and `src/screens/InventoryTransferScreen.tsx` still use some local numeric spacing, radius, and font values while consuming semantic colors. Migrate these to `spacing`, `radii`, `typography`, and `componentTokens` during the next focused UI maintenance pass.
- Generated catalog data can contain `#` characters in product names; those are not theme colors.
