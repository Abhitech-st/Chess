import React, { useState } from "react";
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

  const board = game.board();

  // Helper to get square name (e.g. 'e4') from (row, col)
  const getSquareName = (row, col) => {
    return `${FILES[col]}${8 - row}`;
  };

  // Convert (row, col) to 3D world position (X, Y, Z)
  const get3DPos = (row, col) => {
    return [(col - 3.5) * 1.1, 0, (row - 3.5) * 1.1];
  };

  // Convert square name (e.g. 'e2') to 3D position
  const get3DPosFromSquare = (sq) => {
    if (!sq || sq.length < 2) return null;
    const col = FILES.indexOf(sq[0]);
    const row = 8 - parseInt(sq[1], 10);
    if (col < 0 || row < 0 || row > 7) return null;
    return get3DPos(row, col);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: [0, 9.2, 4.8], fov: 42 }}
        shadows
        gl={{ antialias: true }}
      >
        {/* Ambient & Space Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 12, 5]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-6, 6, -6]} intensity={1.2} color="#7c5bf5" />
        <pointLight position={[6, 6, 6]} intensity={1.2} color="#00d4ff" />

        {/* Space Starfield background */}
        <Stars radius={50} depth={50} count={2000} factor={3} saturation={0} fade speed={0.5} />

        {/* 3D Orbit Controls */}
        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.3}
          dampingFactor={0.05}
        />

        {/* Board Container */}
        <group position={[0, 0, 0]}>
          {/* Base Surround Platform */}
          <mesh position={[0, -0.25, 0]} receiveShadow>
            <boxGeometry args={[9.5, 0.4, 9.5]} />
            <meshStandardMaterial color="#0b0d1e" roughness={0.3} metalness={0.8} />
          </mesh>

          {/* Border Trim Accent */}
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[9.1, 0.05, 9.1]} />
            <meshStandardMaterial color="#4a5580" roughness={0.2} metalness={0.9} />
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
              const isLastMove = isLastMoveFrom || isLastMoveTo;

              const isHintFrom = hintSquares && hintSquares.from === squareName;
              const isHintTo = hintSquares && hintSquares.to === squareName;
              const isHint = isHintFrom || isHintTo;

              const isHovered = hoveredSquare === squareName;

              // Compute starting position if piece just moved to this square
              const fromPos = isLastMoveTo ? get3DPosFromSquare(lastMove.from) : null;

              // Square background colors
              let squareColor = isDark ? "#16182e" : "#2e3654";
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
                squareColor = "#997700";
                emissive = "#ffaa00";
                emissiveIntensity = 0.3;
              } else if (isLastMoveTo) {
                squareColor = "#d4af37";
                emissive = "#ffd700";
                emissiveIntensity = 0.4;
              } else if (isHovered) {
                squareColor = "#3a4468";
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
                    <boxGeometry args={[1.06, 0.1, 1.06]} />
                    <meshStandardMaterial
                      color={squareColor}
                      emissive={emissive}
                      emissiveIntensity={emissiveIntensity}
                      roughness={0.4}
                      metalness={0.6}
                    />
                  </mesh>

                  {/* Selected Square Highlight Outline */}
                  {isSelected && (
                    <mesh position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[0.46, 0.52, 4]} rotation={Math.PI / 4} />
                      <meshBasicMaterial color="#7c5bf5" />
                    </mesh>
                  )}

                  {/* Legal Move Dot Marker */}
                  {isLegal && !piece && (
                    <mesh position={[x, 0.08, z]}>
                      <cylinderGeometry args={[0.16, 0.16, 0.03, 24]} />
                      <meshBasicMaterial color="#00d4ff" />
                    </mesh>
                  )}

                  {/* Legal Capture Target Ring */}
                  {isLegal && piece && (
                    <mesh position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[0.42, 0.5, 32]} />
                      <meshBasicMaterial color="#ff6b9d" side={2} />
                    </mesh>
                  )}

                  {/* Chess Piece with animated movement */}
                  {piece && (
                    <group scale={[0.85, 0.85, 0.85]}>
                      <ChessPiece3D
                        type={piece.type}
                        color={piece.color}
                        position={[x / 0.85, 0.05 / 0.85, z / 0.85]}
                        fromPosition={fromPos ? [fromPos[0] / 0.85, 0.05 / 0.85, fromPos[2] / 0.85] : null}
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
                position={[(i - 3.5) * 1.1, 0.07, 4.45]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.28}
                color="#8892b0"
              >
                {file}
              </Text>
              <Text
                position={[(i - 3.5) * 1.1, 0.07, -4.45]}
                rotation={[-Math.PI / 2, 0, Math.PI]}
                fontSize={0.28}
                color="#8892b0"
              >
                {file}
              </Text>
            </React.Fragment>
          ))}
          {[8, 7, 6, 5, 4, 3, 2, 1].map((rank, i) => (
            <React.Fragment key={`rank-${rank}`}>
              <Text
                position={[-4.45, 0.07, (i - 3.5) * 1.1]}
                rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
                fontSize={0.28}
                color="#8892b0"
              >
                {rank.toString()}
              </Text>
              <Text
                position={[4.45, 0.07, (i - 3.5) * 1.1]}
                rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                fontSize={0.28}
                color="#8892b0"
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
