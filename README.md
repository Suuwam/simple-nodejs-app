# Simple Node.js App — AWS ECS Fargate

A beginner-friendly Node.js Express web server that runs inside a Docker container and is deployed to the cloud using AWS ECS Fargate. This project is a great starting point for learning how to containerize and deploy Node.js applications on AWS.

---

## What This Project Does

This is a simple web server built with Node.js and Express. When you access it in a browser or via an API tool, it responds with JSON messages. It is designed to run:

- Locally on your machine
- Inside a Docker container
- On AWS ECS Fargate (serverless cloud deployment)

---

## Project Structure

```
simple-nodejs-app/
├── app.js           # Main server file — handles all routes
├── Dockerfile       # Instructions to build the Docker image
├── package.json     # Project info and dependencies
├── .gitignore       # Files to exclude from Git
└── README.md        # This file
```

---

## API Routes

Once the server is running, you can visit these URLs:

| Route | What it returns |
|-------|----------------|
| GET / | A welcome message with the current timestamp |
| GET /health | A health check response (used by AWS load balancer) |
| GET /about | App name and author info |

Example response from /:
```json
{
  "message": "Hello from Node.js on AWS ECS!",
  "timestamp": "2026-05-16T10:00:00.000Z"
}
```

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Tool | What it is for | Install link |
|------|---------------|--------------|
| Node.js v18+ | Running the app locally | https://nodejs.org |
| npm | Installing packages (comes with Node.js) | — |
| Docker | Building and running containers | https://docs.docker.com/get-docker |
| Git | Version control | https://git-scm.com |
| AWS CLI v2 | Talking to AWS from terminal | https://aws.amazon.com/cli |
| AWS Account | Deploying to the cloud | https://aws.amazon.com |

---

## Part 1 — Run Locally (No Docker)

This is the simplest way to run the app — just Node.js on your machine.

```bash
# Step 1: Clone the repository
git clone https://github.com/Suuwam/simple-nodejs-app.git

# Step 2: Go into the project folder
cd simple-nodejs-app

# Step 3: Install dependencies
npm install

# Step 4: Start the server
npm start
```

You should see:
```
Server running on port 3000
```

Open your browser and go to: http://localhost:3000

To stop the server, press Ctrl + C.

---

## Part 2 — Run with Docker

Docker packages the app into a container so it runs the same way everywhere.

```bash
# Step 1: Build the Docker image
docker build -t simple-nodejs-app .

# Step 2: Run the container
docker run -p 3000:3000 simple-nodejs-app

# Step 3: Test it
curl http://localhost:3000/health
```

Useful Docker commands:
```bash
# See all running containers
docker ps

# Stop a running container
docker stop <container-id>

# See all local images
docker images -a

# Remove the image when done
docker rmi simple-nodejs-app
```

---

## Part 3 — Deploy to AWS ECS Fargate

AWS ECS Fargate lets you run Docker containers in the cloud without managing any servers.

### Step 1 — Configure AWS CLI

```bash
aws configure
```

Enter your details when prompted:
```
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region name: ap-southeast-1
Default output format: json
```

Verify it works:
```bash
aws sts get-caller-identity
```

### Step 2 — Create an ECR Repository

ECR (Elastic Container Registry) is where AWS stores your Docker images.

```bash
aws ecr create-repository \
  --repository-name nodejs-server-demo-private \
  --region ap-southeast-1
```

Note the repositoryUri from the output. It looks like:
```
<account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/nodejs-server-demo-private
```

### Step 3 — Push Docker Image to ECR

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com

# Build the image
docker build -t nodejs-server-demo-private .

# Tag the image for ECR
docker tag nodejs-server-demo-private:latest \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/nodejs-server-demo-private:latest

# Push the image to ECR
docker push \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/nodejs-server-demo-private:latest
```

### Step 4 — Create an ECS Cluster

A cluster is a group of resources that run your containers.

```bash
aws ecs create-cluster \
  --cluster-name nodejs-server-demo-ecs \
  --region ap-southeast-1
```

### Step 5 — Create a Task Definition

A task definition tells ECS how to run your container (image, CPU, memory, ports).

Create a file called task-def.json:

```json
{
  "family": "nodejs-server-demo-td",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "nodejs-container",
      "image": "<account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/nodejs-server-demo-private:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true
    }
  ]
}
```

Register it with ECS:

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-def.json \
  --region ap-southeast-1
```

### Step 6 — Create an ECS Service

A service keeps your task running and restarts it if it crashes.

```bash
aws ecs create-service \
  --cluster nodejs-server-demo-ecs \
  --service-name nodejs-server-demo-service \
  --task-definition nodejs-server-demo-td \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}" \
  --region ap-southeast-1
```

### Step 7 — Check If It Is Running

```bash
aws ecs describe-services \
  --cluster nodejs-server-demo-ecs \
  --services nodejs-server-demo-service \
  --region ap-southeast-1
```

Look for "status": "ACTIVE" and "runningCount": 1 in the output.

---

## Part 4 — Pushing Updates

Every time you change your code, follow these steps to update the live deployment:

```bash
# Step 1: Save and commit your code changes
git add .
git commit -m "Describe what you changed"
git push

# Step 2: Rebuild and push new Docker image to ECR
docker build -t nodejs-server-demo-private .

docker tag nodejs-server-demo-private:latest \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/nodejs-server-demo-private:latest

docker push \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/nodejs-server-demo-private:latest

# Step 3: Tell ECS to use the new image
aws ecs update-service \
  --cluster nodejs-server-demo-ecs \
  --service nodejs-server-demo-service \
  --force-new-deployment \
  --region ap-southeast-1
```

---

## Part 5 — Cleanup (Delete Everything)

When you are done, delete all AWS resources to avoid charges. Delete in this exact order:

```bash
# 1. Scale service to 0 (stop all running tasks)
aws ecs update-service \
  --cluster nodejs-server-demo-ecs \
  --service nodejs-server-demo-service \
  --desired-count 0 \
  --region ap-southeast-1

# 2. Delete the service
aws ecs delete-service \
  --cluster nodejs-server-demo-ecs \
  --service nodejs-server-demo-service \
  --region ap-southeast-1

# 3. Delete the cluster
aws ecs delete-cluster \
  --cluster nodejs-server-demo-ecs \
  --region ap-southeast-1

# 4. Deregister task definition
aws ecs deregister-task-definition \
  --task-definition nodejs-server-demo-td:1 \
  --region ap-southeast-1

# 5. Delete ECR repository and all images inside it
aws ecr delete-repository \
  --repository-name nodejs-server-demo-private \
  --force \
  --region ap-southeast-1
```

Also clean up your local machine:

```bash
# Remove local Docker image
docker rmi nodejs-server-demo-private

# Remove AWS credentials
rm -rf ~/.aws
```

---

## Architecture Overview

```
Your Browser
     |
     v
[Application Load Balancer]  <- handles incoming traffic on port 80
     |
     v
[ECS Fargate Service]        <- runs your container in the cloud
     |
     v
[Task: nodejs-container]     <- your Node.js app on port 3000
     |
     v
[ECR Repository]             <- stores your Docker image
```

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| npm: command not found | Node.js not installed | Install Node.js from nodejs.org |
| Cannot find module express | Dependencies not installed | Run npm install |
| docker: command not found | Docker not installed | Install Docker |
| port already in use | Something else using port 3000 | Run docker run -p 3001:3000 simple-nodejs-app |
| Authentication failed | Wrong AWS credentials | Run aws configure again |
| 403 Permission denied (GitHub) | Wrong token or missing repo scope | Generate a new PAT with repo scope |

---

## Key Concepts Explained

**What is Docker?**
Docker packages your app and everything it needs (Node.js, dependencies) into a single box called a container. This container runs the same way on any machine.

**What is ECR?**
Amazon Elastic Container Registry is like a private Docker Hub hosted by AWS. You push your Docker image here so ECS can pull and run it.

**What is ECS?**
Amazon Elastic Container Service manages running your Docker containers. You tell it what image to run and how many copies — it handles the rest.

**What is Fargate?**
Fargate is a serverless compute engine for ECS. You do not need to manage any virtual machines (EC2 instances). AWS handles all the infrastructure — you only pay for what you use.

**What is a Task Definition?**
A blueprint that tells ECS what Docker image to use, how much CPU and memory to give it, and which ports to open.

**What is a Service?**
A service keeps your task running at all times. If a container crashes, the service automatically starts a new one.

---

## Author

**Suuwam** — built while learning AWS ECS Fargate container deployment.
