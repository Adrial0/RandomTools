import {authenticatedUser,errorText,json,preflight,validateSnapshot} from '../_shared/common.ts';
import {resolveArenaBattle} from '../_shared/arena-engine.ts';

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
    const {data:recent}=await admin.from('arena_matches').select('created_at').eq('attacker_id',user.id).gte('created_at',new Date(Date.now()-8000).toISOString()).limit(1);
    if(recent?.length)throw new Error('Wait a few seconds before starting another ranked match.');
    const attackSnapshot=validateSnapshot(attacker.snapshot),defenseSnapshot=validateSnapshot(defender.snapshot);
    const seed=Math.floor(Math.random()*2147483646)+1,result=resolveArenaBattle(attackSnapshot,defenseSnapshot,seed);
    const {data:finalized,error}=await admin.rpc('finalize_arena_match',{p_request_id:body.requestId,p_attacker:user.id,p_defender:defender.user_id,p_attacker_won:result.attackerWon,p_attacker_snapshot:attackSnapshot,p_defender_snapshot:defenseSnapshot,p_seed:seed,p_report:result.report,p_replay:result.replay});
    if(error)throw error;
    const attackerReport=result.report.filter(x=>x.side==='attack');
    return json({won:result.attackerWon,ratingChange:finalized.ratingChange,newRating:finalized.newRating,matchId:finalized.matchId,report:attackerReport,replay:result.replay,durationMs:result.durationMs});
  }catch(err){return json({error:errorText(err)},400)}
});
