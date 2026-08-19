# Model & Mechanism — Raw Sector Research Reports

These are the six full, unedited reports returned by the parallel sector research subagents. The synthesized, ranked version of this material is in `model-and-mechanism-target-report.md` in this same folder — read that first for the merged shortlist and recommendations. This file is the underlying raw material, kept for traceability and so nothing gets lost in the synthesis.

Each report includes its own methodology notes and tool-access caveats (WebFetch was blocked for most domains in every pass; WebSearch budgets ran out mid-pass in several).

---

## 1. Logistics, Freight & Shipping

# Research Findings: UK Logistics/Freight/Shipping SME Leads for Model & Mechanism

**Methodology note (read first):** WebFetch was completely blocked by the network egress proxy for every domain tested in this environment (including Companies House, company websites, Wikipedia, and even example.com), so all findings below come from WebSearch result snippets/summaries only — I could not read full company pages, job postings, or case studies directly. This meaningfully limits the depth of "direct quote" evidence for the problem signature (email-based booking, PDF rate sheets, etc.); where I couldn't get a direct quote, I've said so rather than inferring one. Treat company-specific pain evidence below as lower-confidence than it would be with full-page access, and treat all financial figures not explicitly sourced from a Companies House-derived press article as **estimates**.

---

### Ranked Candidates

#### 1. Warrant Group Ltd — Liverpool, Merseyside
- **Revenue:** £43.9m in FY to 31 Jan 2024, **down 44%** from the prior year (implying prior-year revenue of roughly £78m). Source: [Liverpool Business News](https://lbndaily.co.uk/tough-trading-hits-liverpool-freight-firm-revenues/) reporting on filed accounts — this is a hard, sourced figure, not a scrape estimate.
- **Headcount:** Reported as "around 60" employees in the same press coverage; other directory sources (ZoomInfo-derived) say ~86. Treat as ~60–90, **estimated range**.
- **What they run on:** Employee-owned trust; markets an "EDI connected global network," a "Warrant Portal," and a "Technology Portal" alongside Air/Road/Sea Freight, Customs, Haulage and Storage as separate service lines. The existence of a named "portal" product suggests partial digitization, but a forwarder spanning air/road/sea/customs/haulage/storage as distinct lines is a strong structural signal for cross-system handoffs (each mode typically has its own booking/documentation system).
- **Evidence of translation-layer problem:** Not directly confirmed — no quote found describing manual re-entry. Inferred from service breadth + the revenue collapse (a company under margin pressure from falling freight rates/volumes is a company that has stopped investing in tooling and is more likely leaning on manual workarounds to survive).
- **Confidence:** **Medium.** Strong, hard-sourced ICP fit on revenue/headcount/location; pain is inferred, not confirmed.
- **Sources:** [Liverpool Business News](https://lbndaily.co.uk/tough-trading-hits-liverpool-freight-firm-revenues/), [Insider Media (Warrant Group tag)](https://www.insidermedia.com/news/north-west/tag/Warrant+Group), [BIFA member listing](https://bifa.org/members/warrant-group-ltd/)

#### 2. Harrison Solway Logistics Ltd — Hull, East Yorkshire
- **Revenue:** Not publicly disclosed (files small-company accounts without a P&L). companycheck.co.uk snippet shows total assets £4.94m, net assets £1.3m as of latest accounts (year end 30 June 2025) — **balance-sheet data only, no turnover figure available**. Given headcount and sector, a plausible **estimated** revenue band is £10–20m, but this is a guess, not a filing.
- **Headcount:** ~80 staff, per company's own 25th-anniversary coverage. Source: [The Haulier](https://thehaulier.co.uk/lead-story/harrison-solway-celebrates-25-years-after-1-buyout-success-story/) / [Pallet-Track](https://pallet-track.co.uk/hulls-harrison-solway-celebrating-25-years-in-business/).
- **What they run on:** Started as a £1 management buyout in 2000 (10 vehicles, 17 staff); now 40 vehicles, 50 trailers, 12,000-pallet BRCGS-accredited storage. Up to 45% of turnover comes from pallet-network shipments; specialises in food/grocery/retail/construction 3PL — a sector notorious for proof-of-delivery, allocation, and customer-specific paperwork handled outside the core TMS.
- **Evidence of translation-layer problem:** Not directly confirmed by a quote — no case study or job posting text was retrievable. Inferred from company profile (long-established regional 3PL, food/grocery focus, no visible customer self-service portal in search snippets).
- **Confidence:** **Medium on ICP structural fit, low on direct pain evidence.**
- **Sources:** [The Haulier](https://thehaulier.co.uk/lead-story/harrison-solway-celebrates-25-years-after-1-buyout-success-story/), [Pallet-Track](https://pallet-track.co.uk/hulls-harrison-solway-celebrating-25-years-in-business/), [Companies House record](https://find-and-update.company-information.service.gov.uk/company/03953616) (03953616)

#### 3. Bowker Group / W.H. Bowker Ltd / Bowker Transport — Bamber Bridge, Preston, Lancashire
- **Revenue:** Conflicting, low-confidence estimates: Growjo lists ~$117.3m for "Bowker Group"; RocketReach lists ~$61.8m for "Bowker Preston Limited" specifically. **Both are directory-estimate figures, not filed-accounts figures — flag as unconfirmed and possibly conflating the haulage business with an affiliated Bowker Motor Group car dealership.**
- **Headcount:** 114 employees (directory-sourced, likely for the transport/logistics entity specifically).
- **What they run on:** Family-owned since 1919, fleet of 265 vehicles/500 trailers, specialising in food/pharma/chemical distribution and international sea/road freight. **Important caveat:** the company's own marketing ("Logistics driven by technology") states its WMS/TMS interfaces were "developed by their in-house IT experts," and describes having previously had to "collate information from three different systems" before consolidating — meaning they may already have real internal dev capability, which cuts against the ICP's "no meaningful internal dev capability" requirement. This is worth confirming with a live conversation, not assuming from the marketing copy.
- **Evidence of translation-layer problem:** The "three different systems" line is the closest thing to a direct quote found for any candidate in this research — though it's presented as a past problem the company says it already solved.
- **Confidence:** **Low-medium.** Good headcount/sector fit, but revenue is unreliable and the "already has in-house IT" signal is a real yellow flag against ICP fit.
- **Sources:** [Bowker Transport — "Logistics driven by technology"](https://www.bowkertransport.co.uk/logistics-driven-by-technology), [Companies House (W.H. Bowker Ltd, 00364757)](https://find-and-update.company-information.service.gov.uk/company/00364757)

#### 4. Jenkar Shipping Ltd — Wakefield, West Yorkshire
- **Revenue:** ~$6.4m (2025), i.e. roughly **£5m** — **below the £10m ICP floor.**
- **Headcount:** 47 employees (up 9% year-on-year per directory snippet), founded 1978.
- **What they run on:** Independent freight forwarder offering air/sea/road freight, customs clearance, vehicle shipping, warehousing and distribution — the multi-modal + customs combination is exactly the kind of operation the brief flags as heavy on manual document/email coordination.
- **Evidence of translation-layer problem:** Not directly confirmed; no case-study or job-ad text retrieved.
- **Confidence:** **Low** on revenue fit (sub-scale), **medium** on structural/sector fit. Worth keeping on a watchlist as a "grows into ICP" prospect rather than a first-call target.
- **Sources:** [Companies House (01357235)](https://find-and-update.company-information.service.gov.uk/company/01357235), [company site](https://www.jenkar.com/)

#### 5. Carry Cargo International Ltd — Leeds, West Yorkshire
- **Revenue / headcount:** Not found — no financial or staffing data surfaced in search results despite several targeted queries.
- **What they run on:** Independent international freight forwarder (company reg. 03421745), explicitly positions itself as serving "companies, both small and large, who do not have their own shipping department" — i.e., it exists to be the outsourced admin layer for other SMEs, which is itself a signal that internal admin-heavy coordination is core to the business model.
- **Evidence of translation-layer problem:** Inferred only, from business-model description.
- **Confidence:** **Low** — thin evidence overall, included because the business-model description is suggestive; would need a live call or Companies House pull (blocked in this session) to validate size.
- **Source:** [carrycargo.com](https://www.carrycargo.com/about-us/)

#### 6. Suttle Transport Services Ltd — Tockwith/York, North Yorkshire
- **Revenue / headcount:** Not found beyond cash-at-bank figures (£450k in 2022) — no turnover or staff count surfaced.
- **What they run on:** Family-run (Suttle family, per Companies House officer listing), general haulage + same-day courier + live event trucking, offices in Leeds and York.
- **Confidence:** **Low** — insufficient evidence to rank higher; flagged for further digging rather than as a strong lead.
- **Source:** [Companies House (08496127)](https://find-and-update.company-information.service.gov.uk/company/08496127)

#### Noted but deprioritised (informative, not primary targets)
- **Newell & Wright Group** (Sheffield, South Yorkshire) — rail freight/container haulage specialist, turnover >£50m as of 2011 accounts, but headcount now **400+ employees**, well above the 150-employee ICP ceiling. Useful as a "what this vertical looks like at scale" reference, not a first-customer target.
- **Good Logistics** (Hull/Grimsby, est. 1833, 6th-generation family business) — 250+ employees, also above the ICP headcount ceiling, but a striking illustration of how a two-century-old family freight business accumulates legacy-system debt; worth revisiting if the ICP headcount band is ever relaxed upward, or if a specific business unit within the group is smaller.
- **George Baker (Shipping) Ltd** — family business since 1982, ~78 employees, but headquartered in **Felixstowe (Suffolk)**, not North of England, despite serving Humber ports; revenue estimate only ~$5.5m. Weak geographic and revenue fit.

---

### Market-Level Evidence (Incumbent Software Fragmentation)

A May 2026 industry report — *"The Freight Tech Stack of 2026"* by Softlink Academy/Softlink Global, covered by [The Loadstar](https://theloadstar.com/ls_press_release/freight-forwarders-are-running-on-fragmented-systems-and-the-industry-is-paying-the-price-says-new-report-by-softlink-global/) — states directly that **"the majority of freight forwarders today continue to operate with operations running in one system, finance managed in another, CRM housed somewhere else, and Excel holding everything together,"** and that most forwarders are "not running a tech stack, they are managing chaos." This is a global/industry-wide claim (not UK-specific and published by a TMS vendor with an obvious incentive to say this), so it should be weighted as **corroborating, not proof** — but it does independently confirm the thesis's core assumption from a source outside this research.

Separately, general market commentary on freight forwarding software (GoFreight, Dockflow, Logifie blog content surfaced in search) consistently describes the incumbent options as splitting into: legacy on-premise TMS, generic ERPs with logistics bolt-ons, and modern cloud SaaS (CargoWise, Magaya, GoFreight, Descartes) built primarily for **larger, higher-volume forwarders**. Nothing in the research surfaced a UK-specific, SME-focused, affordably-priced tool aimed at the exact profile in the ICP (20–150 staff, £10–100m revenue, one legacy system + Office tools) — consistent with the "no obvious solution" hypothesis, though I could not exhaustively survey the full vendor landscape given the search-budget limit reached during this session.

---

### Verdict: Is Logistics/Freight/Shipping a Repeatable, Product-Worthy Market?

**Cautiously yes, but confidence is moderate rather than high, and this research session under-delivered on direct company-specific pain quotes due to tooling constraints (WebFetch fully blocked).** The structural case is sound: the North of England has a real concentration of independent, family-owned or employee-owned freight forwarders, customs agents, and 3PL/haulage firms clustered around the Humber ports (Hull/Grimsby/Immingham), Liverpool, and the Leeds/Wakefield/Preston motorway corridors — likely **dozens to low hundreds** of firms in the ICP's revenue/headcount band across just these regions, given how many were surfaced from a handful of searches without exhausting the space (Jenkar, Carry Cargo, Suttle, George Baker, and many unresearched others like KWL Logistics, Global Customs Clearance, Barrington Freight, OTS Broker all appeared as adjacent candidates). Incumbent software is genuinely bifurcated — enterprise-grade platforms (CargoWise, Magaya) at the top, and Excel/email/one legacy TMS at the SME end, which matches the thesis closely and is independently corroborated by a 2026 industry report. **The weakest part of this verdict is direct evidence**: across five candidate companies, I found only one near-quote of an actual system-fragmentation admission (Bowker's "collate information from three different systems," which the company frames as already-solved), and zero instances of the specific "we copy that from here into here" or "only one person knows how that works" phrasing the brief asked me to hunt for. That absence is very likely a function of this session's WebFetch being blocked outright (no access to job ad full text, LinkedIn posts, trade-press articles, or company blogs beyond search-snippet summaries) rather than evidence the pain doesn't exist — but it means the pain-severity ratings above should be read as **structurally plausible and industry-corroborated, not company-confirmed**, and the next research pass should prioritize working WebFetch/browsing access (or direct outreach/calls) over further blind search-snippet mining.

---

## 2. Construction Plant & Equipment Hire

# UK Plant & Equipment Hire — Lead Research Report

**Methodology note (read first):** In this environment, `WebFetch` was blocked by network egress policy for every domain tested (Companies House, company websites, RocketReach, Wikipedia, business press) — so all findings below come from `WebSearch` result snippets and the AI-summarized text those searches return, not from directly-read primary documents. Companies House financial/employee figures in particular could not be pulled from the primary filing pages; I've used secondary aggregators (Pomanda, RocketReach, ZoomInfo, Endole, Companycheck) which are known to be inconsistent with each other and sometimes clearly wrong (e.g. RocketReach repeatedly returned "1 employee" for firms that obviously run multi-depot operations — treat any RocketReach-sourced employee count as unreliable). Where sources conflict I've reported the range and flagged confidence accordingly. A follow-up pass with direct Companies House access would materially firm up the revenue/headcount numbers.

---

### 1. THE "EASY HIRE" QUESTION — RESOLVED (with a clear negative finding)

There is **no single company called "Easy Hire"** in UK plant/tool hire — the name is a generic, unprotected trade name and at least **six to nine separate, unrelated small businesses** use some variant of it. I found and disambiguated the following distinct Companies House entities:

| Entity | Co. number | Location | Status | Notes |
|---|---|---|---|---|
| **Easy Hire Plant & Tool Limited** | 07960771 | Stockport, Cheshire (Georges Road, SK4 1DN) | **Dissolved 30 July 2024** | Family-run North West plant/tool hire, non-operated plant 0.8–9 tonne. Website (easyhirestockport.com) appears to still exist but the registered company behind it has been dissolved — needs re-verification of current trading status. |
| **Easyhire Plant Limited** | 07313885 | Whitchurch, Shropshire | Active | MD Darren Stokes. "Nationwide" CPCS plant-operator hire + BOSS/EasyCabin welfare units and portable toilets. Small (RocketReach: ~$5.1M revenue, "1 employee" — low confidence). Shropshire is West Midlands-adjacent, not North of England. |
| **Easy Hire North East Limited** | 09454330 | Hexham, Northumberland / Consett, Co. Durham | Active | Companies House classifies it a **Micro entity: turnover under £1M**, balance sheet under £500k. Two-depot tool/plant hire, family-run, 20+ years trading claimed. Genuinely North East but far too small for ICP. |
| **Easy Plant Hire Limited** | 10600044 | Registered office: Lynton House, Tavistock Square, **London** | Active | Registered office looks like an accountant's address, not necessarily where it operates — unresolved where it actually trades. |
| **Easy Hire (Plant Hire) LTD** | 13025202 | Wheldrake, York | Active, incorporated 2020 | New entrant, size unknown/unconfirmed. |
| **Easy-Hire (Power Tools) Limited** | 01623005 | — | — | Power tools, not plant. Different category entirely. |
| **Easy Hire Limited** | 00853702 | — | — | Generic name, sector unconfirmed. |
| **Easy Hire Services Limited** | 06679572 | — | — | Sector unconfirmed. |
| **Easy Access Plant Hire Ltd** | 13370639 | — | — | Access-equipment specific, unconfirmed size. |

**Verdict on "Easy Hire":** every identified entity is either dissolved, a micro-business under £1M turnover, or of unconfirmed/unverifiable size — none plausibly reaches the £10M–£100M revenue / 20–150 employee ICP band. This was worth chasing down precisely because the ambiguity was flagged, but the name itself is a dead end as a *specific* first-customer lead. It is, however, a useful illustration of the sector's texture: it's full of small, similarly-named, family-run independents — exactly the fragmented long tail the brief describes, just not at the size Model & Mechanism needs for a first customer. **Recommend dropping "Easy Hire" as a named target and redirecting toward the candidates in Section 2, which are real, verifiably-larger, and evidenced.**

---

### 2. RANKED CANDIDATES

Ranked by (pain evidence confidence × ICP fit). All are construction plant/tool/welfare hire operators; all but one are North of England-based per the brief's preference.

#### 1. Chippindale Plant Limited — Leeds, West Yorkshire (HQ), 9 depots across the North
- **Revenue:** ~£20M (2021 press figure, Yorkshire Post — "the £20m turnover family firm... one of the largest privately-owned hire and sales companies in the UK")
- **Headcount:** ~120 employees (multiple sources agree)
- **Locations/depots:** Leeds (HQ, Wortley), Catterick, Huddersfield, Keighley, Newcastle, Manchester, Sheffield, York — 9 sites, squarely North of England
- **System evidence:** Company number 00467731, founded 1949 as a family business. **Acquired 1 June 2022 by AER Rents** — this is a meaningful caveat: post-acquisition, IT decisions may now run through a parent group rather than a single accessible owner-operator, which could change the "no internal dev capability" assumption and the sales motion (a group may already be standardizing on shared tooling).
- **Translation-layer evidence:** Live/recurring **"Hire Controller" and "Hire Desk Manager"** job postings across nearly every depot (Leeds, Newcastle, Manchester, Keighley, Sheffield, York, Catterick, Huddersfield), each described as "processing orders," "preparing and chasing up quotations," "general administrative duties and resolution of queries" — a strong signal of admin-heavy, per-depot manual order handling replicated 9 times over.
- **Confidence:** Medium-high on pain being real (multi-depot + heavy admin-role hiring is a strong structural signal); medium on approachability given the 2022 acquisition.
- **Sources:** [Yorkshire Post](https://www.yorkshirepost.co.uk/business/chippindale-plant-invests-over-ps2m-in-new-kit-as-construction-drives-demand-3314112), [PitchBook](https://pitchbook.com/profiles/company/99788-32), [Companies House](https://find-and-update.company-information.service.gov.uk/company/00467731), [ZipRecruiter hire controller listing](https://www.ziprecruiter.co.uk/jobs/477237086-hire-controller-at-chippindale), [Chippindale careers page](https://chippindale-plant.co.uk/blogs/careers)

#### 2. Fairfax Plant Hire Limited — Selby, North Yorkshire (HQ), depot also in Leeds
- **Revenue:** ~£21.2M (aggregator estimate, moderate confidence — not a direct Companies House pull)
- **Headcount:** ~50 employees (same source)
- **Coverage:** Serves Selby, Leeds, Hull, Sheffield, Manchester, Newcastle — squarely North of England
- **System evidence:** Family-run, founded 1985 (>40 years trading), fleet of 1,000+ machines, "backed by over £40M of investment since 2022" (suggests recent growth/expansion, which often outpaces back-office tooling). Still independently owned — no acquisition found.
- **Translation-layer evidence:** Active "Hire Administration Assistant" role reporting to Directors and the hire desk team; site copy explicitly frames a dedicated human "hire desk team" as the mechanism that "make[s] the hire process simple" — i.e., the *people*, not software, are the interface. Booking still centers on phone/email/contact-form enquiry rather than live self-serve availability.
- **Confidence:** Medium — good structural fit (independent, family-owned, growing fast, multi-site, North Yorkshire) but I did not find a direct quote describing a specific spreadsheet/paper workaround, only strong circumstantial signals (dedicated hire-desk-as-interface language, recent fast growth, admin hiring).
- **Sources:** [Fairfax Plant Hire](https://www.fairfaxhire.co.uk/), [Companies House](https://find-and-update.company-information.service.gov.uk/company/01953454), [RocketReach](https://rocketreach.co/fairfax-plant-hire-ltd-profile_b4544865fc9feea4), [Fairfax team/careers](https://www.fairfaxhire.co.uk/team/)

#### 3. Hather Plant Hire Limited — Rotherham, South Yorkshire
- **Revenue:** ~£13.4M (Pomanda-sourced estimate — note ZoomInfo/RocketReach disagree wildly, see below)
- **Headcount:** Conflicting estimates — 58 (Pomanda), 150+ (ZoomInfo), 29 (RocketReach). Treat as "tens, not hundreds" — genuinely uncertain, needs direct verification, but almost certainly ICP-band.
- **Coverage:** Rotherham-based, South Yorkshire, fleet of 650+ machines, family-run for 35+ years
- **Translation-layer evidence:** Live job posting seeking a **"Plant Controller"** for a "busy plant hire office" whose job is explicitly **"taking hires and off hires"** — i.e., a dedicated human role exists solely to intake and reconcile hire/off-hire requests, the exact "customers email/call it to us and someone re-keys it" pattern the brief is hunting for.
- **Confidence:** Medium-high on pain (a role literally titled around manual hire/off-hire intake is close to the smoking gun described in the brief); low-medium on the exact revenue/headcount figures given source disagreement.
- **Sources:** [Companies House](https://find-and-update.company-information.service.gov.uk/company/02701906), [Pomanda](https://pomanda.com/company/02701906/hather-plant-hire-limited), [ZoomInfo](https://www.zoominfo.com/c/hather-plant-hire-ltd/351642685), [Hather Plant Hire site](https://hatherplanthire.com/)

#### 4. B&W Plant Hire & Sales Ltd — Blackburn, Lancashire (HQ), + Keighley, Northwich, Southampton
- **Revenue:** Unconfirmed/conflicting — RocketReach shows $7.3M (~£5.5–6M), which if accurate would put it **below** the £10M ICP floor; ZoomInfo shows a 51–200 employee band which is inconsistent with that revenue figure, suggesting the RocketReach number is unreliable/stale.
- **Headcount:** Conflicting — RocketReach "13" or "27," ZoomInfo "51-200." Genuinely unresolved.
- **Coverage:** Blackburn, Keighley (Yorkshire), Northwich (Cheshire), Southampton — three of four depots are North of England
- **Notable event:** Yorkshire Post reported the Keighley-depot business **"returned to family ownership"** recently — a founder/family buy-back is often a moment when a business re-examines its operating tooling and cost base, a potentially good sales-timing signal.
- **Translation-layer evidence:** Not directly evidenced yet (no job-ad or "spreadsheet" quote found) — multi-depot logistics across 4 sites is a strong *structural* prior for the pain, but this needs a further pass (their own site, LinkedIn, or a direct Companies House pull) to firm up.
- **Confidence:** Low-medium — good structural/regional fit, but revenue is genuinely uncertain and no direct evidence quote was found. Flagging for follow-up rather than as a top-tier pick.
- **Sources:** [Yorkshire Post](https://www.yorkshirepost.co.uk/business/keighley-plant-hire-business-with-yorkshire-depot-returns-to-family-ownership-5072565), [B&W Plant Hire site](https://bandwplanthire.co.uk/), [ZoomInfo](https://www.zoominfo.com/c/b--w-plant-hire-ltd/353081662)

#### 5. Welfare Unit Hire Ltd — Wigan, Greater Manchester
- **Revenue/headcount:** Not found — genuinely unconfirmed, flag explicitly as unknown.
- **Coverage:** Self-described North West specialist ("strategically placed... between Manchester and Liverpool"), founded 2006 by MD Mick Elston, ~20 years trading, positioned on the M6/M62/M60/M55/M61/M58/M65 motorway network for multi-site delivery logistics.
- **Sector fit:** Directly in the welfare-unit-hire niche the brief calls out by name; welfare-unit logistics (which unit is on which site, servicing/pump-out schedules, delivery/collection routing) is one of the clearest instances of the "multi-site logistics + one legacy system" pattern in the whole sector.
- **Translation-layer evidence:** Not yet directly evidenced (no job ad or quote found) — flagged on sector-fit and regional-fit grounds, needs a dedicated follow-up pass (their own careers page, Companies House filing, LinkedIn) before it can be scored higher.
- **Confidence:** Low on evidence (pure inference from sector + size-of-operation description), but the niche fit is strong enough to be worth the follow-up call.
- **Sources:** [Welfare Unit Hire](https://welfareunithire.co.uk/), [Companies House](https://find-and-update.company-information.service.gov.uk/company/06246883), [Endole](https://open.endole.co.uk/insight/company/06246883-welfare-unit-hire-ltd)

#### 6. Toilets2Go — Garstang, Lancashire (with depots in Wrexham, Pontefract, Carlisle)
- **Revenue/headcount:** Not found.
- **Coverage:** Portable toilet + welfare hire across "Northern England, North Wales and the Scottish Borders" — four-depot spread is a genuine multi-site logistics operation (delivery/collection scheduling, pump-out/servicing rounds) in exactly the welfare/sanitation-hire niche named in the brief.
- **Confidence:** Low — no direct financial or process evidence found; included as a lead worth a dedicated follow-up search (direct site visit, Companies House filing by exact registered name, LinkedIn) rather than a scored candidate.
- **Source:** [Toilets2Go](https://www.toilets2go.co.uk/)

#### 7. Howard Plant Hire (Leeds) Limited — Seacroft, Leeds
- **Revenue/headcount:** Not found (Companies House filing exists — co. no. 05272459 — but figures weren't retrievable via search snippets).
- **Coverage:** Leeds-based, part of/associated with Howard Civil Engineering; actively recruiting plant fitters across South and West Yorkshire per an earlier search.
- **Confidence:** Low — flagged purely on regional fit and active-hiring signal; needs direct verification of size and process evidence before it's a real candidate.
- **Source:** [Companies House](https://find-and-update.company-information.service.gov.uk/company/05272459)

*(Candidates explicitly considered and set aside: MEP Hire is part of the publicly-listed **Vp Group** — too large/well-resourced, out of ICP. GAP Group, Speedy Hire, HSS Hire, Hewden, Flannery Plant Hire, Ashtead/Sunbelt are all too large (£100M+, often PE- or plc-owned, some already running Point of Rental/Syrinx as shown by the Flannery case study). Star Plant Hire and Hather's smallest peers registered under £1-2M revenue on RocketReach were excluded as too small. Easyhire Plant Ltd (Whitchurch) and Easy Hire North East (Hexham/Consett) were excluded as too small and, in the Whitchurch case, not North of England.)*

---

### 3. INCUMBENT SOFTWARE LANDSCAPE — DOES IT ALREADY SOLVE THIS?

- **inspHire** (30+ years in market) and **Syrinx** (UK-built, acquired by **Point of Rental** in 2017, now sold as "Syrinx 365") are the two dominant UK plant-hire-specific rental management platforms. Both are used by larger/multi-branch operators (Flannery Plant Hire is a named Point of Rental case study).
- Even where these systems are adopted, they don't fully close the translation-layer gap: a **Point of Rental case study on "PACK Energy"** explicitly describes their *pre-software* state as running the business on **"a docket book, Word documents, and Xero for invoicing"** — i.e., even fast-growing, tech-aware hire businesses default to paper/Office/accounting-software patchworks until they outgrow them enough to justify a full platform migration. This is a close-to-verbatim match for the brief's "one ageing specialist system + email/Excel/Word" pattern, just observed at a company that has since fixed it — strong evidence the pattern is real and recent in this sector, not hypothetical.
- inspHire reviews are genuinely mixed: some customers report the software eliminated manual spreadsheet re-entry; others report severe reliability/support problems ("worst company we've dealt with in 25 years," "constantly crashes," year-plus unresolved issues) — suggesting that even *paying* for incumbent software doesn't reliably fix the underlying problem for smaller operators, and may leave them worse off / reverting to manual workarounds.
- **T-Card systems** — physical card-index boards for tracking plant/asset status — are still being actively sold *as a category* into plant hire in 2026 (multiple SaaS vendors now sell "digital T-card" replacements). The fact that a paper-index-card metaphor from decades ago is still the mental model plant hire yards use for asset tracking is itself strong evidence of how far behind this vertical's actual back-office tooling is, even where a "modern" front-of-house hire system exists.
- **YardLink** and **The Hireman** are marketplace/aggregator models (YardLink: "900+ suppliers nationwide," book through one account) rather than back-office software — they sit *on top of* the fragmented supplier base rather than fixing each supplier's internal process. Their existence is itself evidence that the underlying supply base (hundreds of small independents) is fragmented and inconsistently tooled enough that a marketplace layer is commercially viable — but it means YardLink is aggregating demand across firms that, internally, likely still run exactly the manual back-office processes this brief is hunting for.
- **Net read:** the specialist software exists and is mature, but (a) it's priced/scoped for mid-size-and-up operators and (b) even where adopted, it plausibly displaces only the *core hire transaction* record, not the surrounding translation layer of emailed PDFs, delivery-ticket paperwork, off-hire-by-phone, and multi-depot spreadsheet utilization tracking that CLAUDE.md's ICP thesis is about. This looks like genuine whitespace, not a solved problem.

**Sources:** [Point of Rental / Flannery Plant Hire case study](https://www.point-of-rental.com/gb/case-study/flannery-plant-hire/), [Point of Rental / Syrinx product page](https://www.point-of-rental.com/gb/product/syrinx-gb/), [PACK Energy case study](https://www.point-of-rental.com/au/case-study/pack-energy/), [inspHire Capterra reviews](https://www.capterra.com/p/86964/inspHire/reviews/), [T-Card plant hire product page](https://tcard.leantransitionsolutions.com/plant-hire-tcard-system), [YardLink](https://yardlink.com/), [The Hireman](https://thehireman.co.uk/)

---

### 4. OVERALL VERDICT ON THE VERTICAL

Construction plant/equipment/welfare hire looks like a **credible but not slam-dunk** vertical for a first customer. The structural signature the brief is looking for is genuinely present and independently corroborated three different ways: (1) recurring "Hire Controller/Hire Desk"-titled admin roles posted across nearly every North-of-England multi-depot operator I checked, explicitly scoped around manually "taking hires and off-hires" and "chasing quotations"; (2) a vendor case study describing a real hire company's pre-software state as literally "docket book, Word documents, and Xero"; and (3) the continued live market for "digital T-card" replacements for what is fundamentally a paper index-card tracking metaphor. Fit against the ICP is good but not perfect — the strongest-evidenced candidates (Chippindale £20M/120 staff, Fairfax £21M/~50 staff, Hather ~£13M/uncertain-but-plausible staff) sit right in the £10-100M/20-150-employee band and are North-of-England-based family businesses, though Chippindale's 2022 acquisition by AER Rents is a real complication for the "no internal dev capability, single decision-maker" assumption and should be weighed before prioritizing it as first customer over Fairfax or Hather. The welfare-unit and portable-toilet-hire sub-niches (Welfare Unit Hire Ltd, Toilets2Go) look like a promising narrower wedge — multi-site delivery/collection/servicing logistics is arguably an even cleaner single-workflow prototype target than general plant hire — but I could not verify their size or get a direct pain quote in this pass, so they're flagged for a dedicated follow-up rather than ranked with confidence. Given the mixed and partly-unverifiable revenue/headcount data throughout (a direct-access pass to Companies House filings, rather than third-party aggregators, would meaningfully de-risk this), my recommendation is to treat **Hather Plant Hire and Fairfax Plant Hire as the two strongest outreach targets** — both independently owned, both showing direct evidence of dedicated manual-intake admin roles, both plausibly reachable without navigating a parent-group IT function — and to run one more research pass specifically on welfare-unit/portable-toilet operators before committing, since that sub-niche may be an even narrower and more product-worthy first wedge than general plant hire.

---

## 3. Specialist/Bespoke Manufacturing

## Research Findings: UK Specialist/Bespoke Manufacturing — First-Customer Leads for Model & Mechanism

**Methodology note:** WebFetch was unavailable in this environment (blocked by network egress proxy on every domain tested, including gov.uk and Wikipedia), so all research was conducted via WebSearch, which returns synthesized excerpts of source pages with citations. Companies House "employee count" figures quoted below are frequently third-party estimates (rocketreach, companycheck, ZoomInfo-type aggregators) rather than pulled directly from filed accounts — flagged as such throughout. The single richest vein of evidence turned out to be the **Made Smarter** programme (UK-government-backed digital adoption programme specifically for North West / Yorkshire & Humber / North East SME manufacturers) — its published case studies are essentially pre-packaged admissions of the exact translation-layer pain this thesis is hunting for, written by the manufacturers' own staff.

---

### Ranked Candidates

**1. Dyer Engineering Ltd — Stanley, County Durham**
- Revenue: ~£17m turnover in 2024 (up from £11m in 2020), £2m profit — from Companies House-derived press coverage. High confidence, hard figure.
- Headcount: 182-strong workforce (company's own reported figure) — slightly over the 150-employee ceiling, flag as borderline.
- Systems: Runs an ERP but historically without real-time shop-floor visibility; manufactures complex machined metal components/fabrications for rail, automotive, defence, oil & gas, subsea, marine, energy.
- Evidence of translation-layer problem: Made Smarter case study "Using real-time data to increase profitability" — the company used Made Smarter grant funding to integrate Real-Time Location (RTL) tracking into its ERP and expand Shop Floor Data Collection (SFDC) terminals across 10 buildings on 2 sites, explicitly to close the gap between what the ERP recorded and what was actually happening on the shop floor. Estimated the old way of working cost up to £10,000/month. The project was significant enough to spin out a new venture (Therion Ltd) to sell similar tooling to other SMEs — itself a signal that this pain is shared, not idiosyncratic.
- Confidence: **High** (named company, own case study, hard revenue figure). ICP fit: strong on revenue, borderline-over on headcount, strong on region (North East), sector fits (fabrication/machining) but not accountancy — clean.
- Sources: madesmarter.uk/resources/case-study-dyer-engineering/, dyer.co.uk, Endole/Companies House aggregation (find-and-update.company-information.service.gov.uk/company/02186740)

**2. Massey & Harris (Engineering) Ltd — Stockport, Greater Manchester**
- Revenue/headcount: not confirmed from a hard filing in this pass — flagged unconfirmed. Long-established (roots to 1938 as Greeco Ltd), incorporated 1993, accounts filed to Dec 2024.
- Systems: bespoke commercial/school playground equipment manufacturer — a genuinely under-served, non-chain manufacturing niche.
- Evidence of translation-layer problem: Made Smarter "Skills Case Study" — a digital transformation workshop identified "a lack of integration between operations and the use of paper-based, manual processes," and flagged CRM and MRP software as priority projects still not yet in place, alongside a need for someone internally (Business Manager Alison Brooks) to take on digital leadership because no one else in the business could own it — a direct echo of the "only one person really knows how that works" signature, inverted (nobody currently owns it).
- Confidence: **Medium-high** on pain (direct quote from their own transformation workshop), **low** on hard revenue/headcount confirmation.
- Sources: madesmarter.uk/resources/case-study-massey-harris/, masseyandharris.com, Companies House 02807012

**3. Shields (Driffield) Ltd — Driffield, East Yorkshire**
- Revenue: unconfirmed in this pass.
- Headcount: "more than 50 people" (company's own about-us copy) — good ICP fit.
- Systems: family-owned (est. 1984) mechanical engineering and bulk material handling / process engineering company — full-service from initial consultation through commissioning, i.e. bespoke project-based work, exactly the profile of RFQ-in/quote-out/build-to-order.
- Evidence of translation-layer problem: A Made Smarter Yorkshire & Humber case study on this company exists (2026, hosted by Hull & East Yorkshire Combined Authority) but WebSearch could not surface its full body text before the search budget ran out — the case study's existence is confirmed, its specific quotes are not. This should be the **first thing a human researcher opens directly** (heygrowthhub.com/case-studies/made-smarter-yorkshire-humber-shields-driffield-ltd-case-study-2026) since it strongly likely contains a directly-on-thesis quote given the programme's pattern.
- Confidence: **Medium** (strong ICP fit and a confirmed case study, but pain evidence not yet read in full).
- Sources: shieldsdriffield.com/about-shields/, heygrowthhub.com case study page, Companies House 04948815

**4. T&R Precision Engineering Ltd — Colne, Lancashire**
- Revenue: unconfirmed in this pass.
- Headcount: reported inconsistently across sources — one source says "over 70," others 15–50; treat as unconfirmed, likely somewhere in the 30–70 range.
- Systems: privately owned aerospace-sector prismatic machining and mechanical assembly business (civil & military), 5-axis machining up to 3m — a genuine no-chains, high-precision specialist manufacturer.
- Evidence of translation-layer problem: Made Smarter case study describes the business replacing "time-consuming manual design processes" by adopting Solidworks (3D CAD) — evidence of a broadly manual/pre-digital operating culture, though this specific case is about design tooling rather than quote-to-order admin, so it's suggestive rather than a direct hit on the thesis.
- Confidence: **Medium** (real named case, clear "manual process" language, but not squarely on the quote/order translation problem).
- Sources: madesmarter.uk (via aerospace.co.uk profile, trprecision.co.uk), Companies House 04927024

**5. Robustrack Ltd — Ingleton, North Yorkshire**
- Revenue: unconfirmed; company states an investment is expected to "support more than 30 per cent turnover growth over the next three years."
- Headcount: 9 employees (per aggregator) — **below** the 20-employee ICP floor, flag clearly.
- Systems: family business, imports Italian hydraulic excavator attachments and fabricates bespoke brackets/fittings in-house for agriculture/construction/demolition/forestry/recycling.
- Evidence of translation-layer problem: Made Smarter case study states day-to-day operations relied heavily on **spreadsheets, paper-based job cards, and manual stock management**; the fix was an integrated ERP + barcode system explicitly to "halve manual administration." This is about as close to a textbook description of the thesis's problem signature as any result returned.
- Confidence: **High** on pain evidence, but **too small** on headcount for the stated ICP — include as a data point on how the pain shows up even below the target size band, not as a primary lead.
- Sources: madesmarter.uk/resources/case-study-robustrack/, robustrack.co.uk, thisisingleton.co.uk

**6. Blease Engineering Ltd — Warrington (Cheshire/NW border)**
- Revenue: unclassified/unconfirmed.
- Headcount: 11–19 (aggregator estimate) — below ICP floor.
- Systems: precision machine components, sub-assemblies and fabrications.
- Evidence: Made Smarter case study — invested in a CMM + PC-DMIS to "reduce paper-based and manual systems and integrate its factory," cutting inspection time from 90 minutes to 3. Workforce was restructured (two machine operators redeployed, one new inspector role) as a direct consequence — a nice secondary signal that automating a manual step frees/reallocates headcount rather than just cutting cost.
- Confidence: **Medium** on pain, **too small** on headcount for ICP; useful as a "gap" data point (see verdict).
- Sources: madesmarter.uk/resources/case-study-blease-engineering/, cheshireandwarrington.com, Companies House 05359231

**7. Lambert Engineering Ltd — Tadcaster, North Yorkshire**
- Revenue: ~£20–22.6m at last public figures, ambition to reach £50m.
- Headcount: 178–185 — over ICP ceiling.
- Systems: automation/factory-automation systems builder for medical & consumer healthcare markets.
- Evidence: topped a UK "top 100 manufacturing companies" list and was acquired by listed group Mpac Group plc (~£15m deal) — meaning it is **no longer an independent SME** with no dev capability; it's now part of a public company that likely has (or is acquiring) real digital/dev resources. **Deprioritise** despite otherwise-strong regional and revenue fit — the "invisible to big vendors, no internal dev capability" premise breaks once a company is inside a listed group.
- Confidence: pain evidence not directly established; excluded primarily on structural grounds (owned by a plc).
- Sources: thebusinessdesk.com, bdo.co.uk, themanufacturer.com, pesmedia.com

**8. GB Engineering (Nantwich) Ltd — Nantwich, Cheshire** — **excluded from ranking**
- Prototype/tooling manufacturer, 10–30 employees, real Made Smarter robotics case study (cobot-assisted CNC lathe loading). However, search results indicate the company's founder/sole driving force died and the business subsequently **closed** ("after much consideration they are unable to continue the business without him. The office remained open until the end of March"). Not a viable lead — flagged so it isn't mistakenly pursued.
- Sources: qimtek.co.uk, gbengineering.co.uk-linked press coverage

**9. Stelram Engineering Ltd — Wakefield, West Yorkshire** — **low priority / caution flag**
- Bespoke machinery / robotics system builder. Small (13–27 employees depending on period), and went into **administration in August 2020** (KPMG-appointed, all 27 staff made redundant) after Covid order cancellations, though appears to have since re-established under the same name. High financial-fragility risk for a first-customer bet even if currently trading; also below ICP headcount floor.
- Sources: insidermedia.com (via search snippet), pesmedia.com, stelram.co.uk

**10. Excell Metal Spinning, KingsForm Metalworks, and similar "email your drawings" precision subcontractors** — **pattern evidence, not individually vetted leads**
- General web search for the phrase pattern "email your drawings/PDF/STEP/DXF for a quote" turned up numerous UK metal-fabrication and machining subcontractors advertising exactly this manual-intake workflow as their normal process (Excell Metal Spinning: "Send your drawings, quantities, material details... through our quote form or by email"; KingsForm Metalworks: "Email PDF, STEP, DWG, DXF... then clarify missing information"). Neither company was confirmed as North-of-England-based or size-matched in this pass, but the language itself is strong evidence that **email-in, manually-quoted RFQ intake is the industry-standard front door**, not an outlier — reinforcing the thesis's premise about the sector generally, independent of any single company.

---

### Software Landscape Check (why the gap likely persists)

- **JobBOSS²** (ECI Solutions) and **Global Shop Solutions**: both are real, purpose-built job-shop ERPs with quoting → job → scheduling modules, including an "AI BOM builder" (JobBOSS²) that drafts a bill of materials from uploaded files. These are the closest existing products to the thesis's target workflow — but they are **generalist US-built job-shop ERPs sold globally**, not UK-specific, not vertical-specific below "job shop," and adoption still requires a business to rip out its existing Sage/Excel stack and commit to a full ERP migration — a much bigger, riskier purchase than a narrow wedge tool that sits on top of what a company already has. This is the likely reason smaller UK bespoke manufacturers (sub-150 headcount, one legacy system) haven't adopted them: it's an all-or-nothing platform switch, not an incremental fix to the one painful re-typing step.
- **Sage 200**: appears repeatedly as the ERP-of-record for UK SMEs in this size band, but was explicitly called out in one company's own words (Bristol's Exacta Technologies, outside our region but a directly on-point quote) as inadequate for production scheduling — "Sage didn't have the capacity for production scheduling – so to that end, we used Microsoft Excel" — a textbook description of the "one ageing specialist system + Excel wrapped around it" pattern the thesis names.
- Net effect: **the specific quote-to-order translation step (RFQ email/PDF → priced quote → re-typed sales order in the ERP) does not appear to be well served by any product these companies are currently using.** The generalist ERPs manage the order once it exists; nothing found here manages the messy pre-order, human-mediated quoting conversation.

---

### Verdict: Is specialist manufacturing a repeatable, product-worthy market?

Partially, but with a real caveat the thesis should take seriously. The **problem signature is genuinely present and well-documented** — Made Smarter's own case studies (a UK-government programme explicitly built to fund fixes for this exact pain) confirm spreadsheets, paper job cards, "manual stock management," and "lack of integration between operations" recur across playground-equipment makers, precision machinists, valve/component fabricators, and heavy-plant attachment builders alike, and the RFQ-by-email intake pattern is close to universal across the subcontract-machining segment specifically. That's a strong signal the pain is real and not assumed.

However, the sector is **more heterogeneous than something like plant hire or freight**, exactly as flagged in the brief: an aerospace 5-axis machining job shop (T&R Precision), a playground-equipment fabricator (Massey & Harris), and a bulk-material-handling process engineering firm (Shields) do not share a BOM structure, a quoting logic, a regulatory environment, or even a common definition of "a job." The generalist job-shop ERPs (JobBOSS², Global Shop Solutions) exist precisely because "manufacturing" as a category is wide enough to need configurable, general-purpose tooling rather than one fixed workflow — which is a warning sign for a narrow vertical wedge product. The more promising framing is probably not "specialist manufacturing" as one market but a **narrower sub-niche defined by a shared quoting/BOM shape** — e.g. specifically "subcontract precision machining / job-shop metal fabrication," where the RFQ→quote→order pattern (drawing in, price out, order re-typed into ERP) is genuinely close to identical company-to-company, rather than the full breadth of "bespoke manufacturing." Within that narrower slice, the evidence collected here (T&R Precision, Blease Engineering, GB Engineering's cobot case, the "email your drawings" pattern across many subcontractors) is consistent and repeatable enough to be worth a prototype; the wider category is not.

### Recommended Next Step
Before committing, a human should directly open the Shields (Driffield) Made Smarter case study (heygrowthhub.com/case-studies/made-smarter-yorkshire-humber-shields-driffield-ltd-case-study-2026) and pull Companies House full accounts for Dyer Engineering, Shields (Driffield), T&R Precision, and Massey & Harris — WebFetch access to gov.uk was blocked in this research session, so headcount/revenue for the top candidates should be treated as directionally right but not final until confirmed against filed accounts.

---

## 4. Construction Specialists (Tenders/Compliance)

# UK Construction Specialist Subcontractors — Lead Research

### Research method note & limitations (read first)

This research was conducted via web search snippets summarizing company websites, Companies House—adjacent business-data aggregators (Endole, Tracxn, RocketReach, D&B), trade press (Construction News, Insider Media, Bdaily), and regional business-growth award programmes (Ward Hadaway Fastest 50). **Two tool constraints affected depth**: the WebSearch budget for this session was exhausted partway through (a shared session-wide cap, not something I could raise), and the WebFetch tool was blocked outright for every external domain attempted in this environment (including Companies House itself, Wikipedia, and company websites) — so I could not open primary-source pages (full Companies House accounts, LinkedIn job-posting volumes, or full trade-press articles) directly; everything below is built from search-result summaries only. Where a figure is unconfirmed for this reason it is marked clearly. **Before outreach, the studio should independently verify revenue/headcount for top-ranked candidates directly on Companies House** (find-and-update.company-information.service.gov.uk) rather than relying solely on this pass.

---

### Ranked Candidates

#### 1. Hambleton Steel Ltd — Brompton-on-Swale, North Yorkshire
- **Trade**: Structural steelwork fabrication, design & erection
- **Revenue**: Not disclosed in any source found. Estimated £10–20M based on scale (50,000 sq ft fabrication facility + 65,000 sq ft storage yard, 50–70 tonnes/month capacity) — **unconfirmed, needs Companies House verification** (company no. 03106954)
- **Headcount**: ~54–70 employees (sources vary: 54 as of May 2026 per one aggregator, "50-strong" / "70-strong" elsewhere)
- **Systems/evidence of manual process**: Company markets "Steel Estimation Services" as a distinct named offering and is actively recruiting Estimators — a strong proxy signal that estimating/take-off is a labour-intensive, non-automated bottleneck in a trade where fabrication drawings, CAD/detailing packages, and priced tender submissions must be manually reconciled. ISO 9001/14001 accredited, implying a real quality-documentation overhead layered on top of estimating.
- **Confidence**: Medium — pain is inferred from job-role structure and marketing copy, not a direct quote about spreadsheets/re-typing. No PQQ/RAMS-specific evidence surfaced.
- **ICP fit**: Strong on size and location (North Yorkshire); no evidence of internal dev capability; specialist trade, not professional services.
- **Sources**: [Hambleton Steel — Estimating services](https://hambletonsteel.co.uk/our-services/estimating), [ContactOut profile](https://contactout.com/company/hambleton-steel-6524179), [Endole](https://open.endole.co.uk/insight/company/03106954-hambleton-steel-limited), [Companies House](https://find-and-update.company-information.service.gov.uk/company/03106954)

#### 2. CCL Facades Ltd — Wakefield, Yorkshire (part of Caddick Construction Group)
- **Trade**: Facades/cladding specialist contractor
- **Revenue**: £9.6M turnover in first full year, forecast to reach £16M by 2025/26; group is targeting a £100M project pipeline across North England and the Midlands (source: Bdaily via search summary)
- **Headcount**: Grown from 9 to 29 employees in roughly two years
- **Systems/evidence of manual process**: The headcount-to-pipeline ratio is the strongest quantitative pain signal found in this research — a team that tripled from 9 to 29 while taking on 26 completed projects worth £40M+ and a further 22-project pipeline is a textbook case of admin/back-office process not scaling with delivery volume (tender tracking, project handover docs, compliance packs almost certainly still ad hoc).
- **Confidence**: Medium-high on the growth-strain signal, but **caveat**: it sits inside Caddick Construction Group, a larger regional main contractor, which may already provide some shared back-office/IT capability — this partially undercuts the "no internal dev capability" ICP criterion and is worth confirming before treating CCL as a fully independent target.
- **ICP fit**: Revenue and location strong; headcount currently below the 20–150 floor (29) though trending into range; parent-company relationship is the open question.
- **Sources**: [Bdaily — CCL Facades eyes £100m growth push](https://bdaily.co.uk/articles/2026/04/06/ccl-facades-eyes-100-million-growth-push), [Companies House](https://find-and-update.company-information.service.gov.uk/company/14428271)

#### 3. McCrory Construction Group / McCrory Brickwork — Stockport, Greater Manchester
- **Trade**: Multi-trade group — brickwork/masonry (parent trade, 30+ years' history), plus subsidiary businesses in scaffolding, fire protection, property development, and facade remediation; targeting rail, facade remediation and light-industrial sectors
- **Revenue**: £19.9M (2026), up from ~£4M in year one of the holding group (2022) — 122.8% average growth, named Fastest Growing Medium Business in Ward Hadaway's 2026 North West Fastest 50
- **Headcount**: Not disclosed in sources found
- **Systems/evidence of manual process**: Not directly evidenced, but the group structure itself is a signal — a holding company stitched together from previously separate specialist trade businesses (brickwork, scaffolding, fire protection) almost always means each subsidiary still runs its own disconnected estimating/compliance process, with no shared system across the group. This is exactly the "each niche too small to bother with, but painful in aggregate" pattern the thesis describes.
- **Confidence**: Medium — financial growth is well-evidenced, translation-layer pain is a structural inference rather than a direct quote.
- **ICP fit**: Revenue strong, North West location strong, non-professional-services; the McCrory Construction Group holding entity itself is young (2022) so "ageing legacy system" may apply more to the older McCrory Brickwork trading business within the group than the group as a whole.
- **Sources**: [Ward Hadaway — Reputation drives rapid growth for North West construction firm](https://www.wardhadaway.com/insights/fastest-50-and-inspiring-growth/fastest-50-north-west/reputation-drives-rapid-growth-for-north-west-construction-firm/)

#### 4. Pops Facades Ltd — Widnes, Merseyside
- **Trade**: Curtain walling, cladding, and roofing specialist contractor
- **Revenue**: Not confirmed — could not access Companies House (co. no. 06148798) due to tool block. Estimated mid-range (£15–40M) based on workforce scale, **unconfirmed**.
- **Headcount**: "Over 100 skilled fixers" plus an in-house workforce of project managers (SMSTS), site supervisors (SSSTS), crane operators, and first-aid trained staff; 15+ years trading.
- **Systems/evidence of manual process**: No direct quote found, but the split between a large mobile site workforce and a comparatively small central office/estimating function is exactly the shape the thesis targets — a facades subcontractor of this scale is almost certainly juggling multiple concurrent tenders, RAMS packs (curtain walling and roofing both carry heavy working-at-height H&S documentation), and CHAS/SMAS/Constructionline renewal paperwork through email and spreadsheets, with office headcount thin relative to that admin load.
- **Confidence**: Low-medium — financials unverified, pain evidence circumstantial.
- **ICP fit**: Trade and location fit are strong; needs financial verification before prioritizing.
- **Sources**: [Pops Facades — About](https://popsfacades.co.uk/about-us/), [Find The Needle profile](https://www.findtheneedle.co.uk/companies/pops-facades)

#### 5. FrameTech — West Yorkshire
- **Trade**: Timber frame manufacturer (panels/systems) for housebuilders and developers across the North
- **Revenue**: Not disclosed directly. A directly comparable operator at the same output volume (Taylor Lane Timber Frame, ~2,000 units/year) reports £30M turnover — used here only as a rough proxy; **FrameTech's own figure is unconfirmed**.
- **Headcount**: 60+ staff, 56,000 sq ft office/manufacturing facility, ~2,000 units/year output — largest timber frame manufacturer in the North per the source.
- **Systems/evidence of manual process**: Not directly evidenced by quote. Structurally, timber frame manufacturing sits at a translation-heavy chokepoint: architect drawings → structural design/CAD → NHBC/structural-warranty compliance sign-off → production scheduling → site delivery paperwork, typically spanning several disconnected systems (CAD/detailing software, an ageing MRP/production-scheduling tool, and Excel/email for compliance and delivery tracking).
- **Confidence**: Low-medium — revenue is an estimate-by-comparable, not a filing; process pain is inferred from sector structure.
- **ICP fit**: Location and trade fit well; needs primary verification of both financials and process pain before serious pursuit.
- **Sources**: [Boost Business Lancashire — Timber frame manufacturer plans growth](https://www.boostbusinesslancashire.co.uk/success-stories/timber-frame-manufacturer-plans-growth-with-boost-support), search-summary comparison to Taylor Lane Timber Frame

#### 6. Advance Scaffolding (Lancashire) Ltd — Bamber Bridge, Preston
- **Trade**: Commercial/industrial scaffolding contractor
- **Revenue**: Unreported in latest filed accounts (period ended 30 Nov 2023); estimated below the £10M ICP floor based on scaffolding-sector revenue-per-head norms at this headcount — **likely too small, flag as borderline**.
- **Headcount**: 45–55 employees; family-run since 1994 (David & Carole Ashmore, son Daniel joined 2004)
- **Systems/evidence of manual process**: Not directly evidenced, but scaffolding is a trade with heavy structural-compliance overhead (TG20/TG30 design compliance, NASC membership documentation, CHAS/Constructionline/Alcumus renewals, and a RAMS pack effectively required per job/per site) — a classic candidate for the "one legacy hire/scaffold-management system plus everything else in Excel and email" pattern, but unconfirmed for this specific company.
- **Confidence**: Low — revenue likely below ICP floor, pain evidence entirely inferred from trade norms.
- **ICP fit**: Location and ownership structure fit well; revenue is the main concern.
- **Sources**: [Endole](https://open.endole.co.uk/insight/company/03656306-advance-scaffolding-lancashire-limited), [Advance Scaffolding site](https://www.advancescaff.co.uk/)

#### 7. Firetech (UK) Ltd — Manchester *(watch-list, likely below ICP floor)*
- **Trade**: Passive fire protection specialist (compartmentation surveys, fire stopping, fire door inspection, structural steel fire protection) — established 1994
- **Revenue**: Sources conflict sharply ($2.4M/4 employees vs. $3.4M/31 employees per different aggregators) — almost certainly under the £10M ICP floor either way.
- **Headcount**: Likely well under 50 based on both estimates.
- **Systems/evidence of manual process**: Not evidenced directly; included only because passive fire protection as a sector is currently under acute regulatory pressure (Building Safety Act, EWS1-adjacent compliance demand) which is driving real admin load industry-wide — but this specific company is probably too small today. Worth a lighter check-in in 12–18 months if it keeps growing, not a near-term target.
- **Confidence**: Low.
- **Sources**: [Firetech UK](https://www.firetech.co.uk/about-us), RocketReach aggregator profiles (conflicting)

---

### Excluded but noted (too large for ICP — flagged for awareness, not pursuit)

- **The Casey Group Ltd** (Rochdale) — £76.4M turnover FY2025 (down from £88.6M FY2024, pre-tax profit doubled to £4.5M on stronger margins), family-owned, multi-service (civil engineering, groundworks, landscaping, waste management, plant hire). Revenue fits ICP well, but headcount is **~250–300 employees** per two independent sources (Tracxn, Rochdale Development Agency) — meaningfully above the 150-employee ceiling, and a business at this scale plausibly already has some internal systems/IT function. Worth a second look only if the studio is willing to stretch the headcount ceiling for a company this well-evidenced financially.
- **P.P. O'Connor Ltd** (Trafford Park, Manchester) — family-owned since 1960, civil engineering/demolition, "largest contractor of their type in the region," but **201–500 employees** per D&B — well outside ICP.

---

### Existing vertical software landscape (gap assessment)

Search turned up UK construction tender/procurement software vendors — Procore UK (tender management module), The Access Group (construction tender & bid management), Autodesk Forma (bid management workflows) — plus category incumbents known independently of this search (Causeway, Eque2, Conquest, COINS). The pattern that emerged from search-result summaries of subcontractor-tendering pain: *"Most small and medium UK contractors handle subcontract tendering through email and spreadsheets, creating a fragmented procurement record where the decision to award a subcontract is made based on information that exists only in an email thread and a comparison spreadsheet, neither of which is linked to the purchase order or subcontract that follows."* This is precisely the translation-layer gap the thesis targets. The existing vendor landscape skews toward tools built for main contractors managing subcontractor procurement (Procore, Access, Autodesk) or larger regional/national specialists with dedicated commercial teams (Causeway, COINS) — none of the search results surfaced a tool aimed specifically at the *specialist trade subcontractor's own* pain of re-typing the same compliance answers into every PQQ, re-assembling RAMS from an old Word template each time, and tracking tender deadlines in a personal spreadsheet. That gap looks real and unaddressed at the SME-subcontractor tier.

---

### Verdict: is construction-specialist subcontracting a repeatable, product-worthy market?

The signal is directionally strong but the evidence gathered here is mostly circumstantial (financials and growth trajectories are well-evidenced; the specific "we copy this from here into here" quote was not directly captured for any named company due to tool access limits, and should be sourced firsthand via customer discovery calls before committing). The sector is **highly fragmented by trade**, not just by company: structural steel, facades/cladding, timber frame manufacturing, scaffolding, groundworks, and passive fire protection each have their own unit of measure (tonnes, m², units, linear metres), their own accreditation stack emphasis, and often their own entrenched niche software (Tekla for steel detailing, NHBC/warranty systems for timber frame, NASC-specific design tools for scaffolding) — so a single generic product is unlikely to feel "built for me" on day one in any of them. What *is* structurally common across every trade found here is the shape of the admin burden itself: near-identical RAMS/compliance documents re-assembled from an old template for every job, PQQ responses re-typed from scratch or copy-pasted from the last one, and tender deadlines tracked in a personal spreadsheet nobody else can see. That suggests the right strategy is a **trade-specific wedge first** (Hambleton Steel-style structural steel estimating-to-RAMS, or a facades/cladding tender-and-compliance tracker) proven with one paying customer, with the underlying document-assembly and deadline-tracking engine designed from the outset to be **re-skinned per trade** rather than rebuilt — generic at the engine layer, specific at the template/taxonomy layer for go-to-market. North England is a genuinely good hunting ground: family-owned, multi-generation specialist trade firms are common, growth is real (several Fastest 50 winners), and none showed evidence of in-house development capability.

---

## 5. Property & Facilities Management

# Research Findings: FM/Property Management SME Leads for Model & Mechanism

### Methodology note (read before the findings)

Two tool constraints shaped this research and should temper confidence ratings across the board:

1. **WebFetch was blocked for every domain tested** (Wikipedia, Companies House, company websites — all returned `EGRESS_BLOCKED` from the session's egress proxy). I could not directly read primary sources (Companies House filed accounts, job ad full text, company "about" pages) — everything below comes from WebSearch's synthesized snippets of those pages, not my own direct reading of them.
2. **The WebSearch budget (200 calls) was exhausted mid-research**, cutting off several planned drill-downs (ICH Services' financials, Block Management UK Ltd's Companies House data, targeted job-volume searches for RES Group/KKC/ICH). Where I flag "not confirmed," it's because the follow-up query never ran, not because the answer was negative.

Net effect: treat every "confidence" rating below as capped at **medium** unless independently re-verified — none of this is first-hand-verified primary-source evidence, it's second-hand search-engine paraphrase of primary sources. I did not fabricate any figures; where a number wasn't surfaced, I say so explicitly.

---

### Ranked Candidates

#### 1. RES Group Ltd — Hull, East Yorkshire ⭐ Strongest fit
- **Location:** Hull, East Riding of Yorkshire (hubs also in Leeds, Sheffield, Bradford, York)
- **Revenue:** Companies House classifies it **"small company," turnover under £15M, balance sheet under £7.5M** (last accounts to 31 Dec 2024) — sits squarely in or just below the £10–100M ICP band. This is the hardest financial evidence found in this research (from Companies House filing classification, not a guess).
- **Headcount:** Not confirmed directly — not surfaced before budget cutoff. Given the turnover band and labour-intensive multi-trade maintenance model, plausibly in the 20–100 range, but this is an inference, not a citation.
- **Systems/evidence:** Business activity codes cover construction/building/carpentry/joinery/electrical installation. Long-established (incorporated 1997, LinkedIn cites forming 1995), family-founded (Les Ryan, co-founder; daughter Lisa joined as "Office Junior" in 1999 and "created office working systems" — a strong textual hint that internal systems were built ad hoc in-house rather than bought off the shelf). Delivers reactive maintenance (24/7) and PPM across HVAC, electrical, plumbing, general building, lifts.
- **Translation-layer evidence:** Circumstantial rather than a direct quote — multi-trade, multi-site, 24/7 reactive maintenance dispatch to Hull/Leeds/Sheffield/Bradford/York is exactly the coordination pattern the thesis targets, and the "office junior built our systems" detail is a real signal of home-grown, non-vendor tooling, but no direct "we copy this into that" quote was found.
- **Confidence:** Medium (financial fit is hard-sourced; process-pain is inferred from sector pattern + one suggestive historical detail, not confirmed in their own words).
- **Sources:** [RES Group Ltd — Companies House](https://find-and-update.company-information.service.gov.uk/company/03427453), [Our History | RES Group Ltd](https://www.res.group/our-history), [Facilities Management Services Yorkshire | RES Group](https://www.res.group/)

#### 2. KKC Facilities Management UK Ltd — Southport, Merseyside
- **Location:** Registered office 55 Hoghton Street, Southport, Merseyside; operates across Yorkshire (Leeds, York, Sheffield, Doncaster) and beyond
- **Revenue/headcount:** Not confirmed — search results described it only as "a fast growing company" with a "stable operational track record"; no hard Companies House turnover/employee figures surfaced.
- **Systems/evidence:** Incorporated 2003 (20+ years trading). Core business is **reactive and planned maintenance for the housing sector** — this is precisely the "coordinate many trades across many sites, react to tenant-reported problems" model, and housing-sector reactive maintenance is one of the most manual-process-heavy corners of FM (call centre → paper/spreadsheet job log → phone the right trade → chase completion → report back to landlord/housing provider).
- **Translation-layer evidence:** Inferred from business model description, not a direct quote from the company about their own internal tooling.
- **Confidence:** Medium-low (strong sector-pattern fit, but no company-specific pain evidence and no confirmed financials — the size/ICP fit itself is unverified).
- **Sources:** [KKC Facilities Management UK Ltd — Companies House](https://find-and-update.company-information.service.gov.uk/company/04921239), [KKC UK | Reactive & Planned Maintenance](https://www.kkcuk.com/), [Residential Housing | KKC UK](https://www.kkcuk.com/industries/residential-housing/)

#### 3. ICH Services Ltd — Pudsey, West Yorkshire
- **Location:** Union Bridge Works, Roker Lane, Pudsey, West Yorkshire (delivers multi-site FM into Newcastle, Gateshead, Sunderland, Durham and elsewhere)
- **Revenue/headcount:** Not confirmed — the follow-up Companies House query was cut off by the search-budget limit before financial classification could be retrieved.
- **Systems/evidence:** Incorporated 1992 — **33+ years trading**, self-described "leading provider of hard facilities services," specializing in mechanical maintenance, HVAC design/installation, and electrical services across multi-site commercial/industrial/public-sector portfolios.
- **Translation-layer evidence:** None directly confirmed — this candidate is included principally on pattern-match (long-established, multi-trade, multi-site hard-FM provider is exactly the archetype the thesis describes) rather than any sourced quote about their processes.
- **Confidence:** Low-medium — good structural fit, but the weakest evidence base of the top candidates since the financial and pain-evidence searches didn't complete.
- **Sources:** [ICH Services Ltd — Companies House](https://find-and-update.company-information.service.gov.uk/company/02745893), [Facilities Management Services in Newcastle | ICH Services](https://ich-services.co.uk/locations/facilities-management-newcastle/)

#### 4. Scanlans Property Management LLP — Manchester (+ Birmingham, Liverpool, Leeds, Yorkshire, Chester)
- **Location:** HQ Manchester, offices across the North and Midlands
- **Revenue/headcount:** Not confirmed — LinkedIn follower count (938) is a weak size proxy only; no CH financial figures surfaced for the LLP.
- **Systems/evidence:** RICS-regulated block/residential property manager, "established for over 25 years," multi-region (Manchester, Birmingham, Liverpool, Leeds, Greater Yorkshire, Chester). Sector-generic evidence (not Scanlans-specific) confirms block managers "deal with numerous contractors, from repairs, heating, lifts, lighting, and gardening" with typical 24–48hr response coordination.
- **Translation-layer evidence:** This is the strongest *structural* match to the thesis (a block manager juggling leaseholder queries, multiple independent trades, and service-charge accounting across dozens of buildings, spread over 6 regional offices, is a textbook "translate between email/phone/spreadsheet and one ageing system" role) but no company-specific quote was retrieved — the pain description is generic-sector, not Scanlans-sourced.
- **Confidence:** Medium on pain-pattern plausibility, low on confirmed size/financial ICP fit.
- **Sources:** [Scanlans Property Management LLP — Companies House](https://find-and-update.company-information.service.gov.uk/company/OC347366), [About Us | Scanlans](https://www.scanlanspropertymanagement.com/about-us/)

#### 5. Block Management UK Ltd — Wakefield, West Yorkshire
- **Location:** Wakefield, WF2 6PW
- **Revenue/headcount:** Not confirmed (follow-up search cut off).
- **Systems/evidence:** A live job posting for a Property Manager role in Wakefield describes the role as covering **~30 sites across Wakefield and "the north," predominantly remote management** — a single coordinator thinly spread across 30 sites, managed remotely, is a strong structural proxy for "no shared system, relies on the individual's personal knowledge/phone/email."
- **Translation-layer evidence:** Job-posting-derived, single data point, not corroborated by a second source.
- **Confidence:** Low (one job ad, no financial verification, no second source).
- **Sources:** [Block Management UK Ltd hiring Property Manager — LinkedIn](https://uk.linkedin.com/jobs/view/property-manager-west-yorkshire-wf2-6pw-at-block-management-uk-ltd-3732497008)

#### 6. PPVS — national FM group with North England branch operations (Manchester, Leeds, Liverpool, Newcastle)
- **Location:** HQ roots in Peterborough/East Anglia (founded there 2015 by Richard, now second-generation family business led with son Louis); operates branch pages for Manchester, Leeds, Liverpool, Newcastle, Southampton, London, and internationally (France)
- **Revenue/headcount:** Not confirmed via Companies House; self-described as covering "over 3,000 commercial sites" with clients ranging from £5m to £1bn+ turnover — this describes PPVS's client book, not PPVS's own size.
- **Systems/evidence:** Family-run, rapid multi-region and international expansion from a single founding office — a growth pattern that often outpaces internal tooling.
- **Translation-layer evidence:** None specific; included for completeness given its North England footprint, but flagged as a **weaker ICP fit** since it is not North-HQ'd (the brief's regional preference is a plus-not-requirement, so this stays in the list but ranks lower).
- **Confidence:** Low.
- **Sources:** [PPVS: UK & Europe Total Facilities Management Services](https://ppvs-fm.com/), [About Us | PPVS](https://ppvs-fm.com/about/)

#### 7. Adair Paxton — Leeds (sub-ICP on revenue, included for texture)
- **Location:** Leeds (Horsforth), trading "since 1859" — 165+ years
- **Revenue:** ~£2m turnover (source cites this as a company "poised for further growth") — **below the £10M ICP floor**, so this is a below-threshold candidate, not a primary target.
- **Headcount:** 33 employees (one source says 40 as of 2023) — near the ICP's low end on headcount even though revenue is under threshold.
- **Systems/evidence:** Chartered surveyors turned full property services firm (sales/lettings/commercial/block management/boundary disputes) — a 165-year-old firm with this many overlapping service lines is a plausible home for legacy, non-integrated tooling, but no direct evidence was retrieved.
- **Confidence:** Low, and explicitly under-ICP on revenue — listed for completeness/rigor rather than as a lead to pursue first.
- **Sources:** [Adair Paxton: Leeds Property Experts Since 1859](https://adairpaxton.co.uk/), [Adair Paxton — Companies House](https://find-and-update.company-information.service.gov.uk/company/09156564/officers)

#### 8. Excluded on size — Rejus Limited (Doncaster) and Besseges FM Limited (Dukinfield/Manchester)
Both confirmed via Companies House as **micro companies**: Rejus has turnover under £1M with cash at bank of just £3,577 (last accounts to 31 Jan 2025); Besseges FM has turnover under £1M and **under 10 employees** (incorporated 2022). Both are well below the ICP's £10–100M revenue and 20–150 headcount bands. Noted here only to show the search was thorough and to warn against over-indexing on companies that merely rank well in Google for "facilities management + North England" — most SME-facing FM marketing sites in this space belong to genuinely tiny operators, not the ICP's target size.
**Sources:** [Rejus Limited — Companies House](https://find-and-update.company-information.service.gov.uk/company/03930907), [Besseges FM Limited — Companies House](https://find-and-update.company-information.service.gov.uk/company/14301927)

#### 9. Reference case, not a live lead — Maxim Facilities Management Ltd (Sunderland)
Included as market-validation evidence rather than a candidate: Sunderland-HQ'd, founded 2010, grew from £2.8m turnover (2013) to £6m (2016) and by its January 2025 acquisition by global FM group **OCS** brought over **1,100 employees** across — a genuine North East FM growth story that scaled from SME to acquisition target within ~15 years. It is **no longer a viable first-customer lead** (now owned by a large multinational with its own tooling/dev resources), but its growth trajectory is useful evidence that this vertical *can* produce large, fast-growing regional operators — i.e., the market is real and has scaled before.
**Sources:** [OCS Acquires Maxim FM](https://ocs.com/uk/news/ocs-acquires-maxim-fm-one-of-the-fastest-growing-facilities-management-companies-in-the-north-east/), [Maxim Facilities Management — Companies House](https://find-and-update.company-information.service.gov.uk/company/07392983)

---

### Incumbent software landscape — does it close the gap?

- **Fixflo** is described as "the UK's market-leading lettings, block and commercial repairs and maintenance management software," and integrates with MRI Qube, Propman, and Re-leased for service-charge sync. This is aimed at **landlords, letting agents, and block managers reporting repairs**, not at the FM/subcontractor-coordination side of the problem — it captures the tenant-reported-issue-in, but the dispatch/scheduling/coordination of the actual trades appears to remain a separate, less-integrated step.
- **CAFM vendors** (Planon, Joblogic, Facilio, Field Ascend, SWG/QFM, Telecetera) sell "subcontractor portals" and "AI-powered scheduling that replaces spreadsheets and paper job sheets" as **marketing claims about what their product does**, which is itself a tell: if spreadsheets/paper/manual scheduling were already solved, this wouldn't be a live selling point across nearly every CAFM vendor's homepage in 2026.
- These enterprise/mid-market CAFM tools are generally priced and sold for organizations already large enough to run a formal FM function — the £10–100M / 20–150-employee SME band described in the ICP is very plausibly **too small to be a target customer for Planon/Facilio-class CAFM but too complex to run on nothing**, which is exactly the "too small for big vendors to bother with" gap the thesis describes.
- No evidence was found of a vendor specifically targeting the **narrow slice** of "SME FM provider coordinating independent subcontractors across many client sites, translating between phone/email intake and back-office reporting" — the closest analogues (Fixflo, Joblogic) solve adjacent but distinct problems (tenant-facing repair reporting; enterprise CAFM), leaving the actual contractor-dispatch-and-client-reporting translation layer as open territory, consistent with the thesis.

---

### Overall verdict on property/facilities management as a vertical

Property and facilities management in the North of England looks like a **plausible but not yet proven** vertical for this play — the sector structurally matches the thesis (multi-trade, multi-site, reactive-by-nature, staffed with coordinator/helpdesk roles that are a natural proxy for manual admin load, and served by CAFM incumbents whose own marketing copy implicitly admits spreadsheets/paper are still the norm), but this research could not produce a single company with a **directly sourced, first-person quote** of the "we copy this from here into here" pattern — every piece of evidence above is either a hard financial fact (Companies House size classification) or an inferred structural match (business model, job posting scope, company age), not a confirmed pain quote. RES Group (Hull) is the best-evidenced lead by financial fit; Scanlans and Block Management UK Ltd are the best-evidenced leads by structural pain-pattern (block management's inherent multi-contractor, multi-building complexity); KKC UK and ICH Services are solid pattern-matches with the weakest direct evidence. Before committing engineering time, the recommended next step is **direct outreach or a phone-based discovery call with 2–3 of the top-ranked candidates** (RES Group, Scanlans, KKC UK) to get the actual "we copy that from here into here" quote this research could not surface through search alone — and separately, re-running the Companies House/job-volume searches that were cut off by the tool budget (ICH Services financials, Block Management UK Ltd financials, targeted job-volume counts) would materially raise confidence before a resourcing decision.

---

## 6. Government/Defence SME Suppliers

# Research Report: Government/Defence SME Suppliers — North of England

### Research method notes & limitations (read first)

This session hit two hard constraints partway through research: (1) the WebSearch tool budget for the session was exhausted after ~20 queries, and (2) WebFetch was blocked by the environment's network egress proxy for nearly every domain attempted — including Companies House (`find-and-update.company-information.service.gov.uk`), Wikipedia, gov.uk case studies, Made Smarter, themanufacturer.com, insidermedia.com, rothbiz.co.uk, pesmedia.com, and individual company websites (mtladv.com). This meant I could not directly pull Companies House filing PDFs, could not verify current-year accounts precisely, and could not fetch live job-board listings to quote pain-point language directly.

All findings below are therefore built from WebSearch result summaries only (Google-indexed snippets of Companies House, Endole, growjo, insider media, trade press, and company sites), not primary-source verification. Financial figures in particular should be treated as **directionally indicative and dated** (several are from 2013–2024 filings surfaced via secondary aggregators, not confirmed against the live Companies House record). I've flagged confidence levels accordingly and this should be treated as a first pass to be firmed up with direct Companies House / LinkedIn access in a follow-up session, not a final diligence document.

A structural pattern emerged during research that's worth flagging up front: **several of the most promising small independent defence-manufacturing SMEs in the North have recently been acquired by larger, better-resourced parents** (Pearson Engineering → Rafael Advanced Defense Systems in 2022; Newburgh Precision → X-Cel Superturn group in 2019; MTL Advanced is a subsidiary of WEC Group). This shrinks the pool of genuinely independent, under-resourced targets and is itself a finding for the verdict below.

---

### Ranked candidates

#### 1. MTL Advanced — Rotherham, South Yorkshire (registered Darwen, Lancashire)
- **Revenue:** ~$48.1m (~£38m) per Growjo aggregator estimate — **unconfirmed/estimated**, not a filed-accounts figure.
- **Headcount:** ~140 employees (Growjo) — fits ICP well.
- **Systems/evidence:** Operates a 390,000 sq ft facility; recently secured a £40m+ multi-year contract from KNDS for Boxer armoured vehicle fabrication (Drive Modules, Mission Modules) and holds a stack of quality certifications (ISO 9001:2015, EN 3834-2, ISO 45001, ISO 14001, EN1090, ISO 15085). That certification stack plus a defence prime relationship (KNDS) implies heavy manual documentation/traceability burden typical of this vertical, but I could not confirm this with a direct quote — inferred, not observed.
- **Ownership caveat:** Subsidiary of Darwen-headquartered WEC Group (45+ years old, multi-division engineering group) — not a fully standalone SME, though MTL Advanced itself appears to run its own contracts/quality functions.
- **Confidence:** Medium. Strong ICP size fit and live, large, complex defence contract (a real trigger for admin overload), but no direct evidence quote of "we copy this from here to here" — inferred from the shape of the business (multi-year armoured-vehicle sub-tier fabrication under a big certification burden).
- **Sources:** [Rotherham defence manufacturer launches recruitment drive](https://www.pesmedia.com/mtl-advanced-recruitment-drive-05102020), [MTL Advanced secures Boxer Vehicle Defence Contracts](https://www.mtladv.com/defence-and-security/mtl-advanced-secures-boxer-vehicle-defence-contracts-with-knds/), [MTL Advanced secures additional multimillion-pound defence contracts | Insider Media](https://www.insidermedia.com/news/yorkshire/mtl-advanced-secures-additional-multimillion-pound-defence-contracts), [MTL Advanced Brand Profile — Endole](https://open.endole.co.uk/insight/brand/352028-mtl-advanced)

#### 2. William Cook Holdings / Cook Defence Systems — Sheffield, Leeds & Stanhope (Co. Durham)
- **Revenue:** Group-wide ~£60m (2011-era figure, repeated in later coverage); the Cook Defence Systems entity specifically reported turnover jumping to **£49.22m in the year to June 2024 (+60% / +£18.36m)** per an aggregator citing a Companies House filing — **directionally strong signal of rapid recent growth**, but I could not verify the underlying filing directly (Companies House was blocked).
- **Headcount:** ~470–600 across the group's three plants — at or slightly above the top of the stated ICP band (150) at group level, though this is spread across three separate sites (Sheffield, Leeds, Stanhope) each of which may individually sit inside the ICP.
- **Systems/evidence:** Makes armoured track systems and cast armour for fighting vehicles — safety-critical, batch-traceable, multi-plant manufacturing. Multi-site coordination (three plants, ~150+ miles apart) for a safety-critical, certification-heavy defence product is a strong structural signal for the "translation layer" problem (order/spec/cert data moving between sites and to MOD/primes), but again this is inferred from business shape, not a sourced quote.
- **Confidence:** Medium. Strong sector/product fit (armour castings = heavy paperwork/traceability by nature) and a striking recent revenue jump (which typically strains existing admin processes hardest), but headcount is borderline against the ICP ceiling and ownership/site structure needs untangling before outreach.
- **Sources:** [William Cook bullish as firm returns to profit — Insider Media](https://www.insidermedia.com/news/yorkshire/william-cook-bullish-as-firm-returns-to-profit), [Cook Defence Systems — Endole](https://open.endole.co.uk/insight/company/06792266-cook-defence-systems-limited), [William Cook Group — company site](https://www.william-cook.co.uk/gb/cook-defence-systems/)

#### 3. Newburgh Precision (Newburgh Engineering) — Rotherham, South Yorkshire
- **Revenue:** ~£11.8m (year to March 2013) — **very dated**, no confirmed current figure found.
- **Headcount:** ~80 employees (as of the 2019 pre-pack administration/rescue) — fits ICP band well, though this is 7 years old.
- **Systems/evidence:** 75–80-year-old family precision engineering firm supplying nuclear/defence/oil & gas sectors for six decades — "practically all nuclear sites in the UK." Went through pre-pack administration in January 2019 and was acquired by a JV (51% X-Cel Superturn / 49% Newburgh management), which itself suggests a legacy, thinly-capitalised operation typical of the thesis (old, valuable technical know-how, thin admin/IT investment). No direct evidence of spreadsheet/email workflows found — this is a plausibility inference from company age, sector, and financial history, not observed evidence.
- **Confidence:** Low-medium. Good archetype fit (old family engineering firm, defence/nuclear, went through financial distress consistent with thin margins/overheads) but financial data is stale and I found no direct process evidence.
- **Sources:** [Newburgh Precision bought out of administration — Rothbiz](https://www.rothbiz.co.uk/2019/01/news-6800-newburgh-precision-bought-out.html), [Eighty jobs saved with £1m sale — Yorkshire Post](https://www.yorkshirepost.co.uk/business/eighty-jobs-saved-with-ps1m-sale-of-south-yorkshire-engineering-business-42997), [Newburgh Engineering targets nuclear contracts — Yorkshire Post](https://www.yorkshirepost.co.uk/news/newburgh-engineering-targets-contracts-in-nuclear-industry-1-6348507)

#### 4. TSP Engineering — Workington, Cumbria
- **Revenue:** £13.5m (year to March 2023) — fits comfortably at the small end of ICP.
- **Headcount:** 170–220 employees — slightly over the stated 150 ceiling, but close.
- **Systems/evidence:** 80-year-old heavy engineering / nuclear reactor engineering firm (300+ flasks/packages designed, built and tested in-house) working across steelmaking, construction, defence, oil & gas, nuclear and renewables — a textbook "one ageing specialist system + everything else on paper" profile by age and sector alone.
- **Major caveat:** Acquired by Jingye Steel in 2020, placed into administration by Jingye in March 2022, rescued by Silecroft-based GMET Engineering — and per one search result, **filed for bankruptcy again in September 2024**. This is a company with real, repeated financial distress. That can mean genuine appetite for a cheap point solution that saves headcount cost, OR it can mean no budget/no stable buying authority at all. Needs a live status check before any outreach — I could not confirm current trading status.
- **Confidence:** Low, pending verification of current trading status. Strong archetypal fit if still trading; possibly moot if not.
- **Sources:** [TSP Engineering Workington talk future amid 'financial difficulties'](https://www.timesandstar.co.uk/news/24562273.tsp-engineering-workington-talk-future-financial-difficulties/), [Cumbria heavy engineering firm acquired from administration](https://www.business-sale.com/news/business-sale/cumbria-heavy-engineering-firm-acquired-from-administration-226462), [TSP Engineering — Crunchbase/CBInsights profile](https://www.cbinsights.com/company/tsp-engineering)

#### 5. Northern Defence Industries Ltd — Seaham, County Durham (North East)
- **Revenue:** Not found — headcount band implies likely **below the £10m ICP floor**.
- **Headcount:** 11–50 employees per LinkedIn/ZoomInfo listing — likely too small for the stated ICP (20–150 is the stated floor, so this sits at the very bottom edge or below it).
- **Systems/evidence:** Listed under "Defense and Space Manufacturing," based in Seaham, North East England. No further detail obtained on product line, systems, or process pain.
- **Confidence:** Low. Included mainly to flag as a smaller North East defence manufacturer worth a second look once real revenue data is available — plausibly below ICP threshold as-is.
- **Sources:** [Northern Defence Industries Limited — LinkedIn](https://www.linkedin.com/company/northern-defence-industries-limited), [Northern Defence Industries — Companies House record (page found, not fetchable this session)](https://find-and-update.company-information.service.gov.uk/company/04195419)

---

### Candidates identified but deprioritized (too large / too well-resourced)

These came up prominently in research but fail the ICP on size or ownership grounds — flagged so they aren't re-discovered and mistakenly pursued:

- **Pearson Engineering (Newcastle)** — £46.7m turnover (2020, Reece Group entity), part of a £62.9m group. **Acquired by Rafael Advanced Defense Systems (a large Israeli multinational defence prime) in September 2022.** Now backed by a well-capitalised global parent — the "no meaningful internal dev capability" assumption almost certainly no longer holds. Deprioritize. [Engineering businesses snapped up by global defence firm — Insider Media](https://www.insidermedia.com/news/north-east/engineering-businesses-snapped-up-by-global-defence-firm)
- **Cammell Laird (Birkenhead)** — ~700 employees at the yard, £94m+ historical revenue, now part of the ~2,000-employee, multi-site **Balaena** shipyard group (merged with A&P Group). Too large, too well-resourced. [Cammell Laird and A&P join Balaena — Navy Lookout](https://www.navylookout.com/cammell-laird-and-ap-join-balaena-in-major-uk-shipyard-merger/)
- **Survitec (Birkenhead)** — Birkenhead site employs ~240 of Survitec's ~3,000 global staff; global PE-backed group. Too large. [Survitec Group — Wikipedia via search summary]
- **James Fisher Defence (Barrow-in-Furness)** — Defence segment sits inside a £394m-revenue, ~1,947-employee listed parent (James Fisher & Sons plc). Too large, too well-resourced, publicly listed with proper finance/IT function. [Barrow: James Fisher posts £190m revenue — In Cumbria](https://www.in-cumbria.com/news/26418125.barrow-james-fisher-posts-190m-revenue-trading-update/)

---

### Verdict: is gov/defence SME suppliers a repeatable, product-worthy market?

**Cautiously promising but harder-won than other verticals, and the pool of truly independent targets is thinner than it first appears.** The underlying pain is structurally real — these are old, technically excellent, financially thin manufacturers (many 45–80 years old) working under heavy certification/traceability burdens (ISO 9001, EN 3834-2, batch-level armour/nuclear traceability) with the exact "one ageing specialist ERP/MRP system plus Excel/email for everything else" shape the thesis predicts, and several show visible strain signals (TSP Engineering's repeated insolvencies, Cook Defence Systems' 60% one-year revenue jump likely outrunning its admin capacity). However, three things should temper enthusiasm: **(1) consolidation risk** — the most attractive smaller independents in this exact search (Pearson Engineering, Newburgh Precision, MTL Advanced's parent WEC) have already been bought by larger groups or PE, which tends to bring in-house IT/finance resource and kill the "no dev capability" assumption; **(2) sector opacity** — as flagged in the brief, defence supply chain data is genuinely harder to research than most other SME verticals: Companies House access was blocked in this session, trade press coverage is thin below Tier 1/2, and job postings rarely surface the granular process language ("we copy this from here to here") that confirms pain directly, so most evidence here is structural inference rather than direct quotes; and **(3) the sales-cycle caveat explicitly flagged in the brief is real** — security clearance requirements (SC/DV for staff touching controlled data), export control classification (ITAR/EAR) of any tool that touches technical data, and MOD/prime procurement bureaucracy will likely slow a first sale materially versus, say, a logistics or wholesale SME, even where the underlying spreadsheet-and-email pain is just as acute. **Recommendation: treat this as a secondary/validation vertical rather than the first bet** — worth 1–2 direct outreach conversations with MTL Advanced and William Cook/Cook Defence Systems to pressure-test the pain directly, but don't commit the studio's first prototype here until a live conversation confirms the "translation layer" problem in this sector's own words, given how much of this report is necessarily inferred rather than observed.
