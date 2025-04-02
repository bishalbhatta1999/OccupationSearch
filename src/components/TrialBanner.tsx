"use client"

import type React from "react"
import { AlertCircle, Clock } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface TrialBannerProps {
  daysRemaining: number | null
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ daysRemaining }) => {
  const navigate = useNavigate()

  if (!daysRemaining) return null

  // Determine urgency level
  const isUrgent = daysRemaining <= 3
  const isWarning = daysRemaining <= 7

  // Set styles based on urgency
  const bgColor = isUrgent ? "bg-red-50" : isWarning ? "bg-amber-50" : "bg-blue-50"
  const borderColor = isUrgent ? "border-red-200" : isWarning ? "border-amber-200" : "border-blue-200"
  const textColor = isUrgent ? "text-red-800" : isWarning ? "text-amber-800" : "text-blue-800"
  const buttonBg = isUrgent
    ? "bg-red-600 hover:bg-red-700"
    : isWarning
      ? "bg-amber-600 hover:bg-amber-700"
      : "bg-blue-600 hover:bg-blue-700"

  return (
    <div className={`${bgColor} ${borderColor} border-l-4 p-4 mb-4 rounded-md`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isUrgent ? (
            <AlertCircle
              className={`h-5 w-5 ${isUrgent ? "text-red-600" : isWarning ? "text-amber-600" : "text-blue-600"}`}
            />
          ) : (
            <Clock
              className={`h-5 w-5 ${isUrgent ? "text-red-600" : isWarning ? "text-amber-600" : "text-blue-600"}`}
            />
          )}
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <p className={`text-sm ${textColor}`}>
            {isUrgent ? (
              <strong>
                Your trial expires in {daysRemaining} {daysRemaining === 1 ? "day" : "days"}! Upgrade now to avoid
                service interruption.
              </strong>
            ) : isWarning ? (
              <span>
                Your trial will expire in {daysRemaining} days. Consider upgrading to continue using all features.
              </span>
            ) : (
              <span>You're currently in a trial period with {daysRemaining} days remaining.</span>
            )}
          </p>
          <div className="mt-3 md:mt-0 md:ml-6">
            <button
              onClick={() => navigate("/billing")}
              className={`whitespace-nowrap rounded-md ${buttonBg} px-3 py-2 text-sm font-medium text-white shadow-sm`}
            >
              {isUrgent ? "Upgrade Now" : "View Plans"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrialBanner

