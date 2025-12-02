# Foundry VTT Installer

A web-based wizard for deploying self-hosted Foundry VTT servers on DigitalOcean with Cloudflare DNS.

## Features

- Step-by-step guided installation
- DigitalOcean droplet provisioning with region latency testing
- Optional DigitalOcean Spaces for external asset storage
- Cloudflare DNS configuration with automatic SSL
- Automated server setup via cloud-init
- SSH key generation for secure access

## Tech Stack

- React 19 + TypeScript
- Vite + Tailwind CSS v4
- Cloudflare Workers (CORS proxy)

## Development

```bash
npm install
npm run dev
```

### Worker (CORS Proxy)

The worker handles API proxying for Cloudflare, DigitalOcean Spaces, and Foundry VTT authentication.

```bash
cd worker
npm install
npm run dev      # local development
npm run deploy   # deploy to Cloudflare
```

## Deployment

This project has two deployment targets:

### Web UI (Cloudflare Pages)

Hosted at [fvtt-installer.artificery.io](https://fvtt-installer.artificery.io)

Auto-deploys on push to `main` via Cloudflare Pages.

Build settings:
- Build command: `npm run build`
- Output directory: `dist`

### Worker (Cloudflare Workers)

The CORS proxy worker is deployed separately and must be updated manually when `worker/src/*` changes.

```bash
cd worker
npm run deploy
```

Requires [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) authenticated with Cloudflare:

```bash
npx wrangler login
```

Worker configuration is in `worker/wrangler.toml`. After deployment, the worker is available at `cors-proxy.artificery.io`.

## License

MIT
