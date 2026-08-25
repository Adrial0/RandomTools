const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const abilities=JSON.parse(fs.readFileSync(require.resolve('../data/abilities.json'),'utf8'));
const enemies=JSON.parse(fs.readFileSync(require.resolve('../data/enemies.json'),'utf8'));
assert.equal(enemies['Bone Guard'].archetype,'tank','Bone Guards protect the enemy formation');
assert.equal(enemies['Restless Spirit'].archetype,'skirmisher','Restless Spirits pressure the back row');
assert.equal(enemies['Skeleton King'].ability,'royal_decree','Skeleton King uses his signature interruptible cast');
assert.equal(abilities.royal_decree.type,'aoe');
assert.ok(abilities.royal_decree.castTime>=2500,'Royal Decree has a readable interrupt window');

const context={
  console,Date,Math,Object,Array,String,Number,Set,
  ENEMY_ABILITIES_DATA:{
    fireball:{name:'Fireball',manaCost:10,cooldown:7000,castTime:2200,type:'spell',damageType:'fire',power:1.4,status:'burning',statusChance:1,statusPower:.2,statusDuration:8000}
  },
  clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
  pick:list=>list[0],
  syncPartyHp(){},
  elementIcon:{},
  s:{members:[]}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../js/combat.js'),'utf8'),context);

assert.equal(context.statusForDamageType('physical'),'bleed');
assert.equal(context.statusForDamageType('fire'),'burning');
assert.equal(context.statusForDamageType('poison'),'poison');
assert.equal(context.statusForDamageType('ice'),'frostbite');
assert.equal(context.statusForDamageType('lightning'),'shocked');
assert.equal(context.statusForDamageType('dark'),'cursed');
assert.equal(context.heroXpNeeded(1),100);
assert.ok(context.heroXpNeeded(10)>1300,'higher character levels require substantially more XP');
assert.ok(context.heroXpNeeded(20)>3800,'the XP curve continues steepening instead of remaining linear');
assert.equal(vm.runInContext('COMBAT_BUFF_DURATIONS.battleShout',context),12000,'Battle Shout lasts long enough to cross short encounter boundaries');
assert.equal(vm.runInContext('COMBAT_BUFF_DURATIONS.shieldFaith',context),10000,'Shield of Faith lasts long enough to cross short encounter boundaries');

{
  const now=Date.now();
  assert.deepEqual({...context.activePersistentBuffs({battleShout:now+5000,expired:now-1},now)},{battleShout:now+5000},'only active buffs cross an encounter boundary');
  const carried=context.activePersistentStatuses({bleed:{type:'bleed',stacks:2,expiresAt:now+5000},old:{type:'poison',expiresAt:now-1}},now);
  assert.deepEqual(Object.keys(carried),['bleed'],'only active statuses cross an encounter boundary');
}

function mission(){
  const hero={id:1,name:'Test Hero',hp:100,maxHp:100,def:0,mdef:0,block:0,fire:0,statuses:{}};
  const enemy={id:1,name:'Test Caster',hp:100,maxHp:100,atk:10,mana:30,maxMana:30,ability:'fireball',abilityReadyAt:0,statuses:{}};
  return{party:[1],mechanicsSeen:[],battle:{id:1,actionSeq:0,heroes:[hero],enemies:[enemy],log:[]}};
}

{
  const m=mission(),target=m.battle.enemies[0];
  context.applyStatus(m,target,'poison',{power:4,duration:10000,stacks:2,source:'Tester',sourceId:1});
  context.applyStatus(m,target,'poison',{power:5,duration:10000,stacks:2,source:'Tester',sourceId:1});
  assert.equal(target.statuses.poison.stacks,3,'statuses cap at three stacks');
  assert.equal(target.statuses.poison.power,5,'a stronger application updates tick power');
  target.statuses.poison.nextTickAt=Date.now()-1;
  context.processStatusEffects(m,Date.now());
  assert.equal(target.hp,85,'three poison stacks tick for power × stacks');
  assert.equal(context.heroReport(m,1).statusDamage,15,'status damage is attributed to its source');
  assert.equal(context.cleanseStatuses(m,target,1,'Test Cleanse',1),1);
  assert.equal(context.heroReport(m,1).cleanses,1,'cleanses are attributed to their source');
  assert.deepEqual(Object.keys(target.statuses),[],'cleanse removes a harmful status');
}

{
  const m=mission(),enemy=m.battle.enemies[0];
  assert.equal(context.tryEnemyAbility(m,enemy,1000),true);
  assert.equal(enemy.cast.abilityId,'fireball','enemy begins an interruptible cast');
  assert.equal(context.interruptEnemy(m,enemy,'Tester',1),true);
  assert.equal(enemy.cast,null,'interrupt cancels the cast');
  assert.equal(context.heroReport(m,1).interrupts,1,'interrupts are attributed to their source');
}

{
  const hero={id:1,name:'Guardian',hp:100,maxHp:100,activeType:'shieldSlam',mana:100,cooldowns:{},buffs:{}};
  const enemy={id:1,name:'Caster',hp:100,maxHp:100,ability:'fireball',cast:null};
  const m={battle:{heroes:[hero],enemies:[enemy],log:[]}};
  assert.equal(context.tryActiveSkill(m,hero,Date.now()),false,'an interrupt is reserved while a caster has not begun casting');
}

{
  const m=mission(),enemy=m.battle.enemies[0],hero=m.battle.heroes[0];
  context.resolveEnemyAbility(m,enemy,'fireball',Date.now());
  assert.ok(hero.hp<100,'completed casts deal damage');
  assert.ok(context.heroReport(m,hero.id).damageTaken>0,'incoming damage is recorded');
  assert.ok(hero.statuses.burning,'completed fireball applies Burning');
  assert.ok(m.mechanicsSeen.includes('burning'),'party status exposure is recorded for defeat analysis');
}

{
  const m=mission(),protectedEnemy=m.battle.enemies[0];
  m.battle.enemies.push({id:2,name:'Protector',hp:100,maxHp:100,protectorAura:.15,statuses:{}});
  context.refreshEnemyTactics(m);
  assert.equal(protectedEnemy.protection,.15,'bulwarks protect other living enemies');
  assert.equal(m.battle.enemies[1].protection,0,'a bulwark does not protect itself');
}

{
  const heroes=[
    {id:1,class:'Priest',threat:.7,def:12,block:0},
    {id:2,class:'Ranger',threat:.8,def:14,block:0},
    {id:3,class:'Warrior',threat:2.2,def:40,block:3},
    {id:4,class:'Mage',threat:.6,def:8,block:0},
    {id:5,class:'Paladin',threat:2.4,def:38,block:4}
  ];
  context.assignPartyFormation(heroes);
  assert.deepEqual(heroes.filter(h=>h.row==='front').map(h=>h.id).sort(),[3,5],'durable high-threat heroes form the frontline');
  assert.deepEqual(heroes.filter(h=>h.row==='back').map(h=>h.id).sort(),[1,2,4],'fragile heroes remain in the back row');
}

{
  const front={id:1,row:'front',threat:2},back={id:2,row:'back',threat:1};
  const oldRandom=Math.random;
  Math.random=()=>0;
  assert.equal(context.enemySingleTarget({archetype:'brute'},[front,back]).id,front.id,'ordinary enemies are stopped by a living frontline');
  assert.equal(context.enemySingleTarget({archetype:'skirmisher'},[front,back]).id,back.id,'skirmishers can deliberately pressure the back row');
  Math.random=oldRandom;
}

{
  context.ENEMIES_DATA={Backstabber:{archetype:'skirmisher',ability:'fireball'}};
  context.hs=h=>({threat:h.threat||1});
  const missionData={type:'dungeon',enemyPool:['Backstabber']};
  const fragile=[{class:'Mage',subclass:null,threat:.6},{class:'Ranger',subclass:null,threat:.8}];
  const balanced=[{class:'Warrior',subclass:'guardian',threat:2},{class:'Priest',subclass:'lifepriest',threat:.7}];
  assert.ok(context.offlineCompositionFactor(missionData,balanced)>context.offlineCompositionFactor(missionData,fragile),'offline combat preserves the advantage of mechanic coverage');
}

{
  context.ENEMIES_DATA['Bone Guard']={archetype:'tank',baseHp:52,baseAttack:14,baseDefense:10,damageType:'physical',drops:[]};
  context.ENEMY_ARCHETYPES_DATA={tank:{hpMult:1.3,attackMult:.9,defMult:1.25,attackInterval:3000,protectorAura:.15}};
  context.rnd=(a)=>a;context.gameIcon=()=>'';context.enemyAttackIntervalMs=e=>e.attackInterval;context.scheduleNextAttack=(e,enemy,now)=>{e.nextAttackAt=now+e.attackInterval};
  const now=Date.now(),king={id:1,name:'Skeleton King',boss:true,hp:65,maxHp:100,atk:20,attackInterval:4000,statuses:{}};
  const m={type:'dungeon',level:8,boss:'Skeleton King',battle:{boss:true,bossEnrageAt:now+100000,bossMechanics:{summoned70:false,summoned35:false,phaseTwo:false,enraged:false},enemies:[king],log:[],actionSeq:0}};
  context.processBossMechanics(m,now);
  assert.equal(m.battle.enemies.filter(e=>e.name==='Bone Guard').length,1,'the first Royal Guard rises at 70% HP');
  king.hp=45;context.processBossMechanics(m,now+1);
  assert.equal(king.phase,'Grave Sovereign','the Skeleton King changes phase below half health');
  assert.ok(king.attackInterval<4000,'phase two makes the boss faster');
  m.battle.bossEnrageAt=now;context.processBossMechanics(m,now+2);
  assert.equal(king.enraged,true,'the encounter eventually enrages');
  const doubled=context.makeEnemy('dungeon',8,1,'Bone Guard');
  assert.ok(doubled.maxHp>290,'normal enemy HP uses the doubled global multiplier');
}

console.log('Combat mechanic tests passed.');
