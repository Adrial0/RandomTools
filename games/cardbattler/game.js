(() => {
  'use strict';
  const game = new CardBattle.Game(window.CARDBATTLER_DATA);
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SAVE = 'myrandomtools-cardbattler-v1';
  let selected=null, inspected=null, busy=false, visual=null, saveAvailable=true;
  const encounterNames=['The first crossing','Iron & incantations','The old guard','A gathering darkness','The last stronghold'];
  const encounterNotes=['A small force holds the road. Find your first combinations.','Machines and mages reinforce the enemy line.','Armored defenders and furious fighters stand in your way.','Curses and healers test your formation.','Break through the mech and its supporting army.'];
  const uiState=()=>visual||game.state;
  const palette=new Map(window.CARDBATTLER_DATA.colorPalette.map(color=>[color.id,color]));
  function colorStrip(id) {
    const colors=game.profile(id).colors;
    return `<span class="color-strip" role="img" aria-label="${escape(colors.join(' + '))}" title="${escape(colors.join(' + '))}">${colors.map(color=>`<span class="color-segment" style="background:${palette.get(color).hex}"></span>`).join('')}</span>`;
  }
  function save() {try {localStorage.setItem(SAVE,JSON.stringify(game.state));$('save-status').textContent='Progress saved locally';}catch{$('save-status').textContent='Saving unavailable';saveAvailable=false;}}
  try {const stored=localStorage.getItem(SAVE);if(!stored||!game.restore(JSON.parse(stored)))game.newRun();}catch{game.newRun();saveAvailable=false;}
  function cardMarkup(id,index,extra='') {
    const card=game.definition(id), p=game.profile(id);
    const partner=index!==null?game.state.merge.find(Boolean):null;
    const compatibility=partner?game.recipesFor(partner,id).length?'merge-compatible':game.sharedColors(partner,id).length?'merge-conflict':'':'';
    return `<button class="card ${extra} ${compatibility}" ${index!==null?`data-card="${index}"`:`data-choice="${escape(id)}"`} aria-label="${escape(card.name)}, colors ${escape(p.colors.join(' + '))}, ${p.cost} mana, ${p.attack} attack, ${p.health} health">${colorStrip(id)}<span class="cost">${p.cost}</span><span class="symbol" aria-hidden="true">${p.symbol}</span><strong>${escape(card.name)}</strong><span class="theme">${escape(card.theme)}</span><span class="card-stats">⚔ ${p.attack} &nbsp; ♥ ${p.health}${p.armor?` &nbsp; ◈ ${p.armor}`:''}</span><span class="card-keywords">${escape(p.keywords.join(' · ')||'No keywords')}</span>${compatibility==='merge-compatible'?'<span class="merge-match">✓ Can combine</span>':''}</button>`;
  }
  function inspect(id,unit) {
    if(!id){$('inspector').innerHTML='<p>Select a card or a unit to inspect its stats and prototype behavior.</p><p class="small">Numbers on units show their activation order.</p>';return;}
    const card=game.definition(id),p=game.profile(id);
    $('inspector').innerHTML=`<h3>${p.symbol} ${escape(card.name)}</h3><span class="tag">${escape(card.theme)}</span>${card.subgroup?`<span class="tag">${escape(card.subgroup)}</span>`:''}<div class="stat-line">⚔ ${unit?unit.attack:p.attack} attack · ♥ ${unit?unit.hp+'/'+unit.maxHP:p.health} health<br>Range ${unit?unit.range:p.range} · Armor ${unit?unit.armor:p.armor} · Move 1</div><p>${escape(p.description)}</p>${p.keywords.map(k=>`<span class="tag">${escape(k)}${p.pendingKeywords.includes(k)?' · pending':''}</span>`).join('')}${p.pendingAbility&&card.designNotes?`<p class="small">Planned ability: ${escape(card.designNotes)}</p>`:''}<p class="small">Prototype stats and costs. Some effects use temporary designs.</p>`;
  }
  function render() {
    const s=uiState();
    $('run-bar').innerHTML=encounterNames.map((name,i)=>`<div class="run-node ${i===s.encounter?'current':i<s.encounter?'done':''}">${i<s.encounter?'✓':String(i+1).padStart(2,'0')} &nbsp; ${escape(name)}</div>`).join('');
    $('encounter-title').textContent=encounterNames[s.encounter];$('encounter-note').textContent=encounterNotes[s.encounter];
    $('resources').innerHTML=`<div class="resource">MANA<strong class="mana">${s.mana} <span class="small">/ 3</span></strong></div><div class="resource">GOLD<strong>${s.gold}</strong></div>`;
    $('enemy-hp').textContent=s.enemyHP+' / '+s.enemyMaxHP;$('player-hp').textContent=s.playerHP+' / '+s.playerMaxHP;
    $('enemy-health').style.width=100*s.enemyHP/s.enemyMaxHP+'%';$('player-health').style.width=100*s.playerHP/s.playerMaxHP+'%';
    const ordering={};for(const team of ['player','enemy'])s.units.filter(u=>u.team===team).sort((a,b)=>team==='player'?a.row-b.row||a.col-b.col:b.row-a.row||b.col-a.col).forEach((u,i)=>ordering[u.uid]=i+1);
    let tiles='';
    for(let row=0;row<6;row++)for(let col=0;col<6;col++) {
      const unit=s.units.find(u=>u.row===row&&u.col===col);
      const deployable=!busy&&s.phase==='planning'&&selected!==null&&row>=3&&!unit&&game.profile(s.hand[selected]).cost<=s.mana;
      const label=unit?`${unit.team} ${game.definition(unit.cardId).name}, ${unit.hp} health, ${unit.attack} attack`:`Row ${row+1}, column ${col+1}${row===0?' enemy base':row===5?' your base':''}${deployable?', deploy here':''}`;
      tiles+=`<button class="tile ${row<3?'enemy-home':'player-home'} ${row===0?'base-enemy':row===5?'base-player':''} ${unit?'occupied '+unit.team:''} ${deployable?'deployable':''}" data-row="${row}" data-col="${col}" aria-label="${escape(label)}">${unit?`<span class="order">${ordering[unit.uid]}</span><span class="conditions">${unit.burn?'♨':''}${unit.poison?'●':''}${unit.freeze?'❄':''}${unit.stealth?'◌':''}</span><span class="symbol" aria-hidden="true">${game.profile(unit.cardId).symbol}</span><span class="unit-name">${escape(game.definition(unit.cardId).name)}</span><span class="unit-stats">${unit.attack} / ${unit.hp}</span><span class="hp-mini"><i style="width:${Math.max(0,100*unit.hp/unit.maxHP)}%"></i></span>`:`<span class="tile-id">${row===0?'BASE ↓':row===5?'BASE ↑':String.fromCharCode(65+col)+(row+1)}</span>`}</button>`;
    }
    $('board').innerHTML=tiles;
    const phases={'planning':'Your turn','player-action':'Your army acts','enemy-action':'Enemy turn','reward':'Victory','camp':'At camp','won':'Expedition complete','lost':'Base destroyed'};
    $('phase').textContent=phases[s.phase];$('turn-note').textContent='Battle '+(s.encounter+1)+' · Turn '+s.turn+(busy?' · resolving':'');
    $('end-turn').disabled=busy||s.phase!=='planning';
    $('hand-count').textContent='('+s.hand.length+')';$('deck-count').textContent=s.draw.length+' to draw · '+s.discard.length+' discarded · '+s.deck.length+' in deck';
    $('hand').innerHTML=s.hand.length?s.hand.map((id,i)=>cardMarkup(id,i,selected===i?'selected':'')).join(''):'<div class="empty-hand">Your hand is empty. End your turn to draw more cards.</div>';
    $('hand').querySelectorAll('button').forEach(b=>b.disabled=busy||s.phase!=='planning');
    $('merge-slots').innerHTML=s.merge.map((id,i)=>`<button class="merge-slot" data-slot="${i}" ${busy||s.phase!=='planning'?'disabled':''}>${id?colorStrip(id):''}<span aria-hidden="true">${id?game.profile(id).symbol:'+'}</span>${id?escape(game.definition(id).name):'Slot '+(i+1)}</button>`).join('');
    const options=game.mergeOptions();
    const shared=s.merge.every(Boolean)?game.sharedColors(...s.merge):[];
    $('merge-preview').innerHTML=options.length?'→ '+options.map(r=>colorStrip(r.result)+escape(game.definition(r.result).name)).join(' or '):shared.length?'Cannot combine: shared '+escape(shared.join(', '))+' color.':s.merge.every(Boolean)?'No recipe for this pair. Click a slot to return its card.':'No shared colors + a matching recipe = a combination.';
    $('merge-button').disabled=busy||s.phase!=='planning'||!options.length||s.hand.length>=10;
    $('journal').innerHTML=s.log.slice(0,14).map(line=>`<li>${escape(line)}</li>`).join('');
    if(inspected){const u=s.units.find(u=>u.uid===inspected.uid);inspect(inspected.id,u);}else inspect(selected!==null?s.hand[selected]:null);
  }
  function notify(text) {game.log(text);render();}
  function dialog(html) {$('overlay-content').innerHTML=html;if(!$('overlay').open)$('overlay').showModal();}
  function showPhase() {
    const s=game.state;
    if(s.phase==='reward')dialog(`<p class="eyebrow">BATTLE WON</p><h2>A new addition</h2><p>Choose one card to add permanently to your deck. Your base health carries into the next battle.</p><div class="choices">${s.rewards.map(id=>cardMarkup(id,null)).join('')}</div><p class="small">Inspect each card by hovering or focusing it.</p><div id="choice-detail"></div>`);
    else if(s.phase==='camp')showCamp();
    else if(['won','lost'].includes(s.phase))dialog(`<p class="eyebrow">${s.phase==='won'?'EXPEDITION COMPLETE':'EXPEDITION ENDED'}</p><h2>${s.phase==='won'?'You held the line.':'Your base has fallen.'}</h2><p>${s.phase==='won'?'All five strongholds defeated.':'Reached battle '+(s.encounter+1)+' of 5.'} Your final deck contained ${s.deck.length} cards.</p><div class="dialog-actions"><button class="primary" data-action="restart">Start a new run</button><button class="secondary" data-action="close">Inspect battlefield</button></div>`);
  }
  function showCamp() {
    const s=game.state;
    dialog(`<p class="eyebrow">REST BETWEEN BATTLES</p><h2>Make camp</h2><p>Base health ${s.playerHP}/${s.playerMaxHP} · ${s.gold} gold</p><div class="dialog-actions"><button data-buy="heal" ${s.gold<4||s.playerHP===s.playerMaxHP?'disabled':''}>Repair base +10 ♥ · 4 gold</button><button data-buy="war-banner" ${s.gold<8||s.artifacts.includes('war-banner')?'disabled':''}>War banner +15% damage · 8 gold${s.artifacts.includes('war-banner')?' · owned':''}</button></div><p class="small">War banner is a temporary prototype artifact. Repair can be purchased more than once.</p><button class="primary" data-action="continue">Next battle →</button>`);
  }
  $('hand').addEventListener('click',event=>{const button=event.target.closest('[data-card]');if(!button||busy)return;const i=Number(button.dataset.card);selected=selected===i?null:i;inspected=null;render();});
  $('board').addEventListener('click',event=>{
    const tile=event.target.closest('[data-row]');if(!tile||busy)return;const row=Number(tile.dataset.row),col=Number(tile.dataset.col),unit=game.unitAt(row,col);
    if(unit){inspected={id:unit.cardId,uid:unit.uid};render();return;}
    if(selected!==null){if(game.deploy(selected,row,col)){selected=null;inspected=null;save();render();}else notify('Deploy on an empty tile in your bottom three rows, with enough mana.');}
  });
  $('merge-slots').addEventListener('click',event=>{const button=event.target.closest('[data-slot]');if(!button||busy)return;const slot=Number(button.dataset.slot);if(game.state.merge[slot]){if(!game.retrieve(slot))notify('Your hand is full.');}else if(selected!==null)game.store(selected,slot);selected=null;inspected=null;save();render();});
  $('merge-button').addEventListener('click',()=>{const options=game.mergeOptions();if(options.length>1)dialog(`<h2>Choose your combination</h2><div class="choices">${options.map(r=>cardMarkup(r.result,null)).join('')}</div><button data-action="close">Back</button>`);else{game.merge();selected=null;save();render();}});
  $('end-turn').addEventListener('click',async()=>{
    if(busy)return;busy=true;selected=null;inspected=null;
    const frames=game.endTurn();save();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {for(const frame of frames){visual=frame.state;render();await new Promise(resolve=>setTimeout(resolve,reduced?0:Math.max(50,Math.min(180,4500/frames.length))));}}
    finally {visual=null;busy=false;render();showPhase();}
  });
  $('new-run').addEventListener('click',()=>{if(busy)return;dialog('<h2>Start a new expedition?</h2><p>This replaces your current saved run.</p><div class="dialog-actions"><button class="primary" data-action="restart">Start new run</button><button data-action="close">Keep playing</button></div>');});
  $('catalog-button').addEventListener('click',()=>dialog(`<p class="eyebrow">FULL ROSTER</p><h2>${game.playable().length} playable cards</h2><p>Every card is available for deployment, rewards, and recipe-based merging. Unfinished cards use provisional stats and implemented keywords while their abilities are being designed. Hover or focus a card to read its current behavior.</p><div id="choice-detail"></div><div class="catalog">${game.playable().map(c=>cardMarkup(c.id,null)).join('')}</div><button data-action="close">Back to battle</button>`));
  $('overlay-content').addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='close')$('overlay').close();
    if(action==='restart'){game.newRun();selected=null;inspected=null;$('overlay').close();save();render();}
    if(action==='continue'){game.continueRun();$('overlay').close();save();render();}
    const buy=event.target.closest('[data-buy]')?.dataset.buy;if(buy){game.buyCamp(buy);save();render();showCamp();}
    const choice=event.target.closest('[data-choice]')?.dataset.choice;
    if(choice&&game.state.phase==='reward'){game.chooseReward(choice);save();render();showCamp();}
    else if(choice&&$('overlay-content').querySelector('h2')?.textContent==='Choose your combination'){game.merge(choice);selected=null;$('overlay').close();save();render();}
  });
  function showChoice(event) {const id=event.target.closest('[data-choice]')?.dataset.choice;const detail=$('choice-detail');if(id&&detail){const p=game.profile(id),card=game.definition(id);detail.innerHTML=`<strong>${escape(card.name)}</strong><p>${escape(p.description)}</p>${p.pendingKeywords.length?`<p class="small">Keywords pending implementation: ${escape(p.pendingKeywords.join(', '))}</p>`:''}${p.pendingAbility&&card.designNotes?`<p class="small">Planned ability: ${escape(card.designNotes)}</p>`:''}`;}}
  $('overlay-content').addEventListener('mouseover',showChoice);$('overlay-content').addEventListener('focusin',showChoice);
  $('overlay').addEventListener('cancel',event=>{if(['reward','camp'].includes(game.state.phase))event.preventDefault();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('overlay').open){selected=null;inspected=null;render();}});
  render();if(saveAvailable)save();showPhase();
  // Small read-only-facing entry point for local development and smoke verification.
  window.cardbattler={game,render};
})();
