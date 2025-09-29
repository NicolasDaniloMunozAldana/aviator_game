import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSocket } from '../hooks/useSocket';

const GameContext = createContext();

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame debe usarse dentro de GameProvider');
    }
    return context;
};

export const GameProvider = ({ children }) => {
    const [gameState, setGameState] = useState({
        currentMultiplier: 1.00,
        currentState: 'waiting',
        players: [],
        activeBets: [],
        timeRemaining: 0,
        roundNumber: 0,
        playerCount: 0,
        cashOuts: []
    });

    const [player, setPlayer] = useState({
        id: null,
        username: '',
        balance: 1000,
        myBets: [],
        hasBet: false,
        hasCashedOut: false
    });

    const [gameHistory, setGameHistory] = useState([]);
    const [connected, setConnected] = useState(false);

    const getServerUrl = () => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        return `http://${hostname}:3000`;
    };

    const socket = useSocket(getServerUrl());
    // Efecto para manejar eventos del socket
    useEffect(() => {
        if (!socket) return;

        // Conexión establecida
        socket.on('connect', () => {
            console.log('Conectado al servidor:', socket.id);
            setConnected(true);
            setPlayer(prev => ({ ...prev, id: socket.id }));
        });

        // Conexión perdida
        socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            setConnected(false);
        });

        // Estado del juego
        socket.on('game_state_update', (state) => {
            console.log('Estado del juego actualizado:', state);
            setGameState(prev => ({
                ...prev,
                ...state
            }));

            // Actualizar si tengo apuesta activa
            if (state.activeBets && socket.id) {
                const myBet = state.activeBets.find(bet => bet.playerId === socket.id);
                if (myBet) {
                    setPlayer(prev => ({
                        ...prev,
                        hasBet: true,
                        hasCashedOut: myBet.hasCashedOut || false
                    }));
                } else if (state.currentState === 'waiting') {
                    // Reset bet status in new round
                    setPlayer(prev => ({
                        ...prev,
                        hasBet: false,
                        hasCashedOut: false
                    }));
                }
            }


        });

        // Actualización del multiplicador en tiempo real
        socket.on('multiplier_update', (data) => {
            console.log('Multiplicador actualizado:', data.multiplier);
            setGameState(prev => ({
                ...prev,
                currentMultiplier: data.multiplier,
                // Asegurar que el estado esté en progreso cuando recibimos multiplicador
                currentState: prev.currentState === 'countdown' || prev.currentState === 'waiting' ? 'in_progress' : prev.currentState
            }));
        });

        // Cuando un jugador apuesta
        socket.on('player_bet', (betData) => {
            console.log('Apuesta realizada:', betData);

            // Actualizar estado del juego si viene incluido
            if (betData.gameState) {
                setGameState(prev => ({
                    ...prev,
                    ...betData.gameState
                }));
            }
        });

        // Resultado de mi apuesta
        socket.on('bet_result', (result) => {
            console.log('Resultado de apuesta:', result);
            if (result.success) {
                setPlayer(prev => ({
                    ...prev,
                    balance: result.newBalance,
                    hasBet: true,
                    hasCashedOut: false
                }));
            } else {
                alert(result.error || 'Error al realizar apuesta');
            }
        });

        // Cuando un jugador retira
        socket.on('player_cash_out', (cashOutData) => {
            console.log('Jugador retiró:', cashOutData);

            // Actualizar estado del juego si viene incluido
            if (cashOutData.gameState) {
                setGameState(prev => ({
                    ...prev,
                    ...cashOutData.gameState
                }));
            }
        });

        // Resultado de mi retiro
        socket.on('cash_out_result', (result) => {
            console.log('Resultado de retiro:', result);
            if (result.success) {
                setPlayer(prev => ({
                    ...prev,
                    balance: result.newBalance,
                    hasCashedOut: true
                }));

            } else {
                alert(result.error || 'Error al retirar');
            }
        });

        // Historial del juego
        socket.on('game_history', (history) => {
            console.log('Historial recibido:', history);
            setGameHistory(history || []);
        });

        // Jugador se une
        socket.on('player_joined', (playerData) => {
            console.log('Jugador se unió:', playerData);

            // Actualizar estado del juego si viene incluido
            if (playerData.gameState) {
                setGameState(prev => ({
                    ...prev,
                    ...playerData.gameState
                }));
            }
        });

        // Ronda completada
        socket.on('round_complete', (roundData) => {
            console.log('Ronda completada:', roundData);
            // Reiniciar estado del jugador para nueva ronda
            setPlayer(prev => ({
                ...prev,
                hasBet: false,
                hasCashedOut: false,
                myBets: []
            }));

            // Agregar al historial
            setGameHistory(prev => [roundData, ...prev.slice(0, 9)]);
        });

        // Countdown durante waiting
        socket.on('waiting_countdown', (data) => {
            console.log('Waiting countdown:', data);
            setGameState(prev => ({
                ...prev,
                timeRemaining: data.timeRemaining
            }));
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('game_state_update');
            socket.off('multiplier_update');
            socket.off('player_bet');
            socket.off('bet_result');
            socket.off('player_cash_out');
            socket.off('cash_out_result');
            socket.off('game_history');
            socket.off('player_joined');
            socket.off('round_complete');
            socket.off('waiting_countdown');
        };
    }, [socket]);

    // Unirse al juego
    const joinGame = (username) => {
        if (!socket || !username) return;

        const playerData = {
            username,
            balance: player.balance,
            id: socket.id
        };

        setPlayer(prev => ({ ...prev, username, id: socket.id }));
        socket.emit('player_join', playerData);
    };

    // Realizar apuesta
    const placeBet = (amount) => {
        if (!socket || !player.id) return;

        const betData = {
            amount: parseFloat(amount),
            currency: 'USD',
            playerId: player.id
        };

        socket.emit('place_bet', betData);
    };

    // Retirar ganancias
    const cashOut = () => {
        if (!socket || !player.id) return;
        socket.emit('cash_out');
    };

    const value = {
        gameState,
        player,
        gameHistory,
        socket,
        connected,
        joinGame,
        placeBet,
        cashOut
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};