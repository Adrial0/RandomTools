# Cardbattler

Working directory for the roguelike cardbattler. The game does not have a final name yet.

## Play the prototype

Open `index.html` in a browser, or serve this folder with the existing static website. No installation, network access, or build step is needed to play. The game lives at `/games/cardbattler/` when hosted.

The compact layout keeps the battlefield, shop, resources, turn controls, merge row, and hand within the viewport. The battle log opens from the header. Desktop card descriptions appear in the inspector; on phones, select a card or unit and use Card details. Long hands scroll horizontally, and full descriptions and the catalog remain available without expanding the page.

Encounter name, lives, gold, and income share a status bar above the battlefield. The left panel contains card details and merge recipes, independent of run status. The full card catalog is available through Cards in the header.

Selecting a card shows its ingredient recipes and its possible merge partners and results, with color markers. All alternative recipes are listed. Blob's self-merge and upgraded forms are included. On phones, selecting a card opens these details; closing them preserves the selected card for deployment. The catalog and shop inspections show recipes too.

- Select a hand card, then select an empty tile in your bottom three rows. The bottom row is also your base row and can hold defenders.
- Buy cards from the six-card shop to add them to your hand, then deploy for free. There are no automatic draws. Start with 60 gold; earn 10 gold each completed round, plus 1 per surviving unsilenced Miner or Businessman. Base cards cost 10 gold, two-color cards 30, and four-color cards 50. The shop refreshes free each round; manual reroll costs 10 gold. Purchases require fewer than 10 cards in hand.
- The six-slot merge row sits below combat. Drag hand cards into empty slots, or drop a card directly onto another compatible card in the hand or row to merge instantly. The result stays at the destination and replaces its ingredients permanently in the deck. Click a stored card to return it to your hand. For click/keyboard use, select a hand card and click an empty slot to store it or an occupied slot to merge.
- Cards show their ingredient colors instead of a tier number. Cards sharing any color cannot merge, except Blob with another Blob. A recipe is otherwise required; compatible hand cards are highlighted when a workbench slot is filled.
- Dragging highlights valid destinations. Invalid drops and canceled drags preserve both cards. Mouse and touch use the same pointer interaction. Existing two-slot saves expand to six slots while preserving stored cards.
- End turn to activate your army, then the enemy army. Units move or attack; Rush can move and attack. Activation is front to back and left to right from each side's perspective.
- Win five encounters by destroying their bases. Start the run with three lives; losing a battle costs one life. At zero lives the run ends. Losing retries the same encounter, while winning advances to the next.
- Every new battle resets your base to full health and clears all cards: deployed units, hand, merge row, and ownership ledger. Buy a fresh army from a refreshed shop. Gold and artifacts carry forward, with at least sixty gold available at the start of each attempt. There are no card rewards or base repairs between battles; the prototype War Banner remains available after a victory.
- Progress saves automatically in local storage. New Run replaces the saved expedition after confirmation.

All 80 cards are playable, with all 72 distinct merge recipes available. The roster is derived directly from the card data, so future cards are not blocked by a separate allowlist. Shop tiers unlock as each battle and the run progress. Robot + Thief produces Hacker, whose attacks steal a random keyword from surviving targets.

The four base colors come from font formatting in `cards (4).xlsx`, `Main!A2:A9`: Robot and Alien are red (#CC0000), Mage and Engineer blue (#073763), Thief and Raider green (#38761D), and Caveman and Acolyte yellow (#BF9000). Merged cards inherit ingredient colors; their stripe shows two or four components. Cleric is blue + yellow. Colors, the original palette, and source references are stored in `cards.json`. Unit health is reduced by approximately 25% from the initial prototype. Existing saved battlefield units are migrated once to this balance revision.

### Temporary balance and behavior

`engine.js` owns prototype stats, shop prices, enemy encounters, and ability implementations. The inspector, card tooltips, and catalog describe the exact current behavior. Enemy units have 25% extra health in battle one, increasing by 5 percentage points each battle, and +1 attack, rising to +3 by battle five. Enemy bases have 32 health plus 9 per later battle. Reinforcements arrive every other turn, with extra waves in later battles.

Implemented mechanics include Symbiote attachment, Charm, Karma reincarnation, family/cultist/addict summons, Faith healing and buffs, keyword copying and stealing, bounties, potions, pulling, ranged immunity, income, control-based damage, and Lorekeeper's deployment choice. Unspecified values use explicit prototype amounts: Symbiote grants +2 attack/+1 armor; Sheriff bounties pay 2 gold; Buddhist Karma changes by 1 with tier thresholds 1 and 4; Drug Dealer summons every third activation. Karma classifies Faith/Holy as good and Outlaw/Cursed as bad, with good taking precedence. Other moral classifications remain undecided. Arcane caster attacks use a team spell pool of 3 mana per action phase, plus 1 per living Mage; this never limits deployment or purchases.

Inquisitor's provisional Cursed bonus is 50%; Burn deals 2 damage for 2 activations. Warlord auras stack additively. Ranged attacks stop at the first occupied tile in their column; bases must be attacked from the adjacent row. Summons wait until the next activation snapshot. Charm lasts for the controlled unit's next activation. Silence lasts until its source dies. Acolyte's healing and Leader's 10% row aura remain provisional interpretations of their rough notes. Arms Dealer uses the gun-user buff option; gun summoning is not designed.

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

The current prototype uses a shop, a ten-card purchase limit for the hand, free deployment and merging, and six storage slots. Numerical balance values remain adjustable.

