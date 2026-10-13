import {useEffect,useRef,useState} from 'react';
export default function StudentLinks({service,onDetached,currentLink,onLogin,onBusy}){
  const [links,setLinks]=useState(null),[error,setError]=useState(''),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const running=useRef(false),alive=useRef(true),version=useRef(0);
  const section=useRef(null),heading=useRef(null),previous=useRef(null);
  useEffect(()=>{if(selected){previous.current=selected.id;heading.current?.focus();}else if(previous.current){section.current?.querySelector(`[data-student-unlink="${previous.current}"]`)?.focus();previous.current=null;}},[selected]);
  const refresh=async()=>{const request=++version.current;setError('');try{const rows=await service.list();if(alive.current&&request===version.current)setLinks(rows);}catch(e){if(alive.current&&request===version.current)setError(e.message);}};
  useEffect(()=>{alive.current=true;refresh();return()=>{alive.current=false;version.current++;};},[service]);
  const confirm=async()=>{if(running.current||!selected)return;running.current=true;setBusy(true);onBusy(true);setError('');try{const result=await service.detach(selected,currentLink?.aluno?.id===selected.id?currentLink.treino?.id||null:null);if(!alive.current)return;await onDetached(result);if(!alive.current)return;setSelected(null);setNotice(result.remaining_links?'Vínculo encerrado. Outros vínculos continuam cadastrados.':'Vínculo encerrado. Você pode solicitar seus próximos treinos à IA.');await refresh();}catch(e){if(alive.current)setError(e.message);}finally{running.current=false;if(alive.current){setBusy(false);onBusy(false);}}};
  return <section ref={section} className="ab-student-links" aria-labelledby="student-links-title">
    <h2 id="student-links-title">Vínculos com personal</h2>
    {selected?<>
      <h3 ref={heading} tabIndex={-1}>Desvincular de {selected.personalName}?</h3>
      <p>Você encerrará este vínculo. Seus planos, histórico de treinos, cargas e avaliações serão preservados. Nenhum novo treino será gerado agora.</p>
      <p>Novos acessos do personal que dependem deste vínculo serão revogados. Materiais já recebidos ou copiados fora do aplicativo não são apagados.</p>
      <p>{links.length>1?'Há outros vínculos cadastrados. Encerrar este não encerra os demais.':'Após encerrar o último vínculo, você poderá voltar a pedir treinos à IA. O plano só será substituído quando você confirmar outro.'}</p>
      <div className="ab-link-actions"><button className="ab-secondary-action" disabled={busy} onClick={()=>{setSelected(null);setError('');}}>Manter vínculo</button><button className="ab-secondary-action ab-unlink-action" disabled={busy} onClick={confirm}>{busy?'Confirmando…':'Confirmar desvinculação'}</button></div>
    </>:<>
      {!links&&!error&&<p role="status">Conferindo seus vínculos…</p>}
      {links?.length===0&&<p>Você não tem vínculo com um personal.</p>}
      {links?.map(link=><div className="ab-settings-row" key={link.id}><div><span>PERSONAL VINCULADO</span><strong>{link.personalName||'Nome indisponível'}</strong>{link.status==='inativo'&&<p>Cadastro inativo. Encerre o vínculo para revogar os acessos que ainda dependem dele.</p>}{!link.personalName&&<p>Atualize para conferir o nome antes de desvincular.</p>}</div><button data-student-unlink={link.id} className="ab-secondary-action ab-unlink-action" disabled={!link.personalName} onClick={()=>{setSelected(link);setNotice('');setError('');}}>Desvincular</button></div>)}
    </>}
    {notice&&<p role="status">{notice}</p>}
    {error&&<><p className="ab-form-error" role="alert">{error}</p><p>Seu histórico não foi alterado por esta tela. Se a resposta se perdeu, confira o vínculo antes de repetir.</p><div className="ab-link-actions"><button className="ab-secondary-action" disabled={busy} onClick={()=>{setSelected(null);refresh();}}>Conferir vínculos</button><button className="ab-secondary-action" disabled={busy} onClick={onLogin}>Entrar novamente</button></div></>}
  </section>;
}
