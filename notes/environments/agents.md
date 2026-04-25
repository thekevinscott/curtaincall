# Agent Environments

Agents may operate in different environments. Behavior should adapt accordingly.

## Detecting a remote environment

Claude Code on the web — and other Anthropic-managed agent runtimes such as
Managed Agents — runs in a cloud sandbox that exports the environment variable
`CLAUDE_CODE_REMOTE=true`. The session ID is also exposed as
`CLAUDE_CODE_REMOTE_SESSION_ID`, which can be used to construct a link back to
the session at `https://claude.ai/code/${CLAUDE_CODE_REMOTE_SESSION_ID}`.

To check whether you are running in a remote environment, inspect that
variable:

```bash
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo "running in a remote/managed environment"
fi
```

Reference: [Use Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)
— the docs explicitly recommend `CLAUDE_CODE_REMOTE` as the way to distinguish
local from cloud execution.

## When operating in a remote environment

**If `CLAUDE_CODE_REMOTE` is `true`, read [`remote.md`](./remote.md) first**,
before doing any work. It contains the rules that apply specifically to remote
sessions — issue tracking, PR flow, CI, and merge state — which differ from
the assumptions of a local interactive session.
