import React from 'react';
import { useGame } from '../context/GameContext';
import MultiplierDisplay from './MultiplierDisplay';
import BettingPanel from './BettingPanel';
import PlayersList from './PlayersList';
import GameHistory from './GameHistory';
import LoginForm from './LoginForm';
import './GameRoom.css';

const GameRoom = () => {
  const { player, gameState, gameHistory, connected } = useGame();

  if (!player.username) {
    return <LoginForm />;
  }

  return (
    <div className="game-room">
      {!connected && (
        <div className="connection-status">
          <p>⚠️ Conectando al servidor...</p>
        </div>
      )}
      
      <div className="game-main">
        <MultiplierDisplay 
          multiplier={gameState.currentMultiplier || 1.00}
          gameState={gameState}
          timeRemaining={gameState.timeRemaining || 0}
        />
        
        <BettingPanel />
      </div>

      <div className="game-sidebar">
        <PlayersList 
          players={gameState.players || []}
          activeBets={gameState.activeBets || []}
        />
        
        <GameHistory history={gameHistory || []} />
      </div>
    </div>
  );
};

export default GameRoom;