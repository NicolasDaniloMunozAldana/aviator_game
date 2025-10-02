import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import './LoginForm.css';

const LoginForm = () => {
  const { authenticateUser, authenticationState, player, logout } = useGame();
  const [username, setUsername] = useState('');

  // Pre-cargar el username si existe en localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('aviator_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      authenticateUser(username.trim());
    }
  };

  const handleNewUser = () => {
    // Limpiar datos guardados para crear nuevo usuario
    localStorage.removeItem('aviator_user_token');
    localStorage.removeItem('aviator_username');
    setUsername('');
  };

  const handleLogout = () => {
    logout();
    setUsername('');
  };

  // Mostrar estado de carga durante autenticación
  if (authenticationState === 'checking') {
    return (
      <div className="login-form">
        <div className="login-container">
          <h2>Conectando...</h2>
          <div className="loading-spinner">⏳</div>
          <p>Verificando tu sesión anterior...</p>
        </div>
      </div>
    );
  }

  // Si ya está autenticado, mostrar información del usuario
  if (authenticationState === 'authenticated' && player.isAuthenticated) {
    return (
      <div className="login-form">
        <div className="login-container authenticated">
          <h2>¡Bienvenido de nuevo!</h2>
          <div className="user-info">
            <h3>{player.username}</h3>
            <p className="balance">Saldo actual: <strong>${player.balance?.toFixed(2)}</strong></p>
          </div>
          <div className="login-actions">
            <button 
              type="button" 
              className="logout-btn"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
            <button 
              type="button" 
              className="new-user-btn"
              onClick={handleNewUser}
            >
              Jugar con otro usuario
            </button>
          </div>
          <p className="session-info">Tu sesión se ha restaurado automáticamente</p>
        </div>
      </div>
    );
  }

  // Formulario de login normal
  return (
    <div className="login-form">
      <div className="login-container">
        <h2>Unirse al juego Aviator</h2>
        <p className='login-description'>Disfruta del juego y apuesta con responsabilidad.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ingresa tu nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            required
          />
          <button type="submit" disabled={authenticationState === 'checking'}>
            {authenticationState === 'checking' ? 'Conectando...' : 'Entrar a la sala'}
          </button>
        </form>
        {username && (
          <div className="login-hint">
            <p>
              {localStorage.getItem('aviator_user_token') 
                ? '🔄 Se restaurará tu sesión anterior' 
                : '🆕 Se creará una nueva cuenta'
              }
            </p>
          </div>
        )}
        <p className="initial-balance">
          {localStorage.getItem('aviator_user_token') 
            ? 'Saldo de tu última sesión será restaurado' 
            : 'Saldo inicial para nuevos usuarios: $1000'
          }
        </p>
      </div>
    </div>
  );
};

export default LoginForm;