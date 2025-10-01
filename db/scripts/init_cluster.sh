#!/bin/bash

set -e

echo "Inicializando cluster PostgreSQL HA con Patroni..."

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker no está corriendo"
    exit 1
fi

# Limpiar containers y volúmenes existentes
echo "🧹 Limpiando containers y volúmenes existentes..."
docker-compose down -v --remove-orphans 2>/dev/null || true

# Construir imágenes
echo "🏗️ Construyendo imágenes Docker..."
docker-compose build --no-cache

# Esperar un poco para asegurar que todo esté limpio
sleep 2

# Iniciar servicios etcd primero
echo "Iniciando servicios etcd..."
docker-compose up -d etcd1 etcd2 etcd3

# Esperar a que etcd esté saludable
echo "Esperando a que etcd esté listo..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose ps | grep -q "etcd.*Up.*healthy" 2>/dev/null; then
        echo "ETCD está listo!"
        break
    fi
    echo "Esperando etcd... ($counter/$timeout)"
    sleep 3
    counter=$((counter + 3))
done

if [ $counter -ge $timeout ]; then
    echo "Error: ETCD no está respondiendo después de $timeout segundos"
    echo "Estado de los contenedores etcd:"
    docker-compose ps etcd1 etcd2 etcd3
    exit 1
fi

# Iniciar nodos PostgreSQL uno por uno
echo "Iniciando primer nodo PostgreSQL (postgres1)..."
docker-compose up -d postgres1

echo "Esperando a que postgres1 se inicialice..."
sleep 20

echo "Iniciando nodos restantes (postgres2, postgres3)..."
docker-compose up -d postgres2 postgres3

# Esperar para la inicialización completa
echo "Esperando inicialización completa del cluster..."
sleep 30

# Iniciar HAProxy
echo "Iniciando HAProxy..."
docker-compose up -d haproxy

echo "🎉 Cluster iniciado! Verificando estado..."

# Verificar estado del cluster
sleep 5
if [ -f "./scripts/check_cluster.sh" ]; then
    ./scripts/check_cluster.sh
elif [ -f "./check_cluster.sh" ]; then
    ./check_cluster.sh
else
    echo "Estado de los contenedores:"
    docker-compose ps
fi

echo "¡Cluster PostgreSQL con Patroni iniciado exitosamente!"
echo "HAProxy stats disponible en: http://localhost:9090"
echo "PostgreSQL disponible en: localhost:15432 (lectura/escritura)"
echo "PostgreSQL solo lectura en: localhost:15433"