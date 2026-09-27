import { COLS, ROWS } from "../constants/gameConfig";
import { MAZE } from "../constants/maze";
import { worldToGrid, gridToWorld } from "./geometry";

/* =========================================================
   A* PATHFINDING
========================================================= */

export function getNeighbors(node) {
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

export function heuristic(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function nodeKey(node) {
  return `${node.col},${node.row}`;
}

export function findPath(startPosition, targetPosition) {
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
