const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const economy=read('js/economy.js'),css=read('styles.css');

assert.match(economy,/function inventorySummaryStats\(it\)/,'collapsed inventory cards should have a dedicated summary model');
assert.match(economy,/stats\.push\(\['Attack',Math\.round\(\(it\.weaponPower\|\|0\)\*gearMult\)\]\)/,'weapon cards should show effective attack');
assert.match(economy,/stats\.push\(\['Attack Speed',weaponAttackTime/,'weapon cards should show attack speed');
assert.match(economy,/stats\.push\(\['Main Stat',`\+\$\{Math\.round/,'cards should show the primary item stat');
assert.match(economy,/inventorySummaryCard[\s\S]*equipmentIcon\(it\)[\s\S]*inventorySummaryName[\s\S]*inventorySummaryHtml\(it\)/,'collapsed cards should contain only their icon, name, and summary boxes');
const renderStart=economy.indexOf('function renderInv()'),renderEnd=economy.indexOf('\nfunction craftRune',renderStart),render=economy.slice(renderStart,renderEnd);
assert.doesNotMatch(render,/statText\(it\)|itemTier\(it\)|it\.rarity|it\.weaponType|runeSlotsHtml/,'collapsed cards should hide detailed item information');
assert.match(css,/\.inventorySummaryGrid\{display:grid/,'important values should be laid out as boxes');
assert.match(css,/\.inventorySummaryStat\{[^}]*border:/,'every important value should have its own bordered box');
assert.match(css,/\.inventorySummaryName\{font-size:15px/,'the reduced information should allow a larger name');
console.log('Compact inventory item summary tests passed.');
