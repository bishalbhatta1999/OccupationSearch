"use client"

import { useState, useEffect } from "react"
import { auth } from "../lib/firebase"
import { getPlanFromLocalStorage, getPlanFromFirestore } from "../utils/trial-status"

export type FeatureAccess = {
  visaCalculator: boolean
  prospects: boolean
  [key: string]: boolean
}

export function useSubscriptionFeatures() {
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>({
    visaCalculator: false,
    prospects: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  useEffect(() => {
    const checkFeatureAccess = async () => {
      if (!auth.currentUser) {
        setIsLoading(false)
        return
      }

      try {
        // First check localStorage for plan info
        const localPlan = getPlanFromLocalStorage(auth.currentUser.uid)

        // If not in localStorage, check Firestore
        const plan = localPlan || (await getPlanFromFirestore(auth.currentUser.uid))

        if (!plan) {
          setIsLoading(false)
          return
        }

        // Set current plan name for display purposes
        setCurrentPlan(plan.name)

        // Determine feature access based on plan
        const planName = plan.name.toLowerCase()

        setFeatureAccess({
          // Visa Calculator is available for Premium and Enterprise
          visaCalculator: planName === "premium" || planName === "enterprise",

          // Prospects is only available for Enterprise
          prospects: planName === "enterprise",
        })
      } catch (error) {
        console.error("Error checking feature access:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkFeatureAccess()
  }, [])

  return { featureAccess, isLoading, currentPlan }
}

