// Online asynchronous Arena client. All rating changes and match resolution are server-side.
let arenaClient=null;
let arenaSession=null;
let arenaConfig=null;
let arenaData={profile:null,defense:null,opponents:[],leaderboard:[],history:[],challengeQuota:{remaining:5,resetsAt:null}};
let arenaBusy=false;

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
    maxHp:z.hp,maxMana:z.mana||0,manaRegen:z.manaRegen||0,str:z.str,dex:z.dex,int:z.int,def:z.def,mdef:z.mdef,block:z.block||0,threat:z.threat||1,
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
  if(arenaLiveMission&&!arenaLiveMission.completed){watchArenaBattle();return arenaMessage('Finish your current Arena battle first.')}
  const defense=arenaData.defense;if(!defense)return arenaMessage('Publish your Arena defense before challenging opponents.');
  arenaBusy=true;
  try{
    const requestId=crypto.randomUUID(),prepared=await arenaInvoke('arena-match',{opponentPartyId:partyId,requestId,prepare:true});
    startArenaClientBattle(partyId,requestId,prepared);
  }catch(err){arenaMessage(err.message)}finally{arenaBusy=false}
}
let arenaLiveMission=null;
function watchArenaBattle(){if(!arenaLiveMission)return;$('combatModal').dataset.mode='arena';$('combatModal').classList.add('on');combatDomKey='';syncWindowScrollLock();renderCombat()}
function arenaHeroUnit(h,index,enemy=false){
  const now=Date.now(),interval=Math.max(250,h.attackInterval||2500),main=h.class==='Mage'||h.class==='Priest'?h.int:h.class==='Ranger'||h.class==='Rogue'?h.dex:h.str;
  const unit={...h,id:index+1,hp:h.maxHp,mana:h.maxMana||20+(h.int||0),maxMana:h.maxMana||20+(h.int||0),manaRegen:h.manaRegen||1,statuses:{},buffs:{},cooldowns:{},displayClass:h.subclass||h.class,baseAttackTime:interval/1000,attackSpeed:0,attackStartedAt:now,nextAttackAt:now+interval};
  if(enemy)Object.assign(unit,{icon:h.subclass?gameIcon('subclass',h.subclass,iconFallback('class',h.class),'gameAsset combatAsset'):gameIcon('class',h.class,iconFallback('class',h.class),'gameAsset combatAsset'),atk:Math.max(1,Math.round((h.weaponPower||8)*.55+(main||1)*.45)),attackInterval:interval,mage:['Mage','Priest'].includes(h.class),ability:null,abilityReadyAt:0,drops:[],arenaHero:true});
  return unit;
}
function startArenaClientBattle(opponentPartyId,requestId,prepared){
  const now=Date.now(),heroes=prepared.attacker.members.map((h,i)=>arenaHeroUnit(h,i,false)),enemies=prepared.defender.members.map((h,i)=>arenaHeroUnit(h,i,true));
  const partyState={};heroes.forEach(h=>partyState[h.id]={hp:h.hp,maxHp:h.maxHp,mana:h.mana,maxMana:h.maxMana,cooldowns:{},nextAttackAt:h.nextAttackAt,attackStartedAt:h.attackStartedAt});
  arenaLiveMission={id:-1,type:'arena',name:`${prepared.attacker.guildName} vs ${prepared.defender.guildName}`,attackerGuild:prepared.attacker.guildName,defenderGuild:prepared.defender.guildName,opponentPartyId,requestId,party:heroes.map(h=>h.id),partyState,level:1,target:1,completed:false,defeated:false,fights:0,kills:0,start:now,lastSim:now,nextRegenAt:now+5000,stash:{gold:0,rep:0,materials:{},items:[]},combatReport:{startedAt:now,encounters:0,offlineEncounters:0,heroes:{},deaths:[]},battle:{id:1,resolved:false,actionSeq:0,kind:'arena',heroes,enemies,phase:'heroes',turn:0,round:1,log:['The Arena battle begins.']}};
  heroes.forEach(h=>arenaLiveMission.combatReport.heroes[String(h.id)]={id:h.id,name:h.name,damage:0,statusDamage:0,healing:0,damageTaken:0,interrupts:0,cleanses:0,statusesApplied:0,criticalHits:0,abilityUses:0,deaths:0});
  $('combatModal').dataset.mode='arena';$('combatModal').dataset.mission='';$('combatModal').classList.add('on');combatDomKey='';syncWindowScrollLock();renderCombat();
}
async function finishArenaClientBattle(m,won){
  if(!m||m.completed)return;m.completed=true;m.defeated=!won;
  const report=Object.values(ensureCombatReport(m).heroes),replay=(m.battle?.log||[]).slice(0,80);
  ensureCombatReport(m).encounters=1;m.battle.log.unshift(won?'Your party wins the Arena battle.':'Your party was defeated in the Arena.');renderCombat();
  try{
    const result=await arenaInvoke('arena-match',{opponentPartyId:m.opponentPartyId,requestId:m.requestId,won,report,replay});
    m.arenaResult=result;arenaMessage(`${won?'Victory':'Defeat'} · Rating ${result.ratingChange>=0?'+':''}${result.ratingChange}` ,won?'good':'bad');await refreshArenaData(true);renderCombat();
  }catch(err){arenaMessage(err.message)}
}
function renderArenaData(){renderArenaDefense();renderArenaOpponents();renderArenaLeaderboard();renderArenaHistory()}
function renderArenaDefense(){
  const box=$('arenaDefense');if(!box)return;const defense=arenaData.defense;
  box.innerHTML=defense?`<div class="arenaDefenseSummary"><div class="chips"><span class="chip">${defense.snapshot.members.length} members</span><span class="chip">${defense.party_power} power</span><span class="chip">Version ${defense.combat_version}</span></div>${defense.snapshot.members.map(h=>`<div class="arenaMember"><span>${arenaEscape(h.name)}</span><small>${arenaEscape(h.subclass||h.class)} · Lv. ${h.level} · ${h.power}</small></div>`).join('')}</div>`:'<div class="empty">No defense published yet.</div>';
}
function renderArenaOpponents(){
  const box=$('arenaOpponents');if(!box)return;
  const quota=arenaData.challengeQuota||{remaining:5,resetsAt:null},reset=quota.resetsAt?` · Next attempt ${new Date(quota.resetsAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'';
  box.innerHTML=`<div class="muted arenaQuota">${quota.remaining} / 5 challenges available${reset}</div>`+(arenaData.opponents?.length?arenaData.opponents.map(o=>`<div class="arenaOpponent"><div><div class="name">${arenaEscape(o.guild_name)}</div><div class="muted">Rating ${o.rating} · ${o.party_power} power · ${o.member_count} members</div></div><button class="btn gold" ${quota.remaining<=0?'disabled':''} onclick="fightArenaOpponent('${o.party_id}')">Challenge</button></div>`).join(''):'<div class="empty">No eligible opponents have published a defense yet.</div>');
}
function renderArenaLeaderboard(){
  const box=$('arenaLeaderboard');if(!box)return;
  box.innerHTML=`<div class="arenaLeaderboardRow header"><span>Rank</span><span>Guild</span><span>Rating</span><span>Record</span></div>${(arenaData.leaderboard||[]).map((x,i)=>`<div class="arenaLeaderboardRow"><span>#${i+1}</span><span>${arenaEscape(x.guild_name)}</span><span>${x.rating}</span><span>${x.wins}–${x.losses}</span></div>`).join('')||'<div class="empty">No ranked players yet.</div>'}`;
}
function renderArenaHistory(){
  const box=$('arenaHistory');if(!box)return;
  box.innerHTML=arenaData.history?.length?arenaData.history.map(x=>`<div class="arenaHistoryRow"><span class="${x.won?'good':'dangerText'}">${x.won?'Victory':'Defeat'}</span><span>${arenaEscape(x.opponent_guild)}</span><span>${x.rating_change>=0?'+':''}${x.rating_change} rating</span><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join(''):'<div class="empty">No Arena matches yet.</div>';
}


