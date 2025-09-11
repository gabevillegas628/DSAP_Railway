# DNA Analysis Program

A web-based application for managing DNA analysis workflows, student assignments, and clone tracking in educational and research environments.

## Overview

This application provides a complete platform for DNA analysis education and research, featuring student assignment management, clone status tracking, review workflows, and integrated software recommendations. The system supports multiple user roles including students, staff, and program directors.

## Features

### Core Functionality
- **Clone Management**: Track DNA clones through various analysis stages
- **Student Assignment System**: Assign and manage student work on specific clones
- **Review Workflow**: Built-in review and feedback system for completed analyses
- **Status Tracking**: Comprehensive status system from assignment to completion
- **Software Integration**: Recommendations and links for DNA analysis software

### User Roles
- **Students**: Access assigned clones, submit analyses, view feedback
- **Staff**: Review student work, provide feedback, manage assignments
- **Directors**: Full system administration, program settings, data management

### Additional Features
- **Email Notifications**: Automated email system for workflow updates
- **Data Export/Import**: Bulk data management capabilities
- **Demographics Collection**: Optional student demographic data collection
- **Common Feedback System**: Reusable feedback templates

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **Prisma** ORM for database management
- **JWT** authentication with bcrypt password hashing
- **Nodemailer** for email functionality
- **Multer** for file upload handling

### Frontend
- **React** with modern hooks
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Context API** for state management

### Development Tools
- **ngrok** for development tunneling
- **Nodemon** for hot reloading
- **Custom startup scripts** for development environment

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- ngrok (for development)
- Database (PostgreSQL recommended)

### Setup

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd dna-analysis-program
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Configuration**
   
   Create `.env` file in the `server` directory:
   ```
   DATABASE_URL="your-database-connection-string"
   JWT_SECRET="your-jwt-secret"
   EMAIL_USER="your-email@example.com"
   EMAIL_PASSWORD="your-email-password"
   FRONTEND_URL="http://localhost:3000"
   ```

5. **Database Setup**
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```

6. **ngrok Configuration**
   
   Install ngrok and set up authentication:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

## Development

### Quick Start
The project includes a comprehensive startup script that handles ngrok tunneling, configuration updates, and server startup:

```bash
node startup2.js
```

This script will:
- Validate project structure
- Start ngrok tunnels
- Update configuration files with tunnel URLs
- Start both frontend and backend servers

### Manual Start
If you prefer to start services manually:

1. **Start Backend**
   ```bash
   cd server
   npm run dev
   ```

2. **Start Frontend**
   ```bash
   cd client
   npm start
   ```

### Available Scripts

**Backend (server directory):**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

**Startup Script Options:**
- `node startup2.js --help` - Show help information
- `node startup2.js --check` - Run prerequisite checks
- `node startup2.js --tunnels-only` - Start only ngrok tunnels
- `node startup2.js --kill-ports` - Kill processes on ports 3000 and 5000

## Project Structure

```
dna-analysis-program/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # Context providers
│   │   ├── services/       # API services
│   │   └── config.js       # Frontend configuration
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js            # Main server file
│   ├── prisma/             # Database schema and migrations
│   ├── .env                # Environment variables
│   └── package.json
├── startup2.js             # Development startup script
└── README.md
```

## Configuration

### Program Settings
Directors can configure:
- Project information and headers
- Principal investigator details
- Organism and clone information
- Email templates and messaging
- Demographics collection settings

### Clone Status System
The application tracks clones through these statuses:
- Unassigned
- Being worked on by student
- Completed, waiting review
- Needs reanalysis
- Needs corrections
- Corrected, waiting review
- Reviewed and correct
- Reviewed by teacher
- Unreadable
- To be submitted to NCBI
- Submitted to NCBI

## Usage

### For Students
1. Log in to access assigned clones
2. Download recommended analysis software
3. Complete analysis and submit results
4. View feedback and make corrections if needed

### For Staff
1. Review student submissions
2. Provide detailed feedback
3. Approve or request corrections
4. Monitor student progress

### For Directors
1. Configure program settings
2. Manage user accounts
3. Export/import data
4. Set up common feedback templates
5. Monitor overall program metrics

## API Endpoints

Key API endpoints include:
- `/api/auth/*` - Authentication routes
- `/api/clones/*` - Clone management
- `/api/users/*` - User management
- `/api/program-settings` - Configuration
- `/api/common-feedback/*` - Feedback templates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For technical issues or questions:
- Check the built-in help documentation
- Contact your system administrator
- Review the troubleshooting section in the startup script help

## License

[Add your license information here]

---

*This DNA Analysis Program is designed to streamline DNA analysis education and research workflows while providing comprehensive tracking and feedback capabilities.*