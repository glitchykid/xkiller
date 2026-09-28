# Architecture

## Design and tracer-bullet delivery

The design starts with one complete vertical slice: validated candles → causal features → fitted model → out-of-sample simulation → visible/exportable results. Core invariants were designed before implementation: closed candles only, chronological evaluation, next-bar execution, explicit costs, no real order path, atomic persistence, and one cancellable background job at a time.

Keep additions within these boundaries. Prefer a small working slice over speculative abstractions. Market calculations remain independent of the UI. The data provider has one concrete implementation because only Bybit is required; add an interface when a second implementation actually needs it. Repeated feature calculations, data validation, formatting, and risk validation have shared implementations.

## Components

| Component               | Responsibility                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `Market`, `BybitClient` | Validate/generate/import base candles and funding; aggregate complete UTC-aligned buckets |
| `Indicators`            | Calculate causal per-frame indicators and align them to the decision timestamp            |
| `Learning`              | Scale, label, fit, select, evaluate, and predict with deterministic softmax regression    |
| `Simulation`            | Convert past signals into trades; apply position sizing, costs, exits, and risk halt      |
| `Lab`                   | Own one workspace, background job lifecycle, persistence, and export                      |
| ASP.NET Core host       | Bind to loopback, authenticate requests, validate commands, expose a small API            |
| Electron main           | Launch/stop sidecar; own token; validate IPC sender/action; save native exports           |
| Preload                 | Expose research requests/exports and validated appearance get/set methods               |
| Svelte                  | Display state, edit experiment parameters, submit actions, poll job progress              |

The API returns immediately for import, training, and simulation. The UI polls state every 900 ms without overlapping poll calls. A running job rejects competing state-changing jobs. Candidate results are computed before committing; a successful persistence write happens before replacing the in-memory state.

## Desktop communication

```text
Svelte renderer
    ↓ narrow contextBridge (action + payload)
Electron main
    ↓ HTTP / loopback + random 256-bit session token
ASP.NET Core sidecar
    ↓ application service
Pure C# research core
```

The renderer has no Node integration, has context isolation and sandboxing enabled, and never receives the authentication token. Main-frame IPC calls must originate from the expected application URL. Popups, external navigation, and permission requests are denied. The sidecar binds only to `127.0.0.1`; an incorrect or missing token yields HTTP 401. Request bodies are capped at 16 KiB.

For development only, Vite can proxy requests to the sidecar using the token held in its process environment. This convenience endpoint must never be exposed to untrusted networks.

Presentation is a separate UI concern. Shared validators restrict preferences to six locales. Electron serializes trusted `preferences:get` / `preferences:set` calls and atomically stores the locale in `preferences.json` alongside the research workspace. The Svelte preference store applies the saved HTML language before mounting; its reactive locale drives translation and `Intl` formatting. Browser development uses local storage through the same store. The renderer and native window always use the dark palette; legacy theme fields are ignored. See [localization](LOCALIZATION.md) for boundaries and extension rules.

## Persistence and process lifecycle

Internal view selection, unsaved form values and table pages are renderer state. `Tabs.svelte` owns accessible keyboard navigation; `Pager.svelte` renders the shared page controls. The pure `paginate` helper clamps indices without losing records when the available row count changes. Svelte's dimension binding observes the content area so table capacity responds to window size and status bars. These presentation changes do not modify the API payloads, workspace schema or research calculations.

Job completion detection accounts for the operation currently being submitted, so a first job that finishes before the next poll still opens its result view. Repeated snapshots of the same completed job do not trigger another transition; an initially restored result does not count as a new completion.

`workspace.json` version 1 stores a single dataset/model workspace and at most 20 complete simulation runs. Dataset identity is a truncated SHA-256 of candles and funding, so a model cannot run against a different dataset. Model JSON contains normalization parameters, weights, temporal split boundaries, options, loss curves, and metrics. Exported reports include source/dataset identity and full simulation inputs/results.

Electron launches an actual sidecar executable or DLL (not a `dotnet run` process tree). The sidecar reports its ephemeral port over stdout. Electron kills the child on application exit; the child also watches the parent PID to avoid remaining active after an unexpected parent exit. An initial desktop startup failure is reported in an error dialog.

## API

All routes require `X-Xkiller-Token`.

| Method | Route                | Input                                                                            |
| ------ | -------------------- | -------------------------------------------------------------------------------- |
| GET    | `/api/state`         | Current dataset metadata, chart windows, frames, model, runs, latest result, job |
| POST   | `/api/import`        | `{ "days": 90 }`, integer 30–360                                                 |
| POST   | `/api/demo`          | Replace workspace with deterministic synthetic data                              |
| POST   | `/api/train`         | `TrainingOptions`                                                                |
| POST   | `/api/simulate`      | `RiskOptions`; requires matching trained model                                   |
| POST   | `/api/cancel`        | Request cancellation of current job                                              |
| GET    | `/api/export/model`  | Downloadable JSON payload                                                        |
| GET    | `/api/export/report` | Complete latest experiment JSON payload                                          |
| GET    | `/api/export/trades` | Complete latest ledger CSV payload                                               |

## Deliberate boundaries

Only public market-data APIs are reachable in the exchange client. There are no private endpoints, credentials, order placement methods, or live position state. Automated execution must be a separately designed and tested extension. The current model is small enough to inspect and train locally; no cloud LLM dependency is involved.
