# 🚀 AQOO - VPS SSH Management Tool

**by danish**

A stunning CLI tool for managing VPS SSH connections with ease. AQOO allows you to setup new users on your VPS with complete isolation, generate SSH keys, and manage multiple VPS hosts from a beautiful terminal interface.

## ✨ Features

- 🎨 **Beautiful CLI Interface** - Stunning terminal UI with colors, gradients, and ASCII art
- 🔐 **Secure SSH Key Management** - Auto-generates ED25519 keys for each VPS
- 👤 **User Provisioning** - Creates new users with sudo privileges on your VPS
- 💾 **SQLite Database** - Stores all your VPS configurations locally
- 🔌 **SSH Config Integration** - Reads your existing `~/.ssh/config` file
- 🌐 **Multi-VPS Support** - Manage unlimited VPS hosts
- 📊 **System Information** - View remote system details before connecting
- 🔄 **Connection Logs** - Track all SSH connections and operations
- 🐧 **Linux Compatible** - Works on all major Linux distributions

## 🎯 Use Cases

1. **Setup & Install on VPS** - Connect to any VPS from your SSH config, create a brand new user with maximum permissions, generate isolated SSH keys, and save everything to the database.

2. **Remote Auth** - Quickly connect to any managed VPS using the stored credentials and SSH keys.

## 📋 Prerequisites

- Node.js 18+ (ES Modules support)
- SSH client (`ssh`, `ssh-keygen`) installed on your system
- Existing VPS with root/sudo access
- `~/.ssh/config` file with your VPS configurations

## 🚀 Installation

```bash
# Install dependencies
npm install

# Run the application
npm start
```

## 📖 Usage

### Start the CLI

```bash
npm start
# or
node index.js
```

### Setup SSH Config

Before using AQOO, ensure your `~/.ssh/config` has VPS entries:

```ssh-config
Host my-vps
  HostName 192.168.1.100
  User root
  Port 22
  IdentityFile ~/.ssh/id_rsa

Host production-server
  HostName prod.example.com
  User admin
  Port 22
  IdentityFile ~/.ssh/prod_key
```

### Option 1: Setup & Install on VPS

1. Select **Setup & Install on VPS** from the main menu
2. Choose a VPS from your SSH config
3. Enter a name for the managed host
4. Specify the username for the new VPS user
5. Add optional notes
6. Confirm the setup

AQOO will:
- Connect to your VPS
- Create a new user with sudo privileges
- Generate a unique SSH key pair
- Configure SSH authentication
- Test the new connection
- Save everything to the database

### Option 2: Remote Auth

1. Select **Remote Auth** from the main menu
2. Choose from your managed VPS hosts
3. Select an action:
   - **Connect via SSH** - Open an interactive SSH session
   - **View System Info** - See OS, CPU, memory, uptime, etc.
   - **Test Connection** - Verify SSH connectivity

## 📁 Project Structure

```
costrict/
├── index.js                 # Main entry point
├── package.json            # Dependencies and scripts
├── src/
│   ├── database.js         # SQLite database operations
│   ├── sshConfig.js        # SSH config parser
│   ├── sshOperations.js    # SSH connection and key management
│   ├── setup.js            # VPS setup functionality
│   ├── remoteAuth.js       # Remote authentication
│   └── ui.js               # Beautiful CLI interface
├── data/
│   └── aqoo.db            # SQLite database (auto-created)
└── .ssh-keys/             # Generated SSH keys (auto-created)
```

## 🔒 Security

- All SSH keys are generated using ED25519 algorithm (more secure than RSA)
- Private keys are stored with `600` permissions
- Each VPS gets a unique key pair
- Keys are stored in the `.ssh-keys/` directory (add to .gitignore)
- Connection logs are maintained for audit purposes

## 🛠️ Technical Details

### Dependencies

- **inquirer** - Interactive CLI prompts
- **chalk** - Terminal colors and styling
- **ora** - Beautiful loading spinners
- **boxen** - Create boxes in the terminal
- **figlet** - ASCII art generator
- **ssh2** - SSH client for Node.js
- **better-sqlite3** - SQLite database
- **cli-table3** - Terminal tables
- **gradient-string** - Gradient colored text

### Database Schema

**vps_hosts** - Stores VPS configurations
- id, name, original_host, original_user, original_port
- managed_user, managed_port
- private_key_path, public_key_path
- setup_date, last_accessed, status, notes

**connection_logs** - Tracks all connections
- id, vps_host_id, connection_type, timestamp
- success, error_message

**ssh_keys** - SSH key metadata
- id, vps_host_id, key_type, fingerprint, created_date

## 🐛 Troubleshooting

### SSH Connection Issues
- Ensure you can connect to the VPS manually first
- Check that your SSH keys have correct permissions (600 for private, 644 for public)
- Verify the VPS firewall allows SSH connections

### Permission Denied
- The original user in SSH config must have sudo/root access
- Check that the VPS allows password-less sudo (or enter password when prompted)

### Key Generation Fails
- Ensure `ssh-keygen` is installed: `ssh-keygen -V`
- Check that the `.ssh-keys/` directory is writable

### Path Issues (Windows)
- Remove quotes from IdentityFile paths in `~/.ssh/config`
- Use forward slashes or escaped backslashes in paths

## 🎨 Customization

You can customize the branding and colors by editing:
- `src/ui.js` - All UI components and styling
- Gradient colors in `showBanner()` function
- Table styles and colors

## 📝 License

MIT License - Feel free to use, modify, and distribute.

## 👨‍💻 Author

**danish**

---

Made with ❤️ for VPS management enthusiasts
