const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),ui=read('js/ui.js'),economy=read('js/economy.js'),progression=read('js/progression.js'),styles=read('styles.css');

assert=(condition,message)=>{if(!condition)throw new Error(message)};
assert(html.includes('navWorkshopColumn')&&html.includes('navGuildColumn'),'workshop and guild navigation are permanently exposed in separate columns');
assert(html.indexOf('navMissionBlock')>html.indexOf('navGuildColumn'),'missions are clearly grouped below the guild navigation');
assert(ui.includes('compactEquipmentSlots(h)'),'member cards show their compact equipment loadout');
assert(economy.includes("compactEquipmentSlots(h,'equip')"),'item equip targets show their compact equipment loadout');
assert(ui.includes("event.stopPropagation();equipModal"),'slot clicks do not trigger the surrounding character card');
assert(styles.includes('.combatHeroPane .visualIcon .gameAsset{transform:none}'),'player combat sprites are not mirrored toward the left');
assert(!progression.includes('2× weapon damage and item effects'),'two-handed item profiles contain no redundant boost explanation');
console.log('Navigation, compact equipment slots, orientation, and item-profile UI tests passed.');
