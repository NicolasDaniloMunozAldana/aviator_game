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

  // NUEVO: altura y posición horizontal fija tras lanzamiento rápido
  const [planeAltitude, setPlaneAltitude] = useState(0); // px
  const [planeHorizontal, setPlaneHorizontal] = useState(0); // px hacia adelante
  const [stabilized, setStabilized] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  // Nuevo: control de reentrada del avión tras un crash
  const [reentryActive, setReentryActive] = useState(false); // indica si está ejecutando animación de reentrada
  const [reentryStyle, setReentryStyle] = useState(null); // estilo dinámico (transform/opacity) durante reentrada

  useEffect(() => {
    // detectar cambio de estado para controlar animaciones
    if (prevStateRef.current !== 'crashed' && currentState === 'crashed') {
      setCrashTrigger(true);
      setShowExplosion(true);
      setTimeout(() => setCrashTrigger(false), 2000);
      setTimeout(() => setShowExplosion(false), 1500); // la explosión dura menos que el crash
    }
    if (currentState === 'waiting' || currentState === 'countdown') {
      setCrashTrigger(false);
      setShowExplosion(false);
      setPlaneAltitude(0);
      setPlaneHorizontal(0);
      setStabilized(false);
    }
    // Cuando pasamos de crashed a waiting/countdown iniciamos animación de reentrada
    if (prevStateRef.current === 'crashed' && (currentState === 'waiting' || currentState === 'countdown')) {
      // activamos reentrada: partimos fuera de pantalla a la izquierda y con opacidad 0
      setReentryActive(true);
      setReentryStyle({
        transform: 'translateX(-420px) translateY(0) scale(0.9)',
        opacity: 0
      });
      // siguiente frame: objetivo es posición natural (transform none => usamos 0) y opacidad 1
      requestAnimationFrame(() => {
        setReentryStyle({
          transform: 'translateX(0) translateY(0) scale(1)',
          opacity: 1,
          transition: 'transform 1s ease-out, opacity 0.8s ease-out'
        });
      });
      // al finalizar limpiamos para restaurar animaciones idle
      setTimeout(() => {
        setReentryActive(false);
        setReentryStyle(null);
      }, 1100);
    }
    if (currentState === 'in_progress' && prevStateRef.current !== 'in_progress') {
      // ascenso y avance inmediato a posiciones objetivo (independiente del multiplicador)
      const targetAltitude = 240; // altura deseada
      const targetHorizontal = 200; // avance hacia adelante deseado
      // iniciar desde 0 para que el CSS transition haga el despegue rápido
      setPlaneAltitude(0);
      setPlaneHorizontal(0);
      requestAnimationFrame(() => {
        setPlaneAltitude(targetAltitude);
        setPlaneHorizontal(targetHorizontal);
      });
      setStabilized(false);
      // después de la transición marcamos estabilizado (coincide con CSS transition)
      setTimeout(() => setStabilized(true), 1200);
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

  // Estilo del avión: mantiene posición durante vuelo y maneja crash desde posición actual
  const planeDynamicStyle = (() => {
    if (currentState === 'in_progress' && !crashTrigger) {
      return { transform: `translateX(${planeHorizontal}px) translateY(-${planeAltitude}px) rotate(-20deg)` };
    }
    if (currentState === 'crashed' && crashTrigger) {
      // Crash desde la posición actual con caída gradual
      return { 
        transform: `translateX(${planeHorizontal}px) translateY(-${planeAltitude - 350}px) rotate(45deg) scale(0.7)`,
        transition: 'transform 1.5s cubic-bezier(.77, .07, .91, .58), opacity 1.5s ease-out',
        opacity: 0.3
      };
    }
    return {};
  })();

  // Fusionar estilo dinámico de vuelo/crash con el de reentrada (si aplica y solo en waiting/countdown)
  const combinedPlaneStyle = {
    ...planeDynamicStyle,
    ...(reentryActive ? reentryStyle : {})
  };

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
    crashed: 10
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
        className={`plane ${crashTrigger ? 'crashing' : currentState} ${currentState === 'in_progress' ? (stabilized ? 'stabilized' : 'launching') : ''} ${reentryActive ? 'reentering' : ''}`}
        style={combinedPlaneStyle}
        draggable={false}
      />

      {currentState === 'crashed' && (
        <div className="crash-flash" />
      )}

      {showExplosion && (
        <div 
          className="explosion"
          style={{
            left: `calc(18% + ${planeHorizontal}px)`,
            bottom: `calc(15% + ${planeAltitude}px)`
          }}
        >
          <div className="explosion-circle"></div>
          <div className="smoke-puff smoke-1"></div>
          <div className="smoke-puff smoke-2"></div>
          <div className="smoke-puff smoke-3"></div>
        </div>
      )}
    </div>
  );
};

export default FlightScene;
