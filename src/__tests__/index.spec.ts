import parseFen from '@echecs/fen';
import { Position, STARTING_POSITION } from '@echecs/position';
import { describe, expect, it } from 'vitest';

import { parse, resolve, stringify } from '../index.js';

// Helper: parseFen returns a plain object; wrap it in a Position instance so
// that resolve/stringify can call .pieces() and .piece() on it.
function toPosition(fen: string): Position {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseFen(fen) as any;
  return new Position(raw.board, {
    castlingRights: raw.castlingRights,
    enPassantSquare: raw.enPassantSquare,
    turn: raw.turn,
  });
}

// ---------------------------------------------------------------------------
// parse()
// ---------------------------------------------------------------------------

describe('parse — pawn moves', () => {
  it('parses a simple pawn push', () => {
    const move = parse('e4');
    expect(move.piece).toBe('p');
    expect(move.to).toBe('e4');
    expect(move.capture).toBe(false);
    expect(move.castle).toBeUndefined();
    expect(move.check).toBeUndefined();
    expect(move.promotion).toBeUndefined();
  });

  it('parses a pawn capture', () => {
    const move = parse('exd5');
    expect(move.piece).toBe('p');
    expect(move.capture).toBe(true);
    expect(move.file).toBe('e');
    expect(move.to).toBe('d5');
  });

  it('parses a pawn promotion', () => {
    const move = parse('e8=Q');
    expect(move.piece).toBe('p');
    expect(move.to).toBe('e8');
    expect(move.promotion).toBe('q');
  });

  it('parses a promotion with checkmate', () => {
    const move = parse('exd8=Q#');
    expect(move.capture).toBe(true);
    expect(move.promotion).toBe('q');
    expect(move.check).toBe('checkmate');
  });
});

describe('parse — piece moves', () => {
  it('parses a knight move', () => {
    const move = parse('Nf3');
    expect(move.piece).toBe('n');
    expect(move.to).toBe('f3');
    expect(move.capture).toBe(false);
  });

  it('parses a piece capture', () => {
    const move = parse('Rxe4');
    expect(move.piece).toBe('r');
    expect(move.capture).toBe(true);
    expect(move.to).toBe('e4');
  });

  it('parses file disambiguation', () => {
    const move = parse('Nbd7');
    expect(move.piece).toBe('n');
    expect(move.file).toBe('b');
    expect(move.to).toBe('d7');
  });

  it('parses rank disambiguation', () => {
    const move = parse('N2d4');
    expect(move.piece).toBe('n');
    expect(move.rank).toBe('2');
    expect(move.to).toBe('d4');
  });
});

describe('parse — check and checkmate', () => {
  it('parses check suffix', () => {
    expect(parse('Nf3+').check).toBe('check');
  });

  it('parses checkmate suffix', () => {
    expect(parse('Qxh7#').check).toBe('checkmate');
  });
});

describe('parse — castling', () => {
  it('parses kingside castling', () => {
    const move = parse('O-O');
    expect(move.castle).toBe('kingside');
    expect(move.to).toBeUndefined();
    expect(move.piece).toBe('k');
  });

  it('parses queenside castling', () => {
    expect(parse('O-O-O').castle).toBe('queenside');
  });

  it('parses castling with check', () => {
    expect(parse('O-O+').check).toBe('check');
  });
});

describe('parse — errors', () => {
  it('throws RangeError for invalid input', () => {
    expect(() => parse('invalid')).toThrow(RangeError);
  });

  it('throws RangeError for empty string', () => {
    expect(() => parse('')).toThrow(RangeError);
  });
});

describe('parse — with position', () => {
  it('parses and resolves e4 from starting position', () => {
    const move = parse('e4', STARTING_POSITION);
    expect(move.from).toBe('e2');
    expect(move.to).toBe('e4');
    expect(move.promotion).toBeUndefined();
  });

  it('parses and resolves Nf3 from starting position', () => {
    const move = parse('Nf3', STARTING_POSITION);
    expect(move.from).toBe('g1');
    expect(move.to).toBe('f3');
    expect(move.promotion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// resolve()
// ---------------------------------------------------------------------------

describe('resolve — starting position', () => {
  it('resolves e4', () => {
    const move = resolve(parse('e4'), STARTING_POSITION);
    expect(move.from).toBe('e2');
    expect(move.to).toBe('e4');
    expect(move.promotion).toBeUndefined();
  });

  it('resolves Nf3', () => {
    const move = resolve(parse('Nf3'), STARTING_POSITION);
    expect(move.from).toBe('g1');
    expect(move.to).toBe('f3');
  });

  it('resolves Nc3', () => {
    const move = resolve(parse('Nc3'), STARTING_POSITION);
    expect(move.from).toBe('b1');
    expect(move.to).toBe('c3');
  });

  it('resolves d4', () => {
    const move = resolve(parse('d4'), STARTING_POSITION);
    expect(move.from).toBe('d2');
    expect(move.to).toBe('d4');
  });
});

describe('resolve — castling', () => {
  it('resolves O-O for white', () => {
    const pos = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1')!;
    const move = resolve(parse('O-O'), pos);
    expect(move.from).toBe('e1');
    expect(move.to).toBe('g1');
  });

  it('resolves O-O-O for white', () => {
    const pos = parseFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1')!;
    const move = resolve(parse('O-O-O'), pos);
    expect(move.from).toBe('e1');
    expect(move.to).toBe('c1');
  });
});

describe('resolve — errors', () => {
  it('throws RangeError for illegal move', () => {
    expect(() => resolve(parse('e5'), STARTING_POSITION)).toThrow(RangeError);
  });

  it('throws RangeError for wrong-colored piece move', () => {
    expect(() => resolve(parse('e5'), STARTING_POSITION)).toThrow(RangeError);
  });
});

describe('resolve — en passant', () => {
  it('resolves en passant capture', () => {
    const pos = toPosition(
      'rnbqkbnr/pppp2pp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3',
    );
    const move = resolve(parse('fxe6'), pos);
    expect(move.from).toBe('f5');
    expect(move.to).toBe('e6');
  });
});

describe('resolve — promotion', () => {
  it('resolves pawn promotion', () => {
    const pos = toPosition('8/P7/8/8/8/8/8/4K2k w - - 0 1');
    const move = resolve(parse('a8=Q'), pos);
    expect(move.from).toBe('a7');
    expect(move.to).toBe('a8');
    expect(move.promotion).toBe('q');
  });

  it('resolves capture with promotion', () => {
    const pos = toPosition('1n6/P7/8/8/8/8/8/4K2k w - - 0 1');
    const move = resolve(parse('axb8=Q'), pos);
    expect(move.from).toBe('a7');
    expect(move.to).toBe('b8');
    expect(move.promotion).toBe('q');
  });
});

// ---------------------------------------------------------------------------
// stringify()
// ---------------------------------------------------------------------------

describe('stringify — pawn moves', () => {
  it('stringifies pawn push', () => {
    expect(
      stringify(
        { from: 'e2', promotion: undefined, to: 'e4' },
        STARTING_POSITION,
      ),
    ).toBe('e4');
  });

  it('stringifies pawn double push', () => {
    expect(
      stringify(
        { from: 'd2', promotion: undefined, to: 'd4' },
        STARTING_POSITION,
      ),
    ).toBe('d4');
  });
});

describe('stringify — piece moves', () => {
  it('stringifies knight move', () => {
    expect(
      stringify(
        { from: 'g1', promotion: undefined, to: 'f3' },
        STARTING_POSITION,
      ),
    ).toBe('Nf3');
  });
});

describe('stringify — captures', () => {
  it('stringifies pawn capture', () => {
    const pos = toPosition(
      'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
    );
    expect(stringify({ from: 'e4', promotion: undefined, to: 'd5' }, pos)).toBe(
      'exd5',
    );
  });
});

describe('stringify — en passant', () => {
  it('stringifies en passant capture', () => {
    const pos = toPosition(
      'rnbqkbnr/pppp2pp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3',
    );
    expect(stringify({ from: 'f5', promotion: undefined, to: 'e6' }, pos)).toBe(
      'fxe6',
    );
  });
});

describe('stringify — promotion', () => {
  it('stringifies pawn promotion (gives check via diagonal)', () => {
    // a7→a8=Q: the new queen on a8 checks the black king on h1 via diagonal
    const pos = toPosition('8/P7/8/8/8/8/8/4K2k w - - 0 1');
    expect(stringify({ from: 'a7', promotion: 'q', to: 'a8' }, pos)).toBe(
      'a8=Q+',
    );
  });

  it('stringifies capture with promotion', () => {
    const pos = toPosition('1n6/P7/8/8/8/8/8/4K2k w - - 0 1');
    expect(stringify({ from: 'a7', promotion: 'q', to: 'b8' }, pos)).toBe(
      'axb8=Q',
    );
  });
});

describe('stringify — check and checkmate', () => {
  it('stringifies move that gives check', () => {
    // White bishop on c4 moves to e6, giving check to black king on f7
    const pos = toPosition('8/5k2/8/8/2B5/8/8/4K3 w - - 0 1');
    expect(stringify({ from: 'c4', promotion: undefined, to: 'e6' }, pos)).toBe(
      'Be6+',
    );
  });

  it('stringifies move that gives checkmate', () => {
    // White queen on h5 captures f7, checkmate (Scholar's mate)
    const pos = toPosition(
      'rnbqkbnr/pppp1ppp/8/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 3',
    );
    expect(stringify({ from: 'h5', promotion: undefined, to: 'f7' }, pos)).toBe(
      'Qxf7#',
    );
  });
});

describe('stringify — disambiguation', () => {
  it('disambiguates by file when two knights on same rank, different files', () => {
    // Knights on b1 and d1, both can reach c3; b1 is on file 'b', d1 on file 'd'
    const pos = toPosition('4k3/8/8/8/8/8/8/1N1NK3 w - - 0 1');
    expect(stringify({ from: 'b1', promotion: undefined, to: 'c3' }, pos)).toBe(
      'Nbc3',
    );
  });

  it('disambiguates by rank when two knights on same file', () => {
    // Knights on d1 and d3, both can reach b2; d1 is rank '1', d3 is rank '3'
    const pos = toPosition('4k3/8/8/8/8/3N4/8/3NK3 w - - 0 1');
    expect(stringify({ from: 'd1', promotion: undefined, to: 'b2' }, pos)).toBe(
      'N1b2',
    );
  });
});

describe('stringify — round-trip', () => {
  it('e4 round-trips', () => {
    const move = resolve(parse('e4'), STARTING_POSITION);
    expect(stringify(move, STARTING_POSITION)).toBe('e4');
  });

  it('Nf3 round-trips', () => {
    const move = resolve(parse('Nf3'), STARTING_POSITION);
    expect(stringify(move, STARTING_POSITION)).toBe('Nf3');
  });

  it('Nc3 round-trips', () => {
    const move = resolve(parse('Nc3'), STARTING_POSITION);
    expect(stringify(move, STARTING_POSITION)).toBe('Nc3');
  });
});

describe('stringify — round-trip (complex)', () => {
  it('en passant round-trips', () => {
    const pos = toPosition(
      'rnbqkbnr/pppp2pp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3',
    );
    const move = resolve(parse('fxe6'), pos);
    expect(stringify(move, pos)).toBe('fxe6');
  });

  it('promotion round-trips', () => {
    const pos = toPosition('8/P7/8/8/8/8/8/4K2k w - - 0 1');
    const move = resolve(parse('a8=Q'), pos);
    // a8=Q+ because queen on a8 checks black king on h1 via diagonal
    expect(stringify(move, pos)).toBe('a8=Q+');
  });

  it('disambiguation round-trips', () => {
    const pos = toPosition('4k3/8/8/8/8/8/8/1N1NK3 w - - 0 1');
    const move = resolve(parse('Nbc3'), pos);
    expect(stringify(move, pos)).toBe('Nbc3');
  });
});
