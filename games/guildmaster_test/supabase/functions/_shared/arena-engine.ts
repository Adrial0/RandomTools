type Hero=Record<string,any>;
type Unit=Hero&{arenaId:string;side:'attack'|'defense';hp:number;nextAttack:number;nextActive:number;cast:null|{ends:number;kind:string};statuses:Record<string,{power:number;stacks:number;nextTick:number;expires:number;source:Unit}>};

function rng(seed:number){let value=seed>>>0||1;return()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296}}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const statusFor=(type:string)=>({physical:'bleed',fire:'burning',poison:'poison',ice:'frostbite',lightning:'shocked',dark:'cursed'} as Record<string,string>)[type];
const interrupters=new Set(['guardian','warlord','marksman','assassin','stormcaller']);
const cleansers=new Set(['lifepriest','oracle','beacon']);

export function resolveArenaBattle(attacker:any,defender:any,seed:number){
  const random=rng(seed),replay:string[]=[],timeline:Record<string,any>[]=[],metrics=new Map<Unit,Record<string,any>>();
  const build=(h:Hero,side:'attack'|'defense',index:number):Unit=>({...h,arenaId:(side==='attack'?'a':'d')+index,side,hp:h.maxHp,nextAttack:Math.max(250,h.attackInterval||2500),nextActive:2500+Math.floor(random()*1500),cast:null,statuses:{}});
  const attack:Unit[]=attacker.members.map((h:Hero,i:number)=>build(h,'attack',i));
  const defense:Unit[]=defender.members.map((h:Hero,i:number)=>build(h,'defense',i));
  [...attack,...defense].forEach(u=>metrics.set(u,{name:u.name,side:u.side,damage:0,statusDamage:0,healing:0,damageTaken:0,interrupts:0,cleanses:0,statusesApplied:0,criticalHits:0,abilityUses:0}));
  const living=(side:Unit[])=>side.filter(x=>x.hp>0);
  const opponents=(u:Unit)=>u.side==='attack'?living(defense):living(attack);
  const allies=(u:Unit)=>u.side==='attack'?living(attack):living(defense);
  const log=(text:string)=>{replay.push(text);if(replay.length>160)replay.shift()};
  const emit=(type:string,source:Unit|null,target:Unit|null,amount=0,text='')=>timeline.push({time:clock,type,sourceId:source?.arenaId||null,targetId:target?.arenaId||null,amount,targetHp:target?.hp??null,targetMaxHp:target?.maxHp??null,text});
  const targetFor=(list:Unit[])=>{const total=list.reduce((n,x)=>n+Math.max(.1,x.threat||1),0);let roll=random()*total;for(const x of list){roll-=Math.max(.1,x.threat||1);if(roll<=0)return x}return list[0]};
  const mitigation=(raw:number,def:number,block=0,pen=0)=>Math.max(1,Math.round(Math.max(0,raw-block*(1-pen))*(1-(.15*(def*(1-pen)/300)+.85*(def*(1-pen)/(def*(1-pen)+160))))));
  const deal=(source:Unit,target:Unit,mult=1,type=source.damageType||'physical',kind='attack')=>{
    const main=source.class==='Mage'||source.class==='Priest'?source.int:source.class==='Ranger'||source.class==='Rogue'?source.dex:source.str;
    let raw=((source.weaponPower||8)*.34+(main||1)*.36)*(.72+random()*.14)*(source.damageMult||1)*mult;
    let damage=type==='physical'?mitigation(raw,target.def,target.block||0,source.armorPen||0):Math.round(mitigation(raw,target.mdef,target.block||0,source.armorPen||0)*clamp(1-(target[type]||0)/100,.2,2));
    if(random()<(source.critChance||0)){damage=Math.round(damage*(1.35+(source.critDamage||0)));metrics.get(source)!.criticalHits++}
    damage=Math.min(target.hp,Math.max(1,damage));target.hp-=damage;metrics.get(source)!.damage+=damage;metrics.get(target)!.damageTaken+=damage;
    const text=`${source.name} ${kind==='ability'?'uses an ability on':'attacks'} ${target.name} for ${damage}.`;log(text);emit(kind,source,target,damage,text);
    return damage;
  };
  const applyStatus=(source:Unit,target:Unit,damage:number)=>{
    const type=statusFor(source.damageType);if(!type||random()>clamp(source.statusChance||0,0,.75))return;
    const old=target.statuses[type];if(old){old.stacks=Math.min(3,old.stacks+1);old.expires=Math.max(old.expires,clock+8000);old.source=source}else target.statuses[type]={power:Math.max(1,Math.round(damage*.14)),stacks:1,nextTick:clock+2000,expires:clock+8000,source};
    metrics.get(source)!.statusesApplied++;
  };
  const cleanse=(source:Unit,target:Unit)=>{const keys=Object.keys(target.statuses);if(!keys.length)return;const count=source.subclass==='lifepriest'?keys.length:1;keys.slice(0,count).forEach(k=>delete target.statuses[k]);metrics.get(source)!.cleanses+=Math.min(count,keys.length);const text=`${source.name} cleanses ${target.name}.`;log(text);emit('cleanse',source,target,0,text)};
  const heal=(source:Unit)=>{const target=[...allies(source)].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(!target)return;const amount=Math.min(target.maxHp-target.hp,Math.max(2,Math.round(((source.int||1)*.55+(source.weaponPower||8)*.2)*(source.healMult||1))));if(amount>0){target.hp+=amount;metrics.get(source)!.healing+=amount;const text=`${source.name} heals ${target.name} for ${amount}.`;log(text);emit('heal',source,target,amount,text)}if(cleansers.has(source.subclass))cleanse(source,target)};
  const useActive=(source:Unit)=>{
    const foes=opponents(source);if(!foes.length)return;
    metrics.get(source)!.abilityUses++;
    if(source.class==='Priest'||['lifepriest','oracle','beacon'].includes(source.subclass)){heal(source);return}
    const casting=foes.find(x=>x.cast),target=casting||targetFor(foes);
    if(casting&&interrupters.has(source.subclass)){casting.cast=null;casting.nextActive=clock+3000;metrics.get(source)!.interrupts++;const text=`${source.name} interrupts ${casting.name}!`;log(text);emit('interrupt',source,casting,0,text)}
    const damage=deal(source,target,source.subclass==='assassin'?2.1:source.subclass==='berserker'?1.9:1.55,source.element||source.damageType,'ability');
    if(['berserker','assassin'].includes(source.subclass)){const old=source.damageType;source.damageType='physical';applyStatus(source,target,damage);source.damageType=old}
    if(['pyromancer','venomancer'].includes(source.subclass))applyStatus(source,target,damage);
  };

  let clock=0;
  while(living(attack).length&&living(defense).length&&clock<120000){
    clock+=100;
    for(const unit of [...living(attack),...living(defense)]){
      for(const [key,status] of Object.entries(unit.statuses)){
        if(clock>=status.nextTick&&clock<=status.expires){const damage=Math.min(unit.hp,status.power*status.stacks);unit.hp-=damage;metrics.get(status.source)!.statusDamage+=damage;metrics.get(unit)!.damageTaken+=damage;status.nextTick+=2000;const text=`${unit.name} takes ${damage} ${key} damage.`;log(text);emit('status',status.source,unit,damage,text)}
        if(clock>=status.expires||unit.hp<=0)delete unit.statuses[key];
      }
      if(unit.hp<=0)continue;
      if(unit.cast&&clock>=unit.cast.ends){unit.cast=null;useActive(unit);unit.nextActive=clock+10000}
      if(unit.cast)continue;
      if(clock>=unit.nextActive){unit.cast={ends:clock+700,kind:'active'};const text=`${unit.name} begins using ${unit.activeType||'an ability'}.`;log(text);emit('cast',unit,null,0,text);continue}
      if(clock>=unit.nextAttack){const foes=opponents(unit);if(!foes.length)break;const target=targetFor(foes),damage=deal(unit,target);applyStatus(unit,target,damage);unit.nextAttack=clock+Math.max(250,unit.attackInterval||2500)}
      if(unit.regen>0&&clock%5000===0){const amount=Math.min(unit.maxHp-unit.hp,unit.regen);unit.hp+=amount;metrics.get(unit)!.healing+=amount}
    }
  }
  const attackAlive=living(attack),defenseAlive=living(defense),attackRatio=attack.reduce((n,x)=>n+x.hp,0)/attack.reduce((n,x)=>n+x.maxHp,0),defenseRatio=defense.reduce((n,x)=>n+x.hp,0)/defense.reduce((n,x)=>n+x.maxHp,0);
  const attackerWon=defenseAlive.length===0||(attackAlive.length>0&&clock>=120000&&attackRatio>defenseRatio);
  const resultText=attackerWon?`${attacker.guildName} wins the Arena battle.`:`${defender.guildName} defends successfully.`;log(resultText);emit('result',null,null,0,resultText);
  const combatants=[...attack,...defense].map(x=>({id:x.arenaId,name:x.name,class:x.class,subclass:x.subclass,side:x.side,maxHp:x.maxHp,attackInterval:x.attackInterval,activeType:x.activeType}));
  return{attackerWon,durationMs:clock,replay,timeline,combatants,report:[...metrics.values()]};
}
