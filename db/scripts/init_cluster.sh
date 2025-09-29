#!/bin/bash

echo "=== Inicializando cluster PostgreSQL HA ==="

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker no está corriendo"
    exit 1
fi

# Limpiar contenedores anteriores si existen
echo "Limpiando contenedores anteriores..."
docker-compose down -v 2>/dev/null || true

# Construir e iniciar servicios
echo "Construyendo e iniciando servicios..."
docker-compose up -d

# Esperar a que los servicios estén listos
echo "Esperando a que los servicios estén listos..."
sleep 30

# Verificar estado
echo "Verificando estado del cluster..."
./check_cluster.sh

echo "=== Cluster inicializado correctamente ==="
echo "Conexiones disponibles:"
echo "- Escritura: psql -h localhost -p 5432 -U postgres"
echo "- Lectura:   psql -h localhost -p 5433 -U postgres"
echo "- Stats HAProxy: http://localhost:8080/stats"