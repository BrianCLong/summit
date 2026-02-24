create table if not exists person (
  id bigint primary key,
  name text,
  email text
);

create table if not exists knows (
  id bigint primary key,
  from_id bigint references person(id),
  to_id bigint references person(id),
  since date
);

insert into person(id, name, email) values
  (1, 'Ada Lovelace', 'ada@summit.test'),
  (2, 'Alan Turing', 'alan@summit.test')
on conflict do nothing;

insert into knows(id, from_id, to_id, since) values
  (1, 1, 2, '1945-01-01')
on conflict do nothing;
