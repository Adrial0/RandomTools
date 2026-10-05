const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Game} = require('./engine.js');
const data = {cards:JSON.parse(fs.readFileSync(path.join(__dirname,'data/cards.json'),'utf8')).cards,recipes:JSON.parse(fs.readFileSync(path.join(__dirname,'data/merges.json'),'utf8')).recipes};
function fresh(){const g=new Game(data,{random:()=>.3});g.newRun();g.state.units=[];g.state.log=[];return g;}

test('deployment accepts own base row and rejects enemy territory and occupied tiles',()=>{
 const g=fresh();g.state.hand=['robot','mage'];assert.equal(g.deploy(0,2,0),false);assert.equal(g.deploy(0,5,0),true);assert.equal(g.deploy(0,5,0),false);assert.equal(g.state.mana,2);
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
 const g=fresh();g.state.hand=['robot','mage'];assert.ok(g.store(0,0));assert.ok(g.store(0,1));const before=g.state.deck.length;assert.ok(g.merge('artificer'));assert.equal(g.state.deck.length,before-1);assert.deepEqual(g.state.hand,['artificer']);assert.deepEqual(g.state.merge,[null,null]);assert.equal(g.state.deck.filter(id=>id==='artificer').length,1);
});
test('invalid merge keeps cards and deck intact',()=>{
 const g=fresh();g.state.hand=['robot','robot'];g.store(0,0);g.store(0,1);const deck=[...g.state.deck];assert.equal(g.merge(),false);assert.deepEqual(g.state.deck,deck);assert.deepEqual(g.state.merge,['robot','robot']);assert.equal(g.retrieve(0),true);
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
test('turn alternates both armies and refreshes mana and draws',()=>{
 const g=fresh();const a=g.spawn('robot','player',5,5),b=g.spawn('robot','enemy',0,4);g.state.mana=0;const hand=g.state.hand.length;assert.ok(g.endTurn().length);assert.equal(a.row,4);assert.equal(b.row,1);assert.equal(g.state.turn,2);assert.equal(g.state.mana,3);assert.equal(g.state.hand.length,hand+2);assert.equal(g.state.phase,'planning');
});
test('victory grants rewards; camp repair spends gold and carries health to next battle',()=>{
 const g=fresh();g.state.enemyHP=0;g.state.playerHP=30;assert.ok(g.checkOutcome());assert.equal(g.state.phase,'reward');const reward=g.state.rewards[0];assert.ok(g.chooseReward(reward));assert.ok(g.state.deck.includes(reward));assert.ok(g.buyCamp('heal'));assert.equal(g.state.playerHP,40);assert.ok(g.continueRun());assert.equal(g.state.playerHP,40);assert.equal(g.state.encounter,1);
});
test('final battle victory and defeat terminate the run',()=>{
 const g=fresh();g.state.encounter=4;g.state.enemyHP=0;g.checkOutcome();assert.equal(g.state.phase,'won');const h=fresh();h.state.playerHP=0;h.checkOutcome();assert.equal(h.state.phase,'lost');assert.deepEqual(h.endTurn(),[]);
});
test('saved runs round trip and overlapping or unknown units are rejected',()=>{
 const g=fresh();g.spawn('robot','player',5,0);const h=new Game(data);assert.ok(h.restore(JSON.parse(JSON.stringify(g.state))));assert.equal(h.state.units[0].cardId,'robot');const invalid=JSON.parse(JSON.stringify(g.state));invalid.units.push({...invalid.units[0],uid:999});assert.equal(h.restore(invalid),false);
});
