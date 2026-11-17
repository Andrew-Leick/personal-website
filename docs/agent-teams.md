# Agent Teams: How to Use Them Well

Source: [code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams), plus the `TaskCompleted` and `TeammateIdle` sections of [hooks](https://code.claude.com/docs/en/hooks). Reviewed 2026-11-16. Agent teams are **experimental**. If something behaves differently from this guide, re-read the source page.

This guide is for this repo: a React 19 + Vite site with CSS Modules, content in `src/data/*.json`, and a `content` / `ui` / `qa` split already used in `docs/spec/` and `docs/handoff/`.

---

## 1. The 30-second version

- A **team** is several Claude Code sessions working on one task. One session is the **lead**. The others are **teammates**, each with its own context window. Teammates share a **task list** and **message each other directly**.
- Use a team when parallel work **and talking to each other** both add value. If workers only need to report back, use **subagents**. If the work is sequential or touches the same files, use **one session**.
- Teams cost far more tokens. Every teammate is a full Claude instance.
- Start with **3–5 teammates** and **5–6 tasks per teammate**. Give each teammate **its own files**.
- Teammates **don't see your conversation with the lead**. Put everything they need in the spawn prompt.

---

## 2. Enabling (done)

Teams are off by default. They are enabled in two places:

| File | Scope |
| :- | :- |
| `~/.claude/settings.json` | Every project on this machine |
| `.claude/settings.local.json` | This repo only (git-ignored) |

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Things to know once this is on:

- **Teams can form when you didn't ask for one.** When Claude calls the Agent tool with a `name`, it launches a teammate instead of a subagent. Claude sometimes names subagents on its own so it can message them later, and Claude Code doesn't ask you first. The exceptions are forks and calls that pass `isolation`.
- **To get plain subagents back**, set the variable to `"0"`. Saving the settings file applies the change to the running session, so there's no need to restart. `.claude/settings.local.json` sets `"1"` and takes precedence over the user file, so setting `"0"` only in `~/.claude/settings.json` won't win here. Change `.claude/settings.local.json` too. Managed settings beat everything.
- **Interactive sessions only.** `claude -p` and Agent SDK sessions never spawn teammates. A named subagent runs as an ordinary subagent there.

---

## 3. Should this be a team?

| | Subagents | Agent team |
| :- | :- | :- |
| Context | Own window, and the result goes back to the caller | Own window, fully independent |
| Communication | Report to the caller (named subagents can message each other) | Teammates message each other by name |
| Coordination | The main agent manages everything | Shared task list plus messages |
| Best for | Focused jobs where only the result matters | Work that needs discussion, challenge or hand-offs |
| Token cost | Lower (results get summarized) | Higher (each teammate is a full instance) |

**Good team tasks** (from the source page):
- **Research and review:** different lenses on the same thing, challenging each other's findings
- **New modules or features:** each teammate owns a separate piece
- **Debugging with competing hypotheses:** teammates try to disprove each other
- **Cross-layer changes:** for example content pipeline, UI and QA, each with one owner

**Bad team tasks:** sequential steps, edits to the same file, work with many dependencies, routine changes.

**Lighter options:** [subagents](https://code.claude.com/docs/en/sub-agents.md), [cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging.md) between sessions you run yourself, or [git worktrees](https://code.claude.com/docs/en/worktrees.md) for manual parallel sessions.

**Rule of thumb:** if the workers would never need to talk to each other, use subagents. If the work can't be split by file ownership, use one session.

---

## 4. Starting a team

Describe the task, the roles, how many teammates, and optionally their names and models, in plain language:

```text
Create an agent team. Spawn three teammates named ux, architect and skeptic to
explore <problem> from different angles. Use Sonnet for skeptic.
```

- **Say "agent team" explicitly.** Claude sometimes uses subagents instead, and both show up in the same agent panel, so the panel alone doesn't prove a team formed. If you get subagents, ask again.
- **Name the teammates.** The lead names every teammate. If you choose the names, later prompts are easy to write ("ask `qa` to shut down").
- **What a teammate loads:** CLAUDE.md, MCP servers, skills (including `.agents/skills/` here) and the spawn prompt. It does **not** get the lead's conversation history. If you start the lead with `--setting-sources`, teammates use the same restricted sources.

### Spawn-prompt checklist

Each teammate's prompt should include:

1. **Goal and deliverable:** what "done" looks like.
2. **Files it owns:** exact paths or globs.
3. **Files it must not touch,** and who owns them.
4. **Constraints:** the stack, the tokens-only CSS rule, spec IDs to satisfy.
5. **How to verify:** for example `npm run lint && npm test && npm run build`.
6. **How to report:** a severity-rated list, a handoff file, or a message to a named teammate.

---

## 5. Running the team

### Display modes

| `teammateMode` | Behavior | Needs |
| :- | :- | :- |
| (unset) | **In-process.** All teammates run in your terminal. This is the default. | Nothing |
| `"auto"` | Split panes when run inside tmux or iTerm2, otherwise in-process | tmux, or iTerm2 + `it2` |
| `"tmux"` | Panes open in tmux. Outside tmux they open in a separate session: run the command from the `View teammates` line in a second terminal to watch it. | tmux |
| `"iterm2"` | iTerm2's own panes. Teammates start only when Claude Code runs in iTerm2 with `it2` set up. | `it2` CLI and the iTerm2 Python API enabled (Settings > General > Magic) |

Set it in `~/.claude/settings.json` (`{ "teammateMode": "auto" }`) or per session with `claude --teammate-mode auto`. The flag is experimental and missing from `--help`. On macOS, `tmux -CC` inside iTerm2 is the suggested way into tmux.

### Agent panel keys (in-process)

| Key | Action |
| :- | :- |
| Up / Down | Select a teammate |
| Enter | Open its transcript and message it directly |
| Esc | Clear the selection. While viewing a teammate, Esc interrupts its turn. |
| `x` | Stop the selected teammate |
| Ctrl+T | Toggle the task list |
| Shift+Tab (while viewing) | Cycle that teammate's permission mode |

- **Hidden idle rows:** once every agent in the panel is idle, idle rows hide after 30 seconds. They're still running and reachable by name. With more than 3 idle, the extras collapse into an `N idle agents` row, which Enter expands.
- **Typing while viewing a teammate:** plain text and skills go to that teammate. `/compact`, `/clear` and `/rewind` act on the **lead** and ask you to confirm first. `/model` and `/fast` don't run from that view, because a teammate's model is fixed when it spawns.

### Picking models

For each teammate, the first match wins:

1. The model your spawn prompt names
2. The `model` in the subagent definition it uses (`inherit` means the lead's model)
3. `CLAUDE_CODE_SUBAGENT_MODEL`, if set to anything but `inherit`
4. The lead's current model

Notes:
- `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` skips sources 1 and 2 (v2.1.257+).
- `teammateDefaultModel` was removed and is ignored.
- If an org `availableModels` allowlist blocks the choice, Claude Code substitutes another model.
- A teammate on the lead's model inherits the lead's effort level.

**Cost tip:** keep the lead on the strongest model, and use a cheaper one for teammates with mechanical, well-specified jobs.

### Plan before building

Put the **lead** in plan mode first, then spawn the teammate. It stays in plan mode until its plan is ready, then sends an approval request.

⚠️ If you haven't changed that teammate's permission mode, Claude Code **approves the plan automatically** without the lead reviewing it. The lead actually reviews only when you put a running in-process teammate into plan mode yourself with Shift+Tab. Don't treat automatic approval as a safety gate.

### Tasks

- **States:** pending, in progress, completed. A task can depend on other tasks and shows as blocked until they finish. Dependencies unblock automatically.
- **Assignment:** the lead assigns tasks, or a teammate that finishes a task claims the next unassigned, unblocked one. File locking prevents two teammates claiming the same task.
- **Blocked tasks:** teammates won't claim them, but you or the lead can still assign them.
- **Agents without the Task tools** coordinate by messages only.
- **Too few tasks?** Tell the lead to split the work smaller. Aim for 5–6 tasks per teammate.

### Messages and status

- Messages arrive automatically, so nothing needs to poll.
- When a teammate finishes, the lead gets an **idle notification that includes its final answer**. If its turn ended on an API error, the lead gets the error text instead.
- There's no broadcast. To reach everyone, send one message per teammate.
- If Claude messages an in-process teammate that has stopped, Claude Code brings it back with its saved conversation. This doesn't happen after `/resume`.

### Shutting down

> Ask the `qa` teammate to shut down

The teammate can accept, or refuse and explain why. Shutdown waits for its current tool call to finish, which can take a while. Team directories clean up when the session ends.

---

## 6. Reusable roles: subagent definitions

Define a role once in `.claude/agents/<name>.md`, or at user, managed or plugin scope. You can then use it as a subagent or as a teammate:

```text
Spawn a teammate named qa using the qa-reviewer agent type to audit src/components/Pokedex/.
```

| Definition field | In-process teammate | Split-pane teammate |
| :- | :- | :- |
| `tools` | Applied. `SendMessage` and the Task tools are always added. | Applied |
| `model` | Used when the spawn prompt names none | Same |
| `disallowedTools` | Applied (can't remove `SendMessage` or the Task tools) | Not mentioned in the docs |
| `effort` | Applied | Not mentioned in the docs |
| `autoCompactWindow` | Applied (v2.1.296+) | Ignored |
| Body | Added to the default system prompt | **Replaces** the default system prompt |
| `skills` | Ignored (skills load from project and user settings) | Ignored |
| `mcpServers` | Ignored (loads from project and user settings) | Applied |

When Claude Code revives a teammate, it reapplies a definition from `.claude/agents/` only if you've trusted **the exact folder** containing the agent file. Trusting a parent folder doesn't count.

**Roles worth defining for this repo:** `content-engineer` (the data pipeline), `ui-engineer` (components and CSS), `qa-reviewer` (read-only, verifies against spec IDs and uses the `better-*` skills).

---

## 7. Permissions

- **Teammates start in the lead's mode,** including `bypassPermissions`. You can't set a mode per teammate at spawn. If the lead is in `dontAsk`, teammates start in Manual (split-pane needs v2.1.317+).
- **In-process teammates follow the lead's mode** whenever the lead is in `acceptEdits`, `auto` or `bypassPermissions`, even if the teammate's status bar says Manual. To make them ask before editing, switch the **lead** to Manual.
- **Permission prompts appear in the lead's session.** Approve them there.
- **CLI flags:** in-process teammates get the lead's live allow and deny rules (`--allowedTools`, `--disallowedTools`, `--tools`). Split-pane teammates get `--disallowedTools` and `--tools` (v2.1.309+) but **not** `--allowedTools`. For those, use `--settings`:
  ```bash
  claude --settings '{"permissions":{"allow":["Bash(npm run *)","Bash(npm test)","Bash(git diff *)","Bash(git status)"]}}'
  ```
- **Messages between agents are untrusted.** A message from a teammate is labeled as coming from another Claude session. It can't approve prompts on your behalf, and a denied action can't be passed to another teammate to get around the check. In auto mode, the classifier reviews every message between agents before it's delivered.

**Before spawning,** pre-approve the safe commands this repo uses (`npm run lint`, `npm test`, `npm run build`, `npm run validate`, `git status`, `git diff`) to cut down on prompts.

---

## 8. Quality gates with hooks

| Hook | Fires when | Exit 2 does |
| :- | :- | :- |
| `TeammateIdle` | A teammate is about to go idle | Feeds stderr back and keeps it working |
| `TaskCreated` | A task is being created | Blocks the creation and sends feedback |
| `TaskCompleted` | A task is being marked complete, or a teammate ends its turn with tasks still in progress | Keeps the task open and feeds stderr back |

None of these hooks support matchers, so each fires every time. `TaskCompleted` input includes `task_id`, `task_subject` and, optionally, `task_description` and `teammate_name`. It can also return JSON: `{"decision":"block","reason":"…"}` keeps the task open.

Suggested gate for this repo, `.claude/hooks/task-gate.sh`:

```bash
#!/bin/bash
INPUT=$(cat)
SUBJECT=$(echo "$INPUT" | jq -r '.task_subject')
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! OUT=$(npm run lint 2>&1 && npm test 2>&1 && npm run build 2>&1); then
  echo "Checks failing. Fix before completing \"$SUBJECT\":" >&2
  echo "$OUT" | tail -40 >&2
  exit 2
fi
exit 0
```

Register it in `.claude/settings.local.json`:

```json
{
  "hooks": {
    "TaskCompleted": [
      { "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/task-gate.sh", "timeout": 300 }] }
    ]
  }
}
```

`npm run build` already runs `validate`. Keep `npm run ci` (which adds the size and route checks) for the lead's final pass, because it's slow to run on every task.

---

## 9. Best practices

| Practice | Why / how |
| :- | :- |
| **3–5 teammates** | Token cost grows linearly, and so does coordination overhead. Three focused teammates usually beat five scattered ones. For 15 independent tasks, start with 3 teammates. |
| **Right-sized tasks** | Each task should be a self-contained unit with a clear deliverable: a component, a test file, a review. Tasks that are too small cost more to coordinate than they save. Tasks that are too large run a long time without check-ins. |
| **One owner per file** | Two teammates editing one file overwrite each other. See the ownership map in section 10. |
| **Put context in the spawn prompt** | Teammates never see the lead's history. |
| **Start read-only** | Your first teams should review, research or investigate rather than build. |
| **Assign adversarial roles explicitly** | For bugs, tell teammates to disprove each other. This avoids anchoring on the first plausible cause. |
| **Keep the lead from coding** | If it starts implementing, tell it: "Wait for your teammates to complete their tasks before proceeding." |
| **Monitor and steer** | Check transcripts, redirect what isn't working, and don't leave a team unattended for long. |
| **Watch the cache** | An in-process teammate's prompt cache lasts 5 minutes. For long pauses, set `subagentPromptCacheTtl` to `"1h"` (1-hour cache writes cost more). |

---

## 10. This repo: ownership map and templates

### Who owns what

| Owner | Owns | Notes |
| :- | :- | :- |
| `content` | `src/data/*.json`, `src/lib/content/**`, `scripts/**`, `public/` | Data contract, validation, build plugin, route and size checks |
| `ui` | `src/components/**`, `src/pages/**`, `src/hooks/**`, `src/lib/journey/**`, `src/router/**`, `src/styles/base.css`, `src/styles/themes/*` | Use tokens only, with no literal colors or sizes |
| `qa` | `docs/qa/**` (writes); everything else is read-only | Verifies spec IDs, runs `npm run ci`, uses the `better-*` skills |
| **lead** | `src/App.jsx`, `src/main.jsx`, `src/styles/tokens.css`, `index.html`, `vite.config.js`, `package.json`, `package-lock.json`, `docs/spec/**` | Shared files with one owner. Teammates send change requests to the lead. |

Hand-offs go in `docs/handoff/<owner>-status-vN.md`, following the existing pattern.

### Template: build a spec version (content / ui / qa)

```text
Create an agent team to implement docs/spec/SPEC-v6.md. Spawn three teammates:
- content (Sonnet): owns src/data/*.json, src/lib/content/**, scripts/**. Implements
  the data contract and validation, then writes docs/handoff/backend-status-v6.md
  and messages ui when the contract is ready.
- ui: owns src/components/**, src/pages/**, src/hooks/**, src/lib/journey/**,
  src/styles/base.css and themes/. CSS uses tokens only. Writes
  docs/handoff/frontend-status-v6.md.
- qa (read-only except docs/qa/): once both handoffs exist, verifies every V6 ID,
  runs `npm run ci`, writes docs/qa/REPORT-v6.md and messages failures to the owner.
I own App.jsx, tokens.css, package.json and docs/spec/; send me change requests.
Each teammate runs `npm run lint && npm test && npm run build` before marking a
task complete. Wait for all three to finish, then summarize.
```

### Template: fix the interface-review findings

```text
Create an agent team of 3 to fix the findings from the interface review:
- dex: owns src/components/Pokedex/**. Findings: cap the screen height, open
  past the closed cover, fix the title overflow at 320px.
- polish: owns every other *.module.css plus src/styles/base.css. Findings:
  wrap :hover rules in @media (hover: hover), restyle the theme toggle, gate
  the 20vh section padding behind prefers-reduced-motion: no-preference.
- js: owns src/hooks/useTheme.js and src/components/Contact/Contact.jsx. Findings:
  suppress transitions during the theme switch, show copy-failure recovery text.
Token changes (tokens.css) come to me as requests. Use the better-ui and
better-layout skills for exact values. Run lint, test and build before completing tasks.
```

### Template: parallel review (read-only, a good first team)

```text
Create an agent team to review the site. Spawn three read-only teammates:
- a11y: keyboard, focus, reduced motion, contrast (better-accessibility skill)
- motion: animation timing, reduced-motion fallbacks, jank (review-animations skill)
- perf: bundle size vs `npm run check:size`, image weight, font loading
Each writes findings with severity and file:line to docs/qa/review-<name>.md.
Have them challenge each other's HIGH findings before reporting.
```

### Template: competing hypotheses (debugging)

```text
<Describe the bug, e.g. "the rail ball sometimes lands in the wrong slot after a
deep link">. Spawn 4 agent teammates, each investigating a different hypothesis
(scroll timeline, glide timing, measurement on resize, router hash handling).
Have them message each other to try to disprove each other's theories, like a
scientific debate. Write the consensus to docs/qa/debug-<topic>.md. No code changes.
```

---

## 11. Troubleshooting

| Symptom | Fix |
| :- | :- |
| Teammates not appearing | Use Up/Down in the agent panel. Idle rows may be hidden, so message the teammate by name. The task may be too small for Claude to form a team, so ask explicitly. For split panes, check `which tmux`, or the `it2` CLI and the iTerm2 Python API setting. |
| Got subagents, wanted a team | Ask again and say "agent team". |
| Teams forming unasked | Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `"0"` in **`.claude/settings.local.json`** (it outranks the user file). It applies on save. |
| Too many permission prompts | Pre-approve commands (section 7) before spawning. |
| Teammate stopped after an error | Open its transcript and give instructions, or spawn a replacement. A message wakes a teammate that's waiting to retry an API call. |
| Lead declared done too early | Tell it to keep going. |
| Task stuck "in progress" | Teammates sometimes forget to mark tasks complete. Check the work, then update the task or have the lead nudge the teammate. |
| After `/resume`, the lead messages teammates that don't exist | In-process teammates aren't restored. Tell the lead to spawn new ones. |
| Orphaned tmux session | `tmux ls`, then `tmux kill-session -t <name>` |
| "Failed to write to a teammate's inbox" | Usually disk space or directory permissions. See the [errors doc](https://code.claude.com/docs/en/errors.md#failed-to-write-to-a-teammate-inbox). |

---

## 12. Limitations

- **Resuming:** `/resume` and `/rewind` don't restore in-process teammates.
- **Task status:** can lag behind the actual work.
- **Shutdown:** slow. A teammate finishes its current request or tool call first.
- **One team per session:** you can't create more named teams or share one across sessions.
- **No nested teams:** only the lead spawns teammates.
- **No background subagents for in-process teammates:** `background: true` errors, and `run_in_background` errors or quietly runs in the foreground.
- **Fixed lead:** you can't promote a teammate or hand over leadership.
- **No per-teammate permission mode at spawn.**
- **Split panes:** require tmux or iTerm2.
- **No project team config:** the team config at `~/.claude/teams/{team}/config.json` is runtime state that gets overwritten, so don't hand-edit it. A file like `.claude/teams/teams.json` is just an ordinary file. Use subagent definitions for reusable roles.

**Storage, for reference:** the team name is `session-` plus the first 8 characters of the session ID. Mailboxes are at `~/.claude/teams/{team}/inboxes/{agent}.json`. The team config is deleted when the session ends. The task list at `~/.claude/tasks/{team}/` stays until `cleanupPeriodDays` removes it.

---

## 13. Pre-flight checklist

- [ ] A team is really needed (section 3).
- [ ] `git status` is clean, or the work is committed, so teammate changes are easy to review and revert.
- [ ] Work is split by the ownership map. Shared files have one owner.
- [ ] Every teammate has a name, a role, its owned paths, a deliverable and a verification command.
- [ ] Spawn prompts carry all the context they need.
- [ ] 3–5 teammates, with models chosen on purpose.
- [ ] Safe commands are pre-approved. The quality-gate hook is decided.
- [ ] The lead is told to wait for teammates and summarize at the end.
- [ ] You'll check in periodically.

**Afterwards:** review `git diff`, run `npm run ci`, then commit.

---

## 14. Related docs

- Subagents: https://code.claude.com/docs/en/sub-agents.md
- Cross-session messaging: https://code.claude.com/docs/en/cross-session-messaging.md
- Hooks (TaskCompleted, TeammateIdle, TaskCreated): https://code.claude.com/docs/en/hooks.md
- Permission modes: https://code.claude.com/docs/en/permission-modes.md
- Settings reference (`teammateMode`, `subagentPromptCacheTtl`, `cleanupPeriodDays`): https://code.claude.com/docs/en/settings-reference
- Agent team token costs: https://code.claude.com/docs/en/costs.md#agent-team-token-costs
- Git worktrees: https://code.claude.com/docs/en/worktrees.md
- Docs index: https://code.claude.com/docs/llms.txt
