import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Explorer from './pages/Explorer';
import MapView from './pages/MapView';
import AboutPage from './pages/About';
import Dashboard from './pages/Dashboard';
import Analisis from './pages/Analisis';
import SpeciesDetail from './pages/SpeciesDetail';
import Donate from './pages/Donate';
import { usePreventZoom } from './hooks/usePreventZoom';

function App() {
  // Prevenir zoom con Ctrl+scroll
  usePreventZoom();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analisis" element={<Analisis />} />
        <Route path="/species-detail" element={<SpeciesDetail />} />
        <Route path="/donate" element={<Donate />} />
      </Routes>
    </Router>
  );
}

export default App;