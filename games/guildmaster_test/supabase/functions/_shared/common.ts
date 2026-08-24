import {createClient} from 'npm:@supabase/supabase-js@2';

export const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
export const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
export const preflight=(req:Request)=>req.method==='OPTIONS'?new Response('ok',{headers:corsHeaders}):null;
export function errorText(err:unknown){
  if(err instanceof Error)return err.message;
  if(err&&typeof err==='object'){
    const value=err as Record<string,unknown>;
    const parts=[value.message,value.details,value.hint,value.code].filter(Boolean).map(String);
    if(parts.length)return parts.join(' · ');
    try{return JSON.stringify(value)}catch(_ignored){}
  }
  return String(err);
}

export function adminClient(){
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)throw new Error('Supabase server environment is incomplete.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function authenticatedUser(req:Request){
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)throw new Error('Authentication required.');
  const admin=adminClient(),{data,error}=await admin.auth.getUser(token);
  if(error||!data.user)throw new Error('Invalid or expired Arena session.');
  return{user:data.user,admin};
}

const finite=(value:unknown,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const allowedClasses=new Set(['Warrior','Ranger','Mage','Priest','Rogue','Paladin']);
const allowedDamage=new Set(['physical','fire','ice','poison','lightning','holy','dark']);

export function validateSnapshot(input:unknown){
  if(!input||typeof input!=='object')throw new Error('Invalid Arena snapshot.');
  const snapshot=input as Record<string,unknown>,members=snapshot.members;
  if(!Array.isArray(members)||members.length<1||members.length>5)throw new Error('Arena parties require 1–5 members.');
  const seen=new Set<number>();
  for(const raw of members){
    if(!raw||typeof raw!=='object')throw new Error('Invalid Arena member.');
    const h=raw as Record<string,unknown>;
    if(!Number.isInteger(h.sourceId)||seen.has(h.sourceId as number))throw new Error('Arena member IDs must be unique.');
    seen.add(h.sourceId as number);
    if(typeof h.name!=='string'||h.name.length<1||h.name.length>30)throw new Error('Invalid Arena member name.');
    if(!allowedClasses.has(String(h.class)))throw new Error('Invalid Arena class.');
    if(!finite(h.level,1,500)||!finite(h.power,1,2000000)||!finite(h.maxHp,1,5000000))throw new Error('Arena member exceeds supported progression bounds.');
    for(const key of ['str','dex','int','def','mdef','block','weaponPower'])if(!finite(h[key],0,1000000))throw new Error(`Invalid Arena stat: ${key}.`);
    for(const key of ['threat','physicalDodge','magicalDodge','armorPen','critChance','critDamage','statusChance','healMult','damageMult'])if(!finite(h[key],0,10))throw new Error(`Invalid Arena modifier: ${key}.`);
    if(!finite(h.attackInterval,250,30000)||!allowedDamage.has(String(h.damageType)))throw new Error('Invalid Arena attack configuration.');
  }
  return snapshot as {guildName:string;guildLevel:number;combatVersion:number;members:Array<Record<string,any>>};
}

export function safeGuildName(value:unknown){
  const name=String(value||'Unnamed Guild').trim().replace(/\s+/g,' ').slice(0,40);
  if(!name)return'Unnamed Guild';
  return name;
}
