import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { getAllVPSHosts, updateLastAccessed, logConnection } from './database.js';
import { openInteractiveSSH, createSSHConnection, getSystemInfo } from './sshOperations.js';
import { 
  displayManagedHosts, 
  showSuccess, 
  showError, 
  showInfo,
  displayConnectionDetails,
  displaySystemInfo,
  showProgress
} from './ui.js';

/**
 * Remote authentication and connection
 */
export const remoteAuth = async () => {
  try {
    console.log(chalk.cyan.bold('\n🔐 Remote Authentication\n'));

    // Get all managed hosts
    const managedHosts = getAllVPSHosts();

    if (managedHosts.length === 0) {
      showInfo(
        'No managed VPS hosts found.\n\n' +
        'Please use "Setup & Install on VPS" to configure your first host.'
      );
      return;
    }

    // Display managed hosts
    displayManagedHosts(managedHosts);

    // Format choices for inquirer
    const choices = managedHosts.map(host => ({
      name: `${host.name} - ${host.managed_user}@${host.original_host}`,
      value: host,
      short: host.name
    }));

    // Select host
    const { selectedHost } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedHost',
        message: 'Select VPS to connect:',
        choices: choices
      }
    ]);

    // Display connection details
    displayConnectionDetails(selectedHost);

    // Select action
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🚀 Connect via SSH', value: 'connect' },
          { name: '📊 View System Info', value: 'info' },
          { name: '🔧 Test Connection', value: 'test' },
          { name: '⬅️  Go Back', value: 'back' }
        ]
      }
    ]);

    if (action === 'back') {
      return;
    }

    const spinner = ora('Initializing...').start();

    try {
      if (action === 'connect') {
        // Connect via SSH
        spinner.text = 'Establishing SSH connection...';
        spinner.stop();
        
        showProgress(`Connecting to ${selectedHost.managed_user}@${selectedHost.original_host}...`);
        console.log(chalk.gray('\nPress Ctrl+D or type "exit" to close the connection.\n'));
        
        // Update last accessed
        updateLastAccessed(selectedHost.id);
        
        // Open interactive SSH session
        await openInteractiveSSH(
          selectedHost.original_host,
          selectedHost.managed_port,
          selectedHost.managed_user,
          selectedHost.private_key_path
        );

        // Log successful connection
        logConnection(selectedHost.id, 'ssh', true);
        
        console.log(chalk.green('\n✓ SSH session closed.\n'));

      } else if (action === 'info') {
        // View system info
        spinner.text = 'Connecting to VPS...';
        const conn = await createSSHConnection({
          hostname: selectedHost.original_host,
          port: selectedHost.managed_port,
          username: selectedHost.managed_user,
          privateKey: selectedHost.private_key_path
        });

        spinner.text = 'Gathering system information...';
        const sysInfo = await getSystemInfo(conn);
        conn.end();
        
        spinner.succeed('System information retrieved');
        
        if (sysInfo) {
          displaySystemInfo(sysInfo);
        } else {
          showError('Failed to retrieve system information');
        }

        // Log info request
        logConnection(selectedHost.id, 'info', true);

      } else if (action === 'test') {
        // Test connection
        spinner.text = 'Testing connection...';
        const conn = await createSSHConnection({
          hostname: selectedHost.original_host,
          port: selectedHost.managed_port,
          username: selectedHost.managed_user,
          privateKey: selectedHost.private_key_path
        });

        conn.end();
        spinner.succeed('Connection test successful');

        showSuccess(
          `Connection to ${selectedHost.name} is working!\n\n` +
          `Host: ${selectedHost.original_host}\n` +
          `User: ${selectedHost.managed_user}\n` +
          `Port: ${selectedHost.managed_port}`
        );

        // Log test connection
        logConnection(selectedHost.id, 'test', true);
      }

      // Ask if user wants to do something else
      const { continueAction } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAction',
          message: 'Would you like to perform another action?',
          default: true
        }
      ]);

      if (continueAction) {
        await remoteAuth(); // Recursive call for another action
      }

    } catch (error) {
      spinner.fail('Operation failed');
      showError(`Connection Error: ${error.message}`);
      
      // Log failed connection
      logConnection(selectedHost.id, action, false, error.message);
    }

  } catch (error) {
    showError(`Remote Auth Error: ${error.message}`);
  }
};

/**
 * Manage VPS hosts
 */
export const manageHosts = async () => {
  console.log(chalk.cyan.bold('\n🔧 Manage VPS Hosts\n'));

  const managedHosts = getAllVPSHosts();

  if (managedHosts.length === 0) {
    showInfo('No managed VPS hosts found.');
    return;
  }

  displayManagedHosts(managedHosts);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📋 View Connection Logs', value: 'logs' },
        { name: '❌ Remove Host', value: 'remove' },
        { name: '⬅️  Go Back', value: 'back' }
      ]
    }
  ]);

  if (action === 'back') {
    return;
  }

  // TODO: Implement logs and remove functionality
  showInfo('This feature is coming soon!');
};
