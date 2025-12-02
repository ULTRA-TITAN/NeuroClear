import React from 'react';

interface Props {
  totalGB: number;
  usedGB: number;
  percent: number;
  isLightMode: boolean;
}

export const MemoryGauge: React.FC<Props> = ({ totalGB, usedGB, percent, isLightMode }) => {
  // Determine color based on usage
  let colorClass = "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]";
  if (percent > 60) colorClass = "bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]";
  if (percent > 85) colorClass = "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]";

  const textColor = isLightMode ? "text-gray-800" : "text-white";
  const subTextColor = isLightMode ? "text-gray-500" : "text-gray-400";
  const labelColor = isLightMode ? "text-gray-500" : "text-gray-400";

  return (
    <div className={`glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] transition-all duration-300 ${
        isLightMode ? 'light-glass' : 'dark-glass'
    }`}>
      
      {/* Background Pulse Effect if high usage */}
      {percent > 80 && (
        <div className={`absolute inset-0 animate-pulse-slow z-0 ${isLightMode ? 'bg-red-500/5' : 'bg-red-500/10'}`} />
      )}

      <div className="relative z-10 w-full">
        <div className="flex justify-between items-end mb-4">
            <div>
                <h3 className={`${labelColor} text-xs font-bold tracking-wider uppercase mb-1`}>Physical Memory</h3>
                <div className={`text-3xl font-mono font-bold ${textColor} tracking-tight`}>
                    {usedGB.toFixed(1)} <span className={`text-lg ${subTextColor} font-normal`}>/ {totalGB} GB</span>
                </div>
            </div>
            <div className={`text-5xl font-bold font-mono ${textColor} opacity-90`}>
                {percent.toFixed(0)}<span className="text-2xl opacity-60">%</span>
            </div>
        </div>

        {/* Progress Bar Container */}
        <div className={`h-5 w-full rounded-full overflow-hidden relative shadow-inner ${
            isLightMode ? 'bg-gray-200 border-gray-300' : 'bg-black/40 border-white/5 border'
        }`}>
            {/* Liquid Bar */}
            <div 
                className={`h-full transition-all duration-1000 ease-out ${colorClass} relative`}
                style={{ width: `${percent}%` }}
            >
                {/* Shine effect on bar */}
                <div className="absolute top-0 right-0 bottom-0 w-[40px] bg-gradient-to-r from-transparent to-white/30 skew-x-12 animate-shimmer" />
            </div>
        </div>

        <div className={`flex justify-between mt-4 text-xs ${subTextColor} font-mono uppercase tracking-tight`}>
            <span>System Commit</span>
            <span>Cached: {(totalGB * 0.2).toFixed(1)} GB</span>
        </div>
      </div>
    </div>
  );
};