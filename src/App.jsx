import "./App.css";
import { useGame } from "./hooks/useGame";
import { GameInfo } from "./components/GameInfo/GameInfo";
import { GameBoard } from "./components/GameBoard/GameBoard";
import { AIPanel } from "./components/AIPanel/AIPanel";
import { AIInfo } from "./components/AIPanel/AIInfo";
import { Controls } from "./components/Controls/Controls";
import { GameOver } from "./components/GameOver/GameOver";

/* =========================================================
   APP COMPONENT
========================================================= */

function App() {
  const {
    player,
    playerHp,
    ai,
    gameStatus,
    message,
    noiseRef,
    distanceToAI,
    playerCanAttack,
    restartGame,
  } = useGame();

  return (
    <div className="game-container">
      <h1>DOT WAR</h1>

      <GameInfo
        playerHp={playerHp}
        aiHp={ai.hp}
        aiState={ai.state}
      />

      <GameBoard
        player={player}
        ai={ai}
        noiseRef={noiseRef}
        playerCanAttack={playerCanAttack}
      />

      <h2>{message}</h2>

      <AIPanel utilityScores={ai.utilityScores} />

      <AIInfo
        timesDetected={ai.timesDetected}
        timesLostPlayer={ai.timesLostPlayer}
        currentTarget={ai.currentTarget}
        distanceToAI={distanceToAI}
      />

      <Controls />

      <GameOver
        gameStatus={gameStatus}
        onRestart={restartGame}
      />
    </div>
  );
}

export default App;
