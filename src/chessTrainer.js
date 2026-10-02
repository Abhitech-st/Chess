/**
 * Chess Trainer & Tactical Coach Module
 * Evaluates move quality (Brilliant, Good, Inaccuracy, Mistake, Blunder)
 * and provides real-time coaching feedback.
 */

export function evaluateTrainerFeedback(move, bestMove, evalBefore, evalAfter) {
  if (!move) return null;

  const isBestMovePlayed = bestMove && bestMove.slice(0, 4) === `${move.from}${move.to}`;

  // Calculate evaluation swing (in cp)
  const cpBefore = evalBefore ? (evalBefore.type === "cp" ? evalBefore.value : (evalBefore.value > 0 ? 1000 : -1000)) : 0;
  const cpAfter = evalAfter ? (evalAfter.type === "cp" ? evalAfter.value : (evalAfter.value > 0 ? 1000 : -1000)) : 0;
  
  // For White, eval drop is cpBefore - cpAfter. For Black, it's cpAfter - cpBefore.
  const evalDrop = move.color === "w" ? (cpBefore - cpAfter) : (cpAfter - cpBefore);

  let rating = "GOOD"; // 'BRILLIANT', 'BEST', 'GOOD', 'INACCURACY', 'BLUNDER'
  let title = "Solid Move";
  let color = "#38bdf8";
  let advice = "";

  if (isBestMovePlayed) {
    if (move.captured || move.san.includes("+") || move.san.includes("#")) {
      rating = "BRILLIANT";
      title = "🌟 Brilliant Move!";
      color = "#ffd700";
      advice = "Outstanding vision! You found the sharpest engine-recommended tactical continuation.";
    } else {
      rating = "BEST";
      title = "⭐ Best Move!";
      color = "#00ff88";
      advice = "Perfect decision. You played the top engine line for maximum advantage.";
    }
  } else if (evalDrop > 250) {
    rating = "BLUNDER";
    title = "🚨 Blunder!";
    color = "#f43f5e";
    advice = "Be careful! This move significantly dropped your position's evaluation. Check if a piece was left undefended.";
  } else if (evalDrop > 100) {
    rating = "INACCURACY";
    title = "⚠️ Inaccuracy";
    color = "#fbbf24";
    advice = "A slightly sub-optimal move. Consider controlling the center squares or developing minor pieces first.";
  } else {
    rating = "GOOD";
    title = "✓ Solid Move";
    color = "#38bdf8";
    advice = "Good positioning! Keep coordinating your pieces and protecting your King.";
  }

  return {
    rating,
    title,
    color,
    advice,
    isBestMovePlayed,
  };
}
