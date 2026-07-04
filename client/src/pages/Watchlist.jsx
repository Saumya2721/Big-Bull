import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import WatchlistItem from '../components/WatchlistItem';

import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';

const Watchlist = () => {
  const navigate = useNavigate();
  const [liveWatchlist, setLiveWatchlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSectorFilter, setSearchSectorFilter] = useState('All Sectors');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [addingSymbol, setAddingSymbol] = useState(null);

  const fetchWatchlist = async () => {
    try {
      const watchlistRes = await api.get('/watchlist').catch(() => ({ data: { symbols: [] } }));
      const symbols = watchlistRes.data.symbols || [];

      if (symbols.length > 0) {
        const quotesRes = await api.get(`/market/quotes?symbols=${symbols.join(',')}`);
        const quotes = quotesRes.data.quotes || [];
        // preserve order
        const orderedQuotes = symbols.map(s => quotes.find(q => q.symbol === s)).filter(Boolean);
        setLiveWatchlist(orderedQuotes);
      } else {
        setLiveWatchlist([]);
      }
    } catch (e) {
      console.error('Watchlist fetch error', e);
      toast.error('Failed to fetch watchlist');
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
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

  const handleAdd = async (symbol) => {
    setAddingSymbol(symbol);
    try {
      await api.post('/watchlist/add', { symbol });
      toast.success(`${symbol} added to watchlist`);
      setSearchQuery('');
      setSearchResults([]);
      await fetchWatchlist();
    } catch (e) {
      toast.error(`Failed to add ${symbol}`);
    } finally {
      setAddingSymbol(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (searchResults.length > 0) {
        handleAdd(searchResults[0].symbol);
      } else if (searchQuery.trim()) {
        handleAdd(searchQuery.toUpperCase());
      }
    }
  };

  const handleRemove = async (symbol) => {
    try {
      await api.delete(`/watchlist/remove/${symbol}`);
      toast.success(`${symbol} removed from watchlist`);
      await fetchWatchlist();
    } catch (e) {
      toast.error(`Failed to remove ${symbol}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
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
            placeholder="Search stocks to add (e.g. RELIANCE.NS)..."
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
                  className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors flex justify-between items-center"
                  onClick={() => handleAdd(res.symbol)}
                >
                  <div>
                    <div className="font-bold text-slate-800 font-mono">{res.symbol}</div>
                    <div className="text-xs text-slate-500 truncate mt-1">{res.shortname || res.longname}</div>
                  </div>
                  {addingSymbol === res.symbol && (
                    <div className="text-xs font-bold text-emerald-600 animate-pulse">Adding...</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="h-auto min-h-[400px] flex flex-col">
          <CardHeader title="My Watchlist" />
          
          <div className="flex-1 divide-y divide-slate-100">
            {loadingInitial ? (
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            ) : liveWatchlist.length === 0 ? (
              <div className="p-12 text-slate-500 text-sm text-center font-medium">Your watchlist is empty. Search above to add stocks.</div>
            ) : liveWatchlist.map((quote, idx) => (
              <WatchlistItem 
                key={quote.symbol + '-' + idx} 
                quote={quote} 
                showSector={true}
                showRemoveButton={true}
                onRemove={handleRemove}
                onClick={() => navigate(`/stock/${quote.symbol}`)} 
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Watchlist;
