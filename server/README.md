# Juego Aviator - Laboratorio de Sistemas Distribuidos

Este es un juego de apuestas en tiempo real inspirado en Aviator, desarrollado como parte del laboratorio de Sistemas Distribuidos. El proyecto implementa comunicación en tiempo real con WebSockets y está preparado para alta disponibilidad con replicación de bases de datos.

## 🚀 Funcionalidades

- **Juego en tiempo real**: Los jugadores pueden ver las acciones de otros jugadores instantáneamente
- **Sistema de multiplicador**: El multiplicador aumenta progresivamente hasta que "crashea"
- **Sistema de apuestas**: Los jugadores pueden apostar y retirar ganancias antes del crash
- **Comunicación WebSocket**: Actualización en tiempo real de estados del juego
- **Interfaz moderna**: UI responsive con efectos visuales atractivos

## 📁 Estructura del Proyecto

```
betting-backend/
├── src/                     # Backend (Node.js + Socket.io)
│   ├── app.js              # Servidor principal
│   ├── core/               # Lógica del juego
│   │   ├── GameEngine.js   # Motor principal del juego
│   │   ├── GameState.js    # Estado del juego
│   │   └── CrashMultiplier.js
│   ├── services/           # Servicios
│   │   ├── GameService.js  # Lógica de negocio
│   │   └── SocketService.js # Manejo de WebSockets
│   └── utils/
│       └── constants.js    # Constantes del juego
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── context/        # Context API para estado global
│   │   └── hooks/          # Hooks personalizados
└── package.json
```

## 🛠️ Instalación y Configuración

### Prerrequisitos

- Node.js (versión 16 o superior)
- npm o yarn

### 1. Clonar el repositorio

```bash
git clone [URL_DEL_REPOSITORIO]
cd betting-backend
```

### 2. Instalar dependencias del backend

```bash
npm install
```

### 3. Instalar dependencias del frontend

```bash
cd client
npm install
cd ..
```

## 🎮 Cómo ejecutar el juego

### 1. Iniciar el servidor backend

```bash
npm start
# o para desarrollo con auto-reinicio:
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

### 2. Iniciar el frontend (en otra terminal)

```bash
cd client
npm run dev
```

El frontend se iniciará en `http://localhost:5173` (o 5174 si el puerto está ocupado)

### 3. Abrir múltiples clientes

Para probar el juego multi-jugador:

1. Abre múltiples pestañas del navegador en la URL del frontend
2. En cada pestaña, ingresa un nombre de usuario diferente
3. ¡Comienza a jugar!

## 🎯 Cómo jugar

1. **Unirse al juego**: Ingresa tu nombre de usuario
2. **Realizar apuesta**: Selecciona la cantidad a apostar durante la fase de espera
3. **Observar el multiplicador**: El multiplicador aumenta progresivamente
4. **Retirar a tiempo**: Haz clic en "RETIRAR" antes de que el juego crashee
5. **Ganar dinero**: Si retiras a tiempo, ganas tu apuesta multiplicada por el valor actual

### Estados del juego

- **🟡 Esperando**: Fase para realizar apuestas (30 segundos)
- **🟠 Cuenta regresiva**: Últimos 5 segundos antes de comenzar
- **🟢 En progreso**: El multiplicador está aumentando
- **🔴 Crashed**: El juego terminó, se calculan resultados

## 🌐 Endpoints del API

### Backend REST API

- `GET /api/health` - Estado del servidor
- `GET /api/game/state` - Estado actual del juego
- `GET /api/game/history` - Historial de rondas

### Eventos WebSocket

**Eventos del cliente al servidor:**
- `player_join` - Unirse al juego
- `place_bet` - Realizar apuesta
- `cash_out` - Retirar ganancias

**Eventos del servidor al cliente:**
- `game_state_update` - Actualización del estado
- `multiplier_update` - Actualización del multiplicador
- `player_bet` - Notificación de apuesta
- `player_cash_out` - Notificación de retiro
- `round_complete` - Ronda completada

## 🔧 Configuración

Las configuraciones del juego se encuentran en `src/utils/constants.js`:

```javascript
export const GAME_CONFIG = {
    ROUND_DURATION: 30000,           // Tiempo para apostar (30s)
    COUNTDOWN_DURATION: 5000,        // Cuenta regresiva (5s)
    MULTIPLIER_UPDATE_INTERVAL: 100, // Actualización multiplicador (100ms)
    MAX_MULTIPLIER: 100,             // Multiplicador máximo
    HOUSE_EDGE: 0.05,               // Ventaja de la casa (5%)
    MIN_BET_AMOUNT: 1,              // Apuesta mínima
    MAX_BET_AMOUNT: 1000            // Apuesta máxima
};
```

## 🚀 Próximos pasos para Alta Disponibilidad

Para completar el laboratorio de Sistemas Distribuidos, se debe implementar:

1. **Clúster de Base de Datos**:
   - Configurar PostgreSQL/MySQL con replicación Maestro-Esclavo
   - Implementar failover automático
   
2. **Múltiples nodos de Backend**:
   - Configurar Redis para pub/sub entre nodos
   - Implementar balanceador de carga (Nginx/HAProxy)
   
3. **Lógica de reconexión**:
   - Reconexión automática en el frontend
   - Manejo de pérdida de estado

## 🐛 Troubleshooting

### Problemas comunes

1. **Puerto ocupado**: Si el puerto 3000 está ocupado, cambia el puerto en `src/app.js`
2. **Conexión WebSocket fallida**: Verifica que el backend esté ejecutándose
3. **Dependencias faltantes**: Ejecuta `npm install` en ambos directorios

### Debug

Para ver logs detallados, abre las herramientas de desarrollador del navegador (F12) y revisa la consola.

## 👥 Desarrollo

### Estructura de archivos importantes

- `GameEngine.js`: Lógica principal del juego y ciclo de vida de las rondas
- `GameContext.jsx`: Estado global del frontend con React Context
- `SocketService.js`: Manejo de conexiones WebSocket
- `useSocket.js`: Hook personalizado para WebSockets

### Para contribuir

1. Crear una rama nueva: `git checkout -b feature/nueva-funcionalidad`
2. Realizar cambios y commits
3. Crear pull request

## 📜 Licencia

Este proyecto es para fines educativos como parte del laboratorio de Sistemas Distribuidos.
