# Tiltfile for IntelGraph Local Development

# Load extensions if needed
# load('ext://restart_process', 'restart_process')

# Define services
# Frontend
docker_build('summit/client', './client', dockerfile='./client/Dockerfile.dev')
k8s_yaml('./k8s/client-deployment.yaml')
k8s_resource('summit-client', port_forwards=3000)

# Backend
docker_build('summit/server', './server', dockerfile='./server/Dockerfile.dev')
k8s_yaml('./k8s/server-deployment.yaml')
k8s_resource('summit-server', port_forwards=4000)

# Database and other deps would typically be helm charts or existing manifests
# k8s_yaml('./k8s/postgres.yaml')
# k8s_yaml('./k8s/redis.yaml')
# k8s_yaml('./k8s/neo4j.yaml')

# Watch for changes
# local_resource(
#   'codegen',
#   cmd='pnpm graphql:codegen',
#   deps=['packages/graphql/schema.graphql']
# )
