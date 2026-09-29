// Item definitions and class scaling shared by the game and simulation tests.
(() => {
const effects={
 guard:{name:'Guarding melody',mp:12,min:0,max:0,color:'#8cc9fa',description:'Next notes grant allies a 12 HP barrier for 2s.'},
 cleanse:{name:'Cleansing tune',mp:12,min:0,max:0,color:'#8bd9bd',description:'Next notes remove burn, poison, freeze and slow from allies.'},
 crescendo:{name:'Crescendo',mp:14,min:0,max:0,color:'#e7a46d',description:'Next notes have 50% stronger effects.'},
 restore:{name:'Restoring chord',mp:14,min:0,max:0,color:'#bce69c',description:'Next notes heal allies for 12 HP.'},
 fire:{name:'Flame burst',mp:10,min:1,max:3,count:10,time:1,color:'#ff763c',description:'10 embers over 1 second; nearby grounded enemies burn.'},
 lightning:{name:'Chain lightning',mp:10,min:1,max:7,count:3,time:0,color:'#fff36a',description:'Lightning jumps to up to 3 nearby enemies.'},
 ice:{name:'Frost burst',mp:12,min:3,max:5,count:1,time:2,color:'#79cfff',description:'Freezes nearby enemies.'},
 slow:{name:'Chill burst',mp:12,min:3,max:5,count:1,time:2,slow:.2,color:'#9db3e9',description:'Slow 20% for 2s.'},
 poison:{name:'Poison strike',mp:10,min:2,max:3,count:1,time:4,color:'#76ef66',description:'Poison for 4s. Bonus AT per tick, 30 ticks/s.'},
 heal:{name:'Healing bloom',mp:12,min:12,max:18,count:1,time:0,color:'#6fffb6',description:'Restores health to every living party member.'},
 drain:{name:'Life drain',mp:14,min:9,max:14,count:1,time:0,color:'#e783e3',description:'Deals bonus damage and returns that damage as health.'},
 stun:{name:'Shockwave',mp:10,min:5,max:9,count:1,time:1.2,color:'#ffdca0',description:'Stuns nearby enemies.'}
};
const families=['Sword','Daggers','Bow','Staff','Holy Symbol','Scythe','Lute','Grimoire'];
const base=[[1,5],[2,4],[4,8],[6,10],[2,5],[4,9],[2,4],[3,6]];
const ranges=[30,14,125,105,95,42,110,100];
const agi=[[20,30],[9,15],[28,36],[42,50],[80,90],[40,50],[55,65],[50,60]];
const items={};
for(let c=0;c<8;c++){
  const add=(suffix,name,min,max,tier,effect=null,range=ranges[c])=>{const id=`${c}-${suffix}`;items[id]={id,type:'weapon',name,classId:c,min,max,agi:agi[c],range,tier,effect,level:tier>=4?3:tier>=2?2:1,color:effect?effects[effect].color:'#ddd'};};
 add('basic',families[c],...base[c],0);
 add('iron',`Iron ${families[c]}`,base[c][0]+4,base[c][1]+5,1);
 add('heavy',c===0?'Long Sword':`Heavy ${families[c]}`,base[c][0]+9,base[c][1]+15,2,null,ranges[c]+(c===0?5:0));
 for(const [effect,prefix] of Object.entries({fire:'Fire',lightning:'Thunder',ice:'Ice',poison:'Poison',heal:'Bloom',drain:'Vampire',stun:'Impact',slow:'Chill'})){
  const min=c===0?10:base[c][0]+6,max=c===0?15:base[c][1]+9;
  add(effect,`${prefix} ${families[c]}`,min,max,effect==='fire'||effect==='poison'||effect==='ice'?1:effect==='lightning'||effect==='stun'||effect==='slow'?2:3,effect);
 }
 add('steel',`Steel ${families[c]}`,base[c][0]+20,base[c][1]+29,4);
}
items['3-ice'].agi=[80,90];
for(const [suffix,name,tier,arrows] of [['poison2','Twin Poison Bow',2,2],['poison3','Triple Poison Bow',4,3],['ice3','Triple Ice Bow',5,3],['steel4','Volley Bow',6,4]]){const source=suffix.startsWith('ice')?'2-ice':suffix.startsWith('steel')?'2-steel':'2-poison';const id='2-'+suffix;items[id]={...items[source],id,name,tier,level:tier,arrows,priceIndex:tier+5,min:items[source].min+tier,max:items[source].max+tier*2}}
for(const w of Object.values(items)){
 if(w.classId===7){const swarm=['poison','ice','stun'].includes(w.effect);w.summon={kind:swarm?'spirit':w.tier>=2?'golem':'skeleton',health:swarm?18:w.tier>=2?100:50,damage:swarm?.4:w.tier>=2?1.3:1,attackInterval:swarm?1:w.tier>=2?2:1.5,lifetime:15};w.agi=swarm?[85,95]:w.tier>=2?[290,310]:[145,155];w.name=(w.effect?effects[w.effect].name.split(' ')[0]+' ':'')+(swarm?'Spirit':w.tier>=2?'Golem':'Skeleton')+' Grimoire';}
 if(w.classId===6){
 const designs={basic:['Lute','line',null],iron:['Flute','long',null],fire:['Guarding Lute','line','guard'],ice:['Cleansing Harp','cone','cleanse'],poison:['Crescendo Flute','long','crescendo'],heavy:['War Horn','pulse',null],lightning:['Guarding Horn','pulse','guard'],stun:['Crescendo Horn','pulse','crescendo'],slow:['Cleansing Flute','long','cleanse'],heal:['Restoring Harp','cone','restore'],drain:['Restoring Lute','line','restore'],steel:['Grand Lute','line',null]};
 const d=designs[w.id.split('-')[1]];[w.name,w.note,w.effect]=d;w.instrument={line:'lute',long:'flute',cone:'harp',pulse:'horn'}[w.note];w.range={line:110,long:140,cone:100,pulse:75}[w.note];w.agi=[55,65];w.color=w.effect?effects[w.effect].color:'#f0d580';
 }
}
// Every zone has a complete catalogue. Original IDs remain valid for saved gear.
effects.cleave={name:'Cleave',mp:14,min:8,max:14,color:'#e4d5b8',description:'A physical sweep through nearby enemies.'};
effects.pierce={name:'Piercing strike',mp:14,min:10,max:16,color:'#e3e7ee',description:'A piercing physical projectile.'};
const weaponOrder=['basic','iron','fire','ice','poison','heavy','lightning','stun','slow','heal','drain','steel'];
const tierNames=['','Desert','Coastal','Mountain','Volcanic','Royal'];
const modes={fire:['eruption','bolt','fan','trail','chain'],ice:['bolt','ring','trail','fan','chain'],poison:['fan','trail','bolt','ring','chain'],lightning:['bolt','ring','fan','trail','burst'],stun:['ring','bolt','fan','trail','chain'],slow:['trail','fan','ring','bolt','chain'],drain:['chain','bolt','ring','fan','trail'],cleave:['ring','fan','trail','bolt','chain'],pierce:['fan','chain','trail','ring','burst']};
const originals=weaponOrder.flatMap(suffix=>Array.from({length:8},(_,c)=>items[c+'-'+suffix]));
for(const baseWeapon of originals){
 const suffix=baseWeapon.id.split('-')[1];
 for(let tier=1;tier<=6;tier++){
  const id=tier===1?baseWeapon.id:baseWeapon.id+'-t'+tier,w=tier===1?baseWeapon:{...baseWeapon,id,name:tierNames[tier-1]+' '+baseWeapon.name};
  w.tier=w.level=tier;w.catalogIndex=weaponOrder.indexOf(suffix);w.priceIndex=(tier-1)*12+w.catalogIndex;
  w.min=Math.round(baseWeapon.min*1.65**(tier-1));w.max=Math.round(baseWeapon.max*1.65**(tier-1));
  if(w.classId!==6&&suffix==='heavy')w.effect='cleave';
  if(w.classId!==6&&suffix==='steel')w.effect='pierce';
  if(w.classId===2)w.arrows=tier;
  if(w.summon)w.summon={...baseWeapon.summon,health:Math.round(baseWeapon.summon.health*(1+(tier-1)*.5))};
  if(w.classId===6){w.supportPower=1+(tier-1)*.3;}
  else if(w.effect&&w.effect!=='heal'&&(tier>1||['cleave','pierce'].includes(w.effect))){
   const mode=tier===1?(w.effect==='cleave'?'burst':'bolt'):modes[w.effect][(tier-2+[0,2,1,0,3,4,0,1][w.classId])%5];
   w.ability={mode,count:mode==='fan'?3:mode==='trail'?3:mode==='chain'?4:1,radius:mode==='ring'?65:mode==='burst'?42:mode==='eruption'?28:18,power:1+(tier-1)*.35};
   w.abilityDescription=({eruption:'Flame erupts beneath the target.',bolt:'Fires a '+w.effect+' projectile.',fan:'Fires three '+w.effect+' projectiles in a fan.',trail:'Creates three '+w.effect+' bursts along the ground.',chain:'Chains '+w.effect+' between four nearby enemies.',ring:'Releases a '+w.effect+' ring around the wielder.',burst:'Strikes nearby enemies with '+(['cleave','pierce'].includes(w.effect)?'physical':w.effect)+' damage.'})[mode];
  }
  if(w.effect==='heal'&&tier>1)w.abilityDescription=['','', 'Heals the most injured ally.', 'Heals allies near the target.', 'Heals the two most injured allies.', 'Heals allies near the most injured ally.', 'Heals allies in a wide circle.'][tier];
  if(w.effect)w.color=effects[w.effect].color;
  items[id]=w;
 }
}
// Keep old multi-arrow bow IDs, including those already equipped in saves.
for(const [id,tier] of [['2-poison2',2],['2-poison3',4],['2-ice3',5],['2-steel4',6]]){
 const w=items[id];w.level=w.tier=tier;w.catalogIndex=12;w.priceIndex=(tier-1)*12+12;w.ability={mode:'bolt',count:1,radius:16,power:1+(tier-1)*.35};w.abilityDescription='Fires an extra elemental projectile.';
}
// Curated live stock; omitted IDs remain loadable for existing saves.
for(const w of Object.values(items))if(w.type==='weapon')w.retired=true;
const specials=['heavy','slow','drain','stun','heavy','steel'];
for(let c=0;c<8;c++){
 let price=0;
 for(let tier=1;tier<=6;tier++){
  const special=specials[tier-1];
  let selection=tier===1?['basic','iron','fire','ice','poison','lightning',special]:['basic','fire','ice','poison','lightning','iron',special];
  if(c===3)selection=[...(tier%2?['basic']:[]),'fire','ice','poison','lightning',tier%2?'slow':'stun'];
  if(c===4)selection=['basic','ice','lightning','heal','drain','iron'];
  if(c===6)selection=['basic','fire','ice','poison','heal'];
  if(c===7)selection=['basic','fire','ice','poison','lightning','heavy'];
  const chosen=selection.map(suffix=>items[c+'-'+suffix+(tier===1?'':'-t'+tier)]);
  chosen.forEach((w,i)=>{w.retired=false;w.catalogIndex=i;w.priceIndex=price++;});
  if([0,1,2,5].includes(c)||c===4){
   const early=chosen.find(w=>w.id.split('-')[1]==='basic'),physical=chosen.find(w=>w.id.split('-')[1]==='iron');
   physical.effect=null;delete physical.ability;delete physical.abilityDescription;physical.color='#ddd';
   if(tier===1){physical.min=base[c][0]+4;physical.max=base[c][1]+5;}
   else{const elemental=chosen.filter(w=>['fire','ice','poison','lightning'].includes(w.effect)),min=Math.max(...elemental.map(w=>w.min)),max=Math.max(...elemental.map(w=>w.max));early.min=Math.ceil(min*1.5);early.max=Math.ceil(max*1.5);physical.min=min*2;physical.max=max*2;for(const w of chosen.filter(w=>w.effect&&!elemental.includes(w))){w.min=Math.min(w.min,Math.ceil(min*1.2));w.max=Math.min(w.max,Math.ceil(max*1.2));}}
  }
  if(c===3&&tier>1&&tier%2){const physical=chosen[0],elemental=chosen.filter(w=>['fire','ice','poison','lightning'].includes(w.effect));physical.min=Math.ceil(Math.max(...elemental.map(w=>w.min))*1.75);physical.max=Math.ceil(Math.max(...elemental.map(w=>w.max))*1.75);}
  if(c===7){const heavy=chosen.at(-1);heavy.effect=null;delete heavy.ability;delete heavy.abilityDescription;heavy.color='#ddd';}
 }
}
const runes=[
 ['ward','Ward Rune','#8cc9fa',{resistance:.10},'Take 25% less elemental damage.'],
 ['haste','Haste Rune','#7ee5c1',{haste:.15},'15% faster attacks.'],
 ['might','Might Rune','#ed9469',{damageBonus:.15},'Increase minimum and maximum basic AT by 15%.'],
 ['reach','Reach Rune','#f1d97b',{rangeBonus:15},'Increase attack and support range by 15.'],
 ['vitality','Vitality Rune','#9ce16b',{hpBonus:.20},'Increase maximum HP by 20%.'],
 ['renewal','Renewal Rune','#ece9d1',{regen:1},'Recover 1 HP per second while alive in an area.']
];
for(const [name,title,color,bonuses,description] of runes){const id='rune-'+name;items[id]={id,type:'rune',family:name,name:title,color,bonuses,description,level:1,tier:1,symbol:'◆'};}

for(let tier=2;tier<=6;tier++)for(const [family,title,color,base] of runes){
 const id='rune-'+family+'-'+tier,bonuses={};
 for(const [key,value] of Object.entries(base))bonuses[key]=Number((value*(1+(tier-1)*.3)).toFixed(3));
 const key=Object.keys(bonuses)[0],value=bonuses[key],description=({resistance:Math.round(value*100)+'% elemental resistance.',haste:Math.round(value*100)+'% faster attacks.',damageBonus:Math.round(value*100)+'% bonus AT.',rangeBonus:'+'+value+' range.',hpBonus:Math.round(value*100)+'% maximum HP.',regen:'Recover '+value+' HP per second.'})[key];
 items[id]={id,type:'rune',family,name:title+' '+tier,color,bonuses,description,level:tier,tier,symbol:'◆'};
}
for(const [i,[chance,power]] of [[.25,10],[.5,10],[.5,15],[1,15],[.3,45]].entries()){
 const tier=i+1,id=tier===1?'rune-knockback':'rune-knockback-'+tier;
 items[id]={id,type:'rune',family:'knockback',name:'Knockback Rune'+(tier===1?'':' '+tier),color:'#deb57c',bonuses:{knockbackChance:chance,knockbackPower:power},description:Math.round(chance*100)+'% chance of knockback '+power+'.',level:tier,tier,symbol:'◆'};
}
for(const [element,color] of [['fire','#ff9359'],['ice','#91dbfa'],['poison','#9ccc63'],['lightning','#f9df67']])for(let tier=1;tier<=6;tier++){
 const id='rune-'+element+'-ward-'+tier,value=.25+(tier-1)*.05;
 items[id]={id,type:'rune',family:'ward',name:element[0].toUpperCase()+element.slice(1)+' Ward Rune '+tier,color,bonuses:{[element+'Resistance']:value},description:'+'+Math.round(value*100)+'% '+element+' resistance.',level:tier,tier,symbol:'◆'};
}
const soulFamilies=[['leech','Leech Soul','#df758b','lifesteal',.02,.01,'lifesteal'],['wisdom','Wisdom Soul','#b994ef','xpBonus',.10,.05,'XP gain'],['fortune','Fortune Soul','#f1d47a','dropBonus',.05,.02,'equipment drop rate']];
for(let tier=1;tier<=6;tier++)for(const [family,name,color,stat,base,step,label] of soulFamilies){const id=tier===1&&family!=='fortune'?'rune-'+family:'soul-'+family+'-'+tier,bonus=Number((base+(tier-1)*step).toFixed(2));items[id]={id,type:'soul',name:name+' '+tier,color,bonuses:{[stat]:bonus},description:'+'+Math.round(bonus*100)+'% '+label+'.',level:tier,tier,symbol:'◈'};}

const gemFamilies=[
 ['ruby','Ruby','#ff5353',{str:5},'STR'],
 ['emerald','Emerald','#55ed79',{dex:5},'DEX'],
 ['sapphire','Sapphire','#629dff',{int:5},'INT'],
 ['amethyst','Amethyst','#d18dff',{str:2,dex:2,int:2},'all attributes'],
 ['diamond','Diamond','#f0f3ff',{defense:1},'defense'],
 ['topaz','Topaz','#ffc84f',{lp:50},'maximum HP']
];
for(let tier=1;tier<=10;tier++)for(const [family,name,color,base] of gemFamilies){const id='gem-'+family+'-'+tier,gemStats=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,v*tier]));const description=Object.entries(gemStats).map(([k,v])=>'+'+v+' '+({str:'STR',dex:'DEX',int:'INT',defense:'defense',lp:'maximum HP'}[k])).join(', ');items[id]={id,type:'gem',name:name+' Gem '+tier,color,gemStats,description:description+'.',level:tier,tier,symbol:'♦'}}
const descriptions=[
 ['+1 maximum AT, +4 HP','+1 minimum AT (capped at maximum), +4 HP','+1 MP per hit, +2 HP'],
 ['+1 minimum and maximum AT, +0.25% critical chance, +3 HP','Increases evasion, +4 HP','+1 MP per hit, +3 HP'],
 ['+2 RANGE, +3 HP','+0.5 minimum / +0.75 maximum AT, +3 HP','+1 MP per hit, +2 HP'],
 ['+2 RANGE, +2 HP','Faster attacks (2% per point), +2 HP','+1 minimum and maximum AT, +2 HP'],
 ['Nearby allies gain +1% AT, +3 HP','Nearby allies gain +0.2 defense, +3 HP','+1 MP per aura pulse, +2 RANGE, +2 HP'],
 ['+1 minimum and maximum AT, +4 HP','Heal 0.5 HP per enemy struck, +3 HP','+1 MP per hit, +2 HP'],
 ['Notes: allies +1% AT, enemies −0.5 AT; +3 HP','Notes: allies +1% attack speed, enemies +0.25 damage taken; +2 HP','+1 MP per hit, +2 HP'],
 ['+10% minion damage, +3 HP','+10% minion health, +3 HP','2% faster summoning, +2 HP']
];

const bossWeapons=[
 ['0-heavy','Quarry Blade','stun','eruption',42,1.4,'Ground slam.'],
 ['3-lightning-t2','Prism Staff','lightning','fan',22,1.3,'Three lightning shards.'],
 ['5-drain-t3','Coral Scythe','drain','ring',65,1.1,'Drain nearby enemies.'],
 ['2-lightning-t4','Storm Bow','lightning','chain',20,1.2,'Lightning chains between enemies.'],
 ['1-fire-t5','Ash Daggers','fire','trail',28,1.3,'Three fire eruptions.'],
 ['3-ice-t6','Royal Staff','ice','ring',90,1.4,'Wide freezing pulse.']
];
bossWeapons.forEach(([base,name,effect,mode,radius,power,description],z)=>{
 const id='boss-weapon-'+z,original=items[base];items[id]={...original,id,name,tier:z+1,level:z+1,retired:false,exclusiveBoss:z,priceIndex:original.priceIndex,effect,color:effects[effect].color,ability:{mode,radius,power,count:5},abilityDescription:description};
});
const bossSouls=[
 ['Colossus Soul',{damageBonus:.5,hpBonus:-.5},'+50% AT, −50% maximum HP.',[0,1,5]],
 ['Prism Soul',{wallPierce:1},'Projectiles pass through terrain.',[2,3,6,7]],
 ['Coral Soul',{regen:3,damageBonus:-.15},'+3 HP/s, −15% AT.'],
 ['Storm Soul',{haste:.25,hpBonus:-.2},'+25% attack speed, −20% maximum HP.'],
 ['Ash Soul',{damageBonus:.25,resistance:-.15},'+25% AT, −15% elemental resistance.'],
 ['Royal Soul',{xpBonus:.2,dropBonus:.1},'+20% XP, +10% equipment drops.']
];
bossSouls.forEach(([name,bonuses,description,allowedClasses],z)=>{const id='boss-soul-'+z;items[id]={id,type:'soul',name,bonuses,description,allowedClasses,exclusiveBoss:z,tier:z+1,level:z+1,color:['#c6a47a','#b9d8ff','#83d4b5','#b6caff','#f49163','#d8a1ec'][z],symbol:'◈'};});
for(const w of Object.values(items))if(w.type==='rune'){
 const b=w.bonuses;
 if(b.damageBonus)w.description='+'+Math.round(b.damageBonus*100)+'% AT.';
 else if(b.hpBonus)w.description='+'+Math.round(b.hpBonus*100)+'% maximum HP.';
 else if(b.rangeBonus)w.description='+'+b.rangeBonus+' range.';
 else if(b.regen)w.description='+'+b.regen+' HP/s.';
 else if(b.haste)w.description='+'+Math.round(b.haste*100)+'% attack speed.';
 else if(b.resistance)w.description='+'+Math.round(b.resistance*100)+'% elemental resistance.';
}
for(let tier=1;tier<=6;tier++)for(const type of ['rune','gem']){
 const stock=Object.values(items).filter(w=>w.type===type&&w.tier===tier);
 stock.forEach((w,i)=>w.sourceArea=(tier-1)*21+Math.floor(i*18/Math.max(1,stock.length-1)));
}
globalThis.BrambleGear={items,effects,descriptions};
})();
