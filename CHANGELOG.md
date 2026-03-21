# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com), and this
project adheres to [Semantic Versioning](https://semver.org).

## [1.0.1] - 2026-03-21

### Fixed

- Add `husky` to `prepare` script so git hooks are installed on `pnpm install`.
- Fix formatting inconsistency in `src/index.ts`.

## [1.0.0] - 2026-03-21

### Added

- `parse(san)` — parse a SAN string into a `SanMove` object.
- `parse(san, position)` — parse and resolve a SAN string into a `Move`.
- `resolve(move, position)` — resolve a `SanMove` to a concrete `Move` with
  from/to squares.
- `stringify(move, position)` — convert a `Move` to a SAN string with
  disambiguation, check, and checkmate.
- Full SAN grammar: piece moves, pawn moves, captures, promotions, castling,
  check, checkmate.
- En passant capture handling.
- Disambiguation by file, rank, or full square.
- Annotation glyph stripping (`!`, `?`).
- `SanMove` interface with strict TypeScript types.
- Re-exports `Move` and `Position` types from `@echecs/position`.
