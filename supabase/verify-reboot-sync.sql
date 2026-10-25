-- Transactional fixtures: no test journal or photo is left behind.
begin;
do $$
declare before_kiyo bigint; before_shiori bigint; rev bigint; result jsonb; original jsonb;
begin
 select count(*) into before_kiyo from public.kiyo_learning_records;
 select count(*) into before_shiori from public.shiori_learning_records;
 select revision,document into rev,original from public.reboot_sync_state where owner='gbao.n.vo@gmail.com';
 rev:=coalesce(rev,0);
 result:=public.reboot_sync_write(rev,'{"schema":1,"goals":[],"test":"rollback-only"}'::jsonb);
 if (result->>'revision')::bigint<>rev+1 then raise exception 'Revision failed';end if;
 result:=public.reboot_sync_write(rev,'{"schema":1,"goals":[],"test":"stale"}'::jsonb);
 if result->>'conflict'<>'true' then raise exception 'Stale writer overwrote state';end if;
 if (select count(*) from public.kiyo_learning_records)<>before_kiyo or (select count(*) from public.shiori_learning_records)<>before_shiori then raise exception 'Cross-app mutation';end if;
 if has_table_privilege('anon','public.reboot_sync_state','select') or has_table_privilege('authenticated','public.reboot_sync_state','select') then raise exception 'Client table access';end if;
 if has_function_privilege('anon','public.reboot_sync_write(bigint,jsonb)','execute') or has_function_privilege('authenticated','public.reboot_sync_write(bigint,jsonb)','execute') then raise exception 'Client RPC access';end if;
 if not exists(select 1 from storage.buckets where id='reboot-photos' and public=false) then raise exception 'Photo bucket is public or missing';end if;
end $$;
rollback;
select 'passed: stale-write rejection, client denial, private bucket, Shiori/Kiyo isolation; fixtures rolled back' as verification,
 (select count(*) from public.reboot_sync_state) as reboot_accounts,
 (select count(*) from public.kiyo_learning_records) as kiyo_records,
 (select count(*) from public.shiori_learning_records) as shiori_records;
