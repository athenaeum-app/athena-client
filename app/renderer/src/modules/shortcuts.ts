const { app, BrowserWindow } = require('electron/main')

app.whenReady().then(() => {
    const win = new BrowserWindow()

    win.loadFile('index.html')
    win.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.key.toLowerCase() === 'i') {
            console.log('Pressed Control+I')
            event.preventDefault()
        }
    })
})
