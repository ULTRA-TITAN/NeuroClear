import React, { useState } from 'react';
import { ProcessItem } from '../types';
import { lookupUnknownProcess } from '../services/geminiService';

interface Props {
  item: ProcessItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
  isLightMode: boolean;
  index: number;
}

export const ProcessRow: React.FC<Props> = ({ item, isSelected, onToggle, isLightMode, index }) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [extraDetails, setExtraDetails] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'Critical': return 'text-red-500 border-red-500/30 bg-red-500/10';
      case 'High': return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
      case 'Medium': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
      case 'Low': return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      default: return isLightMode ? 'text-gray-500 border-gray-300' : 'text-gray-400 border-gray-600';
    }
  };

  const handleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanding(!isExpanding);
    
    if (!isExpanding && !extraDetails && !item.description) {
      setLoadingDetails(true);
      const details = await lookupUnknownProcess(item.name);
      setExtraDetails(details);
      setLoadingDetails(false);
    }
  };

  const baseClasses = isLightMode 
    ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800 shadow-sm' 
    : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-200';
    
  const selectedClasses = isLightMode
    ? 'bg-red-50 border-red-200'
    : 'bg-red-500/10 border-red-500/30';

  return (
    <div 
      className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-300 animate-slide-up ${
        isSelected ? selectedClasses : baseClasses
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <button
          onClick={() => item.riskLevel !== 'Critical' && onToggle(item.id)}
          disabled={item.riskLevel === 'Critical'}
          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all duration-200 ${
            isSelected 
              ? 'bg-red-500 border-red-500 text-white shadow-md scale-110' 
              : isLightMode ? 'border-gray-300 hover:border-gray-400 bg-gray-50' : 'border-white/30 hover:border-white/60'
          } ${item.riskLevel === 'Critical' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isSelected && (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>

        {/* Process Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h4 className={`font-mono text-sm font-semibold truncate ${isLightMode ? 'text-gray-900' : 'text-gray-100'}`}>
                {item.name}
            </h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isLightMode ? 'bg-gray-100 text-gray-500' : 'bg-black/30 text-gray-500'}`}>
                PID: {item.pid}
            </span>
          </div>
          {item.description && (
             <p className={`text-xs mt-1 truncate ${isLightMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {item.description}
             </p>
          )}
        </div>

        {/* Stats */}
        <div className="text-right flex flex-col items-end gap-1">
          <div className={`font-mono text-sm font-bold ${isLightMode ? 'text-blue-600' : 'text-neon-cyan'}`}>
            {item.memoryMB.toLocaleString()} MB
          </div>
          <div className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRiskColor(item.riskLevel)}`}>
            {item.riskLevel || 'Unknown'}
          </div>
        </div>
        
        {/* Info Button */}
        <button 
            onClick={handleExpand}
            className={`p-1.5 rounded-full transition-colors ${
                isLightMode ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-600' : 'hover:bg-white/10 text-gray-500 hover:text-white'
            }`}
        >
            <svg className={`w-4 h-4 transform transition-transform duration-300 ${isExpanding ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanding && (
        <div className={`mt-4 pt-4 border-t animate-fade-in ${isLightMode ? 'border-gray-100 text-gray-600' : 'border-white/10 text-gray-300'}`}>
            <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                    <span className={`block mb-1.5 font-medium uppercase tracking-wider text-[10px] ${isLightMode ? 'text-gray-400' : 'text-gray-500'}`}>Category</span>
                    <span className={`font-medium text-sm ${isLightMode ? 'text-gray-800' : 'text-white'}`}>{item.category || 'Scanning...'}</span>
                </div>
                <div>
                    <span className={`block mb-1.5 font-medium uppercase tracking-wider text-[10px] ${isLightMode ? 'text-gray-400' : 'text-gray-500'}`}>Kill Safety</span>
                    <span className={`font-medium text-sm px-2 py-0.5 rounded-md inline-block ${item.safeToKill ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {item.safeToKill ? 'Safe to Terminate' : 'Unsafe / System Critical'}
                    </span>
                </div>
            </div>
            
            {item.reasoning && (
                <div className="mt-4">
                    <span className={`block mb-1.5 font-medium uppercase tracking-wider text-[10px] ${isLightMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Reasoning</span>
                    <p className="leading-relaxed opacity-90">{item.reasoning}</p>
                </div>
            )}

            {loadingDetails && (
                <div className={`mt-4 flex items-center gap-2 ${isLightMode ? 'text-blue-600' : 'text-neon-cyan'}`}>
                    <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Searching knowledge base...
                </div>
            )}
            
            {extraDetails && (
                <div className={`mt-4 p-3 rounded-lg border ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                    <span className={`block mb-2 text-[10px] uppercase tracking-wider font-bold ${isLightMode ? 'text-pink-600' : 'text-neon-pink'}`}>Search Grounding Result</span>
                    <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{extraDetails}</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};