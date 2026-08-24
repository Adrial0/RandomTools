# Guildmaster scripts

Guildmaster currently uses ordered classic scripts. This preserves the shared global scope used by existing event handlers while keeping each gameplay domain in a separate file.

Load order:

1. `core.js` — shared definitions, assets, persistence, characters, items, and mission setup
2. `combat.js` — combat simulation, encounters, rewards, and offline resolution
3. `progression.js` — roster actions, equipment, crafting progression, and upgrades
4. `ui.js` — guild hall, combat, and roster rendering
5. `activities.js` — quest board, harvesting, expeditions, and party selection
6. `economy.js` — resources, market, inventory, enchanting, and crafting UI
7. `app.js` — event wiring, timers, data loading, validation, and bootstrap

All scripts must load before `bootstrapGame()` runs at the end of `app.js`. When adding new code, place gameplay rules in the owning domain and keep startup/event wiring in `app.js`.

Run the combat mechanic regression tests with:

```powershell
node tests/combat-mechanics.test.js
node tests/tactical-intel.test.js
node tests/onboarding.test.js
```
