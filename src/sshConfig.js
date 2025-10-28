import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Parse SSH config file and extract host configurations
 */
export const parseSSHConfig = () => {
  const sshConfigPath = join(homedir(), '.ssh', 'config');
  
  if (!existsSync(sshConfigPath)) {
    return [];
  }

  try {
    const configContent = readFileSync(sshConfigPath, 'utf-8');
    const hosts = [];
    let currentHost = null;

    const lines = configContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for Host directive
      const hostMatch = trimmedLine.match(/^Host\s+(.+)$/i);
      if (hostMatch) {
        // Save previous host if exists
        if (currentHost && currentHost.host) {
          hosts.push(currentHost);
        }
        
        // Start new host configuration
        currentHost = {
          host: hostMatch[1],
          hostname: null,
          user: null,
          port: 22,
          identityFile: null,
          options: {}
        };
        continue;
      }

      // Parse host properties
      if (currentHost) {
        const propertyMatch = trimmedLine.match(/^(\w+)\s+(.+)$/);
        if (propertyMatch) {
          const [, key, value] = propertyMatch;
          const lowerKey = key.toLowerCase();

          switch (lowerKey) {
            case 'hostname':
              currentHost.hostname = value;
              break;
            case 'user':
              currentHost.user = value;
              break;
            case 'port':
              currentHost.port = parseInt(value, 10);
              break;
            case 'identityfile':
              // Strip quotes and replace ~ with homedir
              let cleanPath = value.trim().replace(/^["']|["']$/g, '');
              cleanPath = cleanPath.replace(/^~/, homedir());
              currentHost.identityFile = cleanPath;
              break;
            default:
              currentHost.options[key] = value;
          }
        }
      }
    }

    // Add the last host
    if (currentHost && currentHost.host) {
      hosts.push(currentHost);
    }

    // Filter out wildcard hosts and ensure we have valid configurations
    return hosts.filter(host => 
      !host.host.includes('*') && 
      !host.host.includes('?') &&
      host.hostname
    );
  } catch (error) {
    console.error('Error parsing SSH config:', error.message);
    return [];
  }
};

/**
 * Get SSH host by name
 */
export const getSSHHost = (hostName) => {
  const hosts = parseSSHConfig();
  return hosts.find(host => host.host === hostName);
};

/**
 * Format SSH hosts for display
 */
export const formatSSHHosts = (hosts) => {
  return hosts.map(host => ({
    name: host.host,
    value: host,
    description: `${host.user || 'unknown'}@${host.hostname}:${host.port}`
  }));
};

/**
 * Check if SSH config exists
 */
export const hasSSHConfig = () => {
  const sshConfigPath = join(homedir(), '.ssh', 'config');
  return existsSync(sshConfigPath);
};
