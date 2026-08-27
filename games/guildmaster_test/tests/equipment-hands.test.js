const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const core=fs.readFileSync(path.join(root,'js','core.js'),'utf8');
const progression=fs.readFileSync(path.join(root,'js','progression.js'),'utf8');
const combat=fs.readFileSync(path.join(root,'js','combat.js'),'utf8');
const arena=fs.readFileSync(path.join(root,'js','arena-client.js'),'utf8');
const recipes=require(path.join(root,'data','recipes.json'));

assert.match(core,/slots:\['MainHand','OffHand','Armor','Accessories'\]/,'classes expose both hand slots and accessories');
assert.match(core,/h\.equip\.MainHand=h\.equip\.Weapon\|\|null/,'legacy Weapon saves migrate to Main Hand');
assert.match(core,/weaponHands\(mainItem\)===2\)h\.equip\.OffHand=mainItem\.id/,'two-handed migration occupies both hands');
assert.match(progression,/function equipmentTargetsForItem/,'equipment targeting applies hand rules');
assert.match(progression,/if\(weaponHands\(it\)===2\)return\['MainHand'\]/,'two-handed weapons can only be equipped through Main Hand');
assert.match(progression,/out\.statusChance\+=it\.statusChance\|\|0/,'legacy and accessory status chance values are combined rather than overwritten');
assert.match(progression,/const value=decimalPercent\.has\(k\)\?raw\*100:raw/,'decimal combat percentages are converted for comparison display');
assert.doesNotMatch(progression,/Usable by \$\{it\.allowedClasses/,'item descriptions do not repeat class restrictions');
assert.match(combat,/const weapons=\[\{weaponType:h\.weaponType/,'hero basic attacks build a per-hand attack list');
assert.match(combat,/weapons\.forEach/,'each equipped weapon resolves its own hit');
assert.match(combat,/e\.arenaHero&&e\.dualWield&&e\.offhandWeapon/,'arena defenders also resolve an off-hand hit');
assert.match(arena,/offhandWeapon:off\?/,'arena snapshots retain off-hand weapon data');

const added=recipes.filter(r=>['OffHand','Accessories'].includes(r[1])&&r[5]?.allowedClasses);
assert.equal(added.filter(r=>r[1]==='OffHand'&&r[5].accessoryType==='Shield').length,3,'three shield tiers exist');
for(const type of ['Quiver','Arcane Focus','Holy Symbol','Rogue Toolkit','Banner']){
  assert.equal(added.filter(r=>r[5].accessoryType===type).length,3,`${type} has early, mid, and late-game recipes`);
}
assert.ok(added.every(r=>Array.isArray(r[5].allowedClasses)&&r[5].allowedClasses.length),'new class accessories declare their users');

console.log('Two-hand, dual-wield, migration, Arena, and accessory tests passed.');
