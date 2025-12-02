import React, { useState, useEffect, useMemo } from 'react';
import { generateMockProcesses } from './constants';
import { ProcessItem, SystemStats, ScanMode } from './types';
import { MemoryGauge } from './components/MemoryGauge';
import { ProcessRow } from './components/ProcessRow';
import { analyzeProcessList } from './services/geminiService';
import { PYTHON_SOURCE } from './desktopAppSource';

const TOTAL_RAM_GB = 32;

export default function App() {
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(ScanMode.QUICK);
  const [analyzed, setAnalyzed] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  
  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Initialize with mock data
  useEffect(() => {
    setProcesses(generateMockProcesses());
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setIsLightMode(true);
    }
  }, []);

  // Update Body Class
  useEffect(() => {
      document.body.classList.remove('light-mode', 'dark-mode');
      document.body.classList.add(isLightMode ? 'light-mode' : 'dark-mode');
  }, [isLightMode]);

  // Derived Stats
  const stats: SystemStats = useMemo(() => {
    const totalUsedMB = processes.reduce((acc, p) => acc + p.memoryMB, 0);
    const usedGB = totalUsedMB / 1024;
    return {
      totalMemoryGB: TOTAL_RAM_GB,
      usedMemoryGB: usedGB,
      usedPercent: (usedGB / TOTAL_RAM_GB) * 100,
      processCount: processes.length,
    };
  }, [processes]);

  const handleScan = async () => {
    if (!apiKey) {
      alert("Please ensure API_KEY is set in your environment variables to use Gemini.");
      return;
    }

    setIsScanning(true);
    setNotification({ msg: "Gemini is analyzing processes...", type: 'info' });

    try {
      const toAnalyze = processes.slice(0, 15);
      const remaining = processes.slice(15);
      
      const analyzedResults = await analyzeProcessList(toAnalyze, scanMode);
      
      setProcesses([...analyzedResults, ...remaining]);
      setAnalyzed(true);
      
      const newSelected = new Set<string>();
      analyzedResults.forEach(p => {
        if (p.safeToKill && (p.category === 'Bloatware' || p.category === 'Background')) {
          newSelected.add(p.id);
        }
      });
      setSelectedIds(newSelected);
      setNotification({ msg: "Analysis Complete. Recommended actions selected.", type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ msg: "Analysis failed. Check console.", type: 'info' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const initiateClean = () => {
      if (selectedIds.size === 0) return;
      setShowConfirmModal(true);
  }

  const confirmClean = () => {
    const idsToRemove = Array.from(selectedIds);
    const memoryFreed = processes
      .filter(p => selectedIds.has(p.id))
      .reduce((acc, p) => acc + p.memoryMB, 0);

    setProcesses(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setShowConfirmModal(false);
    setNotification({ 
      msg: `Freed ${memoryFreed.toLocaleString()} MB of RAM!`, 
      type: 'success' 
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(PYTHON_SOURCE);
    setNotification({ msg: "Python source code copied to clipboard!", type: 'success' });
  };

  const selectedProcesses = processes.filter(p => selectedIds.has(p.id));
  const totalSelectedMemory = selectedProcesses.reduce((acc, p) => acc + p.memoryMB, 0);

  return (
    <div className={`relative min-h-screen font-sans transition-colors duration-500 ${isLightMode ? 'selection:bg-blue-200 selection:text-blue-900' : 'selection:bg-neon-cyan selection:text-black'}`}>
      {/* Background Elements */}
      <div className="liquid-bg dark-liquid" />
      <div className="liquid-bg light-liquid" />

      {/* Code Modal */}
      {showCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#1a1a1a] w-full max-w-4xl h-[80vh] rounded-2xl border border-white/10 flex flex-col shadow-2xl animate-scale-in">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white">NeuroClear Desktop Source</h2>
                        <p className="text-xs text-gray-400">neuroclear_desktop.py</p>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={copyCode} className="px-3 py-1.5 bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 rounded text-sm font-medium transition-colors">
                            Copy Code
                        </button>
                        <button onClick={() => setShowCode(false)} className="px-3 py-1.5 hover:bg-white/10 rounded text-gray-400">
                            Close
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-black/50">
                    <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap select-all">
                        {PYTHON_SOURCE}
                    </pre>
                </div>
                <div className="p-4 bg-[#252525] border-t border-white/10 text-xs text-gray-400">
                    <span className="font-bold text-white">Dependencies:</span> pip install customtkinter psutil google-generativeai
                </div>
            </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowConfirmModal(false)} />
              <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[80vh] ${
                  isLightMode ? 'bg-white text-gray-900' : 'bg-[#18181b] text-white border border-white/10'
              }`}>
                  <div className={`p-6 border-b ${isLightMode ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-white/5'}`}>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Confirm Termination
                      </h3>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                      <p className={`text-sm mb-4 ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>
                          Are you sure you want to terminate <strong className={isLightMode ? 'text-gray-900' : 'text-white'}>{selectedProcesses.length}</strong> processes? 
                          This will free approximately <strong className="text-emerald-500">{totalSelectedMemory.toLocaleString()} MB</strong> of RAM.
                      </p>
                      
                      <div className={`rounded-lg p-3 text-xs mb-4 ${isLightMode ? 'bg-gray-100' : 'bg-black/30'}`}>
                          <ul className="space-y-1 max-h-32 overflow-y-auto">
                              {selectedProcesses.map(p => (
                                  <li key={p.id} className="flex justify-between">
                                      <span>{p.name}</span>
                                      <span className="opacity-60">{p.memoryMB} MB</span>
                                  </li>
                              ))}
                          </ul>
                      </div>

                      <div className={`text-xs p-3 rounded border ${
                          isLightMode ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-orange-900/20 text-orange-200 border-orange-500/20'
                      }`}>
                          <strong>Warning:</strong> Unsaved data in these applications will be lost immediately.
                      </div>
                  </div>

                  <div className={`p-4 flex gap-3 justify-end border-t ${isLightMode ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-white/5'}`}>
                      <button 
                          onClick={() => setShowConfirmModal(false)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isLightMode ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-300'
                          }`}
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmClean}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                      >
                          Yes, Kill Processes
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-6xl mx-auto p-4 md:p-8 relative z-10">
        
        {/* Top Bar with Environment Warning & Theme Toggle */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center">
             <div className={`flex-1 p-3 rounded-xl border flex items-center gap-3 backdrop-blur-sm transition-all ${
                 isLightMode ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-orange-500/10 border-orange-500/30 text-orange-200'
             }`}>
                <div className={`p-2 rounded-lg ${isLightMode ? 'bg-orange-100' : 'bg-orange-500/20'}`}>
                    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-xs font-bold uppercase tracking-wide">Browser Environment Detected</h3>
                    <p className="text-[10px] opacity-80 leading-tight mt-0.5">
                        Running in Simulation Mode. Browsers cannot terminate OS processes.
                    </p>
                </div>
                <button 
                    onClick={() => setShowCode(true)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all shadow-sm ${
                        isLightMode ? 'bg-white text-orange-600 hover:bg-orange-50 border border-orange-200' : 'bg-white text-black hover:bg-orange-100'
                    }`}
                >
                    Get Desktop App
                </button>
            </div>

            <button 
                onClick={() => setIsLightMode(!isLightMode)}
                className={`p-3 rounded-xl border backdrop-blur-md transition-all ${
                    isLightMode 
                        ? 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white shadow-sm' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
            >
                {isLightMode ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                )}
            </button>
        </div>

        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-slide-up">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${
                    isLightMode 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30' 
                    : 'bg-gradient-to-br from-neon-cyan to-blue-600 shadow-[0_0_15px_rgba(0,243,255,0.3)]'
                }`}>
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div>
                    <h1 className={`text-3xl font-bold tracking-tight ${isLightMode ? 'text-gray-900' : 'text-white'}`}>NeuroClear</h1>
                    <p className={`text-xs font-mono tracking-widest uppercase mt-1 ${isLightMode ? 'text-gray-500' : 'text-gray-400'}`}>AI-Powered System Optimizer</p>
                </div>
            </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Memory Gauge */}
            <div className="md:col-span-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <MemoryGauge 
                    totalGB={stats.totalMemoryGB} 
                    usedGB={stats.usedMemoryGB} 
                    percent={stats.usedPercent} 
                    isLightMode={isLightMode}
                />
            </div>

            {/* Controls */}
            <div className={`glass-panel p-6 rounded-2xl flex flex-col justify-between animate-slide-up transition-all duration-300 ${isLightMode ? 'light-glass' : 'dark-glass'}`} style={{ animationDelay: '0.2s' }}>
                <div>
                    <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isLightMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Scanner Config</h2>
                    
                    <div className="space-y-3">
                        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            scanMode === ScanMode.QUICK 
                                ? (isLightMode ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white/10 border-neon-cyan/50') 
                                : (isLightMode ? 'border-gray-200 hover:bg-gray-50' : 'border-white/10 hover:bg-white/5')
                        }`}>
                            <input 
                                type="radio" 
                                name="mode" 
                                checked={scanMode === ScanMode.QUICK} 
                                onChange={() => setScanMode(ScanMode.QUICK)}
                                className="hidden"
                            />
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                scanMode === ScanMode.QUICK 
                                    ? (isLightMode ? 'border-blue-500' : 'border-neon-cyan') 
                                    : 'border-gray-500'
                            }`}>
                                {scanMode === ScanMode.QUICK && <div className={`w-2 h-2 rounded-full ${isLightMode ? 'bg-blue-500' : 'bg-neon-cyan'}`} />}
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Flash Scan</div>
                                <div className={`text-[10px] ${isLightMode ? 'text-gray-500' : 'text-gray-400'}`}>Gemini 2.5 Flash • Fast Analysis</div>
                            </div>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                             scanMode === ScanMode.DEEP_THINKING 
                                ? (isLightMode ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white/10 border-neon-pink/50') 
                                : (isLightMode ? 'border-gray-200 hover:bg-gray-50' : 'border-white/10 hover:bg-white/5')
                        }`}>
                            <input 
                                type="radio" 
                                name="mode" 
                                checked={scanMode === ScanMode.DEEP_THINKING} 
                                onChange={() => setScanMode(ScanMode.DEEP_THINKING)}
                                className="hidden"
                            />
                             <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                 scanMode === ScanMode.DEEP_THINKING 
                                    ? (isLightMode ? 'border-purple-500' : 'border-neon-pink') 
                                    : 'border-gray-500'
                             }`}>
                                {scanMode === ScanMode.DEEP_THINKING && <div className={`w-2 h-2 rounded-full ${isLightMode ? 'bg-purple-500' : 'bg-neon-pink'}`} />}
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Deep Thinking</div>
                                <div className={`text-[10px] ${isLightMode ? 'text-gray-500' : 'text-gray-400'}`}>Gemini 3 Pro • Reasoning Enabled</div>
                            </div>
                        </label>
                    </div>
                </div>

                <button 
                    onClick={handleScan}
                    disabled={isScanning}
                    className={`mt-6 w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg ${
                        isScanning 
                        ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed border border-gray-500/10' 
                        : isLightMode 
                            ? 'bg-gray-900 text-white hover:bg-black hover:shadow-xl hover:scale-[1.02]' 
                            : 'bg-white text-black hover:bg-neon-cyan hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:scale-[1.02]'
                    }`}
                >
                    {isScanning ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            Analyzing...
                        </span>
                    ) : 'Start System Scan'}
                </button>
            </div>
        </div>

        {/* Results Area */}
        <div className={`glass-panel rounded-2xl overflow-hidden min-h-[500px] flex flex-col transition-all duration-300 animate-slide-up ${isLightMode ? 'light-glass' : 'dark-glass'}`} style={{ animationDelay: '0.3s' }}>
            <div className={`p-5 border-b flex items-center justify-between ${isLightMode ? 'bg-gray-50/50 border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <div className="flex items-center gap-4">
                    <h3 className={`font-bold ${isLightMode ? 'text-gray-800' : 'text-white'}`}>Active Processes</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${isLightMode ? 'bg-gray-200 text-gray-600' : 'bg-white/10 text-gray-400'}`}>
                        {processes.length} Detected
                    </span>
                </div>
                
                <div className={`flex items-center gap-4 transition-all duration-300 ${selectedIds.size > 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
                    <span className={`text-sm font-medium ${isLightMode ? 'text-red-600' : 'text-red-400'}`}>{selectedIds.size} Selected</span>
                    <button 
                        onClick={initiateClean}
                        className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                    >
                        KILL TASKS
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 relative">
                 {processes.map((proc, idx) => (
                     <ProcessRow 
                        key={proc.id} 
                        item={proc} 
                        index={idx}
                        isSelected={selectedIds.has(proc.id)} 
                        onToggle={handleToggleSelect}
                        isLightMode={isLightMode}
                    />
                 ))}
                 
                 {!analyzed && !isScanning && (
                     <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                         <div className={`text-center p-6 rounded-2xl backdrop-blur-sm ${isLightMode ? 'bg-white/60' : 'bg-black/40'}`}>
                             <p className={`mb-2 font-medium ${isLightMode ? 'text-gray-500' : 'text-gray-400'}`}>System map loaded. Run scan to identify bloatware.</p>
                             <div className={`text-xs ${isLight