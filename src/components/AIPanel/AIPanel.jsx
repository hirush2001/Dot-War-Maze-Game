import "./AIPanel.css";

/* =========================================================
   AI UTILITY SCORES PANEL
========================================================= */

export function AIPanel({ utilityScores }) {
  return (
    <div className="ai-panel">
      <h3>🧠 AI Utility Scores</h3>

      <div>
        Attack: {utilityScores.ATTACK.toFixed(1)}
      </div>

      <div>
        Chase: {utilityScores.CHASE.toFixed(1)}
      </div>

      <div>
        Investigate: {utilityScores.INVESTIGATE.toFixed(1)}
      </div>

      <div>
        Flee: {utilityScores.FLEE.toFixed(1)}
      </div>

      <div>
        Search: {utilityScores.SEARCH.toFixed(1)}
      </div>
    </div>
  );
}

export default AIPanel;
