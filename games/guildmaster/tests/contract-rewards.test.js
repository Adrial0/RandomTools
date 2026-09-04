const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','js','activities.js'),'utf8');

assert.match(source,/function questGuildTier\(\)[\s\S]*unlockedCraftingTier/,'contracts use expedition tier progression instead of Guild Level bands');
assert.match(source,/base=200\*Math\.pow\(1\.65,tier-1\)\+\(s\.level\|\|1\)\*30/,'contract gold is primarily geometric by objective tier');
assert.match(source,/questRewardFor\(diff,kind,obj\.tier\)/,'each contract pays for its actual objective tier');
assert.match(source,/x\.r\[4\]<=tier/,'contract equipment rewards cannot jump ahead of the objective tier');
assert.match(source,/tier:harvestAreaTier\(a\)/,'gathering contracts record their content tier');
assert.match(source,/tier:area\.tier\|\|1/,'kill contracts record their expedition tier');
assert.match(source,/tier:chosen\.r\[4\]\|\|1/,'crafting contracts record their recipe tier');
assert.match(source,/tier:meal\.tier\|\|1/,'cooking contracts record their meal tier');
assert.match(source,/contractRewardVersion!==2/,'existing boards regenerate once under the new economy');
console.log('Tier-driven contract objective, reward, and migration tests passed.');
