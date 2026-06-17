document.addEventListener('DOMContentLoaded', async () => {
  // --- Initialization ---
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('id');
  const username = sessionStorage.getItem('username');
  const isCreator = sessionStorage.getItem('isCreator') === 'true';

  if (!roomId || !username) {
    window.location.href = '/';
    return;
  }

  // DOM Elements
  const roomIdDisplay = document.getElementById('roomIdDisplay');
  const roomIdBadge = document.getElementById('roomIdBadge');
  const closeRoomBtn = document.getElementById('closeRoomBtn');
  const leaveRoomBtn = document.getElementById('leaveRoomBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const filesList = document.getElementById('filesList');
  const filesEmptyState = document.getElementById('filesEmptyState');
  const toast = document.getElementById('toast');

  // Set UI
  roomIdDisplay.textContent = roomId;
  document.title = `Room ${roomId} | Sharing Zone`;
  if (isCreator) {
    closeRoomBtn.classList.remove('hidden');
  }

  const showToast = (msg, isError = true) => {
    toast.textContent = msg;
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    toast.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
    toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 5000);
  };

  // --- Verify Room Exists ---
  try {
    const res = await fetch(`/api/rooms/${roomId}`);
    if (!res.ok) throw new Error('Room is invalid or closed');
  } catch (err) {
    alert(err.message);
    window.location.href = '/';
    return;
  }

  // --- Socket.IO Setup ---
  const socket = io();

  socket.emit('join_room', { room_id: roomId, username });

  // --- Chat Logic ---
  const appendMessage = (data, type) => {
    const div = document.createElement('div');
    div.classList.add('message');
    
    if (type === 'system') {
      div.classList.add('system-message');
      div.textContent = data.message;
    } else {
      div.classList.add(data.sender_name === username ? 'self' : 'other');
      
      const time = new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      div.innerHTML = `
        <div class="message-meta">
          <span>${data.sender_name}</span>
          <span>${time}</span>
        </div>
        <div class="message-bubble">${escapeHTML(data.message)}</div>
      `;
    }
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const escapeHTML = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
      socket.emit('send_message', { room_id: roomId, username, message });
      messageInput.value = '';
    }
  });

  socket.on('receive_message', (data) => appendMessage(data, 'chat'));
  
  socket.on('user_joined', (data) => {
    appendMessage({ message: `${data.username} joined the room` }, 'system');
  });
  
  socket.on('user_left', (data) => {
    appendMessage({ message: `${data.username} left the room` }, 'system');
  });

  socket.on('message_history', (messages) => {
    messages.forEach(msg => appendMessage(msg, 'chat'));
  });

  socket.on('room_closed', () => {
    alert('The room creator has closed this room. All data has been deleted.');
    window.location.href = '/';
  });

  // --- File Upload Logic ---
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename, url) => {
    const ext = filename.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (imageExts.includes(ext)) {
      return `<div class="file-icon img-preview" style="background-image: url('${url}')"></div>`;
    }
    
    let svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
    
    if (['pdf'].includes(ext)) {
      svg = '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
    } else if (['zip'].includes(ext)) {
      svg = '<svg viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
    }
    
    return `<div class="file-icon">${svg}</div>`;
  };

  const appendFile = (file) => {
    const div = document.createElement('div');
    div.classList.add('file-item');
    div.innerHTML = `
      ${getFileIcon(file.file_name, file.file_url)}
      <div class="file-details">
        <div class="file-name" title="${file.file_name}">${file.file_name}</div>
        <div class="file-meta">${formatBytes(file.file_size)} • By ${file.uploaded_by}</div>
      </div>
      <a href="${file.file_url}" target="_blank" class="file-action" title="Download/View" download>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      </a>
    `;
    filesList.appendChild(div);
    if (filesEmptyState) {
      filesEmptyState.classList.add('hidden');
    }
  };

  const loadFiles = async () => {
    try {
      const res = await fetch(`/api/files/${roomId}`);
      const files = await res.json();
      if (res.ok) {
        filesList.innerHTML = '';
        if (filesEmptyState) {
          filesList.appendChild(filesEmptyState);
        }
        files.forEach(appendFile);
        if (filesEmptyState) {
          filesEmptyState.classList.toggle('hidden', files.length > 0);
        }
      }
    } catch (err) {
      console.error('Failed to load files', err);
    }
  };

  // Initial load
  loadFiles();

  socket.on('receive_file', (fileData) => {
    appendFile(fileData);
  });

  const handleUpload = async (file) => {
    if (!file) return;

    // Client-side validation
    if (file.size > 15 * 1024 * 1024) {
      return showToast('File too large. Max 15MB allowed.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('room_id', roomId);
    formData.append('username', username);

    try {
      loadingOverlay.classList.remove('hidden');
      loadingOverlay.querySelector('p').textContent = `Uploading ${file.name}...`;

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Append to self
      appendFile(data);
      
      // Notify others
      socket.emit('file_uploaded', { room_id: roomId, fileData: data });
      
      showToast('File uploaded successfully', false);
    } catch (err) {
      showToast(err.message);
    } finally {
      loadingOverlay.classList.add('hidden');
      fileInput.value = ''; // Reset input
    }
  };

  // Drag and Drop
  uploadZone.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    handleUpload(e.target.files[0]);
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  });

  // --- Room Controls ---
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      showToast('Room ID copied to clipboard!', false);
    });
  };

  roomIdBadge.addEventListener('click', copyRoomId);
  roomIdBadge.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      copyRoomId();
    }
  });

  leaveRoomBtn.addEventListener('click', () => {
    socket.emit('leave_room', { room_id: roomId, username });
    window.location.href = '/';
  });

  closeRoomBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to close this room? All messages and files will be permanently deleted.')) {
      try {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.querySelector('p').textContent = 'Deleting room data...';

        const res = await fetch(`/api/rooms/${roomId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to close room');
        }

        socket.emit('close_room', { room_id: roomId });
        window.location.href = '/';
      } catch (err) {
        loadingOverlay.classList.add('hidden');
        alert(err.message);
      }
    }
  });
});
