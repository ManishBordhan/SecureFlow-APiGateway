import { useEffect, useState } from 'react';
import { listKeys, generateKey, revokeKey } from '../api/gateway';

const APIKeys = () => {
  const [keys,    setKeys]    = useState([]);
  const [label,   setLabel]   = useState('');
  const [newKey,  setNewKey]  = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listKeys();
      setKeys(res.data.data.keys);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const res = await generateKey({ label: label || 'New Key' });
      setNewKey(res.data.data.apiKey);
      setLabel('');
      load();
    } catch (err) {
      setMessage('Failed to generate key');
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this API key?')) return;
    try {
      await revokeKey(id);
      load();
    } catch (err) {
      setMessage('Failed to revoke key');
    }
  };

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <h1 style={{ fontSize: '20px', fontWeight: 700 }}>API Keys</h1>

      {/* Generate new key */}
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Generate New Key</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Key label e.g. Production Key"
            style={{ flex: 1, background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', outline: 'none' }}
          />
          <button onClick={handleGenerate}
            style={{ background: '#6366f1', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Generate
          </button>
        </div>

        {/* Show new key once */}
        {newKey && (
          <div style={{ marginTop: '16px', background: '#0f1117', border: '1px solid #22c55e', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: '#22c55e', marginBottom: '8px', fontWeight: 600 }}>
              ✓ Key generated — copy it now, it will not be shown again
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0', wordBreak: 'break-all' }}>
              {newKey}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(newKey); setMessage('Copied!'); setTimeout(() => setMessage(''), 2000); }}
              style={{ marginTop: '10px', background: '#2a2d3e', border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#e2e8f0', fontSize: '12px', cursor: 'pointer' }}>
              Copy to clipboard
            </button>
          </div>
        )}

        {message && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#22c55e' }}>{message}</div>
        )}
      </div>

      {/* Keys table */}
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f1117' }}>
              {['Prefix', 'Label', 'Plan', 'Status', 'Created', 'Last Used', 'Action'].map((h) => (
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
            {!loading && keys.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No API keys</td></tr>
            )}
            {keys.map((key) => (
              <tr key={key._id} style={{ borderBottom: '1px solid #2a2d3e' }}>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#6366f1' }}>{key.keyPrefix}...</td>
                <td style={{ padding: '10px 16px', color: '#e2e8f0' }}>{key.label}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    background:   key.plan === 'enterprise' ? 'rgba(99,102,241,0.2)' : key.plan === 'pro' ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)',
                    color:        key.plan === 'enterprise' ? '#6366f1' : key.plan === 'pro' ? '#22c55e' : '#64748b',
                    borderRadius: '4px',
                    padding:      '2px 8px',
                    fontSize:     '11px',
                    fontWeight:   600,
                    textTransform:'uppercase',
                  }}>
                    {key.plan}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ color: key.isActive ? '#22c55e' : '#ef4444' }}>
                    {key.isActive ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>
                  {new Date(key.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleTimeString() : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {key.isActive && (
                    <button onClick={() => handleRevoke(key._id)}
                      style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '6px', padding: '4px 10px', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default APIKeys;