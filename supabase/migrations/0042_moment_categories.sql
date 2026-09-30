-- Moment categories + 13 new Moment types (2026-09-30, at explicit user
-- request — see CLAUDE.md "Moments" for the full 7-category/17-type
-- model this introduces). Widens the original fixed-4 moments.id check
-- constraint and adds a new moment_categories table + moments.category_id
-- FK. All 13 new moments' venue picks are real, hand-curated from the
-- live Manchester/Cheshire catalog (no algorithmic matching — see this
-- session's own Moments research), sized honestly per real evidence
-- (Quiz Night: only 2 venues genuinely mention a quiz in their own copy).

create table moment_categories (
  id text primary key,
  title text not null,
  sort_order integer not null
);

insert into moment_categories (id, title, sort_order) values
  ('romantic', 'Romantic', 1),
  ('entertaining', 'Entertaining & Business', 2),
  ('sport-spectating', 'Sport & Spectating', 3),
  ('big-nights-out', 'Big Nights Out', 4),
  ('celebrations', 'Celebrations', 5),
  ('everyday', 'Everyday', 6),
  ('weather-led', 'Weather-Led', 7);

alter table moments add column category_id text references moment_categories(id);

update moments set category_id = case id
  when 'date-night' then 'romantic'
  when 'entertaining-a-client' then 'entertaining'
  when 'big-group-of-friends' then 'big-nights-out'
  when 'solo-reset' then 'everyday'
end;

-- Widen the id check constraint from 4 to all 17 real moment ids before
-- inserting the 13 new rows (insert would fail against the old constraint).
alter table moments drop constraint moments_id_check;
alter table moments add constraint moments_id_check check (id in (
  'date-night', 'entertaining-a-client', 'big-group-of-friends', 'solo-reset', 'watch-the-football', 'big-fight-night', 'pub-crawl', 'sunday-session', 'quiz-night', 'birthday-blowout', 'leaving-do', 'hen-stag-send-off', 'after-work-unwind', 'sunday-roast', 'brunch-not-rushed', 'first-sunny-evening', 'cosy-winter-warm-up'
));

alter table moments alter column category_id set not null;

insert into moments (id, title, curator, blurb, category_id) values
  ('watch-the-football', 'Watch the Football', 'JAMES O.', 'A pub built for the ninety minutes — cask in one hand, a clear sightline to the screen in the other.', 'sport-spectating'),
  ('big-fight-night', 'Big Fight Night', 'JAMES O.', 'Late licence, a big room, and a crowd that stays through every undercard.', 'sport-spectating'),
  ('pub-crawl', 'Pub Crawl', 'PRIYA N.', 'One good pub leads to the next one on foot — nobody''s watching the clock.', 'big-nights-out'),
  ('sunday-session', 'Sunday Session', 'PRIYA N.', 'Starts at one, ends whenever someone finally says they should probably eat something.', 'big-nights-out'),
  ('quiz-night', 'Quiz Night', 'PRIYA N.', 'Teams of four, a mic that''s seen better days, and a prize nobody really needed.', 'big-nights-out'),
  ('birthday-blowout', 'Birthday Blowout', 'PRIYA N.', 'A room that says yes to eight people and a cake without checking first.', 'celebrations'),
  ('leaving-do', 'Leaving Do', 'PRIYA N.', 'Easy to drift into straight from the office, easier still to stay past the first round.', 'celebrations'),
  ('hen-stag-send-off', 'Hen & Stag Send-Off', 'PRIYA N.', 'Cocktails, a booth big enough for the whole group, and a night built to be the story afterwards.', 'celebrations'),
  ('after-work-unwind', 'After-Work Unwind', 'ELENA M.', 'Somewhere to put the day down before you decide what''s next.', 'everyday'),
  ('sunday-roast', 'Sunday Roast', 'ELENA M.', 'A kitchen that still treats Sunday lunch as the main event, not a bolt-on.', 'everyday'),
  ('brunch-not-rushed', 'Brunch That Isn''t Rushed', 'ELENA M.', 'Nobody''s turning the table in ninety minutes here.', 'everyday'),
  ('first-sunny-evening', 'First Sunny Evening', 'ELENA M.', 'The first proper beer garden evening of the year, reserved in advance in your head.', 'weather-led'),
  ('cosy-winter-warm-up', 'Cosy Winter Warm-Up', 'ELENA M.', 'A real fire, not a filament bulb pretending to be one.', 'weather-led');

insert into moment_venues (moment_id, venue_id, position) values
  ('watch-the-football', 'the-bubble-room', 0),
  ('watch-the-football', 'the-bubble-room-bramhall', 1),
  ('watch-the-football', 'waters-green-tavern', 2),
  ('watch-the-football', 'the-chorlton-tap', 3),
  ('watch-the-football', 'harcourt', 4),
  ('watch-the-football', 'the-mucky-pup', 5),
  ('watch-the-football', 'the-seven-oaks', 6),
  ('big-fight-night', 'no-8-dukes', 0),
  ('big-fight-night', 'the-underbank', 1),
  ('big-fight-night', 'mint-lounge', 2),
  ('big-fight-night', 'symposium', 3),
  ('big-fight-night', 'diversion-bar-kitchen', 4),
  ('big-fight-night', '20-stories', 5),
  ('pub-crawl', 'folk', 0),
  ('pub-crawl', 'the-drawing-room', 1),
  ('pub-crawl', 'sip-wine-bar', 2),
  ('pub-crawl', 'saison', 3),
  ('pub-crawl', 'rustik', 4),
  ('pub-crawl', 'rose-crown', 5),
  ('pub-crawl', 'dexter-jones', 6),
  ('pub-crawl', 'wallop', 7),
  ('pub-crawl', 'the-blind-pig', 8),
  ('pub-crawl', 'the-beer-house', 9),
  ('pub-crawl', 'the-chorlton-tap', 10),
  ('pub-crawl', 'the-creameries', 11),
  ('pub-crawl', 'plere', 12),
  ('pub-crawl', 'mint-lounge', 13),
  ('pub-crawl', 'blinker', 14),
  ('pub-crawl', 'the-whiskey-jar', 15),
  ('pub-crawl', 'schofield-s', 16),
  ('sunday-session', 'the-beer-house', 0),
  ('sunday-session', 'port-street-beer-house', 1),
  ('sunday-session', 'wilmslow-tavern', 2),
  ('sunday-session', 'rose-crown', 3),
  ('sunday-session', 'folk', 4),
  ('sunday-session', 'the-chiverton-tap', 5),
  ('sunday-session', 'the-mounting-stone', 6),
  ('sunday-session', 'church-inn', 7),
  ('quiz-night', 'diversion-bar-kitchen', 0),
  ('quiz-night', 'bull-ring-nw', 1),
  ('birthday-blowout', 'the-bubble-room', 0),
  ('birthday-blowout', 'the-bubble-room-bramhall', 1),
  ('birthday-blowout', 'long-bar-kitchen', 2),
  ('birthday-blowout', 'inventery', 3),
  ('birthday-blowout', 'archive-bar-bottle', 4),
  ('birthday-blowout', '20-stories', 5),
  ('birthday-blowout', 'k2-karaoke', 6),
  ('leaving-do', 'atomeca-wine-bar', 0),
  ('leaving-do', 'portfolio', 1),
  ('leaving-do', 'blossom-street-social', 2),
  ('leaving-do', 'heaton-social', 3),
  ('leaving-do', 'arcane', 4),
  ('leaving-do', 'one-eight-six', 5),
  ('hen-stag-send-off', 'portfolio', 0),
  ('hen-stag-send-off', 'bacchus', 1),
  ('hen-stag-send-off', 'k2-karaoke', 2),
  ('hen-stag-send-off', '20-stories', 3),
  ('hen-stag-send-off', 'no-8-dukes', 4),
  ('hen-stag-send-off', 'mint-lounge', 5),
  ('after-work-unwind', 'sip-wine-bar', 0),
  ('after-work-unwind', 'hale-wine-bar', 1),
  ('after-work-unwind', 'the-old-cellars', 2),
  ('after-work-unwind', 'salut-wines', 3),
  ('after-work-unwind', 'thom-s-bar-kitchen', 4),
  ('after-work-unwind', 'cork-of-the-north', 5),
  ('after-work-unwind', 'huxley-s', 6),
  ('sunday-roast', 'rose-crown', 0),
  ('sunday-roast', 'the-jane-eyre-chorlton', 1),
  ('sunday-roast', 'the-swan-tarporley', 2),
  ('sunday-roast', 'the-legh-arms', 3),
  ('sunday-roast', 'church-inn', 4),
  ('brunch-not-rushed', 'the-garden-eatery', 0),
  ('brunch-not-rushed', 'henry-s-cafe', 1),
  ('brunch-not-rushed', 'the-olde-school', 2),
  ('brunch-not-rushed', 'neki', 3),
  ('brunch-not-rushed', 'plumcake-cafe', 4),
  ('brunch-not-rushed', 'the-damson-tree-cafe', 5),
  ('brunch-not-rushed', 'cibo-gran-cafe', 6),
  ('brunch-not-rushed', 'idle-hands', 7),
  ('brunch-not-rushed', 'barnshaw-smithy', 8),
  ('first-sunny-evening', 'port-street-beer-house', 0),
  ('first-sunny-evening', 'heaton-social', 1),
  ('first-sunny-evening', 'the-beer-house', 2),
  ('first-sunny-evening', 'folk', 3),
  ('first-sunny-evening', 'wilmslow-tavern', 4),
  ('first-sunny-evening', 'reserve-at-the-rex', 5),
  ('first-sunny-evening', 'barons-quay-social', 6),
  ('first-sunny-evening', '20-stories', 7),
  ('cosy-winter-warm-up', 'the-wizard', 0),
  ('cosy-winter-warm-up', 'the-roebuck-inn', 1),
  ('cosy-winter-warm-up', 'church-inn', 2),
  ('cosy-winter-warm-up', 'bonjour-wines', 3),
  ('cosy-winter-warm-up', 'the-legh-arms', 4);
