(() => {
'use strict';
const defaults={enabled:true,master:.55,combat:.65,menus:.35,enemyHits:true},key='bramblebound-audio-v1';
let settings={...defaults},context,master,combat,menus,noiseBuffer,voices=0;
try{const saved=JSON.parse(localStorage.getItem(key)||'{}');for(const k of Object.keys(defaults))if(typeof saved[k]===typeof defaults[k])settings[k]=typeof saved[k]==='number'?Math.max(0,Math.min(1,saved[k])):saved[k]}catch{}
const last=new Map();
function levels(){if(!context)return;master.gain.setTargetAtTime(settings.enabled?settings.master:0,context.currentTime,.015);combat.gain.setTargetAtTime(settings.combat,context.currentTime,.015);menus.gain.setTargetAtTime(settings.menus,context.currentTime,.015)}
function unlock(){
 try{if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();combat=context.createGain();menus=context.createGain();const limiter=context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=8;combat.connect(master);menus.connect(master);master.connect(limiter);limiter.connect(context.destination);noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noiseBuffer.getChannelData(0);let seed=417;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}levels();}if(context.state==='suspended'&&!document.hidden)context.resume().catch(()=>{});}catch{}
}
function voice(freq,duration=.12,type='triangle',volume=.12,delay=0,end=freq,noise=false,channel='combat'){
 if(voices>=48)return;const now=context.currentTime+delay,gain=context.createGain(),source=noise?context.createBufferSource():context.createOscillator(),filter=context.createBiquadFilter();
 if(noise){source.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=.7;}else{source.type=type;source.frequency.setValueAtTime(Math.max(25,freq),now);source.frequency.exponentialRampToValueAtTime(Math.max(25,end),now+duration);filter.type='lowpass';filter.frequency.value=6000;}
 gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);source.connect(filter);filter.connect(gain);gain.connect(channel==='menus'?menus:combat);voices++;source.onended=()=>{voices--;source.disconnect();filter.disconnect();gain.disconnect()};source.start(now);source.stop(now+duration+.015);
}
function play(event,data={}){
 if(!context||context.state!=='running'||!settings.enabled||!settings.master)return;
 if(event==='enemyHit'&&!settings.enemyHits)return;
 const gap={enemyHit:.1,hurt:.06,death:.09,weapon:.025,spell:.04,summon:.07,click:.035,clear:1}[event]||.04;
 const bucket=event==='weapon'||event==='spell'?event+':'+(data.id||data.classId||''):event,now=context.currentTime;
 if(now-(last.get(bucket)??-100)<gap)return;last.set(bucket,now);
 const w=data.weapon||data,hash=Array.from(String(w.id||data.kind||event)).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7),pitch=.9+hash/4294967295*.2;
 const tone=(f,d=.12,t='triangle',v=.12,delay=0,end=f)=>voice(f*pitch,d,t,v,delay,end*pitch);
 const hiss=(f,d=.12,v=.1,delay=0)=>voice(f,d,'sine',v,delay,f,true);
 if(event==='click'){voice(850,.035,'sine',.07,0,600,false,'menus');return}
 if(event==='hurt'){hiss(450,.09,.17);tone(120,.09,'triangle',.18,0,55);return}
 if(event==='enemyHit'){hiss(1000,.045,.07);tone(220,.045,'triangle',.07,0,100);return}
 if(event==='death'){tone(data.ally?260:140,.28,'triangle',.16,0,40);hiss(650,.16,.1);return}
 if(event==='clear'){[0,4,7,12,16].forEach((n,i)=>tone(261.63*2**(n/12),.35,'triangle',.13,i*.105));return}
 if(event==='summon'){const f=data.kind==='golem'?100:data.kind==='spirit'?650:240;tone(f,.4,'sine',.14,0,f*2);tone(f*1.5,.25,'triangle',.08,.12,f*2);hiss(800,.2,.07);return}
 if(event==='spell'){
  const element=w.effect||data.element||'magic';
  if(element==='fire'){hiss(550,.3,.2);tone(95,.23,'sawtooth',.06,0,45)}
  else if(element==='ice'||element==='slow'){[900,1350,1900].forEach((f,i)=>tone(f,.22,'sine',.09,i*.035));hiss(3500,.1,.04)}
  else if(element==='lightning'){for(let i=0;i<3;i++)hiss(2400,.055,.13,i*.04);tone(180,.16,'sawtooth',.06,0,60)}
  else if(element==='poison'){[180,260,155].forEach((f,i)=>tone(f,.14,'sine',.14,i*.065,f*.65))}
  else if(['heal','restore','cleanse','guard'].includes(element)){[440,554,660].forEach((f,i)=>tone(f,.25,'sine',.09,i*.045))}
  else if(element==='drain'){tone(440,.3,'sine',.12,0,100);tone(222,.3,'triangle',.06)}
  else{hiss(850,.12,.11);tone(180,.18,'triangle',.12,0,70)}
  const mode=w.ability?.mode;if(mode==='fan')tone(700,.09,'sine',.06,.08);if(mode==='chain')for(let i=1;i<4;i++)tone(350+i*150,.06,'sine',.05,i*.07);if(mode==='ring')tone(220,.35,'sine',.05,0,600);
  return;
 }
 if(event==='weapon'){
  if(w.classId===6){const instrument=w.instrument||'lute',notes=[261.63,293.66,329.63,392,440],f=notes[hash%notes.length];if(instrument==='horn'){tone(f/2,.25,'sawtooth',.085);tone(f,.22,'triangle',.05)}else if(instrument==='flute'){tone(f*2,.25,'sine',.14);hiss(2600,.16,.025)}else if(instrument==='harp'){[1,1.25,1.5].forEach((n,i)=>tone(f*n,.28,'sine',.11,i*.035))}else{tone(f,.19,'triangle',.14);tone(f*2,.07,'sine',.05);hiss(1400,.025,.035)}return}
  if(w.classId===2){const count=Math.min(8,w.arrows||1);for(let i=0;i<count;i++){const delay=i*.019;hiss(2800,.10,.09/Math.sqrt(count),delay);tone(370+i*37,.09,'triangle',.09/Math.sqrt(count),delay,120+i*15)}return}
  if(w.classId===4){tone(523,.24,'sine',.11);tone(784,.18,'sine',.07,.03);return}
  if(w.classId===3){tone(330,.15,'sine',.1,0,660);return}
  const f=w.classId===1?2300:w.classId===5?650:1200,d=w.classId===1?.055:w.classId===5?.19:.12;
  hiss(f,d,.12);tone(w.classId===1?620:w.classId===5?150:330,d,'triangle',.08,0,90);
  // A stable per-item overtone distinguishes variants within a weapon family.
  tone(400+(hash%900),d*.7,'sine',.025);
 }
}
function configure(name,value){if(!(name in defaults))return;settings[name]=typeof defaults[name]==='boolean'?!!value:Math.max(0,Math.min(1,Number(value)||0));levels();try{localStorage.setItem(key,JSON.stringify(settings))}catch{}}
function bindSettings(){for(const name of Object.keys(defaults)){const input=document.querySelector('#audio-'+name);if(!input)continue;if(typeof defaults[name]==='boolean')input.checked=settings[name];else input.value=Math.round(settings[name]*100);input.addEventListener('input',()=>{unlock();configure(name,input.type==='checkbox'?input.checked:Number(input.value)/100)})}document.querySelector('#audio-test')?.addEventListener('click',()=>{unlock();play('weapon',{classId:0,id:'preview-sword'})});}
document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);document.addEventListener('click',e=>{const button=e.target.closest?.('button');if(button&&!button.disabled)play('click')});document.addEventListener('visibilitychange',()=>{if(document.hidden)context?.suspend().catch(()=>{})});
globalThis.BrambleAudio={play,configure,getSettings:()=>({...settings}),unlock};bindSettings();
})();
