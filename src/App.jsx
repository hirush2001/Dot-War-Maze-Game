
import { useEffect, useRef, useState } from "react";
import "./App.css";

/* =========================================================
   GAME SETTINGS
========================================================= */

const CELL_SIZE = 25;
const COLS = 28;
const ROWS = 18;

const BOARD_WIDTH = COLS * CELL_SIZE;
const BOARD_HEIGHT = ROWS * CELL_SIZE;

const PLAYER_SPEED = 3;
const AI_SPEED = 2.6;

const ATTACK_RANGE = 30;
const ATTACK_DAMAGE = 10;
const ATTACK_COOLDOWN = 700;

const AI_VISION_RANGE = 150;
const AI_HEARING_RANGE = 180;

const PLAYER_RADIUS = 8;
const AI_RADIUS = 8;

const SEARCH_WAIT_TIME = 2000;
const SEARCH_TARGET_RADIUS = 8;

const LOW_HP_PERCENT = 0.3;

const PREDICTION_TIME = 500;


/* =========================================================
   MAZE
========================================================= */

const MAZE = [
  "############################",
  "#............#.............#",
  "#.######.###.#.#####.#####.#",
  "#........#...#.....#.......#",
  "#.######.#.#######.#.#####.#",
  "#.#......#.........#.#.....#",
  "#.#.###############.#.###.#",
  "#.#.................#...#.#",
  "#.#####################.#.#",
  "#.......................#.#",
  "#######################.#.#",
  "#.......................#.#",
  "#.#######################.#",
  "#.........................#",
  "#.#######################.#",
  "#.........................#",
  "#...........#.............#",
  "############################",
];


/* =========================================================
   BASIC HELPERS
========================================================= */

function isWall(x, y) {
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);

  if (
    row < 0 ||
    row >= ROWS ||
    col < 0 ||
    col >= COLS
  ) {
    return true;
  }

  return MAZE[row][col] === "#";
}


function worldToGrid(x, y) {
  return {
    col: Math.floor(x / CELL_SIZE),
    row: Math.floor(y / CELL_SIZE),
  };
}


function gridToWorld(col, row) {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}


function calculateDistance(a, b) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
}


function isValidPosition(x, y, radius = 8) {
  const points = [
    { x: x - radius, y },
    { x: x + radius, y },
    { x, y: y - radius },
    { x, y: y + radius },
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y - radius },
    { x: x - radius, y: y + radius },
    { x: x + radius, y: y + radius },
  ];

  return points.every(
    (point) => !isWall(point.x, point.y)
  );
}


/* =========================================================
   A* PATHFINDING
========================================================= */

function getNeighbors(node) {
  const directions = [
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
  ];

  return directions
    .map((direction) => ({
      col: node.col + direction.col,
      row: node.row + direction.row,
    }))
    .filter((position) => {
      if (
        position.col < 0 ||
        position.col >= COLS ||
        position.row < 0 ||
        position.row >= ROWS
      ) {
        return false;
      }

      return MAZE[position.row][position.col] !== "#";
    });
}


function heuristic(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}


function nodeKey(node) {
  return `${node.col},${node.row}`;
}


function findPath(startPosition, targetPosition) {
  const start = worldToGrid(
    startPosition.x,
    startPosition.y
  );

  const target = worldToGrid(
    targetPosition.x,
    targetPosition.y
  );

  if (
    start.col < 0 ||
    start.col >= COLS ||
    start.row < 0 ||
    start.row >= ROWS ||
    target.col < 0 ||
    target.col >= COLS ||
    target.row < 0 ||
    target.row >= ROWS
  ) {
    return [];
  }

  if (
    MAZE[start.row][start.col] === "#" ||
    MAZE[target.row][target.col] === "#"
  ) {
    return [];
  }

  const openSet = [start];

  const cameFrom = new Map();

  const gScore = new Map();
  const fScore = new Map();

  gScore.set(nodeKey(start), 0);
  fScore.set(
    nodeKey(start),
    heuristic(start, target)
  );

  while (openSet.length > 0) {
    let currentIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
      const currentKey = nodeKey(openSet[currentIndex]);
      const candidateKey = nodeKey(openSet[i]);

      if (
        (fScore.get(candidateKey) ?? Infinity) <
        (fScore.get(currentKey) ?? Infinity)
      ) {
        currentIndex = i;
      }
    }

    const current = openSet[currentIndex];

    if (
      current.col === target.col &&
      current.row === target.row
    ) {
      const path = [];

      let currentNode = current;

      while (currentNode) {
        path.unshift(
          gridToWorld(
            currentNode.col,
            currentNode.row
          )
        );

        currentNode = cameFrom.get(
          nodeKey(currentNode)
        );
      }

      return path;
    }

    openSet.splice(currentIndex, 1);

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = nodeKey(neighbor);

      const currentKey = nodeKey(current);

      const tentativeG =
        (gScore.get(currentKey) ?? Infinity) + 1;

      if (
        tentativeG <
        (gScore.get(neighborKey) ?? Infinity)
      ) {
        cameFrom.set(
          neighborKey,
          current
        );

        gScore.set(
          neighborKey,
          tentativeG
        );

        fScore.set(
          neighborKey,
          tentativeG +
            heuristic(neighbor, target)
        );

        if (
          !openSet.some(
            (node) =>
              node.col === neighbor.col &&
              node.row === neighbor.row
          )
        ) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return [];
}


/* =========================================================
   RANDOM SEARCH
========================================================= */

function findRandomWalkableCell() {
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


function findRandomSearchTarget(ai) {
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

function findAIStartPosition(player) {
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

function hasLineOfSight(ai, player) {
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

function predictPlayerPosition(
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

function findFleeTarget(ai, player) {
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

function calculateUtilityScores({
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

function getBestAction(scores) {
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


/* =========================================================
   APP
========================================================= */

function App() {
  const initialPlayer = {
    x: CELL_SIZE * 1.5,
    y: CELL_SIZE * 1.5,
  };

  const initialAIPosition =
    findAIStartPosition(
      initialPlayer
    );


  /* =======================================================
     STATE
  ======================================================= */

  const [player, setPlayer] =
    useState(initialPlayer);

  const [playerHp, setPlayerHp] =
    useState(100);

  const [ai, setAI] =
    useState({
      ...initialAIPosition,

      hp: 100,

      state: "SEARCH",

      path: [],

      pathIndex: 0,

      lastKnownPlayerPosition: null,

      predictedPlayerPosition: null,

      lastSeenTime: null,

      noisePosition: null,

      noiseTime: null,

      timesDetected: 0,

      timesLostPlayer: 0,

      searchStartedAt:
        Date.now(),

      utilityScores: {
        ATTACK: 0,
        CHASE: 0,
        INVESTIGATE: 0,
        FLEE: 0,
        SEARCH: 0,
      },

      currentTarget: null,
    });

  const [gameStatus, setGameStatus] =
    useState("PLAYING");

  const [message, setMessage] =
    useState(
      "AI is searching..."
    );


  /* =======================================================
     REFS
  ======================================================= */

  const keys =
    useRef({});

  const playerRef =
    useRef(player);

  const playerVelocityRef =
    useRef({
      x: 0,
      y: 0,
    });

  const previousPlayerRef =
    useRef(player);

  const noiseRef =
    useRef(null);


  /* =======================================================
     KEEP PLAYER REF UPDATED
  ======================================================= */

  useEffect(() => {
    playerRef.current =
      player;
  }, [player]);


  /* =======================================================
     KEYBOARD
  ======================================================= */

  useEffect(() => {
    const keyDown = (event) => {
      keys.current[
        event.key.toLowerCase()
      ] = true;

      if (event.code === "Space") {
        keys.current.space = true;
      }
    };

    const keyUp = (event) => {
      keys.current[
        event.key.toLowerCase()
      ] = false;

      if (event.code === "Space") {
        keys.current.space = false;
      }
    };

    window.addEventListener(
      "keydown",
      keyDown
    );

    window.addEventListener(
      "keyup",
      keyUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        keyDown
      );

      window.removeEventListener(
        "keyup",
        keyUp
      );
    };
  }, []);


  /* =======================================================
     PLAYER MOVEMENT
  ======================================================= */

  useEffect(() => {
    if (
      gameStatus !==
      "PLAYING"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        setPlayer((oldPlayer) => {
          let dx = 0;
          let dy = 0;

          if (
            keys.current.w ||
            keys.current.arrowup
          ) {
            dy -= PLAYER_SPEED;
          }

          if (
            keys.current.s ||
            keys.current.arrowdown
          ) {
            dy += PLAYER_SPEED;
          }

          if (
            keys.current.a ||
            keys.current.arrowleft
          ) {
            dx -= PLAYER_SPEED;
          }

          if (
            keys.current.d ||
            keys.current.arrowright
          ) {
            dx += PLAYER_SPEED;
          }

          const newX =
            oldPlayer.x + dx;

          const newY =
            oldPlayer.y + dy;


          const validX =
            isValidPosition(
              newX,
              oldPlayer.y,
              PLAYER_RADIUS
            );

          const validY =
            isValidPosition(
              oldPlayer.x,
              newY,
              PLAYER_RADIUS
            );


          let finalX =
            validX
              ? newX
              : oldPlayer.x;

          let finalY =
            validY
              ? newY
              : oldPlayer.y;


          /*
            Calculate player velocity.
          */

          playerVelocityRef.current = {
            x:
              finalX -
              oldPlayer.x,

            y:
              finalY -
              oldPlayer.y,
          };


          /*
            Running creates noise.
          */

          if (
            dx !== 0 ||
            dy !== 0
          ) {
            noiseRef.current = {
              x: finalX,
              y: finalY,
              radius: 180,
              time: Date.now(),
              type: "movement",
            };
          }


          /*
            Space creates loud noise.
          */

          if (
            keys.current.space
          ) {
            noiseRef.current = {
              x: finalX,
              y: finalY,
              radius: 250,
              time: Date.now(),
              type: "loud",
            };

            setMessage(
              "💥 Loud noise detected!"
            );
          }


          return {
            x: finalX,
            y: finalY,
          };
        });
      }, 30);

    return () =>
      clearInterval(interval);
  }, [gameStatus]);


  /* =======================================================
     AI DECISION SYSTEM
  ======================================================= */

  useEffect(() => {
    if (
      gameStatus !==
      "PLAYING"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        setAI((oldAI) => {
          const currentPlayer =
            playerRef.current;

          const distance =
            calculateDistance(
              oldAI,
              currentPlayer
            );

          const canSeePlayer =
            distance <=
              AI_VISION_RANGE &&
            hasLineOfSight(
              oldAI,
              currentPlayer
            );


          /*
            HEARING
          */

          const currentNoise =
            noiseRef.current;

          const heardNoise =
            currentNoise &&
            Date.now() -
              currentNoise.time <
              1000 &&
            calculateDistance(
              oldAI,
              currentNoise
            ) <=
              Math.min(
                currentNoise.radius,
                AI_HEARING_RANGE
              );


          /*
            LAST KNOWN POSITION
          */

          let hasLastKnownPosition =
            Boolean(
              oldAI.lastKnownPlayerPosition
            );

          if (
            oldAI.lastSeenTime &&
            Date.now() -
              oldAI.lastSeenTime >
              SEARCH_WAIT_TIME
          ) {
            hasLastKnownPosition =
              false;
          }


          /*
            UTILITY SCORES
          */

          const utilityScores =
            calculateUtilityScores({
              ai: oldAI,
              player: currentPlayer,
              canSeePlayer,
              heardNoise,
              hasLastKnownPosition,
            });


          /*
            SELECT ACTION
          */

          let bestAction =
            getBestAction(
              utilityScores
            );


          /*
            IMPORTANT:
            If AI can directly see the player,
            fleeing should not randomly override
            attack/chase unless HP is very low.
          */

          if (
            canSeePlayer &&
            oldAI.hp > 15
          ) {
            if (
              distance <=
              ATTACK_RANGE
            ) {
              bestAction =
                "ATTACK";
            } else {
              bestAction =
                "CHASE";
            }
          }


          let nextAI = {
            ...oldAI,

            utilityScores,

            state:
              bestAction,
          };


          /* =================================================
             PLAYER DETECTED
          ================================================= */

          if (canSeePlayer) {
            const predicted =
              predictPlayerPosition(
                currentPlayer,
                playerVelocityRef.current
              );

            nextAI = {
              ...nextAI,

              lastKnownPlayerPosition: {
                x: currentPlayer.x,
                y: currentPlayer.y,
              },

              predictedPlayerPosition:
                predicted,

              lastSeenTime:
                Date.now(),

              timesDetected:
                oldAI.timesDetected +
                1,
            };


            if (
              bestAction ===
              "ATTACK"
            ) {
              nextAI.path = [];

              nextAI.pathIndex = 0;

              nextAI.currentTarget =
                null;

              setMessage(
                "⚔️ AI is attacking!"
              );
            }


            else if (
              bestAction ===
              "CHASE"
            ) {
              const path =
                findPath(
                  oldAI,
                  predicted
                );

              nextAI.path =
                path;

              nextAI.pathIndex =
                0;

              nextAI.currentTarget =
                predicted;

              setMessage(
                "🎯 AI detected you and is chasing!"
              );
            }


            return nextAI;
          }


          /* =================================================
             FLEE
          ================================================= */

          if (
            bestAction ===
            "FLEE"
          ) {
            /*
              Recalculate flee target
              if current target is missing.
            */

            if (
              !oldAI.currentTarget ||
              oldAI.pathIndex >=
                oldAI.path.length
            ) {
              const fleeTarget =
                findFleeTarget(
                  oldAI,
                  currentPlayer
                );

              const path =
                findPath(
                  oldAI,
                  fleeTarget
                );

              nextAI.path =
                path;

              nextAI.pathIndex =
                0;

              nextAI.currentTarget =
                fleeTarget;
            }

            setMessage(
              "🏃 AI is fleeing!"
            );

            return nextAI;
          }


          /* =================================================
             INVESTIGATE NOISE
          ================================================= */

          if (
            bestAction ===
              "INVESTIGATE" &&
            heardNoise
          ) {
            const noisePosition = {
              x:
                currentNoise.x,
              y:
                currentNoise.y,
            };

            const path =
              findPath(
                oldAI,
                noisePosition
              );

            nextAI = {
              ...nextAI,

              noisePosition,

              noiseTime:
                Date.now(),

              path,

              pathIndex: 0,

              currentTarget:
                noisePosition,
            };

            setMessage(
              "👂 AI heard something and is investigating!"
            );

            return nextAI;
          }


          /* =================================================
             INVESTIGATE PREDICTED POSITION
          ================================================= */

          if (
            bestAction ===
              "INVESTIGATE" &&
            oldAI.predictedPlayerPosition
          ) {
            const path =
              findPath(
                oldAI,
                oldAI.predictedPlayerPosition
              );

            nextAI = {
              ...nextAI,

              path,

              pathIndex: 0,

              currentTarget:
                oldAI.predictedPlayerPosition,
            };

            setMessage(
              "🧠 AI is predicting your movement!"
            );

            return nextAI;
          }


          /* =================================================
             SEARCH
          ================================================= */

          if (
            bestAction ===
            "SEARCH"
          ) {
            if (
              !oldAI.path ||
              oldAI.pathIndex >=
                oldAI.path.length
            ) {
              const searchTarget =
                findRandomSearchTarget(
                  oldAI
                );

              const path =
                findPath(
                  oldAI,
                  searchTarget
                );

              nextAI = {
                ...nextAI,

                path,

                pathIndex: 0,

                currentTarget:
                  searchTarget,

                searchStartedAt:
                  Date.now(),
              };
            }

            setMessage(
              "🔎 AI is randomly searching..."
            );

            return nextAI;
          }


          return nextAI;
        });
      }, 300);

    return () =>
      clearInterval(interval);
  }, [gameStatus]);


  /* =======================================================
     AI MOVEMENT
  ======================================================= */

  useEffect(() => {
    if (
      gameStatus !==
      "PLAYING"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        setAI((oldAI) => {
          if (
            oldAI.state ===
            "ATTACK"
          ) {
            return oldAI;
          }

          if (
            !oldAI.path ||
            oldAI.path.length === 0
          ) {
            return oldAI;
          }

          if (
            oldAI.pathIndex >=
            oldAI.path.length
          ) {
            return oldAI;
          }


          const target =
            oldAI.path[
              oldAI.pathIndex
            ];

          const dx =
            target.x -
            oldAI.x;

          const dy =
            target.y -
            oldAI.y;

          const distance =
            Math.sqrt(
              dx * dx +
              dy * dy
            );


          if (
            distance < 4
          ) {
            return {
              ...oldAI,

              pathIndex:
                oldAI.pathIndex +
                1,
            };
          }


          const directionX =
            dx / distance;

          const directionY =
            dy / distance;


          const newX =
            oldAI.x +
            directionX *
              AI_SPEED;

          const newY =
            oldAI.y +
            directionY *
              AI_SPEED;


          if (
            !isValidPosition(
              newX,
              newY,
              AI_RADIUS
            )
          ) {
            return {
              ...oldAI,

              path: [],

              pathIndex: 0,
            };
          }


          return {
            ...oldAI,

            x: newX,
            y: newY,
          };
        });
      }, 30);

    return () =>
      clearInterval(interval);
  }, [gameStatus]);


  /* =======================================================
     AI ATTACK
  ======================================================= */

  useEffect(() => {
    if (
      gameStatus !==
      "PLAYING"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        setAI((currentAI) => {
          if (
            currentAI.state !==
            "ATTACK"
          ) {
            return currentAI;
          }

          const currentPlayer =
            playerRef.current;

          const distance =
            calculateDistance(
              currentAI,
              currentPlayer
            );

          if (
            distance >
            ATTACK_RANGE
          ) {
            return {
              ...currentAI,

              state: "CHASE",
            };
          }


          setPlayerHp(
            (oldHp) => {
              const newHp =
                Math.max(
                  0,
                  oldHp -
                    ATTACK_DAMAGE
                );

              if (
                newHp <= 0
              ) {
                setGameStatus(
                  "AI_WON"
                );

                setMessage(
                  "💀 AI won!"
                );
              }

              return newHp;
            }
          );

          setMessage(
            "💥 AI attacked you!"
          );

          return currentAI;
        });
      }, ATTACK_COOLDOWN);

    return () =>
      clearInterval(interval);
  }, [gameStatus]);


  /* =======================================================
     PLAYER AUTO ATTACK
  ======================================================= */

  useEffect(() => {
    if (
      gameStatus !==
      "PLAYING"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        setAI((currentAI) => {
          const currentPlayer =
            playerRef.current;

          const distance =
            calculateDistance(
              currentAI,
              currentPlayer
            );

          if (
            distance >
            ATTACK_RANGE
          ) {
            return currentAI;
          }


          const newHp =
            Math.max(
              0,
              currentAI.hp -
                ATTACK_DAMAGE
            );


          /*
            Player attack creates
            loud noise.
          */

          noiseRef.current = {
            x: currentPlayer.x,
            y: currentPlayer.y,
            radius: 250,
            time: Date.now(),
            type: "attack",
          };


          if (
            newHp <= 0
          ) {
            setGameStatus(
              "PLAYER_WON"
            );

            setMessage(
              "🏆 You defeated the AI!"
            );
          }


          return {
            ...currentAI,

            hp: newHp,
          };
        });
      }, ATTACK_COOLDOWN);

    return () =>
      clearInterval(interval);
  }, [gameStatus]);


  /* =======================================================
     NOISE CLEANUP
  ======================================================= */

  useEffect(() => {
    const interval =
      setInterval(() => {
        if (
          noiseRef.current &&
          Date.now() -
            noiseRef.current.time >
            1000
        ) {
          noiseRef.current =
            null;
        }
      }, 200);

    return () =>
      clearInterval(interval);
  }, []);


  /* =======================================================
     RESTART GAME
  ======================================================= */

  function restartGame() {
    const newPlayer = {
      x: CELL_SIZE * 1.5,
      y: CELL_SIZE * 1.5,
    };

    const newAI =
      findAIStartPosition(
        newPlayer
      );


    setPlayer(
      newPlayer
    );

    playerRef.current =
      newPlayer;

    playerVelocityRef.current = {
      x: 0,
      y: 0,
    };

    const newAIState = {
      ...newAI,

      hp: 100,

      state: "SEARCH",

      path: [],

      pathIndex: 0,

      lastKnownPlayerPosition:
        null,

      predictedPlayerPosition:
        null,

      lastSeenTime: null,

      noisePosition: null,

      noiseTime: null,

      timesDetected: 0,

      timesLostPlayer: 0,

      searchStartedAt:
        Date.now(),

      utilityScores: {
        ATTACK: 0,
        CHASE: 0,
        INVESTIGATE: 0,
        FLEE: 0,
        SEARCH: 0,
      },

      currentTarget: null,
    };

    setAI(
      newAIState
    );

    setPlayerHp(100);

    noiseRef.current =
      null;

    setGameStatus(
      "PLAYING"
    );

    setMessage(
      "🔎 AI is searching..."
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  const distanceToAI =
    calculateDistance(
      player,
      ai
    );

  const playerCanAttack =
    distanceToAI <=
    ATTACK_RANGE;


  return (
    <div className="game-container">

      <h1>DOT WAR</h1>

      <div className="game-info">

        <div>
          <strong>
            Player HP:
          </strong>{" "}
          {playerHp}
        </div>

        <div>
          <strong>
            AI HP:
          </strong>{" "}
          {ai.hp}
        </div>

        <div>
          <strong>
            AI State:
          </strong>{" "}
          {ai.state}
        </div>

      </div>


      {/* ===================================================
          GAME BOARD
      =================================================== */}

      <div
        className="game-board"
        style={{
          width:
            BOARD_WIDTH,
          height:
            BOARD_HEIGHT,
        }}
      >

        {/* MAZE */}

        {MAZE.map(
          (row, rowIndex) =>
            row
              .split("")
              .map(
                (cell, colIndex) => {
                  if (
                    cell !== "#"
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="wall"
                      style={{
                        position:
                          "absolute",

                        left:
                          colIndex *
                          CELL_SIZE,

                        top:
                          rowIndex *
                          CELL_SIZE,

                        width:
                          CELL_SIZE,

                        height:
                          CELL_SIZE,
                      }}
                    />
                  );
                }
              )
        )}


        {/* AI VISION */}

        <div
          className="vision-circle"
          style={{
            position:
              "absolute",

            left:
              ai.x -
              AI_VISION_RANGE,

            top:
              ai.y -
              AI_VISION_RANGE,

            width:
              AI_VISION_RANGE *
              2,

            height:
              AI_VISION_RANGE *
              2,

            borderRadius:
              "50%",
          }}
        />


        {/* NOISE */}

        {noiseRef.current && (
          <div
            className="noise-circle"
            style={{
              position:
                "absolute",

              left:
                noiseRef.current.x -
                noiseRef.current.radius,

              top:
                noiseRef.current.y -
                noiseRef.current.radius,

              width:
                noiseRef.current.radius *
                2,

              height:
                noiseRef.current.radius *
                2,

              borderRadius:
                "50%",
            }}
          />
        )}


        {/* LAST KNOWN POSITION */}

        {ai.lastKnownPlayerPosition && (
          <div
            className="last-known"
            style={{
              position:
                "absolute",

              left:
                ai.lastKnownPlayerPosition.x -
                6,

              top:
                ai.lastKnownPlayerPosition.y -
                6,

              width:
                12,

              height:
                12,

              borderRadius:
                "50%",
            }}
          />
        )}


        {/* PREDICTED POSITION */}

        {ai.predictedPlayerPosition && (
          <div
            className="predicted-position"
            style={{
              position:
                "absolute",

              left:
                ai.predictedPlayerPosition.x -
                6,

              top:
                ai.predictedPlayerPosition.y -
                6,

              width:
                12,

              height:
                12,

              borderRadius:
                "50%",
            }}
          />
        )}


        {/* A* PATH */}

        {ai.path &&
          ai.path.map(
            (point, index) => (
              <div
                key={index}
                className="path-node"
                style={{
                  position:
                    "absolute",

                  left:
                    point.x - 3,

                  top:
                    point.y - 3,

                  width: 6,

                  height: 6,

                  borderRadius:
                    "50%",
                }}
              />
            )
          )}


        {/* PLAYER */}

        <div
          className="player"
          style={{
            position:
              "absolute",

            left:
              player.x -
              PLAYER_RADIUS,

            top:
              player.y -
              PLAYER_RADIUS,

            width:
              PLAYER_RADIUS * 2,

            height:
              PLAYER_RADIUS * 2,

            borderRadius:
              "50%",
          }}
        />


        {/* AI */}

        <div
          className="ai"
          style={{
            position:
              "absolute",

            left:
              ai.x -
              AI_RADIUS,

            top:
              ai.y -
              AI_RADIUS,

            width:
              AI_RADIUS * 2,

            height:
              AI_RADIUS * 2,

            borderRadius:
              "50%",
          }}
        />


        {/* ATTACK RANGE */}

        {playerCanAttack && (
          <div
            className="attack-range"
            style={{
              position:
                "absolute",

              left:
                ai.x -
                ATTACK_RANGE,

              top:
                ai.y -
                ATTACK_RANGE,

              width:
                ATTACK_RANGE *
                2,

              height:
                ATTACK_RANGE *
                2,

              borderRadius:
                "50%",
            }}
          />
        )}

      </div>


      {/* ===================================================
          MESSAGE
      =================================================== */}

      <h2>
        {message}
      </h2>


      {/* ===================================================
          UTILITY AI PANEL
      =================================================== */}

      <div className="ai-panel">

        <h3>
          🧠 AI Utility Scores
        </h3>

        <div>
          Attack:{" "}
          {ai.utilityScores.ATTACK.toFixed(
            1
          )}
        </div>

        <div>
          Chase:{" "}
          {ai.utilityScores.CHASE.toFixed(
            1
          )}
        </div>

        <div>
          Investigate:{" "}
          {ai.utilityScores.INVESTIGATE.toFixed(
            1
          )}
        </div>

        <div>
          Flee:{" "}
          {ai.utilityScores.FLEE.toFixed(
            1
          )}
        </div>

        <div>
          Search:{" "}
          {ai.utilityScores.SEARCH.toFixed(
            1
          )}
        </div>

      </div>


      {/* ===================================================
          AI INFORMATION
      =================================================== */}

      <div className="ai-info">

        <p>
          <strong>
            Detection count:
          </strong>{" "}
          {ai.timesDetected}
        </p>

        <p>
          <strong>
            Lost player:
          </strong>{" "}
          {ai.timesLostPlayer}
        </p>

        <p>
          <strong>
            Current target:
          </strong>{" "}
          {ai.currentTarget
            ? `${Math.round(
                ai.currentTarget.x
              )}, ${Math.round(
                ai.currentTarget.y
              )}`
            : "None"}
        </p>

        <p>
          <strong>
            Distance:
          </strong>{" "}
          {Math.round(
            distanceToAI
          )} px
        </p>

      </div>


      {/* ===================================================
          CONTROLS
      =================================================== */}

      <div className="controls">

        <h3>
          Controls
        </h3>

        <p>
          W A S D / Arrow Keys
          → Move
        </p>

        <p>
          Space → Make loud
          noise
        </p>

        <p>
          Stay close to AI to
          automatically attack.
        </p>

      </div>


      {/* ===================================================
          GAME OVER
      =================================================== */}

      {gameStatus !==
        "PLAYING" && (
        <div className="game-over">

          <h2>
            {gameStatus ===
            "PLAYER_WON"
              ? "🏆 YOU WIN!"
              : "💀 AI WINS!"}
          </h2>

          <button
            onClick={
              restartGame
            }
          >
            Play Again
          </button>

        </div>
      )}

    </div>
  );
}

export default App;

