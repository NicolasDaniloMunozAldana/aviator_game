# 🎮 Aviator Game - Guía de Persistencia de Datos

## 📋 Resumen de Cambios

Se ha implementado un sistema completo de persistencia de datos para el juego Aviator que incluye:

- **Autenticación simple**: Basada en tokens guardados en localStorage
- **Persistencia de jugadores**: Balance, estadísticas y historial se mantienen
- **Base de datos PostgreSQL**: Cluster de alta disponibilidad con Patroni
- **Sincronización automática**: Los datos se restauran al reconectar

## 🔧 Configuración Inicial

### 1. Instalar Dependencias

```bash
cd server
npm install
```

### 2. Configurar Base de Datos

```bash
# Ejecutar script de configuración
./scripts/setup_database.sh
```

O manualmente:

```bash
cd db
docker-compose up -d
```

### 3. Configurar Variables de Entorno

Crear archivo `.env` en la carpeta `server/`:

```env
# Configuración del servidor
PORT=3000
HOST=0.0.0.0
NAME=aviator-backend

# Redis (para Socket.IO y sincronización)
REDIS_URL=redis://redis:6379

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=15432
DB_NAME=aviator_game
DB_USER=postgres
DB_PASSWORD=postgres123

# Configuración del cluster
IS_LEADER=true

NODE_ENV=development
```

### 4. Iniciar el Servidor

```bash
cd server
npm run dev
```

### 5. Iniciar el Cliente

```bash
cd client
npm run dev
```

## 🎯 Funcionamiento del Sistema

### Autenticación de Usuario

1. **Primera vez**: El usuario ingresa un nombre, se crea una cuenta nueva con token único
2. **Regreso**: Si hay un token en localStorage, se restaura la sesión automáticamente
3. **Múltiples usuarios**: Se puede cerrar sesión para cambiar de usuario

### Persistencia de Datos

Los siguientes datos se guardan automáticamente:

- ✅ **Balance del jugador** - Se actualiza en tiempo real
- ✅ **Historial de apuestas** - Todas las apuestas realizadas
- ✅ **Estadísticas** - Ganancias, pérdidas, partidas jugadas
- ✅ **Historial de rondas** - Multiplicadores y resultados
- ✅ **Sesiones de juego** - Tiempo de juego y actividad

### Flujo de Usuario

```
1. Usuario abre la aplicación
   ↓
2. Sistema verifica localStorage
   ↓
3a. Con token → Autenticación automática
3b. Sin token → Mostrar formulario de login
   ↓
4. Usuario autenticado → Acceso al juego
   ↓
5. Todas las acciones se persisten automáticamente
```

## 🗄️ Estructura de Base de Datos

### Tabla `players`
```sql
- id (VARCHAR): ID único del jugador
- user_token (VARCHAR): Token de autenticación
- username (VARCHAR): Nombre de usuario
- balance (DECIMAL): Balance actual
- total_winnings (DECIMAL): Ganancias totales
- total_losses (DECIMAL): Pérdidas totales
- games_played (INTEGER): Partidas jugadas
- created_at (TIMESTAMP): Fecha de creación
- updated_at (TIMESTAMP): Última actualización
- last_seen (TIMESTAMP): Última conexión
```

### Tabla `game_rounds`
```sql
- id (SERIAL): ID de la ronda
- round_number (INTEGER): Número de ronda
- crash_multiplier (DECIMAL): Multiplicador de crash
- started_at (TIMESTAMP): Inicio de ronda
- ended_at (TIMESTAMP): Final de ronda
- total_bets (INTEGER): Total de apuestas
- total_amount (DECIMAL): Monto total apostado
```

### Tabla `bets`
```sql
- id (SERIAL): ID de la apuesta
- player_id (VARCHAR): ID del jugador
- round_id (INTEGER): ID de la ronda
- round_number (INTEGER): Número de ronda
- bet_amount (DECIMAL): Monto apostado
- cash_out_multiplier (DECIMAL): Multiplicador de retiro
- winnings (DECIMAL): Ganancias obtenidas
- cashed_out (BOOLEAN): Si se retiró o no
- won (BOOLEAN): Si ganó o perdió
- placed_at (TIMESTAMP): Momento de la apuesta
- cashed_out_at (TIMESTAMP): Momento del retiro
```

## 🚀 Funciones Principales

### Cliente (Frontend)

#### Autenticación Automática
```javascript
// Se ejecuta automáticamente al conectar
const tryAutoAuthentication = () => {
    const savedToken = localStorage.getItem('aviator_user_token');
    const savedUsername = localStorage.getItem('aviator_username');
    
    if (savedToken && savedUsername && socket) {
        socket.emit('authenticate', {
            username: savedUsername,
            userToken: savedToken
        });
    }
};
```

#### Guardar Sesión
```javascript
// Se guarda automáticamente tras autenticación exitosa
socket.on('authenticated', (authData) => {
    if (authData.userToken) {
        localStorage.setItem('aviator_user_token', authData.userToken);
        localStorage.setItem('aviator_username', authData.player.username);
    }
});
```

### Servidor (Backend)

#### Servicio de Autenticación
```javascript
// Crear o autenticar usuario
const authResult = await authService.authenticateUser(username, userToken);

// Resultado incluye:
// - success: boolean
// - player: Player object
// - userToken: string
// - isNewUser: boolean
```

#### Persistencia de Apuestas
```javascript
// Las apuestas se guardan automáticamente
const bet = await databaseService.createBet(playerId, roundId, roundNumber, betAmount);

// Los retiros se actualizan automáticamente
const updatedBet = await databaseService.updateBetCashOut(playerId, roundNumber, multiplier, winnings);
```

## 🔄 Eventos de Socket Nuevos

### Cliente → Servidor

- `authenticate`: Autenticar usuario con token
- `get_player_stats`: Obtener estadísticas del jugador

### Servidor → Cliente

- `authenticated`: Autenticación exitosa
- `authentication_failed`: Error de autenticación
- `player_stats`: Estadísticas del jugador

## 📊 Monitoreo y Estadísticas

### HAProxy Stats
- URL: http://localhost:9090/stats
- Usuario: admin / Contraseña: admin123

### Base de Datos
- Conexión Write: localhost:15432
- Conexión Read: localhost:15433

### Logs
```bash
# Ver logs del cluster
cd db
docker-compose logs -f

# Ver logs del servidor
cd server
npm run dev
```

## 🛠️ Comandos Útiles

```bash
# Reinstalar dependencias
cd server && npm install

# Reiniciar base de datos
cd db && docker-compose down && docker-compose up -d

# Ver estado del cluster
cd db && ./scripts/check_cluster.sh

# Limpiar datos de usuario (desarrollo)
localStorage.clear() # En consola del navegador

# Ver tablas de la base de datos
docker exec -it postgres1 psql -U postgres -d aviator_game -c "\dt"

# Consultar jugadores
docker exec -it postgres1 psql -U postgres -d aviator_game -c "SELECT username, balance, games_played FROM players;"
```

## 🎮 Experiencia del Usuario

1. **Primera visita**: Crea cuenta nueva con $1000 inicial
2. **Regreso**: Restaura sesión automáticamente con balance actual
3. **Múltiples sesiones**: Puede cerrar sesión para jugar con otro usuario
4. **Persistencia**: Todo se guarda automáticamente, no se pierde progreso

## 🔐 Seguridad

- Tokens únicos por usuario (no reutilizables entre usuarios)
- Validación de balance en servidor (no se puede hackear desde cliente)
- Transacciones atómicas en base de datos
- Logs de todas las transacciones

## 🐛 Troubleshooting

### Error de conexión a base de datos
```bash
# Verificar que el cluster esté corriendo
docker ps | grep postgres

# Reiniciar si es necesario
cd db && docker-compose restart
```

### Usuario no puede autenticarse
```javascript
// Limpiar localStorage en navegador
localStorage.removeItem('aviator_user_token');
localStorage.removeItem('aviator_username');
```

### Datos inconsistentes
```sql
-- Consultar estado de la base de datos
SELECT * FROM players WHERE username = 'nombre_usuario';
SELECT * FROM bets WHERE player_id = 'player_id' ORDER BY placed_at DESC LIMIT 10;
```
