import "./GameInfo.css";

/* =========================================================
   GAME INFO COMPONENT
========================================================= */

export function GameInfo({ playerHp, aiHp, aiState }) {
  return (
    <div className="game-info">
      <div>
        <strong>Player HP:</strong> {playerHp}
      </div>

      <div>
        <strong>AI HP:</strong> {aiHp}
      </div>

      <div>
        <strong>AI State:</strong> {aiState}
      </div>
    </div>
  );
}

export default GameInfo;
