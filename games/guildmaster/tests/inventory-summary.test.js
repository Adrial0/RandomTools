const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const economy=read('js/economy.js'),css=read('styles.css');

assert.match(economy,/function inventorySummaryStats\(it\)/,'collapsed inventory cards should have a dedicated summary model');
assert.match(economy,/stats\.push\(\['Attack',Math\.round\(\(it\.weaponPower\|\|0\)\*gearMult\)\]\)/,'weapon cards should show effective attack');
assert.match(economy,/stats\.push\(\['Attack Speed',weaponAttackTime/,'weapon cards should show attack speed');
assert.doesNotMatch(economy,/\['Main Stat'/,'main stats should use their actual stat names');
assert.match(economy,/stats\.push\(\[statName\(key\),/,'summary boxes should label stats directly');
assert.match(economy,/const bonusLimit=it\.slot==='Weapon'\?3:5/,'weapons should show three bonus stats while other equipment may show five');
assert.match(economy,/return stats\.slice\(0,5\)/,'no collapsed item should show more than five stats');
assert.match(economy,/inventorySummaryCard[\s\S]*equipmentIcon\(it\)[\s\S]*inventorySummaryName[\s\S]*inventorySummaryHtml\(it\)/,'collapsed cards should contain only their icon, name, and summary boxes');
const renderStart=economy.indexOf('function renderInv()'),renderEnd=economy.indexOf('\nfunction craftRune',renderStart),render=economy.slice(renderStart,renderEnd);
assert.doesNotMatch(render,/statText\(it\)|itemTier\(it\)|it\.rarity|it\.weaponType|runeSlotsHtml/,'collapsed cards should hide detailed item information');
assert.match(css,/\.inventorySummaryGrid\{display:grid/,'important values should be laid out as boxes');
assert.match(css,/\.inventorySummaryStat\{[^}]*border:/,'every important value should have its own bordered box');
assert.match(css,/\.inventorySummaryName\{font-size:15px/,'the reduced information should allow a larger name');
console.log('Compact inventory item summary tests passed.');
