-- Manchester/Cheshire core backlog review, 2026-09-22 — see this
-- migration's own commit message / CLAUDE.md-adjacent notes for the full
-- story. 46 venues promoted from docs/data/venue-suggestions.json's
-- 55-strong review backlog (the daily curia-suggestion-review agent had
-- stalled since ~09-17), each independently re-verified this session
-- (fresh web research for anything not already conclusively researched,
-- not trusted on the original suggestion alone). Real per-venue
-- ownership_notes/dietary/pet facts extracted from that research where
-- found, conservative defaults (independent/[none]/false) otherwise —
-- see docs/data/venues.json's own new provenance note for the full
-- per-venue reasoning and sourcing.
--
-- Craft & Company (Chester) is deliberately 'coming-soon', not 'live' —
-- its operator (iKO Projects) turned out to run 6 Chester venues plus a
-- separate Ormskirk site, with its holding company renamed from an
-- Ormskirk-registered shell only 4 months ago; real ownership-expansion
-- uncertainty, same treatment as Fire Station Social Cucina (migration
-- history) got for the same reason.
--
-- HUSH Brewing Tap (Northwich) gets occasional=true (migration 0036's own
-- new column) — it trades only the last weekend of each month, a genuine
-- example of exactly the "no predictable weekly schedule" problem that
-- column exists to catch.
--
-- Rustik (Didsbury) is a re-verified EXISTING pending-review-queue item,
-- not a fresh suggestion: its real current character has changed since
-- the original candidate note (a 2025 closure/reopening cycle) — it now
-- trades as a daytime-only brunch café-bar (Wed-Sun 9am-4pm), not the
-- evening Irish bar with live music the original copy described. Real
-- opening_hours included, since this is well-researched current data.
--
-- Buon Cibo (Heaton Moor) is also a re-verified pending-review-queue item
-- — the original Companies House "expansion cluster" concern traced to
-- one family (the Ibrahims) formalising a 2-site takeaway+restaurant
-- operation into one holding company, not real multi-region growth.
--
-- NOT included in this migration, decided against or held back:
-- - Prana (Altrincham): confirmed permanently/indefinitely closed
--   (Google Maps "Permanently closed", dead website, no 2025/2026
--   events, sister venue also closed). Rejected.
-- - Olive Tree Brasserie (Chester): turned out to be a genuine 4-site,
--   3-county chain (Chester/Leeds/Lytham/Stockton Heath) with a director
--   banned 10.5 years for COVID-loan fraud across the group's companies.
--   Rejected — the original "3-site regional group, judgment call" framing
--   understated the real scale.
-- - Bali Health Lounge (Chinatown): confirmed dissolved via creditors'
--   voluntary liquidation, completed Dec 2024 — the "still trading" read
--   in the original suggestion was wrong; live-looking directory pages
--   were stale. Rejected.
-- - Underbank / "The Underbank" (Stockport Underbanks): investigated a
--   suspected name/identity mismatch with the existing catalog entry —
--   found no evidence a second real venue exists; the theory traced to a
--   January 2025 announcement (a different operator's plan for the same
--   building) that appears to have been superseded by what actually
--   opened in May 2025. No new venue added, existing entry left as-is.
-- - Coco Tang (Spinningfields): still pre-opening as of today ("opening
--   this autumn," no confirmed trading date) — left pending in
--   docs/data/venue-suggestions.json for a future check once it's
--   actually trading.
--
-- Also found, not a venue-data issue: the daily research pipeline
-- re-suggested THREE venues already live in the catalog under identical
-- names/coordinates (The Nest Nantwich, Amici, Amazing India) and once
-- already re-suggested a venue confirmed closed and removed two weeks
-- earlier (King Street Kitchen, Knutsford) — a real gap in its dedup
-- logic (it appears to only check its own suggestions file, not
-- venues.json or the closure-decision history), flagged separately, not
-- fixed by this migration.

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status, occasional
) values
  (
    'turturici', 'Turturici', 'ITALIAN RESTAURANT', '{}', 2, 'northwich', 'cheshire',
    53.236325, -2.50975, false, '{"none"}', '{}',
    'Jo Turturici''s own Sicilian kitchen in Davenham, sixteen years in and still taking no bookings — the queue outside on a Friday is the same one it''s always had.',
    '{afternoon,evening}', 71, 'live', 'texture', 1,
    4, 'independent', 'Single-site, family-run (Jo/Giuseppina Turturici) since 2006, Davenham (real location, ~2mi south of Northwich centre). No second site found. Verified via the venue''s own booking site and Tripadvisor.', 'live', false
  ),
  (
    'piste-wine-bar-restaurant', 'Piste Wine Bar & Restaurant', 'WINE BAR', '{}', 3, 'tarporley', 'cheshire',
    53.1602, -2.6687, false, '{"none"}', '{}',
    'James and Paul''s own room on the High Street since 2010 — they sold the Sandbach branch off years ago to keep this one exactly what it started as, a proper list poured by people who still work the floor themselves.',
    '{afternoon,evening}', 76, 'live', 'texture', 1,
    4, 'small_group', 'James Hughes and Paul Bebe, brothers-in-law, opened 2010. A second Piste in Sandbach was sold off years ago specifically to concentrate on this one — now single-site under the Piste name. Verified via the operator''s own site and local press.', 'live', false
  ),
  (
    'rose-farm-shop', 'Rose Farm Shop', 'FARM EXPERIENCE', '{}', 2, 'tarporley', 'cheshire',
    53.1815, -2.6766, false, '{"none"}', '{}',
    'Highland cows and donkeys a field over from the butchery counter — a working farm outside the village with its own coffee house, garden centre and hand car wash, none of it dressed up for the visit.',
    '{morning,afternoon}', 64, 'live', 'texture', 1,
    4, 'independent', 'Single-site family farm (Utkinton, real location ~1.5mi from Tarporley centre), livestock/butchery/cafe/garden centre. No group ownership found.', 'live', false
  ),
  (
    'beeston-castle', 'Beeston Castle', 'HISTORIC CASTLE', '{}', 1, 'tarporley', 'cheshire',
    53.12511, -2.688148, false, '{"none"}', '{}',
    'Four thousand years of hillfort and castle on a rock outcrop with the Pennines on one horizon and Wales on the other — English Heritage''s own postal address puts it in Tarporley, and the climb through the woodland park earns whatever''s left at the top.',
    '{morning,afternoon}', 74, 'live', 'texture', 1,
    4, 'independent', 'English Heritage (national heritage charity), not a commercial chain — same non-commercial-heritage precedent as Tatton Park (National Trust) and John Rylands Library (University of Manchester) in this same batch.', 'live', false
  ),
  (
    'bonjour-wines', 'Bonjour Wines', 'WINE MERCHANT', '{}', 2, 'tarporley', 'cheshire',
    53.159847, -2.66914, false, '{"none"}', '{}',
    'Sue and her daughter Kelly''s corner of Chestnut Terrace — wine and cheese boards under blankets and heaters on a candlelit terrace, with a monthly live-music night that turns a bottle shop into somewhere to actually stay.',
    '{afternoon,evening}', 68, 'live', 'texture', 1,
    4, 'independent', 'Mother-and-daughter (Sue and Kelly), single registered trading address (BONJOURVINO LTD). No second site found.', 'live', false
  ),
  (
    'board-beans', 'Board Beans', 'GAMES CAFE', '{}', 2, 'northwich', 'cheshire',
    53.2622, -2.5111, false, '{"none"}', '{}',
    'A board-game library the length of Witton Street, catalogued by Betsy and Frazer so nobody has to bring their own — coffee and cake while the table works out whether Catan or Codenames wins the evening.',
    '{afternoon,evening}', 66, 'live', 'texture', 1,
    4, 'independent', 'Single-site independent (Betsy and Frazer), Board Beans Ltd registered at the one trading address. No second site found.', 'live', false
  ),
  (
    'barons', 'Barons', 'ALE HOUSE', '{}', 1, 'northwich', 'cheshire',
    53.262, -2.5135, false, '{"none"}', '{}',
    'A converted shop on Witton Street with a rear patio and a cask list run on instinct — the same hand behind the Real Ale Shack in Warrington market, working here as its own room, not a branch of it.',
    '{afternoon,evening}', 70, 'live', 'texture', 1,
    4, 'independent', 'Leasehold owner also runs a market stall (Real Ale Shack, Warrington) — a different concept in a different town, judged a side-business rather than a replicated chain format, same precedent as Piste''s James Hughes (Nags Head, Haughton) in this batch.', 'live', false
  ),
  (
    'northwich-market', 'Northwich Market', 'MARKET HALL', '{}', 1, 'northwich', 'cheshire',
    53.263776, -2.509656, false, '{"none"}', '{}',
    '£1.8m and a corner of Barons Quay bought Northwich its market back — the same traders who worked Weaver Square for years, under one roof again from the week this opened.',
    '{morning,afternoon}', 76, 'live', 'texture', 1,
    4, 'independent', 'A council-led civic market hall (Cheshire West and Chester Council), same category as the existing Stockport Market Hall/Mackie Mayor/Altrincham Market — not a commercial chain. Opened 18 Sept 2026, confirmed trading on schedule via a follow-up check 4 days later.', 'live', false
  ),
  (
    'hush-brewing-tap', 'HUSH Brewing Tap', 'BREWERY TAP', '{}', 1, 'northwich', 'cheshire',
    53.256451, -2.517588, false, '{"none"}', '{}',
    'Three beers, whatever''s in the tanks that month, poured on a small industrial estate off Navigation Road — open the last weekend of each month, a genuine brewery taproom rather than a pub that happens to stock the cans.',
    '{afternoon}', 58, 'live', 'texture', 1,
    4, 'independent', 'Single-site independent micro-brewery taproom. Trades only the last weekend of each month on a temporary licence — real and verified, not a closure signal, hence occasional=true rather than a fuller band spread.', 'live', true
  ),
  (
    'zaza-cafe-bar', 'Zaza Cafe Bar', 'BRUNCH SPOT', '{}', 2, 'northwich', 'cheshire',
    53.2622, -2.5111, false, '{"vegetarian","vegan","gluten-free"}', '{}',
    'A sixty-seat room on Witton Street running an English-and-Turkish brunch menu built to actually cover dietary asks — gluten-free and vegan orders arrive without an apologetic asterisk.',
    '{morning,afternoon}', 68, 'live', 'texture', 1,
    4, 'independent', 'Single registered company (ZAZA CAFE BAR LTD, one director with significant control) at the one trading address. A second Warrington listing on one aggregator (Wanderlog) reads as a data artefact, not a real second branch.', 'live', false
  ),
  (
    'sali-s-souvlaki', 'Sali''s Souvlaki', 'SOUVLAKI SPOT', '{}', 2, 'chorlton', 'manchester',
    53.440841, -2.2761, false, '{"none"}', '{}',
    'Sali and Besmira''s own grill on Barlow Moor Road, Albanian and Greek between them — souvlaki and imported Greek drinks cooked the way it''s cooked at home, not translated for a passing tourist.',
    '{afternoon,evening}', 72, 'live', 'texture', 1,
    4, 'independent', 'Single-site, family-run (Sali and Besmira). No second site or group ownership found.', 'live', false
  ),
  (
    'vietnamese-potbellied', 'Vietnamese Potbellied', 'VIETNAMESE', '{}', 2, 'chorlton', 'manchester',
    53.442763, -2.280659, false, '{"none"}', '{}',
    'A small BYOB room on Wilbraham Road running a short, genuinely Vietnamese menu — bun cha and a papaya salad that don''t need a photo on the wall to sell them.',
    '{afternoon,evening}', 74, 'live', 'texture', 1,
    4, 'independent', 'Single-site, independently and family-run. No second site found. (Considered and deliberately did not suggest Viet Shack, Ancoats, instead — now a 3-site operation with an actively growing footprint.)', 'live', false
  ),
  (
    'eden', 'Eden', 'SMALL PLATES', '{}', 2, 'heaton-moor', 'manchester',
    53.423501, -2.18329, false, '{"none"}', '{}',
    'The old Scarlet Door unit on Heaton Moor Road, gutted and relit as effortless tapas and serious cocktails — a beer yard out back for whichever half of the room fills up first.',
    '{afternoon,evening,late}', 68, 'live', 'texture', 1,
    4, 'independent', 'Single-site independent neighbourhood bar/eatery, opened Nov 2024 in a unit that changed names several times before (Orangery, Thom''s Wine Bar, Scarlet Door). No group ownership or second site found.', 'live', false
  ),
  (
    'salut-wines', 'Salut Wines', 'WINE BAR', '{}', 3, 'chinatown', 'manchester',
    53.4793, -2.2426, false, '{"none"}', '{}',
    'Three hundred bottles and an Enomatic wall on Cooper Street, run by the same independent team since 2014 — forty of them by the glass, for anyone who''d rather taste before they commit to the bottle.',
    '{afternoon,evening,late}', 78, 'live', 'texture', 1,
    4, 'independent', 'Single-site independent (Salut Wines Ltd, company no. 07256419), founded 2014, self-described as ''still independent and locally owned.''', 'live', false
  ),
  (
    'la-gitane', 'La Gitane', 'JAZZ BAR', '{}', 2, 'spinningfields', 'manchester',
    53.481075, -2.249108, false, '{"none"}', '{}',
    'A candlelit cellar under Cafe Istanbul on Bridge Street, hung with black-and-white jazz photographs since Matt Nickson — the man behind Matt & Phreds — helped launch it; the bill''s since widened to Latin and Afrobeat nights, but there''s still a trio in the corner most weeks.',
    '{evening,late}', 76, 'live', 'texture', 1,
    4, 'independent', 'A single venue beneath a single independent restaurant (Cafe Istanbul), with programming curated by Matt Nickson (also founder of the already-catalogued Matt & Phreds) as a curatorial link, not shared ownership. No chain footprint.', 'live', false
  ),
  (
    'idle-hands', 'Idle Hands', 'BRUNCH SPOT', '{}', 2, 'northern-quarter', 'manchester',
    53.481228, -2.232857, false, '{"dairy-free"}', '{}',
    'Dave and Lucy''s own red-brick corner on Dale Street — a rotating cast of third-wave roasters, a pie case that turns over by lunch, and Oatly on tap for whoever doesn''t want dairy in it.',
    '{morning,afternoon}', 78, 'live', 'texture', 1,
    4, 'independent', 'Single-site, co-owned by Dave Wolinski and Lucy Phillips. No second site or group ownership found.', 'live', false
  ),
  (
    'blossom-street-social', 'Blossom Street Social', 'WINE BAR', '{}', 3, 'ancoats', 'manchester',
    53.48494, -2.228206, false, '{"none"}', '{}',
    'Ben Stephenson built this out of the same wine list he already runs at Hanging Ditch in town — a retail wall and a collaborative-dining room on the marina, morning coffee through to a last glass.',
    '{afternoon,evening,late}', 80, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair under one owner (Ben Stephenson, also of Hanging Ditch wine merchants) with his father — a retail shop plus a bar/dining room, both inner-city Manchester. Within the established small-operator allowance.', 'live', false
  ),
  (
    'dimitri-s', 'Dimitri''s', 'GREEK TAVERNA', '{}', 3, 'deansgate', 'manchester',
    53.47614, -2.251226, false, '{"none"}', '{}',
    'Thirty years deep into Campfield Arcade and now spread across five units of it, still run by the family Dimitri built it for — meze that doesn''t perform for whoever''s just come from the Bridgewater Hall.',
    '{afternoon,evening}', 78, 'live', 'texture', 1,
    4, 'independent', 'Family-run over 30 years, expanded to five units within the same Campfield Arcade building (not separate branch locations) — one physical footprint, not a chain. Name spelled inconsistently even on the business''s own site (Dimitri''s/Dimitris) — used the majority convention (with apostrophe) across review platforms.', 'live', false
  ),
  (
    'la-dulce-vendimia', 'La Dulce Vendimia', 'WINE BAR', '{}', 2, 'macclesfield', 'cheshire',
    53.259805, -2.124364, false, '{"none"}', '{}',
    'Emily poured wine at Laithwaite''s before she decided to pour her own — twenty-five seats on Church Street''s cobbles and a list built entirely around Spain, sweet vintage in the name and no apology for the focus.',
    '{afternoon,evening}', 72, 'live', 'texture', 1,
    4, 'independent', 'Single-site, founded by Emily Wilson (a former Laithwaite''s Wine employee going independent). No second site or group ownership found. A forward-booked tasting event (24 Sept 2026) confirms current trading.', 'live', false
  ),
  (
    'sigiriya', 'Sigiriya', 'SRI LANKAN RESTAURANT', '{}', 3, 'hale', 'cheshire',
    53.377613, -2.346371, false, '{"none"}', '{}',
    'Don Buddhika''s second room after Knutsford, still eighty percent Sri Lankan on the menu — hoppers, kottu and curries that don''t get simplified for an Ashley Road crowd used to Italian.',
    '{afternoon,evening}', 75, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair (Hale and Knutsford), both Cheshire, led by restaurateur Don Buddhika. Within the established small-operator allowance.', 'live', false
  ),
  (
    'beaumont-organic', 'Beaumont Organic', 'FASHION BOUTIQUE', '{}', 3, 'northern-quarter', 'manchester',
    53.4817, -2.232, false, '{"none"}', '{}',
    'The only shop anywhere carrying the full collection, because Hannah Beaumont''s own studio sits on the floors above it — everything made or sourced in England, most of it made in Manchester.',
    '{morning,afternoon}', 70, 'live', 'texture', 1,
    4, 'independent', 'Single physical location worldwide for designer Hannah Beaumont-Laurencia''s own label (founded 2008) — genuinely single-site, not a retail chain.', 'live', false
  ),
  (
    'kambuja', 'Kambuja', 'CAMBODIAN RESTAURANT', '{}', 2, 'stockport-underbanks', 'manchester',
    53.411709, -2.157274, false, '{"none"}', '{}',
    'A Cambodian-American dinner-party hostess and her English record-collector husband, running one stall in the Produce Hall and a second out in Marple — modern Khmer cooking that never got simplified for a food-court crowd.',
    '{afternoon,evening}', 74, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair (Stockport Produce Hall and Marple), both within the Stockport borough, founded by chef Y Sok and her husband. Within the established small-operator allowance.', 'live', false
  ),
  (
    'soup', 'SOUP', 'NIGHTCLUB', '{}', 2, 'northern-quarter', 'manchester',
    53.482851, -2.234599, false, '{"none"}', '{}',
    'Sixteen years under the same Spear Street roof, the name shortened from Soup Kitchen but not the booking policy — a 260-capacity basement that still runs on touring DJs rather than anything a playlist could do instead.',
    '{evening,late}', 79, 'live', 'texture', 1,
    4, 'independent', 'Single-site, trading since 2010 (renamed from Soup Kitchen in 2020, same ownership throughout). No chain or group ownership found.', 'live', false
  ),
  (
    'the-coast', 'The Coast', 'ITALIAN RESTAURANT', '{}', 3, 'tarporley', 'cheshire',
    53.1595, -2.6687, false, '{"none"}', '{}',
    'Blair Glen''s Mediterranean room on the High Street, with a second only over in Prestbury — a kitchen run by a chef who left San Carlo''s Cicchetti to cook this one properly instead.',
    '{afternoon,evening}', 76, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair (Tarporley and Prestbury), owned by Blair Glen with executive chef John Thompson. Within the established small-operator allowance.', 'live', false
  ),
  (
    'higher-ground', 'Higher Ground', 'FINE DINING', '{}', 4, 'chinatown', 'manchester',
    53.479563, -2.238574, false, '{"none"}', '{}',
    'The Flawd team''s follow-up on Faulkner Street, farmed partly from their own plot out in Cheshire — a tasting-led menu that changes with whatever actually came off that land this week, not a fixed script.',
    '{evening}', 90, 'live', 'texture', 1,
    4, 'small_group', 'A real, small 2-site pair with Flawd (Ancoats, already catalogued), same ownership group, plus a supplying farm (Cinderwood Market Garden) rather than a third commercial venue. Within the established small-operator allowance. Michelin Guide listed (not a confirmed star).', 'live', false
  ),
  (
    'john-rylands-library', 'John Rylands Library', 'HISTORIC LIBRARY', '{}', 1, 'deansgate', 'manchester',
    53.480335, -2.248963, false, '{"none"}', '{}',
    'Neo-Gothic reading rooms built by a widow on cotton money, free to walk into on Deansgate — the Cottonopolis room does the hard history of that fortune properly, and nobody hurries you past the manuscripts.',
    '{morning,afternoon}', 84, 'live', 'texture', 1,
    4, 'independent', 'Owned and run by the University of Manchester — a public university, not a commercial chain. Same non-commercial-heritage precedent as Beeston Castle/Tatton Park in this batch.', 'live', false
  ),
  (
    'tuula', 'Tuula', 'FASHION BOUTIQUE', '{}', 3, 'alderley-edge', 'cheshire',
    53.302439, -2.23607, false, '{"none"}', '{}',
    'Nicki Moreton named the shop after her own dog and stocked the rails almost entirely from Denmark — eighty percent of what''s here you won''t find anywhere else on London Road.',
    '{morning,afternoon}', 68, 'live', 'texture', 1,
    4, 'independent', 'Single-site, owned by Nicki Moreton. No second site or group ownership found. (A similarly-named boutique, Willow Boutiques, Knutsford, was researched and deliberately not suggested instead — it has a real multi-region footprint.)', 'live', false
  ),
  (
    'this-that', 'This & That', 'INDIAN RESTAURANT', '{}', 1, 'northern-quarter', 'manchester',
    53.484561, -2.238195, false, '{"none"}', '{}',
    'Rice and three for a fiver since 1984, the curries changing by the day and the queue down Soap Street still forming before half twelve — the Northern Quarter''s original, and the one everything since has been measured against.',
    '{morning,afternoon}', 74, 'live', 'texture', 1,
    4, 'independent', 'Single-site, family-run since 1984. No second site or group ownership found.', 'live', false
  ),
  (
    'social-refuge', 'Social Refuge', 'BOOKSHOP', '{}', 1, 'ancoats', 'manchester',
    53.484215, -2.231337, false, '{"none"}', '{}',
    'Europe''s largest LGBTQ+ bookshop moved into a coffee bar and co-working room on Great Ancoats Street — four and a half thousand titles, and nobody''s rushing you past the till to make room for the next customer.',
    '{morning,afternoon,evening}', 70, 'live', 'texture', 1,
    4, 'independent', 'Single-site independent (cafe/bookshop/co-working/event space built around Queer Lit). No second site or group ownership found.', 'live', false
  ),
  (
    'tatton-park', 'Tatton Park', 'HISTORIC ESTATE', '{}', 2, 'knutsford', 'cheshire',
    53.330523, -2.383496, false, '{"none"}', '{}',
    'A Neo-Classical mansion, a medieval old hall, and a thousand acres of deer park a mile up Ashley Road — the National Trust runs it jointly with the council, and neither seems in any hurry to modernise it.',
    '{morning,afternoon}', 86, 'live', 'texture', 1,
    4, 'independent', 'National Trust, jointly administered with Cheshire East Council — a national heritage charity, not a commercial chain.', 'live', false
  ),
  (
    'chester-zoo', 'Chester Zoo', 'ZOO', '{}', 3, 'chester', 'cheshire',
    53.224118, -2.879437, false, '{"none"}', '{}',
    'Thirty-five thousand animals and a conservation charity''s actual working headquarters behind the turnstiles — the zoo the rest of the country''s zoos still get compared to, a few miles north of the Rows.',
    '{morning,afternoon}', 90, 'live', 'texture', 1,
    4, 'independent', 'Owned and run by the North of England Zoological Society, a single registered charity with one site — genuinely singular, non-commercial.', 'live', false
  ),
  (
    'temple-street-claypot-rice', 'Temple Street Claypot Rice', 'HONG KONG CAFE', '{}', 1, 'altrincham', 'cheshire',
    53.394997, -2.35188, false, '{"none"}', '{}',
    'A Kowloon cha chaan teng shrunk onto Manchester Road, sister to Cheetham Hill''s Happy Valley — claypot rice bubbling at the table, and a menu that never once simplifies for the room it''s in.',
    '{afternoon,evening}', 70, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair with Happy Valley (Cheetham Hill), same owner, both Greater Manchester. Within the established small-operator allowance.', 'live', false
  ),
  (
    'basmati', 'Basmati', 'INDIAN RESTAURANT', '{}', 2, 'nantwich', 'cheshire',
    53.063845, -2.519589, false, '{"vegetarian","vegan","gluten-free"}', '{}',
    'A working Victorian station house on Pillory Street, trains still audible through dinner — Bangladeshi and Indian cooking that''s outlasted the platform it''s built on.',
    '{evening}', 74, 'live', 'texture', 1,
    4, 'independent', 'Single-site, trading since 2013 inside Nantwich''s historic railway station building. No second site or group ownership found.', 'live', false
  ),
  (
    'underbanks-gallery', 'Underbanks Gallery', 'ART GALLERY', '{}', 1, 'stockport-underbanks', 'manchester',
    53.4111, -2.1572, false, '{"none"}', '{}',
    'Ann-Marie Fowler spotted the empty shop on Little Underbank and filled it herself — new names on the wall most months, and none of the Market Place''s queue for the coffee next door.',
    '{morning,afternoon}', 66, 'live', 'texture', 1,
    4, 'independent', 'Single-site, owned by Ann-Marie Fowler. No second site or group ownership found.', 'live', false
  ),
  (
    'art-club', 'Art Club', 'ART GALLERY', '{}', 2, 'heaton-moor', 'manchester',
    53.4232, -2.1855, false, '{"none"}', '{}',
    'A former dress shop on Shaw Road, now easel space by day and a proper drink by night — life drawing on a Tuesday, and nobody minds if you just came for the coffee.',
    '{morning,afternoon,evening}', 68, 'live', 'texture', 1,
    4, 'independent', 'Single-site, owned by Angela Lock, opened 2023. Searched specifically for a second site given the ''UK Art Club'' branding on its domain/social handles — found none.', 'live', false
  ),
  (
    'peppery-rose', 'Peppery Rose', 'PAN-ASIAN RESTAURANT', '{}', 2, 'alderley-edge', 'cheshire',
    53.302439, -2.23607, false, '{"none"}', '{}',
    'Aric Leung sold his three Peking Gardens to spend more time at home, then opened this one anyway — pan-Asian plates named for an uncle''s old restaurant on the same road.',
    '{afternoon,evening}', 72, 'live', 'texture', 1,
    4, 'independent', 'Owner Aric Leung previously owned three Peking Gardens restaurants but sold that group two years before opening this one — a fresh single-site venture under a different ownership structure, not a fourth site of the old group.', 'live', false
  ),
  (
    'indian-affair', 'Indian Affair', 'INDIAN RESTAURANT', '{}', 2, 'ancoats', 'manchester',
    53.4848, -2.2277, false, '{"none"}', '{}',
    'Blossom Street''s second site for Chorlton''s own Dilli-style kitchen — the tandoor''s the same, the room''s just newer.',
    '{evening}', 74, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair with the Chorlton original, same operator, both Manchester. Within the established small-operator allowance.', 'live', false
  ),
  (
    'hooked', 'Hooked', 'FISH AND CHIPS', '{}', 1, 'hale', 'cheshire',
    53.3785, -2.349, false, '{"none"}', '{}',
    'Knutsford''s own chip shop moved south to a former WA14 unit on Ashley Road — proper batter, and the same fryer standard that built the following in the first place.',
    '{afternoon,evening}', 68, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair with the original Knutsford chip shop, same operator, both Cheshire towns. Within the established small-operator allowance.', 'live', false
  ),
  (
    'nostro-grande', 'Nostro Grande', 'ITALIAN RESTAURANT', '{}', 2, 'altrincham', 'cheshire',
    53.385387, -2.34941, false, '{"none"}', '{}',
    'Neapolitan pizza from an oven shipped over from Naples, and a carbonara finished tableside under a whole wheel of Parmesan — the second site for the family behind Hale Road''s Nostro Cafe, in the old Frankie & Benny''s unit they''ve made unrecognisable.',
    '{afternoon,evening}', 76, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair with Nostro Cafe (Hale Road, Altrincham), same family, both Altrincham. Within the established small-operator allowance. Opened 19 Sept 2026 (3 days before verification) — genuinely fresh, no issues found in a dedicated follow-up check.', 'live', false
  ),
  (
    'buon-cibo', 'Buon Cibo', 'ITALIAN RESTAURANT', '{}', 2, 'heaton-moor', 'manchester',
    53.423255, -2.185411, false, '{"none"}', '{}',
    'A family-run shopfront on Shaw Road doing stone-baked pizza from a purpose-built oven alongside a proper trattoria menu — carbonara, arrabbiata, and ossobuco that turns up on the board when the mood takes them.',
    '{evening}', 74, 'live', 'texture', 1,
    4, 'small_group', 'Re-verified pending-review-queue item. Two real sites (Hazel Grove takeaway, Heaton Moor restaurant), same family (the Ibrahims) since 2017-19. The Companies House ''expansion cluster'' that raised the original concern traces to normal small-business housekeeping — folding a messy multi-year company history (repeated compulsory strike-off notices for filing delays) into one holding company in Sept 2025, not real multi-region growth. No press, franchise language, or multi-site job postings found.', 'live', false
  ),
  (
    'rustik', 'Rustik', 'IRISH BAR', '{}', 2, 'didsbury', 'manchester',
    53.427674, -2.241957, true, '{"none"}', '{}',
    'Burton Road''s own Irish-rooted corner, mornings through mid-afternoon only these days — a proper fry-up and coffee in a room that still wears its rustic, session-bar bones.',
    '{morning,afternoon}', 70, 'live', 'texture', 1,
    4, 'independent', 'Re-verified pending-review-queue item. Closed 17 Sept 2025, reopened 15 Oct 2025 as a daytime-only brunch café-bar — the evening/live-music Irish-bar programme has not visibly returned in the ~11 months since (Google/Instagram both confirm Wed-Sun 9am-4pm as the stable steady state, not a transient phase). Original operating company (RUSTIK LTD 11043611, the Ahmeds) dissolved Nov 2025; a new same-named company (17363010) incorporated Jul 2026 under three different individually-named directors — ownership continuity is genuinely uncertain, flagged honestly rather than carried over from the original ''family-run'' framing uncritically. Real dog-friendly confirmation via the venue''s own Instagram bio.', 'live', false
  ),
  (
    'beer-heroes', 'Beer Heroes', 'BOTTLE SHOP', '{}', 2, 'chester', 'cheshire',
    53.19, -2.8925, true, '{"gluten-free"}', '{}',
    'Three hundred and fifty bottles under an arched cellar ceiling on Watergate Street, poured or boxed to go — a second room out at Helsby station for the same small operation.',
    '{afternoon,evening}', 72, 'live', 'texture', 1,
    4, 'small_group', 'A real 2-site pair (Chester and Helsby railway station), founded by married couple Carl and Kelly Ball (Beer Heroes (Chester) Limited, active). Within the established small-operator allowance.', 'live', false
  ),
  (
    'huxley-s', 'Huxley''s', 'WINE BAR', '{}', 1, 'chester', 'cheshire',
    53.1909, -2.8887, true, '{"none"}', '{}',
    'Six tables inside, six more out along the City Walls by the Eastgate Clock — Neil and Olga''s own microbrewery on tap, in a building they rescued from nothing themselves.',
    '{morning,afternoon}', 74, 'live', 'texture', 1,
    4, 'independent', 'Single-site, owned by husband-and-wife Neil and Olga Chesters, who also run their own microbrewery (Chester Beer Company, poured here) — a supplier relationship, not a second venue. A 2025 council dispute over outdoor seating was resolved in the venue''s favour.', 'live', false
  ),
  (
    'paysan', 'Paysan', 'FRENCH BISTRO', '{}', 2, 'chester', 'cheshire',
    53.1893, -2.8914, false, '{"none"}', '{}',
    'Rotisserie chicken and frites downstairs on Bridge Street Row, two hundred wines by the glass upstairs in the Cavern of the Curious Gnome — no bookings, and a queue that doesn''t seem to mind.',
    '{afternoon,evening}', 78, 'live', 'texture', 1,
    4, 'independent', 'Single-site, single-owner (Neville Sidebottom) across two levels (Paysan plus the Cavern of the Curious Gnome upstairs). A 2024 cellar fire in the Cavern was repaired (crowdfunded by a rival Chester bar) and the venue went on to win CAMRA Branch Pub of the Year 2024 — confirms current trading, not a closure risk.', 'live', false
  ),
  (
    'shrub', 'Shrub', 'SMALL PLATES', '{}', 2, 'chester', 'cheshire',
    53.1908, -2.889, true, '{"vegetarian","vegan","gluten-free"}', '{}',
    'Plant-based cooking good enough to rank above most of Chester''s meat-eating rooms — oyster mushroom skewers on the Rows terrace, and a wine list that never once apologises for the missing dairy.',
    '{afternoon,evening}', 82, 'live', 'texture', 1,
    4, 'small_group', 'Owner Calum Adams. Has one same-city sibling (tbc* cocktail bar, also Chester, same management) — fits the established ''a single extra site in the same city doesn''t disqualify'' allowance comfortably.', 'live', false
  ),
  (
    'craft-company', 'Craft & Company', 'GIN BAR', '{}', 2, 'chester', 'cheshire',
    53.1901, -2.8924, false, '{"none"}', '{}',
    'A 1776 townhouse on Watergate Row rebuilt around gin, craft beer and a stairwell view worth the climb — live music from Thursday, and a speakeasy hush the rest of the week.',
    '{evening,late}', 76, 'coming-soon', 'texture', 1,
    3, 'independent', 'Set to coming-soon rather than live: operator iKO Projects turned out to run SIX Chester venues (not four as originally suggested) plus a separate site in Ormskirk (~20mi away, a genuinely different town), and its holding company was renamed from an Ormskirk-registered shell (''Enzo''s Ormskirk Limited'') to ''iKO Projects Holdings Limited'' only in May 2026 — a real signal of active cross-town consolidation, not a settled small local group. The venue itself is fine on its own merits; the operator''s trajectory needs a human call before going fully live.', 'live', false
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  status = excluded.status, occasional = excluded.occasional;

-- Rustik's real, researched current opening hours (Wed-Sun 9am-4pm,
-- closed Mon/Tue) — separate statement since opening_hours is jsonb, not
-- part of the column list above (matching migration 0033/0034's own
-- pattern of setting hours via a dedicated update).
update venues set opening_hours = '{"monday":[],"tuesday":[],"wednesday":[{"open":"09:00","close":"16:00"}],"thursday":[{"open":"09:00","close":"16:00"}],"friday":[{"open":"09:00","close":"16:00"}],"saturday":[{"open":"09:00","close":"16:00"}],"sunday":[{"open":"09:00","close":"16:00"}]}'::jsonb where id = 'rustik';

-- Prana (Altrincham) and Bali Health Lounge (Chinatown) were never
-- promoted to begin with (still just pending review-queue/suggestion
-- entries, not real venues.json rows) so there's nothing to mark closed
-- here — the rejection is data-layer only (the JSON files), not a
-- Supabase change. Same for Olive Tree Brasserie/Underbank.
