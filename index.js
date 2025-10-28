#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import { showBanner, showWelcome, showInfo, showError } from './src/ui.js';
import { setupVPS } from './src/setup.js';
import { remoteAuth } from './src/remoteAuth.js';
import { hasSSHConfig } from './src/sshConfig.js';

/**
 * Main application entry point
 */
const main = async () => {
  try {
    // Show banner and welcome message
    showBanner();
    showWelcome();

    // Check if SSH config exists
    if (!hasSSHConfig()) {
      showError(
        'SSH config file not found!\n\n' +
        'Please create ~/.ssh/config and add your VPS hosts before using AQOO.\n\n' +
        'Example SSH config entry:\n\n' +
        'Host my-vps\n' +
        '  HostName 192.168.1.100\n' +
        '  User root\n' +
        '  Port 22\n' +
        '  IdentityFile ~/.ssh/id_rsa'
      );
      process.exit(1);
    }

    // Main menu loop
    let running = true;

    while (running) {
      console.log(chalk.cyan.bold('Main Menu\n'));

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            {
              name: `${chalk.green('🚀')} Setup & Install on VPS`,
              value: 'setup',
              short: 'Setup VPS'
            },
            {
              name: `${chalk.blue('🔐')} Remote Auth`,
              value: 'auth',
              short: 'Remote Auth'
            },
            {
              name: `${chalk.gray('❌')} Exit`,
              value: 'exit',
              short: 'Exit'
            }
          ],
          pageSize: 10
        }
      ]);

      switch (action) {
        case 'setup':
          await setupVPS();
          break;

        case 'auth':
          await remoteAuth();
          break;

        case 'exit':
          console.log(chalk.cyan('\n👋 Thank you for using AQOO!\n'));
          console.log(chalk.gray('   by danish\n'));
          running = false;
          break;

        default:
          showInfo('Invalid option selected');
      }

      // Add spacing between operations
      if (running) {
        console.log('\n');
      }
    }

  } catch (error) {
    if (error.isTtyError) {
      showError('Prompt could not be rendered in the current environment');
    } else if (error.name === 'ExitPromptError') {
      console.log(chalk.gray('\n✋ Operation cancelled.\n'));
    } else {
      showError(`Application Error: ${error.message}`);
      console.error(error);
    }
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.cyan('\n\n👋 Goodbye!\n'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.cyan('\n\n👋 Goodbye!\n'));
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ Uncaught Exception:'), error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n❌ Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});

// Run the application
main();
