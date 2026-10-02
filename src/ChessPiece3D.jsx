import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

/**
 * Ultra-Sharp Procedural Turned Chess Pieces
 * Enhanced contrast: Cyan Pearl for White, Vibrant Magenta for Black with crisp base rim highlights.
 */
function createSharpPieceGeometries() {
  const pawnPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.32, 0),
    new THREE.Vector2(0.34, 0.06),
    new THREE.Vector2(0.26, 0.12),
    new THREE.Vector2(0.18, 0.22),
    new THREE.Vector2(0.14, 0.42),
    new THREE.Vector2(0.22, 0.48),
    new THREE.Vector2(0.13, 0.52),
    new THREE.Vector2(0, 0.52),
  ];

  const rookPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.35, 0),
    new THREE.Vector2(0.36, 0.08),
    new THREE.Vector2(0.28, 0.14),
    new THREE.Vector2(0.26, 0.45),
    new THREE.Vector2(0.32, 0.52),
    new THREE.Vector2(0.32, 0.68),
    new THREE.Vector2(0.24, 0.68),
    new THREE.Vector2(0.24, 0.6),
    new THREE.Vector2(0, 0.6),
  ];

  const bishopPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.35, 0),
    new THREE.Vector2(0.35, 0.08),
    new THREE.Vector2(0.28, 0.15),
    new THREE.Vector2(0.18, 0.35),
    new THREE.Vector2(0.15, 0.58),
    new THREE.Vector2(0.24, 0.64),
    new THREE.Vector2(0.21, 0.78),
    new THREE.Vector2(0.12, 0.88),
    new THREE.Vector2(0, 0.88),
  ];

  const queenPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.38, 0),
    new THREE.Vector2(0.38, 0.1),
    new THREE.Vector2(0.3, 0.18),
    new THREE.Vector2(0.2, 0.45),
    new THREE.Vector2(0.16, 0.72),
    new THREE.Vector2(0.3, 0.78),
    new THREE.Vector2(0.34, 0.95),
    new THREE.Vector2(0.2, 0.98),
    new THREE.Vector2(0, 0.98),
  ];

  const kingPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.4, 0),
    new THREE.Vector2(0.4, 0.1),
    new THREE.Vector2(0.32, 0.2),
    new THREE.Vector2(0.22, 0.48),
    new THREE.Vector2(0.18, 0.78),
    new THREE.Vector2(0.32, 0.85),
    new THREE.Vector2(0.35, 1.02),
    new THREE.Vector2(0.22, 1.05),
    new THREE.Vector2(0, 1.05),
  ];

  const nBasePoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.35, 0),
    new THREE.Vector2(0.35, 0.08),
    new THREE.Vector2(0.28, 0.15),
    new THREE.Vector2(0.2, 0.3),
    new THREE.Vector2(0, 0.3),
  ];

  return {
    p: new THREE.LatheGeometry(pawnPoints, 64),
    r: new THREE.LatheGeometry(rookPoints, 64),
    b: new THREE.LatheGeometry(bishopPoints, 64),
    q: new THREE.LatheGeometry(queenPoints, 64),
    k: new THREE.LatheGeometry(kingPoints, 64),
    nBase: new THREE.LatheGeometry(nBasePoints, 64),
  };
}

export function ChessPiece3D({ type, color, position, fromPosition, isSelected, isHinted, onClick }) {
  const groupRef = useRef();
  const innerMeshRef = useRef();

  const currentPos = useRef(
    fromPosition
      ? new THREE.Vector3(fromPosition[0], fromPosition[1], fromPosition[2])
      : new THREE.Vector3(position[0], position[1], position[2])
  );

  const geometries = useMemo(() => createSharpPieceGeometries(), []);
  const isWhite = color === "w";

  // High Contrast Palette
  const mainColor = isWhite ? "#00c8ff" : "#d91b6c";
  const emissiveColor = isWhite
    ? isSelected
      ? "#ffd700"
      : isHinted
      ? "#00ff88"
      : "#0066aa"
    : isSelected
    ? "#ffd700"
    : isHinted
    ? "#00ff88"
    : "#880044";

  // Smooth position lerp & parabolic arc jump animation
  useFrame((state) => {
    const target = new THREE.Vector3(position[0], position[1], position[2]);
    const dist = currentPos.current.distanceTo(target);

    if (dist > 0.01) {
      currentPos.current.lerp(target, 0.22);
      const arcHeight = Math.sin(Math.min(1, dist / 2.2) * Math.PI) * 0.48;

      if (groupRef.current) {
        groupRef.current.position.set(
          currentPos.current.x,
          currentPos.current.y + arcHeight,
          currentPos.current.z
        );
      }
    } else {
      currentPos.current.copy(target);
      if (groupRef.current) {
        const t = state.clock.getElapsedTime();
        const levitation = isSelected ? Math.sin(t * 4) * 0.08 + 0.15 : 0;
        groupRef.current.position.set(target.x, target.y + levitation, target.z);
      }
    }

    if (innerMeshRef.current) {
      const t = state.clock.getElapsedTime();
      if (isSelected || isHinted) {
        innerMeshRef.current.rotation.y = t * 1.2;
      } else {
        innerMeshRef.current.rotation.y = isWhite ? 0 : Math.PI;
      }
    }
  });

  return (
    <group ref={groupRef} position={[currentPos.current.x, currentPos.current.y, currentPos.current.z]}>
      <group
        ref={innerMeshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {type !== "n" ? (
          <mesh geometry={geometries[type]} castShadow receiveShadow>
            <meshStandardMaterial
              color={mainColor}
              emissive={emissiveColor}
              emissiveIntensity={isSelected || isHinted ? 0.95 : 0.35}
              roughness={0.12}
              metalness={0.88}
            />
          </mesh>
        ) : (
          <group>
            <mesh geometry={geometries.nBase} castShadow receiveShadow>
              <meshStandardMaterial
                color={mainColor}
                emissive={emissiveColor}
                emissiveIntensity={isSelected || isHinted ? 0.95 : 0.35}
                roughness={0.12}
                metalness={0.88}
              />
            </mesh>
            <mesh position={[0, 0.45, 0.05]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.24, 0.42, 0.38]} />
              <meshStandardMaterial
                color={mainColor}
                emissive={emissiveColor}
                emissiveIntensity={isSelected || isHinted ? 0.95 : 0.35}
                roughness={0.12}
                metalness={0.88}
              />
            </mesh>
            <mesh position={[0, 0.62, -0.08]} rotation={[-0.3, 0, 0]}>
              <coneGeometry args={[0.12, 0.25, 6]} />
              <meshStandardMaterial color={mainColor} roughness={0.12} metalness={0.88} />
            </mesh>
          </group>
        )}

        {/* Base Rim Highlight */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.36, 32]} />
          <meshBasicMaterial color={isWhite ? "#00ffff" : "#ff3399"} side={THREE.DoubleSide} />
        </mesh>

        {/* Pawn Head Orb */}
        {type === "p" && (
          <mesh position={[0, 0.65, 0]} castShadow>
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshStandardMaterial
              color={mainColor}
              emissive={emissiveColor}
              emissiveIntensity={0.4}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
        )}

        {/* Bishop Top Finial */}
        {type === "b" && (
          <mesh position={[0, 0.94, 0]} castShadow>
            <sphereGeometry args={[0.07, 24, 24]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
          </mesh>
        )}

        {/* Queen Crown Orb */}
        {type === "q" && (
          <mesh position={[0, 1.04, 0]} castShadow>
            <sphereGeometry args={[0.1, 24, 24]} />
            <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.7} metalness={0.95} />
          </mesh>
        )}

        {/* King Crown Cross */}
        {type === "k" && (
          <group position={[0, 1.15, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.08, 0.22, 0.08]} />
              <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.7} metalness={0.95} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.08, 0.08]} />
              <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.7} metalness={0.95} />
            </mesh>
          </group>
        )}
      </group>

      {/* Selection Ring */}
      {(isSelected || isHinted) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.52, 64]} />
          <meshBasicMaterial color={isSelected ? "#ffd700" : "#00ff88"} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Sparkles */}
      {(isSelected || isHinted) && (
        <Sparkles
          count={25}
          scale={0.9}
          size={5}
          speed={0.6}
          color={isSelected ? "#ffd700" : "#00ff88"}
        />
      )}
    </group>
  );
}
