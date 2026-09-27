import { useState, useRef, useEffect } from "react";
import {
  CELL_SIZE,
  PLAYER_SPEED,
  AI_SPEED,
  ATTACK_RANGE,
  ATTACK_DAMAGE,
  ATTACK_COOLDOWN,
  AI_VISION_RANGE,
  AI_HEARING_RANGE,
  PLAYER_RADIUS,
  AI_RADIUS,
  SEARCH_WAIT_TIME,
} from "../constants/gameConfig";
import {
  calculateDistance,
  isValidPosition,
} from "../utils/geometry";
import { findPath } from "../utils/pathfinding";
import {
  findAIStartPosition,
  hasLineOfSight,
  predictPlayerPosition,
  findFleeTarget,
  findRandomSearchTarget,
  calculateUtilityScores,
  getBestAction,
} from "../utils/aiLogic";
import { useKeyboardInput } from "./useKeyboardInput";

/* =========================================================
   CORE GAME HOOK
========================================================= */

export function useGame() {
  const initialPlayer = {
    x: CELL_SIZE * 1.5,
    y: CELL_SIZE * 1.5,
  };

  const initialAIPosition = findAIStartPosition(initialPlayer);

  /* =======================================================
     STATE
  ======================================================= */

  const [player, setPlayer] = useState(initialPlayer);
  const [playerHp, setPlayerHp] = useState(100);

  const [ai, setAI] = useState({
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
    searchStartedAt: Date.now(),
    utilityScores: {
      ATTACK: 0,
      CHASE: 0,
      INVESTIGATE: 0,
      FLEE: 0,
      SEARCH: 0,
    },
    currentTarget: null,
  });

  const [gameStatus, setGameStatus] = useState("PLAYING");
  const [message, setMessage] = useState("AI is searching...");

  /* =======================================================
     REFS & INPUT
  ======================================================= */

  const keys = useKeyboardInput();
  const playerRef = useRef(player);
  const playerVelocityRef = useRef({ x: 0, y: 0 });
  const noiseRef = useRef(null);

  /* =======================================================
     KEEP PLAYER REF UPDATED
  ======================================================= */

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  /* =======================================================
     PLAYER MOVEMENT
  ======================================================= */

  useEffect(() => {
    if (gameStatus !== "PLAYING") {
      return;
    }

    const interval = setInterval(() => {
      setPlayer((oldPlayer) => {
        let dx = 0;
        let dy = 0;

        if (keys.current.w || keys.current.arrowup) {
          dy -= PLAYER_SPEED;
        }

        if (keys.current.s || keys.current.arrowdown) {
          dy += PLAYER_SPEED;
        }

        if (keys.current.a || keys.current.arrowleft) {
          dx -= PLAYER_SPEED;
        }

        if (keys.current.d || keys.current.arrowright) {
          dx += PLAYER_SPEED;
        }

        const newX = oldPlayer.x + dx;
        const newY = oldPlayer.y + dy;

        const validX = isValidPosition(
          newX,
          oldPlayer.y,
          PLAYER_RADIUS
        );

        const validY = isValidPosition(
          oldPlayer.x,
          newY,
          PLAYER_RADIUS
        );

        let finalX = validX ? newX : oldPlayer.x;
        let finalY = validY ? newY : oldPlayer.y;

        /*
          Calculate player velocity.
        */
        playerVelocityRef.current = {
          x: finalX - oldPlayer.x,
          y: finalY - oldPlayer.y,
        };

        /*
          Running creates noise.
        */
        if (dx !== 0 || dy !== 0) {
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
        if (keys.current.space) {
          noiseRef.current = {
            x: finalX,
            y: finalY,
            radius: 250,
            time: Date.now(),
            type: "loud",
          };

          setMessage("💥 Loud noise detected!");
        }

        return {
          x: finalX,
          y: finalY,
        };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [gameStatus, keys]);

  /* =======================================================
     AI DECISION SYSTEM
  ======================================================= */

  useEffect(() => {
    if (gameStatus !== "PLAYING") {
      return;
    }

    const interval = setInterval(() => {
      setAI((oldAI) => {
        const currentPlayer = playerRef.current;

        const distance = calculateDistance(
          oldAI,
          currentPlayer
        );

        const canSeePlayer =
          distance <= AI_VISION_RANGE &&
          hasLineOfSight(oldAI, currentPlayer);

        /*
          HEARING
        */
        const currentNoise = noiseRef.current;

        const heardNoise =
          currentNoise &&
          Date.now() - currentNoise.time < 1000 &&
          calculateDistance(oldAI, currentNoise) <=
            Math.min(currentNoise.radius, AI_HEARING_RANGE);

        /*
          LAST KNOWN POSITION
        */
        let hasLastKnownPosition = Boolean(
          oldAI.lastKnownPlayerPosition
        );

        if (
          oldAI.lastSeenTime &&
          Date.now() - oldAI.lastSeenTime > SEARCH_WAIT_TIME
        ) {
          hasLastKnownPosition = false;
        }

        /*
          UTILITY SCORES
        */
        const utilityScores = calculateUtilityScores({
          ai: oldAI,
          player: currentPlayer,
          canSeePlayer,
          heardNoise,
          hasLastKnownPosition,
        });

        /*
          SELECT ACTION
        */
        let bestAction = getBestAction(utilityScores);

        /*
          IMPORTANT:
          If AI can directly see the player,
          fleeing should not randomly override
          attack/chase unless HP is very low.
        */
        if (canSeePlayer && oldAI.hp > 15) {
          if (distance <= ATTACK_RANGE) {
            bestAction = "ATTACK";
          } else {
            bestAction = "CHASE";
          }
        }

        let nextAI = {
          ...oldAI,
          utilityScores,
          state: bestAction,
        };

        /* =================================================
           PLAYER DETECTED
        ================================================= */
        if (canSeePlayer) {
          const predicted = predictPlayerPosition(
            currentPlayer,
            playerVelocityRef.current
          );

          nextAI = {
            ...nextAI,
            lastKnownPlayerPosition: {
              x: currentPlayer.x,
              y: currentPlayer.y,
            },
            predictedPlayerPosition: predicted,
            lastSeenTime: Date.now(),
            timesDetected: oldAI.timesDetected + 1,
          };

          if (bestAction === "ATTACK") {
            nextAI.path = [];
            nextAI.pathIndex = 0;
            nextAI.currentTarget = null;
            setMessage("⚔️ AI is attacking!");
          } else if (bestAction === "CHASE") {
            const path = findPath(oldAI, predicted);
            nextAI.path = path;
            nextAI.pathIndex = 0;
            nextAI.currentTarget = predicted;
            setMessage("🎯 AI detected you and is chasing!");
          }

          return nextAI;
        }

        /* =================================================
           FLEE
        ================================================= */
        if (bestAction === "FLEE") {
          /*
            Recalculate flee target if current target is missing.
          */
          if (
            !oldAI.currentTarget ||
            oldAI.pathIndex >= oldAI.path.length
          ) {
            const fleeTarget = findFleeTarget(
              oldAI,
              currentPlayer
            );

            const path = findPath(oldAI, fleeTarget);

            nextAI.path = path;
            nextAI.pathIndex = 0;
            nextAI.currentTarget = fleeTarget;
          }

          setMessage("🏃 AI is fleeing!");
          return nextAI;
        }

        /* =================================================
           INVESTIGATE NOISE
        ================================================= */
        if (bestAction === "INVESTIGATE" && heardNoise) {
          const noisePosition = {
            x: currentNoise.x,
            y: currentNoise.y,
          };

          const path = findPath(oldAI, noisePosition);

          nextAI = {
            ...nextAI,
            noisePosition,
            noiseTime: Date.now(),
            path,
            pathIndex: 0,
            currentTarget: noisePosition,
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
          bestAction === "INVESTIGATE" &&
          oldAI.predictedPlayerPosition
        ) {
          const path = findPath(
            oldAI,
            oldAI.predictedPlayerPosition
          );

          nextAI = {
            ...nextAI,
            path,
            pathIndex: 0,
            currentTarget: oldAI.predictedPlayerPosition,
          };

          setMessage("🧠 AI is predicting your movement!");
          return nextAI;
        }

        /* =================================================
           SEARCH
        ================================================= */
        if (bestAction === "SEARCH") {
          if (
            !oldAI.path ||
            oldAI.pathIndex >= oldAI.path.length
          ) {
            const searchTarget = findRandomSearchTarget(oldAI);
            const path = findPath(oldAI, searchTarget);

            nextAI = {
              ...nextAI,
              path,
              pathIndex: 0,
              currentTarget: searchTarget,
              searchStartedAt: Date.now(),
            };
          }

          setMessage("🔎 AI is randomly searching...");
          return nextAI;
        }

        return nextAI;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [gameStatus]);

  /* =======================================================
     AI MOVEMENT
  ======================================================= */

  useEffect(() => {
    if (gameStatus !== "PLAYING") {
      return;
    }

    const interval = setInterval(() => {
      setAI((oldAI) => {
        if (oldAI.state === "ATTACK") {
          return oldAI;
        }

        if (!oldAI.path || oldAI.path.length === 0) {
          return oldAI;
        }

        if (oldAI.pathIndex >= oldAI.path.length) {
          return oldAI;
        }

        const target = oldAI.path[oldAI.pathIndex];
        const dx = target.x - oldAI.x;
        const dy = target.y - oldAI.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 4) {
          return {
            ...oldAI,
            pathIndex: oldAI.pathIndex + 1,
          };
        }

        const directionX = dx / distance;
        const directionY = dy / distance;

        const newX = oldAI.x + directionX * AI_SPEED;
        const newY = oldAI.y + directionY * AI_SPEED;

        if (!isValidPosition(newX, newY, AI_RADIUS)) {
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

    return () => clearInterval(interval);
  }, [gameStatus]);

  /* =======================================================
     AI ATTACK
  ======================================================= */

  useEffect(() => {
    if (gameStatus !== "PLAYING") {
      return;
    }

    const interval = setInterval(() => {
      setAI((currentAI) => {
        if (currentAI.state !== "ATTACK") {
          return currentAI;
        }

        const currentPlayer = playerRef.current;
        const distance = calculateDistance(
          currentAI,
          currentPlayer
        );

        if (distance > ATTACK_RANGE) {
          return {
            ...currentAI,
            state: "CHASE",
          };
        }

        setPlayerHp((oldHp) => {
          const newHp = Math.max(
            0,
            oldHp - ATTACK_DAMAGE
          );

          if (newHp <= 0) {
            setGameStatus("AI_WON");
            setMessage("💀 AI won!");
          }

          return newHp;
        });

        setMessage("💥 AI attacked you!");
        return currentAI;
      });
    }, ATTACK_COOLDOWN);

    return () => clearInterval(interval);
  }, [gameStatus]);

  /* =======================================================
     PLAYER AUTO ATTACK
  ======================================================= */

  useEffect(() => {
    if (gameStatus !== "PLAYING") {
      return;
    }

    const interval = setInterval(() => {
      setAI((currentAI) => {
        const currentPlayer = playerRef.current;
        const distance = calculateDistance(
          currentAI,
          currentPlayer
        );

        if (distance > ATTACK_RANGE) {
          return currentAI;
        }

        const newHp = Math.max(
          0,
          currentAI.hp - ATTACK_DAMAGE
        );

        /*
          Player attack creates loud noise.
        */
        noiseRef.current = {
          x: currentPlayer.x,
          y: currentPlayer.y,
          radius: 250,
          time: Date.now(),
          type: "attack",
        };

        if (newHp <= 0) {
          setGameStatus("PLAYER_WON");
          setMessage("🏆 You defeated the AI!");
        }

        return {
          ...currentAI,
          hp: newHp,
        };
      });
    }, ATTACK_COOLDOWN);

    return () => clearInterval(interval);
  }, [gameStatus]);

  /* =======================================================
     NOISE CLEANUP
  ======================================================= */

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        noiseRef.current &&
        Date.now() - noiseRef.current.time > 1000
      ) {
        noiseRef.current = null;
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  /* =======================================================
     RESTART GAME
  ======================================================= */

  function restartGame() {
    const newPlayer = {
      x: CELL_SIZE * 1.5,
      y: CELL_SIZE * 1.5,
    };

    const newAI = findAIStartPosition(newPlayer);

    setPlayer(newPlayer);
    playerRef.current = newPlayer;
    playerVelocityRef.current = { x: 0, y: 0 };

    const newAIState = {
      ...newAI,
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
      searchStartedAt: Date.now(),
      utilityScores: {
        ATTACK: 0,
        CHASE: 0,
        INVESTIGATE: 0,
        FLEE: 0,
        SEARCH: 0,
      },
      currentTarget: null,
    };

    setAI(newAIState);
    setPlayerHp(100);
    noiseRef.current = null;
    setGameStatus("PLAYING");
    setMessage("🔎 AI is searching...");
  }

  const distanceToAI = calculateDistance(player, ai);
  const playerCanAttack = distanceToAI <= ATTACK_RANGE;

  return {
    player,
    playerHp,
    ai,
    gameStatus,
    message,
    noiseRef,
    distanceToAI,
    playerCanAttack,
    restartGame,
  };
}
