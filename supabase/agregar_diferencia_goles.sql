alter table public.jugadores
add column if not exists diferencia_goles integer not null default 0;

update public.jugadores
set diferencia_goles = 0
where diferencia_goles is null;
