// Roster actions, equipment, crafting progression, upgrades, and display helpers.
const ONBOARDING_GOALS=[
  {id:'recruitTwo',title:'Form the Core Team',description:'Recruit your first two adventurers.',reward:{gold:20},complete:()=>s.members.length>=2},
  {id:'startExpedition',title:'Send an Expedition',description:'Choose a destination and deploy a party.',reward:{gold:25},complete:()=>!!s.onboarding.flags.expeditionStarted},
  {id:'claimLoot',title:'Bring Home the Spoils',description:'Claim rewards earned by an expedition.',reward:{gold:30,rep:250},complete:()=>!!s.onboarding.flags.lootClaimed},
  {id:'equipItem',title:'Equip an Adventurer',description:'Equip any weapon, armor, or piece of jewelry.',reward:{gold:30},complete:()=>!!s.onboarding.flags.itemEquipped},
  {id:'startHarvest',title:'Gather Resources',description:'Send a crew to a harvesting location.',reward:{gold:35,rep:250},complete:()=>!!s.onboarding.flags.harvestStarted},
  {id:'buyUpgrade',title:'Invest in the Guild',description:'Purchase your first permanent guild upgrade.',reward:{gold:50,rep:500},complete:()=>!!s.onboarding.flags.upgradePurchased}
];
function normalizeOnboarding(){
  s.onboarding=s.onboarding&&typeof s.onboarding==='object'?s.onboarding:{collapsed:false,flags:{},claimed:[]};
  s.onboarding.flags=s.onboarding.flags&&typeof s.onboarding.flags==='object'?s.onboarding.flags:{};
  s.onboarding.claimed=Array.isArray(s.onboarding.claimed)?s.onboarding.claimed:[];
  const flags=s.onboarding.flags;
  if(s.members.length>=2)flags.recruitedTwo=true;
  if(s.missions.length||s.wins>0)flags.expeditionStarted=true;
  if(s.inventory.length||Object.values(s.materials||{}).some(v=>v>0)||s.wins>0)flags.lootClaimed=true;
  if(s.members.some(h=>Object.values(h.equip||{}).some(Boolean)))flags.itemEquipped=true;
  if(s.harvestJobs.length)flags.harvestStarted=true;
  if(Object.values(s.up||{}).some(v=>v>0))flags.upgradePurchased=true;
  completeOnboardingGoals(false);
}
function onboardingRewardText(reward){
  const parts=[];
  if(reward.gold)parts.push(`${reward.gold} gold`);
  if(reward.rep)parts.push(`${reward.rep} reputation`);
  return parts.join(' · ');
}
function completeOnboardingGoals(announce=true){
  if(!s?.onboarding)return;
  const claimed=new Set(s.onboarding.claimed);
  ONBOARDING_GOALS.forEach(goal=>{
    if(claimed.has(goal.id)||!goal.complete())return;
    s.onboarding.claimed.push(goal.id);claimed.add(goal.id);
    if(goal.reward.gold)s.gold+=goal.reward.gold;
    if(goal.reward.rep)grantGuildReputation(goal.reward.rep);
    log(`Guild Goal completed: ${goal.title}.`);
    if(announce)notify(`${goal.title} complete · ${onboardingRewardText(goal.reward)}`,'good');
  });
}
function setOnboardingFlag(flag){
  if(!s.onboarding)normalizeOnboarding();
  s.onboarding.flags[flag]=true;
  completeOnboardingGoals(true);
  save();
  if(typeof updateNavigationLocks==='function')updateNavigationLocks();
  if(typeof renderOnboardingGoals==='function')renderOnboardingGoals();
}
function toggleGuildGoals(){
  s.onboarding.collapsed=!s.onboarding.collapsed;
  save();renderOnboardingGoals();
}
function renderOnboardingGoals(){
  const panel=$('guildGoalsPanel'),box=$('guildGoals'),button=$('guildGoalsToggle');
  if(!panel||!box||!button)return;
  const claimed=new Set(s.onboarding.claimed);
  const complete=ONBOARDING_GOALS.filter(g=>claimed.has(g.id)).length;
  button.textContent=s.onboarding.collapsed?'Show':'Hide';
  box.style.display=s.onboarding.collapsed?'none':'';
  panel.classList.toggle('allGoalsComplete',complete===ONBOARDING_GOALS.length);
  if(s.onboarding.collapsed)return;
  box.innerHTML=`<div class="goalSummary"><span>${complete} / ${ONBOARDING_GOALS.length} completed</span><div class="progressTrack"><div class="progressFill" style="width:${complete/ONBOARDING_GOALS.length*100}%"></div></div></div><div class="guildGoalList">${ONBOARDING_GOALS.map((goal,index)=>{const done=claimed.has(goal.id),active=!done&&ONBOARDING_GOALS.slice(0,index).every(g=>claimed.has(g.id));return `<div class="guildGoal ${done?'done':active?'active':''}"><span class="goalMark">${done?'✓':index+1}</span><div><div class="name">${goal.title}</div><div class="muted">${goal.description}</div></div><span class="goalReward">${done?'Complete':onboardingRewardText(goal.reward)}</span></div>`}).join('')}</div>`;
}
function complete(){}
function recruit(i){if(s.members.length>=s.memberCap)return notify('Your guild has no open member slots. Upgrade Guild Quarters first.');let x=s.recruits.find(v=>v.id===i);if(!x)return;s.members.push(x);s.recruits=s.recruits.filter(v=>v.id!==i);if(!s.recruits.length)s.nextApplicantsAt=Date.now()+5*60*1000;log(x.name+' joined the guild.');if(s.members.length>=2)setOnboardingFlag('recruitedTwo');save();render();notify(x.name+' joined for free.','good')}
function dismissHero(hid){
  const h=s.members.find(x=>x.id===hid);if(!h)return;
  if(h.busy)return notify('You cannot dismiss someone who is on an expedition.');
  
  showModal('Dismiss Guild Member',`<div class="card"><div class="name">Dismiss ${h.name}?</div><div class="muted">Their equipped items will return to inventory.</div><button class="btn" style="margin-top:10px" onclick="confirmDismiss(${hid})">Dismiss</button></div>`);
}
function confirmDismiss(hid){
  const h=s.members.find(x=>x.id===hid);if(!h)return;
  Object.values(h.equip||{}).forEach(itemId=>{const it=s.inventory.find(x=>x.id===itemId);if(it)it.equipped=null});
  s.members=s.members.filter(x=>x.id!==hid);
  if(s.selected===hid)s.selected=s.members[0]?.id||null;
  log(h.name+' left the guild.');
  save();closeModal();render();notify('Guild member dismissed.','good');
}
function allowedWeapons(h){
  const base=[...(C[h.class]?.weapons||[])];
  if(h.class==='Priest'&&h.subclass==='battlepriest'){
    ['Mace','Warhammer'].forEach(w=>{if(!base.includes(w))base.push(w)});
  }
  return base;
}
function itemEquipSlot(it){
  return it&&(it.slot==='Ring'||it.slot==='Amulet')?'Jewelry':it?.slot;
}
function unequipItem(hid,slot){
  const h=s.members.find(x=>x.id===hid);if(!h)return;
  const itemId=h.equip?.[slot];if(!itemId)return;
  const it=s.inventory.find(x=>x.id===itemId);
  if(it)it.equipped=null;
  h.equip[slot]=null;
  save();renderRoster();renderInv();
}
function equip(hid,iid){
  const h=s.members.find(x=>x.id===hid),it=s.inventory.find(x=>x.id===iid);
  if(!h||!it)return;
  const slot=itemEquipSlot(it);
  if(slot==='Weapon'&&!allowedWeapons(h).includes(it.weaponType))return notify('That class cannot use this weapon.');
  if(slot==='Armor'&&!canEquipArmor(h,it))return notify(displayClass(h)+' can only equip up to '+maxArmorClass(h)+' armor.');
  const old=s.inventory.find(x=>x.id===h.equip[slot]);
  if(old)old.equipped=null;
  if(it.equipped){
    const previous=s.members.find(x=>x.id===it.equipped);
    if(previous){
      const previousSlot=itemEquipSlot(it);
      if(previous.equip[previousSlot]===it.id)previous.equip[previousSlot]=null;
    }
  }
  h.equip[slot]=it.id;
  it.equipped=h.id;
  setOnboardingFlag('itemEquipped');
  save();closeModal();renderRoster();renderInv();
}
function equipModal(hid,slot){
  const h=s.members.find(x=>x.id===hid);
  let a=s.inventory.filter(x=>itemEquipSlot(x)===slot&&!x.equipped);
  if(slot==='Weapon'&&h)a=a.filter(it=>allowedWeapons(h).includes(it.weaponType));
  if(slot==='Armor'&&h)a=a.filter(it=>canEquipArmor(h,it));
  const current=s.inventory.find(x=>x.id===h?.equip?.[slot]);
  showModal('Choose '+slot,a.length?`<div class="inventory">${a.map(it=>`<div class="card"><div class="name ${rarityClass(it.rarity)}">${it.name}</div><div class="itemVisual">${it.slot==='Weapon'?(weaponDefForItem(it)?.icon||itemIcons[it.slot]||'🎒'):(itemIcons[it.slot]||'🎒')}</div><div class="muted">Tier ${tierLabel(itemTier(it))} · ${it.rarity} · ${statText(it)}</div>${runeSlotsHtml(it,true)}${equipComparison(it,current)}<button class="btn gold" onclick="equip(${hid},${it.id})">Equip</button></div>`).join('')}</div>`:'<div class="empty">No matching items.</div>')}
const BOSS_RESOURCE_SOURCE={};
const BOSS_RESOURCES=new Set();

function markResourceFound(k){
  if(k&&!s.discoveredResources.includes(k)){
    s.discoveredResources.push(k);
    if(typeof updateNavigationLocks==='function')updateNavigationLocks();
  }
}

function syncDiscoveredResources(){
  Object.entries(s.materials||{}).forEach(([k,v])=>{if(v>0)markResourceFound(k)});
  (s.missions||[]).forEach(m=>{
    Object.entries(m.stash?.materials||{}).forEach(([k,v])=>{if(v>0)markResourceFound(k)});
  });
  (s.harvestJobs||[]).forEach(j=>{
    Object.entries(j.stash||{}).forEach(([k,v])=>{if(v>0)markResourceFound(k)});
  });
}

function recipeVisible(r){
  const required=Object.keys(r[3]);
  const normal=required.filter(k=>!BOSS_RESOURCES.has(k));
  const bosses=required.filter(k=>BOSS_RESOURCES.has(k));

  // Every ordinary ingredient must have been discovered at least once.
  if(!normal.every(k=>s.discoveredResources.includes(k)))return false;

  // Boss materials are intentionally exempt. Once all other ingredients
  // are known, the player can see what boss material the recipe needs.
  return true;
}

function discoverRecipes(){syncDiscoveredResources()}

function smithXpNeeded(level){return Math.round(50+25*level+6*level*level)}
function recipeSmithLevel(r){
  if(r?.[1]==='Material')return 1;
  const tier=Math.max(1,Number(r?.[4])||1);
  const tierReq={1:1,2:2,3:3,4:5,5:7,6:10,7:14,8:18,9:23,10:29}[tier]||Math.max(1,Math.round(tier*2));
  const boss=Object.keys(r?.[3]||{}).some(k=>BOSS_RESOURCES.has(k));
  return tierReq+(boss?(tier>=7?2:1):0);
}
function recipeSmithXp(r){
  if(r?.[1]==='Material')return 0;
  const boss=Object.keys(r[3]||{}).some(k=>BOSS_RESOURCES.has(k));
  return Math.round(5+r[4]*7+Object.keys(r[3]||{}).length*2+(boss?20:0));
}
function grantSmithXp(amount){
  s.smithing=Object.assign({level:1,xp:0},s.smithing||{});
  s.smithing.xp+=Math.max(0,Math.round(amount||0));
  let need=smithXpNeeded(s.smithing.level);
  while(s.smithing.xp>=need){s.smithing.xp-=need;s.smithing.level++;log('Blacksmithing reached level '+s.smithing.level+'.');need=smithXpNeeded(s.smithing.level)}
}
function smithingSpeedBonus(level=s.smithing?.level||1){
  const l=Math.max(0,level);
  return .9*(1-Math.exp(-l/25))+.004*l;
}
function craftingSpeedMultiplier(){return Math.pow(.88,s.up.craftSpeed||0)/(1+smithingSpeedBonus())}
function craftDuration(r){
  return Math.max(5000,Math.round((18+r[4]*12)*1000*craftingSpeedMultiplier()));
}

function normalizeCraftQueue(){
  if(!s.craftJobs?.length)return;let cursor=Date.now();
  s.craftJobs=s.craftJobs.filter(j=>recipes[j.recipe]).map(j=>{j.qty=Math.max(1,Math.floor(j.qty||j.remaining||1));j.remaining=Math.max(1,Math.floor(j.remaining||j.qty||1));j.duration=j.duration||craftDuration(recipes[j.recipe]);return j});
  s.craftJobs.forEach((j,index)=>{const duration=j.duration;if(index===0){if(!j.start)j.start=cursor;if(!j.end)j.end=j.start+duration;cursor=Math.max(cursor,j.end)+(j.remaining-1)*duration}else{j.start=cursor;j.end=j.start+duration;cursor=j.end+(j.remaining-1)*duration}});
}
function maxCraftQuantity(r){const amounts=Object.entries(r?.[3]||{}).map(([k,v])=>v>0?Math.floor((s.materials[k]||0)/v):99);return Math.max(0,Math.min(99,amounts.length?Math.min(...amounts):99))}
function craft(i,qty=1){const r=recipes[i];if(!r)return;const req=recipeSmithLevel(r);if((s.smithing?.level||1)<req)return notify('Requires Blacksmithing level '+req+'.');qty=clamp(Math.floor(Number(qty)||1),1,99);const maxQty=maxCraftQuantity(r);if(maxQty<qty)return notify(`You only have materials for ${maxQty} craft${maxQty===1?'':'s'}.`);Object.entries(r[3]).forEach(([k,v])=>s.materials[k]-=v*qty);const duration=craftDuration(r),now=Date.now();let startAt=now;if(s.craftJobs.length){const tail=s.craftJobs[s.craftJobs.length-1];startAt=Math.max(now,(tail.end||now)+(Math.max(1,tail.remaining||tail.qty||1)-1)*(tail.duration||duration))}s.craftJobs.push({id:id(),recipe:i,qty,remaining:qty,duration,start:startAt,end:startAt+duration});log(`Queued ${r[0]} ×${qty}.`);save();render()}
function cancelCraftJob(jid){const index=s.craftJobs.findIndex(j=>j.id===jid);if(index<0)return;const j=s.craftJobs[index],r=recipes[j.recipe];if(r){const remaining=Math.max(1,j.remaining||j.qty||1);Object.entries(r[3]).forEach(([k,v])=>s.materials[k]=(s.materials[k]||0)+v*remaining);log(`Cancelled ${r[0]} ×${remaining}. Materials refunded.`)}s.craftJobs.splice(index,1);normalizeCraftQueue();save();render();notify('Craft group cancelled and remaining materials refunded.','good')}

function finishCraftJob(j){
  const r=recipes[j.recipe];
  if(!r)return;
  const outputResource=r[5]?.outputResource;
  if(r[1]==='Material'&&outputResource){
    const amount=Math.max(1,Math.floor(r[5]?.outputQty||1));
    const added=addStoredResource(outputResource,amount);
    trackQuestProgress('craft',r[0],1);
    log(`Finished ${r[0]} · ${added} ${RESOURCE_NAMES[outputResource]||outputResource}.`);
    return;
  }
  const it=makeSpecificItem(r[1],r[2],r[4]);
  applyRecipeModifiers(it,r[5]||{});
  it.name=r[0];
  it.recipeIndex=j.recipe;
  receiveInventoryItem(it,'craft');
  const smithXp=Math.round(recipeSmithXp(r)*(1+.10*(s.up.smith||0)));grantSmithXp(smithXp);
  trackQuestProgress('craft',it.name,1);
  log('Finished crafting '+it.name+' ['+it.rarity+'] · +'+smithXp+' Smithing XP.');
}

function completeCrafting(){if(!s.craftJobs.length)return false;let changed=false;const now=Date.now();while(s.craftJobs.length){const first=s.craftJobs[0];if(now<first.end)break;finishCraftJob(first);first.remaining=Math.max(0,(first.remaining||first.qty||1)-1);changed=true;if(first.remaining>0){first.start=first.end;first.end=first.start+first.duration;continue}s.craftJobs.shift()}if(changed){normalizeCraftQueue();save()}return changed}

function cookingXpNeeded(level){return Math.round(55*Math.pow(Math.max(1,level),1.75))}
function cookingDuration(meal){return Math.max(5000,Math.round((meal.duration||20)*1000*Math.pow(.88,s.up.craftSpeed||0)))}
function normalizeCookingQueue(){
  if(!s?.cookingJobs?.length)return;
  let cursor=Date.now();
  s.cookingJobs=s.cookingJobs.filter(j=>MEALS[j.meal]).map(j=>{j.qty=Math.max(1,Math.floor(j.qty||j.remaining||1));j.remaining=Math.max(1,Math.floor(j.remaining||j.qty||1));j.duration=j.duration||cookingDuration(MEALS[j.meal]);return j});
  s.cookingJobs.forEach((j,index)=>{if(index===0){j.start=j.start||cursor;j.end=j.end||j.start+j.duration;cursor=Math.max(cursor,j.end)+(j.remaining-1)*j.duration}else{j.start=cursor;j.end=j.start+j.duration;cursor=j.end+(j.remaining-1)*j.duration}});
}
function maxCookQuantity(meal){const amounts=Object.entries(meal?.cost||{}).map(([k,v])=>v>0?Math.floor((s.materials[k]||0)/v):99);return Math.max(0,Math.min(99,amounts.length?Math.min(...amounts):99))}
function cookMeal(mealId,qty=1){
  const meal=MEALS[mealId];if(!meal)return;
  if((s.cooking?.level||1)<meal.level)return notify('Requires Cooking level '+meal.level+'.');
  qty=clamp(Math.floor(Number(qty)||1),1,99);const max=maxCookQuantity(meal);
  if(max<qty)return notify(`You only have ingredients for ${max} serving${max===1?'':'s'}.`);
  Object.entries(meal.cost).forEach(([k,v])=>s.materials[k]-=v*qty);
  const duration=cookingDuration(meal),now=Date.now();let startAt=now;
  if(s.cookingJobs.length){const tail=s.cookingJobs[s.cookingJobs.length-1];startAt=Math.max(now,(tail.end||now)+(Math.max(1,tail.remaining||tail.qty||1)-1)*(tail.duration||duration))}
  s.cookingJobs.push({id:id(),meal:mealId,qty,remaining:qty,duration,start:startAt,end:startAt+duration});
  log(`Queued ${meal.name} ×${qty}.`);save();renderCooking();
}
function cancelCookingJob(jid){
  const index=s.cookingJobs.findIndex(j=>j.id===jid);if(index<0)return;
  const j=s.cookingJobs[index],meal=MEALS[j.meal],remaining=Math.max(1,j.remaining||j.qty||1);
  if(meal)Object.entries(meal.cost).forEach(([k,v])=>s.materials[k]=(s.materials[k]||0)+v*remaining);
  s.cookingJobs.splice(index,1);normalizeCookingQueue();save();renderCooking();notify('Cooking cancelled and remaining ingredients refunded.','good');
}
function grantCookingXp(amount){
  s.cooking=Object.assign({level:1,xp:0},s.cooking||{});s.cooking.xp+=Math.max(0,Math.round(amount||0));
  let need=cookingXpNeeded(s.cooking.level);
  while(s.cooking.xp>=need){s.cooking.xp-=need;s.cooking.level++;log('Cooking reached level '+s.cooking.level+'.');need=cookingXpNeeded(s.cooking.level)}
}
function finishCookingJob(j){const meal=MEALS[j.meal];if(!meal)return;s.meals[j.meal]=(s.meals[j.meal]||0)+1;grantCookingXp(meal.xp||1);trackQuestProgress('cook',j.meal,1);log('Finished cooking '+meal.name+' · +'+(meal.xp||1)+' Cooking XP.')}
function completeCooking(){
  if(!s?.cookingJobs?.length)return false;let changed=false;const now=Date.now();
  while(s.cookingJobs.length){const first=s.cookingJobs[0];if(now<first.end)break;finishCookingJob(first);first.remaining=Math.max(0,(first.remaining||first.qty||1)-1);changed=true;if(first.remaining>0){first.start=first.end;first.end=first.start+first.duration;continue}s.cookingJobs.shift()}
  if(changed){normalizeCookingQueue();save()}return changed;
}

const UPGRADE_RESOURCE_PATHS={
quarters:[['Wood','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Stone','Hardwood','Crystal','Ironwood','GlacialOre','Obsidian','AetherCrystal','LeviathanScale','Gearheart','Endstone']],
party:[['Wood','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Cloth','Hardwood','Crystal','SpiritBark','StormGlass','AstralThread','AetherCrystal','CelestialSilk','Dreamwood','Godthread']],
recruit:[['Cloth','Iron','Silver','Mithril','Nightshade','AetherCrystal','Voidstone','AngelicSigil','DreamEssence','StarlightCore'],['Leather','Bone','ManaBloom','SpiritBark','DeepPearl','AstralThread','AetherCrystal','CelestialSilk','NightmareBloom','Godthread']],
smith:[['CopperOre','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Stone','Hardwood','Crystal','Ironwood','GlacialOre','Obsidian','AetherCrystal','LeviathanScale','Gearheart','Endstone']],
craftSpeed:[['CopperOre','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Wood','Hardwood','Crystal','Sunstone','StormGlass','AetherCrystal','AstralThread','AngelicSigil','ChronoShard','StarlightCore']],
training:[['Leather','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Herbs','Bone','ManaBloom','SpiritBark','Nightshade','CinderBloom','AetherCrystal','LeviathanScale','NightmareBloom','Endstone']],
storage:[['Wood','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Stone','Hardwood','Crystal','Ironwood','GlacialOre','Obsidian','AetherCrystal','TrenchPearl','Gearheart','Endstone']],
afkHarvest:[['Wood','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Cloth','Hardwood','ManaBloom','SpiritBark','Nightshade','AstralThread','AetherCrystal','CelestialSilk','DreamEssence','Godthread']],
gatherParty:[['Leather','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Wood','Hardwood','Crystal','Ironwood','StormGlass','AetherCrystal','AstralThread','LeviathanScale','Dreamwood','Worldroot']],
board:[['Cloth','Iron','Silver','Mithril','StarMetal','CinderOre','Voidstone','Adamantite','Orichalcum','Eternium'],['Wood','Bone','ManaBloom','Sunstone','DeepPearl','AstralThread','AetherCrystal','AngelicSigil','ChronoShard','StarlightCore']]
};
function upgradeResourceCost(k,l){
  const upgrade=upgrades.find(x=>x[0]===k),max=Math.max(2,upgrade?.[4]||7);
  const tier=clamp(1+Math.floor(l*9/(max-1)),1,10),index=tier-1;
  const paths=UPGRADE_RESOURCE_PATHS[k]||UPGRADE_RESOURCE_PATHS.quarters;
  const primary=paths[0][index],secondary=paths[1][index];
  const base=Math.max(3,Math.round((10+Math.pow(l+1,1.35)*5)/(1+(tier-1)*.3)));
  const out={};
  out[primary]=(out[primary]||0)+base;
  if(l>=1)out[secondary]=(out[secondary]||0)+Math.max(2,Math.round(base*.55));
  return out;
}
function hasUpgradeResources(cost){return Object.entries(cost).every(([k,v])=>(s.materials[k]||0)>=v)}
function upgradeResourceText(cost){return Object.entries(cost).map(([k,v])=>`${v} ${RESOURCE_NAMES[k]||k}`).join(' · ')}
function upgradeResourceProgressHtml(cost){
  return Object.entries(cost).map(([k,need])=>{
    const have=s.materials[k]||0;
    return `<span class="chip ${have>=need?'enough':'missing'}">${gameIcon('resource',k,'','gameAsset')} ${have}/${need} ${RESOURCE_NAMES[k]||k}</span>`;
  }).join('');
}

function upgradeCost(u,l){
  return Math.max(1,Math.round(u[3]*Math.pow(u[0]==='quarters'?1.28:1.72,l)));
}
function upgrade(k){
  let u=upgrades.find(x=>x[0]===k),l=s.up[k]||0,c=upgradeCost(u,l),rc=upgradeResourceCost(k,l);
  if(l>=u[4])return;
  if(s.gold<c)return notify('Not enough gold.');
  if(!hasUpgradeResources(rc))return notify('Missing upgrade resources: '+upgradeResourceText(rc)+'.');
  s.gold-=c;
  Object.entries(rc).forEach(([r,v])=>s.materials[r]-=v);
  s.up[k]=l+1;
  setOnboardingFlag('upgradePurchased');
  if(k==='quarters')s.memberCap=Math.max(s.members.length,4+s.up.quarters);if(k==='recruit')s.applicantCap=applicantBatchSize();
  save();render();
}
function statName(k){
  return {str:'STR',dex:'DEX',int:'INT',def:'DEF',mdef:'MDEF',block:'Block',hp:'HP',regen:'Regen',mana:'Mana',manaRegen:'Mana Regen',attackSpeed:'Attack Speed',lifesteal:'Lifesteal',fire:'Fire Res',ice:'Ice Res',poison:'Poison Res',lightning:'Lightning Res',holy:'Holy Res',dark:'Dark Res'}[k]||String(k).toUpperCase();
}
function colorizeStatTerms(root=document){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      const p=node.parentElement;
      if(!p||['SCRIPT','STYLE','INPUT','TEXTAREA','SELECT','OPTION'].includes(p.tagName))return NodeFilter.FILTER_REJECT;
      if(p.closest('.statSTR,.statDEX,.statINT'))return NodeFilter.FILTER_REJECT;
      return /\b(STR|DEX|INT)\b/.test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }
  });
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const frag=document.createDocumentFragment();
    node.nodeValue.split(/\b(STR|DEX|INT)\b/g).forEach(piece=>{
      if(piece==='STR'||piece==='DEX'||piece==='INT'){
        const span=document.createElement('span');span.className='stat'+piece;span.textContent=piece;frag.appendChild(span);
      }else frag.appendChild(document.createTextNode(piece));
    });
    node.parentNode.replaceChild(frag,node);
  });
}
function itemCompareValues(it){
  const out={power:it?.power||0,weaponPower:it?.slot==='Weapon'?(it.weaponPower||0):0,hp:0,str:0,dex:0,int:0,def:0,mdef:0,block:itemBlockValue(it),regen:0,mana:0,manaRegen:0,attackSpeed:0,lifesteal:0,fire:0,ice:0,poison:0,lightning:0,holy:0,dark:0,armorPen:0,parry:0,critChance:0,critDamage:0,accuracy:0,elementalDamage:0,healingPower:0,statusChance:0,cleave:0,counter:0};
  if(!it)return out;
  const add=(k,v)=>{if(k in out)out[k]+=(Number(v)||0)};
  add(it.stat,it.value);
  add(it.secondaryStat,it.secondaryValue);
  add(it.tertiaryStat,it.tertiaryValue);
  Object.entries(it.extraStats||{}).forEach(([k,v])=>add(k,v));
  (it.runes||[]).forEach(id=>{const r=RUNES[id];if(r)add(r.stat,r.value)});
  out.armorPen=it.armorPen||0;
  out.parry=it.parry||0;
  out.critChance=it.weaponCritChance||0;
  out.critDamage=it.critDamage||0;
  out.accuracy=it.accuracy||0;
  out.elementalDamage=it.elementalDamage||0;
  out.healingPower=it.healingPower||0;
  out.statusChance=it.statusChance||0;
  out.cleave=it.cleave||0;
  out.counter=it.counter||0;
  return out;
}
function equipComparison(newItem,oldItem){
  const a=itemCompareValues(newItem),b=itemCompareValues(oldItem);
  const labels={power:'Power',weaponPower:'Attack',hp:'HP',str:'STR',dex:'DEX',int:'INT',def:'DEF',mdef:'MDEF',block:'Block',regen:'Regen',mana:'Mana',manaRegen:'Mana Regen',attackSpeed:'Attack Speed',lifesteal:'Lifesteal',fire:'Fire Res',ice:'Ice Res',poison:'Poison Res',lightning:'Lightning Res',holy:'Holy Res',dark:'Dark Res',armorPen:'Armor Pen',parry:'Parry',critChance:'Crit Chance',critDamage:'Crit Damage',accuracy:'Accuracy',elementalDamage:'Elemental Damage',healingPower:'Healing Power',statusChance:'Status Chance',cleave:'Cleave',counter:'Counter'};
  const percent=new Set(['lifesteal','attackSpeed','fire','ice','poison','lightning','holy','dark','armorPen','parry','critChance','critDamage','accuracy','elementalDamage','healingPower','statusChance','cleave','counter']);
  const parts=[];
  Object.keys(labels).forEach(k=>{
    const d=(a[k]||0)-(b[k]||0);
    if(!d)return;
    const sign=d>0?'+':'';
    parts.push(`<span class="${d>0?'equipGain':'equipLoss'}">${labels[k]} ${sign}${d}${percent.has(k)?'%':''}</span>`);
  });
  return parts.length?`<div class="equipCompare">${parts.join('')}</div>`:`<div class="equipCompare"><span class="equipSame">No numerical stat change</span></div>`;
}
function runeBonusText(id){
  const r=RUNES[id];if(!r)return 'Unknown rune';
  const suffix=['lifesteal','fire','ice','poison','lightning','holy','dark'].includes(r.stat)?'%':'';
  return `+${r.value}${suffix} ${statName(r.stat)}`;
}
function runeSlotsHtml(it,compact=false){
  const cap=runeSlots(it),equipped=it.runes||[];
  if(cap<=0)return '';
  return `<div class="runeSlotRow ${compact?'compactRuneSlots':''}">${Array.from({length:cap},(_,i)=>{
    const id=equipped[i],r=id?RUNES[id]:null;
    return `<span class="runeSocket ${id?'filled':''}" title="${id?(r?.name||id)+' · '+runeBonusText(id):'Empty rune slot'}">${id?runeIcon(id,'gameAsset'):''}</span>`;
  }).join('')}</div>`;
}
function runeDetailsHtml(it){
  const ids=it.runes||[];
  if(!ids.length)return '<div class="muted">No runes socketed.</div>';
  return ids.map(id=>{const r=RUNES[id];return `<div class="runeDetailRow"><span>${runeIcon(id,'gameAsset')} <b>${r?.name||id}</b></span><span>${runeBonusText(id)}</span></div>`}).join('');
}
function itemProfileParts(it){
  if(it.slot==='Weapon')return[`${it.weaponType||'Weapon'} weapon`,`Scales with ${weaponScalingLabel(it)}`,`${elementIcon[it.damageType||'physical']} ${it.damageType||'physical'} damage`];
  if(it.slot==='Armor')return[`${armorClassForItem(it)} armor`];
  if(it.slot==='Ring')return['Ring'];
  if(it.slot==='Amulet'||it.slot==='Jewelry')return['Amulet'];
  return[it.slot||'Equipment'];
}
function itemStatParts(it){
  const parts=[];
  if(it.stat&&it.value!=null)parts.push(it.stat==='regen'?`+${it.value} HP / round`:it.stat==='manaRegen'?`+${it.value} Mana Regen`:it.stat==='lifesteal'?`${it.value}% lifesteal`:`+${it.value} ${statName(it.stat)}`);
  if(it.secondaryStat)parts.push(it.secondaryStat==='manaRegen'?`+${it.secondaryValue} Mana Regen`:it.secondaryStat==='attackSpeed'?`+${it.secondaryValue}% Attack Speed`:`+${it.secondaryValue} ${statName(it.secondaryStat)}`);
  if(it.tertiaryStat)parts.push(it.tertiaryStat==='manaRegen'?`+${it.tertiaryValue} Mana Regen`:it.tertiaryStat==='attackSpeed'?`+${it.tertiaryValue}% Attack Speed`:`+${it.tertiaryValue} ${statName(it.tertiaryStat)}`);
  Object.entries(it.extraStats||{}).forEach(([k,v])=>parts.push(`+${v}${['lifesteal','attackSpeed','fire','ice','poison','lightning','holy','dark'].includes(k)?'%':''} ${statName(k)}`));
  const block=itemBlockValue(it);if(block)parts.push(`+${block} Block`);
  if(it.damageBonus)parts.push(`+${Math.round(it.damageBonus*100)}% damage`);
  if(it.healBonus)parts.push(`+${Math.round(it.healBonus*100)}% healing`);
  if(it.itemCritBonus)parts.push(`+${Math.round(it.itemCritBonus*100)}% crit`);
  if(it.itemThreatBonus)parts.push(`+${it.itemThreatBonus.toFixed(2)} Threat`);
  if(it.itemPhysicalDodgeBonus)parts.push(`+${Math.round(it.itemPhysicalDodgeBonus*100)}% physical dodge`);
  if(it.itemMagicalDodgeBonus)parts.push(`+${Math.round(it.itemMagicalDodgeBonus*100)}% magic dodge`);
  if(it.mythicEffect)parts.push(`Mythic: ${it.mythicEffect}`);
  if(it.slot==='Weapon'){
    const w=weaponDefForItem(it);
    parts.unshift(`Attack ${it.weaponPower||0}`);
    parts.unshift(`Attack Speed ${weaponAttackTime(it.weaponTemplate||it.weaponType||it.name).toFixed(2)}s`);
    weaponSpecials(w||it).forEach(([k,v])=>parts.push(`+${Math.round(v*100)}% ${WEAPON_SPECIAL_LABELS[k]}`));
  }
  return parts;
}
function statText(it){
  const parts=[...itemStatParts(it),...itemProfileParts(it)];
  return parts.map(x=>`<span class="itemStatPart">${x}</span>`).join('<span class="itemStatSep"> · </span>');
}
function rarityClass(x){return String(x||'Common').toLowerCase()}
function fmt(ms){let z=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(z/60),q=z%60;return m?m+':'+String(q).padStart(2,'0'):q+'s'}
