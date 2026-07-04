import { Card, CardContent } from './Card';

export const StatCard = ({ title, value, variant = 'slate', children, className = '' }) => {
  const valueColor = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500',
    purple: 'text-purple-500',
    blue: 'text-blue-500'
  }[variant] || 'text-slate-800';

  return (
    <Card hover className={className}>
      <CardContent className="relative">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
        <h3 className={`text-2xl lg:text-3xl font-black mt-1 ${valueColor}`}>{value}</h3>
        {children}
      </CardContent>
    </Card>
  );
};
