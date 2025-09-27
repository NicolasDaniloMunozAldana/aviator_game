export const GAME_CONFIG = {
    ROUND_DURATION: 30000, // 10 segundos para apostar
    COUNTDOWN_DURATION: 5000, // 5 segundos de cuenta regresiva
    MULTIPLIER_UPDATE_INTERVAL: 100, // Actualizar cada 100ms
    MAX_MULTIPLIER: 100, // Multiplicador máximo
    HOUSE_EDGE: 0.05, // 5% de ventaja de la casa
    MIN_BET_AMOUNT: 1,
    MAX_BET_AMOUNT: 1000
};

// Estados del juego
export const GAME_STATES = {
    WAITING: 'waiting', // Esperando jugadores
    COUNTDOWN: 'countdown', // Cuenta regresiva
    IN_PROGRESS: 'in_progress', // Multiplicador en aumento
    CRASHED: 'crashed', // Juego terminado
    CASHED_OUT: 'cashed_out' // Jugadores retiraron
};

// Eventos de Socket.io
export const SOCKET_EVENTS = {
    GAME_STATE_UPDATE: 'game_state_update',
    PLAYER_BET: 'player_bet',
    PLAYER_CASH_OUT: 'player_cash_out',
    MULTIPLIER_UPDATE: 'multiplier_update',
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',
    GAME_HISTORY: 'game_history'
};