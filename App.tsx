import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sensor, SystemStats, LogEntry } from './types';
import { getStatus, generateTemp, NORMAL_MAX, WARNING_MIN, MAX_HISTORY_POINTS } from './utils/simulation';
import { initAudio, playClickSound, startSiren, stopSiren, announce } from './utils/sound';
import SensorTable from './components/SensorTable';
import TempChart from './components/TempChart';
import AiReportModal from './components/AiReportModal';
import { 
  Play, Square, Download, Trash2, Brain, Volume2, VolumeX, 
  Activity, LayoutDashboard, Terminal, Mic, MicOff, Sun, CloudRain
} from 'lucide-react';

// Initial Data
const INITIAL_SENSORS: Sensor[] = [
  { id: 'TS-001', name: 'Container Crane', location: 'Dock A', currentTemp: null, status: 'Offline', history: [], forceFailure: false, overAlertCount: 0, lastUpdated: '' },
  { id: 'TS-002', name: 'Conveyor Belt', location: 'Storage B', currentTemp: null, status: 'Offline', history: [], forceFailure: false, overAlertCount: 0, lastUpdated: '' },
  { id: 'TS-003', name: 'Diesel Generator', location: 'Power C', currentTemp: null, status: 'Offline', history: [], forceFailure: false, overAlertCount: 0, lastUpdated: '' },
  { id: 'TS-004', name: 'Automated AGV', location: 'Loading D', currentTemp: null, status: 'Offline', history: [], forceFailure: false, overAlertCount: 0, lastUpdated: '' },
  { id: 'TS-005', name: 'Hydraulic Sys', location: 'Workshop E', currentTemp: null, status: 'Offline', history: [], forceFailure: false, overAlertCount: 0, lastUpdated: '' },
];

const App: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>(INITIAL_SENSORS);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>('TS-001');
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isPlayingAlarm, setIsPlayingAlarm] = useState(false);
  
  // Ambient Temp Simulation
  const [ambientTemp, setAmbientTemp] = useState(22);
  const timeStepRef = useRef(0);

  // Stats calculation
  const stats: SystemStats = React.useMemo(() => {
    let total = 0, sum = 0, max = 0, high = 0, over = 0;
    
    sensors.forEach(s => {
      total += s.history.length;
      if (s.history.length > 0) {
        const temps = s.history.map(h => h.temp);
        sum += temps.reduce((a, b) => a + b, 0);
        const sMax = Math.max(...temps);
        if (sMax > max) max = sMax;
        
        high += s.history.filter(h => h.temp > NORMAL_MAX && h.temp < WARNING_MIN).length;
        over += s.history.filter(h => h.temp >= WARNING_MIN).length;
      }
    });

    return {
      totalReadings: total,
      avgTemp: total > 0 ? parseFloat((sum / total).toFixed(1)) : 0,
      maxTemp: max,
      highCount: high,
      overCount: over
    };
  }, [sensors]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev].slice(0, 100)); // Keep last 100 logs
  }, []);

  // Alarm Sound Effect Management
  useEffect(() => {
    if (isPlayingAlarm && !isMuted) {
      startSiren();
    } else {
      stopSiren();
    }
  }, [isPlayingAlarm, isMuted]);

  // Main Simulation Loop
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isMonitoring) {
      addLog("System monitoring started.", 'info');
      
      intervalId = setInterval(() => {
        const now = new Date();
        const timeString = now.toISOString();

        // Simulate Ambient Temp (Sine wave day/night cycle)
        timeStepRef.current += 0.1;
        const newAmbient = 22 + 5 * Math.sin(timeStepRef.current); // 17 to 27 degrees
        setAmbientTemp(parseFloat(newAmbient.toFixed(1)));

        setSensors(prevSensors => {
          let criticalSensors: string[] = [];

          const updatedSensors = prevSensors.map(sensor => {
            const newTemp = generateTemp(sensor, newAmbient);
            const status = getStatus(newTemp);
            const newHistory = [...sensor.history, { timestamp: timeString, temp: newTemp }].slice(-MAX_HISTORY_POINTS);
            
            let overAlertCount = sensor.overAlertCount;
            
            // Alert Logic
            if (newTemp >= WARNING_MIN) {
               overAlertCount++;
               if (overAlertCount >= 3) {
                 criticalSensors.push(sensor.name);
                 if (overAlertCount === 3) {
                    addLog(`CRITICAL: ${sensor.name} overheated 3 times! Email sent to admin.`, 'error');
                 }
               }
            } else {
               // Optional: decay the alert count slowly if needed, or keep strictly per requirements
            }

            return {
              ...sensor,
              currentTemp: newTemp,
              status,
              history: newHistory,
              overAlertCount,
              lastUpdated: now.toLocaleTimeString()
            };
          });

          if (criticalSensors.length > 0) {
            setIsPlayingAlarm(true);
            // Voice announcement
            if (isVoiceEnabled && !isMuted && Math.random() < 0.3) { // Don't spam voice every 3s
               announce(`Critical alert. ${criticalSensors[0]} is overheating.`);
            }
          }

          return updatedSensors;
        });

      }, 3000); // 3 seconds interval
    } else {
      setIsPlayingAlarm(false);
      stopSiren();
    }

    return () => clearInterval(intervalId);
  }, [isMonitoring, addLog, isVoiceEnabled, isMuted]);

  const toggleMonitoring = () => {
    playClickSound();
    if (isMonitoring) {
      setIsMonitoring(false);
      addLog("System monitoring stopped.", 'warning');
    } else {
      initAudio(); // Initialize audio context on user gesture
      setIsMonitoring(true);
      if (isVoiceEnabled) announce("System monitoring activated.");
    }
  };

  const toggleFault = (id: string) => {
    playClickSound();
    setSensors(prev => prev.map(s => {
      if (s.id === id) {
        const newState = !s.forceFailure;
        addLog(`Manual Override: ${s.name} failure mode ${newState ? 'ACTIVATED' : 'DEACTIVATED'}`, 'warning');
        return { ...s, forceFailure: newState };
      }
      return s;
    }));
  };

  const handleExport = () => {
    playClickSound();
    const header = ['Timestamp', 'Sensor ID', 'Name', 'Location', 'Temp(C)', 'Status'];
    const rows: string[] = [];
    
    sensors.forEach(s => {
      s.history.forEach(h => {
        rows.push([
          h.timestamp, 
          s.id, 
          s.name, 
          s.location, 
          h.temp.toString(), 
          getStatus(h.temp)
        ].join(','));
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + header.join(",") + "\n" 
      + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `port_data_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Data export completed.", 'success');
  };

  const handleAiModal = () => {
    playClickSound();
    setShowAiModal(true);
  }

  const selectedSensor = sensors.find(s => s.id === selectedSensorId) || null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-cyan-500/30">
      
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 h-16 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            PortGuard Monitor <span className="text-xs text-gray-500 font-mono ml-2">v2.1.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm bg-gray-950 border border-gray-800 rounded px-3 py-1.5 min-w-[140px] justify-center">
            {isMonitoring ? <Sun className="w-4 h-4 text-yellow-500 animate-pulse" /> : <CloudRain className="w-4 h-4 text-gray-500" />}
            <span className="text-gray-400 text-xs">AMB:</span>
            <span className="font-mono font-bold text-cyan-300">{ambientTemp.toFixed(1)}°C</span>
          </div>

          <div className="h-6 w-px bg-gray-800"></div>

          <div className="flex items-center gap-2 text-sm bg-gray-950 border border-gray-800 rounded px-3 py-1.5">
            <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
            {isMonitoring ? 'SYSTEM ACTIVE' : 'SYSTEM PAUSED'}
          </div>
          
          <button 
            onClick={() => { playClickSound(); setIsVoiceEnabled(!isVoiceEnabled); }}
            className={`p-2 rounded hover:bg-gray-800 transition-colors ${isVoiceEnabled ? 'text-cyan-400' : 'text-gray-600'}`}
            title="Toggle Voice Assistant"
          >
            {isVoiceEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => { playClickSound(); setIsMuted(!isMuted); }}
            className={`p-2 rounded hover:bg-gray-800 transition-colors ${isPlayingAlarm && !isMuted ? 'text-red-500 animate-pulse-fast' : 'text-gray-400'}`}
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 grid grid-cols-12 gap-6 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Column: Stats & Logs (3 cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          
          {/* Global Stats */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg relative overflow-hidden group">
             {/* Decorative glow */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

             <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
               <Activity className="w-4 h-4" /> System Metrics
             </h3>
             <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-gray-950 p-3 rounded border border-gray-800">
                  <div className="text-xs text-gray-500">Total Reads</div>
                  <div className="text-xl font-mono text-cyan-400">{stats.totalReadings}</div>
                </div>
                <div className="bg-gray-950 p-3 rounded border border-gray-800">
                  <div className="text-xs text-gray-500">Avg Temp</div>
                  <div className="text-xl font-mono text-white">{stats.avgTemp}°C</div>
                </div>
                <div className="bg-gray-950 p-3 rounded border border-gray-800">
                  <div className="text-xs text-gray-500">Alerts (High)</div>
                  <div className="text-xl font-mono text-orange-400">{stats.highCount}</div>
                </div>
                <div className={`bg-gray-950 p-3 rounded border ${stats.overCount > 0 ? 'border-red-900 bg-red-900/10' : 'border-gray-800'}`}>
                  <div className="text-xs text-gray-500">Critical</div>
                  <div className="text-xl font-mono text-red-500">{stats.overCount}</div>
                </div>
             </div>
          </div>

          {/* Logs */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 flex flex-col flex-1 overflow-hidden shadow-lg">
            <div className="p-3 border-b border-gray-800 bg-gray-850 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4" /> System Logs
              </h3>
              <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-white transition-colors">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
              {logs.length === 0 && <div className="text-gray-600 text-center mt-10">No logs available</div>}
              {logs.map(log => (
                <div key={log.id} className="border-l-2 border-gray-700 pl-2 py-0.5 animate-in fade-in slide-in-from-left-2">
                  <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'warning' ? 'text-orange-400' : ''}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                    ${log.type === 'info' ? 'text-gray-300' : ''}
                  `}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Table & Controls (6 cols) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 overflow-hidden">
          
          {/* Control Bar */}
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex flex-wrap gap-3 shadow-lg items-center">
             <button 
              onClick={toggleMonitoring}
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold transition-all shadow-lg active:scale-95 ${isMonitoring 
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                : 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/50'}`}
             >
               {isMonitoring ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
               {isMonitoring ? 'Stop Monitor' : 'Start Monitor'}
             </button>

             <div className="h-full w-px bg-gray-700 mx-2"></div>

             <button 
              onClick={handleAiModal}
              className="flex items-center gap-2 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-500 font-medium transition-colors shadow-lg shadow-purple-900/20 active:scale-95"
             >
               <Brain className="w-4 h-4" />
               AI Diagnosis
             </button>

             <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors ml-auto active:scale-95"
             >
               <Download className="w-4 h-4" />
               Export
             </button>
             
             {isPlayingAlarm && (
               <button 
                onClick={() => { playClickSound(); setIsPlayingAlarm(false); }} 
                className="flex items-center gap-2 px-4 py-2 rounded bg-red-600 text-white animate-pulse font-bold hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.7)]"
               >
                 STOP ALARM
               </button>
             )}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden">
             <SensorTable 
               sensors={sensors} 
               selectedId={selectedSensorId} 
               onSelect={(id) => { playClickSound(); setSelectedSensorId(id); }}
               onInjectFault={toggleFault}
             />
          </div>
        </div>

        {/* Right Column: Charts & Details (3 cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <div className="flex-1 h-1/2">
            <TempChart sensors={sensors} />
          </div>
          
          {/* Selected Device Detail (Mini) */}
          <div className="h-1/2 bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg flex flex-col relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 relative z-10">Device Overview</h3>
            {selectedSensor ? (
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                   <div>
                     <div className="text-xs text-gray-500 mb-1">SELECTED ID</div>
                     <div className="text-2xl font-mono font-bold text-white">{selectedSensor.id}</div>
                     <div className="text-sm text-cyan-400">{selectedSensor.name}</div>
                   </div>
                   <div className="text-right">
                     <div className={`text-4xl font-bold font-mono transition-colors duration-500 ${
                       selectedSensor.status === 'Overheat' ? 'text-red-500 animate-pulse' :
                       selectedSensor.status === 'High' ? 'text-orange-400' :
                       selectedSensor.status === 'Normal' ? 'text-green-400' : 'text-gray-600'
                     }`}>
                       {selectedSensor.currentTemp?.toFixed(1) ?? '--'}°
                     </div>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <div className="text-xs text-gray-500">Location</div>
                     <div className="text-sm font-medium">{selectedSensor.location}</div>
                   </div>
                   <div>
                     <div className="text-xs text-gray-500">Last Update</div>
                     <div className="text-sm font-mono text-gray-300">{selectedSensor.lastUpdated || '--:--:--'}</div>
                   </div>
                   <div>
                     <div className="text-xs text-gray-500">Status</div>
                     <div className="text-sm font-medium">{selectedSensor.status}</div>
                   </div>
                   <div>
                     <div className="text-xs text-gray-500">Fault Injection</div>
                     <div className={`text-sm font-bold ${selectedSensor.forceFailure ? 'text-red-500' : 'text-gray-600'}`}>
                       {selectedSensor.forceFailure ? 'ACTIVE' : 'OFF'}
                     </div>
                   </div>
                </div>

                <div className="pt-4 mt-auto">
                   <button 
                    onClick={handleAiModal}
                    className="w-full py-3 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-2 group"
                   >
                     <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />
                     Run AI Prediction Model
                   </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600 my-auto">Select a device to view details</div>
            )}
          </div>
        </div>
      </main>

      {/* AI Modal */}
      <AiReportModal 
        sensor={selectedSensor}
        isOpen={showAiModal}
        onClose={() => { playClickSound(); setShowAiModal(false); }}
        isVoiceEnabled={isVoiceEnabled}
      />

    </div>
  );
};

export default App;