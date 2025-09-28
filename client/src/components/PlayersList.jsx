import React from 'react';
import { useGame } from '../context/GameContext';
import './PlayersList.css';

const PlayersList = ({ players = [], activeBets = [] }) => {
  const { gameState } = useGame();

  const getPlayerStatus = (player, playerBet) => {
    if (!playerBet) return { status: 'waiting', icon: '', text: 'Esperando' };
    
    if (playerBet.hasCashedOut) {
      return { 
        status: 'cashed-out', 
        icon: '✅', 
        text: `Retiró en ${playerBet.cashOutMultiplier?.toFixed(2)}x`,
        winnings: (playerBet.amount * playerBet.cashOutMultiplier).toFixed(2)
      };
    }
    
    if (gameState.currentState === 'in_progress') {
      return { 
        status: 'flying', 
        icon: '🚀', 
        text: 'En vuelo',
        potential: (playerBet.amount * gameState.currentMultiplier).toFixed(2)
      };
    }
    
    if (gameState.currentState === 'crashed') {
      return { 
        status: 'lost', 
        icon: '💥', 
        text: 'Perdió'
      };
    }
    
    return { 
      status: 'betting', 
      icon: '💰', 
      text: `Apostó $${playerBet.amount}`
    };
  };

  if (!players || players.length === 0) {
    return (
      <div className="players-list">
        <h3>👥 Jugadores en sala (0)</h3>
        <div className="no-players">
          <div className="empty-room-icon">🏢</div>
          <p>Sala vacía</p>
          <small>Esperando jugadores...</small>
        </div>
      </div>
    );
  }

  return (
    <div className="players-list">
      <h3>Jugadores en sala ({players.length})</h3>
      
      <div className="game-stats">
        <div className="stat">
          <span className="stat-label">Apuestas activas:</span>
          <span className="stat-value">{activeBets.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total apostado:</span>
          <span className="stat-value">
            ${activeBets.reduce((sum, bet) => sum + bet.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="players-container">
        {players.map((player, index) => {
          const playerBet = activeBets.find(bet => bet.playerId === player.id);
          const status = getPlayerStatus(player, playerBet);
          
          return (
            <div key={player.id || index} className={`player-item ${status.status}`}>
              <div className="player-header">
                <div className="player-info">
                  <span className="player-name">{player.username || 'Jugador Anónimo'}</span>
                </div>
                <span className="player-balance">
                  ${(player.balance || 1000).toFixed(2)}
                </span>
              </div>
              
              <div className="player-status">
                <span className="status-icon">{status.icon}</span>
                <span className="status-text">{status.text}</span>
                
                {status.winnings && (
                  <span className="winnings">
                    +${status.winnings}
                  </span>
                )}
                
                {status.potential && (
                  <span className="potential">
                    Potencial: ${status.potential}
                  </span>
                )}
              </div>
              
              {playerBet && !playerBet.hasCashedOut && (
                <div className="bet-details">
                  <div className="bet-amount">
                    Apostó: <strong>${playerBet.amount}</strong>
                  </div>
                  {gameState.currentState === 'in_progress' && (
                    <div className="current-multiplier">
                      @ {gameState.currentMultiplier.toFixed(2)}x
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {activeBets.length === 0 && gameState.currentState === 'waiting' && (
        <div className="no-bets">
          <p>¡Sé el primero en apostar!</p>
        </div>
      )}
    </div>
  );
};

export default PlayersList;