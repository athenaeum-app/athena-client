// src/App.tsx
import { onMount, Show, createEffect, type Component } from 'solid-js'
import './App.css'
import './index.css'
import { Line } from './components/Line'
import { TagBar } from './components/TagBar'
import Display from './components/Display'
import { Modals } from './components/Modals'
import './modules/pdfjs'
import { activeLibraryId } from './modules/store'
import { initShortcuts } from './modules/shortcuts'
import { appSettings, appVersion } from './modules/globals'
import { loadData } from './modules/boot'

const App: Component = () => {
    onMount(() => {
        initShortcuts()
        loadData()
    })

    createEffect(() => {
        const settings = appSettings()
        const root = document.documentElement

        root.style.fontFamily = settings.fontFamily
        root.setAttribute('data-theme', settings.activeTheme)
        root.style.fontSize = `${settings.uiScale}%`

        if (!settings.enableTransitions) {
            root.classList.add('disable-animations')
        } else {
            root.classList.remove('disable-animations')
        }
    })

    return (
        <div>
            <Modals />
            <div class="bg-background text-main flex h-screen flex-col">
                <header
                    style="-webkit-app-region: drag"
                    class="bg-element m-0 flex shrink-0 items-center justify-center py-2"
                >
                    <h1 class="text-2xl font-black tracking-tight">
                        Athena v{appVersion}
                        {`${import.meta.env.DEV ? ' [DEV BUILD]' : ' '}`}
                    </h1>
                </header>
                <Line class="bg-element-accent h-0.5 w-full" />
                <Show when={activeLibraryId()}>
                    <TagBar />
                </Show>
                <div class="flex flex-1 justify-center overflow-hidden pt-6">
                    <div class="h-full w-[95%]">
                        <Display />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
