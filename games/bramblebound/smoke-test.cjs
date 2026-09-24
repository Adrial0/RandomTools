const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},context=new Proxy({},{get:()=>noop,set:()=>true});
function harness(saved={}){
 const elements=new Map(),choices=[0,2,3,4].map(value=>({value:String(value)}));
 const element=()=>({style:{},classList:{add:noop,remove:noop},hidden:false,textContent:'',innerHTML:'',addEventListener:noop,setAttribute:noop,getContext:()=>context});
 const document={querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(s){return s==='#choices select'?choices:[]}};
 let seed=13;const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const storage={...saved};const sandbox={document,Math:math,window:{addEventListener:noop},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},requestAnimationFrame:noop,setTimeout:noop,console};
 vm.runInNewContext(fs.readFileSync(__dirname+'/gear.js','utf8'),sandbox);
 const src=fs.readFileSync(__dirname+'/game.js','utf8').replace(/\}\)\(\);\s*$/,`globalThis.test={start,update,damage,xp,equip,enter,load,save,stats,allocate,select,moveItem,attackToken,basicHit,activate,tickEffects,enemy,shoot,get:()=>({heroes,enemies,area,state,inventory,fields,shots}),setArea:n=>area=n,setItem:(i,id)=>inventory[i]=id,setParty:ids=>heroes=ids.map(hero),items:ITEMS,effects:EFFECTS};})();`);
 vm.runInNewContext(src,sandbox);return {t:sandbox.test,storage,choices};
}
const {t,storage,choices}=harness();
choices.forEach(c=>c.value='1');t.start();assert.ok(t.get().heroes.every(h=>h.classId===1));
assert.equal(t.get().enemies.length,4);for(let i=0;i<100;i++)t.update(.02);assert.equal(t.get().enemies.length,4,'No timed spawning');
t.xp(45);assert.ok(t.get().heroes.every(h=>h.level===2&&h.sp===1));t.select(0);assert.ok(t.allocate('int'));assert.equal(t.get().heroes[0].int,1);assert.equal(t.allocate('int'),false,'Cannot spend without SP');
t.xp(65);assert.ok(t.allocate('int'));let h=t.get().heroes[0];assert.equal(h.int,2);
t.setItem(0,'1-fire');assert.ok(t.equip(0));assert.equal(h.weapon,'1-fire');assert.equal(t.get().inventory[0],'1-basic','Equipping swaps original into inventory');
let victim=t.get().enemies[0];victim.hp=victim.maxHp=10000;
for(let i=1;i<=4;i++){t.basicHit(victim,1,t.attackToken(h));assert.equal(h.mp,i*2);assert.equal(t.get().fields.length,0)}
t.basicHit(victim,1,t.attackToken(h));assert.equal(h.mp,0);assert.equal(t.get().fields.length,1,'2 INT / 10 MP fires on fifth landed hit');
t.tickEffects(.05);assert.equal(h.mp,0,'Ability damage does not generate MP');
const token=t.attackToken(h);t.basicHit(victim,1,token);t.basicHit(victim,1,token);assert.equal(h.mp,2,'Multiple targets charge only once per basic attack');
const inFlight=t.attackToken(h);assert.ok(t.moveItem({type:'gear',index:0},{type:'bag',index:3}));assert.equal(h.weapon,null);assert.equal(h.mp,0);t.basicHit(victim,1,inFlight);assert.equal(h.mp,0,'Old projectile cannot charge new equipment');assert.equal(t.get().inventory[3],'1-fire');
assert.ok(t.moveItem({type:'bag',index:3},{type:'gear',index:0}));assert.equal(h.weapon,'1-fire');assert.equal(t.get().inventory[3],null);
t.setItem(4,'2-poison');assert.equal(t.moveItem({type:'bag',index:4},{type:'gear',index:0}),false,'Wrong class rejected atomically');assert.equal(t.get().inventory[4],'2-poison');assert.equal(h.weapon,'1-fire');
t.setItem(5,'1-steel');assert.ok(t.equip(5));assert.equal(h.weapon,'1-steel');t.setItem(6,'1-ice');assert.ok(t.moveItem({type:'bag',index:6},{type:'bag',index:5}));assert.equal(t.get().inventory[5],'1-ice');
// Class-specific stat effects.
for(let c=0;c<8;c++){t.setParty([c,c,c,c]);const p=t.get().heroes[0];const before={max:p.atMax,min:p.atMin,range:p.range,agi:p.agi[0]};p.attributes.str++;t.stats(p);if(c===0)assert.equal(p.atMax,before.max+1);if(c===2||c===3)assert.equal(p.range,before.range+2);p.attributes.int=2;t.stats(p);assert.equal(p.int,2)}
assert.ok(t.items['0-heavy'].max>t.items['0-lightning'].max,'Physical sword can outdamage elemental sword');
// Freeze/slow, poison, lightning, heal, drain, stun all execute actual gameplay effects.
t.setParty([0,2,3,4]);t.setArea(0);t.enter();h=t.get().heroes[0];victim=t.get().enemies[0];victim.hp=victim.maxHp=10000;t.activate(h,victim,'ice');assert.ok(victim.frozen>0);t.tickEffects(.8);assert.equal(victim.frozen,0);assert.ok(victim.slow>0);
t.activate(h,victim,'poison');const beforePoison=victim.hp;t.tickEffects(1);assert.ok(victim.hp<beforePoison);const hp=victim.hp;t.activate(h,victim,'lightning');assert.ok(victim.hp<hp);h.hp=10;t.activate(h,victim,'heal');assert.ok(h.hp>10);const beforeDrain=h.hp;t.activate(h,victim,'drain');assert.ok(h.hp>beforeDrain);t.activate(h,victim,'stun');assert.ok(victim.stun>0);
// Killing hit still charges. No charge for attacks on already dead targets.
h.weapon='0-fire';h.attributes.int=2;t.stats(h);h.mp=0;victim.hp=1;t.basicHit(victim,10,t.attackToken(h));assert.equal(h.mp,2);t.basicHit(victim,10,t.attackToken(h));assert.equal(h.mp,2);
t.get().enemies.slice().forEach(e=>t.damage(e,99999));t.update(.01);assert.equal(t.get().state,'walk');assert.equal(t.get().area,0);for(let i=0;i<1600&&t.get().area===0;i++)t.update(.02);assert.equal(t.get().area,1);
t.setArea(4);t.enter();const summoner=t.get().enemies.find(e=>e.type==='summoner');const count=t.get().enemies.length;summoner.summon=0;t.update(.01);assert.equal(t.get().enemies.length,count+1);
t.get().heroes.forEach(h=>h.hp=0);t.update(.01);assert.equal(t.get().state,'lost');
// Opening party still wins and earns unspent points without automatic spending.
t.setArea(0);t.setParty([0,2,3,4]);t.enter();for(let i=0;i<20000&&t.get().area===0&&t.get().state!=='lost';i++)t.update(.02);assert.equal(t.get().area,1);assert.ok(t.get().heroes.every(h=>h.sp>0&&h.int===0));
t.select(0);t.allocate('int');t.setItem(0,'0-fire');t.equip(0);t.get().heroes[0].mp=3;t.save();const reloaded=harness(storage).t.get();assert.equal(reloaded.heroes[0].weapon,'0-fire');assert.equal(reloaded.heroes[0].int,1);assert.equal(reloaded.heroes[0].mp,3);assert.equal(reloaded.inventory.length,15);
const old={area:3,gold:99,inventory:[1,2],heroes:[0,2,3,4].map(classId=>({classId,level:5,xp:2,weapon:2}))};const migrated=harness({'bramblebound-v2':JSON.stringify(old)}).t.get();assert.equal(migrated.heroes[0].sp,4);assert.equal(migrated.heroes[0].weapon,'0-iron');assert.equal(migrated.area,3);

// No charging with zero INT; minimum level restrictions leave both slots intact.
const isolated=harness().t;isolated.start();let fighter=isolated.get().heroes[0];isolated.setItem(0,'0-steel');assert.equal(isolated.equip(0),false);assert.equal(fighter.weapon,'0-basic');assert.equal(isolated.get().inventory[0],'0-steel');
isolated.setItem(1,'0-fire');isolated.equip(1);let dummy=isolated.get().enemies[0];dummy.hp=dummy.maxHp=10000;isolated.basicHit(dummy,1,isolated.attackToken(fighter));assert.equal(fighter.mp,0);
// Ten fire pulses regardless of coarse simulation steps, without proc recursion.
isolated.activate(fighter,dummy,'fire');let field=isolated.get().fields[0];const fireStart=dummy.hp,fireAmount=field.amount;for(let i=0;i<11;i++)isolated.tickEffects(.1);assert.equal(dummy.hp,fireStart-fireAmount*10);assert.equal(fighter.mp,0);assert.equal(isolated.get().fields.length,0);
// A launched projectile earns nothing until it actually lands.
fighter.attributes.int=2;isolated.stats(fighter);dummy.x=fighter.x+100;dummy.y=fighter.y;isolated.get().heroes.forEach(h=>h.cooldown=10);isolated.get().enemies.forEach(e=>e.cooldown=10);isolated.shoot(fighter,dummy,'arrow',1,isolated.attackToken(fighter));isolated.update(.01);assert.equal(fighter.mp,0);for(let i=0;i<80;i++)isolated.update(.01);assert.equal(fighter.mp,2);
// Cancelling an attack because the victim was already dead yields no MP.
const discarded=isolated.attackToken(fighter);dummy.hp=0;isolated.shoot(fighter,dummy,'arrow',1,discarded);isolated.update(.01);assert.equal(fighter.mp,2);
console.log('PASS: XP/SP allocation, class scaling, fifth-hit proc, proc recursion guard, killing hit, stale projectiles, equipment swaps/unequip/rejection, all 7 abilities, fixed encounters/exits, save reload and v2 migration.');
