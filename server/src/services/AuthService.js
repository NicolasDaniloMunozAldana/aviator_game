import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import databaseService from './DatabaseService.js';
import { Player } from '../models/Player.js';

export class AuthService {
    constructor() {
        this.activeSessions = new Map(); // socketId -> player
    }

    // Generar token único para el usuario
    generateUserToken() {
        // Crear un token único que será guardado en localStorage
        const timestamp = Date.now().toString(36);
        const randomPart = crypto.randomBytes(16).toString('hex');
        return `aviator_${timestamp}_${randomPart}`;
    }

    // Autenticar o crear usuario
    async authenticateUser(username, userToken = null) {
        try {
            let player;

            if (userToken) {
                // Usuario existente - buscar por token
                const playerData = await databaseService.getPlayerByToken(userToken);
                if (playerData) {
                    player = new Player(playerData);
                    console.log(`Usuario existente autenticado: ${player.username} (${player.id})`);
                    return {
                        success: true,
                        player: player,
                        userToken: player.userToken,
                        isNewUser: false
                    };
                } else {
                    console.log('Token no válido o expirado, creando nuevo usuario');
                }
            }

            // Usuario nuevo o token inválido - crear nuevo jugador
            const newUserToken = this.generateUserToken();
            const playerData = await databaseService.createPlayer(username, newUserToken);
            player = new Player(playerData);

            console.log(`Nuevo usuario creado: ${player.username} (${player.id})`);

            return {
                success: true,
                player: player,
                userToken: newUserToken,
                isNewUser: true
            };

        } catch (error) {
            console.error('Error en autenticación:', error);
            return {
                success: false,
                error: 'Error del servidor durante la autenticación'
            };
        }
    }

    // Asociar jugador con sesión de socket
    associateSocketWithPlayer(socketId, player) {
        this.activeSessions.set(socketId, player);
        console.log(`Socket ${socketId} asociado con jugador ${player.username}`);
    }

    // Obtener jugador por socket ID
    getPlayerBySocket(socketId) {
        return this.activeSessions.get(socketId);
    }

    // Remover sesión de socket
    removeSocketSession(socketId) {
        const player = this.activeSessions.get(socketId);
        if (player) {
            this.activeSessions.delete(socketId);
            console.log(`Sesión removida para socket ${socketId} (${player.username})`);
        }
        return player;
    }

    // Obtener todos los jugadores activos
    getActivePlayers() {
        return Array.from(this.activeSessions.values());
    }

    // Actualizar balance del jugador en la sesión activa
    async updatePlayerBalance(playerId, newBalance) {
        try {
            // Actualizar en base de datos
            const updatedPlayer = await databaseService.updatePlayerBalance(playerId, newBalance);
            
            // Actualizar en sesiones activas
            for (const [socketId, player] of this.activeSessions.entries()) {
                if (player.id === playerId) {
                    player.balance = newBalance;
                    break;
                }
            }

            return new Player(updatedPlayer);
        } catch (error) {
            console.error('Error actualizando balance del jugador:', error);
            throw error;
        }
    }

    // Validar que el usuario pueda realizar una apuesta
    validateBetAmount(player, betAmount) {
        if (!player) {
            return { valid: false, error: 'Jugador no encontrado' };
        }

        if (typeof betAmount !== 'number' || betAmount <= 0) {
            return { valid: false, error: 'Monto de apuesta inválido' };
        }

        if (betAmount > player.balance) {
            return { valid: false, error: 'Saldo insuficiente' };
        }

        if (betAmount < 1) {
            return { valid: false, error: 'El monto mínimo de apuesta es $1' };
        }

        if (betAmount > 10000) {
            return { valid: false, error: 'El monto máximo de apuesta es $10,000' };
        }

        return { valid: true };
    }

    // Obtener estadísticas del jugador
    async getPlayerStats(playerId) {
        try {
            const playerData = await databaseService.getPlayerByToken(playerId);
            if (!playerData) {
                return null;
            }

            const player = new Player(playerData);
            const recentBets = await databaseService.getPlayerBets(playerId, 10);
            
            return {
                player: player.toJSON(),
                stats: player.getStats(),
                recentBets: recentBets
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas del jugador:', error);
            throw error;
        }
    }
}

export default new AuthService();
