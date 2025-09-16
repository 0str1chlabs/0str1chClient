/**
 * Tour utility functions for managing user onboarding experience
 */

export const TOUR_STORAGE_KEYS = {
  TOUR_COMPLETED: 'tour-completed',
  IS_NEW_USER: 'is-new-user',
  USER_FIRST_VISIT: 'user-first-visit',
  TOUR_DISMISSED: 'tour-dismissed',
} as const;

/**
 * Mark a user as new (should see tour on next visit)
 */
export const markUserAsNew = (): void => {
  localStorage.setItem(TOUR_STORAGE_KEYS.IS_NEW_USER, 'true');
  localStorage.setItem(TOUR_STORAGE_KEYS.USER_FIRST_VISIT, Date.now().toString());
};

/**
 * Mark that the user has completed the tour
 */
export const markTourCompleted = (): void => {
  localStorage.setItem(TOUR_STORAGE_KEYS.TOUR_COMPLETED, 'true');
  localStorage.removeItem(TOUR_STORAGE_KEYS.IS_NEW_USER);
};

/**
 * Check if user has completed the tour
 */
export const hasCompletedTour = (): boolean => {
  return localStorage.getItem(TOUR_STORAGE_KEYS.TOUR_COMPLETED) === 'true';
};

/**
 * Check if user is new (should see tour)
 */
export const isNewUser = (): boolean => {
  return localStorage.getItem(TOUR_STORAGE_KEYS.IS_NEW_USER) === 'true';
};

/**
 * Reset tour state (for testing or admin purposes)
 */
export const resetTourState = (): void => {
  localStorage.removeItem(TOUR_STORAGE_KEYS.TOUR_COMPLETED);
  localStorage.removeItem(TOUR_STORAGE_KEYS.IS_NEW_USER);
  localStorage.removeItem(TOUR_STORAGE_KEYS.USER_FIRST_VISIT);
  localStorage.removeItem(TOUR_STORAGE_KEYS.TOUR_DISMISSED);
};

/**
 * Mark that user dismissed the tour (but didn't complete it)
 */
export const markTourDismissed = (): void => {
  localStorage.setItem(TOUR_STORAGE_KEYS.TOUR_DISMISSED, 'true');
};

/**
 * Check if user dismissed the tour
 */
export const hasDismissedTour = (): boolean => {
  return localStorage.getItem(TOUR_STORAGE_KEYS.TOUR_DISMISSED) === 'true';
};

/**
 * Get tour statistics for analytics
 */
export const getTourStats = () => {
  const firstVisit = localStorage.getItem(TOUR_STORAGE_KEYS.USER_FIRST_VISIT);
  const hasCompleted = hasCompletedTour();
  const hasDismissed = hasDismissedTour();
  const isNew = isNewUser();

  return {
    firstVisit: firstVisit ? new Date(parseInt(firstVisit)) : null,
    hasCompleted,
    hasDismissed,
    isNew,
    shouldShowTour: isNew && !hasCompleted && !hasDismissed,
  };
};

/**
 * Initialize tour state for a new user session
 * Call this when a user first logs in or visits the app
 */
export const initializeTourForNewUser = (): void => {
  // Only mark as new user if they haven't been here before
  if (!hasCompletedTour() && !hasDismissedTour()) {
    markUserAsNew();
  }
};

/**
 * Check if tour should be shown automatically
 */
export const shouldShowTourAutomatically = (): boolean => {
  const stats = getTourStats();
  return stats.shouldShowTour;
};
