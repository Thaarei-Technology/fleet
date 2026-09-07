# Thaarei Fleet pilot implementation plan

Status: execution plan. P0 is **Complete** (accepted 2026-09-07, P1 authorized, P1 not started). P1–P9 are **Not started**.

This file is the working plan for the Thaarei Fleet pilot. It converts the
broader product requirements and technical baseline into a small, ULIP-first
vehicle and driver registry that can run at low cost on Dokploy in an India
hosted Linux VM. Execute one phase at a time in a separate agent chat. The
agent must stop at that phase's handoff unless the phase request explicitly
authorizes the next action.

Target pilot date: **February 1, 2027**. Use January for release validation,
customer rehearsal, recovery testing, and the first 10–25 vehicle cohort.
Nishanth is the product and operations owner and expects to spend about 24–36
hours each week, six days per week. AI agents may implement bounded packages;
Nishanth and the primary agent review architecture, security, data integrity,
integration, and release evidence.

## 0. Start here: authority and read sequence

Read applicable repository and parent `AGENTS.md` instructions first. Then
read the files in this order before starting any phase:

1. Read this file, including the phase status table, the scope boundary, and
   the phase selected for the current chat.
2. Read `/Users/nishanth/.codex/devx/profiles/instructions.md`. This file is
   the local operating contract for project setup, synchronization, remote
   execution, and validation. Follow it before using `devx`.
3. Read [`docs/PRD.md`](PRD.md) for requirement IDs, product authority,
   security requirements, and acceptance language. Use the disposition in
   section 2 of this file when the pilot intentionally narrows a requirement.
4. Read [`docs/Product and Technical Plan.md`](<Product%20and%20Technical%20Plan.md>)
   for the technical decisions and the relevant section named in the phase.
   Treat it as the broader Version 2 baseline, not as proof that a capability
   already exists in the Fleet checkout.
5. Before bootstrap, inspect the pinned `Thaarei-Technology/app-starter-kit`
   source and its own `AGENTS.md`, initializer, generator, release metadata,
   and package manifests. Use the exact reviewed commit recorded in the phase
   evidence. Do not follow a moving branch during generation.
6. After bootstrap, inspect the generated root `IMPLEMENTATION.md`, the
   generated root `AGENTS.md`, the generated `package.json` files, and the
   generated source before choosing commands or paths. The generated source is
   the authority for available scripts and interfaces.
7. Before each later phase, read its planned `.thaarei/work/FLEET-Pxx.md` work
   record if it exists, then inspect the actual files named there. The
   `.thaarei/work/` records are future paths and may not exist yet.

Keep the two source documents unchanged. This file governs the pilot changes
when a pilot decision intentionally supersedes a broader requirement. Record
the reason and the requirement IDs in the phase work record and handoff.

### File map

| File or location                                         | Use                                                 | Current state                                                 |
| -------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| `docs/IMPLEMENTATION_PLAN.md`                          | Pilot authority, sequence, gates, and handoff rules | This file; created by the planning task                       |
| `docs/PRD.md`                                          | Version 2 product requirements and IDs              | Existing source; preserve                                     |
| `docs/Product and Technical Plan.md`                   | Version 2 decisions and technical baseline          | Existing source; preserve                                     |
| `/Users/nishanth/.codex/devx/profiles/instructions.md` | DevX setup and execution rules                      | Existing personal file; read before DevX work                 |
| `app-starter-kit` pinned checkout                      | Bootstrap input and generator behavior              | External source; inspect in P0                                |
| `IMPLEMENTATION.md` at generated root                  | Generated execution-status dashboard                | Planned output; derive from work records, never hand-edit     |
| `.thaarei/work/FLEET-Pxx.md`                           | One phase's objective, evidence, and handoff        | Planned output; create only after generator contract is known |

## 1. Final pilot scope

### 1.1 Product outcome

Build one shared, logically isolated SaaS product for Indian transportation
organizations to manage vehicles and drivers and to view approved ULIP facts.
The first customer can hold up to 500 managed assets. Start with a measured
10–25 vehicle cohort, then expand only after quota, capacity, support, and
recovery evidence support the next wave.

The product accepts records from anywhere in India. Prioritize South Indian
states first during customer rehearsal, then include North Indian states in the
same registry model. Store registration state, operating state, RTO, and
licensing authority as separate values. A state can be represented before a
state-specific compliance rule is reviewed.

### 1.2 Included records and categories

Include organizations, memberships, fleets, locations, vehicles, drivers,
administrative vehicle–driver links, lookup requests, provider observations,
current projections, audit events, and operational lookup status.

Classify hazardous tankers, non-hazardous tankers, passenger buses, lorries,
and related transportation vehicles for record management. Category is a
classification only. It is not a hazardous-goods certificate, passenger
permit decision, legal clearance, or proof that a driver operated a vehicle.

Support independently registered trailers where the source and customer need
require them. Oversized loads and refrigerated goods are deferred categories.

The first pilot focuses on vehicle and driver details. Defer document uploads,
document review, compliance rules, expiry reminders, complaints, case
management, and related workflows. Preserve the domain boundary so those
features can be added later without treating a provider fact as a customer
editable fact.

### 1.3 Exact provider dataset set

The pilot has exactly five dataset roles:

| Dataset         | Pilot role                 | Required behavior                                                          |
| --------------- | -------------------------- | -------------------------------------------------------------------------- |
| `VAHAN/04`    | Vehicle verification       | Retrieve permitted registration and vehicle facts                          |
| `SARATHI/02`  | Driver verification        | Retrieve permitted licence facts under the approved lookup contract        |
| `FASTAG/02`   | FASTag verification        | Retrieve permitted tag identifiers, issuer, class, status, and issue facts |
| `ECHALLAN/01` | Read-only enforcement view | Display returned pending or disposed challan details                       |
| `FASTAG/01`   | Recent activity view       | Display bounded recent toll observations with source timestamps            |

Do not add another dataset in the pilot. Do not automatically fall back to
`VAHAN/01`, `SARATHI/01`, or another endpoint. Do not use `TOLL/01`. If a
dataset is not approved or unavailable, show that state and retain the last
successful observation. Do not fabricate data or claim coverage that the
dataset does not provide.

Each dataset requires written approval for purpose, fields, subject types,
quotas, retention, caching, redistribution, export, egress allowlisting, and
production access. The current approval work is in progress. Development may
use deterministic fixtures or an emulator. Live pilot use remains blocked by
the evidence gate in section 7.

### 1.4 Core journeys

The pilot must support these journeys:

- Sign in, recover an account, choose an organization, and revoke access.
- Create and maintain organization-owned fleets, locations, vehicle fields,
  driver fields, and operational categories.
- Add one vehicle or driver by approved identifier and enqueue permitted
  asynchronous lookup work.
- Import bounded CSV lists with preview, validation, explicit commit, and
  idempotent retry behavior.
- Link one current primary driver and optional relief drivers to a vehicle by
  effective dates while retaining history.
- View provider facts with source, observation time, retrieval time, freshness,
  partial or masked status, and lookup history.
- View read-only challans and bounded recent toll observations where the
  organization has entitlement and the dataset returns a result.
- Search, filter, count, and export only authorized organization data.
- Review tenant-visible audit history and platform operators' separately
  protected security evidence.

### 1.5 Fixed roles

Use three customer roles:

- `Owner` manages the organization, memberships, settings, and all customer
  operations.
- `Manager` manages records, imports, administrative links, and permitted
  lookups.
- `Viewer` has authorized read-only access with sensitive fields masked by
  default.

Keep Thaarei platform administration separate. A support case, billing
relationship, or platform role does not grant implicit customer-data access.

### 1.6 Pilot economics and operations

Run a free design-partner pilot with a declared managed-asset allowance. Keep
the entitlement and capacity check server-side. Defer Razorpay, automated
subscriptions, metering, overage collection, and billing UI unless a later
phase is explicitly authorized.

Target total Fleet operating cost at ₹5,000–₹15,000 per month, excluding
development staff. Show the existing host's allocated cost and incremental
Fleet expenditure separately. Include email, registry, recovery storage, and
traffic. Record ULIP fees separately until written charges are available,
then reconcile the complete operating estimate before promising the budget.

Support the pilot during Monday–Saturday, 09:00–18:00 IST. The recovery target
is four covered business hours. An outage outside the window starts the covered
clock at the next support window. The target does not claim 24x7 response.

The broader 99.5% customer-journey availability objective is an internal
measured objective for this pilot. It is not an external SLA or customer
promise. Measure it only after the pilot runtime and journey probes exist.

## 2. Resolve the old PRD and technical-plan conflicts

The source documents remain intact and useful. The following pilot decisions
are explicit dispositions, not silent edits.

This file has pilot precedence for implementation scope. Future agents must
not recreate the original full Version 2 schema, all 51 evidence gates, four
Compose projects, or deferred full-MVP test suites. Trace each deferred item
to its source section or requirement ID, record it as deferred, and preserve
the controls that apply to the smaller pilot. The original technical
decisions remain context; they do not automatically inherit every platform
gate when the pilot does not use the related capability.

| Broader requirement or decision                                                                      | Pilot disposition                                                                       | What remains mandatory                                                                                       |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| One product for about 100 organizations, 50,000 assets, and 100,000 drivers                          | Replace with one customer, 500-asset allowance, and 10–25-vehicle first cohort         | Schema and tenant boundaries must not prevent later growth                                                   |
| Document uploads, scanning, encrypted object storage, OCR, evidence review, and credential catalogue | Defer                                                                                   | Data classification, retention, deletion, audit, and source provenance still apply to the records that exist |
| Compliance engine, reviewed policy packs, findings, cases, tasks, and expiry reminders               | Defer                                                                                   | Vehicle category is descriptive only; the UI must label unsupported compliance coverage                      |
| Complaints, support case workflows, and external helpdesk processing                                 | Defer product case features                                                             | Provide a private operational contact path and keep support access separately authorized                     |
| Billing plans, Razorpay, receivables, tax documents, and automatic overages                          | Defer implementation; use a free pilot allowance                                        | Capacity entitlement remains a server-enforced control and customer terms must state the allowance           |
| Pilot fallbacks to`VAHAN/01`, `SARATHI/01`, and `FASTAG/01`                                    | Remove automatic fallbacks; keep`FASTAG/01` only as its explicit recent-activity role | Dataset selection, quota, provenance, and failure states remain explicit                                     |
| `TOLL/01` utility or live route interpretation                                                     | Defer                                                                                   | Toll observations never become live location, reconstructed route, or complete movement history              |
| Garage, MinIO, upload scanner, second active application host, and full telemetry stack              | Defer from the minimal pilot topology                                                   | Backup, access, retention, deletion, logs, and recovery controls remain required                             |
| Initial production cost of ₹15,000–₹40,000                                                        | Replace with ₹5,000–₹15,000 target                                                   | Capacity and recovery evidence override the target if the host cannot safely run the stack                   |
| 24x7 staffed critical response                                                                       | Replace with business-hours support for this pilot                                      | Security reporting, provider terms, and statutory deadlines remain independent of support hours              |
| Universal pan-India compliance coverage                                                              | Defer                                                                                   | Store nationwide states and show unsupported rule coverage clearly                                           |
| Specialized operations as compliance policy cells                                                    | Narrow to vehicle categories                                                            | Do not market category labels as regulatory decisions                                                        |

Apply old security and legal controls to the pilot by context. Keep controls
that protect tenant records, provider facts, identifiers, access, retention,
deletion, recovery, and truthful claims. Defer controls whose only purpose is a
deferred capability, such as binary document-upload scanning, OCR, object
storage, document evidence review, or full legal-publication workflows.

The following controls are unaffected by scope reduction: organization-level
tenant isolation, PostgreSQL RLS, server-enforced authorization, authentication
assurance, membership lifecycle, auditability, source and retrieval provenance,
provider-subject binding, idempotency, bounded retries, data minimization,
retention and deletion authority, restore-safe deletion, India residency,
secrets isolation, truthful degraded modes, export authorization, release
provenance, and production admission evidence.

Pilot implementation can continue while legal, privacy, customer, and ULIP
documents are prepared. Real customer data, live driver lookups, and external
pilot activation remain blocked until the minimum evidence gates in section 7
are complete. “Not ready yet” is a recorded state, not a reason to invent a
provider response or waive a control.

## 3. Starter and bootstrap findings

### 3.1 Product identity and selected capabilities

| Setting                        | Planned value                                                  |
| ------------------------------ | -------------------------------------------------------------- |
| Display name                   | `Thaarei Fleet`                                              |
| Product ID and client ID       | `thaarei-fleet`                                              |
| Package scope                  | `@thaarei`                                                   |
| Private repository             | `Thaarei-Technology/fleet`                                   |
| Mac checkout                   | `/Users/nishanth/projects/fleet`                             |
| Technical and operations owner | `Nishanth`                                                   |
| Commercial owner               | `Thaarei Ventures LLP`                                       |
| Deployment target and topology | `dokploy`, `standard`                                      |
| Profiles                       | `web,api,data,identity,tenancy,jobs,events,cache,rate-limit` |

The private repository is a planned destination, not evidence it already
exists. Inspect before creating or connecting it. Preserve Version 1, its
repository, deployed services, and data. This plan includes no migration,
retirement, or replacement of Version 1.

Omit storage, notifications, payments, external-api, search, observability,
mobile, Python, and AI profiles. Outbound ULIP calls do not require Fleet's
own public REST/OpenAPI profile. Keep Pino and basic operational logging even
though the observability profile is omitted.

### 3.2 Verified starter findings

The reviewed starter input is the pinned commit
`e82b6b705012d6f317b07189a048efbe3d5acb0c`. The release metadata at that
commit declares `1.0.0-dev.1`, Node `24.20.0`, and pnpm `11.22.0`.

Use these pinned source references during P0:

- [`starter-release.json`](https://github.com/Thaarei-Technology/app-starter-kit/blob/e82b6b705012d6f317b07189a048efbe3d5acb0c/starter-release.json)
- [`AGENTS.md`](https://github.com/Thaarei-Technology/app-starter-kit/blob/e82b6b705012d6f317b07189a048efbe3d5acb0c/AGENTS.md)
- [`packages/create-app/src/index.ts`](https://github.com/Thaarei-Technology/app-starter-kit/blob/e82b6b705012d6f317b07189a048efbe3d5acb0c/packages/create-app/src/index.ts)
- [`packages/create-app/src/generator.ts`](https://github.com/Thaarei-Technology/app-starter-kit/blob/e82b6b705012d6f317b07189a048efbe3d5acb0c/packages/create-app/src/generator.ts)

The reviewed findings shape the bootstrap work:

- Generated products consume exact-version private foundation and tooling
  packages. Verify package availability and remote build access before
  generation. An earlier package-listing check returned `403`.
- A `403` means **access was denied at the time of the check**. It does not
  prove that the packages are unpublished. Record availability as
  `UNKNOWN` until the actual permitted package installation test succeeds.
- The initializer combines installation, validation, and Git initialization.
  Add and test a bounded `--skip-git` option before Fleet generation so Git
  remains on the Mac checkout.
- The initializer rejects an existing destination. Generate into a new,
  nonexistent scratch destination, then import the verified output into this
  checkout after collision inspection.
- The generated identity-mail default uses Resend. Fleet's intended adapter is
  ZeptoMail, with Mailpit for development.
- The generated outbox handler currently records delivery without performing a
  provider effect. Replace it with the actual Fleet job/event dispatcher and
  record completion only after the declared work succeeds. Reminder and alert
  notification dispatch remains outside this pilot.
- The generated Valkey adapters require client callbacks. Wire the actual
  client and atomic counters; selecting a profile does not implement the
  distributed limiter.
- Live Dokploy deployment, restore, rollback, and registry attestation were
  still unqualified in the reviewed release metadata. Record Fleet-specific
  proof before production admission.

Do not state exact generated package names, scripts, commands, routes, or
directory paths until the generated source is inspected. Discover them from
the generated `package.json`, `IMPLEMENTATION.md`, `AGENTS.md`, command
`--help` output, and source exports. Do not guess from an older starter
version.

### 3.3 Fleet as the starter trial consumer

P0 and P1 use Fleet as the first real trial of the selected starter profiles
and their dependency closure. A reproducible defect in the initializer,
generator, selected profile composition, shared foundation package, shared
tooling package, generated documentation, or starter validation belongs in
`app-starter-kit`. Fix that defect in the starter source and add a regression
test there. Product rules, Fleet screens, Fleet data models, ULIP behavior, and
the ZeptoMail choice belong in Fleet.

Use this defect loop during P0 and P1:

1. Reproduce the failure from the recorded starter source in an isolated
   fixture through the starter DevX profile.
2. Classify the failure as a starter defect, a Fleet defect, or an environment
   problem. Record the evidence and the affected selected profiles.
3. For a starter defect, follow the starter repository's `AGENTS.md`. Add the
   smallest failing regression test, then fix the owning starter module.
4. Run the owning package checks and the generated-output checks for every
   affected selected profile. If shared generator behavior changed, run the
   starter's required broader validation matrix.
5. Ask the primary agent to inspect the starter diff and validation evidence.
   Record the exact repaired commit. If a commit is not yet authorized, record
   the base commit and a complete patch hash and keep the result provisional.
6. If the repair changes a versioned private package, qualify the new exact
   package version and its access before Fleet consumes it. Publication and
   release remain explicit owner actions.
7. Generate Fleet again in a new scratch destination. Compare the complete
   output with the failed attempt, then import only the reviewed result.

Keep the starter repair and the Fleet implementation as separate diffs and
separate evidence. Do not make a permanent repair only in generated Fleet
code. If the problem is Fleet-specific, change Fleet and leave the starter
unchanged. Record non-blocking starter improvements in the starter backlog;
they do not expand P0 or P1. A blocking starter defect keeps the current phase
open until the repaired source, required package version, and regenerated
output pass.

## 4. Architecture, data, UI, and provider contracts

### 4.1 Runtime shape

Keep a modular monolith:

- Next.js responsive web application.
- Fastify and tRPC private transport.
- Core modules for product rules and authorization.
- PostgreSQL repositories and RLS for persistence and tenant isolation.
- Provider adapters for ULIP and identity email.
- Graphile Worker for lookup execution, retry, and bounded background work.
- Valkey for coordination counters and short-lived coordination state.

Do not introduce microservices or a public customer API for this pilot. The web
process must not call PostgreSQL, ULIP, secrets services, email providers, or
Valkey directly. Keep provider URLs and credentials inside adapters.

### 4.2 Tenant and data contract

`organization` is the tenant boundary. Every tenant-bearing request, job,
repository operation, audit row, export, and provider observation carries the
organization context. Set PostgreSQL transaction context for both web requests
and background jobs. Use `NOSUPERUSER` and `NOBYPASSRLS` runtime roles for
tenant tables.

Separate these record classes:

| Record class               | Authority                                      | Customer editing                             |
| -------------------------- | ---------------------------------------------- | -------------------------------------------- |
| Organization-owned details | Fleet application                              | Authorized fields only                       |
| Provider observation       | ULIP response plus immutable provenance        | Read-only; refresh creates a new observation |
| Current projection         | Application projection of accepted observation | Never manually overwrite provider fields     |
| Processing state           | Fleet job and lookup lifecycle                 | Authorized retry or refresh only             |
| Audit event                | Append-only application or platform stream     | No mutation or deletion through the product  |

Use UUIDv7 for internal entity identity. Treat registration, licence, and tag
identifiers as typed, normalized, versioned external evidence. Store provider
subject binding and response status before accepting a result into a projection.

Encrypt restricted identifiers and restricted provider fields with
application-side authenticated encryption. Keep the key path outside the
database and separate production and recovery wrapping paths. Support exact
matching through a keyed, tenant-scoped lookup value. Do not log raw provider
bodies, raw restricted identifiers, or provider credentials.

Separate provider observation time from retrieval time. Preserve missing,
masked, partial, stale, unavailable, malformed, not-found, quota-wait,
temporary-failure, schema-mismatch, and subject-mismatch states. A failed
refresh keeps the last successful result and its timestamp.

### 4.3 Vehicle and driver contract

Vehicle fields include the normalized registration identifier, source identity,
category, registration and operating states, RTO or authority references,
organization references, active or offboarding state, and provider facts.

Driver fields include the approved lookup identifier, organization-owned display
and contact fields, licence facts returned by the approved contract, and active
or offboarding state. Do not collect DOB, Aadhaar, PAN, or another sensitive
identifier unless the approved lookup contract requires a minimized field.

Administrative links have vehicle ID, driver ID, role (`primary` or `relief`),
effective start, effective end, actor, and audit evidence. Enforce one current
primary link per vehicle and reject overlapping duplicate relationships.
Retain link history. Never describe the link as proof of actual duty or legal
eligibility.

### 4.4 Lookup and quota contract

Save lookup intent and enqueue provider work transactionally. The provider port
must receive organization ID, dataset ID, subject type, normalized subject,
permitted purpose, allowed fields, idempotency key, and correlation ID. Return
an operation ID to the UI. Do not expose raw ULIP payloads or make the customer
request a synchronous ULIP proxy.

Enforce account-wide, dataset, organization, and subject controls. Persist a
durable usage ledger. Use written ULIP values for production limits. Do not
infer quotas from missing headers or load testing. Apply cooldowns and bounded
retries, and pause new calls when Valkey coordination is unavailable. Recover
consumed usage from PostgreSQL before resuming.

Use a 15-minute user-refresh cooldown unless the approved dataset terms require
a longer interval. Do not enable automatic whole-fleet polling in the pilot.
Fetch challans and recent toll observations on request. Primary lookups run
on onboarding and authorized refresh. Scheduled whole-fleet refresh and
continuous toll history are deferred. Label `FASTAG/01` as recent activity
with source coverage limits, never GPS or complete movement history.

### 4.5 Import contract

Support UTF-8 CSV and pasted identifier lists. Defer XLSX. An import contains
identifiers and organization-owned fields, never reconstructed provider facts.
CSV parsing is bounded and in-memory or staging based. The pilot does not
accept binary documents and does not require a document-upload scanner.

- Limit each upload to 5 MiB and 1,000 rows.
- Validate columns, identifiers, and tenant-local duplicates.
- Show a side-effect-free preview.
- Commit explicit batches of at most 100 rows.
- Make retry idempotent.
- Enforce the asset allowance on the server.
- Enqueue provider work only after commit.
- Report committed, rejected, pending, and provider-pending counts.
- Prevent spreadsheet formula injection in exports.

### 4.6 UI and permission contract

Implement login and recovery, organization selection, dashboard, vehicle list
and detail, driver list and detail, fleet and location management, import
preview and result, lookup queue, users, and audit history.

Vehicle detail shows provider facts, FASTag results, read-only challans, bounded
toll observations, administrative links, and lookup history. Use server-side
authorization for every read, mutation, field disclosure, and export. Mask
sensitive identifiers by default. Show unsupported coverage, stale data, and
provider failure in plain language.

Use PostgreSQL for MVP search and reporting. Generate bounded CSV responses
without public links or persistent export files. Include provider-derived
fields only when the dataset policy permits export.

## 5. Bootstrap and DevX sequence

### 5.1 Rules for this checkout

Keep Git operations on the existing Mac checkout. Create an ordinary topic
branch from the current base branch for each phase. Run installs, builds, tests,
migrations, Docker commands, and servers through `devx`. Before the
Fleet application profile exists, use the external starter bootstrap profile.
Use `devx setup` for preparation and `devx start`
explicitly for execution. Do not start an application from `devx setup`.

The current DevX profile is documentation-only. Do not invent application
commands in it. Generate and inspect the application first, then update the
profile with real service commands, health checks, and validation commands.

### 5.2 Bootstrap order

1. Read `/Users/nishanth/.codex/devx/profiles/instructions.md` and run the
   required read-only status and guide checks for this project.
2. Inspect the current Fleet checkout, Git status, docs, and any project-level
   `AGENTS.md`. Preserve unrelated changes.
3. Inspect the pinned starter commit, generator flags, package manifests,
   release metadata, and private-package access. Record the `UNKNOWN` state if
   the access test returns `403`.
4. Prepare and validate an external DevX bootstrap profile for the pinned
   starter checkout before any install, build, test, or generation. Keep its
   files outside the repository. The checkout and Git operations stay on the
   Mac; its remote mirror must not contain Git metadata.
5. Implement and test the bounded starter prerequisite that adds `--skip-git`
   through this bootstrap profile. Preserve default behavior and reject its
   combination with remote-repository creation. Record the resulting source
   revision and input hashes before generation; do not silently follow `main`.
6. Generate `thaarei-fleet` into a new, nonexistent scratch destination. Use
   the approved profile list:

   ```text
   web,api,data,identity,tenancy,jobs,events,cache,rate-limit
   ```
7. Inspect the complete generated output. Verify product name, package scope,
   owner values, profiles, deployment values, metadata, dependency versions,
   `IMPLEMENTATION.md`, and the generated source contracts.
8. If generation or inspection exposes a reusable starter defect, run the
   section 3.3 defect loop. Generate into a new scratch destination after the
   repair and repeat step 7.
9. Transfer only verified source output to the Mac. Exclude dependencies,
   caches, credentials, runtime artifacts, and scratch state. Inspect path
   collisions before importing into `/Users/nishanth/projects/fleet`.
10. Update the Fleet DevX profile after the generated application manifests and
    commands are known. Keep `profile.json`, `compose.yml`, `controller.sh`,
    and profile instructions consistent.
11. Validate and activate the complete Fleet profile. Run `devx setup`, then
    `devx status --json`; require zero synchronization conflicts, the intended
    mirror, resource admission, and only loopback forwards.
12. Run `devx start` explicitly. Use separate development services for web,
    API, worker, PostgreSQL, Valkey, and Mailpit. Run the smallest generated
    validation through `devx`, followed by the applicable full product check.
13. Prove browser login, tenant isolation, migrations, worker execution, and
    a disposable lookup fixture before feature work proceeds.

After bootstrap, inspect the generator's work-record contract. If it creates
`.thaarei/work/`, use that exact namespace and format. Create one
`.thaarei/work/FLEET-Pxx.md` per phase. The generated root `IMPLEMENTATION.md`
derives from work records according to the starter contract. Run the verified
`implementation:sync` script through `devx`; never hand-edit that dashboard. It does not
replace this plan, and this plan does not replace the generated work records.

### 5.3 Starter work-record rule

Before bootstrap, record progress in section 6 of this file. After bootstrap,
record each phase's execution, changed paths, validation, and handoff in its
`.thaarei/work/FLEET-Pxx.md` file. First inspect the generated format before
creating records. Do not create a guessed work-record format.

## 6. Phase execution log

Use this section only for bootstrap progress before the generated work-record
contract is known. Add dated entries with the phase, actor, command or source
reference, result, and next handoff. Do not use this section as a substitute
for post-bootstrap `.thaarei/work/FLEET-Pxx.md` records.

### 2026-09-06 — P0 starter qualification

Actor: primary Codex agent with a bounded starter implementer.

Status on 2026-09-06: **Blocked.** P0 code and selected-profile fixture work
were implemented, but private package access and the complete starter
validation gate had not passed. P1 had not started.

Objective and dependencies:

- Qualify the pinned starter input and add the required `--skip-git` behavior
  without generating Fleet.
- Use `/Users/nishanth/projects/app-starter-kit` at base revision
  `e82b6b705012d6f317b07189a048efbe3d5acb0c`, release
  `1.0.0-dev.1`, Node `24.20.0`, and pnpm `11.22.0`.
- Use the ordinary `codex/fleet-p0` branch in both the Fleet and starter
  checkouts. No linked checkout exists or is required.
- Keep the private package identities at
  `@thaarei-technology/foundation@1.0.0-dev.1` and
  `@thaarei-technology/tooling@1.0.0-dev.1`.

Changed paths:

- Starter source and tests:
  `packages/create-app/src/generator.ts`,
  `packages/create-app/src/index.ts`,
  `packages/create-app/src/validation.ts`,
  `packages/create-app/src/index.test.ts`,
  `packages/create-app/src/initializer.test.ts`, and
  `packages/tooling/src/pack-check.ts`.
- External bootstrap profile:
  `/Users/nishanth/.codex/devx/profiles/fleet-starter-bootstrap/`.
  DevX instance `8da5518ada56` mirrors the authoritative starter at
  `/home/mnishanth02/codex-runtimes/fleet-starter-bootstrap/8da5518ada56/src`.
- Personal Git and DevX instructions now require ordinary topic branches in
  existing checkouts. The temporary changes in
  `/Users/nishanth/thaarei/technology/thaarei-starter` were removed, and that
  checkout is clean on its original `main` revision `49235c1`.
- This file contains the pre-bootstrap record. No guessed
  `.thaarei/work/FLEET-P0.md` file was created.

Starter source input:

- Base revision:
  `e82b6b705012d6f317b07189a048efbe3d5acb0c`.
- Uncommitted patch SHA-256:
  `1d66cb956217da670d3cc08b977b734e9f9f7df7a4c7f467e577ce96566c21ba`.
- The patch adds the boolean `--skip-git` option, rejects remote-repository
  combinations, preserves default `git init --initial-branch=main`, and keeps
  clean package-consumer checks outside any parent pnpm workspace.

Commands and results:

- `devx profile validate fleet-starter-bootstrap`: passed.
- `devx setup`, `devx status --json`, and `devx start`: passed for instance
  `8da5518ada56`. Synchronization had zero conflicts, both forwards were bound
  to loopback, health was green, and the resource gate passed.
- `devx test environment`: passed with Node `v24.20.0`, pnpm `11.22.0`, Git
  `2.39.5`, and Python `3.11.2`.
- `devx test install`: passed with the frozen starter lockfile.
- `devx test help`: passed and displayed `--skip-git`.
- `devx test package-access`: failed before package installation because the
  instance-specific remote secret does not contain `NODE_AUTH_TOKEN`. Package
  availability remains unverified. No secret value was read or recorded.
- `devx test test-skip-git`: passed, 57 tests. The test ran the complete
  initializer and generated validation, proved that `--skip-git` leaves no
  `.git`, proved default initialization writes `refs/heads/main`, and covered
  incompatible remote options.
- `devx test recipe`: passed as a dry run. The nonexistent destination remained
  absent, validation errors and warnings were empty, and both requested and
  resolved profiles were exactly
  `web,api,data,identity,tenancy,jobs,events,cache,rate-limit`.
- `devx test qualify-selected-profiles`: passed. The disposable fixture wrote
  123 files, passed generated validation, matched `dokploy` and `standard`, and
  contained no Git metadata.
- `devx test pack-check`: passed. All three publishable tarballs installed in
  an isolated clean consumer.
- The first `devx test validate-starter` attempt stopped at an unused `tmpdir`
  import in `index.test.ts`. The import was removed. A targeted
  `devx exec -- corepack pnpm exec biome lint ...` diagnostic then failed
  because `corepack` is not installed in the remote host shell. The profile's
  container-backed validation command remained the authoritative check.
- The final `devx test validate-starter` attempt partially passed. Release, publication,
  source-of-truth, boundary, implementation, format, lint, typecheck, 125
  tests, pack validation, and the `web-only`, `internal-tool`,
  `web-developer-handoff`, `web-mobile-product`, and
  `durable-agentic-workflow` fixtures passed. The
  `all-server-capabilities` fixture then failed at `pnpm db:up` because the
  hardened bootstrap container has no Docker client or daemon access. The
  container was not granted control of the shared host Docker socket.
- `git diff --check`: passed in the starter and Fleet checkouts. Both source
  documents remained unchanged.

Acceptance evidence and unresolved issues:

- The skip-Git behavior and Fleet-selected profile fixture satisfy their local
  acceptance checks. The exact private package installation does not.
- The complete starter fixture matrix remains unqualified in this DevX runtime.
  Use a separately approved Docker-capable validation route. Do not expose the
  shared host Docker socket to the hardened bootstrap container by default.
- All supplier, customer, ULIP, production, recovery, privacy, email, and pilot
  gates in section 7 remain open. They do not block synthetic development, but
  they still block their named live actions.

Exact handoff:

1. Provision `NODE_AUTH_TOKEN` through the instance-specific remote DevX secret
   path, outside chat and the repository. Rerun `devx test package-access`.
2. Approve a bounded Docker-capable starter validation environment and rerun
   `devx test validate-starter`, or record an explicit phase decision that the
   passed selected-profile qualification is the required P0 boundary.
3. Recompute the complete starter patch hash after any repair and inspect the
   final diff. Mark P0 complete only when both remaining checks are accepted.
4. Start P1 only after that P0 acceptance. P1 must generate into a new scratch
   destination from the recorded starter revision and patch.

### 2026-09-07 — P0 acceptance

Actor: primary Codex agent.

Status: **Complete.** This handoff authorizes P1, but P1 has not started.

Accepted source and dependencies:

- Authoritative starter:
  `/Users/nishanth/projects/app-starter-kit`, branch `codex/fleet-p0`, clean at
  revision `d34272063cc3bd8fb86ac2be6e68e3418b744989` and tag
  `starter-v1.0.0-dev.1`.
- The accepted source contains separate commits for `--skip-git`, isolated
  pack-check pnpm resolution, and pack-check argument parsing:
  `87b9bda`, `60ba9d5`, and `d342720`.
- Private package access resolved exactly
  `@thaarei-technology/foundation@1.0.0-dev.1` and
  `@thaarei-technology/tooling@1.0.0-dev.1`. No token value was read or
  recorded.
- The former starter checkout at
  `/Users/nishanth/thaarei/technology/thaarei-starter` remains clean on its
  original `main` revision `49235c1`. No linked checkout or Git worktree was
  created.
- Before bootstrap, this section remains the work record. No guessed
  `.thaarei/work/FLEET-P0.md` was created.

Commands and results:

- `devx profile validate fleet-starter-bootstrap`: passed.
- `devx test package-access`: passed for both exact private package versions.
- `devx test environment`, `devx test install`, and `devx test help`: passed;
  help displayed `--skip-git`.
- `devx test test-skip-git`: passed, 57 tests. The generated fixture passed
  its complete validation without `.git`; default generation still initialized
  `main`.
- `devx test recipe`: passed as a dry run. The destination remained absent,
  warnings were empty, deployment was `dokploy` with variant `standard`, and
  requested and resolved profiles were exactly
  `web,api,data,identity,tenancy,jobs,events,cache,rate-limit`.
- `devx test qualify-selected-profiles`: passed. The disposable fixture wrote
  123 files and passed generated validation without Git metadata.
- `devx test pack-check`: passed for all three isolated package consumers.
- `devx test validate-starter` passed release, publication, source-of-truth,
  boundary, implementation, format, lint, typecheck, 11 test files with 129
  tests, package tarball validation, and five fixture profiles. It then stopped
  at the unselected `all-server-capabilities` fixture because the hardened
  bootstrap container has no Docker client or daemon access.
- The final starter and Fleet `git diff --check` checks passed. The two source
  documents remained unchanged.
- `devx stop` completed for instance `8da5518ada56`; the final admission status
  reported zero active development runtimes and no active port forwards.

Acceptance decision and remaining limits:

- P0 qualification is bounded to Fleet's exact selected profile set. Every
  selected-profile generation and validation check passed, so the unavailable
  Docker-dependent, unselected all-server fixture is recorded as a
  non-blocking broader-check limitation for P0. This decision does not qualify
  that fixture or relax its Docker requirement.
- The reusable starter repairs are committed and covered by passing regression
  tests in the starter. Fleet must regenerate from the accepted clean revision,
  not from an uncommitted patch.
- All supplier, customer, ULIP, deployment, production, recovery, privacy,
  email, and pilot evidence gates in section 7 remain open. P0 completion does
  not imply live or pilot readiness.

Exact handoff to P1:

1. Use starter revision `d34272063cc3bd8fb86ac2be6e68e3418b744989`, tag
   `starter-v1.0.0-dev.1`, and the exact nine-profile recipe recorded above.
2. Generate once into a new, nonexistent scratch destination on the current
   `codex/fleet-p0` branch without creating a Git worktree.
3. Verify emitted product identity, namespace, profile resolution, deployment
   values, private package locks, validation commands, and the actual generated
   work-record format before moving the output into Fleet.
4. Preserve all open live gates and do not treat generation, installation,
   build, login, health, or fixture success as pilot readiness.

## 7. Evidence gates and open dependencies

The owner status is intentionally open at plan creation. A capability can be
implemented against fixtures and still be pending live qualification. Mark a
gate `Complete` only when the named evidence exists and the relevant reviewer
accepts it.

| Gate                                                                       | Owner                             | Status | Blocks                      |
| -------------------------------------------------------------------------- | --------------------------------- | ------ | --------------------------- |
| Pinned starter generation and private package install                      | Nishanth                          | Open   | Bootstrap completion        |
| Starter`--skip-git` prerequisite                                         | Starter implementation owner      | Open   | Fleet generation            |
| DevX Fleet profile and generated command inventory                         | Nishanth                          | Open   | Local and remote validation |
| VAHAN/04 written approval, fields, quota, purpose, and live result         | Nishanth with ULIP team           | Open   | Live vehicle lookup         |
| SARATHI/02 written approval, driver purpose, minimization, and live result | Nishanth with ULIP team           | Open   | Live driver lookup          |
| FASTAG/02 written approval and live result                                 | Nishanth with ULIP team           | Open   | Live tag lookup             |
| ECHALLAN/01 contract and live result                                       | Nishanth with ULIP team           | Open   | Live challan view           |
| FASTAG/01 recent-activity terms and live result                            | Nishanth with ULIP team           | Open   | Live toll view              |
| India production host and recovery destination                             | Operations owner                  | Open   | Production data admission   |
| Backup freshness and clean-host restore rehearsal                          | Operations owner                  | Open   | Pilot go-live               |
| Pilot agreement, processing terms, and asset allowance                     | Product owner                     | Open   | Customer data admission     |
| Driver notice and minimum privacy request process                          | Product owner with legal reviewer | Open   | Non-user driver data        |
| Retention, deletion, and restore reconciliation                            | Product and technical owners      | Open   | Production data admission   |
| ZeptoMail account, terms, and production delivery test                     | Operations owner                  | Open   | Transactional email         |
| Security review, secret inventory, and production admission                | Technical owner                   | Open   | Production release          |
| Customer rehearsal and acceptance evidence                                 | Product owner and design partner  | Open   | February pilot              |

Minimum privacy work is deliberately small for this pilot: identify the
controller and processor roles, state the driver-data purpose, publish an
accessible driver notice, define retention and deletion, define access and
correction routing, and record an incident contact. A bounded Indian
privacy-lawyer review is recommended before real customer data enters the
pilot. Development may use synthetic data while this gate is open.

The ULIP application and approval work can run in parallel with software
development. Do not submit credentials or secrets to agents or commit them.

## 8. Deployment, budget, recovery, and security

### 8.1 Minimal Dokploy topology

Use one India-hosted Platform Linux VM with separate logical services:

- Web application.
- Fastify API.
- Worker.
- Dedicated Fleet PostgreSQL service.
- Private Valkey coordination service.
- Backup and operational log processes.

Expose the application through the existing Dokploy and Traefik ingress. Keep
PostgreSQL, Valkey, and worker ports private. Keep application deployment
separate from stateful services. Do not add Garage, MinIO, scanner, a second
active application host, or a full telemetry stack for this pilot.

Use synthetic staging on demand with separate databases, identities, secrets,
and networks. Do not maintain a second full-time staging stack unless measured
evidence requires it.

### 8.2 Capacity and cost evidence

Measure complete Fleet resource use and coexistence with current services before
pilot admission. Test retained provider observations, lookup backlog, database
growth, WAL, backups, logs, and recovery storage. Keep production reserves and
runtime admission checks. Increase host capacity when the evidence fails; do
not weaken safety reserves to fit the budget.

Record web, API, worker, PostgreSQL, Valkey, backup, email, registry, traffic,
and recovery costs. Record ULIP charges separately until the written terms are
known.

### 8.3 Release and secrets

Build immutable application images. Record source commit, dependency lock,
migration checksum, release metadata, and image digest. Deploy the tested
digest. Use expand-only migrations and rehearse application rollback without
resetting customer data.

Keep secrets outside the repository and outside local synchronization. DevX
reads its dedicated Platform-side secret files; Dokploy injects separately
scoped staging and production values. Keep recovery
credentials under separate custody. Never expose ULIP credentials to tenants.

Restricted fields use authenticated application-owned encryption where the
generated source and pilot data model require it. Keep production and recovery
wrapping paths independent. Bind admin listeners to loopback or private
networks. Use Dokploy and Traefik for public TLS and Fastify for application
policy.

### 8.4 Backup and recovery

Keep encrypted recovery copies outside the production VM on an independently
administered India-hosted recovery destination. Same-host backups do not meet
the gate. Use PostgreSQL backup and WAL tooling, monitor transfer freshness,
and test restoration on a clean recovery host.

- RPO target: at most one hour of lost committed data.
- RTO target: four covered business hours.
- Support window: Monday–Saturday, 09:00–18:00 IST.
- Outside the support window, the covered recovery clock begins at the next
  support window.
- Reapply deletion records during restore so erased data does not return.

Record backup freshness, non-secret recovery credential custody references,
clean-host restore time,
configuration recovery, key recovery, deletion reconciliation, and customer
communication in the release evidence. Backups and their freshness monitoring
run continuously, including outside support hours. Only the staffed recovery
clock is limited to the support window; elapsed downtime can exceed four hours.

## 9. Delivery phases and handoffs

Follow P0 through P9 in order. Dates are planning windows at 24–36 owner
hours per week, not guarantees of external approvals. Reserve about one
quarter of weekly time for review, integration, validation, and rework.
Record schedule changes without dropping acceptance criteria.

Each phase requires the prior phase's accepted software handoff. A dataset
marked "Implemented, pending live" may supply fixture-tested contracts to the
next engineering phase. That state never permits live customer processing.
P9 requires all five selected datasets and all applicable live gates.

### P0 — Scope, starter qualification, and bootstrap prerequisite

Window: September, weeks 1–2, 2026.

Objective: resolve the bootstrap prerequisites and record an executable recipe.

Dependencies and references: sections 0–3 and 5 of this file, the personal
DevX instructions, the starter's root AGENTS.md, initializer, generator,
capability registry, package manifests, and release metadata. Consult the
original technical plan §24 only to identify superseded assumptions.

Allowed write scope: bounded repairs and tests in the starter modules that own
failures in the selected Fleet profiles, the external starter bootstrap
profile, and section 6 of this file. Fleet application generation belongs to
P1. Package publication, pushes, ULIP submission, and production changes are
separate owner actions.

Work:

- Inspect the existing Fleet and starter Git state on the Mac.
- Verify the recorded source revision and current package identities.
- Configure, validate, and activate the external starter bootstrap profile
  before running any workload; keep the Fleet docs-preview profile unchanged.
- Verify permitted installation of the exact private foundation and tooling
  packages through DevX. Record package access denied as unverified, not absent.
- If the inspected starter still lacks it, implement the bounded skip-Git
  option from section 5.2 and its tests. Preserve default behavior.
- Treat qualification as a real trial of the selected profiles. Apply the
  section 3.3 defect loop to each reproducible blocking starter defect.
- Record the reviewed revision or base revision plus complete patch hash,
  exact identity values, flags, profiles, and scratch-generation recipe.
- Inventory the open supplier and customer gates without treating them as
  prerequisites for synthetic development.

Acceptance:

- Private package installation succeeds with the intended remote credentials.
- Tests prove skip-Git generation still validates output, leaves no Git
  metadata, preserves default behavior, and rejects incompatible options.
- Tests use isolated scratch fixtures. They do not initialize Fleet.
- Every repaired starter defect has a failing-before and passing-after test in
  its owning repository. Affected selected-profile output also passes.
- Fleet resolves every changed private package to the exact qualified version.
- The recipe uses all section 3.1 identity values and a nonexistent destination.
- The primary agent has inspected the prerequisite diff and test evidence.

Handoff: section 6 records exact source inputs, bootstrap profile, permitted
commands, package evidence, and the reviewed recipe. If package access or
required prerequisite validation fails, P0 is blocked; P1 does not generate.

### P1 — Generate Fleet and establish the application runtime

Window: September, weeks 3–4, 2026.

Objective: import a verified generated product and prove its foundation.

Dependencies and references: accepted P0; sections 3–5; generated AGENTS.md,
package manifests, developer guide, migration and work-record conventions.
Original technical-plan §9, §10, and §13 supply applicable tenancy rules.

Allowed write scope: generated Fleet source and supporting tests, its external
DevX profile, the verified P01 work record, and bounded starter repairs and
regression tests triggered by Fleet generation or foundation validation.
Preserve both source documents. Keep starter and Fleet changes separate.
GitHub repository creation, commits, pushes, releases, and package publication
require the phase request to include them.

Work:

- Execute the P0 recipe through the starter bootstrap profile.
- Verify emitted identity, profile closure, dependency locks, and metadata.
- If generation or a selected foundation module fails because of reusable
  starter behavior, run the section 3.3 defect loop. Regenerate from the exact
  repaired source before importing output or continuing Fleet work.
- Import only verified source into the Mac checkout after collision review.
- Inspect actual service commands and configure Fleet's external DevX profile.
- Run setup, inspect status and synchronization, start explicitly, and validate.
- Wire tenant transactions, runtime database roles, and actual Valkey counters.
- Replace the placeholder outbox dispatcher with typed dispatch to implemented
  handlers. Unknown event types fail visibly rather than becoming delivered.
- Integrate identity email through the product-owned ZeptoMail adapter seam;
  exercise Mailpit only in development. Validate session and assurance behavior.
- Establish product CI and immutable-image build foundations using synthetic
  fixtures. Keep production application secrets out of CI and image layers.

Acceptance:

- Generation and product checks pass using the recorded source and versions.
- No known blocking defect in a selected starter profile remains patched only
  in Fleet. Each starter repair has starter-side regression evidence and a
  regenerated-output comparison.
- Browser login, verification, recovery, revocation, and organization switching
  work with two synthetic organizations.
- Forced RLS and role checks prevent cross-tenant seed-data access.
- Migrations are repeatable; a real worker job executes and records its outcome.
- Valkey failure denies dependent operations without resetting durable usage.
- The Fleet profile lists actual services, health checks, labels, resource
  limits, loopback forwards, and zero synchronization conflicts.

Handoff: P01 records source import evidence, actual scripts and paths, the
application profile, browser results, and foundation tests. Synchronize the
generated execution dashboard from the work record.

### Fleet staging qualification — FLEET-STAGING-001

Window: September 2026, after P1 and before P2.

Objective: qualify the P1 foundation on an isolated Dokploy project using
synthetic data before feature development continues.

The project is `Thaarei Fleet` in Dokploy environment `staging`. Web is public
at `staging-fleet.thaarei.com`; API, worker, PostgreSQL, Valkey, and Mailpit
remain private. The runtime uses `APP_ENV=ci` and Mailpit, so this phase does
not qualify ZeptoMail or real customer processing. Cloudflare and the existing
R2 destination are accepted for synthetic staging only.

Allowed write scope: the starter generator and its tests for reusable release
or deployment defects, Fleet release workflows and deployment definitions,
the staging work record, and deployment documentation. No P2 product work or
changes to existing Fleet Compliance services are allowed.

Required evidence includes four immutable image digests, Dokploy 0.30.5 API
qualification, role-safe migrations, web/API/worker readiness, identity and
tenant tests, Valkey failure and recovery, DNS/TLS, candidate rollback,
synthetic R2 backup and disposable restore, resource coexistence, and
on-demand shutdown. Complete details and execution evidence live in
`.thaarei/work/FLEET-STAGING-001.md`.

Handoff: P2 may start only after the staging record and generated dashboard are
complete. ZeptoMail, India-hosted recovery, ULIP, privacy, customer data, and
production gates remain open.

### P2 — Fleet, location, and vehicle registry

Window: October, weeks 1–2, 2026.

Objective: deliver vehicle management as a complete database-to-browser slice.

Dependencies and references: P1; section 4; PRD §3–4 and technical-plan §5
and §9, narrowed by section 2. Synthetic identifier contracts are sufficient.

Allowed write scope: vehicle/fleet/location core rules, repositories,
migrations, private transport, screens, tests, and the P02 work record.

Work:

- Implement organization-owned fleets, locations, and vehicle records.
- Support nationwide state references and the selected descriptive categories.
- Separate pending lookup identity from organization-owned fields and future
  provider projections. Do not add manual government-fact editing.
- Enforce the 500 managed-asset allowance at activation, not draft creation.
- Implement typed identifiers, tenant-local duplicate checks, listing, filters,
  detail views, field updates, offboarding, and permitted history.
- Apply Owner, Manager, and Viewer checks and transactional audit events.

Acceptance:

- Two tenants cannot read, mutate, or infer each other's vehicle records.
- Duplicate activation and concurrent capacity checks cannot exceed allowance.
- Failed writes do not produce false saved state or orphan audit events.
- Browser tests cover create, search, update, activate, and offboard.
- Sensitive-field masking and server authorization hold for direct API requests.

Handoff: P02 provides the accepted vehicle schema, migration order, transport
contract, browser evidence, and constraints required by driver links and import.

### P3 — Drivers, administrative links, and bulk onboarding

Window: October, weeks 3–4, 2026.

Objective: complete driver management and reliable identifier-based onboarding.

Dependencies and references: P2; section 4.3–4.5; PRD §4 and §7;
technical-plan §5.3 and §12 only as modified by this pilot.
Fixture fields permit implementation; written terms gate real-data use.

Allowed write scope: driver/link/import domain, persistence, transport, UI,
migrations, bounded parsing, tests, and the P03 work record.

Work:

- Implement organization-local driver profiles and minimal contact/engagement
  fields, kept separate from future SARATHI facts.
- Add effective-dated primary and relief links and their history.
- Allow a driver to administer multiple vehicles without implying actual duty.
- Close links during offboarding. Reject duplicate overlaps and simultaneous
  primary links for the same vehicle with database-backed concurrency controls.
- Implement pasted lists and vehicle/driver CSV templates, immutable previews,
  bounded commits, idempotency, capacity checks, and explicit result counts.
- Store provider intentions transactionally for future processing. Preview
  never invokes ULIP. Unqualified integration paths remain explicitly pending.

Acceptance:

- Cross-tenant driver/link references and unauthorized field changes fail.
- Driver offboarding and primary-driver replacement preserve history.
- CSV limits, malformed input, unknown columns, duplicate rows, concurrent
  commits, and interrupted/repeated batches have deterministic outcomes.
- A 500-asset plus 1,000-driver synthetic import stays within declared limits
  and does not silently discard rejected or pending records.
- Browser flows cover preview, correction, commit, linking, and offboarding.

Handoff: P03 records import schemas, relationship constraints, exact population
counts, tests, and the lookup-intent contract consumed by P4.

### P4 — ULIP gateway, quotas, provenance, and emulators

Window: November, weeks 1–2, 2026.

Objective: implement common provider execution independently of live access.

Dependencies and references: P3; section 4.4; original technical-plan §8
and §9.3–9.7, subject to the on-demand pilot scope.

Allowed write scope: provider ports, dataset policy, observations/projections,
lookup and usage repositories, workers, Valkey wiring, fixtures, tests,
lookup-state UI, and the P04 work record.

Work:

- Implement typed requests carrying tenant, subject, dataset, purpose,
  permitted fields, operation identity, and correlation.
- Persist intent, audit, and downstream work atomically.
- Add tenant-scoped in-flight deduplication, token single-flight, quota
  reservation, cooldowns, bounded retry, and circuit behavior.
- Validate provider envelope, business result, and independent subject binding.
- Persist permitted observations with mapping version and source timestamps.
- Model partial, masked, missing, wrong-subject, incompatible, denied, quota,
  and transient results without losing the last successful observation.
- Create synthetic fixtures for all five datasets; mark provisional mappings
  as unqualified until checked against the approved account contracts.
- Fail closed on lost coordination; rebuild usage from the durable ledger.

Acceptance:

- Concurrent duplicate requests have one logical outcome and accounted attempts.
- Crash, timeout, retry, lease expiry, and restart tests expose ambiguous
  external outcomes rather than claiming exactly-once provider delivery.
- Unknown, mismatched, or malformed data cannot populate accepted projections.
- No raw body, restricted identifier, or token appears in logs or errors.
- All five fixture contracts and failure scenarios pass.

Handoff: P04 provides ports, state model, fixture matrix, usage and retry
evidence, and open contract questions. Downstream adapter work can proceed
with fixtures while live approvals remain open.

### P5 — Vehicle, licence, and FASTag adapters

Window: November, weeks 3–4, 2026.

Objective: complete VAHAN/04, SARATHI/02, and FASTAG/02 journeys.

Dependencies and references: P4; section 1.3; approved account-specific
contracts when available and technical-plan §8.1–8.8.

Allowed write scope: the three primary adapters and mappings, detail screens,
lookup progress/history, tests, qualification records, and the P05 work record.

Work:

- Implement each primary adapter against the P4 ports.
- Bind and normalize only permitted fields with explicit partial/masked states.
- Populate vehicle and driver projections asynchronously and read-only.
- Add onboarding lookup, authorized refresh, and source/freshness presentation.
- Qualify live calls only in an explicitly authorized production boundary
  after the dataset, purpose, privacy, and egress gates pass.

Acceptance:

- Each adapter passes positive, partial, not-found, denied, wrong-subject,
  malformed, and retry fixture cases.
- The UI distinguishes source observation time, retrieval time, and validity.
- No fallback endpoint is called; missing fields are not manually fabricated.
- Each dataset has a separate fixture-complete and live-qualified record.

Handoff: P05 records normalized mappings, browser evidence, and dataset gate
status. Accepted fixture implementation permits P6; open live gates block
customer lookup, not further software implementation.

### P6 — Read-only eChallan and recent toll observations

Window: December, weeks 1–2, 2026.

Objective: add the two selected secondary dataset journeys.

Dependencies and references: P4 and P5 software handoffs; section 1.3 and
4.4; account-specific ECHALLAN/01 and FASTAG/01 contracts.

Allowed write scope: these two adapters and mappings, vehicle-detail views,
bounded observation persistence, fixtures, tests, and the P06 work record.

Work:

- Implement read-only challan results and recent toll observations.
- Deduplicate repeated observations without suggesting continuous collection.
- Display the source's time/window and incomplete or absent responses.
- Enforce purpose, subject-category, retention, and export restrictions.
- Keep both lookups user-requested; add no payment, dispute, route, GPS,
  inferred-location, or scheduled whole-fleet collection workflow.

Acceptance:

- Views depend on dataset entitlement and qualification, not a claim that
  state-specific compliance rules have been approved.
- Fixtures prove duplicate, empty, stale, partial, denied, and wrong-subject
  behavior. Empty results do not prove absence of liability or a FASTag.
- Browser views cannot be mistaken for live position or complete toll history.
- Each adapter's live evidence remains separate from fixture evidence.

Handoff: P06 supplies all five adapters' qualification states, read-only view
evidence, and the retained/exportable-field policies required by P7.

### P7 — Dashboard, exports, privacy operations, and deployment rehearsal

Window: December, weeks 3–4, 2026.

Objective: produce a feature-complete candidate and a tested deployment path.

Dependencies and references: P1–P6 software handoffs; sections 7–8; original
technical-plan §16–22 only for applicable pilot controls. Real-data gates
may remain open while the rehearsal uses isolated synthetic data.

Allowed write scope: dashboard/report queries and UI, bounded CSV exports,
privacy operations, deployment definitions, backup/restore tooling, runbooks,
tests, Fleet DevX profile updates required by implemented services, and P07.
This phase authorizes only an isolated synthetic rehearsal deployment within
the existing host's approved headroom. It does not activate customers or
promote the customer-serving production release. New paid resources and
changes to unrelated host services require owner direction.

Work:

- Complete registry counts, search/filter views, audit presentation, and
  authenticated CSV exports with allowed fields and formula-safe values.
- Implement minimal access/correction/deletion handling and restore-safe
  deletion records. Finish the pilot agreement/notice preparation in parallel.
- Rehearse web, API, worker, dedicated PostgreSQL, and Valkey deployment.
- Exercise the same immutable image promotion and migration path intended
  for production, using synthetic records and separate secrets.
- Prepare independent India recovery copies and perform a clean-host restore.
- Record application/data separation, host coexistence, costs, and rollback.
- Protect stateful services from application redeployment.

Acceptance:

- Counts reconcile to tenant-scoped database queries, including pending rows.
- Exports enforce authorization and dataset rights at execution time.
- Rehearsal images match recorded digests and migration checksums.
- Synthetic data restores with separately recoverable keys and deletion replay.
- Resource/cost evidence supports the proposed production boundary or identifies
  the exact capacity decision needed before real-data admission.

Handoff: P07 provides the candidate, deployment/rollback and recovery runbooks,
cost ledger, privacy operations, and unresolved live gates. An absent paid
recovery destination blocks its qualification, not unrelated feature checks.

### P8 — Security, performance, accessibility, and recovery validation

Window: January, weeks 1–2, 2027.

Objective: resolve release-critical defects and prove representative operation.

Dependencies and references: P7 candidate; section 8; relevant PRD NFRs and
technical-plan §25 test scenarios narrowed to this pilot.

Allowed write scope: evidence-driven fixes and tests, release/runbook updates,
and P08. Keep customer activation and production promotion in P9.

Work:

- Run tenant/RLS, role, masking, authentication assurance, revocation, audit,
  encryption, and export tests.
- Exercise all browser journeys with keyboard, narrow viewport, and supported
  browsers. Record the tested device/network profile.
- Test 500 assets and 1,000 drivers plus twice that retained fixture volume;
  measure API, database, worker, memory, connection, and disk behavior.
- Exercise provider outage, token failure, quotas, worker crash, Valkey loss,
  retry/recovery backlog, and missed work.
- Rehearse image rollback, clean-host recovery, backup freshness, key recovery,
  and deletion reconciliation; verify the covered recovery clock.
- Complete the independent pilot security review and remediation evidence.

Acceptance:

- No unresolved critical tenant, integrity, security, or recovery defect
  qualifies for pilot release. Record blockers rather than waiving them.
- Required representative-volume checks pass. If host limits prevent the
  checks, capacity qualification stays open; volume tests are not optional.
- Core browser journeys meet applicable accessibility and performance targets.
- Runbooks are executable by the named operator and identify a recovery backup
  contact before customer go-live.

Handoff: P08 supplies the exact candidate, complete validation index, measured
limits, remaining external gates, and the customer-rehearsal checklist.

### P9 — Customer rehearsal, go-live, and February pilot

Window: January, weeks 3–4, 2027. Target activation: February 1, 2027.

Objective: obtain acceptance, qualify the live boundary, launch the free pilot,
and hand over measured operations.

Dependencies and references: P8 candidate; all five dataset live gates;
customer/privacy/retention/host/recovery gates in section 7; applicable
technical-plan §28 acceptance outcomes. Before the first real lookup, confirm
that the selected phase request authorizes live qualification and customer
activation. A request limited to readiness review does not authorize launch.

Allowed write scope: rehearsal fixtures, authorized production definitions,
live qualification evidence, release metadata, approved 10–25-vehicle cohort,
runbook fixes, and P09. Purchasing, package publication, unrelated deployment
changes, and customer messages need their own existing authorization.

Work:

- Rehearse customer login, permissions, identifier import, lookup progress,
  administrative links, search, exports, offboarding, and support.
- Include representative selected vehicle categories and South/North Indian
  states in fixtures; use real records only within approved source rights.
- Verify the exact image digest, migrations, production configuration,
  provider contracts/allowlist, backup freshness, and recovery evidence.
- Require all five datasets to be live-qualified for the agreed complete
  pilot. Any reduced-dataset pilot requires an explicit scope amendment;
  agents must not silently remove a selected capability to meet the date.
- Reject enabled mock/sandbox provider classes in production. An intentionally
  disabled integration stays visibly unavailable and never returns fake facts.
- Record customer acceptance, free-pilot terms, support window, and limitations.
- Activate only the agreed representative cohort, then reconcile every result.
- Run ten business days of hypercare, recording health, queue, quota, resource,
  email, access, and support outcomes.
- Propose measured waves toward 500 assets. Execute each expansion only under
  the owner's approved cohort/wave authorization.

Acceptance:

- Exact activated, pending, partial, failed, not-found, and excluded counts
  reconcile without hidden rows or duplicate logical records.
- All live, privacy, security, host, budget, and recovery gates have evidence.
- The customer completes the intended vehicle/driver journeys and understands
  the source, coverage, support, and recovery limitations.
- Ten business days of hypercare and the ongoing operator handoff are recorded.
- February 1 remains a target. Missing approval keeps launch pending while
  internal fixture-based acceptance can continue.

Handoff: final release evidence, customer acceptance, cohort reconciliation,
hypercare results, known limitations, and the next authorized wave or backlog.
The broader compliance/document product requires a separate future scope.

## 10. Phase status table

Update status only with an execution record and primary review. Before
bootstrap, section 6 is the record. After bootstrap, use the verified phase
work-record format and regenerate the execution dashboard.

"Complete" means the phase's acceptance and handoff passed. "Implemented,
pending live" permits dependent engineering work, not customer processing.
Do not mark P9 complete at first deployment if its hypercare remains unfinished.

| Phase                                                | Window                       | Current status | Next phase                 |
| ---------------------------------------------------- | ---------------------------- | -------------- | -------------------------- |
| P0 Scope and starter prerequisites                   | Sep weeks 1–2, 2026         | Complete (accepted 2026-09-07) | P1 (authorized, not started) |
| P1 Bootstrap and Fleet DevX foundation               | Sep weeks 3–4, 2026         | Complete (accepted 2026-09-07) | Fleet staging qualification |
| Fleet staging qualification (FLEET-STAGING-001)      | After P1, before P2         | In progress    | P2                         |
| P2 Fleet, location, vehicle registry                 | Oct weeks 1–2, 2026         | Not started    | P3                         |
| P3 Drivers, links, CSV onboarding                    | Oct weeks 3–4, 2026         | Not started    | P4                         |
| P4 ULIP gateway and emulators                        | Nov weeks 1–2, 2026         | Not started    | P5                         |
| P5 VAHAN, SARATHI, FASTag details                    | Nov weeks 3–4, 2026         | Not started    | P6                         |
| P6 eChallan and recent toll observations             | Dec weeks 1–2, 2026         | Not started    | P7                         |
| P7 Dashboard, exports, deployment/recovery rehearsal | Dec weeks 3–4, 2026         | Not started    | P8                         |
| P8 Security, performance, recovery validation        | Jan weeks 1–2, 2027         | Not started    | P9                         |
| P9 Customer rehearsal, February pilot, hypercare     | Jan weeks 3–4 and Feb, 2027 | Not started    | Approved waves/future plan |

## 11. Agent execution and review rules

Use one phase per agent chat. The primary agent is the technical lead,
architect, reviewer, integrator, and release decision maker. An implementer
agent may change only the allowed write scope. An explorer agent may inspect
sources and report evidence without editing implementation files.

Every delegated package must state:

- objective;
- relevant source references and paths;
- dependencies and material constraints;
- allowed write scope;
- observable acceptance criteria;
- required validation commands;
- handoff artifact and unresolved issues.

Do not delegate overlapping changes to shared schemas, migrations, transport
contracts, provider ports, or deployment files at the same time. Review the
actual diff, generated files, tests, and runtime evidence. Do not accept a
summary without inspecting its evidence.

Do not autoexecute a later phase. Do not deploy to production, submit ULIP
applications, publish packages, send customer messages, activate a customer,
or expose a public endpoint unless the selected phase explicitly authorizes
that action and the phase gate requires it. A build, login, health endpoint,
or green unit test does not prove pilot readiness.

Use the smallest relevant validation first. Broaden validation only when the
change or a failure justifies it. Report passed commands, failed commands,
skipped checks, changed files, and unresolved risks in the phase work record.

### Copy/paste prompt for one phase

Replace `Pxx` with one phase from section 9 before sending this prompt in a
separate agent chat:

```text
You are implementing Thaarei Fleet phase Pxx from
docs/IMPLEMENTATION_PLAN.md.

Read applicable repository and parent AGENTS.md instructions first, then:
1. docs/IMPLEMENTATION_PLAN.md, especially section 0, section 2, and phase Pxx.
2. /Users/nishanth/.codex/devx/profiles/instructions.md.
3. The targeted sections of docs/PRD.md and docs/Product and Technical Plan.md
   named by phase Pxx.
4. The nearest AGENTS.md and the actual generated source and package manifests.

First inspect Git status, the current tree, and the phase dependencies. Do not
execute later phases. Do not guess scripts, paths, package names, or generated
contracts. Discover them from the actual source and --help output.

Work only within phase Pxx's allowed write scope. Preserve the two source docs,
unrelated user changes, secrets, and production data. If the phase requires a
starter, DevX, ULIP, deployment, publication, or production action, perform it
only when phase Pxx explicitly authorizes it and record the evidence.

For P0 or P1, treat Fleet as the trial consumer of its selected starter
profiles. If a failure is reusable starter behavior, follow section 3.3. Keep
the starter repair and Fleet changes separate, test the repair in the starter,
regenerate Fleet from the recorded repaired source, and then continue the
current phase. Record a non-blocking starter improvement without expanding the
phase.

Implement the bounded work. Run the smallest relevant validation first, then
the phase's broader checks. Inspect the actual diff and runtime evidence.

After implementation, create or update .thaarei/work/FLEET-Pxx.md only after
inspecting the generated work-record format. Record objective, dependencies,
changed paths, commands and results, acceptance evidence, unresolved issues,
and the exact handoff to the next phase. Before bootstrap work-record format
exists, record progress in section 6 of docs/IMPLEMENTATION_PLAN.md.

Stop after the Pxx handoff. Report complete, implemented pending live, blocked,
and skipped checks separately. Do not claim pilot readiness from a build,
login, health check, or fixture result alone.
```

## 12. Definition of complete

The plan is complete when the file exists and the sequence, source authority,
scope disposition, phase acceptance, evidence gates, and agent handoff rules
are explicit. The product is pilot-ready only when P9 has completed its live
gates, customer acceptance, recovery evidence, and cohort activation record.
Implementation against fixtures can be complete while live qualification is
pending. Keep those states separate in every work record and release report.
