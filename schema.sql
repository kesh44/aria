-- already applied if you finished setup step C.
-- kept here as a reference for a fresh database.

create table if not exists foods (
  id text primary key,
  name text not null unique,
  c100 double precision not null,
  portion double precision
);

create table if not exists icr_history (
  id text primary key,
  "from" timestamptz not null,
  icr double precision not null,
  note text
);

create table if not exists calc_log (
  id text primary key,
  t timestamptz not null,
  food text,
  c100 double precision not null,
  g double precision not null,
  carbs double precision not null,
  icr double precision not null,
  u double precision not null,
  note text
);

create table if not exists rate_limit (
  key text primary key,
  last_at timestamptz not null
);
