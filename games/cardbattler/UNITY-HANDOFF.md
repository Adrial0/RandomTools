# Cardbattler — Unity handoff

## Purpose and user requirements

Migrate the existing browser game into a Unity 2D game intended for eventual Steam release. The game has no final name yet.

The user explicitly wants the board, hand, shop, buttons, card detail panel, and other layout elements **visible and editable in the Unity editor before entering Play mode**. Create saved scenes and reusable prefabs with serialized references. Do not generate the entire interface only at runtime. Preserve the user's layout changes when Play starts. Runtime card instances can be created from prefabs inside editor-positioned containers.

The user has requested this handoff document, not yet the creation of the Unity project. Find the actual Unity project folder and installed editor version before starting migration. Keep the browser project as a reference during the port.

## Source project

Browser project: `D:/DnD/RandomTools/games/cardbattler`.

Important files:

- `engine.js`: combat, card profiles, economy, run progression, save migrations, and abilities.
- `game.js`: browser presentation, drag deployment, timed merge gesture, inspector, shop, and dialogs.
- `engine.test.cjs`: 60 passing tests at the last balance update. Use these as behavioral references when translating rules to C#.
- `index.html`, `style.css`, `compact.css`, `portraits.css`: current interface and layout.
- `data/cards.json`: 80 player card definitions, including themes, keywords, colors, and design notes. Some designs are unfinished.
- `data/merges.json`: 72 merge recipes.
- `data/enemies.json`: 24 distinct enemy cards across eight themes, plus summons. Contains preserved workbook drafts too.
- `data/rules.json`: game rules and balance settings.
- `data/implemented-abilities.json`: generated snapshot of implemented descriptions, stats, keywords, and pending fields.
- `build-data.cjs`: regenerates bundled browser data and the implemented-ability snapshot.
- `README.md`: fuller source documentation.

The engine is the authority for current behavior. Raw workbook notes and pending designs are reference material, not instructions to implement or claim finished abilities. Verify the current files before porting; this handoff records the conversation's latest state.

Original spreadsheet: `C:/Users/adria/Downloads/cards (4).xlsx`. Do not modify it. Original workbook cells are preserved in `data/source-workbook.json`.

## Battle rules

- Square 6×6 board. The top and bottom base rows are included in those six rows.
- Enemy base is row 0; player base is row 5. Player units advance upward; enemy units advance downward.
- Player deployment is by dragging a hand card onto an empty tile in rows 3–5, including the player's base row. Deployment costs no extra gold. Agent has its own expanded deployment rule.
- Clicking a card or unit inspects it; clicking tiles does not deploy.
- The player ends their turn, the player's army activates, then the enemy army activates.
- Fixed activation order: front to back, left to right for the player, mirrored for the enemy. Use a snapshot so movement cannot activate a unit twice and new summons wait until the next army activation.
- Default movement is one tile forward. Normally a unit attacks or moves; Rush permits movement followed by an attack.
- Units attack forward unless an ability or keyword changes targeting. Ranged attacks pass through friendly units and stop at the first eligible enemy within range.
- Units cannot enter the opposing base row. They attack it from the adjacent row. A defender on that base row protects its column and must be defeated first.
- Base health: player 45; enemy 48 + 12 per later battle.

## Hand, shop, and merging

- Cards are purchased from a six-offer shop and added to the hand. No normal card drawing system.
- Start each run with 30 gold. New battles provide at least 30 gold while preserving a higher carried balance.
- Gain 10 gold per round, plus 1 per surviving, unsilenced Miner or Businessman.
- Shop refreshes each round. Paid reroll costs 10 gold. Hand purchase limit: 10 cards.
- Prices: tier 1 = 5 gold, tier 2 = 15, tier 3 = 35.
- Tier 3 shop offers unlock on turn 6 or battle 3. Read the engine for offer selection.
- No separate merge row. Drag a hand card over another compatible hand card, hold for 900 ms while a circular indicator fills, then release on that same target to merge.
- Releasing early or elsewhere cancels. Leaving or changing targets resets progress. Cancel on Escape, focus loss, or pointer cancellation.
- Preserve any recipe-choice behavior where a combination has multiple results.

There are exactly four card colors, taken from spreadsheet formatting:

| Color | Hex | Base cards |
| --- | --- | --- |
| Red | #CC0000 | Robot, Alien |
| Blue | #073763 | Mage, Engineer |
| Green | #38761D | Thief, Raider |
| Yellow | #BF9000 | Caveman, Acolyte |

Merged cards inherit ingredient colors. Shared colors prevent merging, except the explicitly approved Blob self-merge. Upgraded Blobs can absorb more Blobs. Preserve stable card IDs and recipe IDs. Color strips communicate tier; do not add a tier number to cards.

## Roguelike progression

- Five battles per run and three lives outside battles.
- Losing a battle costs one life. Retry the same encounter while lives remain. At zero lives the run ends.
- Each battle starts with full player base health and no carried cards. Clear battlefield, hand, ownership ledger, and legacy card zones.
- Gold and artifacts carry over. Victory gives 50 + 20 per encounter index gold.
- Current between-battle purchase: War Banner, 80 gold, +15% damage. No card rewards or base repairs.

## Latest balance

The last change reduced health across all player cards, enemies, and summons by approximately 30%, with integer rounding and minimum health 1. Player damage was unchanged.

Examples of current player profiles: Robot 6 HP / 3 damage, Hacker 9 / 4, Warlord 12 / 6, Mech 14 / 6, Posthuman 23 / 10. Confirm profiles in the engine before encoding values.

Tier 2 has a modest +2 HP bonus before the global health reduction. Tier 3 has +3 HP before that reduction and +1 attack. Blob scaling applies afterward.

Enemy battle scaling now adds 10% health in battle one, increasing by five percentage points per encounter, rounded upward. No attack bonus in battles 1–3; +1 attack in battles 4–5. This replaced the previous 65% health / +2 attack starting bonus.

Opening enemy formations have four to six units spread across lanes. Reinforcements arrive every round, with an extra unit on even rounds from battle three onward. Summoned Broodlings do not receive normal reinforcement scaling.

Existing browser saves migrate once using `combatStatRevision: 2`, preserving proportional damage and accounting for charmed units' original side. Unity save compatibility with browser saves has not been requested; choose it deliberately rather than assuming it.

## Cards and abilities

All 80 player cards must remain available, even if their unique ability is unfinished. Port existing implemented behavior before inventing new designs. Preserve pending implementation metadata separately from player-facing descriptions.

Confirmed base roles: Robot Armor 1; Alien Venom; Mage melee splash with range 1 and no mana dependency; Thief stealth until first attack; Raider Rush; Caveman stronger base health; Acolyte adjacent healing. Engineer's special ability remains undecided.

The engine includes effects such as Faith healing, auras, status effects, summoned units, Mech explosion and pilot ejection, Symbiote attachment, Buddhist reincarnation, temporary charm, and Blob upgrades. Other arcane units currently use mana internally for splash; the base Mage does not. Do not introduce mana requirements for Mage.

Enemy cards must have distinct identities and artwork from player cards. Themes: Fantasy, Outlaw, Modern, Futuristic, Primal, Sci fi, Wasteland, Faith.

Enemy roster:

- Fantasy: Orc, Vampire, Zombie.
- Outlaw: Bandit, Hitman, Gang Boss.
- Modern: Riot Officer, Attack Dog, Mercenary.
- Futuristic: Combat Drone, Turret, Jammer.
- Primal: Wolf, Mammoth, Berserker.
- Sci fi: Stalker, Spitter, Broodmother.
- Wasteland: Feral, Toxic Spitter, Marauder.
- Faith: Zealot, Flagellant, Fallen Angel.

Use `enemies.json` and the engine for exact keywords and special abilities. Not every enemy needs a unique ability.

## Visual and text requirements

- Compact layout: all main controls and information should fit on a typical desktop screen without page scrolling.
- General run information belongs at the top, separate from the card detail panel.
- Center the hand beneath the battle area.
- Battlefield units show the character portrait, colored damage number in the bottom-left, and colored HP number in the bottom-right.
- No HP bar, stat icons, slash between damage and HP, visible unit name, tier/activation number, or tile labels on battlefield tiles.
- Hand cards also show character images and color strips.
- Card details show portrait, name, stats, theme/subgroup, meaningful ability and keyword information, and merge ingredients/results where applicable.
- Descriptions should state actual effects concisely. Remove filler such as “unless silenced,” “does not use mana,” “ranged passes through friendlies,” “no special ability,” prototype commentary, repeated stats, and empty recipe sections. Keep meaningful effect numbers, durations, targeting, and exceptions such as Mech friendly fire.

Player images: `assets/characters/<card-id>.png`, with WebP/JPG/JPEG fallbacks. Enemy images: `assets/enemies/<imageId>.png`. Existing user artwork must be preserved. Upgraded Blobs reuse the Blob portrait. Missing images currently use a silhouette placeholder.

## Suggested Unity implementation

1. Create a saved battle scene with editor-visible board, hand container, shop, run information, inspector, dialogs, and input/event setup.
2. Create reusable tile, battlefield-unit, hand-card, shop-card, and UI prefabs. Expose portraits, colors, typography, spacing, and references in the Inspector.
3. Translate the rules into plain C# classes independent of scene objects. Separate card definitions, battle instances, run state, and save data.
4. Import JSON and existing portraits. Retain stable IDs. Card data can remain JSON or be converted to editor assets through an importer.
5. First verify a complete battle with the eight base cards. Then add timed merging, shop, remaining implemented abilities, enemy roster, and full run progression.
6. Emit combat events from the rules engine and animate them in the presentation layer. Avoid deriving combat outcomes from animation timing or scene transforms.
7. Port meaningful tests for mirrored activation, deployment, targeting through allies, merge compatibility, ability timing, run resets, and save migration where supported.

Choose the UI framework after checking the project's Unity version and editor workflow. The requirement is editable scenes/prefabs and preserved layout changes, not a particular UI framework. Avoid runtime code that silently resets positions or recreates editor-authored panels.

Steam release preparation comes later: polished menus and feedback, settings, reliable saves, tutorial, audio, resolution/input support, content balance, performance testing, and release packaging. Achievements and cloud saves are optional later additions. Multiplayer is not part of the current roguelike scope.

## Validation status and environment limitation

At the last gameplay change, all 60 browser-engine tests passed. The preceding description cleanup also received browser checks without runtime errors.

When creating this handoff, the terminal tool failed to start because its execution helper could not refresh the environment. Current source files could not be reread in this turn. This document is based on the completed changes and conversation context; verify source details at the start of migration.
