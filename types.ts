export interface ProcessItem {
  id: string;
  name: string;
  pid: number;
  memoryMB: number;
  cpuPercent: number;
  description?: string;
  category?: 'System' | 'User' | 'Background' | 'Bloatware' | 'Unknown';
  safeToKill?: boolean;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  reasoning?: string;
  groundingUrl?: string; // If search was used
}

export interface SystemStats {
  totalMemoryGB: number;
  usedMemoryGB: number;
  usedPercent: number;
  processCount: number;
}

export enum ScanMode {
  QUICK = 'QUICK',
  DEEP_THINKING = 'DEEP_THINKING',
}