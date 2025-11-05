// --- Import All Required Modules ---
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// --- 1. Define App and Port (Only Once!) ---
const app = express();
const port = process.env.PORT || 3000;

// --- 2. Configure Multer for File Uploads ---
// ⚠️ WARNING: This saves to a temporary folder. Files will be deleted on Render!
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
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

// --- 3. Use Standard Middleware ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- 4. Configure Static Folders (for CSS, HTML, etc.) ---
// This serves files from 'html', 'css', and the root directory
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, '/')));

// --- 5. DEFINE ALL YOUR ROUTES ---

// --- Home Route (Fix for "Cannot GET /") ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'home.html'));
});

// --- Login Route ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // ⚠️ WARNING: 'data.json' must be in your GitHub repo, or this will crash!
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    const lecturer = data.lecturers.find(
        l => l.email === email && l.password === password
    );

    if (lecturer) {
        console.log(`Lecturer ${lecturer.name} logged in successfully.`);
        return res.redirect('/dashboard.html'); // Simpler redirect
    } else {
        return res.send("<script>alert('Invalid Email or Password. Please try again.'); window.location.href='/login.html';</script>");
    }
});

// --- Signup Route (Fix for "Cannot POST /signup") ---
app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;
    // ⚠️ WARNING: 'data.json' must be in your GitHub repo, or this will crash!
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    const existingLecturer = data.lecturers.find(l => l.email === email);

    if (existingLecturer) {
        console.log(`Sign up failed: Email ${email} already exists.`);
        return res.send("<script>alert('Account already exists! Please Sign In.'); window.location.href='/login.html';</script>");
    }

    const newLecturer = { name, email, password };
    data.lecturers.push(newLecturer);
    
    // ⚠️ WARNING: This write will be lost when Render's server restarts!
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    console.log(`New lecturer signed up: ${name} (${email})`);
    
    return res.send("<script>alert('Account created successfully! Please Sign In.'); window.location.href='/login.html';</script>");
});

// --- Upload Route ---
app.post('/upload', upload.single('documentFile'), (req, res) => {
    const { title, course } = req.body;
    const filename = req.file.originalname;
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

    const newDocument = {
        title: title,
        course: course,
        lecturer: "Prof. Excellence", // Note: This is hardcoded
        filename: filename
    };

    data.documents.push(newDocument);
    // ⚠️ WARNING: This write will be lost when Render's server restarts!
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    
    console.log(`Document uploaded and recorded: ${filename}`);
    return res.send(`<script>alert('Document uploaded successfully!'); window.location.href='/dashboard.html';</script>`);
});

// --- API Route to Get Courses ---
app.get('/api/courses', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        res.json(data.documents);
    } catch (error) {
        console.error("Error retrieving documents:", error);
        res.status(500).json({ message: "Could not load documents." });
    }
});

// --- Download Route ---
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found on the server.');
    }
});

// --- 6. Start the Server ---
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});