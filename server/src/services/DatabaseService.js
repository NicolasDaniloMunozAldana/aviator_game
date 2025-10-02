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
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        };

        this.pool = new Pool(dbConfig);

        // Probar conexión
        try {
            const client = await this.pool.connect();
            console.log('✅ Conectado exitosamente a PostgreSQL');
            client.release();
            
            // Crear tablas si no existen
            await this.createTables();
        } catch (error) {
            console.error('❌ Error conectando a PostgreSQL:', error);
            console.log('⚠️ Continuando sin base de datos - modo en memoria');
        }
    }

    async createTables() {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Tabla de jugadores simplificada
            await client.query(`
                CREATE TABLE IF NOT EXISTS players (
                    user_token VARCHAR(255) PRIMARY KEY,
                    username VARCHAR(100) NOT NULL,
                    balance DECIMAL(10,2) DEFAULT 1000.00,
                    created_at TIMESTAMP DEFAULT NOW(),
                    last_seen TIMESTAMP DEFAULT NOW()
                )
            `);

            // Tabla de rondas de juego simplificada
            await client.query(`
                CREATE TABLE IF NOT EXISTS game_rounds (
                    id SERIAL PRIMARY KEY,
                    round_number INTEGER NOT NULL,
                    crash_multiplier DECIMAL(10,2) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            await client.query('COMMIT');
            console.log('✅ Tablas de base de datos creadas exitosamente');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error creando tablas:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Métodos para jugadores
    async createPlayer(username, userToken) {
        if (!this.pool) return null;
        
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'INSERT INTO players (user_token, username, balance) VALUES ($1, $2, $3) RETURNING *',
                [userToken, username, 1000.00]
            );
            
            console.log('✅ Jugador creado:', username);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error creando jugador:', error);
            return null;
        } finally {
            client.release();
        }
    }

    async getPlayerByToken(userToken) {
        if (!this.pool) return null;
        
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
                return result.rows[0];
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error obteniendo jugador:', error);
            return null;
        } finally {
            client.release();
        }
    }

    async updatePlayerBalance(userToken, newBalance) {
        if (!this.pool) return null;
        
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'UPDATE players SET balance = $1, last_seen = NOW() WHERE user_token = $2 RETURNING *',
                [newBalance, userToken]
            );
            
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error actualizando balance:', error);
            return null;
        } finally {
            client.release();
        }
    }

    // Métodos para rondas de juego
    async saveGameRound(roundNumber, crashMultiplier) {
        if (!this.pool) return null;
        
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO game_rounds (round_number, crash_multiplier)
                VALUES ($1, $2) RETURNING *
            `, [roundNumber, crashMultiplier]);
            
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error guardando ronda:', error);
            return null;
        } finally {
            client.release();
        }
    }

    async getGameHistory(limit = 10) {
        if (!this.pool) return [];
        
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT round_number, crash_multiplier, created_at
                FROM game_rounds
                ORDER BY round_number DESC
                LIMIT $1
            `, [limit]);
            
            return result.rows;
        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);
            return [];
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