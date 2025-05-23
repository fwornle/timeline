/**
 * Centralized animation manager for timeline cards
 * Ensures only one card can be in hover animation state at a time
 * Implements a co-routine-like system with cancellation
 */

interface AnimationJob {
  cardId: string;
  startTime: number;
  duration: number;
  isHover: boolean; // true for hover, false for unhover
  cancelled: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}

class CardAnimationManager {
  private activeJobs = new Map<string, AnimationJob>();
  private currentHoveredCard: string | null = null;
  private lastHoverTime = 0;
  private hoverDebounceTime = 50; // ms - minimum time between hover changes
  private hoverChangeCallbacks = new Set<(cardId: string | null) => void>();

  /**
   * Start a new hover animation job
   * Automatically cancels any existing hover jobs
   */
  startHoverAnimation(cardId: string, duration: number = 600): AnimationJob | null {
    const now = performance.now();

    // Debounce hover changes to prevent rapid-fire events
    if (now - this.lastHoverTime < this.hoverDebounceTime) {
      return null;
    }

    // If this card is already hovered, do nothing
    if (this.currentHoveredCard === cardId) {
      return null;
    }

    this.lastHoverTime = now;

    // Cancel all existing hover animations
    this.cancelAllHoverAnimations();

    // Cancel any existing animation for this card
    this.cancelAnimation(cardId);

    // Update current hovered card
    this.currentHoveredCard = cardId;

    // Notify callbacks about hover change
    this.notifyHoverChange(cardId);

    // Create new hover job
    const job: AnimationJob = {
      cardId,
      startTime: now,
      duration,
      isHover: true,
      cancelled: false,
    };

    this.activeJobs.set(cardId, job);
    return job;
  }

  /**
   * Start a new unhover animation job
   */
  startUnhoverAnimation(cardId: string, duration: number = 300): AnimationJob {
    // Cancel any existing animation for this card
    this.cancelAnimation(cardId);

    // Clear current hovered card if it's this card
    if (this.currentHoveredCard === cardId) {
      this.currentHoveredCard = null;
      this.notifyHoverChange(null);
    }

    // Create new unhover job
    const job: AnimationJob = {
      cardId,
      startTime: performance.now(),
      duration,
      isHover: false,
      cancelled: false,
    };

    this.activeJobs.set(cardId, job);
    return job;
  }

  /**
   * Cancel animation for a specific card
   */
  cancelAnimation(cardId: string): void {
    const job = this.activeJobs.get(cardId);
    if (job && !job.cancelled) {
      job.cancelled = true;
      if (job.onCancel) {
        job.onCancel();
      }
      this.activeJobs.delete(cardId);
    }
  }

  /**
   * Cancel all hover animations (but not unhover animations)
   */
  cancelAllHoverAnimations(): void {
    // Clear current hovered card
    this.currentHoveredCard = null;
    this.notifyHoverChange(null);

    for (const [cardId, job] of this.activeJobs.entries()) {
      if (job.isHover && !job.cancelled) {
        job.cancelled = true;
        if (job.onCancel) {
          job.onCancel();
        }
        this.activeJobs.delete(cardId);
      }
    }
  }

  /**
   * Cancel all animations
   */
  cancelAllAnimations(): void {
    for (const [cardId, job] of this.activeJobs.entries()) {
      if (!job.cancelled) {
        job.cancelled = true;
        if (job.onCancel) {
          job.onCancel();
        }
      }
    }
    this.activeJobs.clear();
    this.currentHoveredCard = null;
  }

  /**
   * Get the current animation job for a card
   */
  getAnimation(cardId: string): AnimationJob | null {
    const job = this.activeJobs.get(cardId);
    return job && !job.cancelled ? job : null;
  }

  /**
   * Check if a card is currently being animated
   */
  isAnimating(cardId: string): boolean {
    const job = this.activeJobs.get(cardId);
    return job ? !job.cancelled : false;
  }

  /**
   * Get the currently hovered card
   */
  getCurrentHoveredCard(): string | null {
    return this.currentHoveredCard;
  }

  /**
   * Check if a card should be in hover state
   */
  shouldBeHovered(cardId: string): boolean {
    return this.currentHoveredCard === cardId;
  }

  /**
   * Complete an animation job
   */
  completeAnimation(cardId: string): void {
    const job = this.activeJobs.get(cardId);
    if (job && !job.cancelled) {
      if (job.onComplete) {
        job.onComplete();
      }
      this.activeJobs.delete(cardId);
    }
  }

  /**
   * Get animation progress (0-1) for a card
   */
  getAnimationProgress(cardId: string): number {
    const job = this.activeJobs.get(cardId);
    if (!job || job.cancelled) {
      return 1; // Animation complete/cancelled
    }

    const elapsed = performance.now() - job.startTime;
    return Math.min(elapsed / job.duration, 1);
  }

  /**
   * Check if animation is complete
   */
  isAnimationComplete(cardId: string): boolean {
    return this.getAnimationProgress(cardId) >= 1;
  }

  /**
   * Cleanup completed animations
   */
  cleanup(): void {
    for (const [cardId, job] of this.activeJobs.entries()) {
      if (job.cancelled || this.isAnimationComplete(cardId)) {
        this.activeJobs.delete(cardId);
      }
    }
  }

  /**
   * Add a callback to be notified when hover state changes
   */
  addHoverChangeCallback(callback: (cardId: string | null) => void): void {
    this.hoverChangeCallbacks.add(callback);
  }

  /**
   * Remove a hover change callback
   */
  removeHoverChangeCallback(callback: (cardId: string | null) => void): void {
    this.hoverChangeCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks about hover change
   */
  private notifyHoverChange(cardId: string | null): void {
    this.hoverChangeCallbacks.forEach(callback => {
      try {
        callback(cardId);
      } catch (error) {
        console.error('Error in hover change callback:', error);
      }
    });
  }
}

// Global singleton instance
export const cardAnimationManager = new CardAnimationManager();

// Export types for use in components
export type { AnimationJob };
