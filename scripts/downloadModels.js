import fs from 'fs';
import path from 'path';
import https from 'https';

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const modelsDir = path.join(process.cwd(), 'public', 'models');

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const downloadFile = (file) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(modelsDir, file);
    if (fs.existsSync(dest)) {
      console.log(`Skipping ${file}, already exists.`);
      return resolve();
    }
    console.log(`Downloading ${file}...`);
    const fileStream = fs.createWriteStream(dest);
    https.get(`${baseUrl}${file}`, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${file}' (${response.statusCode})`));
        return;
      }
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded ${file}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

const downloadAll = async () => {
  for (const file of files) {
    try {
      await downloadFile(file);
    } catch (e) {
      console.error(`Error downloading ${file}:`, e);
    }
  }
  console.log("All models downloaded successfully!");
};

downloadAll();
