// Modal/navigation wiring, timers, data loading, validation, and application bootstrap.
function syncWindowScrollLock(){
  const anyOpen=$('modal').classList.contains('on')||$('combatModal').classList.contains('on');
  document.body.classList.toggle('windowOpen',anyOpen);
}
function showModal(t,b){
  $('modalTitle').textContent=t;
  $('modalBody').innerHTML=b;
  $('modal').classList.add('on');
  colorizeStatTerms($('modalBody'));
  syncWindowScrollLock();
}
function closeModal(){
  $('modal').classList.remove('on');
  syncWindowScrollLock();
}
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
$('combatModal').addEventListener('click',e=>{if(e.target===$('combatModal'))closeCombat()});

document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{
  const p=b.dataset.p,access=featureAccess(p);
  if(!access.revealed)return notify(access.revealHint||'That feature has not been revealed yet.');
  if(access.locked)return notify(access.lockReason||'That feature is still locked.');
  document.querySelectorAll('.nav,.page').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');$(p).classList.add('on');if(p==='upgrades')renderUp();
});
$('rename').onclick=()=>{let n=prompt('Guild name',s.guild);if(n){s.guild=n.trim().slice(0,40);save();render()}};
$('exportSave').onclick=()=>{let a=document.createElement('a'),b=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});a.href=URL.createObjectURL(b);a.download='guildmaster-save.json';a.click()};
$('importSave').onclick=()=>{let i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=()=>{let r=new FileReader();r.onload=()=>{try{s=JSON.parse(r.result);save();load();ensure();syncDiscoveredResources();repairDeadBattles();syncMusic();render()}catch(e){notify('That save file is invalid.')}};r.readAsText(i.files[0])};i.click()};
$('reset').onclick=()=>showModal('Reset Progress',`<div class="card"><div class="name dangerText">Delete all progress?</div><div class="muted">This cannot be undone unless you exported a save first.</div><div class="modalActionRow"><button class="btn" onclick="confirmReset()">Reset Guild</button></div></div>`);
function confirmReset(){
  localStorage.removeItem('guildmaster-v1');
  localStorage.removeItem('guildmaster-v1-backup');
  s=fresh();ensure();save();closeModal();render();notify('Guild progress reset.','good');
}
let lastTimerTextUpdate=0;
function updateProgressUI(now=Date.now()){
  const updateText=now-lastTimerTextUpdate>=100;
  if(updateText)lastTimerTextUpdate=now;

  document.querySelectorAll('.timer').forEach(x=>{
    if(updateText)x.textContent=fmt(+x.dataset.end-now);
  });

  document.querySelectorAll('.progressFill[data-start]').forEach(x=>{
    const start=+x.dataset.start,end=+x.dataset.end,total=Math.max(1,end-start);
    const pct=clamp((now-start)/total*100,0,100);
    x.style.width=pct+'%';
    if(updateText){
      const label=x.closest('.progressWrap')?.querySelector('.progressMeta span:first-child');
      if(label)label.textContent=Math.floor(pct)+'%';
    }
  });
}
function refreshHarvestProgressUI(now=Date.now()){
  const cap=afkHarvestCap();
  document.querySelectorAll('[data-harvest-job]').forEach(fill=>{
    const j=s.harvestJobs.find(x=>x.id===+fill.dataset.harvestJob);if(!j)return;
    const area=HARVEST_AREAS.find(x=>x.id===j.areaId);if(!area)return;
    const card=fill.closest('[data-harvest-card]');
    const stash=Object.values(j.stash||{}).reduce((x,v)=>x+v,0);
    const capped=stash>=cap;
    card?.classList.toggle('cappedHarvest',capped);
    const label=card?.querySelector('[data-harvest-label]'),time=card?.querySelector('[data-harvest-time]');
    if(capped){
      fill.style.width='100%';
      if(label)label.textContent='CAP REACHED';
      if(time&&now-lastTimerTextUpdate<120)time.textContent='FULL';
    }else{
      const total=area.cycle*1000,start=j.lastTick||now;
      const elapsed=Math.max(0,now-start);
      const phase=elapsed%total;
      const pct=clamp(phase/total*100,0,100);
      fill.style.width=pct+'%';
      if(label)label.textContent='Next harvest';
      if(time&&now-lastTimerTextUpdate<120)time.textContent=fmt(total-phase);
    }
  });
}
function refreshCombatActionBars(now=Date.now()){
  if(!$('combatModal')?.classList.contains('on'))return;
  document.querySelectorAll('[data-combatant]').forEach(el=>{
    const side=el.dataset.combatSide,id=+(el.dataset.combatId||0);
    const x=findLiveCombatant(side,id);
    if(!x)return;

    const attack=el.querySelector('.attackFill');
    if(attack){
      const p=attackTimerProgress(x,side==='enemy',now);
      attack.style.width=(p*100).toFixed(3)+'%';
      attack.classList.toggle('ready',p>=.9999);
      const track=attack.closest('.attackTrack');
      if(track)track.title=`Attack · ${p>=.9999?'Ready':fmt(Math.max(0,(x.nextAttackAt||now)-now))}`;
    }

    if(side==='hero'){
      const bar=el.querySelector('.cooldownFill');
      const track=el.querySelector('.cooldownTrack');
      const type=bar?.dataset.cooldownType||track?.dataset.cooldownTrack||primaryActiveType(x);
      if(bar&&type){
        const progress=clamp(cooldownProgress(x,type,now),0,1);
        bar.style.width=(progress*100).toFixed(3)+'%';
        bar.classList.toggle('ready',progress>=.9999);
        if(track)track.title=`${activeName(type)} · ${progress>=.9999?'Ready':fmt(activeCooldownRemaining(x,type,now))}`;
      }
    }else{
      const castTrack=el.querySelector('.castTrack'),castFill=el.querySelector('.castFill'),castLabel=el.querySelector('.castLabel');
      if(castTrack){
        castTrack.style.display=x.cast?'block':'none';
        if(x.cast){
          const total=Math.max(1,x.cast.completeAt-x.cast.startedAt),progress=clamp((now-x.cast.startedAt)/total,0,1);
          if(castFill)castFill.style.width=(progress*100).toFixed(3)+'%';
          if(castLabel)castLabel.textContent=`${ENEMY_ABILITIES_DATA[x.cast.abilityId]?.name||'Casting'} · ${fmt(x.cast.completeAt-now)}`;
        }
      }
    }
  });
}
let timerAnimationErrorReported=false;
function updateFluidTimerBars(now=Date.now()){
  try{updateProgressUI(now)}catch(err){if(!timerAnimationErrorReported){console.error('Progress timer update failed.',err);timerAnimationErrorReported=true}}
  if(!window.GAME_DATA_READY||!s)return;
  try{refreshHarvestProgressUI(now)}catch(err){if(!timerAnimationErrorReported){console.error('Harvest timer update failed.',err);timerAnimationErrorReported=true}}
  try{refreshCombatActionBars(now)}catch(err){if(!timerAnimationErrorReported){console.error('Combat timer update failed.',err);timerAnimationErrorReported=true}}
}
function animateTimerBars(){
  const now=Date.now();
  try{updateFluidTimerBars(now)}finally{requestAnimationFrame(animateTimerBars)}
}
requestAnimationFrame(animateTimerBars);
// Independent fallback keeps bars fluid if an embedded browser pauses or loses
// its requestAnimationFrame callback while the page remains visible.
setInterval(()=>{if(!document.hidden)updateFluidTimerBars(Date.now())},50);
setInterval(()=>{
  if(!window.GAME_DATA_READY||!s)return;
  s.missions.forEach(m=>{stepBattle(m);if((m.type==='dungeon'||m.type==='raid')&&m.finiteStage>=m.maxFights&&!m.completed&&m.battle&&!m.battle.boss){console.error('Finite mission invariant failed',m);m.battle=makeBossBattle(m)}});
},100);
setInterval(()=>{
  if(!window.GAME_DATA_READY||!s)return;
  completeCrafting();
  processHarvesting();
  renderActive();
  renderCombat();
  refreshUpgradeResourceUI();
  renderProceduralQuestTimer();
},500);
setInterval(()=>{if(!window.GAME_DATA_READY||!s)return;renderInv();renderMarket();renderCraftQueue();renderCraft();if(workshopMode==='enchanting')renderEnchanting();renderResourcesLite();refreshUpgradeResourceUI();save()},5000);
function renderResourcesLite(){
  $('lv').textContent=s.level;$('gold').textContent=s.gold.toLocaleString();$('rep').textContent=s.rep.toLocaleString();
}
setInterval(()=>{if(window.GAME_DATA_READY&&s)save()},5000);
window.addEventListener('pagehide',()=>{if(!s)return;s.lastHiddenAt=Date.now();save()});
window.addEventListener('beforeunload',()=>{if(s)save()});
document.addEventListener('visibilitychange',()=>{
  if(!window.GAME_DATA_READY||!s)return;
  if(document.hidden){
    s.lastHiddenAt=Date.now();
    save();
  }else{
    const elapsed=s.lastHiddenAt?Date.now()-s.lastHiddenAt:0;
    s.lastHiddenAt=0;
    offlineCatchup(elapsed);
    render();
  }
});

async function loadExternalGameData(){
  const paths={
    assets:'data/assets.json',
    classes:'data/classes.json',
    elements:'data/elements.json',
    ui:'data/ui.json',
    contentTypes:'data/content-types.json',
    enemies:'data/enemies.json',
    archetypes:'data/enemy-archetypes.json',
    enemyAbilities:'data/abilities.json',
    expeditions:'data/areas/expeditions.json',
    dungeons:'data/areas/dungeons.json',
    raids:'data/areas/raids.json',
    harvesting:'data/areas/harvesting.json',
    items:'data/items.json',
    recipes:'data/recipes.json',
    subclasses:'data/subclasses.json',
    races:'data/races.json',
    resources:'data/resources.json',
    playerAbilities:'data/player-abilities.json'
  };
  const entries=await Promise.all(Object.entries(paths).map(async([key,url])=>{
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);
    return [key,await r.json()];
  }));
  const d=Object.fromEntries(entries);

  const assetData=d.assets||{};
  ASSET_CONFIG.base=assetData.assetBase||'';
  ASSET_CONFIG.version=String(assetData.assetVersion??'');
  ASSET_CONFIG.guildhallBackground=assetData.guildhallBackground||'';

  clearVisualRegistry();

  Object.entries(d.classes||{}).forEach(([name,obj])=>registerVisual('class',name,obj));
  Object.entries(d.subclasses||{}).forEach(([className,list])=>(list||[]).forEach(obj=>registerVisual('subclass',obj.id,obj)));
  Object.entries(d.enemies||{}).forEach(([name,obj])=>{
    registerVisual('enemy',name,obj);
    if(obj.boss)registerVisual('boss',name,obj);
  });
  Object.entries(d.elements||{}).forEach(([key,obj])=>registerVisual('element',key,obj));
  Object.entries(d.ui||{}).forEach(([key,obj])=>registerVisual('ui',key,obj));
  Object.entries(d.contentTypes||{}).forEach(([key,obj])=>registerVisual('activity',key,obj));

  const itemData=d.items||{};
  Object.entries(itemData.slotVisuals||{}).forEach(([key,obj])=>registerVisual('item',key,obj));
  Object.entries(itemData.weapons||{}).forEach(([name,obj])=>registerVisual('weapon',name,obj));
  Object.entries(itemData.runes||{}).forEach(([id,obj])=>registerVisual('rune',id,obj));

  Object.entries(d.resources?.resources||{}).forEach(([key,obj])=>registerVisual('resource',key,obj));
  (d.expeditions||[]).forEach(obj=>registerVisual('area',obj.id,obj));
  (d.harvesting||[]).forEach(obj=>registerVisual('harvest',obj.id,obj));

  Object.keys(classIcons).forEach(k=>delete classIcons[k]);
  Object.keys(d.classes||{}).forEach(name=>{
    classIcons[name]=gameIcon('class',name,iconFallback('class',name,name),'gameAsset');
  });
  Object.keys(elementIcon).forEach(k=>delete elementIcon[k]);
  Object.keys(d.elements||{}).forEach(key=>elementIcon[key]=gameIcon('element',key,d.elements[key]?.fallback||'','gameAsset'));
  Object.keys(itemIcons).forEach(k=>delete itemIcons[k]);
  Object.keys(itemData.slotVisuals||{}).forEach(key=>itemIcons[key]=gameIcon('item',key,itemData.slotVisuals[key]?.fallback||'◇','gameAsset itemAsset'));
  Object.keys(questIcons).forEach(k=>delete questIcons[k]);
  Object.keys(d.contentTypes||{}).forEach(key=>questIcons[key]=gameIcon('activity',key,d.contentTypes[key]?.fallback||'','gameAsset areaAsset'));

  Object.assign(ENEMIES_DATA,d.enemies||{});
  Object.assign(ENEMY_ARCHETYPES_DATA,d.archetypes||{});
  Object.assign(ENEMY_ABILITIES_DATA,d.enemyAbilities||{});
  Object.assign(SUBCLASSES,d.subclasses||{});
  Object.assign(RACES,d.races||{});
  RACE_NAMES.splice(0,RACE_NAMES.length,...Object.keys(RACES));

  Object.entries(itemData.weapons||{}).forEach(([name,w])=>{
    WEAPONS[name]={...w,icon:gameIcon('weapon',name,w.icon||'⚔️','gameAsset itemAsset')};
  });
  Object.assign(WEAPON_TYPE_MAP,itemData.weaponTypeMap||{});
  Object.assign(WEAPON_ATTACK_TIMES,itemData.weaponAttackTimes||{});
  Object.assign(CLASS_ATTACK_SPEED,itemData.classAttackSpeed||{});
  Object.assign(ARMOR_PROFILES,itemData.armorProfiles||{});
  Object.assign(RUNE_SLOTS,itemData.runeSlots||{});
  Object.assign(RUNES,itemData.runes||{});

  recipes.splice(0,recipes.length,...(d.recipes||[]));
  AREAS.splice(0,AREAS.length,...(d.expeditions||[]).map(a=>({...a,icon:gameIcon('area',a.id,a.icon||'🗺️','gameAsset areaAsset')})));
  DUNGEON_AREAS.splice(0,DUNGEON_AREAS.length,...(d.dungeons||[]));
  RAID_AREAS.splice(0,RAID_AREAS.length,...(d.raids||[]));
  HARVEST_AREAS.splice(0,HARVEST_AREAS.length,...(d.harvesting||[]).map(a=>({...a,icon:gameIcon('harvest',a.id,a.icon||'⛏️','gameAsset areaAsset')})));

  Object.keys(RESOURCE_NAMES).forEach(k=>delete RESOURCE_NAMES[k]);
  Object.entries(d.resources?.resources||{}).forEach(([key,obj])=>RESOURCE_NAMES[key]=obj.name||key);
  MARKET_BASIC_RESOURCES.splice(0,MARKET_BASIC_RESOURCES.length,...(d.resources?.marketBasic||[]));

  Object.assign(ACTIVE_MANA_COSTS,d.playerAbilities?.manaCosts||{});
  Object.assign(ACTIVE_COOLDOWNS,d.playerAbilities?.cooldowns||{});
  Object.assign(ACTIVE_DISPLAY_NAMES,d.playerAbilities?.displayNames||{});

  // Derived indexes contain no authored content; they are rebuilt from JSON.
  enemyPools.quest.splice(0,enemyPools.quest.length,...new Set(AREAS.flatMap(a=>a.enemyPool||[])));
  enemyPools.dungeon.splice(0,enemyPools.dungeon.length,...new Set(DUNGEON_AREAS.flatMap(a=>a.enemyPool||[])));
  enemyPools.raid.splice(0,enemyPools.raid.length,...new Set(RAID_AREAS.flatMap(a=>a.enemyPool||[])));
  Object.keys(BOSS_INFO.dungeon).forEach(k=>delete BOSS_INFO.dungeon[k]);
  Object.keys(BOSS_INFO.raid).forEach(k=>delete BOSS_INFO.raid[k]);
  Object.keys(BOSS_RESOURCE_SOURCE).forEach(k=>delete BOSS_RESOURCE_SOURCE[k]);
  BOSS_RESOURCES.clear();
  [['dungeon',DUNGEON_AREAS],['raid',RAID_AREAS]].forEach(([type,list])=>list.forEach(a=>{
    const e=ENEMIES_DATA[a.boss]||{},drop=(e.drops||[])[0];
    BOSS_INFO[type][a.boss]=[gameIcon('boss',a.boss,e.icon||'👑','gameAsset combatAsset'),drop];
    if(drop){BOSS_RESOURCE_SOURCE[drop]=a.boss;BOSS_RESOURCES.add(drop)}
  }));

  window.GAME_DATA_READY=true;
  console.info('Guildmaster data loaded. Each content object owns its image/background path; assets.json now contains global assets only.');
}
function validateContentData(){
  const warnings=[];
  const allAreas=[...AREAS,...DUNGEON_AREAS,...RAID_AREAS];
  const allEnemies=new Set(allAreas.flatMap(a=>[...(a.enemyPool||[]),...(a.boss?[a.boss]:[])]));

  allAreas.forEach(a=>{
    if(Object.prototype.hasOwnProperty.call(a,'resource'+'Drops'))warnings.push('Legacy area resource drop field still exists: '+a.name);
  });

  allEnemies.forEach(n=>{
    const e=ENEMIES_DATA[n];
    if(!e){warnings.push('Area references missing enemy: '+n);return}
    if(!e.drops?.length)warnings.push('Enemy has no resource drop: '+n);
    if(!ENEMY_ARCHETYPES_DATA[e.archetype])warnings.push('Enemy has missing archetype: '+n+' -> '+e.archetype);
    if(e.ability&&!ENEMY_ABILITIES_DATA[e.ability])warnings.push('Enemy has missing ability: '+n+' -> '+e.ability);
    (e.drops||[]).forEach(r=>{if(!RESOURCE_NAMES[r])warnings.push('Enemy drops undefined resource: '+n+' -> '+r)});
  });

  Object.entries(ENEMY_ABILITIES_DATA).forEach(([id,ability])=>{
    if(ability.status&&!STATUS_EFFECTS[ability.status])warnings.push('Enemy ability uses undefined status: '+id+' -> '+ability.status);
    if((ability.castTime||0)<0)warnings.push('Enemy ability has invalid cast time: '+id);
  });
  Object.entries(ENEMY_ARCHETYPES_DATA).forEach(([id,archetype])=>{
    if(!archetype.tacticalRole)warnings.push('Enemy archetype has no tactical role: '+id);
    if(!archetype.roleDescription)warnings.push('Enemy archetype has no tactical description: '+id);
    if(!archetype.counter)warnings.push('Enemy archetype has no counter recommendation: '+id);
    if(archetype.basicStatus&&!STATUS_EFFECTS[archetype.basicStatus])warnings.push('Enemy archetype uses undefined basic status: '+id+' -> '+archetype.basicStatus);
    if((archetype.protectorAura||0)<0||(archetype.protectorAura||0)>.6)warnings.push('Enemy archetype has invalid protector aura: '+id);
  });

  HARVEST_AREAS.forEach(a=>(a.resources||[]).forEach(r=>{
    if(!RESOURCE_NAMES[r[0]])warnings.push('Gathering area yields undefined resource: '+a.name+' -> '+r[0]);
  }));

  const sourced=new Set();
  HARVEST_AREAS.forEach(a=>(a.resources||[]).forEach(r=>sourced.add(r[0])));
  Object.values(ENEMIES_DATA).forEach(e=>(e.drops||[]).forEach(r=>sourced.add(r)));
  Object.keys(RESOURCE_NAMES).forEach(r=>{
    if(!sourced.has(r))warnings.push('Resource has no enemy/gathering source: '+r);
  });

  const used=new Set();
  recipes.forEach(r=>Object.keys(r[3]||{}).forEach(x=>{
    used.add(x);
    if(!RESOURCE_NAMES[x])warnings.push('Recipe requires undefined resource: '+r[0]+' -> '+x);
  }));
  Object.entries(RUNES).forEach(([id,r])=>Object.keys(r.cost||{}).forEach(x=>{
    used.add(x);
    if(!RESOURCE_NAMES[x])warnings.push('Rune requires undefined resource: '+id+' -> '+x);
  }));
  Object.keys(RESOURCE_NAMES).forEach(r=>{
    if(!used.has(r))warnings.push('Resource has no crafting/rune use: '+r);
  });

  if(warnings.length)console.warn('Guildmaster content audit:',warnings);
  else console.info('Guildmaster content audit passed: exact enemy/gathering sources, defined drops, and resource uses are complete.');
  return warnings;
}
async function bootstrapGame(){
  try{
    await loadExternalGameData();
  }catch(err){
    console.error('Guildmaster data load failed.',err);
    const main=document.querySelector('main');
    if(main)main.innerHTML=`<section class="page on"><div class="panel"><h2>Game data could not be loaded</h2><p>Guildmaster now loads authored content from <code>/data</code>. Run the included local server instead of opening index.html with file://.</p><pre style="white-space:pre-wrap">${String(err.message||err)}</pre></div></section>`;
    return;
  }
  load();ensure();syncDiscoveredResources();repairDeadBattles();syncMusic();validateContentData();render();setupGuildhallBackground();
  if(typeof initArenaOnline==='function')initArenaOnline();
}
bootstrapGame();
setInterval(()=>{
  if(!window.GAME_DATA_READY||!s)return;
  if(!s.recruits.length&&s.nextApplicantsAt&&Date.now()>=s.nextApplicantsAt){
    fillApplicants();save();render();
  }else if(document.getElementById('recruits')&&document.getElementById('recruits').closest('.page')?.classList.contains('active')){
    renderRec();
  }
},1000);

$('combatModal').addEventListener('click',e=>{
  if(!e.target.closest('.combatMini')&&!e.target.closest('#combatInspectPanel'))closeCombatInspector();
});

document.addEventListener('pointerdown',()=>{if(s?.musicEnabled)tryStartMusic()},{once:true});
document.addEventListener('keydown',()=>{if(s?.musicEnabled)tryStartMusic()},{once:true});
