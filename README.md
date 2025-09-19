# Optique Pro App 👓

An Electron + React + Vite + SQLite desktop application for managing optical shop operations.  
Built with **Electron**, **React (Vite)**, and **SQLite (better-sqlite3 / bcrypt for auth)**.

---

## 🚀 Features

- Cross-platform desktop app (Windows, macOS, Linux)
- Secure authentication (bcrypt password hashing)
- Local SQLite database (fast + portable)
- Electron backend with Express API
- React + Vite frontend (modern, fast)

---

## 📦 Requirements

- [Node.js](https://nodejs.org/) **v18+**
- [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/)  
  _(Windows only, required for native modules like `better-sqlite3` / `bcrypt`)_
- Git

---

## ⚙️ Setup & Installation

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/OpticienPro_app.git
cd OpticienPro_app
```

### 2. Install dependencies

From the root folder ( it will include the backend dependencies also):

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

### 3. Development Run

Start Electron app(it will start frontend and backend):

```bash
cd ..
npm run dev
```

---

if you want just backend :

```bash
cd ..
npm run dev:backend
```

---

if you want just frontend :

```bash
cd ..
npm run dev:frontend
```

---


### 🏗 Build Production App

Build the frontend:

```bash
cd frontend
npm run build
```

Package the Electron app:

```bash
cd ..
npm run dist
```

👉 The installer/executable will be available inside the `dist/` folder.

---

## 📂 Project Structure

```bash
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
│── .gitignore
│── README.md
```

---

## 🛠 Tech Stack

* **Electron** → Desktop runtime
* **React + Vite** → Frontend
* **Express** → Backend API
* **SQLite (better-sqlite3)** → Local database
* **bcrypt** → Password hashing

---

## 💡 Notes

* Before packaging, always run:

```bash
cd frontend && npm run build
```

* On Windows, native modules (`better-sqlite3`, `bcrypt`) require **Visual Studio 2022 Build Tools**.
* Database (`app.db`) is created automatically if it does not exist.

---

## 📜 License

MIT License © 2025 Ibrahim Zaryouh
