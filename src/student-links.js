const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const expired=()=>new Error('Sua conta mudou ou a sessão expirou. Entre novamente e confira o vínculo.');
export function createStudentLinks({request,identity}){
  const pending=new Set();
  const current=async()=>{const actor=await identity();if(!actor||!uuid.test(actor.id))throw expired();return actor;};
  const same=async actor=>{const now=await current();if(now.id!==actor.id||now.epoch!==actor.epoch)throw expired();};
  return {
    async list(){
      const actor=await current();
      const rows=await request(`/rest/v1/alunos?user_id=eq.${actor.id}&personal_id=not.is.null&select=id,user_id,personal_id,status&order=criado_em.asc`);
      if(!Array.isArray(rows)||rows.some(r=>r.user_id!==actor.id||!uuid.test(r.id)||!uuid.test(r.personal_id)))throw new Error('Não foi possível conferir seus vínculos. Tente novamente.');
      const own=rows.filter(r=>r.personal_id!==actor.id);
      const ids=[...new Set(own.map(r=>r.personal_id))];
      const profiles=ids.length?await request(`/rest/v1/profissionais?user_id=in.(${ids.join(',')})&select=user_id,nome`):[];
      if(!Array.isArray(profiles))throw new Error('Não foi possível conferir o nome do personal. Tente novamente.');
      await same(actor);
      return own.map(row=>({...row,personalName:profiles.find(p=>p.user_id===row.personal_id)?.nome?.trim()||null,actor}));
    },
    async detach(link,currentPlanId=null){
      const actor=await current();
      if(!link?.actor||link.actor.id!==actor.id||link.actor.epoch!==actor.epoch)throw expired();
      if(link.user_id!==actor.id||!uuid.test(link.id)||!uuid.test(link.personal_id)||link.personal_id===actor.id||!link.personalName)throw new Error('Confira o vínculo e o nome do personal antes de confirmar.');
      if(pending.has(link.id))throw new Error('A desvinculação já está sendo verificada.');
      pending.add(link.id);
      try{
        const result=await request('/rest/v1/rpc/desvincular_meu_personal',{method:'POST',body:JSON.stringify({p_aluno_id:link.id,p_personal_id:link.personal_id,p_current_plan_id:currentPlanId})});
        await same(actor);
        if(result?.ok!==true||result.aluno_id!==link.id||result.personal_id!==link.personal_id||!Number.isInteger(result.remaining_links)||result.remaining_links<0||(result.plan!=null&&(!Array.isArray(result.plan.weekDays)||result.plan.locked!==(result.remaining_links>0))))throw new Error('O servidor não confirmou a desvinculação. Confira os vínculos antes de tentar novamente.');
        return result;
      }catch(error){
        if(error.status===404)throw new Error('A desvinculação ainda não está disponível no servidor. Seu vínculo não foi alterado por esta solicitação.');
        if(error.status===401)throw expired();
        if(error.status===403)throw new Error('Você não tem permissão para encerrar este vínculo. Entre novamente e confira a conta.');
        if(error.status===409)throw new Error('O vínculo mudou durante a confirmação. Confira os vínculos novamente.');
        throw error;
      }finally{pending.delete(link.id);}
    }
  };
}
