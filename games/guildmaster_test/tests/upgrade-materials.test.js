const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const context={console,Math,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),upgrades:[['smith','Smithing','',320,5],['board','Board','',310,5]]};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','progression.js'),'utf8'),context);

const expected={
  CopperOre:'CopperBar',Iron:'IronBar',Silver:'SilverBar',Mithril:'MithrilBar',StarMetal:'StarMetalBar',CinderOre:'CinderBar',Voidstone:'VoidBar',Adamantite:'AdamantiteBar',Orichalcum:'OrichalcumBar',Eternium:'EterniumBar',
  Wood:'WoodenPlank',Hardwood:'HardwoodPlank',Ironwood:'IronwoodPlank',SpiritBark:'SpiritwoodPlank',Dreamwood:'DreamwoodPlank',Worldroot:'WorldrootPlank',
  Leather:'CuredLeather',WolfPelt:'WolfLeather',WhitePelt:'FrostLeather',Stormhide:'StormLeather'
};
for(const [raw,processed] of Object.entries(expected))assert.equal(vm.runInContext(`upgradeProcessedResource('${raw}')`,context),processed,`${raw} upgrade costs use ${processed}`);
assert.equal(vm.runInContext("upgradeProcessedResource('Crystal')",context),'Crystal','resources without a processing recipe remain unchanged');
assert.equal(JSON.stringify(vm.runInContext("upgradeResourceCost('smith',0)",context)),JSON.stringify({CopperOre:15}),'first upgrade uses the raw tier-I material');
assert.ok(Object.hasOwn(vm.runInContext("upgradeResourceCost('board',0)",context),'PlantFiber'),'first textile-based upgrade uses raw plant fiber rather than processed cloth');
assert.ok(Object.keys(vm.runInContext("upgradeResourceCost('smith',1)",context)).some(k=>k.endsWith('Bar')),'later upgrades use processed metal');
assert.equal(vm.runInContext("upgradeCost(['test','','',400,5],0)",context),200,'initial gold cost is halved');

const activities=fs.readFileSync(path.join(__dirname,'..','js','activities.js'),'utf8');
assert.match(activities,/const caps=\[200,1000,3000,8000,16000,26000,40000,60000,90000,130000,200000\]/,'resource inventory capacities are doubled');

console.log('Upgrade processed-material tests passed.');
