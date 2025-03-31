import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "../lib/firebase"

// Interface for plan data
export interface PlanData {
  name: string
  price: number
  billingCycle: "month" | "year"
  userId: string
  timestamp: number
  trialPeriod: boolean
  trialStartDate?: string
  trialEndDate?: string
}

// Get the user-specific localStorage key
export const getUserPlanKey = (userId: string) => {
  return `selectedPlan_${userId}`
}

// Check if trial has expired
export const isTrialExpired = (plan: PlanData | null): boolean => {
  if (!plan) return true

  // If it's not a trial period, no need to check expiration
  if (!plan.trialPeriod) return false

  // Check if trial end date exists and is valid
  if (!plan.trialEndDate) return true

  const trialEndDate = new Date(plan.trialEndDate)
  const now = new Date()

  // Return true if trial has expired
  return now > trialEndDate
}

// Get days remaining in trial
export const getTrialDaysRemaining = (plan: PlanData | null): number => {
  if (!plan || !plan.trialPeriod || !plan.trialEndDate) return 0

  const trialEndDate = new Date(plan.trialEndDate)
  const now = new Date()

  // Calculate days remaining
  return Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

// Get plan data from localStorage
export const getPlanFromLocalStorage = (userId: string): PlanData | null => {
  const planKey = getUserPlanKey(userId)
  const storedPlan = localStorage.getItem(planKey)

  if (!storedPlan) return null

  try {
    return JSON.parse(storedPlan) as PlanData
  } catch (error) {
    console.error("Error parsing stored plan:", error)
    return null
  }
}

// Get plan data from Firestore
export const getPlanFromFirestore = async (userId: string): Promise<PlanData | null> => {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists() || !userDoc.data().subscription) return null

    const subscription = userDoc.data().subscription

    return {
      name: subscription.plan || "STANDARD",
      price: subscription.price || 29,
      billingCycle: subscription.billingCycle || "month",
      userId: userId,
      timestamp: subscription.updatedAt ? new Date(subscription.updatedAt).getTime() : Date.now(),
      trialPeriod: subscription.trialPeriod || false,
      trialStartDate: subscription.trialStartDate || undefined,
      trialEndDate: subscription.trialEndDate || undefined,
    }
  } catch (error) {
    console.error("Error fetching plan from Firestore:", error)
    return null
  }
}

// Update plan in both localStorage and Firestore
export const updatePlanStatus = async (userId: string, planUpdates: Partial<PlanData>): Promise<boolean> => {
  try {
    // Update in localStorage
    const currentPlan = getPlanFromLocalStorage(userId)
    if (currentPlan) {
      const updatedPlan = { ...currentPlan, ...planUpdates }
      localStorage.setItem(getUserPlanKey(userId), JSON.stringify(updatedPlan))
    }

    // Update in Firestore
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const currentSubscription = userDoc.data().subscription || {}

      // Map plan data to subscription format
      const subscriptionUpdates: any = {}
      if (planUpdates.name) subscriptionUpdates.plan = planUpdates.name
      if (planUpdates.price) subscriptionUpdates.price = planUpdates.price
      if (planUpdates.billingCycle) subscriptionUpdates.billingCycle = planUpdates.billingCycle
      if ("trialPeriod" in planUpdates) subscriptionUpdates.trialPeriod = planUpdates.trialPeriod
      if (planUpdates.trialStartDate) subscriptionUpdates.trialStartDate = planUpdates.trialStartDate
      if (planUpdates.trialEndDate) subscriptionUpdates.trialEndDate = planUpdates.trialEndDate

      subscriptionUpdates.updatedAt = new Date().toISOString()

      await updateDoc(userRef, {
        subscription: { ...currentSubscription, ...subscriptionUpdates },
      })
    }

    return true
  } catch (error) {
    console.error("Error updating plan status:", error)
    return false
  }
}

