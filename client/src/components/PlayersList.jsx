import React from 'react';
import './PlayersList.css';

const PlayersList = ({ players = [], activeBets = [] }) => {
  if (!players || players.length === 0) {
    return (
      <div className="players-list">
        <h3>🎮 Jugadores en sala (0)</h3>
        <div className="no-players">
          No hay jugadores conectados
        </div>
      </div>
    );
  }

  return (
    <div className="players-list">
      <h3>🎮 Jugadores en sala ({players.length})</h3>
      
      <div className="players-container">
        {players.map((player, index) => {
          const playerBet = activeBets.find(bet => bet.playerId === player.id);
          
          return (
            <div key={player.id || index} className="player-item">
              <div className="player-info">
                <span className="player-name">{player.username || 'Jugador Anónimo'}</span>
                <span className="player-balance">
                  ${(player.balance || 1000).toFixed(2)}
                </span>
              </div>
              
              {playerBet && (
                <div className="player-bet">
                  Apuesta: <strong>${playerBet.amount}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayersList;