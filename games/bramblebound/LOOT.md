# Loot rules

All rolls are independent and happen only when a monster dies. Skipping a stage gives no drops.

| Drop | Normal enemy | Swarm enemy | Boss |
|---|---:|---:|---:|
| Weapon | 5% | 2.5% | 10% |
| Rune or gem, combined | 1% | 1% | 1% |
| Soul | — | — | 10% |
| HP potion | 30% | 15% | 30% |

Every enemy species has a weapon drop, including enemies in opening stages. Its weapon stays the same wherever that species appears within the zone. Each weapon belongs to one enemy species, occasionally two; tables are independent of party composition. There is no stage-number restriction. Boss weapon percentages are combined across their table. Tables are defined by WEAPON_DROPS in game.js. All active non-starter weapons are represented.

Souls occupy the same two weapon sockets as runes and gems. They bind to the weapon and are not sold by the Rune Trader. Existing Leech and Wisdom runes become tier-one Souls, including those already socketed in saved games.

| Soul | Tier 1 | Increase per tier | Tier 6 |
|---|---:|---:|---:|
| Wisdom | +10% XP | +5 percentage points | +35% XP |
| Leech | 2% lifesteal | +1 percentage point | 7% lifesteal |
| Fortune | +5% equipment drop rates | +2 percentage points | +15% equipment drop rates |

All equipment drops use the exact zone tier: Lowlands 1, Desert 2, Coast 3, Mountains 4, Volcano 5, Kingdom 6. Each boss Soul roll chooses equally between the three families at that zone's tier. Rune and gem rolls also use that exact tier.

Fortune bonuses from living party members add together and multiply equipment drop chances. For example, one tier-one Fortune Soul changes a normal weapon roll from 5% to 5.25%. They do not affect HP potion or gold drops.

HP potions heal the collecting character for 20% of maximum HP, rounded up and capped at maximum HP. Full-health characters leave potions on the ground. Potions cannot revive dead characters. The displayed health stat is HP; the legacy internal lp field is retained for save compatibility.

## Knockback Rune

| Tier | Chance per direct hit | Knockback |
|---|---:|---:|
| 1 | 25% | 10 |
| 2 | 50% | 10 |
| 3 | 50% | 15 |
| 4 | 100% | 15 |
| 5 | 30% | 45 |

No automatic knockback is applied on damage or ordinary melee hits. Rune knockback is a horizontal impulse, reduced by body size for regular enemies; bosses receive 10% strength, and enemies marked immobile receive none. Repeated damage-over-time ticks do not trigger it. Summoner sockets apply the effect to summons. These five tiers join the existing rune loot pool and Rune Trader stock at their corresponding tiers and normal rune prices. No sixth tier is added.

## Optional boss loot

Weapon and soul rolls remain independent at 10% each. Each listed item drops exclusively from its boss. Weapons become purchasable after clearing that boss; souls are not sold. Each soul has one version only.

| Boss | Weapon | Ability | Soul |
|---|---|---|---|
| Stone Colossus | Quarry Blade (Warrior, tier 1) | Delayed ground slam and stun | +50% AT, −50% maximum HP; Warrior/Rogue/Reaper |
| Crystal Scarab | Prism Staff (Mage, tier 2) | Three lightning shards | Projectiles pass through terrain; Ranger/Mage/Bard/Summoner |
| Coral Beast | Coral Scythe (Reaper, tier 3) | Nearby life drain | +3 HP/s, −15% AT |
| Storm Owl | Storm Bow (Ranger, tier 4) | Lightning chain | +25% attack speed, −20% maximum HP |
| Ash Serpent | Ash Daggers (Rogue, tier 5) | Three fire eruptions | +25% AT, −15% elemental resistance |
| Royal Specter | Royal Staff (Mage, tier 6) | Wide freezing pulse | +20% XP, +10% equipment drops |

Rune and gem families have source areas distributed across their zone. Drops become eligible from that source area onward within the same zone; Rune Trader stock requires completing the source area. Entering a zone alone does not unlock its entire socket tier. Sources are stored on each item's sourceArea field.

## Defense and elemental wards

Priest aura defense (including self and allied summons), gem defense, and Bard attack reduction affect physical damage only. Bard STR reduces physical attack by 0.5 per point; elemental attacks ignore that reduction. Bard DEX grants +0.25 damage taken per point to every damage type. Direct hits receive the full bonus; fire pulses every 0.1 seconds receive 10% per pulse, while poison ticking 30 times per second receives 1/30 of the bonus per tick. Enemy resistance applies after this bonus.

General Ward Rune resistance is 10%, 13%, 16%, 19%, 22%, 25%. Fire, Ice, Poison and Lightning Ward Runes each grant 25%, 30%, 35%, 40%, 45%, 50% resistance to their matching element. General and matching resistance add, capped at 75%. These wards follow the normal source-area shop unlock rules. Damage numbers move right for enemies and left for heroes and allied summons.
