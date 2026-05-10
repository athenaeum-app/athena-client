import { version } from '../../../../package.json'
import { createEffect, createRoot, createSignal } from 'solid-js'
import { migrateOldData } from './data_migrate'
import {
    allLibraryDataRef,
    canSave,
    loadSystemFonts,
    setAllLibraryDataRef,
    setAppSettings,
    setCanSave,
} from './globals'
import { getApi } from './ipc_client'
import { setActiveLibraryId, switchToLibraryFromId } from './libraries'
import {
    activeLibraryId,
    allMoments,
    allTags,
    archives,
    libraries,
    linkPreviewCache,
    setLibraries,
    setLinkPreviewCache,
    type DataSnapshot,
    type Library,
    type LibraryDataSnapshot,
} from './store'
import { defaultSettings } from './settings'
import { unwrap } from 'solid-js/store'
import { trackStore } from '@solid-primitives/deep'
export let [isInitialized, setIsInitialized] = createSignal(false)

export const createDebounce = (
    callback: (...args: any[]) => any,
    ms: number,
) => {
    let timer: number | undefined
    return (...args: any[]) => {
        if (timer) window.clearTimeout(timer)
        timer = window.setTimeout(() => callback(...args), ms)
    }
}

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

// Auto-save
createRoot(() => {
    let lastSavedString = ''
    createEffect(() => {
        const currentLibs = libraries()
        const currentId = activeLibraryId()
        const currentArchives = archives()
        const currentCache = unwrap(linkPreviewCache)

        trackStore(allMoments)
        trackStore(allTags)
        trackStore(linkPreviewCache)

        if (!canSave()) return

        if (currentId) {
            allLibraryDataRef()[currentId] = {
                archives: currentArchives,
                moments: structuredClone(unwrap(allMoments)),
                tags: structuredClone(unwrap(allTags)),
            }
        }

        const cleanedLibraryData: Record<string, LibraryDataSnapshot> = {}
        currentLibs.forEach((lib) => {
            if (allLibraryDataRef()[lib.id]) {
                cleanedLibraryData[lib.id] = allLibraryDataRef()[lib.id]
            }
        })

        const libsForSave = currentLibs.map((lib) => {
            const { syncStatus: _, lastSyncTime: __, ...cleanLib } = lib
            return cleanLib
        })

        const snapshot: DataSnapshot = {
            version,
            libraries: libsForSave,
            activeLibraryId: currentId,
            libraryData: cleanedLibraryData,
            linkPreviewCache: currentCache,
        }

        const asString = JSON.stringify(snapshot)
        if (asString === lastSavedString) return
        lastSavedString = asString
        writeSave(snapshot)
    })
})

const writeSave = createDebounce(async (snapshot: DataSnapshot) => {
    getApi()?.writeMainData?.(snapshot)
}, 750)
