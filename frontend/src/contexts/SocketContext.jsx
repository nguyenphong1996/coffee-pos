import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [onlineStaff, setOnlineStaff] = useState([])

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('accessToken')
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const s = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    s.on('connect', () => {
      s.emit('join:role', user.role)
      if (user.role === 'staff') {
        s.emit('join:pos', user._id)
      }
    })

    s.on('onlineStaff', (staffList) => {
      setOnlineStaff(staffList)
    })

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [user])

  const emit = (event, data) => {
    if (socket) socket.emit(event, data)
  }

  const on = (event, cb) => {
    if (socket) socket.on(event, cb)
  }

  const off = (event, cb) => {
    if (socket) socket.off(event, cb)
  }

  return (
    <SocketContext.Provider value={{ socket, onlineStaff, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
