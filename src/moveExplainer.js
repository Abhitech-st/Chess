import { Chess } from "chess.js";

const PIECE_NAMES = {
  p: "Pawn",
  n: "Knight",
  b: "Bishop",
  r: "Rook",
  q: "Queen",
  k: "King",
};

/**
 * Helper to get piece name with color adjective
 */
function getPieceName(type, color) {
  const name = PIECE_NAMES[type] || "Piece";
  const colorStr = color === "w" ? "White" : "Black";
  return `${colorStr} ${name}`;
}

/**
 * Explains a move with deep context relative to the actual board position before the move.
 */
export function explainMove(move, gameBefore) {
  if (!move) return "";

  const pieceName = PIECE_NAMES[move.piece] || "Piece";
  const colorStr = move.color === "w" ? "White" : "Black";
  const enemyColorStr = move.color === "w" ? "Black" : "White";
  const to = move.to;
  const from = move.from;
  const san = move.san;

  // 1. Castling
  if (move.flags.includes("k")) {
    return `${colorStr} castles Kingside — placing the King in safety on ${to} and connecting the Rooks`;
  }
  if (move.flags.includes("q")) {
    return `${colorStr} castles Queenside — securing the King on ${to} and deploying the Rook to the d-file`;
  }

  // 2. Promotion
  if (move.promotion) {
    const promoName = PIECE_NAMES[move.promotion] || "Queen";
    if (move.captured) {
      const capName = PIECE_NAMES[move.captured] || "piece";
      return `${pieceName} captures ${enemyColorStr}'s ${capName} on ${to} and promotes into a ${promoName}!`;
    }
    return `${pieceName} advances to ${to} and promotes into a ${promoName}!`;
  }

  // 3. En Passant
  if (move.flags.includes("e")) {
    return `${pieceName} captures en passant on ${to}, eliminating the passed enemy Pawn`;
  }

  // 4. Inspect board context if gameBefore is available
  if (gameBefore) {
    try {
      const boardBefore = gameBefore.board();
      const tempGame = new Chess(gameBefore.fen());
      tempGame.move(move);
      const boardAfter = tempGame.board();

      // Check if move created a checkmate
      if (tempGame.isCheckmate()) {
        if (move.captured) {
          const capName = PIECE_NAMES[move.captured] || "piece";
          return `${pieceName} captures ${enemyColorStr}'s ${capName} on ${to} — Checkmate! Match won.`;
        }
        return `${pieceName} delivers the final blow on ${to} — Checkmate! Match won.`;
      }

      // Check if move created a check
      if (tempGame.inCheck()) {
        if (move.captured) {
          const capName = PIECE_NAMES[move.captured] || "piece";
          return `${pieceName} captures ${enemyColorStr}'s ${capName} on ${to} with check, forcing an immediate response`;
        }
        return `${pieceName} moves to ${to}, putting ${enemyColorStr}'s King in check!`;
      }

      // Inspect attacks/threats created on enemy pieces
      const attackedPieces = [];
      const enemyColor = move.color === "w" ? "b" : "w";

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = boardAfter[r][c];
          if (piece && piece.color === enemyColor) {
            const square = `${"abcdefgh"[c]}${8 - r}`;
            // Check if our moved piece attacks this square
            const attacks = tempGame.attacks(to);
            if (attacks.includes(square)) {
              attackedPieces.push({ square, piece: PIECE_NAMES[piece.type] });
            }
          }
        }
      }

      // Double attack / Fork
      if (attackedPieces.length >= 2) {
        const p1 = attackedPieces[0];
        const p2 = attackedPieces[1];
        return `${pieceName} moves to ${to}, creating a double attack (fork) on ${enemyColorStr}'s ${p1.piece} on ${p1.square} and ${p2.piece} on ${p2.square}!`;
      }

      // Single major piece threat
      if (attackedPieces.length === 1) {
        const target = attackedPieces[0];
        if (target.piece === "Queen" || target.piece === "Rook" || target.piece === "King") {
          if (move.captured) {
            const capName = PIECE_NAMES[move.captured] || "piece";
            return `${pieceName} captures on ${to} and threatens ${enemyColorStr}'s ${target.piece} on ${target.square}`;
          }
          return `${pieceName} moves to ${to}, threatening ${enemyColorStr}'s ${target.piece} on ${target.square}`;
        }
      }

      // Pin check for Bishops / Rooks / Queens
      if (move.piece === "b" || move.piece === "r" || move.piece === "q") {
        if (to === "b5" || to === "g5" || to === "b4" || to === "g4") {
          return `${pieceName} moves to ${to}, pinning an enemy piece along the diagonal/file`;
        }
      }
    } catch (err) {
      console.error("Contextual analysis error:", err);
    }
  }

  // 5. Captures
  if (move.captured) {
    const capturedName = PIECE_NAMES[move.captured] || "piece";
    return `${pieceName} captures ${enemyColorStr}'s ${capturedName} on ${to}`;
  }

  // 6. Tactical Positional Context
  const centerSquares = ["e4", "d4", "e5", "d5"];
  if (move.piece === "p" && centerSquares.includes(to)) {
    return `${colorStr} Pawn advances to ${to}, establishing strong central control`;
  }

  if ((move.piece === "n" || move.piece === "b") && (from[1] === "1" || from[1] === "8")) {
    return `${pieceName} develops from ${from} to ${to}, activating the piece for tactical play`;
  }

  if (move.piece === "r" && (to[1] === "7" || to[1] === "2")) {
    return `Rook invades the 7th rank on ${to}, attacking enemy pawns and limiting King mobility`;
  }

  if (move.piece === "r" && (to[0] === "e" || to[0] === "d")) {
    return `Rook moves to ${to}, taking command of the central ${to[0]}-file`;
  }

  // 7. Default Specific Statement
  return `${pieceName} moves from ${from} to ${to}`;
}

/**
 * Explains a UCI move (e.g. "e2e4", "g1f3") given current game board position.
 * Returns { san, from, to, explanation }
 */
export function explainUciMove(game, uciStr) {
  if (!game || !uciStr || uciStr.length < 4) return null;
  try {
    const tempGame = new Chess(game.fen());
    const from = uciStr.slice(0, 2);
    const to = uciStr.slice(2, 4);
    const promotion = uciStr.length === 5 ? uciStr[4] : "q";

    const move = tempGame.move({ from, to, promotion });
    if (move) {
      return {
        san: move.san,
        from: move.from,
        to: move.to,
        explanation: explainMove(move, game),
      };
    }
  } catch (err) {
    console.error("Error explaining UCI move:", err);
  }
  return null;
}
