@AGENTS.md

## Working in this repo

- Work on `main`. Don't open a side branch unless I ask for one.
- Commit as **Rohan Mukka <rohanmukka09@gmail.com>** — author and committer.
  Set it at the start of a session if the environment hasn't:
  `git config user.name "Rohan Mukka" && git config user.email "rohanmukka09@gmail.com"`
- **No trailers.** No `Co-Authored-By`, no session links, no tool attribution.
  The commit message ends with its last sentence.
- Several small commits over one large one. Each should typecheck, lint and
  pass `npm test` on its own.
- Run `npm run verify` before committing anything that touches the journal —
  a broken chain or a drifted projection should never reach a commit.
