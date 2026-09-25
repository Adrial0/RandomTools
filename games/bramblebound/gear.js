// Item definitions and class scaling shared by the game and simulation tests.
(() => {
const effects={
 encore:{name:'Encore',mp:12,min:0,max:0,color:'#f0d580',description:'Release a second volley.'},
 sustain:{name:'Sustaining melody',mp:12,min:0,max:0,color:'#8bd9bd',description:'Next notes last 2s.'},
 crescendo:{name:'Crescendo',mp:14,min:0,max:0,color:'#e7a46d',description:'Next notes have 50% stronger effects.'},
 restore:{name:'Restoring chord',mp:14,min:0,max:0,color:'#bce69c',description:'Next notes heal allies for 12 HP.'},
 fire:{name:'Flame burst',mp:10,min:1,max:3,count:10,time:1,color:'#ff763c',description:'10 embers over 1 second; nearby grounded enemies burn.'},
 lightning:{name:'Chain lightning',mp:10,min:1,max:7,count:3,time:0,color:'#fff36a',description:'Lightning jumps to up to 3 nearby enemies.'},
 ice:{name:'Frost burst',mp:12,min:3,max:5,count:1,time:2,color:'#79cfff',description:'Freezes nearby enemies.'},
 slow:{name:'Chill burst',mp:12,min:3,max:5,count:1,time:2,slow:.2,color:'#9db3e9',description:'Slow 20% for 2s.'},
 poison:{name:'Poison strike',mp:10,min:2,max:3,count:1,time:4,color:'#76ef66',description:'Poisons the struck enemy for 4 seconds; poison ticks every second.'},
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
 if(w.classId===7){const swarm=['poison','ice','stun'].includes(w.effect);w.summon={kind:swarm?'spirit':w.tier>=2?'golem':'skeleton',count:swarm?3:1,health:swarm?18:w.tier>=2?100:50,damage:swarm?.4:w.tier>=2?1.3:1,delay:w.tier>=2&&!swarm?7:4};w.name=(w.effect?effects[w.effect].name.split(' ')[0]+' ':'')+(swarm?'Spirit':w.tier>=2?'Golem':'Skeleton')+' Grimoire';}
 if(w.classId===6){
 const designs={basic:['Lute','line',null],iron:['Flute','long',null],fire:['Encore Lute','line','encore'],ice:['Sustaining Harp','cone','sustain'],poison:['Crescendo Flute','long','crescendo'],heavy:['War Horn','pulse',null],lightning:['Encore Horn','pulse','encore'],stun:['Crescendo Horn','pulse','crescendo'],slow:['Sustaining Flute','long','sustain'],heal:['Restoring Harp','cone','restore'],drain:['Restoring Lute','line','restore'],steel:['Grand Lute','line',null]};
 const d=designs[w.id.split('-')[1]];[w.name,w.note,w.effect]=d;w.instrument={line:'lute',long:'flute',cone:'harp',pulse:'horn'}[w.note];w.range={line:110,long:140,cone:100,pulse:75}[w.note];w.agi=[55,65];w.color=w.effect?effects[w.effect].color:'#f0d580';
 }
}
const runes=[
 ['ward','Ward Rune','#8cc9fa',{resistance:.25},'Take 25% less elemental damage.'],
 ['haste','Haste Rune','#7ee5c1',{haste:.15},'15% faster attacks.'],
 ['might','Might Rune','#ed9469',{damageBonus:.15},'Increase minimum and maximum basic AT by 15%.'],
 ['reach','Reach Rune','#f1d97b',{rangeBonus:15},'Increase attack and support range by 15.'],
 ['vitality','Vitality Rune','#9ce16b',{hpBonus:.20},'Increase maximum HP by 20%.'],
 ['renewal','Renewal Rune','#ece9d1',{regen:1},'Recover 1 HP per second while alive in an area.']
];
for(const [name,title,color,bonuses,description] of runes){const id='rune-'+name;items[id]={id,type:'rune',name:title,color,bonuses,description,level:1,tier:1,symbol:'◆'};}

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
 ['+1 minimum and maximum AT, +5 HP','Faster attacks (2% per point), +3 HP','+1 MP per hit, +2 HP'],
 ['+2 RANGE, +3 HP','+0.5 minimum / +0.75 maximum AT, +3 HP','+1 MP per hit, +2 HP'],
 ['+2 RANGE, +2 HP','Faster attacks (2% per point), +2 HP','+1 MP per hit; +0.5 / +0.75 AT and +5% ability damage, +2 HP'],
 ['Nearby allies gain +1% AT, +3 HP','Nearby allies gain +0.2 defense, +3 HP','+1 MP per aura pulse, +2 RANGE, +2 HP'],
 ['+1 minimum and maximum AT, +4 HP','Heal 0.5 HP per enemy struck, +3 HP','+1 MP per hit, +2 HP'],
 ['Notes: allies +1% AT, enemies −0.5 AT; +3 HP','Notes: allies +1% attack speed, enemies +0.25 physical damage taken; +2 HP','+1 MP per hit, +2 HP'],
 ['+10% minion damage, +3 HP','+10% minion health, +3 HP','One additional base group per 10 INT, +2 HP']
];
globalThis.BrambleGear={items,effects,descriptions};
})();
