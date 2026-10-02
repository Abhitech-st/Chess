import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Chess } from "chess.js";
import { ChessBoard3D } from "./ChessBoard3D";
import { useChessEngine } from "./useChessEngine";
import { explainMove, explainUciMove } from "./moveExplainer";
import { analyzeMoveDeeply } from "./deepMoveAnalyzer";
import { evaluateTrainerFeedback } from "./chessTrainer";
import { usePeerMultiplayer } from "./usePeerMultiplayer";
import "./App.css";

// Unicode piece icons for captured display
const UNICODE_PIECES = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛",
  P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕",
};

export default function App() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  
  // Game Modes: 'ai', 'local', 'online'
  const [gameMode, setGameMode] = useState("ai");

  // AI Difficulty Level: depth 4, 8, 12, 16, 20
  const [aiDepth, setAiDepth] = useState(12);

  // Toggles: Hints & Chess Trainer
  const [showHints, setShowHints] = useState(true);
  const [showTrainer, setShowTrainer] = useState(true);

  // Mobile Slidable Drawers State
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  // Online Multiplayer Room Input
  const [joinInputCode, setJoinInputCode] = useState("");

  // Stockfish engine hook
  const {
    engineReady,
    isAnalyzing,
    depth,
    nodesDisplay,
    timeDisplay,
    evaluation,
    evalDisplay,
    evalBar,
    bestMove,
    hintSquares,
    pvLine,
    requestHint,
  } = useChessEngine(game.fen(), aiDepth);

  // WebRTC PeerJS Multiplayer hook
  const handleRemoteMove = useCallback((remoteMove) => {
    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move(remoteMove);
      if (move) {
        setGame(gameCopy);
        setSelectedSquare(null);
        setLastMove({ from: move.from, to: move.to });

        const explanation = explainMove(move, game);
        const deepAnalysis = analyzeMoveDeeply(move, game);

        setMoveHistory((prev) => [
          ...prev,
          {
            san: move.san,
            from: move.from,
            to: move.to,
            piece: move.piece,
            color: move.color,
            explanation,
            deepAnalysis,
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to apply remote move:", err);
    }
  }, [game]);

  const handleRemoteReset = useCallback(() => {
    setGame(new Chess());
    setSelectedSquare(null);
    setLastMove(null);
    setMoveHistory([]);
  }, []);

  const {
    peerId,
    roomCode,
    isHost,
    playerColor,
    connectionStatus,
    statusMessage,
    hostRoom,
    joinRoom,
    sendMove,
    sendReset,
    leaveRoom,
  } = usePeerMultiplayer(handleRemoteMove, handleRemoteReset);

  const isWhiteTurn = game.turn() === "w";
  const isGameOver = game.isGameOver();

  // Compute captured pieces & material score
  const capturedData = useMemo(() => {
    const board = game.board();
    const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== "k") {
          counts[piece.color][piece.type]++;
        }
      }
    }

    const initial = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    const capturedByWhite = [];
    const capturedByBlack = [];

    let whiteMaterial = 0;
    let blackMaterial = 0;

    for (const pieceType of ["p", "n", "b", "r", "q"]) {
      const taken = initial[pieceType] - counts.b[pieceType];
      for (let i = 0; i < taken; i++) {
        capturedByWhite.push(UNICODE_PIECES[pieceType]);
        whiteMaterial += values[pieceType];
      }
    }

    for (const pieceType of ["p", "n", "b", "r", "q"]) {
      const taken = initial[pieceType] - counts.w[pieceType];
      for (let i = 0; i < taken; i++) {
        capturedByBlack.push(UNICODE_PIECES[pieceType.toUpperCase()]);
        blackMaterial += values[pieceType];
      }
    }

    const diff = whiteMaterial - blackMaterial;

    return {
      capturedByWhite,
      capturedByBlack,
      diff,
    };
  }, [game]);

  // Compute 2-Column Move Pairs
  const movePairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        moveNum: Math.floor(i / 2) + 1,
        white: moveHistory[i],
        black: moveHistory[i + 1] || null,
      });
    }
    return pairs;
  }, [moveHistory]);

  // Stockfish Best Move details
  const bestMoveExplained = useMemo(() => {
    if (!showHints) return null;
    return explainUciMove(game, bestMove);
  }, [game, bestMove, showHints]);

  // Current Move details
  const currentMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

  // Trainer Coach feedback for current move
  const trainerFeedback = useMemo(() => {
    if (!currentMove) return null;
    return evaluateTrainerFeedback(currentMove, bestMove, evaluation, evaluation);
  }, [currentMove, bestMove, evaluation]);

  // Format PV continuation line
  const pvDisplay = useMemo(() => {
    if (!pvLine) return "";
    const moves = pvLine.split(" ").slice(0, 5);
    return moves.join(" ");
  }, [pvLine]);

  // Determine human move permission
  const canPlayerMove = useMemo(() => {
    if (isGameOver) return false;
    if (gameMode === "ai") return isWhiteTurn;
    if (gameMode === "local") return true;
    if (gameMode === "online") {
      if (connectionStatus !== "connected") return false;
      return (isWhiteTurn && playerColor === "w") || (!isWhiteTurn && playerColor === "b");
    }
    return true;
  }, [isGameOver, gameMode, isWhiteTurn, connectionStatus, playerColor]);

  // Legal moves for selected square
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return game
      .moves({ square: selectedSquare, verbose: true })
      .map((m) => m.to);
  }, [game, selectedSquare]);

  // Execute a move on the board
  const makeMove = useCallback(
    (moveObj) => {
      try {
        const gameBefore = new Chess(game.fen());
        const gameCopy = new Chess(game.fen());
        const move = gameCopy.move(moveObj);

        if (move) {
          setGame(gameCopy);
          setSelectedSquare(null);
          setLastMove({ from: move.from, to: move.to });

          const explanation = explainMove(move, gameBefore);
          const deepAnalysis = analyzeMoveDeeply(move, gameBefore);

          setMoveHistory((prev) => [
            ...prev,
            {
              san: move.san,
              from: move.from,
              to: move.to,
              piece: move.piece,
              color: move.color,
              explanation,
              deepAnalysis,
            },
          ]);

          if (gameMode === "online" && connectionStatus === "connected") {
            sendMove({ from: move.from, to: move.to, promotion: move.promotion || "q" });
          }

          return true;
        }
      } catch (err) {
        console.error("Move error:", err);
      }
      return false;
    },
    [game, gameMode, connectionStatus, sendMove]
  );

  // Auto-play AI move
  useEffect(() => {
    if (gameMode === "ai" && !isWhiteTurn && !isGameOver && bestMove) {
      const timer = setTimeout(() => {
        const from = bestMove.slice(0, 2);
        const to = bestMove.slice(2, 4);
        const promotion = bestMove.length === 5 ? bestMove[4] : "q";
        makeMove({ from, to, promotion });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameMode, isWhiteTurn, isGameOver, bestMove, makeMove]);

  // Square Click Handler
  const handleSquareClick = (square) => {
    if (!canPlayerMove) return;

    if (!selectedSquare) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      }
    } else if (selectedSquare === square) {
      setSelectedSquare(null);
    } else {
      const success = makeMove({
        from: selectedSquare,
        to: square,
        promotion: "q",
      });

      if (!success) {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    }
  };

  // Play Best Move
  const playBestMove = () => {
    if (bestMove && !isGameOver && canPlayerMove) {
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove.length === 5 ? bestMove[4] : "q";
      makeMove({ from, to, promotion });
    }
  };

  // Rebuild Undo Handler
  const undoMove = useCallback(() => {
    if (moveHistory.length === 0) return;

    const undoCount = gameMode === "ai" && moveHistory.length >= 2 ? 2 : 1;
    const newHistory = moveHistory.slice(0, moveHistory.length - undoCount);

    const newGame = new Chess();
    for (const m of newHistory) {
      newGame.move({ from: m.from, to: m.to, promotion: "q" });
    }

    setGame(newGame);
    setSelectedSquare(null);
    setMoveHistory(newHistory);

    if (newHistory.length > 0) {
      const prev = newHistory[newHistory.length - 1];
      setLastMove({ from: prev.from, to: prev.to });
    } else {
      setLastMove(null);
    }
  }, [moveHistory, gameMode]);

  // Reset Game
  const resetGame = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setLastMove(null);
    setMoveHistory([]);
    if (gameMode === "online" && connectionStatus === "connected") {
      sendReset();
    }
  };

  // Close Drawers
  const closeDrawers = () => {
    setIsLeftDrawerOpen(false);
    setIsRightDrawerOpen(false);
  };

  // Game Over Status
  const getGameOverReason = () => {
    if (game.isCheckmate()) return `Checkmate! ${isWhiteTurn ? "Black" : "White"} wins!`;
    if (game.isStalemate()) return "Stalemate! Draw game.";
    if (game.isThreefoldRepetition()) return "Draw by 3-fold repetition!";
    if (game.isInsufficientMaterial()) return "Draw due to insufficient material!";
    if (game.isDraw()) return "Draw game!";
    return "Game Over";
  };

  const evalWhitePct = Math.round(((evalBar + 1) / 2) * 100);

  return (
    <div className="app-container">
      {/* Top Header Controls */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <span className="brand-title">STELLAR CHESS 3D</span>
        </div>

        <div className="header-actions">
          {/* Mobile Quick Drawer Toggle Buttons */}
          <button
            className="btn btn-drawer-toggle mobile-only"
            onClick={() => {
              setIsLeftDrawerOpen((prev) => !prev);
              setIsRightDrawerOpen(false);
            }}
          >
            📊 Status & Eval
          </button>

          <button
            className="btn btn-drawer-toggle mobile-only"
            onClick={() => {
              setIsRightDrawerOpen((prev) => !prev);
              setIsLeftDrawerOpen(false);
            }}
          >
            📜 Analysis & Log
          </button>

          {/* Undo Button */}
          <button
            className="btn btn-secondary"
            onClick={undoMove}
            disabled={moveHistory.length === 0}
            title="Undo last move"
            style={{ opacity: moveHistory.length === 0 ? 0.5 : 1, cursor: moveHistory.length === 0 ? "not-allowed" : "pointer" }}
          >
            <span>↩ UNDO</span>
          </button>

          {/* Trainer Toggle */}
          <button
            className={`btn ${showTrainer ? "btn-hint" : "btn-secondary"}`}
            onClick={() => setShowTrainer((prev) => !prev)}
            title="Toggle Chess Coach & Trainer"
          >
            <span>{showTrainer ? "🎓 Trainer: ON" : "🎓 Trainer: OFF"}</span>
          </button>

          {/* AI Difficulty Level Selector */}
          {gameMode === "ai" && (
            <select
              className="btn btn-secondary"
              value={aiDepth}
              onChange={(e) => setAiDepth(parseInt(e.target.value, 10))}
              style={{ background: "#161936", color: "#ffd700", outline: "none", cursor: "pointer" }}
              title="Adjust Stockfish AI Difficulty Level"
            >
              <option value={4}>⚡ Level 1 (Beginner)</option>
              <option value={8}>⚔️ Level 2 (Casual)</option>
              <option value={12}>🧠 Level 3 (Intermediate)</option>
              <option value={16}>🏆 Level 4 (Master)</option>
              <option value={20}>👑 Level 5 (Grandmaster)</option>
            </select>
          )}

          {/* Hints Toggle Switch */}
          <button
            className={`btn ${showHints ? "btn-hint" : "btn-secondary"}`}
            onClick={() => setShowHints((prev) => !prev)}
          >
            <span>{showHints ? "💡 Hints: ON" : "🚫 Hints: OFF"}</span>
          </button>

          {/* Mode Switcher */}
          <select
            className="btn btn-secondary"
            value={gameMode}
            onChange={(e) => {
              const mode = e.target.value;
              setGameMode(mode);
              if (mode !== "online") leaveRoom();
            }}
            style={{ background: "#161936", color: "#38bdf8", outline: "none", cursor: "pointer" }}
          >
            <option value="ai">🤖 vs Engine AI</option>
            <option value="local">🎮 2 Player Local</option>
            <option value="online">🌐 2 Player Online WebRTC</option>
          </select>

          {/* New Game */}
          <button className="btn btn-primary" onClick={resetGame}>
            + NEW GAME
          </button>
        </div>
      </header>

      {/* Backdrop overlay for mobile drawers */}
      {(isLeftDrawerOpen || isRightDrawerOpen) && (
        <div className="drawer-backdrop" onClick={closeDrawers} />
      )}

      {/* Main 3-Column Workspace */}
      <div className="main-stage">
        {/* Left Panel (Slidable Drawer on Mobile) */}
        <aside className={`panel-left ${isLeftDrawerOpen ? "open" : ""}`}>
          {/* Game State Header */}
          <div className="glass-card">
            <div className="card-title">
              <span>Match Status</span>
              <button className="drawer-close-btn" onClick={() => setIsLeftDrawerOpen(false)}>✕</button>
            </div>
            <div className={`turn-badge ${isWhiteTurn ? "turn-white" : "turn-black"}`}>
              <span>{isWhiteTurn ? "♔ WHITE TO MOVE" : "♚ BLACK TO MOVE"}</span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Move {Math.floor(moveHistory.length / 2) + 1}</span>
            </div>
            <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#64748b" }}>
              ● {isGameOver ? "Match Finished" : "Game Active"}
            </div>
          </div>

          {/* Online WebRTC Room Controls (if mode active) */}
          {gameMode === "online" && (
            <div className="glass-card" style={{ borderColor: "rgba(124, 91, 245, 0.3)" }}>
              <div className="card-title" style={{ color: "#7c5bf5" }}>
                <span>Online WebRTC Room</span>
              </div>
              {connectionStatus === "disconnected" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button className="btn btn-primary" onClick={hostRoom} style={{ justifyContent: "center" }}>
                    Create Room (Host White)
                  </button>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      placeholder="Room Code..."
                      value={joinInputCode}
                      onChange={(e) => setJoinInputCode(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border: "1px solid #334155",
                        background: "#0d0f22",
                        color: "#fff",
                        fontSize: "0.78rem",
                      }}
                    />
                    <button className="btn btn-secondary" onClick={() => joinRoom(joinInputCode)}>
                      Join
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "0.8rem", marginBottom: "4px" }}>
                    Room Code: <strong style={{ color: "#00ff88" }}>{roomCode}</strong>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "8px" }}>
                    {statusMessage}
                  </div>
                  <button className="btn btn-secondary" onClick={leaveRoom} style={{ width: "100%", justifyContent: "center" }}>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Engine Status & Live Evaluation */}
          <div className="glass-card">
            <div className="card-title">
              <span>{isAnalyzing ? "◌ ANALYZING..." : "● ENGINE ACTIVE"}</span>
              <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>Stockfish 19</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "10px" }}>
              <div>Depth: <strong>{depth} / {aiDepth}</strong></div>
              <div>Nodes: <strong>{nodesDisplay}</strong></div>
              <div>Time: <strong>{timeDisplay}</strong></div>
              <div>Eval: <strong style={{ color: "#38bdf8" }}>{evalDisplay}</strong></div>
            </div>

            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "2px" }}>
              Win probability
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#cbd5e1" }}>
              <span>White {evalWhitePct}%</span>
              <span>Black {100 - evalWhitePct}%</span>
            </div>
            <div className="eval-track">
              <div className="eval-fill-white" style={{ width: `${evalWhitePct}%` }} />
            </div>
          </div>

          {/* Captured Pieces Panel */}
          <div className="glass-card captured-box">
            <div className="card-title">
              <span>Captured Pieces</span>
              {capturedData.diff !== 0 && (
                <span style={{ fontSize: "0.75rem", color: capturedData.diff > 0 ? "#38bdf8" : "#f43f5e" }}>
                  {capturedData.diff > 0 ? `White +${capturedData.diff}` : `Black +${Math.abs(capturedData.diff)}`}
                </span>
              )}
            </div>

            <div className="captured-row">
              <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>White:</span>
              <span className="captured-pieces-list">{capturedData.capturedByWhite.length > 0 ? capturedData.capturedByWhite.join(" ") : "—"}</span>
            </div>

            <div className="captured-row">
              <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Black:</span>
              <span className="captured-pieces-list">{capturedData.capturedByBlack.length > 0 ? capturedData.capturedByBlack.join(" ") : "—"}</span>
            </div>
          </div>
        </aside>

        {/* Center 3D Board */}
        <main className="canvas-area">
          <ChessBoard3D
            game={game}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            lastMove={lastMove}
            hintSquares={showHints ? hintSquares : null}
            onSquareClick={handleSquareClick}
          />

          {/* Game Over Modal */}
          {isGameOver && (
            <div className="game-over-overlay">
              <div className="game-over-title">CHECKMATE</div>
              <div className="game-over-reason">{getGameOverReason()}</div>
              <button className="btn btn-primary" onClick={resetGame}>
                PLAY AGAIN
              </button>
            </div>
          )}
        </main>

        {/* Right Panel (Slidable Drawer on Mobile) */}
        <aside className={`panel-right ${isRightDrawerOpen ? "open" : ""}`}>
          {/* 1. Chess Trainer / Coach Card (if enabled) */}
          {showTrainer && trainerFeedback && (
            <div className="glass-card" style={{ borderColor: trainerFeedback.color, background: `${trainerFeedback.color}0a` }}>
              <div className="card-title" style={{ color: trainerFeedback.color }}>
                <span>🎓 CHESS COACH</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700" }}>{trainerFeedback.title}</span>
                  <button className="drawer-close-btn" onClick={() => setIsRightDrawerOpen(false)}>✕</button>
                </div>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#e2e8f0", lineHeight: "1.4" }}>
                {trainerFeedback.advice}
              </div>
            </div>
          )}

          {/* 2. Engine Recommendation Card */}
          {showHints && (
            <div className="glass-card" style={{ borderColor: "rgba(0, 255, 136, 0.25)" }}>
              <div className="card-title" style={{ color: "#00ff88" }}>
                <span>✦ ENGINE RECOMMENDATION</span>
                {(!showTrainer || !trainerFeedback) && (
                  <button className="drawer-close-btn" onClick={() => setIsRightDrawerOpen(false)}>✕</button>
                )}
              </div>

              {bestMoveExplained ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: "700", fontFamily: "JetBrains Mono", color: "#00ff88" }}>
                        {bestMoveExplained.san}
                      </span>
                      <span style={{ fontSize: "0.82rem", color: "#38bdf8", fontWeight: "600" }}>
                        {evalDisplay}
                      </span>
                    </div>

                    {canPlayerMove && (
                      <button className="btn btn-hint" style={{ padding: "4px 10px", fontSize: "0.72rem" }} onClick={playBestMove}>
                        PLAY MOVE
                      </button>
                    )}
                  </div>

                  <div style={{ padding: "6px 8px", background: "rgba(0,0,0,0.3)", borderRadius: "4px", borderLeft: "2px solid #00ff88", marginBottom: "8px", fontFamily: "JetBrains Mono", fontSize: "0.78rem", color: "#cbd5e1" }}>
                    {pvDisplay || `${bestMoveExplained.from} → ${bestMoveExplained.to}`}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748b" }}>
                    <span>Depth {depth}</span>
                    <span>{nodesDisplay} nodes</span>
                    <span>Stockfish 19</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  {engineReady ? "Calculating recommendation..." : "Initializing Stockfish..."}
                </div>
              )}
            </div>
          )}

          {/* 3. Current Move Deep Analysis Card */}
          <div className="glass-card" style={{ borderColor: "rgba(56, 189, 248, 0.25)" }}>
            <div className="card-title" style={{ color: "#38bdf8" }}>
              <span>🎯 MOVE ANALYSIS</span>
            </div>

            {currentMove ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.2rem", fontWeight: "700", fontFamily: "JetBrains Mono", color: "#ffffff" }}>
                    {currentMove.san}
                  </span>
                  {bestMove && (
                    <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                      Best response: <strong style={{ color: "#38bdf8" }}>...{bestMove.slice(2, 4)}</strong>
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                  Why?
                </div>
                {currentMove.deepAnalysis?.strengths.map((s, idx) => (
                  <div key={idx} style={{ fontSize: "0.78rem", color: "#e2e8f0", marginBottom: "3px", paddingLeft: "8px", borderLeft: "2px solid #38bdf8" }}>
                    • {s}
                  </div>
                ))}

                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "8px" }}>
                  Evaluation: <strong style={{ color: "#38bdf8" }}>{evalDisplay}</strong>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                Make your opening move to inspect tactical analysis.
              </div>
            )}
          </div>

          {/* 4. Two-Column Move History Table */}
          <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="card-title">
              <span>MOVE HISTORY</span>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{moveHistory.length} Moves</span>
            </div>

            <div className="move-table-container" style={{ flex: 1 }}>
              <table className="move-table">
                <thead>
                  <tr>
                    <th style={{ width: "35px" }}>#</th>
                    <th>WHITE</th>
                    <th>BLACK</th>
                  </tr>
                </thead>
                <tbody>
                  {movePairs.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center", color: "#64748b", padding: "16px" }}>
                        No moves played yet.
                      </td>
                    </tr>
                  ) : (
                    movePairs.map((pair, idx) => {
                      const isLastRow = idx === movePairs.length - 1;
                      const isWhiteLast = isLastRow && !pair.black;
                      const isBlackLast = isLastRow && Boolean(pair.black);

                      return (
                        <tr key={idx} className={isLastRow ? "last-move-row" : ""}>
                          <td style={{ color: "#64748b" }}>{pair.moveNum}.</td>
                          <td className={isWhiteLast ? "active-move" : ""}>
                            {pair.white ? pair.white.san : ""} {isWhiteLast ? "←" : ""}
                          </td>
                          <td className={isBlackLast ? "active-move" : ""}>
                            {pair.black ? pair.black.san : ""} {isBlackLast ? "←" : ""}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}