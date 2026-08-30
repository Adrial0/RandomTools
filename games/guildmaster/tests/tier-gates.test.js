const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const areas=JSON.parse(fs.readFileSync(path.join(root,'data/areas/expeditions.json'),'utf8'));
const enemies=JSON.parse(fs.readFileSync(path.join(root,'data/enemies.json'),'utf8'));
const core=fs.readFileSync(path.join(root,'js/core.js'),'utf8');
const activities=fs.readFileSync(path.join(root,'js/activities.js'),'utf8');
const combat=fs.readFileSync(path.join(root,'js/combat.js'),'utf8');

for(let tier=1;tier<=10;tier++){
  const chapter=areas.filter(area=>area.tier===tier);
  assert.strictEqual(chapter.length,3,`tier ${tier} should contain two areas and one gate boss`);
  const gates=chapter.filter(area=>area.bossGate);
  assert.strictEqual(gates.length,1,`tier ${tier} should have exactly one gate boss`);
  assert.strictEqual(gates[0].gateTier,tier);
  assert.ok(enemies[gates[0].boss],`missing enemy definition for ${gates[0].boss}`);
  assert.strictEqual(enemies[gates[0].boss].boss,true,`${gates[0].boss} is not registered as a boss`);
}

assert.match(core,/expeditionGates:\[\]/,'new saves need expedition gate progress');
assert.match(core,/expeditionClears:\[\]/,'new saves need per-area clear progress');
assert.match(activities,/function expeditionAreaUnlocked\(/,'expedition cards use sequential area unlocks');
assert.match(activities,/previous\.bossGate.*s\.expeditionGates/s,'a new tier still requires the preceding tier boss');
assert.match(activities,/s\.expeditionClears.*previous\.areaId/s,'later areas and gate bosses require the preceding area clear');
assert.match(activities,/function harvestAreaUnlocked\(area\)[\s\S]*expeditionGates[\s\S]*tier-1/,'gathering tiers require the previous expedition tier clear');
assert.match(activities,/openHarvestPicker\(areaId\)[\s\S]*!harvestAreaUnlocked\(a\)/,'locked gathering areas cannot be opened through the UI');
assert.match(activities,/confirmHarvestParty\(areaId\)[\s\S]*!harvestAreaUnlocked\(a\)/,'locked gathering areas cannot be started indirectly');
assert.match(activities,/processHarvesting\(\)[\s\S]*!harvestAreaUnlocked\(area\)[\s\S]*progressLocked=true/,'legacy gathering jobs pause if their expedition tier is locked');
assert.match(combat,/s\.expeditionGates\.push\(m\.gateTier\)/,'boss victories must persist tier unlocks');
assert.match(core,/function expeditionPartySize\(\)\{[\s\S]*return 3\+clearedTiers\.size/,'expedition parties start at three and gain slots from the first five tier-boss clears');
assert.doesNotMatch(core,/\['party','Expedition Logistics'/,'Expedition Logistics is no longer a purchasable guild upgrade');
assert.match(combat,/Expedition party capacity increased to/,'tier boss victory presentation announces party-capacity unlocks');
assert.match(combat,/if\(m\.bossGate\)return;/,'offline progress must not bypass story bosses');
assert.match(combat,/mission\.battle=mission\.bossGate\?makeBossBattle\(mission\):makeBattle\(mission\)/,'gate expeditions must begin directly in the boss encounter');

console.log('Expedition tier gate tests passed.');
