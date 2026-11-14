# Requirements traceability matrix

Links requirements from [`REQUIREMENTS.md`](./REQUIREMENTS.md) to design artifacts ([`UML.md`](./UML.md)), implementation paths, and verification.

| Req ID | Design / UML | Implementation | Tests / verification |
| --- | --- | --- | --- |
| F-MAP-01 | UML component; architecture MapLibre section | `src/components/map/MapView.tsx`, `maplibreSetup.ts` | Manual map load; `npm run build`; `buildingExtrusion.test.ts` |
| F-MAP-02 | Architecture 3D buildings | `src/components/map/buildingExtrusion.ts` | `buildingExtrusion.test.ts` |
| F-MAP-03 | UML class `MunicipalRecord`; use case browse | `src/types/municipalRecord.ts`, `DecisionMarkerLayer.tsx`, `SelectedRecordPreview.tsx`, `decisions/index.ts` | `decisions.test.ts`, `recordPreview.test.ts`, `adaptMunicipalGeoJson.test.ts` |
| F-MAP-04 | UML use case + class `WardSelection` | `wardLayers.ts`, `WardLayer.tsx`, `SelectedWardPanel.tsx`, `resolveWardRecords.ts` | `resolveWardRecords.test.ts`, `wardOfficialMeta.test.ts` |
| F-MAP-05 | UML component Photon | `validateQuery.ts`, `photon.ts`, `LocationSearch.tsx` | `validateQuery.test.ts`, `photon.test.ts` |
| F-MAP-06 | UML use case nearby | `findNearbyProposals.ts`, `nearbyRadius.ts`, `NearbyProposalsPanel.tsx`, `MapPage.tsx` | `findNearbyProposals.test.ts`, `nearbyRadius.test.ts`, `nearbySelection.test.ts`, `haversine.test.ts` |
| F-MAP-07 | Architecture parks section | `adaptParkFacilityProjects.ts`, `ParkProjectLayer.tsx` | `adaptParkFacilityProjects.test.ts` |
| F-ADM-01 | UML use case admin; component Supabase Auth | `AdminRoute.tsx`, `verifyAdmin.ts`, `AuthProvider.tsx`, `admin_users` migration | `adminGate.test.ts`, `verifyAdmin.test.ts`, `loginValidation.test.ts` |
| F-ADM-02 | UML use case manage proposals | `proposalApi.ts`, `proposalForm.ts`, `AdminProposalEditorPage.tsx`, `AdminHomePage.tsx` | `proposalApi.test.ts`, `validateProposal.test.ts`, `proposalForm.test.ts` |
| F-FB-01 | UML feedback sequence | `feedbackAvailability.ts`, `ResidentFeedbackForm.tsx`, `submitResidentFeedback.ts`, `submit_resident_feedback` SQL | `feedbackAvailability.test.ts`, `validateFeedbackSubmission.test.ts`, `submitResidentFeedback.test.ts`, `residentFeedbackContract.test.ts` |
| F-FB-02 | UML feedback sequence; RLS | `feedbackAdminApi.ts`, `AdminFeedbackPage.tsx`, RLS policies, rate-limit migration | `feedbackAdminApi.test.ts`, `exportFeedbackCsv.test.ts`, `feedbackRateLimitContract.test.ts`, `rlsPolicyContract.test.ts` (+ manual `rls_security.sql`) |
| F-PUB-01 | Architecture public map sync | `fetchPublishedRecords.ts`, `adaptPublishedRecord.ts`, `useMapMunicipalRecords.ts` | `fetchPublishedRecords.test.ts`, `adaptPublishedRecord.test.ts`, `workflowContract.test.ts` |
| F-AI-01 | UML assistant sequence; use case explore | `MapPage.tsx`, `ResearchAssistantPanel.tsx`, `buildResearchContext.ts` | `buildResearchContext.test.ts` |
| F-AI-02 | UML component Edge/OpenRouter | `assistantApi.ts`, `supabase/functions/municipal-research-assistant/index.ts` | `assistantApi.test.ts`; config/docs forbid `VITE_` key |
| F-AI-03 | UML assistant sequence evidence | `allowedSourceUrl.ts`, `evidence.ts`, `extractHtmlText.ts`, `extractPdfText.ts`, `rankPassages.ts` | `allowedSourceUrl.test.ts`, `extractHtmlText.test.ts`, `extractPdfText.test.ts`, `rankPassages.test.ts`, `groundCitations.test.ts` |
| F-AI-04 | UML assistant sequence validation | `validateAssistantResponse.ts`, Edge `validateModelJson` | `validateAssistantResponse.test.ts`, `assistantApi.test.ts` |
| F-AI-05 | UML class `ResearchBrief` | `validateResearchBrief.ts`, `ResearchBriefView.tsx`, Edge `brief.ts` | `validateResearchBrief.test.ts`, brief cases in `assistantApi.test.ts` / `validateAssistantResponse.test.ts` |
| F-AI-06 | Architecture assistant multilingual | `languages.ts`, panel language/detail controls, Edge prompts | `languages.test.ts`, multilingual cases in `validateAssistantResponse.test.ts`, `assistantApi.test.ts` |
| N-SEC-01 | UML component trust boundary | `.env.example`, Edge secrets docs, no OpenRouter in `src/` | Bundle/secret review practice; code grep; `docs/DEPLOYMENT.md` |
| N-SEC-02 | Scalability assistant/feedback | Feedback SQL rate limits; Edge `RATE_MAX` | `feedbackRateLimitContract.test.ts`; constants reviewed in `SCALABILITY.md` |
| N-SEC-03 | UML component Supabase RLS | Migrations + `rlsPolicyContract.test.ts` | Unit contract tests; manual `supabase/tests/rls_security.sql` |
| N-REL-01 | Architecture limitations | `client.ts` optional config; static datasets | Manual: unset env → map still loads; unit paths tolerate missing client |
| N-PERF-01 | Scalability static assets | `wardsAsset.ts`, `parkProjectsAsset.ts` (`?url`) | Observed `dist/assets/*.geojson` in production build |
| N-PERF-02 | Scalability assistant fetch | `evidence.ts` constants | Code review of limits; unit tests for extract/rank (not live fetch) |
| N-QA-01 | Validation doc | `package.json` scripts | `npm test`, `typecheck`, `lint`, `build` — see [`VALIDATION.md`](./VALIDATION.md) |
| N-ACC-01 | Implementation panels | `aria-*` on panels/MapPage status | Code review; not automated a11y suite |
| N-I18N-01 | F-AI-06 design | `languages.ts` + Edge language prompt | `languages.test.ts` |

## Coverage notes

- **Automated unit tests** cover pure logic and API wrappers heavily; MapLibre canvas rendering and live OpenRouter calls are **not** end-to-end tested in CI.
- **Manual** verification remains required for: live RLS SQL, Edge Function deploy + OpenRouter smoke, full map interaction, and production auth redirects.
