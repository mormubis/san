# AGENTS.md

Agent guidance for the `@echecs/san` package — SAN move notation parser,
resolver, and stringifier.

See the root `AGENTS.md` for workspace-wide conventions.

---

## Project Overview

`@echecs/san` exposes three pure functions for working with Standard Algebraic
Notation (SAN) chess moves.

---

## Similar Libraries

Use these to cross-check output when testing:

- [`chess.js`](https://www.npmjs.com/package/chess.js) — includes SAN parsing
  (permissive and strict modes) and move validation.
- [`chessops`](https://www.npmjs.com/package/chessops) — TypeScript library with
  SAN parsing and writing via `parseSan`/`makeSan`.
- [`chess`](https://www.npmjs.com/package/chess) — algebraic notation driven
  chess engine with SAN and UCI move formats.

---

| Function               | Input                   | Output     | Throws                                |
| ---------------------- | ----------------------- | ---------- | ------------------------------------- |
| `parse(san)`           | SAN string              | `SanMove`  | `RangeError` on empty/invalid input   |
| `parse(san, position)` | SAN string + `Position` | `Move`     | `RangeError` on empty/invalid/illegal |
| `resolve()`            | `SanMove` + `Position`  | `Move`     | `RangeError` on illegal/ambiguous     |
| `stringify()`          | `Move` + `Position`     | SAN string | `RangeError` if no piece on square    |

The entire implementation lives in a single source file: `src/index.ts`.

---

## Dependency Graph

```
@echecs/position (public API + ./internal)
        ↑
 @echecs/san
```

`@echecs/fen` is a **dev** dependency only (used in tests to construct positions
from FEN strings). It must never be promoted to a runtime dependency.

---

## Public API

### `SanMove` interface

```typescript
interface SanMove {
  capture: boolean;
  castle: 'kingside' | 'queenside' | undefined;
  check: 'check' | 'checkmate' | undefined;
  file: File | undefined;
  piece: PieceType;
  promotion: PromotionPieceType | undefined;
  rank: Rank | undefined;
  to: Square | undefined;
}
```

Fields are sorted alphabetically (required by `sort-keys` ESLint rule). `to` is
`undefined` for castling moves; `file` and `rank` are the disambiguation hints
from the SAN string, not the destination.

### `Move` and `Position`

Both are re-exported from `@echecs/position` for consumer convenience. Do not
duplicate their definitions in this package.

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

### `@echecs/position/internal`

`canAttack` and `isKingInCheck` use the 0x88 lookup tables (`ATTACKS`, `RAYS`,
`PIECE_MASKS`, `DIFF_OFFSET`, `OFF_BOARD`) and the `boardFromMap` /
`squareToIndex` helpers from `@echecs/position/internal`. This is the only
package besides `@echecs/game` that may use the `./internal` export condition.
Do not use it in application code.

### SAN regex

The regex at the top of `src/index.ts` parses the full SAN grammar in one pass.
Annotation glyphs (`!`, `?`) are stripped before matching. Castling (`O-O`,
`O-O-O`) is detected before regex matching.

Regex group order:
`1=piece, 2=fromFile, 3=fromRank, 4=capture, 5=toFile, 6=toRank, 7=promotion, 8=check`.

### `resolve()` logic

1. Iterate all pieces of the active color matching `move.piece`.
2. Apply file/rank disambiguation filters.
3. For pawns: validate direction and distance separately for pushes vs. captures
   (the generic `canAttack` table does not model pawn pushes).
4. For all other pieces: use `canAttack` with the 0x88 tables.
5. Apply the move with `applyMoveToBoard` and discard candidates that leave the
   own king in check (`isKingInCheck`).
6. Exactly one candidate must remain — zero or many both throw `RangeError`.

### `stringify()` disambiguation

When multiple pieces of the same type can reach the destination:

1. If no ambiguous piece shares the from-file → disambiguate by file.
2. Else if an ambiguous piece shares the from-rank → use the full square.
3. Else → disambiguate by rank.

### `isCheckmate()` simplification

The internal `isCheckmate` helper iterates all 0x88 indices and attempts every
`canAttack`-reachable move. It is intentionally simple (not perft- optimised)
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

## Testing Conventions

- Tests live in `src/__tests__/index.spec.ts`.
- Use `describe` to group cases by function and scenario; use `it` inside.
- Use `parseFen` from `@echecs/fen` (dev dep) to build `Position` fixtures.
- Round-trip tests (`parse` → `resolve` → `stringify`) are the primary
  correctness signal for `stringify`.
- Prefer `expect(x).toBe(y)` for exact string/boolean equality.
- `sort-keys` and `no-console` are relaxed in test files.

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

6. **Commit and push:**

   ```bash
   git add package.json CHANGELOG.md README.md
   git commit -m "release: @echecs/san@x.y.z"
   git push
   ```

   **The push is mandatory.** The release workflow only triggers on push to
   `main`. A commit without a push means the release never happens.

7. **CI takes over:** GitHub Actions detects the version bump, runs format →
   lint → test, and publishes to npm.

Do not manually publish with `npm publish`.
