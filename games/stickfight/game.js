/* Stickfight: fixed-step Verlet bodies, distance joints, spring-driven weapons. */
'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s),W=1500,H=660,FLOOR=552,DT=1/120,GAME_SPEED=.8;
const weapons={sword:{name:'Arming sword',length:81,mass:1,width:5},long:{name:'Greatsword',length:119,mass:1.65,width:7},axe:{name:'Battle axe',length:76,mass:1.9,width:7},spear:{name:'War spear',length:145,mass:1.2,width:4},dagger:{name:'Short blade',length:55,mass:.65,width:4},hammer:{name:'War hammer',length:85,mass:2.1,width:7},archer:{name:'Bow',length:34,mass:.7,width:3},mage:{name:'Staff',length:58,mass:1,width:5}};
const levels=[['Swordsman','Defeat the swordsman.',['sword'],.8],['Greatsword','Get inside the longer blade’s reach.',['long'],.85],['Axe','Attack after the axe swing.',['axe'],.9],['Duelist','A faster opponent with a short blade.',['dagger'],1.5],['Spear','Close the gap on the spear fighter.',['spear'],1],['Two opponents','Keep both enemies in front of you.',['sword','dagger'],1],['Hammer','Defeat the hammer fighter and swordsman.',['hammer','sword'],.95],['Fast opponents','Two faster enemies.',['dagger','long'],1.45],['Three opponents','Defeat all three enemies.',['axe','spear','sword'],1.1],['Champions','Three enemies with different weapons.',['long','hammer','dagger'],1.4],['Archer','Deflect arrows with your sword.',['archer'],1],['Spellcaster','Spells pass through swords. Dodge them.',['mage'],1],['Covering fire','Close in while blocking arrows.',['sword','archer'],1.15],['Final round','Deflect arrows, dodge spells, defeat all enemies.',['axe','archer','mage'],1.2]];
let unlocked=0;try{unlocked=Math.max(0,Math.min(levels.length-1,Number(localStorage.getItem('iron-string-level'))||0));}catch{}
let round=0,state='menu',fighters=[],player,projectiles=[],particles=[],texts=[],time=0,shake=0,clearTimer=0,sound=false,audio,pausedFrom='playing';
const keys=new Set(),mouse={x:650,y:330},clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function point(x,y,r=5){return{x,y,px:x,py:y,r};}
function makeFighter(x,enemy,weapon='sword',speed=1,index=0){
 const y=FLOOR-65,p=[point(x,y),point(x,y-38),point(x,y-63,13),point(x-14,y-16),point(x-23,y+3),point(x+19,y-20),point(x+35,y-29),point(x-14,y+29),point(x-19,y+62),point(x+15,y+28),point(x+23,y+62)];
 const links=[[0,1,38],[1,2,25],[1,3,26],[3,4,27],[1,5,27],[5,6,28],[0,7,32],[7,8,34],[0,9,32],[9,10,34]];
 return{p,links,enemy,weapon:weapons[weapon],kind:weapon,ranged:weapon==='archer'||weapon==='mage',extension:44,reachAim:44,speed,hp:enemy?80+round*4:100,maxHp:enemy?80+round*4:100,angle:enemy?Math.PI:-.4,aim:-.4,lastMouse:{...mouse},angular:0,tip:null,base:null,oldTip:null,oldBase:null,hits:new Map(),stun:0,flash:0,phase:index*1.7,grounded:true,dead:0,color:weapon==='mage'?'#bf9df7':weapon==='archer'?'#ebca7d':enemy?'#eb987a':'#d6f19a',trail:[]};
}
function loadLevel(n,play=true){round=n;time=0;clearTimer=0;particles=[];projectiles=[];texts=[];shake=0;fighters=[makeFighter(290,false)];player=fighters[0];levels[n][2].forEach((w,i)=>fighters.push(makeFighter(860+i*150,true,w,levels[n][3],i)));state=play?'playing':'menu';$('#overlay').classList.toggle('hidden',play);$('#round').textContent=`ROUND ${String(n+1).padStart(2,'0')} / ${levels.length}`;$('#level-name').textContent=levels[n][0];$('#feedback').textContent=levels[n][1];updateHUD();renderLevels();}
function renderLevels(){const el=$('#levels');el.replaceChildren();levels.forEach((l,i)=>{const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');b.title=l[0];b.disabled=i>unlocked;b.className=i===round?'current':i<unlocked?'done':'';b.onclick=()=>loadLevel(i);el.append(b);});}
function updateHUD(){$('#health').style.width=Math.max(0,player.hp)+'%';$('#hp').textContent=Math.max(0,Math.ceil(player.hp))+' / 100';const alive=fighters.filter(f=>f.enemy&&f.hp>0).length;$('#remaining').textContent=alive+' opponent'+(alive===1?'':'s');}
function overlay(label,title,copy,button){$('#card-label').textContent=label;$('#card-title').textContent=title;$('#card-copy').textContent=copy;$('#primary').innerHTML=button+' <span>→</span>';$('#card-hint').textContent=state==='paused'?'Esc to resume · R to restart':'Move the mouse to swing. No clicking needed.';$('#overlay').classList.remove('hidden');}
function pause(){if(state==='playing'){pausedFrom=state;state='paused';overlay('','Paused','Esc to resume · R to restart','Resume');}else if(state==='paused'){state=pausedFrom;$('#overlay').classList.add('hidden');}}
$('#primary').onclick=()=>{if(state==='paused')pause();else loadLevel(state==='won'?Math.min(round+1,9):state==='complete'?0:round);};$('#pause').onclick=pause;
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';if(sound){audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();}};
function tone(freq,duration=.08){if(!sound||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.3,audio.currentTime+duration);g.gain.setValueAtTime(.08,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','Space','Escape','KeyR'].includes(e.code)){if(e.target.tagName!=='BUTTON')e.preventDefault();if(!e.repeat){if(e.code==='Escape')pause();if(e.code==='KeyR'&&state!=='menu')loadLevel(round);}keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height;});
function impulse(f,x,y){
 if(f.hp>0){x=clamp(x,-160,160);y=clamp(y,-150,150);f.vx=clamp((f.vx||0)+x,-230,230);f.vy=clamp((f.vy||0)+y,-510,380);f.lean=clamp((f.lean||0)+x*.0015,-.4,.4);}
 for(const p of f.p){p.px-=x*DT;p.py-=y*DT;}
}
function jointBetween(a,b,l1,l2,bend){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy));
 const along=clamp((l1*l1-l2*l2+d*d)/(2*d),-l1,l1),side=Math.sqrt(Math.max(0,l1*l1-along*along))*bend;
 return{x:a.x+dx/d*along-dy/d*side,y:a.y+dy/d*along+dx/d*side};
}
function enemyRandom(ai){ai.seed=(Math.imul(ai.seed,1664525)+1013904223)>>>0;return ai.seed/4294967296;}
function rangedControl(f){
 const ai=f.ai??={seed:(round+1)*1973+Math.round(f.phase*991)+71,mode:'position',until:time+.8+f.phase*.15};
 const dx=player.p[1].x-f.p[1].x,dir=Math.sign(dx)||1,dist=Math.abs(dx),spell=f.kind==='mage';
 let move=dist<(spell?330:370)?-dir*.8:dist>570?dir*.8:0;
 if((f.root?.x<85&&move<0)||(f.root?.x>W-85&&move>0))move=0;
 let target=Math.atan2(player.p[1].y-f.p[1].y,dx);
 if(ai.mode==='position'&&time>=ai.until){ai.mode='charge';ai.until=time+(spell?1.05:.7)/Math.sqrt(f.speed);ai.lockAt=ai.until-.25;}
 if(ai.mode==='charge'){
  move*=.2;
  if(time<ai.lockAt||ai.shotAngle===undefined){
   const lead=clamp(dist/(spell?280:430),.1,.7)*.45;
   ai.shotAngle=Math.atan2(player.p[1].y+(player.vy||0)*lead-f.p[1].y-(spell?0:dist*.05),dx+(player.walk||0)*lead);
  }
  target=ai.shotAngle;
  if(time>=ai.until){
   const speed=spell?290:440,x=f.p[1].x+Math.cos(target)*60,y=f.p[1].y+Math.sin(target)*60;
   projectiles.push({x,y,vx:Math.cos(target)*speed,vy:Math.sin(target)*speed,type:spell?'spell':'arrow',owner:f,enemy:true,life:6,damage:spell?23:15});
   tone(spell?160:700,.1);ai.mode='position';ai.until=time+(spell?1.15:.8)+enemyRandom(ai)*.4;ai.shotAngle=undefined;
  }
 }
 return{move,target,jump:false,crouch:false};
}
function projectileBladeHit(shot,old,f){
 if(!f.base||f.ranged||f.hp<=0)return false;
 const steps=Math.max(1,Math.ceil((Math.hypot(shot.x-old.x,shot.y-old.y)+Math.abs(wrap(f.angle-(f.oldAngle??f.angle)))*(54+f.weapon.length)+Math.abs(f.extension-(f.oldExtension??f.extension)))/3));
 for(let i=0;i<=steps;i++){const t=i/steps,p={x:old.x+(shot.x-old.x)*t,y:old.y+(shot.y-old.y)*t},blade=bladeAt(f,t);if(closest(p,blade.base,blade.tip)<f.weapon.width*.5+5)return true;}
 return false;
}
function deflectArrow(shot,f){
 const nx=-Math.sin(f.angle),ny=Math.cos(f.angle),dot=shot.vx*nx+shot.vy*ny;
 let vx=shot.vx-2*dot*nx,vy=shot.vy-2*dot*ny;
 // A shallow/edge-on contact knocks the arrow back rather than letting it
 // continue through the guard. A moving blade adds some directional influence.
 if(Math.abs(dot)<80){vx=-shot.vx;vy=-shot.vy;}
 vx+=-Math.sin(f.angle)*f.angular*6;vy+=Math.cos(f.angle)*f.angular*6;
 const speed=Math.hypot(vx,vy)||1,scale=clamp(speed,320,600)/speed;
 shot.vx=vx*scale;shot.vy=vy*scale;shot.owner=f;shot.enemy=f.enemy;shot.deflectUntil=time+.1;
 shot.x+=shot.vx*DT*2;shot.y+=shot.vy*DT*2;
 burst(shot.x,shot.y,'#f9e4ad',7);tone(650);$('#feedback').textContent='Arrow deflected';
}
function projectileStep(){
 for(const shot of projectiles){
  const old={x:shot.x,y:shot.y};shot.life-=DT;shot.x+=shot.vx*DT;shot.y+=shot.vy*DT;if(shot.type==='arrow')shot.vy+=60*DT;
  if(shot.life<=0||shot.x<0||shot.x>W||shot.y<0||shot.y>FLOOR+6){shot.life=0;continue;}
  let deflected=false;
  if(shot.type==='arrow'&&time>=(shot.deflectUntil||0))for(const f of fighters){if(f!==shot.owner&&f.enemy!==shot.enemy&&projectileBladeHit(shot,old,f)){deflectArrow(shot,f);deflected=true;break;}}
  if(deflected)continue;
  for(const f of fighters){
   if(f.hp<=0||f===shot.owner||f.enemy===shot.enemy)continue;
   const radius=shot.type==='spell'?10:3;
   const hit=f.p.some(p=>closest(p,old,shot)<p.r+radius)||f.links.some(([a,b])=>intersects(old,shot,f.p[a],f.p[b]));
   if(!hit)continue;
   f.hp-=shot.damage;f.flash=.15;f.stun=.12;impulse(f,Math.sign(shot.vx)*38,-18);shot.life=0;
   burst(shot.x,shot.y,shot.type==='spell'?'#caa5ff':f.color,12);texts.push({x:shot.x,y:shot.y-15,life:.8,value:shot.damage});updateHUD();break;
  }
 }
 projectiles=projectiles.filter(p=>p.life>0);
}
function drawProjectiles(){
 for(const p of projectiles){
  if(p.type==='spell'){
   ctx.fillStyle='#c397ff22';ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='#aa6fff';ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eedfff';ctx.beginPath();ctx.arc(p.x-2,p.y-2,3,0,Math.PI*2);ctx.fill();
  }else{const a=Math.atan2(p.vy,p.vx),back={x:p.x-Math.cos(a)*23,y:p.y-Math.sin(a)*23};line(back,p,p.enemy?'#e9c480':'#d4ed85',2);line(p,{x:p.x-Math.cos(a-.5)*7,y:p.y-Math.sin(a-.5)*7},'#f2ead7',2);line(p,{x:p.x-Math.cos(a+.5)*7,y:p.y-Math.sin(a+.5)*7},'#f2ead7',2);}
 }
}
function enemyControl(f){
 const ai=f.ai??={seed:(round+1)*1973+Math.round(f.phase*991)+23,mode:'approach',until:0,nextLook:0,ready:time+.3,seen:null,lastAttack:-1};
 // Decisions use sampled visible motion, not keyboard or mouse input. The gap
 // between observations gives the player a chance to feint or change direction.
 if(time>=ai.nextLook||!ai.seen){
  ai.seen={x:player.p[1].x,y:player.p[1].y,angle:player.angle,angular:player.angular,vx:(player.walk||0)+(player.vx||0),vy:player.vy||0};
  ai.nextLook=time+clamp(.23/f.speed,.1,.28)+enemyRandom(ai)*.045;
 }
 const s=ai.seen,dx=s.x-f.p[1].x,dir=Math.sign(dx)||1,dist=Math.abs(dx),aim=Math.atan2(s.y-f.p[1].y,dx),reach=f.weapon.length+44;
 const predicted=s.angle+clamp(s.angular*.12,-.65,.65),tip={x:s.x+Math.cos(predicted)*(44+player.weapon.length),y:s.y+Math.sin(predicted)*(44+player.weapon.length)};
 const threat=Math.abs(s.angular)>2.4&&dist<player.weapon.length+f.weapon.length+65&&closest(f.p[1],{x:s.x,y:s.y},tip)<55;
 let move=dist>reach*.85?dir:dist<reach*.48?-dir:0,target=aim-dir*.55,jump=false,crouch=false;
 const change=(mode,duration)=>{ai.mode=mode;ai.until=time+duration;};
 if((ai.mode==='approach'||ai.mode==='windup'||ai.mode==='recover')&&threat&&time>=ai.ready){
  ai.guard=Math.atan2(tip.y-f.p[1].y,tip.x-f.p[1].x);
  change(enemyRandom(ai)<.65?'parry':'evade',.2+enemyRandom(ai)*.15);ai.ready=time+.45/f.speed;
 }
 if((ai.mode==='parry'||ai.mode==='evade')&&time>=ai.until){change('approach',0);ai.counter=true;}
 if(ai.mode==='recover'&&time>=ai.until)change('approach',0);
 if(ai.mode==='feint'&&time>=ai.until){change('approach',0);ai.ready=time+.12;}
 if(ai.mode==='windup'&&time>=ai.until){change('strike',(.2+f.weapon.mass*.09)/f.speed);}
 if(ai.mode==='strike'&&time>=ai.until){change('recover',(.25+f.weapon.mass*.1+enemyRandom(ai)*.2)/f.speed);ai.ready=ai.until;}
 if(ai.mode==='approach'&&time>=ai.ready&&dist<reach+65){
  let type=Math.floor(enemyRandom(ai)*3);if(type===ai.lastAttack)type=(type+1)%3;
  ai.lastAttack=type;
  // Choose a different body height, then commit to the arc through that point.
  const hitY=s.y+[-22,18,49][type],attackAim=Math.atan2(hitY-f.p[1].y,dx+s.vx*.1);
  const sign=type===2?-dir:dir;
  ai.start=attackAim-sign*(type===1?.7:1.1);ai.finish=attackAim+sign*(type===1?.65:1.0);ai.direction=dir;
  if(!ai.counter&&enemyRandom(ai)<.16){change('feint',.18+enemyRandom(ai)*.12);}
  else change('windup',(.18+f.weapon.mass*.09+enemyRandom(ai)*.18)*(ai.counter?.65:1)/f.speed);
  ai.counter=false;
 }
 if(ai.mode==='windup'){target=ai.start;move=dist<reach*.7?-dir*.35:dir*.25;}
 if(ai.mode==='strike'){target=ai.finish;move=ai.direction*(f.kind==='dagger'?1.3:.9);crouch=ai.lastAttack===2;}
 if(ai.mode==='recover'){target=aim-dir*.55;move=dist<reach?-dir*.7:0;}
 if(ai.mode==='feint'){target=ai.start;move=dir*.65;}
 if(ai.mode==='parry'){target=ai.guard;move=-dir*.35;}
 if(ai.mode==='evade'){target=ai.guard;move=-dir;const low=tip.y>f.p[0].y-10;jump=low&&dist<150;crouch=!low;}
 // Pursue a retreating player; avoid lining up directly on a nearby teammate.
 if(ai.mode==='approach'&&s.vx*dir>50)move=dir*1.15;
 for(const other of fighters){if(other!==f&&other.enemy&&other.hp>0&&Math.abs(other.p[0].x-f.p[0].x)<48&&Math.abs(other.p[0].y-f.p[0].y)<60)move+=Math.sign(f.p[0].x-other.p[0].x||f.phase-.5)*.45;}
 return{move:clamp(move,-1.3,1.3),target,jump,crouch};
}
function livingStep(f){
 const p=f.p;
 f.root??={x:p[0].x,y:FLOOR-65};f.vx??=0;f.vy??=0;f.walk??=0;f.gait??=0;f.stance??=65;f.lean??=0;
 let move=0,jump=false,crouch=false,target;
 if(!f.enemy){move=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);jump=keys.has('KeyW');crouch=keys.has('KeyS');if(mouse.x!==f.lastMouse.x||mouse.y!==f.lastMouse.y){f.aim=Math.atan2(mouse.y-p[1].y,mouse.x-p[1].x);f.reachAim=clamp(Math.hypot(mouse.x-p[1].x,mouse.y-p[1].y)-f.weapon.length,10,54);f.lastMouse={...mouse};}target=f.aim;}
 else{({move,jump,crouch,target}=(f.ranged?rangedControl(f):enemyControl(f)));}
 f.attackInput=f.enemy||Math.abs(f.reachAim-f.extension)>.2||Math.abs(wrap(target-f.angle))>.025||move!==0||jump||crouch;const active=f.stun>0?.35:1,desired=move*(f.enemy?175*Math.sqrt(f.speed):205)*active*(crouch?.5:1);
 f.walk+=(desired-f.walk)*(1-Math.exp(-22*DT));
 if(Math.abs(f.walk)<.05)f.walk=0;
 f.grounded=f.root.y>=FLOOR-65-.01&&f.vy>=0;
 if(jump&&!f.jumpHeld&&f.grounded){f.vy=-510;f.grounded=false;}f.jumpHeld=jump;
 f.vx*=Math.exp(-(f.grounded?8:1.2)*DT);f.vy+=1050*DT;
 f.root.x=clamp(f.root.x+(f.walk+f.vx)*DT,65,W-65);f.root.y+=f.vy*DT;
 if(f.root.y>=FLOOR-65){f.root.y=FLOOR-65;f.vy=0;f.grounded=true;}
 f.stance+=((crouch?43:65)-f.stance)*(1-Math.exp(-22*DT));
 f.lean*=Math.exp(-6*DT);
 // Supported torso and planted feet do not feed balancing corrections into gravity.
 const hip={x:f.root.x,y:f.root.y+65-f.stance},lean=f.walk*.00045+f.lean;
 const chest={x:hip.x+Math.sin(lean)*38,y:hip.y-Math.cos(lean)*38};
 const head={x:chest.x+Math.sin(lean)*25,y:chest.y-Math.cos(lean)*25};
 if(f.enemy&&time<(f.guardRecovery||0)){f.angular*=Math.exp(-12*DT);}else if(f.enemy){const urgency=f.ai?.mode==='strike'?150:f.ai?.mode==='parry'?190:90;f.angular+=wrap(target-f.angle)*urgency/f.weapon.mass*DT;f.angular*=Math.exp(-10*DT);f.angular=clamp(f.angular,-12*f.speed,12*f.speed);}
 else{
  // Mouse response uses real elapsed time, independent of the slower arena pace.
  const delta=wrap(target-f.angle)*(1-Math.exp(-48*DT/GAME_SPEED));
  f.angular=clamp(delta/DT,-45,45);
 }
 f.recoil=(f.recoil||0)*Math.exp(-10*DT);f.angular+=f.recoil;f.angle+=f.angular*DT;if(!f.enemy)f.aim+=f.recoil*DT;
 f.extension+=(f.reachAim-f.extension)*(1-Math.exp(-48*DT/GAME_SPEED));const hand={x:chest.x+Math.cos(f.angle)*f.extension,y:chest.y+Math.sin(f.angle)*f.extension};
 const offHand={x:hip.x-22,y:hip.y-5};
 const walkAmount=Math.min(1,Math.abs(f.walk)/100);f.gait+=Math.abs(f.walk)*DT*.065;
 const stride=Math.sin(f.gait)*15*walkAmount,groundY=f.root.y+65;
 const footA={x:hip.x-12+stride,y:groundY-(f.grounded?Math.max(0,Math.cos(f.gait))*8*walkAmount:6)};
 const footB={x:hip.x+12-stride,y:groundY-(f.grounded?Math.max(0,-Math.cos(f.gait))*8*walkAmount:6)};
 const pose=[hip,chest,head,jointBetween(chest,offHand,26,27,1),offHand,jointBetween(chest,hand,27,28,1),hand,jointBetween(hip,footA,32,34,-1),footA,jointBetween(hip,footB,32,34,-1),footB];
 for(let i=0;i<p.length;i++){p[i].px=p[i].x;p[i].py=p[i].y;p[i].x=pose[i].x;p[i].y=pose[i].y;}
}
function bodyStep(f){
 f.oldExtension=f.extension;f.oldAngle=f.angle;f.oldChest={x:f.p[1].x,y:f.p[1].y};f.blocked=false;const p=f.p;f.stun=Math.max(0,f.stun-DT);f.flash=Math.max(0,f.flash-DT);
 if(f.hp>0)livingStep(f);
 else{
  f.dead+=DT;f.angular*=.99;f.angle+=f.angular*DT;
  for(const v of p){const vx=(v.x-v.px)*.975,vy=(v.y-v.py)*.98;v.px=v.x;v.py=v.y;v.x+=vx;v.y+=vy+1050*DT*DT;}
  for(let k=0;k<7;k++){
   for(const[a,b,len]of f.links){const dx=p[b].x-p[a].x,dy=p[b].y-p[a].y,d=Math.hypot(dx,dy)||1,err=(d-len)/d*.5;p[a].x+=dx*err;p[a].y+=dy*err;p[b].x-=dx*err;p[b].y-=dy*err;}
   for(const v of p){v.x=clamp(v.x,28,W-28);const floor=FLOOR-(v===p[2]?10:0);if(v.y>floor){v.y=floor;v.px=v.x-(v.x-v.px)*.7;v.py=v.y;}v.y=Math.max(100,v.y);}
  }
 }
 f.oldTip=f.tip?{...f.tip}:null;f.oldBase=f.base?{...f.base}:null;f.base={x:p[6].x,y:p[6].y};f.tip={x:f.base.x+Math.cos(f.angle)*f.weapon.length,y:f.base.y+Math.sin(f.angle)*f.weapon.length};
 f.trail.push({...f.tip});if(f.trail.length>9)f.trail.shift();
}
function closest(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function intersects(a,b,c,d){const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;}
function bladeAt(f,t){
 const chest=f.oldChest||f.p[1],angle=(f.oldAngle??f.angle)+wrap(f.angle-(f.oldAngle??f.angle))*t;
 const x=chest.x+(f.p[1].x-chest.x)*t,y=chest.y+(f.p[1].y-chest.y)*t;
 const extension=(f.oldExtension??f.extension)+(f.extension-(f.oldExtension??f.extension))*t;return{base:{x:x+Math.cos(angle)*extension,y:y+Math.sin(angle)*extension},tip:{x:x+Math.cos(angle)*(extension+f.weapon.length),y:y+Math.sin(angle)*(extension+f.weapon.length)}};
}
function bladesTouch(a,b,radius){return intersects(a.base,a.tip,b.base,b.tip)||Math.min(closest(a.base,b.base,b.tip),closest(a.tip,b.base,b.tip),closest(b.base,a.base,a.tip),closest(b.tip,a.base,a.tip))<=radius;}
function stopAtContact(f,t){
 f.angle=(f.oldAngle??f.angle)+wrap(f.angle-(f.oldAngle??f.angle))*t;
 f.extension=(f.oldExtension??f.extension)+(f.extension-(f.oldExtension??f.extension))*t;
 // Resolve weapon rotation only: never rewind locomotion, gravity or crouching.
 const chest=f.p[1];f.base={x:chest.x+Math.cos(f.angle)*f.extension,y:chest.y+Math.sin(f.angle)*f.extension};f.tip={x:f.base.x+Math.cos(f.angle)*f.weapon.length,y:f.base.y+Math.sin(f.angle)*f.weapon.length};
 Object.assign(f.p[6],f.base);Object.assign(f.p[5],jointBetween(chest,f.base,27,28,1));
 f.blocked=true;f.trail=[{...f.tip}];
 if(f.enemy)f.guardRecovery=time+.08;
 else {f.aim=f.angle;f.reachAim=f.extension;} // No automatic counterattack or retry after a blocked swing.
}
function resolveBlock(a,b){
 if(a.ranged||b.ranged||!a.oldTip||!b.oldTip)return false;
 const radius=(a.weapon.width+b.weapon.width)*.5+2;
 const travel=f=>Math.abs(wrap(f.angle-(f.oldAngle??f.angle)))*(54+f.weapon.length)+Math.abs(f.extension-(f.oldExtension??f.extension))+Math.hypot(f.p[1].x-(f.oldChest?.x??f.p[1].x),f.p[1].y-(f.oldChest?.y??f.p[1].y));
 const count=Math.max(1,Math.ceil((travel(a)+travel(b))/2));
 const initial=bladesTouch(bladeAt(a,0),bladeAt(b,0),radius);
 // Residual overlap is not a new impact. Let rotation and translation separate it
 // without latching either sword or creating energy from repeated contact.
 if(initial){
  if(!bladesTouch(bladeAt(a,1),bladeAt(b,1),radius))return false;
  a.blocked=b.blocked=true;return true;
 }
 for(let i=initial?0:1;i<=count;i++){
  const t=i/count,aa=bladeAt(a,t),bb=bladeAt(b,t);
  if(!bladesTouch(aa,bb,radius))continue;
  const safe=Math.max(0,(i-1)/count);
  // Transfer the incoming blade momentum into both bodies, including vertical recoil.
  a.contacts??=new Map();
  const previous=a.contacts.get(b)??-1;
  if(!initial&&time-previous>.1){
   const velocity=f=>({x:(f.tip.x-f.oldTip.x)/DT,y:(f.tip.y-f.oldTip.y)/DT});
   const va=velocity(a),vb=velocity(b),mass=2*a.weapon.mass*b.weapon.mass/(a.weapon.mass+b.weapon.mass);
   const rx=va.x-vb.x,ry=va.y-vb.y,speed=Math.hypot(rx,ry);
   if(speed>35){
    const scale=Math.min(.13*mass,165/(speed||1));
    impulse(a,-rx*scale,-ry*scale);impulse(b,rx*scale,ry*scale);
    a.recoil=clamp(-a.angular*.25,-8,8);b.recoil=clamp(-b.angular*.25,-8,8);
    // A stationary guard also yields under the impact instead of becoming a fixed hinge.
    if(Math.abs(a.angular)<.2)a.recoil=clamp((Math.cos(a.angle)*ry-Math.sin(a.angle)*rx)*.004,-5,5);
    if(Math.abs(b.angular)<.2)b.recoil=clamp(-(Math.cos(b.angle)*ry-Math.sin(b.angle)*rx)*.004,-5,5);
    a.contacts.set(b,time);
   }
  }
  stopAtContact(a,safe);stopAtContact(b,safe);
  if(time-(a.clash??-1)>.12&&time-(b.clash??-1)>.12){
   a.clash=b.clash=time;
   const points=[aa.base,aa.tip,bb.base,bb.tip];let contact=points[0],distance=Infinity;
   for(let n=0;n<4;n++){const other=n<2?bb:aa,d=closest(points[n],other.base,other.tip);if(d<distance){distance=d;contact=points[n];}}
   burst(contact.x,contact.y,'#f9e4ad',8);tone(530);$('#feedback').textContent='Blocked';
  }
  return true;
 }
 return false;
}
function burst(x,y,color,count=12){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=50+Math.random()*210;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+Math.random()*.35,color});}}
function combat(){
 for(let i=0;i<fighters.length;i++)for(let j=i+1;j<fighters.length;j++){const a=fighters[i],b=fighters[j];if(a.hp>0&&b.hp>0&&a.enemy!==b.enemy)resolveBlock(a,b);}
 for(let i=0;i<fighters.length;i++)for(let j=i+1;j<fighters.length;j++){
 const a=fighters[i],b=fighters[j];if(a.hp<=0||b.hp<=0)continue;
 const dx=b.p[0].x-a.p[0].x,dy=b.p[0].y-a.p[0].y,d=Math.hypot(dx,dy);if(d<38){const push=(38-d)*.15;impulse(a,-Math.sign(dx||1)*push*12,0);impulse(b,Math.sign(dx||1)*push*12,0);}
 if(a.enemy===b.enemy)continue;

 for(const [att,def]of [[a,b],[b,a]]){
 if(att.ranged||!att.attackInput||att.blocked||!att.oldTip||time-(att.hits.get(def)??-1)<.38)continue;
 const velocity=Math.hypot(att.tip.x-att.oldTip.x,att.tip.y-att.oldTip.y)/DT;if(velocity<105)continue;
 let hit=null,head=false;for(let n=0;n<def.p.length;n++){const p=def.p[n];if(closest(p,att.base,att.tip)<p.r+att.weapon.width+3||closest(p,att.oldTip,att.tip)<p.r+att.weapon.width+3){hit=p;head=n===2;break;}}
 if(!hit)continue;att.hits.set(def,time);const damage=clamp(velocity*.024*att.weapon.mass,6,32)*(head?1.25:1)*(att.enemy?.72:1);def.hp-=damage;def.stun=.2;def.flash=.13;
 const vx=(att.tip.x-att.oldTip.x)/DT,vy=(att.tip.y-att.oldTip.y)/DT;impulse(def,clamp(vx*.07,-75,75),clamp(vy*.05-15,-65,55));att.angular*=.65;shake=clamp(damage*.25,2,8);burst(hit.x,hit.y,def.color);texts.push({x:hit.x,y:hit.y-20,life:.8,value:Math.ceil(damage)});tone(def.hp<=0?100:220);
 if(def.hp<=0){impulse(def,Math.sign(vx)*90,-95);burst(hit.x,hit.y,def.color,24);$('#feedback').textContent=def.enemy?'Enemy defeated.':'Defeated.';}updateHUD();
 }
 }
}
function step(){time+=DT;fighters.forEach(bodyStep);if(state==='playing'){combat();projectileStep();}for(const p of particles){p.x+=p.vx*DT;p.y+=p.vy*DT;p.vy+=400*DT;p.life-=DT;}particles=particles.filter(p=>p.life>0);for(const t of texts){t.y-=35*DT;t.life-=DT;}texts=texts.filter(t=>t.life>0);shake*=.95;
 if(state==='playing'){if(player.hp<=0){clearTimer+=DT;if(clearTimer>1.2){state='lost';overlay('','Defeated',levels[round][1]+' Try moving your mouse in a sweeping arc through your opponent.','Try again');}}else if(fighters.every(f=>!f.enemy||f.hp<=0)){clearTimer+=DT;if(clearTimer>1.3){unlocked=Math.max(unlocked,Math.min(levels.length-1,round+1));try{localStorage.setItem('iron-string-level',unlocked);}catch{}renderLevels();state=round===levels.length-1?'complete':'won';overlay(round===levels.length-1?'COMPLETE':'ROUND CLEARED',round===levels.length-1?'You win':'Round complete',round===levels.length-1?'All rounds completed.':`Up next: ${levels[round+1][0]}. ${levels[round+1][1]}`,round===levels.length-1?'Play again':'Next round');}}}
}
function line(a,b,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function drawFighter(f){const p=f.p;ctx.globalAlpha=f.hp<=0?.55:1;const color=f.flash>0?'#fff':f.color;ctx.lineCap='round';ctx.lineJoin='round';
 ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(p[0].x,FLOOR+5,45,6,0,0,Math.PI*2);ctx.fill();
 for(const[a,b]of f.links){if(b===2)continue;line(p[a],p[b],color,b>=7?7:6);}ctx.strokeStyle=color;ctx.lineWidth=6;ctx.fillStyle='#1a2623';ctx.beginPath();ctx.arc(p[2].x,p[2].y,12,0,Math.PI*2);ctx.fill();ctx.stroke();
 for(const n of [0,3,5,7,9]){ctx.fillStyle=color;ctx.beginPath();ctx.arc(p[n].x,p[n].y,3.8,0,Math.PI*2);ctx.fill();}
 if(f.base&&f.ranged){
  ctx.save();ctx.translate(f.base.x,f.base.y);ctx.rotate(f.angle);
  if(f.kind==='archer'){ctx.strokeStyle='#d2ac6c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-30);ctx.quadraticCurveTo(25,0,0,30);ctx.stroke();line({x:0,y:-30},{x:f.ai?.mode==='charge'?-12:0,y:0},'#e8dfc6',1);line({x:f.ai?.mode==='charge'?-12:0,y:0},{x:0,y:30},'#e8dfc6',1);if(f.ai?.mode==='charge')line({x:-12,y:0},{x:30,y:0},'#edcd83',2);}
  else{line({x:-12,y:0},{x:45,y:0},'#8870a8',5);ctx.fillStyle=f.ai?.mode==='charge'?'#f1dcff':'#bc8af4';ctx.beginPath();ctx.arc(48,0,f.ai?.mode==='charge'?10+Math.sin(time*16)*2:7,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  if(f.kind==='mage'){ctx.fillStyle='#9673bd';ctx.beginPath();ctx.moveTo(p[2].x-17,p[2].y-9);ctx.lineTo(p[2].x+2,p[2].y-38);ctx.lineTo(p[2].x+17,p[2].y-9);ctx.fill();}
  if(f.ai?.mode==='charge'){ctx.fillStyle=f.kind==='mage'?'#d5afff':'#edcd83';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText(f.kind==='mage'?'DODGE':'ARROW',p[2].x,p[2].y-47);}
 }
 if(f.base&&!f.ranged){if(f.hp>0&&Math.abs(f.angular)>3){for(let i=1;i<f.trail.length;i++){ctx.globalAlpha=i/f.trail.length*.22;line(f.trail[i-1],f.trail[i],f.color,3);}ctx.globalAlpha=1;}
 const a=f.angle,b=f.base,t=f.tip;line({x:b.x-Math.cos(a)*13,y:b.y-Math.sin(a)*13},t,'#d1d8cc',f.weapon.width);line(b,{x:b.x+Math.cos(a)*16,y:b.y+Math.sin(a)*16},'#766d55',7);
 const guard={x:b.x+Math.cos(a)*15,y:b.y+Math.sin(a)*15};line({x:guard.x-Math.sin(a)*10,y:guard.y+Math.cos(a)*10},{x:guard.x+Math.sin(a)*10,y:guard.y-Math.cos(a)*10},'#a6b39a',4);
 ctx.save();ctx.translate(t.x,t.y);ctx.rotate(a);ctx.fillStyle='#cdd3c3';if(f.kind==='axe'){ctx.beginPath();ctx.moveTo(-22,-4);ctx.lineTo(-34,-23);ctx.quadraticCurveTo(6,-26,8,19);ctx.lineTo(-18,14);ctx.fill();}if(f.kind==='hammer'){ctx.fillRect(-21,-22,24,44);ctx.strokeStyle='#87937d';ctx.lineWidth=2;ctx.strokeRect(-21,-22,24,44);}if(f.kind==='spear'){ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-20,-8);ctx.lineTo(-14,0);ctx.lineTo(-20,8);ctx.closePath();ctx.fill();}ctx.restore();}
 if(f.enemy&&f.hp>0){ctx.globalAlpha=.8;ctx.fillStyle='#475043';ctx.fillRect(p[2].x-24,p[2].y-32,48,3);ctx.fillStyle=f.color;ctx.fillRect(p[2].x-24,p[2].y-32,48*f.hp/f.maxHp,3);}ctx.globalAlpha=1;
}
function draw(){ctx.clearRect(0,0,W,H);ctx.save();
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#172421');grad.addColorStop(1,'#303b2e');ctx.fillStyle=grad;ctx.fillRect(-10,-10,W+20,H+20);
 ctx.strokeStyle='#8291780b';ctx.lineWidth=1;for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 for(let x=120;x<W;x+=240){ctx.fillStyle='#111c1b66';ctx.fillRect(x,140,100,410);ctx.strokeStyle='#61705722';ctx.lineWidth=2;ctx.strokeRect(x,140,100,410);ctx.beginPath();ctx.arc(x+50,190,34,Math.PI,0);ctx.lineTo(x+84,490);ctx.lineTo(x+16,490);ctx.closePath();ctx.stroke();}
 ctx.textAlign='center';ctx.font='800 120px "Barlow Condensed", Impact';ctx.fillStyle='#b6c39e07';
 const glow=ctx.createRadialGradient(600,120,5,600,300,590);glow.addColorStop(0,'#d3e6a40b');glow.addColorStop(1,'#d3e6a400');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#19211d';ctx.fillRect(0,FLOOR+8,W,H-FLOOR);line({x:0,y:FLOOR+9},{x:W,y:FLOOR+9},'#788465',2);for(let x=15;x<W;x+=40)line({x,y:FLOOR+17},{x:x-20,y:FLOOR+40},'#3b4734',1);
 fighters.filter(f=>f.hp<=0).forEach(drawFighter);fighters.filter(f=>f.hp>0).forEach(drawFighter);
 drawProjectiles();
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;ctx.font='bold 17px monospace';for(const t of texts){ctx.globalAlpha=Math.min(1,t.life*2);ctx.fillStyle='#f1e8c9';ctx.fillText(t.value,t.x,t.y);}ctx.globalAlpha=1;
 if(state==='playing'){ctx.strokeStyle='#d4ed8570';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mouse.x,mouse.y,7,0,Math.PI*2);ctx.stroke();line({x:mouse.x-11,y:mouse.y},{x:mouse.x+11,y:mouse.y},'#d4ed8570',1);line({x:mouse.x,y:mouse.y-11},{x:mouse.x,y:mouse.y+11},'#d4ed8570',1);}ctx.restore();}
let last=0,acc=0;function frame(ms){acc+=Math.min((ms-last)/1000,.05)*GAME_SPEED;last=ms;if(state==='playing'){while(acc>=DT){step();acc-=DT;if(state!=='playing'){acc=0;break;}}}else acc=0;draw();requestAnimationFrame(frame);}loadLevel(0,false);fighters.forEach(bodyStep);requestAnimationFrame(frame);











