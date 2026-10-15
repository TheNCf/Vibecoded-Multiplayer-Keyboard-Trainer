# Keyboard Trainer

## Project Overview

This is a keyboard training application with separate admin and user interfaces connected via local Wi-Fi network. The system allows teachers (admin) to monitor overall typing results of students/users.

## Stack & Technologies

- Frontend: HTML, CSS, native JavaScript
- Backend: Node.js, Express
- Database: Non-relational database (MongoDB, etc.)
- Networking: Local Wi-Fi network connection between admin and user devices

## Project Structure

- `admin/` - Admin interface for teachers
- `user/` - User interface for students
- `server/` - Express server with database connection  
- `public/` - Shared static assets
- `database/` - Database configuration and connection logic

## Key Commands

### Development
- Start development server: `npm run dev`
- Run server: `npm start` or `node server/app.js`
- Install dependencies: `npm install`

### Database
- Connect to database: Database connection configured in `server/database/config.js`
- Seed initial data: `npm run seed` (if available)

## Network Configuration

### Connection Requirements  
- Both admin and user devices must be connected to the same local Wi-Fi network
- Server must be accessible on the local network
- Port 3000 (default) should be open for connections

### Admin Interface Access
- Access via: `http://[server-ip]:3000/admin`
- Default credentials: admin user (specific login details may be in `.env` file)

### User Interface Access  
- Access via: `http://[server-ip]:3000/user`
- Users connect through local network automatically

## Database Notes

This is a non-relational database setup. Key aspects:
- Data stored as documents/records
- No relationships between entities (unlike relational models)
- Schema flexibility for user typing metrics

The database connection should be configured using `process.env.MONGODB_URI` or similar environment variable.

## Admin Functionality

Admin can view:
- Overall accuracy statistics
- Typed symbols count
- Typing speed metrics
- Individual user performance tracking
- Group results overview

## User Functionality

Users can:
- Practice typing exercises
- See real-time typing feedback
- Monitor their own progress
- Access various text samples for training

## Environment Variables

Required environment variables (typically in `.env` file):
- `PORT` - Server port (default: 3000) 
- `DB_URI` - Database connection string
- `ADMIN_PASSWORD` - Admin authentication password
- `NETWORK_IP` - Server IP address for local network access

## Development Workflow

1. Start database server (if not running locally)
2. Run `npm install` to install dependencies
3. Start server: `npm run dev`
4. Access interfaces via browser at:
   - Admin: `http://[server-ip]:3000/admin`
   - User: `http://[server-ip]:3000/user`
5. Make changes in appropriate directories (admin/, user/, server/)
6. Server auto-restarts on code changes during development

## Tips for Development

- All network communication happens over local Wi-Fi
- Admin and user interfaces must be on the same network segment 
- Test database connectivity before deploying
- Ensure correct port forwarding or firewall settings if using external access
- Consider mobile responsiveness for both admin and user interfaces

> This project implements a local network keyboard training system with separate interfaces for administrators and users.