const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase/client');
const validateFile = require('../middleware/validateFile');
const path = require('path');

// Configure multer to use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size (handled by multer as well)
  }
});

// Upload File
router.post('/upload', upload.single('file'), validateFile, async (req, res) => {
  try {
    const { room_id, username } = req.body;
    const file = req.file;

    if (!room_id || !username) {
      return res.status(400).json({ error: 'room_id and username are required' });
    }

    // Generate unique filename to prevent collisions
    const ext = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${ext}`;
    const filePath = `rooms/${room_id}/${uniqueFilename}`;

    // 1. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('room-files')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (storageError) throw storageError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('room-files')
      .getPublicUrl(filePath);

    // 2. Save metadata to database
    const { data: dbData, error: dbError } = await supabase
      .from('files')
      .insert([
        {
          room_id,
          file_name: file.originalname,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: username
        }
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    // The Socket.IO server will broadcast this to the room
    res.status(201).json(dbData);
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
});

// Get Files for a Room
router.get('/:room_id', async (req, res) => {
  try {
    const { room_id } = req.params;

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('room_id', room_id)
      .order('uploaded_at', { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
