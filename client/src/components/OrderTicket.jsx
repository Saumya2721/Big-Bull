import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';

const OrderTicket = ({ symbol, livePrice }) => {
  const [orderType, setOrderType] = useState('LIMIT'); // MARKET or LIMIT
  const [action, setAction] = useState('BUY');           // BUY or SELL
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState(livePrice || '');

  const executeTradeOrder = async (e) => {
    e.preventDefault();

    const orderPayload = {
      tickerSymbol: symbol,
      orderType,
      action,
      quantity: parseInt(quantity),
      price: orderType === 'MARKET' ? 0 : parseFloat(limitPrice)
    };

    const loadingToast = toast.loading(`Transmitting ${action} order...`);

    try {
      const response = await api.post('/trade/order', orderPayload);
      const fillTypeMsg = response.data.fillType === 'HOUSE' ? ' (House Fill)' : response.data.fillType === 'MATCHED' ? ' (Matched)' : '';
      toast.success(`Order Executed${fillTypeMsg}: ${response.data.message}`, { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Order Rejected. Margin or constraint breach.', { id: loadingToast });
    }
  };

  const currentPrice = livePrice ? parseFloat(livePrice).toFixed(2) : '---';
  const estimatedCost = ((orderType === 'MARKET' ? livePrice : parseFloat(limitPrice)) * quantity || 0).toFixed(2);

  return (
    <Card className="sticky top-24">
      <CardContent className="space-y-6">
        <div className="flex rounded-xl bg-slate-100 p-1">
          <Button 
            variant={action === 'BUY' ? 'primary' : 'ghost'}
            className={`flex-1 ${action === 'BUY' ? '' : 'text-slate-500'}`}
            onClick={() => setAction('BUY')} 
            type="button"
          >
            BUY
          </Button>
          <Button 
            variant={action === 'SELL' ? 'destructive' : 'ghost'}
            className={`flex-1 ${action === 'SELL' ? '' : 'text-slate-500'}`}
            onClick={() => setAction('SELL')} 
            type="button"
          >
            SELL
          </Button>
        </div>

        <form onSubmit={executeTradeOrder} className="space-y-4">
          <Select 
            label="Order Product Type"
            value={orderType} 
            onChange={(e) => setOrderType(e.target.value)}
          >
            <option value="MARKET">Market Execution (Live Price)</option>
            <option value="LIMIT">Limit Booking (Price Trigger)</option>
          </Select>
          {orderType === 'LIMIT' && (
            <p className="text-xs text-slate-400">Limit orders wait for a counterparty match at your price. Market orders fill instantly at the live price via house liquidity.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Shares Quantity"
              type="number" 
              min="1" 
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input 
              label="Execution Base (₹)"
              type="number" 
              step="0.01"
              disabled={orderType === 'MARKET'}
              required
              value={orderType === 'MARKET' ? currentPrice : limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-4 font-mono text-xs space-y-2 border border-slate-100 shadow-inner">
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Live Tick:</span><span className="text-slate-900 font-black">₹{currentPrice}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Estimated Total:</span><span className="text-emerald-600 font-black">₹{estimatedCost}</span></div>
          </div>

          <Button 
            type="submit"
            variant={action === 'BUY' ? 'primary' : 'destructive'}
            className="w-full py-3.5 text-sm tracking-wide shadow-sm"
          >
            Transmit {action} Order Ticket
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default OrderTicket;