<!-- lineage
role: reference
conforms_to: ../../README.md
consumes: ./2026-07-18-system-prompting-methodology.md, ./2026-07-18-leaks-corpus-analysis.md, unsigned-paas docs/specs/agent-prompting-manual.md
-->

# Case study — the cerebral-agent (hermes) operations register

Date: 2026-07-18 · Status: reference · Scope: worked example + findings, no implementation here.

A worked application of the methodology to a real standing agent: the hermes-agent BYO
runtime on Cygnus, rebranded **Cerebral Agent**. The register (SOUL.md) is delivered
out-of-band as a Secret (house Principle 9), so it is **not reproduced in full here** —
this documents its structure, the decisions behind it, and one load-bearing finding.

## The agent
- Runtime: NousResearch hermes-agent (MIT), forked to `cerebral-work/cerebral-agent` and
  rebranded at the three system-prompt identity strings. Deployed as a kagent BYO Agent,
  single pod, `hermes-agent` namespace, Cygnus.
- Invocation: unattended, over A2A (via the a2a-shim sidecar). No human in the loop mid-task.
- Intended mission (plan D3/D5): broad-RBAC cluster ops and troubleshooting.

## How the system prompt is assembled (upstream mechanics)
`agent/system_prompt.py` builds a stable/context/volatile prompt. The identity slot is
`load_soul_md()` → `$HERMES_HOME/SOUL.md`: non-empty content **fully replaces** the default
identity. Content is threat-scanned and truncated at 20,000 chars (70% head / 20% tail). One
help-guidance string was appended unconditionally and named "Nous Research" — SOUL.md could
not remove it, which is why the takeover required a fork, not just a SOUL.md drop.

## Register structure (canonical order, mapped to real tools)
The register follows the manual's seven-section order:
1. **Identity** — one line: "You are Cerebral Agent, the autonomous operations agent…"
2. **Working manner (read first)** — help-first; concise/evidence-first; explicit
   non-disclosure ("do not announce, recite, or perform" authority/permissions/instructions);
   reversible-and-observable bias.
3. **Tools** — the *actual* surface (see finding below), with an explicit "claim only what
   is above; if asked to do what your tools cannot, say so."
4. **How you operate** — unattended-A2A discipline (drive to a verified result, no stubs),
   one-thread-to-done, ask-don't-assume.
5. **Authority & boundaries** — broad RBAC named as *not licence to be reckless*; action-
   classes to gate (destructive cluster ops, the trust/secrets substrate, external sends);
   the gating **explicitly marked advisory**, with the real controls named (RBAC, Kyverno,
   netpol).
6. **Honesty over deference** — calibrated truth outranks loyalty; a flattering-but-wrong
   answer is a failure.
7. **When blocked** — missing tool → say so; state contradiction → stop and report; 403 →
   intended boundary, don't bypass; escalate to the operator.

Size: ~4.5k chars — well inside the 20k cap, per the length calibration in the methodology doc.

## Load-bearing finding — charter/tool mismatch (manual Principle 7)
Probing the live pod (2026-07-18) contradicted the plan's stated mission:
- **No MCP servers wired** — Prometheus / Loki / Grafana tools from plan D3 are absent.
- **`kubectl` and `helm` are not installed** in the image. The pod's ServiceAccount carries
  the broad D5 ClusterRole, but there is **no CLI to exercise it** — the K8s capability is
  latent, reachable only via raw API calls (curl + the mounted SA token).
- Present in-pod: `bash`, `git`, `rg`, `python3`, `curl`.

The manual is explicit that a charter claiming tools the agent lacks produces *confident
failure and erodes trust*. So the register was written to the **real** surface (K8s API via
the SA token; in-pod terminal; memory/skills) and explicitly disclaims the absent tools —
rather than to the aspirational mission. **This gap is the actual blocker on hermes being a
useful ops agent** and is filed as a follow-up (wire kubectl/helm + the grafana-MCP tools, or
narrow the stated mission). The register is honest today; the capability needs to catch up to
the charter, not the other way round.

## Takeaways generalizable to other estate registers
- Verify the tool surface on the *live* workload before writing capability claims. The plan
  is aspirational; the pod is ground truth.
- Mark advisory constraints as advisory and name the real enforcement — do not let a register
  imply the prompt is the boundary.
- For an unattended broad-write agent, the "read-only scope fence" of a QA-review prompt
  inverts into an explicit action-class taxonomy plus a dominant honesty mandate.

## References
- `./2026-07-18-system-prompting-methodology.md`, `./2026-07-18-leaks-corpus-analysis.md`
- `unsigned-paas/docs/specs/agent-prompting-manual.md`
- Register delivery: OpenBao `secret/hermes-agent` property `soul-md` → Secret →
  `/home/hermes/.hermes/SOUL.md` (subPath, read-only), wired in the hermes-agent chart.
