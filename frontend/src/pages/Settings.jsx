import { useEffect, useState } from 'react';
import { getSettings, updateSettings, resetSettings } from '../api/gateway';

const ALGORITHMS = [
  { value: 'tokenBucket',   label: 'Token Bucket',   desc: 'Allows burst traffic — follows IETF RFC 4115' },
  { value: 'slidingWindow', label: 'Sliding Window',  desc: 'Most accurate — no boundary burst problem' },
  { value: 'fixedWindow',   label: 'Fixed Window',    desc: 'Simplest O(1) counter — fastest performance' },
];

const ML_MODELS = [
  { value: 'isolationForest', label: 'Isolation Forest', desc: 'O(log n) inference — best for production' },
  { value: 'lof',             label: 'Local Outlier Factor', desc: 'Highest F1 (0.917) — slower inference' },
  { value: 'oneClassSvm',     label: 'One-Class SVM',    desc: 'Good recall — poor scalability' },
];

const SIGNALS = [
  { key: 'rateSurge',      label: 'Rate Surge',           defaultScore: 30 },
  { key: 'repeatedErrors', label: 'Repeated Errors',       defaultScore: 20 },
  { key: 'uaRotation',     label: 'User Agent Rotation',   defaultScore: 15 },
  { key: 'payloadAnomaly', label: 'Payload Anomaly',        defaultScore: 25 },
  { key: 'ipBlocklist',    label: 'IP Blocklist',           defaultScore: 100 },
];

const S = {
  page:     { padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  h1:       { fontSize: '20px', fontWeight: 700, color: '#e2e8f0' },
  panel:    { background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', overflow: 'hidden' },
  ph:       { padding: '16px 20px', borderBottom: '1px solid #2a2d3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  phTitle:  { fontSize: '15px', fontWeight: 600, color: '#e2e8f0' },
  body:     { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  label:    { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
  input:    { background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', outline: 'none', width: '100%' },
  row:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  row3:     { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  field:    { display: 'flex', flexDirection: 'column' },
  btn:      { background: '#6366f1', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' },
  btnSm:    { background: '#2a2d3e', border: 'none', borderRadius: '6px', padding: '6px 14px', color: '#e2e8f0', fontSize: '12px', cursor: 'pointer' },
  btnRed:   { background: '#ef4444', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' },
  msg:      { fontSize: '13px', padding: '10px 14px', borderRadius: '8px', marginTop: '8px' },
  algoCard: (selected) => ({
    border: `2px solid ${selected ? '#6366f1' : '#2a2d3e'}`,
    borderRadius: '8px', padding: '14px', cursor: 'pointer',
    background: selected ? 'rgba(99,102,241,0.1)' : '#0f1117',
    transition: 'all 0.15s',
  }),
  signalRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2a2d3e' },
  toggle: (on) => ({
    width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer', border: 'none',
    background: on ? '#6366f1' : '#2a2d3e', position: 'relative', transition: 'background 0.2s',
  }),
  toggleDot: (on) => ({
    position: 'absolute', top: '3px', left: on ? '21px' : '3px',
    width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
    transition: 'left 0.2s',
  }),
};

const Settings = () => {
  const [config,  setConfig]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState({ text: '', type: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      setConfig(res.data.data.config);
    } catch (err) {
      showMsg('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const save = async (updates) => {
    setSaving(true);
    try {
      const res = await updateSettings(updates);
      setConfig(res.data.data.config);
      showMsg('Settings saved and applied instantly — no restart needed', 'success');
    } catch (err) {
      showMsg('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    try {
      const res = await resetSettings();
      setConfig(res.data.data.config);
      showMsg('Settings reset to defaults', 'success');
    } catch (err) {
      showMsg('Failed to reset', 'error');
    }
  };

  const showMsg = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const set = (path, value) => {
    const keys  = path.split('.');
    const clone = JSON.parse(JSON.stringify(config));
    let obj     = clone;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    setConfig(clone);
  };

  if (loading) return (
    <div style={{ padding: '32px', color: '#64748b' }}>Loading settings...</div>
  );

  if (!config) return (
    <div style={{ padding: '32px', color: '#ef4444' }}>Failed to load settings</div>
  );

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>Gateway Settings</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={S.btnSm} onClick={reset}>Reset to defaults</button>
        </div>
      </div>

      {msg.text && (
        <div style={{ ...S.msg, background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: msg.type === 'success' ? '#22c55e' : '#ef4444', border: `1px solid ${msg.type === 'success' ? '#22c55e' : '#ef4444'}` }}>
          {msg.text}
        </div>
      )}

      {/* ── Rate Limiting ─────────────────────────────────── */}
      <div style={S.panel}>
        <div style={S.ph}>
          <span style={S.phTitle}>Rate Limiting</span>
          <button style={S.btn} disabled={saving}
            onClick={() => save({ algorithm: config.algorithm, windowMs: config.windowMs, maxRequests: config.maxRequests, planLimits: config.planLimits })}>
            {saving ? 'Saving...' : 'Apply Changes'}
          </button>
        </div>
        <div style={S.body}>

          {/* Algorithm selector */}
          <div>
            <div style={S.label}>Active Algorithm</div>
            <div style={S.row3}>
              {ALGORITHMS.map((algo) => (
                <div key={algo.value} style={S.algoCard(config.algorithm === algo.value)}
                  onClick={() => set('algorithm', algo.value)}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: config.algorithm === algo.value ? '#6366f1' : '#e2e8f0', marginBottom: '4px' }}>
                    {config.algorithm === algo.value ? '● ' : '○ '}{algo.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{algo.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Window and max */}
          <div style={S.row}>
            <div style={S.field}>
              <div style={S.label}>Window Duration (ms)</div>
              <input style={S.input} type="number" value={config.windowMs}
                onChange={(e) => set('windowMs', parseInt(e.target.value))} />
            </div>
            <div style={S.field}>
              <div style={S.label}>Default Max Requests</div>
              <input style={S.input} type="number" value={config.maxRequests}
                onChange={(e) => set('maxRequests', parseInt(e.target.value))} />
            </div>
          </div>

          {/* Plan limits */}
          <div>
            <div style={S.label}>Per-Plan Limits</div>
            <div style={S.row3}>
              {['free', 'pro', 'enterprise'].map((plan) => (
                <div key={plan} style={{ background: '#0f1117', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: plan === 'enterprise' ? '#6366f1' : plan === 'pro' ? '#22c55e' : '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                    {plan}
                  </div>
                  <div style={S.field}>
                    <div style={S.label}>Max Requests</div>
                    <input style={S.input} type="number" value={config.planLimits?.[plan]?.max || ''}
                      onChange={(e) => set(`planLimits.${plan}.max`, parseInt(e.target.value))} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Abuse Detection ───────────────────────────────── */}
      <div style={S.panel}>
        <div style={S.ph}>
          <span style={S.phTitle}>Abuse Detection</span>
          <button style={S.btn} disabled={saving}
            onClick={() => save({ abuseThreshold: config.abuseThreshold, blockTtlSeconds: config.blockTtlSeconds, signals: config.signals })}>
            {saving ? 'Saving...' : 'Apply Changes'}
          </button>
        </div>
        <div style={S.body}>

          <div style={S.row}>
            <div style={S.field}>
              <div style={S.label}>Block Score Threshold (0–100)</div>
              <input style={S.input} type="number" min="1" max="100" value={config.abuseThreshold}
                onChange={(e) => set('abuseThreshold', parseInt(e.target.value))} />
            </div>
            <div style={S.field}>
              <div style={S.label}>Block TTL (seconds)</div>
              <input style={S.input} type="number" value={config.blockTtlSeconds}
                onChange={(e) => set('blockTtlSeconds', parseInt(e.target.value))} />
            </div>
          </div>

          {/* Signal toggles */}
          <div>
            <div style={S.label}>Detection Signals</div>
            <div style={{ background: '#0f1117', borderRadius: '8px', padding: '0 16px' }}>
              {SIGNALS.map((sig, idx) => (
                <div key={sig.key} style={{ ...S.signalRow, borderBottom: idx === SIGNALS.length - 1 ? 'none' : '1px solid #2a2d3e' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{sig.label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Score: {config.signals?.[sig.key]?.score ?? sig.defaultScore} pts</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number" min="0" max="100"
                      value={config.signals?.[sig.key]?.score ?? sig.defaultScore}
                      onChange={(e) => set(`signals.${sig.key}.score`, parseInt(e.target.value))}
                      style={{ ...S.input, width: '70px', textAlign: 'center' }}
                    />
                    <button style={S.toggle(config.signals?.[sig.key]?.enabled !== false)}
                      onClick={() => set(`signals.${sig.key}.enabled`, config.signals?.[sig.key]?.enabled === false)}>
                      <div style={S.toggleDot(config.signals?.[sig.key]?.enabled !== false)} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── ML Model ──────────────────────────────────────── */}
      <div style={S.panel}>
        <div style={S.ph}>
          <span style={S.phTitle}>ML Anomaly Detection</span>
          <button style={S.btn} disabled={saving}
            onClick={() => save({ mlEnabled: config.mlEnabled, mlModel: config.mlModel, mlWeight: config.mlWeight, ruleWeight: config.ruleWeight })}>
            {saving ? 'Saving...' : 'Apply Changes'}
          </button>
        </div>
        <div style={S.body}>

          {/* Enable/disable ML */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f1117', borderRadius: '8px', padding: '14px 16px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>ML Detection Enabled</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Disable to use rule-based scoring only</div>
            </div>
            <button style={S.toggle(config.mlEnabled)} onClick={() => set('mlEnabled', !config.mlEnabled)}>
              <div style={S.toggleDot(config.mlEnabled)} />
            </button>
          </div>

          {/* Model selector */}
          <div>
            <div style={S.label}>Active ML Model</div>
            <div style={S.row3}>
              {ML_MODELS.map((m) => (
                <div key={m.value} style={S.algoCard(config.mlModel === m.value)}
                  onClick={() => set('mlModel', m.value)}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: config.mlModel === m.value ? '#6366f1' : '#e2e8f0', marginBottom: '4px' }}>
                    {config.mlModel === m.value ? '● ' : '○ '}{m.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weights */}
          <div style={S.row}>
            <div style={S.field}>
              <div style={S.label}>Rule-Based Weight (0–1)</div>
              <input style={S.input} type="number" min="0" max="1" step="0.1" value={config.ruleWeight}
                onChange={(e) => set('ruleWeight', parseFloat(e.target.value))} />
            </div>
            <div style={S.field}>
              <div style={S.label}>ML Weight (0–1)</div>
              <input style={S.input} type="number" min="0" max="1" step="0.1" value={config.mlWeight}
                onChange={(e) => set('mlWeight', parseFloat(e.target.value))} />
            </div>
          </div>

          {/* Weight warning */}
          {Math.abs((config.ruleWeight + config.mlWeight) - 1.0) > 0.01 && (
            <div style={{ ...S.msg, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid #f59e0b' }}>
              ⚠ Rule weight + ML weight should equal 1.0 (currently {(config.ruleWeight + config.mlWeight).toFixed(1)})
            </div>
          )}

        </div>
      </div>

      {/* ── Gateway ───────────────────────────────────────── */}
      <div style={S.panel}>
        <div style={S.ph}>
          <span style={S.phTitle}>Gateway</span>
          <button style={S.btn} disabled={saving}
            onClick={() => save({ upstreamUrl: config.upstreamUrl })}>
            {saving ? 'Saving...' : 'Apply Changes'}
          </button>
        </div>
        <div style={S.body}>
          <div style={S.field}>
            <div style={S.label}>Upstream Base URL</div>
            <input style={S.input} type="text" value={config.upstreamUrl}
              onChange={(e) => set('upstreamUrl', e.target.value)} />
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            All proxy requests are forwarded to this upstream service. Changes apply immediately.
          </div>
        </div>
      </div>

    </div>
  );
};

export default Settings;