# Agent Performance Reviews

An optional convention: give each persona agent a `performance/` log of
dated reviews, co-located with its definition:

```
.claude/agents/
  osama.md
  osama/
    performance/
      2026-06-29.md           # one review per file, named by date (YYYY-MM-DD)
```

(If you prefer nesting the definition alongside its log instead of keeping
definitions flat, `.claude/agents/osama/osama.md` works identically — every
agent file in this folder checks for its performance log conditionally, so
either layout is fine.)

## How it works

- Every agent's prompt instructs it to **check for its own `performance/`
  folder before starting work, and read it if present**, so it walks in
  knowing its strengths and what to improve. Because the check is
  conditional, agents work fine with no log at all — this is additive, not
  required.
- After an agent finishes a notable task, write a review for it. One file
  per review, named `YYYY-MM-DD.md` (suffix `-2`, `-3` if multiple land on
  the same day).
- Reviews are honest, specific, and actionable. Praise the real strengths;
  make the "areas to improve" concrete enough that the agent can act on them
  next run.
- Christian's routing/dispatch logic writes a one-line dated review for the
  worker it just aggregated status from, as part of closing out that
  worker's task. That's the mechanism that keeps this log fed without extra
  process.

## Review template

```markdown
# Performance Review — <Name> (<Role>)

## <YYYY-MM-DD> · <short task / issue title>

**Rating: X / 10**

**Issue / Task:** one-line description of what was assigned.

### Strengths
- What they did genuinely well, with specifics.

### Areas to improve
- Concrete, actionable gaps. Name the better move, not just the miss.

### Action items
- Short, do-this-next-time bullets.

### Summary
One or two lines of overall verdict.
```
