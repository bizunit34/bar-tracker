## Asset Structure

Store app-owned image assets under `src/assets/`.

### Images

- `images/scenes/`
  Use larger environmental images that represent places in the app, such as shelves, fridges, back bars, counters, or storage views.
- `images/items/bottles/`
  Use bottle images for spirits, wine, beer, syrups, and mixers that are represented as bottles.
- `images/items/glassware/`
  Use glasses, mugs, coupes, rocks glasses, wine glasses, and similar serving vessels.
- `images/items/tools/`
  Use shakers, jiggers, strainers, spoons, muddlers, and other bar tools.
- `images/items/garnish/`
  Use lemons, limes, olives, cherries, herbs, and other garnish imagery.
- `images/placeholders/`
  Use generic fallback images when an item or scene does not have a custom asset yet.

### Recommended Conventions

- Prefer lowercase kebab-case filenames such as `back-bar-shelf.png` or `bourbon-bottle.png`.
- Keep scene images visually wider and item images on transparent backgrounds when possible.
- Put image variants beside the base image, for example:
  `bourbon-bottle.png`
  `bourbon-bottle@2x.png`
  `bourbon-bottle@3x.png`
- Keep source/editable originals outside the app bundle if they are large. Export optimized app-ready assets into this folder.

### Suggested Usage

- Scenes should usually map to a location or surface in the app, for example a fridge view or a shelf section.
- Item images should map to reusable inventory entities so the same bottle or glass can be shown in lists, carts, and bar layouts.
- Placeholders should be safe defaults that keep the UI working before the full art set is ready.
