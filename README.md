# codbex-ecommerce

## Data Model

TBD

## Docker

```
docker pull ghcr.io/codbex/codbex-ecommerce:latest

docker run --name codbex-ecommerce \
--rm -p 8080:80 \
ghcr.io/codbex/codbex-ecommerce:latest
```

## Kubernetes

Get running Pods:

```
kubectl get pods -n prod
```

Get application logs:

```
kubectl logs deployments/codbex-ecommerce -f -n prod
```

Get application shell:

```
kubectl exec -it deployments/codbex-ecommerce -n prod -- /bin/sh
```

Scale to zero the e-Commerce application:

```
kubectl scale deployments/codbex-ecommerce --replicas=0 -n prod
```

Create Database secret:

```
kubectl create secret generic codbex-ecommerce-database-credentials -n prod \
  --from-literal=username=DATABASE_USERNAME \
  --from-literal=password=DATABASE_PASSWORD \
  --from-literal=jdbc-url=jdbc:postgresql://codbex-ecommerce-database/DATABASE_USERNAME
```

Create AWS Cognito secret:

```
kubectl create secret generic codbex-ecommerce-cognito-credentials -n prod \
  --from-literal=clientId=COGNITO_CLIENT_ID \
  --from-literal=clientSecret=COGNITO_CLIENT_SECRET \
  --from-literal=domain=COGNITO_DOMAIN \
  --from-literal=regionId=COGNITO_REGION \
  --from-literal=userPoolId=COGNITO_USER_POOL_ID
```

## Development

This setup uses the `ghcr.io/codbex/codbex-atlas` image as the base for local development with the codbex Atlas platform.

To start the containers, run:

```
docker-compose up .
```

### Environment Variables

TBD

## Local Development with Docker

When running this project inside the codbex Atlas Docker image, you must provide authentication for installing dependencies from GitHub Packages.
1. Create a GitHub Personal Access Token (PAT) with `read:packages` scope.
2. Pass `NPM_TOKEN` to the Docker container:

    ```
    docker run \
    -e NPM_TOKEN=<your_github_token> \
    --rm -p 80:80 \
    ghcr.io/codbex/codbex-atlas:latest
    ```

⚠️ **Notes**
- The `NPM_TOKEN` must be available at container runtime.
- This is required even for public packages hosted on GitHub Packages.
- Never bake the token into the Docker image or commit it to source control.

