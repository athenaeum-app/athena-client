import { app } from 'electron'
import { CreateMainWindow } from './modules/Window'
import { setupApi } from './modules/IPCHandler'
import { SetupMenu } from './modules/Menu'
import { SetupSession } from './modules/Session'
import { registerProtocols } from './modules/Protocols'
import { attemptMigrateFile } from './modules/API'
import { startAutoUpdater } from './modules/Updater'

export const init = () => {
    setupApi()
    startAutoUpdater()

    attemptMigrateFile()

    registerProtocols()

    const lock = app.requestSingleInstanceLock()

    if (!lock) {
        app.quit()
        return
    }

    let mainWindow: Electron.BrowserWindow | null = null

    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show() // show() is useful on Linux/Fedora to ensure it's visible
            mainWindow.focus()
        }
    })

    app.whenReady().then(async () => {
        SetupMenu()
        SetupSession()
        mainWindow = await CreateMainWindow()
    })

    app.once('window-all-closed', () => {
        app.quit()
    })

    app.once('quit', () => process.exit(0))
}
