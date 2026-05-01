import { useState, useEffect } from 'react'
import { cardsAPI, vendorsAPI, ordersAPI, transactionsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, Download } from 'lucide-react'

export default function OrderPage() {
  const [uidInput, setUidInput] = useState('')
  const [card, setCard] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [vendors, setVendors] = useState([])
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [foodItems, setFoodItems] = useState([])
  const [cart, setCart] = useState([])
  const [processing, setProcessing] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)

  useEffect(() => {
    vendorsAPI.list().then(r => setVendors(r.data.filter(v => v.is_active)))
  }, [])

  useEffect(() => {
    if (selectedVendor) {
      vendorsAPI.listFoodItems(selectedVendor.id)
        .then(r => setFoodItems(r.data.filter(f => f.is_available)))
      setCart([])
    }
  }, [selectedVendor])

  const handleScan = async (e) => {
    e.preventDefault()
    setScanning(true)
    setCard(null)
    setCompletedOrder(null)
    try {
      const res = await cardsAPI.scan(uidInput.trim())
      if (res.data.status !== 'active') { toast.error('Card is not active.'); return }
      setCard(res.data)
    } catch { toast.error('Card not found.') }
    finally { setScanning(false) }
  }

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0))
  }

  const total = cart.reduce((sum, c) => sum + parseFloat(c.price) * c.qty, 0)

  const handleOrder = async () => {
    if (!card || !selectedVendor || cart.length === 0) return
    if (parseFloat(card.balance) < total) { toast.error('Insufficient balance.'); return }
    setProcessing(true)
    try {
      const res = await ordersAPI.create({
        card_uid: card.uid,
        vendor_id: selectedVendor.id,
        items: cart.map(c => ({ food_item_id: c.id, quantity: c.qty })),
      })
      setCompletedOrder(res.data)
      setCard(prev => ({ ...prev, balance: res.data.balance_after }))
      setCart([])
      toast.success('Order completed!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Order failed.')
    } finally {
      setProcessing(false)
    }
  }

  const downloadReceipt = async (orderId) => {
    try {
      const res = await transactionsAPI.receipt(orderId)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url
      a.download = `receipt_${completedOrder.order_number}.pdf`; a.click()
      window.URL.revokeObjectURL(url)
    } catch { toast.error('Failed to download receipt.') }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
        <p className="text-gray-500 mt-1">Purchase food using a prepaid card</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Card + Vendor */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3">Step 1: Scan Card</h3>
            <form onSubmit={handleScan} className="space-y-2">
              <input className="input" placeholder="Card UID" value={uidInput}
                onChange={e => setUidInput(e.target.value)} required />
              <button type="submit" disabled={scanning} className="btn-primary w-full">{scanning ? 'Searching...' : 'Find Card'}</button>
            </form>
            {card && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
                <div className="flex justify-between"><span className="text-gray-500">Card</span><span className="font-mono font-semibold">{card.card_number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{card.customer_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className="font-bold text-blue-700">{parseFloat(card.balance).toFixed(2)}</span></div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Step 2: Select Vendor</h3>
            <div className="space-y-2">
              {vendors.map(v => (
                <button key={v.id} onClick={() => setSelectedVendor(v)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                    selectedVendor?.id === v.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                  <p className="font-medium">{v.name}</p>
                  <p className="text-gray-400 text-xs">Stall {v.stall_number}</p>
                </button>
              ))}
              {vendors.length === 0 && <p className="text-gray-400 text-sm">No active vendors.</p>}
            </div>
          </div>
        </div>

        {/* Middle: Menu */}
        <div className="card">
          <h3 className="font-semibold mb-3">Step 3: Select Items {selectedVendor && `— ${selectedVendor.name}`}</h3>
          {!selectedVendor ? (
            <div className="text-center py-10 text-gray-400"><ShoppingCart size={36} className="mx-auto mb-2 opacity-30" /><p>Select a vendor first</p></div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {foodItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-blue-600 font-semibold text-sm">{parseFloat(item.price).toFixed(2)}</p>
                  </div>
                  <button onClick={() => addToCart(item)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))}
              {foodItems.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No items available.</p>}
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="card">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          {cart.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><ShoppingCart size={36} className="mx-auto mb-2 opacity-30" /><p>Cart is empty</p></div>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-[320px] overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{parseFloat(item.price).toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"><Minus size={12} /></button>
                      <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"><Plus size={12} /></button>
                    </div>
                    <p className="ml-2 text-sm font-semibold w-14 text-right">{(parseFloat(item.price) * item.qty).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-3 mb-4">
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Total</span><span className="font-bold text-lg">{total.toFixed(2)}</span></div>
                {card && <div className="flex justify-between text-xs text-gray-400"><span>Balance after</span><span>{(parseFloat(card.balance) - total).toFixed(2)}</span></div>}
              </div>
              <button onClick={handleOrder} disabled={processing || !card}
                className="btn-primary w-full py-3 text-base">
                {processing ? 'Processing...' : 'Confirm Purchase'}
              </button>
              {!card && <p className="text-xs text-red-500 text-center mt-2">Scan a card first</p>}
            </>
          )}

          {completedOrder && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-600" size={16} />
                <span className="font-semibold text-green-800 text-sm">Order Complete!</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">Order #{completedOrder.order_number}</p>
              <button onClick={() => downloadReceipt(completedOrder.id)}
                className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <Download size={14} /> Download Receipt PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
