import "./GameBoard.css";
import {
  CELL_SIZE,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  AI_VISION_RANGE,
  PLAYER_RADIUS,
  AI_RADIUS,
  ATTACK_RANGE,
} from "../../constants/gameConfig";
import { MAZE } from "../../constants/maze";

/* =========================================================
   GAME BOARD COMPONENT
========================================================= */

export function GameBoard({ player, ai, noiseRef, playerCanAttack }) {
  return (
    <div
      className="game-board"
      style={{
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
      }}
    >
      {/* MAZE */}
      {MAZE.map((row, rowIndex) =>
        row.split("").map((cell, colIndex) => {
          if (cell !== "#") {
            return null;
          }

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="wall"
              style={{
                position: "absolute",
                left: colIndex * CELL_SIZE,
                top: rowIndex * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            />
          );
        })
      )}

      {/* AI VISION */}
      <div
        className="vision-circle"
        style={{
          position: "absolute",
          left: ai.x - AI_VISION_RANGE,
          top: ai.y - AI_VISION_RANGE,
          width: AI_VISION_RANGE * 2,
          height: AI_VISION_RANGE * 2,
          borderRadius: "50%",
        }}
      />

      {/* NOISE */}
      {noiseRef.current && (
        <div
          className="noise-circle"
          style={{
            position: "absolute",
            left: noiseRef.current.x - noiseRef.current.radius,
            top: noiseRef.current.y - noiseRef.current.radius,
            width: noiseRef.current.radius * 2,
            height: noiseRef.current.radius * 2,
            borderRadius: "50%",
          }}
        />
      )}

      {/* LAST KNOWN POSITION */}
      {ai.lastKnownPlayerPosition && (
        <div
          className="last-known"
          style={{
            position: "absolute",
            left: ai.lastKnownPlayerPosition.x - 6,
            top: ai.lastKnownPlayerPosition.y - 6,
            width: 12,
            height: 12,
            borderRadius: "50%",
          }}
        />
      )}

      {/* PREDICTED POSITION */}
      {ai.predictedPlayerPosition && (
        <div
          className="predicted-position"
          style={{
            position: "absolute",
            left: ai.predictedPlayerPosition.x - 6,
            top: ai.predictedPlayerPosition.y - 6,
            width: 12,
            height: 12,
            borderRadius: "50%",
          }}
        />
      )}

      {/* A* PATH */}
      {ai.path &&
        ai.path.map((point, index) => (
          <div
            key={index}
            className="path-node"
            style={{
              position: "absolute",
              left: point.x - 3,
              top: point.y - 3,
              width: 6,
              height: 6,
              borderRadius: "50%",
            }}
          />
        ))}

      {/* PLAYER */}
      <div
        className="player"
        style={{
          position: "absolute",
          left: player.x - PLAYER_RADIUS,
          top: player.y - PLAYER_RADIUS,
          width: PLAYER_RADIUS * 2,
          height: PLAYER_RADIUS * 2,
          borderRadius: "50%",
        }}
      />

      {/* AI */}
      <div
        className="ai"
        style={{
          position: "absolute",
          left: ai.x - AI_RADIUS,
          top: ai.y - AI_RADIUS,
          width: AI_RADIUS * 2,
          height: AI_RADIUS * 2,
          borderRadius: "50%",
        }}
      />

      {/* ATTACK RANGE */}
      {playerCanAttack && (
        <div
          className="attack-range"
          style={{
            position: "absolute",
            left: ai.x - ATTACK_RANGE,
            top: ai.y - ATTACK_RANGE,
            width: ATTACK_RANGE * 2,
            height: ATTACK_RANGE * 2,
            borderRadius: "50%",
          }}
        />
      )}
    </div>
  );
}

export default GameBoard;
