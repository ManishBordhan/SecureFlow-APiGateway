import { useEffect, useState } from 'react';
import { getUsers, updateUser, deleteUser } from '../api/gateway';

const ROLES  = ['user', 'admin'];
const PLANS  = ['free', 'pro', 'enterprise'];

const badge = (text, color) => (
  <span style={{
    background:    `${color}22`,
    color,
    borderRadius:  '4px',
    padding:       '2px 8px',
    fontSize:      '11px',
    fontWeight:    700,
    textTransform: 'uppercase',
  }}>
    {text}
  </span>
);

const Users = () => {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);   // userId being edited
  const [form,    setForm]    = useState({});
  const [msg,     setMsg]     = useState({ text: '', type: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data.data.users);
    } catch (err) {
      show('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const show = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const startEdit = (user) => {
    setEditing(user._id);
    setForm({ role: user.role, plan: user.plan, isActive: user.isActive });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({});
  };

  const saveEdit = async (userId) => {
    try {
      await updateUser(userId, form);
      show('User updated successfully', 'success');
      setEditing(null);
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(userId);
      show(`User "${name}" deleted`, 'success');
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const toggleActive = async (user) => {
    try {
      await updateUser(user._id, { isActive: !user.isActive });
      show(`User ${!user.isActive ? 'activated' : 'deactivated'}`, 'success');
      load();
    } catch (err) {
      show('Failed to update status', 'error');
    }
  };

  const sel = {
    background: '#0f1117', border: '1px solid #2a2d3e',
    borderRadius: '6px', padding: '5px 10px',
    color: '#e2e8f0', fontSize: '12px', cursor: 'pointer', outline: 'none',
  };

  return (
    <div style={{ padding: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0' }}>Users</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Manage roles, plans, and account status
          </p>
        </div>
        <button onClick={load}
          style={{ background: '#2a2d3e', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#e2e8f0', cursor: 'pointer', fontSize: '13px' }}>
          Refresh
        </button>
      </div>

      {/* Message */}
      {msg.text && (
        <div style={{
          marginBottom: '16px', padding: '10px 16px', borderRadius: '8px', fontSize: '13px',
          background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color:      msg.type === 'success' ? '#22c55e' : '#ef4444',
          border:     `1px solid ${msg.type === 'success' ? '#22c55e' : '#ef4444'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          ['Total Users',  users.length,                                        '#6366f1'],
          ['Active',       users.filter(u => u.isActive).length,               '#22c55e'],
          ['Admins',       users.filter(u => u.role === 'admin').length,        '#f59e0b'],
          ['Pro / Ent',    users.filter(u => u.plan !== 'free').length,         '#3b82f6'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f1117' }}>
              {['Name', 'Email', 'Role', 'Plan', 'Status', 'Joined', 'Actions'].map(h => (
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
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No users found</td></tr>
            )}
            {users.map((user) => {
              const isEditing = editing === user._id;
              return (
                <tr key={user._id} style={{ borderBottom: '1px solid #2a2d3e', background: isEditing ? 'rgba(99,102,241,0.05)' : 'transparent' }}>

                  {/* Name */}
                  <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: 500 }}>
                    {user.name}
                  </td>

                  {/* Email */}
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                    {user.email}
                  </td>

                  {/* Role */}
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <select style={sel} value={form.role}
                        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      badge(user.role, user.role === 'admin' ? '#6366f1' : '#64748b')
                    )}
                  </td>

                  {/* Plan */}
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <select style={sel} value={form.plan}
                        onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      badge(user.plan,
                        user.plan === 'enterprise' ? '#6366f1' :
                        user.plan === 'pro'        ? '#22c55e' : '#64748b')
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleActive(user)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}>
                      {badge(user.isActive ? 'Active' : 'Inactive', user.isActive ? '#22c55e' : '#ef4444')}
                    </button>
                  </td>

                  {/* Joined */}
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => saveEdit(user._id)} style={{
                          background: '#22c55e', border: 'none', borderRadius: '6px',
                          padding: '5px 12px', color: '#fff', fontSize: '12px',
                          fontWeight: 600, cursor: 'pointer',
                        }}>
                          Save
                        </button>
                        <button onClick={cancelEdit} style={{
                          background: '#2a2d3e', border: 'none', borderRadius: '6px',
                          padding: '5px 12px', color: '#e2e8f0', fontSize: '12px', cursor: 'pointer',
                        }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => startEdit(user)} style={{
                          background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: '6px',
                          padding: '5px 12px', color: '#6366f1', fontSize: '12px',
                          fontWeight: 600, cursor: 'pointer',
                        }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(user._id, user.name)} style={{
                          background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '6px',
                          padding: '5px 12px', color: '#ef4444', fontSize: '12px',
                          fontWeight: 600, cursor: 'pointer',
                        }}>
                          Delete
                        </button>
                      </div>
                    )}
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

export default Users;