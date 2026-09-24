// Item definitions and class scaling shared by the game and simulation tests.
(() => {
const effects={
 fire:{name:'Flame burst',mp:10,min:1,max:3,count:10,time:1,color:'#ff763c',description:'10 embers over 1 second; nearby grounded enemies burn.'},
 lightning:{name:'Chain lightning',mp:10,min:1,max:7,count:3,time:0,color:'#fff36a',description:'Lightning jumps to up to 3 nearby enemies.'},
 ice:{name:'Frost burst',mp:12,min:3,max:5,count:1,time:2,color:'#79cfff',description:'Nearby enemies freeze for 0.7 seconds, then slow by 40% for 2 seconds.'},
 poison:{name:'Poison strike',mp:10,min:2,max:3,count:1,time:4,color:'#76ef66',description:'Poisons the struck enemy for 4 seconds; poison ticks every second.'},
 heal:{name:'Healing bloom',mp:12,min:12,max:18,count:1,time:0,color:'#6fffb6',description:'Restores health to every living party member.'},
 drain:{name:'Life drain',mp:14,min:9,max:14,count:1,time:0,color:'#e783e3',description:'Deals bonus damage and returns that damage as health.'},
 stun:{name:'Shockwave',mp:10,min:5,max:9,count:1,time:1.2,color:'#ffdca0',description:'Damages nearby enemies and stuns them for 1.2 seconds.'}
};
const families=['Sword','Glove','Bow','Orb','Staff','Spear','Gun','Whip'];
const base=[[1,5],[2,4],[4,8],[6,10],[2,5],[4,9],[2,4],[3,6]];
const ranges=[30,14,125,105,95,45,155,65];
const agi=[[20,30],[9,15],[28,36],[42,50],[35,43],[28,36],[10,16],[28,36]];
const items={};
for(let c=0;c<8;c++){
  const add=(suffix,name,min,max,tier,effect=null,range=ranges[c])=>{const id=`${c}-${suffix}`;items[id]={id,type:'weapon',name,classId:c,min,max,agi:agi[c],range,tier,effect,level:tier>=4?3:tier>=2?2:1,color:effect?effects[effect].color:'#ddd'};};
 add('basic',families[c],...base[c],0);
 add('iron',`Iron ${families[c]}`,base[c][0]+4,base[c][1]+5,1);
 add('heavy',c===0?'Long Sword':`Heavy ${families[c]}`,base[c][0]+9,base[c][1]+15,2,null,ranges[c]+(c===0?5:0));
 for(const [effect,prefix] of Object.entries({fire:'Fire',lightning:'Thunder',ice:'Ice',poison:'Poison',heal:'Bloom',drain:'Vampire',stun:'Impact'})){
  const min=c===0?10:base[c][0]+6,max=c===0?15:base[c][1]+9;
  add(effect,`${prefix} ${families[c]}`,min,max,effect==='fire'||effect==='poison'||effect==='ice'?1:effect==='lightning'||effect==='stun'?2:3,effect);
 }
 add('steel',`Steel ${families[c]}`,base[c][0]+20,base[c][1]+29,4);
}
const runes=[
 ['leech','Leech Rune','#df758b',{lifesteal:.08},'Restore 8% of actual basic-attack damage as LP.'],
 ['ward','Ward Rune','#8cc9fa',{resistance:.25},'Take 25% less elemental damage. Physical hits are unaffected.'],
 ['wisdom','Wisdom Rune','#b994ef',{xpBonus:.20},'This character earns 20% more combat EXP.'],
 ['haste','Haste Rune','#7ee5c1',{haste:.15},'15% faster basic attacks and basic healing.'],
 ['might','Might Rune','#ed9469',{damageBonus:.15},'Increase minimum and maximum basic AT by 15%.'],
 ['reach','Reach Rune','#f1d97b',{rangeBonus:15},'Increase attack and support range by 15.'],
 ['vitality','Vitality Rune','#9ce16b',{hpBonus:.20},'Increase maximum LP by 20%. Does not heal on equip.'],
 ['renewal','Renewal Rune','#ece9d1',{regen:1},'Recover 1 LP per second while alive in an area.']
];
for(const [name,title,color,bonuses,description] of runes){const id='rune-'+name;items[id]={id,type:'rune',name:title,color,bonuses,description,level:1,tier:1,symbol:'◆'};}
const descriptions=[
 ['+1 maximum AT, +4 LP','+1 minimum AT (capped at maximum), +4 LP','+1 MP per hit, +2 LP'],
 ['+1 minimum and maximum AT, +5 LP','Faster attacks (2% per point), +3 LP','+1 MP per hit, +2 LP'],
 ['+2 RANGE, +3 LP','+0.5 minimum / +0.75 maximum AT, +3 LP','+1 MP per hit, +2 LP'],
 ['+2 RANGE, +2 LP','Faster attacks (2% per point), +2 LP','+1 MP per hit; +0.5 / +0.75 AT and +5% ability damage, +2 LP'],
 ['Nearby allies gain +1% AT, +3 LP','Nearby allies gain +0.2 defense, +3 LP','+1 MP per aura pulse, +2 RANGE, +2 LP'],
 ['+1.5 maximum AT, +4 LP','+0.5 minimum AT and +1% critical chance (cap 40%), +3 LP','+1 MP per hit, +2 LP'],
 ['+2% weapon AT, +3 LP','Faster attacks (2% per point), +2 LP','+1 MP per hit and +3% ability damage, +2 LP'],
 ['+0.5 minimum and maximum AT, +3 LP','One extra special strike per 5 DEX, +3 LP','+1 MP per hit, +2 LP']
];
globalThis.BrambleGear={items,effects,descriptions};
})();
