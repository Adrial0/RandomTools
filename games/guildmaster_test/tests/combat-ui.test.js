const assert=require('node:assert/strict');
const fs=require('node:fs');

const ui=fs.readFileSync(require.resolve('../js/ui.js'),'utf8');
const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');
assert.match(ui,/function combatEffectIcons\(/,'combatants render effects without opening the inspector');
assert.match(ui,/battleShout:\{icon:/,'Battle Shout has a visible party buff icon');
assert.match(ui,/shieldFaith:\{icon:/,'Shield of Faith has a visible buff icon');
assert.match(css,/#combatBody\{[^}]*overflow-y:auto!important/s,'the combat body itself is scrollable');
assert.match(css,/\.combatReport\{max-height:220px!important;overflow-y:auto!important/,'Mission Report has its own vertical scroll area');
assert.match(css,/conic-gradient/,'timed combat effects use circular countdown visuals');
assert.match(css,/\.combatant\.combatMini\.enemy\{\s*height:108px!important/s,'enemy cards leave room for effect icons');
console.log('Combat UI tests passed.');
