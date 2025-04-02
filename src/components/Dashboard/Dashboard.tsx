"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs,
  where,
  limit,
  getCountFromServer,
} from "firebase/firestore"
import {
  LayoutDashboard,
  User,
  Settings,
  LinkIcon,
  Users,
  BarChart,
  HelpCircle,
  PenToolIcon as Tool,
  LogOut,
  Bell,
  Briefcase,
  Calendar,
  FileText,
  TrendingUp,
  Calculator,
  Shield,
  Search,
  Clock,
  Lightbulb,
  FileCheck,
  Globe,
  AlertCircle,
  Lock,
  CheckCircle2,
} from "lucide-react"
import { signOutUser, auth, db } from "../../lib/firebase"
import SuperAdminDashboard from "../SuperAdmin/SuperAdminDashboard"
import VisaFeeCalculator from "../VisaFeeCalculator"
import Integration from "./Integration"
import FundsCalculator from "./FundsCalc"
import ProfileManagement from "./ProfileManagement"
import MyOccupations from "./MyOccupations"
import DocumentChecklist from "../DocumentChecklist"
import PointsCalculator from "./PointsCalculator"
import UserManagement from "./UserManagement"
import ProspectManagement from "./ProspectManagement"
import AccountManagement from "./AccountManagement"
import Support from "./Support"
import Reports from "./Reports"
import TicketDetail from "./TicketDetail"
import TrialBanner from "../TrialBanner"
import { useSubscriptionFeatures } from "../../hooks/useSubscriptionFeatures"
import FeatureLockedButton from "../FeatureLockedButton"

interface NavItem {
  icon: React.ElementType
  label: string
  adminOnly?: boolean
  path: string
  superAdminOnly?: boolean
  requiredPlan?: string
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<"admin" | "user">("user")
  const [activeTicket, setActiveTicket] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [showAdminPortal, setShowAdminPortal] = useState(false)
  const { featureAccess, currentPlan, isTrialPeriod, trialDaysRemaining } = useSubscriptionFeatures()

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const [adminStats, setAdminStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
  })
  const [loadingAdminStats, setLoadingAdminStats] = useState(false)

  // Define navigation items with required plan information
  const navigation: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, label: "My Occupations", path: "/occupations" },
    { icon: Users, label: "Prospects", path: "/prospects", adminOnly: true, requiredPlan: "Enterprise" },
    { icon: Calculator, label: "Visa Fee Calculator", path: "/calculator", requiredPlan: "Premium" },
    { icon: Calculator, label: "Visa Funds Calculator", path: "/funds" },
    { icon: Calculator, label: "Points Calculator", path: "/points" },
    { icon: FileText, label: "Document Checklist", path: "/documents" },
    { icon: LinkIcon, label: "Integration", path: "/integration", adminOnly: true },
    { icon: User, label: "Account", path: "/account" },
    { icon: BarChart, label: "Reports", path: "/reports", adminOnly: true },
    { icon: HelpCircle, label: "Support", path: "/support" },
    { icon: Settings, label: "Settings", path: "/settings", adminOnly: true },
    { icon: Shield, label: "User Management", path: "/users", adminOnly: true },
    { icon: Shield, label: "Admin Portal", path: "/admin-portal", superAdminOnly: true },
  ]

  // Listen for custom event to navigate to support section
  useEffect(() => {
    const handleSupportNavigation = () => {
      setActiveSection("support")
    }

    window.addEventListener("navigateToSupport", handleSupportNavigation)
    return () => {
      window.removeEventListener("navigateToSupport", handleSupportNavigation)
    }
  }, [])

  // Add this function to check if the trial has expired
  const checkTrialExpiration = (plan: any) => {
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

  // Update the useEffect that checks for plan selection
  useEffect(() => {
    if (!auth.currentUser) {
      setIsLoading(false)
      return
    }

    // Check if user has selected a plan
    const userPlanKey = `selectedPlan_${auth.currentUser.uid}`
    const storedPlan = localStorage.getItem(userPlanKey)

    if (!storedPlan) {
      // No plan selected, redirect to plan selection page
      navigate("/select-plan")
      return
    }

    try {
      const parsedPlan = JSON.parse(storedPlan)

      // If no plan name is set, redirect to plan selection
      if (!parsedPlan.name) {
        navigate("/select-plan")
        return
      }

      // Check if trial has expired
      const isTrialExpired = checkTrialExpiration(parsedPlan)

      if (isTrialExpired) {
        // Trial has expired, redirect to trial expired page
        navigate("/trial-expired")
        return
      }

      // Calculate days remaining in trial
      if (parsedPlan.trialPeriod && parsedPlan.trialEndDate) {
        const trialEndDate = new Date(parsedPlan.trialEndDate)
        const now = new Date()
        const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

        // Set trial days remaining in state
      }
    } catch (error) {
      console.error("Error parsing stored plan:", error)
      navigate("/select-plan")
      return
    }

    // Continue with existing code...
    const unsubscribe = onSnapshot(
      doc(db, "users", auth.currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          setUserData(data)
          setIsAdmin(data.isAdmin === true)
          setIsSuperAdmin(data.role === "superAdmin")
          setUserRole(data.isAdmin ? "admin" : "user")

          // Also check subscription data from Firestore
          if (data.subscription) {
            const isTrialExpired =
              data.subscription.trialPeriod &&
              data.subscription.trialEndDate &&
              new Date() > new Date(data.subscription.trialEndDate)

            if (isTrialExpired && data.subscription.status !== "active") {
              navigate("/trial-expired")
              return
            }

            // Calculate days remaining in trial from Firestore data
            if (data.subscription.trialPeriod && data.subscription.trialEndDate) {
              const trialEndDate = new Date(data.subscription.trialEndDate)
              const now = new Date()
              const daysRemaining = Math.max(
                0,
                Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
              )

              // Set trial days remaining in state
            }
          }
        }
        setIsLoading(false)
      },
      (error) => {
        console.error("Error subscribing to user data:", error)
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [navigate])

  // // Subscribe to notifications (e.g., new leads)
  // useEffect(() => {
  //   if (auth.currentUser) {
  //     try {
  //       const q = query(collection(db, "leads"), orderBy("timestamp", "desc"))
  //       const unsubscribe = onSnapshot(
  //         q,
  //         (snapshot) => {
  //           const notifs = snapshot.docs.map((doc) => ({
  //             id: doc.id,
  //             ...doc.data(),
  //           }))
  //           setNotifications(notifs)
  //         },
  //         (error) => {
  //           if (error.code === "permission-denied") {
  //             console.log("User does not have permission to view notifications")
  //           } else {
  //             console.error("Error fetching notifications:", error)
  //             setDashboardError("Failed to load dashboard statistics")
  //           }
  //         },
  //       )
  //       return () => unsubscribe()
  //     } catch (error) {
  //       console.error("Error setting up notifications listener:", error)
  //       setDashboardError("Failed to load dashboard statistics")
  //     }
  //   }
  // }, [auth.currentUser])

  // // Fetch dashboard statistics
  // useEffect(() => {
  //   const fetchDashboardStats = async () => {
  //     if (!auth.currentUser) return

  //     try {
  //       // Reset error state
  //       setDashboardError(null)

  //       // Fetch leads statistics
  //       const leadsRef = collection(db, "leads")
  //       const leadsQuery = query(leadsRef, orderBy("timestamp", "desc"))
  //       const leadsSnapshot = await getDocs(leadsQuery)

  //       // Fetch recent searches
  //       const searchesRef = collection(db, "searches")
  //       const searchesQuery = query(
  //         searchesRef,
  //         where("userId", "==", auth.currentUser.uid),
  //         orderBy("timestamp", "desc"),
  //         limit(10),
  //       )
  //       const searchesSnapshot = await getDocs(searchesQuery)

  //       // If we got here without errors, we've successfully loaded the dashboard stats
  //       // You can set any state variables with the fetched data here
  //     } catch (error) {
  //       console.error("Error fetching dashboard statistics:", error)
  //       setDashboardError("Failed to load dashboard statistics")
  //     }
  //   }

  //   fetchDashboardStats()
  // }, [auth.currentUser])

  const fetchAdminStats = async () => {
    if (!isSuperAdmin) return

    setLoadingAdminStats(true)
    try {
      // Get total companies
      const companiesRef = collection(db, "companies")
      const companiesSnapshot = await getCountFromServer(companiesRef)
      const totalCompanies = companiesSnapshot.data().count

      // Get active companies (with active subscription)
      const activeCompaniesQuery = query(companiesRef, where("subscriptionStatus", "==", "active"))
      const activeCompaniesSnapshot = await getCountFromServer(activeCompaniesQuery)
      const activeCompanies = activeCompaniesSnapshot.data().count

      // Get total users
      const usersRef = collection(db, "users")
      const usersSnapshot = await getCountFromServer(usersRef)
      const totalUsers = usersSnapshot.data().count

      // Get active subscriptions
      const activeSubscriptionsCount = await getActiveSubscriptionsCount()

      setAdminStats({
        totalCompanies,
        activeCompanies,
        totalUsers,
        activeSubscriptions: activeSubscriptionsCount,
        totalRevenue: 0, // This would require more complex calculation
      })
    } catch (error) {
      console.error("Error fetching admin statistics:", error)
    } finally {
      setLoadingAdminStats(false)
    }
  }

  const getActiveSubscriptionsCount = async () => {
    try {
      let totalActive = 0
      const customersRef = collection(db, "customers")
      const customersSnapshot = await getDocs(customersRef)

      // Process each customer
      for (const customerDoc of customersSnapshot.docs) {
        const subscriptionsRef = collection(customerDoc.ref, "subscriptions")
        const activeSubQuery = query(subscriptionsRef, where("status", "==", "active"))
        const activeSubSnapshot = await getCountFromServer(activeSubQuery)

        totalActive += activeSubSnapshot.data().count
      }

      return totalActive
    } catch (error) {
      console.error("Error fetching active subscriptions:", error)
      return 0
    }
  }

  useEffect(() => {
    if (activeSection === "admin-portal" && isSuperAdmin) {
      fetchAdminStats()
    }
  }, [activeSection, isSuperAdmin])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Filter navigation items based on user role and subscription
  const filteredNavigation = navigation.filter(
    (item) =>
      // Check admin/superAdmin permissions
      (!item.adminOnly || isAdmin) && (!item.superAdminOnly || isSuperAdmin),
  )

  // Check if a feature is accessible based on the path
  const isFeatureAccessible = (path: string): boolean => {
    const pathWithoutSlash = path.replace("/", "")

    // Check specific feature access
    if (pathWithoutSlash === "calculator") {
      return featureAccess.visaCalculator
    }

    if (pathWithoutSlash === "prospects") {
      return featureAccess.prospects
    }

    // All other features are accessible by default
    return true
  }

  // Get required plan for a feature
  const getRequiredPlan = (path: string): string | undefined => {
    return navigation.find((item) => item.path === path)?.requiredPlan
  }

  // Quick actions for the Dashboard page
  const quickActions = isAdmin
    ? [
        { label: "Occupation Search", icon: Briefcase, section: "occupations" },
        { label: "Points Calculator", icon: Calculator, section: "points" },
        { label: "Visa Fee Calculator", icon: Calculator, section: "calculator", requiredPlan: "Premium" },
        { label: "Documents Checklist", icon: FileText, section: "documents" },
      ]
    : [
        { label: "Occupation Search", icon: Briefcase, section: "occupations" },
        { label: "Points Calculator", icon: Calculator, section: "points" },
        { label: "Visa Fee Calculator", icon: Calculator, section: "calculator", requiredPlan: "Premium" },
        { label: "Documents Checklist", icon: FileText, section: "documents" },
        { label: "Support", icon: HelpCircle, section: "support" },
      ]

  const handleSignOut = async () => {
    try {
      await signOutUser()
      window.location.reload()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Function to handle section navigation with feature access check
  const handleSectionClick = (section: string) => {
    const path = `/${section}`

    // Check if feature is accessible
    if (!isFeatureAccessible(path)) {
      // Feature is locked - don't navigate
      return
    }

    setActiveSection(section)
  }

  // Function to render the appropriate content based on activeSection
  const renderContent = () => {
    // If we're in admin portal mode, just return the SuperAdminDashboard
    if (activeSection === "admin-portal" && isSuperAdmin) {
      return <SuperAdminDashboard />
    }

    // Check if the current section requires a specific plan
    const currentPath = `/${activeSection}`
    if (!isFeatureAccessible(currentPath)) {
      const requiredPlan = getRequiredPlan(currentPath)
      return (
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="bg-amber-50 p-8 rounded-lg border border-amber-200 max-w-md">
            <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Feature Locked</h2>
            <p className="text-gray-600 mb-4">
              This feature requires the {requiredPlan} plan or higher. You are currently on the{" "}
              {currentPlan || "Standard"} plan.
            </p>
            <button
              onClick={() => navigate("/select-plan")}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      )
    }

    // For all other sections, render the appropriate content
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            {/* Quick Actions Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon
                const isAccessible = action.requiredPlan
                  ? action.requiredPlan === "Premium"
                    ? featureAccess.visaCalculator
                    : action.requiredPlan === "Enterprise"
                      ? featureAccess.prospects
                      : true
                  : true

                return (
                  <FeatureLockedButton
                    key={action.label}
                    onClick={() => isAccessible && setActiveSection(action.section)}
                    isEnabled={isAccessible}
                    requiredPlan={action.requiredPlan || ""}
                    className="p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-center gap-3"
                    icon={
                      <div className="p-3 rounded-lg bg-blue-100">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                    }
                  >
                    <span className="font-medium text-sm sm:text-base text-gray-900">{action.label}</span>
                  </FeatureLockedButton>
                )
              })}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Leads</p>
                    <h4 className="text-2xl font-bold text-gray-900">150</h4>
                  </div>
                </div>
                <div className="text-sm text-green-600">↑ 10% increase from last month</div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Tool className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recent Searches</p>
                    <h4 className="text-2xl font-bold text-gray-900">12</h4>
                  </div>
                </div>
                <div className="text-sm text-gray-600">Latest: Engineer jobs</div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Calculator className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conversion Rate</p>
                    <h4 className="text-2xl font-bold text-gray-900">15%</h4>
                  </div>
                </div>
                <div className="text-sm text-green-600">Improved by 3% from last period</div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Users</p>
                    <h4 className="text-2xl font-bold text-gray-900">45</h4>
                  </div>
                </div>
                <div className="text-sm text-blue-600">Currently online</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                  </div>
                  {notifications.length > 0 && (
                    <span className="text-sm text-gray-500">
                      Last updated {new Date(notifications[0].timestamp.seconds * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-3 rounded-full bg-gray-100 mb-3">
                      <Clock className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-center">No recent activity to display</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-blue-50">
                          {notif.type === "search" ? (
                            <Search className="w-4 h-4 text-blue-600" />
                          ) : notif.type === "lead" ? (
                            <Users className="w-4 h-4 text-green-600" />
                          ) : (
                            <Bell className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-gray-900 truncate">{notif.title}</p>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(notif.timestamp.seconds * 1000).toLocaleString(undefined, {
                                hour: "numeric",
                                minute: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Migration Tips */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-indigo-100">
                    <Lightbulb className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Migration Tips</h2>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      icon: Calendar,
                      title: "Plan Ahead",
                      description: "Develop a comprehensive migration strategy with clear timelines.",
                    },
                    {
                      icon: FileCheck,
                      title: "Document Management",
                      description: "Keep all required documents organized and up-to-date.",
                    },
                    {
                      icon: Globe,
                      title: "Stay Informed",
                      description: "Monitor the latest immigration policy changes and updates.",
                    },
                    {
                      icon: Users,
                      title: "Professional Guidance",
                      description: "Seek advice from registered migration agents when needed.",
                    },
                    {
                      icon: Calculator,
                      title: "Points Calculation",
                      description: "Regularly assess your points score using our calculator tools.",
                    },
                  ].map((tip, index) => {
                    const Icon = tip.icon
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-gray-100">
                          <Icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{tip.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{tip.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      case "integration":
        return (
          <div className="p-8">
            <Integration />
          </div>
        )
      case "calculator":
        return (
          <div className="p-8 animate-fadeIn">
            <VisaFeeCalculator />
          </div>
        )
      case "funds":
        return (
          <div className="p-8 animate-fadeIn">
            <FundsCalculator />
          </div>
        )
      case "occupations":
        return (
          <div className="animate-fadeIn">
            <MyOccupations />
          </div>
        )
      case "documents":
        return (
          <div className="p-8 animate-fadeIn">
            <DocumentChecklist />
          </div>
        )
      case "profile":
        return (
          <div className="p-8 animate-fadeIn">
            <ProfileManagement />
          </div>
        )
      case "points":
        return (
          <div className="p-8 animate-fadeIn">
            <PointsCalculator />
          </div>
        )
      case "users":
        return isAdmin ? (
          <div className="p-8 animate-fadeIn">
            <UserManagement />
          </div>
        ) : (
          <div className="p-8 text-center">
            <p>You don't have permission to access this page</p>
          </div>
        )
      case "prospects":
        return isAdmin ? (
          <div className="animate-fadeIn">
            <ProspectManagement />
          </div>
        ) : (
          <div className="p-8 text-center">
            <p>You don't have permission to access this page</p>
          </div>
        )
      case "account":
        return (
          <div className="animate-fadeIn">
            <AccountManagement />
          </div>
        )
      case "support":
        return activeTicket ? (
          <div className="animate-fadeIn">
            <TicketDetail ticketId={activeTicket} onBack={() => setActiveTicket(null)} />
          </div>
        ) : (
          <div className="animate-fadeIn">
            <Support onViewTicket={(ticketId) => setActiveTicket(ticketId)} />
          </div>
        )
      case "reports":
        return isAdmin ? (
          <div className="p-8 animate-fadeIn">
            <Reports />
          </div>
        ) : (
          <div className="p-8 text-center">
            <p>You don't have permission to access this page</p>
          </div>
        )
      default:
        return (
          <div className="p-8 text-center">
            <p>Select an option from the sidebar</p>
          </div>
        )
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block w-64 bg-white shadow-lg">
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-primary">MyOccupation</h1>
            </div>
          </div>
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const path = item.path
              const isAccessible = isFeatureAccessible(path)

              return (
                <FeatureLockedButton
                  key={path}
                  onClick={() => handleSectionClick(path.replace("/", ""))}
                  isEnabled={isAccessible}
                  requiredPlan={item.requiredPlan || ""}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${
                    activeSection === path.replace("/", "")
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-primary/10 hover:text-primary"
                  }`}
                  icon={<Icon className="w-5 h-5" />}
                >
                  {item.label}
                </FeatureLockedButton>
              )
            })}
          </nav>
          {/* Sign Out Button */}
          <div className="p-4 border-t">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
            {isAdmin && (
              <div className="mt-2 px-4 py-2 text-sm text-gray-500 border-t">
                <Shield className="w-4 h-4 inline-block mr-2" />
                Admin Access
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-screen overflow-y-auto w-full">
        {/* Top Bar - Only show for non-admin-portal sections */}
        {activeSection !== "admin-portal" && (
          <header className="bg-white shadow-sm sticky top-0 z-10 border-b px-4 sm:px-6">
            <div className="py-4 sm:py-5 flex flex-col sm:flex-row gap-4 sm:gap-0 justify-between items-start sm:items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                  Welcome Back, {userData?.firstName || "User"}
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Here's what's happening with your migration journey.
                </p>
              </div>

              {/* Subscription Plan Badge */}
              <div className="flex items-center gap-3">
                {/* Plan Badge - Show different badge for trial vs paid subscription */}
                {isTrialPeriod ? (
                  <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Trial - {currentPlan} Plan
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {currentPlan} Plan
                  </div>
                )}

                {/* Trial Status Banner */}
                {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                  <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 relative">
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative focus:outline-none"
                  >
                    <Bell className="w-6 h-6 text-gray-600 cursor-pointer" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-1 z-50">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-700">No new notifications</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="px-4 py-2 text-sm text-gray-700 border-b last:border-0 hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="font-medium">{notif.title}</div>
                            <div>{notif.message}</div>
                            <div className="text-xs text-gray-500">
                              {notif.timestamp ? new Date(notif.timestamp.seconds * 1000).toLocaleString() : ""}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* Profile Menu */}
                <div className="relative">
                  <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="relative">
                    {userData?.profilePicture ? (
                      <img
                        src={userData.profilePicture || "/placeholder.svg"}
                        alt="Profile"
                        className="w-10 h-10 rounded-full hover:ring-2 hover:ring-primary transition-all object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center hover:ring-2 hover:ring-primary transition-all">
                        <span className="text-blue-600 font-medium">
                          {userData?.firstName?.[0]}
                          {userData?.lastName?.[0]}
                        </span>
                      </div>
                    )}
                  </button>
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                      <button
                        onClick={() => {
                          setActiveSection("profile")
                          setShowProfileDropdown(false)
                        }}
                        className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Profile Settings
                      </button>
                      <button
                        onClick={() => navigate("/account")}
                        className="block w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                      >
                        Upgrade Plan
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Dashboard Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {/* Only show error message for dashboard statistics if not in admin portal */}
          {dashboardError && activeSection !== "admin-portal" && (
            <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {dashboardError}
            </div>
          )}

          {/* Render content based on active section */}
          {renderContent()}
        </main>
      </div>
      {/* Trial Banner */}
      <TrialBanner />
    </div>
  )
}

export default Dashboard

// "use client"

// import type React from "react"
// import { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
// import { doc, onSnapshot, collection, query, getDocs, where, getCountFromServer, getDoc } from "firebase/firestore"
// import {
//   LayoutDashboard,
//   User,
//   Settings,
//   LinkIcon,
//   Users,
//   BarChart,
//   HelpCircle,
//   PenToolIcon as Tool,
//   LogOut,
//   Bell,
//   Briefcase,
//   Calendar,
//   FileText,
//   TrendingUp,
//   Calculator,
//   Shield,
//   Search,
//   Clock,
//   Lightbulb,
//   FileCheck,
//   Globe,
//   Lock,
// } from "lucide-react"
// import { signOutUser, auth, db } from "../../lib/firebase"
// import SuperAdminDashboard from "../SuperAdmin/SuperAdminDashboard"
// import VisaFeeCalculator from "../VisaFeeCalculator"
// import Integration from "./Integration"
// import FundsCalculator from "./FundsCalc"
// import ProfileManagement from "./ProfileManagement"
// import MyOccupations from "./MyOccupations"
// import DocumentChecklist from "../DocumentChecklist"
// import PointsCalculator from "./PointsCalculator"
// import UserManagement from "./UserManagement"
// import ProspectManagement from "./ProspectManagement"
// import AccountManagement from "./AccountManagement"
// import Support from "./Support"
// import Reports from "./Reports"
// import TicketDetail from "./TicketDetail"
// import { useSubscriptionFeatures } from "../../hooks/useSubscriptionFeatures"
// import FeatureLockedButton from "../FeatureLockedButton"

// interface NavItem {
//   icon: React.ElementType
//   label: string
//   adminOnly?: boolean
//   path: string
//   superAdminOnly?: boolean
//   requiredPlan?: string
// }

// const Dashboard: React.FC = () => {
//   const navigate = useNavigate()
//   const [isAdmin, setIsAdmin] = useState(false)
//   const [userData, setUserData] = useState<any>(null)
//   const [activeSection, setActiveSection] = useState("dashboard")
//   const [showProfileDropdown, setShowProfileDropdown] = useState(false)
//   const [isLoading, setIsLoading] = useState(true)
//   const [userRole, setUserRole] = useState<"admin" | "user">("user")
//   const [activeTicket, setActiveTicket] = useState<string | null>(null)
//   const [isSuperAdmin, setIsSuperAdmin] = useState(false)
//   const [dashboardError, setDashboardError] = useState<string | null>(null)
//   const [showAdminPortal, setShowAdminPortal] = useState(false)
//   const { featureAccess, currentPlan, isTrialPeriod, trialDaysRemaining } = useSubscriptionFeatures()

//   // Notifications state
//   const [notifications, setNotifications] = useState<any[]>([])
//   const [showNotifications, setShowNotifications] = useState(false)

//   const [adminStats, setAdminStats] = useState({
//     totalCompanies: 0,
//     activeCompanies: 0,
//     totalUsers: 0,
//     activeSubscriptions: 0,
//     totalRevenue: 0,
//   })
//   const [loadingAdminStats, setLoadingAdminStats] = useState(false)

//   // Define navigation items with required plan information
//   const navigation: NavItem[] = [
//     { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
//     { icon: Briefcase, label: "My Occupations", path: "/occupations" },
//     { icon: Users, label: "Prospects", path: "/prospects", adminOnly: true, requiredPlan: "Enterprise" },
//     { icon: Calculator, label: "Visa Fee Calculator", path: "/calculator", requiredPlan: "Premium" },
//     { icon: Calculator, label: "Visa Funds Calculator", path: "/funds" },
//     { icon: Calculator, label: "Points Calculator", path: "/points" },
//     { icon: FileText, label: "Document Checklist", path: "/documents" },
//     { icon: LinkIcon, label: "Integration", path: "/integration", adminOnly: true },
//     { icon: User, label: "Account", path: "/account" },
//     { icon: BarChart, label: "Reports", path: "/reports", adminOnly: true },
//     { icon: HelpCircle, label: "Support", path: "/support" },
//     { icon: Settings, label: "Settings", path: "/settings", adminOnly: true },
//     { icon: Shield, label: "User Management", path: "/users", adminOnly: true },
//     { icon: Shield, label: "Admin Portal", path: "/admin-portal", superAdminOnly: true },
//   ]

//   // Listen for custom event to navigate to support section
//   useEffect(() => {
//     const handleSupportNavigation = () => {
//       setActiveSection("support")
//     }

//     window.addEventListener("navigateToSupport", handleSupportNavigation)
//     return () => {
//       window.removeEventListener("navigateToSupport", handleSupportNavigation)
//     }
//   }, [])

//   // Add this function to check if the trial has expired
//   const checkTrialExpiration = (plan: any) => {
//     if (!plan) return true

//     // If it's not a trial period, no need to check expiration
//     if (!plan.trialPeriod) return false

//     // Check if trial end date exists and is valid
//     if (!plan.trialEndDate) return true

//     const trialEndDate = new Date(plan.trialEndDate)
//     const now = new Date()

//     // Return true if trial has expired
//     return now > trialEndDate
//   }

//   // Update the useEffect that checks for plan selection
//   useEffect(() => {
//     if (!auth.currentUser) {
//       setIsLoading(false)
//       return
//     }

//       // First check if user is a superAdmin
//       const checkUserRole = async () => {
//         try {
//           const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
//           const userData = userDoc.data()

//           // If user is a superAdmin, they can bypass plan selection
//           if (userData && userData.role === "superAdmin") {
//             setIsSuperAdmin(true)
//             setUserData(userData)
//             setIsAdmin(userData.isAdmin === true)
//             setUserRole(userData.isAdmin ? "admin" : "user")
//             setIsLoading(false)
//             return true // Return true to indicate superAdmin status
//           }
//           return false // Not a superAdmin
//         } catch (error) {
//           console.error("Error checking user role:", error)
//           return false
//         }
//       }

//       // Check if user is superAdmin first
//       checkUserRole().then((isSuperAdmin) => {
//         // If superAdmin, skip plan check
//         if (isSuperAdmin) return

//         // For regular users, check if they have selected a plan
//         const userPlanKey = `selectedPlan_${auth.currentUser.uid}`
//         const storedPlan = localStorage.getItem(userPlanKey)

//         // Check if we're already on the plan selection page to avoid redirect loops
//         const isOnPlanSelectionPage = window.location.pathname === "/select-plan"
//         const isOnTrialExpiredPage = window.location.pathname === "/trial-expired"

//         if (!storedPlan && !isOnPlanSelectionPage && !isOnTrialExpiredPage) {
//           // No plan selected, redirect to plan selection page
//           navigate("/select-plan")
//           return
//         }

//         // If we're on the plan selection page, don't proceed with further checks
//         if (isOnPlanSelectionPage) {
//           setIsLoading(false)
//           return
//         }

//         try {
//           if (storedPlan) {
//             const parsedPlan = JSON.parse(storedPlan)

//             // If no plan name is set, redirect to plan selection
//             if (!parsedPlan.name && !isOnPlanSelectionPage) {
//               navigate("/select-plan")
//               return
//             }

//             // Check if trial has expired
//             const isTrialExpired = checkTrialExpiration(parsedPlan)

//             if (isTrialExpired && !isOnTrialExpiredPage) {
//               // Trial has expired, redirect to trial expired page
//               navigate("/trial-expired")
//               return
//             }

//             // Calculate days remaining in trial
//             if (parsedPlan.trialPeriod && parsedPlan.trialEndDate) {
//               const trialEndDate = new Date(parsedPlan.trialEndDate)
//               const now = new Date()
//               const daysRemaining = Math.max(
//                 0,
//                 Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
//               )
//               // Set trial days remaining in state if needed
//             }
//           }
//         } catch (error) {
//           console.error("Error parsing stored plan:", error)
//           if (!isOnPlanSelectionPage) {
//             navigate("/select-plan")
//             return
//           }
//         }

//         // Continue with existing code...
//         const unsubscribe = onSnapshot(
//           doc(db, "users", auth.currentUser.uid),
//           (docSnap) => {
//             if (docSnap.exists()) {
//               const data = docSnap.data()
//               setUserData(data)
//               setIsAdmin(data.isAdmin === true)
//               setIsSuperAdmin(data.role === "superAdmin")
//               setUserRole(data.isAdmin ? "admin" : "user")

//               // Also check subscription data from Firestore
//               if (data.subscription) {
//                 const isTrialExpired =
//                   data.subscription.trialPeriod &&
//                   data.subscription.trialEndDate &&
//                   new Date() > new Date(data.subscription.trialEndDate)

//                 if (isTrialExpired && data.subscription.status !== "active" && !isOnTrialExpiredPage) {
//                   navigate("/trial-expired")
//                   return
//                 }

//                 // Calculate days remaining in trial from Firestore data
//                 if (data.subscription.trialPeriod && data.subscription.trialEndDate) {
//                   const trialEndDate = new Date(data.subscription.trialEndDate)
//                   const now = new Date()
//                   const daysRemaining = Math.max(
//                     0,
//                     Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
//                   )
//                   // Set trial days remaining in state if needed
//                 }
//               }
//             }
//             setIsLoading(false)
//           },
//           (error) => {
//             console.error("Error subscribing to user data:", error)
//             setIsLoading(false)
//           },
//         )

//         return () => unsubscribe()
//       })
//     }, [navigate])

//     // // Subscribe to notifications (e.g., new leads)
//     // useEffect(() => {
//     //   if (auth.currentUser) {
//     //     try {
//     //       const q = query(collection(db, "leads"), orderBy("timestamp", "desc"))
//     //       const unsubscribe = onSnapshot(
//     //         q,
//     //         (snapshot) => {
//     //           const notifs = snapshot.docs.map((doc) => ({
//     //             id: doc.id,
//     //             ...doc.data(),
//     //           }))
//     //           setNotifications(notifs)
//     //         },
//     //         (error) => {
//     //           if (error.code === "permission-denied") {
//     //             console.log("User does not have permission to view notifications")
//     //           } else {
//     //             console.error("Error fetching notifications:", error)
//     //             setDashboardError("Failed to load dashboard statistics")
//     //           }
//     //         },
//     //       )
//     //       return () => unsubscribe()
//     //     } catch (error) {
//     //       console.error("Error setting up notifications listener:", error)
//     //       setDashboardError("Failed to load dashboard statistics")
//     //     }
//     //   }
//     // }, [auth.currentUser])

//     // // Fetch dashboard statistics
//     // useEffect(() => {
//     //   const fetchDashboardStats = async () => {
//     //     if (!auth.currentUser) return

//     //     try {
//     //       // Reset error state
//     //       setDashboardError(null)

//     //       // Fetch leads statistics
//     //       const leadsRef = collection(db, "leads")
//     //       const leadsQuery = query(leadsRef, orderBy("timestamp", "desc"))
//     //       const leadsSnapshot = await getDocs(leadsQuery)

//     //       // Fetch recent searches
//     //       const searchesRef = collection(db, "searches")
//     //       const searchesQuery = query(
//     //         searchesRef,
//     //         where("userId", "==", auth.currentUser.uid),
//     //         orderBy("timestamp", "desc"),
//     //         limit(10),
//     //       )
//     //       const searchesSnapshot = await getDocs(searchesQuery)

//     //       // If we got here without errors, we've successfully loaded the dashboard stats
//     //       // You can set any state variables with the fetched data here
//     //     } catch (error) {
//     //       console.error("Error fetching dashboard statistics:", error)
//     //       setDashboardError("Failed to load dashboard statistics")
//     //     }
//     //   }

//     //   fetchDashboardStats()
//     // }, [auth.currentUser])

//     const fetchAdminStats = async () => {
//       if (!isSuperAdmin) return

//       setLoadingAdminStats(true)
//       try {
//         // Get total companies
//         const companiesRef = collection(db, "companies")
//         const companiesSnapshot = await getCountFromServer(companiesRef)
//         const totalCompanies = companiesSnapshot.data().count

//         // Get active companies (with active subscription)
//         const activeCompaniesQuery = query(companiesRef, where("subscriptionStatus", "==", "active"))
//         const activeCompaniesSnapshot = await getCountFromServer(activeCompaniesQuery)
//         const activeCompanies = activeCompaniesSnapshot.data().count

//         // Get total users
//         const usersRef = collection(db, "users")
//         const usersSnapshot = await getCountFromServer(usersRef)
//         const totalUsers = usersSnapshot.data().count

//         // Get active subscriptions
//         const activeSubscriptionsCount = await getActiveSubscriptionsCount()

//         setAdminStats({
//           totalCompanies,
//           activeCompanies,
//           totalUsers,
//           activeSubscriptions: activeSubscriptionsCount,
//           totalRevenue: 0, // This would require more complex calculation
//         })
//       } catch (error) {
//         console.error("Error fetching admin statistics:", error)
//       } finally {
//         setLoadingAdminStats(false)
//       }
//     }

//     const getActiveSubscriptionsCount = async () => {
//       try {
//         let totalActive = 0
//         const customersRef = collection(db, "customers")
//         const customersSnapshot = await getDocs(customersRef)

//         // Process each customer
//         for (const customerDoc of customersSnapshot.docs) {
//           const subscriptionsRef = collection(customerDoc.ref, "subscriptions")
//           const activeSubQuery = query(subscriptionsRef, where("status", "==", "active"))
//           const activeSubSnapshot = await getCountFromServer(activeSubQuery)

//           totalActive += activeSubSnapshot.data().count
//         }

//         return totalActive
//       } catch (error) {
//         console.error("Error fetching active subscriptions:", error)
//         return 0
//       }
//     }

//     useEffect(() => {
//       if (activeSection === "admin-portal" && isSuperAdmin) {
//         fetchAdminStats()
//       }
//     }, [activeSection, isSuperAdmin])

//     if (isLoading) {
//       return (
//         <div className="min-h-screen flex items-center justify-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//         </div>
//       )
//     }

//     // Filter navigation items based on user role and subscription
//     const filteredNavigation = navigation.filter(
//       (item) =>
//         // Check admin/superAdmin permissions
//         (!item.adminOnly || isAdmin) && (!item.superAdminOnly || isSuperAdmin),
//     )

//     // Check if a feature is accessible based on the path
//     const isFeatureAccessible = (path: string): boolean => {
//       const pathWithoutSlash = path.replace("/", "")

//       // Check specific feature access
//       if (pathWithoutSlash === "calculator") {
//         return featureAccess.visaCalculator
//       }

//       if (pathWithoutSlash === "prospects") {
//         return featureAccess.prospects
//       }

//       // All other features are accessible by default
//       return true
//     }

//     // Get required plan for a feature
//     const getRequiredPlan = (path: string): string | undefined => {
//       return navigation.find((item) => item.path === path)?.requiredPlan
//     }

//     // Quick actions for the Dashboard page
//     const quickActions = isAdmin
//       ? [
//           { label: "Occupation Search", icon: Briefcase, section: "occupations" },
//           { label: "Points Calculator", icon: Calculator, section: "points" },
//           { label: "Visa Fee Calculator", icon: Calculator, section: "calculator", requiredPlan: "Premium" },
//           { label: "Documents Checklist", icon: FileText, section: "documents" },
//         ]
//       : [
//           { label: "Occupation Search", icon: Briefcase, section: "occupations" },
//           { label: "Points Calculator", icon: Calculator, section: "points" },
//           { label: "Visa Fee Calculator", icon: Calculator, section: "calculator", requiredPlan: "Premium" },
//           { label: "Documents Checklist", icon: FileText, section: "documents" },
//           { label: "Support", icon: HelpCircle, section: "support" },
//         ]

//     const handleSignOut = async () => {
//       try {
//         await signOutUser()
//         window.location.reload()
//       } catch (error) {
//         console.error("Error signing out:", error)
//       }
//     }

//     // Function to handle section navigation with feature access check
//     const handleSectionClick = (section: string) => {
//       const path = `/${section}`

//       // Check if feature is accessible
//       if (!isFeatureAccessible(path)) {
//         // Feature is locked - don't navigate
//         return
//       }

//       setActiveSection(section)
//     }

//     // Function to render the appropriate content based on activeSection
//     const renderContent = () => {
//       // If we're in admin portal mode, just return the SuperAdminDashboard
//       if (activeSection === "admin-portal" && isSuperAdmin) {
//         return <SuperAdminDashboard />
//       }

//       // Check if the current section requires a specific plan
//       const currentPath = `/${activeSection}`
//       if (!isFeatureAccessible(currentPath)) {
//         const requiredPlan = getRequiredPlan(currentPath)
//         return (
//           <div className="p-8 flex flex-col items-center justify-center text-center">
//             <div className="bg-amber-50 p-8 rounded-lg border border-amber-200 max-w-md">
//               <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
//               <h2 className="text-xl font-bold text-gray-900 mb-2">Feature Locked</h2>
//               <p className="text-gray-600 mb-4">
//                 This feature requires the {requiredPlan} plan or higher. You are currently on the{" "}
//                 {currentPlan || "Standard"} plan.
//               </p>
//               <button
//                 onClick={() => navigate("/select-plan")}
//                 className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
//               >
//                 Upgrade Plan
//               </button>
//             </div>
//           </div>
//         )
//       }

//       // For all other sections, render the appropriate content
//       switch (activeSection) {
//         case "dashboard":
//           return (
//             <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
//               {/* Quick Actions Row */}
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//                 {quickActions.map((action) => {
//                   const Icon = action.icon
//                   const isAccessible = action.requiredPlan
//                     ? action.requiredPlan === "Premium"
//                       ? featureAccess.visaCalculator
//                       : action.requiredPlan === "Enterprise"
//                         ? featureAccess.prospects
//                         : true
//                     : true

//                   return (
//                     <FeatureLockedButton
//                       key={action.label}
//                       onClick={() => isAccessible && setActiveSection(action.section)}
//                       isEnabled={isAccessible}
//                       requiredPlan={action.requiredPlan || ""}
//                       className="p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-center gap-3"
//                       icon={
//                         <div className="p-3 rounded-lg bg-blue-100">
//                           <Icon className="w-6 h-6 text-blue-600" />
//                         </div>
//                       }
//                     >
//                       <span className="font-medium text-sm sm:text-base text-gray-900">{action.label}</span>
//                     </FeatureLockedButton>
//                   )
//                 })}
//               </div>

//               {/* Stats Cards */}
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
//                 <div className="bg-white p-6 rounded-xl shadow-sm">
//                   <div className="flex items-center gap-4 mb-4">
//                     <div className="p-3 bg-blue-100 rounded-lg">
//                       <TrendingUp className="w-6 h-6 text-blue-600" />
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-600">Monthly Leads</p>
//                       <h4 className="text-2xl font-bold text-gray-900">150</h4>
//                     </div>
//                   </div>
//                   <div className="text-sm text-green-600">↑ 10% increase from last month</div>
//                 </div>

//                 <div className="bg-white p-6 rounded-xl shadow-sm">
//                   <div className="flex items-center gap-4 mb-4">
//                     <div className="p-3 bg-yellow-100 rounded-lg">
//                       <Tool className="w-6 h-6 text-yellow-600" />
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-600">Recent Searches</p>
//                       <h4 className="text-2xl font-bold text-gray-900">12</h4>
//                     </div>
//                   </div>
//                   <div className="text-sm text-gray-600">Latest: Engineer jobs</div>
//                 </div>

//                 <div className="bg-white p-6 rounded-xl shadow-sm">
//                   <div className="flex items-center gap-4 mb-4">
//                     <div className="p-3 bg-green-100 rounded-lg">
//                       <Calculator className="w-6 h-6 text-green-600" />
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-600">Conversion Rate</p>
//                       <h4 className="text-2xl font-bold text-gray-900">15%</h4>
//                     </div>
//                   </div>
//                   <div className="text-sm text-green-600">Improved by 3% from last period</div>
//                 </div>

//                 <div className="bg-white p-6 rounded-xl shadow-sm">
//                   <div className="flex items-center gap-4 mb-4">
//                     <div className="p-3 bg-purple-100 rounded-lg">
//                       <Users className="w-6 h-6 text-purple-600" />
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-600">Active Users</p>
//                       <h4 className="text-2xl font-bold text-gray-900">45</h4>
//                     </div>
//                   </div>
//                   <div className="text-sm text-blue-600">Currently online</div>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                 {/* Recent Activity */}
//                 <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
//                   <div className="flex items-center justify-between mb-6">
//                     <div className="flex items-center gap-3">
//                       <div className="p-2 rounded-lg bg-blue-100">
//                         <Clock className="w-5 h-5 text-blue-600" />
//                       </div>
//                       <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
//                     </div>
//                     {notifications.length > 0 && (
//                       <span className="text-sm text-gray-500">
//                         Last updated {new Date(notifications[0].timestamp.seconds * 1000).toLocaleString()}
//                       </span>
//                     )}
//                   </div>
//                   {notifications.length === 0 ? (
//                     <div className="flex flex-col items-center justify-center py-8">
//                       <div className="p-3 rounded-full bg-gray-100 mb-3">
//                         <Clock className="w-6 h-6 text-gray-400" />
//                       </div>
//                       <p className="text-gray-500 text-center">No recent activity to display</p>
//                     </div>
//                   ) : (
//                     <div className="space-y-4">
//                       {notifications.slice(0, 5).map((notif) => (
//                         <div
//                           key={notif.id}
//                           className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
//                         >
//                           <div className="p-2 rounded-lg bg-blue-50">
//                             {notif.type === "search" ? (
//                               <Search className="w-4 h-4 text-blue-600" />
//                             ) : notif.type === "lead" ? (
//                               <Users className="w-4 h-4 text-green-600" />
//                             ) : (
//                               <Bell className="w-4 h-4 text-purple-600" />
//                             )}
//                           </div>
//                           <div className="flex-1 min-w-0">
//                             <div className="flex items-center justify-between gap-2">
//                               <p className="font-medium text-gray-900 truncate">{notif.title}</p>
//                               <span className="text-xs text-gray-500 whitespace-nowrap">
//                                 {new Date(notif.timestamp.seconds * 1000).toLocaleString(undefined, {
//                                   hour: "numeric",
//                                   minute: "numeric",
//                                 })}
//                               </span>
//                             </div>
//                             <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Migration Tips */}
//                 <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
//                   <div className="flex items-center gap-3 mb-6">
//                     <div className="p-2 rounded-lg bg-indigo-100">
//                       <Lightbulb className="w-5 h-5 text-indigo-600" />
//                     </div>
//                     <h2 className="text-xl font-semibold text-gray-900">Migration Tips</h2>
//                   </div>
//                   <div className="space-y-4">
//                     {[
//                       {
//                         icon: Calendar,
//                         title: "Plan Ahead",
//                         description: "Develop a comprehensive migration strategy with clear timelines.",
//                       },
//                       {
//                         icon: FileCheck,
//                         title: "Document Management",
//                         description: "Keep all required documents organized and up-to-date.",
//                       },
//                       {
//                         icon: Globe,
//                         title: "Stay Informed",
//                         description: "Monitor the latest immigration policy changes and updates.",
//                       },
//                       {
//                         icon: Users,
//                         title: "Professional Guidance",
//                         description: "Seek advice from registered migration agents when needed.",
//                       },
//                       {
//                         icon: Calculator,
//                         title: "Points Calculation",
//                         description: "Regularly assess your points score using our calculator tools.",
//                       },
//                     ].map((tip, index) => {
//                       const Icon = tip.icon
//                       return (
//                         <div
//                           key={index}
//                           className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
//                         >
//                           <div className="p-2 rounded-lg bg-gray-100">
//                             <Icon className="w-4 h-4 text-gray-600" />
//                           </div>
//                           <div>
//                             <h3 className="font-medium text-gray-900">{tip.title}</h3>
//                             <p className="text-sm text-gray-600 mt-1">{tip.description}</p>
//                           </div>
//                         </div>
//                       )
//                     })}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )
//         case "integration":
//           return (
//             <div className="p-8">
//               <Integration />
//             </div>
//           )
//         case "calculator":
//           return (
//             <div className="p-8 animate-fadeIn">
//               <VisaFeeCalculator />
//             </div>
//           )
//         case "funds":
//           return (
//             <div className="p-8 animate-fadeIn">
//               <FundsCalculator />
//             </div>
//           )
//         case "occupations":
//           return (
//             <div className="animate-fadeIn">
//               <MyOccupations />
//             </div>
//           )
//         case "documents":
//           return (
//             <div className="p-8 animate-fadeIn">
//               <DocumentChecklist />
//             </div>
//           )
//         case "profile":
//           return (
//             <div className="p-8 animate-fadeIn">
//               <ProfileManagement />
//             </div>
//           )
//         case "points":
//           return (
//             <div className="p-8 animate-fadeIn">
//               <PointsCalculator />
//             </div>
//           )
//         case "users":
//           return isAdmin ? (
//             <div className="p-8 animate-fadeIn">
//               <UserManagement />
//             </div>
//           ) : (
//             <div className="p-8 text-center">
//               <p>You don't have permission to access this page</p>
//             </div>
//           )
//         case "prospects":
//           return isAdmin ? (
//             <div className="animate-fadeIn">
//               <ProspectManagement />
//             </div>
//           ) : (
//             <div className="p-8 text-center">
//               <p>You don't have permission to access this page</p>
//             </div>
//           )
//         case "account":
//           return (
//             <div className="animate-fadeIn">
//               <AccountManagement />
//             </div>
//           )
//         case "support":
//           return activeTicket ? (
//             <div className="animate-fadeIn">
//               <TicketDetail ticketId={activeTicket} onBack={() => setActiveTicket(null)} />
//             </div>
//           ) : (
//             <div className="animate-fadeIn">
//               <Support onViewTicket={(ticketId) => setActiveTicket(ticketId)} />
//             </div>
//           )
//         case "reports":
//           return isAdmin ? (
//             <div className="p-8 animate-fadeIn">
//               <Reports />
//             </div>
//           ) : (
//             <div className="p-8 text-center">
//               <p>You don't have permission to access this page</p>
//             </div>
//           )
//         default:
//           return (
//             <div className="p-8 text-center">
//               <p>Select an option from the sidebar</p>
//             </div>
//           )
//       }
//     }

//     return (
//       <div className="flex min-h-screen bg-gray-100 overflow-hidden">
//         {/* Sidebar */}
//         <div className="hidden md:block w-64 bg-white shadow-lg">
//           <div className="h-full flex flex-col">
//             {/* Logo/Header */}
//             <div className="p-6 border-b">
//               <div className="flex items-center gap-2">
//                 <div className="p-2 rounded-lg bg-primary/10">
//                   <Briefcase className="h-6 w-6 text-primary" />
//                 </div>
//                 <h1 className="text-2xl font-bold text-primary">MyOccupation</h1>
//               </div>
//             </div>
//             {/* Navigation */}
//             <nav className="flex-1 p-4 space-y-1">
//               {filteredNavigation.map((item) => {
//                 const Icon = item.icon
//                 const path = item.path
//                 const isAccessible = isFeatureAccessible(path)

//                 return (
//                   <FeatureLockedButton
//                     key={path}
//                     onClick={() => handleSectionClick(path.replace("/", ""))}
//                     isEnabled={isAccessible}
//                     requiredPlan={item.requiredPlan || ""}
//                     className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${
//                       activeSection === path.replace("/", "")
//                         ? "bg-primary/10 text-primary"
//                         : "text-gray-700 hover:bg-primary/10 hover:text-primary"
//                     }`}
//                     icon={<Icon className="w-5 h-5" />}
//                   >
//                     {item.label}
//                   </FeatureLockedButton>
//                 )
//               })}
//             </nav>
//             {/* Sign Out Button */}
//             <div className="p-4 border-t">
//               <button
//                 onClick={handleSignOut}
//                 className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
//               >
//                 <LogOut className="w-5 h-5" />
//                 <span>Sign Out</span>
//               </button>
//               {isAdmin && (
//                 <div className="mt-2 px-4 py-2 text-sm text-gray-500 border-t">
//                   <Shield className="w-4 h-4 inline-block mr-2" />
//                   Admin Access
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Main Content */}
//         <div className="flex-1 min-h-screen overflow-y-auto w-full">
//           {/* Top Bar - Only show for non-admin-portal sections */}
//           {activeSection !== "admin-portal" && (
//             <header className="bg-white shadow-sm sticky top-0 z-10 border-b px-4 sm:px-6">
//               <div className="py-4 sm:py-5 flex flex-col sm:flex-row gap-4 sm:gap-0 justify-between items-start sm:items-center">
//                 <div className="flex items-center gap-4">
//                   <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
//                     Welcome Back, {userData?.firstName || "User"}
//                   </h2>
//                   <p className="text-sm sm:text-base text-gray-600">
//                     Here's what's happening with your migration journey.
//                   </p>
//                 </div>

//                 {/* Notifications and Profile Dropdown */}
//                 <div className="flex items-center gap-3">
//                   {/* Notifications Icon */}
//                   <button
//                     onClick={() => setShowNotifications(!showNotifications)}
//                     className="relative p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
//                   >
//                     <Bell className="w-5 h-5 text-gray-600" />
//                     {notifications.length > 0 && (
//                       <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
//                         {notifications.length}
//                       </span>
//                     )}
//                   </button>

//                   {/* Profile Dropdown */}
//                   <div className="relative">
//                     <button
//                       onClick={() => setShowProfileDropdown(!showProfileDropdown)}
//                       className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
//                     >
//                       <User className="w-5 h-5 text-gray-600" />
//                       <span className="hidden sm:block text-gray-700">{userData?.firstName}</span>
//                     </button>

//                     {/* Profile Dropdown Content */}
//                     {showProfileDropdown && (
//                       <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
//                         <a
//                           href="#"
//                           className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
//                           onClick={() => {
//                             setActiveSection("account")
//                             setShowProfileDropdown(false)
//                           }}
//                         >
//                           My Account
//                         </a>
//                         <a
//                           href="#"
//                           className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
//                           onClick={() => {
//                             setActiveSection("settings")
//                             setShowProfileDropdown(false)
//                           }}
//                         >
//                           Settings
//                         </a>
//                         <button
//                           onClick={handleSignOut}
//                           className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
//                         >
//                           Sign Out
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </header>
//           )}

//           {/* Main Content Area */}
//           <main className="flex-1 p-4 sm:p-6">
//             {dashboardError ? (
//               <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
//                 <strong className="font-bold">Error!</strong>
//                 <span className="block sm:inline">{dashboardError}</span>
//               </div>
//             ) : (
//               renderContent()
//             )}
//           </main>
//         </div>
//       </div>
//     )
//   }

//   export default Dashboard

