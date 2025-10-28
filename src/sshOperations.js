import { Client } from 'ssh2';
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create SSH connection
 */
export const createSSHConnection = (config) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    const connectConfig = {
      host: config.hostname || config.host,
      port: config.port || 22,
      username: config.user || config.username,
    };

    // Handle authentication
    if (config.password) {
      connectConfig.password = config.password;
    } else if (config.identityFile || config.privateKey) {
      try {
        let keyPath = config.identityFile || config.privateKey;
        // Clean up path - remove quotes if present
        keyPath = keyPath.trim().replace(/^["']|["']$/g, '');
        
        // Check if file exists before reading
        if (!existsSync(keyPath)) {
          return reject(new Error(`Private key not found at: ${keyPath}`));
        }
        
        connectConfig.privateKey = readFileSync(keyPath);
      } catch (error) {
        return reject(new Error(`Failed to read private key: ${error.message}`));
      }
    }

    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    
    conn.connect(connectConfig);
  });
};

/**
 * Execute command over SSH
 */
export const executeSSHCommand = (conn, command) => {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);

      let stdout = '';
      let stderr = '';

      stream.on('close', (code, signal) => {
        resolve({ code, stdout, stderr });
      });

      stream.on('data', (data) => {
        stdout += data.toString();
      });

      stream.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    });
  });
};

/**
 * Generate SSH key pair
 */
export const generateSSHKeyPair = (keyName) => {
  const keysDir = join(__dirname, '..', '.ssh-keys');
  
  if (!existsSync(keysDir)) {
    mkdirSync(keysDir, { recursive: true });
  }

  const privateKeyPath = join(keysDir, `${keyName}`);
  const publicKeyPath = join(keysDir, `${keyName}.pub`);

  try {
    // Generate ED25519 key (more secure and smaller than RSA)
    execSync(
      `ssh-keygen -t ed25519 -f "${privateKeyPath}" -N "" -C "aqoo-managed-${keyName}"`,
      { stdio: 'pipe' }
    );

    // Set proper permissions
    chmodSync(privateKeyPath, 0o600);
    chmodSync(publicKeyPath, 0o644);

    return {
      privateKeyPath,
      publicKeyPath,
      publicKey: readFileSync(publicKeyPath, 'utf-8').trim()
    };
  } catch (error) {
    throw new Error(`Failed to generate SSH key: ${error.message}`);
  }
};

/**
 * Setup new user on VPS with SSH key authentication
 */
export const setupVPSUser = async (conn, username, publicKey, spinner) => {
  try {
    // Check if user already exists
    spinner.text = `Checking if user ${username} exists...`;
    const checkUser = await executeSSHCommand(conn, `id ${username} 2>/dev/null || echo "not_found"`);
    
    if (!checkUser.stdout.includes('not_found')) {
      throw new Error(`User ${username} already exists on the VPS`);
    }

    // Create user with home directory
    spinner.text = `Creating user ${username}...`;
    await executeSSHCommand(conn, `sudo useradd -m -s /bin/bash ${username}`);

    // Add user to sudo group
    spinner.text = `Granting sudo privileges to ${username}...`;
    const sudoCommands = [
      `sudo usermod -aG sudo ${username}`,
      `sudo usermod -aG wheel ${username}`,  // For CentOS/RHEL
      `echo "${username} ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/${username}`,
      `sudo chmod 0440 /etc/sudoers.d/${username}`
    ];

    for (const cmd of sudoCommands) {
      try {
        await executeSSHCommand(conn, cmd);
      } catch (err) {
        // Some commands may fail depending on the distro, that's okay
      }
    }

    // Setup SSH directory and authorized_keys
    spinner.text = `Setting up SSH authentication for ${username}...`;
    const sshSetupCommands = [
      `sudo mkdir -p /home/${username}/.ssh`,
      `echo "${publicKey}" | sudo tee /home/${username}/.ssh/authorized_keys`,
      `sudo chown -R ${username}:${username} /home/${username}/.ssh`,
      `sudo chmod 700 /home/${username}/.ssh`,
      `sudo chmod 600 /home/${username}/.ssh/authorized_keys`
    ];

    for (const cmd of sshSetupCommands) {
      await executeSSHCommand(conn, cmd);
    }

    // Verify SSH setup
    spinner.text = `Verifying SSH setup...`;
    const verify = await executeSSHCommand(conn, `sudo ls -la /home/${username}/.ssh/authorized_keys`);
    
    if (verify.code !== 0) {
      throw new Error('Failed to verify SSH key setup');
    }

    spinner.text = `User ${username} setup completed successfully!`;
    return true;
  } catch (error) {
    throw new Error(`VPS setup failed: ${error.message}`);
  }
};

/**
 * Test SSH connection with new user
 */
export const testNewUserConnection = async (hostname, port, username, privateKeyPath) => {
  const config = {
    hostname,
    port,
    username,
    privateKey: privateKeyPath
  };

  try {
    const conn = await createSSHConnection(config);
    
    // Test a simple command
    const result = await executeSSHCommand(conn, 'whoami');
    conn.end();

    return result.stdout.trim() === username;
  } catch (error) {
    throw new Error(`Connection test failed: ${error.message}`);
  }
};

/**
 * Open interactive SSH session
 */
export const openInteractiveSSH = (hostname, port, username, privateKeyPath) => {
  const sshProcess = spawn('ssh', [
    '-i', privateKeyPath,
    '-p', port.toString(),
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    `${username}@${hostname}`
  ], {
    stdio: 'inherit'
  });

  return new Promise((resolve, reject) => {
    sshProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`SSH session exited with code ${code}`));
      }
    });

    sshProcess.on('error', reject);
  });
};

/**
 * Get system information from remote host
 */
export const getSystemInfo = async (conn) => {
  try {
    const commands = {
      os: 'cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \\\"',
      kernel: 'uname -r',
      uptime: 'uptime -p',
      memory: 'free -h | grep Mem | awk \'{print $2}\'',
      cpu: 'nproc',
      hostname: 'hostname'
    };

    const info = {};
    
    for (const [key, cmd] of Object.entries(commands)) {
      try {
        const result = await executeSSHCommand(conn, cmd);
        info[key] = result.stdout.trim();
      } catch (error) {
        info[key] = 'N/A';
      }
    }

    return info;
  } catch (error) {
    return null;
  }
};
