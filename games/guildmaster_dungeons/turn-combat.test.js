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
  chooseTurnAction,chooseTurnTarget,buildTurnOrder,resortRemainingTurnOrder,heroInitiative,unitCard,turnActionPanel,inspectEnemy,turnDamage,applyHealing,enemyIntent,activateRelic,combatStatusBadges,weaponStatusProfile,weaponProcChance,
  abilities:TURN_ABILITIES,augments:ABILITY_AUGMENTS,subclasses:()=>SUBCLASS_DATA,subclassAbility,executeSubclassAbility,heroSheetStats,effectiveAtk,naturalMaxHp,makeHero,canEquip,applyLayeredDamage,ensureProtection,restoreProtection,physicalDodgeFromDex,magicalDodgeFromInt,abilityPreviewDescription,enemyProtectionValues,heroWeaponDamageType,stunResistanceChance,classSkillNodes,availableSkillPoints,skillBonus
}`;
vm.runInContext(source,context);

const api=context.turnTest,state=api.setup(),battle=state.run.battle;
assert.equal(battle.round,1,'combat starts in round one');
assert.equal(battle.activeUnitId,state.run.heroes[1].id,'the higher-Initiative Rogue acts first');
assert.ok(api.heroInitiative(state.run.heroes[1])>api.heroInitiative(state.run.heroes[0]),'class Initiative and Dexterity affect order');
const armoredProfile=api.enemyProtectionValues({name:'Ironback',role:'Bruiser',level:30,maxHp:1000}),casterProfile=api.enemyProtectionValues({name:'Grave Wisp',role:'Caster',level:30,maxHp:1000});assert.ok(armoredProfile.armor>1000&&armoredProfile.magic<300,'Ironbacks strongly favor Armor over Magic Armor');assert.ok(casterProfile.magic>1000&&casterProfile.armor<100,'Grave Wisps strongly favor Magic Armor over Armor');
assert.ok(api.heroSheetStats(state.run.heroes[1]).physicalDodge>0,'Dexterity grants physical dodge');
assert.ok(api.heroSheetStats(state.run.heroes[0]).magicalDodge>0,'Intellect grants magical dodge');
assert.equal(api.abilities.Warrior.length,2,'every class exposes two abilities');
assert.equal(Object.values(api.abilities).every(list=>list.length===2),true,'all class ability lists contain two choices');
assert.equal(Object.values(api.abilities).flat().every(ability=>!('cooldown' in ability)),true,'turn abilities are limited by Mana rather than cooldowns');
for(const className of Object.keys(api.abilities)){const nodes=api.classSkillNodes(className);assert.equal(nodes.length,103,`${className} has a large universal, specialization, and class-specific skill network`);assert.equal(nodes.filter(node=>node.basic).length,81,`${className} can travel through generic trunks and optional specialization nodes`);assert.equal(nodes.every(node=>node.maxRank===1),true,`${className} skill nodes each cost exactly one point`);assert.equal(nodes.filter(node=>node.major).length,14,`${className} has class, ring, and playstyle-changing keystones`);assert.equal(nodes.filter(node=>node.keystone).length,7,`${className} exposes seven transformative bargain keystones`);const manaShield=nodes.find(node=>node.id==='keystone-mana-shield'),aether=nodes.find(node=>node.id==='keystone-aether-conversion');assert.equal(manaShield.requires,'mana-bastion','Mana Shield requires its complete dedicated route');assert.equal(aether.requires,'aether-unraveling','Aether Conversion requires its separate dedicated route');const classNodes=nodes.filter(node=>node.classSpecific),classAnchors=new Set(classNodes.map(node=>node.requires));assert.equal(classAnchors.size,12,`${className} class talents use twelve separate deep prerequisites`);assert.equal(classNodes.some(node=>node.requires.startsWith(className.toLowerCase()+'-')),false,`${className} talents never cheaply chain into one another`)}
const skilledMage=api.makeHero(10,'Mage');assert.equal(api.availableSkillPoints(skilledMage),9,'a level-ten character has earned nine skill points');skilledMage.skillRanks={'mage-0-0':3};assert.equal(api.availableSkillPoints(skilledMage),8,'legacy multi-rank purchases migrate to one point and refund excess ranks');assert.equal(api.skillBonus(skilledMage,'intPct'),.04,'a migrated class node applies its percentage-based attribute bonus');
assert.doesNotMatch(api.abilityPreviewDescription(state.run.heroes[0],api.abilities.Warrior[0]),/% (?:of )?Attack/,'ability cards replace Attack percentages with current numerical damage');
state.run.heroes[0].gear.Weapon={slot:'Weapon',damageType:'fire'};assert.equal(api.heroWeaponDamageType(state.run.heroes[0]),'magical','a magical Warrior weapon makes weapon-driven abilities magical');state.run.heroes[0].gear.Weapon=null;
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
target.stunsTaken=0;
assert.equal(api.stunResistanceChance(target),0,'ordinary enemies have no resistance before their first successful stun');
target.stunsTaken=1;assert.equal(api.stunResistanceChance(target),.2,'each previous stun adds 20% resistance');target.stunsTaken=0;
assert.equal(api.stunResistanceChance({boss:true}),.25,'bosses begin with 25% stun resistance');
assert.equal(api.stunResistanceChance({boss:true,stunsTaken:4}),.9,'stacking stun resistance is capped below immunity');
api.ensureProtection(target);target.maxArmor=target.armor=20;const layeredHp=target.hp,layered=api.applyLayeredDamage(target,15,'physical');assert.equal(layered.hpDamage,0,'physical damage is absorbed by Armor before HP');assert.equal(target.armor,5,'Armor loses damage point for point');assert.equal(target.hp,layeredHp,'Armor prevents HP loss');target.lastDamageHit=null;api.turnDamage(state.run.heroes[0],target,.1);assert.equal(target.lastDamageHit.before,target.lastDamageHit.after,'protection-only damage does not create a false missing-HP segment');target.armor=20;const broken=api.applyLayeredDamage(target,15,'physical',0,2);assert.equal(broken.armorDamage,20,'Armor Broken doubles damage to the Armor layer');assert.equal(broken.hpDamage,5,'overflow retains normal damage against HP');target.armor=20;const pierced=api.applyLayeredDamage(target,10,'physical',.5);assert.equal(pierced.hpDamage,5,'Pierce bypasses Armor and damages HP');target.hp=before;target.armor=target.maxArmor;
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
warrior.subclassPowerRounds=4;battle.lifestealRounds=4;const partyStatuses=api.combatStatusBadges(warrior);assert.match(partyStatuses,/Battle Shout[\s\S]*<span>3<\/span>/,'Battle Shout appears as a party status');assert.match(partyStatuses,/Vampiric[\s\S]*<span>4<\/span>/,'temporary party lifesteal appears as a status');warrior.subclassPowerRounds=0;battle.lifestealRounds=0;
const rangerTurn=api.makeHero(1,'Ranger');state.run.heroes.push(rangerTurn);battle.turnOrder=[rangerTurn.id,target.id,warrior.id];battle.turnIndex=0;target.initiative=10;target.initiativePenalty=-5;api.resortRemainingTurnOrder();assert.equal(battle.turnOrder[1],warrior.id,'an Initiative penalty immediately reorders units that have not acted');state.run.heroes.pop();target.initiativePenalty=0;
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
state.run.heroes[0].skillRanks={'keystone-vital-leech':1};state.run.heroes[0].hp-=20;
assert.equal(api.applyHealing(state.run.heroes[1],state.run.heroes[0],10),0,'Vital Leech prevents non-Lifesteal healing');assert.equal(api.applyHealing(state.run.heroes[0],state.run.heroes[0],10,'lifesteal'),15,'Vital Leech makes Lifesteal fifty percent more effective');
api.activateRelic('adamantSoul');const protectedHero=state.run.heroes[1];delete protectedHero.maxArmor;api.ensureProtection(protectedHero);assert.ok(protectedHero.maxArmor>api.heroSheetStats(protectedHero).def,'Adamant Soul substantially increases protection capacity');
console.log('Guildmaster: Dungeons turn combat tests passed.');
