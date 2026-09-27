import { CELL_SIZE, COLS, ROWS } from "../constants/gameConfig";
import { MAZE } from "../constants/maze";

/* =========================================================
   BASIC HELPERS & GEOMETRY
========================================================= */

export function isWall(x, y) {
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

export function worldToGrid(x, y) {
  return {
    col: Math.floor(x / CELL_SIZE),
    row: Math.floor(y / CELL_SIZE),
  };
}

export function gridToWorld(col, row) {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

export function calculateDistance(a, b) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
}

export function isValidPosition(x, y, radius = 8) {
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
