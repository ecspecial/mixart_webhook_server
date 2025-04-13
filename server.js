require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const busboy = require('busboy');         // <-- No "new" here, it's a function
const fs = require('fs');
const path = require('path');

// Mongoose model
const Image = require('./imageModel');

// Pull env vars
const { MONGODB_URI, USER_IMAGES_PATH, PORT } = process.env;

/** Connect to Mongo once at startup. */
async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from .env');
  }
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB:', MONGODB_URI);
}

// Base folder for all user subfolders
const uploadDir = USER_IMAGES_PATH || path.join(__dirname, 'uploads');
// Make sure the folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created upload directory:', uploadDir);
}

const app = express();

app.get('/', (req, res) => {
  res.send('Hello from the streaming webhook server!');
});

/**
 * POST /webhook
 * Expects:
 *   - form field: id_gen (the _id of your Image doc)
 *   - file field: "image"
 *
 * Flow:
 *   1) We'll stream file to a TEMP path (since we don't yet know userId).
 *   2) After Busboy finishes, we find doc => get userId => rename temp -> userId/<id_gen>.ext
 *   3) doc.res_image = userId/<id_gen>.ext
 *   4) respond 200
 */
app.post('/service/webhook/lora/image', (req, res) => {
  console.log('➡️ Incoming POST /webhook/lora/image');

  const bb = busboy({ headers: req.headers }); // call as function, not "new"

  let id_gen = '';
  let fileReceived = false;
  let tempFilePath = '';
  let fileExt = '.png'; // default extension
  let fileWriteStream;

  let responded = false; // track if we've sent a final response

  // This event is for regular form fields
  bb.on('field', (fieldName, val) => {
    console.log(`📝 field: ${fieldName} = ${val}`);
    if (fieldName === 'id_gen') {
      id_gen = val.trim();
    }
  });

  // This event is for the actual file
  bb.on('file', (fieldName, fileStream, { filename, encoding, mimeType }) => {
    console.log(`📦 file field=[${fieldName}] filename=[${filename}]`);
    fileReceived = true;

    // Derive extension
    fileExt = path.extname(filename) || '.png';

    // We'll create a random TEMP file to store data as it streams
    const tempName = `${id_gen}-${Date.now()}${fileExt}`;
    tempFilePath = path.join(uploadDir, tempName);

    console.log(`💾 Streaming to temp => ${tempFilePath}`);
    fileWriteStream = fs.createWriteStream(tempFilePath);

    // Pipe from the incoming file stream to our disk file
    fileStream.pipe(fileWriteStream);

    fileWriteStream.on('finish', () => {
      console.log('✅ Temp file write complete');
    });
    fileWriteStream.on('error', (err) => {
      console.error('❌ Write stream error:', err);
    });
  });

  // Called once Busboy has read all form fields + file data
  bb.on('finish', async () => {
    console.log('🚀 Busboy finished reading form');

    if (!id_gen || !fileReceived) {
      console.warn('⚠️ Missing id_gen or no file');
      if (!responded) {
        responded = true;
        return res.status(200).json({ error: 'Missing id_gen or file' });
      }
      return;
    }

    // Wait for the file to finish writing
    fileWriteStream.on('finish', async () => {
      try {
        // 1) Find the doc => get userId
        const imageDoc = await Image.findById(id_gen);
        if (!imageDoc) {
          console.warn(`No doc found for _id=${id_gen}`);
          if (!responded) {
            responded = true;
            return res.status(200).json({ error: 'Image doc not found' });
          }
          return;
        }
        const userId = imageDoc.userId;
        if (!userId) {
          console.warn('No userId in doc');
          if (!responded) {
            responded = true;
            return res.status(200).json({ error: 'No userId in doc' });
          }
          return;
        }

        // 2) Create user folder if needed
        const userFolder = path.join(uploadDir, userId.toString());
        if (!fs.existsSync(userFolder)) {
          fs.mkdirSync(userFolder, { recursive: true });
          console.log('Created user folder =>', userFolder);
        }

        // 3) final path => userId/<id_gen>.ext
        const finalFilePath = path.join(userFolder, `${id_gen}${fileExt}`);
        console.log(`📝 Renaming temp => ${finalFilePath}`);
        fs.renameSync(tempFilePath, finalFilePath);

        // 4) Update doc
        //    res_image = "userId/id_gen.ext"
        const relativePath = path.join(userId.toString(), `${id_gen}${fileExt}`).replace(/\\/g, '/');
        imageDoc.res_image = relativePath;
        imageDoc.status = 'ready';
        await imageDoc.save();

        console.log(`✅ Updated doc => _id=${id_gen}, res_image=${relativePath}`);

        // 5) respond
        if (!responded) {
          responded = true;
          return res.json({
            message: 'File received & updated in user folder',
            id_gen,
            path: relativePath,
          });
        }
      } catch (err) {
        console.error('❌ Error finishing file update:', err);
        if (!responded) {
          responded = true;
          return res.status(200).json({ error: err.message });
        }
      }
    });
  });

  // If there's a busboy error, respond 500 (once)
  bb.on('error', (err) => {
    console.error('❌ Busboy error:', err);
    if (!responded) {
      responded = true;
      res.status(200).json({ error: err.message });
    }
  });

  // Pipe raw request into Busboy
  req.pipe(bb);
});

app.post('/service/webhook/gen/image', (req, res) => {
    console.log('➡️ Incoming POST /webhook/gen/image');
  
    const bb = busboy({ headers: req.headers });
  
    let id_gen = '';
    let fields = {};
    let fileExt = '.png';
    let tempFilePath = '';
    let fileWriteStream;
    let responded = false;
  
    bb.on('field', (fieldName, val) => {
      console.log(`📝 field: ${fieldName} = ${val}`);
      fields[fieldName] = val;
      if (fieldName === 'id_gen') id_gen = val.trim();
    });
  
    bb.on('file', (fieldName, fileStream, { filename }) => {
      console.log(`📦 file field=[${fieldName}] filename=[${filename}]`);
      fileExt = path.extname(filename) || '.png';
      const tempName = `${id_gen}-${Date.now()}${fileExt}`;
      tempFilePath = path.join(uploadDir, tempName);
  
      console.log(`💾 Streaming to temp => ${tempFilePath}`);
      fileWriteStream = fs.createWriteStream(tempFilePath);
      fileStream.pipe(fileWriteStream);
  
      fileWriteStream.on('finish', () => console.log('✅ Temp file write complete'));
      fileWriteStream.on('error', (err) => console.error('❌ Write stream error:', err));
    });
  
    bb.on('finish', async () => {
      console.log('🚀 Busboy finished reading form');
  
      if (!id_gen || !tempFilePath) {
        if (!responded) {
          responded = true;
          return res.status(200).json({ error: 'Missing id_gen or file' });
        }
        return;
      }
  
      fileWriteStream.on('finish', async () => {
        try {
          const imageDoc = await Image.findById(id_gen);
          if (!imageDoc) throw new Error('Image doc not found');
          const userId = imageDoc.userId;
          if (!userId) throw new Error('No userId in doc');
  
          const userFolder = path.join(uploadDir, userId.toString());
          if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
            console.log('📁 Created user folder =>', userFolder);
          }
  
          const finalPath = path.join(userFolder, `${id_gen}${fileExt}`);
          fs.renameSync(tempFilePath, finalPath);
          const relativePath = path.join(userId.toString(), `${id_gen}${fileExt}`).replace(/\\/g, '/');
  
          imageDoc.res_image = relativePath;
          imageDoc.status = 'ready';
          imageDoc.host_gen = fields.host_gen || null;
          imageDoc.time_gen = fields.time_gen || null;
          imageDoc.age = fields.age || null;
          imageDoc.gender = fields.gender || null;
          imageDoc.ethnicity = fields.ethnicity || null;
          await imageDoc.save();
  
          console.log(`✅ Updated doc => _id=${id_gen}, res_image=${relativePath}`);
  
          if (!responded) {
            responded = true;
            return res.json({
              message: 'Image saved and metadata updated',
              id_gen,
              path: relativePath,
            });
          }
        } catch (err) {
          console.error('❌ Error in webhook /gen/image:', err);
          if (!responded) {
            responded = true;
            return res.status(200).json({ error: err.message });
          }
        }
      });
    });
  
    bb.on('error', (err) => {
      console.error('❌ Busboy error:', err);
      if (!responded) {
        responded = true;
        res.status(200).json({ error: err.message });
      }
    });
  
    req.pipe(bb);
});


const deleteStaleImages = async () => {
    const tenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
    try {
      const staleImages = await Image.find({
        status: { $ne: 'ready' },
        createdAt: { $lt: tenMinutesAgo },
      });
  
      for (const img of staleImages) {
        const filePath = path.join(uploadDir, img.res_image || '');
  
        // Delete image file if it exists
        if (img.res_image && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted file: ${filePath}`);
        }
  
        // Delete the DB entry
        await Image.deleteOne({ _id: img._id });
        console.log(`🧹 Deleted stale image doc: ${img._id}`);
      }
  
      if (staleImages.length > 0) {
        console.log(`✅ Cleaned up ${staleImages.length} stale images`);
      }
    } catch (err) {
      console.error('❌ Error cleaning stale images:', err);
    }
};

/** Start server: connect once, then listen */
(async function startServer() {
  try {
    await connectDB();
    const port = PORT || 4000;

    app.listen(port, () => {

        console.log(`🚀 Server listening on port ${port}`);

        setInterval(deleteStaleImages, 15 * 60 * 1000); // every 5 min
        
        console.log("🧼 Stale image cleanup job started (runs every 15 min)");
    });
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
})();