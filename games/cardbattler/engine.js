(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardBattle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const symbols = {robot:'▣',alien:'♧',mage:'✦',engineer:'⚒',thief:'♠',raider:'⚔',caveman:'◆',acolyte:'✝',pyro:'♨',mech:'▣',warlord:'♛',necromancer:'☠',cleric:'✝',templar:'♜',inquisitor:'✠',mindguard:'◉',witch:'✧',battlemage:'✦',viking:'⚔',shaman:'❋',sentinel:'▥',mechanic:'⚙',artificer:'⚒',enforcer:'♜',cyborg:'▣',psychic:'◉',warlock:'✧',mutant:'♧',leader:'♛',heretic:'☠',pirate:'⚑',scientist:'⚗',blob:'●'};
  const implementedKeywords = new Set(['armor','ranged','stationary','rush','retaliate','weaken','silence','lifesteal','ignite','venom','fury','flank','exploit','freeze','rend','sunder','disarm','rage','blink','overkill','pull','mirror','fear']);
  const keywordDescriptions={armor:'Reduces physical damage by its armor amount, to a minimum of 1.',ranged:'Attacks the first enemy in its column within range; allies block shots.',stationary:'Cannot move forward.',rush:'Can move and then attack in the same activation.',retaliate:'Returns an attack after surviving an enemy attack.',weaken:'Reduces target damage by 30% for its next activation.',silence:'Disables target abilities and keywords until the source dies.',lifesteal:'Heals for damage dealt, up to maximum health.',ignite:'Applies Burn: 2 damage on each of the next 2 activations.',venom:'Applies Poison: 20% maximum health damage on each of the next 2 activations.',fury:'A kill grants +1 attack, +1 maximum health, and +1 health.',flank:'Deals 30% more damage when a friendly unit is adjacent to the target.',exploit:'Deals 30% more damage to afflicted targets.',freeze:'Skips the target’s next activation.',rend:'Applies Bleed: 20% of attack damage on the next 2 activations.',sunder:'Removes 1 armor on hit.',disarm:'Prevents the target’s next attack.',rage:'Gains up to 50% damage as health falls.',blink:'Moves one tile forward after a kill if empty, without entering the opposing base.',overkill:'Excess damage continues through enemies behind the target in its column.',pull:'Pulls a target one tile closer before attacking if the destination is empty.',mirror:'Copies a keyword it lacks from an adjacent ally before acting.',fear:'Target retreats one tile instead of acting on its next activation if space is free.',spawn:'Summons units according to the card’s ability.',bomb:'Mech explodes for 5 damage into all 8 neighboring tiles, including friendlies.',mindshield:'Immunity to mental attacks; Mindguard shares it with its 8 neighboring allies.'};
  const abilityTexts = {
    mage:'Arcane splash hits its target and the tiles on either side. Each living Mage supplies 1 mana; arcane attacks spend 1 mana to cast their splash, otherwise they attack a single target.',
    acolyte:'Support: heals the most injured adjacent ally for 2 before acting.',
    cleric:'Spends up to 4 of its own Faith to heal the most injured adjacent ally before acting. Starts with 3 Faith.',
    mechanic:'Repair: grants an adjacent ally 1 armor before acting (up to +2).',
    hacker:'On a successful hit, steals one random keyword it does not already have from a surviving target.',
    artificer:'Arcane splash: hits its target and the tiles on either side.',
    psychic:'Mental attack. Weakens its target for its next activation.',
    shaman:'Arcane splash: hits its target and the tiles on either side.',
    warlock:'Arcane splash. Exploit deals 30% more damage to afflicted targets.',
    leader:'Command: allies in its row deal 10% more damage. Prototype value.',
    heretic:'On hit, removes 2 Faith from its target.',
    pirate:'After a kill, applies Fear to neighboring enemies: they retreat one tile on their next activation if space is free.',
    scientist:'Experiment: attacks randomly burn, freeze, or weaken the target.',
    witch:'Attacks weaken their target by 30% and silence its keywords and abilities until the Witch dies.',
    battlemage:'Flame splash: hits its target and the tiles on either side, applying burn.',
    pyro:'Burns the unit ahead and units to the left and right of that target.',
    mech:'Ranged. On death, explodes into all 8 neighboring tiles, hitting both sides, then ejects a pilot.',
    warlord:'Allies in the 8 neighboring tiles deal 20% more damage.',
    necromancer:'Enemy deaths caused by its team leave a 1 health / 1 attack allied skeleton on eligible empty tiles.',
    mindguard:'Immune to mental attacks; shares immunity with the 8 neighboring allies.',
    inquisitor:'Bonus damage against Cursed. Double damage against burning units.',
    thief:'Stealth: untargetable until its first attack.',
    businessman:'Generates +1 gold each round while alive and not silenced. Each Businessman stacks.',
    miner:'Generates +1 gold each round while alive and not silenced. Each Miner stacks.',
    'witch-hunter':'Deals 50% bonus damage against Fantasy units. Prototype bonus.',
    'family-man':'On its first activation, summons a Wife and Child into nearby empty tiles. Wife heals an adjacent ally for 1; Child has Rush. Prototype summon stats.',
    'crypto-dude':'Each activation, flips a coin: gain 1 gold or lose 1 gold, without going below zero. Prototype amounts.',
    ceo:'Each activation, earns 1 gold per other living friendly Corporate unit. Prototype rate.',
    missionary:'Each activation, gives 1 Faith to all allies in the eight surrounding tiles.',
    'machine-priest':'Spends 1 Faith to give an adjacent Tech ally 1 armor before acting, up to 2 extra armor per ally. Starts with 3 Faith.',
    'arms-dealer':'Friendly Gunslingers in the eight surrounding tiles deal 20% more damage. Uses the gun-user buff idea; gun summoning is unfinished.',
    sheriff:'Marks the lowest-health visible enemy with a bounty. When its team kills that target, gains 2 gold. One active bounty per Sheriff. Prototype reward.',
    cannibal:'Once per battle, eats the weakest adjacent friendly unit and gains its current health, maximum health, and attack. Eating consumes its action.',
    agent:'Can deploy on any empty tile except the opposing base row. Cannot damage the enemy base on the turn it is deployed.',
    conqueror:'Deals 5% more damage per tile occupied by its team. Prototype bonus.',
    lorekeeper:'On deployment, choose Armor, Ranged, Rush, Ignite, Retaliate, or Venom. All current allies in its row learn that keyword for the battle.',
    mapmaker:'Reveals the next enemy reinforcement card while alive and not silenced.',
    'space-monk':'Immune to single-target ranged attacks. Melee and AoE can hit it. Pulls the first enemy in its column one tile closer, if the destination is empty, before attacking. Pull range: 3.',
    alchemist:'Ranged attacks always apply Venom and randomly apply Freeze, Sunder, Rend, or Silence. Sunder removes 1 armor; Rend bleeds for 20% of attack for 2 activations; Freeze skips 1 activation; Silence lasts until the Alchemist dies.',
    'ai-girlfriend':'Once per battle, charms the first target in range instead of attacking. It fights for her side for its next activation, then returns to its original side and deals 30% less damage for its next activation.',
    symbiote:'Each activation tries to attach to an ally: front, behind, left, right. An attached Symbiote grants its host +2 attack and +1 armor. It detaches on host death and can attach again. Unattached: 5 health, 1 attack. Host bonuses are prototype values.',
    buddhist:'While alive, gains 1 Karma when an Outlaw or Cursed unit dies and loses 1 when a Faith or Holy unit dies. On death reincarnates into a random unit: tier 1 at Karma ≤0, tier 2 at 1–3, tier 3 at 4+. Stats change 5% per Karma, capped at ±30%. Unclassified characters are neutral.',
    'drug-dealer':'Every third activation summons a Drug Addict into a nearby empty tile. Addicts have 4 health, 2 attack, and Rush. Prototype timing and stats.',
    corruptor:'Each activation removes 1 Faith from adjacent enemies. Every second activation summons a Cultist. With three nearby Cultists, consumes them and summons a Demon. Prototype thresholds; Cultists have 3 health / 1 attack, Demons 12 health / 5 attack.'
  };
  Object.assign(abilityTexts,{
    abomination:'On hit, applies Fear: the target retreats one tile instead of acting on its next activation if space is free.',
    prepper:'Cannot move. Attacks the first enemy in its column within 3 tiles. Has 2 armor.',
    templar:'Has 2 armor, extra health, and starts with 5 Faith. No additional unique ability.',
    viking:'Rush allows movement and an attack together. Each kill grants +1 attack, +1 maximum health, and +1 health through Fury.',
    raider:'Rush allows movement and an attack together. No additional unique ability.',
    mutant:'Venom poisons targets for 20% of maximum health for 2 activations. Flank deals 30% more damage when a friendly unit is adjacent to its target.',
    sentinel:'Retaliate: after surviving an attack, immediately attacks the attacker.',
    cowboy:'Ranged attacks within 3 tiles. Rush allows it to move and fire in the same activation.',
    caveman:'No ability or keywords. Relies on its higher health.'
  });
  abilityTexts.blob='Can merge with another Blob despite shared colors. Grows in proportion to absorbed Blobs, with a 10% bonus over their combined base health and attack. This exception also works with already merged Blobs.';
  class Game {
    constructor(data, options = {}) {
      this.data = data;
      this.random = options.random || Math.random;
      this.cards = new Map(data.cards.map(c => [c.id, c]));
      this.recipes = data.recipes.filter(r => this.cards.has(r.result) && r.ingredients.every(id => this.cards.has(id)));
      this.state = null;
      this.frames = [];
    }
    pick(list) { return list[Math.floor(this.random() * list.length)]; }
    shuffle(list) { const result = [...list]; for (let i=result.length-1;i>0;i--) {const j=Math.floor(this.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]];} return result; }
    definition(id) {
      const blobMatch=/^blob:(\d+)$/.exec(id);
      if(blobMatch){const mass=Number(blobMatch[1]);if(mass>=2&&mass<=128)return {...this.cards.get('blob'),id,baseId:'blob',mass,name:'Blob ×'+mass};return undefined;}
      if (id === 'skeleton') return {id,name:'Skeleton',theme:'Fantasy',subgroup:'Cursed',tier:1,keywords:[]};
      if (id === 'mech-pilot') return {id,name:'Mech Pilot',theme:'Sci fi',subgroup:'Tech',tier:1,keywords:[{id:'ranged',value:2}]};
      const summons={wife:['Wife','Modern','Corporate'],child:['Child','Modern','Corporate'],'drug-addict':['Drug Addict','Outlaw',null],cultist:['Cultist','Faith','Cursed'],demon:['Demon','Fantasy','Cursed']};
      if(summons[id])return {id,name:summons[id][0],theme:summons[id][1],subgroup:summons[id][2],tier:1,keywords:['child','drug-addict'].includes(id)?[{id:'rush'}]:[]};
      return this.cards.get(id);
    }
    isCard(id) {return this.cards.has(id)||/^blob:\d+$/.test(id)&&Boolean(this.definition(id));}
    playable() { return [...this.cards.values()]; }
    profile(id) {
      const card = this.definition(id);
      if (!card) throw new Error('Unknown card: '+id);
      const tier = card.tier || 1;
      const stats = {health:7+tier*4,attack:2+tier,cost:tier===1?1:tier===2?2:3,range:1,armor:0};
      const keywords = (card.keywords || []).filter(k=>k.status!=='tentative').map(k=>k.id);
      if(id==='cowboy'&&!keywords.includes('ranged'))keywords.push('ranged');
      const armored = (card.keywords || []).find(k=>k.id==='armor');
      stats.armor = armored ? armored.value || 1 : 0;
      if (keywords.includes('ranged')) stats.range=(card.keywords || []).some(k=>k.id==='ranged'&&k.value==='unlimited')?6:3;
      if (['mage','artificer','psychic','warlock','shaman','scientist','witch','battlemage'].includes(id)) { stats.range=2; stats.health-=3; }
      if (['caveman','enforcer','templar','cyborg','sentinel'].includes(id)) stats.health+=4;
      if (id==='raider'||id==='viking') {stats.attack++;stats.health-=2;}
      if (id==='thief') {stats.attack++;stats.health-=2;}
      if (['acolyte','cleric','mechanic','leader'].includes(id)) stats.attack=2;
      if (id==='skeleton') Object.assign(stats,{health:3,attack:2,cost:0});
      if (id==='mech-pilot') Object.assign(stats,{health:7,attack:3,range:2,cost:0});
      if (id==='mech') {stats.health=22;stats.attack=5;stats.range=3;}
      if (id==='posthuman') Object.assign(stats,{health:40,attack:9});
      stats.health=Math.max(2,Math.round(stats.health*.75));
      if(card.mass){stats.health=Math.round(stats.health*card.mass*1.1);stats.attack=Math.round(stats.attack*card.mass*1.1);}
      if(id==='skeleton')Object.assign(stats,{health:1,attack:1});
      if(id==='symbiote')Object.assign(stats,{health:5,attack:1});
      if(id==='wife')Object.assign(stats,{health:5,attack:1});
      if(id==='child'||id==='drug-addict')Object.assign(stats,{health:4,attack:2});
      if(id==='cultist')Object.assign(stats,{health:3,attack:1});
      if(id==='demon')Object.assign(stats,{health:12,attack:5});
      if(['space-monk','ai-girlfriend'].includes(id))stats.range=3;
      if(id==='alchemist')stats.range=3;
      const handledByAbility={spawn:['mech','necromancer','family-man','buddhist','drug-dealer'],bomb:['mech'],mindshield:['mindguard']};
      const pendingKeywords=keywords.filter(keyword=>!implementedKeywords.has(keyword)&&!(handledByAbility[keyword]||[]).includes(id));
      const implementedDescription=abilityTexts[card.baseId||id];
      const pendingAbility=!implementedDescription&&card.abilityStatus!=='intentionally-none'&&Boolean(card.ability||card.designNotes&&card.designNotes!=='pure stats');
      const description=implementedDescription || (id==='posthuman'?'No unique ability. Has the highest base stats in the roster.':pendingAbility?'Uses stats and implemented keywords for now. Its unique ability is not implemented yet.':'Uses its stats and implemented keywords. No unique ability is assigned yet.');
      return {...stats,price:tier===1?10:tier===2?30:50,colors:card.colors||[],keywords,keywordDescriptions,pendingKeywords,pendingAbility,description,symbol:symbols[id] || '◇'};
    }
    newRun() {
      this.state = {version:1,balanceRevision:2,economyRevision:3,progressionRevision:2,mergeInteractionRevision:2,enemyDifficultyRevision:2,lives:3, phase:'planning',encounter:0,turn:1,playerHP:45,playerMaxHP:45,enemyHP:48,enemyMaxHP:48,mana:0,gold:60,shop:[],
        deck:[],draw:[],discard:[],hand:[],merge:Array(6).fill(null),units:[],nextId:1,log:[],rewards:[],artifacts:[],selected:null,pendingChoice:null};
      this.beginEncounter();
      return this.state;
    }
    log(text, animate=false) {
      this.state.log.unshift(text);this.state.log=this.state.log.slice(0,40);
      if (animate) this.frames.push({text,state:copy(this.state)});
    }
    spawn(cardId,team,row,col) {
      if (this.unitAt(row,col)) return null;
      const profile=this.profile(cardId);
      const unit={uid:this.state.nextId++,cardId,team,row,col,hp:profile.health,maxHP:profile.health,attack:profile.attack,armor:profile.armor,range:profile.range,keywords:profile.keywords,burn:0,poison:0,freeze:0,weaken:0,silence:0,stealth:cardId==='thief',bonusArmor:0,faith:cardId==='templar'?5:this.definition(cardId).theme==='Faith'||cardId==='machine-priest'?3:0,activations:0,deployedTurn:this.state.turn};
      if(cardId==='buddhist')unit.karma=0;
      this.state.units.push(unit);return unit;
    }
    unitAt(row,col) { return this.state.units.find(u=>u.row===row&&u.col===col&&u.hp>0&&!u.hostId); }
    alive(unit) { return this.state.units.includes(unit)&&unit.hp>0; }
    neighbors(unit,team) { return this.state.units.filter(u=>u.uid!==unit.uid&&u.hp>0&&!u.hostId&&(!team||u.team===team)&&Math.max(Math.abs(u.row-unit.row),Math.abs(u.col-unit.col))===1); }
    beginEncounter() {
      const s=this.state;
      s.playerHP=s.playerMaxHP;s.deck=[];s.hand=[];s.merge=Array(6).fill(null);s.rewards=[];s.gold=Math.max(60,s.gold);
      s.phase='planning';s.turn=1;s.mana=0;s.units=[];s.draw=[];s.discard=[];s.selected=null;s.pendingChoice=null;s.enemyMaxHP=48+s.encounter*12;s.enemyHP=s.enemyMaxHP;
      const opening=[['caveman','raider','robot','mage'],['robot','mage','raider','viking','cleric'],['templar','viking','mage','warlord','raider'],['cyborg','witch','cleric','warlord','viking','mage'],['mech','warlord','necromancer','templar','witch','raider']][s.encounter];
      opening.forEach((id,i)=>this.spawnEnemy(id,i<3?1:0,[0,2,4,5,1,3][i]));
      s.nextEnemyCard=this.pick(this.enemyPool());this.refreshShop();this.log('Battle '+(s.encounter+1)+': buy cards with gold, then deploy for free.');
    }
    income() {return 10+this.state.units.filter(u=>u.team==='player'&&u.hp>0&&!u.silence&&['miner','businessman'].includes(u.cardId)).length;}
    refreshShop() {
      const maxTier=this.state.encounter>=2||this.state.turn>=6?3:2;
      const base=this.shuffle(this.playable().filter(c=>c.tier===1)).slice(0,4).map(c=>c.id);
      const advanced=this.shuffle(this.playable().filter(c=>c.tier>1&&c.tier<=maxTier)).slice(0,2).map(c=>c.id);
      this.state.shop=[...base,...advanced];
    }
    buyCard(index) {
      const s=this.state;if(s.phase!=='planning'||s.pendingChoice||!Number.isInteger(index)||!s.shop[index]||s.hand.length>=10)return false;
      const id=s.shop[index],price=this.profile(id).price;if(s.gold<price)return false;
      s.gold-=price;s.hand.push(id);s.deck.push(id);s.shop[index]=null;this.log('Bought '+this.definition(id).name+' for '+price+' gold.');return true;
    }
    rerollShop() {const s=this.state;if(s.phase!=='planning'||s.pendingChoice||s.gold<10)return false;s.gold-=10;this.refreshShop();return true;}
    enemyPool() {return [['caveman','raider','alien'],['robot','mage','raider'],['templar','viking','psychic'],['cyborg','witch','cleric'],['mech','warlord','necromancer','mage']][this.state.encounter];}
    spawnEnemy(id,row,col) {const u=this.spawn(id,'enemy',row,col);if(u){u.maxHP=Math.ceil(u.maxHP*(1.65+this.state.encounter*.1));u.hp=u.maxHP;u.attack+=2+Math.floor(this.state.encounter/2);}return u;}
    deploy(handIndex,row,col) {
      const s=this.state;
      const id=s.hand[handIndex];if(!id)return false;
      if(s.phase!=='planning'||s.pendingChoice||!Number.isInteger(handIndex)||!Number.isInteger(row)||!Number.isInteger(col)||row<(id==='agent'?1:3)||row>5||col<0||col>5||this.unitAt(row,col)) return false;
      s.hand.splice(handIndex,1);const unit=this.spawn(id,'player',row,col);s.selected=null;
      if(id==='lorekeeper')s.pendingChoice={type:'lorekeeper',uid:unit.uid};
      this.log(this.definition(id).name+' deployed.');return true;
    }
    store(handIndex,slot) {
      const s=this.state;if(s.phase!=='planning'||!Number.isInteger(slot)||slot<0||slot>=s.merge.length||s.merge[slot]||!s.hand[handIndex]) return false;
      s.merge[slot]=s.hand.splice(handIndex,1)[0];s.selected=null;return true;
    }
    retrieve(slot) {const s=this.state;if(s.phase!=='planning'||!s.merge[slot]||s.hand.length>=10) return false;s.hand.push(s.merge[slot]);s.merge[slot]=null;return true;}
    sharedColors(a,b) {return this.profile(a).colors.filter(color=>this.profile(b).colors.includes(color));}
    recipesFor(a,b) {
      if(!a||!b)return [];
      const first=this.definition(a),second=this.definition(b);if(!first||!second)return [];
      const firstId=first.baseId||a,secondId=second.baseId||b;
      if(firstId==='blob'&&secondId==='blob'){const mass=(first.mass||1)+(second.mass||1);return mass<=128?[{ingredients:[a,b],result:'blob:'+mass}]:[];}
      if(this.sharedColors(a,b).length)return [];
      return this.recipes.filter(r=>(r.ingredients[0]===firstId&&r.ingredients[1]===secondId)||(r.ingredients[0]===secondId&&r.ingredients[1]===firstId));
    }
    mergeOptions() {return this.recipesFor(...this.state.merge);}
    merge(result) {
      const s=this.state;const recipe=this.mergeOptions().find(r=>!result||r.result===result);if(s.phase!=='planning'||!recipe||s.hand.length>=10)return false;
      const ingredientIds=s.merge.slice(0,2);const deck=[...s.deck];
      for(const id of ingredientIds){const index=deck.indexOf(id);if(index<0)return false;deck.splice(index,1);}
      deck.push(recipe.result);s.deck=deck;s.merge[0]=null;s.merge[1]=null;s.hand.push(recipe.result);this.log('Combined into '+this.definition(recipe.result).name+'. Your deck is permanently upgraded.');return true;
    }
    mergeCards(source,target) {
      const s=this.state;
      const valid=ref=>ref&&['hand','merge'].includes(ref.zone)&&Number.isInteger(ref.index)&&ref.index>=0&&ref.index<s[ref.zone].length;
      if(s.phase!=='planning'||!valid(source)||!valid(target)||source.zone===target.zone&&source.index===target.index)return false;
      const a=s[source.zone][source.index],b=s[target.zone][target.index];if(!a||!b)return false;
      const recipe=this.recipesFor(a,b)[0];if(!recipe)return false;
      const deck=[...s.deck];for(const id of [a,b]){const index=deck.indexOf(id);if(index<0)return false;deck.splice(index,1);}deck.push(recipe.result);
      const hand=s.hand.flatMap((id,index)=>source.zone==='hand'&&source.index===index?[]:[target.zone==='hand'&&target.index===index?recipe.result:id]);
      const row=s.merge.map((id,index)=>source.zone==='merge'&&source.index===index?null:target.zone==='merge'&&target.index===index?recipe.result:id);
      s.deck=deck;s.hand=hand;s.merge=row;s.selected=null;this.log('Combined into '+this.definition(recipe.result).name+'. Your deck is permanently upgraded.');return true;
    }
    moveMergeCard(source,targetIndex) {
      const s=this.state;if(s.phase!=='planning'||!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>=s.merge.length||s.merge[targetIndex])return false;
      if(source.zone==='hand')return this.store(source.index,targetIndex);
      if(source.zone!=='merge'||!Number.isInteger(source.index)||source.index<0||source.index>=s.merge.length||!s.merge[source.index])return false;
      s.merge[targetIndex]=s.merge[source.index];s.merge[source.index]=null;return true;
    }
    effectiveAttack(unit,target) {
      let multiplier=unit.weaken?0.7:1;
      if(!unit.silence) {
        this.neighbors(unit,unit.team).forEach(other=>{if(!other.silence&&other.cardId==='warlord')multiplier+=.2;if(!other.silence&&other.cardId==='arms-dealer'&&this.definition(unit.cardId).subgroup==='Gunslinger')multiplier+=.2;});
        this.state.units.filter(u=>u.team===unit.team&&u.uid!==unit.uid&&u.row===unit.row&&u.cardId==='leader'&&!u.silence).forEach(()=>multiplier+=.1);
        if(target&&unit.keywords.includes('exploit')&&(target.burn||target.poison||target.freeze||target.weaken||target.silence))multiplier+=.3;
        if(target&&unit.keywords.includes('flank')&&this.neighbors(target,unit.team).length)multiplier+=.3;
        if(unit.cardId==='inquisitor'&&target) {if(this.definition(target.cardId).subgroup==='Cursed')multiplier+=.5;if(target.burn)multiplier*=2;}
        if(unit.cardId==='witch-hunter'&&target&&this.definition(target.cardId).theme==='Fantasy')multiplier+=.5;
        if(unit.cardId==='conqueror')multiplier+=this.state.units.filter(u=>u.team===unit.team&&!u.hostId).length*.05;
        if(unit.keywords.includes('rage'))multiplier+=(1-unit.hp/unit.maxHP)*.5;
      }
      if(this.state.artifacts.includes('war-banner')&&unit.team==='player')multiplier+=.15;
      const attachmentBonus=this.state.units.filter(u=>u.hostId===unit.uid&&!u.silence).length*2;
      return Math.max(1,Math.round((unit.attack+attachmentBonus)*multiplier));
    }
    mentalImmune(unit) {return !unit.silence&&unit.cardId==='mindguard'||this.neighbors(unit,unit.team).some(u=>u.cardId==='mindguard'&&!u.silence);}
    damage(target,amount,source,type='physical') {
      if(!this.alive(target))return 0;
      if(type.startsWith('mental')&&this.mentalImmune(target)){this.log(this.definition(target.cardId).name+' blocks mental damage.',true);return 0;}
      if(target.cardId==='space-monk'&&!target.silence&&source&&!['area','mental-area','burn','poison','bleed'].includes(type)&&Math.abs(source.row-target.row)>1){this.log('Space monk blocks a ranged attack.',true);return 0;}
      const attachmentArmor=this.state.units.filter(u=>u.hostId===target.uid&&!u.silence).length;
      const actual=type==='physical'?Math.max(1,amount-(target.silence?0:target.armor+attachmentArmor)):amount;
      target.hp-=actual;
      this.log(this.definition(target.cardId).name+' takes '+actual+' damage.',true);
      if(target.hp<=0)this.kill(target,source);
      return actual;
    }
    kill(target,source) {
      if(!this.state.units.includes(target))return;
      const {row,col,team,cardId}=target;this.state.units=this.state.units.filter(u=>u!==target);
      const owner=target.originalTeam||team;
      if(owner==='player'&&this.isCard(cardId)){const owned=this.state.deck.indexOf(cardId);if(owned>=0)this.state.deck.splice(owned,1);}
      if(cardId==='mage'){const manaKey=team==='player'?'mana':'enemyMana';this.state[manaKey]=Math.max(0,(this.state[manaKey]||0)-1);}
      for(const unit of this.state.units){
        if(unit.silenceSource===target.uid){unit.silence=0;delete unit.silenceSource;}
        if(unit.hostId===target.uid){
          const position=[[row,col],...[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].map(([dr,dc])=>[row+dr,col+dc])].find(([r,c])=>r>=0&&r<6&&c>=0&&c<6&&!this.unitAt(r,c));
          delete unit.hostId;if(position){[unit.row,unit.col]=position;}else{unit.hp=0;this.state.units=this.state.units.filter(u=>u!==unit);const index=this.state.deck.indexOf(unit.cardId);if(unit.team==='player'&&index>=0)this.state.deck.splice(index,1);}
          this.log('Symbiote detaches from its fallen host.',true);
        }
        if(unit.cardId==='buddhist'&&!unit.silence){const definition=this.definition(cardId);const good=definition.theme==='Faith'||definition.subgroup==='Holy';const bad=definition.theme==='Outlaw'||definition.subgroup==='Cursed';unit.karma=(unit.karma||0)+(good?-1:bad?1:0);}
      }
      if(target.bountyTeam&&source&&source.team===target.bountyTeam&&source.team==='player'){this.state.gold+=2;this.log('Bounty collected: +2 gold.',true);}
      this.log(this.definition(cardId).name+' falls.',true);
      if(source&&this.alive(source)&&!source.silence) {
        if(source.keywords.includes('fury')){source.attack++;source.maxHP++;source.hp++;}
        if(source.cardId==='pirate')this.neighbors(target,team).forEach(u=>u.fear=1);
        if(source.keywords.includes('blink')){const next=source.row+(source.team==='player'?-1:1);if(next>0&&next<5&&!this.unitAt(next,source.col))source.row=next;}
      }
      if(cardId==='buddhist'&&!target.silence&&!this.unitAt(row,col)){
        const karma=target.karma||0,tier=karma>=4?3:karma>0?2:1,id=this.pick(this.playable().filter(c=>c.tier===tier&&c.id!=='buddhist')).id;
        const reincarnated=this.spawn(id,team,row,col),factor=clamp(1+karma*.05,.7,1.3);reincarnated.maxHP=Math.max(1,Math.round(reincarnated.maxHP*factor));reincarnated.hp=reincarnated.maxHP;reincarnated.attack=Math.max(1,Math.round(reincarnated.attack*factor));
        if(owner==='player')this.state.deck.push(id);this.log('Buddhist reincarnates as '+this.definition(id).name+' (Karma '+karma+').',true);
      }
      if(cardId==='mech'&&!target.silence) {
        for(const unit of [...this.state.units])if(Math.max(Math.abs(unit.row-row),Math.abs(unit.col-col))===1)this.damage(unit,5,target,'area');
        if(!this.unitAt(row,col))this.spawn('mech-pilot',team,row,col);
        this.log('The mech explodes. Its pilot ejects.',true);
      } else if(source&&team!==source.team&&this.state.units.some(u=>u.team===source.team&&u.cardId==='necromancer'&&!u.silence)&&row!==(source.team==='player'?0:5)&&!this.unitAt(row,col)) {
        this.spawn('skeleton',source.team,row,col);this.log('A skeleton rises.',true);
      }
    }
    support(unit) {
      if(unit.silence)return;
      if(['acolyte','cleric','wife'].includes(unit.cardId)) {
        const ally=this.neighbors(unit,unit.team).filter(u=>u.hp<u.maxHP).sort((a,b)=>(b.maxHP-b.hp)-(a.maxHP-a.hp))[0];
        if(ally){let amount=unit.cardId==='cleric'?Math.min(4,unit.faith||0,ally.maxHP-ally.hp):unit.cardId==='wife'?1:2;if(unit.cardId==='cleric')unit.faith-=amount;if(amount){ally.hp=Math.min(ally.maxHP,ally.hp+amount);this.log(this.definition(unit.cardId).name+' heals '+this.definition(ally.cardId).name+'.',true);}}
      }
      if(unit.cardId==='mechanic') {const ally=this.neighbors(unit,unit.team).filter(u=>u.bonusArmor<2)[0];if(ally){ally.armor++;ally.bonusArmor++;this.log('Mechanic reinforces an ally.',true);}}
      if(unit.cardId==='missionary')this.neighbors(unit,unit.team).forEach(u=>u.faith=(u.faith||0)+1);
      if(unit.cardId==='machine-priest'&&unit.faith>0){const ally=this.neighbors(unit,unit.team).find(u=>this.definition(u.cardId).subgroup==='Tech'&&u.bonusArmor<2);if(ally){unit.faith--;ally.armor++;ally.bonusArmor++;}}
      if(unit.cardId==='crypto-dude'&&unit.team==='player'){const change=this.random()<.5?1:-1;this.state.gold=Math.max(0,this.state.gold+change);this.log('Crypto Dude: '+(change>0?'+1':'−1')+' gold.',true);}
      if(unit.cardId==='ceo'&&unit.team==='player'){const count=this.state.units.filter(u=>u.uid!==unit.uid&&u.team===unit.team&&this.definition(u.cardId).subgroup==='Corporate').length;this.state.gold+=count;}
      if(unit.cardId==='family-man'&&!unit.summonedFamily){unit.summonedFamily=true;this.summonNear(unit,'wife');this.summonNear(unit,'child');}
      if(unit.cardId==='drug-dealer'&&unit.activations%3===0)this.summonNear(unit,'drug-addict');
      if(unit.cardId==='corruptor'){
        this.neighbors(unit,unit.team==='player'?'enemy':'player').forEach(u=>u.faith=Math.max(0,(u.faith||0)-1));
        const cultists=this.neighbors(unit,unit.team).filter(u=>u.cardId==='cultist');
        if(cultists.length>=3){cultists.slice(0,3).forEach(u=>this.kill(u,null));this.summonNear(unit,'demon');}else if(unit.activations%2===0)this.summonNear(unit,'cultist');
      }
      if(unit.cardId==='sheriff'&&!this.state.units.some(u=>u.bountySheriff===unit.uid)){
        const target=this.state.units.filter(u=>u.team!==unit.team&&!u.hostId&&!u.stealth).sort((a,b)=>a.hp-b.hp)[0];if(target){target.bountySheriff=unit.uid;target.bountyTeam=unit.team;this.log('Sheriff marks '+this.definition(target.cardId).name+' with a bounty.',true);}
      }
    }
    summonNear(unit,id) {
      const direction=unit.team==='player'?-1:1;
      for(const [dr,dc] of [[-direction,0],[0,-1],[0,1],[direction,0],[-1,-1],[-1,1],[1,-1],[1,1]]){
        const row=unit.row+dr,col=unit.col+dc;if(row>=0&&row<6&&col>=0&&col<6&&row!==(unit.team==='player'?0:5)&&!this.unitAt(row,col)){const summon=this.spawn(id,unit.team,row,col);this.log(this.definition(unit.cardId).name+' summons '+this.definition(id).name+'.',true);return summon;}
      }return null;
    }
    grantKeyword(unit,keyword) {
      if(unit.keywords.includes(keyword))return;
      unit.keywords.push(keyword);if(keyword==='armor')unit.armor++;if(keyword==='ranged')unit.range=Math.max(unit.range,3);
    }
    chooseLorekeeper(keyword) {
      const choice=this.state.pendingChoice;if(!choice||!['armor','ranged','rush','ignite','retaliate','venom'].includes(keyword))return false;
      const unit=this.state.units.find(u=>u.uid===choice.uid);if(!unit)return false;
      this.state.units.filter(u=>u.team===unit.team&&u.row===unit.row&&!u.hostId).forEach(u=>this.grantKeyword(u,keyword));this.state.pendingChoice=null;this.log('Lorekeeper teaches '+keyword+' to its row.');return true;
    }
    findTarget(unit) {
      const direction=unit.team==='player'?-1:1;
      const range=unit.silence?1:unit.range;
      for(let step=1;step<=range;step++) {
        const row=unit.row+direction*step;if(row<0||row>5)break;
        const target=this.unitAt(row,unit.col);
        if(target) return target.team===unit.team||target.stealth?null:target;
      }
      return null;
    }
    attack(unit,target) {
      unit.stealth=false;
      const mental=!unit.silence&&['mage','artificer','shaman','warlock','psychic'].includes(unit.cardId);
      const manaKey=unit.team==='player'?'mana':'enemyMana';
      let aoe=!unit.silence&&['mage','artificer','shaman','warlock','battlemage','pyro'].includes(unit.cardId);
      if(aoe&&mental){if((this.state[manaKey]||0)>0)this.state[manaKey]--;else aoe=false;}
      const targets=aoe?[target,...[-1,1].map(offset=>this.unitAt(target.row,target.col+offset)).filter(other=>other&&other.team!==unit.team)]:[target];
      this.log(this.definition(unit.cardId).name+' attacks '+this.definition(target.cardId).name+'.',true);
      for(const other of targets) {
        if(!this.alive(other)||!this.alive(unit))continue;
        const amount=this.effectiveAttack(unit,other),beforeHP=other.hp;
        const dealt=this.damage(other,amount,unit,mental?(aoe?'mental-area':'mental'):aoe?'area':'physical');
        if(!unit.silence&&unit.keywords.includes('overkill')&&dealt>beforeHP){
          let remaining=dealt-beforeHP;const direction=unit.team==='player'?-1:1;
          for(let row=other.row+direction;row>=0&&row<=5&&remaining>0;row+=direction){const behind=this.unitAt(row,other.col);if(behind){if(behind.team===unit.team)break;const health=behind.hp,damage=this.damage(behind,remaining,unit);remaining=Math.max(0,damage-health);}}
        }
        if(!unit.silence&&dealt) {
          if(unit.keywords.includes('lifesteal'))unit.hp=Math.min(unit.maxHP,unit.hp+dealt);
          if(this.alive(other)) {
            if(unit.keywords.includes('ignite')||unit.cardId==='pyro'||unit.cardId==='battlemage')other.burn=2;
            if(unit.keywords.includes('venom'))other.poison=2;
            if(unit.keywords.includes('weaken'))other.weaken=1;
            if(unit.keywords.includes('silence')){other.silence=999;other.silenceSource=unit.uid;}
            if(unit.keywords.includes('freeze'))other.freeze=1;
            if(unit.keywords.includes('sunder'))other.armor=Math.max(0,other.armor-1);
            if(unit.keywords.includes('rend')){other.bleed=2;other.bleedDamage=Math.max(1,Math.ceil(unit.attack*.2));}
            if(unit.keywords.includes('disarm'))other.disarm=1;
            if(unit.keywords.includes('fear'))other.fear=1;
            if(unit.cardId==='heretic')other.faith=Math.max(0,(other.faith||0)-2);
            if(unit.cardId==='alchemist'){
              const potion=this.pick(['freeze','sunder','rend','silence']);
              if(potion==='freeze')other.freeze=1;
              if(potion==='sunder')other.armor=Math.max(0,other.armor-1);
              if(potion==='rend'){other.bleed=2;other.bleedDamage=Math.max(1,Math.ceil(unit.attack*.2));}
              if(potion==='silence'){other.silence=999;other.silenceSource=unit.uid;}
              this.log('Alchemist applies '+potion+' and Venom.',true);
            }
            if(unit.cardId==='scientist'){const debuff=this.pick(['burn','freeze','weaken']);other[debuff]=debuff==='burn'?2:1;}
            if(unit.cardId==='corruptor')other.faith=Math.max(0,(other.faith||0)-1);
            if(unit.cardId==='hacker')this.stealKeyword(unit,other);
          }
        }
      }
      if(this.alive(target)&&!target.silence&&target.keywords.includes('retaliate')&&this.alive(unit))this.damage(unit,this.effectiveAttack(target,unit),target);
    }
    stealKeyword(unit,target) {
      const options=target.keywords.filter(keyword=>!unit.keywords.includes(keyword));
      if(!options.length)return;
      const keyword=this.pick(options);
      target.keywords=target.keywords.filter(value=>value!==keyword);unit.keywords.push(keyword);
      if(keyword==='armor') {
        const amount=Math.max(0,target.armor-target.bonusArmor);
        target.armor-=amount;unit.armor+=amount;
      }
      if(keyword==='ranged'){unit.range=Math.max(unit.range,target.range);target.range=this.profile(target.cardId).keywords.includes('ranged')?1:target.range;}
      this.log('Hacker steals '+keyword+' from '+this.definition(target.cardId).name+'.',true);
    }
    action(unit) {
      if(!this.alive(unit))return;
      if(unit.hostId)return;
      if(unit.silenceSource&&!this.state.units.some(u=>u.uid===unit.silenceSource)){unit.silence=0;delete unit.silenceSource;}
      if(unit.burn){unit.burn--;this.damage(unit,2,null,'burn');}
      if(!this.alive(unit))return;
      if(unit.poison){unit.poison--;this.damage(unit,Math.ceil(unit.maxHP*.2),null,'poison');}
      if(!this.alive(unit))return;
      if(unit.bleed){unit.bleed--;this.damage(unit,unit.bleedDamage||1,null,'bleed');}
      if(!this.alive(unit))return;
      if(unit.freeze){unit.freeze--;this.log(this.definition(unit.cardId).name+' is frozen.',true);return;}
      if(unit.fear){unit.fear--;const row=unit.row+(unit.team==='player'?1:-1);if(row>=0&&row<6&&!this.unitAt(row,unit.col))unit.row=row;this.log(this.definition(unit.cardId).name+' retreats in fear.',true);return;}
      unit.activations=(unit.activations||0)+1;
      if(!unit.silence&&unit.cardId==='symbiote'){
        const direction=unit.team==='player'?-1:1;
        for(const [dr,dc] of [[direction,0],[-direction,0],[0,-1],[0,1]]){const host=this.unitAt(unit.row+dr,unit.col+dc);if(host&&host.team===unit.team&&host.cardId!=='symbiote'){unit.hostId=host.uid;unit.row=host.row;unit.col=host.col;this.log('Symbiote attaches to '+this.definition(host.cardId).name+'.',true);return;}}
      }
      if(!unit.silence&&unit.cardId==='cannibal'&&!unit.consumedAlly){const ally=this.neighbors(unit,unit.team).sort((a,b)=>a.hp-b.hp)[0];if(ally){unit.consumedAlly=true;unit.attack+=ally.attack;unit.maxHP+=ally.maxHP;unit.hp+=ally.hp;this.kill(ally,unit);this.log('Cannibal devours an ally and absorbs its stats.',true);return;}}
      if(!unit.silence&&unit.keywords.includes('mirror')){const ally=this.neighbors(unit,unit.team).find(u=>u.keywords.some(k=>!unit.keywords.includes(k)));if(ally)this.grantKeyword(unit,this.pick(ally.keywords.filter(k=>!unit.keywords.includes(k))));}
      this.support(unit);
      let target=this.findTarget(unit);
      if(target&&!unit.silence&&unit.keywords.includes('pull')&&Math.abs(target.row-unit.row)>1){const row=target.row+(target.row<unit.row?1:-1);if(!this.unitAt(row,target.col)){target.row=row;this.log('Space monk pulls an enemy closer.',true);}}
      if(target&&!unit.silence&&unit.cardId==='ai-girlfriend'&&!unit.usedCharm&&!this.mentalImmune(target)){
        unit.usedCharm=true;target.originalTeam=target.team;target.team=unit.team;target.charmed=true;this.log('Charm takes control of '+this.definition(target.cardId).name+' for its next activation.',true);
      }
      else if(target){if(unit.disarm){unit.disarm--;this.log(this.definition(unit.cardId).name+' is disarmed.',true);}else this.attack(unit,target);}
      else {
        const direction=unit.team==='player'?-1:1;const next=unit.row+direction;const enemyBase=unit.team==='player'?0:5;
        if(next===enemyBase&&!this.unitAt(next,unit.col)&&!(unit.cardId==='agent'&&unit.deployedTurn===this.state.turn)&&!unit.disarm) {
          const damage=this.effectiveAttack(unit);unit.stealth=false;
          if(unit.team==='player')this.state.enemyHP=Math.max(0,this.state.enemyHP-damage);else this.state.playerHP=Math.max(0,this.state.playerHP-damage);
          this.log(this.definition(unit.cardId).name+' hits the '+(unit.team==='player'?'enemy':'your')+' base for '+damage+'.',true);
        } else if(next>=0&&next<=5&&next!==enemyBase&&!this.unitAt(next,unit.col)&&!(unit.keywords.includes('stationary')&&!unit.silence)) {
          unit.row=next;this.log(this.definition(unit.cardId).name+' advances.',true);
          if(unit.keywords.includes('rush')&&!unit.silence&&!unit.disarm) {const rushTarget=this.findTarget(unit);if(rushTarget)this.attack(unit,rushTarget);else if(unit.row+direction===enemyBase&&!this.unitAt(enemyBase,unit.col)&&!(unit.cardId==='agent'&&unit.deployedTurn===this.state.turn)) {
            const damage=this.effectiveAttack(unit);if(unit.team==='player')this.state.enemyHP=Math.max(0,this.state.enemyHP-damage);else this.state.playerHP=Math.max(0,this.state.playerHP-damage);this.log('Rush strikes the base for '+damage+'.',true);
          }}
        }
      }
      if(unit.weaken)unit.weaken--;if(unit.silence&&!unit.silenceSource)unit.silence--;
    }
    activate(team) {
      const manaKey=team==='player'?'mana':'enemyMana';this.state[manaKey]=3+this.state.units.filter(u=>u.team===team&&u.cardId==='mage'&&!u.silence).length;
      const snapshot=this.state.units.filter(u=>u.team===team).sort((a,b)=>team==='player'?a.row-b.row||a.col-b.col:b.row-a.row||b.col-a.col);
      for(const unit of snapshot){if(this.state.playerHP<=0||this.state.enemyHP<=0)break;if(unit.team!==team)continue;this.action(unit);if(this.alive(unit)&&unit.charmed){unit.team=unit.originalTeam;delete unit.originalTeam;unit.charmed=false;unit.weaken=1;this.log('Charm ends; '+this.definition(unit.cardId).name+' is weakened.',true);}}
    }
    enemyDeploy() {
      const s=this.state;const pools=[['caveman','raider','alien'],['robot','mage','raider'],['templar','viking','psychic'],['cyborg','witch','cleric'],['mech','warlord','necromancer','mage']];
      // Constant pressure, with extra waves in the later encounters.
      const count=s.encounter>=2&&s.turn%2===0?2:1;
      for(let i=0;i<count;i++) {
        const spaces=[];for(let row=0;row<3;row++)for(let col=0;col<6;col++)if(!this.unitAt(row,col))spaces.push({row,col});
        if(!spaces.length)return;
        const threats=s.units.filter(u=>u.team==='player'&&u.row<=2);
        const defend=spaces.filter(p=>p.row===0&&threats.some(u=>u.col===p.col));
        const space=this.pick(defend.length?defend:spaces.filter(p=>p.row===0).length?spaces.filter(p=>p.row===0):spaces);
        const id=s.nextEnemyCard||this.pick(pools[s.encounter]);this.spawnEnemy(id,space.row,space.col);s.nextEnemyCard=this.pick(pools[s.encounter]);this.log('Enemy deploys '+this.definition(id).name+'.',true);
      }
    }
    checkOutcome() {
      const s=this.state;
      if(['camp','battle-lost','won','lost'].includes(s.phase))return true;
      if(s.playerHP<=0){s.lives=Math.max(0,s.lives-1);s.phase=s.lives===0?'lost':'battle-lost';this.log(s.lives===0?'All three lives are gone. The expedition ends.':'Battle lost. '+s.lives+' lives remain. Rebuild your army and try again.',true);return true;}
      if(s.enemyHP<=0) {
        s.gold+=50+s.encounter*20;
        if(s.encounter===4){s.phase='won';this.log('The final base falls. Expedition complete!',true);}
        else {s.phase='camp';s.rewards=[];this.log('Victory! Your next battle starts with full health and a new army.',true);}
        return true;
      }return false;
    }
    endTurn() {
      if(this.state.phase!=='planning'||this.state.pendingChoice)return [];
      this.frames=[];this.state.selected=null;this.state.phase='player-action';this.log('Your army activates.',true);this.activate('player');
      if(this.checkOutcome())return this.frames;
      this.state.phase='enemy-action';this.log('Enemy turn.',true);this.enemyDeploy();this.activate('enemy');
      if(this.checkOutcome())return this.frames;
      this.state.turn++;const income=this.income();this.state.gold+=income;this.refreshShop();this.state.phase='planning';this.log('Turn '+this.state.turn+': +'+income+' gold. Shop refreshed.',true);return this.frames;
    }
    buyCamp(item) {
      const s=this.state;if(s.phase!=='camp')return false;
      if(item==='war-banner'&&s.gold>=80&&!s.artifacts.includes(item)){s.gold-=80;s.artifacts.push(item);return true;}
      return false;
    }
    continueRun() {if(!['camp','battle-lost'].includes(this.state.phase)||this.state.lives<=0)return false;if(this.state.phase==='camp')this.state.encounter++;this.beginEncounter();return true;}
    restore(value) {
      if(!value||value.version!==1||!['planning','reward','camp','battle-lost','won','lost'].includes(value.phase)||!Number.isInteger(value.encounter)||value.encounter<0||value.encounter>4||!Array.isArray(value.deck)||!value.deck.every(id=>this.isCard(id))||!Array.isArray(value.units))return false;
      if(value.progressionRevision>=2&&(!Number.isInteger(value.lives)||value.lives<0||value.lives>3||value.phase==='lost'&&value.lives!==0||value.phase!=='lost'&&value.lives===0))return false;
      const seen=new Set();for(const u of value.units){const key=u.row+','+u.col;if(!this.definition(u.cardId)||!u.hostId&&seen.has(key)||u.row<0||u.row>5||u.col<0||u.col>5||!['player','enemy'].includes(u.team))return false;if(!u.hostId)seen.add(key);}
      this.state=copy(value);this.state.selected=null;
      if((this.state.progressionRevision||1)<2){this.state.progressionRevision=2;this.state.lives=this.state.phase==='lost'?2:3;if(this.state.phase==='lost')this.state.phase='battle-lost';if(this.state.phase==='reward')this.state.phase='camp';this.state.rewards=[];}
      this.state.merge=Array.from({length:6},(_,index)=>(this.state.merge||[])[index]||null);
      if((this.state.balanceRevision||1)<2) {
        for(const unit of this.state.units){unit.maxHP=Math.max(2,Math.round(unit.maxHP*.75));unit.hp=Math.max(1,Math.min(unit.maxHP,Math.round(unit.hp*.75)));}
        this.state.balanceRevision=2;
      }
      if((this.state.economyRevision||1)<2){this.state.economyRevision=2;this.state.gold=Math.max(6,this.state.gold);this.state.deck=[...this.state.hand,...this.state.merge.filter(Boolean),...this.state.units.filter(u=>u.team==='player'&&this.isCard(u.cardId)).map(u=>u.cardId)];this.state.draw=[];this.state.discard=[];this.state.pendingChoice=null;this.refreshShop();}
      if(this.state.economyRevision<3){this.state.gold*=10;this.state.economyRevision=3;}
      this.state.shop=this.state.shop||[];this.state.nextEnemyCard=this.state.nextEnemyCard||this.pick(this.enemyPool());
      if((this.state.enemyDifficultyRevision||1)<2){
        const ratio=(1.65+this.state.encounter*.1)/(1.25+this.state.encounter*.05);
        for(const unit of this.state.units){if((unit.originalTeam||unit.team)!=='enemy'||!this.isCard(unit.cardId))continue;const previous=unit.maxHP;unit.maxHP=Math.ceil(previous*ratio);unit.hp=Math.min(unit.maxHP,Math.max(1,Math.round(unit.hp*unit.maxHP/previous)));unit.attack+=1;}
        const previous=this.state.enemyMaxHP;this.state.enemyMaxHP=48+this.state.encounter*12;this.state.enemyHP=Math.round(this.state.enemyHP*this.state.enemyMaxHP/previous);this.state.enemyDifficultyRevision=2;
      }
      if((this.state.mergeInteractionRevision||1)<2){this.state.hand.push(...this.state.merge.filter(Boolean));this.state.merge=Array(6).fill(null);this.state.mergeInteractionRevision=2;}
      for(const unit of this.state.units){unit.faith=unit.faith??(this.definition(unit.cardId).theme==='Faith'?3:0);unit.activations=unit.activations||0;}
      return true;
    }
  }
  return {Game,symbols};
});
