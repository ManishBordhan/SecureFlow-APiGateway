import { useEffect, useState } from 'react';
import { getAbuseEvents, blockIP, unblockIP } from '../api/gateway';

const Abuse = () => {
  const [events,  setEvents]  = useState([]);
  const [page,    setPage]    = useState(1);
  const [ip,      setIp]      = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAbuseEvents(page);
      setEvents(res.data.data.events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!ip) return;
    try {
      await blockIP(ip);
      setMessage(`✓ ${ip} blocked`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`✗ ${err.response?.data?.message || 'Failed'}`);
    }
  };

  const handleUnblock = async () => {
    if (!ip) return;
    try {
      await unblockIP(ip);
      setMessage(`✓ ${ip} unblocked`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`✗ ${err.response?.data?.message || 'Failed'}`);
    }
  };

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Abuse Events</h1>

      {/* IP Controls */}
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>IP Management</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="Enter IP address"
            style={{ flex: 1, background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', outline: 'none' }}
          />
          <button onClick={handleBlock}
            style={{ background: '#ef4444', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Block IP
          </button>
          <button onClick={handleUnblock}
            style={{ background: '#22c55e', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Unblock IP
          </button>
        </div>
        {message && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: message.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
            {message}
          </div>
        )}
      </div>

      {/* Events table */}
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f1117' }}>
              {['Time', 'IP', 'Score', 'Action', 'Signals', 'Resolved'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #2a2d3e' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</td></tr>
            )}
            {!loading && events.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No abuse events</td></tr>
            )}
            {events.map((event) => (
              <tr key={event._id} style={{ borderBottom: '1px solid #2a2d3e' }}>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>
                  {new Date(event.createdAt).toLocaleTimeString()}
                </td>
                <td style={{ padding: '10px 16px', color: '#ef4444', fontWeight: 600 }}>{event.ip}</td>
                <td style={{ padding: '10px 16px', color: '#f59e0b', fontWeight: 600 }}>{event.score}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    background:   event.action === 'blocked' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                    color:        event.action === 'blocked' ? '#ef4444' : '#f59e0b',
                    borderRadius: '4px',
                    padding:      '2px 8px',
                    fontSize:     '11px',
                    fontWeight:   600,
                    textTransform:'uppercase',
                  }}>
                    {event.action}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '11px' }}>
                  {event.signals
                    ? Object.entries(event.signals).map(([k, v]) => `${k}:${v}`).join(', ')
                    : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ color: event.resolved ? '#22c55e' : '#64748b' }}>
                    {event.resolved ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ padding: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: '#2a2d3e', border: 'none', borderRadius: '6px', padding: '6px 14px', color: '#e2e8f0', cursor: 'pointer' }}>
            Previous
          </button>
          <span style={{ padding: '6px 14px', color: '#64748b' }}>Page {page}</span>
          <button onClick={() => setPage((p) => p + 1)}
            style={{ background: '#2a2d3e', border: 'none', borderRadius: '6px', padding: '6px 14px', color: '#e2e8f0', cursor: 'pointer' }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Abuse;