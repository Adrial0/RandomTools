# Bramblebound

Standalone pixel-style Canvas party RPG. Open index.html in a browser or serve this folder with a static server. No dependencies, fonts, or build step.

Choose four classes (duplicates allowed) from Swordsman, Boxer, Archer, Mage, Priest, Spearman, Gunner, and Whipper. Drag characters to reposition them. They attack automatically; kills award party XP and automatically increase levels, health, and attack.

Each of nine areas loads its complete encounter at entry. Only the purple summoner adds enemies during combat, with a limit of three summons. Once an encounter is cleared, living characters walk to the right edge and enter the next area automatically. Fallen characters return with half health between areas. Defeat allows retrying while retaining earned progression.

Select a character (click portrait or 1–4), then click a dropped weapon in ITEM to equip it. SPACE pauses; 1x toggles double speed. Progress saves locally under bramblebound-v2. The previous prototype save is separate. New party replaces the current run after confirmation.

Run `node smoke-test.cjs` to check encounter population, XP leveling, class selection, equipment, exits, summoners, and opening combat.
