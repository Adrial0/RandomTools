const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const ui=fs.readFileSync(require.resolve('../js/ui.js'),'utf8');
const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');
assert.match(ui,/function combatEffectIcons\(/,'combatants render effects without opening the inspector');
assert.match(ui,/battleShout:\{icon:/,'Battle Shout has a visible party buff icon');
assert.match(ui,/shieldFaith:\{icon:/,'Shield of Faith has a visible buff icon');
assert.match(css,/#combatBody\{[^}]*overflow-y:auto!important/s,'the combat body itself is scrollable');
assert.match(css,/\.combatReport\{max-height:220px!important;overflow-y:auto!important/,'Mission Report has its own vertical scroll area');
assert.match(css,/conic-gradient/,'timed combat effects use circular countdown visuals');
assert.match(css,/\.combatant\.combatMini\.enemy\{\s*height:auto!important;\s*min-height:108px!important;\s*max-height:none!important/s,'enemy cards grow instead of clipping effect icons');
assert.match(ui,/const reportEl=\$\('combatReport'\),top=reportEl\.scrollTop/,'Mission Report preserves its scroll position during live updates');

const context={Date,Math,Object,Array,String,Number,Set,console,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),fmt:()=> '5s',ensureStatuses:u=>u.statuses||{},STATUS_EFFECTS:{bleed:{icon:'B',name:'Bleeding'}},COMBAT_BUFF_DURATIONS:{battleShout:12000,shieldFaith:10000}};
context.globalThis=context;vm.createContext(context);vm.runInContext(ui,context);
const effects=context.combatEffectIcons({statuses:{bleed:{type:'bleed',stacks:2,expiresAt:Date.now()+5000,duration:6000}},buffs:{battleShout:Date.now()+5000}},false);
assert.match(effects,/combatEffect bleed/,'Bleeding renders directly on the combat card');
assert.match(effects,/combatEffect battleShout/,'Battle Shout renders directly on every affected character card');
console.log('Combat UI tests passed.');
