# Loot rules

All rolls are independent and happen only when a monster dies. Skipping a stage gives no drops.

| Drop | Normal enemy | Swarm enemy | Boss |
|---|---:|---:|---:|
| Weapon | 5% | 2.5% | 10% |
| Rune or gem, combined | 1% | 1% | 1% |
| Soul | — | — | 10% |
| HP potion | 30% | 30% | 30% |

Each species has a fixed table containing one or two weapons, independent of party composition. A successful weapon roll selects equally from that table. Boss weapon percentages are combined across their table. Tables are defined by WEAPON_DROPS in game.js. All non-starter weapons are represented.

Souls occupy the same two weapon sockets as runes and gems. They bind to the weapon and are not sold by the Rune Trader. Existing Leech and Wisdom runes become tier-one Souls, including those already socketed in saved games.

| Soul | Tier 1 | Increase per tier | Tier 6 |
|---|---:|---:|---:|
| Wisdom | +10% XP | +5 percentage points | +35% XP |
| Leech | 2% lifesteal | +1 percentage point | 7% lifesteal |
| Fortune | +5% equipment drop rates | +2 percentage points | +15% equipment drop rates |

Soul tiers follow regions: Grassland 1, Woodland 2, Cavern 3, Desert 4, Mountains 5, Snowfields 6. Each boss Soul roll chooses equally between the three families at that region's tier.

Fortune bonuses from living party members add together and multiply equipment drop chances. For example, one tier-one Fortune Soul changes a normal weapon roll from 5% to 5.25%. They do not affect HP potion or gold drops.

HP potions heal the collecting character for 20% of maximum HP, rounded up and capped at maximum HP. They cannot revive dead characters. The displayed health stat is HP; the legacy internal lp field is retained for save compatibility.
