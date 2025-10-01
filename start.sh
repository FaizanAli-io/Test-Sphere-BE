#!/bin/bash
# Production start script for Render.com

# Run database migrations
npx prisma migrate deploy

# Start the application
npm run start:prod