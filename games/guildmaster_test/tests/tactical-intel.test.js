const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const readJson=path=>JSON.parse(fs.readFileSync(require.resolve(path),'utf8'));
const context={console,Date,Math,Object,Array,String,Number,Set,document:{getElementById(){return null}}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../js/core.js'),'utf8'),context);

context.enemyData=readJson('../data/enemies.json');
context.archetypeData=readJson('../data/enemy-archetypes.json');
context.abilityData=readJson('../data/abilities.json');
vm.runInContext('Object.assign(ENEMIES_DATA,enemyData);Object.assign(ENEMY_ARCHETYPES_DATA,archetypeData);Object.assign(ENEMY_ABILITIES_DATA,abilityData);',context);
vm.runInContext(fs.readFileSync(require.resolve('../js/activities.js'),'utf8'),context);

const profile=context.enemyTacticalProfile('Moss Slime');
assert.equal(profile.role,'Bulwark');
assert.ok(profile.mechanics.includes('Casting'));
assert.ok(profile.mechanics.includes('Poison'));
assert.ok(profile.mechanics.includes('Protects allies'));
assert.ok(profile.counters.includes('Interrupt'));
assert.ok(profile.counters.includes('Cleanse'));
assert.ok(profile.counters.includes('Focus protector'));

const forest=readJson('../data/areas/expeditions.json')[0];
const intel=context.missionThreatIntel(forest,'quest');
assert.equal(intel.profiles.length,forest.enemyPool.length);
assert.ok(intel.damageTypes.includes('physical'));
assert.ok(intel.mechanics.includes('Casting'));
assert.ok(intel.drops.includes('Iron'));

for(const [id,archetype] of Object.entries(context.archetypeData)){
  assert.ok(archetype.tacticalRole,`${id} is missing a tactical role`);
  assert.ok(archetype.roleDescription,`${id} is missing a role description`);
  assert.ok(archetype.counter,`${id} is missing a counter recommendation`);
}

console.log('Tactical intelligence tests passed.');
