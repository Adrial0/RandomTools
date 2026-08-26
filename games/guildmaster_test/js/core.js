// Shared definitions, assets, persistence, character generation, items, and mission setup.
const $=x=>document.getElementById(x);
const C={
Warrior:{hp:132,str:17,dex:9,int:5,def:15,mdef:7,block:1,manaRegen:1,armor:'Heavy',threat:1.6,icon:'W',slots:['Weapon','Armor','Jewelry'],weapons:['Longsword','Greatsword','Battle Axe','Greataxe','Warhammer','Mace','Spear','Halberd',]},
Ranger:{hp:96,str:8,dex:18,int:7,def:9,mdef:8,block:0,manaRegen:1,armor:'Medium',threat:1,icon:'R',slots:['Weapon','Armor','Jewelry'],weapons:['Shortbow','Longbow','Recurve Bow','Light Crossbow','Heavy Crossbow','Hunting Bow','Spear']},
Mage:{hp:74,str:4,dex:8,int:21,def:5,mdef:15,block:0,manaRegen:2,armor:'Light',threat:1,icon:'M',slots:['Weapon','Armor','Jewelry'],weapons:['Oak Staff','Arcane Staff','Wand','Crystal Wand','Orb','Spellbook','Scepter']},
Priest:{hp:104,str:9,dex:6,int:17,def:11,mdef:15,block:0,manaRegen:2,armor:'Light',threat:1,icon:'P',slots:['Weapon','Armor','Jewelry'],weapons:['Oak Staff','Holy Staff','Scepter','Wand']},
Rogue:{hp:84,str:7,dex:20,int:6,def:7,mdef:8,block:0,manaRegen:1,armor:'Light',threat:1,icon:'G',slots:['Weapon','Armor','Jewelry'],weapons:['Dagger','Knife','Dirk','Kris','Shortsword','Twin Blades']},
Paladin:{hp:122,str:15,dex:7,int:11,def:18,mdef:13,block:2,manaRegen:1,armor:'Heavy',threat:2,icon:'P',slots:['Weapon','Armor','Jewelry'],weapons:['Longsword','Greatsword','Mace','Warhammer','Spear',]}
};

const ASSET_CONFIG={base:'',version:'',guildhallBackground:''};
const ICONS={};
const ICON_FALLBACKS={};

function clearVisualRegistry(){
  Object.keys(ICONS).forEach(k=>delete ICONS[k]);
  Object.keys(ICON_FALLBACKS).forEach(k=>delete ICON_FALLBACKS[k]);
}
function registerVisual(group,key,obj={}){
  if(!group||!key)return;
  if(!ICONS[group])ICONS[group]={};
  if(!ICON_FALLBACKS[group])ICON_FALLBACKS[group]={};
  ICONS[group][key]=obj.image||'';
  ICON_FALLBACKS[group][key]=obj.fallback??obj.icon??'';
}

function assetUrl(path){
  if(!path)return '';
  const base=ASSET_CONFIG.base||'';
  const clean=base&&path.startsWith(base)?path.slice(base.length):path;
  const version=ASSET_CONFIG.version?`?v=${encodeURIComponent(ASSET_CONFIG.version)}`:'';
  return base+clean+version;
}

function setupGuildhallBackground(){
  const raw=ASSET_CONFIG.guildhallBackground||'';
  if(!raw){
    document.documentElement.style.removeProperty('--guildhall-bg');
    return;
  }
  const url=assetUrl(raw);
  document.documentElement.style.setProperty('--guildhall-bg',`url("${url}")`);
  const probe=new Image();
  probe.onerror=()=>console.warn('Guildmaster background missing:',url);
  probe.src=url;
}

function iconPath(group,key){return ICONS[group]?.[key]||''}
function iconFallback(group,key,fallback=''){return ICON_FALLBACKS[group]?.[key]||fallback}
function gameIcon(group,key,fallback='',cls='gameAsset'){
  const raw=iconPath(group,key),fb=iconFallback(group,key,fallback);
  if(!raw)return `<span class="iconFallback ${cls}">${fb}</span>`;
  const src=assetUrl(raw);
  return `<span class="iconFallback ${cls}"><img class="${cls}" src="${src}" alt="" data-icon-group="${group}" data-icon-key="${key}" onerror="console.warn('Guildmaster icon missing:',this.src);this.style.display='none';this.nextElementSibling.style.display='inline'"><span style="display:none">${fb}</span></span>`;
}
function classIcon(h,cls='gameAsset'){return h?.subclass?gameIcon('subclass',h.subclass,iconFallback('class',h.class),cls):gameIcon('class',h.class,iconFallback('class',h.class),cls)}
function displayClass(h){return subclassDef(h)?.name||h.class}

const classIcons={};
const SUBCLASSES={};
function subclassDef(h){return h?.subclass?(SUBCLASSES[h.class]||[]).find(x=>x.id===h.subclass)||null:null}

const WEAPONS={};


const WEAPON_ATTACK_TIMES={};
const CLASS_ATTACK_SPEED={};
function weaponAttackTime(name){
  return WEAPON_ATTACK_TIMES[name]||WEAPON_ATTACK_TIMES[weaponTypeFor(name)]||2.20;
}
function effectiveAttackSpeedBonus(unit,now=Date.now()){
  let bonus=Number(unit.attackSpeed||0);
  if(unit.buffs?.battleShout>now)bonus+=.20;
  return bonus;
}
function heroAttackIntervalMs(unit,now=Date.now()){
  const base=Math.max(.75,Number(unit.baseAttackTime||2.2))*1000;
  return Math.max(650,base/Math.max(.25,1+effectiveAttackSpeedBonus(unit,now)));
}
function enemyAttackIntervalMs(unit){
  return Math.max(900,Number(unit.attackInterval||2600));
}
function attackIntervalMs(unit,enemy=false,now=Date.now()){
  return enemy?enemyAttackIntervalMs(unit):heroAttackIntervalMs(unit,now);
}
function attackTimerProgress(unit,enemy=false,now=Date.now()){
  if(!unit)return 0;
  const start=Number(unit.attackStartedAt||now);
  const end=Number(unit.nextAttackAt||now);
  if(end<=now)return 1;
  return clamp((now-start)/Math.max(1,end-start),0,1);
}
function scheduleNextAttack(unit,enemy=false,now=Date.now()){
  unit.attackStartedAt=now;
  unit.nextAttackAt=now+attackIntervalMs(unit,enemy,now);
}

const WEAPON_TYPE_MAP={};
function weaponTypeFor(name){return WEAPON_TYPE_MAP[name]||name}
function weaponDefForItem(it){return WEAPONS[it?.weaponTemplate||it?.name]||WEAPONS[it?.weaponType]||null}


const WEAPON_SPECIAL_LABELS={
  armorPen:'Armor Penetration',parry:'Parry',critChance:'Critical Chance',critDamage:'Critical Damage',
  accuracy:'Accuracy',elementalDamage:'Elemental Damage',healingPower:'Healing Power',
  statusChance:'Status Chance',cleave:'Cleave',counter:'Counter',damageVariance:'Damage Variance'
};
function weaponSpecials(w){
  if(!w)return[];
  const out=[];
  ['armorPen','parry','critChance','critDamage','accuracy','elementalDamage','healingPower','statusChance','cleave','counter','damageVariance'].forEach(k=>{
    if(w[k])out.push([k,w[k]]);
  });
  return out;
}
function weaponSpecialText(w){
  return weaponSpecials(w).map(([k,v])=>`+${Math.round(v*100)}% ${WEAPON_SPECIAL_LABELS[k]}`).join(' · ');
}
function weaponScalingLabel(w){
  if(!w)return '';
  return w.scale2?`50% ${String(w.scale).toUpperCase()} / 50% ${String(w.scale2).toUpperCase()}`:`${String(w.scale).toUpperCase()}`;
}
function scalingStatValue(unit){
  const get=k=>k==='dex'?(unit.dex||0):k==='int'?(unit.int||0):(unit.str||0);
  if(unit.scale2)return (get(unit.scale)+get(unit.scale2))*.5;
  return get(unit.scale);
}
const ARMOR_WEIGHT_ORDER={Light:1,Medium:2,Heavy:3};
const ARMOR_PROFILES={};
function armorProfile(name){
  if(!name)return ARMOR_PROFILES.Mail;
  if(ARMOR_PROFILES[name])return ARMOR_PROFILES[name];
  const keys=Object.keys(ARMOR_PROFILES).sort((a,b)=>b.length-a.length);
  const key=keys.find(k=>String(name).includes(k));
  return ARMOR_PROFILES[key]||ARMOR_PROFILES.Mail;
}
function armorClassForItem(it){
  if(!it||it.slot!=='Armor')return null;
  return it.armorClass||armorProfile(it.name).armorClass;
}
function itemBlockValue(it){
  if(!it)return 0;
  if(Number.isFinite(it.block))return Math.max(0,it.block);
  return it.slot==='Armor'?(armorProfile(it.name).block||0):0;
}
function maxArmorClass(h){
  const sub=subclassDef(h);
  return sub?.armorOverride||C[h.class]?.armor||'Light';
}
function canEquipArmor(h,it){
  if(!h||!it||it.slot!=='Armor')return true;
  return (ARMOR_WEIGHT_ORDER[armorClassForItem(it)]||1)<=(ARMOR_WEIGHT_ORDER[maxArmorClass(h)]||1);
}
function armorNamesForTier(tier){
  const names=Object.entries(ARMOR_PROFILES).filter(([,p])=>(p.tier||1)<=Math.max(1,tier)).map(([n])=>n);
  return names.length?names:['Mail','Leathers','Robes'];
}
function applyRecipeModifiers(it,meta={}){
  if(meta.damageType)it.damageType=meta.damageType;
  if(!it||!meta)return it;
  if(meta.armorClass)it.armorClass=meta.armorClass;
  if(meta.block)it.block=(it.block||0)+meta.block;
  if(meta.stats)it.extraStats=Object.assign({},it.extraStats||{},meta.stats);
  if(meta.damageBonus)it.damageBonus=(it.damageBonus||0)+meta.damageBonus;
  if(meta.healBonus)it.healBonus=(it.healBonus||0)+meta.healBonus;
  if(meta.critBonus)it.itemCritBonus=(it.itemCritBonus||0)+meta.critBonus;
  if(meta.threatBonus)it.itemThreatBonus=(it.itemThreatBonus||0)+meta.threatBonus;
  if(meta.physicalDodgeBonus)it.itemPhysicalDodgeBonus=(it.itemPhysicalDodgeBonus||0)+meta.physicalDodgeBonus;
  if(meta.magicalDodgeBonus)it.itemMagicalDodgeBonus=(it.itemMagicalDodgeBonus||0)+meta.magicalDodgeBonus;
  const statsPower=Object.entries(meta.stats||{}).reduce((p,[k,v])=>p+(k==='hp'?v*1.5:v*4),0);
  it.power=(it.power||0)+statsPower+(meta.block||0)*10+(meta.damageBonus||0)*100+(meta.healBonus||0)*80+(meta.critBonus||0)*100+(meta.threatBonus||0)*18+(meta.physicalDodgeBonus||0)*100+(meta.magicalDodgeBonus||0)*100;
  return it;
}

const ELEMENT_KEYS=['fire','ice','poison','lightning','holy','dark'];
const RESOURCE_NAMES={};
const RESOURCE_TIERS={};
const ROMAN_TIERS=['0','I','II','III','IV','V','VI','VII','VIII','IX','X'];
function tierLabel(tier){const n=Math.max(1,Math.floor(Number(tier)||1));return ROMAN_TIERS[n]||String(n)}
function resourceTier(id){return RESOURCE_TIERS[id]||1}
function itemTier(it){const recipe=typeof recipeForItem==='function'?recipeForItem(it):null;return Math.max(1,Number(it?.tier)||Number(recipe?.[4])||1)}
const RUNE_SLOTS={};
const RUNES={};
function runeSlots(it){return RUNE_SLOTS[it?.rarity]||0}
function runeIcon(id,cls='gameAsset'){const r=RUNES[id];return gameIcon('rune',id,r?.icon||'◇',cls)}
function runeTier(id){const r=RUNES[id];if(!r)return 1;return Math.max(1,Number(r.tier)||Math.max(1,...Object.keys(r.cost||{}).map(resourceTier)))}

const BOSS_INFO={dungeon:{},raid:{}};

const elementIcon={};

const itemIcons={};
const questIcons={};
const ENEMY_ARCHETYPES_DATA={};
const ENEMY_ABILITIES_DATA={};
const ENEMIES_DATA={};
const enemyPools={quest:[],dungeon:[],raid:[]};
const STATUS_TACTIC_LABELS={bleed:'Bleeding',burning:'Burning',poison:'Poison',frostbite:'Frostbite',shocked:'Shock',cursed:'Curse'};
function enemyTacticalProfile(name){
  const enemy=ENEMIES_DATA[name]||{},archetype=ENEMY_ARCHETYPES_DATA[enemy.archetype]||{};
  const ability=enemy.ability?ENEMY_ABILITIES_DATA[enemy.ability]:null;
  const mechanics=[];
  if(ability?.castTime)mechanics.push('Casting');
  if(ability?.type==='heal')mechanics.push('Healing');
  if(ability?.type==='aoe')mechanics.push('Area damage');
  if(ability?.status)mechanics.push(STATUS_TACTIC_LABELS[ability.status]||ability.status);
  if(archetype.enrageThreshold)mechanics.push('Enrage');
  if(archetype.protectorAura)mechanics.push('Protects allies');
  if(archetype.basicStatus)mechanics.push(STATUS_TACTIC_LABELS[archetype.basicStatus]||archetype.basicStatus);
  if(archetype.executeThreshold)mechanics.push('Execute');
  const counters=[];
  if(ability?.castTime)counters.push('Interrupt');
  if(ability?.status)counters.push('Cleanse');
  if(archetype.basicStatus)counters.push('Cleanse');
  if(archetype.protectorAura)counters.push('Focus protector');
  if(archetype.enrageThreshold)counters.push('Burst finish');
  const damageTypes=[...new Set([enemy.damageType||'physical',ability?.damageType].filter(Boolean))];
  if(damageTypes.includes('physical'))counters.push('DEF');
  if(damageTypes.some(x=>x!=='physical'))counters.push('MDEF');
  return{
    name,
    role:archetype.tacticalRole||'Enemy',
    description:archetype.roleDescription||'A hostile combatant.',
    counter:archetype.counter||'',
    damageTypes,
    ability:ability?.name||null,
    mechanics:[...new Set(mechanics)],
    counters:[...new Set(counters)],
    drops:enemy.drops||[]
  };
}


const RACES={};
const RACE_NAMES=Object.keys(RACES);
function raceDef(h){return RACES[h?.race]||RACES.Human}
function raceGatheringXpMult(h,key){
  const g=raceDef(h).gathering||{};
  return 1+(g[key]||0)+(g.all||0);
}

const FN=["Adrian","Alden","Alric","Amelia","Ansel","Arlen","Arthur","Astrid","Aveline","Beatrice","Benjamin","Bran","Bryn","Cael","Cassian","Cedric","Clara","Corin","Dara","Edric","Edwin","Eira","Elena","Elias","Elowen","Elric","Emmett","Emric","Evelyn","Fen","Freya","Garrick","Gideon","Helena","Iris","Isolde","John","Jonas","Joren","Kael","Leo","Leona","Liora","Lucan","Lucien","Lysa","Maeve","Maren","Matilda","Merrick","Mira","Nell","Nerys","Nora","Oren","Orin","Petra","Quinn","Rhea","Roland","Ronan","Rowan","Selene","Soren","Sylvi","Tarin","Thea","Theo","Theron","Tobias","Tristan","Valen","Vera","Veya","Willa","Wren","Ysabel"]
,LN=["Ashfall","Ashford","Blackthorn","Blackwood","Briar","Brighton","Coldwater","Crowe","Dawn","Dunley","Duskwood","Ember","Fairwind","Frost","Foxglove","Goldmere","Graves","Greenfield","Grey","Hale","Harth","Hawke","Hearth","Highland","Holloway","Ironwood","Marrow","Moonfall","North","Oakheart","Ravencrest","Redfern","Rivers","Rook","Silver","Silverhand","Stone","Stonebridge","Storm","Stormborn","Thorne","Thornfield","Underhill","Vale","Ward","West","Whitebrook","Whitlock","Wildwood","Willow","Winter","Wolfe","Woodward"];

const traits=[
{name:'Brave',desc:'+6% damage, but -5% MDEF.',hp:0,str:2,dex:0,int:0,def:0,mdef:0,damageMult:1.06,mdefMult:.95},
{name:'Stalwart',desc:'+10% DEF, but -4% damage.',hp:10,str:0,dex:0,int:0,def:2,mdef:1,defMult:1.10,damageMult:.96},
{name:'Quick',desc:'+6% physical dodge, but -6% max HP.',hp:0,str:0,dex:2,int:0,def:0,mdef:0,physicalDodgeBonus:.06,hpMult:.94},
{name:'Tough',desc:'+12% max HP, but -4% magical dodge.',hp:14,str:1,dex:0,int:0,def:1,mdef:1,hpMult:1.12,magicalDodgePenalty:.04},
{name:'Clever',desc:'+8% MDEF and +4% healing, but -6% max HP.',hp:0,str:0,dex:0,int:3,def:0,mdef:1,mdefMult:1.08,healMult:1.04,hpMult:.94},
{name:'Balanced',desc:'Small bonuses to all core stats with no drawback.',hp:6,str:1,dex:1,int:1,def:1,mdef:1},
{name:'Reckless',desc:'+12% damage, but -10% DEF and MDEF.',hp:0,str:2,dex:1,int:1,def:0,mdef:0,damageMult:1.12,defMult:.90,mdefMult:.90},
{name:'Cautious',desc:'+5% physical and magical dodge, but -6% damage.',hp:0,str:0,dex:1,int:1,def:1,mdef:1,physicalDodgeBonus:.05,magicalDodgeBonus:.05,damageMult:.94},
{name:'Hotheaded',desc:'+8% critical chance, but -8% MDEF.',hp:0,str:2,dex:0,int:0,def:0,mdef:0,critBonus:.08,mdefMult:.92},
{name:'Iron-Skinned',desc:'+12% DEF, but -5% physical dodge.',hp:4,str:0,dex:0,int:0,def:3,mdef:0,defMult:1.12,physicalDodgePenalty:.05},
{name:'Arcane-Touched',desc:'+10% magical damage/healing, but -8% DEF.',hp:0,str:0,dex:0,int:2,def:0,mdef:1,damageMult:1.10,healMult:1.10,defMult:.92},
{name:'Skittish',desc:'+9% physical dodge, but -0.35 Threat and -5% damage.',hp:0,str:0,dex:2,int:0,def:0,mdef:0,physicalDodgeBonus:.09,threatBonus:-.35,damageMult:.95},
{name:'Provocative',desc:'+0.7 Threat and +6% DEF, but -5% dodge.',hp:5,str:1,dex:0,int:0,def:1,mdef:0,threatBonus:.7,defMult:1.06,physicalDodgePenalty:.05},
{name:'Fireblooded',desc:'+18 Fire resistance and +5% damage, but -10 Ice resistance.',hp:0,str:1,dex:0,int:1,def:0,mdef:0,fire:18,ice:-10,damageMult:1.05},
{name:'Frostbitten',desc:'+18 Ice resistance and +6% MDEF, but -10 Fire resistance.',hp:0,str:0,dex:0,int:1,def:0,mdef:1,ice:18,fire:-10,mdefMult:1.06},
{name:'Venom-Hardened',desc:'+22 Poison resistance, but -5% max HP.',hp:0,str:0,dex:1,int:0,def:0,mdef:0,poison:22,hpMult:.95},
{name:'Storm-Nervous',desc:'+20 Lightning resistance and +4% magical dodge, but -4% physical dodge.',hp:0,str:0,dex:0,int:1,def:0,mdef:0,lightning:20,magicalDodgeBonus:.04,physicalDodgePenalty:.04},
{name:'Bloodthirsty',desc:'+3% lifesteal and +5% damage, but -7% DEF.',hp:0,str:2,dex:0,int:0,def:0,mdef:0,lifesteal:3,damageMult:1.05,defMult:.93},
{name:'Gentle',desc:'+12% healing, but -8% damage.',hp:0,str:0,dex:0,int:2,def:0,mdef:1,healMult:1.12,damageMult:.92},
{name:'Heavy Sleeper',desc:'+10% max HP, but -6% physical and magical dodge.',hp:8,str:0,dex:0,int:0,def:1,mdef:1,hpMult:1.10,physicalDodgePenalty:.06,magicalDodgePenalty:.06}
];
function traitDef(h){return traits.find(t=>t.name===h?.trait)||traits.find(t=>t.name==='Balanced')}




const AREAS=[];


function activityBackground(type,key){
  let obj=null;
  if(type==='expedition')obj=AREAS.find(a=>a.id===key||a.name===key);
  else if(type==='dungeon')obj=DUNGEON_AREAS.find(a=>a.name===key);
  else if(type==='raid')obj=RAID_AREAS.find(a=>a.name===key);
  else if(type==='harvest')obj=HARVEST_AREAS.find(a=>a.id===key||a.name===key);
  return obj?.background?assetUrl(obj.background):'';
}
function sceneBanner(type,key){
  const url=activityBackground(type,key);
  return `<div class="questScene"${url?` style="background-image:linear-gradient(rgba(13,10,7,.08),rgba(13,10,7,.28)),url('${url}')"`:''}></div>`;
}

const HARVEST_AREAS=[];const DUNGEON_AREAS=[];
const RAID_AREAS=[];

const rar=['Common','Uncommon','Rare','Epic','Legendary','Mythic'],rm={Common:1,Uncommon:1.06,Rare:1.14,Epic:1.26,Legendary:1.42,Mythic:1.65};
const recipes=[];
const upgrades=[
['quarters','Guild Quarters','Adds one permanent guild member slot per level. Starts at 4 slots.',350,26],
['party','Expedition Logistics','Adds one expedition party slot per level.',500,6],
['recruit','Recruitment Hall','Adds one applicant to each recruitment batch.',260,4],
['smith','Blacksmith','Forge facilities. +10% Smithing XP gained per level.',320,5],
['craftSpeed','Workshop Tools','Reduces crafting time by 12% per level.',280,6],
['training','Training Hall','More adventurer XP.',300,5],
['storage','Resource Storehouse','Greatly increases total resource inventory capacity. Reaches 20,000 by level 6.',290,10],
['afkHarvest','Harvest Stockpiles','Increases how much each gathering job can harvest while you are away.',300,10],
['gatherParty','Gathering Logistics','Adds one worker to the gathering party limit.',360,6],
['board','Quest Office','Slightly improves gold and reputation gains.',310,5]
];
let s;
const pick=a=>a[Math.floor(Math.random()*a.length)],rnd=(a,b)=>Math.floor(a+Math.random()*(b-a+1)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function notify(msg,type='bad'){
  const stack=$('noticeStack');
  if(!stack)return;
  const n=document.createElement('div');
  n.className='notice '+type;
  n.innerHTML=`<b>${type==='good'?'Done':'Guildmaster'}</b><span>${msg}</span>`;
  stack.appendChild(n);
  setTimeout(()=>n.remove(),3200);
}
function fresh(){return{guild:'',guildNamed:false,gold:110,rep:0,level:1,wins:0,next:1,battleSeq:1,lastHiddenAt:0,musicEnabled:true,musicVolume:.10,smithing:{level:1,xp:0},inventoryAuto:{mode:'off',rarity:'Common'},onboarding:{collapsed:false,flags:{},claimed:[]},members:[],recruits:[],inventory:[],memberCap:4,applicantCap:2,nextApplicantsAt:0,knownRecipes:[],discoveredResources:[],materials:{},missions:[],harvestJobs:[],craftJobs:[],quests:[],dungeons:[],raids:[],partyPresets:[],market:{nextRefresh:0,offers:[]},questBoard:{nextRefresh:0,offers:[]},runes:{},up:{quarters:0,party:0,recruit:0,smith:0,craftSpeed:0,training:0,storage:0,afkHarvest:0,gatherParty:0,board:0},log:['Guild charter signed.'],selected:null}}
let lastSave=0;
function save(){
  try{
    const data=JSON.stringify(s);
    const current=localStorage.getItem('guildmaster-v1');
    if(current&&current!==data)localStorage.setItem('guildmaster-v1-backup',current);
    localStorage.setItem('guildmaster-v1',data);
    lastSave=Date.now();
    const el=$('saveState');
    if(el)el.textContent='Saved automatically · '+new Date(lastSave).toLocaleTimeString();
  }catch(e){
    const el=$('saveState');
    if(el)el.textContent='Save failed in this browser.';
  }
}
function load(){
  try{
    const raw=localStorage.getItem('guildmaster-v1');
    s=raw?JSON.parse(raw):fresh();
  }catch(e){
    try{
      const backup=localStorage.getItem('guildmaster-v1-backup');
      s=backup?JSON.parse(backup):fresh();
    }catch(e2){s=fresh()}
  }
    if(s.musicEnabled===undefined)s.musicEnabled=true;if(s.musicVolume===undefined)s.musicVolume=.10;
  s.smithing=Object.assign({level:1,xp:0},s.smithing||{});
  s.inventoryAuto=Object.assign({mode:'off',rarity:'Common'},s.inventoryAuto||{});
  [...(s.members||[]),...(s.recruits||[])].forEach(h=>{if(h.class==='Cl'+'eric')h.class='Priest'});
  (s.inventory||[]).forEach(it=>{
    if(it.slot==='Weapon'){
      const template=WEAPONS[it.name]?it.name:(WEAPONS[it.weaponTemplate]?it.weaponTemplate:it.weaponType);
      if(WEAPONS[template]){it.weaponTemplate=template;it.weaponType=weaponTypeFor(template)}
    }
    if(it.slot==='Weapon'&&weaponDefForItem(it)){
      const w=weaponDefForItem(it);
      if(it.scale2==null)it.scale2=w.scale2||null;
      if(it.armorPen==null)it.armorPen=w.armorPen||0;
      if(it.parry==null)it.parry=w.parry||0;
      if(it.weaponCritChance==null)it.weaponCritChance=w.critChance||0;
      if(it.critDamage==null)it.critDamage=w.critDamage||0;
      if(it.accuracy==null)it.accuracy=w.accuracy||0;
      if(it.elementalDamage==null)it.elementalDamage=w.elementalDamage||0;
      if(it.healingPower==null)it.healingPower=w.healingPower||0;
      if(it.statusChance==null)it.statusChance=w.statusChance||0;
      if(it.cleave==null)it.cleave=w.cleave||0;
      if(it.counter==null)it.counter=w.counter||0;
      if(it.damageVariance==null)it.damageVariance=w.damageVariance||0;
    }
    if(it.slot==='Armor'){
      if(!it.armorClass)it.armorClass=armorProfile(it.name).armorClass;
      if(it.block==null)it.block=armorProfile(it.name).block||0;
    }
    if(!it.extraStats)it.extraStats={};
  });
s.materials=Object.assign(Object.fromEntries(Object.keys(RESOURCE_NAMES).map(k=>[k,0])),s.materials||{});
  Object.keys(RESOURCE_NAMES).forEach(k=>{if(s.materials[k]==null)s.materials[k]=0});
  s.up=Object.assign({quarters:0,party:0,recruit:0,smith:0,craftSpeed:0,training:0,storage:0,afkHarvest:0,gatherParty:0,board:0},s.up||{});
  const defaultSkills=()=>({woodcutting:{level:1,xp:0},mining:{level:1,xp:0},fishing:{level:1,xp:0},herbalism:{level:1,xp:0},hunting:{level:1,xp:0}});
  [...(s.members||[]),...(s.recruits||[])].forEach(h=>{h.skills=Object.assign(defaultSkills(),h.skills||{});Object.keys(h.skills).forEach(k=>h.skills[k]=Object.assign({level:1,xp:0},h.skills[k]||{}));if(h.subclass===undefined)h.subclass=null;if(!h.race||!RACES[h.race])h.race=pick(RACE_NAMES)});
  s.runes=s.runes&&typeof s.runes==='object'?s.runes:{};Object.keys(RUNES).forEach(k=>{if(s.runes[k]==null)s.runes[k]=0});s.partyPresets=Array.isArray(s.partyPresets)?s.partyPresets:[];s.market=s.market&&typeof s.market==='object'?s.market:{nextRefresh:0,offers:[]};s.market.offers=Array.isArray(s.market.offers)?s.market.offers:[];s.questBoard=s.questBoard&&typeof s.questBoard==='object'?s.questBoard:{nextRefresh:0,offers:[]};s.questBoard.offers=Array.isArray(s.questBoard.offers)?s.questBoard.offers:[];s.harvestJobs=Array.isArray(s.harvestJobs)?s.harvestJobs:[];s.craftJobs=Array.isArray(s.craftJobs)?s.craftJobs:[];normalizeCraftQueue();s.battleSeq=s.battleSeq||1;s.lastHiddenAt=s.lastHiddenAt||0;s.knownRecipes=Array.isArray(s.knownRecipes)?s.knownRecipes:[];s.memberCap=Math.max((s.members||[]).length,4+(s.up.quarters||0));s.discoveredResources=Array.isArray(s.discoveredResources)?s.discoveredResources:[];s.applicantCap=Math.max(2,s.applicantCap||2+(s.up.recruit||0));s.nextApplicantsAt=s.nextApplicantsAt||0;
  s.memberCap=Math.max((s.members||[]).length,4+(s.up.quarters||0));
  s.members=(s.members||[]).map(h=>{
    if(Array.isArray(h.bonus)){
      h.bonus={hp:h.bonus[0]||0,str:h.bonus[1]||0,dex:Math.floor((h.bonus[3]||0)*.8),int:h.bonus[1]||0,def:h.bonus[2]||0,mdef:Math.floor((h.bonus[2]||0)*.8),fire:t.fire||0,ice:t.ice||0,poison:t.poison||0,lightning:t.lightning||0,holy:t.holy||0,dark:t.dark||0};
    }
    h.bonus=Object.assign({hp:0,str:0,dex:0,int:0,def:0,mdef:0,fire:0,ice:0,poison:0,lightning:0,holy:0,dark:0},h.bonus||{});
    h.equip=h.equip||{};
    if(h.equip.Jewelry==null){
      h.equip.Jewelry=h.equip.Ring||h.equip.Amulet||null;
    }
    delete h.equip.Ring;delete h.equip.Amulet;
    return h;
  });
  s.inventory=(s.inventory||[]).map(it=>{
    it.runes=Array.isArray(it.runes)?it.runes:[];
    it.tier=itemTier(it);
    if(it.slot==='Weapon'&&!it.weaponType){
      const allowed=Object.keys(WEAPONS);
      const guess=allowed.find(w=>it.name&&it.name.includes(w))||pick(allowed);
      const wd=WEAPONS[guess];
      it.weaponType=guess;it.scale=wd.scale;it.damageType=wd.type;it.weaponPower=it.weaponPower||Math.max(8,Math.round((it.power||20)/4));
    }
    return it;
  });

  s.missions=Array.isArray(s.missions)?s.missions:[];s.missions.forEach(m=>{
  m.battleNumber=Math.max(m.battleNumber||0,m.battle?.id||0);
  if((m.type==='dungeon'||m.type==='raid')&&m.finiteStage==null){
    const old=m.normalEncountersCompleted!=null?m.normalEncountersCompleted:(m.fights||0);
    m.finiteStage=Math.max(0,Math.min(old,m.maxFights||old));
  }
  if(m.finiteStage!=null)m.normalEncountersCompleted=m.finiteStage;
  if(m.lastRewardedBattleId===undefined)m.lastRewardedBattleId=null;
  if(m.battle){m.battle.resolved=!!m.battle.resolved;m.battle.actionSeq=m.battle.actionSeq||0}
});s.missions.forEach(m=>{if(m.battle){if(m.battle.resolved==null)m.battle.resolved=false;if(m.battle.actionSeq==null)m.battle.actionSeq=0}});
  s.missions.forEach(m=>{
    if(!m.start)m.start=Date.now();
    if(!m.lastSim)m.lastSim=m.start;
    if(m.kills==null)m.kills=0;
    if(m.fights==null)m.fights=0;
    if(m.normalEncountersCompleted==null){
      m.normalEncountersCompleted=(m.type==='dungeon'||m.type==='raid')?Math.min(m.fights||0,m.maxFights||Infinity):(m.fights||0);
    }
    if(m.goldEarned==null)m.goldEarned=0;
    if(m.repEarned==null)m.repEarned=0;
    if(!m.battle)m.battle=null;
    if(!m.stash)m.stash=emptyStash();else{m.stash.gold=m.stash.gold||0;m.stash.rep=m.stash.rep||0;m.stash.materials=m.stash.materials||{};m.stash.items=Array.isArray(m.stash.items)?m.stash.items:[];}
    if(!m.partyState)m.partyState={};
  });
}
function id(){return s.next++}
function itemRarity(tier=1,smithLevel=null){
  const r=Math.random();
  const lv=Math.max(1,smithLevel??s?.smithing?.level??1);
  const tierBonus=Math.min(.018,Math.max(0,tier-1)*.0015);
  // Smithing meaningfully shifts crafts upward. These are cumulative Rare+/Epic+/Legendary+/Mythic thresholds.
  const mythic=Math.min(.02,.00008+tierBonus*.03+(lv-1)*.00005);
  const legendary=Math.max(mythic,Math.min(.08,.0007+tierBonus*.12+(lv-1)*.0004));
  const epic=Math.max(legendary,Math.min(.25,.004+tierBonus*.35+(lv-1)*.0025));
  const rare=Math.max(epic,Math.min(.60,.022+tierBonus+(lv-1)*.01));
  const uncommon=Math.max(rare,Math.min(.88,.14+tierBonus*2.2+(lv-1)*.004));
  if(r<mythic)return'Mythic';
  if(r<legendary)return'Legendary';
  if(r<epic)return'Epic';
  if(r<rare)return'Rare';
  if(r<uncommon)return'Uncommon';
  return'Common';
}

function recruitRarity(){
  const r=Math.random(),lv=s.level;

  // Recruit rarity is gated by guild level.
  // Lv 1-4: Common/Uncommon only
  // Lv 5+: Rare
  // Lv 12+: Epic
  // Lv 25+: Legendary
  // Lv 45+: Mythic
  let uncommon=.10,rare=lv>=5?.018:0,epic=lv>=12?.0035:0,legendary=lv>=25?.00045:0,mythic=lv>=45?.00004:0;
  const total=uncommon+rare+epic+legendary+mythic;

  if(r<mythic)return'Mythic';
  if(r<mythic+legendary)return'Legendary';
  if(r<mythic+legendary+epic)return'Epic';
  if(r<mythic+legendary+epic+rare)return'Rare';
  if(r<total)return'Uncommon';
  return'Common';
}

function recruitSkillRange(){
  const lv=Math.max(1,s.level||1);
  const min=lv>=10?3:lv>=5?2:1;
  const max=Math.min(10,3+Math.floor((lv-1)/3));
  return[min,Math.max(min,max)];
}
function rolledRecruitSkills(){
  const [min,max]=recruitSkillRange();
  return{
    woodcutting:{level:rnd(min,max),xp:0},
    mining:{level:rnd(min,max),xp:0},
    fishing:{level:rnd(min,max),xp:0},
    herbalism:{level:rnd(min,max),xp:0},
    hunting:{level:rnd(min,max),xp:0}
  };
}

function hero(){
  let c=pick(Object.keys(C)),t=pick(traits),ra=recruitRarity();
  const recruitBase=1+Math.floor(Math.max(0,(s.level||1)-1)*.18);
  const lv=clamp(rnd(Math.max(1,recruitBase-2),recruitBase+1),1,15);
  return{
    id:id(),name:pick(FN)+' '+pick(LN),class:c,race:pick(RACE_NAMES),rarity:ra,trait:t.name,level:lv,xp:0,busy:false,subclass:null,
    equip:{Weapon:null,Armor:null,Jewelry:null},
    skills:rolledRecruitSkills(),
    bonus:{
      hp:t.hp+lv*3,
      str:t.str+Math.floor(lv*.8),
      dex:t.dex+Math.floor(lv*.8),
      int:t.int+Math.floor(lv*.8),
      def:t.def+Math.floor(lv*.7),
      mdef:t.mdef+Math.floor(lv*.7),
      
      fire:0,ice:0,poison:0,lightning:0,holy:0,dark:0
    }
  };
}
function applyRarityBonuses(it,tier){
  const rarity=it.rarity;
  const simpleBonus={Common:0,Uncommon:1,Rare:2,Epic:3,Legendary:4,Mythic:5}[rarity]||0;

  if(simpleBonus>0){
    if(it.stat==='regen'||it.stat==='manaRegen')it.value+=Math.max(1,Math.floor(simpleBonus/2));
    else if(it.stat==='mana')it.value+=simpleBonus*2;
    else if(it.stat==='lifesteal')it.value+=simpleBonus;
    else it.value+=simpleBonus*2;
  }

  if(rarity==='Rare'||rarity==='Epic'||rarity==='Legendary'||rarity==='Mythic'){
    const pool=['lifesteal','regen','mana','manaRegen','attackSpeed','fire','ice','poison','lightning','holy','dark','str','dex','int','mdef'];
    it.secondaryStat=pick(pool);
    if(it.secondaryStat==='lifesteal')it.secondaryValue=2+simpleBonus;
    else if(it.secondaryStat==='regen'||it.secondaryStat==='manaRegen')it.secondaryValue=Math.max(1,Math.floor(1+simpleBonus/2));
    else if(it.secondaryStat==='mana')it.secondaryValue=4+simpleBonus*2;
    else if(it.secondaryStat==='attackSpeed')it.secondaryValue=2+simpleBonus;
    else if(['fire','ice','poison','lightning','holy','dark'].includes(it.secondaryStat))it.secondaryValue=4+simpleBonus*2;
    else it.secondaryValue=1+simpleBonus;
  }

  if(rarity==='Legendary'||rarity==='Mythic'){
    const tertiaryPool=['lifesteal','regen','mana','manaRegen','attackSpeed','fire','ice','poison','lightning','holy','dark','def','mdef'];
    it.tertiaryStat=pick(tertiaryPool);
    it.tertiaryValue=it.tertiaryStat==='lifesteal'?4+simpleBonus:(it.tertiaryStat==='regen'||it.tertiaryStat==='manaRegen')?2+Math.floor(simpleBonus/2):it.tertiaryStat==='mana'?6+simpleBonus*2:it.tertiaryStat==='attackSpeed'?3+simpleBonus:6+simpleBonus*2;
  }

  if(rarity==='Mythic'){
    it.mythicEffect=pick(['Executioner','Phoenix','Stormheart','Bloodbound','Frostborn']);
  }

  it.power=(it.power||0)+simpleBonus*8+(it.secondaryValue||0)*4+(it.tertiaryValue||0)*4;
  return it;
}

function makeSpecificItem(slot,name,tier=1,forcedRarity=null){
  const ra=forcedRarity||itemRarity(tier);
  const it={id:id(),slot,rarity:ra,tier:Math.max(1,Number(tier)||1),equipped:null,runes:[]};

  if(slot==='Weapon'){
    const w=WEAPONS[name];
    it.weaponTemplate=name;
    it.weaponType=weaponTypeFor(name);
    it.scale=w.scale;
    it.scale2=w.scale2||null;
    it.damageType=w.type;
    it.weaponPower=Math.round((w.base+tier*2)*rm[ra]);
    it.name=name;
    const statBudget=Math.max(1,Math.round((2+tier*.7)*rm[ra]));
    it.stat=w.scale;
    if(w.scale2){
      it.value=Math.ceil(statBudget/2);
      it.secondaryStat=w.scale2;
      it.secondaryValue=Math.floor(statBudget/2);
    }else{
      it.value=statBudget;
    }
    it.power=it.weaponPower*4+statBudget*4;
    it.armorPen=w.armorPen||0;
    it.parry=w.parry||0;
    it.weaponCritChance=w.critChance||0;
    it.critDamage=w.critDamage||0;
    it.accuracy=w.accuracy||0;
    it.elementalDamage=w.elementalDamage||0;
    it.healingPower=w.healingPower||0;
    it.statusChance=w.statusChance||0;
    it.cleave=w.cleave||0;
    it.counter=w.counter||0;
    it.damageVariance=w.damageVariance||0;
    it.power+=Math.round((it.armorPen+it.parry+it.weaponCritChance+it.accuracy+it.elementalDamage+it.healingPower+it.statusChance+it.cleave+it.counter)*60+it.critDamage*35);
    return applyRarityBonuses(it,tier);
  }

  if(slot==='Armor'){
    it.name=name;
    const profile=armorProfile(name);
    it.armorClass=profile.armorClass;
    it.block=profile.block||0;
    it.stat=profile.stat;
    it.value=Math.round((profile.base+tier*2)*rm[ra]);
    it.power=it.value*4+it.block*10;
    if(name.includes('Frostguard')){it.secondaryStat='ice';it.secondaryValue=12+tier*2}
    if(name.includes('Flameward')){it.secondaryStat='fire';it.secondaryValue=12+tier*2}
    return applyRarityBonuses(it,tier);
  }

  if(slot==='Ring'){
    it.name=name;
    it.stat=name.includes('Guardian')?'def':name.includes('Crystal')?'int':name.includes('Runed')?'mdef':'str';
    it.value=Math.round((3+tier*1.6)*rm[ra]);
    it.power=it.value*4;
    return applyRarityBonuses(it,tier);
  }

  if(slot==='Amulet'){
    it.name=name;
    it.stat=name.includes('Warden')?'mdef':name.includes('Arcane')?'int':name.includes('Crystal')?'mdef':'hp';
    it.value=it.stat==='hp'?Math.round((12+tier*4)*rm[ra]):Math.round((3+tier*1.8)*rm[ra]);
    it.power=it.value*(it.stat==='hp'?2:4);
    return applyRarityBonuses(it,tier);
  }

  return applyRarityBonuses(it,tier);
}

function item(slot,tier=1){
  if(slot==='Weapon')return makeSpecificItem(slot,pick(Object.keys(WEAPONS)),tier);
  if(slot==='Armor')return makeSpecificItem(slot,pick(armorNamesForTier(tier)),tier);
  if(slot==='Ring')return makeSpecificItem(slot,pick(['Band','Signet','Ring']),tier);
  return makeSpecificItem('Amulet',pick(['Charm','Pendant','Amulet']),tier);
}
function strengthHpBonus(str){
  return Math.floor(Math.max(0,str||0)/4);
}
function physicalDodgeFromDex(dex){
  return Math.min(.40,Math.max(0,dex||0)*.0025);
}
function magicalDodgeFromInt(intel){
  return Math.min(.40,Math.max(0,intel||0)*.0025);
}
function hs(h){
  const b=C[h.class];
  const e={hp:0,str:0,dex:0,int:0,def:0,mdef:0,block:0,regen:0,mana:0,manaRegen:0,attackSpeed:0,lifesteal:0,fire:0,ice:0,poison:0,lightning:0,holy:0,dark:0,power:0,damageBonus:0,healBonus:0,critBonus:0,threatBonus:0,physicalDodgeBonus:0,magicalDodgeBonus:0,armorPen:0,parry:0,weaponCritChance:0,critDamage:0,accuracy:0,elementalDamage:0,healingPower:0,statusChance:0,cleave:0,counter:0,damageVariance:0};

  Object.values(h.equip||{}).forEach(i=>{
    if(!i)return;
    const it=s.inventory.find(x=>x.id===i);
    if(!it)return;
    const add=(k,v)=>{if(k in e)e[k]+=v};
    add(it.stat,it.value||0);
    add(it.secondaryStat,it.secondaryValue||0);
    add(it.tertiaryStat,it.tertiaryValue||0);
    add('block',itemBlockValue(it));
    Object.entries(it.extraStats||{}).forEach(([k,v])=>add(k,v));
    e.damageBonus+=it.damageBonus||0;
    e.healBonus+=it.healBonus||0;
    e.critBonus+=it.itemCritBonus||0;
    e.threatBonus+=it.itemThreatBonus||0;
    e.physicalDodgeBonus+=it.itemPhysicalDodgeBonus||0;
    e.magicalDodgeBonus+=it.itemMagicalDodgeBonus||0;
    e.armorPen+=it.armorPen||0;
    e.parry+=it.parry||0;
    e.weaponCritChance+=it.weaponCritChance||0;
    e.critDamage+=it.critDamage||0;
    e.accuracy+=it.accuracy||0;
    e.elementalDamage+=it.elementalDamage||0;
    e.healingPower+=it.healingPower||0;
    e.statusChance+=it.statusChance||0;
    e.cleave+=it.cleave||0;
    e.counter+=it.counter||0;
    e.damageVariance+=it.damageVariance||0;
    (it.runes||[]).forEach(rid=>{const rune=RUNES[rid];if(rune){add(rune.stat,rune.value||0);e.power+=(rune.stat==='hp'?rune.value*2:rune.value*4)}});
    e.power+=it.power||0;
  });

  const m=rm[h.rarity];
  const bonus=h.bonus||{};
  const sub=subclassDef(h)||{};
  const tr=traitDef(h)||{};
  const race=raceDef(h),rMult=race.mult||{},rFlat=race.flat||{};
  const str=Math.round((b.str+(bonus.str||0)+e.str)*m*(rMult.str||1));
  const dex=Math.round((b.dex+(bonus.dex||0)+e.dex)*m*(rMult.dex||1));
  const intel=Math.round((b.int+(bonus.int||0)+e.int)*m*(rMult.int||1));
  const hp=Math.round((Math.round((b.hp+(bonus.hp||0)+e.hp)*m)+strengthHpBonus(str))*(sub.hpMult||1)*(tr.hpMult||1)*(rMult.hp||1));
  const def=Math.round((b.def+(bonus.def||0)+e.def)*m*(sub.defMult||1)*(tr.defMult||1)*(rMult.def||1));
  const mdef=Math.round((b.mdef+(bonus.mdef||0)+e.mdef)*m*(sub.mdefMult||1)*(tr.mdefMult||1)*(rMult.mdef||1));
  const block=Math.max(0,Math.round((b.block||0)+(bonus.block||0)+e.block+(sub.blockBonus||0)+(rFlat.block||0)));
  const mana=Math.max(0,Math.round((20+intel+(bonus.mana||0)+e.mana)*(rMult.mana||1)));
  const manaRegen=Math.max(0,Math.round((b.manaRegen||1)+(bonus.manaRegen||0)+e.manaRegen+(sub.manaRegenBonus||0)+(rFlat.manaRegen||0)));
  const attackSpeed=(CLASS_ATTACK_SPEED[h.class]||0)+(sub.attackSpeedBonus||0)+(bonus.attackSpeed||0)/100+e.attackSpeed/100+(rFlat.attackSpeed||0);

  const fire=Math.round((bonus.fire||0)+e.fire+(rFlat.fire||0));
  const ice=Math.round((bonus.ice||0)+e.ice+(rFlat.ice||0));
  const poison=Math.round((bonus.poison||0)+e.poison+(rFlat.poison||0));
  const lightning=Math.round((bonus.lightning||0)+e.lightning+(rFlat.lightning||0));
  const holy=Math.round((bonus.holy||0)+e.holy+(rFlat.holy||0));
  const dark=Math.round((bonus.dark||0)+e.dark+(rFlat.dark||0));

  const physicalDodge=clamp(physicalDodgeFromDex(dex)+(sub.physicalDodgeBonus||0)+(tr.physicalDodgeBonus||0)+e.physicalDodgeBonus-(tr.physicalDodgePenalty||0)+(rFlat.physicalDodge||0),0,.40);
  const magicalDodge=clamp(magicalDodgeFromInt(intel)+(sub.magicalDodgeBonus||0)+(tr.magicalDodgeBonus||0)+e.magicalDodgeBonus-(tr.magicalDodgePenalty||0)+(rFlat.magicalDodge||0),0,.40);

  const power=Math.round(
    hp*.12+str*2+dex*2+intel*2+def*1.8+mdef*1.8+
    (fire+ice+poison+lightning+holy+dark)*.45+mana*.25+manaRegen*8+Math.max(0,attackSpeed)*85+block*10+e.power*.65+e.regen*5+e.lifesteal*3+e.critBonus*100+e.threatBonus*12+e.damageBonus*80+e.healBonus*60
  );

  return{hp,str,dex,int:intel,mana,manaRegen,attackSpeed,def,mdef,block,threat:Math.max(.1,(b.threat||1)+(sub.threatBonus||0)+(tr.threatBonus||0)+e.threatBonus),physicalDodge,magicalDodge,regen:e.regen,lifesteal:e.lifesteal+(tr.lifesteal||0),fire,ice,poison,lightning,holy,dark,power,damageMult:(sub.damageMult||1)*(tr.damageMult||1)*(1+e.damageBonus)*(1+(rFlat.attackMult||0)),healMult:(sub.healMult||1)*(tr.healMult||1)*(1+e.healBonus)*(1+e.healingPower),critBonus:(sub.critBonus||0)+(tr.critBonus||0)+e.critBonus+e.weaponCritChance,element:sub.element||null,elementMult:sub.elementMult||1,activeType:sub.activeType||null,subclass:h.subclass||null,armorPen:clamp(e.armorPen,0,.75),parry:clamp(e.parry,0,.40),critDamage:e.critDamage,accuracy:clamp(e.accuracy,0,.40),elementalDamage:e.elementalDamage,statusChance:e.statusChance,cleave:e.cleave,counter:e.counter,damageVariance:e.damageVariance,execute:sub.execute||0};
}
function log(x){s.log.unshift(x);s.log=s.log.slice(0,50)}
function guildRepNeeded(level){
  // Reputation numbers are intentionally large for better granularity.
  // This is exactly 50x the previous requirement curve.
  return Math.round((250+100*level+30*level*level)*50);
}
function lowLevelRewardMultiplier(characterLevel,areaLevel){
  const over=Math.max(0,(characterLevel||1)-(areaLevel||1));
  // Five-level grace range. Penalty begins at 6 levels over the area.
  if(over<=5)return 1;
  if(over===6)return .85;
  if(over===7)return .70;
  if(over===8)return .55;
  if(over===9)return .40;
  if(over===10)return .25;
  if(over===11)return .10;
  if(over===12)return .08;
  if(over===13)return .06;
  if(over===14)return .04;
  if(over===15)return .02;
  return 0;
}
function missionReputationMultiplier(m){
  const highest=Math.max(1,...(m.party||[]).map(id=>s.members.find(x=>x.id===id)?.level||1));
  return lowLevelRewardMultiplier(highest,m.level);
}
function grantGuildReputation(amount){
  amount=Math.max(0,Math.round(amount||0));
  if(!amount)return 0;
  s.rep=(s.rep||0)+amount;
  let need=guildRepNeeded(s.level);
  while(s.rep>=need){
    s.rep-=need;
    s.level++;
    s.gold+=(25+s.level*8)*5;
    log('Guild reputation reached level '+s.level+'.');
    need=guildRepNeeded(s.level);
  }
  return amount;
}
function expeditionPartySize(){return 2+(s.up.party||0)}
function partySizeFor(type){return type==='raid'?20:expeditionPartySize()}
function applicantBatchSize(){return 2+(s.up.recruit||0)}
function fillApplicants(){
  const target=applicantBatchSize();
  while(s.recruits.length<target)s.recruits.push(hero());
  s.applicantCap=target;
  s.nextApplicantsAt=Date.now()+5*60*1000;
}
function migrateGuildProgression(){
  if(s.xp!=null){
    s.rep=(s.rep||0)+Math.max(0,Math.round(s.xp));
    delete s.xp;
  }
  if(s.rep==null)s.rep=0;
  if(!s.repScale50Migrated){
    s.rep=Math.round((s.rep||0)*50);
    (s.missions||[]).forEach(m=>{if(m.stash)m.stash.rep=Math.round((m.stash.rep||0)*50)});
    s.repScale50Migrated=true;
  }
}
function ensure(){
  if(s.guildNamed==null)s.guildNamed=!!String(s.guild||'').trim();
  migrateGuildProgression();
  normalizeOnboarding();
  s.applicantCap=applicantBatchSize();
  if(!s.recruits.length){
    if(!s.nextApplicantsAt||Date.now()>=s.nextApplicantsAt)fillApplicants();
  }
  if(s.quests.length!==AREAS.length)refreshOffers('quest');
  if(s.dungeons.length!==DUNGEON_AREAS.length)refreshOffers('dungeon');
  if(s.raids.length!==RAID_AREAS.length)refreshOffers('raid');
  ensureQuestBoard();
}
function refreshRec(pay=false){
  if(pay){
    const cost=50;
    if(s.gold<cost)return notify('Not enough gold.');
    s.gold-=cost;
    s.recruits=[];
    fillApplicants();
    log('Recruitment board rerolled for '+cost+' gold.');
    save();render();
    return notify('New applicants arrived.','good');
  }

  if(!s.recruits.length&&(!s.nextApplicantsAt||Date.now()>=s.nextApplicantsAt))fillApplicants();
  save();
}
function offer(type,index=0){
 if(type==='quest'){
   const a=AREAS[index%AREAS.length];
   return{id:id(),type:'quest',areaId:a.id,name:a.name,desc:a.desc,level:a.level,target:70+a.level*24,gold:18+a.level*3,rep:5+a.level,icon:a.icon,enemyPool:a.enemyPool};
 }
 if(type==='dungeon'){
   const a=DUNGEON_AREAS[index%DUNGEON_AREAS.length];
   return{id:id(),type:'dungeon',name:a.name,desc:a.desc,level:a.level,target:120+a.level*28,gold:35+a.level*5,rep:10+a.level*2,maxFights:6+Math.floor(a.level/5),boss:a.boss,enemyPool:a.enemyPool,theme:a.theme};
 }
 const a=RAID_AREAS[index%RAID_AREAS.length];
 return{id:id(),type:'raid',name:a.name,desc:a.desc,level:a.level,target:220+a.level*34,gold:80+a.level*7,rep:25+a.level*3,maxFights:10+Math.floor(a.level/4),boss:a.boss,enemyPool:a.enemyPool,theme:a.theme};
}
function arr(type){return type==='raid'?s.raids:type==='dungeon'?s.dungeons:s.quests}
function refreshOffers(type){
 if(type==='quest')s.quests=AREAS.map((_,i)=>offer('quest',i));
 else if(type==='dungeon')s.dungeons=DUNGEON_AREAS.map((_,i)=>offer('dungeon',i));
 else s.raids=RAID_AREAS.map((_,i)=>offer('raid',i));
 save();
}
