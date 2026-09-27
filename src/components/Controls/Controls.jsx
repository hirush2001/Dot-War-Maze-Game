import "./Controls.css";

/* =========================================================
   CONTROLS GUIDE COMPONENT
========================================================= */

export function Controls() {
  return (
    <div className="controls">
      <h3>Controls</h3>

      <p>
        W A S D / Arrow Keys → Move
      </p>

      <p>
        Space → Make loud noise
      </p>

      <p>
        Stay close to AI to automatically attack.
      </p>
    </div>
  );
}

export default Controls;
