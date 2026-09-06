# Thaarei Fleet Compliance SaaS — Version 2 Product and Technical Plan

**Status:** Approved architecture baseline; production-readiness evidence pending
**Consolidated:** 5 September 2026
**Scope:** Production-grade, multi-tenant SaaS platform

## 1. Executive architecture

Thaarei will own and operate one multi-tenant fleet-compliance SaaS product for
Indian commercial fleet operators. The tenant and data-isolation boundary is an
**Organization**, representing one operating/legal entity. Customer Account,
Billing Account, Contract and Subscription remain separate commercial control-plane
concepts, while Fleet and Location are optional operational groupings inside an
organization. Drivers belong to an organization's driver pool and can move between
fleets and vehicles through effective-dated relationships.

The product is an installable, online-first responsive web application built from
the pinned Thaarei starter-kit baseline. The selected runtime is Next.js, Fastify,
strict TypeScript, PostgreSQL with row-level security, Graphile Worker, Garage
object storage, Valkey, Better Auth and a transactional outbox. Production uses
provider-neutral unmanaged infrastructure in India, deployed through Dokploy from
signed private GHCR images. The initial production boundary is one active Dokploy
host plus an independently administered backup/monitoring VPS in a different India
provider account and preferably a different city. The active host separates the
data, application, security and observability planes into independently deployable
Docker Compose projects; an application release never recreates a database,
object-storage or backup service. AWS, Azure and GCP managed runtimes, managed
databases/queues/object stores, serverless platforms and Kubernetes are excluded.
Python is reserved for a separately approved future extraction service.

The launch target is approximately 100 organizations, 50,000 managed assets and
100,000 drivers. The launch availability objective is 99.5% over a rolling 30-day
window, with a one-hour recovery-point objective and four-hour recovery-time
objective. ULIP availability and freshness are measured separately from
Thaarei-controlled service availability. Production rollout progresses through
internal validation, design partners, pilot and general availability. This is a
single-active-host availability profile: it makes no automatic host-failover,
three-zone storage or zero-downtime claim. The one-hour RPO and four-hour RTO must
be demonstrated using the independent recovery VPS before general availability.
The initial infrastructure budget is INR 15,000–40,000 per month, excluding staff,
payment/email transaction charges and exceptional growth storage.

The architecture is a modular monolith with explicit domain and adapter boundaries.
PostgreSQL is the command and consistency authority; business state, mandatory
audit, idempotency and outbox events commit atomically. Provider calls, scanning,
notifications, reports and other long work run asynchronously through bounded,
idempotent jobs. Tenant isolation, authorization, compliance correctness, audit
completeness, committed-data integrity and deletion non-resurrection are
non-budgetable invariants in every environment. Local, CI and ordinary staging may
use synthetic data, emulators and reduced infrastructure, but cannot disable those
invariants. Missing optional infrastructure disables only its dependent capability;
production admission still fails closed when a mandatory production control is not
qualified.

This Version 2 plan does not modify the running Version 1 deployment. The root
`docs/PRD.md`, `docs/ARCHITECTURE.md` and `docs/DEPLOYMENT.md` remain authoritative
for Version 1 until an explicitly approved Version 2 cutover.

## 2. Approved decision index

This index provides traceability and environment applicability. The linked section
is authoritative for the complete requirement, constraints, failure behavior and
evidence gate. Classes are **Invariant** (the same security/domain behavior in every
environment), **Adapter** (one contract with environment-specific implementations),
**Production control** (implemented/testable earlier but mandatory only for its
production gate), and **Deferred**. `RC` means the on-demand staging release profile.

| ID | Final decision | Environment class | Local | Staging | Production | Authoritative section |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | Organization is the tenant and legal-operating-entity boundary; commercial account, payer, contract and subscription remain separate. | Invariant | Required | Required | Required | [§5.1](#51-recommended-hierarchy) |
| D-002 | Drivers are organization-local profiles with effective-dated engagements and no cross-organization identity linking. | Invariant | Required | Required | Required | [§5.3](#53-driver-and-asset-relationships) |
| D-003 | Each asset has at most one current primary fleet and home location; tags and saved segments provide cross-cutting classification. | Invariant | Required | Required | Required | [§5.1](#51-recommended-hierarchy) |
| D-004 | Fleet eligibility, custodianship, duty assignments and vehicle combinations are separate effective-dated relationships. | Invariant | Required | Required | Required | [§5.3](#53-driver-and-asset-relationships) |
| D-005 | Requirement assessment, subject posture and context-specific operational decision are separate outputs. | Invariant | Required | Required | Required | [§7.2](#72-evaluation-output) |
| D-006 | Facts and assessments are immutable; controlled exceptions affect only contextual decisions. | Invariant | Required | Required | Required | [§7.3](#73-operational-exceptions-and-acknowledgements) |
| D-007 | Requirements, credentials, subjects, evidence, observations, facts and verification results use distinct records and lifecycles. | Invariant | Required | Required | Required | [§6.4](#64-credential-and-evidence-model) |
| D-008 | Central, jurisdictional, operation and tenant-extension policies are immutable, effective-dated and governed through reviewed publication. | Invariant | Required | Required | Required | [§7.1](#71-policy-model) |
| D-009 | VAHAN/04, SARATHI/02 and FASTAG/02 are pilot targets; other approved datasets have the bounded roles defined by the ULIP matrix. | Adapter | Emulator | Emulator/official sandbox in RC | Approved live datasets | [§8.2](#82-dataset-recommendation) |
| D-010 | ULIP is an asynchronous quota-constrained provider with global, dataset, organization and subject controls. | Adapter | Deterministic emulator | Emulator; sandbox only in RC | Qualified live adapter | [§8.3–8.7](#83-provider-boundary) |
| D-011 | Every SARATHI call requires a permitted purpose, processing authority, minimized fields and auditable privacy controls. | Invariant | Required for fixtures | Required | Required | [§17.3](#173-privacy) |
| D-012 | Billing separates package, committed managed-asset capacity and add-ons; Thaarei's ledger is authoritative. | Invariant | Required | Required | Required | [§14.1](#141-commercial-model) |
| D-013 | Findings, cases, tasks, notifications and acknowledgements remain distinct, with governed expiry thresholds and in-app/email delivery. | Invariant | Required | Required | Required | [§15](#15-notifications-and-workflow) |
| D-014 | Documents use private encrypted Garage storage in India, fail-closed scanning, immutable generations and exact-object grants. | Adapter | Optional Garage/scanner profile | Garage core; scanner in RC | Qualified live capability | [§17.2](#172-document-and-object-storage) |
| D-015 | Production uses one active India-hosted Dokploy server plus an independently administered India recovery/backup VPS; logical planes remain separately deployable. | Production control | Contract fixtures | One-host topology rehearsal | Mandatory two-boundary topology | [§21.1](#211-initial-topology) |
| D-016 | Better Auth owns global login identity and authenticators only; application-owned memberships and permission-based MFA govern tenant access. | Invariant | Required | Required | Required | [§13.1](#131-authentication) |
| D-017 | Authorization uses server-enforced RBAC plus relationship, scope, field and assurance checks with PostgreSQL RLS. | Invariant | Required | Required | Required | [§13.3](#133-authorization) |
| D-018 | Bulk onboarding uses versioned XLSX/CSV, quarantined staging, side-effect-free preview and atomic idempotent commit sets. | Invariant | Required | Required | Required | [§12.1](#121-import-workflow) |
| D-019 | Tenant application audit and platform security evidence are separate append-only streams with independently verified archives. | Invariant | Transaction/audit contract | Full application audit; archive in RC | Independent archive mandatory | [§18](#18-audit-logging) |
| D-020 | Retention and deletion are purpose-aware, hold-aware, processor-reconciled and restore-safe. | Invariant | Deterministic short policies | Full behavior; restore in RC | Approved retention mandatory | [§19](#19-data-retention-and-deletion) |
| D-021 | Reliability uses customer-journey SLIs, a 99.5% objective, error budgets, staffed critical on-call and tested degraded modes. | Production control | Failure fixtures | SLIs/synthetic probes; paging in RC | SLO/on-call mandatory | [§20.1](#201-service-objectives) |
| D-022 | PostgreSQL atomically commits business state, audit, outbox and idempotency; asynchronous delivery is explicitly at least once. | Invariant | Required | Required | Required | [§9.6](#96-data-consistency) |
| D-023 | PostgreSQL provides MVP search/reporting; exports use immutable snapshots, reauthorization and short-lived encrypted artifacts. | Invariant | Required | Required | Required | [§16](#16-search-reporting-and-exports) |
| D-024 | Restricted fields use application-owned authenticated envelope encryption with independent production and recovery wrapping paths. | Invariant | Generated development keys | Isolated test keys | Independent production/recovery custody | [§17.1](#171-security-baseline) |
| D-025 | Delivery follows NIST SSDF and OWASP ASVS with reviewed changes, signed provenance, scanning and independent security testing. | Production control | Fast checks | Normal checks; DAST/security suite in RC | Promotion evidence mandatory | [§17.1](#171-security-baseline) |
| D-026 | The Next.js application is online-first, responsive and WCAG 2.2 AA-oriented, with no offline tenant store or queued browser writes. | Invariant | Required | Required | Required | [§11](#11-frontend-and-ux-architecture) |
| D-027 | Customer REST APIs and webhooks are post-MVP entitlements with independent versioning and organization-scoped machine identities. | Deferred | Disabled | Disabled | Disabled for MVP | [§10.5](#105-future-customer-api-and-machine-identity) |
| D-028 | One authoritative PostgreSQL writer uses bounded role-separated pools and time partitions only for forecast high-growth histories. | Production control | Real PostgreSQL contract | Representative pools/load in RC | Capacity evidence mandatory | [§9.8](#98-growth-partitioning-and-database-maintenance) |
| D-029 | Runtime uses provider-neutral unmanaged VPS infrastructure in India, with one active Dokploy host and manual evidenced recovery from a second provider boundary. | Production control | Not applicable | Topology contract | Mandatory | [§21](#21-infrastructure-and-deployment) |
| D-030 | A secrets-provider abstraction supports generated local values, isolated Dokploy staging/production injection and independent recovery custody; Infisical is optional after host separation. | Production control | Untracked generated values | Isolated Dokploy secrets | Restricted injection plus offline recovery | [§21.9](#219-configuration-and-secrets-baseline) |
| D-031 | Garage provides the S3-compatible adapter on one node; PostgreSQL governs immutable generations and the recovery VPS receives verified exact-object copies. | Adapter | Optional disposable node | Single node | Single node plus recovery copy | [§17.2](#172-document-and-object-storage) |
| D-032 | ZeptoMail India provides transactional email through separated agents, application-owned state and signed-webhook reconciliation. | Adapter | Mailpit | Mailpit/test Agent in RC | Qualified live Agent | [§15.3](#153-delivery-architecture-and-channels) |
| D-033 | Primary self-hosted telemetry may share the active host; the recovery VPS independently runs monitoring, status and paging. | Production control | Optional telemetry profile | Basic telemetry; full suite in RC | Primary plus independent monitoring | [§20.6](#206-telemetry) |
| D-034 | Cloudflare is DNS-only; Dokploy/Traefik terminates public traffic and Fastify enforces application policy, with optional qualified CrowdSec host protection. | Production control | Development ingress | Dokploy ingress/RC rules | Mandatory qualified edge | [§21.2](#212-public-edge-dns-and-recovery-routing) |
| D-035 | Hostile files run in a separately networked/credentialed no-egress scanner Compose project before fresh accepted-object encryption. | Adapter | Optional scanner profile | Real scanner in RC | Qualified scanner mandatory | [§17.2](#172-document-and-object-storage) |
| D-036 | A separately administered India recovery VPS and offline media hold authoritative recovery copies under the 35-day horizon. | Production control | Restore fixtures | Backup/restore in RC | Mandatory independent copies | [§22](#22-backup-and-disaster-recovery) |
| D-037 | Production hosts use hardened Ubuntu 24.04, reviewed Ansible/OpenTofu, WireGuard/FIDO2 administration and least-privilege runtimes. | Production control | Container/runtime checks | Reduced host profile; full in RC | Mandatory | [§21.3](#213-host-administration-and-runtime-baseline) |
| D-038 | Dokploy/Traefik ACME owns public TLS; same-host services use private networks/credentials or sockets, and every cross-host data path uses mTLS or an approved mutually authenticated protocol. | Production control | Development TLS optional | Public TLS; cross-host tested in RC | Mandatory | [§21.4](#214-public-certificates-and-private-service-trust) |
| D-039 | Version-pinned containerized PostgreSQL 18 is authoritative with deterministic locale, checksums, minimal extensions and rehearsed upgrades. | Adapter | Disposable container | Persistent isolated container | `platform-data` container | [§9.1](#91-database) |
| D-040 | Two non-persistent Valkey processes separate coordination from reconstructable cache and degrade safely on loss. | Adapter | Optional containers | Core containers | `platform-data` containers | [§23](#23-scalability-strategy) |
| D-041 | Production durable data-bearing volumes are encrypted and mount-gated; local is disposable and staging uses isolated encryption where available. | Production control | Not required | Reduced/RC verification | Mandatory | [§21.5](#215-encrypted-host-volumes-and-boot-recovery) |
| D-042 | Explicit local, CI, preview, staging, production and recovery profiles have distinct data, identities, credentials and provider boundaries. | Production control | Core/full allowlist | Core/release allowlist | Production-only allowlist | [§21.6](#216-environment-isolation-and-promotion) |
| D-043 | Signed immutable images, one release manifest, separate Compose projects, expand-only migrations and digest rollback govern releases; initial application deployment is not a multi-node Swarm. | Production control | Development images | Same-digest RC validation | Mandatory release control | [§21.7](#217-production-release-execution-and-rollback) |
| D-044 | A pinned starter release is a one-time generator input; exact runtime/dependency qualification governs the independent product repository. | Production control | Development baseline | Production-image qualification | Mandatory | [§24](#24-starter-kit-implementation-delta) |
| D-045 | Legal dates, instants and civil schedules use distinct types, authoritative zones and a reproducible clock contract. | Invariant | Required | Required | Required | [§7.4](#74-temporal-and-legal-calendar-contract) |
| D-046 | Fastify owns a bounded transport contract with safe errors, cancellation and consecutive-client compatibility. | Invariant | Required | Required | Required | [§10.4](#104-private-transport-errors-and-compatibility) |
| D-047 | UUIDv7 is entity identity; external identifiers are typed, versioned evidence with reviewed non-destructive resolution. | Invariant | Required | Required | Required | [§9.3](#93-canonical-identifiers-and-entity-resolution) |
| D-048 | Launch compliance coverage is limited to reviewed operation/jurisdiction cells with assertion-level assurance and explicit unsupported states. | Invariant | Required | Required | Required | [§6.6](#66-applicability-and-launch-policy-packs) |
| D-049 | Customer application, organization, commercial activation, membership and dataset entitlement use separate governed lifecycles. | Invariant | Required | Required | Required | [§4.3](#43-customer-and-organization-lifecycle) |
| D-050 | Corrections append, supersede, restate and reconcile according to record class; committed history is never generically undone. | Invariant | Required | Required | Required | [§9.7](#97-corrections-invalidation-and-restatement) |
| D-051 | Policy-significant values use immutable Thaarei concepts and reviewed provider mappings while retaining raw source values. | Invariant | Required | Required | Required | [§9.4](#94-canonical-reference-data-and-provider-mappings) |
| D-052 | Data quality is purpose-specific and multidimensional, with owned findings and reconciliation separate from compliance. | Invariant | Required | Required | Required | [§9.5](#95-data-quality-reconciliation-and-stewardship) |
| D-053 | Management, ownership/custody, regulatory status, availability and compliance are independent effective-dated lifecycles. | Invariant | Required | Required | Required | [§5.4](#54-asset-driver-and-operational-lifecycles) |
| D-054 | Sensitive actions use one immutable server-enforced proposal, quorum, reauthorization and execution boundary. | Invariant | Required | Required | Required | [§13.4](#134-approval-and-transaction-authorization) |
| D-055 | Typed configuration, release flags, tenant settings and deny-only emergency controls have distinct authorities and lifecycles. | Invariant | Required | Required | Required | [§21.9](#219-configuration-and-secrets-baseline) |
| D-056 | Global identity, email, authenticators, sessions, invitations, memberships and driver profiles remain separate. | Invariant | Required | Required | Required | [§13.2](#132-human-identity-and-account-lifecycle) |
| D-057 | Legal publications, presentation, acceptance, contracts, privacy consent and transaction authorization have separate immutable evidence. | Invariant | Required | Required | Required | [§4.4](#44-legal-publications-contracts-and-acceptance) |
| D-058 | Legal holds preserve exact scoped records without granting access, extending unrelated retention or bypassing deletion reconciliation. | Invariant | Required | Required | Required | [§19.1](#191-legal-holds-and-digital-evidence-preservation) |
| D-059 | Data-principal rights are accessible to non-users and routed between customer and Thaarei authority with proportional verification. | Invariant | Required | Required | Required | [§17.3](#173-privacy) |
| D-060 | Operations launch in en-IN while legal/consent journeys use governed human-reviewed language publications and locale-safe data contracts. | Invariant | Required | Required | Required | [§11.5](#115-localization-language-and-translation-governance) |
| D-061 | Thaarei's ledger, one statutory-document authority and Razorpay collection remain distinct, reconciled finance boundaries. | Adapter | Razorpay Test/emulator | Razorpay Test | Qualified Live collection | [§14.3](#143-india-tax-documents-collection-and-accounting-boundary) |
| D-062 | Every external supplier/service has a recorded legal role, criticality, admission evidence, monitoring and exercised exit path. | Invariant | Fixture/software inventory | Non-production suppliers | Production admission mandatory | [§17.5](#175-third-party-supplier-and-subprocessor-governance) |
| D-063 | Customer support is application-owned, organization-safe and distinct from incidents, privacy, billing and privileged access. | Invariant | Required | Required | Required | [§13.6](#136-customer-support-and-service-requests) |
| D-064 | Product measurement is first-party, purpose-bound and predominantly server-derived, with no behavioral surveillance or pilot A/B testing. | Invariant | Required | Required | Required | [§20.7](#207-product-measurement-and-experimentation) |
| D-065 | OCR remains outside MVP; any later extraction is isolated, self-hosted, abstaining and human-confirmed transcription only. | Deferred | Disabled | Disabled | Disabled for MVP | [§17.2](#172-document-and-object-storage) |
| D-066 | The INDIA_CORE profile keeps core tenant data, keys, logs, support and recovery in India with registered bounded exceptions. | Invariant | Synthetic-only | Synthetic-only | Mandatory destination control | [§17.6](#176-data-residency-transfers-and-sovereign-access-boundary) |
| D-067 | First-party deterministic abuse controls use minimized journey-specific signals, reversible actions and human review for material sanctions. | Invariant | Required | Required | Required | [§17.7](#177-abuse-fraud-and-automated-threat-control) |
| D-068 | Data use is governed by rights class, purpose, source agreement, recipient and retention rather than a blanket ownership claim. | Invariant | Required | Required | Required | [§17.8](#178-data-rights-intellectual-property-and-permitted-use) |
| D-069 | Product claims use governed evidence-, coverage-, context- and freshness-bound terminology across every publication surface. | Invariant | Required | Required | Required | [§7.5](#75-product-claims-verification-language-and-responsibility) |
| D-070 | Every organization follows a governed implementation, representative pilot, capacity-sized rollout, readiness, hypercare and handover lifecycle. | Invariant | Workflow fixtures | Rehearsal | Required | [§12.2](#122-customer-implementation-go-live-and-handover) |

## 3. Product goals and boundaries

### 3.1 Goals

Version 2 must let a transport organization:

1. Apply for and activate an organization account.
2. Select or receive a subscription plan.
3. Invite users and control their access.
4. Create fleets, locations, vehicles, trailers, and drivers.
5. Onboard records manually or through versioned CSV/XLSX templates.
6. Verify vehicle and driver facts against authoritative sources such as ULIP.
7. Upload, review, renew, and monitor documentary evidence.
8. Continuously evaluate compliance using explainable rules.
9. Resolve discrepancies, expiry risks, challans, and verification failures through owned cases/tasks.
10. Receive useful notifications without alert fatigue.
11. Search, filter, report, and export tenant-owned data.
12. Understand source, freshness, confidence, and audit history for every important fact.
13. Present driver, privacy and consent interactions in the exact approved language
    required for the intended person while keeping statutory meaning reproducible.

### 3.2 Explicit non-goals for the first release

- Real-time GPS fleet tracking or telematics replacement.
- Dispatch, trip planning, rostering, attendance, payroll, working-hours/rest
  calculation, fuel accounting, maintenance ERP, or freight marketplace functionality.
- In-application eChallan settlement; the product will link to official payment channels.
- Treating FASTag/01 as real-time tracking or a definitive FASTag-status source.
- FASTag balance or expiry claims without a separately approved authoritative source.
- Native mobile applications at launch.
- A fully translated authenticated operations UI beyond `en-IN` at launch; D-060's
  multilingual legal/consent and public-driver surfaces remain required and are not
  waived by this scope boundary.
- Machine-published translation of legal, consent, compliance, expiry, security or
  breach content.
- AI agents, RAG, or generative recommendations in the compliance decision path.
- Automatic legal interpretation without approved, versioned policies and human governance.
- Presenting Thaarei's result as legal advice, a government certificate, a
  replacement for statutory records, or a guarantee that every possible operation
  is lawful.
- Per-customer deployments or repositories; tenants share the SaaS platform with logical isolation.

## 4. Users and primary journeys

### 4.1 Personas

- **Organization owner:** accountable for the tenant lifecycle, data and top-level administrators.
- **Organization administrator:** manages users, fleets, locations, policies, integrations, and settings.
- **Compliance manager:** owns verification queues, policy exceptions, renewals, and reporting.
- **Verifier:** reviews evidence and authoritative-source discrepancies.
- **Fleet manager:** manages assigned fleets, assets, drivers, assignments, and operational tasks.
- **Billing administrator:** manages plan, invoices, payment methods, and usage.
- **Viewer/auditor:** receives read-only access to approved scopes and appropriately masked data.
- **Thaarei platform operator:** manages tenant approval, plans, platform health, and support without implicit customer-data access.

### 4.2 Core journeys

#### Organization activation

1. Applicant creates an account and verifies the login email. Any phone number is
   a separately verified contact channel, not an MVP authentication method.
2. Applicant provides D-049's minimized business/authority, operating-state,
   vehicle/use/route/cargo, approximate scale, billing and ULIP-purpose declarations.
3. The system creates only a pending application and reserved control-plane
   references. The applicant can access that application, not an organization
   tenant context, fleet/driver data or product/provider entitlements.
4. Distinct Thaarei reviews establish business/first-owner authority and product/
   privacy/ULIP suitability, including D-048 policy coverage and quota impact.
5. After approval, the applicant selects a plan or receives an enterprise contract.
   A customer, billing account, contract and subscription remain separately modeled;
   GSTIN is verified when supplied/needed but is not organization identity.
6. Confirmed trial/payment/offline credit permits one idempotent provisioning
   command to activate the organization shell, first-owner membership and product
   entitlements transactionally. Dataset entitlements are independently approved.
7. The normal MVP flow is one customer, billing account, subscription and
   organization. An approved enterprise flow may attach additional organizations
   to the payer without copying membership or sharing tenant data.
8. The onboarding checklist leads to locations, fleets, users, imports and first verification.

#### Vehicle onboarding

1. User selects manual creation or downloads a versioned template.
2. The system validates registration number, asset type, ownership mode, fleet/location references, and duplicate identifiers.
3. The system saves a draft asset without waiting for ULIP.
4. An authorized user activates one or more valid drafts after capacity and data-
   version checks; activation records billing/outbox events atomically.
5. A background workflow performs primary vehicle verification through `VAHAN/04`
   and conditionally checks `FASTAG/02`, `FASTAG/01` and `ECHALLAN/01` according
   to entitlement, purpose, freshness and quota policy.
6. Authoritative observations, manually supplied facts, and uploaded evidence remain separate.
7. Conflicts enter a review queue; successful facts feed compliance evaluation.
8. The user sees pending/status, freshness, missing requirements, and the next action.

#### Driver onboarding

1. User creates or imports an organization-local driver profile and engagement in
   the organization's driver pool.
2. The organization selects engagement type, a permitted verification purpose and
   a valid processing basis. Data collection is minimized to that engagement,
   purpose and verification path.
3. Duplicate detection uses organization-scoped identifiers and never reveals
   whether another tenant has registered the same person.
4. The driver receives the exact versioned organization-branded notice in the
   D-060 selected approved language. Where consent is the basis, the consent
   request offers the counsel-approved English/Eighth Schedule language set and
   records a clear affirmative authorization before the first call.
5. The valid draft/engagement is activated explicitly; only then is verification
   queued under the selected purpose and processing authorization.
6. `SARATHI/02` is the default lower-PII status, class and validity check;
   `SARATHI/01` performs enhanced verification only when DOB, field-level
   permission and a documented enhanced purpose authorization exist.
7. Licence classes, transport validity, hazardous/hill endorsements, badges, and
   evidence requirements are evaluated against intended assignments.
8. Fleet eligibility, administrative custodianship and operational duty are
   captured separately. Creating or activating a duty assignment runs a
   compatibility evaluation; an approved operational exception may be required
   when the underlying posture does not permit normal assignment.

#### Renewal and exception management

1. The scheduler identifies approaching expiries or stale authoritative observations.
2. The system creates or updates one deduplicated case rather than producing repeated alerts.
3. An owner uploads renewed evidence or starts an authoritative refresh.
4. A verifier reviews discrepancies where necessary.
5. Successful verification records the new credential/evidence version, preserves
   supersession history and closes related findings where the policy permits.
6. All transitions, reads of sensitive evidence, acknowledgements, operational
   exceptions and approvals are audited.

### 4.3 Customer and organization lifecycle

D-049 keeps a prospective customer's review outside the tenant data plane:

```text
application:  draft → submitted → under_review → needs_information
                                      ↘ approved | rejected
              draft/submitted → withdrawn; needs_information → expired

organization: pending_approval → provisioning → onboarding → active
                                                    ↘ restricted | suspended
              active/restricted/suspended → offboarding → archived
```

`CustomerApplication` records proposed legal/trade name, entity type, registered/
operating address and states, expected vehicle/driver count, vehicle/route/permit/
cargo model, applicant role/contact, billing contact, requested datasets/purposes,
D-048 coverage needs and authorized-representative attestation. Do not collect
Aadhaar, PAN, director KYC, bank details or other personal identity material by
default. Additional evidence requires a recorded proportionate legal, contractual,
billing or risk reason and its own retention/access policy.

GSTIN is optional for an unregistered entity and required in the billing snapshot
when an applicable registered recipient requires it. When supplied, validate
syntax and reconcile the official legal/trade name, status, constitution, state/
principal address, effective/cancellation dates through an approved method, storing
only necessary provenance and observed fields. The official GST search supports
these checks, while invoice rules explicitly support registered and unregistered
recipients: [GST taxpayer search](https://tutorial.gst.gov.in/userguide/taxpayersdashboard/Search_Taxpayer_manual.htm)
and [CBIC invoice rules](https://cbic-gst.gov.in/gst-invoice-rules.html). GSTIN is
neither a tenant key nor applicant-authority proof; one commercial relationship may
have multiple state tax registrations.

During pilot, every application is manually reviewed through two recorded
conclusions:

1. business and authority review verifies the customer, applicant authority,
   intended first owner, billing identity and commercial owner through appropriate
   authorization evidence and an independently confirmed business contact; and
2. product/privacy/ULIP review verifies use, processing purposes, D-048 coverage,
   datasets, scale/quota and risk.

Escalate enhanced `SARATHI/01`, hazardous/passenger/specialized use, more than 500
assets, multiple organizations, identity/GST mismatch, repeated trials, unsupported
coverage, offline credit and unusual provider volume. No applicant/reviewer can be
the sole final entitlement approver for a high-risk case. Verified login email or
company domain remains a signal only: it never creates membership, ownership,
tenant discovery or automatic domain joining.

Approval alone does not activate a tenant. Approved commercial terms plus trial,
captured payment or maker/checker offline credit authorize an idempotent provisioning
operation. Its database transition creates/links customer, organization, payer,
contract/subscription, first-owner membership, audit, outbox and product entitlement
state atomically; external payment remains outside the transaction. A crash enters
`provisioning_failed` and the same command resumes without duplicating any record.
ULIP dataset entitlements activate separately after their specific approval.

Effective access is the intersection of organization lifecycle, subscription/
entitlement, membership/scope/authentication assurance and security/legal emergency
controls. `restricted` is the D-012 commercial mode; `suspended` is an explicit
security, legal, abuse or authority control. Each suspension records reason,
authority, scope, review time, allowed billing/privacy/export/read actions,
integration/background-processing behavior, communication and reinstatement gate.
A vehicle's compliance suspension is unrelated to either state, and no suspension
deletes tenant data automatically.

Trade name, address and ordinary details change through versioned audit. Replacing
the responsible legal/operating entity creates a new organization UUID; merger,
acquisition or transfer requires verified authority, legal/privacy approval,
explicit scope and governed export/import or transfer tooling. It cannot rename the
old tenant. A location is not another tenant unless it has separate legal/data
authority. Adding an organization to a payer copies no people, grants, data,
policies, identifiers or evidence.

Encourage two active owners. Transfer requires D-016 ten-minute step-up, verified
current authority and another owner's approval; the sole-owner case uses controlled
Thaarei recovery, and the last owner cannot be removed. Billing authority does not
move implicitly.

Offboarding stops new ULIP/scheduled collection, activations/import commits and
external integrations; revokes machine/webhook/upload credentials; preserves only
authorized billing, privacy, read/export access during D-020's 30-day window; and
creates a closure/deletion inventory. `cancelled`, `suspended`, `offboarding`,
`archived` and verified deletion remain separate. Backup restore must retain the
offboarding/tombstone state and can never restart membership, entitlements, polling
or notifications.

### 4.4 Legal publications, contracts and acceptance

D-057 prohibits one mutable `accepted_terms` flag. Treat these as separate records
with separate legal meaning and lifecycle:

| Record | Meaning |
| --- | --- |
| Notice presentation/delivery | Information was presented or delivered; neither event proves agreement or reading |
| Individual acceptance | One authenticated person expressly accepts user terms or acceptable-use obligations for themself |
| Organization-authorized acceptance | A verified representative expressly accepts the exact offer for the named organization |
| Contract execution | The parties execute an MSA, order form, DPA or amendment through the approved method |
| Privacy notice and consent | Notice was made available and, only where required, the data principal separately authorizes exact personal-data purposes |
| Acknowledgement | Awareness is recorded without changing facts, compliance or contract state |
| Transaction authorization | D-054 authorizes one exact sensitive operation; it is not continuing contract or privacy authority |

Maintain a product-owned legal-document registry for platform terms, acceptable-use
and security responsibilities, privacy notices, organization service terms, order
forms/amendments, DPAs, ULIP/dataset restrictions and driver purpose notices/consent.
A stable document code has immutable UUIDv7 publications. Each publication records
class, audience, jurisdiction, product/organization applicability, independently
approved language, publication/effective/supersession/retirement instants, exact
canonical HTML and accessible PDF object generations and SHA-256 hashes, legal-
review evidence, materiality, reacceptance rule, notice period and non-acceptance
effect. Every translation is separately reviewed, hashed and linked for semantic
equivalence; a locale label cannot select different legal meaning under one version.

For counsel-approved ordinary user/platform/SaaS terms, use explicit clickwrap: show
the exact document or accessible direct link, leave a specific acceptance control
unchecked, say whether the actor accepts personally or for the named organization,
separate each optional consent and commit through an authenticated idempotent server
command. The server binds the offer version at presentation and rejects a stale
acceptance if the governing publication, organization, authority or commercial
proposal changed. Browsewrap, preselected controls, passive continued-use evidence
and a generic bundled "agree to everything" control are prohibited. Viewing,
downloading, email acceptance/delivery or IP address alone never proves acceptance.

An immutable acceptance records its UUID/idempotency key; exact publication UUID,
content hash, language and affirmative-action wording; global user UUID; named
customer/organization/contract/subscription; membership and representative-authority
evidence; authentication method/assurance/step-up age; server transaction instant;
request/audit/release/contract-schema IDs; bounded protected network/client metadata;
and notification/outbox receipt. It links later supersession or termination without
changing the historical event. Supply the accepting party an exact downloadable copy.
Keep enough accessible, accurate origin/destination/time and content-integrity evidence
to meet counsel-approved electronic-record retention and evidentiary procedures.

Personal account acceptance cannot bind a customer. Initial organization acceptance
uses D-049's independently verified representative authority and exact legal entity/
commercial proposal. Provisioning rechecks that the required publication set remains
effective, each exact acceptance/contract is complete and authority has not been
withdrawn. Email, domain, GSTIN, owner-role label or payment alone never proves this.
Later material commercial, DPA, liability or ULIP-purpose amendments require the
eligible owner/legal/billing function and D-054 tier selected by risk and value.

Do not integrate an e-signature provider in MVP. Counsel-approved ordinary terms use
the explicit application acceptance above. Enterprise or document classes requiring
stronger execution use an externally completed wet signature, licensed DSC/CCA eSign
or other counsel-approved method; ingest the final document through D-014/D-035,
independently review counterparty, signer authority and completeness, and retain an
encrypted immutable generation/hash linked to its contract. Never label clickwrap,
authentication or Aadhaar/e-KYC alone as a digital/electronic signature. A future
in-product CCA eSign provider requires a separate legal, privacy, residency, security,
support, cost and failure-mode decision.

Privacy notice, processing basis and consent remain outside the contract ledger even
when they share publication infrastructure. A notice records exact text/language,
personal-data categories, purposes, fiduciary/processor role, rights, grievance and
withdrawal routes and presentation/delivery outcome. When consent is the basis, its
separate affirmative record is free, specific, informed, unconditional, unambiguous,
purpose/data-minimized and as easy to withdraw as to give. Withdrawal stops affected
future processing under D-011/D-020 but neither erases the historical consent event
nor terminates unrelated contract obligations; new terms never revive it.

Classify changes as `editorial_non_material`, `clarifying_non_material`,
`material_commercial`, `material_privacy`, `material_data_use`, `material_security`
or `urgent_legal_or_security`. Only counsel-approved non-material publications may
rely on an earlier acceptance. A material version receives impact/population review,
scheduled activation, advance notice and explicit reacceptance by the currently
authorized actor. After the deadline, restrict new mutations, ULIP collection and
activation as the published policy specifies while preserving only minimum login,
review/accept, billing resolution, privacy rights, authorized export and support;
do not infer termination or delete data. An urgent version may take immediate effect
only through counsel-approved D-054/emergency handling, recorded reason and prompt
notice.

Acceptance remains an immutable historical fact. Supersession, contract termination,
consent withdrawal, non-acceptance, organization offboarding and legal-document
correction are independent effective-dated events. Retain each class only under the
approved D-020 schedule; minimize contact/network data while retaining permitted
non-reusable proof. Deletion and restore reconciliation must not revive an acceptance's
authority, withdrawn consent, an ended contract or an offboarded organization.

The design uses the IT Act's recognition of [electronic contracts and records](https://www.indiacode.nic.in/bitstream/123456789/13116/1/it_act_2000_updated.pdf)
without claiming that all electronic acceptance is a regulated signature. CCA's
[eSign framework](https://cca.gov.in/eSign.html) remains the reference when a licensed
document-bound electronic signature is required. Contract competence/free-consent
review follows the [Indian Contract Act](https://www.indiacode.nic.in/bitstream/123456789/2187/2/A187209.pdf),
electronic-evidence export follows the [Bharatiya Sakshya Adhiniyam](https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf),
and privacy notice/consent follows the [DPDP Act](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf)
and phased [DPDP Rules, 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
Indian counsel must approve each document class, language, execution method,
reacceptance trigger and retention period before production use.

## 5. Domain model and hierarchy

### 5.1 Recommended hierarchy

```text
Thaarei Platform
├── Customer Account (commercial relationship with Thaarei)
│   ├── Billing Account(s) (payer and invoicing responsibility)
│   ├── Contract(s) and Subscription(s)
│   └── Organization link(s) (commercial association only)
└── Organization (tenant, operating/legal entity and data boundary)
    ├── Memberships and access grants
    ├── Locations / branches / depots
    │   └── Asset home-base history with effective dates
    ├── Fleets (operational responsibility units)
    │   └── Primary asset memberships with effective dates
    ├── Controlled tags and saved segments
    ├── Assets
    │   ├── Motor vehicles
    │   └── Trailers / semi-trailers
    ├── Organization-local driver profiles and engagements
    ├── Assignments and vehicle combinations
    ├── Documents and evidence
    ├── Verification observations and cases
    ├── Compliance policies and evaluations
    └── Entitlement assignments and tenant-attributed usage
```

The links from a customer/billing account to multiple organizations authorize
commercial administration only. They do not create cross-organization visibility
of fleet, driver, document, verification, compliance or audit data. A user still
needs an explicit membership or narrowly defined billing grant for every
organization they can access.

### 5.2 Why Fleet is not the tenant boundary

A fleet is an operational grouping such as a business unit, contract fleet,
depot fleet, or vehicle class. Organizations often reorganize these groupings.
Making Fleet the tenant would complicate organization-wide drivers, reporting,
billing, and transfers. A fleet therefore has effective-dated membership and
optional scoped access, but the organization owns every record.

For MVP, a Fleet is specifically an operational responsibility unit, not a
general-purpose label. An asset has zero or one primary fleet at any instant;
unassigned assets are valid during onboarding or reorganization. Fleets are flat,
may have managers and operational defaults, and are archived rather than deleted
when history exists. They are not billing, document-ownership, statutory or
tenant-isolation boundaries.

Archival is non-cascading. Before a fleet or location is archived, preview current
assets, future/active assignments, managers and scoped access, notification routes,
saved views and policy/default dependencies. Assets must be reassigned or
explicitly left unassigned; drivers and assets are never offboarded automatically.
Close affected current scope/routing/default relationships at the effective instant,
block new relationships and preserve the archived unit in authorized history.

A Location is an independent physical/operational site such as a branch, depot,
yard, office, workshop or parking base. An asset has zero or one effective-dated
home location, which does not claim that the asset is physically present there.
One fleet may operate from several locations and one location may support several
fleets. Real-time position remains outside MVP unless a telematics capability is
introduced later.

Controlled tags provide many-to-many classification, while saved views provide
reusable filtering without changing asset ownership. Dynamic segments may be
added later. Tags do not grant access in MVP and must not replace verified facts
in statutory policy selection.

### 5.3 Driver and asset relationships

- A driver profile is owned by exactly one organization. It represents that
  organization's relationship with a person, not a platform-global person identity.
- The same physical person may have independent profiles in multiple organizations.
  The platform does not link them, disclose the match, or share data between them.
- Duplicate detection and merge workflows operate only inside one organization.
- An organization-local driver may be eligible for several fleets and locations.
- Effective-dated engagements classify the relationship as employee, contractor,
  agency-supplied, owner-driver, temporary/relief, or another governed type.
- Employment/engagement state and driving/compliance eligibility are independent.
- Fleet/location eligibility is many-to-many and effective-dated; it indicates
  where a driver may work, not that the driver operated a vehicle.
- A vehicle may have zero or one effective-dated primary custodian for keys,
  documents, inspection or administrative responsibility. One driver may
  administer several assets, and custodianship is not evidence of driving or duty.
- An operational duty assignment has planned/actual interval, purpose, role,
  assignment group, available operational context and audit provenance.
- Duty states are `draft`, `planned`, `active`, `completed`, `cancelled` or
  `interrupted`. Multiple drivers may be assigned to one vehicle through a common
  group as responsible, co-, relief, trainee or supervisory crew.
- A driver cannot have overlapping active duties on different powered vehicles.
  Overlap on the same vehicle is permitted only within a deliberate crew group.
- Assignment activation requires an active engagement and captures the applicable
  compatibility evaluation. Later compliance changes flag/re-evaluate the duty
  without deleting its history.
- A driver may have no active vehicle and remain in the available pool.
- Vehicle combinations use a header plus effective-dated participants with roles
  such as prime mover, trailer, semi-trailer or dolly. Assets cannot participate in
  incompatible overlapping active combinations.
- Combining assets never changes fleet or home-location membership automatically.
- Cross-organization combinations are not supported in MVP; leased/third-party
  assets must be onboarded as organization-local operational assets.
- Moving an asset between primary fleets or home locations closes the former
  effective-dated record and creates a new one; history is never overwritten.
- Moving a driver to another organization is not an MVP operation. The former
  organization offboards its profile and closes assignments; the new organization
  independently onboards and verifies its own profile. Evidence, observations,
  cases and audit history never move automatically.

### 5.4 Asset, driver and operational lifecycles

D-053 prohibits a single overloaded subject status. Persist and expose five
independent dimensions:

1. product-management lifecycle;
2. real-world ownership/custody intervals;
3. source-observed regulatory status;
4. tenant operational availability; and
5. compliance posture/contextual eligibility.

An asset may therefore be managed, leased, registration-active, under maintenance
and compliance-clear at the same time; it is unavailable for duty without being
offboarded or falsely described as legally invalid.

Asset product-management lifecycle is:

```text
draft → activation_pending → managed → offboarding_pending
                                   → offboarded → archived
```

Drafts are non-billable and unmonitored. `activation_pending` is an explicit
capacity/authority/quality transition, not verification. `managed` consumes D-012
capacity and participates in monitoring/compliance/operations.
`offboarding_pending` remains managed and billable until the committed effective
instant because impact, active work or approval is unresolved. `offboarded` stops
ordinary assignment/monitoring and capacity consumption. `archived` is an
authorized historical view, never deletion or anonymization.

Operational availability is separately effective-dated as `available`,
`maintenance`, `temporarily_out_of_service`, `accident_hold`, `safety_hold`,
`seized_or_confiscated` or `stolen_or_missing`, with reason, source/actor,
evidence where required, review/end time and assignment effect. A temporary state,
expired document or compliance failure is not an offboarding reason. Provider-
observed RC status remains a D-051-mapped fact such as active, NOC issued,
suspended, surrendered, cancelled, deregistered or a scrapping stage and cannot be
set by an operator as if authoritative. VAHAN itself exposes distinct statuses;
see its [public status catalogue](https://analytics.parivahan.gov.in/analytics/vahanpublicreport).

Effective-dated ownership/custody records support owned, financed/hypothecated,
leased-in, hired/contracted, agency/third-party-operated, sale/transfer pending,
lease returned, transferred out and reacquired relationships. Commercial sale,
possession handover, tenant management end, NOC/transfer application, authoritative
registered-owner change, financier interest, permit transfer and closure are
separate facts/milestones. A tenant sale assertion does not prove a VAHAN owner
change, and NOC is clearance for the applicable transfer/removal process rather
than proof of completion. See the official Parivahan
[ownership-transfer](https://mparivahan.parivahan.gov.in/mstatic/english/rc-info-ownership.html)
and [NOC](https://mparivahan.parivahan.gov.in/mstatic/english/rc-info-no-objection.html)
guidance.

Controlled asset-offboarding reasons are sale/transfer, lease or hire end, return
to owner, scrapped, registration cancelled/deregistered, total loss/destruction,
stolen-and-written-off, duplicate/incorrect onboarding or another reviewed reason.
The impact preview includes active/future duties, combinations, fleet/location/
custodian intervals, open cases/renewals, scheduled provider work/notifications,
FASTag links, evidence/retention and billing capacity. At the effective instant one
D-022 transaction blocks new work, closes the management episode and applicable
current relationships, records duty reassignment/cancellation decisions, releases
capacity and commits audit/outbox/reconciliation targets. It never deletes
credentials, observations, evaluations or history.

Some disposal processes need a narrow post-management follow-up. An explicit
`closure_watch` processing authorization records exact dataset/fields, purpose/
basis, owner, reduced schedule and hard expiry; it permits only transfer/RC-
cancellation/scrapping closure evidence, no operational use or ordinary full
monitoring. Its commercial treatment is contractual and cannot silently consume or
avoid capacity. The MoRTH scrapping process distinguishes no-dues, certificate of
deposit, scrapping and registration cancellation, so V2 stores those milestones
independently; see the official
[scrapping/cancellation rules](https://morth.nic.in/sites/default/files/notifications_document/09086.pdf).

Reactivation is not a status flip. It appends a new management episode and rechecks
the same organization-local subject, capacity/entitlement, ownership/custody
authority, processing purpose, duplicates, current regulatory state, evidence
freshness, unresolved transfer/scrapping conflicts and compliance. Legitimate
reacquisition may retain the UUID with new intervals. An authoritatively confirmed
scrapped, deregistered or RC-cancelled asset cannot reactivate unless D-050 records
the correcting authority evidence/restatement. Old assignments never reopen.

Driver profile, engagement, operational availability and licence status are also
independent. The profile lifecycle is:

```text
draft → active → offboarded → archived
```

An engagement is `planned → active ↔ suspended → ended`; availability is
`available`, `leave`, `temporarily_unavailable`, `medical_hold` or `safety_hold`.
Licence currency, classes, expiry, suspension, disqualification and revocation are
separate authoritative facts under the
[Motor Vehicles Act](https://www.indiacode.nic.in/bitstream/123456789/9460/1/a1988-59.pdf).
Driver offboarding closes engagement/eligibility, ends or explicitly reassigns
duties, stops unnecessary SARATHI processing and invokes D-020 without claiming the
licence was cancelled. Rehire after same-tenant identity resolution appends a new
engagement and rechecks processing authorization, verification and eligibility.

Transitions use D-045 effective time, controlled reason, expected current version,
idempotency and an immutable impact snapshot. Require step-up for a managed asset or
driver with active duty. Require independent approval for bulk offboarding, active-
operation interruption, retrospective effective time, scrapping/deregistration or
material billing/compliance effect. Bulk work freezes one preview but commits each
subject independently with resumable per-record results; it is not one unbounded
transaction. Backdating uses D-050 correction/restatement and never rewrites what
the platform knew or allowed.

### 5.5 Principal aggregates

- **Customer account:** Thaarei's commercial relationship with a customer group.
- **Billing account:** payer identity, invoicing profile and payment responsibility.
- **Contract:** signed commercial terms, dates and covered organizations.
- **Subscription:** plan, term, state and entitlements funded by a billing account.
- **Organization:** identity, status, settings, legal details, operating jurisdictions.
- **Implementation engagement:** organization-level delivery lifecycle, named
  Thaarei/customer participants, immutable scope/configuration versions, readiness,
  go-live, hypercare and handover evidence; it is not tenant access, subscription,
  subject activation or compliance state.
- **Onboarding wave:** immutable manifest and planned/actual outcome for a bounded
  representative cohort whose activation and provider work remain per subject.
- **Membership:** user and organization relationship, status and invitation
  history; effective-dated role assignments and scope bundles are separate.
- **Fleet:** flat operational-responsibility unit, code, purpose, active dates,
  manager assignments and optional defaults.
- **Location:** physical site type, address and jurisdiction, independent of Fleet.
- **Tag:** controlled cross-cutting classification without access-control meaning.
- **Saved segment/view:** reusable static or dynamic filter definition.
- **Asset:** stable identity, subtype, lifecycle, ownership/lease details.
- **Vehicle profile:** registration, chassis/engine identities, classification and authoritative facts.
- **Driver profile:** organization-local workforce identity, lifecycle and controlled PII.
- **Driver engagement:** effective-dated employment/contract relationship, staff
  reference, joining/offboarding information, home base and engagement type.
- **Driver credential:** encrypted licence identifier, verification inputs,
  classes, endorsements and credential lifecycle.
- **Processing authorization:** organization/driver, engagement type, purpose,
  processing basis, permitted dataset/fields and schedule, notice version/language,
  evidence, effective/expiry times, revocation state and retention profile.
- **Data-principal request:** access, correction, erasure, grievance or nomination
  request with identity verification, ownership, SLA and outcome.
- **Driver eligibility:** effective-dated permission/availability for fleets and locations.
- **Asset custodian:** effective-dated administrative responsibility, distinct from duty.
- **Duty assignment/group:** planned or actual driver/vehicle crew relationship,
  lifecycle, interval, role and compatibility snapshot.
- **Vehicle combination:** effective-dated header and role-based asset participants.
- **Credential/regulatory record:** the real-world instrument, issuer, identifier,
  validity and lifecycle, independent of whether a file was uploaded.
- **Credential subject:** effective-dated link from a credential to one or more
  vehicles, trailers, drivers, combinations, fleets or the organization.
- **Credential version/supersession:** immutable correction or renewal lineage.
- **Evidence artifact:** immutable encrypted file or externally verifiable artifact.
- **Evidence link:** relationship from one artifact to credentials, facts,
  verifications, cases or subjects.
- **Source observation:** immutable, time-stamped facts observed from ULIP or another provider.
- **Fact/claim:** atomic value with source, effective period, observation time,
  masking and verification strength.
- **Verification:** versioned comparison and result for credentials, facts,
  observations and evidence.
- **Regulatory source:** official provenance and review record supporting a statutory interpretation.
- **Policy:** governed, immutable, effective-dated requirements selected by
  jurisdiction, asset type, use and operation.
- **Policy coverage:** reviewed support state for a jurisdiction/use/requirement combination.
- **Compliance evaluation:** reproducible result using a policy version and observation snapshot.
- **Case/task:** owned work created from a finding, expiry, import problem, or discrepancy.
- **Operational exception:** independently approved, time-bounded authorization
  affecting a contextual decision without changing its underlying facts or posture.

## 6. Credential, evidence and compliance catalogue

The platform must not assume one universal list for every Indian commercial
vehicle. Requirements vary by state, permit, vehicle class, ownership, cargo,
route, and use. The catalogue therefore separates a central baseline from
conditional jurisdiction/vehicle policies and tenant-added requirements.

The Motor Vehicles Act/CMVR separately govern registration, transport fitness,
permits, insurance and production of transport records. Amended Rule 139 names
registration, insurance, fitness, permit, driving licence and PUC and permits
physical or electronic presentation. Parivahan exposes RC, DL, insurance, tax,
fitness, PUC, permit and challan status, but neither a portal field nor an uploaded
file proves every assertion needed for operation. These sources establish a
catalogue capability; D-048 still requires applicable central/state/permit terms
and actual ULIP field coverage to be reviewed before a policy cell is published.

Official references:

- [Motor Vehicle Driving Regulations, 2017](https://morth.nic.in/sites/default/files/notifications_document/Motor-Vehicle-Driving-Regulation-2017-H-E.pdf)
- [Motor Vehicles Act, 1988](https://www.indiacode.nic.in/bitstream/123456789/9460/1/a1988-59.pdf)
- [CMVR Rule 139 electronic-document amendment](https://morth.nic.in/sites/default/files/notifications_document/Notification_no_GSR_1081E_dated_2nd_November_2018_regarding_amendment_in_rule_90_of_the_CMVR_1989__additional_condition.pdf)
- [Parivahan Form 25 registration-renewal application](https://parivahan.gov.in/parivahan/sites/default/files/DownloadForm/cmvr/FORM-25.pdf)
- [Parivahan permit service](https://staging.parivahan.gov.in/onlinepermit/vahan/loginpage.xhtml)
- [Central Motor Vehicles Rules — driver and hazardous-goods provisions](https://morth.nic.in/sites/default/files/CMVR-chapter2.pdf)
- [MoRTH electronic-record validation SOP](https://morth.nic.in/sites/default/files/circulars_document/Standard_Operating_Procedure.pdf)
- [ULIP official portal and account terms](https://goulip.in/)

### 6.1 Vehicle statutory baseline

- Certificate of Registration (RC): registration identity/status, vehicle class/use,
  authority/jurisdiction, effective dates and relevant suspension/cancellation/
  blacklist/prohibitory state.
- Statutory motor insurance: policy/insurer where available, exact vehicle binding,
  coverage required by policy, effective period and current/cancelled state where
  an approved source exposes it.
- Fitness certificate for applicable transport vehicles: certificate/authority,
  vehicle binding, inspection/result where available, effective period and revoked/
  unfit state.
- Pollution Under Control certificate: certificate/test authority, vehicle binding,
  result, applicable fuel/emission facts and effective period.
- Road/motor vehicle tax: jurisdiction/category, paid-through period and authoritative
  arrears/clearance state where available.
- Applicable state/regional goods or passenger permit: type, issuer, subject scope,
  operation/route/area coverage, effective period and suspended/surrendered/
  cancelled/replaced state.
- National/interstate permit authorization, state coverage and payment/authorization
  validity as records distinct from the underlying permit.
- Vehicle classification, GVW/axle/class facts needed to determine requirements.
- NOC/blacklist/non-use/surrender status where it affects eligibility.

### 6.2 Conditional vehicle/operation evidence

- Hazardous-goods vehicle approvals, emergency information and equipment records.
- Speed-limiting device/VLTD evidence where a policy requires it.
- Tank, pressure vessel, calibration, body-builder or specialized-equipment certificates.
- Green tax, municipal tax, tax clearance or state-specific certificates.
- Lease, hypothecation, ownership authorization, or customer-contract requirements.
- Trailer/semi-trailer registration and fitness evidence.

These are catalogue capabilities, not assertions that every document is legally
required for every vehicle.

### 6.3 Driver statutory and operational baseline

- Driving licence identity, issuing authority and current status, including
  suspension/cancellation where an approved source exposes it.
- Non-transport and transport validity periods.
- Authorized classes of vehicle.
- Hazardous-goods endorsement/training validity where applicable.
- Hill endorsement where applicable.
- Driver/PSV badge where applicable.
- Medical fitness evidence, including Form 1A where the governing process requires it.
- Employer-required induction, safety training, police verification, or background evidence.
- Identity/contact evidence collected only for a documented purpose.

Form 1A and identity/background material are process or tenant evidence when an
approved rule/purpose requires them; they are not universal continuously carried
driver credentials. Aadhaar, PAN or police verification is not collected by
default merely because a person is a driver.

FASTag is a toll instrument, toll transactions are activity observations and
eChallans are enforcement/liability records. NOC is normally a transfer/
jurisdictional-process record and hypothecation a finance/ownership fact. None is
silently promoted to a universal expiring statutory credential. A policy may make
a particular challan/clearance relevant, but `pending_challan` alone never means
legally inoperable.

### 6.4 Credential and evidence model

A policy requirement states what must be demonstrated. A credential/regulatory
record represents the real-world instrument, whether or not a file exists. A
source observation records what an approved provider reported. An evidence
artifact is an immutable file or externally verifiable item; an evidence link may
associate it with several credentials, facts, verification attempts, cases or
subjects. A file alone never means verified, and an approved authoritative
observation may satisfy a requirement without an uploaded scan.

Credentials use many-to-many effective-dated subject links. This supports a
single-vehicle RC, a driver licence, a policy schedule covering several assets,
an organization/fleet permit, or combination-specific evidence without duplicating
the underlying artifact.

State is intentionally orthogonal:

```text
credential:   draft → current → superseded / revoked / cancelled → archived
validity:     not_yet_valid / valid / expiring / expired / unknown
evidence:     pending_upload → quarantined → scanning → accepted / rejected
              accepted → retention_hold / deleted
verification: unverified → pending → verified / partially_verified
                         ↘ mismatch / unable_to_verify
```

- Metadata correction creates an immutable credential version.
- Renewal with the same identifier creates a new version/effective period.
- Renewal with a new identifier creates a new credential linked by
  `supersedes_credential_id`.
- Prior versions/artifacts are not overwritten and remain subject to retention.
- Multiple current credentials are permitted where the approved type/policy makes
  that meaningful; uniqueness is defined per credential type rather than globally.
- Issue/validity dates use legal calendar dates; workflow/observation times use UTC.
- Original filenames are display metadata only; storage identifiers are server generated.

Recommended source strength, without converting lower levels into authoritative data:

1. approved authoritative provider observation;
2. verifiable issuer-issued electronic document;
3. reviewed original-quality uploaded evidence;
4. reviewed secondary scan/evidence;
5. controlled manual attestation;
6. unverified user claim.

Qualifying issuer-issued DigiLocker/mParivahan records may be legally recognized
at par with originals, but a screenshot is not equivalent to a directly verified
issued record. Any future direct integration requires consent, issuer provenance,
signature/QR verification and contractual approval.

### 6.5 Source precedence and conflicts

- Never overwrite user-entered/extracted facts with provider values without retaining all versions.
- Store each fact with source, observed time, effective dates, confidence, masking status, and verification method.
- Authoritative-source facts normally outrank manual claims for statutory status.
- Uploaded evidence may resolve facts absent from ULIP but must not silently contradict an authoritative revocation.
- OCR/extraction output is derived evidence with model/version, confidence and
  page/region provenance; it never becomes authoritative solely through confidence.
- Masked ULIP values are evidence of a partial match, not evidence of inequality.
- Conflicts produce a review case with field-level comparison and permitted resolution actions.
- Every compliance result records the policy version and input observation IDs used to produce it.
- D-050 correction never mutates an observation or past evaluation: it appends the
  corrected assertion/result, links the invalidated/superseded record and drives
  explicit current reconciliation or labeled historical restatement.

### 6.6 Applicability and launch policy packs

D-048 makes a policy pack a governed collection of effective-dated coverage cells,
not a static document checklist. A cell selects requirements using policy date,
registration jurisdiction, operating states, vehicle class/use, GVW/axles/seating/
fuel/emission facts, permit/route scope, intrastate/interstate/national operation,
cargo including hazardous status, powered/trailer/combination role, driver classes/
endorsements and relevant ownership/lease context. Tenant extensions may add only
stricter process requirements. Missing selection facts produce `not_evaluated` or
`not_determined`, never an inferred exemption or compliant result.

Every policy dimension and required assertion references a D-051 concept ID and
the compatible reference publication, not a provider/display string. A source
value mapped only as broader, related or ambiguous cannot satisfy a requirement
for a precise vehicle class, permit scope, licence class or endorsement. The
coverage cell must state the minimum mapping precision it accepts.

Software catalogue capability, legal review, ULIP-verifiable fields and marketed
coverage are separate. Each cell has one of D-008's coverage states and records:

- legal source/version/section, effective dates and applicability expression;
- credential type and atomic required assertions;
- issuer, subject scope and accepted evidence/verification methods;
- minimum assurance and subject-binding strength per assertion;
- allowed sources/fields, maximum observation age and D-045 validity semantics;
- whether an artifact is additionally required and whether partial evidence helps;
- revocation/suspension/conflict/missing/provider-unavailable behavior;
- expiry thresholds, exception control, scenarios and named legal/compliance/
  product/technical owners.

The first pilot markets only reviewed ordinary commercial-goods-vehicle cells for
the design partner's actual registration states, operating states, routes, permit/
authorization model and cargo. Treat non-hazardous operation as the default pilot
boundary. Passenger, school, tourist, hazardous/tanker, specialized-equipment and
other uncovered operations remain `pending_review` or `unsupported` unless the
customer confirms the need and the complete cell passes governance. There is no
launch-wide pan-India compliance claim.

### 6.7 Assertion verification and assurance

Verification evaluates assertions rather than awarding one boolean to a document.
Every result independently records:

| Dimension | Required conclusion |
| --- | --- |
| Authenticity | The credential/observation came through an accepted source/method |
| Subject binding | It belongs to the exact intended vehicle, driver, organization or combination |
| Status | Current, suspended, cancelled, revoked, surrendered or unknown |
| Validity | Its effective interval covers the D-045 evaluation instant/legal day |
| Coverage | Every assertion required by this policy cell is present or explicitly missing |
| Freshness | The observation is inside the source/risk-specific maximum age |
| Consistency | Conflicts with other sources are absent or explicitly unresolved |

Use these assurance classes without assuming that a higher class covers a missing
field:

1. `authoritative_current`: sufficiently fresh validated structured observation
   from an approved government/ULIP source;
2. `issuer_verified`: issuer-originated electronic record whose signature, QR,
   issuer URI/service or equivalent approved mechanism was validated;
3. `reviewed_original_evidence`: adequate original-quality artifact, subject-
   matched by an authorized reviewer, without direct issuer confirmation;
4. `reviewed_secondary_evidence`: screenshot/copy/secondary scan useful to a case
   but with lower assurance;
5. `controlled_attestation`: accountable assertion only where policy allows it;
6. `unverified_claim`: import/manual metadata awaiting evidence.

DigiLocker/mParivahan issuer records can qualify under the approved official
electronic-record process; a screenshot does not become issuer-verified merely by
showing that interface. An accepted clean upload proves neither authenticity nor
current legal status. `VAHAN/04` is the preferred provider for the exact RC,
status, insurance, fitness, tax, permit and PUC assertions its approved contract
actually supplies; `SARATHI/02` is the default driver path and `SARATHI/01` remains
D-011 restricted. FASTag/eChallan sources verify only their own facts. An upload
may cover a missing field but never silently defeat an authoritative revocation.

Each requirement declares its required assertions, minimum assurance/binding,
accepted sources, freshness, validity semantics, artifact requirement, partial-
evidence handling, conflict behavior and exception class. Provider unavailability
or stale/masked/partial data follows those rules and cannot become a known legal
failure without evidence. Keep UI and APIs distinct for `uploaded`, `evidence
accepted`, `issuer/provider verified`, `currently valid` and `requirement
satisfied`.

Renewal creates a new credential/version and effective period; it never overwrites
the prior record. A pending renewal may coexist with the current credential and
becomes current only after its configured checks. A new authoritative suspension/
cancellation creates an urgent discrepancy even when an upload appears valid.
Conflict resolution preserves every source, chosen interpretation, authority,
reviewer, reason and affected evaluation; it cannot edit the observation.

## 7. Compliance engine

### 7.1 Policy model

Policies are versioned data and tested code, not scattered UI conditionals.
Policy composition has four explicit layers:

1. central statutory baseline;
2. jurisdiction/state policy;
3. vehicle/use/operation policy; and
4. visibly labeled organization-specific extension.

Selection dimensions include:

- jurisdiction and operating states;
- asset subtype, class, GVW, axle configuration and fuel;
- goods/passenger/private classification;
- permit/route type;
- hazardous or specialized cargo;
- driver assignment and vehicle class;
- organization-specific stricter requirements;
- effective date and policy version.

Each selection value is a D-051 concept/version. Policy compilation fails on an
unknown, retired or incompatible reference publication, and evaluation records
both the source mapping and concept versions used so a later mapping correction
can be impact-assessed and restated without rewriting the original result.

Tenant policies may add stricter requirements or earlier warning thresholds.
How operational exceptions interact with the statutory baseline is governed
separately and never changes the recorded underlying requirement assessment.

A regulatory-source registry records issuing authority, jurisdiction, official
title/reference/URL, publication and effective dates, relevant section/rule,
last-reviewed date, source checksum/archive reference where permitted,
interpretation notes, reviewer/approval history and supersession. Statutory claims
cannot be published from an unreferenced webpage or unsupported interpretation.

Policy lifecycle:

```text
draft → compliance_review → legal_review → technical_validation → approved
      → scheduled → active → superseded / withdrawn
draft / review → rejected
```

- Published policy versions are immutable; correction or rollback creates a new
  controlled superseding version and preserves the former version.
- Approval and time-based activation are separate operations. Future-effective
  policy may be scheduled but never affects an earlier evaluation.
- Statutory publication requires distinct legal/compliance and technical approval;
  at least two people participate, and publishing uses step-up MFA.
- Tenants configure only constrained declarative extensions and cannot supply
  executable policy code, label their rule statutory, or weaken central results.
- Policy validation rejects unknown operators, circular dependencies, ambiguous
  overlapping versions, impossible dates, missing statutory sources, absent reason
  codes/tests and weakening tenant rules.
- Conflicting central/state interpretations are quarantined for human legal
  resolution rather than resolved by generic precedence.

Before activation, schema/contract tests, boundary and combinatorial scenarios,
sanitized-fixture evaluation and shadow comparison against the active version must
pass. An impact report identifies posture changes, new failures/indeterminate
results, affected jurisdictions/organizations, newly non-overrideable rules and
expected case/notification volume. Material changes are communicated before
activation where timing permits; the application never invents a legal grace period.

Activation re-evaluates current subjects prospectively from the policy's effective
time. Historical results remain unchanged. Historical simulation is labeled as
simulation, and retroactive legal effect is encoded only after explicit legal
approval. Mass re-evaluation is queued, tenant-fair, resumable and idempotent.

Maintain a coverage matrix by jurisdiction, asset/use type and requirement
category with states `reviewed_supported`, `partially_supported`, `pending_review`
or `unsupported`. Only reviewed cells are marketed as supported. Incomplete or
unsupported context produces `not_determined`, never a generic `clear` fallback.
Pilot coverage is limited to design-partner operating states/use cases.

Initial regulatory monitoring is a monthly review of relevant central/state
official sources, immediate assessment of identified material notifications, and
a documented quarterly coverage review. Each source has `review_due_at` and an
accountable owner; overdue review creates an internal governance task. Automated
change detection may assist but never publishes legal interpretation automatically.

### 7.2 Evaluation output

Compliance evaluation has three layers.

**Requirement assessment** evaluates one applicable requirement as:

- `satisfied`;
- `not_satisfied`;
- `missing_information`;
- `conflicting_information`;
- `stale`;
- `pending_verification`;
- `provider_unavailable`;
- `not_applicable`; or
- `not_evaluated`.

**Subject posture** aggregates requirements for one declared scope:

- `clear`: all evaluated applicable requirements are currently satisfied;
- `attention_required`: currently satisfied under the evaluated baseline, but a
  warning, approaching expiry, discrepancy or non-critical requirement needs action;
- `known_failure`: an applicable mandatory requirement is known to be unsatisfied;
- `indeterminate`: critical information is insufficiently fresh, complete or consistent.

MVP subject scopes are vehicle, trailer, driver, vehicle combination and document/
credential posture. Every displayed posture includes its scope and `as_of` time.

**Contextual operational decision** evaluates a proposed duty/assignment using the
available driver, powered vehicle, combination, time, operating state, vehicle/use
class, cargo category, permit/route category and tenant requirements:

- `allowed`;
- `allowed_with_exception`;
- `blocked`; or
- `not_determined`.

The UI may label these as Eligible, Caution, Blocked and Not determined, but the
internal values and explanations remain explicit. Full trip-level legality is not
an MVP claim because dispatch, route planning and cargo manifests are out of scope.

Aggregation precedence is:

1. applicable mandatory known failure produces `known_failure` and normally `blocked`;
2. critical missing, stale, conflicting, pending or unavailable input produces
   `indeterminate`/`not_determined`;
3. satisfied requirements with warnings produce `attention_required`;
4. all applicable evaluated requirements satisfied produces `clear`/`allowed`.

Approaching expiry remains currently satisfied while raising attention. Provider
unavailability is not non-compliance. `not_applicable` records a policy reason, and
absent operational context is `not_evaluated` rather than silently assumed.

Every immutable evaluation records its type/scope, subjects, requested context,
`as_of` time, policy/requirement and engine versions, observation/document input
IDs, freshness thresholds, per-requirement reason codes, aggregation reasons,
underlying posture, operational decision and exception references.

When D-050 identifies an input as entered in error, retain this evaluation as what
the system actually produced, mark/link its invalidation and generate a separately
identified restated evaluation. Current posture uses corrected authoritative state;
historical UI/reporting must state whether it is `as_known_at` or restated and may
not imply the original operational decision was retroactively changed.

### 7.3 Operational exceptions and acknowledgements

Every policy requirement declares one exception control:

- `non_overrideable`: a known failure cannot be bypassed by the product;
- `controlled_exception`: policy permits a scoped operational exception;
- `acknowledgement_only`: a user may acknowledge the warning without changing a decision;
- `informational`: the result is displayed but has no decision effect.

The classification belongs to the approved central policy version. A tenant may
make it stricter but cannot make a centrally non-overrideable requirement
overrideable. Legal/compliance owners approve the classification by jurisdiction.

Conservative MVP candidates for `non_overrideable`, subject to that legal review,
include authoritatively invalid/suspended registration or driving licence, expired
required driver authority or vehicle class mismatch, missing hazardous endorsement
for a declared hazardous operation, expired mandatory insurance/fitness/permit,
confirmed prohibitory status, organization safety suspension, and hard vehicle-
combination incompatibility.

Potential `controlled_exception` cases include bounded provider outage with recent
last-known evidence, stale observations within an approved tolerance, masked or
non-critical conflicting information, evidence awaiting review, and tenant-only
process/training requirements. Approaching expiry and other warnings normally use
acknowledgement rather than exception.

Exception lifecycle:

```text
draft → submitted → under_review → approved → active → expired
                          ↘ rejected
approved / active → revoked
approved → superseded
```

- Scope each exception to one organization, subject, requirement, operational
  context and bounded time window. MVP has no blanket fleet/organization exception.
- Require justification, evidence, risk class, compensating controls, requester,
  proposed dates and approval-policy version.
- The requester never approves their own exception. Approval uses step-up MFA.
- A low-risk tenant-only exception needs one independent authorized approver;
  medium risk needs an independent compliance manager; high risk, where the policy
  permits any exception, needs two independent approvers including a compliance
  manager and owner/administrator.
- Non-overrideable requirements expose remediation, not an exception action.
- Re-evaluate current facts before activation. Material new authoritative evidence
  may suspend or revoke the exception automatically.
- Expire automatically, re-evaluate, notify owners and require a new decision for renewal.
- A retroactive record may document what occurred but cannot retroactively claim compliance.
- Thaarei support/break-glass access cannot approve a tenant operational exception.
- Preserve the underlying assessment, original finding, decisions and complete approval history.
- An active exception produces only `allowed_with_exception`, never `clear` or ordinary `allowed`.

### 7.4 Temporal and legal-calendar contract

D-045 forbids one generic “date/time” representation. Use these three domain types:

- **LegalDate** is a strict proleptic-Gregorian `YYYY-MM-DD` value with no time or
  offset, represented by a branded string/`Temporal.PlainDate` and PostgreSQL
  `date`. It covers document validity, birth and statutory policy dates.
- **Instant** is an exact point on the UTC timeline, stored as `timestamptz` and
  serialized as an RFC 3339 UTC string ending in `Z`. It covers observations,
  receipt, evaluation, commands, events, audit and job execution.
- **CivilSchedule** combines a local wall-clock time, validated full IANA timezone,
  recurrence and effective version. It covers quiet hours, digests and scheduled
  reports; neither a bare `timestamp without time zone`, PostgreSQL `timetz`, zone
  abbreviation nor fixed offset is a durable schedule.

Each requirement declares `valid_from_date`/`valid_through_date` semantics, legal
calendar zone and whether its end is inclusive. The India baseline uses
`Asia/Kolkata` and an inclusive valid-through date unless credential-specific
legal review approves otherwise. Interpret that as `[start(valid_from),
start(valid_through + 1 calendar day))`; never synthesize `23:59:59.999` or count
calendar warnings as multiples of 24 elapsed hours. A missing, impossible or
ambiguous source date remains explicit missing/conflicting information rather than
being inferred. The legal zone comes from the effective jurisdiction policy;
organization and user zones control operations/presentation only.

An organization has one versioned operational IANA zone, default `Asia/Kolkata`;
a user may select a validated presentation/delivery IANA zone. Reject abbreviations
such as `IST` and offsets such as `+05:30`. A zone change is effective prospectively,
audited and reschedules future civil work; it never changes stored legal dates,
resolved historical instants or prior evidence. Every immutable evaluation/report/
notification episode records the legal date/zone, resolved boundary instant,
`as_of`, temporal-ruleset/release version and relevant policy version so later
tzdata changes cannot silently rewrite history.

One shared temporal-domain package is the only place that parses, converts or
performs calendar arithmetic. Under D-044's Node 24 baseline it imports exact
`@js-temporal/polyfill` 0.5.1; business logic does not construct/parse JavaScript
`Date` or localized strings. Critical computation remains server-side and the
browser only formats server-decided values. Move from the polyfill to Node 26's
native Temporal as one reviewed change after differential conformance, database-
boundary, browser and historical-fixture tests—not through runtime feature
detection that creates two production semantics.

Database/session/host timezone remains UTC. A command obtains one PostgreSQL
`transaction_timestamp()` and passes that `as_of` through business state,
evaluation, audit, outbox and idempotency result, giving the transaction one
coherent clock. Application wall time does not decide durable business transitions.
Name distinct meanings explicitly—such as `observed_at`, `received_at`,
`evaluated_at`, `recorded_at`, `effective_date` and `valid_through_date`—and inject
a deterministic clock in tests. On startup and after any tzdata/runtime update,
compare JavaScript and PostgreSQL boundary instants for every approved legal/
operational zone across the supported horizon; scheduler readiness fails on a
mismatch. Apply tzdata patches through D-025/D-044, recompute only future schedules
and preserve already recorded boundary evidence.

Primary references are PostgreSQL's [date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html)
and [transaction-time functions](https://www.postgresql.org/docs/current/functions-datetime.html),
TC39's [Temporal model](https://tc39.es/proposal-temporal/docs/) and
[PlainDate contract](https://tc39.es/proposal-temporal/docs/plaindate.html), and
the exact [Temporal polyfill manifest](https://raw.githubusercontent.com/js-temporal/temporal-polyfill/main/package.json).

### 7.5 Product claims, verification language and responsibility

D-069 makes terminology a governed output of the compliance system, not copy that a
UI, report, sales or support author may improvise. Use this initial machine/display
contract:

| Controlled term | Exact permitted meaning |
| --- | --- |
| `source_observed` | The named field/value was returned by the named source at the recorded observation time; it says nothing beyond that field |
| `issuer_verified` | The exact approved issuer signature, QR, URI/service or equivalent mechanism was successfully validated for the stated assertion |
| `evidence_reviewed` | The identified authorized human reviewed the specified evidence generation using the recorded method; it is not issuer confirmation |
| `requirement_satisfied` | One applicable approved policy requirement evaluated as satisfied for the stated context, evidence and `as_of` time |
| `clear` | Every applicable evaluated requirement in the displayed subject scope is currently satisfied; unsupported/unevaluated context cannot be hidden |
| `allowed` | The exact declared operational context passed the applicable evaluated rules at that time; it is not trip-wide or universal legality |
| `not_determined` | Material evidence, applicability, context, consistency, freshness or supported coverage is insufficient for the proposed conclusion |

“Verified” must always resolve to the assertion, source or method, assurance class,
subject binding and observation/review time. “Compliant” may appear only as a plain-
language rendering of a specific requirement/posture with its D-048 policy cell and
limitations—not as a free-standing vehicle, driver, fleet or organization attribute.
Do not use unqualified “government verified,” “Thaarei certified,” “legally
certified,” “fully/100%/pan-India compliant,” “guaranteed lawful,” “fraud-free” or
“real-time.” Use “real-time” only where the exact provider/SLO/freshness contract
supports that claim; a successful ULIP call, cache refresh or current timestamp does
not prove it. Never imply ULIP, MoRTH, NICDC/NLDSL or another authority sponsors,
approves or endorses Thaarei absent written permission for the exact words/logo/use.

Version 2 may generate `compliance_status_report`, `verification_evidence_report`,
`requirement_assessment`, `operational_readiness_summary` and a D-058 evidence
package. It does not generate a “Compliance Certificate,” “Fitness Certificate,”
“Vehicle Clearance Certificate,” “Government Verification Certificate” or “Legal
Approval Certificate,” use an official-looking mark/seal, or replace a statutory
original. A certificate/mark becomes possible only through a separately integrated
authorized issuer and lawful issuance/conformity process; a PDF signature or Thaarei
hash alone cannot create that authority.

Every material badge, subject summary, operational decision, report/export and
notification links or embeds the evaluated subject/scope/context; `as_of`; source
and observation/freshness; policy/requirement/reference/mapping versions; applicable,
satisfied, failed and indeterminate counts; unsupported/unevaluated context; active
exception/acknowledgement; provider/staleness limitation; and reason/remediation.
The primary view must not use color or a high aggregate percentage to conceal an
excluded requirement, unreviewed state, missing route/cargo/use fact, stale source
or `not_determined`. D-060 publishes the exact adjacent language and D-023 includes
it in exports; a web-only footer is insufficient.

The shared-responsibility matrix is:

| Party | Responsibility boundary |
| --- | --- |
| Thaarei | Operate the represented platform; consistently execute approved/versioned rules; preserve provenance; keep supported coverage/current limitations truthful; protect and reconcile data; surface uncertainty/provider outage; correct platform, mapping, policy-publication and presentation errors |
| Customer organization | Supply accurate lawful operational context and authority; retain statutory originals where required; review conflicts/unknowns/alerts; state actual route, cargo, use and assignment; take remediation; make the final deployment/dispatch/operating/legal decision and not misrepresent a Thaarei report as government certification |
| Provider/issuer | Remain authoritative only for the fields, time and mechanism it actually supplies; provider origin neither verifies omitted assertions nor endorses Thaarei's policy/result |
| Customer reviewer/approver | Make only the exact evidence acceptance, fact confirmation, operational decision or permitted exception statement bound to their current authority; never upgrade the source/assurance class |

This does not let Thaarei disclaim its own represented behavior. “Decision support”
does not excuse applying the wrong rule, corrupting received data, omitting a known
limitation, misrepresenting freshness, breaking promised tenant/security controls or
missing an explicit service commitment. Conversely, a clear posture cannot decide an
undeclared trip, route, cargo, roadside event or legal fact outside the approved
cell. D-005's subject posture and contextual decision remain separate.

A customer reviewer statement records exact wording/version, actor UUID,
organization/scope, current permission and assurance, evidence/observation inputs,
policy version, purpose, server time and resulting action. UI verbs say “reviewed,”
“accepted for this purpose,” “confirmed against this evidence,” “organization
approved” or “exception approved” as applicable. Neither role nor signature changes
a screenshot to issuer-verified, stale input to current, tenant attestation to
government fact, unsupported context to supported or exception to `clear`.

Maintain `claim_definitions`, `claim_term_versions`,
`claim_evidence_requirements`, `claim_publications`, `claim_coverage_bindings`,
`responsibility_matrix_versions`, `report_disclosure_versions`, `claim_reviews`,
`claim_incidents` and `claim_reconciliation_runs`. Each publication records exact
wording/language, audience/channel, product/capability, jurisdiction/use cell,
required evidence/dataset/coverage, freshness/availability/SLO assumptions,
adjacent qualification, customer responsibility, owner/independent approver,
effective/expiry dates and revalidation triggers. UI/API/report/email/support/sales/
marketing copy uses stable claim keys and approved publication versions; a tenant
label override or feature flag cannot redefine a controlled term.

Marketing, proposal and plan descriptions bind to the D-048 supported-coverage
matrix, activated/approved datasets and actual measured D-021 service evidence. Do
not advertise every portal-listed ULIP API, a planned feature, sandbox result or
successful one-off call as available. Synthetic demonstrations are visibly synthetic
and make no production accuracy/provider-availability representation. Customer logo,
case study, quantified result and testimonial require exact scoped written permission,
source evidence, validity period and no implied regulator/provider endorsement.
Sales/support personnel use versioned capability/limitation sheets; email or a custom
proposal cannot promise an unsupported state, dataset, bespoke policy, SLA,
residency, certification or legal result.

Disclosures are specific, prominent/adjacent, plain-language, accessible, D-060-
localized and included in downloadable evidence. Do not rely on “subject to terms,”
“use at your own risk” or a general footer to cure an otherwise false green state or
claim. Legal approval of wording is evidence, not proof that the software rendered
the correct version; bind claim fingerprints to D-043 release and template manifests.

If a claim or presentation is found overstated or wrong, stop its new publication/
generation, create a `claim_incident`, preserve the exact original, identify affected
channels/outputs/organizations, correct the claim/configuration and determine whether
D-050 re-evaluation/restatement is required. Notify affected customers proportionate
to reliance/risk, issue a visibly linked corrected/restated output, update product,
sales, support, contract and training artifacts and reconcile cached/generated/
scheduled copies. Never silently replace an issued historical report or merely add a
later disclaimer.

The customer agreement describes compliance monitoring and decision support within
documented coverage, not legal representation, statutory certification or guaranteed
lawfulness. Indian counsel approves the exact responsibility, limitation, warranty
and remedy language without waiving Thaarei's explicit platform/security/correctness
commitments. Public-claim review should account for the official
[Consumer Protection Act, 2019](https://consumeraffairs.nic.in/sites/default/files/CP%20Act%202019.pdf)
and [CCPA misleading-advertisement guidance](https://consumeraffairs.nic.in/latestnews/guidelines-prevention-misleading-advertisements-and-endorsements-misleading).
Certification terminology is reserved consistently with formal conformity/licence
processes described by the [Bureau of Indian Standards](https://www.bis.gov.in/product-certification/product-certification-overivews/?lang=en).
Counsel must determine the exact application to Thaarei's B2B offers; these sources
support conservative claim design, not an unsupported legal conclusion.

## 8. ULIP integration architecture

### 8.1 Validated account position

Live production validation on 4 September 2026 established:

- Active: `VAHAN/01`, `SARATHI/01`, `FASTAG/01`, `ECHALLAN/01`, `TOLL/01`.
- Not currently approved: `VAHAN/04`, `FASTAG/02`, `SARATHI/02` returned HTTP 403.
- Existing allowlisting does not cover the planned production boundary. The fixed
  outbound IPs of the primary production and recovery hosts require independent
  ULIP approval and live connectivity evidence before use.
- ULIP JWTs observed in production do not declare an `exp` claim.
- No rate-limit, quota, or `Retry-After` headers were observed.
- Public integration documents do not publish account-specific rate or concurrency limits.

### 8.2 Dataset recommendation

| Dataset | Version 2 role | Decision |
| --- | --- | --- |
| `VAHAN/04` | Registration-number vehicle verification using JSON | Activate before pilot; primary endpoint |
| `VAHAN/01` | Existing XML-in-JSON vehicle verification | Temporary controlled fallback only; disable after `/04` stability period |
| `VAHAN/05` | Chassis-number JSON lookup | Defer until a governed exception/fraud use case exists |
| `VAHAN/06` | Engine-number JSON lookup | Defer until a governed exception/fraud use case exists |
| `SARATHI/01` | Detailed licence, transport, hazardous, hill and badge verification using DL+DOB | Retain for purpose-controlled enhanced verification |
| `SARATHI/02` | DL-only name, status, classes and validity check | Activate before pilot; default driver verification |
| `FASTAG/01` | Toll reads from the preceding 72 hours | Retain conditionally as recent-activity evidence only |
| `FASTAG/02` | Tag identifiers, issuer, class, status and issue date | Activate before pilot; primary FASTag verification |
| `ECHALLAN/01` | Pending/disposed challan lookup | Retain; rebuild parser against official contract |
| `TOLL/01` | Plaza/rate lookup | Retain feature-flagged as a non-compliance utility; exactly one search parameter |

FASTAG/01 and FASTAG/02 do not provide wallet balance or tag expiry. A recent
transaction may be recorded as “observed working at” but must not be presented
as a guaranteed current active state. Absence of a transaction means “no recent
transaction returned,” not “vehicle has no FASTag.”

Do not automatically call both SARATHI datasets for every driver or both VAHAN
datasets for every vehicle. `VAHAN/01` fallback is never triggered by business
not-found, validation or authorization errors and is enabled only for a documented
provider incident when contract/quota policy permits. `TOLL/01` does not calculate
a route and cannot affect vehicle/driver compliance.

Dataset entitlement lifecycle is:

```text
requested → approved → enabled → degraded → suspended → retired
```

Each environment-specific entitlement records dataset/document version, approval
evidence/date, permitted purposes, quota/concurrency and retention/cache terms,
normalizer version, last contract check, enabled features and operational owner.
An HTTP 200 response alone does not make a dataset product-ready.

### 8.3 Provider boundary

ULIP is implemented behind a provider port in `packages/core` and an adapter in
`packages/adapters`. No domain use case constructs ULIP URLs or reads its raw
envelope directly.

The adapter owns:

- credential-based login and bearer-token lifecycle;
- a single shared token manager across worker replicas;
- dataset entitlement registry;
- per-dataset request schema and identifier normalization;
- transport, envelope and provider-business error classification;
- response validation and versioned normalization;
- D-051 reference-value lookup that preserves raw provider code/label, dataset and
  schema context and records the exact concept/mapping publication used;
- field masking metadata;
- retryability decisions;
- safe telemetry and response provenance.

ULIP access tokens are opaque runtime secrets, not application records. Keep only
the current encrypted token, its generation and safe timing metadata in the
dedicated D-040 `valkey-coordination` instance. Never persist a token in PostgreSQL,
RDB/AOF or backup, return it to a
client or include it in telemetry. The official integration documents describe
the session as generally expiring after about 30 minutes of inactivity, while the
observed token did not expose a usable `exp` claim. Therefore, authenticate before
the next provider request after 25 minutes without a successful ULIP call, using a
distributed single-flight lock. The first 401 invalidates that token generation
and permits exactly one re-authentication and request retry. A repeated 401 opens
the authentication circuit and alerts operations. These timings remain
configuration until account-specific behaviour is confirmed in writing.

### 8.4 Request workflow

1. Domain use case requests a verification with purpose and required freshness.
2. The API writes verification intent and a job in one PostgreSQL transaction.
3. The worker deduplicates equivalent in-flight requests.
4. A configurable tenant-aware/global limiter reserves ULIP capacity.
5. The token manager obtains or refreshes one token using single-flight locking.
6. The adapter calls the approved dataset.
7. The adapter validates the outer envelope and provider-specific business result.
8. The adapter independently extracts the returned subject identifiers and compares
   them under D-047 with those on the intent; missing or mismatched binding becomes
   a classified observation/discrepancy and is never reassigned to a searched entity.
9. A versioned normalizer writes immutable observations, binding outcome, D-051
   raw/reference mappings and safe request metadata against the originally
   requested subject UUID. Unknown values isolate only their dependent assertions;
   a compliance-material unknown is `not_determined` and queued for review.
10. D-052 evaluates provider contract, field presence/reference mapping, subject
    binding, timeliness and distribution rules and creates separately owned quality
    findings without converting them into statutory outcomes.
11. The compliance engine evaluates affected subjects.
12. An outbox event updates cases, search, notifications, and usage accounting.

The persisted job lifecycle is:

```text
queued → waiting_for_quota → running →
  succeeded | not_found | retry_scheduled | dead_letter | cancelled
```

The UI exposes the last successful observation, freshness, queue status and
estimated completion. A provider failure must not make a synchronous page request
hang or erase the last successful observation.

### 8.5 Quotas and concurrency

Until written values are obtained from ULIP, all thresholds remain deployment
configuration, not source constants. Required settings include:

- account-wide steady requests/second;
- burst capacity;
- maximum concurrent calls;
- per-dataset quotas;
- daily/monthly allowance;
- authentication-call limits;
- request timeout and provider SLA;
- production versus staging values;
- commercial cost per call or bundle.

Before the pilot, obtain written confirmation of account-wide and dataset-specific
quotas, bursts, concurrency, whether failed/authentication calls consume quota,
429/retry behaviour, token lifetime, permitted caching/retention and polling,
support escalation and production/staging separation. Do not infer provider limits
from missing headers or discover them by load-testing production ULIP.

Pending those terms, use the following conservative, explicitly self-imposed safe
mode: one account-wide request/second, burst two, at most two ULIP calls in flight,
and one authentication request in flight. After written limits are known, begin at
no more than 50% of the applicable provider limit and raise the setting only from
production evidence.

The distributed limiter uses an account-wide bucket, per-dataset buckets,
per-organization fair-share buckets and per-subject refresh cooldowns. Schedule
work by weighted fair queuing with a minimum share, borrowable unused capacity and
anti-starvation aging. Priority order is dispatch-critical/manual and imminent
expiry, normal scheduled compliance, onboarding imports, then backfills and
non-critical analytics. A subscription may affect throughput/SLA but cannot starve
another organization's safety-critical work.

Capacity planning must calculate, by dataset and period:

```text
required average RPS =
  sum(active subjects × calls per refresh cycle / refresh-cycle seconds)
  × peak/backlog factor
```

Quota headroom must cover onboarding bursts, retries and recovery backlog before
each major onboarding wave; otherwise the promised freshness/SLA must be reduced
or additional ULIP capacity obtained.

Loss/restart of `valkey-coordination` immediately pauses new ULIP calls and
invalidates the prior token generation. Rebuild daily/monthly consumption from the
PostgreSQL provider-usage ledger, start short-window token buckets empty rather than
full, elect exactly one worker to authenticate, load and self-test the approved
atomic scripts, then ramp from D-010's conservative limit. Never assume absent
ephemeral counters mean unused provider quota.

### 8.6 Retry and failure policy

- Allow at most three attempts total: the original and two retries.
- Retry connection resets, timeouts, HTTP 429 and selected 5xx responses only.
- Use capped exponential backoff with full jitter and honor `Retry-After` when supplied.
- Charge every retry to quota and keep retry traffic below 10% of original traffic.
- Do not retry validation errors, unauthorized datasets, or business “not found” results.
- Refresh authentication once after a 401; do not loop authentication attempts.
- Open a dataset-specific circuit after five consecutive transient failures or
  more than 50% failures in the latest 20 calls. Start open for 60 seconds, permit
  one half-open probe and exponentially extend the interval to at most 15 minutes.
- Keep retry and circuit thresholds configurable and validate them through fault tests.
- Quarantine structurally schema-incompatible responses. A structurally valid
  response with an unknown reference value may preserve and normalize independent
  fields, but is never reported as wholly verified; D-051 isolates the affected
  assertion and governs mapping review.
- Preserve the last known observation with a conspicuous stale indicator.
- Never convert provider unavailability into a document failure or compliance expiry.
- Dead-letter exhausted jobs and create an operational alert with safe metadata.
- Measure per dataset/schema the safe field-presence, unknown-reference, binding,
  not-found/error and observation-delay distributions. D-052 alerts on reviewed
  material change without logging values or automatically accepting a new schema.

### 8.7 Caching and freshness

Cache decisions are purpose-specific and bounded by ULIP contractual terms:

- PostgreSQL immutable observations and provider-usage ledger are the source of
  record. D-040 separates non-evictable fail-closed locks, quota/fairness counters,
  circuits, short effect receipts and encrypted ephemeral token state in
  `valkey-coordination` from evictable reconstructable acceleration in
  `valkey-cache`; neither instance persists or receives a backup.
- Request-deduplication cache: minutes, keyed by organization, provider, dataset,
  normalized hashed identifier, purpose, adapter/contract version and freshness window.
- Business not-found suppression: 15 minutes by default.
- Transient-provider-error suppression: 30–60 seconds by default.
- Manual refresh cooldown: 15 minutes per subject unless an authorized user records
  a force-refresh reason and quota is available.
- Current observation reuse: based on purpose, policy and expiry risk.
- Approaching-expiry records refresh more frequently than long-valid records.
- User-requested refresh bypasses freshness only when quota and permissions allow.
- Tenant data is never reused through a shared cache key. Non-personal TOLL reference
  data may use a global cache only when ULIP's contract permits it.
- Every key has an explicit TTL no longer than the governing purpose/contract and
  never above 24 hours. Keys are at most 256 bytes, values 64 KiB by default, and
  contain only opaque UUID/HMAC-derived components—never raw vehicle/licence/contact
  identifiers, names or restricted plaintext.
- Driver responses and observations are not reused across organizations merely
  because a licence identifier matches. Any future cross-tenant reuse requires
  explicit ULIP-contract and privacy approval.

Initial product freshness targets are:

| Dataset | Default target, subject to written ULIP limits |
| --- | --- |
| `VAHAN/04` | Onboarding; every 7 days for active vehicles; every 24 hours within 30 days of a monitored expiry; after a declared renewal |
| `SARATHI/02` | Onboarding; every 7 days for active drivers; every 24 hours near licence expiry; before duty assignment when older than 7 days |
| `SARATHI/01` | Purpose-driven enhanced lookup only; no blanket polling |
| `FASTAG/02` | Onboarding and every 7 days; optionally daily where an organization policy requires current tag status |
| `FASTAG/01` | Every 24 hours only for subscriptions requiring continuous toll-activity history; otherwise on demand and labelled “recent 72 hours only” |
| `ECHALLAN/01` | Daily for active vehicles; degrade explicitly to weekly if contractual quota cannot support daily polling |
| `TOLL/01` | Query-driven non-compliance reference lookup, cache target 24 hours |

FASTAG/01 must run at least once inside its 72-hour source window when the product
claims continuous transaction history. Otherwise the UI and export must state that
results are a recent snapshot, not complete history.

Each source record stores `last_attempt_at`, `last_success_at`,
`source_observed_at`, `next_due_at`, `decision_fresh_until` and
`legal_valid_until`. Source freshness is `fresh`, `aging`, `stale` or
`not_current_enough_for_decision`; it is independent of legal validity. Once the
decision-freshness window expires, provider unavailability produces
`not_determined`, not a fabricated statutory failure. No ULIP webhook/event
mechanism is documented for these datasets, so polling and explicit refresh are
the baseline.

### 8.8 ULIP security and auditability

- Keep credentials and tokens only in the runtime secret store/environment.
- Never expose tenant-editable ULIP credentials.
- Never log authentication bodies, bearer tokens, full raw responses, DOBs, addresses, or identity numbers.
- Log dataset, hashed/partially masked subject key, correlation ID, status class, latency, normalization version, and field count.
- Encrypt permitted raw responses with envelope encryption and retain them only for the contractually permitted diagnostic period.
- Store normalized observations separately from current projections.
- Retain the exact provider/dataset/schema, raw reference code/label and D-051
  mapping publication on every mapped observation; a source-label change never
  silently rewrites prior meaning.
- Audit every user-triggered lookup and every sensitive-field read.
- Confirm redistribution, caching, retention, erasure and downstream-consent terms against Thaarei's ULIP agreement before GA.

## 9. Multi-tenant data architecture

### 9.1 Database

Use D-039's version-pinned PostgreSQL 18 container in the independently deployed
`platform-data` Compose project as the system of record with Drizzle migrations.
Start at 18.6 and follow the latest compatibility-tested 18.x minor; PostgreSQL 19
beta is not a production candidate. Pin the image by digest, keep its data/WAL and
pgBackRest paths on separately inventoried encrypted volumes, and never couple its
lifecycle to `platform-app`. Initialize once with UTF-8, PostgreSQL's built-in
deterministic `C.UTF-8`, UTC and data-page checksums, then verify those invariants
on every startup/restore.

- Use native `uuid` identifiers serialized as canonical UUID strings and
  application-generated UUIDv7 for new product records; use `timestamptz` in UTC
  for events and timestamps.
- Use D-045 `date` values for legal validity dates where time-of-day has no meaning;
  never map them through a JavaScript `Date`. Prohibit domain columns of
  `timestamp without time zone` and `time with time zone`; a local schedule stores
  wall time, canonical IANA zone, recurrence and effective version explicitly.
- Every tenant-owned table has a non-null `organization_id`.
- Every uniqueness constraint and lookup index includes `organization_id` where ownership applies.
- Row-level security is mandatory and fail-closed.
- API transactions set organization/user context locally for RLS.
- Background jobs carry organization ID and restore the same RLS context.
- Apply `FORCE ROW LEVEL SECURITY` to tenant tables. Runtime API/worker roles are
  `NOSUPERUSER`, `NOBYPASSRLS` and do not own those tables; migration, backup and
  emergency roles are distinct and inactive during normal requests.
- Platform-control tables are physically/logically separated from tenant-domain tables where practical.
- Never rely on a frontend filter or repository convention for tenant isolation.
- Allow only PostgreSQL-supplied `pg_stat_statements`, `pg_trgm`, `btree_gist` and
  `amcheck` initially. Put extensions in an explicitly owned schema where the
  extension permits it; only the migration/cluster administrator may install or
  update them. Do not add `pgcrypto`, `uuid-ossp`, `citext`, `unaccent`, PostGIS,
  TimescaleDB, pgvector, third-party extensions or default production
  `auto_explain` without a documented requirement, licence/security review and
  upgrade/backup/telemetry tests.
- Separate NOLOGIN schema/table owners from API, worker, report, migration, backup
  and monitor login roles. Remote runtime connections require D-038 mTLS plus
  SCRAM-SHA-256 with supported channel binding, exact `hostssl` network rules and
  certificate-to-role mapping. Prohibit remote superuser, `trust`, MD5 and broad
  HBA records; retain only controlled local peer administration.

### 9.2 Core table groups

**Control plane**

- customer_applications, customer_application_reviews,
  customer_authority_evidence, provisioning_operations and provisioning_effects;
- customer_accounts, customer_tax_registrations, billing_accounts, contracts,
  subscriptions and subscription_organizations;
- organizations, organization_identity_versions, organization_domains,
  organization_settings, organization_suspensions and organization_closure_runs;
- implementation_engagements, implementation_participants,
  implementation_scope_versions, onboarding_checklists, onboarding_waves,
  onboarding_wave_subjects, onboarding_wave_manifests, configuration_acceptances,
  go_live_readiness_snapshots, go_live_approvals, training_assignments,
  training_completions, hypercare_reviews and handover_acceptances;
- Better Auth-owned users, accounts/credentials, sessions, verification artifacts,
  passkeys and TOTP/recovery artifacts;
- application-owned user_security_states, login_email_change_operations,
  identity_lifecycle_operations, identity_operation_effects, actor_tombstones and
  identity_reconciliation_findings; Better Auth identifiers are referenced by
  immutable UUID and its internal tables are never a tenant authorization source;
- application-owned memberships, invitations, permission_catalogue,
  role_template_versions, role_assignments, access_scope_bundles and dimensions,
  membership_episodes, authentication-assurance events and privileged-recovery cases;
- product_packages, plan_versions, price_book_versions and add_on_versions;
- subscriptions, subscription_organization_allocations, entitlement_grants and
  managed_asset_capacity_events;
- seller_legal_entities, seller_tax_registrations, tax_rule_versions,
  e_invoice_applicability_versions and statutory_system_accounts;
- usage_events, usage_snapshots, billing_quotes, quote_line_snapshots,
  receivables, billing_instructions, statutory_documents,
  statutory_document_lines, statutory_document_objects, irp_receipts,
  credit_notes, debit_notes, refunds, withholding_claims, withholding_evidence,
  payments, payment_allocations, settlement_events, financial_close_snapshots,
  finance_cases and finance_reconciliation_runs;
- platform_support_sessions, tenant_approval_cases, ownership_transfer_cases and
  legal_entity_transfer_cases;
- support_cases, support_case_participants, support_case_messages,
  support_case_status_events, support_case_assignments, support_case_links,
  support_case_attachment_links, support_priority_policy_versions,
  support_service_policy_versions, support_sla_clocks, support_escalations,
  support_resolution_codes and support_feedback.
- product_event_definitions, product_metric_definitions,
  product_measurement_purpose_versions, product_measurement_events,
  product_metric_daily_organization_rollups, product_metric_aggregate_publications,
  product_experiment_definitions, product_experiment_cohorts,
  product_experiment_exposures and product_experiment_reviews; MVP cohort records
  describe opt-in design-partner/staged validation rather than live A/B assignment;
- ai_use_cases, extraction_dataset_versions, extraction_dataset_items,
  ground_truth_annotations, extraction_model_artifacts, extraction_model_releases,
  model_evaluation_runs, extraction_schema_versions, extraction_jobs,
  extracted_field_candidates, extraction_reviews, model_drift_findings and
  model_release_incidents; these tables and their workers remain inactive/absent
  from MVP runtime until D-065's later capability gate passes.
- approval_policy_versions, approval_requests, approval_proposal_snapshots,
  approval_requirements, approval_decisions, approval_delegations,
  approval_invalidations and approval_execution_receipts.
- configuration_definitions, configuration_schema_versions,
  configuration_versions, configuration_activations, configuration_generation,
  configuration_evaluation_receipts, feature_flag_definitions,
  feature_flag_versions and feature_flag_rollouts.
- legal_document_definitions, legal_document_publications,
  legal_document_translations, legal_document_object_generations,
  legal_publication_reviews, presentation_events, acceptance_events,
  organization_authority_bindings, contract_execution_evidence,
  reacceptance_requirements and legal_lifecycle_events; privacy notices and consent
  records reuse publication IDs but retain their D-011/D-020 domain lifecycle.
- locale_definitions, supported_product_locales, ui_message_schema_versions,
  ui_catalogue_versions, catalogue_reviews, terminology_glossary_versions,
  font_asset_versions and locale_release_evidence; ordinary catalogue artifacts
  are repository/release owned while these rows govern publication and provenance.
- suppliers, supplier_services, supplier_contract_versions, supplier_data_roles,
  supplier_data_flows, supplier_processing_locations, supplier_subprocessors,
  supplier_evidence_items, supplier_risk_assessments, supplier_change_events,
  supplier_access_grants, supplier_incidents, supplier_reviews, supplier_exit_plans,
  supplier_exit_exercises and supplier_deletion_receipts. Software-component
  inventories/SBOMs remain release evidence and reference the supplier/service
  record where applicable; they are not mislabeled as personal-data processing.
- data_residency_profiles, data_flow_records, transfer_assessments,
  transfer_approvals, remote_access_sessions, customer_residency_commitments,
  government_request_cases, transfer_incidents and
  residency_reconciliation_runs;
- abuse_rule_versions, abuse_signal_events, abuse_decisions, protective_actions,
  abuse_cases, abuse_appeals and action_reconciliation_receipts; link security,
  application, finance, privacy/legal, support and compliance matters without
  collapsing their distinct authorities or exposing cross-tenant evidence.
- data_rights_classes, permitted_use_policy_versions, source_licence_versions,
  content_authority_assertions, provider_use_restrictions, tenant_output_grants,
  data_use_events, aggregate_release_reviews and rights_reconciliation_runs;
  immutable domain/evidence records reference the applicable rights version rather
  than duplicating mutable ownership flags.
- claim_definitions, claim_term_versions, claim_evidence_requirements,
  claim_publications, claim_coverage_bindings, responsibility_matrix_versions,
  report_disclosure_versions, claim_reviews, claim_incidents and
  claim_reconciliation_runs; product surfaces reference published claim keys and
  versions rather than embedding uncontrolled assurance language.

Control-plane access is separately authorized. Linking organizations to the same
customer, contract, billing account or subscription never bypasses organization
RLS or grants access to tenant-domain rows.

**Fleet domain**

- locations, asset_location_history, fleets, asset_fleet_history;
- tags, asset_tags, saved_views and saved_segments;
- assets, vehicle_profiles, trailer_profiles, subject_identifiers,
  identifier_types, identifier_normalizer_versions and identifier_aliases;
- asset_management_episodes, asset_ownership_custody_intervals,
  asset_operational_availability, asset_disposal_milestones,
  asset_lifecycle_operations and closure_watch_authorizations;
- vehicle_combinations and vehicle_combination_participants;
- driver_profiles, driver_engagements, driver_operational_availability,
  driver_credentials and driver_fleet_eligibility;
- asset_custodian_history, duty_assignment_groups, duty_assignments and assignment_events.
- fleet_location_archival_operations, lifecycle_impact_snapshots and
  lifecycle_operation_results.

**Compliance domain**

- reference_schemes, reference_concepts, reference_concept_versions,
  reference_labels, reference_hierarchies and reference_publications;
- provider_reference_values, reference_mappings, reference_mapping_versions,
  reference_mapping_reviews, reference_mapping_impacts and
  unmapped_reference_values;
- credential_types, credential_assertion_definitions, verification_method_versions,
  verification_assurance_classes, credentials, credential_versions and
  credential_subjects;
- evidence_artifacts, evidence_links, evidence_processing_events;
- facts and fact_sources;
- regulatory_sources, regulatory_source_reviews, policy_packs,
  policy_coverage_cells and policy_coverage;
- policy_sets, policy_versions, policy_requirements, policy_approvals and policy_activations;
- source_observations, verification_attempts, verification_results,
  verification_assertion_results and credential_conflict_resolutions;
- compliance_evaluations, compliance_findings;
- cases, tasks, comments, operational_exceptions, acknowledgements and approvals;
- correction_operations, correction_impacts, record_supersessions,
  evaluation_restatements and correction_reconciliation_targets.

**Data-quality domain**

- data_quality_rule_sets, data_quality_rule_versions,
  data_quality_rule_coverage and data_quality_evaluations;
- data_quality_findings, data_quality_finding_events,
  data_stewardship_assignments and data_quality_remediation_actions;
- reconciliation_definitions, reconciliation_runs,
  reconciliation_checkpoints, reconciliation_discrepancies and
  reconciliation_target_receipts;
- data_quality_measurements, data_quality_population_snapshots and
  provider_schema_distribution_snapshots.

Tenant-bearing quality rows carry `organization_id` and RLS. Provider/platform
quality aggregates use a separately authorized control-plane scope and contain no
tenant or restricted values in metric dimensions.

**Privacy domain**

- processing_purposes, processing_basis_records and processing_authorizations;
- privacy_notices, notice_versions, authorization_events and authorization_evidence;
- data_principal_requests, data_principal_request_matters,
  data_principal_identity_verifications, representative_authorities,
  data_principal_nominations, nomination_invocations, privacy_grievances,
  privacy_case_communications, privacy_processor_tasks,
  privacy_response_snapshots, privacy_response_packages,
  privacy_target_receipts, privacy_holds, privacy_hold_reviews and deletion_runs;
- legal_hold_requests, legal_holds, legal_hold_scope_versions,
  legal_hold_record_bindings, legal_hold_object_bindings,
  legal_hold_reviews, legal_hold_reconciliation_runs,
  preservation_sets, preservation_set_items, custody_events,
  evidence_collection_requests and evidence_export_receipts;
- personal_data_correction_requests and correction_processor_receipts;
- approved_retention_profiles, retention_policy_versions, retention_assignments,
  deletion_targets, deletion_attempts and non-PII deletion_tombstones;
- processor_erasure_receipts, restore_replay_runs and sensitive_field_access_events;
- data_classification_versions, restricted_data_envelopes, encryption_key_versions,
  encryption_rotation_runs and ciphertext_reconciliation_results.

**Integration and operations**

- provider_accounts/status, dataset_entitlements, sync_schedules, sync_runs;
- ULIP request metadata, provider_subject_binding outcomes and normalization outcomes;
- fastag_tags, fastag_vehicle_associations, fastag_transactions, challans,
  toll_plazas and toll_rates;
- duplicate_candidates, duplicate_reviews, entity_resolution_operations,
  entity_resolution_effects and canonicalizer_migration_runs;
- commands, idempotency_records, asynchronous_operations, outbox_events,
  consumer_inbox_receipts, side_effect_receipts and dead_letters;
- notification_policies, notification_routes, notification_preferences and
  notification_templates/template_versions, with canonical locale and immutable
  rendered-content/catalogue fingerprints on material artifacts;
- notification_intents, notification_recipient_snapshots,
  notification_deliveries, delivery_attempts, suppressed_destinations,
  email_webhook_receipts, email_reconciliation_runs and email_domain_health;
- import_batches, import_source_objects, import_staged_rows,
  import_validation_issues, import_commit_sets, import_row_results and
  import_activation_waves;
- upload_sessions, storage_objects, storage_object_generations, scan_results,
  cluster_replica_status, recovery_copy_status and storage_reconciliation_runs;
- search_projections, search_token_versions, report_definitions,
  report_definition_versions, saved_view_shares, export_requests,
  export_snapshot_members, export_files and export_manifests;
- audit_events, audit_stream_sequences, audit_export_checkpoints,
  audit_archive_segments, audit_signed_manifests and security_events.
- service_catalogue_entries, sli_measurements, slo_definitions, error_budget_periods,
  incidents, incident_roles, incident_events, communications and action_items;
- dependency_health_events, emergency_control_definitions,
  emergency_control_activations and operational_exercises.
- security_requirements, security_requirement_evidence, threat_models,
  threat_model_reviews, software_components, security_findings,
  security_risk_exceptions, release_security_evidence and artifact_attestations.
- integration_clients, integration_client_credentials, integration_scope_grants,
  machine_access_tokens, customer_webhook_endpoints, webhook_signing_versions,
  customer_webhook_deliveries, api_usage_measurements and api_deprecations.
- database_partition_definitions, partition_maintenance_runs,
  database_capacity_forecasts, database_query_budgets, database_index_inventory
  and database_maintenance_results.

### 9.3 Canonical identifiers and entity resolution

An entity's immutable UUIDv7 is its only identity inside the platform. An external
identifier is a typed assertion or observation about that entity; it is never a
primary key and correcting it never replaces the UUID. The shared identifier model
records organization, subject type/UUID, identifier type, encrypted or exact input,
display-safe representation, canonical lookup form or D-023 token,
`normalizer_version`, issuer, jurisdiction, source/provenance, verification state,
effective interval, first/last seen instants, sensitivity and supersession. Tenant-
asserted and provider-observed identifiers remain distinct until a verification
result relates them.

Use an allowlisted immutable canonicalizer for each identifier type and provider
contract, not a generic punctuation-stripping function:

- vehicle registration accepts only the documented ASCII repertoire, trims outer
  whitespace, uppercases ASCII letters and removes only separators that the
  applicable authority/provider contract explicitly treats as insignificant. Keep
  the exact input and category; support conventional state marks, BH series,
  temporary/trade, diplomatic and legacy cases through reviewed category rules
  rather than one universal regex;
- a driving-licence lookup preserves the exact value and issuing authority and
  removes spaces/hyphens only if the approved SARATHI dataset contract says they
  are insignificant. State/legacy forms remain possible, and no person attribute
  or validity is inferred from number syntax;
- VIN, chassis and engine number are separate identifier types. Do not call every
  chassis number a VIN or impose a 17-character VIN rule on every historic asset;
  these values use D-024 encryption and D-023 exact scoped HMAC search;
- FASTag tag/TID plus issuer identifies a tag when the entitled response provides
  it; a registration-number lookup does not. Customer asset/employee codes are
  mutable organization-local references, not legal identity.

Regulatory identifier entry rejects non-ASCII lookalikes, full-width forms,
invisible/default-ignorable characters and undocumented punctuation with an
actionable correction; it does not transliterate them. Human name/address display
text preserves the submitted Unicode and uses NFC. A UTS #39 confusable skeleton
may create a warning only—it cannot be stored as the canonical identity or prove
equality, because Unicode explicitly says confusability mappings are not identifier
normalization. See [Unicode UTS #39](https://www.unicode.org/reports/tr39/) and
[Unicode UAX #15](https://www.unicode.org/reports/tr15/).

Every verification intent is bound to an intended subject UUID and identifier
record. A provider result must pass envelope/schema validation and an independent
returned-subject comparison before it can verify that subject. A mismatch is a
quarantined discrepancy with adapter, schema and canonicalizer versions; it never
causes a lookup and reassignment to another entity. The raw/normalized observation
retains its original subject and provenance even after later correction, merge or
split.

Duplicate detection is organization-local and field-authorized. A verified exact
statutory match is strong evidence, not permission for an automatic merge. Names,
phone, DOB, address and fuzzy similarity only create privileged candidates and
never prove driver identity. No API, count, error, timing difference or support
tool may reveal a match in another tenant. Candidate state is `open`, `dismissed`,
`confirmed_distinct`, `resolved_link` or `resolved_merge`, with evidence, reason,
reviewer and timestamps.

Within an organization, prevent the same canonical active vehicle registration
from overlapping across active asset records. Likewise, a verified licence cannot
silently verify two active driver profiles; activation/verification stops in a
resolution queue. Model identifier and FASTag vehicle associations as half-open
effective intervals and enforce applicable non-overlap transactionally with
PostgreSQL unique/range exclusion constraints. Multiple historical tags are valid,
but more than one authoritative current tag or one current tag associated to
multiple vehicles is a discrepancy under the NHAI One Vehicle One FASTag policy,
not a destructive overwrite. See the [NHAI official release](https://nhai.gov.in/nhai/sites/default/files/2024-01/Press_Release-One_Vehical_One_FASTag_0.pdf),
[PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
and [range types](https://www.postgresql.org/docs/current/rangetypes.html).

There is no automatic entity merge. A same-organization, compatible-type merge
requires a permission-checked dry-run of identifiers, relationships, cases,
documents, compliance, billing and reports; step-up authentication; recorded
evidence/reason; and a second approver when an active, verified, compliance-relevant
or billable subject is affected. The command is atomic. The losing subject becomes
`superseded` with a resolver alias to the survivor and is never deleted. Immutable
evidence, provider observations, verification results, audit and historical
evaluations retain their original subject. Only explicitly approved current mutable
relationships move through ordinary audited domain commands, followed by
compliance, cases, search and billing reconciliation.

A split/correction is a reviewed compensating operation, not history rewriting. It
creates/reactivates the correct UUID, moves only selected tenant-asserted mutable
facts/relationships, marks wrongly associated immutable evidence disputed on its
original record, and requires re-verification/re-evaluation. Record the complete
before/after map, approvers and causal merge. Resolver projections must detect
cycles and cannot conceal either original subject.

Canonicalizer functions and their fixtures are immutable release artefacts. A new
version runs offline impact/collision analysis, queues every collision, dual-reads/
writes the old and new HMAC/index form, activates only after review and retains the
old version for historical replay. Never recanonicalize in place or replace a
unique index before collision resolution and rollback proof. The D-043 release
manifest carries the identifier-catalogue/canonicalizer fingerprint.

### 9.4 Canonical reference data and provider mappings

D-051 separates identity normalization from semantic normalization. D-047 answers
whether two identifier strings can refer to the same subject; this section answers
what a provider value means. A VAHAN vehicle class, SARATHI licence class, import
label or ULIP status must not become a business rule merely because its text looks
familiar. Thaarei owns an internal reference-data registry whose immutable UUIDv7
concept IDs and stable, non-recycled machine codes are the only values referenced
by policies, validations, permissions, reports and APIs. A display label is
localized presentation and may change without changing identity.

Create controlled schemes only where semantics affect policy, matching,
authorization, billing or reliable aggregation. The initial registry covers:

- country/state/union-territory, RTO and licensing/issuing authorities as separate
  schemes rather than interchangeable strings;
- vehicle reporting category, exact registration class/subtype and registered use;
- asset/combination roles, fuel/propulsion, emission norm and policy-relevant body
  and ownership categories;
- permit type, purpose, route/area/scope, authorization and lifecycle status;
- driving-licence vehicle classes, transport authorization, endorsements and badges;
- credential/regulatory-record type and authoritative lifecycle/status values;
- provider challan, FASTag and verification result/status values when product logic
  depends on them.

Do not turn every source string into a global taxonomy. Manufacturer/model text,
free-text descriptions and provider-specific informational fields remain
provenance-bearing observed values unless a documented product or policy use case
requires a controlled concept. Tenant tags and custom classifications live in the
tenant domain and never alter or masquerade as statutory concepts.

Every provider reference value is scoped by provider, dataset, provider document/
schema version, field path, jurisdiction where relevant and effective period. Store
the exact raw code and label, safe normalized display form, first/last-seen times,
adapter/observation references and the exact published mapping version used. The
same spelling such as `GOODS` in two datasets is two source values until separately
mapped. Never use an upstream code as a primary/foreign key and never reinterpret
old observations by editing a mapping row.

A mapping records one of `exact`, `narrower_than`, `broader_than`, `related`,
`ambiguous`, `unmapped` or `deprecated_provider_value`, plus target concept,
confidence, evidence, author/reviewer, effective period and supersession. These
relations follow the useful semantics of the
[W3C SKOS mapping properties](https://www.w3.org/TR/skos-reference/) without
requiring an RDF stack. Concept hierarchies support a broad reporting category and
a precise policy leaf, but entailment is intentionally conservative: a broad,
related or ambiguous mapping cannot satisfy a requirement for a narrower class.

An unrecognized value does not make the entire provider response invalid. Preserve
the raw observation, normalize independent fields, emit a schema/reference-data
finding and queue the value for review. If the field is material to applicability,
verification or eligibility, the affected assertion is `not_determined`; it is not
silently coerced to `OTHER`, inferred from spelling similarity or treated as
compliant/non-compliant. Non-material unknown fields remain visible to operations
without blocking otherwise valid observations. Licence classes and transport
authorization are always material when used for driver/vehicle compatibility; no
substring, fuzzy match or inferred transport entitlement is permitted.

Reference schemes and mapping versions follow:

```text
draft → in_review → approved → scheduled → active → superseded
```

Publication requires source evidence, fixtures and a named owner. A mapping capable
of changing compliance, driver/vehicle eligibility, authorization or billing needs
an independent reviewer. Before activation, compute affected observations/current
projections/evaluations, detect many-to-one and precision-losing collisions, run
shadow normalization plus policy evaluation and produce a signed comparison. Bind
the scheduled activation to a compatible D-043 release/reference fingerprint.
Rollback activates the prior immutable publication; it never edits history.
Changed historical interpretation uses D-050 linked restatement and clearly
separates the mapping used then from today's corrected view.

Geography is scheme-qualified: an ISO subdivision, vehicle-registration prefix,
GST state code, provider state ID, RTO and licensing authority are different
concept kinds connected only by reviewed relationships. APIs and exports return
the stable Thaarei code, authorized localized label, concept/version and mapping/
source provenance where applicable; raw provider values are optional and
field-authorized. Import templates use active stable Thaarei codes plus labels in
lookup sheets. A statutory reference cell with an unknown/free-text value is an
actionable validation issue, while an explicitly tenant-defined tag uses its own
column and namespace. Tenants may request a mapping review but cannot publish or
override statutory mappings.

The official VAHAN analytics catalogue illustrates why label identity is unsafe:
it exposes overlapping vehicle/permit groupings and differently phrased permit
labels that require dataset-specific interpretation rather than string equality.
See the [VAHAN public analytics dashboard](https://analytics.parivahan.gov.in/analytics/publicdashboard/vahan?lang=en).

### 9.5 Data quality, reconciliation and stewardship

D-052 treats data quality as fitness for a declared purpose, not a cosmetic cleanup
step or one organization-wide percentage. The six controlled dimensions are
`completeness`, `uniqueness`, `consistency`, `timeliness`, `validity` and
`accuracy`. Completeness means required records/values exist; validity means format,
type/range and contract conformance; neither proves accuracy. Accuracy means the
best supported correspondence with the real-world subject/event and normally needs
issuer/provider evidence or reviewed comparison, not merely a database predicate.
This follows the official [UK Government Data Quality Framework](https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework),
NIST's fit-for-purpose [Research Data Framework](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html)
and the UN's holistic [National Quality Assurance Framework](https://unstats.un.org/UNSDWebsite/data-quality).

Every immutable rule version records purpose/use case, data owner, subject/population
selection, field/assertion and dimension, expression/measurement, expected value or
threshold, materiality, evaluation trigger/frequency, responsible steward,
remediation target, operational effect, policy/adapter/import/reference/schema
dependencies, effective interval and approval/publication evidence. Results are
atomic `passed`, `warning`, `failed`, `unknown`, `not_measured` or
`not_applicable`, with the actual population/input snapshot and rule versions. Do
not collapse them into a magic score for activation, verification, compliance,
billing or assignment. Dashboards may show dimensional counts/rates only with
numerator, denominator, excluded/not-evaluated population, version and `as_of`.

Use five enforcement layers:

1. **Input contracts:** type, repertoire, format, required-field, D-051 reference,
   import template and provider-envelope/schema checks before domain acceptance.
2. **Transactional invariants:** organization ownership, uniqueness, interval,
   relationship, state-machine and referential rules enforced by D-022 commands and
   PostgreSQL constraints.
3. **Asynchronous semantic checks:** cross-record, cross-source and temporal
   contradictions, duplicate candidates, impossible combinations and incomplete
   policy inputs that cannot be decided inside one bounded transaction.
4. **Pipeline reconciliation:** compare authoritative rows/versions with compliance,
   cases, search/report projections, schedules, objects, provider work, billing,
   exports and delivery/effect receipts.
5. **Trend/schema monitoring:** detect material shifts in missingness, unknown D-051
   values, parse/error rates, duplicate candidates, value distributions, observation
   delay or provider field presence. A statistical/ML anomaly is an investigation
   signal only and can never rewrite a fact, mapping, policy or decision.

A data-quality finding describes the information/process defect; a compliance
finding describes the applicable policy consequence. They may be linked but are
not aliases. For example, an unmapped transport class creates one provider/reference
quality finding while each affected driver/vehicle compatibility remains
`not_determined`. Findings record rule/result, affected subject/population,
materiality, safe evidence/provenance, detected/last-seen times, owner, SLA state,
linked cases/compliance outcomes, resolution and recurrence. Their lifecycle is:

```text
open → triaged → remediation_pending → resolved → verified_closed
              ↘ accepted_exception → expired/reopened
```

An accepted exception is reasoned, scoped and expiring; it does not fabricate a
verified fact or compliant decision. Critical wrong-subject, isolation, false-
compliance or committed-integrity signals follow D-021 incident handling rather
than waiting in an ordinary quality queue. Quality rules and findings contain no
unmasked restricted values; authorized reviewers reach source evidence through its
ordinary field/purpose controls.

Stewardship follows cause and authority. Tenant data stewards own customer-entered
profiles, references, relationships and missing onboarding information. Thaarei
domain/compliance owners own policy inputs and rule materiality; integration owners
own provider contracts/adapters/schemas; reference owners own D-051 mappings; and
platform operations owns projections, queues, objects and receipt integrity. An
issuer/provider-owned fact may be disputed/escalated but cannot be edited by either
tenant or Thaarei. UI/API always expose the responsible party and whether progress
waits on the tenant, Thaarei, ULIP/provider or issuer.

Only an allowlisted versioned deterministic transformation may normalize a value
before commit. Do not auto-repair provider observations, accepted evidence or
committed authoritative state. Suspected committed error becomes a finding and uses
D-050 correction; identity/duplicate repair uses D-047; semantic mapping uses
D-051. Rule publication uses draft/review/approved/scheduled/active/superseded
governance with impact and shadow execution when it can change a material gate.

Gates are operation-specific. Draft import can retain correctable issues. Subject
activation requires minimum identifying/ownership information and no unresolved
critical uniqueness conflict but does not imply verification or compliance.
Partial provider results retain independent usable fields. Contextual assignment
requires every policy-critical input to be sufficiently complete, valid,
consistent, current and appropriately accurate; material uncertainty produces
`not_determined`. Reports/exports declare population, exclusions, quality/rule
version and observation/projection `as_of`.

Trigger targeted reconciliation after import activation, correction, merge/split,
provider normalization, D-051 mapping publication, policy activation, material
billing/entitlement change, release, restore or queue recovery. Also run frequent
bounded critical-current checks and checkpointed rolling whole-active-population
checks without starving interactive/provider work. Each run records definition and
rule versions, population snapshot, expected/observed counts and checksums,
checkpoints, discrepancies, retries, owner and a durable receipt per target.
Completion requires every required target receipt; failures remain visible and
resumable. The MVP implements this in tenant-RLS PostgreSQL and class-specific
Graphile workers, not a separate SaaS quality tool, warehouse or sensitive replica.

### 9.6 Data consistency

PostgreSQL is the authoritative command and consistency boundary. A command commits
its aggregate changes, invariant checks, monotonic aggregate/row version, mandatory
audit event, transactional outbox event and idempotency result/reference in one
transaction. Never hold that transaction open while calling ULIP, object storage,
Razorpay, a transactional-email provider or another network dependency. A workflow needing an external result first
commits an explicit pending state plus work record and completes through a later
idempotent command/state transition.

Use three reviewed transaction classes:

- ordinary aggregate mutation: `READ COMMITTED`, lock the aggregate row, compare
  the expected version and rely on database constraints;
- cross-row correctness command: `SERIALIZABLE` with bounded jittered retry of the
  complete transaction, including all reads and decisions, for capacity allocation,
  last-owner transfer, interval compatibility, policy publication and sensitive
  entitlement transitions;
- append-only ingestion: immutable insert with authoritative source/event unique
  keys and no read-modify-write race.

The shared transaction runner owns SQLSTATE-aware retry limits and metrics.
`40001` serialization and approved `40P01` deadlock retries reuse the same command
and idempotency identity. Exhaustion returns a safe retryable conflict; handlers do
not retry just the final SQL statement. Prefer foreign-key, unique, check, partial-
unique and range/exclusion constraints over application-only checks. Prevent
overlapping active assignments, primary fleet intervals and incompatible vehicle
combinations in the database where representable.

Every editable aggregate has a monotonically increasing `row_version`. tRPC sends
`expectedVersion`; REST emits a strong `ETag` and requires `If-Match`. Missing
preconditions return `428`, stale versions return `412`, and a valid request that
conflicts with the current domain state returns `409`. Never silently use
last-write-wins. Creates use natural/domain unique constraints and immutable
credential versions, evidence artifacts and provider observations are never edited.

Every retryable state-changing command carries a high-entropy client command ID;
REST uses `Idempotency-Key` and the first-party client supplies the equivalent
automatically. Uniqueness is scoped by tenant/control-plane scope, operation and
key. Store initiating principal, canonical request hash, state/timestamps, safe
status/result reference and audit/outbox IDs—not a raw sensitive request/response.
The same key/hash returns the same result; the same key with a different hash
returns `409`; in-progress work returns the same operation reference. Authentication
and authorization run on every replay before a result is disclosed. Ordinary
receipts expire after 30 days; finance, webhook, import activation and irreversible
commands follow their longer domain policy. Validation/authentication failures that
occur before command execution are not recorded as a completed result.

Outbox and Graphile delivery are at-least-once. Each event records UUID, tenant/
control-plane context, aggregate type/UUID/version, event/schema version,
command/correlation/causation IDs, UTC times and minimized payload. Ordering is per
aggregate, never global. A durable `(consumer, event_id)` inbox receipt and
side-effect receipt make each consumer idempotent; version gaps pause and reconcile.
Graphile `job_key` may schedule/debounce but is not durable deduplication evidence
because completed keys disappear and locked work can duplicate. External side
effects use provider idempotency when available plus application receipts.

Mutation responses come from committed writer state and include the new version.
Immediate detail reads use the writer. Search, dashboards, reports and notification
views may be eventually consistent, target less than ten seconds of projection lag
and alert on sustained lag above 60 seconds. Each projection records source version
and `projected_at`; the UI exposes `as_of` when material. Authorization, subscription
enforcement, compliance, retention and billing never read an eventual cache/search
projection. Reconciliation jobs compare authoritative state, projections, objects,
provider work and billing usage.

### 9.7 Corrections, invalidation and restatement

D-050 defines correction semantics by record class rather than one editable/delete
behavior. Unactivated drafts may be edited with optimistic versions. Current master
profiles create an audited version/correction. Effective-dated relationships close
or correct an interval and append the replacement. Tenant assertions and credential
metadata create linked superseding versions. Accepted evidence bytes, provider
observations, verification results, audit events and compliance evaluations remain
immutable. Finance uses its credit/debit/refund/cancellation/reconciliation
instruments. Personal-data correction and erasure follow D-020 and the approved
privacy request rather than indefinite historical retention.

Use explicit `current`, `superseded`, `disputed`, `entered_in_error`,
`issuer_retracted`, `revoked`, `cancelled`, `security_quarantined`, `redacted`,
`erasure_pending` and `erased` semantics where applicable. They are not aliases:
revocation is a real-world authority action, `entered_in_error` says the record was
wrong, dispute is unresolved, and erasure means the protected value was removed.

Apply selective bitemporal history to compliance-relevant identifiers, credentials,
facts, fleet/location/duty/combination relationships, permit associations and
verification inputs. Record the real-world `effective_from`/`effective_to` and the
knowledge interval through `recorded_at`/`superseded_at`, with `supersedes_id`,
source and correction operation. Do not add bitemporal columns everywhere or adopt
full event sourcing. Current tables remain the command authority, while immutable
versions/provenance answer both “what V2 knew and decided then” and “today's
corrected interpretation of that effective date.” The approach follows W3C PROV's
separate revision/invalidation concepts: [W3C PROV constraints](https://www.w3.org/TR/prov-constraints/).

The correction lifecycle is:

```text
requested → impact_analysis → awaiting_approval → applying
          → applied → reconciliation_pending → completed
```

Rejected and cancelled are terminal. Classify the reason—typo, wrong subject/link,
missing fact, provider/issuer correction, privacy request, legal restatement or
other approved type—and preview affected compliance/evaluations, cases, alerts,
assignments, reports/exports, identifiers/search, provider work and billing. The
command reauthorizes, requires step-up, locks/validates current versions and commits
new/superseded state, audit, outbox and reconciliation targets atomically. It never
puts restricted before/after values into audit. Completion waits for each durable
target receipt; partial reconciliation remains visible/retryable.

Ordinary profile correction may use one authorized actor. Require an independent
approver for a verified statutory identifier, moving evidence between subjects,
retrospective operational relationship, past allowed/blocked-decision impact,
provider-observation dispute, legal-entity transfer, finance instrument, bulk
correction, exceptional privacy redaction/erasure or closing a regulatory finding
without new authoritative evidence. The requester cannot approve the same high-
impact operation.

There is no generic undo after commit. Unsaved draft UI changes may be undone
locally; every committed reversal is an idempotent domain-specific compensating
command linked to the original. It closes/replaces intervals, invalidates/relinks
evidence, invokes D-047 split, or uses the finance correction instrument without
deleting the original command/history. Failed compensation remains explicit.

A provider observation/raw response is never edited. Later authority information
is a new observation; earlier evidence is disputed, superseded or issuer-retracted
only when those exact semantics are supported. Preserve receipt/effective times
and never claim V2 knew the correction earlier. A past evaluation likewise remains
the actual result produced then. If an input was entered in error, link it as
`invalidated_by_correction` and create a restated evaluation; reports clearly
separate `as_known_at`, `corrected_current_view` and
`restated_historical_view`. Restatement does not rewrite the past operational
decision or emit ordinary historical notifications unless an approved workflow
requires it.

Accepted objects are never overwritten: corrected evidence is a new generation/
link, wrong links are invalidated and redacted previews remain non-authoritative
derivatives. D-035 security quarantine and D-020 privacy erasure remain distinct.
Where erasure is required and no retention authority remains, remove PII from every
version/processor and retain only the non-identifying deletion proof; do not hide
the old value in audit, filenames, hashes or tombstones. This implements the DPDP
right to correction/completion/updating and applicable erasure without treating
immutability as authority to retain PII forever: [DPDP Act, section 12](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf).

A correction also retires obsolete D-023 search tokens, invalidates caches,
reconciles current projections/schedules/cases/findings and cancels or regenerates
pending exports whose approved snapshot is no longer valid. Financial corrections
use auditable revised/credit/debit instruments rather than editing issued records;
see [CBIC invoice rules](https://cbic-gst.gov.in/gst-invoice-rules.html). Until all
targets finish, UI and APIs show the correction/reconciliation state and must not
present two subjects/versions as concurrently current.

### 9.8 Growth, partitioning and database maintenance

Keep organization, identity, fleet/asset/driver, current relationship/compliance,
credential, policy, subscription and active queue/outbox state unpartitioned.
Create native monthly UTC range partitions from inception for forecast high-growth
append-only `source_observations`, verification/provider-request histories,
`fastag_transactions`, `audit_events` and delivery-attempt histories; later D-027
API/webhook usage follows the same rule. Add another table only from a recorded
volume/query/retention forecast. Never create one schema, database or partition per
tenant.

Each partitioned row has immutable `occurred_at`/`recorded_at`; primary/unique keys
include that partition key and references are composite where needed. A separate
unpartitioned locator/sequence registry enforces any required global workflow
identity. Index common access paths from `organization_id` plus time/routing fields.
Runtime roles use only the RLS parent and have no leaf privileges; tests cover
direct-leaf denial and pruning under tenant/time predicates.

Provision and validate the current plus six future partitions daily and in
migration rehearsal, with bounds, indexes, constraints, RLS and retention metadata.
Do not create a silent default partition; a missing/invalid partition alerts and
fails the affected write, including D-019 fail-closed audit behavior. Add large
retrospective indexes per leaf with bounded-lock techniques.

D-020 remains authoritative. Detach/drop a whole partition only if every row has
reached authorized deletion and no hold applies; mixed retention, tenant deletion
and data-principal erasure use indexed per-row deletion plus verification. Do not
create a generic S3 cold archive of tenant tables. Audit archive follows D-019;
another warehouse/archive requires D-023 authorization, reconciliation and deletion
parity.

Keep autovacuum/analyze enabled, tune high-churn tables/partitions, bound long
transactions and monitor dead tuples, freeze age, bloat and maintenance progress.
Analyze after material bulk loads. `VACUUM FULL` is not routine maintenance.
Maintain a versioned non-constraint index inventory with use case/owner and review
unused, duplicate and write-expensive indexes quarterly.

Implementation references:

- [PostgreSQL serialization-failure handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)
- [RFC 9110 conditional requests](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 6585 `428 Precondition Required`](https://www.rfc-editor.org/rfc/rfc6585.html)
- [Transactional outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Graphile Worker delivery semantics](https://worker.graphile.org/docs)
- [Graphile Worker job-key caveats](https://worker.graphile.org/docs/job-key)
- [PostgreSQL declarative partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL routine vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html)

## 10. Backend and API architecture

### 10.1 Service shape

Start as a modular monolith with three deployable processes:

- `apps/web`: installable, online-first Next.js web application.
- `apps/api`: Fastify/tRPC API plus explicitly required REST/OpenAPI boundaries.
- `apps/worker`: Graphile Worker tasks, schedules and outbox delivery.

This avoids premature microservices while keeping domain, adapter and deployment
boundaries suitable for later extraction.

### 10.2 Package ownership

- `packages/core`: entities, value objects, policies, use cases and provider ports.
- `packages/contracts`: Zod request/response/event schemas.
- `packages/database`: Drizzle schema, migrations, RLS setup and repositories.
- `packages/adapters`: ULIP, Razorpay, transactional email, storage, Valkey and telemetry adapters.
- `packages/api`: request context, tRPC composition and REST/OpenAPI surface.
- `packages/design-tokens`: UI tokens and cross-surface design primitives.
- `packages/localization`: D-060 locale registry/resolution, typed message schema,
  formatting/error-message port and catalogue/font/release validation; legal
  publication content remains under the D-057 domain rather than this UI package.
- `packages/test-support`: factories, fixtures and controlled provider doubles.

### 10.3 API conventions

- `/api/trpc/*` is a private contract for the first-party web client and follows
  D-046's explicit old-client compatibility window; a deployment cannot assume an
  already-open browser updates atomically.
- `/api/app/*` is private first-party REST for upload, download, import/export and
  operation boundaries that do not fit tRPC.
- `/webhooks/providers/*` contains provider-specific inbound callbacks with their
  own raw-body verification and provider-account mapping.
- `/api/v1/*` is reserved for the first independently versioned customer REST API;
  product Version 2 does not imply API version 2.
- Zod validation at every trust boundary.
- RFC 9457 Problem Details for REST errors.
- Cursor pagination for growing collections.
- Explicit sort/filter contracts and bounded page sizes.
- High-entropy command/idempotency keys for every retryable state-changing command,
  with operation/scope binding and D-022 replay semantics.
- Correlation IDs across API, job, provider, storage and notification activity.
- No sensitive data in URLs, query strings, logs, analytics or error messages.
- Strong `ETag`/`If-Match` for REST edits and `expectedVersion` for tRPC edits;
  use RFC 9457 problems with stable machine codes for `409`, `412` and `428`.
- Long-running REST commands return `202 Accepted` plus an `operations/{uuid}`
  `Location`; tRPC returns the same operation UUID/state contract. Polling is
  bounded/backed off and a retry returns the existing operation.
- Mutation results include authoritative aggregate version; projection-backed
  responses expose material `as_of`/lag metadata and never drive critical decisions.
- Customer-API deprecation/versioning applies only after that later capability
  launches; no unpublished or pre-launch product contract is supported.

### 10.4 Private transport, errors and compatibility

Fastify is the sole application HTTP/API process. Next.js and Graphile workers call
the same contract/use-case boundary and do not implement a second mutation path.
Use standard JSON domain encodings—UUID/text, D-045 dates/instants, integer paise
and explicit discriminated objects—and no SuperJSON or runtime-dependent implicit
transformer.

All first-party tRPC operations use POST so identifiers and filters never enter the
URL. Split links by operation: read queries may use `httpBatchLink` with `maxItems`
and server `maxBatchSize` both ten; mutations use unbatched `httpLink`. A batch may
not contain a mutation, each read is independently authenticated/authorized,
admitted, costed, traced and metered, and a batch response preserves per-operation
success/failure. Do not enable tRPC subscriptions, WebSockets, server-sent events or
streaming batch transport in MVP; use bounded conditional/backoff polling for
D-022 operation resources.

Initial limits apply at both Dokploy/Traefik and Fastify, with the stricter layer winning:

| Boundary | Initial maximum |
| --- | ---: |
| Request URI | 2,048 bytes |
| Total request headers | 16 KiB |
| Better Auth JSON | 64 KiB |
| tRPC/ordinary REST JSON | 256 KiB |
| Read operations per tRPC batch | 10 |
| Ordinary JSON response | 1 MiB |
| Complete request receipt | 15 seconds |
| Fastify route lifecycle | 25 seconds |
| Traefik upstream response | 30 seconds |

Accept only an exact content type declared by the route; keep Fastify prototype and
constructor poisoning behavior at `error`. Reject compressed JSON requests and
dynamic compression of authenticated/API/error responses unless a later documented
route-specific threat/compatibility test approves them; precompress only immutable
public assets. Evidence/import files use D-031's direct quarantine upload and never
pass through a general Fastify JSON/multipart buffer. A provider callback has its
own exact raw-body media/size/time contract, never more than 1 MiB without written
evidence. A command expected to exceed five seconds normally returns a D-022
operation rather than consuming the interactive deadline. Limits are versioned
configuration and may change only with representative client/load/abuse evidence.

Propagate Fastify's request `AbortSignal` through cancellable database reads,
streams, storage and outbound adapters. Disconnect/deadline cancels a read and a
command not yet admitted. Once a D-022 transaction begins, it commits or rolls back
as one unit; cancellation never leaves a partial command, and a lost response is
recovered with the same idempotency key. Permit at most two jittered automatic read
retries for classified transport errors. Never blindly retry a mutation; it
requires the same scoped command key and reauthorization. Honor `Retry-After` for
`429`/temporary `503` and stop when the caller's purpose/deadline expires.

Maintain one versioned machine-code catalogue and safe HTTP mapping. REST returns
`application/problem+json` with stable `type`, `title`, HTTP `status`, application
`code`, generated `request_id` and optional field-error paths/codes. tRPC's custom
formatter exposes the same application code/request ID/paths in its typed error
data. Use `400` malformed, `401` unauthenticated, `403` permitted existence,
`404` absent/existence-hidden, `409` domain/client-contract conflict, `412` stale
precondition, `428` missing precondition, `413` size, `415` media type, `422`
validation, `429` admission, `503` controlled dependency unavailability and `504`
deadline. Never serialize a rejected value, raw input, SQL/provider/library detail,
stack, tenant-existence clue or exception text; human wording is not a machine
contract.

Generate a UUIDv7 `request_id` at the trusted API boundary, return it in
`X-Request-ID` and propagate it to jobs/effects. Traefik strips public inbound
`X-Request-ID` and `tracestate`; accept and validate W3C `traceparent` only under
server-controlled sampling or restart it at the trust boundary. Trace fields contain
no tenant/subject data. Fastify trusts forwarding headers only from the exact
private Traefik address/CIDR—not a Boolean or hop count—and no security
decision trusts an unvalidated forwarded value.

Every application call sends `X-Thaarei-Client-Build`; every response returns the
server release and contract fingerprint bound into D-043's manifest. The new API
supports the current and immediately previous web contract for at least 24 hours,
using additive schemas and contract fixtures. Thereafter, a stale/missing build that
cannot be proven compatible receives `CLIENT_REFRESH_REQUIRED`/`409` before a
mutation starts. The UI prevents new mutations, preserves safe unsaved fields where
possible and performs a controlled hard reload; keep the previous immutable web
assets available for at least seven days. Test current-client/new-server, previous-
client/new-server and new-client/previous-server rollback combinations. Next.js
`deploymentId` remains enabled for asset/navigation skew but does not replace this
API compatibility contract.

Primary references: tRPC's [HTTP batching and limits](https://trpc.io/docs/client/links/httpBatchLink)
and [error formatter](https://trpc.io/docs/server/error-formatting), Fastify's
[server limits/timeouts](https://fastify.dev/docs/latest/Reference/Server/) and
[content-type parser](https://fastify.dev/docs/latest/Reference/ContentTypeParser/),
[RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html), the W3C
[Trace Context](https://www.w3.org/TR/trace-context/) recommendation and Next.js
[self-hosting/version-skew](https://nextjs.org/docs/app/guides/self-hosting) guidance.

### 10.5 Future customer API and machine identity

External customer API/webhook access is not MVP. When entitled later, represent
each client as an application-owned machine principal belonging to exactly one
organization. Apply D-017 product permissions plus optional fleet/location scopes;
never inherit a human role, allow UI login/self-approval or issue one billing-
account credential across tenants. Creation, grant changes, credential rotation
and revocation require permission, step-up and audit, and every request/command/
disclosure records the machine-principal UUID.

Provide only OAuth client credentials initially. Prefer RFC 7523
`private_key_jwt`; allow a generated high-entropy client secret as a compatibility
fallback, show it once, retain only a verifier, expire it within 180 days and
permit at most seven days of explicitly controlled old/new overlap. Issue opaque
ten-minute access tokens bound to client, organization, scopes, credential version
and API audience; do not issue refresh tokens. Revocation/scope reduction must
take effect immediately. Do not implement dynamic registration, password,
implicit, authorization-code or human-delegation grants in this profile. Consider
mTLS/DPoP only through a later compatibility-tested high-assurance profile.

The public contract uses a toolchain-proven, pinned OpenAPI version, UUID strings,
D-045 RFC 3339 UTC instants ending in `Z`, strict ISO legal dates that never imply
midnight, integer paise, explicit canonical IANA timezone fields, cursor
pagination, bounded pages and allowlisted filters/sorts. It inherits RFC 9457,
strong conditional writes, D-022 idempotency and `202` operation resources.
Apply configurable platform, organization, client, route, concurrent-operation,
export and refresh limits; return `429`, `Retry-After` and a non-sensitive problem
without revealing global/other-tenant capacity.

Customer traffic never becomes a synchronous ULIP proxy. Reads expose only
authorized normalized Thaarei state plus provenance/freshness. An entitled refresh
queues/coalesces D-010 work and returns an operation UUID. Never disclose raw ULIP,
provider account/token details, object locations or fields whose redistribution/
purpose has not been approved.

Public and first-party contracts use D-051 stable Thaarei codes and localized
labels, with concept/publication and authorized mapping provenance where material.
Clients must not branch on mutable provider labels. Provider-native values are
returned only through a specifically field-authorized provenance view/export, and
adding a new provider value does not silently extend a closed policy enum.

Expose D-053 management, ownership/custody, regulatory, operational-availability
and compliance dimensions as separate typed fields with their own source,
effective interval and version. No generic `status` query/enum or convenience
boolean may collapse them. Lifecycle mutations require explicit action/reason,
effective time, expected version and command ID; bulk operations return one durable
result per subject.

All approval APIs expose the server-owned D-054 request/proposal version, safe
proposal hash, required functions/quorum, decision/expiry and execution/
reconciliation state. Clients submit only an explicit decision against the current
proposal version; they cannot provide approver eligibility, lower a tier, mark
quorum reached or invoke the protected domain command directly.

Within a public major, document which enums are open and make only additive,
optional compatible changes. Field removal/rename, narrowed inputs, unit/identifier
semantic change and material authorization change are breaking. After customer API
GA, support a superseded stable major for at least 12 months, notify at introduction
and at least 180/90/30 days before retirement, and emit RFC 9745 `Deprecation` plus
RFC 8594 `Sunset`. Faster retirement requires named security/legal/product approval
for an active security, legal, provider-contract or data-integrity necessity plus
a customer mitigation plan.

### 10.6 Future outbound customer webhooks

Produce minimized versioned events through D-022's transactional outbox and
durable delivery/effect receipts. Delivery is at-least-once, not globally ordered:
include stable event/type/schema/organization/endpoint IDs, UTC occurrence time,
aggregate UUID and monotonic aggregate version where relevant. Receivers
deduplicate by event UUID and order one aggregate by version. Do not include raw
ULIP, document bodies/URLs or restricted fields by default; reauthorize and
re-minimize before every delivery/replay.

Sign `timestamp + "." + event_id + "." + raw_body` with a versioned per-endpoint
HMAC-SHA-256 secret, shown once and encrypted at rest. Include timestamp, event ID,
signature version and signature headers; permit controlled dual-secret rotation,
document constant-time comparison and require a five-minute replay window. Retry
with exponential backoff/jitter for up to 72 hours, pause unhealthy endpoints and
notify owners. Allow authorized manual replay from a 30-day delivery window; audit
all endpoint, secret, delivery, pause and replay activity.

Tenant callback URLs are an SSRF boundary. Initially accept only verified HTTPS
port 443 endpoints, with no embedded credentials, fragment, IP literal, arbitrary
header or redirect. Resolve/validate every A/AAAA result at registration and each
attempt, reject loopback/private/link-local/multicast/reserved/metadata targets and
ensure the actual connection uses a validated public address. Deliver through a
restricted-egress worker with bounded connect/read time and response size, and do
not log response bodies.

Before launch provide a synthetic-data sandbox, versioned reference/OpenAPI,
sanitized examples, rotation/signature/idempotency/concurrency/retry guides,
changelog/deprecation calendar, per-client usage/delivery visibility and support/
incident contacts.

Implementation references:

- [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/info/rfc9700/)
- [JWT profile for OAuth client authentication](https://www.rfc-editor.org/info/rfc7523/)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
- [RFC 9745 Deprecation](https://www.rfc-editor.org/rfc/rfc9745.html)
- [RFC 8594 Sunset](https://www.rfc-editor.org/info/rfc8594/)
- [RFC 6585 `429 Too Many Requests`](https://www.rfc-editor.org/info/rfc6585/)
- [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

## 11. Frontend and UX architecture

### 11.1 Runtime and API boundary

Use the pinned starter-compatible Next.js App Router. React Server Components own
public/static pages, layouts, navigation, route loading/error boundaries and the
authenticated shell; client components own interactive tables, filters, forms,
charts and workflows. Fastify is the exclusive domain/API command boundary:

- no direct web-process access to PostgreSQL, ULIP, key/secrets services, Razorpay,
  email providers or tenant object storage;
- no product command duplicated through Next.js Server Actions;
- any server-rendered application data calls the same Fastify contract under the
  current user/session/organization and cannot bypass field, purpose, step-up or
  audit controls;
- restricted fields normally load only after explicit client-side step-up rather
  than entering server-rendered HTML or RSC payloads.

Expose one browser origin and route `/api/trpc/*`, `/api/app/*` and `/auth/*` to
Fastify while Next.js serves the remaining application paths. D-016's `__Host-`
cookie, origin/CSRF validation and deny-by-default authorization therefore remain
the only first-party browser security contract; no bearer token enters JavaScript.

### 11.2 Information architecture

Recommended primary navigation:

1. Overview
2. Compliance
3. Assets
4. Drivers
5. Documents
6. Verification inbox
7. Cases and tasks
8. Challans and FASTag activity
9. Reports
10. Organization settings and billing

Fleet and location filters persist across appropriate pages. The organization
switcher is visually distinct because it changes the tenant/security context.

### 11.3 Client state, mutations and connectivity

Use the typed tRPC client with bounded in-memory query state only. Prefix every
tenant query key with organization UUID plus security/permission context version,
and clear application state on logout, organization switch, membership/permission
change, session expiry or support-context termination. Server state and durable
preferences/saved views remain server-side; do not persist query/domain state to
`localStorage`, `sessionStorage`, IndexedDB, Cache API or a service worker.

Configure D-046 split transport explicitly: POST-only batches of at most ten reads
and one unbatched POST per mutation, each carrying the client-build fingerprint and
generated command key where applicable. The client never enables a generic mutation
retry. On `CLIENT_REFRESH_REQUIRED`, stop new mutations, preserve only safe in-memory
form fields, explain the update and perform a controlled hard reload; Next.js
navigation skew handling alone is insufficient for an already-running tRPC client.

Browser persistence uses a reviewed allowlist limited to non-sensitive presentation
preferences such as theme, locale, accessibility settings and a dismissed install
prompt. Non-sensitive filter/sort/cursor/tab state may be shareable in a URL.
Restricted identifiers, names, notes, exact licence searches, document keys and
provider values never enter URLs/history; send sensitive searches in a POST/tRPC
body and retain them only in memory.

Every mutation carries D-022's command/idempotency key and expected version, and
the UI presents success only after the authoritative result. Compliance,
authorization, billing, verification, approval, membership, document acceptance,
import activation and assignment mutations are not optimistically asserted.
Long-running work uses its server operation UUID and resumes by bounded polling or
refresh after reconnect.

MVP is online-first. Ship an HTTPS web manifest/icons/standalone presentation, but
no service worker, Cache API strategy, Background Sync, Web Push, offline tenant
database or queued mutation. When connectivity fails, show an accessible persistent
banner, retain only the open tab's in-memory form, disable unsafe submission and
never claim a save. A first offline launch and authenticated offline data access are
unsupported.

A later service worker, push channel or offline/mobile workflow requires a new ADR,
D-025 threat model and privacy review. It must define bounded data, device/lost-
device controls, expiry/revocation, encryption, conflict/sync behavior and a cache
kill switch. A service worker may never cache navigation/RSC responses, `/api`,
`/auth`, evidence, previews, exports, presigned responses or authenticated
`no-store` content, nor queue product writes.

### 11.4 UX and accessibility principles

- Lead with actionable exceptions, not a wall of records.
- Always show source, last checked time, freshness and verification strength.
- Show the product meaning separately from an authorized raw provider value; make
  `unmapped`/`ambiguous` review state explicit and never display it as generic
  `Other` when it can affect compliance.
- Explain each subject's `clear`, `attention_required`, `known_failure` or
  `indeterminate` posture and, separately, why a contextual operation is allowed,
  allowed with exception, blocked or not determined.
- Never present a composite data-quality percentage as a compliance/eligibility
  grade. Show atomic D-052 dimension, materiality, affected purpose, denominator,
  owner and remediation action.
- Keep authoritative facts visually separate from operator-provided facts.
- Use progressive disclosure for the large VAHAN/SARATHI field sets.
- Make bulk operations previewable, cancellable where possible, and resumable.
- For D-054 actions, require an explicit review/confirm step that shows the exact
  current proposal and remaining independent functions; opening a page or clicking
  an email notification never records approval.
- Present background work as queued/running/completed/partially failed rather than blocking the browser.
- Preserve filter/search state when returning from a detail page.
- Provide keyboard access, visible focus, semantic headings, labeled controls, adequate targets and WCAG 2.2 AA-oriented contrast/reflow.
- Keep core tasks functional from 320 CSS pixels upward. Use mobile task cards and
  priority fields instead of shrinking dense desktop tables; horizontal table
  scrolling is limited to genuinely two-dimensional comparisons.
- Use at least 44-by-44 CSS-pixel primary touch targets, never below WCAG 2.2 AA's
  target-size/spacing rule, and provide a non-drag alternative for every drag action.
- Support zoom/reflow, screen readers, reduced motion and high-contrast modes;
  drawers, banners and sticky regions must not obscure keyboard focus.
- Do not finalize screen design until Version 2 user research, task analysis and
  representative usability testing are complete.

### 11.5 Localization, language and translation governance

D-060 deliberately separates a complete product locale from a legally significant
language surface. Launch the authenticated organization/fleet operations UI in
English for India (`en-IN`). Internationalize all components, validation, navigation,
accessible names, server errors and templates from the first commit, but add no
complete second UI locale until a named customer need, native-language product owner,
support/incident capability, legal review where applicable and full release evidence
are approved. A translated menu without the corresponding workflow, help, error,
support and emergency language is not a supported product locale.

Independently provide a minimal public/non-user driver and data-principal shell that
can select language before identity disclosure and carry consent, notice, withdrawal,
rights/grievance and secure-response journeys. Section 6(3) of the DPDP Act requires
a consent request to offer access in English or a language in the Constitution's
Eighth Schedule. Treat this conservatively as English plus all 22 Eighth Schedule
languages for every consent-request publication unless Indian privacy counsel records
a narrower interpretation and exact alternative before that processing begins. This
does not require the whole tenant dashboard in 22 languages. Pilot privacy/right
journeys beyond consent launch in English plus the pilot customers' approved languages
and retain an independently published assisted channel for another requested language.
Never infer language from name, state, registration, organization or identifier.

Represent an allowed locale by a canonical validated BCP 47 identifier such as
`en-IN`, `hi-IN`, `ta-IN` or `ur-IN`, not a translated/free-text label. Maintain a
versioned allowlist and canonical casing. Resolve presentation locale in this order:

1. the authenticated user's explicit durable preference;
2. an explicit selection carried by the exact public/legal/rights link or request;
3. the organization's configured default for a user who has made no choice;
4. a supported `Accept-Language` match on the first anonymous visit only; then
5. `en-IN`.

Browser headers may suggest the first presentation but never silently change a saved
preference. Keep authenticated product routes locale-neutral so locale does not enter
sensitive links or fragment tenant state; store the user preference server-side and,
where needed before login, only the non-sensitive allowlisted locale in a secure
same-site cookie. Give public immutable legal publications stable explicit paths such
as `/legal/privacy/<publication-id>/<locale>`. A locale switch changes future
presentation only: it cannot change a policy/evaluation, permission, purpose,
entitlement, price, statutory calendar, canonical identifier, historical acceptance
or already-created notification artifact.

Put a narrow application-owned localization port around an exact D-044-qualified
`next-intl` release. Keep UI catalogues as reviewed source-controlled artifacts,
loaded locally and bundled only for the active locale; no application request depends
on a translation SaaS. Use stable namespaced keys and ICU MessageFormat plural/select
arguments. Do not concatenate sentence fragments, interpolate unescaped markup, put
customer data into message keys or permit tenant-authored arbitrary UI HTML. Fastify
returns stable error codes plus typed safe parameters; the web application owns the
localized message, so English prose is never the client contract.

Each catalogue has a source locale, canonical message-key schema, semantic version,
content fingerprint, reviewer set, compatible release range and publication state.
Ordinary missing UI messages fall back to approved English and create privacy-safe
telemetry containing only key/catalogue/release/locale. They never show a raw key or
crash a critical journey. A missing promised translation for a legal document,
consent action, compliance/expiry instruction, security or breach communication fails
that publication/delivery closed and alerts its owner; it must not silently substitute
English after the person selected another offered language.

Legal terms, privacy notices, consent/withdrawal requests, compliance conclusions,
expiry instructions and security/breach communications require an approved source,
professional human translation, native-language review and the applicable domain,
privacy or legal approval. Machine translation may be evaluated later only as a
clearly unpublished drafting aid; it cannot publish, approve or change authoritative
content in MVP. D-057 stores each legal language publication as its own immutable
content object/hash and binds the exact language, wording and affirmative action to
presentation/acceptance. D-032 notification intents similarly bind recipient locale,
catalogue/template version and rendered-content fingerprint before dispatch.
Historical artifacts do not rerender when catalogues or preferences change.

Store dates, instants, money, identifiers, controlled values and enum/API/import
codes canonically under D-045/D-047/D-051. Format display through `Intl` with explicit
locale/timezone/currency/options and a verified full-ICU Node runtime; record Node,
ICU/CLDR, tzdata and catalogue identities in the release manifest. Never apply
locale-aware case conversion, digit substitution, collation or transliteration to
registration, licence, VIN/chassis/engine, FASTag, invoice, command or lookup identity.
Money uses backend decimal/minor-unit authority and an unambiguous currency label;
legally material times show the governing date/zone. Machine CSV/XLSX/API columns,
stable codes and ISO values remain invariant; a localized workbook may translate
instructions and display labels but retains canonical keys and manifest mapping.

Preserve user-entered Unicode according to D-047, without inventing transliterated
identity matches. Set document `lang`, annotate a genuinely different-language part,
derive layout direction from the locale and isolate injected names/identifiers with
`bdi`/`dir="auto"`. Build logical-direction CSS and RTL-capable components now even
though the complete MVP UI is LTR. Self-host reviewed, licensed, versioned fonts for
every released script from the immutable asset origin; use no remote font/CDN and
test glyph coverage, fallback, layout shift and generated PDF/XLSX rendering.

Each new locale passes catalogue-schema/type checks, missing/unused-key checks,
pseudolocale and 30–50% expansion, plural/number/date/currency cases, SSR/client
hydration, font/glyph and line-break coverage, LTR/RTL isolation, keyboard/reflow,
screen-reader language/pronunciation, email/public page/PDF/export rendering and
representative native-speaker journey review. Publication requires translation,
legal/domain, support and incident templates plus rollback to the previous complete
catalogue. Defer a translation-management SaaS, live machine translation,
cross-script fuzzy search/transliteration and tenant-custom UI wording until separately
threat-modelled, privacy-reviewed and justified.

Implementation references:

- [DPDP Act 2023, section 6(3)](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf)
- [Constitution of India, Eighth Schedule](https://www.legislative.gov.in/static/uploads/2025/08/7af1daa22d65f9d04c00ae9b9aa5a799.pdf)
- [RFC 5646 / BCP 47 language tags](https://www.rfc-editor.org/info/rfc5646/)
- [Unicode Locale Data Markup Language](https://unicode.org/reports/tr35/)
- [Next.js internationalization guide](https://nextjs.org/docs/app/guides/internationalization)
- [`next-intl` App Router guide](https://next-intl.dev/docs/getting-started/app-router)
- [Node.js internationalization/ICU support](https://nodejs.org/api/intl.html)
- [WCAG 2.2 language requirements](https://www.w3.org/TR/WCAG22/#language-of-page)
- [W3C inline bidirectional markup](https://www.w3.org/International/articles/inline-bidi-markup/)

### 11.6 Key screens

- D-070 organization implementation workspace showing named responsibilities,
  immutable scope/configuration, checklist, representative pilot, manifest-bound
  rollout waves, exact population/provider/capacity outcomes, readiness approval,
  hypercare reconciliation and handover; it must not collapse these into one
  progress/compliance percentage.
- Overview with compliance distribution, high-risk findings, upcoming expiries and sync health.
- Asset/driver searchable tables with saved views and bulk actions.
- Asset/driver 360° record with identity, facts, evidence, compliance, assignments and history.
- D-053 lifecycle timeline showing separate management episodes, ownership/custody,
  authoritative regulatory status, operational availability and compliance; sale,
  transfer, NOC, scrapping and cancellation milestones must not collapse into one badge.
- Verification inbox with side-by-side conflicts and source evidence.
- Renewal case workspace with ownership, SLA and approvals.
- Unified approval inbox with requester/reason, safe exact proposal/impact,
  evidence, required functions, current/invalidated decisions, expiry and distinct
  approved/executing/reconciliation states.
- D-050 correction workspace showing reason, effective/record time, immutable
  source, impact preview, approval, compensation and reconciliation status; no
  generic delete/undo control may imply that a committed action disappeared.
- D-053 offboarding/reactivation/archive workspace with dependency and billing/
  monitoring/retention impact preview, active-duty resolution, approval state,
  scheduled effective time, per-subject bulk outcomes and closure-watch expiry.
- Policy catalogue, jurisdiction coverage and tenant-extension settings.
- Reference-data operations workspace for Thaarei reviewers, with unmapped values,
  evidence, mapping precision, collisions, shadow impact, approval and activation;
  tenants can submit a review request but cannot edit statutory mappings.
- Data-quality and reconciliation workspace with dimensional trends, exact
  populations/exclusions, rule versions, owned findings, remediation state and
  incomplete target receipts; separate it visually from compliance findings.
- Import wizard with validation preview and error download.
- Plan/usage/billing area with immutable quote/tax preview, managed-capacity and
  add-on allocation, receivable/payment status and distinctly labeled statutory
  invoice/note, IRN, Razorpay/bank receipt, refund and withholding evidence.
- Personal profile and security area for pending/verified email state, passkeys,
  TOTP/recovery methods, active-session review/revocation, recent security events
  and privacy/deletion requests; it must never imply that browser metadata is a
  trusted device.
- Organization membership administration showing invitation state separately from
  active/suspended/ended membership episodes, scoped authority and last-owner
  protection; tenant administrators receive no global-user administration control.
- Legal center showing the exact current and historical user/organization terms,
  notices, contracts, accepting capacity, effective/superseded state, required
  reacceptance and downloadable copies; privacy consent/withdrawal remains visibly
  separate and no view/download/delivery indicator is labeled acceptance.
- Restricted legal-preservation console for request, authority/basis review, typed
  scope/impact, D-054 approval, exact bindings, custody/reconciliation health,
  scheduled review, release and resumed deletion; requesters never gain evidence
  access and tenants have no self-service activation/discovery query.
- Authenticated and public privacy-request experiences with generic intake,
  proportionate verification, one tracking reference, matter-by-matter status,
  secure short-lived responses, withdrawal and grievance/escalation; a separate
  fiduciary/processor case console exposes waiting party and receipt completeness.
- Authenticated organization support centre with scoped case list, structured
  intake, safe resource links, participants/visibility, priority/service-clock and
  message/status timeline; an attachment-free non-enumerating account-access form
  and the independent status/outage contact remain separate. Thaarei's service
  console shows routing, specialist links, waiting party, escalation and support-
  access state without making a ticket an access grant.
- D-060 language selector available before consent/privacy identity disclosure,
  immutable language-specific legal presentation, and an operator catalogue-
  completeness/reviewer/release view; no control implies that a partial translation
  is a supported complete product locale.
- Tenant settings generated only from D-055 allowlisted typed definitions, showing
  effective value/scope, bounds, version and impact without exposing platform rules.
- Platform configuration/rollout console with definition/version, cohort impact,
  process generation health, D-054 approval, expiry/removal debt, kill-switch state
  and rollback/reconciliation; it is never available through tenant routes.
- Platform operations console isolated from tenant application routes.

### 11.7 Performance, browser support and verification

Publish the exact pilot browser matrix. Support the current and previous major
Chrome/Edge, Firefox and Safari releases plus supported iOS Safari and Android
Chrome; installability is progressive enhancement and unsupported installation
cannot remove ordinary browser functionality.

At p75 of supported real-user conditions target LCP at or below 2.5 seconds, INP
at or below 200 milliseconds and CLS at or below 0.1. Apply route code-splitting,
server pagination/filtering, bounded payload/page sizes, stable loading skeletons
and measured virtualization; no unbounded table/chart response or unapproved
third-party script. Maintain route-level bundle/regression budgets from the
representative pilot device/network profile.

Automate desktop/mobile Playwright journeys, context-switch/query-clear behavior,
the browser-storage allowlist, sensitive-URL absence, connectivity loss/retry/
conflict behavior, install/standalone presentation and document/export cache
prohibition. Combine accessibility automation with keyboard, zoom/reflow and
screen-reader testing. Include D-060 pseudolocale expansion, exact `lang`/direction,
mixed-script isolation, full-ICU locale corpus, missing-key and SSR/hydration checks.
Collect privacy-safe Core Web Vitals without tenant or personal fields. CI rejects
an unapproved service worker, offline-persistence dependency, remote font or runtime
translation provider.

Implementation references:

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [MDN Background Synchronization availability](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)

## 12. Bulk onboarding architecture

The primary human format is a versioned macro-free XLSX onboarding workbook. The
secondary format is one UTF-8, header-bearing, RFC-4180-compatible CSV contract per
entity. The UI generates an organization-specific workbook containing only the
selected modules and an import manifest, instructions, enumerated lookups and
examples. Supported sheets cover locations, fleets, assets, drivers, engagements,
fleet/location eligibility, custodianships, duties, vehicle combinations,
credential metadata and an optional evidence manifest.

D-060 permits translated instructions, help and display labels in an approved
workbook locale, but sheet/column machine IDs, manifest/schema versions, stable
codes, identifier characters, ISO date values and import semantics remain invariant.
The preview records the template locale independently from the canonical contract;
changing locale cannot reinterpret submitted data.

Every contract declares its template/schema version and organization timezone.
D-045 legal dates use strict `YYYY-MM-DD`; instants use RFC 3339 with an explicit
offset and normalize to UTC on acceptance. A date column cannot contain a timestamp
and an instant cannot contain an offset-free local value. Identifier columns are
text to preserve leading zeroes and avoid scientific notation. Each column
declares its D-047 identifier type and accepted repertoire; the preview shows the
exact entered and display-safe form plus the outcome of the current versioned
canonicalizer without disclosing restricted canonical/HMAC data. Every
row has a stable `client_row_ref`; relationships use that reference or an explicit
authorized existing-record UUID/customer code. Internal UUIDs are always generated
by the platform. Registration/licence numbers, names, mobiles and filenames are
never primary keys.

Every policy-significant enumeration uses the active D-051 stable Thaarei code;
generated lookup sheets include code, label, description and publication version.
Labels may aid entry but are not identity. Unknown/free-text statutory values are
blocking or review issues according to materiality and cannot be fuzzy-mapped;
tenant-defined tags use an explicitly separate namespace and column.

Asset rows use independent `primary_fleet_code`, `home_location_code` and
controlled tag columns. A missing fleet/location is allowed, but overlapping
primary relationships are not. Imported values are tenant-asserted facts until an
approved authoritative source verifies them; an import cannot manufacture an
authoritative or compliant state.

Import operation is explicit, never inferred:

- **Onboarding/create-link:** creates drafts and may link relationships to an
  existing record only by an authorized UUID or unique customer code. A possible
  natural-key match becomes a conflict to resolve, not an automatic merge/update.
- **Controlled update:** requires a system-generated template containing
  `record_id` and `row_version`, uses optimistic concurrency and permits only
  documented tenant-editable fields. It cannot overwrite authoritative facts,
  immutable evidence/observations/evaluations, billing history or audit records.
- **No delete mode:** offboarding, relationship termination, credential/evidence
  supersession and erasure use their normal audited workflows. Relationship change
  closes the old interval and creates a new one rather than rewriting history.

Duplicate detection follows D-047, is organization-local and exposes no cross-
tenant match. An exact identifier may propose an authorized link or block
activation in the resolution queue; it never silently merges. Name, mobile, DOB,
address and fuzzy similarity are candidate hints only and never merge drivers.

### 12.1 Import workflow

```text
created → uploaded → quarantined → scanning → staged → validating
        → needs_correction | ready
        → approved → committing → committed
        → activation_pending → completed
```

Failed and cancelled are explicit terminal states. Workflow:

1. Download a generated versioned template.
2. Upload to the quarantine storage class through an exact-object presigned path.
3. Validate authorization, size, extension, detected type/signature and malware
   result before an isolated no-egress parser can read it.
4. Parse into tenant-scoped staging without changing domain records or calling ULIP.
5. Validate headers, fields, D-047 character/canonicalizer rules, D-051 stable
   codes/reference-publication compatibility, references,
   duplicate candidates, identifier/relationship intervals, tenant ownership,
   optimistic versions and permitted operations. Pin the identifier catalogue and
   normalizer versions plus reference/mapping publication into the immutable preview.
6. Display blocking errors, acknowledged warnings, conflicts, before/after values,
   proposed creates/links/updates, activation eligibility and capacity impact.
7. Freeze an immutable, dependency-complete commit set and preview hash. Any data
   or source-row change invalidates approval.
8. An authorized user approves one or more commit sets. Invalid rows may remain in
   staging, but a selected set never silently skips a row.
9. Commit at most 5,000 rows per set in one bounded database transaction, recording
   row lineage and transactional outbox events. Idempotency includes organization,
   batch, set, template version, row reference, operation and payload hash.
10. Leave created subjects in `draft`; activate separately in selected waves.

Validation emits D-052 atomic rule results by row/field/dimension and separates
blocking errors from remediable warnings. Batch dashboards show exact denominators,
excluded rows and rule/template/reference versions rather than one quality score.
A committed row may create an owned data-quality finding, but it cannot silently
promote that issue into a compliance failure or suppress an indeterminate result.

Initial configurable ingestion guardrails are 20 MB per CSV/XLSX, 10,000 data rows
per sheet, 25,000 staged rows per batch and 5,000 rows per atomic commit set. Bound
columns, cell/string length, expanded ZIP size, compression ratio, relationships,
XML features, parser time and memory. Reject XLS/XLSB/XLSM/XLAM/ODS, archives,
macros, formula cells, external links, embedded objects and unknown sheets/columns.
Do not trust declared MIME. Unknown columns or template-version mismatch produce
actionable errors, and a blank cell never silently erases an existing value.

Committed drafts do not consume managed-asset capacity and receive no scheduled
verification, monitoring or operational assignment. Activation rechecks duplicate
state and D-047 active-identifier exclusivity under current canonicalizers, plus
permission, capacity, data version, required purpose/authorization and minimum
identifying/ownership information and D-052 critical activation rules. It does not
require every future compliance field and does not imply accuracy, verification or
eligibility. The transaction changes state, records the billing meter
event and writes ULIP-verification outbox work together. Provider
work is always asynchronous and D-010-paced; the UI shows `verification_pending`,
not verified/compliant, until results exist. Provider failure does not undo the
asset but produces explicit pending/stale/indeterminate state.

Cancellation before activation may remove drafts created exclusively by the
batch. After any record is activated there is no generic spreadsheet rollback;
normal audited correction/offboarding applies. Retrying a commit set returns its
existing outcome. Manual forms call the same normalization, validation, duplicate,
activation and outbox use cases.

Credential metadata precedes evidence. Evidence files are uploaded individually
through D-014 quarantine and mapped only by exact row/credential reference; do not
infer a subject from its filename and do not accept ZIP archives in MVP. Raw import
files, previews and row-error downloads are temporary under an approved retention
profile. Durable structured lineage retains source hash, template/parser version,
actor/approval, warnings/counts, row outcomes, linked/created IDs, commit hashes,
activation events and source-object deletion confirmation without retaining the
raw spreadsheet indefinitely.

### 12.2 Customer implementation, go-live and handover

D-070 turns customer onboarding into a governed operating process rather than a
one-time import. An approved application, paid subscription or `active`
organization authorizes only its exact commercial and access capabilities. It does
not mean that implementation is complete, every imported subject is active, an
authoritative source has returned, or any subject is compliant. Maintain one
organization-level `ImplementationEngagement` with this primary lifecycle:

```text
planned -> discovery -> configuring -> data_staging -> pilot_wave
        -> rollout_waves -> go_live_ready -> live_hypercare
        -> handed_over -> closed
```

`paused` and `cancelled` record reason, authority, time, affected work and restart
or closure conditions. They neither suspend tenant access nor erase committed
records automatically. The implementation lifecycle is independent of D-049
organization access, D-053 subject management, subscription/entitlement state and
D-005 verification/compliance posture.

Every engagement names a Thaarei implementation lead and the customer's executive
sponsor, organization owner, fleet-operations owner, compliance/document owner,
data-import owner, billing contact and security/escalation contact. Record function,
authority, effective period and substitute; a contact address or meeting attendance
is not approval authority. This makes responsibility reviewable in the manner
recommended by NIST CSF 2.0's Govern function rather than leaving launch to an
informal project checklist: [NIST CSF 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20).

Discovery publishes an immutable implementation-scope version covering:

- legal/operating and payer entities, contract and authorized representatives;
- states, routes, locations, vehicle/trailer/driver populations, classes, ownership,
  cargo and operation types, including D-048 supported and unsupported policy cells;
- fleet/location/tag model and identity/customer-code conventions;
- users, memberships, role/scope assignments, MFA and controlled recovery;
- ULIP datasets, purposes, processing authority, entitlement, quota, expected load,
  freshness and escalation assumptions;
- source-data owners, workbook/template version, mappings, required fields,
  documents/evidence and duplicate/conflict process;
- notification recipients, digest windows and mandatory escalation paths;
- D-020 retention, D-066 residency, D-068 rights/use restrictions and support/
  incident contacts; and
- training audience, launch criteria, rollout constraints, hypercare and handover.

A material change produces a new scope version and invalidates affected readiness
or wave approval; it never silently edits an accepted baseline. Use the ordinary
RLS-protected production data plane for organization-isolated quarantine, staging,
drafts and rollout records. Do not create a customer-specific application,
database, deployment or ad hoc spreadsheet source of truth. Real customer data
enters only after the applicable commercial, authority, purpose, privacy, residency
and security gates. Demonstrations and role training use a separate synthetic-data
organization, never a production copy.

The first activation is a deliberately representative cohort, normally 10–25
vehicles plus their related drivers. Select it across material registration states,
vehicle classes, owned/leased/contract operation, permit/document conditions,
ULIP paths, complete/incomplete/near-expiry data and expected identifier conflicts;
do not take the first rows merely because they are convenient. This controlled
exposure follows the useful delivery principle of beginning with limited real users,
learning and expanding only when operations can sustain them:
[GOV.UK beta-phase guidance](https://www.gov.uk/service-manual/agile-delivery/how-the-beta-phase-works).

After the customer accepts the pilot result, schedule remaining subjects in bounded
waves. An initial 50–100-subject range is a planning assumption, not a fixed limit
or entitlement. Calculate the safe size and start rate from current per-dataset
ULIP quota/cost/concurrency and health, normal refresh demand, retry budget, critical/
provider worker headroom and human conflict-review capacity. Reserve capacity under
D-010 before activation and stop admission when safe capacity is not proven. Each
wave freezes an immutable manifest with its subjects, source/preview/commit hashes,
template/parser/normalizer/reference/policy versions, owners, planned window,
capacity/billing effect, expected provider calls, warnings/exclusions, approval and
actual per-subject/provider/reconciliation result. A failed or paused wave prevents
later wave start; it does not roll back valid earlier subjects.

Activation remains per subject. Draft, activation-pending, active, provider-pending,
stale, indeterminate and D-053 lifecycle states stay distinct. Partial rollout is
permitted when the UI and every report show exact total, activated, evaluated,
pending, excluded and failed denominators. An unevaluated or excluded subject is
never `clear`. No wave-level badge may conceal a subject failure.

`go_live_ready` requires a current evidence snapshot proving at least:

- contract/subscription/first-owner state, intended entitlements and D-049 access;
- tested privileged memberships, scopes, MFA, recovery and preferably two active owners;
- approved D-048 scope with explicit unsupported cells and customer acknowledgement;
- production dataset entitlement, credentials, fixed egress/IP allowlisting,
  written quota assumptions and provider diagnostics;
- accepted representative pilot, reconciled import/activation counts and no open
  critical identity collision, wrong-subject binding or cross-tenant defect;
- safe rollout/worker/reviewer/provider capacity and billing-meter reconciliation;
- tested notification, support, incident, observability, backup and recovery paths;
- required owner/admin/compliance training completion; and
- an immutable baseline containing exact `clear`, `attention_required`,
  `known_failure`, `indeterminate`, pending, stale and excluded populations with
  `as_of`, policy/reference/source/freshness versions and open issues.

Readiness does not require every subject to be clear, but every material gap needs
truthful visibility, an owner and an accepted disposition. It is an operational
launch decision, not D-069 certification or a waiver of Data Principal, provider,
customer or Thaarei responsibility. Sustainable live operation also requires
security, monitoring, support preparation, metrics, availability and continuing
test capability, rather than deployment alone:
[GOV.UK live-phase guidance](https://www.gov.uk/service-manual/agile-delivery/how-the-live-phase-works).

Go-live is a D-054 Tier-2 transaction requiring the Thaarei implementation lead,
an independent Thaarei product/operations or compliance function, and an authorized
customer owner/compliance function. The proposal binds scope/configuration version,
pilot/wave outcomes, capacity evidence, baseline, exclusions/open issues, launch
time, hypercare plan and exact acceptance wording. Customer acceptance confirms
configuration and disclosed launch conditions; it cannot certify lawfulness, waive
rights, upgrade customer data to issuer evidence or transfer Thaarei's stated
platform responsibilities.

Before a commit, reject/discard and replace staging safely. After commit but before
activation, batch-exclusive drafts follow D-018. After activation, use D-050
correction/restatement and D-053 offboarding; never run a database/spreadsheet
rollback or erase history. Retrying a wave is idempotent and returns its durable
per-subject results. No external system supplies onboarding data or an operational
fallback.

Training is role-specific for owners, administrators, fleet managers, compliance
reviewers, verification operators, billing users and read-only/audit users. It
covers D-069 claims, uncertainty/freshness, evidence handling, approvals,
corrections, exports, privacy, support and incident escalation. Record privileged
owner/admin/compliance completion before go-live without turning course completion
into permanent authorization or a user productivity score.

Run a default ten-business-day `live_hypercare` period. Perform daily automated
count, billing, import/activation, ULIP queue/freshness/failure, notification and
case reconciliation for its first three business days; route P0/P1 through D-021/
D-063 rather than inventing a weaker implementation SLA. Handover requires no open
critical platform/isolation defect, reconciled counts and meter, provider work
inside the accepted envelope, owned material issues, customer ability to perform
core journeys, and confirmed ordinary support/escalation ownership. Preserve the
final handover acceptance and move ongoing work into service management. Define
implementation success through exact lead-time, rejection/conflict, activation,
provider-queue/freshness, unresolved-material-issue, training and support measures,
never an opaque customer/compliance score:
[GOV.UK service-performance guidance](https://www.gov.uk/service-manual/service-standard/point-10-define-success-publish-performance-data).

## 13. Authentication and authorization

### 13.1 Authentication

Use a pinned, reviewed stable release of self-hosted Better Auth as an identity
component, not as the SaaS tenant model. Better Auth owns global users, verified
email identities, password credentials, passkeys/WebAuthn credentials, TOTP and
opaque sessions. Thaarei owns organizations, invitations, memberships, roles,
grants, tenant activation and support authorization. Do not enable Better Auth's
Organization model as an independent tenant/role authority. A user may have
memberships in several organizations, but every request revalidates the selected
organization membership and permission before establishing RLS context.

MVP authentication methods are verified email/password and passkey. Passkeys are
enabled during pilot as the preferred method and require WebAuthn user verification.
Password plus authenticator-app TOTP is the compatibility MFA path. Social login,
magic-link login, SMS/email OTP as a privileged second factor and phone-number
login are out of MVP. Enterprise SSO/SCIM remains a later entitlement behind an
identity-provider adapter and must map to application-owned membership.

Password controls:

- require at least 15 characters when password is the sole factor and at least 12
  when mandatory MFA is enrolled;
- allow password-manager paste, spaces and Unicode; do not impose arbitrary
  composition rules or periodic rotation;
- reject compromised/common values, use Better Auth's configured memory-hard
  salted hashing, version its cost parameters and permit controlled rehash;
- prevent account enumeration and apply account/network-aware progressive
  throttling to login, reset, invitation and authenticator challenges.

Password plaintext is never recoverable. Recovery codes and reset/session tokens
are stored as one-way hashes where the component permits; TOTP seeds are encrypted
under D-024's dedicated identity-data envelope key. Passkey public keys are not
secrets but their metadata remains protected. Contract tests must verify Better
Auth's actual adapter schema and storage behavior before pilot; customize the
adapter if it would otherwise persist a recoverable authentication secret in
plaintext. The normalized login email remains in the narrowly authorized identity
schema because lookup/delivery require it and is never exposed as tenant-wide data.

MFA is based on effective permission, not role name alone. It is mandatory for
owners/admins, billing administrators, policy publishers, operational-exception
approvers, and anyone granted unmasked driver PII, evidence download, raw-provider
payload, export or support access. Tenant users satisfy it with a user-verifying
passkey or password plus TOTP. Every Thaarei operator must register at least two
phishing-resistant passkeys/security keys; TOTP-only routine operator access is
not allowed. Disable trusted-device MFA bypass for every privileged user.

Sessions and step-up controls:

- use opaque database-backed sessions and a same-origin authentication path;
- issue only a `Secure`, `HttpOnly`, `SameSite` `__Host-` cookie, keep tokens out of
  URLs and browser storage and enforce origin/CSRF protections;
- require reauthentication after one hour of inactivity and within a 24-hour
  absolute window; let users review and revoke active sessions;
- store authentication time, method and assurance server-side; a new privilege
  or organization selection never inherits unproven assurance from the client;
- rotate or revoke sessions after password, email, authenticator, recovery,
  membership, role, grant or ownership change and on membership suspension;
- require MFA/passkey authentication no older than ten minutes for owner transfer,
  privileged membership/grant changes, authenticator/recovery/SSO changes,
  operational-exception approval, unmasked sensitive access, document download,
  bulk export and support/break-glass activation.

The first owner membership activates only through the approved organization
activation workflow. Later invitations are application-owned, single-use,
revocable, stored as a token hash and expire after 72 hours. Acceptance requires
an authenticated user with the exact normalized, verified invited email. Resend
invalidates the old token; a pending invite or verified company domain grants no
access. The last active owner cannot be removed or leave.

Account recovery must not bypass the original assurance:

- saved recovery codes are single-use, shown only at creation and protected at rest;
- password-reset links are single-use, stored as hashes and expire after 30 minutes;
- email reset may replace a password but cannot disable/bypass MFA;
- security questions are prohibited;
- privileged lost-factor recovery requires a support case, identity and
  organization-authority verification, two Thaarei approvers, revocation of all
  sessions, notice to the user and all active owners, and a 24-hour security hold
  before privileged access is restored;
- platform-operator recovery follows a separately owned break-glass procedure and
  cannot be requested and approved by the same person.

Authentication and recovery secrets are protected through the self-hosted secrets/key path, never editable
in product settings and never logged. Authentication dependency updates require
security regression tests and explicit release review.

### 13.2 Human identity and account lifecycle

D-056 treats authentication identity, contactability, authenticators, sessions and
tenant authority as related but independent state. A Better Auth global user UUID
is the stable login subject. Its normalized verified email is a mutable login and
notification attribute, never an entity key or proof of employment, driver identity,
company authority or tenant ownership. The same user may hold independent effective-
dated memberships in several organizations. A driver remains an organization-local
operational profile under D-002; when a driver also needs application access, a
narrow authorized organization-local link may reference the global user UUID but
must copy no credential, authenticator, session or cross-tenant information.

Model independent lifecycle records rather than a single account flag:

```text
global account: active -> security_locked -> disabled -> deletion_pending -> erased
login email:    pending_verification -> verified -> change_pending -> replaced/revoked
authenticator:  pending -> active -> suspended/revoked
session:        active -> expired/revoked
invitation:     pending -> accepted/expired/revoked
membership:     active -> suspended -> ended
```

An invitation is not a membership and conveys no discovery or authorization. Its
acceptance creates an effective-dated membership episode bound to the authenticated
global user UUID. Rejoining after an ended membership creates a new episode without
rewriting the old one. An organization owner/admin may suspend or end only that
organization's membership; this must immediately deny tenant authority and queued
tenant effects without disabling the user's other memberships. Only a narrowly
authorized Thaarei security process may place a reasoned, reviewable global
`security_locked`/`disabled` state and revoke access across every organization.
Shared human accounts and shared login mailboxes are prohibited because actions
must remain attributable to one person; a group address may be only a billing or
notification destination. Last-owner and ownership-transfer rules still apply.

Changing a login email is a security-sensitive identity operation:

1. require an authenticated session and MFA/passkey assurance no older than ten
   minutes where enrolled or required;
2. create a single-use, expiring pending change without altering the active email;
3. confirm intent through the existing verified address and verify possession of
   the new address through a distinct token;
4. recheck normalized uniqueness without an existence-revealing response, commit
   the verified replacement, rotate the current session and revoke all others;
5. notify both addresses, and notify active organization owners when the changed
   user holds an owner/admin membership; and
6. audit safe hashes/identifiers, state and outcome without publishing addresses
   to tenant-wide logs or views.

If the old address is unavailable, the controlled recovery path applies and the
ordinary workflow cannot omit old-address confirmation. Memberships remain attached
to the global UUID. Pending invitations remain bound to the exact invited verified
email and require explicit revocation/reissue; they never follow an address change.
One normalized verified email may belong to only one active global user, but email
reuse after erasure creates a new UUID and restores no membership, ownership,
approval, session or audit identity.

Disable Better Auth account linking, implicit same-email linking, different-email
linking and unlink-all behavior in MVP even though social login is also disabled.
Do not implement general user-account merge. Name, phone, organization domain,
driver data or email similarity can never link identities or expose a cross-tenant
match. A verified duplicate support case may move specifically approved memberships
between two separately controlled users through D-054; it does not combine passwords,
passkeys, TOTP, recovery material, sessions or audit histories. Future SSO links use
the reviewed provider issuer and subject through an authenticated provisioning
workflow, never email alone.

Authenticator lifecycle rules are explicit. Permit multiple authenticators and
encourage two independent means of authentication/recovery. A privileged user may
not remove the last factor required by current permissions. Binding, renaming,
suspending, revoking or replacing passkeys/TOTP and regenerating recovery codes
requires the declared step-up; regeneration invalidates the whole previous code
set. Factor changes revoke other sessions and send an independent security notice.
A passkey's user label and browser metadata are convenience data, not trusted
device identity. Suspected lost/compromised authenticators can be revoked promptly;
privileged lost-factor replacement follows D-016 recovery and its security hold.

Use only opaque database-backed sessions for authoritative validation; do not use
stateless sessions or a cookie cache that can extend revoked authority. The security
page lists active sessions using creation/last-activity time and a coarse browser/
OS label and permits revoking one, all others or all. IP address and detailed user-
agent data are bounded restricted security metadata, not tenant-visible identity,
and browser fingerprinting is neither required nor presented as a trusted device.
Every request still revalidates selected organization membership, permission and
assurance, so membership/scope changes take effect even before session cleanup.

Do not expose Better Auth's direct hard-delete or administrative identity mutations
to browsers or tenant administrators. A user privacy/deletion request enters an
application-owned, idempotent operation that checks recent strong authentication,
last-owner and active-approval/work ownership, security investigation, retention
and legal-hold obligations; reassigns or closes work; ends eligible memberships;
revokes every session/authenticator; removes credentials and no-longer-authorized
personal attributes; and emits audit/outbox/reconciliation receipts. Required
tenant business/audit events retain only the permitted stable actor tombstone and
must not retain reusable login material. Restore processing reapplies the erasure/
tombstone state before access or jobs can resume.

This contract deliberately constrains rather than merely exposes Better Auth's
[user/email/delete functions](https://better-auth.com/docs/concepts/users-accounts),
[session listing and revocation](https://better-auth.com/docs/concepts/session-management)
and default-capable [account linking](https://better-auth.com/docs/reference/options).
Its step-up, dual-address email-change and session response follow OWASP's
[authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html),
while multiple factors, binding/revocation records and independent notification
follow NIST SP 800-63B-4's
[authenticator-event guidance](https://pages.nist.gov/800-63-4/sp800-63b/events/).
Account suspension/termination notices and redress follow NIST SP 800-63A-4's
[subscriber-account lifecycle](https://pages.nist.gov/800-63-4/sp800-63a/accounts/).

Fastify owns this lifecycle workflow and calls Better Auth only through a pinned
identity adapter. Each sensitive operation has an idempotency key, expected identity
version and application operation state; authorization, audit and notification
intent are durable before external/library effects, and a reconciler detects and
finishes or safely escalates partial outcomes. No Better Auth route, plugin or admin
method may bypass the application policy, D-054 approval where required, audit,
outbox, privacy or tenant boundary.

### 13.3 Authorization

Authorization is an application-owned hybrid of role, attribute and relationship
checks. The product owns a stable granular permission catalogue and these fixed,
versioned MVP role templates:

| Role | Typical capabilities |
| --- | --- |
| Owner | Organization lifecycle, data authority and owners/admins; commercial access only when separately granted |
| Admin | Users, fleets, locations, policies, imports, integrations and settings |
| Compliance manager | All compliance records, cases, verification and permitted operational exceptions |
| Verifier | Review evidence and provider conflicts within granted scope |
| Fleet manager | Manage granted fleets/assets/drivers and operational tasks |
| Billing admin | Subscription, invoices, payment methods and usage only |
| Viewer/auditor | Read approved records with restricted PII/evidence access |

Permissions use action-oriented identifiers such as `membership.invite`,
`fleet.manage`, `driver.read_sensitive`, `evidence.download`,
`exception.approve`, `policy.publish`, `billing.manage` and `export.download`.
Tenants may assign several templates and access scopes but may not edit role
definitions, create custom roles or configure explicit-deny rules in MVP. A later
Enterprise custom-role feature requires permission-catalogue stability, migration
semantics, escalation analysis and a complete authorization matrix.

Each effective-dated role assignment has one or more complete access-scope
bundles. Organization match is always required. IDs inside one dimension are
ORed; populated dimensions intersect. For example, fleets `[A, B]` and location
`Chennai` means assets currently in fleet A or B **and** at Chennai, not the union
of those populations. Multiple complete bundles are ORed. An empty dimension is
not organization-wide unless explicitly marked as such. Tags, saved filters and
frontend state are never authorization boundaries.

Operational resource access follows current effective fleet/location and, for
drivers, applicable eligibility/custody/duty relationships. Once a resource moves
outside scope, ordinary current-profile access ends. Historical access is a
separate permission and is limited to intervals that matched the user's scope
unless an organization-wide audit grant applies. Scope changes retain history and
invalidate authorization caches/sessions as required.

A central policy-decision function evaluates actor, active membership, action,
role permission, matching scope bundle, resource relationship, field/data class,
authentication assurance/step-up age, workflow state and product entitlement.
It returns a deny-by-default decision and safe reason code. Every API read or
mutation, job, list/search/aggregate, export and object grant invokes the decision
or a compiled equivalent. Filtering occurs before counts and pagination. The UI
is explanatory only, and feature entitlements never grant user permission.

- A user may assign only role/scope combinations they are authorized to
  administer and cannot promote themselves to Owner or delegate permissions they
  do not control.
- PostgreSQL RLS enforces organization isolation; the application policy enforces
  fleet/location/resource/field/workflow access. Missing organization context
  fails closed.
- Background jobs use purpose-bound service principals and explicit organization
  context, never a copied browser session.
- Field-level policy protects DOB, address, mobile, licence identity, uploaded evidence and provider payloads.
- Dispatch-oriented access exposes only the contextual decision, necessary vehicle
  classes and freshness; fleet managers see masked driver identifiers. Full DOB,
  address, licence identity or raw provider data requires a dedicated permission,
  step-up MFA, a recorded reason and short access duration.
- Download permission is distinct from record-view permission.
- Exports require explicit permission, apply the same field policy as interactive
  views, are always audited and cannot become a PII-permission bypass.
- Denied access and privileged grants/changes are audited without disclosing the
  inaccessible object's sensitive content.

Separation-of-duty constraints are evaluated independently of role labels:

- an operational-exception requester cannot approve the same exception;
- one person cannot be the sole statutory-policy drafter, reviewer and publisher;
- a billing credit/manual-entitlement requester cannot approve it;
- a privileged-recovery or support-session requester cannot approve it;
- support cannot approve tenant exceptions, publish tenant policy, transfer
  ownership, alter billing authority or grant itself access;
- owner transfer requires fresh MFA and another active owner's approval; the
  single-owner case uses controlled Thaarei recovery;
- the last active owner cannot leave, be removed, suspended or expire.

### 13.4 Approval and transaction authorization

D-054 provides one shared server-side integrity boundary for every maker/checker
workflow while leaving business meaning in its domain module. It follows NIST's
requirement to identify duties needing separation and define supporting access
authorizations ([SP 800-53 AC-5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final))
and OWASP guidance to bind authorization to server-generated transaction data,
prevent modification/skipped steps, check again at execution and make credentials
unique and time-bounded ([Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)).
Approval policy selection is server-owned; a client cannot request a weaker method.

Use four tiers:

1. **Tier 0 — authorized command:** ordinary D-017/D-022 permission, expected-
   version, idempotency and audit checks; no separate approver.
2. **Tier 1 — step-up confirmation:** one authorized actor explicitly confirms an
   exact impact preview with D-016 fresh MFA; this proves transaction intent, not
   separation of duties.
3. **Tier 2 — independent approval:** requester plus one different currently
   eligible approver.
4. **Tier 3 — multi-function approval:** two or more distinct people satisfying
   named functions, such as compliance plus owner or security plus operations.

D-021 break-glass is a separate emergency state machine and never retroactively
approves normal work. Every immutable approval policy version defines domain action,
tenant/platform boundary, tier, requester/approver permissions and scopes, required
functions/quorum, distinct-person/conflict/delegation rules, assurance/step-up,
proposal/vote/execute deadline, required evidence/impact, execution mode,
invalidation inputs, notification/escalation, owner/reviewers and effective period.

The server-generated proposal snapshot contains action, organization/control-plane
scope, affected subjects, safe before/after and field categories, effective time,
expected aggregate versions, policy/reference/configuration/lifecycle versions,
billing/compliance/privacy/assignment/monitoring effects, evidence references,
requester/reason and a canonical proposal hash. Restricted values are displayed
only through ordinary field/purpose authorization and are not copied into approval
or audit payloads. Any material proposal/input change creates a new snapshot and
invalidates every prior decision.

Approval lifecycle is:

```text
draft → submitted → pending_approval → quorum_reached → executing → executed
                    ↘ rejected | cancelled | expired | invalidated
                                         executing → execution_failed
```

Rejection/cancellation/expiry/invalidation and each decision are immutable.
Editing or resubmitting creates a new request linked to the former one. `approved`,
`executing`, `executed` and downstream `reconciliation_pending/completed` are never
presented as synonyms. Failure remains visible and uses the domain's D-050
compensation where an authorized external effect was already committed.

At vote time and again in the final execution transaction, revalidate active
identity/session, organization membership, permission and field/resource/fleet/
location scope, required function, authentication assurance and ten-minute step-up,
organization/suspension state, delegation, conflict of interest and proposal access.
A requester cannot approve the same Tier 2/3 request; one person, however many
sessions/roles, occupies one quorum position. Machine principals cannot vote.
Thaarei support principals cannot approve tenant business operations, and tenant
administrators cannot satisfy Thaarei legal/security functions. A privilege,
ownership, credit, exception or access beneficiary cannot approve when its policy
marks that conflict. Last-owner protections still apply.

Delegation is a narrower, effective-dated grant recording function/scope, start/end,
reason, delegator and delegate. MVP permits at most one delegation edge, prohibits
cycles, escalation, delegation to requester/beneficiary and using delegator plus
delegate as two independent voters. Cryptographic custody, platform break-glass,
recovery and statutory/security publication are non-delegable unless their exact
policy expressly permits it. Approver absence leads to escalation, cancellation or
expiry—not an implicit bypass.

No request or vote remains usable indefinitely; its domain policy sets bounded
deadlines appropriate to the operation. A tighter current quorum, permission,
assurance or legal/security rule invalidates an incompatible pending request; a
weaker new rule does not silently downgrade it. Membership, role/scope, assurance,
organization state, expected subject version or material impact changes invalidate
affected votes/request. Persist original and execution-time policy versions; no
security/legal tightening is grandfathered silently.

When quorum is reached, one D-022 transaction locks the request/aggregates,
reauthorizes the final actor, recomputes eligible distinct quorum and authoritative
proposal, matches its hash/expected versions, checks current policy, consumes the
one-operation authorization and commits the exact domain mutation or immutable
scheduled-operation record with audit, outbox and idempotency result. A background
worker may execute only that committed envelope and cannot reinterpret/expand it.
A scheduled future command rechecks material state/policy; divergence invalidates
it for new approval rather than executing stale intent.

Approval authorizes only an otherwise permitted transaction. It cannot prove
registered ownership, verify evidence/provider facts, convert unknown to compliant,
override a non-overrideable requirement, exceed capacity, create/delegate a
permission or defeat privacy, retention, provider-contract or legal constraints.
Email is notification only and links to the authenticated application; sensitive
approval never occurs through an email action link. Rate-limit creation/votes/
resubmission, detect rejection spam and abnormal velocity, and security-alert on
self-approval, changed-proposal, expired-vote or quorum-bypass attempts.

### 13.5 Thaarei support access

Thaarei operators have no standing tenant membership or implicit customer-data
access. Support uses a distinct principal and `platform_support_session` recording
the organization, case/incident, requester, approver, allowed actions/data classes,
optional fleet/location scope, reason, assurance, read-only/mutation mode and
start/expiry.

- Normal support requires tenant-owner approval, is read-only by default and
  expires after at most 60 minutes. Mutation capabilities are granted individually.
- Emergency break-glass requires phishing-resistant authentication, two different
  Thaarei approvers, a declared incident and at most 30 minutes of access.
- An extension is a new approval; expiry is enforced server-side and cannot be
  renewed silently.
- Full impersonation is not supported in MVP. A support view remains visibly
  marked and every action records the actual support actor and support session.
- Active owners can inspect support history and are notified when access begins
  and ends. Emergency notice may be briefly delayed only when immediate disclosure
  would interfere with documented incident containment.
- Every support action uses the normal authorization, field masking and audit path
  plus the narrower support-session grant.

### 13.6 Customer support and service requests

D-063 supplies the operational service desk that the rest of the plan assumes. It
does not replace a domain workflow. Keep the following independently authorized
but linkable: ordinary product/service request; account access or recovery under
D-016/D-056; D-021 platform incident; D-019/D-025 security or vulnerability report;
D-059 privacy right/grievance; D-061 billing/finance dispute; and D-050 data or
compliance correction. One customer-facing reference may link several matters, but
each specialist owner, deadline, evidence, outcome and retention policy survives
support-case resolution. A generic ticket cannot downgrade or close a regulated,
security, finance or incident obligation.

MVP intake is:

- an authenticated support centre for organization-scoped product questions,
  defects, import/verification problems, configuration help and feature requests;
- a rate-limited, abuse-controlled, attachment-free public account-access form for
  login, invitation, MFA and recovery difficulty. It returns a generic
  acknowledgement and discloses no user, email, driver or organization existence;
  binding to an organization occurs only after D-056 identity and organization-
  authority verification; and
- D-033's independently resolved status site and a published minimal emergency
  contact route for a main-site outage. That route asks for contact, organization
  name and affected service only and warns against credentials, identity numbers,
  evidence or compliance details. Consequential work is recorded/reconciled into
  the application when available.

Do not parse inbound email into authoritative cases, accept email commands or
attachments, or launch live chat, screen sharing or WhatsApp support in MVP.
Outbound email only announces a generic update and links to a freshly authorized
in-app route. Public privacy and coordinated-vulnerability channels remain visibly
available and route directly to their specialist controls rather than through
account support.

Every case has an immutable UUIDv7, source, requester/contact verification state,
zero or one verified organization, visibility class, authorized participants,
category, structured impact/urgency, calculated priority, product/release/browser
context, typed resource and specialist-matter links, owner/queue, service-policy
version, clock state, next-update commitment, resolution code and safe satisfaction
result. The visibility classes are `requester_private`, `restricted_organization`,
`organization` and `platform_incident_link`. Organization owners/admins receive no
automatic visibility into personal recovery, privacy, whistleblowing or sensitive
security matters. Permission is re-evaluated for every case, message, linked
resource and attachment request; copied or guessed case IDs reveal nothing.

The lifecycle is `new → triaged → assigned → investigating_or_fulfilling →
awaiting_customer → resolved → closed`, with explicit `reopened`, `duplicate`,
`cancelled`, `linked_to_incident` and `transferred_to_specialist_workflow` events.
Transfer does not close the linked obligation. A proposed inactivity closure gives
advance in-app/email notice and cannot auto-close privacy, security, billing, legal
or recovery work. Reopening preserves the original case and clocks rather than
creating a history-free replacement.

Calculate priority from versioned impact and urgency—not from customer plan or a
customer-selected “critical” label. The customer supplies evidence of impact;
Thaarei may change classification only with a reason. Entitlement may improve the
service target but cannot reduce safety, security, privacy or regulatory priority.
The pilot objectives are:

| Priority | Typical boundary | Human-response objective |
| --- | --- | --- |
| P0 | Broad outage, suspected disclosure, unsafe decision or critical invariant | 30 minutes, 24x7, with immediate D-021 routing |
| P1 | One organization blocked from a core workflow with no safe workaround | Two supported hours |
| P2 | Material issue with a safe workaround | Eight supported hours |
| P3 | Question, guidance or ordinary request | Two supported business days |

Ordinary supported hours are Monday–Saturday 09:00–18:00 `Asia/Kolkata`, excluding
the published holiday calendar; D-021's SEV-0/SEV-1 rotation remains 24x7. Record
acknowledgement, first-human-response, next-update and resolution clocks separately.
Only a genuine `awaiting_customer` interval pauses a pausable objective. Waiting on
Thaarei, ULIP, another supplier, approval, release or internal investigation does
not. Publish these as measured pilot service objectives, not guaranteed restoration
or contractual resolution SLAs, until staffing and production evidence justify an
approved commercial commitment.

A case never grants data access. If investigation needs tenant data, use section
13.5's distinct scoped, time-bound, approved support principal and show its state to
the customer; the requester, ticket text, screenshot or supplier certificate is not
authorization. Prefer typed links to an asset, driver, import, verification,
payment, policy, notification or incident over duplicating its values in free text.
Warn users never to paste passwords, session/action tokens, TOTP/recovery codes,
full identifiers, raw provider bodies or unnecessary personal data. Sensitive
free-text content remains encrypted and field-authorized and is absent from email,
search documents, analytics, telemetry and audit payloads.

Authenticated attachments use D-035's allowlist, quarantine, size/signature/parser/
scanner controls and D-014 exact-object authorization. Public and email attachments
are prohibited. Ordinary case content follows D-050 correction and D-020 erasure;
audit records safe status, reason and hashes rather than message text. Retain an
ordinary closed case for 12 months and an unpromoted attachment for 30 days after
closure by default. If content becomes compliance, security, finance, privacy or
legal evidence, promote/link the exact artifact through that domain's separately
authorized retention/hold workflow; extending a generic ticket is not preservation.

Measure intake availability, acknowledgement, first response, Thaarei versus
customer versus provider wait, update-target compliance, resolution, reopening,
backlog age, transfers, escalations and satisfaction without storing case text in
metrics. Never meet a target by premature closure, duplicate creation or specialist
transfer. Intake, errors, confirmation and dynamic state meet D-026 WCAG 2.2 AA.
PeopleCert treats service requests as user-initiated requests, while NIST's incident
guidance covers cybersecurity response; this model preserves that distinction. See
[ITIL service-request management](https://www.peoplecert.org/browse-certifications/it-governance-and-service-management/ITIL-1/itil4-practices-service-request-management-3690),
[NIST SP 800-61r3](https://csrc.nist.gov/pubs/sp/800/61/r3/final), the OWASP
[Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
and [File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
guidance, and the W3C [form-notification guidance](https://www.w3.org/WAI/tutorials/forms/notifications/).

## 14. Subscription and billing

### 14.1 Commercial model

- Separate the product package, committed managed-asset capacity and optional
  add-ons. The initial package families are Core Compliance, Operations and
  Enterprise; capabilities remain versioned entitlements rather than plan-name
  conditionals in application code.
- One billable unit is an explicitly activated independently registered powered
  motor vehicle or trailer/semi-trailer with its own compliance lifecycle. Drivers,
  users, fleets, locations and tags are not separately billable in MVP.
- D-053 `managed` and `offboarding_pending` assets consume capacity through the
  committed offboarding effective instant; `draft`, `activation_pending`,
  `offboarded`, `archived` and rejected import rows do not. Operational availability,
  regulatory suspension or compliance failure does not avoid billing while the
  asset remains managed. Any post-offboarding `closure_watch` commercial treatment
  must be explicit in the contract and never inferred from provider-call activity.
- Draft import and preview are free but drafts receive no scheduled verification,
  monitoring or operational assignment until explicitly activated.
- Initial self-service capacity points are 25, 50, 100, 250 and 500 assets;
  capacity above 500 is enterprise/custom. Exact rupee prices await validated
  ULIP, infrastructure, support and tax costs.
- Monthly and annual billing are supported. Trial and design-partner plans are
  explicit plan/contract records, not code bypasses.
- Enterprise customers may pay through approved offline credit/bank transfer while
  retaining the same receivable, entitlement and statutory-document workflow.
- Higher verification/service levels, continuous FASTAG/01 history, SSO, storage
  or additional integrations may be separately entitled add-ons.

New activation is rejected when allocated capacity is exhausted, while draft
creation/import and existing read access remain available. An upgrade takes effect
after captured payment or approved enterprise credit. A downgrade takes effect at
renewal only after managed count fits the target; the product never chooses assets
to offboard. Historical deletion/offboarding cannot alter a closed period, and a
duplicate merge cannot create two billable units.

Where one subscription funds multiple organizations, capacity is explicitly
allocated to each organization plus an unallocated reserve. Total allocation
cannot exceed committed capacity. A billing grant exposes organization name,
allocation and aggregate consumption only; it does not grant tenant-domain access.

ULIP calls are metered internally by organization, dataset, purpose, outcome,
cache result and period for cost, fair-use and future pricing analysis. MVP does
not generate per-call customer overages. Enhanced SARATHI/01 remains purpose-
controlled rather than purchasable unrestricted volume.

### 14.2 Architecture

- The provider-neutral Thaarei billing domain owns immutable package/price-book
  versions, quotes, subscription state, capacity allocation, entitlements, usage,
  receivables, billing instructions, normalized statutory-document references,
  grace policy and reconciliation. One D-061 finance/CA-approved external accounting
  system owns statutory invoice/credit/debit issuance; Razorpay owns payment
  authorization/collection and its external objects only.
- Billing account is the payer; subscriptions are linked to one or more explicitly
  covered organizations through control-plane associations.
- Generate checkout/subscription requests server-side. A browser success callback
  is never payment authority.
- Validate checkout signatures and webhook HMAC against the exact raw body;
  enforce timestamp/size limits, durably insert a receipt scoped by provider
  account and `x-razorpay-event-id`, and acknowledge only after that commit.
  Accept duplicate/out-of-order delivery safely and process asynchronously.
- Use immutable payment/subscription events and reconciled current projections;
  fetch provider state on conflict and run daily Thaarei/statutory-system/Razorpay/
  bank/GST-accounting reconciliation.
- A webhook-supplied organization/customer identifier never establishes tenant
  context. Resolve it only through an approved provider-account/domain mapping and
  execute the event under a purpose-bound service principal with normal RLS.
- A Razorpay event never directly grants or removes product access. A reconciled
  domain transition updates entitlements transactionally through the outbox.
- Entitlements checked server-side for record limits and features.
- Capacity events/snapshots attribute managed registered assets to their organization and
  aggregate them to the funding subscription/billing account without exposing one
  organization's tenant records to another.
- Plan versions and the mapping to provider plans are immutable. Downgrades and
  cancellations are renewal-effective; an immediate increase is a disclosed
  co-termed capacity add-on rather than a mutable plan or hidden retrospective
  proration. Credits, refunds, write-offs and offline adjustments are separate
  auditable instruments and require the D-061/D-054 approval matrix.
- Store INR in integer paise and perform tax/ratio calculations using exact decimal
  arithmetic. Retain the one-recipient legal name, GSTIN/registered status, address,
  PIN/state/place-of-supply, seller, SAC/rate/tax split/rounding version and issued-
  document snapshots. Razorpay invoices, payment receipts, settlement statements
  and provider fee invoices are never substitutes for Thaarei's statutory document.
- Never delete customer data automatically because a payment fails.

Internal subscription lifecycle is:

```text
draft → trialing → active → past_due → restricted → cancelled
                         ↘ cancellation_scheduled
```

The standard trial is 14 calendar days, at most ten managed assets and 50 ULIP
requests, beginning only after organization/use-case approval; conversion preserves
data. One trial is allowed per verified customer account unless approved. Design
partners use explicit zero-priced contracts.

D-049 organization status does not mirror this subscription lifecycle. Payment
failure changes commercial entitlement/restriction through D-012, not the legal
tenant identity or a security suspension. Conversely, a paid subscription cannot
override a legal/security organization suspension, inactive membership, inadequate
authentication assurance or missing dataset entitlement.

On renewal failure, retain normal access and monitoring for seven days. Then enter
`restricted`: retain read-only access, billing resolution, privacy requests and
export, but stop mutations, activation/import commits, new ULIP calls and non-
billing automation. Cancel after 30 unresolved days without deleting data outside
the retention policy. Reactivation requires reconciliation and never silently
charges missed history. Normal cancellation is end-of-term; immediate cancellation
requires an approved fraud, security, legal or mutual reason.

### 14.3 India tax documents, collection and accounting boundary

D-061 defines three ledgers with one-way authority rather than letting several
systems issue competing invoices:

1. **Thaarei commercial subledger:** immutable price books and quotes, contract/
   subscription periods, capacity/add-ons, usage, receivables, entitlement/grace
   decisions, payment allocations and exact billing instructions.
2. **One finance/CA-approved statutory accounting and tax-document system:** the
   sole issuer and financial-year numbering authority for Thaarei tax invoices,
   credit notes and debit notes, including IRN/signed-QR evidence where applicable.
3. **Razorpay and approved bank channels:** authorization, collection, refund and
   settlement evidence only; their invoice/receipt objects are not Thaarei GST
   invoices and do not own subscription access.

Do not build a general ledger, GST-return filing or revenue-recognition engine into
V2. At pilot volume, finance may operate the statutory system manually: Thaarei
creates an immutable, idempotent billing instruction; an independently authorized
finance user issues the document in the statutory system and imports the structured
metadata, original PDF/JSON and, where applicable, IRP response under D-014/D-057-
style immutable object provenance. Automate later only through a reviewed adapter to
the selected accounting system or GST Suvidha Provider/authorized Invoice Registration
Portal. The same instruction key cannot produce two active documents; uncertain
external results enter reconciliation rather than retrying with a new number.

MVP supports exactly one approved Thaarei Indian selling legal entity, GST
registration and settlement mapping, with INR-only price books. A second seller,
GSTIN/establishment, foreign entity or currency requires its own approved seller-
selection policy, document sequence, tax rules, bank/provider account, contracts,
keys and reconciliation before use. The application never chooses a selling
establishment from a browser field or merely from the customer's state.

A `BillingAccount` identifies the contractual payer independently from every tenant.
It may fund several explicitly linked organizations, but each quote/invoice has one
legal recipient and must not combine different recipients. Before a quote is
accepted, snapshot seller; recipient legal name; registered/unregistered status;
GSTIN/UIN where applicable; billing address, PIN, state and country; place of supply;
contract/subscription; customer tax attestation/verification provenance; and the
finance-approved tax-rule version. A profile change is prospective and cannot amend
an issued document. Cross-organization allocations disclose only contracted line/
capacity totals to the billing principal, never tenant records or driver/vehicle data.

Publish B2B price books exclusive of GST and show base price, explicit discount,
taxable value, tax components and final INR amount before acceptance/payment.
Configure SAC, description, service/supply type, GST rate, place-of-supply decision,
CGST/SGST/UTGST versus IGST, reverse-charge/exemption treatment and rounding through
an immutable CA-approved rule version. Do not encode “SaaS is always 18%” or accept a
rate/place of supply from the client, customer, Razorpay or a generic tenant setting.
For an ordinary domestic service, IGST Act section 12's registered-recipient/
address-on-record default is an input to counsel/CA review, not a universal override
of special supply rules. Compute with exact decimals, settle to integer paise and
retain calculation operands, intermediate amounts and rounding outcome.

The acquisition flow is:

```text
price-book version → immutable quote/recipient/tax snapshot → explicit acceptance
  → Razorpay order/subscription or approved offline-credit path
  → verified collection/credit decision → commercial entitlement command
  → immutable statutory billing instruction → statutory-system issue/IRP result
  → secure customer document → continuous reconciliation
```

Checkout/browser success is provisional. Verify Razorpay through the existing raw-
body signature, durable webhook receipt and API reconciliation boundary. Payment,
invoice issuance and entitlement are separate state machines: neither a payment nor
an invoice alone proves the other, an invoice outage cannot fabricate/revoke access,
and a Razorpay event cannot alter GST records. Define a finance-owned same-business-
day invoice target and alert/escalate any pending instruction in time to meet the
applicable statutory service-invoice deadline.

The statutory system allocates a consecutive, financial-year-unique series under
the approved seller GSTIN and owns every number/gap/cancellation explanation.
Thaarei validates imported seller/recipient, document type/number/date, original-
document link, taxable/tax/gross totals, currency, status, content hash and duplicate
before publication. An issued document is immutable and never renumbered or deleted.
D-050 correction uses a linked lawful cancellation, credit note, debit note or
replacement. Where e-invoicing applies, preserve request/response schema version,
IRN, acknowledgement, signed QR/JSON, status and cancellation evidence; do not label
the document issued/valid before an IRN is returned. IRP uncertainty is reconciled by
the original supplier/document identity, never resubmitted under a new number.

Finance owns a versioned e-invoice applicability record based on seller category and
aggregate annual turnover. The current general mandate reaches eligible taxpayers
with AATO of at least ₹5 crore in applicable preceding years; the current 30-day IRP
reporting restriction applies at ₹10 crore or more. Monitor thresholds and regulatory
change, contract/qualify an IRP/GSP path with sufficient lead time, and fail an
applicable statutory issue closed if IRN cannot be obtained. IRP cancellation is
separate from application cancellation and follows the current 24-hour portal window;
after that, finance uses the applicable credit-note/return treatment rather than
rewriting the invoice. These current thresholds/windows are versioned external rules,
not permanent code constants.

Avoid automatic mid-period plan replacement in MVP. A downgrade or ordinary
cancellation is renewal-effective after managed capacity fits. An urgent increase
creates a separately quoted co-termed capacity add-on through the existing term,
showing service dates, quantity, calculation basis, discount and tax; it activates
only after verified payment or approved enterprise credit. Renewal can consolidate
it into a new commitment. Do not create retrospective provider-call overages,
automatic refunds or negative invoices. A refund requires current finance authority,
provider/bank outcome reconciliation and the independently correct tax-document
treatment; it does not itself rewrite entitlement history.

Offline enterprise collection uses the same quote, billing instruction, receivable,
document and entitlement model. D-054 independently approves credit limits/terms,
manual receipts, allocations, refunds, credits, write-offs and bank-detail changes.
Record gross invoice, GST components, cash/settlement received, fees, refund,
withholding/TDS claimed, verified withholding evidence and open balance separately.
A customer-entered deduction never marks cash received or the invoice settled.
Finance/CA—not code—determines whether a section/rate applies to the exact contract;
verify the certificate/statement evidence such as Form 16A/26AS before allocating a
withholding amount.

Reconcile at least daily across Thaarei commercial/receivable state, the statutory
system's invoice/note/IRN state, Razorpay orders/payments/refunds/settlements, approved
bank receipts and accounting/GST-return status. Each discrepancy becomes an owned
finance case with source checkpoints and idempotent receipts; it cannot silently
change entitlement, tax, money or issued bytes. Month/financial-year close takes an
immutable snapshot, blocks backdating into a closed period and uses adjusting
documents in the current lawful period.

Retain tax documents, calculations, recipient/seller snapshots, IRP artifacts,
payment allocations and reconciliation evidence for at least the CGST section 36
period—currently 72 months from the annual-return due date—and longer for applicable
proceedings or D-058 holds. Apply field minimization/authorization to billing contacts
and tax registrations while preserving the legally required finance record. The UI
labels quote/pro-forma, tax invoice, credit/debit note, Razorpay receipt, bank receipt,
refund and settlement distinctly and displays source, issue/IRN/payment state and
downloadable immutable evidence.

Implementation references:

- [CBIC tax-invoice, credit/debit-note rules](https://cbic-gst.gov.in/gst-invoice-rules.html)
- [Integrated GST Act, section 12 place of supply](https://cbic-gst.gov.in/hindi/IGST-bill-e.html)
- [GST e-invoice applicability](https://einvoice6.gst.gov.in/content/einvoice-mandate/)
- [GST e-invoice 30-day reporting advisory](https://einvoice6.gst.gov.in/content/revised-time-limit-for-e-invoice-reporting-for-businesses-with-aato-of-%E2%82%B910-crores-above/)
- [IRP amendment/cancellation guidance](https://einvoice6.gst.gov.in/content/faq-powered-by-irisirp/)
- [CGST Act section 36 record retention](https://cbic-gst.gov.in/pdf/CGST-Act-Updated-31082021.pdf)
- [Razorpay webhook/API verification guidance](https://razorpay.com/docs/webhooks/)
- [Income Tax Department section 194J](https://wmstatic-prd.incometaxindia.gov.in/web/guest/w/section-194j-20)
- [Income Tax Department Form 16A description](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-3)

## 15. Notifications and workflow

Finding, case, task, notification and acknowledgement are separate concepts. A
finding is immutable evaluation output; a case is a deduplicated resolution
container; a task is owned work; a notification is a delivery; and an
acknowledgement proves a warning was seen without resolving the case or changing
compliance.

### 15.1 Default expiry lifecycle

| Time | Default action |
| --- | --- |
| 60 days before expiry | Create/update the finding and include it in the daily digest |
| 30 days | Create one deduplicated case and assign its owner |
| 14 days | Immediate in-app/email alert to the case owner |
| 7 days | Escalate to fleet/location manager |
| 3 days | Escalate to compliance manager |
| 1 day | Critical warning to configured administrators |
| Expiry | Re-evaluate posture/decisions and emit one immediate critical event |
| After expiry | Remind through case-SLA escalation, not duplicate daily expiry alerts |

A governed requirement may start at 90 days when preparation lead time requires
it. Tenant extensions may notify earlier but cannot suppress central critical
stages. Each threshold fires once for a requirement version and expiry episode;
renewal updates/closes the existing case. Case deduplication keys organization,
requirement, subject, credential/version and episode. A resolved later recurrence,
new credential version, material policy change or access boundary creates a new
case.

Severity is `informational`, `attention`, `high` or `critical`. Provider failure
while prior evidence is current is an operational warning, and insufficient
freshness is an “unable to determine” alert; neither is described as document
expiry. A blocked interactive action explains itself in-product and creates email
only when case policy requires it.

### 15.2 Routing and preferences

Resolve recipients through explicit case/task owner, subject fleet/location
compliance owner, fleet manager, organization compliance manager, then
organization administrator. If none resolves, place the case in an `unassigned`
queue, warn administrators once and expose unrouted critical cases as organization
health. Revalidate membership, permission, case state, address, preference and
deduplication immediately before delivery.

Account security/recovery, privacy/breach, billing-failure contacts, critical
assigned compliance escalation and platform incident/termination messages are
mandatory for the corresponding role. Users may configure informational/attention
email, digest/immediate delivery, fleet/location/type routing, backup recipients,
quiet hours and schedule, but cannot remove the last mandatory recipient.

Use the user's canonical IANA timezone, then organization timezone, then
`Asia/Kolkata` for delivery presentation/scheduling only; the governing D-045
policy calendar independently decides statutory validity.
Default quiet hours are 20:00–08:00 local; attention enters the next digest, high
waits until quiet-hours end, and critical sends in-app/email immediately when the
organization permits bypass. Daily digest is 08:00 local and weekly digest Monday
08:00. Legal dates remain jurisdiction calendar dates and delivery times are UTC.

Resolve notification language under D-060 independently from timezone. Snapshot
the recipient's explicit locale, applicable catalogue/template version and rendered-
content fingerprint when the intent is materialized; a later preference or catalogue
change cannot rerender that artifact. Mandatory legal, consent, compliance-action,
security and breach messages require their promised approved locale and fail closed
to the owner/incident queue if it is absent. Ordinary informational UI/email may use
the approved English fallback with visible indication and safe missing-key telemetry.

### 15.3 Delivery architecture and channels

```text
domain event → notification intent → authorized routing/recipient snapshot
             → priority channel job → application template → ZeptoMail Send API
             → accepted request reference → signed event/reconciliation
             → terminal outcome/retry/dead letter
```

The notification deduplication key includes case, event type, threshold,
recipient, channel and template version. Store correlation, organization/case,
rule/template version, recipient-resolution reason, canonical locale, catalogue/
rendered-content fingerprint, scheduled/sent/
accepted/delivered/bounced times, bounded retry history and redacted provider IDs.

Launch with an in-app notification center and ZeptoMail India, with the account
registered through `zeptomail.zoho.in`. The HTTPS Send API is the primary transport;
SMTP is not the production default. Preserve a narrow provider adapter and an
operator-run migration procedure, but do not automatically switch providers after
an uncertain send result. Netcore is the evaluated contingency if ZeptoMail fails
the pre-production evidence gate; running two providers or self-hosting outbound
mail is outside MVP.

Use three production ZeptoMail Agents with separate credentials, limits and audit:
`security-auth` for invites, recovery and security notices, `operations` for
compliance/workflow messages, and `billing-platform` for subscription and billing.
Only Thaarei-controlled sending subdomains are permitted; tenants cannot supply an
arbitrary `From` domain. Use a dedicated transactional subdomain, a custom return
path, 2048-bit DKIM and SPF, then move DMARC from monitored rollout to quarantine/
reject only after alignment and legitimate-source inventory pass. Start on the
provider's shared IP pool. Request a dedicated IP only when sustained volume and
reputation operations meet ZeptoMail's published eligibility guidance (about
10,000 messages/day or 50,000–70,000/week), rather than treating a dedicated IP as
automatically safer. Configure Agent warning/blocking limits and IP-restrict Send
API credentials to the fixed production and recovery egress addresses.

PostgreSQL remains authoritative for the notification intent, rendered template
version, recipient snapshot, stable application delivery ID, provider
`client_reference`, attempts and normalized outcome. Delivery is at-least-once, not
exactly-once. Retries reuse the same application delivery reference and the same
action token; an ambiguous timeout is reconciled against provider logs before a
retry where the provider contract permits. Reserve queue capacity for
security/authentication, retry only classified transient failures with bounded
backoff, and expire work before its business purpose or action token expires.
Provider acceptance, downstream-mail-server delivery and reading by a person are
distinct; the product never claims that provider acceptance or delivery proves
reading.

Enable delivered, soft-bounce, hard-bounce and feedback/complaint events. Verify
ZeptoMail's timestamped HMAC-SHA256 `producer-signature` against the exact raw
request bytes before parsing, enforce a short replay window, deduplicate the
webhook request ID, validate the expected Agent and normalize events idempotently.
Because public documentation does not establish webhook ordering or retry
guarantees, reconciliation must detect missing, duplicated and out-of-order events.
Hard bounce, invalid destination or complaint creates an application-owned
suppression immediately; a soft bounce alone does not. Provider-side open/click
tracking is disabled.

Disable ZeptoMail email-content retention, which is otherwise configurable for up
to 60 days, and keep templates and their immutable versions in the application.
Do not use provider-hosted templates or email attachments. Recipient address and
minimum delivery metadata necessarily reach the processor, but recipient display
name and message content are minimized. Before production, obtain written evidence
for India processing/storage and backups/support access, retention/deletion, DPA
and subprocessors, incident notice, SLA/support escalation, recovery-region
behavior, account/Agent quotas, rate and concurrency limits, credit exhaustion,
`429` semantics, `client_reference` lookup, webhook event/retry behavior and DKIM
rotation. A failed material item invokes the provider-adapter contingency decision;
it is not silently accepted.

Email subjects, bodies and previews contain no DOB, full licence or vehicle
identity number, address, detailed compliance status, document/raw ULIP content or
public document link. They contain a generic action description and direct the
user to an authenticated organization route that rechecks access. Invite, recovery
and action links use opaque, single-use, short-lived tokens whose verifier is
stored hashed; a replacement invalidates the prior token. Every email has a
plaintext alternative and accessible HTML. Suppression of a mandatory destination
creates a contact-health warning and an in-app escalation.

SMS/WhatsApp remain disabled until provider/cost approval, recipient purpose and
consent/opt-out controls, and applicable TRAI/DLT sender, header and template
registration are complete. Non-user drivers receive no routine compliance email
in MVP. Native push waits for a native application.

Monitor unrouted critical cases, queue age, finding-to-notification latency,
attempts/failures, bounce/complaint/delay, suppressed mandatory contacts, per-
organization digest volume, unresolved escalations, deduplication and cases
resolved before expiry. Measure useful case action rather than invasive email-open
tracking.

### 15.4 Calendar scheduler and missed-run recovery

Register exactly one owned Graphile recurring heartbeat, every five UTC minutes;
do not create a mutable cron entry per organization or user. The heartbeat reads an
authoritative database instant, resolves due organization/policy legal dates with
D-045 and transactionally creates a daily execution ledger keyed by task kind,
organization, legal zone, local date, policy version and scheduler version. It then
fans out bounded tenant-fair jobs. Normal daily compliance evaluation becomes due
at 00:05 in the legal zone, after the calendar boundary; civil notification/report
schedules use their own recorded zone and local time.

Every effect remains idempotent beyond Graphile's schedule/job identity. A restart,
duplicate heartbeat or retry cannot create a second threshold episode, case or
delivery. On startup, recovery and detected clock/tzdata change, compare the last
successful ledger cursor to the authoritative calendar and identify every crossed
policy/expiry threshold. Re-evaluate current posture and preserve required missed-
threshold evidence, but apply present authorization/case state and issue at most one
policy-governed consolidated catch-up notification per active case rather than a
stale-message storm. A calendar day that was not processed is visible and alerting;
operators can replay a bounded range through an audited command without changing
the original `as_of` or duplicating effects.

Graphile supports a stable explicit cron identifier and optional missed-run
backfill, but D-045's product ledger—not queue history—is authoritative for calendar
coverage. See Graphile Worker's [recurring-task guidance](https://worker.graphile.org/docs/cron).

Provider references:

- [ZeptoMail Send API and `client_reference`](https://www.zoho.com/zeptomail/help/api/email-sending.html)
- [ZeptoMail Agents and limits](https://www.zoho.com/zeptomail/help/agents.html)
- [ZeptoMail IP restrictions](https://www.zoho.com/zeptomail/help/ip-restriction.html)
- [ZeptoMail webhook events and signature](https://www.zoho.com/zeptomail/help/webhooks.html)
- [ZeptoMail content-retention controls](https://www.zoho.com/zeptomail/help/content-setting.html)
- [ZeptoMail dedicated-IP guidance](https://www.zoho.com/zeptomail/help/dedicated-ip.html)
- [ZeptoMail privacy/data-processing statement](https://www.zoho.com/zeptomail/gdpr.html)
- [Netcore regional endpoint documentation](https://developer.netcore.ai/docs/netcore-regions)

## 16. Search, reporting and exports

Use tenant-RLS PostgreSQL as the only MVP search and reporting engine. At the
launch scale, another tenant-bearing index would add consistency, authorization,
backup and D-020 deletion surfaces without demonstrated need. Use B-tree indexes
for normalized identifiers/status/date/relationship filters, GIN full-text indexes
for approved documents, `pg_trgm` indexes for authorized fuzzy fields and partial
indexes for common active/open/expiring populations. Pagination is stable keyset
pagination using the declared sort plus UUID as a tie-breaker; unbounded offsets,
arbitrary SQL/columns and client-selected operators are prohibited.

Search is a typed, versioned allowlist, not one unrestricted concatenated document.
Supported fields include vehicle registration/reference; driver name where the
role may view identity; exact licence identifier under dedicated permission;
fleet, location, tag and assignment; credential/document type/state; compliance
posture/operational decision; expiry/freshness/verification ranges; case/task owner
and state; and entitled challan/FASTag filters. Organization RLS and D-017 scope/
field authorization apply before matching, ranking, aggregation, count and
pagination. A caller who may see only a masked value cannot search the hidden
full value. Sensitive search terms never enter URLs, logs, traces or analytics.

For an application-encrypted licence/identity value, permit exact match only.
Normalize through a field-specific versioned function and compute a keyed HMAC
over organization UUID, field type and normalized value. Store token plus key/
normalizer versions beside the ciphertext; never store an unkeyed hash or use
deterministic encryption. Search keys are environment-specific, protected through
the approved self-hosted secrets/key path and support dual-token query/write during rotation.
Partial, fuzzy and cross-tenant matching are prohibited. Rate-limit and audit each
sensitive-identifier search to deter enumeration.

Saved views store a versioned allowlisted filter, sort and column document plus
owner/sharing and fleet/location scope; they never store SQL or frozen authority.
Relative windows such as `expires within 30 days` are resolved at execution.
Membership, entitlement, scope and field visibility are recalculated whenever a
view is run or shared. Default views cover expiring/expired, attention required,
known failure, indeterminate, operationally blocked, stale, unverified and
assigned/unassigned populations.

Separate report semantics:

- operational reports show current posture, expiry forecast, verification
  coverage, unresolved conflicts, exception/acknowledgement use, challans,
  FASTag activity, fleet/location comparison, import outcome and provider health;
  bounded projections may serve them with visible `as_of`/freshness;
- historical/evidence reports reproduce past output from immutable evaluations,
  facts, observations, policy versions and evidence references rather than
  applying today's rules to yesterday's state.

Every report records organization/scope, report/filter/schema versions, policy and
data cutoff, timezone/legal-date interpretation, included fields, provider
freshness/completeness, row count and generation state. Cross-tenant customer
benchmarking and embedded third-party BI are not MVP. Platform analytics use only
approved operational aggregates that cannot identify a tenant, asset or driver.

Export is an asynchronous D-022 operation:

```text
requested -> authorized -> snapshotting -> generating -> ready -> expired
                          -> failed | cancelled
```

At request time, authorize report/row/field scope, require D-016 step-up and a
reason for sensitive driver/document fields, freeze filter/schema/`as_of`, and
capture selected entity UUID/version membership. This prevents later mutation
from silently changing the output. Revalidate organization state, membership,
scope and every field before generation and again before issuing a download grant;
lost access cancels disclosure even when the file already exists.

Generate macro-free XLSX for human use with all untrusted strings typed as text and
no formulas, links, macros, hidden active content or external references. UTF-8
CSV quotes/encodes every field and neutralizes formula-start characters including
`=`, `+`, `-`, `@` and applicable control/full-width variants. Its manifest declares
that transformation so it is not confused with authoritative raw data; future
lossless integrations use a separately permissioned API/machine format rather than
weakening spreadsheet protections.

Each immutable export manifest records export/organization/requester IDs,
authorization reference, `as_of`, filter/schema versions, row/file counts,
timezone, formula handling, SHA-256 checksums and expiry. Store files only in the
private encrypted D-014 export bucket, never replicate them, and expire them after
24 hours under D-020. Email only an authenticated application route. Each grant is
for the exact immutable generation, reauthorized/audited and valid for five minutes with
an independently enforced server-side expiry ceiling; a presigned URL is not described as one-time or
instantly revocable. Use bounded streaming/part sizes and configurable per-tenant/
platform concurrent, row and uncompressed-byte limits rather than loading an
entire export into memory.

Adopt a dedicated search/analytics service only when representative measurements
show persistent D-021 latency misses after PostgreSQL tuning, material OLTP harm,
or required ranking/language/geospatial/faceting behavior PostgreSQL cannot
reasonably provide. A new ADR must define RLS-equivalent isolation, field policy,
outbox/reindex/reconciliation, verified deletion, backup/DR and incident behavior
before tenant data enters that system.

Implementation references:

- [PostgreSQL `pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html)
- [PostgreSQL full-text functions](https://www.postgresql.org/docs/current/functions-textsearch.html)
- [PostgreSQL row-security policy behavior](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [OWASP CSV/formula injection](https://owasp.org/www-community/attacks/CSV_Injection)

## 17. Security, privacy and compliance

### 17.1 Security baseline

Security behavior and infrastructure enforcement are distinct. Tenant isolation,
authorization, compliance correctness, mandatory audit transactions, safe logging,
envelope formats, immutable generations, retention/deletion semantics and truthful
degraded modes apply in local, CI, staging and production. Synthetic data and
development keys reduce consequence, not correctness. Public TLS, hardened host
administration, production key custody, encrypted durable volumes, independent
backup/paging and production retention are production gates exercised through the
staging release profile; they are not prerequisites for unrelated local work.

Classify every stored/transmitted field in versioned schema metadata. A migration,
contract or provider-normalizer change cannot silently weaken its classification:

| Class | Examples | Minimum controls |
| --- | --- | --- |
| Public | Published regulatory catalogue and marketing data | Publication integrity and provenance |
| Internal | Non-customer configuration and redacted operational metrics | Authenticated least privilege |
| Tenant confidential | Fleet/asset records, normalized registration, driver display name and ordinary compliance facts | RLS, scoped field policy, encrypted volumes/backups and masking |
| Restricted | DOB, full licence, address/contact, chassis/engine/VIN, detailed SARATHI attributes and document/provider PII | Application/object encryption, dedicated permission, step-up/reason and access audit |
| Secret/authentication | ULIP/payment/email credentials, encryption/search keys, sessions/reset material and TOTP seeds | Secrets/identity path only; never tenant configuration, search or telemetry |

Do not collect Aadhaar, PAN, bank-account data, card numbers or CVV in MVP. Use
Razorpay-hosted collection. Keep normalized vehicle registration, driver display
name, validity/class/status, fleet/location and compliance facts queryable because
they are operationally necessary, but protect them as tenant-confidential. Store
full licence number, DOB, address, non-user driver contact, chassis/engine/VIN and
detailed personal provider attributes in a logical restricted envelope. Raw ULIP
PII and evidence binaries remain in their D-014 encrypted object classes rather
than being copied into general tables.

Use a pinned `libsodium-wrappers` server implementation and a versioned authenticated
envelope format. Each logical restricted database envelope receives a fresh random
256-bit data-encryption key (DEK) and nonce and is encrypted with libsodium
XChaCha20-Poly1305 AEAD. Each restricted object is encrypted as bounded chunks with
`crypto_secretstream_xchacha20poly1305`, including a required final tag so truncation
or reordering fails verification. Store ciphertext, nonce/header, envelope/schema/
algorithm/context versions, creation/replacement times, key IDs and independently
usable production and recovery DEK wrappers. Never invent cryptographic primitives,
reuse a DEK between logical envelopes or cache plaintext DEKs beyond the operation.

Wrap every DEK twice using libsodium sealed boxes: once to the current production
X25519 public key and once to the independently administered recovery X25519 public
key. The production and recovery public keys are non-secret, versioned deployment
configuration. The production secrets-provider path supplies the production private
key only to API/worker identities; the recovery private key exists only on the
recovery/offline path and is never imported into the active-host secret store.
Search-HMAC,
Better Auth/session, webhook and audit-signing keys are independent key families.

D-035 adds one deliberately narrower exception for untrusted quarantine objects:
their DEK also has a scanner-recipient wrapper whose private key exists only in the
isolated scanner project. Promotion never copies that wrapper. The scanner creates a
fresh production/recovery-only DEK and envelope for the accepted original and each
derivative, so compromise of the scanner key cannot decrypt retained evidence. A
later exact-generation rescan creates a temporary, audited scanner wrapper or
quarantine copy under current authorization; it never grants the scanner standing
accepted-bucket or production-private-key access.

Both recovery paths must be produced before a restricted mutation commits. Normal
production roles may unwrap only through the production path; the independently
held recovery private/wrapping material is available only during a declared and
audited recovery. Production may receive only the recovery public/encrypt-only
material needed to create the second wrapper. Human/key administrators have no
routine plaintext access. If either wrapper cannot be created, fail only the
restricted create/update with retryable service-unavailable behavior and continue
safe non-sensitive operations. Recovery-key use is independently logged and paged.

Bind ciphertext to non-secret authenticated context: application, environment,
organization UUID, entity UUID, data class and envelope schema. Validate the exact
expected context on decrypt so copied ciphertext fails in another tenant/entity/
class/environment. No PII, filename, registration/licence value, name or secret
enters authenticated context or cryptographic audit output.

Decrypt only after current tenant/resource/field authorization, step-up, purpose/
reason and mandatory sensitive-access audit persistence. D-023 exact matching uses
its separately keyed/versioned tenant-bound HMAC token and normally does not
decrypt. A context/authentication/decryption error is an integrity incident, never
an absent value or negative compliance fact.

Restricted plaintext is prohibited from Valkey, search/report projections, outbox/
job payloads, URLs, telemetry/Sentry, email previews, migration output, temporary
files and browser local/session storage, IndexedDB or service-worker caches.
Responses containing it use `Cache-Control: no-store`; jobs carry UUID references
and re-evaluate current purpose/authority before decrypting.

Maintain explicit envelope/key versions and a documented rotation schedule. New
versions become write-primary while reads temporarily accept the bounded prior
set; rewrap retained DEKs without decrypting/re-encrypting payload content when the
recipient pair changes. Re-encrypt payloads when a content key or algorithm is
compromised. Block key retirement or destruction until complete inventory and
reconciliation prove no retained wrapper, ciphertext, backup or legal-hold
dependency. Quarterly restore exercises decrypt samples using only recovery-site
material. D-020 deletes ciphertext and search tokens; shared recipient keys do not
provide or imply per-tenant cryptographic erasure.

This design protects offline database/object copies and separates routine from
recovery authority, but it does not protect plaintext from compromise of an
authorized API/worker process that can retrieve the production private key. Minimize
that runtime identity and decrypt surface, prohibit the recovery private key there,
and migrate to independently operated OpenBao Transit or an HSM if non-exportable,
per-operation audited key use becomes a contractual or threat-model requirement.

Implementation evidence must remain aligned with libsodium's
[sealed-box](https://libsodium.gitbook.io/doc/public-key_cryptography/sealed_boxes)
and [secretstream](https://libsodium.gitbook.io/doc/secret-key_cryptography/secretstream)
contracts. Pin and review the actual `libsodium-wrappers` package and the selected
environment secrets-provider implementation; documentation links do not replace
version-specific interoperability, outage and restore evidence.

- Use Dokploy/Traefik ACME for browser-facing production TLS, HSTS and explicit
  security headers. Same-host service traffic uses private networks plus distinct
  service credentials or Unix sockets where supported. Cross-host production/
  recovery traffic uses exact-identity mTLS, forced-command SSH keys or another
  reviewed mutually authenticated protocol. WireGuard restricts the network but is
  not a service identity; a general private CA is deferred under D-038.
- Generate cross-host private keys on their consuming hosts, prohibit wildcard or
  shared identities, and enforce least privilege, peer allowlists, rotation and
  filesystem ownership. Credential issuance, rotation, revocation, expiry and
  trust changes are security events.
- Apply D-037's minimal Ubuntu Server 24.04 LTS amd64 baseline to every host through
  reviewed, pinned Ansible; use OpenTofu for provider/network resources and detect
  manual drift rather than treating a hand-configured server as the authority.
- Keep AppArmor enforcing and nftables default-deny for IPv4 and IPv6. Administrative
  SSH is WireGuard-only with named hardware-backed FIDO2 keys, bounded audited sudo
  and no root/password/challenge login, Docker-group membership or routine provider-
  console use.
- Treat rootful Docker and the daemon socket as root-equivalent. Expose neither a
  Docker TCP API nor its Unix socket to workloads; admit only digest-pinned,
  non-root, read-only, capability-dropped, `no-new-privileges`, seccomp/AppArmor-
  confined containers with narrow mounts, devices, namespaces, networks and
  resource/log budgets. No privileged container is an acceptable shortcut.
- On production and recovery hosts, collect auditd evidence and run qualified,
  tuned detect-only Falco where its eBPF/runtime compatibility is demonstrated.
  Route security events through D-019; Falco has no automated kill authority and no
  Docker-socket access absent a separate decision. Staging release exercises this
  contract; local and staging core do not require the agents.
- Exact CORS allowlist; never wildcard/reflect arbitrary origins with credentials.
- CSRF protection, secure cookies and content-security policy.
- D-034 Dokploy/Traefik ingress plus independent Fastify and distributed
  rate/concurrency limits; Cloudflare remains DNS-only and CrowdSec is an optional
  qualified host control.
- Encryption at rest for database volumes, backups and object storage.
- Under D-041, place every durable production tenant/secret/container/scanner/
  telemetry/control path on a manually unlocked LUKS2 volume, except the recovery
  VPS's native encrypted ZFS
  datasets. A boot/root filesystem contains only the minimal WireGuard/SSH recovery
  surface and never becomes an unencrypted fallback; swap, hibernation and sensitive
  core dumps/root logs remain disabled or volatile.
- Keep per-volume unlock credentials and encrypted current LUKS headers in independent
  recovery custody, never on the same VM, in Ansible/Dokploy, shell arguments or
  logs. Volume encryption protects detached storage, not a live compromised host/
  hypervisor and not per-tenant deletion.
- Libsodium secretstream authenticated chunk encryption for document/provider
  objects using separate versioned keys by environment and data class.
- XChaCha20-Poly1305 restricted database envelopes and sealed production/recovery
  wrappers using D-024/D-030's independently administered key paths.
- Tenant-scoped random object keys and short-lived exact-object access grants.
- Malware scanning and MIME/signature validation for uploads.
- Run every malware, document-structure, rendering and image-decoding operation in
  D-035's separately networked/credentialed scanner project and disposable gVisor
  sandbox, never in an application, worker, data or observability process. Record
  the reduced same-host containment assurance until the scanner is split out.
- Never disclose an uploaded file to an external scanner or content-analysis API.
- MVP evidence uploads allow PDF, JPEG and PNG only, default to 10 MB per artifact,
  and reject executable/active content, office macros, SVG and archives.
- MVP import uploads allow UTF-8 CSV and macro-free XLSX only, with D-018's
  separate file/row/expanded-content limits and rejection of formulas, external
  links, embedded objects and archive formats.
- Upload into a quarantine prefix using short-lived presigned requests; validate
  size, extension, declared/detected MIME and signature before acceptance.
- Treat the public encrypted-object upload route separately from application
  traffic: allow only exact presigned quarantine operations, enforce host/method/
  length/checksum/time/rate constraints before Garage and do not mistake WAF body
  inspection for malware or authenticated-envelope validation.
- Generate object keys server-side, scan each artifact, sandbox previews and use
  short-lived authorized downloads with safe response headers.
- Retain the immutable generation/key identifiers, encryption metadata and
  plaintext/provider checksums without exposing cross-tenant matches or
  deduplicating across tenants.
- Secret manager/environment injection; never store provider secrets in editable application tables.
- D-025 dependency, licence, container, secret, SAST, IaC and migration release
  gates in CI, with authenticated DAST against isolated non-production.
- Least-privilege service/database credentials and regular rotation.
- Quarterly access review and tested incident-response runbook.

Treat [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final) as the
software-lifecycle framework. Maintain a version-pinned
[OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/)
applicability matrix at Level 2, plus applicable Level 3 requirements for tenant
isolation, identity/recovery, authorization, cryptography, restricted data,
uploads, exports, audit integrity and platform-operator access. Each applicable
requirement records implementation, automated/manual test, evidence, owner and
status; an exclusion requires recorded rationale. Do not claim ASVS certification
from tool output alone.

Threat-model authentication, tenancy, ULIP, files/imports, documents, billing,
support access, exports, encryption and deletion before implementation. Update the
relevant model when a trust boundary, tenant/field decision, restricted-data flow,
external integration, cryptographic boundary, parser, privileged capability or
public exposure materially changes, and review all models annually. Include abuse
cases and boundary failure, not only intended flows.

Protect source and release control as follows:

- no direct push to protected release branches/tags and no production deployment
  from an unreviewed commit;
- at least one independent reviewer for production code; security `CODEOWNERS`
  and two-person approval for auth, RLS/authorization, crypto/key/access policy, audit,
  tenant-affecting migrations, CI workflows, IaC and production-deploy controls;
- required status checks and a separate protected production-environment approval;
- third-party GitHub Actions/workflows restricted to an allowlist and pinned to
  reviewed full commit SHAs with least-privilege workflow permissions;
- frozen lockfiles and approved registries; inventory direct/transitive packages,
  base images, runtimes, Actions and infrastructure providers with version,
  licence, owner, support/EOL state and replacement path;
- reject unapproved install/lifecycle scripts, unsupported components and
  materially restrictive licences without security/legal review. Automated update
  pull requests never auto-merge into production without tests and review.

Run secret/history and push-protection scanning, SAST, dependency/SCA, licence,
IaC, container/OS, migration/API policy and product-specific security tests on
each applicable change. Run authenticated DAST in an isolated staging environment
at least on release candidates. Continuously scan source dependencies and every
deployable OCI image in CI and on a scheduled basis, and route new findings to an
owned, deduplicated register.
A tool alert is triaged for reachability and context; it is not silently ignored
or automatically treated as confirmed.

Prioritize findings using exploitation evidence/CISA KEV, exposure, reachability,
privileges, tenant-crossing potential, identity/crypto/audit impact, data class and
affected tenants rather than CVSS alone:

| Finding | Maximum response/remediation target |
| --- | --- |
| Applicable known-exploited/KEV | Open an incident immediately; contain within 24 hours and remediate within 72 hours |
| Reachable critical in internet-facing, identity, tenant, crypto or restricted-data path | 72 hours |
| Other critical | 7 calendar days |
| High | 30 calendar days |
| Medium | 90 calendar days |
| Low | 180 days or risk-ranked backlog |

New reachable critical/high findings block promotion. A temporary exception needs
named security and product approvers, reachability/impact evidence, compensating
controls, owner and due date, with no more than 14 days before renewed approval.
Active exploitation, cross-tenant access, authentication bypass, restricted-data
disclosure or compromised credentials is incident containment work, not an
ordinary accepted exception.

Build each production image once on the approved hosted workflow. Attach SPDX or
CycloneDX SBOM and signed [SLSA 1.2](https://slsa.dev/spec/v1.2/) provenance bound
to repository, workflow, commit and digest; use Build Level 2 initially and target
Level 3 after builder isolation is evidenced. Sign/store the image and reference
artifacts privately in GHCR using a pinned Sigstore/Cosign-compatible workflow or
an equivalently reviewed private mechanism. Before Dokploy production promotion, verify the
signature, provenance identity/source/workflow, SBOM policy and digest. A valid
signature alone does not authorize an image. GitHub native private-repository
attestations may replace equivalent plumbing only if the contracted GitHub plan
supports them.

Commission an independent penetration test and remediation retest before the first
external production pilot, then at least annually and after material changes to
tenancy, identity, authorization, cryptography, upload processing or public APIs.
Before GA publish a monitored `security@` contact and RFC 9116
`/.well-known/security.txt`, provide a protected reporting route and define
acknowledgement, triage and coordinated-disclosure handling. Do not promise a paid
bug bounty until it has dedicated staffing and rules.

Never copy production customer data into development, preview, CI or
ordinary staging; use generated synthetic fixtures, with D-042's approved
irreversible transformation only as an exception. Do not run mutation, load, DAST
or destructive security tests against production. A discovered secret
leak is revoked/contained immediately and investigated as an incident. Production
images are minimal, non-root, contain no runtime package installer/debug tooling
and use a read-only root filesystem where the service permits it.

Implementation references:

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST SP 800-38D authenticated encryption](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [NIST Secure Software Development Framework 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)
- [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/)
- [SLSA specification 1.2](https://slsa.dev/spec/v1.2/)
- [GitHub Actions secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [Sigstore Cosign overview](https://docs.sigstore.dev/cosign/signing/overview/)
- [OWASP Vulnerability Disclosure guidance](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html)

### 17.2 Document and object storage

Use a pinned Garage 2.x release through a vendor-neutral storage adapter. The
evaluated baseline is `v2.3.0`; production pins a reviewed supported patch image by
OCI digest and never follows `latest`. Local/full, staging and initial production
use one isolated Garage node. Garage documents that a single-node deployment has no
redundancy and should not be used to claim production durability or availability;
Thaarei therefore treats it as an active-store implementation backed by D-036's
independent exact-object recovery copies, not as HA. This accepted initial risk is
disclosed and triggers a topology review under §21.1.

Garage RPC/S3 stays on a private `platform-data` network with independent secrets;
administration and Prometheus metrics are private. Encrypt the production volume
and retain D-030 authenticated application encryption. Use SSD-backed LMDB metadata
with consistent snapshots, sufficient snapshot workspace and a checksummed,
scrubbed object-block filesystem. Scanner scratch is bounded encrypted ephemeral
storage and is removed after each job.

Separate buckets by environment and data class:

| Class | Contents | Independent recovery-site copy |
| --- | --- | --- |
| Quarantine | Untrusted new uploads | No |
| Evidence | Accepted originals and sanitized derivatives | Yes |
| Provider payload | Temporary encrypted raw ULIP responses | No |
| Export | Short-lived generated exports | No |
| Audit/security archive | Protected infrastructure/security records | Yes |

PostgreSQL backups and recovery manifests do not use the active Garage node as
their durable destination. They move from the bounded encrypted local pgBackRest
repository to the independently administered recovery VPS and offline custody under
D-036.

Garage has no S3 bucket policies or ACLs. Disable website/anonymous access and use
its per-access-key/per-bucket permissions with separate least-privilege upload,
scanner, accepted-object, export, audit, retention and restore identities. No
browser receives a storage key or bucket listing permission, and no application
container receives an owner/admin key. Storage administrators do not receive
routine application-decryption authority.

MVP does not create a content key or bucket per tenant. Tenant isolation uses
application authorization/RLS, fixed lifecycle-class buckets, unpredictable keys,
Garage bucket permissions and D-030 authenticated encryption context. Do not rely
on storage listings or paths as tenant authorization. Enterprise customer-managed
keys remain a later extension.

Garage does not provide S3 object versioning, conditional create, Object Lock or
safe WORM. PostgreSQL therefore owns logical version history and every revision is
a separately created immutable generation with a cryptographically random UUID.
An accepted key is never reused or overwritten. Keys contain no organization ID,
filename, registration/licence number, person name or other PII; a bounded hash
shard allows physical buckets to split before Garage's per-bucket metadata limits:

```text
{data_class}/{shard}/{object_generation_uuid}
```

Persist bucket, key, logical generation UUID, expected byte length, ciphertext and
authorized plaintext checksums, encryption header/wrappers/versions, created time
and lifecycle state. Never treat multipart ETag as a content checksum. All reads,
copies, retention and reconciliation address this exact immutable generation.

Upload and retrospective-security lifecycle is:

```text
created → uploaded → quarantined → scanning → rendering
        → accepted | rejected | scan_failed | processing_failed
accepted → security_quarantined → rescanning → accepted | rejected
accepted | security_quarantined → retention_hold | deletion_pending → deleted
```

- Issue an exact-key presigned quarantine upload valid for at most ten minutes,
  bound to expected content type, source/ciphertext length ceilings and checksum
  headers that the pinned Garage/SDK combination has proven to enforce.
- Evidence/import clients encrypt with the pinned D-030 secretstream envelope
  before direct storage upload, sealing the fresh DEK to the production, recovery
  and scanner public recipients;
  clients that cannot do so use a bounded streaming upload gateway that encrypts
  before Garage. Restricted plaintext never rests in quarantine.
- A browser receives no storage credentials, list access or accepted-bucket write.
- Validate upload intent, bucket/key/generation, size, ciphertext checksum,
  authenticated envelope/final tag, authoritative plaintext checksum, MIME declaration, detected MIME,
  file signature and structure; allow only PDF, JPEG and PNG in MVP.
- Reject executables, active content, SVG, archives, macros, malformed/polyglot and
  password-protected or otherwise unscannable files.
- Scan with current malware signatures. Scanner unavailability, limit exhaustion,
  parser/render failure, timeout or stale signatures remain quarantined and fail
  closed. Remove abandoned/rejected quarantine objects after 24 hours unless a
  bounded security investigation requires them.
- Promotion writes a new random accepted generation under a fresh D-030 envelope
  containing only production and recovery wrappers, verifies a read-back checksum
  and transactionally records the generation plus an outbox event; it never reuses
  or overwrites the quarantine key or carries its scanner wrapper forward.
- Idempotent promotion and reconciliation detect missing/orphan/mismatched objects;
  an orphan reaper acts only after a safety window.

D-035 makes the scanner a distinct hostile-content trust zone. A queue message
contains only the exact quarantine generation UUID and expected envelope/checksum
metadata. A narrowly scoped scanner identity may read that exact quarantine object,
unwrap only its scanner recipient and write candidate derivatives to quarantine; it
cannot list/read accepted evidence, access PostgreSQL directly, delete objects, use
the production/recovery private keys or reach public networks. Each job runs in a
fresh no-network gVisor sandbox with a read-only root filesystem, tmpfs work area,
no Linux capabilities and explicit byte, decompression, page/frame/pixel, CPU,
memory, PID, wall-time and output-count ceilings. Scratch and plaintext disappear
when the sandbox exits. Any sandbox, engine, parser or cleanup anomaly is a failed
job, not a clean verdict.

Use an official pinned ClamAV engine and official signed databases through a local
Unix socket; do not expose its TCP protocol. A separate least-privilege updater may
retrieve and verify official databases, while the scanning sandbox remains
networkless. Check for updates at least hourly, warn when the last successful
verified update is six hours old, and block all new acceptance when it reaches 24
hours. Do not load unsigned third-party signatures. A ClamAV size, archive, scan or
resource limit is an explicit `scan_failed` result and cannot be interpreted as
clean. No file or extracted content is sent to an external scanning service.

For PDF, run QPDF structural inspection before a minimal pinned PDFium renderer
built without JavaScript or XFA. Reject encrypted/password-protected, malformed or
polyglot PDFs and documents containing JavaScript, XFA, launch/automatic actions,
embedded files, external references, rich media, 3D content or content exceeding
policy limits. Rasterize each permitted page to PNG; this preview is non-
authoritative and is never substituted for the immutable original. A digital
signature may be preserved in the original, but MVP reports only `signature
present, not validated` until a separate certificate-trust and long-term-validation
decision is approved.

For images, accept only decoded JPEG or PNG, use a restrictive ImageMagick
`websafe`-derived policy with all unused coders and delegates disabled, enforce
pixel/frame/resource ceilings, strip metadata and re-encode a sanitized derivative.
Do not accept SVG, archives or a format merely because its extension/MIME claims to
be JPEG/PNG. Preserve the exact accepted original under its fresh production/
recovery envelope and record engine/build/signature/rule versions, detections,
limits, input/output hashes, timestamps and state transitions as immutable lineage.

D-018 CSV/XLSX imports pass through the same malware/isolation boundary before
their version-pinned streaming parser applies the separate import schema and
expanded-content budgets. CSV is decoded only as approved UTF-8 text. XLSX is
treated as an untrusted ZIP package: enumerate and bound every member and total
expanded bytes, reject encryption, macros, formulas, external links/connections,
embedded objects and unexpected parts, and never invoke LibreOffice, Excel or a
general document converter. Import acceptance records the same engine, signature,
parser, rule and checksum lineage as evidence files.

Downloads/previews require current API tenant/resource/field/download permission
and applicable step-up/reason controls. Normal UI paths return only the sanitized
raster/re-encoded derivative from an isolated cookie-free origin with a restrictive
CSP, `X-Content-Type-Options: nosniff`, no CORS and a short-lived exact-generation
grant. Original download is a separate permission, requires current step-up and a
recorded reason, uses safe attachment headers and is audited at grant and access.
Never render an untrusted original on the application origin or attach it to
notifications.

New engine signatures, threat intelligence or incident response may atomically put
an accepted generation into `security_quarantined`, revoke all outstanding grants,
and change dependent compliance posture to `indeterminate`; it must never imply a
document/business failure merely from scanner uncertainty. A controlled, idempotent
exact-generation rescan decides whether to restore acceptance or reject the
generation, retaining complete old/new verdict lineage. Tenant users cannot waive,
override or download through a security rejection.

Use distinct least-privilege API, scanner, worker, retention, recovery-copy and
normally inactive restore identities from the environment secrets-provider path.
Because Garage permissions
are bucket-level rather than an authorization boundary, separate physical lifecycle-
class buckets and mediate any capability—such as create without delete—that Garage
cannot express. Rotate all credentials and prohibit administrator credentials in
application containers.

Under D-036, copy every accepted immutable generation and signed audit/security
segment within 15 minutes to class-separated encrypted ZFS datasets on the
independent India recovery VPS. A narrow receiver accepts only an expected random
generation key with create-if-absent semantics, verifies length and ciphertext
checksum before acknowledgement and cannot list, read, overwrite, delete or
administer ZFS. Do not pack tenant evidence into a deduplicated repository that
obscures exact-generation restore and deletion.

Only a recovery-VPS-local D-020 maintenance identity may purge eligible copies
after checking holds and deletion-ledger authority. Monitor copy age/failure,
reconcile signed inventories and prove restoration without the active host or
Garage node. Recovery snapshots protect recent state from compromised source
identities but never justify a WORM claim; separately held raw-encrypted removable
media sets provide offline/provider-independent rotation.

Garage native lifecycle may remove only abandoned quarantine, expired exports and
incomplete multipart uploads after compatibility tests. It never authorizes
business evidence deletion. PostgreSQL and D-020 govern evidence retention, legal
holds and exact-generation deletion from Garage, the D-036 recovery VPS and applicable
offline media, with
verified absence and a deletion-ledger receipt.

Do not claim S3 Object Lock, certified WORM or storage-enforced immutability. Use
application-owned immutable generations, independent signed manifests and database-
controlled legal holds. Covered platform-security archives receive protected
180-day retention on an independently administered host. A future compliance-mode
WORM facility requires a counsel-approved obligation, different capable backend
and separate decision.

Garage is AGPL-3.0. Before production, counsel must approve the deployment/source-
offer obligations, preserve notices and require publication of corresponding
Garage source for any covered modification; keep Garage an unmodified separately
deployed service where practical. If that gate fails, evaluate the Apache-2.0
SeaweedFS fallback through the same adapter rather than weakening licence policy.

Implementation and acceptance remain aligned with Garage's official
[S3 compatibility](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/),
[configuration](https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/),
[known issues](https://garagehq.deuxfleurs.fr/documentation/reference-manual/known-issues/),
[durability/repair](https://garagehq.deuxfleurs.fr/documentation/operations/durability-repairs/)
and [failure-recovery](https://garagehq.deuxfleurs.fr/documentation/operations/recovering/)
contracts. Version-specific executable tests, not the generic phrase “S3-compatible,”
are the release evidence.

The scanner implementation and tests additionally follow the
[OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html),
ClamAV's official [container](https://docs.clamav.net/manual/Installing/Docker.html),
[scanning](https://docs.clamav.net/manual/Usage/Scanning.html),
[protocol](https://docs.clamav.net/manual/Usage/Scanning.html#clamdscan) and
[signature](https://docs.clamav.net/manual/Signatures.html) guidance,
[QPDF JSON inspection](https://qpdf.readthedocs.io/en/stable/json.html), the
[PDFium README](https://pdfium.googlesource.com/pdfium/+/refs/heads/main/README.md)
and [licence](https://pdfium.googlesource.com/pdfium/+/refs/heads/main/LICENSE),
[ImageMagick security policy](https://imagemagick.org/script/security-policy.php),
and gVisor's [security model](https://gvisor.dev/docs/architecture_guide/security/)
and [production guidance](https://gvisor.dev/docs/user_guide/production/). Pin the
actual builds, generated policy and sandbox configuration; these links do not make
an untested parser safe.

#### 17.2.1 Governed OCR and document extraction

D-065 keeps extraction outside MVP and makes any later OCR a transcription aid,
not an evidence source or decision maker. It may propose that pixels contain a
registration number, name, policy number, class or date. It cannot establish
document authenticity, issuer authority, current validity/revocation, subject
binding, regulatory applicability, compliance satisfaction, signature/stamp/QR
authenticity, fraud or identity. D-007/D-048 provider, evidence and policy controls
remain authoritative. Product/UI/API language uses `candidate`,
`confirmed_by_reviewer`, `corrected_by_reviewer`, `rejected_by_reviewer` or
`abstained`, never “OCR verified,” “AI verified” or “automatically compliant.”

When separately activated, run a signed `fleet-extraction` Python image on a
dedicated Indian extraction host outside application, data, storage, scanner,
control and observability hosts. D-043's two-image MVP release remains unchanged;
activation extends the signed release manifest and host/capacity/DR inventory
through a new approved topology gate. Do not place Python/model runtimes in
`fleet-server`. Benchmark pinned conventional open-source candidates such as
Tesseract, a non-generative PaddleOCR pipeline and docTR against Thaarei's own
approved evaluation cells before selection. Licence, maintainership, weights,
native libraries, supported scripts, reproducibility, CPU/GPU cost and security are
part of the result; a library's claimed language support is not product evidence.
Evaluate CPU-only first and add a dedicated GPU/driver path only after measured
throughput/latency/cost and hardening/recovery evidence justify it.

Use no cloud OCR or external AI API, general-purpose/generative LLM or VLM, prompt-
based document interpretation, autonomous agent/tool use, facial recognition,
biometric matching or AI fraud/authenticity decision. Model/weight/language files
are digest-pinned, scanned, SBOM/licence/provenance recorded and present in the
signed build; production cannot download or auto-update them at startup/runtime.
Any future generative or externally processed use case is a new D-062/privacy/
security/AI decision, not an extraction model upgrade.

The asynchronous path is:

```text
accepted upload generation
  → D-035 scanned, rasterized safe derivative
  → exact object/preprocess/model/schema extraction intent
  → isolated networkless Python job
  → size-bounded schema-validated untrusted field candidates
  → field-by-field human review against highlighted source
  → ordinary authorized/idempotent domain command
```

OCR never opens an active PDF/office original. The extraction coordinator creates
an exact, expiring, purpose-bound input capability for the safe raster derivative;
the host decrypts only in memory or bounded encrypted temporary space. It has no
database, ULIP/payment/email, general production-secret, Garage-list/admin or
internet access. Use D-038 mTLS, non-root/read-only runtime, gVisor, seccomp/AppArmor,
strict CPU/memory/process/page/pixel/output/time limits and no shared writable model
cache. A timeout, parser/model error or unavailable host returns to manual entry and
cannot weaken document access, evidence state or verification.

An extraction job is idempotent on exact organization/document/object generation,
preprocessor, model release, extraction schema and purpose. Its output is immutable;
a rerun appends a linked result. Fastify validates all output again and permits only
declared field types. Each candidate records page/bounding polygon, raw extracted
text, proposed normalized value, model score and calibrated band, abstention/reason,
model/weights/preprocessor/schema versions and later reviewer action/actor/time.
Treat extracted text as hostile: it never becomes code, prompt, HTML, filename,
query, policy or provider request without the normal typed validation and explicit
human/domain command.

Approve each `document type × issuer/template × jurisdiction × language/script ×
capture mode` independently. English RC scans do not approve Hindi licences,
mobile photographs, old permits or handwritten endorsements. Begin evaluation with
machine-printed RC, insurance, fitness and PUC cells. Driver licences, permits, tax
records, multilingual/handwritten fields and complex layouts wait for their own
privacy/coverage evidence. QR/barcode decoding is a separate typed extraction; its
contents are not authentic unless the applicable signature/issuer verification
path proves them.

A model score is not a probability. Calibrate and threshold separately by field/
cell/quality. Surface a critical registration/licence/policy identifier, validity
date, status or class only when held-out precision's 95% lower confidence bound is
at least 99%; use at least 97% for lower-impact descriptive suggestions. Otherwise
abstain and require manual entry. Report exact match, character error, precision,
recall, abstention/coverage, calibration, critical false suggestion/confirmation,
reviewer correction/rejection, time saved, latency/resource cost and performance by
script/template/quality/capture separately. Never hide a weak cell inside one
document-level “OCR accuracy” average or lower precision to inflate coverage.

The first production capability requires active human confirmation of every field
against its highlighted source crop. Critical fields have no approve-all/bulk-
accept control; a reviewer explicitly confirms or edits each one. OCR output never
commits an authoritative profile, calls ULIP, satisfies a requirement or changes
posture directly. Reviewer identity/permission and current document/aggregate
version are rechecked on commit, and D-050 handles later correction. Any automatic
authoritative-field acceptance or decision-affecting AI requires a new D-054 Tier 3
decision and is prohibited by D-065.

Every evaluation dataset version records purpose/basis/consent or licence, source,
document cells, inclusion/exclusion, capture/quality distribution, ground-truth
method/reviewers, item/content hashes, train/validation/test membership and
retention/deletion. Start with synthetic and lawfully licensed fixtures. Customer
documents and reviewer corrections do not enter training, fine-tuning, evaluation
or demonstration automatically. A later real-document corpus requires a separate
approved purpose, customer/data-principal authority where applicable, minimization,
restricted access and D-020 deletion. Critical-field truth uses two independent
annotators plus adjudication; keep the same subject, organization, template batch
and near-duplicate family in one split to prevent leakage.

Each model release binds code, weights, dependencies, configuration, schema,
licence/provenance/SBOM, compatible cells, evaluation dataset/results/thresholds,
resource profile, known limitations and rollback. Require offline evaluation,
security/licence/privacy review, D-054 Tier 2 independent data/product approval,
shadow comparison and opt-in design-partner rollout before promotion. Monitor cell-
specific input/template/quality drift, abstention, reviewer override/error proxies,
unknown layouts, schema failure, queue/resources and unexpected egress. Breaching a
cell's gate disables only that cell and returns to manual entry; thresholds never
relax automatically. A model change is a new immutable release, never an in-place
weight replacement.

Delete plaintext working files immediately after the job, with a 24-hour hard
recovery ceiling. Delete rejected/unpromoted candidate output 30 days after review;
confirmed candidate provenance follows the linked credential/evidence policy.
Evaluation corpora retain only for their separately approved purpose, and model
metrics contain no raw values, images or subject identifiers. D-020/D-050/D-058
propagate through candidate, corpus, hold and restore paths. The user is clearly
informed that extraction assistance was used and can inspect/correct the proposed
field and source.

Use a pinned applicable profile of the NIST AI RMF `GOVERN`, `MAP`, `MEASURE` and
`MANAGE` functions and reassess the official version when activation begins. The
framework makes validity/reliability, safety, security/resilience, transparency,
explainability, privacy and accountable human context lifecycle concerns. NIST's
adversarial-ML taxonomy also covers evasion, poisoning, privacy and supply-chain
attacks and notes that mitigations are incomplete. References:
[NIST AI RMF](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10),
[NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/),
[NIST AI 100-2](https://csrc.nist.gov/pubs/ai/100/2/e2023/final) and
[IndiaAI responsible-AI principles](https://indiaai.gov.in/responsible-ai/pdf/principles-point-of-focus.pdf).

### 17.3 Privacy

Driver data is digital personal data. Build for the Digital Personal Data
Protection Act, 2023 and the phased Digital Personal Data Protection Rules,
2025 even where particular provisions have future commencement dates. Legal
counsel must confirm Thaarei's and each customer's roles, lawful purpose,
notices, processor terms, grievance process, retention and breach obligations.

The default purpose-specific role allocation is that the customer organization
determines driver onboarding, engagement, assignment and compliance purposes as
Data Fiduciary, and Thaarei processes that data on its behalf under a Data
Processing Agreement. Thaarei is a separate Data Fiduciary only for narrowly
defined SaaS administration, security, billing, abuse prevention and legal
obligations. Driver data is not used for advertising, resale, cross-customer
profiling, model training or unrelated product analytics. The ULIP agreement and
Indian privacy counsel must validate this allocation before pilot.

Official references:

- [Digital Personal Data Protection Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf)
- [Digital Personal Data Protection Rules, 2025 and commencement material](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa)

Required controls:

- purpose and processing-basis records for each personal-data operation. Initial
  allowed SARATHI purposes are onboarding, licence eligibility, assignment/class
  compatibility, renewal monitoring, identity-discrepancy resolution and a
  documented incident/claim/regulatory review; generic “business use” is prohibited;
- `section_7_employment` is available only for an actual employee engagement with
  organization legal attestation; consent is the default for contractors,
  candidates and owner-drivers unless counsel approves another recorded basis;
  the product never infers an employment basis from a fleet/duty assignment;
- data minimization, especially SARATHI/01 DOB and detailed personal fields;
- no global driver identity, cross-tenant licence-match disclosure, or reuse of one
  organization's driver observations for another organization;
- clear standalone organization/driver notices identifying the fields, purposes,
  provider, schedule, retention, rights and contact path, in the exact D-060
  approved language; every consent request exposes the counsel-approved English/
  Eighth Schedule option independently from complete product UI locales;
- provable consent records where consent is used, including notice version/hash,
  language, purpose/fields, method and affirmative event. Assisted signed
  authorization is distinguished from driver self-service;
- authorization withdrawal that stops and cancels future consent-based polling
  within a reasonable time without rewriting earlier lawful observations. Loss of
  current verification produces `not_determined`, not `known_failure`;
- correction, access, erasure, grievance, authorization-history and nomination
  request workflows subject to valid legal/contractual retention;
- corrections never overwrite an immutable SARATHI observation: amend the local
  profile, record the discrepancy and reverify where appropriate; D-050 propagates
  the operational correction while erasure removes no-longer-authorized personal
  values from versions, projections, processors and avoidable audit content;
- a processing-role matrix, customer DPA, subprocessor inventory and contact/SLA
  ownership for rights requests;
- subprocessors and cross-border transfer inventory;
- breach assessment and notification workflow;
- privacy-safe analytics with no raw identity/document data;
- deletion propagation to object storage, caches, search and subprocessors according
  to policy, plus bounded backup expiry and mandatory tombstone replay after restore.

#### 17.3.1 Data-principal rights, grievances and nomination

D-059 provides one privacy-case control plane for authenticated platform users and
drivers who have no account. It exposes an accessible authenticated privacy center,
a mobile-accessible public form and published privacy email/assisted channel. An
organization may assist submission, but rights never require a Thaarei account or
employer-only route; an independent Thaarei escalation remains available when the
complaint concerns the organization. Public intake returns a generic reference and
never confirms whether a person, licence or organization relationship exists.

One intake can create separately scoped matters for access; correction, completion
or update; erasure; consent/authorization withdrawal; processing/authorization
history; grievance; nomination; nominee/guardian invocation; or subject/provider-
identity dispute. They retain one requester-facing tracking reference but independent
owners, decisions, deadlines and outcomes. A request is not silently converted to a
different right, and grievance closure does not remove its history or available
escalation.

Route each matter by the D-011 processing-role matrix. For organization-controlled
driver onboarding, engagement, assignment and compliance, the customer Data
Fiduciary verifies its decision authority and decides disclosure, correction,
retention exception and grievance outcome; Thaarei executes and evidences processor
search/correction/deletion tasks under the DPA. Thaarei decides only its independent
login, SaaS administration, security, billing, abuse-prevention and legal processing.
A mixed request is split accordingly. Customer delay escalates under the DPA but
does not authorize Thaarei to invent the fiduciary's legal decision; equally, a
customer cannot decide Thaarei's independent processing.

Verify the data principal, requester and any representative proportionately to the
requested disclosure/change. Prefer an existing verified contact, organization-
issued request/driver reference, authorized in-person organization attestation or
controlled manual review. Do not demand Aadhaar, PAN, selfie, biometrics or a new
full identity document by default. Licence number, DOB or other restricted evidence
may be collected only when necessary to resolve identity, through D-024, and erased
under a short verification-artifact policy. Use constant/generic responses, rate
limits and audited attempts; disclose no tenant, match or data before sufficient
verification. The organization cannot be the only verifier when it is the subject
of the grievance.

Use this state model, with reasoned waiting-party substate and clocks:

```text
received -> verification_pending -> scoped -> in_progress -> response_review
         -> fulfilled | partially_fulfilled | denied | withdrawn
active states may be waiting_for_requester | waiting_for_fiduciary
                  | waiting_for_processor | overdue
```

Issue an immediate receipt/reference, request missing verification within three
business days, target ordinary completion within 30 calendar days and reasoned
complex completion within 60. The published grievance limit must never exceed the
DPDP Rules' 90-day maximum. Waiting time, extensions and legal/processor dependencies
remain visible and notified; an internal target does not erase the statutory outer
limit. Consent withdrawal begins stopping affected future processing immediately
and never waits for the general response SLA.

An access response is a purpose-built, minimized summary, not a database dump. It
includes authorized personal-data categories/values, processing activities and
purposes/bases, source categories, retention state, applicable other fiduciaries/
processors and categories shared, rights routes and material disputes/deferrals.
Filter other persons, cross-tenant data, authentication/security secrets and legally
protected investigation details; every withholding is counsel-approved and reasoned.
Generate from an immutable request snapshot and record included/excluded categories,
source versions and `as_of`.

Correction uses D-050: append/supersede organization-local data, preserve the
original ULIP observation, mark provider conflicts disputed, reverify or route the
issuer-resolution path, recompute current compliance and reconcile search, cases,
notifications, exports and processors. Report each category as corrected, disputed-
authoritative/unmodifiable by Thaarei, waiting for evidence or denied with reviewed
reason. A provider record is never rewritten to make the request appear complete.

Erasure creates D-020 targets and reports each as erased, already absent, retained
under exact purpose/law, deferred by a D-058 binding, waiting for processor or failed/
remediating. Erase eligible items even when one category is retained; a partial basis
cannot retain the entire profile. Consent withdrawal binds the exact purposes,
cancels queued/future dependent ULIP work, invalidates relevant caches/routes and
recalculates freshness/compliance as `not_determined` where necessary without
rewriting earlier lawful processing or terminating unrelated contracts. Restore
replay must reproduce these outcomes before service.

A grievance records the alleged act/omission, responsible fiduciary/processor,
request history, privacy owner, evidence/communications, investigation, remediation,
response, published privacy contact/escalation and requester feedback. Alert on SLA
burn, waiting parties, processor failures and recurrent themes with no PII in metrics.
Thaarei must maintain the prominent contact/rights route required by the DPDP Rules.

A nomination is a separately verified, replaceable/revocable record and grants no
present login, membership, cross-tenant discovery or data access. Invocation occurs
only after counsel-approved proof of death or qualifying incapacity plus nominee and
current-record verification. Lawful guardian/representative authority uses its own
evidence and expiry. A family, employer or tenant-administrator assertion alone is
insufficient.

Deliver results through the authenticated privacy center or, for a verified non-user,
an opaque single-use short-lived flow. Reauthorize at generation and download, bind
the exact recipient/request, encrypt the artifact, retain it for 24 hours, notify by
an independently verified channel and audit grant/access. Provide an assisted
accessible alternative. No personal data or meaningful request identifier enters a
public URL.

Each request stores immutable UUIDv7; requester/data-principal/representative IDs;
organization and fiduciary/processor owner; verification assurance; matter/scope;
notice/consent/retention/hold versions; deadline/waiting clock; processor/store tasks
and receipts; decision/reason; response package hash; communication/delivery and
escalation state. It cannot be `fulfilled` while a required target is merely queued;
partial/outstanding state is explicit. Integrating a registered Consent Manager,
cross-customer matching and automated/AI legal decisions are outside MVP.

The official DPDP Act defines [access, correction/erasure, grievance and nomination](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf),
and the notified DPDP Rules require published request means/identifiers and a
[grievance period no longer than 90 days](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
Counsel must approve the production role allocation, verification evidence,
exceptions, representative invocation, response text and deadlines before pilot.

`SARATHI/02` remains the normal path but still requires an active purpose/basis.
`SARATHI/01` is permitted only for identity-discrepancy resolution, a detailed
endorsement/attribute unavailable from `/02`, a documented compliance case, or
another specifically approved field-mapped purpose. Every `/01` call requires DOB
authority, enhanced-field permission, a reason and audit event; it is never a
blanket recurring check.

### 17.4 Security logs and incidents

CERT-In directions require covered entities to report specified incidents within
six hours of noticing them and include clock-synchronization and log-retention
obligations. The production runbook must identify reportable events, accountable
roles, contact paths, evidence preservation and the required retention period.

Synchronize infrastructure/application clocks to approved accurate sources
traceable as required, monitor drift and store event timestamps in UTC. Covered
ICT/security logs remain securely available in the primary and recovery Indian sites for
at least the rolling 180-day CERT-In period. Before the relevant DPDP Rules commence
in May 2027, the retention matrix must apply their one-year requirement to the
processing data, associated traffic data and other logs within scope. This does not
justify retaining every raw provider payload: purpose, scope and minimization still
apply, and counsel must approve the implemented mapping.

- [CERT-In directions under section 70B](https://cert-in.org.in/Directions70B.jsp)
- [CERT-In 28 April 2022 directions](https://cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf)

### 17.5 Third-party, supplier and subprocessor governance

D-062 applies to a hosted service, government or regulated provider, professional
adviser, support contractor, production infrastructure vendor, build/distribution
service and self-hosted software source. Maintain one authoritative supplier
register, but never collapse two different questions:

1. **Legal/data role:** processor or subprocessor; independent Data Fiduciary or
   controller; government/authoritative data provider; regulated payment or
   statutory recipient; infrastructure provider; software/build supplier with no
   production data; or professional adviser/support provider. Record a mixed role
   per purpose/service where necessary rather than assigning one convenient label.
2. **Operational criticality:** `C0` has no production access/data and is readily
   replaceable; `C1` is internal or low impact; `C2` handles tenant-confidential
   information or materially affects delivery; `C3` handles restricted,
   authentication, payment or statutory data, is critical infrastructure/DR, or can
   materially stop a regulated/customer journey.

The initial classification is:

| Dependency | Initial criticality | Initial relationship; evidence still required |
| --- | --- | --- |
| ULIP and each activated dataset | C3 | Government/authoritative provider; the agreement determines any additional role and ULIP is not presumed to be Thaarei's subprocessor |
| Active/recovery VPS hosting and attached storage providers | C3 | Infrastructure provider and processor to the extent it can process customer data/support evidence |
| ZeptoMail India | C3 | Transactional-message processor under D-032 |
| Razorpay | C3 | Regulated collection provider; record independent-fiduciary/controller versus processor duties per exact capability and contract |
| Statutory accounting system and future IRP/GSP | C3 | Statutory/finance recipient or processor as contract and law establish; never a second billing authority |
| GitHub and GHCR | C2 | Source/build/distribution supplier with no production customer data or production secrets |
| Cloudflare DNS-only | C2 | DNS supplier with no application HTTP content in the approved D-034 configuration |
| Self-hosted Garage, Grafana, Loki, Gatus, ntfy, Valkey, PostgreSQL, Traefik, optional Infisical/CrowdSec and libraries | C0–C2 by actual effect | Software suppliers, not subprocessors merely because their code runs; separately assess maintainers, update channels, telemetry, licences and supply-chain exposure |
| Apple/Google push relays used by ntfy | C2 unless escalated by data | Separate communication suppliers; send no customer, subject, compliance or security detail and record their actual metadata/terms |

Every record names the exact contracted legal entity, service and owner; role and
criticality; purposes, people and data classes; data-flow endpoints; processing,
support, backup and recovery locations; credentials/environments; contract, DPA,
security schedule, subprocessors and change-notice terms; evidence and expiry;
availability, quota, support and incident commitments; retention, return, deletion
and backup behavior; concentration and financial risk; exceptions/residual risk;
renewal/reassessment dates; and a tested replacement/export/deletion runbook.

Before first use, complete the following admission package:

1. prove necessity and consider a simpler/self-hosted alternative;
2. diagram the minimum fields, direction, purpose, frequency, recipients and
   location, including support and telemetry paths;
3. approve the legal/privacy role, basis, notice/DPA and any transfer restrictions;
4. review identity, encryption, isolation, vulnerability, logging, deletion,
   personnel/support access and independent evidence;
5. document quotas, concurrency, SLOs, support, monitoring, reconciliation,
   dependency failure and a safe degraded mode;
6. approve purpose/confidentiality/security, subprocessor/location change,
   incident, audit/evidence, liability, continuity and termination terms;
7. approve price, capacity, renewal, concentration and exit cost; and
8. implement one typed adapter where applicable, contract/normalization fixtures,
   environment-isolated credentials, timeout/retry/idempotency rules, kill switch,
   health/quota signals and effect reconciliation.

C2 onboarding and material changes use at least D-054 Tier 2; C3 uses Tier 3. A
purchase order, security questionnaire, certificate or successful API call is only
evidence, not approval. No developer may add a provider, analytics/tag SDK, remote
font/script, hosted production integration, privileged support path, package with
runtime telemetry or production-capable GitHub Action outside the register and
admission gate. D-025 still governs every component and transitive dependency.

Contracts for a data-processing or C3 service must state exact purposes, data
classes and documented instructions; confidentiality and least access; appropriate
safeguards; no resale, advertising, unrelated analytics or model training;
processing/support/backup locations; subprocessor flow-down and prior change
notice; rights, correction, erasure, hold, breach and regulatory assistance;
retention, return, backup expiry and deletion evidence; audit/evidence cooperation;
availability, quota, support and escalation; continuity and termination. Target
notice to Thaarei of any suspected relevant incident within four hours of discovery
for C3 and twelve hours for C2, with immediately available facts and continuing
updates. A weaker term requires a named legal/security exception that demonstrates
how Thaarei can still meet applicable duties, including CERT-In's six-hour window.
The DPDP Act keeps the Data Fiduciary responsible for processing done on its behalf
and permits a Data Processor only under a valid contract; the notified Rules require
appropriate contractual safeguards and processor assistance. See the official
[DPDP Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf),
[DPDP Rules, 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
and [CERT-In directions](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf).

Use purpose- and environment-scoped credentials through the selected secrets-provider
path, source/IP or mTLS
restriction where supported, least egress and typed allowlisted endpoints. Never put
restricted data in supplier tickets, screenshots or recordings. Suppliers receive
no standing production login. Exceptional direct access is a named, exact-scope,
step-up-authenticated, supervised, time-bounded D-054 Tier 3 grant through D-037/
D-019 controls; the supplier ticket never grants access by itself.

Monitor availability, latency, errors, quota, certificate/token expiry, security
advisories, evidence expiry and relevant subprocessor/region/terms changes. Review
C3 at least every six months and before renewal; review C2 annually and before a
material change. A new purpose/data class, location, subprocessor, API/schema,
authentication method, retention behavior, security incident, acquisition or
material contract/SLO change reopens the gate. Publish and keep current the actual
customer-data processor/subprocessor list with service purpose and location; do not
misrepresent independent recipients, government providers or software-only
suppliers as subprocessors. This implements the supplier inventory, contract,
monitoring and exit outcomes in NIST CSF 2.0 `GV.SC`; use the official
[NIST C-SCRM quick-start guide](https://www.nist.gov/publications/nist-cybersecurity-framework-20-quick-start-guide-cybersecurity-supply-chain-risk)
and [NIST SP 800-161r1](https://csrc.nist.gov/pubs/sp/800/161/r1/final) as control
evidence rather than a certification claim.

Exit stops transfers and queued jobs first, revokes credentials, tokens, webhooks,
DNS and access, retrieves required records, reconciles incomplete external effects,
applies D-020 retention/deletion and D-058 holds, obtains deletion/return evidence,
communicates customer impact and activates the tested replacement or explicit
degraded mode. Exercise every C3 exit plan annually without deleting production
data. Automatic provider failover is prohibited unless separately designed for
semantic equivalence, duplicate/effect reconciliation, privacy roles, data
location, authorization and notification; a second ungoverned provider is not a
resilience control.

### 17.6 Data residency, transfers and sovereign-access boundary

D-066 defines one `INDIA_CORE` platform profile for MVP. It is a product and
contract control, not an inference from a provider's datacentre address. Track these
properties independently for every data flow and copy:

1. storage location, including primary, replica, temporary, cache and archive;
2. processing location, including serverless/build/telemetry and supplier handling;
3. backup and recovery location;
4. human administration, support and incident-response access location; and
5. the provider's legal/control jurisdictions and government-disclosure path.

Core data comprises organization/user/membership/authorization state; vehicle,
driver, fleet, assignment and identity information; documents and evidence; raw and
normalized ULIP observations; compliance decisions/findings/cases; authentication,
session and secret material; encryption/search/signing keys; application audit and
security logs; support cases/attachments; Thaarei-held billing/tax/settlement
records; product-measurement events/rollups; exports; and future extraction inputs,
outputs or customer-derived datasets. Store, process, back up, restore and ordinarily
administer this data only in India. Keep database, object, search, telemetry,
security archive and recovery-VPS/offline copies in India; foreign failover is
not an MVP resilience mechanism. India-held keys do not make foreign plaintext
viewing local processing.

Thaarei production operators and support personnel work from India in MVP. Enforce
named-person FIDO2, D-037 network/mTLS boundary, D-054 just-in-time scope, section
13.5 purpose and D-019 audit; an IP geolocation result alone is not proof of a
person's location or authority. Suppliers receive no standing access. Conservatively
treat any foreign plaintext viewing or execution as a transfer/disclosure event
pending counsel's exact legal characterization. A necessary exception names the
person, country, purpose, records and commands; is supervised, non-downloadable and
time bounded; and requires D-054 Tier 3 legal/privacy/security approval plus verified
session closure. An emergency does not silently waive residency: use an India-based
responder or the declared degraded/manual mode.

Maintain `data_residency_profiles`, `data_flow_records`, `transfer_assessments`,
`transfer_approvals`, `remote_access_sessions`, `customer_residency_commitments`,
`government_request_cases`, `transfer_incidents` and
`residency_reconciliation_runs`. A flow record names source/destination country and
endpoint, storage/processing/support/backup locations, purpose and legal role/basis,
people/data classes, provider/subprocessors, encryption/key accessibility,
retention/delete/return behavior, customer notice/contract term, D-062 record,
approver, effective/expiry time and evidence. A new country, purpose, data class,
support path, backup region, subprocessor or legal-control jurisdiction reopens the
D-062 material-change and D-054 gate.

The following are narrow registered routes, not exceptions that absorb arbitrary
content:

| Route | Maximum permitted data and control |
| --- | --- |
| Cloudflare DNS-only and ordinary internet routing | DNS, source/destination IP and transport metadata inherent to the connection; no authenticated HTTP content under D-034 |
| GitHub/GHCR and build distribution | Source, dependency, image, SBOM, provenance and synthetic-test metadata only; never production secrets, dumps, logs, documents, support attachments or customer fixtures |
| Apple/Google relay used by ntfy | Optional opaque poll identifier/topic hash only under D-033; no tenant, subject, compliance, security or alert content |
| ZeptoMail | Minimum recipient/template/delivery metadata and non-sensitive link-only content under D-032, only after written storage, processing, backup and support-location evidence |
| Razorpay and the statutory finance route | Minimum checkout/payment/reference/tax route under D-061 and exact applicable contracts/law; never copy payment credentials into Thaarei stores, telemetry, product analytics or support |
| Customer-authorized user, email, export or future API/webhook destination | Customer-directed disclosure after normal field authorization, step-up, purpose, recipient/destination validation and audit; it is not silently relabelled Thaarei-local processing |

A customer-directed overseas login or download is distinct from Thaarei selecting a
foreign processor, but it still renders data abroad. Record it under the normal
access/export evidence and let an organization policy prohibit countries/destinations
when its approved contract requires that restriction. D-027 and a transfer decision
are both required for any future outbound integration. Never promise control of a
recipient's subsequent screenshot or mailbox location; state the contractual and
technical boundary accurately.

Offer no bespoke residency profile in MVP. If an agreed stricter India-only
commitment cannot tolerate Apple/Google relay metadata or overseas user delivery,
disable those routes for that organization and use authenticated in-app/direct
polling plus an independently approved compatible message path. Reject a contract
whose promise cannot be enforced. Customer wording must distinguish “core customer
and personal data stored, processed, backed up and administered in India” from the
named minimum network, payment, email, device-delivery or customer-directed routes;
do not claim that every byte always remains in India.

Default-deny production egress except manifest-bound endpoints; assert region and
account identity at service startup; prohibit foreign object/database/log replicas;
and reconcile runtime destinations, DNS, configured provider regions, backup
inventories, support access and D-062 evidence quarterly and after every change.
Detection of an undeclared destination, copy or foreign session opens a security/
privacy incident, blocks the affected route where safe and invokes D-020 deletion/
return reconciliation. Legal/government requests are independently validated,
narrowed and recorded, use D-054 Tier 3 unless urgent law requires otherwise, and
preserve D-058 custody without granting a supplier or foreign authority direct
production access. Contract for notice and challenge where legally permitted.

Thaarei is not to store card number, CVV, PIN, OTP or other card-on-file credential.
Razorpay's regulated role does not remove Thaarei's duty to inventory the exact
flow: obtain evidence for its applicable India storage, foreign processing deletion,
support/subprocessor access and incident behavior; retain only provider references
and required commercial, tax and settlement records in Thaarei's India plane. RBI's
payment-data directive places direct compliance responsibility on the authorized
payment-system operator; this plan therefore verifies Razorpay evidence rather than
claiming Thaarei is that operator.

The DPDP Act section 16 permits the Central Government to restrict transfer to
notified countries/territories and preserves stricter sectoral laws. DPDP Rule 15,
in the eighteen-month commencement tranche, also allows Government requirements
concerning availability to a foreign State or an entity under its control. Track
notifications/orders and obtain Indian-counsel approval before production rather
than treating the present absence of a blanket localization rule as unrestricted
permission. See the official [DPDP Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf),
[DPDP Rules, 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf),
[RBI payment-data directive](https://rbi.org.in/Scripts/NotificationUser.aspx?Id=11244)
and [RBI FAQ](https://systemhealth.rbi.org.in/Scripts/FAQDisplay.aspx_Id%3D130%281%29.html).

If international service is later required, pin each organization to one immutable
home region and independently operate its regional data plane. A region move needs
customer and legal authority, D-054 Tier 3 approval, an immutable copy manifest,
integrity/reconciliation proof, a controlled cutover and verified old-region
deletion. Never obtain latency or availability by silently globally replicating an
Indian tenant.

### 17.7 Abuse, fraud and automated-threat control

D-067 creates one implementation boundary without pretending that every suspicious
event has the same meaning. Keep authentication compromise/security incident,
customer-application review, platform/ULIP misuse, payment dispute or chargeback,
insider investigation, compliance finding, privacy/legal matter and customer-
support case as separate linked records with their own authority, visibility,
deadline and retention. A provider risk flag or high request rate is evidence, not
a legal finding that a person committed fraud.

Maintain `abuse_rule_versions`, `abuse_signal_events`, `abuse_decisions`,
`protective_actions`, `abuse_cases`, `abuse_appeals` and
`action_reconciliation_receipts`. Each rule declares the protected journey and
threat; signal allowlist; population/window/threshold; decision and maximum action;
false-positive/accessibility risk; purpose/legal role; owner/approval; customer-safe
reason; retention; effective/expiry version; monitor/rollback criteria; and its
D-019/D-020/D-054/D-055 relationship. Never calculate a universal person, driver,
organization or customer “trust”, “fraud” or “risk” score.

The initial threat catalogue covers:

- fake/repeated customer applications, trials and invitation/notification spam;
- password guessing, credential stuffing, enumeration, reset/recovery and
  authenticator/invitation replay or exhaustion;
- compromised sessions, unusual sensitive disclosure and bulk export attempts;
- automated ULIP enumeration, unrelated subject harvesting, entitlement/quota
  evasion and cross-organization subject spraying;
- upload/import/search/report resource exhaustion and malicious repeated failures;
- checkout/order creation abuse, card-testing indicators, disputed collection and
  chargebacks; and
- privileged tenant or Thaarei insider misuse, without substituting automated
  employee surveillance for D-017/D-019/D-054 controls.

Use only purpose-bound server-side signals: route/operation/outcome and cost band;
coarse source network/IP evidence; separately keyed account or normalized-email
HMAC; anonymous session, authenticated identity and organization; authentication,
application, invitation, reset, notification and export velocity; concurrent and
aggregate file/batch bytes/rows/failures; ULIP dataset, entitled purpose, subject-
diversity/miss and quota effects; and approved Razorpay order/payment/risk/result
references. Restricted values remain referenced by UUID or field-specific keyed
token and never appear in the signal payload. Do not reuse abuse evidence for
marketing, product analytics, driver scoring or employee productivity.

MVP prohibits cross-site tracking, advertising identity, persistent browser abuse
ID, canvas/font/audio/WebGL fingerprinting, mouse/scroll/keystroke capture and a
hosted anti-fraud/bot/CAPTCHA SDK. Coarse IP/user-agent/security evidence follows
D-019/D-020 purpose and retention; it is not copied into D-064 product measurement.
Keep volatile counters in `valkey-coordination` under its no-persistence/24-hour
maximum contract; commit a durable rule/decision/action and minimum evidence in
PostgreSQL only when needed for enforcement, review or security duties. Do not retain
raw signal collections merely because they may be useful later.

Every sensitive journey evaluates independent applicable buckets rather than a
single `network + account` key:

| Dimension | Examples |
| --- | --- |
| Network | IP/prefix and coarse locally available network signal; a shared office/mobile network cannot alone prove abuse |
| Anonymous/session | Application, public recovery and unauthenticated upload-initiation session |
| Account/identity | Normalized-email HMAC, login account and authenticated global user independently of source network |
| Tenant | Organization, billing account or customer application without sharing one tenant's evidence with another |
| Operation | Route, request cost, concurrency, batch/file bytes/rows and sensitive disclosure/export class |
| Provider subject | Dataset, organization purpose, typed subject and diversity/miss/refresh pattern under D-010/D-011 |
| Integration | Future machine credential plus endpoint/tenant/provider quota under D-027 |

Use versioned token/sliding-bucket semantics at both Traefik/Fastify boundaries,
with the stricter result winning and D-040 uncertainty failing safely for costly/provider/
sensitive work. Avoid precise feedback that exposes which bucket or threshold fired;
return the normal generic authorization, `429`, bounded-queue or operation response.
Measure false positives, challenge completion, lockout and customer-support load.
Authentication limits conform to the pinned Better Auth adapter and NIST's effective
throttling requirement; the NIST 100-consecutive-attempt number is an upper bound,
not a recommended Thaarei setting. Approve lower progressive thresholds from load,
shared-network and account-denial-of-service tests.

Use these typed decisions and maximum consequences:

```text
allow → observe → throttle_or_queue → step_up → hold_operation
      → restrict_capability → manual_review → scoped_suspend → terminate
```

Automation may slow/queue, require verified email or recent passkey/MFA, revoke a
demonstrably compromised session, or place an expiring hold on the exact expensive
or sensitive operation. It never fabricates/stales/poisons a response; changes a
provider observation, compliance result, statutory/finance record or legal fact;
deletes data; permanently terminates; or makes a fraud, employment or criminal
conclusion. Privacy/grievance, independently reachable security reporting, safe
account recovery and legally required billing/export access remain reachable under
the applicable verification even when another capability is restricted.

A material identity/organization suspension or contract termination names evidence,
scope, legal/contract authority, allowed residual capabilities, start/review/expiry,
communication, appeal and reinstatement/reconciliation requirements and uses D-054
Tier 3 human approval. Immediate D-021 containment may revoke a confirmed compromised
session/credential and pause the affected capability; it cannot be disguised as a
final punitive decision. Do not delete evidence on a hold: D-020/D-058 govern lawful
retention and later erasure.

ULIP work must bind to an active managed subject or approved onboarding candidate,
organization, entitled dataset and recorded purpose. Repeated unrelated identifiers,
material miss/diversity anomalies or attempts to multiply global allowance through
tenants pause the exact dataset/purpose queue and create review; they do not disclose
whether another tenant owns a subject, call a fallback dataset, invent a fact or
convert provider uncertainty into non-compliance. D-010's global/per-dataset/per-
organization limiter remains authoritative over all sessions and organizations.

MVP public onboarding requires verified email, D-049 manual business/authority and
product/ULIP review, independent application/invitation velocity limits, generic
non-enumerating outcomes and accessible honeypot fields where they test safely.
Prefer progressive delay, passkey/MFA and manual review over a visual puzzle. Do not
reject solely because a browser is hardened, a network is shared or accessibility
automation is present. Any later CAPTCHA, device-attestation or hosted bot/fraud
provider requires evidence simpler controls failed plus D-062 supplier, D-066
residency, privacy notice/DPIA, accessibility alternative, false-positive and outage
gates. A challenge outage must not block the protected account/privacy route.

Keep payment entry Razorpay-hosted and independently limit quote/checkout/order
creation. Do not accept card data, run card scoring or replay a failed order merely
to test payment state. Verify signed callbacks and provider API state under D-061;
provider risk, failure, refund and chargeback records are inputs to a distinct finance/
abuse case and cannot alone terminate access, edit a tax document or decide fraud.

Every material action exposes a safe reason category and case/appeal route without
revealing detection thresholds, other tenants, security sources or restricted
evidence. Reviewers see only purpose-authorized evidence; organization administrators
see their applicable operational restriction but not requester-private or platform-
security material. On reversal or expiry, atomically restore only the permitted
capabilities, invalidate stale jobs/sessions as necessary and reconcile queued ULIP,
notifications, exports, billing/access and audit effects without replaying prohibited
work.

This profile applies the layered, endpoint-specific, privacy-aware approach in the
[OWASP Bot Management and Anti-Automation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html)
and the throttling/phishing-resistant guidance in
[NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html). OWASP's examples
are design input, not blanket requirements: this compliance product must never serve
deliberately false data, and a third-party challenge/fingerprint is prohibited unless
the separate approval gates above pass.

### 17.8 Data rights, intellectual property and permitted use

D-068 separates authority, privacy role, licence and intellectual-property rights;
none can be inferred from physical possession, a database row or a generic “data
owner” label. Use this initial rights matrix, subject to Indian-counsel review and
the exact customer/ULIP/supplier agreements:

| Class | Rights and permitted use |
| --- | --- |
| Customer Content | Customer-entered fleet/driver operations, assignments, notes, configurations, communications and lawfully uploaded evidence. As between the parties, the customer retains its existing rights and grants Thaarei a limited service/security/support/legal-operation right—not sale, advertising, unrelated analytics or model training |
| Personal data | No contractual property assignment. Data Principal rights and the exact customer/Thaarei Data Fiduciary/Data Processor role, purpose/basis, notice, withdrawal, correction, erasure and applicable law govern every use |
| Authoritative third-party data | ULIP/VAHAN/SARATHI/FASTag/eChallan and other issuer/provider observations. The source/agreement controls use, retention, attribution, display, export, redistribution and derivative rights; a government source is not automatically open data |
| Thaarei Materials | Thaarei-created software, generic schemas/workflows, policy engine, generic policy/reference material, documentation and methods, subject to third-party/open-source/statutory-source rights; customer-confidential content never enters them by implication |
| Tenant Output | Organization-specific evaluation, verification summary, finding/case/task, report, reconciliation or evidence package. Customer receives continuing internal operations/audit/regulatory/legal-evidence use for a lawfully exported output; Thaarei keeps underlying platform IP and receives no unrestricted right to commercialize the tenant-specific result |
| Security/operations evidence | Authentication, abuse, infrastructure, supplier, audit and incident evidence used only for security, reliability, support, legal/regulatory and service operation; customer receives only its safe authorized subset |
| Approved non-identifying aggregate | D-064-reviewed output only for capacity, reliability, security and declared product improvement; no sale, advertising, re-identification, customer-identifiable benchmark, model training or raw ULIP/driver/document/support content |
| Voluntary feedback | Narrow non-exclusive product-evaluation/improvement permission only; exclude personal/customer/provider data, attachments, confidential matter and anything supplied without authority |

A customer warrants that it has lawful authority and any necessary instructions/
notices to provide Customer Content for the documented service purpose. This is not
a warranty that it “owns” a driver, licence, identity record, statutory document or
every intellectual-property right in an uploaded file. Thaarei's processing right
ends or narrows when the purpose, contract, consent/legitimate-use authority or
retention basis ends; D-020, D-058 and D-059 remain controlling despite broader
commercial drafting.

ULIP public objectives describe data exchange and compliance uses but are not a
licence for arbitrary resale, publication, customer API redistribution, cross-tenant
reuse, benchmarking or training. Record each dataset's exact agreement/application/
approval version, authorized product use, customer population, fields, attribution,
cache/retention, presentation, export, derivative, redistribution, subprocessor and
termination restrictions. Raw provider responses never enter a public/customer API,
bulk export, aggregate or training corpus unless the exact written right is approved.
Normalization, mapping or a Thaarei field name does not extinguish provider/source
restrictions. Unknown, expired or conflicting rights return a typed
`use_not_authorized_or_not_determined` result for the proposed secondary action;
they do not erase or falsify an otherwise lawfully retained operational observation.

Do not infer that the Government Open Data Licence – India applies to ULIP or an
API dataset merely because its source is governmental. Apply it only where the
exact dataset is expressly licensed under it and preserve attribution/non-
endorsement/no-warranty conditions. The licence itself excludes personal
information, identity documents, non-shareable/sensitive data and information the
provider cannot license. An open-data publication and an authenticated purpose-
approved ULIP response are different rights contexts.

Every Tenant Output binds organization, source observations/evidence, provider/
licence restrictions, policy/reference/mapping versions, `as_known_at`, generation
time/freshness and permitted display/export/redistribution status. A customer may
retain and use a lawfully downloaded immutable report/evidence package for its
internal operations, audit, regulator or legal matter after service ends, subject to
personal-data, provider and recipient restrictions. This does not provide source
code, platform-wide reference/policy internals, another tenant's data, a continuing
online service or a right to represent provider/Thaarei endorsement.

D-064 remains the exclusive product-measurement boundary. Removing a name or
organization UUID does not create a reusable Thaarei asset. A cross-organization
aggregate requires a documented purpose, field prohibition, disclosure-risk review,
minimum population, output inspection and retention/deletion rule; it must be
deleted/recomputed if risk changes. There is no external or customer-identifiable
benchmark in MVP. Customer Content, provider data, reviewer corrections, support
material and tenant output cannot train/fine-tune/evaluate a model or populate a
demo without a new explicit purpose, source right, customer/privacy authority and
D-054 Tier 3 decision; D-065's stricter extraction rules still apply.

Feedback is an explicit field/workflow, not everything a customer communicates.
The user confirms that the submitted text contains no personal, provider, regulated
or confidential content and has authority to provide it. Thaarei receives a bounded
non-exclusive right to evaluate/incorporate the idea without attribution/payment,
subject to the approved contract; attachments, support conversations, feature data
and unsolicited restricted content are not feedback and retain their ordinary
classification. A customer-specific implementation or paid work product follows its
statement of work rather than the generic feedback term.

Maintain `data_rights_classes`, `permitted_use_policy_versions`,
`source_licence_versions`, `content_authority_assertions`,
`provider_use_restrictions`, `tenant_output_grants`, `data_use_events`,
`aggregate_release_reviews` and `rights_reconciliation_runs`. Every governed object,
observation, output or dataset binds source/rights class; organization; purpose and
role/basis; source/contract/provider licence version; permitted recipients;
display/export/redistribution/publication/benchmark/training flags; attribution;
retention/deletion/hold; territory where material; effective/expiry time; and
customer/Thaarei approval. Do not copy all rights fields onto every fact: immutable
records reference a versioned policy/source grant whose historical meaning remains
reproducible.

Before a download, export, report, support disclosure, integration, aggregate,
publication, demonstration or dataset/model use, the server intersects current
authorization, purpose, D-066 destination, source right, customer contract, provider
restriction, privacy/legal authority and retention/hold state. Record a minimized
decision/use event. A feature flag, owner role, subscription or customer request
cannot expand source rights. Rights tightening stops new use immediately and creates
reconciliation targets for pending exports/jobs/caches/processors; historical lawful
evidence remains labeled and D-020 decides later deletion.

During service and D-020's 30-day termination window, provide a documented machine-
readable export of Customer Content, customer configuration, permitted Tenant
Outputs and provider-derived fields only where their source right allows it. Exclude
other tenants; Thaarei/supplier secrets and source code; internal security/abuse
methods; privileged personnel or supplier-confidential evidence; and prohibited raw
provider payloads. Explain each exclusion with a safe category. Customer access
ending does not revoke an already lawful export, while its subsequent handling
remains subject to law and source/recipient restrictions. Complete return/deletion/
hold receipts without retaining a “derived” copy that reconstructs deleted content.

The DPDP Act defines Data Principal, Data Fiduciary and Data Processor and keeps the
Data Fiduciary accountable for processing on its behalf; those statutory roles are
not ownership grants. See the official [DPDP Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf),
[ULIP portal](https://goulip.in/) and
[Government Open Data Licence – India](https://up.data.gov.in/godl). The public ULIP
page and open-data licence are boundary evidence only; the signed ULIP/customer
agreements and dataset approvals must establish the implemented rights.

## 18. Audit logging

Maintain two related but separately authorized streams. Tenant application-audit
events explain customer/business activity. Thaarei platform-security events cover
authentication abuse, operator/recovery/break-glass activity, infrastructure,
access/key/secrets/storage/database/network/deployment/backup controls, edge/rate-limit
signals, audit-pipeline failure and incident handling. Tenants never receive the
platform-security stream merely because they can view their own audit trail.

Application audit covers:

- authentication/recovery and membership/invitation/role/scope changes;
- sensitive record views, evidence access and object-download grants;
- create/update/archive and effective-dated fleet/driver/assignment changes,
  including D-053 management episodes, ownership/custody, availability, disposal,
  closure-watch and non-cascading archive impacts;
- import validation/approval/commit/activation and row lineage;
- verification requests/results, source observations and normalization outcomes;
- compliance evaluation, policy publication and exception/acknowledgement flows;
- case/task and D-054 approval policy/request/proposal/decision/delegation/
  invalidation/execution transitions, including prohibited attempts and safe
  proposal/policy hashes but no unnecessary restricted values;
- exports and normal/emergency support sessions;
- plan, entitlement and billing plus D-055 configuration definition/version/
  activation/rollout/rollback/removal, tenant setting and emergency-control changes
  with safe scope/generation/reason and D-054 decision references.
- global security lock/disable, email-change initiation/confirmation/commit,
  authenticator binding/revocation, recovery, session revocation, invitation and
  membership episode changes, duplicate-membership transfer and account deletion/
  erasure operations, including partial-effect reconciliation and actor tombstoning.
- legal publication/review/effective/supersession, presentation and explicit
  individual/organization acceptance; exact authority/proposal/version rejections;
  contract-evidence review; reacceptance/non-acceptance restriction; notice/consent/
  withdrawal and legal-retention lifecycle events, with hashes and safe identifiers
  rather than unnecessary legal text or personal data in the audit payload.
- legal-hold request/authority/basis/scope/approval/activation/review/release,
  exact binding and reconciliation outcomes, preservation/custody transfers and
  evidence collection/export/download/disposition; protected matter details remain
  in the narrow legal/security store while tenant audit receives only safe status.
- privacy intake, identity/representative/nomination verification, matter split/
  routing, fiduciary decision, processor/store task, correction/erasure/withdrawal,
  grievance communication/escalation, response generation/delivery/access and SLA
  outcome; audit stores safe classes/reasons/hashes rather than response contents.
- support intake/binding, visibility/participant change, triage/priority, assignment,
  message/attachment lifecycle, specialist link/transfer, clock/pause/escalation,
  resolution/closure/reopen and requested versus approved support-access state;
  never place message/attachment content in the audit payload.
- product-event/metric/purpose definition publication, customer-success permission,
  aggregate/de-identification review and experiment/cohort approval/start/stop/
  retirement; ordinary product-measurement events are not duplicated into audit.
- AI-use/dataset/model/schema/cell evaluation and release approval, extraction
  intent/result/rerun, reviewer confirmation/correction/rejection, drift/cell
  disable/rollback and corpus/candidate deletion; audit safe versions/outcomes and
  never raw images, extracted text, field values or model-training examples.
- supplier/service admission, role/criticality/evidence approval, contract renewal,
  subprocessor/location/purpose/API/retention material change, credential and
  exceptional-access lifecycle, incident/escalation, review, exit exercise,
  transfer stop, revocation, reconciliation and deletion/return receipt. Keep
  protected contract/security details outside tenant audit while retaining safe
  customer-visible processor-list and service-change evidence.
- residency-profile/commitment publication, flow/recipient approval, foreign-access
  grant/session/closure, destination or region change, government-request handling,
  quarterly reconciliation, transfer incident and deletion/return outcome; expose
  only contract-safe location evidence to the tenant.
- abuse-rule publication, minimized signal/decision, throttle/step-up/hold/
  restriction, case/review/appeal, suspension/termination authority, expiry/reversal
  and downstream reconciliation. Tenant audit receives its safe action/reason while
  thresholds, network evidence and cross-tenant/platform-security sources remain in
  the separately authorized security/abuse store.
- rights/source-licence/permitted-use policy publication, customer authority and
  tenant-output grant, display/export/redistribution/publication/aggregate/training
  decision, attribution, feedback acceptance, rights expiry/tightening and pending-
  use/exit reconciliation. Store safe class/version/outcome—not provider contract,
  customer content or restricted evidence—in the general audit payload.
- claim-term/evidence/responsibility/disclosure publication, UI/report/marketing/
  proposal/testimonial use, reviewer statement, claim expiry/withdrawal, incident,
  affected-output identification, correction/restatement/notification and copy
  reconciliation; retain wording/object hashes and safe versions without duplicating
  customer evidence or privileged legal advice into general audit.

Every event uses a UUID and versioned schema and records organization/control-plane
context as applicable, server `occurred_at` and `recorded_at` UTC times, actor type/
UUID, effective user and support session, authentication method/assurance/step-up
age, action/outcome/safe reason, resource type/UUID, permission decision/scope,
correlation/request/command/job/import/provider identifiers, approved redacted
field delta, influencing policy/template versions and minimized source metadata.
Client time, when useful, is a separate untrusted field.

Never store passwords, TOTP/passkey/session/reset/API secrets, raw request/response
bodies, raw ULIP/document content or unnecessary identity values in either stream.
Bound and normalize strings against log injection. Full IP/device data belongs
only in the protected security stream when justified; tenant views receive masked
or omitted values.

### 18.1 Transaction and access semantics

- A business mutation, its audit event and outbox event commit in the same
  PostgreSQL transaction. The application writes through a constrained function/
  role with insert only; it cannot update/delete audit rows.
- A correction is a new linked event. An existing event is never edited.
- Privileged/sensitive reads durably record the access before returning data or
  issuing an object grant. If mandatory audit persistence fails, the mutation or
  disclosure fails closed.
- Ordinary low-risk list reads are not individually business-audited; bounded
  application/access/security telemetry covers them without creating unusable
  volume.
- Object-grant issuance is an application event; independently collected object-
  storage access/audit events evidence actual evidence/archive object operations.
- A monotonic sequence within each organization/stream makes gaps and duplicates
  detectable. Transaction retries and idempotency never create a second semantic
  event for the same completed command.

### 18.2 Tamper-evident archive

PostgreSQL is the searchable operational copy, not the final integrity boundary.
An outbox/reconciliation exporter sends canonical JSON segments to an independently
administered archive on the recovery VPS at least every five minutes. Each manifest
records stream/organization, sequence range, count, schema versions, object
checksums, previous-manifest digest, export time and a SHA-256 digest.

A signer operating only on the independently administered recovery VPS signs each
manifest digest with a dedicated versioned libsodium Ed25519 detached-signature key.
The private signing key is available only to that narrowly scoped signer and its
recovery procedure, never to production application identities or the active-host
secret store.
Production application identities cannot alter archived objects or invoke the
private signing operation. Manifests chain to the prior digest and record key ID/
algorithm so an offline verifier can detect event insertion, deletion, replacement
or reordering across key rotation. Describe this as tamper-evident integrity, not
blockchain, qualified legal signature or absolute non-repudiation.

Retain the archive in recovery snapshots and offline rotation. Alert on database
high-water versus recovery checkpoint, age over five minutes, sequence gaps,
checksum/signature failure, replication lag or access-policy change. Run daily
automated integrity verification and quarterly independent restore/verification.

### 18.3 Infrastructure and customer evidence

Collect security events independently from host authentication and `auditd`,
firewall/WireGuard, D-034 Traefik/Fastify and optional CrowdSec, Docker/Dokploy,
PostgreSQL, object storage, the selected secrets-provider path, CI/deployment and
support/recovery operations. Agents send redacted events to the recovery VPS over
mutually authenticated channels; production application identities cannot delete
or rewrite the destination. Sign
and chain frequent checkpoints, monitor source high-water marks and alarm on agent,
destination, retention or access-policy changes.

Covered platform-security logs stay within the primary/recovery Indian sites for
at least the rolling 180-day CERT-In period under protected append-only application
and operating-system permissions. Do not claim governance lock or WORM. Any
emergency retention/access override needs two security approvers, an incident/legal
reference and an independently delivered alert.
Tenant business-audit retention remains category/contract-specific; legal hold may
extend selected material, and erasure removes avoidable personal values while
retaining a minimized lawful tombstone/security record.

D-050 audit events for correction record operation/reason class, affected record/
field categories, approvals, versions, reconciliation targets and safe outcome,
not restricted before/after values. A correction cannot edit its earlier audit
event; where privacy erasure applies, remove identifying payloads under D-020 while
retaining only the lawful non-identifying sequence/deletion proof.

Authorized customer exports are asynchronous, field/scope filtered and contain
the permitted event data, schema/key metadata, sequence ranges, segment hashes,
signed manifests and verification instructions/results. Export creation and
download are audited, and the temporary export never includes platform-only
security data.

Implementation references:

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Linux Audit documentation](https://github.com/linux-audit/audit-documentation)
- [OpenTelemetry security guidance](https://opentelemetry.io/docs/security/)

## 19. Data retention and deletion

Retention is an application-owned control plane, not a collection of table-specific
cron jobs or storage lifecycle defaults. Every policy version records data class,
purpose and basis, fiduciary/processor role, subject and organization lifecycle,
legal minimum/maximum, provider maximum, contractual profile, effective dates,
author/reviewers and applicable stores/processors. Retention must be approved
against law, customer contracts and the ULIP agreement. Initial categories:

- account and billing records;
- active/inactive fleet master data;
- organization-local driver profiles, effective-dated engagements, PII and
  employment-related evidence;
- credentials, credential versions/lineage, subject links and verification results;
- encrypted evidence artifacts and processing history;
- normalized authoritative observations;
- temporarily retained encrypted raw provider responses;
- audit/security logs;
- import/export artifacts;
- backups and legal holds.

Tenants choose only centrally approved profiles and cannot invent free-form periods.
Where several valid rules apply, retain only for the shortest period that satisfies
every mandatory minimum without exceeding a provider/legal maximum. A conflict
that cannot satisfy both constraints fails closed: stop affected collection and
polling, restrict use and open a privacy/compliance case rather than guessing.
Purpose cessation, withdrawal, offboarding or a valid erasure decision immediately
cancels future collection/jobs, removes export/download authority, invalidates
caches/projections and moves affected data to restricted use while retention is
evaluated. Retention authority is not collection authority.

The control-plane lifecycle is:

```text
active -> restricted -> retention_due -> held | deletion_queued
       -> erasing -> verification_pending -> erased | failed
```

Once deletion is authorized, cancel future processing immediately and complete
erasure from live databases, every original/derivative immutable generation in the
primary and recovery stores, temporary exports, caches, search/analytics projections and
subprocessors within 72 hours. Failed targets retry idempotently and alert before
their expected deadline has been missed for 24 hours. Each target records scope,
policy version, attempts, verified result and processor receipt. Preserve only
separately authorized, minimized billing, regulatory, tenant-audit or security
records. Pseudonymized data remains personal data unless irreversible, tested
anonymization makes re-identification no longer reasonably possible.

The database retention engine alone authorizes evidence deletion; lifecycle rules
may directly remove only abandoned quarantine, expired temporary artifacts and
already-authorized generations. Object deletion enumerates and permanently removes
every application generation and verifies absence from Garage, the D-036 recovery-
VPS datasets/snapshots and applicable offline media; a database tombstone
alone is not erasure.
A minimal non-PII deletion tombstone survives outside restorable tenant state for
at least the longest backup horizon plus its evidence period.

Tenant-bearing PostgreSQL continuous backups and their independent off-site
recovery points have a maximum 35-day lifecycle; do not create unbounded monthly or
annual full-tenant snapshots. The same maximum covers recovery-VPS ZFS snapshots and
removable media containing tenant data. Immutable backups age out and are not
edited in place. Every deletion run records `live_erased_at` and
`backup_last_recoverable_at`.
Any database or object restore is quarantined: before API or workers receive
traffic, replay every applicable tombstone newer than the recovery point, verify
all stores, then record an approved restore-replay run. D-020 does not claim
per-tenant cryptographic erasure because D-014 intentionally does not assign a
dedicated encryption key to each tenant.

### 19.1 Legal holds and digital-evidence preservation

D-058 separates normal retention, legal hold, urgent incident preservation and
evidence collection/export. A hold is a deletion-restriction overlay, not a new
processing purpose, access grant, operational freeze, authenticity conclusion or
retention policy. It does not reactivate a user, organization, asset, driver,
integration or ULIP job; grant discovery/read/export access; prevent a legitimate
D-050 correction; or prove admissibility, WORM storage or compliance.

In MVP, an authorized tenant legal/owner function may submit a preservation request
but cannot activate, widen, extend or release a hold. Thaarei legal/privacy validates
requester authority, DPA instruction or independent Thaarei legal basis, necessity,
proportionality, scope and disclosure constraints. Ordinary activation, extension
and release use D-054 Tier 3 with distinct legal/privacy and security/operations
functions. Support principals and infrastructure administrators have no hold
authority merely from technical access. Customer-instructed and Thaarei regulatory,
security or dispute holds remain separate and cannot cross organizations without
independently documented authority.

Use this lifecycle:

```text
draft -> authority_review -> approved -> active -> release_pending -> released
urgent_provisional -> ratified/active | release_pending -> released
```

An active hold has mandatory periodic review but no automatic release on a missed
review. A narrowly authorized legal/security duty officer may create an exact-scope
`urgent_provisional` preservation for no more than 72 hours when evidence is at
immediate risk; independent reviewers are notified immediately and normal approval
is due within 24 hours. An overdue review is a critical governance incident and
cannot silently expand the scope, grant access or cause automatic deletion.

Every hold records immutable UUIDv7, matter/incident reference, requesting
organization and verified requester, processor/fiduciary role and legal basis,
issuer/approvers, typed organization/resource/data-class/subject UUID/time scope,
explicit exclusions, whether exact future matches are included, activation/review/
expected-release times, confidentiality/disclosure constraints, permitted custodians,
suspended D-020 policy versions and immutable audit/approval references. Free-text
keywords, uploaded queries, arbitrary predicates and customer SQL cannot define
scope. A routine retention extension cannot masquerade as a legal hold.

Activation resolves the approved selector against authoritative state and binds
the hold to exact database resource/version UUIDs and object-generation IDs. Record
source/content hashes and create an independently encrypted preservation copy and
signed manifest for material evidence. A reconciler verifies all declared existing
and, only where authorized, prospective matches across PostgreSQL, Garage, D-019
audit archives, temporary exports and named processors. Missing/failed bindings are
critical findings. Immediately before erasure, the deletion engine rechecks current
authoritative bindings; if that control is unavailable or ambiguous it pauses only
potentially affected deletion and escalates rather than blocking unrelated service.

A held row must not retain an entire mixed monthly partition containing unrelated
expired tenant/personal data. Before an otherwise eligible partition is removed,
extract exact held rows into a dedicated encrypted preservation set, preserve their
logical IDs/source partition/schema/versions/hashes/custody, verify the independent
copy and rebind the hold. Only then may ordinary non-held rows be erased or the
partition dropped. The operation is D-022 idempotent and D-019 audited; it never
rewrites the logical evidence or hides its original location.

Ordinary PostgreSQL, Garage and D-036 backup/recovery media retain their normal
maximum 35-day tenant-data lifecycle. Do not freeze whole backups, retain provider
VM snapshots indefinitely or make backup search the legal-hold system. Exact held
data lives in the authoritative/preservation stores. A recovery environment must
replay current holds, released-hold state, deletion tombstones, consent withdrawals
and offboarding before traffic, deletion or jobs resume.

Where an erasure request intersects a hold, erase every non-held item and retain
only the counsel-approved minimum. Record a deferred deletion obligation, reasoned
basis and next review; communicate the limited result where legally permitted
without disclosing protected proceedings. The DPDP Act permits retention when
necessary for the specified purpose or compliance with applicable law, so a generic
commercial preference is insufficient. See the official
[DPDP Act correction/erasure rule](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf).
Correction appends a new state while preserving the held original; known-wrong
original data must not remain the operational truth merely because it is evidence.

Each preservation set records original objects/rows, source system and logical IDs,
collector/custodian and authority, collection/transfer UTC instants, original and
collected SHA-256 hashes, schema/application/policy versions, every custody transfer,
tools and transformations, encryption/key IDs, verification, signed D-019 manifest
and final disposition. Preserve originals separately from rendered, normalized or
redacted derivatives, and store hashes/manifests under an independently controlled
identity. This follows NIST's [digital-evidence preservation guidance](https://www.nist.gov/itl/ssd/software-quality-group/computer-forensics-tool-testing-program-cftt/digital-evidence)
on source, custody, hashes and independently protected integrity evidence.

A hold itself never authorizes evidence export. Collection/disclosure is a separate
D-054 operation binding exact matter, scope, recipient, purpose/basis, field/tenant
authorization, encrypted short-lived delivery, recipient verification, manifest,
download audit and disposition instructions. The system may generate a factual
custodian report from recorded system facts to assist the applicable
[Bharatiya Sakshya Adhiniyam sections 61-63](https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf)
process, including hashes, but never automatically issues or signs a legal
certificate for a human custodian or promises admissibility. Electronic retention
also preserves the accessibility, accurate representation and origin/destination/
time attributes described by [IT Act section 7](https://www.indiacode.nic.in/bitstream/123456789/13116/1/it_act_2000_updated.pdf).

Release stops prospective matching only after exact-scope impact preview, current
authority and Tier 3 approval. It preserves the immutable hold/custody history,
recalculates the normal retention policy for every binding and queues newly eligible
deletion after a counsel-approved safety interval. Release is not synchronous
deletion. Complete only after PostgreSQL, Garage, preservation copies, archive/
processor obligations and D-020 deletion receipts reconcile; unresolved items stay
visible. Customer self-service hold administration, arbitrary discovery queries,
review/annotation suites and external e-discovery integrations are outside MVP.

Ending a driver engagement or offboarding an asset immediately stops scheduled
refresh and restricts unnecessary PII/use. Licence facts, decisions, notice/consent
proof and evidence then follow their own purpose/legal profiles; there is no generic
indefinite or assumed seven-year driver-data period. Contractual tenant termination
creates a 30-day secure read-only export window with no mutations or new provider
processing; an approved customer request may shorten it where lawful. At expiry,
verified tenant-domain deletion starts while separately authorized billing,
regulatory, audit and security records follow their own policies. Payment failure
alone never deletes data, and post-deletion return provisions a new organization
rather than restoring the old one.

D-053 `closure_watch` is the only exception to ordinary asset-monitoring cessation:
it is a new, minimized, expiring purpose for exact transfer/scrapping/RC-cancellation
fields and does not revive operational access. Offboarded or archived is not erased;
it changes permitted processing and starts category-specific retention evaluation.
Expiry/revocation of closure watch cancels its jobs and re-runs D-020 immediately.

Initial operational periods are:

| Category | Initial rule |
| --- | --- |
| Customer-generated temporary export | 24 hours |
| Completed, failed or cancelled import source file | 7 days after terminal state |
| Abandoned import batch/source | 30 days after last activity |
| Ordinary closed support case | 12 months after closure; shorter erasure where purpose ends and no separate obligation applies |
| Unpromoted support attachment | 30 days after case closure; promotion creates a typed domain-evidence link and that domain's policy applies |
| Tenant-linked raw product-measurement event | 90 days |
| Organization daily product-measurement rollup | 13 months while purpose/tenant remains active |
| Risk-reviewed non-identifying cross-organization product aggregate | Up to 24 months; delete/recompute if disclosure risk changes |
| OCR plaintext working image/file after later activation | Delete immediately after job; 24-hour absolute recovery ceiling |
| Rejected or unpromoted OCR candidate output | 30 days after review; confirmed provenance follows linked credential/evidence policy |
| SARATHI raw response | 30 days; active-case extension to at most 90 days only where ULIP permits |
| Tenant termination export window | 30 days unless lawfully shortened |
| Tenant-bearing database/recovery-point horizon | Maximum 35 days |
| Covered ICT/security logs | At least 180 days in India now; applicable DPDP classes move to at least one year before May 2027 |

All other billing/tax, credential, evidence, normalized observation and tenant-audit
periods remain category-specific delivery gates pending counsel/contract approval.
The DPDP Rules' three-year inactivity and 48-hour warning mechanism applies only if
Thaarei or a customer actually falls within a class and purpose in the Third
Schedule; do not apply it generically to this fleet SaaS. Rights/grievance cases
route to the responsible Data Fiduciary, with Thaarei providing processor evidence
and erasure execution under the DPA where the customer is the fiduciary.

Implementation references:

- [DPDP Act 2023, sections 8 and 12](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf)
- [DPDP Rules 2025, rules 6, 8 and 14 and Third Schedule](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
- [PostgreSQL continuous archiving and point-in-time recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)

## 20. Reliability and observability

### 20.1 Service objectives

Reliability is measured at user-visible journey boundaries, not inferred from container,
task, process or dependency uptime. Use versioned SLO definitions and a rolling
30-day window:

| Indicator | Launch objective and measurement boundary |
| --- | --- |
| Core authenticated read/write availability | 99.5% of valid end-to-end requests; approximately 3 hours 36 minutes of budget in 30 days |
| Ordinary API reads | p95 under 400 ms at the platform edge |
| Ordinary API writes | p95 under 800 ms at the platform edge |
| Asynchronous job acknowledgement | 99% under two seconds |
| High-priority verification queue start | 95% within 15 minutes under normal contracted capacity |
| UI experience | Core Web Vitals `good` at p75 for supported conditions: LCP ≤2.5 seconds, INP ≤200 milliseconds and CLS ≤0.1 |
| Disaster recovery | RPO one hour; RTO four hours, demonstrated by exercises |

Planned maintenance, deployments, capacity exhaustion and failures in
Thaarei-controlled dependencies consume availability/error budget. Malformed or
unauthorized requests, incorrect credentials and correctly enforced contractual
tenant quotas do not; a platform-generated 429 caused by inadequate capacity does.
An internal SLO is not a customer SLA. Do not contract a stronger availability
promise until at least three consecutive production months meet the objective and
the required on-call, support-credit and exclusion model has been approved.

Tenant isolation, authorization/RLS, compliance-decision correctness, mandatory
audit completeness, committed-data integrity, billing-capacity correctness,
provider-schema publication safety and deletion non-resurrection are invariants,
not budgetable errors. A violation opens SEV-0 or SEV-1 response even if aggregate
availability remains above target.

The launch topology is one active application/data host, not an automatic-HA
topology. The 99.5% objective includes active-host outages and planned maintenance;
recovery is operator-driven from the independent VPS. Customer and contractual
language must not imply automatic failover, zero downtime or three-zone object
availability.

Measure ULIP separately by dataset and environment: Thaarei queue delay, provider
connection/response availability, throttling/quota exhaustion, normalization
success, completion and decision freshness. Provider elapsed time is excluded from
ordinary synchronous API latency, but missed verification/freshness objectives
remain visible and are never converted into a false compliant result.

### 20.2 Error budgets and alerting

Use good-event/valid-event SLIs plus synthetic journey probes where launch traffic
is too low for statistically useful request ratios. Page only on actionable threats:

- `14.4x` burn over both one hour and five minutes;
- `6x` burn over both six hours and 30 minutes;
- an operational ticket for sustained three-day burn;
- immediate incident routing for a correctness/security invariant regardless of burn.

When the rolling error budget is exhausted, pause nonessential product, dependency
and schema changes until the budget is positive and corrective actions are owned.
Security patches, incident containment and reliability remediation continue. Every
SEV-0/SEV-1 and any single incident consuming more than 20% of the 30-day budget
requires a blameless review with owners, due dates and verified closure evidence.

### 20.3 Dependency degradation and bounded work

| Failed/degraded dependency | Required behavior |
| --- | --- |
| ULIP/dataset | Serve clearly aged last observations, bound queues/open circuits, preserve freshness and return `not_determined` after decision freshness expires |
| D-040 Valkey cache | Fall back to bounded authorized PostgreSQL reads; never reconstruct authoritative state from cache |
| D-040 Valkey coordination | Pause outbound ULIP, invalidate token generation and run the ledger/empty-bucket/single-flight restart gate before conservative resume |
| ZeptoMail transactional email | Preserve in-app findings; continue accepting deduplicated intents within per-class age/depth limits; reserve security/auth capacity; stop sending work whose token/purpose expires; reconcile ambiguous accepted attempts before retry; show delivery degradation in operations views. Do not auto-fail over to Netcore because an uncertain first send could duplicate an action email |
| Razorpay | Continue from Thaarei's authoritative entitlement ledger and reconcile signed events later |
| Object storage | Keep permitted metadata usable; disable affected upload/download operations without exposing alternate paths |
| File scanner/parser/signature pipeline | Keep new objects quarantined and existing accepted evidence usable; never bypass scanning or infer clean; bound admission and page on signature age, failure or capacity exhaustion |
| Recovery-VPS/pgBackRest repository | Continue from the bounded local repository while preserving WAL locally; page before the one-hour RPO or `pg_wal` capacity is threatened, prohibit false backup-success state and restore the independent receiver without weakening snapshot/deletion authority |
| Mandatory audit persistence | Fail closed for the D-019 privileged mutation or sensitive disclosure |
| Audit archive/signing | Preserve the sequenced outbox, raise an integrity incident and use the approved D-019 recovery runbook |
| Production/recovery envelope wrapping | Reject only new/changed restricted plaintext with retryable `503`; continue safe non-sensitive functions and page on recovery-key/wrapper failure |
| PostgreSQL | Fail closed; never acknowledge speculative writes in temporary process/cache storage |
| Search projection | Use an explicitly bounded authorized PostgreSQL fallback or disable advanced search clearly |
| Capacity overload | Shed reports, bulk work and low-priority refresh before interactive and safety-critical operations |

Every queue has a per-class depth, maximum age, deadline and admission rule. Stale
work is cancelled or re-evaluated instead of executed after its purpose expires.
Retries consume an explicit budget; backpressure and load shedding occur before
resource exhaustion.

### 20.4 Incident operating model

Before production pilot, operate a tested 24x7 primary/secondary on-call rotation
for SEV-0/SEV-1 using the active-host and recovery-VPS alert paths. All duty devices
subscribe to both. Page the primary and secondary immediately for SEV-0; for SEV-1
page the primary immediately and the secondary if acknowledgement is absent at ten
minutes. Each incident records an incident commander, technical lead,
communications owner and recorder. Maintain service/dependency owners, provider
escalation contacts, current runbooks and an internal status channel. Publish the
sanitized Gatus customer status page from the independent recovery VPS by GA.

| Severity | Examples | Internal acknowledgement target |
| --- | --- | --- |
| SEV-0 | Cross-tenant disclosure, active compromise, material corruption or unsafe compliance decisions | 5 minutes, immediate containment authority |
| SEV-1 | Broad outage, database failure, rapid SLO burn or critical audit/integrity failure | 10 minutes |
| SEV-2 | Limited degradation, delayed noncritical processing or isolated provider issue | 30 minutes during supported hours |
| SEV-3 | Minor defect or operational improvement | Normal prioritized backlog |

These are internal response targets, not contractual restoration commitments.
Security incidents also follow D-019, CERT-In and privacy-assessment/reporting
runbooks. Incident handling covers preparation, detection, response, recovery and
lessons learned; exercises include ULIP failure, database/active-host recovery,
tenant-data exposure, bad policy publication, audit failure, deletion replay and
site-loss DR.

### 20.5 Emergency controls

Provide permission-controlled, reason-bound, audited and automatically expiring
controls to pause one/all ULIP datasets, imports, activations, notification channels
or worker classes; make one organization/all tenants read-only; disable object
downloads; roll back a policy; and trigger deployment rollback. Normal activation
uses step-up and maker/checker approval. A SEV-0 incident commander may activate a
pre-approved containment control immediately, with retrospective independent
review. Controls must not bypass RLS, D-019 audit, D-020 retention or provider
limits, and must expose current state clearly to operators.

### 20.6 Telemetry

Primary telemetry runs in the independently deployed
`platform-observability` project on the active host. Host or observability loss
therefore may remove both service and primary diagnostics; D-033 addresses that
accepted single-host risk with independent Gatus/ntfy monitoring, status and
dead-man checks on the recovery VPS.

- Run pinned OpenTelemetry Collector agents/gateway with explicit attribute
  allowlists, redaction, memory limits and bounded disk queues. Telemetry loss is
  measured but never blocks or becomes authoritative for a domain mutation.
- Send structured redacted operational logs to bounded monolithic Loki. Labels use
  low-cardinality service/environment/workload fields and never organization,
  driver, vehicle, request or trace identifiers. Begin with 30-day retention and a
  measured ingestion budget; scale or replace only after capacity evidence.
- Use Prometheus for RED, queue age/depth, provider, scanner, storage, notification,
  billing, audit, deletion, backup and saturation metrics. Retain enough data to
  reproduce the applicable SLO window.
- Grafana provides private dashboards and alert evaluation from reviewed provisioned
  rules. Alerts include only safe service/impact/incident/runbook data.
- Propagate W3C trace context without tenant/restricted attributes. Actionable
  exceptions may be derived from structured logs initially; self-hosted GlitchTip
  is optional after a measured need justifies its database/Valkey and retention cost.
  Tempo and Kafka remain deferred.
- Never collect request bodies, query strings, cookies, authorization headers,
  document/raw ULIP/email content or restricted identifiers. Browser errors use a
  same-origin allowlisted endpoint; session replay, automatic body capture,
  attachments and public source maps are prohibited.
- Run authenticated Gatus and ntfy on the recovery VPS. Gatus checks public
  DNS/TLS/HTTP, safe synthetic journeys, the primary telemetry heartbeat and backup
  receipts, and sends directly through the independent paging path. It publishes
  only a sanitized status view.
- Grafana monitors recovery heartbeat while recovery Gatus monitors the active host.
  Simultaneous loss is accepted only under the 99.5% single-active-host profile; a
  third watchdog or contracted pager is required before a stronger SLA.
- Synthetic probes use isolated test tenants/identifiers, never customer mutations
  or unnecessary production ULIP quota.

Local telemetry is optional. Staging core retains basic application logs/metrics;
staging release activates the complete collectors, dashboards, alert rules, browser
error path and recovery-heartbeat tests. Their absence never blocks unrelated
staging development, but failed release-profile telemetry evidence blocks the
applicable production promotion.

Operational telemetry is not D-019 audit evidence. Tenant audit and protected
platform-security segments continue through their independently sequenced, signed
recovery-VPS path even when Loki also contains a minimized diagnostic event.
### 20.7 Product measurement and experimentation

D-064 keeps product learning useful without converting a fleet-compliance product
into a behaviour-surveillance system. Commercial usage under D-012/D-061, tenant/
security audit under D-019, operational telemetry under D-033, product measurement
under this section and D-055 rollout/experiment evidence are separate. No event or
metric changes entitlement, proves an actor acted, proves compliance, authorizes a
command or becomes the only record of an experiment exposure.

MVP uses application-owned, first-party measurement derived predominantly from
successfully committed domain state/outbox events. Do not install Google Analytics,
Mixpanel, Segment, Hotjar, PostHog, Matomo or an equivalent analytics/tag-manager
SDK or platform, whether hosted or self-hosted. Prohibit session replay, heatmaps,
advertising pixels, cross-site cookies, browser fingerprinting, persistent analytics
identifiers and remote analytics JavaScript. OWASP identifies loss of code control,
arbitrary browser execution and disclosure of DOM/browsing information as core
[third-party JavaScript risks](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html);
D-062 applies before any later measurement supplier or software store is proposed.

Measure a bounded product question from authoritative milestones: customer
application/organization activation; time to first fleet/location, valid import
preview/commit, managed asset/driver/document and completed verification; import
validation/correction; meaningful weekly organization activity; adoption and safe
outcome of saved views, bulk actions, reports, verification, findings and support;
and alert/case acknowledgement or completion. Prefer these outcome transitions to
page views and clicks. Missing activity is not proof of customer, driver or fleet
quality and no universal customer-health, driver-quality, fleet-risk or compliance
score is permitted.

Every event definition records stable machine name/schema version, exact business
question and purpose, Thaarei/customer role and legal basis, source/trigger, metric
owner/reviewer, allowed producer/consumer, fields and cardinality, retention,
aggregation/deletion rules and prohibited fields. An event may contain UUIDv7,
server `occurred_at`, organization ID while tenant-linked, coarse actor type/role
template, feature/release, safe outcome/reason code and approved cohort/variant.
It contains no user UUID/email/IP/persistent browser ID; driver, vehicle, licence,
FASTag, document, object, provider or case identifier; URL/query/referrer/DOM/search
term/form value/free text/filename; precise location/device fingerprint; or secret,
authentication/session/recovery value. Do not infer or join those attributes later.

Only when the server cannot answer an approved usability question may repository-
owned browser code POST a versioned allowlisted event through the same-origin API.
Use a random memory-only journey ID with a maximum 24-hour server expiry, no cookie/
local storage, and coarse supported device/accessibility state only where necessary.
Reject unknown properties, high cardinality, free text, stale purposes and events
from a release that lacks the manifest-bound definition. Public marketing/signup
measurement uses aggregate server outcomes and security logs, not visitor tracking.

The event/metric registry and monthly UTC raw partitions live in a separate
PostgreSQL schema. Tenant-linked raw events retain `organization_id`, use RLS and
expire after 90 days. Organization daily aggregates retain 13 months and remain
tenant-linked/deletable. A separately generated cross-organization aggregate may
remain for at most 24 months only after privacy review concludes it cannot
reasonably single out a person, subject or organization; suppress every cell with
fewer than ten organizations and sparse/correlated combinations, but never claim
that threshold alone proves anonymization. NIST SP 800-188 requires a defined
de-identification goal, disclosure model and re-identification risk assessment;
simple identifier removal is insufficient. See the official
[NIST de-identification guidance](https://csrc.nist.gov/pubs/sp/800/188/final).
D-020 deletes raw and organization aggregates on purpose/tenant closure and deletes
or recomputes any aggregate that fails the de-identification decision.

Tenant users may see only their authorized organization metrics. Thaarei product or
customer-success staff use curated field-limited views, not runtime database access,
raw events or subject drill-down. A single-organization customer-success view needs
a recorded contractual/product-improvement purpose, named permission and audit; it
contains no user/driver/asset identity. Cross-organization dashboards use only the
approved suppressed aggregates. Export/re-identification attempts are denied and
monitored.

Each metric definition records question/decision, numerator, denominator,
qualifying population, exclusions, source event/domain versions, segmentation,
minimum sample, freshness/completeness, known bias/limitations, owner/reviewer and
supersession/retirement. Dashboards expose version, period, population and missing
data so a definition change cannot silently rewrite a trend. Metric calculation is
reproducible and reconciliation proves event-to-rollup completeness, but product
measurement remains non-authoritative.

Before collecting any personal product-use data, record the lawful purpose, role,
basis, notice, access, retention and deletion approved by Indian privacy counsel;
if no valid basis exists, do not collect it. The DPDP Act requires personal-data
processing to have a lawful purpose and consent or an applicable legitimate use;
“product improvement” is not assumed to be an exemption. Individual behaviour
profiles and optional personal analytics are outside MVP. Any later optional
analytics requires its own purpose decision, granular opt-in where applicable and
effective withdrawal. Never reuse ULIP, licence, driver, document, support-message
or compliance evidence for unrelated analytics, advertising or model training.
Use the official [DPDP Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023-1.pdf)
and [NIST Privacy Framework](https://www.nist.gov/privacy-framework) for the
production purpose/data-lifecycle assessment.

Run no classical online A/B experiment during the roughly 100-organization pilot:
organization-level sample is too small for many reliable comparisons, while user-
level randomization would give coworkers inconsistent operational workflows. Use
design-partner interviews, accessible usability tests and opt-in D-055 staged
organization cohorts with a predeclared question, success/guardrail measures and
qualitative evidence. A rollout flag is not automatically an experiment and a
correlation is not presented as causal evidence.

A future live experiment requires a separately approved definition with hypothesis,
owner, variants, eligible/excluded population, organization-level deterministic
opaque assignment, sample/power assumptions, start/stop/maximum duration, primary
metric, safety/accessibility/performance guardrails, privacy purpose, exposure
contract, decision rule, rollback and removal. It may vary only low-risk
presentation, navigation, help copy or workflow ergonomics. Never experiment on
identity/recovery, membership/authorization/tenancy, compliance/policy/facts/
evidence, expiry/mandatory alerts/safety blocks, legal/consent/privacy rights,
billing/tax/payment/entitlement, support priority/incident response, audit,
retention/deletion, security controls or ULIP normalization/freshness/polling/quota.
Prohibit adaptive bandits, covert personalization, dark patterns and AI-selected
variants. Record the exact assignment/version with the resulting approved exposure,
honor D-055 fail-safe behavior and stop immediately when a guardrail is breached.

## 21. Infrastructure and deployment

### 21.1 Initial topology

Version 2 starts with two infrastructure boundaries, both on unmanaged VPS
infrastructure located in India:

1. **Active production host.** One capacity-qualified Ubuntu 24.04 host runs
   Dokploy/Traefik and the separately deployable `platform-data`,
   `platform-app`, `platform-security` and `platform-observability` Docker
   Compose projects. It is the only active customer-serving host.
2. **Recovery and monitoring VPS.** A smaller, separately administered VPS in a
   different provider account and preferably a different Indian city receives
   encrypted PostgreSQL, exact-object and audit copies. It runs independent
   Gatus/ntfy checks and holds verified recovery definitions, but normally serves
   no customer application traffic.

Use separate provider accounts, named administrators, credentials, WireGuard
identities and encryption material. A compromise of either account must not provide
routine administrative access to the other. The recovery VPS and offline custody
must contain everything required to rebuild the active host without access to its
Dokploy installation or secrets.

The active host uses these independently deployable projects:

| Project | Services and authority |
| --- | --- |
| `platform-data` | PostgreSQL 18 writer, `valkey-coordination`, `valkey-cache`, one Garage node and backup/export agents |
| `platform-app` | Next.js web, Fastify API, critical/provider/bulk Graphile workers and one-off migration commands |
| `platform-security` | Scanner coordinator, local ClamAV updater/socket and disposable no-egress gVisor jobs |
| `platform-observability` | OpenTelemetry Collector, Prometheus, Grafana, bounded Loki and alert forwarding |
| Dokploy host plane | Dokploy, its private dependencies and Traefik public ingress; it is not part of an application release |

Each project has a distinct network, service identities, least-privilege credentials,
resource limits, health contracts and persistent-volume inventory. Only explicitly
declared connections cross projects. Deploying `platform-app` must not recreate,
restart or remount PostgreSQL, Valkey, Garage, Dokploy, monitoring or backup
services. Database migration is a one-off application command protected by the
D-043 advisory lock.

Production starts at approximately 8 vCPU, 32 GB RAM and 500 GB SSD/NVMe; staging
starts at approximately 4 vCPU, 8–16 GB RAM and 160 GB SSD. The recovery VPS starts
at approximately 4 vCPU and 8 GB RAM with storage calculated from the measured
35-day database, object and audit envelope. These are planning estimates, not
qualification evidence: twice-forecast load, scanner backlog, restore tests and at
least 30% forecast-peak CPU, memory, I/O, connection and storage headroom determine
the final sizes.

Maintain a quarterly cost ledger, and review it again before every capacity or
topology expansion, for VPS compute/storage, traffic, registry, email, monitoring,
offline media and DNS/domain costs. The initial target is INR
15,000–40,000 per month, excluding staff, payment/email transaction charges and
exceptional growth storage. A component is not added merely because it is commonly
described as production-grade; its threat, reliability or capacity benefit must
justify its operating and support cost.

Only unmanaged India-hosted VPS/block-storage infrastructure is in the runtime
baseline. AWS, Azure and GCP managed runtimes, managed databases/queues/object
stores, serverless services and managed Kubernetes are prohibited. Cloudflare R2 is
prohibited for application objects, backups, Dokploy backups and recovery artifacts:
its APAC location hint is best effort and its documented jurisdictions do not
include India; see Cloudflare's
[R2 data-location documentation](https://developers.cloudflare.com/r2/reference/data-location/).
Approved external boundaries remain GitHub/GHCR, Cloudflare DNS-only,
ULIP, ZeptoMail and Razorpay under D-062.

This topology supports general availability but makes no automatic host-HA,
three-zone storage, zero-downtime or warm-recovery claim. Before production data,
D-036 must demonstrate the one-hour RPO and four-hour RTO from the recovery VPS.
Publish the maintenance and manual-recovery limitations in the customer-facing
availability description.

Split services onto larger or additional Dokploy remote servers when any of these
mandatory review triggers occurs:

- less than 30% forecast-peak headroom on the active host;
- repeated exhaustion of the 99.5% error budget;
- database, object, scanner or telemetry contention affects interactive journeys;
- a recovery exercise exceeds the four-hour RTO or cannot preserve the one-hour RPO;
- a contract requires automatic host failover or a stronger availability objective; or
- the security review requires a physical host boundary, beginning with the scanner.

Scale vertically first, then separate scanner, data/storage and observability by
Dokploy remote server. Use multi-node Docker Swarm only when measured need requires
replicas across machines. Kubernetes remains outside the Version 2 roadmap unless a
later independently approved architecture decision replaces this one.

All production and Version 2 non-production resources remain separate. No production
customer data, credential, certificate or encryption key enters local, CI, preview
or ordinary staging.
### 21.2 Public edge, DNS and recovery routing

The initial public request path is:

```text
client -> Cloudflare authoritative DNS (DNS-only)
       -> hosting-provider L3/L4 controls and host firewall
       -> Dokploy Traefik (TLS, host/path routing, coarse limits)
       -> Next.js or Fastify
```

Cloudflare remains DNS-only for product records. Do not enable its application
proxy, cache, WAF, Tunnel, Workers, Pages, R2, load balancer or authentication
products. Enable DNSSEC, phishing-resistant administrator MFA and narrowly scoped
account-owned API tokens. Keep the registrar account separate from the operational
DNS account and store reviewed DNS configuration as code.

Dokploy/Traefik is the only public application ingress and certificate termination
point. It strips untrusted forwarding and trace headers, enforces allowed
hosts/methods, request-size/time limits and coarse network controls, and forwards
only to private application services. Fastify independently enforces identity-,
organization-, operation-, cost- and concurrency-aware limits; ingress policy never
substitutes for authorization, validation, idempotency or ULIP quota control.

CrowdSec may run as an optional qualified host/Traefik control after an observation
period demonstrates acceptable latency, false-positive behavior, privacy and
recovery. The initial release does not place OpenResty in front of Traefik and does
not depend on Traefik's experimental plugin system. If an optional CrowdSec path
fails, Fastify and Traefik's approved baseline controls remain authoritative; an
emergency bypass cannot weaken authentication or authorization.

Authenticated HTML/API, report, document, presign and export responses use
`Cache-Control: private, no-store`. Only content-hashed public static assets may be
cached immutably. Edge and application logs never contain request/response bodies,
cookies, authorization values, raw URL queries, document content or restricted
identifiers.

Use a 300-second application-record TTL. Recovery remains monitored and manual:
restore PostgreSQL, objects, keys, ingress configuration and safe worker state;
replay deletion tombstones; validate the release; then make the reviewed DNS change.
Gatus alerts operators but never changes DNS. The public status endpoint uses the
independent recovery VPS and a separately administered DNS path so loss of product
DNS or the active host does not hide incident communication.
### 21.3 Host, administration and runtime baseline

The complete host baseline is mandatory for the active production and recovery
hosts, exercised in the staging release profile, reduced on persistent staging and
not a local-development prerequisite. Use minimal Ubuntu Server 24.04 LTS amd64,
pinned provider images and reviewed Ansible/OpenTofu definitions. Major OS, Docker,
gVisor, ZFS or runtime changes require staging-release compatibility and recovery
evidence.

The production host profile must:

- use named administrator accounts, hardware-backed FIDO2 SSH keys, bounded audited
  sudo and no root/password/challenge login;
- accept administration only through WireGuard, with independently protected
  provider-console recovery and alerts on console use;
- enforce AppArmor, nftables default deny for IPv4/IPv6, approved sysctls, disabled
  unencrypted swap/hibernation/core dumps and explicit role-to-role egress;
- run UTC with monitored chrony synchronization and apply D-045's safe pause when
  clock uncertainty exceeds the approved bound;
- patch supported packages daily and perform controlled, evidenced reboots;
- collect auditd evidence for authentication, sudo, identity, firewall, time,
  systemd and Docker changes; and
- monitor effective firewall behavior after Docker creates its packet-filtering
  rules.

Dokploy and Docker are root-equivalent host authorities. Never expose a Docker TCP
API or mount its socket into application, scanner, CI or telemetry workloads.
Dokploy's own required access does not grant workloads Docker administration.

Every admitted runtime container is digest-pinned, fixed non-root, read-only where
compatible, capability-dropped, `no-new-privileges`, seccomp/AppArmor confined and
limited by CPU, memory, PID, file descriptor, writable path and log budgets. Deny
privileged mode, host namespaces, arbitrary bind mounts, devices, SSH keys and
container-engine sockets. The scanner project may invoke only the approved gVisor
runtime through a narrowly controlled host mechanism; a general Docker
administration capability is prohibited.

Persistent staging uses the same container policies where practical but may omit
WireGuard-only administration, LUKS manual unlock and continuous Falco/audit export.
The release profile validates those production contracts without making them a
daily development dependency. Local development requires only ordinary container
isolation and synthetic credentials.
### 21.4 Public certificates and private service trust

Dokploy/Traefik owns public ACME issuance, renewal and TLS termination for the
application. Use separate certificates and keys for production, staging and the
independent status name; never copy an ingress private key between environments or
hosts. Monitor renewal, unexpected issuance and expiry, and test issuance against
the exact pinned Dokploy/Traefik release.

Same-host service traffic stays on private, non-public Docker networks. Prefer Unix
sockets with filesystem permissions where supported; otherwise use per-service
credentials and protocol-native TLS/authentication. A private network or certificate
authenticates a workload, not a tenant, so database roles, bucket keys, Valkey ACLs
and application authorization remain mandatory.

Every active-host-to-recovery-VPS data, backup, audit, telemetry and administrative
path runs over WireGuard and uses mTLS, SSH forced-command keys or another reviewed
mutually authenticated protocol with independently rotatable credentials. No shared
administrator or application credential spans the two provider accounts.

A self-hosted private CA such as `step-ca` is deferred until services are split
across multiple runtime hosts and short-lived workload certificates materially
improve the resulting trust boundary. Activation requires a new inventory,
bootstrap, root/intermediate custody, renewal, revocation and recovery gate. Local
and staging do not require a private CA; the staging release profile contract-tests
cross-host trust and credential rotation.
### 21.5 Encrypted host volumes and boot recovery

Application envelope encryption, authenticated context, restricted-field policy and
key separation apply in every environment. Only generated non-production keys may
be used outside production, and ciphertext created for one environment must fail
authentication in another.

Every durable production path—PostgreSQL data/WAL/local repository, Garage
data/metadata, Docker/Dokploy state, secrets, scanner state, telemetry and recovery
material—must reside on inventoried encrypted storage and fail closed when its
expected mount is absent or wrong. Use a qualified LUKS2 profile on the active host
and native encrypted ZFS datasets on the recovery VPS. A service must never create
an empty data directory on an unencrypted root filesystem after a mount failure.

Production volume unlock, current header backup, keyslot rotation and recovery use
independent custody and audited procedures. Do not place automatic unlock material
in cloud-init, images, Ansible, Dokploy environment values, command arguments or
logs. Retain a minimal boot/WireGuard/SSH surface before unlock and keep product
services unavailable until all required mounts pass integrity and ownership checks.

Local development uses disposable volumes and does not require host-volume
encryption. Staging uses isolated provider-encrypted or LUKS volumes where available;
absence of a manually unlocked production-style volume does not block ordinary
staging. The staging release profile exercises wrong/missing mounts, key recovery
and restore on disposable volumes.

Host-volume encryption protects detached storage, not a running compromised host.
D-024 application envelopes, PostgreSQL/Garage checksums, least privilege, audit and
verified deletion remain required. Provider snapshots are not the authoritative
backup and, if incident-created, must be inventoried, encrypted, access-restricted
and deleted inside D-020's 35-day ceiling.
### 21.6 Environment isolation and promotion

Environment is an explicit trusted value, never inferred from a hostname or Dokploy
application name. The shared configuration package validates:

```text
APP_ENV = local | ci | preview | staging | production | recovery
DEPLOYMENT_PROFILE = core | full | release | production | recovery
capability state = disabled | emulated | test | live
```

Only these combinations are valid:

| Environment | Profiles | Data/provider boundary |
| --- | --- | --- |
| Local | `core`, `full` | Synthetic fixtures; emulators/Mailpit/Razorpay Test only |
| CI | `core`, `full` | Ephemeral generated data; no live provider network |
| Preview | `core` | Per-preview synthetic data and mock providers |
| Staging | `core`, `release` | Persistent synthetic data; emulators or separately approved test credentials |
| Production | `production` | Purpose-authorized customer data and qualified live providers only |
| Recovery exercise | `recovery` | Quarantined restored data; no external effects until explicitly authorized |

Unknown combinations fail startup. Production rejects any enabled capability whose
resolved state is not `live` and production-qualified, including mock ULIP,
Razorpay Test, test email, generated/default keys, debug/reload, permissive CORS,
insecure cookies, non-production origins, storage namespaces or database identities.
No environment may silently fall back to another environment's resource.

**Local core** runs the application in watch mode with disposable PostgreSQL,
deterministic provider emulators, Mailpit and generated development-only keys.
Valkey, Garage, scanner and telemetry are opt-in Compose profiles. Missing optional
services return a typed `capability_unavailable` result and appear in the protected
capability status; they do not make unrelated routes unready. Tenant isolation,
authorization, audit transactions, compliance logic, encryption formats and
deletion semantics remain enabled.

**Local full** adds both Valkey processes, one disposable Garage node, scanning and
telemetry for adapter and failure work. MinIO may be used only by a separately
invoked S3-protocol compatibility suite, never as the normal storage backend.

**Staging core** is one affordable Dokploy VPS running the application, PostgreSQL,
both Valkey processes, single-node Garage, synthetic organizations, ULIP/Razorpay
emulators, Mailpit or allowlisted test mail, application encryption and basic
telemetry. It automatically receives the immutable CI digest and supports normal
functional work without production key custody, continuous DAST, full scanning,
backup drills or heavy telemetry.

**Staging release** temporarily enables the production scanner, current ClamAV
updates, Garage compatibility/failure tests, qualified ingress rules in observation
mode, full telemetry, authenticated DAST, allowlisted test email, migrations,
schema-forward rollback and backup/restore exercises. It uses only synthetic data
and isolated non-production credentials. It is required for a production release
candidate, not for every development merge.

Ordinary releases require staging smoke, contract and migration checks. Extended
soak is risk-based and required for material database/storage migrations, identity,
authorization, cryptography, upload/scanner, runtime/base-image or recovery changes;
there is no universal 24-hour or seven-day staging delay.

Production and non-production use separate Dokploy projects/instances, networks,
domains, databases, buckets, keys, provider credentials and administrators as the
risk requires. Production data and backups never enter ordinary non-production.
A restored production copy is always a time-bounded, quarantined recovery exercise
and must replay deletion tombstones before any service or worker is enabled.
### 21.7 Production release execution and rollback

D-043 makes a release manifest—not an individual container or mutable tag—the unit
of change. Build the web and server/worker images once from the same reviewed
commit, sign and address them by digest, and bind schema/task/configuration,
dependency, provider-contract, policy/reference, localization and client-
compatibility fingerprints. Production Dokploy pulls only the approved private GHCR
digests and never builds source.

The initial topology uses Docker Compose projects for product workloads. Dokploy's
installation initializes a Swarm manager for its own operation, but Version 2 does
not deploy the application as a multi-node Swarm/Stack or claim Swarm automatic
rollback. Docker Compose and Docker Stack remain distinct Dokploy deployment modes.
Multi-node Swarm is a later measured scaling choice, not a Kubernetes precursor.
This distinction follows Dokploy's
[Compose documentation](https://docs.dokploy.com/docs/core/docker-compose) and
[deployment-options documentation](https://docs.dokploy.com/docs/core/deployment-options).

Only `platform-app` changes during an ordinary product release. The
`platform-data`, `platform-security` and `platform-observability` projects have
independent manifests and maintenance procedures. A coordinated infrastructure
release explicitly names each affected project and never relies on an application
webhook to recreate stateful services.

Production release order is:

1. Verify approval, release manifest, signatures/provenance, SBOM, findings,
   staging evidence, cost/headroom and error-budget policy.
2. Verify pgBackRest/WAL and exact-object recovery receipts, free space, connection
   headroom, current deletion ledger and the prior application digest.
3. Run one migration container under a PostgreSQL advisory lock with bounded lock
   and statement timeouts. Failure changes no routing.
4. Start the candidate application on private candidate routes and require
   service-specific liveness/readiness/version plus authenticated compatibility
   smoke tests.
5. Atomically change Traefik routing to the candidate, drain the prior web/API and
   roll worker classes one at a time.
6. Observe ordinary releases for at least 30 minutes; apply the longer risk-based
   staging/production observation window when the change classification requires it.
7. Stop the prior containers after acceptance while retaining their immutable digest,
   manifest and compatible static assets for rollback.

Health contracts are private: `/livez` proves only process health, `/readyz`
validates environment/schema/local critical dependencies, and `/version` exposes
only safe release identity. External provider loss changes capability/dependency
status rather than killing a healthy API.

Schema change is expand/migrate/contract. Old application code must work with the
expanded schema, large movement is checkpointed, and contraction waits until no
valid rollback/recovery image needs the old shape. Application rollback deploys the
prior digest against the forward-compatible schema; it never runs an automatic down
migration. Suspected data corruption freezes affected writes and invokes D-036
recovery/reconciliation rather than treating image rollback as data recovery.
### 21.8 Delivery pipeline

1. Pull requests run formatting, type, boundary, unit, PostgreSQL/RLS,
   authorization, emulator-contract, secret, dependency/licence and relevant
   migration/security checks. Fast checks remain sufficient for ordinary
   development; path/risk classification adds relevant full suites.
2. CI uses generated synthetic services and receives no production provider,
   registry-promotion or infrastructure credentials.
3. Build each immutable production image once on the declared Linux amd64/glibc
   target, attach an SPDX/CycloneDX SBOM and signed provenance, sign the digest and
   push it privately to GHCR.
4. Automatically deploy the exact digest to staging core and run smoke,
   current/previous-client compatibility, migration and worker checks.
5. For a release candidate, activate staging release and run the applicable scanner,
   Garage, ingress, authenticated DAST, backup/restore, fault and performance suites.
   Ordinary changes have no fixed 24-hour soak; high-risk changes use the approved
   extended window.
6. A person other than the initiating developer approves production after all
   capability-specific gates pass. Promote the staging-tested digest without
   rebuilding it.
7. Execute D-043 migration, private candidate checks, atomic route change, graceful
   drain, worker rollout and schema-forward rollback controls.
8. Rebuild unchanged release inputs at least weekly for security patches, but require
   only risk-appropriate staging evidence; there is no unconditional seven-day delay.
9. Block production promotion for applicable critical/high findings, exhausted error
   budget or failed recovery evidence. These gates do not block local coding or
   deployment of staging core.
10. Keep production Dokploy credentials behind an independently approved protected
    environment; if repository-plan controls cannot enforce that boundary, CI
    publishes artifacts and a separately authorized operator performs promotion.
### 21.9 Configuration and secrets baseline

Every setting has one authority. Product constants/schemas live in reviewed code;
host/network/Compose configuration lives in reviewed deployment definitions;
dynamic non-secret configuration and flags are immutable/versioned in PostgreSQL;
tenant settings are bounded; secrets enter only through the environment's approved
secrets-provider port.

The secrets-provider abstraction resolves as follows:

| Environment | Secret source |
| --- | --- |
| Local/CI/preview | Generated, short-lived, non-production values; local files are untracked |
| Staging | Isolated Dokploy-managed secrets with staging-only service credentials |
| Production | Restricted Dokploy injection with service-specific allowlists plus independently held recovery material |
| Recovery | Separately administered encrypted recovery inventory and offline custody |

Self-hosted Infisical is optional only after the control/secrets plane moves to a
separate host or a contractual/threat-model requirement justifies its dependencies
and recovery cost. No application design may depend directly on an Infisical SDK;
it depends on the secrets-provider port. Production secrets never enter images,
product tables, browser responses, logs, editable tenant settings or committed
`.env` files.

Production startup validates `APP_ENV=production`,
`DEPLOYMENT_PROFILE=production`, origins, secure-cookie/CORS posture, database
identity, storage namespace, encryption recipients, release manifest and every
provider credential class. Mock/sandbox/test credentials, development keys, debug
modes and unqualified live capabilities fail readiness. Staging and local never
fall back to production credentials.

Production and recovery private wrapping material remain distinct. Production
receives only recovery public/encrypt-only material; the recovery private key stays
on the recovery/offline path. Rotation, inventory and restore tests must prove that
both retained wrapper paths remain usable before retiring a key.

D-055's configuration classes and capability intersection remain authoritative:

```text
compatible release ∩ environment/profile ∩ capability qualification
∩ rollout ∩ entitlement ∩ organization permission
∩ actor/scope authorization ∩ legal/privacy/provider authority
∩ absence of a restrictive emergency control
```

A flag may remove capability but never create a missing permission, provider right
or production qualification. Definitions declare type, bounds, safe default,
owner, approval tier, effective/compatibility range, expiry/removal and failure
behavior. Missing risky configuration fails closed; only reviewed non-sensitive
presentation concerns may fail open.

Expose a protected capability-status view showing environment, profile, resolved
state, safe reason and dependency health without secrets. Service-specific readiness
means an unavailable optional adapter disables its routes/jobs while unrelated
capabilities remain usable. PostgreSQL or mandatory audit failure still fails the
affected mutation, scanner failure retains quarantine, Garage failure disables
document transfer, coordination-Valkey uncertainty pauses ULIP, and telemetry loss
never blocks a committed domain transaction.

Maintain an independently encrypted recovery inventory for everything needed to
rebuild the active host and prove quarterly that recovery does not depend on the
primary Dokploy database or secret values.
## 22. Backup and disaster recovery

D-036 makes the independently administered India recovery VPS—not Garage
replication, Dokploy, the active-host local repository, a provider snapshot or an
application filesystem—the authoritative online recovery boundary. It uses a
different provider account and preferably a different Indian city, exposes no
public database/object service and normally serves no customer application traffic.

Use encrypted ZFS datasets separated for PostgreSQL backups, exact accepted-object
copies, signed audit/security segments, secrets/control recovery and selected
telemetry. Source identities can create only expected immutable material and verify
their receipts; they cannot list unrelated classes, prune snapshots, load recovery
keys or administer ZFS. Destructive maintenance is recovery-VPS-local, step-up
protected, reason-bound and independently audited.

Cloudflare R2 and every other managed object store are outside the backup design,
including Dokploy control-plane and volume backups. The approved external SaaS
boundaries do not become recovery repositories by convenience.

### 22.1 Database, object and control copies

- Run the version-pinned PostgreSQL 18 container with a compatible pgBackRest
  companion inside `platform-data`. Share only the required PostgreSQL/WAL/socket
  and encrypted local-repository volumes; the application project receives no
  repository administration authority.
- Push WAL to a small encrypted active-host repository and the recovery VPS through
  a WireGuard-protected forced-command or mTLS receiver. PostgreSQL may recycle WAL
  only after the configured durable-copy rule is satisfied.
- Begin with a measured five-minute `archive_timeout`, weekly full and daily
  differential backups. Keep about seven days locally and approximately 28 days on
  the recovery VPS, with all tenant-bearing recovery points expired by day 35.
- Copy every accepted immutable Garage generation and signed audit/security segment
  to its class-separated recovery dataset within 15 minutes. Address exact random
  generation keys, verify length/ciphertext checksum before acknowledgement and
  reconcile signed inventories.
- Garage single-node storage is an availability and durability failure domain, not a
  backup. Its own documentation states that single-node deployment has no redundancy
  and should not be represented as production HA:
  [Garage single-node guidance](https://garagehq.deuxfleurs.fr/documentation/quick-start/).
- Back up Dokploy/Compose definitions, secret-name inventories, encrypted key
  recovery material, database roles, Garage configuration and observability
  provisioning. Mutable VM/container state is rebuilt, not restored as authority.
- Do not back up Valkey RDB/AOF data, ULIP tokens, plaintext scanner scratch,
  quarantine working files or other reconstructable/ephemeral state.
- Rotate at least two encrypted offline media sets from recovery-VPS raw encrypted
  snapshots. Store the disconnected set under separate custody and expire/destroy
  tenant-bearing media inside the same 35-day ceiling.

### 22.2 Deletion and restore safety

D-020 remains the deletion authority. Every eligible object generation is erased
from Garage, the recovery VPS snapshots/datasets and applicable offline media, with
a verified receipt. A minimal non-PII deletion tombstone lives outside restorable
tenant state for longer than the backup horizon.

Every database/object restore starts quarantined with public ingress and external
workers disabled. Before readiness:

1. restore the selected PostgreSQL point and exact object/audit inventory;
2. authenticate database, object and manifest checksums;
3. load only recovery-authorized encryption material;
4. replay all newer deletion tombstones, consent withdrawals, organization
   offboarding and released/legal-hold state;
5. verify absence/retention results across every restored store;
6. rebuild empty Valkey instances and run the coordination restart gate; and
7. obtain named approval before DNS or any external provider effect is enabled.

A restore never becomes staging and is destroyed after its approved exercise or
incident purpose.

### 22.3 Exercises, objectives and failure behavior

Run daily archive/receipt checks, weekly backup-set verification, monthly isolated
point-in-time database restore and quarterly complete database/object/audit/key/
application recovery. At least twice yearly, simulate total loss of the active host
and prove reconstruction using only the recovery VPS, offline custody, reviewed
infrastructure definitions and signed GHCR images.

Measure actual data-loss window and recovery time. The one-hour RPO and four-hour
RTO are production admission and continued-operation gates, not inferences from
backup configuration. If an exercise exceeds either objective, freeze stronger
availability claims, prioritize remediation and invoke the D-015 topology-expansion
review.

Recovery-VPS loss permits bounded operation from the local repository only while
WAL capacity and the one-hour RPO remain protected; page immediately and restore
the independent receiver. Primary-host loss invokes manual rebuild/restore and
reviewed DNS cutover. Gatus/ntfy on the recovery VPS independently detects active-
host loss, but never initiates failover.

The recovery VPS is sized from measured compressed database, WAL, object, audit,
snapshot and restore workspace requirements with at least 30% headroom. Capacity and
cost enter the quarterly D-015 ledger. A provider snapshot may be created only for a
declared incident, must be encrypted/inventoried and must be deleted within 35 days.

Implementation and tests follow PostgreSQL continuous archiving, pgBackRest and
OpenZFS snapshot/send/receive contracts. Dokploy backup features protect Dokploy
only when their destination complies with this section; they never replace
application PITR, exact-object recovery or tombstone replay.
## 23. Scalability strategy

The launch scale does not require microservices, Kafka or Kubernetes.

- Scale stateless web/API containers vertically first; add an independently hosted
  application node only when measured host-failure or capacity evidence requires it.
- Scale Graphile workers by named queues and concurrency limits.
- Run two pinned Valkey 9.1.2 containers and the approved
  `@valkey/valkey-glide` client in standalone mode behind the adapter. Both services
  disable RDB/AOF and modules, bind only to the private data network and disable the
  default user. Map per-service credentials to distinct API/worker/monitor ACL users
  with exact command/key-prefix permissions;
  deny runtime `CONFIG`, `ACL`, `MODULE`, `DEBUG`, `SHUTDOWN`, `FLUSH*`, `KEYS`,
  persistence, migration and replication commands.
- Permit no arbitrary `EVAL`/`SCRIPT LOAD`. Deployment loads only reviewed versioned
  scripts and runtime roles use `EVALSHA`; rate reservations include a stable request
  ID and bounded receipt so retry after an ambiguous response returns the prior
  result rather than double-consuming. Script absence, error or changed digest keeps
  provider work paused.
- Give each Valkey process an explicit cgroup budget; set `maxmemory` to at most 70%
  of that budget, begin `maxmemory-clients` at 5%, bound connections/query/output
  buffers/timeouts and retain host headroom for PostgreSQL/Garage. Coordination uses
  `noeviction` and treats OOM/write rejection as dependency failure; cache uses
  `allkeys-lfu`, where eviction is an expected metric rather than data loss.
- Monitor version/config/script digests, process/certificate health, connections,
  rejected writes, evictions/expiry, hit rate, memory/RSS/fragmentation, blocked/
  slow commands and restart-generation state without exporting commands, keys or
  values. Apply a tested 9.1.x patch within 14 days or D-025's shorter deadline.
- Keep one authoritative writer and use direct TLS, role-separated bounded pools
  for API, Graphile, reports/exports and migrations. Next.js owns no DB pool.
- Calculate pool connections against maximum container counts; normal services may use
  at most 70% of usable PostgreSQL connections, reserving at least 30% for recovery,
  migration, monitoring and incident access. Bound pool wait and shed load instead
  of opening connections without limit.
- Defer PgBouncer until tests prove transaction-local tenant context,
  connection reuse/pinning, Graphile session/LISTEN/advisory behavior, failover and
  absence of cross-organization state leakage.
- Use D-028 monthly partitions for the selected append-only histories while
  keeping master/current and active queue tables unpartitioned.
- Queue and pace ULIP activity independently of interactive API capacity.
- Batch imports and compliance recomputation.
- Use outbox-driven projections for search, notifications, reporting and billing.
- Use starting `statement_timeout`/`lock_timeout` budgets of 3s/1s for interactive
  API, 30s/2s for workers and 60s/2s for concurrency-limited reports/exports;
  longer work is batched/checkpointed and any exception has evidence/owner.
- Parameterize SQL, bound pages/time ranges and test critical plans at representative
  tenant skew and twice projected first-year retained volume. Frequently queried
  provider fields are typed rather than hidden in general JSONB.
- Enable restricted-access `pg_stat_statements`, PostgreSQL/host exporters,
  Prometheus recording rules and alerts for connection/pool saturation, load/waits,
  slow SQL/locks/deadlocks, storage/IOPS/latency, WAL, transaction age, vacuum,
  bloat and partition/index growth. Never place PII in SQL comments, dynamic
  identifiers, query literals or `application_name`.
- Schedule bounded `amcheck` integrity work and reconcile every reported page/index
  failure with data-page-checksum, storage and pgBackRest evidence; it is detection,
  not repair. Use `pg_trgm` only behind typed field-authorized search and
  `btree_gist` for reviewed interval exclusion constraints, never as generic index
  defaults.
- Keep commands, read-after-write and authorization/billing/compliance/retention/
  audit decisions on the writer. Add a replica only after query/index/pool fixes
  and load evidence, restrict it to non-critical reports/exports, monitor lag and
  expose `as_of`; unsafe staleness fails rather than masquerading as current.
- Add dedicated search, archive, warehouse or extracted services only against
  measured bottlenecks and D-023 isolation/reconciliation/deletion approval.

Before pilot forecast rows/bytes/indexes/WAL per table and run the 500-asset skewed
multi-tenant workload at twice projected first-year retained volume, including
verification bursts, imports, reports, deletion, vacuum and restore. Demonstrate at
least 30% forecast-peak CPU, I/O, storage and connection headroom. Prove the exact
PostgreSQL 18 container with Drizzle, the Node driver, Graphile Worker, every allowed
extension, D-038 service authentication/TLS where applicable, pgBackRest and
recovery. Apply a tested current 18.x
minor within 14 days of release or sooner under D-025, after release-note, staging-
restore and query-plan review.

Rehearse a major upgrade at twice forecast retained volume every year and start the
replacement program at least 12 months before PostgreSQL 18's November 2030 end of
support. Use the new version's `pg_upgrade --check` and copy mode with sufficient
separate capacity; never use link/swap modes. Freeze mutations, verify backup/WAL,
upgrade, update/test extensions, analyze/reindex where release notes require, run
RLS/Graphile/application/integrity/restore acceptance and only then reopen writes.
The untouched old cluster is a rollback point only before new-version writes are
accepted; afterwards use forward repair or the declared recovery procedure rather
than silently losing committed data. Immediately create and verify a new full
backup, while retaining the old binaries/configuration needed to restore every
unexpired pre-upgrade backup.

Implementation references:

- [PostgreSQL `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)
- [PostgreSQL 18.6 release notes](https://www.postgresql.org/docs/release/18.6/)
- [PostgreSQL `initdb` checksums and locale](https://www.postgresql.org/docs/18/app-initdb.html)
- [PostgreSQL client-certificate HBA](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)
- [PostgreSQL SCRAM channel binding](https://www.postgresql.org/docs/18/sasl-authentication.html)
- [PostgreSQL `pg_upgrade`](https://www.postgresql.org/docs/18/pgupgrade.html)
- [PostgreSQL `amcheck`](https://www.postgresql.org/docs/18/amcheck.html)
- [PostgreSQL `EXPLAIN`](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL continuous archiving and recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [Valkey releases and support](https://valkey.io/topics/releases/)
- [Valkey persistence](https://valkey.io/topics/persistence/)
- [Valkey eviction and memory limits](https://valkey.io/topics/lru-cache/)
- [Valkey TLS and certificate ACL identity](https://valkey.io/topics/encryption/)
- [Valkey ACLs](https://valkey.io/topics/acl/)
- [Valkey client limits](https://valkey.io/topics/clients/)
- Preserve provider/domain ports so ULIP, storage, billing and deployment adapters can evolve independently.

## 24. Starter-kit implementation delta

Use starter commit `49235c101ab20b005771d90594b0e45f489ae454` /
prerelease `0.2.0-dev.1` once to generate a new independent private repository.
Future starter changes are ordinary reviewed source changes, never automatic
synchronization. Product requirements and the architecture in this document take
precedence over generator defaults.

### 24.1 Pinned qualification baseline

| Component | Initial qualification version |
| --- | --- |
| Node.js | 24.19.0 on Linux amd64/glibc |
| pnpm | 11.22.0 |
| Next.js / React | 16.3.1 / 19.2.3 |
| Fastify / tRPC / Zod | 5.12.1 / 11.18.0 / 4.4.3 |
| Better Auth | 1.7.1 |
| Drizzle / postgres client | 0.45.2 / 3.4.9 |
| Graphile Worker | 0.17.3 |
| Pino / TypeScript / Vitest | 10.3.1 / 6.0.3 / 4.1.11 |
| Production PostgreSQL | Digest-pinned PostgreSQL 18.6 container, moving through qualified 18.x security releases |
| Production Valkey | Two digest-pinned Valkey 9.1.2 containers with the qualified GLIDE client |
| Object storage | Qualified Garage 2.x release |

Qualify Node security patches within seven days or the shorter security deadline,
and rebuild unchanged application inputs weekly to produce a new digest, SBOM and
provenance. Begin Node 26 qualification only after Active LTS; require the complete
suite and D-043's risk-based extended staging evidence, and remove Node 24 from production no later
than 31 October 2027. Pin the runtime image by digest to Debian Bookworm slim;
Alpine/musl is outside this baseline.

### 24.2 Implementation delta

| Action | Required treatment |
| --- | --- |
| Retain | Workspace layout, strict TypeScript, Next.js App Router, Fastify, tRPC, Zod, Better Auth primitives, Drizzle, Graphile Worker, Pino, Vitest, pnpm catalogue/lock controls and CI foundations after qualification. |
| Remove | Unselected mobile, AI, agentic-AI, RAG, Python, Stripe, Resend and hosted-observability packages, unused routes/examples, public source maps, package managers, compilers, tests and build credentials from runtime images. |
| Replace | Generator infrastructure defaults with Garage storage, ZeptoMail delivery, self-hosted telemetry, containerized PostgreSQL/Valkey, the secrets-provider abstraction/libsodium, the approved Dokploy Compose topology and D-043 release execution. |
| Add | Organization tenancy/RLS, domain aggregates, policy/compliance engine, ULIP adapters, import and scanning pipelines, billing ledger, audit/retention/privacy controls, notification workflows, support, product measurement, operational consoles and every table group in §9.2. |

The AWS S3 JavaScript SDK may remain only as the explicitly configured Garage
protocol client. Supply a fixed endpoint, region placeholder and scoped credentials;
disable environment, profile, container-metadata and instance-metadata discovery.
No ambient cloud-service credential or endpoint discovery is permitted.

### 24.3 Repository and dependency controls

- Generate into an empty private repository and record the generator commit,
  selected options, generated-tree hash and first product commit.
- Maintain one exact workspace catalogue, lockfile, Node/pnpm declaration and
  TLS/integrity policy. Frozen installs must reject drift, peer mismatch, cycles,
  Git/HTTP dependencies and unapproved registries.
- Apply a seven-day cooling period to ordinary new package versions. Security fixes
  use D-025 deadlines and an explicit risk-reviewed exception when cooling is unsafe.
- Use isolated trusted caches and full-SHA-pinned CI actions. Untrusted pull requests
  receive no release, registry, deployment or production credentials.
- Keep lifecycle scripts denied by default. The initial allowlist is `esbuild`
  and, only when image processing requires it, reviewed `sharp`.
- Build native modules only for the target platform in a multi-stage build. Run as a
  fixed non-root identity with a read-only root and the D-037 runtime profile.
- Generate environment configuration schemas and safe example files without
  production values. Secrets remain environment-only through the D-030 provider port.
- Generate database migrations, API contracts and package-boundary checks from
  reviewed source; no generator or dependency may mutate production automatically.

### 24.4 Development profile

Local `core` uses watch-mode application processes, disposable PostgreSQL 18.6,
Mailpit, deterministic provider emulators and generated development-only keys.
Valkey, Garage, scanner and telemetry are opt-in Compose profiles so unrelated work
does not wait for them. Local `full` adds both isolated Valkey 9.1.2 processes, one
Garage node, scanning and telemetry. MinIO may exist only in a separately invoked
storage-protocol compatibility fixture.

Staging runs on one Dokploy VPS. Its always-on `core` profile uses synthetic data,
PostgreSQL, both Valkey services, Garage, provider emulators/test modes and basic
telemetry. Its on-demand `release` profile adds the production scanner, security,
DAST, full telemetry, migration/rollback and backup/restore suites. Local, CI,
preview and staging never receive production data, keys or provider credentials.
Production promotion uses the identical signed digest validated by the applicable
staging profile.

Run the starter validation once before product work, then make the product repository's
own validation command authoritative. A starter validation result proves generator
integrity only; every production capability must satisfy §25 and §30.

## 25. Testing strategy

Tests prove customer-visible outcomes and non-budgetable invariants at the lowest
useful layer, then repeat critical boundaries end to end. Production receives only
non-mutating canaries and synthetic probes; mutation, load, DAST, destructive,
recovery and fault-injection tests run in isolated environments.

### 25.1 Required layers

| Layer | Purpose |
| --- | --- |
| Static and supply chain | Type, lint, dependency, secret, licence, SBOM, provenance, image-content, IaC/Ansible and policy checks; documentation proves D-001–D-070 each has one environment classification and every gate names its environment and blocked production capability. |
| Unit and property | Canonicalizers, legal dates, policy operators, state machines, encryption envelopes, limits and pure domain invariants. |
| Database integration | Constraints, RLS, roles, transactions, idempotency, outbox/inbox, partitions, retention and concurrency against real PostgreSQL. |
| Adapter contract | Sanitized official fixtures and emulators for ULIP, storage, email, payment, cross-host trust and other external boundaries; local/full and staging/release execute the same application ports, storage envelopes, worker contracts and provider normalizers promoted to production. |
| API and authorization | Every command/query/field under allowed, denied, stale, wrong-tenant, wrong-scope and insufficient-assurance contexts. |
| Worker and reconciliation | Crash, retry, reorder, duplicate, partial result, dead letter, cancellation and restart behavior for every job class. |
| Browser and accessibility | Supported desktop/mobile journeys, keyboard, screen reader, reflow, localization, connectivity loss and storage restrictions. |
| Performance and resilience | Twice-forecast retained volume, burst/backlog behavior, dependency loss, resource ceilings, failover/recovery and SLO measurement. |
| Independent security | Authenticated DAST, manual abuse cases, penetration test and remediation retest before external pilot. |

### 25.2 Authoritative scenario matrix

| Area | Required scenarios and expected outcome |
| --- | --- |
| Tenancy and RLS | Exercise every tenant table, relationship, query, background job, report, object and support view with missing, wrong and stale organization context. Cross-organization reads/writes return no data and create safe audit/security evidence; shared payer/customer links never grant tenant access. |
| Authentication and authorization | Test passwords, passkeys, TOTP, session rotation, email change, invitation, membership ending, recovery and step-up. Permissions are enforced by Fastify on every field/action; frontend hiding is never authority. Revoked roles/scopes/sessions and changed proposal inputs fail at execution. |
| Approvals and abuse | Prove requester/beneficiary conflicts, quorum, delegation cycles, duplicate votes, expiry, cancellation and crash/replay behavior. Rate, concurrency and abuse controls remain multidimensional and reversible, preserve privacy/recovery routes and never alter accurate domain/provider/finance facts. |
| Domain lifecycles | Cover vehicle, trailer, driver, engagement, fleet/location, custody, duty, combination, sale/transfer, maintenance, scrapping, closure-watch, archive, rehire and reactivation transitions. Invalid overlaps fail; historical intervals and effects remain reproducible. |
| Credentials and compliance | Evaluate required, conditional, unsupported, missing, expired, stale, conflicting and exception-bearing assertions across approved policy cells. Requirement posture and contextual decision remain separate; material uncertainty produces indeterminate/not-determined, never implicit clearance. |
| Time and scheduling | Test every legal-date boundary, inclusive validity end, jurisdiction zone, leap date, DST-capable zone, missed heartbeat, duplicate scheduler, tzdata mismatch, clock skew/jump and catch-up path. Historical results reproduce with their recorded clock/runtime/policy versions and alerts deduplicate. |
| Identifiers and reference data | Use exact, Unicode-confusable, malformed, colliding, recycled and multi-provider identifiers plus exact/narrower/broader/ambiguous/unmapped/deprecated mappings. No fuzzy merge or policy-strengthening occurs; mapping changes shadow, reconcile and restate affected results without rewriting source observations. |
| Data quality and correction | Seed missing, invalid, duplicate, inconsistent, stale, inaccurate and provider-schema-drift data. Findings retain dimension, materiality, population and owner; corrections preserve record/effective time, immutable sources, impact, compensation and complete reconciliation. |
| ULIP | Contract-test every enabled dataset for success, not-found, masked/partial, nested HTTP-200 business error, 401, 403, 429, timeout, malformed/schema-drift and wrong-subject responses. Prove token single-flight, fair global/dataset/organization limits, cooldown, bounded retries/circuits, quota ledger recovery and no fallback on business errors. |
| Imports and onboarding | Test CSV/XLSX versions, encodings, text identifiers, invalid dates/codes, unknown columns, formulas, links, macros, archives, decompression limits, duplicates, optimistic updates, atomic commit sets and cancellation. Pilot/wave failure stops later admission while preserving per-subject outcomes, idempotency, capacity and exact denominators. |
| Files and object storage | Test MIME/signature mismatch, malware, parser exhaustion, scanner outage/compromise, quarantine, safe preview, immutable accepted generations, tamper/truncation, exact-object grants, retrospective quarantine, retention, legal hold and deletion across Garage, the recovery VPS and offline copies. |
| Cryptography and secrets | Run known-answer/interoperability tests for XChaCha20-Poly1305, secretstream and sealed boxes; test wrong tenant/context/key, wrapper loss, rotation, dual reads and recovery-only decryption. Restricted plaintext and credentials must be absent from logs, DTOs, jobs, caches, browser storage, images and backups outside their approved envelope. |
| Billing and payment | Cover trial, activation, capacity, add-on, proration, grace/restriction, Razorpay duplicate/reordered/invalid callbacks, ambiguous timeout, offline credit, refund, credit/debit note, withholding, close and restore. Thaarei's ledger and statutory authority reconcile without payment events directly granting or terminating access. |
| Notifications and support | Test threshold crossing, digest consolidation, preference/routing, security-channel reservation, template/token expiry, accepted-but-unknown send, bounce/complaint, provider outage and signed webhook replay. Support visibility, requester-private cases, specialist routing and attachment boundaries never grant data access. |
| Privacy, rights and residency | Exercise notice/consent/withdrawal, access/correction/erasure/grievance/nomination, representative verification, purpose cessation, source rights, restricted exports and every registered data destination. Unknown or tightened rights fail the proposed use; INDIA_CORE rejects undeclared egress/foreign access and restores cannot revive deleted authority. |
| Audit, retention and legal hold | Prove atomic mandatory audit, sequence gaps, canonical hashes/signatures, archive replication, access logging, category retention, precise hold binding/release, deletion races, processor receipts and tombstone replay. Holds preserve without granting access or retaining unrelated records. |
| API, search and exports | Test typed filter allowlists, keyset pagination, exact encrypted search, query limits, stale saved views, field reauthorization and current versus historical reports. Exports remain formula-safe, snapshot-reproducible, checksummed, five-minute granted and 24-hour retained; revocation before download denies access. |
| Frontend, localization and accessibility | Test organization switching, logout, stale-client rejection, network loss, no browser persistence, 320-pixel reflow, keyboard/focus, screen reader, reduced motion, contrast, touch target and supported browsers. Exercise pseudolocales, expansion, plural/date/money cases, RTL isolation, glyphs and immutable legal-language rendering. |
| Claims and permitted use | Reject uncontrolled verification, government, certification, universal-compliance, guarantee and real-time claims in every UI/API/email/report/support/marketing surface. Valid claims expose exact source, method, coverage, context, freshness, versions, unknowns and exceptions; withdrawn claims preserve originals and reconcile every copy. |
| Database, cache and capacity | Test constraints/locks/serializable retry, pool exhaustion, cancellation, autovacuum/bloat, partition provisioning/removal, plan regressions, scanner backlog and restore workspace at twice-forecast load with 30% headroom. Reconcile the qualified sizes to the INR 15,000–40,000 monthly infrastructure ledger. Destroy both Valkey instances; cache loss degrades to bounded reads while coordination uncertainty pauses ULIP until ledger reconstruction. |
| Release and environment | Prove allowlisted environment/profile/capability states, production rejection of mocks/test keys/debug/insecure settings, source-to-digest provenance, same-digest staging promotion, project-isolated deployment, expand migration, candidate smoke, HTTP/worker drain, stale-client handling and schema-forward rollback. Updating `platform-app` must not restart or recreate `platform-data`, Garage, Valkey, backup or telemetry services. |
| Hosts, edge and trust | Rebuild active/recovery hosts from pinned code; test WireGuard/FIDO2 administration, nftables after Docker, container negative policies, patch/reboot, DNSSEC, Traefik ACME, optional CrowdSec observation/failure and public-port inventory. Reject unauthorized/expired cross-host credentials and rehearse their recovery/rotation. |
| Backup, recovery and observability | Exercise random-time PITR, exact object/audit recovery, offline media, backup-link loss, active-host/recovery-VPS loss, deletion replay and complete RPO/RTO restoration. Rebuild PostgreSQL, exact object generations, audit segments, configuration and keys using only recovery-VPS material plus offline custody, replay tombstones before service, and measure the one-hour RPO/four-hour RTO. Synthetic journeys must page through the independent recovery path when production or primary telemetry is unavailable; telemetry remains bounded and non-authoritative. |
| Product measurement | Validate registered server-outcome events, prohibited-field/cardinality rules, RLS rollups, sparse-cell suppression, retention/deletion and opt-in organization cohorts. Browser bundles contain no analytics, replay, heatmap, tracking or fingerprinting SDK. |
| Future OCR gate | If activated later, test raster-only capabilities, no egress/secrets/database, bounded sandboxing, per-cell precision lower bounds, abstention, human field confirmation, drift shutdown, model/data provenance, retention and manual fallback. No extraction result becomes verification automatically. |

### 25.3 Release and acceptance evidence

Each test run records release digest, schema/task/configuration versions, fixture or
synthetic-data provenance, environment, start/end time, result, artifact checksum
and reviewer. Failures create owned findings; a waiver is bounded, approved under
D-025/D-054, expires, and cannot waive tenant isolation, authorization, compliance
correctness, audit completeness, committed-data integrity or deletion
non-resurrection.

Before production customer data, complete the independent penetration test,
remediation retest, twice-volume performance run, full two-boundary deployment
rehearsal and random-time recovery exercise. Also record the accepted single-active-
host risk and customer-safe limits: no automatic host failover, three-zone object
availability or zero-downtime claim. Section 30 identifies the environment, evidence
owner and production capability blocked by each outstanding gate.

## 26. Delivery phases and gates

Phases are capability increments, not permission to defer cross-cutting security,
tenancy, audit or data-integrity controls. Production evidence gates block only the
named production capability; they do not block local implementation, unrelated
routes or staging core. A production phase exits only when its linked Section 30
evidence is approved against the promoted release candidate.

### Phase 0 — Authority and foundation

- Establish named product, security, operations, privacy, compliance, finance and
  customer-implementation owners.
- Open and assign ULIP, policy, privacy/legal, supplier, residency, finance and
  implementation evidence registers; unresolved external facts remain explicit
  production gates rather than development prerequisites.
- Generate the private repository from the pinned starter, approve ADRs, threat
  model, data-protection impact assessment, dependency baseline and release policy.
- Implement the allowlisted environment/profile contract, local core/full Compose
  dependencies, synthetic fixtures, provider emulators and CI isolation. Do not
  provision production/recovery infrastructure as a Phase 0 exit condition.

**Evidence:** E-010, E-023A and E-025's local/CI baseline. All other applicable
evidence remains owned and may stay open until its production capability is due.

**Exit:** owners, decisions, open external authorities and the exact development
baseline are documented; local core and CI run without production infrastructure.

### Phase 1 — SaaS platform foundation

- Implement organization tenancy, customer/payer/contract/subscription separation,
  Better Auth integration, memberships, scopes, RLS and unified approvals.
- Establish PostgreSQL transactions, idempotency, outbox/inbox, UUIDv7, typed time,
  reference/configuration registries, audit, retention, encryption and secrets.
- Build the Next.js/Fastify shell, organization switching, operational console,
  signed-image pipeline and same-digest staging promotion.
- Provision the one-VPS staging core profile; activate the staging release profile
  only for applicable release-candidate validation.

**Evidence:** E-023B; E-025's staging baseline; and the implementation/test portions
of E-012, E-026–E-028 and E-035–E-038. Their production qualification may remain
open until the affected production capability is scheduled.

**Exit:** cross-tenant and authorization suites pass; a signed release can be
deployed to staging core, observed, rolled back schema-forward and restored from
synthetic data without any production resource.

### Phase 2 — Fleet and onboarding core

- Implement organizations, locations, fleets, assets, trailers, drivers,
  engagements, eligibility, custody, duty assignments and combinations.
- Implement typed identifiers, duplicate resolution, lifecycle transitions,
  corrections and versioned XLSX/CSV staging/preview/commit.
- Implement D-070 scope, representative pilot, capacity-sized waves, readiness,
  training, hypercare and handover.

**Evidence:** E-027, E-031–E-034, E-051.

**Exit:** at least 500 representative assets plus related drivers import and activate
in bounded waves with exact lineage, history, denominators and billing capacity.

### Phase 3 — Documents and compliance

- Implement credential/evidence separation, quarantine/scanning, encrypted immutable
  objects, safe preview and retention/legal-hold behavior.
- Implement policy packs, coverage cells, assertion assurance, compliance
  evaluation, exceptions, cases, tasks, claims and data-quality reconciliation.
- Implement legal publications, rights/grievance journeys and localization-ready
  legal surfaces.

**Evidence:** E-003–E-004, E-017, E-029, E-032–E-041, E-046, E-048–E-050.

**Exit:** representative vehicle/driver/document cases reproduce exact policy,
source, freshness, uncertainty, rights and correction outcomes without false claims.

### Phase 4 — ULIP integrations

- Activate approved VAHAN, SARATHI, FASTag and eChallan adapters; keep TOLL as the
  bounded non-compliance utility.
- Implement token single-flight, global/dataset/organization fair limits, immutable
  observations, subject binding, normalization, caching/freshness, retry/circuit
  handling and provider operations.
- Validate current production and recovery egress, entitlements and quota-derived
  workload capacity.

**Evidence:** E-001–E-002, E-008, E-025, E-029, E-032, E-047, E-049.

**Exit:** dataset contracts pass; paced verification and recovery backlog cannot
breach provider limits or misstate provider failure as compliance failure.

### Phase 5 — Commercial and customer operations

- Implement capacity/add-on billing, trials, grace/restriction, Razorpay/offline
  collection, statutory-document ingestion and financial reconciliation.
- Implement in-app and ZeptoMail delivery, preferences, digests, escalation,
  support cases, search, current/historical reports and secure exports.
- Implement first-party product measurement without browser surveillance.

**Evidence:** E-005–E-006, E-011, E-014, E-042–E-045.

**Exit:** billing, notification, support, reporting, export and measurement
journeys reconcile through duplicate, reordered and provider-failure cases.

### Phase 6 — Pilot and general-availability hardening

- Provision and qualify the active production host and independently administered
  India recovery/monitoring VPS, including encrypted volumes, exact-object/WAL/audit
  receipts and manual recovery.
- Complete Version 2 user research, responsive usability, accessibility and
  supported-browser validation.
- Run the full Section 25 security, load, resilience, environment, release,
  site-loss, backup/restore, paging and incident exercises.
- Onboard smaller design partners and the 200–500-vehicle customer through D-070.
- Resolve launch-blocking findings and publish customer, support, security,
  availability, privacy and dependency information accurately.

**Evidence:** all E-001–E-051 gates applicable to MVP.

**Exit:** product, security, compliance, operations, privacy and commercial owners
approve GA readiness from current evidence.

### Later capability gates

OCR/extraction, native mobile, push, enterprise SSO/SCIM, SMS/WhatsApp, public
customer APIs/webhooks, broader ULIP datasets, telematics, cargo/trip documents and
advanced cross-organization analytics require their separately documented evidence
and must not be enabled through an ordinary feature flag.

## 27. MVP capability boundary

| Included in pilot MVP | Explicitly deferred |
| --- | --- |
| Manually reviewed customer application, authority review, organization/commercial provisioning and first-owner activation | Unreviewed instant self-service tenant activation |
| Customer, payer, contract, subscription, capacity and add-on separation | Multi-currency, multiple sellers, usage overages and general-ledger/GST-return automation |
| Organization users, fixed role templates, scoped memberships, MFA and unified approvals | Tenant-defined roles, enterprise SSO and SCIM |
| Locations, flat fleets, tags, vehicles, trailers, drivers, engagements, eligibility, custody, duties and combinations with history | Dispatch, route planning, payroll, attendance and working-hours engines |
| Manual entry and governed XLSX/CSV onboarding with preview, lineage, duplicate resolution and wave activation | Spreadsheet deletion, implicit merge, direct provider calls during preview and unattended whole-fleet activation |
| Vehicle/driver credential catalogue, encrypted evidence, scanning, renewal and retention | OCR/extraction, biometrics, document authenticity AI and automatic field acceptance |
| Reviewed ordinary-commercial-goods policy packs for exact design-partner jurisdictions/operations | Universal, pan-India, passenger, hazardous or specialized coverage without reviewed cells |
| VAHAN/04 target with controlled VAHAN/01 fallback; SARATHI/02 default and purpose-gated SARATHI/01; FASTAG/02, conditional FASTAG/01 and eChallan | VAHAN chassis/engine lookup and unapproved datasets |
| Feature-flagged TOLL single-parameter reference lookup | Route computation or toll data as compliance evidence |
| Verification inbox, findings, cases, tasks, acknowledgements, corrections and controlled operational exceptions | Automatic exception approval or alteration of underlying facts |
| Versioned reference mappings, data-quality findings, reconciliation and reproducible compliance evaluations | Universal fleet/driver/compliance or data-quality scores |
| Governed legal publications, privacy rights/grievance intake, consent language shell and evidence ledger | Consent Manager integration and in-product regulated e-signature issuance |
| Complete en-IN operations UI with localization-ready contracts and approved multilingual legal/consent surfaces | A second complete product locale until its full support gate passes |
| Dashboard, expiry/calendar views, typed search, saved views and standard current/historical reports | Data warehouse, embedded BI and unrestricted full-text sensitive search |
| Formula-safe CSV/XLSX snapshot exports with short-lived private downloads | Public bulk-data APIs and unrestricted provider redistribution |
| In-app notifications and ZeptoMail transactional email | SMS, WhatsApp, Web Push, live chat and inbound-email commands |
| INR/GST-exclusive quote, receivable, capacity/add-on billing, Razorpay/offline collection and statutory-document boundary | Card handling, adaptive pricing and automatic tax-policy decisions |
| Application-owned support centre, private recovery intake and independent outage route | External helpdesk, remote screen sharing and automated AI support decisions |
| First-party server-outcome product measurement and design-partner cohorts | Analytics/tag-manager SDKs, replay, heatmaps, fingerprinting and classical pilot A/B testing |
| Online-first installable responsive web application | Offline tenant storage, service worker, Background Sync, queued browser writes and native mobile |
| One active India-hosted Dokploy production server plus an independently administered India recovery/monitoring VPS, with self-hosted security, observability, audit and backup/recovery | Kubernetes, Kafka, automatic multi-site failover, Cloudflare R2 and managed cloud runtime services |
| D-070 implementation, representative pilot, rollout waves, readiness, ten-business-day hypercare and handover | Customer-specific deployments, databases or production-data training copies |
| Private first-party application transport | Entitled public REST API and outbound webhooks until D-027 gates pass |

## 28. Acceptance criteria for the 200–500-lorry customer

Acceptance uses representative synthetic data before customer data and then the
approved D-070 pilot/wave process. Internal test procedures live in §25; this
section defines customer- and release-observable outcomes.

### 28.1 Organization and access

- Provision the customer, payer, contract, subscription, organization and first
  owner exactly once through concurrent/reordered/retried activation.
- Demonstrate role, fleet/location scope, field policy, MFA and approval enforcement
  for owners, administrators, compliance reviewers, fleet managers and viewers.
- Prove another organization cannot discover or access any user, driver, vehicle,
  document, search result, job, support case, report, object or audit event.
- Demonstrate controlled owner recovery, membership ending, organization restriction
  and offboarding without unintended reactivation after restore.

### 28.2 Onboarding and fleet operations

- Validate and preview at least 500 representative assets plus associated drivers
  without browser timeout, unbounded database work or provider calls.
- Import dependency-complete commit sets with exact row lineage, actionable errors,
  warning acknowledgement, duplicate review and idempotent retry.
- Move assets/drivers between fleets, locations, custodians, duties and combinations
  without losing effective-dated history or permitting invalid overlaps.
- Activate a deliberately selected 10–25-vehicle pilot, reconcile it, and complete
  remaining capacity-sized waves without duplicate billing or ULIP effects.
- Show total, draft, activation-pending, active, evaluated, pending, stale, failed
  and excluded populations exactly; no omitted subject appears clear.

### 28.3 Verification, documents and compliance

- Verify every enabled ULIP adapter against its approved contract while remaining
  within written account, dataset, burst and concurrency limits.
- Display authoritative source, method, assurance, observation time and freshness
  for each material assertion; provider failure preserves the last observation and
  creates pending/stale/indeterminate state rather than a fabricated failure.
- Identify missing, expired, expiring, stale, conflicting and unsupported
  requirements accurately under the customer's approved jurisdictions and operations.
- Keep subject posture, contextual operational decision and exception distinct, and
  reproduce each output from recorded policy/reference/observation versions.
- Upload, scan, preview, replace, hold, download and delete representative evidence
  with immutable encrypted generations, exact-object authorization and complete
  audit/deletion receipts.
- Complete renewal, correction, acknowledgement and exception workflows with the
  required step-up and independent approval.

### 28.4 Search, reporting and claims

- Search/filter by fleet, location, tag, vehicle/driver class, lifecycle, compliance,
  expiry window, assignment and authorized exact protected identifiers.
- Generate current operational, immutable historical, compliance, verification,
  challan, usage and audit reports with exact denominators and as-of metadata.
- Reproduce an export from its snapshot; deny download after permission revocation
  even while the encrypted object exists; remove it after the 24-hour retention.
- Ensure UI, notifications and exports use only approved claim vocabulary and never
  imply certification, universal compliance, real-time data or government endorsement.

### 28.5 Billing, notifications, support and privacy

- Reconcile activated managed-asset capacity, subscription/add-on entitlement,
  Razorpay/offline payment evidence, receivable and statutory-document state.
- Deliver threshold alerts, daily digest and escalations once logically despite
  duplicate/reordered worker/provider events; show delivery degradation honestly.
- Route ordinary support, incidents, account recovery, privacy, billing and
  compliance-correction matters to their distinct workflows without copying
  restricted data or granting support access.
- Complete representative driver notice/authorization, access, correction, erasure,
  withdrawal and grievance cases through secure delivery and processor receipts.
- Prove every customer/provider output respects source rights, permitted purpose,
  INDIA_CORE routing, retention and termination export restrictions.

### 28.6 UX, performance and operations

- Complete representative desktop/mobile journeys at WCAG 2.2 AA, from 320 CSS
  pixels upward, across the published browser matrix.
- Meet p75 LCP at or below 2.5 seconds, INP at or below 200 milliseconds and CLS at
  or below 0.1 for the approved pilot device/network profile.
- At twice projected first-year retained volume, meet journey/query/job targets
  during verification, import, report and retention bursts with at least 30%
  forecast-peak CPU, I/O, storage and connection headroom.
- Demonstrate the 99.5% launch journey objective, independent ULIP health/freshness,
  bounded degraded modes and staffed 24x7 SEV-0/SEV-1 response.
- Restore PostgreSQL, accepted objects, audit evidence and configuration to a
  customer-usable state within the one-hour RPO and four-hour RTO, with deletion
  replay completed before traffic.
- Complete D-070 go-live approval, the first three business days of daily
  reconciliation, ten business days of hypercare and recorded handover with no
  unresolved critical platform or isolation defect.

## 29. Material risk register

Controls are authoritative in the linked section. A trigger creates an owned risk,
incident, supplier, compliance or implementation record; this table does not create
a second control definition.

| Risk | Consequence | Primary control | Owner role | Trigger | Authority |
| --- | --- | --- | --- | --- | --- |
| ULIP entitlements or written limits do not support planned refresh and onboarding demand | Stale results, launch delay or agreement breach | Conservative global/dataset/organization limiter; reduce freshness/rollout or obtain capacity before admission | ULIP product owner | Any missing term, 403, quota forecast breach or repeated 429 | [§8](#8-ulip-integration-architecture) |
| Provider returns partial, malformed, nested-error or wrong-subject data | Incorrect compliance result | Versioned contracts, independent subject binding, quarantine and indeterminate outcome | Integration owner | Schema/field distribution change or binding failure | [§8.3–8.6](#83-provider-boundary) |
| Unsupported jurisdiction/operation is presented as covered | Unsafe operational reliance | Reviewed coverage cells and explicit unsupported/not-determined state | Compliance owner | New state, route, class, cargo or permit context | [§6.6](#66-applicability-and-launch-policy-packs) |
| Product wording overstates verification, compliance, freshness or government authority | Misleading customer decision or regulatory dispute | Governed claim registry, adjacent limitations and correction/restatement | Product and legal owners | New/changed claim, report, campaign or provider limitation | [§7.5](#75-product-claims-verification-language-and-responsibility) |
| Identifier normalization or duplicate resolution binds the wrong subject | Cross-record disclosure or unsafe result | Typed canonicalizers, immutable raw input and human-reviewed non-destructive resolution | Data-integrity owner | Collision, confusable input, recycled identifier or normalizer change | [§9.3](#93-canonical-identifiers-and-entity-resolution) |
| Reference mapping broadens a statutory value | False requirement satisfaction | Exact relation semantics, impact/shadow review and restatement | Reference-data steward | New/ambiguous code or mapping publication | [§9.4](#94-canonical-reference-data-and-provider-mappings) |
| Tenant context is missing, stale or bypassed | Cross-organization disclosure or mutation | Forced RLS, non-owner runtime roles and server authorization | Security owner | Any wrong-tenant test, access anomaly or role/config change | [§9.1](#91-database) |
| Privilege, MFA or approval becomes stale before execution | Unauthorized sensitive action | Current reauthorization, exact proposal hash, quorum and session invalidation | Identity owner | Membership, scope, assurance, subject or policy change | [§13](#13-authentication-and-authorization) |
| Automated abuse control blocks legitimate shared-network users or changes domain truth | Access denial or corrupted evidence | Multidimensional reversible controls, accessible alternatives and human material sanctions | Security operations | False-positive trend, appeal or protected-path interference | [§17.7](#177-abuse-fraud-and-automated-threat-control) |
| Driver processing lacks purpose, notice, authority or rights handling | Privacy violation | Purpose/field authorization, immutable publication evidence and rights workflow | Privacy owner | New purpose/dataset/field or withdrawal/request | [§17.3](#173-privacy) |
| Data or provider output is reused beyond customer/source rights | Contract, privacy or ULIP breach | Rights-class and permitted-use decision on every recipient/use | Legal/data-governance owner | New export, API, publication, aggregate, demo or model use | [§17.8](#178-data-rights-intellectual-property-and-permitted-use) |
| Core data or support access leaves the approved Indian boundary | Residency commitment or legal breach | INDIA_CORE register, deny-by-default egress and quarterly reconciliation | Privacy and infrastructure owners | New destination, supplier, remote session or region change | [§17.6](#176-data-residency-transfers-and-sovereign-access-boundary) |
| Hostile upload compromises a parser or reaches accepted storage | Service compromise or evidence contamination | Isolated no-egress scanner project, quarantine, safe derivatives and fresh accepted encryption | Security/platform owner | New file type/parser, signature outage or malicious fixture | [§17.2](#172-document-and-object-storage) |
| Encryption, wrapper or custody failure makes data exposed or unrecoverable | Confidentiality breach or failed recovery | Authenticated envelopes, independent wrappers, controlled rotation and recovery drills | Security and recovery owners | Key/wrapper error, rotation, custodian change or recovery test failure | [§21.9](#219-configuration-and-secrets-baseline) |
| Purpose cessation, erasure or hold races with jobs/backups/restores | Unauthorized retention, destroyed evidence or resurrection | Versioned retention/hold authority, per-store receipts and tombstone replay | Privacy and records owners | Rights request, hold/release, termination or restore | [§19](#19-data-retention-and-deletion) |
| Concurrent/retried command loses an update or repeats an effect | Corrupt domain, billing or provider state | Constraints/locks, expected versions, idempotency and atomic audit/outbox | Backend owner | Timeout, response loss, duplicate callback or worker crash | [§9.6](#96-data-consistency) |
| Scheduler or clock fault misses/repeats expiry work | Missed critical action or alert storm | Authoritative legal-date ledger, skew gates and idempotent crossed-threshold recovery | Operations owner | Missed heartbeat, timezone/tzdata change or clock alarm | [§7.4](#74-temporal-and-legal-calendar-contract) |
| Payment, tax or settlement event directly changes entitlement incorrectly | Financial inconsistency or improper access | Separate receivable/statutory/collection/entitlement authorities and reconciliation | Finance owner | Duplicate/ambiguous callback, tax change, refund or chargeback | [§14](#14-subscription-and-billing) |
| Critical notification is delayed, duplicated or contains sensitive data | Missed action or disclosure | Application-owned intents, priority reservation, minimal templates and signed-event reconciliation | Communications owner | Bounce/complaint, quota exhaustion, ambiguous send or provider outage | [§15](#15-notifications-and-workflow) |
| One-shot customer activation overloads ULIP or hides incomplete subjects | Quota breach and unsafe rollout | Representative pilot, capacity-sized manifests, individual activation and exact denominators | Implementation lead | New customer/wave, backlog or reviewer-capacity breach | [§12.2](#122-customer-implementation-go-live-and-handover) |
| Customer-specific infrastructure or spreadsheet state diverges | Weakened tenancy and unsupported operations | One RLS-protected product data plane and committed lineage | Product/platform owner | Custom deployment/database request or parallel tracking process | [§12](#12-bulk-onboarding-architecture) |
| PostgreSQL, connections or maintenance cannot sustain growth | Broad latency/outage | Twice-volume tests, bounded pools, time partitions, autovacuum governance and 30% headroom | Database owner | Forecast/headroom/SLO threshold breach | [§9.8](#98-growth-partitioning-and-database-maintenance) |
| Cache loss or coordination uncertainty causes unsafe provider traffic | Quota breach or service degradation | Disposable separated Valkey processes and conservative ledger reconstruction | Platform owner | Restart, eviction/OOM, ACL/script or connectivity failure | [§23](#23-scalability-strategy) |
| Release artifacts, services or schema drift | Outage, incompatible clients/jobs or corruption | Signed manifest, same-digest promotion, compatibility window and schema-forward rollback | Release owner | Manifest mismatch, failed smoke/readiness or post-switch error | [§21.7](#217-production-release-execution-and-rollback) |
| Active host or recovery/monitoring VPS fails | Prolonged outage, data loss or undetected failure | Separately administered recovery copies/monitoring, offline media and rehearsed RPO/RTO restoration | Reliability owner | Host/provider loss, paging loss or restore failure | [§20–22](#20-reliability-and-observability) |
| Self-hosted services lack staffing, patching or specialist skill | Security exposure and prolonged incident | Named owners, supported pins, patch/rebuild/runbooks and capacity-based architecture review | Engineering leadership | Missed patch/SLO/on-call/restore objective | [§21](#21-infrastructure-and-deployment) |
| Critical supplier changes terms, location, quota or service | Processing breach or unavailable dependency | D-062 admission, monitoring, material-change review and exercised exit | Supplier owner | Contract/subprocessor/location/SLO/security change | [§17.5](#175-third-party-supplier-and-subprocessor-governance) |
| Open-source licence obligations are not met | Release block or legal exposure | Pre-production licence review, notices/source obligations and replaceable adapters | Legal and platform owners | Component/version/licence or distribution/deployment change | [§17.5](#175-third-party-supplier-and-subprocessor-governance) |
| Accessibility or supported-device failures exclude operational users | Failed task completion and adoption | WCAG-oriented components, representative research and browser/device testing | Product design owner | New core journey/component/locale or audit failure | [§11](#11-frontend-and-ux-architecture) |
| Deferred capability is enabled through an ordinary flag | Unreviewed security, privacy or operational boundary | Explicit later-capability evidence gate and deny-by-default release admission | Product and security owners | OCR, public API, SSO, mobile, messaging or new dataset request | [§27](#27-mvp-capability-boundary) |

## 30. Production readiness evidence register

Architecture decisions are closed. The following gates require external facts,
named ownership, provisioned systems or test evidence before the listed capability
may operate. “Open” is expected during implementation and is not permission to use
a provisional assumption in production.

| Gate | Owner role | Evidence required | Environment applicability | Blocks | Status |
| --- | --- | --- | --- | --- | --- |
| E-001 | ULIP product owner | Written account/dataset steady rate, burst, concurrency, daily/monthly quota, failed/auth-call accounting, 429/retry, token, polling, cache/retention, price, environment and escalation terms; capacity calculation against freshness and onboarding demand. | Production | Any production ULIP schedule or customer freshness/SLA promise | Open |
| E-002 | ULIP product owner | Production approval and successful contract fixtures for VAHAN/04, SARATHI/02 and FASTAG/02; record bounded roles for every other enabled dataset. | Production | External pilot verification using those datasets | Open |
| E-003 | Compliance owner | Approved launch jurisdictions/operations and assertion-by-assertion applicability, evidence, assurance, validity, conflict, exception and expected-result matrix. | Production | Publishing the corresponding policy pack or coverage claim | Open |
| E-004 | Privacy owner | Indian-counsel approval of processing roles/bases, SARATHI purposes, notices/authorization, Data Principal journeys, retention and customer DPA terms. | Production | Production driver personal-data processing | Open |
| E-005 | Finance owner | Approved INR price book, seller/GST/tax/statutory-system authority, Razorpay production account and collection/reconciliation policy. | Production | Paid production subscription | Open |
| E-006 | Communications owner | Provisioned ZeptoMail India agents/domains; written quotas, webhook/retry, residency, retention, DPA, subprocessor, incident and support terms; DNS/signature/bounce/complaint/outage tests. | Production | Production transactional email | Open |
| E-007 | Infrastructure owner | Provisioned active India Dokploy host and separately administered India recovery VPS; isolated Compose projects; qualified Garage/libsodium/secrets provider; production/recovery keys; exact object/audit copies; approved retention and restore/deletion evidence. | Production/recovery | Storage of production tenant data | Open |
| E-008 | ULIP/infrastructure owners | ULIP approval and live connectivity proof for the fixed active-production egress identity; the non-serving recovery VPS has no ULIP credential or traffic requirement. | Production | Production ULIP traffic | Open |
| E-009 | Product design owner | Version 2 task research and usability evidence for owners, administrators, fleet managers, compliance reviewers and viewers across onboarding and daily operations. | Staging/production | Final workflow/screen approval | Open |
| E-010 | Engineering leadership | Named product, security, operations, privacy, compliance, finance, supplier, data and implementation owners with deputies and escalation authority. | All environments | External pilot operations | Open |
| E-011 | Reliability owner | Provisioned primary telemetry plus recovery-VPS Gatus/ntfy/status/dead-man checks; component/capacity/retention evidence; staffed 24x7 critical on-call and incident exercise. | Production/recovery | General availability and any stronger availability commitment | Open |
| E-012 | Security owner | Approved SSDF/ASVS scope, remediation clocks, repository/environment protections, continuous scanning/signing/provenance, independent penetration test and retest, monitored disclosure channel. | CI/staging release/production | External pilot | Open |
| E-013 | Product design/frontend owners | Approved browser/device/network matrix, WCAG evidence, responsive core journeys and route bundle/Core Web Vitals budgets. | Staging release/production | External pilot UI acceptance | Open |
| E-014 | API product/security owners | Approved source redistribution rights, machine-identity threat model, OAuth lifecycle, OpenAPI contract, sandbox, quotas, webhook egress and deprecation/support process. | Deferred | Public customer API or outbound webhooks | Deferred |
| E-015 | Database owner | First-year row/byte/WAL/connection forecast; qualified PostgreSQL 18 container, Drizzle/driver/Graphile/pgBackRest versions; locale/checksum/extensions/roles/authentication evidence; twice-volume and upgrade/recovery rehearsal. | Staging release/production | Production data plane | Open |
| E-016 | Edge/security owners | Hosting-provider L3/L4 terms, independent status DNS, qualified Dokploy/Traefik ACME/routing/limits, optional CrowdSec observation evidence, DNSSEC/token custody, safe logs and measured 300-second-TTL recovery cutover. | Staging release/production | Public production traffic | Open |
| E-017 | File-security owner | Separately networked and credentialed `platform-security` scanner project; qualified scanner/parser components and licences; gVisor/no-egress containment, signature freshness, key isolation, preview/original controls, retrospective quarantine, twice-forecast capacity and documented same-host residual risk. | Local full/staging release/production | Production uploads/imports | Open |
| E-018 | Recovery owner | Independent-provider India recovery VPS with encrypted ZFS, qualified pgBackRest/OpenZFS, WAL/object/audit receipts, deletion replay, offline media and random-time one-hour-RPO/four-hour-RTO restore. | Staging release/production/recovery | Production tenant data | Open |
| E-019 | Infrastructure/security owners | Qualified Ubuntu/kernel/Ansible/OpenTofu for active and recovery hosts; named FIDO2 administrators; clean rebuild/drift, AppArmor, WireGuard, nftables/Docker, container-negative, update/reboot and auditd evidence. | Staging release/production/recovery | Production/recovery hosts | Open |
| E-020 | Trust owner | Qualified Dokploy/Traefik ACME renewal and separate certificates; private-network/service credentials; mutually authenticated active-to-recovery paths; credential denial/rotation/recovery evidence. A private CA remains deferred until multi-host runtime separation. | Staging release/production/recovery | Public TLS and cross-host production trust | Open |
| E-021 | Platform owner | Qualified Valkey/GLIDE containers; separate coordination/cache ACL/key/script/resource contracts; no persistence/backup/restricted data; destroy/rebuild, fallback and conservative quota-ledger resume evidence. | Local full/staging core/production | Distributed ULIP admission and tenant cache acceleration | Open |
| E-022 | Infrastructure/recovery owners | Complete active/recovery volume/path inventory; qualified production LUKS2 and recovery encrypted-ZFS profiles; unique custody, mount-gated failure, header/keyslot rotation and restore evidence; reduced staging-release exercises. | Staging release/production/recovery | Production data or secrets on durable volumes | Open |
| E-023A | Release/security owners | Explicit local/CI environment identity, generated secrets, synthetic fixtures, emulator isolation and no production-network access. | Local/CI | Production eligibility of the local/CI isolation contract; never coding or local routes | Open |
| E-023B | Release/security owners | One-VPS staging core with isolated database/buckets/keys, synthetic data, emulator/test credential classes and same-digest deployment. | Staging core | Production eligibility of staging-core evidence; never staging-core deployment | Open |
| E-023C | Release/security owners | On-demand staging release profile proving scanner, ingress, DAST, telemetry, migration/rollback and backup/restore controls with synthetic data. | Staging release | Production release-candidate evidence | Open |
| E-023D | Release/security owners | Production identity rejects mocks/test keys/debug/insecure settings; same approved digest is promoted and recovery exercises are quarantined/destroyed. | Production/recovery | Production promotion | Open |
| E-024 | Release owner | Approved signed manifest and independent Compose projects; application-only deployment, candidate routes, health/drain/schema compatibility, expand migration, fault injection and schema-forward digest rollback evidence. | Staging release/production | Production release | Open |
| E-025 | Toolchain owner | Archived generator inputs/output hash; exact dependency/toolchain/image and environment-profile qualification; local core/full fixtures; weekly rebuild and risk-based staging-release gates. | Local/CI/staging/production | Production admission of generated baseline and release images; never ordinary implementation | Open |
| E-026 | Compliance/platform owners | Approved legal-date/instant/schedule types and zones; Temporal/runtime/tzdata/chrony contracts; boundary, skew, missed-run, catch-up and historical-reproduction evidence. | All environments | Time-dependent compliance and notifications | Open |
| E-027 | Backend/security owners | Approved route/media/error/limit/deadline/cancellation/proxy/trace/client-compatibility catalogue; fuzz, slow-client, parser, disconnect and consecutive-release tests. | All environments | External pilot API traffic | Open |
| E-028 | Data-integrity owner | Approved identifier types, repertoires, canonicalizers, provider binding and entity-resolution authority; collision/confusable/recycled/cross-tenant/rotation and dual-index migration evidence. | All environments | Subject activation and provider lookup | Open |
| E-029 | Compliance owner | Design-partner states, operations, routes, permits, cargo, vehicle classes and authority model; source-level field/credential semantics and complete supported/unsupported decision tables. | Staging/production | Pilot policy publication | Open |
| E-030 | Commercial/product owners | Approved minimized application, authority verification, GST behavior, review/escalation, rejection retention, organization/access/suspension/legal-entity/offboarding states and idempotent provisioning evidence. | Staging/production | Public signup and tenant activation | Open |
| E-031 | Data-integrity owner | Record-class correction matrix, effective/record time, reasons, approvals, compensation, privacy/finance behavior and reconciliation targets; concurrent/failure tests across representative record classes. | All environments | Production correction/undo/delete controls | Open |
| E-032 | Reference-data steward | Complete pilot provider/dataset/schema field/value inventory; concepts, mappings, materiality and reviewers; unknown/ambiguous/collision tests and one full mapping impact/shadow/activation/restatement/rollback exercise. | All environments | Mapped values controlling eligibility | Open |
| E-033 | Data-quality owner | Approved purpose/population, dimension/materiality/threshold/owner/effect rules; missing/invalid/duplicate/conflict/stale/schema-drift fixtures and full projection/release/restore reconciliation. | All environments | Production quality dashboards and quality-based gates | Open |
| E-034 | Fleet-domain owner | Approved management, ownership/custody, regulatory, availability and compliance state/reason/authority catalogue; disposal, closure-watch, reactivation, rehire, archive and representative bulk/failure exercises. | All environments | Production lifecycle actions | Open |
| E-035 | Security/product owners | Complete sensitive-action Tier 0–3 inventory, proposal schemas, functions/scopes/quorum/conflicts/delegation/expiry/step-up/execution; shared bypass and concurrency/replay suite. | All environments | Any sensitive action lacking the shared approval path | Open |
| E-036 | Platform owner | Configuration authority inventory, typed units/bounds/scopes, capability intersection, tenant-editable subset, rollout/rollback/removal and kill switches; cache/loss/convergence/emergency-control tests. | All environments | Production-editable configuration and rollouts | Open |
| E-037 | Identity owner | Approved global user/email/authenticator/session/invitation/membership states, normalization/change, MFA/revocation, Better Auth linking controls, recovery, deletion/tombstone/restore and cross-organization tests. | All environments | Identity self-service and tenant invitations | Open |
| E-038 | Legal/product owners | Counsel-approved legal document/audience/language/execution/authority/materiality/reacceptance/retention matrix; immutable presentation, acceptance, evidence export, stale-offer and post-deadline tests. | Staging/production | Public signup and organization/legal acceptance | Open |
| E-039 | Legal/privacy/security owners | Approved hold authority/basis, typed scope, provisional/ordinary approval, review/release and privacy rules; exact binding, isolation, partition, backup, custody, race, restore and export tests. | Staging release/production | Production legal holds | Open |
| E-040 | Privacy owner | Counsel/customer-approved request and fiduciary/processor matrix, public/authenticated/assisted intake, proportional verification, targets, disclosures and response language; end-to-end rights/processor/restore tests. | Staging/production | Production driver personal data | Open |
| E-041 | Localization/legal owners | Counsel-approved consent-language interpretation and publications; translators/reviewers/glossary/support; locale/runtime/font qualification and complete legal/UI accessibility/rendering tests. | Staging/production | Localized consent and any non-English product locale | Open |
| E-042 | Finance owner | Approved seller/GST/bank, tax/SAC/rounding, invoice/note sequence, retention, e-invoice applicability, pricing/proration/refund/offline/withholding and approval tiers; immutable artifacts and full reconciliation. | Staging/production | Paid production billing | Open |
| E-043 | Supplier owner | Approved legal-role/C0–C3 catalogue and complete dependency register with data flow, location, contract/DPA, security, quota/SLO, incident, retention, concentration and exit evidence; exercised C3 exits. | Staging release/production | Production admission of each C2/C3 dependency | Open |
| E-044 | Support owner | Approved support categories, binding/visibility/participants, priority/service clocks, staffing/escalation, independent contacts and retention; public/authenticated/privacy/security/billing/attachment/access tests. | Staging/production | Advertised external pilot support | Open |
| E-045 | Product/privacy owners | Approved product questions, event/metric schemas, purpose/basis, producers/consumers, prohibited fields, retention/deletion and cohort rules; lineage/RLS/suppression/browser-absence tests. | Staging/production | Production product measurement | Open |
| E-046 | AI/security/privacy owners | Approved AI-use profile, extraction cells, lawful datasets, model/licence/SBOM, precision/abstention thresholds, reviewer process, isolated host, drift/incident/rollback/decommission and complete negative/e2e tests. | Deferred | OCR/document extraction | Deferred |
| E-047 | Privacy/infrastructure owners | Counsel-approved INDIA_CORE interpretation/claim; complete store/process/support/recipient-country inventory; supplier location/localization evidence; egress/foreign-access/quarterly reconciliation and deletion/restore tests. | Production/recovery | Production data and any residency claim | Open |
| E-048 | Security/product owners | Approved journey/threat and minimized-signal catalogues, limit dimensions/thresholds, action/human-authority, communication, appeal and reconciliation; credential/application/ULIP/file/export/payment abuse tests without tracking/CAPTCHA SDK. | All environments/production public paths | Public application, production login and expensive/sensitive journeys | Open |
| E-049 | Legal/data-governance owners | Counsel-approved rights classes and customer/DPA terms; exact dataset display/cache/derivative/export/redistribution/attribution/territory/termination rights; permitted-use, normalization, exit and restore tests. | Production | Customer or ULIP production data | Open |
| E-050 | Legal/product/compliance owners | Approved controlled/prohibited claims, responsibility matrix, report/disclosures, sales/demo/testimonial process and incident remedy; publication binding, static/runtime rejection and correction/restatement exercise. | Staging/production | External marketing and production compliance outputs | Open |
| E-051 | Implementation lead | Approved engagement roles, scope/configuration, cohort selection, wave/capacity rules, activation denominators, training, Tier-2 readiness, hypercare and handover; execute empty-tenant-to-handover rehearsal with injected failures and no customer-specific infrastructure. | Staging/production | First design-partner launch | Open |

### 30.1 Gate operation

- The named owner attaches immutable evidence references, effective versions,
  reviewer identity and expiry/review date; the table status changes through
  `Open -> In review -> Satisfied -> Expired/Revoked`.
- `Satisfied` requires all named evidence and Section 25 scenarios. A partial
  result remains `Open` with exact exclusions; narrative confidence is not status.
- A changed contract, supplier, dataset, policy, runtime, topology, key authority or
  customer scope invalidates affected gates automatically.
- Release admission computes the intersection of applicable satisfied gates,
  entitlements, configuration, authorization and emergency controls. No feature
  flag can bypass an unsatisfied gate.
- A gate applies only to the environment and production capability named in its
  row. An open production gate cannot block local implementation, unrelated routes
  or staging core; an open staging-release gate blocks only the affected production
  release evidence.
- Documentation validation fails if any D-001–D-070 decision lacks exactly one
  environment classification or if an evidence row lacks environment and blocked-
  capability scope.
- Deferred gates are excluded from MVP release admission and remain deny-by-default.
