const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const app={innerHTML:''};
const storage=new Map();
const subclassFixture=JSON.parse(fs.readFileSync(__dirname+'/../guildmaster/data/subclasses.json','utf8'));
const context={
  console,
  performance:{now:()=>0},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  document:{querySelector:selector=>selector==='#app'?app:null,body:{insertAdjacentHTML(){}}},
  requestAnimationFrame:()=>0,cancelAnimationFrame(){},setInterval:()=>0,clearInterval(){},
  setTimeout:()=>0,fetch:async()=>({ok:false}),Image:function(){},subclassFixture
};
vm.createContext(context);
let source=fs.readFileSync(__dirname+'/game.js','utf8').replace(/init\(\);\s*$/,'');
source+=`;globalThis.turnTest={
  setup(){RACE_DATA={Human:{mult:{},flat:{}}};SUBCLASS_DATA=JSON.parse(JSON.stringify(subclassFixture));Object.values(SUBCLASS_DATA).flat().forEach(sub=>{Object.assign(sub,SUBCLASS_TURN_OVERRIDES[sub.id]||{});sub.passive=subclassPassiveText(sub);sub.active=subclassActiveText(sub)});state=fresh();const warrior=makeHero(1,'Warrior'),rogue=makeHero(1,'Rogue');state.run={region:0,step:0,encounters:0,gold:0,heroes:[warrior,rogue],inventory:[],consumables:{},perks:[],relics:[],mode:'map'};beginCombat('combat');return state},
  state:()=>state,
  chooseTurnAction,chooseTurnTarget,buildTurnOrder,heroInitiative,unitCard,turnActionPanel,inspectEnemy,turnDamage,applyHealing,enemyIntent,activateRelic,combatStatusBadges,weaponStatusProfile,weaponProcChance,
  abilities:TURN_ABILITIES,augments:ABILITY_AUGMENTS,subclasses:()=>SUBCLASS_DATA,subclassAbility,executeSubclassAbility,heroSheetStats,effectiveAtk,naturalMaxHp,makeHero,canEquip
}`;
vm.runInContext(source,context);

const api=context.turnTest,state=api.setup(),battle=state.run.battle;
assert.equal(battle.round,1,'combat starts in round one');
assert.equal(battle.activeUnitId,state.run.heroes[1].id,'the higher-Initiative Rogue acts first');
assert.ok(api.heroInitiative(state.run.heroes[1])>api.heroInitiative(state.run.heroes[0]),'class Initiative and Dexterity affect order');
assert.equal(api.abilities.Warrior.length,2,'every class exposes two abilities');
assert.equal(Object.values(api.abilities).every(list=>list.length===2),true,'all class ability lists contain two choices');
assert.equal(Object.values(api.abilities).flat().every(ability=>!('cooldown' in ability)),true,'turn abilities are limited by Mana rather than cooldowns');
assert.equal(Object.values(api.augments).every(list=>list.length===6),true,'each class has three shrine upgrades for each ability');
const subclassData=api.subclasses(),subclasses=Object.values(subclassData).flat();
assert.equal(subclasses.length,19,'all nineteen subclasses are loaded');
assert.equal(subclasses.every(sub=>!/(attack speed|\d+s\b|cooldown)/i.test(`${sub.passive} ${sub.active}`)),true,'every subclass uses turn-based wording');
for(const sub of subclasses){const hero=api.makeHero(10,Object.keys(subclassData).find(cls=>subclassData[cls].some(candidate=>candidate.id===sub.id)));hero.subclass=sub.id;state.run.heroes.push(hero);const ability=api.subclassAbility(hero);assert.ok(ability?.name&&ability.cost>0&&ability.desc&&['enemy','ally','allEnemies'].includes(ability.target),`${sub.name} has a complete turn-based ability`);battle.enemies.forEach(enemy=>{enemy.maxHp=1000000;enemy.hp=1000000;enemy.statuses={};enemy.skipTurns=0});assert.doesNotThrow(()=>api.executeSubclassAbility(hero,ability,ability.target==='ally'?hero:battle.enemies[0],[hero],battle.enemies),`${sub.name}'s ability executes`);state.run.heroes.pop()}
const warrior=state.run.heroes[0],baseInitiative=api.heroInitiative(warrior),baseAttack=api.effectiveAtk(warrior);warrior.subclass='berserker';assert.ok(api.heroInitiative(warrior)>baseInitiative&&api.effectiveAtk(warrior)>baseAttack,'Berserker Initiative and damage passives apply');
warrior.subclass='guardian';assert.ok(api.heroSheetStats(warrior).block>=2,'Guardian Block passive applies');warrior.subclass=null;
const ranger=api.makeHero(10,'Ranger'),baseHp=api.naturalMaxHp(ranger);state.run.heroes.push(ranger);ranger.subclass='beastmaster';assert.ok(api.naturalMaxHp(ranger)>baseHp,'Beastmaster maximum HP passive applies');state.run.heroes.pop();
const priest=api.makeHero(10,'Priest');priest.subclass='battlepriest';assert.equal(api.canEquip(priest,{slot:'Armor',armorClass:'Medium'}),true,'Battle Priest Medium armor proficiency applies');
assert.equal(api.weaponStatusProfile({slot:'Weapon',weaponTemplate:'Warhammer',damageType:'physical'}).name,'Armor Broken','maces and hammers can break Armor');
assert.equal(api.weaponStatusProfile({slot:'Weapon',weaponTemplate:'Crystal Wand',damageType:'ice'}).name,'Frostbite','elemental caster weapons apply their matching status');

api.chooseTurnAction('basic');
assert.equal(battle.pendingAction,'basic','targeted actions pause for target selection');
const target=battle.enemies[0],before=target.hp;
assert.match(api.unitCard(target,true),/targetable[\s\S]*chooseTurnTarget/,'the enemy battlefield card becomes the target control');
assert.doesNotMatch(api.turnActionPanel(),/targetAction/,'the action panel does not duplicate enemy target buttons');
api.chooseTurnTarget(target.id);
assert.ok(target.hp<before,'the selected target takes damage');
assert.ok(target.lastDamageHit?.amount>0,'a hit records its visible damage amount and HP-bar loss');
assert.match(api.unitCard(target,true),/damageNumber[\s\S]*recentDamage/,'damaged combat cards render a floating number and trailing HP segment');
const wounded=state.run.heroes[0];wounded.hp-=20;api.applyHealing(state.run.heroes[1],wounded,12);
assert.match(api.unitCard(wounded),/healingNumber[\s\S]*recentHealing/,'healing renders a green number and restored-HP highlight');
assert.ok(target.role&&Number.isFinite(target.def)&&Number.isFinite(target.mdef),'enemies receive a tactical role and distinct defenses');
assert.match(api.unitCard(target,true),new RegExp(target.role),'enemy roles are visible on battlefield cards');
target.skipTurns=1;target.controlStatus='Frozen';
assert.match(api.combatStatusBadges(target,true),/Frozen[\s\S]*<span>1<\/span>/,'Frost Nova control is shown with an uncluttered round count');
const intent=api.enemyIntent(target);
assert.ok(intent.label&&intent.targetName&&intent.damageType,'enemy intent previews expose action, target, and damage type');

state.run.heroes.forEach(hero=>hero.mana=0);
battle.round=1;
api.buildTurnOrder();
assert.equal(battle.round,2,'finishing an order begins a new round');
assert.equal(state.run.heroes[0].mana,state.run.heroes[0].manaRegen,'Mana regenerates once at round start');
assert.equal(api.abilities.Warrior[0].cost,20,'ability Mana costs remain independently balanced');
const manaBefore=state.run.heroes[0].maxMana;api.activateRelic('sealedReservoir');
assert.equal(state.run.heroes[0].maxMana,Math.round(manaBefore*1.6),'Sealed Reservoir increases maximum Mana');
state.run.heroes[0].mana=0;api.buildTurnOrder();
assert.equal(state.run.heroes[0].mana,0,'Sealed Reservoir prevents round-based Mana regeneration');
api.activateRelic('crimsonCovenant');state.run.heroes[0].hp-=10;
assert.equal(api.applyHealing(state.run.heroes[1],state.run.heroes[0],10),0,'Crimson Covenant prevents non-Lifesteal healing');
console.log('Guildmaster: Dungeons turn combat tests passed.');
