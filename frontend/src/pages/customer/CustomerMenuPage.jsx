import { useParams } from 'react-router-dom'

export default function CustomerMenuPage() {
  const { tableId } = useParams()
  return (
    <div className="min-h-screen bg-coffee-50 p-4">
      <div className="max-w-2xl mx-auto card">
        <h2 className="text-lg font-semibold mb-2">Menu khách hàng</h2>
        <p className="text-gray-600">Table: {tableId}</p>
        <p className="text-gray-600 mt-2">Trang đặt món qua QR đang ở bản khung.</p>
      </div>
    </div>
  )
}
