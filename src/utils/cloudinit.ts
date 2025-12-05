import type { ProviderId } from '../api/providers/types'

interface StorageConfig {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  endpoint: string // Full endpoint URL (e.g., https://nyc3.digitaloceanspaces.com)
}

interface MaintenanceConfig {
  updateHour: number // 0-23, hour in UTC for automatic updates
}

export function generateCloudInit(
  domain: string,
  foundryDownloadUrl: string,
  foundryLicenseKey: string,
  foundryMajorVersion: number,
  provider: ProviderId = 'digitalocean',
  storageConfig?: StorageConfig,
  maintenanceConfig: MaintenanceConfig = { updateHour: 4 }
): string {
  // v13+ uses main.js in root, v12 and earlier use resources/app/main.js
  const scriptPath = foundryMajorVersion >= 13 ? 'main.js' : 'resources/app/main.js'
  // Strip dashes from license key for license.json format
  const licenseStripped = foundryLicenseKey ? foundryLicenseKey.replace(/-/g, '') : ''

  return `#cloud-config
package_update: true
package_upgrade: true

packages:
  - curl
  - wget
  - unzip
  - ufw
  - fail2ban
  - jq
  - unattended-upgrades
  - apt-listchanges

users:
  - name: foundry
    shell: /bin/bash
    groups: [sudo]
    sudo: ['ALL=(ALL) NOPASSWD:ALL']

write_files:
  - path: /etc/fail2ban/jail.local
    content: |
      [DEFAULT]
      bantime = 3600
      findtime = 600
      maxretry = 5

      [sshd]
      enabled = true
      port = ssh
      filter = sshd
      logpath = /var/log/auth.log
      maxretry = 3

  - path: /etc/apt/apt.conf.d/50unattended-upgrades
    content: |
      Unattended-Upgrade::Allowed-Origins {
        "\${distro_id}:\${distro_codename}";
        "\${distro_id}:\${distro_codename}-security";
        "\${distro_id}ESMApps:\${distro_codename}-apps-security";
        "\${distro_id}ESM:\${distro_codename}-infra-security";
      };
      Unattended-Upgrade::AutoFixInterruptedDpkg "true";
      Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
      Unattended-Upgrade::Remove-Unused-Dependencies "true";
      Unattended-Upgrade::Automatic-Reboot "true";
      Unattended-Upgrade::Automatic-Reboot-Time "${String(maintenanceConfig.updateHour).padStart(2, '0')}:00";

  - path: /etc/apt/apt.conf.d/20auto-upgrades
    content: |
      APT::Periodic::Update-Package-Lists "1";
      APT::Periodic::Unattended-Upgrade "1";
      APT::Periodic::AutocleanInterval "7";

runcmd:
  # Firewall
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow ssh
  - ufw allow http
  - ufw allow https
  - ufw --force enable

  # Fail2ban
  - systemctl enable fail2ban
  - systemctl start fail2ban

  # Swap (2GB) - prevents out-of-memory errors with heavy modules
  - fallocate -l 2G /swapfile
  - chmod 600 /swapfile
  - mkswap /swapfile
  - echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
  - swapon -a
${provider === 'digitalocean' ? `
  # DigitalOcean Monitoring Agent
  - curl -sSL https://repos.insights.digitalocean.com/install.sh | bash
` : ''}
  # SSH hardening
  - sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  - sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  - systemctl restart ssh

  # Node.js 22 LTS via NodeSource (includes npm)
  - |
    export DEBIAN_FRONTEND=noninteractive
    # Remove any existing nodejs first
    apt-get remove -y nodejs npm 2>/dev/null || true
    # Add NodeSource repository
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update
    apt-get install -y nodejs
    # Verify installation
    echo "Node version: $(node -v)"
    echo "npm version: $(npm -v)"

  # PM2
  - npm install -g pm2

  # Caddy - install first, then overwrite config
  - curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  - curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | tee /etc/apt/sources.list.d/caddy-stable.list
  - apt-get update
  - DEBIAN_FRONTEND=noninteractive apt-get install -y caddy
  - systemctl stop caddy
  - |
    cat > /etc/caddy/Caddyfile << EOFCADDY
    ${domain} {
      reverse_proxy localhost:30000
    }
    EOFCADDY

  # Foundry directories
  - mkdir -p /home/foundry/foundryvtt
  - mkdir -p /home/foundry/foundrydata/Config
  - mkdir -p /home/foundry/logs

  # Foundry options.json for reverse proxy
  - |
    cat > /home/foundry/foundrydata/Config/options.json << EOFOPTS
    {
      "hostname": "${domain}",
      "routePrefix": null,
      "sslCert": null,
      "sslKey": null,
      "port": 30000,
      "proxyPort": 443,
      "proxySSL": true${storageConfig ? `,
      "awsConfig": "aws.json"` : ''}
    }
    EOFOPTS
${licenseStripped ? `
  # Foundry license.json (pre-activate license)
  - |
    cat > /home/foundry/foundrydata/Config/license.json << EOFLIC
    {
      "host": "${domain}",
      "license": "${licenseStripped}",
      "version": "13.351",
      "time": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
    }
    EOFLIC
` : ''}${storageConfig ? `
  # S3-compatible storage config for Foundry
  - |
    cat > /home/foundry/foundrydata/Config/aws.json << EOFAWS
    {
      "buckets": ["${storageConfig.bucket}"],
      "region": "${storageConfig.region}",
      "endpoint": "${storageConfig.endpoint}",
      "credentials": {
        "accessKeyId": "${storageConfig.accessKeyId}",
        "secretAccessKey": "${storageConfig.secretAccessKey}"
      }
    }
    EOFAWS
` : ''}
  # Download and extract Foundry (with error handling)
  - |
    cd /home/foundry
    wget -q "${foundryDownloadUrl}" -O foundry.zip

    # Verify it's actually a zip file
    if ! file foundry.zip | grep -q "Zip archive"; then
      echo "ERROR: Download failed - not a valid zip file"

      # Capture error content for debugging (escape quotes for HTML)
      ERROR_CONTENT=$(head -c 1000 foundry.zip 2>/dev/null | sed 's/</\\&lt;/g; s/>/\\&gt;/g' || echo "Empty file")

      # Create error directory structure
      mkdir -p /var/www/error/api

      # JSON response for app polling
      cat > /var/www/error/api/status << 'EOFJSON'
    {
      "success": false,
      "error": "download_failed",
      "message": "Foundry download failed. The download URL may have expired. Please re-run the installer."
    }
    EOFJSON

      # Human-readable error page
      cat > /var/www/error/index.html << 'EOFHTML'
    <!DOCTYPE html>
    <html>
    <head>
      <title>Foundry Installation Failed</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #ff6b6b; }
        ul { line-height: 1.8; }
        details { margin-top: 20px; background: #16213e; padding: 15px; border-radius: 8px; }
        summary { cursor: pointer; color: #4ecdc4; }
        pre { white-space: pre-wrap; word-break: break-all; font-size: 12px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>⚠️ Installation Failed</h1>
      <p>The Foundry VTT download failed. This usually means:</p>
      <ul>
        <li>The download URL expired (they're time-limited)</li>
        <li>Foundry authentication issue</li>
        <li>Network or rate limiting</li>
      </ul>
      <p><strong>Please re-run the installer to get a fresh download URL.</strong></p>
      <details>
        <summary>Technical details</summary>
        <pre>ERROR_CONTENT_PLACEHOLDER</pre>
      </details>
    </body>
    </html>
    EOFHTML

      # Inject error content into HTML
      sed -i "s|ERROR_CONTENT_PLACEHOLDER|\${ERROR_CONTENT}|g" /var/www/error/index.html

      # Reconfigure Caddy to serve error files
      cat > /etc/caddy/Caddyfile << EOFCADDY
    ${domain} {
      root * /var/www/error
      file_server
      header /api/status Content-Type application/json
    }
    EOFCADDY

      systemctl restart caddy
      echo "Error page deployed at https://${domain}"
      exit 1
    fi

    # Download successful - extract
    unzip -q foundry.zip -d foundryvtt
    rm foundry.zip

  # PM2 ecosystem config
  - |
    cat > /home/foundry/ecosystem.config.js << 'EOFPM2'
    module.exports = {
      apps: [{
        name: 'foundry',
        script: '${scriptPath}',
        cwd: '/home/foundry/foundryvtt',
        args: '--dataPath=/home/foundry/foundrydata',
        interpreter: 'node',
        env: { NODE_ENV: 'production' },
        max_memory_restart: '1G',
        error_file: '/home/foundry/logs/err.log',
        out_file: '/home/foundry/logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
      }]
    };
    EOFPM2

  # Set ownership
  - chown -R foundry:foundry /home/foundry

  # Enable automatic security updates
  - systemctl enable unattended-upgrades
  - systemctl start unattended-upgrades

  # Start Foundry with PM2 (with explicit HOME)
  - sudo -u foundry HOME=/home/foundry pm2 start /home/foundry/ecosystem.config.js
  - sudo -u foundry HOME=/home/foundry pm2 save

  # PM2 startup service
  - env PATH=$PATH:/usr/bin HOME=/home/foundry pm2 startup systemd -u foundry --hp /home/foundry --service-name pm2-foundry
  - systemctl daemon-reload
  - systemctl enable pm2-foundry

  # Start Caddy
  - systemctl enable caddy
  - systemctl start caddy

  # Final reboot to ensure clean state
  - reboot

final_message: "Foundry VTT installation complete! Access at https://${domain}"
`
}
