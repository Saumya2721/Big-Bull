import { usePriceFlash } from '../hooks/usePriceFlash';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

const WatchlistItem = ({ quote, onClick, onRemove, showRemoveButton = false, showSector = false }) => {
  const flashClass = usePriceFlash(quote.regularMarketPrice);
  const changePercent = quote.regularMarketChangePercent || 0;
  const changeColor = changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500';

  return (
    <div
      onClick={onClick}
      className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer group transition-all duration-200"
    >
      <div>
        <h4 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{quote.symbol}</h4>
        <div className="text-xs text-slate-500 font-mono truncate max-w-[120px] mt-0.5">
          {quote.shortName || quote.longName}
        </div>
        {showSector && quote.sector && (
          <div className="mt-1">
            <Badge variant="slate">{quote.sector}</Badge>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <span className={`block text-sm font-black font-mono ${flashClass || 'text-slate-800'}`}>
            ₹{quote.regularMarketPrice?.toFixed(2)}
          </span>
          <span className={`block text-xs font-bold font-mono bg-slate-50 px-1 py-0.5 rounded mt-0.5 text-right ${changeColor}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
        {showRemoveButton && (
          <Button
            variant="ghost"
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              if (onRemove) onRemove(quote.symbol);
            }}
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
};

export default WatchlistItem;
