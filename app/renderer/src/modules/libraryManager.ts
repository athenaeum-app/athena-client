import { batch, createEffect, createRoot, createSignal } from 'solid-js'
import { reconcile, unwrap } from 'solid-js/store'
import { getApi } from './ipc_client'
import { version } from '../../../../package.json'
import { migrateOldData } from './data_migrate'
import {
    archives,
    setArchives,
    allMoments,
    setAllMoments,
    allTags,
    setAllTags,
    linkPreviewCache,
    setLinkPreviewCache,
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
} from './store'

const LOG = '-'.repeat(25)

// Internals

// Deep-cloned snapshots for every known library.
// Don't store raw unwrap() references here always use structuredClone().
let allLibraryDataRef: Record<string, LibraryDataSnapshot> = {}

let isLoaded = false

let isInitialized = false

// Active library signal (use setActiveLibraryId publicly)
const [_activeLibraryId, _setActiveLibraryId] = createSignal<string>('')

// Public read-only accessor for the active library ID
export const activeLibraryId = _activeLibraryId

// Library data loader
const loadLibraryDataIntoState = (libId: string) => {
    isLoaded = false

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
    console.log(`Library "${libId}" loaded into state.`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot loader
// ─────────────────────────────────────────────────────────────────────────────

const loadData = async () => {
    isLoaded = false
    isInitialized = false

    const migratedData = await migrateOldData()
    const rawData: DataSnapshot = migratedData ?? (await getApi().readData())

    console.log(LOG)
    console.log('Loading data:', rawData)

    allLibraryDataRef = rawData.libraryData ?? {}

    const savedLibraries: Library[] = rawData.libraries ?? [
        { id: 'local-default', name: 'My Library', type: 'local' },
    ]
    setLibraries(savedLibraries)

    const savedActiveId =
        rawData.activeLibraryId ?? savedLibraries[0]?.id ?? 'local-default'

    if (!allLibraryDataRef[savedActiveId]) {
        allLibraryDataRef[savedActiveId] = {
            archives: {},
            moments: {},
            tags: {},
            linkPreviewCache: {},
        }
    }

    _setActiveLibraryId(savedActiveId)
    loadLibraryDataIntoState(savedActiveId)

    isInitialized = true
    console.log('App fully loaded!')
    console.log(LOG)
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

const writeSave = createDebounce((snapshot: DataSnapshot) => {
    getApi().writeMainData(snapshot)
    console.log('Saved Data!')
}, 250)

// Auto-saver
createRoot(() => {
    createEffect(() => {
        const currentLibs = libraries()
        const currentId = _activeLibraryId()
        const currentArchives = archives()
        const currentCache = linkPreviewCache()

        JSON.stringify(unwrap(allMoments))
        JSON.stringify(unwrap(allTags))

        if (!isLoaded) return

        allLibraryDataRef[currentId] = {
            archives: currentArchives,
            moments: structuredClone(unwrap(allMoments)),
            tags: structuredClone(unwrap(allTags)),
            linkPreviewCache: currentCache,
        }

        const snapshot: DataSnapshot = {
            version,
            libraries: currentLibs,
            activeLibraryId: currentId,
            libraryData: { ...allLibraryDataRef },
        }

        const asString = JSON.stringify(snapshot)
        if (asString === lastSavedString) return
        lastSavedString = asString
        writeSave(snapshot)
    })
})

// Public library management API
export const setActiveLibraryId = (newId: string) => {
    const currentId = _activeLibraryId()
    if (newId === currentId) return

    // Snapshot of the outgoing library's state BEFORE reconcile()
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
    if (isInitialized) loadLibraryDataIntoState(newId)
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
