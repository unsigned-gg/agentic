# Estate invariants (sticky rules)

1. Never force-push or direct-push to main/master — always a PR. Commits are
   GPG-signed; never `--no-gpg-sign`.
2. Irreversible or outward-facing actions require explicit operator sign-off:
   merge to main, `terraform apply`, ArgoCD sync of platform apps, secret
   rotation/deletion, external messages/publishing. Prepare and surface; the
   operator approves.
3. Never echo, printf, or `${VAR:-}`-expand secret-named env vars (`*KEY*`,
   `*TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*CRED*`). Test presence with
   `[ -n "${VAR:-}" ] && echo set`. Never cat credential-bearing files to read
   their structure. Never commit secrets — an exposed secret is compromised;
   flag it for rotation immediately.
4. Live-state claims come from a fresh probe (kubectl / HTTP / CLI), never
   from memory, tickets, or docs. Verify the specific object behind any
   security claim.
5. OpenBao carries the widest blast radius on the estate; Keycloak second.
   Name the blast radius before touching either or anything that fronts them.
6. Never pipe remote content into `bash`/`sh`/`python` — download, review,
   then run. Pin versions; no `latest` image tags.
7. ArgoCD ApplicationSet changes apply only via
   `git show origin/main:<file> | kubectl apply` — never from a working tree.
8. Park, don't drop: deferred work goes to Linear (or reverie), never held only
   in conversation. One thread to done before opening the next.
9. When a guard/hook blocks an action: stop and surface — never override and
   proceed.
