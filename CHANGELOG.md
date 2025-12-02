# Changelog

All notable changes to this project will be documented in this file.

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
