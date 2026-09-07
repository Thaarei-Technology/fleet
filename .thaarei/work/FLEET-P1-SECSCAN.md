---
workId: FLEET-P1-SECSCAN
title: Fix PR #2 security scan license failure
origin: PR #2 Security validation scan job
status: complete
owner: Nishanth
createdAt: 2026-09-07
updatedAt: 2026-09-07
sourceOfTruthIds: []
affectedPaths:
  - .trivyignore
---

# Fix PR #2 security scan license failure

## Objective

Make `pnpm security:fs` (Trivy fs, HIGH/CRITICAL, vuln+license) pass on PR #2
branch `codex/fleet-p1` without changing runtime behavior.

## Analysis

- PR #2 checks: `validate` (Starter validation) passes, `scan` (Security
  validation) fails at `pnpm security:fs` with Trivy exit code 1.
- `thaarei-security fs` runs
  `trivy fs --scanners vuln,license --severity HIGH,CRITICAL --exit-code 1`
  (see `app-starter-kit/packages/tooling/src/security.ts` `buildSecurityInvocation`).
- Local reproduction with Trivy 0.74.0 (same digest as CI):
  - Vulnerabilities: 0.
  - Licenses: 1 HIGH — `@img/sharp-libvips-darwin-x64`, `LGPL-3.0-or-later`,
    classification `restricted`.
- Owner chain: `next@16.3.1` declares `sharp@0.35.4` as an optional dependency
  for `next/image` optimization; `sharp` pulls per-platform optional
  `@img/sharp-libvips-*` binaries. All are `optional: true` in
  `pnpm-lock.yaml`. Production Dockerfiles are Linux-only and never ship the
  `darwin-x64` binary, but Trivy scans every lockfile entry regardless of
  platform, so the darwin entry still fails the gate.
- `security:config` (misconfig, Dockerfiles) passes locally with 0 findings.

## Scope

- Add repo-root `.trivyignore` with a single license exception for
  `LGPL-3.0-or-later` plus a justification comment. Trivy auto-discovers
  `.trivyignore` in the scanned root (`/workspace` in the wrapper container);
  text-format license ignores are by license ID (per Trivy filtering docs).
- No runtime, dependency-version, Dockerfile, workflow, or Zod-schema change.
- No new source-of-truth block (config-only exception, no architectural owner).
- No new dependencies, no provider exception, no secrets in source.

## Non-goals

- No dependency upgrade/downgrade (sharp stays as Next's optional dep).
- No P2 product work, no commit/push without explicit owner approval.
- No pilot-readiness claim.

## Acceptance criteria

- [ ] `trivy fs --scanners vuln,license --severity HIGH,CRITICAL --exit-code 1`
  passes locally with `.trivyignore` present.
- [ ] `trivy fs --scanners misconfig --severity HIGH,CRITICAL` still passes.
- [ ] Applicable repo governance checks pass or failures are recorded.

## Plan

1. Add `.trivyignore` with `LGPL-3.0-or-later` + justification.
2. Re-run Trivy fs (vuln+license) and config (misconfig) locally.
3. Run `pnpm check:source-of-truth`, `check:boundaries`, `check:implementation`
   if private-registry auth permits; otherwise record the blocker.
4. Leave commit/push to the owner.

## Validation

- Local Trivy 0.74.0 (same version/digest as CI) after fix:
  - `trivy fs --scanners vuln,license --severity HIGH,CRITICAL --exit-code 1`: exit 0,
    0 vulnerabilities, 0 licenses (was 1 HIGH before fix).
  - `trivy fs --scanners misconfig --severity HIGH,CRITICAL --exit-code 1`:
    exit 0, 0 misconfigurations across the 3 Dockerfiles.
- `npx tsx tooling/governance/src/cli.ts check:source-of-truth`: pass.
- `check:boundaries`: pass.
- `check:implementation`: initially IMPLEMENTATION_STALE after adding this work
  item; fixed via `implementation:sync` (IMPLEMENTATION.md regenerated).
- Full `pnpm check` / `pnpm security:fs` via Docker wrapper not run locally:
  private GitHub Packages auth (`read:packages`) unavailable with local token,
  and Docker daemon absent. CI re-run on PR #2 is the authoritative gate.
- CI after fix (commit 9302744): Security validation `scan` pass 1m6s
  (runs 34114651948 push, 34114655540 PR) and Starter validation `validate`
  pass (runs 34114651982 push, 34114655460 PR). Both `security:fs` and
  `security:config` steps green.

## Evidence

- CI run 34112866395, job scan: `trivy fs failed with exit code 1`.
- Local Trivy 0.74.0 before fix: 1 HIGH license
  (`@img/sharp-libvips-darwin-x64`, `LGPL-3.0-or-later`, restricted).

## Decisions

- Chose `.trivyignore` license-ID exception over dependency surgery because
  sharp is Next's optional image-optimization dep, the flagged artifact is a
  darwin-only binary never shipped in Linux production images, and the wrapper
  offers no `--ignored-licenses` passthrough. Revisit if a non-optional prod
  dep ever introduces a restricted license.
- Text-format `.trivyignore` (not `.trivyignore.yaml`) because the wrapper
  relies on Trivy's default `--ignorefile .trivyignore` discovery.

## Blockers

None yet. Private GitHub Packages auth (`read:packages`) is unavailable with
the local `gh` token scopes (`gist, read:org, repo, workflow`), so full
`pnpm install` / `pnpm check` may not run locally.

## Handoff

After validation passes, owner decides on commit/push to `codex/fleet-p1` and
re-running PR #2 checks.

## Completion

Complete as of 2026-09-07. PR #2 scan and validate are green; no runtime
behavior changed; no pilot readiness claimed.
