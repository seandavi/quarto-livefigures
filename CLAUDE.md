# quarto-livefigures

Quarto extension for editable, version-controlled figures (`.excalidraw` first). See PROPOSAL.md for the brief.

## Version control: jujutsu (jj), not raw git

This repo uses a jj workflow colocated with git. Use `jj` commands, not `git commit`/`git checkout`.

- Status / diff: `jj st`, `jj diff`
- The working copy IS a commit (`@`). No staging area; edits are auto-tracked.
- Describe current work: `jj describe -m "message"`
- Start next change: `jj new` (finishes `@`, opens a fresh working-copy commit)
- Log: `jj log`
- Undo anything: `jj undo`
- Push: `jj bookmark set main -r @- && jj git push` (adjust bookmark name to match remote)

Don't create git branches; jj bookmarks serve that role.
