import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { path: '/',         label: 'Dashboard' },
  { path: '/requests', label: 'Requests'  },
  { path: '/abuse',    label: 'Abuse'     },
  { path: '/keys',     label: 'API Keys'  },
  { path: '/users',    label: 'Users'     },
  { path: '/settings', label: 'Settings'  },
];

const Navbar = ({ connected }) => {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      background:   '#1a1d27',
      borderBottom: '1px solid #2a2d3e',
      padding:      '0 32px',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'space-between',
      height:       '56px',
      position:     'sticky',
      top:          0,
      zIndex:       100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ color: '#6366f1', fontWeight: 700, fontSize: '16px' }}>
          ⚡ API Gateway
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                padding:      '6px 14px',
                borderRadius: '6px',
                fontSize:     '13px',
                fontWeight:   500,
                textDecoration: 'none',
                color:    location.pathname === link.path ? '#6366f1' : '#94a3b8',
                background: location.pathname === link.path
                  ? 'rgba(99,102,241,0.1)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width:        '8px',
            height:       '8px',
            borderRadius: '50%',
            background:   connected ? '#22c55e' : '#ef4444',
          }}/>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
          {user?.name}
        </span>

        <button
          onClick={handleLogout}
          style={{
            background:   '#2a2d3e',
            border:       'none',
            borderRadius: '6px',
            padding:      '6px 12px',
            color:        '#94a3b8',
            fontSize:     '12px',
            cursor:       'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;