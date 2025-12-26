import { Sensor, TempStatus } from '../types';

// Constants matching Python logic
export const NORMAL_MAX = 60;
export const WARNING_MIN = 70;
export const MAX_HISTORY_POINTS = 50;

export const getStatus = (temp: number | null): TempStatus => {
  if (temp === null) return 'Offline';
  if (temp >= WARNING_MIN) return 'Overheat';
  if (temp > NORMAL_MAX) return 'High';
  return 'Normal';
};

export const generateTemp = (currentSensor: Sensor, ambientTemp: number): number => {
  if (currentSensor.forceFailure) {
    // Failure mode: 90-98 degrees
    return Number((Math.random() * (98 - 90) + 90).toFixed(1));
  }

  // Normal mode: Ambient + Internal Heat + Fluctuation
  // Internal heat varies by sensor type logic (simulated random range for base)
  const internalHeatBase = 25; // Average internal heat
  const internalHeatVar = Math.random() * 10 - 5; // +/- 5 degrees variation
  
  let totalTemp = ambientTemp + internalHeatBase + internalHeatVar;
  
  // 25% chance of spike
  if (Math.random() < 0.25) {
    totalTemp += Math.random() * 5 - 2;
  }

  // Clamp to realistic minimum
  if (totalTemp < ambientTemp) totalTemp = ambientTemp;

  return Number(totalTemp.toFixed(1));
};

export const calculateLinearRegression = (data: number[]) => {
  if (data.length < 5) return null;

  const n = data.length;
  // X axis is just indices 0, 1, 2...
  const xSum = (n * (n - 1)) / 2;
  const ySum = data.reduce((a, b) => a + b, 0);
  
  const xySum = data.reduce((sum, y, x) => sum + x * y, 0);
  const xxSum = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;

  // Predict 20 steps ahead
  const futureX = n + 20;
  const predictedTemp = slope * futureX + intercept;

  return { slope, predictedTemp };
};
