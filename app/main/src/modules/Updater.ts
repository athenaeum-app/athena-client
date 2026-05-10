import { app, autoUpdater } from 'electron'
import { updateElectronApp, UpdateSourceType } from 'update-electron-app'

export const startAutoUpdater = () => {
    if (!app.isPackaged) {
        console.log('Skipping auto-updater in development mode.')
        return
    }

    const server = 'https://update.electronjs.org'
    const feedUrl = `${server}/athenaeum-app/athena-client/${process.platform}-${process.arch}/${app.getVersion()}`

    try {
        autoUpdater.setFeedURL({ url: feedUrl })
        console.log('Succesfully set feed URL:', feedUrl)
    } catch (err) {
        console.error('Failed to set feed URL:', err)
    }

    autoUpdater.on('error', (error) => {
        console.error('Update Error:', error)
    })

    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...')
    })

    autoUpdater.on('update-available', () => {
        console.log('Update available!')
    })

    autoUpdater.on('update-not-available', () => {
        console.log('Update not available. Current version:')
    })

    updateElectronApp({
        updateSource: {
            type: UpdateSourceType.ElectronPublicUpdateService,
            repo: 'athenaeum-app/athena-client',
        },
        logger: console,
    })

    console.log('Auto updater started!')
}
