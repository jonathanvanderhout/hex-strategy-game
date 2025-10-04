/**
 * Shared hexagon utility functions for flat-top orientation
 */

// Convert grid coordinates to pixel coordinates
export function hexToPixel(col, row, size) {
  const width = size * 2;
  const height = Math.sqrt(3) * size;
  const x = col * width * 0.75;
  const y = row * height + ((Math.abs(col) % 2) * height) / 2;
  return { x, y };
}

// Convert pixel coordinates to grid coordinates
export function pixelToHex(x, y, size) {
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / size;

  let cubeQ = q;
  let cubeR = r;
  let cubeS = -q - r;

  let rq = Math.round(cubeQ);
  let rr = Math.round(cubeR);
  let rs = Math.round(cubeS);

  const q_diff = Math.abs(rq - cubeQ);
  const r_diff = Math.abs(rr - cubeR);
  const s_diff = Math.abs(rs - cubeS);

  if (q_diff > r_diff && q_diff > s_diff) {
    rq = -rr - rs;
  } else if (r_diff > s_diff) {
    rr = -rq - rs;
  }

  const col = rq;
  const row = rr + Math.floor(rq / 2);

  return { col, row };
}

// Get the 6 vertices of a hex in pixel coordinates
export function getHexVertices(centerX, centerY, size) {
  const angles = [0, 60, 120, 180, 240, 300];
  return angles.map((angle) => {
    const angleRad = (Math.PI / 180) * angle;
    return {
      x: centerX + size * Math.cos(angleRad),
      y: centerY + size * Math.sin(angleRad),
    };
  });
}

// Get the neighbor hex for a given side
export function getNeighbor(col, row, side) {
  const isEven = col % 2 === 0;
  const neighbors = isEven
    ? [
        [col + 1, row],
        [col, row + 1],
        [col - 1, row],
        [col - 1, row - 1],
        [col, row - 1],
        [col + 1, row - 1],
      ]
    : [
        [col + 1, row + 1],
        [col, row + 1],
        [col - 1, row + 1],
        [col - 1, row],
        [col, row - 1],
        [col + 1, row],
      ];
  return { col: neighbors[side][0], row: neighbors[side][1] };
}
