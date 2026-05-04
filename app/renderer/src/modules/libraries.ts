import { batch, createEffect, createRoot } from 'solid-js'
import { reconcile, unwrap } from 'solid-js/store'
import { getApi } from './ipc_client'
import { version } from '../../../../package.json'
import { migrateOldData } from './data_migrate'
import { mergeLibraryData } from './sync'

import {
    archives,
    setArchives,
    allMoments,
    setAllMoments,
    allTags,
    setAllTags,
    linkPreviewCache,
    setLinkPreviewCache,
    jwtToken,
    libraries,
    setLibraries,
    setMediaFilters,
    setSelectedArchive,
    setSelectedTagIds,
    setSelectedURLFilters,
    defaultArchiveId,
    defaultArchiveName,
    type Library,
    type LibraryDataSnapshot,
    type DataSnapshot,
    type ArchiveId,
    type Archive,
    type MomentData,
    type TagId,
    type Tag,
    activeLibraryId,
    _setActiveLibraryId,
} from './store'

let allLibraryDataRef: Record<string, LibraryDataSnapshot> = {}
let isLoaded = false
let isInitialized = false

export const pushPayloadToServer = async (
    targetUrl: string,
    targetId: string,
    overrideToken?: string,
) => {
    const tokenToUse = overrideToken || jwtToken()

    const localPayload = {
        archives: archives(),
        moments: unwrap(allMoments),
        tags: unwrap(allTags),
        linkPreviewCache: linkPreviewCache(),
    }

    const fetchRes = await fetch(`${targetUrl}/api/library/${targetId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenToUse}` },
    })

    if (!fetchRes.ok && fetchRes.status !== 404) {
        throw new Error(`Failed to fetch server state (${fetchRes.status})`)
    }

    let payloadToPush = localPayload as LibraryDataSnapshot

    if (fetchRes.ok) {
        const serverData = await fetchRes.json()
        payloadToPush = mergeLibraryData(
            localPayload,
            serverData,
        ) as LibraryDataSnapshot

        // If this sync is happening on the library we are currently looking at,
        // instantly update the UI to see the new data
        if (activeLibraryId() === targetId) {
            batch(() => {
                setArchives(payloadToPush.archives)
                setAllMoments(reconcile(payloadToPush.moments))
                setAllTags(reconcile(payloadToPush.tags))
                setLinkPreviewCache(payloadToPush.linkPreviewCache)
            })
        }

        // Save the merged result
        allLibraryDataRef[targetId] = structuredClone(payloadToPush)
    }

    const res = await fetch(`${targetUrl}/api/library/${targetId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify(payloadToPush),
    })

    if (!res.ok) throw new Error(`Sync rejected by server (${res.status})`)
}

export const copyLibraryData = (sourceId: string, targetId: string) => {
    if (allLibraryDataRef[sourceId]) {
        // Only copy if the target doesn't already have data
        // This prevents the Publishing destroying newly merged data.
        if (!allLibraryDataRef[targetId]) {
            allLibraryDataRef[targetId] = structuredClone(
                allLibraryDataRef[sourceId],
            )
        }
    }
}

export const updateActiveLibrary = (updates: Partial<Library>) => {
    const currentId = activeLibraryId()
    if (!currentId) return

    setLibraries((prevLibs) =>
        prevLibs.map((lib) =>
            lib.id === currentId ? { ...lib, ...updates } : lib,
        ),
    )
}

export const deleteLibraryData = (libId: string) => {
    console.log(`Deleting library and data for ${libId}`)

    if (activeLibraryId() === libId) {
        isLoaded = false
        localStorage.removeItem('athena-jwt-token')
    }

    setLibraries((libs) => libs.filter((l) => l.id !== libId))

    if (allLibraryDataRef[libId]) {
        delete allLibraryDataRef[libId]
    }

    if (activeLibraryId() === libId) {
        const remaining = libraries()

        if (remaining.length > 0) {
            const nextId = remaining[0].id
            setActiveLibraryId(nextId)
            loadLibraryDataIntoState(nextId)
        } else {
            setActiveLibraryId('')
            batch(() => {
                setArchives({})
                setAllMoments({})
                setAllTags({})
                setLinkPreviewCache({})
                setSelectedArchive(defaultArchiveId)
                setSelectedTagIds([])
                setSelectedURLFilters([])
            })
        }
    }
}

export const getLibraryFromId = (libId: string) =>
    libraries().find((l) => l.id === libId)

export const getCurrentLibrary = () => getLibraryFromId(activeLibraryId())

const loadLibraryDataIntoState = async (libId: string) => {
    if (!libId) return
    isLoaded = false
    const currentLib = getLibraryFromId(libId)

    if (currentLib?.type === 'server' && jwtToken()) {
        const url = currentLib.url || 'http://localhost:8080'
        try {
            const res = await fetch(`${url}/api/library/${libId}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${jwtToken()}` },
            })
            if (res.ok) {
                const serverData: LibraryDataSnapshot = await res.json()
                allLibraryDataRef[libId] = serverData
            }
        } catch (e) {
            console.error('sync: failed to pull library data from server:', e)
        }
    }

    const raw = allLibraryDataRef[libId]
    const libData: LibraryDataSnapshot = raw
        ? structuredClone(raw)
        : { archives: {}, moments: {}, tags: {}, linkPreviewCache: {} }

    const newArchives = libData.archives as Record<ArchiveId, Archive>
    if (!newArchives[defaultArchiveId]) {
        newArchives[defaultArchiveId] = {
            uuid: defaultArchiveId,
            name: defaultArchiveName,
            momentsIds: [],
        }
    } else {
        newArchives[defaultArchiveId].name = defaultArchiveName
    }

    batch(() => {
        setArchives(newArchives)
        const moments = libData.moments as Record<string, MomentData>
        for (const moment of Object.values(moments)) {
            moment.timestamp = new Date(moment.timestamp)
        }
        setAllMoments(reconcile(moments))
        setAllTags(reconcile(libData.tags as Record<TagId, Tag>))
        setLinkPreviewCache(libData.linkPreviewCache ?? {})
        setSelectedArchive(defaultArchiveId)
        setSelectedTagIds([])
        setSelectedURLFilters([])
        setMediaFilters(reconcile({}))
    })

    isLoaded = true
}

// Boot loader
const loadData = async () => {
    isLoaded = false
    isInitialized = false
    const api = getApi()
    let rawData: DataSnapshot = {} as DataSnapshot

    if (api && api.readData) {
        const migratedData = await migrateOldData()
        rawData = migratedData ?? (await api.readData())
    }

    allLibraryDataRef = rawData.libraryData ?? {}
    const savedLibraries: Library[] = rawData.libraries ?? [
        { id: 'local-default', name: 'My Library', type: 'local' },
    ]
    setLibraries(savedLibraries)

    const savedActiveId = rawData.activeLibraryId ?? savedLibraries[0]?.id ?? ''
    setActiveLibraryId(savedActiveId)
    if (savedActiveId) loadLibraryDataIntoState(savedActiveId)

    isInitialized = true
}

loadData()

const createDebounce = (callback: (...args: any[]) => any, ms: number) => {
    let timer: number | undefined
    return (...args: any[]) => {
        if (timer) window.clearTimeout(timer)
        timer = window.setTimeout(() => callback(...args), ms)
    }
}

let lastSavedString = ''

const writeSave = createDebounce(async (snapshot: DataSnapshot) => {
    getApi()?.writeMainData?.(snapshot)

    const activeId = snapshot.activeLibraryId
    const activeLib = snapshot.libraries.find((l) => l.id === activeId)

    if (activeLib?.type === 'server' && jwtToken()) {
        const targetUrl = activeLib.url || 'http://localhost:8080'
        try {
            const newTime = new Date().toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            })
            updateActiveLibrary({
                syncStatus: 'syncing',
                lastSyncTime: newTime,
            })
            await Promise.all([
                pushPayloadToServer(targetUrl, activeId),
                new Promise((resolve) => setTimeout(resolve, 500)),
            ])
            updateActiveLibrary({
                syncStatus: 'synced',
                lastSyncTime: newTime,
            })
        } catch (e: any) {
            if (
                e.message?.toLowerCase().includes('fetch') ||
                e.message?.toLowerCase().includes('network')
            ) {
                updateActiveLibrary({
                    syncStatus: 'offline',
                })
            } else {
                updateActiveLibrary({
                    syncStatus: 'conflict',
                })
            }
        }
    }
}, 750)

createRoot(() => {
    createEffect(() => {
        const currentLibs = libraries()
        const currentId = activeLibraryId()
        const currentArchives = archives()
        const currentCache = linkPreviewCache()

        // Track internal changes
        JSON.stringify(unwrap(allMoments))
        JSON.stringify(unwrap(allTags))

        if (!isLoaded) return

        if (currentId) {
            allLibraryDataRef[currentId] = {
                archives: currentArchives,
                moments: structuredClone(unwrap(allMoments)),
                tags: structuredClone(unwrap(allTags)),
                linkPreviewCache: currentCache,
            }
        }

        const cleanedLibraryData: Record<string, LibraryDataSnapshot> = {}
        currentLibs.forEach((lib) => {
            if (allLibraryDataRef[lib.id]) {
                cleanedLibraryData[lib.id] = allLibraryDataRef[lib.id]
            }
        })

        const libsForSave = currentLibs.map((lib) => {
            const { syncStatus, lastSyncTime, ...cleanLib } = lib
            return cleanLib
        })

        const snapshot: DataSnapshot = {
            version,
            libraries: libsForSave,
            activeLibraryId: currentId,
            libraryData: cleanedLibraryData,
        }

        const asString = JSON.stringify(snapshot)
        if (asString === lastSavedString) return
        lastSavedString = asString
        writeSave(snapshot)
    })
})

export const setActiveLibraryId = (newId: string) => {
    const currentId = activeLibraryId()
    if (newId === currentId) return

    if (currentId && isLoaded) {
        allLibraryDataRef[currentId] = {
            archives: archives(),
            moments: structuredClone(unwrap(allMoments)),
            tags: structuredClone(unwrap(allTags)),
            linkPreviewCache: linkPreviewCache(),
        }
    }

    isLoaded = false
    _setActiveLibraryId(newId)
    if (isInitialized && newId) loadLibraryDataIntoState(newId)
}

export const initializeNewLibrary = (libId: string) => {
    if (allLibraryDataRef[libId]) return
    allLibraryDataRef[libId] = {
        archives: {
            [defaultArchiveId]: {
                uuid: defaultArchiveId,
                name: defaultArchiveName,
                momentsIds: [],
            },
        } as Record<ArchiveId, Archive>,
        moments: {},
        tags: {},
        linkPreviewCache: {},
    }
}
