import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth, isSuperAdmin } from '../../lib/firebase';
import { Building2, Users, TrendingUp, Settings, AlertCircle } from 'lucide-react';
import TenantManagement from './TenantManagement';

interface DashboardStats {
  totalTenants: number;
  totalUsers: number;
  activeTenants: number;
  recentSignups: number;
}

const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    totalUsers: 0,
    activeTenants: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!auth.currentUser) {
          throw new Error('Not authenticated');
        }

        setLoading(true);
        setError(null);

        // Check if user is superadmin first
        const isSuperAdminUser = await isSuperAdmin(auth.currentUser.userID);
        if (!isSuperAdminUser) {
          throw new Error('Permission denied - must be super admin');
        }

        // Get all tenants (now that we know user is superadmin)
        const tenantsSnap = await getDocs(collection(db, 'tenants'));
        const totalTenants = tenantsSnap.size;

        // Get active tenants
        const activeTenantsSnap = await getDocs(
          query(collection(db, 'tenants'), where('status', '==', 'active'))
        );
        const activeTenants = activeTenantsSnap.size;

        // Get all users
        const usersSnap = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnap.size;

        // Get recent signups (in the last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Query for recent signups
        const recentSignupsSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('createdAt', '>=', thirtyDaysAgo.toISOString())
          )
        );
        const recentSignups = recentSignupsSnap.size;

        setStats({
          totalTenants,
          totalUsers,
          activeTenants,
          recentSignups,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h2>
            <p className="text-sm text-gray-600">Manage all tenants and system settings</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tenants */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tenants</p>
              <h4 className="text-2xl font-bold text-gray-900">
                {stats.totalTenants}
              </h4>
            </div>
          </div>
        </div>

        {/* Active Tenants */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Tenants</p>
              <h4 className="text-2xl font-bold text-gray-900">
                {stats.activeTenants}
              </h4>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <h4 className="text-2xl font-bold text-gray-900">
                {stats.totalUsers}
              </h4>
            </div>
          </div>
        </div>

        {/* Recent Signups */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recent Signups</p>
              <h4 className="text-2xl font-bold text-gray-900">
                {stats.recentSignups}
              </h4>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Management Section */}
      <TenantManagement />
    </div>
  );
};

export default SuperAdminDashboard;