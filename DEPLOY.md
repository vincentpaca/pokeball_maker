## Deploy to riopaca.com

Served at **riopaca.com/pokeball-maker** as a static subdirectory of the main Astro site. Uses relative paths (`css/style.css`, `js/game.js`, etc.) so no path patching is needed.

### Steps

```bash
# 1. Copy into the riopaca.com site (no build needed)
rm -rf ~/Projects/riopaca.com/public/pokeball-maker
cp -R ~/Projects/rios_ideas/pokeball_maker ~/Projects/riopaca.com/public/pokeball-maker

# 2. Build and deploy the main site
cd ~/Projects/riopaca.com
npm run build
cd dist && zip -r /tmp/riopaca-deploy.zip . -x "*.DS_Store"
aws amplify create-deployment --app-id d5v8n8gds1xxt --branch-name staging --output json > /tmp/deploy.json
JOB_ID=$(jq -r .jobId /tmp/deploy.json)
UPLOAD_URL=$(jq -r .zipUploadUrl /tmp/deploy.json)
curl --upload-file /tmp/riopaca-deploy.zip "$UPLOAD_URL"
aws amplify start-deployment --app-id d5v8n8gds1xxt --branch-name staging --job-id "$JOB_ID"

# 3. Check status
aws amplify get-job --app-id d5v8n8gds1xxt --branch-name staging --job-id "$JOB_ID" --query 'job.summary.status' --output text
```

### CDN cache

Amplify's CloudFront caches with `s-maxage=31536000` (1 year). To force a refresh for testing, append a query string: `https://www.riopaca.com/pokeball-maker/?v=2`.
