// --- Import All Required Modules ---
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg'); // <-- Import the new 'pg' library

// --- 1. Define App and Port (Only Once!) ---
const app = express();
const port = process.env.PORT || 3000;

// --- 2. Create the Database Connection Pool ---
// This uses the DATABASE_URL you set in Render's Environment Variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for connecting to Render's database
    }
});

// --- 3. Configure Multer for File Uploads ---
// ⚠️ WARNING: This still saves to a temporary folder. We will fix this next.
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

// --- 4. Use Standard Middleware ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- 5. Configure Static Folders (for CSS, HTML, etc.) ---
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, '/')));

// --- 6. DEFINE ALL YOUR ROUTES (Now using async/await with the database) ---

// --- Home Route ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'home.html'));
});

// --- Login Route ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const result = await pool.query('SELECT * FROM lecturers WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            console.log(`Login failed: No user with email ${email}`);
            return res.send("<script>alert('Invalid Email or Password. Please try again.'); window.location.href='/login.html';</script>");
        }

        const lecturer = result.rows[0];

        // ⚠️ IMPORTANT: You are storing passwords as plain text. This is very insecure.
        // For a real project, you must hash passwords using 'bcrypt'.
        if (lecturer.password === password) {
            console.log(`Lecturer ${lecturer.name} logged in successfully.`);
            return res.redirect('/dashboard.html');
        } else {
            console.log('Login failed: Incorrect password');
            return res.send("<script>alert('Invalid Email or Password. Please try again.'); window.location.href='/login.html';</script>");
        }

    } catch (err) {
        console.error('Database error during login:', err);
        res.status(500).send('Server error. Please try again later.');
    }
});

// --- Signup Route ---
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if email already exists
        const existing = await pool.query('SELECT * FROM lecturers WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.log(`Sign up failed: Email ${email} already exists.`);
            return res.send("<script>alert('Account already exists! Please Sign In.'); window.location.href='/login.html';</script>");
        }

        // Insert new lecturer
        const insertQuery = 'INSERT INTO lecturers (name, email, password) VALUES ($1, $2, $3)';
        await pool.query(insertQuery, [name, email, password]); // ⚠️ Insecure password!
        
        console.log(`New lecturer signed up: ${name} (${email})`);
        return res.send("<script>alert('Account created successfully! Please Sign In.'); window.location.href='/login.html';</script>");

    } catch (err) {
        console.error('Database error during signup:', err);
        res.status(500).send('Server error. Please try again later.');
    }
});

// --- Upload Route ---
app.post('/upload', upload.single('documentFile'), async (req, res) => {
    const { title, course } = req.body;
    const filename = req.file.originalname;

    try {
        const insertQuery = 'INSERT INTO documents (title, course, lecturer, filename) VALUES ($1, $2, $3, $4)';
        await pool.query(insertQuery, [title, course, "Prof. Excellence", filename]); // Note: Lecturer is hardcoded
        
        console.log(`Document uploaded and recorded: ${filename}`);
        return res.send(`<script>alert('Document uploaded successfully!'); window.location.href='/dashboard.html';</script>`);

    } catch (err) {
        console.error('Database error during upload:', err);
        res.status(500).send('Server error. Please try again later.');
    }
});

// --- API Route to Get Courses ---
app.get('/api/courses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents');
        res.json(result.rows);
    } catch (err) {
        console.error("Error retrieving documents:", err);
        res.status(500).json({ message: "Could not load documents." });
    }
});

// --- Download Route ---
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // ⚠️ This still uses the temporary 'uploads' folder
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found on the server.');
    }
});

// --- 7. Function to Create Tables on Startup ---
const createTables = async () => {
    const createLecturersTable = `
    CREATE TABLE IF NOT EXISTS lecturers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
    );`;

    const createDocumentsTable = `
    CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        course VARCHAR(100),
        lecturer VARCHAR(100),
        filename VARCHAR(255) NOT NULL
    );`;

    try {
        await pool.query(createLecturersTable);
        console.log('Lecturers table created or already exists.');
        await pool.query(createDocumentsTable);
        console.log('Documents table created or already exists.');
    } catch (err) {
        console.error('Error creating tables:', err);
    }
};

// --- 8. Start the Server and Create Tables ---
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    // Run the function to create tables when the server starts
    createTables();
});