# Antigravity Room - Secure File Sharing & Chat

A real-time, lightweight web application for creating temporary workspaces. Users can chat and share files. When the room creator closes the room, all data (messages, file metadata, and physical files) is permanently destroyed from the Supabase database and storage bucket.

## Prerequisites

1. **Node.js** (v18+)
2. A **Supabase** account (Free tier is perfect)

## Supabase Setup Instructions

1. **Create a Project**: Go to [Supabase](https://supabase.com) and create a new project.
2. **Run the Schema**: 
   - Go to the **SQL Editor** in your Supabase dashboard.
   - Open `supabase/schema.sql` from this project repository.
   - Copy the contents, paste it into the SQL Editor, and hit **Run**. This will create the `rooms`, `messages`, and `files` tables.
3. **Create a Storage Bucket**:
   - Go to **Storage** in the left sidebar.
   - Click **New Bucket**.
   - Name it exactly: `room-files`
   - Toggle **Public bucket** to **ON**. (For this project, we are relying on unpredictable file names and room deletion for security, rather than complex Row Level Security).
4. **Get your Credentials**:
   - Go to **Project Settings** (the gear icon) > **API**.
   - Copy the `Project URL`.
   - Copy the `service_role` secret key. (Do not use the `anon` public key, as our backend needs admin rights to delete files across the bucket).

## Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in your Supabase URL and Service Role Key:
     ```env
     PORT=3000
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_SERVICE_KEY=your-service-role-secret-key
     ```

3. **Run the Application**:
   ```bash
   npm start
   ```
   (Or use `npm run dev` to start with nodemon for auto-reloading).

4. **Open in Browser**:
   Navigate to `http://localhost:3000`

## Features & Limits
- **File Types**: Allows Images, PDF, DOCX, PPTX, TXT, and ZIP.
- **Video Restriction**: Video formats (mp4, mkv, etc.) are blocked by the middleware.
- **File Size**: Maximum 15MB per file.
- **Auto-Deletion**: Closing a room via the UI immediately deletes the room row, cascading to messages/files in the database, and triggering the backend to wipe the folder from the storage bucket.
