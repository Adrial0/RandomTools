// Shared workshop professions, workstation assignments, queues, and save migration.
const PROFESSION_ORDER=['smithing','smelting','woodworking','tailoring','leatherworking','cooking','runecrafting'];
const PROFESSION_DEFS={
  smithing:{name:'Smithing',icon:'⚒️',desc:'Forge metal weapons, heavy armor, shields, and jewelry.'},
  smelting:{name:'Smelting',icon:'🔥',desc:'Refine mined ore into bars used by Smithing.'},
  woodworking:{name:'Woodworking',icon:'🪚',desc:'Process timber and make bows, crossbows, staves, wands, spears, and wooden shields.'},
  tailoring:{name:'Tailoring',icon:'🧵',desc:'Weave gathered fibers and sew cloth armor.'},
  leatherworking:{name:'Leatherworking',icon:'🦬',desc:'Cure hides and make leather and medium armor.'},
  cooking:{name:'Cooking',icon:'🍲',desc:'Prepare provisions consumed when parties depart.'},
  runecrafting:{name:'Runecrafting',icon:'🔮',desc:'Shape magical resources into socketable runes.'}
};
const PROFESSION_TRAITS=[
  {id:'swift_hands',name:'Swift Hands',effect:'speed',value:.14,desc:'14% faster work'},
  {id:'eager_student',name:'Eager Student',effect:'xp',value:.20,desc:'20% more profession XP'},
  {id:'meticulous',name:'Meticulous',effect:'quality',value:.08,desc:'8% chance to improve equipment quality'},
  {id:'resourceful',name:'Resourceful',effect:'preserve',value:.12,desc:'12% chance to preserve each ingredient'},
  {id:'prolific',name:'Prolific',effect:'yield',value:.12,desc:'12% chance to produce an extra result'}
];
const METAL_BARS={CopperOre:'CopperBar',Iron:'IronBar',Silver:'SilverBar',Mithril:'MithrilBar',StarMetal:'StarMetalBar',CinderOre:'CinderBar',Voidstone:'VoidBar',Adamantite:'AdamantiteBar',Orichalcum:'OrichalcumBar',Eternium:'EterniumBar'};
const WOOD_PLANKS={Wood:'WoodenPlank',Hardwood:'HardwoodPlank',Ironwood:'IronwoodPlank',SpiritBark:'SpiritwoodPlank',Dreamwood:'DreamwoodPlank',Worldroot:'WorldrootPlank'};
const LEATHER_OUTPUTS={Leather:'CuredLeather',WolfPelt:'WolfLeather',WhitePelt:'FrostLeather',Stormhide:'StormLeather'};
const PROFESSION_TIER_IDENTITIES={
  smithing:['','Copper','Iron','Silver','Mithril','Star Metal','Cinder','Void','Adamantite','Orichalcum','Eternium'],
  smelting:['','Copper Ore','Iron','Silver','Mithril','Star Metal','Cinder Ore','Voidstone','Adamantite','Orichalcum','Eternium'],
  woodworking:['','Wood','Hardwood','Hardwood','Ironwood','Spiritwood','Spiritwood','Spiritwood','Spiritwood','Dreamwood','Worldroot'],
  tailoring:['','Cloth','Linen','Cotton','Woven Silk','Shadow Silk','Shadow Silk','Phase Silk','Celestial Silk','Godthread','Godthread'],
  leatherworking:['','Cured Leather','Wolf Leather','Storm Leather','Frost Leather','Shadow Silk','Demon Horn','Astral Thread','Leviathan Scale','Dream Essence','Worldroot'],
  cooking:['','Fish & Game','Wolf & Herb','Pearlfin & Sunspice','Frost Fare','Dusk Fare','Cinder Fare','Astral Fare','Celestial Fare','Dream Fare','Worldroot Fare'],
  runecrafting:['','Essence','Venom','Arcane','Spirit','Storm','Cinder','Astral','Celestial','Dream','Starlight']
};
const professionExpandedTiers=new Set(PROFESSION_ORDER.map(pid=>pid+':1'));
let activeProfession='smithing';
function professionTierIdentity(pid,tier){return PROFESSION_TIER_IDENTITIES[pid]?.[tier]||`Tier ${tier}`}
function toggleProfessionTier(tier){const key=activeProfession+':'+tier;if(professionExpandedTiers.has(key))professionExpandedTiers.delete(key);else professionExpandedTiers.add(key);renderCraft()}

function stableProfessionNumber(h){
  const text=String(h?.id||'')+'|'+String(h?.name||'');let n=0;
  for(let i=0;i<text.length;i++)n=(n*31+text.charCodeAt(i))>>>0;
  return n;
}
function rollProfessionTrait(h=null){
  const profession=h?PROFESSION_ORDER[stableProfessionNumber(h)%PROFESSION_ORDER.length]:pick(PROFESSION_ORDER);
  const trait=h?PROFESSION_TRAITS[Math.floor(stableProfessionNumber(h)/PROFESSION_ORDER.length)%PROFESSION_TRAITS.length]:pick(PROFESSION_TRAITS);
  return{profession,trait:trait.id};
}
function professionTraitDef(h){
  const value=h?.professionTrait||rollProfessionTrait(h);
  const trait=PROFESSION_TRAITS.find(x=>x.id===value.trait)||PROFESSION_TRAITS[0];
  return{...trait,profession:value.profession,professionName:PROFESSION_DEFS[value.profession]?.name||value.profession};
}
function professionTraitText(h){const t=professionTraitDef(h);return `${t.name} · ${t.professionName}: ${t.desc}`}

function recipeProfession(r){
  if(r?.[5]?.profession)return r[5].profession;
  const slot=r?.[1],name=String(r?.[2]||r?.[0]||''),meta=r?.[5]||{};
  if(slot==='Material'){
    const out=meta.outputResource||r?.[2];
    if(Object.values(METAL_BARS).includes(out))return'smelting';
    if(Object.values(WOOD_PLANKS).includes(out))return'woodworking';
    if(Object.values(LEATHER_OUTPUTS).includes(out))return'leatherworking';
    return'tailoring';
  }
  if(slot==='Weapon'&&/(Bow|Crossbow|Staff|Wand|Spear|Polearm)/i.test(name))return'woodworking';
  if(slot==='Armor'){
    const armor=meta.armorClass||armorProfile(name).armorClass;
    if(armor==='Heavy'||/Shield|Plate|Mail/i.test(name))return'smithing';
    if(armor==='Medium'||/Leather|Hide|Scale Vest/i.test(name))return'leatherworking';
    return'tailoring';
  }
  return'smithing';
}
function addProcessingRecipe(name,input,inputQty,output,outputQty,tier,profession){
  if(recipes.some(r=>r[5]?.outputResource===output))return;
  recipes.push([name,'Material',output,{[input]:inputQty},tier,{outputResource:output,outputQty,profession,processing:true}]);
}
function prepareProfessionRecipes(){
  if(recipes.__professionsPrepared)return;
  recipes.__professionsPrepared=true;
  Object.entries(METAL_BARS).forEach(([raw,out])=>addProcessingRecipe('Smelt '+(RESOURCE_NAMES[out]||out),raw,2,out,1,resourceTier(raw),'smelting'));
  Object.entries(WOOD_PLANKS).forEach(([raw,out])=>addProcessingRecipe('Mill '+(RESOURCE_NAMES[out]||out),raw,2,out,1,resourceTier(raw),'woodworking'));
  Object.entries(LEATHER_OUTPUTS).forEach(([raw,out])=>addProcessingRecipe('Cure '+(RESOURCE_NAMES[out]||out),raw,2,out,1,resourceTier(raw),'leatherworking'));
  recipes.forEach(r=>{
    r[5]=r[5]||{};r[5].profession=recipeProfession(r);
    if(r[1]==='Material')return;
    const cost={...(r[3]||{})};
    if(r[5].profession==='smithing')Object.entries(METAL_BARS).forEach(([raw,out])=>{if(cost[raw]){cost[out]=(cost[out]||0)+cost[raw];delete cost[raw]}});
    if(r[5].profession==='woodworking')Object.entries(WOOD_PLANKS).forEach(([raw,out])=>{if(cost[raw]){cost[out]=(cost[out]||0)+cost[raw];delete cost[raw]}});
    if(r[5].profession==='leatherworking')Object.entries(LEATHER_OUTPUTS).forEach(([raw,out])=>{if(cost[raw]){cost[out]=(cost[out]||0)+cost[raw];delete cost[raw]}});
    if(r[5].profession==='tailoring'){
      const tier=Math.max(1,r[4]||1),replacement=tier===2?'Linen':tier===3?'CottonCloth':tier>=4?'WovenSilk':'Cloth';
      if(cost.Cloth&&replacement!=='Cloth'){cost[replacement]=(cost[replacement]||0)+cost.Cloth;delete cost.Cloth}
    }
    r[3]=cost;
  });
}
function blankProfession(id){return{id,level:1,xp:0,workerId:null,jobs:[]}}
function normalizeProfessionState(){
  prepareProfessionRecipes();
  s.professions=s.professions&&typeof s.professions==='object'?s.professions:{};
  PROFESSION_ORDER.forEach(pid=>{s.professions[pid]=Object.assign(blankProfession(pid),s.professions[pid]||{});s.professions[pid].jobs=Array.isArray(s.professions[pid].jobs)?s.professions[pid].jobs:[]});
  const smith=s.professions.smithing,cook=s.professions.cooking;
  if(!s.professionMigrationV1){
    smith.level=Math.max(smith.level,s.smithing?.level||1);smith.xp=Math.max(smith.xp,s.smithing?.xp||0);
    cook.level=Math.max(cook.level,s.cooking?.level||1);cook.xp=Math.max(cook.xp,s.cooking?.xp||0);
    if(!smith.jobs.length)smith.jobs=(s.craftJobs||[]).map(j=>({...j,kind:'recipe',profession:'smithing'}));
    if(!cook.jobs.length)cook.jobs=(s.cookingJobs||[]).map(j=>({...j,kind:'meal',profession:'cooking'}));
    s.professionMigrationV1=true;
  }
  s.smithing=smith;s.cooking=cook;s.craftJobs=smith.jobs;s.cookingJobs=cook.jobs;
  [...(s.members||[]),...(s.recruits||[])].forEach(h=>{if(!h.professionTrait)h.professionTrait=rollProfessionTrait(h);if(h.professionBusy&&!h.busy)delete h.professionBusy});
  PROFESSION_ORDER.forEach(pid=>{
    const p=s.professions[pid];p.level=Math.max(1,Math.floor(p.level||1));p.xp=Math.max(0,Math.floor(p.xp||0));
    if(p.workerId&&!s.members.some(h=>h.id===p.workerId))p.workerId=null;
    p.jobs.forEach(j=>{j.profession=pid;j.kind=j.kind||(j.meal?'meal':j.rune?'rune':'recipe');j.remaining=Math.max(1,Math.floor(j.remaining||j.qty||1));j.qty=Math.max(j.remaining,Math.floor(j.qty||j.remaining));j.effects=j.effects||{};j.paidMaterials=j.paidMaterials||null});
    normalizeProfessionQueue(pid);
    syncProfessionBusy(pid);
  });
}
function professionState(pid){return s.professions[pid]}
function professionWorker(pid){const wid=professionState(pid)?.workerId;return s.members.find(h=>h.id===wid)||null}
function professionWorkerAvailable(pid){
  const p=professionState(pid),h=professionWorker(pid);if(!h)return false;
  return !h.busy||(p.jobs.length>0&&h.professionBusy===pid);
}
function professionWorkerStatus(pid){
  const p=professionState(pid),h=professionWorker(pid);if(!h)return'No specialist assigned';
  if(p.jobs.length&&h.professionBusy===pid)return'Working at this station';
  if(h.busy)return h.professionBusy?`Working in ${PROFESSION_DEFS[h.professionBusy]?.name||'another workshop'}`:'Away on guild duty';
  return'Available';
}
function professionEffects(pid){
  const h=professionWorker(pid),out={speed:0,xp:0,quality:0,yield:0,preserve:0};if(!h)return out;
  const t=professionTraitDef(h);if(t.profession===pid)out[t.effect]=t.value;return out;
}
function effectSummary(e){return PROFESSION_TRAITS.filter(t=>(e[t.effect]||0)>0).map(t=>`${t.name}: +${Math.round(e[t.effect]*100)}% ${t.effect}`).join(' · ')||'No affinity bonus for this workstation.'}
function syncProfessionBusy(pid){
  const p=professionState(pid),h=professionWorker(pid);if(!h)return;
  if(p.jobs.length){h.busy=true;h.professionBusy=pid}
  else if(h.professionBusy===pid){h.busy=false;delete h.professionBusy}
}
function assignProfessionWorker(pid,hid){
  const p=professionState(pid);if(p.jobs.length)return notify('Finish or cancel this workstation queue before changing its specialist.');
  const old=professionWorker(pid);if(old&&old.professionBusy===pid){old.busy=false;delete old.professionBusy}
  if(hid){
    const h=s.members.find(x=>x.id===hid);if(!h)return;
    const other=PROFESSION_ORDER.find(x=>x!==pid&&professionState(x).workerId===h.id);
    if(h.busy||other)return notify(`${h.name} is already assigned or away.`);
    p.workerId=h.id;
  }else p.workerId=null;
  save();renderCraft();renderRoster();
}
function openProfessionWorkerPicker(pid){
  const p=professionState(pid),current=professionWorker(pid);
  const available=s.members.filter(h=>!h.busy&&!PROFESSION_ORDER.some(x=>x!==pid&&professionState(x).workerId===h.id));
  showModal('Assign '+PROFESSION_DEFS[pid].name+' Specialist',`${current?`<button class="btn" onclick="assignProfessionWorker('${pid}',null);closeModal()">Leave workstation vacant</button>`:''}<div class="g2" style="margin-top:9px">${available.map(h=>{const t=professionTraitDef(h),match=t.profession===pid;return `<button class="card professionWorkerChoice" onclick="assignProfessionWorker('${pid}',${h.id});closeModal()"><span class="name">${h.name}</span><span class="muted">${displayClass(h)} · ${match?'<b class="good">'+t.name+'</b>':t.name}</span><span class="muted">${t.professionName}: ${t.desc}</span></button>`}).join('')||'<div class="empty">No available members.</div>'}</div>`);
}
function professionXpNeeded(level){return Math.round(60*Math.pow(Math.max(1,level),1.72))}
function grantProfessionXp(pid,amount){
  const p=professionState(pid);p.xp+=Math.max(0,Math.round(amount||0));let need=professionXpNeeded(p.level);
  while(p.xp>=need){p.xp-=need;p.level++;log(`${PROFESSION_DEFS[pid].name} reached level ${p.level}.`);need=professionXpNeeded(p.level)}
}
function professionRequirement(tier,boss=false){const req={1:1,2:3,3:6,4:10,5:15,6:21,7:28,8:36,9:45,10:55}[tier]||tier*6;return req+(boss?2:0)}
function professionRecipeRequirement(r){return professionRequirement(Math.max(1,r?.[4]||1),Object.keys(r?.[3]||{}).some(k=>BOSS_RESOURCES.has(k)))}
function professionRecipeXp(r){return Math.round(5+(r?.[4]||1)*7+Object.keys(r?.[3]||{}).length*2)}
function professionDuration(pid,baseSeconds,effects=professionEffects(pid)){return Math.max(4000,Math.round(baseSeconds*1000*Math.pow(.88,s.up.craftSpeed||0)*(1-(effects.speed||0))))}
function jobDuration(pid,kind,data,effects){
  if(kind==='meal')return professionDuration(pid,MEALS[data]?.duration||20,effects);
  if(kind==='rune')return professionDuration(pid,20+runeTier(data)*8,effects);
  const r=recipes[data];return professionDuration(pid,18+(r?.[4]||1)*12,effects);
}
function normalizeProfessionQueue(pid){
  const p=professionState(pid);if(!p?.jobs?.length)return;let cursor=Date.now();
  p.jobs=p.jobs.filter(j=>(j.kind==='meal'?MEALS[j.meal]:j.kind==='rune'?RUNES[j.rune]:recipes[j.recipe]));
  p.jobs.forEach((j,index)=>{j.duration=j.duration||jobDuration(pid,j.kind,j.meal||j.rune||j.recipe,j.effects||{});if(index===0){j.start=j.start||cursor;j.end=j.end||j.start+j.duration;cursor=Math.max(cursor,j.end)+(j.remaining-1)*j.duration}else{j.start=cursor;j.end=j.start+j.duration;cursor=j.end+(j.remaining-1)*j.duration}});
}
function preservedCost(cost,qty,chance){
  const paid={};Object.entries(cost||{}).forEach(([k,v])=>{const total=v*qty;let kept=0;for(let i=0;i<total;i++)if(Math.random()<chance)kept++;paid[k]=Math.max(0,total-kept)});return paid;
}
function canPayMaterials(cost){return Object.entries(cost).every(([k,v])=>(s.materials[k]||0)>=v)}
function queueProfessionJob(pid,kind,key,qty=1){
  const p=professionState(pid),worker=professionWorker(pid);if(!worker)return notify(`Assign a ${PROFESSION_DEFS[pid].name} specialist first.`);
  if(!professionWorkerAvailable(pid))return notify(`${worker.name} is currently away. They must return before new work can be queued.`);
  qty=clamp(Math.floor(Number(qty)||1),1,99);
  const obj=kind==='meal'?MEALS[key]:kind==='rune'?RUNES[key]:recipes[key];if(!obj)return;
  const cost=kind==='meal'?obj.cost:kind==='rune'?obj.cost:obj[3];
  const req=kind==='meal'?obj.level:kind==='rune'?professionRequirement(runeTier(key)):professionRecipeRequirement(obj);
  if(p.level<req)return notify(`Requires ${PROFESSION_DEFS[pid].name} level ${req}.`);
  const effects=professionEffects(pid),paid=preservedCost(cost,qty,effects.preserve||0);
  if(!canPayMaterials(paid))return notify('Not enough materials for that work order.');
  Object.entries(paid).forEach(([k,v])=>s.materials[k]-=v);
  const duration=jobDuration(pid,kind,key,effects),now=Date.now();let start=now;
  if(p.jobs.length){const tail=p.jobs[p.jobs.length-1];start=Math.max(now,(tail.end||now)+(Math.max(1,tail.remaining||1)-1)*(tail.duration||duration))}
  p.jobs.push({id:id(),profession:pid,kind,[kind==='meal'?'meal':kind==='rune'?'rune':'recipe']:key,qty,remaining:qty,duration,start,end:start+duration,effects:{...effects},paidMaterials:paid});
  syncProfessionBusy(pid);log(`Queued ${jobName(p.jobs[p.jobs.length-1])} ×${qty} at ${PROFESSION_DEFS[pid].name}.`);save();render();
}
function jobName(j){return j.kind==='meal'?MEALS[j.meal]?.name:j.kind==='rune'?RUNES[j.rune]?.name:recipes[j.recipe]?.[0]||'Unknown work'}
function cancelProfessionJob(pid,jid){
  const p=professionState(pid),index=p.jobs.findIndex(j=>j.id===jid);if(index<0)return;const j=p.jobs[index],ratio=Math.max(1,j.remaining)/Math.max(1,j.qty);
  const paid=j.paidMaterials||{};Object.entries(paid).forEach(([k,v])=>s.materials[k]=(s.materials[k]||0)+Math.floor(v*ratio));
  p.jobs.splice(index,1);normalizeProfessionQueue(pid);syncProfessionBusy(pid);save();render();notify('Work order cancelled and unused materials refunded.','good');
}
function improvedRarity(tier,chance){const base=itemRarity(tier);if(Math.random()>=chance)return base;return rar[Math.min(rar.length-1,rar.indexOf(base)+1)]}
function completeProfessionUnit(pid,j){
  const p=professionState(pid),bonusYield=Math.random()<(j.effects?.yield||0)?1:0,outputs=1+bonusYield;let xp=1;
  if(j.kind==='meal'){
    const meal=MEALS[j.meal];if(!meal)return;s.meals[j.meal]=(s.meals[j.meal]||0)+outputs;xp=meal.xp||1;trackQuestProgress('cook',j.meal,outputs);
  }else if(j.kind==='rune'){
    const rune=RUNES[j.rune];if(!rune)return;s.runes[j.rune]=(s.runes[j.rune]||0)+outputs;xp=8+runeTier(j.rune)*8;
  }else{
    const r=recipes[j.recipe];if(!r)return;xp=professionRecipeXp(r);
    if(r[1]==='Material'&&r[5]?.outputResource){addStoredResource(r[5].outputResource,Math.max(1,r[5].outputQty||1)*outputs);trackQuestProgress('craft',r[0],outputs)}
    else for(let n=0;n<outputs;n++){const it=makeSpecificItem(r[1],r[2],r[4],improvedRarity(r[4],j.effects?.quality||0));applyRecipeModifiers(it,r[5]||{});it.name=r[0];it.recipeIndex=j.recipe;receiveInventoryItem(it,'craft');trackQuestProgress('craft',it.name,1)}
  }
  xp=Math.round(xp*(1+(j.effects?.xp||0))*(pid==='smithing'?1+.1*(s.up.smith||0):1));grantProfessionXp(pid,xp);
  log(`Finished ${jobName(j)}${bonusYield?' · bonus yield':''} · +${xp} ${PROFESSION_DEFS[pid].name} XP.`);
}
function completeCrafting(){
  if(!s?.professions)return false;let changed=false,now=Date.now();
  PROFESSION_ORDER.forEach(pid=>{const p=professionState(pid);while(p.jobs.length&&now>=p.jobs[0].end){const j=p.jobs[0];completeProfessionUnit(pid,j);j.remaining--;changed=true;if(j.remaining>0){j.start=j.end;j.end=j.start+j.duration}else p.jobs.shift()}if(changed)normalizeProfessionQueue(pid);syncProfessionBusy(pid)});
  if(changed)save();return changed;
}
function completeCooking(){return false}
function craft(i,qty=1){const r=recipes[i];if(r)queueProfessionJob(recipeProfession(r),'recipe',i,qty)}
function cookMeal(mid,qty=1){queueProfessionJob('cooking','meal',mid,qty)}
function craftRune(rid,qty=1){queueProfessionJob('runecrafting','rune',rid,qty)}
function cancelCraftJob(jid){for(const pid of PROFESSION_ORDER)if(professionState(pid).jobs.some(j=>j.id===jid))return cancelProfessionJob(pid,jid)}
function cancelCookingJob(jid){return cancelProfessionJob('cooking',jid)}

let professionRecipeSort='tier';
function setProfessionRecipeSort(value){professionRecipeSort=['tier','name','level','craftable'].includes(value)?value:'tier';renderCraft()}
function setActiveProfession(pid){if(!PROFESSION_DEFS[pid])return;activeProfession=pid;recipeFilter='all';recipeCraftableOnly=false;renderCraft()}
function toggleProfessionRecipe(key){if(expandedRecipes.has(key))expandedRecipes.delete(key);else expandedRecipes.add(key);renderCraft()}
function professionRecipeKnown(r){
  const normal=Object.keys(r[3]||{}).filter(k=>!BOSS_RESOURCES.has(k));
  return normal.every(k=>s.discoveredResources.includes(k)||(s.materials[k]||0)>0||Object.values(METAL_BARS).includes(k)||Object.values(WOOD_PLANKS).includes(k)||Object.values(LEATHER_OUTPUTS).includes(k));
}
function professionMaterialRows(cost){return Object.entries(cost||{}).map(([k,v])=>{const have=s.materials[k]||0;return `<span class="${have>=v?'enough':'missing'}"><b>${have}/${v}</b> ${RESOURCE_NAMES[k]||k} <small>${tierLabel(resourceTier(k))}</small></span>`}).join('')}
function renderProfessionRecipe(r,index){
  const pid=recipeProfession(r),p=professionState(pid),req=professionRecipeRequirement(r),max=maxCraftQuantity(r),known=professionRecipeKnown(r),preview=recipePreview(r),open=expandedRecipes.has('recipe:'+index),workerOk=professionWorkerAvailable(pid);
  if(!known)return'';const profile=preview?.profile||[r[1]],stats=preview?.stats||[];
  const disabled=!workerOk?professionWorker(pid)?'Specialist is away':'Assign a specialist':p.level<req?'Requires '+PROFESSION_DEFS[pid].name+' '+req:max<=0?'Missing materials':'';
  return `<div class="recipeLine ${p.level<req||!workerOk?'recipeLocked':''}"><div class="recipeLineHeader" onclick="toggleProfessionRecipe('recipe:${index}')"><div class="recipeLineIcon">${r[1]==='Material'?gameIcon('resource',r[5]?.outputResource,'◇'):r[1]==='Weapon'?(WEAPONS[r[2]]?.icon||'⚔️'):(itemIcons[r[1]]||'◇')}</div><div><div class="recipeLineName">${r[0]}</div><div class="recipeLineType">${tierLabel(r[4])} · ${recipeTypeLabel(r)}</div></div><div class="recipeChevron">${open?'▾':'▸'}</div></div>${open?`<div class="recipeLineDetails recipeDetailLayout"><div class="recipeItemInformation"><section class="recipeInfoSection"><h4>Item Profile</h4><div class="recipeProfileList">${profile.map(x=>`<span>${x}</span>`).join('')}</div></section><section class="recipeInfoSection"><h4>Result</h4><div class="recipeStatList">${stats.map(x=>`<span>${x}</span>`).join('')||'<span>Processed crafting material</span>'}</div></section></div><aside class="recipeCraftingBox"><h4>Requirements</h4><div class="recipeCraftMeta"><span>${PROFESSION_DEFS[pid].name} ${req}</span><span>+${professionRecipeXp(r)} XP</span><span>${Math.ceil(jobDuration(pid,'recipe',index,professionEffects(pid))/1000)}s</span></div><div class="recipeCostLabel">Material cost</div><div class="recipeDetailMaterials">${professionMaterialRows(r[3])}</div><div class="recipeLineAction">${disabled?`<button class="btn" disabled>${disabled}</button>`:`<div class="recipeQuantityControl"><span>×</span><input id="profQty-${index}" type="number" min="1" max="${max}" value="1"><button class="btn gold" onclick="craft(${index},$('profQty-${index}').value)">Create</button></div>`}</div></aside></div>`:''}</div>`;
}
function renderMealRecipe(mid,m){const open=expandedRecipes.has('meal:'+mid),p=professionState('cooking'),materials=canPayMaterials(m.cost),workerOk=professionWorkerAvailable('cooking'),disabled=!workerOk?(professionWorker('cooking')?'Specialist is away':'Assign a specialist'):p.level<m.level?'Requires Cooking '+m.level:!materials?'Missing ingredients':'';return `<div class="recipeLine ${disabled?'recipeLocked':''}"><div class="recipeLineHeader" onclick="toggleProfessionRecipe('meal:${mid}')"><div class="recipeLineIcon">${m.icon||'🍲'}</div><div><div class="recipeLineName">${m.name}</div><div class="recipeLineType">${tierLabel(m.tier||1)} · Cooking ${m.level}</div></div><div class="recipeChevron">${open?'▾':'▸'}</div></div>${open?`<div class="recipeLineDetails recipeDetailLayout"><div class="recipeItemInformation"><section class="recipeInfoSection"><h4>Mission Provision</h4><div class="recipeProfileList"><span>${m.desc}</span><span>One serving per party member when a mission begins.</span></div></section><section class="recipeInfoSection"><h4>Result</h4><div class="recipeStatList"><span>+${m.xp} Cooking XP</span><span>${m.duration||20}s per serving</span></div></section></div><aside class="recipeCraftingBox"><h4>Ingredients</h4><div class="recipeDetailMaterials">${professionMaterialRows(m.cost)}</div><div class="recipeLineAction">${disabled?`<button class="btn" disabled>${disabled}</button>`:`<div class="recipeQuantityControl"><span>×</span><input id="mealQty-${mid}" type="number" min="1" value="1"><button class="btn gold" onclick="cookMeal('${mid}',$('mealQty-${mid}').value)">Cook</button></div>`}</div></aside></div>`:''}</div>`}
function renderMealProfession(){return renderTieredProfessionGroups(Object.entries(MEALS).map(([id,m])=>({tier:m.tier||1,name:m.name,level:m.level||1,craftable:canPayMaterials(m.cost)&&professionState('cooking').level>=m.level&&professionWorkerAvailable('cooking'),html:()=>renderMealRecipe(id,m)})))}
function renderRuneProfession(){
  const owned=Object.entries(s.runes||{}).filter(([,v])=>v>0).map(([rid,v])=>`${runeIcon(rid)} ${RUNES[rid]?.name} ×${v}`).join(' · ')||'No runes crafted yet.';
  const socketable=s.inventory.filter(it=>!it.equipped&&runeSlots(it)>0).map(it=>`<button class="btn" onclick="openRuneSocketItem(${it.id})">${it.name} · ${(it.runes||[]).length}/${runeSlots(it)} slots</button>`).join('');
  const entries=Object.entries(RUNES).map(([rid,r])=>{const tier=runeTier(rid),req=professionRequirement(tier),open=expandedRecipes.has('rune:'+rid),workerOk=professionWorkerAvailable('runecrafting'),craftable=canPayMaterials(r.cost)&&professionState('runecrafting').level>=req&&workerOk;return{tier,name:r.name,level:req,craftable,html:()=>`<div class="recipeLine ${craftable?'':'recipeLocked'}"><div class="recipeLineHeader" onclick="toggleProfessionRecipe('rune:${rid}')"><div class="recipeLineIcon">${runeIcon(rid)}</div><div><div class="recipeLineName">${r.name}</div><div class="recipeLineType">${tierLabel(tier)} · Runecrafting ${req}</div></div><div class="recipeChevron">${open?'▾':'▸'}</div></div>${open?`<div class="recipeLineDetails recipeDetailLayout"><div class="recipeItemInformation"><section class="recipeInfoSection"><h4>Rune Effect</h4><div class="recipeProfileList"><span>${r.desc}</span></div></section></div><aside class="recipeCraftingBox"><h4>Materials</h4><div class="recipeDetailMaterials">${professionMaterialRows(r.cost)}</div><div class="recipeLineAction"><button class="btn ${craftable?'gold':''}" ${craftable?'':'disabled'} onclick="craftRune('${rid}',1)">${workerOk?'Create Rune':'Specialist unavailable'}</button></div></aside></div>`:''}</div>`}});return `<div class="card"><div class="name">Rune Vault</div><div class="muted">${owned}</div><div class="professionSocketList">${socketable||'<span class="muted">No unequipped socketable equipment.</span>'}</div></div>`+renderTieredProfessionGroups(entries)}
function renderTieredProfessionGroups(entries){
  let list=entries.filter(x=>!recipeCraftableOnly||x.craftable);
  const sorters={tier:(a,b)=>a.tier-b.tier||a.name.localeCompare(b.name),name:(a,b)=>a.name.localeCompare(b.name),level:(a,b)=>a.level-b.level||a.name.localeCompare(b.name),craftable:(a,b)=>Number(b.craftable)-Number(a.craftable)||a.tier-b.tier};
  list.sort(sorters[professionRecipeSort]||sorters.tier);const groups=new Map();list.forEach(x=>{if(!groups.has(x.tier))groups.set(x.tier,[]);groups.get(x.tier).push(x)});
  return [...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([tier,rows])=>{const name=`${tierLabel(tier)} · ${professionTierIdentity(activeProfession,tier)}`,open=professionExpandedTiers.has(activeProfession+':'+tier);return `<div class="recipeCategory ${open?'open':''}"><div class="recipeCategoryHeader" onclick="toggleProfessionTier(${tier})"><span class="recipeCategoryArrow">${open?'▾':'▸'}</span><span class="recipeCategoryName">${name}</span><span class="recipeCategoryCount">${rows.length} recipe${rows.length===1?'':'s'}</span></div>${open?`<div class="recipeCategoryBody">${rows.map(x=>x.html()).join('')}</div>`:''}</div>`}).join('')||'<div class="empty">No recipes match the current filters.</div>';
}
function renderCraftQueue(){
  const p=professionState(activeProfession),now=Date.now();normalizeProfessionQueue(activeProfession);
  $('craftQueue').innerHTML=p.jobs.length?p.jobs.map((j,i)=>{const waiting=i>0&&now<j.start,pct=waiting?0:clamp((now-j.start)/Math.max(1,j.end-j.start)*100,0,100);return `<div class="card"><div class="mission-row"><div><div class="name">${jobName(j)} ×${j.remaining}</div><div class="muted">${i?'Queued':'Active'} · ${effectSummary(j.effects||{})}</div></div><span class="chip">${i?'#'+(i+1):'Working'}</span></div><div class="progressWrap"><div class="progressMeta"><span>${waiting?'Waiting':Math.floor(pct)+'%'}</span><span class="timer" data-start="${j.start}" data-end="${waiting?j.start:j.end}">${fmt((waiting?j.start:j.end)-now)}</span></div><div class="progressTrack"><div class="progressFill" ${waiting?'':`data-start="${j.start}" data-end="${j.end}"`} style="width:${pct}%"></div></div></div><button class="btn" style="margin-top:8px" onclick="cancelProfessionJob('${activeProfession}',${j.id})">Cancel Order</button></div>`}).join(''):'<div class="empty">This workstation is idle.</div>';
}
function renderCraft(){
  if(!$('professionTabs'))return;normalizeProfessionState();completeCrafting();const p=professionState(activeProfession),def=PROFESSION_DEFS[activeProfession],worker=professionWorker(activeProfession),effects=professionEffects(activeProfession),need=professionXpNeeded(p.level);
  $('craftMats').innerHTML=matHtml();
  $('professionTabs').innerHTML=PROFESSION_ORDER.map(pid=>`<button class="btn professionTab ${pid===activeProfession?'on':''}" onclick="setActiveProfession('${pid}')">${PROFESSION_DEFS[pid].icon} ${PROFESSION_DEFS[pid].name}</button>`).join('');
  $('professionWorkstation').innerHTML=`<div class="professionStation"><div class="professionStationTop"><div><div class="sectionKicker">Workstation</div><h3>${def.icon} ${def.name} <span class="chip">Lv. ${p.level}</span></h3><div class="muted">${def.desc}</div></div><button class="btn ${worker?'':'gold'}" onclick="openProfessionWorkerPicker('${activeProfession}')">${worker?'Change specialist':'Assign specialist'}</button></div><div class="progressMeta"><span>${p.xp.toLocaleString()} / ${need.toLocaleString()} XP</span><span>${worker?worker.name:'Vacant'} · ${professionWorkerStatus(activeProfession)}</span></div><div class="progressTrack"><div class="progressFill" style="width:${clamp(p.xp/need*100,0,100)}%"></div></div><div class="professionEffectRow">${worker?`<span class="chip">${professionTraitText(worker)}</span><span class="chip ${Object.values(effects).some(Boolean)?'good':''}">${effectSummary(effects)}</span>${p.jobs.length?'<span class="chip">Busy until queue is empty</span>':worker.busy?'<span class="chip bad">Cannot queue work until this specialist returns</span>':'<span class="chip">May join missions while this station is idle</span>'}`:'<span class="muted">A permanent specialist must be assigned before work can begin.</span>'}</div></div>`;
  $('professionRecipeTitle').textContent=activeProfession==='cooking'?'Meal Recipes':activeProfession==='runecrafting'?'Rune Recipes':'Known '+def.name+' Recipes';
  $('professionRecipeHelp').textContent=activeProfession==='smelting'?'Bars are required by Smithing equipment.':activeProfession==='woodworking'?'Processed timber is required by wooden weapons.':'Recipes use materials appropriate to this profession.';
  const sortSelect=$('professionRecipeSort');if(sortSelect)sortSelect.value=professionRecipeSort;
  const filterButton=$('recipeMenuButton');if(filterButton)filterButton.textContent=({all:'All',Weapon:'Weapons',Armor:'Armor',Jewelry:'Jewelry',Material:'Materials'}[recipeFilter]||'All')+' ▾';
  document.querySelectorAll('[data-recipe-filter]').forEach(x=>x.classList.toggle('on',x.dataset.recipeFilter===recipeFilter));
  const craftableButton=$('recipeCraftableToggle');if(craftableButton){craftableButton.classList.toggle('on',recipeCraftableOnly);craftableButton.textContent='Craftable only: '+(recipeCraftableOnly?'On':'Off')}
  if(activeProfession==='cooking')$('recipeList').innerHTML=renderMealProfession();
  else if(activeProfession==='runecrafting')$('recipeList').innerHTML=renderRuneProfession();
  else{
    const entries=recipes.map((r,i)=>({r,i})).filter(x=>recipeProfession(x.r)===activeProfession&&professionRecipeKnown(x.r)).filter(({r})=>{
      const typeOk=recipeFilter==='all'||(recipeFilter==='Jewelry'?(r[1]==='Ring'||r[1]==='Amulet'):r[1]===recipeFilter);
      const craftable=professionState(activeProfession).level>=professionRecipeRequirement(r)&&maxCraftQuantity(r)>0&&professionWorkerAvailable(activeProfession);
      return typeOk&&(!recipeCraftableOnly||craftable);
    }).map(({r,i})=>({tier:r[4]||1,name:r[0],level:professionRecipeRequirement(r),craftable:professionState(activeProfession).level>=professionRecipeRequirement(r)&&maxCraftQuantity(r)>0&&professionWorkerAvailable(activeProfession),html:()=>renderProfessionRecipe(r,i)}));
    $('recipeList').innerHTML=renderTieredProfessionGroups(entries);
  }
  renderCraftQueue();colorizeStatTerms($('crafting'));
}
function renderCooking(){return}
