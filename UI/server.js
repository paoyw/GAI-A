const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
// Mock API for model 2
app.post('/api/model2', upload.fields([{ name: 'image_0', maxCount: 1 }, { name: 'image_1', maxCount: 1 }, { name: 'image_2', maxCount: 1 }]), (req, res) => {
  // Log uploaded files
  console.log('Uploaded files:', req.files);

  // Read sample images from disk
  const sampleImages = [
    path.join(__dirname, 'sample_images/sample_image1.png'),
    path.join(__dirname, 'sample_images/sample_image2.png'),
    path.join(__dirname, 'sample_images/sample_image3.png')
  ];

  const imageBuffers = sampleImages.map(filePath => fs.readFileSync(filePath));

  // Send images as response
  res.json({
    message: 'Mock response from model 2',
    images: imageBuffers.map(buffer => buffer.toString('base64'))
  });
});

app.post('/api/model3', upload.array('images'), (req, res) => {
  // Use the uploaded images (req.files)
  console.log(req.files);
  
  const videoPath = path.join(__dirname, 'sample_video', 'sample_video.mp4');
  fs.readFile(videoPath, (err, data) => {
    if (err) {
      res.status(500).send('Error reading video file');
      console.log('Error reading video file');
      return;
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.status(200).send(data);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

