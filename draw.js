/**
 * Drawing module for hexagon terrain map
 *
 * Usage:
 * import { draw } from './draw.js';
 *
 * draw(ctx, {
 *   canvas,
 *   map,
 *   objects,
 *   trains,
 *   camera,
 *   hoveredElement,
 *   size,
 *   zoom,
 *   TERRAIN,
 *   OBJECT_TYPES,
 *   tileCountEl,
 *   zoomLevelEl,
 *   trackCountEl,
 *   trainCountEl
 * });
 */

// Lighten a hex color
import {
  hexToPixel,
  pixelToHex,
  getHexVertices,
  getNeighbor,
} from "./hexUtils.js";
function lightenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Convert grid coordinates to pixel coordinates (flat-top)
// function hexToPixel(col, row, size) {
//   const width = size * 2;
//   const height = Math.sqrt(3) * size;
//   const x = col * width * 0.75;
//   const y = row * height + ((Math.abs(col) % 2) * height) / 2;
//   return { x, y };
// }

// Convert pixel coordinates to grid coordinates (flat-top)
// function pixelToHex(x, y, size) {
//   const q = ((2 / 3) * x) / size;
//   const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / size;

//   let cubeQ = q;
//   let cubeR = r;
//   let cubeS = -q - r;

//   let rq = Math.round(cubeQ);
//   let rr = Math.round(cubeR);
//   let rs = Math.round(cubeS);

//   const q_diff = Math.abs(rq - cubeQ);
//   const r_diff = Math.abs(rr - cubeR);
//   const s_diff = Math.abs(rs - cubeS);

//   if (q_diff > r_diff && q_diff > s_diff) {
//     rq = -rr - rs;
//   } else if (r_diff > s_diff) {
//     rr = -rq - rs;
//   }

//   const col = rq;
//   const row = rr + Math.floor(rq / 2);

//   return { col, row };
// }

// Get the 6 vertices of a hex in pixel coordinates
// function getHexVertices(centerX, centerY, size) {
//   const angles = [0, 60, 120, 180, 240, 300];
//   return angles.map((angle) => {
//     const angleRad = (Math.PI / 180) * angle;
//     return {
//       x: centerX + size * Math.cos(angleRad),
//       y: centerY + size * Math.sin(angleRad),
//     };
//   });
// }

// Get the neighbor hex for a given side (flat-top orientation)
// function getNeighbor(col, row, side) {
//   const isEven = col % 2 === 0;

//   const neighbors = isEven
//     ? [
//         [col + 1, row],
//         [col, row + 1],
//         [col - 1, row],
//         [col - 1, row - 1],
//         [col, row - 1],
//         [col + 1, row - 1],
//       ]
//     : [
//         [col + 1, row + 1],
//         [col, row + 1],
//         [col - 1, row + 1],
//         [col - 1, row],
//         [col, row - 1],
//         [col + 1, row],
//       ];

//   return { col: neighbors[side][0], row: neighbors[side][1] };
// }

// Draw a flat-top hexagon
function drawHex(
  ctx,
  centerX,
  centerY,
  terrain,
  isHovered,
  col,
  row,
  size,
  zoom
) {
  ctx.beginPath();

  const angles = [0, 60, 120, 180, 240, 300];

  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * angles[i];
    const x = centerX + size * Math.cos(angleRad);
    const y = centerY + size * Math.sin(angleRad);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fillStyle = isHovered ? lightenColor(terrain.color, 30) : terrain.color;
  ctx.fill();
  ctx.strokeStyle = isHovered ? "#ffcc00" : "#333";
  ctx.lineWidth = isHovered ? 2 * zoom : 1 * zoom;
  ctx.stroke();

  // Draw col,row label in the middle
  ctx.fillStyle = "#000";
  ctx.font = `${12 * zoom}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${col},${row}`, centerX, centerY);
}

// Draw hover highlight for vertex
function drawVertexHighlight(ctx, x, y, zoom) {
  ctx.beginPath();
  ctx.arc(x, y, 6 * zoom, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 204, 0, 0.5)";
  ctx.fill();
  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 2 * zoom;
  ctx.stroke();
}

// Draw hover highlight for edge
function drawEdgeHighlight(ctx, centerX, centerY, edgeIndex, size, zoom) {
  const vertices = getHexVertices(centerX, centerY, size);
  const v1 = vertices[edgeIndex];
  const v2 = vertices[(edgeIndex + 1) % 6];

  // Draw thick line for the edge
  ctx.beginPath();
  ctx.moveTo(v1.x, v1.y);
  ctx.lineTo(v2.x, v2.y);
  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 6 * zoom;
  ctx.stroke();

  // Draw dot at midpoint
  const midX = (v1.x + v2.x) / 2;
  const midY = (v1.y + v2.y) / 2;
  ctx.beginPath();
  ctx.arc(midX, midY, 5 * zoom, 0, Math.PI * 2);
  ctx.fillStyle = "#ffcc00";
  ctx.fill();
}

// Draw a building on a hex tile
function drawBuilding(ctx, col, row, camera, size, zoom, building) {
  switch (building.type) {
    case "lumberyard": {
      drawLumberyard(ctx, col, row, camera, size, zoom);
      break;
    }
    case "hub": {
      drawHub(ctx, col, row, camera, size, zoom);
      break;
    }
  }

  // drawLumberyard(ctx, col, row, camera, size, zoom);
}

function drawHub(ctx, col, row, camera, size, zoom) {
  const pos = hexToPixel(col, row, size);
  const screenX = pos.x + camera.x;
  const screenY = pos.y + camera.y;
  const buildingSize = size * 0.65;

  ctx.save();

  // Multi-building complex
  const mainSize = buildingSize * 0.5;

  // Main building
  ctx.fillStyle = "#8b9dc3";
  ctx.fillRect(
    screenX - mainSize / 2,
    screenY - mainSize / 2,
    mainSize,
    mainSize
  );

  // Roof
  ctx.fillStyle = "#6a7ba3";
  ctx.fillRect(screenX - mainSize / 2, screenY - mainSize / 2 - 8, mainSize, 8);

  // Side annexes
  ctx.fillStyle = "#9fafc9";
  ctx.fillRect(
    screenX - mainSize / 2 - mainSize * 0.3,
    screenY - mainSize / 4,
    mainSize * 0.3,
    mainSize / 2
  );
  ctx.fillRect(
    screenX + mainSize / 2,
    screenY - mainSize / 4,
    mainSize * 0.3,
    mainSize / 2
  );

  // Windows grid
  ctx.fillStyle = "#ffeb99";
  const windowSize = mainSize * 0.12;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillRect(
        screenX - mainSize / 3 + col * mainSize * 0.4,
        screenY - mainSize / 4 + row * mainSize * 0.35,
        windowSize,
        windowSize
      );
    }
  }

  // Door
  ctx.fillStyle = "#4a5568";
  ctx.fillRect(
    screenX - mainSize / 6,
    screenY + mainSize / 4,
    mainSize / 3,
    mainSize / 4
  );

  // Hub symbol (star)
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
    const x = screenX + Math.cos(angle) * mainSize * 0.15;
    const y = screenY - mainSize / 2 - 15 + Math.sin(angle) * mainSize * 0.15;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawLumberyard(ctx, col, row, camera, size, zoom) {
  const pos = hexToPixel(col, row, size);
  const screenX = pos.x + camera.x;
  const screenY = pos.y + camera.y;
  const buildingSize = size * 0.6;

  ctx.save();

  // Traditional timber mill
  const roofHeight = buildingSize * 0.4;

  // Stone foundation
  ctx.fillStyle = "#888888";
  ctx.fillRect(
    screenX - buildingSize / 2,
    screenY + buildingSize / 4,
    buildingSize,
    buildingSize * 0.15
  );

  // Wooden walls
  ctx.fillStyle = "#a0826d";
  ctx.fillRect(
    screenX - buildingSize / 2,
    screenY - buildingSize / 4,
    buildingSize,
    buildingSize / 2
  );

  // Vertical planks
  ctx.strokeStyle = "#8b6f47";
  ctx.lineWidth = 2 * zoom;
  for (let i = 0; i <= 6; i++) {
    const x = screenX - buildingSize / 2 + (buildingSize / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, screenY - buildingSize / 4);
    ctx.lineTo(x, screenY + buildingSize / 4);
    ctx.stroke();
  }

  // Pitched roof
  ctx.fillStyle = "#704214";
  ctx.beginPath();
  ctx.moveTo(screenX - buildingSize / 2 - 5, screenY - buildingSize / 4);
  ctx.lineTo(screenX, screenY - buildingSize / 4 - roofHeight);
  ctx.lineTo(screenX + buildingSize / 2 + 5, screenY - buildingSize / 4);
  ctx.closePath();
  ctx.fill();

  // Chimney
  ctx.fillStyle = "#a0522d";
  ctx.fillRect(
    screenX + buildingSize / 4,
    screenY - buildingSize / 4 - roofHeight + 5,
    buildingSize * 0.12,
    roofHeight * 0.6
  );

  // Windows
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(
    screenX - buildingSize / 3,
    screenY - buildingSize / 8,
    buildingSize * 0.15,
    buildingSize * 0.15
  );
  ctx.fillRect(
    screenX + buildingSize / 6,
    screenY - buildingSize / 8,
    buildingSize * 0.15,
    buildingSize * 0.15
  );

  ctx.restore();
}

// Draw a train track between two hexes
function drawTrackBetweenHexes(ctx, hex1, hex2, camera, size, zoom) {
  const pos1 = hexToPixel(hex1.col, hex1.row, size);
  const pos2 = hexToPixel(hex2.col, hex2.row, size);

  // Find which edge of hex1 connects to hex2
  let edgeIndex = -1;
  for (let i = 0; i < 6; i++) {
    const neighbor = getNeighbor(hex1.col, hex1.row, i);
    if (neighbor.col === hex2.col && neighbor.row === hex2.row) {
      edgeIndex = i;
      break;
    }
  }

  if (edgeIndex === -1) return;

  const screenX = pos1.x + camera.x;
  const screenY = pos1.y + camera.y;

  const vertices = getHexVertices(screenX, screenY, size);
  const v1 = vertices[edgeIndex];
  const v2 = vertices[(edgeIndex + 1) % 6];

  // Draw railroad ties (sleepers)
  const numTies = 5;
  const tieWidth = size * 0.15;
  const tieThickness = 1.5 * zoom;

  ctx.strokeStyle = "#4a3a2a";
  ctx.lineWidth = tieThickness;

  for (let i = 0; i <= numTies; i++) {
    const t = i / numTies;
    const mx = v1.x + (v2.x - v1.x) * t;
    const my = v1.y + (v2.y - v1.y) * t;

    // Perpendicular direction
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = (-dy / len) * tieWidth;
    const perpY = (dx / len) * tieWidth;

    ctx.beginPath();
    ctx.moveTo(mx - perpX, my - perpY);
    ctx.lineTo(mx + perpX, my + perpY);
    ctx.stroke();
  }

  // Draw rails
  const railOffset = size * 0.08;
  const railThickness = 2 * zoom;

  ctx.strokeStyle = "#708090";
  ctx.lineWidth = railThickness;

  // Calculate perpendicular offset
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = (-dy / len) * railOffset;
  const perpY = (dx / len) * railOffset;

  // Rail 1
  ctx.beginPath();
  ctx.moveTo(v1.x - perpX, v1.y - perpY);
  ctx.lineTo(v2.x - perpX, v2.y - perpY);
  ctx.stroke();

  // Rail 2
  ctx.beginPath();
  ctx.moveTo(v1.x + perpX, v1.y + perpY);
  ctx.lineTo(v2.x + perpX, v2.y + perpY);
  ctx.stroke();
}

// Draw a train on a track
// Draw a train on a track
function drawTrain(ctx, hex1, hex2, progress, camera, size, zoom) {
  const pos1 = hexToPixel(hex1.col, hex1.row, size);

  // Find which edge of hex1 connects to hex2
  let edgeIndex = -1;
  for (let i = 0; i < 6; i++) {
    const neighbor = getNeighbor(hex1.col, hex1.row, i);
    if (neighbor.col === hex2.col && neighbor.row === hex2.row) {
      edgeIndex = i;
      break;
    }
  }

  if (edgeIndex === -1) return;

  const screenX = pos1.x + camera.x;
  const screenY = pos1.y + camera.y;
  const vertices = getHexVertices(screenX, screenY, size);
  const v1 = vertices[edgeIndex];
  const v2 = vertices[(edgeIndex + 1) % 6];

  // Calculate train position
  const trainX = v1.x + (v2.x - v1.x) * progress;
  const trainY = v1.y + (v2.y - v1.y) * progress;

  // Calculate rotation angle based on track direction
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const angle = Math.atan2(dy, dx);

  // Train dimensions
  const trainLength = size * 0.3 * zoom;
  const trainWidth = size * 0.15 * zoom;

  ctx.save();
  ctx.translate(trainX, trainY);
  ctx.rotate(angle);

  // Draw train body (rectangle)
  ctx.fillStyle = "#c41e3a";
  ctx.fillRect(-trainLength / 2, -trainWidth / 2, trainLength, trainWidth);
  ctx.strokeStyle = "#8b0000";
  ctx.lineWidth = 1.5 * zoom;
  ctx.strokeRect(-trainLength / 2, -trainWidth / 2, trainLength, trainWidth);

  // Draw train windows (two small rectangles)
  ctx.fillStyle = "#ffeb3b";
  const windowWidth = trainLength * 0.25;
  const windowHeight = trainWidth * 0.5;
  const windowSpacing = trainLength * 0.15;

  ctx.fillRect(
    -windowSpacing - windowWidth / 2,
    -windowHeight / 2,
    windowWidth,
    windowHeight
  );
  ctx.fillRect(
    windowSpacing - windowWidth / 2,
    -windowHeight / 2,
    windowWidth,
    windowHeight
  );

  ctx.restore();
}

// Get visible hex range
function getVisibleHexRange(canvas, camera, size) {
  const width = size * 2;
  const height = Math.sqrt(3) * size;
  const margin = 3;

  const topLeft = pixelToHex(
    -camera.x - width * margin,
    -camera.y - height * margin,
    size
  );
  const bottomRight = pixelToHex(
    -camera.x + canvas.width + width * margin,
    -camera.y + canvas.height + height * margin,
    size
  );

  return {
    minCol: topLeft.col - margin,
    maxCol: bottomRight.col + margin,
    minRow: topLeft.row - margin,
    maxRow: bottomRight.row + margin,
  };
}

/**
 * Main draw function
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} params - Drawing parameters
 * @param {HTMLCanvasElement} params.canvas - Canvas element
 * @param {Object} params.map - Map data structure (hex tiles)
 * @param {Object} params.objects - Objects data structure (tracks, etc.)
 * @param {Array} params.trains - Trains array
 * @param {Object} params.camera - Camera position {x, y}
 * @param {Object|null} params.hoveredElement - Currently hovered element
 * @param {number} params.size - Current hex size (affected by zoom)
 * @param {number} params.zoom - Current zoom level
 * @param {Object} params.TERRAIN - Terrain types definition
 * @param {Object} params.OBJECT_TYPES - Object types definition
 * @param {HTMLElement} params.tileCountEl - Element to display tile count
 * @param {HTMLElement} params.zoomLevelEl - Element to display zoom level
 * @param {HTMLElement} params.trackCountEl - Element to display track count
 * @param {HTMLElement} params.trainCountEl - Element to display train count
 */
export function draw(ctx, params) {
  const {
    canvas,
    map,
    placed_tracks,
    placed_buildings,
    trains,
    camera,
    hoveredElement,
    size,
    zoom,
    TERRAIN,
    OBJECT_TYPES,
    tileCountEl,
    zoomLevelEl,
    trackCountEl,
    trainCountEl,
  } = params;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const range = getVisibleHexRange(canvas, camera, size);

  // Draw tiles
  for (let col = range.minCol; col <= range.maxCol; col++) {
    for (let row = range.minRow; row <= range.maxRow; row++) {
      const hexKey = `${col},${row}`;
      const hex = map[hexKey];

      if (!hex) continue;

      const pos = hexToPixel(col, row, size);
      const screenX = pos.x + camera.x;
      const screenY = pos.y + camera.y;

      const isHovered =
        hoveredElement &&
        hoveredElement.type === "tile" &&
        hoveredElement.col === col &&
        hoveredElement.row === row;

      drawHex(
        ctx,
        screenX,
        screenY,
        hex.terrain,
        isHovered,
        col,
        row,
        size,
        zoom
      );
    }
  }

  // Draw all objects (tracks, etc.)
  let trackCount = 0;
  for (const key in placed_tracks) {
    const obj = placed_tracks[key];

    if (obj.type === OBJECT_TYPES.TRACK) {
      trackCount++;

      // Check if either hex is in visible range
      const hex1 = obj.hex1;
      const hex2 = obj.hex2;

      const inRange =
        (hex1.col >= range.minCol &&
          hex1.col <= range.maxCol &&
          hex1.row >= range.minRow &&
          hex1.row <= range.maxRow) ||
        (hex2.col >= range.minCol &&
          hex2.col <= range.maxCol &&
          hex2.row >= range.minRow &&
          hex2.row <= range.maxRow);

      if (inRange) {
        drawTrackBetweenHexes(ctx, hex1, hex2, camera, size, zoom);
      }
    }
  }
  for (const tileKey in placed_buildings) {
    const building = placed_buildings[tileKey];

    // Check if building is in visible range
    const inRange =
      building.col >= range.minCol &&
      building.col <= range.maxCol &&
      building.row >= range.minRow &&
      building.row <= range.maxRow;

    if (inRange) {
      drawBuilding(
        ctx,
        building.col,
        building.row,
        camera,
        size,
        zoom,
        building
      );
    }
  }

  // Draw trains
  if (trains) {
    trains.forEach((train) => {
      // Check if train is in visible range
      const hex1 = train.hex1;
      const hex2 = train.hex2;

      const inRange =
        (hex1.col >= range.minCol &&
          hex1.col <= range.maxCol &&
          hex1.row >= range.minRow &&
          hex1.row <= range.maxRow) ||
        (hex2.col >= range.minCol &&
          hex2.col <= range.maxCol &&
          hex2.row >= range.minRow &&
          hex2.row <= range.maxRow);

      if (inRange) {
        drawTrain(
          ctx,
          train.hex1,
          train.hex2,
          train.progress,
          camera,
          size,
          zoom
        );
      }
    });
  }

  // Draw hover highlights on top
  if (hoveredElement) {
    const pos = hexToPixel(hoveredElement.col, hoveredElement.row, size);
    const screenX = pos.x + camera.x;
    const screenY = pos.y + camera.y;

    if (hoveredElement.type === "vertex") {
      const vertices = getHexVertices(screenX, screenY, size);
      const v = vertices[hoveredElement.vertexIndex];
      drawVertexHighlight(ctx, v.x, v.y, zoom);
    } else if (hoveredElement.type === "edge") {
      drawEdgeHighlight(
        ctx,
        screenX,
        screenY,
        hoveredElement.edgeIndex,
        size,
        zoom
      );
    }
  }

  // Update UI elements
  tileCountEl.textContent = Object.keys(map).length;
  zoomLevelEl.textContent = Math.round(zoom * 100);
  trackCountEl.textContent = trackCount;
  if (trainCountEl && trains) {
    trainCountEl.textContent = trains.length;
  }
}
