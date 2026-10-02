import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "peerjs";

export function usePeerMultiplayer(onMoveReceived, onResetReceived) {
  const [peerId, setPeerId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [playerColor, setPlayerColor] = useState("w"); // 'w' or 'b'
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // 'disconnected', 'hosting', 'connecting', 'connected'
  const [statusMessage, setStatusMessage] = useState("");

  const peerRef = useRef(null);
  const connRef = useRef(null);

  // Store latest callbacks in refs to prevent Peer.destroy() on state changes
  const onMoveRef = useRef(onMoveReceived);
  const onResetRef = useRef(onResetReceived);

  useEffect(() => {
    onMoveRef.current = onMoveReceived;
  }, [onMoveReceived]);

  useEffect(() => {
    onResetRef.current = onResetReceived;
  }, [onResetReceived]);

  // Initialize PeerJS client ONCE on mount
  useEffect(() => {
    const randomId = "stellar-" + Math.floor(1000 + Math.random() * 9000);
    const peer = new Peer(randomId, {
      debug: 1,
    });

    peer.on("open", (id) => {
      setPeerId(id);
    });

    peer.on("connection", (conn) => {
      connRef.current = conn;
      setConnectionStatus("connected");
      setStatusMessage("Player 2 connected! Match ready.");

      conn.on("data", (data) => {
        if (data.type === "MOVE" && onMoveRef.current) {
          onMoveRef.current(data.move);
        } else if (data.type === "RESET" && onResetRef.current) {
          onResetRef.current();
        }
      });

      conn.on("close", () => {
        setConnectionStatus("disconnected");
        setStatusMessage("Opponent disconnected.");
      });
    });

    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
      setStatusMessage("Connection error: " + err.type);
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, []); // Run ONLY once on mount

  // Host a new 2-player room
  const hostRoom = useCallback(() => {
    if (peerId) {
      setRoomCode(peerId);
      setIsHost(true);
      setPlayerColor("w");
      setConnectionStatus("hosting");
      setStatusMessage(`Hosting room ${peerId}. Waiting for Player 2 to join...`);
    }
  }, [peerId]);

  // Join an existing 2-player room with code
  const joinRoom = useCallback((targetRoomCode) => {
    if (!targetRoomCode || !peerRef.current) return;
    setConnectionStatus("connecting");
    setStatusMessage(`Connecting to room ${targetRoomCode}...`);

    const conn = peerRef.current.connect(targetRoomCode.trim());
    connRef.current = conn;

    conn.on("open", () => {
      setConnectionStatus("connected");
      setIsHost(false);
      setPlayerColor("b");
      setRoomCode(targetRoomCode);
      setStatusMessage("Connected to host! Match ready.");
    });

    conn.on("data", (data) => {
      if (data.type === "MOVE" && onMoveRef.current) {
        onMoveRef.current(data.move);
      } else if (data.type === "RESET" && onResetRef.current) {
        onResetRef.current();
      }
    });

    conn.on("close", () => {
      setConnectionStatus("disconnected");
      setStatusMessage("Disconnected from host.");
    });
  }, []);

  // Send move to peer
  const sendMove = useCallback((move) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send({ type: "MOVE", move });
    }
  }, []);

  // Send game reset
  const sendReset = useCallback(() => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send({ type: "RESET" });
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback(() => {
    if (connRef.current) connRef.current.close();
    setConnectionStatus("disconnected");
    setRoomCode("");
    setStatusMessage("");
  }, []);

  return {
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
  };
}
