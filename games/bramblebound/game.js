(() => {
'use strict';
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d'),KEY='bramblebound-v3';
const classes=[
 {name:'Warrior',hp:110,at:12,range:20,cool:.7,color:'#eeeeee',symbol:'╱',kind:'melee'},
 {name:'Rogue',hp:110,at:7,range:14,cool:.32,color:'#ed614e',symbol:'⚔',kind:'melee'},
 {name:'Ranger',hp:80,at:11,range:125,cool:1,color:'#81c768',symbol:')',kind:'arrow'},
 {name:'Mage',hp:65,at:19,range:105,cool:1.5,color:'#cf8deb',symbol:'✦',kind:'magic'},
 {name:'Priest',hp:85,at:6,range:95,cool:1.3,color:'#7bbce8',symbol:'†',kind:'aura'},
 {name:'Reaper',hp:100,at:14,range:40,cool:1,color:'#e8bc60',symbol:'☾',kind:'melee'},
 {name:'Bard',hp:75,at:6,range:155,cool:.4,color:'#aaaaaa',symbol:'♪',kind:'note'},
 {name:'Summoner',hp:95,at:10,range:65,cool:1,color:'#75d0c3',symbol:'▤',kind:'summon'}
];
const {items:ITEMS,effects:EFFECTS,descriptions:STAT_HEHP}=BrambleGear;
const sfx=(event,data)=>globalThis.BrambleAudio?.play(event,data);
const socketItem=id=>['rune','gem','soul'].includes(ITEMS[id]?.type);
const ZONES=[
 {name:'Lowlands',regions:['Grassland','Woodland','Marsh','Caverns'],structure:'Fort',boss:'Armored Knight',shape:'knight',color:'#92b65a',palette:['#746c3c','#74bd44','#aaa36a']},
 {name:'Desert',regions:['Canyon','Dunes','Oasis','Tombs'],structure:'Pyramid',boss:'Giant Scorpion',shape:'scorpion',color:'#deb965',palette:['#b88b42','#f1cf78','#e3b965']},
 {name:'Coast',regions:['Beach','Cliffs','Reef','Caves'],structure:'Lighthouse',boss:'Kraken',shape:'kraken',color:'#63c6c6',palette:['#827c62','#8dd9da','#bcb594']},
 {name:'Mountains',regions:['Hills','Peaks','Snowfield','Glacier'],structure:'Citadel',boss:'Ice Giant',shape:'giant',color:'#bbdce9',palette:['#718594','#effaff','#aec5d4']},
 {name:'Volcano',regions:['Ashland','Crater','Lava','Depths'],structure:'Forge',boss:'Molten Construct',shape:'construct',color:'#e5834e',palette:['#51403a','#ff843a','#956449']},
 {name:'Kingdom',regions:['Farmland','Sewers','City','Barracks'],structure:'Castle',boss:'Lich King',shape:'lich',color:'#b995dc',palette:['#514955','#948591','#736977']}
];
const AREAS=[],WORLD=[],AREAS_PER_REGION=5,AREAS_PER_ZONE=21,MAP_WIDTH=3072;
for(let z=0;z<ZONES.length;z++){
 const zone=ZONES[z],base=z*AREAS_PER_ZONE,town=z?'town'+z:'town',trader=z?'trader'+z:'trader';
 WORLD.push({id:town,name:'Town',kind:'town',zone:z,x:z*512+28,y:83,next:['a'+base]});
 for(let r=0;r<4;r++)for(let n=0;n<AREAS_PER_REGION;n++){
  const a=base+r*AREAS_PER_REGION+n,node={id:'a'+a,name:zone.regions[r]+' '+(n+1),area:a,zone:z,region:z*4+r,local:n,major:false,x:z*512+75+r*112+[0,16,-3,17,0][n],y:(r%2?[20,33,46,59,72]:[72,59,46,33,20])[n],next:['a'+(a+1)]};
  if(r===0&&n===AREAS_PER_REGION-1)node.next.push(trader);
  AREAS.push(node);WORLD.push(node);
 }
 const a=base+20,node={id:'a'+a,name:zone.structure,area:a,zone:z,region:z*4+3,major:true,x:z*512+483,y:59,next:z<5?['a'+(a+1),'town'+(z+1)]:[]};
 AREAS.push(node);WORLD.push(node,{id:trader,name:'Rune Trader',kind:'trader',zone:z,x:z*512+132,y:19,next:[]});
}
const areaInfo=(index=area)=>AREAS[index]||AREAS[0];
const serviceKind=(id=currentNode)=>WORLD.find(n=>n.id===id)?.kind;
const townForArea=()=>areaInfo().zone?'town'+areaInfo().zone:'town';
function migrateWorld(s){
 if(s.worldVersion===3)return s;
 if(s.worldVersion!==2){
  const oldToNew=[0,1,2,3,4,5,9,10,11,16,17,18,42,43,44,45,46,47],mapIndex=n=>oldToNew[Math.max(0,Math.min(17,Number(n)||0))];
  const cleared=(s.completed||Array.from({length:s.area||0},(_,i)=>'a'+i)).filter(id=>/^a\d+$/.test(id)).map(id=>mapIndex(id.slice(1)));
  s={...s,worldVersion:2,area:mapIndex(s.area),completed:Array.from({length:Math.max(-1,...cleared)+1},(_,i)=>'a'+i),currentNode:/^a\d+$/.test(s.currentNode||'')?'a'+mapIndex(s.currentNode.slice(1)):s.currentNode};
 }
 const mapIndex=n=>{n=Math.max(0,Math.min(77,Number(n)||0));const z=Math.floor(n/13),local=n%13;return z*21+(local===12?20:Math.floor(local/3)*5+local%3)};
 const cleared=(s.completed||[]).filter(id=>/^a\d+$/.test(id)).map(id=>mapIndex(id.slice(1)));
 // Credit inserted areas behind completed progress; the first new area ahead remains playable.
 const completed=Array.from({length:Math.max(-1,...cleared)+1},(_,i)=>'a'+i);
 return {...s,worldVersion:3,area:mapIndex(s.area),stage:Math.min(7,s.stage||0),completed,currentNode:/^a\d+$/.test(s.currentNode||'')?'a'+mapIndex(s.currentNode.slice(1)):s.currentNode};
}
let mapPan=0,sceneFade=null,settingsOpen=false,autoMoveEnabled=true,menuOpen=false,activeSlot=1,sessionSlot=0,bossExitWait=2;
function saveKey(slot=activeSlot){return slot===1?KEY:KEY+'-slot-'+slot}
function readSlot(slot){try{return JSON.parse(localStorage.getItem(saveKey(slot))||(slot===1?localStorage.getItem('bramblebound-v2'):null))}catch{return null}}
function changeScene(action){if(sceneFade)return false;sceneFade={elapsed:0,switched:false,action};release();$('#scene-fade').hidden=false;$('#scene-fade').style.opacity='0';return true}
function tickSceneFade(dt){if(!sceneFade)return;const fade=sceneFade;fade.elapsed=Math.min(1,fade.elapsed+dt);const alpha=fade.elapsed<=.5?fade.elapsed*2:(1-fade.elapsed)*2;$('#scene-fade').style.opacity=String(alpha);if(!fade.switched&&fade.elapsed>=.5){$('#scene-fade').style.opacity='1';fade.switched=true;fade.action()}if(fade.elapsed>=1){sceneFade=null;$('#scene-fade').style.opacity='0';$('#scene-fade').hidden=true}}

let hazards=[],blasts=[],minions=[],rituals=[];
let stage=0,inventoryRunes=Array.from({length:15},()=>[null,null]),shopClass=0,shopIndex=0;
const stageCount=()=>areaInfo().major?1:5+(areaInfo().region+areaInfo().local)%4;
let completed=[],currentNode='town',mapReturn=null,potions=[],hoverHero=null,inspectingItem=false,saveTime=0;
let heroes=[],enemies=[],shots=[],numbers=[],loot=[],inventory=Array(15).fill(null),area=0,gold=0,selected=0,state='setup',paused=false,speed=1,drag=null,time=0,last=0,uid=0,uiTime=0,fields=[],flashes=[],gearDrag=null,pickedSlot=null,suppressGearClick=false;
const floor=x=>{if(serviceKind()||areaInfo().major)return 226;const a=(area+stage)%3;return a===0?(x<112?226:x<365?219:226):a===1?(x<180?226:x<310?207:226):(x<135?226:x<245?215:x<365?204:226)};
function hasRoof(){const node=areaInfo();return currentNode[0]==='a'&&!node.major&&['Caverns','Tombs','Caves','Depths','Sewers'].includes(ZONES[node.zone].regions[node.region%4])}
function roofHeight(x){return 7+((Math.floor(Math.max(0,Math.min(575,x))/8)*8*7)%17)}
function ceiling(x){return hasRoof()?roofHeight(x):-Infinity}
function roofLimit(x,height=32,radius=6){if(!hasRoof())return -Infinity;let roof=0;for(let px=Math.floor((x-radius)/8)*8;px<=x+radius;px+=8)roof=Math.max(roof,roofHeight(px));return roof+height+1}
function collideRoof(body,height=32,radius=6){const limit=roofLimit(body.x,height,radius);if(body.y<limit){body.y=limit;body.vy=Math.max(0,body.vy||0)}}
function needed(level){return Math.round((10+5*level)*(18+1.2*level+.004*level*level))}
function enemyXp(target){
 const base=10+5*target.level;
 if(target.type==='boss')return base*(target.major?25:8)/(target.swarmCount||1);
 const spec=ENEMY_TYPES[target.species]||{},swarm=target.type==='swarmling'||spec.swarmCount>1;
 if(swarm)return base*((spec.swarmCount||6)>=5?.25:.4);
 return base*(spec.hp>=1.7?2:spec.hp>=1.4?1.5:1);
}
function mpCost(w){return w?.classId===3?0:(EFFECTS[w?.effect]?.mp||0)}
function stats(h){
 const c=classes[h.classId],w=ITEMS[h.weapon],a={...h.attributes},gem={str:0,dex:0,int:0,defense:0,lp:0};for(const id of h.runes||[])for(const [key,value] of Object.entries(ITEMS[id]?.gemStats||{}))gem[key]+=value;h.summonGems=h.classId===7?{...gem}:null;if(h.classId===7)for(const key of Object.keys(gem))gem[key]=0;for(const key of ['str','dex','int'])a[key]+=gem[key];h.defense=gem.defense;const str=a.str,dex=a.dex,int=a.int;
 h.str=str;h.dex=dex;h.int=int;h.maxHp=(a.lp||0)*10+gem.lp+c.hp+(h.level-1)*6+a.str*[4,5,3,2,3,4,3,3][h.classId]+a.dex*[4,3,3,2,3,3,2,3][h.classId]+int*2;
 let min=w?w.min:1,max=w?w.max:2;h.range=w?w.range:12;let agi=w?w.agi:[25,35];let factor=1;h.crit=0;h.dodgeCooldown=0;h.extra=0;h.abilityPower=1;h.healing=14+int;
 switch(h.classId){
 case 0:max+=str;min=Math.min(max,min+dex);break;
 case 1:min+=str;max+=str;h.dodgeCooldown=6*Math.pow(.988,dex);h.crit=Math.min(1,int*.01);break;
 case 2:h.range+=str*2;min+=dex*.5;max+=dex*.75;break;
 case 3:h.range+=str*2;factor=1/(1+dex*.02);min+=int;max+=int;h.mp=0;break;
 case 4:h.range+=int*2;break;
 case 5:min+=str;max+=str;break;
 case 6:break;
 case 7:min*=1+str*.1;max*=1+str*.1;factor=1/(1+int*.02);break;
 }
 h.runeBonus={lifesteal:0,resistance:0,xpBonus:0,haste:0,damageBonus:0,rangeBonus:0,hpBonus:0,regen:0,dropBonus:0};
 for(const id of h.runes||[])for(const [name,value] of Object.entries(ITEMS[id]?.bonuses||{}))h.runeBonus[name]+=value;
 h.runeBonus.resistance=Math.min(.75,h.runeBonus.resistance);h.summonBonuses=h.classId===7?{...h.runeBonus}:null;if(h.classId===7)for(const key of Object.keys(h.runeBonus))h.runeBonus[key]=0;
 min*=1+h.runeBonus.damageBonus;max*=1+h.runeBonus.damageBonus;factor/=1+h.runeBonus.haste;h.range+=h.runeBonus.rangeBonus;h.maxHp=Math.floor(h.maxHp*(1+h.runeBonus.hpBonus));
 h.atMin=Math.floor(Math.min(min,max));h.atMax=Math.floor(max);h.at=h.atMax;h.agi=agi.map(n=>Math.max(5,Math.round(n*factor)));h.cool=(h.agi[0]+h.agi[1])/60;h.color=c.color;h.kind=w?c.kind:'melee';
}
function hero(classId,i){const h={id:++uid,classId,level:1,xp:0,weapon:classId+'-basic',runes:[null,null],attributes:{str:0,dex:0,int:0,lp:0},sp:0,mp:0,gearRevision:0,x:35+i*20,y:226,vy:0,cooldown:i*.15,hold:0,anim:0,face:1};stats(h);h.hp=h.maxHp;return h}
function tell(text){$('#status').textContent=text}
function save(){if(!heroes.length||menuOpen||state==='setup')return;try{localStorage.setItem(saveKey(),JSON.stringify({version:7,worldVersion:3,xpCurve:1,autoMoveEnabled,area,stage,gold,inventory,inventoryRunes,completed,currentNode,heroes:heroes.map(h=>({classId:h.classId,autoMove:h.autoMove!==false,level:h.level,xp:h.xp,hp:h.hp,weapon:h.weapon,runes:h.runes,attributes:h.attributes,sp:h.sp,mp:h.mp}))}))}catch{}}
function load(){try{
 const raw=readSlot(activeSlot),s=raw&&migrateWorld(raw);if(!s||!Array.isArray(s.heroes)||s.heroes.length!==4)return false;
 if(!s.heroes.every(h=>Number.isInteger(h.classId)&&classes[h.classId]&&Number.isInteger(h.level)&&h.level>=1&&h.level<=99))return false;
 autoMoveEnabled=s.autoMoveEnabled!==false;area=Math.max(0,Math.min(AREAS.length-1,Math.floor(s.area)||0));completed=Array.isArray(s.completed)?s.completed.filter(id=>WORLD.some(n=>n.id===id&&!n.kind)):Array.from({length:area},(_,i)=>'a'+i);currentNode=WORLD.some(n=>n.id===s.currentNode)?s.currentNode:'town';gold=Math.max(0,Math.floor(s.gold)||0);
 inventory=Array.from({length:15},(_,i)=>{const id=s.inventory?.[i];return ITEMS[id]?id:s.version!==3&&Number.isInteger(id)&&id>0?s.heroes[i%4].classId+'-iron':null});
 inventoryRunes=Array.from({length:15},(_,i)=>[0,1].map(j=>socketItem(s.inventoryRunes?.[i]?.[j])?s.inventoryRunes[i][j]:null));stage=Math.max(0,Math.min(stageCount()-1,Math.floor(s.stage)||0));
 heroes=s.heroes.map((v,i)=>{const h=hero(v.classId,i);h.autoMove=v.autoMove!==false;h.level=v.level;h.xp=Math.max(0,Math.min(needed(h.level)-1,Math.round((Number(v.xp)||0)*(s.xpCurve===1?1:needed(h.level)/(100+h.level*100+h.level*h.level*25))*100)/100));
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

const REGIONAL_POOLS=[['slime','swarmling','hopper','slasher','beetle','spider','roller'],["lanternmoth","rootjaw","sporecap","acornrunner","barkmimic","thornmantis","mosstender"],["prismcrawler","jawworm","ceilingeye","shellcannon","caveurchin","blindfang","glowleech"],["sandscorpion","dunewheel","cactusgunner","mirageeye","urnhopper","sunscarab","sandmaw"],["cragcrab","stormray","bellgolem","screeimp","peakram","rubblelobber","ironvulture"],["snowmarionette","frostjelly","icetooth","auroramoth","driftburrower","rimeobelisk","frozenbell"]];
ENEMY_TYPES['lanternmoth']={...ENEMY_TYPES['flyer'],name:'Lantern Moth',base:'flyer',shape:'moth',color:'#f3d876',hp:0.65,pattern:"FAN",description:'Lantern Moth: erratic flight.'};
ENEMY_TYPES['rootjaw']={...ENEMY_TYPES['slasher'],name:'Rootjaw',base:'slasher',shape:'plant',color:'#a6bf66',hp:1,pattern:null,description:'Rootjaw: brief close-range sweep.'};
ENEMY_TYPES['sporecap']={...ENEMY_TYPES['bomber'],name:'Sporecap',base:'bomber',shape:'mushroom',color:'#d69cc7',hp:1.2,pattern:null,description:'Sporecap: lobbed spore bomb.'};
ENEMY_TYPES['acornrunner']={...ENEMY_TYPES['roller'],name:'Acorn Runner',base:'roller',shape:'acorn',color:'#bf8a51',hp:1.4,pattern:null,description:'Acorn Runner: rolling charge.'};
ENEMY_TYPES['barkmimic']={...ENEMY_TYPES['beetle'],name:'Bark Mimic',base:'beetle',shape:'mimic',color:'#ad9563',hp:1.8,pattern:null,description:'Bark Mimic: close-range attacks.'};
ENEMY_TYPES['thornmantis']={...ENEMY_TYPES['spider'],name:'Thorn Mantis',base:'spider',shape:'mantis',color:'#7edd7b',hp:0.85,pattern:null,description:'Thorn Mantis: jointed ground movement.'};
ENEMY_TYPES['mosstender']={...ENEMY_TYPES['shaman'],name:'Moss Tender',base:'shaman',shape:'tree',color:'#87c696',hp:0.9,pattern:null,description:'Moss Tender: heals nearby monsters.'};
ENEMY_TYPES['prismcrawler']={...ENEMY_TYPES['spider'],name:'Prism Crawler',base:'spider',shape:'crystal',color:'#8bc5f3',hp:0.85,pattern:null,description:'Prism Crawler: jointed ground movement.'};
ENEMY_TYPES['jawworm']={...ENEMY_TYPES['hopper'],name:'Jaw Worm',base:'hopper',shape:'worm',color:'#d2a0b4',hp:0.8,pattern:null,description:'Jaw Worm: leaping attacks.'};
ENEMY_TYPES['ceilingeye']={...ENEMY_TYPES['flyer'],name:'Ceiling Eye',base:'flyer',shape:'eye',color:'#d885f5',hp:0.65,pattern:"SEEKERS",description:'Ceiling Eye: erratic flight.'};
ENEMY_TYPES['shellcannon']={...ENEMY_TYPES['catapult'],name:'Shell Cannon',base:'catapult',shape:'snail',color:'#b9a0d8',hp:1.4,pattern:null,description:'Shell Cannon: high arcing rocks.'};
ENEMY_TYPES['caveurchin']={...ENEMY_TYPES['roller'],name:'Cave Urchin',base:'roller',shape:'urchin',color:'#c2bce6',hp:1.4,pattern:null,description:'Cave Urchin: rolling charge.'};
ENEMY_TYPES['blindfang']={...ENEMY_TYPES['slasher'],name:'Blindfang',base:'slasher',shape:'maw',color:'#d1c5ab',hp:1,pattern:null,description:'Blindfang: brief close-range sweep.'};
ENEMY_TYPES['glowleech']={...ENEMY_TYPES['swarmling'],name:'Glow Leech',base:'swarmling',shape:'worm',color:'#87e8c3',hp:0.5,pattern:null,description:'Glow Leech: close-range attacks.'};
ENEMY_TYPES['sandscorpion']={...ENEMY_TYPES['spider'],name:'Glass Scorpion',base:'spider',shape:'scorpion',color:'#e9c77b',hp:0.85,pattern:null,description:'Glass Scorpion: jointed ground movement.'};
ENEMY_TYPES['dunewheel']={...ENEMY_TYPES['roller'],name:'Dune Wheel',base:'roller',shape:'wheel',color:'#d5a35e',hp:1.4,pattern:null,description:'Dune Wheel: rolling charge.'};
ENEMY_TYPES['cactusgunner']={...ENEMY_TYPES['archer'],name:'Needle Cactus',base:'archer',shape:'cactus',color:'#8dba68',hp:0.8,pattern:null,description:'Needle Cactus: ranged volleys.'};
ENEMY_TYPES['mirageeye']={...ENEMY_TYPES['flyer'],name:'Mirage Eye',base:'flyer',shape:'eye',color:'#f3ae7c',hp:0.65,pattern:"FAN",description:'Mirage Eye: erratic flight.'};
ENEMY_TYPES['urnhopper']={...ENEMY_TYPES['hopper'],name:'Cursed Urn',base:'hopper',shape:'urn',color:'#c6a379',hp:0.8,pattern:null,description:'Cursed Urn: leaping attacks.'};
ENEMY_TYPES['sunscarab']={...ENEMY_TYPES['beetle'],name:'Sun Scarab',base:'beetle',shape:'scarab',color:'#f4d14e',hp:1.8,pattern:null,description:'Sun Scarab: close-range attacks.'};
ENEMY_TYPES['sandmaw']={...ENEMY_TYPES['catapult'],name:'Sand Maw',base:'catapult',shape:'maw',color:'#e4bf89',hp:1.4,pattern:null,description:'Sand Maw: high arcing rocks.'};
ENEMY_TYPES['cragcrab']={...ENEMY_TYPES['spider'],name:'Crag Crab',base:'spider',shape:'crab',color:'#b6bbc5',hp:0.85,pattern:null,description:'Crag Crab: jointed ground movement.'};
ENEMY_TYPES['stormray']={...ENEMY_TYPES['flyer'],name:'Storm Ray',base:'flyer',shape:'ray',color:'#9fc5f1',hp:0.65,pattern:"SEEKERS",description:'Storm Ray: erratic flight.'};
ENEMY_TYPES['bellgolem']={...ENEMY_TYPES['beetle'],name:'Bell Golem',base:'beetle',shape:'bell',color:'#b6aa7a',hp:1.8,pattern:null,description:'Bell Golem: close-range attacks.'};
ENEMY_TYPES['screeimp']={...ENEMY_TYPES['hopper'],name:'Scree Imp',base:'hopper',shape:'imp',color:'#a6bdc6',hp:0.8,pattern:null,description:'Scree Imp: leaping attacks.'};
ENEMY_TYPES['peakram']={...ENEMY_TYPES['slasher'],name:'Peak Ram',base:'slasher',shape:'ram',color:'#ded9d0',hp:1,pattern:null,description:'Peak Ram: brief close-range sweep.'};
ENEMY_TYPES['rubblelobber']={...ENEMY_TYPES['catapult'],name:'Rubble Lobber',base:'catapult',shape:'golem',color:'#9fadb7',hp:1.4,pattern:null,description:'Rubble Lobber: high arcing rocks.'};
ENEMY_TYPES['ironvulture']={...ENEMY_TYPES['archer'],name:'Iron Vulture',base:'archer',shape:'bird',color:'#a8b6c6',hp:0.8,pattern:null,description:'Iron Vulture: ranged volleys.'};
ENEMY_TYPES['snowmarionette']={...ENEMY_TYPES['slasher'],name:'Snow Marionette',base:'slasher',shape:'puppet',color:'#d4eff4',hp:1,pattern:null,description:'Snow Marionette: brief close-range sweep.'};
ENEMY_TYPES['frostjelly']={...ENEMY_TYPES['flyer'],name:'Frost Jelly',base:'flyer',shape:'jelly',color:'#a1dcf8',hp:0.65,pattern:"ARROWS",description:'Frost Jelly: erratic flight.'};
ENEMY_TYPES['icetooth']={...ENEMY_TYPES['roller'],name:'Icetooth',base:'roller',shape:'urchin',color:'#d5ebff',hp:1.4,pattern:null,description:'Icetooth: rolling charge.'};
ENEMY_TYPES['auroramoth']={...ENEMY_TYPES['flyer'],name:'Aurora Moth',base:'flyer',shape:'moth',color:'#97edc7',hp:0.65,pattern:"FAN",description:'Aurora Moth: erratic flight.'};
ENEMY_TYPES['driftburrower']={...ENEMY_TYPES['hopper'],name:'Drift Burrower',base:'hopper',shape:'worm',color:'#b9cadf',hp:0.8,pattern:null,description:'Drift Burrower: leaping attacks.'};
ENEMY_TYPES['rimeobelisk']={...ENEMY_TYPES['catapult'],name:'Rime Obelisk',base:'catapult',shape:'obelisk',color:'#a7c2f3',hp:1.4,pattern:null,description:'Rime Obelisk: high arcing rocks.'};
ENEMY_TYPES['frozenbell']={...ENEMY_TYPES['shaman'],name:'Frozen Bell',base:'shaman',shape:'bell',color:'#d3bbed',hp:0.9,pattern:null,description:'Frozen Bell: heals nearby monsters.'};
const REGION_SUMMONERS=['summoner','hivenest','broodegg','dusturn','runeanvil','frostlantern'];
ENEMY_TYPES[REGION_SUMMONERS[1]]={name:'Hanging Hive',base:'summoner',shape:'mushroom',color:'#c4a263',hp:1.25,description:'Summons three regional creatures.'};
ENEMY_TYPES[REGION_SUMMONERS[2]]={name:'Brood Egg',base:'summoner',shape:'eye',color:'#cba0de',hp:1.25,description:'Summons three regional creatures.'};
ENEMY_TYPES[REGION_SUMMONERS[3]]={name:'Dust Urn',base:'summoner',shape:'urn',color:'#d0b179',hp:1.25,description:'Summons three regional creatures.'};
ENEMY_TYPES[REGION_SUMMONERS[4]]={name:'Rune Anvil',base:'summoner',shape:'golem',color:'#aaaec6',hp:1.25,description:'Summons three regional creatures.'};
ENEMY_TYPES[REGION_SUMMONERS[5]]={name:'Frost Lantern',base:'summoner',shape:'obelisk',color:'#b8e5f2',hp:1.25,description:'Summons three regional creatures.'};
const REGION_BOSSES=[["Crown Slime","maw"],["Briar Bull","ram"],["Walking Hive","mushroom"],["Hollow Treant","tree"],["Lantern Widow","mantis"],["Maw of the Grove","mimic"],["Prism Matriarch","crystal"],["The Lidless","eye"],["Cathedral Snail","snail"],["Scorpion Pharaoh","scorpion"],["Sunwheel Idol","wheel"],["Dune Devourer","maw"],["Ironhorn Titan","ram"],["Storm Cathedral","bell"],["Skybreaker","ray"],["The White Puppeteer","puppet"],["Aurora Leviathan","jelly"],["Winter Monolith","obelisk"]];
ENEMY_TYPES['guardian0']={name:REGION_BOSSES[0][0],base:'boss',shape:REGION_BOSSES[0][1],color:"#b9db70",patterns:["FAN","ARROWS"],description:'Crown Slime. Area guardian.'};
ENEMY_TYPES['guardian1']={name:REGION_BOSSES[1][0],base:'boss',shape:REGION_BOSSES[1][1],color:"#b9db70",patterns:["BOMBS","FAN"],description:'Briar Bull. Area guardian.'};
ENEMY_TYPES['guardian2']={name:REGION_BOSSES[2][0],base:'boss',shape:REGION_BOSSES[2][1],color:"#b9db70",patterns:["SEEKERS","ARROWS"],description:'Walking Hive. Area guardian.'};
ENEMY_TYPES['guardian3']={name:REGION_BOSSES[3][0],base:'boss',shape:REGION_BOSSES[3][1],color:"#b2c871",patterns:["FAN","ARROWS"],description:'Hollow Treant. Area guardian.'};
ENEMY_TYPES['guardian4']={name:REGION_BOSSES[4][0],base:'boss',shape:REGION_BOSSES[4][1],color:"#b2c871",patterns:["BOMBS","FAN"],description:'Lantern Widow. Area guardian.'};
ENEMY_TYPES['guardian5']={name:REGION_BOSSES[5][0],base:'boss',shape:REGION_BOSSES[5][1],color:"#b2c871",patterns:["SEEKERS","ARROWS"],description:'Maw of the Grove. Area guardian.'};
ENEMY_TYPES['guardian6']={name:REGION_BOSSES[6][0],base:'boss',shape:REGION_BOSSES[6][1],color:"#bea0e5",patterns:["FAN","ARROWS"],description:'Prism Matriarch. Area guardian.'};
ENEMY_TYPES['guardian7']={name:REGION_BOSSES[7][0],base:'boss',shape:REGION_BOSSES[7][1],color:"#bea0e5",patterns:["BOMBS","FAN"],description:'The Lidless. Area guardian.'};
ENEMY_TYPES['guardian8']={name:REGION_BOSSES[8][0],base:'boss',shape:REGION_BOSSES[8][1],color:"#bea0e5",patterns:["SEEKERS","ARROWS"],description:'Cathedral Snail. Area guardian.'};
ENEMY_TYPES['guardian9']={name:REGION_BOSSES[9][0],base:'boss',shape:REGION_BOSSES[9][1],color:"#e7bb65",patterns:["FAN","ARROWS"],description:'Scorpion Pharaoh. Area guardian.'};
ENEMY_TYPES['guardian10']={name:REGION_BOSSES[10][0],base:'boss',shape:REGION_BOSSES[10][1],color:"#e7bb65",patterns:["BOMBS","FAN"],description:'Sunwheel Idol. Area guardian.'};
ENEMY_TYPES['guardian11']={name:REGION_BOSSES[11][0],base:'boss',shape:REGION_BOSSES[11][1],color:"#e7bb65",patterns:["SEEKERS","ARROWS"],description:'Dune Devourer. Area guardian.'};
ENEMY_TYPES['guardian12']={name:REGION_BOSSES[12][0],base:'boss',shape:REGION_BOSSES[12][1],color:"#aebfd7",patterns:["FAN","ARROWS"],description:'Ironhorn Titan. Area guardian.'};
ENEMY_TYPES['guardian13']={name:REGION_BOSSES[13][0],base:'boss',shape:REGION_BOSSES[13][1],color:"#aebfd7",patterns:["BOMBS","FAN"],description:'Storm Cathedral. Area guardian.'};
ENEMY_TYPES['guardian14']={name:REGION_BOSSES[14][0],base:'boss',shape:REGION_BOSSES[14][1],color:"#aebfd7",patterns:["SEEKERS","ARROWS"],description:'Skybreaker. Area guardian.'};
ENEMY_TYPES['guardian15']={name:REGION_BOSSES[15][0],base:'boss',shape:REGION_BOSSES[15][1],color:"#b9e6ee",patterns:["FAN","ARROWS"],description:'The White Puppeteer. Area guardian.'};
ENEMY_TYPES['guardian16']={name:REGION_BOSSES[16][0],base:'boss',shape:REGION_BOSSES[16][1],color:"#b9e6ee",patterns:["BOMBS","FAN"],description:'Aurora Leviathan. Area guardian.'};
ENEMY_TYPES['guardian17']={name:REGION_BOSSES[17][0],base:'boss',shape:REGION_BOSSES[17][1],color:"#b9e6ee",patterns:["SEEKERS","ARROWS"],description:'Winter Monolith. Area guardian.'};

const legacyPools=REGIONAL_POOLS.map(p=>p.slice()),legacySummoners=REGION_SUMMONERS.slice();
const regionSeeds=[0,1,1,2,3,3,3,2,4,4,5,2,4,4,5,5,3,3,3,2,0,2,4,4];
const regionalNames=[
 null,null,['Bog Leech','Reed Spider','Mud Crab','Marsh Light','Mire Toad','Rotting Stump','Bog Witch'],null,
 ['Canyon Crab','Rock Vulture','Dust Imp','Stone Ram','Canyon Lobber','Cliff Scorpion','Dust Shaman'],
 null,['Palm Crawler','Water Sprite','Reed Archer','Oasis Toad','Sand Crab','Pool Leech','Sun Priest'],
 ['Tomb Scarab','Bone Worm','Floating Skull','Stone Coffin','Tomb Spider','Mummy','Grave Priest'],
 ['Shell Crab','Gull','Sand Flea','Tide Snail','Coral Lobber','Shore Slime','Tide Spirit'],
 ['Cliff Crab','Sea Ray','Stone Gull','Cliff Imp','Rock Goat','Shell Lobber','Sea Witch'],
 ['Coral Spider','Reef Jelly','Needlefish','Glow Moth','Clam','Coral Pillar','Pearl Spirit'],
 ['Cave Crab','Blind Eel','Floating Pearl','Shell Cannon','Sea Urchin','Cave Fang','Glow Leech'],
 null,['Peak Crab','Storm Ray','Bell Golem','Rock Imp','Mountain Ram','Stone Lobber','Iron Vulture'],
 null,['Ice Spider','Frost Jelly','Ice Fang','Snow Moth','Ice Worm','Ice Pillar','Frozen Bell'],
 ['Ash Scorpion','Coal Wheel','Ember Archer','Smoke Eye','Ash Hopper','Fire Scarab','Ash Maw'],
 ['Crater Crab','Lava Roller','Cinder Cannon','Flame Eye','Coal Toad','Obsidian Beetle','Crater Worm'],
 ['Lava Spider','Magma Wheel','Flame Archer','Fire Spirit','Lava Hopper','Molten Beetle','Magma Maw'],
 ['Coal Crawler','Furnace Worm','Ember Eye','Iron Cannon','Fire Urchin','Obsidian Fang','Ash Leech'],
 ['Rot Slime','Grave Rat','Scarecrow','Dead Reaper','Bone Hound','Corpse Spider','Hay Golem'],
 ['Sewer Rat','Sludge Worm','Rot Eye','Pipe Crawler','Sewer Leech','Bone Spider','Plague Priest'],
 ['Bone Soldier','Ghost','Bell Knight','Skeleton Archer','Armored Guard','Siege Lobber','Death Priest'],
 ['Royal Guard','Soul Wraith','Armor Golem','Bone Archer','Black Knight','Siege Cannon','Royal Mage']
];
REGIONAL_POOLS.length=0;REGION_SUMMONERS.length=0;
for(let r=0;r<24;r++){
 const seed=regionSeeds[r],names=regionalNames[r],zone=ZONES[Math.floor(r/4)];
 const pool=legacyPools[seed].map((source,i)=>{
  if(!names)return source;
  const id='region'+r+'enemy'+i,template=ENEMY_TYPES[source]||{base:source,hp:1};
  ENEMY_TYPES[id]={...template,base:template.base||source,name:names[i],color:zone.color,hp:template.hp||1,description:names[i]+'.'};
  return id;
 });
 // A few regions share older creatures; each region still has its own drop table.
 REGIONAL_POOLS.push(pool);
 const id='region'+r+'summoner';ENEMY_TYPES[id]={...ENEMY_TYPES[legacySummoners[seed]],base:'summoner',name:zone.regions[r%4]+' Caller',hp:1.25,color:zone.color};REGION_SUMMONERS.push(id);
}
const SWARM_BOSSES={};
for(const node of AREAS){
 const zone=ZONES[node.zone],id='guardian'+node.area;
 if(node.major)ENEMY_TYPES[id]={base:'boss',name:zone.boss,shape:zone.shape,color:zone.color,hp:1,major:true,range:24,speed:10,damage:1.65,patterns:[['CHARGE','FAN'],['BOMBS','ARROWS'],['TIDES','FAN'],['FROST','ARROWS'],['ERUPTION','BOMBS'],['BONES','CURSE','SOULS']][node.zone],description:zone.boss+'.'};
 else{
  const source=ENEMY_TYPES[REGIONAL_POOLS[node.region][(node.local*2+2)%7]]||{};
  ENEMY_TYPES[id]={base:'boss',name:ZONES[node.zone].regions[node.region%4]+' '+['Guardian','Warden','Keeper','Champion','Overlord'][node.local],shape:source.shape||'maw',color:zone.color,hp:1,patterns:['FAN','ARROWS','BOMBS']};
  if(node.local===AREAS_PER_REGION-1){SWARM_BOSSES[node.area]=5;Object.assign(ENEMY_TYPES[id],{swarmCount:5,patterns:['DART'],damage:.55,speed:20})}
 }
}
function sceneEnemyTypes(){
 if(areaInfo().major)return ['guardian'+area];
 if(area===0&&stage===0)return ['slime','slasher'];
 const region=areaInfo().region,roster=REGIONAL_POOLS[region],offset=areaInfo().local*2,pool=Array.from({length:5},(_,i)=>roster[(offset+i)%roster.length]);
 const special=stage===stageCount()-1?'guardian'+area:area>=4?REGION_SUMMONERS[region]:null;
 const types=Array.from({length:special?2:3},(_,i)=>pool[(stage+i)%pool.length]);
 if(special)types.push(special);return types;
}
function encounterType(i,count){const types=sceneEnemyTypes();if(types.length===1)return types[0];const special=types.find(id=>id.startsWith('guardian')||REGION_SUMMONERS.includes(id));return special&&i===count-1?special:types[i%(special?types.length-1:types.length)]}
function enemySummonType(e){const pool=sceneEnemyTypes().filter(id=>!id.startsWith('guardian')&&!REGION_SUMMONERS.includes(id));return pool[e.remaining%pool.length]}


function areaHealth(index){index=Math.floor(index*77/(AREAS.length-1));const values=[20,40,60,80,100,130,160,190,220,250,290,330,370,410,450,500];return values[index]??500+(index-15)*50}
// Attack profiles describe both collision geometry and the visible attack.
function enemyAttackProfile(shape){
 const profiles={
 mushroom:{kind:'cloud',range:48,radius:22,damage:.45,cooldown:3.8,life:1.8,element:'poison',color:'#b4ce63'},
 plant:{kind:'melee',shape:'fork',range:30,height:15,damage:1.3,cooldown:2,windup:.32,color:'#a4c969'},
 mantis:{kind:'melee',shape:'cross',range:33,height:22,damage:1.5,cooldown:2.2,windup:.38,color:'#c2e887'},
 scorpion:{kind:'melee',shape:'thrust',range:38,height:7,damage:1.6,cooldown:2.6,windup:.45,element:'poison',color:'#d5db73'},
 crab:{kind:'melee',shape:'pincer',range:26,height:19,damage:1.4,cooldown:2,windup:.3,color:'#d6b797'},
 maw:{kind:'melee',shape:'pincer',range:28,height:23,damage:1.6,cooldown:2.5,windup:.4,color:'#eaa788'},
 ram:{kind:'melee',shape:'thrust',range:30,height:12,damage:1.8,cooldown:2.8,windup:.5,color:'#eee0bc'},
 knight:{kind:'melee',shape:'cross',range:38,height:25,damage:1.5,cooldown:2.2,windup:.4,color:'#e8ce83'},
 cactus:{kind:'bullet',range:135,count:3,spread:.16,speed:115,size:2,damage:.7,cooldown:2.2,color:'#c8dc7c'},
 crystal:{kind:'bullet',range:110,count:5,spread:.22,speed:95,size:3,damage:.55,cooldown:3,color:'#9bcfff'},
 eye:{kind:'missile',range:125,count:1,speed:65,size:4,life:1.6,tracking:.6,damage:1.5,cooldown:3,element:'magic',color:'#d3a1ff'},
 jelly:{kind:'bullet',range:90,count:3,spread:.35,speed:65,size:5,damage:.8,cooldown:2.8,element:'ice',color:'#a2e6fa'},
 bird:{kind:'arrow',range:175,count:3,spread:.12,flight:1.3,size:2,damage:.8,cooldown:2.7,color:'#d3dde4'},
 snail:{kind:'rock',range:220,count:1,flight:2.3,size:8,damage:3,cooldown:4.5,color:'#cabaa5'},
 golem:{kind:'rock',range:190,count:4,spread:.25,flight:2,size:4,damage:1.2,cooldown:4.8,color:'#b6b1a0'},
 obelisk:{kind:'rock',range:235,count:5,spread:.22,flight:2.6,size:3,damage:1,cooldown:5,element:'ice',color:'#9bdcff'},
 urn:{kind:'rock',range:155,count:1,flight:1.8,size:5,aoe:22,damage:1.6,cooldown:4,element:'fire',color:'#eba464'},
 construct:{kind:'rock',range:210,count:3,spread:.3,flight:2.4,size:6,aoe:16,damage:1.2,cooldown:5,element:'fire',color:'#f09b5d'},
 bell:{kind:'melee',shape:'pulse',range:32,height:28,damage:1.2,cooldown:3,windup:.55,element:'magic',color:'#bcb0eb'},
 puppet:{kind:'melee',shape:'cross',range:35,height:24,damage:1.2,cooldown:2.4,windup:.4,color:'#c1ddec'}
 };return profiles[shape]||null;
}
function fireEnemyAttack(e,target,profile){
 const a=profile,face=Math.sign(target.x-e.x)||1;
 if(a.kind==='melee'){e.slash={left:a.windup||.35,life:(a.windup||.35)+.16,face,hit:false,profile:a};return}
 if(a.kind==='cloud'){
  const startX=e.x+face*8,endX=e.x+face*a.range,wall=terrainHit(startX,e.y-12,endX,e.y-12);
  hazards.push({kind:'cloud',x:wall?wall.x-face*(a.radius+1):endX,y:e.y-12,vx:0,vy:0,age:0,life:a.life||2,radius:a.radius||22,color:a.color,element:a.element||'poison',amount:enemyDamage(e,a.damage),hitTimes:{},dodgeable:false});return;
 }
 const count=a.count||1;
 for(let i=0;i<count;i++){
  const offset=(i-(count-1)/2)*(a.spread||0),p=launchHazard(e,target,a.kind,offset,enemyDamage(e,a.damage||1));
  Object.assign(p,{size:a.size||3,color:a.color||e.color,element:a.element||'physical',aoe:a.aoe||0,life:a.life||5,tracking:a.tracking??.8,speed:a.speed||90});
  if(a.kind==='rock'||a.kind==='arrow'){const flight=(a.flight||2)+(i%2)*.12;p.vx=(target.x-e.x)/flight+offset*70;p.gravity=a.kind==='arrow'?180:110;p.vy=(target.y-13-p.y)/flight-.5*p.gravity*flight;}
  else{const angle=Math.atan2(p.vy,p.vx);p.vx=Math.cos(angle)*(a.speed||110);p.vy=Math.sin(angle)*(a.speed||110)}
 }
}
function tickProfileAttack(e,target,dt){
 const a=e.attackProfile;if(!a)return false;
 if(e.cast){e.cast.left-=dt;if(e.cast.left<=0){fireEnemyAttack(e,e.cast.target,a);e.cast=null;}return true}
 if(e.cooldown<=0&&Math.hypot(target.x-e.x,target.y-e.y)<=e.range+3){
  e.cooldown=a.cooldown;e.cast={left:a.kind==='melee'?0:.65,target:a.kind==='missile'?target:{x:target.x,y:target.y,hp:1}};
 }
 return true;
}
function enemy(species,x){const spec=ENEMY_TYPES[species],type=spec?.base||species,attackProfile=enemyAttackProfile(spec?.shape),boss=type==='boss',tier=areaInfo().zone,hp=Math.round(areaHealth(area)*(boss?(spec?.major?30:spec?.swarmCount?12/spec.swarmCount:10):spec?spec.hp:type==='summoner'?1.25:1));return {id:++uid,type,species,attackProfile,major:!!spec?.major,swarmBoss:!!spec?.swarmCount,swarmCount:spec?.swarmCount||1,shape:spec?.shape,pattern:spec?.pattern,patterns:spec?.patterns,x,y:floor(x)-(type==='flyer'?45:0),vx:0,vy:0,rotation:0,feet:[],hp:hp,maxHp:hp,level:1+Math.floor(area/(AREAS.length-1)*98),name:spec?.name||({slime:'Slime',slasher:'Slashling',spitter:'Spitter',summoner:'Summoner',boss:'Guardian'}[type]||type),speed:spec?.speed||(boss?13:17),heals:3,healCooldown:3,hopCooldown:1+(x%3),at:(boss?10+area*2:6+area*1.5)*(spec?.damage||1),range:attackProfile?.range||spec?.range||(type==='spitter'||type==='summoner'?105:type==='slasher'?(area<3?22:48):(area<3?12:16)),cooldown:.5+(x%7)/10,summon:7,remaining:3,color:spec?.color||(boss?'#de6262':type==='summoner'?'#c478ed':type==='slasher'?'#f37c52':type==='spitter'?'#e6b94b':tier===1?'#7ca3ed':'#59df42'),seed:x,flash:0,specialCooldown:2+(x%5)*.4,patternIndex:0,warning:null}}
function enter(){bossExitWait=2;currentNode='a'+area;$('#world').hidden=true;mapReturn=null;state='fight';paused=false;drag=null;shots=[];minions=[];hazards=[];blasts=[];rituals=[];numbers=[];loot=[];potions=[];enemies=[];fields=[];flashes=[];$('#setup').hidden=true;$('#result').hidden=true;heroes.forEach((h,i)=>{h.x=32+i*20;h.y=floor(h.x);h.vy=0;h.vx=0;h.drive=0;h.strike=null;h.nextNote=null;h.songs={};h.barriers={};h.poison=null;h.hold=0;h.firstSummon=true;h.summonProgress=0;h.hp=Math.min(h.maxHp,h.hp)});const count=areaInfo().major?1:6+areaInfo().local%3+areaInfo().zone*2;for(let i=0;i<count;i++){const type=encounterType(i,count),x=count===1?440:240+i*(309/(count-1));enemies.push(enemy(type,x));if(ENEMY_TYPES[type]?.swarmCount)for(let j=1;j<ENEMY_TYPES[type].swarmCount;j++)enemies.push(enemy(type,x-j*22));if((ENEMY_TYPES[type]?.base||type)==='swarmling')for(let j=1;j<=5;j++)enemies.push(enemy(type,Math.max(210,Math.min(564,x+(j-2)*7))))}tell('Drag to fight, or touch NEXT to skip ahead. Defeat the boss to unlock the next area.');save();build();}
function start(){setFrontScreen(null);menuOpen=false;sessionSlot=activeSlot;$('#main-menu').hidden=true;autoMoveEnabled=true;inventoryRunes=Array.from({length:15},()=>[null,null]);stage=0;heroes=[...document.querySelectorAll('#choices select')].map((el,i)=>hero(+el.value,i));area=0;gold=0;inventory=Array(15).fill(null);selected=0;completed=[];currentNode='town';state='town';$('#setup').hidden=true;enterService('town');}
function float(x,y,text,color='#fff'){if(/^\+\d/.test(String(text)))color='#60ff70';const side=Math.random()<.5?-1:1;numbers.push({x,y,text,color,life:1,vx:side*(9+Math.random()*7),vy:-30-Math.random()*7})}
function tickNumbers(dt){for(const n of numbers){n.x+=(n.vx||0)*dt;n.y+=(n.vy||0)*dt+20*dt*dt;n.vy=(n.vy||0)+40*dt;n.life-=dt}numbers=numbers.filter(n=>n.life>0)}
function xpGain(h,amount,mobLevel,source=null){const penalty=mobLevel==null?1:Math.max(0,1-Math.max(0,h.level-mobLevel-5)*.1);return mobLevel==null?amount*(1+h.runeBonus.xpBonus+(source?.owner===h?source.runeBonus.xpBonus:0)):Math.max(1,amount*penalty*(1+h.runeBonus.xpBonus+(source?.owner===h?source.runeBonus.xpBonus:0)))}
function xp(amount,mobLevel=null,source=null){heroes.forEach(h=>{h.xp=Math.round((h.xp+xpGain(h,amount,mobLevel,source))*100)/100;while(h.xp>=needed(h.level)&&h.level<99){h.xp-=needed(h.level);h.level++;h.sp+=2;stats(h);float(h.x,h.y-34,'LEVEL UP +2 SP','#ffff66')}});save()}
function damage(target,n,element='physical',showNumber=true,dodgeable=false,source=null){if(target.hp<=0)return;const hpBefore=target.hp;if(dodgeable&&target.classId===1&&(target.dodgeLeft||0)<=0){target.dodgeLeft=target.dodgeCooldown;if(showNumber)float(target.x,target.y-22,'DODGE','#b9e8ff');return}if(target.owner){if(element!=='physical')n*=1-(target.runeBonus?.resistance||0);n=Math.max(1,n-(target.defense||0));n=Math.max(1,absorbBarrier(target,n));target.hp=Math.max(0,target.hp-n);target.flash=.1;if(target.hp===0)sfx('death',{ally:true});else if(showNumber)sfx('hurt');return}if(!target.type){if(element!=='physical')n*=1-target.runeBonus.resistance;n=Math.max(1,n-aura(target).defense-(target.defense||0))}if(!target.type)n=Math.max(1,absorbBarrier(target,n));const dealt=Math.min(target.hp,n);target.hp=Math.max(0,target.hp-n);if(target.hp===0&&hpBefore>0)sfx('death',{ally:!target.type});else if(showNumber)sfx(target.type?'enemyHit':'hurt');if(source?.owner&&source.hp>0)source.hp=Math.min(source.maxHp,source.hp+dealt*(source.runeBonus?.lifesteal||0));target.flash=.1;if(!target.type){target.vx=(target.vx||0)-18*(target.face||1);target.leanV=(target.leanV||0)-18*(target.face||1)}if(showNumber)float(target.x,target.y-22,Math.round(n),target.type?'#fff':'#ff4545');if(target.type&&target.hp===0){gold+=2+area;xp(enemyXp(target),target.level,source);for(const item of (target.swarmBoss&&enemies.some(e=>e!==target&&e.species===target.species&&e.hp>0)?[]:rollDrops(target,source)))loot.push({x:target.x,y:floor(target.x),item});if(Math.random()<(target.type==='swarmling'?.15:.30))potions.push({x:target.x,y:floor(target.x)});save()}}
function shoot(h,target,kind,amount,attack=null){if(kind!=='note'&&kind!=='enemy'&&(h.classId!==3||!ITEMS[h.weapon]?.effect))sfx('weapon',ITEMS[h.weapon]||{classId:h.classId});if(h.classId===3&&kind==='magic'&&ITEMS[h.weapon]?.ability){activate(h,target,ITEMS[h.weapon].effect,amount);return}if(kind==='note'){shootNote(h,target,amount,attack);return}if(kind==='enemy'){launchHazard(h,target,'bullet',0,amount);return}const dx=target.x-h.x,dy=target.y-12-(h.y-13),flight=Math.max(.35,Math.abs(dx)/180),angle=Math.atan2(dy,dx),v=kind==='bullet'?330:180;const count=kind==='arrow'?(ITEMS[attack?.weapon||h.weapon]?.arrows||1):1;for(let i=0;i<count;i++){const spread=(i-(count-1)/2)*.035;shots.push({x:h.x,y:h.y-13,target,kind,amount,attack,element:'physical',life:4,vx:kind==='arrow'?dx/flight+spread*45:Math.cos(angle)*v,vy:kind==='arrow'?dy/flight-.5*240*flight+spread*45:Math.sin(angle)*v,gravity:kind==='arrow'?240:0})}}

const PATTERNS=['FAN','ARROWS','BOMBS','SEEKERS'];
function launchHazard(e,target,kind,offset=0,amount=enemyDamage(e,3)){
 const x=e.x,y=e.y-16,dx=target.x-x,dy=target.y-13-y;
 const angle=Math.atan2(dy,dx)+offset,speed=kind==='missile'?90:kind==='bullet'?145:130;
 const p={dodgeable:!(e.type==='boss'&&e.emittingSpecial),x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,kind,amount,target,age:0,life:kind==='missile'?1.6:5,element:kind==='bomb'?'fire':kind==='missile'?'lightning':'physical'};
 if(kind==='arrow'||kind==='bomb'||kind==='rock'){const flight=kind==='rock'?2.2:kind==='bomb'?1.9:.85;p.vx=dx/flight+offset*100;p.gravity=kind==='rock'?110:kind==='bomb'?100:240;p.vy=dy/flight-.5*p.gravity*flight;if(kind==='bomb')p.fuse=2.6}
 hazards.push(p);return p;
}

function enemyApproachRange(e){const b=enemyBodyBounds(e);return Math.max(e.range,(b.right-b.left)/2+8)}
function physicalEnemy(e){return ['spider','roller','flyer','hopper'].includes(e.type)}
function stepEnemyPhysics(e,target,dt){
 const direction=Math.sign(target.x-e.x),distance=Math.abs(target.x-e.x),slow=slowFactor(e),ground=e.y>=floor(e.x)-.5;
 if(e.type==='flyer'){const goalY=Math.max(45,Math.min(floor(target.x)-5,target.y-10+Math.sin(time*2.4+e.seed)*18)),goalX=target.x+Math.sin(time*3+e.seed)*14;e.vx+=((goalX-e.x)*2-e.vx*2.2)*dt;e.vy+=((goalY-e.y)*3-e.vy*2.5+Math.sin(time*19+e.seed)*90)*dt;e.vx=Math.max(-55,Math.min(55,e.vx));e.vy=Math.max(-65,Math.min(65,e.vy));e.x=Math.max(8,Math.min(569,e.x+e.vx*dt*slow));e.y=Math.max(25,Math.min(floor(e.x)-4,e.y+e.vy*dt*slow));collideRoof(e);return}
 if(e.type==='hopper'){e.hopCooldown-=dt;e.crouching=ground&&e.hopCooldown<.4;if(ground&&e.hopCooldown<=0&&distance>enemyApproachRange(e)){e.vy=-155;e.vx=direction*65*slow;e.hopCooldown=1.1;e.crouching=false}if(ground&&e.vy>=0)e.vx*=Math.exp(-18*dt)}
 else{const desired=distance>e.range?direction*e.speed*slow:0;e.vx+=(desired-e.vx)*(1-Math.exp(-(e.type==='roller'?1.8:6)*dt))}
 const before=e.x;moveEnemy(e,(e.vx+(e.kick||0))*dt,dt);e.rotation+=(e.x-before)/9;
 if(e.type==='spider'){if(!e.feet.length)e.feet=Array.from({length:6},(_,i)=>({x:e.x+(i-2.5)*5,y:floor(e.x+(i-2.5)*5)}));e.feet.forEach((foot,i)=>{const goal=e.x+(i-2.5)*5;if(Math.abs(goal-foot.x)>6+(i%3)*3&&!foot.step)foot.step={x:foot.x,to:goal+direction*3,t:0};if(foot.step){foot.step.t=Math.min(1,foot.step.t+dt*8);const p=foot.step.t;foot.x=foot.step.x+(foot.step.to-foot.step.x)*p;foot.y=floor(foot.x)-Math.sin(p*Math.PI)*6;if(p===1)foot.step=null}else foot.y=floor(foot.x)})}
}
function tickCatapult(e,target,dt){if(e.type!=='catapult'||e.attackProfile)return;if(e.lob){e.lob.left-=dt;if(e.lob.left<=0){launchHazard(e,{x:e.lob.x,y:e.lob.y},'rock',0,enemyDamage(e,4));e.lob=null;e.cooldown=4.5}}else if(e.cooldown<=0&&Math.abs(target.x-e.x)<=e.range){e.lob={left:.9,x:target.x,y:target.y};}}

function enemyTrait(e,target,dt){

 if(e.type==='shaman'&&e.heals>0){e.healCooldown-=dt;if(e.healCooldown<=0){const ally=enemies.filter(v=>v!==e&&v.hp>0&&v.hp<v.maxHp&&Math.hypot(v.x-e.x,v.y-e.y)<110).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(ally){const n=Math.min(ally.maxHp-ally.hp,Math.ceil(ally.maxHp*.2));ally.hp+=n;e.heals--;float(ally.x,ally.y-28,'+'+n,'#76dbc4');flashes.push({x:e.x,y:e.y-20,tx:ally.x,ty:ally.y-12,color:'#76dbc4',life:.25});e.healCooldown=4}}}
}
function enemyMeleePaths(a){
 const r=a.range,h=a.height;
 if(a.shape==='cross')return [[[4,-h],[r,h]],[[4,h],[r,-h]]];
 if(a.shape==='thrust')return [[[3,0],[r,0]]];
 if(a.shape==='pincer')return [[[3,-h],[r,-h*.5],[r*.7,0]],[[3,h],[r,h*.5],[r*.7,0]]];
 if(a.shape==='fork')return [-h,0,h].map(offset=>[[3,0],[r*.6,offset],[r,offset]]);
 return [[[7,-h],[r,0],[7,h]]];
}
function tickSlash(e,dt){const slash=e.slash;if(!slash)return;slash.left-=dt;slash.life-=dt;if(slash.left<=0&&!slash.hit){slash.hit=true;const a=slash.profile;for(const h of combatAllies())if(h.hp>0){const dx=(h.x-e.x)*slash.face,dy=Math.abs(h.y-e.y),reach=a?.range||e.range+7,height=a?.height||(area<3?16:23);const hit=a?.shape==='pulse'?(dx/reach)**2+((h.y-e.y)/height)**2<1:a?enemyMeleePaths(a).some(path=>path.some((p,i)=>i>0&&segmentDistance(dx,h.y-e.y,...path[i-1],...p)<7)):dx>=-4&&dx<=reach&&dy<height;if(hit)damage(h,enemyDamage(e,a?.damage||1.8),a?.element||'physical',true,e.type!=='boss')}}if(slash.life<=0)e.slash=null}

function specialPattern(e){if(e.attackProfile&&e.type!=='boss')return null;if(e.type==='boss'&&!e.swarmBoss&&!e.major&&e.attackProfile)return ({cloud:'SPORES',rock:'BOULDERS',melee:e.shape==='bell'?'PULSE':'SWEEP',missile:'SEEKERS',bullet:'SHARDS',arrow:'ARROWS'})[e.attackProfile.kind];if(e.patterns)return e.patterns[e.patternIndex%e.patterns.length];if(e.pattern)return e.pattern;if(e.type==='bomber')return 'BOMBS';if(ENEMY_TYPES[e.type])return null;if(e.type==='slasher')return null;if(e.type==='boss')return PATTERNS[e.patternIndex%4];if(e.type==='summoner')return 'SEEKERS';if(e.type==='spitter')return PATTERNS[(area+stage)%4];return stage>0&&e.seed>400?PATTERNS[stage%4]:null}
function tickSpecial(e,target,dt){
 const pattern=specialPattern(e);if(!pattern)return;
 if(e.warning){e.warning.left-=dt;if(e.warning.left<=0){const w=e.warning;e.warning=null;e.patternIndex++;e.specialCooldown=e.major?3.2:e.swarmBoss?5.5:e.type==='boss'?3.8:5.5;e.emittingSpecial=true;
 const aim={x:w.x,y:w.y,hp:1};
 if(w.pattern==='SPORES')for(const offset of [-25,0,25])fireEnemyAttack({...e,y:e.y+offset},aim,{kind:'cloud',range:55,radius:18,damage:.6,life:2.5,element:'poison',color:'#a7cb68'});
 if(w.pattern==='SHARDS')fireEnemyAttack(e,aim,{kind:'bullet',count:9,spread:.16,speed:85,size:3,damage:1.2,element:'ice',color:'#a9deff'});
 if(w.pattern==='BOULDERS')fireEnemyAttack(e,aim,{...e.attackProfile,kind:'rock',count:5,spread:.3,flight:2.6,damage:1.5});
 if(w.pattern==='SWEEP')fireEnemyAttack(e,aim,{...e.attackProfile,range:Math.min(65,e.attackProfile.range*1.5),height:e.attackProfile.height*1.3,windup:.5,damage:2});
 if(w.pattern==='PULSE')fireEnemyAttack(e,aim,{kind:'melee',shape:'pulse',range:65,height:60,windup:.5,damage:2,color:e.color});
 if(w.pattern==='ERUPTION')fireEnemyAttack(e,aim,{kind:'rock',count:10,spread:.18,flight:2.8,size:3,aoe:12,damage:.8,element:'fire',color:'#ff9862'});
 if(w.pattern==='TIDES')fireEnemyAttack(e,aim,{kind:'bullet',count:5,spread:.25,speed:70,size:7,damage:1.2,element:'ice',color:'#80d7eb'});
if(w.pattern==='DART')launchHazard(e,aim,'bullet',0,enemyDamage(e,2));if(w.pattern==='FAN')for(let i=-3;i<=3;i++)launchHazard(e,aim,'bullet',i*.20);
 if(w.pattern==='ARROWS')for(let i=-2;i<=2;i++)launchHazard(e,aim,'arrow',i*.25);
 if(w.pattern==='BOMBS')launchHazard(e,aim,'bomb',0,enemyDamage(e,4));
 if(w.pattern==='SEEKERS')for(let i=-1;i<=1;i++)launchHazard(e,target,'missile',i*.6,enemyDamage(e,3.5));

 if(['CHARGE','TIDES','FROST','ERUPTION','CURSE'].includes(w.pattern)){
  const spots=w.pattern==='CURSE'?heroes.filter(h=>h.hp>0).map(h=>h.x):w.pattern==='CHARGE'?[w.x]:[w.x-65,w.x,w.x+65];
  for(const x of spots)rituals.push({x:Math.max(12,Math.min(560,x)),left:1.2,life:.3,radius:w.pattern==='CHARGE'?65:24,amount:enemyDamage(e,2.5),color:w.pattern==='FROST'?'#8de5ff':w.pattern==='CURSE'?'#bd83ff':w.pattern==='ERUPTION'?'#ff8c43':'#f0c274',ground:w.pattern!=='CURSE'});
 }
 if(w.pattern==='BONES')for(let i=0;i<3;i++){const p=launchHazard(e,{x:e.x-200,y:e.y},'bullet',0,enemyDamage(e,2));p.x=e.x+i*35;p.y=floor(p.x)-6;p.vx=-95;p.vy=0;p.life=6;}
 if(w.pattern==='SOULS')for(let i=-4;i<=4;i++){const p=launchHazard(e,aim,'bullet',i*.22,enemyDamage(e,2));p.vx*=.65;p.vy*=.65;p.life=6;}
 e.emittingSpecial=false;}return}
 e.specialCooldown-=dt;if(e.specialCooldown<=0&&Math.abs(e.x-target.x)<400){e.warning={pattern,left:.95,x:target.x,y:target.y};}
}
function segmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
function explode(p){const radius=p.aoe||36;blasts.push({x:p.x,y:p.y,life:.35,radius,color:p.color});for(const h of combatAllies())if(h.hp>0&&Math.hypot(h.x-p.x,h.y-12-p.y)<radius+6)damage(h,p.amount,p.element,true,p.dodgeable);p.life=0}
function tickHazards(dt){
 for(const r of rituals){r.left-=dt;if(r.left<=0&&!r.hit){r.hit=true;for(const h of combatAllies())if(h.hp>0&&Math.abs(h.x-r.x)<r.radius&&(!r.ground||h.y>floor(h.x)-28))damage(h,r.amount,'magic',true,false)}if(r.left<=0)r.life-=dt}
 rituals=rituals.filter(r=>r.life>0);

 blasts.forEach(b=>b.life-=dt);blasts=blasts.filter(b=>b.life>0);
 for(const p of hazards){p.age+=dt;p.life-=dt;const ax=p.x,ay=p.y;
 if(p.kind==='cloud'){
  for(const h of combatAllies())if(h.hp>0&&Math.hypot(h.x-p.x,h.y-13-p.y)<p.radius&&(!p.hitTimes[h.id]||p.age>=p.hitTimes[h.id])){const wall=terrainHit(p.x,p.y,h.x,h.y-13);if(!wall){damage(h,p.amount,p.element,false,false);h.poison={time:2,tick:1,amount:p.amount*.4};p.hitTimes[h.id]=p.age+.6;}}
  continue;
 }
 if(p.kind==='missile'&&p.age<(p.tracking??.8)&&p.target.hp>0){const angle=Math.atan2(p.vy,p.vx),goal=Math.atan2(p.target.y-13-p.y,p.target.x-p.x),delta=Math.atan2(Math.sin(goal-angle),Math.cos(goal-angle)),turn=Math.max(-1.5*dt,Math.min(1.5*dt,delta));p.vx=Math.cos(angle+turn)*(p.speed||90);p.vy=Math.sin(angle+turn)*(p.speed||90)}
 p.vy+=(p.gravity||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
 const wall=terrainHit(ax,ay,p.x,p.y);if(wall){p.x=wall.x;p.y=wall.y;if(p.kind!=='bomb'){if(p.aoe)explode(p);p.life=0;continue}else if(wall.y===ceiling(wall.x)){p.y=wall.y+1;p.vy=Math.abs(p.vy)*.4}}
 if(p.kind==='bomb'){p.fuse-=dt;if(p.y>=floor(p.x)-3){p.y=floor(p.x)-3;p.vx=0;p.vy=0}if(p.fuse<=0){explode(p);continue}}
 else{const hit=combatAllies().filter(h=>h.hp>0&&segmentDistance(h.x,h.y-13,ax,ay,p.x,p.y)<(p.size?p.size+5:p.kind==='rock'?10:7)).sort((a,b)=>Math.hypot(a.x-ax,a.y-13-ay)-Math.hypot(b.x-ax,b.y-13-ay))[0];if(hit){if(p.aoe)explode(p);else damage(hit,p.amount,p.element,true,p.dodgeable);p.life=0}if(p.y>=floor(p.x))p.life=0}
 if(p.x<-30||p.x>606||p.y>280)p.life=0;
 }hazards=hazards.filter(p=>p.life>0)
}
function drawHazards(){
 for(const r of rituals){ctx.strokeStyle=r.color;ctx.fillStyle=r.color;ctx.beginPath();ctx.ellipse(r.x,floor(r.x)-2,r.radius,5,0,0,Math.PI*2);ctx.stroke();if(r.left<=0){ctx.globalAlpha=.45;ctx.fillRect(r.x-r.radius,floor(r.x)-90,r.radius*2,90);ctx.globalAlpha=1}}

 for(const e of enemies)if(e.slash){
  const slash=e.slash,a=slash.profile,f=slash.face,x=e.x,y=e.y-12,reach=a?.range||e.range+5,height=a?.height||12,color=slash.hit?(a?.color||'#ffba61'):'#725647',L=points=>line(ctx,points.map(([dx,dy])=>[x+dx*f,y+dy]),color);
  if(a?.shape==='pulse'){ctx.strokeStyle=color;ctx.beginPath();ctx.ellipse(x,y,reach,height,0,0,Math.PI*2);ctx.stroke()}
  else if(a?.shape==='cross'){L([[4,-height],[reach,height],[reach*.55,0],[reach,-height],[4,height]])}
  else if(a?.shape==='thrust'){L([[3,-3],[reach-7,-3],[reach,0],[reach-7,3],[3,3]])}
  else if(a?.shape==='pincer'){L([[3,-height],[reach,-height*.5],[reach*.7,0]]);L([[3,height],[reach,height*.5],[reach*.7,0]])}
  else if(a?.shape==='fork'){for(const offset of [-height,0,height])L([[3,0],[reach*.6,offset],[reach,offset]])}
  else L([[7,-height],[reach,0],[7,height]]);
 }
 for(const e of enemies)if(e.cast){const a=e.attackProfile;ctx.strokeStyle=a.color||e.color;ctx.beginPath();ctx.arc(e.x,e.y-16,8+(1-e.cast.left/.65)*7,0,Math.PI*2);ctx.stroke();if(a.kind==='rock'){ctx.beginPath();ctx.ellipse(e.cast.target.x,e.cast.target.y-1,a.aoe||a.size+4,3,0,0,Math.PI*2);ctx.stroke()}}

 for(const e of enemies)if(e.warning){ctx.strokeStyle='#ffcf6c';ctx.beginPath();ctx.arc(e.x,e.y-17,12+(1-e.warning.left)*7,0,Math.PI*2);ctx.stroke();if(e.warning.pattern!=='SEEKERS')line(ctx,[[e.x,e.y-16],[e.warning.x,e.warning.y-13]],'#75522b')}
 for(const p of hazards){const color=p.color||(p.kind==='rock'?'#c4b39a':p.kind==='bomb'?'#ff794c':p.kind==='missile'?'#e994ff':p.kind==='arrow'?'#ffe59a':'#ff6464');ctx.fillStyle=color;
 if(p.kind==='cloud'){ctx.globalAlpha=.22*Math.min(1,p.life*3);for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(p.x+Math.cos(i*1.7+p.age)*p.radius*.4,p.y+Math.sin(i*1.7+p.age)*p.radius*.4,p.radius*.65,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;continue}
 if(p.kind==='rock'){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,p.size||5,0,Math.PI*2);ctx.fill();ctx.stroke();line(ctx,[[p.x-2,p.y-3],[p.x+2,p.y],[p.x-1,p.y+3]],'#807364')}
 else if(p.kind==='bomb'){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.stroke();ctx.fillRect(p.x-1,p.y-7,2,2);if(p.fuse<.65){ctx.strokeStyle='#aa4935';ctx.beginPath();ctx.ellipse(p.x,floor(p.x)-2,36,4,0,0,Math.PI*2);ctx.stroke()}}
 else if(p.kind==='arrow'||p.kind==='missile'){const a=Math.atan2(p.vy,p.vx);line(ctx,[[p.x-Math.cos(a)*9,p.y-Math.sin(a)*9],[p.x,p.y]],color);ctx.fillRect(p.x-1,p.y-1,3,3)}
 else{const size=p.size||2;ctx.fillRect(Math.round(p.x)-size,Math.round(p.y)-size,size*2,size*2)}}
 for(const b of blasts){ctx.strokeStyle=b.color||'#ffbd68';ctx.beginPath();ctx.arc(b.x,b.y,b.radius*(1-b.life/.4),0,Math.PI*2);ctx.stroke()}
}

function terrainHit(ax,ay,bx,by){const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/2));for(let i=0;i<=steps;i++){const t=i/steps,x=ax+(bx-ax)*t,y=ay+(by-ay)*t;if(y>=floor(x))return {x,y:floor(x),t};if(y<=ceiling(x))return {x,y:ceiling(x),t}}return null}
function tickShots(dt){for(const s of shots){if(s.summonOwner&&(s.summonOwner.hp<=0||s.summonOwner.gearRevision!==s.summonRevision)){s.life=0;continue}s.life-=dt;const ax=s.x,ay=s.y;s.vy+=(s.gravity||0)*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;const wall=terrainHit(ax,ay,s.x,s.y),bx=wall?wall.x:s.x,by=wall?wall.y:s.y;
 if(s.kind==='spell'){if(s.spell.owner.hp<=0||s.spell.owner.gearRevision!==s.spell.revision){s.life=0;continue}const target=enemies.filter(e=>e.hp>0&&segmentDistance(e.x,e.y-12,ax,ay,bx,by)<8).sort((a,b)=>Math.hypot(a.x-ax,a.y-12-ay)-Math.hypot(b.x-ax,b.y-12-ay))[0];if(target){spellImpact(s.spell,target.x,target.y-12);s.life=0}if(wall)s.life=0;continue}
 if(s.kind==='note'){
  const owner=s.attack.owner;
  if(owner.hp<=0||owner.gearRevision!==s.attack.revision){s.life=0;continue}
  for(const h of combatAllies())if(h.hp>0&&h!==owner&&!s.attack.noteAllies.has(h)&&segmentDistance(h.x,h.y-13,ax,ay,bx,by)<8+(s.radius||0)){s.attack.noteAllies.add(h);applySong(h,owner,s.mod);applyNoteSupport(h,owner,s.mod);}
  const hits=enemies.filter(e=>e.hp>0&&!s.hitSet.has(e)&&segmentDistance(e.x,e.y-10,ax,ay,bx,by)<(e.type==='boss'&&!e.swarmBoss?16:7)+(s.radius||0));
  for(const e of hits){s.hitSet.add(e);s.attack.noteHits=s.attack.noteHits||new Set();if(!s.attack.noteHits.has(e)){s.attack.noteHits.add(e);applySong(e,owner,s.mod);basicHit(e,s.amount,s.attack)}
   if(s.bounces>0){const next=enemies.filter(v=>v.hp>0&&!s.hitSet.has(v)&&Math.hypot(v.x-s.x,v.y-10-s.y)<65).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];if(next){const angle=Math.atan2(next.y-10-s.y,next.x-s.x);s.vx=Math.cos(angle)*160;s.vy=Math.sin(angle)*160;s.bounces--;}}
  }
 }else{const hit=enemies.filter(e=>e.hp>0&&segmentDistance(e.x,e.y-10,ax,ay,bx,by)<(e.type==='boss'&&!e.swarmBoss?16:7)).sort((a,b)=>Math.hypot(a.x-ax,a.y-10-ay)-Math.hypot(b.x-ax,b.y-10-ay))[0];if(hit){if(s.summonOwner&&s.physical)s.amount+=songTotal(hit,'vulnerability');if(s.attack?.owner.classId===3&&ITEMS[s.attack.weapon]?.effect){const h=s.attack.owner;if(h.hp>0&&h.gearRevision===s.attack.revision)activate(h,hit,ITEMS[s.attack.weapon].effect,s.amount)}else if(s.attack)basicHit(hit,s.amount,s.attack);else damage(hit,s.amount,'physical',true,false,s.summonSource||null);s.life=0}}
 if(wall)s.life=0}shots=shots.filter(s=>s.life>0)}


const WEAPON_DROPS={},WEAPON_AREAS={},WEAPON_STAGES={};
{
 for(let c=0;c<8;c++)for(let tier=1;tier<=6;tier++){
  const weapons=Object.values(ITEMS).filter(w=>w.type==='weapon'&&!w.retired&&w.classId===c&&w.tier===tier&&w.id!==c+'-basic').sort((a,b)=>a.catalogIndex-b.catalogIndex||a.id.localeCompare(b.id));
  weapons.forEach((w,i)=>{const local=Math.floor(i*19/Math.max(1,weapons.length-1)),a=(tier-1)*21+local;WEAPON_AREAS[w.id]=a;WEAPON_STAGES[w.id]=2+(i+c)%3;});
 }
 for(const node of AREAS){
  const a=node.area,pool=REGIONAL_POOLS[node.region],species=[...pool,REGION_SUMMONERS[node.region],'guardian'+a];
  const weapons=Object.keys(WEAPON_AREAS).filter(id=>node.major?areaInfo(WEAPON_AREAS[id]).zone===node.zone:WEAPON_AREAS[id]===a);
  if(node.major){WEAPON_DROPS[a+':guardian'+a]=weapons.slice(-2);continue}
  species.forEach((id,i)=>WEAPON_DROPS[a+':'+id]=weapons.length?[weapons[i%weapons.length]]:[]);
  weapons.forEach((id,i)=>{const table=WEAPON_DROPS[a+':'+species[i%species.length]];if(!table.includes(id))table.push(id)});
 }
}
function dropMultiplier(source=null){return 1+(source?.runeBonus?.dropBonus||0)+heroes.filter(h=>h.hp>0).reduce((n,h)=>n+(h.runeBonus.dropBonus||0),0)}
function weaponDropTable(target){return (WEAPON_DROPS[area+':'+(target.species||target.type)]||WEAPON_DROPS[area+':'+(target.type==='boss'?'guardian'+area:target.type)]||[]).filter(id=>areaInfo().major||stage>=WEAPON_STAGES[id])}
function regionTier(){return areaInfo().zone+1}
function rollDrops(target,source=null){
 const result=[],boost=dropMultiplier(source),boss=target.type==='boss',rate=boss?.10:target.type==='swarmling'?.025:.05;
 const choose=pool=>pool[Math.floor(Math.random()*pool.length)];
 const weapons=weaponDropTable(target);if(Math.random()<Math.min(1,rate*boost)&&weapons.length)result.push(choose(weapons));
 if(Math.random()<Math.min(1,.01*boost)){const pool=Object.values(ITEMS).filter(w=>(w.type==='rune'||w.type==='gem')&&w.tier===regionTier());result.push(choose(pool).id);}
 if(boss&&Math.random()<Math.min(1,.10*boost)){const tier=regionTier(),pool=Object.values(ITEMS).filter(w=>w.type==='soul'&&w.tier===tier);result.push(choose(pool).id);}
 return result;
}

function pickLoot(){let picked=false;loot=loot.filter(item=>{if(!heroes.some(h=>h.hp>0&&Math.abs(h.x-item.x)<12&&Math.abs(h.y-item.y)<8))return true;const i=inventory.indexOf(null);if(i<0)return true;inventory[i]=item.item;inventoryRunes[i]=[null,null];tell('Found '+ITEMS[item.item].name+'.');picked=true;return false});if(picked){save();build()}}
function slotItem(slot){return slot.type==='bag'?inventory[slot.index]:slot.type==='gear'?heroes[slot.index]?.weapon:heroes[slot.index]?.runes[slot.type==='rune0'?0:1]}
function validSlot(slot){return slot&&Number.isInteger(slot.index)&&(slot.type==='bag'?slot.index>=0&&slot.index<15:['gear','rune0','rune1'].includes(slot.type)&&slot.index>=0&&slot.index<4)}
function accepts(slot,id){if(slot.type.startsWith('rune')&&!heroes[slot.index]?.weapon)return false;if(!id)return true;const item=ITEMS[id];if(!item)return false;if(slot.type==='bag')return true;const h=heroes[slot.index];return item.level<=h.level&&(slot.type==='gear'?item.type==='weapon'&&item.classId===h.classId:socketItem(id))}
function moveItem(from,to){if(!validSlot(from)||!validSlot(to)||from.type===to.type&&from.index===to.index)return false;const a=slotItem(from),b=to.type.startsWith('rune')?null:slotItem(to);if(from.type.startsWith('rune')){tell('Cannot move this item.');return false}if(!a)return false;if(!accepts(to,a)||!accepts(from,b)){tell('Cannot equip: weapon class or required level does not match.');return false}
 const sockets=slot=>slot.type==='bag'?inventoryRunes[slot.index]:slot.type==='gear'?heroes[slot.index].runes:[null,null];const fromRunes=[...sockets(from)],toRunes=[...sockets(to)];
 for(const [slot,id,runes] of [[from,b,toRunes],[to,a,fromRunes]]){if(slot.type==='bag'){inventory[slot.index]=id;inventoryRunes[slot.index]=runes}else{const h=heroes[slot.index];if(slot.type==='gear'){h.weapon=id;h.runes=runes;}else h.runes[slot.type==='rune0'?0:1]=id;h.mp=0;h.nextNote=null;h.gearRevision++}}
 for(const h of heroes){stats(h);h.hp=Math.min(h.hp,h.maxHp)}
 tell(ITEMS[a].name+' moved. Equipment swaps reset MP.');pickedSlot=null;save();build();return true}
function equip(i){return moveItem({type:'bag',index:i},{type:'gear',index:selected})}
function roll(min,max){return Math.floor(min+Math.random()*(max-min+1))}

function songTotal(target,key){return Object.values(target.songs||{}).reduce((sum,s)=>sum+(s.until>time?(s[key]||0):0),0)}
function applyNoteSupport(target,owner,mod={}){
 if(mod.heal)target.hp=Math.min(target.maxHp,target.hp+mod.heal);
 if(mod.barrier){target.barriers=target.barriers||{};target.barriers[owner.id]={amount:mod.barrier,until:time+2};}
 if(mod.cleanse){target.burn=null;target.poison=null;target.frozen=0;target.slow=0;target.slowAmount=0;}
}
function absorbBarrier(target,amount){
 for(const [id,barrier] of Object.entries(target.barriers||{})){
  if(barrier.until<=time||barrier.amount<=0){delete target.barriers[id];continue}
  const absorbed=Math.min(amount,barrier.amount);barrier.amount-=absorbed;amount-=absorbed;
 }
 return amount;
}
function applySong(target,owner,mod={}){
 target.songs=target.songs||{};const power=mod.power||1;
 target.songs[owner.id]={until:time+(mod.duration||2),attack:owner.str*.01*power,haste:owner.dex*.01*power,weakness:owner.str*.5*power,vulnerability:owner.dex*.25*power};
}
function enemyDamage(e,multiplier=1){return Math.max(1,e.at*multiplier-songTotal(e,'weakness'))}
function effectiveAgi(h){return h.agi.map(n=>Math.max(1,Math.round(n/(1+songTotal(h,'haste')))))}

function aura(h){let attack=1+songTotal(h,'attack'),defense=0;for(const p of heroes)if(p.hp>0&&p.classId===4&&Math.hypot(p.x-h.x,p.y-h.y)<=p.range){attack+=p.str*.01;defense+=p.dex*.2}return {attack,defense,flat:0}}
function basicAmount(h){return Math.max(1,Math.round((roll(h.atMin,h.atMax)+aura(h).flat)*aura(h).attack*(Math.random()<h.crit?2:1)))}
function attackToken(h){return {owner:h,weapon:h.weapon,revision:h.gearRevision,charged:false}}
function basicHit(target,amount,attack){if(target.hp<=0)return;const before=target.hp;damage(target,amount+(['melee','arrow'].includes(attack?.owner?.kind)?songTotal(target,'vulnerability'):0));const owner=attack?.owner;if(owner?.hp>0&&owner.gearRevision===attack.revision)owner.hp=Math.min(owner.maxHp,owner.hp+(before-target.hp)*owner.runeBonus.lifesteal+(owner.classId===5?owner.dex*.5:0));if(!attack||attack.charged||[3,7].includes(owner?.classId))return;attack.charged=true;const h=attack.owner,w=ITEMS[attack.weapon],effect=EFFECTS[w?.effect];if(!effect||h.hp<=0||h.weapon!==attack.weapon||h.gearRevision!==attack.revision)return;h.mp+=h.int;if(h.mp>=mpCost(w)){h.mp=0;activate(h,target,w.effect)}save()}
function controlDuration(h,base){return Math.max(.06,Math.min(base,base*((ITEMS[h.weapon]?.agi||[25,35]).reduce((sum,n)=>sum+n,0)/2)/85))}
function effectText(w){const e=EFFECTS[w?.effect];if(!e)return '';return w.abilityDescription?(w.abilityDescription+(w.effect==='ice'?' Freeze '+Number(controlDuration({weapon:w.id},.7).toFixed(2))+'s.':'')):w.effect==='ice'?'Freeze '+Number(controlDuration({weapon:w.id},.7).toFixed(2))+'s.':e.description}
function slowFactor(e){return e.slow>0?1-(e.slowAmount??.4):1}
function weaponSpell(h,target,kind,spellAT,source){
 const w=ITEMS[h.weapon],a=w.ability,e=EFFECTS[kind],origin=source||h;
 const total=Math.max(1,Math.round((spellAT??roll(e.min,e.max)*h.abilityPower*.65*(kind==='fire'?10:kind==='poison'?4:1))*a.power));
 const payload={kind,amount:total,source,owner:h,weapon:w.id,revision:h.gearRevision,radius:a.radius,freeze:controlDuration(h,.7),stun:controlDuration(h,.6)};
 const impact=(x,y,radius=a.radius)=>spellImpact({...payload,radius},x,y);
 if(a.mode==='ring'){impact(origin.x,origin.y-12);return}
 if(a.mode==='burst'){impact(target.x,target.y-12);return}
 if(a.mode==='chain'){
  let from={x:origin.x,y:origin.y-12},next=target;const visited=new Set();
  for(let i=0;i<a.count&&next;i++){visited.add(next);applyWeaponEffect(next,{...payload,amount:Math.max(1,Math.round(total*.75))});flashes.push({x:from.x,y:from.y,tx:next.x,ty:next.y-12,color:e.color,life:.35});from={x:next.x,y:next.y-12};next=enemies.filter(v=>v.hp>0&&!visited.has(v)&&Math.hypot(v.x-from.x,v.y-12-from.y)<85&&!terrainHit(from.x,from.y,v.x,v.y-12)).sort((a,b)=>Math.hypot(a.x-from.x,a.y-12-from.y)-Math.hypot(b.x-from.x,b.y-12-from.y))[0];}return;
 }
 if(a.mode==='eruption'||a.mode==='trail'){
  const count=a.mode==='trail'?3:1;
  for(let i=0;i<count;i++){const x=a.mode==='trail'?origin.x+(target.x-origin.x)*(i+1)/count:target.x;fields.push({x,y:floor(x)-8,life:1.2,elapsed:0,pulses:0,spell:{...payload,amount:Math.max(1,Math.round(total/count)),radius:a.radius},color:e.color});}return;
 }
 const count=a.mode==='fan'?3:1;
 for(let i=0;i<count;i++){const angle=Math.atan2(target.y-12-(origin.y-13),target.x-origin.x)+(i-(count-1)/2)*.22;shots.push({x:origin.x,y:origin.y-13,vx:Math.cos(angle)*145,vy:Math.sin(angle)*145,life:3,kind:'spell',color:e.color,spell:{...payload,amount:Math.max(1,Math.round(total/(count===1?1:1.5)))}});}
}
function applyWeaponEffect(target,p){
 const kind=p.kind,physical=['cleave','pierce','stun'].includes(kind),element=physical?'physical':kind==='slow'?'ice':kind==='drain'?'magic':kind;
 if(kind==='poison'){target.poison={source:p.source,time:4,tick:1,amount:Math.max(1,p.amount/4)};return}
 const before=target.hp;damage(target,p.amount,element,true,false,p.source);
 if(kind==='ice')target.frozen=Math.max(target.frozen||0,p.freeze*(target.type==='boss'?.2:1));
 if(kind==='slow'){target.slow=Math.max(target.slow||0,2);target.slowAmount=.2*(target.type==='boss'?.3:1)}
 if(kind==='stun')target.stun=Math.max(target.stun||0,p.stun*(target.type==='boss'?.2:1));
 if(kind==='drain'){const recipient=p.source||p.owner;if(recipient.hp>0)recipient.hp=Math.min(recipient.maxHp,recipient.hp+before-target.hp)}
}
function spellImpact(p,x,y){
 if(p.owner.hp<=0||p.owner.gearRevision!==p.revision)return;
 for(const target of enemies)if(target.hp>0&&Math.hypot(target.x-x,target.y-12-y)<=p.radius&&!terrainHit(x,y,target.x,target.y-12))applyWeaponEffect(target,p);
 flashes.push({x:x-p.radius,y,tx:x+p.radius,ty:y,color:EFFECTS[p.kind].color,life:.3});
}
function activate(h,target,kind,spellAT=null,source=null){sfx('spell',{...(ITEMS[h.weapon]||{}),effect:kind});
 if(kind==='heal'&&ITEMS[h.weapon]?.tier>1){
  const tier=ITEMS[h.weapon].tier,origin=source||h,allies=combatAllies().filter(v=>v.hp>0),weakest=[...allies].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp),center=tier===3?target:tier===5?weakest[0]||origin:origin;
  const chosen=tier===2?weakest.slice(0,1):tier===4?weakest.slice(0,2):allies.filter(v=>Math.hypot(v.x-center.x,v.y-center.y)<(tier===6?160:75));
  for(const v of chosen){const amount=Math.round((tier===2?28:tier===4?20:14)*(1+(tier-1)*.3));v.hp=Math.min(v.maxHp,v.hp+amount);flashes.push({x:origin.x,y:origin.y-12,tx:v.x,ty:v.y-12,color:EFFECTS.heal.color,life:.35});}return;
 }
if(ITEMS[h.weapon]?.ability){weaponSpell(h,target,kind,spellAT,source);return}if(['guard','cleanse','crescendo','restore'].includes(kind)){h.nextNote=kind==='guard'?{barrier:Math.round(12*(ITEMS[h.weapon]?.supportPower||1))}:kind==='cleanse'?{cleanse:true,heal:Math.round(4*((ITEMS[h.weapon]?.supportPower||1)-1))}:kind==='crescendo'?{power:1.5+.1*((ITEMS[h.weapon]?.tier||1)-1)}:{heal:Math.round(12*(ITEMS[h.weapon]?.supportPower||1))};return}const e=EFFECTS[kind],power=h.abilityPower*.65,amount=()=>Math.max(1,Math.round(spellAT===null?roll(e.min,e.max)*power:spellAT/(kind==='fire'?10:kind==='poison'?4:1)));flashes.push({x:h.x,y:h.y-18,tx:target.x,ty:target.y-10,color:e.color,life:.35,kind});
 const near=enemies.filter(v=>v.hp>0&&Math.abs(v.x-target.x)<45);
 if(kind==='fire'){fields.push({source,x:target.x,y:floor(target.x),life:1,elapsed:0,pulses:0,amount:amount(),color:e.color});}
 if(kind==='ice'){for(const v of near){damage(v,amount(),'physical',true,false,source);const duration=controlDuration(h,.7)*(v.type==='boss'?.2:1);v.frozen=Math.max(v.frozen||0,duration);}}
 if(kind==='slow'){for(const v of near){damage(v,amount());v.slow=Math.max(v.slow||0,e.time);v.slowAmount=e.slow*(v.type==='boss'?.3:1)}}
 if(kind==='poison'){if(target.hp>0){target.poison={source,time:4,tick:1,amount:amount()};}}
 if(kind==='lightning'){enemies.filter(v=>v.hp>0&&Math.abs(v.x-target.x)<130).sort((a,b)=>Math.abs(a.x-target.x)-Math.abs(b.x-target.x)).slice(0,3).forEach(v=>{damage(v,amount());flashes.push({x:target.x,y:target.y-15,tx:v.x,ty:v.y-12,color:e.color,life:.35,kind})})}
 if(kind==='heal'){heroes.filter(v=>v.hp>0).forEach(v=>{const n=Math.min(v.maxHp-v.hp,amount());v.hp+=n;float(v.x,v.y-25,'+'+n,e.color)})}
 if(kind==='drain'&&target.hp>0){const n=Math.min(target.hp,amount());damage(target,n,'physical',true,false,source);h.hp=Math.min(h.maxHp,h.hp+n);float(h.x,h.y-25,'+'+n,e.color)}
 if(kind==='stun'){near.forEach(v=>{damage(v,amount());v.stun=Math.max(v.stun||0,controlDuration(h,.6)*(v.type==='boss'?.2:1))})}}
function tickEffects(dt){for(const h of combatAllies())if(h.hp>0&&h.poison){h.poison.time-=dt;h.poison.tick-=dt;if(h.poison.tick<=0){h.poison.tick+=1;damage(h,h.poison.amount,'poison',false,false)}if(h.poison.time<=0)h.poison=null;}flashes.forEach(f=>f.life-=dt);flashes=flashes.filter(f=>f.life>0);for(const f of fields){f.life-=dt;f.elapsed+=dt;if(f.spell){if(!f.pulses&&f.elapsed>=.3){f.pulses=1;spellImpact(f.spell,f.x,f.y)}continue}while(f.pulses<10&&f.pulses*.1<=f.elapsed){f.pulses++;enemies.filter(e=>e.hp>0&&Math.abs(e.x-f.x)<30&&Math.abs(e.y-f.y)<18).forEach(e=>damage(e,f.amount,'fire',false,false,f.source))}}fields=fields.filter(f=>f.life>0);for(const e of enemies){if(e.hp<=0)continue;e.frozen=Math.max(0,(e.frozen||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.stun=Math.max(0,(e.stun||0)-dt);if(e.poison){e.poison.time-=dt;e.poison.tick-=dt;if(e.poison.tick<=0){e.poison.tick+=1;damage(e,e.poison.amount,'poison',false,false,e.poison.source)}if(e.poison.time<=0)e.poison=null}}}
function unlockedNodes(){const set=new Set(['town','a0']);for(const id of completed){set.add(id);for(const next of WORLD.find(n=>n.id===id)?.next||[])set.add(next)}return set}
function panMap(dt){const chart=$('.map-chart');chart.scrollLeft=Math.max(0,Math.min(Math.max(0,(chart.scrollWidth||0)-(chart.clientWidth||0)),(chart.scrollLeft||0)+mapPan*240*dt))}
function openMap(){mapPan=0;if(state==='setup')return;if(['fight','walk','service'].includes(state)){mapReturn=state;release()}state='map';$('#services').hidden=true;$('#service-controls').hidden=true;$('#world').hidden=false;$('#result').hidden=true;renderMap();const chart=$('.map-chart'),node=WORLD.find(n=>n.id===currentNode);chart.scrollLeft=Math.max(0,(node?.x||0)/MAP_WIDTH*(chart.scrollWidth||chart.clientWidth||0)-(chart.clientWidth||0)*.5);refresh();save()}
function renderMap(){
 const unlocked=unlockedNodes(),icons={Fort:'♜',Pyramid:'△',Lighthouse:'♜',Citadel:'♜',Forge:'⚒',Castle:'♜'};
 $('#map-nodes').innerHTML=WORLD.filter(n=>unlocked.has(n.id)).map(n=>'<button class="map-node '+(n.major?'landmark ':'')+(n.kind?'service-node ':'')+(completed.includes(n.id)?'cleared ':'')+'" data-node="'+n.id+'" style="left:'+n.x/MAP_WIDTH*100+'%;top:'+n.y+'%" aria-label="'+n.name+(completed.includes(n.id)?', cleared':', unlocked')+'"><span>'+(n.major?icons[n.name]:n.kind?'◆':'▪')+'</span>'+(n.major||n.kind?'<small>'+n.name+'</small>':'')+'<em>'+n.name+'</em></button>').join('');
 $('#map-art').innerHTML=ZONES.map((z,i)=>{
  const x=i*512,c=z.color;
  const top='M0 45 22 39 47 35 73 31 85 18 115 23 135 16 163 25 190 19 211 30 239 24 269 32 299 20 330 25 353 15 379 22 411 18 435 31 470 25 494 38 512 45',bottom='M512 150 492 156 470 161 437 155 411 168 380 162 351 171 322 158 292 165 260 154 230 164 199 158 165 170 138 161 111 169 85 159 60 169 34 163 14 155 0 150';
  let art='<g transform="translate('+x+' 0)"><path d="'+top+' L512 150 '+bottom.replace('M512 150','L512 150')+' Z" fill="#050805"/><path d="'+top+' '+bottom+(i===0?' M0 45 Q12 94 0 150':'')+(i===ZONES.length-1?' M512 45 Q500 94 512 150':'')+'" fill="none" stroke="'+c+'" stroke-width=".7"/><text x="255" y="11" fill="'+c+'" text-anchor="middle" font-size="8">'+z.name.toUpperCase()+'</text>';
  const lake=i===0||i===2||i===3;
  if(lake){art+='<path d="M232 71 248 60 270 66 281 82 274 104 253 111 236 98 229 82Z" fill="#071b2a" stroke="#357ba0" stroke-width=".7"/>';for(let k=0;k<22;k++){const px=239+(k*13)%33,py=72+Math.floor(k/4)*6;art+='<path d="M'+px+' '+py+'l2 -1 2 1 2 -1" fill="none" stroke="#295c86" stroke-width=".6"/>';}}
  for(let k=0;k<70;k++){
   const px=35+(k*71+i*17)%442,py=37+(k*29)%111;
   if(lake&&px>225&&px<285&&py>58&&py<115)continue;
   if(WORLD.some(n=>n.zone===i&&Math.abs(n.x-x-px)<14&&Math.abs(n.y*1.8-py)<10))continue;
   if(i===0)art+='<path d="M'+px+' '+py+'l3 -6 3 6 -2 0 3 4 -8 0 3 -4Z" fill="none" stroke="#426c25" stroke-width=".6"/>';
   else if(i===1||i===2)art+='<path d="M'+px+' '+py+'q5 -5 11 0m-8 3h7" fill="none" stroke="'+(i===1?'#88703a':'#367275')+'" stroke-width=".6"/>';
   else if(i===3||i===4)art+='<path d="M'+px+' '+py+'l5 -10 6 10m-8 -5 2 1 2 -2" fill="none" stroke="'+(i===3?'#7c98a6':'#9a4932')+'" stroke-width=".7"/>';
   else art+='<path d="M'+px+' '+py+'v-6h2v-3h3v3h2v6m-5 0v-3h2v3" fill="none" stroke="#6b5b7c" stroke-width=".6"/>';
  }
  return art+'</g>';
 }).join('')+'<g id="map-lines">'+WORLD.filter(n=>unlocked.has(n.id)).flatMap(n=>n.next.filter(id=>unlocked.has(id)).map(id=>{const end=WORLD.find(v=>v.id===id);return '<line x1="'+n.x+'" y1="'+n.y*1.8+'" x2="'+end.x+'" y2="'+end.y*1.8+'" stroke="#b1b0a0" stroke-width=".7" stroke-dasharray="1 3"/>'})).join('')+'</g>';
 renderServices();
}
function enterService(id){currentNode=id;mapReturn=null;state='service';paused=false;drag=null;shots=[];minions=[];hazards=[];blasts=[];rituals=[];fields=[];flashes=[];numbers=[];loot=[];enemies=[];potions=[];shopIndex=0;$('#world').hidden=true;$('#result').hidden=true;$('#services').hidden=true;heroes.forEach((h,i)=>{h.x=130+i*20;h.y=226;h.vx=h.vy=h.drive=0;h.strike=null;h.nextNote=null;h.songs={};h.barriers={}});$('#service-controls').hidden=false;$('#inn').hidden=serviceKind(id)!=='town';save();build();tell('Visit the shop, rest at the inn, or open the world map.')}
function travel(id){const node=WORLD.find(n=>n.id===id);if(!node||!unlockedNodes().has(id))return false;if(!node.kind&&heroes.every(h=>h.hp<=0)){tell('Heal at town before travelling.');return false}return changeScene(()=>{pickedSlot=null;if(node.kind)enterService(id);else{stage=0;area=node.area;$('#service-controls').hidden=true;enter()}})}
function tickBossExit(dt){if(stage===stageCount()-1&&!enemies.some(e=>e.type==='boss'&&e.hp>0)){if(bossExitWait===2)sfx('clear');bossExitWait=Math.max(0,bossExitWait-dt);}if(bossExitWait<1e-9)bossExitWait=0}
function stageExitOpen(){return stage<stageCount()-1||bossExitWait<=0&&!enemies.some(e=>e.type==='boss'&&e.hp>0)}
function completeArea(){if(!stageExitOpen())return false;return changeScene(advanceStage)}
function advanceStage(){if(stage<stageCount()-1){stage++;enter();return}const id='a'+area;if(!completed.includes(id))completed.push(id);mapReturn=null;state='map';openMap();tell(area===AREAS.length-1?'The lich king is defeated. His rule is over.':areaInfo().major?'Zone cleared. A new land awaits.':'Boss defeated. New routes discovered.');save()}
function salePrice(id){const w=ITEMS[id];return w?(socketItem(id)?25*w.tier:6+w.tier*12):0}
function shopStock(){const cleared=completed.map(id=>WORLD.find(n=>n.id===id)?.area??-1),highest=Math.max(-1,...cleared);if(serviceKind()==='trader')return Object.values(ITEMS).filter(w=>['rune','gem'].includes(w.type)&&w.tier<=Math.max(1,...cleared.map(a=>a<0?1:areaInfo(a).zone+1)));return Object.values(ITEMS).filter(w=>w.type==='weapon'&&!w.retired&&w.classId===shopClass&&(w.id.endsWith('-basic')||completed.includes('a'+WEAPON_AREAS[w.id])))}
function weaponPrice(index){const early=[100,250,500,750,1000];if(index<5)return early[index];const price=1500+(index-5)*500;return price<=10000?price:10000+(index-22)*1000}
function buyPrice(w){if(w.type==='rune')return 1000*w.tier;if(w.type==='gem')return 500*w.tier;return weaponPrice(w.priceIndex||0)}
function shopPages(){const stock=shopStock();return [...new Set(stock.map(w=>w.level))].sort((a,b)=>a-b).map(tier=>({tier,items:stock.filter(w=>w.level===tier).sort((a,b)=>buyPrice(a)-buyPrice(b))}))}
function renderServices(){if(state!=='service'){$('#services').hidden=true;return}const pages=shopPages();shopIndex=Math.max(0,Math.min(shopIndex,pages.length-1));const page=pages[shopIndex];$('#service-title').textContent=serviceKind()==='town'?'TOWN SHOP':'RUNE TRADER';$('#service-description').textContent='';$('#town-heal').hidden=true;const id=pickedSlot?.type==='bag'?slotItem(pickedSlot):null;$('#sell-item').disabled=!id;$('#sell-item').textContent=id?'Sell '+ITEMS[id].name+' — '+salePrice(id)+' gold':'Select inventory item to sell';$('#shop-classes').hidden=serviceKind()!=='town';$('#shop-classes').innerHTML=classes.map((c,i)=>'<button data-shop-class="'+i+'" class="'+(shopClass===i?'active':'')+'" aria-label="Shop '+c.name+'">'+c.symbol+'</button>').join('');$('#trader-stock').innerHTML=(page?.items||[]).map(w=>'<div class="shop-card"><strong>'+w.name+'</strong><div>'+(socketItem(w.id)?w.description:'AT '+w.min+'–'+w.max+' · AGI '+w.agi.join('–')+'<br>RANGE '+w.range+' · '+(w.effect||'Physical')+(w.arrows?' · '+w.arrows+' arrows':'')+(w.abilityDescription||['ice','slow'].includes(w.effect)||w.classId===6?'<br>'+({line:'Piercing note',cone:'Three-note fan',pulse:'Broad pulse',long:'Long piercing note'}[w.note]||effectText(w)):''))+'</div><button data-buy="'+w.id+'" '+(gold<buyPrice(w)||!inventory.includes(null)?'disabled':'')+'>BUY · '+buyPrice(w)+' gold</button></div>').join('');$('#shop-page').textContent=page?'Tier '+page.tier+' · '+(shopIndex+1)+' / '+pages.length:'No stock';$('#shop-prev').disabled=shopIndex<=0;$('#shop-next').disabled=shopIndex>=pages.length-1}

function innCost(){return Math.ceil(heroes.reduce((sum,h)=>sum+Math.max(0,h.maxHp-h.hp),0)/10)}
function healTown(){if(state!=='service'||serviceKind()!=='town')return false;const cost=innCost();if(gold<cost){tell('The inn costs '+cost+' gold. Sell items at the shop to afford treatment.');return false}gold-=cost;heroes.forEach(h=>h.hp=h.maxHp);save();refresh();tell('The inn restored and revived your party for '+cost+' gold.');return true}
function sellItem(){if(state!=='service'||!serviceKind()||pickedSlot?.type!=='bag')return false;const i=pickedSlot.index,id=inventory[i];if(!id)return false;gold+=salePrice(id);inventory[i]=null;inventoryRunes[i]=[null,null];pickedSlot=null;save();build();renderServices();tell('Sold '+ITEMS[id].name+' with its socketed runes.');return true}
function buyRune(id){const w=shopStock().find(w=>w.id===id),slot=inventory.indexOf(null);if(state!=='service'||!w||gold<buyPrice(w)||slot<0)return false;gold-=buyPrice(w);inventory[slot]=id;inventoryRunes[slot]=[null,null];save();build();renderServices();tell('Bought '+w.name+'.');return true}
function pickPotions(){potions=potions.filter(p=>{const h=heroes.filter(h=>h.hp>0&&h.hp<h.maxHp&&Math.abs(h.x-p.x)<10&&Math.abs(h.y-p.y)<8).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(!h)return true;const heal=Math.min(h.maxHp-h.hp,Math.ceil(h.maxHp*.2));h.hp+=heal;float(h.x,h.y-28,'+'+Math.ceil(heal),'#ff8b97');tell(classes[h.classId].name+' picked up a potion: +'+Math.ceil(heal)+' HP.');save();return false})}
function restoreInfo(){hoverHero=null;inspectingItem=false;$('#character-info').hidden=false;$('#hover-info').hidden=true}
function inspectHero(i){hoverHero=i;inspectingItem=false;$('#character-info').hidden=false;$('#hover-info').hidden=true;refresh()}
function revivalCost(h){return Math.max(Math.ceil(gold*.1),h.level*10)}
function revive(){const h=heroes[selected];if(!h||h.hp>0||state==='setup')return false;const cost=revivalCost(h);if(gold<cost)return false;gold-=cost;h.hp=Math.max(1,Math.ceil(h.maxHp*.1));h.strike=null;h.vx=h.vy=0;h.y=floor(h.x);h.cooldown=.5;if(state==='lost'){state=enemies.some(e=>e.hp>0)?'fight':'walk';paused=false;$('#result').hidden=true}save();build();tell('Revived '+classes[h.classId].name+' for '+cost+' gold.');return true}
function select(i){selected=i;build()}
function manaPercent(h){const w=ITEMS[h.weapon];return ![3,7].includes(h.classId)&&EFFECTS[w?.effect]?Math.min(100,h.mp/mpCost(w)*100):0}
function itemSymbol(item){if(item.type==='rune'){const paths={ward:'M3 3H17V10L10 18 3 10ZM7 7H13V10L10 13 7 10Z',haste:'M3 3L9 10 3 17M10 3L16 10 10 17',might:'M3 17L13 7M8 3L17 12M10 2L18 10M2 13L7 18',reach:'M2 10H18M6 6L2 10 6 14M14 6L18 10 14 14',vitality:'M10 18L2 9V5L5 2 10 6 15 2 18 5V9Z',renewal:'M5 4Q17 0 17 11L14 8M15 16Q3 20 3 9L6 12'};return '<svg class="rune-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="'+paths[item.family||item.id.slice(5)]+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"/></svg>'}return socketItem(item.id)?item.symbol:classes[item.classId].symbol}
function slotMarkup(type,i,id){const w=ITEMS[id],effect=EFFECTS[w?.effect],label=type==='bag'?'Inventory '+(i+1):'Character '+(i+1)+(type==='gear'?' weapon':' socket '+(type==='rune0'?1:2));return '<button class="slot weapon" data-slot="'+type+'" data-index="'+i+'" aria-label="'+label+': '+(w?w.name:'Empty')+'" style="color:'+(w?w.color:'#444')+'">'+(w?'<canvas width="32" height="32" id="icon-'+type+'-'+i+'"></canvas>':'·')+'<small>'+(w?w.level:'')+'</small></button>'}
function build(){
 $('#party').innerHTML=heroes.map((h,i)=>'<button class="slot '+(selected===i?'selected':'')+'" data-hero="'+i+'" aria-label="Select character '+(i+1)+', '+classes[h.classId].name+'"><span class="life"><i style="width:'+h.hp/h.maxHp*100+'%"></i></span><span class="mana" '+(h.classId===3?'hidden':'')+'><i style="width:'+manaPercent(h)+'%"></i></span><canvas width="32" height="36" id="portrait-'+i+'"></canvas><span class="num">'+(i+1)+'</span></button>').join('');
 $('#weapons').innerHTML=heroes.map((h,i)=>slotMarkup('gear',i,h.weapon)).join('');for(let r=0;r<2;r++)$('#runes-'+r).innerHTML=heroes.map((h,i)=>slotMarkup('rune'+r,i,h.runes[r])).join('');$('#items').innerHTML=inventory.map((id,i)=>slotMarkup('bag',i,id)).join('');
 for(const [type,ids] of [['gear',heroes.map(h=>h.weapon)],['bag',inventory],['rune0',heroes.map(h=>h.runes[0])],['rune1',heroes.map(h=>h.runes[1])]])ids.forEach((id,i)=>{const w=ITEMS[id];if(w){const c=$('#icon-'+type+'-'+i).getContext('2d');c.clearRect(0,0,32,32);drawItemIcon(c,w)}});
 heroes.forEach((h,i)=>portrait($('#portrait-'+i).getContext('2d'),h.classId));restoreInfo();refresh();
}
function slotRunes(slot){return slot.type==='bag'?inventoryRunes[slot.index]:slot.type==='gear'?heroes[slot.index].runes:[]}
function inspect(id,runes=[]){
 inspectingItem=true;$('#character-info').hidden=true;$('#hover-info').hidden=false;
 const w=ITEMS[id],e=EFFECTS[w?.effect];$('#item-name').textContent=w?w.name:'Empty slot';
 if(socketItem(id)){$('#item-details').textContent='TYPE '+({gem:'Gem',rune:'Rune',soul:'Soul'}[w.type])+'\nCLASS All\nTIER '+w.tier;$('#item-effect').textContent=w.description;return}
 $('#item-details').textContent=w?'AT '+w.min+'–'+w.max+'\nAGI '+w.agi.join('–')+'\nRANGE '+w.range+'\nTYPE '+(w.effect||'Physical')+(w.summon?'\nSUMMON '+w.summon.kind+' · 15s'+'\nMINION HP '+w.summon.health:w.classId===3?'':'\nMP '+mpCost(w))+'\nCLASS '+classes[w.classId].name+(w.arrows?'\nARROWS '+w.arrows:''):'Drag an item into this slot.';
 $('#item-effect').textContent=e?effectText(w)+([3,6].includes(w.classId)||w.ability?'':' Bonus AT '+e.min+'–'+e.max+'.')+(w.summon?' Every 5 minion attacks.':''):'';if(w?.classId===6)$('#item-effect').textContent=({line:'Piercing note.',cone:'Three-note fan.',pulse:'Broad pulse.',long:'Long piercing note.'}[w.note])+' '+$('#item-effect').textContent;if(w?.type==='weapon'&&runes.some(Boolean))$('#item-effect').textContent+='\n'+runes.filter(Boolean).map(id=>ITEMS[id].name).join(', ');
}
function refresh(){$('#world-button').hidden=state==='service';$('#inn').textContent='INN · Heal '+innCost()+' gold';const h=heroes[hoverHero??selected];if(!h)return;$('#gem-defense').hidden=!h.defense;$('#gem-defense').textContent='DEF +'+h.defense;$('#revive').hidden=h.hp>0||h!==heroes[selected];$('#revive').textContent='Revival $ '+revivalCost(h);$('#revive').disabled=gold<revivalCost(h);$('.stat-columns').hidden=h.hp<=0;$('#class-name').textContent=classes[h.classId].name;$('#lp').textContent=Math.ceil(h.hp)+'/'+h.maxHp;$('#attack').textContent=Math.max(1,Math.round((h.atMin+aura(h).flat)*aura(h).attack))+'–'+Math.max(1,Math.round((h.atMax+aura(h).flat)*aura(h).attack));$('#agi').textContent=effectiveAgi(h).join('–');$('#range').textContent=h.range;$('#level').textContent=h.level;$('#sp').textContent=h.sp;for(const [i,name] of ['str','dex','int'].entries()){$('#'+name).textContent=h[name];const btn=$('[data-stat="'+name+'"]');btn.disabled=h.sp<1;btn.title=STAT_HEHP[h.classId][i];btn.setAttribute('aria-label','Add '+name.toUpperCase()+': '+STAT_HEHP[h.classId][i]);}
 $('[data-stat="lp"]').hidden=h.sp<1||h.hp<=0;$('[data-stat="lp"]').disabled=h.sp<1||h.hp<=0;$('#priest-aura').hidden=![1,4,5,6,7].includes(h.classId);$('#priest-aura').textContent=h.classId===1?'DODGE '+h.dodgeCooldown.toFixed(2)+'s · CRIT '+Math.round(h.crit*100)+'%':h.classId===4?'AURA AT +'+h.str+'% · DEF +'+Number((h.dex*.2).toFixed(1))+'\nRANGE '+h.range+' · nearby allies':h.classId===5?'ON HIT +'+h.dex*.5+' HP':h.classId===6?'NOTES AT +'+h.str+'% · SPEED +'+h.dex+'%\nENEMY AT −'+h.str*.5+' · PHYS +'+h.dex*.25:h.classId===7?'SUMMON '+summonInterval(h).toFixed(2)+'s · MINION HP '+summonHealth(h):'';
 $('#stat-help').textContent='STR: '+STAT_HEHP[h.classId][0]+' | DEX: '+STAT_HEHP[h.classId][1]+' | INT: '+STAT_HEHP[h.classId][2];
 $('#dodge-meter').hidden=h.classId!==1;$('#dodge-fill').style.width=(h.hp>0?Math.max(0,1-(h.dodgeLeft||0)/(h.dodgeCooldown||1))*100:0)+'%';$('#dodge-state').textContent=(h.dodgeLeft||0)>0?h.dodgeLeft.toFixed(1)+'s':'READY';
 const w=ITEMS[h.weapon],e=EFFECTS[w?.effect];$('.mp-line').hidden=$('.mp-bar').hidden=h.classId===3;$('#mp-hint').hidden=h.classId===3;$('#mp').textContent=[3,7].includes(h.classId)?'—':e?h.mp+'/'+mpCost(w):'—';$('#mp-fill').style.width=e&&![3,7].includes(h.classId)?h.mp/mpCost(w)*100+'%':'0%';$('#mp-hint').textContent=h.classId===7?(w?.summon?.kind||'No grimoire'):e?(h.int?Math.ceil((mpCost(w)-h.mp)/h.int)+' hits to '+e.name:'Spend a point in INT to charge '+e.name):w?'Physical weapon':'Unarmed';
 $('#xp').textContent=Math.floor(h.xp)+'/'+needed(h.level);$('#xp-fill').style.width=h.xp/needed(h.level)*100+'%';$('#gold').textContent=gold;$('#area').textContent=state==='map'?'World Map':state==='service'?(serviceKind()==='town'?'Town':'Rune Trader'):WORLD.find(n=>n.id==='a'+area).name+' : '+(stage+1)+'/'+stageCount()+(stage===stageCount()-1?' BOSS':'');$('#pause').textContent=paused?'Resume':'Pause';heroes.forEach((h,i)=>{const bar=$('[data-hero="'+i+'"] .life i');if(bar)bar.style.width=Math.max(0,h.hp/h.maxHp)*100+'%';const mpBar=$('[data-hero="'+i+'"] .mana i');if(mpBar)mpBar.style.width=manaPercent(h)+'%'});}
function update(dt){if(settingsOpen||menuOpen)return;time+=dt;for(const h of heroes)if(h.hp>0)h.dodgeLeft=Math.max(0,(h.dodgeLeft||0)-dt);if(drag)stepHeld(drag,dt);tickNumbers(dt);if(state==='service'){heroes.forEach(h=>tickRogueArms(h,dt));if(heroes.some(h=>h.hp>0&&h.x+6>=538&&h.x-6<=572&&h.y>=207&&h.y-27<=226)){changeScene(openMap);return}for(const h of heroes)if(h.hp>0&&h!==drag){h.drive=0;stepBody(h,dt)}uiTime+=dt;if(uiTime>.1){refresh();uiTime=0}return}if(state!=='fight'&&state!=='walk')return;tickEffects(dt);tickMinions(dt);
 for(const h of heroes){tickRogueArms(h,dt);h.auraFlash=Math.max(0,(h.auraFlash||0)-dt);h.flash=Math.max(0,(h.flash||0)-dt);h.anim=Math.max(0,h.anim-dt);resolveStrike(h,dt);if(h.hp<=0||h===drag)continue;stepBody(h,dt);h.hp=Math.min(h.maxHp,h.hp+h.runeBonus.regen*dt);h.cooldown-=dt;h.hold=Math.max(0,h.hold-dt);h.walk=false;if(!grounded(h)){h.strike=null;continue}if(state==='walk'){h.drive=0;continue}
 const target=enemies.filter(e=>e.hp>0).sort((a,b)=>h.kind==='melee'?meleeDistance(h,a)-meleeDistance(h,b):Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];if(!target)continue;if(h.classId===7){h.face=target.x>=h.x?1:-1;h.drive=canAutoMove(h)&&Math.abs(target.x-h.x)>h.range&&h.hold<=0?h.face*33:0;h.walk=!!h.drive;continue}const d=h.kind==='melee'?meleeDistance(h,target):Math.hypot(target.x-h.x,target.y-h.y);if(h.kind==='melee'&&d<=h.range){h.drive=0;if((h.vx||0)*Math.sign(target.x-h.x)>0)h.vx=0;}h.face=target.x>=h.x?1:-1;if(canAutoMove(h)&&d>h.range&&h.hold<=0){h.drive=h.face*33;h.walk=true}if(d<=h.range+3&&(h.kind==='aura'||Math.abs(h.y-target.y)<45)&&h.cooldown<=0){h.cooldown=roll(...effectiveAgi(h))/30;attackMotion(h);const token=attackToken(h),amount=basicAmount(h);if(h.kind==='aura'){for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-h.x,e.y-h.y)<=h.range)basicHit(e,amount,token);h.auraFlash=.25}else if(h.kind==='melee')h.strike={left:.09,target,amount,token,range:h.range,elapsed:0,hits:new Set(),face:h.face};else shoot(h,target,h.kind==='heal'?'magic':h.kind,amount,token)}}
 const additions=[];for(const e of enemies){if(e.hp<=0||e.frozen>0||e.stun>0)continue;tickSlash(e,dt);e.flash=Math.max(0,e.flash-dt);if(!physicalEnemy(e))moveEnemy(e,(e.kick||0)*dt,dt);e.kick=(e.kick||0)*Math.exp(-9*dt);e.cooldown-=dt;if(e.type==='summoner'){e.summon-=dt;if(e.summon<=0&&e.remaining>0){const m=enemy(enemySummonType(e),Math.max(130,e.x-20));m.minion=true;m.hp=m.maxHp*=.55;additions.push(m);sfx('summon',{kind:'enemy'});e.remaining--;e.summon=8;}}const target=combatAllies().filter(h=>h.hp>0).sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];if(!target)continue;if(physicalEnemy(e))stepEnemyPhysics(e,target,dt);tickCatapult(e,target,dt);enemyTrait(e,target,dt);tickSpecial(e,target,dt);const d=Math.abs(target.x-e.x);if(e.attackProfile){if(d>enemyApproachRange(e)&&!physicalEnemy(e))moveEnemy(e,Math.sign(target.x-e.x)*e.speed*slowFactor(e)*dt,0);tickProfileAttack(e,target,dt);continue}if(e.type==='archer'&&d<65)moveEnemy(e,-Math.sign(target.x-e.x)*e.speed*dt,0);else if(d>enemyApproachRange(e)&&!physicalEnemy(e))moveEnemy(e,Math.sign(target.x-e.x)*e.speed*(slowFactor(e))*dt,0);else if(d<=enemyApproachRange(e)&&e.type!=='bomber'&&e.type!=='catapult'&&e.cooldown<=0&&Math.abs(target.y-e.y)<(e.range>50?50:18)){e.cooldown=e.type==='boss'?1.2:1.4;if(e.type==='slasher'){e.slash={left:.18,face:Math.sign(target.x-e.x)||1,hit:false,life:.32};e.cooldown=1.6}else if(e.type==='archer')launchHazard(e,target,'arrow',0,enemyDamage(e));else if(e.range>20)shoot(e,target,'enemy',enemyDamage(e));else damage(target,enemyDamage(e),'physical',true,true)}}enemies.push(...additions);
 tickShots(dt);tickBossExit(dt/speed);enemies=enemies.filter(e=>e.hp>0);tickHazards(dt);pickLoot();pickPotions();
 if(!sceneFade&&heroes.every(h=>h.hp<=0)){heroes.forEach(h=>h.hp=Math.max(1,Math.ceil(h.maxHp*.05)));enterService(townForArea());tell('Party defeated. Returned to town with 5% HP.');return}
 if(!enemies.length&&state==='fight'){state='walk';heroes.forEach(h=>{h.drive=0;h.strike=null;if(grounded(h))h.vx=0});tell('STAGE CLEAR — move one character to the NEXT sign.');save()}
 if(stageExitOpen()&&heroes.some(h=>h.hp>0&&h.x+6>=543&&h.x-6<=574&&h.y>=205&&h.y-27<=226)){completeArea();return}
 saveTime+=dt;if(saveTime>=1){save();saveTime=0}uiTime+=dt;if(uiTime>.1){refresh();uiTime=0}}
function line(c,points,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x)+.5,Math.round(y)+.5):c.moveTo(Math.round(x)+.5,Math.round(y)+.5));c.stroke()}
function grounded(h){return h!==drag&&h.y>=floor(h.x)-.5&&Math.abs(h.vy||0)<1}
function springPose(h,dt){h.crouchV=(h.crouchV||0)+(-(h.crouch||0)*180-(h.crouchV||0)*17)*dt;h.crouch=Math.max(0,Math.min(7,(h.crouch||0)+h.crouchV*dt))}
function stepHeld(h,dt){if(!h.dragTarget)return;const target=h.dragTarget,boost=Math.min(12,(h.cursorSpeed||0)/200),stiffness=110*(1+boost),damping=15*Math.sqrt(1+boost),limit=420+boost*180;h.cursorSpeed=(h.cursorSpeed||0)*Math.exp(-5*dt);h.vx=(h.vx||0)+((target.x-h.x)*stiffness-(h.vx||0)*damping)*dt;h.vy=(h.vy||0)+((target.y-h.y)*stiffness-(h.vy||0)*damping+100)*dt;h.vx=Math.max(-limit,Math.min(limit,h.vx));h.vy=Math.max(-limit-60,Math.min(limit+60,h.vy));h.x=Math.max(8,Math.min(567,h.x+h.vx*dt));h.y=Math.max(8,Math.min(floor(h.x),h.y+h.vy*dt));collideRoof(h);h.leanV=(h.leanV||0)+((h.vx*.06-(h.lean||0))*70-(h.leanV||0)*8)*dt;h.lean=(h.lean||0)+h.leanV*dt;h.swingV=(h.swingV||0)+(-h.swing*70-(h.swingV||0)*7-h.vx*.15)*dt;if(!Number.isFinite(h.swingV))h.swingV=0;h.swing=(h.swing||0)+h.swingV*dt;springPose(h,dt)}
function moveEnemy(e,dx,dt){const nx=Math.max(8,Math.min(569,e.x+dx));e.vy=e.vy||0;if(floor(nx)<e.y-.5&&e.y>=floor(e.x)-.5){e.vy=-Math.sqrt(2*390*(e.y-floor(nx)+3))}else if(floor(nx)>=e.y-.5)e.x=nx;e.vy+=390*dt;e.y+=e.vy*dt;if(e.y>=floor(e.x)&&e.vy>=0){e.y=floor(e.x);e.vy=0}collideRoof(e,e.type==='boss'?65:32)}
function stepBody(h,dt){springPose(h,dt);
 h.vx=Number.isFinite(h.vx)?h.vx:0;h.drive=h.drive||0;h.lean=h.lean||0;h.leanV=h.leanV||0;h.swing=h.swing||0;h.swingV=h.swingV||0;h.gait=h.gait||0;
 const grounded=h.y>=floor(h.x)-.5,oldV=h.vx;
 if(grounded)h.vx+=(h.drive-h.vx)*(1-Math.exp(-9*dt));else h.vx*=Math.exp(-.35*dt);
 let nx=h.x+h.vx*dt;if(floor(nx)<h.y-.5){if(grounded)h.vy=-Math.sqrt(2*390*(h.y-floor(nx)+3));nx=h.x}
 h.x=Math.max(8,Math.min(568,nx));h.vy+=390*dt;h.y+=h.vy*dt;
 if(h.y>=floor(h.x)){if(h.vy>80){h.leanV+=Math.sign(h.vx||1)*h.vy*.012;h.crouch=Math.min(7,h.vy*.018);h.crouchV=15;h.swingV+=(h.face||1)*h.vy*.025}h.y=floor(h.x);h.vy=0}
 collideRoof(h);
 const targetLean=h.vx*.035+(h.vx-oldV)*.045;
 h.leanV+=((targetLean-h.lean)*95-h.leanV*16)*dt;h.lean+=h.leanV*dt;
 h.swingV+=(-h.swing*115-h.swingV*9)*dt;h.swing+=h.swingV*dt;
 if(grounded)h.gait+=Math.abs(h.vx)*dt*.25;h.drive=0;
}

function tickRogueArms(h,dt){
 if(h.classId!==1)return;h.daggerArms=h.daggerArms||[{angle:0,velocity:0},{angle:0,velocity:0}];
 h.daggerArms.forEach((a,i)=>{const motion=Math.sin(time*7+i*2.5+h.id)*Math.min(1,Math.abs(h.vx||0)/25)+(h.vy||0)*.008;a.velocity+=(-a.angle*95-a.velocity*9+motion*16)*dt;a.angle+=a.velocity*dt;});
}
function rogueHands(h,shoulder,moving=0,air=0){
 return [0,1].map(i=>{const side=i===0?1:-1,a=(h.daggerArms?.[i]?.angle||0)+Math.sin(time*5+i*2.1+h.id)*(moving*.4+air*.7),f=h.face||1;return {angle:a,hand:[shoulder[0]+f*(side*5+Math.sin(a)*7),shoulder[1]+8-Math.cos(a)*3]};});
}

function attackMotion(h){if(h.kind==='melee'||h.classId===4)sfx('weapon',ITEMS[h.weapon]||{classId:h.classId});if(h.classId===1){h.daggerArms=h.daggerArms||[{angle:0,velocity:0},{angle:0,velocity:0}];h.attackHand=h.attackHand===0?1:0;const a=h.daggerArms[h.attackHand];a.angle=-.8;a.velocity=38;}h.anim=.38;h.swing=-.8;h.swingV=48;h.leanV+=(h.face||1)*25;if(h.kind!=='melee')h.vx=(h.vx||0)-(h.face||1)*9}

function combatAllies(){return [...heroes,...minions.filter(m=>m.owner.hp>0)]}
function summonInterval(h){const w=ITEMS[h.weapon];return w?(w.agi[0]+w.agi[1])/60/(1+h.int*.02)/(1+h.runeBonus.haste)/(1+songTotal(h,'haste')):Infinity}
function summonHealth(h){const gem=h.summonGems||{},bonus=h.summonBonuses||{};return Math.round(((ITEMS[h.weapon]?.summon?.health||0)*(1+(h.dex+(gem.dex||0))*.1)+(gem.lp||0))*(1+(bonus.hpBonus||0)))}
function tickMinions(dt){
 for(const m of minions)m.life-=dt;
 minions=minions.filter(m=>m.life>0&&m.hp>0&&heroes.includes(m.owner)&&m.owner.hp>0&&m.weapon===m.owner.weapon&&m.revision===m.owner.gearRevision);
 for(const h of heroes.filter(h=>h.classId===7)){
  const w=ITEMS[h.weapon],spec=w?.summon;if(h.hp<=0||!spec)continue;
  for(const m of minions.filter(m=>m.owner===h)){const max=summonHealth(h);m.hp=Math.min(max,m.hp);m.maxHp=max;m.runeBonus={...h.summonBonuses};m.defense=h.summonGems?.defense||0;m.hp=Math.min(max,m.hp+(m.runeBonus.regen||0)*dt);m.range=(m.kind==='spirit'?65:15)+(m.runeBonus.rangeBonus||0)}
  if(h.summonRevision!==h.gearRevision){h.summonRevision=h.gearRevision;h.summonProgress=0}
  h.summonProgress=Math.min(1,(h.summonProgress||0)+dt/(h.firstSummon?1:summonInterval(h)));
  if(h.summonProgress>=1&&grounded(h)&&h!==drag){
   sfx('summon',{kind:spec.kind});const maxHp=summonHealth(h);minions.push({owner:h,weapon:h.weapon,revision:h.gearRevision,x:h.x,y:h.y,hp:maxHp,maxHp,runeBonus:{...h.summonBonuses},defense:h.summonGems?.defense||0,kind:spec.kind,life:15,vy:0,vx:0,cooldown:.5,range:(spec.kind==='spirit'?65:15)+(h.summonBonuses?.rangeBonus||0),hits:0});h.firstSummon=false;h.summonProgress=0;
  }
 }
 for(const m of minions){
  const h=m.owner,w=ITEMS[h.weapon],spec=w.summon;
  if(m.hp<=0)continue;
  m.cooldown-=dt;
  if(m.attack){m.moving=0;tickMinionAttack(m,dt);continue}
  const target=enemies.filter(e=>e.hp>0&&Math.abs(e.x-h.x)<150).sort((a,b)=>Math.abs(a.x-m.x)-Math.abs(b.x-m.x))[0];
  const following=h===drag||!grounded(h)||Math.abs(m.x-h.x)>150||!target;
  const goal=following?h:target,dist=Math.abs(goal.x-m.x);
  m.face=Math.sign(goal.x-m.x)||m.face||1;
  const oldX=m.x;moveEnemy(m,dist>(following?18:m.range)?Math.sign(goal.x-m.x)*38*dt:0,dt);
  m.moving=Math.min(1,Math.abs(m.x-oldX)/Math.max(.001,dt)/38);m.gait=(m.gait||0)+Math.abs(m.x-oldX)*(m.kind==='golem'?.18:.3);
  if(following||m.y<floor(m.x)-.5||dist>m.range||Math.abs(m.y-target.y)>35||m.cooldown>0)continue;
  m.cooldown=spec.attackInterval/(1+(h.summonGems?.int||0)*.02)/(1+m.runeBonus.haste+songTotal(m,'haste'));
  m.attack={target,elapsed:0,impact:m.kind==='golem'?.22:.12,duration:m.kind==='golem'?.55:.38,face:m.face,hit:false};

 }
}
function tickMinionAttack(m,dt){
 const a=m.attack;if(!a)return;
 if(m.owner===drag||!grounded(m.owner)||m.y<floor(m.x)-.5){m.attack=null;return}
 a.elapsed+=dt;
 if(!a.hit&&a.elapsed>=a.impact){
  a.hit=true;const target=a.target,h=m.owner,w=ITEMS[m.weapon];
  if(target.hp>0&&Math.abs(target.x-m.x)<=m.range+3&&Math.abs(target.y-m.y)<=25&&(target.x-m.x)*a.face>=-3){
   const amount=Math.max(1,Math.round(roll(h.atMin,h.atMax)*w.summon.damage*(1+(h.summonGems?.str||0)*.1)*(1+m.runeBonus.damageBonus)*(1+songTotal(m,'attack'))));
   if(m.kind==='spirit'){shoot(m,target,'magic',amount);const s=shots[shots.length-1];s.summonOwner=h;s.summonRevision=m.revision;s.summonSource=m}else damage(target,amount+songTotal(target,'vulnerability'),'physical',true,false,m);
   m.hits++;if(w.effect&&m.hits>=5){m.hits-=5;activate(h,target,w.effect,null,m)}
  }
 }
 if(a.elapsed>=a.duration)m.attack=null;
}
function drawMinions(){
 for(const m of minions){if(m.hp<=0)continue;const x=m.x,y=m.y,c=ITEMS[m.weapon].color,a=m.attack,f=a?.face||m.face||1;
  const gait=m.gait||0,walking=a?0:(m.moving||0),stride=Math.sin(gait)*4*walking,bob=Math.abs(Math.cos(gait))*walking*(m.kind==='golem'?1.2:1.8);
  const wind=a?Math.min(1,a.elapsed/a.impact):0,recover=a?Math.max(0,(a.elapsed-a.impact)/(a.duration-a.impact)):0;
  const swing=a?(a.elapsed<a.impact?-Math.sin(wind*Math.PI)*.5+wind:1-recover):0;
  ctx.strokeStyle=c;ctx.fillStyle=c;
  if(m.kind==='spirit'){
   const sx=x+f*swing*4,sy=y-10+Math.sin(time*4+m.owner.id+m.life)*1.5-bob-(a?Math.sin(wind*Math.PI)*2:0);
   ctx.beginPath();ctx.ellipse(sx,sy,4+swing*2,4-swing,0,0,Math.PI*2);ctx.stroke();
   line(ctx,[[sx-4,sy+2],[sx-2-f*swing*3,sy+8],[sx+2,sy+5],[sx+4,sy+8]],c);
   if(a&&!a.hit){ctx.fillRect(sx+f*6,sy-1,2+wind*2,2+wind*2)}
  }else if(m.kind==='golem'){
   const lean=f*swing*3+stride*.2;ctx.strokeRect(x-7+lean,y-18-bob,14,12);ctx.strokeRect(x-4+lean,y-24-bob+swing*2,8,6);
   for(const side of [-1,1]){const step=stride*side,lift=Math.max(0,Math.cos(gait+(side===1?Math.PI:0)))*3*walking;line(ctx,[[x+side*4,y-6-bob],[x+side*5+step*.5,y-3-lift],[x+side*5+step,y-lift],[x+side*5+step+f*3,y-lift]],c)}
   const fist=[x+f*(9+swing*9)+stride*.5,y-12-swing*1-bob];line(ctx,[[x+lean+f*6,y-17],[x+f*10,y-18-swing*4],fist],c);ctx.strokeRect(fist[0]-3,fist[1]-3,6,6);
   line(ctx,[[x+lean-f*6,y-17],[x-f*10,y-10],[x-f*8,y-6]],c);
  }else{
   const lean=f*swing*2+stride*.12;ctx.strokeRect(x-3+lean,y-20-bob,6,5);line(ctx,[[x+lean,y-15-bob],[x,y-6-bob]],c);for(const side of [-1,1]){const step=stride*side,lift=Math.max(0,Math.cos(gait+(side===1?Math.PI:0)))*3*walking;line(ctx,[[x,y-6-bob],[x+side*2+step*.5,y-3-lift],[x+side*3+step,y-lift]],c)}
   const hand=[x+f*(5+swing*6)-stride*.55,y-11-swing*2-bob];
   line(ctx,[[x+lean,y-13],[x+f*3,y-8],hand],c);line(ctx,[[x+lean,y-13],[x-f*5,y-10],[x-f*3,y-6]],c);
   const angle=-1.4+swing*1.4;line(ctx,[hand,[hand[0]+f*Math.cos(angle)*8,hand[1]+Math.sin(angle)*8]],'#ddd');
   line(ctx,[[hand[0]-f,hand[1]-2],[hand[0]+f,hand[1]+2]],'#b99558');
  }
  ctx.fillStyle='#34503e';ctx.fillRect(x-6,y-29,12,2);ctx.fillStyle='#82cd98';ctx.fillRect(x-6,y-29,12*m.hp/m.maxHp,2);
 }
}
function shootNote(h,target,amount,attack){sfx('weapon',ITEMS[h.weapon]);
 const angle=Math.atan2(target.y-12-(h.y-13),target.x-h.x),pattern=ITEMS[h.weapon]?.note||'line',mod=h.nextNote||{};h.nextNote=null;
 attack.noteAllies=new Set();const velocity=pattern==='pulse'?110:160,distance=Math.min(h.range,Math.hypot(target.x-h.x,target.y-h.y))+35;
 for(const spread of pattern==='cone'?[-.22,0,.22]:[0])shots.push({x:h.x,y:h.y-13,vx:Math.cos(angle+spread)*velocity,vy:Math.sin(angle+spread)*velocity,kind:'note',amount:amount*(pattern==='cone'?.65:1),attack,mod,life:distance/velocity,hitSet:new Set(),radius:pattern==='pulse'?15:0});
}

// Body bounds exclude decorative limbs, weapons and wings.
function enemyBodyBounds(e){
 const shapes={knight:[10,34],giant:[10,34],construct:[10,34],lich:[12,34],kraken:[13,43],moth:[4,18],plant:[10,27],mushroom:[17,30],acorn:[9,23],mimic:[12,25],mantis:[5,29],tree:[9,38],crystal:[11,30],worm:[16,11],eye:[13,24],snail:[12,26],urchin:[12,28],wheel:[12,28],maw:[16,23],scorpion:[9,14],cactus:[7,31],urn:[12,26],scarab:[11,24],crab:[11,17],ray:[16,20],bell:[12,26],imp:[7,25],ram:[13,20],golem:[13,35],bird:[7,29],puppet:[6,30],jelly:[13,27],obelisk:[8,39]};
 const base={spider:[7,14],roller:[9,18],flyer:[4,16],catapult:[12,20],swarmling:[4,8],beetle:[11,22],summoner:[9,25],shaman:[7,25],archer:[4,24],boss:[17,34]};
 const [width,height]=shapes[e.shape]||base[e.type]||[7,14],scale=e.shape&&e.type==='boss'&&!e.swarmBoss?1.65:1;
 return {left:e.x-width*scale,right:e.x+width*scale,top:e.y-height*scale,bottom:e.y};
}
function meleeContact(h,e){const b=enemyBodyBounds(e);return {x:Math.max(b.left,Math.min(b.right,h.x)),y:Math.max(b.top,Math.min(b.bottom,h.y-13))}}
function meleeDistance(h,e){const p=meleeContact(h,e);return Math.hypot(p.x-h.x,p.y-(h.y-13))}
function bladeHitsEnemy(a,b,e){
 const box=enemyBodyBounds(e),dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;
 for(const [p,q] of [[-dx,a[0]-box.left],[dx,box.right-a[0]],[-dy,a[1]-box.top],[dy,box.bottom-a[1]]]){
  if(Math.abs(p)<1e-9){if(q<0)return false;continue}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;
 }return true;
}
function meleeReach(h){return Math.max(8,h.range||ITEMS[h.weapon]?.range||14)}
function swingSegments(h,t){
 const a=-1.7+Math.min(1,Math.max(0,t)/.28)*3.1,f=h.strike?.face||h.face||1,length=Math.max(12,(h.strike?.range||h.range)-6),base=[h.x+f*6,h.y-13],tip=[base[0]+f*Math.cos(a)*length,base[1]+Math.sin(a)*length];
 if(h.classId===5){const end=[tip[0]+f*Math.cos(a+1.4)*13*meleeReach(h)/42,tip[1]+Math.sin(a+1.4)*13*meleeReach(h)/42];return [[base,tip],[tip,end]]}
 return [[base,tip]];
}
function resolveStrike(h,dt){
 const s=h.strike;if(!s)return;
 if(h.hp<=0||h===drag||!grounded(h)){h.strike=null;return}
 if(h.classId===1){s.left-=dt;if(s.left>0)return;h.strike=null;const e=s.target,p=meleeContact(h,e);if(e.hp>0&&meleeDistance(h,e)<=s.range+3&&!terrainHit(h.x,h.y-13,p.x,p.y)){basicHit(e,s.amount,s.token);e.kick=(e.kick||0)+(h.face||1)*35}return}
 if(h.classId!==0&&h.classId!==5){s.left-=dt;if(s.left>0)return;h.strike=null;const e=s.target;if(e.hp>0&&Math.abs(e.x-h.x)<=s.range+10&&Math.abs(e.y-h.y)<40){basicHit(e,s.amount,s.token);e.kick=(e.kick||0)+(h.face||1)*35}return}
 const before=s.elapsed||0;s.elapsed=before+dt;s.hits=s.hits||new Set();
 for(let t=before;t<=Math.min(.28,s.elapsed)+.00001;t+=Math.min(.008,dt||.008)){
  for(const [a,b] of swingSegments(h,t))for(const e of enemies){
   if(e.hp<=0||s.hits.has(e)||!bladeHitsEnemy(a,b,e))continue;
   const wall=terrainHit(...a,...b);if(wall&&!bladeHitsEnemy(a,[wall.x,wall.y],e))continue;
   s.hits.add(e);basicHit(e,s.amount,s.token);e.kick=(e.kick||0)+(s.face||h.face||1)*35;
  }
 }
 if(s.elapsed>=.28)h.strike=null;
}

function knee(a,b,bend){const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(1,Math.hypot(dx,dy)),offset=Math.sqrt(Math.max(0,7*7-length*length/4))*bend;return [(a[0]+b[0])/2-dy/length*offset,(a[1]+b[1])/2+dx/length*offset]}
function stick(c,h,mark){
 c.save();c.translate(h.x,h.y);if(h.hp<=0){c.rotate(-Math.PI/2);c.globalAlpha=.4}
 const col=h.flash?'#fff':h.color,f=h.face||1,g=h.gait||0,moving=Math.min(1,Math.abs(h.vx||0)/25),air=Math.min(1,Math.max(Math.abs(h.vy||0)/100,(floor(h.x)-h.y)/35)),lean=h.lean||0,swing=h.swing||0;
 const idle=h.hp>0&&!h.strike?(1-moving)*(1-air):0,breath=Math.sin(time*2+h.id*1.7)*.45*idle;
 const bob=Math.abs(Math.sin(g))*1.8*moving-(h.crouch||0)+breath,hip=[lean*.25,-10-bob],shoulder=[lean,-18-bob];
 for(const side of [-1,1]){const phase=g+(side===1?Math.PI:0),foot=[side*2-Math.cos(phase)*5*moving*Math.sign(h.vx||f)-f*air*3,-Math.max(0,Math.sin(phase))*4*moving-air*3];line(c,[hip,knee(hip,foot,-f),foot],col)}
 line(c,[hip,shoulder],col);if(h.classId===0)line(c,[[shoulder[0]-5,shoulder[1]+1],[shoulder[0]+5,shoulder[1]+1]],'#a8adb5');c.strokeStyle=col;c.strokeRect(shoulder[0]-3,shoulder[1]-7,6,6);
 if([1,5,7].includes(h.classId))line(c,[[shoulder[0]-4,shoulder[1]-1],[shoulder[0]-4,shoulder[1]-8],[shoulder[0],shoulder[1]-11],[shoulder[0]+4,shoulder[1]-8],[shoulder[0]+4,shoulder[1]-1]],col);if(h.classId===3)line(c,[[shoulder[0]-6,shoulder[1]-6],[shoulder[0]+1,shoulder[1]-16],[shoulder[0]+5,shoulder[1]-6],[shoulder[0]-6,shoulder[1]-6]],col);
 const wobble=(Math.sin(time*5.3+h.id*2.7)+Math.sin(time*8.1+h.id))*.65*moving+Math.sin(time*4+h.id)*air*.7,arm=swing+wobble+Math.sin(time*1.7+h.id*2.3)*.055*idle;
 const hand=[shoulder[0]+f*(6+Math.sin(arm)*5),shoulder[1]+5-Math.sin(arm)*5];
 if(h.classId===1){for(const pose of rogueHands(h,shoulder,moving,air)){line(c,[shoulder,knee(shoulder,pose.hand,-f),pose.hand],col);if(h.weapon)drawWeapon(c,1,pose.hand,f,pose.angle,ITEMS[h.weapon]?.color||'#ddd','lute',meleeReach(h))}}else{line(c,[shoulder,knee(shoulder,hand,-f),hand],col);line(c,[shoulder,[shoulder[0]-f*(4+Math.sin(arm)*3),-13-bob],[shoulder[0]-f*(5+Math.sin(arm)*4),-9-bob+Math.cos(arm)*moving*3]],col);
 if(h.weapon){if(h.strike&&[0,5].includes(h.classId)){const segments=swingSegments(h,h.strike.elapsed||0);for(const points of segments)line(c,points.map(p=>[p[0]-h.x,p[1]-h.y]),ITEMS[h.weapon]?.color||'#ddd');line(c,[shoulder,[f*6,-13]],col)}else drawWeapon(c,h.classId,hand,f,arm,ITEMS[h.weapon]?.color||'#ddd',ITEMS[h.weapon]?.instrument,meleeReach(h));}
 }
 if(mark&&h.hp>0){c.fillStyle='#fff';c.fillRect(-1,-35,3,2)}c.restore();
}

function drawWeapon(c,id,hand,f,arm,color,instrument='lute',reach=({0:30,1:14,5:42}[id]||14)){c.save();c.translate(hand[0],hand[1]);c.scale(f,1);c.strokeStyle=color;c.fillStyle=color;
 if(id===0){c.rotate(arm*.95);line(c,[[0,3],[0,-(reach-9)],[2,-(reach-6)],[3,-(reach-9)],[2,3]],color);line(c,[[-4,-1],[5,-1]],'#c9a459');line(c,[[1,0],[1,5]],'#aa7848')}
 if(id===1){c.rotate(arm*.7);line(c,[[0,3],[0,-(reach-7)],[2,-(reach-4)],[3,-(reach-7)],[2,3]],color)}
 if(id===2){line(c,[[-5,-10],[-1,-6],[0,0],[-1,6],[-5,10]],color);line(c,[[-5,-10],[-6-Math.max(0,arm)*2,0],[-5,10]],'#a7a7a7');line(c,[[-4,0],[10,0],[7,-2]],'#eee')}
 if(id===3){line(c,[[0,12],[0,-7]],'#b18e60');c.strokeStyle=color;c.beginPath();c.arc(0,-10,4,0,Math.PI*2);c.stroke()}
 if(id===4){line(c,[[0,0],[0,-4]],'#c6a06a');line(c,[[-5,-8],[0,-13],[5,-8],[0,-3],[-5,-8]],color);line(c,[[0,-11],[0,-5]],'#fff');line(c,[[-3,-8],[3,-8]],'#fff')}
 if(id===5){c.rotate(arm*.7);line(c,[[0,10],[0,-(reach-6)]],'#bd965e');line(c,[[0,-(reach-6)],[9*reach/42,-(reach-8)],[16*reach/42,-(reach-15)],[7*reach/42,-(reach-11)],[0,-(reach-11)]],color)}
 if(id===6){
 if(instrument==='harp'){line(c,[[-6,5],[-6,-10],[7,-15],[4,5],[-6,5]],color);for(let x=-3;x<=3;x+=3)line(c,[[x,3],[x,-10-x*.4]],'#ddd')}
 else if(instrument==='horn'){line(c,[[0,0],[7,-2],[15,-9],[15,7],[7,2],[0,0]],color);line(c,[[15,-9],[15,7]],'#edc684')}
 else if(instrument==='flute'){line(c,[[-3,0],[16,-7],[17,-5],[-2,2],[-3,0]],color);for(let x=3;x<13;x+=3)c.fillRect(x,-x*.4,1,1)}
 else{c.beginPath();c.ellipse(0,0,5,7,.4,0,Math.PI*2);c.stroke();line(c,[[1,-4],[6,-15],[8,-14],[3,-3]],'#bd965e');line(c,[[0,4],[6,-13]],color)}
 }
 if(id===7){line(c,[[-7,-8],[0,-6],[7,-8],[7,2],[0,4],[-7,2],[-7,-8]],color);line(c,[[0,-6],[0,4]],'#b99558');line(c,[[-5,-4],[-2,-3]],'#eee');line(c,[[2,-3],[5,-4]],'#eee')}
 c.restore()}

function drawItemIcon(c,w){
 c.save();c.strokeStyle=w.color;c.fillStyle=w.color;c.lineWidth=1.5;
 if(w.type==='weapon'){
  if(w.classId===5){c.translate(10,23);c.scale(.55,.55);drawWeapon(c,5,[0,0],1,0,w.color)}
  else if(w.classId===0){c.translate(15,23);c.scale(.85,.85);drawWeapon(c,0,[0,0],1,0,w.color)}
  else drawWeapon(c,w.classId,w.classId===6?[12,19]:w.classId===7?[16,18]:[14,17],1,0,w.color,w.instrument);
 }else if(w.type==='rune'){c.translate(5,5);c.scale(1.1,1.1);c.stroke(new Path2D(itemSymbol(w).match(/d="([^"]+)"/)[1]))}
 else{line(c,[[16,5],[25,16],[16,27],[7,16],[16,5]],w.color);if(w.type==='gem'){c.beginPath();c.moveTo(16,7);c.lineTo(23,16);c.lineTo(16,25);c.lineTo(9,16);c.closePath();c.fill();line(c,[[16,7],[13,16],[16,25]],'#ffffff80')}else{line(c,[[16,10],[21,16],[16,22],[11,16],[16,10]],w.color);c.fillRect(15,14,2,4)}}
 c.restore();
}
function portrait(c,classId){c.clearRect(0,0,32,36);const col=classes[classId].color;c.strokeStyle=col;c.strokeRect(13,4,6,6);line(c,[[16,11],[16,22],[11,31]],col);line(c,[[16,22],[21,31]],col);line(c,[[10,21],[12,15],[16,13],[21,17],[23,13]],col);drawWeapon(c,classId,[23,17],1,0,col);if(classId===1)drawWeapon(c,1,[10,21],1,-.3,col)}
function serviceScenery(){const house=(x,label)=>{line(ctx,[[x,226],[x,181],[x+38,150],[x+76,181],[x+76,226]],'#b98539');line(ctx,[[x-5,183],[x+38,148],[x+81,183]],'#e5bb54');ctx.strokeStyle='#7a532b';ctx.strokeRect(x+28,201,20,25);ctx.fillStyle='#fff0ab';ctx.font='9px monospace';ctx.fillText(label,x+18,186)};house(12,serviceKind()==='town'?'SHOP':'RUNES');if(serviceKind()==='town')house(350,'INN');ctx.fillStyle='#bb9146';ctx.fillRect(538,207,34,9);ctx.fillRect(552,216,2,10);ctx.fillStyle='#000';ctx.font='7px monospace';ctx.fillText('MAP >',540,214)}
function terrain(){
 ctx.fillStyle='#000';ctx.fillRect(0,0,576,256);
 const node=areaInfo(),zone=ZONES[node.zone],region=zone.regions[node.region%4],palette=state==='service'?ZONES[0].palette:zone.palette;
 const cave=hasRoof();
 ctx.strokeStyle=palette[2];ctx.globalAlpha=.35;
 for(let i=0;i<7;i++){
  const x=i*88+18,y=floor(x);
  if(['City','Barracks','Farmland'].includes(region)||node.major){ctx.strokeRect(x,y-45,55,45);for(let j=0;j<3;j++)ctx.strokeRect(x+5+j*16,y-40,7,10);if(region==='Farmland')line(ctx,[[x-4,y-45],[x+26,y-65],[x+59,y-45]],palette[2]);}
  else if(['Woodland','Marsh','Oasis'].includes(region)){line(ctx,[[x,y],[x,y-55],[x-17,y-72],[x,y-60],[x+20,y-78]],palette[2]);}
  else if(node.zone===3||node.zone===4||['Cliffs','Canyon'].includes(region))line(ctx,[[x-25,y],[x,y-55-(i%3)*12],[x+32,y]],palette[2]);
  else if(['Beach','Reef'].includes(region))line(ctx,[[x,y-3],[x+10,y-10],[x+20,y-3],[x+35,y-8]],palette[2]);
 }
 ctx.globalAlpha=1;
 for(let x=0;x<576;x++){const y=floor(x);ctx.fillStyle=palette[0];ctx.fillRect(x,y,1,256-y);ctx.fillStyle=palette[1];ctx.fillRect(x,y,1,1);ctx.fillStyle=palette[2];for(let py=y+3+(x%3);py<256;py+=4)if(x%3===0)ctx.fillRect(x,py,1,1)}
 if(cave){ctx.fillStyle=palette[0];for(let x=0;x<576;x+=8)ctx.fillRect(x,0,8,ceiling(x))}
 if(node.major&&state!=='service'){
  ctx.strokeStyle=zone.color;
  if(node.name==='Pyramid'){line(ctx,[[330,226],[443,60],[556,226],[330,226]],zone.color);line(ctx,[[443,60],[467,226]],zone.color);ctx.strokeRect(432,192,22,34);}
  else if(node.name==='Lighthouse'){line(ctx,[[408,226],[420,91],[454,91],[466,226]],zone.color);ctx.strokeRect(415,72,45,19);line(ctx,[[411,72],[437,54],[464,72]],zone.color);line(ctx,[[420,79],[325,55],[420,87]],'#607b80');ctx.strokeRect(431,191,16,35);}
  else if(node.name==='Forge'){ctx.strokeRect(354,138,175,88);line(ctx,[[346,138],[439,101],[537,138]],zone.color);ctx.strokeRect(477,74,20,49);ctx.strokeRect(419,173,43,53);line(ctx,[[425,220],[437,188],[443,210],[453,197],[456,220]],'#ff8a36');}
  else{ctx.strokeRect(365,103,155,123);for(const x of [365,497]){ctx.strokeRect(x,65,23,161);for(let k=0;k<3;k++)ctx.strokeRect(x+k*8,57,5,8)}for(let x=391;x<497;x+=23)ctx.strokeRect(x,95,13,8);ctx.beginPath();ctx.arc(443,195,28,Math.PI,0);ctx.stroke();if(node.name==='Castle'||node.name==='Citadel')for(const x of [376,508])line(ctx,[[x-17,57],[x,32],[x+17,57]],zone.color);}
  ctx.fillStyle=zone.color;ctx.font='12px monospace';ctx.fillText(node.name.toUpperCase(),390,48);
 }
 if(['fight','walk'].includes(state)&&stageExitOpen()){ctx.fillStyle='#be8d46';ctx.fillRect(543,205,31,10);ctx.fillRect(548,215,2,11);ctx.fillStyle='#000';ctx.font='8px monospace';ctx.fillText(stage===stageCount()-2?'BOSS>':'NEXT>',544,213)}
}
function enemyShade(color,brightness){
 let hex=color.replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
 return '#'+[0,2,4].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*brightness).toString(16).padStart(2,'0')).join('');
}
function enemyPolygon(points,color){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=enemyShade(color,.42);ctx.fill();ctx.strokeStyle=color;ctx.stroke();
}
function enemyOval(x,y,w,h,color){
 ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fillStyle=enemyShade(color,.42);ctx.fill();ctx.strokeStyle=color;ctx.stroke();
 ctx.beginPath();ctx.ellipse(x-w*.22,y-h*.3,w*.45,h*.26,0,0,Math.PI*2);ctx.fillStyle=enemyShade(color,.68);ctx.fill();
}
function drawRegionalEnemy(e,x,y,color){
 const shape=e.shape,L=p=>line(ctx,p.map(([a,b])=>[x+a,y+b]),color),P=p=>enemyPolygon(p.map(([a,b])=>[x+a,y+b]),color),oval=(a,b,w,h)=>enemyOval(x+a,y+b,w,h,color),phase=Math.sin(time*9+e.seed),boss=e.type==='boss';
 ctx.save();ctx.strokeStyle=color;ctx.fillStyle=enemyShade(color,.42);if(boss){ctx.translate(x,y);ctx.scale(e.swarmBoss?1:1.65,e.swarmBoss?1:1.65);ctx.translate(-x,-y)}
 if(e.type==='spider')for(const foot of e.feet)line(ctx,[[x,y-12],[(x+foot.x)/2,y-22],[foot.x,foot.y]],color);
 switch(shape){
 case 'knight':case 'giant':case 'construct':case 'lich':{
  const robe=shape==='lich';ctx.fillRect(x-5,y-34,10,9);ctx.strokeRect(x-5,y-34,10,9);P([[-7,-37],[-7,-42],[-2,-38],[2,-43],[6,-38],[7,-42],[7,-37]]);
  P(robe?[[-6,-24],[-15,0],[15,0],[6,-24],[-6,-24]]:[[-8,-24],[8,-24],[10,-10],[-10,-10],[-8,-24]]);
  if(!robe){L([[-6,-10],[-9,0]]);L([[6,-10],[9,0]])}
  L([[-7,-22],[-18,-15],[-22,-24]]);L([[7,-22],[18,-16],[24,-30]]);
  if(robe){L([[24,-4],[24,-38]]);oval(24,-41,4,4)}else L([[24,-29],[29,-43],[32,-41],[27,-27]]);
  break;
 }
 case 'kraken':{oval(0,-25,13,18);for(let k=-2;k<=2;k++)L([[k*4,-12],[k*9+phase*3,-5],[k*13,0],[k*16+phase*4,-7]]);oval(-5,-27,2,3);oval(5,-27,2,3);break;}

 case 'moth':{const flap=phase*5;P([[-2,-12],[-18,-23-flap],[-21,-8],[-7,-3],[0,-12],[7,-3],[21,-8],[18,-23-flap],[2,-12]]);oval(0,-10,3,8);oval(-12,-13,3,3);oval(12,-13,3,3);break}
 case 'plant':P([[-9,0],[-2,-8],[0,-20],[-10,-27],[-8,-13],[0,-17],[9,-13],[11,-27],[0,-20],[2,-8],[9,0]]);break;
 case 'mushroom':P([[-4,0],[-3,-14],[-17,-14],[-10,-25],[0,-30],[12,-23],[17,-14],[3,-14],[4,0]]);oval(-7,-20,2,2);oval(7,-21,3,2);break;
 case 'acorn':oval(0,-11,9,10);P([[-11,-16],[11,-16],[8,-23],[-8,-23],[-11,-16]]);L([[0,-23],[3,-28]]);L([[-8,-2],[-13,1],[7,-2],[13,1]]);break;
 case 'mimic':P([[-12,0],[-12,-13],[12,-13],[12,0],[-12,0]]);P([[-12,-15],[-9,-25],[11,-22],[13,-15]]);for(let k=-9;k<12;k+=5)L([[k,-13],[k+2,-7],[k+4,-13]]);break;
 case 'mantis':oval(0,-16,4,8);P([[-4,-22],[0,-29],[5,-22],[-4,-22]]);L([[-2,-18],[-13,-25],[-20,-12],[-10,-18]]);L([[2,-18],[13,-25],[20,-12],[10,-18]]);break;
 case 'tree':P([[-9,0],[-5,-8],[-7,-26],[-14,-30],[-15,-39],[-10,-31],[-3,-27],[0,-38],[3,-25],[12,-32],[16,-30],[8,-21],[6,-8],[12,0]]);L([[-4,-16],[0,-12],[4,-16]]);break;
 case 'crystal':P([[-8,-3],[-11,-18],[-4,-30],[0,-19],[7,-27],[11,-10],[5,-2],[-8,-3]]);L([[-4,-30],[-2,-5],[7,-27],[3,-6]]);break;
 case 'worm':for(let k=0;k<4;k++)oval((k-1.5)*7,-5-Math.sin(time*7+k)*2,5,5);L([[-15,-8],[-20,-15],[-16,-2],[-15,-8]]);break;
 case 'eye':oval(0,-14,13,10);oval(phase*3,-14,4,7);for(let k=-1;k<=1;k++)L([[k*7,-5],[k*9+phase*3,3],[k*6,8]]);break;
 case 'snail':oval(3,-14,12,12);oval(3,-14,6,6);P([[-18,0],[13,0],[17,-4],[-12,-6],[-17,-17],[-20,-16],[-17,-4],[-18,0]]);L([[3,-25],[10,-34],[17,-29],[9,-23]]);break;
 case 'urchin':case 'wheel':{const pts=[];for(let k=0;k<=16;k++){const a=e.rotation+k*Math.PI/8,r=k%2?8:14;pts.push([Math.cos(a)*r,-14+Math.sin(a)*r])}P(pts);oval(0,-14,4,4);break}
 case 'maw':P([[-16,0],[-15,-14],[-9,-23],[9,-23],[15,-14],[16,0],[-16,0]]);L([[-12,-14],[-7,-6],[-3,-14],[2,-6],[7,-14],[11,-6]]);break;
 case 'scorpion':oval(0,-9,9,5);L([[7,-10],[16,-18],[14,-29],[8,-33],[5,-28],[10,-25]]);L([[-5,-10],[-16,-17],[-22,-12],[-16,-9],[-12,-13]]);break;
 case 'cactus':P([[-5,0],[-5,-15],[-14,-15],[-14,-26],[-10,-26],[-10,-20],[-5,-20],[-5,-31],[4,-31],[4,-13],[10,-13],[10,-23],[14,-23],[14,-8],[4,-8],[4,0]]);break;
 case 'urn':P([[-7,0],[-12,-12],[-8,-24],[8,-24],[12,-12],[7,0],[-7,0]]);L([[-10,-26],[10,-26]]);L([[-5,-15],[0,-10],[5,-15]]);break;
 case 'scarab':oval(0,-12,11,12);L([[0,0],[0,-24],[-7,-30],[0,-27],[7,-30]]);for(let k=0;k<3;k++){L([[-9,-6-k*6],[-17,-3-k*6]]);L([[9,-6-k*6],[17,-3-k*6]])}break;
 case 'crab':oval(0,-10,11,7);for(const side of [-1,1])L([[side*8,-10],[side*18,-23],[side*23,-18],[side*17,-15],[side*14,-21]]);break;
 case 'ray':P([[-2,-15],[-26,-24-phase*4],[-16,-8],[0,-4],[16,-8],[26,-24-phase*4],[2,-15]]);L([[0,-4],[phase*3,8],[0,17]]);break;
 case 'bell':P([[-14,-3],[-9,-12],[-7,-26],[7,-26],[9,-12],[14,-3],[-14,-3]]);oval(0,-28,3,3);L([[0,-8],[phase*4,2]]);break;
 case 'imp':P([[-5,0],[-2,-12],[-7,-21],[-8,-29],[-2,-24],[3,-24],[9,-30],[7,-20],[2,-12],[6,0]]);L([[-2,-15],[-12,-13],[-15,-7]]);break;
 case 'ram':oval(0,-12,13,8);oval(-12,-19,6,6);oval(-12,-19,3,3);L([[-8,-5],[-10,0],[7,-5],[10,0]]);break;
 case 'golem':P([[-11,0],[-10,-12],[-15,-15],[-12,-29],[-5,-25],[-5,-35],[5,-35],[5,-25],[13,-28],[16,-15],[10,-12],[11,0]]);break;
 case 'bird':P([[-6,0],[-2,-9],[-9,-18],[-4,-29],[4,-26],[12,-21],[3,-21],[8,-9],[5,0]]);L([[-2,-12],[-15,-18],[-9,-6]]);break;
 case 'puppet':oval(0,-25,5,5);L([[0,-20],[0,-10],[-7,0],[0,-10],[7,0]]);L([[-11,-8-phase*4],[-6,-18],[0,-17],[7,-19],[12,-9+phase*4]]);L([[-11,-9],[-9,-40],[9,-40],[12,-9]]);break;
 case 'jelly':oval(0,-18,13,9);for(let k=-2;k<=2;k++)L([[k*4,-10],[k*5+phase*3,-2],[k*4-phase*3,6]]);break;
 case 'obelisk':P([[-8,0],[-6,-28],[0,-39],[6,-28],[8,0],[-8,0]]);L([[-3,-23],[3,-19],[-3,-15],[3,-11]]);break;
 }
 ctx.restore();if(e.hp<e.maxHp){ctx.fillStyle='#c32929';ctx.fillRect(x-12,y-(boss?66:43),24*e.hp/e.maxHp,2)}
}

function drawEnemy(e){
 if(e.shape){drawRegionalEnemy(e,Math.round(e.x),Math.round(e.y),e.flash?'#fff':e.frozen>0?'#79cfff':e.poison?'#a3ff57':e.color);return}
 const r=e.type==='boss'?17:e.type==='beetle'?11:e.type==='swarmling'?4:e.type==='summoner'?9:7,x=Math.round(e.x),y=Math.round(e.y)+(e.crouching?3:0),color=e.flash?'#fff':e.frozen>0?'#79cfff':e.poison?'#a3ff57':e.color;
 const L=p=>line(ctx,p.map(([a,b])=>[x+a,y+b]),color),P=p=>enemyPolygon(p.map(([a,b])=>[x+a,y+b]),color),box=(a,b,w,h)=>{ctx.fillStyle=enemyShade(color,.42);ctx.fillRect(x+a,y+b,w,h);ctx.strokeStyle=color;ctx.strokeRect(x+a,y+b,w,h)};
 ctx.save();
 if(e.type==='spider'){
  for(const foot of e.feet)line(ctx,[[x,y-11],[(x+foot.x)/2+(foot.x<x?-7:7),Math.min(y-15,foot.y-10)],[foot.x,foot.y]],color);
  enemyOval(x+3,y-11,8,5,color);enemyOval(x-4,y-9,4,4,color);
 }else if(e.type==='roller'){
  enemyOval(x,y-9,9,9,color);for(let j=0;j<3;j++){const a=e.rotation+j*Math.PI*2/3;L([[0,-9],[Math.cos(a)*7,-9+Math.sin(a)*7]])}
 }else if(e.type==='flyer'){
  const flap=Math.sin(time*20+e.seed)*10;P([[-2,-12],[-10,-18-flap],[-21,-7-flap],[-9,-8],[0,-4],[9,-8],[21,-7-flap],[10,-18-flap],[2,-12]]);enemyOval(x,y-10,4,6,color);
 }else if(e.type==='catapult'){
  box(-12,-8,24,5);enemyOval(x-7,y-2,4,4,color);enemyOval(x+7,y-2,4,4,color);P([[-6,-8],[0,-20],[6,-8]]);
  const arm=e.lob?e.lob.left*12:0;L([[-7,-10],[8-arm,-27]]);enemyOval(x+8-arm,y-28,4,4,'#b8b3a3');
 }else if(e.type==='summoner'||e.type==='shaman'){
  P([[-r,-3],[0,-25],[r,-3]]);enemyOval(x,y-20,4,5,color);L([[-4,-9],[4,-9]]);
  if(e.type==='shaman'){L([[12,0],[12,-25]]);enemyOval(x+12,y-27,3,3,color)}
 }else if(e.type==='archer'){
  box(-3,-24,6,6);P([[-3,-18],[3,-18],[4,-7],[-4,-7]]);L([[-2,-7],[-5,0]]);L([[2,-7],[5,0]]);L([[0,-16],[-9,-12]]);L([[-12,-23],[-17,-13],[-12,-3],[-12,-23]]);
 }else{
  enemyOval(x,y-r,r,r-1,color);
  if(e.type==='beetle'){L([[0,-r*2],[0,-1]]);for(const side of [-1,1])for(let j=0;j<3;j++)L([[side*8,-4-j*4],[side*14,-j*4]])}
  if(e.type==='hopper'){P([[-3,-5],[-11,-8],[-7,0]]);P([[3,-5],[11,-8],[7,0]])}
  if(e.type==='bomber'){box(-4,-8,8,4);L([[-3,-16],[0,-21],[3,-16]]);}
 }
 if(e.hp<e.maxHp){ctx.fillStyle='#c32929';ctx.fillRect(x-r,y-r*2-5,Math.max(1,Math.round(2*r*e.hp/e.maxHp)),2)}ctx.restore();
}

function drawNumbers(){
 const layer=$('#damage-numbers'),c=layer.getContext('2d'),rect=canvas.getBoundingClientRect?.()||{width:576,height:256},ratio=window.devicePixelRatio||1,w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));
 if(layer.width!==w||layer.height!==h){layer.width=w;layer.height=h}
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.setTransform(w/576,0,0,h/256,0,0);c.font='bold 7px monospace';c.textAlign='center';c.lineJoin='round';c.lineWidth=1.5;
 for(const n of numbers){c.globalAlpha=Math.min(1,n.life*5);c.strokeStyle='#000';c.strokeText(String(n.text),n.x,n.y);c.fillStyle=n.color;c.fillText(String(n.text),n.x,n.y)}c.globalAlpha=1;
}
function draw(){ctx.imageSmoothingEnabled=false;terrain();drawHazards();if(state==='service')serviceScenery();enemies.forEach(drawEnemy);drawMinions();fields.forEach(f=>{ctx.fillStyle=f.color;if(f.spell){ctx.globalAlpha=f.pulses?.65:.25;ctx.fillRect(f.x-f.spell.radius,f.y-(f.pulses?22:1),f.spell.radius*2,f.pulses?28:3);ctx.globalAlpha=1;return}for(let i=0;i<10;i++)ctx.fillRect(f.x-25+i*5,f.y-2-(i%3)*2,2,2)});flashes.forEach(f=>line(ctx,[[f.x,f.y],[(f.x+f.tx)/2,f.ty-12],[f.tx,f.ty]],f.color));potions.forEach(p=>{ctx.fillStyle='#eeeeee';ctx.fillRect(p.x-1,p.y-9,3,3);ctx.fillStyle='#f44264';ctx.fillRect(p.x-3,p.y-6,7,5);ctx.fillStyle='#ff9aaf';ctx.fillRect(p.x-2,p.y-5,2,2)});loot.forEach(l=>{ctx.save();ctx.translate(l.x-10,l.y-20);ctx.scale(.625,.625);drawItemIcon(ctx,ITEMS[l.item]);ctx.restore()});heroes.forEach((h,i)=>{if(h.classId===4&&h.hp>0&&(i===selected||h.auraFlash>0)){ctx.strokeStyle=h.auraFlash>0?'#72d9ff':'#163440';ctx.beginPath();ctx.arc(h.x,h.y-13,h.range,0,Math.PI*2);ctx.stroke()}stick(ctx,h,i===selected)});shots.forEach(s=>{if(s.kind==='note'){if(s.radius)line(ctx,[[s.x-4,s.y-s.radius],[s.x+2,s.y],[s.x-4,s.y+s.radius]],'#f0d580');else line(ctx,[[s.x,s.y-5],[s.x,s.y+2],[s.x-3,s.y+3]],'#f0d580');return}ctx.fillStyle=s.kind==='heal'?'#60ff70':s.kind==='magic'?'#df81ff':s.kind==='enemy'?'#ed9552':'#eee';s.kind==='arrow'?line(ctx,[[s.x-s.vx/22,s.y-s.vy/22],[s.x,s.y]],'#eee'):ctx.fillRect(Math.round(s.x),Math.round(s.y),2,2)});ctx.font='7px monospace';ctx.textAlign='center';drawNumbers();ctx.textAlign='left';if(paused){ctx.fillStyle='#ffffff';ctx.font='12px monospace';ctx.fillText('PAUSED',233,90)}}

function openMainMenu(){if(sceneFade)return;save();release();closeSettings();menuOpen=true;$('#main-menu').hidden=false;setFrontScreen('menu');$('#menu-actions').hidden=false;$('#save-picker').hidden=true;drawMenuGround('menu-ground');}
function renderSaveSlots(){$('#save-slots').innerHTML=[1,2,3].map(slot=>{const s=readSlot(slot),valid=Array.isArray(s?.heroes)&&s.heroes.length===4&&s.heroes.every(h=>classes[h.classId]);return '<button data-save-slot="'+slot+'" '+(savePickerMode==='load'&&!valid?'disabled':'')+'><strong>SAVE '+slot+'</strong><span>'+(valid?s.heroes.map(h=>classes[h.classId].name+' '+h.level).join(' · '):'New adventure')+'</span>'+(valid?'<small>'+Math.floor(s.gold||0)+' gold</small>':'')+'</button>'}).join('')}
function chooseSaveSlot(slot){if(![1,2,3].includes(slot))return;activeSlot=slot;setFrontScreen(null);menuOpen=false;$('#main-menu').hidden=true;if(sessionSlot===slot&&state!=='setup')return;
 if(load()){sessionSlot=slot;selected=0;$('#setup').hidden=true;if(serviceKind()==='town'||serviceKind()==='trader')enterService(currentNode);else enter();return}
 beginPartySetup()
}
$('#menu-button').onclick=openMainMenu;$('#setup-back').onclick=openMainMenu;
$('#save-slots').onclick=e=>{const b=e.target.closest('[data-save-slot]');if(b){const slot=+b.dataset.saveSlot;if(savePickerMode==='new'){if(readSlot(slot)&&!confirm('Replace save '+slot+' with a new party?'))return;activeSlot=slot;beginPartySetup()}else if(readSlot(slot))chooseSaveSlot(slot)}};

function canAutoMove(h){return autoMoveEnabled&&h.autoMove!==false}
function setAutoMove(index,enabled){if(index===null)autoMoveEnabled=enabled;else if(heroes[index])heroes[index].autoMove=enabled;heroes.forEach(h=>{if(!canAutoMove(h))h.drive=0});save()}
function openSettings(){if(sceneFade)return;release();settingsOpen=true;$('#settings').hidden=false;$('#auto-move-all').checked=autoMoveEnabled;$('#auto-move-characters').innerHTML=heroes.map((h,i)=>'<label><input type="checkbox" data-auto-move="'+i+'" '+(h.autoMove!==false?'checked':'')+'> '+(i+1)+' · '+classes[h.classId].name+'</label>').join('')}
function closeSettings(){settingsOpen=false;$('#settings').hidden=true}
$('#settings-button').onclick=openSettings;$('#settings-close').onclick=closeSettings;
$('#auto-move-all').onchange=e=>setAutoMove(null,e.target.checked);
$('#auto-move-characters').onchange=e=>{if(e.target.dataset.autoMove!==undefined)setAutoMove(+e.target.dataset.autoMove,e.target.checked)};
function toggle(){if(!['fight','walk'].includes(state))return;paused=!paused;refresh()}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*576/r.width,y:(e.clientY-r.top)*256/r.height}}
canvas.addEventListener('pointerdown',e=>{if(menuOpen||settingsOpen||sceneFade||paused||!['fight','walk','service'].includes(state))return;const p=point(e),h=heroes.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.y-13-p.y)-Math.hypot(b.x-p.x,b.y-13-p.y))[0];if(h&&Math.hypot(h.x-p.x,h.y-13-p.y)<22){if(h.hp<=0){select(heroes.indexOf(h));return}drag=h;h.cursorSpeed=0;h.strike=null;h.dragTarget={x:h.x,y:h.y};h.dragSample={x:h.x,y:h.y,t:e.timeStamp};h.throwVx=0;h.throwVy=0;select(heroes.indexOf(h));canvas.setPointerCapture(e.pointerId)}});
canvas.addEventListener('pointermove',e=>{if(!drag){const p=point(e),i=heroes.findIndex(h=>Math.hypot(h.x-p.x,h.y-13-p.y)<18);if(i>=0)inspectHero(i);else{const foe=enemies.find(e=>Math.hypot(e.x-p.x,e.y-12-p.y)<17);if(foe){$('#character-info').hidden=true;$('#hover-info').hidden=false;$('#item-name').textContent=foe.name;$('#item-details').textContent='LV '+foe.level+' · HP '+Math.ceil(foe.hp)+' / '+foe.maxHp+'\nAT '+Math.round(enemyDamage(foe))+' · RANGE '+foe.range;$('#item-effect').textContent=ENEMY_TYPES[foe.species||foe.type]?.description||'Watch its attacks and reposition your party.'}else{restoreInfo();refresh()}}return}if(paused)return;const p=point(e);moveHeld(p.x,p.y+13,e.timeStamp)}); 
function moveHeld(x,y,t){if(!drag)return;const prev=drag.dragSample;if(prev&&t>prev.t)drag.cursorSpeed=Math.min(3000,Math.hypot(x-prev.x,y-prev.y)/Math.max(.008,(t-prev.t)/1000));drag.dragTarget={x:Math.max(8,Math.min(567,x)),y:Math.max(20,Math.min(floor(x),y))};drag.dragSample={x,y,t};drag.strike=null}
function release(e){if(drag){if(!e||!Number.isFinite(e.timeStamp)){drag.vx=0;drag.vy=0}drag.hold=.4;drag.drive=0;drag.dragTarget=null;drag.dragSample=null;drag=null}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>release());
$('#pause').onclick=toggle;$('#speed').onclick=()=>{speed=speed===1?2:1;$('#speed').textContent=speed+'x'};$('#start').onclick=()=>{if(chosenClasses.every(v=>v!==null))start()};$('#retry').onclick=()=>{enterService('town')};$('#new').onclick=()=>{if(heroes.length&&!confirm('Start a new party? This replaces your current run.'))return;beginPartySetup()};$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{tell('Full screen is unavailable in this browser.')}};
$('#revive').onclick=revive;
$('#party').onclick=e=>{const b=e.target.closest('[data-hero]');if(b)select(+b.dataset.hero)};
$('.stats').onclick=e=>{const b=e.target.closest('[data-stat]');if(b)allocate(b.dataset.stat)};
function slotFrom(el){const b=el?.closest('[data-slot]');return b?{type:b.dataset.slot,index:+b.dataset.index}:null}
const app=$('#app');
function fitFullscreen(){const full=!!document.fullscreenElement;$('#fullscreen').textContent=full?'Exit Full Screen':'Full Screen';const scale=full?Math.min(1,(window.innerHeight-16)/Math.max(1,app.scrollHeight)):1;app.style.setProperty('--fullscreen-scale',String(Math.max(.1,scale)))}
document.addEventListener?.('fullscreenchange',fitFullscreen);window.addEventListener('resize',fitFullscreen);if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitFullscreen).observe(app);
$('.map-chart').addEventListener('pointermove',e=>{const r=$('.map-chart').getBoundingClientRect(),x=e.clientX-r.left;mapPan=x>r.width-65?1:x<65?-1:0});$('.map-chart').addEventListener('pointerleave',()=>mapPan=0);
$('#map-left').onclick=()=>{$('.map-chart').scrollLeft-=240};$('#map-right').onclick=()=>{$('.map-chart').scrollLeft+=240};
$('#world-button').onclick=()=>{if(state!=='service')changeScene(openMap)};
$('#open-shop').onclick=()=>{$('#services').hidden=false;renderServices()};
$('#inn').onclick=healTown;$('#shop-exit').onclick=()=>$('#services').hidden=true;
$('#shop-prev').onclick=()=>{shopIndex--;renderServices()};$('#shop-next').onclick=()=>{shopIndex++;renderServices()};
$('#shop-classes').onclick=e=>{const b=e.target.closest('[data-shop-class]');if(b){shopClass=+b.dataset.shopClass;shopIndex=0;renderServices()}};
canvas.addEventListener('click',e=>{if(sceneFade||state!=='service')return;const p=point(e);if(p.x<100&&p.y>145){$('#services').hidden=false;renderServices()}else if(serviceKind()==='town'&&p.x>350&&p.x<435&&p.y>145)healTown();});

$('#map-nodes').onclick=e=>{const n=e.target.closest('[data-node]');if(n)travel(n.dataset.node)};
$('#town-heal').onclick=healTown;$('#sell-item').onclick=sellItem;
$('#trader-stock').onclick=e=>{const b=e.target.closest('[data-buy]');if(b)buyRune(b.dataset.buy)};
app.addEventListener('mouseout',e=>{const item=e.target.closest('[data-slot],[data-hero]');if(item&&!item.contains(e.relatedTarget)){restoreInfo();refresh()}});
app.addEventListener('focusout',e=>{if(e.target.closest('[data-slot],[data-hero]')){restoreInfo();refresh()}});
canvas.addEventListener('pointerleave',()=>{if(!drag){restoreInfo();refresh()}});
window.addEventListener('beforeunload',save);
app.addEventListener('pointerdown',e=>{const from=slotFrom(e.target);if(!from||!slotItem(from)||e.button!==0)return;gearDrag={from,startX:e.clientX,startY:e.clientY,moved:false,pointerId:e.pointerId}});
app.addEventListener('pointermove',e=>{if(!gearDrag)return;const d=gearDrag;if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>5)d.moved=true;if(!d.moved)return;if(!app.hasPointerCapture?.(d.pointerId))app.setPointerCapture(d.pointerId);e.preventDefault();const w=ITEMS[slotItem(d.from)],ghost=$('#drag-item');ghost.hidden=false;ghost.innerHTML=itemSymbol(w);ghost.style.color=w.color;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';const target=slotFrom(document.elementFromPoint(e.clientX,e.clientY));document.querySelectorAll('[data-slot]').forEach(el=>el.classList.remove('drop-ok','drop-no'));if(target){const el=$('[data-slot="'+target.type+'"][data-index="'+target.index+'"]');el.classList.add(accepts(target,w.id)&&accepts(d.from,slotItem(target))?'drop-ok':'drop-no')}});
function endGear(e,cancel=false){if(!gearDrag)return;const d=gearDrag;gearDrag=null;$('#drag-item').hidden=true;document.querySelectorAll('[data-slot]').forEach(el=>el.classList.remove('drop-ok','drop-no'));if(app.hasPointerCapture?.(d.pointerId))app.releasePointerCapture(d.pointerId);if(d.moved){suppressGearClick=true;if(!cancel){const to=slotFrom(document.elementFromPoint(e.clientX,e.clientY));if(to)moveItem(d.from,to)}setTimeout(()=>suppressGearClick=false,0)}}
app.addEventListener('pointerup',e=>endGear(e));app.addEventListener('pointercancel',e=>endGear(e,true));
app.addEventListener('click',e=>{if(suppressGearClick)return;const slot=slotFrom(e.target);if(!slot)return;if(pickedSlot){const from=pickedSlot;pickedSlot=null;moveItem(from,slot);build()}else if(slotItem(slot)){pickedSlot=slot;inspect(slotItem(slot),slotRunes(slot));tell('Item selected. Click a destination slot, or drag it there.');e.target.closest('[data-slot]').classList.add('item-picked');if(state==='service')renderServices()}});
app.addEventListener('mouseover',e=>{const slot=slotFrom(e.target),card=e.target.closest('[data-hero]');if(slot)inspect(slotItem(slot),slotRunes(slot));else if(card)inspectHero(+card.dataset.hero)});app.addEventListener('focusin',e=>{const slot=slotFrom(e.target),card=e.target.closest('[data-hero]');if(slot)inspect(slotItem(slot));else if(card)inspectHero(+card.dataset.hero)});
window.addEventListener('keydown',e=>{if(menuOpen)return;if(e.key==='Escape'){pickedSlot=null;if(gearDrag)endGear(e,true);build();return}if(e.target.matches('select,button'))return;if(e.code==='Space'){e.preventDefault();toggle()}if(/^[1-4]$/.test(e.key)&&heroes.length)select(+e.key-1)});window.addEventListener('blur',()=>{if(state==='fight'||state==='walk'){release();if(gearDrag)endGear({},true)}});
$('#choices').innerHTML=[0,2,3,4].map((n,i)=>`<label class="choice">${i+1}<canvas width="32" height="40" id="choice-${i}"></canvas><select aria-label="Character ${i+1} class">${classes.map((c,j)=>`<option value="${j}" ${j===n?'selected':''}>${c.name}</option>`).join('')}</select></label>`).join('');
let chosenClasses=[null,null,null,null],setupSlot=0,savePickerMode='load';
function setFrontScreen(screen){for(const name of ['menu','setup'])$('#app').classList.remove(name+'-screen');if(screen)$('#app').classList.add(screen+'-screen')}
function beginPartySetup(){release();closeSettings();menuOpen=false;sessionSlot=0;state='setup';paused=false;chosenClasses=[null,null,null,null];setupSlot=0;$('#main-menu').hidden=true;$('#setup').hidden=false;setFrontScreen('setup');previews()}
function previews(){
 $('#party-choices').innerHTML=chosenClasses.map((id,i)=>'<button data-party-slot="'+i+'" class="'+(setupSlot===i?'active':'')+'" aria-label="Select party slot '+(i+1)+'"><canvas id="setup-hero-'+i+'" width="32" height="36"></canvas><span>'+(id===null?'Choose class':classes[id].name)+'</span></button>').join('');
 chosenClasses.forEach((id,i)=>{const c=$('#setup-hero-'+i).getContext('2d');c.clearRect(0,0,32,36);if(id!==null)portrait(c,id);else{c.fillStyle='#777';c.font='16px monospace';c.fillText('?',12,24)}});
 $('#class-options').innerHTML=classes.map((c,i)=>'<button data-pick-class="'+i+'"><span>'+c.name+'</span><canvas id="class-option-'+i+'" width="32" height="36"></canvas></button>').join('');
 classes.forEach((c,i)=>portrait($('#class-option-'+i).getContext('2d'),i));
 $('#start').disabled=chosenClasses.some(v=>v===null);$('#class-info').textContent='Choose a class for slot '+(setupSlot+1);drawMenuGround('setup-ground',chosenClasses);
}
function pickClass(id){if(!classes[id])return;chosenClasses[setupSlot]=id;document.querySelectorAll('#choices select')[setupSlot].value=String(id);const empty=chosenClasses.findIndex(v=>v===null);if(empty>=0)setupSlot=empty;previews()}
function drawMenuGround(id,party=[0,1,3,4]){const c=$('#'+id).getContext('2d');c.clearRect(0,0,576,90);for(let x=0;x<576;x++){const y=x<70||x>510?55:68;c.fillStyle='#bf924c';c.fillRect(x,y,1,90-y);c.fillStyle='#56d42e';c.fillRect(x,y,1,1);c.fillStyle='#e4ba77';if(x%3===0)for(let yy=y+3;yy<90;yy+=4)c.fillRect(x,yy,1,1)}party.forEach((id,i)=>{if(id===null)return;c.save();c.translate(165+i*70,33);portrait(c,id);c.restore()})}
function showSavePicker(mode){savePickerMode=mode;$('#menu-actions').hidden=true;$('#save-picker').hidden=false;$('#save-heading').textContent=mode==='new'?'NEW GAME':'LOAD GAME';renderSaveSlots()}
$('#party-choices').onclick=e=>{const b=e.target.closest('[data-party-slot]');if(b){setupSlot=+b.dataset.partySlot;previews()}};
$('#class-options').onclick=e=>{const b=e.target.closest('[data-pick-class]');if(b)pickClass(+b.dataset.pickClass)};
$('#menu-new').onclick=()=>showSavePicker('new');$('#menu-load').onclick=()=>showSavePicker('load');$('#save-return').onclick=openMainMenu;
if(!load())heroes=[0,2,3,4].map(hero);build();menuOpen=true;$('#main-menu').hidden=false;setFrontScreen('menu');drawMenuGround('menu-ground');

function frame(t){const dt=Math.min(.1,Math.max(0,(t-last)/1000));last=t;tickSceneFade(dt);if(state==='map')panMap(dt);if(!paused){let left=dt*speed;while(left>0){const step=Math.min(left,1/120);update(step);left-=step}}draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
