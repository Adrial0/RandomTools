// Music controls and rendering for the guild hall, combat, and roster.
function updateMusicUI(){
  const btn=$('musicToggleBtn'),txt=$('musicStateText'),slider=$('musicVolumeSlider'),vol=$('musicVolumeText');
  if(btn)btn.textContent='Music: '+(s.musicEnabled?'On':'Off');
  if(txt)txt.textContent=s.musicEnabled?'Enabled':'Disabled';
  const pct=Math.round(clamp(s.musicVolume??.35,0,1)*100);
  if(slider)slider.value=pct;
  if(vol)vol.textContent=pct+'%';
}
function setMusicVolume(v){
  s.musicVolume=clamp((+v||0)/100,0,1);
  const audio=$('bgMusic');if(audio)audio.volume=s.musicVolume;
  save();updateMusicUI();
}
function tryStartMusic(){
  const audio=$('bgMusic');
  if(!audio||!s?.musicEnabled)return;
  audio.volume=clamp(s.musicVolume??.35,0,1);
  const playPromise=audio.play();
  if(playPromise&&typeof playPromise.catch==='function')playPromise.catch(()=>{});
}
function stopMusic(){
  const audio=$('bgMusic');
  if(audio)audio.pause();
}
function toggleMusic(){
  s.musicEnabled=!s.musicEnabled;
  save();
  updateMusicUI();
  if(s.musicEnabled)tryStartMusic();
  else stopMusic();
}
function syncMusic(){
  updateMusicUI();
  if(s.musicEnabled)tryStartMusic();
  else stopMusic();
}

function featureAccess(page){
  const hasExpedition=!!s.onboarding?.flags?.expeditionStarted||s.missions.length>0||s.wins>0;
  const hasResources=(s.discoveredResources||[]).length>0||Object.values(s.materials||{}).some(v=>v>0);
  if(['hall','roster','quests','harvesting','arena','settings'].includes(page))return{revealed:true,locked:false};
  if(page==='inventory')return{revealed:hasExpedition,locked:false,revealHint:'Start your first expedition to reveal Inventory.'};
  if(page==='crafting')return{revealed:hasResources,locked:false,revealHint:'Discover your first resource to reveal this feature.'};
  if(page==='upgrades')return{revealed:hasResources||s.level>=2,locked:false,revealHint:'Discover your first resource to reveal Guild Upgrades.'};
  if(['questboard','market'].includes(page))return{revealed:s.level>=2,locked:false,revealHint:'Reach Guild Level 2 to reveal this feature.'};
  if(page==='dungeons')return{revealed:s.level>=2,locked:s.level<3,lockLabel:'Lv. 3',lockReason:'Dungeons unlock at Guild Level 3.'};
  if(page==='raids')return{revealed:s.level>=3,locked:s.level<6,lockLabel:'Lv. 6',lockReason:'Raids unlock at Guild Level 6.'};
  return{revealed:true,locked:false};
}
function updateNavigationLocks(){
  document.querySelectorAll('.nav[data-p]').forEach(nav=>{
    const access=featureAccess(nav.dataset.p);
    nav.classList.toggle('navFeatureHidden',!access.revealed);
    nav.classList.toggle('navLocked',access.revealed&&access.locked);
    nav.setAttribute('aria-hidden',access.revealed?'false':'true');
    nav.setAttribute('aria-disabled',access.locked?'true':'false');
    nav.dataset.lockLabel=access.locked?(access.lockLabel||'Locked'):'';
    nav.title=access.locked?(access.lockReason||'This feature is locked.'):(access.revealHint||'');
  });
  document.querySelectorAll('.navSubgroup[data-nav-panel]').forEach(panel=>{
    const group=document.querySelector(`.navGroup[data-nav-group="${panel.dataset.navPanel}"]`);
    group?.classList.toggle('navFeatureHidden',!panel.querySelector('.nav[data-p]:not(.navFeatureHidden)'));
  });
  const active=document.querySelector('.nav.on[data-p]');
  if(active&&!featureAccess(active.dataset.p).revealed){
    if(typeof activatePage==='function')activatePage('hall');
    else{
      document.querySelectorAll('.nav,.page').forEach(x=>x.classList.remove('on'));
      document.querySelector('.nav[data-p="hall"]')?.classList.add('on');
      $('hall')?.classList.add('on');
    }
  }
}
function render(){completeOnboardingGoals(false);updateNavigationLocks();completeCrafting();updateMusicUI();$('lv').textContent=s.level;$('gold').textContent=s.gold.toLocaleString();$('rep').textContent=s.rep.toLocaleString();$('guildName').textContent=s.guild;$('memberCount').textContent=s.members.length+' / '+s.memberCap;$('totalPower').textContent=s.members.reduce((a,h)=>a+hs(h).power,0);$('wins').textContent=s.wins;
  const guildNeed=guildRepNeeded(s.level),guildPct=clamp((s.rep||0)/guildNeed*100,0,100);
  if($('guildLevelHall'))$('guildLevelHall').textContent=s.level;
  if($('guildRepText'))$('guildRepText').textContent=`${(s.rep||0).toLocaleString()} / ${guildNeed.toLocaleString()}`;
  if($('guildRepFill'))$('guildRepFill').style.width=guildPct+'%';renderOnboardingGoals();renderRec();renderActive();renderLog();renderRoster();renderOffers('quest');renderOffers('dungeon');renderOffers('raid');renderHarvestAreas();renderHarvestActive();renderProceduralQuests();renderInv();renderMarket();renderCraftQueue();renderCraft();renderEnchanting();renderUp();colorizeStatTerms(document.querySelector('.game'));save()}
function applicantTimeLeft(){
  if(s.recruits.length)return'Current applicants remain until recruited.';
  const ms=Math.max(0,(s.nextApplicantsAt||0)-Date.now());
  if(ms<=0)return'New applicants are arriving...';
  const sec=Math.ceil(ms/1000),min=Math.floor(sec/60),rem=sec%60;
  return`Next applicants in ${min}:${String(rem).padStart(2,'0')}`;
}
function recruitDetail(rid){
  const h=s.recruits.find(x=>x.id===rid);if(!h)return;
  const z=hs(h),combat=heroAttackDisplay(h,z);
  const skills=Object.entries(SKILL_NAMES).map(([k,n])=>{
    const sk=gatheringSkill(h,k);
    return `<div class="stat"><span>${n}</span><strong>Lv. ${sk.level}</strong></div>`;
  }).join('');

  showModal(h.name,`
    <div class="head">
      <div class="heroTop"><div class="portrait">${classIcon(h,'gameAsset portraitAsset')}</div><div><h2>${h.name}</h2><p>${displayClass(h)} · ${h.race} · Lv. ${h.level} · ${h.rarity} · ${h.trait}</p></div></div>
      <div><b>${z.power} power</b></div>
    </div>
    <div class="stats" style="margin-top:10px">
      <div class="stat"><span>HP</span><strong>${z.hp}</strong></div>
      <div class="stat"><span>Mana</span><strong>${z.mana}</strong></div>
      <div class="stat"><span>Mana Regen</span><strong>${z.manaRegen}</strong></div>
      <div class="stat"><span>Attack</span><strong>${combat.attack}</strong></div>
      <div class="stat"><span>Attack Speed</span><strong>${combat.attackSpeed>=0?'+':''}${Math.round(combat.attackSpeed*100)}%</strong></div>
      <div class="stat"><span>Attack Time</span><strong>${combat.attackTime.toFixed(2)}s</strong></div>
      <div class="stat"><span class="statSTR">STR</span><strong>${z.str}</strong></div>
      <div class="stat"><span class="statDEX">DEX</span><strong>${z.dex}</strong></div>
      <div class="stat"><span class="statINT">INT</span><strong>${z.int}</strong></div>
      <div class="stat"><span>DEF</span><strong>${z.def}</strong></div>
      <div class="stat"><span>MDEF</span><strong>${z.mdef}</strong></div><div class="stat"><span>Block</span><strong>${z.block}</strong></div>
      <div class="stat"><span>Threat</span><strong>${z.threat.toFixed(1)}</strong></div>
      <div class="stat"><span>Physical Dodge</span><strong>${(z.physicalDodge*100).toFixed(1)}%</strong></div>
      <div class="stat"><span>Magic Dodge</span><strong>${(z.magicalDodge*100).toFixed(1)}%</strong></div>
    </div>
    <h3 style="margin-top:14px">Race</h3>
    <div class="card racialPassiveCard"><div class="name">${h.race} · ${raceDef(h).passive}</div><div class="muted">${raceDef(h).desc}</div></div>
    <h3 style="margin-top:14px">Quirk</h3>
    <div class="card"><div class="name">${h.trait}</div><div class="muted">${traitDef(h)?.desc||''}</div></div>
    <h3 style="margin-top:14px">Gathering Skills</h3>
    <div class="stats">${skills}</div>
    <div class="modalActionRow"><button class="btn gold" onclick="closeModal();recruit(${h.id})">Recruit · Free</button></div>
  `);
}

function renderRec(){
  s.applicantCap=applicantBatchSize();
  $('recruits').innerHTML=
    `<div class="card" style="grid-column:1/-1"><div class="head"><div><div class="name">Recruitment Board</div><div class="muted">${s.recruits.length} / ${s.applicantCap} applicants · ${applicantTimeLeft()}</div></div><div style="display:flex;gap:8px;align-items:center"><span class="chip">Batch every 5 min</span><button class="btn" onclick="refreshRec(true)">Reroll · 50g</button></div></div></div>`+
    (s.recruits.length?s.recruits.map(x=>{let z=hs(x);return`<div class="card recruitActionCard" style="cursor:pointer;position:relative" onclick="recruitDetail(${x.id})"><div class="heroTop"><div class="portrait">${classIcon(x,'gameAsset portraitAsset')}</div><div><div class="name">${x.name}</div><div class="muted">${displayClass(x)} · ${x.race} · Lv. ${x.level} · <span class="${rarityClass(x.rarity)}">${x.rarity}</span></div></div></div><div class="power"><span>${x.trait}</span><strong>${z.power} power</strong></div><button class="btn gold recruitActionButton" onclick="event.stopPropagation();recruit(${x.id})">Recruit · Free</button></div>`}).join(''):'<div class="empty">No applicants available right now. A new batch arrives automatically every 5 minutes.</div>');
}
let activeMissionDomKey='';
function activeMissionKey(){
  return s.missions.map(m=>m.id).join(',');
}
function activeMissionCardHtml(m){
  const partyHtml=m.party.map(id=>{
    const hero=s.members.find(x=>x.id===id);
    return hero?`${classIcon(hero)} ${hero.name.split(' ')[0]}`:'';
  }).join(' · ');
  return `<div class="card expeditionCard" data-active-mission="${m.id}" onclick="openCombat(${m.id})">
    <div class="heroTop">
      <div class="visualIcon">${questIcons[m.type]}</div>
      <div><div class="name">${m.name}</div><div class="muted">${partyHtml}</div></div>
    </div>
    <div class="chips">
      <span class="chip" data-active-encounter></span>
      <span class="chip" data-active-kills></span>
      <span class="chip" data-active-battle></span>
      <span class="chip" data-active-stash></span>
      <span class="chip good" data-active-complete style="display:none">Completed</span>
      <span class="chip dangerText" data-active-defeated style="display:none">Party defeated</span>
    </div>
    <div class="progressWrap">
      <div class="progressMeta"><span data-active-label></span><span data-active-percent></span></div>
      <div class="progressTrack"><div class="progressFill" data-active-progress></div></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:9px;flex-wrap:wrap">
      <button class="btn gold" data-active-collect onclick="event.stopPropagation();collectLoot(${m.id})">Collect Loot</button>
      <button class="btn" data-active-stop onclick="event.stopPropagation();stopExpedition(${m.id})"></button>
    </div>
    <div class="muted" style="margin-top:7px" data-active-help></div>
  </div>`;
}
function buildActiveMissionDom(){
  $('active').innerHTML=s.missions.length?s.missions.map(activeMissionCardHtml).join(''):'<div class="empty">No active expeditions.</div>';
  activeMissionDomKey=activeMissionKey();
}
function updateActiveMissionCard(m){
  const card=document.querySelector(`[data-active-mission="${m.id}"]`);if(!card)return;
  card.classList.toggle('failedMission',!!m.defeated);
  const enemyHp=m.battle&&m.battle.enemies.length?m.battle.enemies.reduce((a,e)=>a+Math.max(0,e.hp),0):0;
  const enemyMax=m.battle&&m.battle.enemies.length?m.battle.enemies.reduce((a,e)=>a+e.maxHp,0):1;
  const pct=clamp(100-enemyHp/enemyMax*100,0,100);
  const drops=pendingCount(m);
  const stash=(m.stash?.gold||0)+'g · '+(m.stash?.rep||0)+' rep · '+drops+' drops';

  card.querySelector('[data-active-encounter]').textContent=m.maxFights?(m.battle?.boss?'Boss':('Encounter '+(m.battle?.encounterNumber||normalEncounterCount(m)+1)+' / '+m.maxFights)):m.fights+' fights';
  card.querySelector('[data-active-kills]').textContent=m.kills+' kills';
  card.querySelector('[data-active-battle]').textContent=m.battle?.boss?'⚠ BOSS':'Battle #'+(m.battle?.id||'-');
  card.querySelector('[data-active-stash]').textContent=stash;
  card.querySelector('[data-active-complete]').style.display=m.completed?'':'none';
  card.querySelector('[data-active-defeated]').style.display=m.defeated?'':'none';
  card.querySelector('[data-active-label]').textContent=m.defeated?'Expedition stopped':'Current fight';
  card.querySelector('[data-active-percent]').textContent=Math.round(pct)+'%';
  card.querySelector('[data-active-progress]').style.width=pct+'%';
  const collect=card.querySelector('[data-active-collect]');
  collect.disabled=drops===0&&(m.stash?.gold||0)===0&&(m.stash?.rep||0)===0;
  card.querySelector('[data-active-stop]').textContent=m.completed||m.defeated?'Return to Guild':'End Expedition';
  card.querySelector('[data-active-help]').textContent='Click the card to '+(m.defeated?'view the result':'watch combat')+'.';
}
function renderActive(){
  const key=activeMissionKey(),hasCards=!!$('active').querySelector('[data-active-mission]');
  if(key!==activeMissionDomKey||(s.missions.length&&!hasCards)||(!s.missions.length&&hasCards))buildActiveMissionDom();
  s.missions.forEach(updateActiveMissionCard);
}
function resetCombatView(){
  combatDomKey='';
  const body=$('combatBody');
  if(body)body.replaceChildren();
}
function openCombat(mid){resetCombatView();
  const m=s.missions.find(x=>x.id===mid);if(!m)return;
  $('combatModal').dataset.mode='mission';
  $('combatModal').dataset.mission=mid;
  $('combatModal').classList.add('on');
  syncWindowScrollLock();
  renderCombat();
}
function closeCombat(){closeCombatInspector();$('combatModal').classList.remove('on');combatDomKey='';syncWindowScrollLock()}
function combatDetailsHtml(x,enemy=false){
  if(enemy){
    const tactical=enemyTacticalProfile(x.name);
    return `<div class="combatDetailStats">
      <span>HP ${Math.max(0,x.hp)}/${x.maxHp}</span>${x.maxMana?`<span>Mana ${Math.max(0,x.mana||0)}/${x.maxMana}</span>`:''}<span>Attack ${x.atk||0}</span><span>Attack Time ${(enemyAttackIntervalMs(x)/1000).toFixed(2)}s</span><span>Role ${tactical.role}</span>${tactical.mechanics.map(m=>`<span>Mechanic ${m}</span>`).join('')}${x.ability?`<span>Ability ${ENEMY_ABILITIES_DATA[x.ability]?.name||x.ability}</span>`:''}<span>Drops ${(x.drops||ENEMIES_DATA[x.name]?.drops||[]).map(k=>RESOURCE_NAMES[k]||k).join(', ')||'None'}</span>
      <span>DEF ${x.def||0}</span><span>MDEF ${x.mdef||0}</span>
      <span>Block ${x.block||0}</span><span>Fire ${x.fire||0}%</span>
      <span>Ice ${x.ice||0}%</span><span>Poison ${x.poison||0}%</span>
      <span>Lightning ${x.lightning||0}%</span>${x.mage?'<span>Mage</span>':''}${x.cast?`<span class="dangerText">Casting ${ENEMY_ABILITIES_DATA[x.cast.abilityId]?.name||'Ability'}</span>`:''}${Object.values(ensureStatuses(x)).map(st=>`<span>${STATUS_EFFECTS[st.type]?.icon||'◆'} ${STATUS_EFFECTS[st.type]?.name||st.type} ×${st.stacks}</span>`).join('')}
    </div>`;
  }
  return `<div class="combatDetailStats">
    <span>HP ${Math.max(0,x.hp)}/${x.maxHp}</span>${enemy?'':`<span>Mana ${Math.max(0,x.mana||0)}/${x.maxMana||0}</span><span>Mana Regen ${x.manaRegen||0}</span>${primaryActiveType(x)?`<span>${activeName(primaryActiveType(x))}: ${activeCooldownRemaining(x,primaryActiveType(x))<=0?'Ready':fmt(activeCooldownRemaining(x,primaryActiveType(x)))}</span>`:''}`}<span>DEF ${x.def||0}</span>
    <span>MDEF ${x.mdef||0}</span><span>Block ${x.block||0}</span>
    <span>Position ${x.row==='front'?'Front':'Back'}</span><span>Threat ${(x.threat||1).toFixed(1)}</span><span>Attack ${x.weaponPower||0}</span><span>Attack Speed ${Math.round((x.attackSpeed||0)*100)}%</span><span>Attack Time ${(heroAttackIntervalMs(x)/1000).toFixed(2)}s</span><span>Regen ${x.regen||0}</span>
    <span>Lifesteal ${x.lifesteal||0}%</span><span>Phys Dodge ${Math.round((x.physicalDodge||0)*100)}%</span>
    <span>Magic Dodge ${Math.round((x.magicalDodge||0)*100)}%</span><span>Armor Pen ${Math.round((x.armorPen||0)*100)}%</span>
    <span>Parry ${Math.round((x.parry||0)*100)}%</span><span>Crit ${Math.round((x.critBonus||0)*100)}%</span>
    <span>Crit Dmg +${Math.round((x.critDamage||0)*100)}%</span><span>Accuracy ${Math.round((x.accuracy||0)*100)}%</span><span>Status Chance ${Math.round((x.statusChance||0)*100)}%</span>${Object.values(ensureStatuses(x)).map(st=>`<span>${STATUS_EFFECTS[st.type]?.icon||'◆'} ${STATUS_EFFECTS[st.type]?.name||st.type} ×${st.stacks}</span>`).join('')}
  </div>`;
}
function combatantHtml(x,enemy=false,frontline=false,options={}){
  const pct=clamp(x.hp/x.maxHp*100,0,100);
  const icon=enemy?x.icon:(x.subclass?gameIcon('subclass',x.subclass,iconFallback('class',x.class),'gameAsset combatAsset'):gameIcon('class',x.class,iconFallback('class',x.class),'gameAsset combatAsset'));
  const side=options.arena?`arena-${x.side}`:(enemy?'enemy':'hero');
  const key=`${side}-${x.id}`;
  const activeType=enemy?null:primaryActiveType(x);
  const now=Date.now();
  const attackPct=attackTimerProgress(x,enemy,now)*100;
  const cdPct=activeType?cooldownProgress(x,activeType,now)*100:100;
  return `<div class="combatant combatMini ${enemy?'enemy':''} ${options.arena?'arenaCombatant':''} ${frontline?'combatThreatFront':''} ${options.hidden?'combatSlotEmpty':''}" ${options.arena?'':`${options.slot!=null?`data-combat-slot="${enemy?'enemy':'hero'}:${options.slot}"`:''} data-combatant="${key}" data-combat-side="${side}" data-combat-id="${x.id}"`} data-entity-signature="${combatEntitySignature(x,enemy)}" data-last-hp="${x.hp}" data-last-attack="${attackPct}" ${options.arena?'':`onclick="toggleCombatantDetails(event,this)"`}>
    <div class="visualIcon">${icon}</div>
    <div class="combatMiniVitals">
      <div class="combatMiniNameRow"><div class="name combatantName">${x.name}</div><span class="combatantHp">${Math.max(0,x.hp)}/${x.maxHp}</span></div>
      <div class="combatMiniClass">${enemy?(x.boss?'BOSS':'Enemy'):`${x.displayClass||x.class} · ${x.row==='front'?'Front':'Back'}`}</div>
      <div class="hpTrack"><div class="hpFill" style="width:${pct}%"></div></div>
      <div class="manaTrack" style="display:${!enemy||x.maxMana?'block':'none'}"><div class="manaFill" style="width:${clamp((x.mana||0)/Math.max(1,x.maxMana||1)*100,0,100)}%"></div></div>
      <div class="attackTrack" title="Attack timer"><div class="attackFill ${attackPct>=100?'ready':''}" style="width:${attackPct}%"></div></div>
      ${activeType?`<div class="cooldownTrack" data-cooldown-track="${activeType}" title="${activeName(activeType)} cooldown"><div class="cooldownFill ${cdPct>=100?'ready':''}" data-cooldown-type="${activeType}" style="width:${cdPct}%"></div></div>`:''}
      ${enemy?`<div class="castTrack" style="display:none"><div class="castFill"></div><span class="castLabel"></span></div>`:''}
      <div class="combatStatusRow">${combatEffectIcons(x,enemy)}</div>
    </div>
    <div class="combatFloat"></div>
  </div>`;
}
const COMBAT_ENEMY_SLOT_COUNT=8;
function emptyCombatSlotHtml(enemy,index){
  return '';
}
function setCombatSlotVisible(el,visible){
  if(!el)return;
  el.hidden=!visible;
  el.setAttribute('aria-hidden',visible?'false':'true');
  el.classList.toggle('combatSlotEmpty',!visible);
  if(visible)el.style.removeProperty('display');
  else el.style.setProperty('display','none','important');
}
function combatEntitySignature(x,enemy=false){return `${enemy?'e':'h'}:${x.id}:${encodeURIComponent(x.name||'')}:${x.maxHp||0}:${x.maxMana||0}:${x.boss?'b':''}`}
const COMBAT_BUFF_VISUALS={
  battleShout:{icon:'⚔',name:'Battle Shout',className:'battleShout'},
  shieldFaith:{icon:'✦',name:'Shield of Faith',className:'shieldFaith'}
};
function timedEffectIcon(icon,name,className,expiresAt,duration,stacks=0){
  const now=Date.now(),remaining=Math.max(0,(expiresAt||now)-now),total=Math.max(1,duration||remaining||1),progress=clamp(remaining/total,0,1),deg=Math.round(progress*360);
  return `<span class="combatEffect ${className||''}" style="--effect-progress:${deg}deg" title="${name}${stacks>1?` ×${stacks}`:''} · ${fmt(remaining)}"><span>${icon}${stacks>1?`<b>${stacks}</b>`:''}</span></span>`;
}
function combatEffectDescriptors(x,enemy=false){
  const now=Date.now(),effects=[];
  Object.values(ensureStatuses(x)).forEach(status=>{
    const def=STATUS_EFFECTS[status.type],duration=status.duration||Math.max(2000,(status.expiresAt||now)-now);
    effects.push({key:`status:${status.type}`,icon:def?.icon||'◆',name:def?.name||status.type,className:status.type,expiresAt:status.expiresAt,duration,stacks:status.stacks||0});
  });
  if(!enemy)Object.entries(x.buffs||{}).forEach(([key,expiresAt])=>{
    const def=COMBAT_BUFF_VISUALS[key];
    if(def&&expiresAt>now)effects.push({key:`buff:${key}`,icon:def.icon,name:def.name,className:def.className,expiresAt,duration:COMBAT_BUFF_DURATIONS[key]||6000,stacks:0});
  });
  if(enemy&&x.protection>0)effects.push({key:'static:protected',icon:'🛡',name:'Protected by an allied Bulwark',className:'protected staticEffect',static:true});
  if(enemy&&x.phase)effects.push({key:'static:phase',icon:'♛',name:x.phase,className:'bossPhase staticEffect',static:true});
  if(enemy&&x.enraged)effects.push({key:'static:enraged',icon:'!',name:'Enraged',className:'enraged staticEffect',static:true});
  return effects;
}
function combatEffectIcons(x,enemy=false){
  return combatEffectDescriptors(x,enemy).map(effect=>effect.static
    ?`<span class="combatEffect ${effect.className}" data-effect-key="${effect.key}" title="${effect.name}"><span>${effect.icon}</span></span>`
    :timedEffectIcon(effect.icon,effect.name,effect.className,effect.expiresAt,effect.duration,effect.stacks).replace('class="combatEffect',`data-effect-key="${effect.key}" class="combatEffect`)
  ).join('');
}
function updateCombatEffects(row,x,enemy=false){
  const effects=combatEffectDescriptors(x,enemy),expected=new Set(effects.map(effect=>effect.key));
  row.querySelectorAll('[data-effect-key]').forEach(el=>{if(!expected.has(el.dataset.effectKey))el.remove()});
  effects.forEach(effect=>{
    let el=row.querySelector(`[data-effect-key="${effect.key}"]`);
    if(!el){
      el=document.createElement('span');el.dataset.effectKey=effect.key;
      const content=document.createElement('span');el.appendChild(content);row.appendChild(el);
    }
    el.className=`combatEffect ${effect.className||''}`;
    const remaining=effect.static?0:Math.max(0,(effect.expiresAt||Date.now())-Date.now()),progress=effect.static?1:clamp(remaining/Math.max(1,effect.duration||remaining||1),0,1);
    el.style.setProperty('--effect-progress',`${Math.round(progress*360)}deg`);
    el.title=effect.name+(effect.stacks>1?` ×${effect.stacks}`:'')+(effect.static?'':` · ${fmt(remaining)}`);
    const content=el.firstElementChild,contentKey=`${effect.icon}:${effect.stacks||0}`;
    if(content&&el.dataset.contentKey!==contentKey){
      content.textContent=effect.icon;
      if(effect.stacks>1){const count=document.createElement('b');count.textContent=effect.stacks;content.appendChild(count)}
      el.dataset.contentKey=contentKey;
    }
  });
}
function closeCombatInspector(){
  const p=$('combatInspectPanel');
  if(p){p.classList.remove('on');p.dataset.side='';p.dataset.id=''}
}
function findLiveCombatant(side,id){
  if($('combatModal').dataset.mode==='arena'&&typeof arenaLiveMission!=='undefined'&&arenaLiveMission?.battle)return side==='enemy'?arenaLiveMission.battle.enemies.find(x=>x.id===id):arenaLiveMission.battle.heroes.find(x=>x.id===id);
  const mid=+$('combatModal').dataset.mission,m=s.missions.find(x=>x.id===mid);
  if(!m?.battle)return null;
  return side==='enemy'?m.battle.enemies.find(x=>x.id===id):m.battle.heroes.find(x=>x.id===id);
}
function positionCombatInspector(el){
  const p=$('combatInspectPanel');if(!p||!el)return;
  const r=el.getBoundingClientRect(),pad=8;
  p.style.left='0px';p.style.top='0px';p.classList.add('on');
  const pw=p.offsetWidth,ph=p.offsetHeight;
  let left=r.right+pad;
  if(left+pw>window.innerWidth-pad)left=r.left-pw-pad;
  left=Math.max(pad,Math.min(left,window.innerWidth-pw-pad));
  let top=r.top;
  if(top+ph>window.innerHeight-pad)top=window.innerHeight-ph-pad;
  top=Math.max(pad,top);
  p.style.left=left+'px';p.style.top=top+'px';
}
function renderCombatInspector(el=null){
  const p=$('combatInspectPanel');if(!p||!p.classList.contains('on'))return;
  const side=p.dataset.side,id=+p.dataset.id,x=findLiveCombatant(side,id);
  if(!x){closeCombatInspector();return}
  const enemy=side==='enemy';
  p.innerHTML=`<div class="combatInspectTop"><div><div class="combatInspectName">${x.name}</div><div class="combatInspectClass">${enemy?(x.boss?'Boss':'Enemy'):(x.displayClass||x.class)}</div></div><button class="combatInspectClose" onclick="closeCombatInspector()">×</button></div>${combatDetailsHtml(x,enemy)}`;
  if(el)positionCombatInspector(el);
}
function toggleCombatantDetails(e,el){
  e.stopPropagation();
  const p=$('combatInspectPanel');if(!p)return;
  const same=p.classList.contains('on')&&p.dataset.side===el.dataset.combatSide&&p.dataset.id===el.dataset.combatId;
  if(same){closeCombatInspector();return}
  p.dataset.side=el.dataset.combatSide;
  p.dataset.id=el.dataset.combatId;
  p.classList.add('on');
  renderCombatInspector(el);
}
function threatOrderedHeroes(heroes){
  if((heroes||[]).some(h=>!h.row)&&typeof assignPartyFormation==='function')assignPartyFormation(heroes);
  const front=[...heroes].filter(h=>h.row==='front').sort((a,b)=>(b.threat||1)-(a.threat||1));
  const back=[...heroes].filter(h=>h.row!=='front').sort((a,b)=>(b.threat||1)-(a.threat||1));
  const out=[];
  const rows=Math.max(front.length,back.length);
  for(let i=0;i<rows;i++){
    if(back[i])out.push({hero:back[i],front:false});
    if(front[i])out.push({hero:front[i],front:true});
  }
  return out;
}
let combatDomKey='';
function combatStructureKey(m){
  return `${m.type}:${m.id}`;
}
function defeatAdviceHtml(m){
  const advice=m.defeatAdvice?.length?m.defeatAdvice:defeatAdviceFor(m);
  return `<b>Party defeated.</b> Combat has stopped.${advice.length?`<div class="defeatAdviceTitle">What to change next</div><ul class="defeatAdviceList">${advice.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}`;
}
function combatReportHtml(m){
  const report=ensureCombatReport(m),rows=Object.values(report.heroes);
  const duration=fmt(Date.now()-(report.startedAt||m.start||Date.now()));
  const deathOrder=report.deaths.length?report.deaths.map((x,i)=>`${i+1}. ${x.name}`).join(' · '):'No recorded deaths';
  return `<div class="combatReportHead"><div><div class="name">Mission Report</div><div class="muted" data-report-summary>${report.encounters||0} encounters resolved${report.offlineEncounters?` · ${report.offlineEncounters} offline`:''} · ${duration} active</div></div><span class="chip" data-report-deaths>${deathOrder}</span></div>
    <div class="combatReportTable"><div class="combatReportRow header"><span>Member</span><span>Damage</span><span>Status</span><span>Healing</span><span>Taken</span><span>Utility</span></div>${rows.map(row=>`<div class="combatReportRow" data-report-hero="${row.id}"><span><b data-report-name>${row.name}</b><small data-report-actions>${row.abilityUses||0} abilities · ${row.criticalHits||0} crits</small></span><span data-report-damage>${Math.round(row.damage||0).toLocaleString()}</span><span data-report-status>${Math.round(row.statusDamage||0).toLocaleString()} · ${row.statusesApplied||0} applied</span><span data-report-healing>${Math.round(row.healing||0).toLocaleString()}</span><span data-report-taken>${Math.round(row.damageTaken||0).toLocaleString()} · ${row.deaths||0} deaths</span><span data-report-utility>${row.interrupts||0} interrupts · ${row.cleanses||0} cleanses</span></div>`).join('')}</div>`;
}
function combatReportKey(m){return Object.values(ensureCombatReport(m).heroes).map(row=>row.id).join('-')}
function updateCombatReport(m){
  const el=$('combatReport');if(!el)return;
  const report=ensureCombatReport(m),rows=Object.values(report.heroes);
  const duration=fmt(Date.now()-(report.startedAt||m.start||Date.now())),summary=el.querySelector('[data-report-summary]'),deaths=el.querySelector('[data-report-deaths]');
  if(summary)summary.textContent=`${report.encounters||0} encounters resolved${report.offlineEncounters?` · ${report.offlineEncounters} offline`:''} · ${duration} active`;
  if(deaths)deaths.textContent=report.deaths.length?report.deaths.map((x,i)=>`${i+1}. ${x.name}`).join(' · '):'No recorded deaths';
  rows.forEach(row=>{
    const card=el.querySelector(`[data-report-hero="${row.id}"]`);if(!card)return;
    const set=(selector,value)=>{const node=card.querySelector(selector);if(node)node.textContent=value};
    set('[data-report-name]',row.name);set('[data-report-actions]',`${row.abilityUses||0} abilities · ${row.criticalHits||0} crits`);set('[data-report-damage]',Math.round(row.damage||0).toLocaleString());set('[data-report-status]',`${Math.round(row.statusDamage||0).toLocaleString()} · ${row.statusesApplied||0} applied`);set('[data-report-healing]',Math.round(row.healing||0).toLocaleString());set('[data-report-taken]',`${Math.round(row.damageTaken||0).toLocaleString()} · ${row.deaths||0} deaths`);set('[data-report-utility]',`${row.interrupts||0} interrupts · ${row.cleanses||0} cleanses`);
  });
}
function buildCombatStructure(m){
  const arenaMode=m.type==='arena';
  const matTotal=Object.values(m.stash.materials||{}).reduce((a,v)=>a+v,0);
  const ordered=threatOrderedHeroes(m.battle.heroes);
  $('combatBody').innerHTML=`
    <div class="combatFixedTop">
      <div id="combatDefeatedBanner" class="card dangerText defeatAnalysis" style="margin-bottom:7px;display:${m.defeated?'block':'none'}">${m.defeated?(arenaMode?'<b>Arena defeat.</b> Your defense and normal activities are unaffected.':defeatAdviceHtml(m)):''}</div>
      <div class="combatGrid">
        <div class="combatTeamPane"><div class="muted" style="margin-bottom:5px">${arenaMode?'YOUR ARENA PARTY · ATTACKING':'YOUR PARTY · FRONT AND BACK ROW'}</div><div class="combatSide compactCombatSide" id="combatHeroSide">${ordered.map((x,index)=>combatantHtml(x.hero,false,x.front,{slot:index})).join('')}</div></div>
        <div class="combatTeamPane"><div class="muted" style="margin-bottom:5px">${arenaMode?'OPPONENT PARTY · DEFENDING':'ENEMIES · REAL-TIME COMBAT'}</div><div class="combatSide compactCombatSide" id="combatEnemySide">${Array.from({length:COMBAT_ENEMY_SLOT_COUNT},(_,index)=>`<div class="combatEnemySlot" data-combat-slot="enemy:${index}" ${m.battle.enemies[index]?'':'hidden aria-hidden="true" style="display:none!important"'}>${m.battle.enemies[index]?combatantHtml(m.battle.enemies[index],true,false):emptyCombatSlotHtml(true,index)}</div>`).join('')}</div></div>
      </div>
      <div class="lootStash" style="display:${arenaMode?'none':'grid'}">
        <div class="lootBox"><span>Unclaimed gold</span><strong id="combatGold">${m.stash.gold}</strong></div>
        <div class="lootBox"><span>Unclaimed rep</span><strong id="combatRep">${m.stash.rep}</strong></div>
        <div class="lootBox"><span>Materials</span><strong id="combatMaterials">${matTotal}</strong></div>
        <div class="lootBox"><span>Items</span><strong id="combatItems">${m.stash.items.length}</strong></div>
      </div>
    </div>
    <div class="card combatReport" id="combatReport" data-report-key="${combatReportKey(m)}">${combatReportHtml(m)}</div>
    <div class="log combatLog" id="combatLog"></div>
    <div class="combatInspectPanel" id="combatInspectPanel"></div>
  `;
  combatDomKey=combatStructureKey(m);
}
function updateCombatantDom(x,enemy,slotElement=null){
  let el=slotElement||document.querySelector(`[data-combatant="${enemy?'enemy':'hero'}-${x.id}"]`);
  if(!el)return;
  // Encounter creation produces fresh combat-state objects. Never replace an
  // existing card because of that: replacing the element resets animations,
  // effect icons and timer bars, which made every new encounter look like a
  // full combat-view refresh.
  el.dataset.entitySignature=combatEntitySignature(x,enemy);
  el.classList.toggle('combatThreatFront',!enemy&&x.row==='front');
  const pct=clamp(x.hp/x.maxHp*100,0,100);
  const previousHp=Number(el.dataset.lastHp),hpDelta=x.hp-previousHp;
  if(Number.isFinite(previousHp)&&hpDelta!==0){
    const float=el.querySelector('.combatFloat');
    if(float){float.textContent=(hpDelta>0?'+':'−')+Math.abs(Math.round(hpDelta));float.className='combatFloat pop '+(hpDelta>0?'good':'dangerText');setTimeout(()=>float.classList.remove('pop'),350)}
    el.classList.remove(hpDelta>0?'combatHeal':'combatHit');void el.offsetWidth;el.classList.add(hpDelta>0?'combatHeal':'combatHit');setTimeout(()=>el.classList.remove('combatHeal','combatHit'),240);
  }
  el.dataset.lastHp=x.hp;
  const hp=el.querySelector('.combatantHp'),fill=el.querySelector('.hpFill'),manaTrack=el.querySelector('.manaTrack'),manaFill=el.querySelector('.manaFill'),attackFill=el.querySelector('.attackFill'),name=el.querySelector('.combatantName'),classLine=el.querySelector('.combatMiniClass'),visualIcon=el.querySelector('.visualIcon');
  if(name)name.textContent=x.name;
  if(classLine)classLine.textContent=enemy?(x.boss?'BOSS':'Enemy'):`${x.displayClass||x.class} · ${x.row==='front'?'Front':'Back'}`;
  const iconKey=enemy?`enemy:${x.name}`:`hero:${x.class}:${x.subclass||''}`;
  if(visualIcon&&el.dataset.iconKey!==iconKey){
    visualIcon.innerHTML=enemy?x.icon:(x.subclass?gameIcon('subclass',x.subclass,iconFallback('class',x.class),'gameAsset combatAsset'):gameIcon('class',x.class,iconFallback('class',x.class),'gameAsset combatAsset'));
    el.dataset.iconKey=iconKey;
  }
  if(hp)hp.textContent=`${Math.max(0,x.hp)}/${x.maxHp}`;
  if(fill)fill.style.width=pct+'%';
  if(manaTrack)manaTrack.style.display=!enemy||x.maxMana?'block':'none';
  if(manaFill)manaFill.style.width=clamp((x.mana||0)/Math.max(1,x.maxMana||1)*100,0,100)+'%';
  if(attackFill){const attackPct=attackTimerProgress(x,enemy,Date.now())*100,previousAttack=Number(el.dataset.lastAttack);attackFill.style.width=attackPct+'%';if(Number.isFinite(previousAttack)&&attackPct+35<previousAttack){el.classList.remove('combatAct');void el.offsetWidth;el.classList.add('combatAct');setTimeout(()=>el.classList.remove('combatAct'),240)}el.dataset.lastAttack=attackPct}
  const statusRow=el.querySelector('.combatStatusRow');
  if(statusRow)updateCombatEffects(statusRow,x,enemy);
  if(enemy){
    const track=el.querySelector('.castTrack'),fillCast=el.querySelector('.castFill'),label=el.querySelector('.castLabel');
    if(track){
      track.style.display=x.cast?'block':'none';
      if(x.cast){const ability=ENEMY_ABILITIES_DATA[x.cast.abilityId],total=Math.max(1,x.cast.completeAt-x.cast.startedAt),pct=clamp((Date.now()-x.cast.startedAt)/total*100,0,100);if(fillCast)fillCast.style.width=pct+'%';if(label)label.textContent=ability?.name||'Casting'}
    }
  }
  const activeType=primaryActiveType(x);
  if(!enemy&&activeType&&!el.querySelector('.cooldownTrack')){
    const vitals=el.querySelector('.combatMiniVitals')||el.lastElementChild;
    if(vitals){
      const track=document.createElement('div');
      track.className='cooldownTrack';
      track.dataset.cooldownTrack=activeType;
      track.innerHTML=`<div class="cooldownFill" data-cooldown-type="${activeType}"></div>`;
      vitals.appendChild(track);
    }
  }
  const p=$('combatInspectPanel');
  if(p?.classList.contains('on')&&p.dataset.side===(enemy?'enemy':'hero')&&+p.dataset.id===x.id)renderCombatInspector();
}
function renderPersistentCombatSlots(m){
  const heroSide=$('combatHeroSide'),enemySide=$('combatEnemySide');if(!heroSide||!enemySide)return;
  const heroes=threatOrderedHeroes(m.battle.heroes).map(x=>x.hero),enemies=m.battle.enemies||[];
  const heroCards=[...heroSide.querySelectorAll('[data-combat-slot]')];
  heroes.forEach((hero,index)=>{
    const el=heroCards[index];if(!el)return;
    setCombatSlotVisible(el,true);el.dataset.combatant=`hero-${hero.id}`;el.dataset.combatSide='hero';el.dataset.combatId=hero.id;
    updateCombatantDom(hero,false,el);
  });
  heroCards.slice(heroes.length).forEach(el=>{setCombatSlotVisible(el,false);delete el.dataset.combatant;delete el.dataset.combatId});
  const enemySlots=[...enemySide.querySelectorAll('.combatEnemySlot[data-combat-slot]')];
  enemies.forEach((enemy,index)=>{
    const slot=enemySlots[index];if(!slot)return;
    let el=slot.querySelector('.combatant');
    if(!el){slot.insertAdjacentHTML('afterbegin',combatantHtml(enemy,true,false));el=slot.querySelector('.combatant')}
    if(!el)return;
    const encounterSlot=`${m.battle.id}:${index}`;
    const enteringNewEncounter=slot.dataset.encounterSlot!==encounterSlot;
    setCombatSlotVisible(slot,true);
    el.classList.remove('combatSlotEmpty');
    el.dataset.combatant=`enemy-${enemy.id}`;
    el.dataset.combatSide='enemy';
    el.dataset.combatId=enemy.id;
    el.dataset.entitySignature=combatEntitySignature(enemy,true);
    if(enteringNewEncounter){
      slot.dataset.encounterSlot=encounterSlot;
      el.dataset.lastHp=enemy.hp;
      el.dataset.lastAttack=attackTimerProgress(enemy,true,Date.now())*100;
    }
    updateCombatantDom(enemy,true,el);
  });
  enemySlots.slice(enemies.length).forEach(slot=>{
    setCombatSlotVisible(slot,false);slot.dataset.encounterSlot='';
    const el=slot.querySelector('.combatant');if(el){delete el.dataset.combatant;delete el.dataset.combatId}
  });
}
function updateCombatLog(m){
  const logEl=$('combatLog');if(!logEl)return;
  const lines=[...(m.battle.log||[])].reverse();
  const signature=`${m.battle.id}:${m.battle.actionSeq||0}:${lines.length}`;
  if(logEl.dataset.signature===signature)return;
  const wasNearBottom=logEl.scrollHeight-logEl.scrollTop-logEl.clientHeight<45;
  lines.forEach((line,index)=>{
    let row=logEl.children[index];
    if(!row){row=document.createElement('div');logEl.appendChild(row)}
    const className=line.includes('⚠')?'dangerText':line.toLowerCase().includes('heal')||line.includes('regenerates')?'healText':'';
    if(row.dataset.rawLine!==line){row.textContent=line;row.dataset.rawLine=line}
    row.className=className;
  });
  while(logEl.children.length>lines.length)logEl.lastElementChild.remove();
  logEl.dataset.signature=signature;
  if(wasNearBottom||!logEl.dataset.initialized)logEl.scrollTop=logEl.scrollHeight;
  logEl.dataset.initialized='1';
}
function renderCombat(){
  if(!$('combatModal').classList.contains('on'))return;
  const arenaMode=$('combatModal').dataset.mode==='arena';
  const mid=+$('combatModal').dataset.mission,m=arenaMode?(typeof arenaLiveMission!=='undefined'?arenaLiveMission:null):s.missions.find(x=>x.id===mid);if(!m){closeCombat();return}
  if(!m.battle)return;

  $('combatTitle').textContent=m.name;
  $('combatSubtitle').textContent=arenaMode?`${m.attackerGuild} vs ${m.defenderGuild} · real-time Arena combat`:`${m.maxFights?(m.battle?.boss?'BOSS':('Encounter '+(m.battle?.encounterNumber||normalEncounterCount(m)+1)+' / '+m.maxFights)):m.fights+' fights'} · ${m.kills} kills · Battle #${m.battle?.id||'-'} · Action ${m.battle?.actionSeq||0} · ${living(m.battle?.enemies||[]).length} enemies alive · real-time combat`;

  if(!$('combatLog'))buildCombatStructure(m);
  renderPersistentCombatSlots(m);

  const matTotal=Object.values(m.stash.materials||{}).reduce((a,v)=>a+v,0);
  
  if($('combatGold'))$('combatGold').textContent=m.stash.gold;
  if($('combatRep'))$('combatRep').textContent=m.stash.rep;
  if($('combatMaterials'))$('combatMaterials').textContent=matTotal;
  if($('combatItems'))$('combatItems').textContent=m.stash.items.length;
  updateCombatReport(m);
  if($('combatDefeatedBanner')){
    $('combatDefeatedBanner').style.display=m.defeated?'block':'none';
    if(m.defeated)$('combatDefeatedBanner').innerHTML=m.type==='arena'?'<b>Arena defeat.</b> Your defense and normal activities are unaffected.':defeatAdviceHtml(m);
  }

  updateCombatLog(m);
  colorizeStatTerms($('combatBody'));
}
function renderLog(){$('log').innerHTML=s.log.map(x=>`<div>${x}</div>`).join('')}
function renameCharacter(hid){
  const h=s.members.find(x=>x.id===hid);if(!h)return;
  showModal('Rename Character',`<div class="card"><div class="muted">Choose a new name for this guild member.</div><input id="characterRenameInput" maxlength="30" value="${h.name.replace(/"/g,'&quot;')}" style="width:100%;margin-top:10px"><div class="modalActionRow"><button class="btn gold" onclick="confirmCharacterRename(${h.id})">Save Name</button></div></div>`);
  setTimeout(()=>{const el=$('characterRenameInput');if(el){el.focus();el.select()}},0);
}
function confirmCharacterRename(hid){
  const h=s.members.find(x=>x.id===hid),el=$('characterRenameInput');if(!h||!el)return;
  const name=el.value.trim().replace(/\s+/g,' ');
  if(!name)return notify('Name cannot be empty.');
  h.name=name.slice(0,30);
  save();closeModal();render();
  notify('Character renamed.','good');
}
let rosterSortKey='power';
let rosterSortDirection='desc';
function setRosterSort(key){
  rosterSortKey=key||'power';
  renderRoster();
}
function toggleRosterSortDirection(){
  rosterSortDirection=rosterSortDirection==='desc'?'asc':'desc';
  renderRoster();
}
function rosterSortValue(h,key){
  const z=hs(h),combat=heroAttackDisplay(h,z);
  if(key==='level')return h.level||0;
  if(key==='class')return String(displayClass(h)||'').toLowerCase();
  if(key==='name')return String(h.name||'').toLowerCase();
  if(key in z)return Number(z[key])||0;
  return 0;
}
function sortedRosterMembers(){
  return [...s.members].sort((a,b)=>{
    const av=rosterSortValue(a,rosterSortKey),bv=rosterSortValue(b,rosterSortKey);
    let cmp=0;
    if(typeof av==='string'||typeof bv==='string')cmp=String(av).localeCompare(String(bv));
    else cmp=av-bv;
    if(cmp===0)cmp=String(a.name||'').localeCompare(String(b.name||''));
    return rosterSortDirection==='asc'?cmp:-cmp;
  });
}
function renderRoster(){
  const members=sortedRosterMembers();
  if(!s.selected&&members[0])s.selected=members[0].id;
  $('rosterList').innerHTML=members.length?members.map(h=>{
    const z=hs(h);
    return `<div class="card hero ${s.selected===h.id?'on':''}" onclick="s.selected=${h.id};save();renderRoster()">
      ${h.level>=10&&!h.subclass?`<div class="subclassReadyBadge" title="Subclass available">!</div>`:''}
      <div class="heroTop">
        <div class="portrait">${classIcon(h,'gameAsset portraitAsset')}</div>
        <div style="min-width:0"><div class="name">${h.name}</div><div class="muted">${displayClass(h)} · ${h.race} · Lv. ${h.level}</div></div>
      </div>
      <div class="power"><span>${h.busy?'Away':h.trait}</span><strong>${z.power}</strong></div>
    </div>`;
  }).join(''):'<div class="empty">No guild members recruited.</div>';
  const selected=s.members.find(x=>x.id===s.selected)||members[0];
  if(selected){
    s.selected=selected.id;
    $('heroDetail').innerHTML=heroDetail(selected);
  }else $('heroDetail').innerHTML='<div class="empty">Select or recruit a guild member.</div>';
  const sel=$('rosterSortSelect'),dir=$('rosterSortDir');
  if(sel)sel.value=rosterSortKey;
  if(dir)dir.textContent=rosterSortDirection==='desc'?'Highest first':'Lowest first';
}
function chooseSubclass(hid){
  const h=s.members.find(x=>x.id===hid);if(!h)return;
  if(h.level<10)return notify('Subclass unlocks at level 10.');
  if(h.subclass)return showCharacterSkills(hid);
  const choices=SUBCLASSES[h.class]||[];
  showModal('Choose '+h.class+' Specialization',`<div class="g2">${choices.map(x=>`<div class="card"><div class="name">${x.name}</div><div class="muted" style="margin-top:6px"><b>Passive:</b> ${x.passive}</div><div class="muted" style="margin-top:6px"><b>Active:</b> ${x.active}</div><div class="modalActionRow"><button class="btn gold" onclick="selectSubclass(${h.id},'${x.id}')">Choose ${x.name}</button></div></div>`).join('')}</div>`);
}
function selectSubclass(hid,sid){
  const h=s.members.find(x=>x.id===hid);if(!h||h.level<10||h.subclass)return;
  const sub=(SUBCLASSES[h.class]||[]).find(x=>x.id===sid);if(!sub)return;
  h.subclass=sid;
  save();closeModal();renderRoster();
  notify(h.name+' specialized as '+sub.name+'.','good');
}
function showCharacterSkills(hid){
  const h=s.members.find(x=>x.id===hid);if(!h)return;
  const sub=subclassDef(h);
  const baseSkills={
    Warrior:['Basic Attack — attacks with the equipped weapon.'],
    Ranger:['Basic Attack — attacks with the equipped ranged weapon.'],
    Mage:['Arcane Burst — before specialization, has a chance to hit all enemies.'],
    Priest:['Heal — automatically heals a wounded ally below 70% HP.'],
    Rogue:['Critical Strike — base 18% chance to critically hit.'],
    Paladin:['Basic Attack — attacks while naturally carrying high Threat.']
  }[h.class]||[];
  const quirk=traitDef(h),race=raceDef(h);
  showModal(h.name+' · Skills',`<div class="card"><div class="name">${sub?sub.name:h.class}</div><div class="muted">${sub?'Specialization selected.':'Specialization unlocks at level 10.'}</div></div>
  <div class="card racialPassiveCard" style="margin-top:10px"><div class="name">${race.passive} · ${h.race} Racial Passive</div><div class="muted" style="margin-top:7px">${race.desc}</div></div>
  <div class="card" style="margin-top:10px"><div class="name">Quirk · ${h.trait}</div><div class="muted" style="margin-top:7px">${quirk?.desc||'No special quirk effect.'}</div></div>
  <div class="card" style="margin-top:10px"><div class="name">Base Skills</div>${baseSkills.map(x=>`<div class="muted" style="margin-top:7px">${x}</div>`).join('')}</div>
  ${sub?`<div class="card" style="margin-top:10px"><div class="name">Passive</div><div class="muted" style="margin-top:7px">${sub.passive}</div></div><div class="card" style="margin-top:10px"><div class="name">Active Skill</div><div class="muted" style="margin-top:7px">${sub.active}</div></div>`:''}
  ${!sub&&h.level>=10?`<button class="btn gold" style="margin-top:12px" onclick="closeModal();chooseSubclass(${h.id})">Choose Specialization</button>`:''}`);
}
function showGatheringSkills(hid){
  const h=s.members.find(x=>x.id===hid);if(!h)return;
  showModal(h.name+' · Gathering Skills',`<div class="stats">${Object.entries(SKILL_NAMES).map(([k,n])=>{const sk=gatheringSkill(h,k),need=skillXpNeeded(sk.level);return `<div class="stat"><span>${n}</span><strong>Lv. ${sk.level}</strong><small>${sk.xp} / ${need} XP</small><div class="progressTrack" style="margin-top:6px"><div class="progressFill" style="width:${Math.min(100,sk.xp/need*100)}%"></div></div></div>`}).join('')}</div><div class="muted" style="margin-top:12px">Higher skill slightly increases bonus yield and unlocks advanced gathering locations.</div>`);
}
function heroAttackDisplay(h,z=hs(h)){
  const wep=s.inventory.find(x=>x.id===h.equip?.Weapon);
  const attack=wep?.weaponPower||0;
  const baseAttackTime=weaponAttackTime(wep?.weaponTemplate||wep?.weaponType||'');
  const unit={baseAttackTime,attackSpeed:z.attackSpeed||0,buffs:{}};
  return{
    attack,
    attackSpeed:z.attackSpeed||0,
    attackTime:heroAttackIntervalMs(unit)/1000
  };
}
function heroDetail(h){
  const z=hs(h),combat=heroAttackDisplay(h,z),slots=C[h.class].slots,sub=subclassDef(h),quirk=traitDef(h);
  const wep=s.inventory.find(x=>x.id===h.equip.Weapon);
  const scaling=wep?`${wep.weaponType} · ${String(wep.scale).toUpperCase()} scaling · ${elementIcon[wep.damageType||'physical']} ${wep.damageType}`:'No weapon equipped';
  const baseSkills={
    Warrior:['Basic Attack — attacks with the equipped weapon.'],
    Ranger:['Basic Attack — attacks with the equipped ranged weapon.'],
    Mage:['Arcane Burst — before specialization, can hit all enemies.'],
    Priest:['Heal — automatically heals a wounded ally below 70% HP.'],
    Rogue:['Critical Strike — has an increased base critical chance.'],
    Paladin:['High Threat — naturally attracts more enemy attacks.']
  }[h.class]||[];

  const equipment=slots.map(k=>{
    const it=s.inventory.find(x=>x.id===h.equip[k]);
    const icon=it&&it.slot==='Weapon'?(weaponDefForItem(it)?.icon||itemIcons[k]||'🎒'):(itemIcons[k]||'🎒');
    return `<div class="detailEquipRow" onclick="equipModal(${h.id},'${k}')">
      <div class="detailEquipIcon">${icon}</div>
      <div class="detailEquipText"><small>${k}</small><b>${it?it.name:'Empty'}</b><small>${it?statText(it):'Click to equip'}</small></div>
      ${it?`<button class="btn" style="padding:4px 6px" onclick="event.stopPropagation();unequipItem(${h.id},'${k}')">Unequip</button>`:''}
    </div>`;
  }).join('');

  const gather=Object.entries(SKILL_NAMES).map(([k,n])=>{
    const sk=gatheringSkill(h,k),need=skillXpNeeded(sk.level);
    return `<div class="stat"><span>${n}</span><strong>Lv. ${sk.level}</strong><small>${sk.xp}/${need} XP</small></div>`;
  }).join('');

  return `<div class="detailHeader">
    <div class="detailIdentity">
      <div class="portrait">${classIcon(h,'gameAsset portraitAsset')}</div>
      <div style="min-width:0"><h2>${h.name}</h2><div class="muted">${displayClass(h)} · ${h.race} · Lv. ${h.level} · ${h.rarity}</div><div class="muted">${h.trait}${h.busy?' · Away':''}</div></div>
    </div>
    <div style="text-align:right"><b>${z.power} power</b></div>
  </div>
  <div class="detailActions" style="margin-top:8px">
    <button class="btn" onclick="renameCharacter(${h.id})">Rename</button>
    ${h.level>=10&&!h.subclass?`<button class="btn gold" onclick="chooseSubclass(${h.id})">Choose Specialization</button>`:''}
    <button class="btn" onclick="dismissHero(${h.id})">Dismiss</button>
  </div>

  <div class="detailSection">
    <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:10px;margin-bottom:5px"><span>Level ${h.level} XP</span><span>${h.xp} / ${heroXpNeeded(h.level)}</span></div>
    <div class="progressTrack"><div class="progressFill" style="width:${Math.min(100,h.xp/heroXpNeeded(h.level)*100)}%"></div></div>
  </div>

  <div class="detailSection">
    <h3>Stats</h3>
    <div class="characterStatSheet">
      <div class="characterStatGroup">
        <div class="characterStatHeading">Resources</div>
        <div class="characterStatGrid">
          <div class="stat statHP"><span>HP</span><strong>${z.hp}</strong></div>
          <div class="stat statMana"><span>Mana</span><strong>${z.mana}</strong></div>
          <div class="stat"><span>HP Regen</span><strong>${z.regen}</strong></div>
          <div class="stat statManaRegen"><span>Mana Regen</span><strong>${z.manaRegen}</strong></div>
        </div>
      </div>

      <div class="characterStatGroup">
        <div class="characterStatHeading">Attributes</div>
        <div class="characterStatGrid">
          <div class="stat"><span class="statSTR">STR</span><strong>${z.str}</strong></div>
          <div class="stat"><span class="statDEX">DEX</span><strong>${z.dex}</strong></div>
          <div class="stat"><span class="statINT">INT</span><strong>${z.int}</strong></div>
        </div>
      </div>

      <div class="characterStatGroup">
        <div class="characterStatHeading">Combat</div>
        <div class="characterStatGrid">
          <div class="stat"><span>Attack</span><strong>${combat.attack}</strong></div>
          <div class="stat"><span>Attack Speed</span><strong>${combat.attackSpeed>=0?'+':''}${Math.round(combat.attackSpeed*100)}%</strong></div>
          <div class="stat"><span>Attack Time</span><strong>${combat.attackTime.toFixed(2)}s</strong></div>
          <div class="stat"><span>Lifesteal</span><strong>${z.lifesteal}%</strong></div>
        </div>
      </div>

      <div class="characterStatGroup">
        <div class="characterStatHeading">Defense</div>
        <div class="characterStatGrid">
          <div class="stat"><span>DEF</span><strong>${z.def}</strong></div>
          <div class="stat"><span>MDEF</span><strong>${z.mdef}</strong></div>
          <div class="stat"><span>Block</span><strong>${z.block}</strong></div>
          <div class="stat"><span>Threat</span><strong>${z.threat.toFixed(1)}</strong></div>
          <div class="stat"><span>Phys Dodge</span><strong>${(z.physicalDodge*100).toFixed(1)}%</strong></div>
          <div class="stat"><span>Magic Dodge</span><strong>${(z.magicalDodge*100).toFixed(1)}%</strong></div>
        </div>
      </div>

      <div class="characterStatGroup">
        <div class="characterStatHeading">Resistances</div>
        <div class="characterStatGrid">
          <div class="stat statResistance fire"><span>Fire</span><strong>${z.fire}%</strong></div>
          <div class="stat statResistance ice"><span>Ice</span><strong>${z.ice}%</strong></div>
          <div class="stat statResistance poison"><span>Poison</span><strong>${z.poison}%</strong></div>
          <div class="stat statResistance lightning"><span>Lightning</span><strong>${z.lightning}%</strong></div>
          <div class="stat statResistance holy"><span>Holy</span><strong>${z.holy||0}%</strong></div>
          <div class="stat statResistance dark"><span>Dark</span><strong>${z.dark||0}%</strong></div>
        </div>
      </div>
    </div>
    <div class="chips"><span class="chip">${scaling}</span><span class="chip">Weapons: ${allowedWeapons(h).join(', ')}</span><span class="chip">Armor: up to ${maxArmorClass(h)}</span></div>
  </div>

  <div class="detailSection">
    <h3>Equipment</h3>
    <div class="detailEquipment">${equipment}</div>
  </div>

  <div class="detailSection">
    <h3>Skills & Passives</h3>
    <div class="detailSkillCard racialPassiveCard"><b>${raceDef(h).passive} · ${h.race} Racial Passive</b><span>${raceDef(h).desc}</span></div>
    <div class="detailSkillCard"><b>Quirk · ${h.trait}</b><span>${quirk?.desc||'No special quirk effect.'}</span></div>
    ${baseSkills.map(x=>`<div class="detailSkillCard"><b>Base Skill</b><span>${x}</span></div>`).join('')}
    ${sub?`<div class="detailSkillCard"><b>${sub.name} Passive</b><span>${sub.passive}</span></div><div class="detailSkillCard"><b>${sub.name} Active</b><span>${sub.active}</span></div>`:`<div class="detailSkillCard"><b>Specialization</b><span>${h.level>=10?'Ready to choose a specialization.':'Unlocks at level 10.'}</span></div>`}
  </div>

  <div class="detailSection">
    <h3>Gathering Skills</h3>
    <div class="detailGathering">${gather}</div>
  </div>`;
}
