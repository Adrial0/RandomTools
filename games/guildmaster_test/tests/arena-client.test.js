const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={
  console,Date,Math,Object,Array,String,Number,Set,
  document:{getElementById(){return null}},window:{},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  hs:()=>({power:123,hp:200,str:20,dex:10,int:5,def:30,mdef:15,block:2,threat:1.6,physicalDodge:.05,magicalDodge:.02,regen:1,lifesteal:0,fire:5,ice:4,poison:3,lightning:2,holy:1,dark:0,armorPen:.1,critBonus:.05,critDamage:.2,statusChance:.08,healMult:1,damageMult:1,attackSpeed:.1,activeType:'powerStrike',element:null}),
  weaponDefForItem:()=>({base:12}),weaponAttackTime:()=>2.5,heroAttackIntervalMs:()=>2250,
  s:{inventory:[{id:9,weaponPower:14,damageType:'physical',weaponType:'Longsword'}]}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../js/arena.js'),'utf8'),context);

const snapshot=context.arenaHeroSnapshot({id:1,name:'Arena Hero',class:'Warrior',subclass:'guardian',level:12,equip:{Weapon:9}});
assert.equal(snapshot.sourceId,1);
assert.equal(snapshot.maxHp,200);
assert.equal(snapshot.weaponPower,14);
assert.equal(snapshot.attackInterval,2250);
assert.equal(snapshot.activeType,'powerStrike');
assert.doesNotThrow(()=>JSON.stringify(snapshot),'Arena snapshots must be serializable');

const online=JSON.parse(fs.readFileSync(require.resolve('../data/online.json'),'utf8'));
assert.equal(online.enabled,false,'repository configuration stays disabled until project credentials are supplied');
assert.ok(!JSON.stringify(online).toLowerCase().includes('service_role'),'browser configuration must never contain a service-role key');

const migration=fs.readFileSync(require.resolve('../supabase/migrations/001_arena.sql'),'utf8');
for(const table of ['profiles','arena_parties','arena_ratings','arena_matches'])assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));
assert.match(migration,/revoke all on public\.profiles, public\.arena_parties, public\.arena_ratings, public\.arena_matches from anon, authenticated/);
assert.match(migration,/security definer/);
assert.match(migration,/request_id uuid not null unique/,'match requests must be idempotent');

console.log('Arena client and backend contract tests passed.');
