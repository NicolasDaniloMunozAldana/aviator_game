import React from 'react';
import GameRoom from './components/GameRoom';
import { GameProvider } from './context/GameContext';
import './App.css';

function App() {
  return (
    <GameProvider>
      <div className="App">
        <header className="app-header">
          <h1>Juego Aviador</h1>
          <p>Sala de apuestas en tiempo real</p>
        </header>
        <GameRoom />
      </div>
    </GameProvider>
  );
}

export default App;