# Agent Teams: Master Guide

Source: https://code.claude.com/docs/en/agent-teams (reviewed 2026-11-09). Agent teams are experimental, so re-check the source page if behavior seems different.

Purpose: a reference for deciding when to use an agent team on this project (a React + Vite personal website), and how to set one up and run it well.

---

## 1. What an agent team is

Several Claude Code sessions work together on one task.

| Component | Role |
| :- | :- |
| **Team lead** | The main session. Spawns teammates, assigns tasks, synthesizes results. Fixed for the session's lifetime. |
| **Teammates** | Separate Claude Code instances, each with its own context window. |
| **Task list** | Shared list of work items (pending, in progress, completed; tasks can depend on others and show as blocked). |
| **Mailbox** | Messaging between agents. Stored at `~/.claude/teams/{team-name}/inboxes/{agent-name}.json`. |

Teammates can message each other directly, and you can message any teammate directly without going through the lead.

Storage:
- Team config: `~/.claude/teams/{team-name}/config.json`. Removed when the session ends. Do not hand-edit it; changes get overwritten.
- Task list: `~/.claude/tasks/{team-name}/`. Stays on disk after the session. Retention is set by `cleanupPeriodDays`.
- Team name is `session-` plus the first 8 characters of the session ID.
- There is no project-level team config. A file like `.claude/teams/teams.json` is ignored.

---

## 2. Enabling (already done for this project)

Teams are off by default. This project enables them in `.claude/settings.local.json` (git-ignored):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Side effect to remember: with teams enabled, any subagent Claude gives a `name` launches as a teammate, even if you did not ask for a team, and Claude Code does not ask you to confirm. To go back to plain subagents, set the variable to `"0"`. The change applies to the running session on save, with no restart. Higher-precedence sources (project settings, `--settings`, managed settings) can still override it.

Teammates are not spawned in non-interactive mode (`claude -p`, Agent SDK).

---

## 3. Team or something lighter?

| | Subagents | Agent teams |
| :- | :- | :- |
| Communication | Report back to the caller | Teammates message each other |
| Coordination | Main agent manages everything | Shared task list plus messaging |
| Best for | Focused tasks where only the result matters | Work needing discussion, challenge, collaboration |
| Token cost | Lower | Much higher (each teammate is a full instance) |

Other lighter options: cross-session messaging (sessions you run yourself pass findings to each other) and git worktrees (manual parallel sessions).

**Use a team when** parallel exploration adds real value:
- Research and review, with different lenses on the same thing
- New modules or features where each teammate owns separate files
- Debugging with competing hypotheses
- Cross-layer changes (UI, data, tests), each owned by one teammate

**Do not use a team for** sequential tasks, same-file edits, work with many dependencies, or routine tasks. One session or a subagent is cheaper and usually faster.

Quick decision rule: if teammates would not need to talk to each other, use subagents. If the work cannot be split by file ownership, use one session.

---

## 4. Starting a team

Describe the task and the teammates you want in plain language. Name the roles, the count, and (optionally) the model.

```text
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Spawn three teammates to explore this from different angles:
one on UX, one on technical architecture, one playing devil's advocate.
```

Notes:
- Claude may use subagents instead of a team. The agent panel looks the same for both. If you wanted a team, say "agent team" explicitly and ask again.
- Tell the lead what to call each teammate (for example "name them `ui`, `content`, `a11y`"). Predictable names make later prompts easy ("ask `a11y` to shut down").
- Teammates load CLAUDE.md, MCP servers, and skills like a normal session. They do **not** get the lead's conversation history. Put task details in the spawn prompt.

### Spawn prompt checklist

1. The goal and the deliverable (what "done" looks like).
2. Exact files or directories the teammate owns.
3. Files it must not touch.
4. Relevant constraints (stack, conventions, existing decisions).
5. How to report back (severity ratings, a findings file, a summary).

Example:

```text
Spawn a security reviewer teammate with the prompt: "Review the authentication module
at src/auth/ for security vulnerabilities. Focus on token handling, session
management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

---

## 5. Controlling the team

### Display modes

| Mode | What it does | Needs |
| :- | :- | :- |
| `in-process` (default) | All teammates inside your terminal | Nothing |
| `auto` | Split panes if already in tmux or iTerm2 with `it2`, else in-process | tmux or iTerm2 |
| `tmux` | Split panes, auto-detects tmux vs iTerm2 | tmux or iTerm2 + `it2` |
| `iterm2` | iTerm2 native panes | `it2` CLI, Python API enabled in iTerm2 settings |

Set globally in `~/.claude/settings.json`:

```json
{ "teammateMode": "auto" }
```

Or per session: `claude --teammate-mode auto` (experimental flag, not in `--help`).

Split panes do not work in VS Code's integrated terminal, Windows Terminal, or Ghostty. On macOS, `tmux -CC` inside iTerm2 is the suggested entry point.

### Agent panel keys (in-process)

- Up/Down: select a teammate
- Enter: open its transcript and message it
- Esc: clear selection (while viewing a teammate, interrupts its current turn)
- `x` on a selected teammate: stop it
- Ctrl+T: toggle the task list
- Shift+Tab (while viewing a teammate): cycle its permission mode

Idle teammates hide from the panel 30 seconds after everything goes idle and return on their next turn. They are still running. More than three idle rows collapse into one "N idle agents" row.

Within a teammate's view: plain text and skills go to the teammate. `/compact`, `/clear`, `/rewind` act on the lead (with a confirmation). `/model` and `/fast` do not run from that view.

### Models

Per-teammate model, first match wins:
1. The model named in your spawn prompt
2. The `model` in the subagent definition used (`inherit` means the lead's)
3. `CLAUDE_CODE_SUBAGENT_MODEL`, if set and not `inherit`
4. The lead's model

`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` skips 1 and 2 (v2.1.257+). `teammateDefaultModel` no longer exists. A teammate's model is fixed at spawn.

Example: "Spawn 4 teammates to refactor these modules in parallel. Use Sonnet for each teammate."

Cost tip: use a cheaper model for mechanical teammates and keep the lead on the strongest model.

### Plan before implementing

Put the lead into plan mode first, then ask for the teammate. A teammate spawned in plan mode stays in plan mode until its plan is ready, then sends an approval request to the lead.

Caveat: if you have not changed the teammate's permission mode, Claude Code auto-approves the plan on arrival without the lead reviewing it. Only if you put a running in-process teammate in plan mode yourself (Shift+Tab) does the lead actually review the plan. Do not rely on automatic plan approval as a safety gate.

### Tasks

- Lead assigns: tell it which task goes to which teammate.
- Self-claim: a finished teammate takes the next unassigned, unblocked task. Claiming uses file locking, so there are no races.
- Teammates do not self-claim blocked tasks. You or the lead can still assign them.
- Dependencies unblock automatically when the blocking task completes.
- Agents without the Task tools coordinate by messages only.
- If the lead is not making enough tasks, ask it to split the work smaller. Aim for about 5-6 tasks per teammate.

### Shutdown

"Ask the researcher teammate to shut down." The teammate can approve or reject with a reason. Shared directories clean up when the session ends.

---

## 6. Reusable roles: subagent definitions

Define a role once in `.claude/agents/<name>.md` and use it both as a subagent and as a teammate:

```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

What carries over to a teammate:

| Field | In-process teammate | Split-pane teammate |
| :- | :- | :- |
| `tools` | Applied (plus `SendMessage` and Task tools added) | Applied |
| `model` | Used if the spawn prompt names none | Same |
| `disallowedTools` | Applied | Not applied |
| `effort` | Applied | Not applied |
| `autoCompactWindow` | Applied (v2.1.296+) | Ignored |
| Body | Appended to the default system prompt | Replaces the default system prompt |
| `skills` | Ignored (loads from project/user settings) | Ignored |
| `mcpServers` | Ignored (loads from project/user settings) | Applied |

A revived in-process teammate only gets a project-defined agent back if you have trusted the exact folder containing the agent file (trusting a parent does not count).

Candidate roles for this project (not created yet): `ui-builder`, `content-writer`, `a11y-reviewer`, `perf-reviewer`.

---

## 7. Permissions

- Teammates start in the lead's permission mode. You cannot set modes per teammate at spawn. If the lead is in `dontAsk`, teammates start in Manual.
- An in-process teammate follows the lead's mode when the lead is in `acceptEdits`, `auto`, or `bypassPermissions`, even if its status bar says Manual. To make it ask, switch the lead to Manual too.
- Teammate permission prompts show up in the lead's session. You approve them there.
- `--disallowedTools`, `--tools`, `--allowedTools` apply to in-process teammates. For split-pane teammates, `--allowedTools` is not passed along. Use `permissions.allow` via `--settings` instead:
  `claude --settings '{"permissions":{"allow":["Bash(npm *)"]}}'`
- Pre-approve common safe commands (for example `npm run *`, `git status`, `git diff`) before spawning to cut prompt noise.
- Messages between agents are tagged as coming from another Claude session. A teammate cannot grant consent on your behalf or relay a denied action to get around a check. In auto mode, the classifier reviews each inter-agent message before delivery.

---

## 8. Quality gates with hooks

| Hook | Fires | Exit code 2 does |
| :- | :- | :- |
| `TeammateIdle` | Teammate about to go idle | Sends feedback, keeps it working |
| `TaskCreated` | Task being created | Blocks creation, sends feedback |
| `TaskCompleted` | Task being marked complete | Blocks completion, sends feedback |

Good fit for this project: a `TaskCompleted` hook that runs `npm run build` and the linter, so no task is marked done while the build or lint fails.

---

## 9. Best practices

- **Team size:** start with 3-5 teammates. Three focused teammates beat five scattered ones. Token cost grows roughly linearly with teammates.
- **Task size:** each task should be a self-contained unit with a clear deliverable (a component, a test file, a review). Too small wastes coordination effort. Too large means long stretches with no check-in.
- **File ownership:** two teammates editing the same file overwrite each other. Assign each teammate its own files or directories. Shared files (`App.jsx`, `package.json`, router config, global CSS) belong to one owner, usually the lead.
- **Start with read-only work** when new to teams: PR review, library research, bug investigation.
- **Make adversarial roles explicit** for debugging. Tell teammates to try to disprove each other's theories. This avoids anchoring on the first plausible cause.
- **Make the lead wait.** If it starts implementing itself, say: "Wait for your teammates to complete their tasks before proceeding."
- **Monitor and steer.** Check in, redirect, and do not leave a team running unattended for long.
- **Give context in the spawn prompt.** Teammates do not inherit conversation history.
- **Prefer cheaper models** for well-specified, mechanical teammates.

### Token cost notes

- Each teammate is a full session. Costs add up fast.
- In-process teammate prompt cache lasts 5 minutes by default. Set `subagentPromptCacheTtl` to `1h` to hold it longer (1-hour cache writes cost more).
- If a single session can do it, use a single session.

---

## 10. Prompt templates

### Parallel review

```text
Spawn three teammates to review PR #<n>:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Competing hypotheses (debugging)

```text
<Describe the bug>. Spawn 5 agent teammates to investigate different hypotheses.
Have them talk to each other to try to disprove each other's theories, like a
scientific debate. Update the findings doc with whatever consensus emerges.
```

### Parallel feature build with file ownership (website example)

```text
Create an agent team of 3 teammates named `layout`, `pages`, and `styles`.
- layout owns src/components/layout/* (Header, Footer, Nav)
- pages owns src/pages/* (Home, About, Projects, Contact)
- styles owns src/styles/* and src/index.css
Nobody edits files outside their ownership. Route changes in src/App.jsx go
through the lead. Use Sonnet for each teammate. Each teammate should run
`npm run build` before marking a task complete. Wait for all teammates to
finish before you summarize.
```

### Design exploration

```text
Spawn three teammates to explore the visual design of my personal site from
different angles: one on layout and navigation, one on typography and color,
one playing devil's advocate on accessibility and performance. Have them
report to a shared findings doc at docs/design-findings.md.
```

---

## 11. Troubleshooting

| Symptom | Fix |
| :- | :- |
| Teammates not appearing | Use Up/Down in the agent panel. Idle rows may be hidden (message the teammate by name to bring it back). The task may be too small for Claude to bother with a team, so ask explicitly. For split panes, check `which tmux` or the `it2` CLI and the iTerm2 Python API setting. |
| Claude used subagents, not a team | Re-ask and say "agent team" explicitly. The agent panel looks the same for both. |
| Teams forming unasked | Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `0`. Applies immediately. |
| Too many permission prompts | Pre-approve common operations in permission settings before spawning. |
| Teammate stopped early after an error | Open its transcript and give instructions, or spawn a replacement. A message from the lead wakes a teammate that is waiting to retry an API call. |
| Lead declared done too early | Tell it to keep going. |
| Task stuck "in progress" | Teammates sometimes fail to mark tasks complete. Verify the work, then update the status manually or have the lead nudge. |
| Orphaned tmux session | `tmux ls`, then `tmux kill-session -t <session-name>`. |
| Mailbox write error | See the "Failed to write to a teammate's inbox" entry in the Claude Code errors doc (usually disk space or permissions). |

---

## 12. Known limitations

- `/resume` and `/rewind` do not restore in-process teammates. After resuming, the lead may message teammates that no longer exist. Tell it to spawn new ones.
- Task status can lag behind reality.
- Shutdown can be slow (teammates finish their current call first).
- One team per session. No extra named teams, no sharing across sessions.
- No nested teams. Only the lead spawns teammates.
- In-process teammates cannot run background subagents (`background: true` and `run_in_background` fail or run in the foreground).
- The lead cannot be changed or handed off.
- No per-teammate permission mode at spawn.
- Split panes need tmux or iTerm2.

---

## 13. Pre-flight checklist

Before spawning a team on this project:

- [ ] A team is really needed (see section 3). Otherwise use one session or subagents.
- [ ] `git status` is clean, or work is committed, so teammate changes are easy to review and revert.
- [ ] Work is split by file ownership, and shared files have a single owner.
- [ ] Each teammate has a name, a role, an owned file list, and a clear deliverable.
- [ ] Spawn prompts carry all needed context (teammates do not see this conversation).
- [ ] Team size is 3-5. Models chosen deliberately.
- [ ] Common safe commands are pre-approved (`npm run build`, `npm run lint`, `git diff`).
- [ ] Quality gate decided (for example a `TaskCompleted` hook running the build).
- [ ] Lead told to wait for teammates and to summarize at the end.
- [ ] Plan for steering: check in on teammates periodically.

After the team finishes: review `git diff`, run `npm run build` and `npm run lint`, then commit.

---

## 14. Related docs

- Subagents: https://code.claude.com/docs/en/sub-agents.md
- Cross-session messaging: https://code.claude.com/docs/en/cross-session-messaging.md
- Hooks: https://code.claude.com/docs/en/hooks.md
- Permission modes: https://code.claude.com/docs/en/permission-modes.md
- Costs (agent team token costs): https://code.claude.com/docs/en/costs.md
- Git worktrees: https://code.claude.com/docs/en/worktrees.md
- Full docs index: https://code.claude.com/docs/llms.txt
