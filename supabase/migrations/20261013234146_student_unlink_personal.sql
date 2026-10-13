-- Student-owned unlink: approved and validated against isolated Supabase/JWT/RLS/Storage/concurrency tests.
begin;
alter table public.alunos alter column personal_id drop not null;
alter table public.alunos add column personal_desvinculado_id uuid references auth.users(id) on delete set null;
alter table public.alunos add column desvinculado_em timestamptz;

-- Um personal não pode religar o aluno criando outra linha com user_id conhecido.
-- Somente os fluxos de aceite autenticado/RPC verificados atribuem outro usuário.
create function public.proteger_vinculacao_aluno() returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op='INSERT' then
      if new.user_id is not null and new.user_id<>auth.uid() then raise exception 'student consent required' using errcode='42501'; end if;
    elsif new.user_id is distinct from old.user_id or new.personal_desvinculado_id is distinct from old.personal_desvinculado_id or new.desvinculado_em is distinct from old.desvinculado_em then
      raise exception 'relationship assignment requires verified consent' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger alunos_proteger_vinculacao before insert or update on public.alunos for each row execute function public.proteger_vinculacao_aluno();
revoke all on function public.proteger_vinculacao_aluno() from public,anon,authenticated;

create function public.personal_tem_vinculo(p_aluno_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(
    select 1 from public.alunos a where a.id=p_aluno_id
      and a.personal_id=auth.uid());
$$;
revoke all on function public.personal_tem_vinculo(uuid) from public,anon;
grant execute on function public.personal_tem_vinculo(uuid) to authenticated;

alter policy treinos_do_personal on public.treinos_alunos
  using (personal_id=auth.uid() and public.personal_tem_vinculo(aluno_id))
  with check (personal_id=auth.uid() and public.personal_tem_vinculo(aluno_id));
alter policy aval_do_personal on public.avaliacoes_alunos
  using (personal_id=auth.uid() and public.personal_tem_vinculo(aluno_id))
  with check (personal_id=auth.uid() and public.personal_tem_vinculo(aluno_id));
alter policy aulas_do_personal on public.aulas
  using (personal_id=auth.uid() and (aluno_id is null or public.personal_tem_vinculo(aluno_id)))
  with check (personal_id=auth.uid() and (aluno_id is null or public.personal_tem_vinculo(aluno_id)));
alter policy agenda_personal on public.agenda
  using (personal_id=auth.uid() and (aluno_id is null or exists(select 1 from public.alunos a where a.user_id=agenda.aluno_id and a.personal_id=auth.uid())))
  with check (personal_id=auth.uid() and (aluno_id is null or exists(select 1 from public.alunos a where a.user_id=agenda.aluno_id and a.personal_id=auth.uid())));

create function public.desvincular_meu_personal(p_aluno_id uuid,p_personal_id uuid,p_current_plan_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid:=auth.uid(); a public.alunos; remaining integer; retained jsonb; source_plan jsonb;
begin
  if uid is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_personal_id is null or p_personal_id=uid then raise exception 'not an external trainer link' using errcode='22023'; end if;
  -- Serializa duas desvinculações da mesma conta, inclusive quando profiles não existe.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  select * into a from public.alunos where id=p_aluno_id and user_id=uid for update;
  if not found then raise exception 'student access denied' using errcode='42501'; end if;
  if a.personal_id is null then
    if a.personal_desvinculado_id is distinct from p_personal_id then raise exception 'link changed' using errcode='PT409'; end if;
  elsif a.personal_id<>p_personal_id then
    raise exception 'link changed' using errcode='PT409';
  else
    if p_current_plan_id is not null then
      select plano into source_plan from public.treinos_alunos
        where id=p_current_plan_id and aluno_id=a.id and personal_id=p_personal_id;
      if not found then raise exception 'plan changed' using errcode='PT409'; end if;
    end if;
    update public.alunos set personal_id=null,status='inativo',personal_desvinculado_id=p_personal_id,desvinculado_em=now() where id=a.id;
    update public.treinos_alunos set ativo=false where aluno_id=a.id and personal_id=p_personal_id and ativo;
    -- Invalida convites pendentes sem excluir registro ou token histórico.
    update public.convites set expira_em=least(expira_em,now()) where aluno_id=a.id and usado_em is null;
  end if;
  select count(*) into remaining from public.alunos where user_id=uid and personal_id is not null and personal_id<>uid;
  if not exists(select 1 from public.alunos where user_id=uid and personal_id=p_personal_id) then
    update public.profiles set personal_id=null where user_id=uid and personal_id=p_personal_id;
  end if;
  if remaining=0 or source_plan is not null then
    insert into public.user_data(user_id,key,value)
      select uid,'abody:plan-before-unlink:'||a.id::text,value from public.user_data
      where user_id=uid and key='abody:plan'
      on conflict(user_id,key) do nothing;
    -- Preserva o plano visível validado no servidor; a versão original não é modificada.
    if source_plan is not null then
      retained=source_plan || jsonb_build_object('locked',remaining>0);
      insert into public.user_data(user_id,key,value) values(uid,'abody:plan',retained)
        on conflict(user_id,key) do update set value=excluded.value,updated_at=now();
    else
      update public.user_data set value=value || '{"locked":false}'::jsonb,updated_at=now()
        where user_id=uid and key='abody:plan' and jsonb_typeof(value)='object';
      select value into retained from public.user_data where user_id=uid and key='abody:plan';
    end if;
  end if;
  return jsonb_build_object('ok',true,'aluno_id',a.id,'personal_id',p_personal_id,'remaining_links',remaining,'plan',retained);
end;
$$;
revoke all on function public.desvincular_meu_personal(uuid,uuid,uuid) from public,anon;
grant execute on function public.desvincular_meu_personal(uuid,uuid,uuid) to authenticated;

-- Substitui a checagem sem lock: publicação e desvinculação usam a mesma linha.
create or replace function public.publicar_treino_aluno(p_aluno_id uuid,p_plano jsonb,p_treino_origem uuid default null)
returns public.treinos_alunos language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.alunos; novo public.treinos_alunos;
begin
  select * into a from public.alunos where id=p_aluno_id and personal_id=uid for update;
  if uid is null or not found then raise exception 'student access denied' using errcode='42501'; end if;
  if jsonb_typeof(p_plano)<>'object' or jsonb_array_length(coalesce(p_plano->'weekDays','[]'::jsonb))=0 then raise exception 'invalid workout plan'; end if;
  update public.treinos_alunos set ativo=false where aluno_id=p_aluno_id and personal_id=uid and ativo;
  insert into public.treinos_alunos(aluno_id,personal_id,plano,ativo,atualizado_em)
    values(p_aluno_id,uid,p_plano,true,now()) returning * into novo;
  return novo;
end;
$$;

-- Revalida o convite DEPOIS do lock do aluno; um token lido antes do unlink
-- não pode reativar a linha encerrada após esperar pela transação.
create or replace function public.ativar_convite(p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.alunos; c public.convites;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'erro','não autenticado'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  select * into c from public.convites where token=p_token;
  if not found then return jsonb_build_object('ok',false,'erro','convite inválido ou expirado'); end if;
  select * into a from public.alunos where id=c.aluno_id for update;
  select * into c from public.convites where token=p_token and usado_em is null and expira_em>now() for update;
  if not found or a.personal_id is null or (a.user_id is not null and a.user_id<>auth.uid()) then return jsonb_build_object('ok',false,'erro','convite inválido ou expirado'); end if;
  update public.alunos set user_id=auth.uid(),status='ativo' where id=a.id;
  update public.convites set usado_em=now() where token=p_token;
  return jsonb_build_object('ok',true,'aluno_id',a.id,'personal_id',a.personal_id,'nome',a.nome);
end;
$$;
commit;

