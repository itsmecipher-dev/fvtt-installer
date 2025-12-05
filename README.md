# Foundry VTT Installer

A web-based wizard for deploying self-hosted Foundry VTT servers on cloud providers with Cloudflare DNS.

## Supported Providers

| Provider | Compute | Object Storage | Regions |
|----------|---------|----------------|---------|
| **DigitalOcean** | Droplets | Spaces (auto-configured) | 14 worldwide |
| **Hetzner Cloud** | Cloud Servers | Object Storage (manual setup) | 5 (EU + US) |

## Features

- Step-by-step guided installation
- Multi-provider support (DigitalOcean, Hetzner Cloud)
- Region latency testing for optimal server placement
- Optional S3-compatible object storage for game assets
- Cloudflare DNS configuration with automatic SSL
- Automated server setup via cloud-init (Node.js, Caddy, PM2)
- SSH key generation for secure access
- Automatic security updates and firewall configuration

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

The worker handles API proxying for Cloudflare, S3-compatible storage (DigitalOcean Spaces, Hetzner Object Storage), and Foundry VTT authentication.

```bash
cd worker
npm install
npm run dev      # local development
npm run deploy   # deploy to Cloudflare
```

## Deployment

This project has two deployment targets:

### Web UI (GitHub Pages)

Hosted at [fvtt-installer.artificery.io](https://fvtt-installer.artificery.io)

Auto-deploys on push to `main` via GitHub Actions (`.github/workflows/deploy.yml`).

### Worker (Cloudflare Workers)

The CORS proxy worker auto-deploys when `worker/**` files change via GitHub Actions.

Requires `CLOUDFLARE_API_TOKEN` secret in repo settings (Settings → Secrets → Actions).

Manual deploy:
```bash
cd worker
npm run deploy
```

## License

MIT
