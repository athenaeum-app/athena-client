import { app, session } from 'electron'
import { CreateWindow as CreateMainWindow } from './modules/Window'
import { handleApi as setupApi } from './modules/IPCHandler'
import { SetupMenu } from './modules/Menu'
import { SetupSession } from './modules/Session'
import { registerProtocols } from './modules/Protocols'

export const init = () => {
    console.log('Waiting for app ready...')

    registerProtocols()
    setupApi()

    app.setName('athena')
    app.setAppLogsPath()

    app.whenReady().then(() => {
        console.log('App ready!')
        SetupMenu()
        SetupSession()
        CreateMainWindow()
    })

    app.once('window-all-closed', () => {
        app.quit()
    })

    app.once('quit', () => process.exit(0))
}
