// This utility handles checking and managing trial status

/**
 * Get the selected plan from localStorage for a specific user
 * @param userId The user ID to get the plan for
 * @returns The plan object or null if not found
 */
export function getPlanFromLocalStorage(userId: string) {
  try {
    const planKey = `selectedPlan_${userId}`
    const storedPlan = localStorage.getItem(planKey)

    if (!storedPlan) {
      return null
    }

    return JSON.parse(storedPlan)
  } catch (error) {
    console.error("Error getting plan from localStorage:", error)
    return null
  }
}

/**
 * Check if a user's trial has expired
 * @param userId The user ID to check
 * @returns True if trial has expired, false otherwise
 */
export function isTrialExpired(userId: string): boolean {
  const plan = getPlanFromLocalStorage(userId)

  if (!plan) {
    return true // No plan means no active trial
  }

  // If it's not a trial period, it can't be expired
  if (!plan.trialPeriod) {
    return false
  }

  // Check if trial end date exists and is valid
  if (!plan.trialEndDate) {
    return true // No end date means expired
  }

  const trialEndDate = new Date(plan.trialEndDate)
  const now = new Date()

  // Return true if trial has expired
  return now > trialEndDate
}

/**
 * Get the number of days remaining in the trial
 * @param userId The user ID to check
 * @returns Number of days remaining or null if not in trial
 */
export function getTrialDaysRemaining(userId: string): number | null {
  const plan = getPlanFromLocalStorage(userId)

  if (!plan || !plan.trialPeriod) {
    return null
  }

  // If we have a trialEndDate from Stripe, use that
  if (plan.trialEndDate) {
    const trialEndDate = new Date(plan.trialEndDate)
    const now = new Date()

    // If trial has expired, return 0
    if (now > trialEndDate) {
      return 0
    }

    // Calculate days remaining
    const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysRemaining)
  }

  // If we don't have a specific end date but know it's a trial,
  // calculate based on the timestamp + 14 days
  if (plan.timestamp) {
    const trialEndDate = new Date(plan.timestamp + 14 * 24 * 60 * 60 * 1000)
    const now = new Date()

    // If trial has expired, return 0
    if (now > trialEndDate) {
      return 0
    }

    // Calculate days remaining
    const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysRemaining)
  }

  // If we can't determine days remaining but know it's a trial, return a default
  return 14
}

/**
 * Check if a user is currently in a trial period
 * @param userId The user ID to check
 * @returns True if in trial period, false otherwise
 */
export function isInTrialPeriod(userId: string): boolean {
  const plan = getPlanFromLocalStorage(userId)

  if (!plan || !plan.trialPeriod) {
    return false
  }

  return !isTrialExpired(userId)
}

/**
 * Get the theme colors based on subscription status
 * @param userId The user ID to check
 * @returns Object with theme color classes
 */
export function getThemeColors(userId: string) {
  const plan = getPlanFromLocalStorage(userId)

  // Default theme (no subscription)
  let theme = {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200",
    button: "bg-blue-600 hover:bg-blue-700",
    highlight: "bg-blue-100",
    highlightText: "text-blue-800",
  }

  if (plan) {
    if (plan.trialPeriod && !isTrialExpired(userId)) {
      // Trial theme (orange/amber)
      theme = {
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-200",
        button: "bg-amber-600 hover:bg-amber-700",
        highlight: "bg-amber-100",
        highlightText: "text-amber-800",
      }
    } else {
      // Paid subscription theme (green)
      theme = {
        bg: "bg-green-50",
        text: "text-green-800",
        border: "border-green-200",
        button: "bg-green-600 hover:bg-green-700",
        highlight: "bg-green-100",
        highlightText: "text-green-800",
      }
    }
  }

  return theme
}

