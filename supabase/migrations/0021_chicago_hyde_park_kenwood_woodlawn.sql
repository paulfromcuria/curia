-- Curia's first US metro: Chicago, scoped to Hyde Park / Kenwood / Woodlawn
-- (roughly 2mi of the UChicago campus), at explicit user request — a real
-- pilot for a specific first member (a UChicago student, high disposable
-- income, testing/showing the app to professors), not a market-sizing
-- decision. Same two-gate curation rules as everywhere else — the member's
-- own age doesn't change what gets curated (alcohol is legal and normal
-- here, unlike Riyadh, so this stays fully 'uk' HomeRegion — the shared
-- global Drink catalog).
--
-- 36 venues: 26 Hyde Park, 3 Kenwood (genuinely thin — a quiet, historic
-- mansion district with little commercial footprint, same honest-yield
-- precedent as Mobberley/Hittin/KAFD), 7 Woodlawn (2 seasonal, noted in
-- their own descriptions). Full sourcing, per-venue ownership evidence and
-- Gate 1/Gate 2 reasoning in docs/data/venues.json's own
-- _chicagoVenueSource note — this migration carries the real, researched
-- distinctiveness/ownership values (same split as
-- 0019_cheshire_golf_clubs.sql).

insert into districts (id, name, metro, lat, lon, base, kind, accent_color, editorial_description)
values
  ('hyde-park', 'Hyde Park', 'chicago', 41.8010, -87.5872, 82, 'city', '#B8925A', 'A university town within a city, built around a Gothic quad and the stretch of 53rd and 57th that services it — secondhand bookshops that have outlasted their landlords twice over, a cafeteria line Obama used to queue in, and a Michelin Bib Gourmand two blocks from the lecture halls. Lake Michigan on one side, the Midway on the other, and just enough independent grit left in the storefronts that the neighbourhood still reads as lived-in, not curated.'),
  ('kenwood', 'Kenwood', 'chicago', 41.8090, -87.5965, 68, 'city', '#8C5A52', 'Chicago''s grandest surviving mansion district, and still mostly houses — Muddy Waters kept one here, so did Louis Farrakhan, and the greystones on Greenwood and Woodlawn Avenue don''t advertise who''s inside. What commercial life there is runs thin and specific along 47th and 43rd: a Senegalese kitchen built on a family recipe from Dakar, a jazz room made out of a father''s old TV-repair shop, nothing that needs a queue.'),
  ('woodlawn', 'Woodlawn', 'chicago', 41.781, -87.599, 72, 'city', '#C17A4E', 'Ninety years of disinvestment couldn''t quite finish Woodlawn off, and the Obama Presidential Center''s arrival in Jackson Park hasn''t rewritten it so much as given it a reason to be looked at again. What''s here now is a real mix: a lunch counter that''s fed the neighbourhood since 1892, a coffee shop a handful of regulars bought outright rather than watch it disappear, and a Saturday farmers market that was doing the work long before anyone called it a comeback.')
on conflict (id) do update set
  name = excluded.name, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  base = excluded.base, kind = excluded.kind, accent_color = excluded.accent_color,
  editorial_description = excluded.editorial_description;

insert into cities (id, name) values ('chicago', 'Chicago')
on conflict (id) do update set name = excluded.name;

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'valois', 'Valois', 'CAFETERIA', '{}', 1, 'hyde-park', 'chicago',
    41.799823, -87.588297, false, '{"vegetarian"}', '{}',
    'A steam-table cafeteria running the same ''see your food'' line since 1921 — the Mediterranean omelette Obama used to order is still on the board, and nobody''s dressed for the room, which is the point.',
    '{morning,afternoon}', 88, 'live', 'texture', 1,
    5, 'independent', 'Argiris family-run for ~50 years, founded 1921 by William Valois. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'medici-on-57th', 'Medici on 57th', 'BAKERY', '{}', 2, 'hyde-park', 'chicago',
    41.791218, -87.593747, false, '{"vegetarian"}', '{}',
    'Same family since 1962, and the booths still carry six decades of carved initials — burgers and deep-dish from a kitchen that''s never once chased a trend off 57th Street.',
    '{afternoon,evening}', 80, 'live', 'texture', 1,
    4, 'small_group', 'Morsbach family-owned since 1962; the family historically ran up to six Medici-branded locations across Chicagoland, though this 57th St flagship is the original site. Verified 2026-09-18.', 'live'
  ),
  (
    'cedars-mediterranean-kitchen', 'Cedars Mediterranean Kitchen', 'MIDDLE EASTERN', '{}', 2, 'hyde-park', 'chicago',
    41.799999, -87.596122, false, '{"vegetarian","vegan"}', '{}',
    'Sudki Abdullah''s falafel recipe from 1992, now carried by his son Amer — a Hyde Park fixture that survived a change of hands without changing its character.',
    '{afternoon,evening}', 73, 'live', 'texture', 1,
    3, 'independent', 'Sudki Abdullah opened 1992; son Amer Abdullah runs it today. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'the-snail-thai-cuisine', 'The Snail Thai Cuisine', 'THAI RESTAURANT', '{}', 2, 'hyde-park', 'chicago',
    41.795129, -87.584784, false, '{"vegetarian"}', '{}',
    'Run by a former nurse who traded hospital shifts in Thailand and Switzerland for a stove on 55th Street — traditional Thai cooking with no interest in being anyone''s concept.',
    '{evening}', 72, 'live', 'texture', 1,
    3, 'independent', 'Single location, owner formerly a nurse in Thailand/Switzerland. Verified 2026-09-18.', 'live'
  ),
  (
    'the-nile-of-hyde-park', 'The Nile of Hyde Park', 'MIDDLE EASTERN', '{}', 2, 'hyde-park', 'chicago',
    41.795180, -87.597126, false, '{"vegetarian","halal"}', '{}',
    'Family-run since 1991, doing unfussy Middle Eastern plates at prices that haven''t chased the neighbourhood''s gentrification upward.',
    '{afternoon,evening}', 72, 'live', 'texture', 1,
    3, 'independent', 'Founded 1991 by chef/owner Abed Moughrabi, family-run. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'rajun-cajun', 'Rajun Cajun', 'INDIAN-SOUTHERN FUSION', '{}', 2, 'hyde-park', 'chicago',
    41.799425, -87.589506, false, '{"vegetarian"}', '{}',
    'Indian specialties sitting on the same menu as Southern soul food since 1993 — a combination nobody else in the city has bothered to attempt, let alone for three decades running.',
    '{afternoon,evening}', 87, 'live', 'texture', 1,
    5, 'independent', 'Trushar & Anila Patel, opened 1993. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'ja-grill', 'Ja'' Grill', 'CARIBBEAN RESTAURANT', '{}', 2, 'hyde-park', 'chicago',
    41.800453, -87.588764, false, '{"none"}', '{}',
    'Jerk chicken and curry goat from a Jamaican kitchen that left Lincoln Park for Hyde Park and never looked back — ten years in and the jerk still comes off a real fire.',
    '{afternoon,evening}', 73, 'live', 'texture', 1,
    3, 'independent', 'Owner Tony Coates; relocated from Lincoln Park, a former Ogden Commons outpost has since closed, leaving this as the sole location. Verified 2026-09-18.', 'live'
  ),
  (
    'nella-pizza-e-pasta', 'Nella Pizza e Pasta', 'PIZZERIA', '{}', 3, 'hyde-park', 'chicago',
    41.794875, -87.598764, false, '{"vegetarian"}', '{}',
    'Nella Grassano''s Neapolitan dough earns a Michelin nod most pizzerias would kill for — the kind of place you''d take a visiting food-obsessed colleague without hedging.',
    '{evening}', 90, 'live', 'texture', 1,
    5, 'independent', 'Chef/owner Nella Grassano. Michelin Guide-recognized. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'virtue-restaurant-bar', 'Virtue Restaurant & Bar', 'SOUTHERN RESTAURANT', '{}', 4, 'hyde-park', 'chicago',
    41.799668, -87.589300, false, '{"vegetarian","gluten-free"}', '{}',
    'James Beard-winning Southern cooking two blocks from campus, with a Michelin Bib Gourmand to back up what the room already knows — book ahead.',
    '{evening}', 92, 'live', 'texture', 1,
    5, 'small_group', 'Chef-owned by Erick Williams, James Beard Award winner, Michelin Bib Gourmand. Williams also owns Cantina Rosa (below) — two sites under one small local group. Verified 2026-09-18.', 'live'
  ),
  (
    'jimmy-s-woodlawn-tap', 'Jimmy''s (Woodlawn Tap)', 'DIVE BAR', '{}', 1, 'hyde-park', 'chicago',
    41.795198, -87.596852, false, '{"none"}', '{}',
    'A tavern that''s outlasted six decades of faculty arguments and undergrad heartbreak alike — cheap pitchers, no pretensions, and a booth Obama used to actually sit in.',
    '{evening,late}', 82, 'live', 'texture', 1,
    5, 'independent', 'Single location since 1948, opened by Jimmy Wilson, now family/staff-run. Verified 2026-09-18.', 'live'
  ),
  (
    'cantina-rosa', 'Cantina Rosa', 'COCKTAIL BAR', '{}', 3, 'hyde-park', 'chicago',
    41.800033, -87.589298, false, '{"vegetarian"}', '{}',
    'Virtue''s Erick Williams turned his attention to agave — the neighbourhood''s only real craft cocktail bar, and it didn''t need to try hard to become the best one.',
    '{evening}', 85, 'live', 'texture', 1,
    5, 'small_group', 'Chef Erick Williams with Jesus Garcia (Virtue''s spirits director) — same small group as Virtue. Verified 2026-09-18.', 'live'
  ),
  (
    'bardavid', 'BarDavid', 'WINE BAR', '{}', 3, 'hyde-park', 'chicago',
    41.785763, -87.595806, false, '{"vegetarian"}', '{}',
    'A curated wine list and Mediterranean small plates inside the university''s own conference forum — sophisticated enough that it''s easy to forget it''s technically a campus building.',
    '{evening}', 78, 'live', 'texture', 1,
    4, 'independent', 'Single-site venue inside the University of Chicago''s David Rubenstein Forum; food/bev run by hospitality operator Benchmark, not a commercial chain. Verified 2026-09-18.', 'live'
  ),
  (
    'sophy-hyde-park-mesler', 'Sophy Hyde Park (Mesler)', 'HOTEL BAR', '{}', 3, 'hyde-park', 'chicago',
    41.799272, -87.591405, false, '{"none"}', '{}',
    'The bar at Hyde Park''s first real boutique hotel — the kind of room you''d actually suggest meeting a professor for a drink, not just somewhere to park out-of-town guests.',
    '{evening}', 74, 'live', 'texture', 1,
    3, 'small_group', 'Olympia Companies/SMART Hotels boutique brand — this is their Hyde Park flagship, not a mass-market hotel chain. Verified 2026-09-18.', 'live'
  ),
  (
    'the-study-at-university-of-chicago-truth-be-told', 'The Study at University of Chicago (Truth Be Told)', 'HOTEL BAR', '{}', 3, 'hyde-park', 'chicago',
    41.785669, -87.595039, false, '{"none"}', '{}',
    'A British-pub-inspired kitchen and bar inside the campus''s own boutique hotel — tavern food done properly, open till the bar closes.',
    '{evening,late}', 74, 'live', 'texture', 1,
    3, 'small_group', 'Study Hotels brand — 3 properties total (Yale, Penn, UChicago), an academic-boutique hospitality group, not mass-market. Verified 2026-09-18.', 'live'
  ),
  (
    'la-boulangerie-co-hyde-park', 'La Boulangerie & Co (Hyde Park)', 'BAKERY', '{}', 2, 'hyde-park', 'chicago',
    41.795383, -87.588294, false, '{"vegetarian"}', '{}',
    'Paris-trained Vincent Colombet''s fourth Chicago outpost, in the storefront a beloved French bakery held for 27 years before it — the croissants are laminated on-site, not trucked in.',
    '{morning}', 76, 'live', 'texture', 1,
    3, 'small_group', 'Chef/owner Vincent Colombet, 4 Chicago locations (Logan Square, Humboldt Park, Ravenswood, Hyde Park) — Chicago-only, not national. Verified 2026-09-18.', 'live'
  ),
  (
    'sip-savor-53rd-street', 'Sip & Savor (53rd Street)', 'COFFEE ROOM', '{}', 1, 'hyde-park', 'chicago',
    41.799479, -87.583824, false, '{"vegetarian","vegan"}', '{}',
    'Trez Pugh opened the original on this stretch in 2012 before Sip & Savor became a five-location South Side name — this is still the one that started it.',
    '{morning,afternoon}', 71, 'live', 'texture', 1,
    3, 'small_group', 'Owner Trez Pugh III opened this original location in 2012 before expanding to 5 South Side/Chicago locations — still independently owned, not a franchise. Verified 2026-09-18.', 'live'
  ),
  (
    'sweet-drip-dessert-cafe', 'Sweet Drip Dessert Cafe', 'DESSERT CAFE', '{}', 1, 'hyde-park', 'chicago',
    41.799685, -87.584492, false, '{"vegetarian"}', '{}',
    'Boba and dessert plates on 53rd, run by two cousins who bought the name and the lease together in 2023 rather than let a neighbourhood fixture disappear.',
    '{afternoon,evening}', 65, 'live', 'texture', 1,
    2, 'independent', 'Cousins Zuhlil Khalil and Mohammad Zomot bought the lease and business name in 2023. Verified 2026-09-18.', 'live'
  ),
  (
    'seminary-co-op-bookstore', 'Seminary Co-op Bookstore', 'INDEPENDENT BOOKSHOP', '{}', 2, 'hyde-park', 'chicago',
    41.790129, -87.596079, false, '{"none"}', '{}',
    'A nonprofit since 1961 and still the first call for a serious academic text anywhere in the city — the basement stacks reward browsing more than searching.',
    '{afternoon}', 90, 'live', 'texture', 1,
    5, 'independent', 'Nonprofit since 1961 (converted from member co-op to 501(c)(3) in 2019). Verified 2026-09-18.', 'live'
  ),
  (
    '57th-street-books', '57th Street Books', 'INDEPENDENT BOOKSHOP', '{}', 2, 'hyde-park', 'chicago',
    41.791317, -87.594634, false, '{"none"}', '{}',
    'The Co-op''s general-interest sibling, tucked half underground on 57th — fiction and children''s books where the flagship keeps to scholarship.',
    '{afternoon}', 82, 'live', 'texture', 1,
    4, 'independent', 'Same nonprofit as Seminary Co-op (sister store, general-interest focus). Verified 2026-09-18.', 'live'
  ),
  (
    'powell-s-books-chicago', 'Powell''s Books Chicago', 'INDEPENDENT BOOKSHOP', '{}', 2, 'hyde-park', 'chicago',
    41.791314, -87.588874, false, '{"none"}', '{}',
    'Same address since a U of C grad student opened it in 1970, and still the city''s biggest independent dealer in used and antiquarian stock — no relation to the Portland namesake, just a shared instinct for the shelves.',
    '{afternoon}', 82, 'live', 'texture', 1,
    4, 'independent', 'Founded 1970 by a U of C grad student, current owner Bradley Jonas; unrelated to the Portland, OR Powell''s despite shared name. Verified 2026-09-18.', 'live'
  ),
  (
    'the-silver-room', 'The Silver Room', 'BOUTIQUE', '{}', 3, 'hyde-park', 'chicago',
    41.799694, -87.588838, false, '{"none"}', '{}',
    'Part jewelry counter, part gallery, part the closest thing Hyde Park has to a cultural living room — Eric Williams has run it as all three since 1997.',
    '{afternoon}', 81, 'live', 'texture', 1,
    4, 'independent', 'Founder Eric Williams, single location since relocating from Wicker Park in 2015 (business founded 1997). Verified 2026-09-18.', 'live'
  ),
  (
    'hyde-park-records', 'Hyde Park Records', 'RECORD SHOP', '{}', 2, 'hyde-park', 'chicago',
    41.799271, -87.592083, false, '{"none"}', '{}',
    'Dustys, old soul, jazz and hip-hop crates a decade deep, in a shop that''s been trading vinyl on 53rd since the 1970s under one name or another.',
    '{afternoon}', 79, 'live', 'texture', 1,
    4, 'independent', 'Owner Alexis Bouteville took over the 1970s-era Second Hand Tunes in 2011 and renamed it. Verified 2026-09-18.', 'live'
  ),
  (
    'bob-s-pizza', 'Bob''s Pizza', 'PIZZERIA', '{}', 2, 'hyde-park', 'chicago',
    41.800435, -87.588169, false, '{"vegetarian"}', '{}',
    'Pilsen-style dough built on Old Style beer and a pickle pizza that shouldn''t work — the fourth outpost of a pizza project that started three miles north in 2019.',
    '{evening}', 79, 'live', 'texture', 1,
    4, 'small_group', 'Chef/partner Matt Wilde, 4 Chicago-area locations (Pilsen original 2019, Old Town, Evanston, Hyde Park) — Chicago-only, chef-driven. Verified 2026-09-18.', 'live'
  ),
  (
    'frederick-c-robie-house', 'Frederick C. Robie House', 'HISTORIC HOUSE', '{}', 2, 'hyde-park', 'chicago',
    41.789789, -87.595994, false, '{"none"}', '{}',
    'A UNESCO World Heritage building and arguably Wright''s masterwork, still standing exactly where he built it — the guided tour is worth the ticket price alone.',
    '{afternoon}', 92, 'live', 'texture', 1,
    5, 'independent', 'Nonprofit Frank Lloyd Wright Trust (also stewards a few other FLW Chicago-area sites — a small nonprofit steward, not a commercial operator). UNESCO World Heritage Site. Verified 2026-09-18.', 'live'
  ),
  (
    'institute-for-the-study-of-ancient-cultures-museum', 'Institute for the Study of Ancient Cultures Museum', 'MUSEUM', '{}', 1, 'hyde-park', 'chicago',
    41.789245, -87.597718, false, '{"none"}', '{}',
    'Ten thousand years of the ancient Near East, free to walk through, reservations required — the kind of collection that would charge admission anywhere else in the world.',
    '{afternoon}', 90, 'live', 'texture', 1,
    5, 'independent', 'University of Chicago''s own institute museum (formerly the Oriental Institute), single site. Verified 2026-09-18.', 'live'
  ),
  (
    'smart-museum-of-art', 'Smart Museum of Art', 'MUSEUM', '{}', 1, 'hyde-park', 'chicago',
    41.793512, -87.600187, false, '{"none"}', '{}',
    'The university''s own art museum, always free, with a collection deep enough that a lunchtime visit never quite covers all 15,000 objects.',
    '{afternoon}', 80, 'live', 'texture', 1,
    4, 'independent', 'University of Chicago''s own art museum, single site. Verified 2026-09-18.', 'live'
  ),
  (
    'norman-s-bistro', 'Norman''s Bistro', 'CREOLE-BRAZILIAN', '{}', 3, 'kenwood', 'chicago',
    41.816704, -87.601472, false, '{"vegetarian"}', '{}',
    'Norman Bolden built this stretch of 43rd Street out of his father''s old shop — Creole cooking with a Brazilian accent, and a Sunday-night jazz set that runs past last orders.',
    '{evening,late}', 88, 'live', 'texture', 1,
    5, 'independent', 'Single owner-operator Norman Bolden, a former WGCI radio host who bought back his father''s old commercial strip on 43rd St. Not a multi-site group. Verified 2026-09-18.', 'live'
  ),
  (
    'gor-e-cuisine', 'Gorée Cuisine', 'SENEGALESE', '{}', 3, 'kenwood', 'chicago',
    41.809746, -87.598113, false, '{"halal"}', '{}',
    'Adama Ba modeled the kitchen on his family''s own restaurant on Gorée Island — the yassa and dibi lamb arrive with a side you didn''t order and won''t mind.',
    '{evening}', 88, 'live', 'texture', 1,
    5, 'independent', 'Family-owned by Adama Ba, modeled directly on his family''s own restaurant on Gorée Island, Dakar. Single location, est. 2015. Verified 2026-09-18.', 'live'
  ),
  (
    'carver-47-food-wellness-market', 'Carver 47 Food & Wellness Market', 'COFFEE ROOM', '{}', 2, 'kenwood', 'chicago',
    41.809683, -87.600463, false, '{"vegetarian"}', '{}',
    'Coffee, quiche, and a shelf of spice jars and spa products inside Little Black Pearl''s arts campus — a neighbourhood market that happens to double as a gallery.',
    '{morning,afternoon}', 76, 'live', 'texture', 1,
    4, 'independent', 'Independent, nonprofit-embedded — operates inside/affiliated with Little Black Pearl, a South Side youth arts nonprofit. Not a franchise or chain. Verified 2026-09-18.', 'live'
  ),
  (
    'robust-coffee-lounge', 'Robust Coffee Lounge', 'COFFEE ROOM', '{}', 1, 'woodlawn', 'chicago',
    41.780362, -87.596382, false, '{"vegetarian"}', '{}',
    'A restored 1890 storefront that was betting on Woodlawn''s revival a decade before the Obama Center made it fashionable — the biscuits are the real reason regulars keep coming back.',
    '{morning,afternoon}', 80, 'live', 'texture', 1,
    4, 'independent', 'Co-owned by Jake Sapstein and Derek Cortelyou since ~2010; single location. Verified 2026-09-18.', 'live'
  ),
  (
    'build-coffee-books', 'Build Coffee & Books', 'COFFEE ROOM', '{}', 1, 'woodlawn', 'chicago',
    41.784210, -87.590494, false, '{"vegetarian","vegan"}', '{}',
    'Coffee, secondhand books, and a gallery wall sharing one converted bike-shop building — saved from sale in 2025 by a handful of regulars who refused to let it become something else.',
    '{morning,afternoon}', 90, 'live', 'texture', 1,
    5, 'independent', 'Community-owned — bought out of a for-sale listing in 2025 by a volunteer trio (Eve L. Ewing, trína reynolds-tyler, Andrea Faye Hart) specifically to keep it independent. Verified 2026-09-18.', 'live'
  ),
  (
    'daley-s-restaurant', 'Daley''s Restaurant', 'DINER', '{}', 2, 'woodlawn', 'chicago',
    41.780576, -87.605602, false, '{"none"}', '{}',
    'Chicago''s oldest restaurant, on its fourth address in Woodlawn since 1892 — chicken and waffles, salmon croquettes, and a counter that''s outlasted every trend the neighbourhood has been through.',
    '{morning,afternoon}', 86, 'live', 'texture', 1,
    5, 'independent', 'Chicago''s oldest continuously operating restaurant (opened 1892), family-owned since 1918, currently run by Mike Zar. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    '7323-chicago-caf', '7323 Chicago Café', 'COFFEE ROOM', '{}', 1, 'woodlawn', 'chicago',
    41.774930, -87.596184, false, '{"vegetarian"}', '{}',
    'A shipping container in Flying Squirrel Park doing sun-dried-tomato paninis and honey-lavender lemonade — open May to October only, so it disappears every winter and nobody minds waiting for it.',
    '{afternoon}', 70, 'live', 'texture', 1,
    4, 'independent', 'Sole owner-operator Marquinn Gibson, one seasonal location. SEASONAL: open May 1–Oct 10 only, closed Nov–April. Verified 2026-09-18.', 'live'
  ),
  (
    'let-s-eat-to-live', 'Let’s Eat To Live', 'SOUL FOOD', '{}', 2, 'woodlawn', 'chicago',
    41.772900, -87.609752, false, '{"halal","vegetarian"}', '{}',
    'Escovitch snapper and halal lamb chops from a kitchen that grows some of its own vegetables on the same block — and gives away 150 meals every Sunday whether you''re a customer or not.',
    '{afternoon,evening}', 82, 'live', 'texture', 1,
    4, 'independent', 'Black women-owned and Muslim-owned; opened 2022 by owner Carmella Coq''mard. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'tafari-s-kitchen', 'Tafari''s Kitchen', 'CELEBRATORY', '{}', 2, 'woodlawn', 'chicago',
    41.786246, -87.585878, false, '{"none"}', '{}',
    'The only restaurant inside the Obama Presidential Center, named for the family''s own longtime chef — chili and ribs built for a room that''s already a landmark before you''ve ordered.',
    '{afternoon,evening}', 85, 'live', 'texture', 1,
    5, 'small_group', 'Creative concept curated by Chef Cliff Rome (Rome''s Joy Companies — a real South Side-only restaurant portfolio, one owner, no franchise ambition). Day-to-day food service is operated under contract by Bon Appétit Management Company (part of Compass Group, a large national contract caterer) — flagged transparently: the brand and menu are locally chef-driven and site-unique, the operator behind daily service is not small. Verified 2026-09-18.', 'live'
  ),
  (
    '61st-street-farmers-market', '61st Street Farmers Market', 'ARTISAN MARKET', '{}', 1, 'woodlawn', 'chicago',
    41.784210, -87.590494, false, '{"vegetarian","vegan"}', '{}',
    'Thirty-odd stalls outside the same building as Build Coffee, running LINK-match Saturdays since 2008 — the kind of market that was feeding the neighbourhood long before anyone was writing about Woodlawn''s comeback.',
    '{morning}', 76, 'live', 'texture', 1,
    4, 'independent', 'Run by Experimental Station (a nonprofit), 25–30 small vendor/farm stalls. SEASONAL: Saturdays only, 9am–2pm, May 16–Oct 31. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
