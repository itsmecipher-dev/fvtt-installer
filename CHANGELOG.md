# Changelog

All notable changes to this project will be documented in this file.

## [1.2.2] - 2026-01-13

### Fixed
- Cloud-init YAML parsing failure caused by emoji in error HTML (thanks Anthony Gonzalez)
- Added input sanitization to prevent non-ASCII characters from breaking cloud-init

## [1.2.1] - 2025-12-05

### Added
- PM2 log rotation via `pm2-logrotate` (10MB max, 7 files retained, compressed)

## [1.2.0] - 2025-12-05

### Added
- **Multi-provider support** with Hetzner Cloud alongside DigitalOcean
- Provider selection step with visual cards showing pricing and features
- Hetzner Object Storage integration for asset storage
- Generic S3 worker endpoints (`/s3/validate`, `/s3/create-bucket`, `/s3/set-cors`)
- Cloud-init error page when Foundry download fails (with fake `/api/status` for detection)
- Worker README documentation for all API endpoints
- Duplicate server name blocking for Hetzner (which doesn't allow duplicates)

### Changed
- Refactored provider code into abstraction layer (`src/api/providers/`)
- Server name now defaults to subdomain (synced from Cloudflare step)
- Moved Foundry login button to right side for UI consistency
- CORS setup now uses temp full-access key (fixes 403 errors with scoped keys)

### Fixed
- CORS configuration failing with DigitalOcean scoped Spaces keys
- Silent failures when Foundry download URL expires

## [1.1.0] - 2025-12-02

### Added
- Support for Foundry VTT v11 and v12 (uses correct startup script path)
- Version detection from download URL and version selector

### Changed
- Show full specs (CPU / RAM / Disk) in droplet size selector
- Removed redundant RAM/vCPU from tier headers

### Fixed
- Added missing `awsConfig` step to Spaces setup instructions in Summary

## [1.0.0] - 2025-12-02

### Added
- Initial release
- Step-by-step wizard for deploying Foundry VTT on DigitalOcean
- DigitalOcean droplet provisioning with region latency testing
- Cloudflare DNS configuration with automatic HTTPS via Caddy
- Optional DigitalOcean Spaces integration for asset storage
- SSH key generation for secure server access
- Automatic security updates configuration
- GitHub Pages deployment with GitHub Actions
- Cloudflare Worker for CORS proxying (auto-deploy on changes)
