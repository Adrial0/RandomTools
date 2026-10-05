(() => {
  'use strict';
  const game = new CardBattle.Game(window.CARDBATTLER_DATA);
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SAVE = 'myrandomtools-cardbattler-v1';
  let selected=null, inspected=null, busy=false, visual=null, saveAvailable=true;
  let drag=null, suppressClickUntil=0;
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
  const imageSources=new Map();
  const imageExtensions=['png','webp','jpg','jpeg'];
  function portrait(id,kind='detail') {
    const card=game.definition(id),base=card.baseId||id,key=encodeURIComponent(base),source=imageSources.get(base);
    const path=source===undefined?'assets/characters/'+key+'.png':source;
    return `<span class="portrait portrait-${kind}" role="img" aria-label="${escape(card.name)}"><span class="portrait-placeholder" aria-hidden="true"><svg viewBox="0 0 80 100"><circle cx="40" cy="29" r="16"/><path d="M10 95v-18a30 30 0 0 1 60 0v18z"/></svg></span>${path?`<img src="${escape(path)}" data-portrait="${escape(base)}" data-image-index="0" alt="" draggable="false">`:''}</span>`;
  }
  document.addEventListener('error',event=>{
    const img=event.target;if(!img.matches?.('img[data-portrait]'))return;
    const base=img.dataset.portrait,next=Number(img.dataset.imageIndex)+1;
    if(next<imageExtensions.length){img.dataset.imageIndex=String(next);img.src='assets/characters/'+encodeURIComponent(base)+'.'+imageExtensions[next];}
    else{imageSources.set(base,null);img.remove();}
  },true);
  document.addEventListener('load',event=>{const img=event.target;if(img.matches?.('img[data-portrait]'))imageSources.set(img.dataset.portrait,img.getAttribute('src'));},true);
  function cardMarkup(id,index,extra='') {
    const card=game.definition(id), p=game.profile(id);
    const partner=null;
    const compatibility=partner?game.recipesFor(partner,id).length?'merge-compatible':game.sharedColors(partner,id).length?'merge-conflict':'':'';
    return `<button class="card ${extra} ${compatibility}" ${index!==null?`data-card="${index}"`:`data-choice="${escape(id)}"`} title="${escape(p.description)}" aria-label="${escape(card.name)}, colors ${escape(p.colors.join(' + '))}, ${p.price} gold to buy, ${p.attack} attack, ${p.health} health">${colorStrip(id)}<span class="cost">${p.price}g</span><span class="symbol" aria-hidden="true">${p.symbol}</span><strong>${escape(card.name)}</strong><span class="theme">${escape(card.theme)}</span><span class="ability-summary">${escape(p.description)}</span><span class="card-stats">⚔ ${p.attack} &nbsp; ♥ ${p.health}${p.armor?` &nbsp; ◈ ${p.armor}`:''}</span><span class="card-keywords">${escape(p.keywords.join(' · ')||'No keywords')}</span>${compatibility==='merge-compatible'?'<span class="merge-match">✓ Can combine</span>':''}</button>`;
  }
  function mergeDetails(id) {
    const card=game.definition(id),baseId=card.baseId||id;
    const name=other=>`<span class="recipe-card">${colorStrip(other)}${escape(game.definition(other).name)}</span>`;
    const built=game.recipes.filter(r=>r.result===baseId);
    const next=game.recipes.filter(r=>r.ingredients.includes(baseId)).filter(r=>game.recipesFor(id,r.ingredients.find(partner=>partner!==baseId)||baseId).some(option=>option.result===r.result));
    const origins=card.mass?`<li>Combined Blobs · ${card.mass} Blobs absorbed</li>`:built.map(r=>`<li>${name(r.ingredients[0])} <span>+</span> ${name(r.ingredients[1])}</li>`).join('');
    const upgrades=next.map(r=>`<li>${name(r.ingredients.find(partner=>partner!==baseId)||baseId)} <span>→</span> ${name(r.result)}</li>`);
    if(baseId==='blob'&&(card.mass||1)<128)upgrades.unshift(`<li>${name('blob')} <span>→</span> ${name('blob:'+((card.mass||1)+1))}<small>Self-merge exception</small></li>`);
    return `<section class="recipe-details"><h4>Created from</h4>${origins?`<ul>${origins}</ul>`:'<p class="small">Base card · no ingredients.</p>'}<h4>Merge with → result</h4>${upgrades.length?`<ul>${upgrades.join('')}</ul>`:'<p class="small">No further merge recipes.</p>'}</section>`;
  }
  function inspect(id,unit) {
    if(!id){$('inspector').innerHTML='<p>Select a card or a unit to inspect its stats and prototype behavior.</p><p class="small">Numbers on units show their activation order.</p>';return;}
    const card=game.definition(id),p=game.profile(id);
    $('inspector').innerHTML=`${portrait(id)}<h3>${escape(card.name)}</h3>${colorStrip(id)}<span class="tag">${escape(card.theme)}</span>${card.subgroup?`<span class="tag">${escape(card.subgroup)}</span>`:''}<div class="stat-line">⚔ ${unit?unit.attack:p.attack} attack · ♥ ${unit?unit.hp+'/'+unit.maxHP:p.health} health<br>Range ${unit?unit.range:p.range} · Armor ${unit?unit.armor:p.armor} · Move ${p.keywords.includes('stationary')?0:1} · Shop ${p.price} gold${unit&&unit.faith?' · Faith '+unit.faith:''}${unit&&unit.karma!==undefined?' · Karma '+unit.karma:''}</div><p>${escape(p.description)}</p>${p.keywords.map(k=>`<span class="tag" title="${escape(p.keywordDescriptions[k]||'Pending definition')}">${escape(k)}${p.pendingKeywords.includes(k)?' · pending':''}</span>`).join('')}<div class="keyword-notes">${p.keywords.filter(k=>!p.pendingKeywords.includes(k)&&p.keywordDescriptions[k]).map(k=>`<p class="small"><strong>${escape(k)}:</strong> ${escape(p.keywordDescriptions[k])}</p>`).join('')}</div>${p.pendingAbility&&card.designNotes?`<p class="small">Planned ability: ${escape(card.designNotes)}</p>`:''}<p class="small">Unspecified amounts and timing use prototype values.</p>`;
    $('inspector').querySelector('.stat-line').insertAdjacentHTML('afterend',mergeDetails(id));
  }
  function render() {
    const s=uiState();
    $('run-bar').innerHTML=encounterNames.map((name,i)=>`<div class="run-node ${i===s.encounter?'current':i<s.encounter?'done':''}" title="${escape(name)}"><span class="run-step">${i<s.encounter?'✓':i+1}</span> &nbsp; ${escape(name)}</div>`).join('');
    $('encounter-title').textContent=encounterNames[s.encounter];$('encounter-note').textContent=encounterNotes[s.encounter];
    $('resources').innerHTML=`<div class="resource">LIVES<strong class="lives">${s.lives} / 3</strong></div><div class="resource">GOLD<strong class="mana">${s.gold}</strong></div><div class="resource">INCOME<strong>+${game.income()}</strong></div>`;
    $('enemy-hp').textContent=s.enemyHP+' / '+s.enemyMaxHP;$('player-hp').textContent=s.playerHP+' / '+s.playerMaxHP;
    $('enemy-health').style.width=100*s.enemyHP/s.enemyMaxHP+'%';$('player-health').style.width=100*s.playerHP/s.playerMaxHP+'%';
    const ordering={};for(const team of ['player','enemy'])s.units.filter(u=>u.team===team&&!u.hostId).sort((a,b)=>team==='player'?a.row-b.row||a.col-b.col:b.row-a.row||b.col-a.col).forEach((u,i)=>ordering[u.uid]=i+1);
    let tiles='';
    for(let row=0;row<6;row++)for(let col=0;col<6;col++) {
      const unit=s.units.find(u=>u.row===row&&u.col===col&&!u.hostId);
      const deployable=!busy&&s.phase==='planning'&&!s.pendingChoice&&selected!==null&&row>=(s.hand[selected]==='agent'?1:3)&&!unit;
      const label=unit?`${unit.team} ${game.definition(unit.cardId).name}, ${unit.hp} health, ${unit.attack} attack`:`Row ${row+1}, column ${col+1}${row===0?' enemy base':row===5?' your base':''}${deployable?', deploy here':''}`;
      tiles+=`<button class="tile ${row<3?'enemy-home':'player-home'} ${row===0?'base-enemy':row===5?'base-player':''} ${unit?'occupied '+unit.team:''} ${deployable?'deployable':''}" data-row="${row}" data-col="${col}" aria-label="${escape(label)}">${unit?`<span class="order">${ordering[unit.uid]}</span><span class="conditions">${unit.burn?'♨':''}${unit.poison?'●':''}${unit.freeze?'❄':''}${unit.stealth?'◌':''}</span>${portrait(unit.cardId,"unit")}<span class="unit-damage" aria-label="${unit.attack} damage">⚔ ${unit.attack}</span><span class="unit-health" aria-label="${unit.hp} health">♥ ${unit.hp}</span>`:`<span class="tile-id">${row===0?'BASE ↓':row===5?'BASE ↑':String.fromCharCode(65+col)+(row+1)}</span>`}</button>`;
    }
    $('board').innerHTML=tiles;
    const phases={'planning':'Your turn','player-action':'Your army acts','enemy-action':'Enemy turn','battle-lost':'Battle lost','camp':'Victory','won':'Expedition complete','lost':'No lives left'};
    $('phase').textContent=phases[s.phase];$('turn-note').textContent='Battle '+(s.encounter+1)+' · Turn '+s.turn+(busy?' · resolving':'');
    $('end-turn').disabled=busy||s.phase!=='planning'||Boolean(s.pendingChoice);
    $('hand-count').textContent='('+s.hand.length+')';$('deck-count').textContent='Deployment is free · '+s.deck.length+' cards owned';
    $('hand').innerHTML=s.hand.length?s.hand.map((id,i)=>cardMarkup(id,i,selected===i?'selected':'')).join(''):'<div class="empty-hand">Buy cards from the shop to fill your hand.</div>';
    $('hand').querySelectorAll('button').forEach(b=>b.disabled=busy||s.phase!=='planning');
    $('shop').innerHTML=(s.shop||[]).map((id,index)=>id?cardMarkup(id,null,'shop-card').replace(`data-choice="${escape(id)}"`,`data-shop="${index}"`):'<div class="sold-card">Sold</div>').join('');
    $('shop').querySelectorAll('[data-shop]').forEach(button=>{const id=s.shop[Number(button.dataset.shop)];button.disabled=busy||s.phase!=='planning'||Boolean(s.pendingChoice)||s.hand.length>=10||s.gold<game.profile(id).price;});
    $('reroll-shop').disabled=busy||s.phase!=='planning'||Boolean(s.pendingChoice)||s.gold<10;
    $('shop-note').textContent='Refreshes each round';
    const mapmaker=s.units.some(u=>u.team==='player'&&u.cardId==='mapmaker'&&!u.silence);
    $('forecast').textContent=mapmaker&&s.nextEnemyCard?'Mapmaker reveals the next reinforcement: '+game.definition(s.nextEnemyCard).name+'.':'Buy a card to add it to your hand. Deployment is free.';
    $('journal').innerHTML=s.log.slice(0,14).map(line=>`<li>${escape(line)}</li>`).join('');
    if(inspected){const u=s.units.find(u=>u.uid===inspected.uid);inspect(inspected.id,u);}else inspect(selected!==null?s.hand[selected]:null);
  }
  function notify(text) {game.log(text);render();}
  function dialog(html) {$('overlay-content').innerHTML=html;if(!$('overlay').open)$('overlay').showModal();}
  function showPhase() {
    const s=game.state;
    if(s.pendingChoice)dialog(`<p class="eyebrow">LOREKEEPER</p><h2>Teach your row</h2><p>Choose a keyword for all current allies in the Lorekeeper's row.</p><div class="dialog-actions">${['armor','ranged','rush','ignite','retaliate','venom'].map(keyword=>`<button data-teach="${keyword}">${keyword}</button>`).join('')}</div>`);
    else if(s.phase==='battle-lost')dialog(`<p class="eyebrow">BATTLE LOST</p><h2>${s.lives} ${s.lives===1?'life':'lives'} remaining</h2><p>Your base fell. Retry this battle with full base health, an empty hand, and a fresh shop. No cards carry over.</p><button class="primary" data-action="continue">Retry battle →</button>`);
    else if(s.phase==='camp')showCamp();
    else if(['won','lost'].includes(s.phase))dialog(`<p class="eyebrow">${s.phase==='won'?'EXPEDITION COMPLETE':'EXPEDITION ENDED'}</p><h2>${s.phase==='won'?'You held the line.':'All three lives are gone.'}</h2><p>${s.phase==='won'?'All five strongholds defeated with '+s.lives+' lives remaining.':'Reached battle '+(s.encounter+1)+' of 5.'}</p><div class="dialog-actions"><button class="primary" data-action="restart">Start a new run</button><button class="secondary" data-action="close">Inspect battlefield</button></div>`);
  }
  function showCamp() {
    const s=game.state;
    dialog(`<p class="eyebrow">BATTLE WON</p><h2>Prepare for the next battle</h2><p>${s.lives} / 3 lives · ${s.gold} gold</p><p>Your next battle starts at full base health with an empty hand. All cards reset; gold and artifacts remain.</p><div class="dialog-actions"><button data-buy="war-banner" ${s.gold<80||s.artifacts.includes('war-banner')?'disabled':''}>War banner +15% damage · 80 gold${s.artifacts.includes('war-banner')?' · owned':''}</button></div><button class="primary" data-action="continue">Next battle →</button>`);
  }
  function revealMobileDetails() {if(matchMedia('(max-width:720px)').matches&&!$('overlay').open)dialog(`<h2>Card details</h2>${$('inspector').innerHTML}<button data-action="close">${selected!==null?'Back to board · place card':'Back to battle'}</button>`);}
  $('hand').addEventListener('click',event=>{const button=event.target.closest('[data-card]');if(!button||busy||Date.now()<suppressClickUntil)return;const i=Number(button.dataset.card);selected=selected===i?null:i;inspected=null;render();if(selected!==null)revealMobileDetails();});
  $('board').addEventListener('click',event=>{
    const tile=event.target.closest('[data-row]');if(!tile||busy)return;const row=Number(tile.dataset.row),col=Number(tile.dataset.col),unit=game.unitAt(row,col);
    if(unit){inspected={id:unit.cardId,uid:unit.uid};render();revealMobileDetails();return;}
    if(selected!==null){if(game.deploy(selected,row,col)){selected=null;inspected=null;save();render();showPhase();}else notify('Deploy on an empty friendly tile. Agents can deploy farther forward.');}
  });
  $('shop').addEventListener('click',event=>{const button=event.target.closest('[data-shop]');if(!button||busy)return;const id=game.state.shop[Number(button.dataset.shop)];if(game.buyCard(Number(button.dataset.shop))){selected=null;inspected={id};save();render();revealMobileDetails();}});
  $('reroll-shop').addEventListener('click',()=>{if(busy)return;if(game.rerollShop()){save();render();}});
  document.addEventListener('pointerover',event=>{
    const tile=event.target.closest('#board [data-row]');if(tile&&!busy&&!drag&&event.pointerType!=='touch'){const unit=uiState().units.find(u=>u.row===Number(tile.dataset.row)&&u.col===Number(tile.dataset.col)&&!u.hostId);if(unit)inspect(unit.cardId,unit);return;}
    if(busy||drag||event.pointerType==='touch')return;const shop=event.target.closest('[data-shop]'),ref=reference(event.target);const id=shop?game.state.shop[Number(shop.dataset.shop)]:ref?game.state[ref.zone][ref.index]:null;if(id)inspect(id);
  });
  const MERGE_HOLD_MS=900;
  function reference(element) {
    const hand=element?.closest('#hand [data-card]');return hand?{zone:'hand',index:Number(hand.dataset.card)}:null;
  }
  function cleanupDrag() {
    if(drag?.frame)cancelAnimationFrame(drag.frame);
    drag?.ring?.remove();drag?.ghost?.remove();
    document.querySelectorAll('.drag-source,.drop-valid,.drop-invalid,.drop-hover').forEach(el=>el.classList.remove('drag-source','drop-valid','drop-invalid','drop-hover'));
    if(drag&&document.body.hasPointerCapture(drag.pointerId))document.body.releasePointerCapture(drag.pointerId);
    drag=null;
  }
  function updateMergeTarget() {
    if(!drag?.active)return;
    const element=document.elementFromPoint(drag.x,drag.y)?.closest('#hand [data-card]'),ref=reference(element);
    const recipe=ref&&ref.index!==drag.source.index?game.recipesFor(game.state.hand[drag.source.index],game.state.hand[ref.index])[0]:null;
    const index=recipe?ref.index:null;
    if(index!==drag.targetIndex){drag.targetIndex=index;drag.holdStart=performance.now();document.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover'));if(recipe)element.classList.add('drop-hover');}
    drag.ring.hidden=!recipe;drag.ring.style.left=drag.x+14+'px';drag.ring.style.top=drag.y-52+'px';
    if(recipe)drag.ring.querySelector('small').textContent=game.definition(recipe.result).name;
  }
  function updateMergeHold() {
    if(!drag?.active)return;updateMergeTarget();
    const progress=drag.targetIndex==null?0:Math.min(1,(performance.now()-drag.holdStart)/MERGE_HOLD_MS);
    drag.ring.style.setProperty('--progress',progress);drag.ring.setAttribute('aria-valuenow',String(Math.round(progress*100)));drag.ring.classList.toggle('ready',progress===1);drag.ring.querySelector('span').textContent=progress===1?'✓':'+';
    drag.frame=requestAnimationFrame(updateMergeHold);
  }
  document.addEventListener('pointerdown',event=>{
    if(busy||game.state.phase!=='planning'||game.state.pendingChoice||event.button!==0||$('overlay').open||drag)return;
    const source=reference(event.target);if(!source||!game.state.hand[source.index])return;
    drag={source,pointerId:event.pointerId,x:event.clientX,y:event.clientY,element:event.target.closest('button'),active:false,targetIndex:null};
  });
  document.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(!drag.active&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
    event.preventDefault();
    if(!drag.active){
      document.body.setPointerCapture(event.pointerId);drag.active=true;
      const box=drag.element.getBoundingClientRect();drag.ghost=drag.element.cloneNode(true);drag.ghost.className='card drag-ghost';drag.ghost.style.width=box.width+'px';drag.ghost.style.height=box.height+'px';document.body.append(drag.ghost);drag.element.classList.add('drag-source');
      const id=game.state.hand[drag.source.index];
      document.querySelectorAll('#hand [data-card]').forEach(el=>{const ref=reference(el);if(ref.index!==drag.source.index)el.classList.add(game.recipesFor(id,game.state.hand[ref.index]).length?'drop-valid':'drop-invalid');});
      drag.ring=document.createElement('div');drag.ring.className='merge-progress';drag.ring.setAttribute('role','progressbar');drag.ring.setAttribute('aria-label','Hold to merge');drag.ring.setAttribute('aria-valuemin','0');drag.ring.setAttribute('aria-valuemax','100');drag.ring.innerHTML='<span>+</span><small></small>';document.body.append(drag.ring);
      drag.frame=requestAnimationFrame(updateMergeHold);
    }
    drag.x=event.clientX;drag.y=event.clientY;drag.ghost.style.left=event.clientX+14+'px';drag.ghost.style.top=event.clientY-35+'px';updateMergeTarget();
  },{passive:false});
  document.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    drag.x=event.clientX;drag.y=event.clientY;updateMergeTarget();
    const source=drag.source,active=drag.active,target=reference(document.elementFromPoint(event.clientX,event.clientY));
    const ready=active&&target&&target.index===drag.targetIndex&&performance.now()-drag.holdStart>=MERGE_HOLD_MS;
    cleanupDrag();if(!active)return;suppressClickUntil=Date.now()+400;selected=null;inspected=null;
    if(ready)game.mergeCards(source,target);
    save();render();
  });
  document.addEventListener('pointercancel',()=>{cleanupDrag();render();});
  window.addEventListener('blur',()=>{if(drag){suppressClickUntil=Date.now()+400;cleanupDrag();}});
  $('end-turn').addEventListener('click',async()=>{
    if(busy)return;cleanupDrag();busy=true;selected=null;inspected=null;
    const frames=game.endTurn();save();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {for(const frame of frames){visual=frame.state;render();await new Promise(resolve=>setTimeout(resolve,reduced?0:Math.max(50,Math.min(180,4500/frames.length))));}}
    finally {visual=null;busy=false;render();showPhase();}
  });
  $('new-run').addEventListener('click',()=>{if(busy)return;dialog('<h2>Start a new expedition?</h2><p>This replaces your current saved run.</p><div class="dialog-actions"><button class="primary" data-action="restart">Start new run</button><button data-action="close">Keep playing</button></div>');});
  $('journal-button').addEventListener('click',()=>{if(busy||$('overlay').open)return;dialog(`<h2>Battle log</h2><ol class="full-journal">${game.state.log.map(line=>`<li>${escape(line)}</li>`).join('')}</ol><button data-action="close">Back to battle</button>`);});
  $('details-button').addEventListener('click',()=>{if(busy||$('overlay').open)return;dialog(`<h2>Card details</h2>${$('inspector').innerHTML}<button data-action="close">Back to battle</button>`);});
  $('catalog-button').addEventListener('click',()=>dialog(`<p class="eyebrow">FULL ROSTER</p><h2>${game.playable().length} playable cards</h2><p>Every card is available for deployment, rewards, and recipe-based merging. Unfinished cards use provisional stats and implemented keywords while their abilities are being designed. Hover or focus a card to read its current behavior.</p><div id="choice-detail"></div><div class="catalog">${game.playable().map(c=>cardMarkup(c.id,null)).join('')}</div><button data-action="close">Back to battle</button>`));
  $('overlay-content').addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='close')$('overlay').close();
    if(action==='restart'){game.newRun();selected=null;inspected=null;$('overlay').close();save();render();}
    if(action==='continue'){game.continueRun();selected=null;inspected=null;$('overlay').close();save();render();}
    const buy=event.target.closest('[data-buy]')?.dataset.buy;if(buy){game.buyCamp(buy);save();render();showCamp();}
    const teach=event.target.closest('[data-teach]')?.dataset.teach;if(teach&&game.chooseLorekeeper(teach)){$('overlay').close();save();render();}
    const choice=event.target.closest('[data-choice]')?.dataset.choice;
    if(choice&&$('overlay-content').querySelector('h2')?.textContent==='Choose your combination'){game.merge(choice);selected=null;$('overlay').close();save();render();}
  });
  function showChoice(event) {const id=event.target.closest('[data-choice]')?.dataset.choice;const detail=$('choice-detail');if(id&&detail){const p=game.profile(id),card=game.definition(id);detail.innerHTML=`<strong>${escape(card.name)}</strong><p>${escape(p.description)}</p>${p.pendingKeywords.length?`<p class="small">Keywords pending implementation: ${escape(p.pendingKeywords.join(', '))}</p>`:''}${p.pendingAbility&&card.designNotes?`<p class="small">Planned ability: ${escape(card.designNotes)}</p>`:''}`;}}
  function showChoiceRecipes(event) {showChoice(event);const id=event.target.closest('[data-choice]')?.dataset.choice,detail=$('choice-detail');if(id&&detail)detail.insertAdjacentHTML('beforeend',mergeDetails(id));}
  $('overlay-content').addEventListener('mouseover',showChoiceRecipes);$('overlay-content').addEventListener('focusin',showChoiceRecipes);$('overlay-content').addEventListener('click',showChoiceRecipes);
  $('overlay').addEventListener('cancel',event=>{if(['battle-lost','camp'].includes(game.state.phase)||game.state.pendingChoice)event.preventDefault();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('overlay').open){if(drag?.active)suppressClickUntil=Date.now()+400;cleanupDrag();selected=null;inspected=null;render();}});
  render();if(saveAvailable)save();showPhase();
  // Small read-only-facing entry point for local development and smoke verification.
  window.cardbattler={game,render};
})();

