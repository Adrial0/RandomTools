const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const core=read('js/core.js'),combat=read('js/combat.js'),ui=read('js/ui.js'),activities=read('js/activities.js'),app=read('js/app.js'),progression=read('js/progression.js'),styles=read('styles.css'),html=read('index.html');

assert.doesNotMatch(ui,/stageCampParty|stageCamper/,'rest scenes must not create duplicate combatants');
assert.match(styles,/stageIntermission \.combatHeroPane\{visibility:visible\}/,'the real party remains visible during stage rest');
assert.match(combat,/if\(m\.stageIntermission\)\{advanceExpeditionIntermission\(m,now\);return\}/,'stage rest pauses attacks and casts while wall-clock timers continue');

assert.match(combat,/\(h\.twoHanded\?2:1\)/,'two-handed attacks deal double damage');
assert.match(core,/gearMult=weaponHands\(it\)===2\?2:1/,'two-handed item stats and special effects are doubled');
assert.match(progression,/gearMult=it\.slot==='Weapon'&&weaponHands\(it\)===2\?2:1/,'two-handed recipe and item panels display their effective doubled stats');
assert.match(progression,/weaponHands\(it\)===2\?'Two-handed':'One-handed'/,'weapon profiles identify handedness without redundant balance explanations');
assert.doesNotMatch(progression,/2× weapon damage and item effects/,'item profiles do not explain the visible two-handed stat boost');

assert.match(core,/guildBonuses:\{maxHp:0,gatherSpeed:0,cooldownReduction:0\}/,'new saves track permanent first-clear guild bonuses');
assert.match(combat,/function awardAreaGuildBonus/,'area clears award permanent guild bonuses');
assert.match(combat,/amount=major\?\.02:\.01/,'normal area clears grant 1% bonuses and tier bosses grant 2% bonuses');
assert.match(combat,/function victoryPresentation/,'area and tier clears have a dedicated victory presentation');
assert.match(core,/guildHp=1\+\(s\?\.guildBonuses\?\.maxHp/,'maximum-HP bonuses affect character stats');
assert.match(activities,/guildBonuses\?\.gatherSpeed/,'gathering-speed bonuses affect gathering cycles');
assert.match(combat,/guildBonuses\?\.cooldownReduction/,'cooldown bonuses affect active abilities');
assert.match(html,/guildPermanentBonuses/,'accumulated guild bonuses are visible in the Guild Hall');

assert.match(combat,/levelUpUntil=Date\.now\(\)\+1800/,'level-ups create a battlefield animation event');
assert.match(ui,/combatLevelUp/,'combatants render the level-up animation');
assert.match(ui,/LEVEL UP →/,'mission reports record level gains');

assert.match(core,/UNIQUE_ITEM_TEMPLATES/,'authored Unique item templates exist');
assert.match(core,/rar=\[[^\]]*'Unique'/,'Unique is registered as an item rarity');
assert.match(core,/it\.itemLevel=Math\.max\(1,Math\.round\(dropLevel/,'Unique equipment records the level of the boss that dropped it');
assert.match(combat,/makeUniqueItem\(m\.tier\|\|1,m\.boss,m\.level\|\|1\)/,'boss level is passed into Unique item scaling');
assert.match(combat,/firstClear \? \.10 : \.0015/,'boss Uniques use a 10% first-clear chance and a very low repeat chance');
assert.match(combat,/firstClear&&m\.bossGate\)bonusItem=bossItemDrop\(m,'Rare'\)/,'first tier-boss clears guarantee Rare-or-better equipment');
assert.doesNotMatch(combat,/firstClearReward=bossItemDrop\(m,'Rare'\)/,'ordinary expedition area clears do not grant the tier-boss equipment guarantee');
assert.match(read('js/professions.js'),/rar\.filter\(rarity=>rarity!=='Unique'\)/,'profession quality bonuses cannot craft Unique items');
assert.match(progression,/Unique: \$\{it\.uniquePassive\}/,'Unique passives appear in item details');

console.log('Rest, two-handed balance, first-clear rewards, level feedback, and Unique item tests passed.');
