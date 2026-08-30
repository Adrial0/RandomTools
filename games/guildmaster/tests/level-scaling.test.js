const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const core=fs.readFileSync(path.join(root,'js','core.js'),'utf8');
const combat=fs.readFileSync(path.join(root,'js','combat.js'),'utf8');

assert.match(core,/const CLASS_LEVEL_GROWTH=/,'class growth has one shared definition');
assert.match(core,/function naturalHeroBonus\(h\)/,'natural stats are derived from class, trait, and level');
assert.match(core,/value\*levels/,'natural stat growth accounts for every prior level');
assert.match(core,/recruit\.bonus=naturalHeroBonus\(recruit\)/,'higher-level recruits receive their complete natural growth');
assert.match(core,/return syncNaturalHeroBonus\(h\)/,'existing members migrate to deterministic natural growth');
assert.match(core,/s\.recruits=.*syncNaturalHeroBonus\(h\)/,'saved applicants migrate to deterministic natural growth');
assert.match(combat,/hero\.level\+\+;\s*syncNaturalHeroBonus\(hero\)/,'level-ups use the same deterministic growth calculation');
assert.match(combat,/hpScale=1\.12\+Math\.max\(0,level-1\)\*\.20/,'enemy health retains level-one balance and scales faster thereafter');
assert.match(combat,/const atk=Math\.round\(\(tpl\.baseAttack\|\|12\)\*scale/,'enemy attack retains the gentler original scaling');
assert.match(combat,/Math\.min\(\.40,gap\*\.03\)/,'underlevelled parties face a capped three-percent-per-level enemy modifier');
assert.match(combat,/EXPEDITION_STAGE_SIZE\)\)\*\.07/,'each completed expedition stage adds seven percent enemy strength');
assert.match(combat,/partySize-1[\s\S]*return rnd\(minimum,maximum\)/,'later-tier enemy groups scale toward the party size');
assert.match(combat,/hpScale\*1\.15\*gapMult/,'dedicated bosses receive additional durability');
assert.match(combat,/champion\.maxHp\*3\.2/,'final area champions receive additional durability');

console.log('Deterministic hero growth and enemy durability scaling tests passed.');
