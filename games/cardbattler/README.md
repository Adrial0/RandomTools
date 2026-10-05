# Cardbattler

Working directory for the roguelike cardbattler. The game does not have a final name yet.

## Play the prototype

Open `index.html` in a browser, or serve this folder with the existing static website. No installation, network access, or build step is needed to play. The game lives at `/games/cardbattler/` when hosted.

- Select a hand card, then select an empty tile in your bottom three rows. The bottom row is also your base row and can hold defenders.
- Deploy as many cards as your 3 mana allows. Start with 5 cards; draw 2 each subsequent turn. The hand limit is 10.
- The six-slot merge row sits below combat. Drag hand cards into empty slots, or drop a card directly onto another compatible card in the hand or row to merge instantly. The result stays at the destination and replaces its ingredients permanently in the deck. Click a stored card to return it to your hand. For click/keyboard use, select a hand card and click an empty slot to store it or an occupied slot to merge.
- Cards show their ingredient colors instead of a tier number. Cards sharing any color cannot merge. A recipe is also required; compatible hand cards are highlighted when a workbench slot is filled.
- Dragging highlights valid destinations. Invalid drops and canceled drags preserve both cards. Mouse and touch use the same pointer interaction. Existing two-slot saves expand to six slots while preserving stored cards.
- End turn to activate your army, then the enemy army. Units move or attack; Rush can move and attack. Activation is front to back and left to right from each side's perspective.
- Win five encounters by destroying their bases. Base health persists between encounters. Choose a card reward, repair your base at camp, or buy a prototype War Banner artifact.
- Progress saves automatically in local storage. New Run replaces the saved expedition after confirmation.

All 80 cards are playable, with all 72 distinct merge recipes available. The roster is derived directly from the card data, so future cards are not blocked by a separate allowlist. Rewards remain tier-gated as the run progresses. Robot + Thief produces Hacker, whose attacks steal a random keyword from surviving targets.

The four base colors come from font formatting in `cards (4).xlsx`, `Main!A2:A9`: Robot and Alien are red (#CC0000), Mage and Engineer blue (#073763), Thief and Raider green (#38761D), and Caveman and Acolyte yellow (#BF9000). Merged cards inherit ingredient colors; their stripe shows two or four components. Cleric is blue + yellow. Colors, the original palette, and source references are stored in `cards.json`. Unit health is reduced by approximately 25% from the initial prototype. Existing saved battlefield units are migrated once to this balance revision.

### Temporary balance and behavior

`engine.js` owns prototype stats, costs, enemy encounters, and ability implementations. These do not overwrite card design data. Several unresolved abilities have simple temporary implementations, described by the in-game inspector: Acolyte heals, Mechanic grants armor, Leader grants a small aura, and mage variants use splash attacks. Inquisitor's provisional Cursed bonus is 50%; burn deals 2 damage over two activations; mental attacks are currently the arcane caster attacks. Warlord auras stack additively. Ranged attacks stop at the first occupied tile in their column; bases must be attacked from the adjacent row. Summons wait until their side's next activation snapshot. Enemy reinforcements arrive every other turn.

Symbiote, Buddhist, boats, mining, Charm, and other unfinished systems are stored as designs; their cards can be deployed using provisional stats and implemented keywords while these abilities await implementation. The inspector and catalog identify pending effects and show planned ability descriptions. Posthuman intentionally has no ability and receives the highest base health and attack. The prototype uses deterministic rules within combat except card draws, rewards, enemy deployments, Scientist debuffs, and Hacker keyword selection. Balancing and full-card implementation remain future work.

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

Hand sizes, draw rates, resources, merge costs, and other unconfirmed rules are intentionally left unset.
