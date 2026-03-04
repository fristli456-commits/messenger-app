import { app, BrowserWindow } from "electron"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "build/icon.ico"), // ← вот сюда
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  win.loadFile(path.join(__dirname, "dist", "index.html"))
  win.setMenu(null)
}

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})