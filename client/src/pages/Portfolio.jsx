import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Skeleton } from '../components/ui/Skeleton';

const Portfolio = () => {
  const navigate = useNavigate();
  const [accountBalances, setAccountBalances] = useState({ avlBalance: '0.00' });
  const [holdings, setHoldings] = useState([]);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [holdingsSectorFilter, setHoldingsSectorFilter] = useState('All Sectors');
  
  const [analytics, setAnalytics] = useState({
    netWorth: null,
    margin: null,
    diversification: null,
    highValue: null,
    sectorConcentration: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        const [balanceRes, holdingsRes] = await Promise.all([
          api.get('/wallet/balance').catch(() => ({ data: { avlBalance: '0.00' } })),
          api.get('/trade/holdings').catch(() => ({ data: { holdings: [] } }))
        ]);

        setAccountBalances(balanceRes.data);
        const fetchedHoldings = holdingsRes.data.holdings || [];
        setHoldings(fetchedHoldings);

        const symbols = fetchedHoldings.map(h => h.Ticker_Symbol).join(',');
        let quotesDict = {};
        if (symbols) {
          const quotesRes = await api.get(`/market/quotes?symbols=${symbols}`).catch(() => ({ data: { quotes: [] } }));
          const quotes = quotesRes.data.quotes || [];
          quotes.forEach(q => {
            quotesDict[q.symbol] = q;
          });
        }
        setLiveQuotes(quotesDict);

        // Fetch analytics with Promise.allSettled
        const [netWorth, margin, div, highVal, secConc] = await Promise.allSettled([
          api.get('/analytics/net-worth'),
          api.get('/analytics/margin-estimate'),
          api.get('/analytics/diversification-check'),
          api.get('/analytics/high-value-check'),
          api.get('/analytics/sector-concentration')
        ]);

        setAnalytics({
          netWorth: netWorth.status === 'fulfilled' ? netWorth.value.data : null,
          margin: margin.status === 'fulfilled' ? margin.value.data : null,
          diversification: div.status === 'fulfilled' ? div.value.data : null,
          highValue: highVal.status === 'fulfilled' ? highVal.value.data : null,
          sectorConcentration: secConc.status === 'fulfilled' ? secConc.value.data : []
        });

      } catch (err) {
        console.error('Failed to fetch portfolio data', err);
        toast.error('Failed to fetch portfolio data');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  const totalEquityValue = holdings.reduce((sum, h) => {
    const price = liveQuotes[h.Ticker_Symbol]?.regularMarketPrice || 0;
    return sum + (price * h.Current_Quantity_Held);
  }, 0);

  const totalCostBasis = holdings.reduce((sum, h) => {
    return sum + (parseFloat(h.Avg_Buy_Price) * h.Current_Quantity_Held);
  }, 0);

  const totalPL = totalEquityValue - totalCostBasis;
  const plColor = totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500';
  const plPrefix = totalPL >= 0 ? '+' : '';

  const holdingSectors = ['All Sectors', ...new Set(holdings.filter(h => h.Sector).map(h => h.Sector))];
  const filteredHoldings = holdingsSectorFilter === 'All Sectors' ? holdings : holdings.filter(h => h.Sector === holdingsSectorFilter);

  // Calculate sector equity allocation
  const sectorAllocations = {};
  holdings.forEach(h => {
    const price = liveQuotes[h.Ticker_Symbol]?.regularMarketPrice || 0;
    const value = price * h.Current_Quantity_Held;
    if (value > 0) {
      sectorAllocations[h.Sector] = (sectorAllocations[h.Sector] || 0) + value;
    }
  });

  const sectorChartColors = ['bg-emerald-600', 'bg-emerald-400', 'bg-teal-500', 'bg-teal-300', 'bg-slate-400', 'bg-emerald-700'];
  const sectorEntries = Object.entries(sectorAllocations).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Equity Value" value={`₹${totalEquityValue.toFixed(2)}`} />
              <StatCard title="Available Cash" value={`₹${accountBalances.avlBalance}`} />
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total P&L</h3>
                <div className={`text-3xl font-black font-mono tracking-tight ${plColor}`}>
                  {plPrefix}₹{Math.abs(totalPL).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <Card className="min-h-96 flex flex-col">
            <CardHeader 
              title="Holdings" 
              rightElement={
                <select 
                  className="text-sm border border-slate-200 rounded-md bg-white text-slate-700 font-mono shadow-sm px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={holdingsSectorFilter}
                  onChange={(e) => setHoldingsSectorFilter(e.target.value)}
                >
                  {holdingSectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              }
            />
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredHoldings.length === 0 ? (
              <CardContent className="flex-1 flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
                <p>No holdings found in this category.</p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                      <th className="p-4">Symbol</th>
                      <th className="p-4">Sector</th>
                      <th className="p-4 text-right">Qty</th>
                      <th className="p-4 text-right">Buy Price</th>
                      <th className="p-4 text-right">Live Price</th>
                      <th className="p-4 text-right">P&L</th>
                      <th className="p-4 text-right">Today %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredHoldings.map((hold, idx) => {
                      const quote = liveQuotes[hold.Ticker_Symbol];
                      const currentPrice = quote?.regularMarketPrice || 0;
                      const todayChangePercent = quote?.regularMarketChangePercent || 0;
                      const todayColor = todayChangePercent >= 0 ? 'text-emerald-500' : 'text-rose-500';
                      
                      const pl = currentPrice > 0 ? (currentPrice - parseFloat(hold.Avg_Buy_Price)) * hold.Current_Quantity_Held : 0;
                      const plRowColor = pl >= 0 ? 'text-emerald-500' : 'text-rose-500';
                      const plRowPrefix = pl >= 0 ? '+' : '';
                      
                      return (
                        <tr
                          key={hold.Ticker_Symbol + '-' + idx}
                          onClick={() => navigate(`/stock/${hold.Ticker_Symbol}`)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="p-4 text-slate-800 font-bold">{hold.Ticker_Symbol}</td>
                          <td className="p-4"><Badge variant="slate">{hold.Sector}</Badge></td>
                          <td className="p-4 text-slate-600 text-right">{hold.Current_Quantity_Held}</td>
                          <td className="p-4 text-slate-600 text-right font-semibold">₹{parseFloat(hold.Avg_Buy_Price).toFixed(2)}</td>
                          <td className="p-4 text-slate-600 text-right font-semibold">₹{currentPrice > 0 ? currentPrice.toFixed(2) : '---'}</td>
                          <td className={`p-4 text-right font-bold ${plRowColor}`}>
                            {currentPrice > 0 ? `${plRowPrefix}₹${Math.abs(pl).toFixed(2)}` : '---'}
                          </td>
                          <td className={`p-4 text-right font-bold ${todayColor}`}>
                            {todayChangePercent > 0 ? '+' : ''}{todayChangePercent.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Sector Allocation" />
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : sectorEntries.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">No holdings yet.</div>
              ) : (
                <div className="space-y-4">
                  {sectorEntries.map(([sector, value], index) => {
                    const percent = ((value / totalEquityValue) * 100).toFixed(1);
                    const colorClass = sectorChartColors[index % sectorChartColors.length];
                    return (
                      <div key={sector} className="flex flex-col space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-600">
                          <span>{sector}</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Portfolio Analytics" />
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <span className="text-sm font-semibold text-slate-500">Net Worth</span>
                    <span className="font-mono font-bold text-slate-900">₹{analytics.netWorth?.total_net_worth ? parseFloat(analytics.netWorth.total_net_worth).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <span className="text-sm font-semibold text-slate-500">Margin Estimate</span>
                    <span className="font-mono font-bold text-emerald-600">₹{analytics.margin?.calculated_margin ? parseFloat(analytics.margin.calculated_margin).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <span className="text-sm font-semibold text-slate-500">Diversification</span>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 mb-1">{analytics.diversification?.count || 0} sectors</div>
                      <Badge variant={analytics.diversification?.isDiversified ? 'emerald' : 'slate'}>
                        {analytics.diversification?.isDiversified ? 'Diversified' : 'Concentrated'}
                      </Badge>
                    </div>
                  </div>
                  {analytics.highValue?.isHighValue && (
                    <div className="pt-2">
                      <Badge variant="emerald" className="w-full justify-center py-1.5">High Value Portfolio</Badge>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Sector Concentration" />
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : analytics.sectorConcentration?.length === 0 ? (
                <div className="text-sm text-slate-500 text-center">No active sectors.</div>
              ) : (
                <div className="space-y-3">
                  {analytics.sectorConcentration.map((sec, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700 text-sm">{sec.sector}</span>
                      <Badge variant="emerald">{sec.stock_count} stocks</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
