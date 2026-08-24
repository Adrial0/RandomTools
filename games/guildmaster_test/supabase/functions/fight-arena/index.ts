import {authenticatedUser,errorText,json,preflight,validateSnapshot} from '../_shared/common.ts';

Deno.serve(async(req)=>{
  const pre=preflight(req);if(pre)return pre;
  try{
    const {user,admin}=await authenticatedUser(req),body=await req.json();
    if(!body.opponentPartyId||!body.requestId)throw new Error('Opponent and request ID are required.');
    const [{data:attacker},{data:defender}]=await Promise.all([
      admin.from('arena_parties').select('*').eq('user_id',user.id).single(),
      admin.from('arena_parties').select('*').eq('id',body.opponentPartyId).single()
    ]);
    if(!attacker||!defender)throw new Error('Both players must have a published Arena defense.');
    if(defender.user_id===user.id)throw new Error('You cannot challenge your own defense.');
    if(attacker.combat_version!==1||defender.combat_version!==1)throw new Error('Arena party combat versions do not match.');
    const windowStart=new Date(Date.now()-5*60*1000).toISOString();
    const {data:recent}=await admin.from('arena_matches').select('created_at').eq('attacker_id',user.id).gte('created_at',windowStart).order('created_at',{ascending:true}).limit(5);
    if((recent?.length||0)>=5){
      const resetsAt=new Date(new Date(recent![0].created_at).getTime()+5*60*1000).toISOString();
      throw new Error(`Five Arena challenges used. Another attempt becomes available at ${resetsAt}.`);
    }
    const attackSnapshot=validateSnapshot(attacker.snapshot),defenseSnapshot=validateSnapshot(defender.snapshot);
    if(body.prepare===true)return json({requestId:body.requestId,attacker:attackSnapshot,defender:defenseSnapshot});
    if(typeof body.won!=='boolean')throw new Error('Arena result is required.');
    const report=Array.isArray(body.report)?body.report.slice(0,20):[],replay=Array.isArray(body.replay)?body.replay.slice(0,80):[];
    const {data:finalized,error}=await admin.rpc('finalize_arena_match',{p_request_id:body.requestId,p_attacker:user.id,p_defender:defender.user_id,p_attacker_won:body.won,p_attacker_snapshot:attackSnapshot,p_defender_snapshot:defenseSnapshot,p_seed:0,p_report:report,p_replay:replay});
    if(error)throw error;
    return json({won:body.won,ratingChange:finalized.ratingChange,newRating:finalized.newRating,matchId:finalized.matchId});
  }catch(err){return json({error:errorText(err)},400)}
});
