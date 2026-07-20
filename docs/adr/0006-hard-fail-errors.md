# ADR 0006: Rendering failures abort the build with actionable errors

Date: 2026-07-20
Status: Accepted

## Context

Possible failures: `node` missing from PATH, Node < 18, corrupt or truncated
`.excalidraw` files, renderer crashes. The alternative to failing is
degrading (placeholder image or raw link) so the render completes.

## Decision

Hard fail in every case: abort `quarto render` with a message that names the
offending file and the fix (e.g. "Node >= 18 not found on PATH" with install
pointer; "figures/arch.excalidraw is not valid Excalidraw JSON").

Rejected: warn-and-degrade — a degraded render is how a broken figure
silently reaches a published site or submitted PDF, the exact failure this
project exists to prevent. Hard failure also matches Quarto convention
(renders abort on bad code cells) and is less code.

## Consequences

- No placeholder-image machinery.
- During `quarto preview`, a scene file saved mid-write may transiently fail
  a re-render; preview recovers on the next save. No retry/debounce logic
  unless it proves painful in practice (ponytail: revisit only on real
  reports).
