const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const core=fs.readFileSync(path.join(root,'js','core.js'),'utf8');
const progression=fs.readFileSync(path.join(root,'js','progression.js'),'utf8');
const economy=fs.readFileSync(path.join(root,'js','economy.js'),'utf8');

for(const cls of ['Warrior','Paladin','Ranger','Rogue','Mage','Priest'])assert.match(core,new RegExp(`${cls}:\\{name:`),`${cls} has an authored starter weapon`);
assert.match(core,/Ranger:\{name:'Crude Shortbow',template:'Shortbow',power:5\}/,'two-handed Ranger starter is normalized for its doubled effective damage');
assert.match(core,/function ensureStarterWeapon[\s\S]*s\.inventory\.push\(starter\)/,'starter weapon is automatically equipped through the shared item system');
assert.match(core,/s\.members\.forEach\(ensureStarterWeapon\)/,'existing unarmed members migrate to starter equipment');
assert.match(progression,/s\.members\.push\(x\);ensureStarterWeapon\(x\)/,'new recruits arrive with starter equipment');
assert.match(progression,/conflict\?\.starter[\s\S]*s\.inventory=s\.inventory\.filter/,'equipping a real weapon removes the replaced starter');
assert.match(economy,/!it\.starter&&\(inventoryShowEquipped/,'starter equipment is excluded from the inventory list');
assert.match(economy,/if\(it\?\.starter\)return 0/,'starter equipment has no sale value');
assert.match(economy,/Starter equipment cannot be scrapped/,'starter equipment cannot be scrapped');
console.log('Class starter equipment, replacement, migration, and inventory exclusion tests passed.');
