const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression());
app.use(limiter);
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https:"],
        },
    },
}));
app.use(express.json());

// Static file serving with caching
const cacheTime = process.env.NODE_ENV === 'production' ? 86400000 : 0; // 1 day in production
app.use(express.static('public', { maxAge: cacheTime }));
app.use(express.static('.', { maxAge: cacheTime }));

// MongoDB connection with retry logic
const connectWithRetry = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bess_calculator';
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();

// BESS Calculation Schema
const calculationSchema = new mongoose.Schema({
    totalEnergy: {
        type: Number,
        required: true
    },
    batteryCapacity: {
        type: Number,
        required: true
    },
    recommendedSize: {
        type: Number,
        required: true
    },
    devices: [{
        name: String,
        power: Number,
        quantity: Number,
        operatingHours: Number,
        batteryHours: Number
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Calculation = mongoose.model('Calculation', calculationSchema);

// API Routes
app.post('/api/calculations', async (req, res) => {
    try {
        const calculation = new Calculation(req.body);
        await calculation.save();
        res.status(201).json({
            success: true,
            message: 'Calculation saved successfully',
            calculationId: calculation._id
        });
    } catch (error) {
        console.error('Error saving calculation:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving calculation',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        error: process.env.NODE_ENV === 'production' ? {} : err
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongoConnection: mongoose.connection.readyState === 1
    });
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
}); 