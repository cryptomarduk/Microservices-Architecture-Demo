# Microservices Architecture Demo

This project demonstrates a microservices architecture running on Kubernetes. It includes service discovery, load balancing, and API Gateway implementation with multiple services communicating with each other.

![Microservices Architecture Diagram](./docs/microservices-architecture.png)

## Project Overview

This project includes the following microservices:

1. **API Gateway**: Entry point for all client requests
   - Route requests to appropriate services
   - Handle authentication and authorization
   - Implement rate limiting and caching

2. **Auth Service**: Authentication and authorization
   - User authentication
   - JWT token generation and validation
   - User roles and permissions

3. **Product Service**: Product management
   - Product catalog
   - Product details and inventory
   - Search and filtering

4. **Order Service**: Order management
   - Create and manage orders
   - Order status tracking
   - Communication with Product Service

## Technology Stack

- **Backend**: Node.js with Express
- **API Gateway**: Custom implementation (or Kong/Ambassador)
- **Service Discovery**: Kubernetes Services
- **Communication**: REST API
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Configuration**: ConfigMaps and Secrets

## Prerequisites

- A running Kubernetes cluster
- kubectl installed and configured
- Docker for building container images

## Setup Steps

### 1. Create Namespace

```bash
kubectl apply -f kubernetes/namespace.yaml
```

### 2. Build and Push Service Images

Build and push each microservice:

```bash
# API Gateway
cd services/api-gateway
docker build -t <dockerhub-username>/ms-api-gateway:latest .
docker push <dockerhub-username>/ms-api-gateway:latest

# Auth Service
cd ../auth-service
docker build -t <dockerhub-username>/ms-auth-service:latest .
docker push <dockerhub-username>/ms-auth-service:latest

# Product Service
cd ../product-service
docker build -t <dockerhub-username>/ms-product-service:latest .
docker push <dockerhub-username>/ms-product-service:latest

# Order Service
cd ../order-service
docker build -t <dockerhub-username>/ms-order-service:latest .
docker push <dockerhub-username>/ms-order-service:latest
```

### 3. Deploy Services

Deploy each service in order:

```bash
# Deploy Auth Service
kubectl apply -f kubernetes/auth-service/

# Deploy Product Service
kubectl apply -f kubernetes/product-service/

# Deploy Order Service
kubectl apply -f kubernetes/order-service/

# Deploy API Gateway
kubectl apply -f kubernetes/api-gateway/

# Deploy Ingress
kubectl apply -f kubernetes/ingress.yaml
```

### 4. Verify Deployment

```bash
# Check all pods
kubectl get pods -n microservices

# Check all services
kubectl get svc -n microservices

# Check ingress
kubectl get ingress -n microservices
```

## Testing the Microservices

You can access the API through the API Gateway:

```bash
# Port forward the API Gateway service
kubectl port-forward -n microservices svc/api-gateway 8080:80

# Or access through Ingress if configured with DNS
# http://microservices-demo.example.com
```

### API Endpoints

- **Authentication**:
  - `POST /api/auth/login`: Login and get JWT token
  - `POST /api/auth/register`: Register a new user

- **Products**:
  - `GET /api/products`: List all products
  - `GET /api/products/:id`: Get product details

- **Orders**:
  - `POST /api/orders`: Create a new order
  - `GET /api/orders`: List user orders
  - `GET /api/orders/:id`: Get order details

## Service Communication

This project demonstrates these communication patterns:

1. **Synchronous API calls**: Direct service-to-service REST API calls
2. **Service Discovery**: Using Kubernetes service names as DNS
3. **Load Balancing**: Automatic load balancing by Kubernetes Services

## Scaling the Services

You can scale any service independently:

```bash
# Scale product service to 3 replicas
kubectl scale deployment product-service -n microservices --replicas=3
```

## Monitoring and Debugging

```bash
# View logs for a service
kubectl logs -n microservices -l app=product-service

# Get shell access to a container
kubectl exec -it -n microservices <pod-name> -- /bin/sh
```

## Architecture Explanation

### Service Communication Flow

1. Client sends request to API Gateway
2. API Gateway authenticates the request with Auth Service
3. API Gateway routes request to the appropriate service
4. Services communicate with each other as needed
5. Response flows back through the API Gateway to the client

### Service Discovery

- Services locate each other using Kubernetes DNS
- Example: Auth Service at `auth-service.microservices.svc.cluster.local`

### Load Balancing

- Kubernetes automatically load balances requests among service pods
- Horizontal scaling is seamless without configuration changes

## Future Improvements

1. Implement event-based communication with message brokers (Kafka/RabbitMQ)
2. Add database services for each microservice
3. Implement Circuit Breaker pattern for resilience
4. Add distributed tracing (Jaeger/Zipkin)
5. Implement service mesh (Istio/Linkerd)
6. Add automated canary deployments

## Contributing

1. Fork this repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
