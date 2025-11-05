const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});

const upload = multer({ storage: storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '/')));
app.use('/html', express.static(path.join(__dirname, 'html')));

app.post('/login', (req, res) =>{
    const { email, password } = req.body;

    const data = JSON.parse(fs.readFileSync('data.json',
        'utf8'));

const lecturer = data.lecturers.find(
    l => l.email === email && l.password === password);

if (lecturer) {
    console.log(`lecturer ${lecturer.name} logged in succesfully.`);
    return res.redirect('/html/dashboard.html');
} else {
    return res.send("<script>alert('invalid Email or Passwod. please try again.'); window.location.href='/html/login.html';</script>");
}
});

app.post('/signup', (req, res) => {
    // 1. Get the new user details from the form
    const { name, email, password } = req.body;
    
    // 2. Read the "database" file
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

    // 3. Check if the email already exists
    const existingLecturer = data.lecturers.find(l => l.email === email);
    
    if (existingLecturer) {
        console.log(`Sign up failed: Email ${email} already exists.`);
        return res.send("<script>alert('Account already exists! Please Sign In.'); window.location.href='/html/login.html';</script>");
    }

    // 4. Create the new lecturer object
    const newLecturer = {
        name: name,
        email: email,
        password: password
    };

    // 5. Add to the lecturers array and save the file
    data.lecturers.push(newLecturer);
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));

    console.log(`New lecturer signed up: ${name} (${email})`);
    
    // 6. Success: Redirect them to the login page
    return res.send("<script>alert('Account created successfully! Please Sign In.'); window.location.href='/html/login.html';</script>");
});

app.post('/upload', upload.single('documentFile'), (req,
    res) => {

        const {title, course } = req.body;
        const filename = req.file.originalname;

        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

        const newDocument = {
            title: title,
            course: course,
            lecturer: "Prof. Excellence",
            filename: filename
        };

        data.documents.push(newDocument);
        fs.writeFileSync('data.json', JSON.stringify(data, null, 2));

        console.log(`Document uploaded and recorded: ${filename}`);
            return res.send(`<script>alert('Document uploadd succesfully!');
            window.location.href='/html/dashboard.html';</script>`);
    });

app.get('/api/courses', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        // Sends the list of documents to the frontend as JSON
        res.json(data.documents);
    } catch (error) {
        console.error("Error retrieving documents:", error);
        res.status(500).json({ message: "Could not load documents." });
    }
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename; 

    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {

        res.download(filePath); 
    } else {
        res.status(404).send('File not found on the server.');
    }
});

// Ensure the app.listen line is this:
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});