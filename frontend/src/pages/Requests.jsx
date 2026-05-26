import { useEffect, useState } from 'react';
import { getRequests } from '../api/gateway';

const Requests = () => {
  const [logs,    setLogs]    = useState([]);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getRequests(page);
      setLogs(res.data.data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (code) =>
    code >= 500 ? '#ef4444' : code >= 400 ? '#f59e0b' : '#22c55e';

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Request Logs</h1>
        <button onClick={load} style={{ background: '#2a2d3e', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#e2e8f0', cursor: 'pointer', fontSize: '13px' }}>
          Refresh
        </button>
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f1117' }}>
              {['Time', 'Method', 'Path', 'Status', 'Latency', 'IP', 'User'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #2a2d3e' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No requests found</td></tr>
            )}
            {logs.map((log) => (
              <tr key={log._id} style={{ borderBottom: '1px solid #2a2d3e' }}>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>
                  {new Date(log.createdAt).toLocaleTimeString()}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: '#2a2d3e', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                    {log.method}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: '#e2e8f0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.path}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ color: statusColor(log.statusCode), fontWeight: 600 }}>
                    {log.statusCode}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{log.latencyMs}ms</td>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{log.ip}</td>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{log.userId?.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
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

export default Requests;