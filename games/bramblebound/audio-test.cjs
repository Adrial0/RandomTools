const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const events={},storage={},nodes=[];let clock=0;
const param=()=>({value:0,setTargetAtTime(v){assert.ok(Number.isFinite(v))},setValueAtTime(v){assert.ok(Number.isFinite(v))},linearRampToValueAtTime(v){assert.ok(Number.isFinite(v))},exponentialRampToValueAtTime(v){assert.ok(v>0&&Number.isFinite(v))}});
function node(kind){const n={kind,gain:param(),frequency:param(),Q:param(),threshold:param(),ratio:param(),connect(){},disconnect(){},start(t){assert.ok(Number.isFinite(t))},stop(t){assert.ok(Number.isFinite(t));this.onended?.()}};nodes.push(n);return n}
class Audio {constructor(){this.state='running';this.sampleRate=8000;this.destination=node('destination')}get currentTime(){return clock}createGain(){return node('gain')}createDynamicsCompressor(){return node('compressor')}createBiquadFilter(){return node('filter')}createOscillator(){return node('oscillator')}createBufferSource(){return node('noise')}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)}}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}}
const sandbox={window:{AudioContext:Audio},document:{hidden:false,addEventListener:(name,fn)=>events[name]=fn,querySelector:()=>null},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v}};
vm.runInNewContext(fs.readFileSync(__dirname+'/audio.js','utf8'),sandbox);const audio=sandbox.BrambleAudio;
audio.play('hurt');assert.equal(nodes.length,0,'Audio remains locked before interaction');events.pointerdown();
for(const event of ['hurt','enemyHit','death','clear','click']){clock++;const before=nodes.length;audio.play(event);assert.ok(nodes.length>before,event+' creates a sound')}
clock++;audio.play('enemyHit');const limited=nodes.length;audio.play('enemyHit');assert.equal(nodes.length,limited,'Repeated impacts are limited');
audio.configure('enemyHits',false);clock++;audio.play('enemyHit');assert.equal(nodes.length,limited);audio.configure('enabled',false);audio.play('hurt');assert.equal(nodes.length,limited);audio.configure('enabled',true);
vm.runInNewContext(fs.readFileSync(__dirname+'/gear.js','utf8'),sandbox);
for(const w of Object.values(sandbox.BrambleGear.items).filter(w=>w.type==='weapon'&&!w.retired)){clock++;const before=nodes.length;audio.play(w.classId===7?'summon':'weapon',w.classId===7?{kind:w.summon.kind}:w);assert.ok(nodes.length>before,w.id);if(w.effect){clock++;audio.play('spell',w)}}
clock++;let before=nodes.length;audio.play('weapon',{id:'bow',classId:2,arrows:1});const single=nodes.length-before;clock++;before=nodes.length;audio.play('weapon',{id:'bow',classId:2,arrows:4});assert.ok(nodes.length-before>single,'Multishot uses layered releases');
audio.configure('master',.2);assert.equal(JSON.parse(storage['bramblebound-audio-v1']).master,.2);assert.equal(audio.getSettings().master,.2);
console.log('Audio gesture unlock, every live weapon/spell, voice envelopes, hit limiting, multishot, mute and saved settings pass.');
