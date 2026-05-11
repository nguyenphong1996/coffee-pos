import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await login(email, password)
      toast.success('Đăng nhập thành công')
      navigate('/')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Đăng nhập thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-coffee-50 p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-md">
        <h1 className="text-xl font-semibold mb-6">Đăng nhập Coffee POS</h1>
        <label className="label">Email</label>
        <input className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label">Mật khẩu</label>
        <input className="input mb-6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={submitting} className="btn-primary w-full" type="submit">
          {submitting ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  )
}
