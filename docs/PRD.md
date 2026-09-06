# Thaarei Fleet Compliance SaaS — Product Requirements

**Status:** Authoritative Version 2 product requirements
**Last reviewed:** 5 September 2026
**Product owner:** Thaarei Ventures LLP

This document defines required product outcomes and scope. The
[Product and Technical Plan](V2_PRODUCT_AND_TECHNICAL_PLAN.md) is authoritative for
architecture, data contracts, security controls, implementation behavior, delivery
gates and operational evidence. Where wording appears inconsistent, stop and obtain
product-owner review; implementation must not silently weaken either document.

## 1. Product purpose and success

- **PRD-OUT-001:** Thaarei shall operate one multi-tenant SaaS product through which
  Indian transportation organizations manage vehicle, trailer, driver, document
  and compliance work.
- **PRD-OUT-002:** The product shall show what evidence was observed, what requirement
  was assessed, its freshness and uncertainty, and the next required action.
- **PRD-OUT-003:** The product shall support organizations with multiple operational
  fleets and locations without making either concept a tenant boundary.
- **PRD-OUT-004:** The first design partner shall be able to onboard and manage at
  least 500 representative assets plus related drivers through controlled bulk and
  manual workflows.
- **PRD-OUT-005:** Product outputs shall support operational decisions and evidence
  management without claiming statutory certification, universal lawfulness or
  government endorsement.
- **PRD-OUT-006:** Success shall be measured using organization activation,
  onboarding completion, verification freshness, issue resolution, critical-alert
  delivery, task success, accessibility, reliability and support outcomes—not an
  opaque customer, driver, fleet or compliance score.

## 2. Actors and authority

- **PRD-ACT-001:** A prospective customer may submit an application but receives no
  tenant or provider authority until business, product/privacy/ULIP and commercial
  activation gates pass.
- **PRD-ACT-002:** Organization owners control ownership and highest tenant authority;
  administrators configure users and operations; compliance reviewers manage
  evidence and findings; fleet managers manage scoped operations; billing users
  manage commercial records; viewers have scoped read-only access.
- **PRD-ACT-003:** Effective permissions shall be evaluated from membership, role,
  scope, resource relationship, field sensitivity and authentication assurance.
- **PRD-ACT-004:** Thaarei operators shall use separately authorized platform roles.
  Support shall never gain tenant access through impersonation or hidden membership.
- **PRD-ACT-005:** Every human action shall be attributable to one person. Shared
  interactive accounts are prohibited.
- **PRD-ACT-006:** Sensitive actions shall require current step-up authentication
  and, where specified, independent maker/checker approval.
- **PRD-ACT-007:** Login identity, verified email, authenticators, sessions,
  invitations, organization memberships, role assignments and driver profiles shall
  have separate lifecycles. Ending or restricting one shall produce only its
  explicitly defined access effects and shall not merge identities across tenants.
- **PRD-ACT-008:** Owner recovery, membership changes and exceptional Thaarei access
  shall use current authority, bounded scope, expiry, notification and immutable
  evidence; a support case or billing relationship alone shall grant no tenant access.

## 3. SaaS tenancy and organization model

- **PRD-TEN-001:** Organization is the tenant and data-isolation boundary and
  represents one operating/legal entity.
- **PRD-TEN-002:** Customer Account, Billing Account, Contract and Subscription are
  separate commercial concepts. Linking them shall not share tenant data or access.
- **PRD-TEN-003:** A user may belong to multiple organizations, but every request,
  job, report, object and audit record shall execute in one explicit organization
  context.
- **PRD-TEN-004:** One organization may contain multiple flat fleets and locations.
  Assets have at most one effective primary fleet and home location; controlled tags
  and saved segments provide cross-cutting classification.
- **PRD-TEN-005:** Organization restriction, suspension, offboarding, archival and
  deletion shall be explicit, independently authorized lifecycles.
- **PRD-TEN-006:** Tenant isolation and authorization are non-negotiable correctness
  requirements and cannot be waived by availability, support or commercial policy.
- **PRD-TEN-007:** Customer application, organization provisioning, commercial
  activation, membership and ULIP dataset entitlement shall be independent governed
  lifecycles; success in one shall not imply authority in another.
- **PRD-TEN-008:** Tenant settings may configure only an approved bounded subset of
  product behavior and shall never weaken tenant isolation, authorization, required
  compliance controls, retention, audit or provider restrictions.

## 4. Fleet, vehicle and driver management

- **PRD-FLT-001:** Organizations shall create, import, view, update, activate,
  offboard, archive and, where authorized, reactivate powered vehicles, trailers and
  semi-trailers while retaining history.
- **PRD-FLT-002:** Vehicle records shall support registration and vehicle identity,
  class, ownership/custody, operational availability, fleet/location, permit/use and
  policy-relevant authoritative and customer-supplied facts.
- **PRD-FLT-003:** Drivers shall be organization-local profiles with effective-dated
  employment/contract engagements. The product shall not expose or infer whether a
  person exists in another organization.
- **PRD-FLT-004:** Driver identity/contact, licence, transport classes,
  endorsements, engagement, availability, base and emergency data shall be
  collected only where required and authorized.
- **PRD-FLT-005:** Driver fleet eligibility, administrative custodianship,
  operational duty assignments and vehicle combinations shall be distinct,
  effective-dated relationships.
- **PRD-FLT-006:** Duty and combination changes shall prevent invalid overlap and
  evaluate the relevant driver, vehicle, trailer and operation requirements.
- **PRD-FLT-007:** Management, ownership/custody, regulatory status, operational
  availability and compliance shall remain separate lifecycle dimensions.
- **PRD-FLT-008:** Sale, transfer, NOC, lease return, theft, total loss, scrapping,
  deregistration and reacquisition shall retain their distinct evidence and effects.

## 5. Documents, evidence and verification

- **PRD-DOC-001:** The product shall manage vehicle and driver credential metadata,
  issuers, identifiers, issue/validity periods, status, subjects and renewal history.
- **PRD-DOC-002:** Credentials, uploaded evidence, provider observations, facts and
  verification results shall be separate records with their own provenance and
  lifecycle.
- **PRD-DOC-003:** PDF/image evidence and import files shall pass bounded,
  fail-closed quarantine and scanning before accepted processing.
- **PRD-DOC-004:** Accepted evidence shall be encrypted, immutable by generation,
  private, checksummed and disclosed only through short-lived exact-object grants.
- **PRD-DOC-005:** Evidence replacement, correction, quarantine, retention, legal
  hold and deletion shall preserve required history and verifiable store receipts.
- **PRD-DOC-006:** The credential catalogue shall support central, jurisdictional,
  operation-specific, conditional and customer-added requirements. A customer-added
  item shall not be represented as a statutory requirement without governed policy
  authority.
- **PRD-DOC-007:** The vehicle catalogue shall support, where applicable, RC,
  statutory insurance, fitness, PUC, road tax, goods/passenger permit,
  national/interstate authorization, vehicle classification and relevant NOC,
  blacklist, non-use, surrender and trailer evidence. Specialized, hazardous-goods,
  device, equipment, ownership and state-specific evidence shall be conditional on
  a reviewed coverage cell.
- **PRD-DOC-008:** The driver catalogue shall support driving-licence identity and
  status, transport/non-transport validity, authorized vehicle classes and, where
  applicable, hazardous-goods or hill endorsement, badge, medical fitness,
  induction, safety training and purpose-approved background evidence. Aadhaar,
  PAN, biometrics and police verification shall not be universal defaults.
- **PRD-DOC-009:** FASTag shall remain a toll instrument, toll records activity
  observations, eChallans enforcement/liability records, NOC a transfer or
  jurisdictional-process record, and hypothecation an ownership/finance fact unless
  a reviewed policy gives a narrower item explicit compliance relevance.
- **PRD-VER-001:** The product shall integrate approved VAHAN, SARATHI, FASTag,
  eChallan and bounded toll reference datasets through an asynchronous provider
  boundary.
- **PRD-VER-002:** Every provider request shall have an entitled organization,
  managed/onboarding subject, permitted purpose, authorized fields and quota.
- **PRD-VER-003:** Provider results shall be independently bound to the requested
  subject, schema-validated, normalized through versioned mappings and stored with
  exact provenance.
- **PRD-VER-004:** Missing, partial, masked, stale, unavailable, malformed,
  conflicting and wrong-subject responses shall remain explicit and shall never be
  converted into fabricated values or automatic compliance failure.
- **PRD-VER-005:** Verification freshness, legal validity and last provider attempt
  shall be displayed separately.
- **PRD-VER-006:** Pilot verification shall target VAHAN/04, SARATHI/02 and
  FASTAG/02 and support the approved eChallan and bounded toll roles, including only
  the controlled VAHAN/01, SARATHI/01 and FASTAG/01 fallbacks defined in the Product
  and Technical Plan. An unavailable entitlement shall remain visibly unavailable
  and shall not be simulated as authoritative data.
- **PRD-VER-007:** Refresh and onboarding demand shall respect written global,
  dataset, organization and subject limits. Throttling, retries, caching and provider
  outages shall preserve the last valid observation and expose pending, stale,
  unavailable or indeterminate state without multiplying external effects.

## 6. Compliance, findings and workflow

- **PRD-CMP-001:** Policy applicability shall consider jurisdiction, vehicle and
  driver class, ownership, use, route, permit, cargo and operation context.
- **PRD-CMP-002:** Only reviewed coverage cells may be marketed or evaluated as
  supported. Unsupported or materially incomplete scope shall be explicit.
- **PRD-CMP-003:** Requirement assessments shall produce clear,
  attention-required, known-failure or indeterminate posture. Contextual operational
  decisions shall separately produce allowed, allowed-with-exception, blocked or
  not-determined.
- **PRD-CMP-004:** Underlying facts and requirement assessments shall not be
  overridden. A controlled exception may affect only its bounded contextual
  decision and must be time-limited, approved and audited.
- **PRD-CMP-005:** The product shall create deduplicated findings, cases and tasks
  for expiry, staleness, conflicts, missing evidence and renewal work, with ownership,
  priority, due dates, escalation and resolution history.
- **PRD-CMP-006:** Corrections shall append, supersede, restate and reconcile
  according to record class. Immutable observations, evidence, audit and historical
  evaluations shall not be edited in place.
- **PRD-CMP-007:** Data-quality findings shall record completeness, uniqueness,
  consistency, timeliness, validity and accuracy separately from compliance results.
- **PRD-CMP-008:** Every material status or claim shall expose its subject, scope,
  evidence method/assurance, coverage, policy/reference versions, as-of time,
  freshness, unknowns, exclusions and active exceptions.
- **PRD-CMP-009:** Central, jurisdictional, operation-specific and tenant-extension
  policies shall be immutable, effective-dated, reviewed and reproducible. A new
  policy version shall not silently rewrite an issued historical result.
- **PRD-CMP-010:** Findings, cases, tasks, notifications, acknowledgements and
  exceptions shall remain separate. Acknowledging a warning shall not resolve work,
  alter facts or change compliance posture.
- **PRD-CMP-011:** Policy-significant source values shall retain their raw provenance
  and map through reviewed, versioned concepts. Unknown or ambiguous values shall not
  be broadened into a more favorable requirement result.

## 7. Onboarding and implementation

- **PRD-ONB-001:** Users shall create records manually or through a versioned,
  macro-free XLSX workbook and entity-specific UTF-8 CSV contracts.
- **PRD-ONB-002:** Imports shall quarantine, parse into tenant-scoped staging,
  validate without side effects, show blocking errors/warnings/conflicts and freeze
  an immutable preview before approval.
- **PRD-ONB-003:** Commit sets shall be bounded, atomic and idempotent. Imported
  subjects remain drafts until separately authorized and capacity-checked activation.
- **PRD-ONB-004:** Import shall not delete records, silently merge duplicates,
  overwrite immutable/provider facts or call ULIP during preview/commit.
- **PRD-ONB-005:** Every new organization shall have a governed implementation
  engagement with named customer/Thaarei owners and immutable scope/configuration.
- **PRD-ONB-006:** The first production activation shall use a deliberately
  representative 10–25-vehicle cohort plus related drivers. Later waves shall be
  sized from current ULIP, worker and reviewer capacity.
- **PRD-ONB-007:** Go-live shall require a current approved readiness baseline with
  exact activated/evaluated/pending/stale/failed/excluded populations.
- **PRD-ONB-008:** Launch shall be followed by ten business days of hypercare,
  including daily reconciliation for the first three business days, and recorded
  service handover.
- **PRD-ONB-009:** Registration, licence and other external identifiers shall be
  typed and normalized under versioned rules. Duplicate and identity conflicts shall
  use non-destructive review and shall never expose another organization's record.

## 8. Search, reporting, notifications and support

- **PRD-OPS-001:** Users shall search and filter authorized records by operational,
  lifecycle, compliance, assignment and expiry dimensions with stable pagination
  and saved views.
- **PRD-OPS-002:** Sensitive identifiers shall support authorized audited exact
  search only; partial or cross-organization matching is prohibited.
- **PRD-OPS-003:** The product shall provide current operational and reproducible
  historical compliance, verification, challan, usage and audit reports.
- **PRD-OPS-004:** Exports shall use immutable population/entity versions,
  generation- and download-time authorization, formula-safe formats, checksum
  manifests and short private retention.
- **PRD-OPS-005:** In-app and transactional-email notifications shall support
  expiry thresholds, digests, escalation, preferences, deduplication and delivery
  status without embedding restricted detail.
- **PRD-OPS-006:** Customer support shall offer authenticated organization cases,
  private account-access intake and an independently reachable outage route while
  keeping incidents, privacy, billing, correction and privileged-access workflows
  distinct.
- **PRD-OPS-007:** Product measurement shall be first-party, purpose-bound and
  predominantly derived from server outcomes. MVP shall not use session replay,
  heatmaps, behavioral surveillance, advertising identifiers or personal driver and
  employee productivity scoring.
- **PRD-OPS-008:** The default expiry workflow shall begin at 60 days, create an
  owned case at 30 days, issue immediate/escalating alerts at 14, 7, 3 and 1 days,
  and re-evaluate at expiry. Each threshold shall fire once per governed episode;
  customer settings may notify earlier but shall not suppress mandatory critical
  stages or remove the last required recipient.

## 9. Subscription and billing

- **PRD-BIL-001:** Plans shall combine a product package, committed managed-asset
  capacity and optional add-ons. Each independently registered powered vehicle or
  trailer counts when activated.
- **PRD-BIL-002:** Trial, active, grace, restricted, cancelled and offboarding
  commercial states shall not overwrite organization, subject or compliance state.
- **PRD-BIL-003:** Thaarei's ledger is the entitlement and receivable authority;
  payment-provider callbacks are reconciled evidence, not direct access commands.
- **PRD-BIL-004:** MVP billing shall support INR/GST-exclusive pricing, Razorpay
  collection and approved offline enterprise collection.
- **PRD-BIL-005:** Quotes, recipient/tax snapshots, statutory documents, credit/debit
  notes, refunds, payments, withholding and financial close shall be immutable or
  corrected through governed accounting instruments.
- **PRD-BIL-006:** Monthly and annual plans shall support explicit trial and
  design-partner terms. Initial managed-asset capacity points are 25, 50, 100, 250
  and 500; larger commitments require an enterprise agreement. Drivers, users,
  fleets, locations and tags are not separately billable in MVP.
- **PRD-BIL-007:** Draft and activation-pending assets shall not consume capacity or
  receive scheduled monitoring. Managed and offboarding-pending assets consume
  capacity until their governed effective end; operational unavailability or
  compliance failure shall not silently remove them from billing.
- **PRD-BIL-008:** Capacity exhaustion shall block new asset activation without
  blocking draft onboarding or existing authorized reads. Upgrades require captured
  payment or approved credit; downgrades take effect at renewal only after managed
  usage fits, and the product shall never select assets to offboard automatically.
- **PRD-BIL-009:** One billing account or subscription may fund several isolated
  organizations through explicit capacity allocations. Billing access may expose
  allocation and aggregate consumption but shall not grant organization-domain data
  access.
- **PRD-BIL-010:** Initial product-package families shall be Core Compliance,
  Operations and Enterprise. Package names shall resolve to versioned entitlements
  so a commercial rename or plan revision cannot silently change historical access.

## 10. Security, privacy and data governance

- **PRD-SEC-001:** Authentication shall support verified email/password, passkeys
  and authenticator-app TOTP, with permission-based MFA, bounded sessions, step-up
  and non-email-only privileged recovery.
- **PRD-SEC-002:** Secrets and provider credentials shall be environment-only,
  non-editable by tenants and absent from logs, responses, source and build output.
- **PRD-SEC-003:** Data shall be classified as public, internal,
  tenant-confidential, restricted or secret/authentication; restricted fields shall
  use authenticated application-side envelope encryption.
- **PRD-SEC-004:** Security engineering shall follow the approved NIST SSDF and
  OWASP ASVS baseline, signed provenance/SBOM, continuous scanning, threat models
  and independent penetration testing.
- **PRD-SEC-005:** Core tenant, personal, compliance, key, log, support, backup and
  recovery data shall use the INDIA_CORE residency profile and registered bounded
  destinations.
- **PRD-SEC-006:** Every external service and production-affecting dependency shall
  have a recorded legal/data role, criticality, permitted data flow, security and
  location evidence, operating limits, incident duties, monitoring and tested exit
  path proportionate to its risk.
- **PRD-SEC-007:** Abuse controls shall use minimized, journey-specific first-party
  signals and reversible bounded actions. Automated controls shall not fabricate or
  alter domain facts, make legal or employment conclusions, permanently terminate a
  customer, or block privacy, security-reporting and account-recovery routes.
- **PRD-SEC-008:** Production data, credentials and keys shall not enter local,
  development, CI, preview or ordinary staging environments. Synthetic fixtures and
  provider emulators are the default outside production.
- **PRD-PRV-001:** Personal-data processing shall be purpose-specific, minimized,
  notice/authority bound, field-authorized, retained only as permitted and capable
  of rights-request and processor reconciliation.
- **PRD-PRV-002:** Non-user drivers shall have accessible notice, withdrawal,
  access, correction, erasure, grievance and nomination channels with proportional
  identity/representative verification.
- **PRD-PRV-003:** Data use and export shall respect customer rights, Data Principal
  rights, source/provider agreement, permitted purpose, recipient, attribution,
  residency and retention. Government provenance does not imply open-data rights.
- **PRD-PRV-004:** Purpose cessation and organization termination shall stop new
  collection/use, provide the approved export window, and execute verified deletion
  without resurrection from backups.
- **PRD-PRV-005:** Legal holds shall preserve only exact authorized scope, grant no
  access and expire or release through reviewed evidence.
- **PRD-PRV-006:** Legal publications, presentation, contract acceptance, privacy
  notice, consent and sensitive transaction authorization shall retain separate
  immutable evidence. Material changes shall require the authorized actor's explicit
  reacceptance where the approved legal policy requires it.
- **PRD-PRV-007:** Withdrawal, non-acceptance, contract termination, organization
  offboarding and deletion shall remain independent events. Restore or publication
  changes shall not revive expired authority or withdrawn consent.

### 10.1 Audit and accountability

- **PRD-AUD-001:** Material authentication, authorization, tenant administration,
  domain change, approval, provider access, evidence access, export, billing,
  privacy, configuration and support events shall produce attributable append-only
  audit evidence with safe before/after or reason references.
- **PRD-AUD-002:** Tenant-visible application audit and restricted platform-security
  evidence shall remain separate. Neither stream shall disclose another tenant or
  place secrets, tokens, raw provider bodies or unnecessary personal data in logs.
- **PRD-AUD-003:** A committed command shall not exist without its required audit,
  idempotency and downstream-work evidence. Retry, timeout, concurrency and worker
  failure shall not duplicate a logical action or erase its accountability trail.
- **PRD-AUD-004:** Authorized audit search and export shall preserve organization,
  actor, action, subject, outcome, reason, time and integrity provenance while
  enforcing field masking, retention, legal hold and download-time authorization.

### 10.2 Environment and deployment requirements

- **PRD-ENV-001:** Runtime environment shall be an explicit validated value and
  shall not be inferred from a hostname, domain or deployment name. Only the
  allowlisted environment/profile/capability combinations in the Product and
  Technical Plan may start.
- **PRD-ENV-002:** Tenant isolation, authorization, compliance correctness,
  mandatory audit atomicity, encryption-envelope formats, committed-data integrity,
  retention/deletion semantics and truthful degraded modes shall use the same
  implementation and remain enforced in local, CI, preview, staging, production
  and recovery exercises.
- **PRD-ENV-003:** Local, CI, preview and ordinary staging shall use synthetic data,
  generated non-production keys and deterministic provider emulators by default.
  Production data, backups, credentials, certificates and keys shall not enter
  those environments.
- **PRD-ENV-004:** An unavailable optional non-production dependency shall disable
  only its dependent route/job with an explicit capability-unavailable state; it
  shall not prevent unrelated development or make a simulated result appear real.
- **PRD-ENV-005:** Production shall reject mock, sandbox or test provider classes,
  generated/default keys, debug/reload operation, insecure cookies/CORS, non-
  production origins, and mismatched database/storage/environment identities.
- **PRD-ENV-006:** A production evidence gate shall block only the named production
  capability or promotion. It shall not block local implementation, unrelated
  product routes or deployment of the staging core profile.
- **PRD-ENV-007:** Staging shall run on one isolated Dokploy VPS with an always-on
  core profile and an on-demand release profile. The release profile shall exercise
  scanning, security, DAST, telemetry, migration/rollback and recovery controls
  only when needed for release evidence.
- **PRD-ENV-008:** Initial production shall use one active India-hosted Dokploy VPS
  plus one independently administered India-hosted recovery/monitoring VPS in a
  different provider account and preferably a different city. Application, data,
  security and observability services shall remain independently deployable Docker
  Compose projects; an application release shall not restart stateful data or
  backup services.
- **PRD-ENV-009:** The initial production profile shall make no automatic host-HA,
  three-zone storage or zero-downtime claim. General availability requires measured
  one-hour RPO/four-hour RTO recovery and disclosure of maintenance/manual-recovery
  limitations.
- **PRD-ENV-010:** Runtime infrastructure may use unmanaged VPS and attached storage
  in India. AWS, Azure and GCP managed runtimes, managed databases/queues/object
  stores, serverless services, managed Kubernetes and Cloudflare R2 shall not store
  or process Version 2 application or backup data because R2's documented APAC
  placement is best-effort and does not guarantee India jurisdiction; see
  [Cloudflare's data-location documentation](https://developers.cloudflare.com/r2/reference/data-location/).
  Kubernetes is outside the MVP;
  measured growth may use larger VPSs, Dokploy remote servers or Docker Swarm.
- **PRD-ENV-011:** Initial infrastructure shall target INR 15,000–40,000 per month,
  excluding staff, payment/email transaction charges and exceptional growth
  storage. Capacity, recovery and security evidence take precedence over the target,
  and any expected overrun requires an approved topology/cost review.

## 11. Reliability, performance and accessibility

- **PRD-NFR-001:** The launch service objective is 99.5% customer-journey
  availability over a rolling 30-day window. ULIP health/freshness is reported
  separately.
- **PRD-NFR-002:** Tenant isolation, authorization, compliance correctness, audit
  completeness, committed-data integrity and deletion non-resurrection are
  non-budgetable invariants.
- **PRD-NFR-003:** Critical incidents require staffed 24x7 response, primary
  telemetry plus recovery-VPS monitoring/paging/status, customer communication and
  post-incident review.
- **PRD-NFR-004:** Recovery shall target a one-hour RPO and four-hour RTO using
  independently administered, encrypted and routinely tested recovery copies.
- **PRD-NFR-005:** The platform shall support approximately 100 organizations,
  50,000 managed assets and 100,000 drivers, and pass twice-first-year retained-volume
  testing with at least 30% forecast-peak resource headroom.
- **PRD-NFR-006:** At p75 of the approved user/device/network profile, LCP shall be
  at most 2.5 seconds, INP at most 200 milliseconds and CLS at most 0.1.
- **PRD-NFR-007:** Core journeys shall satisfy WCAG 2.2 AA-oriented acceptance,
  supported browsers, keyboard/screen-reader use, reflow from 320 CSS pixels and
  accessible touch targets.
- **PRD-NFR-008:** Product data, commands and sensitive identifiers shall not be
  stored in browser persistence or sensitive URLs; connectivity failure shall not
  create false saved state.
- **PRD-NFR-009:** Concurrent, retried and reordered commands shall preserve domain
  invariants and provide one logical outcome. Partial failure shall remain visible
  and reconcilable rather than reporting uncommitted work as successful.
- **PRD-NFR-010:** Every degraded mode shall be bounded and truthful. Loss of ULIP,
  email, cache, worker, scanner or reporting capability shall not create false fresh,
  delivered, safe, verified or compliant state.
- **PRD-NFR-011:** Legal calendar dates, UTC instants and civil schedules shall be
  distinct, use an explicit authoritative time zone and remain reproducible across
  daylight, calendar, clock and time-zone-data changes.
- **PRD-NFR-012:** The authenticated operations product shall launch in `en-IN` with
  locale-safe data contracts. Legally significant notice and consent journeys shall
  use the exact approved, human-reviewed language publication required for the
  intended person; missing required content shall fail safely.

## 12. MVP and deferred capabilities

- **PRD-MVP-001:** The MVP boundary is the capability matrix in §27 of the Product
  and Technical Plan.
- **PRD-MVP-002:** OCR/extraction, native mobile, offline tenant data, Web Push,
  enterprise SSO/SCIM, SMS/WhatsApp, public customer APIs/webhooks, broader ULIP
  datasets, telematics and advanced cross-organization analytics are not MVP.
- **PRD-MVP-003:** A deferred capability remains deny-by-default until its explicit
  privacy, security, legal, supplier, reliability and operating evidence is approved.
- **PRD-MVP-004:** Production shall use the approved provider-neutral unmanaged-VPS
  Indian architecture and shall not consume AWS, Azure or GCP managed runtime,
  database, queue, object-storage, serverless or Kubernetes services. Cloudflare R2
  is excluded from application and backup storage.
- **PRD-MVP-005:** Dispatch, route planning, rostering, payroll, attendance,
  working-hours calculation, fuel accounting, maintenance ERP and freight-marketplace
  capabilities are not MVP.
- **PRD-MVP-006:** Universal or pan-India compliance coverage, passenger, hazardous
  or specialized-operation coverage, automatic legal interpretation, automatic
  exception approval, biometric verification, document-authenticity AI and automatic
  extracted-field acceptance are not MVP without their separately reviewed gates.
- **PRD-MVP-007:** In-application eChallan settlement, toll-route computation,
  FASTag balance/expiry claims and use of toll or FASTag observations as real-time
  tracking or automatic compliance evidence are not MVP.
- **PRD-MVP-008:** Tenant-defined roles, instant unreviewed tenant activation,
  unattended whole-fleet activation, unrestricted sensitive full-text search,
  embedded BI/data warehouse and in-product regulated e-signature issuance are not
  MVP.
- **PRD-MVP-009:** Multi-currency or multi-seller billing, automatic usage overages,
  adaptive pricing, card-data handling, automatic tax-policy decisions, general-ledger
  automation and GST-return filing are not MVP.
- **PRD-MVP-010:** External helpdesk processing, remote screen sharing, automated AI
  support decisions, generative compliance recommendations, customer-specific
  deployments/databases and production-data training copies are prohibited in MVP.
- **PRD-MVP-011:** A second complete product locale, Consent Manager integration and
  a new ULIP dataset remain deferred until their language, legal, privacy, security,
  entitlement, reliability and operating gates pass.

## 13. Release acceptance

- **PRD-ACC-001:** All applicable gates in §30 of the Product and Technical Plan
  must be satisfied and current before their named capability enters production;
  an open production gate does not block local implementation, unrelated routes or
  staging-core deployment.
- **PRD-ACC-002:** The authoritative scenarios in §25 and customer outcomes in §28
  must pass against the exact signed release candidate and schema/configuration set.
- **PRD-ACC-003:** Product, security, privacy, compliance, operations and commercial
  owners must approve external pilot and general-availability readiness.
- **PRD-ACC-004:** No acceptance, exception, feature flag or commercial urgency may
  waive a non-budgetable invariant or create unsupported compliance/provider claims.
- **PRD-ACC-005:** Customer acceptance shall cover organization/access isolation;
  fleet and driver lifecycle; bulk onboarding; ULIP verification; evidence and
  compliance workflow; search, reports and exports; billing; notifications; support;
  privacy rights; accessibility; performance; recovery and handover outcomes in §28
  of the Product and Technical Plan.
- **PRD-ACC-006:** The release candidate shall preview at least 500 representative
  assets plus associated drivers, activate and reconcile the representative 10–25
  vehicle pilot, and complete capacity-sized waves with exact denominators and no
  duplicate billing, provider or notification effects.
- **PRD-ACC-007:** Acceptance shall prove that every draft, pending, stale, failed,
  indeterminate, unsupported and excluded subject remains visible and is never
  omitted from denominators or presented as clear.
