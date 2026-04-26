# AGENTS.md

Agent guidance for the `@echecs/san` package — SAN move notation parser,
resolver, and stringifier.

**See also:** [`REFERENCES.md`](REFERENCES.md) |
[`COMPARISON.md`](COMPARISON.md)

See the root `AGENTS.md` for workspace-wide conventions.

**Backlog:** tracked in [GitHub Issues](https://github.com/echecsjs/san/issues).

---

## Project Overview

`@echecs/san` exposes three pure functions for working with Standard Algebraic
Notation (SAN) chess moves.

---

| Function               | Input                   | Output     | Throws                                |
| ---------------------- | ----------------------- | ---------- | ------------------------------------- |
| `parse(san)`           | SAN string              | `SAN`      | `RangeError` on empty/invalid input   |
| `parse(san, position)` | SAN string + `Position` | `Move`     | `RangeError` on empty/invalid/illegal |
| `resolve()`            | `SAN` + `Position`      | `Move`     | `RangeError` on illegal/ambiguous     |
| `stringify()`          | `Move` + `Position`     | SAN string | `RangeError` if no piece on square    |

The entire implementation lives in a single source file: `src/index.ts`.

---

## Error Handling

- `parse('')` → `RangeError('Empty SAN string')`
- `parse('invalid')` → `RangeError('Invalid SAN: "invalid"')`
- `resolve()` with no legal match → `RangeError` describing the move
- `resolve()` with multiple matches → `RangeError` listing candidate count
- `stringify()` with no piece on `move.from` → `RangeError`

Never use generic `Error` — always `RangeError` for domain violations.

---

## Validation

Input validation is mostly provided by TypeScript's strict type system at
compile time. There is no runtime validation library — the type signatures
enforce correct usage. Do not add runtime type-checking guards (e.g. `typeof`
checks, assertion functions) unless there is an explicit trust boundary.

---

## Architecture Notes

- **ESM-only** — the package ships only ESM. Do not add a CJS build.

### SAN regex

The regex at the top of `src/index.ts` parses the full SAN grammar in one pass.
Annotation glyphs (`!`, `?`) are stripped before matching. Castling (`O-O`,
`O-O-O`) is detected before regex matching.

Regex group order:
`1=piece, 2=fromFile, 3=fromRank, 4=capture, 5=toFile, 6=toRank, 7=promotion, 8=check`.

### `resolve()` logic

1. Iterate all pieces of the active color matching `move.piece`.
2. Apply `from` disambiguation filter (file, rank, or full square).
3. Use `position.reach()` to check if the piece can reach the target square.
4. Apply the move with `applyMoveToBoard` and discard candidates that leave the
   own king in check.
5. Exactly one candidate must remain — zero or many both throw `RangeError`.

### `stringify()` disambiguation

When multiple pieces of the same type can reach the destination:

1. If no ambiguous piece shares the from-file → disambiguate by file.
2. Else if an ambiguous piece shares the from-rank → use the full square.
3. Else → disambiguate by rank.

### `isCheckmate()` simplification

The internal `isCheckmate` helper iterates all pieces and attempts every
`reach()`-reachable move. It is intentionally simple (not perft-optimised)
because it is only called from `stringify()` to append `#`.

---

## Commands

```bash
pnpm build              # bundle TypeScript → dist/ via tsdown
pnpm test               # run all tests once (vitest run)
pnpm test:watch         # watch mode
pnpm test:coverage      # with v8 coverage report
pnpm lint               # ESLint + tsc type-check (auto-fixes style issues)
pnpm lint:ci            # strict — zero warnings, no auto-fix
pnpm format             # Prettier --write
pnpm lint && pnpm test && pnpm build   # full pre-PR check
```

---

## Release Protocol

Step-by-step process for releasing a new version. CI auto-publishes to npm when
`version` in `package.json` changes on `main`.

1. **Verify the package is clean:**

   ```bash
   pnpm lint && pnpm test && pnpm build
   ```

   Do not proceed if any step fails.

2. **Decide the semver level:**
   - `patch` — bug fixes, internal refactors with no API change
   - `minor` — new features, new exports, non-breaking additions
   - `major` — breaking changes to the public API

3. **Update `CHANGELOG.md`** following
   [Keep a Changelog](https://keepachangelog.com) format:

   ```markdown
   ## [x.y.z] - YYYY-MM-DD

   ### Added

   - …

   ### Changed

   - …

   ### Fixed

   - …

   ### Removed

   - …
   ```

   Include only sections that apply. Use past tense.

4. **Update `README.md`** if the release introduces new public API, changes
   usage examples, or deprecates/removes existing features.

5. **Bump the version:**

   ```bash
   npm version <major|minor|patch> --no-git-tag-version
   ```

6. **Open a release PR:**

   ```bash
   git checkout -b release/x.y.z
   git add package.json CHANGELOG.md README.md
   git commit -m "release: @echecs/san@x.y.z"
   git push -u origin release/x.y.z
   gh pr create --title "release: @echecs/san@x.y.z" --body "<description>"
   ```

   Wait for CI (format, lint, test) to pass on the PR before merging.

7. **Merge the PR:** Once CI is green, merge (squash) into `main`. The release
   workflow detects the version bump, publishes to npm, and creates a GitHub
   Release with a git tag.

Do not manually publish with `npm publish`. Do not create git tags manually —
the release workflow handles tagging.
