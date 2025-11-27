import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Explorer from './pages/Explorer';
import MapView from './pages/MapView';
import AboutPage from './pages/About';
import Dashboard from './pages/Dashboard';
import Analisis from './pages/Analisis';
import Login from './pages/Login';
import Register from './pages/Register';

function App(){
  return(
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analisis" element = {<Analisis/>}/>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;