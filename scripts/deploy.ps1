# Windows PowerShell script to automate deployment to Google Cloud Run & Firebase
# Pre-requisites: gcloud CLI, firebase CLI, docker, and a Google Cloud / Firebase project setup.

$ErrorActionPreference = "Stop"

# Configuration variables (modify these according to your project setup)
$PROJECT_ID = "mystical-scheduling-2026"
$REGION = "us-central1"
$SERVICE_NAME = "mystical-backend"
$IMAGE_TAG = "$REGION-docker.pkg.dev/$PROJECT_ID/mystical-repo/$SERVICE_NAME:latest"

Write-Host "=== STARTING DEPLOYMENT FOR MYSTICAL PLATFORM ===" -ForegroundColor Green

# 1. Authenticate with gcloud if not already done
Write-Host "Verifying Google Cloud configuration..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

# 2. Build Docker Image
Write-Host "Building Docker image..." -ForegroundColor Cyan
docker build -t $SERVICE_NAME .

# 3. Tag and Push to Artifact Registry
Write-Host "Configuring docker authentication for Google Artifact Registry..." -ForegroundColor Cyan
gcloud auth configure-docker "$REGION-docker.pkg.dev"

Write-Host "Tagging image..." -ForegroundColor Cyan
docker tag $SERVICE_NAME $IMAGE_TAG

Write-Host "Pushing image to Artifact Registry..." -ForegroundColor Cyan
docker push $IMAGE_TAG

# 4. Deploy NestJS Backend to Cloud Run
Write-Host "Deploying NestJS backend to Google Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_TAG `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 3000 `
  --set-env-vars "NODE_ENV=production"

# 5. Run Database Migrations (Prisma)
Write-Host "Running database migrations on production..." -ForegroundColor Cyan
# Ensure DATABASE_URL is configured locally or in the shell to run prisma db push / migrate deploy
# npx prisma migrate deploy

# 6. Deploy Next.js Frontend to Firebase Hosting
Write-Host "Deploying Frontend to Firebase Hosting..." -ForegroundColor Cyan
# Build static export for Firebase Hosting
cd frontend
npm install
npm run build
cd ..
firebase deploy --only hosting

Write-Host "=== DEPLOYMENT COMPLETED SUCCESSFULLY ===" -ForegroundColor Green
