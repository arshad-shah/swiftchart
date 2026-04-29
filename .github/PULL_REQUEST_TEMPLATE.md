<!--
Thanks for opening a PR. A brief checklist keeps the review fast.
Delete sections that don't apply.
-->

## Summary

<!-- One or two sentences. What does this change and why? -->

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Performance / refactor (no behaviour change)
- [ ] Documentation only
- [ ] Test or tooling only

## Linked issues

<!-- Closes #123, refs #456. -->

## Implementation notes

<!-- Anything that helps a reviewer make sense of the diff: tradeoffs, why
not approach X, design decisions worth flagging. Skip if obvious from the
diff. -->

## Testing

- [ ] Added or updated unit tests in `tests/` covering the change
- [ ] `pnpm validate` passes locally (typecheck, lint, test, build, publint, attw, size)
- [ ] Tested in a browser via the docs site (`pnpm --filter swiftchart-docs dev`)
- [ ] Verified bundle size budgets still hold (`pnpm size`)

## Documentation

- [ ] Updated relevant pages under `docs/src/content/docs/`
- [ ] Added or updated JSDoc on any new public API surface
- [ ] Updated `CHANGELOG.md` under `[Unreleased]`

## Breaking change notes

<!-- If you ticked "Breaking change" above, describe the migration path. -->

## Checklist

- [ ] No new runtime dependencies in `src/`
- [ ] Followed the rules in `CONTRIBUTING.md` (no `innerHTML`, no `Math.min/max(...arr)`, theme-driven colours)
- [ ] Commits are signed (`git commit -S`) - optional but appreciated
