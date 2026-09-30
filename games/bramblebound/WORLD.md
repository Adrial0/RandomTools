# World progression

| Tier | Zone | Regions | Major arena | Boss |
| --- | --- | --- | --- | --- |
| 1 | Lowlands | Grassland, Woodland, Marsh, Caverns | Fort | Armored Knight |
| 2 | Desert | Canyon, Dunes, Oasis, Tombs | Pyramid | Giant Scorpion |
| 3 | Coast | Beach, Cliffs, Reef, Caves | Lighthouse | Kraken |
| 4 | Mountains | Hills, Peaks, Snowfield, Glacier | Citadel | Ice Giant |
| 5 | Volcano | Ashland, Crater, Lava, Depths | Forge | Molten Construct |
| 6 | Kingdom | Farmland, Sewers, City, Barracks | Castle | Lich King |

Each region has five normal areas, each with 5–8 stages including its boss encounter. Normal stages can be skipped; bosses must be defeated. Each zone concludes with one dedicated, single-stage arena containing one major boss. Major bosses have 30 times area base HP (ordinary solitary bosses have 10 times) and stronger attacks. The last area in each normal region retains its five-member guardian pack.

There are 120 normal areas and six major arenas. A major boss gates the next zone. Each zone has a town and a Rune Trader branch unlocked after its first region. Area nodes remain hidden until unlocked. The map spans six viewport widths (roughly one zone per screen) and supports horizontal panning.

## Items

Weapons, runes, gems and souls drop at the exact tier of their zone. Starter weapons are tier one. Standard classes have seven weapons in each zone/tier: four elemental, two physical and one special. Mage has five or six, Priest and Summoner six, and Bard five. Retired weapons remain usable in existing saves but no longer appear in stock or drops. Sources are spread through the twenty normal areas of that zone, with at most one new weapon per class per area and some areas without an unlock. Existing item IDs remain valid; original weapons now belong to tier one. Later tiers change attack patterns as well as damage. See WEAPONS.md for the complete catalogue. Every enemy species, including major bosses and opening-stage enemies, has a weapon drop from its zone. Species retain the same weapon across areas, and each weapon has one or occasionally two species as sources. There is no stage-number restriction. Weapon shop stock unlocks only after completing the source area. Rune and gem shops unlock each item after its source area is cleared.

All six rune families now have six tiers. Existing drop probabilities and price sequences are retained. Enemy levels rise from 1 to 99 across the full route.

## Boss attacks

Major encounters use distinct pattern rotations. The knight combines a marked ground strike and projectile fan; the scorpion uses bombs and arrows; the kraken creates delayed ground waves; the giant combines frost eruptions and arrows; the construct uses fiery eruptions and bombs. The lich combines low bone volleys, delayed curses at each hero's marked position, and a broad, slower soul volley. Ground eruptions can be avoided by lifting characters; curses require moving away from the marked position. Boss specials bypass Rogue dodge.

Defeating the lich marks Castle cleared and displays the victory message. It does not reset the party, inventory, or world; replay bonuses are deferred.

## Saved games

World schema 3 remaps the old 18-area route to corresponding biomes. Previously cleared progression is credited through the mapped area so old saves do not become trapped behind newly inserted gates. Party, inventory, gold, equipment and sockets are preserved. The migration is recorded on the next save and does not repeat.
The compact map update migrates schema-2 saves by region and area number, preserving completed progress and crediting inserted nodes behind it. Saved stage indices are clamped to the new area length. The expanded area count retains the previous world-wide enemy health and level endpoints.

## Optional routes

Each zone branches from the third area of its second region into two side areas and a single-stage boss arena. These dead-end routes never unlock or gate the next zone. Existing area IDs and main-route scaling remain unchanged; optional encounters scale to their fork's part of the zone. All encounters retain zone-tier loot, and optional bosses each have an exclusive ability weapon and a unique soul.

| Zone | Route | Boss | Resistance |
|---|---|---|---|
| Lowlands | Quarry 1 → Quarry 2 → Quarry | Stone Colossus | 40% physical |
| Desert | Vault 1 → Vault 2 → Vault | Crystal Scarab | 40% nonphysical |
| Coast | Grotto 1 → Grotto 2 → Grotto | Coral Beast | 35% poison |
| Mountains | Nest 1 → Nest 2 → Nest | Storm Owl | 35% lightning |
| Volcano | Tunnel 1 → Tunnel 2 → Tunnel | Ash Serpent | 35% fire |
| Kingdom | Crypt 1 → Crypt 2 → Crypt | Royal Specter | 35% ice |

Ordinary mushroom creatures resist poison by 35%. Shell Cannon resists physical damage by 25%, and Ceiling Eye resists lightning by 30%. Resistances belong to individual species, never entire zones. Landed damage remains at least 1. Nonphysical resistance covers every damage type except physical; it does not multiply with a matching elemental resistance. Boss control resistance remains separate.

Enemy pressure tuning: special attacks deal 75% previous damage. Major/ordinary/swarm boss special cooldowns are 1.9/2.3/3.3 seconds with a 0.75-second warning; ground eruptions warn for another 0.9 seconds. Boss specials can start across the arena. Non-melee profile attacks deal 80% damage with 75% cooldown and a 0.55-second cast. Basic melee damage and independently tuned poison ticks are unchanged.

Boss specials now rotate through body-themed recipes with varied counts, arcs, speeds, sizes and short homing windows. New recipes include gapped rings, rotating crosses, staggered aimed streams and slow heavy orbs. Projectile specials fire without targeting warnings; melee windups, instant clouds and ground-strike markers remain. Bomb landing markers are removed.

Enchantments: eight socket-item families across the six zone tiers, priced at 1,000 gold per tier. Damage tables follow the requested poison/fire/ice/lightning curves; poison duration adds 1s/tier, fire duration starts at 0.4s then adds 0.2s/tier, cold adds 5 percentage points/tier, and freeze adds 0.1s/tier after base weapon timing. Boss resistance still applies to the final effect. Summons inherit enchantments. Enchanters branch from each zone’s third Marsh-equivalent area, use source-area shop unlocking, and share the 1% socket-item drop pool. The map uses a hand-shaped route around landmarks and 360% canvas width instead of 600%.
