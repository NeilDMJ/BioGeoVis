import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Explorer from './pages/Explorer';
import MapView from './pages/MapView';
import AboutPage from './pages/About';
import Dashboard from './pages/Dashboard';
import Analisis from './pages/Analisis';
import Login from './pages/Login';
import Register from './pages/Register';
import SpeciesDetail from './pages/SpeciesDetail';
import { usePreventZoom } from './hooks/usePreventZoom';

function App() {
  // Prevenir zoom con Ctrl+scroll
  usePreventZoom();

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analisis" element={<Analisis />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/species-detail" element={<SpeciesDetail />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;