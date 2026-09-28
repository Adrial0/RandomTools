const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('./physics3d.js');
const {World,V,add,sub,mul,dist,segmentPair}=P,dt=1/120;
function solo(){const w=new World();w.fighters=[w.player];return w;}
function advance(w,n,input={}){for(let i=0;i<n;i++)w.living(w.player,dt,input);}
test('3D segment collision distinguishes depth, crossing, parallel and degenerate segments',()=>{
 assert.equal(segmentPair(V(-1,0,0),V(1,0,0),V(0,-1,0),V(0,1,0)).distance,0);
 assert.equal(segmentPair(V(-1,0,0),V(1,0,0),V(0,-1,2),V(0,1,2)).distance,2);
 assert.equal(segmentPair(V(0,0,0),V(1,0,0),V(0,1,0),V(1,1,0)).distance,1);
 assert.equal(segmentPair(V(),V(),V(0,0,2),V(0,0,2)).distance,2);
});
test('movement covers both ground axes and release stops without acceleration runaway',()=>{
 const w=solo(),start={...w.player.pos};advance(w,120,{move:V(1,0,0)});const x=w.player.pos.x;assert.ok(x-start.x>5&&x-start.x<5.6);advance(w,120,{move:V(0,0,-1)});assert.ok(start.z-w.player.pos.z>5);const stop={...w.player.pos};advance(w,120);assert.ok(dist(stop,w.player.pos)<.35);
});
test('jump follows gravity and lands once; crouch changes height',()=>{
 const w=solo();let peak=0,landings=0,wasGrounded=true;for(let i=0;i<240;i++){w.living(w.player,dt,{jump:true});peak=Math.max(peak,w.player.pos.y);if(!wasGrounded&&w.player.grounded)landings++;wasGrounded=w.player.grounded;}assert.ok(peak>1&&peak<1.3);assert.equal(landings,1);assert.equal(w.player.pos.y,0);const head=w.player.pose[2].y;advance(w,60,{crouch:true});assert.ok(w.player.pose[2].y<head-.3);
});
test('arm extends and retracts within limb reach, idle does not swing',()=>{
 const w=solo();advance(w,90,{extension:10});assert.ok(w.player.extension<=.86);const length=dist(w.player.blade.base,w.player.blade.tip);assert.ok(Math.abs(length-w.player.weapon.length)<1e-8);advance(w,90,{extension:.1});assert.ok(w.player.extension>=.22&&w.player.extension<.221);const blade={...w.player.blade.tip};advance(w,120,{extension:.22});assert.ok(dist(blade,w.player.blade.tip)<.001);assert.equal(w.player.attack,false);
});
test('mouse-directed sword changes direction in yaw and pitch',()=>{const w=solo();advance(w,30,{swordYaw:1.2,swordPitch:.8,attacking:true});const axis=P.norm(sub(w.player.blade.tip,w.player.blade.base));assert.ok(axis.x>.5&&axis.y>.6);assert.equal(w.player.attack,true);});
test('all fourteen 3D rounds remain finite and contained during combat',()=>{
 for(let n=0;n<P.levels.length;n++){const w=new World();w.load(n);for(let i=0;i<3000;i++)w.step(dt,{move:i%500<180?V(.7,0,-.7):V(),yaw:Math.sin(i*.004),swordYaw:Math.sin(i*.05),swordPitch:Math.cos(i*.05)*.8,attacking:true,jump:i%250<2});for(const f of w.fighters){assert.ok(f.pose.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));assert.ok(Math.abs(f.pos.x)<=18&&Math.abs(f.pos.z)<=15);}assert.ok(w.projectiles.every(a=>[a.pos.x,a.pos.y,a.pos.z].every(Number.isFinite)));}
});
test('late formation retains two mages, three archers, and two guards',()=>{const w=new World();w.load(13);assert.equal(w.fighters.filter(f=>f.kind==='mage').length,2);assert.equal(w.fighters.filter(f=>f.kind==='archer').length,3);assert.equal(w.fighters.filter(f=>f.role==='guard').length,2);assert.equal(w.fighters.length,9);});
test('enemies attack an undefended player in melee and at range',()=>{for(const n of[0,1,2]){const w=new World();w.load(n);for(let i=0;i<2400;i++)w.step(dt,{swordYaw:1.5,swordPitch:0});assert.ok(w.player.hp<100,`round ${n}`);}});
test('guards stay with ranged allies and pursue once allies are defeated',()=>{const w=new World();w.load(13);const f=w.fighters.find(f=>f.role==='guard');w.controls(f);assert.equal(f.ai.mode,'guard');w.fighters.filter(g=>g.ranged).forEach(g=>g.hp=0);w.controls(f);assert.notEqual(f.ai.mode,'guard');});
test('mages alternate fixed zone warnings and do not stall after one dies',()=>{const w=new World();w.load(13);const mages=w.fighters.filter(f=>f.kind==='mage'),events=[];for(let i=0;i<2000;i++){w.time+=dt;for(const f of mages){const count=w.zones.length;w.controls(f);if(w.zones.length>count)events.push({id:f.id,time:w.time});}}assert.ok(events.length>=6);for(let i=1;i<events.length;i++){assert.notEqual(events[i].id,events[i-1].id);assert.ok(events[i].time-events[i-1].time>=1.89);}mages[0].hp=0;const count=w.zones.length;for(let i=0;i<600;i++){w.time+=dt;w.controls(mages[1]);}assert.ok(w.zones.length>count);});
test('mage area attack is avoidable sideways in the 3D plane',()=>{for(const dodge of[false,true]){const w=solo(),owner=w.fighter(V(0,0,-5),true,'mage');w.zones=[{pos:{...w.player.pos},radius:1.8,remaining:1.35,active:false,life:.38,owner,hit:false}];const target={...w.zones[0].pos};for(let i=0;i<230;i++){w.living(w.player,dt,{move:dodge?V(1,0,0):V()});w.projectilesStep(dt);}assert.equal(w.player.hp,dodge?100:77);assert.deepEqual(target,V(0,0,8));assert.equal(w.zones.length,0);}});
test('arrows deflect from the sword and hit when the blade is elsewhere',()=>{
 for(const blocking of[false,true]){const w=solo(),p=w.player,owner=w.fighter(V(0,0,0),true,'archer');p.guardYaw=0;p.guardPitch=0;w.pose(p);p.oldBlade={base:{...p.blade.base},tip:{...p.blade.tip}};const origin=add(p.blade.tip,V(0,0,-.3));if(!blocking){p.guardYaw=1.5;w.pose(p);p.oldBlade={base:{...p.blade.base},tip:{...p.blade.tip}};}w.projectiles=[{pos:origin,vel:V(0,0,16),enemy:true,owner,life:5,damage:15}];let reflected=false;for(let i=0;i<30;i++){w.time+=dt;w.projectilesStep(dt);if(w.projectiles[0]?.owner===p)reflected=true;}assert.equal(reflected,blocking);assert.equal(p.hp,blocking?100:85);}
});
test('3D blade clashes impart bounded momentum and never rewind movement',()=>{const w=solo(),a=w.player,b=w.fighter(V(1,0,6.5),true);w.pose(b);a.oldBlade={base:V(0,1,0),tip:V(0,2,0)};a.blade={base:V(0,1,0),tip:V(1,1,0)};b.oldBlade={base:V(.5,.5,0),tip:V(.5,1.8,0)};b.blade={base:V(.5,.5,0),tip:V(.5,1.8,0)};a.oldGuardYaw=a.guardYaw;b.oldGuardYaw=b.guardYaw;a.oldGuardPitch=a.guardPitch;b.oldGuardPitch=b.guardPitch;const before={...a.pos};assert.equal(w.block(a,b,dt),true);assert.deepEqual(a.pos,before);assert.ok(P.len(a.vel)>0&&P.len(a.vel)<=3.01);assert.ok(a.blocked&&b.blocked);});
test('death creates a constrained 3D ragdoll that settles on the floor',()=>{const w=solo(),f=w.player;w.damage(f,200,V(1,2,-1),f.pose[1]);assert.ok(f.ragdoll);for(let i=0;i<600;i++)w.dead(f,dt);assert.ok(f.pose.every(p=>p.y>=.079&&Number.isFinite(p.x)));assert.ok(f.pose[1].y<.5);for(const[a,b,l]of f.ragdoll.links)assert.ok(Math.abs(dist(f.pose[a],f.pose[b])-l)<.08);});
test('win, loss, reset and final completion preserve progression behavior',()=>{const w=new World();w.fighters[1].hp=0;for(let i=0;i<150;i++)w.step(dt);assert.equal(w.state,'won');w.load(13);w.fighters.slice(1).forEach(f=>f.hp=0);for(let i=0;i<150;i++)w.step(dt);assert.equal(w.state,'complete');w.load(0);w.player.hp=0;for(let i=0;i<150;i++)w.step(dt);assert.equal(w.state,'lost');w.load(1);assert.equal(w.player.hp,100);assert.equal(w.projectiles.length,0);assert.equal(w.zones.length,0);});
