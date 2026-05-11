import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import ProductsPage from './pages/admin/ProductsPage'
import InventoryPage from './pages/admin/InventoryPage'
import StaffPage from './pages/admin/StaffPage'
import TablesPage from './pages/admin/TablesPage'
import SettingsPage from './pages/admin/SettingsPage'
import ReportsPage from './pages/admin/ReportsPage'
import LogsPage from './pages/admin/LogsPage'
import StaffPosPage from './pages/staff/StaffPosPage'
import StaffOrdersPage from './pages/staff/StaffOrdersPage'
import CustomerMenuPage from './pages/customer/CustomerMenuPage'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center">Đang tải...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles?.length && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute roles={['admin', 'staff']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="pos" element={<StaffPosPage />} />
          <Route path="staff-orders" element={<StaffOrdersPage />} />
        </Route>

        <Route path="/order/:tableId" element={<CustomerMenuPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
