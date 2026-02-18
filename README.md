# Stacvil Tracker

Employee Work Monitoring Web Application.

## Tech Stack
- **Frontend**: React.js (Vite), Tailwind CSS
- **Backend**: Node.js/Express
- **Database**: MySQL
- **Authentication**: JWT

## Deployment (Vercel)
This project is configured as a monorepo for Vercel.
- The `vercel.json` file handles routing between the frontend and the backend.
- **Important**: You must provide a hosted MySQL database URL in the environment variables.

### Environment Variables
For Vercel, set these in the dashboard:
- `DB_HOST`: Your hosted SQL hostname
- `DB_USER`: Your hosted SQL user
- `DB_PASSWORD`: Your hosted SQL password
- `DB_NAME`: Your hosted SQL database name
- `DB_PORT`: Usually 3306
- `JWT_SECRET`: Your secret key
- `JWT_EXPIRE`: e.g., 24h
- `VITE_API_URL`: `/api` (for the frontend to talk to the backend on the same domain)

## Local Development
1. Backend: `cd backend && npm install && npm run dev`
2. Frontend: `cd frontend && npm install && npm run dev`
