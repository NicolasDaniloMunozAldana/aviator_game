import React from 'react';
import './MultiplierDisplay.css';

const MultiplierDisplay = ({ multiplier, gameState, timeRemaining }) => {
  const getStateMessage = () => {
    switch (gameState) {
      case 'waiting':
        return `Esperando jugadores... ${timeRemaining}s`;
      case 'countdown':
        return `¡Prepárate! ${timeRemaining}s`;
      case 'in_progress':
        return '¡El multiplicador está subiendo!';
      case 'crashed':
        return '¡Juego terminado!';
      default:
        return 'Esperando nueva ronda...';
    }
  };

  const getMultiplierColor = () => {
    if (multiplier < 2) return 'green';
    if (multiplier < 5) return 'orange';
    return 'red';
  };

  return (
    <div className="multiplier-display">
      <div className="multiplier-value" style={{ color: getMultiplierColor() }}>
        {multiplier.toFixed(2)}x
      </div>
      <div className="game-state">{getStateMessage()}</div>
      <div className="multiplier-bar">
        <div 
          className="multiplier-progress"
          style={{ width: `${Math.min(multiplier * 2, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default MultiplierDisplay;