-- Demo family for testing the pipeline. Run after schema.sql.
-- Invite page: /invite/00000000-0000-0000-0000-000000000001

insert into families (id, name, storyteller_name, birth_year) values
  ('00000000-0000-0000-0000-000000000001', 'The Lin Family', 'Mei-Ling Lin', 1958)
on conflict (id) do nothing;

insert into life_stages (id, family_id, label, place, start_year, end_year, lived_with, school_or_work, sort_order) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'Childhood in Tainan', 'Tainan, Taiwan', 1958, 1968, 'parents, grandmother, and about 20 cousins nearby', 'elementary school', 1),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001', 'Teen years on Zhongshan Road', 'Taipei, Taiwan', 1968, 1976, 'parents and two brothers', 'girls'' high school', 2),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000001', 'Moving to California', 'San Jose, California', 1982, 1995, 'husband and kids', 'accountant', 3)
on conflict (id) do nothing;

insert into people (family_id, name, nicknames, relationship, notes) values
  ('00000000-0000-0000-0000-000000000001', 'Lin Ming-Hui', '{Ah-Ming}', 'oldest cousin', 'left the family around the early 1970s'),
  ('00000000-0000-0000-0000-000000000001', 'Chen Shu-Fen', '{Ah-Ma, Grandma}', 'paternal grandmother', null),
  ('00000000-0000-0000-0000-000000000001', 'Lin Wei', '{Ah-Wei}', 'younger brother', null);
