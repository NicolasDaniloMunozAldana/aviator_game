import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import './FlightScene.css';

/**
 * Escena principal con fondo desplazándose y avión animado.
 * El avión despega cuando el estado es in_progress y cae cuando crashed.
 */
const FlightScene = () => {
  const { gameState } = useGame();
  const { currentMultiplier = 1, currentState = 'waiting', timeRemaining = 0, roundNumber = 1 } = gameState || {};
  const [crashTrigger, setCrashTrigger] = useState(false);
  const prevStateRef = useRef(currentState);

  // NUEVO: altura fija tras lanzamiento rápido
  const [planeAltitude, setPlaneAltitude] = useState(0); // px
  const [stabilized, setStabilized] = useState(false);

  useEffect(() => {
    // detectar cambio de estado para controlar animaciones
    if (prevStateRef.current !== 'crashed' && currentState === 'crashed') {
      setCrashTrigger(true);
      setTimeout(() => setCrashTrigger(false), 2000);
    }
    if (currentState === 'waiting' || currentState === 'countdown') {
      setCrashTrigger(false);
      setPlaneAltitude(0);
      setStabilized(false);
    }
    if (currentState === 'in_progress' && prevStateRef.current !== 'in_progress') {
      // ascenso inmediato a una altura objetivo (independiente del multiplicador)
      const target = 240; // altura deseada
      // iniciar desde 0 para que el CSS transition haga el despegue rápido
      setPlaneAltitude(0);
      requestAnimationFrame(() => {
        setPlaneAltitude(target);
      });
      setStabilized(false);
      // después de la transición marcamos estabilizado
      setTimeout(() => setStabilized(true), 900);
    }
    prevStateRef.current = currentState;
  }, [currentState]);

  const getMultiplierColor = () => {
    if (currentState === 'crashed') return '#ff4d4f';
    if (currentMultiplier < 2) return '#10b981';
    if (currentMultiplier < 5) return '#fbbf24';
    if (currentMultiplier < 10) return '#fb7185';
    return '#f43f5e';
  };

  const getStateMessage = () => {
    switch (currentState) {
      case 'waiting':
        return `Esperando apuestas · Nueva ronda en ${Math.max(0, timeRemaining)}s`;
      case 'countdown':
        return `Despegue en ${Math.max(0, timeRemaining)}s`;
      case 'in_progress':
        return 'En vuelo';
      case 'crashed':
        return `Se estrelló en ${currentMultiplier.toFixed(2)}x`;
      default:
        return 'Preparando...';
    }
  };

  // Estilo del avión: ya no depende del multiplicador, sólo del ascenso inicial
  const planeDynamicStyle = (currentState === 'in_progress' && !crashTrigger)
    ? { transform: `translateY(-${planeAltitude}px) rotate(-20deg)` }
    : {};

  return (
    <div className={`flight-scene state-${currentState} ${crashTrigger ? 'crash' : ''}`}>
      <div className="scene-background"/>
      <div className="scene-overlay-gradient" />

      <div className="hud">
        <div className="round">Ronda #{roundNumber}</div>
        <div className="multiplier" style={{ color: getMultiplierColor() }}>
          {(currentState === 'waiting' || currentState === 'countdown') ? '1.00' : currentMultiplier.toFixed(2)}<span className="x">x</span>
        </div>
        <div className={`state-msg ${currentState}`}>{getStateMessage()}</div>

      </div>

      <img
        src="/avion.png"
        alt="Avión"
        className={`plane ${currentState} ${currentState === 'in_progress' ? (stabilized ? 'stabilized' : 'launching') : ''}`}
        style={planeDynamicStyle}
        draggable={false}
      />

      {currentState === 'crashed' && (
        <div className="crash-flash" />
      )}
    </div>
  );
};

export default FlightScene;
