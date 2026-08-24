import {authenticatedUser,errorText,json,preflight} from '../_shared/common.ts';

Deno.serve(async(req)=>{
  const pre=preflight(req);if(pre)return pre;
  try{
    const {user,admin}=await authenticatedUser(req);
    await admin.from('arena_ratings').upsert({user_id:user.id},{onConflict:'user_id',ignoreDuplicates:true});
    const [{data:rating},{data:defense},{data:ratings},{data:parties},{data:profiles},{data:matches}]=await Promise.all([
      admin.from('arena_ratings').select('*').eq('user_id',user.id).maybeSingle(),
      admin.from('arena_parties').select('*').eq('user_id',user.id).maybeSingle(),
      admin.from('arena_ratings').select('*').order('rating',{ascending:false}).limit(50),
      admin.from('arena_parties').select('id,user_id,party_power,member_count,combat_version,published_at'),
      admin.from('profiles').select('user_id,guild_name'),
      admin.from('arena_matches').select('id,attacker_id,defender_id,winner_id,attacker_rating_change,defender_rating_change,created_at').or(`attacker_id.eq.${user.id},defender_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(20)
    ]);
    const profileMap=new Map((profiles||[]).map(x=>[x.user_id,x.guild_name])),ratingMap=new Map((ratings||[]).map(x=>[x.user_id,x]));
    const currentRating=rating?.rating||1000;
    const opponents=(parties||[]).filter(x=>x.user_id!==user.id&&x.combat_version===1).map(x=>({party_id:x.id,guild_name:profileMap.get(x.user_id)||'Unnamed Guild',party_power:x.party_power,member_count:x.member_count,rating:ratingMap.get(x.user_id)?.rating||1000,difference:Math.abs((ratingMap.get(x.user_id)?.rating||1000)-currentRating)})).sort((a,b)=>a.difference-b.difference).slice(0,6);
    const leaderboard=(ratings||[]).map(x=>({guild_name:profileMap.get(x.user_id)||'Unnamed Guild',rating:x.rating,wins:x.wins,losses:x.losses}));
    const history=(matches||[]).map(x=>{const attacking=x.attacker_id===user.id,opponent=attacking?x.defender_id:x.attacker_id;return{id:x.id,won:x.winner_id===user.id,opponent_guild:profileMap.get(opponent)||'Unnamed Guild',rating_change:attacking?x.attacker_rating_change:x.defender_rating_change,created_at:x.created_at}});
    return json({profile:rating||{rating:1000,wins:0,losses:0},defense,opponents,leaderboard,history});
  }catch(err){return json({error:errorText(err)},400)}
});
