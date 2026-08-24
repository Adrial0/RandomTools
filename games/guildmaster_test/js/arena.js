// Online asynchronous Arena client. All rating changes and match resolution are server-side.
let arenaClient=null;
let arenaSession=null;
let arenaConfig=null;
let arenaData={profile:null,defense:null,opponents:[],leaderboard:[],history:[]};
let arenaBusy=false;
let arenaPlaybackToken=0;

function arenaEscape(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function arenaSetConnection(text,state=''){
  const el=$('arenaConnectionState');if(!el)return;el.textContent=text;el.className='chip '+state;
}
function arenaMessage(message,type='bad'){notify(message,type)}
function arenaAccountHtml(){
  if(!arenaConfig?.enabled)return `<div class="arenaSetupNotice"><div class="name">Online Arena is not configured</div><div class="muted">Create a Supabase project, copy <code>data/online.example.json</code> to <code>data/online.json</code>, and add the project URL and publishable key.</div></div>`;
  if(!arenaSession)return `<div class="arenaSetupNotice"><div class="name">Creating Arena identity…</div><div class="muted">No login is required.</div></div>`;
  return `<div class="arenaSignedIn"><div><div class="name">${arenaEscape(s.guild||'Unnamed Guild')}</div><div class="muted">Rating ${arenaData.profile?.rating??1000} · ${arenaData.profile?.wins??0} wins / ${arenaData.profile?.losses??0} losses</div></div></div>`;
}
function renderArenaAccount(){
  if($('arenaAccount'))$('arenaAccount').innerHTML=arenaAccountHtml();
  if($('arenaOnlineContent'))$('arenaOnlineContent').style.display=arenaSession?'':'none';
}
async function initArenaOnline(){
  try{
    const response=await fetch('data/online.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Missing data/online.json');
    arenaConfig=await response.json();
  }catch(err){arenaConfig={enabled:false};console.warn('Arena configuration unavailable.',err)}
  if(!arenaConfig.enabled){arenaSetConnection('Setup required');renderArenaAccount();return}
  if(!window.supabase?.createClient){arenaSetConnection('Client unavailable','bad');renderArenaAccount();return}
  arenaClient=window.supabase.createClient(arenaConfig.supabaseUrl,arenaConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let {data}=await arenaClient.auth.getSession();arenaSession=data.session;
  if(!arenaSession){
    const created=await arenaClient.auth.signInAnonymously();
    if(created.error){arenaSetConnection('Identity error','bad');renderArenaAccount();arenaMessage(created.error.message);return}
    arenaSession=created.data.session;
  }
  arenaClient.auth.onAuthStateChange((_event,session)=>{arenaSession=session;renderArenaAccount();if(session)refreshArenaData()});
  arenaSetConnection('Connected','good');renderArenaAccount();
  if(s.guildNamed&&s.guild){
    const claimed=await claimArenaGuildName(s.guild);
    if(!claimed&&typeof openGuildNameModal==='function')openGuildNameModal(true,'That guild name is already used in the Arena. Choose a unique name to continue.');
  }
  if(arenaSession)await refreshArenaData();
}
async function claimArenaGuildName(name){
  if(!arenaClient||!arenaSession)return true;
  try{await arenaInvoke('claim-guild-name',{guildName:name});return true}
  catch(err){arenaMessage(err.message);if(/already taken/i.test(err.message))$('guildNameInput')?.select();return false}
}
async function arenaInvoke(name,body={}){
  if(!arenaClient||!arenaSession)throw new Error('Arena identity is not ready yet.');
  const {data,error}=await arenaClient.functions.invoke(name,{body});
  if(error){
    let message=error.message||'Arena request failed.';
    const response=error.context;
    if(response&&typeof response.clone==='function'){
      try{
        const payload=await response.clone().json();
        if(payload?.error)message=typeof payload.error==='string'?payload.error:JSON.stringify(payload.error);
      }catch(_ignored){
        try{const detail=await response.clone().text();if(detail)message=detail}catch(_alsoIgnored){}
      }
    }
    throw new Error(message);
  }
  if(data?.error)throw new Error(data.error);
  return data;
}
async function refreshArenaData(force=false){
  if(!arenaSession||(arenaBusy&&!force))return;
  arenaBusy=true;arenaSetConnection('Syncing…');
  try{arenaData=await arenaInvoke('arena-data');arenaSetConnection('Connected','good');renderArenaAccount();renderArenaData()}
  catch(err){arenaSetConnection('Connection error','bad');arenaMessage(err.message)}finally{arenaBusy=false}
}
function arenaHeroSnapshot(h){
  const z=hs(h),weapon=s.inventory.find(it=>it.id===h.equip?.Weapon),wd=weaponDefForItem(weapon);
  return{
    sourceId:h.id,name:h.name,class:h.class,subclass:h.subclass||null,level:h.level,power:z.power,
    maxHp:z.hp,str:z.str,dex:z.dex,int:z.int,def:z.def,mdef:z.mdef,block:z.block||0,threat:z.threat||1,
    physicalDodge:z.physicalDodge||0,magicalDodge:z.magicalDodge||0,regen:z.regen||0,lifesteal:z.lifesteal||0,
    fire:z.fire||0,ice:z.ice||0,poison:z.poison||0,lightning:z.lightning||0,holy:z.holy||0,dark:z.dark||0,
    weaponPower:weapon?.weaponPower||wd?.base||8,damageType:weapon?.damageType||'physical',armorPen:z.armorPen||0,
    critChance:clamp((h.class==='Rogue' ? .18 : 0)+(z.critBonus||0),0,.75),critDamage:z.critDamage||0,
    statusChance:clamp(z.statusChance||0,0,.75),attackInterval:heroAttackIntervalMs({baseAttackTime:weaponAttackTime(weapon?.weaponTemplate||weapon?.weaponType||''),attackSpeed:z.attackSpeed,buffs:{}}),
    activeType:z.activeType||(h.class==='Priest'?'Heal':h.class==='Mage'?'arcaneBurst':null),element:z.element||null,healMult:z.healMult||1,damageMult:z.damageMult||1
  };
}
function openArenaPartyPicker(){
  if(!arenaSession)return arenaMessage('Sign in before publishing a defense.');
  const members=s.members.filter(h=>!h.busy);
  if(!members.length)return arenaMessage('No available guild members.');
  const selected=new Set((arenaData.defense?.snapshot?.members||[]).map(x=>x.sourceId));
  showModal('Choose Arena Defense',`<div class="card"><div class="muted">Choose 1–5 available members. Arena snapshots update only when you publish.</div><div class="party arenaPartyPicker" id="arenaPartyPicker">${members.map(h=>`<button class="partyMember ${selected.has(h.id)?'on':''}" data-h="${h.id}" onclick="toggleArenaMember(this)"><span class="miniClass">${classIcon(h)}</span><span>${arenaEscape(h.name)} · ${displayClass(h)} · ${hs(h).power} power</span></button>`).join('')}</div><div class="modalActionRow"><button class="btn gold" onclick="publishArenaParty()">Publish Defense</button></div></div>`);
}
function toggleArenaMember(button){
  const selected=document.querySelectorAll('#arenaPartyPicker .partyMember.on');
  if(!button.classList.contains('on')&&selected.length>=5)return arenaMessage('Arena parties are limited to five members.');
  button.classList.toggle('on');
}
async function publishArenaParty(){
  if(arenaBusy)return;
  const ids=[...document.querySelectorAll('#arenaPartyPicker .partyMember.on')].map(x=>+x.dataset.h);
  if(!ids.length||ids.length>5)return arenaMessage('Choose between one and five members.');
  const members=ids.map(id=>s.members.find(h=>h.id===id)).filter(Boolean);
  if(members.length!==ids.length||members.some(h=>h.busy))return arenaMessage('One selected member is no longer available.');
  const snapshot={guildName:s.guild,guildLevel:s.level,memberCap:5,members:members.map(arenaHeroSnapshot),publishedAt:new Date().toISOString(),combatVersion:1};
  arenaBusy=true;
  try{await arenaInvoke('publish-party',{snapshot,guildName:s.guild});closeModal();arenaMessage('Arena defense published.','good');await refreshArenaData(true)}
  catch(err){arenaMessage(err.message)}finally{arenaBusy=false}
}
async function fightArenaOpponent(partyId){
  if(arenaBusy)return;
  const defense=arenaData.defense;if(!defense)return arenaMessage('Publish your Arena defense before challenging opponents.');
  arenaBusy=true;
  try{
    const result=await arenaInvoke('fight-arena',{opponentPartyId:partyId,requestId:crypto.randomUUID()});
    showArenaResult(result);await refreshArenaData(true);
  }catch(err){arenaMessage(err.message)}finally{arenaBusy=false}
}
function showArenaResult(result){
  const token=++arenaPlaybackToken,units=new Map((result.combatants||[]).map(x=>[x.id,{...x,hp:x.maxHp}]));
  const card=x=>{const icon=x.subclass?gameIcon('subclass',x.subclass,iconFallback('class',x.class),'gameAsset combatAsset'):gameIcon('class',x.class,iconFallback('class',x.class),'gameAsset combatAsset');return `<div class="combatant combatMini arenaCombatant" id="arenaUnit-${x.id}" data-arena-unit="${x.id}"><div class="visualIcon">${icon}</div><div class="combatMiniVitals"><div class="combatMiniNameRow"><div class="name combatantName">${arenaEscape(x.name)}</div><span class="combatantHp">${x.maxHp}/${x.maxHp}</span></div><div class="combatMiniClass">${arenaEscape(x.subclass||x.class)}</div><div class="hpTrack"><div class="hpFill" style="width:100%"></div></div><div class="attackTrack"><div class="attackFill" style="width:0%"></div></div>${x.activeType?'<div class="cooldownTrack"><div class="cooldownFill" style="width:0%"></div></div>':''}<div class="castTrack" style="display:none"><div class="castFill"></div><span class="castLabel">Casting</span></div><div class="combatStatusRow"></div></div><div class="arenaFloat"></div></div>`};
  $('combatTitle').textContent=`${result.attackerGuild} vs ${result.defenderGuild}`;
  $('combatSubtitle').textContent='Ranked Arena · live replay of the server-resolved fight';
  $('combatModal').dataset.mode='arena';
  $('combatBody').innerHTML=`<div class="combatFixedTop"><div class="combatGrid"><div class="combatTeamPane"><div class="muted" style="margin-bottom:5px">YOUR ARENA PARTY · ATTACKING</div><div class="combatSide compactCombatSide">${[...units.values()].filter(x=>x.side==='attack').map(card).join('')}</div></div><div class="combatTeamPane"><div class="muted" style="margin-bottom:5px">OPPONENT PARTY · DEFENDING</div><div class="combatSide compactCombatSide">${[...units.values()].filter(x=>x.side==='defense').map(card).join('')}</div></div></div></div><div class="log combatLog arenaLiveLog" id="arenaLiveLog"></div><div class="card combatReport" id="arenaFinalResult"><div class="muted">Battle in progress…</div></div>`;
  $('combatModal').classList.add('on');syncWindowScrollLock();
  const events=result.timeline||[],started=performance.now();let cursor=0;
  function frame(now){
    if(token!==arenaPlaybackToken||!$('combatModal').classList.contains('on'))return;
    const battleTime=now-started;
    while(cursor<events.length&&events[cursor].time<=battleTime)applyArenaEvent(events[cursor++],units);
    if(cursor<events.length)requestAnimationFrame(frame);else renderArenaFinalResult(result);
  }
  requestAnimationFrame(frame);
}
function applyArenaEvent(event,units){
  const source=units.get(event.sourceId),sourceEl=source?$(`arenaUnit-${source.id}`):null,target=units.get(event.targetId),el=target?$(`arenaUnit-${target.id}`):null;
  if(sourceEl){
    sourceEl.classList.remove('arenaAct');void sourceEl.offsetWidth;sourceEl.classList.add('arenaAct');setTimeout(()=>sourceEl.classList.remove('arenaAct'),240);
    const attack=sourceEl.querySelector('.attackFill');if(attack&&['attack','ability'].includes(event.type)){attack.style.transition='none';attack.style.width='0%';requestAnimationFrame(()=>{attack.style.transition=`width ${Math.max(250,source.attackInterval||2500)}ms linear`;attack.style.width='100%'})}
    const cast=sourceEl.querySelector('.castTrack');if(cast&&event.type==='cast'){cast.style.display='block';const fill=cast.querySelector('.castFill');if(fill){fill.style.transition='none';fill.style.width='0%';requestAnimationFrame(()=>{fill.style.transition='width 700ms linear';fill.style.width='100%'})}}else if(cast&&['ability','interrupt'].includes(event.type))cast.style.display='none';
  }
  if(target&&event.targetHp!=null){
    target.hp=event.targetHp;const pct=clamp(target.hp/target.maxHp*100,0,100);
    const fill=el?.querySelector('.hpFill');if(fill)fill.style.width=pct+'%';
    const text=el?.querySelector('.combatantHp');if(text)text.textContent=`${Math.max(0,target.hp)}/${target.maxHp}`;
    el?.classList.toggle('defeated',target.hp<=0);
    const float=el?.querySelector('.arenaFloat');if(float&&event.amount){float.textContent=(event.type==='heal'?'+':'−')+event.amount;float.className='arenaFloat pop '+(event.type==='heal'?'good':'dangerText');setTimeout(()=>float.classList.remove('pop'),350)}
    if(el&&event.type!=='heal'){el.classList.remove('arenaHit');void el.offsetWidth;el.classList.add('arenaHit');setTimeout(()=>el.classList.remove('arenaHit'),240)}
    const statuses=el?.querySelector('.combatStatusRow');if(statuses&&event.type==='status')statuses.innerHTML='<span class="combatStatus burning" title="Damage over time">◆</span>';
  }
  const log=$('arenaLiveLog');if(log&&event.text){const line=document.createElement('div');line.textContent=event.text;line.className='arenaEvent '+event.type;log.prepend(line);while(log.children.length>7)log.lastElementChild.remove()}
}
function renderArenaFinalResult(result){
  if($('arenaFinalResult')?.dataset.done)return;
  const box=$('arenaFinalResult');if(!box)return;box.dataset.done='true';
  const rows=(result.report||[]).map(x=>`<div class="arenaResultRow"><span>${arenaEscape(x.name)}</span><span>${x.damage||0} damage</span><span>${x.healing||0} healing</span><span>${x.interrupts||0} interrupts</span></div>`).join('');
  box.innerHTML=`<div class="arenaResultReveal ${result.won?'victory':'defeat'}"><h2>${result.won?'Arena Victory':'Arena Defeat'}</h2><div class="arenaRatingChange ${result.ratingChange>=0?'good':'dangerText'}">${result.ratingChange===0?'Rating unchanged':`Rating ${result.ratingChange>0?'+':''}${result.ratingChange}`} · ${result.newRating}</div><div class="arenaResultTable">${rows}</div></div>`;
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderArenaData(){renderArenaDefense();renderArenaOpponents();renderArenaLeaderboard();renderArenaHistory()}
function renderArenaDefense(){
  const box=$('arenaDefense');if(!box)return;const defense=arenaData.defense;
  box.innerHTML=defense?`<div class="arenaDefenseSummary"><div class="chips"><span class="chip">${defense.snapshot.members.length} members</span><span class="chip">${defense.party_power} power</span><span class="chip">Version ${defense.combat_version}</span></div>${defense.snapshot.members.map(h=>`<div class="arenaMember"><span>${arenaEscape(h.name)}</span><small>${arenaEscape(h.subclass||h.class)} · Lv. ${h.level} · ${h.power}</small></div>`).join('')}</div>`:'<div class="empty">No defense published yet.</div>';
}
function renderArenaOpponents(){
  const box=$('arenaOpponents');if(!box)return;
  box.innerHTML=arenaData.opponents?.length?arenaData.opponents.map(o=>`<div class="arenaOpponent"><div><div class="name">${arenaEscape(o.guild_name)}</div><div class="muted">Rating ${o.rating} · ${o.party_power} power · ${o.member_count} members</div></div><button class="btn gold" onclick="fightArenaOpponent('${o.party_id}')">Challenge</button></div>`).join(''):'<div class="empty">No eligible opponents have published a defense yet.</div>';
}
function renderArenaLeaderboard(){
  const box=$('arenaLeaderboard');if(!box)return;
  box.innerHTML=`<div class="arenaLeaderboardRow header"><span>Rank</span><span>Guild</span><span>Rating</span><span>Record</span></div>${(arenaData.leaderboard||[]).map((x,i)=>`<div class="arenaLeaderboardRow"><span>#${i+1}</span><span>${arenaEscape(x.guild_name)}</span><span>${x.rating}</span><span>${x.wins}–${x.losses}</span></div>`).join('')||'<div class="empty">No ranked players yet.</div>'}`;
}
function renderArenaHistory(){
  const box=$('arenaHistory');if(!box)return;
  box.innerHTML=arenaData.history?.length?arenaData.history.map(x=>`<div class="arenaHistoryRow"><span class="${x.won?'good':'dangerText'}">${x.won?'Victory':'Defeat'}</span><span>${arenaEscape(x.opponent_guild)}</span><span>${x.rating_change>=0?'+':''}${x.rating_change} rating</span><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join(''):'<div class="empty">No Arena matches yet.</div>';
}
