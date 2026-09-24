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
| Priest | +1% nearby party attack aura | +0.2 nearby party defense aura | +2 aura range |
| Spearman | +1.5 maximum AT | +0.5 minimum AT; +1% critical chance, cap 40% | LP |
| Gunner | +2% weapon damage | Attack delay divided by 1 + DEX × 0.02 | +3% ability damage |
| Whipper | +0.5 minimum and maximum AT | Extra ability activation per 5 DEX | LP |

The in-game expandable class guide shows LP bonuses and exact effects for the selected character. These are this game's balance rules, inspired by Stick Ranger, with INT and two SP per level as requested; they are not a claim of exact original class formulas. AGI is attack delay in 30-fps frames; lower is faster. Damage and delay are rolled within the displayed ranges.

## Equipment and abilities

`gear.js` defines 88 class-specific weapons: starting, iron, heavy, steel, and seven elemental/support variants per class. Examples include Sword (1–5), Iron Sword (5–10), Fire/Thunder/Ice Swords (10–15), and Long Sword (10–20, 35 range). Physical weapons can exceed an elemental weapon's basic attack. Higher-tier items have level requirements. Every monster, including bosses and summoned minions, rolls once for a **2% total drop chance**. There are no guaranteed drops. A successful drop is 50% a weapon for a class present in the party and 50% a rune artifact (about 1% each per kill).

Each hero has two **RUNE** slots directly below their weapon. Drag between **ITEM** and **WEAPON** slots to equip, unequip, swap, or rearrange. Drag a loose rune into an empty weapon socket to bind it permanently. Empty slots remain valid drop targets. Invalid class/level swaps and drops outside slots leave items untouched. Touch dragging works as well. For keyboard or click-only use, select the source slot then the destination. Escape cancels selection. Hover/focus an item to inspect it, including permanently socketed runes. Party portraits use fixed neutral drawings independent of combat pose. Equipment row labels sit to the left; AT, AGI, and RANGE sit beside STR, DEX, and INT. Item corner labels show only the level number. Combat continues while equipment is being dragged. Pointer capture belongs to the stable app container, so inventory refreshes do not interrupt a drag.

Every successful basic attack adds INT to the equipped weapon's MP. **2 INT + a 10-MP weapon = ability on the fifth hit.** Missed/discarded projectiles, healing, damage over time, and bonus attacks do not charge. Multi-target attacks charge once. Killing hits charge. MP resets to zero on activation or equipment swap, with no overflow or multiple activations from a high-INT hit (apart from the Whipper's explicit extra activations). Projectiles from an old weapon cannot charge a replacement.

- Fire: 10 ground damage pulses over a second.
- Ice: damage, 0.7-second freeze, then 40% slow for 2 seconds.
- Poison: four damage ticks over 4 seconds; reapplication refreshes, not stacks.
- Lightning: damage chains to up to three enemies.
- Bloom: heals living party members.
- Vampire: bonus damage restores the attacker's health.
- Impact: area damage and a 1.2-second stun.

## Rune artifacts

Runes work for every class. Two slots per hero; two identical runes are allowed. Their bonuses add together, with elemental resistance capped at 75%. Runes permanently bind to the individual weapon. Occupied sockets cannot be replaced or emptied. Swapping, storing, or selling a weapon carries its two runes with it; two copies of the same weapon can have different sockets. Equipping a weapon with vitality raises maximum LP without healing; unequipping the whole weapon clamps LP to the new maximum. Equipment changes reset MP and invalidate in-flight charging as before.

| Rune | Effect |
| --- | --- |
| Leech | Heal 8% of actual basic-hit damage, including killing hits, excluding overkill and ability damage |
| Ward | Reduce elemental damage by 25%; spitter projectiles are poison, summoner projectiles are lightning; physical damage is unaffected |
| Wisdom | +20% EXP for the wearer; fractional EXP is retained |
| Haste | +15% attack rate, applied to basic attacks and priest aura pulses |
| Might | +15% minimum and maximum basic AT |
| Reach | +15 attack/support range |
| Vitality | +20% maximum LP |
| Renewal | Regenerate 1 LP per second while alive in an area |

Runes cannot go in weapon slots and weapons cannot go in rune slots. Swaps validate both destinations before changing anything. Inventory slots hold either kind of item. Manual pausing also pauses regeneration. Existing inventory items remain intact when loading an older save.

## Areas, controls, and saves

The journey starts in a Town stage with a shop and inn. Healing and reviving at the inn cost 1 gold per 10 total missing party LP, rounded up. The inn displays the current price and refuses treatment without enough gold. A fully healthy party costs nothing. Shops buy inventory items. Town shop stock follows cleared areas and stays at least one loot tier behind the latest cleared area's drop ceiling; starting stock is basic weapons. Nine combat areas each contain 5–8 stages, with one boss on the final stage. Each stage loads its fixed encounter on entry. Only purple summoners spawn extra enemies (maximum three each). After a clear, the party stops pursuing and stays in place. Move any one living character into the NEXT sign to enter the next stage; touching it after the final boss stage unlocks the next map locations. Flying above the sign does not activate it. Undiscovered locations and paths are hidden entirely. Grassland 3 branches to the Rune Trader, who has a separate stage and shop. Rune stock expands with cleared areas, at 80 gold per rune. Cleared areas can be revisited.

Current LP persists between areas and through reloads. Level-ups and stat allocation increase maximum LP without healing. Fallen characters stay fallen until healed at Town. Each enemy independently has a **5% chance** to drop one ground HP potion, separate from the 2% equipment roll. A living character walking over it immediately consumes it and heals 30% of their maximum LP, capped at full health. Dragging a character above it does not collect it; land the intended character on the potion. Existing healing abilities and runes still work.

Hover or focus an item or character to show its information in the left panel alongside the equipment grid. Moving away restores the selected character's stats. To sell, select an inventory item while visiting Town or the trader and use the displayed sell button.

SPACE pauses, 1–4 select characters, and 1x toggles double speed. Losing window focus releases held pointers but does not pause combat. The world map suspends the encounter; Return to battle resumes it. Browsers may independently throttle or suspend hidden tabs. Saves use `bramblebound-v3` with schema version 6, persisting health, cleared locations, and gear. Older saves without health initialize it once. v2 saves migrate levels, gold, XP, and old numeric equipment to named class weapons. Existing levels receive a budget of 2 × (level − 1) SP minus spent attributes, including the retroactive extra points. Reloading does not grant the top-up again. v2 data remains untouched as a fallback. Encounter positions are not saved; reload opens Town on the map without automatically healing.

## Movement and attacks

Some enemies telegraph dangerous volleys for 0.95 seconds: seven straight bullets in a fan, five gravity-driven arrows, one timed bomb, or three homing missiles. Bosses cycle through all four. Special hits deal 3–4 times normal attack damage before defenses. Ordinary enemy damage is now 6 + 1.5 × area; bosses use 10 + 2 × area. Straight shots retain their launch direction, missiles turn at a limited rate and stop tracking after 0.8 seconds and expire after 1.6 seconds (about 144 pixels of travel), and bombs travel on a slower 1.9-second arc and explode after 2.6 seconds with a ground warning. Enemy projectiles collide with character bodies rather than guaranteeing a hit on their original target. Remaining projectiles can still hurt characters after the last enemy dies.

Dragging pulls the body toward the cursor through a damped spring rather than teleporting it. Faster cursor movement increases spring strength and follow-speed limits; slow movement keeps the gentle lag. Releasing preserves actual body velocity, with light air drag and gravity. Holding still lets the spring settle. Characters cannot initiate attacks or priest healing while airborne; pending melee strikes are cancelled in the air. Existing projectiles keep flying. Landings compress the body into a brief springy crouch, and arms and weapons sway with irregular phases while walking or falling. Walking feet advance while lifted and move backward relative to the body while planted, with both knees bending forward. The priest's left-panel readout shows total attack aura percentage, flat defense bonus, and aura range.

Heroes use velocity-based movement with acceleration, coasting, gravity, terrain-step hopping, and impact impulses. Damped springs drive body lean and weapon recoil; jointed legs bend and lift with the walking cycle, and dangle while airborne. Melee hits resolve after a 90 ms swing windup and recheck reach at impact. Successful strikes knock enemies back. Ranged attacks retain projectile travel time. This is a controlled body simulation with procedural spring animation, not a full independently colliding ragdoll for every limb. Simulation uses substeps of at most 1/120 second, with bounded catch-up after stalls.

## Validation

Run `node smoke-test.cjs`. It checks XP/SP, class scaling, 2 INT/10 MP, proc guards, killing hits, stale projectiles, inventory swaps and unequipping, wrong-class/level rejection, effects, fixed encounters, summoners, area exits, opening balance, save reload, and migration.

Reference: [DAN-BALL's game controls and stat glossary](https://dan-ball.jp/en/javagame/ranger/), plus the user's supplied weapon table. Item effects and class mechanics are implemented locally in `gear.js` and `game.js`.


## Combat balance update

Level requirements are now `100 + 80 × level + 10 × level²` XP: level 2 takes 190 XP rather than 45. Existing levels and spent stats are preserved. Priests pulse basic damage to all enemies within their circular aura; each pulse charges MP once. Their normal attack no longer heals. Allies must be within that same radius to receive attack and defense buffs; elemental healing abilities remain available.

Normal area HP follows 20, 40, 60, 80, 100, 130, 160, 190, 220, 250, 290, 330, 370, 410, 450, 500. Bosses have exactly ten times base area HP. Summoners have 125% base health; summoned minions have 55%. The current nine areas use the first nine entries.

Weapon prices by family progression are 100, 250, 500, 750, 1000, then 1500 and increments of 500 through 10000, followed by increments of 1000. The family order is basic, iron, fire, lightning, ice, heavy, poison, impact, bloom, vampire, steel. Unlocks still depend on cleared areas. Rune prices remain 80.

Weapon silhouettes and grips are drawn consistently in combat, portraits, and inventory. Player arrows have ballistic arcs; other player shots keep their launch direction. All player and enemy projectiles check terrain along their path, and bombs stop on terrain before exploding. Characters still fire at targets in range even when terrain obstructs the shot. Heroes and enemies hop onto ledges using gravity rather than snapping upward, including when approaching a wall while airborne.


Close-range slashers appear among regular encounters. Their forward slash has a 0.18-second windup, a single hit up to 29 pixels away in the first three areas, or 55 pixels later, and disappears 0.14 seconds after impact. Lifting or moving a hero out of reach dodges it. Weapon attacks now use a stronger backswing, spring recoil, without any melee swing trails.

Select a fallen character to show the compact `Revival $ …` button beneath LP. Revival restores 10% maximum LP (rounded up), costs the greater of 10% of current gold (rounded up) or 10 × character level, and requires enough gold. It works for individual fallen characters during encounters. A full party wipe automatically returns everyone to Town at 5% maximum LP (rounded up), with no gold deduction. Reviving does not heal other party members.


Starter melee enemies have 12-pixel basic reach; early slashers have 22-pixel attack range plus 7-pixel hit tolerance. The character AT display includes all living priests whose circular auras contain that character, stacking additively, and updates as characters move. Melee weapon trails have been removed; physical weapon swing motion remains.
## Enemy variety

Grassland gradually introduces swarmlings, hoppers, and beetles alongside slimes and slashlings. Woodland adds thorn archers, ember toads, and moss shamans. Caverns mix the tougher creatures with spitters and summoners. The first stage remains a simple melee encounter. Bosses remain on final stages.

| Enemy | Behavior |
| --- | --- |
| Swarmling | Fast packs of three, each with half base HP and short melee reach |
| Iron Beetle | Slow melee tank with 180% base HP and stronger bites |
| Hopper | Briefly crouches before leaping toward its target |
| Thorn Archer | Fires ballistic arrows and retreats when approached |
| Ember Toad | Slow creature that only attacks with a telegraphed single bomb |
| Moss Shaman | Heals nearby wounded enemies for 20% of their maximum HP, up to three casts |

Each type has a distinct silhouette and color. Hover an enemy on the battlefield to see its name, stats, and behavior in the left panel. Swarmling packs are part of the initial encounter; only summoners create reinforcements.
## Physics-driven enemies

- **Stilt Spider:** accelerates into a scuttle with six jointed legs. Feet stay planted until their stride stretches, then lift in staggered steps that follow the terrain.
- **Boulder Roller:** builds up to a fast roll, rotates with distance traveled, and retains momentum when reversing direction.
- **Crooked Bat:** flaps its wings and follows a damped, irregular flight path, dipping toward characters to bite.
- **Hopper:** now moves through repeated crouch–jump–land cycles rather than walking between occasional jumps.
- **Rock Lobber:** winds up for 0.9 seconds and fires one heavy rock on a slow 2.2-second ballistic arc. Hits deal four times its normal attack damage. Rocks collide with terrain and characters, disappear on impact, and never explode.

Spiders and rollers appear in Grassland after the opening stage. Bats and rock lobbers enter Woodland encounters and return in Cavern mixes. These are fixed encounter members, not timed reinforcements.
## Gems and enemy-level XP

Six colored gem families share the two permanent weapon sockets with runes. Ten tiers are defined; each tier multiplies the first-tier bonus. Ruby (red) gives +5 STR per tier, Emerald (green) +5 DEX, Sapphire (blue) +5 INT, Amethyst (purple) +2 to all three, Diamond (white) +1 flat defense, and Topaz (gold) +50 maximum LP. Attribute gems apply normal class-specific stat effects. Increasing maximum LP does not heal. Gems remain bound when weapons move or are saved.

Gems join the existing 2% item-drop roll without increasing its chance: half of successful drops are weapons, half are eligible runes/gems. Gem drop tiers follow area progression. The rune trader sells unlocked gems for 100 gold per tier. Higher-tier gems require a matching character level to socket.

Area enemy levels are 1, 3, 5, 7, and so on, shared by every stage in that area. Each character receives full combat XP up to five levels above the enemy. At six levels above, XP is 90%; each additional level subtracts another 10 percentage points. At fifteen or more levels above, the reward reaches the floor of 1 XP per kill. Wisdom bonuses apply before that minimum is enforced.

AGI is attack delay in 30-fps frames: 30 is one second, 15 is half a second, and 20–30 rolls a delay between about 0.67 and 1 second. Lower is faster; character stat and haste bonuses are already included in the displayed AGI. Manual 2× game speed also doubles real-time attack frequency.
## Control balance and extended world

Freeze duration scales with the character's effective attack delay: `min(0.7, 0.7 × average AGI / 85)` seconds, with a 0.06-second minimum. A base ice spear freezes for about 0.26 seconds; haste and speed stats shorten it further. Frost Orb has a base 80–90 AGI. Ice now slows by 20% for one second after freezing. Stuns use the same scaling with a 0.6-second maximum. Boss freeze and stun durations are multiplied by 0.2; slow strength is multiplied by 0.3 (a 20% slow becomes 6%). Special-ability power is reduced to 65% of its former value, before rounding.

Later bows include Twin Poison Bow (two arrows), Triple Poison Bow and Triple Ice Bow (three), and Volley Bow (four). Each arrow can deal damage, but the volley shares one MP-charge token. These weapons use normal progression-gated drops and shops.

The world now has 18 areas: three each of Grassland, Woodland, Cavern, Desert, Mountains, and Snowfields. New regions have their own terrain palettes and scenery, still with 5–8 stages and a final boss per area. The map spans three screen widths: hover near either edge to pan, or use the arrow buttons/scrollbar. Undiscovered location nodes remain hidden, and older saves retain their progress.
