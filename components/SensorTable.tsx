import React from 'react';
import { Sensor } from '../types';
import { Thermometer, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface SensorTableProps {
  sensors: Sensor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInjectFault: (id: string) => void;
}

const SensorTable: React.FC<SensorTableProps> = ({ sensors, selectedId, onSelect, onInjectFault }) => {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 bg-gray-850">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-cyan-400" />
          Device Status
        </h3>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-gray-950 text-gray-200 sticky top-0 z-10">
            <tr>
              <th className="p-4 font-medium">ID</th>
              <th className="p-4 font-medium">Device Name</th>
              <th className="p-4 font-medium">Location</th>
              <th className="p-4 font-medium text-right">Temp (°C)</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sensors.map((sensor) => {
              const isSelected = selectedId === sensor.id;
              let statusColor = 'text-gray-500';
              let StatusIcon = CheckCircle;
              let rowBg = isSelected ? 'bg-cyan-900/20' : 'hover:bg-gray-800/50';

              if (sensor.status === 'Overheat') {
                statusColor = 'text-red-500';
                StatusIcon = Flame;
                rowBg = isSelected ? 'bg-red-900/20' : 'bg-red-900/10 hover:bg-red-900/20';
              } else if (sensor.status === 'High') {
                statusColor = 'text-orange-400';
                StatusIcon = AlertTriangle;
              } else if (sensor.status === 'Normal') {
                statusColor = 'text-green-400';
                StatusIcon = CheckCircle;
              }

              return (
                <tr 
                  key={sensor.id} 
                  onClick={() => onSelect(sensor.id)}
                  className={`cursor-pointer transition-colors ${rowBg}`}
                >
                  <td className="p-4 text-gray-300 font-mono">{sensor.id}</td>
                  <td className="p-4 text-gray-100 font-medium">{sensor.name}</td>
                  <td className="p-4">{sensor.location}</td>
                  <td className={`p-4 text-right font-mono font-bold text-lg ${statusColor}`}>
                    {sensor.currentTemp?.toFixed(1) ?? '--'}
                  </td>
                  <td className="p-4">
                    <div className={`flex items-center justify-center gap-2 ${statusColor} border border-current/20 rounded-full px-2 py-1 bg-gray-950/50`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="font-semibold">{sensor.status === 'Offline' ? 'Waiting' : sensor.status}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInjectFault(sensor.id);
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        sensor.forceFailure 
                          ? 'bg-red-500 text-white hover:bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
                      }`}
                    >
                      {sensor.forceFailure ? 'FAULT ACTIVE' : 'Inject Fault'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SensorTable;