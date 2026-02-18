# Stacvil Tracker (MongoDB Version)

Employee Work Monitoring Web Application.

## Tech Stack
- **Frontend**: React.js (Vite), Tailwind CSS
- **Backend**: Node.js/Express, Mongoose
- **Database**: MongoDB
- **Authentication**: JWT

## Deployment (Vercel)
This project is configured as a monorepo for Vercel.
- The `vercel.json` file handles routing between the frontend and the backend.

### Environment Variables
For Vercel, set these in the dashboard:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: Your secret key
- `JWT_EXPIRE`: e.g., 24h
- `VITE_API_URL`: `/api`

## Local Development
1. Backend: `cd backend && npm install && npm run dev`
2. Frontend: `cd frontend && npm install && npm run dev`
