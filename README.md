Optique Pro App 👓
An Electron + React + Vite + SQLite desktop application for managing optical shop operations.
Built with Electron, React (Vite), and SQLite (better-sqlite3 / bcrypt for auth).

🚀 Features
Cross-platform desktop app (Windows, macOS, Linux)

Secure authentication (bcrypt password hashing)

Local SQLite database (fast + portable)

Electron backend with Express API

React + Vite frontend (modern, fast)

📦 Requirements
Node.js v18+

Visual Studio 2022 Build Tools (Windows only, for native modules like better-sqlite3 / bcrypt)

Git

⚙️ Setup & Installation
1. Clone the repo
bash
git clone https://github.com/YOUR_USERNAME/optique-pro-app.git
cd optique-pro-app
2. Install dependencies
From the root folder:


npm install
Install frontend dependencies:


cd frontend
npm install
Install backend dependencies:


cd ../backend
npm install

3. Development Run
Start frontend (React + Vite):


cd frontend
npm run dev
Start backend (Express + SQLite):


cd ../backend
node server.js
Start Electron app:

bash
cd ..
npm run electron:dev
🏗 Build Production App
Build the frontend:


cd frontend
npm run build
Package the Electron app:


cd ..
npm run dist
The installer/executable will be available inside the dist/ folder.

📂 Project Structure

optique-pro-app/
│── backend/          # Express API + SQLite DB
│   ├── server.js
│   ├── db.js
│   ├── auth.js
│   └── app.db
│
│── frontend/         # React (Vite) UI
│   ├── src/
│   ├── public/
│   └── dist/
│
│── dist/             # Auto-generated (Electron builds here)
│── main.js           # Electron entry
│── preload.js        # Electron preload
│── package.json
│── vite.config.ts    # Frontend config
│── .gitignore
│── README.md
🛠 Tech Stack
Electron → Desktop runtime

React + Vite → Frontend

Express → Backend API

SQLite (better-sqlite3) → Local database

bcrypt → Password hashing

💡 Notes
Before packaging, always run:


cd frontend && npm run build
On Windows, native modules (better-sqlite3, bcrypt) require Visual Studio 2022 Build Tools.

Database (app.db) is created automatically if it does not exist.

📜 License
MIT License © 2025 Ibrahim Zaryouh
