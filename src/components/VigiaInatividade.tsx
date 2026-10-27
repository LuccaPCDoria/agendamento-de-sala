import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useInatividade } from '../auth/useInatividade';

// Montado apenas com usuário logado (dentro do Router, onde há navegação).
export default function VigiaInatividade() {
  const { expirarSessao } = useAuth();
  const navegar = useNavigate();
  useInatividade(() => {
    void expirarSessao().then(() => navegar('/login?expirada=1', { replace: true }));
  });
  return null;
}
