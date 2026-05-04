import { batch } from 'solid-js'
import { unwrap } from 'solid-js/store'
import { getApi } from './ipc_client'
import {
    archives,
    setArchives,
    allMoments,
    setAllMoments,
    allTags,
    setAllTags,
    setSelectedTagIds,
    mediaFilters,
    setMediaFilters,
    selectedArchiveId,
    setSelectedArchive,
    content,
    setContent,
    setRefFiles,
    defaultArchiveId,
    defaultArchiveName,
    type Archive,
    type ArchiveId,
    type MomentData,
    type MomentId,
    type Tag,
    type TagId,
} from './store'
import {
    extractBaseURL,
    extractContentParts as extractContentPartsFromContent,
    generateVibrantColour,
    iterateUrlsInContentParts,
    registerMediaFilter,
} from './globals'

// Archives
export const createArchive = (archiveName: string): Archive => {
    const allArchives = { ...archives() }
    for (const archiveData of Object.values(allArchives)) {
        if (archiveData.name === archiveName) return archiveData
    }
    const newArchiveId: ArchiveId = `archive_${window.crypto.randomUUID()}`
    const now = new Date().toISOString()

    const newArchive: Archive = {
        name: archiveName,
        uuid: newArchiveId,
        momentsIds: [],
        updated_at: now,
        timestamp: now,
    }
    allArchives[newArchiveId] = newArchive
    setArchives(allArchives)
    return newArchive
}

export const updateArchive = (
    archiveId: ArchiveId,
    changes: Partial<Omit<Archive, 'uuid'>>,
) => {
    setArchives((prev) => ({
        ...prev,
        [archiveId]: {
            ...prev[archiveId],
            ...changes,
            updated_at: new Date().toISOString(),
        },
    }))
}

export const deleteArchive = (archiveId: ArchiveId) => {
    batch(() => {
        if (selectedArchiveId() === archiveId) {
            setSelectedArchive(defaultArchiveId)
        }

        const allArchives = { ...archives() }
        const archiveData = allArchives[archiveId]
        if (!archiveData) return

        const momentIds = archiveData.momentsIds

        for (const momentId of momentIds) {
            setAllMoments(momentId, (prev) => ({
                ...prev,
                archiveId: defaultArchiveId,
                updated_at: new Date().toISOString(),
            }))
        }

        const defaultArch = allArchives[defaultArchiveId]
        if (defaultArch) {
            allArchives[defaultArchiveId] = {
                ...defaultArch,
                updated_at: new Date().toISOString(),
                momentsIds: [...defaultArch.momentsIds, ...momentIds],
            }
        }

        delete allArchives[archiveId]
        setArchives(allArchives)
    })
}

// Moments
export const createMoment = (
    data: Omit<MomentData, 'uuid' | 'timestamp' | 'updated_at'> & {
        timestamp?: Date
    },
): boolean => {
    const newMomentId: MomentId = `moment_${window.crypto.randomUUID()}`
    const targetArchiveId = data.archiveId ?? defaultArchiveId
    const now = new Date()

    const newMoment: MomentData = {
        ...data,
        uuid: newMomentId,
        timestamp: data.timestamp || now,
        updated_at: now.toISOString(),
    }

    batch(() => {
        data.tagIds.forEach((id) => {
            if (allTags[id]) setAllTags(id, 'refCount', (v) => v + 1)
        })

        setAllMoments(newMomentId, newMoment)

        // Bug fix: the default archive must track its momentsIds exactly like
        // any custom archive.  The old guard
        //   `if (targetArchiveId == defaultArchiveId) return prev`
        // was silently skipping this update for the default archive.
        setArchives((prev) => {
            const targetArchiveData = prev[targetArchiveId]
            if (!targetArchiveData) return prev
            return {
                ...prev,
                [targetArchiveId]: {
                    ...targetArchiveData,
                    updated_at: new Date().toISOString(),
                    momentsIds: [
                        ...(targetArchiveData.momentsIds ?? []),
                        newMomentId,
                    ],
                },
            }
        })
    })
    return true
}

export const swapMomentArchive = (
    momentId: MomentId,
    newArchiveName: string,
) => {
    if (newArchiveName.trim() === '') newArchiveName = defaultArchiveName

    const momentData = allMoments[momentId]
    if (!momentData) {
        console.error('swapMomentArchive: moment not found.', momentId)
        return
    }

    const newArchiveData = createArchive(newArchiveName)
    const oldArchiveId = momentData.archiveId

    if (!oldArchiveId || !newArchiveData) {
        console.error('swapMomentArchive: insufficient data.')
        return
    }

    console.log(
        `Moving moment ${momentId}: ${oldArchiveId} → ${newArchiveData.uuid}`,
    )

    batch(() => {
        const currentArchives = archives()

        const oldArch = currentArchives[oldArchiveId]
        if (oldArch) {
            updateArchive(oldArchiveId, {
                momentsIds: oldArch.momentsIds.filter((id) => id !== momentId),
            })
        }

        const newArch = currentArchives[newArchiveData.uuid]
        if (newArch) {
            updateArchive(newArchiveData.uuid, {
                momentsIds: [...newArch.momentsIds, momentId],
            })
        }

        setAllMoments(momentId, (prev) => ({
            ...prev,
            archiveId: newArchiveData.uuid,
            updated_at: new Date().toISOString(),
        }))
    })
}

export const updateMoment = (
    momentId: MomentId,
    changes: Partial<Omit<MomentData, 'uuid'>>,
): boolean | undefined => {
    const oldMoment = allMoments[momentId]
    if (!oldMoment) return

    const finalChanges = {
        ...changes,
        updated_at: new Date().toISOString(),
    }

    const newTagIds = changes.tagIds

    if (newTagIds) {
        const oldIds = oldMoment.tagIds

        subtractMediaFiltersFromContent(oldMoment.content)
        if (changes.content) {
            const contentParts = extractContentPartsFromContent(changes.content)
            iterateUrlsInContentParts(contentParts, (url) => {
                const baseUrl = extractBaseURL(url)
                if (baseUrl) registerMediaFilter(baseUrl)
            })
        }

        const removed = oldIds.filter((id) => !newTagIds.includes(id))
        const added = newTagIds.filter((id) => !oldIds.includes(id))

        removed.forEach((id) => {
            if (!allTags[id]) return
            const newCount = allTags[id].refCount - 1
            if (newCount <= 0) {
                setAllTags(id, undefined!)
                setSelectedTagIds((prev) => prev.filter((tid) => tid !== id))
            } else {
                setAllTags(id, 'refCount', newCount)
            }
        })

        added.forEach((id) => {
            if (allTags[id]) setAllTags(id, 'refCount', (v) => v + 1)
        })
    }

    setAllMoments(momentId, finalChanges)
    return true
}

export const deleteMoment = (uuid: MomentId): boolean | undefined => {
    const momentToDelete = allMoments[uuid]
    if (!momentToDelete) {
        console.warn('deleteMoment: moment does not exist.', uuid)
        return
    }

    console.log(`Deleting moment: ${uuid}`)
    const archiveId = momentToDelete.archiveId

    setAllMoments(uuid, undefined!)

    setArchives((prev) => {
        if (!archiveId || !prev[archiveId]) return prev
        return {
            ...prev,
            [archiveId]: {
                ...prev[archiveId],
                updated_at: new Date().toISOString(),
                momentsIds: prev[archiveId].momentsIds.filter(
                    (id) => id !== uuid,
                ),
            },
        }
    })

    for (const id of momentToDelete.tagIds) {
        if (!allTags[id]) continue
        const newCount = allTags[id].refCount - 1
        if (newCount <= 0) {
            console.log('Deleting orphaned tag:', allTags[id].name)
            setAllTags(id, undefined!)
        } else {
            setAllTags(id, 'refCount', newCount)
        }
    }

    subtractMediaFiltersFromContent(momentToDelete.content)
    return true
}

// Tags

export const registerTags = (newTags: Array<string>): Array<TagId> => {
    const transformedNames = [
        ...new Set(
            newTags
                .map((t) => t.toUpperCase().trim())
                .filter((t) => t.length > 0),
        ),
    ]

    const resultIds: Array<TagId> = []

    batch(() => {
        const nameIdMap = new Map(
            Object.values(unwrap(allTags)).map((t) => [t.name, t.id]),
        )

        transformedNames.forEach((name) => {
            const existingId = nameIdMap.get(name)
            if (existingId) {
                resultIds.push(existingId)
                return
            }
            const newTagId: TagId = `tag_${window.crypto.randomUUID()}`
            const now = new Date().toISOString()
            const tagData: Tag = {
                name,
                id: newTagId,
                colour: generateVibrantColour(),
                refCount: 0,
                updated_at: now,
                timestamp: now,
            }
            resultIds.push(newTagId)
            setAllTags(newTagId, tagData)
        })
    })

    return resultIds
}

export const updateTag = (
    tagId: TagId,
    changes: Partial<Omit<Tag, 'id'>>,
): boolean | undefined => {
    if (!allTags[tagId]) {
        console.warn('updateTag: tag does not exist.', tagId)
        return
    }

    setAllTags(tagId, {
        ...changes,
        updated_at: new Date().toISOString(),
    })
    return true
}

export const renameTag = (tagId: TagId, newName: string): boolean | undefined =>
    updateTag(tagId, { name: newName })

export const recolourTag = (
    tagId: TagId,
    newColour: string,
): boolean | undefined => updateTag(tagId, { colour: newColour })

// File References
export const saveFileReference = async (
    file: File,
    selection: { Start?: number; End?: number },
) => {
    const currentDate = new Date().getTime()
    const fileName = `attachment_${file.name || currentDate}`
    const placeholder = `[Attaching ${fileName}...]`

    const startPos = selection.Start ?? content().length
    const endPos = selection.End ?? content().length

    setContent(
        (prev) =>
            prev.substring(0, startPos) + placeholder + prev.substring(endPos),
    )

    try {
        const rawData = await file.arrayBuffer()
        const localUri = await getApi().saveFileRef(rawData, fileName)
        if (localUri) {
            setContent((prev) => prev.replace(placeholder, `${localUri} `))
            setRefFiles((prev) => ({ ...prev, [localUri]: file }))
        }
    } catch (error) {
        console.error('Failed to attach file:', error)
        setContent((prev) =>
            prev.replace(placeholder, `[ERROR! Failed to attach ${fileName}]`),
        )
        return null
    }
}

// Helpers
const subtractMediaFiltersFromContent = (contentStr: string) => {
    const contentParts = extractContentPartsFromContent(contentStr)
    iterateUrlsInContentParts(contentParts, (url) => {
        const baseUrl = extractBaseURL(url)
        if (!baseUrl || !mediaFilters[baseUrl]) return
        const newValue = mediaFilters[baseUrl].refCount - 1
        console.log('Media filter ref removed:', baseUrl, '→', newValue)
        if (newValue <= 0) {
            setMediaFilters(baseUrl, undefined!)
        } else {
            setMediaFilters(baseUrl, 'refCount', newValue)
        }
    })
}
