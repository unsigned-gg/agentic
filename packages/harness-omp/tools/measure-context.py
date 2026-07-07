#!/usr/bin/env python3
"""Measure omp's request-context footprint against a local capture sink.

Starts an OpenAI-compatible HTTP sink on localhost that records the first
/chat/completions body and returns 400 (omp surfaces the error and exits).
Runs `omp -p` against it under a throwaway profile, then prints a breakdown:
system message, per-tool schemas, skills block, estimated total tokens.

Usage:
  measure-context.py [--budget N] [--settings config.yml|default] [--keep]

Exit codes: 0 ok (and under budget if given), 1 over budget, 2 probe failure.
Token estimate is chars/3.6 (calibrated against the gateway's tokenizer count
on 2026-07-06: est. 43.5k vs measured 39.3k — estimates read ~10% high).
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

CHARS_PER_TOKEN = 3.6


def est_tokens(n_chars: int) -> int:
    return int(n_chars / CHARS_PER_TOKEN)


class Sink(BaseHTTPRequestHandler):
    captured: list = []

    def do_POST(self):  # noqa: N802 (http.server API)
        length = int(self.headers.get("content-length", 0))
        body = self.rfile.read(length)
        if "/chat/completions" in self.path or "/completions" in self.path:
            Sink.captured.append(body)
        err = json.dumps({"error": {"message": "context probe sink", "type": "probe", "code": 400}})
        self.send_response(400)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(err.encode())

    def do_GET(self):  # noqa: N802 — /v1/models discovery
        payload = json.dumps({"object": "list", "data": [{"id": "probe", "object": "model"}]})
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(payload.encode())

    def log_message(self, *args):  # silence
        pass


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--budget", type=int, help="fail (exit 1) if est. total tokens exceed this")
    ap.add_argument(
        "--settings",
        default="default",
        help="path to a config.yml to measure, or 'default' for omp defaults",
    )
    ap.add_argument("--keep", action="store_true", help="keep the temp profile dir for inspection")
    args = ap.parse_args()

    if not shutil.which("omp"):
        print("omp not on PATH — run install.sh first (and add bun's global bin dir)", file=sys.stderr)
        return 2

    server = HTTPServer(("127.0.0.1", 0), Sink)
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()

    # OMP_PROFILE takes a NAME matching ^[a-z0-9][a-z0-9._-]{0,63}$, resolved
    # to ~/.omp/profiles/<name>/agent — absolute paths are rejected.
    profile_name = f"ctx-measure-{os.getpid()}"
    profile_dir = Path.home() / ".omp" / "profiles" / profile_name / "agent"
    profile_dir.mkdir(parents=True, exist_ok=True)
    (profile_dir / "models.yml").write_text(
        "providers:\n"
        "  sink:\n"
        f"    baseUrl: http://127.0.0.1:{port}/v1\n"
        "    api: openai-completions\n"
        "    auth: none\n"
        "    models:\n"
        "      - id: probe\n"
        "        contextWindow: 200000\n"
    )
    if args.settings != "default":
        shutil.copy(args.settings, profile_dir / "config.yml")

    env = dict(os.environ, OMP_PROFILE=profile_name)
    try:
        subprocess.run(
            ["omp", "-p", "--model=sink/probe", "--no-session", "ping"],
            env=env,
            capture_output=True,
            timeout=180,
        )
    except subprocess.TimeoutExpired:
        print("omp did not exit within 180s", file=sys.stderr)
        return 2
    finally:
        server.shutdown()
        if not args.keep:
            shutil.rmtree(profile_dir.parent, ignore_errors=True)
        else:
            print(f"profile kept: {profile_dir}", file=sys.stderr)

    if not Sink.captured:
        print("sink captured no completion request — omp config/flags changed?", file=sys.stderr)
        return 2

    body = json.loads(Sink.captured[0])
    total_chars = 0
    print("== omp context footprint ==")
    for m in body.get("messages", []):
        content = m["content"] if isinstance(m["content"], str) else json.dumps(m["content"])
        total_chars += len(content)
        print(f"  message[{m['role']}]: {len(content)} chars ~{est_tokens(len(content))} toks")
        if m["role"] == "system" and isinstance(m["content"], str):
            skills = re.search(r"<skills>.*?(</skills>|\Z)", m["content"], re.S)
            if skills:
                n = len(skills.group(0))
                print(f"    of which <skills> block: {n} chars ~{est_tokens(n)} toks")

    tools = body.get("tools", [])
    tools_json = json.dumps(tools)
    total_chars += len(tools_json)
    print(f"  tools: {len(tools)} schemas, {len(tools_json)} chars ~{est_tokens(len(tools_json))} toks")
    for t in sorted(tools, key=lambda t: -len(json.dumps(t)))[:8]:
        size = len(json.dumps(t))
        print(f"    {t['function']['name']:22s} ~{est_tokens(size)} toks")

    total = est_tokens(total_chars)
    print(f"  TOTAL: {total_chars} chars ~{total} est. tokens")

    if args.budget and total > args.budget:
        print(f"OVER BUDGET: {total} > {args.budget}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
