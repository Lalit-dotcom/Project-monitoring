import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectsRouter from './routes/projects.js';

// Load environmental variables
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Enable CORS for frontend origin
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Routes registry
app.use('/api/projects', projectsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Express Listener
app.listen(port, () => {
  console.log(`NPMS Backend Server listening on http://localhost:${port}`);
});
