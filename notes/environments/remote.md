# Remote Environment Workflow

These rules apply when the agent is running in a remote / managed environment
(`CLAUDE_CODE_REMOTE=true`) — e.g. Claude Code on the web or Managed Agents.
See [`agents.md`](./agents.md) for how the environment is detected.

In a remote session there is no human at the terminal to nudge things along,
so the agent is responsible for landing each task end-to-end.

## One issue, one PR

- **Every unit of work has a corresponding GitHub issue.** If no issue exists
  for the work you are about to do, file one first describing the change and
  the acceptance criteria. Do not start coding against an undocumented task.
- **Every unit of work ends with a pull request.** Pushing a branch is not
  enough — open a PR against the base branch.
- **The PR must auto-close its issue when merged.** Include a closing keyword
  in the PR body (e.g. `Closes #123` or `Fixes #123`) so GitHub links the two
  and closes the issue automatically on merge. One issue per PR; if the work
  fans out, file follow-up issues and link them, don't bundle them.

## Before declaring the work complete

A PR in a remote session is not finished until **both** of the following are
true:

1. **CI is green.** All required checks on the PR must pass. After pushing,
   watch the checks; if any fail, diagnose, fix, and push again. Do not hand
   off a PR with red or still-pending required checks.
2. **The PR is in a mergeable state.** No conflicts with the base branch. If
   the base has moved and conflicts exist, rebase (or merge) the base into
   your branch, resolve the conflicts, and push. The PR's mergeability status
   on GitHub must be `MERGEABLE`, not `CONFLICTING` or `UNKNOWN`.

Only once both conditions hold should the task be treated as complete. If
either drifts later (e.g. a new commit on `main` introduces a conflict, or a
flaky check goes red on a re-run), it is still your responsibility to bring
the PR back to a green, mergeable state before signing off.
