"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../../lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, getCountFromServer } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { Loader2 } from "lucide-react"
import AccountManagement from "./AccountManagement"
import Integration from "./Integration"

import {
  LayoutDashboard,
  User,
  Settings,
  LinkIcon,
  Users,
  BarChart,
  HelpCircle,
  PenToolIcon as Tool,
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
  Lock,
  AlertCircle,
  Building,
  CreditCard,
} from "lucide-react"
import { signOutUser } from "../../lib/firebase"
import VisaFeeCalculator from "../VisaFeeCalculator"
import FundsCalculator from "./FundsCalc"
import ProfileManagement from "./ProfileManagement"
import MyOccupations from "./MyOccupations"
import DocumentChecklist from "../DocumentChecklist"
import PointsCalculator from "./PointsCalculator"
import UserManagement from "./UserManagement"
import ProspectManagement from "./ProspectManagement"
import Support from "./Support"
import Reports from "./Reports"
import TicketDetail from "./TicketDetail"
import { checkUserSubscription } from "../../utils/subscription-utils"
import { isInTrialPeriod, getTrialDaysRemaining } from "../../utils/trial-status"
import AdminUserManagement from "../AdminPages/AdminUserManagement"
import Subscriptions from "../AdminPages/Subscriptions"

interface NavItem {
  icon: React.ElementType
  label: string
  adminOnly?: boolean
  path: string
  superAdminOnly?: boolean
}

interface TabItem {
  label: string
  key: string
  adminOnly?: boolean
}

interface DashboardStats {
  totalCompanies: number
  activeCompanies: number
  totalUsers: number
  recentSignups: number
  activeSubscriptions: number
  totalRevenue: number
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(false)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<"admin" | "user">("user")
  const [activeTicket, setActiveTicket] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [showAdminPortal, setShowAdminPortal] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipText, setTooltipText] = useState("")
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const [adminStats, setAdminStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    recentSignups: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
  })
  const [loadingAdminStats, setLoadingAdminStats] = useState(false)
  const [adminActiveTab, setAdminActiveTab] = useState<"dashboard" | "users" | "tenants" | "subscriptions">("dashboard")

  // Subscription state
  const [subscription, setSubscription] = useState({
    isActive: true,
    plan: "free", // Default to free plan
    loading: true,
    error: null as string | null,
  })

  // Define navigation items
  const navigation: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, label: "My Occupations", path: "/occupations" },
    { icon: Users, label: "Prospects", path: "/prospects" },
    { icon: Calculator, label: "Visa Fee Calculator", path: "/calculator" },
    { icon: Calculator, label: "Visa Funds Calculator", path: "/funds" },
    { icon: Calculator, label: "Points Calculator", path: "/points" },
    { icon: FileText, label: "Document Checklist", path: "/documents" },
    { icon: LinkIcon, label: "Integration", path: "/integration" },
    { icon: User, label: "Account", path: "/account" },
    { icon: BarChart, label: "Reports", path: "/reports" },
    { icon: HelpCircle, label: "Support", path: "/support" },
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: Shield, label: "User Management", path: "/users" },
    { icon: Shield, label: "Admin Portal", path: "/admin-portal", adminOnly: true },
  ]

  // Define tabs for dashboard
  const dashboardTabs: TabItem[] = [
    { label: "Dashboard", key: "dashboard" },
    { label: "My Occupations", key: "occupations" },
    { label: "Prospects", key: "prospects" },
    { label: "Calculators", key: "calculators" },
    { label: "Documents", key: "documents" },
    { label: "Account", key: "account" },
    { label: "Support", key: "support" },
    { label: "Admin", key: "admin", adminOnly: true },
  ]

  // Listen for custom event to navigate to support section
  useEffect(() => {
    const handleSupportNavigation = () => {
      setActiveSection("support")
      setActiveTab("support")
    }

    window.addEventListener("navigateToSupport", handleSupportNavigation)
    return () => {
      window.removeEventListener("navigateToSupport", handleSupportNavigation)
    }
  }, [])

  // Update the useEffect that checks for authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/")
        return
      }

      try {
        setUser(currentUser)
        const userDocRef = doc(db, "users", currentUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData(data)

          // Check if user is admin
          const userIsAdmin = data?.role === "admin" || data?.role === "superAdmin"
          const userIsSuperAdmin = data?.role === "superAdmin"

          setIsAdmin(userIsAdmin)
          setIsSuperAdmin(userIsSuperAdmin)

          // Check subscription status
          const subscriptionResult = await checkUserSubscription(currentUser.uid)
          setSubscription({
            isActive: subscriptionResult.isActive,
            plan: subscriptionResult.plan || "free", // Default to free if no plan is returned
            loading: false,
            error: subscriptionResult.error,
          })
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const fetchAdminStats = async () => {
    if (!isAdmin) return

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

      // Get recent signups (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentSignupsQuery = query(usersRef, where("createdAt", ">=", thirtyDaysAgo.toISOString()))
      const recentSignupsSnapshot = await getDocs(recentSignupsQuery)
      const recentSignups = recentSignupsSnapshot.size

      // Get active subscriptions
      const activeSubscriptionsCount = await getActiveSubscriptionsCount()

      setAdminStats({
        totalCompanies,
        activeCompanies,
        totalUsers,
        recentSignups,
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
    if (activeSection === "admin-portal" && isAdmin) {
      fetchAdminStats()
    }
  }, [activeSection, isAdmin])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(
    (item) =>
      // Check admin/superAdmin permissions
      (!item.adminOnly || isAdmin) && (!item.superAdminOnly || isSuperAdmin),
  )

  // Filter dashboard tabs based on user role
  const filteredTabs = dashboardTabs.filter((tab) => !tab.adminOnly || isAdmin)

  // Check if a feature is accessible based on the path
  const isFeatureAccessible = (path: string): boolean => {
    // If subscription is loading, allow access
    if (subscription.loading) return true

    // Admin portal is only accessible by admins
    if (path === "/admin-portal") return isAdmin

    // If subscription is active, check plan-specific access
    if (subscription.isActive) {
      // Define features available for each plan
      const planFeatures: Record<string, string[]> = {
        free: ["/dashboard", "/occupations", "/funds", "/points", "/documents", "/account", "/support"],
        standard: [
          "/dashboard",
          "/occupations",
          "/funds",
          "/points",
          "/documents",
          "/account",
          "/support",
          "/integration",
          "/reports",
          "/users",
          "/settings",
        ],
        premium: [
          "/dashboard",
          "/occupations",
          "/calculator",
          "/funds",
          "/points",
          "/documents",
          "/account",
          "/support",
          "/integration",
          "/reports",
          "/users",
          "/settings",
        ],
        enterprise: [
          "/dashboard",
          "/occupations",
          "/calculator",
          "/funds",
          "/points",
          "/documents",
          "/prospects",
          "/account",
          "/support",
          "/integration",
          "/reports",
          "/users",
          "/settings",
        ],
      }

      // Get features for current plan, default to free if plan not found
      const availableFeatures = planFeatures[subscription.plan] || planFeatures.free

      // Check if the path is in the available features
      return availableFeatures.some((feature) => path.startsWith(feature))
    }

    // If subscription is not active, only allow access to dashboard, account, and support
    return ["/dashboard", "/account", "/support", "/occupations", "/settings", "/users"].some((feature) =>
      path.startsWith(feature),
    )
  }

  // Get upgrade message for a specific feature
  const getUpgradeMessage = (path: string): string => {
    if (path === "/prospects") {
      if (subscription.plan === "free" || subscription.plan === "standard") {
        return "Upgrade to Enterprise to unlock Prospects"
      } else if (subscription.plan === "premium") {
        return "Upgrade to Enterprise to unlock Prospects"
      }
    } else if (path === "/calculator" && subscription.plan === "standard") {
      return "Upgrade to Premium or Enterprise to unlock Visa Fee Calculator"
    }
    return "Upgrade your plan to unlock this feature"
  }

  // Show tooltip for locked features
  const showTooltip = (e: React.MouseEvent, path: string) => {
    const message = getUpgradeMessage(path)
    setTooltipText(message)
    setTooltipVisible(true)
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  const hideTooltip = () => {
    setTooltipVisible(false)
  }

  // Quick actions for the Dashboard page
  const quickActions = isAdmin
    ? [
        { label: "Occupation Search", icon: Briefcase, section: "occupations" },
        { label: "Points Calculator", icon: Calculator, section: "points" },
        { label: "Visa Fee Calculator", icon: Calculator, section: "calculator" },
        { label: "Documents Checklist", icon: FileText, section: "documents" },
      ]
    : [
        { label: "Occupation Search", icon: Briefcase, section: "occupations" },
        { label: "Points Calculator", icon: Calculator, section: "points" },
        { label: "Visa Fee Calculator", icon: Calculator, section: "calculator" },
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

  // Function to handle section navigation
  const handleSectionClick = (section: string) => {
    setActiveSection(section)

    // Update active tab based on section
    if (section === "dashboard") {
      setActiveTab("dashboard")
    } else if (section === "occupations") {
      setActiveTab("occupations")
    } else if (["funds", "points", "calculator"].includes(section)) {
      setActiveTab("calculators")
    } else if (section === "documents") {
      setActiveTab("documents")
    } else if (section === "account") {
      setActiveTab("account")
    } else if (section === "support") {
      setActiveTab("support")
    } else if (section === "integration") {
      setActiveTab("integration")
    } else if (section === "settings") {
      setActiveTab("settings")
    } else if (section === "users") {
      setActiveTab("users")
    } else if (section === "admin-portal") {
      setActiveTab("admin")
    } else if (section === "prospects") {
      setActiveTab("prospects")
    }
  }

  // Function to handle tab navigation
  const handleTabClick = (tab: string) => {
    setActiveTab(tab)

    // Set default section for each tab
    if (tab === "dashboard") {
      setActiveSection("dashboard")
    } else if (tab === "occupations") {
      setActiveSection("occupations")
    } else if (tab === "prospects") {
      setActiveSection("prospects")
    } else if (tab === "calculators") {
      setActiveSection("calculator")
    } else if (tab === "documents") {
      setActiveSection("documents")
    } else if (tab === "account") {
      setActiveSection("account")
    } else if (tab === "support") {
      setActiveSection("support")
    } else if (tab === "admin") {
      setActiveSection("admin-portal")
    } else if (tab === "settings") {
      setActiveSection("settings")
    } else if (tab === "users") {
      setActiveSection("users")
    } else if (tab === "integration") {
      setActiveSection("integration")
    }
  }

  // Function to render the admin portal content
  const renderAdminPortal = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white border-b border-gray-200 shadow-sm mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            </div>
            <div className="flex space-x-8 mt-2">
              <button
                onClick={() => setAdminActiveTab("dashboard")}
                className={`pb-4 text-sm font-medium ${
                  adminActiveTab === "dashboard"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setAdminActiveTab("users")}
                className={`pb-4 text-sm font-medium ${
                  adminActiveTab === "users"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setAdminActiveTab("tenants")}
                className={`pb-4 text-sm font-medium ${
                  adminActiveTab === "tenants"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Tenant Management
              </button>
              <button
                onClick={() => setAdminActiveTab("subscriptions")}
                className={`pb-4 text-sm font-medium ${
                  adminActiveTab === "subscriptions"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Subscriptions
              </button>
            </div>
          </div>
        </div>

        {adminActiveTab === "dashboard" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 mr-4">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Companies</p>
                    <h3 className="text-2xl font-bold">{adminStats.totalCompanies}</h3>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    <span className="text-green-500 font-medium">{adminStats.activeCompanies} active</span> companies
                    with subscriptions
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-indigo-100 mr-4">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <h3 className="text-2xl font-bold">{adminStats.totalUsers}</h3>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    <span className="text-green-500 font-medium">{adminStats.recentSignups} new</span> users in the last
                    30 days
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 mr-4">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                    <h3 className="text-2xl font-bold">{adminStats.activeSubscriptions}</h3>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    <span className="text-green-500 font-medium">${adminStats.totalRevenue}</span> monthly recurring
                    revenue
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {/* Placeholder for recent activity */}
                <p className="text-gray-500 text-sm italic">Recent activity will be displayed here.</p>
              </div>
            </div>
          </div>
        )}
        {adminActiveTab === "users" && <AdminUserManagement />}
        {adminActiveTab === "tenants" && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Tenant Management</h3>
            <p className="text-gray-500 text-sm italic">Tenant management features coming soon.</p>
          </div>
        )}
        {adminActiveTab === "subscriptions" && <Subscriptions />}
      </div>
    )
  }

  // Function to render the appropriate content based on activeSection
  const renderContent = () => {
    // If we're in admin portal mode, render the admin portal
    if (activeSection === "admin-portal" && isAdmin) {
      return renderAdminPortal()
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
                const isAccessible = isFeatureAccessible(`/${action.section}`)

                return (
                  <button
                    key={action.label}
                    onClick={() => isAccessible && handleSectionClick(action.section)}
                    className={`p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-center gap-3 ${!isAccessible ? "opacity-70 cursor-not-allowed" : ""}`}
                    onMouseEnter={(e) => !isAccessible && showTooltip(e, `/${action.section}`)}
                    onMouseLeave={hideTooltip}
                  >
                    <div className="p-3 rounded-lg bg-blue-100">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="font-medium text-sm sm:text-base text-gray-900">{action.label}</span>
                    {!isAccessible && <Lock className="ml-2 h-4 w-4 text-gray-500" />}
                  </button>
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
                  {notifications.length > 0 ? (
                    <span className="text-sm text-gray-500">
                      Last updated {new Date(notifications[0].timestamp.seconds * 1000).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                {notifications.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 italic">No recent activity.</p>
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
        return isAdmin || subscription.plan === "enterprise" || subscription.plan === "premium" ? (
          <div className="p-8 animate-fadeIn">
            <VisaFeeCalculator />
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Feature Locked</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              The Calculator feature is only available on Premium or Enterprise plans.
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Upgrade Your Plan
            </button>
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
        return (
          <div className="p-8 animate-fadeIn">
            <UserManagement />
          </div>
        )
      case "prospects":
        return isAdmin || subscription.plan === "enterprise" ? (
          <div className="animate-fadeIn">
            <ProspectManagement />
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Feature Locked</h2>
            <p className="text-gray-600 mb-6 max-w-md">The Prospects feature is only available on Enterprise plans.</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Upgrade Your Plan
            </button>
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
        return (
          <div className="p-8 animate-fadeIn">
            <Reports />
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-gray-900">OccupationSearch</h1>
            </div>
            <div className="mt-5 flex-1 flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.path.substring(1)
                  const isAccessible = isFeatureAccessible(item.path)

                  return (
                    <button
                      key={item.label}
                      onClick={() => isAccessible && handleSectionClick(item.path.substring(1))}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full ${
                        isActive
                          ? "bg-blue-100 text-blue-900"
                          : isAccessible
                            ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            : "text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={!isAccessible}
                      onMouseEnter={(e) => !isAccessible && showTooltip(e, item.path)}
                      onMouseLeave={hideTooltip}
                    >
                      <Icon
                        className={`mr-3 flex-shrink-0 h-5 w-5 ${
                          isActive ? "text-blue-600" : isAccessible ? "text-gray-500" : "text-gray-300"
                        }`}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      {!isAccessible && <Lock className="ml-2 h-4 w-4 text-gray-300" />}
                    </button>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div>
                    <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      {userData?.firstName?.charAt(0) || user?.displayName?.charAt(0) || "U"}
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {userData?.firstName || user?.displayName || "User"}
                    </p>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500">
                        {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                      </span>
                      <button onClick={handleSignOut} className="ml-2 text-xs text-blue-600 hover:text-blue-800">
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className="md:hidden">
        <div className={`fixed inset-0 flex z-40 ${showProfileDropdown ? "visible" : "invisible"}`}>
          <div
            className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${showProfileDropdown ? "opacity-100" : "opacity-0"}`}
            onClick={() => setShowProfileDropdown(false)}
          ></div>
          <div
            className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition-transform ${showProfileDropdown ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setShowProfileDropdown(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-gray-900">OccupationSearch</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.path.substring(1)
                  const isAccessible = isFeatureAccessible(item.path)

                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (isAccessible) {
                          handleSectionClick(item.path.substring(1))
                          setShowProfileDropdown(false)
                        }
                      }}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md w-full ${
                        isActive
                          ? "bg-blue-100 text-blue-900"
                          : isAccessible
                            ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            : "text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={!isAccessible}
                      onMouseEnter={(e) => !isAccessible && showTooltip(e, item.path)}
                      onMouseLeave={hideTooltip}
                    >
                      <Icon
                        className={`mr-4 flex-shrink-0 h-6 w-6 ${
                          isActive ? "text-blue-600" : isAccessible ? "text-gray-500" : "text-gray-300"
                        }`}
                      />
                      {item.label}
                      {!isAccessible && <Lock className="ml-2 h-4 w-4 text-gray-300" />}
                    </button>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 group block">
                <div className="flex items-center">
                  <div>
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      {userData?.firstName?.charAt(0) || user?.displayName?.charAt(0) || "U"}
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                      {userData?.firstName || user?.displayName || "User"}
                    </p>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500">
                        {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                      </span>
                      <button onClick={handleSignOut} className="ml-2 text-xs text-blue-600 hover:text-blue-800">
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-14">{/* Force sidebar to shrink to fit close icon */}</div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setShowProfileDropdown(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h1>
              <div className="ml-4 flex items-center">
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                </span>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notification button */}
              <button
                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
              </button>

              {/* Profile dropdown */}
              <div className="ml-3 relative">
                <div>
                  <button
                    className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    id="user-menu"
                    aria-expanded="false"
                    aria-haspopup="true"
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      {userData?.firstName?.charAt(0) || user?.displayName?.charAt(0) || "U"}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto">
              {filteredTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } mr-8`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trial Banner */}
        {subscription.plan !== "free" && isInTrialPeriod(auth.currentUser?.uid || "") && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Trial Period: {getTrialDaysRemaining(auth.currentUser?.uid || "")} days remaining
                </span>
              </div>
              <button
                onClick={() => setActiveSection("account")}
                className="px-4 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Content */}
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Tooltip for locked features */}
      {tooltipVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm"
          style={{
            top: `${tooltipPosition.y + 10}px`,
            left: `${tooltipPosition.x + 10}px`,
            maxWidth: "250px",
          }}
        >
          {tooltipText}
        </div>
      )}
    </div>
  )
}

export default Dashboard

