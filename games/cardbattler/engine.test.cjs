const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Game} = require('./engine.js');
const data = {cards:JSON.parse(fs.readFileSync(path.join(__dirname,'data/cards.json'),'utf8')).cards,recipes:JSON.parse(fs.readFileSync(path.join(__dirname,'data/merges.json'),'utf8')).recipes};
function fresh(){const g=new Game(data,{random:()=>.3});g.newRun();g.state.deck=['robot','alien','mage','engineer','thief','raider','caveman','acolyte','robot','mage','caveman','acolyte'];g.state.units=[];g.state.log=[];return g;}
test('retired merge-row saves return stored cards to the hand exactly once',()=>{
 const g=fresh();delete g.state.mergeInteractionRevision;g.state.hand=['robot'];g.state.merge=['blob:3','mage',null,null,null,null];g.state.deck=['robot','blob:3','mage'];const loaded=new Game(data);assert.ok(loaded.restore(g.state));assert.deepEqual(loaded.state.hand,['robot','blob:3','mage']);assert.ok(loaded.state.merge.every(id=>id===null));assert.deepEqual(loaded.state.deck,g.state.deck);const again=new Game(data);assert.ok(again.restore(loaded.state));assert.deepEqual(again.state.hand,loaded.state.hand);
});
test('gold scaling migrates saved balances once and charges scaled shop and artifact prices',()=>{
 const g=fresh();g.state.economyRevision=2;g.state.gold=17;const loaded=new Game(data);assert.ok(loaded.restore(g.state));assert.equal(loaded.state.gold,170);assert.equal(loaded.state.economyRevision,3);const again=new Game(data);assert.ok(again.restore(loaded.state));assert.equal(again.state.gold,170);assert.equal(again.profile('robot').price,10);assert.equal(again.profile('cleric').price,30);assert.equal(again.profile('posthuman').price,50);assert.ok(again.rerollShop());assert.equal(again.state.gold,160);again.state.phase='camp';assert.ok(again.buyCamp('war-banner'));assert.equal(again.state.gold,80);
});
test('Blob self-merges repeatedly, retains colors and upgrades, and survives saving',()=>{
 const g=fresh();g.state.hand=['blob','blob','blob'];g.state.deck=[...g.state.hand];
 assert.ok(g.mergeCards({zone:'hand',index:0},{zone:'hand',index:1}));
 const combined=g.state.hand.find(id=>id==='blob:2');assert.ok(combined);
 assert.deepEqual(g.definition(combined).colors,g.definition('blob').colors);
 assert.ok(g.profile(combined).health>g.profile('blob').health*2);
 assert.ok(g.mergeCards({zone:'hand',index:0},{zone:'hand',index:1}));assert.deepEqual(g.state.hand,['blob:3']);
 const restored=new Game(data);assert.ok(restored.restore(g.state));assert.deepEqual(restored.state.hand,['blob:3']);
 assert.deepEqual(g.recipesFor('robot','robot'),[]);
});

test('deployment accepts own base row and rejects enemy territory and occupied tiles',()=>{
 const g=fresh();g.state.hand=['robot','mage'];const gold=g.state.gold;assert.equal(g.deploy(0,2,0),false);assert.equal(g.deploy(0,5,0),true);assert.equal(g.deploy(0,5,0),false);assert.equal(g.state.gold,gold);
});
test('normal unit moves once without attacking after movement; Rush can do both',()=>{
 const g=fresh();const ordinary=g.spawn('robot','player',4,1);const target=g.spawn('caveman','enemy',2,1);g.action(ordinary);assert.equal(ordinary.row,3);assert.equal(target.hp,target.maxHP);
 g.state.units=[];const rush=g.spawn('raider','player',4,1);const victim=g.spawn('caveman','enemy',2,1);g.action(rush);assert.equal(rush.row,3);assert.ok(victim.hp<victim.maxHP);
});
test('base defender absorbs attacks, and attacker never enters the opposing base row',()=>{
 const g=fresh();const attacker=g.spawn('robot','player',1,0);const defender=g.spawn('robot','enemy',0,0);const hp=g.state.enemyHP;g.action(attacker);assert.equal(g.state.enemyHP,hp);assert.ok(defender.hp<defender.maxHP);g.state.units=g.state.units.filter(u=>u!==defender);g.action(attacker);assert.ok(g.state.enemyHP<hp);assert.equal(attacker.row,1);
});
test('enemy cannot walk onto player base and must defeat its defender',()=>{
 const g=fresh();const attacker=g.spawn('caveman','enemy',4,5);const defender=g.spawn('robot','player',5,5);g.action(attacker);assert.equal(g.state.playerHP,45);assert.ok(defender.hp<defender.maxHP);assert.equal(attacker.row,4);
});
test('activation order is mirrored and a movement snapshot prevents double activation',()=>{
 const g=fresh();const a=g.spawn('robot','player',5,3),b=g.spawn('robot','player',4,4),c=g.spawn('robot','player',4,0);const seen=[];g.action=u=>seen.push(u.uid);g.activate('player');assert.deepEqual(seen,[c.uid,b.uid,a.uid]);
 const x=g.spawn('robot','enemy',0,0),y=g.spawn('robot','enemy',1,0),z=g.spawn('robot','enemy',1,5);seen.length=0;g.activate('enemy');assert.deepEqual(seen,[z.uid,y.uid,x.uid]);
 const h=fresh();const mover=h.spawn('robot','player',5,0);h.activate('player');assert.equal(mover.row,4);
});
test('healer activation heals before an adjacent ally later activates',()=>{
 const g=fresh();g.spawn('acolyte','player',3,0);const ally=g.spawn('robot','player',3,1);ally.hp=3;g.activate('player');assert.equal(ally.hp,5);
});
test('recipe merges permanently replace ingredients and do not duplicate draw cards',()=>{
 const g=fresh();g.state.hand=['robot','mage'];assert.ok(g.store(0,0));assert.ok(g.store(0,1));const before=g.state.deck.length;assert.ok(g.merge('artificer'));assert.equal(g.state.deck.length,before-1);assert.deepEqual(g.state.hand,['artificer']);assert.ok(g.state.merge.every(id=>id===null));assert.equal(g.state.deck.filter(id=>id==='artificer').length,1);
});
test('invalid merge keeps cards and deck intact',()=>{
 const g=fresh();g.state.hand=['robot','robot'];g.store(0,0);g.store(0,1);const deck=[...g.state.deck];assert.equal(g.merge(),false);assert.deepEqual(g.state.deck,deck);assert.deepEqual(g.state.merge.slice(0,2),['robot','robot']);assert.equal(g.retrieve(0),true);
});
test('Robot and Thief merge into Hacker in either slot order',()=>{
 for(const pair of [['robot','thief'],['thief','robot']]) {
  const g=fresh();g.state.hand=[...pair];g.store(0,0);g.store(0,1);
  assert.ok(g.mergeOptions().some(r=>r.result==='hacker'));assert.ok(g.merge('hacker'));
  assert.deepEqual(g.state.hand,['hacker']);assert.ok(g.state.deck.includes('hacker'));
 }
});
test('Hacker steals a surviving target keyword and transfers armor',()=>{
 const g=fresh();const hacker=g.spawn('hacker','player',3,0),target=g.spawn('cyborg','enemy',2,0);
 assert.equal(target.armor,1);g.action(hacker);assert.ok(hacker.keywords.includes('armor'));
 assert.equal(hacker.armor,1);assert.equal(target.armor,0);assert.ok(!target.keywords.includes('armor'));
 g.action(hacker);assert.equal(hacker.armor,1);
});
test('Warlord applies 20% attack aura to neighbors, not itself',()=>{
 const g=fresh();const warlord=g.spawn('warlord','player',3,3),ally=g.spawn('caveman','player',4,4);ally.attack=10;warlord.attack=10;assert.equal(g.effectiveAttack(ally),12);assert.equal(g.effectiveAttack(warlord),10);ally.col=5;assert.equal(g.effectiveAttack(ally),10);
});
test('Mindguard protects all eight neighboring allies from mental but not physical attacks',()=>{
 const g=fresh();g.spawn('mindguard','player',3,3);const ally=g.spawn('robot','player',4,4),enemy=g.spawn('mage','enemy',2,4);const hp=ally.hp;g.damage(ally,6,enemy,'mental');assert.equal(ally.hp,hp);g.damage(ally,6,enemy);assert.ok(ally.hp<hp);
});
test('Pyro burns a forward target and its two side neighbors',()=>{
 const g=fresh();const pyro=g.spawn('pyro','player',3,2);const targets=[1,2,3].map(col=>g.spawn('caveman','enemy',2,col));g.action(pyro);assert.ok(targets.every(u=>u.burn===2));
});
test('Mech death damages both teams diagonally and ejects a pilot',()=>{
 const g=fresh();const mech=g.spawn('mech','player',3,3),ally=g.spawn('caveman','player',4,4),enemy=g.spawn('caveman','enemy',2,2);const allyHP=ally.hp,enemyHP=enemy.hp;g.damage(mech,100,enemy,'area');assert.equal(ally.hp,allyHP-5);assert.equal(enemy.hp,enemyHP-5);assert.equal(g.unitAt(3,3).cardId,'mech-pilot');
});
test('new skeletons do not activate during the snapshot in which they are spawned',()=>{
 const g=fresh();g.spawn('necromancer','player',4,0);const attacker=g.spawn('caveman','player',3,2);const target=g.spawn('robot','enemy',2,2);target.hp=1;g.activate('player');const skeleton=g.state.units.find(u=>u.cardId==='skeleton');assert.ok(skeleton);assert.equal(skeleton.row,2);assert.equal(skeleton.col,2);
});
test('turn alternates both armies, grants gold, and refreshes shop without drawing',()=>{
 const g=fresh();const a=g.spawn('robot','player',5,5),b=g.spawn('robot','enemy',0,4);const hand=g.state.hand.length,gold=g.state.gold;assert.ok(g.endTurn().length);assert.equal(a.row,4);assert.equal(b.row,1);assert.equal(g.state.turn,2);assert.equal(g.state.gold,gold+10);assert.equal(g.state.shop.length,6);assert.equal(g.state.hand.length,hand);assert.equal(g.state.phase,'planning');
});
test('victory preserves lives and gold but resets health and every card zone for the next battle',()=>{
 const g=fresh();g.state.enemyHP=0;g.state.playerHP=30;g.state.hand=['robot'];g.state.merge[0]='blob:3';g.spawn('mage','player',5,0);const gold=g.state.gold;assert.ok(g.checkOutcome());assert.equal(g.state.phase,'camp');assert.equal(g.state.lives,3);assert.equal(g.state.gold,gold+50);g.checkOutcome();assert.equal(g.state.gold,gold+50);assert.equal(g.buyCamp('heal'),false);assert.ok(g.continueRun());assert.equal(g.state.playerHP,45);assert.equal(g.state.encounter,1);assert.deepEqual(g.state.hand,[]);assert.deepEqual(g.state.deck,[]);assert.ok(g.state.merge.every(id=>id===null));assert.ok(g.state.units.every(u=>u.team==='enemy'));assert.equal(g.state.shop.length,6);
});
test('final battle victory and defeat terminate the run',()=>{
 const g=fresh();g.state.encounter=4;g.state.enemyHP=0;g.checkOutcome();assert.equal(g.state.phase,'won');const h=fresh();h.state.lives=1;h.state.playerHP=0;h.checkOutcome();assert.equal(h.state.phase,'lost');assert.equal(h.state.lives,0);assert.equal(h.continueRun(),false);assert.deepEqual(h.endTurn(),[]);
});
test('saved runs round trip and overlapping or unknown units are rejected',()=>{
 const g=fresh();g.spawn('robot','player',5,0);const h=new Game(data);assert.ok(h.restore(JSON.parse(JSON.stringify(g.state))));assert.equal(h.state.units[0].cardId,'robot');const invalid=JSON.parse(JSON.stringify(g.state));invalid.units.push({...invalid.units[0],uid:999});assert.equal(h.restore(invalid),false);
});
test('all 80 source cards are playable, deployable, and safe to activate',()=>{
 const g=fresh();assert.equal(g.playable().length,80);
 for(const card of data.cards){const h=fresh();h.state.hand=[card.id];h.state.mana=3;assert.ok(h.deploy(0,3,2),card.name);const unit=h.unitAt(3,2);h.spawn('caveman','enemy',2,2);assert.doesNotThrow(()=>h.action(unit),card.name);assert.ok(h.profile(card.id).health>0);}
});
test('all 72 recipes merge in both slot orders and preserve the result in the deck',()=>{
 const g=fresh();assert.equal(g.recipes.length,72);
 for(const recipe of data.recipes)for(const ingredients of [recipe.ingredients,[...recipe.ingredients].reverse()]) {
  const h=fresh();h.state.deck=[...ingredients];h.state.hand=[...ingredients];h.store(0,0);h.store(0,1);
  assert.ok(h.merge(recipe.result),recipe.id);assert.deepEqual(h.state.deck,[recipe.result]);assert.deepEqual(h.state.hand,[recipe.result]);
 }
});
test('saved runs accept formerly excluded cards and mark unfinished effects honestly',()=>{
 const g=fresh();g.state.deck=['symbiote','buddhist','shipwright','posthuman'];g.state.hand=['symbiote'];g.deploy(0,5,0);const h=new Game(data);assert.ok(h.restore(g.state));
 assert.equal(g.profile('symbiote').pendingAbility,false);assert.ok(!g.profile('space-monk').pendingKeywords.includes('pull'));assert.equal(g.profile('shipwright').pendingAbility,true);assert.equal(g.profile('posthuman').pendingAbility,false);
 for(const card of data.cards.filter(c=>c.id!=='posthuman')){assert.ok(g.profile('posthuman').health>g.profile(card.id).health);assert.ok(g.profile('posthuman').attack>g.profile(card.id).attack);}
});
test('every recipe combines disjoint colors and the result inherits their union',()=>{
 const g=fresh();for(const card of data.cards)assert.equal(g.profile(card.id).colors.length,card.tier===1?1:card.tier===2?2:4,card.id);
 for(const recipe of data.recipes){const [a,b]=recipe.ingredients;assert.deepEqual(g.sharedColors(a,b),[],recipe.id);assert.deepEqual(new Set(g.profile(recipe.result).colors),new Set([...g.profile(a).colors,...g.profile(b).colors]));}
 assert.deepEqual(g.profile('artificer').colors,['red','blue']);assert.deepEqual(g.sharedColors('robot','artificer'),['red']);assert.deepEqual(g.sharedColors('robot','robot'),['red']);
 assert.deepEqual(g.profile('cleric').colors,['blue','yellow']);
 assert.deepEqual(g.profile('robot').colors,g.profile('alien').colors);assert.deepEqual(g.profile('mage').colors,g.profile('engineer').colors);assert.deepEqual(g.profile('thief').colors,g.profile('raider').colors);assert.deepEqual(g.profile('caveman').colors,g.profile('acolyte').colors);
 assert.deepEqual(g.sharedColors('cleric','shaman'),['blue','yellow']);
});
test('shared colors block merges even if an overlapping recipe is supplied',()=>{
 const g=fresh();g.recipes.push({ingredients:['robot','artificer'],result:'mech'});g.state.merge=['robot','artificer'];assert.deepEqual(g.mergeOptions(),[]);assert.equal(g.merge(),false);
});
test('health is lower and old saved units migrate once without restarting the run',()=>{
 const g=fresh();assert.equal(g.profile('robot').health,8);assert.equal(g.profile('caveman').health,11);assert.equal(g.profile('mech').health,17);assert.equal(g.profile('posthuman').health,30);
 const unit=g.spawn('robot','player',5,0);unit.maxHP=11;unit.hp=6;delete g.state.balanceRevision;
 const h=new Game(data);assert.ok(h.restore(g.state));assert.equal(h.state.units[0].maxHP,8);assert.equal(h.state.units[0].hp,5);assert.equal(h.state.balanceRevision,2);
 const j=new Game(data);assert.ok(j.restore(h.state));assert.equal(j.state.units[0].maxHP,8);
});
test('dragging between hand and six-slot merge row combines at the drop destination',()=>{
 for(const from of ['hand','merge'])for(const to of ['hand','merge']){
  const g=fresh();g.state.hand=[];g.state.merge=Array(6).fill(null);g.state.deck=['robot','mage','caveman'];
  const source={zone:from,index:from===to?0:1},target={zone:to,index:from===to?1:4};
  if(from==='hand')source.index=0;if(to==='hand')target.index=from==='hand'?1:0;
  g.state[from][source.index]='robot';g.state[to][target.index]='mage';g.state.hand=g.state.hand.filter(Boolean);
  assert.ok(g.mergeCards(source,target),from+' to '+to);assert.deepEqual(g.state.deck,['caveman','artificer']);assert.equal([...g.state.hand,...g.state.merge].filter(Boolean).join(','),'artificer');
 }
});
test('invalid drops, self drops, and busy-phase drops leave all cards unchanged',()=>{
 const g=fresh();g.state.hand=['robot','robot'];const before=JSON.stringify(g.state);assert.equal(g.mergeCards({zone:'hand',index:0},{zone:'hand',index:1}),false);assert.equal(g.mergeCards({zone:'hand',index:0},{zone:'hand',index:0}),false);assert.equal(JSON.stringify(g.state),before);
 g.state.hand=['robot','mage'];g.state.phase='enemy-action';assert.equal(g.mergeCards({zone:'hand',index:0},{zone:'hand',index:1}),false);
});
test('all row slots accept cards; moving a card preserves deck and unrelated slots',()=>{
 const g=fresh();g.state.hand=['robot','mage'];const deck=[...g.state.deck];assert.ok(g.store(0,5));assert.ok(g.store(0,3));assert.ok(g.moveMergeCard({zone:'merge',index:5},1));assert.equal(g.state.merge[1],'robot');assert.equal(g.state.merge[3],'mage');assert.equal(g.state.merge[5],null);assert.deepEqual(g.state.deck,deck);
});
test('shop replaces opening draws and charges once for a purchased card',()=>{
 const g=new Game(data,{random:()=>.3});g.newRun();assert.equal(g.state.hand.length,0);assert.equal(g.state.gold,60);assert.equal(g.state.shop.length,6);
 const id=g.state.shop[0],price=g.profile(id).price;assert.ok(g.buyCard(0));assert.equal(g.state.gold,60-price);assert.deepEqual(g.state.hand,[id]);assert.deepEqual(g.state.deck,[id]);assert.equal(g.buyCard(0),false);
 const gold=g.state.gold;assert.ok(g.deploy(0,5,0));assert.equal(g.state.gold,gold);assert.equal(g.state.hand.length,0);
});
test('shop rejects unaffordable cards, full hands, and out-of-phase purchases',()=>{
 const g=fresh();g.state.shop=['posthuman'];g.state.gold=49;assert.equal(g.buyCard(0),false);assert.equal(g.state.gold,49);g.state.gold=50;g.state.hand=Array(10).fill('robot');assert.equal(g.buyCard(0),false);g.state.hand=[];g.state.phase='enemy-action';assert.equal(g.buyCard(0),false);
});
test('round income is 10 plus each surviving unsilenced Miner and Businessman',()=>{
 const g=fresh();g.spawn('miner','player',5,0);g.spawn('businessman','player',5,1);const disabled=g.spawn('businessman','player',5,2);disabled.silence=99;g.spawn('miner','enemy',0,0);assert.equal(g.income(),12);const gold=g.state.gold;g.endTurn();assert.equal(g.state.gold,gold+12);
});
test('stronger enemy stats do not change player stats',()=>{
 const g=fresh();const player=g.spawn('robot','player',5,0),enemy=g.spawnEnemy('robot',0,0);assert.ok(enemy.hp>player.hp);assert.ok(enemy.attack>player.attack);assert.equal(player.maxHP,8);
});
test('harder encounters cover more lanes and reinforce every round, with extra later waves',()=>{
 const g=new Game(data,{random:()=>.3});g.newRun();assert.equal(g.state.enemyMaxHP,48);assert.equal(g.state.units.length,4);assert.equal(new Set(g.state.units.map(u=>u.col)).size,4);g.state.units=[];g.state.turn=2;g.enemyDeploy();assert.equal(g.state.units.length,1);g.state.encounter=2;g.state.units=[];g.enemyDeploy();assert.equal(g.state.units.length,2);const enemy=g.state.units[0],profile=g.profile(enemy.cardId);assert.equal(enemy.maxHP,Math.ceil(profile.health*1.85));assert.equal(enemy.attack,profile.attack+3);
});
test('saved enemy difficulty upgrades once and preserves proportional base damage',()=>{
 const g=fresh();delete g.state.enemyDifficultyRevision;g.state.enemyMaxHP=32;g.state.enemyHP=16;const enemy=g.spawn('robot','enemy',1,0);enemy.maxHP=10;enemy.hp=5;enemy.attack=4;const loaded=new Game(data);assert.ok(loaded.restore(g.state));assert.equal(loaded.state.enemyMaxHP,48);assert.equal(loaded.state.enemyHP,24);assert.equal(loaded.state.units[0].maxHP,14);assert.equal(loaded.state.units[0].hp,7);assert.equal(loaded.state.units[0].attack,5);const again=new Game(data);assert.ok(again.restore(loaded.state));assert.equal(again.state.units[0].attack,5);
});
test('Agent deploys forward for free but cannot hit a base on its deployment turn',()=>{
 const g=fresh();g.state.hand=['agent'];assert.ok(g.deploy(0,1,0));const agent=g.unitAt(1,0),hp=g.state.enemyHP;g.action(agent);assert.equal(g.state.enemyHP,hp);g.state.turn++;g.action(agent);assert.ok(g.state.enemyHP<hp);
});
test('Symbiote attaches front-first, buffs its host, detaches, and saves safely',()=>{
 const g=fresh();const front=g.spawn('robot','player',3,2),back=g.spawn('robot','player',5,2),sym=g.spawn('symbiote','player',4,2);g.action(sym);assert.equal(sym.hostId,front.uid);assert.equal(g.unitAt(3,2),front);assert.equal(g.effectiveAttack(front),front.attack+2);assert.ok(new Game(data).restore(g.state));g.damage(front,100,null,'area');assert.equal(sym.hostId,undefined);assert.equal(sym.row,3);g.state.units=g.state.units.filter(u=>u!==back);const newHost=g.spawn('robot','player',2,2);g.action(sym);assert.equal(sym.hostId,newHost.uid);
});
test('Space monk pulls before attacking and blocks shots but permits AoE',()=>{
 const g=fresh();const monk=g.spawn('space-monk','player',4,2),enemy=g.spawn('robot','enemy',2,2);g.action(monk);assert.equal(enemy.row,3);assert.ok(enemy.hp<enemy.maxHP);const hp=monk.hp;enemy.row=1;g.damage(monk,3,enemy,'physical');assert.equal(monk.hp,hp);g.damage(monk,3,enemy,'area');assert.equal(monk.hp,hp-3);
});
test('Alchemist always poisons and applies its random potion',()=>{
 const g=fresh();g.random=()=>0;const alchemist=g.spawn('alchemist','player',4,0),target=g.spawn('posthuman','enemy',2,0);g.action(alchemist);assert.equal(target.poison,2);assert.equal(target.freeze,1);
});
test('Charm lasts for one allied activation then returns a weakened enemy',()=>{
 const g=fresh();const ai=g.spawn('ai-girlfriend','player',3,1),target=g.spawn('robot','enemy',2,1);g.action(ai);assert.equal(target.team,'player');assert.ok(ai.usedCharm);g.activate('enemy');assert.equal(target.team,'player');g.activate('player');assert.equal(target.team,'enemy');assert.equal(target.weaken,1);
});
test('Faith heal consumes Faith; Missionary restores Faith and Heretic reduces it',()=>{
 const g=fresh();const cleric=g.spawn('cleric','player',4,0),ally=g.spawn('robot','player',4,1);ally.hp=1;g.support(cleric);assert.equal(ally.hp,4);assert.equal(cleric.faith,0);const missionary=g.spawn('missionary','player',5,0);g.action(missionary);assert.equal(cleric.faith,1);const heretic=g.spawn('heretic','enemy',2,0);cleric.row=3;cleric.faith=3;g.action(heretic);assert.equal(cleric.faith,1);
});
test('Family Man summons once; Drug Dealer summons on its third activation',()=>{
 const g=fresh();const family=g.spawn('family-man','player',4,2);g.action(family);assert.ok(g.state.units.some(u=>u.cardId==='wife'));assert.ok(g.state.units.some(u=>u.cardId==='child'));g.action(family);assert.equal(g.state.units.filter(u=>['wife','child'].includes(u.cardId)).length,2);const dealer=g.spawn('drug-dealer','player',5,5);g.action(dealer);g.action(dealer);assert.ok(!g.state.units.some(u=>u.cardId==='drug-addict'));g.action(dealer);assert.ok(g.state.units.some(u=>u.cardId==='drug-addict'));
});
test('Lorekeeper requires a choice and grants that keyword to its row only',()=>{
 const g=fresh();g.state.hand=['lorekeeper'];const ally=g.spawn('robot','player',4,2),other=g.spawn('robot','player',5,2);assert.ok(g.deploy(0,4,1));assert.ok(g.state.pendingChoice);assert.deepEqual(g.endTurn(),[]);assert.ok(g.chooseLorekeeper('rush'));assert.ok(ally.keywords.includes('rush'));assert.ok(!other.keywords.includes('rush'));assert.equal(g.state.pendingChoice,null);
});
test('Buddhist tracks known moral groups and reincarnates at the correct tier',()=>{
 const g=fresh();const buddhist=g.spawn('buddhist','player',4,0);const bad=g.spawn('pirate','enemy',2,1);g.damage(bad,100,null,'area');assert.equal(buddhist.karma,1);const good=g.spawn('cleric','enemy',2,2);g.damage(good,100,null,'area');assert.equal(buddhist.karma,0);buddhist.karma=4;g.damage(buddhist,100,null,'area');const reborn=g.unitAt(4,0);assert.ok(reborn);assert.equal(g.definition(reborn.cardId).tier,3);assert.notEqual(reborn.cardId,'buddhist');
});
test('Sheriff bounty pays on allied kill; Cannibal consumes an ally only once',()=>{
 const g=fresh();const sheriff=g.spawn('sheriff','player',4,4),target=g.spawn('robot','enemy',2,1),killer=g.spawn('robot','player',3,1);g.support(sheriff);const gold=g.state.gold;g.damage(target,100,killer,'area');assert.equal(g.state.gold,gold+2);const cannibal=g.spawn('cannibal','player',5,1),ally=g.spawn('robot','player',5,0),attack=cannibal.attack+ally.attack;g.action(cannibal);assert.equal(cannibal.attack,attack);assert.ok(cannibal.consumedAlly);assert.ok(!g.state.units.includes(ally));
});
test('Silence ends when its source dies and Overkill reaches the unit behind',()=>{
 const g=fresh();const witch=g.spawn('witch','player',4,0),target=g.spawn('posthuman','enemy',3,0);g.action(witch);assert.equal(target.silenceSource,witch.uid);g.damage(witch,100,null,'area');assert.equal(target.silence,0);const cannon=g.spawn('cannoneer','player',4,2),front=g.spawn('robot','enemy',3,2),back=g.spawn('robot','enemy',2,2);front.hp=1;const hp=back.hp;g.action(cannon);assert.ok(back.hp<hp);
});
test('a battle loss consumes exactly one life and permits a fresh retry of the same encounter',()=>{
 const g=fresh();g.state.encounter=2;g.state.deck=['robot'];g.state.hand=['robot'];g.deploy(0,5,0);g.state.merge[0]='blob';g.state.gold=0;g.state.playerHP=0;assert.ok(g.checkOutcome());assert.equal(g.state.phase,'battle-lost');assert.equal(g.state.lives,2);g.checkOutcome();assert.equal(g.state.lives,2);const loaded=new Game(data);assert.ok(loaded.restore(g.state));assert.equal(loaded.state.lives,2);assert.ok(loaded.continueRun());assert.equal(loaded.state.encounter,2);assert.equal(loaded.state.playerHP,45);assert.equal(loaded.state.gold,60);assert.deepEqual(loaded.state.hand,[]);assert.deepEqual(loaded.state.deck,[]);assert.ok(loaded.state.merge.every(id=>id===null));loaded.state.playerHP=0;loaded.checkOutcome();assert.equal(loaded.state.lives,1);loaded.continueRun();loaded.state.playerHP=0;loaded.checkOutcome();assert.equal(loaded.state.lives,0);assert.equal(loaded.state.phase,'lost');
});
test('legacy saves migrate to lives without resetting an ongoing battle',()=>{
 const g=fresh();delete g.state.progressionRevision;delete g.state.lives;g.state.playerHP=20;const loaded=new Game(data);assert.ok(loaded.restore(g.state));assert.equal(loaded.state.lives,3);assert.equal(loaded.state.playerHP,20);g.state.phase='lost';g.state.playerHP=0;assert.ok(loaded.restore(g.state));assert.equal(loaded.state.phase,'battle-lost');assert.equal(loaded.state.lives,2);g.state.phase='reward';assert.ok(loaded.restore(g.state));assert.equal(loaded.state.phase,'camp');
});


