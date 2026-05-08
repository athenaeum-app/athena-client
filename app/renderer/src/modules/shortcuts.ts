import { dialog, Menu, MenuItem } from 'electron'
import process from 'node:process'

const menu = new Menu()

if (process.platform === 'darwin') {
    const appMenu = new MenuItem({ role: 'appMenu' })
    menu.append(appMenu)
}

const submenu = Menu.buildFromTemplate([
    {
        label: 'Open a Dialog',
        click: () => dialog.showMessageBox({ message: 'Hello World!' }),
        accelerator: 'CommandOrControl+Alt+R',
    },
])
menu.append(new MenuItem({ label: 'Custom Menu', submenu }))

Menu.setApplicationMenu(menu)
