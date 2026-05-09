# SAN Specification

Standard Algebraic Notation (SAN) as implemented by `@echecs/san`.

## Sources

- **PGN standard** — Steven J. Edwards, 1994, §8.2 (Movetext SAN moves)
- **FIDE Laws of Chess** — Appendix C (Algebraic Notation), in force from 1
  January 2023

---

## Move Notation Format

### Piece moves

```
[Piece][disambiguation][x]<toFile><toRank>[=Promotion][+|#]
```

| Component        | Description                                      | Examples       |
| ---------------- | ------------------------------------------------ | -------------- |
| `Piece`          | Piece letter (absent for pawns)                  | `N`, `R`, `Q`  |
| `disambiguation` | Departure file, rank, or square (when ambiguous) | `a`, `3`, `a3` |
| `x`              | Capture marker                                   | `x`            |
| `toFile`         | Destination file (`a`–`h`)                       | `f`, `d`       |
| `toRank`         | Destination rank (`1`–`8`)                       | `3`, `5`       |
| `=Promotion`     | Promotion piece (pawns only)                     | `=Q`, `=N`     |
| `+` / `#`        | Check / checkmate suffix                         | `+`, `#`       |

Examples: `Nf3`, `Raxd1`, `Qh5+`, `Rd8#`

### Pawn moves

```
<toFile><toRank>[=Promotion][+|#]          # quiet push
<fromFile>x<toFile><toRank>[=Promotion][+|#]   # capture
```

Examples: `e4`, `exd5`, `e8=Q`, `dxc1=N+`

### Castling

| Notation | Side      |
| -------- | --------- |
| `O-O`    | Kingside  |
| `O-O-O`  | Queenside |

The letter `O` (capital oh), not zero. Optional check/checkmate suffix applies:
`O-O+`, `O-O-O#`.

### Annotation glyphs

The characters `!` and `?` (and combinations) are stripped before parsing. They
carry no structural meaning in this implementation.

---

## Piece Letters

| Letter | Piece  |
| ------ | ------ |
| `K`    | King   |
| `Q`    | Queen  |
| `R`    | Rook   |
| `B`    | Bishop |
| `N`    | Knight |

Pawns have no letter. The piece letter is always uppercase.

---

## Disambiguation Rules

Source: FIDE Laws of Chess, Appendix C.10.

When two (or more) identical pieces of the same color can legally move to the
same square, the departure square must be disambiguated:

1. **Different files** — add the departure file: `Rab1` (rook on the `a`-file
   moves to `b1`)

2. **Same file, different ranks** — add the departure rank: `R1d3` (rook on rank
   `1` moves to `d3`)

3. **Same file and same rank** — add the full departure square: `Qa3b4`
   (extremely rare, only possible with promoted pieces)

Priority: file > rank > full square.

**Pawn captures** always include the departure file, regardless of ambiguity:
`exd5`, `cxd5`.

---

## Capture Notation

An `x` is placed between the piece/disambiguation segment and the destination
square:

```
Rxd1    # Rook captures on d1
exd5    # Pawn on e-file captures on d5
```

En passant captures use the same notation as ordinary pawn captures — the target
square is the square the capturing pawn moves to (not the square of the captured
pawn).

---

## Promotion

A pawn reaching the back rank must promote. The promotion piece is written after
the destination square, separated by `=`:

```
e8=Q    # pawn promotes to Queen
dxc1=N  # pawn captures and promotes to Knight
```

Valid promotion pieces: `Q`, `R`, `B`, `N`. The King (`K`) is not a valid
promotion target.

---

## Grammar

Expressed as a PEG-style grammar matching the regex used in `src/index.ts`:

```
SAN         = castling / piece-move
castling    = "O-O-O" [check] / "O-O" [check]
piece-move  = [piece] [fromFile] [fromRank] ["x"] toFile toRank ["=" promotion] [check]
piece       = "B" / "K" / "N" / "Q" / "R"
fromFile    = "a" / "b" / "c" / "d" / "e" / "f" / "g" / "h"
fromRank    = "1" / "2" / "3" / "4" / "5" / "6" / "7" / "8"
toFile      = "a" / "b" / "c" / "d" / "e" / "f" / "g" / "h"
toRank      = "1" / "2" / "3" / "4" / "5" / "6" / "7" / "8"
promotion   = "B" / "N" / "Q" / "R"
check       = "+" / "#"
```

The regex implementing this grammar (group order:
`1=piece, 2=fromFile, 3=fromRank, 4=capture, 5=toFile, 6=toRank, 7=promotion, 8=check`):

```
/^([BKNQR])?([a-h])?([1-8])?(x)?([a-h])([1-8])(?:=([BKNQR]))?([+#])?$/
```

Castling is matched by prefix check (`O-O-O` before `O-O`) before the regex
runs.

---

## Resolution

Converting a parsed `SAN` object to a concrete `Move` (with explicit `from` and
`to` squares) requires a `Position` context. The algorithm in `resolve()`:

1. Iterate all pieces of the active color whose type matches `move.piece`.
2. Apply the disambiguation filter (`move.from`):
   - Length 2 → full square match
   - In `a`–`h` → file match
   - In `1`–`8` → rank match
3. Call `position.reach(square, piece)` and skip if the target square is not
   reachable.
4. Apply the move with `applyMoveToBoard` and skip candidates that leave the
   active king in check (verifies legality).
5. **Exactly one candidate** must remain:
   - Zero candidates → `RangeError` (no legal move)
   - Two or more candidates → `RangeError` (ambiguous SAN)

For castling, `resolve()` maps `O-O` → `e1`/`e8` to `g1`/`g8` and `O-O-O` →
`e1`/`e8` to `c1`/`c8`, determined by the active color.

---

## Stringification

`stringify(move, position)` computes the minimal unambiguous SAN for a `Move`:

1. Detect castling by checking if a king moves two files (`±2`).
2. Determine whether the move is a capture (piece on `to`, or en passant).
3. Compute disambiguation by finding other pieces of the same type that can
   legally reach the same destination:
   - No ambiguous piece shares the from-file → disambiguate by file.
   - An ambiguous piece shares the from-rank → use the full departure square.
   - Otherwise → disambiguate by rank.
4. Pawn captures always emit the from-file.
5. Apply the move and append `+` or `#` based on `position.isCheck` and
   `isCheckmate()`.
