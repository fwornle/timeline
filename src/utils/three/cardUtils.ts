/**
 * Utility functions for Three.js timeline cards
 */

// Global state for card hover management
export const globalHoveredCardId = { current: null as string | null };

// Global state for tracking open/animating cards
export const globalOpenCards = {
  // Track cards that are currently open (fully opened after animation)
  openCards: new Set<string>(),
  // Track cards that are currently animating (opening or closing)
  animatingCards: new Set<string>(),
  // Track the currently hovered card (may be different from open cards)
  hoveredCard: null as string | null,
};

// Global handlers for card interactions
export const globalClickHandlers = {
  // Track all active TimelineCard instances
  activeCards: new Set<string>(),
  // Store all the clear hover callbacks (one per card)
  clearHoverCallbacks: new Set<(id: string | null) => void>(),
  // Store all the force close callbacks (for closing open cards)
  forceCloseCallbacks: new Set<(id: string) => void>(),
  // Flag if we've added the document click listener
  documentListenerAdded: false,
  // Function to check if a click is outside all cards
  handleDocumentClick: () => {
    // Close any currently hovered card
    if (globalHoveredCardId.current) {
      for (const callback of globalClickHandlers.clearHoverCallbacks) {
        callback(null); // This will call onHover(null) for the active cards
      }
      globalHoveredCardId.current = null;
    }

    // Close any open cards that might be stuck open
    if (globalOpenCards.openCards.size > 0) {
      console.log('Closing open cards:', Array.from(globalOpenCards.openCards));
      for (const cardId of globalOpenCards.openCards) {
        for (const callback of globalClickHandlers.forceCloseCallbacks) {
          callback(cardId);
        }
      }
      globalOpenCards.openCards.clear();
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
 * Add a force close callback to the global handlers
 */
export function addForceCloseCallback(callback: (id: string) => void) {
  globalClickHandlers.forceCloseCallbacks.add(callback);
}

/**
 * Remove a force close callback from the global handlers
 */
export function removeForceCloseCallback(callback: (id: string) => void) {
  globalClickHandlers.forceCloseCallbacks.delete(callback);
}

/**
 * Register a card as open (fully opened after animation)
 */
export function registerOpenCard(cardId: string) {
  globalOpenCards.openCards.add(cardId);
  globalOpenCards.hoveredCard = cardId;
  // Card registered as open
}

/**
 * Unregister a card as open (fully closed after animation)
 */
export function unregisterOpenCard(cardId: string) {
  globalOpenCards.openCards.delete(cardId);
  if (globalOpenCards.hoveredCard === cardId) {
    globalOpenCards.hoveredCard = null;
  }
  // Card unregistered as open
}

/**
 * Register a card as animating (opening or closing)
 */
export function registerAnimatingCard(cardId: string) {
  globalOpenCards.animatingCards.add(cardId);
}

/**
 * Unregister a card as animating (animation complete)
 */
export function unregisterAnimatingCard(cardId: string) {
  globalOpenCards.animatingCards.delete(cardId);
}

/**
 * Check if any cards are currently open
 */
export function hasOpenCards(): boolean {
  return globalOpenCards.openCards.size > 0;
}

/**
 * Get all currently open card IDs
 */
export function getOpenCardIds(): string[] {
  return Array.from(globalOpenCards.openCards);
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
