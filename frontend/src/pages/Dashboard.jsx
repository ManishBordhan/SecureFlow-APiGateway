import { useEffect, useState } from 'react';
import { getStats } from '../api/gateway';
import StatCard from '../components/StatCard';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const Dashboard = ({ traffic, abuse }) => {
  const [stats,   setStats]   = useState(null);
  const [mlInfo,  setMlInfo]  = useState(null);
  const [latencyData, setLatencyData] = useState([]);

  useEffect(() => {
    loadStats();
    loadMLInfo();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // build latency chart data from live traffic
  useEffect(() => {
    if (traffic.length === 0) return;
    const latest = traffic[0];
    setLatencyData((prev) => [
      ...prev,
      {
        time:    new Date(latest.timestamp).toLocaleTimeString(),
        latency: latest.latencyMs || 0,
      },
    ].slice(-20));
  }, [traffic]);

  const loadStats = async () => {
    try {
      const res = await getStats();
      setStats(res.data.data);
    } catch (err) {
      console.error('Stats load failed', err);
    }
  };

  const loadMLInfo = async () => {
    try {
      const res = await fetch('http://localhost:5001/model/info');
      const data = await res.json();
      setMlInfo(data);
    } catch (err) {
      console.error('ML info load failed', err);
    }
  };

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
        <StatCard label="Requests (24h)" value={stats?.totalRequests} />
        <StatCard label="Error rate"     value={stats?.errorRate}     color="#ef4444" />
        <StatCard label="Avg latency"    value={stats?.avgLatencyMs ? `${stats.avgLatencyMs}ms` : '—'} color="#f59e0b" />
        <StatCard label="Abuse events"   value={stats?.totalAbuse}    color="#ef4444" />
        <StatCard label="Active keys"    value={stats?.activeKeys}    color="#22c55e" />
        <StatCard label="Active users"   value={stats?.totalUsers}    color="#3b82f6" />
      </div>

      {/* Two column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Live traffic */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2d3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Live traffic</h2>
            <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>● LIVE</span>
          </div>
          <div style={{ height: '300px', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {traffic.length === 0 && (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
                Waiting for requests...
              </div>
            )}
            {traffic.map((item, i) => {
              const cls = item.statusCode >= 500 ? '#ef4444'
                        : item.statusCode >= 400 ? '#f59e0b' : '#22c55e';
              return (
                <div key={i} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '10px',
                  padding:      '8px 10px',
                  background:   '#0f1117',
                  borderRadius: '6px',
                  fontSize:     '12px',
                  borderLeft:   `3px solid ${cls}`,
                }}>
                  <span style={{
                    background:   '#2a2d3e',
                    borderRadius: '4px',
                    padding:      '2px 6px',
                    fontSize:     '10px',
                    fontWeight:   700,
                    minWidth:     '42px',
                    textAlign:    'center',
                  }}>
                    {item.method}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.path}
                  </span>
                  <span style={{ color: cls, fontWeight: 600 }}>{item.statusCode}</span>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                    {item.latencyMs}ms · {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Abuse events */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2d3e' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Abuse events</h2>
          </div>
          <div style={{ height: '300px', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {abuse.length === 0 && (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
                No abuse events
              </div>
            )}
            {abuse.map((item, i) => (
              <div key={i} style={{
                padding:      '10px 12px',
                background:   '#0f1117',
                borderRadius: '6px',
                borderLeft:   '3px solid #ef4444',
                fontSize:     '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>{item.ip}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>Score: {item.score || '—'}</span>
                </div>
                <div style={{ color: '#64748b' }}>
                  {item.type} · {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Latency chart */}
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
          Live latency (ms)
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={latencyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '8px' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Line
              type="monotone"
              dataKey="latency"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ML Model info */}
      {mlInfo && (
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
            ML Model — {mlInfo.algorithm}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <StatCard label="Algorithm"    value={mlInfo.algorithm}                    color="#6366f1" />
            <StatCard label="Estimators"   value={mlInfo.estimators}                   color="#22c55e" />
            <StatCard label="Contamination"value={`${(mlInfo.contamination * 100)}%`}  color="#f59e0b" />
            <StatCard label="Features"     value={mlInfo.features?.length}             color="#3b82f6" />
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;