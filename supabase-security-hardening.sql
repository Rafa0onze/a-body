-- A-BODY: endurecimento idempotente de RLS e exclusão LGPD.
begin;

-- Registro auditável do consentimento para documentos sensíveis de saúde.
alter table public.documentos_saude
  add column if not exists consentimento jsonb;
alter table public.documentos_saude
  drop constraint if exists documentos_saude_consentimento_valido;
alter table public.documentos_saude
  add constraint documentos_saude_consentimento_valido check (
    aluno_id is null or (
      consentimento->>'confirmado'='true'
      and consentimento ? 'confirmadoEm'
      and consentimento ? 'finalidade'
      and consentimento ? 'versao'
    )
  ) not valid;

-- Corrige eventual legado duplicado e garante um único plano ativo por aluno,
-- inclusive sob duas publicações concorrentes.
with ranked as (
  select id, row_number() over(partition by aluno_id order by atualizado_em desc nulls last, id desc) pos
  from public.treinos_alunos where ativo=true
)
update public.treinos_alunos set ativo=false
where id in (select id from ranked where pos>1);
create unique index if not exists treinos_alunos_um_ativo_por_aluno
  on public.treinos_alunos(aluno_id) where ativo=true;

-- Todas as tabelas de negócio continuam protegidas mesmo quando consultadas
-- por papéis que não são proprietários da tabela.
do $$
declare t text;
begin
  foreach t in array array[
    'agenda','alunos','aulas','avaliacoes_alunos','checkins','convites',
    'documentos','documentos_saude','eventos','exercicios','exercicios_custom',
    'ia_usage','mensagens','profiles','profissionais','sugestoes_exercicios',
    'treinos_alunos','user_data'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Elimina regras antigas de mensagens que comparavam aluno_id diretamente
-- com auth.uid(), embora aluno_id referencie public.alunos.id.
drop policy if exists msg_ins on public.mensagens;
drop policy if exists msg_sel on public.mensagens;
drop policy if exists msg_upd on public.mensagens;

drop policy if exists msgs_aluno_update on public.mensagens;
create policy msgs_aluno_update on public.mensagens for update to authenticated
  using (exists (select 1 from public.alunos a where a.id=mensagens.aluno_id and a.user_id=auth.uid()))
  with check (exists (select 1 from public.alunos a where a.id=mensagens.aluno_id and a.user_id=auth.uid()));

-- A política de profiles anterior consultava a própria tabela sob RLS.
create or replace function public.can_access_profile(target_user uuid)
returns boolean language sql stable security definer
set search_path=public,pg_temp
as $$
  select target_user=auth.uid()
    or exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.personal_id=target_user)
    or exists(select 1 from public.profiles p where p.user_id=target_user and p.personal_id=auth.uid());
$$;
revoke all on function public.can_access_profile(uuid) from public;
grant execute on function public.can_access_profile(uuid) to authenticated;

drop policy if exists profiles_sel on public.profiles;
create policy profiles_sel on public.profiles for select to authenticated
  using (public.can_access_profile(user_id));

-- Restringe políticas públicas de escrita a payloads mínimos e coerentes.
drop policy if exists "Inserção pública de eventos" on public.eventos;
drop policy if exists eventos_insert_limitado on public.eventos;
create policy eventos_insert_limitado on public.eventos for insert to anon,authenticated
  with check (
    length(anon_id) between 8 and 128
    and length(evento) between 1 and 80
    and (user_id is null or user_id=auth.uid())
    and pg_column_size(coalesce(props,'{}'::jsonb)) <= 4096
  );

drop policy if exists "Inserção pública de sugestões" on public.sugestoes_exercicios;
drop policy if exists sugestoes_insert_limitado on public.sugestoes_exercicios;
create policy sugestoes_insert_limitado on public.sugestoes_exercicios for insert to anon,authenticated
  with check (length(btrim(nome)) between 2 and 120);

drop policy if exists "usuarios acessam apenas seus dados" on public.user_data;
drop policy if exists user_data_proprio on public.user_data;
create policy user_data_proprio on public.user_data for all to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Nenhum cliente altera diretamente a contagem. A função de quota existente
-- continua sendo o único caminho de escrita autorizado.
revoke all on public.ia_usage from anon,authenticated;

-- Exclusão integral iniciada pelo próprio titular. Remove objetos privados,
-- dados B2C/B2B e por último a identidade Auth. As deleções relacionadas a
-- alunos também acionam os cascades existentes.
create or replace function public.delete_my_account()
returns void language plpgsql security definer
set search_path=public,auth,storage,pg_temp
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication required'; end if;

  delete from storage.objects
   where bucket_id in ('fotos-corporais','documentos-saude','documentos','perfil-fotos','perfis')
     and (storage.foldername(name))[1]=uid::text;

  delete from public.documentos_saude where dono_user_id=uid;
  delete from public.avaliacoes_alunos where personal_id=uid;
  delete from public.treinos_alunos where personal_id=uid;
  delete from public.exercicios_custom where personal_id=uid;
  delete from public.aulas where personal_id=uid;
  delete from public.agenda where personal_id=uid;
  delete from public.mensagens where personal_id=uid;
  delete from public.alunos where personal_id=uid or user_id=uid;
  delete from public.documentos where user_id=uid;
  delete from public.eventos where user_id=uid;
  delete from public.ia_usage where user_id=uid;
  delete from public.user_data where user_id=uid;
  delete from public.profissionais where user_id=uid;
  delete from public.profiles where user_id=uid;
  delete from auth.users where id=uid;
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- Publicação atômica e versionada: mantém versões anteriores inativas e
-- impede que um profissional publique para aluno de outra carteira.
create or replace function public.publicar_treino_aluno(
  p_aluno_id uuid, p_plano jsonb, p_treino_origem uuid default null
) returns public.treinos_alunos
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); novo public.treinos_alunos;
begin
  if uid is null or not exists(select 1 from public.alunos where id=p_aluno_id and personal_id=uid)
    then raise exception 'student access denied'; end if;
  if jsonb_typeof(p_plano) <> 'object' or jsonb_array_length(coalesce(p_plano->'weekDays','[]'::jsonb))=0
    then raise exception 'invalid workout plan'; end if;
  update public.treinos_alunos set ativo=false where aluno_id=p_aluno_id and personal_id=uid and ativo=true;
  insert into public.treinos_alunos(aluno_id,personal_id,plano,ativo,atualizado_em)
    values(p_aluno_id,uid,p_plano,true,now()) returning * into novo;
  return novo;
end;
$$;
revoke all on function public.publicar_treino_aluno(uuid,jsonb,uuid) from public;
grant execute on function public.publicar_treino_aluno(uuid,jsonb,uuid) to authenticated;

commit;
