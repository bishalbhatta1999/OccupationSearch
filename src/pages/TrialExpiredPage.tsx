"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db, firebaseConfig } from "../lib/firebase"
import { Check, Loader2,Clock } from "lucide-react"
import { initializeApp } from "firebase/app"
import { getCheckoutUrl } from "../components/admin/stripe-payments"

const TrialExpiredPage: React.FC = () => {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month")
  const [isLoading, setIsLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const app = initializeApp(firebaseConfig)

  // Check if user is logged in
  useEffect(() => {
    const checkUserAuth = async () => {
      if (!auth.currentUser) {
        // If not logged in, redirect to login
        navigate("/")
        return
      }
      setIsLoading(false)
    }

    checkUserAuth()
  }, [navigate])

  const plans = [
    {
      id: "standard",
      name: "STANDARD",
      price: 29,
      description: "Perfect for individuals and small businesses",
      features: [
        "Unlimited Occupation Searches",
        "Unlimited Saved Searches",
        "Email Newsletters",
        "White Labeling",
        "Report Downloads",
        "Email Reports",
      ],
    },
    {
      id: "premium",
      name: "PREMIUM",
      price: 79,
      description: "Ideal for growing migration agencies",
      features: [
        "All STANDARD Features",
        "Document Checklist",
        "Widget Integration",
        "Widget Customization",
        "Lead Generation",
        "Lead Notifications",
        "Lead Exports",
        "Personalized Branding",
        "Custom Alerts",
        "Data Exports",
      ],
      recommended: true,
    },
    {
      id: "enterprise",
      name: "ENTERPRISE",
      price: 99,
      description: "For large organizations with advanced needs",
      features: [
        "All PREMIUM Features",
        "Webhook Integration",
        "Banner Integration",
        "Email Signature",
        "Batch Processing",
        "API Access",
        "Priority Support",
        "Custom Branding",
        "Unlimited Team Members",
        "Advanced Analytics",
      ],
    },
  ]

  // Helper function to calculate adjusted price for yearly billing
  const getAdjustedPrice = (basePrice: number) => {
    return billingCycle === "year" ? (basePrice * 10).toFixed(2) : basePrice.toFixed(2)
  }

  // Price IDs for Stripe checkout
  const priceIdsmonth = {
    standard: " price_1R7vXrAYoTzSaNKS3KCv8Fzu",
    premium: "price_1R7vXtAYoTzSaNKSV13x5MLp",
    enterprise: "price_1R7vXuAYoTzSaNKShilrrBbP",
  }

  const priceIdsyear = {
    standard: " price_1R7vXsAYoTzSaNKSawQiO7WO",
    premium: "price_1R7vXtAYoTzSaNKS2nZNjCD4",
    enterprise: "price_1R7vXuAYoTzSaNKSIKDFE15j",
  }

  // Helper function to get the user-specific localStorage key
  const getUserPlanKey = (userId: string) => {
    return `selectedPlan_${userId}`
  }

  const upgradePayment = async (planId: string, planName: string, planPrice: number) => {
    if (!auth.currentUser) {
      setError("Please sign in to select a plan")
      return
    }

    setProcessingPlan(planId)
    setError(null)

    try {
      const userId = auth.currentUser.uid
      let priceId = ""

      // Get the appropriate price ID based on billing cycle and plan
      if (billingCycle === "month") {
        priceId = priceIdsmonth[planId as keyof typeof priceIdsmonth]
      } else {
        priceId = priceIdsyear[planId as keyof typeof priceIdsyear]
      }

      if (!priceId) {
        throw new Error(`No price ID found for plan: ${planName}`)
      }

      // Save selected plan to localStorage
      const newPlan = {
        name: planName,
        price: billingCycle === "year" ? planPrice * 10 : planPrice,
        billingCycle: billingCycle,
        userId: userId,
        timestamp: Date.now(),
        trialPeriod: false,
      }

      localStorage.setItem(getUserPlanKey(userId), JSON.stringify(newPlan))

      // Also save to Firestore for persistence
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        await updateDoc(userRef, {
          subscription: {
            plan: planName,
            price: billingCycle === "year" ? planPrice * 10 : planPrice,
            billingCycle: billingCycle,
            trialPeriod: false,
            status: "active",
            updatedAt: new Date().toISOString(),
          },
        })
      }

      // Get checkout URL from Stripe
      const checkoutUrl = await getCheckoutUrl(app, priceId)
      if (!checkoutUrl) {
        throw new Error("Received empty checkout URL")
      }

      // Redirect to Stripe checkout
      window.location.href = checkoutUrl
    } catch (error) {
      console.error("Error selecting plan:", error)
      setError("Failed to process plan selection. Please try again.")
      setProcessingPlan(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen  py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-2 bg-amber-100 rounded-full mb-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Your Trial Has Expired</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Please select a plan to continue using all features of MyOccupation.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-12 inline-flex items-center p-1 bg-white rounded-xl shadow-sm">
            <button
              onClick={() => setBillingCycle("month")}
              className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                billingCycle === "month" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Billed Monthly
            </button>
            <button
              onClick={() => setBillingCycle("year")}
              className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                billingCycle === "year" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Billed Yearly
              <span className="ml-2 text-sm text-green-600 font-medium">2 Months FREE</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border ${
                plan.recommended ? "border-blue-200 shadow-xl scale-105 z-10" : "border-gray-200 shadow-lg"
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-5 left-0 right-0 mx-auto w-fit px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-full">
                  Recommended
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold">A${getAdjustedPrice(plan.price)}</span>
                    <span className="text-gray-500">/{billingCycle === "month" ? "mo" : "yr"}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                </div>

                {/* Features List */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-900">Key Features</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  className="mt-8 w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70"
                  onClick={() => upgradePayment(plan.id, plan.name, plan.price)}
                  disabled={processingPlan !== null}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    "Subscribe Now"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TrialExpiredPage

