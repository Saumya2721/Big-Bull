export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClass = "px-4 py-2 font-bold rounded-xl cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-300 flex items-center justify-center text-sm";
  
  const variants = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-600 ring-1 ring-emerald-600/50 disabled:bg-emerald-300 disabled:ring-0 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed",
    destructive: "bg-rose-500 text-white hover:bg-rose-600 ring-1 ring-rose-600/50 disabled:bg-rose-300 disabled:ring-0 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
    ghost: "bg-transparent text-slate-500 border border-transparent shadow-none hover:shadow-none hover:bg-slate-50 hover:text-slate-800 hover:-translate-y-0"
  };

  return (
    <button className={`${baseClass} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};
