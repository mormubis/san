# @echecs/san

Parse, resolve, and stringify SAN (Standard Algebraic Notation) chess moves.
Strict TypeScript. Implements the notation defined in
[FIDE Laws of Chess, Appendix C](https://handbook.fide.com/chapter/E012023).

## Installation

```bash
npm install @echecs/san
```

## Usage

```typescript
import { parse, resolve, stringify } from '@echecs/san';

// Parse SAN syntax only — returns a SanMove (no position needed)
const sanMove = parse('Nf3');

// Parse and resolve in one call — returns a Move with from/to squares
const move = parse('Nf3', position);

// Resolve a SanMove to a Move (find the from square)
const move = resolve(sanMove, position);

// Convert a Move back to a SAN string
const san = stringify(move, position);
```

## API

### `parse(san: string): SanMove`

Parses a SAN string and returns a `SanMove` describing the move's syntax. Does
not require a position. Throws `RangeError` for empty or invalid input.

### `parse(san: string, position: Position): Move`

Parses and resolves a SAN string against a position in one call. Equivalent to
calling `parse` then `resolve`. Throws `RangeError` for empty, invalid, or
illegal input.

### `resolve(move: SanMove, position: Position): Move`

Finds the source square for a `SanMove` in the given position. Throws
`RangeError` if no legal move matches or if the move is ambiguous.

### `stringify(move: Move, position: Position): string`

Returns the SAN string for a `Move` in the given position, including
disambiguation, capture marker, check, and checkmate symbols. Throws
`RangeError` if no piece occupies the source square.

## Types

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

`file` and `rank` are the disambiguation hints from the SAN string, not the
destination square. `to` is `undefined` for castling moves.

`Move` is defined locally in `@echecs/san`:

```typescript
interface Move {
  from: Square;
  promotion?: PromotionPieceType;
  to: Square;
}
```

`Position` is re-exported from `@echecs/position` for convenience.
`PromotionPieceType` is the union of piece types a pawn can promote to:

```typescript
import type { Move, Position, PromotionPieceType, SanMove } from '@echecs/san';
```

## Errors

All functions throw `RangeError` for domain violations:

| Situation                 | Message                        |
| ------------------------- | ------------------------------ |
| Empty SAN string          | `Empty SAN string`             |
| Invalid SAN syntax        | `Invalid SAN: "<input>"`       |
| No legal move found       | Describes the move             |
| Ambiguous move            | Lists the number of candidates |
| No piece on source square | Describes the square           |

## License

MIT
