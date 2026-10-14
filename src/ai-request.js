const CONNECTION_MESSAGE='A conexão foi interrompida antes de recebermos a resposta da IA. Confira sua conexão e tente novamente.';
function failure(message,code,status,requestId){const error=new Error(message);error.code=code;error.status=status;if(/^[0-9a-f-]{36}$/i.test(requestId||''))error.requestId=requestId;return error;}
export async function requestAI(body,token,{fetchImpl=fetch}={}){
  if(!token)throw failure('Faça login para usar a geração por IA.','AUTH_REQUIRED',401);
  let response;
  try{response=await fetchImpl('/api/openai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({...body,keep_alive:true})});}
  catch{throw failure(CONNECTION_MESSAGE,'AI_CONNECTION_LOST');}
  const requestId=response.headers.get('x-request-id');
  if(response.status===401)throw failure('Sua sessão expirou. Entre novamente para usar a IA.','AUTH_EXPIRED',401,requestId);
  let data;
  try{data=await response.json();}
  catch(error){if(error instanceof TypeError)throw failure(CONNECTION_MESSAGE,'AI_CONNECTION_LOST',response.status,requestId);throw failure(response.ok?'A IA retornou uma resposta incompleta. Tente novamente.':'O serviço de geração está temporariamente indisponível. Tente novamente.','AI_INVALID_RESPONSE',response.status,requestId);}
  if(data?.error||!response.ok)throw failure(data?.error?.message||'Não foi possível concluir a geração. Tente novamente.',data?.error?.code||'AI_UNAVAILABLE',response.status,data?.error?.requestId||requestId);
  if(!Array.isArray(data?.content)||!data.content.some(part=>part?.type==='text'&&typeof part.text==='string'))throw failure('A IA retornou uma resposta incompleta. Tente novamente.','AI_INVALID_RESPONSE',response.status,requestId);
  return data;
}
