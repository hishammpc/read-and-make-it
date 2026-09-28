# Lessons

## Restyles must not swap one visual component for another
**Rule:** A restyle or "move to tokens" pass changes colour, spacing, type and strings — it never replaces a component with a different kind (ring → bar, chart → table, tabs → sections). If a component is hard to move onto tokens, fix the component, don't drop it.

**Why:** In UI phase 3 a delegated pass replaced the leaderboard progress rings with flat bars because `CircularProgress` used hex colours. Hazman had to spot it. The agent even reported "circular-progress is no longer used", and I read that as cleanup instead of as a regression signal.

**How to apply:**
- Put "preserve every existing component type; only restyle it" in every restyle brief.
- Before reporting a restyle done, diff imports against the last commit: `git grep -hoE "from '@/components/[^']+'" HEAD -- src` vs the working tree — anything no longer imported was swapped out, not "cleaned up". Also compare counts of `<Progress`, `<CircularProgress`, chart and tab components.
- Treat "X is now unused, can be deleted" in a subagent report as a question to verify, not a finding to accept.
