-- Additive migration for the existing Shiori project. No Shiori/Kiyo objects change.
begin;
create table if not exists public.reboot_sync_state (
 owner text primary key check (owner = 'gbao.n.vo@gmail.com'),
 revision bigint not null default 0,
 document jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.reboot_sync_versions (
 owner text not null check (owner = 'gbao.n.vo@gmail.com'),
 revision bigint not null,
 document jsonb not null,
 created_at timestamptz not null default now(),
 primary key(owner, revision)
);
alter table public.reboot_sync_state enable row level security;
alter table public.reboot_sync_versions enable row level security;
revoke all on public.reboot_sync_state, public.reboot_sync_versions from public, anon, authenticated;
grant select, insert, update, delete on public.reboot_sync_state, public.reboot_sync_versions to service_role;

create or replace function public.reboot_sync_write(expected_revision bigint, new_document jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare current_row public.reboot_sync_state;
begin
 if expected_revision is null or expected_revision < 0 or jsonb_typeof(new_document) <> 'object'
   or new_document->>'schema' is distinct from '1'
   or jsonb_typeof(new_document->'goals') is distinct from 'array'
 then raise exception 'Invalid Reboot document'; end if;
 insert into public.reboot_sync_state(owner) values ('gbao.n.vo@gmail.com') on conflict do nothing;
 select * into current_row from public.reboot_sync_state where owner='gbao.n.vo@gmail.com' for update;
 if current_row.revision <> expected_revision then
  return jsonb_build_object('conflict',true,'revision',current_row.revision);
 end if;
 if current_row.document is not null then
  insert into public.reboot_sync_versions(owner,revision,document)
   values(current_row.owner,current_row.revision,current_row.document) on conflict do nothing;
 end if;
 update public.reboot_sync_state set revision=revision+1,document=new_document,updated_at=now()
  where owner=current_row.owner returning * into current_row;
 -- Twenty previous cloud revisions; photos are immutable and stored separately.
 delete from public.reboot_sync_versions where owner=current_row.owner and revision<current_row.revision-20;
 return jsonb_build_object('revision',current_row.revision,'updatedAt',current_row.updated_at);
end $$;
revoke all on function public.reboot_sync_write(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.reboot_sync_write(bigint,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('reboot-photos','reboot-photos',false,3145728,array['image/png','image/jpeg','image/webp'])
 on conflict(id) do nothing;
commit;
