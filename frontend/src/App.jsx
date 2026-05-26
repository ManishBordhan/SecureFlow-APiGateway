import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import useSocket from './hooks/useSocket';
import Navbar    from './components/Navbar';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Requests  from './pages/Requests';
import Abuse     from './pages/Abuse';
import APIKeys   from './pages/APIKeys';
import Users     from './pages/Users';
import Settings  from './pages/Settings';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

const AppLayout = () => {
  const { token }                     = useAuth();
  const { connected, traffic, abuse } = useSocket();

  if (!token) return null;

  return (
    <>
      <Navbar connected={connected} />
      <Routes>
        <Route path="/"          element={<Dashboard traffic={traffic} abuse={abuse} />} />
        <Route path="/requests"  element={<Requests />} />
        <Route path="/abuse"     element={<Abuse />} />
        <Route path="/keys"      element={<APIKeys />} />
        <Route path="/users"     element={<Users />} />
        <Route path="/settings"  element={<Settings />} />
      </Routes>
    </>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }/>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;