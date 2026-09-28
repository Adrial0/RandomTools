// Exercises actual Three.js scene construction, transforms and UI callbacks.
// Only the GPU renderer and browser host APIs are mocked; this is not visual QA.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('./vendor/three.min.js'),Physics=require('./physics3d.js');
function harness(){
 const elements=new Map(),listeners={},frames=[],renders=[];let clock=0;
 function element(id=''){const e={id,style:{},children:[],hidden:false,disabled:false,textContent:'',className:'',append(c){this.children.push(c);},addEventListener(k,f){(this.events??={})[k]=f;},replaceChildren(){this.children=[];},remove(){},getBoundingClientRect:()=>({left:0,top:0,width:1400,height:750})};return e;}
 const document={getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id);},createElement:()=>element(),addEventListener(k,f){listeners[k]=f;},exitPointerLock(){document.pointerLockElement=null;},fullscreenElement:null};
 const canvas=document.getElementById('view');canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;listeners.pointerlockchange?.();return Promise.resolve();};
 class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite),`invalid ${o.type} transform`);});renders.push({scene,camera});}}
 const window={THREE:{...THREE,WebGLRenderer:Renderer},StickPhysics:Physics,devicePixelRatio:1,addEventListener(k,f){listeners[k]=f;}};
 const context={window,document,console,performance:{now:()=>clock},localStorage:{getItem:()=>null,setItem(){}},ResizeObserver:class{constructor(cb){this.cb=cb;}observe(){this.cb();}},requestAnimationFrame:f=>frames.push(f)};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/game3d.js','utf8'),context);
 function frame(n=1){for(let i=0;i<n;i++){clock+=1000/60;const f=frames.shift();assert.ok(f);f(clock);}}
 return{elements,document,listeners,frame,renders,click:id=>elements.get(id).onclick()};
}
test('Three.js scene initializes and all 14 rounds construct finite render transforms',()=>{const h=harness();h.frame();assert.equal(h.elements.get('levels').children.length,14);assert.equal(h.elements.has('error'),false);
 for(let i=0;i<14;i++){h.elements.get('levels').children[i].onclick();h.frame(8);assert.match(h.elements.get('round').textContent,new RegExp(String(i+1).padStart(2,'0')));}
 assert.ok(h.renders.length>100);
});
test('camera switches, keyboard movement, sword input, pause and retry work through UI handlers',()=>{const h=harness();h.click('start');h.frame(2);const third=h.renders.at(-1).camera.position.clone();h.click('camera');h.frame();const first=h.renders.at(-1).camera.position.clone();assert.ok(first.distanceTo(third)>3);assert.match(h.elements.get('camera').textContent,/First person/);
 h.listeners.keydown({code:'KeyW',repeat:false,preventDefault(){}});h.frame(30);h.listeners.keyup({code:'KeyW'});assert.ok(h.renders.at(-1).camera.position.distanceTo(first)>1);
 h.elements.get('view').events.mousedown({button:0});h.listeners.mousemove({movementX:30,movementY:-20});h.frame(3);assert.equal(h.elements.get('sword-cursor').style.display,'block');h.listeners.mouseup({button:0});h.click('pause');h.frame();assert.equal(h.elements.get('overlay').hidden,false);h.click('start');h.frame();assert.equal(h.elements.get('overlay').hidden,true);
 h.listeners.keydown({code:'KeyR',repeat:false,preventDefault(){}});h.frame();assert.equal(h.elements.get('hp').textContent,'100 / 100');
});

