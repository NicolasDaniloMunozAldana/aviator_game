import React from 'react';
import { useGame } from '../context/GameContext';
import BettingPanel from './BettingPanel';
import PlayersList from './PlayersList';
import GameHistory from './GameHistory';
import LoginForm from './LoginForm';
import FlightScene from './FlightScene';
import './GameRoom.css';

const GameRoom = () => {
  const { player, gameState, gameHistory, connected, authenticationState } = useGame();

  // Mostrar LoginForm si no está autenticado o si está en proceso de autenticación
  if (authenticationState !== 'authenticated' || !player.isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="game-room redesign-fullscreen">
      {!connected && (
        <div className="connection-status inline-status">
          <p>Conectando al servidor...</p>
        </div>
      )}

      <div className="playfield">
        <FlightScene />
      </div>

      <div className="bottom-bar">
        <div className="panel panel-bet">
          <BettingPanel />
        </div>
        <div className="panel panel-history">
          <GameHistory history={gameHistory || []} />
        </div>
        <div className="panel panel-players">
          <PlayersList 
            players={gameState.players || []}
            activeBets={gameState.activeBets || []}
          />
        </div>
      </div>
    </div>
  );
};

export default GameRoom;