import "./AIPanel.css";

/* =========================================================
   AI TELEMETRY & INFO COMPONENT
========================================================= */

export function AIInfo({ timesDetected, timesLostPlayer, currentTarget, distanceToAI }) {
  return (
    <div className="ai-info">
      <p>
        <strong>Detection count:</strong> {timesDetected}
      </p>

      <p>
        <strong>Lost player:</strong> {timesLostPlayer}
      </p>

      <p>
        <strong>Current target:</strong>{" "}
        {currentTarget
          ? `${Math.round(currentTarget.x)}, ${Math.round(currentTarget.y)}`
          : "None"}
      </p>

      <p>
        <strong>Distance:</strong> {Math.round(distanceToAI)} px
      </p>
    </div>
  );
}

export default AIInfo;
