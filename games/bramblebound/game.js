(() => {
'use strict';
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d'),KEY='bramblebound-v3';
const classes=[
 {name:'Swordsman',hp:110,at:12,range:20,cool:.7,color:'#eeeeee',symbol:'╱',kind:'melee'},
 {name:'Boxer',hp:130,at:7,range:14,cool:.32,color:'#ed614e',symbol:'●',kind:'melee'},
 {name:'Archer',hp:80,at:11,range:125,cool:1,color:'#81c768',symbol:')',kind:'arrow'},
 {name:'Mage',hp:65,at:19,range:105,cool:1.5,color:'#cf8deb',symbol:'✦',kind:'magic'},
 {name:'Priest',hp:85,at:6,range:95,cool:1.3,color:'#7bbce8',symbol:'†',kind:'aura'},
 {name:'Spearman',hp:100,at:14,range:40,cool:1,color:'#e8bc60',symbol:'↗',kind:'melee'},
 {name:'Gunner',hp:75,at:6,range:155,cool:.4,color:'#aaaaaa',symbol:'⌐',kind:'bullet'},
 {name:'Whipper',hp:95,at:10,range:65,cool:1,color:'#75d0c3',symbol:'~',kind:'whip'}
];
const {items:ITEMS,effects:EFFECTS,descriptions:STAT_HELP}=BrambleGear;
const socketItem=id=>['rune','gem'].includes(ITEMS[id]?.type);
const areas=['Grassland','Woodland','Cavern','Desert','Mountains','Snowfields'];
const WORLD=[
 {id:'town',name:'Town',x:8,y:78,next:['a0'],kind:'town'},
 {id:'a0',name:'Grassland 1',x:21,y:74,next:['a1'],area:0},
 {id:'a1',name:'Grassland 2',x:32,y:57,next:['a2'],area:1},
 {id:'a2',name:'Grassland 3',x:44,y:70,next:['a3','trader'],area:2},
 {id:'trader',name:'Rune Trader',x:47,y:25,next:[],kind:'trader'},
 {id:'a3',name:'Woodland 1',x:58,y:70,next:['a4'],area:3},
 {id:'a4',name:'Woodland 2',x:67,y:49,next:['a5'],area:4},
 {id:'a5',name:'Woodland 3',x:64,y:23,next:['a6'],area:5},
 {id:'a6',name:'Cavern 1',x:78,y:24,next:['a7'],area:6},
 {id:'a7',name:'Cavern 2',x:86,y:48,next:['a8'],area:7},
 {id:'a8',name:'Cave Guardian',x:91,y:78,next:[],area:8}
];
WORLD.find(n=>n.id==='a8').next=['a9'];
for(let i=9;i<18;i++)WORLD.push({id:'a'+i,name:areas[Math.floor(i/3)]+' '+(i%3+1),x:110+(i-9)*20,y:[65,35,60][i%3],next:i<17?['a'+(i+1)]:[],area:i});
let mapPan=0;
let hazards=[],blasts=[];
let stage=0,inventoryRunes=Array.from({length:15},()=>[null,null]),shopClass=0,shopIndex=0;
const stageCount=()=>5+area%4;
let completed=[],currentNode='town',mapReturn=null,potions=[],hoverHero=null,inspectingItem=false,saveTime=0;
let heroes=[],enemies=[],shots=[],numbers=[],loot=[],inventory=Array(15).fill(null),area=0,gold=0,selected=0,state='setup',paused=false,speed=1,drag=null,time=0,last=0,uid=0,uiTime=0,fields=[],flashes=[],gearDrag=null,pickedSlot=null,suppressGearClick=false;
const floor=x=>{if(['town','trader'].includes(currentNode))return 226;const a=(area+stage)%3;return a===0?(x<112?226:x<365?219:226):a===1?(x<180?226:x<310?207:226):(x<135?226:x<245?215:x<365?204:226)};
function needed(level){return 100+level*80+level*level*10}
function mpCost(w){return (EFFECTS[w?.effect]?.mp||0)*(w?.classId===7?3:1)}
function stats(h){
 const c=classes[h.classId],w=ITEMS[h.weapon],a={...h.attributes},gem={str:0,dex:0,int:0,defense:0,lp:0};for(const id of h.runes||[])for(const [key,value] of Object.entries(ITEMS[id]?.gemStats||{}))gem[key]+=value;for(const key of ['str','dex','int'])a[key]+=gem[key];h.defense=gem.defense;const str=4+a.str,dex=4+a.dex,int=a.int;
 h.str=str;h.dex=dex;h.int=int;h.maxHp=(a.lp||0)*10+gem.lp+c.hp+(h.level-1)*6+a.str*[4,5,3,2,3,4,3,3][h.classId]+a.dex*[4,3,3,2,3,3,2,3][h.classId]+int*2;
 let min=w?w.min:1,max=w?w.max:2;h.range=w?w.range:12;let agi=w?w.agi:[25,35];let factor=1;h.crit=0;h.extra=0;h.abilityPower=1;h.healing=14+int;
 switch(h.classId){
 case 0:max+=str;min=Math.min(max,min+dex);break;
 case 1:min+=str;max+=str;factor=1/(1+dex*.02);break;
 case 2:h.range+=str*2;min+=dex*.5;max+=dex*.75;break;
 case 3:h.range+=str*2;factor=1/(1+dex*.02);min+=int*.5;max+=int*.75;h.abilityPower+=int*.05;break;
 case 4:h.range+=int*2;break;
 case 5:max+=str*1.5;min+=dex*.5;h.crit=Math.min(.4,dex*.01);break;
 case 6:min*=1+str*.02;max*=1+str*.02;factor=1/(1+dex*.02);h.abilityPower+=int*.03;break;
 case 7:min+=str*.5;max+=str*.5;h.extra=Math.floor(dex/5);break;
 }
 h.runeBonus={lifesteal:0,resistance:0,xpBonus:0,haste:0,damageBonus:0,rangeBonus:0,hpBonus:0,regen:0};
 for(const id of h.runes||[])for(const [name,value] of Object.entries(ITEMS[id]?.bonuses||{}))h.runeBonus[name]+=value;
 h.runeBonus.resistance=Math.min(.75,h.runeBonus.resistance);
 min*=1+h.runeBonus.damageBonus;max*=1+h.runeBonus.damageBonus;factor/=1+h.runeBonus.haste;h.range+=h.runeBonus.rangeBonus;h.maxHp=Math.floor(h.maxHp*(1+h.runeBonus.hpBonus));
 h.atMin=Math.floor(Math.min(min,max));h.atMax=Math.floor(max);h.at=h.atMax;h.agi=agi.map(n=>Math.max(5,Math.round(n*factor)));h.cool=(h.agi[0]+h.agi[1])/60;h.color=c.color;h.kind=w?c.kind:'melee';
}
function hero(classId,i){const h={id:++uid,classId,level:1,xp:0,weapon:classId+'-basic',runes:[null,null],attributes:{str:0,dex:0,int:0,lp:0},sp:0,mp:0,gearRevision:0,x:35+i*20,y:226,vy:0,cooldown:i*.15,hold:0,anim:0,face:1};stats(h);h.hp=h.maxHp;return h}
function tell(text){$('#status').textContent=text}
function save(){if(!heroes.length)return;try{localStorage.setItem(KEY,JSON.stringify({version:6,area,stage,gold,inventory,inventoryRunes,completed,currentNode,heroes:heroes.map(h=>({classId:h.classId,level:h.level,xp:h.xp,hp:h.hp,weapon:h.weapon,runes:h.runes,attributes:h.attributes,sp:h.sp,mp:h.mp}))}))}catch{}}
function load(){try{
 const s=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('bramblebound-v2'));if(!s||!Array.isArray(s.heroes)||s.heroes.length!==4)return false;
 if(!s.heroes.every(h=>Number.isInteger(h.classId)&&classes[h.classId]&&Number.isInteger(h.level)&&h.level>=1&&h.level<=99))return false;
 area=Math.max(0,Math.min(17,Math.floor(s.area)||0));completed=Array.isArray(s.completed)?s.completed.filter(id=>WORLD.some(n=>n.id===id&&!n.kind)):Array.from({length:area},(_,i)=>'a'+i);currentNode=WORLD.some(n=>n.id===s.currentNode)?s.currentNode:'town';gold=Math.max(0,Math.floor(s.gold)||0);
 inventory=Array.from({length:15},(_,i)=>{const id=s.inventory?.[i];return ITEMS[id]?id:s.version!==3&&Number.isInteger(id)&&id>0?s.heroes[i%4].classId+'-iron':null});
 inventoryRunes=Array.from({length:15},(_,i)=>[0,1].map(j=>socketItem(s.inventoryRunes?.[i]?.[j])?s.inventoryRunes[i][j]:null));stage=Math.max(0,Math.min(stageCount()-1,Math.floor(s.stage)||0));
 heroes=s.heroes.map((v,i)=>{const h=hero(v.classId,i);h.level=v.level;h.xp=Math.max(0,Math.min(needed(h.level)-1,Number(v.xp)||0));
 const valid=ITEMS[v.weapon];h.weapon=s.version>=3?(valid?.type==='weapon'&&valid.classId===h.classId?v.weapon:null):h.classId+(v.weapon>0?'-iron':'-basic');
 h.runes=[0,1].map(i=>socketItem(v.runes?.[i])?v.runes[i]:null);
 const a=v.attributes||{};h.attributes={str:Math.max(0,Math.floor(a.str)||0),dex:Math.max(0,Math.floor(a.dex)||0),int:Math.max(0,Math.floor(a.int)||0),lp:Math.max(0,Math.floor(a.lp)||0)};
 let spent=Object.values(h.attributes).reduce((n,v)=>n+v,0);const budget=2*(h.level-1);if(spent>budget){h.attributes={str:0,dex:0,int:0,lp:0};spent=0}h.sp=budget-spent;
 const effect=EFFECTS[ITEMS[h.weapon]?.effect];h.mp=effect?Math.max(0,Math.min(mpCost(ITEMS[h.weapon])-1,Math.floor(v.mp)||0)):0;stats(h);h.hp=Number.isFinite(v.hp)?Math.max(0,Math.min(h.maxHp,v.hp)):h.maxHp;return h});return true;
 }catch{return false}}
function allocate(stat){const h=heroes[selected];if(!h||h.sp<1||!['str','dex','int','lp'].includes(stat))return false;h.attributes[stat]=(h.attributes[stat]||0)+1;h.sp--;stats(h);save();refresh();return true}
const ENEMY_TYPES={
 spider:{name:'Stilt Spider',hp:.85,speed:30,range:14,damage:.9,color:'#c7ab85',description:'Springy body on jointed legs. Feet plant on the ground as it scuttles.'},
 roller:{name:'Boulder Roller',hp:1.4,speed:85,range:16,damage:1.5,color:'#b7a396',description:'Accelerates into a fast roll. Heavy momentum makes it slow to reverse.'},
 flyer:{name:'Crooked Bat',hp:.65,speed:40,range:18,damage:.9,color:'#bfa0e6',description:'Flaps and wobbles through the air, dipping down to bite.'},
 catapult:{name:'Rock Lobber',hp:1.4,speed:7,range:240,damage:1,color:'#cfb57c',description:'Winds up, then lobs one slow high-arc rock. Heavy impact damage; no explosion.'},
 swarmling:{name:'Swarmling',hp:.5,speed:28,range:10,damage:.65,color:'#b6d65d',description:'Small, quick melee enemies with half normal health. Arrive in packs.'},
 beetle:{name:'Iron Beetle',hp:1.8,speed:9,range:15,damage:1.4,color:'#a5aeb8',description:'Slow, heavily built melee enemy. More health and heavier bites.'},
 hopper:{name:'Hopper',hp:.8,speed:19,range:12,damage:1,color:'#e1b75b',description:'Crouches, then leaps toward its target. Reposition before it lands.'},
 archer:{name:'Thorn Archer',hp:.8,speed:12,range:140,damage:1.2,color:'#83d2a2',description:'Fires arcing arrows. Retreats when approached; terrain blocks arrows.'},
 bomber:{name:'Ember Toad',hp:1.2,speed:8,range:150,damage:1,color:'#f3a05c',description:'Telegraphs a single slow bomb. Cannot bite or fire other projectiles.'},
 shaman:{name:'Moss Shaman',hp:.9,speed:10,range:110,damage:.7,color:'#76dbc4',description:'Can heal a nearby wounded ally three times. Eliminate it first.'}
};
function encounterType(i,count){if(stage===stageCount()-1&&i===count-1)return 'boss';if(area>=4&&i===count-1)return 'summoner';if(area===0&&stage===0)return i%2?'slasher':'slime';const pool=area<3?['slime','swarmling','hopper','slasher','beetle','spider','roller']:area<6?['archer','swarmling','shaman','slasher','hopper','bomber','spider','flyer','catapult']:['beetle','bomber','shaman','archer','slasher','spitter','roller','flyer','catapult'];return pool[(i+stage+area)%pool.length]}

function areaHealth(index){const values=[20,40,60,80,100,130,160,190,220,250,290,330,370,410,450,500];return values[index]??500+(index-15)*50}
function enemy(type,x){const boss=type==='boss',tier=Math.floor(area/3),spec=ENEMY_TYPES[type],hp=Math.round(areaHealth(area)*(boss?10:spec?spec.hp:type==='summoner'?1.25:1));return {id:++uid,type,x,y:floor(x)-(type==='flyer'?45:0),vx:0,vy:0,rotation:0,feet:[],hp:hp,maxHp:hp,level:1+area*2,name:spec?.name||({slime:'Slime',slasher:'Slashling',spitter:'Spitter',summoner:'Summoner',boss:'Guardian'}[type]||type),speed:spec?.speed||(boss?13:17),heals:3,healCooldown:3,hopCooldown:1+(x%3),at:(boss?10+area*2:6+area*1.5)*(spec?.damage||1),range:spec?.range||(type==='spitter'||type==='summoner'?105:type==='slasher'?(area<3?22:48):(area<3?12:16)),cooldown:.5+(x%7)/10,summon:7,remaining:3,color:spec?.color||(boss?'#de6262':type==='summoner'?'#c478ed':type==='slasher'?'#f37c52':type==='spitter'?'#e6b94b':tier===1?'#7ca3ed':'#59df42'),seed:x,flash:0,specialCooldown:2+(x%5)*.4,patternIndex:0,warning:null}}
function enter(){currentNode='a'+area;$('#world').hidden=true;mapReturn=null;state='fight';paused=false;drag=null;shots=[];hazards=[];blasts=[];numbers=[];loot=[];potions=[];enemies=[];fields=[];flashes=[];$('#setup').hidden=true;$('#result').hidden=true;heroes.forEach((h,i)=>{h.x=32+i*20;h.y=floor(h.x);h.vy=0;h.vx=0;h.drive=0;h.strike=null;h.hold=0;h.hp=Math.min(h.maxHp,h.hp)});const count=6+area%3+Math.floor(area/3)*2;for(let i=0;i<count;i++){const type=encounterType(i,count),x=240+i*(245/(count-1));enemies.push(enemy(type,x));if(type==='swarmling')for(let j=1;j<=5;j++)enemies.push(enemy(type,Math.max(210,Math.min(500,x+(j-2)*7))))}tell('Drag to position. Defeat the enemies, then walk right.');save();build();}
function start(){inventoryRunes=Array.from({length:15},()=>[null,null]);stage=0;heroes=[...document.querySelectorAll('#choices select')].map((el,i)=>hero(+el.value,i));area=0;gold=0;inventory=Array(15).fill(null);selected=0;completed=[];currentNode='town';state='town';$('#setup').hidden=true;enterService('town');}
function float(x,y,text,color='#fff'){numbers.push({x,y,text,color,life:1})}
function xpGain(h,amount,mobLevel){const penalty=mobLevel==null?1:Math.max(0,1-Math.max(0,h.level-mobLevel-5)*.1);return mobLevel==null?amount*(1+h.runeBonus.xpBonus):Math.max(1,amount*penalty*(1+h.runeBonus.xpBonus))}
function xp(amount,mobLevel=null){heroes.forEach(h=>{h.xp=Math.round((h.xp+xpGain(h,amount,mobLevel))*100)/100;while(h.xp>=needed(h.level)&&h.level<99){h.xp-=needed(h.level);h.level++;h.sp+=2;stats(h);float(h.x,h.y-34,'LEVEL UP +2 SP','#ffff66')}});save()}
function damage(target,n,element='physical',showNumber=true){if(target.hp<=0)return;if(!target.type){if(element!=='physical')n*=1-target.runeBonus.resistance;n=Math.max(1,n-aura(target).defense-(target.defense||0))}target.hp=Math.max(0,target.hp-n);target.flash=.1;if(!target.type){target.vx=(target.vx||0)-18*(target.face||1);target.leanV=(target.leanV||0)-18*(target.face||1)}if(showNumber)float(target.x,target.y-22,Math.round(n));if(target.type&&target.hp===0){gold+=2+area;xp(target.type==='boss'?140:12+area*3,target.level);const item=rollDrop();if(item)loot.push({x:target.x,y:floor(target.x),item});if(Math.random()<.05)potions.push({x:target.x,y:floor(target.x)});save()}}
function shoot(h,target,kind,amount,attack=null){if(kind==='enemy'){launchHazard(h,target,'bullet',0,amount);return}const dx=target.x-h.x,dy=target.y-12-(h.y-13),flight=Math.max(.35,Math.abs(dx)/180),angle=Math.atan2(dy,dx),v=kind==='bullet'?330:180;const count=kind==='arrow'?(ITEMS[attack?.weapon||h.weapon]?.arrows||1):1;for(let i=0;i<count;i++){const spread=(i-(count-1)/2)*.035;shots.push({x:h.x,y:h.y-13,target,kind,amount,attack,element:'physical',life:4,vx:kind==='arrow'?dx/flight+spread*45:Math.cos(angle)*v,vy:kind==='arrow'?dy/flight-.5*240*flight+spread*45:Math.sin(angle)*v,gravity:kind==='arrow'?240:0})}}

const PATTERNS=['FAN','ARROWS','BOMBS','SEEKERS'];
function launchHazard(e,target,kind,offset=0,amount=e.at*3){
 const x=e.x,y=e.y-16,dx=target.x-x,dy=target.y-13-y;
 const angle=Math.atan2(dy,dx)+offset,speed=kind==='missile'?90:kind==='bullet'?145:130;
 const p={x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,kind,amount,target,age:0,life:kind==='missile'?1.6:5,element:kind==='bomb'?'fire':kind==='missile'?'lightning':'physical'};
 if(kind==='arrow'||kind==='bomb'||kind==='rock'){const flight=kind==='rock'?2.2:kind==='bomb'?1.9:.85;p.vx=dx/flight+offset*100;p.gravity=kind==='rock'?110:kind==='bomb'?100:240;p.vy=dy/flight-.5*p.gravity*flight;if(kind==='bomb')p.fuse=2.6}
 hazards.push(p);return p;
}

function physicalEnemy(e){return ['spider','roller','flyer','hopper'].includes(e.type)}
function stepEnemyPhysics(e,target,dt){
 const direction=Math.sign(target.x-e.x),distance=Math.abs(target.x-e.x),slow=slowFactor(e),ground=e.y>=floor(e.x)-.5;
 if(e.type==='flyer'){const goalY=Math.max(45,Math.min(floor(target.x)-5,target.y-10+Math.sin(time*2.4+e.seed)*18)),goalX=target.x+Math.sin(time*3+e.seed)*14;e.vx+=((goalX-e.x)*2-e.vx*2.2)*dt;e.vy+=((goalY-e.y)*3-e.vy*2.5+Math.sin(time*19+e.seed)*90)*dt;e.vx=Math.max(-55,Math.min(55,e.vx));e.vy=Math.max(-65,Math.min(65,e.vy));e.x=Math.max(8,Math.min(505,e.x+e.vx*dt*slow));e.y=Math.max(25,Math.min(floor(e.x)-4,e.y+e.vy*dt*slow));return}
 if(e.type==='hopper'){e.hopCooldown-=dt;e.crouching=ground&&e.hopCooldown<.4;if(ground&&e.hopCooldown<=0&&distance>e.range){e.vy=-155;e.vx=direction*65*slow;e.hopCooldown=1.1;e.crouching=false}if(ground&&e.vy>=0)e.vx*=Math.exp(-18*dt)}
 else{const desired=distance>e.range?direction*e.speed*slow:0;e.vx+=(desired-e.vx)*(1-Math.exp(-(e.type==='roller'?1.8:6)*dt))}
 const before=e.x;moveEnemy(e,(e.vx+(e.kick||0))*dt,dt);e.rotation+=(e.x-before)/9;
 if(e.type==='spider'){if(!e.feet.length)e.feet=Array.from({length:6},(_,i)=>({x:e.x+(i-2.5)*5,y:floor(e.x+(i-2.5)*5)}));e.feet.forEach((foot,i)=>{const goal=e.x+(i-2.5)*5;if(Math.abs(goal-foot.x)>6+(i%3)*3&&!foot.step)foot.step={x:foot.x,to:goal+direction*3,t:0};if(foot.step){foot.step.t=Math.min(1,foot.step.t+dt*8);const p=foot.step.t;foot.x=foot.step.x+(foot.step.to-foot.step.x)*p;foot.y=floor(foot.x)-Math.sin(p*Math.PI)*6;if(p===1)foot.step=null}else foot.y=floor(foot.x)})}
}
function tickCatapult(e,target,dt){if(e.type!=='catapult')return;if(e.lob){e.lob.left-=dt;if(e.lob.left<=0){launchHazard(e,{x:e.lob.x,y:e.lob.y},'rock',0,e.at*4);e.lob=null;e.cooldown=4.5}}else if(e.cooldown<=0&&Math.abs(target.x-e.x)<=e.range){e.lob={left:.9,x:target.x,y:target.y};float(e.x,e.y-35,'ROCK !','#e9d4a1')}}

function enemyTrait(e,target,dt){

 if(e.type==='shaman'&&e.heals>0){e.healCooldown-=dt;if(e.healCooldown<=0){const ally=enemies.filter(v=>v!==e&&v.hp>0&&v.hp<v.maxHp&&Math.hypot(v.x-e.x,v.y-e.y)<110).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(ally){const n=Math.min(ally.maxHp-ally.hp,Math.ceil(ally.maxHp*.2));ally.hp+=n;e.heals--;float(ally.x,ally.y-28,'+'+n,'#76dbc4');flashes.push({x:e.x,y:e.y-20,tx:ally.x,ty:ally.y-12,color:'#76dbc4',life:.25});e.healCooldown=4}}}
}
function tickSlash(e,dt){const slash=e.slash;if(!slash)return;slash.left-=dt;slash.life-=dt;if(slash.left<=0&&!slash.hit){slash.hit=true;for(const h of heroes)if(h.hp>0&&(h.x-e.x)*slash.face>=-4&&(h.x-e.x)*slash.face<=e.range+7&&Math.abs(h.y-e.y)<(area<3?16:23))damage(h,e.at*1.8)}if(slash.life<=0)e.slash=null}
function specialPattern(e){if(e.type==='bomber')return 'BOMBS';if(ENEMY_TYPES[e.type])return null;if(e.type==='slasher')return null;if(e.type==='boss')return PATTERNS[e.patternIndex%4];if(e.type==='summoner')return 'SEEKERS';if(e.type==='spitter')return PATTERNS[(area+stage)%4];return stage>0&&e.seed>400?PATTERNS[stage%4]:null}
function tickSpecial(e,target,dt){
 const pattern=specialPattern(e);if(!pattern)return;
 if(e.warning){e.warning.left-=dt;if(e.warning.left<=0){const w=e.warning;e.warning=null;e.patternIndex++;e.specialCooldown=e.type==='boss'?3.8:5.5;
 const aim={x:w.x,y:w.y,hp:1};if(w.pattern==='FAN')for(let i=-3;i<=3;i++)launchHazard(e,aim,'bullet',i*.20);
 if(w.pattern==='ARROWS')for(let i=-2;i<=2;i++)launchHazard(e,aim,'arrow',i*.25);
 if(w.pattern==='BOMBS')launchHazard(e,aim,'bomb',0,e.at*4);
 if(w.pattern==='SEEKERS')for(let i=-1;i<=1;i++)launchHazard(e,target,'missile',i*.6,e.at*3.5);
 }return}
 e.specialCooldown-=dt;if(e.specialCooldown<=0&&Math.abs(e.x-target.x)<400){e.warning={pattern,left:.95,x:target.x,y:target.y};float(e.x,e.y-38,pattern+' !','#ffcf6c')}
}
function segmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
function explode(p){blasts.push({x:p.x,y:p.y,life:.35,radius:36});for(const h of heroes)if(h.hp>0&&Math.hypot(h.x-p.x,h.y-12-p.y)<42)damage(h,p.amount,p.element);p.life=0}
function tickHazards(dt){
 blasts.forEach(b=>b.life-=dt);blasts=blasts.filter(b=>b.life>0);
 for(const p of hazards){p.age+=dt;p.life-=dt;const ax=p.x,ay=p.y;
 if(p.kind==='missile'&&p.age<.8&&p.target.hp>0){const angle=Math.atan2(p.vy,p.vx),goal=Math.atan2(p.target.y-13-p.y,p.target.x-p.x),delta=Math.atan2(Math.sin(goal-angle),Math.cos(goal-angle)),turn=Math.max(-1.5*dt,Math.min(1.5*dt,delta));p.vx=Math.cos(angle+turn)*90;p.vy=Math.sin(angle+turn)*90}
 p.vy+=(p.gravity||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
 const wall=terrainHit(ax,ay,p.x,p.y);if(wall){p.x=wall.x;p.y=wall.y;if(p.kind!=='bomb'){p.life=0;continue}}
 if(p.kind==='bomb'){p.fuse-=dt;if(p.y>=floor(p.x)-3){p.y=floor(p.x)-3;p.vx=0;p.vy=0}if(p.fuse<=0){explode(p);continue}}
 else{const hit=heroes.filter(h=>h.hp>0&&segmentDistance(h.x,h.y-13,ax,ay,p.x,p.y)<(p.kind==='rock'?10:7)).sort((a,b)=>Math.hypot(a.x-ax,a.y-13-ay)-Math.hypot(b.x-ax,b.y-13-ay))[0];if(hit){damage(hit,p.amount,p.element);p.life=0}if(p.y>=floor(p.x))p.life=0}
 if(p.x<-30||p.x>542||p.y>280)p.life=0;
 }hazards=hazards.filter(p=>p.life>0)
}
function drawHazards(){
 for(const e of enemies)if(e.slash){const f=e.slash.face,x=e.x,y=e.y-12,reach=e.range+5;line(ctx,[[x+f*7,y-12],[x+f*reach,y],[x+f*7,y+12]],e.slash.hit?'#ff542f':'#834338');if(e.slash.hit)line(ctx,[[x+f*12,y-7],[x+f*(reach-8),y],[x+f*12,y+7]],'#ffba61')}
 for(const e of enemies)if(e.warning){ctx.strokeStyle='#ffcf6c';ctx.beginPath();ctx.arc(e.x,e.y-17,12+(1-e.warning.left)*7,0,Math.PI*2);ctx.stroke();if(e.warning.pattern!=='SEEKERS')line(ctx,[[e.x,e.y-16],[e.warning.x,e.warning.y-13]],'#75522b')}
 for(const p of hazards){const color=p.kind==='rock'?'#c4b39a':p.kind==='bomb'?'#ff794c':p.kind==='missile'?'#e994ff':p.kind==='arrow'?'#ffe59a':'#ff6464';ctx.fillStyle=color;
 if(p.kind==='rock'){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.stroke();line(ctx,[[p.x-2,p.y-3],[p.x+2,p.y],[p.x-1,p.y+3]],'#807364')}
 else if(p.kind==='bomb'){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.stroke();ctx.fillRect(p.x-1,p.y-7,2,2);if(p.fuse<.65){ctx.strokeStyle='#aa4935';ctx.beginPath();ctx.ellipse(p.x,floor(p.x)-2,36,4,0,0,Math.PI*2);ctx.stroke()}}
 else if(p.kind==='arrow'||p.kind==='missile'){const a=Math.atan2(p.vy,p.vx);line(ctx,[[p.x-Math.cos(a)*9,p.y-Math.sin(a)*9],[p.x,p.y]],color);ctx.fillRect(p.x-1,p.y-1,3,3)}
 else ctx.fillRect(Math.round(p.x)-2,Math.round(p.y)-2,4,4)}
 for(const b of blasts){ctx.strokeStyle='#ffbd68';ctx.beginPath();ctx.arc(b.x,b.y,b.radius*(1-b.life/.4),0,Math.PI*2);ctx.stroke()}
}

function terrainHit(ax,ay,bx,by){const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/2));for(let i=0;i<=steps;i++){const t=i/steps,x=ax+(bx-ax)*t,y=ay+(by-ay)*t;if(y>=floor(x))return {x,y:floor(x),t}}return null}
function tickShots(dt){for(const s of shots){s.life-=dt;const ax=s.x,ay=s.y;s.vy+=(s.gravity||0)*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;const wall=terrainHit(ax,ay,s.x,s.y),bx=wall?wall.x:s.x,by=wall?wall.y:s.y;const hit=enemies.filter(e=>e.hp>0&&segmentDistance(e.x,e.y-10,ax,ay,bx,by)<(e.type==='boss'?16:7)).sort((a,b)=>Math.hypot(a.x-ax,a.y-10-ay)-Math.hypot(b.x-ax,b.y-10-ay))[0];if(hit){if(s.attack)basicHit(hit,s.amount,s.attack);else damage(hit,s.amount);s.life=0}if(wall)s.life=0}shots=shots.filter(s=>s.life>0)}
function rollDrop(){if(Math.random()>=.02)return null;const rune=Math.random()<.5;const classId=heroes[Math.floor(Math.random()*heroes.length)].classId;const pool=Object.values(ITEMS).filter(w=>rune?(w.type==='rune'||w.type==='gem'&&w.tier<=1+Math.floor(area/2)):w.type==='weapon'&&w.classId===classId&&w.tier>0&&w.tier<=1+Math.floor(area/2));return pool[Math.floor(Math.random()*pool.length)].id}
function pickLoot(){loot=loot.filter(item=>{if(heroes.some(h=>h.hp>0&&Math.abs(h.x-item.x)<17)){const i=inventory.indexOf(null);if(i>=0){inventory[i]=item.item;inventoryRunes[i]=[null,null];tell('Found '+ITEMS[item.item].name+'. Drag it to a matching weapon slot.')}else{gold+=5*ITEMS[item.item].tier;tell('Item bag full. Drop converted to gold.')}save();build();return false}return true})}
function slotItem(slot){return slot.type==='bag'?inventory[slot.index]:slot.type==='gear'?heroes[slot.index]?.weapon:heroes[slot.index]?.runes[slot.type==='rune0'?0:1]}
function validSlot(slot){return slot&&Number.isInteger(slot.index)&&(slot.type==='bag'?slot.index>=0&&slot.index<15:['gear','rune0','rune1'].includes(slot.type)&&slot.index>=0&&slot.index<4)}
function accepts(slot,id){if(slot.type.startsWith('rune')&&(!heroes[slot.index]?.weapon||slotItem(slot)))return false;if(!id)return true;const item=ITEMS[id];if(!item)return false;if(slot.type==='bag')return true;const h=heroes[slot.index];return item.level<=h.level&&(slot.type==='gear'?item.type==='weapon'&&item.classId===h.classId:socketItem(id))}
function moveItem(from,to){if(!validSlot(from)||!validSlot(to)||from.type===to.type&&from.index===to.index)return false;const a=slotItem(from),b=slotItem(to);if(from.type.startsWith('rune')){tell('Cannot move this item.');return false}if(!a)return false;if(!accepts(to,a)||!accepts(from,b)){tell('Cannot equip: weapon class or required level does not match.');return false}
 const sockets=slot=>slot.type==='bag'?inventoryRunes[slot.index]:slot.type==='gear'?heroes[slot.index].runes:[null,null];const fromRunes=[...sockets(from)],toRunes=[...sockets(to)];
 for(const [slot,id,runes] of [[from,b,toRunes],[to,a,fromRunes]]){if(slot.type==='bag'){inventory[slot.index]=id;inventoryRunes[slot.index]=runes}else{const h=heroes[slot.index];if(slot.type==='gear'){h.weapon=id;h.runes=runes;}else h.runes[slot.type==='rune0'?0:1]=id;h.mp=0;h.gearRevision++}}
 for(const h of heroes){stats(h);h.hp=Math.min(h.hp,h.maxHp)}
 tell(ITEMS[a].name+' moved. Equipment swaps reset MP.');pickedSlot=null;save();build();return true}
function equip(i){return moveItem({type:'bag',index:i},{type:'gear',index:selected})}
function roll(min,max){return Math.floor(min+Math.random()*(max-min+1))}
function aura(h){let attack=1,defense=0;for(const p of heroes)if(p.hp>0&&p.classId===4&&Math.hypot(p.x-h.x,p.y-h.y)<=p.range){attack+=p.str*.01;defense+=p.dex*.2}return {attack,defense}}
function basicAmount(h){return Math.max(1,Math.round(roll(h.atMin,h.atMax)*aura(h).attack*(Math.random()<h.crit?2:1)))}
function attackToken(h){return {owner:h,weapon:h.weapon,revision:h.gearRevision,charged:false}}
function basicHit(target,amount,attack){if(target.hp<=0)return;const before=target.hp;damage(target,amount);const owner=attack?.owner;if(owner?.hp>0&&owner.gearRevision===attack.revision)owner.hp=Math.min(owner.maxHp,owner.hp+(before-target.hp)*owner.runeBonus.lifesteal);if(!attack||attack.charged)return;attack.charged=true;const h=attack.owner,w=ITEMS[attack.weapon],effect=EFFECTS[w?.effect];if(!effect||h.hp<=0||h.weapon!==attack.weapon||h.gearRevision!==attack.revision)return;h.mp+=h.int;if(h.mp>=mpCost(w)){h.mp=0;for(let i=0;i<=h.extra;i++)activate(h,target,w.effect)}save()}
function controlDuration(h,base){return Math.max(.06,Math.min(base,base*((ITEMS[h.weapon]?.agi||[25,35]).reduce((sum,n)=>sum+n,0)/2)/85))}
function slowFactor(e){return e.slow>0?1-(e.slowAmount??.4):1}
function activate(h,target,kind){const e=EFFECTS[kind],power=h.abilityPower*.65,amount=()=>Math.max(1,Math.round(roll(e.min,e.max)*power));float(h.x,h.y-38,e.name,e.color);flashes.push({x:h.x,y:h.y-18,tx:target.x,ty:target.y-10,color:e.color,life:.35,kind});
 const near=enemies.filter(v=>v.hp>0&&Math.abs(v.x-target.x)<45);
 if(kind==='fire'){fields.push({x:target.x,y:floor(target.x),life:1,elapsed:0,pulses:0,amount:amount(),color:e.color});}
 if(kind==='ice'){for(const v of near){damage(v,amount());const duration=controlDuration(h,.7)*(v.type==='boss'?.2:1);v.frozen=Math.max(v.frozen||0,duration);v.slow=Math.max(v.slow||0,duration+1);v.slowAmount=.2*(v.type==='boss'?.3:1)}}
 if(kind==='poison'){if(target.hp>0){target.poison={time:4,tick:1,amount:amount()};}}
 if(kind==='lightning'){enemies.filter(v=>v.hp>0&&Math.abs(v.x-target.x)<130).sort((a,b)=>Math.abs(a.x-target.x)-Math.abs(b.x-target.x)).slice(0,3).forEach(v=>{damage(v,amount());flashes.push({x:target.x,y:target.y-15,tx:v.x,ty:v.y-12,color:e.color,life:.35,kind})})}
 if(kind==='heal'){heroes.filter(v=>v.hp>0).forEach(v=>{const n=Math.min(v.maxHp-v.hp,amount());v.hp+=n;float(v.x,v.y-25,'+'+n,e.color)})}
 if(kind==='drain'&&target.hp>0){const n=Math.min(target.hp,amount());damage(target,n);h.hp=Math.min(h.maxHp,h.hp+n);float(h.x,h.y-25,'+'+n,e.color)}
 if(kind==='stun'){near.forEach(v=>{damage(v,amount());v.stun=Math.max(v.stun||0,controlDuration(h,.6)*(v.type==='boss'?.2:1))})}}
function tickEffects(dt){flashes.forEach(f=>f.life-=dt);flashes=flashes.filter(f=>f.life>0);for(const f of fields){f.life-=dt;f.elapsed+=dt;while(f.pulses<10&&f.pulses*.1<=f.elapsed){f.pulses++;enemies.filter(e=>e.hp>0&&Math.abs(e.x-f.x)<30&&Math.abs(e.y-f.y)<18).forEach(e=>damage(e,f.amount,'fire',false))}}fields=fields.filter(f=>f.life>0);for(const e of enemies){if(e.hp<=0)continue;e.frozen=Math.max(0,(e.frozen||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.stun=Math.max(0,(e.stun||0)-dt);if(e.poison){e.poison.time-=dt;e.poison.tick-=dt;if(e.poison.tick<=0){e.poison.tick+=1;damage(e,e.poison.amount,'poison',false)}if(e.poison.time<=0)e.poison=null}}}
function unlockedNodes(){const set=new Set(['town','a0']);for(const id of completed){set.add(id);for(const next of WORLD.find(n=>n.id===id)?.next||[])set.add(next)}return set}
function panMap(dt){const chart=$('.map-chart');chart.scrollLeft=Math.max(0,Math.min(Math.max(0,(chart.scrollWidth||0)-(chart.clientWidth||0)),(chart.scrollLeft||0)+mapPan*240*dt))}
function openMap(){mapPan=0;if(state==='setup')return;if(['fight','walk','service'].includes(state)){mapReturn=state;release()}state='map';$('#services').hidden=true;$('#service-controls').hidden=true;$('#world').hidden=false;$('#result').hidden=true;renderMap();const chart=$('.map-chart'),node=WORLD.find(n=>n.id===currentNode);chart.scrollLeft=Math.max(0,(node?.x||0)/100*(chart.clientWidth||0)-(chart.clientWidth||0)*.5);refresh();save()}
function renderMap(){const unlocked=unlockedNodes();$('#map-nodes').innerHTML=WORLD.filter(n=>unlocked.has(n.id)).map(n=>'<button class="map-node '+(completed.includes(n.id)?'cleared ':'')+(currentNode===n.id?'current':'')+'" data-node="'+n.id+'" style="left:'+n.x/3+'%;top:'+n.y+'%" '+(!unlocked.has(n.id)?'disabled':'')+' aria-label="'+n.name+(completed.includes(n.id)?', cleared':unlocked.has(n.id)?', unlocked':', locked')+'"><span>'+(completed.includes(n.id)?'✓':unlocked.has(n.id)?'◆':'○')+'</span><small>'+n.name+'</small></button>').join('');$('#map-lines').innerHTML=WORLD.filter(n=>unlocked.has(n.id)).flatMap(n=>n.next.filter(id=>unlocked.has(id)).map(id=>{const end=WORLD.find(v=>v.id===id);return '<line x1="'+n.x*5.12+'" y1="'+n.y*1.8+'" x2="'+end.x*5.12+'" y2="'+end.y*1.8+'" stroke="'+(unlocked.has(id)?'#aaa36b':'#283421')+'" stroke-dasharray="2 4"/>'})).join('');$('#map-close').hidden=!mapReturn;renderServices()}
function enterService(id){currentNode=id;mapReturn=null;state='service';paused=false;drag=null;shots=[];hazards=[];blasts=[];fields=[];flashes=[];numbers=[];loot=[];enemies=[];potions=[];shopIndex=0;$('#world').hidden=true;$('#result').hidden=true;$('#services').hidden=true;heroes.forEach((h,i)=>{h.x=130+i*20;h.y=226;h.vx=h.vy=h.drive=0;h.strike=null});$('#service-controls').hidden=false;$('#inn').hidden=id!=='town';save();build();tell('Visit the shop, rest at the inn, or open the world map.')}
function travel(id){const node=WORLD.find(n=>n.id===id);if(!node||!unlockedNodes().has(id))return false;if(!node.kind&&heroes.every(h=>h.hp<=0)){tell('Heal at town before travelling.');return false}pickedSlot=null;if(node.kind)enterService(id);else{stage=0;area=node.area;$('#service-controls').hidden=true;enter()}return true}
function completeArea(){if(stage<stageCount()-1){stage++;enter();return}const id='a'+area;if(!completed.includes(id))completed.push(id);mapReturn=null;state='map';openMap();tell('Boss defeated. New routes discovered.');save()}
function salePrice(id){const w=ITEMS[id];return w?(socketItem(id)?25*w.tier:6+w.tier*12):0}
function shopStock(){const cleared=completed.map(id=>WORLD.find(n=>n.id===id)?.area??-1),highest=Math.max(-1,...cleared);if(currentNode==='trader')return [...Object.values(ITEMS).filter(w=>w.type==='rune').slice(0,Math.min(8,2+Math.max(0,highest))),...Object.values(ITEMS).filter(w=>w.type==='gem'&&w.tier<=Math.max(1,Math.floor(highest/2)))];const tier=highest<0?0:Math.max(0,Math.floor(highest/2));return Object.values(ITEMS).filter(w=>w.type==='weapon'&&w.classId===shopClass&&w.tier<=tier)}
function weaponPrice(index){const early=[100,250,500,750,1000];if(index<5)return early[index];const price=1500+(index-5)*500;return price<=10000?price:10000+(index-22)*1000}
function buyPrice(w){if(w.type==='rune')return 80;if(w.type==='gem')return 100*w.tier;const order=['basic','iron','fire','ice','poison','heavy','lightning','stun','heal','drain','steel','poison2','poison3','ice3','steel4'];const stock=Object.values(ITEMS).filter(v=>v.type==='weapon'&&v.classId===w.classId).sort((a,b)=>a.level-b.level||order.indexOf(a.id.split('-')[1])-order.indexOf(b.id.split('-')[1]));return weaponPrice(Math.max(0,stock.findIndex(v=>v.id===w.id)))}
function shopPages(){const stock=shopStock();return [...new Set(stock.map(w=>w.level))].sort((a,b)=>a-b).map(tier=>({tier,items:stock.filter(w=>w.level===tier).sort((a,b)=>buyPrice(a)-buyPrice(b))}))}
function renderServices(){if(state!=='service'){$('#services').hidden=true;return}const pages=shopPages();shopIndex=Math.max(0,Math.min(shopIndex,pages.length-1));const page=pages[shopIndex];$('#service-title').textContent=currentNode==='town'?'TOWN SHOP':'RUNE TRADER';$('#service-description').textContent='';$('#town-heal').hidden=true;const id=pickedSlot?.type==='bag'?slotItem(pickedSlot):null;$('#sell-item').disabled=!id;$('#sell-item').textContent=id?'Sell '+ITEMS[id].name+' — '+salePrice(id)+' gold':'Select inventory item to sell';$('#shop-classes').hidden=currentNode!=='town';$('#shop-classes').innerHTML=classes.map((c,i)=>'<button data-shop-class="'+i+'" class="'+(shopClass===i?'active':'')+'" aria-label="Shop '+c.name+'">'+c.symbol+'</button>').join('');$('#trader-stock').innerHTML=(page?.items||[]).map(w=>'<div class="shop-card"><strong>'+w.name+'</strong><div>'+(socketItem(w.id)?w.description:'AT '+w.min+'–'+w.max+' · AGI '+w.agi.join('–')+'<br>RANGE '+w.range+' · '+(w.effect||'Physical')+(w.arrows?' · '+w.arrows+' arrows':''))+'</div><button data-buy="'+w.id+'" '+(gold<buyPrice(w)||!inventory.includes(null)?'disabled':'')+'>BUY · '+buyPrice(w)+' gold</button></div>').join('');$('#shop-page').textContent=page?'Tier '+page.tier+' · '+(shopIndex+1)+' / '+pages.length:'No stock';$('#shop-prev').disabled=shopIndex<=0;$('#shop-next').disabled=shopIndex>=pages.length-1}

function innCost(){return Math.ceil(heroes.reduce((sum,h)=>sum+Math.max(0,h.maxHp-h.hp),0)/10)}
function healTown(){if(state!=='service'||currentNode!=='town')return false;const cost=innCost();if(gold<cost){tell('The inn costs '+cost+' gold. Sell items at the shop to afford treatment.');return false}gold-=cost;heroes.forEach(h=>h.hp=h.maxHp);save();refresh();tell('The inn restored and revived your party for '+cost+' gold.');return true}
function sellItem(){if(state!=='service'||!['town','trader'].includes(currentNode)||pickedSlot?.type!=='bag')return false;const i=pickedSlot.index,id=inventory[i];if(!id)return false;gold+=salePrice(id);inventory[i]=null;inventoryRunes[i]=[null,null];pickedSlot=null;save();build();renderServices();tell('Sold '+ITEMS[id].name+' with its socketed runes.');return true}
function buyRune(id){const w=shopStock().find(w=>w.id===id),slot=inventory.indexOf(null);if(state!=='service'||!w||gold<buyPrice(w)||slot<0)return false;gold-=buyPrice(w);inventory[slot]=id;inventoryRunes[slot]=[null,null];save();build();renderServices();tell('Bought '+w.name+'.');return true}
function pickPotions(){potions=potions.filter(p=>{const h=heroes.filter(h=>h.hp>0&&h!==drag&&Math.abs(h.x-p.x)<8&&Math.abs(h.y-p.y)<4).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(!h)return true;const heal=Math.min(h.maxHp-h.hp,Math.ceil(h.maxHp*.3));h.hp+=heal;float(h.x,h.y-28,'+'+Math.ceil(heal),'#ff8b97');tell(classes[h.classId].name+' picked up a potion: +'+Math.ceil(heal)+' LP.');save();return false})}
function restoreInfo(){hoverHero=null;inspectingItem=false;$('#character-info').hidden=false;$('#hover-info').hidden=true}
function inspectHero(i){hoverHero=i;inspectingItem=false;$('#character-info').hidden=false;$('#hover-info').hidden=true;refresh()}
function revivalCost(h){return Math.max(Math.ceil(gold*.1),h.level*10)}
function revive(){const h=heroes[selected];if(!h||h.hp>0||state==='setup')return false;const cost=revivalCost(h);if(gold<cost)return false;gold-=cost;h.hp=Math.max(1,Math.ceil(h.maxHp*.1));h.strike=null;h.vx=h.vy=0;h.y=floor(h.x);h.cooldown=.5;if(state==='lost'){state=enemies.some(e=>e.hp>0)?'fight':'walk';paused=false;$('#result').hidden=true}save();build();tell('Revived '+classes[h.classId].name+' for '+cost+' gold.');return true}
function select(i){selected=i;build()}
function itemSymbol(item){return socketItem(item.id)?item.symbol:classes[item.classId].symbol}
function slotMarkup(type,i,id){const w=ITEMS[id],effect=EFFECTS[w?.effect],label=type==='bag'?'Inventory '+(i+1):'Character '+(i+1)+(type==='gear'?' weapon':' socket '+(type==='rune0'?1:2));return '<button class="slot weapon" data-slot="'+type+'" data-index="'+i+'" aria-label="'+label+': '+(w?w.name:'Empty')+'" style="color:'+(w?w.color:'#444')+'">'+(w?(w.type==='weapon'?'<canvas width="32" height="32" id="icon-'+type+'-'+i+'"></canvas>':itemSymbol(w)):'·')+'<small>'+(w?w.level:'')+'</small></button>'}
function build(){
 $('#party').innerHTML=heroes.map((h,i)=>'<button class="slot '+(selected===i?'selected':'')+'" data-hero="'+i+'" aria-label="Select character '+(i+1)+', '+classes[h.classId].name+'"><span class="life"><i style="width:'+h.hp/h.maxHp*100+'%"></i></span><canvas width="32" height="36" id="portrait-'+i+'"></canvas><span class="num">'+(i+1)+'</span></button>').join('');
 $('#weapons').innerHTML=heroes.map((h,i)=>slotMarkup('gear',i,h.weapon)).join('');for(let r=0;r<2;r++)$('#runes-'+r).innerHTML=heroes.map((h,i)=>slotMarkup('rune'+r,i,h.runes[r])).join('');$('#items').innerHTML=inventory.map((id,i)=>slotMarkup('bag',i,id)).join('');
 for(const [type,ids] of [['gear',heroes.map(h=>h.weapon)],['bag',inventory]])ids.forEach((id,i)=>{const w=ITEMS[id];if(w?.type==='weapon'){const c=$('#icon-'+type+'-'+i).getContext('2d');c.clearRect(0,0,32,32);drawWeapon(c,w.classId,[13,21],1,0,w.color)}});
 heroes.forEach((h,i)=>portrait($('#portrait-'+i).getContext('2d'),h.classId));restoreInfo();refresh();
}
function slotRunes(slot){return slot.type==='bag'?inventoryRunes[slot.index]:slot.type==='gear'?heroes[slot.index].runes:[]}
function inspect(id,runes=[]){
 inspectingItem=true;$('#character-info').hidden=true;$('#hover-info').hidden=false;
 const w=ITEMS[id],e=EFFECTS[w?.effect];$('#item-name').textContent=w?w.name:'Empty slot';
 if(socketItem(id)){$('#item-details').textContent='TYPE '+(w.type==='gem'?'Gem':'Rune artifact')+'\nCLASS All\nTIER '+w.tier;$('#item-effect').textContent=w.description;return}
 $('#item-details').textContent=w?'AT '+w.min+'–'+w.max+'\nAGI '+w.agi.join('–')+'\nRANGE '+w.range+'\nTYPE '+(w.effect||'Physical')+'\nMP '+mpCost(w)+'\nCLASS '+classes[w.classId].name+(w.arrows?'\nARROWS '+w.arrows:''):'Drag an item into this slot.';
 $('#item-effect').textContent=e?e.description+' Bonus AT '+e.min+'–'+e.max+'.':'';if(w?.type==='weapon'&&runes.some(Boolean))$('#item-effect').textContent+='\n'+runes.filter(Boolean).map(id=>ITEMS[id].name).join(', ');
}
function refresh(){$('#inn').textContent='INN · Heal '+innCost()+' gold';const h=heroes[hoverHero??selected];if(!h)return;$('#gem-defense').hidden=!h.defense;$('#gem-defense').textContent='DEF +'+h.defense;$('#revive').hidden=h.hp>0||h!==heroes[selected];$('#revive').textContent='Revival $ '+revivalCost(h);$('#revive').disabled=gold<revivalCost(h);$('.stat-columns').hidden=h.hp<=0;$('#class-name').textContent=classes[h.classId].name;$('#lp').textContent=Math.ceil(h.hp)+'/'+h.maxHp;$('#attack').textContent=Math.max(1,Math.round(h.atMin*aura(h).attack))+'–'+Math.max(1,Math.round(h.atMax*aura(h).attack));$('#agi').textContent=h.agi.join('–');$('#range').textContent=h.range;$('#level').textContent=h.level;$('#sp').textContent=h.sp;for(const [i,name] of ['str','dex','int'].entries()){$('#'+name).textContent=h[name];const btn=$('[data-stat="'+name+'"]');btn.disabled=h.sp<1;btn.title=STAT_HELP[h.classId][i];btn.setAttribute('aria-label','Add '+name.toUpperCase()+': '+STAT_HELP[h.classId][i]);}
 $('[data-stat="lp"]').disabled=h.sp<1||h.hp<=0;$('#priest-aura').hidden=![4,5,7].includes(h.classId);$('#priest-aura').textContent=h.classId===4?'AURA AT +'+h.str+'% · DEF +'+Number((h.dex*.2).toFixed(1))+'\nRANGE '+h.range+' · nearby allies':h.classId===5?'CRIT '+Math.round(h.crit*100)+'%':h.classId===7?'ACTIVATIONS '+(1+h.extra):'';
 $('#stat-help').textContent='STR: '+STAT_HELP[h.classId][0]+' | DEX: '+STAT_HELP[h.classId][1]+' | INT: '+STAT_HELP[h.classId][2];
 const w=ITEMS[h.weapon],e=EFFECTS[w?.effect];$('#mp').textContent=e?h.mp+'/'+mpCost(w):'—';$('#mp-fill').style.width=e?h.mp/mpCost(w)*100+'%':'0%';$('#mp-hint').textContent=e?(h.int?Math.ceil((mpCost(w)-h.mp)/h.int)+' hits to '+e.name:'Spend a point in INT to charge '+e.name):w?'Physical weapon':'Unarmed';
 $('#xp').textContent=Math.floor(h.xp)+'/'+needed(h.level);$('#xp-fill').style.width=h.xp/needed(h.level)*100+'%';$('#gold').textContent=gold;$('#area').textContent=state==='map'?'World Map':state==='service'?(currentNode==='town'?'Town':'Rune Trader'):WORLD.find(n=>n.id==='a'+area).name+' : '+(stage+1)+'/'+stageCount()+(stage===stageCount()-1?' BOSS':'');$('#pause').textContent=paused?'Resume':'Pause';heroes.forEach((h,i)=>{const bar=$('[data-hero="'+i+'"] .life i');if(bar)bar.style.width=Math.max(0,h.hp/h.maxHp)*100+'%'});}
function update(dt){time+=dt;if(drag)stepHeld(drag,dt);numbers.forEach(n=>{n.y-=13*dt;n.life-=dt});numbers=numbers.filter(n=>n.life>0);if(state==='service'){for(const h of heroes)if(h.hp>0&&h!==drag){h.drive=0;stepBody(h,dt)}uiTime+=dt;if(uiTime>.1){refresh();uiTime=0}return}if(state!=='fight'&&state!=='walk')return;tickEffects(dt);
 for(const h of heroes){h.auraFlash=Math.max(0,(h.auraFlash||0)-dt);h.flash=Math.max(0,(h.flash||0)-dt);h.anim=Math.max(0,h.anim-dt);resolveStrike(h,dt);if(h.hp<=0||h===drag)continue;stepBody(h,dt);h.hp=Math.min(h.maxHp,h.hp+h.runeBonus.regen*dt);h.cooldown-=dt;h.hold=Math.max(0,h.hold-dt);h.walk=false;if(!grounded(h)){h.strike=null;continue}if(state==='walk'){h.drive=0;continue}
 const target=enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];if(!target)continue;const d=Math.hypot(target.x-h.x,target.y-h.y);h.face=target.x>=h.x?1:-1;if(d>h.range&&h.hold<=0){h.drive=h.face*33;h.walk=true}if(d<=h.range+3&&(h.kind==='aura'||Math.abs(h.y-target.y)<45)&&h.cooldown<=0){h.cooldown=roll(...h.agi)/30;attackMotion(h);const token=attackToken(h),amount=basicAmount(h);if(h.kind==='aura'){for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-h.x,e.y-h.y)<=h.range)basicHit(e,amount,token);h.auraFlash=.25}else if(h.kind==='melee'||h.kind==='whip')h.strike={left:.09,target,amount,token,range:h.range};else shoot(h,target,h.kind==='heal'?'magic':h.kind,amount,token)}}
 const additions=[];for(const e of enemies){if(e.hp<=0||e.frozen>0||e.stun>0)continue;tickSlash(e,dt);e.flash=Math.max(0,e.flash-dt);if(!physicalEnemy(e))moveEnemy(e,(e.kick||0)*dt,dt);e.kick=(e.kick||0)*Math.exp(-9*dt);e.cooldown-=dt;if(e.type==='summoner'){e.summon-=dt;if(e.summon<=0&&e.remaining>0){const m=enemy('slime',Math.max(130,e.x-20));m.minion=true;m.hp=m.maxHp*=.55;additions.push(m);e.remaining--;e.summon=8;float(e.x,e.y-30,'SUMMON','#d795ee')}}const target=heroes.filter(h=>h.hp>0).sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];if(!target)continue;if(physicalEnemy(e))stepEnemyPhysics(e,target,dt);tickCatapult(e,target,dt);enemyTrait(e,target,dt);tickSpecial(e,target,dt);const d=Math.abs(target.x-e.x);if(e.type==='archer'&&d<65)moveEnemy(e,-Math.sign(target.x-e.x)*e.speed*dt,0);else if(d>e.range&&!physicalEnemy(e))moveEnemy(e,Math.sign(target.x-e.x)*e.speed*(slowFactor(e))*dt,0);else if(d<=e.range&&e.type!=='bomber'&&e.type!=='catapult'&&e.cooldown<=0&&Math.abs(target.y-e.y)<(e.range>50?50:18)){e.cooldown=e.type==='boss'?1.2:1.4;if(e.type==='slasher'){e.slash={left:.18,face:Math.sign(target.x-e.x)||1,hit:false,life:.32};e.cooldown=1.6}else if(e.type==='archer')launchHazard(e,target,'arrow',0,e.at);else if(e.range>20)shoot(e,target,'enemy',e.at);else damage(target,e.at)}}enemies.push(...additions);
 tickShots(dt);enemies=enemies.filter(e=>e.hp>0);tickHazards(dt);pickLoot();pickPotions();
 if(heroes.every(h=>h.hp<=0)){heroes.forEach(h=>h.hp=Math.max(1,Math.ceil(h.maxHp*.05)));enterService('town');tell('Party defeated. Returned to town with 5% LP.');return}
 if(!enemies.length&&state==='fight'){state='walk';heroes.forEach(h=>{h.drive=0;h.strike=null;if(grounded(h))h.vx=0});tell('STAGE CLEAR — move one character to the NEXT sign.');save()}
 if(state==='walk'&&heroes.some(h=>h.hp>0&&h.x+6>=479&&h.x-6<=510&&h.y>=205&&h.y-27<=226)){completeArea();return}
 saveTime+=dt;if(saveTime>=1){save();saveTime=0}uiTime+=dt;if(uiTime>.1){refresh();uiTime=0}}
function line(c,points,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x)+.5,Math.round(y)+.5):c.moveTo(Math.round(x)+.5,Math.round(y)+.5));c.stroke()}
function grounded(h){return h!==drag&&h.y>=floor(h.x)-.5&&Math.abs(h.vy||0)<1}
function springPose(h,dt){h.crouchV=(h.crouchV||0)+(-(h.crouch||0)*180-(h.crouchV||0)*17)*dt;h.crouch=Math.max(0,Math.min(7,(h.crouch||0)+h.crouchV*dt))}
function stepHeld(h,dt){if(!h.dragTarget)return;const target=h.dragTarget,boost=Math.min(4,(h.cursorSpeed||0)/200),stiffness=110*(1+boost),damping=15*Math.sqrt(1+boost),limit=420+boost*120;h.cursorSpeed=(h.cursorSpeed||0)*Math.exp(-5*dt);h.vx=(h.vx||0)+((target.x-h.x)*stiffness-(h.vx||0)*damping)*dt;h.vy=(h.vy||0)+((target.y-h.y)*stiffness-(h.vy||0)*damping+100)*dt;h.vx=Math.max(-limit,Math.min(limit,h.vx));h.vy=Math.max(-limit-60,Math.min(limit+60,h.vy));h.x=Math.max(8,Math.min(503,h.x+h.vx*dt));h.y=Math.max(8,Math.min(floor(h.x),h.y+h.vy*dt));h.leanV=(h.leanV||0)+((h.vx*.06-(h.lean||0))*70-(h.leanV||0)*8)*dt;h.lean=(h.lean||0)+h.leanV*dt;h.swingV=(h.swingV||0)+(-h.swing*70-(h.swingV||0)*7-h.vx*.15)*dt;if(!Number.isFinite(h.swingV))h.swingV=0;h.swing=(h.swing||0)+h.swingV*dt;springPose(h,dt)}
function moveEnemy(e,dx,dt){const nx=Math.max(8,Math.min(505,e.x+dx));e.vy=e.vy||0;if(floor(nx)<e.y-.5&&e.y>=floor(e.x)-.5){e.vy=-Math.sqrt(2*390*(e.y-floor(nx)+3))}else if(floor(nx)>=e.y-.5)e.x=nx;e.vy+=390*dt;e.y+=e.vy*dt;if(e.y>=floor(e.x)){e.y=floor(e.x);e.vy=0}}
function stepBody(h,dt){springPose(h,dt);
 h.vx=Number.isFinite(h.vx)?h.vx:0;h.drive=h.drive||0;h.lean=h.lean||0;h.leanV=h.leanV||0;h.swing=h.swing||0;h.swingV=h.swingV||0;h.gait=h.gait||0;
 const grounded=h.y>=floor(h.x)-.5,oldV=h.vx;
 if(grounded)h.vx+=(h.drive-h.vx)*(1-Math.exp(-9*dt));else h.vx*=Math.exp(-.35*dt);
 let nx=h.x+h.vx*dt;if(floor(nx)<h.y-.5){if(grounded)h.vy=-Math.sqrt(2*390*(h.y-floor(nx)+3));nx=h.x}
 h.x=Math.max(8,Math.min(504,nx));h.vy+=390*dt;h.y+=h.vy*dt;
 if(h.y>=floor(h.x)){if(h.vy>80){h.leanV+=Math.sign(h.vx||1)*h.vy*.012;h.crouch=Math.min(7,h.vy*.018);h.crouchV=15;h.swingV+=(h.face||1)*h.vy*.025}h.y=floor(h.x);h.vy=0}
 const targetLean=h.vx*.035+(h.vx-oldV)*.045;
 h.leanV+=((targetLean-h.lean)*95-h.leanV*16)*dt;h.lean+=h.leanV*dt;
 h.swingV+=(-h.swing*115-h.swingV*9)*dt;h.swing+=h.swingV*dt;
 if(grounded)h.gait+=Math.abs(h.vx)*dt*.25;h.drive=0;
}
function attackMotion(h){h.anim=.38;h.swing=-.8;h.swingV=48;h.leanV+=(h.face||1)*25;h.vx=(h.vx||0)+(h.face||1)*(h.kind==='melee'?22:-9)}
function resolveStrike(h,dt){const s=h.strike;if(!s)return;s.left-=dt;if(s.left>0)return;h.strike=null;if(h.hp<=0||h===drag||!grounded(h))return;const targets=h.kind==='whip'?enemies.filter(e=>e.hp>0&&Math.abs(e.x-h.x)<=s.range+8):[s.target];for(const e of targets)if(e.hp>0&&Math.abs(e.x-h.x)<=s.range+10&&Math.abs(e.y-h.y)<40){basicHit(e,s.amount,s.token);e.kick=(e.kick||0)+(h.face||1)*35}}
function knee(a,b,bend){const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(1,Math.hypot(dx,dy)),offset=Math.sqrt(Math.max(0,7*7-length*length/4))*bend;return [(a[0]+b[0])/2-dy/length*offset,(a[1]+b[1])/2+dx/length*offset]}
function stick(c,h,mark){
 c.save();c.translate(h.x,h.y);if(h.hp<=0){c.rotate(-Math.PI/2);c.globalAlpha=.4}
 const col=h.flash?'#fff':h.color,f=h.face||1,g=h.gait||0,moving=Math.min(1,Math.abs(h.vx||0)/25),air=Math.min(1,Math.max(Math.abs(h.vy||0)/100,(floor(h.x)-h.y)/35)),lean=h.lean||0,swing=h.swing||0;
 const bob=Math.abs(Math.sin(g))*1.8*moving-(h.crouch||0),hip=[lean*.25,-10-bob],shoulder=[lean,-18-bob];
 for(const side of [-1,1]){const phase=g+(side===1?Math.PI:0),foot=[side*2-Math.cos(phase)*5*moving*Math.sign(h.vx||f)-f*air*3,-Math.max(0,Math.sin(phase))*4*moving-air*3];line(c,[hip,knee(hip,foot,-f),foot],col)}
 line(c,[hip,shoulder],col);c.strokeStyle=col;c.strokeRect(shoulder[0]-3,shoulder[1]-7,6,6);
 const wobble=(Math.sin(time*5.3+h.id*2.7)+Math.sin(time*8.1+h.id))*.65*moving+Math.sin(time*4+h.id)*air*.7,arm=swing+wobble;
 const hand=[shoulder[0]+f*(6+Math.sin(arm)*5),shoulder[1]+5-Math.sin(arm)*5];
 line(c,[shoulder,knee(shoulder,hand,-f),hand],col);line(c,[shoulder,[shoulder[0]-f*(4+Math.sin(arm)*3),-13-bob],[shoulder[0]-f*(5+Math.sin(arm)*4),-9-bob+Math.cos(arm)*moving*3]],col);
 if(h.weapon)drawWeapon(c,h.classId,hand,f,arm,ITEMS[h.weapon]?.color||'#ddd');
 if(mark&&h.hp>0){c.fillStyle='#fff';c.fillRect(-1,-35,3,2)}c.restore();
}

function drawWeapon(c,id,hand,f,arm,color){c.save();c.translate(hand[0],hand[1]);c.scale(f,1);c.strokeStyle=color;c.fillStyle=color;
 if(id===0){c.rotate(arm*.95);line(c,[[0,3],[0,-13],[2,-16],[3,-13],[2,3]],color);line(c,[[-4,-1],[5,-1]],'#c9a459');line(c,[[1,0],[1,5]],'#aa7848')}
 if(id===1){c.fillRect(-2,-3,6,5);c.strokeStyle='#fff';c.strokeRect(-2,-3,6,5)}
 if(id===2){line(c,[[-5,-10],[-1,-6],[0,0],[-1,6],[-5,10]],color);line(c,[[-5,-10],[-6-Math.max(0,arm)*2,0],[-5,10]],'#a7a7a7');line(c,[[-4,0],[10,0],[7,-2]],'#eee')}
 if(id===3){line(c,[[0,5],[0,-7]],'#b18e60');c.strokeStyle=color;c.beginPath();c.arc(0,-10,4,0,Math.PI*2);c.stroke()}
 if(id===4){line(c,[[0,8],[0,-14]],'#c6a06a');line(c,[[-4,-10],[4,-10]],color);c.fillRect(-1,-15,3,4)}
 if(id===5){c.rotate(arm*.7);line(c,[[-5,8],[12,-18]],'#bd965e');line(c,[[9,-15],[12,-22],[14,-17],[9,-15]],color)}
 if(id===6){c.fillRect(-2,-5,14,4);c.fillRect(-1,-1,3,5);c.fillRect(3,-7,2,2);line(c,[[12,-4],[16,-4]],'#bbb')}
 if(id===7){line(c,[[0,4],[2,-3]],'#c49a59');const points=[[2,-3]];for(let i=1;i<7;i++)points.push([2+i*3,-3+Math.sin(arm*2-i*.6)*i]);line(c,points,color)}
 c.restore()}

function portrait(c,classId){c.clearRect(0,0,32,36);const col=classes[classId].color;c.strokeStyle=col;c.strokeRect(13,4,6,6);line(c,[[16,11],[16,22],[11,31]],col);line(c,[[16,22],[21,31]],col);line(c,[[10,21],[12,15],[16,13],[21,17],[23,13]],col);drawWeapon(c,classId,[23,17],1,0,col)}
function serviceScenery(){const house=(x,label)=>{line(ctx,[[x,226],[x,181],[x+38,150],[x+76,181],[x+76,226]],'#b98539');line(ctx,[[x-5,183],[x+38,148],[x+81,183]],'#e5bb54');ctx.strokeStyle='#7a532b';ctx.strokeRect(x+28,201,20,25);ctx.fillStyle='#fff0ab';ctx.font='9px monospace';ctx.fillText(label,x+18,186)};house(12,currentNode==='town'?'SHOP':'RUNES');if(currentNode==='town')house(350,'INN');ctx.fillStyle='#bb9146';ctx.fillRect(474,207,34,9);ctx.fillRect(488,216,2,10);ctx.fillStyle='#000';ctx.font='7px monospace';ctx.fillText('MAP >',476,214)}
function terrain(){ctx.fillStyle='#000';ctx.fillRect(0,0,512,256);const biome=state==='service'?0:Math.floor(area/3),cave=biome===2,palette=[['#c99449','#42ed28','#f1c270'],['#695d36','#7aa544','#95804b'],['#837568','#aaa6a0','#b1a092'],['#b88b42','#f1cf78','#e3b965'],['#555c67','#a6abb3','#808995'],['#849cad','#effaff','#bcd8e8']][biome]||['#849cad','#effaff','#bcd8e8'];for(let x=0;x<512;x++){const y=floor(x);ctx.fillStyle=palette[0];ctx.fillRect(x,y,1,256-y);ctx.fillStyle=palette[1];ctx.fillRect(x,y,1,1);ctx.fillStyle=palette[2];for(let py=y+3+(x%3);py<256;py+=4)if(x%3===0)ctx.fillRect(x,py,1,1)}if(biome>=3){for(let i=0;i<6;i++){const x=45+i*83,y=floor(x);if(biome===3){line(ctx,[[x,y],[x,y-25],[x-6,y-20],[x-6,y-13]],'#758344')}else{line(ctx,[[x-27,y],[x,y-65-(i%3)*15],[x+32,y]],biome===5?'#688597':'#414750');if(biome===5)line(ctx,[[x-6,y-51-(i%3)*15],[x,y-65-(i%3)*15],[x+7,y-50-(i%3)*15]],'#e2f3ff')}}}if(cave){ctx.fillStyle='#6c635b';for(let x=0;x<512;x+=8)ctx.fillRect(x,0,8,7+(x*7)%17)}if(state==='walk'){ctx.fillStyle='#be8d46';ctx.fillRect(479,205,31,10);ctx.fillRect(484,215,2,11);ctx.fillStyle='#000';ctx.font='8px monospace';ctx.fillText('NEXT>',480,213)}}

function drawEnemy(e){const r=e.type==='boss'?17:e.type==='beetle'?11:e.type==='swarmling'?4:e.type==='summoner'?9:7,x=Math.round(e.x),y=Math.round(e.y)+(e.crouching?3:0),color=e.flash?'#fff':e.frozen>0?'#79cfff':e.poison?'#a3ff57':e.color;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();
 if(e.type==='spider'){for(const foot of e.feet){line(ctx,[[x,y-11],[(x+foot.x)/2+(foot.x<x?-7:7),Math.min(y-15,foot.y-10)],[foot.x,foot.y]],color)}ctx.ellipse(x,y-10,7,4,0,0,Math.PI*2);ctx.stroke()}
 else if(e.type==='roller'){ctx.arc(x,y-9,9,0,Math.PI*2);ctx.stroke();for(let j=0;j<3;j++){const a=e.rotation+j*Math.PI*2/3;line(ctx,[[x,y-9],[x+Math.cos(a)*8,y-9+Math.sin(a)*8]],color)}}
 else if(e.type==='flyer'){const flap=Math.sin(time*20+e.seed)*10;line(ctx,[[x-2,y-12],[x-10,y-18-flap],[x-21,y-7-flap],[x-9,y-8],[x,y-4],[x+9,y-8],[x+21,y-7-flap],[x+10,y-18-flap],[x+2,y-12]],color);ctx.fillRect(x-3,y-12,6,7)}
 else if(e.type==='catapult'){ctx.strokeRect(x-12,y-8,24,5);ctx.strokeRect(x-9,y-3,4,4);ctx.strokeRect(x+5,y-3,4,4);line(ctx,[[x-6,y-8],[x,y-20],[x+6,y-8]],color);const arm=e.lob?e.lob.left*12:0;line(ctx,[[x-7,y-10],[x+8-arm,y-27]],color);ctx.strokeRect(x+5-arm,y-31,6,5)}
 else if(e.type==='summoner'||e.type==='shaman'){ctx.moveTo(x-r,y-3);ctx.lineTo(x,y-25);ctx.lineTo(x+r,y-3);ctx.closePath();ctx.stroke();if(e.type==='shaman'){line(ctx,[[x+12,y],[x+12,y-25]],color);ctx.strokeRect(x+10,y-28,4,4)}}
 else if(e.type==='archer'){ctx.strokeRect(x-3,y-24,6,6);line(ctx,[[x,y-18],[x,y-7],[x-5,y],[x,y-7],[x+5,y]],color);line(ctx,[[x,y-16],[x-9,y-12]],color);line(ctx,[[x-12,y-23],[x-17,y-13],[x-12,y-3],[x-12,y-23]],color)}
 else{ctx.ellipse(x,y-r,r,r-1,0,Math.PI,Math.PI*3);ctx.stroke();if(e.type==='beetle'){line(ctx,[[x,y-r*2],[x,y-1]],color);for(const side of [-1,1])for(let j=0;j<3;j++)line(ctx,[[x+side*8,y-4-j*4],[x+side*14,y-j*4]],color)}
 if(e.type==='hopper'){line(ctx,[[x-3,y-5],[x-11,y-8],[x-7,y]],color);line(ctx,[[x+3,y-5],[x+11,y-8],[x+7,y]],color)}
 if(e.type==='bomber'){ctx.fillRect(x-5,y-18,3,3);ctx.fillRect(x+3,y-18,3,3);ctx.strokeRect(x-4,y-8,8,4)}}
 ctx.fillRect(x-3,y-r,1,2);ctx.fillRect(x+3,y-r,1,2);if(e.hp<e.maxHp){ctx.fillStyle='#c32929';ctx.fillRect(x-r,y-r*2-5,Math.max(1,Math.round(2*r*e.hp/e.maxHp)),2)}
}

function draw(){ctx.imageSmoothingEnabled=false;terrain();drawHazards();if(state==='service')serviceScenery();enemies.forEach(drawEnemy);fields.forEach(f=>{ctx.fillStyle=f.color;for(let i=0;i<10;i++)ctx.fillRect(f.x-25+i*5,f.y-2-(i%3)*2,2,2)});flashes.forEach(f=>line(ctx,[[f.x,f.y],[(f.x+f.tx)/2,f.ty-12],[f.tx,f.ty]],f.color));potions.forEach(p=>{ctx.fillStyle='#eeeeee';ctx.fillRect(p.x-1,p.y-9,3,3);ctx.fillStyle='#f44264';ctx.fillRect(p.x-3,p.y-6,7,5);ctx.fillStyle='#ff9aaf';ctx.fillRect(p.x-2,p.y-5,2,2)});loot.forEach(l=>{ctx.fillStyle=ITEMS[l.item].color;ctx.fillRect(Math.round(l.x),l.y-5,3,5)});heroes.forEach((h,i)=>{if(h.classId===4&&h.hp>0&&(i===selected||h.auraFlash>0)){ctx.strokeStyle=h.auraFlash>0?'#72d9ff':'#163440';ctx.beginPath();ctx.arc(h.x,h.y-13,h.range,0,Math.PI*2);ctx.stroke()}stick(ctx,h,i===selected)});shots.forEach(s=>{ctx.fillStyle=s.kind==='heal'?'#60ff70':s.kind==='magic'?'#df81ff':s.kind==='enemy'?'#ed9552':'#eee';s.kind==='arrow'?line(ctx,[[s.x-s.vx/22,s.y-s.vy/22],[s.x,s.y]],'#eee'):ctx.fillRect(Math.round(s.x),Math.round(s.y),2,2)});ctx.font='7px monospace';ctx.textAlign='center';numbers.forEach(n=>{ctx.fillStyle=n.color;ctx.fillText(n.text,Math.round(n.x),Math.round(n.y))});ctx.textAlign='left';if(paused){ctx.fillStyle='#ffffff';ctx.font='12px monospace';ctx.fillText('PAUSED',233,90)}}
function toggle(){if(!['fight','walk'].includes(state))return;paused=!paused;refresh()}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*512/r.width,y:(e.clientY-r.top)*256/r.height}}
canvas.addEventListener('pointerdown',e=>{if(paused||!['fight','walk','service'].includes(state))return;const p=point(e),h=heroes.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.y-13-p.y)-Math.hypot(b.x-p.x,b.y-13-p.y))[0];if(h&&Math.hypot(h.x-p.x,h.y-13-p.y)<22){if(h.hp<=0){select(heroes.indexOf(h));return}drag=h;h.cursorSpeed=0;h.strike=null;h.dragTarget={x:h.x,y:h.y};h.dragSample={x:h.x,y:h.y,t:e.timeStamp};h.throwVx=0;h.throwVy=0;select(heroes.indexOf(h));canvas.setPointerCapture(e.pointerId)}});
canvas.addEventListener('pointermove',e=>{if(!drag){const p=point(e),i=heroes.findIndex(h=>Math.hypot(h.x-p.x,h.y-13-p.y)<18);if(i>=0)inspectHero(i);else{const foe=enemies.find(e=>Math.hypot(e.x-p.x,e.y-12-p.y)<17);if(foe){$('#character-info').hidden=true;$('#hover-info').hidden=false;$('#item-name').textContent=foe.name;$('#item-details').textContent='LV '+foe.level+' · LP '+Math.ceil(foe.hp)+' / '+foe.maxHp+'\nAT '+Math.round(foe.at)+' · RANGE '+foe.range;$('#item-effect').textContent=ENEMY_TYPES[foe.type]?.description||'Watch its attacks and reposition your party.'}else{restoreInfo();refresh()}}return}if(paused)return;const p=point(e);moveHeld(p.x,p.y+13,e.timeStamp)}); 
function moveHeld(x,y,t){if(!drag)return;const prev=drag.dragSample;if(prev&&t>prev.t)drag.cursorSpeed=Math.min(2000,Math.hypot(x-prev.x,y-prev.y)/Math.max(.008,(t-prev.t)/1000));drag.dragTarget={x:Math.max(8,Math.min(503,x)),y:Math.max(20,Math.min(floor(x),y))};drag.dragSample={x,y,t};drag.strike=null}
function release(e){if(drag){if(!e||!Number.isFinite(e.timeStamp)){drag.vx=0;drag.vy=0}drag.hold=.4;drag.drive=0;drag.dragTarget=null;drag.dragSample=null;drag=null}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>release());
$('#pause').onclick=toggle;$('#speed').onclick=()=>{speed=speed===1?2:1;$('#speed').textContent=speed+'x'};$('#start').onclick=start;$('#retry').onclick=()=>{enterService('town')};$('#new').onclick=()=>{if(heroes.length&&!confirm('Start a new party? This replaces your current run.'))return;state='setup';paused=false;$('#services').hidden=true;$('#service-controls').hidden=true;$('#setup').hidden=false;$('#result').hidden=true;$('#world').hidden=true;tell('Choose any combination of four classes.');refresh()};$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{tell('Full screen is unavailable in this browser.')}};
$('#revive').onclick=revive;
$('#party').onclick=e=>{const b=e.target.closest('[data-hero]');if(b)select(+b.dataset.hero)};
$('.stats').onclick=e=>{const b=e.target.closest('[data-stat]');if(b)allocate(b.dataset.stat)};
function slotFrom(el){const b=el?.closest('[data-slot]');return b?{type:b.dataset.slot,index:+b.dataset.index}:null}
const app=$('#app');
function fitFullscreen(){const full=!!document.fullscreenElement;$('#fullscreen').textContent=full?'Exit Full Screen':'Full Screen';const scale=full?Math.min(1,(window.innerHeight-16)/Math.max(1,app.scrollHeight)):1;app.style.setProperty('--fullscreen-scale',String(Math.max(.1,scale)))}
document.addEventListener?.('fullscreenchange',fitFullscreen);window.addEventListener('resize',fitFullscreen);if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitFullscreen).observe(app);
$('.map-chart').addEventListener('pointermove',e=>{const r=$('.map-chart').getBoundingClientRect(),x=e.clientX-r.left;mapPan=x>r.width-65?1:x<65?-1:0});$('.map-chart').addEventListener('pointerleave',()=>mapPan=0);
$('#map-left').onclick=()=>{$('.map-chart').scrollLeft-=240};$('#map-right').onclick=()=>{$('.map-chart').scrollLeft+=240};
$('#world-button').onclick=openMap;
$('#open-shop').onclick=()=>{$('#services').hidden=false;renderServices()};
$('#inn').onclick=healTown;$('#shop-exit').onclick=()=>$('#services').hidden=true;
$('#shop-prev').onclick=()=>{shopIndex--;renderServices()};$('#shop-next').onclick=()=>{shopIndex++;renderServices()};
$('#shop-classes').onclick=e=>{const b=e.target.closest('[data-shop-class]');if(b){shopClass=+b.dataset.shopClass;shopIndex=0;renderServices()}};
canvas.addEventListener('click',e=>{if(state!=='service')return;const p=point(e);if(p.x<100&&p.y>145){$('#services').hidden=false;renderServices()}else if(currentNode==='town'&&p.x>350&&p.x<435&&p.y>145)healTown();else if(p.x>470&&p.y>195)openMap()});
$('#map-close').onclick=()=>{if(!mapReturn)return;state=mapReturn;mapReturn=null;$('#world').hidden=true;$('#service-controls').hidden=state!=='service';refresh()};
$('#map-nodes').onclick=e=>{const n=e.target.closest('[data-node]');if(n)travel(n.dataset.node)};
$('#town-heal').onclick=healTown;$('#sell-item').onclick=sellItem;
$('#trader-stock').onclick=e=>{const b=e.target.closest('[data-buy]');if(b)buyRune(b.dataset.buy)};
app.addEventListener('mouseout',e=>{const item=e.target.closest('[data-slot],[data-hero]');if(item&&!item.contains(e.relatedTarget)){restoreInfo();refresh()}});
app.addEventListener('focusout',e=>{if(e.target.closest('[data-slot],[data-hero]')){restoreInfo();refresh()}});
canvas.addEventListener('pointerleave',()=>{if(!drag){restoreInfo();refresh()}});
window.addEventListener('beforeunload',save);
app.addEventListener('pointerdown',e=>{const from=slotFrom(e.target);if(!from||!slotItem(from)||e.button!==0)return;gearDrag={from,startX:e.clientX,startY:e.clientY,moved:false,pointerId:e.pointerId}});
app.addEventListener('pointermove',e=>{if(!gearDrag)return;const d=gearDrag;if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>5)d.moved=true;if(!d.moved)return;if(!app.hasPointerCapture?.(d.pointerId))app.setPointerCapture(d.pointerId);e.preventDefault();const w=ITEMS[slotItem(d.from)],ghost=$('#drag-item');ghost.hidden=false;ghost.textContent=itemSymbol(w);ghost.style.color=w.color;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';const target=slotFrom(document.elementFromPoint(e.clientX,e.clientY));document.querySelectorAll('[data-slot]').forEach(el=>el.classList.remove('drop-ok','drop-no'));if(target){const el=$('[data-slot="'+target.type+'"][data-index="'+target.index+'"]');el.classList.add(accepts(target,w.id)&&accepts(d.from,slotItem(target))?'drop-ok':'drop-no')}});
function endGear(e,cancel=false){if(!gearDrag)return;const d=gearDrag;gearDrag=null;$('#drag-item').hidden=true;document.querySelectorAll('[data-slot]').forEach(el=>el.classList.remove('drop-ok','drop-no'));if(app.hasPointerCapture?.(d.pointerId))app.releasePointerCapture(d.pointerId);if(d.moved){suppressGearClick=true;if(!cancel){const to=slotFrom(document.elementFromPoint(e.clientX,e.clientY));if(to)moveItem(d.from,to)}setTimeout(()=>suppressGearClick=false,0)}}
app.addEventListener('pointerup',e=>endGear(e));app.addEventListener('pointercancel',e=>endGear(e,true));
app.addEventListener('click',e=>{if(suppressGearClick)return;const slot=slotFrom(e.target);if(!slot)return;if(pickedSlot){const from=pickedSlot;pickedSlot=null;moveItem(from,slot);build()}else if(slotItem(slot)){pickedSlot=slot;inspect(slotItem(slot),slotRunes(slot));tell('Item selected. Click a destination slot, or drag it there.');e.target.closest('[data-slot]').classList.add('item-picked');if(state==='service')renderServices()}});
app.addEventListener('mouseover',e=>{const slot=slotFrom(e.target),card=e.target.closest('[data-hero]');if(slot)inspect(slotItem(slot),slotRunes(slot));else if(card)inspectHero(+card.dataset.hero)});app.addEventListener('focusin',e=>{const slot=slotFrom(e.target),card=e.target.closest('[data-hero]');if(slot)inspect(slotItem(slot));else if(card)inspectHero(+card.dataset.hero)});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){pickedSlot=null;if(gearDrag)endGear(e,true);build();return}if(e.target.matches('select,button'))return;if(e.code==='Space'){e.preventDefault();toggle()}if(/^[1-4]$/.test(e.key)&&heroes.length)select(+e.key-1)});window.addEventListener('blur',()=>{if(state==='fight'||state==='walk'){release();if(gearDrag)endGear({},true)}});
$('#choices').innerHTML=[0,2,3,4].map((n,i)=>`<label class="choice">${i+1}<canvas width="32" height="40" id="choice-${i}"></canvas><select aria-label="Character ${i+1} class">${classes.map((c,j)=>`<option value="${j}" ${j===n?'selected':''}>${c.name}</option>`).join('')}</select></label>`).join('');
function previews(){document.querySelectorAll('#choices select').forEach((el,i)=>{const c=$(`#choice-${i}`).getContext('2d');c.clearRect(0,0,32,40);stick(c,{...hero(+el.value,i),x:16,y:35},false)})}$('#choices').onchange=previews;previews();if(load()){$('#setup').hidden=true;enterService('town')}else{heroes=[0,2,3,4].map(hero);build()}
function frame(t){const dt=Math.min(.1,Math.max(0,(t-last)/1000));last=t;if(state==='map')panMap(dt);if(!paused){let left=dt*speed;while(left>0){const step=Math.min(left,1/120);update(step);left-=step}}draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();



