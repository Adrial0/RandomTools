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

Weapons, runes, gems and souls drop at the exact tier of their zone. Starter weapons are tier one. Standard classes have seven weapons in each zone/tier: four elemental, two physical and one special. Mage has five or six, Priest and Summoner six, and Bard five. Retired weapons remain usable in existing saves but no longer appear in stock or drops. Sources are spread through the twenty normal areas of that zone, with at most one new weapon per class per area and some areas without an unlock. Existing item IDs remain valid; original weapons now belong to tier one. Later tiers change attack patterns as well as damage. See WEAPONS.md for the complete catalogue. Weapon drops begin on stage 3–5 of their source area; earlier stages still provide XP, gold, potions and socket drops. Monsters retain their fixed one- or two-weapon tables. Major bosses draw two weapons from their own zone. Weapon shop stock unlocks only after completing the source area. Rune and gem shops offer tiers earned through completed areas, up to the current highest cleared zone.

All six rune families now have six tiers. Existing drop probabilities and price sequences are retained. Enemy levels rise from 1 to 99 across the full route.

## Boss attacks

Major encounters use distinct pattern rotations. The knight combines a marked ground strike and projectile fan; the scorpion uses bombs and arrows; the kraken creates delayed ground waves; the giant combines frost eruptions and arrows; the construct uses fiery eruptions and bombs. The lich combines low bone volleys, delayed curses at each hero's marked position, and a broad, slower soul volley. Ground eruptions can be avoided by lifting characters; curses require moving away from the marked position. Boss specials bypass Rogue dodge.

Defeating the lich marks Castle cleared and displays the victory message. It does not reset the party, inventory, or world; replay bonuses are deferred.

## Saved games

World schema 3 remaps the old 18-area route to corresponding biomes. Previously cleared progression is credited through the mapped area so old saves do not become trapped behind newly inserted gates. Party, inventory, gold, equipment and sockets are preserved. The migration is recorded on the next save and does not repeat.
The compact map update migrates schema-2 saves by region and area number, preserving completed progress and crediting inserted nodes behind it. Saved stage indices are clamped to the new area length. The expanded area count retains the previous world-wide enemy health and level endpoints.
