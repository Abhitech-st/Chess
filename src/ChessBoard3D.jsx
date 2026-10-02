import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Stars } from "@react-three/drei";
import { ChessPiece3D } from "./ChessPiece3D";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function ChessBoard3D({
  game,
  selectedSquare,
  legalMoves,
  lastMove,
  hintSquares,
  onSquareClick,
}) {
  const [hoveredSquare, setHoveredSquare] = useState(null);

  // Responsive mobile screen detection
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const board = game.board();

  // Helper to get square name (e.g. 'e4') from (row, col)
  const getSquareName = (row, col) => {
    return `${FILES[col]}${8 - row}`;
  };

  // Convert (row, col) to 3D world position (X, Y, Z)
  const get3DPos = (row, col) => {
    return [(col - 3.5) * 1.05, 0, (row - 3.5) * 1.05];
  };

  // Convert square name (e.g. 'e2') to 3D position
  const get3DPosFromSquare = (sq) => {
    if (!sq || sq.length < 2) return null;
    const col = FILES.indexOf(sq[0]);
    const row = 8 - parseInt(sq[1], 10);
    if (col < 0 || row < 0 || row > 7) return null;
    return get3DPos(row, col);
  };

  // Responsive scale factor: 0.72 on mobile screens for 100% visibility, 1.0 on desktop
  const boardScale = isMobile ? 0.72 : 1.0;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{
          position: isMobile ? [0, 9.8, 4.4] : [0, 8.2, 3.6],
          fov: isMobile ? 46 : 38,
        }}
        shadows
        gl={{ antialias: true }}
      >
        {/* Crisp Ambient & Rim Lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight
          position={[5, 12, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-6, 6, -6]} intensity={1.4} color="#7c5bf5" />
        <pointLight position={[6, 6, 6]} intensity={1.4} color="#00d4ff" />
        <pointLight position={[0, -2, 0]} intensity={0.6} color="#ffffff" />

        {/* Space Starfield background */}
        <Stars radius={50} depth={50} count={1800} factor={3} saturation={0} fade speed={0.4} />

        {/* 3D Orbit Controls */}
        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.4}
          dampingFactor={0.05}
        />

        {/* Board Container with responsive mobile scaling */}
        <group position={[0, 0, 0]} scale={[boardScale, boardScale, boardScale]}>
          {/* Base Surround Platform */}
          <mesh position={[0, -0.25, 0]} receiveShadow>
            <boxGeometry args={[9.1, 0.4, 9.1]} />
            <meshStandardMaterial color="#141933" roughness={0.3} metalness={0.8} />
          </mesh>

          {/* Border Trim Accent */}
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[8.7, 0.05, 8.7]} />
            <meshStandardMaterial color="#4f5c90" roughness={0.2} metalness={0.9} />
          </mesh>

          {/* 8x8 Board Squares */}
          {board.map((row, rIdx) =>
            row.map((piece, cIdx) => {
              const squareName = getSquareName(rIdx, cIdx);
              const [x, , z] = get3DPos(rIdx, cIdx);
              const isDark = (rIdx + cIdx) % 2 === 1;

              const isSelected = selectedSquare === squareName;
              const isLegal = legalMoves.includes(squareName);
              const isLastMoveFrom = lastMove && lastMove.from === squareName;
              const isLastMoveTo = lastMove && lastMove.to === squareName;

              const isHintFrom = hintSquares && hintSquares.from === squareName;
              const isHintTo = hintSquares && hintSquares.to === squareName;
              const isHint = isHintFrom || isHintTo;

              const isHovered = hoveredSquare === squareName;

              // Compute starting position if piece just moved to this square
              const fromPos = isLastMoveTo ? get3DPosFromSquare(lastMove.from) : null;

              // Distinct high-contrast square colors (Light: #222e50, Dark: #0c1024)
              let squareColor = isDark ? "#0c1024" : "#222e50";
              let emissive = "#000000";
              let emissiveIntensity = 0;

              if (isSelected) {
                squareColor = "#7c5bf5";
                emissive = "#7c5bf5";
                emissiveIntensity = 0.5;
              } else if (isHint) {
                squareColor = "#00cc66";
                emissive = "#00cc66";
                emissiveIntensity = 0.6;
              } else if (isLastMoveFrom) {
                squareColor = "#886600";
                emissive = "#ffaa00";
                emissiveIntensity = 0.3;
              } else if (isLastMoveTo) {
                squareColor = "#c49f30";
                emissive = "#ffd700";
                emissiveIntensity = 0.4;
              } else if (isHovered) {
                squareColor = "#354370";
              }

              return (
                <group key={squareName}>
                  {/* Square Box Mesh */}
                  <mesh
                    position={[x, 0, z]}
                    receiveShadow
                    onClick={(e) => {
                      e.stopPropagation();
                      onSquareClick(squareName);
                    }}
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHoveredSquare(squareName);
                    }}
                    onPointerOut={() => setHoveredSquare(null)}
                  >
                    <boxGeometry args={[1.02, 0.1, 1.02]} />
                    <meshStandardMaterial
                      color={squareColor}
                      emissive={emissive}
                      emissiveIntensity={emissiveIntensity}
                      roughness={0.35}
                      metalness={0.65}
                    />
                  </mesh>

                  {/* Selected Square Highlight Outline */}
                  {isSelected && (
                    <mesh position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[0.44, 0.5, 4]} rotation={Math.PI / 4} />
                      <meshBasicMaterial color="#7c5bf5" />
                    </mesh>
                  )}

                  {/* Legal Move Dot Marker */}
                  {isLegal && !piece && (
                    <mesh position={[x, 0.08, z]}>
                      <cylinderGeometry args={[0.15, 0.15, 0.03, 24]} />
                      <meshBasicMaterial color="#00d4ff" />
                    </mesh>
                  )}

                  {/* Legal Capture Target Ring */}
                  {isLegal && piece && (
                    <mesh position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[0.4, 0.48, 32]} />
                      <meshBasicMaterial color="#ff6b9d" side={2} />
                    </mesh>
                  )}

                  {/* Chess Piece with animated movement */}
                  {piece && (
                    <group scale={[0.82, 0.82, 0.82]}>
                      <ChessPiece3D
                        type={piece.type}
                        color={piece.color}
                        position={[x / 0.82, 0.05 / 0.82, z / 0.82]}
                        fromPosition={fromPos ? [fromPos[0] / 0.82, 0.05 / 0.82, fromPos[2] / 0.82] : null}
                        isSelected={isSelected}
                        isHinted={isHint}
                        onClick={() => onSquareClick(squareName)}
                      />
                    </group>
                  )}
                </group>
              );
            })
          )}

          {/* Square Coordinate Labels around edge */}
          {FILES.map((file, i) => (
            <React.Fragment key={`file-${file}`}>
              <Text
                position={[(i - 3.5) * 1.05, 0.07, 4.25]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.26}
                color="#94a3b8"
              >
                {file}
              </Text>
              <Text
                position={[(i - 3.5) * 1.05, 0.07, -4.25]}
                rotation={[-Math.PI / 2, 0, Math.PI]}
                fontSize={0.26}
                color="#94a3b8"
              >
                {file}
              </Text>
            </React.Fragment>
          ))}
          {[8, 7, 6, 5, 4, 3, 2, 1].map((rank, i) => (
            <React.Fragment key={`rank-${rank}`}>
              <Text
                position={[-4.25, 0.07, (i - 3.5) * 1.05]}
                rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
                fontSize={0.26}
                color="#94a3b8"
              >
                {rank.toString()}
              </Text>
              <Text
                position={[4.25, 0.07, (i - 3.5) * 1.05]}
                rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                fontSize={0.26}
                color="#94a3b8"
              >
                {rank.toString()}
              </Text>
            </React.Fragment>
          ))}
        </group>
      </Canvas>
    </div>
  );
}
