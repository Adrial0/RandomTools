// Mission combat, rewards, offline resolution, and encounter lifecycle.
function makeBoss(m){
  const bossTpl=ENEMIES_DATA[m.bossTemplate||m.boss]||{};const info=[gameIcon('boss',m.bossTemplate||m.boss,bossTpl.icon||'👑','gameAsset combatAsset'),(bossTpl.drops||[])[0]];
  if(!info)throw new Error('Missing boss definition for '+m.type+' / '+m.boss);

  const raid=m.type==='raid';
  const level=m.level||1,scale=1+level*.12,hpScale=1.12+Math.max(0,level-1)*.20;

  const gapMult=underlevelEnemyMultiplier(m,level);
  const personalHp=m.personalQuest?(m.hard?4.5:3.5):1,personalAtk=m.personalQuest?(m.hard?1.55:1.35):1;
  // Tier gates are progression checks rather than ordinary bosses. Their
  // increased durability prevents a short burst from bypassing the fight,
  // while the damage and defense bonuses demand an appropriately geared party.
  const gateHp=m.bossGate?2.5:1,gateAtk=m.bossGate?1.6:1,gateDefense=m.bossGate?1.35:1;
  const maxHp=Math.round((raid?720:360)*hpScale*1.15*gapMult*personalHp*gateHp);
  const atk=Math.round((raid?18:13)*scale*1.10*gapMult*personalAtk*gateAtk);
  const def=Math.round((raid?10:7)*scale*gateDefense);
  const mdef=Math.round((raid?11:8)*scale*gateDefense);

  return{
    id:1,
    name:m.boss,
    icon:info[0],
    maxHp,
    hp:maxHp,
    atk,
    def,
    mdef,
    fire:rnd(10,30),ice:rnd(10,30),poison:rnd(10,30),lightning:rnd(10,30),holy:rnd(10,30),dark:rnd(10,30),
    damageType:({
      'Skeleton King':'dark','Broodmother':'poison','Rotting Colossus':'poison','High Cultist':'dark',
      'Ancient Drake':'fire','War Ogre':'physical','Wraith Lord':'dark','Abyssal Demon':'dark'
    })[m.boss]||bossTpl.damageType||m.theme||'physical',
    aoeChance:raid?(m.boss==='War Ogre'?.25:.78):(m.bossGate?.62:.48),
    elementalMult:raid?1.55:(m.bossGate?1.40:1.20),
    mage:true,boss:true,maxMana:80,mana:80,manaRegen:m.bossGate?6:4,ability:bossTpl.ability||null,drops:bossTpl.drops||[],abilityReadyAt:0,attackInterval:raid?4500:(m.bossGate?3500:4000),attackStartedAt:Date.now(),nextAttackAt:Date.now()+(raid?4500:(m.bossGate?3500:4000))
  };
}

function makeBossBattle(m){
  const b=makeBattle(m);
  const boss=makeBoss(m);
  b.resolved=false;
  b.actionSeq=0;
  b.kind='boss';
  b.encounterNumber=null;
  b.enemies=[boss];
  b.boss=true;
  b.bossStartedAt=Date.now();
  b.bossEnrageAt=b.bossStartedAt+18000;
  b.bossMechanics={summoned70:false,summoned35:false,phaseTwo:false,enraged:false};
  b.log=['⚠ BOSS: '+m.boss+' enters the battle.'];
  return b;
}
function bossItemDrop(m,rarity){
  const targetTier=clamp(m.tier||1,1,10);
  let candidates=recipes.map((r,i)=>({r,i})).filter(x=>x.r[4]===targetTier);
  if(!candidates.length)candidates=recipes.map((r,i)=>({r,i})).filter(x=>x.r[4]<=targetTier).sort((a,b)=>b.r[4]-a.r[4]);
  if(!candidates.length)return null;

  const chosen=pick(candidates);
  const [displayName,slot,specificName,,tier]=chosen.r;
  const it=makeSpecificItem(slot,specificName,tier,rarity);
  applyRecipeModifiers(it,chosen.r[5]||{});
  it.name=displayName;
  it.recipeIndex=chosen.i;
  it.dropSource=m.boss;
  return it;
}
function awardAreaGuildBonus(m,major=false){
  const key=major?`boss:${m.type}:${m.boss||m.name}`:`area:${m.areaId||m.name}`;
  s.areaRewards=Array.isArray(s.areaRewards)?s.areaRewards:[];
  if(s.areaRewards.some(x=>x.key===key))return null;
  s.guildBonuses=Object.assign({maxHp:0,gatherSpeed:0,cooldownReduction:0},s.guildBonuses||{});
  const kinds=[['maxHp','Maximum HP'],['gatherSpeed','Gathering speed'],['cooldownReduction','Ability cooldown recovery']],kind=kinds[s.areaRewards.length%kinds.length],amount=major?.02:.01;
  s.guildBonuses[kind[0]]=Math.min(.20,(s.guildBonuses[kind[0]]||0)+amount);
  const reward={key,type:kind[0],label:kind[1],amount,source:m.name};s.areaRewards.push(reward);
  return reward;
}
function victoryPresentation(m,{major=false,guildBonus=null,item=null,unique=null}={}){
  const partyUnlock=major&&m.gateTier<=5?` Expedition party capacity increased to ${Math.min(8,3+m.gateTier)}.`:'';
  const unlockText=(major?(m.gateTier<10?`Tier ${tierLabel(m.gateTier+1)} expeditions and gathering progression unlocked.`:'The final expedition chapter is complete.'):'The next expedition area is now available.')+partyUnlock;
  const title=major?`Tier ${tierLabel(m.gateTier||m.tier||1)} Conquered`:`${m.name} Cleared`;
  const itemHtml=item?`<div class="victoryRewardItem ${rarityClass(item.rarity)}"><b>${item.rarity} ${item.name}</b><span>${item.uniquePassive||'Guaranteed first-clear equipment reward'}</span></div>`:'';
  m.victoryPresentation={title,major,unlockText,guildBonus,itemName:item?.name||null,unique:!!unique};
  if(typeof showModal==='function')setTimeout(()=>showModal(title,`<div class="victoryPresentation ${major?'major':''}"><div class="victoryCrest">${major?'👑':'⚔️'}</div><h2>${title}</h2><p>${unlockText}</p>${guildBonus?`<div class="victoryGuildBonus"><b>Permanent Guild Bonus</b><span>+${(guildBonus.amount*100).toFixed(guildBonus.amount<.01?2:1)}% ${guildBonus.label}</span></div>`:''}${itemHtml}${unique?'<div class="unique victoryUniqueCallout">A Unique boss item has been discovered!</div>':''}</div>`),80);
}

function bossReward(m){
  ensureCombatReport(m).encounters++;
  if(m.personalQuest){personalQuestBossReward(m);return}
  const bossTpl=ENEMIES_DATA[m.boss]||{},k=(bossTpl.drops||[])[0];
  m.stash.materials[k]=(m.stash.materials[k]||0)+1;
  markResourceFound(k);

  const bossKey=`${m.type}:${m.boss}`,firstClear=!(s.bossClears||[]).includes(bossKey),roll=Math.random();
  addGuildActivity(firstClear?6:2,firstClear?'first boss clear':'boss clear');
  let bonusItem=null,unique=false;
  if(roll<(firstClear ? .10 : .0015)){bonusItem=makeUniqueItem(m.tier||1,m.boss,m.level||1);unique=true}
  else if(firstClear&&m.bossGate)bonusItem=bossItemDrop(m,'Rare');
  else if(roll<.01)bonusItem=bossItemDrop(m,'Legendary');
  else if(roll<.06)bonusItem=bossItemDrop(m,'Rare');

  if(bonusItem){
    m.stash.items.push(bonusItem);
    m.battle.log.unshift(`${m.boss} dropped a ${bonusItem.rarity} ${bonusItem.name}!`);
  }

  m.completed=true;
  m.bossDefeated=true;
  if(firstClear){s.bossClears.push(bossKey);const guildBonus=awardAreaGuildBonus(m,true);victoryPresentation(m,{major:!!m.bossGate,guildBonus,item:bonusItem,unique})}
  if(m.bossGate&&m.gateTier){
    s.expeditionGates=Array.isArray(s.expeditionGates)?s.expeditionGates:[];
    if(!s.expeditionGates.includes(m.gateTier)){
      s.expeditionGates.push(m.gateTier);
      s.expeditionGates.sort((a,b)=>a-b);
      m.battle.log.unshift(m.gateTier<10?`Tier ${tierLabel(m.gateTier+1)} expeditions unlocked.`:'The final expedition chapter is complete.');
    }
  }
  trackQuestProgress('boss',m.boss,1,{contentType:m.type});
  m.battle.log.unshift(m.boss+' dropped '+RESOURCE_NAMES[k]+'.');
  log(m.name+' completed. '+m.boss+' defeated.');
  save();
  if(typeof renderOffers==='function')renderOffers('quest');
}
let currentMissionForEnemy=null;
function averageMissionPartyLevel(m){
  const levels=(m?.party||[]).map(id=>s.members.find(h=>h.id===id)?.level).filter(Number.isFinite);
  return levels.length?levels.reduce((sum,level)=>sum+level,0)/levels.length:(m?.level||1);
}
function underlevelEnemyMultiplier(m,encounterLevel){
  if(!m||m.type==='arena')return 1;
  const gap=Math.max(0,(encounterLevel||m.level||1)-averageMissionPartyLevel(m));
  return 1+Math.min(.40,gap*.03);
}
function stageEnemyMultiplier(m){
  if(!isStagedExpedition(m))return 1;
  return 1+Math.min(4,Math.floor(expeditionEncounterCount(m)/EXPEDITION_STAGE_SIZE))*.07;
}
function encounterEnemyCount(m,areaFinal=false){
  if(areaFinal)return 1;
  if(m.type==='raid')return 3;
  if(m.type==='dungeon')return rnd(2,3);
  const tier=Math.max(1,m.tier||1),partySize=Math.max(1,m.party?.length||1);
  if(tier===1)return rnd(1,3);
  if(tier===2)return rnd(2,4);
  const minimum=Math.min(5,Math.max(3,partySize-1)),maximum=Math.min(5,Math.max(minimum,partySize));
  return rnd(minimum,maximum);
}
function makeEnemy(type,level,index,forcedName=null){
  const names=forcedName?[]:(currentMissionForEnemy?.enemyPool&&currentMissionForEnemy.enemyPool.length)?currentMissionForEnemy.enemyPool:(enemyPools[type]||enemyPools.quest);
  const name=forcedName||pick(names),tpl=ENEMIES_DATA[name]||null;
  if(!tpl){console.warn('Missing enemy data:',name);return {id:index+1,name,level,icon:'❓',maxHp:50,hp:50,atk:12,def:6,mdef:6,block:0,fire:0,ice:0,poison:0,lightning:0,holy:0,dark:0,damageType:'physical',attackInterval:2400,attackStartedAt:Date.now(),nextAttackAt:Date.now()+2400,mana:0,maxMana:0,manaRegen:0,drops:[]}}
  const ar=ENEMY_ARCHETYPES_DATA[tpl.archetype]||ENEMY_ARCHETYPES_DATA.brute,scale=1+level*.12;
  // Preserve the original level-1 baseline, then let durability grow faster
  // than unequipped hero damage. Attack and defenses retain gentler scaling.
  const hpScale=1.12+Math.max(0,level-1)*.20,difficulty=underlevelEnemyMultiplier(currentMissionForEnemy,level)*stageEnemyMultiplier(currentMissionForEnemy);
  const contentTier=Math.max(1,Math.min(10,Number(currentMissionForEnemy?.tier)||Math.ceil(level/10)||1));
  const gearDurabilityScale=typeof equipmentTierMultiplier==='function'?equipmentTierMultiplier(contentTier):Math.pow(1.6,contentTier-1);
  const hp=Math.round((tpl.baseHp||35)*hpScale*2.25*gearDurabilityScale*(ar.hpMult||1)*difficulty);
  const atk=Math.round((tpl.baseAttack||12)*scale*(ar.attackMult||1)*difficulty);
  const def=Math.round((tpl.baseDefense||6)*scale*1.15*(ar.defMult||1));
  const maxMana=Math.max(0,Math.round((ar.mana||0)+level*.5));
  const interval=Math.round(ar.attackInterval||2400);
  return {id:index+1,name,level,icon:gameIcon('enemy',name,tpl.icon||'❓','gameAsset combatAsset'),archetype:tpl.archetype,ability:tpl.ability||null,drops:tpl.drops||['Iron'],maxHp:hp,hp,atk,def,mdef:Math.round(def*.94),block:0,fire:rnd(0,18),ice:rnd(0,18),poison:rnd(0,18),lightning:rnd(0,18),holy:rnd(0,18),dark:rnd(0,18),damageType:tpl.damageType||'physical',elementalMult:type==='raid'?1.30:type==='dungeon'?1.12:1.0,mage:maxMana>0,maxMana,mana:maxMana,manaRegen:ar.manaRegen||0,abilityReadyAt:0,attackInterval:interval,attackStartedAt:Date.now(),nextAttackAt:Date.now()+interval,enrageThreshold:ar.enrageThreshold||0,enrageMult:ar.enrageMult||1,basicStatus:ar.basicStatus||null,basicStatusChance:ar.basicStatusChance||0,protectorAura:ar.protectorAura||0,executeThreshold:ar.executeThreshold||0,executeMult:ar.executeMult||1};
}

function ensurePartyState(m){
  if(!m.partyState)m.partyState={};
  m.party.forEach(hid=>{
    const h=s.members.find(x=>x.id===hid);
    if(!h)return;
    const z=hs(h);
    if(!m.partyState[hid]){
      m.partyState[hid]={hp:z.hp,maxHp:z.hp,mana:z.mana,maxMana:z.mana,cooldowns:{},buffs:{},statuses:{},nextAttackAt:null,attackStartedAt:null};
    }else{
      const oldMax=m.partyState[hid].maxHp||z.hp;
      const ratio=oldMax?m.partyState[hid].hp/oldMax:1;
      m.partyState[hid].maxHp=z.hp;
      m.partyState[hid].hp=Math.min(z.hp,Math.max(0,Math.round(z.hp*ratio)));
      if(m.partyState[hid].maxMana==null)m.partyState[hid].maxMana=z.mana;
      if(m.partyState[hid].mana==null)m.partyState[hid].mana=z.mana;
      if(!m.partyState[hid].cooldowns||typeof m.partyState[hid].cooldowns!=='object')m.partyState[hid].cooldowns={};
      if(!m.partyState[hid].buffs||typeof m.partyState[hid].buffs!=='object')m.partyState[hid].buffs={};
      if(!m.partyState[hid].statuses||typeof m.partyState[hid].statuses!=='object')m.partyState[hid].statuses={};
      m.partyState[hid].maxMana=z.mana;
      m.partyState[hid].mana=Math.min(z.mana,Math.max(0,m.partyState[hid].mana));
    }
  });
}
function activePersistentBuffs(buffs,now=Date.now()){
  return Object.fromEntries(Object.entries(buffs||{}).filter(([,expiresAt])=>Number(expiresAt)>now));
}
function activePersistentStatuses(statuses,now=Date.now()){
  return Object.fromEntries(Object.entries(statuses||{}).filter(([,status])=>Number(status?.expiresAt)>now).map(([key,status])=>[key,{...status}]));
}
function ensureCombatCycle(m){
  if(!m.combatCycle||typeof m.combatCycle!=='object'){
    const b=m.battle||{};
    m.combatCycle={
      phase:b.phase==='enemies'?'enemies':'heroes',
      heroTurn:b.phase==='heroes'?Math.max(0,b.turn||0):0,
      enemyTurn:b.phase==='enemies'?Math.max(0,b.turn||0):0,
      round:Math.max(1,b.round||1)
    };
  }
  if(!['heroes','enemies'].includes(m.combatCycle.phase))m.combatCycle.phase='heroes';
  m.combatCycle.heroTurn=Math.max(0,Math.floor(m.combatCycle.heroTurn||0));
  m.combatCycle.enemyTurn=Math.max(0,Math.floor(m.combatCycle.enemyTurn||0));
  m.combatCycle.round=Math.max(1,Math.floor(m.combatCycle.round||1));
  return m.combatCycle;
}
function syncBattleCycleFromMission(m,b){
  const c=ensureCombatCycle(m);
  b.phase=c.phase;
  b.turn=c.phase==='heroes'?c.heroTurn:c.enemyTurn;
  b.round=c.round;
}
function syncMissionCycleFromBattle(m,b){
  const c=ensureCombatCycle(m);
  c.phase=b.phase;
  if(b.phase==='heroes')c.heroTurn=Math.max(0,b.turn||0);
  else c.enemyTurn=Math.max(0,b.turn||0);
  c.round=Math.max(1,b.round||c.round||1);
}
function beginEnemyPhase(m,b){
  b.phase='enemies';b.turn=0;
  const c=ensureCombatCycle(m);
  c.phase='enemies';c.enemyTurn=0;c.heroTurn=0;c.round=b.round;
}
function finishGlobalRound(m,b){
  b.phase='heroes';b.turn=0;b.round=Math.max(1,(b.round||1)+1);
  const c=ensureCombatCycle(m);
  c.phase='heroes';c.heroTurn=0;c.enemyTurn=0;c.round=b.round;
  processTimedRegen(m);
}
function missionProvisionEffect(m){return MEALS[m?.provision]?.effect||{}}
function applyMissionProvisionToHero(m,hero){
  const effect=missionProvisionEffect(m),oldMax=Math.max(1,hero.maxHp||1),ratio=clamp((hero.hp||0)/oldMax,0,1);
  hero.maxHp=Math.round(oldMax*(1+(effect.maxHp||0)));hero.hp=Math.round(hero.maxHp*ratio);
  hero.attackSpeed+=(effect.attackSpeed||0);
  hero.def=Math.round(hero.def*(1+(effect.defense||0)));
  hero.mdef=Math.round(hero.mdef*(1+(effect.mdef||0)));
  hero.block+=(effect.block||0);
  hero.damageMult*=1+(effect.damage||0);
  hero.healMult*=1+(effect.healing||0);
  Object.entries(effect.resist||{}).forEach(([key,value])=>{if(key in hero)hero[key]+=value});
  return hero;
}
function applyProvisionRecovery(m){
  const effect=missionProvisionEffect(m);if(!effect.betweenHp&&!effect.betweenMana)return;
  Object.values(m.partyState||{}).forEach(ps=>{
    if(ps.hp>0&&effect.betweenHp)ps.hp=Math.min(ps.maxHp,ps.hp+Math.round(ps.maxHp*effect.betweenHp));
    if(ps.hp>0&&effect.betweenMana)ps.mana=Math.min(ps.maxMana,ps.mana+Math.round(ps.maxMana*effect.betweenMana));
  });
}
function makeBattle(m){
  ensurePartyState(m);
  const areaFinal=isStagedExpedition(m)&&expeditionEncounterCount(m)===EXPEDITION_MAX_ENCOUNTERS-1;
  const count=encounterEnemyCount(m,areaFinal),encounterLevel=missionEncounterLevel(m);currentMissionForEnemy=m;
  const heroes=m.party.map(hid=>{
    const h=s.members.find(x=>x.id===hid),z=hs(h),ps=m.partyState[hid];
    const mainId=h.equip.MainHand||h.equip.Weapon,wep=s.inventory.find(x=>x.id===mainId);
    const off=s.inventory.find(x=>x.id===h.equip.OffHand&&x.id!==mainId&&x.slot==='Weapon');
    const wd=weaponDefForItem(wep)||((wep&&WEAPONS[wep.weaponType])?WEAPONS[wep.weaponType]:null);
    const baseAttackTime=weaponAttackTime(wep?.weaponTemplate||wep?.weaponType||'');
    const previewUnit={baseAttackTime,attackSpeed:z.attackSpeed,buffs:{}};
    const initialInterval=heroAttackIntervalMs(previewUnit);
    const now=Date.now();
    const nextAttackAt=Number.isFinite(ps?.nextAttackAt)?ps.nextAttackAt:now+initialInterval;
    const attackStartedAt=Number.isFinite(ps?.attackStartedAt)?ps.attackStartedAt:now;
    return{
      id:h.id,name:h.name,class:h.class,displayClass:displayClass(h),subclass:h.subclass||null,level:h.level,maxHp:z.hp,
      hp:Math.min(z.hp,Math.max(0,ps?ps.hp:z.hp)),
      mana:Math.min(z.mana,Math.max(0,ps?.mana??z.mana)),maxMana:z.mana,manaRegen:z.manaRegen,
      cooldowns:Object.assign({},ps?.cooldowns||{}),buffs:activePersistentBuffs(ps?.buffs,now),statuses:activePersistentStatuses(ps?.statuses,now),baseAttackTime,attackSpeed:z.attackSpeed,nextAttackAt,attackStartedAt,
      str:z.str,dex:z.dex,int:z.int,def:z.def,mdef:z.mdef,block:z.block||0,threat:z.threat||1,physicalDodge:z.physicalDodge,magicalDodge:z.magicalDodge,
      regen:z.regen||0,lifesteal:z.lifesteal||0,damageMult:z.damageMult||1,healMult:z.healMult||1,critBonus:z.critBonus||0,element:z.element||null,elementMult:z.elementMult||1,activeType:z.activeType||null,
      fire:z.fire||0,ice:z.ice||0,poison:z.poison||0,lightning:z.lightning||0,holy:z.holy||0,dark:z.dark||0,
      weaponType:wep?.weaponType||null,twoHanded:weaponHands(wep)===2,discipline:h.discipline||null,passiveEvolution:h.passiveEvolution||null,activeEvolution:h.activeEvolution||null,disciplineCooldownReduction:z.disciplineCooldownReduction||0,
      scale:wep?.scale||({Mage:'int',Priest:'int',Ranger:'dex',Rogue:'dex'}[h.class]||'str'),
      damageType:wep?.damageType||'physical',
      weaponPower:wep?.weaponPower||(wd?.base||8),
      offhandWeapon:off?{weaponType:off.weaponType,scale:off.scale||'dex',damageType:off.damageType||'physical',weaponPower:off.weaponPower||8,baseAttackTime:weaponAttackTime(off.weaponTemplate||off.weaponType||'')}:null,
      dualWield:!!off,
      armorPen:z.armorPen||0,parry:z.parry||0,critDamage:z.critDamage||0,accuracy:z.accuracy||0,
      elementalDamage:z.elementalDamage||0,statusChance:z.statusChance||0,cleave:z.cleave||0,
      counter:z.counter||0,damageVariance:z.damageVariance||0,execute:z.execute||0,uniqueDamageReduction:z.uniqueDamageReduction||0,uniqueCooldownReduction:z.uniqueCooldownReduction||0,uniqueOnHit:z.uniqueOnHit||null
    };
  });
  let partyDamage=0,partyDefense=0,partyMdef=0;
  m.party.forEach(hid=>{
    const original=s.members.find(x=>x.id===hid),sub=evolvedSubclassDef(original);
    if(!sub)return;
    partyDamage+=sub.partyDamage||0;
    partyDefense+=sub.partyDefense||0;
    partyMdef+=sub.partyMdef||0;
  });
  heroes.forEach(x=>{
    x.partyDamageMult=1+partyDamage;
    x.def=Math.round(x.def*(1+partyDefense));
    x.mdef=Math.round(x.mdef*(1+partyDefense+partyMdef));
    applyMissionProvisionToHero(m,x);
  });
  assignPartyFormation(heroes);
  const cycle=ensureCombatCycle(m);
  const battle={
    id:++m.battleNumber,
    resolved:false,actionSeq:0,
    kind:'normal',
    encounterNumber:m.maxFights?(Math.max(0,m.finiteStage||0)+1):null,
    heroes,
    enemies:Array.from({length:count},(_,i)=>({...makeEnemy(m.type,encounterLevel,i),statuses:{},cast:null})),
    phase:cycle.phase,
    turn:cycle.phase==='heroes'?cycle.heroTurn:cycle.enemyTurn,
    round:cycle.round,
    log:[`Battle #${m.battleNumber}: a new enemy group approaches.`]
  };
  if(areaFinal&&battle.enemies[0]){
    const champion=battle.enemies[0],originalName=champion.name;
    champion.templateName=originalName;champion.name=`${m.name} Champion`;champion.boss=true;champion.maxHp=Math.round(champion.maxHp*3.2);champion.hp=champion.maxHp;champion.atk=Math.round(champion.atk*1.45);champion.def=Math.round(champion.def*1.25);champion.mdef=Math.round(champion.mdef*1.25);battle.kind='areaBoss';battle.areaBoss=true;battle.log=[`Final encounter: the ${m.name} Champion blocks the road home.`];
  }
  ensureCombatReport(m);heroes.forEach(h=>heroReport(m,h.id));
  // A changed party/save can leave a cursor beyond the available actor list.
  if(battle.phase==='heroes'&&battle.turn>=battle.heroes.length){
    battle.phase='enemies';battle.turn=0;
    cycle.phase='enemies';cycle.heroTurn=0;cycle.enemyTurn=0;
  }
  if(battle.phase==='enemies'&&battle.turn>=battle.enemies.length){
    battle.phase='heroes';battle.turn=0;battle.round++;
    cycle.phase='heroes';cycle.heroTurn=0;cycle.enemyTurn=0;cycle.round=battle.round;
  }
  return battle;
}
function assignPartyFormation(heroes){
  const livingHeroes=(heroes||[]).filter(Boolean);
  if(!livingHeroes.length)return heroes;
  const frontSlots=Math.max(1,Math.ceil(livingHeroes.length*.4));
  const ranked=[...livingHeroes].sort((a,b)=>{
    const durable=x=>(['Warrior','Paladin'].includes(x.class)?2:0)+(x.threat||1)+(x.def||0)/250+(x.block||0)/20;
    return durable(b)-durable(a);
  });
  const frontIds=new Set(ranked.slice(0,frontSlots).map(x=>x.id));
  livingHeroes.forEach(h=>h.row=frontIds.has(h.id)?'front':'back');
  return heroes;
}
function syncPartyHp(m){
  if(!m.battle)return;
  ensurePartyState(m);
  m.battle.heroes.forEach(h=>{
    if(m.partyState[h.id]){
      m.partyState[h.id].hp=Math.max(0,h.hp);
      m.partyState[h.id].maxHp=h.maxHp;
      m.partyState[h.id].mana=Math.max(0,h.mana||0);
      m.partyState[h.id].maxMana=h.maxMana||(20+intelligenceManaBonus(h.int||0));
      m.partyState[h.id].cooldowns=Object.assign({},h.cooldowns||{});
      m.partyState[h.id].buffs=activePersistentBuffs(h.buffs);
      m.partyState[h.id].statuses=activePersistentStatuses(h.statuses);
      m.partyState[h.id].nextAttackAt=h.nextAttackAt;
      m.partyState[h.id].attackStartedAt=h.attackStartedAt;
    }
  });
}
function emptyStash(){return{gold:0,rep:0,materials:{},items:[]}}
const EXPEDITION_STAGE_SIZE=5,EXPEDITION_STAGE_COUNT=5,EXPEDITION_MAX_ENCOUNTERS=25,EXPEDITION_INTERMISSION_MS=5000;
function isStagedExpedition(m){return m?.type==='quest'&&!m.bossGate}
function expeditionEncounterCount(m){return Math.max(0,Math.min(EXPEDITION_MAX_ENCOUNTERS,m?.finiteStage||0))}
function expeditionStage(m){return Math.min(EXPEDITION_STAGE_COUNT,Math.floor(expeditionEncounterCount(m)/EXPEDITION_STAGE_SIZE)+1)}
function missionEncounterLevel(m){return isStagedExpedition(m)?(m.level||1)+Math.min(EXPEDITION_STAGE_COUNT-1,Math.floor(expeditionEncounterCount(m)/EXPEDITION_STAGE_SIZE)):(m.level||1)}
function missionLocationKey(type,q){
  if(!q)return '';
  return `${type}:${q.areaId||q.name||q.id}`;
}
function missionLocationOccupied(type,q){
  const key=missionLocationKey(type,q);
  return !!key&&s.missions.some(m=>missionLocationKey(m.type,m)===key);
}
function harvestLocationOccupied(areaId){
  return s.harvestJobs.some(j=>j.areaId===areaId&&!j.stopped);
}

function send(type,qid,ids,provision=null){
  let q=arr(type).find(x=>x.id===qid);
  if(!q||!ids.length)return notify('Choose at least one guild member.');
  if(missionLocationOccupied(type,q))return notify('A party is already deployed to '+q.name+'.');
  let party=ids.slice(0,partySizeFor(type)).map(i=>s.members.find(x=>x.id===i)).filter(Boolean);
  if(party.some(h=>h.busy))return notify('One of those guild members is already on an expedition.');
  if(provision&&(!MEALS[provision]||(s.meals[provision]||0)<party.length))return notify(`That party needs ${party.length} servings of the selected meal.`);
  if(provision)s.meals[provision]-=party.length;
  party.forEach(h=>h.busy=true);
  const now=Date.now();
  const mission={
    ...q,id:id(),party:party.map(h=>h.id),provision:provision||null,start:now,lastSim:now,
    kills:0,fights:0,finiteStage:0,normalEncountersCompleted:0,goldEarned:0,repEarned:0,battle:null,
    stash:emptyStash(),partyState:{},combatCycle:{phase:'heroes',heroTurn:0,enemyTurn:0,round:1},nextRegenAt:now+5000,defeated:false,completed:false,bossDefeated:false,battleNumber:0,lastRewardedBattleId:null
  };
  if(type==='quest'&&!mission.bossGate){mission.maxFights=EXPEDITION_MAX_ENCOUNTERS;mission.finiteStage=0;mission.completedStages=0;mission.stageIntermission=null;mission.lastCheckpoint=0}
  ensurePartyState(mission);
  mission.battle=mission.bossGate?makeBossBattle(mission):makeBattle(mission);
  s.missions.push(mission);
  setOnboardingFlag('expeditionStarted');
  
  log('Expedition started: '+q.name+'.');
  save();render();notify('Expedition started.','good');
}
function pendingCount(m){
  return (m.stash?.items?.length||0)+Object.values(m.stash?.materials||{}).reduce((a,v)=>a+v,0);
}
function claimAllGathering(){
  const harvestable=s.harvestJobs.filter(j=>Object.values(j.stash||{}).some(v=>v>0));
  if(!harvestable.length)return notify('There are no gathered resources to claim.');

  const matBefore={...s.materials};
  harvestable.forEach(j=>collectHarvest(j.id,true));

  const parts=[];
  Object.keys(s.materials).forEach(k=>{const gained=(s.materials[k]||0)-(matBefore[k]||0);if(gained>0)parts.push(`${gained} ${RESOURCE_NAMES[k]||k}`)});

  render();
  notify(parts.length?'Claimed: '+parts.join(' · '):'Nothing could be collected — resource storage may be full.','good');
}
function claimAllMissionLoot(){return claimAllGathering()}
function depositMissionStash(m,reason='Mission rewards delivered'){
  if(!m?.stash)return{gold:0,rep:0,materials:0,items:0,text:'No rewards'};
  const delivered={gold:m.stash.gold||0,rep:m.stash.rep||0,materials:0,items:(m.stash.items||[]).length};
  s.gold+=delivered.gold;grantGuildReputation(delivered.rep);
  m.stash.gold=0;m.stash.rep=0;
  Object.entries(m.stash.materials||{}).forEach(([k,v])=>{const added=addStoredResource(k,v);delivered.materials+=added;m.stash.materials[k]=v-added;if(m.stash.materials[k]<=0)delete m.stash.materials[k]});
  (m.stash.items||[]).forEach(it=>receiveInventoryItem(it,'mission'));m.stash.items=[];
  const claimed=delivered.gold||delivered.rep||delivered.materials||delivered.items;
  if(claimed){s.onboarding.flags.lootClaimed=true;completeOnboardingGoals(true)}
  discoverRecipes();
  delivered.text=`${delivered.gold}g · ${delivered.rep} reputation · ${delivered.materials} resources · ${delivered.items} items`;
  log(`${reason}: ${delivered.text}.`);
  return delivered;
}
function collectLoot(mid,quiet=false){
  const m=s.missions.find(x=>x.id===mid);if(!m||!m.stash)return;
  const claimedAnything=(m.stash.gold||0)>0||(m.stash.rep||0)>0||pendingCount(m)>0;
  const delivered=depositMissionStash(m,'Party delivery');save();
  if(!quiet)notify('Collected '+delivered.text+'.','good');
  renderResourcesLite();renderInv();renderActive();renderCombat();
}
function heroXpNeeded(level){
  const n=Math.max(0,(level||1)-1);
  return Math.round(100+n*85+n*n*6);
}

function xpForEnemy(hero,encounterLevel,type){
  const typeMult=type==='raid'?1.65:type==='dungeon'?1.3:1;
  const diff=encounterLevel-hero.level;

  // Equal-level enemies are worthwhile. Content below the hero's level
  // falls off sharply, preventing trivial low-level farming.
  let levelMult;
  if(diff>=0)levelMult=Math.min(1.65,1+diff*.12);
  else levelMult=lowLevelRewardMultiplier(hero.level,encounterLevel);

  return Math.max(1,Math.round((3+encounterLevel*2.2)*typeMult*levelMult));
}

function grantFightRewards(m,enemySnapshots){
  (enemySnapshots||[]).forEach(e=>trackQuestProgress('kill',e.name,1));
  const defeated=(enemySnapshots||[]).slice();
  m.fights++;
  m.kills+=defeated.length;

  // Gold is rolled independently for every kill.
  // Higher-level encounters can drop larger amounts.
  defeated.forEach(enemy=>{
    const rewardLevel=enemy.level||missionEncounterLevel(m),base=Math.max(1,Math.floor(1+rewardLevel/8));
    const amount=rnd(base,Math.max(base,Math.ceil(base*1.6)));
    m.stash.gold+=Math.round(amount*5*(1+(s.up.board||0)*.05));
  });

  // Reputation is guaranteed after every completed fight and scales with the
  // number of enemies defeated and encounter difficulty.
  const rewardLevel=Math.max(missionEncounterLevel(m),...defeated.map(e=>e.level||0)),repPerEnemy=Math.max(1,Math.floor(1+rewardLevel/15))*50;
  const typeRep=m.type==='raid'?1.5:m.type==='dungeon'?1.25:1;
  const repMult=missionReputationMultiplier(m);
  if(repMult>0){
    m.stash.rep+=Math.round(defeated.length*repPerEnemy*typeRep*repMult*(1+(s.up.board||0)*.05));
  }

  // Roughly 70% material/equipment loot chance per killed enemy.
  // One enemy can still produce at most one loot item/resource roll.
  defeated.forEach(enemy=>{
    const lootChance=m.type==='raid'?.78:m.type==='dungeon'?.74:.70;
    const gearChance=m.type==='raid'?.018:m.type==='dungeon'?.009:.0025;
    if(Math.random()<gearChance){
      m.stash.items.push(item(pick(['Weapon','Armor','Ring','Amulet']),clamp(m.tier||1,1,10)));
      return;
    }

    const pool=(ENEMIES_DATA[enemy.templateName||enemy.name]?.drops)||[];
    if(pool.length){
      const k=pick(pool);
      if(k){m.stash.materials[k]=(m.stash.materials[k]||0)+1;markResourceFound(k);}
    }
  });

  const xpShareCount=Math.max(1,m.party.length);
  m.party.forEach(hid=>{
    const hero=s.members.find(x=>x.id===hid);if(!hero)return;

    const fullPartyXp=defeated.reduce((sum,enemy)=>sum+xpForEnemy(hero,enemy.level||missionEncounterLevel(m),m.type),0);
    const gained=Math.max(1,Math.round((fullPartyXp/xpShareCount)*2*(1+(s.up.training||0)*.10)*(1+(hero.personalXpBonus||0))));
    hero.xp+=gained;

    let need=heroXpNeeded(hero.level),levelsGained=0;
    while(hero.xp>=need){
      hero.xp-=need;
      hero.level++;
      syncNaturalHeroBonus(hero);
      levelsGained++;

      need=heroXpNeeded(hero.level);
    }
    if(levelsGained){
      addGuildActivity(levelsGained,'character levels');
      const row=heroReport(m,hero.id);row.levelsGained=(row.levelsGained||0)+levelsGained;row.lastLevel=hero.level;
      const combatHero=m.battle?.heroes?.find(x=>x.id===hero.id);if(combatHero){combatHero.level=hero.level;combatHero.levelUpUntil=Date.now()+1800;combatHero.levelUpText=`LEVEL ${hero.level}`}
      m.battle?.log?.unshift(`${hero.name} reached level ${hero.level}!`);
    }
  });

}

function resolveLiveBattleOnce(m){
  const b=m.battle;
  if(!b)return false;
  if(m.lastRewardedBattleId===b.id||b.resolved)return false;

  b.resolved=true;
  m.lastRewardedBattleId=b.id;
  grantFightRewards(m,b.enemies.map(e=>({name:e.name})));
  return true;
}
function living(a){return a.filter(x=>x.hp>0)}
function ensureCombatReport(m){
  if(!m.combatReport||typeof m.combatReport!=='object')m.combatReport={startedAt:m.start||Date.now(),heroes:{},deaths:[],encounters:0};
  if(!m.combatReport.heroes||typeof m.combatReport.heroes!=='object')m.combatReport.heroes={};
  if(!Array.isArray(m.combatReport.deaths))m.combatReport.deaths=[];
  return m.combatReport;
}
function heroReport(m,id){
  const report=ensureCombatReport(m),member=s.members.find(h=>h.id===id),key=String(id);
  if(!report.heroes[key])report.heroes[key]={id,name:member?.name||'Unknown',damage:0,statusDamage:0,healing:0,damageTaken:0,interrupts:0,cleanses:0,statusesApplied:0,criticalHits:0,abilityUses:0,deaths:0,levelsGained:0,lastLevel:null};
  if(member)report.heroes[key].name=member.name;
  return report.heroes[key];
}
function addHeroMetric(m,id,key,amount=1){
  if(id==null||!Number.isFinite(amount))return;
  const row=heroReport(m,id);row[key]=(row[key]||0)+amount;
}
function recordHeroDamageTaken(m,target,amount){
  if(!target||amount<=0)return;
  addHeroMetric(m,target.id,'damageTaken',amount);
  if(target.hp<=0){
    const report=ensureCombatReport(m),already=report.deaths.some(x=>x.battleId===m.battle.id&&x.id===target.id);
    if(!already){report.deaths.push({id:target.id,name:target.name,battleId:m.battle.id,order:report.deaths.length+1});addHeroMetric(m,target.id,'deaths',1)}
  }
}
function applyUniqueDamageReduction(target,damage){return Math.max(0,Math.round(damage*(1-clamp(target?.uniqueDamageReduction||0,0,.60))))}
const STATUS_EFFECTS={
  bleed:{name:'Bleeding',icon:'🩸',damageType:'physical',maxStacks:3},
  burning:{name:'Burning',icon:'🔥',damageType:'fire',maxStacks:3},
  poison:{name:'Poisoned',icon:'☠',damageType:'poison',maxStacks:3},
  frostbite:{name:'Frostbite',icon:'❄',damageType:'ice',maxStacks:3},
  shocked:{name:'Shocked',icon:'⚡',damageType:'lightning',maxStacks:3},
  cursed:{name:'Cursed',icon:'◉',damageType:'dark',maxStacks:3}
};
function ensureStatuses(unit){
  if(!unit.statuses||typeof unit.statuses!=='object')unit.statuses={};
  return unit.statuses;
}
function applyStatus(m,target,type,{power=1,duration=6000,stacks=1,source='Unknown',sourceId=null}={}){
  const def=STATUS_EFFECTS[type];if(!def||!target||target.hp<=0)return false;
  const now=Date.now(),statuses=ensureStatuses(target),current=statuses[type];
  if(current){
    current.stacks=Math.min(def.maxStacks,current.stacks+stacks);
    current.power=Math.max(current.power,power);
    current.expiresAt=Math.max(current.expiresAt,now+duration);
    current.source=source;
    if(sourceId!=null)current.sourceId=sourceId;
  }else statuses[type]={type,stacks:Math.min(def.maxStacks,stacks),power:Math.max(1,Math.round(power)),source,sourceId,startedAt:now,duration,nextTickAt:now+2000,expiresAt:now+duration};
  if(sourceId!=null&&m.battle.enemies.includes(target))addHeroMetric(m,sourceId,'statusesApplied',1);
  if(m.battle.heroes.includes(target)){
    m.mechanicsSeen=Array.isArray(m.mechanicsSeen)?m.mechanicsSeen:[];
    if(!m.mechanicsSeen.includes(type))m.mechanicsSeen.push(type);
  }
  m.battle.log.unshift(`${def.icon} ${target.name.split(' ')[0]} is ${def.name.toLowerCase()}${statuses[type].stacks>1?` (${statuses[type].stacks} stacks)`:''}.`);
  return true;
}
function cleanseStatuses(m,target,count=Infinity,label='Cleanse',sourceId=null){
  const statuses=ensureStatuses(target),keys=Object.keys(statuses).slice(0,count);
  if(!keys.length)return 0;
  keys.forEach(k=>delete statuses[k]);
  if(sourceId!=null)addHeroMetric(m,sourceId,'cleanses',keys.length);
  m.battle.log.unshift(`✨ ${label} removes ${keys.map(k=>STATUS_EFFECTS[k]?.name||k).join(', ')} from ${target.name.split(' ')[0]}.`);
  return keys.length;
}
function processStatusEffects(m,now=Date.now()){
  const b=m.battle;if(!b)return;
  [...b.heroes,...b.enemies].forEach(unit=>{
    const statuses=ensureStatuses(unit);
    Object.entries(statuses).forEach(([type,status])=>{
      const def=STATUS_EFFECTS[type];if(!def){delete statuses[type];return}
      while(unit.hp>0&&now>=status.nextTickAt&&status.nextTickAt<=status.expiresAt){
        const damage=Math.max(1,Math.round(status.power*status.stacks));
        unit.hp=Math.max(0,unit.hp-damage);
        if(b.enemies.includes(unit)&&status.sourceId!=null)addHeroMetric(m,status.sourceId,'statusDamage',damage);
        if(b.heroes.includes(unit))recordHeroDamageTaken(m,unit,damage);
        b.log.unshift(`${def.icon} ${def.name} deals ${damage} damage to ${unit.name.split(' ')[0]}.`);
        status.nextTickAt+=2000;b.actionSeq=(b.actionSeq||0)+1;
      }
      if(now>=status.expiresAt||unit.hp<=0)delete statuses[type];
    });
  });
  b.log=b.log.slice(0,45);syncPartyHp(m);
}
function statusForDamageType(type){return({physical:'bleed',fire:'burning',poison:'poison',ice:'frostbite',lightning:'shocked',dark:'cursed'})[type]||null}
function interruptEnemy(m,enemy,source,sourceId=null){
  if(!enemy?.cast)return false;
  const ability=ENEMY_ABILITIES_DATA[enemy.cast.abilityId];
  enemy.cast=null;enemy.abilityReadyAt=Date.now()+3000;
  if(sourceId!=null)addHeroMetric(m,sourceId,'interrupts',1);
  m.battle.log.unshift(`✦ ${source} interrupts ${enemy.name}'s ${ability?.name||'ability'}!`);
  return true;
}
function elementalReduction(res){return clamp(1-(res||0)/100,.2,2)}
function defenseReduction(defense){
  const d=Math.max(0,defense||0);
  const hybrid=.15*(d/300)+.85*(d/(d+160));
  return clamp(hybrid,0,.95);
}
function mitigatedDamage(raw,defense,block=0,armorPen=0){
  const pen=clamp(armorPen||0,0,.75);
  const effectiveBlock=Math.max(0,(block||0)*(1-pen));
  const effectiveDefense=Math.max(0,(defense||0)*(1-pen));
  const afterBlock=Math.max(0,(raw||0)-effectiveBlock);
  if(afterBlock<=0)return 0;
  return Math.max(1,Math.round(afterBlock*(1-defenseReduction(effectiveDefense))));
}
function heroDamage(h,target,forcedElement=null){
  const stat=scalingStatValue(h);
  const base=h.weaponPower*.34+stat*.36;
  const element=forcedElement||h.damageType;
  const buffMult=h.buffs?.battleShout>Date.now()?1.20:1;
  const mult=(h.damageMult||1)*(h.partyDamageMult||1)*buffMult*((h.element&&element===h.element)?(h.elementMult||1):1);
  const variance=Math.max(0,h.damageVariance||0);
  const roll=(.70+Math.random()*.16)*(1-variance+Math.random()*variance*2);
  let synergy=1;
  const statuses=target?.statuses||{};
  if(h.subclass==='venomblade'&&statuses.poison)synergy+=.08*Math.min(3,statuses.poison.stacks||1);
  if(h.subclass==='marksman'&&statuses.frostbite)synergy+=.18;
  const raw=base*roll*mult*synergy*(h.twoHanded?2:1)*(element==='physical'?1:(1+(h.elementalDamage||0)));

  const protectionMult=(1-clamp(target.protection||0,0,.6))*(target.buffs?.shieldFaith>Date.now()?.70:1);
  if(element==='physical')return Math.max(1,Math.round(mitigatedDamage(raw,target.def,target.block||0,h.armorPen||0)*protectionMult));

  const afterDefense=mitigatedDamage(raw,target.mdef,target.block||0,h.armorPen||0);
  return Math.max(0,Math.round(afterDefense*elementalReduction(target[element])*protectionMult));
}


function lowestAlly(b){
  return living(b.heroes).sort((a,z)=>a.hp/a.maxHp-z.hp/z.maxHp)[0]||null;
}
const ACTIVE_MANA_COSTS={};
const ACTIVE_COOLDOWNS={};
const ACTIVE_DISPLAY_NAMES={};
const COMBAT_BUFF_DURATIONS={battleShout:12000,shieldFaith:10000};
function manaCost(type){return ACTIVE_MANA_COSTS[type]||0}
function activeCooldownMs(type,h=null){const reduction=1-clamp((s?.guildBonuses?.cooldownReduction||0)+(h?.uniqueCooldownReduction||0)+(h?.disciplineCooldownReduction||0)+(h?.activeEvolution==='tempo'?.20:0),0,.70);return Math.max(1000,Math.round((ACTIVE_COOLDOWNS[type]||10000)*reduction))}
function activePowerMultiplier(h){return h?.activeEvolution==='power'?1.25:1}
function activeName(type){return ACTIVE_DISPLAY_NAMES[type]||type||'Active'}
function canSpendMana(h,type){return (h.mana||0)>=manaCost(type)}
function spendMana(h,type){
  const cost=manaCost(type);
  if(cost<=0)return true;
  if((h.mana||0)<cost)return false;
  h.mana=Math.max(0,h.mana-cost);
  return true;
}
function ensureCooldownMap(h){
  if(!h.cooldowns||typeof h.cooldowns!=='object')h.cooldowns={};
  return h.cooldowns;
}
function activeReady(h,type,now=Date.now()){
  return (ensureCooldownMap(h)[type]||0)<=now;
}
function startActiveCooldown(h,type,now=Date.now()){
  ensureCooldownMap(h)[type]=now+activeCooldownMs(type,h);
}
function activeCooldownRemaining(h,type,now=Date.now()){
  return Math.max(0,(ensureCooldownMap(h)[type]||0)-now);
}
function primaryActiveType(h){
  if(h.activeType)return h.activeType;
  if(h.class==='Priest')return 'Heal';
  if(h.class==='Mage')return 'arcaneBurst';
  return null;
}
function cooldownProgress(h,type,now=Date.now()){
  if(!type)return 1;
  const remaining=activeCooldownRemaining(h,type,now);
  const total=activeCooldownMs(type,h);
  return clamp(1-remaining/Math.max(1,total),0,1);
}
function healAlly(m,h,ally,mult=1,label='Heal'){
  if(!ally)return false;
  const heal=Math.max(2,Math.round((h.int*.38+h.weaponPower*.12)*(h.healMult||1)*mult*activePowerMultiplier(h)*2));
  const before=ally.hp;
  ally.hp=Math.min(ally.maxHp,ally.hp+heal);
  const effective=Math.max(0,ally.hp-before);
  addHeroMetric(m,h.id,'healing',effective);
  m.battle.log.unshift(`${h.name.split(' ')[0]} uses ${label} on ${ally.name.split(' ')[0]} for ${effective}.`);
  syncPartyHp(m);
  return true;
}
function heroBasicAttack(m,h){
  const b=m.battle;if(!living(b.enemies).length||h.hp<=0)return false;
  const weapons=[{weaponType:h.weaponType,scale:h.scale,damageType:h.damageType,weaponPower:h.weaponPower},...(h.dualWield&&h.offhandWeapon?[h.offhandWeapon]:[])];
  weapons.forEach((weapon,index)=>{
    const targets=living(b.enemies);if(!targets.length)return;
    const target=pick(targets),attacker={...h,...weapon};
    let dmg=heroDamage(attacker,target),text=index?'Off-hand: ':'';
    let critChance=(h.class==='Rogue'?.18:0)+(h.critBonus||0);
    if(h.class==='Ranger')critChance+=(h.critBonus||0);
    if(critChance>0&&Math.random()<critChance){dmg=Math.round(dmg*(1.35+(h.critDamage||0)));text+='Critical! ';addHeroMetric(m,h.id,'criticalHits',1)}
    if((h.execute||0)>0&&target.hp/target.maxHp<=.30){dmg=Math.round(dmg*(1+h.execute));text+='Execute! '}
    const targetBefore=target.hp;target.hp=Math.max(0,target.hp-dmg);addHeroMetric(m,h.id,'damage',Math.min(targetBefore,dmg));
    if((h.cleave||0)>0){
      const secondary=targets.find(t=>t.id!==target.id&&t.hp>0);
      if(secondary){const splash=Math.max(1,Math.round(dmg*h.cleave)),before=secondary.hp;secondary.hp=Math.max(0,secondary.hp-splash);addHeroMetric(m,h.id,'damage',Math.min(before,splash));text+=`Cleave hits ${secondary.name} for ${splash}. `}
    }
    const basicStatus=statusForDamageType(attacker.damageType);
    if(basicStatus&&(h.statusChance||0)>0&&Math.random()<h.statusChance){applyStatus(m,target,basicStatus,{power:Math.max(1,dmg*.16),duration:6000,source:h.name,sourceId:h.id});text+=`${STATUS_EFFECTS[basicStatus].name} applied. `}
    if(h.uniqueOnHit){applyStatus(m,target,h.uniqueOnHit,{power:Math.max(1,dmg*.20),duration:10000,source:h.name,sourceId:h.id});text+=`${STATUS_EFFECTS[h.uniqueOnHit]?.name||h.uniqueOnHit} applied. `}
    text+=`${h.name.split(' ')[0]} uses ${attacker.weaponType||'unarmed attack'} for ${dmg} ${elementIcon[attacker.damageType]} ${attacker.damageType} damage.`;
    if(h.lifesteal>0){const heal=Math.max(1,Math.floor(dmg*h.lifesteal/100));h.hp=Math.min(h.maxHp,h.hp+heal);text+=` Lifesteal restores ${heal} HP.`}
    b.log.unshift(text);
  });
  b.log=b.log.slice(0,45);
  syncPartyHp(m);
  return true;
}
function activeDamageHit(m,h,target,mult,label,element=null){
  if(!target||target.hp<=0)return false;
  const dmg=applyUniqueDamageReduction(target,Math.max(1,Math.round(heroDamage(h,target,element)*mult*activePowerMultiplier(h))));
  const before=target.hp;
  target.hp=Math.max(0,target.hp-dmg);
  addHeroMetric(m,h.id,'damage',Math.min(before,dmg));
  m.battle.log.unshift(`${h.name.split(' ')[0]} uses ${label} for ${dmg} ${elementIcon[element||h.damageType]||''} ${element||h.damageType} damage.`);
  return true;
}
function tryActiveSkill(m,h,now=Date.now()){
  if(!h||h.hp<=0)return false;
  const b=m.battle,type=primaryActiveType(h);
  if(!type||!activeReady(h,type,now)||!canSpendMana(h,type))return false;
  const targets=living(b.enemies);
  if(!targets.length)return false;
  const castingTarget=targets.find(t=>t.cast);
  const interruptTypes=new Set(['shieldSlam','preciseShot','backstab']);
  const enemiesCanCast=targets.some(t=>t.ability);
  // Dedicated interrupt attacks are held when a caster is present. Without
  // this reservation they fire for damage at battle start and are on cooldown
  // for the entire cast window.
  if(interruptTypes.has(type)&&enemiesCanCast&&!castingTarget)return false;
  if(type==='elementNova'&&h.subclass==='stormcaller'&&enemiesCanCast&&!castingTarget)return false;
  const ally=lowestAlly(b);
  const afflicted=living(b.heroes).filter(x=>Object.keys(ensureStatuses(x)).length).sort((a,z)=>a.hp/a.maxHp-z.hp/z.maxHp)[0]||null;
  let used=false;

  if(type==='greaterHeal'){
    const target=afflicted||ally;if(target&&(afflicted||target.hp<target.maxHp*.82)){used=healAlly(m,h,target,1.65,'Greater Heal');cleanseStatuses(m,target,Infinity,'Greater Heal',h.id)}
  }else if(type==='renew'){
    const target=afflicted||ally;if(target&&(afflicted||target.hp<target.maxHp*.88)){used=healAlly(m,h,target,.85,'Renew');cleanseStatuses(m,target,1,'Renew',h.id)}
  }else if(type==='Heal'){
    if(ally&&ally.hp<ally.maxHp*.70){used=healAlly(m,h,ally,1,'Heal')}
  }else if(type==='radiantAid'){
    const target=afflicted||ally;if(target&&(afflicted||target.hp<target.maxHp*.90)){used=healAlly(m,h,target,.75,'Radiant Aid');cleanseStatuses(m,target,1,'Radiant Aid',h.id)}
  }else if(type==='elementNova'){
    const elem=h.element||'fire';
    const hits=targets.map(t=>{
      const dmg=Math.max(1,Math.round(heroDamage(h,t,elem)*1.44*activePowerMultiplier(h)));
      const before=t.hp;
      t.hp=Math.max(0,t.hp-dmg);
      addHeroMetric(m,h.id,'damage',Math.min(before,dmg));
      const status=statusForDamageType(elem);
      if(status&&['pyromancer','venomancer'].includes(h.subclass))applyStatus(m,t,status,{power:dmg*.14,duration:8000,source:h.name,sourceId:h.id});
      return `${t.name} ${dmg}`;
    });
    if(h.subclass==='stormcaller')targets.forEach(t=>interruptEnemy(m,t,h.name.split(' ')[0]+'\'s Storm Nova',h.id));
    b.log.unshift(`${h.name.split(' ')[0]} casts ${elementIcon[elem]} ${subclassDef(s.members.find(x=>x.id===h.id))?.name||'Elemental'} Nova: ${hits.join(' · ')}.`);
    used=true;
  }else if(type==='arcaneBurst'){
    const elem=h.damageType==='physical'?'fire':h.damageType;
    const hits=targets.map(t=>{
      const dmg=Math.max(1,Math.round(((h.int*.24+h.weaponPower*.16-t.mdef*.42)*elementalReduction(t[elem]))*2*activePowerMultiplier(h)));
      const before=t.hp;
      t.hp=Math.max(0,t.hp-dmg);
      addHeroMetric(m,h.id,'damage',Math.min(before,dmg));
      return `${t.name} ${dmg}`;
    });
    b.log.unshift(`${h.name.split(' ')[0]} casts ${elementIcon[elem]} Arcane Burst: ${hits.join(' · ')}.`);
    used=true;
  }else if(type==='commandStrike'){
    living(b.heroes).forEach(x=>{
      if(!x.buffs)x.buffs={};
      x.buffs.battleShout=now+COMBAT_BUFF_DURATIONS.battleShout*activePowerMultiplier(h);
    });
    b.log.unshift(`${h.name.split(' ')[0]} uses Battle Shout! Party damage and Attack Speed increased for 12 seconds.`);
    targets.forEach(t=>interruptEnemy(m,t,h.name.split(' ')[0]+'\'s Battle Shout',h.id));
    used=true;
  }else if(type==='shieldFaith'){
    if(!h.buffs)h.buffs={};
    h.buffs.shieldFaith=now+COMBAT_BUFF_DURATIONS.shieldFaith*activePowerMultiplier(h);
    b.log.unshift(`${h.name.split(' ')[0]} uses Shield of Faith! Damage taken reduced for 10 seconds.`);
    used=true;
  }else{
    const target=(['shieldSlam','preciseShot','backstab'].includes(type)&&castingTarget)?castingTarget:pick(targets);
    if(type==='powerStrike'){used=activeDamageHit(m,h,target,2.0,'Power Strike');if(used)applyStatus(m,target,'bleed',{power:heroDamage(h,target)*.15,duration:6000,source:h.name,sourceId:h.id})}
    else if(type==='shieldSlam'){used=activeDamageHit(m,h,target,1.70,'Shield Slam');if(used)interruptEnemy(m,target,h.name.split(' ')[0]+'\'s Shield Slam',h.id)}
    else if(type==='preciseShot'){used=activeDamageHit(m,h,target,2.20,'Precise Shot');if(used)interruptEnemy(m,target,h.name.split(' ')[0]+'\'s Precise Shot',h.id)}
    else if(type==='wardenShot')used=activeDamageHit(m,h,target,1.50,'Warden Shot');
    else if(type==='backstab'){used=activeDamageHit(m,h,target,2.40,'Backstab');if(used){interruptEnemy(m,target,h.name.split(' ')[0]+'\'s Backstab',h.id);applyStatus(m,target,'bleed',{power:heroDamage(h,target)*.18,duration:8000,source:h.name,sourceId:h.id})}}
    else if(type==='envenom'){used=activeDamageHit(m,h,target,1.90,'Envenom','poison');if(used)applyStatus(m,target,'poison',{power:heroDamage(h,target,'poison')*.18,duration:10000,source:h.name,sourceId:h.id})}
    else if(type==='smite')used=activeDamageHit(m,h,target,2.10,'Smite','holy');
    else if(type==='holyStrike')used=activeDamageHit(m,h,target,2.10,'Holy Strike','holy');
    else if(type==='companionStrike')used=activeDamageHit(m,h,target,1.10,'Companion Strike');
    else if(type==='flurry'){
      const d1=Math.max(1,Math.round(heroDamage(h,target)*1.40*activePowerMultiplier(h)));
      const d2=Math.max(1,Math.round(heroDamage(h,target)*1.40*activePowerMultiplier(h)));
      const before=target.hp;
      target.hp=Math.max(0,target.hp-d1-d2);
      addHeroMetric(m,h.id,'damage',Math.min(before,d1+d2));
      b.log.unshift(`${h.name.split(' ')[0]} uses Flurry for ${d1} + ${d2} damage.`);
      used=true;
    }
  }

  if(used){
    addHeroMetric(m,h.id,'abilityUses',1);
    spendMana(h,type);
    startActiveCooldown(h,type,now);
    b.actionSeq=(b.actionSeq||0)+1;
    b.log=b.log.slice(0,45);
    syncPartyHp(m);
  }
  return used;
}
function arenaDefenderDamage(m,h,target,mult,label,element=null){
  if(!target||target.hp<=0)return false;
  const type=element||h.damageType||'physical';
  const dmg=applyUniqueDamageReduction(target,Math.max(1,Math.round(heroDamage(h,target,element)*mult*activePowerMultiplier(h))));
  const before=target.hp;target.hp=Math.max(0,target.hp-dmg);recordHeroDamageTaken(m,target,Math.min(before,dmg));
  m.battle.log.unshift(`${h.name.split(' ')[0]} uses ${label} for ${dmg} ${elementIcon[type]||''} ${type} damage.`);
  return true;
}
function tryArenaDefenderActive(m,h,now=Date.now()){
  if(!h?.arenaHero||h.hp<=0)return false;
  const b=m.battle,type=primaryActiveType(h),targets=living(b.heroes),allies=living(b.enemies);
  if(!type||!targets.length||!activeReady(h,type,now)||!canSpendMana(h,type))return false;
  let used=false;
  const healTypes={Heal:1,greaterHeal:1.65,renew:.85,radiantAid:.75};
  if(healTypes[type]){
    const ally=[...allies].sort((a,z)=>a.hp/a.maxHp-z.hp/z.maxHp)[0];
    const threshold=type==='greaterHeal'?.82:type==='renew'?.88:type==='radiantAid'?.90:.70;
    if(ally&&ally.hp<ally.maxHp*threshold){
      const amount=Math.max(2,Math.round(((h.int||1)*.38+(h.weaponPower||8)*.12)*(h.healMult||1)*healTypes[type]*activePowerMultiplier(h)*2));
      const before=ally.hp;ally.hp=Math.min(ally.maxHp,ally.hp+amount);
      b.log.unshift(`${h.name.split(' ')[0]} uses ${activeName(type)} on ${ally.name.split(' ')[0]} for ${ally.hp-before}.`);used=true;
    }
  }else if(type==='elementNova'||type==='arcaneBurst'){
    const element=type==='elementNova'?(h.element||'fire'):(h.damageType==='physical'?'fire':h.damageType);
    const mult=type==='elementNova'?1.44:1.35;
    targets.forEach(target=>arenaDefenderDamage(m,h,target,mult,activeName(type),element));used=true;
  }else if(type==='commandStrike'){
    allies.forEach(ally=>{ally.buffs=ally.buffs||{};ally.buffs.battleShout=now+COMBAT_BUFF_DURATIONS.battleShout*activePowerMultiplier(h)});
    b.log.unshift(`${h.name.split(' ')[0]} uses Battle Shout on the defending party.`);used=true;
  }else if(type==='shieldFaith'){
    h.buffs=h.buffs||{};h.buffs.shieldFaith=now+COMBAT_BUFF_DURATIONS.shieldFaith*activePowerMultiplier(h);
    b.log.unshift(`${h.name.split(' ')[0]} uses Shield of Faith.`);used=true;
  }else{
    const target=pick(targets),definition={powerStrike:[2,'Power Strike'],shieldSlam:[1.7,'Shield Slam'],preciseShot:[2.2,'Precise Shot'],wardenShot:[1.5,'Warden Shot'],backstab:[2.4,'Backstab'],envenom:[1.9,'Envenom','poison'],smite:[2.1,'Smite','holy'],holyStrike:[2.1,'Holy Strike','holy'],companionStrike:[1.1,'Companion Strike'],flurry:[2.8,'Flurry']}[type];
    if(definition){used=arenaDefenderDamage(m,h,target,definition[0],definition[1],definition[2]);if(used&&['powerStrike','backstab'].includes(type))applyStatus(m,target,'bleed',{power:Math.max(1,heroDamage(h,target)*.16),duration:7000,source:h.name});if(used&&type==='envenom')applyStatus(m,target,'poison',{power:Math.max(1,heroDamage(h,target,'poison')*.18),duration:10000,source:h.name})}
  }
  if(used){spendMana(h,type);startActiveCooldown(h,type,now);b.actionSeq=(b.actionSeq||0)+1;b.log=b.log.slice(0,45);syncPartyHp(m)}
  return used;
}
function threatTarget(targets){
  const total=targets.reduce((sum,h)=>sum+Math.max(.01,h.threat||1),0);
  let roll=Math.random()*total;
  for(const h of targets){
    roll-=Math.max(.01,h.threat||1);
    if(roll<=0)return h;
  }
  return targets[targets.length-1];
}
function weightedThreatTarget(targets){
  if(!targets?.length)return null;
  return threatTarget(targets);
}
function enemyTargetPool(e,targets){
  const front=targets.filter(h=>h.row==='front'),back=targets.filter(h=>h.row==='back');
  if(!front.length)return back.length?back:targets;
  if(!back.length)return front;
  if(e?.archetype==='skirmisher')return Math.random()<.68?back:front;
  if(e?.archetype==='beast'&&Math.random()<.48){
    const wounded=[...targets].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
    return [wounded[0]];
  }
  if(e?.archetype==='caster'&&Math.random()<.30)return back;
  return Math.random()<.90?front:back;
}
function enemySingleTarget(e,targets){return weightedThreatTarget(enemyTargetPool(e,targets))}
function resolveEnemyAbility(m,e,abilityId,now=Date.now()){
  const ab=ENEMY_ABILITIES_DATA[abilityId];if(!ab||e.hp<=0)return false;
  const b=m.battle,targets=living(b.heroes);if(!targets.length)return false;
  const applyAbilityStatus=(target,damage)=>{
    if(ab.status&&Math.random()<(ab.statusChance??1))applyStatus(m,target,ab.status,{power:Math.max(1,damage*(ab.statusPower||.14)),duration:ab.statusDuration||6000,source:e.name});
  };
  if(ab.type==='heal'){
    const heal=Math.max(1,Math.round(e.maxHp*(ab.power||.08)));e.hp=Math.min(e.maxHp,e.hp+heal);b.log.unshift(`${e.name} uses ${ab.name} and restores ${heal} HP.`);
  }else if(ab.type==='aoe'){
    targets.forEach(t=>{const raw=e.atk*(ab.power||1),d=ab.damageType||e.damageType||'physical';const dmg=applyUniqueDamageReduction(t,d==='physical'?mitigatedDamage(raw,t.def,t.block||0):Math.round(mitigatedDamage(raw,t.mdef,t.block||0)*elementalReduction(t[d])));const before=t.hp;t.hp=Math.max(0,t.hp-dmg);recordHeroDamageTaken(m,t,Math.min(before,dmg));applyAbilityStatus(t,dmg)});
    b.log.unshift(`⚠ ${e.name} releases ${ab.name} on the whole party.`);
  }else{
    const t=enemySingleTarget(e,targets),d=ab.damageType||e.damageType||'physical',raw=e.atk*(ab.power||1.2),dmg=applyUniqueDamageReduction(t,d==='physical'?mitigatedDamage(raw,t.def,t.block||0):Math.round(mitigatedDamage(raw,t.mdef,t.block||0)*elementalReduction(t[d])));const before=t.hp;t.hp=Math.max(0,t.hp-dmg);recordHeroDamageTaken(m,t,Math.min(before,dmg));applyAbilityStatus(t,dmg);b.log.unshift(`${e.name} casts ${ab.name} on ${t.name.split(' ')[0]} for ${dmg} ${d} damage.`);
  }
  e.mana=Math.max(0,(e.mana||0)-(ab.manaCost||0));e.abilityReadyAt=now+(ab.cooldown||7000);b.actionSeq=(b.actionSeq||0)+1;syncPartyHp(m);return true;
}
function tryEnemyAbility(m,e,now=Date.now()){
  if(e.cast)return true;
  const id=e.ability,ab=id&&ENEMY_ABILITIES_DATA[id];if(!ab||e.hp<=0||now<(e.abilityReadyAt||0)||(e.mana||0)<(ab.manaCost||0))return false;
  const castTime=Math.max(0,ab.castTime||0);
  if(castTime){
    e.cast={abilityId:id,startedAt:now,completeAt:now+castTime};
    m.mechanicsSeen=Array.isArray(m.mechanicsSeen)?m.mechanicsSeen:[];
    if(!m.mechanicsSeen.includes('casting'))m.mechanicsSeen.push('casting');
    m.battle.log.unshift(`⚠ ${e.name} begins casting ${ab.name} (${(castTime/1000).toFixed(1)}s) — interrupt it!`);
    return true;
  }
  return resolveEnemyAbility(m,e,id,now);
}
function processEnemyCasts(m,now=Date.now()){
  const b=m.battle;if(!b)return;
  b.enemies.forEach(e=>{
    if(!e.cast||e.hp<=0)return;
    if(now>=e.cast.completeAt){const id=e.cast.abilityId;e.cast=null;resolveEnemyAbility(m,e,id,now)}
  });
}
function refreshEnemyTactics(m){
  const enemies=living(m.battle?.enemies||[]);
  enemies.forEach(target=>{
    target.protection=clamp(enemies.filter(other=>other.id!==target.id).reduce((sum,other)=>sum+(other.protectorAura||0),0),0,.6);
  });
}
function enemyAction(m,e){
  const b=m.battle,targets=living(b.heroes);if(!targets.length)return;
  if(e.cast)return;
  if(tryEnemyAbility(m,e,Date.now()))return;

  const elem=e.damageType||'physical',buffMult=e.buffs?.battleShout>Date.now()?1.20:1;
  const elemental=elem!=='physical';
  if(elemental && Math.random()<(e.aoeChance||.32)){
    const hit=targets.map(target=>{
      if(Math.random()<Math.max(0,(target.magicalDodge||0)-(e.accuracy||0))){
        return `${target.name.split(' ')[0]} dodged`;
      }
      const enraged=e.enrageThreshold&&e.hp/e.maxHp<=e.enrageThreshold?e.enrageMult||1:1;
      const raw=e.atk*1.05*(e.elementalMult||1)*enraged*buffMult;
      const afterDefense=mitigatedDamage(raw,target.mdef,target.block||0);
      let dmg=Math.max(0,Math.round(afterDefense*elementalReduction(target[elem])));
      if(target.buffs?.shieldFaith>Date.now())dmg=Math.round(dmg*.70);dmg=applyUniqueDamageReduction(target,dmg);
      const before=target.hp;target.hp=Math.max(0,target.hp-dmg);recordHeroDamageTaken(m,target,Math.min(before,dmg));
      return `${target.name.split(' ')[0]} ${dmg}`;
    });
    b.log.unshift(`⚠ ${e.name} casts ${elementIcon[elem]} ${elem.toUpperCase()} AOE: ${hit.join(' · ')}.`);
    syncPartyHp(m);
    return;
  }

  const target=enemySingleTarget(e,targets);
  if(Math.random()<Math.max(0,(target.physicalDodge||0)-(e.accuracy||0))){
    b.log.unshift(`${target.name.split(' ')[0]} dodges ${e.name}'s physical attack.`);
    b.log=b.log.slice(0,45);
    return;
  }

  if(Math.random()<(target.parry||0)){b.log.unshift(`${target.name.split(' ')[0]} parries ${e.name}'s attack.`);return;}
  let dmg;
  const enraged=e.enrageThreshold&&e.hp/e.maxHp<=e.enrageThreshold?e.enrageMult||1:1;
  const execute=e.executeThreshold&&target.hp/target.maxHp<=e.executeThreshold?e.executeMult||1:1;
  if(elemental){
    const raw=e.atk*(.72+Math.random()*.32)*(e.elementalMult||1)*enraged*execute*buffMult;
    dmg=Math.max(0,Math.round(mitigatedDamage(raw,target.mdef,target.block||0)*elementalReduction(target[elem])));
  }else dmg=mitigatedDamage(e.atk*(.72+Math.random()*.32)*enraged*execute*buffMult,target.def,target.block||0);
  if(target.buffs?.shieldFaith>Date.now())dmg=Math.round(dmg*.70);dmg=applyUniqueDamageReduction(target,dmg);
  const before=target.hp;target.hp=Math.max(0,target.hp-dmg);recordHeroDamageTaken(m,target,Math.min(before,dmg));
  b.log.unshift(`${e.name} hits ${target.name.split(' ')[0]} for ${dmg} ${elemental?elementIcon[elem]+' '+elem:'physical'} damage.`);
  if(target.hp>0&&e.basicStatus&&Math.random()<(e.basicStatusChance||0))applyStatus(m,target,e.basicStatus,{power:Math.max(1,dmg*.12),duration:8000,source:e.name});
  if(e.arenaHero&&e.dualWield&&e.offhandWeapon){
    const offTargets=living(b.heroes),offTarget=offTargets.length?enemySingleTarget(e,offTargets):null;
    if(offTarget){
      const offType=e.offhandWeapon.damageType||'physical',offElemental=offType!=='physical';
      if(Math.random()<Math.max(0,(offElemental?offTarget.magicalDodge:offTarget.physicalDodge||0)-(e.accuracy||0))){
        b.log.unshift(`${offTarget.name.split(' ')[0]} dodges ${e.name}'s off-hand attack.`);
      }else if(Math.random()<(offTarget.parry||0)){
        b.log.unshift(`${offTarget.name.split(' ')[0]} parries ${e.name}'s off-hand attack.`);
      }else{
        const raw=(e.offhandAtk||e.atk*.75)*(.72+Math.random()*.32)*enraged*buffMult;
        let offDamage=offElemental?Math.max(0,Math.round(mitigatedDamage(raw,offTarget.mdef,offTarget.block||0)*elementalReduction(offTarget[offType]))):mitigatedDamage(raw,offTarget.def,offTarget.block||0);
        if(offTarget.buffs?.shieldFaith>Date.now())offDamage=Math.round(offDamage*.70);
        const offBefore=offTarget.hp;offTarget.hp=Math.max(0,offTarget.hp-offDamage);recordHeroDamageTaken(m,offTarget,Math.min(offBefore,offDamage));
        b.log.unshift(`${e.name} strikes ${offTarget.name.split(' ')[0]} with their off hand for ${offDamage} ${offElemental?elementIcon[offType]+' '+offType:'physical'} damage.`);
        if(offTarget.hp>0&&e.basicStatus&&Math.random()<(e.basicStatusChance||0))applyStatus(m,offTarget,e.basicStatus,{power:Math.max(1,offDamage*.12),duration:8000,source:e.name});
      }
    }
  }
  if(target.hp>0&&(target.counter||0)>0&&Math.random()<target.counter){
    const counter=Math.max(1,Math.round(heroDamage(target,e)*.55));
    const enemyBefore=e.hp;
    e.hp=Math.max(0,e.hp-counter);
    addHeroMetric(m,target.id,'damage',Math.min(enemyBefore,counter));
    b.log.unshift(`${target.name.split(' ')[0]} counters ${e.name} for ${counter}.`);
  }
  b.log=b.log.slice(0,45);
  syncPartyHp(m);
}
function applyTimedRegenTick(m){
  const b=m.battle;if(!b)return;
  b.enemies.forEach(e=>{if(e.hp>0&&e.manaRegen>0)e.mana=Math.min(e.maxMana||0,(e.mana||0)+e.manaRegen)});
  b.heroes.forEach(h=>{
    if(h.hp<=0)return;
    if(h.regen>0){
      const heal=Math.min(h.regen,h.maxHp-h.hp);
      if(heal>0){
        h.hp+=heal;
        addHeroMetric(m,h.id,'healing',heal);
        b.log.unshift(`${h.name.split(' ')[0]} regenerates ${heal} HP.`);
      }
    }
    if(h.manaRegen>0){
      const restored=Math.min(h.manaRegen,(h.maxMana||0)-(h.mana||0));
      if(restored>0){
        h.mana=(h.mana||0)+restored;
        b.log.unshift(`${h.name.split(' ')[0]} regenerates ${restored} Mana.`);
      }
    }
  });
  b.log=b.log.slice(0,45);
  syncPartyHp(m);
}
function processTimedRegen(m,now=Date.now()){
  if(!m.nextRegenAt)m.nextRegenAt=now+5000;
  let safety=0;
  while(now>=m.nextRegenAt&&safety++<4){
    applyTimedRegenTick(m);
    m.nextRegenAt+=5000;
  }
}
function defeatAdviceFor(m){
  const party=(m.party||[]).map(id=>s.members.find(h=>h.id===id)).filter(Boolean);
  const enemies=m.battle?.enemies||[];
  const advice=[];
  const avgLevel=party.length?party.reduce((sum,h)=>sum+(h.level||1),0)/party.length:0;
  const partyPower=party.reduce((sum,h)=>sum+hs(h).power,0);
  const hasFrontline=party.some(h=>['Warrior','Paladin'].includes(h.class)||hs(h).threat>=1.5);
  const hasHealer=party.some(h=>h.class==='Priest'||['lifepriest','oracle','beacon'].includes(h.subclass));
  const hasCleanser=party.some(h=>['lifepriest','oracle','beacon'].includes(h.subclass));
  const hasInterrupter=party.some(h=>['guardian','warlord','marksman','assassin','stormcaller'].includes(h.subclass));
  const physical=enemies.filter(e=>(e.damageType||'physical')==='physical').length;
  const magical=enemies.length-physical;

  if(avgLevel&&avgLevel+1<m.level)advice.push(`Your party averaged level ${avgLevel.toFixed(1)} in a level ${m.level} area. Train in a lower-level expedition first.`);
  else if(partyPower<m.target*.85)advice.push(`Party power was ${partyPower} against the recommended ${m.target}. Improve equipment or bring a stronger full party.`);
  if(!hasFrontline)advice.push('The backline took sustained pressure after the party failed to establish a durable frontline.');
  if((m.mechanicsSeen||[]).some(x=>STATUS_EFFECTS[x])&&!hasCleanser)advice.push('Harmful status effects remained active long enough to wear the party down.');
  if((m.mechanicsSeen||[]).includes('casting')&&!hasInterrupter)advice.push('Several dangerous enemy casts completed without being interrupted.');
  if(!hasHealer)advice.push('The party could not recover from damage across multiple encounters.');
  if(advice.length<3&&enemies.length)advice.push(physical>=magical?'These enemies dealt mostly physical damage. Prioritize DEF, Block, and heavier armor.':'These enemies dealt mostly magical damage. Prioritize MDEF and relevant elemental resistances.');
  if(advice.length<2)advice.push('Inspect the surviving enemies and adjust weapons, subclasses, or party composition before returning.');
  return advice.slice(0,3);
}
function expeditionDefeated(m){
  if(m.type==='arena'){finishArenaClientBattle(m,false);return}
  syncPartyHp(m);
  m.defeated=true;
  if(isStagedExpedition(m)){
    m.failedStage=Math.min(EXPEDITION_STAGE_COUNT,Math.floor(expeditionEncounterCount(m)/EXPEDITION_STAGE_SIZE)+1);
    m.lastCheckpoint=Math.floor(expeditionEncounterCount(m)/EXPEDITION_STAGE_SIZE)*EXPEDITION_STAGE_SIZE;
    m.lostStageRewards={gold:m.stash.gold||0,rep:m.stash.rep||0,materials:Object.values(m.stash.materials||{}).reduce((a,v)=>a+v,0),items:m.stash.items?.length||0};
    m.stash=emptyStash();m.stageIntermission=null;
  }
  m.defeatAdvice=defeatAdviceFor(m);
  m.battle.log.unshift('The entire party has fallen. The expedition can no longer continue.');
  log(m.name+' expedition was defeated.');
  save();
}
function normalEncounterCount(m){
  if(!m.maxFights)return m.fights||0;
  if(m.finiteStage==null){
    const old=m.normalEncountersCompleted!=null?m.normalEncountersCompleted:(m.fights||0);
    m.finiteStage=Math.max(0,Math.min(old,m.maxFights||old));
  }
  return m.finiteStage;
}

function markExpeditionAreaCleared(m){
  const key=String(m.areaId||'');if(!key)return false;
  s.expeditionClears=Array.isArray(s.expeditionClears)?s.expeditionClears:[];
  if(s.expeditionClears.includes(key))return false;
  s.expeditionClears.push(key);return true;
}
function beginExpeditionStageIntermission(m,offline=false,finalStage=false){
  const stage=Math.min(EXPEDITION_STAGE_COUNT,Math.ceil(expeditionEncounterCount(m)/EXPEDITION_STAGE_SIZE));
  let firstClearBonus=null,firstClear=false;
  if(finalStage&&(firstClear=markExpeditionAreaCleared(m))){
    firstClearBonus=awardAreaGuildBonus(m,false);
  }
  const delivered=depositMissionStash(m,finalStage?'Area cleared':'Stage delivery');
  m.completedStages=stage;m.lastCheckpoint=expeditionEncounterCount(m);
  const hidden=typeof document!=='undefined'&&document.hidden;
  m.stageIntermission={stage,finalStage,offlinePaused:!!offline||hidden,until:Date.now()+EXPEDITION_INTERMISSION_MS,delivered};
  if(finalStage){m.completed=true;m.bossDefeated=true;addGuildActivity(firstClear?5:2,firstClear?'first expedition clear':'expedition clear');log(`${m.name} cleared after ${EXPEDITION_MAX_ENCOUNTERS} encounters.`);if(firstClearBonus)victoryPresentation(m,{major:false,guildBonus:firstClearBonus})}
  save();
}
function continueExpeditionStage(mid){
  const m=s.missions.find(x=>x.id===mid);if(!m?.stageIntermission||m.completed)return;
  m.stageIntermission.offlinePaused=false;m.stageIntermission.until=Date.now();advanceExpeditionIntermission(m,Date.now());save();renderActive();renderCombat();
}
function advanceExpeditionIntermission(m,now=Date.now()){
  const pause=m?.stageIntermission;if(!pause||pause.finalStage||pause.offlinePaused||now<pause.until)return false;
  m.stageIntermission=null;
  const next=makeBattle(m);m.battle=m.battle?advanceBattleInPlace(m.battle,next,now):next;m.lastSim=now;return true;
}
function resetMissionPartyState(m){
  m.partyState={};ensurePartyState(m);m.combatCycle={phase:'heroes',heroTurn:0,enemyTurn:0,round:1};m.nextRegenAt=Date.now()+5000;
}
function restartExpedition(mid,fromBeginning=false){
  const m=s.missions.find(x=>x.id===mid);if(!m||!isStagedExpedition(m)||!m.defeated)return;
  const restartAt=fromBeginning?0:Math.max(0,Math.min(EXPEDITION_MAX_ENCOUNTERS-1,m.lastCheckpoint||0));
  m.finiteStage=restartAt;m.normalEncountersCompleted=restartAt;m.completedStages=Math.floor(restartAt/EXPEDITION_STAGE_SIZE);m.fights=restartAt;m.kills=0;m.defeated=false;m.completed=false;m.bossDefeated=false;m.defeatAdvice=[];m.failedStage=null;m.lostStageRewards=null;m.stageIntermission=null;m.stash=emptyStash();m.battleNumber=0;m.lastRewardedBattleId=null;m.combatReport=null;resetMissionPartyState(m);m.battle=makeBattle(m);m.lastSim=Date.now();activeMissionDomKey='__force__';save();render();openCombat(mid);notify(fromBeginning?'Expedition restarted from Stage 1.':`Expedition restarted from Stage ${expeditionStage(m)}.`,'good');
}

function createCurrentFiniteBattle(m){
  if(normalEncounterCount(m)>=m.maxFights)return makeBossBattle(m);
  return makeBattle(m);
}

function carryBattleEffects(previousBattle,nextBattle,now=Date.now()){
  if(!previousBattle?.heroes||!nextBattle?.heroes)return nextBattle;
  const previousById=new Map(previousBattle.heroes.map(hero=>[hero.id,hero]));
  nextBattle.heroes.forEach(hero=>{
    const previous=previousById.get(hero.id);if(!previous)return;
    // Use one timestamp for the complete handoff instead of filtering once
    // while saving and again while constructing the next encounter.
    hero.buffs=activePersistentBuffs(previous.buffs,now);
    hero.statuses=activePersistentStatuses(previous.statuses,now);
  });
  return nextBattle;
}

function advanceBattleInPlace(currentBattle,nextBattle,now=Date.now()){
  if(!currentBattle)return nextBattle;
  carryBattleEffects(currentBattle,nextBattle,now);

  const currentHeroesById=new Map((currentBattle.heroes||[]).map(hero=>[hero.id,hero]));
  const heroes=(nextBattle.heroes||[]).map(nextHero=>{
    const hero=currentHeroesById.get(nextHero.id);
    if(!hero)return nextHero;
    const levelUpUntil=hero.levelUpUntil,levelUpText=hero.levelUpText;
    Object.keys(hero).forEach(key=>{if(!(key in nextHero))delete hero[key]});
    Object.assign(hero,nextHero);
    if(levelUpUntil>now){hero.levelUpUntil=levelUpUntil;hero.levelUpText=levelUpText}
    return hero;
  });
  const currentEnemies=currentBattle.enemies||[];
  const enemies=(nextBattle.enemies||[]).map((nextEnemy,index)=>{
    const enemy=currentEnemies[index];
    if(!enemy)return nextEnemy;
    Object.keys(enemy).forEach(key=>{if(!(key in nextEnemy))delete enemy[key]});
    Object.assign(enemy,nextEnemy);
    return enemy;
  });

  if(!Array.isArray(currentBattle.heroes))currentBattle.heroes=[];
  if(!Array.isArray(currentBattle.enemies))currentBattle.enemies=[];
  currentBattle.heroes.splice(0,currentBattle.heroes.length,...heroes);
  currentBattle.enemies.splice(0,currentBattle.enemies.length,...enemies);
  Object.keys(currentBattle).forEach(key=>{if(key!=='heroes'&&key!=='enemies'&&!(key in nextBattle))delete currentBattle[key]});
  Object.entries(nextBattle).forEach(([key,value])=>{if(key!=='heroes'&&key!=='enemies')currentBattle[key]=value});
  return currentBattle;
}

function finishCurrentFight(m){
  const b=m.battle;
  if(!b||living(b.enemies||[]).length)return;
  if(m.type==='arena'){finishArenaClientBattle(m,true);return}

  syncPartyHp(m);
  applyProvisionRecovery(m);

  if((b.kind==='boss'||b.boss)&&!b.areaBoss){
    if(!m.completed)bossReward(m);
    return;
  }

  // Never reward the same battle twice.
  if(!b.resolved){
    b.resolved=true;
    ensureCombatReport(m).encounters++;
    try{
      grantFightRewards(m,b.enemies.map(e=>({name:e.name,templateName:e.templateName,level:e.level})));
    }catch(err){
      console.error('Guildmaster reward error',err);
      notify('The fight ended, but reward processing had an error.');
    }

    if(m.maxFights){
      // ONE and only one place increments finite dungeon progress.
      m.finiteStage=Math.min((m.finiteStage||0)+1,m.maxFights);
      m.normalEncountersCompleted=m.finiteStage;
    }
  }

  if(isStagedExpedition(m)){
    if(m.finiteStage>=EXPEDITION_MAX_ENCOUNTERS){beginExpeditionStageIntermission(m,false,true);return}
    if(m.finiteStage%EXPEDITION_STAGE_SIZE===0){beginExpeditionStageIntermission(m,false,false);return}
  }

  const transitionNow=Date.now();
  const nextBattle=(m.type==='dungeon'||m.type==='raid')?createCurrentFiniteBattle(m):makeBattle(m);
  // Keep the live battle and combatant objects. Swapping m.battle here used to
  // reset the entire visualization at every encounter boundary.
  m.battle=advanceBattleInPlace(b,nextBattle,transitionNow);

  m.lastRewardedBattleId=b.id;
  m.lastSim=Date.now();
  save();
}

function repairFiniteMissionState(m){
  if(m?.battle?.heroes)m.battle.heroes.forEach(hero=>{
    if(!hero.cooldowns||typeof hero.cooldowns!=='object')hero.cooldowns={};
    if(!hero.buffs||typeof hero.buffs!=='object')hero.buffs={};
    const original=s.members.find(x=>x.id===hero.id),z=original?hs(original):null,wep=original?s.inventory.find(x=>x.id===original.equip?.MainHand):null;
    if(z)hero.attackSpeed=z.attackSpeed+(missionProvisionEffect(m).attackSpeed||0);
    if(!hero.baseAttackTime)hero.baseAttackTime=weaponAttackTime(wep?.weaponTemplate||wep?.weaponType||hero.weaponType||'');
    if(!Number.isFinite(hero.nextAttackAt))scheduleNextAttack(hero,false,Date.now());
  });
  if(m?.battle?.enemies)m.battle.enemies.forEach(enemy=>{
    if(!enemy.attackInterval)enemy.attackInterval=enemy.boss?4200:(enemy.mage?2750:2350);
    if(!Number.isFinite(enemy.nextAttackAt))scheduleNextAttack(enemy,true,Date.now());
  });
  if(!m||m.completed||m.defeated||(m.type!=='dungeon'&&m.type!=='raid'))return;

  if(m.battle?.boss){
    m.battle.bossStartedAt=m.battle.bossStartedAt||Date.now();
    m.battle.bossEnrageAt=m.battle.bossEnrageAt||m.battle.bossStartedAt+18000;
    m.battle.bossMechanics=m.battle.bossMechanics||{summoned70:false,summoned35:false,phaseTwo:false,enraged:false};
  }

  if(m.finiteStage==null){
    const old=m.normalEncountersCompleted!=null?m.normalEncountersCompleted:(m.fights||0);
    m.finiteStage=Math.max(0,Math.min(old,m.maxFights||old));
  }

  m.normalEncountersCompleted=m.finiteStage;

  // If a save claims all normal encounters are done, force the boss.
  if(m.finiteStage>=m.maxFights){
    if(!m.battle)m.battle=makeBossBattle(m);
    else if(m.battle.kind!=='boss')m.battle=advanceBattleInPlace(m.battle,makeBossBattle(m));
    return;
  }

  // If it has a normal battle, make sure the battle knows which numbered
  // encounter it actually is.
  if(m.battle&&!m.battle.boss){
    m.battle.kind='normal';
    m.battle.encounterNumber=m.finiteStage+1;
  }
}

function repairDeadBattles(){
  let repaired=false;
  s.missions.forEach(m=>{
    ensureCombatCycle(m);
    if(m.battle){
      // Old saves had battle-local turn state. Adopt that state once.
      if(!m.combatCycleMigrated){
        m.combatCycle={
          phase:m.battle.phase==='enemies'?'enemies':'heroes',
          heroTurn:m.battle.phase==='heroes'?Math.max(0,m.battle.turn||0):0,
          enemyTurn:m.battle.phase==='enemies'?Math.max(0,m.battle.turn||0):0,
          round:Math.max(1,m.battle.round||1)
        };
        m.combatCycleMigrated=true;
      }
      syncBattleCycleFromMission(m,m.battle);
    }
    repairFiniteMissionState(m);
    if(m.completed||m.defeated||!m.battle)return;
    if(!living(m.battle.enemies||[]).length){
      finishCurrentFight(m);
      repaired=true;
    }
  });
  if(repaired)save();
}

function summonSkeletonGuards(m,count,label){
  const b=m.battle,now=Date.now();
  for(let i=0;i<count;i++){
    const nextId=Math.max(0,...b.enemies.map(e=>e.id||0))+1;
    const guard={...makeEnemy(m.type,m.level,nextId-1,'Bone Guard'),id:nextId,statuses:{},cast:null,summoned:true};
    guard.attackStartedAt=now;guard.nextAttackAt=now+enemyAttackIntervalMs(guard);
    b.enemies.push(guard);
  }
  b.log.unshift(`⚠ ${label}: skeletal guards rise to protect the king.`);
  b.actionSeq=(b.actionSeq||0)+1;
}
function processBossMechanics(m,now=Date.now()){
  const b=m.battle;if(!b?.boss||m.boss!=='Skeleton King')return;
  const king=b.enemies.find(e=>e.boss&&e.name==='Skeleton King');if(!king||king.hp<=0)return;
  b.bossMechanics=b.bossMechanics||{summoned70:false,summoned35:false,phaseTwo:false,enraged:false};
  const mech=b.bossMechanics,hp=king.hp/Math.max(1,king.maxHp);
  if(hp<=.70&&!mech.summoned70){mech.summoned70=true;summonSkeletonGuards(m,1,'Royal Guard')}
  if(hp<=.50&&!mech.phaseTwo){
    mech.phaseTwo=true;king.phase='Grave Sovereign';king.atk=Math.round(king.atk*1.15);king.attackInterval=Math.round(king.attackInterval*.78);scheduleNextAttack(king,true,now);
    b.log.unshift('⚠ The Skeleton King shatters his throne and enters the Grave Sovereign phase.');b.actionSeq=(b.actionSeq||0)+1;
  }
  if(hp<=.35&&!mech.summoned35){mech.summoned35=true;summonSkeletonGuards(m,2,'Call of the Crypt')}
  if(!mech.enraged&&now>=(b.bossEnrageAt||Infinity)){
    mech.enraged=true;king.enraged=true;king.atk=Math.round(king.atk*1.35);king.attackInterval=Math.round(king.attackInterval*.72);scheduleNextAttack(king,true,now);
    b.log.unshift('⚠ The Skeleton King enrages. His attacks become much faster and stronger.');b.actionSeq=(b.actionSeq||0)+1;
  }
}

function stepBattle(m){
  if(!m||m.defeated||m.completed)return;
  const now=Date.now();
  if(m.stageIntermission){advanceExpeditionIntermission(m,now);return}
  if(!m.battle)m.battle=makeBattle(m);
  let b=m.battle;
  if(!b)return;

  b.heroes?.forEach(hero=>{
    if(!hero.cooldowns||typeof hero.cooldowns!=='object')hero.cooldowns={};
    if(!hero.buffs||typeof hero.buffs!=='object')hero.buffs={};
    if(!Number.isFinite(hero.nextAttackAt))scheduleNextAttack(hero,false,now);
  });
  b.enemies?.forEach(enemy=>{
    if(!Number.isFinite(enemy.nextAttackAt))scheduleNextAttack(enemy,true,now);
  });

  processStatusEffects(m,now);
  processEnemyCasts(m,now);
  processBossMechanics(m,now);
  refreshEnemyTactics(m);

  if(!living(b.enemies).length){finishCurrentFight(m);return}
  if(!living(b.heroes).length){expeditionDefeated(m);return}

  processTimedRegen(m,now);

  // Arena defenders are saved heroes, so their subclass abilities run on
  // independent mana/cooldown timers just like the attacking party.
  for(const defender of b.enemies){
    if(defender.hp<=0||!defender.arenaHero)continue;
    tryArenaDefenderActive(m,defender,now);
    if(!living(b.heroes).length){expeditionDefeated(m);return}
  }

  // Active abilities are fully independent of normal attacks.
  for(const hero of b.heroes){
    if(hero.hp<=0)continue;
    tryActiveSkill(m,hero,now);
    if(!living(b.enemies).length){finishCurrentFight(m);return}
  }

  // Each hero has an independent weapon-driven attack timer.
  for(const hero of b.heroes){
    if(hero.hp<=0)continue;
    if(now>=hero.nextAttackAt){
      heroBasicAttack(m,hero);
      b.actionSeq=(b.actionSeq||0)+1;
      scheduleNextAttack(hero,false,now);
      if(!living(b.enemies).length){finishCurrentFight(m);return}
    }
  }

  // Every enemy also attacks independently.
  for(const enemy of b.enemies){
    if(enemy.hp<=0)continue;
    if(now>=enemy.nextAttackAt){
      enemyAction(m,enemy);
      b.actionSeq=(b.actionSeq||0)+1;
      scheduleNextAttack(enemy,true,now);
      if(!living(b.heroes).length){expeditionDefeated(m);return}
      if(!living(b.enemies).length){finishCurrentFight(m);return}
    }
  }

  syncPartyHp(m);
  m.lastSim=now;
}
function offlineEnemySnapshot(m){
  const pool=(m.enemyPool?.length?m.enemyPool:(enemyPools[m.type]||enemyPools.quest)),level=missionEncounterLevel(m);
  const count=m.type==='raid'?3:m.type==='dungeon'?2:1;
  return Array.from({length:count},()=>({name:pick(pool),level}));
}
function offlineCompositionFactor(m,party){
  const members=party||[];
  const templates=(m.enemyPool||[]).map(name=>ENEMIES_DATA[name]||{});
  const abilities=templates.map(e=>ENEMY_ABILITIES_DATA[e.ability]).filter(Boolean);
  const hasFrontline=members.some(h=>['Warrior','Paladin'].includes(h.class)||hs(h).threat>=1.5);
  const hasSustain=members.some(h=>h.class==='Priest'||['lifepriest','oracle','beacon'].includes(h.subclass));
  const hasCleanse=members.some(h=>['lifepriest','oracle','beacon'].includes(h.subclass));
  const hasInterrupt=members.some(h=>['guardian','warlord','marksman','assassin','stormcaller'].includes(h.subclass));
  const backlinePressure=templates.some(e=>['skirmisher','beast'].includes(e.archetype));
  const dangerousCasts=abilities.some(a=>(a.castTime||0)>=1800&&a.type!=='heal');
  const harmfulStatuses=abilities.some(a=>a.status);
  let factor=1;
  if(!hasFrontline)factor*=backlinePressure?.62:.76;
  if(!hasSustain)factor*=m.type==='quest'?.88:.72;
  if(dangerousCasts&&!hasInterrupt)factor*=.78;
  if(harmfulStatuses&&!hasCleanse)factor*=.82;
  if(hasFrontline&&hasSustain)factor*=1.06;
  return clamp(factor,.35,1.12);
}

function offlineCatchup(hiddenMs){
  if(!hiddenMs||hiddenMs<60000)return;

  s.missions.forEach(m=>{
    if(m.defeated||m.completed||m.stageIntermission)return;
    // Story gates are deliberate live boss attempts; background time cannot
    // bypass them or silently advance the expedition chapter.
    if(m.bossGate)return;

    ensurePartyState(m);
    repairFiniteMissionState(m);

    const party=s.members.filter(h=>m.party.includes(h.id));
    const composition=offlineCompositionFactor(m,party);
    const mealEffect=missionProvisionEffect(m);
    const provisionPower=1+(mealEffect.damage||0)+(mealEffect.attackSpeed||0)*.5+(mealEffect.defense||0)*.4+(mealEffect.mdef||0)*.2+(mealEffect.maxHp||0)*.5;
    const ratio=clamp(power(m.party)*composition*provisionPower/Math.max(1,m.target),.3,2.2);
    const secondsPerFight=clamp(180/ratio,m.type==='raid'?130:90,m.type==='raid'?300:250);
    let possible=Math.floor(hiddenMs/1000/secondsPerFight);
    possible=Math.min(possible,100);

    if(m.type==='dungeon'||m.type==='raid'){
      possible=Math.min(possible,Math.max(0,m.maxFights-normalEncounterCount(m)));
    }
    if(isStagedExpedition(m))possible=Math.min(possible,EXPEDITION_STAGE_SIZE-(expeditionEncounterCount(m)%EXPEDITION_STAGE_SIZE||0));
    if(possible<=0)return;

    const healer=(party.some(h=>h.class==='Priest')?.35:0)+(mealEffect.healing||0)*.25;
    const sustain=party.reduce((sum,h)=>{const z=hs(h);return sum+(z.regen||0)*.012+(z.lifesteal||0)*.004},0);

    let completed=0;
    for(let i=0;i<possible;i++){
      const totalHp=m.party.reduce((sum,id)=>sum+(m.partyState[id]?.hp||0),0);
      const maxHp=m.party.reduce((sum,id)=>sum+(m.partyState[id]?.maxHp||1),0);
      let hpRatio=maxHp?totalHp/maxHp:0;

      hpRatio-=clamp((.13/ratio)*(1-healer)-sustain,.02,.32);
      if(hpRatio<=0){
        m.party.forEach(id=>{if(m.partyState[id])m.partyState[id].hp=0});
        expeditionDefeated(m);
        break;
      }

      m.party.forEach(id=>{
        const ps=m.partyState[id];
        if(ps)ps.hp=Math.max(1,Math.round(ps.maxHp*hpRatio));
      });
      applyProvisionRecovery(m);

      grantFightRewards(m,offlineEnemySnapshot(m));
      if(m.maxFights){
        m.finiteStage=Math.min((m.finiteStage||0)+1,m.maxFights);
        m.normalEncountersCompleted=m.finiteStage;
      }
      completed++;
      if(isStagedExpedition(m)&&m.finiteStage%EXPEDITION_STAGE_SIZE===0){beginExpeditionStageIntermission(m,true,m.finiteStage>=EXPEDITION_MAX_ENCOUNTERS);break}
    }
    if(completed){const report=ensureCombatReport(m);report.encounters+=completed;report.offlineEncounters=(report.offlineEncounters||0)+completed}

    if(!m.defeated&&!m.completed&&!m.stageIntermission){
      // Offline simulation resolves complete encounters, so resume at the start
      // of a fresh global round rather than halfway through an actor sequence.
      const c=ensureCombatCycle(m);
      c.phase='heroes';c.heroTurn=0;c.enemyTurn=0;c.round=Math.max(1,c.round+completed);
      const nextBattle=(m.type==='dungeon'||m.type==='raid')?createCurrentFiniteBattle(m):makeBattle(m);
      m.battle=m.battle?advanceBattleInPlace(m.battle,nextBattle):nextBattle;

      if(completed)m.battle.log.unshift(`Offline progress: ${completed} encounters completed while away.`);
      m.lastRewardedBattleId=null;
    }

    m.lastSim=Date.now();
    m.nextRegenAt=Date.now()+5000;
  });

  save();
}

function stopExpedition(mid){
  const m=s.missions.find(x=>x.id===mid);if(!m)return;
  collectLoot(mid,true);
  if(m.personalQuest&&m.defeated){const q=s.personalQuests?.find(x=>x.id===m.personalQuestId);if(q){q.status='available';q.missionId=null}}
  m.party.forEach(hid=>{const h=s.members.find(x=>x.id===hid);if(h)h.busy=false});
  s.missions=s.missions.filter(x=>x.id!==mid);activeMissionDomKey='__force__';
  log('Expedition ended: '+m.name+'. '+m.fights+' fights completed.');
  save();closeCombat();render();notify('Party returned with all unclaimed loot.','good');
}
