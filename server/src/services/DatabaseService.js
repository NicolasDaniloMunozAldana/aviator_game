import pg from 'pg';
const { Pool } = pg;

export class DatabaseService {
    constructor() {
        this.pool = null;
    }

    async initialize() {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 15432,
            database: process.env.DB_NAME || 'aviator_game',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres123',
            max: 20, // máximo número de conexiones en el pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

        this.pool = new Pool(dbConfig);

        // Probar conexión
        try {
            const client = await this.pool.connect();
            console.log('Conectado exitosamente a PostgreSQL');
            client.release();
            
            // Crear tablas si no existen
            await this.createTables();
        } catch (error) {
            console.error('Error conectando a PostgreSQL:', error);
            throw error;
        }
    }

    async createTables() {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Tabla de jugadores
            await client.query(`
                CREATE TABLE IF NOT EXISTS players (
                    id VARCHAR(255) PRIMARY KEY,
                    user_token VARCHAR(255) UNIQUE NOT NULL,
                    username VARCHAR(100) NOT NULL,
                    balance DECIMAL(10,2) DEFAULT 1000.00,
                    total_winnings DECIMAL(10,2) DEFAULT 0.00,
                    total_losses DECIMAL(10,2) DEFAULT 0.00,
                    games_played INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    last_seen TIMESTAMP DEFAULT NOW()
                )
            `);

            // Tabla de rondas de juego
            await client.query(`
                CREATE TABLE IF NOT EXISTS game_rounds (
                    id SERIAL PRIMARY KEY,
                    round_number INTEGER NOT NULL,
                    crash_multiplier DECIMAL(10,3) NOT NULL,
                    started_at TIMESTAMP NOT NULL,
                    ended_at TIMESTAMP NOT NULL,
                    total_bets INTEGER DEFAULT 0,
                    total_amount DECIMAL(10,2) DEFAULT 0.00
                )
            `);

            // Tabla de apuestas
            await client.query(`
                CREATE TABLE IF NOT EXISTS bets (
                    id SERIAL PRIMARY KEY,
                    player_id VARCHAR(255) REFERENCES players(id),
                    round_id INTEGER REFERENCES game_rounds(id),
                    round_number INTEGER NOT NULL,
                    bet_amount DECIMAL(10,2) NOT NULL,
                    cash_out_multiplier DECIMAL(10,3),
                    winnings DECIMAL(10,2) DEFAULT 0.00,
                    cashed_out BOOLEAN DEFAULT FALSE,
                    won BOOLEAN DEFAULT FALSE,
                    placed_at TIMESTAMP DEFAULT NOW(),
                    cashed_out_at TIMESTAMP
                )
            `);

            // Tabla de historial de sesiones
            await client.query(`
                CREATE TABLE IF NOT EXISTS player_sessions (
                    id SERIAL PRIMARY KEY,
                    player_id VARCHAR(255) REFERENCES players(id),
                    session_start TIMESTAMP DEFAULT NOW(),
                    session_end TIMESTAMP,
                    games_in_session INTEGER DEFAULT 0,
                    balance_start DECIMAL(10,2),
                    balance_end DECIMAL(10,2)
                )
            `);

            // Índices para optimizar consultas
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_players_user_token ON players(user_token);
                CREATE INDEX IF NOT EXISTS idx_bets_player_id ON bets(player_id);
                CREATE INDEX IF NOT EXISTS idx_bets_round_number ON bets(round_number);
                CREATE INDEX IF NOT EXISTS idx_game_rounds_round_number ON game_rounds(round_number);
            `);

            await client.query('COMMIT');
            console.log('Tablas de base de datos creadas exitosamente');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creando tablas:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Métodos para jugadores
    async createPlayer(username, userToken) {
        const client = await this.pool.connect();
        try {
            const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const result = await client.query(
                'INSERT INTO players (id, user_token, username, balance) VALUES ($1, $2, $3, $4) RETURNING *',
                [playerId, userToken, username, 1000.00]
            );
            
            return result.rows[0];
        } catch (error) {
            console.error('Error creando jugador:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getPlayerByToken(userToken) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM players WHERE user_token = $1',
                [userToken]
            );
            
            if (result.rows.length > 0) {
                // Actualizar last_seen
                await client.query(
                    'UPDATE players SET last_seen = NOW() WHERE user_token = $1',
                    [userToken]
                );
            }
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo jugador:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async updatePlayerBalance(playerId, newBalance) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'UPDATE players SET balance = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [newBalance, playerId]
            );
            
            return result.rows[0];
        } catch (error) {
            console.error('Error actualizando balance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async updatePlayerStats(playerId, winnings, losses, gamesPlayed) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                UPDATE players 
                SET total_winnings = total_winnings + $1, 
                    total_losses = total_losses + $2,
                    games_played = games_played + $3,
                    updated_at = NOW()
                WHERE id = $4 
                RETURNING *
            `, [winnings, losses, gamesPlayed, playerId]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Métodos para rondas de juego
    async createGameRound(roundNumber, crashMultiplier, startedAt, endedAt, totalBets, totalAmount) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO game_rounds (round_number, crash_multiplier, started_at, ended_at, total_bets, total_amount)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
            `, [roundNumber, crashMultiplier, startedAt, endedAt, totalBets, totalAmount]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error creando ronda de juego:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getGameHistory(limit = 50) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT gr.*, 
                       COUNT(b.id) as player_count,
                       COALESCE(SUM(b.bet_amount), 0) as total_bet_amount,
                       COALESCE(SUM(b.winnings), 0) as total_winnings
                FROM game_rounds gr
                LEFT JOIN bets b ON gr.id = b.round_id
                GROUP BY gr.id
                ORDER BY gr.round_number DESC
                LIMIT $1
            `, [limit]);
            
            return result.rows;
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Métodos para apuestas
    async createBet(playerId, roundId, roundNumber, betAmount) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO bets (player_id, round_id, round_number, bet_amount)
                VALUES ($1, $2, $3, $4) RETURNING *
            `, [playerId, roundId, roundNumber, betAmount]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error creando apuesta:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async updateBetCashOut(playerId, roundNumber, cashOutMultiplier, winnings) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                UPDATE bets 
                SET cash_out_multiplier = $1, 
                    winnings = $2, 
                    cashed_out = TRUE, 
                    won = TRUE,
                    cashed_out_at = NOW()
                WHERE player_id = $3 AND round_number = $4
                RETURNING *
            `, [cashOutMultiplier, winnings, playerId, roundNumber]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error actualizando cash out:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getPlayerBets(playerId, limit = 20) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT b.*, gr.crash_multiplier
                FROM bets b
                LEFT JOIN game_rounds gr ON b.round_id = gr.id
                WHERE b.player_id = $1
                ORDER BY b.placed_at DESC
                LIMIT $2
            `, [playerId, limit]);
            
            return result.rows;
        } catch (error) {
            console.error('Error obteniendo apuestas del jugador:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getRoundBets(roundNumber) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT b.*, p.username 
                FROM bets b
                JOIN players p ON b.player_id = p.id
                WHERE b.round_number = $1
                ORDER BY b.placed_at ASC
            `, [roundNumber]);
            
            return result.rows;
        } catch (error) {
            console.error('Error obteniendo apuestas de la ronda:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Método para cerrar la conexión
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('Pool de conexiones cerrado');
        }
    }
}

export default new DatabaseService();
