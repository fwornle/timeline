const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5173;

// Basic middleware
app.use(express.json());
app.use(cors());

// Debug middleware
app.use((req, res, next) => {
    console.log('Request:', req.method, req.url);
    next();
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
    console.log('Health check requested');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: err.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
});