/**
 * Utility functions for Three.js timeline cards
 */

// Global state for card hover management
export const globalHoveredCardId = { current: null as string | null };

// Global handlers for card interactions
export const globalClickHandlers = {
  // Track all active TimelineCard instances
  activeCards: new Set<string>(),
  // Store all the clear hover callbacks (one per card)
  clearHoverCallbacks: new Set<(id: string | null) => void>(),
  // Flag if we've added the document click listener
  documentListenerAdded: false,
  // Function to check if a click is outside all cards
  handleDocumentClick: (_: MouseEvent) => {
    // Since we can't use className in Three.js, we need a different approach
    if (globalHoveredCardId.current) {
      // Find and clear the hover callback for the currently hovered card
      for (const callback of globalClickHandlers.clearHoverCallbacks) {
        callback(null); // This will call onHover(null) for the active cards
      }
      globalHoveredCardId.current = null;
    }
  },
  // Setup the document listener if not already done
  setupDocumentListener: () => {
    if (!globalClickHandlers.documentListenerAdded) {
      document.addEventListener('click', globalClickHandlers.handleDocumentClick);
      document.addEventListener('pointerdown', globalClickHandlers.handleDocumentClick);
      globalClickHandlers.documentListenerAdded = true;
    }
  },
  // Cleanup the document listener when no cards are active
  cleanupDocumentListener: () => {
    if (globalClickHandlers.activeCards.size === 0 && globalClickHandlers.documentListenerAdded) {
      document.removeEventListener('click', globalClickHandlers.handleDocumentClick);
      document.removeEventListener('pointerdown', globalClickHandlers.handleDocumentClick);
      globalClickHandlers.documentListenerAdded = false;
    }
  }
};

/**
 * Exportable function to clear all card hovers (for use in TimelineScene)
 */
export function clearAllCardHovers() {
  if (globalHoveredCardId.current) {
    for (const callback of globalClickHandlers.clearHoverCallbacks) {
      callback(null);
    }
    globalHoveredCardId.current = null;
  }
}

/**
 * Add a hover clear callback to the global handlers
 */
export function addHoverClearCallback(callback: (id: string | null) => void) {
  globalClickHandlers.clearHoverCallbacks.add(callback);
}

/**
 * Remove a hover clear callback from the global handlers
 */
export function removeHoverClearCallback(callback: (id: string | null) => void) {
  globalClickHandlers.clearHoverCallbacks.delete(callback);
}

/**
 * Initialize document click listener for clearing card hovers
 */
export function initializeDocumentClickListener() {
  if (!globalClickHandlers.documentListenerAdded) {
    document.addEventListener('click', globalClickHandlers.handleDocumentClick);
    globalClickHandlers.documentListenerAdded = true;
  }
}

/**
 * Cleanup document click listener
 */
export function cleanupDocumentClickListener() {
  if (globalClickHandlers.documentListenerAdded) {
    document.removeEventListener('click', globalClickHandlers.handleDocumentClick);
    globalClickHandlers.documentListenerAdded = false;
  }
}
