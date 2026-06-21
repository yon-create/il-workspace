-- Per-client base schema, applied by provision-client at project creation.
-- Mirrors the proven Infinite Leverage CRM data model:
-- People (deduped by email) + Contacts (inquiry pipeline) + activity_log + Orders.
-- Newsletter = people.ok_to_contact = true (no separate table).

create extension if not exists "uuid-ossp";

create table if not exists people (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  name text not null default '',
  phone text not null default '',
  company text not null default '',
  role text not null default '',
  source_site text not null default '',
  ok_to_contact boolean not null default false,
  attributes jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade,
  type text not null,
  subject text not null default '',
  message text not null default '',
  source text not null default '',
  status text not null default 'new_lead'
    check (status in ('new_lead','contacted','discovery_call','proposal','won','lost')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor text not null default 'admin',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade,
  product_name text not null,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending','paid','refunded','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists contacts_person_id_idx on contacts(person_id);
create index if not exists contacts_status_idx on contacts(status);
create index if not exists contacts_created_at_idx on contacts(created_at desc);
create index if not exists activity_log_contact_id_idx on activity_log(contact_id);
create index if not exists orders_person_id_idx on orders(person_id);
