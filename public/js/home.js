document.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('username');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const roomIdInput = document.getElementById('roomIdInput');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const errorMsg = document.getElementById('errorMsg');

  // Load saved username if exists
  const savedUsername = sessionStorage.getItem('username');
  if (savedUsername) {
    usernameInput.value = savedUsername;
  }

  const showError = (msg) => {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    setTimeout(() => errorMsg.classList.add('hidden'), 5000);
  };

  const getUsername = () => {
    const username = usernameInput.value.trim();
    if (!username) {
      showError('Please enter your name first');
      return null;
    }
    sessionStorage.setItem('username', username);
    return username;
  };

  // Create Room
  createRoomBtn.addEventListener('click', async () => {
    const username = getUsername();
    if (!username) return;

    try {
      createRoomBtn.disabled = true;
      createRoomBtn.textContent = 'Creating...';

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to create room');

      // Set flag that this user is the creator
      sessionStorage.setItem('isCreator', 'true');
      
      // Redirect to room
      window.location.href = `/room.html?id=${data.room_id}`;
    } catch (error) {
      showError(error.message);
      createRoomBtn.disabled = false;
      createRoomBtn.textContent = 'Create Room';
    }
  });

  // Join Room
  joinRoomBtn.addEventListener('click', async () => {
    const username = getUsername();
    if (!username) return;

    const roomId = roomIdInput.value.trim();
    if (!roomId) {
      showError('Please enter a Room ID');
      return;
    }

    try {
      joinRoomBtn.disabled = true;
      joinRoomBtn.textContent = 'Joining...';

      // Verify room exists and is active
      const response = await fetch(`/api/rooms/${roomId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to join room');

      // Set flag that this user is NOT the creator (unless they actually are, but this is a simple check)
      // If they are re-joining their own room, we assume they didn't close it, but usually creator stays in the room.
      // For simplicity, joining via code means you're a participant.
      sessionStorage.setItem('isCreator', 'false');

      // Redirect to room
      window.location.href = `/room.html?id=${roomId}`;
    } catch (error) {
      showError(error.message);
      joinRoomBtn.disabled = false;
      joinRoomBtn.textContent = 'Join';
    }
  });
});
