const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const combat=fs.readFileSync(path.join(root,'js','combat.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'js','ui.js'),'utf8');
const activities=fs.readFileSync(path.join(root,'js','activities.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(combat,/EXPEDITION_STAGE_SIZE=5,EXPEDITION_STAGE_COUNT=5,EXPEDITION_MAX_ENCOUNTERS=25/,'expeditions contain five stages of five encounters');
assert.match(combat,/mission\.maxFights=EXPEDITION_MAX_ENCOUNTERS/,'new ordinary expeditions are finite');
assert.match(combat,/missionEncounterLevel\(m\).*m\.level.*Math\.floor\(expeditionEncounterCount\(m\)\/EXPEDITION_STAGE_SIZE\)/s,'monster level increases once per stage');
assert.match(combat,/m\.finiteStage%EXPEDITION_STAGE_SIZE===0.*beginExpeditionStageIntermission/s,'every fifth victory enters a delivery intermission');
assert.match(combat,/depositMissionStash\(m,finalStage\?'Area cleared':'Stage delivery'\)/,'stage rewards are deposited automatically');
assert.match(combat,/possible=Math\.min\(possible,EXPEDITION_STAGE_SIZE-/,'offline progress stops at the next stage boundary');
assert.match(combat,/offlinePaused:!!offline\|\|hidden/,'hidden and offline play pauses after delivery');
assert.match(combat,/m\.lastCheckpoint=Math\.floor\(expeditionEncounterCount\(m\)\/EXPEDITION_STAGE_SIZE\)\*EXPEDITION_STAGE_SIZE/,'defeat records the beginning of the failed stage');
assert.match(combat,/function restartExpedition\(mid,fromBeginning=false\)/,'failed expeditions support checkpoint and full restart');
assert.match(ui,/Start from Last Stage/,'checkpoint restart is the primary failed-expedition action');
assert.match(ui,/Start from Beginning/,'full restart remains available');
assert.match(ui,/function combatDisplayName\(x,enemy=false\)[\s\S]*`\$\{level\} \$\{x\.name\}`/,'enemy names are prefixed by the level number, including migrated battles');
assert.doesNotMatch(ui,/data-active-collect/,'active mission cards no longer expose direct loot claiming');
assert.match(html,/Active Gathering[\s\S]*claimAllGathering\(\)/,'Claim All belongs to the gathering column');
assert.doesNotMatch(html,/Field Operations[\s\S]{0,300}claimAllMissionLoot/,'Field Operations has no Claim All control');

console.log('Finite expedition stage, checkpoint, delivery, level, and claim tests passed.');
