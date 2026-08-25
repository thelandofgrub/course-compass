# CourseCompass Course Database License and Provenance

The distributable database is `data/coursecompass-open-courses.json`. Its data fields derived from OpenStreetMap and OpenGolfAPI are offered under the Open Data Commons Open Database License 1.0 (ODbL-1.0).

Where OpenGolfAPI supplied complete data, the snapshot also includes 166 complete 18-hole tee sets across 27 built-in courses. Incomplete tee sets are excluded.

Required attribution:

> Contains © OpenStreetMap contributors (ODbL 1.0), including data delivered via OpenGolfAPI.

Source and license links:

- OpenStreetMap: https://www.openstreetmap.org/copyright
- OpenGolfAPI terms and attribution: https://courses.opengolfapi.org/legal/terms and https://opengolfapi.org/attribution
- ODbL 1.0 legal text: https://opendatacommons.org/licenses/odbl/1-0/

CourseCompass-generated strategy sentences are original functional guidance produced from sourced par/yardage fields; they are not copied course descriptions. They are distributed as part of the application code under the application’s applicable code license, not asserted as OpenStreetMap descriptions.

## Resolution policy

- `licensed-scorecard`: OpenGolfAPI supplies a complete 18-hole par/yardage set from a named tee.
- `licensed-mapped-scorecard`: OSM supplies 18 numbered/par-tagged hole ways; yardages are calculated from way geometry and are explicitly not official tee measurements.
- `licensed-catalog-only`: an OSM course feature is verified, but a complete sourced 18-hole dataset is unavailable. No legacy scorecard or strategy is retained.
- `verified-reference-only`: only course identity is cited to an official source; no scorecard, coordinates, layout, imagery, or descriptive copy is reproduced.

The pre-resolution hard-coded scorecards and 900 hole strategies had no reliable creation/source ledger. They were removed rather than retroactively attributed.
