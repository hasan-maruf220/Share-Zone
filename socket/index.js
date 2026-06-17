const supabase = require('../supabase/client');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join Room
    socket.on('join_room', async ({ room_id, username }) => {
      socket.join(room_id);
      console.log(`${username} joined room ${room_id}`);
      
      // Notify others in the room
      socket.to(room_id).emit('user_joined', { username });

      // Fetch message history for this room and send to the joining user
      try {
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', room_id)
          .order('timestamp', { ascending: true });

        if (!error && messages) {
          socket.emit('message_history', messages);
        }
      } catch (err) {
        console.error('Error fetching message history:', err);
      }
    });

    // Send Message
    socket.on('send_message', async ({ room_id, username, message }) => {
      try {
        // Save to database
        const { data, error } = await supabase
          .from('messages')
          .insert([
            { room_id, sender_name: username, message }
          ])
          .select()
          .single();

        if (error) throw error;

        // Broadcast to everyone in the room (including sender)
        io.to(room_id).emit('receive_message', data);
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    // File Uploaded (Client tells server a file was uploaded via REST, server broadcasts)
    socket.on('file_uploaded', ({ room_id, fileData }) => {
      // Broadcast file info to others in the room
      socket.to(room_id).emit('receive_file', fileData);
    });

    // Leave Room
    socket.on('leave_room', ({ room_id, username }) => {
      socket.leave(room_id);
      console.log(`${username} left room ${room_id}`);
      socket.to(room_id).emit('user_left', { username });
    });

    // Close Room (Server broadcasts that room is closed)
    socket.on('close_room', ({ room_id }) => {
      io.to(room_id).emit('room_closed');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
