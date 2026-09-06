# Thaarei Fleet pilot implementation plan

Status: execution plan. All phases are **Not started**.

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

Read the files in this order before starting any phase:

1. Read this file, including the phase status table, the scope boundary, and
   the phase selected for the current chat.
2. Read `/Users/nishanth/.codex/devx/profiles/instructions.md`. This file is
   the local operating contract for project setup, synchronization, remote
   execution, and validation. Follow it before using `devx`.
3. Read [`docs/PRD.md`](PRD.md) for requirement IDs, product authority,
   security requirements, and acceptance language. Use the disposition in
   section 2 of this file when the pilot intentionally narrows a requirement.
4. Read [`docs/Product and Technical Plan.md`](Product%20and%20Technical%20Plan.md)
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

| File or location | Use | Current state |
| --- | --- | --- |
| `docs/IMPLEMENTATION_PLAN.md` | Pilot authority, sequence, gates, and handoff rules | This file; created by the planning task |
| `docs/PRD.md` | Version 2 product requirements and IDs | Existing source; preserve |
| `docs/Product and Technical Plan.md` | Version 2 decisions and technical baseline | Existing source; preserve |
| `/Users/nishanth/.codex/devx/profiles/instructions.md` | DevX setup and execution rules | Existing personal file; read before DevX work |
| `app-starter-kit` pinned checkout | Bootstrap input and generator behavior | External source; inspect in P0 |
| `IMPLEMENTATION.md` at generated root | Starter-generated work-record rules | Planned output; inspect after bootstrap |
| `.thaarei/work/FLEET-Pxx.md` | One phase's objective, evidence, and handoff | Planned output; create only after generator contract is known |
| `docs/PRD.md` and `docs/Product and Technical Plan.md` | Original requirements and decisions | Never overwrite or move |

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

| Dataset | Pilot role | Required behavior |
| --- | --- | --- |
| `VAHAN/04` | Vehicle verification | Retrieve permitted registration and vehicle facts |
| `SARATHI/02` | Driver verification | Retrieve permitted licence facts under the approved lookup contract |
| `FASTAG/02` | FASTag verification | Retrieve permitted tag identifiers, issuer, class, status, and issue facts |
| `ECHALLAN/01` | Read-only enforcement view | Display returned pending or disposed challan details |
| `FASTAG/01` | Recent activity view | Display bounded recent toll observations with source timestamps |

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

Target incremental operating cost at ₹5,000–₹15,000 per month. Measure the
existing host's allocated cost separately from incremental Fleet cost. Include
email, registry, recovery storage, traffic, and any ULIP fees in the cost log.

Support the pilot during Monday–Saturday, 09:00–18:00 IST. The recovery target
is four covered business hours. An outage outside the window starts the covered
clock at the next support window. The target does not claim 24x7 response.

## 2. Resolve the old PRD and technical-plan conflicts

The source documents remain intact and useful. The following pilot decisions
are explicit dispositions, not silent edits.

| Broader requirement or decision | Pilot disposition | What remains mandatory |
| --- | --- | --- |
| One product for about 100 organizations, 50,000 assets, and 100,000 drivers | Replace with one customer, 500-asset allowance, and 10–25-vehicle first cohort | Schema and tenant boundaries must not prevent later growth |
| Document uploads, scanning, encrypted object storage, OCR, evidence review, and credential catalogue | Defer | Data classification, retention, deletion, audit, and source provenance still apply to the records that exist |
| Compliance engine, reviewed policy packs, findings, cases, tasks, and expiry reminders | Defer | Vehicle category is descriptive only; the UI must label unsupported compliance coverage |
| Complaints, support case workflows, and external helpdesk processing | Defer product case features | Provide a private operational contact path and keep support access separately authorized |
| Billing plans, Razorpay, receivables, tax documents, and automatic overages | Defer implementation; use a free pilot allowance | Capacity entitlement remains a server-enforced control and customer terms must state the allowance |
| Pilot fallbacks to `VAHAN/01`, `SARATHI/01`, and `FASTAG/01` | Remove automatic fallbacks; keep `FASTAG/01` only as its explicit recent-activity role | Dataset selection, quota, provenance, and failure states remain explicit |
| `TOLL/01` utility or live route interpretation | Defer | Toll observations never become live location, reconstructed route, or complete movement history |
| Garage, MinIO, upload scanner, second active application host, and full telemetry stack | Defer from the minimal pilot topology | Backup, access, retention, deletion, logs, and recovery controls remain required |
| Initial production cost of ₹15,000–₹40,000 | Replace with ₹5,000–₹15,000 target | Capacity and recovery evidence override the target if the host cannot safely run the stack |
| 24x7 staffed critical response | Replace with business-hours support for this pilot | Security reporting, provider terms, and statutory deadlines remain independent of support hours |
| Universal pan-India compliance coverage | Defer | Store nationwide states and show unsupported rule coverage clearly |
| Specialized operations as compliance policy cells | Narrow to vehicle categories | Do not market category labels as regulatory decisions |

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
  provider effect. Implement and test the actual notification dispatch before
  using it for any alert.

Do not state exact generated package names, scripts, commands, routes, or
directory paths until the generated source is inspected. Discover them from
the generated `package.json`, `IMPLEMENTATION.md`, `AGENTS.md`, command
`--help` output, and source exports. Do not guess from an older starter
version.

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

| Record class | Authority | Customer editing |
| --- | --- | --- |
| Organization-owned details | Fleet application | Authorized fields only |
| Provider observation | ULIP response plus immutable provenance | Read-only; refresh creates a new observation |
| Current projection | Application projection of accepted observation | Never manually overwrite provider fields |
| Processing state | Fleet job and lookup lifecycle | Authorized retry or refresh only |
| Audit event | Append-only application or platform stream | No mutation or deletion through the product |

Use UUIDv7 for internal entity identity. Treat registration, licence, and tag
identifiers as typed, normalized, versioned external evidence. Store provider
subject binding and response status before accepting a result into a projection.

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
Fetch challans and recent toll observations on request or on a specifically
approved bounded schedule. Label `FASTAG/01` as recent activity with source
coverage limits.

### 4.5 Import contract

Support UTF-8 CSV and pasted identifier lists. Defer XLSX. An import contains
identifiers and organization-owned fields, never reconstructed provider facts.

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

Keep Git operations on the Mac checkout or worktree. Run installs, builds,
tests, migrations, Docker commands, and servers through `devx` after the
application profile exists. Use `devx setup` for preparation and `devx start`
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
4. Implement the bounded starter prerequisite that adds `--skip-git`. Keep
   default Git behavior unchanged. Test the flag at the starter source before
   using it for Fleet.
5. Prepare a temporary external DevX bootstrap profile for the pinned starter
   checkout. Keep personal profile files outside the repository.
6. Generate `thaarei-fleet` into a new, nonexistent scratch destination. Use
   the approved profile list:

   ```text
   web,api,data,identity,tenancy,jobs,events,cache,rate-limit
   ```

7. Inspect the complete generated output. Verify product name, package scope,
   owner values, profiles, deployment values, metadata, dependency versions,
   `IMPLEMENTATION.md`, and the generated source contracts.
8. Transfer only verified source output to the Mac. Exclude dependencies,
   caches, credentials, runtime artifacts, and scratch state. Inspect path
   collisions before importing into `/Users/nishanth/projects/fleet`.
9. Update the Fleet DevX profile after the generated application manifests and
   commands are known. Keep `profile.json`, `compose.yml`, `controller.sh`,
   and profile instructions consistent.
10. Run `devx profile validate` and `devx profile activate` as required by the
    instructions file. Run the smallest generated validation first.
11. Use separate development services for web, API, worker, PostgreSQL,
    Valkey, and Mailpit. Start only after validation and profile setup.
12. Prove browser login, tenant isolation, migrations, worker execution, and
    a disposable lookup fixture before feature work proceeds.

After bootstrap, inspect the generator's work-record contract. If it creates
`.thaarei/work/`, use that exact namespace and format. Create one
`.thaarei/work/FLEET-Pxx.md` per phase. The generated root `IMPLEMENTATION.md`
derives or indexes work records according to the starter contract. It does not
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

Current log: **No phase has started.**

## 7. Evidence gates and open dependencies

The owner status is intentionally open at plan creation. A capability can be
implemented against fixtures and still be pending live qualification. Mark a
gate `Complete` only when the named evidence exists and the relevant reviewer
accepts it.

| Gate | Owner | Status | Blocks |
| --- | --- | --- | --- |
| Pinned starter generation and private package install | Nishanth | Open | Bootstrap completion |
| Starter `--skip-git` prerequisite | Starter implementation owner | Open | Fleet generation |
| DevX Fleet profile and generated command inventory | Nishanth | Open | Local and remote validation |
| VAHAN/04 written approval, fields, quota, purpose, and live result | Nishanth with ULIP team | Open | Live vehicle lookup |
| SARATHI/02 written approval, driver purpose, minimization, and live result | Nishanth with ULIP team | Open | Live driver lookup |
| FASTAG/02 written approval and live result | Nishanth with ULIP team | Open | Live tag lookup |
| ECHALLAN/01 contract and live result | Nishanth with ULIP team | Open | Live challan view |
| FASTAG/01 recent-activity terms and live result | Nishanth with ULIP team | Open | Live toll view |
| India production host and recovery destination | Operations owner | Open | Production data admission |
| Backup freshness and clean-host restore rehearsal | Operations owner | Open | Pilot go-live |
| Pilot agreement, processing terms, and asset allowance | Product owner | Open | Customer data admission |
| Driver notice and minimum privacy request process | Product owner with legal reviewer | Open | Non-user driver data |
| Retention, deletion, and restore reconciliation | Product and technical owners | Open | Production data admission |
| ZeptoMail account, terms, and production delivery test | Operations owner | Open | Transactional email |
| Security review, secret inventory, and production admission | Technical owner | Open | Production release |
| Customer rehearsal and acceptance evidence | Product owner and design partner | Open | February pilot |

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

Keep secrets outside the repository and outside local synchronization. Inject
isolated DevX, staging, and production values through Dokploy. Keep recovery
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

Record backup freshness, recovery credentials, clean-host restore time,
configuration recovery, key recovery, deletion reconciliation, and customer
communication in the release evidence.

## 9. Delivery phases and handoffs

The ten two-week windows below match the approved schedule. Each phase maps to
one window. A phase can finish early, but the next phase still needs its own
explicit chat request and review. All phases start as **Not started**.

### P0 — Authority, scope, and bootstrap prerequisite

Window: September, weeks 1–2, 2026.

Objective: make the pilot boundary executable and qualify the pinned starter
input without generating Fleet yet.

Dependencies: this plan, `docs/PRD.md`, `docs/Product and Technical Plan.md`,
`/Users/nishanth/.codex/devx/profiles/instructions.md`, and access to the
pinned starter checkout.

Targeted source references: PRD sections 1, 2, 3, 4, 5, 7, 10, 11, and 12;
technical-plan sections 1, 2, 8, 9, 21, 24, 25, and 26; starter
`starter-release.json`, `AGENTS.md`, `packages/create-app/src/index.ts`, and
`packages/create-app/src/generator.ts` at the pinned commit.

Allowed write scope: starter source files required for the bounded
`--skip-git` prerequisite, this plan's section 6 execution log, and phase
evidence outside the Fleet application. Do not edit Fleet application files,
DevX application profiles, or the two source documents.

Bounded work:

- Confirm the current Git status and preserve user changes.
- Verify the starter commit, runtime versions, profiles, generator flags, and
  private package install access.
- Record `UNKNOWN` when a package check returns `403`; do not call it absent or
  unpublished.
- Add and test `--skip-git` with default behavior preserved.
- Prepare a reproducible bootstrap recipe that does not guess generated
  scripts or paths.

Observable acceptance and tests:

- The recipe names the exact starter commit and selected profiles.
- The starter help output exposes the new option.
- Generation with the option leaves no Git repository in the destination and
  still runs the generator's validation path.
- Default generation behavior remains covered by the starter's existing tests.
- Section 6 contains command results and the package-access status.

Handoff: provide the pinned source evidence, prerequisite diff, test output,
and the exact scratch-generation command shape. P1 may begin only after the
primary agent reviews the prerequisite and package status.

### P1 — Generated foundation and Fleet DevX profile

Window: September, weeks 3–4, 2026.

Objective: generate Fleet from the pinned starter, import the verified output,
and establish the actual DevX runtime contract.

Dependencies: P0 complete, package access resolved or explicitly blocked with
an evidence record, starter prerequisite reviewed, and the instructions file.

Targeted source references: starter generator and generated output;
technical-plan sections 9, 10, 11, 13, 21, 24, and 25; DevX instructions.

Allowed write scope: generated Fleet source, generated manifests, Fleet DevX
profile files required by the instructions, and `.thaarei/work/FLEET-P01.md`
after the generated work-record format is inspected. Keep docs/PRD.md and the
technical plan unchanged.

Bounded work:

- Generate into a new scratch destination with the selected profiles.
- Verify product identity, package scope, owners, deployment values, and
  generated metadata across emitted files.
- Import verified output after collision inspection.
- Inspect generated scripts, commands, health checks, and `IMPLEMENTATION.md`.
- Update the documentation-only DevX profile with real service definitions.
- Implement tenant RLS context, actual Valkey counters, identity email adapter
  seam, and a real outbox dispatch seam only to the extent needed for the
  foundation acceptance.
- Use Mailpit in development and keep ZeptoMail configuration environment-only.

Observable acceptance and tests:

- Generated output is reproducible from the pinned input and contains no
  credentials or runtime artifacts.
- `devx profile validate` and `devx profile activate` pass when required.
- The smallest actual generated validation command passes.
- Browser login and recovery work in development.
- Two disposable tenants cannot read each other's seed data.
- Migrations run, a worker executes a disposable job, and Valkey loss fails
  safely without resetting usage state.

Handoff: create `.thaarei/work/FLEET-P01.md` in the generator's format with
changed paths, commands, results, and known gaps. P2 receives the actual
generated package and command inventory.

### P2 — Fleet, vehicle, driver, and import core

Window: October, weeks 1–2, 2026.

Objective: deliver tenant-safe organization, fleet, location, vehicle, driver,
administrative-link, and CSV onboarding behavior.

Dependencies: P1 foundation, generated source contract, database and worker
validation, and approved pilot identifiers and fields.

Targeted source references: `docs/PRD.md` sections 3, 4, and 7; technical-plan
sections 5, 9, 10, 11, and 12; generated repositories, schema, transport, and
UI modules.

Allowed write scope: generated application packages for domain, database,
transport, UI, jobs, validation, and tests; `.thaarei/work/FLEET-P02.md`.

Bounded work:

- Add organization-owned fleet, location, vehicle, and driver records.
- Add nationwide state and operating-state values with South and North Indian
  fixtures, without claiming state-specific compliance support.
- Add vehicle categories and trailer relationships as descriptive records.
- Add effective-dated primary and relief driver links with overlap rules.
- Add CSV templates, preview, bounded commit, idempotency, and result counts.
- Add Owner, Manager, and Viewer authorization at API and UI boundaries.
- Add audit events for material record and membership changes.

Observable acceptance and tests:

- Two tenants cannot read, mutate, export, or infer each other's records.
- Viewer cannot mutate records or view unmasked restricted fields.
- Duplicate identifiers and overlapping primary links are rejected.
- Import preview has no side effect; commit is bounded and retry-safe.
- Repeated imports do not create duplicate logical records.
- Offboarding closes active links and keeps permitted history.
- Browser tests cover create, search, update, import, link, and offboard flows.

Handoff: attach schema, API, UI, and test evidence to P02. Record unresolved
field decisions as explicit follow-up items. P3 may consume only the accepted
domain contract.

### P3 — ULIP gateway, policy, provenance, and failure states

Window: October, weeks 3–4, 2026.

Objective: implement the provider boundary and deterministic asynchronous
workflow before connecting live ULIP credentials.

Dependencies: P2 domain identifiers, worker and outbox behavior, and the
written or fixture form of the five dataset contracts.

Targeted source references: technical-plan section 8, section 9.3–9.7,
section 10.3–10.4, section 15.3, section 20.3, and section 24; PRD
verification requirements `PRD-VER-001` through `PRD-VER-007`.

Allowed write scope: provider port, adapters, lookup tables, usage ledger,
jobs, retry and cooldown logic, provenance views, fixture or emulator, and
`.thaarei/work/FLEET-P03.md`.

Bounded work:

- Model dataset policy, permitted purpose, allowed fields, entitlement, and
  provider-subject binding.
- Implement operation IDs, correlation IDs, idempotency, bounded retry, and
  durable usage accounting.
- Implement envelope and business-result validation without raw payload leaks.
- Implement partial, masked, unavailable, quota-wait, wrong-subject, and
  schema-mismatch states.
- Pause new provider calls when coordination is unavailable and recover usage
  from PostgreSQL.
- Provide deterministic fixture responses for each of the five datasets.

Observable acceptance and tests:

- Provider calls are asynchronous and return an operation ID.
- Wrong-subject data never populates a requested entity.
- A failed refresh retains the last successful observation.
- Retries and worker crashes do not silently multiply provider effects.
- Valkey loss pauses admission and restart does not reset quota.
- Every result shows source and observation or retrieval timestamps.
- Fixture tests cover all five datasets and every required degraded state.

Handoff: provide the provider contract, fixture matrix, usage evidence, and
open ULIP terms. P4 can implement dataset-specific adapters without changing
the core provider contract.

### P4 — Dataset adapters and verification screens

Window: November, weeks 1–2, 2026.

Objective: implement the five dataset adapters and complete vehicle and driver
verification journeys against fixtures, then qualify live access when written
approval exists.

Dependencies: P3 provider gateway and P2 records. Live qualification also
depends on the matching ULIP approval and egress allowlisting.

Targeted source references: technical-plan section 8.1–8.8, section 11.6,
section 16, section 17.3, and section 20; PRD `PRD-VER-001` through
`PRD-VER-005`.

Allowed write scope: five adapter modules, field mappings, verification UI,
lookup queue UI, source disclosure, fixtures, live qualification evidence, and
`.thaarei/work/FLEET-P04.md`.

Bounded work:

- Implement `VAHAN/04`, `SARATHI/02`, `FASTAG/02`, `ECHALLAN/01`, and
  `FASTAG/01` behind P3 ports.
- Keep raw values, normalized values, source metadata, and mapping version
  according to the approved policy.
- Display provider facts as read-only and label missing or masked values.
- Use `FASTAG/01` only for bounded recent activity.
- Use `ECHALLAN/01` only for read-only details.
- Run live tests only with approved credentials and approved purposes.

Observable acceptance and tests:

- Each adapter passes fixture envelope, subject binding, mapping, and failure
  tests.
- No automatic fallback endpoint is called.
- Live response evidence records dataset, timestamp, contract version, and
  result state without storing credentials.
- Vehicle and driver onboarding show asynchronous progress and truthful failure.
- A successful live call is not recorded as proof of legal compliance.

Handoff: report each dataset as `fixture-complete`, `live-qualified`, or
`pending approval`. P5 may build bounded read-only challan and toll views only
for the states supported by this evidence.

### P5 — Read-only activity views, dashboard, exports, and pilot controls

Window: November, weeks 3–4, 2026.

Objective: make the registry useful for day-to-day pilot operations while
preserving the narrow scope.

Dependencies: P2 domain, P3 gateway, and P4 adapter states.

Targeted source references: PRD sections 8, 10, and 11; technical-plan sections
11, 16, 18, 20.7, and 27; generated UI and reporting modules.

Allowed write scope: dashboard, list and detail views, read-only activity views,
bounded exports, audit presentation, allowance checks, and
`.thaarei/work/FLEET-P05.md`.

Bounded work:

- Add current counts for vehicles, drivers, categories, pending lookups, and
  provider result states.
- Add read-only challan and recent toll observation sections.
- Add search and filters using PostgreSQL projections.
- Add authorized bounded CSV exports with formula-injection protection.
- Add pilot allowance and cohort counters without billing automation.
- Add clear unsupported-coverage, stale, and unavailable labels.

Observable acceptance and tests:

- Dashboard counts are tenant-scoped and reproducible from database queries.
- Exports require authorization, contain only permitted fields, and do not
  create public or persistent download links.
- Toll views never show a live position or reconstructed route.
- Allowance exhaustion blocks new activation server-side.
- Browser tests cover dashboard, filters, detail views, and exports.

Handoff: provide screenshots or browser evidence, query evidence, export
fixtures, and the known limitation list. P6 may prepare production deployment
only after the control and security review accepts the pilot surface.

### P6 — Production topology, backups, security, and recovery

Window: December, weeks 1–2, 2026.

Objective: qualify the minimal Dokploy deployment and prove data recovery
before customer rehearsal.

Dependencies: P1–P5 release candidate, measured resource profile, an India
production VM, an independent India recovery destination, and test secrets.

Targeted source references: PRD sections 10, 11, and 12; technical-plan
sections 17–22; DevX instructions for remote setup and validation.

Allowed write scope: deployment configuration, container and service manifests,
backup and restore scripts, secrets wiring, security tests, telemetry needed for
the pilot, and `.thaarei/work/FLEET-P06.md`. Keep production credentials out
of the repository and work record.

Bounded work:

- Deploy separate web, API, worker, PostgreSQL, and Valkey services through
  Dokploy with private stateful ports.
- Measure coexistence, resource reserves, disk, WAL, logs, and backup growth.
- Configure India recovery copies and monitored freshness.
- Perform a clean-host restore and deletion reconciliation.
- Exercise application rollback and expand-only migration compatibility.
- Verify secret injection, public TLS, tenant RLS, masking, and audit coverage.

Observable acceptance and tests:

- The deployed image digest matches the tested release evidence.
- Production admission rejects mock or sandbox provider classes.
- Backups restore committed records within the four covered-hour target.
- Restored data does not reintroduce erased records.
- Resource and cost measurements fit the budget or produce an explicit capacity
  decision before the next phase.
- Critical security findings are closed or recorded as a pilot blocker.

Handoff: provide deployment digest, configuration inventory, cost ledger,
backup freshness, restore timing, deletion evidence, and security findings.
P7 can harden the release candidate only after recovery evidence is reviewable.

### P7 — Release hardening and recovery rehearsal

Window: December, weeks 3–4, 2026.

Objective: close critical defects and make the release candidate repeatable for
customer rehearsal.

Dependencies: P6 topology and recovery evidence, all accepted P1–P5 flows,
and the open-gate list.

Targeted source references: PRD release acceptance and NFR sections;
technical-plan sections 17, 18, 20, 21, 22, 25, and 30.

Allowed write scope: fixes required by evidence, migration corrections,
accessibility and performance changes, runbooks, release manifests, and
`.thaarei/work/FLEET-P07.md`.

Bounded work:

- Run tenant isolation, authorization, masking, revocation, idempotency, and
  provider-failure suites.
- Test 500 assets and 1,000 drivers with twice-retained test history where the
  host can support it.
- Run browser checks for all pilot journeys at the agreed device profile.
- Rehearse worker crash, retry, Valkey loss, provider outage, and restore.
- Fix only findings that affect the pilot boundary or mandatory controls.
- Write the operator runbook and customer limitation list.

Observable acceptance and tests:

- No critical tenant, data-integrity, security, or recovery finding remains
  open without an owner and explicit pilot block.
- Performance and resource evidence is recorded at representative volume.
- Accessibility checks pass for the core journeys.
- Recovery and rollback evidence is repeatable by the named operator.
- Release manifest and migration checksums are immutable and reviewable.

Handoff: hand over the release candidate, runbook, evidence index, known
limitations, and remaining live gates. P8 uses this candidate for customer
rehearsal.

### P8 — Customer rehearsal and pilot cohort

Window: January, weeks 1–2, 2027.

Objective: rehearse onboarding with synthetic or approved data and validate the
first 10–25 vehicle cohort without silently expanding scope.

Dependencies: P7 release candidate, design partner, approved field mapping,
minimum privacy package, and any live ULIP gates required for the rehearsal.

Targeted source references: PRD onboarding and acceptance sections; technical
plan sections 4, 8, 12, 17.3, 20, 22, 27, and 28; pilot agreement and driver
notice when available.

Allowed write scope: customer-seeded synthetic or approved pilot records,
onboarding fixtures, runbook corrections, support contact documentation, and
`.thaarei/work/FLEET-P08.md`. Do not change production provider policy or
increase cohort size without owner review.

Bounded work:

- Rehearse organization access, import, lookup progress, driver links, search,
  exports, offboarding, and recovery communication.
- Include South and North Indian registration and operating-state fixtures.
- Record live-provider pending states separately from software defects.
- Confirm owner, manager, and viewer permissions with customer participants.
- Validate support-hours and recovery-clock disclosure.

Observable acceptance and tests:

- The cohort can complete the core vehicle and driver journeys.
- Customer acceptance records isolation, data visibility, import outcomes,
  provider states, exports, and known limitations.
- No unsupported compliance claim appears for hazardous, passenger, or lorry
  categories.
- Pilot agreement, driver notice, retention, deletion, and request routing are
  approved or the external pilot remains blocked.

Handoff: provide signed or recorded customer acceptance, cohort counts,
pending provider results, support contacts, and final blocker list. P9 may
perform the final go-live review.

### P9 — Final go-live review and February pilot

Window: January, weeks 3–4, 2027. Target pilot: February 1, 2027.

Objective: decide whether the evidence supports external pilot activation and
onboard the approved cohort.

Dependencies: P8 acceptance, all mandatory evidence gates, approved live ULIP
contracts and connectivity, recovery rehearsal, cost evidence, and named
operations ownership.

Targeted source references: PRD release acceptance and production environment
requirements; technical-plan sections 20–22, 25, 26, 28, 29, and 30; all
accepted phase work records.

Allowed write scope: final release metadata, production rollout record,
customer cohort activation, go-live runbook entries, and
`.thaarei/work/FLEET-P09.md`. Production deployment, provider publication,
and customer activation require explicit authorization in the P9 chat.

Bounded work:

- Recheck the exact release digest, migration set, secrets, backup freshness,
  restore evidence, and provider allowlist.
- Confirm every live dataset is `live-qualified` or remove its live surface
  from the pilot release.
- Confirm the cost ledger and host capacity remain within the accepted plan.
- Activate only the approved 10–25 vehicle cohort.
- Monitor lookup backlog, provider failure, resource use, email delivery,
  tenant access, and customer requests during hypercare.
- Record the decision, evidence, limitations, and next cohort criteria.

Observable acceptance and tests:

- The release checklist has an owner and evidence for every mandatory gate.
- Customer data is admitted only after the privacy, retention, recovery, and
  ULIP conditions are satisfied.
- The first cohort completes the agreed vehicle and driver journeys.
- Hypercare records daily health, queue, quota, resource, and support results
  for ten business days.
- Expansion toward 500 assets remains conditional on measured capacity, quota,
  support, and recovery evidence.

Handoff: deliver the final work record, release evidence index, customer
acceptance, known limitations, hypercare schedule, and next-wave decision. A
future chat must authorize any post-pilot capability or cohort expansion.

## 10. Phase status table

Update this table only after the phase work record and primary review exist.
“Complete” means the phase acceptance and handoff passed. “Implemented,
pending live” means code or fixture behavior exists but an external approval,
live response, or production gate is still open.

| Phase | Window | Status at plan creation | Exit state to record |
| --- | --- | --- | --- |
| P0 Authority, scope, bootstrap prerequisite | Sep weeks 1–2, 2026 | Not started | Complete or blocked with evidence |
| P1 Generated foundation and DevX | Sep weeks 3–4, 2026 | Not started | Complete |
| P2 Fleet, vehicle, driver, import core | Oct weeks 1–2, 2026 | Not started | Complete |
| P3 ULIP gateway and failure states | Oct weeks 3–4, 2026 | Not started | Complete |
| P4 Dataset adapters and verification screens | Nov weeks 1–2, 2026 | Not started | Complete or implemented pending live |
| P5 Dashboard, activity views, exports | Nov weeks 3–4, 2026 | Not started | Complete |
| P6 Deployment, security, backups, recovery | Dec weeks 1–2, 2026 | Not started | Complete or pilot blocked |
| P7 Release hardening and rehearsal | Dec weeks 3–4, 2026 | Not started | Complete |
| P8 Customer rehearsal and cohort | Jan weeks 1–2, 2027 | Not started | Complete or pilot blocked |
| P9 Final review and February pilot | Jan weeks 3–4, 2027 | Not started | Complete only with live gates |

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

Read, in order:
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
