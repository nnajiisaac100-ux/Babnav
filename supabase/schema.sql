-- Babnav class timetables. Run this once in Supabase: SQL Editor > New query > paste > Run.
-- No student accounts and no personal data. A class has a JOIN code (shared with
-- classmates) and a secret EDIT code (only the class rep keeps it).
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  edit_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  course text not null,
  title text,
  day int not null check (day between 1 and 7),          -- 1 = Monday
  start_min int not null check (start_min between 0 and 1439),
  end_min int not null check (end_min between 1 and 1440),
  place_id text,                                           -- an id from js/data.js
  room text,
  status text not null default 'normal' check (status in ('normal','changed','cancelled')),
  note text,
  updated_at timestamptz not null default now()
);

-- Nobody can read or write the tables directly. Everything goes through the functions below.
alter table public.classes enable row level security;
alter table public.slots enable row level security;

create or replace function public.create_class(p_name text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_code text; v_edit text;
begin
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Give the class a name'; end if;
  loop
    v_code := upper(substr(translate(encode(gen_random_bytes(9),'base64'),'+/=Il0O1',''),1,6));
    exit when length(v_code) = 6 and not exists (select 1 from classes where code = v_code);
  end loop;
  v_edit := upper(substr(translate(encode(gen_random_bytes(12),'base64'),'+/=Il0O1',''),1,8));
  insert into classes(code, name, edit_hash) values (v_code, trim(p_name), crypt(v_edit, gen_salt('bf')));
  return json_build_object('code', v_code, 'edit_code', v_edit, 'name', trim(p_name));
end $$;

create or replace function public.get_class(p_code text) returns json
language sql security definer set search_path = public, extensions as $$
  select json_build_object(
    'code', c.code, 'name', c.name,
    'slots', coalesce((select json_agg(s order by s.day, s.start_min) from slots s where s.class_id = c.id), '[]'::json))
  from classes c where c.code = upper(trim(p_code));
$$;

create or replace function public.save_slot(p_code text, p_edit text, p_slot json) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare c classes; v_id uuid;
begin
  select * into c from classes where code = upper(trim(p_code));
  if not found or c.edit_hash <> crypt(p_edit, c.edit_hash) then raise exception 'Wrong edit code'; end if;
  if (p_slot->>'end_min')::int <= (p_slot->>'start_min')::int then raise exception 'End time must be after start time'; end if;
  v_id := nullif(p_slot->>'id','')::uuid;
  if v_id is null then
    insert into slots(class_id, course, title, day, start_min, end_min, place_id, room, status, note)
    values (c.id, trim(p_slot->>'course'), p_slot->>'title', (p_slot->>'day')::int, (p_slot->>'start_min')::int,
            (p_slot->>'end_min')::int, p_slot->>'place_id', p_slot->>'room', coalesce(p_slot->>'status','normal'), p_slot->>'note');
  else
    update slots set course = trim(p_slot->>'course'), title = p_slot->>'title', day = (p_slot->>'day')::int,
      start_min = (p_slot->>'start_min')::int, end_min = (p_slot->>'end_min')::int, place_id = p_slot->>'place_id',
      room = p_slot->>'room', status = coalesce(p_slot->>'status','normal'), note = p_slot->>'note', updated_at = now()
    where id = v_id and class_id = c.id;
  end if;
end $$;

create or replace function public.delete_slot(p_code text, p_edit text, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare c classes;
begin
  select * into c from classes where code = upper(trim(p_code));
  if not found or c.edit_hash <> crypt(p_edit, c.edit_hash) then raise exception 'Wrong edit code'; end if;
  delete from slots where id = p_id and class_id = c.id;
end $$;

grant execute on function public.create_class(text), public.get_class(text),
  public.save_slot(text, text, json), public.delete_slot(text, text, uuid) to anon;
