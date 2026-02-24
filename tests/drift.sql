-- Introduce drift to be repaired by reconcile.
update person set email = 'ada@wrong.invalid' where id = 1;
insert into person(id, name, email) values
  (3, 'Grace Hopper', 'grace@example.invalid')
on conflict do nothing;
