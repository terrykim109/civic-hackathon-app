# UML and design diagrams

Diagrams use [Mermaid](https://mermaid.js.org/) and describe the **current** CivicSync implementation. They are design documentation, not generated code.

## 1. Use-case diagram

**Purpose:** Show primary actors and the major use cases the product actually supports.

```mermaid
flowchart LR
  Resident((Resident))
  Admin((Administrator))

  subgraph Public["Public map (/)"]
    UC1[Browse map wards markers]
    UC2[Search location]
    UC3[View nearby proposals]
    UC4[Open record preview]
    UC5[Submit resident feedback]
    UC6[Explore area with AI assistant]
  end

  subgraph AdminArea["Admin (/admin/*)"]
    UC7[Sign in]
    UC8[Manage proposals]
    UC9[Review feedback inbox]
  end

  Resident --> UC1
  Resident --> UC2
  Resident --> UC3
  Resident --> UC4
  Resident --> UC5
  Resident --> UC6
  Admin --> UC7
  Admin --> UC8
  Admin --> UC9
```

**Requirements addressed:** F-MAP-*, F-FB-*, F-AI-*, F-ADM-*.

---

## 2. Component diagram

**Purpose:** Show major deployable/runtime components and trust boundaries.

```mermaid
flowchart TB
  Browser["Browser SPA<br/>Vite + React + MapLibre"]
  OFM["OpenFreeMap / OpenMapTiles"]
  Photon["Photon geocoder API"]
  SB["Supabase<br/>Postgres + Auth + RLS"]
  EF["Edge Function<br/>municipal-research-assistant"]
  OR["OpenRouter API"]
  Official["Allowlisted official HTTPS sources<br/>toronto.ca / ontario.ca / …"]

  Browser -->|vector tiles + style| OFM
  Browser -->|forward geocode| Photon
  Browser -->|anon JWT / session| SB
  Browser -->|functions.invoke| EF
  EF -->|chat completions| OR
  EF -->|fetch HTML/PDF evidence| Official
  EF -->|auth check| SB
  SB -->|RLS + RPC| Browser
```

**Requirements addressed:** F-MAP-01/05, F-AI-02/03, N-SEC-01/03, F-PUB-01.

---

## 3. Class / type diagram (domain core)

**Purpose:** Capture the central TypeScript domain types and their relationships (logical class diagram).

```mermaid
classDiagram
  class MunicipalRecord {
    +id: string
    +title: string
    +decisionStatus: DecisionStatus
    +projectStatus: string
    +participationAvailability: ParticipationAvailability
    +location: RecordLocation
    +sources: OfficialSource[]
    +evidence: RecordEvidence[]
    +dataOrigin: geojson|curated|open_data
  }
  class WardSelection {
    +wardId: string
    +name: string
    +decisionIds: string[]
  }
  class AssistantAreaContext {
    +label: string
    +coordinates: LngLat|null
    +wardId: string|null
    +records: AssistantRecordSummary[]
  }
  class AssistantTurnRequest {
    +area: AssistantAreaContext
    +history: AssistantChatMessage[]
    +userMessage: string
    +mode: converse|research_brief
    +language: string
    +detailLevel: concise|detailed
  }
  class AssistantTurnResponse {
    +message: string
    +citations: AssistantCitation[]
    +researchBrief: ResearchBrief|null
    +evidenceStatus: AssistantEvidenceStatus
  }
  class ResearchBrief {
    +sections: ResearchBriefSection[]
  }

  WardSelection --> MunicipalRecord : decisionIds match id
  AssistantAreaContext --> MunicipalRecord : summarized records
  AssistantTurnRequest --> AssistantAreaContext
  AssistantTurnResponse --> ResearchBrief
```

**Requirements addressed:** F-MAP-03/04, F-AI-01/04/05.

---

## 4. Sequence — Explore this area → assistant turn

**Purpose:** Show the runtime call chain for an AI research turn, including evidence retrieval and validation.

```mermaid
sequenceDiagram
  actor Resident
  participant MapPage
  participant Panel as ResearchAssistantPanel
  participant API as assistantApi
  participant EF as Edge Function
  participant Docs as Official sources
  participant OR as OpenRouter

  Resident->>MapPage: Explore this area
  MapPage->>MapPage: buildResearchContext(...)
  MapPage->>Panel: open with AssistantAreaContext
  Panel->>API: requestAssistantTurn(client, body)
  API->>EF: functions.invoke(municipal-research-assistant)
  EF->>EF: auth + rate limit + validateIncoming
  EF->>Docs: fetch allowlisted URLs (cached)
  Docs-->>EF: HTML/PDF bytes or failure
  EF->>EF: extract text + rankPassages
  EF->>OR: chat/completions (JSON object)
  OR-->>EF: model JSON
  EF->>EF: validateModelJson + ground citations
  EF-->>API: TurnResponse
  API->>API: validateAssistantResponse
  API-->>Panel: ok data / error
  Panel-->>Resident: message, citations, optional brief
```

**Requirements addressed:** F-AI-01…F-AI-06, N-SEC-01/02, N-PERF-02.

---

## 5. Sequence — Resident feedback submit

**Purpose:** Show client gating vs server enforcement for feedback.

```mermaid
sequenceDiagram
  actor Resident
  participant Preview as SelectedRecordPreview
  participant Form as ResidentFeedbackForm
  participant Lib as submitResidentFeedback
  participant SB as Supabase RPC

  Resident->>Preview: open published record
  Preview->>Form: render if feedbackAvailability open
  Resident->>Form: submit comment
  Form->>Lib: validate + rpc submit_resident_feedback
  Lib->>SB: SECURITY DEFINER RPC
  SB->>SB: published? open participation? rate limit? honeypot?
  alt accepted
    SB-->>Lib: ok + id
    Lib-->>Form: success
  else rejected
    SB-->>Lib: error message
    Lib-->>Form: show error
  end
```

**Requirements addressed:** F-FB-01/02, N-SEC-02/03.

---

## 6. How diagrams map to requirements

| Diagram | Primary requirements |
| --- | --- |
| Use case | Product scope / actor goals |
| Component | Trust boundaries, no Express backend, secret placement |
| Class/types | Municipal + assistant domain contracts |
| Assistant sequence | Evidence retrieval + OpenRouter + validation |
| Feedback sequence | Double enforcement (UI + RPC) |
