import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const adminItems = [
  { to: '/dashboard', label: 'Tổng quan' },
  { to: '/products', label: 'Sản phẩm' },
  { to: '/inventory', label: 'Hàng hóa' },
  { to: '/staff', label: 'Nhân viên' },
  { to: '/tables', label: 'Bàn' },
  { to: '/settings', label: 'Cài đặt' },
  { to: '/reports', label: 'Báo cáo' },
  { to: '/logs', label: 'Nhật ký' },
]

const staffItems = [
  { to: '/pos', label: 'POS' },
  { to: '/staff-orders', label: 'Đơn hàng' },
  { to: '/tables', label: 'Bàn' },
]

export default function Sidebar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const items = user?.role === 'admin' ? adminItems : staffItems

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
      <div className="h-16 px-4 flex items-center border-b border-gray-200 font-semibold text-primary-700">
        Coffee POS
      </div>
      <nav className="p-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`block px-3 py-2 rounded-lg text-sm ${active ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
