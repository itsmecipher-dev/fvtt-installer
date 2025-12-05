# FVTT Installer - CORS Proxy Worker

Cloudflare Worker that proxies API requests to avoid CORS restrictions in the browser.

## Why This Exists

Browser security policies prevent the frontend from directly calling:
- Foundry VTT API (authentication, downloads)
- DigitalOcean Spaces S3 API (bucket operations)
- Hetzner Object Storage S3 API
- Cloudflare API (when tokens have restricted permissions)

This worker acts as a trusted intermediary, adding proper CORS headers and forwarding requests.

## Allowed Origins

```
http://localhost:5173    (dev)
http://localhost:4173    (preview)
https://fvtt-installer.artificery.io (production)
```

---

## Endpoints

### Foundry VTT

#### `POST /foundry/auth`

Authenticate with Foundry VTT and retrieve user licenses.

**Why:** Foundry's API doesn't support CORS for browser requests.

**Input:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Output:**
```json
{
  "licenses": [
    {
      "key": "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX",
      "version": "12"
    }
  ]
}
```

---

#### `POST /foundry/download`

Get a signed download URL for Foundry VTT.

**Why:** Download URLs require authentication and are time-limited.

**Input:**
```json
{
  "username": "string",
  "password": "string",
  "version": "12",
  "platform": "linux"
}
```

**Output:**
```json
{
  "url": "https://foundryvtt.s3.amazonaws.com/releases/..."
}
```

---

### DigitalOcean Spaces

#### `POST /spaces/create-bucket`

Create a new DigitalOcean Space bucket.

**Why:** S3 API requires AWS Signature v4 signing which is complex in browsers, and DO Spaces has CORS restrictions.

**Input:**
```json
{
  "accessKeyId": "string",
  "secretAccessKey": "string",
  "region": "nyc3",
  "bucketName": "string",
  "allowedOrigin": "https://example.com" // optional
}
```

**Output:**
```json
{
  "success": true,
  "bucket": "string",
  "region": "string"
}
```

---

#### `POST /spaces/set-cors`

Configure CORS policy on a DigitalOcean Space bucket.

**Why:** Allows the Foundry VTT server to serve assets to players' browsers.

**Input:**
```json
{
  "accessKeyId": "string",
  "secretAccessKey": "string",
  "region": "nyc3",
  "bucketName": "string",
  "allowedOrigin": "https://foundry.example.com"
}
```

**Output:**
```json
{
  "success": true
}
```

**CORS Policy Applied:**
```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://foundry.example.com</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

---

### Generic S3 (Hetzner Object Storage, etc.)

#### `POST /s3/validate`

Validate S3 credentials by attempting to list bucket contents.

**Why:** Verifies user-provided credentials work before provisioning.

**Input:**
```json
{
  "accessKeyId": "string",
  "secretAccessKey": "string",
  "endpoint": "https://fsn1.your-objectstorage.com",
  "region": "fsn1",
  "bucketName": "string",
  "allowedOrigin": "https://example.com" // optional, sets CORS if provided
}
```

**Output:**
```json
{
  "valid": true
}
```

---

#### `POST /s3/create-bucket`

Create a new S3-compatible bucket.

**Why:** AWS Signature v4 signing complexity and CORS restrictions.

**Input:**
```json
{
  "accessKeyId": "string",
  "secretAccessKey": "string",
  "endpoint": "https://fsn1.your-objectstorage.com",
  "region": "fsn1",
  "bucketName": "string"
}
```

**Output:**
```json
{
  "success": true,
  "bucket": "string",
  "region": "string"
}
```

---

#### `POST /s3/set-cors`

Configure CORS policy on an S3-compatible bucket.

**Why:** Allows the Foundry VTT server to serve assets to players' browsers.

**Input:**
```json
{
  "accessKeyId": "string",
  "secretAccessKey": "string",
  "endpoint": "https://fsn1.your-objectstorage.com",
  "region": "fsn1",
  "bucketName": "string",
  "allowedOrigin": "https://foundry.example.com"
}
```

**Output:**
```json
{
  "success": true
}
```

---

### Cloudflare API Proxy

#### `* /client/v4/*`

Proxies all requests to the Cloudflare API.

**Why:** Some Cloudflare API tokens have zone restrictions that cause CORS issues when called directly from browsers.

**Input:** Any valid Cloudflare API request

**Headers Required:**
```
Authorization: Bearer <cloudflare_api_token>
```

**Output:** Cloudflare API response (passthrough)

---

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## Security Notes

- All endpoints validate the `Origin` header against the allowlist
- Credentials are never stored - only forwarded to target APIs
- CORS preflight requests are handled automatically
