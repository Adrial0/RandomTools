const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.join(__dirname,'..');
const resources=JSON.parse(fs.readFileSync(path.join(root,'data/resources.json'),'utf8'));
const sourceRecipes=JSON.parse(fs.readFileSync(path.join(root,'data/recipes.json'),'utf8'));
const tiers={};Object.entries(resources.tierGroups).forEach(([tier,keys])=>keys.forEach(k=>tiers[k]=Number(tier)));
let nextId=100;
const context={
  console,Math,Date,
  recipes:structuredClone(sourceRecipes),RESOURCE_NAMES:Object.fromEntries(Object.entries(resources.resources).map(([k,v])=>[k,v.name])),
  RESOURCE_TIERS:tiers,BOSS_RESOURCES:new Set(),RUNES:{},MEALS:{},rar:['Common','Uncommon','Rare','Epic','Legendary','Mythic'],
  s:null,pick:a=>a[0],clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),id:()=>nextId++,resourceTier:k=>tiers[k]||1,
  armorProfile:name=>({armorClass:/Plate|Mail|Shield/i.test(name)?'Heavy':/Leather|Hide/i.test(name)?'Medium':'Light'}),
  log:()=>{},save:()=>{},render:()=>{},renderRoster:()=>{},notify:()=>{},displayClass:h=>h.class||'Adventurer',showModal:()=>{},
  itemRarity:()=> 'Common',runeTier:()=>1,makeSpecificItem:()=>({}),applyRecipeModifiers:()=>{},receiveInventoryItem:()=>{},trackQuestProgress:()=>{},
  addStoredResource:()=>1,recipePreview:r=>({profile:[r[1]],stats:[]}),maxCraftQuantity:()=>99,professionRecipeKnown:()=>true,
  gameIcon:()=>'',itemIcons:{},WEAPONS:{},tierLabel:t=>String(t),fmt:()=>'',colorizeStatTerms:()=>{},matHtml:()=>'',
  runeIcon:()=>'',runeSlots:()=>0,openRuneSocketItem:()=>{},openRuneSocketItem:()=>{},openRuneSocketItem:()=>{},
  $:()=>({innerHTML:'',textContent:'',style:{}}),setTimeout
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/professions.js'),'utf8'),context);

vm.runInContext('prepareProfessionRecipes()',context);
assert.equal(vm.runInContext("recipeProfession(['Oak Bow','Weapon','Bow',{Wood:2},1,{}])",context),'woodworking');
assert.equal(vm.runInContext("recipeProfession(['Field Robes','Armor','Robes',{Cloth:2},1,{armorClass:'Light'}])",context),'tailoring');
assert.equal(vm.runInContext("recipeProfession(['Hide Jerkin','Armor','Leathers',{Leather:2},1,{armorClass:'Medium'}])",context),'leatherworking');
assert.equal(vm.runInContext("recipeProfession(['Iron Plate','Armor','Plate',{Iron:2},2,{armorClass:'Heavy'}])",context),'smithing');

for(const output of ['CopperBar','IronBar','EterniumBar','WoodenPlank','WorldrootPlank','CuredLeather','FrostLeather']){
  assert.ok(context.recipes.some(r=>r[5]?.outputResource===output),output+' has a processing recipe');
}
const ironWeapon=context.recipes.find(r=>r[1]==='Weapon'&&r[3]?.IronBar);
assert.ok(ironWeapon,'Smithing recipes consume smelted bars');
const woodenWeapon=context.recipes.find(r=>r[1]==='Weapon'&&r[5]?.profession==='woodworking'&&Object.keys(r[3]).some(k=>k.endsWith('Plank')));
assert.ok(woodenWeapon,'Woodworking weapons consume processed planks');

context.s={
  professions:{},smithing:{level:8,xp:17},cooking:{level:4,xp:9},craftJobs:[],cookingJobs:[],
  members:[{id:1,name:'Ada Forge',class:'Warrior',busy:false}],recruits:[],materials:{},discoveredResources:[],up:{craftSpeed:0,smith:0},inventory:[],runes:{},meals:{},next:2
};
vm.runInContext('normalizeProfessionState()',context);
assert.equal(context.s.professions.smithing.level,8,'legacy Smithing level migrated');
assert.equal(context.s.professions.cooking.level,4,'legacy Cooking level migrated');
assert.ok(context.s.members[0].professionTrait,'existing member received deterministic profession affinity');
vm.runInContext("assignProfessionWorker('smithing',1)",context);
assert.equal(context.s.professions.smithing.workerId,1,'worker assignment persisted');
assert.equal(context.s.members[0].busy,false,'idle assigned worker remains mission-available');
context.s.professions.smithing.jobs.push({id:3,kind:'recipe',recipe:0,qty:1,remaining:1,start:Date.now(),end:Date.now()+1000,duration:1000,effects:{}});
vm.runInContext("syncProfessionBusy('smithing')",context);
assert.equal(context.s.members[0].busy,true,'worker becomes busy while workstation has queued work');
context.s.professions.smithing.jobs.length=0;
vm.runInContext("syncProfessionBusy('smithing')",context);
assert.equal(context.s.members[0].busy,false,'worker is released when workstation queue empties');

console.log('Profession model, recipe split, processing chains, migration, and busy-state tests passed.');
