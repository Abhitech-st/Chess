import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Custom hook that manages Stockfish engine communication.
 * Accepts gameFen and targetDepth for difficulty level adjustment.
 */
export function useChessEngine(gameFen, targetDepth = 15) {
  const [engineReady, setEngineReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [depth, setDepth] = useState(0);
  const [nodes, setNodes] = useState(0);
  const [timeMs, setTimeMs] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [bestMove, setBestMove] = useState(null);
  const [hintSquares, setHintSquares] = useState(null);
  const [pvLine, setPvLine] = useState("");

  const stockfish = useRef(null);

  // Initialize Stockfish worker
  useEffect(() => {
    try {
      stockfish.current = new Worker("/stockfish.js");

      stockfish.current.onmessage = (event) => {
        const msg = event.data;
        if (typeof msg !== "string") return;

        if (msg === "uciok") {
          setEngineReady(true);
          stockfish.current.postMessage("isready");
        }

        if (msg.startsWith("info")) {
          // Parse depth
          const depthMatch = msg.match(/depth (\d+)/);
          if (depthMatch) {
            setDepth(parseInt(depthMatch[1], 10));
          }

          // Parse nodes
          const nodesMatch = msg.match(/nodes (\d+)/);
          if (nodesMatch) {
            setNodes(parseInt(nodesMatch[1], 10));
          }

          // Parse time ms
          const timeMatch = msg.match(/time (\d+)/);
          if (timeMatch) {
            setTimeMs(parseInt(timeMatch[1], 10));
          }

          // Parse CP Evaluation
          if (msg.includes(" cp ")) {
            const cpMatch = msg.match(/cp (-?\d+)/);
            if (cpMatch) {
              setEvaluation({ type: "cp", value: parseInt(cpMatch[1], 10) });
            }
          }

          // Parse Mate Evaluation
          if (msg.includes(" mate ")) {
            const mateMatch = msg.match(/mate (-?\d+)/);
            if (mateMatch) {
              setEvaluation({ type: "mate", value: parseInt(mateMatch[1], 10) });
            }
          }

          // Extract PV line (Principal Variation)
          const pvMatch = msg.match(/ pv (.+)/);
          if (pvMatch) {
            setPvLine(pvMatch[1]);
          }
        }

        if (msg.startsWith("bestmove")) {
          const bm = msg.split(" ")[1];
          setBestMove(bm);
          setIsAnalyzing(false);
        }
      };

      stockfish.current.postMessage("uci");
    } catch (err) {
      console.error("Failed to load Stockfish worker:", err);
    }

    return () => {
      stockfish.current?.terminate();
    };
  }, []);

  // Trigger analysis on FEN or depth level change
  useEffect(() => {
    if (engineReady && stockfish.current) {
      setIsAnalyzing(true);
      setBestMove(null);
      setHintSquares(null);
      stockfish.current.postMessage("stop");
      stockfish.current.postMessage(`position fen ${gameFen}`);
      stockfish.current.postMessage(`go depth ${targetDepth}`);
    }
  }, [gameFen, engineReady, targetDepth]);

  // Request hint squares from best move
  const requestHint = useCallback(() => {
    if (bestMove && bestMove.length >= 4) {
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      setHintSquares({ from, to });
      setTimeout(() => setHintSquares(null), 4000);
    }
  }, [bestMove]);

  const clearHint = useCallback(() => {
    setHintSquares(null);
  }, []);

  // Format evaluation text e.g. "+0.30" or "M3"
  const evalDisplay = evaluation
    ? evaluation.type === "mate"
      ? `M${evaluation.value > 0 ? "+" : ""}${evaluation.value}`
      : `${evaluation.value >= 0 ? "+" : ""}${(evaluation.value / 100).toFixed(2)}`
    : "0.00";

  // Eval bar value normalized (-1 to +1)
  const evalBar = evaluation
    ? evaluation.type === "mate"
      ? evaluation.value > 0 ? 1 : -1
      : Math.max(-1, Math.min(1, evaluation.value / 400))
    : 0;

  // Format node count e.g. "1.24M" or "842K"
  const nodesDisplay =
    nodes >= 1000000
      ? `${(nodes / 1000000).toFixed(2)}M`
      : nodes >= 1000
      ? `${Math.round(nodes / 1000)}K`
      : `${nodes}`;

  // Format time e.g. "0.82s"
  const timeDisplay = `${(timeMs / 1000).toFixed(2)}s`;

  return {
    engineReady,
    isAnalyzing,
    depth,
    nodes,
    nodesDisplay,
    timeMs,
    timeDisplay,
    evaluation,
    evalDisplay,
    evalBar,
    bestMove,
    hintSquares,
    pvLine,
    requestHint,
    clearHint,
  };
}
