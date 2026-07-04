export const Card = ({ children, className = '', hover = false, ...props }) => {
  const hoverClass = hover ? 'hover:-translate-y-1 hover:shadow-md transition-all duration-300' : '';
  return (
    <div className={`bg-white border border-slate-200 shadow-sm rounded-2xl ${hoverClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', title, subtitle, rightElement }) => {
  return (
    <div className={`relative z-10 px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center ${className}`}>
      <div>
        {title && <h3 className="text-sm font-bold uppercase text-slate-700 tracking-wider">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
        {children}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </div>
  );
};

export const CardContent = ({ children, className = '' }) => {
  return <div className={`relative z-10 p-6 ${className}`}>{children}</div>;
};
