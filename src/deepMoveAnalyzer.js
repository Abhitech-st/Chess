import { Chess } from "chess.js";

/**
 * Deep Move Tactical Analyzer
 * Evaluates why a move works (strengths) and where it lacks (drawbacks/trade-offs).
 */
export function analyzeMoveDeeply(move, gameBefore) {
  if (!move || !gameBefore) return null;

  const piece = move.piece; // p, n, b, r, q, k
  const from = move.from;
  const to = move.to;
  const san = move.san;
  const color = move.color;
  const captured = move.captured;

  const strengths = [];
  const weaknesses = [];

  // Center squares: e4, d4, e5, d5
  const centerSquares = ["e4", "d4", "e5", "d5"];
  const extendedCenter = ["c4", "f4", "c5", "f5", "e3", "d3", "e6", "d6"];

  // --- STRENGTH ANALYSIS (Why it works) ---
  if (san.includes("#")) {
    strengths.push("Delivers immediate checkmate to win the match");
  } else if (san.includes("+")) {
    strengths.push("Delivers check, putting heavy tactical pressure on the enemy King");
  }

  if (captured) {
    const pieceName = { p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen" }[captured] || "piece";
    strengths.push(`Captures enemy ${pieceName} on ${to}, winning material`);
  }

  if (move.flags.includes("k") || move.flags.includes("q")) {
    strengths.push("Safeguards the King behind pawn shield and activates Rook");
  }

  if (centerSquares.includes(to)) {
    strengths.push(`Occupies central square ${to}, commanding key board territory`);
  } else if (extendedCenter.includes(to)) {
    strengths.push(`Influences center area from ${to}`);
  }

  if ((piece === "n" || piece === "b") && (from[1] === "1" || from[1] === "8")) {
    strengths.push("Develops a minor piece from back rank into active play");
  }

  if (piece === "r" && (to[1] === "7" || to[1] === "2")) {
    strengths.push("Infiltrates the 7th/2nd rank, targeting enemy pawns");
  }

  if (strengths.length === 0) {
    strengths.push(`Repositions ${piece === "p" ? "Pawn" : "Piece"} to improve board presence`);
  }

  // --- WEAKNESS / TRADE-OFF ANALYSIS (Where it lacks) ---
  if (piece === "p") {
    weaknesses.push(`Pawn advance to ${to} leaves square ${from} permanently undefended by pawns`);
  }

  if (piece === "k" && !move.flags.includes("k") && !move.flags.includes("q")) {
    weaknesses.push("King movement in middlegame forfeits castling rights and exposes King");
  }

  if (piece !== "p" && (from[1] === "2" || from[1] === "7") && (from[0] === "f" || from[0] === "g" || from[0] === "c")) {
    weaknesses.push(`Moving piece away from ${from} reduces defense of surrounding pawns`);
  }

  if (!captured && !san.includes("+") && (to[0] === "a" || to[0] === "h")) {
    weaknesses.push(`Placing piece on edge file ${to} limits total square mobility`);
  }

  if (weaknesses.length === 0) {
    weaknesses.push("Slightly commits piece activity; requires careful square coordination");
  }

  return {
    san,
    from,
    to,
    strengths,
    weaknesses,
  };
}
