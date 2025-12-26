import React, { useEffect, useMemo } from 'react';
import { Sensor } from '../types';
import { calculateLinearRegression } from '../utils/simulation';
import { announce } from '../utils/sound';
import { Brain, X, TrendingUp, TrendingDown, Minus, Volume2 } from 'lucide-react';

interface AiReportModalProps {
  sensor: Sensor | null;
  isOpen: boolean;
  onClose: () => void;
  isVoiceEnabled: boolean;
}

const AiReportModal: React.FC<AiReportModalProps> = ({ sensor, isOpen, onClose, isVoiceEnabled }) => {
  
  // Use useMemo to keep calculations stable for effects
  const reportData = useMemo(() => {
    if (!sensor) return null;

    const historyTemps = sensor.history.map(h => h.temp);
    const result = calculateLinearRegression(historyTemps);

    let trend = "Stable";
    let trendColor = "text-green-400";
    let TrendIcon = Minus;
    let predictionText = "Data insufficient for prediction.";
    let riskLevel = "Low";
    let riskColor = "bg-green-500/20 text-green-400 border-green-500/50";
    let spokenSummary = `Analysis for ${sensor.name}. Data is insufficient for a complete prediction.`;

    if (result) {
      const { slope, predictedTemp } = result;
      
      if (slope > 0.5) {
        trend = "Rapid Heating (Danger)";
        trendColor = "text-red-500";
        TrendIcon = TrendingUp;
      } else if (slope > 0.1) {
        trend = "Slow Heating";
        trendColor = "text-orange-400";
        TrendIcon = TrendingUp;
      } else if (slope < -0.1) {
        trend = "Cooling Down";
        trendColor = "text-blue-400";
        TrendIcon = TrendingDown;
      }

      if (predictedTemp >= 70) {
        riskLevel = "CRITICAL";
        riskColor = "bg-red-500/20 text-red-500 border-red-500/50";
        predictionText = `Model predicts OVERHEAT within 1 minute (~${predictedTemp.toFixed(1)}°C). Immediate shutdown recommended.`;
        spokenSummary = `Critical Warning. Analysis for ${sensor.name} shows rapid heating. The model predicts overheating within one minute reaching ${predictedTemp.toFixed(0)} degrees. Immediate shutdown recommended.`;
      } else if (predictedTemp >= 60) {
        riskLevel = "Warning";
        riskColor = "bg-orange-500/20 text-orange-400 border-orange-500/50";
        predictionText = `Model predicts high temperature range (~${predictedTemp.toFixed(1)}°C).`;
        spokenSummary = `Warning. Analysis for ${sensor.name} shows a rising trend. Predicted temperature will reach ${predictedTemp.toFixed(0)} degrees.`;
      } else {
        predictionText = `Predicted temperature stable at ~${predictedTemp.toFixed(1)}°C.`;
        spokenSummary = `Status Report for ${sensor.name}. Operations are normal. Temperature is stable at approximately ${predictedTemp.toFixed(0)} degrees.`;
      }
    }

    return { trend, trendColor, TrendIcon, predictionText, riskLevel, riskColor, spokenSummary };
  }, [sensor]);

  // Speak when modal opens
  useEffect(() => {
    if (isOpen && reportData && isVoiceEnabled) {
      // Small delay to feel natural after click
      const timer = setTimeout(() => {
        announce(reportData.spokenSummary, true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reportData, isVoiceEnabled]);

  if (!isOpen || !sensor || !reportData) return null;
  
  const { trend, trendColor, TrendIcon, predictionText, riskLevel, riskColor, spokenSummary } = reportData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-purple-500/50 rounded-xl shadow-2xl max-w-lg w-full transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-purple-900/50 rounded-lg">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            AI Predictive Maintenance
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => announce(spokenSummary, true)}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors text-purple-400 hover:text-white"
              title="Replay Voice Analysis"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Target Device</div>
            <div className="text-lg font-mono text-white">{sensor.name} <span className="text-gray-500">({sensor.location})</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
              <div className="text-sm text-gray-400 mb-1">Current Trend</div>
              <div className={`flex items-center gap-2 font-bold ${trendColor}`}>
                <TrendIcon className="w-5 h-5" />
                {trend}
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${riskColor}`}>
              <div className="text-sm opacity-80 mb-1">Risk Assessment</div>
              <div className="font-bold">{riskLevel}</div>
            </div>
          </div>

          <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
             <div className="text-sm text-purple-400 font-semibold mb-2">Linear Regression Model Analysis</div>
             <p className="text-gray-300 leading-relaxed text-sm">
               {predictionText}
             </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-950/50 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiReportModal;