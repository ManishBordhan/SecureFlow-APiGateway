const StatCard = ({ label, value, color = '#6366f1' }) => (
  <div style={{
    background:   '#1a1d27',
    border:       '1px solid #2a2d3e',
    borderRadius: '10px',
    padding:      '20px',
  }}>
    <div style={{
      fontSize:      '11px',
      color:         '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom:  '8px',
    }}>
      {label}
    </div>
    <div style={{ fontSize: '28px', fontWeight: 700, color }}>
      {value ?? '—'}
    </div>
  </div>
);

export default StatCard;