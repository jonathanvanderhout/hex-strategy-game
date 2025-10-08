// ui.js
import { BUILDING_TYPES } from './buildingTypes.js';

export class UIManager {
  constructor(gameState, callbacks) {
    this.gameState = gameState;
    this.callbacks = callbacks;
    this.mode = 'place';
    this.selectedBuildingType = 'farm';
    
    this.createBuildingPaletteHTML();
    this.init();
  }
  
  createBuildingPaletteHTML() {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) {
      console.error('Controls div not found!');
      return;
    }
    
    const paletteHTML = `
      <div id="building-palette">
        <div style="font-size: 11px; margin-bottom: 5px; color: #aaa;">
          Select Building:
        </div>
        <div id="building-options"></div>
      </div>
    `;
    
    controlsDiv.insertAdjacentHTML('beforeend', paletteHTML);
    
    if (!document.getElementById('ui-styles')) {
      const style = document.createElement('style');
      style.id = 'ui-styles';
      style.textContent = `
        #building-palette {
          display: none;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #666;
        }
        #building-palette.visible {
          display: block;
        }
        .building-option {
          background: #333;
          color: white;
          border: 2px solid #555;
          padding: 6px 10px;
          margin: 3px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          display: inline-block;
        }
        .building-option.selected {
          background: #4a9eff;
          border-color: #4a9eff;
        }
        .building-option.locked {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .building-option:hover:not(.locked) {
          background: #444;
        }
        .building-option.selected:hover {
          background: #5aaaff;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  init() {
    this.setupModeButtons();
    this.setupBuildingPalette();
  }
  
  setupModeButtons() {
    document.querySelectorAll('.mode-button').forEach(button => {
      button.addEventListener('click', () => {
        this.setMode(button.dataset.mode);
      });
    });
  }
  
  setMode(mode) {
    this.mode = mode;
    
    // Update button states
    document.querySelectorAll('.mode-button').forEach(b => b.classList.remove('active'));
    const activeButton = document.querySelector(`[data-mode="${mode}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
    
    // Show/hide building palette
    const palette = document.getElementById('building-palette');
    if (this.mode === 'building') {
      palette.classList.add('visible');
      this.updateBuildingPalette();
    } else {
      palette.classList.remove('visible');
    }
    
    // Notify callback
    if (this.callbacks.onModeChange) {
      this.callbacks.onModeChange(this.mode);
    }
  }
  
  setupBuildingPalette() {
    this.updateBuildingPalette();
  }
  
  updateBuildingPalette() {
    const container = document.getElementById('building-options');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.values(BUILDING_TYPES).forEach(buildingType => {
      const button = document.createElement('button');
      button.className = 'building-option';
      button.dataset.buildingType = buildingType.id;
      button.textContent = `${buildingType.emoji} ${buildingType.name}`;
      
      if (!buildingType.unlocked) {
        button.classList.add('locked');
        button.title = 'Locked - unlock by gathering resources';
      }
      
      if (buildingType.id === this.selectedBuildingType) {
        button.classList.add('selected');
      }
      
      button.addEventListener('click', () => {
        if (buildingType.unlocked) {
          this.selectBuilding(buildingType.id);
        }
      });
      
      container.appendChild(button);
    });
  }
  
  selectBuilding(buildingTypeId) {
    this.selectedBuildingType = buildingTypeId;
    this.updateBuildingPalette();
    
    if (this.callbacks.onBuildingSelect) {
      this.callbacks.onBuildingSelect(this.selectedBuildingType);
    }
  }
  
  getMode() {
    return this.mode;
  }
  
  getSelectedBuilding() {
    return this.selectedBuildingType;
  }
  
  refreshBuildingPalette() {
    if (this.mode === 'building') {
      this.updateBuildingPalette();
    }
  }
}