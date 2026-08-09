-- Tournament creation wizard upgrade.

alter table public.tournaments
add column if not exists logo_url text;

alter table public.tournaments
add column if not exists season text;

alter table public.tournaments
add column if not exists participant_type text
default 'individual';

alter table public.tournaments
add column if not exists number_of_groups integer;

alter table public.tournaments
add column if not exists qualifiers_per_group integer;

alter table public.tournaments
add column if not exists double_round_robin boolean
not null default false;

alter table public.tournaments
add column if not exists two_legged_knockout boolean
not null default false;

-- Convert any tournaments created with our old format values.

update public.tournaments
set format = 'league'
where format = 'round_robin';

update public.tournaments
set format = 'multi_group_tournament'
where format = 'groups_knockout';

-- Replace old format constraint.

alter table public.tournaments
drop constraint if exists tournaments_format_check;

alter table public.tournaments
add constraint tournaments_format_check
check (
  format in (
    'league',
    'multi_group_league',
    'knockout',
    'league_final',
    'league_knockout',
    'multi_group_tournament'
  )
);

alter table public.tournaments
drop constraint if exists tournaments_participant_type_check;

alter table public.tournaments
add constraint tournaments_participant_type_check
check (
  participant_type in (
    'individual',
    'team'
  )
);

alter table public.tournaments
drop constraint if exists tournaments_number_of_groups_check;

alter table public.tournaments
add constraint tournaments_number_of_groups_check
check (
  number_of_groups is null
  or number_of_groups >= 2
);

alter table public.tournaments
drop constraint if exists tournaments_qualifiers_per_group_check;

alter table public.tournaments
add constraint tournaments_qualifiers_per_group_check
check (
  qualifiers_per_group is null
  or qualifiers_per_group >= 1
);
