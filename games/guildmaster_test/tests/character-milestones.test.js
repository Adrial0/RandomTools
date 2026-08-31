const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const core=read('js/core.js'),combat=read('js/combat.js'),ui=read('js/ui.js'),progression=read('js/progression.js'),professions=read('js/professions.js');

assert.match(core,/const CLASS_DISCIPLINES=/,'level-five disciplines have shared authored data');
for(const cls of ['Warrior','Ranger','Mage','Priest','Rogue','Paladin'])assert.match(core,new RegExp(`${cls}:\\[\\{id:`),`${cls} has discipline choices`);
assert.match(ui,/chooseDiscipline[\s\S]*chooseSubclass[\s\S]*choosePassiveEvolution[\s\S]*chooseActiveEvolution/,'the member UI exposes milestones through level 30');
assert.match(ui,/subclassChoiceIcon[\s\S]*gameIcon\('subclass'/,'subclass selection displays subclass artwork');
assert.match(core,/passiveEvolution==='mastery'/,'subclass mastery strengthens the existing passive');
assert.match(core,/passiveEvolution==='resilience'/,'the defensive passive evolution is applied');
assert.match(combat,/activeEvolution==='tempo'\?\.20/,'accelerated active abilities reduce cooldowns by 20%');
assert.match(combat,/function activePowerMultiplier[\s\S]*activeEvolution==='power'\?1\.25:1/,'empowered active abilities are 25% stronger');
assert.match(core,/legendary=lv>=3/,'Legendary recruits become available at guild level 3');
assert.match(core,/mythic=lv>=6/,'Mythic recruits become available at guild level 6');
assert.match(progression,/function unlockedCraftingTier[\s\S]*s\.expeditionGates/,'story boss clears define the unlocked crafting tier');
assert.match(professions,/function professionRecipeKnown[\s\S]*professionUnlockedTier/,'equipment and refining recipes use story-tier revelation');
assert.match(professions,/renderMealProfession[\s\S]*professionUnlockedTier/,'meal recipes use story-tier revelation');
assert.match(professions,/entries=.*RUNES[\s\S]*filter\(x=>x\.tier<=professionUnlockedTier\(\)\)/,'rune recipes use story-tier revelation');
console.log('Character milestone, recruit rarity, subclass artwork, and recipe revelation tests passed.');
