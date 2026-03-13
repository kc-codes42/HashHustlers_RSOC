# HashHustlers_RSOC
Team HashHustlers Hackathon

# Code Sync

Real-Time Collaborative Code Editor with Live Execution and AI-Ready Architecture

---

## Overview

**Code Sync** is a real-time collaborative coding platform that allows multiple developers to write, edit, and execute code simultaneously from anywhere. The system synchronizes edits instantly across users, enabling seamless pair programming, remote technical interviews, collaborative debugging, and team-based development.

The platform integrates:

* real-time collaborative editing
* shared code execution
* multi-room collaboration
* authentication and user management
* cloud persistence
* extensible AI assistance architecture

Code Sync functions as a lightweight browser-based collaborative development environment.

---

## Key Features

### Real-Time Collaborative Editing

Multiple users can edit the same code file simultaneously with instant synchronization.

* conflict-free editing using CRDT
* collaborative cursor awareness
* shared document state
* room-based collaboration

---

### Live Code Execution

Users can execute code directly from the editor and view results in a shared terminal.

Supported languages:

* JavaScript
* Python
* C++
* Java

Execution output is visible to all collaborators in the room.

---

### Room-Based Collaboration

Users collaborate inside isolated coding rooms.

Capabilities:

* create new rooms
* join rooms via invite link
* participant tracking
* shared editing sessions

Example room URL:

```
/editor/ROOM_ID
```

---

### Authentication System

Users authenticate using Firebase Authentication.

Login credentials:

```
username
password
```

The username is internally mapped to:

```
username@collab.local
```

Each user profile contains:

```
uid
username
color
createdAt
```

User color is used for collaborative cursor identification.

---

### Collaborative Terminal

The integrated terminal panel displays:

* program output
* runtime errors
* compile errors
* execution logs

When one user runs code, the output is synchronized across all collaborators.

---

### Firebase Cloud Integration

The platform uses Firebase for:

* authentication
* room metadata storage
* participant tracking
* execution history

Firestore collections:

```
users
rooms
executions
documents
```

---

### Scalable Architecture

Code Sync separates responsibilities into clear system layers.

Frontend:
Next.js application containing the collaborative editor UI.

Collaboration Engine:
CRDT synchronization using Yjs over WebSocket.

Backend:
Node.js server responsible for execution APIs and collaboration services.

Database:
Firebase Firestore for metadata persistence.

---

## System Architecture

```
Users
   │
   ▼
Next.js Frontend
   │
   │ WebSocket (Yjs)
   ▼
Node.js Backend
   │
   ├── Code Execution Engine
   ├── Collaboration Server
   │
   ▼
Firebase Firestore
```

---

## Technology Stack

### Frontend

* Next.js
* React
* Monaco Editor
* TailwindCSS

### Collaboration

* Yjs CRDT
* WebSocket
* y-monaco binding

### Backend

* Node.js
* Express

### Database & Authentication

* Firebase Authentication
* Firebase Firestore

### Code Execution

* Local sandbox executor using Node child processes

---

## Project Structure

```
codesync/
│
├── client/
│   ├── Next.js frontend
│   ├── Monaco editor integration
│   ├── collaboration UI
│
├── server/
│   ├── Node backend
│   ├── code execution service
│   ├── collaboration server
│
├── lib/
│   ├── firebase config
│   ├── user utilities
│
└── docs/
```

---

## Installation

### Clone Repository

```
git clone https://github.com/your-repo/codesync
cd codesync
```

---

### Install Dependencies

Frontend:

```
cd client
npm install
```

Backend:

```
cd server
npm install
```

---

### Firebase Setup

1. Create a Firebase project.
2. Enable Authentication.
3. Enable Firestore database.
4. Add Firebase config to the frontend environment variables.

Example:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

---

### Run Development Environment

Start backend server:

```
node server/index.js
```

Start frontend:

```
npm run dev
```

Open application:

```
http://localhost:3000
```

---

## Usage

### Create Room

1. Open landing page.
2. Click **Create Room**.
3. Share the generated room link.

---

### Join Room

Enter a room ID or open an invite link.

Example:

```
/editor/abc123
```

---

### Run Code

1. Write code in the editor.
2. Select language.
3. Click **Run Code** or press **Ctrl + Enter**.
4. Output appears in the terminal panel.

---

## Security Considerations

The current implementation executes code using a local runtime environment for demonstration purposes.

In production systems, code execution should be sandboxed using:

* containerized environments
* resource limits
* isolated execution infrastructure

Possible production solutions:

* container sandbox systems
* virtual machine isolation
* remote execution workers

---

## Future Improvements

Planned extensions include:

AI code assistant
AI bug detection
AI code explanation
AI test generation
Git repository integration
file system support
multiple file projects
containerized execution environment

---

## Use Cases

Code Sync supports several development scenarios:

Pair programming
technical interviews
remote teaching
collaborative debugging
team coding sessions

---

## License

MIT License

---

## Project Name

**Code Sync**

Real-Time Collaborative Development Platform.

