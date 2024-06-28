const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/model1', (req, res) => {
  const userInput = req.body.text;
  // Call Model1 API
  const model1Output = [/* simulated output */ 'text1', 'text2', 'text3'];
  res.json({ output: model1Output });
});

// API route to handle multiple file uploads
app.post('/api/model2', upload.fields([{ name: 'image_0', maxCount: 1 }, { name: 'image_1', maxCount: 1 }, { name: 'image_2', maxCount: 1 }]), (req, res) => {
  if (req.files) {
    console.log('Files uploaded:', req.files);
    // Process the uploaded files as needed
    // Here you would typically call your AI model processing function

    // Example response
    res.json({
      message: 'Files successfully uploaded',
      files: req.files
    });
  } else {
    res.status(400).json({ message: 'No files uploaded' });
  }
});

app.post('/api/model3', (req, res) => {
  const model2Output = req.body.images;
  // Call Model3 API
  const model3Output = [/* simulated output */ 'video1.mp4', 'video2.mp4'];
  res.json({ output: model3Output });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

