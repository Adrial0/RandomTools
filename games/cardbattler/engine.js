(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardBattle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const symbols = {robot:'▣',alien:'♧',mage:'✦',engineer:'⚒',thief:'♠',raider:'⚔',caveman:'◆',acolyte:'✝',pyro:'♨',mech:'▣',warlord:'♛',necromancer:'☠',cleric:'✝',templar:'♜',inquisitor:'✠',mindguard:'◉',witch:'✧',battlemage:'✦',viking:'⚔',shaman:'❋',sentinel:'▥',mechanic:'⚙',artificer:'⚒',enforcer:'♜',cyborg:'▣',psychic:'◉',warlock:'✧',mutant:'♧',leader:'♛',heretic:'☠',pirate:'⚑',scientist:'⚗',blob:'●'};
  const supported = new Set(['robot','alien','mage','engineer','thief','raider','caveman','acolyte','artificer','mechanic','enforcer','cyborg','sentinel','psychic','warlock','shaman','templar','cleric','mutant','leader','heretic','pirate','scientist','viking','witch','battlemage','pyro','mech','warlord','necromancer','mindguard','inquisitor']);
  const abilityTexts = {
    mage:'Arcane splash: deals mental damage to its target and the tiles on either side.',
    acolyte:'Support: heals the most injured adjacent ally for 2 before acting.',
    cleric:'Healing: restores 4 health to the most injured adjacent ally before acting.',
    mechanic:'Repair: grants an adjacent ally 1 armor before acting (up to +2).',
    artificer:'Arcane splash: hits its target and the tiles on either side.',
    psychic:'Mental attack. Weakens its target for its next activation.',
    shaman:'Arcane splash: hits its target and the tiles on either side.',
    warlock:'Arcane splash. Exploit deals 30% more damage to afflicted targets.',
    leader:'Command: nearby allies deal 10% more damage.',
    heretic:'Hex: weakens its target for its next activation.',
    pirate:'Plunder: a kill earns 1 gold.',
    scientist:'Experiment: attacks randomly burn, freeze, or weaken the target.',
    witch:'Attacks weaken and silence their target for its next activation.',
    battlemage:'Flame splash: hits its target and the tiles on either side, applying burn.',
    pyro:'Burns the unit ahead and units to the left and right of that target.',
    mech:'Ranged. On death, explodes into all 8 neighboring tiles, hitting both sides, then ejects a pilot.',
    warlord:'Allies in the 8 neighboring tiles deal 20% more damage.',
    necromancer:'Enemy deaths caused by its team leave allied skeletons on eligible empty tiles.',
    mindguard:'Immune to mental attacks; shares immunity with the 8 neighboring allies.',
    inquisitor:'Bonus damage against Cursed. Double damage against burning units.',
    thief:'Stealth: untargetable until its first attack.'
  };
  class Game {
    constructor(data, options = {}) {
      this.data = data;
      this.random = options.random || Math.random;
      this.cards = new Map(data.cards.map(c => [c.id, c]));
      this.recipes = data.recipes.filter(r => supported.has(r.result) && r.ingredients.every(id => supported.has(id)));
      this.state = null;
      this.frames = [];
    }
    pick(list) { return list[Math.floor(this.random() * list.length)]; }
    shuffle(list) { const result = [...list]; for (let i=result.length-1;i>0;i--) {const j=Math.floor(this.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]];} return result; }
    definition(id) {
      if (id === 'skeleton') return {id,name:'Skeleton',theme:'Fantasy',subgroup:'Cursed',tier:1,keywords:[]};
      if (id === 'mech-pilot') return {id,name:'Mech Pilot',theme:'Sci fi',subgroup:'Tech',tier:1,keywords:[{id:'ranged',value:2}]};
      return this.cards.get(id);
    }
    playable() { return this.data.cards.filter(c => supported.has(c.id)); }
    profile(id) {
      const card = this.definition(id);
      if (!card) throw new Error('Unknown card: '+id);
      const tier = card.tier || 1;
      const stats = {health:7+tier*4,attack:2+tier,cost:tier===1?1:tier===2?2:3,range:1,armor:0};
      const keywords = (card.keywords || []).filter(k=>k.status!=='tentative').map(k=>k.id);
      const armored = (card.keywords || []).find(k=>k.id==='armor');
      stats.armor = armored ? armored.value || 1 : 0;
      if (keywords.includes('ranged')) stats.range=3;
      if (['mage','artificer','psychic','warlock','shaman','scientist','witch','battlemage'].includes(id)) { stats.range=2; stats.health-=3; }
      if (['caveman','enforcer','templar','cyborg','sentinel'].includes(id)) stats.health+=4;
      if (id==='raider'||id==='viking') {stats.attack++;stats.health-=2;}
      if (id==='thief') {stats.attack++;stats.health-=2;}
      if (['acolyte','cleric','mechanic','leader'].includes(id)) stats.attack=2;
      if (id==='skeleton') Object.assign(stats,{health:3,attack:2,cost:0});
      if (id==='mech-pilot') Object.assign(stats,{health:7,attack:3,range:2,cost:0});
      if (id==='mech') {stats.health=22;stats.attack=5;stats.range=3;}
      return {...stats,keywords,description:abilityTexts[id] || 'Relies on its stats and keywords in this prototype.',symbol:symbols[id] || '◇'};
    }
    newRun() {
      this.state = {version:1, phase:'planning',encounter:0,turn:1,playerHP:45,playerMaxHP:45,enemyHP:24,enemyMaxHP:24,mana:3,gold:0,
        deck:['robot','alien','mage','engineer','thief','raider','caveman','acolyte','robot','mage','caveman','acolyte'],draw:[],discard:[],hand:[],merge:[null,null],units:[],nextId:1,log:[],rewards:[],artifacts:[],selected:null};
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
      const unit={uid:this.state.nextId++,cardId,team,row,col,hp:profile.health,maxHP:profile.health,attack:profile.attack,armor:profile.armor,range:profile.range,keywords:profile.keywords,burn:0,poison:0,freeze:0,weaken:0,silence:0,stealth:cardId==='thief',bonusArmor:0};
      this.state.units.push(unit);return unit;
    }
    unitAt(row,col) { return this.state.units.find(u=>u.row===row&&u.col===col&&u.hp>0); }
    alive(unit) { return this.state.units.includes(unit)&&unit.hp>0; }
    neighbors(unit,team) { return this.state.units.filter(u=>u.uid!==unit.uid&&u.hp>0&&(!team||u.team===team)&&Math.max(Math.abs(u.row-unit.row),Math.abs(u.col-unit.col))===1); }
    beginEncounter() {
      const s=this.state;s.phase='planning';s.turn=1;s.mana=3;s.units=[];s.hand=[];s.merge=[null,null];s.draw=this.shuffle(s.deck);s.discard=[];s.selected=null;s.enemyMaxHP=24+s.encounter*7;s.enemyHP=s.enemyMaxHP;
      const opening=[['caveman','raider'],['robot','mage','raider'],['templar','viking','mage'],['cyborg','witch','cleric'],['mech','warlord','necromancer']][s.encounter];
      opening.forEach((id,i)=>this.spawn(id,'enemy',i%2, [1,4,2][i]));
      this.drawCards(5);this.log('Battle '+(s.encounter+1)+': deploy your opening hand.');
    }
    drawCards(count) {
      const s=this.state;
      for(let i=0;i<count;i++) {
        if (!s.draw.length) {s.draw=this.shuffle(s.discard);s.discard=[];}
        if(!s.draw.length) break;
        const id=s.draw.pop();
        if(s.hand.length>=10) s.discard.push(id);else s.hand.push(id);
      }
    }
    deploy(handIndex,row,col) {
      const s=this.state;
      if(s.phase!=='planning'||!Number.isInteger(handIndex)||!Number.isInteger(row)||!Number.isInteger(col)||row<3||row>5||col<0||col>5||this.unitAt(row,col)) return false;
      const id=s.hand[handIndex];if(!id||this.profile(id).cost>s.mana) return false;
      s.mana-=this.profile(id).cost;s.hand.splice(handIndex,1);s.discard.push(id);this.spawn(id,'player',row,col);s.selected=null;this.log(this.definition(id).name+' deployed.');return true;
    }
    store(handIndex,slot) {
      const s=this.state;if(s.phase!=='planning'||![0,1].includes(slot)||s.merge[slot]||!s.hand[handIndex]) return false;
      s.merge[slot]=s.hand.splice(handIndex,1)[0];s.selected=null;return true;
    }
    retrieve(slot) {const s=this.state;if(s.phase!=='planning'||!s.merge[slot]||s.hand.length>=10) return false;s.hand.push(s.merge[slot]);s.merge[slot]=null;return true;}
    mergeOptions() {const [a,b]=this.state.merge;if(!a||!b)return [];return this.recipes.filter(r=>(r.ingredients[0]===a&&r.ingredients[1]===b)||(r.ingredients[0]===b&&r.ingredients[1]===a));}
    merge(result) {
      const s=this.state;const recipe=this.mergeOptions().find(r=>!result||r.result===result);if(s.phase!=='planning'||!recipe||s.hand.length>=10)return false;
      const ingredientIds=[...s.merge];const deck=[...s.deck];
      for(const id of ingredientIds){const index=deck.indexOf(id);if(index<0)return false;deck.splice(index,1);}
      deck.push(recipe.result);s.deck=deck;s.merge=[null,null];s.hand.push(recipe.result);this.log('Combined into '+this.definition(recipe.result).name+'. Your deck is permanently upgraded.');return true;
    }
    effectiveAttack(unit,target) {
      let multiplier=unit.weaken?0.7:1;
      if(!unit.silence) {
        this.neighbors(unit,unit.team).forEach(other=>{if(!other.silence&&other.cardId==='warlord')multiplier+=.2;if(!other.silence&&other.cardId==='leader')multiplier+=.1;});
        if(target&&unit.keywords.includes('exploit')&&(target.burn||target.poison||target.freeze||target.weaken||target.silence))multiplier+=.3;
        if(target&&unit.keywords.includes('flank')&&this.neighbors(target,unit.team).length)multiplier+=.3;
        if(unit.cardId==='inquisitor'&&target) {if(this.definition(target.cardId).subgroup==='Cursed')multiplier+=.5;if(target.burn)multiplier*=2;}
      }
      if(this.state.artifacts.includes('war-banner')&&unit.team==='player')multiplier+=.15;
      return Math.max(1,Math.round(unit.attack*multiplier));
    }
    mentalImmune(unit) {return !unit.silence&&unit.cardId==='mindguard'||this.neighbors(unit,unit.team).some(u=>u.cardId==='mindguard'&&!u.silence);}
    damage(target,amount,source,type='physical') {
      if(!this.alive(target))return 0;
      if(type==='mental'&&this.mentalImmune(target)){this.log(this.definition(target.cardId).name+' blocks mental damage.',true);return 0;}
      const actual=type==='physical'?Math.max(1,amount-(target.silence?0:target.armor)):amount;
      target.hp-=actual;
      this.log(this.definition(target.cardId).name+' takes '+actual+' damage.',true);
      if(target.hp<=0)this.kill(target,source);
      return actual;
    }
    kill(target,source) {
      if(!this.state.units.includes(target))return;
      const {row,col,team,cardId}=target;this.state.units=this.state.units.filter(u=>u!==target);
      this.log(this.definition(cardId).name+' falls.',true);
      if(source&&this.alive(source)&&!source.silence) {
        if(source.keywords.includes('fury')){source.attack++;source.maxHP++;source.hp++;}
        if(source.cardId==='pirate'&&source.team==='player')this.state.gold++;
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
      if(['acolyte','cleric'].includes(unit.cardId)) {
        const ally=this.neighbors(unit,unit.team).filter(u=>u.hp<u.maxHP).sort((a,b)=>(b.maxHP-b.hp)-(a.maxHP-a.hp))[0];
        if(ally){const amount=unit.cardId==='cleric'?4:2;ally.hp=Math.min(ally.maxHP,ally.hp+amount);this.log(this.definition(unit.cardId).name+' heals '+this.definition(ally.cardId).name+'.',true);}
      }
      if(unit.cardId==='mechanic') {const ally=this.neighbors(unit,unit.team).filter(u=>u.bonusArmor<2)[0];if(ally){ally.armor++;ally.bonusArmor++;this.log('Mechanic reinforces an ally.',true);}}
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
      const aoe=!unit.silence&&['mage','artificer','shaman','warlock','battlemage','pyro'].includes(unit.cardId);
      const mental=!unit.silence&&['mage','artificer','shaman','warlock','psychic'].includes(unit.cardId);
      const targets=aoe?[target,...[-1,1].map(offset=>this.unitAt(target.row,target.col+offset)).filter(other=>other&&other.team!==unit.team)]:[target];
      const retaliate=!target.silence&&target.keywords.includes('retaliate');
      this.log(this.definition(unit.cardId).name+' attacks '+this.definition(target.cardId).name+'.',true);
      for(const other of targets) {
        if(!this.alive(other)||!this.alive(unit))continue;
        const amount=this.effectiveAttack(unit,other);const dealt=this.damage(other,amount,unit,mental?'mental':aoe?'area':'physical');
        if(!unit.silence&&dealt) {
          if(unit.keywords.includes('lifesteal'))unit.hp=Math.min(unit.maxHP,unit.hp+dealt);
          if(this.alive(other)) {
            if(unit.keywords.includes('ignite')||unit.cardId==='pyro'||unit.cardId==='battlemage')other.burn=2;
            if(unit.keywords.includes('venom'))other.poison=2;
            if(unit.keywords.includes('weaken')||unit.cardId==='heretic')other.weaken=2;
            if(unit.keywords.includes('silence'))other.silence=2;
            if(unit.cardId==='scientist')other[this.pick(['burn','freeze','weaken'])]=2;
          }
        }
      }
      if(retaliate&&this.alive(target)&&this.alive(unit))this.damage(unit,this.effectiveAttack(target,unit),target);
    }
    action(unit) {
      if(!this.alive(unit))return;
      if(unit.burn){unit.burn--;this.damage(unit,2,null,'burn');}
      if(!this.alive(unit))return;
      if(unit.poison){unit.poison--;this.damage(unit,Math.ceil(unit.maxHP*.2),null,'poison');}
      if(!this.alive(unit))return;
      if(unit.freeze){unit.freeze--;this.log(this.definition(unit.cardId).name+' is frozen.',true);return;}
      this.support(unit);
      const target=this.findTarget(unit);
      if(target)this.attack(unit,target);
      else {
        const direction=unit.team==='player'?-1:1;const next=unit.row+direction;const enemyBase=unit.team==='player'?0:5;
        if(next===enemyBase&&!this.unitAt(next,unit.col)) {
          const damage=this.effectiveAttack(unit);unit.stealth=false;
          if(unit.team==='player')this.state.enemyHP=Math.max(0,this.state.enemyHP-damage);else this.state.playerHP=Math.max(0,this.state.playerHP-damage);
          this.log(this.definition(unit.cardId).name+' hits the '+(unit.team==='player'?'enemy':'your')+' base for '+damage+'.',true);
        } else if(next>=0&&next<=5&&next!==enemyBase&&!this.unitAt(next,unit.col)&&!(unit.keywords.includes('stationary')&&!unit.silence)) {
          unit.row=next;this.log(this.definition(unit.cardId).name+' advances.',true);
          if(unit.keywords.includes('rush')&&!unit.silence) {const rushTarget=this.findTarget(unit);if(rushTarget)this.attack(unit,rushTarget);else if(unit.row+direction===enemyBase&&!this.unitAt(enemyBase,unit.col)) {
            const damage=this.effectiveAttack(unit);if(unit.team==='player')this.state.enemyHP=Math.max(0,this.state.enemyHP-damage);else this.state.playerHP=Math.max(0,this.state.playerHP-damage);this.log('Rush strikes the base for '+damage+'.',true);
          }}
        }
      }
      if(unit.weaken)unit.weaken--;if(unit.silence)unit.silence--;
    }
    activate(team) {
      const snapshot=this.state.units.filter(u=>u.team===team).sort((a,b)=>team==='player'?a.row-b.row||a.col-b.col:b.row-a.row||b.col-a.col);
      for(const unit of snapshot){if(this.state.playerHP<=0||this.state.enemyHP<=0)break;this.action(unit);}
    }
    enemyDeploy() {
      const s=this.state;const pools=[['caveman','raider','alien'],['robot','mage','raider'],['templar','viking','psychic'],['cyborg','witch','cleric'],['mech','warlord','necromancer','mage']];
      // A reinforcement every other turn leaves room for deck-building rather than a constant flood.
      if(s.turn%2===0)return;
      const count=s.encounter>=3&&s.turn%5===0?2:1;
      for(let i=0;i<count;i++) {
        const spaces=[];for(let row=0;row<3;row++)for(let col=0;col<6;col++)if(!this.unitAt(row,col))spaces.push({row,col});
        if(!spaces.length)return;
        const threats=s.units.filter(u=>u.team==='player'&&u.row<=2);
        const defend=spaces.filter(p=>p.row===0&&threats.some(u=>u.col===p.col));
        const space=this.pick(defend.length?defend:spaces.filter(p=>p.row===0).length?spaces.filter(p=>p.row===0):spaces);
        const id=this.pick(pools[s.encounter]);this.spawn(id,'enemy',space.row,space.col);this.log('Enemy deploys '+this.definition(id).name+'.',true);
      }
    }
    checkOutcome() {
      const s=this.state;
      if(s.playerHP<=0){s.phase='lost';this.log('Your base has fallen. The expedition ends.',true);return true;}
      if(s.enemyHP<=0) {
        s.gold+=5+s.encounter*2;
        if(s.encounter===4){s.phase='won';this.log('The final base falls. Expedition complete!',true);}
        else {s.phase='reward';s.rewards=this.shuffle(this.playable().filter(c=>c.tier<=Math.min(3,2+Math.floor(s.encounter/2)))).slice(0,3).map(c=>c.id);this.log('Victory! Choose a card for your deck.',true);}
        return true;
      }return false;
    }
    endTurn() {
      if(this.state.phase!=='planning')return [];
      this.frames=[];this.state.selected=null;this.state.phase='player-action';this.log('Your army activates.',true);this.activate('player');
      if(this.checkOutcome())return this.frames;
      this.state.phase='enemy-action';this.log('Enemy turn.',true);this.enemyDeploy();this.activate('enemy');
      if(this.checkOutcome())return this.frames;
      this.state.turn++;this.state.mana=3;this.drawCards(2);this.state.phase='planning';this.log('Turn '+this.state.turn+': draw 2, refresh mana.',true);return this.frames;
    }
    chooseReward(id) {
      const s=this.state;if(s.phase!=='reward'||!s.rewards.includes(id))return false;
      s.deck.push(id);s.phase='camp';s.rewards=[];this.log(this.definition(id).name+' joins your deck.');return true;
    }
    buyCamp(item) {
      const s=this.state;if(s.phase!=='camp')return false;
      if(item==='heal'&&s.gold>=4&&s.playerHP<s.playerMaxHP){s.gold-=4;s.playerHP=Math.min(s.playerMaxHP,s.playerHP+10);return true;}
      if(item==='war-banner'&&s.gold>=8&&!s.artifacts.includes(item)){s.gold-=8;s.artifacts.push(item);return true;}
      return false;
    }
    continueRun() {if(this.state.phase!=='camp')return false;this.state.encounter++;this.beginEncounter();return true;}
    restore(value) {
      if(!value||value.version!==1||!['planning','reward','camp','won','lost'].includes(value.phase)||!Number.isInteger(value.encounter)||value.encounter<0||value.encounter>4||!Array.isArray(value.deck)||!value.deck.every(id=>supported.has(id))||!Array.isArray(value.units))return false;
      const seen=new Set();for(const u of value.units){const key=u.row+','+u.col;if(!this.definition(u.cardId)||seen.has(key)||u.row<0||u.row>5||u.col<0||u.col>5||!['player','enemy'].includes(u.team))return false;seen.add(key);}
      this.state=copy(value);this.state.selected=null;return true;
    }
  }
  return {Game,supported,symbols};
});
