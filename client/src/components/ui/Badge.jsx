export const Badge = ({ children, variant = 'slate', className = '' }) => {
  const baseClass = "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider inline-block border";
  
  const variants = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
    slate: "bg-slate-100 text-slate-500 border-slate-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200"
  };

  return (
    <span className={`${baseClass} ${variants[variant] || variants.slate} ${className}`}>
      {children}
    </span>
  );
};
