import {authenticatedUser,errorText,json,preflight,safeGuildName} from '../_shared/common.ts';

Deno.serve(async(req)=>{
  const pre=preflight(req);if(pre)return pre;
  try{
    const {user,admin}=await authenticatedUser(req),body=await req.json(),guildName=safeGuildName(body.guildName);
    const {data,error}=await admin.from('profiles').upsert({user_id:user.id,guild_name:guildName,updated_at:new Date().toISOString()}).select('guild_name').single();
    if(error?.code==='23505')throw new Error('That guild name is already taken. Choose another.');
    if(error)throw error;
    return json({guildName:data.guild_name});
  }catch(err){return json({error:errorText(err)},400)}
});
