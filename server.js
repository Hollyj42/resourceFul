const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// --- Only define 'app' and 'port' once ---
const app = express();
const port = process.env.PORT || 3000;

// --- Setup Multer Storage ---
// NOTE: This uses local storage, which will fail in production (See Persistence Warning below)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { // Ensure 'uploads' directory exists
    fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});
const upload = multer({ storage: storage });

// --- Standard Middleware Setup ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- Static File Middleware (The fix for 'Cannot GET /') ---
// 1. Serve files directly from 'html' and 'css' folders when requested by name
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.static(path.join(__dirname, 'css')));
// 2. Serve files from the root directory (like resourceful.js)
app.use(express.static(path.join(__dirname, '/'))); 

// --- Home Route Fix: Explicitly serve home.html ---
app.get('/', (req, res) => {
    // This tells the server to send the home.html file when someone hits the root URL (/)
    res.sendFile(path.join(__dirname, 'html', 'home.html'));
});

// --- Your Existing Routes (login, signup, upload, api/courses, download) ---
// ... (Your existing app.post('/login'), app.post('/signup'), etc. should go here) ...

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});