-- Backfills real ownership for 25 venues that migration 0009's blanket
-- default ('independent') never actually verified for — the research
-- already existed, scattered across venues.json's own provenance notes
-- (written at the time each venue was first added/re-verified), just
-- never carried into these columns. Mined and cross-checked against the
-- live venues table 2026-09-18. This is a data update, not a schema
-- change — numbered to continue the existing migrations sequence, same
-- convention as 0006/0007/0013.
--
-- distinctiveness is deliberately left untouched here: site count alone
-- doesn't tell you whether a place is distinctive (a well-run 2-site
-- sibling pair isn't automatically less special than a 1-site original),
-- and giving these real scores would need the same individual editorial
-- read Piccolino Grande/Cibo Gran Cafe got (migration 0013), not a
-- mechanical downgrade. That's real remaining work, not done here.
--
-- Six of these (Bench Bistro Bar, T.La Art & Craft Gallery, The Chorlton
-- Tap, The Globe, The Mucky Pup, The Vinyl Ember) were re-verified as
-- genuinely independent, not just defaulted — ownership value is
-- unchanged but ownership_notes now records that it was actually
-- checked, not assumed.

update venues set ownership_notes = 'Runs a second, company-operated site at 111 Piccadilly alongside the original Royal Mills location — small-sibling-group allowance, one independent owner. Verified prior research, applied 2026-09-18.' where id = 'ancoats-coffee-co';

update venues set ownership = 'small_group', ownership_notes = 'Part of Orka Koncepts, a small 4-venue Manchester-only operator (Australasia, Grand Pacific, Dear Sailor, OCASA) — not a chain. Verified prior research, applied 2026-09-18.' where id = 'australasia';

update venues set ownership = 'small_group', ownership_notes = 'Real 3-site family group (Stephen and Jack Mitchell: Bar Six Sandbach, Six Nantwich, Six Knutsford), all Cheshire-only. Verified prior research, applied 2026-09-18.' where id = 'bar-six';

update venues set ownership_notes = 'Confirmed effectively single-site — the Congleton sibling closed Sept 2025 and reopened as an unrelated venue. Verified prior research, applied 2026-09-18.' where id = 'bench-bistro-bar';

update venues set ownership = 'small_group', ownership_notes = 'Real 2-site sibling pair (other site in Didsbury) — part of the Wilmslow density pass''s established small-sibling-group precedent. Verified prior research, applied 2026-09-18.' where id = 'caramello';

update venues set ownership = 'small_group', ownership_notes = 'Heaton Moor sibling site rebranded to Casa De Casa — real 2-site pair, ownership unchanged by the rebrand. Verified prior research, applied 2026-09-18.' where id = 'casa-de-moor';

update venues set ownership = 'small_group', ownership_notes = 'Real sister pub to The Bull''s Head, same Cheshire Cat Pubs & Bars group, same village — a 3-pub group. Verified prior research, applied 2026-09-18.' where id = 'church-inn';

update venues set ownership = 'small_group', ownership_notes = 'Shares common management with Cheshire Tap and a third venue, Ivy League — a real 3-site group, within the small-independent-group allowance. Verified prior research, applied 2026-09-18.' where id = 'gin-can';

update venues set ownership = 'small_group', ownership_notes = 'Real 2-site sibling pair (other site in Alderley Edge) — part of the Wilmslow density pass''s established small-sibling-group precedent. Verified prior research, applied 2026-09-18.' where id = 'heddy-s';

update venues set ownership = 'small_group', ownership_notes = 'Real 2-site pair — a second site in Bollington, same owner-operator (Patrick Hannity) running both personally. Verified prior research, applied 2026-09-18.' where id = 'lime-tree';

update venues set ownership = 'small_group', ownership_notes = 'Mundin family group, re-confirmed at exactly 3 sites (Belper, Melton Mowbray, Heaton Moor), no further expansion found. Verified prior research, applied 2026-09-18.' where id = 'savoy-cinema';

update venues set ownership = 'small_group', ownership_notes = 'Real 2-site sibling pair (other site in Chorlton) — part of the Wilmslow density pass''s established small-sibling-group precedent. Verified prior research, applied 2026-09-18.' where id = 'smoke-wilmslow';

update venues set ownership = 'small_group', ownership_notes = 'Real 2-site sibling pair (other site in Chorlton) — part of the Wilmslow density pass''s established small-sibling-group precedent. Verified prior research, applied 2026-09-18.' where id = 'suburban-green';

update venues set ownership_notes = 'Single Companies House registration since 2002 at the same Nicholas Street address — a rumoured second location could not be confirmed either way, treated as unconfirmed rather than real. Verified prior research, applied 2026-09-18.' where id = 't-la-art-craft-gallery';

update venues set ownership = 'small_group', ownership_notes = 'Sibling venue Porto re-confirmed as a same-courtyard 2-site pairing under one operator, not a wider footprint. Verified prior research, applied 2026-09-18.' where id = 'the-blind-pig';

update venues set ownership = 'small_group', ownership_notes = 'Shares ownership with two sister pubs (including Church Inn), all in the same village of Mobberley — Cheshire Cat Pubs & Bars group. Verified prior research, applied 2026-09-18.' where id = 'the-bull-s-head';

update venues set ownership_notes = 'Relationship to Wander Beyond Brewing independently checked and confirmed as a single-site brewery supplying kegs, not a group that owns the pub. Verified prior research, applied 2026-09-18.' where id = 'the-chorlton-tap';

update venues set ownership = 'small_group', ownership_notes = 'Operator Pomona Island Brew Co. runs a real 3-site footprint (a Salford brew-tap, the North Westward Ho pub, and this) — small-independent-group allowance. Verified prior research, applied 2026-09-18.' where id = 'the-creameries';

update venues set ownership_notes = 'A singular, distinctly-conceived venue with no replicated template elsewhere, despite sitting inside an internationally-managed hotel tower (Al Faisaliah). Verified prior research, applied 2026-09-18.' where id = 'the-globe';

update venues set ownership = 'small_group', ownership_notes = 'Independently found to have a third, smaller trading location (a bar concession inside Escape to Freight Island) beyond the Ancoats/Chorlton pair — still not chain territory. Verified prior research, applied 2026-09-18.' where id = 'the-jane-eyre';

update venues set ownership = 'small_group', ownership_notes = 'Same finding as the Ancoats sibling — the Ancoats/Chorlton pair plus a third Freight Island concession. Verified prior research, applied 2026-09-18.' where id = 'the-jane-eyre-chorlton';

update venues set ownership_notes = 'Confirmed single-site, family-run Irish bar/live music venue (opened ~2024) — no chain footprint found anywhere. Verified prior research, applied 2026-09-18.' where id = 'the-mucky-pup';

update venues set ownership_notes = 'A singular, distinctly-conceived venue with no replicated template elsewhere, despite sitting inside an internationally-managed hotel tower (Kimpton KAFD). Verified prior research, applied 2026-09-18.' where id = 'the-vinyl-ember';

update venues set ownership = 'small_group', ownership_notes = 'Part of the same small group as Electrik and Refuge (the "Electrik-Refuge trio") — a real 3-site group, established sibling-group precedent. Verified prior research, applied 2026-09-18.' where id = 'volta';

update venues set ownership = 'small_group', ownership_notes = 'Real 3-site group (Knutsford, Prestwich, Didsbury). Verified prior research, applied 2026-09-18.' where id = 'wallop';
