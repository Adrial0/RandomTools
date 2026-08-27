const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.join(__dirname,'..');
const resources=JSON.parse(fs.readFileSync(path.join(root,'data/resources.json'),'utf8'));
const sourceRecipes=JSON.parse(fs.readFileSync(path.join(root,'data/recipes.json'),'utf8'));
const tiers={};Object.entries(resources.tierGroups).forEach(([tier,keys])=>keys.forEach(k=>tiers[k]=Number(tier)));
let nextId=100;
const domElements=new Map();
const fakeElement=()=>({innerHTML:'',textContent:'',value:'',style:{},classList:{toggle:()=>{}}});
const context={
  console,Math,Date,
  recipeFilter:'all',recipeCraftableOnly:false,expandedRecipes:new Set(),expandedRecipeCategories:new Set(['I · Copper']),TIER_IDENTITIES:{1:'Copper',2:'Iron'},
  recipes:structuredClone(sourceRecipes),RESOURCE_NAMES:Object.fromEntries(Object.entries(resources.resources).map(([k,v])=>[k,v.name])),
  RESOURCE_TIERS:tiers,BOSS_RESOURCES:new Set(),RUNES:{},MEALS:{},rar:['Common','Uncommon','Rare','Epic','Legendary','Mythic'],
  s:null,pick:a=>a[0],clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),id:()=>nextId++,resourceTier:k=>tiers[k]||1,
  armorProfile:name=>({armorClass:/Plate|Mail|Shield/i.test(name)?'Heavy':/Leather|Hide/i.test(name)?'Medium':'Light'}),
  log:()=>{},save:()=>{},render:()=>{},renderRoster:()=>{},notify:()=>{},displayClass:h=>h.class||'Adventurer',showModal:()=>{},
  itemRarity:()=> 'Common',runeTier:()=>1,makeSpecificItem:()=>({}),applyRecipeModifiers:()=>{},receiveInventoryItem:()=>{},trackQuestProgress:()=>{},
  addStoredResource:()=>1,recipePreview:r=>({profile:[r[1]],stats:[]}),maxCraftQuantity:()=>99,professionRecipeKnown:()=>true,
  gameIcon:()=>'',itemIcons:{},WEAPONS:{},recipeTypeLabel:r=>r[1],tierLabel:t=>String(t),fmt:()=>'',colorizeStatTerms:()=>{},matHtml:()=>'',
  runeIcon:()=>'',runeSlots:()=>0,openRuneSocketItem:()=>{},openRuneSocketItem:()=>{},openRuneSocketItem:()=>{},
  $:id=>{if(!domElements.has(id))domElements.set(id,fakeElement());return domElements.get(id)},document:{querySelectorAll:()=>[]},setTimeout
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
context.s.members[0].busy=true;
assert.equal(vm.runInContext("professionWorkerAvailable('smithing')",context),false,'idle workstation cannot start work while its assigned specialist is away');
context.s.members[0].busy=false;
context.s.professions.smithing.jobs.push({id:3,kind:'recipe',recipe:0,qty:1,remaining:1,start:Date.now(),end:Date.now()+1000,duration:1000,effects:{}});
vm.runInContext("syncProfessionBusy('smithing')",context);
assert.equal(context.s.members[0].busy,true,'worker becomes busy while workstation has queued work');
assert.equal(vm.runInContext("professionWorkerAvailable('smithing')",context),true,'active specialist may accept additional queued work at the same station');
context.s.professions.smithing.jobs.length=0;
vm.runInContext("syncProfessionBusy('smithing')",context);
assert.equal(context.s.members[0].busy,false,'worker is released when workstation queue empties');

Object.keys(resources.resources).forEach(k=>context.s.materials[k]=9999);
const smithRecipeIndex=context.recipes.findIndex(r=>r[5]?.profession==='smithing'&&r[1]==='Weapon');
const collapsed=vm.runInContext(`renderProfessionRecipe(recipes[${smithRecipeIndex}],${smithRecipeIndex})`,context);
assert.doesNotMatch(collapsed,/recipeLineDetails/,'recipe details are not rendered before the row is expanded');
vm.runInContext(`expandedRecipes.add('recipe:${smithRecipeIndex}')`,context);
const expanded=vm.runInContext(`renderProfessionRecipe(recipes[${smithRecipeIndex}],${smithRecipeIndex})`,context);
assert.match(expanded,/recipeLineDetails/,'click-expanded recipe renders its details');

context.s.professions.smithing.level=100;context.s.members[0].busy=false;
for(let tier=1;tier<=10;tier++)context.expandedRecipeCategories.add(`${tier} · ${context.TIER_IDENTITIES[tier]||'Masterwork'}`);
vm.runInContext("renderProfessionRecipe=(r,i)=>r[0]; recipeFilter='Armor'; renderCraft()",context);
const filteredHtml=domElements.get('recipeList').innerHTML;
assert.doesNotMatch(filteredHtml,/Longsword|Greatsword|Battle Axe/,'Armor filter removes weapon recipes from rendered results');
assert.match(filteredHtml,/Plate|Mail|Shield/,'Armor filter keeps Smithing armor recipes');

const uiSource=fs.readFileSync(path.join(root,'js/ui.js'),'utf8');
assert.match(uiSource,/Skills & Passives[\s\S]*Profession Affinity/,'roster stats show profession affinity in Skills & Passives');
assert.match(uiSource,/function recruitDetail[\s\S]*Profession Affinity/,'applicant detail shows profession affinity before recruitment');

assert.equal(vm.runInContext("professionTierIdentity('smithing',2)",context),'Iron');
assert.equal(vm.runInContext("professionTierIdentity('woodworking',2)",context),'Hardwood');
assert.equal(vm.runInContext("professionTierIdentity('tailoring',2)",context),'Linen');
assert.equal(vm.runInContext("professionTierIdentity('leatherworking',2)",context),'Wolf Leather');
assert.equal(vm.runInContext("professionTierIdentity('cooking',2)",context),'Wolf & Herb');
assert.equal(vm.runInContext("professionTierIdentity('runecrafting',2)",context),'Venom');

console.log('Profession model, recipe split, processing chains, migration, and busy-state tests passed.');
