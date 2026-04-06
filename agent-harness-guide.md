# Building Agent Harnesses: A Practical Guide for Engineers

*Last updated: April 2026*

## 1. What an "agent harness" actually is

In 2024 the prevailing mental model for building with LLMs was still "write a clever prompt and pipe the output somewhere." Two years later, that frame is dead. Every production-grade coding agent — Claude Code, Cursor, Codex, Devin, Aider — is built on top of a *harness*: the layer of code, configuration, tools, prompts, feedback signals, and execution policy that wraps a stateless model and turns it into something that can actually get work done.

A useful definition: **a harness is everything in an agent system that is *not* the model**. It owns the loop, the tools, the context, the safety rails, and the verification signals. The model is a pure function from messages → messages; the harness is the operating system around it.

This guide is aimed at engineers who are about to build (or rebuild) an agent harness. It draws on public best practices from Anthropic and OpenAI, the harness-engineering literature that emerged in late 2025 and early 2026, and the technical insights that came out of the March 31, 2026 Claude Code source-map leak — which gave the community its first detailed look at how a top-tier coding agent is actually wired together.

A note on the leak before we go further: the Claude Code source-map exposure is interesting because it confirmed a lot of folklore and revealed how spartan a great harness can be. But it also exposed real attack surface (a poisoned `axios` slipped into the same window, and the leaked orchestration logic gives attackers a roadmap for prompt-injection against Claude Code repos). Treat the lessons below as *engineering* lessons, not as a license to copy any specific prompt or feature flag verbatim.

---

## 2. The anatomy of a harness

Every harness, regardless of vendor, contains the same seven components. If you are missing any of them you do not yet have a harness, you have a chatbot.

1. **The agent loop** — the outer `while` that runs the model, executes tool calls, and feeds results back in.
2. **Tools** — functions the model can call to observe or change the world (read files, run shells, query APIs).
3. **The system prompt** — durable instructions about identity, capabilities, conventions, and refusal behavior.
4. **Context management** — how files, docs, history, and tool output are loaded, pruned, summarized, and cached.
5. **Permissions and policy** — what the agent is allowed to do without asking, what requires confirmation, what is forbidden outright.
6. **Verification and feedback** — how the harness checks the model's work and surfaces corrections (tests, linters, type-checkers, screenshots, sub-agent reviewers).
7. **Observability and evals** — logs, traces, and a regression suite that tells you whether changes to the harness are making it better or worse.

The remainder of this guide walks each of these in turn, with implementation patterns you can copy.

---

## 3. The agent loop

The single most important — and most surprisingly *small* — piece of a harness.

### 3.1 The canonical loop

At its simplest, the loop is:

```python
def run_agent(user_prompt: str, tools: list[Tool], system: str) -> str:
    messages = [{"role": "user", "content": user_prompt}]
    for turn in range(MAX_TURNS):
        response = model.complete(
            system=system,
            messages=messages,
            tools=[t.schema for t in tools],
        )
        messages.append({"role": "assistant", "content": response.content})

        tool_calls = [b for b in response.content if b.type == "tool_use"]
        if not tool_calls:
            return response.text  # Model produced a text-only turn → done.

        tool_results = execute_tools(tool_calls, tools)
        messages.append({"role": "user", "content": tool_results})

    raise MaxTurnsExceeded()
```

That's it. That is essentially the entire structure. The Claude Code leak confirmed something that practitioners had suspected for a while: the core loop in Claude Code is roughly **88 lines of code, with no explicit state machine** — the only state is the message array. The cleverness is not in the loop, it is in the tools, the system prompt, the context strategy, and the verification signals layered around it.

This is the first and most important lesson of the leak: **resist the temptation to build a complicated orchestrator**. LangGraph-style state machines, planner/executor splits, and explicit "thoughts → action → observation" scaffolds are almost always worse than letting the model run a tight loop and giving it good tools.

### 3.2 Stopping conditions

A loop that cannot stop is a loop that burns money. Every harness needs at least four termination conditions:

```python
class StopReason(Enum):
    COMPLETED = "completed"          # Model produced a text-only turn
    MAX_TURNS = "max_turns"          # Hit configured turn cap
    MAX_BUDGET = "max_budget_usd"    # Exceeded cost budget
    USER_INTERRUPT = "user_interrupt"
    HARNESS_ERROR = "harness_error"  # Tool execution blew up unrecoverably
```

The Claude Agent SDK exposes exactly this contract via its `ResultMessage.subtype` field — `success`, `error_max_turns`, `error_max_budget_usd`, `error_during_execution`, `error_max_structured_output_retries`. Use the same vocabulary; it will save you time when triaging incidents.

A budget cap (typically dollars, sometimes tokens) is the most underused of these in practice. Set one even in dev. Agents that loop on `Bash(npm install)` can spend $40 in a coffee break.

### 3.3 Turns vs. messages

A *turn* is one round trip: model produces output → harness executes any tool calls → results feed back. A simple question may take one turn; a real coding task often takes 20–60. Distinguish turns from messages in your logging: per-turn token counts and per-turn cost are the units operators actually care about.

---

## 4. Tools: the highest-leverage part of the harness

If the loop is the spinal cord, tools are the nervous system. The biggest single difference between a mediocre harness and a great one is the *quality, granularity, and ergonomics* of its tool set.

### 4.1 Design principles

Five rules that hold up across every harness worth studying:

**Prefer few, powerful tools over many narrow ones.** The Claude Code leak showed that the bash tool is intentionally enormous — it is the catch-all for file manipulation, git, package management, and ad hoc scripts. The system prompt explicitly tells the model to prefer chaining bash commands rather than chaining individual `Read`/`Write` tool calls when doing multi-step file work. Each tool definition you add costs tokens on every single request, forever.

**Make tool I/O legible to the model.** Tool outputs should be plain text or markdown, line-numbered when appropriate, and *truncated with explicit markers* when long. Never silently dump 50k tokens of build output into the loop — it will blow context and the model will start hallucinating about the noise.

**Read-only tools should be marked as such so they can run in parallel.** The Claude SDK allows `Read`, `Glob`, and `Grep` to run concurrently within a single turn, while state-mutating tools like `Edit`, `Write`, and `Bash` are forced sequential. Annotate your custom tools with `readOnly: true` whenever it's safe — it cuts wall-clock time on multi-file inspection by 3–10x.

**Each tool should have one obvious failure mode.** When a tool call fails, the error message *is* the next prompt. Make it actionable: include the offending input, the constraint that was violated, and a hint about how to recover.

**Treat tool descriptions as prompts.** The model decides which tool to call based almost entirely on the tool name + description + parameter docstrings. Spend real time on these. Include negative examples ("do not use this for X — use Y instead") in the description.

### 4.2 The standard tool set

The set that has converged across Claude Code, Cursor, Aider, and the Claude Agent SDK is remarkably consistent. Use it as your starting point:

| Category | Tool | Notes |
|---|---|---|
| File ops | `Read`, `Edit`, `Write` | `Edit` should require an exact-string match (see §4.3) |
| Search | `Glob`, `Grep` | Backed by ripgrep; never shell out to `find` |
| Execution | `Bash` | Sandboxed; one persistent shell session per agent |
| Web | `WebFetch`, `WebSearch` | Always go through an egress allow-list |
| Orchestration | `Task` / `Agent` | Spawn a sub-agent in a fresh context window |
| State | `TodoWrite` | Lightweight task tracker the model maintains itself |
| Human | `AskUserQuestion` | Structured multiple-choice clarifications |

### 4.3 The `Edit` tool: a worked example

The leaked Claude Code `Edit` tool is a string-replacement primitive, not a diff tool, and the design choice matters. Here is a minimal but production-shaped implementation:

```python
class EditTool(Tool):
    name = "Edit"
    description = (
        "Performs an exact string replacement in a file. "
        "You MUST call Read on the file at least once in this conversation "
        "before editing it. The old_string MUST be unique in the file — "
        "include enough surrounding context to disambiguate. "
        "Use replace_all=true to rename a symbol throughout the file."
    )

    def schema(self):
        return {
            "type": "object",
            "properties": {
                "file_path":   {"type": "string", "description": "Absolute path"},
                "old_string":  {"type": "string"},
                "new_string":  {"type": "string"},
                "replace_all": {"type": "boolean", "default": False},
            },
            "required": ["file_path", "old_string", "new_string"],
        }

    def run(self, file_path, old_string, new_string, replace_all=False):
        if file_path not in self.session.read_files:
            return Error("Read the file before editing it.")
        contents = open(file_path).read()
        if replace_all:
            new_contents = contents.replace(old_string, new_string)
        else:
            count = contents.count(old_string)
            if count == 0:
                return Error(
                    f"old_string not found. Re-read {file_path} and try again "
                    "with more surrounding context."
                )
            if count > 1:
                return Error(
                    f"old_string matches {count} locations. Add more context "
                    "to make it unique, or set replace_all=true."
                )
            new_contents = contents.replace(old_string, new_string, 1)
        open(file_path, "w").write(new_contents)
        return Success(diff=unified_diff(contents, new_contents))
```

Every line of that error-message text is doing work. The model learns from the error how to recover next turn. This is what people mean when they say "the harness teaches the model."

### 4.4 The `Task` / sub-agent tool

A sub-agent is a child loop that runs in an isolated context window and returns only its final summary to the parent. This is the single most powerful technique for working on tasks that would otherwise blow the context budget.

```python
class TaskTool(Tool):
    name = "Task"
    description = (
        "Spawn a sub-agent to handle a self-contained task that would consume "
        "a lot of context (large file searches, exploratory reading, "
        "verification passes). The sub-agent runs in a fresh context window "
        "and returns only its final response. Use for 'go find all files that …' "
        "or 'verify that … is true' style tasks."
    )

    def run(self, prompt: str, allowed_tools: list[str]):
        child = Agent(
            system=SUBAGENT_SYSTEM_PROMPT,
            tools=[t for t in self.all_tools if t.name in allowed_tools],
            max_turns=20,
        )
        return child.run(prompt).final_text
```

The framing that helps: **a sub-agent is a context firewall**. Anything noisy that you do not want polluting the parent conversation should happen behind one. Verification passes, broad file exploration, log scanning, web research — all good candidates. The Claude Code leak shows sub-agents are also used internally for "verifier" passes after non-trivial code changes.

---

## 5. The system prompt

The system prompt is not where you put your application logic. It is where you put the *durable* facts about the agent: who it is, what it can do, what its conventions are, what it must never do.

### 5.1 Structure

A good system prompt has, at minimum, these sections, in this order:

```
1. Identity and role          — "You are a coding agent operating in a sandboxed shell."
2. Environment description    — OS, available binaries, working directory, network policy.
3. Tool use conventions       — when to prefer Bash over Edit, when to use sub-agents.
4. Coding conventions         — formatting, file naming, refusal to add unrequested features.
5. Communication conventions  — tone, terseness, how to surface questions to the user.
6. Safety and refusals        — what not to do regardless of user instructions.
7. The "done" definition      — what it means to finish (no tool calls, plus any required verifier).
```

Keep it under ~3,000 tokens. Anything longer and the model starts treating it like wallpaper. Push project-specific instructions into a separate `AGENTS.md` / `CLAUDE.md` that gets injected per-project.

### 5.2 What the leak taught us about prompt design

Three patterns from the leaked Claude Code prompt are worth stealing on technical grounds (the *content* of any specific prompt is not yours to copy, but the *patterns* are general):

**Tell the model what success looks like.** Claude Code's prompt explicitly defines the "done" state — a turn with no tool calls and, for code changes, a passing verifier. Without this, agents wander.

**Be concrete about anti-patterns.** Lines like "do not add comments unless asked" or "do not run `find`; use the Glob tool" are far more effective than vague encouragements toward "good code."

**Use few-shot examples for tool selection.** The Claude Code prompt contains many small `<example>` blocks showing the *correct* tool for a given user request. This is how you teach the model your taste.

A note on the more controversial findings from the leak — the so-called "Undercover Mode" instructions about commit message hygiene, the 44 unreleased feature flags, the user-language-tracking — these are *product* decisions specific to Anthropic, not generalizable harness lessons. Don't read too much into them.

### 5.3 Project context: the `AGENTS.md` pattern

The pattern that has converged is to keep the system prompt small and ship a separate `AGENTS.md` (or `CLAUDE.md`) at the root of each project. The harness loads this file at session start and re-injects it on every request (so it's prompt-cacheable but always available).

A good `AGENTS.md` is short (≈100 lines) and acts as **a map, not a manual**. Pointers to deeper documentation, not the documentation itself:

```markdown
# Project: payments-service

## Layout
- `src/` — Go source
- `migrations/` — sqlc migrations; run `make migrate` after editing
- `proto/` — generated; do not edit by hand

## Conventions
- Errors: use `errors.Wrap`, never `fmt.Errorf("%w")`
- Tests: `make test` (fast), `make test-integration` (slow, requires docker)
- Lint: `make lint` must pass before any commit

## Where to look
- Auth flow: see `docs/auth.md`
- DB schema: see `docs/schema.md`
- Deployment: see `ops/README.md`
```

The map-not-manual principle is the single biggest unlock for context efficiency on real codebases.

---

## 6. Context management

Context is the resource you will run out of long before you run out of money. The harness's job is to make sure the model is always working with the *right* context, not *all* the context.

### 6.1 What consumes context, in order of severity

1. **Tool output** — by far the worst offender. A single `npm test` can dump 50k tokens.
2. **File reads** — a 4,000-line file is ~15k tokens.
3. **Conversation history** — accumulates linearly with turns.
4. **Tool definitions** — every tool's schema is in every request, forever.
5. **System prompt + AGENTS.md** — fixed cost, but prompt-cached.

### 6.2 Strategies that actually work

**Truncate aggressively, with markers.** When a tool produces more than ~2,000 tokens of output, return the head and tail with a clear `[... 14,322 lines elided ...]` marker. The model will re-call with a more specific filter if it needs to.

**Swallow stdout, surface stderr.** For test runners and build commands, return the failures, not the green output. This came directly out of harness-engineering practice in 2025: returning full test output caused agents to lose track of what they were doing and start hallucinating about test files they had just read.

**Sub-agents as context firewalls.** Anything exploratory goes in a sub-agent. The parent only ever sees the summary.

**Summaries on demand, not on schedule.** Don't proactively summarize; let the harness compact only when it's about to run out of room. The Claude Agent SDK does this with a `compact_boundary` event so your code can intercept it.

**Prompt caching is free; use it.** Make sure your system prompt, tool definitions, and `AGENTS.md` are byte-identical across requests. A single accidental timestamp in the system prompt will defeat caching and 5x your bill.

### 6.3 An aggressive context budget

Here is a budget that has worked well for production coding agents on a 200k-token model:

```
System prompt + AGENTS.md ........  4,000 tokens   ( 2%)  cached
Tool definitions ................. 12,000 tokens   ( 6%)  cached
Working budget for conversation .. 150,000 tokens  (75%)
Hard reserve for the model's reply 30,000 tokens   (15%)
Compaction trigger ............... at 80% of working budget
```

Numbers are illustrative — measure your own. The discipline of having an explicit budget is what matters.

---

## 7. Permissions and policy

The most underrated component, and the one that turns a "demo" into something a human will let near their machine.

### 7.1 The three-mode pattern

Borrowed from the Claude Agent SDK, this is the cleanest abstraction the field has converged on:

| Mode | What it does | When to use |
|---|---|---|
| `default` | Tools not on the allow-list trigger an approval callback | Interactive desktop use |
| `acceptEdits` | Auto-approves file edits; everything else still gates | Trusted dev machine |
| `plan` | No tool execution at all; agent produces a plan only | Pre-flight before a risky run |
| `bypassPermissions` | Runs everything; fast and dangerous | Sandboxes, CI, isolated VMs |

Build your harness so that switching between these is one config flag, not a refactor.

### 7.2 Per-tool allow rules

Tools should be scoped, not just allow-listed. A rule grammar like Claude Code's is a good model:

```
Bash(git diff:*)        # allow git diff with any args
Bash(npm test)          # allow exactly `npm test`
Bash(rm:*)              # explicitly forbidden, even if Bash is allowed
WebFetch(https://docs.python.org/*)
```

Match against the tool name and a glob over the parameters. Deny rules always beat allow rules.

### 7.3 Hooks

Hooks are callbacks that fire at well-defined points in the loop and run *outside* the model's context window, so they don't cost tokens. The standard set:

| Hook | Fires | Use cases |
|---|---|---|
| `PreToolUse` | Before a tool runs | Block, modify, or audit |
| `PostToolUse` | After a tool returns | Side effects, logging, redaction |
| `UserPromptSubmit` | When a prompt is sent | Inject just-in-time context |
| `Stop` | Loop ends | Validate result, snapshot session |
| `PreCompact` | Before context compaction | Archive transcript |
| `SubagentStart`/`Stop` | Sub-agent lifecycle | Trace tree-of-agents runs |

A minimal hook implementation:

```python
@harness.pre_tool_use("Bash")
def block_destructive_bash(tool_call):
    cmd = tool_call.parameters["command"]
    if re.search(r"\brm\s+-rf\s+/\b", cmd):
        return Hook.deny("Refusing rm -rf /")
    if "curl" in cmd and "| sh" in cmd:
        return Hook.deny("Refusing piped shell install")
    return Hook.allow()
```

Hooks are also the right place to enforce egress policy. The Claude Code leak made it painfully clear that the harness is the *only* layer that can enforce "this agent can fetch from `docs.python.org` but not `pastebin.com`" — the model itself cannot be trusted to do it.

### 7.4 Prompt-injection defense

The leak was a wake-up call: with the orchestration logic public, attackers can now craft repositories specifically designed to trip a coding agent into running malicious commands or exfiltrating data. Two non-negotiable rules:

1. **Treat all tool output as untrusted text.** Anything the model reads from a file, a web page, or a shell command is *content*, never *instructions*. The harness should never silently elevate it to instruction-level trust.
2. **Confirm before any irreversible action.** Even in `acceptEdits` mode, pushes, deletes, and outbound network calls should require explicit confirmation.

This is one place where having a small, well-audited harness pays off: a 200-line loop is something you can actually reason about.

---

## 8. Verification and feedback loops

> "The single biggest improvement I made to a coding agent was giving it a way to verify its work. It improved quality 2–3x." — Boris Cherny (creator of Claude Code), widely quoted in the harness-engineering literature

A harness without a verifier is a harness that ships hallucinated diffs. The pattern to internalize: **the model takes an action, the harness measures the world, and the next prompt is the measurement**.

### 8.1 The verifier ladder

Build verifiers in cheapness order. Cheap, fast checks should run after every change; expensive ones gate the "done" state.

| Tier | Tool | Latency | When to run |
|---|---|---|---|
| 1 | Type-checker, linter | seconds | After every edit |
| 2 | Affected unit tests | seconds–minutes | After every edit in scope |
| 3 | Full test suite | minutes | Before declaring "done" |
| 4 | Integration / E2E | minutes–hours | Before a PR |
| 5 | Sub-agent code review | seconds, $ | Before declaring "done" on non-trivial changes |

### 8.2 Implementation pattern

Don't bolt verification onto a `Stop` hook only. Make it a tool the model can call itself, *and* an automatic post-edit hook:

```python
@harness.post_tool_use("Edit", "Write")
def run_fast_checks(tool_call, result):
    file = tool_call.parameters["file_path"]
    if not file.endswith(".py"):
        return
    lint = run(f"ruff check {file}")
    types = run(f"pyright {file}")
    if lint.failed or types.failed:
        # Inject the failure as the next "user" message — the model
        # will see it and self-correct on the next turn.
        return Hook.append_message(
            f"Fast checks failed on {file}:\n{lint.stderr}\n{types.stderr}"
        )
```

### 8.3 The sub-agent reviewer

For non-trivial diffs, a separate sub-agent acting as a code reviewer catches things the author missed. The pattern:

```python
def verify_diff(diff: str) -> ReviewResult:
    return Agent(
        system=REVIEWER_SYSTEM_PROMPT,
        tools=[Read, Glob, Grep],   # read-only — important
        max_turns=10,
    ).run(
        f"Review this diff for correctness, style, and safety. "
        f"Return PASS or a list of FAIL items.\n\n{diff}"
    )
```

The reviewer sub-agent should have *only read-only tools*. This is the easiest mistake to make in the wrong direction — giving the reviewer write access defeats the entire point.

---

## 9. Observability and evals

You cannot improve what you cannot measure. The good news: agent harnesses are unusually easy to instrument because the loop is so simple.

### 9.1 What to log

For every turn, capture: model input tokens, output tokens, latency, cost, tool calls, tool results (truncated), and the message hash for cache attribution. For every run, capture: total turns, total cost, stop reason, and a session ID you can replay from.

A useful trick: log the *full message array at every turn* into a JSONL file. Disk is cheap; replaying a failed run later is invaluable. The Claude Agent SDK exposes this directly through its `session_id` and replay mechanism.

### 9.2 An eval suite

The harness-engineering consensus is brutal: **two teams using the same model can see a 40-point difference in task completion rate based on harness quality alone**. Without an eval suite you have no idea which side of that gap you're on.

A minimal eval rig:

```python
@dataclass
class EvalCase:
    name: str
    repo_snapshot: Path           # git ref or tarball
    user_prompt: str
    grader: Callable[[Path], bool]  # runs against the post-agent worktree

CASES = [
    EvalCase(
        name="fix-failing-auth-test",
        repo_snapshot=Path("snapshots/auth-bug-1234"),
        user_prompt="Fix the failing tests in auth.test.ts",
        grader=lambda d: run("npm test", cwd=d).returncode == 0,
    ),
    # ... 50 to 200 more cases ...
]

def run_evals(harness_version: str):
    results = []
    for case in CASES:
        with sandbox(case.repo_snapshot) as workdir:
            outcome = run_agent(case.user_prompt, workdir=workdir)
            passed = case.grader(workdir)
            results.append((case.name, passed, outcome.cost, outcome.turns))
    return results
```

Two operational rules:
1. **Run with `temperature=0` for evals.** You want regressions, not noise.
2. **Run each case 3–5 times anyway.** Even at temperature 0, tool latency and parallelism create variance. Track pass-rate, not pass/fail.

Gate harness changes on the eval suite. No PR to your harness should merge without showing the eval delta.

---

## 10. A reference implementation

Pulling it all together. This is a runnable skeleton — about 250 lines — that has every piece discussed above. It is intentionally boring; the cleverness lives in the tools and the prompt.

```python
# harness.py — a minimal but production-shaped agent harness
from __future__ import annotations
import json, time, uuid, re, subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Any

# ----------------------------- model wrapper -----------------------------
class Model:
    def __init__(self, name: str): self.name = name
    def complete(self, system, messages, tools): ...   # call your provider

# --------------------------------- tools ---------------------------------
@dataclass
class Tool:
    name: str
    description: str
    schema: dict
    run: Callable[..., dict]
    read_only: bool = False

def make_read_tool(session):
    def run(file_path: str, offset: int = 0, limit: int = 2000):
        if not Path(file_path).exists():
            return {"error": f"No such file: {file_path}"}
        lines = Path(file_path).read_text().splitlines()
        chunk = lines[offset:offset+limit]
        session["read_files"].add(file_path)
        return {"content": "\n".join(f"{i+offset+1}\t{l}" for i, l in enumerate(chunk))}
    return Tool("Read", "Read a file with line numbers.",
                {"type": "object", "properties": {
                    "file_path": {"type": "string"},
                    "offset":    {"type": "integer", "default": 0},
                    "limit":     {"type": "integer", "default": 2000}},
                 "required": ["file_path"]},
                run, read_only=True)

def make_edit_tool(session):
    def run(file_path: str, old_string: str, new_string: str, replace_all: bool = False):
        if file_path not in session["read_files"]:
            return {"error": "Read the file before editing it."}
        text = Path(file_path).read_text()
        if replace_all:
            new_text = text.replace(old_string, new_string)
        else:
            n = text.count(old_string)
            if n == 0: return {"error": "old_string not found; re-read and try again."}
            if n > 1:  return {"error": f"old_string matches {n} locations; add context."}
            new_text = text.replace(old_string, new_string, 1)
        Path(file_path).write_text(new_text)
        return {"ok": True, "bytes": len(new_text)}
    return Tool("Edit", "Exact string replacement in a file. Read first.",
                {"type": "object", "properties": {
                    "file_path":   {"type": "string"},
                    "old_string":  {"type": "string"},
                    "new_string":  {"type": "string"},
                    "replace_all": {"type": "boolean", "default": False}},
                 "required": ["file_path", "old_string", "new_string"]},
                run)

def make_bash_tool(session):
    def run(command: str, timeout: int = 120):
        if not session["policy"].allow_bash(command):
            return {"error": f"Blocked by policy: {command}"}
        p = subprocess.run(command, shell=True, capture_output=True,
                           text=True, timeout=timeout, cwd=session["cwd"])
        out = (p.stdout + p.stderr)[-8000:]   # tail-truncate
        return {"exit_code": p.returncode, "output": out}
    return Tool("Bash", "Run a shell command in the working directory.",
                {"type": "object", "properties": {
                    "command": {"type": "string"},
                    "timeout": {"type": "integer", "default": 120}},
                 "required": ["command"]}, run)

# ------------------------------ permissions ------------------------------
@dataclass
class Policy:
    allow:    list[str] = field(default_factory=list)   # globs e.g. "Bash(git *:*)"
    deny:     list[str] = field(default_factory=list)
    mode:     str = "default"   # default | acceptEdits | bypassPermissions

    def allow_bash(self, cmd: str) -> bool:
        for pat in self.deny:
            if re.fullmatch(pat.replace("*", ".*"), f"Bash({cmd})"): return False
        if self.mode == "bypassPermissions": return True
        for pat in self.allow:
            if re.fullmatch(pat.replace("*", ".*"), f"Bash({cmd})"): return True
        return False

# --------------------------------- hooks ---------------------------------
class Hooks:
    def __init__(self): self._pre = []; self._post = []
    def pre_tool_use(self, fn):  self._pre.append(fn);  return fn
    def post_tool_use(self, fn): self._post.append(fn); return fn
    def fire_pre(self, call):
        for fn in self._pre:
            r = fn(call)
            if r and r.get("deny"): return r
        return None
    def fire_post(self, call, result):
        extra = []
        for fn in self._post:
            r = fn(call, result)
            if r and r.get("append"): extra.append(r["append"])
        return extra

# ---------------------------- the agent loop -----------------------------
@dataclass
class RunResult:
    text: str
    turns: int
    cost_usd: float
    stop_reason: str
    session_id: str

def run_agent(prompt: str, *, model: Model, system: str, tools: list[Tool],
              policy: Policy, hooks: Hooks, max_turns: int = 30,
              max_budget_usd: float = 5.0, cwd: Path = Path(".")) -> RunResult:
    session = {"id": str(uuid.uuid4()), "read_files": set(),
               "policy": policy, "cwd": cwd}
    messages = [{"role": "user", "content": prompt}]
    cost = 0.0
    for turn in range(max_turns):
        if cost > max_budget_usd:
            return RunResult("", turn, cost, "max_budget_usd", session["id"])
        resp = model.complete(system, messages, [t.schema for t in tools])
        cost += resp.cost_usd
        messages.append({"role": "assistant", "content": resp.content})
        calls = [b for b in resp.content if b.get("type") == "tool_use"]
        if not calls:
            return RunResult(resp.text, turn, cost, "completed", session["id"])
        results = []
        for call in calls:
            denial = hooks.fire_pre(call)
            if denial:
                results.append({"tool_use_id": call["id"], "error": denial["deny"]})
                continue
            tool = next(t for t in tools if t.name == call["name"])
            try:
                out = tool.run(**call["input"])
            except Exception as e:
                out = {"error": f"{type(e).__name__}: {e}"}
            extra = hooks.fire_post(call, out)
            results.append({"tool_use_id": call["id"], "content": json.dumps(out)})
            for msg in extra:
                results.append({"role": "user", "content": msg})
        messages.append({"role": "user", "content": results})
    return RunResult("", max_turns, cost, "max_turns", session["id"])

# --------------------------------- usage ---------------------------------
if __name__ == "__main__":
    session = {"read_files": set(), "cwd": Path("."), "policy": Policy(
        allow=["Bash(git .*)", "Bash(npm test)", "Bash(ruff .*)"],
        deny=["Bash(rm -rf .*)", "Bash(curl .* \\| sh)"],
        mode="default")}
    tools = [make_read_tool(session), make_edit_tool(session), make_bash_tool(session)]
    hooks = Hooks()

    @hooks.post_tool_use
    def lint_after_edit(call, result):
        if call["name"] != "Edit": return None
        f = call["input"]["file_path"]
        if not f.endswith(".py"): return None
        p = subprocess.run(f"ruff check {f}", shell=True, capture_output=True, text=True)
        if p.returncode != 0:
            return {"append": f"ruff failed on {f}:\n{p.stdout}"}

    out = run_agent(
        "Fix the failing tests in src/auth.py",
        model=Model("claude-sonnet-4-6"),
        system=open("system.md").read(),
        tools=tools, policy=session["policy"], hooks=hooks,
    )
    print(out)
```

This is intentionally minimal. The reason it works is not the cleverness of the loop — it's that every component (tools, policy, hooks, verification) has a clear job and a clear seam between them. You can swap the model, swap the tools, tighten the policy, or add a new verifier without touching anything else.

---

## 11. A checklist before you ship

Run this list before you put a harness in front of users.

**Loop and budget**
- [ ] Hard cap on `max_turns`.
- [ ] Hard cap on `max_budget_usd`.
- [ ] Stop reason is captured and surfaced in every result.
- [ ] Loop has been tested to terminate cleanly on `Ctrl-C`.

**Tools**
- [ ] Every tool has a description that includes when *not* to use it.
- [ ] Tool errors are actionable — they tell the model how to recover.
- [ ] Read-only tools are marked as such and run in parallel.
- [ ] All tool output is truncated with explicit elision markers.

**Context**
- [ ] System prompt is < 3,000 tokens and byte-stable for caching.
- [ ] `AGENTS.md` exists, is < 200 lines, and points outward to docs.
- [ ] Tool definitions are loaded once and reused across requests.
- [ ] Compaction strategy is defined and tested.

**Permissions**
- [ ] Allow-list and deny-list are version-controlled.
- [ ] Default mode is *not* `bypassPermissions`.
- [ ] Destructive actions (delete, push, network egress) require confirmation.
- [ ] Pre-tool-use hooks block obviously dangerous shell patterns.
- [ ] Tool output is treated as untrusted text, not instructions.

**Verification**
- [ ] At least one fast verifier (linter or type-checker) runs after every edit.
- [ ] At least one slow verifier (tests) gates the "done" state.
- [ ] Reviewer sub-agent (if used) has read-only tools only.

**Observability and evals**
- [ ] Full message array is logged per turn to disk.
- [ ] Per-turn cost and latency are metric-able.
- [ ] An eval suite of ≥ 20 cases exists and is run on every harness change.
- [ ] Eval results gate merges to the harness.

---

## 12. Closing notes on the leak

The most useful thing about the Claude Code leak — once you set aside the gossip about codenames and feature flags — is that it confirmed how *small* a state-of-the-art agent harness actually is. The loop is ~88 lines. The clever stuff is in the tools, the prompt, the permissions, and the verifier loop. There is no secret sauce: there is just a lot of careful taste applied to a surprisingly small surface area.

The other useful thing it confirmed is the inverse: harness quality is now the dominant variable in agent performance. Two teams running the same model can land 40 points apart on the same eval suite based on the harness alone. That gap is where your engineering effort goes.

Build small. Verify constantly. Treat the model as a stateless function and the harness as the operating system. And measure everything.

---

## Sources

Background on the agent-harness concept:
- [Harness engineering for coding agent users — Martin Fowler](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)
- [What is an agent harness — Parallel Web Systems](https://parallel.ai/articles/what-is-an-agent-harness)
- [Harness Engineering — Epsilla blog (Mar 2026)](https://www.epsilla.com/blogs/2026-03-12-harness-engineering)
- [Agent Engineering: Harness Patterns — Morph LLM](https://www.morphllm.com/agent-engineering)
- [The Anatomy of an Agent Harness — LangChain](https://blog.langchain.com/the-anatomy-of-an-agent-harness/)
- [Skill Issue: Harness Engineering for Coding Agents — HumanLayer](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents)
- [Harness engineering: leveraging Codex in an agent-first world — OpenAI](https://openai.com/index/harness-engineering/)
- [Agent Harness Engineering Guide [2026] — QubitTool](https://qubittool.com/blog/agent-harness-evaluation-guide)
- [Building Long-Running AI Agent Harnesses — Atal Upadhyay](https://atalupadhyay.wordpress.com/2026/03/26/building-long-running-ai-agent-harnesses/)

Claude Agent SDK reference:
- [How the agent loop works — Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/agent-loop)
- [How Claude Code works — Claude Code Docs](https://code.claude.com/docs/en/how-claude-code-works)

Coverage and analysis of the March 31, 2026 Claude Code leak:
- [Claude Code's source code appears to have leaked — VentureBeat](https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know)
- [Claude Code Source Leaked via npm Packaging Error — The Hacker News](https://thehackernews.com/2026/04/claude-code-tleaked-via-npm-packaging.html)
- [Claude Code's source reveals extent of system access — The Register](https://www.theregister.com/2026/04/01/claude_code_source_leak_privacy_nightmare/)
- [Claude Code Source Code Leak: 8 Hidden Features — MindStudio](https://www.mindstudio.ai/blog/claude-code-source-code-leak-8-hidden-features)
- [Claude Code Architecture Explained — DEV Community](https://dev.to/brooks_wilson_36fbefbbae4/claude-code-architecture-explained-agent-loop-tool-system-and-permission-model-rust-rewrite-41b2)
- [Comprehensive Analysis of Claude Code Source Leak — sabrina.dev](https://www.sabrina.dev/p/claude-code-source-leak-analysis)
- [Claude Code Source Leak: 7 Agent Architecture Lessons — Particula](https://particula.tech/blog/claude-code-source-leak-agent-architecture-lessons)
- [Diving into Claude Code's Source Code Leak — Engineer's Codex](https://read.engineerscodex.com/p/diving-into-claude-codes-source-code)
- [System prompt archive (Anthropic, OpenAI, Google) — GitHub](https://github.com/asgeirtj/system_prompts_leaks)
