import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between">
      <div className="text-sm text-gray-600">Xin chào, {user?.name || 'User'}</div>
      <button className="btn-secondary" onClick={handleLogout}>Đăng xuất</button>
    </header>
  )
}
