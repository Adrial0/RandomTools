const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),noop=()=>{};const context=new Proxy({},{get:()=>noop,set:()=>true});
function element(){return {style:{},hidden:false,textContent:'',innerHTML:'',addEventListener:noop,getContext:()=>context}}
const choices=[0,2,3,4].map(value=>({value:String(value)}));
const document={querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(s){return s==='#choices select'?choices:[]}};
let stored,seed=13;const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const sandbox={document,Math:math,window:{addEventListener:noop},localStorage:{getItem:()=>null,setItem:(k,v)=>stored=JSON.parse(v)},requestAnimationFrame:noop,console};
let src=fs.readFileSync(__dirname+'/game.js','utf8').replace(/\}\)\(\);\s*$/,`globalThis.test={start,update,damage,xp,equip,enter,load,save,get:()=>({heroes,enemies,area,state,inventory}),setArea:n=>area=n,addItem:n=>inventory.push(n),setParty:ids=>heroes=ids.map(hero)};})();`);
vm.runInNewContext(src,sandbox);const t=sandbox.test;
choices.forEach(c=>c.value='1');t.start();assert.ok(t.get().heroes.every(h=>h.classId===1),'custom duplicate classes');
assert.equal(t.get().enemies.length,4);for(let i=0;i<100;i++)t.update(.02);assert.equal(t.get().enemies.length,4,'ordinary enemies must not spawn');
t.xp(45);assert.ok(t.get().heroes.every(h=>h.level===2&&h.xp===0),'automatic XP level-up');
t.addItem(2);t.equip(0);assert.equal(t.get().heroes[0].weapon,2);
t.get().enemies.slice().forEach(e=>t.damage(e,99999));t.update(.01);assert.equal(t.get().state,'walk');assert.equal(t.get().area,0,'clear does not immediately skip area');
for(let i=0;i<1600&&t.get().area===0;i++)t.update(.02);assert.equal(t.get().area,1,'walking right enters next area');assert.equal(t.get().state,'fight');
t.setArea(4);t.enter();const summoner=t.get().enemies.find(e=>e.type==='summoner');assert.ok(summoner);const count=t.get().enemies.length;summoner.summon=0;t.update(.01);assert.equal(t.get().enemies.length,count+1,'summoner explicitly creates minion');
t.get().heroes.forEach(h=>h.hp=0);t.update(.01);assert.equal(t.get().state,'lost');t.save();assert.equal(stored.heroes.length,4);
// Default party must clear the opening encounter without purchased levels.
t.setArea(0);t.setParty([0,2,3,4]);t.enter();for(let i=0;i<20000&&t.get().area===0&&t.get().state!=='lost';i++)t.update(.02);assert.equal(t.get().area,1,'default party can clear and leave opening area');assert.ok(t.get().heroes.every(h=>h.level>1),'combat grants levels');
console.log('PASS: class selection, fixed encounters, automatic leveling, item equip, walking exits, summoner exception, defeat, save, opening combat.');

