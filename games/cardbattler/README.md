# Cardbattler

Working directory for the roguelike cardbattler. The game does not have a final name yet.

## Play the prototype

Open `index.html` in a browser, or serve this folder with the existing static website. No installation, network access, or build step is needed to play. The game lives at `/games/cardbattler/` when hosted.

The compact layout keeps the battlefield, shop, resources, turn controls, and hand within the viewport. The battle log opens from the header. Desktop card descriptions appear in the inspector; on phones, select a card or unit and use Card details. Long hands scroll horizontally, and full descriptions and the catalog remain available without expanding the page.

Encounter name, lives, gold, and income share a status bar above the battlefield. The left panel contains card details and merge recipes, independent of run status. The full card catalog is available through Cards in the header.

Selecting a card shows its ingredient recipes and its possible merge partners and results, with color markers. All alternative recipes are listed. Blob's self-merge and upgraded forms are included. On phones, selecting a card opens these details; closing them returns to the battlefield; drag from the hand to deploy. The catalog and shop inspections show recipes too.

- Drag a hand card onto an empty tile in your bottom three rows to deploy. The bottom row is also your base row and can hold defenders. Clicking a hand card or battlefield unit only opens its details; it never places a card.
- Buy cards from the six-card shop to add them to your hand, then deploy for free. There are no automatic draws. Start with 30 gold; earn 10 gold each completed round, plus 1 per surviving unsilenced Miner or Businessman. Base cards cost 5 gold, two-color cards 15, and four-color cards 35. The shop refreshes free each round; manual reroll costs 10 gold. Purchases require fewer than 10 cards in hand.
- Drag a hand card over a compatible hand card and hold for 0.9 seconds. A circular indicator fills and shows a checkmark when ready. Release on that same card to merge; completing the hold alone never merges. Leaving the target or switching cards restarts the timer. Early release, release elsewhere, Escape, interrupted pointers, or losing window focus cancel without changing cards.
- Cards show their ingredient colors instead of a tier number. Cards sharing any color cannot merge, except Blob with another Blob. A recipe is otherwise required; compatible hand cards are highlighted while dragging a hand card.
- Dragging highlights compatible hand cards. Mouse and touch use the same hold-and-release gesture. The merge row is removed; cards in old saved storage slots return to your hand once without changing ownership.
- End turn to activate your army, then the enemy army. Units move or attack; Rush can move and attack. Activation is front to back and left to right from each side's perspective.
- Win five encounters by destroying their bases. Start the run with three lives; losing a battle costs one life. At zero lives the run ends. Losing retries the same encounter, while winning advances to the next.
- Every new battle resets your base to full health and clears all cards: deployed units, hand, and ownership ledger. Buy a fresh army from a refreshed shop. Gold and artifacts carry forward, with at least thirty gold available at the start of each attempt. There are no card rewards or base repairs between battles; the prototype War Banner remains available after a victory.
- Progress saves automatically in local storage. New Run replaces the saved expedition after confirmation.

All 80 cards are playable, with all 72 distinct merge recipes available. The roster is derived directly from the card data, so future cards are not blocked by a separate allowlist. Shop tiers unlock as each battle and the run progress. Robot + Thief produces Hacker, whose attacks steal a random keyword from surviving targets.

The four base colors come from font formatting in `cards (4).xlsx`, `Main!A2:A9`: Robot and Alien are red (#CC0000), Mage and Engineer blue (#073763), Thief and Raider green (#38761D), and Caveman and Acolyte yellow (#BF9000). Merged cards inherit ingredient colors; their stripe shows two or four components. Cleric is blue + yellow. Colors, the original palette, and source references are stored in `cards.json`. Unit health is reduced by approximately 25% from the initial prototype. Existing saved battlefield units are migrated once to this balance revision.

### Confirmed tier-one roles

Robot has Armor (1). Alien has Venom. Mage has a range-one melee splash that hits the target and enemies on its left and right, without mana. Engineer's broad ability remains undecided; repair is not assigned. Thief retains Stealth, Raider retains Rush, Caveman relies on stats without an ability or keywords, and Acolyte retains adjacent healing.

### Temporary balance and behavior

`engine.js` owns prototype stats, shop prices, enemy encounters, and ability implementations. The inspector, card tooltips, and catalog describe the exact current behavior. Enemy units have 65% extra health in battle one, increasing by 10 percentage points each battle, and +2 attack, rising to +4 by battle five. Enemy bases have 48 health plus 12 per later battle. Opening formations contain four to six units across different lanes. Reinforcements arrive every round, with two on even rounds from battle three onward. Existing saves migrate once while preserving proportional enemy damage.

Implemented mechanics include Symbiote attachment, Charm, Karma reincarnation, family/cultist/addict summons, Faith healing and buffs, keyword copying and stealing, bounties, potions, pulling, ranged immunity, income, control-based damage, and Lorekeeper's deployment choice. Unspecified values use explicit prototype amounts: Symbiote grants +2 attack/+1 armor; Sheriff bounties pay 2 gold; Buddhist Karma changes by 1 with tier thresholds 1 and 4; Drug Dealer summons every third activation. Karma classifies Faith/Holy as good and Outlaw/Cursed as bad, with good taking precedence. Other moral classifications remain undecided. Other arcane caster attacks use a team spell pool of 3 mana per action phase; this never limits deployment or purchases. The tier-one Mage does not use, generate, or remove mana and always splashes when its unsilenced melee attack hits.

Inquisitor's provisional Cursed bonus is 50%; Burn deals 2 damage for 2 activations. Warlord auras stack additively. Ranged attacks pass through friendly units and stop at the first enemy within range in their column; bases must be attacked from the adjacent row. Summons wait until the next activation snapshot. Charm lasts for the controlled unit's next activation. Silence lasts until its source dies. Acolyte's healing and Leader's 10% row aura remain provisional interpretations of their rough notes. Arms Dealer uses the gun-user buff option; gun summoning is not designed.

Vague designs remain pending, including boat transport, drunkenness, and cards with flavor-only notes. Blob can merge with itself as an approved exception to the shared-color restriction; upgraded Blobs can absorb more Blobs. Its prototype stats scale with absorbed Blobs, with a 10% bonus over their combined base stats. Posthuman intentionally has no ability and receives the highest base health and attack. All 80 cards stay playable using their current stats and keywords. The generated `data/implemented-abilities.json` records descriptions, keyword effects, pending fields, and prototype stats for every card.

### Development

- `engine.js`: rendering-independent combat, deck management, encounters, and saving validation.
- `game.js`: browser interaction, combat playback, dialogs, and local storage.
- `style.css`: responsive interface; no external assets required.
- `data/runtime.js`: browser bundle generated from the authoritative JSON, allowing direct local-file play.

After changing `cards.json` or `merges.json`, regenerate the bundle:

```sh
node build-data.cjs
```

Run combat and progression checks:

```sh
node --test engine.test.cjs
```

## Design data

All files in `data/` are UTF-8 JSON and have `schemaVersion: 1`.

| File | Contents |
| --- | --- |
| `cards.json` | 80 player cards, themes, subgroups, tiers, keywords, and design notes |
| `merges.json` | 72 distinct combination recipes from both versions of the Main tables |
| `keywords.json` | Keyword definitions, triggers, ability types, and debuffs |
| `enemies.json` | 13 named enemy ideas |
| `artifacts.json` | 10 artifact ideas, including unfinished entries |
| `references.json` | Original character references and proposed names from Main |
| `rules.json` | Board layout and turn behavior agreed during design; undecided rules remain null |
| `source-workbook.json` | Original nonempty cells from all four sheets, including uncategorized notes |
| `implemented-abilities.json` | Generated current gameplay descriptions, keyword explanations, and prototype stats for all 80 cards |

Source: `cards (4).xlsx`. Entries include sheet and cell references where applicable. The workbook was read without modification.

## Character images

Place images in `assets/characters/` using the lowercase card ID as the filename, such as `robot.png`, `space-monk.png`, or `ai-girlfriend.png`. PNG, WebP, JPG, and JPEG are tried automatically in that order. `assets/characters/image-filenames.json` lists all cards and summons. Upgraded Blobs reuse `blob.png`. Square portraits work best; images fill the battlefield tile and crop from the center. Reload after adding images; no build is needed. Missing portraits show a silhouette.

The card inspector reserves a portrait area and includes stats, purchase price, colors, abilities, keyword explanations, pending design notes, and all merge recipes. Card details in the header opens the full details in a larger dialog. Hover or select a battlefield unit to inspect it. Battlefield units show the portrait, damage at bottom-left, and HP at bottom-right, with status markers. Unit names, activation numbers, damage/HP icons, unit HP bars, and empty-tile labels are removed. Damage and HP are colored numbers. The hand is centered when its cards fit and scrolls horizontally when necessary.

## Editing cards

- IDs are stable lowercase names with hyphens. Merge recipes refer to these IDs.
- `stats.health`, `stats.attack`, and `stats.cost` are null until designed. Movement defaults to the agreed value of 1.
- `ability` is null until a unique ability has been designed. Updated abilities contain a description and structured `mechanics`; these are design data, not executable game logic. `abilityStatus` distinguishes partial, specified, undecided, and intentionally absent abilities. `openQuestions` records remaining decisions.
- `keywords` is separate from the unique ability. Each assignment preserves its original text and optional numeric value, such as Armor (2). Tentative assignments such as `ranged??` remain marked `tentative`.
- Missing information is not a confirmed absence. An empty keyword list or null ability means the design has not yet specified it unless `abilityStatus` explicitly says `intentionally-none`. Posthuman intentionally has no unique ability. Cards remain drafts while stats and other balance decisions are unfinished.
- Themes and subgroups in the keywords sheet form the primary card list. `sourceVariants` retains conflicting themes and older notes from Main without silently discarding them.
- Tiers come from the original base-card list and merge tables. They are not purchase costs, star levels, or approved balance values.
- All 72 distinct recipes are preserved, including competing combinations for the same result. Recipe costs and ingredient ordering remain undecided.
- Keyword definitions and ability-type definitions retain the workbook's original categorization. Some card keyword columns mention ability types or undefined terms; these need design review before implementation.
- Artifact effects and enemy keywords remain design notes rather than implemented mechanics.
- User design updates take priority over workbook ideas. `designHistory` retains earlier notes and assignments; `lastUpdatedFrom` identifies the update. Superseded or uncertain mechanics are captured in history and open questions rather than silently treated as approved abilities.

## Board coordinates

Rows and columns are zero-based. Row 0 is the enemy base and row 5 is the player base. The player deploys in rows 3–5, including their own base row; enemies deploy in rows 0–2. Units cannot enter the opposing base row and must defeat a defender in their column before damaging the base.

During the player's action phase, units activate by ascending row and then ascending column. Enemies use descending row and descending column, mirroring that order. Determine the activation list before units act so movement does not cause duplicate activations.

The current prototype uses a shop, a ten-card purchase limit for the hand, free deployment and merging, and no separate merge storage. Numerical balance values remain adjustable.



## Enemy roster

The 24 enemy-only units cover all eight themes and are separate from the 80 player cards, shop, and merge recipes. Most use keywords; Zombie reanimates once, Gang Boss grants adjacent allies +1 damage, Broodmother summons a weak Broodling every third activation, and Fallen Angel splashes every third unit attack. Silence suppresses these abilities. Enemies and summoned Broodlings can still be charmed. Existing saved enemy armies migrate to distinct enemy units once.

Enemy portraits belong in `assets/enemies/` using names such as `orc.png`, `vampire.png`, and `gang-boss.png`. The folder contains the full filename list. PNG, WebP, JPG, and JPEG are supported. The enemy definitions and prototype stats are in `data/enemies.json`; workbook draft entries are retained under `sourceWorkbookEnemies`. Enemy stats receive the existing encounter difficulty scaling. Tier-three player cards cost 35 gold, exceeding two tier-two purchases at 15 each.
