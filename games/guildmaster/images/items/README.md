# Item icons

Item artwork is organized by equip category:

- `weapons/`
- `armor/`
- `accessories/` — rings, amulets, shields, quivers, toolkits, and every other accessory

Use lowercase kebab-case filenames matching the displayed item name. For example:

- `Iron Greatsword` → `weapons/iron-greatsword.png`
- `Iron Mail` → `armor/iron-mail.png`
- `Poisoner's Toolkit` → `accessories/poisoners-toolkit.png`

The game automatically attempts this path for every equipment item and falls back to the category or weapon-type icon when a specific file has not been added yet.
