import { app } from 'electron'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
if (require('electron-squirrel-startup')) {
    app.quit()
}

import { init } from './main/dist/index.js'
console.log('Attempting to start app.')
init()
