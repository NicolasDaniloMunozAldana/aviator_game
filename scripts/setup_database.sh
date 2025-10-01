#!/bin/bash

# Script para configurar la base de datos Aviator Game
# Uso: ./setup_database.sh

echo "🎮 Configurando base de datos para Aviator Game..."

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker primero."
    exit 1
fi

# Navegar al directorio de base de datos
cd "$(dirname "$0")/../db"

echo "📦 Levantando cluster de PostgreSQL..."
docker-compose up -d

echo "⏳ Esperando que el cluster esté listo..."
sleep 30

# Función para verificar si PostgreSQL está listo
check_postgres() {
    docker exec postgres1 pg_isready -U postgres > /dev/null 2>&1
}

# Esperar hasta que PostgreSQL esté disponible
max_attempts=30
attempt=1
while ! check_postgres; do
    echo "⏳ Intento $attempt/$max_attempts: Esperando que PostgreSQL esté listo..."
    sleep 10
    ((attempt++))
    
    if [ $attempt -gt $max_attempts ]; then
        echo "❌ Timeout esperando PostgreSQL. Verifica los logs con: docker-compose logs"
        exit 1
    fi
done

echo "✅ PostgreSQL está listo!"

# Crear la base de datos aviator_game si no existe
echo "🎯 Creando base de datos aviator_game..."
docker exec postgres1 psql -U postgres -c "CREATE DATABASE aviator_game;" 2>/dev/null || echo "Base de datos ya existe o error al crear"

# Verificar que HAProxy está funcionando
echo "🔄 Verificando HAProxy..."
if curl -s http://localhost:9090/stats > /dev/null; then
    echo "✅ HAProxy stats disponible en http://localhost:9090/stats"
else
    echo "⚠️  HAProxy stats no disponible aún, puede tomar unos minutos"
fi

# Mostrar información de conexión
echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 Información de conexión:"
echo "   - PostgreSQL (Write): localhost:15432"
echo "   - PostgreSQL (Read):  localhost:15433"  
echo "   - Database: aviator_game"
echo "   - User: postgres"
echo "   - Password: postgres123"
echo "   - HAProxy Stats: http://localhost:9090/stats"
echo ""
echo "🔧 Variables de entorno sugeridas para el servidor:"
echo "   DB_HOST=localhost"
echo "   DB_PORT=15432"
echo "   DB_NAME=aviator_game"
echo "   DB_USER=postgres"
echo "   DB_PASSWORD=postgres123"
echo ""
echo "📝 Para detener el cluster: docker-compose down"
echo "📝 Para ver logs: docker-compose logs -f"
