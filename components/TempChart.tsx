import React from 'react';
import { Sensor } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TempChartProps {
  sensors: Sensor[];
}

const COLORS = ['#22d3ee', '#e879f9', '#facc15', '#ef4444', '#4ade80'];

const TempChart: React.FC<TempChartProps> = ({ sensors }) => {
  // We need to transform the data structure for Recharts.
  // We'll take the history of the first sensor as the "base" for timestamps
  // and map other sensors' temps to those timestamps.
  // Assuming all sensors update synchronously.
  
  const data = sensors[0]?.history.map((h, index) => {
    const point: any = { time: h.timestamp.split('T')[1].split('.')[0] }; // Extract HH:MM:SS
    sensors.forEach((s) => {
      if (s.history[index]) {
        point[s.id] = s.history[index].temp;
      }
    });
    return point;
  }) || [];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-xl p-4 flex flex-col h-full">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center justify-between">
        <span>Real-time Trends</span>
        <span className="text-xs font-normal text-gray-500 bg-gray-950 px-2 py-1 rounded border border-gray-800">Live (Last 50 points)</span>
      </h3>
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af" 
              tick={{fill: '#9ca3af', fontSize: 12}}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#9ca3af" 
              domain={[0, 110]} 
              tick={{fill: '#9ca3af', fontSize: 12}}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {sensors.map((sensor, index) => (
              <Line
                key={sensor.id}
                type="monotone"
                dataKey={sensor.id}
                name={`${sensor.name}`}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                isAnimationActive={false} // Disable animation for smoother realtime updates
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TempChart;