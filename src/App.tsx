import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import Layout from './components/Layout';
import RotaProtegida from './components/RotaProtegida';
import Aprovacoes from './pages/Aprovacoes';
import Calendario from './pages/Calendario';
import Login from './pages/Login';
import Relatorios from './pages/Relatorios';
import Reservas from './pages/Reservas';
import Salas from './pages/Salas';
import Usuarios from './pages/Usuarios';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RotaProtegida />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Calendario />} />
              <Route path="/reservas" element={<Reservas />} />
              <Route element={<RotaProtegida somenteAdmin />}>
                <Route path="/aprovacoes" element={<Aprovacoes />} />
                <Route path="/salas" element={<Salas />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/relatorios" element={<Relatorios />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
