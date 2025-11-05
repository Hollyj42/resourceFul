const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '/')));
app.use('/html', express.static(path.join(__dirname, 'html')));

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

    const lecturer = data.lecturers.find(
        l => l.email === email && l.password === password
    );

    if (lecturer) {
        console.log(`lecturer ${lecturer.name} logged in successfully.`);
        return res.redirect('/html/dashboard.html');
    } else {
        return res.send(
            "<script>alert('Invalid email or password. Please try again.'); window.location.href='/html/login.html';</script>"
        );
    }
});

app.post('/upload', upload.single('documentFile'), (req, res) => {
    const { title, course } = req.body;
    const filename = req.file ? req.file.originalname : null;

    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

    const newDocument = {
        title: title,
        course: course,
        lecturer: 'Prof. Excellence (Placeholder)',
        filename: filename
    };

    data.documents = data.documents || [];
    data.documents.push(newDocument);
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));

    console.log(`Document uploaded and recorded: ${filename}`);
    return res.send(
        "<script>alert('Document uploaded successfully!'); window.location.href='/html/dashboard.html';</script>"
    );
});

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});