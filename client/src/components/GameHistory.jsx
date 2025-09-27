import React from 'react';
import './GameHistory.css';

const GameHistory = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return (
      <div className="game-history">
        <h3>📊 Historial de rondas</h3>
        <div className="no-history">
          No hay historial disponible
        </div>
      </div>
    );
  }

  return (
    <div className="game-history">
      <h3>📊 Historial de rondas</h3>
      
      <div className="history-list">
        {history.slice(0, 10).map((round, index) => {
          const crashMultiplier = round.crashMultiplier || 0;
          const results = round.results || [];
          
          return (
            <div key={round.roundNumber || index} className="history-item">
              <span className="round-number">Ronda {round.roundNumber || index + 1}</span>
              <span className={`crash-multiplier ${crashMultiplier > 5 ? 'high' : ''}`}>
                {crashMultiplier.toFixed(2)}x
              </span>
              <span className="player-count">{results.length} jugadores</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameHistory;