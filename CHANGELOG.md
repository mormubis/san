# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com), and this
project adheres to [Semantic Versioning](https://semver.org).

## [3.1.0] - 2026-04-28

### Added

- Re-exported `Move` and `PromotionPieceType` from `@echecs/position`.
- `PromotionPiece` remains as a type alias for backward compatibility.

### Changed

- `Move` and `PromotionPiece` are now imported from `@echecs/position` instead
  of being defined locally.

### Fixed

- Moved `@echecs/position` to `devDependencies` — it was incorrectly listed as a
  regular dependency.

## [3.0.0] - 2026-04-26

### Changed

- Renamed `SanMove` to `SAN`.
- Renamed `PromotionPieceType` to `PromotionPiece`.
- Merged `file` + `rank` fields into `from: Disambiguation | undefined` where
  `Disambiguation = File | Rank | Square`.
- Replaced `castle: 'kingside' | 'queenside' | undefined` with
  `castling: boolean` + `long: boolean`.
- Replaced `check: 'check' | 'checkmate' | undefined` with `check: boolean` +
  `checkmate: boolean`.

### Added

- Exported `Piece` type
  (`'bishop' | 'king' | 'knight' | 'pawn' | 'queen' | 'rook'`).
- Exported `Disambiguation` type (`File | Rank | Square`).
- Re-exported `File`, `Rank`, `Square` from `@echecs/position`.

## [2.0.3] - 2026-04-26

### Fixed

- Handled rook movement in `applyMoveToBoard` for castling — `stringify` now
  produces correct board state when detecting check/checkmate after `O-O` and
  `O-O-O`.

## [2.0.2] - 2026-04-09

### Changed

- added `parser`, `resolver`, and `serializer` keywords

## [2.0.1] - 2026-04-09

### Fixed

- Documented `PromotionPieceType` type export and corrected `Move` type
  documentation — `Move` is defined locally (not re-exported from
  `@echecs/position`) and has a `promotion?: PromotionPieceType` field.

## [2.0.0] - 2026-04-09

### Changed

- Upgraded `@echecs/position` from `^1.0.2` to `^3.0.3`.
- `SanMove.piece` and `SanMove.promotion` now use full words (`'pawn'`,
  `'knight'`, `'queen'`, etc.) instead of single letters (`'p'`, `'n'`, `'q'`).
- `Move.promotion` is now optional instead of `PromotionPieceType | undefined`.
- `Move` and `PromotionPieceType` are defined locally instead of re-exported
  from `@echecs/position`.
- Removed dependency on `@echecs/position/internal` — implementation uses the
  public `Position` API (`reach`, `isCheck`, `derive`, `at`).
- Simplified `isCheckmate` to use `Position.reach()` instead of 0x88 index
  iteration.

## [1.0.2] - 2026-03-21

### Fixed

- Replace `file:` dependencies with npm registry versions so CI can install
  without sibling directories.
- Fix type mismatch between `@echecs/fen` and `@echecs/position` in test
  fixtures.

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
