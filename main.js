const { app, BrowserWindow, utilityProcess } = require("electron");
const path = require("path");

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // load frontend
  mainWindow.loadFile(path.join(__dirname, "frontend", "dist", "index.html"));
}

app.whenReady().then(() => {
  let backendPath;

  if (app.isPackaged) {
    // In dist build → use unpacked backend
    backendPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "backend",
      "server.js"
    );
  } else {
    // In dev mode → use source backend
    backendPath = path.join(__dirname, "backend", "server.js");
  }

  backendProcess = utilityProcess.fork(backendPath, [], {
    cwd: path.dirname(backendPath),
    stdio: "inherit",
  });

  backendProcess.on("exit", (code) => {
    console.log("Backend exited with code:", code);
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
  if (backendProcess) backendProcess.kill();
});
