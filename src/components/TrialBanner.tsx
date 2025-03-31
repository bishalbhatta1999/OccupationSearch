"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, AlertCircle, X } from "lucide-react"
import { auth } from "../lib/firebase"
import { getPlanFromLocalStorage, getTrialDaysRemaining, isTrialExpired } from "../utils/trial-status"

interface TrialBannerProps {
  className?: string
}

const TrialBanner: React.FC<TrialBannerProps> = ({ className = "" }) => {
  const navigate = useNavigate()
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const checkTrialStatus = () => {
      if (!auth.currentUser) return

      const plan = getPlanFromLocalStorage(auth.currentUser.uid)

      if (!plan || !plan.trialPeriod) {
        setDaysRemaining(null)
        return
      }

      const isExpired = isTrialExpired(plan)
      setExpired(isExpired)

      if (isExpired) {
        // If trial has expired, redirect to trial expired page
        navigate("/trial-expired")
        return
      }

      const days = getTrialDaysRemaining(plan)
      setDaysRemaining(days)
    }

    checkTrialStatus()

    // Check trial status every hour
    const interval = setInterval(checkTrialStatus, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [navigate])

  // Don't show banner if no trial or dismissed
  if (daysRemaining === null || dismissed || expired) return null

  // Determine banner style based on days remaining
  const isUrgent = daysRemaining <= 3

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
        isUrgent
          ? "bg-red-100 text-red-800 border border-red-200"
          : "bg-amber-100 text-amber-800 border border-amber-200"
      } ${className}`}
    >
      {isUrgent ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <Clock className="w-5 h-5 flex-shrink-0" />}

      <div className="flex-1">
        <p className="font-medium">{isUrgent ? "Trial ending soon!" : "Free Trial Active"}</p>
        <p className="text-sm">
          {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining in your trial
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/account")}
          className={`px-3 py-1 text-sm font-medium rounded-md ${
            isUrgent ? "bg-red-600 text-white hover:bg-red-700" : "bg-amber-600 text-white hover:bg-amber-700"
          }`}
        >
          Upgrade Now
        </button>

        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-black/10 rounded-full" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default TrialBanner

