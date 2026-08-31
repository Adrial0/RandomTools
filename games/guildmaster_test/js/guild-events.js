// Guild inbox, rotating member issues, activity milestones, and personal missions.
const GUILD_ISSUE_ACTIVITY_THRESHOLD=15;
const PERSONAL_RIVAL_FIRST=['Ash','Black','Blood','Grim','Iron','Night','Red','Storm','Thorn','Vex'];
const PERSONAL_RIVAL_LAST=['Bane','Brand','Fang','Hand','Maw','Reaver','Scar','Shade','Talon','Voss'];
const GUILD_ISSUE_TEMPLATES=[
  {id:'specialization',title:'Unsure How to Specialize',body:h=>`${h.name} is torn between dealing more damage and becoming harder to bring down.`,choices:[['Encourage offense','Gain +3% personal damage.'],['Encourage survival','Gain +4% personal maximum HP.']]},
  {id:'motivation',title:'Losing Motivation',body:h=>`${h.name} feels their training has stalled and asks whether the guild will invest in them.`,choices:[['Let them find their own drive','No cost and no immediate benefit.'],['Fund private training','Pay gold and gain +5% personal XP permanently.']]},
  {id:'equipment',title:'Embarrassed by Their Equipment',body:h=>`${h.name} wants equipment worthy of their growing reputation.`,choices:[['Commission a weapon','Pay gold for a Rare weapon of an unlocked tier.'],['Tell them to prove themselves','Create a personal mission with a better reward.']]},
  {id:'rival',title:'An Old Rival Resurfaces',body:h=>`${h.name} has learned that an old enemy is operating nearby and wants to settle the matter.`,choices:[['This is yours alone','Create a solo personal mission.'],['The guild stands with you','Create a personal mission allowing a party.']]},
  {id:'confidence',title:'Confidence Shaken',body:h=>`${h.name} has begun second-guessing every attack after a difficult assignment.`,choices:[['Practice precision','Gain +1.5% Critical Chance.'],['Face the fear directly','Create a solo personal mission.']]},
  {id:'old_debt',title:'An Unpaid Debt',body:h=>`Someone from ${h.name}'s past has arrived to collect an old debt.`,choices:[['Settle it with guild funds','Pay gold; gain +3% personal maximum HP from renewed confidence.'],['Settle it in the field','Create a personal mission allowing a party.']]},
  {id:'restless',title:'Restless for a Challenge',body:h=>`${h.name} believes ordinary expeditions are no longer testing their limits.`,choices:[['Permit a solo challenge','Create a difficult solo personal mission.'],['Organize a guild hunt','Create a personal mission allowing a party.']]},
  {id:'study',title:'Requests Advanced Training',body:h=>`${h.name} wants access to tutors and records normally reserved for veterans.`,choices:[['Let experience be the teacher','Gain immediate character XP.'],['Hire a specialist tutor','Pay gold and gain +5% personal XP permanently.']]},
  {id:'leadership',title:'Questions Their Role',body:h=>`${h.name} is unsure whether to lead from the front or concentrate on finishing enemies.`,choices:[['Lead from the front','Gain +4% personal maximum HP.'],['Lead by example','Gain +3% personal damage.']]},
  {id:'rumor',title:'A Name from the Past',body:h=>`${h.name} recognizes the name of a dangerous figure mentioned in recent guild reports.`,choices:[['Investigate alone','Create a solo personal mission.'],['Bring trusted companions','Create a personal mission allowing a party.']]}
];
function normalizeGuildEventState(){
  s.guildActivityPoints=Math.max(0,Number(s.guildActivityPoints)||0);s.guildIssueCursor=Math.max(0,Number(s.guildIssueCursor)||0);s.guildIssues=Array.isArray(s.guildIssues)?s.guildIssues:[];s.personalQuests=Array.isArray(s.personalQuests)?s.personalQuests:[];
}
function guildMembersByTenure(){return [...(s.members||[])].sort((a,b)=>(a.joinedOrder||0)-(b.joinedOrder||0)||a.id-b.id)}
function createGuildIssue(){
  normalizeGuildEventState();const members=guildMembersByTenure();if(!members.length)return null;
  const member=members[s.guildIssueCursor%members.length];s.guildIssueCursor++;
  const previous=[...s.guildIssues].reverse().find(issue=>issue.memberId===member.id),pool=GUILD_ISSUE_TEMPLATES.filter(t=>t.id!==previous?.templateId),template=pick(pool.length?pool:GUILD_ISSUE_TEMPLATES);
  const issue={id:id(),memberId:member.id,memberName:member.name,templateId:template.id,title:template.title,createdAt:Date.now(),resolved:false};s.guildIssues.push(issue);log(`${member.name} sent a message to the Guild Inbox: ${template.title}.`);return issue;
}
function addGuildActivity(points,source='guild activity'){
  normalizeGuildEventState();s.guildActivityPoints+=Math.max(0,Math.round(points||0));let created=0;
  while(s.guildActivityPoints>=GUILD_ISSUE_ACTIVITY_THRESHOLD&&s.members.length){s.guildActivityPoints-=GUILD_ISSUE_ACTIVITY_THRESHOLD;if(createGuildIssue())created++;else break}
  if(created)notify(`${created} new Guild Inbox issue${created===1?'':'s'}.`,'good');return created;
}
function issueTemplate(issue){return GUILD_ISSUE_TEMPLATES.find(t=>t.id===issue?.templateId)||GUILD_ISSUE_TEMPLATES[0]}
function issueMember(issue){return s.members.find(h=>h.id===issue.memberId)||null}
function guildIssueTier(issue){const h=issueMember(issue);return clamp(Math.min(questGuildTier(),Math.max(1,Math.ceil((h?.level||1)/10))),1,10)}
function guildIssueGoldCost(issue){return Math.round((180+guildIssueTier(issue)*90)*Math.pow(1.45,guildIssueTier(issue)-1))}
function grantIssueBonus(h,key,value){h.eventBonuses=Object.assign({hp:0,damage:0,crit:0},h.eventBonuses||{});h.eventBonuses[key]=(h.eventBonuses[key]||0)+value}
function grantPersonalCharacterXp(h,amount){
  if(!h)return 0;h.xp+=Math.max(0,Math.round(amount||0));let levels=0,need=heroXpNeeded(h.level);while(h.xp>=need){h.xp-=need;h.level++;syncNaturalHeroBonus(h);levels++;need=heroXpNeeded(h.level)}if(levels)addGuildActivity(levels,'personal training');return levels;
}
function personalQuestRewardItem(tier,rarity='Rare'){
  let pool=recipes.map((r,i)=>({r,i})).filter(x=>x.r[1]!=='Material'&&x.r[4]===tier);if(!pool.length)pool=recipes.map((r,i)=>({r,i})).filter(x=>x.r[1]!=='Material'&&x.r[4]<=tier);const chosen=pick(pool);if(!chosen)return null;
  const [name,slot,specific,,itemTier]=chosen.r,it=makeSpecificItem(slot,specific,itemTier,rarity);applyRecipeModifiers(it,chosen.r[5]||{});it.name=name;it.recipeIndex=chosen.i;return it;
}
function createPersonalQuest(h,solo=false,hard=false){
  const tier=clamp(Math.min(questGuildTier(),Math.max(1,Math.ceil((h.level||1)/10))),1,10),areas=AREAS.filter(a=>a.tier===tier&&!a.bossGate),area=pick(areas.length?areas:AREAS.filter(a=>a.tier===tier)),enemyPool=(area?.enemyPool||[]).slice(),bossTemplate=pick(enemyPool),boss=`${pick(PERSONAL_RIVAL_FIRST)} ${pick(PERSONAL_RIVAL_LAST)}`;
  const quest={id:id(),memberId:h.id,memberName:h.name,name:`${h.name}: Unfinished Business`,desc:`${h.name} has unfinished business with ${boss}.`,tier,level:area?.level||Math.max(1,(tier-1)*10+1),enemyPool,boss,bossTemplate,theme:area?.theme||null,areaId:`personal-${h.id}-${Date.now()}`,encounters:hard?6:rnd(3,5),solo:!!solo,hard:!!hard,status:'available',createdAt:Date.now(),reward:{gold:Math.round((350+tier*180)*Math.pow(1.55,tier-1)),xp:Math.round(35+tier*30),rarity:hard?'Epic':'Rare'}};
  s.personalQuests.push(quest);log(`Personal mission available: ${quest.name}.`);return quest;
}
function giveCommissionedWeapon(h,issue){const tier=guildIssueTier(issue),item=personalQuestRewardItem(tier,'Rare');if(item){receiveInventoryItem(item,'guild event');log(`${h.name} received ${item.name} from the guild commission.`)}return item}
function resolveGuildIssue(issueId,choice){
  normalizeGuildEventState();const issue=s.guildIssues.find(x=>x.id===issueId),h=issue&&issueMember(issue),template=issueTemplate(issue);if(!issue||issue.resolved||!h||![0,1].includes(choice))return;
  const cost=guildIssueGoldCost(issue),pay=()=>{if(s.gold<cost){notify(`This decision requires ${cost} gold.`);return false}s.gold-=cost;return true};
  switch(issue.templateId){
    case'specialization':choice?grantIssueBonus(h,'hp',.04):grantIssueBonus(h,'damage',.03);break;
    case'motivation':if(choice){if(!pay())return;h.personalXpBonus=(h.personalXpBonus||0)+.05}break;
    case'equipment':if(!choice){if(!pay())return;giveCommissionedWeapon(h,issue)}else createPersonalQuest(h,false,false);break;
    case'rival':createPersonalQuest(h,!choice,false);break;
    case'confidence':if(!choice)grantIssueBonus(h,'crit',.015);else createPersonalQuest(h,true,false);break;
    case'old_debt':if(!choice){if(!pay())return;grantIssueBonus(h,'hp',.03)}else createPersonalQuest(h,false,false);break;
    case'restless':createPersonalQuest(h,!choice,!choice);break;
    case'study':if(!choice)grantPersonalCharacterXp(h,Math.round(heroXpNeeded(h.level)*.35));else{if(!pay())return;h.personalXpBonus=(h.personalXpBonus||0)+.05}break;
    case'leadership':choice?grantIssueBonus(h,'damage',.03):grantIssueBonus(h,'hp',.04);break;
    case'rumor':createPersonalQuest(h,!choice,false);break;
  }
  issue.resolved=true;issue.choice=choice;issue.resolvedAt=Date.now();issue.result=template.choices[choice][0];log(`${h.name}'s issue was resolved: ${issue.result}.`);save();render();notify(`${h.name}: ${issue.result}.`,'good');
}
function renderGuildInbox(){
  if(!$('guildIssueList'))return;normalizeGuildEventState();const unresolved=s.guildIssues.filter(x=>!x.resolved),badge=$('guildInboxBadge');if(badge){badge.textContent=unresolved.length;badge.style.display=unresolved.length?'inline-flex':'none'}if($('guildActivityProgress'))$('guildActivityProgress').textContent=`${s.guildActivityPoints} / ${GUILD_ISSUE_ACTIVITY_THRESHOLD} activity`;
  $('guildIssueList').innerHTML=unresolved.length?unresolved.map(issue=>{const h=issueMember(issue),template=issueTemplate(issue),cost=guildIssueGoldCost(issue);return `<article class="card guildIssueCard"><div class="guildIssueIdentity"><span class="portrait">${h?classIcon(h):'?'}</span><div><div class="name">${issue.memberName}</div><div class="guildIssueSubject">${issue.title}</div></div></div><p>${template.body(h||{name:issue.memberName})}</p><div class="guildIssueChoices">${template.choices.map((choice,index)=>{let desc=choice[1];if((issue.templateId==='motivation'&&index===1)||(issue.templateId==='equipment'&&index===0)||(issue.templateId==='old_debt'&&index===0)||(issue.templateId==='study'&&index===1))desc+=` Cost: ${cost}g.`;return `<button class="btn ${index?'gold':''}" onclick="resolveGuildIssue(${issue.id},${index})"><b>${choice[0]}</b><span>${desc}</span></button>`}).join('')}</div></article>`}).join(''):'<div class="empty">No unresolved guild issues.</div>';
}
function renderPersonalQuests(){
  if(!$('personalQuestList'))return;normalizeGuildEventState();const available=s.personalQuests.filter(q=>q.status==='available'),section=$('personalQuestSection');section.style.display=available.length?'':'none';$('personalQuestCount').textContent=`${available.length} available`;
  $('personalQuestList').innerHTML=available.map(q=>`<article class="card quest actionCard personalQuestCard"><div class="sectionKicker">${q.solo?'Solo Assignment':'Personal Assignment'}</div><div class="name">${q.name}</div><div class="muted">${q.desc}</div><div class="chips"><span class="chip">${tierLabel(q.tier)}</span><span class="chip">${q.encounters} encounters, then boss</span><span class="chip">${q.solo?'Required: '+q.memberName:'Must include '+q.memberName}</span><span class="chip">Reward: ${q.reward.gold}g · ${q.reward.rarity} item</span></div><button class="btn gold actionButton" onclick="openPersonalQuestPicker(${q.id})">Begin Personal Quest</button></article>`).join('');
}
function openPersonalQuestPicker(qid){
  const q=s.personalQuests.find(x=>x.id===qid&&x.status==='available'),owner=q&&s.members.find(h=>h.id===q.memberId);if(!q||!owner)return;if(owner.busy)return notify(`${owner.name} is currently unavailable.`);
  if(q.solo)return showModal('Personal Quest',`<div class="card"><div class="name">${q.name}</div><div class="muted">${owner.name} must face this alone.</div><div class="modalActionRow"><button class="btn gold" onclick="confirmPersonalQuest(${qid},[${owner.id}])">Send ${owner.name}</button></div></div>`);
  const available=s.members.filter(h=>!h.busy),limit=partySizeFor('dungeon');showModal('Choose Personal Quest Party',`<div class="card"><div class="name">${q.name}</div><div class="muted">Choose up to ${limit} members. ${owner.name} is required.</div><div class="party" id="expeditionPartyPicker">${available.map(h=>`<button class="partyMember ${h.id===owner.id?'on requiredMember':''}" data-h="${h.id}" onclick="${h.id===owner.id?'':'toggleExpeditionMember(this)'}"><span class="miniClass">${classIcon(h)}</span><span>${h.name} · ${displayClass(h)} · Lv. ${h.level} · ${hs(h).power} power</span></button>`).join('')}</div><div class="modalActionRow"><button class="btn gold" onclick="confirmPersonalQuest(${qid})">Send Party</button></div></div>`);currentPartyPickerType='dungeon';
}
function confirmPersonalQuest(qid,forcedIds=null){const q=s.personalQuests.find(x=>x.id===qid&&x.status==='available');if(!q)return;const ids=forcedIds||selectedExpeditionIds();if(!ids.includes(q.memberId))return notify(`${q.memberName} must join this personal quest.`);if(q.solo&&ids.length!==1)return notify('This is a solo personal quest.');closeModal();startPersonalQuest(q,ids)}
function startPersonalQuest(q,ids){
  const party=ids.slice(0,partySizeFor('dungeon')).map(i=>s.members.find(h=>h.id===i)).filter(Boolean);if(!party.length||party.some(h=>h.busy))return notify('A required member is unavailable.');party.forEach(h=>h.busy=true);const now=Date.now(),mission={...q,id:id(),personalQuest:true,personalQuestId:q.id,type:'dungeon',party:party.map(h=>h.id),start:now,lastSim:now,kills:0,fights:0,finiteStage:0,normalEncountersCompleted:0,goldEarned:0,repEarned:0,maxFights:q.encounters,stash:emptyStash(),partyState:{},combatCycle:{phase:'heroes',heroTurn:0,enemyTurn:0,round:1},nextRegenAt:now+5000,defeated:false,completed:false,bossDefeated:false,battleNumber:0,lastRewardedBattleId:null};ensurePartyState(mission);mission.battle=makeBattle(mission);q.status='active';q.missionId=mission.id;s.missions.push(mission);log(`Personal quest started: ${q.name}.`);save();render();openCombat(mission.id)}
function personalQuestBossReward(m){
  const q=s.personalQuests.find(x=>x.id===m.personalQuestId),h=s.members.find(x=>x.id===q?.memberId);if(!q||!h)return;m.stash.gold+=(q.reward?.gold||0);grantPersonalCharacterXp(h,q.reward?.xp||0);const reward=personalQuestRewardItem(q.tier,q.reward?.rarity||'Rare');if(reward){reward.dropSource=q.boss;m.stash.items.push(reward)}q.status='completed';q.completedAt=Date.now();m.completed=true;m.bossDefeated=true;m.battle.log.unshift(`${q.boss} was defeated. ${h.name}'s personal matter is settled.`);log(`Personal quest completed: ${q.name}.`);save();
}
