(function(){
'use strict';
const $=id=>document.getElementById(id),canvas=$('view');
function fatal(message){$('error').hidden=false;$('error').textContent=message;$('start').disabled=true;}
if(!window.THREE||!window.StickPhysics){fatal('The 3D files could not be loaded. Reload this page, or open the 2D version using the link above.');return;}
const T=window.THREE,P=window.StickPhysics,{V,add,sub,mul,len,norm,direction,clamp}=P;
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){fatal('This browser could not start WebGL. Enable hardware acceleration or try another desktop browser. The 2D version is still available above.');return;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene();scene.background=new T.Color('#a6b2b0');scene.fog=new T.Fog('#a6b2b0',27,75);
const camera=new T.PerspectiveCamera(64,1,.055,100),world=new P.World(),up=new T.Vector3(0,1,0);
const vec=p=>new T.Vector3(p.x,p.y,p.z),material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,...extra});
const stone=material('#7e897e'),darkStone=material('#56685d'),trim=material('#b4baa1'),floorMat=material('#758577'),metal=material('#d6ded8',{metalness:.75,roughness:.27}),gripMat=material('#4e4032'),jointMat=material('#354940'),eyeMat=material('#20302c');
const sphereGeo=new T.SphereGeometry(1,16,12),rodGeo=new T.CylinderGeometry(1,1,1,8),boxGeo=new T.BoxGeometry(1,1,1),headGeo=new T.SphereGeometry(.205,20,16),bladeGeo=new T.BoxGeometry(.065,1,.095),tipGeo=new T.ConeGeometry(.07,.16,4),ringGeo=new T.RingGeometry(.92,1,64);
function mesh(geo,mat,parent=scene){const m=new T.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(x,y,z,sx,sy,sz,mat,parent=scene){const m=mesh(boxGeo,mat,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
function rod(m,a,b,r){const delta=sub(b,a);m.position.copy(vec(mul(add(a,b),.5)));m.scale.set(r,Math.max(.001,len(delta)),r);m.quaternion.setFromUnitVectors(up,vec(norm(delta)));}
scene.add(new T.HemisphereLight('#e6f0df','#4f6959',2));
const sun=new T.DirectionalLight('#fff2d2',3);sun.position.set(-12,24,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;sun.shadow.camera.top=21;sun.shadow.camera.bottom=-21;sun.shadow.camera.near=1;sun.shadow.camera.far=65;sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;scene.add(sun);
box(0,-.22,0,39,.4,33,floorMat);
const grid=new T.GridHelper(36,24,'#586e5e','#687c6c');grid.position.y=.001;scene.add(grid);
// Low perimeter walls and an open courtyard preserve clear lines of sight.
box(0,.55,-15.5,38,1.1,.7,stone);box(0,.55,15.5,38,1.1,.7,stone);box(-18.5,.55,0,.7,1.1,31,stone);box(18.5,.55,0,.7,1.1,31,stone);
for(const z of[-15.5,15.5]){box(0,1.13,z,38,.13,.9,trim);for(let x=-18;x<=18;x+=4.5){box(x,1.6,z,.65,3.2,.85,darkStone);box(x,3.2,z,.95,.25,1.1,trim);}}
for(const x of[-18.5,18.5]){box(x,1.13,0,.9,.13,31,trim);for(let z=-11;z<=11;z+=5.5){box(x,1.6,z,.85,3.2,.65,darkStone);box(x,3.2,z,1.1,.25,.95,trim);}}
const bannerMat=material('#455b49',{side:T.DoubleSide});
for(const x of[-13.5,-4.5,4.5,13.5]){box(x,2.05,-15.04,1.3,1.8,.04,bannerMat);box(x,2.05,-15.005,.12,1.2,.025,trim);box(x,2.35,-14.99,.65,.1,.025,trim);}
for(const z of[-10,0,10])for(const x of[-24,24])box(x,2,z,3.5,4,6,stone);
const centerRing=new T.Mesh(new T.RingGeometry(4.8,4.86,96),new T.MeshBasicMaterial({color:'#b3bea0',side:T.DoubleSide,transparent:true,opacity:.35}));centerRing.rotation.x=-Math.PI/2;centerRing.position.y=.009;scene.add(centerRing);
let visuals=new Map(),shotMeshes=[],zoneMeshes=[],sparks=[],labels=[],unlocked=0,paused=true,menu='start',firstPerson=false,mouseLocked=false,combatHeld=false,rightHeld=false,yaw=0,pitch=-.15,swordYaw=0,swordPitch=.2,extension=.64,attackUntil=0,sound=false,audio=null,acc=0,last=0,noticeUntil=0,wasDead=false;
const keys=new Set();
try{unlocked=clamp(Number(localStorage.getItem('stickfight-3d-progress'))||0,0,P.levels.length-1);firstPerson=localStorage.getItem('stickfight-3d-camera')==='first';}catch{}
function makeVisual(f){
 const group=new T.Group();scene.add(group);const color=!f.enemy?'#d2ec91':f.kind==='mage'?'#b899e1':f.kind==='archer'?'#d1ad67':f.role==='guard'?'#8eaec0':'#d39578',mat=material(color),v={group,mat,limbs:[],joints:[],head:mesh(headGeo,mat,group),headParts:[],weaponParts:[]};
 for(let i=0;i<P.links.length;i++)v.limbs.push(mesh(rodGeo,mat,group));for(let i=0;i<11;i++)v.joints.push(mesh(sphereGeo,jointMat,group));
 const face=new T.Group();group.add(face);v.face=face;for(const x of[-.065,.065]){const eye=mesh(sphereGeo,eyeMat,face);eye.scale.set(.026,.034,.019);eye.position.set(x,.015,-.19);}v.headParts.push(face);
 if(f.kind==='mage'){const hat=mesh(new T.ConeGeometry(.31,.6,12),material('#776390'),group);v.hat=hat;}
 v.weapon=mesh(f.ranged?rodGeo:bladeGeo,f.kind==='mage'?gripMat:metal,group);v.handle=mesh(rodGeo,gripMat,group);v.guard=mesh(rodGeo,metal,group);v.point=mesh(tipGeo,metal,group);v.weaponParts=[v.weapon,v.handle,v.guard,v.point];
 if(f.kind==='axe')v.extra=mesh(new T.BoxGeometry(.55,.35,.12),metal,group);
 if(f.kind==='hammer')v.extra=mesh(new T.BoxGeometry(.55,.25,.28),metal,group);
 if(f.kind==='mage'){v.extra=mesh(new T.OctahedronGeometry(.17),new T.MeshStandardMaterial({color:'#c9a3ff',emissive:'#9b59eb',emissiveIntensity:.8}),group);}
 if(f.kind==='archer'){
  const pts=[];for(let i=0;i<=24;i++){const a=-Math.PI/2+i*Math.PI/24;pts.push(new T.Vector3(0,Math.sin(a)*.5,Math.cos(a)*.24));}
  const geo=new T.BufferGeometry().setFromPoints(pts);v.bow=new T.Group();v.bow.add(new T.Line(geo,new T.LineBasicMaterial({color:'#cfa36b'})));v.bow.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,-.5,0),new T.Vector3(0,.5,0)]),new T.LineBasicMaterial({color:'#e9ddc1'})));group.add(v.bow);
 }
 const bar=new T.Group();bar.add(box(0,0,0,.76,.065,.012,material('#31463c'),bar));v.health=box(0,0,.014,.72,.035,.012,material(color),bar);group.add(bar);v.bar=bar;
 if(f.role==='guard'){v.guardMark=mesh(new T.OctahedronGeometry(.09),material('#aac9db'),group);}
 return v;
}
function updateVisual(f,v){
 const hiddenHead=f===world.player&&firstPerson&&f.hp>0;v.head.visible=!hiddenHead;v.face.visible=!hiddenHead;
 v.head.position.copy(vec(f.pose[2]));v.face.position.copy(vec(f.pose[2]));v.face.rotation.y=f.yaw;
 v.mat.emissive.set(f.flash>0?'#756647':'#000000');
 P.links.forEach(([a,b],i)=>{rod(v.limbs[i],f.pose[a],f.pose[b],a===0&&b===1?.075:.052);v.limbs[i].visible=!(hiddenHead&&(b===2||i===0));});
 f.pose.forEach((p,i)=>{v.joints[i].position.copy(vec(p));v.joints[i].scale.setScalar(i===2?.06:.064);v.joints[i].visible=!(hiddenHead&&i<=2);});
 const b=f.blade.base,t=f.blade.tip,axis=norm(sub(t,b));
 rod(v.weapon,b,t,f.ranged?.035:1);if(!f.ranged){v.weapon.scale.set(1,len(sub(t,b)),1);}
 const right=norm(P.cross(axis,V(0,1,0)));rod(v.handle,add(b,mul(axis,-.18)),add(b,mul(axis,.04)),.046);rod(v.guard,add(b,mul(right,-.16)),add(b,mul(right,.16)),.025);
 v.point.position.copy(vec(add(t,mul(axis,.065))));v.point.quaternion.setFromUnitVectors(up,vec(axis));
 if(v.extra){v.extra.position.copy(vec(t));v.extra.quaternion.copy(v.weapon.quaternion);}
 if(v.hat)v.hat.position.copy(vec(add(f.pose[2],V(0,.42,0))));
 if(v.bow){v.bow.position.copy(vec(b));v.bow.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),vec(axis));}
 if(f.ranged){v.guard.visible=false;v.point.visible=false;if(f.kind==='archer')v.weapon.visible=false;}
 if(v.extra&&f.kind==='mage')v.extra.scale.setScalar(f.ai.mode==='charge'?1.3+Math.sin(world.time*12)*.15:1);
 v.bar.visible=f.enemy&&f.hp>0;v.bar.position.copy(vec(add(f.pose[2],V(0,.42,0))));v.bar.quaternion.copy(camera.quaternion);v.health.scale.x=.72*clamp(f.hp/f.maxHp,0,1);v.health.position.x=-.36+.36*clamp(f.hp/f.maxHp,0,1);
 if(v.guardMark){v.guardMark.position.copy(vec(add(f.pose[2],V(0,.65,0))));v.guardMark.visible=f.hp>0&&world.fighters.some(g=>g.ranged&&g.hp>0);}
}
function release(group){
 const sharedGeo=new Set([sphereGeo,rodGeo,boxGeo,headGeo,bladeGeo,tipGeo,ringGeo,sparkGeo]),sharedMat=new Set([stone,darkStone,trim,floorMat,metal,gripMat,jointMat,eyeMat,bannerMat,sparkGold,sparkPurple,sparkHit]),geometries=new Set(),materials=new Set();
 group.traverse(o=>{if(o.geometry&&!sharedGeo.has(o.geometry))geometries.add(o.geometry);if(o.material&&!sharedMat.has(o.material))materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();scene.remove(group);
}
function rebuild(){for(const v of visuals.values())release(v.group);visuals.clear();for(const f of world.fighters)visuals.set(f.id,makeVisual(f));for(const s of shotMeshes)release(s);shotMeshes=[];for(const z of zoneMeshes)release(z.group);zoneMeshes=[];for(const p of sparks)scene.remove(p.mesh);sparks=[];for(const l of labels)l.el.remove();labels=[];wasDead=false;}
function soundAt(type){if(!sound||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type==='block'?'triangle':'sine';o.frequency.value=type==='block'?640:type==='hit'?180:type==='shot'?450:80;o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.14);o.start();o.stop(audio.currentTime+.15);}
const sparkGeo=new T.SphereGeometry(.025,5,4),sparkGold=new T.MeshBasicMaterial({color:'#ffe2a3'}),sparkPurple=new T.MeshBasicMaterial({color:'#c195ff'}),sparkHit=new T.MeshBasicMaterial({color:'#e1b08c'});
function events(){for(const e of world.events.splice(0)){soundAt(e.type);if(e.type==='block'||e.type==='hit'||e.type==='eruption'){for(let i=0;i<Math.min(e.type==='eruption'?20:8,130-sparks.length);i++){const m=new T.Mesh(sparkGeo,e.type==='eruption'?sparkPurple:e.type==='block'?sparkGold:sparkHit);m.position.copy(vec(e.pos));scene.add(m);sparks.push({mesh:m,vel:new T.Vector3((Math.random()-.5)*3,1+Math.random()*3,(Math.random()-.5)*3),life:.3+Math.random()*.3});}}
 if(e.type==='hit'){const el=document.createElement('span');el.className='damage-label';el.textContent=e.damage;$('damage-labels').append(el);labels.push({el,pos:add(e.pos,V(0,.35,0)),life:.65});if(!e.enemy)$('hit-flash').style.opacity='.45';}
 if(e.type==='block'){notice('Blocked');}if(e.type==='warning')notice('Purple zone — move clear');}
}
function effects(dt){for(const s of sparks){s.life-=dt;s.vel.y-=8*dt;s.mesh.position.addScaledVector(s.vel,dt);s.mesh.scale.setScalar(Math.max(0,s.life*2));if(s.life<=0)scene.remove(s.mesh);}sparks=sparks.filter(s=>s.life>0);const rect=canvas.getBoundingClientRect();for(const l of labels){l.life-=dt;l.pos.y+=dt*.5;const projected=vec(l.pos).project(camera);l.el.style.left=(projected.x*.5+.5)*rect.width+'px';l.el.style.top=(-projected.y*.5+.5)*rect.height+'px';l.el.style.opacity=Math.max(0,l.life*2);l.el.hidden=projected.z>1;if(l.life<=0)l.el.remove();}labels=labels.filter(l=>l.life>0);$('hit-flash').style.opacity=Math.max(0,Number($('hit-flash').style.opacity||0)-dt*2);}
function projectiles(){
 while(shotMeshes.length<world.projectiles.length){const group=new T.Group(),shaft=mesh(rodGeo,gripMat,group),tip=mesh(tipGeo,metal,group);shaft.scale.set(.016,.45,.016);tip.position.y=.3;tip.scale.set(.5,.6,.5);scene.add(group);shotMeshes.push(group);}
 while(shotMeshes.length>world.projectiles.length)release(shotMeshes.pop());world.projectiles.forEach((p,i)=>{shotMeshes[i].position.copy(vec(p.pos));shotMeshes[i].quaternion.setFromUnitVectors(up,vec(norm(p.vel)));});
 while(zoneMeshes.length<world.zones.length){const group=new T.Group();const outline=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:'#b586ff',side:T.DoubleSide,transparent:true,opacity:.9}));outline.rotation.x=-Math.PI/2;group.add(outline);const fill=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:'#a86df5',side:T.DoubleSide,transparent:true,opacity:.18,depthWrite:false}));fill.rotation.x=-Math.PI/2;fill.position.y=.006;group.add(fill);const pillar=mesh(new T.CylinderGeometry(1,1,2.8,32,1,true),new T.MeshBasicMaterial({color:'#be8dff',side:T.DoubleSide,transparent:true,opacity:.28,depthWrite:false}),group);pillar.position.y=1.4;scene.add(group);zoneMeshes.push({group,outline,fill,pillar});}
 while(zoneMeshes.length>world.zones.length)release(zoneMeshes.pop().group);
 world.zones.forEach((z,i)=>{const m=zoneMeshes[i];m.group.position.copy(vec(z.pos));m.outline.scale.setScalar(z.radius);m.fill.scale.setScalar(z.radius*(z.active?1:clamp(1-z.remaining/1.35,.05,1)));m.pillar.scale.set(z.radius,1,z.radius);m.pillar.visible=z.active;m.outline.material.opacity=.6+Math.sin(world.time*14)*.2;});
}
function updateCamera(){
 const p=world.player,eye=add(p.pos,V(0,1.82-p.crouch*.35,0)),look=direction(yaw,pitch),right=direction(yaw+Math.PI/2);let position;
 if(firstPerson)position=eye;
 else position=add(add(eye,mul(look,-5.2)),add(mul(right,.7),V(0,.55,0)));
 position.x=clamp(position.x,-17.6,17.6);position.z=clamp(position.z,-14.6,14.6);position.y=Math.max(.55,position.y);
 camera.position.copy(vec(position));camera.lookAt(vec(add(eye,mul(look,9))));
 const alive=world.fighters.filter(f=>f.enemy&&f.hp>0),behind=alive.some(f=>{const to=sub(f.pos,p.pos);return len(to)<7&&P.dot(norm(to),direction(yaw))<-.2;});$('enemy-direction').hidden=!behind||paused;
}
function notice(text){$('notice').textContent=text;noticeUntil=performance.now()+2300;}
function hud(){const p=world.player;$('health').style.width=clamp(p.hp,0,100)+'%';$('hp').textContent=Math.max(0,Math.ceil(p.hp))+' / 100';$('round').textContent='ROUND '+String(world.level+1).padStart(2,'0')+' / '+P.levels.length;$('round-name').textContent=P.levels[world.level][0];const alive=world.fighters.filter(f=>f.enemy&&f.hp>0).length;$('enemies').textContent=alive+' enem'+(alive===1?'y':'ies');$('reach').style.width=((world.player.extension-.22)/.64*100)+'%';$('combat-mode').innerHTML=combatHeld?'SWORD CONTROL <span>Move mouse to swing · Wheel adjusts reach</span>':'MOUSE LOOK <span>Hold LMB to swing · Wheel adjusts reach</span>';$('camera').textContent=(firstPerson?'First':'Third')+' person · V';if(performance.now()>noticeUntil)$('notice').textContent='Block steel and arrows. Dodge purple zones.';
 $('sword-cursor').style.display=combatHeld&&!paused?'block':'none';$('sword-cursor').style.left=(50+swordYaw/1.55*23)+'%';$('sword-cursor').style.top=(50-swordPitch/1.25*28)+'%';}
function levelButtons(){$('levels').replaceChildren();P.levels.forEach((l,i)=>{const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');b.title=l[0];b.disabled=i>unlocked;b.className=i===world.level?'current':'';b.onclick=()=>start(i);$('levels').append(b);});}
function showMenu(kind){menu=kind;paused=true;combatHeld=rightHeld=false;keys.clear();document.exitPointerLock?.();$('overlay').hidden=false;$('instructions').hidden=kind!=='start';$('menu-label').textContent=kind==='won'?'ROUND CLEARED':kind==='complete'?'CAMPAIGN COMPLETE':kind==='lost'?'DEFEATED':'3D ARENA';$('menu-title').textContent=kind==='paused'?'Paused':kind==='won'?'Round complete':kind==='complete'?'You win':kind==='lost'?'Try again':'Stickfight';$('menu-copy').textContent=kind==='paused'?'Resume when you are ready.':kind==='won'?'Next: '+P.levels[world.level+1][0]:kind==='complete'?'All fourteen rounds cleared.':kind==='lost'?'Keep your blade between you and incoming steel. Move out of purple zones.':'Fight with your sword in a fully 3D arena.';$('start').innerHTML=(kind==='paused'?'Resume':kind==='won'?'Next round':kind==='lost'?'Retry':kind==='complete'?'Play again':'Play')+' <span>→</span>';$('menu-note').textContent='Esc pauses and releases the mouse. V switches camera.';}
function capture(){try{const promise=canvas.requestPointerLock?.();promise?.catch(()=>notice('Mouse capture unavailable: hold RMB to look, LMB to swing.'));}catch(e){notice('Hold RMB to look, LMB to swing.');}}
function start(n){world.load(n);rebuild();yaw=0;pitch=-.15;swordYaw=0;swordPitch=.2;extension=.64;acc=0;keys.clear();combatHeld=false;paused=false;menu='';$('overlay').hidden=true;levelButtons();capture();}
function resume(){paused=false;menu='';acc=0;$('overlay').hidden=true;capture();}
function toggleCamera(){firstPerson=!firstPerson;try{localStorage.setItem('stickfight-3d-camera',firstPerson?'first':'third');}catch{}hud();}
$('start').onclick=()=>{if(menu==='paused')resume();else start(menu==='won'?world.level+1:menu==='complete'?0:world.level);};$('pause').onclick=()=>paused&&menu==='paused'?resume():!paused&&showMenu('paused');$('camera').onclick=toggleCamera;
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';if(sound){try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();}catch(e){sound=false;$('sound').textContent='Sound unavailable';}}};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else $('arena').requestFullscreen?.().catch(()=>notice('Fullscreen is unavailable in this browser.'));};
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','Space','ControlLeft','ControlRight','KeyC','ShiftLeft','ShiftRight','KeyV','KeyR','Escape'].includes(e.code)){e.preventDefault();if(!e.repeat){if(e.code==='KeyV')toggleCamera();if(e.code==='KeyR'&&menu!=='start')start(world.level);if(e.code==='Escape'&&!paused)showMenu('paused');}keys.add(e.code);}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{if(!paused)showMenu('paused');});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('mousedown',e=>{if(paused)return;if(e.button===0)combatHeld=true;if(e.button===2)rightHeld=true;});window.addEventListener('mouseup',e=>{if(e.button===0)combatHeld=false;if(e.button===2)rightHeld=false;});
document.addEventListener('pointerlockchange',()=>{mouseLocked=document.pointerLockElement===canvas;if(!mouseLocked&&!paused)showMenu('paused');});document.addEventListener('pointerlockerror',()=>notice('Mouse capture unavailable: hold RMB to look, LMB to swing.'));
document.addEventListener('mousemove',e=>{if(paused||(!mouseLocked&&!combatHeld&&!rightHeld))return;const dx=clamp(e.movementX||0,-120,120),dy=clamp(e.movementY||0,-120,120);attackUntil=world.time+.16;
 if(combatHeld||keys.has('ShiftLeft')||keys.has('ShiftRight')){swordYaw=clamp(swordYaw+dx*.009,-1.55,1.55);swordPitch=clamp(swordPitch-dy*.009,-1.25,1.25);extension=.24+.62*clamp(Math.hypot(swordYaw/1.55,swordPitch/1.25),0,1);}else{yaw+=dx*.0026;pitch=clamp(pitch-dy*.0024,-.75,.8);}});
canvas.addEventListener('wheel',e=>{if(paused)return;e.preventDefault();extension=clamp(extension-e.deltaY*.001,.22,.86);attackUntil=world.time+.16;},{passive:false});
function input(){const forward=direction(yaw),right=direction(yaw+Math.PI/2);let move=add(mul(forward,(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)),mul(right,(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)));if(len(move)>1)move=norm(move);return{move,yaw,swordYaw,swordPitch,extension,jump:keys.has('Space'),crouch:keys.has('ControlLeft')||keys.has('ControlRight')||keys.has('KeyC'),attacking:world.time<attackUntil};}
function resize(){const rect=canvas.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('arena'));window.addEventListener('resize',resize);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showMenu('paused');fatal('The 3D graphics context was lost. Reload the page to restart the renderer.');});
function frame(ms){const dt=Math.min((ms-last)/1000||0,.05);last=ms;
 if(!paused){acc+=dt;while(acc>=1/120){world.step(1/120,input());if(world.player.blocked){swordYaw=world.player.guardYaw;swordPitch=world.player.guardPitch;extension=world.player.extension;}acc-=1/120;if(world.state!=='playing'){if(world.state==='won'||world.state==='complete'){unlocked=Math.max(unlocked,Math.min(P.levels.length-1,world.level+1));try{localStorage.setItem('stickfight-3d-progress',unlocked);}catch{}levelButtons();}showMenu(world.state);acc=0;break;}}events();}else acc=0;
 updateCamera();for(const f of world.fighters)updateVisual(f,visuals.get(f.id));projectiles();effects(paused?0:dt);hud();renderer.render(scene,camera);requestAnimationFrame(frame);
}
rebuild();levelButtons();resize();updateCamera();hud();requestAnimationFrame(frame);
})();
