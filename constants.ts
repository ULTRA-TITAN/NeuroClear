import { ProcessItem } from './types';

const SYSTEM_PROCESSES = [
  'svchost.exe', 'System', 'Registry', 'smss.exe', 'csrss.exe', 
  'wininit.exe', 'services.exe', 'lsass.exe', 'explorer.exe', 
  'Memory Compression', 'spoolsv.exe', 'RuntimeBroker.exe'
];

const USER_APPS = [
  'chrome.exe', 'spotify.exe', 'discord.exe', 'code.exe', 
  'steam.exe', 'slack.exe', 'obs64.exe', 'firefox.exe', 'msedge.exe'
];

const BLOATWARE_CANDIDATES = [
  'AdobeUpdateService.exe', 'GoogleCrashHandler.exe', 'OneDrive.exe',
  'Cortana.exe', 'YourPhone.exe', 'GameBar.exe', 'SkypeApp.exe',
  'Teams.exe', 'DropboxUpdate.exe'
];

export const generateMockProcesses = (): ProcessItem[] => {
  const processes: ProcessItem[] = [];
  let idCounter = 1;

  // Add Critical System Processes (High RAM for some)
  SYSTEM_PROCESSES.forEach(name => {
    processes.push({
      id: `proc-${idCounter++}`,
      name,
      pid: Math.floor(Math.random() * 5000) + 100,
      memoryMB: name === 'svchost.exe' ? Math.floor(Math.random() * 800) + 50 : Math.floor(Math.random() * 200) + 10,
      cpuPercent: Math.random() * 2,
      riskLevel: 'Critical',
      category: 'System',
      safeToKill: false,
      description: 'Windows System Process',
    });
  });

  // Add User Apps (Heavy RAM)
  USER_APPS.forEach(name => {
    // Add multiple instances for browsers like Chrome
    const count = name.includes('chrome') || name.includes('edge') ? Math.floor(Math.random() * 6) + 2 : 1;
    for (let i = 0; i < count; i++) {
        processes.push({
            id: `proc-${idCounter++}`,
            name,
            pid: Math.floor(Math.random() * 20000) + 5000,
            memoryMB: Math.floor(Math.random() * 1500) + 100,
            cpuPercent: Math.random() * 15,
            riskLevel: 'Low', // Initially assumed low
        });
    }
  });

  // Add Bloatware
  BLOATWARE_CANDIDATES.forEach(name => {
      if (Math.random() > 0.3) { // 70% chance to appear
        processes.push({
            id: `proc-${idCounter++}`,
            name,
            pid: Math.floor(Math.random() * 20000) + 5000,
            memoryMB: Math.floor(Math.random() * 300) + 20,
            cpuPercent: 0,
            riskLevel: 'Medium', // Needs analysis
        });
      }
  });

  // Sort by Memory Usage Descending
  return processes.sort((a, b) => b.memoryMB - a.memoryMB);
};