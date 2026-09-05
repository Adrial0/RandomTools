const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const app={innerHTML:''};
const storage=new Map();
const context={
  console,
  performance:{now:()=>0},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  document:{querySelector:selector=>selector==='#app'?app:null,body:{insertAdjacentHTML(){}}},
  requestAnimationFrame:()=>0,cancelAnimationFrame(){},setInterval:()=>0,clearInterval(){},
  setTimeout:()=>0,fetch:async()=>({ok:false}),Image:function(){}
};
vm.createContext(context);
let source=fs.readFileSync(__dirname+'/game.js','utf8').replace(/init\(\);\s*$/,'');
source+=`;globalThis.turnTest={
  setup(){RACE_DATA={Human:{mult:{},flat:{}}};state=fresh();const warrior=makeHero(1,'Warrior'),rogue=makeHero(1,'Rogue');state.run={region:0,step:0,encounters:0,gold:0,heroes:[warrior,rogue],inventory:[],consumables:{},perks:[],relics:[],mode:'map'};beginCombat('combat');return state},
  state:()=>state,
  chooseTurnAction,chooseTurnTarget,buildTurnOrder,heroInitiative,unitCard,turnActionPanel,
  abilities:TURN_ABILITIES,augments:ABILITY_AUGMENTS
}`;
vm.runInContext(source,context);

const api=context.turnTest,state=api.setup(),battle=state.run.battle;
assert.equal(battle.round,1,'combat starts in round one');
assert.equal(battle.activeUnitId,state.run.heroes[1].id,'the higher-Initiative Rogue acts first');
assert.ok(api.heroInitiative(state.run.heroes[1])>api.heroInitiative(state.run.heroes[0]),'class Initiative and Dexterity affect order');
assert.equal(api.abilities.Warrior.length,2,'every class exposes two abilities');
assert.equal(Object.values(api.abilities).every(list=>list.length===2),true,'all class ability lists contain two choices');
assert.equal(Object.values(api.abilities).flat().every(ability=>!('cooldown' in ability)),true,'turn abilities are limited by Mana rather than cooldowns');
assert.equal(Object.values(api.augments).every(list=>list.length===6),true,'each class has three shrine upgrades for each ability');

api.chooseTurnAction('basic');
assert.equal(battle.pendingAction,'basic','targeted actions pause for target selection');
const target=battle.enemies[0],before=target.hp;
assert.match(api.unitCard(target,true),/targetable[\s\S]*chooseTurnTarget/,'the enemy battlefield card becomes the target control');
assert.doesNotMatch(api.turnActionPanel(),/targetAction/,'the action panel does not duplicate enemy target buttons');
api.chooseTurnTarget(target.id);
assert.ok(target.hp<before,'the selected target takes damage');

state.run.heroes.forEach(hero=>hero.mana=0);
battle.round=1;
api.buildTurnOrder();
assert.equal(battle.round,2,'finishing an order begins a new round');
assert.equal(state.run.heroes[0].mana,state.run.heroes[0].manaRegen,'Mana regenerates once at round start');
console.log('Guildmaster: Dungeons turn combat tests passed.');
