"use client"

import { useState, useEffect } from "react"
import { auth } from "../lib/firebase"
import { getPlanFromLocalStorage, isInTrialPeriod, getTrialDaysRemaining } from "../utils/trial-status"

// Define the return type for the hook
interface SubscriptionFeatures {
  featureAccess: {
    visaCalculator: boolean
    prospects: boolean
    documentChecklist: boolean
    widgetIntegration: boolean
    apiAccess: boolean
  }
  currentPlan: string
  isTrialPeriod: boolean
  trialDaysRemaining: number | null
}

export function useSubscriptionFeatures(): SubscriptionFeatures {
  const [currentPlan, setCurrentPlan] = useState<string>("Standard")
  const [isTrialPeriod, setIsTrialPeriod] = useState<boolean>(false)
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null)

  // Feature access state
  const [featureAccess, setFeatureAccess] = useState({
    visaCalculator: false,
    prospects: false,
    documentChecklist: true,
    widgetIntegration: false,
    apiAccess: false,
  })

  useEffect(() => {
    if (!auth.currentUser) return

    // Get user ID
    const userId = auth.currentUser.uid

    // Get plan from localStorage
    const plan = getPlanFromLocalStorage(userId)

    if (plan) {
      // Set current plan
      setCurrentPlan(plan.name)

      // Set trial status using utility functions
      const inTrial = isInTrialPeriod(userId)
      setIsTrialPeriod(inTrial)

      // Set trial days remaining
      const daysRemaining = getTrialDaysRemaining(userId)
      setTrialDaysRemaining(daysRemaining)

      // Set feature access based on plan name
      // During trial period, all features of the selected plan are available
      const planName = plan.name.toLowerCase()

      // Base features available to all plans
      const baseFeatures = {
        visaCalculator: false,
        prospects: false,
        documentChecklist: true,
        widgetIntegration: false,
        apiAccess: false,
      }

      // Premium plan features
      if (planName.includes("premium") || planName.includes("enterprise")) {
        baseFeatures.visaCalculator = true
        baseFeatures.widgetIntegration = true
      }

      // Enterprise plan features
      if (planName.includes("enterprise")) {
        baseFeatures.prospects = true
        baseFeatures.apiAccess = true
      }

      setFeatureAccess(baseFeatures)
    }
  }, [auth.currentUser?.uid])

  return { featureAccess, currentPlan, isTrialPeriod, trialDaysRemaining }
}

