/* Stickfight: fixed-step Verlet bodies, distance joints, spring-driven weapons. */
'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s),W=1200,H=660,FLOOR=552,DT=1/120,GAME_SPEED=.8;
const weapons={sword:{name:'Arming sword',length:81,mass:1,width:5},long:{name:'Greatsword',length:119,mass:1.65,width:7},axe:{name:'Battle axe',length:76,mass:1.9,width:7},spear:{name:'War spear',length:145,mass:1.2,width:4},dagger:{name:'Short blade',length:55,mass:.65,width:4},hammer:{name:'War hammer',length:85,mass:2.1,width:7}};
const levels=[['Swordsman','Defeat the swordsman.',['sword'],.8],['Greatsword','Get inside the longer blade’s reach.',['long'],.85],['Axe','Attack after the axe swing.',['axe'],.9],['Duelist','A faster opponent with a short blade.',['dagger'],1.5],['Spear','Close the gap on the spear fighter.',['spear'],1],['Two opponents','Keep both enemies in front of you.',['sword','dagger'],1],['Hammer','Defeat the hammer fighter and swordsman.',['hammer','sword'],.95],['Fast opponents','Two faster enemies.',['dagger','long'],1.45],['Three opponents','Defeat all three enemies.',['axe','spear','sword'],1.1],['Final round','Three enemies with different weapons.',['long','hammer','dagger'],1.4]];
let unlocked=0;try{unlocked=Math.max(0,Math.min(9,Number(localStorage.getItem('iron-string-level'))||0));}catch{}
let round=0,state='menu',fighters=[],player,particles=[],texts=[],time=0,shake=0,clearTimer=0,sound=false,audio,pausedFrom='playing';
const keys=new Set(),mouse={x:650,y:330},clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function point(x,y,r=5){return{x,y,px:x,py:y,r};}
function makeFighter(x,enemy,weapon='sword',speed=1,index=0){
 const y=FLOOR-65,p=[point(x,y),point(x,y-38),point(x,y-63,13),point(x-14,y-16),point(x-23,y+3),point(x+19,y-20),point(x+35,y-29),point(x-14,y+29),point(x-19,y+62),point(x+15,y+28),point(x+23,y+62)];
 const links=[[0,1,38],[1,2,25],[1,3,26],[3,4,27],[1,5,27],[5,6,28],[0,7,32],[7,8,34],[0,9,32],[9,10,34]];
 return{p,links,enemy,weapon:weapons[weapon],kind:weapon,speed,hp:enemy?80+round*4:100,maxHp:enemy?80+round*4:100,angle:enemy?Math.PI:-.4,angular:0,tip:null,base:null,oldTip:null,oldBase:null,hits:new Map(),stun:0,flash:0,phase:index*1.7,grounded:true,dead:0,color:enemy?'#eb987a':'#d6f19a',trail:[]};
}
function loadLevel(n,play=true){round=n;time=0;clearTimer=0;particles=[];texts=[];shake=0;fighters=[makeFighter(290,false)];player=fighters[0];levels[n][2].forEach((w,i)=>fighters.push(makeFighter(740+i*135,true,w,levels[n][3],i)));state=play?'playing':'menu';$('#overlay').classList.toggle('hidden',play);$('#round').textContent=`ROUND ${String(n+1).padStart(2,'0')} / 10`;$('#level-name').textContent=levels[n][0];$('#feedback').textContent=levels[n][1];updateHUD();renderLevels();}
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
 if(f.hp>0){f.vx=(f.vx||0)+x;f.vy=(f.vy||0)+y;f.lean=clamp((f.lean||0)+x*.0015,-.4,.4);}
 for(const p of f.p){p.px-=x*DT;p.py-=y*DT;}
}
function jointBetween(a,b,l1,l2,bend){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy));
 const along=clamp((l1*l1-l2*l2+d*d)/(2*d),-l1,l1),side=Math.sqrt(Math.max(0,l1*l1-along*along))*bend;
 return{x:a.x+dx/d*along-dy/d*side,y:a.y+dy/d*along+dx/d*side};
}
function livingStep(f){
 const p=f.p;
 f.root??={x:p[0].x,y:FLOOR-65};f.vx??=0;f.vy??=0;f.walk??=0;f.gait??=0;f.stance??=65;f.lean??=0;
 let move=0,jump=false,crouch=false,target;
 if(!f.enemy){move=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);jump=keys.has('KeyW');crouch=keys.has('KeyS');target=Math.atan2(mouse.y-p[1].y,mouse.x-p[1].x);}
 else{const dx=player.p[0].x-p[0].x,dist=Math.abs(dx),dir=Math.sign(dx)||1,reach=f.weapon.length+32;move=dist>reach*.85?dir:dist<reach*.5?-dir*.6:0;const cycle=(time*f.speed*.8+f.phase)%2.05;target=Math.atan2(player.p[1].y-p[1].y,dx)+dir*(cycle<1.2?-1.25:1.25);if(cycle<1.2)move*=.65;}
 const active=f.stun>0?.35:1,desired=move*(f.enemy?85*f.speed:145)*active*(crouch?.5:1);
 f.walk+=(desired-f.walk)*(1-Math.exp(-22*DT));
 if(Math.abs(f.walk)<.05)f.walk=0;
 f.grounded=f.root.y>=FLOOR-65-.01&&f.vy>=0;
 if(jump&&!f.jumpHeld&&f.grounded){f.vy=-340;f.grounded=false;}f.jumpHeld=jump;
 f.vx*=Math.exp(-(f.grounded?12:3)*DT);f.vy+=1050*DT;
 f.root.x=clamp(f.root.x+(f.walk+f.vx)*DT,65,W-65);f.root.y+=f.vy*DT;
 if(f.root.y>=FLOOR-65){f.root.y=FLOOR-65;f.vy=0;f.grounded=true;}
 f.stance+=((crouch?43:65)-f.stance)*(1-Math.exp(-22*DT));
 f.lean*=Math.exp(-12*DT);
 // Supported torso and planted feet do not feed balancing corrections into gravity.
 const hip={x:f.root.x,y:f.root.y+65-f.stance},lean=f.walk*.00045+f.lean;
 const chest={x:hip.x+Math.sin(lean)*38,y:hip.y-Math.cos(lean)*38};
 const head={x:chest.x+Math.sin(lean)*25,y:chest.y-Math.cos(lean)*25};
 if(f.enemy){f.angular+=wrap(target-f.angle)*60/f.weapon.mass*DT;f.angular*=Math.exp(-9*DT);f.angular=clamp(f.angular,-9,9);}
 else{
  // Mouse response uses real elapsed time, independent of the slower arena pace.
  const delta=wrap(target-f.angle)*(1-Math.exp(-48*DT/GAME_SPEED));
  f.angular=clamp(delta/DT,-45,45);
 }
 f.angle+=f.angular*DT;
 const hand={x:chest.x+Math.cos(f.angle)*44,y:chest.y+Math.sin(f.angle)*44};
 const offHand={x:hip.x-22,y:hip.y-5};
 const walkAmount=Math.min(1,Math.abs(f.walk)/100);f.gait+=Math.abs(f.walk)*DT*.065;
 const stride=Math.sin(f.gait)*15*walkAmount,groundY=f.root.y+65;
 const footA={x:hip.x-12+stride,y:groundY-(f.grounded?Math.max(0,Math.cos(f.gait))*8*walkAmount:6)};
 const footB={x:hip.x+12-stride,y:groundY-(f.grounded?Math.max(0,-Math.cos(f.gait))*8*walkAmount:6)};
 const pose=[hip,chest,head,jointBetween(chest,offHand,26,27,1),offHand,jointBetween(chest,hand,27,28,1),hand,jointBetween(hip,footA,32,34,-1),footA,jointBetween(hip,footB,32,34,-1),footB];
 for(let i=0;i<p.length;i++){p[i].px=p[i].x;p[i].py=p[i].y;p[i].x=pose[i].x;p[i].y=pose[i].y;}
}
function bodyStep(f){
 const p=f.p;f.stun=Math.max(0,f.stun-DT);f.flash=Math.max(0,f.flash-DT);
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
function burst(x,y,color,count=12){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=50+Math.random()*210;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+Math.random()*.35,color});}}
function combat(){
 for(let i=0;i<fighters.length;i++)for(let j=i+1;j<fighters.length;j++){
 const a=fighters[i],b=fighters[j];if(a.hp<=0||b.hp<=0)continue;
 const dx=b.p[0].x-a.p[0].x,dy=b.p[0].y-a.p[0].y,d=Math.hypot(dx,dy);if(d<38){const push=(38-d)*.15;impulse(a,-Math.sign(dx||1)*push*12,0);impulse(b,Math.sign(dx||1)*push*12,0);}
 if(a.enemy===b.enemy)continue;
 if(intersects(a.base,a.tip,b.base,b.tip)&&time-(a.clash??-1)>.16){a.clash=b.clash=time;a.angular*=-.45;b.angular*=-.45;burst((a.tip.x+b.tip.x)/2,(a.tip.y+b.tip.y)/2,'#f9e4ad');tone(530);shake=3;continue;}
 for(const [att,def]of [[a,b],[b,a]]){
 if(!att.oldTip||time-(att.hits.get(def)??-1)<.38||time-(att.clash??-1)<.07)continue;
 const velocity=Math.hypot(att.tip.x-att.oldTip.x,att.tip.y-att.oldTip.y)/DT;if(velocity<105)continue;
 let hit=null,head=false;for(let n=0;n<def.p.length;n++){const p=def.p[n];if(closest(p,att.base,att.tip)<p.r+att.weapon.width+3||closest(p,att.oldTip,att.tip)<p.r+att.weapon.width+3){hit=p;head=n===2;break;}}
 if(!hit)continue;att.hits.set(def,time);const damage=clamp(velocity*.024*att.weapon.mass,6,32)*(head?1.25:1)*(att.enemy?.72:1);def.hp-=damage;def.stun=.2;def.flash=.13;
 const vx=(att.tip.x-att.oldTip.x)/DT,vy=(att.tip.y-att.oldTip.y)/DT;impulse(def,clamp(vx*.12,-120,120),clamp(vy*.09-30,-120,85));att.angular*=.65;shake=clamp(damage*.25,2,8);burst(hit.x,hit.y,def.color);texts.push({x:hit.x,y:hit.y-20,life:.8,value:Math.ceil(damage)});tone(def.hp<=0?100:220);
 if(def.hp<=0){impulse(def,Math.sign(vx)*90,-95);burst(hit.x,hit.y,def.color,24);$('#feedback').textContent=def.enemy?'Enemy defeated.':'Defeated.';}updateHUD();
 }
 }
}
function step(){time+=DT;fighters.forEach(bodyStep);if(state==='playing')combat();for(const p of particles){p.x+=p.vx*DT;p.y+=p.vy*DT;p.vy+=400*DT;p.life-=DT;}particles=particles.filter(p=>p.life>0);for(const t of texts){t.y-=35*DT;t.life-=DT;}texts=texts.filter(t=>t.life>0);shake*=.95;
 if(state==='playing'){if(player.hp<=0){clearTimer+=DT;if(clearTimer>1.2){state='lost';overlay('','Defeated',levels[round][1]+' Try moving your mouse in a sweeping arc through your opponent.','Try again');}}else if(fighters.every(f=>!f.enemy||f.hp<=0)){clearTimer+=DT;if(clearTimer>1.3){unlocked=Math.max(unlocked,Math.min(9,round+1));try{localStorage.setItem('iron-string-level',unlocked);}catch{}renderLevels();state=round===9?'complete':'won';overlay(round===9?'COMPLETE':'ROUND CLEARED',round===9?'You win':'Round complete',round===9?'All ten rounds completed.':`Up next: ${levels[round+1][0]}. ${levels[round+1][1]}`,round===9?'Play again':'Next round');}}}
}
function line(a,b,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function drawFighter(f){const p=f.p;ctx.globalAlpha=f.hp<=0?.55:1;const color=f.flash>0?'#fff':f.color;ctx.lineCap='round';ctx.lineJoin='round';
 ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(p[0].x,FLOOR+5,45,6,0,0,Math.PI*2);ctx.fill();
 for(const[a,b]of f.links){if(b===2)continue;line(p[a],p[b],color,b>=7?7:6);}ctx.strokeStyle=color;ctx.lineWidth=6;ctx.fillStyle='#1a2623';ctx.beginPath();ctx.arc(p[2].x,p[2].y,12,0,Math.PI*2);ctx.fill();ctx.stroke();
 for(const n of [0,3,5,7,9]){ctx.fillStyle=color;ctx.beginPath();ctx.arc(p[n].x,p[n].y,3.8,0,Math.PI*2);ctx.fill();}
 if(f.base){if(f.hp>0&&Math.abs(f.angular)>3){for(let i=1;i<f.trail.length;i++){ctx.globalAlpha=i/f.trail.length*.22;line(f.trail[i-1],f.trail[i],f.color,3);}ctx.globalAlpha=1;}
 const a=f.angle,b=f.base,t=f.tip;line({x:b.x-Math.cos(a)*13,y:b.y-Math.sin(a)*13},t,'#d1d8cc',f.weapon.width);line(b,{x:b.x+Math.cos(a)*16,y:b.y+Math.sin(a)*16},'#766d55',7);
 const guard={x:b.x+Math.cos(a)*15,y:b.y+Math.sin(a)*15};line({x:guard.x-Math.sin(a)*10,y:guard.y+Math.cos(a)*10},{x:guard.x+Math.sin(a)*10,y:guard.y-Math.cos(a)*10},'#a6b39a',4);
 ctx.save();ctx.translate(t.x,t.y);ctx.rotate(a);ctx.fillStyle='#cdd3c3';if(f.kind==='axe'){ctx.beginPath();ctx.moveTo(-22,-4);ctx.lineTo(-34,-23);ctx.quadraticCurveTo(6,-26,8,19);ctx.lineTo(-18,14);ctx.fill();}if(f.kind==='hammer'){ctx.fillRect(-21,-22,24,44);ctx.strokeStyle='#87937d';ctx.lineWidth=2;ctx.strokeRect(-21,-22,24,44);}if(f.kind==='spear'){ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-20,-8);ctx.lineTo(-14,0);ctx.lineTo(-20,8);ctx.closePath();ctx.fill();}ctx.restore();}
 if(f.enemy&&f.hp>0){ctx.globalAlpha=.8;ctx.fillStyle='#475043';ctx.fillRect(p[2].x-24,p[2].y-32,48,3);ctx.fillStyle=f.color;ctx.fillRect(p[2].x-24,p[2].y-32,48*f.hp/f.maxHp,3);}ctx.globalAlpha=1;
}
function draw(){ctx.clearRect(0,0,W,H);ctx.save();ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#172421');grad.addColorStop(1,'#303b2e');ctx.fillStyle=grad;ctx.fillRect(-10,-10,W+20,H+20);
 ctx.strokeStyle='#8291780b';ctx.lineWidth=1;for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 for(let x=120;x<W;x+=240){ctx.fillStyle='#111c1b66';ctx.fillRect(x,140,100,410);ctx.strokeStyle='#61705722';ctx.lineWidth=2;ctx.strokeRect(x,140,100,410);ctx.beginPath();ctx.arc(x+50,190,34,Math.PI,0);ctx.lineTo(x+84,490);ctx.lineTo(x+16,490);ctx.closePath();ctx.stroke();}
 ctx.textAlign='center';ctx.font='800 120px "Barlow Condensed", Impact';ctx.fillStyle='#b6c39e07';
 const glow=ctx.createRadialGradient(600,120,5,600,300,590);glow.addColorStop(0,'#d3e6a40b');glow.addColorStop(1,'#d3e6a400');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#19211d';ctx.fillRect(0,FLOOR+8,W,H-FLOOR);line({x:0,y:FLOOR+9},{x:W,y:FLOOR+9},'#788465',2);for(let x=15;x<W;x+=40)line({x,y:FLOOR+17},{x:x-20,y:FLOOR+40},'#3b4734',1);
 fighters.filter(f=>f.hp<=0).forEach(drawFighter);fighters.filter(f=>f.hp>0).forEach(drawFighter);
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;ctx.font='bold 17px monospace';for(const t of texts){ctx.globalAlpha=Math.min(1,t.life*2);ctx.fillStyle='#f1e8c9';ctx.fillText(t.value,t.x,t.y);}ctx.globalAlpha=1;
 if(state==='playing'){ctx.strokeStyle='#d4ed8570';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mouse.x,mouse.y,7,0,Math.PI*2);ctx.stroke();line({x:mouse.x-11,y:mouse.y},{x:mouse.x+11,y:mouse.y},'#d4ed8570',1);line({x:mouse.x,y:mouse.y-11},{x:mouse.x,y:mouse.y+11},'#d4ed8570',1);}ctx.restore();}
let last=0,acc=0;function frame(ms){acc+=Math.min((ms-last)/1000,.05)*GAME_SPEED;last=ms;if(state==='playing'){while(acc>=DT){step();acc-=DT;if(state!=='playing'){acc=0;break;}}}else acc=0;draw();requestAnimationFrame(frame);}loadLevel(0,false);fighters.forEach(bodyStep);requestAnimationFrame(frame);






