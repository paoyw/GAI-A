const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const FormData = require('form-data');
const admZip = require("adm-zip");
const csvParse = require("csv-parse");
const { finished } = require('stream');


const app = express();
const port = 3000;

const isTesting = true;

// Configures for the text-to-text model.
const model1Hostname = "127.0.0.1";
const model1Port = 5000;
const model1Path = "/textgen";
const model2Hostname = "127.0.0.1";
const model2Port = 5000;
const model2Path = "/imggen";
const model3Hostname = "127.0.0.1";
const model3Port = 5000;
const model3Path = "/videogen";

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
  let model1Output = [];
  // Call Model1 API
  if (isTesting) {
    model1Output = [/* simulated output */ 'text1', 'text2', 'text3'];
    res.json({ output: model1Output });
  }
  else {
    const postData = JSON.stringify({
      content: [
        {
          role: "system", content: "You are an advertisement video creater." +
            " Please follow the instructions and create the description." +
            " The description will be the input of the text-to-image generation model for" +
            "each key frame of the video." +
            " The text-length for each description should less than 15 words." +
            " The reply should be in json format ONLY." +
            " SAMPLE format is [{'id': 0, 'description': '...'}]." +
            " The product name should be replaced with <PRODUCT>."
        },
        { role: "user", content: userInput },
      ],
    });

    const options = {
      hostname: model1Hostname,
      port: model1Port,
      path: model1Path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const modelReq = http.request(options, (modelRes) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

      modelRes.on('data', (chunk) => {
        console.log(`BODY: ${chunk.toString()}`);
        responseData = JSON.parse(chunk.toString());
        generatedContent = JSON.parse(responseData[0]["generated_text"][2]["content"]);
        generatedContent.forEach(e => {
          model1Output.push(e["description"]);
        });
        res.json({ output: model1Output });
      });
    });

    modelReq.on('error', (error) => {
      console.error(error);
    });

    modelReq.write(postData);
    modelReq.end();
  }
});


// API route to handle multiple file uploads and texts
app.post('/api/model2', upload.array('images'), (req, res) => {
  // Log uploaded files and texts
  console.log('Uploaded files:', req.files);
  console.log('Received texts:', req.body.texts);

  // Read sample images from disk
  const sampleImages = [];
  if (isTesting) {
    sampleImages.push(path.join(__dirname, 'sample_images/sample_image1.png'));
    sampleImages.push(path.join(__dirname, 'sample_images/sample_image2.png'));
    sampleImages.push(path.join(__dirname, 'sample_images/sample_image3.png'));

    const imageBuffers = sampleImages.map(filePath => fs.readFileSync(filePath));

    // Send images as response
    res.json({
      message: 'Mock response from model 2',
      images: imageBuffers.map(buffer => buffer.toString('base64'))
    });
  }
  else {
    const form = new FormData();
    if (typeof req.body.texts === "string") {
      form.append("prompt", req.body.texts);
    }
    else {
      for (const i in req.body.texts) {
        form.append(`prompt${i}`, req.body.texts[i]);
      }
    }

    for (const i in req.files) {
      form.append("train", fs.createReadStream(req.files[i].path));
    }

    const options = {
      hostname: model2Hostname,
      port: model2Port,
      path: model2Path,
      method: 'POST',
      headers: form.getHeaders(),
    };

    const modelReq = http.request(options, (modelRes) => {
      console.log(`/imggen statusCode: ${modelRes.statusCode}`);

      const zipPath = path.join(__dirname, "cache/archive.zip");
      const zipStream = fs.createWriteStream(zipPath);
      modelRes.pipe(zipStream);

      finished(zipStream, () => {
        const zip = admZip(zipPath);
        zip.extractAllTo(path.join(__dirname, "cache/"), true);

        const readStream = fs.createReadStream("./cache/img.csv");
        readStream.pipe(csvParse.parse({ delimiter: ",", from_line: 2 }))
          .on("data", (row) => {
            sampleImages.push(path.join(__dirname, "cache", row[1]));
          });

        finished(readStream, () => {
          const imageBuffers = sampleImages.map(filePath => fs.readFileSync(filePath));

          // Send images as response
          res.json({
            message: 'Mock response from model 2',
            images: imageBuffers.map(buffer => buffer.toString('base64'))
          });
        });
      });
    });
    form.pipe(modelReq);
  }


});

app.post('/api/model3', upload.array('images'), (req, res) => {
  // Use the uploaded images (req.files)
  console.log("model3", req.files);
  console.log("model3", req.body.texts);

  if (isTesting) {
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
  }
  else {
    const form = new FormData();

    var reqTexts = [];
    if (typeof req.body.texts === "string") {
      reqTexts = [req.body.texts];
    }
    else {
      reqTexts = req.body.texts;
    }

    for (const i in req.files) {
      form.append(reqTexts[i], fs.createReadStream(req.files[i].path));
    }

    const options = {
      hostname: model3Hostname,
      port: model3Port,
      path: model3Path,
      method: 'POST',
      headers: form.getHeaders(),
    };

    const modelReq = http.request(options, (modelRes) => {
      console.log(`/videogen statusCode: ${modelRes.statusCode}`);

      const videoPath = path.join(__dirname, "cache/video.mp4");
      const videoStream = fs.createWriteStream(videoPath);
      modelRes.pipe(videoStream);

      finished(videoStream, () => {
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
    });
    form.pipe(modelReq);
  }


});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

