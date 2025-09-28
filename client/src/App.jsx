import React from 'react';
import GameRoom from './components/GameRoom';
import { GameProvider } from './context/GameContext';
import './App.css';

function App() {
  return (
    <GameProvider>
      <div className="App">

        <GameRoom />
      </div>
    </GameProvider>
  );
}

export default App;