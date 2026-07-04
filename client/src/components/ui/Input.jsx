export const Input = ({ label, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
      <input 
        className="block w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:outline-none text-sm transition-shadow shadow-inner disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100"
        {...props} 
      />
    </div>
  );
};

export const Select = ({ label, children, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
      <select 
        className="block w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:outline-none text-sm transition-shadow shadow-inner disabled:bg-slate-100"
        {...props} 
      >
        {children}
      </select>
    </div>
  );
};
