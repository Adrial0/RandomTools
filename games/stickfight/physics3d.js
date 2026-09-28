/* Standalone deterministic 3D simulation. Rendering and input live in game3d.js. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const V=(x=0,y=0,z=0)=>({x,y,z}),add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z),sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z),mul=(a,s)=>V(a.x*s,a.y*s,a.z*s),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,cross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x),len=a=>Math.hypot(a.x,a.y,a.z),norm=a=>mul(a,1/(len(a)||1)),mix=(a,b,t)=>add(a,mul(sub(b,a),t)),dist=(a,b)=>len(sub(a,b));
const direction=(yaw,pitch=0)=>V(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
function segmentPair(a,b,c,d){
 const u=sub(b,a),v=sub(d,c),w=sub(a,c),aa=dot(u,u),bb=dot(u,v),cc=dot(v,v),dd=dot(u,w),ee=dot(v,w);let s=0,t=0;
 if(aa<1e-9&&cc<1e-9)return{distance:dist(a,c),a:{...a},b:{...c}};
 if(aa<1e-9)t=clamp(ee/cc,0,1);
 else if(cc<1e-9)s=clamp(-dd/aa,0,1);
 else{const den=aa*cc-bb*bb;s=den>1e-9?clamp((bb*ee-cc*dd)/den,0,1):0;t=(bb*s+ee)/cc;if(t<0){t=0;s=clamp(-dd/aa,0,1);}else if(t>1){t=1;s=clamp((bb-dd)/aa,0,1);}}
 const pa=add(a,mul(u,s)),pb=add(c,mul(v,t));return{distance:dist(pa,pb),a:pa,b:pb};
}
const weapons={sword:{length:1.12,mass:1,radius:.055},long:{length:1.65,mass:1.55,radius:.07},axe:{length:1.0,mass:1.8,radius:.14},dagger:{length:.72,mass:.7,radius:.045},spear:{length:2.1,mass:1.15,radius:.05},hammer:{length:1.05,mass:2,radius:.16},archer:{length:.65,mass:.7,radius:.06},mage:{length:.95,mass:1,radius:.07}};
const levels=[
 ['Swordsman',['sword'],.8,[]],['Archer',['archer'],.9,[]],['Spellcaster',['mage'],.9,[]],['Greatsword',['long'],.95,[]],['Covering fire',['sword','archer'],1,[]],['Axe',['axe'],1,[]],['Duelist',['dagger'],1.4,[]],['Arcane guard',['sword','mage'],1,[0]],['Spear guard',['spear','dagger','archer','archer'],1.05,[0]],['War band',['hammer','sword','archer','archer','mage'],1.05,[1]],['Raiding party',['dagger','long','spear','archer','archer','mage'],1.2,[2]],['Twin casters',['axe','sword','archer','archer','mage','mage'],1.1,[1]],['Crossfire',['spear','long','dagger','archer','archer','archer','mage','mage'],1.15,[0,1]],['Final round',['axe','hammer','spear','archer','archer','archer','mage','mage'],1.25,[1,2]]
];
const links=[[0,1],[1,2],[1,3],[3,4],[1,5],[5,6],[0,7],[7,8],[0,9],[9,10]];
function elbow(a,b,l1,l2,bend){const delta=sub(b,a),d=Math.max(.001,len(delta)),axis=norm(delta),along=clamp((l1*l1-l2*l2+d*d)/(2*d),-l1,l1),height=Math.sqrt(Math.max(0,l1*l1-along*along));let side=norm(sub(bend,mul(axis,dot(bend,axis))));if(len(side)<.1)side=norm(cross(axis,V(0,0,1)));return add(add(a,mul(axis,along)),mul(side,height));}
class World{
 constructor(){this.bounds={x:18,z:15};this.load(0);}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 fighter(pos,enemy,kind='sword',slot=0){return{id:++this.serial,pos:{...pos},vel:V(),walk:V(),yaw:enemy?Math.PI:0,enemy,kind,weapon:weapons[kind],ranged:kind==='mage'||kind==='archer',role:'assault',slot,speed:enemy?levels[this.level][2]:1,hp:enemy?75+this.level*3:100,maxHp:enemy?75+this.level*3:100,guardYaw:0,guardPitch:.12,targetYaw:0,targetPitch:.12,extension:.64,targetExtension:.64,recoilYaw:0,recoilPitch:0,stun:0,flash:0,grounded:true,crouch:0,gait:0,pose:[],previous:[],blade:null,oldBlade:null,hits:new Map(),clashes:new Map(),jumpHeld:false,attack:false,ragdoll:null,ai:{mode:'approach',until:.5+slot*.13,look:0,seen:null,type:-1}};}
 load(n){this.level=clamp(n,0,levels.length-1);this.time=0;this.seed=1777+n*993;this.serial=0;this.events=[];this.projectiles=[];this.zones=[];this.mageTurn=0;this.nextCast=.9;this.state='playing';this.endTimer=0;this.player=this.fighter(V(0,0,8),false);this.fighters=[this.player];const wave=levels[this.level];wave[1].forEach((kind,i)=>{const count=wave[1].length,x=count===1?0:(i-(count-1)/2)*2.6,z=kind==='mage'?-9:kind==='archer'?-6:-2.5;const f=this.fighter(V(x,0,z),true,kind,i);f.role=wave[3].includes(i)?'guard':'assault';this.fighters.push(f);});for(const f of this.fighters){this.pose(f);f.previous=f.pose.map(p=>({...p}));f.oldBlade={base:{...f.blade.base},tip:{...f.blade.tip}};}}
 event(type,pos,extra={}){this.events.push({type,pos:{...pos},...extra});if(this.events.length>150)this.events.shift();}
 impulse(f,force){const capped=mul(force,Math.min(1,3/(len(force)||1)));f.vel=add(f.vel,capped);const horizontal=Math.hypot(f.vel.x,f.vel.z);if(horizontal>5){f.vel.x*=5/horizontal;f.vel.z*=5/horizontal;}f.vel.y=clamp(f.vel.y,-12,6.5);if(f.ragdoll)for(const p of f.ragdoll.p)p.prev=sub(p.prev,mul(capped,1/120));}
 damage(f,amount,force,point){if(f.hp<=0)return;f.hp-=amount;f.flash=.12;f.stun=.1;this.impulse(f,force);this.event('hit',point,{damage:Math.ceil(amount),enemy:f.enemy});if(f.hp<=0){this.ragdoll(f);this.event('kill',f.pos,{enemy:f.enemy});}}
 ragdoll(f){if(f.ragdoll)return;const p=f.pose.map((v,i)=>({pos:{...v},prev:sub(v,add(mul(sub(v,f.previous[i]||v),.6),mul(f.vel,1/120)))}));f.ragdoll={p,links:links.map(([a,b])=>[a,b,dist(p[a].pos,p[b].pos)])};}
 pose(f){
  const right=direction(f.yaw+Math.PI/2),forward=direction(f.yaw),hip=add(f.pos,V(0,.95-f.crouch*.35,0)),lean=mul(f.walk,.018),chest=add(add(hip,V(0,.64,0)),lean),head=add(chest,V(0,.33,0));
  const shoulder=add(chest,mul(right,.16)),axis=direction(f.yaw+f.guardYaw,f.guardPitch),hand=add(shoulder,mul(axis,f.extension));
  const free=add(add(hip,mul(right,-.36)),mul(forward,.08));const stride=Math.sin(f.gait)*.27*Math.min(1,len(f.walk)/4),lift=Math.abs(stride)*.45;
  const footL=add(f.pos,add(mul(right,-.18),add(mul(forward,stride),V(0,.08+(stride>0?lift:0),0)))),footR=add(f.pos,add(mul(right,.18),add(mul(forward,-stride),V(0,.08+(stride<0?lift:0),0))));
  f.pose=[hip,chest,head,elbow(chest,free,.44,.44,mul(right,-1)),free,elbow(shoulder,hand,.44,.44,add(mul(right,1),V(0,-.8,0))),hand,elbow(hip,footL,.5,.52,forward),footL,elbow(hip,footR,.5,.52,forward),footR];
  f.blade={base:{...hand},tip:add(hand,mul(axis,f.weapon.length))};
 }
 observe(f){if(this.time<f.ai.look&&f.ai.seen)return f.ai.seen;const p=this.player;f.ai.look=this.time+clamp(.24/f.speed,.1,.28);return f.ai.seen={pos:{...p.pos},chest:{...p.pose[1]},blade:{base:{...p.blade.base},tip:{...p.blade.tip}},swing:p.bladeSpeed||0,walk:{...p.walk}};}
 controls(f){
  const ai=f.ai,s=this.observe(f),delta=sub(s.pos,f.pos),horizontal=V(delta.x,0,delta.z),distance=len(horizontal),toward=norm(horizontal),aim=Math.atan2(toward.x,-toward.z);f.yaw+=wrap(aim-f.yaw)*.14;
  if(f.ranged)return this.ranged(f,s,toward,distance);
  const reach=f.weapon.length+.9;let move=distance>reach*.86?toward:distance<reach*.5?mul(toward,-.7):V();let targetYaw=0,targetPitch=.22,jump=false,crouch=false;
  if(f.role==='guard'){
   const ranged=this.fighters.filter(g=>g.enemy&&g.ranged&&g.hp>0);
   if(ranged.length){if(!f.ward||f.ward.hp<=0)f.ward=ranged[f.slot%ranged.length];const anchor=add(f.ward.pos,mul(norm(sub(s.pos,f.ward.pos)),2.2));if(dist(f.pos,anchor)>3.2||distance>reach+1.4){ai.mode='guard';return{move:mul(norm(sub(anchor,f.pos)),Math.min(1,dist(anchor,f.pos))),targetYaw:0,targetPitch:.3,jump:false,crouch:false};}}
  }
  if(ai.mode==='guard')ai.mode='approach';
  const threatened=s.swing>3&&distance<3.9&&segmentPair(f.pose[0],f.pose[2],s.blade.base,s.blade.tip).distance<1.2;
  if((ai.mode==='approach'||ai.mode==='recover'||ai.mode==='windup')&&threatened&&this.time>(ai.defendAfter||0)){ai.mode=this.random()<.65?'parry':'dodge';ai.until=this.time+.3;ai.defendAfter=this.time+.65;ai.side=this.random()<.5?-1:1;}
  if(this.time>=ai.until){
   if(ai.mode==='strike'){ai.mode='recover';ai.until=this.time+(.32+f.weapon.mass*.12)/f.speed;}
   else if(ai.mode==='windup'){ai.mode='strike';ai.until=this.time+(.22+f.weapon.mass*.09)/f.speed;}
   else if(ai.mode==='parry'||ai.mode==='dodge'){ai.mode='approach';ai.counter=true;}
   else if(ai.mode==='recover'||ai.mode==='feint')ai.mode='approach';
  }
  if(ai.mode==='approach'&&distance<reach+1.1&&this.time>=ai.until){ai.type=(ai.type+1+Math.floor(this.random()*2))%3;ai.side=this.random()<.5?-1:1;ai.startYaw=ai.type===0?-.15:ai.side*1.1;ai.endYaw=ai.type===0?.15:-ai.side*.9;ai.startPitch=ai.type===0?1.1:ai.type===2?-.65:.1;ai.endPitch=ai.type===0?-.7:ai.type===2?.6:.05;ai.mode=this.random()<.12?'feint':'windup';ai.until=this.time+(.23+this.random()*.2+f.weapon.mass*.05)*(ai.counter?.65:1)/f.speed;ai.counter=false;}
  if(ai.mode==='windup'||ai.mode==='feint'){targetYaw=ai.startYaw;targetPitch=ai.startPitch;move=mul(toward,ai.mode==='feint'?.5:.15);}
  if(ai.mode==='strike'){targetYaw=ai.endYaw;targetPitch=ai.endPitch;move=mul(toward,.85);crouch=ai.type===2;}
  if(ai.mode==='recover')move=distance<reach?mul(toward,-.65):V();
  if(ai.mode==='parry'){const incoming=norm(sub(s.blade.tip,add(f.pos,V(0,1.5,0))));targetYaw=wrap(Math.atan2(incoming.x,-incoming.z)-f.yaw);targetPitch=clamp(Math.asin(incoming.y),-.9,.9);move=mul(toward,-.25);}
  if(ai.mode==='dodge'){move=direction(f.yaw+ai.side*Math.PI/2);jump=s.blade.tip.y<.8;crouch=s.blade.tip.y>1.4;}
  if(ai.mode==='approach'){const tangent=direction(f.yaw+Math.PI/2);move=add(move,mul(tangent,Math.sin(this.time*.7+f.slot)*.35));}
  for(const g of this.fighters){if(g!==f&&g.enemy&&g.hp>0&&dist(g.pos,f.pos)<1)move=add(move,mul(norm(sub(f.pos,g.pos)),.6));}
  return{move:len(move)>1?norm(move):move,targetYaw,targetPitch,jump,crouch};
 }
 ranged(f,s,toward,distance){
  const ai=f.ai,spell=f.kind==='mage';let move=distance<7?mul(toward,-.65):distance>12?mul(toward,.65):V();
  if(ai.mode==='approach')ai.mode='position';
  const casters=this.fighters.filter(g=>g.kind==='mage'&&g.hp>0),turn=!spell||(this.time>=this.nextCast&&casters[this.mageTurn%casters.length]===f);
  if(ai.mode==='position'&&this.time>=ai.until&&turn){ai.mode='charge';ai.until=this.time+(spell?1.2:.8);ai.shot=add(s.chest,mul(s.walk,.18));if(spell){this.mageTurn++;this.nextCast=this.time+1.9;this.zones.push({pos:V(s.pos.x,.02,s.pos.z),radius:1.8,remaining:1.35,active:false,life:.38,owner:f,hit:false});this.event('warning',s.pos);}}
  if(ai.mode==='charge'){move=mul(move,.15);if(this.time>=ai.until){if(!spell){const origin=add(f.pos,V(0,1.5,0)),velocity=mul(norm(sub(ai.shot,origin)),16);this.projectiles.push({pos:add(origin,mul(norm(velocity),.7)),vel:velocity,owner:f,enemy:true,life:5,damage:15});this.event('shot',origin);}ai.mode='position';ai.until=this.time+1.05+this.random()*.4;}}
  for(const g of this.fighters)if(g!==f&&g.ranged&&g.hp>0&&dist(f.pos,g.pos)<1.5)move=add(move,mul(norm(sub(f.pos,g.pos)),.6));
  return{move:len(move)>1?norm(move):move,targetYaw:0,targetPitch:0,jump:false,crouch:false};
 }
 living(f,dt,input){
  f.previous=f.pose.map(p=>({...p}));f.oldBlade={base:{...f.blade.base},tip:{...f.blade.tip}};f.oldGuardYaw=f.guardYaw;f.oldGuardPitch=f.guardPitch;
  const c=f.enemy?this.controls(f):input;f.stun=Math.max(0,f.stun-dt);f.flash=Math.max(0,f.flash-dt);f.blocked=false;
  if(!f.enemy){f.yaw=c.yaw??f.yaw;f.targetYaw=c.swordYaw??f.targetYaw;f.targetPitch=c.swordPitch??f.targetPitch;f.targetExtension=clamp(c.extension??f.targetExtension,.22,.86);f.attack=!!c.attacking||len(c.move||V())>.1;}
  else{f.targetYaw=c.targetYaw;f.targetPitch=c.targetPitch;f.attack=!f.ranged;}
  const speed=f.enemy?3.8*Math.sqrt(f.speed):5.5,move=mul(c.move||V(),speed*(c.crouch?.48:1)*(f.stun>0?.6:1));f.walk=mix(f.walk,move,1-Math.exp(-18*dt));
  f.grounded=f.pos.y<=.001&&f.vel.y<=0;
  if(c.jump&&!f.jumpHeld&&f.grounded){f.vel.y=6.5;f.grounded=false;}f.jumpHeld=!!c.jump;
  f.vel.x*=Math.exp(-(f.grounded?8:1.6)*dt);f.vel.z*=Math.exp(-(f.grounded?8:1.6)*dt);f.vel.y-=18*dt;
  f.pos=add(f.pos,mul(add(f.walk,f.vel),dt));f.pos.x=clamp(f.pos.x,-this.bounds.x+.5,this.bounds.x-.5);f.pos.z=clamp(f.pos.z,-this.bounds.z+.5,this.bounds.z-.5);
  if(f.pos.y<0){f.pos.y=0;f.vel.y=0;f.grounded=true;}
  f.crouch+=((c.crouch?1:0)-f.crouch)*(1-Math.exp(-18*dt));f.gait+=len(f.walk)*dt*2.3;
  const rate=f.enemy?(f.ai.mode==='strike'?13:f.ai.mode==='parry'?18:8)/Math.sqrt(f.weapon.mass):35;
  f.recoilYaw*=Math.exp(-10*dt);f.recoilPitch*=Math.exp(-10*dt);
  const influence=this.time<(f.reboundUntil||0)?.12:1;
  f.guardYaw+=clamp(wrap(f.targetYaw-f.guardYaw)*(1-Math.exp(-rate*dt))*influence,-25*dt,25*dt)+f.recoilYaw*dt;
  f.guardPitch+=clamp((f.targetPitch-f.guardPitch)*(1-Math.exp(-rate*dt))*influence,-25*dt,25*dt)+f.recoilPitch*dt;f.guardPitch=clamp(f.guardPitch,-1.4,1.4);
  f.extension+=(f.targetExtension-f.extension)*(1-Math.exp(-30*dt));this.pose(f);f.bladeSpeed=dist(f.blade.tip,f.oldBlade.tip)/dt;
 }
 dead(f,dt){
  if(!f.ragdoll)this.ragdoll(f);const r=f.ragdoll;
  for(const p of r.p){const velocity=mul(sub(p.pos,p.prev),.985);p.prev={...p.pos};p.pos=add(add(p.pos,velocity),V(0,-18*dt*dt,0));}
  for(let i=0;i<7;i++){for(const[a,b,l]of r.links){const delta=sub(r.p[b].pos,r.p[a].pos),d=len(delta)||1,correction=mul(delta,(d-l)/d*.5);r.p[a].pos=add(r.p[a].pos,correction);r.p[b].pos=sub(r.p[b].pos,correction);}for(const p of r.p){p.pos.x=clamp(p.pos.x,-17.8,17.8);p.pos.z=clamp(p.pos.z,-14.8,14.8);if(p.pos.y<.08){p.pos.y=.08;p.prev.y=.08;p.prev.x=p.pos.x-(p.pos.x-p.prev.x)*.7;p.prev.z=p.pos.z-(p.pos.z-p.prev.z)*.7;}}}
  f.pose=r.p.map(p=>({...p.pos}));const axis=norm(sub(f.pose[6],f.pose[5]));f.blade={base:{...f.pose[6]},tip:add(f.pose[6],mul(axis,f.weapon.length))};
 }
 swept(a,b,radius){
  const travel=dist(a.oldBlade.tip,a.blade.tip)+dist(a.oldBlade.base,a.blade.base)+dist(b.oldBlade.tip,b.blade.tip)+dist(b.oldBlade.base,b.blade.base),steps=clamp(Math.ceil(travel/.06),1,90);
  for(let i=0;i<=steps;i++){const t=i/steps,pair=segmentPair(mix(a.oldBlade.base,a.blade.base,t),mix(a.oldBlade.tip,a.blade.tip,t),mix(b.oldBlade.base,b.blade.base,t),mix(b.oldBlade.tip,b.blade.tip,t));if(pair.distance<radius)return{...pair,t};}return null;
 }
 block(a,b,dt){
  if(a.ranged||b.ranged)return false;const hit=this.swept(a,b,a.weapon.radius+b.weapon.radius+.055);if(!hit)return false;
  a.blocked=b.blocked=true;
  if(this.time-(a.clashes.get(b.id)??-10)>.16){
   a.clashes.set(b.id,this.time);b.clashes.set(a.id,this.time);
   const va=mul(sub(a.blade.tip,a.oldBlade.tip),1/dt),vb=mul(sub(b.blade.tip,b.oldBlade.tip),1/dt),relative=sub(va,vb),force=mul(relative,Math.min(.1,2.2/(len(relative)||1)));
   this.impulse(a,mul(force,-1));this.impulse(b,force);
   for(const f of[a,b]){f.recoilYaw=clamp(-wrap(f.guardYaw-f.oldGuardYaw)/dt*.3,-5,5);f.recoilPitch=clamp(-(f.guardPitch-f.oldGuardPitch)/dt*.3,-5,5);f.reboundUntil=this.time+.12;}
   this.event('block',mix(hit.a,hit.b,.5));
  }
  // Rotation yields at contact; never rewind a body's position or gravity.
  if(hit.t>0){for(const f of[a,b]){f.guardYaw=f.oldGuardYaw+wrap(f.guardYaw-f.oldGuardYaw)*Math.max(0,hit.t-.02);f.guardPitch=f.oldGuardPitch+(f.guardPitch-f.oldGuardPitch)*Math.max(0,hit.t-.02);this.pose(f);}}
  return true;
 }
 combat(dt){
  const alive=this.fighters.filter(f=>f.hp>0);
  for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){
   const a=alive[i],b=alive[j],delta=sub(a.pos,b.pos),flat=V(delta.x,0,delta.z),d=len(flat);
   if(d<.6&&Math.abs(delta.y)<1.5){const push=mul(norm(d>.001?flat:V(1,0,0)),(.6-d)*.5);a.pos=add(a.pos,push);b.pos=sub(b.pos,push);}
   if(a.enemy!==b.enemy)this.block(a,b,dt);
  }
  for(const attacker of alive){if(attacker.ranged||attacker.blocked||!attacker.attack||attacker.bladeSpeed<2.2)continue;
   for(const defender of alive){if(attacker.enemy===defender.enemy||this.time-(attacker.hits.get(defender.id)??-10)<.38)continue;
    let hit=null;const steps=clamp(Math.ceil(dist(attacker.blade.tip,attacker.oldBlade.tip)/.07),1,65);
    for(let s=0;s<=steps&&!hit;s++){const t=s/steps,base=mix(attacker.oldBlade.base,attacker.blade.base,t),tip=mix(attacker.oldBlade.tip,attacker.blade.tip,t);for(const[a,b]of links){const collision=segmentPair(base,tip,defender.pose[a],defender.pose[b]);if(collision.distance<(b===2?.22:.12)+attacker.weapon.radius){hit=collision.b;break;}}}
    if(hit){attacker.hits.set(defender.id,this.time);const damage=clamp(14+attacker.bladeSpeed*2.4*attacker.weapon.mass,15,65)*(attacker.enemy?.44:1);this.damage(defender,damage,mul(norm(sub(attacker.blade.tip,attacker.oldBlade.tip)),1.4),hit);}
   }
  }
 }
 projectilesStep(dt){
  for(const arrow of this.projectiles){const old={...arrow.pos};arrow.pos=add(arrow.pos,mul(arrow.vel,dt));arrow.vel.y-=1.2*dt;arrow.life-=dt;if(Math.abs(arrow.pos.x)>18||Math.abs(arrow.pos.z)>15||arrow.pos.y<.02)arrow.life=0;if(arrow.life<=0)continue;
   let bounced=false;
   for(const f of this.fighters){if(f.hp<=0||f.enemy===arrow.enemy||f.ranged||this.time<(arrow.deflectUntil||0))continue;const sweep={oldBlade:{base:old,tip:old},blade:{base:arrow.pos,tip:arrow.pos}};
    if(this.swept(f,sweep,f.weapon.radius+.1)){const axis=norm(sub(f.blade.tip,f.blade.base)),side=sub(arrow.vel,mul(axis,dot(arrow.vel,axis)));arrow.vel=len(side)<2?mul(arrow.vel,-1):sub(arrow.vel,mul(side,2));arrow.owner=f;arrow.enemy=f.enemy;arrow.damage=f.enemy?15:30;arrow.deflectUntil=this.time+.12;arrow.pos=add(arrow.pos,mul(norm(arrow.vel),.2));this.event('block',arrow.pos);bounced=true;break;}}
   if(bounced)continue;
   for(const f of this.fighters){if(f.hp<=0||f.enemy===arrow.enemy||f===arrow.owner)continue;const hit=links.some(([a,b])=>segmentPair(old,arrow.pos,f.pose[a],f.pose[b]).distance<(b===2?.23:.14));if(hit){this.damage(f,arrow.damage,mul(norm(arrow.vel),.6),arrow.pos);arrow.life=0;break;}}
  }
  this.projectiles=this.projectiles.filter(p=>p.life>0);
  for(const zone of this.zones){if(!zone.active){if(zone.owner.hp<=0){zone.life=0;continue;}zone.remaining-=dt;if(zone.remaining>0)continue;zone.active=true;this.event('eruption',zone.pos);}zone.life-=dt;const p=this.player;if(!zone.hit&&p.hp>0&&Math.hypot(p.pos.x-zone.pos.x,p.pos.z-zone.pos.z)<zone.radius+.23&&p.pos.y<2.4){zone.hit=true;this.damage(p,23,V(0,.7,0),add(p.pos,V(0,1,0)));}}
  this.zones=this.zones.filter(z=>z.life>0);
 }
 step(dt,input={}){if(this.state!=='playing')return;this.time+=dt;for(const f of this.fighters){if(f.hp>0)this.living(f,dt,input);else this.dead(f,dt);}this.combat(dt);this.projectilesStep(dt);if(this.player.hp<=0||this.fighters.every(f=>!f.enemy||f.hp<=0)){this.endTimer+=dt;if(this.endTimer>1.1)this.state=this.player.hp<=0?'lost':this.level===levels.length-1?'complete':'won';}}
}
const API={World,levels,weapons,links,V,add,sub,mul,dot,cross,len,norm,mix,dist,direction,clamp,wrap,segmentPair};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.StickPhysics=API;
})(typeof globalThis!=='undefined'?globalThis:this);
