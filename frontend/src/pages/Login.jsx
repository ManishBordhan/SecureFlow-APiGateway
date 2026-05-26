import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     '#0f1117',
    }}>
      <div style={{
        background:   '#1a1d27',
        border:       '1px solid #2a2d3e',
        borderRadius: '12px',
        padding:      '40px',
        width:        '360px',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#6366f1' }}>
            ⚡ API Gateway
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Admin Dashboard
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              background:   '#0f1117',
              border:       '1px solid #2a2d3e',
              borderRadius: '8px',
              padding:      '10px 14px',
              color:        '#e2e8f0',
              fontSize:     '14px',
              outline:      'none',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              background:   '#0f1117',
              border:       '1px solid #2a2d3e',
              borderRadius: '8px',
              padding:      '10px 14px',
              color:        '#e2e8f0',
              fontSize:     '14px',
              outline:      'none',
            }}
          />

          {error && (
            <div style={{ color: '#ef4444', fontSize: '13px' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background:   '#6366f1',
              border:       'none',
              borderRadius: '8px',
              padding:      '12px',
              color:        '#fff',
              fontSize:     '14px',
              fontWeight:   600,
              cursor:       loading ? 'not-allowed' : 'pointer',
              opacity:      loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;