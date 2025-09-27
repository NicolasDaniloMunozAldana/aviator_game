import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './LoginForm.css';

const LoginForm = () => {
  const { joinGame } = useGame();
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      joinGame(username.trim());
    }
  };

  return (
    <div className="login-form">
      <div className="login-container">
        <h2>Unirse al juego Aviator</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ingresa tu nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            required
          />
          <button type="submit">Entrar a la sala</button>
        </form>
        <p>Saldo inicial: $1000</p>
      </div>
    </div>
  );
};

export default LoginForm;