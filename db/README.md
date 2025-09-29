# PostgreSQL High Availability Cluster

Cluster de PostgreSQL con alta disponibilidad usando Patroni, etcd y HAProxy.

## Arquitectura
- 3 nodos etcd para coordinación
- 3 nodos PostgreSQL con Patroni para failover automático
- HAProxy para balanceo de carga

## Inicio rápido
```bash
# Inicializar cluster
./scripts/init_cluster.sh

# Verificar estado
./scripts/check_cluster.sh

# Probar failover
./scripts/test_failover.sh
```

## Conexiones
- **Escritura**: `psql -h localhost -p 5432 -U postgres`
- **Lectura**: `psql -h localhost -p 5433 -U postgres`
- **HAProxy Stats**: http://localhost:8080/stats

## Credenciales
- Usuario: `postgres`
- Contraseña: `postgres123`