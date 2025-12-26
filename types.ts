export type TempStatus = 'Normal' | 'High' | 'Overheat' | 'Offline';

export interface Reading {
  timestamp: string; // ISO string
  temp: number;
}

export interface Sensor {
  id: string;
  name: string;
  location: string;
  currentTemp: number | null;
  status: TempStatus;
  history: Reading[];
  forceFailure: boolean;
  overAlertCount: number; // To track the 3-strike rule
  lastUpdated: string;
}

export interface SystemStats {
  totalReadings: number;
  avgTemp: number;
  maxTemp: number;
  highCount: number;
  overCount: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}