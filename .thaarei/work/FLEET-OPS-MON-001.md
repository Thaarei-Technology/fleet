---
workId: FLEET-OPS-MON-001
title: Platform VM memory monitoring setup
origin: user-request 2026-09-07
status: complete
owner: Nishanth
createdAt: 2026-09-07
updatedAt: 2026-09-07
sourceOfTruthIds: []
affectedPaths: []
---

# Platform VM memory monitoring setup

## Objective

Set up lightweight memory/RAM consumer monitoring on the Platform Ubuntu VM (`platform` over Tailscale) and validate it via SSH.

## Scope

Read-only host inventory plus installation and activation of lightweight local
monitoring tools on the shared Platform VM.

## Non-goals

No application deployment, service reconfiguration, public port exposure, or
production monitoring admission.

## Acceptance criteria

- [x] Host baseline and installed monitoring tools are recorded.
- [x] Monitoring services are active and no current OOM condition is present.
- [x] No application repository files or secrets are changed.

## Plan

1. SSH to `platform`, confirm Ubuntu version and baseline `free -h`.
2. Inventory existing tools (htop, sar present; btop, atop, smem missing).
3. Install missing tools via apt; enable history collection (sysstat sadc + atop daemon).
4. Validate: `free`, `ps --sort=-%mem`, `smem`, `slabtop`, OOM log check, tool versions.

## Changed paths

- None in repo. VM-only change on `e2e-136-72` (Ubuntu 24.04.4 LTS):
  - Installed via apt: `btop`, `atop`, `smem` (htop, sysstat already present).
  - `/etc/default/sysstat`: `ENABLED="false"` -> `"true"`.
  - Enabled + started: `sysstat-collect.timer`, `sysstat-summary.timer`, `atop`.

## Validation

- `ssh platform "lsb_release -a; uname -a; free -h"` -> Ubuntu 24.04.4 LTS, 6.8.0-137-generic, 14Gi Mem / 8Gi swap. Result: OK.
- `dpkg -l | grep -E 'btop|atop|sysstat|smem'` -> all `ii` installed. Result: OK.
- `systemctl is-active atop` -> `active`; `is-active sysstat-collect.timer` -> `active`; `/var/log/atop/atop_20260907` exists. Result: OK.
- `sar -r 1 2` -> %memused ~26%. Result: OK.
- `free -h` -> used 4.8Gi, available 9.7Gi (healthy). Top RSS: dockerd ~1GB (6.6%), node dist/server.mjs ~690MB (4.5%), next-server ~350MB (2.2%). Swap used 1.3Gi (past pressure, not current). Slab top: xfs_inode/dentry normal. `dmesg | grep -ci "out of memory"` -> 0. Result: OK.
- Repo checks (`pnpm check:*`, `pnpm check`): not applicable, no repo files changed. `git status --short` pre-existing modifications left untouched.

## Evidence

- No secrets recorded. Host facts only (see Validation).

## Decisions

- Chose apt tools (htop/btop/atop/sysstat/smem) over Netdata/Prometheus: zero-config, no new open ports on shared platform VM. Upgrade to Netdata or node_exporter+Grafana later if continuous dashboards needed.

## Blockers

- None. Note: kernel 6.8.0-139 available, running 6.8.0-137; reboot not done (needs owner approval).

## Handoff

- Use `btop` (or `htop`) live, `ps -eo pid,user,comm,%mem,%cpu,rss --sort=-%mem | head` for one-shot, `sar -r` / `atop -r` for history. Current verdict: VM healthy, no memory pressure.
- Pending reboot decision for kernel upgrade.

## Completion

Done 2026-09-07 via SSH to `platform`.
