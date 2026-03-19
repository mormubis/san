import {
  ATTACKS,
  DIFF_OFFSET,
  OFF_BOARD,
  PIECE_MASKS,
  RAYS,
  boardFromMap,
  squareToIndex,
} from '@echecs/position/internal';

import type {
  Color,
  File,
  Move,
  Piece,
  PieceType,
  Position,
  PromotionPieceType,
  Rank,
  Square,
} from '@echecs/position';

// ---------------------------------------------------------------------------
// SanMove type
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const PIECE_LETTERS: Record<string, PieceType> = {
  B: 'b',
  K: 'k',
  N: 'n',
  Q: 'q',
  R: 'r',
};

const PROMOTION_LETTERS: Record<string, PromotionPieceType> = {
  B: 'b',
  N: 'n',
  Q: 'q',
  R: 'r',
};

const FILES_SET = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
const RANKS_SET = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);

// SAN regex — handles piece moves, pawn moves, promotions, check/checkmate
// Groups: 1=piece, 2=fromFile, 3=fromRank, 4=capture, 5=toFile, 6=toRank,
//         7=promotion, 8=check
const SAN_REGEX =
  /^([BKNQR])?([a-h])?([1-8])?(x)?([a-h])([1-8])(?:=([BKNQR]))?([+#])?$/;

function canAttack(
  board: (Piece | undefined)[],
  fromIndex: number,
  toIndex: number,
  pieceType: PieceType,
  color: Color,
): boolean {
  const diff = toIndex - fromIndex;
  const tableIndex = diff + DIFF_OFFSET;
  if (tableIndex < 0 || tableIndex >= 240) {
    return false;
  }

  const attackMask = ATTACKS[tableIndex] ?? 0;
  const pieceMask = PIECE_MASKS[pieceType] ?? 0;
  if ((attackMask & pieceMask) === 0) {
    return false;
  }

  // Pawn direction check
  if (pieceType === 'p') {
    if (color === 'w' && diff > 0) {
      return false;
    }
    if (color === 'b' && diff < 0) {
      return false;
    }
  }

  const ray = RAYS[tableIndex] ?? 0;
  if (ray === 0) {
    return true;
  } // Non-sliding

  // Check for blockers
  let index = fromIndex + ray;
  while (index !== toIndex) {
    if ((index & OFF_BOARD) !== 0) {
      return false;
    }
    if (board[index] !== undefined) {
      return false;
    }
    index += ray;
  }
  return true;
}

function applyMoveToBoard(
  position: Position,
  from: Square,
  to: Square,
  promotion?: PromotionPieceType,
): Position {
  const board = new Map(position.board);
  const p = board.get(from);
  if (p === undefined) {
    return position;
  }

  board.delete(from);

  // En passant capture
  if (p.type === 'p' && to === position.enPassantSquare) {
    const epRank =
      position.turn === 'w'
        ? String(Number(to[1]) - 1)
        : String(Number(to[1]) + 1);
    board.delete(`${to[0]}${epRank}` as Square);
  }

  const finalPiece: Piece = promotion ? { color: p.color, type: promotion } : p;
  board.set(to, finalPiece);

  const turn: Color = position.turn === 'w' ? 'b' : 'w';
  return { ...position, board, enPassantSquare: undefined, turn };
}

function findKing(position: Position, color: Color): Square | undefined {
  for (const [square, p] of position.board) {
    if (p.type === 'k' && p.color === color) {
      return square;
    }
  }
  return undefined;
}

function isKingInCheck(position: Position, color: Color): boolean {
  const kingSquare = findKing(position, color);
  if (kingSquare === undefined) {
    return false;
  }

  const board = boardFromMap(position.board);
  const targetIndex = squareToIndex(kingSquare);
  const opponent: Color = color === 'w' ? 'b' : 'w';

  for (const [sq, p] of position.board) {
    if (p.color !== opponent) {
      continue;
    }
    const fromIndex = squareToIndex(sq);
    if (canAttack(board, fromIndex, targetIndex, p.type, p.color)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// parse()
// ---------------------------------------------------------------------------

function parse(san: string): SanMove;
function parse(san: string, position: Position): Move;
function parse(san: string, position?: Position): SanMove | Move {
  if (san.length === 0) {
    throw new RangeError('Empty SAN string');
  }

  // Strip annotation glyphs
  const clean = san.replaceAll(/[!?]/g, '');

  // Castling
  if (clean.startsWith('O-O-O')) {
    const check = clean.endsWith('#')
      ? 'checkmate'
      : clean.endsWith('+')
        ? 'check'
        : undefined;
    const sanMove: SanMove = {
      capture: false,
      castle: 'queenside',
      check,
      file: undefined,
      piece: 'k',
      promotion: undefined,
      rank: undefined,
      to: undefined,
    };

    if (position !== undefined) {
      return resolve(sanMove, position);
    }

    return sanMove;
  }

  if (clean.startsWith('O-O')) {
    const check = clean.endsWith('#')
      ? 'checkmate'
      : clean.endsWith('+')
        ? 'check'
        : undefined;
    const sanMove: SanMove = {
      capture: false,
      castle: 'kingside',
      check,
      file: undefined,
      piece: 'k',
      promotion: undefined,
      rank: undefined,
      to: undefined,
    };

    if (position !== undefined) {
      return resolve(sanMove, position);
    }

    return sanMove;
  }

  const match = SAN_REGEX.exec(clean);
  if (!match) {
    throw new RangeError(`Invalid SAN: "${san}"`);
  }

  const [
    ,
    pieceString,
    fromFileString,
    fromRankString,
    captureString,
    toFileString,
    toRankString,
    promoString,
    checkString,
  ] = match;

  const piece: PieceType = pieceString
    ? (PIECE_LETTERS[pieceString] ?? 'p')
    : 'p';
  const file =
    fromFileString && FILES_SET.has(fromFileString)
      ? (fromFileString as File)
      : undefined;
  const rank =
    fromRankString && RANKS_SET.has(fromRankString)
      ? (fromRankString as Rank)
      : undefined;
  const capture = captureString === 'x';
  const to = `${toFileString}${toRankString}` as Square;
  const promotion =
    promoString && PROMOTION_LETTERS[promoString]
      ? PROMOTION_LETTERS[promoString]
      : undefined;
  const check =
    checkString === '#'
      ? 'checkmate'
      : checkString === '+'
        ? 'check'
        : undefined;

  const sanMove: SanMove = {
    capture,
    castle: undefined,
    check,
    file,
    piece,
    promotion,
    rank,
    to,
  };

  if (position !== undefined) {
    return resolve(sanMove, position);
  }

  return sanMove;
}

// ---------------------------------------------------------------------------
// resolve()
// ---------------------------------------------------------------------------

function resolve(move: SanMove, position: Position): Move {
  // Castling
  if (move.castle !== undefined) {
    const backRank = position.turn === 'w' ? '1' : '8';
    const from = `e${backRank}` as Square;
    const to =
      move.castle === 'kingside'
        ? (`g${backRank}` as Square)
        : (`c${backRank}` as Square);
    return { from, promotion: undefined, to };
  }

  if (move.to === undefined) {
    throw new RangeError('SanMove has no target square');
  }

  const toIndex = squareToIndex(move.to);
  const board = boardFromMap(position.board);
  const candidates: Square[] = [];

  for (const [square, p] of position.board) {
    if (p.type !== move.piece || p.color !== position.turn) {
      continue;
    }
    if (move.file !== undefined && square[0] !== move.file) {
      continue;
    }
    if (move.rank !== undefined && square[1] !== move.rank) {
      continue;
    }

    const fromIndex = squareToIndex(square);

    // Special handling for pawns: they move forward, not diagonally (unless capturing)
    if (move.piece === 'p') {
      const direction = position.turn === 'w' ? -1 : 1;
      const fromRank = Number.parseInt(square[1] ?? '1', 10);
      const toRank = Number.parseInt(move.to[1] ?? '1', 10);
      const toFile = move.to[0] ?? '';
      const fromFile = square[0] ?? '';

      if (move.capture) {
        // Pawn capture: must be one diagonal step
        if (
          toFile !== fromFile &&
          Math.abs(toRank - fromRank) === 1 &&
          toRank - fromRank === -direction
        ) {
          // valid pawn capture direction
        } else {
          continue;
        }
      } else {
        // Pawn push: must be on same file
        if (toFile !== fromFile) {
          continue;
        }
        // One step forward
        if (toRank - fromRank !== -direction) {
          // Or two steps from starting rank
          const startRank = position.turn === 'w' ? 2 : 7;
          if (
            !(
              fromRank === startRank &&
              toRank - fromRank === -2 * direction &&
              board[
                squareToIndex(`${fromFile}${fromRank - direction}` as Square)
              ] === undefined
            )
          ) {
            continue;
          }
        }
      }
    } else if (
      !canAttack(board, fromIndex, toIndex, move.piece, position.turn)
    ) {
      continue;
    }

    // Verify move doesn't leave own king in check
    const after = applyMoveToBoard(position, square, move.to, move.promotion);
    if (isKingInCheck(after, position.turn)) {
      continue;
    }

    candidates.push(square);
  }

  if (candidates.length === 0) {
    throw new RangeError(
      `No legal move found for SAN "${JSON.stringify(move)}" in position`,
    );
  }

  if (candidates.length > 1) {
    throw new RangeError(
      `Ambiguous: ${candidates.length} candidates for SAN "${JSON.stringify(move)}"`,
    );
  }

  const from = candidates[0];
  if (from === undefined) {
    throw new RangeError('No candidate found (internal error)');
  }

  return { from, promotion: move.promotion, to: move.to };
}

// ---------------------------------------------------------------------------
// stringify()
// ---------------------------------------------------------------------------

const PIECE_TO_LETTER: Record<PieceType, string> = {
  b: 'B',
  k: 'K',
  n: 'N',
  p: '',
  q: 'Q',
  r: 'R',
};

function stringify(move: Move, position: Position): string {
  const p = position.board.get(move.from);
  if (p === undefined) {
    throw new RangeError(`No piece on ${move.from}`);
  }

  // Castling
  if (p.type === 'k') {
    const fileDiff =
      (move.to.codePointAt(0) ?? 0) - (move.from.codePointAt(0) ?? 0);
    if (fileDiff === 2) {
      const after = applyMoveToBoard(position, move.from, move.to);
      const suffix = isKingInCheck(after, position.turn === 'w' ? 'b' : 'w')
        ? isCheckmate(after)
          ? '#'
          : '+'
        : '';
      return `O-O${suffix}`;
    }

    if (fileDiff === -2) {
      const after = applyMoveToBoard(position, move.from, move.to);
      const suffix = isKingInCheck(after, position.turn === 'w' ? 'b' : 'w')
        ? isCheckmate(after)
          ? '#'
          : '+'
        : '';
      return `O-O-O${suffix}`;
    }
  }

  const pieceString = PIECE_TO_LETTER[p.type];
  const isCapture =
    position.board.has(move.to) ||
    (p.type === 'p' && move.to === position.enPassantSquare);

  // Determine disambiguation
  let disambig = '';
  if (p.type !== 'p') {
    const toIndex = squareToIndex(move.to);
    const board = boardFromMap(position.board);
    const ambiguous: Square[] = [];

    for (const [sq, other] of position.board) {
      if (
        sq === move.from ||
        other.type !== p.type ||
        other.color !== p.color
      ) {
        continue;
      }
      const fromIndex = squareToIndex(sq);
      if (!canAttack(board, fromIndex, toIndex, p.type, p.color)) {
        continue;
      }
      // Check it's a legal move (doesn't leave king in check)
      const after = applyMoveToBoard(position, sq, move.to);
      if (!isKingInCheck(after, position.turn)) {
        ambiguous.push(sq);
      }
    }

    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some((sq) => sq[0] === move.from[0]);
      const sameRank = ambiguous.some((sq) => sq[1] === move.from[1]);
      if (!sameFile) {
        disambig = move.from[0] ?? '';
      } else if (sameRank) {
        disambig = move.from;
      } else {
        disambig = move.from[1] ?? '';
      }
    }
  } else if (isCapture) {
    // Pawn capture always includes the from-file
    disambig = move.from[0] ?? '';
  }

  const captureString = isCapture ? 'x' : '';
  const promoString = move.promotion ? `=${move.promotion.toUpperCase()}` : '';

  // Apply move and check for check/checkmate
  const after = applyMoveToBoard(position, move.from, move.to, move.promotion);
  const opponent: Color = position.turn === 'w' ? 'b' : 'w';
  let suffix = '';
  if (isKingInCheck(after, opponent)) {
    suffix = isCheckmate(after) ? '#' : '+';
  }

  return `${pieceString}${disambig}${captureString}${move.to}${promoString}${suffix}`;
}

function isCheckmate(position: Position): boolean {
  if (!isKingInCheck(position, position.turn)) {
    return false;
  }

  // Try all moves for the side to move — if any gets out of check, not checkmate
  for (const [from, p] of position.board) {
    if (p.color !== position.turn) {
      continue;
    }
    // Try each possible destination (simplified: try all squares)
    for (let index = 0; index <= 119; index++) {
      if (index & OFF_BOARD) {
        continue;
      }
      const toIndex = index;
      const fromIndex = squareToIndex(from);
      const board = boardFromMap(position.board);
      if (!canAttack(board, fromIndex, toIndex, p.type, p.color)) {
        continue;
      }
      const target = position.board.get(
        [...position.board.keys()].find(
          (sq) => squareToIndex(sq) === toIndex,
        ) ?? ('' as Square),
      );
      if (target?.color === position.turn) {
        continue;
      }

      // Find target square
      let toSquare: Square | undefined;
      for (const sq of position.board.keys()) {
        if (squareToIndex(sq) === toIndex) {
          toSquare = sq;
          break;
        }
      }
      // Also need to check empty squares — build all 64 squares
      if (toSquare === undefined) {
        for (const f of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
          for (const r of ['1', '2', '3', '4', '5', '6', '7', '8']) {
            const sq = `${f}${r}` as Square;
            if (squareToIndex(sq) === toIndex) {
              toSquare = sq;
              break;
            }
          }
          if (toSquare !== undefined) {
            break;
          }
        }
      }
      if (toSquare === undefined) {
        continue;
      }

      const after = applyMoveToBoard(position, from, toSquare);
      if (!isKingInCheck(after, position.turn)) {
        return false;
      }
    }
  }
  return true;
}

export type { Move, Position } from '@echecs/position';
export type { SanMove };
export { parse, resolve, stringify };
