const express = require('express');
const router = express.Router();
const { customAlphabet } = require('nanoid');
const supabase = require('../supabase/client');

// Generate 6-character alphanumeric room ID
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

// Create Room
router.post('/', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required to create a room' });
    }

    const roomId = nanoid();

    const { data, error } = await supabase
      .from('rooms')
      .insert([
        { room_id: roomId, created_by: username, status: 'active' }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Room
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return res.status(404).json({ error: 'Room not found' });
      }
      throw error;
    }

    if (data.status !== 'active') {
      return res.status(404).json({ error: 'Room is closed' });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close Room (Delete all data)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    // 1. Verify room exists and user is creator
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('created_by')
      .eq('room_id', id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.created_by !== username) {
      return res.status(403).json({ error: 'Only the room creator can close the room' });
    }

    // 2. Delete files from Supabase Storage
    const { data: files, error: filesError } = await supabase.storage
      .from('room-files')
      .list(`rooms/${id}`);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `rooms/${id}/${f.name}`);
      const { error: deleteStorageError } = await supabase.storage
        .from('room-files')
        .remove(filePaths);
      
      if (deleteStorageError) {
        console.error('Error deleting files from storage:', deleteStorageError);
      }
    }

    // 3. Delete room from database (Cascades to messages and files tables)
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .eq('room_id', id);

    if (deleteError) throw deleteError;

    res.status(200).json({ message: 'Room and all associated data deleted successfully' });
  } catch (err) {
    console.error('Error closing room:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
