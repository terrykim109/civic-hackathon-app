# CivicSync — Toronto Demo Data Methodology

**Data snapshot:** November 13, 2026 (America/Toronto)  
**Scope:** Reviewed Toronto municipal cases prepared for the CivicSync map demo. This is a dated data handoff, **not** a live municipal-status feed.

## Files shared with the team

The following **four data files** were shared for integration:

| File | Intended use in CivicSync |
|---|---|
| `decisions.geojson` | Project / decision points to display on the map. |
| `decisions.json` | Structured case details, including descriptions, status, dates, participation information, and official references where available. |
| `wards.geojson` | Toronto ward boundaries to support geographic selection and linking projects to wards. |
| `CivicSync_AI_Evidence.json` | Official-source evidence prepared to support source-based answers from the AI assistant. |

**Not part of this handoff:** `decisions.csv` (a separate tabular export), the data-preparation Python scripts, and the historical council voting / report-request tables. The map demo does not require teammates to run a data-generation script to use the four shared files.

The documented dataset contains **11 reviewed cases** and **25 ward boundaries**. These counts, field names, and cross-file joins should be confirmed against the final files actually committed to the repository.

## Official data sources

- [City of Toronto public notices](https://secure.toronto.ca/nm/notices/current.do) — planning application descriptions, meeting information, participation instructions, and affected addresses. Examples: [Kennedy–Danforth notice](https://secure.toronto.ca/nm/api/individual/notice/8007.do), [701 Fleet Street notice](https://secure.toronto.ca/nm/api/individual/notice/8022.do), and [7 Labatt Avenue / 77 River Street notice](https://secure.toronto.ca/nm/api/individual/notice/8002.do).
- [Toronto City Council agenda item for Southport Street](https://secure.toronto.ca/council/agenda-item.do?item=2026.TE34.50) — decision record and related council information.
- Toronto park consultation pages, including [Apted Park Improvements](https://haveyoursay.toronto.ca/apted-park-improvements) and Wychwood Barns Park — project and public consultation information; see the linked source in each case record.
- [Toronto Open Data](https://open.toronto.ca/) — ward boundaries and relevant geographic project records, under the [Open Government Licence – Toronto](https://open.toronto.ca/open-data-licence/).

## How the prepared data is organized

1. **Source review:** Case information was compiled from official notices, project pages, and council records. Important attributes include the topic, stage, dates, participation channels, and official evidence link.
2. **Map points:** Projects are represented using address-based or project-layer locations where available. GeoJSON coordinates follow `[longitude, latitude]`; a representative point does **not** describe an entire project boundary.
3. **Ward connections:** `ward_id` and ward-level `decision_ids` are intended to relate case points and details to the correct Toronto ward.
4. **Shared IDs:** `decision_id` is the intended link between map points, detailed case records, and evidence references. Front-end and AI integrations should use this identifier rather than matching on the visible project title.
5. **Data checks:** Check that the same project ID appears consistently across the shared files, and that the ward displayed for the point agrees with the ward association in the detailed record. The deployed app has **not** been independently verified by this document.

## Key fields

| Field | Description |
|---|---|
| `decision_id` | Stable project / decision identifier for joining records. |
| `record_type`, `status` | Type and stage of the municipal item; these are **not necessarily** the status of public participation. |
| `published_date`, `decision_date` | Available publication / decision dates. `null` means missing or unverified. |
| `geometry`, `ward_id` | Representative location and the ward associated with the case. |
| `decision_ids` | Case IDs listed for a ward (where present). |
| `participation_status`, `participation_options` | Participation snapshot and possible channel-specific dates, deadlines, and links. |
| `last_verified`, `official_source_url`, `evidence` | Review timestamp, official source, and supporting evidence information (where present). |

These are the documented integration fields; check the exact nesting and availability against the respective JSON/GeoJSON files.

## Participation-status review

**Snapshot expectations as of November 13, 2026.** These entries describe source-based checks and do **not** assert that the deployed website already displays the correct result.

| Case | Status / deadline to check |
|---|---|
| [701 Fleet Street](https://secure.toronto.ca/nm/api/individual/notice/8022.do) | Written comments through **November 27**; no specific closing time stated in the notice. |
| [Apted Park](https://haveyoursay.toronto.ca/apted-park-improvements) | Online survey **upcoming** as of this snapshot, opening **November 17**. |
| [Southport Street](https://secure.toronto.ca/council/agenda-item.do?item=2026.TE34.50) | Published Official Plan Amendment appeal deadline passed **November 9**; appeal filings and in-force status remain unverified. |
| [7 Labatt Avenue / 77 River Street](https://secure.toronto.ca/nm/api/individual/notice/8002.do) | Participation deadline/status **unverified**. Preserve `unknown` and show the official notice rather than assume it is open or closed. |
| [Kennedy–Danforth](https://secure.toronto.ca/nm/api/individual/notice/8007.do) | Speaking registration closes **noon November 24**, with a hearing on **November 25**. Written submissions may have different rules. |

### Status-handling rules

- A missing or unverified deadline should remain **`unknown`**, not be guessed as `open` or `closed`.
- A single project can have different deadlines for **speaking registration**, **written submissions**, **surveys**, and **appeals**.
- `status` (decision stage) and `participation_status` (opportunity to participate) should not be treated as interchangeable.
- Dates and participation options may change after the snapshot; revisit the linked official page before labeling a deadline as current.

## Integration and demo checklist

- [ ] Confirm the map loads `decisions.geojson` points and `wards.geojson` ward polygons.
- [ ] Clicking a project opens its matching details in `decisions.json` using `decision_id`.
- [ ] Selecting a ward reveals the corresponding case(s) without mismatched ward assignments.
- [ ] Official source links open the correct notice or project page.
- [ ] Cases with unverified deadlines show **Unknown** rather than an invented deadline.
- [ ] If the AI assistant uses `CivicSync_AI_Evidence.json`, check that its answers cite the relevant official source; do not claim this is implemented until tested.

## Limitations and future work

This handoff provides **static, reviewed data**, not an automatic update pipeline. It does not include the original processing scripts or a live status-refresh job. Historical council voting and report-request datasets were investigated separately but were **not cleaned and merged into this map demo**. Website behavior, deployed status labels, and AI answers need their own end-to-end checks.
