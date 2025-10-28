import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { parseSSHConfig, formatSSHHosts } from './sshConfig.js';
import { 
  createSSHConnection, 
  generateSSHKeyPair, 
  setupVPSUser,
  getSystemInfo,
  testNewUserConnection
} from './sshOperations.js';
import { saveVPSHost, logConnection, saveSSHKey } from './database.js';
import { 
  displaySSHHosts, 
  showSuccess, 
  showError, 
  showInfo,
  displaySystemInfo,
  showProgress
} from './ui.js';

/**
 * Setup and install on VPS
 */
export const setupVPS = async () => {
  try {
    console.log(chalk.cyan.bold('\n🚀 Setup & Install on VPS\n'));
    
    // Parse SSH config
    const sshHosts = parseSSHConfig();
    
    if (sshHosts.length === 0) {
      showError('No SSH hosts found in ~/.ssh/config\n\nPlease add your VPS hosts to ~/.ssh/config first.');
      return;
    }

    // Display available hosts
    displaySSHHosts(sshHosts);

    // Select VPS
    const { selectedHost } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedHost',
        message: 'Select VPS to setup:',
        choices: formatSSHHosts(sshHosts)
      }
    ]);

    // Get setup details
    const setupDetails = await inquirer.prompt([
      {
        type: 'input',
        name: 'hostName',
        message: 'Enter a name for this managed host:',
        default: `${selectedHost.host}-managed`,
        validate: (input) => input.length > 0 || 'Name cannot be empty'
      },
      {
        type: 'input',
        name: 'username',
        message: 'Enter username for new VPS user:',
        default: 'aqoo-admin',
        validate: (input) => {
          if (input.length === 0) return 'Username cannot be empty';
          if (!/^[a-z_][a-z0-9_-]*$/.test(input)) {
            return 'Invalid username format. Use lowercase letters, numbers, underscore, and hyphen.';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'notes',
        message: 'Add notes (optional):',
        default: ''
      }
    ]);

    // Confirm setup
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow(`\nThis will create user "${setupDetails.username}" on ${selectedHost.hostname}. Continue?`),
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.gray('\n✋ Setup cancelled.\n'));
      return;
    }

    // Start setup process
    const spinner = ora('Connecting to VPS...').start();

    try {
      // Connect to VPS
      spinner.text = 'Establishing SSH connection...';
      const conn = await createSSHConnection({
        hostname: selectedHost.hostname,
        port: selectedHost.port,
        user: selectedHost.user,
        identityFile: selectedHost.identityFile
      });

      spinner.succeed('Connected to VPS');

      // Get system info
      showProgress('Gathering system information...');
      const sysInfo = await getSystemInfo(conn);
      if (sysInfo) {
        displaySystemInfo(sysInfo);
      }

      // Generate SSH key pair
      spinner.start('Generating new SSH key pair...');
      const keyName = `${setupDetails.hostName}-${Date.now()}`;
      const keyPair = generateSSHKeyPair(keyName);
      spinner.succeed('SSH key pair generated');

      // Setup user on VPS
      spinner.start('Setting up new user on VPS...');
      await setupVPSUser(conn, setupDetails.username, keyPair.publicKey, spinner);
      spinner.succeed(`User ${setupDetails.username} created successfully`);

      conn.end();

      // Test new connection
      spinner.start('Testing new SSH connection...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for SSH to settle
      
      const testResult = await testNewUserConnection(
        selectedHost.hostname,
        selectedHost.port,
        setupDetails.username,
        keyPair.privateKeyPath
      );

      if (!testResult) {
        throw new Error('New user connection test failed');
      }
      spinner.succeed('New user connection verified');

      // Save to database
      spinner.start('Saving configuration to database...');
      const hostData = {
        name: setupDetails.hostName,
        originalHost: selectedHost.hostname,
        originalUser: selectedHost.user,
        originalPort: selectedHost.port,
        managedUser: setupDetails.username,
        managedPort: selectedHost.port,
        privateKeyPath: keyPair.privateKeyPath,
        publicKeyPath: keyPair.publicKeyPath,
        notes: setupDetails.notes
      };

      const result = saveVPSHost(hostData);
      
      // Save SSH key info
      saveSSHKey(result.lastInsertRowid, 'ed25519', 'generated');
      
      // Log successful setup
      logConnection(result.lastInsertRowid, 'setup', true);

      spinner.succeed('Configuration saved to database');

      // Show success message
      showSuccess(
        `VPS Setup Completed!\n\n` +
        `Host: ${setupDetails.hostName}\n` +
        `User: ${setupDetails.username}\n` +
        `Host: ${selectedHost.hostname}\n\n` +
        `You can now use "Remote Auth" to connect to this VPS.`
      );

    } catch (error) {
      spinner.fail('Setup failed');
      showError(`Setup Error: ${error.message}`);
      
      // Log failed connection
      try {
        logConnection(0, 'setup', false, error.message);
      } catch (e) {
        // Ignore logging errors
      }
    }

  } catch (error) {
    showError(`Setup Error: ${error.message}`);
  }
};
