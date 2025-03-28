"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { CreditCard, Download, Search } from "lucide-react"

interface Subscription {
  id: string
  customerId: string
  status: string
  priceId: string
  quantity: number
  createdAt: string
  currentPeriodStart: string
  currentPeriodEnd: string
  companyId: string
  companyName?: string
  planName?: string
  amount?: number
}

const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get all subscriptions
        const subscriptionsRef = collection(db, "subscriptions")
        const subscriptionsSnap = await getDocs(subscriptionsRef)

        // Get all companies for lookup
        const companiesRef = collection(db, "companies")
        const companiesSnap = await getDocs(companiesRef)
        const companiesMap = new Map()

        companiesSnap.forEach((doc) => {
          const companyData = doc.data()
          companiesMap.set(doc.id, {
            name: companyData.name || "Unknown Company",
          })
        })

        // Get all products and prices for lookup
        const productsRef = collection(db, "products")
        const productsSnap = await getDocs(productsRef)
        const productsMap = new Map()

        productsSnap.forEach((doc) => {
          const productData = doc.data()
          productsMap.set(doc.id, {
            name: productData.name || "Unknown Product",
          })
        })

        const pricesRef = collection(db, "prices")
        const pricesSnap = await getDocs(pricesRef)
        const pricesMap = new Map()

        pricesSnap.forEach((doc) => {
          const priceData = doc.data()
          pricesMap.set(doc.id, {
            productId: priceData.product,
            unitAmount: priceData.unit_amount,
          })
        })

        // Map subscription data
        const subscriptionsData = subscriptionsSnap.docs.map((doc) => {
          const data = doc.data()
          const companyData = companiesMap.get(data.companyId)
          const priceData = pricesMap.get(data.priceId)
          const productData = priceData ? productsMap.get(priceData.productId) : null

          return {
            id: doc.id,
            customerId: data.customerId || "",
            status: data.status || "unknown",
            priceId: data.priceId || "",
            quantity: data.quantity || 1,
            createdAt: data.created ? new Date(data.created * 1000).toISOString() : "",
            currentPeriodStart: data.current_period_start
              ? new Date(data.current_period_start * 1000).toISOString()
              : "",
            currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end * 1000).toISOString() : "",
            companyId: data.companyId || "",
            companyName: companyData ? companyData.name : "Unknown Company",
            planName: productData ? productData.name : "Unknown Plan",
            amount: priceData ? priceData.unitAmount / 100 : 0,
          }
        })

        setSubscriptions(subscriptionsData)
      } catch (err) {
        console.error("Error fetching subscriptions:", err)
        setError("Failed to load subscription data")
      } finally {
        setLoading(false)
      }
    }

    fetchSubscriptions()
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Company",
      "Plan",
      "Status",
      "Amount",
      "Created",
      "Current Period Start",
      "Current Period End",
    ]

    const csvData = filteredSubscriptions.map((sub) => [
      sub.id,
      sub.companyName,
      sub.planName,
      sub.status,
      `$${sub.amount?.toFixed(2)}`,
      formatDate(sub.createdAt),
      formatDate(sub.currentPeriodStart),
      formatDate(sub.currentPeriodEnd),
    ])

    const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `subscriptions_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter and sort subscriptions
  const filteredSubscriptions = subscriptions
    .filter((sub) => {
      const matchesSearch =
        sub.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.planName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || sub.status.toLowerCase() === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      } else if (sortBy === "company") {
        const companyA = a.companyName || ""
        const companyB = b.companyName || ""
        return sortOrder === "asc" ? companyA.localeCompare(companyB) : companyB.localeCompare(companyA)
      } else if (sortBy === "amount") {
        const amountA = a.amount || 0
        const amountB = b.amount || 0
        return sortOrder === "asc" ? amountA - amountB : amountB - amountA
      }
      return 0
    })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800"
      case "trialing":
        return "bg-blue-100 text-blue-800"
      case "canceled":
        return "bg-red-100 text-red-800"
      case "past_due":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search subscriptions..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="canceled">Canceled</option>
              <option value="past_due">Past Due</option>
            </select>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortBy("company")
                    setSortOrder(sortOrder === "asc" && sortBy === "company" ? "desc" : "asc")
                  }}
                >
                  <div className="flex items-center gap-1">
                    Company
                    {sortBy === "company" && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Plan
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortBy("amount")
                    setSortOrder(sortOrder === "asc" && sortBy === "amount" ? "desc" : "asc")
                  }}
                >
                  <div className="flex items-center gap-1">
                    Amount
                    {sortBy === "amount" && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortBy("date")
                    setSortOrder(sortOrder === "asc" && sortBy === "date" ? "desc" : "asc")
                  }}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortBy === "date" && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Current Period
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{subscription.companyName}</div>
                      <div className="text-xs text-gray-500">{subscription.customerId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subscription.planName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          subscription.status,
                        )}`}
                      >
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${subscription.amount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(subscription.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(subscription.currentPeriodStart)} to {formatDate(subscription.currentPeriodEnd)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Subscriptions</p>
                <h4 className="text-2xl font-bold text-gray-900">
                  {subscriptions.filter((sub) => sub.status === "active").length}
                </h4>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Trialing Subscriptions</p>
                <h4 className="text-2xl font-bold text-gray-900">
                  {subscriptions.filter((sub) => sub.status === "trialing").length}
                </h4>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Recurring Revenue</p>
                <h4 className="text-2xl font-bold text-gray-900">
                  $
                  {subscriptions
                    .filter((sub) => sub.status === "active")
                    .reduce((total, sub) => total + (sub.amount || 0), 0)
                    .toFixed(2)}
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Subscriptions
