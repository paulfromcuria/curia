-- Rename "Sunday Session" -> "Pubby Sunday" (2026-09-30, at explicit user
-- request: "swap 'sunday session' for 'pubby sunday'"). Title only — the
-- moments.id primary key ('sunday-session') is left unchanged, same
-- decoupled title/id precedent 'Best for Date Night' (id 'date-night')
-- already set, so no moment_venues FK rows need touching.
--
-- Weekday visibility (only shown Saturday/Sunday) is a client-side gate
-- in src/app/(tabs)/moments.tsx, not a schema change — the same pattern
-- the context-aware weather/sport moments already use.

update moments set title = 'Pubby Sunday' where id = 'sunday-session';
