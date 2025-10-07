// savegame.js - Save/Load game state management

export class SaveGameManager {
  constructor(gameStateRef) {
    this.gameState = gameStateRef; // Reference to the centralized game state
    this.storageKey = 'hexagon_train_saves';
    this.modal = null;
    
    // Wait for DOM to be ready before initializing modal
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initModal());
    } else {
      this.initModal();
    }
  }

  // Initialize the save/load modal
  initModal() {
    // Create modal HTML
    const modalHTML = `
      <div id="saveGameModal" class="save-modal" style="display: none;">
        <div class="save-modal-overlay"></div>
        <div class="save-modal-content">
          <div class="save-modal-header">
            <h2>Save / Load Game</h2>
            <button class="save-modal-close">&times;</button>
          </div>
          
          <div class="save-modal-body">
            <div class="save-section">
              <h3>💾 Save Current Game</h3>
              <div class="save-input-group">
                <input type="text" id="saveName" placeholder="Enter save name..." maxlength="50">
                <button id="saveButton" class="save-action-btn save-btn">Save</button>
              </div>
              <div id="saveMessage" class="save-message"></div>
            </div>

            <div class="load-section">
              <h3>📂 Load Saved Game</h3>
              <div id="savesList" class="saves-list">
                <p class="no-saves">No saved games yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create modal styles
    const styleHTML = `
      <style>
        .save-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          font-family: Arial, sans-serif;
        }

        .save-modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }

        .save-modal-content {
          position: relative;
          max-width: 600px;
          max-height: 80vh;
          margin: 5% auto;
          background: #2a2a3e;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .save-modal-header {
          background: #1a1a2e;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #ffcc00;
        }

        .save-modal-header h2 {
          margin: 0;
          color: #ffcc00;
          font-size: 24px;
        }

        .save-modal-close {
          background: none;
          border: none;
          color: #fff;
          font-size: 32px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .save-modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .save-modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .save-section, .load-section {
          margin-bottom: 30px;
        }

        .save-section h3, .load-section h3 {
          color: #fff;
          margin: 0 0 15px 0;
          font-size: 18px;
        }

        .save-input-group {
          display: flex;
          gap: 10px;
        }

        .save-input-group input {
          flex: 1;
          padding: 12px;
          background: #1a1a2e;
          border: 2px solid #444;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .save-input-group input:focus {
          border-color: #ffcc00;
        }

        .save-action-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .save-btn {
          background: #ffcc00;
          color: #000;
        }

        .save-btn:hover {
          background: #ffd700;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(255, 204, 0, 0.3);
        }

        .save-message {
          margin-top: 10px;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          display: none;
        }

        .save-message.success {
          background: rgba(75, 181, 67, 0.2);
          border: 1px solid #4bb543;
          color: #7bc950;
          display: block;
        }

        .save-message.error {
          background: rgba(220, 53, 69, 0.2);
          border: 1px solid #dc3545;
          color: #ff6b6b;
          display: block;
        }

        .saves-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .no-saves {
          color: #888;
          text-align: center;
          padding: 20px;
          font-style: italic;
        }

        .save-item {
          background: #1a1a2e;
          border: 2px solid #444;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }

        .save-item:hover {
          border-color: #ffcc00;
          transform: translateX(5px);
        }

        .save-item-info {
          flex: 1;
        }

        .save-item-name {
          color: #fff;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .save-item-details {
          color: #888;
          font-size: 12px;
        }

        .save-item-actions {
          display: flex;
          gap: 8px;
        }

        .load-btn {
          background: #4bb543;
          color: #fff;
        }

        .load-btn:hover {
          background: #5bc952;
        }

        .delete-btn {
          background: #dc3545;
          color: #fff;
        }

        .delete-btn:hover {
          background: #e63946;
        }

        .save-item-actions button {
          padding: 8px 16px;
          font-size: 13px;
        }

        /* Scrollbar styling */
        .saves-list::-webkit-scrollbar {
          width: 8px;
        }

        .saves-list::-webkit-scrollbar-track {
          background: #1a1a2e;
          border-radius: 4px;
        }

        .saves-list::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
        }

        .saves-list::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      </style>
    `;

    // Inject styles and modal into document
    document.head.insertAdjacentHTML('beforeend', styleHTML);
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    this.modal = document.getElementById('saveGameModal');
    this.setupEventListeners();
    
    console.log('💾 SaveGameManager initialized');
  }

  // Setup event listeners for modal
  setupEventListeners() {
    const closeBtn = this.modal.querySelector('.save-modal-close');
    const overlay = this.modal.querySelector('.save-modal-overlay');
    const saveButton = document.getElementById('saveButton');
    const saveNameInput = document.getElementById('saveName');

    closeBtn.addEventListener('click', () => this.hideModal());
    overlay.addEventListener('click', () => this.hideModal());

    saveButton.addEventListener('click', () => {
      console.log('Save button clicked');
      this.saveGame();
    });
    
    saveNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.saveGame();
    });
  }

  // Show the modal
  show() {
    console.log('Opening save/load modal');
    this.modal.style.display = 'block';
    this.refreshSavesList();
    document.getElementById('saveName').value = '';
    this.clearMessage();
  }

  // Hide the modal
  hideModal() {
    this.modal.style.display = 'none';
  }

  // Get all saves from localStorage
  getAllSaves() {
    try {
      const saves = localStorage.getItem(this.storageKey);
      return saves ? JSON.parse(saves) : {};
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return {};
    }
  }

  // Save all saves to localStorage
  saveAllSaves(saves) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(saves));
      console.log('Saves stored to localStorage:', Object.keys(saves).length, 'total saves');
    } catch (e) {
      console.error('Error writing to localStorage:', e);
      this.showMessage('Error saving to storage', 'error');
    }
  }

  // Capture current game state
  captureGameState() {
    console.log('Capturing game state...', this.gameState);
    return {
      placed_tracks: JSON.parse(JSON.stringify(this.gameState.placed_tracks)),
      placed_buildings: JSON.parse(JSON.stringify(this.gameState.placed_buildings)),
      trains: JSON.parse(JSON.stringify(this.gameState.trains)),
      nextTrainId: this.gameState.nextTrainId,
      camera: { ...this.gameState.camera },
      terrainConfig: { ...this.gameState.terrainConfig },
      trackCount: Object.keys(this.gameState.placed_tracks).length,
      trainCount: this.gameState.trains.length,
      buildingCount: Object.keys(this.gameState.placed_buildings).length
    };
  }

  // Save game with given name
  saveGame() {
    const nameInput = document.getElementById('saveName');
    const saveName = nameInput.value.trim();

    console.log('Attempting to save game:', saveName);

    if (!saveName) {
      this.showMessage('Please enter a save name', 'error');
      return;
    }

    const gameState = this.captureGameState();
    if (!gameState) {
      this.showMessage('Failed to capture game state', 'error');
      return;
    }

    const saves = this.getAllSaves();
    const saveId = Date.now().toString();

    saves[saveId] = {
      id: saveId,
      name: saveName,
      timestamp: Date.now(),
      state: gameState
    };

    this.saveAllSaves(saves);
    this.showMessage(`Game saved as "${saveName}"!`, 'success');
    this.refreshSavesList();
    nameInput.value = '';

    console.log('✅ Game saved:', saveName, 'Total saves:', Object.keys(saves).length);
  }

  // Load game by ID
  loadGame(saveId) {
    const saves = this.getAllSaves();
    const save = saves[saveId];

    if (!save) {
      this.showMessage('Save not found', 'error');
      return;
    }

    // Dispatch custom event with save data
    const event = new CustomEvent('loadGame', {
      detail: save.state
    });
    window.dispatchEvent(event);

    this.showMessage(`Loaded "${save.name}"!`, 'success');
    
    // Close modal after short delay
    setTimeout(() => this.hideModal(), 1000);

    console.log('✅ Game loaded:', save.name);
  }

  // Delete save by ID
  deleteSave(saveId) {
    const saves = this.getAllSaves();
    const saveName = saves[saveId]?.name || 'Unknown';

    if (confirm(`Delete save "${saveName}"?`)) {
      delete saves[saveId];
      this.saveAllSaves(saves);
      this.refreshSavesList();
      this.showMessage(`Deleted "${saveName}"`, 'success');
      console.log('🗑️ Save deleted:', saveName);
    }
  }

  // Refresh the saves list display
  refreshSavesList() {
    const savesList = document.getElementById('savesList');
    const saves = this.getAllSaves();
    const saveEntries = Object.values(saves).sort((a, b) => b.timestamp - a.timestamp);

    console.log('Refreshing saves list. Found', saveEntries.length, 'saves');

    if (saveEntries.length === 0) {
      savesList.innerHTML = '<p class="no-saves">No saved games yet</p>';
      return;
    }

    savesList.innerHTML = saveEntries.map(save => {
      const date = new Date(save.timestamp);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      const stats = save.state;
      const details = [
        `${stats.trackCount || 0} tracks`,
        `${stats.trainCount || 0} trains`,
        `${stats.buildingCount || 0} buildings`
      ].join(' • ');

      return `
        <div class="save-item">
          <div class="save-item-info">
            <div class="save-item-name">${this.escapeHtml(save.name)}</div>
            <div class="save-item-details">${dateStr} • ${details}</div>
          </div>
          <div class="save-item-actions">
            <button class="save-action-btn load-btn" onclick="window.saveGameManager.loadGame('${save.id}')">
              Load
            </button>
            <button class="save-action-btn delete-btn" onclick="window.saveGameManager.deleteSave('${save.id}')">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Show message
  showMessage(text, type) {
    const messageEl = document.getElementById('saveMessage');
    messageEl.textContent = text;
    messageEl.className = `save-message ${type}`;
  }

  // Clear message
  clearMessage() {
    const messageEl = document.getElementById('saveMessage');
    messageEl.className = 'save-message';
    messageEl.textContent = '';
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export helper to create save/load button
export function createSaveLoadButton() {
  const button = document.createElement('button');
  button.className = 'mode-button';
  button.innerHTML = '💾 Save/Load';
  button.style.cssText = `
    position: absolute;
    bottom: 10px;
    right: 10px;
    background: #444;
    color: white;
    border: 2px solid #666;
    padding: 12px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    z-index: 1000;
  `;
  
  button.addEventListener('mouseover', () => {
    button.style.background = '#555';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.background = '#444';
  });

  return button;
}