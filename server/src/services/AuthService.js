import crypto from 'crypto';
import databaseService from './DatabaseService.js';
import { Player } from '../models/Player.js';

export class AuthService {
    constructor() {
        this.activeSessions = new Map(); // socketId -> player
    }

    // Generar token único para el usuario
    generateUserToken() {
        const timestamp = Date.now().toString(36);
        const randomPart = crypto.randomBytes(8).toString('hex');
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
                    console.log(`✅ Usuario existente autenticado: ${player.username}`);
                    return {
                        success: true,
                        player: player,
                        userToken: player.userToken,
                        isNewUser: false
                    };
                } else {
                    console.log('⚠️ Token no válido, creando nuevo usuario');
                }
            }

            // Usuario nuevo o token inválido - crear nuevo jugador
            const newUserToken = this.generateUserToken();
            const playerData = await databaseService.createPlayer(username, newUserToken);
            
            if (playerData) {
                player = new Player(playerData);
            } else {
                // Si falla la BD, crear jugador en memoria
                player = new Player({
                    userToken: newUserToken,
                    username: username,
                    balance: 1000
                });
            }

            console.log(`✅ Nuevo usuario creado: ${player.username}`);

            return {
                success: true,
                player: player,
                userToken: newUserToken,
                isNewUser: true
            };

        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            return {
                success: false,
                error: 'Error del servidor durante la autenticación'
            };
        }
    }

    // Asociar jugador con sesión de socket
    associateSocketWithPlayer(socketId, player) {
        this.activeSessions.set(socketId, player);
        console.log(`🔗 Socket ${socketId} asociado con jugador ${player.username}`);
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
            console.log(`🔓 Sesión removida para socket ${socketId} (${player.username})`);
        }
        return player;
    }

    // Obtener todos los jugadores activos
    getActivePlayers() {
        return Array.from(this.activeSessions.values());
    }

    // Actualizar balance del jugador
    async updatePlayerBalance(userToken, newBalance) {
        try {
            // Actualizar en base de datos
            const updatedPlayer = await databaseService.updatePlayerBalance(userToken, newBalance);
            
            // Actualizar en sesiones activas
            for (const [socketId, player] of this.activeSessions.entries()) {
                if (player.userToken === userToken) {
                    player.balance = newBalance;
                    break;
                }
            }

            if (updatedPlayer) {
                return new Player(updatedPlayer);
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error actualizando balance del jugador:', error);
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
}

export default new AuthService();
