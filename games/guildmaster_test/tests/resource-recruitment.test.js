const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const economy=read('js/economy.js'),core=read('js/core.js'),app=read('js/app.js'),ui=read('js/ui.js'),html=read('index.html');

assert.match(economy,/RESOURCE_SELL_VALUES=\[0,1,2,3,5,8,13,21,35,58,95\]/,'resource sale value should use the approved tier economy curve');
assert.match(economy,/const total=amount\*resourceSellValue\(k\);s\.gold\+=total/,'resource sales should pay the complete tier-scaled total');
assert.match(economy,/initial\*unitValue/,'the sale preview should show the scaled total');
assert.match(core,/function refreshApplicantBoard\(\)[\s\S]*filter\(r=>r\.locked\)[\s\S]*while\(s\.recruits\.length<target\)s\.recruits\.push\(hero\(\)\)/,'board refreshes should retain locked applicants and replace open positions');
assert.match(core,/function toggleApplicantLock\(rid\)/,'applicants should be lockable');
assert.match(core,/Every applicant is locked/,'paid rerolls should not charge when nothing can change');
assert.match(app,/if\(s\.nextApplicantsAt&&Date\.now\(\)>=s\.nextApplicantsAt\)\{[\s\S]*refreshApplicantBoard/,'the five-minute timer should refresh a populated board');
assert.doesNotMatch(ui,/if\(s\.recruits\.length\)return'Current applicants remain/,'the countdown should continue while applicants exist');
assert.match(ui,/Reroll Unlocked/,'manual rerolls should explain their lock behavior');
assert.match(ui,/toggleApplicantLock/,'applicant cards should expose their lock control');
assert.match(html,/Lock applicants you want to keep/,'the recruitment description should explain automatic rotation');
console.log('Tier-scaled resource sales and rotating recruitment board tests passed.');
