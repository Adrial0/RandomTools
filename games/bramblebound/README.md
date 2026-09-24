# Bramblebound

Standalone pixel-style Canvas party RPG. Open `index.html` in a browser or serve this folder with a static server. No dependencies or build step.

## Characters and progression

Choose four classes, including duplicates. Drag characters to reposition them; combat is automatic. Kills award shared XP. Level-ups automatically grant **two unspent SP per character**. Select a portrait and use the STR, DEX, or INT + button to spend a point. Base STR/DEX are 4, base INT is 0. Level increases also provide 6 LP; spending points provides additional class-dependent LP.

| Class | STR | DEX | INT (in addition to +1 MP per successful basic attack) |
| --- | --- | --- | --- |
| Swordsman | +1 maximum AT | +1 minimum AT, capped by maximum | LP |
| Boxer | +1 minimum and maximum AT | Attack delay divided by 1 + DEX × 0.02 | LP |
| Archer | +2 range | +0.5 minimum / +0.75 maximum AT | LP |
| Mage | +2 range | Attack delay divided by 1 + DEX × 0.02 | +0.5 minimum / +0.75 maximum AT; +5% ability damage |
| Priest | +1% nearby party attack aura | +0.2 nearby party defense aura | +2 range; +1 basic healing |
| Spearman | +1.5 maximum AT | +0.5 minimum AT; +1% critical chance, cap 40% | LP |
| Gunner | +2% weapon damage | Attack delay divided by 1 + DEX × 0.02 | +3% ability damage |
| Whipper | +0.5 minimum and maximum AT | Extra ability activation per 5 DEX | LP |

The in-game expandable class guide shows LP bonuses and exact effects for the selected character. These are this game's balance rules, inspired by Stick Ranger, with INT and two SP per level as requested; they are not a claim of exact original class formulas. AGI is attack delay in 30-fps frames; lower is faster. Damage and delay are rolled within the displayed ranges.

## Equipment and abilities

`gear.js` defines 88 class-specific weapons: starting, iron, heavy, steel, and seven elemental/support variants per class. Examples include Sword (1–5), Iron Sword (5–10), Fire/Thunder/Ice Swords (10–15), and Long Sword (10–20, 35 range). Physical weapons can exceed an elemental weapon's basic attack. Higher-tier items have level requirements. Every monster, including bosses and summoned minions, rolls once for a **2% total drop chance**. There are no guaranteed drops. A successful drop is 50% a weapon for a class present in the party and 50% a rune artifact (about 1% each per kill).

Each hero has two **RUNE** slots directly below their weapon. Drag between **ITEM**, **WEAPON**, and **RUNE** slots to equip, unequip, swap, or rearrange. Empty slots remain valid drop targets. Invalid class/level swaps and drops outside slots leave items untouched. Touch dragging works as well. For keyboard or click-only use, select the source slot then the destination. Escape cancels selection. Hover/focus an item to inspect it. Dragging equipment temporarily holds the simulation so slots stay stable.

Every successful basic attack adds INT to the equipped weapon's MP. **2 INT + a 10-MP weapon = ability on the fifth hit.** Missed/discarded projectiles, healing, damage over time, and bonus attacks do not charge. Multi-target attacks charge once. Killing hits charge. MP resets to zero on activation or equipment swap, with no overflow or multiple activations from a high-INT hit (apart from the Whipper's explicit extra activations). Projectiles from an old weapon cannot charge a replacement.

- Fire: 10 ground damage pulses over a second.
- Ice: damage, 0.7-second freeze, then 40% slow for 2 seconds.
- Poison: four damage ticks over 4 seconds; reapplication refreshes, not stacks.
- Lightning: damage chains to up to three enemies.
- Bloom: heals living party members.
- Vampire: bonus damage restores the attacker's health.
- Impact: area damage and a 1.2-second stun.

## Rune artifacts

Runes work for every class. Two slots per hero; two identical runes are allowed. Their bonuses add together, with elemental resistance capped at 75%. Removing a rune immediately removes its effect. Equipping vitality raises maximum LP without healing; unequipping clamps LP to the new maximum. Equipment changes reset MP and invalidate in-flight charging as before.

| Rune | Effect |
| --- | --- |
| Leech | Heal 8% of actual basic-hit damage, including killing hits, excluding overkill and ability damage |
| Ward | Reduce elemental damage by 25%; spitter projectiles are poison, summoner projectiles are lightning; physical damage is unaffected |
| Wisdom | +20% EXP for the wearer; fractional EXP is retained |
| Haste | +15% attack rate, applied to basic attacks and basic healing |
| Might | +15% minimum and maximum basic AT |
| Reach | +15 attack/support range |
| Vitality | +20% maximum LP |
| Renewal | Regenerate 1 LP per second while alive in an area |

Runes cannot go in weapon slots and weapons cannot go in rune slots. Swaps validate both destinations before changing anything. Inventory slots hold either kind of item. Pausing also pauses regeneration. Existing inventory items remain intact when loading an older save.

## Areas, controls, and saves

Nine areas load their complete encounters on entry. Only purple summoners spawn extra enemies (maximum three each). On clear, living characters walk off the right edge into the next area. Surviving heroes recover 25% maximum LP, and fallen heroes return with half LP. Defeat permits retrying with earned levels and equipment.

SPACE pauses, 1–4 select characters, and 1x toggles double speed. Losing window focus pauses combat. Saves use `bramblebound-v3` with schema version 4; v2 saves migrate levels, gold, XP, and old numeric equipment to named class weapons. Existing levels receive a budget of 2 × (level − 1) SP minus spent attributes, including the retroactive extra points. Reloading does not grant the top-up again. Equipped runes persist. v2 data remains untouched as a fallback. The game does not save encounter positions; reload restarts the saved area.

## Validation

Run `node smoke-test.cjs`. It checks XP/SP, class scaling, 2 INT/10 MP, proc guards, killing hits, stale projectiles, inventory swaps and unequipping, wrong-class/level rejection, effects, fixed encounters, summoners, area exits, opening balance, save reload, and migration.

Reference: [DAN-BALL's game controls and stat glossary](https://dan-ball.jp/en/javagame/ranger/), plus the user's supplied weapon table. Item effects and class mechanics are implemented locally in `gear.js` and `game.js`.
