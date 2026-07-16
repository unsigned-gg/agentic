---
name: estate-orient
description: Orient a session to the unsigned/cerebral estate — probe live cluster, GitOps, and OpenBao health, pull engram context for the current project, and emit a short orientation digest. Use at the start of infrastructure work, when asked "what's the state of the cluster/estate", or before making any live-state claim.
---

# estate-orient

Live intake for the estate described in the static estate brief. Everything
here is a read-only probe; report what the probes return, nothing more.

## Probes (run what applies; skip gracefully if a tool is absent)

1. **Cluster reachability + nodes** — two clusters exist: Lyra (dev VKE,
   default kubeconfig) and Cygnus (prod Talos, `~/.kube/cygnus`). Probe the one
   relevant to the work; both when orienting broadly.
   ```bash
   kubectl config current-context
   kubectl get nodes -o wide
   KUBECONFIG=~/.kube/cygnus kubectl get nodes -o wide   # Cygnus, if in scope
   ```

2. **Unhealthy workloads**
   ```bash
   kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded | head -30
   ```
   Baseline is empty or a few `Completed` jobs. Anything CrashLoopBackOff /
   ImagePullBackOff / Pending>10m goes in the digest by name.

3. **GitOps health** — use kubectl reads; do NOT use the `argocd` CLI with
   `--core` (broken under Helm v4 on this estate):
   ```bash
   kubectl get applications.argoproj.io -n argocd -o json | jq -r '
     .items[] | select(.status.health.status != "Healthy" or .status.sync.status != "Synced")
     | "\(.metadata.name)  \(.status.health.status)/\(.status.sync.status)"'
   ```
   Remember: all apps are manual-sync by doctrine — OutOfSync alone is not an
   incident; Degraded/Missing is.

4. **OpenBao (read-only — golden egg, never mutate)**
   ```bash
   kubectl get pods -n openbao
   ```
   Report sealed/unsealed only if a `bao status` path is already configured.

5. **Memory intake (engram)** — project context for the cwd:
   ```bash
   curl -s "http://127.0.0.1:7437/context/smart?project=$(basename "$PWD")&limit=15"
   ```
   Prefer the engram MCP tools when available. If the daemon is down, say so —
   do not substitute recall for it.

6. **Tracker pulse (optional, if `linearctl` present)**
   ```bash
   linearctl search --state started 2>/dev/null | head -15
   ```

## Digest format (≤30 lines, probes only)

```
ESTATE ORIENT — <date> <cluster-context>
Nodes: <n> Ready / <n> total
Workloads: <n> unhealthy → <names or "none">
GitOps: <n> degraded apps → <names or "none">   (manual-sync doctrine: OutOfSync ≠ incident)
OpenBao: <pod state / sealed state / unknown>
Context (engram, top 5): <one line each>
Active tickets: <ids+titles or "not probed">
```

If a probe fails, one line stating which and why — never fabricate its result.
