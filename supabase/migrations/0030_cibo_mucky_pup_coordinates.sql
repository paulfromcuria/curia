-- Fixes Cibo and The Mucky Pup (both Wilmslow) rendering stacked directly
-- on top of each other on the map, at direct user report. Both venues
-- shared the exact same coordinate, 53.326377,-2.230888 — the SK9 1LD
-- postcode's own centroid, not either venue's real building. Re-geocoded
-- both from their real street addresses via Nominatim: Cibo (26-28 Green
-- Lane, SK9 1LD) and The Mucky Pup (15 Grove Street, SK9 1DU — a genuinely
-- different postcode from Cibo's own). Full sourcing in docs/data/venues.json's
-- own _ciboMuckyPupCoordinateFixSource note.

update venues set lat = 53.326515, lon = -2.230945 where id = 'cibo';
update venues set lat = 53.327081, lon = -2.231014 where id = 'the-mucky-pup';
