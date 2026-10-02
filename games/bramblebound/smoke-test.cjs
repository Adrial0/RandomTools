const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},context=new Proxy({},{get:()=>noop,set:()=>true});
function harness(saved={},audioEvents=null){
 const events={};const elements=new Map(),choices=[0,2,3,4].map(value=>({value:String(value)}));
 const element=()=>({style:{setProperty:noop},classList:{add:noop,remove:noop},hidden:false,textContent:'',innerHTML:'',addEventListener:noop,setAttribute:noop,getContext:()=>context});
 const document={querySelector(s){if(!elements.has(s)){const el=element();el.addEventListener=(name,fn)=>events[s+":"+name]=fn;elements.set(s,el);}return elements.get(s)},querySelectorAll(s){return s==='#choices select'?choices:[]}};
 let seed=13;const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const storage={...saved};const sandbox={BrambleAudio:{play:(event,data)=>audioEvents?.push({event,data})},document,Math:math,window:{addEventListener:(name,fn)=>events[name]=fn},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Path2D:class {constructor(path){this.path=path}},requestAnimationFrame:noop,setTimeout:noop,console};
 vm.runInNewContext(fs.readFileSync(__dirname+'/gear.js','utf8'),sandbox);
 const src=fs.readFileSync(__dirname+'/game.js','utf8').replace(/\}\)\(\);\s*$/,`globalThis.test={meleeCanConnect,meleeDistance,toggleSellMode,buyBack,canMoveItem,markGearTargets,abilityDamage,poisonDuration,freezeDuration,effectText,enemyBodyBounds,enemyXp,enemyAttackProfile,fireEnemyAttack,tickProfileAttack,applyNoteSupport,absorbBarrier,hasRoof,ceiling,roofLimit,collideRoof,AREAS,ZONES,areaInfo,regionTier,migrateWorld,WEAPON_STAGES,start:()=>{start();enter()},startTown:start,beginPartySetup,pickClass,showSavePicker,SWARM_BOSSES,explode,basicAmount,sceneEnemyTypes,enemySummonType,WEAPON_AREAS,setShopClass:c=>shopClass=c,summonInterval,drawItemIcon,openMainMenu,chooseSaveSlot,readSlot,tickBossExit,manaPercent,itemSymbol,canAutoMove,setAutoMove,openSettings,closeSettings,float,tickNumbers,changeScene,tickSceneFade,rawUpdate:update,pickLoot,setLoot:l=>loot.push(l),stageExitOpen,defeatBossAndAdvance:()=>{enemies.filter(e=>e.type==='boss').forEach(e=>e.hp=0);tickBossExit(2);completeArea()},REGIONAL_POOLS,REGION_BOSSES,tickRogueArms,rogueHands,applySong,songTotal,enemyDamage,effectiveAgi,setTime:n=>time=n,tickMinions,shootNote,swingSegments,combatAllies,classes,draw,shopPages,renderServices,fitFullscreen,setShopPage:n=>shopIndex=n,WORLD,controlDuration,slowFactor,panMap,setPan:n=>mapPan=n,xpGain,stepEnemyPhysics,tickCatapult,drawEnemy,ENEMY_TYPES,enemyTrait,encounterType,revivalCost,revive,tickSlash,attackMotion,needed,areaHealth,weaponPrice,buyPrice,aura,terrainHit,tickShots,moveEnemy,innCost,stepHeld,grounded,launchHazard,tickHazards,tickSpecial,moveHeld,release,setHeld:h=>drag=h,stageCount,shopStock,setStage:n=>stage=n,clearRegion:()=>{for(let i=stage;i<stageCount();){enemies.filter(e=>e.type==='boss').forEach(e=>e.hp=0);tickBossExit(2);completeArea();tickSceneFade(1);if(state==='map')break}},openMap,travel,completeArea,healTown,sellItem,buyRune,pickPotions,unlockedNodes,inspect,inspectHero,restoreInfo,update,damage,xp,equip,enter,load,save,stats,allocate,select,moveItem,attackToken,basicHit,activate,tickEffects,enemy,shoot,rollDrops,weaponDropTable,WEAPON_DROPS,dropMultiplier,stepBody,resolveStrike,frame,toggle,get:()=>({sellMode,buybackItems,menuOpen,activeSlot,sceneFade,heroes,minions,enemies,numbers,hazards,blasts,rituals,area,stage,state,inventory,inventoryRunes,fields,shots,loot,paused,time,completed,potions,currentNode,selected,hoverHero,inspectingItem,gold}),setPotion:p=>potions.push(p),setGold:n=>gold=n,setPicked:s=>pickedSlot=s,setGearDrag:v=>gearDrag=v,setArea:n=>area=n,setItem:(i,id)=>inventory[i]=id,setParty:ids=>heroes=ids.map(hero),items:ITEMS,effects:EFFECTS};})();`);
 vm.runInNewContext(src,sandbox);const api=sandbox.test;api.chooseSaveSlot(1);for(const name of ['update','travel','completeArea','defeatBossAndAdvance']){const original=api[name];api['raw_'+name]=original;api[name]=(...args)=>{const result=original(...args);api.tickSceneFade(1);return result}}return {t:api,storage,choices,math,events,elements};
}
const {t,storage,choices}=harness();
choices.forEach(c=>c.value='1');t.start();assert.ok(t.get().heroes.every(h=>h.classId===1));
assert.equal(t.get().enemies.length,6);for(let i=0;i<100;i++)t.update(.02);assert.equal(t.get().enemies.length,6,'No timed spawning');
t.xp(t.needed(1));assert.ok(t.get().heroes.every(h=>h.level===2&&h.sp===2));t.select(0);assert.ok(t.allocate('int'));assert.equal(t.get().heroes[0].int,1);assert.ok(t.allocate('dex'));assert.equal(t.allocate('int'),false,'Cannot spend without SP');
t.xp(t.needed(2));assert.ok(t.allocate('int'));let h=t.get().heroes[0];assert.equal(h.int,2);
t.setItem(0,'1-fire');assert.ok(t.equip(0));assert.equal(h.weapon,'1-fire');assert.equal(t.get().inventory[0],'1-basic','Equipping swaps original into inventory');
let victim=t.get().enemies[0];victim.hp=victim.maxHp=10000;
for(let i=1;i<=4;i++){t.basicHit(victim,1,t.attackToken(h));assert.equal(h.mp,i*2);assert.equal(t.get().fields.length,0)}
t.basicHit(victim,1,t.attackToken(h));assert.equal(h.mp,0);assert.equal(t.get().fields.length,1,'2 INT / 10 MP fires on fifth landed hit');
t.tickEffects(.05);assert.equal(h.mp,0,'Ability damage does not generate MP');
const token=t.attackToken(h);t.basicHit(victim,1,token);t.basicHit(victim,1,token);assert.equal(h.mp,2,'Multiple targets charge only once per basic attack');
const inFlight=t.attackToken(h);assert.ok(t.moveItem({type:'gear',index:0},{type:'bag',index:3}));assert.equal(h.weapon,null);assert.equal(h.mp,0);t.basicHit(victim,1,inFlight);assert.equal(h.mp,0,'Old projectile cannot charge new equipment');assert.equal(t.get().inventory[3],'1-fire');
assert.ok(t.moveItem({type:'bag',index:3},{type:'gear',index:0}));assert.equal(h.weapon,'1-fire');assert.equal(t.get().inventory[3],null);
t.setItem(4,'2-poison');assert.equal(t.moveItem({type:'bag',index:4},{type:'gear',index:0}),false,'Wrong class rejected atomically');assert.equal(t.get().inventory[4],'2-poison');assert.equal(h.weapon,'1-fire');
h.level=6;t.stats(h);t.setItem(5,'1-steel');assert.ok(t.equip(5));assert.equal(h.weapon,'1-steel');t.setItem(6,'1-ice');assert.ok(t.moveItem({type:'bag',index:6},{type:'bag',index:5}));assert.equal(t.get().inventory[5],'1-ice');
// Class-specific stat effects.
for(let c=0;c<8;c++){t.setParty([c,c,c,c]);const p=t.get().heroes[0];const before={max:p.atMax,min:p.atMin,range:p.range,agi:p.agi[0]};p.attributes.str++;t.stats(p);if(c===0)assert.equal(p.atMax,before.max+1);if(c===2||c===3)assert.equal(p.range,before.range+2);p.attributes.int=2;t.stats(p);assert.equal(p.int,2)}
assert.ok(t.items['0-heavy'].max>t.items['0-lightning'].max,'Physical sword can outdamage elemental sword');
// Freeze/slow, poison, lightning, heal, drain, stun all execute actual gameplay effects.
t.setParty([0,2,3,4]);t.setArea(0);t.enter();h=t.get().heroes[0];victim=t.get().enemies[0];victim.hp=victim.maxHp=10000;t.activate(h,victim,'ice');assert.ok(victim.frozen>0);t.tickEffects(.8);assert.equal(victim.frozen,0);assert.ok(!(victim.slow>0));
t.activate(h,victim,'poison');const beforePoison=victim.hp;t.tickEffects(1);assert.ok(victim.hp<beforePoison);const hp=victim.hp;t.activate(h,victim,'lightning');assert.ok(victim.hp<hp);h.hp=10;t.activate(h,victim,'heal');assert.ok(h.hp>10);const beforeDrain=h.hp;t.activate(h,victim,'drain');assert.ok(h.hp>beforeDrain);t.activate(h,victim,'stun');assert.ok(victim.stun>0);
// Killing hit still charges. No charge for attacks on already dead targets.
h.weapon='0-fire';h.attributes.int=2;t.stats(h);h.mp=0;victim.hp=1;t.basicHit(victim,10,t.attackToken(h));assert.equal(h.mp,2);t.basicHit(victim,10,t.attackToken(h));assert.equal(h.mp,2);
t.get().enemies.slice().forEach(e=>t.damage(e,99999));t.update(.01);assert.equal(t.get().state,'walk');assert.equal(t.get().area,0);const stopped=t.get().heroes.map(h=>h.x);for(let i=0;i<100;i++)t.update(.02);assert.equal(t.get().stage,0);t.get().heroes.forEach((h,i)=>assert.ok(Math.abs(h.x-stopped[i])<2,'Cleared party stays in place'));const exitHero=t.get().heroes[0];exitHero.x=554;exitHero.y=100;t.update(.01);assert.equal(t.get().stage,0,'Flying above sign does not advance');exitHero.y=226;exitHero.vy=0;t.update(.01);assert.equal(t.get().stage,1,'Only one hero must touch sign');assert.ok(!t.get().completed.includes('a0'));
t.setArea(4);t.enter();const summoner=t.get().enemies.find(e=>e.type==='summoner');const count=t.get().enemies.length;summoner.summon=0;t.update(.01);assert.equal(t.get().enemies.length,count+1);
t.get().heroes.forEach(h=>h.hp=0);t.update(.01);assert.equal(t.get().state,'service');assert.equal(t.get().currentNode,'town');assert.ok(t.get().heroes.every(h=>h.hp===Math.ceil(h.maxHp*.05)));
// Opening party still wins and earns unspent points without automatic spending.
t.setArea(0);t.setParty([0,2,3,4]);t.enter();for(let i=0;i<20000&&t.get().state!=='map'&&t.get().state!=='lost';i++)t.update(.02);assert.ok(t.get().stage>0);assert.ok(t.get().heroes.every(h=>h.int===0));
t.xp(t.needed(t.get().heroes[0].level));t.select(0);t.allocate('int');t.setItem(0,'0-fire');t.equip(0);t.get().heroes[0].mp=3;t.save();const reloaded=harness(storage).t.get();assert.equal(reloaded.heroes[0].weapon,'0-fire');assert.equal(reloaded.heroes[0].int,1);assert.equal(reloaded.heroes[0].mp,3);assert.equal(reloaded.inventory.length,15);
const old={area:3,gold:99,inventory:[1,2],heroes:[0,2,3,4].map(classId=>({classId,level:5,xp:2,weapon:2}))};const migrated=harness({'bramblebound-v2':JSON.stringify(old)}).t.get();assert.equal(migrated.heroes[0].sp,8);assert.equal(migrated.heroes[0].weapon,'0-iron');assert.equal(migrated.area,5);

// No charging with zero INT; minimum level restrictions leave both slots intact.
const isolated=harness().t;isolated.start();let fighter=isolated.get().heroes[0];isolated.setItem(0,'0-steel-t6');assert.equal(isolated.equip(0),false);assert.equal(fighter.weapon,'0-basic');assert.equal(isolated.get().inventory[0],'0-steel-t6');
isolated.setItem(1,'0-fire');isolated.equip(1);let dummy=isolated.get().enemies[0];dummy.hp=dummy.maxHp=10000;isolated.basicHit(dummy,1,isolated.attackToken(fighter));assert.equal(fighter.mp,0);
// Ten fire pulses regardless of coarse simulation steps, without proc recursion.
isolated.activate(fighter,dummy,'fire');let field=isolated.get().fields[0];const fireStart=dummy.hp;field.chance=1;field.min=field.max=4;for(let i=0;i<21;i++)isolated.tickEffects(.1);assert.equal(dummy.hp,fireStart-240);assert.equal(fighter.mp,0);assert.equal(isolated.get().fields.length,0);
// A launched projectile earns nothing until it actually lands.
fighter.attributes.int=2;isolated.stats(fighter);dummy.x=fighter.x+100;dummy.y=fighter.y;isolated.get().heroes.forEach(h=>h.cooldown=10);isolated.get().enemies.forEach(e=>e.cooldown=10);isolated.shoot(fighter,dummy,'arrow',1,isolated.attackToken(fighter));isolated.update(.01);assert.equal(fighter.mp,0);for(let i=0;i<80;i++)isolated.tickShots(.01);assert.equal(fighter.mp,2);
// Cancelling an attack because the victim was already dead yields no MP.
const discarded=isolated.attackToken(fighter);dummy.hp=0;isolated.shoot(fighter,dummy,'arrow',1,discarded);isolated.update(.01);assert.equal(fighter.mp,2);
// Continuous simulation while dragging equipment or changing focus; manual pause still works.
const motion=harness();motion.t.start();motion.t.setGearDrag({from:{type:'bag',index:0},moved:false});motion.t.frame(16);assert.ok(motion.t.get().time>0,'Equipment dragging must not pause');motion.events.blur();assert.equal(motion.t.get().paused,false);const elapsed=motion.t.get().time;motion.t.frame(32);assert.ok(motion.t.get().time>elapsed);motion.t.toggle();motion.events.blur();motion.t.frame(48);assert.equal(motion.t.get().paused,true);assert.equal(motion.t.get().time,elapsed+.016);motion.t.toggle();
const body=motion.t.get().heroes[0];body.drive=33;body.vx=0;const beforeX=body.x;motion.t.stepBody(body,1/60);assert.ok(body.vx>0&&body.vx<33);assert.ok(body.x>beforeX);const momentum=body.vx;motion.t.stepBody(body,1/60);assert.ok(body.vx>0&&body.vx<momentum,'Coasting decelerates instead of snapping');body.y=70;body.vy=0;for(let i=0;i<240;i++)motion.t.stepBody(body,1/120);assert.ok(body.y>=200&&body.y<=226);assert.ok(Number.isFinite(body.lean));
body.classId=1;const meleeTarget=motion.t.get().enemies[0];meleeTarget.x=body.x+10;meleeTarget.y=body.y;const health=meleeTarget.hp;body.strike={left:.09,target:meleeTarget,amount:3,token:motion.t.attackToken(body),range:30};motion.t.resolveStrike(body,.04);assert.equal(meleeTarget.hp,health,'Swing windup deals no immediate damage');motion.t.resolveStrike(body,.06);assert.equal(meleeTarget.hp,health-3);assert.equal(meleeTarget.kick||0,0);body.strike={left:.09,target:meleeTarget,amount:3,token:motion.t.attackToken(body),range:30};meleeTarget.x+=100;motion.t.resolveStrike(body,.1);assert.equal(meleeTarget.hp,health-3,'Out-of-range melee attack misses');
// Exact drop boundary, no guaranteed final kill, and both item categories.

const drops=harness();drops.t.start();drops.math.random=()=>.9;
drops.t.get().enemies.forEach(e=>drops.t.damage(e,9999));assert.equal(drops.t.get().loot.length,0,'Last enemy has no guaranteed drop');
for(const [type,low,high] of [['slime',4700,5300],['swarmling',2300,2700],['boss',9600,10400]]){
 const sample=harness();sample.t.setStage(7);const foe=sample.t.enemy(type,300);let weapons=0,sockets=0,souls=0;
 for(let i=0;i<100000;i++)for(const id of sample.t.rollDrops(foe)){const item=sample.t.items[id];if(item.type==='weapon')weapons++;else if(item.type==='soul')souls++;else sockets++;}
 assert.ok(weapons>low&&weapons<high,type+' weapon rate '+weapons);assert.ok(sockets>850&&sockets<1150);assert.ok(type==='boss'?souls>9500&&souls<10500:souls===0);
}

const run=harness(),rt=run.t;rt.start();const rh=rt.get().heroes[0];rt.setItem(0,'rune-leech');assert.ok(rt.moveItem({type:'bag',index:0},{type:'rune0',index:0}));rt.setItem(1,'rune-ward');assert.ok(rt.moveItem({type:'bag',index:1},{type:'rune1',index:0}));assert.equal(rh.runes.length,2);
assert.equal(rt.moveItem({type:'rune0',index:0},{type:'gear',index:0}),false);assert.equal(rt.moveItem({type:'gear',index:0},{type:'rune1',index:0}),false);
rh.hp=20;const target=rt.get().enemies[0];target.hp=5;rt.basicHit(target,100,rt.attackToken(rh));assert.equal(rh.hp,20.1,'Lifesteal uses actual damage, not overkill');
rt.setParty([0,0,0,0]);const q=rt.get().heroes[0];q.runes=['rune-ward','rune-ward'];rt.stats(q);q.hp=100;rt.damage(q,20,'poison');assert.equal(q.hp,84);rt.damage(q,20);assert.equal(q.hp,64,'Ward does not reduce physical damage');
q.runes=['rune-wisdom',null];rt.stats(q);rt.xp(10);assert.equal(q.xp,11);assert.equal(rt.get().heroes[1].xp,10);
q.attributes.str=10;q.runes=[null,null];rt.stats(q);const baseAgi=q.agi[0],baseAt=q.atMax,baseRange=q.range,baseHp=q.maxHp;
q.runes=['rune-haste','rune-might'];rt.stats(q);assert.ok(q.agi[0]<baseAgi);assert.ok(q.atMax>baseAt);
q.runes=['rune-reach','rune-vitality'];rt.stats(q);assert.equal(q.range,baseRange+15);assert.equal(q.maxHp,Math.floor(baseHp*1.2));
q.runes=['rune-renewal',null];rt.stats(q);q.hp=20;rt.update(.5);assert.equal(q.hp,20.5);
assert.equal(rt.moveItem({type:'rune0',index:0},{type:'bag',index:4}),false);assert.equal(q.runes[0],'rune-renewal');assert.equal(rt.get().inventory[4],null);
rt.setItem(5,'rune-reach');rt.moveItem({type:'bag',index:5},{type:'rune1',index:0});rt.save();const restored=harness(run.storage).t.get();assert.equal(restored.heroes[0].runes[1],'rune-reach');assert.equal(restored.inventory[4],null);
const legacy={version:3,area:0,gold:0,inventory:[],heroes:[0,2,3,4].map(classId=>({classId,level:5,xp:0,weapon:classId+'-fire',attributes:{str:1,dex:1,int:2}}))};
const upgraded=harness({'bramblebound-v3':JSON.stringify(legacy)});assert.equal(upgraded.t.get().heroes[0].sp,4);upgraded.t.save();assert.equal(harness(upgraded.storage).t.get().heroes[0].sp,4,'SP top-up does not repeat on reload');
// Town starts the journey; paths unlock on completion, including the trader detour.
const world=harness(),wt=world.t;wt.startTown();assert.equal(wt.get().state,'service');assert.equal(wt.get().currentNode,'town');assert.equal(wt.travel('a3'),false);assert.equal(wt.travel('trader'),false);
const wh=wt.get().heroes[0];wh.hp=17;wt.xp(wt.needed(1));assert.equal(wh.hp,17,'Leveling never heals');wt.allocate('str');assert.equal(wh.hp,17,'Spending HP-increasing stats never heals');assert.ok(wt.travel('a0'));assert.equal(wh.hp,17);wt.clearRegion();assert.ok(wt.unlockedNodes().has('a1'));assert.ok(!wt.unlockedNodes().has('a2'));assert.ok(wt.travel('a1'));assert.equal(wh.hp,17);wt.clearRegion();wt.travel('a2');wt.clearRegion();assert.ok(wt.unlockedNodes().has('a3'));assert.ok(!wt.unlockedNodes().has('trader'));wt.travel('a3');wt.clearRegion();wt.travel('a4');wt.clearRegion();assert.ok(wt.unlockedNodes().has('trader'));assert.equal(wh.hp,17);
wt.travel('trader');assert.equal(wt.healTown(),false);wt.setGold(1100);assert.ok(wt.buyRune('rune-ward'));assert.equal(wt.get().gold,100);assert.equal(wt.buyRune('rune-leech'),false);wt.setPicked({type:'bag',index:0});assert.ok(wt.sellItem());assert.equal(wt.get().inventory[0],null);assert.equal(wt.get().gold,200);assert.equal(wt.sellItem(),false);
wt.travel('town');assert.equal(wh.hp,17,'Visiting town alone does not heal');wt.get().heroes[1].hp=0;wt.healTown();assert.equal(wh.hp,wh.maxHp);assert.equal(wt.get().heroes[1].hp,wt.get().heroes[1].maxHp);
wh.hp=19;wt.get().heroes[1].hp=0;wt.save();const healthReload=harness(world.storage).t;assert.equal(healthReload.get().heroes[0].hp,19);assert.equal(healthReload.get().heroes[1].hp,0);assert.ok(healthReload.unlockedNodes().has('trader'));
// Five-percent potions are independent from item drops and heal only the grounded collector.
const pot=harness(),pt=pot.t;pt.start();pot.math.random=()=>.30;pt.damage(pt.get().enemies[0],9999);assert.equal(pt.get().potions.length,0);pot.math.random=()=>.29999;pt.damage(pt.get().enemies[1],9999);assert.equal(pt.get().potions.length,1);assert.equal(pt.get().loot.length,0);const potion=pt.get().potions[0];pt.get().heroes.forEach((h,i)=>{h.hp=10;h.x=20+i*10;h.y=226});const collector=pt.get().heroes[2];collector.x=potion.x;collector.y=potion.y-30;pt.pickPotions();assert.equal(pt.get().potions.length,1,'Airborne heroes cannot consume ground potions');collector.y=potion.y;pt.pickPotions();assert.equal(pt.get().potions.length,0);assert.equal(collector.hp,10+Math.ceil(collector.maxHp*.2));assert.equal(pt.get().heroes[0].hp,10);assert.equal(pt.get().heroes[1].hp,10);assert.equal(pt.get().heroes[3].hp,10);
pt.setPotion({x:collector.x,y:collector.y});collector.hp=collector.maxHp-1;pt.pickPotions();assert.equal(collector.hp,collector.maxHp);pt.setPotion({x:collector.x,y:collector.y});collector.hp=0;pt.pickPotions();assert.equal(pt.get().potions.length,1,'Potion cannot revive a corpse');
// Hovering uses the left panel and does not change selection.
wt.inspect('0-fire');assert.equal(world.elements.get('#hover-info').hidden,false);assert.equal(world.elements.get('#character-info').hidden,true);wt.inspectHero(2);assert.equal(wt.get().selected,0);assert.equal(world.elements.get('#class-name').textContent,'Mage');wt.restoreInfo();assert.equal(world.elements.get('#hover-info').hidden,true);

// Bound sockets follow individual weapon copies through swaps and saves.
const bind=harness(),bt=bind.t;bt.start();bt.setItem(0,'rune-might');assert.ok(bt.moveItem({type:'bag',index:0},{type:'rune0',index:0}));bt.setItem(1,'rune-reach');assert.ok(bt.moveItem({type:'bag',index:1},{type:'rune0',index:0}));assert.equal(bt.get().inventory[1],null);assert.equal(bt.get().heroes[0].runes[0],'rune-reach');
bt.setItem(2,'0-basic');assert.ok(bt.moveItem({type:'bag',index:2},{type:'gear',index:0}));assert.equal(bt.get().heroes[0].runes[0],null);assert.equal(bt.get().inventoryRunes[2][0],'rune-reach');bt.save();const br=harness(bind.storage).t;assert.equal(br.get().inventoryRunes[2][0],'rune-reach');assert.ok(br.moveItem({type:'bag',index:2},{type:'gear',index:0}));assert.equal(br.get().heroes[0].runes[0],'rune-reach');
const stages=harness(),st=stages.t;st.start();for(let a=0;a<9;a++){st.setArea(a);assert.ok(st.stageCount()>=5&&st.stageCount()<=8);st.setStage(0);st.enter();assert.ok(!st.get().enemies.some(e=>e.type==='boss'));st.setStage(st.stageCount()-1);st.enter();assert.equal(st.get().enemies.filter(e=>e.type==='boss').length,st.SWARM_BOSSES[a]||1)}
const sh=harness(),shp=sh.t;shp.startTown();assert.ok(shp.shopStock().every(w=>w.id.endsWith('-basic')));shp.openMap();assert.ok(!sh.elements.get('#map-nodes').innerHTML.includes('Woodland'));shp.travel('a0');shp.clearRegion();shp.travel('town');assert.ok(shp.shopStock().every(w=>w.id.endsWith('-basic')||shp.WEAPON_AREAS[w.id]===0));shp.setGold(1000);assert.equal(shp.buyRune('0-steel'),false);

// Enemy attacks have physical trajectories; a missed target is not damaged.
const combat=harness(),ct=combat.t;ct.start();const ch=ct.get().heroes[0];ct.get().heroes.forEach((h,i)=>{h.x=90+i*25;h.y=226;h.hp=h.maxHp});
const shooter=ct.enemy('spitter',300);let projectile=ct.launchHazard(shooter,ch,'bullet',0,30);const originalAngle=Math.atan2(projectile.vy,projectile.vx);ch.y=100;const dodgeHp=ch.hp;for(let i=0;i<100;i++)ct.tickHazards(.01);assert.equal(ch.hp,dodgeHp,'Moving out of straight bullet path dodges it');assert.equal(Math.atan2(projectile.vy,projectile.vx),originalAngle);
ch.x=200;ch.y=226;projectile=ct.launchHazard(shooter,ch,'bullet',0,30);const hitHp=ch.hp;for(let i=0;i<80;i++)ct.tickHazards(.01);assert.ok(ch.hp<hitHp,'Bullet collides with body');
projectile=ct.launchHazard(shooter,ch,'arrow');const vy=projectile.vy;ct.tickHazards(.1);assert.ok(projectile.vy>vy,'Arrows fall under gravity');
projectile=ct.launchHazard(shooter,ch,'missile');const heading=Math.atan2(projectile.vy,projectile.vx);ch.y=40;ct.tickHazards(.1);const change=Math.abs(Math.atan2(Math.sin(Math.atan2(projectile.vy,projectile.vx)-heading),Math.cos(Math.atan2(projectile.vy,projectile.vx)-heading)));assert.ok(change>0&&change<=.150001,'Homing turn is limited so missiles can be outmaneuvered');
const bombs=harness(),btwo=bombs.t;btwo.start();const bh=btwo.get().heroes[0];btwo.get().heroes.forEach((h,i)=>{h.x=20+i*15;h.y=226});const bomb=btwo.launchHazard(btwo.enemy('boss',300),bh,'bomb',0,40);bomb.x=bh.x;bomb.y=bh.y-3;bomb.vx=bomb.vy=0;bomb.fuse=.2;const beforeBomb=bh.hp;btwo.tickHazards(.1);assert.equal(bh.hp,beforeBomb);btwo.tickHazards(.11);assert.equal(bh.hp,beforeBomb-40,'Bomb only damages when its fuse expires');assert.ok(btwo.get().blasts.length);
const pattern=btwo.enemy('boss',350);pattern.specialCooldown=0;const countBefore=btwo.get().hazards.length;btwo.tickSpecial(pattern,bh,.01);assert.equal(pattern.warning,null);assert.equal(btwo.get().hazards.length,countBefore+7,'Projectile fan fires without warning');
const thrower=harness(),tt=thrower.t;tt.start();const th=tt.get().heroes[0];th.x=100;th.y=160;th.vx=th.vy=0;tt.setHeld(th);tt.moveHeld(160,100,200);assert.equal(th.x,100,'Pointer movement sets target without teleporting body');for(let i=0;i<10;i++)tt.stepHeld(th,.01);assert.ok(th.x>100&&th.x<160&&th.y<160&&th.y>100,'Body lags behind dragged target');const releaseX=th.x,releaseY=th.y,throwVX=th.vx,throwVY=th.vy;tt.release({timeStamp:200});assert.equal(th.vx,throwVX);assert.equal(th.vy,throwVY);tt.stepBody(th,.05);assert.ok(th.x>releaseX&&th.y<releaseY,'Release carries spring momentum');for(let i=0;i<200;i++)tt.stepBody(th,.01);th.y=100;th.vy=300;for(let i=0;i<80&&th.vy!==0;i++)tt.stepBody(th,.01);assert.ok(th.crouch>0,'Landing compresses the body');
const air=harness(),at=air.t;at.start();const ah=at.get().heroes[0],ae=at.get().enemies[0];ah.x=ae.x-10;ah.y=100;ah.vy=0;ah.cooldown=0;const enemyHealth=ae.hp;at.update(.01);assert.equal(ah.strike,null);assert.ok(!at.get().shots.some(s=>s.attack?.owner===ah));ah.strike={left:0,target:ae,amount:50,token:at.attackToken(ah),range:100};at.resolveStrike(ah,.01);assert.equal(ae.hp,enemyHealth,'Airborne pending melee hit is cancelled');
const inn=harness(),it=inn.t;it.startTown();const ih=it.get().heroes[0];ih.hp-=21;assert.equal(it.innCost(),3);it.setGold(2);assert.equal(it.healTown(),false);assert.equal(ih.hp,ih.maxHp-21);assert.equal(it.get().gold,2);it.setGold(10);assert.ok(it.healTown());assert.equal(it.get().gold,7);assert.equal(ih.hp,ih.maxHp);assert.equal(it.innCost(),0);it.healTown();assert.equal(it.get().gold,7);
tt.select(3);const priest=tt.get().heroes[3];priest.attributes.str=6;priest.attributes.dex=11;tt.stats(priest);tt.inspectHero(3);assert.match(thrower.elements.get('#priest-aura').textContent,/AT \+6% · DEF \+2.2/);tt.inspectHero(0);assert.equal(thrower.elements.get('#priest-aura').hidden,true);

const slowDrag=harness().t,fastDrag=harness().t;for(const d of [slowDrag,fastDrag]){d.start();const h=d.get().heroes[0];h.x=100;h.y=150;h.vx=h.vy=0;h.dragSample={x:100,y:150,t:0};d.setHeld(h)}slowDrag.moveHeld(160,100,1000);fastDrag.moveHeld(160,100,50);for(let i=0;i<8;i++){slowDrag.stepHeld(slowDrag.get().heroes[0],.01);fastDrag.stepHeld(fastDrag.get().heroes[0],.01)}assert.ok(fastDrag.get().heroes[0].x>slowDrag.get().heroes[0].x+8,'Fast cursor movement produces faster follow at equal distance');

const mechanics=harness(),mt=mechanics.t;mt.start();assert.deepEqual(Array.from({length:16},(_,i)=>mt.areaHealth(Math.ceil(i*125/77))),[20,40,60,80,100,130,160,190,220,250,290,330,370,410,450,500]);for(let i=0;i<9;i++){mt.setArea(i);assert.equal(mt.enemy('boss',300).maxHp,mt.areaHealth(i)*10)}assert.deepEqual(Array.from({length:13},(_,i)=>mt.weaponPrice(i)),[100,250,500,750,1000,1500,2000,2500,3000,3500,4000,4500,5000]);assert.equal(mt.weaponPrice(22),10000);assert.equal(mt.weaponPrice(23),11000);assert.equal(mt.buyPrice(mt.items['0-ice']),750);assert.equal(mt.needed(1),288);
mt.setArea(1);mt.setStage(0);mt.enter();assert.ok(mt.terrainHit(160,215,200,215),'A terrain wall blocks a low shot');const wallTarget=mt.get().enemies[0];wallTarget.x=210;wallTarget.y=226;wallTarget.hp=100;const wallShooter=mt.get().heroes[0];wallShooter.x=160;wallShooter.y=226;mt.shoot(wallShooter,wallTarget,'bullet',40,mt.attackToken(wallShooter));mt.tickShots(.3);assert.equal(wallTarget.hp,100);assert.equal(mt.get().shots.length,0);
const climber=mt.get().heroes[0];climber.x=179.9;climber.y=226;climber.vy=0;climber.vx=33;climber.drive=33;mt.stepBody(climber,.01);assert.ok(climber.y>220,'Hero does not snap 19 pixels up hill');for(let i=0;i<150;i++){climber.drive=33;mt.stepBody(climber,.01)}assert.ok(climber.x>180&&Math.abs(climber.y-207)<1,'Hero finishes stepping onto ledge');
const ec=mt.enemy('slime',179.9);mt.moveEnemy(ec,.3,.01);assert.ok(ec.y>220);for(let i=0;i<150;i++)mt.moveEnemy(ec,.17,.01);assert.ok(ec.x>180&&Math.abs(ec.y-207)<1,'Enemy steps onto ledge');
mt.setArea(0);mt.setParty([4,0,0,0]);mt.enter();const priestPulse=mt.get().heroes[0];priestPulse.x=260;priestPulse.y=219;priestPulse.weapon='4-fire';priestPulse.attributes.int=2;priestPulse.attributes.str=4;mt.stats(priestPulse);priestPulse.cooldown=0;mt.get().heroes.slice(1).forEach(h=>{h.x=20;h.cooldown=99});mt.get().enemies.forEach((e,i)=>{e.x=i<2?280+i*20:480;e.y=219;e.hp=e.maxHp=100;e.cooldown=99;e.specialCooldown=99});mt.update(.001);assert.ok(mt.get().enemies[0].hp<100&&mt.get().enemies[1].hp<100);assert.equal(mt.get().enemies[2].hp,100);assert.equal(priestPulse.mp,2,'Aura pulse charges MP once for multiple enemies');const ally=mt.get().heroes[1];ally.x=priestPulse.x;ally.y=priestPulse.y-200;assert.equal(mt.aura(ally).attack,1,'Above the aura gets no buff');ally.y=priestPulse.y;assert.ok(mt.aura(ally).attack>1);


const resurrection=harness(),rv=resurrection.t;rv.start();const corpse=rv.get().heroes[0];corpse.level=3;rv.stats(corpse);corpse.hp=0;rv.setGold(29);rv.select(0);assert.equal(rv.revivalCost(corpse),30);assert.equal(rv.revive(),false);assert.equal(corpse.hp,0);assert.equal(resurrection.elements.get('#revive').hidden,false);rv.setGold(1000);assert.equal(rv.revivalCost(corpse),100);assert.ok(rv.revive());assert.equal(rv.get().gold,900);assert.equal(corpse.hp,Math.ceil(corpse.maxHp*.1));assert.equal(rv.revive(),false);rv.get().heroes.forEach(h=>h.hp=0);rv.update(.01);assert.equal(rv.get().state,'service');assert.equal(rv.get().currentNode,'town');assert.ok(rv.get().heroes.every(h=>h.hp===Math.ceil(h.maxHp*.05)));assert.equal(rv.get().gold,900);assert.equal(rv.revive(),false);assert.equal(resurrection.elements.get('#result').hidden,true);
const closeCombat=harness().t;closeCombat.start();assert.ok(closeCombat.get().enemies.some(e=>e.type==='slasher'));const slashEnemy=closeCombat.enemy('slasher',250),dodgeHero=closeCombat.get().heroes[0];closeCombat.get().heroes.forEach(h=>{h.x=20;h.y=226});dodgeHero.x=225;dodgeHero.y=slashEnemy.y;slashEnemy.slash={left:.18,life:.32,face:-1,hit:false};const initialHP=dodgeHero.hp;closeCombat.tickSlash(slashEnemy,.1);assert.equal(dodgeHero.hp,initialHP);dodgeHero.y-=60;closeCombat.tickSlash(slashEnemy,.09);assert.equal(dodgeHero.hp,initialHP,'Lifting hero dodges slash');closeCombat.tickSlash(slashEnemy,.2);assert.equal(slashEnemy.slash,null);
dodgeHero.y=slashEnemy.y;slashEnemy.slash={left:.18,life:.32,face:-1,hit:false};closeCombat.tickSlash(slashEnemy,.19);assert.ok(dodgeHero.hp<initialHP);const afterSlash=dodgeHero.hp;closeCombat.tickSlash(slashEnemy,.01);assert.equal(dodgeHero.hp,afterSlash,'Slash damages only once');
const bombBoss=closeCombat.enemy('boss',350);bombBoss.warning={left:0,pattern:'BOMBS',x:100,y:226};closeCombat.tickSpecial(bombBoss,dodgeHero,.01);assert.equal(closeCombat.get().hazards.filter(p=>p.kind==='bomb').length,1);const shortMissile=closeCombat.launchHazard(bombBoss,dodgeHero,'missile');assert.equal(shortMissile.life,1.6);for(let i=0;i<170;i++)closeCombat.tickHazards(.01);assert.ok(!closeCombat.get().hazards.includes(shortMissile));closeCombat.attackMotion(dodgeHero);assert.equal(dodgeHero.swingV,48);assert.equal(dodgeHero.swing,-.8);


const auraUI=harness(),au=auraUI.t;au.start();au.setParty([0,4,4,0]);au.enter();const ahh=au.get().heroes;ahh[0].x=200;ahh[0].y=219;ahh[1].x=210;ahh[1].y=219;ahh[2].x=215;ahh[2].y=219;ahh[1].attributes.str=50;ahh[2].attributes.str=50;au.stats(ahh[1]);au.stats(ahh[2]);au.inspectHero(0);assert.equal(auraUI.elements.get('#attack').textContent,Math.round(ahh[0].atMin*2)+'–'+Math.round(ahh[0].atMax*2));ahh[2].x=500;au.inspectHero(0);assert.equal(auraUI.elements.get('#attack').textContent,Math.round(ahh[0].atMin*1.5)+'–'+Math.round(ahh[0].atMax*1.5));ahh[1].hp=0;au.inspectHero(0);assert.equal(auraUI.elements.get('#attack').textContent,ahh[0].atMin+'–'+ahh[0].atMax);
const slowBomb=au.launchHazard(au.enemy('spitter',400),ahh[0],'bomb');assert.ok(Math.abs(slowBomb.vx)<110);assert.equal(slowBomb.fuse,2.6);assert.equal(au.enemy('slasher',300).range,22);assert.equal(au.enemy('slime',300).range,12);

const variety=harness().t;variety.start();const foundTypes=new Set();for(let a=0;a<126;a++){variety.setArea(a);for(let stg=0;stg<variety.stageCount();stg++){variety.setStage(stg);variety.enter();variety.get().enemies.forEach(e=>{foundTypes.add(e.type);foundTypes.add(e.species);variety.drawEnemy(e);assert.ok(Number.isFinite(e.hp)&&e.hp>0)});assert.equal(variety.get().enemies.filter(e=>e.type==='boss').length,stg===variety.stageCount()-1?(variety.SWARM_BOSSES[a]||1):0)}}for(const id of variety.REGIONAL_POOLS.flat())assert.ok(foundTypes.has(id),'Encounter coverage '+id);
variety.setArea(0);const swarm=variety.enemy('swarmling',300),beetle=variety.enemy('beetle',300);assert.equal(swarm.maxHp,10);assert.equal(swarm.range,10);assert.equal(beetle.maxHp,36);assert.ok(swarm.speed>beetle.speed);const hop=variety.enemy('hopper',300);hop.hopCooldown=0;variety.stepEnemyPhysics(hop,{x:100,y:226},.01);assert.ok(hop.vy<0&&hop.vx<0);
variety.setArea(3);variety.setStage(0);variety.enter();const shaman=variety.enemy('shaman',300);variety.get().enemies.push(shaman);const patient=variety.get().enemies[0];patient.x=310;patient.hp=1;for(let i=0;i<3;i++){shaman.healCooldown=0;variety.enemyTrait(shaman,{x:20},.01)}assert.equal(shaman.heals,0);const healed=patient.hp;assert.ok(healed>1);shaman.healCooldown=0;variety.enemyTrait(shaman,{x:20},.01);assert.equal(patient.hp,healed,'Shaman cannot heal indefinitely');


const physicsEnemies=harness().t;physicsEnemies.start();const prey={x:100,y:226,hp:100};const spider=physicsEnemies.enemy('spider',300);for(let i=0;i<100;i++)physicsEnemies.stepEnemyPhysics(spider,prey,.01);assert.equal(spider.feet.length,6);assert.ok(spider.x<300);assert.ok(spider.feet.some(f=>f.step),'Spider feet step independently');const rolling=physicsEnemies.enemy('roller',300);for(let i=0;i<100;i++)physicsEnemies.stepEnemyPhysics(rolling,prey,.01);assert.ok(rolling.vx<-50);assert.ok(Math.abs(rolling.rotation)>1);physicsEnemies.stepEnemyPhysics(rolling,{x:500,y:226},.01);assert.ok(rolling.vx<0,'Roller keeps momentum when target changes sides');
const bat=physicsEnemies.enemy('flyer',300);for(let i=0;i<120;i++)physicsEnemies.stepEnemyPhysics(bat,prey,.01);assert.ok(bat.x<300);assert.ok(bat.y<226);assert.ok(Number.isFinite(bat.vy));
const lobber=physicsEnemies.enemy('catapult',300);lobber.cooldown=0;physicsEnemies.tickCatapult(lobber,prey,.01);assert.ok(lobber.lob);const countRocks=physicsEnemies.get().hazards.length;physicsEnemies.tickCatapult(lobber,prey,.5);assert.equal(physicsEnemies.get().hazards.length,countRocks);physicsEnemies.tickCatapult(lobber,prey,.5);const rock=physicsEnemies.get().hazards.find(p=>p.kind==='rock');assert.ok(rock&&rock.vy<0&&Math.abs(rock.vx)<100);assert.equal(rock.fuse,undefined);assert.equal(rock.amount,lobber.at*4);physicsEnemies.get().heroes.forEach(h=>{h.x=20;h.y=226});const rockVictim=physicsEnemies.get().heroes[0];rock.x=rockVictim.x;rock.y=rockVictim.y-13;rock.vx=rock.vy=0;const rockHP=rockVictim.hp;physicsEnemies.tickHazards(.001);assert.ok(rockVictim.hp<rockHP);assert.equal(physicsEnemies.get().blasts.length,0,'Rocks never explode');[spider,rolling,bat,lobber].forEach(physicsEnemies.drawEnemy);


const gems=harness(),gt=gems.t;gt.start();const gh=gt.get().heroes[0],baseStrength=gh.str,baseHealth=gh.maxHp;gh.hp=20;gt.setItem(0,'gem-ruby-1');assert.ok(gt.moveItem({type:'bag',index:0},{type:'rune0',index:0}));assert.equal(gh.str,baseStrength+5);assert.equal(gh.hp,20);gt.setItem(1,'gem-topaz-1');assert.ok(gt.moveItem({type:'bag',index:1},{type:'rune1',index:0}));assert.equal(gh.maxHp,baseHealth+20+50);assert.equal(gt.moveItem({type:'rune0',index:0},{type:'bag',index:2}),false);gt.moveItem({type:'gear',index:0},{type:'bag',index:2});assert.equal(gh.str,baseStrength);assert.equal(gh.maxHp,baseHealth);gt.save();const gemReload=harness(gems.storage).t;assert.equal(gemReload.get().inventoryRunes[2][0],'gem-ruby-1');gemReload.moveItem({type:'bag',index:2},{type:'gear',index:0});assert.equal(gemReload.get().heroes[0].str,baseStrength+5);
for(const family of ['ruby','emerald','sapphire','amethyst','diamond','topaz'])for(let tier=1;tier<=10;tier++){const item=gt.items['gem-'+family+'-'+tier];assert.equal(item.type,'gem');for(const [key,value] of Object.entries(gt.items['gem-'+family+'-1'].gemStats))assert.equal(item.gemStats[key],value*tier)}
gt.setParty([0,0,0,0]);const defender=gt.get().heroes[0];defender.runes=['gem-diamond-1','gem-amethyst-1'];gt.stats(defender);assert.equal(defender.defense,1);assert.equal(defender.str,2);assert.equal(defender.dex,2);assert.equal(defender.int,2);defender.hp=50;gt.damage(defender,10);assert.equal(defender.hp,41);
defender.runeBonus.xpBonus=0;for(const [diff,factor] of [[5,1],[6,.9],[10,.5],[14,.1],[15,0],[30,0]]){defender.level=1+diff;assert.ok(Math.abs(gt.xpGain(defender,100,1)-Math.max(1,100*factor))<1e-8)}defender.runeBonus.xpBonus=.2;defender.level=7;assert.equal(gt.xpGain(defender,100,1),108);defender.level=16;assert.equal(gt.xpGain(defender,100,1),1);
gt.setParty([0,0,0,0]);gt.get().heroes[0].level=7;gt.get().heroes[1].level=16;gt.xp(100,1);assert.equal(gt.get().heroes[0].xp,90);assert.equal(gt.get().heroes[1].xp,1);assert.equal(gt.get().heroes[2].xp,100);gt.setArea(4);assert.equal(gt.enemy('slime',300).level,4);


const control=harness(),cc=control.t;cc.start();cc.setParty([5,3,2,0]);cc.enter();const spear=cc.get().heroes[0];spear.weapon='5-ice';cc.stats(spear);const normal=cc.get().enemies[0];normal.hp=10000;cc.activate(spear,normal,'ice');assert.ok(normal.frozen<.4);const bossControl=cc.enemy('boss',normal.x+2);cc.get().enemies.push(bossControl);cc.activate(spear,bossControl,'ice');assert.ok(Math.abs(bossControl.frozen-cc.controlDuration(spear,.7)*.2)<1e-9);assert.ok(!(bossControl.slow>0));cc.activate(spear,bossControl,'slow');assert.equal(bossControl.slowAmount,.06);assert.equal(cc.slowFactor(bossControl),.94);cc.activate(spear,bossControl,'stun');assert.ok(Math.abs(bossControl.stun-cc.controlDuration(spear,.6)*.2)<1e-9);const mage=cc.get().heroes[1];mage.weapon='3-ice';mage.attributes.dex=0;cc.stats(mage);assert.ok(cc.controlDuration(mage,.7)>.6);
const bow=cc.get().heroes[2];bow.weapon='2-poison2';bow.attributes.int=2;cc.stats(bow);const volley=cc.attackToken(bow);cc.shoot(bow,normal,'arrow',1,volley);const arrows=cc.get().shots.filter(s=>s.attack===volley);assert.equal(arrows.length,2);arrows.forEach(s=>cc.basicHit(normal,1,s.attack));assert.equal(bow.mp,2,'Volley only charges once');assert.equal(cc.items['2-steel4'].arrows,4);
assert.equal(cc.WORLD.filter(n=>!n.kind).length,144);for(let i=0;i<126;i++){cc.setArea(i);cc.setStage(cc.stageCount()-1);cc.defeatBossAndAdvance();if(i<125)assert.ok(cc.unlockedNodes().has('a'+(i+1)))}cc.setArea(17);cc.save();assert.equal(harness(control.storage).t.get().area,17);const chart=control.elements.get('.map-chart');chart.scrollWidth=1800;chart.clientWidth=600;chart.scrollLeft=0;cc.setPan(1);cc.panMap(1);assert.equal(chart.scrollLeft,240);cc.panMap(20);assert.equal(chart.scrollLeft,1200);cc.setPan(-1);cc.panMap(20);assert.equal(chart.scrollLeft,0);


const freezeBefore=cc.controlDuration(mage,.7);mage.attributes.dex=100;mage.runes=['rune-haste','rune-haste'];cc.stats(mage);assert.ok(mage.cool<1);assert.equal(cc.controlDuration(mage,.7),freezeBefore,'Freeze uses base AGI, ignoring DEX and haste');
const shopLayout=harness(),sl=shopLayout.t;sl.start();for(let i=0;i<=25;i++){sl.setArea(i);sl.setStage(sl.stageCount()-1);sl.defeatBossAndAdvance()}sl.travel('town');const pages=sl.shopPages();assert.ok(pages.length>=2);for(const page of pages)assert.ok(page.items.every(w=>w.level===page.tier));const tierOne=pages.findIndex(p=>p.tier===1);sl.setShopPage(tierOne);sl.renderServices();for(const w of pages[tierOne].items)assert.ok(shopLayout.elements.get('#trader-stock').innerHTML.includes(w.name));sl.fitFullscreen();

const quiet=harness().t;quiet.start();const qh=quiet.get().heroes[0],qe=quiet.get().enemies[0];qe.hp=qe.maxHp=10000;quiet.activate(qh,qe,'fire');quiet.activate(qh,qe,'poison');const countNumbers=quiet.get().numbers.length,lpBefore=qe.hp;for(let i=0;i<100;i++)quiet.tickEffects(.01);assert.ok(qe.hp<lpBefore);assert.equal(quiet.get().numbers.length,countNumbers,'DoT damage creates no numbers');quiet.damage(qe,1);assert.equal(quiet.get().numbers.length,countNumbers+1);
quiet.setArea(0);quiet.setStage(1);quiet.enter();assert.ok(quiet.get().enemies.filter(e=>e.type==='swarmling').length>=6);assert.ok(pages[0].items.some(w=>w.id==='0-basic'));assert.ok(pages[0].items.some(w=>w.id==='0-iron'));assert.equal(pages[0].tier,1);
console.log('PASS: quiet DoTs, larger encounters, six-member swarms, displayed-tier shop grouping, base-AGI freeze invariant, tier pricing and grouped shop, speed-scaled CC, boss resistances, multiarrow proc guard, expanded map/save/panning, gem tiers/stats/permanent sockets/save migration, per-character low-level XP penalty, spider feet, roller inertia, flight physics, catapult rocks, six enemy archetypes, region rosters, hopper leap, limited shaman healing, automatic town recovery, live stacked-aura AT, shorter starter reach, slower bombs, revival costs/defeat recovery, brief dodgeable slashes, single bombs, short missiles, HP/price curves, slower XP, terrain collision, stepping, priest area damage, manual single-character stage exit, stopped cleared party, speed-sensitive dragging, enemy projectiles/dodging, telegraphs, bombs, homing turn limits, throw momentum, priest aura totals, permanent weapon sockets, 5–8 stages and bosses, hidden map nodes, gated shop stock,  map locks/branches, town healing, trader buy/sell, persistent HP, no level-up healing, 5% tactical potions, left-panel hover, and all combat/rune regressions.');

{const fresh=harness(),ft=fresh.t;ft.startTown();for(let c=0;c<8;c++){ft.setParty([c,c,c,c]);const h=ft.get().heroes[0];assert.equal(h.str,0);assert.equal(h.dex,0);assert.equal(h.int,0)}ft.setParty([4,0,0,0]);ft.select(0);assert.deepEqual(Array.from(ft.get().heroes[0].agi),[80,90]);assert.ok(Object.values(ft.items).filter(w=>w.classId===4).every(w=>w.agi[0]===80&&w.agi[1]===90));assert.equal(fresh.elements.get('[data-stat="lp"]').hidden,true);ft.get().heroes[0].sp=1;ft.select(0);assert.equal(fresh.elements.get('[data-stat="lp"]').hidden,false);fresh.elements.get('#world-button').onclick();assert.equal(ft.get().state,'service');const traveler=ft.get().heroes[0];traveler.x=552;traveler.y=100;ft.update(.01);assert.equal(ft.get().state,'service');traveler.y=226;ft.update(.01);assert.equal(ft.get().state,'map');console.log('Zero starting stats, slow Priest staves, HP button visibility, and town sign contact pass.');}
{
const run=harness(),r=run.t;r.start();assert.deepEqual(Array.from(r.classes,c=>c.name),['Warrior','Rogue','Ranger','Mage','Priest','Reaper','Bard','Summoner']);
r.setParty([5,0,1,6]);r.enter();const reaper=r.get().heroes[0];reaper.x=260;reaper.y=219;reaper.hp=20;reaper.attributes.dex=10;r.stats(reaper);
const foes=r.get().enemies;foes.forEach((e,i)=>{e.x=i<2?285:450;e.y=219;e.hp=100});reaper.strike={elapsed:0,left:.09,target:foes[0],amount:2,token:r.attackToken(reaper),range:reaper.range,face:1};for(let i=0;i<30;i++)r.resolveStrike(reaper,.01);
assert.equal(foes[0].hp,98);assert.equal(foes[1].hp,98);assert.equal(foes[2].hp,100);assert.equal(reaper.hp,30,'Reaper heals once per enemy per swing');
const rogue=r.get().heroes[2];rogue.x=275;rogue.y=219;rogue.strike={left:0,target:foes[0],amount:2,token:r.attackToken(rogue),range:14};r.resolveStrike(rogue,.01);assert.equal(foes[0].hp,96);assert.equal(foes[1].hp,98);
const bard=r.get().heroes[3];bard.x=250;bard.y=219;bard.attributes.str=10;bard.attributes.dex=10;r.stats(bard);reaper.x=275;foes[0].x=300;foes[1].x=325;r.shootNote(bard,foes[0],2,r.attackToken(bard));for(let i=0;i<50;i++)r.tickShots(.01);assert.equal(r.songTotal(reaper,'attack'),.1);assert.equal(r.aura(reaper).attack,1.1);assert.equal(foes[0].hp,91.5);assert.equal(foes[1].hp,93.5);reaper.songs={};assert.equal(r.aura(reaper).flat,0);
r.setParty([7,0,0,0]);r.enter();const summoner=r.get().heroes[0];summoner.weapon='7-poison';summoner.attributes.int=20;summoner.attributes.dex=10;r.stats(summoner);assert.ok(Math.abs(r.summonInterval(summoner)-3/1.4)<1e-8);for(let i=0;i<510;i++)r.tickMinions(.01);assert.equal(r.get().minions.length,2);assert.equal(r.get().minions[0].maxHp,r.items['7-poison'].summon.health*2);const pet=r.get().minions[0],progress=summoner.summonProgress;r.damage(pet,100);r.tickMinions(.01);assert.ok(!r.get().minions.includes(pet));assert.ok(summoner.summonProgress>progress);const survivor=r.get().minions[0];survivor.life=.005;r.tickMinions(.01);assert.ok(!r.get().minions.includes(survivor));summoner.weapon='7-heavy';summoner.gearRevision++;r.stats(summoner);r.tickMinions(.4);assert.equal(r.get().minions.length,0);for(let i=0;i<730;i++)r.tickMinions(.01);assert.ok(r.get().minions.length>0);assert.ok(r.get().minions.every(m=>m.kind==='golem'));summoner.hp=0;r.tickMinions(.01);assert.equal(r.get().minions.length,0);r.draw();
console.log('New roster, swept Reaper collisions/healing, single-target Rogue, Bard piercing/buffs, and Summoner groups/health/respawn/equipment cleanup pass.');
}
{
const check=harness(),c=check.t;c.start();c.setParty([5,3,0,0]);c.enter();const h=c.get().heroes[0],target=c.get().enemies[0];target.hp=10000;h.weapon='5-ice';c.stats(h);c.inspect(h.weapon);assert.match(check.elements.get('#item-effect').textContent,/Freeze 0.37s/);c.activate(h,target,'ice');assert.ok(target.frozen>0);assert.ok(!(target.slow>0));c.tickEffects(1);assert.equal(c.slowFactor(target),1);h.weapon='5-slow';c.stats(h);c.inspect(h.weapon);assert.match(check.elements.get('#item-effect').textContent,/Slow 20% for 2s/);c.activate(h,target,'slow');assert.equal(target.frozen,0);assert.equal(target.slow,2);assert.equal(c.slowFactor(target),.8);c.inspect('3-ice');assert.match(check.elements.get('#item-effect').textContent,/Freeze 0.7s/);assert.equal(Object.values(c.items).filter(w=>w.effect==='slow').length,42);console.log('Separate freeze/slow weapons and exact weapon duration readouts pass.');
}
{
const h=harness(),b=h.t;b.start();b.setParty([6,6,6,0]);b.enter();const [one,two,three,warrior]=b.get().heroes,foe=b.get().enemies[0];
for(const bard of [one,two,three]){bard.attributes.str=10;bard.attributes.dex=20;b.stats(bard);b.applySong(warrior,bard);b.applySong(foe,bard);}
assert.equal(b.aura(warrior).attack,1.3);assert.ok(Math.abs(b.songTotal(warrior,'haste')-.6)<1e-9);assert.deepEqual(Array.from(b.effectiveAgi(warrior)),[13,19]);assert.equal(b.enemyDamage(foe),1);foe.at=50;assert.equal(b.enemyDamage(foe),35);
b.applySong(warrior,one);assert.equal(b.aura(warrior).attack,1.3);foe.hp=100;b.basicHit(foe,5,b.attackToken(warrior));assert.equal(foe.hp,80);b.damage(foe,5,'fire',false);assert.equal(foe.hp,60);
b.setTime(1.5);assert.equal(b.aura(warrior).attack,1.3);assert.equal(b.enemyDamage(foe),35);
b.applySong(warrior,one);b.applySong(foe,one);
b.setTime(2.01);assert.equal(b.aura(warrior).attack,1.1);assert.equal(b.enemyDamage(foe),45);
b.setTime(3.51);assert.equal(b.aura(warrior).attack,1);assert.equal(b.enemyDamage(foe),50);assert.deepEqual(Array.from(b.effectiveAgi(warrior)),[20,30]);
for(const [id,pattern,count] of [['6-basic','line',1],['6-iron','long',1],['6-ice','cone',3],['6-heavy','pulse',1]]){b.get().shots.length=0;one.weapon=id;b.stats(one);b.shootNote(one,foe,5,b.attackToken(one));assert.equal(b.items[id].note,pattern);assert.equal(b.get().shots.length,count);assert.ok(b.get().shots[0].life*(pattern==='pulse'?110:160)>Math.min(one.range,Math.hypot(foe.x-one.x,foe.y-one.y)));assert.deepEqual(Array.from(one.agi),[55,65]);}
one.weapon='6-fire';one.attributes.int=12;b.stats(one);one.mp=0;b.get().shots.length=0;b.basicHit(foe,1,b.attackToken(one));assert.equal(one.mp,0);assert.equal(b.get().shots.length,0);assert.equal(one.nextNote.barrier,12);
b.activate(one,foe,'cleanse');b.shootNote(one,foe,1,b.attackToken(one));assert.equal(b.get().shots.at(-1).mod.cleanse,true);assert.equal(one.nextNote,null);
b.activate(one,foe,'crescendo');b.shootNote(one,foe,1,b.attackToken(one));assert.equal(b.get().shots.at(-1).mod.power,1.5);
b.get().shots.length=0;one.x=260;one.y=219;warrior.x=280;warrior.y=219;warrior.hp=20;foe.x=310;foe.y=219;one.weapon='6-heal';b.stats(one);b.activate(one,foe,'restore');b.shootNote(one,foe,1,b.attackToken(one));for(let i=0;i<40;i++)b.tickShots(.01);assert.equal(warrior.hp,32,'Harp heals ally once across all three notes');assert.equal(b.songTotal(warrior,'attack'),.1);
b.setTime(10);warrior.barriers={};warrior.hp=warrior.maxHp;
b.applyNoteSupport(warrior,one,{barrier:12});b.applyNoteSupport(warrior,one,{barrier:12});b.applyNoteSupport(warrior,two,{barrier:12});
const beforeBarrier=warrior.hp;b.damage(warrior,20);assert.equal(warrior.hp,beforeBarrier-1,'Stacked barriers still allow the minimum one damage');
b.damage(warrior,10);assert.equal(warrior.hp,beforeBarrier-7,'Only damage beyond the remaining barrier reaches HP');
b.applyNoteSupport(warrior,one,{barrier:12});b.setTime(12.01);b.damage(warrior,5);assert.equal(warrior.hp,beforeBarrier-12,'Barriers expire after two seconds');
warrior.burn={time:4};warrior.poison={time:4};warrior.frozen=1;warrior.slow=2;warrior.slowAmount=.3;warrior.stun=1;
b.applyNoteSupport(warrior,one,{cleanse:true});assert.equal(warrior.burn,null);assert.equal(warrior.poison,null);assert.equal(warrior.frozen,0);assert.equal(warrior.slow,0);assert.equal(warrior.slowAmount,0);assert.equal(warrior.stun,1);
b.activate(one,foe,'guard');b.shootNote(one,foe,1,b.attackToken(one));assert.equal(b.get().shots.at(-1).mod.barrier,12);
b.applySong(warrior,one,{power:1.5});assert.ok(Math.abs(b.songTotal(warrior,'attack')-.15)<1e-9);
assert.ok(Object.values(b.items).filter(w=>w.classId===6&&w.effect).every(w=>['guard','cleanse','crescendo','restore'].includes(w.effect)));
b.draw();console.log('Bard stacks, expiry, haste, flat enemy modifiers, four instrument patterns, range extension, healing, barrier absorption/refresh/expiry, cleansing and Crescendo pass.');
}
{
const r=harness().t;r.start();for(let region=0;region<6;region++)for(let other=region+1;other<6;other++)assert.ok(r.REGIONAL_POOLS[region].every(id=>!r.REGIONAL_POOLS[other].includes(id)),'Regions have exclusive species');
assert.equal(new Set(r.REGION_BOSSES.map(b=>b[0])).size,18);
for(let area=0;area<126;area++){r.setArea(area);r.setStage(1);r.enter();for(let i=0;i<120;i++)r.update(.01);for(const e of r.get().enemies){assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp));r.drawEnemy(e)}}
r.setParty([1,1,0,4]);r.setArea(0);r.enter();const rogue=r.get().heroes[0];r.attackMotion(rogue);assert.equal(rogue.attackHand,0);assert.equal(rogue.daggerArms[0].velocity,38);assert.equal(rogue.daggerArms[1].velocity,0);r.tickRogueArms(rogue,.02);const poses=r.rogueHands(rogue,[0,-18],1,0);assert.notDeepEqual(poses[0].hand,poses[1].hand);r.attackMotion(rogue);assert.equal(rogue.attackHand,1);assert.equal(rogue.daggerArms[1].velocity,38);r.draw();console.log('Exclusive regional species, 18 named guardians, regional movement/rendering, and independently animated alternating Rogue hands pass.');
}
{
const r=harness().t;r.start();const h=r.get().heroes[0];const originalXP=h.xp,gold=r.get().gold;assert.ok(r.get().enemies.some(e=>e.hp>0));h.x=554;h.y=226;r.update(.001);assert.equal(r.get().stage,1);assert.equal(h.xp,originalXP);assert.equal(r.get().gold,gold);assert.equal(r.get().loot.length,0);assert.equal(h.x,32);
r.setStage(r.stageCount()-1);r.enter();assert.equal(r.stageExitOpen(),false);r.completeArea();assert.equal(r.get().state,'fight');h.x=554;h.y=226;r.update(.001);assert.equal(r.get().state,'fight');assert.ok(!r.get().completed.includes('a0'));r.get().enemies.find(e=>e.type==='boss').hp=0;assert.ok(r.get().enemies.some(e=>e.hp>0));assert.equal(r.stageExitOpen(),false);r.tickBossExit(1.99);assert.equal(r.stageExitOpen(),false);r.tickBossExit(.01);assert.equal(r.stageExitOpen(),true);h.x=554;h.y=226;r.update(.001);assert.equal(r.get().state,'map');assert.ok(r.get().completed.includes('a0'));console.log('Regular stages can be skipped without rewards; live bosses block progression; surviving regular mobs do not block a defeated boss exit.');
}
{
const check=harness(),c=check.t;c.start();c.setStage(7);const foe=c.enemy('slime',300),table=Array.from(c.weaponDropTable(foe));assert.ok(table.length>=1&&table.length<=2);c.setParty([7,7,7,7]);assert.deepEqual(Array.from(c.weaponDropTable(foe)),table);const covered=new Set();for(const items of Object.values(c.WEAPON_DROPS)){assert.ok(items.length<=2);items.forEach(id=>{assert.equal(c.items[id].type,'weapon');covered.add(id)})}assert.ok(Object.values(c.items).filter(w=>w.type==='weapon'&&!w.retired&&!w.id.endsWith('-basic')).every(w=>covered.has(w.id)));
assert.equal(c.items['rune-leech'].type,'soul');assert.equal(c.items['rune-leech'].bonuses.lifesteal,.02);assert.equal(c.items['rune-wisdom'].bonuses.xpBonus,.1);assert.equal(c.items['soul-fortune-1'].bonuses.dropBonus,.05);
c.setItem(0,'soul-fortune-1');assert.ok(c.moveItem({type:'bag',index:0},{type:'rune0',index:0}));assert.equal(c.dropMultiplier(),1);c.save();assert.ok(c.load());assert.equal(c.get().heroes[0].runes[0],'soul-fortune-1');assert.equal(c.dropMultiplier(),1);c.inspect('soul-fortune-1');assert.match(check.elements.get('#item-details').textContent,/Soul/);assert.equal(c.moveItem({type:'rune0',index:0},{type:'bag',index:1}),false);
c.get().heroes[0].hp=0;assert.equal(c.dropMultiplier(),1);check.math.random=()=>0;const boss=c.enemy('guardian0',300);const both=c.rollDrops(boss);assert.deepEqual(Array.from(both,id=>c.items[id].type),['weapon','rune','soul']);c.setArea(105);const late=c.rollDrops(c.enemy('boss',300));assert.equal(c.items[late.find(id=>c.items[id].type==='soul')].tier,6);
console.log('Fixed monster tables, all weapon coverage, independent boss rolls, Souls, save/socket support, and equipment drop bonuses pass.');
}
{
const run=harness(),r=run.t;r.start();run.math.random=()=>.15;r.damage(r.enemy('swarmling',300),99999);assert.equal(r.get().potions.length,0);run.math.random=()=>.14999;r.damage(r.enemy('glowleech',300),99999);assert.equal(r.get().potions.length,1);run.math.random=()=>.29;r.damage(r.enemy('slime',300),99999);assert.equal(r.get().potions.length,2);
r.get().potions.length=0;r.get().heroes.forEach(h=>{h.x=300;h.y=219;h.hp=h.maxHp});r.setPotion({x:300,y:219});r.pickPotions();assert.equal(r.get().potions.length,1,'Full-health party leaves potion untouched');const wounded=r.get().heroes[2];wounded.hp=1;r.pickPotions();assert.equal(r.get().potions.length,0);assert.equal(wounded.hp,1+Math.ceil(wounded.maxHp*.2),'Wounded hero can collect beside full-health allies');console.log('Swarm potion rate and full-health pickup exclusion pass.');
}
{
const test=harness(),t=test.t;t.start();const h=t.get().heroes[0];t.get().loot.length=0;t.setLoot({x:300,y:219,item:'0-iron'});h.x=300;h.y=170;t.pickLoot();assert.equal(t.get().loot.length,1);h.y=219;t.setHeld(h);t.pickLoot();assert.equal(t.get().loot.length,0);assert.equal(t.get().inventory[0],'0-iron');h.hp=1;t.setPotion({x:300,y:219});t.pickPotions();assert.equal(t.get().potions.length,0);assert.equal(h.hp,1+Math.ceil(h.maxHp*.2));for(let i=0;i<15;i++)t.setItem(i,'0-basic');t.setLoot({x:300,y:219,item:'0-fire'});const gold=t.get().gold;t.pickLoot();assert.equal(t.get().loot.length,1);assert.equal(t.get().gold,gold);t.setHeld(null);
const stage=t.get().stage;t.raw_completeArea();assert.equal(t.get().stage,stage);t.tickSceneFade(.49);assert.equal(t.get().stage,stage);t.tickSceneFade(.01);assert.equal(t.get().stage,stage+1);assert.equal(test.elements.get('#scene-fade').style.opacity,'1');assert.ok(t.get().sceneFade);const before=t.get().time;t.rawUpdate(.1);assert.ok(t.get().time>before);t.tickSceneFade(.5);assert.equal(t.get().sceneFade,null);assert.equal(test.elements.get('#scene-fade').hidden,true);
t.raw_travel('town');t.tickSceneFade(.49);assert.notEqual(t.get().currentNode,'town');t.tickSceneFade(.01);assert.equal(t.get().currentNode,'town');t.tickSceneFade(.5);assert.equal(t.get().sceneFade,null);
console.log('Physical ground pickups while held, full-bag preservation, and one-second midpoint scene transitions pass.');
}
{
const test=harness(),r=test.t;r.start();const h=r.get().heroes[0];r.setAutoMove(0,false);assert.equal(r.canAutoMove(h),false);for(let i=0;i<50;i++)r.rawUpdate(.01);assert.equal(h.x,32);assert.ok(r.get().heroes[1].x>52);r.setAutoMove(null,false);assert.ok(r.get().heroes.every(h=>!r.canAutoMove(h)));r.setAutoMove(null,true);assert.equal(r.canAutoMove(h),false);assert.equal(r.canAutoMove(r.get().heroes[1]),true);r.save();assert.ok(r.load());assert.equal(r.canAutoMove(r.get().heroes[0]),false);r.openSettings();const t=r.get().time;r.rawUpdate(.1);assert.equal(r.get().time,t);r.closeSettings();r.rawUpdate(.01);assert.ok(r.get().time>t);
r.get().numbers.length=0;r.float(100,100,12);const n=r.get().numbers[0];assert.ok(Math.abs(n.vx)>=9&&Math.abs(n.vx)<=16);r.tickNumbers(.01);assert.ok(n.y<100&&n.x!==100);assert.ok(n.x!==Math.round(n.x));for(let i=0;i<90;i++)r.tickNumbers(.01);assert.ok(n.vy>0);r.tickNumbers(.2);assert.equal(r.get().numbers.length,0);r.draw();console.log('Saved per-character/master auto movement, settings pause, and smooth ballistic damage numbers pass.');
}
const saves=harness(),sv=saves.t;sv.startTown();sv.setGold(777);sv.save();sv.openMainMenu();assert.equal(sv.get().menuOpen,true);const frozenTime=sv.get().time;sv.rawUpdate(1);assert.equal(sv.get().time,frozenTime);sv.chooseSaveSlot(2);sv.startTown();sv.setGold(222);sv.save();assert.equal(sv.readSlot(1).gold,777);assert.equal(sv.readSlot(2).gold,222);sv.openMainMenu();sv.chooseSaveSlot(1);assert.equal(sv.get().gold,777);sv.openMainMenu();sv.chooseSaveSlot(3);sv.openMainMenu();assert.equal(sv.readSlot(3),null);assert.equal(sv.readSlot(1).gold,777);
assert.equal(sv.buyPrice(sv.items['gem-ruby-1']),500);assert.equal(sv.buyPrice(sv.items['gem-ruby-3']),1500);assert.equal(sv.buyPrice(sv.items['rune-ward']),1000);
assert.equal(new Set(Object.values(sv.items).filter(i=>i.type==='rune').map(sv.itemSymbol)).size,7);
const mh=sv.get().heroes[0];mh.weapon='0-fire';mh.mp=5;assert.equal(sv.manaPercent(mh),50);
console.log('Independent save slots, menu pause, socket prices, distinct rune icons and mana bars pass.');
const tuning=harness(),tu=tuning.t;tu.start();assert.equal(tu.needed(10),1824);assert.equal(tu.needed(20),4796);
const hurt=tu.get().heroes[0];tu.damage(hurt,5);assert.equal(tu.get().numbers.at(-1).color,'#ff4545');tu.damage(tu.get().enemies[0],1);assert.equal(tu.get().numbers.at(-1).color,'#fff');
for(let a=0;a<126;a++){tu.setArea(a);for(let i=0;i<1000;i++)for(const id of tu.rollDrops(tu.enemy('boss',300))){const w=tu.items[id];if(w.type!=='weapon')assert.ok(w.tier===tu.regionTier(),'Socket drop exceeds region tier in area '+a)}}
tu.setArea(0);const heldBase={...hurt,x:100,y:100,vx:0,vy:0,dragTarget:{x:400,y:100},swing:0,lean:0};const medium={...heldBase,cursorSpeed:800},fast={...heldBase,cursorSpeed:2400};tu.stepHeld(medium,1/120);tu.stepHeld(fast,1/120);assert.ok(fast.vx>medium.vx*2);
console.log('Steeper XP curve, fast drag response, red incoming damage and regional socket-drop caps pass.');
const icons=harness().t;for(const w of Object.values(icons.items))icons.drawItemIcon(context,w);
console.log('Timed individual summons, INT casting speed, death-independent cycle, expiry, weapon cleanup and shared item drawing pass.');
{const test=harness(),r=test.t;r.start();r.setParty([3,0,0,0]);const mage=r.get().heroes[0],target=r.get().enemies[0];r.get().enemies.forEach(e=>e.hp=0);target.hp=10000;target.x=80;target.y=226;mage.x=60;mage.y=226;mage.weapon='3-fire';r.stats(mage);const base=mage.atMin;mage.attributes.int=10;mage.mp=8;r.stats(mage);assert.equal(mage.atMin,base+10);assert.equal(mage.mp,0);assert.equal(r.manaPercent(mage),0);for(let i=0;i<2;i++){r.shoot(mage,target,'magic',30,r.attackToken(mage));r.tickShots(.12)}assert.equal(r.get().fields.length,2,'Each mage spell activates its weapon effect');assert.equal(r.get().fields[0].min,4);assert.equal(r.get().fields[0].max,6);assert.equal(r.get().fields[0].chance,.05);assert.equal(mage.mp,0);mage.weapon='3-ice';r.stats(mage);const before=target.hp;r.shoot(mage,target,'magic',30,r.attackToken(mage));r.tickShots(.12);assert.ok(before-target.hp>=33&&before-target.hp<=35);assert.ok(target.frozen>0);r.inspect('3-ice');assert.ok(!test.elements.get('#item-details').textContent.includes('MP'));r.select(0);assert.equal(test.elements.get('.mp-bar').hidden,true);console.log('Mage casts every attack, INT AT scaling, zero MP and effect damage pass.');}
{const opening=harness().t;opening.start();opening.setParty([7,0,0,0]);const h=opening.get().heroes[0];h.weapon='7-heavy';opening.stats(h);opening.enter();for(let i=0;i<99;i++)opening.tickMinions(.01);assert.equal(opening.get().minions.length,0);opening.tickMinions(.02);assert.equal(opening.get().minions.length,1);assert.equal(h.firstSummon,false);for(let i=0;i<900;i++)opening.tickMinions(.01);assert.equal(opening.get().minions.length,1);for(let i=0;i<101;i++)opening.tickMinions(.01);assert.equal(opening.get().minions.length,2);h.gearRevision++;opening.tickMinions(.01);assert.equal(h.firstSummon,false);assert.equal(opening.get().minions.length,0);opening.enter();for(let i=0;i<101;i++)opening.tickMinions(.01);assert.equal(opening.get().minions.length,1);console.log('One-second opening cast, normal later casts and reset only on scene entry pass.');}
{const summonMotionTest=harness().t;summonMotionTest.start();summonMotionTest.setParty([7,0,0,0]);summonMotionTest.enter();assert.equal(summonMotionTest.summonInterval(summonMotionTest.get().heroes[0]),5);for(let i=0;i<510;i++)summonMotionTest.tickMinions(.01);const fighter=summonMotionTest.get().minions[0],enemyTarget=summonMotionTest.get().enemies[0];summonMotionTest.get().enemies.forEach(e=>e.hp=0);enemyTarget.hp=enemyTarget.maxHp=1000;enemyTarget.x=fighter.x+10;enemyTarget.y=fighter.y;fighter.cooldown=0;summonMotionTest.tickMinions(.01);assert.ok(fighter.attack);assert.equal(enemyTarget.hp,1000,'Wind-up does not deal immediate damage');summonMotionTest.draw();summonMotionTest.tickMinions(.13);assert.ok(enemyTarget.hp<1000,'Melee contact deals damage');const afterHit=enemyTarget.hp;summonMotionTest.tickMinions(.05);assert.equal(enemyTarget.hp,afterHit,'Recovery does not hit twice');summonMotionTest.tickMinions(.3);fighter.cooldown=0;summonMotionTest.tickMinions(.01);assert.ok(fighter.attack);enemyTarget.x+=100;summonMotionTest.tickMinions(.13);assert.equal(enemyTarget.hp,afterHit,'An enemy leaving reach during wind-up avoids the hit');summonMotionTest.draw();console.log('Summon attack wind-up, contact timing, single-hit recovery and dodging pass.');
}
{const progress=harness().t;progress.startTown();for(let a=0;a<126;a++){const areaWeapons=Object.keys(progress.WEAPON_AREAS).filter(id=>progress.WEAPON_AREAS[id]===a);assert.equal(new Set(areaWeapons.map(id=>progress.items[id].classId)).size,areaWeapons.length,'At most one weapon per category per area');progress.setArea(a);for(const id of areaWeapons)assert.ok(Object.entries(progress.WEAPON_DROPS).some(([key,ids])=>key.startsWith(a+':')&&ids.includes(id)),'Every unlock actually drops in its area')}
progress.get().completed.push('a0','a1','a2');for(let c=0;c<8;c++){progress.setShopClass(c);const stock=progress.shopStock();assert.ok(stock.length<=4);assert.ok(stock.every(w=>w.id.endsWith('-basic')||progress.get().completed.includes('a'+progress.WEAPON_AREAS[w.id])))}console.log('Area-specific drops and completed-area shop unlocks pass.');}
{const scenes=harness().t;scenes.start();for(let a=0;a<126;a++){scenes.setArea(a);for(let stage=0;stage<scenes.stageCount();stage++){scenes.setStage(stage);scenes.enter();const types=new Set(scenes.get().enemies.map(e=>e.species));assert.ok(types.size<=3,'Initial roster exceeds three types');for(const spawner of scenes.get().enemies.filter(e=>e.type==='summoner'))for(let remaining=1;remaining<=3;remaining++){spawner.remaining=remaining;types.add(scenes.enemySummonType(spawner))}assert.ok(types.size<=3,'Summoning exceeds three types');if(stage===scenes.stageCount()-1)assert.ok(types.has('guardian'+a))}}console.log('All scenes, bosses and enemy reinforcements stay within three enemy types.');}
{const kit=harness(),r=kit.t;r.start();r.setParty([1,0,0,0]);const h=r.get().heroes[0];assert.equal(h.maxHp,90);
for(const dex of [0,10,50,100,198]){h.attributes.dex=dex;r.stats(h);assert.ok(Math.abs(h.evasion-(.2+.5*dex/(dex+50)))<1e-9);}
h.attributes.dex=0;r.stats(h);h.hp=100;r.damage(h,10,'physical',true,true);assert.equal(h.hp,92);r.damage(h,10,'fire',true,false);assert.equal(h.hp,84,'Boss specials also reduced');
h.poison={time:1/30,tick:1/30,amount:10};r.tickEffects(1/30);assert.equal(h.hp,74,'Poison bypasses evasion');
h.runeBonus.resistance=.25;r.damage(h,100,'fire');assert.equal(h.hp,14,'Evasion multiplies with resistance');
h.level=2;h.attributes={str:1,dex:1,int:1,lp:1};r.stats(h);assert.equal(h.maxHp,115,'Rogue level and attribute HP');
h.attributes.int=25;r.stats(h);assert.equal(h.crit,.0025);h.attributes.str=100;r.stats(h);assert.equal(h.crit,.25);
for(const a of Object.keys(r.SWARM_BOSSES)){r.setArea(+a);r.setStage(r.stageCount()-1);r.enter();const pack=r.get().enemies.filter(e=>e.type==='boss');assert.equal(pack.length,5);assert.ok(pack.every(e=>e.swarmBoss&&e.maxHp===Math.round(r.areaHealth(+a)*2.4)));pack.slice(0,4).forEach(e=>e.hp=0);r.tickBossExit(3);assert.equal(r.stageExitOpen(),false);pack[4].hp=0;r.tickBossExit(2);assert.equal(r.stageExitOpen(),true);r.draw()}console.log('Rogue evasion, lower HP, elemental resistance, DoT bypass and pack-boss progression pass.');}
{const menu=harness(),r=menu.t;r.startTown();r.setGold(123);r.save();r.openMainMenu();r.beginPartySetup();assert.equal(menu.elements.get('#start').disabled,true);for(const id of [7,1,3,5])r.pickClass(id);assert.equal(menu.elements.get('#start').disabled,false);assert.deepEqual(menu.choices.map(c=>+c.value),[7,1,3,5]);assert.ok(menu.elements.get('#class-options').innerHTML.includes('Summoner'));r.openMainMenu();assert.equal(r.readSlot(1).gold,123,'Cancelled setup preserves the existing save');console.log('All-visible class selection, explicit four choices and cancelled setup preservation pass.');}
{
const test=harness(),t=test.t;t.start();t.setParty([7,0,0,0]);t.enter();
const h=t.get().heroes[0],baseHP=h.maxHp,baseRange=h.range,baseInterval=t.summonInterval(h);
function socket(a,b){h.runes=[a,b];h.gearRevision++;t.stats(h);t.get().minions.length=0;h.firstSummon=true;t.tickMinions(1);return t.get().minions.find(m=>m.owner===h)}
let m=socket('gem-topaz-1','rune-vitality');
assert.equal(h.maxHp,baseHP);assert.equal(m.hp,m.maxHp);assert.equal(m.maxHp,Math.round((t.items[h.weapon].summon.health+50)*1.2));
m=socket('rune-ward','gem-diamond-1');let hp=m.hp;t.damage(m,20,'fire');assert.equal(m.hp,hp-18);assert.equal(h.defense,0);assert.equal(h.runeBonus.resistance,0);
m=socket('rune-reach','rune-haste');assert.equal(h.range,baseRange);assert.equal(t.summonInterval(h),baseInterval);assert.equal(m.range,30);assert.equal(m.runeBonus.haste,.15);
m=socket('rune-leech','rune-renewal');m.hp=5;const foe=t.get().enemies[0];foe.hp=100;t.damage(foe,10,'physical',true,false,m);assert.equal(m.hp,5.2);const ownerHP=h.hp;t.tickMinions(.1);assert.ok(m.hp>=5.3-1e-8);assert.equal(h.hp,ownerHP);
m=socket('rune-wisdom','soul-fortune-1');assert.equal(t.dropMultiplier(),1);assert.equal(t.dropMultiplier(m),1.05);assert.equal(t.xpGain(h,100,1,m),110.00000000000001);assert.equal(t.xpGain(h,100,1),100);assert.equal(t.xpGain(t.get().heroes[1],100,1,m),100);
m=socket('gem-emerald-1','gem-ruby-1');assert.equal(h.str,0);assert.equal(h.dex,0);assert.equal(m.maxHp,Math.round(t.items[h.weapon].summon.health*1.5));assert.equal(h.summonGems.str,5);
assert.ok(!fs.readFileSync(__dirname+'/index.html','utf8').includes('map-close'));
console.log('Socket replacement consumes the old item; summoner socket health, defense, resistance, reach, haste, regeneration, lifesteal and kill rewards apply to summons.');
}
{
 const check=harness(),t=check.t;t.start();
 assert.deepEqual(Array.from(t.ZONES,z=>z.name),['Lowlands','Desert','Coast','Mountains','Volcano','Kingdom']);
 assert.equal(t.AREAS.filter(a=>!a.major&&!a.optional).length,120);assert.equal(t.AREAS.filter(a=>a.major&&!a.optional).length,6);
 assert.deepEqual(Array.from(t.ZONES[5].regions),['Farmland','Sewers','City','Barracks']);
 for(const a of t.AREAS){
  t.setArea(a.area);t.setStage(0);t.enter();
  assert.equal(t.regionTier(),a.zone+1);
  if(a.major){assert.equal(t.stageCount(),1);assert.equal(t.get().enemies.length,1);const boss=t.get().enemies[0];if(!a.optional)assert.equal(boss.name,t.ZONES[a.zone].boss);assert.equal(boss.maxHp,Math.round(t.areaHealth(a.area)*30));assert.equal(t.stageExitOpen(),false)}
  else assert.ok(t.stageCount()>=5&&t.stageCount()<=8);
  for(let i=0;i<80;i++){const loot=t.rollDrops(t.get().enemies[0]);for(const id of loot)assert.equal(t.items[id].tier,a.zone+1,'Every dropped item belongs to its zone')}
 }
 for(let c=0;c<8;c++){
  const weapons=Object.entries(t.WEAPON_AREAS).filter(([id])=>t.items[id].classId===c).sort((a,b)=>a[1]-b[1]);
  assert.equal(new Set(weapons.map(([id])=>t.items[id].tier)).size,6);
  for(let i=1;i<weapons.length;i++)assert.ok(weapons[i][1]-weapons[i-1][1]>=1,'No area unlocks two weapons of one class');
 }
 for(const [id,a] of Object.entries(t.WEAPON_AREAS)){
  t.setArea(a);const monster=Object.entries(t.WEAPON_DROPS).find(([key,ids])=>key.startsWith(a+':')&&ids.includes(id))[0].split(':')[1],foe=t.enemy(monster,300);
  t.setStage(0);assert.ok(t.weaponDropTable(foe).includes(id),'No hidden stage lock on a species drop');
  t.setStage(t.WEAPON_STAGES[id]);assert.ok(t.weaponDropTable(foe).includes(id));
 }
 for(let tier=1;tier<=6;tier++)for(const kind of ['weapon','rune','gem','soul'])assert.ok(Object.values(t.items).some(w=>w.type===kind&&w.tier===tier));
 t.get().completed.length=0;t.get().completed.push(...Array.from({length:20},(_,i)=>'a'+i));assert.ok(t.unlockedNodes().has('a20'));assert.ok(!t.unlockedNodes().has('a21'));
 t.setArea(20);t.setStage(0);t.enter();t.damage(t.get().enemies[0],1e8);t.tickBossExit(1.99);assert.equal(t.stageExitOpen(),false);t.tickBossExit(.01);t.completeArea();assert.ok(t.unlockedNodes().has('a21'));assert.ok(t.unlockedNodes().has('town1'));
 t.travel('town1');const h=t.get().heroes[0];h.hp=1;t.setGold(99999);assert.ok(t.healTown());assert.equal(h.hp,h.maxHp);
 t.get().completed.push('a21','a22','a23','a24','a25');t.travel('trader1');assert.ok(t.shopStock().some(w=>w.tier===2));assert.ok(t.shopStock().every(w=>w.tier<=2));
 t.setArea(125);t.setStage(0);t.enter();const lich=t.get().enemies[0];assert.equal(lich.name,'Lich King');
 h.x=100;h.y=226;h.hp=10000;lich.patternIndex=1;lich.specialCooldown=0;t.tickSpecial(lich,h,.01);t.tickSpecial(lich,h,1);assert.equal(t.get().rituals.length,4);const before=h.hp;t.tickHazards(.5);assert.equal(h.hp,before);h.x=500;t.tickHazards(.8);assert.equal(h.hp,before,'Moving away dodges curse');
 lich.patternIndex=0;lich.specialCooldown=0;t.tickSpecial(lich,h,.01);t.tickSpecial(lich,h,1);assert.equal(t.get().hazards.length,3);
 t.damage(lich,1e8);t.tickBossExit(2);t.completeArea();assert.ok(t.get().completed.includes('a125'));assert.match(check.elements.get('#status').textContent,/lich king is defeated/);assert.equal(t.get().heroes[0],h,'Final boss does not reset the party');
 const legacy={area:17,currentNode:'a17',completed:Array.from({length:17},(_,i)=>'a'+i),gold:234,heroes:[0,1,2,3].map(classId=>({classId,level:10,xp:0,hp:25,weapon:classId+'-basic',attributes:{},runes:[]})),version:6};
 const migrated=harness({'bramblebound-v3':JSON.stringify(legacy)});assert.equal(migrated.t.get().area,75);assert.equal(migrated.t.get().gold,234);assert.ok(migrated.t.unlockedNodes().has('a75'));migrated.t.save();assert.equal(harness(migrated.storage).t.get().area,75,'World migration runs only once');
 console.log('Six zones, 120 areas, six lone major bosses, 5–8 stages, spaced weapon sources, exact zone tiers, service branches, lich spells and legacy migration pass.');
}
{
 const t=harness().t;
 for(let z=0;z<6;z++)for(let r=0;r<4;r++)assert.equal(t.AREAS.filter(a=>!a.major&&!a.optional&&a.zone===z&&a.region===z*4+r).length,5);
 const party=[0,1,2,3].map(classId=>({classId,level:10,xp:50,hp:25,weapon:classId+'-basic',attributes:{str:2},runes:['gem-ruby-1',null]}));
 const oldSave={version:7,worldVersion:2,area:13,currentNode:'a13',stage:10,completed:Array.from({length:13},(_,i)=>'a'+i),gold:432,inventory:['0-fire'],heroes:party};
 const run=harness({'bramblebound-v3':JSON.stringify(oldSave)});assert.equal(run.t.get().area,21);assert.equal(run.t.get().currentNode,'a21');assert.ok(run.t.get().stage<run.t.stageCount());assert.equal(run.t.get().gold,432);assert.equal(run.t.get().inventory[0],'0-fire');assert.equal(run.t.get().heroes[0].runes[0],'gem-ruby-1');assert.ok(run.t.unlockedNodes().has('a21'));assert.ok(run.t.get().completed.includes('a20'));
 run.t.save();const saved=JSON.parse(run.storage['bramblebound-v3']);assert.equal(saved.worldVersion,3);assert.equal(harness(run.storage).t.get().area,21);
 assert.match(fs.readFileSync(__dirname+'/style.css','utf8'),/width:360%/);
 console.log('Five areas per region, stage cap, compact map width and schema-2 save migration pass.');
}
{
 const check=harness(),t=check.t;t.start();
 const regions=['Caverns','Tombs','Caves','Depths','Sewers'];
 for(const name of regions){
  const node=t.AREAS.find(a=>!a.major&&t.ZONES[a.zone].regions[a.region%4]===name);t.setArea(node.area);t.enter();assert.ok(t.hasRoof());
  const h=t.get().heroes[0];h.x=120;h.y=65;h.vy=-1500;h.vx=0;t.stepBody(h,.1);assert.ok(h.y>=t.roofLimit(h.x));assert.equal(h.vy,0);
  h.dragTarget={x:230,y:-50};h.cursorSpeed=3000;for(let i=0;i<180;i++)t.stepHeld(h,1/120);assert.ok(h.y>=t.roofLimit(h.x));assert.equal(h.vy,0);
  const foe=t.enemy('hopper',100);foe.y=50;foe.vy=-500;t.moveEnemy(foe,30,.1);assert.ok(foe.y>=t.roofLimit(foe.x));
  const hit=t.terrainHit(100,80,100,-20);assert.ok(hit);assert.equal(hit.y,t.ceiling(100));
  t.setParty([7,0,0,0]);t.enter();t.tickMinions(1);const pet=t.get().minions[0];pet.y=40;pet.vy=-300;t.moveEnemy(pet,0,.1);assert.ok(pet.y>=t.roofLimit(pet.x));
  const arrow=t.launchHazard(t.enemy('archer',300),t.get().heroes[0],'arrow');arrow.x=300;arrow.y=50;arrow.vy=-500;arrow.vx=0;t.tickHazards(.1);assert.ok(!t.get().hazards.includes(arrow));
 }
 t.setArea(0);t.enter();assert.equal(t.hasRoof(),false);assert.equal(t.terrainHit(100,70,100,0),null);
 t.openMap();const html=check.elements.get('#map-nodes').innerHTML;assert.ok(html.includes('<em>Grassland 1</em>'));assert.ok(!html.includes('<small>1</small>'));assert.ok(!check.elements.get('#map-art').innerHTML.includes('>Grassland</text>'));
 console.log('Visible underground ceilings block thrown/dragged heroes, enemies, summons and projectiles; outdoor ceilings stay open.');
}

{
 const {t:a}=harness();a.start();const h=a.get().heroes[0];h.hp=h.maxHp=1000;h.x=310;h.y=219;
 const caster=a.enemy('sporecap',262);caster.y=219;a.fireEnemyAttack(caster,h,caster.attackProfile);
 assert.equal(a.get().hazards[0].kind,'cloud');a.tickHazards(.1);assert.ok(h.hp<1000);assert.ok(h.poison);
 const once=h.hp;a.tickHazards(.1);assert.equal(h.hp,once,'Cloud cannot hit every frame');
 a.applyNoteSupport(h,a.get().heroes[1],{cleanse:true});assert.equal(h.poison,null);
 a.get().hazards.length=0;const cannon=a.enemy('shellcannon',200);a.fireEnemyAttack(cannon,h,cannon.attackProfile);assert.equal(a.get().hazards.length,1);assert.equal(a.get().hazards[0].aoe,0);assert.ok(a.get().hazards[0].vy<0);
 a.get().hazards.length=0;const lobber=a.enemy('rubblelobber',200);a.fireEnemyAttack(lobber,h,lobber.attackProfile);assert.equal(a.get().hazards.length,4);assert.equal(new Set(a.get().hazards.map(p=>p.vx)).size,4);
 a.get().hazards.length=0;const eye=a.enemy('ceilingeye',220);a.fireEnemyAttack(eye,h,eye.attackProfile);assert.equal(a.get().hazards[0].life,1.6);assert.equal(a.get().hazards[0].tracking,.6);
 a.get().hazards.length=0;const boss=a.enemy('boss',200);boss.patterns=['ERUPTION'];boss.warning={pattern:'ERUPTION',left:0,x:h.x,y:h.y};a.tickSpecial(boss,h,.01);assert.equal(a.get().hazards.length,10);assert.ok(a.get().hazards.every(p=>p.aoe===12&&!p.dodgeable));
 a.get().hazards.length=0;const scorpion=a.enemy('sandscorpion',280);scorpion.y=h.y;a.fireEnemyAttack(scorpion,h,scorpion.attackProfile);const hp=h.hp;h.y-=40;a.tickSlash(scorpion,.5);assert.equal(h.hp,hp,'Dragging above a sting avoids it');
 for(const shape of ['mushroom','plant','mantis','scorpion','crab','maw','ram','knight','cactus','crystal','eye','jelly','bird','snail','golem','obelisk','urn','construct','bell','puppet']){const profile=a.enemyAttackProfile(shape);assert.ok(profile);a.fireEnemyAttack(caster,h,profile);a.tickHazards(.01);a.draw();}
 console.log('Enemy attack profiles: cloud tick limits/cleanse, distinct arcing volleys, short homing, ten-shot boss eruption and dodgeable melee height pass.');
}

{
 const {t:r}=harness();r.start();
 for(const [level,kills] of [[1,19.204],[10,30.4],[25,50.5],[50,88],[75,130.5],[99,176.004]])assert.ok(Math.abs(r.needed(level)/(10+5*level)-kills)<.04);
 const normal=r.enemy('slime',300),swarm=r.enemy('swarmling',300),heavy=r.enemy('beetle',300),rock=r.enemy('catapult',300),boss=r.enemy('boss',300),major=r.enemy('guardian20',300),pack=r.enemy('guardian4',300);
 assert.equal(r.enemyXp(normal),15);assert.equal(r.enemyXp(swarm),3.75);assert.equal(r.enemyXp(heavy),30);assert.equal(r.enemyXp(rock),22.5);assert.equal(r.enemyXp(boss),120);assert.equal(r.enemyXp(major),375);assert.equal(r.enemyXp(pack)*5,120);
 r.damage(normal,999);assert.ok(r.get().heroes.every(h=>h.xp===15),'Each party member receives full enemy XP');
 const saved={version:7,worldVersion:3,area:0,currentNode:'town',heroes:[{classId:0,level:10,xp:1800,hp:50,weapon:'0-basic',attributes:{}}]};
 saved.heroes=Array.from({length:4},()=>({...saved.heroes[0]}));const migrated=harness({'bramblebound-v3':JSON.stringify(saved)});assert.equal(migrated.t.get().heroes[0].xp,912,'Old saves retain XP bar percentage');migrated.t.save();assert.equal(harness(migrated.storage).t.get().heroes[0].xp,912,'New saves do not migrate XP twice');
 r.save();console.log('New leveling curve, level-based enemy XP, swarm/heavy/boss rewards and old-save XP progress migration pass.');
}

{
 const {t:r}=harness();r.start();r.setParty([6,6,6,0]);r.enter();const [a,b,c,h]=r.get().heroes,e=r.get().enemies[0];
 for(const bard of [a,b,c]){bard.attributes.str=100;r.stats(bard);r.applySong(e,bard);r.applyNoteSupport(h,bard,{barrier:12});}
 assert.equal(r.enemyDamage(e),1);const hp=h.hp;r.damage(h,r.enemyDamage(e));assert.equal(h.hp,hp-1);assert.equal(r.get().numbers.at(-1).text,1);
 r.damage(h,.1,'poison',false);assert.equal(h.hp,hp-2,'Fractional elemental hits also deal at least one HP');
 console.log('Stacked Bard debuffs, barriers and fractional damage never reduce a landed enemy hit below one HP.');
}


{
 const {t:r}=harness();r.start();
 for(let c=0;c<8;c++)for(let tier=1;tier<=6;tier++){
  const stock=Object.values(r.items).filter(w=>w.type==='weapon'&&!w.retired&&w.exclusiveBoss==null&&w.classId===c&&w.tier===tier);assert.equal(stock.length,c===3?(tier%2?6:5):c===4||c===7?6:c===6?5:7);
  if([0,1,2,3,5].includes(c))for(const effect of ['fire','ice','poison','lightning'])assert.ok(stock.some(w=>w.effect===effect),'Full element/physical-special coverage');
 }
 r.get().completed.push(...Array.from({length:19},(_,i)=>'a'+i));r.travel('town');r.setShopClass(5);assert.ok(r.shopStock().length>=6);assert.ok(r.shopStock().some(w=>w.id==='5-ice'));assert.ok(!r.shopStock().some(w=>w.tier>1));
 r.travel('a0');const h=r.get().heroes[0],foe=r.get().enemies[0];r.get().enemies.forEach(e=>e.hp=0);foe.hp=foe.maxHp=100000;h.x=100;h.y=226;foe.x=160;foe.y=226;
 const signatures=new Set();for(let tier=1;tier<=6;tier++){
  h.weapon=tier===1?'0-fire':'0-fire-t'+tier;r.stats(h);r.get().shots.length=0;r.get().fields.length=0;
  const before=foe.hp;r.activate(h,foe,'fire');signatures.add(r.items[h.weapon].ability?.mode||'burn');
  for(let i=0;i<150;i++){r.tickShots(.01);r.tickEffects(.01)}assert.ok(foe.hp<before,'Each fire-tier ability deals damage');r.draw();
 }assert.equal(signatures.size,5);
 h.weapon='0-fire-t3';r.stats(h);r.activate(h,foe,'fire');const hp=foe.hp;h.gearRevision++;for(let i=0;i<150;i++)r.tickShots(.01);assert.equal(foe.hp,hp,'Unequipping cancels pending ability shots');
 for(let tier=1;tier<=6;tier++)assert.equal(r.items[tier===1?'2-basic':'2-basic-t'+tier].arrows,tier);
 console.log('Curated six-tier class catalogues, Lowlands shop, unique fire patterns, actual spell damage, stale-shot cancellation and bow arrow progression pass.');
}

{
 const {t:r}=harness();r.start();r.setParty([1,0,0,0]);r.enter();r.get().enemies.length=0;
 const h=r.get().heroes[0];h.x=100;h.y=226;h.cooldown=0;h.drive=0;
 const foe=r.enemy('sporecap',130);foe.y=226;foe.hp=foe.maxHp=1000;foe.cooldown=100;r.get().enemies.push(foe);
 r.update(.001);assert.ok(h.strike,'Rogue starts attacking at the near side of a wide body');assert.equal(h.drive,0);
 const hp=foe.hp;r.resolveStrike(h,.1);assert.ok(foe.hp<hp,'Dagger reaches the body edge without reaching its center');
 h.strike={left:0,target:foe,range:14,amount:10,token:r.attackToken(h)};foe.x=160;const movedHp=foe.hp;r.resolveStrike(h,.1);assert.equal(foe.hp,movedHp,'Moving out of dagger reach avoids the hit');
 const second=r.enemy('sporecap',130);second.y=226;second.hp=1000;r.get().enemies.push(second);foe.x=130;h.strike={left:0,target:foe,range:14,amount:10,token:r.attackToken(h)};r.resolveStrike(h,.1);assert.equal(second.hp,1000,'Daggers remain single-target');
 console.log('Rogue approaches and hits enemy body edges, respects escape distance, and remains single-target.');
}

{
 const {t:r}=harness();r.start();
 for(const c of [0,1,2,5])for(let tier=1;tier<=6;tier++){
  const stock=Object.values(r.items).filter(w=>w.type==='weapon'&&!w.retired&&w.exclusiveBoss==null&&w.classId===c&&w.tier===tier),physical=stock.filter(w=>!w.effect);
  assert.equal(stock.length,7);assert.equal(physical.length,2);const late=physical.find(w=>w.id.split('-')[1]==='iron');
  if(tier>1)for(const w of stock.filter(w=>w!==late)){assert.ok(late.min>w.min);assert.ok(late.max>w.max)}assert.equal(late.ability,undefined);
 }
 for(const ids of Object.values(r.WEAPON_DROPS))assert.ok(ids.every(id=>!r.items[id].retired),'Retired gear never drops');
 r.get().completed.push(...r.AREAS.map(a=>a.id));r.travel('town');for(let c=0;c<8;c++){r.setShopClass(c);assert.ok(r.shopStock().every(w=>!w.retired));}
 for(const c of [0,5]){
  r.setParty([c,1,2,3]);r.enter();r.get().enemies.length=0;const h=r.get().heroes[0];h.x=100;h.y=226;h.cooldown=0;h.drive=0;
  const foe=r.enemy('sporecap',100+h.range+14);foe.y=226;foe.hp=foe.maxHp=1000;foe.cooldown=100;r.get().enemies.push(foe);
  r.update(.001);assert.ok(h.strike,'Melee starts at the body edge');assert.equal(h.drive,0);const before=foe.hp;
  for(let i=0;i<40;i++)r.resolveStrike(h,.008);assert.ok(foe.hp<before,'Sword/scythe contacts the edge of a wide enemy');
 }
 console.log('Seven-option standard tiers, stronger ability-free physical weapons, curated class exceptions, retired drop/shop exclusion and Warrior/Reaper edge contact pass.');
}

{
 for(const moving of [false,true]){
  const {t:r}=harness();r.start();r.setParty([1,0,0,0]);r.enter();r.get().heroes.slice(1).forEach(h=>h.hp=0);r.get().enemies.length=0;
  const h=r.get().heroes[0];h.x=100;h.y=226;h.hp=h.maxHp=100000;h.attributes.dex=0;r.stats(h);h.hp=h.maxHp=100000;
  const boss=r.enemy('guardian20',250);boss.y=226;boss.hp=boss.maxHp=100000;boss.speed=moving?10:0;boss.cooldown=1000;boss.specialCooldown=1000;boss.attackProfile=null;boss.range=12;r.get().enemies.push(boss);
  let hits=0,previous=boss.hp;
  for(let i=0;i<1800;i++){r.update(1/120);if(boss.hp<previous){hits++;previous=boss.hp;assert.ok(h.x<r.enemyBodyBounds(boss).left,'Rogue must stay outside the large body through repeated attacks');}}
  assert.ok(hits>=10,'Exercise sustained combat, not one isolated swing');
 }
 console.log('Sustained Rogue combat stays outside stationary and advancing large bosses without attack-driven creeping.');
}

{
 const {t:r}=harness();assert.deepEqual([r.items['0-iron'].min,r.items['0-iron'].max],[5,10]);assert.equal(r.items['0-heavy'].effect,'cleave');
 for(const c of [0,1,2,4,5])for(let tier=2;tier<=6;tier++){
  const early=r.items[c+'-basic-t'+tier],late=r.items[c+'-iron-t'+tier],element=r.items[c+'-'+(c===4?'ice':'fire')+'-t'+tier],previous=r.items[c+'-iron'+(tier===2?'':'-t'+(tier-1))];
  assert.ok(early.min>=element.min*1.5&&early.max>=element.max*1.5);assert.equal(late.min,element.min*2);assert.equal(late.max,element.max*2);assert.ok(early.min>previous.min&&early.max>previous.max);assert.equal(early.effect,null);assert.equal(late.effect,null);
 }console.log('Starter Iron exception, Cleave Long Sword, 1.5–2x physical AT and upward tier transitions pass.');
}

{
 const sounds=[],{t:r}=harness({},sounds);r.start();const h=r.get().heroes[0],e=r.get().enemies[0];e.hp=1000;
 r.damage(e,1,'fire',false);assert.equal(sounds.length,0,'DoT ticks are silent');r.damage(e,1);assert.equal(sounds.at(-1).event,'enemyHit');r.damage(h,1);assert.equal(sounds.at(-1).event,'hurt');
 r.damage(e,10000);assert.equal(sounds.at(-1).event,'death');r.setStage(r.stageCount()-1);r.get().enemies.forEach(e=>e.hp=0);r.tickBossExit(.1);r.tickBossExit(.1);assert.equal(sounds.filter(s=>s.event==='clear').length,1);
 r.attackMotion(h);assert.equal(sounds.at(-1).event,'weapon');r.activate(h,e,'fire');assert.equal(sounds.at(-1).event,'spell');
 console.log('Game audio: quiet DoTs, direct hits, ally damage, death, once-only boss clear and weapon/spell hooks pass.');
}

{
 const run=harness(),r=run.t;r.start();const sources=new Map(),speciesTables=new Map();
 for(const node of r.AREAS){r.setArea(node.area);for(let st=0;st<r.stageCount();st++){r.setStage(st);r.enter();for(const mob of r.get().enemies){const table=Array.from(r.weaponDropTable(mob));assert.ok(table.length>=1&&table.length<=2,'Every encountered mob has a weapon: '+node.name+' '+mob.species);const key=node.zone+':'+mob.species;if(speciesTables.has(key))assert.deepEqual(table,speciesTables.get(key));else speciesTables.set(key,table);for(const id of table){assert.equal(r.items[id].tier,node.zone+1);if(!sources.has(id))sources.set(id,new Set());sources.get(id).add(key);}}}}
 for(const [id,mobs] of sources)assert.ok(mobs.size<=2,id+' has more than two species sources');
 for(const id of Object.keys(r.WEAPON_AREAS))assert.ok(sources.has(id),'Every weapon source is actually encountered');
 r.setArea(0);r.setStage(0);r.enter();run.math.random=()=>0;for(const mob of r.get().enemies)assert.ok(r.rollDrops(mob).some(id=>r.items[id].type==='weapon'),'Opening enemies can drop weapons immediately');
 console.log('Every live encounter has weapon loot; species tables stay fixed, tiers match, each weapon has at most two sources, and opening-stage rolls work.');
}

// Close-range Woodland spores must hit, and exposure must not postpone poison ticks.
{
 const {t:a}=harness();a.start();a.setArea(5);a.enter();
 const h=a.get().heroes[0],caster=a.enemy('sporecap',400);h.x=410;h.y=caster.y;h.hp=h.maxHp=1000;
 a.fireEnemyAttack(caster,h,caster.attackProfile);
 assert.equal(a.get().hazards[0].x,h.x,'Cloud aims at close target instead of overshooting');
 a.tickHazards(.01);assert.ok(h.hp<1000);assert.ok(h.poison);
 a.tickEffects(.6);const remaining=h.poison.tick;a.tickHazards(.61);
 assert.equal(h.poison.tick,remaining,'Exposure refresh preserves next poison tick');
 const hp=h.hp;a.tickEffects(.41);assert.ok(h.hp<hp,'Poison ticks while standing in cloud');
 h.defense=10000;h.runeBonus.resistance=.99;const before=h.hp;a.tickEffects(1);
 assert.ok(h.hp<before,'Poison ignores defense and applies elemental resistance');
 assert.equal(a.get().numbers.length,0,'Cloud and poison do not create damage numbers');
 console.log('Woodland close-range cloud contact, uninterrupted poison ticks, minimum damage and quiet DoTs pass.');
}

{
 const run=harness(),r=run.t;r.start();
 for(let z=0;z<6;z++){
  const branch=r.AREAS.filter(n=>n.optional&&n.zone===z),fork=r.AREAS[z*21+7];assert.equal(branch.length,3);
  assert.ok(fork.next.includes('a'+(z*21+8)));assert.ok(fork.next.includes(branch[0].id));
  r.get().completed.push(fork.id);assert.ok(r.unlockedNodes().has(branch[0].id));assert.ok(!r.unlockedNodes().has(branch[2].id));
  for(const node of branch){
   assert.ok(r.unlockedNodes().has(node.id));r.setArea(node.area);r.setStage(r.stageCount()-1);r.enter();
   if(node.major){const boss=r.get().enemies[0];assert.equal(r.get().enemies.length,1);assert.ok(Object.keys(boss.resistances).length);
    for(const pattern of boss.patterns){boss.warning={pattern,left:0,x:200,y:226};r.tickSpecial(boss,r.get().heroes[0],.01);r.tickHazards(.01);r.draw();}
   }
   r.get().enemies.forEach(e=>e.hp=0);r.tickBossExit(2);r.completeArea();assert.ok(r.get().completed.includes(node.id));
  }
  assert.equal(branch[2].next.length,0);assert.ok(!r.get().completed.includes('a'+(z*21+20)));
  assert.equal(r.areaHealth(branch[2].area),r.areaHealth(z*21+10));
 }
 r.setArea(0);const mushroom=r.enemy('sporecap',300);mushroom.hp=1000;r.damage(mushroom,100,'poison',false);assert.equal(mushroom.hp,935);r.damage(mushroom,100,'fire',false);assert.equal(mushroom.hp,835);
 for(const [a,blocked,normal] of [[128,'physical','fire'],[131,'fire','physical'],[131,'ice','physical'],[131,'poison','physical'],[131,'lightning','physical'],[131,'magic','physical']]){
  r.setArea(a);const boss=r.enemy('guardian'+a,400);boss.hp=1000;r.damage(boss,100,blocked,false);assert.equal(boss.hp,940);r.damage(boss,100,normal,false);assert.equal(boss.hp,840);
 }
 r.save();const loaded=harness(run.storage).t;assert.ok(loaded.get().completed.includes('a143'));assert.equal(loaded.get().area,131);
 console.log('Optional branches unlock independently, preserve progression scaling and saves, execute boss patterns, and apply selective damage resistance.');
}

{
 const {t:r,math}=harness();r.start();math.random=()=>0;r.setParty([0,7,2,4]);const h=r.get().heroes[0];
 const pairs=[[.25,10],[.5,10],[.5,15],[1,15],[.3,45]];
 for(let i=0;i<5;i++){const w=r.items[i?'rune-knockback-'+(i+1):'rune-knockback'];assert.equal(w.bonuses.knockbackChance,pairs[i][0]);assert.equal(w.bonuses.knockbackPower,pairs[i][1]);}
 h.runes=['rune-knockback',null];r.stats(h);h.x=100;
 const small=r.enemy('slime',300),large=r.enemy('beetle',300),boss=r.enemy('boss',300),fixed=r.enemy('slime',300);fixed.immobile=true;
 for(const e of [small,large,boss,fixed]){e.hp=1000;r.basicHit(e,1,r.attackToken(h));}
 assert.equal(small.kick,90);assert.ok(large.kick<small.kick);assert.equal(boss.kick,9);assert.equal(fixed.kick||0,0);
 const before=small.kick;r.damage(small,1,'poison',false,false,h);assert.equal(small.kick,before,'DoT cannot repeatedly trigger knockback');
 math.random=()=>.3;r.basicHit(small,1,r.attackToken(h));assert.equal(small.kick,before,'Tier one can fail its proc roll');
 const vx=h.vx||0;r.damage(h,1);assert.equal(h.vx||0,vx,'Incoming damage no longer pushes heroes');
 const summoner=r.get().heroes[1];summoner.runes=['rune-knockback-4',null];r.stats(summoner);assert.equal(summoner.runeBonus.knockbackPower,0);assert.equal(summoner.summonBonuses.knockbackPower,15);
 math.random=()=>0;const pet={x:100,hp:100,maxHp:100,owner:summoner,runeBonus:summoner.summonBonuses};r.damage(small,1,'physical',true,false,pet);assert.equal(small.kick,before+135,'Summon direct hits use socket knockback');
 console.log('Knockback rune tiers, chance, size reduction, boss reduction, immobile immunity, quiet DoTs and summon inheritance pass.');
}

{
 const run=harness(),r=run.t;r.start();run.math.random=()=>0;
 for(let z=0;z<6;z++){
  const a=128+3*z,id='boss-weapon-'+z,w=r.items[id],soul=r.items['boss-soul-'+z];assert.ok(w.ability&&w.effect);assert.equal(w.tier,z+1);
  const sources=Object.entries(r.WEAPON_DROPS).filter(([,ids])=>ids.includes(id));assert.equal(sources.length,1);assert.equal(sources[0][0],a+':guardian'+a);
  r.setArea(a);r.setStage(0);r.enter();assert.ok(r.rollDrops(r.get().enemies[0]).includes(soul.id));
  r.setArea(z*21);assert.ok(!r.rollDrops(r.enemy('boss',300)).some(id=>r.items[id].exclusiveBoss!=null));
  r.setParty([w.classId,w.classId,w.classId,w.classId]);r.enter();const h=r.get().heroes[0];h.weapon=id;h.level=99;r.stats(h);const target=r.get().enemies[0];target.hp=10000;target.x=h.x+20;target.y=h.y;
  r.activate(h,target,w.effect);for(let i=0;i<100;i++){r.tickShots(.02);r.tickEffects(.02);}assert.ok(target.hp<10000,'Boss ability deals damage: '+w.name);
 }
 r.setParty([0,2,3,7]);const [warrior,ranger]=r.get().heroes;for(const h of r.get().heroes){h.level=99;r.stats(h);}const hp=warrior.maxHp,at=warrior.atMax;
 r.setItem(0,'boss-soul-0');assert.equal(r.moveItem({type:'bag',index:0},{type:'rune0',index:1}),false);assert.ok(r.moveItem({type:'bag',index:0},{type:'rune0',index:0}));assert.equal(warrior.maxHp,Math.floor(hp*.5));assert.equal(warrior.atMax,Math.floor(at*1.5));
 r.setItem(1,'boss-soul-1');assert.equal(r.moveItem({type:'bag',index:1},{type:'rune1',index:0}),false);assert.ok(r.moveItem({type:'bag',index:1},{type:'rune0',index:1}));
 r.setArea(1);r.setStage(0);r.enter();r.get().enemies.length=0;
 const addShot=()=>r.get().shots.push({x:175,y:220,vx:200,vy:0,life:2,kind:'arrow',amount:1,attack:r.attackToken(ranger)});
 addShot();r.tickShots(.1);assert.equal(r.get().shots.length,1,'Prism shot crosses raised terrain');r.get().shots.length=0;ranger.runeBonus.wallPierce=0;addShot();r.tickShots(.1);assert.equal(r.get().shots.length,0,'Ordinary shot stops at terrain');
 r.get().completed.push('a25');assert.ok(r.travel('trader1'));const early=r.shopStock().filter(w=>w.tier===2);assert.ok(early.length<Object.values(r.items).filter(w=>['rune','gem'].includes(w.type)&&w.tier===2).length);
 const later=Object.values(r.items).find(w=>w.type==='rune'&&w.tier===2&&w.sourceArea>25);assert.ok(!r.shopStock().some(w=>w.id===later.id));r.get().completed.push('a'+later.sourceArea);assert.ok(r.shopStock().some(w=>w.id===later.id));
 for(let a=21;a<41;a++){r.setArea(a);for(const id of r.rollDrops(r.enemy('slime',300)))if(['rune','gem'].includes(r.items[id].type))assert.ok(r.items[id].sourceArea<=a);}
 assert.equal(r.items['rune-might'].description,'+15% AT.');assert.equal(r.items['rune-vitality'].description,'+20% maximum HP.');assert.equal(r.items['rune-renewal'].description,'+1 HP/s.');
 console.log('Exclusive boss weapons and abilities, unique soul pools, class restrictions, stat tradeoffs, terrain-piercing projectiles, and source-area socket shops pass.');
}

{
 const run=harness(),r=run.t;r.start();r.setParty([4,0,6,7]);const [priest,ally,bard,summoner]=r.get().heroes;
 for(const h of r.get().heroes){h.x=100;h.y=226;h.hp=1000;}priest.attributes.dex=50;r.stats(priest);priest.hp=1000;bard.str=10;bard.dex=20;
 for(const h of [priest,ally]){const hp=h.hp;r.damage(h,20,'physical');assert.equal(h.hp,hp-10);r.damage(h,20,'fire');assert.equal(h.hp,hp-30);assert.ok(r.get().numbers.at(-1).vx<0);}
 const foe=r.enemy('slime',300);foe.hp=1000;foe.at=20;r.applySong(foe,bard);assert.equal(r.enemyDamage(foe),15);for(const element of ['fire','poison','ice','lightning','magic'])assert.equal(r.enemyDamage(foe,1,element),20);
 r.damage(foe,20);assert.equal(foe.hp,975,'DEX adds five physical damage');assert.ok(r.get().numbers.at(-1).vx>0);r.damage(foe,20,'fire');assert.equal(foe.hp,950,'Elemental hits also gain vulnerability');
 ally.runes=['rune-fire-ward-1',null];r.stats(ally);ally.hp=1000;r.damage(ally,100,'fire');assert.equal(ally.hp,925);r.damage(ally,100,'ice');assert.equal(ally.hp,825);
 const pet={owner:summoner,x:100,y:226,hp:1000,maxHp:1000,defense:2,runeBonus:{}};r.damage(pet,20,'physical');assert.equal(pet.hp,992);r.damage(pet,20,'poison');assert.equal(pet.hp,972);assert.ok(r.get().numbers.at(-1).vx<0);
 const mushroom=r.enemy('sporecap',300);mushroom.at=20;r.applySong(mushroom,bard);r.fireEnemyAttack(mushroom,ally,mushroom.attackProfile);assert.equal(r.get().hazards.at(-1).amount,9,'Poison cloud bypasses physical attack debuff');
 console.log('Physical-only defense/weakness, priest self and summon aura, elemental wards, physical-only vulnerability and damage-number directions pass.');
}

{
 const {t:r}=harness();r.start();const h=r.get().heroes[0],foe=r.get().enemies[0];foe.hp=10000;foe.songs={bard:{until:100,vulnerability:5}};
 for(const element of ['physical','fire','ice','lightning','poison','magic']){const hp=foe.hp;r.damage(foe,10,element);assert.equal(hp-foe.hp,15);}
 foe.x=h.x;foe.y=h.y;r.get().fields.push({x:foe.x,y:foe.y,life:1,elapsed:0,pulses:0,amount:10,source:h});const hp=foe.hp;for(let i=0;i<10;i++)r.tickEffects(.1);assert.equal(hp-foe.hp,105,'Ten fire ticks share one five-damage bonus');
 foe.poison={time:2,tick:1/30,amount:10,source:h};const before=foe.hp;r.tickEffects(1);assert.ok(Math.abs(before-foe.hp-305)<1e-6);
 r.setTime(101);const expired=foe.hp;r.damage(foe,10,'ice');assert.equal(expired-foe.hp,10);
 console.log('All damage types gain Bard vulnerability; fast fire ticks share the bonus per second and expired notes stop boosting damage.');
}

{
 const run=harness(),r=run.t;r.start();run.math.random=()=>0;const h=r.get().heroes[0],target=r.get().enemies[0];target.hp=100000;target.x=h.x+10;target.y=h.y;h.atMin=h.atMax=100;
 h.weapon='0-ice';r.activate(h,target,'ice');assert.equal(target.hp,99897,'Ice adds 3 bonus AT to 100 character AT');
 h.weapon='0-fire';r.activate(h,target,'fire');assert.equal(r.get().fields.at(-1).min,4,'Flames use bonus AT alone');r.get().fields.length=0;
 h.weapon='0-fire-t2';r.activate(h,target,'fire');const field=r.get().fields.at(-1);assert.equal(field.spell.kind,'fire');r.tickEffects(.31);assert.ok(r.get().fields.some(f=>f.burn&&f.min===5));
 h.weapon='3-lightning';r.activate(h,target,'lightning',200);assert.equal(target.hp,99696,'Provided mage AT receives bonus once');
 console.log('Weapon abilities add bonus AT to character AT, including fire pulses and mage casts.');
}

{
 function poisoned(){const run=harness(),r=run.t;r.start();run.math.random=()=>0;const h=r.get().heroes[0],e=r.get().enemies[0];h.weapon='0-poison';h.atMin=h.atMax=1000;e.hp=10000;r.activate(h,e,'poison');assert.equal(e.poison.amount,2,'Poison uses bonus AT, never character AT');return {r,h,e};}
 const a=poisoned();a.r.tickEffects(4);assert.equal(a.e.hp,9958,'Warrior poison expires after 21 ticks in 0.7 seconds');assert.equal(a.e.poison,null);
 const b=poisoned();for(let i=0;i<240;i++)b.r.tickEffects(1/60);assert.equal(b.e.hp,a.e.hp,'Render rate does not change poison damage');
 const c=poisoned();for(let i=0;i<60;i++){c.r.activate(c.h,c.e,'poison');c.r.tickEffects(1/60);}assert.equal(c.e.hp,9940,'Refreshing every frame never postpones damage ticks');
 const d=poisoned();d.h.hp=10000;d.h.poison={time:2,tick:1/30,amount:3};d.r.tickEffects(1);assert.equal(d.h.hp,9910,'Enemy poison also ticks 30 times per second');
 console.log('Poison uses ability bonus AT at fixed 30 Hz for enemies and heroes, survives refreshes, and stops exactly at expiry.');
}

{
 const run=harness(),r=run.t;r.start();r.setParty([6,6,4,4]);const [bard,other]=r.get().heroes,foe=r.get().enemies[0];bard.attributes.str=10;bard.attributes.dex=20;r.stats(bard);bard.weapon='6-heal';bard.hp=10;r.activate(bard,foe,'restore');r.shootNote(bard,foe,1,r.attackToken(bard));assert.equal(bard.hp,22,'Own restoring note heals once despite three projectiles');assert.equal(r.songTotal(bard,'attack'),.1);assert.equal(r.songTotal(bard,'haste'),.2);r.applySong(bard,other);assert.equal(Object.keys(bard.songs).length,2,'Self and other bard contributions coexist');
 bard.poison={time:2,tick:1/30,amount:2};r.activate(bard,foe,'cleanse');r.shootNote(bard,foe,1,r.attackToken(bard));assert.equal(bard.poison,null);
 r.activate(bard,foe,'guard');r.shootNote(bard,foe,1,r.attackToken(bard));assert.equal(r.absorbBarrier(bard,20),8);
 r.setTime(2.01);assert.equal(r.songTotal(bard,'attack'),0,'Self buffs expire normally');
 console.log('Bard self notes apply stats, healing once, cleanse and barrier; stack by source and expire normally.');
}

{
 const run=harness(),r=run.t;r.start();r.setParty([1,0,0,0]);const rogue=r.get().heroes[0];rogue.hp=1000;rogue.x=100;rogue.y=226;
 r.explode({x:100,y:214,aoe:30,amount:100,element:'fire',dodgeable:false});assert.equal(rogue.hp,920,'Boss explosion gets base evasion');
 r.damage(rogue,100,'fire',false,false,null,1,true);assert.equal(rogue.hp,820,'Burn damage bypasses evasion');
 r.select(0);assert.match(run.elements.get('#priest-aura').textContent,/EVASION 20%/);
 rogue.hp=90;rogue.dodgeLeft=6;r.save();const loaded=harness(run.storage).t;assert.equal(loaded.get().heroes[0].evasion,.2);assert.equal(loaded.get().heroes[0].maxHp,90);
 console.log('Rogue boss AoE mitigation, burn bypass, evasion readout and save reload pass.');
}

{
 const {t:r}=harness();r.start();r.setParty([1,0,0,0]);const h=r.get().heroes[0];h.attributes.int=100;r.stats(h);assert.equal(h.crit,0);h.attributes.str=100;r.stats(h);assert.equal(h.crit,.25);
 h.weapon='1-fire';h.mp=0;r.stats(h);h.attributes.int=1;r.stats(h);const foe=r.get().enemies[0];foe.hp=10000;r.basicHit(foe,1,r.attackToken(h));assert.equal(h.mp,1);
 r.startTown();for(const id of ['0-basic','0-fire','rune-ward','gem-ruby-1','rune-knockback-5']){r.setItem(0,id);r.setGold(0);r.setPicked({type:'bag',index:0});assert.ok(r.sellItem());assert.equal(r.get().gold,Math.floor(r.buyPrice(r.items[id])*.1));}
 console.log('Rogue STR crit is separate from INT MP; weapon, rune and gem sales pay ten percent of buy price.');
}

{
 const run=harness(),r=run.t;r.start();run.math.random=()=>0;
 function setup(w){r.setParty([w.classId,0,0,0]);r.setArea(0);r.setStage(0);r.enter();const h=r.get().heroes[0];h.weapon=w.id;h.level=99;r.stats(h);h.x=50;h.y=200;r.get().enemies.length=0;for(const x of [90,130,170,210]){const e=r.enemy('slime',x);e.y=200;e.hp=10000;r.get().enemies.push(e);}return h;}
 for(const mode of ['chain','fork','piercing','repeat']){
  const w=Object.values(r.items).find(w=>w.type==='weapon'&&!w.retired&&w.effect==='lightning'&&w.ability.mode===mode);assert.ok(w);const h=setup(w),foes=r.get().enemies;r.activate(h,foes[0],'lightning');
  for(let i=0;i<150;i++){r.tickShots(.01);r.tickEffects(.01);}
  assert.equal(foes.filter(e=>e.hp<10000).length,mode==='repeat'?1:mode==='piercing'?4:3,mode+' target pattern');assert.ok(foes.every(e=>!e.stun),'Lightning never stuns');
 }
 const bow=r.items['2-poison-t2'],h=setup(bow),foes=r.get().enemies;foes[1].x=foes[0].x;r.activate(h,foes[0],'poison');for(let i=0;i<60;i++)r.tickShots(.01);assert.equal(foes.filter(e=>e.poison).length,1,'Poison dart has no splash');
 for(const w of Object.values(r.items).filter(w=>w.type==='weapon'&&!w.retired&&w.effect==='poison'&&w.ability)){assert.ok(['bolt','fan'].includes(w.ability.mode));assert.equal(w.ability.radius,0);}
 const fire=r.items['2-fire'],caster=setup(fire),target=r.get().enemies[0];target.x=90;target.y=200;r.activate(caster,target,'fire');r.activate(caster,target,'fire');const flames=r.get().fields;for(const f of flames){f.x=90;f.y=188;f.min=f.max=5;f.chance=1;}r.tickEffects(1);assert.equal(target.hp,9700,'Two flames roll independently 30 times each');assert.equal(r.get().numbers.length,0,'Burn damage stays silent');
 r.tickEffects(1);assert.equal(target.hp,9400);assert.equal(r.get().fields.length,0,'Flames expire after two seconds');
 r.activate(caster,target,'fire');const before=target.hp;run.math.random=()=>.06;r.tickEffects(2);assert.equal(target.hp,before,'Burn chance can fail');
 console.log('Focused poison, lightning chain/fork/piercing/repeat, no stun, independent fixed-rate flame rolls and expiry pass.');
}

{
 const {t:r}=harness();r.start();for(const [c,duration] of [[0,.7],[1,.3],[2,1],[3,1],[5,1],[7,1]]){
  r.setParty([c,0,0,0]);r.enter();const h=r.get().heroes[0],e=r.get().enemies[0];h.weapon=c+'-poison';r.stats(h);e.hp=10000;r.activate(h,e,'poison');assert.equal(e.poison.time,duration);r.tickEffects(duration);assert.equal(e.poison,null);
  h.attributes.dex=100;h.runes=['rune-haste',null];r.stats(h);r.activate(h,e,'poison');assert.equal(e.poison.time,duration,'Base weapon speed determines poison duration');
 }
 for(const w of Object.values(r.items).filter(w=>w.type==='weapon'&&w.effect==='poison')){assert.ok(w.poisonDuration<=1);if(w.classId===1)assert.equal(w.poisonDuration,.3);if(w.classId===2)assert.equal(w.poisonDuration,1);}
 console.log('Short poison durations across classes and tiers, fixed under haste, expire without lingering ticks.');
}

{
 const run=harness(),r=run.t;r.start();r.setArea(5);r.enter();const h=r.get().heroes[0],e=r.enemy('sporecap',400);h.x=410;h.y=e.y;h.hp=10000;e.at=10000;
 for(const [random,expected] of [[0,1],[.999,2]]){run.math.random=()=>random;h.poison=null;r.get().hazards.length=0;r.fireEnemyAttack(e,h,e.attackProfile);const cloud=r.get().hazards[0];assert.equal(cloud.poisonAmount,expected,'Poison independent of enemy AT');cloud.amount=0;r.tickHazards(.01);const hp=h.hp;r.get().hazards.length=0;r.tickEffects(1);assert.equal(hp-h.hp,expected*30);}
 r.ENEMY_TYPES.sporecap.poisonDamage=[3,3];r.fireEnemyAttack(e,h,e.attackProfile);assert.equal(r.get().hazards[0].poisonAmount,3,'Per-species poison tuning');
 console.log('Early enemy poison is 1–2 per tick (30–60 DPS), independent of AT and tunable per species.');
}

{
 const run=harness(),r=run.t;r.start();r.setParty([3,0,0,0]);const h=r.get().heroes[0];h.weapon='3-ice';r.stats(h);h.x=50;h.y=200;r.get().enemies.length=0;
 for(const x of [100,150,160]){const e=r.enemy('slime',x);e.y=200;e.hp=1000;r.get().enemies.push(e);}const [target,inside,outside]=r.get().enemies;r.activate(h,target,'ice');assert.ok(inside.hp<1000);assert.equal(outside.hp,1000);assert.equal(r.get().blasts[0].radius,52);assert.ok(target.frozen>0);r.draw();
 assert.equal(r.items['3-ice-t6'].spellRadius,82);assert.equal(r.items['3-fire-t6'].spellRadius,67);
 for(const id of ['3-fire','3-poison','3-ice','3-lightning']){h.weapon=id;r.stats(h);r.shoot(h,target,'magic',20,r.attackToken(h));r.draw();}
 assert.equal(r.items['3-poison-t2'].ability.radius,0,'Poison stays focused');
 console.log('Mage frost nova hits within its visible radius, late AoE grows gradually, distinct projectile renderers run, and poison stays focused.');
}

{
 const {t:r}=harness();r.start();const h=r.get().heroes[0];h.x=20;h.y=226;const boss=r.enemy('boss',550);boss.at=100;boss.specialCooldown=0;boss.patterns=['BOMBS'];r.tickSpecial(boss,h,.01);assert.equal(boss.warning,null,'Boss fires across arena without warning');assert.equal(r.get().hazards.at(-1).amount,300,'Bomb reduced from 400 to 300');assert.equal(boss.specialCooldown,2.3);assert.equal(r.enemyDamage(boss),100,'Basic attack damage unchanged');
 const caster=r.enemy('sporecap',100);caster.at=100;caster.y=226;caster.cooldown=0;h.x=110;r.tickProfileAttack(caster,h,.01);assert.equal(caster.cast.left,.55);assert.ok(Math.abs(caster.cooldown-2.85)<1e-9);r.tickProfileAttack(caster,h,.56);assert.equal(r.get().hazards.at(-1).amount,36);assert.ok(r.get().hazards.at(-1).poisonAmount<=2,'Poison tick damage stays separately tuned');
 console.log('Faster weaker specials, arena-wide boss triggering, faster ranged casts and unchanged basic attacks pass.');
}

{
 const {t:r}=harness();r.start();const h=r.get().heroes[0];h.x=100;h.y=200;
 const recipes=new Set(),patterns=new Set();
 for(const [id,spec] of Object.entries(r.ENEMY_TYPES).filter(([id,s])=>id.startsWith('guardian')&&s.base==='boss')){
  const boss=r.enemy(id,400);boss.y=200;assert.ok(boss.specialMoves?.length>=2,id+' has rotating specials');recipes.add(JSON.stringify(boss.specialMoves));
  for(let i=0;i<boss.specialMoves.length;i++){
   r.get().hazards.length=0;r.get().rituals.length=0;boss.specialBurst=null;boss.patternIndex=i;boss.specialCooldown=0;boss.warning=null;
   const pattern=boss.specialMoves[i].pattern;patterns.add(pattern);r.tickSpecial(boss,h,.01);
   if(pattern==='SPORES'){assert.ok(boss.warning);r.tickSpecial(boss,h,.8);}else assert.equal(boss.warning,null,pattern+' has no projectile prewarning');
   if(['CHARGE','CURSE','FROST'].includes(pattern))assert.ok(r.get().rituals.every(p=>p.left>0),'Instant strikes retain ground warnings');
   if(['SWEEP','PULSE'].includes(pattern))assert.ok(boss.slash.left>0,'Melee keeps windup');
   if(pattern==='STREAM'){const n=r.get().hazards.length;for(let j=0;j<7;j++)r.tickSpecial(boss,h,.29);assert.ok(r.get().hazards.length>n,'Stream fires staggered shots');assert.equal(boss.specialBurst,null);}
   for(const p of r.get().hazards){assert.ok(Number.isFinite(p.vx)&&Number.isFinite(p.vy)&&Number.isFinite(p.amount),id+' valid projectile');if(p.kind==='missile'){assert.ok(p.life<=1.5);assert.ok(p.tracking<1);}}
   r.draw();
  }
 }
 assert.ok(patterns.size>=15);assert.ok(recipes.size>=40,'Broad variety across guardian recipes');
 console.log('All guardian rotations execute; varied recipes, staggered streams, limited seekers, immediate projectiles and warned instant strikes pass.');
}

{
 const {t:r}=harness();r.start();r.setParty([2,0,0,0]);const h=r.get().heroes[0];h.x=50;h.y=226;h.attributes.int=100;
 const bow=Object.values(r.items).find(w=>w.classId===2&&!w.retired&&w.effect==='fire'&&w.ability?.mode==='fan');h.weapon=bow.id;r.stats(h);
 const target=r.enemy('slime',180);target.y=226;target.hp=10000;r.get().enemies.length=0;r.get().enemies.push(target);
 r.shoot(h,target,'arrow',1,r.attackToken(h));assert.ok(r.get().shots.every(p=>p.kind==='arrow'),'No spell before arrow hit');
 for(let i=0;i<100&&!r.get().shots.some(p=>p.kind==='spell');i++)r.tickShots(.01);
 const sparks=r.get().shots.filter(p=>p.kind==='spell');assert.equal(sparks.length,5);assert.ok(sparks.every(p=>Math.abs(p.x-target.x)<4&&p.small&&p.gravity===220),'Small fireballs scatter from impact');
 r.get().enemies.length=0;for(let i=0;i<220;i++)r.tickShots(.01);assert.ok(r.get().fields.length>0,'Bouncing sparks leave fire on landing');
 r.get().fields.length=0;h.weapon='2-fire';r.stats(h);r.activate(h,target,'fire');assert.equal(r.get().fields[0].x,target.x,'Original ground fire stays at target');
 h.classId=3;h.weapon='3-fire-t3';r.stats(h);r.get().shots.length=0;r.activate(h,target,'fire');assert.ok(r.get().shots.every(p=>p.x===h.x),'Mage still casts from the mage');
 console.log('Bow abilities wait for arrow impact, scatter five small bouncing fireballs, retain ground flames and preserve mage casting.');
}

{
 const run=harness(),r=run.t;r.start();run.math.random=()=>0;
 const all=Object.values(r.items).filter(w=>w.type==='enchantment');assert.equal(all.length,48);
 const poison=[[0,1],[1,1],[1,2],[2,2],[2,3],[3,3]],fire=[[1,2],[3,4],[5,6],[6,9],[8,12],[10,15]],lightning=[4,9,15,22,30,39];
 for(let tier=1;tier<=6;tier++){
  for(const [kind,range] of [['poison',poison[tier-1]],['fire',fire[tier-1]],['ice',[tier*3,tier*5]],['lightning',[0,lightning[tier-1]]]]){const w=r.items['enchantment-'+kind+'-'+tier];assert.deepEqual([w.bonuses[kind+'Min'],w.bonuses[kind+'Max']],range);assert.equal(r.buyPrice(w),1000*tier);}
 }
 const h=r.get().heroes[0];h.level=100;h.weapon='0-poison';h.runes=['enchantment-poison-2','enchantment-poison-time-2'];r.stats(h);const target=r.enemy('slime',160);target.hp=10000;r.get().enemies.length=0;r.get().enemies.push(target);r.activate(h,target,'poison');assert.equal(target.poison.amount,3);assert.equal(target.poison.time,2.7);assert.match(r.effectText(r.items[h.weapon],h.runes),/Poison 2.7s/);
 h.weapon='0-fire';h.runes=['enchantment-fire-3','enchantment-fire-time-2'];r.stats(h);r.activate(h,target,'fire');const flame=r.get().fields.at(-1);assert.equal(flame.min,9);assert.equal(flame.max,12);assert.equal(flame.duration,2.6);assert.match(r.effectText(r.items[h.weapon],h.runes),/2.6s/);
 h.weapon='0-ice';h.runes=['enchantment-ice-2','enchantment-freeze-3'];r.stats(h);const base=r.controlDuration(h,.7);assert.ok(Math.abs(r.freezeDuration(h)-base-.3)<1e-9);const amount=r.abilityDamage(h,'ice',0);h.runes=[null,null];r.stats(h);assert.equal(amount-r.abilityDamage(h,'ice',0),6);
 h.weapon='0-slow';h.runes=['enchantment-cold-2',null];r.stats(h);target.slow=0;r.activate(h,target,'slow');assert.ok(Math.abs(target.slowAmount-.3)<1e-9);
 h.weapon='0-slow-t2';r.stats(h);r.activate(h,target,'slow');for(let i=0;i<100;i++){r.tickShots(.01);r.tickEffects(.01);}assert.ok(Math.abs(target.slowAmount-.3)<1e-9,'Later ability gets additive cold too');
 const boss=r.enemy('boss',160);boss.hp=10000;r.get().enemies.push(boss);h.weapon='0-ice';h.runes=['enchantment-freeze-3',null];r.stats(h);r.activate(h,boss,'ice');assert.ok(Math.abs(boss.frozen-r.freezeDuration(h)*.2)<1e-9,'Boss resists combined freeze');
 r.setParty([7,0,0,0]);const summoner=r.get().heroes[0];summoner.weapon='7-poison';summoner.runes=['enchantment-poison-2','enchantment-poison-time-1'];r.stats(summoner);assert.equal(summoner.runeBonus.poisonMin,0);const minion={owner:summoner,runeBonus:{...summoner.summonBonuses},x:100,y:226,hp:100};target.poison=null;r.activate(summoner,target,'poison',null,minion);assert.equal(target.poison.amount,3);assert.equal(target.poison.time,2);
 r.get().completed.push('a12');assert.ok(r.unlockedNodes().has('enchanter'));r.travel('enchanter');assert.ok(r.shopStock().every(w=>w.type==='enchantment'&&w.sourceArea===12));r.get().completed.push('a0');r.setGold(10000);assert.ok(r.buyRune('enchantment-poison-1'));r.save();assert.equal(harness(run.storage).t.get().currentNode,'enchanter');
 assert.equal(r.WORLD.filter(n=>n.kind==='enchanter').length,6);for(const n of r.WORLD)for(const id of n.next)assert.ok(r.WORLD.some(v=>v.id===id),'Map link resolves');
 console.log('Enchantment scaling, prices, poison/fire ticks and durations, additive cold, freeze boss resistance, summon inheritance and gated Enchanter save/load pass.');
}

{
 const {t:r}=harness();r.start();const h=r.get().heroes[0];r.get().heroes.forEach(hero=>hero.level=100);
 for(const [first,second] of [['rune-might','rune-might-3'],['gem-ruby-1','gem-ruby-4'],['rune-leech','soul-leech-2'],['enchantment-fire-1','enchantment-fire-3'],['rune-fire-ward-1','rune-fire-ward-2']]){
  h.runes=[first,null];r.setItem(0,second);const from={type:'bag',index:0},other={type:'rune1',index:0},same={type:'rune0',index:0};
  assert.equal(r.canMoveItem(from,other),false);assert.equal(r.moveItem(from,other),false);assert.equal(r.get().inventory[0],second);assert.equal(h.runes[1],null);
  assert.ok(r.canMoveItem(from,same),'Can upgrade existing socket');assert.ok(r.moveItem(from,same));assert.equal(h.runes[0],second);assert.equal(r.get().inventory[0],null);
  r.setItem(0,second);assert.equal(r.moveItem(from,other),false,'Identical item blocked too');
  assert.ok(r.canMoveItem(from,{type:'rune0',index:1}),'Different weapon remains allowed');
 }
 h.runes=['rune-fire-ward-1',null];r.setItem(0,'rune-ice-ward-1');assert.ok(r.moveItem({type:'bag',index:0},{type:'rune1',index:0}),'Different elemental wards are distinct');
 h.runes=['enchantment-fire-1',null];r.setItem(0,'enchantment-fire-time-1');assert.ok(r.moveItem({type:'bag',index:0},{type:'rune1',index:0}),'Damage and duration are distinct');
 console.log('Duplicate socket families blocked across tiers and legacy soul IDs; replacement, other weapons and distinct elemental types remain allowed.');
}

{
 const run=harness(),r=run.t;r.startTown();r.setGold(0);r.setItem(0,'0-fire');r.get().inventoryRunes[0]=['rune-might','gem-ruby-1'];r.setItem(1,'enchantment-fire-1');
 const event=(type,index)=>({target:{closest:selector=>selector==='[data-slot]'?{dataset:{slot:type,index:String(index)}}:null,matches:()=>false}});
 run.elements.get('#sell-item').onclick();assert.equal(r.get().sellMode,true);assert.equal(run.elements.get('#item-hint').textContent,'SELL MODE');
 const weapon=r.get().heroes[0].weapon;run.events['#app:click'](event('gear',0));assert.equal(r.get().heroes[0].weapon,weapon);
 run.events['#app:mouseover'](event('bag',0));assert.match(run.elements.get('#item-name').textContent,/Sell .* gold/);
 run.events['#app:click'](event('bag',0));run.events['#app:click'](event('bag',1));assert.equal(r.get().inventory[0],null);assert.equal(r.get().inventory[1],null);assert.equal(r.get().buybackItems.length,2);assert.equal(r.get().sellMode,true);
 const gold=r.get().gold,price=r.get().buybackItems[1].price;r.setGold(0);assert.equal(r.buyBack(1),false);r.setGold(gold);assert.ok(r.buyBack(1));assert.equal(r.get().gold,gold-price);assert.equal(r.get().inventory[0],'0-fire');assert.equal(r.get().inventoryRunes[0].join(','),'rune-might,gem-ruby-1');assert.equal(r.buyBack(1),false);
 for(let i=0;i<15;i++)r.setItem(i,'0-basic');assert.equal(r.buyBack(0),false);r.setItem(14,null);
 run.events.keydown({key:'Escape',target:{matches:()=>false}});assert.equal(r.get().sellMode,false);r.save();const reload=harness(run.storage).t;assert.equal(reload.get().buybackItems.length,1);assert.equal(reload.get().sellMode,false);
 r.toggleSellMode();r.openMap();assert.equal(r.get().sellMode,false);assert.equal(r.sellItem(0),false);assert.equal(r.buyBack(0),false);
 r.startTown();assert.equal(r.get().buybackItems.length,0,'New party does not inherit buyback');
 console.log('One-click sell mode, hover prices, equipped-item protection, exact socket buyback, gold/space guards, persistence and mode exits pass.');
}

{
 for(const classId of [0]){
  const {t:r}=harness();r.start();r.setParty([classId,0,0,0]);r.setStage(1);r.enter();const h=r.get().heroes[0];r.get().heroes.slice(1).forEach(v=>v.hp=0);h.y=207;h.vx=h.vy=h.drive=0;h.cooldown=0;
  const e=r.enemy('slime',325);e.y=226;e.hp=10000;e.frozen=100;r.get().enemies.length=0;r.get().enemies.push(e);
  let blocked=false;for(let x=260;x<310;x++){h.x=x;if(r.meleeDistance(h,e)<=h.range&&!r.meleeCanConnect(h,e)){blocked=true;break;}}assert.ok(blocked,'Reproduce nominal range with unreachable swing');
  const start=h.x;r.update(.016);assert.equal(h.strike,null,'Does not swing from unreachable ledge position');assert.ok(h.drive>0,'Approaches a reachable position');
  for(let i=0;i<150;i++)r.update(.016);assert.ok(h.x>start);assert.ok(e.hp<10000,'Weapon connects after repositioning');
 }
 const {t:r}=harness();r.start();const h=r.get().heroes[0];h.x=294;h.y=207;r.setStage(1);const e=r.enemy('slime',325);e.y=226;r.get().enemies.length=0;r.get().enemies.push(e);r.setAutoMove(0,false);h.drive=h.vx=h.vy=0;r.update(.016);assert.equal(h.drive,0,'Manual movement setting remains respected');
 console.log('Warrior repositions from unreachable ledge swings, lands real weapon hits, and respects manual movement.');
}
