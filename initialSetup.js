/**
 * Initial setup script for hexagon terrain map
 * Creates a circular train track loop
 * 
 * Usage:
 * import { initialSetup } from './initialSetup.js';
 * 
 * initialSetup(map, objects, TERRAIN, OBJECT_TYPES);
 */

/**
 * Populates the map and objects with initial terrain and a train track loop
 * @param {Object} map - Map object to populate (modified in place)
 * @param {Object} objects - Objects object to populate (modified in place)
 * @param {Object} TERRAIN - Terrain types definition
 * @param {Object} OBJECT_TYPES - Object types definition
 */
export function initialSetup(map, objects, TERRAIN, OBJECT_TYPES) {
  // Create a base terrain area (15x15 grid)


  // Helper function to create canonical edge key (same as in HTML file)
  function createEdgeKey(col1, row1, col2, row2) {
    const a = [col1, row1];
    const b = [col2, row2];
    const [first, second] = [a, b].sort((p, q) => {
      if (p[0] !== q[0]) return p[0] - q[0];
      return p[1] - q[1];
    });
    return `edge_${first[0]}_${first[1]}_${second[0]}_${second[1]}`;
  }

  // Define track segments as pairs of neighboring hexes
  // Each track connects two adjacent hexes along their shared edge
  const trackSegments = [
    // Top section
    { hex1: { col: 0, row: -2 }, hex2: { col: 1, row: -2 } },
    { hex1: { col: 1, row: -2 }, hex2: { col: 2, row: -1 } },
    
    // Right section
    { hex1: { col: 2, row: -1 }, hex2: { col: 2, row: 0 } },
    { hex1: { col: 2, row: 0 }, hex2: { col: 2, row: 1 } },
    
    // Bottom-right section
    { hex1: { col: 2, row: 1 }, hex2: { col: 1, row: 2 } },
    { hex1: { col: 1, row: 2 }, hex2: { col: 0, row: 2 } },
    
    // Bottom-left section
    { hex1: { col: 0, row: 2 }, hex2: { col: -1, row: 2 } },
    { hex1: { col: -1, row: 2 }, hex2: { col: -2, row: 1 } },
    
    // Left section
    { hex1: { col: -2, row: 1 }, hex2: { col: -2, row: 0 } },
    { hex1: { col: -2, row: 0 }, hex2: { col: -2, row: -1 } },
    
    // Top-left section (closing the loop)
    { hex1: { col: -2, row: -1 }, hex2: { col: -1, row: -2 } },
    { hex1: { col: -1, row: -2 }, hex2: { col: 0, row: -2 } },
  ];

  // Create track objects from segments using the canonical edge key
  trackSegments.forEach((segment) => {
    const edgeKey = createEdgeKey(
      segment.hex1.col,
      segment.hex1.row,
      segment.hex2.col,
      segment.hex2.row
    );
    
    objects[edgeKey] = {
      type: OBJECT_TYPES.TRACK,
      hex1: segment.hex1,
      hex2: segment.hex2,
      placedAt: Date.now()
    };
  });

  console.log(`🚂 Initial setup complete: ${trackSegments.length} track segments placed`);
}