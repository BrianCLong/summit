## docker compose ps
NAME      IMAGE     COMMAND   SERVICE   CREATED   STATUS    PORTS

## docker ps table
NAMES                                STATUS                    PORTS
summitdevcontainer-jaeger-1          Up 13 hours               0.0.0.0:14268->14268/tcp, [::]:14268->14268/tcp, 0.0.0.0:16686->16686/tcp, [::]:16686->16686/tcp
devcontainer-redis-1                 Up 13 hours (healthy)     6379/tcp
summitdevcontainer-redis-1           Up 13 hours (healthy)     6379/tcp
summitdevcontainer-mock-services-1   Up 13 hours (unhealthy)   0.0.0.0:4012->4010/tcp, [::]:4012->4010/tcp
summitdevcontainer-neo4j-1           Up 13 hours (healthy)     0.0.0.0:7474->7474/tcp, [::]:7474->7474/tcp, 0.0.0.0:7687->7687/tcp, [::]:7687->7687/tcp
buildx_buildkit_maestro-builder0     Up 15 hours               

## Health endpoints
- API /health:

- UI root (HEAD):

- Neo4j Browser (HEAD):
HTTP/1.1 200 OK
