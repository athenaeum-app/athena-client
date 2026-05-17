import { batch } from 'solid-js'
import { reconcile, unwrap } from 'solid-js/store'

import {
    archives,
    setArchives,
    allMoments,
    setAllMoments,
    allTags,
    setAllTags,
    allMessages,
    setAllMessages,
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
    type ArchiveId,
    type Archive,
    type MomentData,
    type TagId,
    type Tag,
    activeLibraryId,
    _setActiveLibraryId,
    setSwitchingLibrary,
    serverDownloadLibName,
    setIsDownloadingServer,
    type LibraryType,
} from './store'
import { isInitialized } from './boot'
import { allLibraryDataRef, canSave, setCanSave } from './globals'

export const copyLibraryData = (sourceId: string, targetId: string) => {
    if (allLibraryDataRef()[sourceId]) {
        if (!allLibraryDataRef()[targetId]) {
            allLibraryDataRef()[targetId] = structuredClone(
                allLibraryDataRef()[sourceId],
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

export const downloadNewLibrary = () => {
    const newId = crypto.randomUUID()
    const name = serverDownloadLibName().trim() || 'Downloaded Server'

    setIsDownloadingServer(true)

    try {
        const newLib: Library = {
            id: newId,
            name: name,
            type: 'local' as LibraryType,
            messages: [],
        }

        const currentData = allLibraryDataRef()[activeLibraryId()]
        if (currentData) {
            allLibraryDataRef()[newId] = structuredClone(currentData)
        }

        batch(() => {
            setLibraries([...libraries(), newLib])
            setActiveLibraryId(newId)
        })
    } catch (err) {
        console.error('Failed to create local copy:', err)
    } finally {
        setIsDownloadingServer(false)
    }
}

export const deleteLibraryData = (libId: string) => {
    console.log(`Deleting library and data for ${libId}`)

    if (activeLibraryId() === libId) {
        setCanSave(false)
        localStorage.removeItem('athena-jwt-token')
    }

    setLibraries((libs) => libs.filter((l) => l.id !== libId))

    if (allLibraryDataRef()[libId]) {
        delete allLibraryDataRef()[libId]
    }

    if (activeLibraryId() === libId) {
        const remaining = libraries()

        if (remaining.length > 0) {
            const nextId = remaining[0].id
            setActiveLibraryId(nextId)
            switchToLibraryFromId(nextId)
        } else {
            setActiveLibraryId('')
            batch(() => {
                setArchives({})
                setAllMoments({})
                setAllTags({})
                setAllMessages([])
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

export const switchToLibraryFromId = async (libId: string) => {
    try {
        if (!libId) return
        setSwitchingLibrary(true)
        setCanSave(false)
        const currentLib = getLibraryFromId(libId)
        console.log(currentLib)

        let localCache = allLibraryDataRef()[libId]
        if (!localCache) {
            localCache = {
                archives: {},
                moments: {},
                tags: {},
                messages: [],
            } as LibraryDataSnapshot
        }

        // Pull from Server on load
        if (currentLib?.type === 'server' && jwtToken()) {
            const url = currentLib.url || 'http://localhost:8080'
            let isOffline = false
            try {
                console.log('Attempting health check')
                const res = await fetch(`${url}/api/health`)
                console.log('Health fetched')
                if (!res.ok) {
                    isOffline = true
                }
            } catch (e) {
                console.error('sync: failed to check server health:', e)
                isOffline = true
            }

            if (isOffline) {
                console.log('Server is offline!')
                updateActiveLibrary({
                    syncStatus: 'offline',
                })
            } else {
                try {
                    console.log('Attempting fetch')

                    const res = await fetch(`${url}/api/library`, {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${jwtToken()}` },
                    })

                    console.log('Fetch completed')

                    if (res.ok) {
                        const serverData: LibraryDataSnapshot = await res.json()

                        try {
                            console.log('Attempting buffer fetch')
                            const bufRes = await fetch(`${url}/api/buffer`, {
                                headers: {
                                    Authorization: `Bearer ${jwtToken()}`,
                                },
                            })

                            console.log('Buffer fetch completed')
                            serverData.messages = bufRes.ok
                                ? await bufRes.json()
                                : localCache.messages || []
                        } catch (err) {
                            serverData.messages = localCache.messages || []
                        }

                        localCache = serverData
                    }
                } catch (e) {
                    console.error(
                        'sync: failed to pull library data from server:',
                        e,
                    )
                }
            }
        }

        console.log('Stage 2')

        allLibraryDataRef()[libId] = localCache
        const libData = structuredClone(localCache)

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

        // If swapped to another server, abort
        if (activeLibraryId() !== libId) {
            console.log('Server mismatch! No longer overriding data.')
            return
        } else {
            batch(() => {
                console.log('Received data from server', libData)
                setArchives(newArchives)
                const moments = libData.moments as Record<string, MomentData>
                for (const moment of Object.values(moments)) {
                    if (
                        typeof moment.timestamp === 'string' ||
                        typeof moment.timestamp === 'number'
                    ) {
                        moment.timestamp = new Date(moment.timestamp)
                    }
                }
                setAllMoments(reconcile(moments))
                setAllTags(reconcile(libData.tags as Record<TagId, Tag>))

                setAllMessages(reconcile(libData.messages || []))

                setSelectedArchive(defaultArchiveId)
                setSelectedTagIds([])
                setSelectedURLFilters([])
                setMediaFilters(reconcile({}))
            })
        }

        setCanSave(true)
    } finally {
        console.log('Finished swap!')
        setSwitchingLibrary(false)
    }
}

export const setActiveLibraryId = (newId: string) => {
    const currentId = activeLibraryId()
    if (newId === currentId) return

    if (currentId && canSave()) {
        allLibraryDataRef()[currentId] = {
            archives: archives(),
            moments: structuredClone(unwrap(allMoments)),
            tags: structuredClone(unwrap(allTags)),

            messages: structuredClone(unwrap(allMessages)),
        }
    }

    setCanSave(false)
    _setActiveLibraryId(newId)
    if (isInitialized() && newId) switchToLibraryFromId(newId)
}

export const initializeNewLibrary = (libId: string) => {
    if (allLibraryDataRef()[libId]) return
    allLibraryDataRef()[libId] = {
        archives: {
            [defaultArchiveId]: {
                uuid: defaultArchiveId,
                name: defaultArchiveName,
                momentsIds: [],
            },
        } as Record<ArchiveId, Archive>,
        moments: {},
        tags: {},
        messages: [],
    }
}
