#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const bcrypt = require('bcryptjs'); // Add bcrypt for password hashing

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class InstanceCreator {
  constructor() {
    this.baseDir = path.join(__dirname, '..'); // Updated: go up one level from scripts/
    this.instancesDir = path.join(this.baseDir, 'instances');
    this.basePort = 5000;
  }

  async question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  async createInstance() {
    console.log('🚀 New Instance Creator');
    console.log('======================');

    // Get instance details
    const instanceName = await this.question('Instance name: ');
    if (!instanceName || !instanceName.match(/^[a-zA-Z0-9-_]+$/)) {
      console.log('❌ Invalid instance name. Use only letters, numbers, hyphens, and underscores.');
      rl.close();
      return;
    }

    // Check if instance already exists
    const instanceDir = path.join(this.instancesDir, instanceName);
    if (fs.existsSync(instanceDir)) {
      console.log('❌ Instance already exists!');
      rl.close();
      return;
    }

    // Get director account details
    console.log('\n👤 Director Account Setup');
    const directorName = await this.question('Director name: ');
    const directorEmail = await this.question('Director email: ');
    const directorPassword = await this.question('Director password (or press Enter for default "admin123"): ');
    
    const finalPassword = directorPassword.trim() || 'admin123';

    // Find available port
    const port = await this.findAvailablePort();
    
    console.log(`\n📋 Configuration:`);
    console.log(`- Instance name: ${instanceName}`);
    console.log(`- Database: ${instanceName}_db`);
    console.log(`- Port: ${port}`);
    console.log(`- Directory: ${instanceDir}`);
    console.log(`- Director: ${directorName} (${directorEmail})`);

    const confirm = await this.question('\nProceed? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }

    try {
      console.log('\n🔧 Creating instance...');

      // Step 1: Create database
      await this.createDatabase(instanceName);

      // Step 2: Create instance directory and copy files
      await this.setupInstanceFiles(instanceName, port);

      // Step 3: Install dependencies
      await this.installDependencies(instanceName);

      // Step 4: Run database migrations
      await this.runMigrations(instanceName);

      // Step 5: Create default director account
      await this.createDirectorAccount(instanceName, directorName, directorEmail, finalPassword);

      // Step 6: Build frontend
      await this.buildFrontend(instanceName);

      // Step 7: Start the instance
      await this.startInstance(instanceName, port);

      console.log('\n🎉 Instance created successfully!');
      console.log(`\n📍 Access your app at: http://localhost:${port}`);
      console.log(`\n🔑 Director Login:`);
      console.log(`   Email: ${directorEmail}`);
      console.log(`   Password: ${finalPassword}`);
      console.log(`\n🛠️  Management commands:`);
      console.log(`   Stop:    pm2 stop ${instanceName}`);
      console.log(`   Restart: pm2 restart ${instanceName}`);
      console.log(`   Logs:    pm2 logs ${instanceName}`);
      console.log(`   Delete:  pm2 delete ${instanceName}`);

    } catch (error) {
      console.error(`\n❌ Failed to create instance: ${error.message}`);
    }

    rl.close();
  }

  async findAvailablePort() {
    let port = this.basePort;
    
    // Get all existing instances to check their ports
    if (fs.existsSync(this.instancesDir)) {
      const instances = fs.readdirSync(this.instancesDir).filter(item => 
        fs.statSync(path.join(this.instancesDir, item)).isDirectory()
      );

      const usedPorts = new Set();
      
      for (const instance of instances) {
        const configPath = path.join(this.instancesDir, instance, 'config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (config.port) {
            usedPorts.add(config.port);
          }
        }
      }

      while (usedPorts.has(port) || !(await this.isPortAvailable(port))) {
        port++;
      }
    } else {
      // Check if base port is available
      while (!(await this.isPortAvailable(port))) {
        port++;
      }
    }

    return port;
  }

  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(true));
      });

      server.on('error', () => resolve(false));
    });
  }

  async createDatabase(instanceName) {
    console.log('   📊 Creating database...');
    
    const dbName = `${instanceName}_db`;
    const dbUser = `${instanceName}_user`;
    const dbPassword = this.generatePassword();

    try {
      // Create database
      execSync(`sudo -u postgres createdb ${dbName}`, { stdio: 'pipe' });
      
      // Create user and grant privileges
      const sqlCommands = `
        CREATE USER ${dbUser} WITH ENCRYPTED PASSWORD '${dbPassword}';
        GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};
        ALTER DATABASE ${dbName} OWNER TO ${dbUser};
      `;
      
      execSync(`sudo -u postgres psql -c "${sqlCommands}"`, { stdio: 'pipe' });
      
      // Store database config
      const dbConfig = {
        name: dbName,
        user: dbUser,
        password: dbPassword,
        host: 'localhost',
        port: 5432,
        url: `postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}`
      };

      // Ensure instances directory exists
      if (!fs.existsSync(this.instancesDir)) {
        fs.mkdirSync(this.instancesDir, { recursive: true });
      }

      const instanceDir = path.join(this.instancesDir, instanceName);
      fs.mkdirSync(instanceDir, { recursive: true });
      
      fs.writeFileSync(
        path.join(instanceDir, 'db-config.json'), 
        JSON.stringify(dbConfig, null, 2)
      );
      
      console.log(`   ✅ Database created: ${dbName}`);
      
    } catch (error) {
      throw new Error(`Database creation failed: ${error.message}`);
    }
  }

  async setupInstanceFiles(instanceName, port) {
    console.log('   📁 Setting up files...');
    
    const instanceDir = path.join(this.instancesDir, instanceName);
    
    // Read database config
    const dbConfig = JSON.parse(
      fs.readFileSync(path.join(instanceDir, 'db-config.json'), 'utf8')
    );

    // Copy server directory
    const serverDir = path.join(instanceDir, 'server');
    execSync(`cp -r ${path.join(this.baseDir, 'server')} ${serverDir}`, { stdio: 'pipe' });

    // Copy client directory
    const clientDir = path.join(instanceDir, 'client');
    execSync(`cp -r ${path.join(this.baseDir, 'client')} ${clientDir}`, { stdio: 'pipe' });

    // Create uploads directory
    const uploadsDir = path.join(serverDir, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'profile-pics'), { recursive: true });

    // Create server .env file
    const serverEnv = `
# Database Configuration
DATABASE_URL="${dbConfig.url}"

# Server Configuration
PORT=${port}
NODE_ENV=production

# Email Configuration (copy from main .env if it exists)
${this.getEmailConfig()}

# Instance Information
INSTANCE_NAME=${instanceName}
`.trim();

    fs.writeFileSync(path.join(serverDir, '.env'), serverEnv);

    // Create instance config
    const instanceConfig = {
      name: instanceName,
      port: port,
      database: dbConfig,
      paths: {
        instance: instanceDir,
        server: serverDir,
        client: clientDir,
        uploads: uploadsDir
      },
      created: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(instanceDir, 'config.json'), 
      JSON.stringify(instanceConfig, null, 2)
    );

    console.log(`   ✅ Files set up in: ${instanceDir}`);
  }

  getEmailConfig() {
    try {
      const mainEnvPath = path.join(this.baseDir, 'server', '.env'); // Updated path
      if (fs.existsSync(mainEnvPath)) {
        const content = fs.readFileSync(mainEnvPath, 'utf8');
        const emailLines = content.split('\n').filter(line => 
          line.startsWith('EMAIL_USER=') || 
          line.startsWith('EMAIL_PASSWORD=') ||
          line.startsWith('SENDGRID_API_KEY=')
        );
        return emailLines.join('\n');
      }
    } catch (error) {
      console.warn('Could not copy email config from main .env');
    }
    
    return `# Add your email configuration here
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
# SENDGRID_API_KEY=your-sendgrid-api-key`;
  }

  async installDependencies(instanceName) {
    console.log('   📦 Installing dependencies...');
    
    const instanceDir = path.join(this.instancesDir, instanceName);
    const serverDir = path.join(instanceDir, 'server');
    const clientDir = path.join(instanceDir, 'client');

    try {
      // Install server dependencies
      execSync('npm install', { 
        cwd: serverDir, 
        stdio: 'pipe'
      });

      // Install client dependencies  
      execSync('npm install', { 
        cwd: clientDir, 
        stdio: 'pipe'
      });

      console.log('   ✅ Dependencies installed');
    } catch (error) {
      throw new Error(`Dependency installation failed: ${error.message}`);
    }
  }

  async runMigrations(instanceName) {
    console.log('   🗄️  Running database migrations...');
    
    const serverDir = path.join(this.instancesDir, instanceName, 'server');

    try {
      // Generate Prisma client
      execSync('npx prisma generate', { 
        cwd: serverDir, 
        stdio: 'pipe'
      });

      // Run migrations
      execSync('npx prisma migrate deploy', { 
        cwd: serverDir, 
        stdio: 'pipe'
      });

      console.log('   ✅ Migrations completed');
    } catch (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async createDirectorAccount(instanceName, name, email, password) {
    console.log('   👤 Creating director account...');
    
    const serverDir = path.join(this.instancesDir, instanceName, 'server');
    
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create a simple Node.js script to create the user
      const createUserScript = `
const { PrismaClient } = require('@prisma/client');

async function createDirector() {
  const prisma = new PrismaClient();
  
  try {
    // Check if director already exists
    const existingDirector = await prisma.user.findUnique({
      where: { email: '${email}' }
    });
    
    if (existingDirector) {
      console.log('Director already exists');
      return;
    }
    
    // Create director
    const director = await prisma.user.create({
      data: {
        name: '${name}',
        email: '${email}',
        password: '${hashedPassword}',
        role: 'director',
        status: 'approved'
      }
    });
    
    console.log('Director created successfully:', director.email);
    
  } catch (error) {
    console.error('Error creating director:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDirector();
`;

      // Write the script to a temporary file
      const scriptPath = path.join(serverDir, 'create-director.js');
      fs.writeFileSync(scriptPath, createUserScript);
      
      // Run the script
      execSync('node create-director.js', { 
        cwd: serverDir, 
        stdio: 'pipe'
      });
      
      // Clean up the script file
      fs.unlinkSync(scriptPath);
      
      console.log(`   ✅ Director account created: ${email}`);
      
    } catch (error) {
      throw new Error(`Director account creation failed: ${error.message}`);
    }
  }

  async buildFrontend(instanceName) {
    console.log('   🏗️  Building frontend...');
    
    const clientDir = path.join(this.instancesDir, instanceName, 'client');

    try {
      execSync('npm run build', { 
        cwd: clientDir, 
        stdio: 'pipe'
      });

      console.log('   ✅ Frontend built successfully');
    } catch (error) {
      throw new Error(`Frontend build failed: ${error.message}`);
    }
  }

  async startInstance(instanceName, port) {
    console.log('   🚀 Starting instance...');

    // Install PM2 if not available
    try {
      execSync('pm2 --version', { stdio: 'pipe' });
    } catch {
      console.log('   📦 Installing PM2...');
      execSync('npm install -g pm2', { stdio: 'inherit' });
    }

    const serverDir = path.join(this.instancesDir, instanceName, 'server');

    try {
      // Start with PM2
      execSync(`pm2 start index.js --name ${instanceName} --cwd ${serverDir}`, { 
        stdio: 'pipe'
      });

      // Save PM2 configuration
      execSync('pm2 save', { stdio: 'pipe' });

      console.log(`   ✅ Instance started on port ${port}`);
    } catch (error) {
      throw new Error(`Failed to start instance: ${error.message}`);
    }
  }

  generatePassword() {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
  }
}

// Run the script
if (require.main === module) {
  const creator = new InstanceCreator();
  creator.createInstance().catch(console.error);
}

module.exports = InstanceCreator;