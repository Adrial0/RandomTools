// Resources, market, inventory, runecrafting, crafting UI, and upgrade UI.
function resourceSourceEntries(k){
  const out=[],seen=new Set();
  const add=(type,name,detail='')=>{
    if(!name)return;
    const sig=type+'|'+name+'|'+detail;
    if(seen.has(sig))return;
    seen.add(sig);out.push({type,name,detail});
  };

  // Gathering areas.
  (HARVEST_AREAS||[]).forEach(a=>{
    if((a.resources||[]).some(r=>r[0]===k)){
      add('Gathering',a.name,`${SKILL_NAMES[a.skill]||a.skill} Lv. ${a.req}`);
    }
  });

  // Every enemy owns its drop table. Show exact enemies and where they appear.
  Object.entries(ENEMIES_DATA||{}).forEach(([enemyName,enemy])=>{
    if(!(enemy.drops||[]).includes(k))return;
    const places=[];
    (AREAS||[]).forEach(a=>{if((a.enemyPool||[]).includes(enemyName))places.push(a.name)});
    (DUNGEON_AREAS||[]).forEach(a=>{if((a.enemyPool||[]).includes(enemyName)||a.boss===enemyName)places.push(a.name)});
    (RAID_AREAS||[]).forEach(a=>{if((a.enemyPool||[]).includes(enemyName)||a.boss===enemyName)places.push(a.name)});
    add(enemy.boss?'Boss':'Enemy',enemyName,places.length?places.join(', '):'Enemy drop');
  });

  // Market is a possible source only for basic market resources.
  if((MARKET_BASIC_RESOURCES||[]).includes(k))add('Market','Market','Can appear in rotating basic-resource offers');

  return out;
}
function resourceSourcesHtml(k){
  const sources=resourceSourceEntries(k);
  if(!sources.length)return `<div class="empty" style="padding:12px">No direct source is currently defined for this resource.</div>`;
  return `<div class="resourceSourceList">${sources.map(s=>`<div class="resourceSourceRow"><div><b>${s.name}</b><span>${s.type}${s.detail?' · '+s.detail:''}</span></div></div>`).join('')}</div>`;
}
function openResourceSell(k){
  const owned=s.materials[k]||0;if(owned<=0)return;
  const initial=Math.min(owned,10);
  showModal('Sell '+(RESOURCE_NAMES[k]||k),`<div class="card">
    <div class="name">Tier ${tierLabel(resourceTier(k))} · ${RESOURCE_NAMES[k]||k}</div>
    <div class="muted">You have ${owned}. Resources sell for 1 gold each.</div>
    <input id="resourceSellRange" type="range" min="1" max="${owned}" value="${initial}" oninput="$('resourceSellAmount').value=this.value;$('resourceSellTotal').textContent=this.value+'g'" style="width:100%;margin-top:14px">
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
      <input id="resourceSellAmount" type="number" min="1" max="${owned}" value="${initial}" oninput="let v=clamp(Math.floor(+this.value||1),1,${owned});this.value=v;$('resourceSellRange').value=v;$('resourceSellTotal').textContent=v+'g'" style="width:110px">
      <span class="chip">Value: <b id="resourceSellTotal">${initial}g</b></span>
    </div>
    <div class="modalActionRow"><button class="btn gold" onclick="sellResource('${k}')">Sell Resources</button></div>
  </div>
  <div class="detailSection" style="margin-top:12px"><h3>Where to get it</h3>${resourceSourcesHtml(k)}</div>`);
}
function sellResource(k){
  const owned=s.materials[k]||0;
  const amount=clamp(Math.floor(+($('resourceSellAmount')?.value||0)),1,owned);
  if(!owned||amount<=0||amount>owned)return;
  s.materials[k]-=amount;
  s.gold+=amount;
  save();closeModal();render();
  notify('Sold '+amount+' '+(RESOURCE_NAMES[k]||k)+' for '+amount+' gold.','good');
}

function matHtml(){
  const e=Object.entries(s.materials||{}).filter(([k,v])=>v>0);
  const head=`<div class="mat"><b>Storage ${resourceCount()} / ${resourceCapacity()}</b></div>`;
  return head+(e.length?e.sort((a,b)=>resourceTier(a[0])-resourceTier(b[0])||(RESOURCE_NAMES[a[0]]||a[0]).localeCompare(RESOURCE_NAMES[b[0]]||b[0])).map(([k,v])=>`<button class="mat" style="cursor:pointer" onclick="openResourceSell('${k}')">${gameIcon('resource',k,'','gameAsset')} <span class="resourceTier">T${tierLabel(resourceTier(k))}</span> ${RESOURCE_NAMES[k]||k} <b>${v}</b></button>`).join(''):'<div class="muted">No resources yet.</div>');
}

function detachItem(it){
  if(!it?.equipped)return;
  const owner=s.members.find(x=>x.id===it.equipped);
  if(owner){
    const slot=itemEquipSlot(it);
    if(owner.equip?.[slot]===it.id)owner.equip[slot]=null;
  }
  it.equipped=null;
}
function rarityAtOrBelow(itemRarity,threshold){return rar.indexOf(itemRarity||'Common')<=rar.indexOf(threshold||'Common')}
function scrapItemCore(it){const r=recipeForItem(it);if(!r)return null;const recovered={};Object.entries(r[3]||{}).forEach(([k,v])=>{let amount=Math.floor(v*.25);if(amount<1&&v>=3)amount=1;if(amount>0){const added=addStoredResource(k,amount);if(added)recovered[k]=added}});return Object.keys(recovered).length?recovered:null}
function receiveInventoryItem(it,source='loot'){if(!it)return false;s.inventoryAuto=Object.assign({mode:'off',rarity:'Common'},s.inventoryAuto||{});const rule=s.inventoryAuto;if(rule.mode!=='off'&&rarityAtOrBelow(it.rarity,rule.rarity)){if(rule.mode==='sell'){const value=itemSellValue(it);s.gold+=value;log(`Auto-sold ${it.name} [${it.rarity}] for ${value} gold.`);return false}if(rule.mode==='scrap'){const recovered=scrapItemCore(it);if(recovered){log(`Auto-scrapped ${it.name} [${it.rarity}].`);return false}}}s.inventory.push(it);return true}
function bulkSellSelected(){const items=s.inventory.filter(it=>selectedInventoryItems.has(it.id));if(!items.length)return notify('No items selected.');let gold=0;items.forEach(it=>{gold+=itemSellValue(it);detachItem(it)});const ids=new Set(items.map(it=>it.id));s.inventory=s.inventory.filter(it=>!ids.has(it.id));s.gold+=gold;selectedInventoryItems.clear();save();render();notify(`Sold ${items.length} selected item${items.length===1?'':'s'} for ${gold} gold.`,'good')}
function bulkScrapSelected(){const items=s.inventory.filter(it=>selectedInventoryItems.has(it.id));if(!items.length)return notify('No items selected.');let scrapped=0,skipped=0;const removeIds=new Set();items.forEach(it=>{const recovered=scrapItemCore(it);if(recovered){detachItem(it);removeIds.add(it.id);scrapped++}else skipped++});s.inventory=s.inventory.filter(it=>!removeIds.has(it.id));removeIds.forEach(id=>selectedInventoryItems.delete(id));save();render();notify(`Scrapped ${scrapped} item${scrapped===1?'':'s'}${skipped?` · ${skipped} could not be scrapped`:''}.`,'good')}
function itemSellValue(it){
  const rarityMult={Common:1,Uncommon:1.35,Rare:2,Epic:3.3,Legendary:5.5,Mythic:9}[it.rarity]||1;
  return Math.max(1,Math.round(((it.power||10)*.45+5)*rarityMult));
}
function recipeForItem(it){
  if(Number.isInteger(it.recipeIndex)&&recipes[it.recipeIndex])return recipes[it.recipeIndex];
  return recipes.find(r=>r[0]===it.name)||null;
}
function sellItem(iid){
  const it=s.inventory.find(x=>x.id===iid);if(!it)return;
  const value=itemSellValue(it);
  detachItem(it);
  s.inventory=s.inventory.filter(x=>x.id!==iid);
  s.gold+=value;
  save();closeModal();render();
  notify('Sold '+it.name+' for '+value+' gold.','good');
}
function scrapItem(iid){
  const it=s.inventory.find(x=>x.id===iid);if(!it)return;
  const recovered=scrapItemCore(it);
  if(!recovered)return notify('This item cannot be scrapped right now (no recipe or no storage space).');
  detachItem(it);s.inventory=s.inventory.filter(x=>x.id!==iid);save();closeModal();render();
  const text=Object.entries(recovered).map(([k,v])=>`${v} ${RESOURCE_NAMES[k]||k}`).join(', ');notify('Scrapped '+it.name+': '+text+'.','good');
}

const MARKET_BASIC_RESOURCES=[];
function marketRarity(){
  const r=Math.random();
  if(r<.08)return'Rare';
  if(r<.32)return'Uncommon';
  return'Common';
}
function marketTier(){
  return clamp(1+Math.floor((s.level||1)/6),1,7);
}
function generateMarket(){
  const tier=marketTier();
  const minTier=Math.max(1,tier-1),maxTier=Math.min(7,tier+1);
  let gearPool=recipes.map((r,i)=>({r,i})).filter(x=>x.r[4]>=minTier&&x.r[4]<=maxTier);
  if(!gearPool.length)gearPool=recipes.map((r,i)=>({r,i}));

  const offers=[];
  const used=new Set();
  for(let n=0;n<4&&gearPool.length;n++){
    let options=gearPool.filter(x=>!used.has(x.i));
    if(!options.length)options=gearPool;
    const chosen=pick(options);used.add(chosen.i);
    const rarity=marketRarity();
    const [name,slot,specific,,rtier]=chosen.r;
    const it=makeSpecificItem(slot,specific,rtier,rarity);
    applyRecipeModifiers(it,chosen.r[5]||{});
    it.name=name;it.recipeIndex=chosen.i;
    const rarityPrice={Common:1,Uncommon:1.7,Rare:3.2}[rarity];
    const price=Math.max(80,Math.round((90+rtier*85+(it.power||0)*1.8)*rarityPrice));
    offers.push({id:id(),kind:'gear',item:it,price});
  }

  const resourceChoices=[...MARKET_BASIC_RESOURCES].sort(()=>Math.random()-.5).slice(0,4);
  resourceChoices.forEach(k=>{
    const qty=10;
    const price=Math.round(120+Math.max(1,tier)*35);
    offers.push({id:id(),kind:'resource',resource:k,qty,price});
  });

  s.market={nextRefresh:Date.now()+5*60*1000,offers};
  save();
}
function ensureMarket(){
  if(!s.market||!Array.isArray(s.market.offers)||!s.market.offers.length||Date.now()>=(s.market.nextRefresh||0))generateMarket();
}
function buyMarketOffer(oid){
  ensureMarket();
  const o=s.market.offers.find(x=>x.id===oid);if(!o)return;
  if(s.gold<o.price)return notify('Not enough gold.');
  if(o.kind==='resource'&&resourceSpace()<o.qty)return notify('Not enough resource storage space.');
  s.gold-=o.price;
  if(o.kind==='gear'){
    receiveInventoryItem(o.item,'market');
  }else{
    addStoredResource(o.resource,o.qty);
  }
  s.market.offers=s.market.offers.filter(x=>x.id!==oid);
  save();render();
  notify('Purchase complete.','good');
}
function renderMarket(){
  if(!$('marketItems'))return;
  ensureMarket();
  const remaining=Math.max(0,(s.market.nextRefresh||0)-Date.now());
  if($('marketTimer'))$('marketTimer').textContent='Refresh in '+fmt(remaining);
  $('marketItems').innerHTML=s.market.offers.length?s.market.offers.map(o=>{
    if(o.kind==='gear'){
      const it=o.item;
      return `<div class="card marketActionCard"><div class="itemVisual">${it.slot==='Weapon'?(weaponDefForItem(it)?.icon||'⚔️'):(itemIcons[it.slot]||'🎒')}</div><div class="name ${rarityClass(it.rarity)}">${it.name}</div><div class="muted">${itemEquipSlot(it)} · ${it.rarity}</div><div class="good">${statText(it)}</div><button class="btn gold actionButton" onclick="buyMarketOffer(${o.id})">Buy · ${o.price}g</button></div>`;
    }
    return `<div class="card marketActionCard"><div class="itemVisual">${gameIcon('ui','package','📦','gameAsset itemAsset')}</div><div class="name">${o.qty}× ${RESOURCE_NAMES[o.resource]||o.resource}</div><div class="muted">Basic resource bundle</div><button class="btn gold actionButton" onclick="buyMarketOffer(${o.id})">Buy · ${o.price}g</button></div>`;
  }).join(''):'<div class="empty">Market sold out. New stock arrives at the next refresh.</div>';
}

let inventoryShowEquipped=false;
let inventoryFilter='all';
let inventorySortKey='power';
let inventorySortDirection='desc';
let inventoryRarityFilter=new Set(rar);
let inventorySelectionMode=false;
let selectedInventoryItems=new Set();
function toggleInventoryMenu(id,e){e?.stopPropagation();document.querySelectorAll('.inventoryDropMenu').forEach(m=>{if(m.id!==id)m.classList.remove('on')});$(id)?.classList.toggle('on')}
function closeInventoryMenus(){document.querySelectorAll('.inventoryDropMenu').forEach(m=>m.classList.remove('on'))}
document.addEventListener('click',e=>{if(!e.target.closest('.inventoryDropWrap'))closeInventoryMenus()});
function toggleInventoryRarity(rarity,btn){if(inventoryRarityFilter.has(rarity))inventoryRarityFilter.delete(rarity);else inventoryRarityFilter.add(rarity);if(btn)btn.classList.toggle('on',inventoryRarityFilter.has(rarity));updateInventoryControlUI();renderInv()}
function setInventoryAutoMode(mode){s.inventoryAuto=Object.assign({mode:'off',rarity:'Common'},s.inventoryAuto||{});s.inventoryAuto.mode=['off','sell','scrap'].includes(mode)?mode:'off';save();updateInventoryControlUI()}
function setInventoryAutoRarity(rarity){s.inventoryAuto=Object.assign({mode:'off',rarity:'Common'},s.inventoryAuto||{});if(rar.includes(rarity))s.inventoryAuto.rarity=rarity;save();updateInventoryControlUI()}
function updateInventoryControlUI(){const rb=$('rarityFilterButton');if(rb)rb.textContent=`Rarity ${inventoryRarityFilter.size}/${rar.length} ▾`;document.querySelectorAll('[data-inv-rarity]').forEach(b=>b.classList.toggle('on',inventoryRarityFilter.has(b.dataset.invRarity)));s.inventoryAuto=Object.assign({mode:'off',rarity:'Common'},s.inventoryAuto||{});if($('inventoryAutoMode'))$('inventoryAutoMode').value=s.inventoryAuto.mode;if($('inventoryAutoRarity'))$('inventoryAutoRarity').value=s.inventoryAuto.rarity;if($('inventoryAutoButton')){const label=s.inventoryAuto.mode==='sell'?'Auto-sell':s.inventoryAuto.mode==='scrap'?'Auto-scrap':'Auto: Off';$('inventoryAutoButton').textContent=s.inventoryAuto.mode==='off'?label+' ▾':`${label} ≤ ${s.inventoryAuto.rarity} ▾`}if($('inventorySelectToggle'))$('inventorySelectToggle').textContent=inventorySelectionMode?'Done Selecting':'Select Items';if($('inventoryBulkBar'))$('inventoryBulkBar').style.display=inventorySelectionMode?'flex':'none';if($('inventorySelectedCount'))$('inventorySelectedCount').textContent=selectedInventoryItems.size+' selected'}
function toggleInventorySelectionMode(){inventorySelectionMode=!inventorySelectionMode;if(!inventorySelectionMode)selectedInventoryItems.clear();updateInventoryControlUI();renderInv()}
function toggleInventoryItemSelection(id){if(selectedInventoryItems.has(id))selectedInventoryItems.delete(id);else selectedInventoryItems.add(id);updateInventoryControlUI();renderInv()}
function clearInventorySelection(){selectedInventoryItems.clear();updateInventoryControlUI();renderInv()}
function setInventoryFilter(filter,btn){
  inventoryFilter=filter;
  document.querySelectorAll('.inventoryFilter').forEach(x=>x.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderInv();
}
function setInventorySort(key){inventorySortKey=key||'power';renderInv()}
function toggleInventorySortDirection(){
  inventorySortDirection=inventorySortDirection==='desc'?'asc':'desc';
  renderInv();
}
function inventoryMatchesFilter(it){
  if(!inventoryRarityFilter.has(it.rarity||'Common'))return false;
  if(inventoryFilter==='all')return true;
  if(inventoryFilter==='Jewelry')return itemEquipSlot(it)==='Jewelry';
  return it.slot===inventoryFilter;
}
function inventorySortValue(it,key){
  const z=itemCompareValues(it);
  return Number(z[key])||0;
}
function sortedInventoryItems(){
  return s.inventory
    .filter(it=>(inventoryShowEquipped||!it.equipped)&&inventoryMatchesFilter(it))
    .sort((a,b)=>{
      const av=inventorySortValue(a,inventorySortKey),bv=inventorySortValue(b,inventorySortKey);
      const cmp=av-bv||String(a.name||'').localeCompare(String(b.name||''));
      return inventorySortDirection==='asc'?cmp:-cmp;
    });
}
function toggleEquippedItems(){
  inventoryShowEquipped=!inventoryShowEquipped;
  if($('equippedToggle'))$('equippedToggle').textContent=inventoryShowEquipped?'Hide Equipped':'Show Equipped';
  renderInv();
}
function openInventoryEquip(iid){
  const it=s.inventory.find(x=>x.id===iid);if(!it)return;
  const owner=it.equipped?s.members.find(x=>x.id===it.equipped):null;
  const slot=itemEquipSlot(it);
  const candidates=s.members.filter(h=>(slot!=='Weapon'||allowedWeapons(h).includes(it.weaponType))&&(slot!=='Armor'||canEquipArmor(h,it)));
  const recipe=recipeForItem(it);

  showModal(it.name,`<div class="card">
    <div class="itemVisual">${it.slot==='Weapon'?(weaponDefForItem(it)?.icon||'⚔️'):(itemIcons[it.slot]||'🎒')}</div>
    <div class="name ${rarityClass(it.rarity)}">${it.name}</div>
    <div class="muted">${slot==='Jewelry'?'Jewelry':it.slot}${it.slot==='Weapon'?` · ${it.weaponType}`:''} · ${it.rarity}</div><div class="good" style="margin-top:7px">${statText(it)}</div>
    ${runeSlotsHtml(it)}
    ${runeSlots(it)>0?`<div class="detailSection" style="margin-top:10px"><h3>Runes</h3>${runeDetailsHtml(it)}</div>`:''}
    ${owner?`<div class="chip" style="margin-top:8px">Currently equipped by ${owner.name}</div>`:''}
    <div class="modalActionRow">
      <button class="btn" onclick="scrapItem(${it.id})" ${recipe?'':'disabled'}>Scrap${(it.runes||[]).length?' · destroys runes':''}</button>
      <button class="btn gold" onclick="sellItem(${it.id})">Sell · ${itemSellValue(it)}g</button>
    </div>
  </div>
  <h3 style="margin-top:14px">Equip on</h3>
  <div class="g2">${candidates.map(h=>{
    const current=s.inventory.find(x=>x.id===h.equip[slot]);
    return `<div class="card equipActionCard">
      <div class="heroTop"><div class="portrait">${classIcon(h,'gameAsset portraitAsset')}</div><div><div class="name">${h.name}</div><div class="muted">${displayClass(h)}</div></div></div>
      <div class="muted" style="margin:7px 0">Current ${slot}: <b>${current?current.name:'Empty'}</b></div>
      ${equipComparison(it,current)}
      <button class="btn ${it.equipped===h.id?'':'gold'} actionButton" ${it.equipped===h.id?'disabled':''} onclick="equip(${h.id},${it.id})">${it.equipped===h.id?'Already Equipped':'Equip Here'}</button>
    </div>`;
  }).join('')}</div>`);
}
function renderInv(){
  $('matBar').innerHTML=matHtml();$('craftMats').innerHTML=matHtml();
  const existingIds=new Set(s.inventory.map(it=>it.id));[...selectedInventoryItems].forEach(id=>{if(!existingIds.has(id))selectedInventoryItems.delete(id)});
  const visible=sortedInventoryItems();
  $('items').innerHTML=visible.length?visible.map(it=>{const owner=it.equipped?s.members.find(h=>h.id===it.equipped):null;const selected=selectedInventoryItems.has(it.id);const click=inventorySelectionMode?`toggleInventoryItemSelection(${it.id})`:`openInventoryEquip(${it.id})`;return `<div class="card inventoryItemCard ${selected?'selectedItem':''}" style="cursor:pointer" onclick="${click}">${inventorySelectionMode?`<span class="inventorySelectMark">${selected?'✓':''}</span>`:''}<div class="itemVisual">${it.slot==='Weapon'?(weaponDefForItem(it)?.icon||itemIcons[it.slot]||'🎒'):(itemIcons[it.slot]||'🎒')}</div>${runeSlotsHtml(it,true)}<div class="name ${rarityClass(it.rarity)}">${it.name}</div><div class="muted">Tier ${tierLabel(itemTier(it))} · ${it.rarity}${it.slot==='Weapon'?` · ${it.weaponType}`:''}${owner?' · '+owner.name:''}</div><div class="good">${statText(it)}</div></div>`}).join(''):'<div class="empty">No items match the current inventory filter.</div>';
  const sel=$('inventorySortSelect'),dir=$('inventorySortDir');if(sel)sel.value=inventorySortKey;if(dir)dir.textContent=inventorySortDirection==='desc'?'Highest first':'Lowest first';updateInventoryControlUI();
}

let workshopMode='crafting';
function setWorkshopMode(mode,btn){
  workshopMode=mode;
  document.querySelectorAll('.workshopMode').forEach(x=>x.classList.remove('on'));
  if(btn)btn.classList.add('on');
  if($('craftingModeSection'))$('craftingModeSection').style.display=mode==='crafting'?'':'none';
  if($('runecraftingModeSection'))$('runecraftingModeSection').style.display=mode==='runecrafting'?'':'none';
  if(mode==='runecrafting')renderRunecrafting();
}
function craftRune(id){
  const r=RUNES[id];if(!r)return;
  if(!Object.entries(r.cost).every(([k,v])=>(s.materials[k]||0)>=v))return notify('Not enough magical resources.');
  Object.entries(r.cost).forEach(([k,v])=>s.materials[k]-=v);
  s.runes[id]=(s.runes[id]||0)+1;
  log('Created '+r.name+'.');
  save();renderRunecrafting();renderInv();renderCraft();
  notify(r.name+' created.','good');
}
function openRuneSocketItem(iid){
  const it=s.inventory.find(x=>x.id===iid);if(!it)return;
  if(it.equipped)return notify('Unequip the item before socketing a rune.');
  const cap=runeSlots(it),used=(it.runes||[]).length;
  if(cap<=0)return notify('Common items have no rune slots.');
  const available=Object.keys(RUNES).filter(id=>(s.runes[id]||0)>0);
  showModal('Socket Rune · '+it.name,`<div class="card">
    <div class="itemVisual">${it.slot==='Weapon'?(weaponDefForItem(it)?.icon||itemIcons[it.slot]):(itemIcons[it.slot]||'◇')}</div>
    <div class="name ${rarityClass(it.rarity)}">${it.name}</div>
    <div class="muted">${it.rarity} · Rune slots ${used}/${cap}</div>
    ${runeSlotsHtml(it)}
    <div style="margin-top:8px">${runeDetailsHtml(it)}</div>
  </div>
  <h3 style="margin-top:14px">Available Runes</h3>
  ${used>=cap?'<div class="empty">This item has no empty rune slots.</div>':available.length?`<div class="recipes">${available.map(id=>{const r=RUNES[id];return `<div class="card runeActionCard"><div class="itemVisual">${runeIcon(id,'gameAsset itemAsset')}</div><div class="name">${r.name}</div><div class="muted">${r.desc} · Owned ${s.runes[id]||0}</div><button class="btn gold actionButton" onclick="socketRune(${it.id},'${id}')">Socket Rune</button></div>`}).join('')}</div>`:'<div class="empty">You have no crafted runes.</div>'}`);
}
function socketRune(iid,rid){
  const it=s.inventory.find(x=>x.id===iid),r=RUNES[rid];if(!it||!r)return;
  it.runes=Array.isArray(it.runes)?it.runes:[];
  if(it.runes.length>=runeSlots(it))return notify('No empty rune slots.');
  if((s.runes[rid]||0)<=0)return notify('You do not own that rune.');
  s.runes[rid]--;
  it.runes.push(rid);
  save();closeModal();renderRunecrafting();renderInv();renderRoster();
  notify(r.name+' socketed into '+it.name+'.','good');
}
function renderRunecrafting(){
  if(!$('runeRecipes'))return;
  const owned=Object.entries(s.runes||{}).filter(([k,v])=>v>0);
  $('runeInventory').innerHTML=owned.length?owned.sort((a,b)=>runeTier(a[0])-runeTier(b[0])).map(([id,v])=>`<div class="mat">${runeIcon(id)} <span class="resourceTier">T${tierLabel(runeTier(id))}</span> ${RUNES[id]?.name||id} <b>${v}</b></div>`).join(''):'<div class="muted">No runes crafted yet.</div>';
  const runeGroups=new Map();Object.entries(RUNES).forEach(entry=>{const t=runeTier(entry[0]);if(!runeGroups.has(t))runeGroups.set(t,[]);runeGroups.get(t).push(entry)});
  $('runeRecipes').innerHTML=[...runeGroups.entries()].sort((a,b)=>a[0]-b[0]).map(([tier,entries])=>`<div class="runeTierGroup"><div class="runeTierHeading"><span>Tier ${tierLabel(tier)}</span><small>${TIER_IDENTITIES[tier]||'Masterwork'} runes · ${entries.length}</small></div><div class="recipes">${entries.map(([id,r])=>{const ok=Object.entries(r.cost).every(([k,v])=>(s.materials[k]||0)>=v);return `<div class="card runeActionCard"><div class="itemVisual">${runeIcon(id,'gameAsset itemAsset')}</div><div class="name">${r.name}</div><div class="muted">Tier ${tierLabel(tier)} · ${r.desc}</div><div class="chips" style="margin-top:9px">${Object.entries(r.cost).map(([k,v])=>`<span class="chip">T${tierLabel(resourceTier(k))} · ${gameIcon('resource',k,'')} ${RESOURCE_NAMES[k]||k} ${v}</span>`).join('')}</div><button class="btn ${ok?'gold':''} actionButton" ${ok?'':'disabled'} onclick="craftRune('${id}')">Create Rune</button></div>`}).join('')}</div></div>`).join('');
  const gear=s.inventory.filter(it=>!it.equipped);
  $('runeSocketItems').innerHTML=gear.length?gear.map(it=>{const cap=runeSlots(it),used=(it.runes||[]).length;return `<div class="card" style="cursor:${cap?'pointer':'default'}" ${cap?`onclick="openRuneSocketItem(${it.id})"`:''}><div class="itemVisual">${it.slot==='Weapon'?(weaponDefForItem(it)?.icon||itemIcons[it.slot]):(itemIcons[it.slot]||'◇')}</div><div class="name ${rarityClass(it.rarity)}">${it.name}</div><div class="muted">Tier ${tierLabel(itemTier(it))} · ${it.rarity} · Rune slots ${used}/${cap}</div>${cap?`<div class="chips" style="margin-top:8px">${used?it.runes.map(id=>`<span class="chip">T${tierLabel(runeTier(id))} · ${runeIcon(id)} ${RUNES[id]?.name||id}</span>`).join(''):'<span class="chip">Empty rune slots available</span>'}</div>`:'<div class="muted" style="margin-top:8px">Common items have no rune slots.</div>'}</div>`}).join(''):'<div class="empty">No unequipped gear is available for rune socketing.</div>';
}

function renderCraftQueue(){normalizeCraftQueue();$('craftQueue').innerHTML=s.craftJobs.length?s.craftJobs.map((j,index)=>{const r=recipes[j.recipe],now=Date.now(),waiting=index>0&&now<j.start,total=Math.max(1,j.end-j.start),pct=waiting?0:clamp((now-j.start)/total*100,0,100),remainingTime=waiting?j.start-now:j.end-now,count=Math.max(1,j.remaining||j.qty||1);return `<div class="card"><div class="mission-row"><div><div class="name">${r?r[0]:'Unknown recipe'} ×${count}</div><div class="muted">${index===0?'Crafting now':'Queue group '+(index+1)} · ${waiting?'waiting':'crafting'} · current item</div></div><span class="chip">${index===0?'Active':'#'+(index+1)}</span></div><div class="progressWrap"><div class="progressMeta"><span>${waiting?'Waiting':Math.floor(pct)+'%'}</span><span class="timer" data-start="${j.start}" data-end="${waiting?j.start:j.end}">${fmt(remainingTime)}</span></div><div class="progressTrack"><div class="progressFill" ${waiting?'':`data-start="${j.start}" data-end="${j.end}"`} style="width:${pct}%"></div></div></div><button class="btn" style="margin-top:9px" onclick="cancelCraftJob(${j.id})">Cancel Group</button></div>`}).join(''):'<div class="empty">Nothing is being crafted.</div>'}
let recipeFilter='all';
function recipePreview(r){
  const [displayName,slot,specificName,cost,tier,meta={}]=r;
  const parts=[];

  if(slot==='Weapon'){
    const w=WEAPONS[specificName];
    if(w){
      parts.push(`Attack ${w.base+tier*2}`);
      parts.push(`Attack Speed ${weaponAttackTime(specificName).toFixed(2)}s`);
      parts.push(`${weaponScalingLabel(w)} scaling`);
      parts.push(`${elementIcon[w.type]||''} ${w.type} damage`);
      const statBudget=Math.max(1,Math.round(2+tier*.7));
      if(w.scale2){
        parts.push(`+${Math.ceil(statBudget/2)} ${statName(w.scale)}`);
        parts.push(`+${Math.floor(statBudget/2)} ${statName(w.scale2)}`);
      }else parts.push(`+${statBudget} ${statName(w.scale)}`);
      weaponSpecials(w).forEach(([k,v])=>parts.push(`+${Math.round(v*100)}% ${WEAPON_SPECIAL_LABELS[k]}`));
    }
  }else if(slot==='Armor'){
    const p=armorProfile(specificName);
    parts.push(`${p.armorClass} armor`);
    parts.push(`+${p.base+tier*2} ${statName(p.stat)}`);
    const totalBlock=(p.block||0)+(meta.block||0);
    if(totalBlock)parts.push(`+${totalBlock} Block`);
    if(specificName.includes('Frostguard'))parts.push(`+${12+tier*2} Ice Res`);
    if(specificName.includes('Flameward'))parts.push(`+${12+tier*2} Fire Res`);
  }else if(slot==='Ring'){
    let stat=specificName.includes('Guardian')?'def':specificName.includes('Crystal')?'int':specificName.includes('Runed')?'mdef':'str';
    parts.push(`+${Math.round(3+tier*1.6)} ${statName(stat)}`);
  }else if(slot==='Amulet'){
    let stat=specificName.includes('Warden')?'mdef':specificName.includes('Arcane')?'int':specificName.includes('Crystal')?'mdef':'hp';
    const value=stat==='hp'?Math.round(12+tier*4):Math.round(3+tier*1.8);
    parts.push(`+${value} ${statName(stat)}`);
  }

  Object.entries(meta.stats||{}).forEach(([k,v])=>parts.push(`+${v}${['fire','ice','poison','lightning','holy','dark','lifesteal'].includes(k)?'%':''} ${statName(k)}`));
  if(meta.damageBonus)parts.push(`+${Math.round(meta.damageBonus*100)}% damage`);
  if(meta.healBonus)parts.push(`+${Math.round(meta.healBonus*100)}% healing`);
  if(meta.critBonus)parts.push(`+${Math.round(meta.critBonus*100)}% crit`);
  if(meta.threatBonus)parts.push(`+${meta.threatBonus} Threat`);
  if(meta.physicalDodgeBonus)parts.push(`+${Math.round(meta.physicalDodgeBonus*100)}% physical dodge`);
  if(meta.magicalDodgeBonus)parts.push(`+${Math.round(meta.magicalDodgeBonus*100)}% magic dodge`);
  if(meta.label)parts.push(meta.label);
  return parts;
}

let recipeCraftableOnly=false;
function toggleRecipeMenu(e){
  e?.stopPropagation();
  $('recipeMenu')?.classList.toggle('on');
}
function closeRecipeMenu(){
  $('recipeMenu')?.classList.remove('on');
}
function setRecipeFilter(f,b){
  recipeFilter=f;
  document.querySelectorAll('[data-recipe-filter]').forEach(x=>x.classList.toggle('on',x.dataset.recipeFilter===f));
  const labels={all:'All',Weapon:'Weapons',Armor:'Armor',Jewelry:'Jewelry'};
  const btn=$('recipeMenuButton');if(btn)btn.textContent=(labels[f]||'Filter')+' ▾';
  renderCraft();
}
function toggleCraftableRecipes(btn){
  recipeCraftableOnly=!recipeCraftableOnly;
  if(btn){
    btn.classList.toggle('on',recipeCraftableOnly);
    btn.textContent='Craftable only: '+(recipeCraftableOnly?'On':'Off');
  }
  renderCraft();
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.recipeMenuWrap'))closeRecipeMenu();
});
let expandedRecipes=new Set();
const TIER_IDENTITIES={1:'Copper',2:'Iron',3:'Silver',4:'Mithril',5:'Star Metal',6:'Cinder',7:'Voidstone'};
function recipeTierCategory(r){const tier=Math.max(1,Number(r?.[4])||1);return `Tier ${tierLabel(tier)} · ${TIER_IDENTITIES[tier]||'Masterwork'}`}
let expandedRecipeCategories=new Set(['Tier I · Copper']);
function toggleRecipeRow(i){
  if(expandedRecipes.has(i))expandedRecipes.delete(i);else expandedRecipes.add(i);
  renderCraft();
}
function toggleRecipeCategory(name){
  if(expandedRecipeCategories.has(name))expandedRecipeCategories.delete(name);else expandedRecipeCategories.add(name);
  renderCraft();
}
function recipeTypeLabel(r){
  if(r[1]==='Armor')return `${armorProfile(r[2]).armorClass} Armor`;
  if(r[1]==='Weapon')return weaponTypeFor(r[2]);
  return r[1];
}

const RECIPE_CATEGORY_PRIORITY=[
  ['Boss Materials',k=>BOSS_RESOURCES.has(k)],
  ['Voidstone',k=>k==='Voidstone'],
  ['Aether Crystal',k=>k==='AetherCrystal'],
  ['Cinder Ore',k=>k==='CinderOre'||k==='MagmaCore'],
  ['Storm Glass',k=>k==='StormGlass'||k==='SkyCrystal'],
  ['Glacial Ore',k=>k==='GlacialOre'||k==='Frostbloom'],
  ['Mithril',k=>k==='Mithril'],
  ['Star Metal',k=>k==='StarMetal'],
  ['Ironwood',k=>k==='Ironwood'||k==='SpiritBark'],
  ['Nightshade',k=>k==='Nightshade'||k==='VenomSap'],
  ['Sunstone',k=>k==='Sunstone'||k==='Sandglass'],
  ['Deep Pearl',k=>k==='DeepPearl'],
  ['Obsidian',k=>k==='Obsidian'],
  ['Crystal',k=>k==='Crystal'||k==='ArcaneDust'||k==='Essence'],
  ['Iron',k=>k==='Iron'],
  ['Wood',k=>k==='Wood'||k==='Hardwood'],
  ['Leather & Cloth',k=>k==='Leather'||k==='Cloth'||k==='ShadowSilk'],
  ['Other',k=>true]
];
function recipeMaterialCategory(r){
  const keys=Object.keys(r[3]||{});
  for(const [name,test] of RECIPE_CATEGORY_PRIORITY){
    if(keys.some(test))return name;
  }
  return 'Other';
}
function renderRecipeLine(r,i){
  const mat=Object.entries(r[3]).every(([k,v])=>(s.materials[k]||0)>=v);
  const preview=recipePreview(r),open=expandedRecipes.has(i);
  const icon=r[1]==='Weapon'?(WEAPONS[r[2]]?.icon||'⚔️'):(itemIcons[r[1]]||'🔨');
  const time=Math.ceil(craftDuration(r)/1000);
  const smithReq=recipeSmithLevel(r),smithXp=recipeSmithXp(r),smithOk=(s.smithing?.level||1)>=smithReq;
  return `<div class="recipeLine ${mat?'':'unaffordable'} ${smithOk?'':'recipeLocked'}">
    <div class="recipeLineHeader" onclick="toggleRecipeRow(${i})">
      <div class="recipeLineIcon">${icon}</div>
      <div>
        <div class="recipeLineName">${r[0]}</div>
        <div class="recipeLineType">Tier ${tierLabel(r[4])} · ${recipeTypeLabel(r)}</div>
      </div>
      <div class="recipeLineStatus">${!smithOk?'Smithing '+smithReq:mat?time+'s':'Missing materials'}</div>
      <div class="recipeChevron">${open?'▾':'▸'}</div>
    </div>
    ${open?`<div class="recipeLineDetails">
      <div class="recipeDetailStats">
        <span class="chip recipeSmithReq ${smithOk?'enough':'missing'}">Blacksmithing ${smithReq}</span><span class="chip">+${smithXp} Smithing XP</span>
        ${preview.map(x=>`<span class="chip">${x}</span>`).join('')}
      </div>
      <div class="recipeDetailMaterials">
        ${Object.entries(r[3]).map(([k,v])=>{
          const have=s.materials[k]||0,ok=have>=v;
          return `<span class="chip ${ok?'enough':'missing'}">T${tierLabel(resourceTier(k))} · ${have}/${v} ${RESOURCE_NAMES[k]||k}${BOSS_RESOURCES.has(k)&&!s.discoveredResources.includes(k)?' · '+BOSS_RESOURCE_SOURCE[k]:''}</span>`;
        }).join('')}
      </div>
      <div class="recipeLineAction">
        ${mat&&smithOk?`<div class="recipeQuantityControl" onclick="event.stopPropagation()"><span>×</span><input type="number" id="craftQty-${i}" min="1" max="${maxCraftQuantity(r)}" value="1"><button class="btn gold" onclick="craft(${i},$('craftQty-${i}').value)">Craft · ${time}s each</button></div>`:`<button class="btn" disabled>${!smithOk?'Requires Smithing '+smithReq:'Missing materials'}</button>`}
      </div>
    </div>`:''}
  </div>`;
}
function renderCraft(){
  discoverRecipes();
  s.smithing=Object.assign({level:1,xp:0},s.smithing||{});
  const smithNeed=smithXpNeeded(s.smithing.level);
  if($('smithLevel'))$('smithLevel').textContent='Lv. '+s.smithing.level;
  if($('smithXpText'))$('smithXpText').textContent=s.smithing.xp.toLocaleString()+' / '+smithNeed.toLocaleString()+' XP';
  if($('smithXpFill'))$('smithXpFill').style.width=clamp(s.smithing.xp/smithNeed*100,0,100)+'%';
  if($('smithSpeedBonus'))$('smithSpeedBonus').textContent='+'+Math.round(smithingSpeedBonus()*100)+'% crafting speed';
  if($('smithRarityBonus'))$('smithRarityBonus').textContent='Higher rarity chance from Smithing Lv. '+s.smithing.level;
  const list=recipes.map((r,i)=>[r,i]).filter(([r])=>{
    const visible=recipeVisible(r);
    const typeOk=recipeFilter==='all'||(recipeFilter==='Jewelry'?(r[1]==='Ring'||r[1]==='Amulet'):r[1]===recipeFilter);
    const craftable=Object.entries(r[3]||{}).every(([k,v])=>(s.materials[k]||0)>=v)&&(s.smithing?.level||1)>=recipeSmithLevel(r);
    return visible&&typeOk&&(!recipeCraftableOnly||craftable);
  });
  if(!list.length){$('recipeList').innerHTML=`<div class="empty">${recipeCraftableOnly?'No currently craftable recipes match this filter.':'No recipes discovered here yet. Find new crafting resources to reveal recipes.'}</div>`;return}

  const groups=new Map();
  list.forEach(([r,i])=>{
    const cat=recipeTierCategory(r);
    if(!groups.has(cat))groups.set(cat,[]);
    groups.get(cat).push([r,i]);
  });

  const ordered=[...groups.keys()].sort((a,b)=>[...groups.get(a)][0][0][4]-[...groups.get(b)][0][0][4]);
  $('recipeList').innerHTML=ordered.map(name=>{
    const rows=groups.get(name),open=expandedRecipeCategories.has(name);
    return `<div class="recipeCategory ${open?'open':''}">
      <div class="recipeCategoryHeader" onclick="toggleRecipeCategory('${name.replace(/'/g,"\\'")}')">
        <span class="recipeCategoryArrow">${open?'▾':'▸'}</span>
        <span class="recipeCategoryName">${name}</span>
        <span class="recipeCategoryCount">${rows.length} recipe${rows.length===1?'':'s'}</span>
      </div>
      ${open?`<div class="recipeCategoryBody">${rows.map(([r,i])=>renderRecipeLine(r,i)).join('')}</div>`:''}
    </div>`;
  }).join('');
  colorizeStatTerms($('recipeList'));
}
function renderUp(){
  $('upgradeList').innerHTML=upgrades.map(u=>{
    const l=s.up[u[0]]||0,c=upgradeCost(u,l),rc=upgradeResourceCost(u[0],l);
    const can=s.gold>=c&&hasUpgradeResources(rc)&&l<u[4];
    return `<div class="card upgradeCard" data-upgrade-key="${u[0]}">
      <div class="upgradeHeader">
        <div class="name">${u[1]}</div>
        <span class="chip upgradeLevel">${l}/${u[4]}</span>
      </div>

      <div class="muted upgradeDesc">${u[2]}</div>

      ${l<u[4]?`
        <div class="upgradeCosts">
          <span class="chip upgradeGold ${s.gold>=c?'enough':'missing'}" data-upgrade-gold>${s.gold.toLocaleString()}/${c.toLocaleString()} Gold</span>
          <div class="upgradeResourceProgress" data-upgrade-resources>
            ${upgradeResourceProgressHtml(rc)}
          </div>
        </div>
      `:''}

      <button class="btn ${can?'gold':''} upgradeAction" ${l>=u[4]?'disabled':''} onclick="upgrade('${u[0]}')">${l>=u[4]?'Maxed':'Upgrade'}</button>
    </div>`;
  }).join('');
}

function refreshUpgradeResourceUI(){
  if(!$('upgradeList'))return;
  upgrades.forEach(u=>{
    const card=document.querySelector(`[data-upgrade-key="${u[0]}"]`);
    if(!card)return;

    const l=s.up[u[0]]||0;
    if(l>=u[4])return;

    const c=upgradeCost(u,l),rc=upgradeResourceCost(u[0],l);
    const gold=card.querySelector('[data-upgrade-gold]');
    const resources=card.querySelector('[data-upgrade-resources]');
    const btn=card.querySelector('.upgradeAction');

    if(gold){
      gold.textContent=`${s.gold.toLocaleString()}/${c.toLocaleString()} Gold`;
      gold.classList.toggle('enough',s.gold>=c);
      gold.classList.toggle('missing',s.gold<c);
    }
    if(resources)resources.innerHTML=upgradeResourceProgressHtml(rc);

    const can=s.gold>=c&&hasUpgradeResources(rc);
    if(btn){
      btn.classList.toggle('gold',can);
      btn.disabled=false;
    }
  });
}
