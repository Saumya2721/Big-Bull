import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `text-sm font-bold transition-colors ${isActive ? 'text-emerald-600 underline decoration-2 underline-offset-4' : 'text-slate-500 hover:text-emerald-600'}`;
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm select-none">
      <div className="flex items-center space-x-6">
        <Link to="/" className="text-xl font-black bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent tracking-wider uppercase decoration-none drop-shadow-sm">
          BigBull
        </Link>
        <Badge variant="emerald" className="hidden md:inline">
          Live Engine
        </Badge>
      </div>

      <div className="hidden md:flex items-center space-x-8">
        <Link to="/" className={getLinkClass('/')}>Dashboard</Link>
        <Link to="/portfolio" className={getLinkClass('/portfolio')}>Portfolio</Link>
        <Link to="/watchlist" className={getLinkClass('/watchlist')}>Watchlist</Link>
        <Link to="/orders" className={getLinkClass('/orders')}>Orders</Link>
      </div>

      <div className="flex items-center space-x-6 text-sm">
        <span className="text-slate-500 hidden sm:inline">
          Acc ID: <strong className="text-slate-800 font-mono bg-slate-100 px-2 py-1 rounded">#{user?.UserId?.slice(0, 8)}</strong>
        </span>
        <Button variant="ghost" onClick={logout} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5">
          Sign Out
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;