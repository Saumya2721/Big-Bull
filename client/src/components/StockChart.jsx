import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

const StockChart = ({ historicalData }) => {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !historicalData || historicalData.length === 0) return;

    // Instantiate premium responsive light theme charts layout
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#64748b', // slate-500
      },
      grid: {
        vertLines: { color: '#f1f5f9' }, // slate-100
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#e2e8f0' }, // slate-200
      timeScale: { borderColor: '#e2e8f0' },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(historicalData);

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [historicalData]);

  return <div ref={chartContainerRef} className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200" />;
};

export default StockChart;