import { createSignal } from 'solid-js'
import type { IpcApi } from '../../../main/src/types/APISchema'
import { createStore } from 'solid-js/store'

// Constants

export const BeginningOfTime = new Date()
export const EndOfTime = new Date()
BeginningOfTime.setTime(0)
EndOfTime.setUTCFullYear(9999)

export const defaultArchiveId = '_default_archive_' as ArchiveId
export const defaultArchiveName = '__GENERAL__'

// Types & Interfaces
export type FileName = string
export type FileRefs = Record<string, File>

export type LibraryType = 'local' | 'server'
export interface Library {
    id: string
    name: string
    type: LibraryType
    url?: string
}

export type MomentId = `moment_${string}`
export interface MomentData {
    uuid: MomentId
    title: string
    content: string
    archiveId: ArchiveId | undefined
    timestamp: Date
    tagIds: Array<TagId>
}

export type ArchiveId = `archive_${string}`
export interface Archive {
    uuid: ArchiveId
    name: string
    momentsIds: Array<MomentId>
}

export type TagId = `tag_${string}`
export type Tags = Record<TagId, Tag>
export interface Tag {
    id: TagId
    name: string
    colour: string
    refCount: number
}

export interface MediaFilter {
    url: string
    nickname: string
    refCount: number
}
export type url = string
export type baseUrlString = string

export interface LibraryDataSnapshot {
    archives: Record<ArchiveId, Archive>
    moments: Record<MomentId, MomentData>
    tags: Record<TagId, Tag>
    linkPreviewCache: Record<string, any>
}

export interface DataSnapshot {
    version: string
    libraries: Library[]
    activeLibraryId: string
    libraryData: Record<string, LibraryDataSnapshot>
}

export type dataSnapshot = DataSnapshot

// Signals & Stores

// Reference Files
export const [refFiles, setRefFiles] = createSignal<FileRefs>({})

// Libraries
export const [libraries, setLibraries] = createSignal<Library[]>([])

// Server / Sync
export const [jwtToken, setJwtToken] = createSignal(
    localStorage.getItem('athena_jwt') || '',
)
export const [syncStatus, setSyncStatus] = createSignal<
    'synced' | 'dirty' | 'syncing' | 'conflict'
>('synced')
export const [localVersion, setLocalVersion] = createSignal(1)
export const [lastSyncTime, setLastSyncTime] = createSignal('Never')

// Link Previews
export const [linkPreviewCache, setLinkPreviewCache] = createSignal<
    Record<string, Awaited<ReturnType<typeof IpcApi.scrapeWebsiteData>>>
>({})

// Moment Creator form fields
export const [title, setTitle] = createSignal<string>('')
export const [content, setContent] = createSignal<string>('')
export const [tagsString, setTagsString] = createSignal<string>('')

// Moments
export const [allMoments, setAllMoments] = createStore<
    Record<MomentId, MomentData>
>({})

// Archives
export const [archives, setArchives] = createSignal<Record<ArchiveId, Archive>>(
    {},
)
export const [selectedArchiveId, setSelectedArchive] =
    createSignal<ArchiveId>(defaultArchiveId)

// Tags
export const [selectedTagIds, setSelectedTagIds] = createSignal<Array<TagId>>(
    [],
)
export const [allTags, setAllTags] = createStore<Record<TagId, Tag>>({})

// Date filter
export const [dateFilter, setDateFilter] = createSignal<{
    start: Date
    end: Date
}>({ start: BeginningOfTime, end: EndOfTime })

// Editing / deleting moments (used by modal system)
export const [editingMomentId, setEditingMomentId] = createSignal<
    MomentId | undefined
>()
export const [momentToDelete, setMomentToDelete] = createSignal<
    MomentId | undefined
>()

// Media Filters  (baseUrl → MediaFilter)
export const [mediaFilters, setMediaFilters] = createStore<
    Record<baseUrlString, MediaFilter>
>({})
export const [selectedURLFilters, setSelectedURLFilters] = createSignal<
    Array<string>
>([])
