export const Skeleton = ({ className = '', rounded = 'rounded-xl' }) => {
  return (
    <div className={`animate-pulse bg-slate-200 ${rounded} ${className}`}></div>
  );
};
