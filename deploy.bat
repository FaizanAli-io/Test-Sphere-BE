@echo off
echo Deploying Test-Sphere API...

ssh -i test-sphere.pem ubuntu@13.60.204.90 "cd Test-Sphere-BE && git pull && npm i && npm run build && pm2 restart testsphere"

echo Deployment complete!
pause
