import "./GameOver.css";

/* =========================================================
   GAME OVER MODAL / BANNER COMPONENT
========================================================= */

export function GameOver({ gameStatus, onRestart }) {
  if (gameStatus === "PLAYING") {
    return null;
  }

  return (
    <div className="game-over">
      <h2>
        {gameStatus === "PLAYER_WON"
          ? "🏆 YOU WIN!"
          : "💀 AI WINS!"}
      </h2>

      <button onClick={onRestart}>
        Play Again
      </button>
    </div>
  );
}

export default GameOver;
