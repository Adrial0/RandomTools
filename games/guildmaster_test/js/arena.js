// Online asynchronous Arena client. All rating changes and match resolution are server-side.
let arenaClient=null;
let arenaSession=null;
let arenaConfig=null;
let arenaData={profile:null,defense:null,opponents:[],leaderboard:[],history:[]};
let arenaBusy=false;

function arenaEscape(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function arenaSetConnection(text,state=''){
  const el=$('arenaConnectionState');if(!el)return;el.textContent=text;el.className='chip '+state;
}
function arenaMessage(message,type='bad'){notify(message,type)}
function arenaAccountHtml(){
  if(!arenaConfig?.enabled)return `<div class="arenaSetupNotice"><div class="name">Online Arena is not configured</div><div class="muted">Create a Supabase project, copy <code>data/online.example.json</code> to <code>data/online.json</code>, and add the project URL and publishable key.</div></div>`;
  if(!arenaSession)return `<div class="arenaLogin"><div><div class="name">Sign in to Arena</div><div class="muted">Enter your email. Supabase will send a secure sign-in link.</div></div><input id="arenaEmail" type="email" autocomplete="email" placeholder="you@example.com"><button class="btn gold" onclick="arenaSendMagicLink()">Send Sign-in Link</button></div>`;
  return `<div class="arenaSignedIn"><div><div class="name">${arenaEscape(arenaSession.user.email||'Arena account')}</div><div class="muted">Rating ${arenaData.profile?.rating??1000} · ${arenaData.profile?.wins??0} wins / ${arenaData.profile?.losses??0} losses</div></div><button class="btn" onclick="arenaSignOut()">Sign Out</button></div>`;
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
  const {data}=await arenaClient.auth.getSession();arenaSession=data.session;
  arenaClient.auth.onAuthStateChange((_event,session)=>{arenaSession=session;renderArenaAccount();if(session)refreshArenaData()});
  arenaSetConnection(arenaSession?'Connected':'Sign-in required',arenaSession?'good':'');renderArenaAccount();
  if(arenaSession)await refreshArenaData();
}
async function arenaSendMagicLink(){
  if(!arenaClient||arenaBusy)return;
  const email=$('arenaEmail')?.value.trim();if(!email)return arenaMessage('Enter an email address.');
  arenaBusy=true;
  const {error}=await arenaClient.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
  arenaBusy=false;
  if(error)return arenaMessage(error.message);
  arenaMessage('Sign-in link sent. Check your email.','good');
}
async function arenaSignOut(){if(arenaClient){await arenaClient.auth.signOut();arenaSession=null;arenaData={profile:null,defense:null,opponents:[],leaderboard:[],history:[]};arenaSetConnection('Sign-in required');renderArenaAccount()}}
async function arenaInvoke(name,body={}){
  if(!arenaClient||!arenaSession)throw new Error('Sign in to Arena first.');
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
  const rows=(result.report||[]).map(x=>`<div class="arenaResultRow"><span>${arenaEscape(x.name)}</span><span>${x.damage||0} damage</span><span>${x.healing||0} healing</span><span>${x.interrupts||0} interrupts</span></div>`).join('');
  const replay=(result.replay||[]).map(line=>`<div>${arenaEscape(line)}</div>`).join('');
  showModal(result.won?'Arena Victory':'Arena Defeat',`<div class="card"><div class="arenaRatingChange ${result.ratingChange>=0?'good':'dangerText'}">Rating ${result.ratingChange>=0?'+':''}${result.ratingChange} · ${result.newRating}</div><div class="arenaResultTable">${rows}</div></div><div class="log arenaReplay">${replay}</div>`);
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
