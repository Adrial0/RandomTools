const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const context={console,Math};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','progression.js'),'utf8'),context);

const expected={
  CopperOre:'CopperBar',Iron:'IronBar',Silver:'SilverBar',Mithril:'MithrilBar',StarMetal:'StarMetalBar',CinderOre:'CinderBar',Voidstone:'VoidBar',Adamantite:'AdamantiteBar',Orichalcum:'OrichalcumBar',Eternium:'EterniumBar',
  Wood:'WoodenPlank',Hardwood:'HardwoodPlank',Ironwood:'IronwoodPlank',SpiritBark:'SpiritwoodPlank',Dreamwood:'DreamwoodPlank',Worldroot:'WorldrootPlank',
  Leather:'CuredLeather',WolfPelt:'WolfLeather',WhitePelt:'FrostLeather',Stormhide:'StormLeather'
};
for(const [raw,processed] of Object.entries(expected))assert.equal(vm.runInContext(`upgradeProcessedResource('${raw}')`,context),processed,`${raw} upgrade costs use ${processed}`);
assert.equal(vm.runInContext("upgradeProcessedResource('Crystal')",context),'Crystal','resources without a processing recipe remain unchanged');

console.log('Upgrade processed-material tests passed.');
