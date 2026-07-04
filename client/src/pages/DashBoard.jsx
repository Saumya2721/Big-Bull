import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import WatchlistItem from '../components/WatchlistItem';

import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Skeleton } from '../components/ui/Skeleton';

const Dashboard = () => {
  const navigate = useNavigate();
  const [accountBalances, setAccountBalances] = useState({ avlBalance: '0.00' });
  const [holdings, setHoldings] = useState([]);
  const [liveHoldingsPrices, setLiveHoldingsPrices] = useState({});
  const [orders, setOrders] = useState([]);
  const [liveWatchlist, setLiveWatchlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSectorFilter, setSearchSectorFilter] = useState('All Sectors');
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    const fetchTradingWorkspaceData = async () => {
      try {
        const [balanceRes, holdingsRes, ordersRes, watchlistRes] = await Promise.all([
          api.get('/wallet/balance').catch(() => ({ data: { avlBalance: '0.00' } })),
          api.get('/trade/holdings').catch(() => ({ data: { holdings: [] } })),
          api.get('/trade/orders').catch(() => ({ data: { orders: [] } })),
          api.get('/watchlist').catch(() => ({ data: { symbols: [] } }))
        ]);

        setAccountBalances(balanceRes.data);
        
        const allHoldings = holdingsRes.data.holdings || [];
        setHoldings(allHoldings);
        
        setOrders(ordersRes.data.orders || []);

        const allSymbols = new Set();
        
        // For preview, we only fetch prices for top 4 watchlist symbols
        const topWatchlistSymbols = (watchlistRes.data.symbols || []).slice(0, 4);
        topWatchlistSymbols.forEach(s => allSymbols.add(s));
        
        // We still need all holdings prices for net worth calc
        allHoldings.forEach(h => allSymbols.add(h.Ticker_Symbol));

        const symbolsStr = Array.from(allSymbols).join(',');

        if (symbolsStr) {
          const quotesRes = await api.get(`/market/quotes?symbols=${symbolsStr}`);
          const quotes = quotesRes.data.quotes || [];
          
          setLiveWatchlist(quotes.filter(q => topWatchlistSymbols.includes(q.symbol)));
          
          const holdingsDict = {};
          quotes.forEach(q => {
            holdingsDict[q.symbol] = q.regularMarketPrice;
          });
          setLiveHoldingsPrices(holdingsDict);
        } else {
          setLiveWatchlist([]);
          setLiveHoldingsPrices({});
        }
      } catch (e) {
        console.error('Data fetch error', e);
        toast.error('Failed to fetch dashboard data');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchTradingWorkspaceData();
  }, []);

  useEffect(() => {
    const fetchSearch = async () => {
      try {
        if (!searchQuery.trim()) {
          if (searchSectorFilter && searchSectorFilter !== 'All Sectors') {
            const res = await api.get(`/market/local-search?sector=${encodeURIComponent(searchSectorFilter)}`);
            setSearchResults(res.data.quotes || []);
          } else {
            setSearchResults([]);
          }
          return;
        }
        
        const res = await api.get(`/market/search/${encodeURIComponent(searchQuery)}`);
        let results = res.data.quotes || [];
        if (searchSectorFilter && searchSectorFilter !== 'All Sectors') {
           results = results.filter(q => q.sector === searchSectorFilter);
        }
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed', err);
        toast.error('Search failed');
      }
    };
    
    const timer = setTimeout(fetchSearch, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchSectorFilter]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      navigate(`/stock/${searchResults[0].symbol}`);
    } else if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/stock/${searchQuery.toUpperCase()}`);
    }
  };

  const liveTotalValuation = holdings.reduce((sum, hold) => sum + (liveHoldingsPrices[hold.Ticker_Symbol] || 0) * hold.Current_Quantity_Held, 0);
  const liveNetWorth = parseFloat(accountBalances.avlBalance || 0) + liveTotalValuation;

  const topHoldings = [...holdings].sort((a, b) => b.Current_Quantity_Held - a.Current_Quantity_Held).slice(0, 4);
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {loadingInitial ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard title="Total Net Worth (Live)" value={`₹${liveNetWorth.toFixed(2)}`} />
              <StatCard title="Available Balance Cash" value={`₹${accountBalances.avlBalance}`} className="group" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <CardHeader title="Holdings Preview" />
              
              {loadingInitial ? (
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              ) : topHoldings.length === 0 ? (
                <div className="p-6 flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                  <p>No holdings found.</p>
                </div>
              ) : (
                <div className="flex-1 divide-y divide-slate-100 font-mono text-sm">
                  {topHoldings.map((hold, idx) => {
                    const currentPrice = liveHoldingsPrices[hold.Ticker_Symbol] || 0;
                    const pl = currentPrice > 0 ? (currentPrice - parseFloat(hold.Avg_Buy_Price)) * hold.Current_Quantity_Held : 0;
                    const plColor = pl >= 0 ? 'text-emerald-500' : 'text-rose-500';
                    const plPrefix = pl >= 0 ? '+' : '';
                    
                    return (
                      <div
                        key={hold.Ticker_Symbol + '-' + idx}
                        onClick={() => navigate(`/stock/${hold.Ticker_Symbol}`)}
                        className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{hold.Ticker_Symbol}</div>
                          <div className="text-xs text-slate-500 mt-1">{hold.Current_Quantity_Held} shares</div>
                        </div>
                        <div className={`font-bold ${plColor}`}>
                          {plPrefix}₹{Math.abs(pl).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <Link to="/portfolio" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View Portfolio &rarr;
                </Link>
              </div>
            </Card>

            <Card className="h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <CardHeader title="Recent Orders" />
              
              {loadingInitial ? (
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              ) : recentOrders.length === 0 ? (
                <div className="p-6 flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                  <p>No recent orders.</p>
                </div>
              ) : (
                <div className="flex-1 divide-y divide-slate-100 font-mono text-sm">
                  {recentOrders.map((order, idx) => (
                    <div key={order.order_id + '-' + idx} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{order.ticker_symbol}</div>
                        <div className="text-xs font-bold mt-1">
                          <span className={order.order_type === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}>{order.order_type}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">₹{parseFloat(order.price).toFixed(2)}</div>
                        <div className="mt-1">
                          <Badge variant={order.status === 'Executed' ? 'emerald' : order.status === 'Cancelled' ? 'slate' : 'amber'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <Link to="/orders" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View All Orders &rarr;
                </Link>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-4 relative z-40 overflow-visible flex gap-3">
            <select
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm shadow-inner min-w-[150px]"
              value={searchSectorFilter}
              onChange={(e) => setSearchSectorFilter(e.target.value)}
            >
              <option value="All Sectors">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Financial Services">Financial Services</option>
              <option value="Energy">Energy</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Consumer Cyclical">Consumer Cyclical</option>
              <option value="Industrials">Industrials</option>
              <option value="Basic Materials">Basic Materials</option>
              <option value="Communication Services">Communication Services</option>
            </select>
            <input
              type="text"
              placeholder="Search stocks..."
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono text-sm transition-all shadow-inner w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-3 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                {searchResults.map((res, idx) => (
                  <div
                    key={res.symbol + '-' + idx}
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                    onClick={() => navigate(`/stock/${res.symbol}`)}
                  >
                    <div className="font-bold text-slate-800 font-mono">{res.symbol}</div>
                    <div className="text-xs text-slate-500 truncate mt-1">{res.shortname || res.longname}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="h-auto flex flex-col">
            <CardHeader title="Watchlist Preview" />
            
            <div className="flex-1 divide-y divide-slate-100">
              {loadingInitial ? (
                <CardContent className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              ) : liveWatchlist.length === 0 ? (
                <div className="p-6 text-slate-500 text-sm text-center font-medium">Your watchlist is empty.</div>
              ) : liveWatchlist.map((quote, idx) => (
                <WatchlistItem 
                  key={quote.symbol + '-' + idx} 
                  quote={quote} 
                  onClick={() => navigate(`/stock/${quote.symbol}`)} 
                />
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <Link to="/watchlist" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                View Full Watchlist &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;