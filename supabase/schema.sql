-- =====================================================================
--  MES RECETTES — Schéma Supabase complet
--  À exécuter UNE fois dans : Supabase > SQL Editor > New query > Run
--  (ré-exécutable sans casse : les objets existants sont ignorés/remplacés)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------
create or replace function public.random_code(len int default 8)
returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, len);
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Espaces partagés ("instances") : couple, famille…
-- ---------------------------------------------------------------------
create table if not exists public.households (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 1 and 60),
  invite_code        text not null unique default public.random_code(8),
  telegram_link_code text not null unique default public.random_code(6),
  created_by         uuid references auth.users(id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Moi',
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists household_members_user_idx on public.household_members(user_id);

-- Est-ce que l'utilisateur connecté fait partie de l'espace ?
create or replace function public.is_member(hid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- Recettes
-- ingredients : [{ "name": "oignon", "quantity": 2, "unit": "piece", "section": "fruits_legumes", "note": "émincé" }]
-- steps       : ["Étape 1…", "Étape 2…"]
-- ---------------------------------------------------------------------
create table if not exists public.recipes (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households(id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 200),
  description       text not null default '',
  category          text not null default 'plat',
  difficulty        text check (difficulty in ('facile', 'moyen', 'difficile')),
  prep_minutes      int check (prep_minutes >= 0),
  cook_minutes      int check (cook_minutes >= 0),
  servings          int not null default 2 check (servings between 1 and 50),
  diets             text[] not null default '{}',
  rating            smallint check (rating between 1 and 5),
  ingredients       jsonb not null default '[]'::jsonb,
  steps             jsonb not null default '[]'::jsonb,
  tips              text not null default '',
  image_path        text,
  source_url        text,
  source_author     text,
  source_caption    text,
  source_transcript text,
  created_by        uuid references auth.users(id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists recipes_household_idx on public.recipes(household_id, created_at desc);

drop trigger if exists recipes_touch on public.recipes;
create trigger recipes_touch before update on public.recipes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Liste de courses (persistante, partagée en temps réel)
-- status : todo = à acheter | done = dans le panier | missing = introuvable
-- quantity/unit stockés en unité de base (g, ml, piece…) pour pouvoir additionner
-- ---------------------------------------------------------------------
create table if not exists public.shopping_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  quantity      numeric,
  unit          text not null default '',
  note          text not null default '',
  section       text not null default 'autre',
  status        text not null default 'todo' check (status in ('todo', 'done', 'missing')),
  source        text not null default 'custom' check (source in ('recipe', 'catalog', 'custom')),
  recipe_titles text[] not null default '{}',
  added_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists shopping_items_household_idx on public.shopping_items(household_id);

drop trigger if exists shopping_touch on public.shopping_items;
create trigger shopping_touch before update on public.shopping_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Telegram : quel chat alimente quel espace
-- ---------------------------------------------------------------------
create table if not exists public.telegram_links (
  chat_id           bigint primary key,
  household_id      uuid not null references public.households(id) on delete cascade,
  telegram_username text,
  linked_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- File d'attente des imports Instagram (alimentée par le bot, vidée par n8n)
-- ---------------------------------------------------------------------
create table if not exists public.import_queue (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  chat_id      bigint,
  url          text not null,
  status       text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  attempts     int not null default 0,
  error        text,
  recipe_id    uuid references public.recipes(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  claimed_at   timestamptz,
  unique (household_id, url)
);
create index if not exists import_queue_status_idx on public.import_queue(status, created_at);

drop trigger if exists import_queue_touch on public.import_queue;
create trigger import_queue_touch before update on public.import_queue
  for each row execute function public.touch_updated_at();

-- =====================================================================
--  SÉCURITÉ : Row Level Security (chacun ne voit que ses espaces)
-- =====================================================================
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes           enable row level security;
alter table public.shopping_items    enable row level security;
alter table public.telegram_links    enable row level security;
alter table public.import_queue      enable row level security;

-- households : lecture + renommage par les membres (création via RPC)
drop policy if exists hh_select on public.households;
create policy hh_select on public.households for select to authenticated using (public.is_member(id));
drop policy if exists hh_update on public.households;
create policy hh_update on public.households for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));

-- household_members : voir les membres de ses espaces, modifier/quitter soi-même
drop policy if exists hm_select on public.household_members;
create policy hm_select on public.household_members for select to authenticated using (public.is_member(household_id));
drop policy if exists hm_update on public.household_members;
create policy hm_update on public.household_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists hm_delete on public.household_members;
create policy hm_delete on public.household_members for delete to authenticated using (user_id = auth.uid());

-- recipes / shopping_items : tout pour les membres
drop policy if exists recipes_all on public.recipes;
create policy recipes_all on public.recipes for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
drop policy if exists shopping_all on public.shopping_items;
create policy shopping_all on public.shopping_items for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- telegram_links : voir / délier
drop policy if exists tl_select on public.telegram_links;
create policy tl_select on public.telegram_links for select to authenticated using (public.is_member(household_id));
drop policy if exists tl_delete on public.telegram_links;
create policy tl_delete on public.telegram_links for delete to authenticated using (public.is_member(household_id));

-- import_queue : voir, relancer, supprimer (insertion uniquement par le bot)
drop policy if exists iq_select on public.import_queue;
create policy iq_select on public.import_queue for select to authenticated using (public.is_member(household_id));
drop policy if exists iq_update on public.import_queue;
create policy iq_update on public.import_queue for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
drop policy if exists iq_delete on public.import_queue;
create policy iq_delete on public.import_queue for delete to authenticated using (public.is_member(household_id));

-- Droits par colonne : empêche de "changer d'espace" en modifiant un household_id
revoke all on public.households, public.household_members, public.telegram_links, public.import_queue from anon;
revoke all on public.recipes, public.shopping_items from anon;

revoke insert, update on public.households from authenticated;
grant select on public.households to authenticated;
grant update (name) on public.households to authenticated;

revoke insert, update on public.household_members from authenticated;
grant select, delete on public.household_members to authenticated;
grant update (display_name) on public.household_members to authenticated;

revoke insert, update on public.telegram_links from authenticated;
grant select, delete on public.telegram_links to authenticated;

revoke insert, update on public.import_queue from authenticated;
grant select, delete on public.import_queue to authenticated;
grant update (status, attempts, error) on public.import_queue to authenticated;

grant select, insert, update, delete on public.recipes, public.shopping_items to authenticated;

-- =====================================================================
--  FONCTIONS appelées par l'app (RPC)
-- =====================================================================
create or replace function public.create_household(p_name text, p_display_name text)
returns public.households language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  insert into public.households(name, created_by)
    values (left(trim(p_name), 60), auth.uid()) returning * into h;
  insert into public.household_members(household_id, user_id, display_name, role)
    values (h.id, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Moi'), 'owner');
  return h;
end $$;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select id into hid from public.households where invite_code = upper(trim(p_code));
  if hid is null then raise exception 'Code d''invitation invalide'; end if;
  insert into public.household_members(household_id, user_id, display_name)
    values (hid, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Moi'))
    on conflict (household_id, user_id) do update set display_name = excluded.display_name;
  return hid;
end $$;

create or replace function public.regenerate_codes(p_household uuid)
returns public.households language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if not public.is_member(p_household) then raise exception 'Accès refusé'; end if;
  update public.households
    set invite_code = public.random_code(8), telegram_link_code = public.random_code(6)
    where id = p_household returning * into h;
  return h;
end $$;

-- =====================================================================
--  FONCTIONS appelées par n8n (clé service_role uniquement)
-- =====================================================================
-- Réserve atomiquement les prochains imports (évite les doublons si 2 exécutions se chevauchent).
-- Reprend aussi les jobs restés "processing" > 30 min (PC éteint en plein traitement).
create or replace function public.claim_import_jobs(p_limit int default 3)
returns setof public.import_queue language sql security definer set search_path = public as $$
  update public.import_queue q
     set status = 'processing', attempts = q.attempts + 1, claimed_at = now()
   where q.id in (
     select iq.id from public.import_queue iq
      where iq.attempts < 5
        and (iq.status = 'pending'
             or (iq.status = 'processing' and iq.claimed_at < now() - interval '30 minutes'))
      order by iq.created_at
      limit p_limit
      for update skip locked)
  returning q.*;
$$;

-- Échec : on remet en file jusqu'à 3 tentatives, puis statut "error".
create or replace function public.fail_import_job(p_id uuid, p_error text, p_final boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.import_queue;
begin
  update public.import_queue
     set status = case when p_final or attempts >= 3 then 'error' else 'pending' end,
         error  = left(coalesce(p_error, 'Erreur inconnue'), 1000)
   where id = p_id
  returning * into r;
  if r.id is null then return jsonb_build_object('status', null); end if;
  return jsonb_build_object('status', r.status, 'chat_id', r.chat_id, 'url', r.url,
                            'attempts', r.attempts, 'error', left(coalesce(p_error, ''), 300));
end $$;

revoke execute on function public.create_household(text, text)  from public, anon;
revoke execute on function public.join_household(text, text)    from public, anon;
revoke execute on function public.regenerate_codes(uuid)        from public, anon;
grant  execute on function public.create_household(text, text)  to authenticated;
grant  execute on function public.join_household(text, text)    to authenticated;
grant  execute on function public.regenerate_codes(uuid)        to authenticated;

revoke execute on function public.claim_import_jobs(int)               from public, anon, authenticated;
revoke execute on function public.fail_import_job(uuid, text, boolean) from public, anon, authenticated;
grant  execute on function public.claim_import_jobs(int)               to service_role;
grant  execute on function public.fail_import_job(uuid, text, boolean) to service_role;

-- =====================================================================
--  STOCKAGE DES IMAGES
--  Bucket public en lecture (URL non devinables), écriture réservée aux membres.
--  Chemin des fichiers : <household_id>/<recipe_id>-<timestamp>.jpg
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "recipe images insert" on storage.objects;
create policy "recipe images insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images'
              and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "recipe images select" on storage.objects;
create policy "recipe images select" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-images'
         and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "recipe images update" on storage.objects;
create policy "recipe images update" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images'
         and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "recipe images delete" on storage.objects;
create policy "recipe images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images'
         and public.is_member(((storage.foldername(name))[1])::uuid));

-- =====================================================================
--  TEMPS RÉEL (liste de courses synchronisée entre membres)
-- =====================================================================
do $$
begin
  begin alter publication supabase_realtime add table public.shopping_items; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.import_queue;   exception when duplicate_object then null; end;
end $$;
