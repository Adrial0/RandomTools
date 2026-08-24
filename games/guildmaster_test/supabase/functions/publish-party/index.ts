import {authenticatedUser,json,preflight,safeGuildName,validateSnapshot} from '../_shared/common.ts';

Deno.serve(async(req)=>{
  const pre=preflight(req);if(pre)return pre;
  try{
    const {user,admin}=await authenticatedUser(req),body=await req.json();
    const snapshot=validateSnapshot(body.snapshot),guildName=safeGuildName(body.guildName||snapshot.guildName);
    const partyPower=Math.round(snapshot.members.reduce((sum,h)=>sum+Number(h.power||0),0));
    const combatVersion=Math.max(1,Math.floor(Number(snapshot.combatVersion||1)));
    const {error:profileError}=await admin.from('profiles').upsert({user_id:user.id,guild_name:guildName,updated_at:new Date().toISOString()});
    if(profileError)throw profileError;
    const {data:party,error:partyError}=await admin.from('arena_parties').upsert({user_id:user.id,snapshot:{...snapshot,guildName},party_power:partyPower,member_count:snapshot.members.length,combat_version:combatVersion,published_at:new Date().toISOString()},{onConflict:'user_id'}).select('*').single();
    if(partyError)throw partyError;
    const {error:ratingError}=await admin.from('arena_ratings').upsert({user_id:user.id},{onConflict:'user_id',ignoreDuplicates:true});
    if(ratingError)throw ratingError;
    return json({defense:party});
  }catch(err){return json({error:String(err instanceof Error?err.message:err)},400)}
});
