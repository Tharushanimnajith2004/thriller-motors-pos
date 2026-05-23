require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const ShopState = require('../models/ShopState');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.static(path.join(__dirname, '..'))); 

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
    console.log("✅ Connected to MongoDB successfully.");
}).catch((err) => {
    console.error("❌ MongoDB connection error:", err);
});

// --- API Endpoints ---

// Get State
app.get('/api/state', async (req, res) => {
    try {
        const state = await ShopState.findOne({ singletonId: 'main_shop_state' });
        if (state) {
            res.json(state);
        } else {
            res.status(404).json({ message: "No state found" });
        }
    } catch (err) {
        console.error("Error fetching state:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Save State
app.post('/api/state', async (req, res) => {
    try {
        const updateData = req.body;
        await ShopState.findOneAndUpdate(
            { singletonId: 'main_shop_state' },
            { $set: updateData },
            { upsert: true, new: true }
        );
        res.json({ message: "State saved successfully" });
    } catch (err) {
        console.error("Error saving state:", err);
        res.status(500).json({ message: "Failed to save state" });
    }
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`==========================================`);
        console.log(`🚀 Thriller Motors POS Server is running!`);
        console.log(`👉 Access the app at: http://localhost:${PORT}`);
        console.log(`==========================================`);
    });
}

module.exports = app;
