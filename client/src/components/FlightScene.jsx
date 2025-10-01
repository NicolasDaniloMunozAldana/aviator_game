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

  // ================= Scroll infinito del fondo =================
  const containerRef = useRef(null); // .scene-background
  const layerRef = useRef(null); // .scroll-layer que contiene segmentos
  const segmentWidthRef = useRef(0);
  const segmentsRef = useRef([]); // DOM nodes
  const animRef = useRef(null);
  const lastTimeRef = useRef(0);

  const SPEED_MAP = {
    waiting: 20,
    countdown: 55,
    in_progress: 95,
    crashed: 0
  };

  // Ref para poder leer el estado más reciente dentro del callback de rAF sin reiniciar el loop
  const stateRef = useRef(currentState);
  useEffect(() => { stateRef.current = currentState; }, [currentState]);

  useEffect(() => {
    const img = new Image();
    img.src = '/scene.png';
    img.onload = () => setupSegments(img);
    const handleResize = () => {
      if (!segmentsRef.current.length) return;
      setupSegments(img, true);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { lastTimeRef.current = 0; }, [currentState]);

  const setupSegments = (img, isResize = false) => {
    const container = containerRef.current;
    const layer = layerRef.current;
    if (!container || !layer) return;

    const h = container.clientHeight || 1;
    const scale = h / img.height;
    const segW = img.width * scale;
    segmentWidthRef.current = segW;

    cancelAnimationFrame(animRef.current);
    layer.innerHTML = '';
    segmentsRef.current = [];

    const needed = Math.ceil((container.clientWidth * 2) / segW) + 1;
    for (let i = 0; i < needed; i++) {
      const div = document.createElement('div');
      div.className = 'bg-segment';
      div.style.width = segW + 'px';
      layer.appendChild(div);
      segmentsRef.current.push(div);
    }
    layer.style.transform = 'translateX(0px)';
    startLoop();
  };

  const startLoop = () => {
    lastTimeRef.current = 0;
    const frame = (ts) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = (ts - lastTimeRef.current) / 1000;
      lastTimeRef.current = ts;
      const speed = SPEED_MAP[stateRef.current] ?? 40;
      advance(dt * speed);
      animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
  };

  const advance = (dx) => {
    if (!layerRef.current || dx === 0) return;
    const layer = layerRef.current;
    const currentX = getTranslateX(layer);
    let nextX = currentX - dx;
    const segW = segmentWidthRef.current;
    if (-nextX >= segW) {
      const first = segmentsRef.current.shift();
      if (first) {
        segmentsRef.current.push(first);
        layer.appendChild(first);
      }
      nextX += segW;
    }
    layer.style.transform = `translateX(${nextX}px)`;
  };

  const getTranslateX = (el) => {
    const t = window.getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(Number);
      return parts[4] || 0;
    }
    return 0;
  };

  return (
    <div className={`flight-scene state-${currentState} ${crashTrigger ? 'crash' : ''}`}>
      <div className="scene-background" ref={containerRef}>
        <div className="scroll-layer" ref={layerRef} />
      </div>
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
