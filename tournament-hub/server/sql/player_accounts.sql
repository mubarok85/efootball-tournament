create extension if not exists pgcrypto;


create table if not exists player_accounts (

  id uuid
    primary key
    default gen_random_uuid(),

  global_player_id uuid
    unique,

  full_name varchar(80)
    not null,

  username varchar(30)
    not null,

  email varchar(160)
    not null,

  password_salt varchar(128)
    not null,

  password_hash varchar(256)
    not null,

  approval_status varchar(20)
    not null
    default 'pending'
    check (
      approval_status in (
        'pending',
        'approved',
        'rejected',
        'suspended'
      )
    ),

  profile_photo bytea,

  profile_photo_mime varchar(50),

  approved_by varchar(100),

  approved_at timestamptz,

  last_login_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create unique index if not exists
player_accounts_email_unique
on player_accounts (
  lower(email)
);


create unique index if not exists
player_accounts_username_unique
on player_accounts (
  lower(username)
);


create index if not exists
player_accounts_status_idx
on player_accounts (
  approval_status,
  created_at desc
);


create table if not exists player_sessions (

  id uuid
    primary key
    default gen_random_uuid(),

  account_id uuid
    not null
    references player_accounts(id)
    on delete cascade,

  token_hash varchar(64)
    not null
    unique,

  expires_at timestamptz
    not null,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
player_sessions_account_idx
on player_sessions (
  account_id
);


create index if not exists
player_sessions_expiry_idx
on player_sessions (
  expires_at
);
