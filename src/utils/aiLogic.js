import {
  CELL_SIZE,
  COLS,
  ROWS,
  ATTACK_RANGE,
  AI_VISION_RANGE,
  PLAYER_RADIUS,
  AI_RADIUS,
  SEARCH_TARGET_RADIUS,
  PREDICTION_TIME,
} from "../constants/gameConfig";
import { MAZE } from "../constants/maze";
import {
  worldToGrid,
  gridToWorld,
  calculateDistance,
  isValidPosition,
  isWall,
} from "./geometry";

/* =========================================================
   RANDOM SEARCH
========================================================= */

export function findRandomWalkableCell() {
  for (let i = 0; i < 100; i++) {
    const col =
      Math.floor(Math.random() * (COLS - 2)) + 1;

    const row =
      Math.floor(Math.random() * (ROWS - 2)) + 1;

    if (MAZE[row][col] !== "#") {
      return gridToWorld(col, row);
    }
  }

  return gridToWorld(1, 1);
}

export function findRandomSearchTarget(ai) {
  const aiGrid = worldToGrid(
    ai.x,
    ai.y
  );

  for (let i = 0; i < 40; i++) {
    const col =
      aiGrid.col +
      Math.floor(
        Math.random() *
          (SEARCH_TARGET_RADIUS * 2 + 1)
      ) -
      SEARCH_TARGET_RADIUS;

    const row =
      aiGrid.row +
      Math.floor(
        Math.random() *
          (SEARCH_TARGET_RADIUS * 2 + 1)
      ) -
      SEARCH_TARGET_RADIUS;

    if (
      col < 1 ||
      col >= COLS - 1 ||
      row < 1 ||
      row >= ROWS - 1
    ) {
      continue;
    }

    if (MAZE[row][col] === "#") {
      continue;
    }

    const target = gridToWorld(col, row);

    const distance =
      calculateDistance(ai, target);

    if (distance >= 3 * CELL_SIZE) {
      return target;
    }
  }

  return findRandomWalkableCell();
}

/* =========================================================
   AI START POSITION
========================================================= */

export function findAIStartPosition(player) {
  for (let i = 0; i < 200; i++) {
    const position =
      findRandomWalkableCell();

    if (
      calculateDistance(
        position,
        player
      ) > 150
    ) {
      return position;
    }
  }

  return gridToWorld(
    COLS - 2,
    ROWS - 2
  );
}

/* =========================================================
   LINE OF SIGHT
========================================================= */

export function hasLineOfSight(ai, player) {
  const distance =
    calculateDistance(ai, player);

  const steps =
    Math.ceil(distance / 5);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    const x =
      ai.x +
      (player.x - ai.x) * t;

    const y =
      ai.y +
      (player.y - ai.y) * t;

    if (isWall(x, y)) {
      return false;
    }
  }

  return true;
}

/* =========================================================
   PREDICT PLAYER POSITION
========================================================= */

export function predictPlayerPosition(
  player,
  velocity
) {
  const predicted = {
    x:
      player.x +
      velocity.x * PREDICTION_TIME / 30,

    y:
      player.y +
      velocity.y * PREDICTION_TIME / 30,
  };

  /*
    If prediction enters a wall,
    fall back to player's current position.
  */

  if (
    isValidPosition(
      predicted.x,
      predicted.y,
      PLAYER_RADIUS
    )
  ) {
    return predicted;
  }

  return {
    x: player.x,
    y: player.y,
  };
}

/* =========================================================
   FLEE TARGET
========================================================= */

export function findFleeTarget(ai, player) {
  const dx = ai.x - player.x;
  const dy = ai.y - player.y;

  const length =
    Math.sqrt(
      dx * dx + dy * dy
    ) || 1;

  const directionX =
    dx / length;

  const directionY =
    dy / length;

  const possibleTargets = [];

  const distances = [
    150,
    200,
    250,
  ];

  for (const distance of distances) {
    const target = {
      x:
        ai.x +
        directionX * distance,

      y:
        ai.y +
        directionY * distance,
    };

    if (
      isValidPosition(
        target.x,
        target.y,
        AI_RADIUS
      )
    ) {
      possibleTargets.push(target);
    }
  }

  if (possibleTargets.length === 0) {
    return findRandomWalkableCell();
  }

  return possibleTargets[
    Math.floor(
      Math.random() *
        possibleTargets.length
    )
  ];
}

/* =========================================================
   UTILITY AI
========================================================= */

export function calculateUtilityScores({
  ai,
  player,
  canSeePlayer,
  heardNoise,
  hasLastKnownPosition,
}) {
  const distance =
    calculateDistance(ai, player);

  const healthPercent =
    ai.hp / 100;

  const scores = {
    ATTACK: 0,
    CHASE: 0,
    INVESTIGATE: 0,
    FLEE: 0,
    SEARCH: 0,
  };

  /* -------------------------
     ATTACK
  ------------------------- */

  if (canSeePlayer) {
    if (distance <= ATTACK_RANGE) {
      scores.ATTACK =
        100 +
        (1 - healthPercent) * 10;
    } else {
      scores.ATTACK = 0;
    }
  }

  /* -------------------------
     CHASE
  ------------------------- */

  if (canSeePlayer) {
    const distanceFactor =
      Math.max(
        0,
        1 -
          distance /
            AI_VISION_RANGE
      );

    scores.CHASE =
      50 +
      distanceFactor * 40;
  }

  /* -------------------------
     FLEE
  ------------------------- */

  if (ai.hp <= 30) {
    scores.FLEE =
      70 +
      (30 - ai.hp) * 2;

    if (canSeePlayer) {
      scores.FLEE += 20;
    }
  }

  /* -------------------------
     INVESTIGATE
  ------------------------- */

  if (heardNoise) {
    scores.INVESTIGATE = 65;
  }

  if (
    hasLastKnownPosition &&
    !canSeePlayer
  ) {
    scores.INVESTIGATE =
      Math.max(
        scores.INVESTIGATE,
        55
      );
  }

  /* -------------------------
     SEARCH
  ------------------------- */

  scores.SEARCH = 20;

  if (
    !canSeePlayer &&
    !heardNoise &&
    !hasLastKnownPosition
  ) {
    scores.SEARCH = 45;
  }

  return scores;
}

/* =========================================================
   GET HIGHEST UTILITY ACTION
========================================================= */

export function getBestAction(scores) {
  let bestAction = "SEARCH";
  let bestScore = -Infinity;

  for (const action in scores) {
    if (
      scores[action] >
      bestScore
    ) {
      bestScore =
        scores[action];

      bestAction = action;
    }
  }

  return bestAction;
}
