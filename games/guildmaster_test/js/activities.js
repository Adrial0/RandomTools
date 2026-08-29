// Quest board, harvesting, expeditions, and party selection.
let areaMode='expedition';
function setAreaMode(mode,btn){
  if(mode==='harvest'){
    document.querySelector('[data-p="harvesting"]')?.click();
  }else{
    document.querySelector('[data-p="quests"]')?.click();
  }
}
const SKILL_NAMES={woodcutting:'Woodcutting',mining:'Mining',fishing:'Fishing',harvesting:'Harvesting',hunting:'Hunting'};
const QUEST_BOARD_REFRESH_MS=30*60*1000;
const QUEST_DIFFICULTIES=[
  {id:'easy',label:'Routine',mult:.75,reward:.75},
  {id:'normal',label:'Standard',mult:1,reward:1},
  {id:'hard',label:'Difficult',mult:1.35,reward:1.55},
  {id:'elite',label:'Elite',mult:1.7,reward:2.25}
];
function questDifficulty(){const r=Math.random();return r<.18?QUEST_DIFFICULTIES[3]:r<.46?QUEST_DIFFICULTIES[2]:r<.82?QUEST_DIFFICULTIES[1]:QUEST_DIFFICULTIES[0]}
function questGuildTier(){return clamp(1+Math.floor(Math.max(0,(s.level||1)-1)/10),1,10)}
function questWeaponReward(diff){
  const chance=diff.id==='elite'?.72:diff.id==='hard'?.38:diff.id==='normal'?.14:.05;
  if(Math.random()>=chance)return null;
  const tier=questGuildTier();
  let pool=recipes.map((r,i)=>({r,i})).filter(x=>x.r[1]==='Weapon'&&x.r[4]>=Math.max(1,tier-1)&&x.r[4]<=Math.min(10,tier+1));
  if(!pool.length)pool=recipes.map((r,i)=>({r,i})).filter(x=>x.r[1]==='Weapon');
  const chosen=pick(pool);if(!chosen)return null;
  const rarity=(diff.id==='elite'||(diff.id==='hard'&&Math.random()<.55))?'Rare':'Uncommon';
  const [name,slot,specific,,rtier]=chosen.r,it=makeSpecificItem(slot,specific,rtier,rarity);
  applyRecipeModifiers(it,chosen.r[5]||{});it.name=name;it.recipeIndex=chosen.i;return it;
}
function questRewardFor(diff,type){
  const base=70+(s.level||1)*38,typeMult=type==='boss'?2.2:type==='craft'?1.25:type==='cook'?1.2:type==='kill'?1.15:1;
  const rewardDiff=type==='boss'&&diff.id!=='elite'?QUEST_DIFFICULTIES[2]:diff;
  return{gold:Math.round(base*diff.reward*typeMult),item:questWeaponReward(rewardDiff)};
}
function makeGatherQuest(diff){
  let pool=HARVEST_AREAS.filter(a=>harvestAreaUnlocked(a)&&a.req<=Math.max(3,(s.level||1)+3));if(!pool.length)pool=HARVEST_AREAS.filter(harvestAreaUnlocked).slice(0,5);
  const a=pick(pool),resource=a.resources[0][0],target=Math.max(10,Math.round((22+(s.level||1)*3)*diff.mult/5)*5);
  return{kind:'gather',key:resource,title:`Gather ${RESOURCE_NAMES[resource]||resource}`,desc:`Gather ${target} ${RESOURCE_NAMES[resource]||resource}.`,target,progress:0,source:a.name};
}
function makeKillQuest(diff){
  let areas=AREAS.filter(a=>a.level<=Math.max(1,(s.level||1)+6));if(!areas.length)areas=[AREAS[0]];
  const area=pick(areas),enemy=pick(area.enemyPool),target=Math.max(5,Math.round((10+(s.level||1)*1.6)*diff.mult));
  return{kind:'kill',key:enemy,title:`Hunt ${enemy}`,desc:`Defeat ${target} ${enemy}${target===1?'':'s'}.`,target,progress:0,source:area.name};
}
function makeCraftQuest(diff){
  const maxTier=questGuildTier();
  let pool=recipes.map((r,i)=>({r,i})).filter(x=>x.r[4]<=maxTier&&recipeSmithLevel(x.r)<=(s.smithing?.level||1));
  if(!pool.length)pool=recipes.map((r,i)=>({r,i})).filter(x=>x.r[4]===1);
  const chosen=pick(pool),target=Math.max(2,Math.round((3+(s.level||1)*.45)*diff.mult));
  return{kind:'craft',key:chosen.r[0],recipeIndex:chosen.i,title:`Craft ${chosen.r[0]}`,desc:`Craft ${target} ${chosen.r[0]}.`,target,progress:0,source:'Workshop'};
}
function makeCookingQuest(diff){
  let pool=Object.entries(MEALS).filter(([,meal])=>(meal.level||1)<=(s.cooking?.level||1));
  if(!pool.length)pool=Object.entries(MEALS).filter(([,meal])=>(meal.level||1)===1);
  const chosen=pick(pool);if(!chosen)return null;
  const [mealId,meal]=chosen,target=clamp(Math.round((2+(s.level||1)*.28)*diff.mult),2,15);
  return{kind:'cook',key:mealId,title:`Prepare ${meal.name}`,desc:`Cook ${target} serving${target===1?'':'s'} of ${meal.name}.`,target,progress:0,source:'Guild Kitchens'};
}
function makeBossQuest(diff){
  const options=[];if((s.level||1)>=3)DUNGEON_AREAS.forEach(a=>options.push({type:'dungeon',a}));if((s.level||1)>=6)RAID_AREAS.forEach(a=>options.push({type:'raid',a}));
  if(!options.length)return null;const p=pick(options);
  return{kind:'boss',key:p.a.boss,title:`Defeat ${p.a.boss}`,desc:`Defeat ${p.a.boss} in ${p.a.name}.`,target:1,progress:0,source:p.a.name,contentType:p.type};
}
function generateProceduralQuest(){
  const diff=questDifficulty(),kinds=['gather','kill','craft','cook'];if((s.level||1)>=3)kinds.push('boss');
  let kind=(diff.id==='elite'&&(s.level||1)>=3&&Math.random()<.55)?'boss':pick(kinds);
  let obj=kind==='boss'?makeBossQuest(diff):kind==='craft'?makeCraftQuest(diff):kind==='cook'?makeCookingQuest(diff):kind==='kill'?makeKillQuest(diff):makeGatherQuest(diff);
  if(!obj){kind='kill';obj=makeKillQuest(diff)}
  return{id:id(),difficulty:diff.id,difficultyLabel:diff.label,...obj,reward:questRewardFor(diff,kind),claimed:false,createdAt:Date.now()};
}
function generateQuestBoard(){
  const offers=[],seen=new Set();let safety=0,bossCount=0;
  while(offers.length<6&&safety++<120){
    let q=generateProceduralQuest();
    if(q.kind==='boss'&&bossCount>=1)continue;
    const sig=q.kind+':'+q.key;
    if(seen.has(sig))continue;
    seen.add(sig);
    if(q.kind==='boss')bossCount++;
    offers.push(q);
  }
  s.questBoard={nextRefresh:Date.now()+QUEST_BOARD_REFRESH_MS,offers};save();
}
function normalizeQuestBoardBossLimit(){
  if(!s.questBoard||!Array.isArray(s.questBoard.offers))return false;
  let bossSeen=false,changed=false;
  const kept=[];
  s.questBoard.offers.forEach(q=>{
    if(q.kind!=='boss'){kept.push(q);return}
    if(!bossSeen){bossSeen=true;kept.push(q)}
    else changed=true;
  });
  const seen=new Set(kept.map(q=>q.kind+':'+q.key));
  let safety=0;
  while(kept.length<6&&safety++<100){
    const q=generateProceduralQuest();
    if(q.kind==='boss'&&bossSeen)continue;
    const sig=q.kind+':'+q.key;
    if(seen.has(sig))continue;
    seen.add(sig);
    if(q.kind==='boss')bossSeen=true;
    kept.push(q);changed=true;
  }
  if(changed)s.questBoard.offers=kept;
  return changed;
}
function ensureQuestBoard(){
  if(!s.questBoard||!Array.isArray(s.questBoard.offers)||!s.questBoard.offers.length||Date.now()>=(s.questBoard.nextRefresh||0)){
    generateQuestBoard();
    return;
  }
  if(normalizeQuestBoardBossLimit())save();
}
function trackQuestProgress(kind,key,amount=1,extra={}){
  ensureQuestBoard();let changed=false;
  s.questBoard.offers.forEach(q=>{if(q.claimed||q.kind!==kind||q.key!==key||q.progress>=q.target)return;if(kind==='boss'&&q.contentType&&extra.contentType&&q.contentType!==extra.contentType)return;q.progress=Math.min(q.target,(q.progress||0)+amount);changed=true});
  if(changed)save();
}
function claimProceduralQuest(qid){
  ensureQuestBoard();const q=s.questBoard.offers.find(x=>x.id===qid);if(!q||q.claimed)return;
  if((q.progress||0)<q.target)return notify('That quest is not complete yet.');
  s.gold+=(q.reward?.gold||0);let itemText='';
  if(q.reward?.item){receiveInventoryItem(q.reward.item,'quest');itemText=` and ${q.reward.item.rarity} ${q.reward.item.name}`}
  q.claimed=true;log(`Quest completed: ${q.title}. Reward: ${q.reward?.gold||0} gold${itemText}.`);save();renderProceduralQuests();renderInv();notify(`Quest claimed: ${q.reward?.gold||0} gold${itemText}.`,'good');
}
function questKindLabel(q){return q.kind==='gather'?'Gathering':q.kind==='kill'?'Hunting':q.kind==='craft'?'Crafting':q.kind==='cook'?'Cooking':'Boss Hunt'}
function renderProceduralQuestTimer(){if(!$('questBoardTimer'))return;ensureQuestBoard();$('questBoardTimer').textContent='Refresh in '+fmt(Math.max(0,(s.questBoard.nextRefresh||0)-Date.now()))}
function renderProceduralQuests(){
  if(!$('proceduralQuestList'))return;ensureQuestBoard();renderProceduralQuestTimer();
  $('proceduralQuestList').innerHTML=s.questBoard.offers.map(q=>{const pct=clamp((q.progress||0)/Math.max(1,q.target)*100,0,100),complete=(q.progress||0)>=q.target,item=q.reward?.item;
    return `<div class="card questContract ${complete?'complete':''}"><div class="questContractTop"><div><div class="name">${q.title}</div><div class="muted">${questKindLabel(q)} · ${q.source||'Guild Contract'}</div></div><span class="questDifficulty ${q.difficulty}">${q.difficultyLabel}</span></div><div class="questObjective">${q.desc}</div><div class="progressWrap"><div class="progressMeta"><span>${Math.min(q.progress||0,q.target)} / ${q.target}</span><span>${complete?'Complete':Math.floor(pct)+'%'}</span></div><div class="progressTrack"><div class="progressFill" style="width:${pct}%"></div></div></div><div class="questRewardRow"><span class="chip">${q.reward?.gold||0} gold</span>${item?`<span class="chip ${rarityClass(item.rarity)}">${item.rarity} ${item.name}</span>`:''}</div><div class="questClaimRow"><button class="btn ${complete&&!q.claimed?'gold':''}" ${!complete||q.claimed?'disabled':''} onclick="claimProceduralQuest(${q.id})">${q.claimed?'Claimed':complete?'Claim Reward':'In Progress'}</button></div></div>`}).join('');
}

function resourceCapacity(){
  const caps=[200,1000,3000,8000,16000,26000,40000,60000,90000,130000,200000];
  return caps[Math.min(s.up.storage||0,caps.length-1)];
}
function resourceCount(){return Object.values(s.materials||{}).reduce((a,v)=>a+(Number(v)||0),0)}
function resourceSpace(){return Math.max(0,resourceCapacity()-resourceCount())}
function afkHarvestCap(){return 20+(s.up.afkHarvest||0)*20}
function gatheringPartySize(){return 2+(s.up.gatherParty||0)}
function skillXpNeeded(level){return 20+(level-1)*15}
function gatheringSkill(h,key){if(!h.skills)h.skills={};if(!h.skills[key])h.skills[key]={level:1,xp:0};return h.skills[key]}
function grantSkillXp(h,key,amount=1){const sk=gatheringSkill(h,key);sk.xp+=amount*raceGatheringXpMult(h,key);let need=skillXpNeeded(sk.level);while(sk.xp>=need){sk.xp-=need;sk.level++;need=skillXpNeeded(sk.level)}}
function gatheringBonusChance(level){return Math.min(.35,Math.max(0,level-1)*.015)}
function addStoredResource(k,amount){const add=Math.max(0,Math.min(amount,resourceSpace()));if(add){s.materials[k]=(s.materials[k]||0)+add;markResourceFound(k)}return add}
function harvestAreaTier(area){return Math.max(1,Math.min(...(area?.resources||[]).map(x=>resourceTier(x[0]))))}
function harvestAreaUnlocked(area){
  const tier=harvestAreaTier(area);
  return tier<=1||(s.expeditionGates||[]).includes(tier-1);
}
function harvestAreaLockText(area){return `Clear the Tier ${tierLabel(harvestAreaTier(area)-1)} expedition boss to unlock this gathering area.`}

function weightedResource(list){
  const total=list.reduce((a,x)=>a+x[1],0);
  let roll=Math.random()*total;
  for(const x of list){roll-=x[1];if(roll<=0)return x[0]}
  return list[list.length-1][0];
}
function openHarvestPicker(areaId){
  const a=HARVEST_AREAS.find(x=>x.id===areaId);if(!a)return;
  if(!harvestAreaUnlocked(a))return notify(harvestAreaLockText(a));
  if(harvestLocationOccupied(areaId))return notify('A gathering party is already working at '+a.name+'.');
  const available=s.members.filter(x=>!x.busy&&gatheringSkill(x,a.skill).level>=a.req);
  if(!available.length)return notify('No available guild members meet '+SKILL_NAMES[a.skill]+' Lv. '+a.req+'.');
  showModal('Choose Harvesting Crew',`<div class="card"><div class="name">${a.icon} ${a.name}</div>
    <div class="muted">${SKILL_NAMES[a.skill]} Lv. ${a.req} required · choose up to ${gatheringPartySize()} workers.</div>
    <div class="party" id="harvestPartyPicker" style="margin-top:10px">${available.map(x=>`<button class="partyMember" data-h="${x.id}" onclick="toggleHarvestMember(this)"><span class="miniClass">${classIcons[x.class]}</span><span>${x.name} · ${SKILL_NAMES[a.skill]} Lv. ${gatheringSkill(x,a.skill).level}</span></button>`).join('')}</div>
    <div class="modalActionRow"><button class="btn gold" onclick="confirmHarvestParty('${areaId}')">Start Harvesting</button></div></div>`);
}
function toggleHarvestMember(btn){
  const selected=document.querySelectorAll('#harvestPartyPicker .partyMember.on');
  if(!btn.classList.contains('on')&&selected.length>=gatheringPartySize())return notify('Maximum gathering party size is '+gatheringPartySize()+'.');
  btn.classList.toggle('on');
}
function confirmHarvestParty(areaId){
  const ids=[...document.querySelectorAll('#harvestPartyPicker .partyMember.on')].map(x=>+x.dataset.h);
  if(!ids.length)return notify('Choose at least one guild member.');
  const a=HARVEST_AREAS.find(x=>x.id===areaId);if(!a)return;
  if(!harvestAreaUnlocked(a))return notify(harvestAreaLockText(a));
  if(harvestLocationOccupied(areaId))return notify('A gathering party is already working at '+a.name+'.');
  const crew=ids.map(id=>s.members.find(x=>x.id===id)).filter(Boolean);
  if(crew.some(x=>x.busy))return notify('One of those guild members is already busy.');
  if(crew.some(x=>gatheringSkill(x,a.skill).level<a.req))return notify('A selected member does not meet the skill requirement.');
  crew.forEach(x=>x.busy=true);
  s.harvestJobs.push({id:id(),areaId,party:crew.map(x=>x.id),start:Date.now(),lastTick:Date.now(),cycles:0,stash:{}});
  setOnboardingFlag('harvestStarted');
  closeModal();save();render();
  const harvestBtn=[...document.querySelectorAll('.areaMode')].find(x=>x.textContent.includes('Harvest'));
  setAreaMode('harvest',harvestBtn);
}
function processHarvesting(){
  const now=Date.now(),cap=afkHarvestCap();let changed=false;
  s.harvestJobs.forEach(j=>{
    if(j.stopped)return;
    const area=HARVEST_AREAS.find(x=>x.id===j.areaId);if(!area)return;
    if(!harvestAreaUnlocked(area)){
      if(j.progressLocked!==true){j.progressLocked=true;changed=true}
      j.lastTick=now;
      return;
    }
    if(j.progressLocked){j.progressLocked=false;changed=true}
    let stashCount=Object.values(j.stash||{}).reduce((x,v)=>x+v,0);

    if(stashCount>=cap){
      if(j.capped!==true){j.capped=true;changed=true}
      j.lastTick=now;
      return;
    }
    if(j.capped!==false){j.capped=false;changed=true}

    const elapsed=now-(j.lastTick||j.start||now),cycles=Math.floor(elapsed/(area.cycle*1000));
    if(cycles<=0)return;
    const crew=j.party.map(id=>s.members.find(x=>x.id===id)).filter(Boolean);

    for(let c=0;c<cycles;c++){
      for(const member of crew){
        if(stashCount>=cap)break;
        const sk=gatheringSkill(member,area.skill),k=weightedResource(area.resources);
        j.stash[k]=(j.stash[k]||0)+1;stashCount++;markResourceFound(k);trackQuestProgress('gather',k,1);
        if(stashCount<cap&&Math.random()<gatheringBonusChance(sk.level)){j.stash[k]=(j.stash[k]||0)+1;stashCount++;trackQuestProgress('gather',k,1)}
        grantSkillXp(member,area.skill,(area.xp||1)*2);
      }
      if(stashCount>=cap)break;
      j.cycles++;
    }

    if(stashCount>=cap){j.capped=true;j.lastTick=now}
    else{j.capped=false;j.lastTick+=(cycles*area.cycle*1000)}
    changed=true;
  });
  if(changed)save();
}
function collectHarvest(jid,quiet=false){
  const j=s.harvestJobs.find(x=>x.id===jid);if(!j)return;
  let collected=0,left=0;
  Object.entries(j.stash||{}).forEach(([k,v])=>{const added=addStoredResource(k,v);collected+=added;j.stash[k]=v-added;left+=j.stash[k];if(j.stash[k]<=0)delete j.stash[k]});
  j.capped=Object.values(j.stash||{}).reduce((a,v)=>a+v,0)>=afkHarvestCap();if(collected&&!j.capped)j.lastTick=Date.now();save();renderHarvestActive();renderInv();renderCraft();
  if(!quiet&&collected)notify('Collected '+collected+' resources.','good');
  if(!quiet&&left)notify('Resource storage is full. '+left+' resources remain at the gathering site.');
}
function stopHarvest(jid){
  const j=s.harvestJobs.find(x=>x.id===jid);if(!j)return;
  collectHarvest(jid);
  j.party.forEach(id=>{const x=s.members.find(m=>m.id===id);if(x)x.busy=false});
  j.party=[];j.stopped=true;
  if(Object.values(j.stash||{}).reduce((a,v)=>a+v,0)<=0)s.harvestJobs=s.harvestJobs.filter(x=>x.id!==jid);
  save();render();
}
let harvestFilter='all';
function setHarvestFilter(filter,btn){
  harvestFilter=filter;
  document.querySelectorAll('.harvestFilter').forEach(x=>x.classList.toggle('on',x.dataset.harvestFilter===filter));
  renderHarvestAreas();
}
function renderHarvestAreas(){
  if(!$('harvestList'))return;
  const areas=HARVEST_AREAS
    .filter(a=>harvestFilter==='all'||a.skill===harvestFilter)
    .slice()
    .sort((a,b)=>{
      const aTier=Math.min(...(a.resources||[]).map(x=>resourceTier(x[0]))),bTier=Math.min(...(b.resources||[]).map(x=>resourceTier(x[0])));
      return aTier-bTier||(a.req||1)-(b.req||1)||a.name.localeCompare(b.name);
    });
  $('harvestList').innerHTML=areas.map(a=>{
    const qualified=s.members.filter(h=>!h.busy&&gatheringSkill(h,a.skill).level>=a.req).length;
    const occupied=harvestLocationOccupied(a.id),unlocked=harvestAreaUnlocked(a),tier=harvestAreaTier(a);
    return `<div class="card quest actionCard ${unlocked?'':'areaLocked'}">${sceneBanner('harvest',a.id)}<div class="name">${a.name}</div>
      <div class="muted">${a.kind} · ${SKILL_NAMES[a.skill]} Lv. ${a.req} required</div><div class="muted" style="margin-top:5px">${a.desc}</div>
      <div class="chips">${a.resources.map(x=>`<span class="chip">${tierLabel(resourceTier(x[0]))} · ${RESOURCE_NAMES[x[0]]||x[0]}</span>`).join('')}<span class="chip">${a.cycle}s cycle</span><span class="chip">${(a.xp||1)*2} skill XP / cycle</span><span class="chip">${qualified} eligible</span>${unlocked?'':`<span class="chip dangerText">Requires Tier ${tierLabel(tier-1)} expedition clear</span>`}</div>
      <button class="btn ${unlocked&&qualified&&!occupied?'gold':''} actionButton" ${unlocked&&qualified&&!occupied?'':'disabled'} onclick="openHarvestPicker('${a.id}')">${!unlocked?'Expedition Locked':occupied?'Party Gathering':qualified?'Start Harvesting':'No Eligible Members'}</button></div>`;
  }).join('')||'<div class="empty">No gathering areas match this filter.</div>';
}
function openHarvestJobDetails(jobId){
  const j=s.harvestJobs.find(x=>x.id===jobId);if(!j)return;
  const area=HARVEST_AREAS.find(x=>x.id===j.areaId);
  const crew=(j.party||[]).map(id=>s.members.find(x=>x.id===id)).filter(Boolean);
  const skill=area?.skill;
  showModal(area?.name||'Active Harvesting',`
    <div class="card">
      <div class="heroTop"><div class="visualIcon">${area?.icon||'⛏️'}</div><div><div class="name">${area?.name||'Harvesting'}</div><div class="muted">${skill?(SKILL_NAMES[skill]||skill):'Gathering'} · ${crew.length} member${crew.length===1?'':'s'} assigned</div></div></div>
    </div>
    <h3 style="margin-top:14px">Gathering Party</h3>
    <div class="g2">${crew.map(hero=>{
      const sk=skill?gatheringSkill(hero,skill):null;
      return `<div class="card"><div class="heroTop"><div class="portrait">${classIcon(hero,'gameAsset portraitAsset')}</div><div><div class="name">${hero.name}</div><div class="muted">${displayClass(hero)} · ${hero.race} · Lv. ${hero.level}</div></div></div>${sk?`<div class="chips"><span class="chip">${SKILL_NAMES[skill]} Lv. ${sk.level}</span><span class="chip">${Math.floor(sk.xp)} / ${skillXpNeeded(sk.level)} XP</span></div>`:''}</div>`;
    }).join('')}</div>
  `);
}
function renderHarvestActive(){
  if(!$('harvestActive'))return;
  processHarvesting();
  if($('activeGatherCount'))$('activeGatherCount').textContent=s.harvestJobs.length;
  const cap=afkHarvestCap();
  $('harvestActive').innerHTML=s.harvestJobs.length?s.harvestJobs.map(j=>{
    const area=HARVEST_AREAS.find(x=>x.id===j.areaId),stashCount=Object.values(j.stash||{}).reduce((x,v)=>x+v,0);
    const names=j.party.map(id=>s.members.find(x=>x.id===id)?.name.split(' ')[0]).filter(Boolean).join(' · ');
    const progressLocked=!harvestAreaUnlocked(area),capped=stashCount>=cap,cycleMs=(area?.cycle||30)*1000,start=j.lastTick||Date.now();
    return `<div class="card harvestCard ${capped?'cappedHarvest':''}" data-harvest-card="${j.id}" style="cursor:pointer" onclick="openHarvestJobDetails(${j.id})">
      <div class="heroTop"><div class="visualIcon">${area?.icon||'⛏️'}</div><div><div class="name">${area?.name||'Harvesting'}</div><div class="muted">${names}</div></div></div>
      <div class="chips"><span class="chip">${j.cycles} cycles</span><span class="chip ${capped?'harvestCapText':''}">${stashCount}/${cap} resources</span></div>
      <div class="progressWrap harvestProgress"><div class="progressMeta"><span data-harvest-label>${progressLocked?'EXPEDITION LOCKED':capped?'CAP REACHED':'Next harvest'}</span><span data-harvest-time>${progressLocked?'PAUSED':capped?'FULL':fmt(cycleMs-(Date.now()-start))}</span></div><div class="progressTrack"><div class="progressFill" data-harvest-job="${j.id}" style="width:${progressLocked?0:capped?100:clamp((Date.now()-start)/cycleMs*100,0,100)}%"></div></div></div>
      <div class="actionRow"><div class="actionRowInfo muted">${progressLocked?harvestAreaLockText(area):capped?'Harvesting paused until resources are collected.':'Gathering continues automatically.'}</div><div class="actionRowButtons"><button class="btn gold" onclick="event.stopPropagation();collectHarvest(${j.id})" ${stashCount?'':'disabled'}>Collect</button><button class="btn" onclick="event.stopPropagation();stopHarvest(${j.id})">Recall</button></div></div>
    </div>`;
  }).join(''):'<div class="empty">No active harvesting jobs.</div>';
}
function missionThreatIntel(q,type){
  const names=[...(q.enemyPool||[]),...(type!=='quest'&&q.boss?[q.boss]:[])];
  const profiles=names.map(enemyTacticalProfile);
  const damageTypes=[...new Set(profiles.flatMap(p=>p.damageTypes))];
  const mechanics=[...new Set(profiles.flatMap(p=>p.mechanics))];
  const counters=[...new Set(profiles.flatMap(p=>p.counters))];
  const drops=[...new Set(profiles.flatMap(p=>p.drops))];
  return{profiles,damageTypes,mechanics,counters,drops};
}
function threatIntelHtml(q,type){
  const intel=missionThreatIntel(q,type);
  const damage=intel.damageTypes.map(x=>`<span class="threatTag damage-${x}">${elementIcon[x]||''} ${x==='physical'?'Physical':x[0].toUpperCase()+x.slice(1)}</span>`).join('');
  const mechanics=(intel.mechanics.length?intel.mechanics:['Direct attacks']).map(x=>`<span class="threatTag mechanic">${x}</span>`).join('');
  const enemies=intel.profiles.map(p=>`<span class="enemyIntel" title="${p.description}${p.ability?` Ability: ${p.ability}.`:''}">${p.name}<small>${p.role}</small></span>`).join('');
  const drops=intel.drops.slice(0,8).map(k=>`<span class="threatDrop">${gameIcon('resource',k,'','gameAsset')} ${RESOURCE_NAMES[k]||k}</span>`).join('');
  return `<div class="threatIntel">
    <div class="threatIntelRow"><b>Damage</b><div>${damage}</div></div>
    <div class="threatIntelRow"><b>Mechanics</b><div>${mechanics}</div></div>
    <div class="enemyIntelList">${enemies}</div>
    <div class="threatDrops"><b>Possible resources</b><div>${drops||'<span class="muted">Unknown</span>'}</div></div>
  </div>`;
}
function renderOffers(type){
 const box=type==='raid'?'raidList':type==='dungeon'?'dungeonList':'questList';
 const offers=type==='quest'?arr(type).filter(q=>expeditionAreaUnlocked(q)):arr(type);
 $(box).innerHTML=offers.map(q=>{
   const locked=false,occupied=missionLocationOccupied(type,q);
   const sceneType=type==='quest'?'expedition':type;
   const sceneKey=type==='quest'?(AREAS.find(a=>a.name===q.name)?.id||q.areaId||q.id):q.name;
   return `<div class="card quest actionCard" data-id="${q.id}">
    ${sceneBanner(sceneType,sceneKey)}<div class="name">${q.name}</div><div class="muted">${q.desc}</div>
    <div class="chips"><span class="chip">${tierLabel(q.tier||1)}</span><span class="chip">Levels ${q.level}–${q.level+(q.bossGate?0:4)}</span><span class="chip">Target ${q.target}</span>${type==='quest'?(q.bossGate?`<span class="chip gateBossChip">Tier Boss</span><span class="chip">Boss: ${q.boss}</span>${(s.expeditionGates||[]).includes(q.gateTier)?'<span class="chip good">Cleared</span>':''}`:`<span class="chip">5 stages · 25 encounters</span>${(s.expeditionClears||[]).includes(String(q.areaId))?'<span class="chip good">Cleared</span>':''}`):`<span class="chip">${q.maxFights} normal encounters, then boss</span><span class="chip">Boss: ${q.boss}</span>`}</div>
    ${threatIntelHtml(q,type)}
    <button class="btn ${occupied?'':'gold'} actionButton" ${occupied?'disabled':''} onclick="openPartyPicker('${type}',${q.id})">${occupied?'Party Deployed':type==='raid'?'Start Raid':type==='dungeon'?'Start Dungeon':'Start Expedition'}</button>
   </div>`;
 }).join('');
}
function expeditionAreaUnlocked(q){
  const list=arr('quest'),index=list.findIndex(x=>x.id===q.id);if(index<=0)return true;
  const previous=list[index-1];
  if(q.bossGate)return (s.expeditionClears||[]).includes(String(previous.areaId));
  if(previous.bossGate)return (s.expeditionGates||[]).includes(previous.gateTier);
  return (s.expeditionClears||[]).includes(String(previous.areaId));
}
let currentPartyPickerType='quest';
function availablePresetMembers(preset){
  const ids=(preset?.members||[]);
  const members=ids.map(id=>s.members.find(x=>x.id===id));
  if(members.some(x=>!x||x.busy))return null;
  return members;
}
function selectedExpeditionIds(){
  return [...document.querySelectorAll('#expeditionPartyPicker .partyMember.on')].map(x=>+x.dataset.h);
}
function updatePartyPresetButtons(){
  const box=$('partyPresetList');if(!box)return;
  const usable=s.partyPresets.map((p,i)=>({p,i,members:availablePresetMembers(p)})).filter(x=>x.members&&x.p.members.length<=partySizeFor(currentPartyPickerType));
  box.innerHTML=usable.length?usable.map(x=>`<div style="display:flex;gap:4px;align-items:center"><button class="btn" onclick="loadPartyPreset(${x.i})">${x.p.name}</button><button class="btn" title="Rename party" onclick="renamePartyPreset(${x.i})">${gameIcon('ui','rename','✎')}</button></div>`).join(''):'<span class="muted">No available saved parties.</span>';
}
function renamePartyPreset(index){
  const p=s.partyPresets[index];if(!p)return;
  showModal('Rename Saved Party',`<div class="card"><input id="partyRenameInput" maxlength="24" value="${p.name.replace(/"/g,'&quot;')}" style="width:100%"><div class="modalActionRow"><button class="btn gold" onclick="confirmPartyPresetRename(${index})">Save Name</button></div></div>`);
  setTimeout(()=>{const el=$('partyRenameInput');if(el){el.focus();el.select()}},0);
}
function confirmPartyPresetRename(index){
  const p=s.partyPresets[index],el=$('partyRenameInput');if(!p||!el)return;
  const name=el.value.trim().replace(/\s+/g,' ');
  if(!name)return notify('Party name cannot be empty.');
  p.name=name.slice(0,24);
  save();closeModal();updatePartyPresetButtons();
  notify('Saved party renamed.','good');
}
let pendingPartyPresetIds=[];
function saveCurrentPartyPreset(){
  const ids=selectedExpeditionIds();
  if(!ids.length)return notify('Select members before saving a party.');
  if(s.partyPresets.length>=8)return notify('Maximum 8 saved parties.');
  pendingPartyPresetIds=ids.slice();
  showModal('Save Party',`<div class="card"><div class="muted">Name this party composition.</div><input id="newPartyNameInput" maxlength="24" value="Party ${s.partyPresets.length+1}" style="width:100%;margin-top:10px"><div class="modalActionRow"><button class="btn gold" onclick="confirmSavePartyPreset()">Save Party</button></div></div>`);
}
function confirmSavePartyPreset(){
  const ids=pendingPartyPresetIds.slice();
  const el=$('newPartyNameInput');
  if(!ids.length||!el)return;
  const name=el.value.trim().replace(/\s+/g,' ');
  if(!name)return notify('Party name cannot be empty.');
  s.partyPresets.push({name:name.slice(0,24),members:ids});
  pendingPartyPresetIds=[];
  save();closeModal();
  notify(name+' saved.','good');
}
function loadPartyPreset(index){
  const p=s.partyPresets[index],members=availablePresetMembers(p);
  if(!p||!members)return notify('That saved party is not currently available.');
  document.querySelectorAll('#expeditionPartyPicker .partyMember').forEach(btn=>btn.classList.toggle('on',p.members.includes(+btn.dataset.h)));
  updateProvisionDescription($('missionProvisionSelect')?.value||'');
}
function autofillExpeditionParty(){
  const buttons=[...document.querySelectorAll('#expeditionPartyPicker .partyMember')];
  buttons.forEach(b=>b.classList.remove('on'));
  const ranked=buttons.map(b=>{
    const hero=s.members.find(x=>x.id===+b.dataset.h);
    return{b,power:hero?hs(hero).power:0};
  }).sort((a,b)=>b.power-a.power).slice(0,partySizeFor(currentPartyPickerType));
  ranked.forEach(x=>x.b.classList.add('on'));
  updateProvisionDescription($('missionProvisionSelect')?.value||'');
}
function openPartyPicker(type,qid){
 currentPartyPickerType=type;
 const q=arr(type).find(x=>x.id===qid);if(!q)return;
 if(missionLocationOccupied(type,q))return notify('A party is already deployed to '+q.name+'.');
 const available=s.members.filter(h=>!h.busy);
 const availableMeals=Object.entries(s.meals||{}).filter(([id,count])=>count>0&&MEALS[id]);
 if(!available.length)return notify('No available guild members.');
 showModal('Choose Expedition Party',`<div class="card">
   <div class="name">${q.name}</div>
   <div class="muted">Choose up to ${partySizeFor(type)} guild members.</div>
   <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">
     <button class="btn" onclick="autofillExpeditionParty()">Autofill Highest Power</button>
     <button class="btn" onclick="saveCurrentPartyPreset()">Save Current Party</button>
   </div>
   <div style="margin-top:10px"><div class="muted" style="margin-bottom:6px">Saved parties available now</div><div id="partyPresetList" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
   <div class="card" style="margin-top:10px"><div class="name">Mission Provision</div><div class="muted">Optional · consumes one serving per selected party member and supports them until the mission ends.</div><select id="missionProvisionSelect" style="width:100%;margin-top:8px" onchange="updateProvisionDescription(this.value)"><option value="">No provision</option>${availableMeals.map(([id,count])=>`<option value="${id}">${MEALS[id].icon||'🍲'} ${MEALS[id].name} ×${count}</option>`).join('')}</select><div class="muted" id="missionProvisionDescription" style="margin-top:7px">No meal selected.</div></div>
   <div class="party" id="expeditionPartyPicker" style="margin-top:10px">${available.map(h=>{const z=hs(h);return `<button class="partyMember characterRarity rarityBorder-${String(h.rarity||'Common').toLowerCase()}" data-h="${h.id}" onclick="toggleExpeditionMember(this)"><span class="miniClass">${classIcon(h)}</span><span>${h.name} · ${displayClass(h)} · Lv. ${h.level} · ${z.power} power</span></button>`}).join('')}</div>
   <div class="modalActionRow"><button class="btn gold" onclick="confirmExpeditionParty('${type}',${qid})">Send Party</button></div>
 </div>`);
 updatePartyPresetButtons();
}
function updateProvisionDescription(id){const box=$('missionProvisionDescription'),meal=MEALS[id],needed=selectedExpeditionIds().length,owned=s.meals?.[id]||0;if(box)box.textContent=meal?`${meal.desc} · ${needed||'No'} selected member${needed===1?'':'s'} · requires ${needed} serving${needed===1?'':'s'} · ${owned} owned.`:'No meal selected.'}
function toggleExpeditionMember(btn){
 const selected=document.querySelectorAll('#expeditionPartyPicker .partyMember.on');
 if(!btn.classList.contains('on')&&selected.length>=partySizeFor(currentPartyPickerType))return notify('Maximum party size is '+partySizeFor(currentPartyPickerType)+'.');
 btn.classList.toggle('on');
 updateProvisionDescription($('missionProvisionSelect')?.value||'');
}
function confirmExpeditionParty(type,qid){
 const ids=selectedExpeditionIds();
 if(!ids.length)return notify('Choose at least one guild member.');
 const unavailable=ids.some(id=>{const m=s.members.find(x=>x.id===id);return !m||m.busy});
 if(unavailable)return notify('A selected member is no longer available.');
 const provision=$('missionProvisionSelect')?.value||null;
 if(provision&&(s.meals[provision]||0)<ids.length)return notify(`This party needs ${ids.length} servings. You own ${s.meals[provision]||0}.`);
 closeModal();send(type,qid,ids,provision);
}
