<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: agentskills.io spec, local-models/MODELS.md
-->

# skills

Shared [agentskills.io](https://agentskills.io) skills — authored once here,
symlinked into every harness by `./install.sh` (pi, opencode, hermes, and the
`~/.agents/skills` cross-harness dir Claude Code reads).

A skill = a directory with `SKILL.md` (YAML frontmatter: `name`,
`description`) plus optional references/scripts. The frontmatter description
is the trigger surface — write it as "Use when …".

Seed skill: **`local-model-triage/`** — three-fault-domain diagnosis for
misbehaving local models (serving config vs model tier vs harness wiring).

Add a skill: new dir + `SKILL.md`, re-run `./install.sh` (symlinks make edits
live everywhere immediately; the re-run only picks up *new* dirs).
