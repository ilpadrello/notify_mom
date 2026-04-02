# Docker Multi-Stage Build & ARM Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ POWERFUL BUILD MACHINE (any architecture)                       │
├─────────────────────────────────────────────────────────────────┤
│ Stage 1: Builder Image                                          │
│  ├─ Node.js 20 Alpine                                           │
│  ├─ ALL dependencies (dev + prod)                               │
│  ├─ TypeScript compiler                                         │
│  └─ Compiles src/ → build/                                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
                   Copy compiled JS
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ RUNTIME IMAGE (ARM64/ARM/v7 compatible)                         │
├─────────────────────────────────────────────────────────────────┤
│ Stage 2: Runtime Image                                          │
│  ├─ Node.js 20 Alpine (lightweight)                             │
│  ├─ ONLY production dependencies                                │
│  ├─ Precompiled JavaScript (from Stage 1)                       │
│  └─ No TypeScript, no dev tools                                 │
└─────────────────────────────────────────────────────────────────┘
                          ↓
         Export as .tar.gz or push to registry
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ RASPBERRY PI (ARM64 or ARM/v7)                                  │
├─────────────────────────────────────────────────────────────────┤
│ Load image and run with docker-compose                          │
│  ├─ No build step on Pi                                         │
│  ├─ Instant startup                                             │
│  └─ Optimized for resource constraints                          │
└─────────────────────────────────────────────────────────────────┘
```

## Key Improvements

### 1. **Multi-Stage Build**

- **Stage 1 (Builder)**: Installs all dependencies and compiles TypeScript
- **Stage 2 (Runtime)**: Only includes production dependencies + compiled JS
- **Result**: Final image ~300-400MB smaller (no TypeScript, no dev tools)

### 2. **ARM Compatibility**

- Uses `node:20-alpine` which supports both AMD64 and ARM (arm64/arm32v7)
- `docker buildx` automatically builds for the target platform
- No need to copy node_modules from host (everything installs in container)

### 3. **Production Optimizations**

- Removed `npm start` (shell overhead), uses direct `node` command
- Minimal base image (Alpine Linux)
- No source code, TypeScript, or dev dependencies in final image
- `npm cache clean --force` reduces image size

### 4. **Zero Build Time on Raspberry Pi**

- Image is prebuilt and ready to run
- Pi only loads the image and starts the container
- No compilation on constrained hardware

---

## Build Commands

### Option 1: Build for Current Machine + Push to Docker Hub

```bash
# Build and tag the image
docker build -t <your-docker-username>/notify-mom:latest .

# Push to Docker Hub
docker push <your-docker-username>/notify-mom:latest
```

### Option 2: Build for ARM64 (Raspberry Pi 4+) using buildx

```bash
# Enable buildx (usually pre-installed on modern Docker)
docker buildx create --name arm-builder --use

# Build for ARM64 only
docker buildx build \
  --platform linux/arm64 \
  -t <your-docker-username>/notify-mom:latest-arm64 \
  --load \
  .

# Or build for multiple platforms (AMD64 + ARM64 + ARM32v7)
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t <your-docker-username>/notify-mom:latest \
  --push \
  .
```

### Option 3: Build and Export to .tar.gz (For manual transfer to Pi)

```bash
# Build for ARM64 and export to tar file
docker buildx build \
  --platform linux/arm64 \
  -t notify-mom:latest-arm64 \
  --output type=docker,dest=./notify-mom-arm64.tar \
  .

# Compress the tar file
gzip notify-mom-arm64.tar
# Result: notify-mom-arm64.tar.gz (~150-200MB)
```

### Option 4: Build Locally on the Raspberry Pi (Direct Compilation)

```bash
# SSH into Raspberry Pi
ssh pi@<your-pi-ip>

# Pull your repository
git clone <your-repo> && cd notify-mom

# Build directly on Pi (will take 10-15 minutes on Pi 4)
docker build -t notify-mom:latest .

# Run with docker-compose
docker-compose up -d
```

---

## Deployment to Raspberry Pi

### Method 1: Pull from Docker Hub (Recommended)

```bash
# On Raspberry Pi
ssh pi@<your-pi-ip>

# Pull the prebuilt image
docker pull <your-docker-username>/notify-mom:latest

# Create .env file with your configuration
cat > .env << EOF
NODE_ENV=production
GOOGLE_SHEETS_SPREADSHEET_ID=your_id
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_secret
# ... other env vars
EOF

# Load docker-compose configuration and start
docker-compose up -d

# Verify it's running
docker logs -f notify-mom-app
```

### Method 2: Transfer .tar.gz File (No Docker Hub Needed)

```bash
# On build machine, export the image
docker buildx build \
  --platform linux/arm64 \
  -t notify-mom:latest \
  --output type=docker,dest=./notify-mom.tar \
  .
gzip notify-mom.tar

# Transfer to Raspberry Pi (using scp)
scp notify-mom.tar.gz pi@<your-pi-ip>:~/

# On Raspberry Pi
ssh pi@<your-pi-ip>
cd ~
tar -xzf notify-mom.tar.gz -O | docker load

# Verify image is loaded
docker images | grep notify-mom

# Create .env file and run
docker-compose up -d
```

### Method 3: Build Directly on Raspberry Pi (Slowest)

```bash
# SSH into Raspberry Pi
ssh pi@<your-pi-ip>

# Clone repository
git clone <your-repo> && cd notify-mom

# Create .env file
nano .env  # or copy it from somewhere

# Build on Pi (10-15 minutes on Pi 4)
docker build -t notify-mom:latest .

# Start with docker-compose
docker-compose up -d

# Monitor
docker logs -f notify-mom-app
```

---

## Quick Reference Commands

### Check Image Size

```bash
docker images | grep notify-mom
# Compare: Builder stage logs will show final image size
```

### View Docker Buildx Platforms

```bash
docker buildx ls
```

### Create Multi-Platform Build Cache

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t notify-mom:latest \
  --cache-to type=local,dest=/tmp/buildx-cache \
  --cache-from type=local,src=/tmp/buildx-cache \
  .
```

### Stop and Remove Container

```bash
docker-compose down
docker rmi notify-mom:latest
```

### View Logs in Real-time

```bash
docker logs -f notify-mom-app

# Or with docker-compose
docker-compose logs -f
```

### Shell Access to Container

```bash
docker exec -it notify-mom-app /bin/sh
```

---

## Troubleshooting

### Image Won't Start on Pi

```bash
# Check logs
docker logs notify-mom-app

# Check if volumes are created
docker volume ls | grep notify-mom

# Verify environment variables
docker inspect notify-mom-app | grep -A 20 Env
```

### Database Lock Issues

```bash
# Stop container
docker-compose down

# Wait a moment for database to be released
sleep 2

# Start again
docker-compose up -d
```

### Disk Space Issues on Pi

```bash
# Clean up old images
docker image prune -a

# Clean up volumes (careful: removes data!)
docker volume prune

# Check disk usage
docker system df
```

---

## Security Notes

- The `.dockerignore` file prevents sensitive files (like `token.json`) from being copied into the image
- Use environment variables for all secrets (in `.env` file, not in Dockerfile)
- Keep `node-modules` out of the image by using multi-stage build
- Consider using a private Docker Hub repository for production

---

## Performance Expectations

- **Build Time on Powerful Machine**: 3-5 minutes
- **Image Size**: ~200-250MB (final runtime image, much smaller with --omit=dev)
- **Pi Startup Time**: 10-30 seconds (no compilation needed)
- **Memory Usage on Pi**: ~80-150MB at runtime
- **CPU Usage on Pi**: Minimal when not syncing (cron-based)
