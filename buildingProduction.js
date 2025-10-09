// buildingProduction.js

import { getBuildingType } from './buildingTypes.js';

/**
 * Update all buildings' production progress and handle resource generation/consumption
 * @param {Object} gameState - The game state object containing placed_buildings
 * @param {number} deltaTime - Time elapsed since last update (in milliseconds)
 */
export function updateBuildings(gameState, deltaTime = 16.67) {
  // Iterate through all placed buildings
  for (let tileKey in gameState.placed_buildings) {
    const building = gameState.placed_buildings[tileKey];
    const buildingType = getBuildingType(building.type);
    
    if (!buildingType || buildingType.productionSpeed === 0) continue;
    
    // Initialize inventory if it doesn't exist
    if (!building.inventory) {
      building.inventory = {};
    }
    
    // Initialize production progress if it doesn't exist
    if (building.productionProgress === undefined) {
      building.productionProgress = 0;
    }
    
    // Check if building can produce (has required inputs)
    const canProduce = checkProductionRequirements(building, buildingType);
    
    if (canProduce) {
      // Increment production progress
      building.productionProgress += buildingType.productionSpeed;
      
      // Check if production cycle is complete
      if (building.productionProgress >= 1.0) {
        completeProductionCycle(building, buildingType);
        building.productionProgress = 0; // Reset progress
      }
    } else {
      // Optionally slow down or pause progress if missing inputs
      // building.productionProgress = Math.max(0, building.productionProgress - 0.001);
    }
  }
}

/**
 * Check if building has required inputs to produce
 * @param {Object} building - The building instance
 * @param {Object} buildingType - The building type definition
 * @returns {boolean} - Whether building can produce
 */
function checkProductionRequirements(building, buildingType) {
  // Buildings with no consumption requirements can always produce
  if (!buildingType.consumes || buildingType.consumes.length === 0) {
    return true;
  }
  
  // Check if all required resources are available in inventory
  for (let requirement of buildingType.consumes) {
    const available = building.inventory[requirement.type] || 0;
    if (available < requirement.amount) {
      return false;
    }
  }
  
  return true;
}

/**
 * Complete a production cycle - consume inputs and generate outputs
 * @param {Object} building - The building instance
 * @param {Object} buildingType - The building type definition
 */
function completeProductionCycle(building, buildingType) {
  // Consume inputs
  if (buildingType.consumes && buildingType.consumes.length > 0) {
    for (let requirement of buildingType.consumes) {
      // Should consume from inputs
      building.inventory.inputs[requirement.type] -= requirement.amount;
      
      // Ensure inventory doesn't go negative (safety check)
      if (building.inventory.inputs[requirement.type] < 0) {
        building.inventory.inputs[requirement.type] = 0;
      }
    }
  }
  
  // Produce outputs
  if (buildingType.produces) {
    const outputType = buildingType.produces.type;
    const outputAmount = buildingType.produces.amount;
    
    if (!building.inventory.outputs[outputType]) {
      building.inventory.outputs[outputType] = 0;
    }
    
    building.inventory.outputs[outputType] += outputAmount;
    
    console.log(`🏭 ${buildingType.name} produced ${outputAmount}x ${outputType}`, {
      tileKey: `${building.col},${building.row}`,
      inventory: building.inventory
    });
  }
}


/**
 * Start the building production loop
 * @param {Object} gameState - The game state object
 * @param {number} updateRate - Update rate in milliseconds (default 60 FPS)
 * @returns {number} - Interval ID for stopping the loop
 */
export function startBuildingProductionLoop(gameState, updateRate = 100) {
  const intervalId = setInterval(() => {
    updateBuildings(gameState, updateRate);
  }, updateRate);
  
  console.log('🏗️ Building production system started');
  
  return intervalId;
}

export function stopBuildingProductionLoop(intervalId) {
  clearInterval(intervalId);
  console.log('🛑 Building production system stopped');
}

/**
 * Manually add resources to a building's inventory (for testing or train deliveries)
 * @param {Object} building - The building instance
 * @param {string} resourceType - Type of resource
 * @param {number} amount - Amount to add
 */
export function addResourceToBuilding(building, resourceType, amount) {
  if (!building.inventory) {
    building.inventory = {};
  }
  
  if (!building.inventory[resourceType]) {
    building.inventory[resourceType] = 0;
  }
  
  building.inventory[resourceType] += amount;
  
  console.log(`📦 Added ${amount}x ${resourceType} to building`, {
    col: building.col,
    row: building.row,
    newAmount: building.inventory[resourceType]
  });
}

/**
 * Get building's current inventory
 * @param {Object} building - The building instance
 * @returns {Object} - Inventory object
 */
export function getBuildingInventory(building) {
  return building.inventory || {};
}

/**
 * Check if building needs specific resources
 * @param {Object} building - The building instance
 * @param {Object} buildingType - The building type definition
 * @returns {Array} - Array of needed resources with amounts
 */
export function getBuildingNeeds(building, buildingType) {
  if (!buildingType.consumes || buildingType.consumes.length === 0) {
    return [];
  }
  
  const needs = [];
  
  for (let requirement of buildingType.consumes) {
    const available = building.inventory[requirement.type] || 0;
    const needed = requirement.amount - available;
    
    if (needed > 0) {
      needs.push({
        type: requirement.type,
        amount: needed,
        total: requirement.amount,
        available: available
      });
    }
  }
  
  return needs;
}