import { createSignal } from 'solid-js'
import { migrateOldData } from './data_migrate'
import {
    loadSystemFonts,
    setAllLibraryDataRef,
    setAppSettings,
    setCanSave,
} from './globals'
import { getApi } from './ipc_client'
import { setActiveLibraryId, switchToLibraryFromId } from './libraries'
import {
    setLibraries,
    setLinkPreviewCache,
    type DataSnapshot,
    type Library,
} from './store'
import { defaultSettings } from './settings'
export let [isInitialized, setIsInitialized] = createSignal(false)

// Boot loader
export const loadData = async () => {
    setCanSave(false)
    setIsInitialized(false)
    const api = getApi()
    let rawData: DataSnapshot = {} as DataSnapshot

    if (api) {
        if (api.readSettings) {
            try {
                const savedSettings = await api.readSettings()
                setAppSettings({ ...defaultSettings, ...savedSettings })
            } catch (error) {
                console.warn(
                    'Could not load settings, falling back to defaults:',
                    error,
                )
            }
        }

        if (api.readData) {
            const migratedData = await migrateOldData()
            const readData = await api.readData()
            rawData = migratedData ?? readData
        }
    }

    const loadedCache = rawData.linkPreviewCache ?? {}
    setLinkPreviewCache(loadedCache)

    setAllLibraryDataRef(rawData.libraryData ?? {})
    const savedLibraries: Library[] = rawData.libraries ?? [
        { id: 'local-default', name: 'My Library', type: 'local' },
    ]
    setLibraries(savedLibraries)

    const savedActiveId = rawData.activeLibraryId ?? savedLibraries[0]?.id ?? ''
    setActiveLibraryId(savedActiveId)
    if (savedActiveId) switchToLibraryFromId(savedActiveId)

    await loadSystemFonts()

    setIsInitialized(true)
}
