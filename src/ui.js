import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import gradient from 'gradient-string';
import Table from 'cli-table3';

/**
 * Display beautiful ASCII art banner
 */
export const showBanner = () => {
  console.clear();
  
  const aqooText = figlet.textSync('AQOO', {
    font: 'Standard',
    horizontalLayout: 'fitted',
    verticalLayout: 'default'
  });

  const gradientAqoo = gradient.pastel.multiline(aqooText);
  
  console.log('\n' + gradientAqoo);
  console.log(chalk.cyan.bold('                    by danish\n'));
  console.log(chalk.gray('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.white.bold('   🚀 VPS SSH Management Tool\n'));
};

/**
 * Display welcome box
 */
export const showWelcome = () => {
  const welcomeMessage = chalk.white.bold('Welcome to AQOO!\n\n') +
    chalk.gray('Manage your VPS connections with ease.\n') +
    chalk.gray('Setup new users, generate SSH keys, and authenticate remotely.');

  const box = boxen(welcomeMessage, {
    padding: 1,
    margin: { top: 0, bottom: 1, left: 2, right: 2 },
    borderStyle: 'round',
    borderColor: 'cyan'
  });

  console.log(box);
};

/**
 * Display SSH hosts in a beautiful table
 */
export const displaySSHHosts = (hosts) => {
  if (hosts.length === 0) {
    console.log(chalk.yellow('\n⚠️  No SSH hosts found in ~/.ssh/config\n'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan.bold('Host'),
      chalk.cyan.bold('User'),
      chalk.cyan.bold('Hostname'),
      chalk.cyan.bold('Port')
    ],
    style: {
      head: [],
      border: ['cyan']
    },
    colWidths: [20, 15, 30, 8]
  });

  hosts.forEach(host => {
    table.push([
      chalk.white(host.host),
      chalk.green(host.user || 'N/A'),
      chalk.yellow(host.hostname),
      chalk.blue(host.port.toString())
    ]);
  });

  console.log('\n' + table.toString() + '\n');
};

/**
 * Display managed VPS hosts
 */
export const displayManagedHosts = (hosts) => {
  if (hosts.length === 0) {
    console.log(chalk.yellow('\n⚠️  No managed VPS hosts found\n'));
    console.log(chalk.gray('   Use "Setup & Install on VPS" to add your first host.\n'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan.bold('Name'),
      chalk.cyan.bold('Host'),
      chalk.cyan.bold('Managed User'),
      chalk.cyan.bold('Status'),
      chalk.cyan.bold('Setup Date')
    ],
    style: {
      head: [],
      border: ['cyan']
    }
  });

  hosts.forEach(host => {
    const setupDate = new Date(host.setup_date).toLocaleDateString();
    const statusColor = host.status === 'active' ? chalk.green : chalk.red;
    
    table.push([
      chalk.white.bold(host.name),
      chalk.yellow(host.original_host),
      chalk.blue(host.managed_user),
      statusColor(host.status),
      chalk.gray(setupDate)
    ]);
  });

  console.log('\n' + table.toString() + '\n');
};

/**
 * Display success message
 */
export const showSuccess = (message) => {
  const box = boxen(chalk.green.bold('✓ ') + chalk.white(message), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'green',
    backgroundColor: '#0f4c2e'
  });
  console.log(box);
};

/**
 * Display error message
 */
export const showError = (message) => {
  const box = boxen(chalk.red.bold('✗ ') + chalk.white(message), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'red',
    backgroundColor: '#4c0f0f'
  });
  console.log(box);
};

/**
 * Display info message
 */
export const showInfo = (message) => {
  const box = boxen(chalk.blue.bold('ℹ ') + chalk.white(message), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'blue',
    backgroundColor: '#0f2e4c'
  });
  console.log(box);
};

/**
 * Display system info
 */
export const displaySystemInfo = (info) => {
  if (!info) return;

  console.log(chalk.cyan.bold('\n📊 System Information:\n'));
  console.log(chalk.gray('  OS:       ') + chalk.white(info.os || 'N/A'));
  console.log(chalk.gray('  Kernel:   ') + chalk.white(info.kernel || 'N/A'));
  console.log(chalk.gray('  Hostname: ') + chalk.white(info.hostname || 'N/A'));
  console.log(chalk.gray('  CPUs:     ') + chalk.white(info.cpu || 'N/A'));
  console.log(chalk.gray('  Memory:   ') + chalk.white(info.memory || 'N/A'));
  console.log(chalk.gray('  Uptime:   ') + chalk.white(info.uptime || 'N/A'));
  console.log();
};

/**
 * Display connection details
 */
export const displayConnectionDetails = (host) => {
  console.log(chalk.cyan.bold('\n🔑 Connection Details:\n'));
  console.log(chalk.gray('  Host:         ') + chalk.yellow(host.original_host));
  console.log(chalk.gray('  Managed User: ') + chalk.green(host.managed_user));
  console.log(chalk.gray('  Port:         ') + chalk.blue(host.managed_port.toString()));
  console.log(chalk.gray('  Private Key:  ') + chalk.white(host.private_key_path));
  console.log();
};

/**
 * Show progress message
 */
export const showProgress = (message) => {
  console.log(chalk.cyan('⏳ ') + chalk.white(message));
};

/**
 * Format timestamp
 */
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Display divider
 */
export const showDivider = () => {
  console.log(chalk.gray('\n' + '─'.repeat(60) + '\n'));
};
