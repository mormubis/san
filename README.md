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

### `parse(san: string): SAN`

Parses a SAN string and returns a `SAN` object describing the move's syntax.
Does not require a position. Throws `RangeError` for empty or invalid input.

### `parse(san: string, position: Position): Move`

Parses and resolves a SAN string against a position in one call. Equivalent to
calling `parse` then `resolve`. Throws `RangeError` for empty, invalid, or
illegal input.

### `resolve(move: SAN, position: Position): Move`

Finds the source square for a `SAN` move in the given position. Throws
`RangeError` if no legal move matches or if the move is ambiguous.

### `stringify(move: Move, position: Position): string`

Returns the SAN string for a `Move` in the given position, including
disambiguation, capture marker, check, and checkmate symbols. Throws
`RangeError` if no piece occupies the source square.

## Types

```typescript
interface SAN {
  capture: boolean;
  castling: boolean;
  check: boolean;
  checkmate: boolean;
  from: Disambiguation | undefined;
  long: boolean;
  piece: Piece;
  promotion: PromotionPiece | undefined;
  to: Square | undefined;
}
```

`from` is the disambiguation hint from the SAN string (a file, rank, or full
square), not the origin square. `to` is `undefined` for castling moves.

`Move` and `PromotionPieceType` are re-exported from `@echecs/position`.
`PromotionPiece` is an alias for `PromotionPieceType`.

```typescript
interface Move {
  from: Square;
  promotion?: PromotionPieceType;
  to: Square;
}
```

```typescript
import type { Move, Position, PromotionPieceType, SAN } from '@echecs/san';
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
