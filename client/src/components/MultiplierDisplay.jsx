import React, { useState, useEffect } from 'react';
import './MultiplierDisplay.css';

const MultiplierDisplay = ({ multiplier, gameState, timeRemaining }) => {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    const currentState = gameState?.currentState || 'waiting';
    if (currentState === 'crashed') {
      setAnimationClass('crashed');
      setTimeout(() => setAnimationClass(''), 2000);
    } else if (currentState === 'in_progress') {
      setAnimationClass('rising');
    } else {
      setAnimationClass('');
    }
  }, [gameState?.currentState]);

  const getStateMessage = () => {
    const currentState = gameState?.currentState || 'waiting';
    switch (currentState) {
      case 'waiting':
        return `Esperando para nueva ronda: ${Math.max(0, timeRemaining)}s`;
      case 'countdown':
        return `¡El vuelo despega en ${Math.max(0, timeRemaining)}s!`;
      case 'in_progress':
        return '🚀 ¡El avión está volando!';
      case 'crashed':
        return `💥 ¡Se estrelló en ${multiplier.toFixed(2)}x!`;
      default:
        return 'Preparando nueva ronda...';
    }
  };

  const getMultiplierColor = () => {
    const currentState = gameState?.currentState || 'waiting';
    if (currentState === 'crashed') return '#ff4757';
    if (multiplier < 2) return '#2ed573';
    if (multiplier < 5) return '#ffa502';
    if (multiplier < 10) return '#ff6348';
    return '#ff3742';
  };

  const getDisplayMultiplier = () => {
    const currentState = gameState?.currentState || 'waiting';
    if (currentState === 'waiting' || currentState === 'countdown') {
      return '1.00';
    }
    return multiplier.toFixed(2);
  };

  return (
    <div className={`multiplier-display ${animationClass}`}>
      <div className="flight-info">
        <div className="airplane-icon">✈️</div>
        <div className="round-info">Ronda #{gameState?.roundNumber || 1}</div>
      </div>
      
      <div 
        className="multiplier-value" 
        style={{ color: getMultiplierColor() }}
      >
        {getDisplayMultiplier()}x
      </div>
      
      <div className="game-state">{getStateMessage()}</div>
      
      <div className="multiplier-bar">
        <div 
          className="multiplier-progress"
          style={{ 
            width: gameState?.currentState === 'in_progress' 
              ? `${Math.min(multiplier * 10, 100)}%` 
              : '0%',
            backgroundColor: getMultiplierColor()
          }}
        ></div>
      </div>
      
      {gameState?.currentState === 'waiting' && (
        <div className="waiting-message">
          Coloca tu apuesta antes de que despegue el avión
        </div>
      )}
    </div>
  );
};

export default MultiplierDisplay;