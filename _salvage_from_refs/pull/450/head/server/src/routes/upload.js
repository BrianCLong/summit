const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { ensureAuthenticated } = require('../middleware/auth');
const { getNeo4jDriver } = require('../config/database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || ''
    }
  });
}

router.post('/image', ensureAuthenticated, upload.single('file'), async (req, res) => {
  const { entityId } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const s3 = getS3Client();
    const key = `images/${uuidv4()}-${req.file.originalname}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));
    const baseUrl = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT;
    const url = `${baseUrl}/${process.env.S3_BUCKET}/${key}`;

    if (entityId) {
      const driver = getNeo4jDriver();
      const session = driver.session();
      try {
        await session.run(
          'MATCH (e:Entity {uuid: $id}) SET e.properties = coalesce(e.properties, {}) + {imageUrl: $url}, e.updatedAt = datetime() RETURN e',
          { id: entityId, url }
        );
      } finally {
        await session.close();
      }
    }

    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
