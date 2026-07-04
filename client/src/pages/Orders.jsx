import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';

import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [balance, setBalance] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const fetchOrdersAndBalance = async () => {
    try {
      const [ordersRes, balanceRes] = await Promise.all([
        api.get('/trade/orders').catch(() => ({ data: { orders: [] } })),
        api.get('/wallet/balance').catch(() => ({ data: { avlBalance: '0.00' } }))
      ]);
      setOrders(ordersRes.data.orders || []);
      setBalance(balanceRes.data.avlBalance || '0.00');
    } catch (e) {
      console.error('Failed to fetch orders data', e);
      toast.error('Failed to fetch orders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndBalance();
  }, []);

  const handleCancelOrder = async (orderId) => {
    const loadingToast = toast.loading('Cancelling order...');
    try {
      await api.delete(`/trade/order/${orderId}`);
      await fetchOrdersAndBalance();
      toast.success('Order cancelled successfully', { id: loadingToast });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to cancel order', { id: loadingToast });
    }
  };

  const totalOrders = orders.length;
  const openOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Partial').length;
  const filledOrders = orders.filter(o => o.status === 'Executed').length;

  const filters = ['All', 'Pending', 'Partial', 'Executed', 'Cancelled'];
  
  const filteredOrders = filter === 'All' ? orders : orders.filter(o => o.status === filter);

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Orders" value={totalOrders.toString()} />
              <StatCard title="Open Orders" value={openOrders.toString()} variant={openOrders > 0 ? "emerald" : "default"} />
              <StatCard title="Filled Orders" value={filledOrders.toString()} />
            </div>
            <div className="mt-2 text-right">
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full inline-block">
                Available Balance: <span className="text-emerald-600">₹{balance}</span>
              </span>
            </div>
          </div>
        )}

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {filters.map(f => (
            <Button
              key={f}
              variant="secondary"
              className={`px-4 py-2 ${filter === f ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>

        <Card className="min-h-96 flex flex-col">
          {loading ? (
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          ) : filteredOrders.length === 0 ? (
            <CardContent className="flex-1 flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
              <p>No {filter !== 'All' ? filter.toLowerCase() : ''} orders found.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                    <th className="p-4">Time</th>
                    <th className="p-4">Symbol</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right">Qty</th>
                    <th className="p-4 text-right">Unfilled</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredOrders.map((order, idx) => (
                    <tr key={order.order_id + '-' + idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-600">{formatTime(order.timestamp)}</td>
                      <td className="p-4 text-slate-800 font-bold">{order.ticker_symbol}</td>
                      <td className={`p-4 font-bold ${order.order_type === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>{order.order_type}</td>
                      <td className="p-4">
                        <Badge variant="slate" className="font-mono text-xs">{order.order_type === 'MARKET' ? 'MARKET' : 'LIMIT'}</Badge>
                      </td>
                      <td className="p-4 text-slate-600 text-right">{order.orderqty}</td>
                      <td className="p-4 text-slate-600 text-right">{order.unfilledqty}</td>
                      <td className="p-4 text-slate-600 text-right font-semibold">₹{parseFloat(order.price).toFixed(2)}</td>
                      <td className="p-4">
                        <Badge variant={order.status === 'Executed' ? 'emerald' : order.status === 'Cancelled' ? 'slate' : order.status === 'Partial' ? 'blue' : 'amber'}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {(order.status === 'Pending' || order.status === 'Partial') && (
                          <Button
                            variant="ghost"
                            onClick={() => handleCancelOrder(order.order_id)}
                            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 inline-flex"
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Orders;
