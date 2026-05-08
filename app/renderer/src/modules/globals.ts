import { createMemo, createSignal, type Accessor } from 'solid-js'
import {
    allMoments,
    allTags,
    dateFilter,
    defaultArchiveId,
    getActiveLibrary,
    mediaFilters,
    searchQuery,
    selectedArchiveId,
    selectedTagIds,
    selectedURLFilters,
    setMediaFilters,
    type baseUrlString,
    type MomentData,
    type MomentId,
    type Tag,
    type url,
} from './store'
import {
    URL_DOMAIN_REGEX,
    URL_FILE_REGEX,
    URL_MAIN_DOMAIN_REGEX,
    URL_REGEX,
} from './regex'

export const generateVibrantColour = () => {
    const hue = Math.floor(Math.random() * 360)
    return `hsl(${hue}, 70%, 60%)`
}

export const extractBaseURL = (url: baseUrlString) => {
    const match =
        url.match(URL_MAIN_DOMAIN_REGEX) || url.match(URL_DOMAIN_REGEX)
    if (match) {
        return match[0].toLowerCase()
    }
}

export const registerMediaFilter = (url: url) => {
    const match =
        url.match(URL_MAIN_DOMAIN_REGEX) || url.match(URL_DOMAIN_REGEX)

    if (match && match.groups) {
        const domainName = match.groups.domain
        const baseUrl = match[0].toLowerCase()

        let nickname = domainName

        if (
            url
                .toLowerCase()
                .includes(getActiveLibrary()?.url?.toLowerCase() || '')
        ) {
            nickname = 'Server'
        }

        if (!mediaFilters[baseUrl]) {
            setMediaFilters(baseUrl, {
                url,
                nickname: nickname.toUpperCase(),
                refCount: 1,
            })
        } else {
            setMediaFilters(baseUrl, 'refCount', (v) => v + 1)
        }
    }
}

export const sortTags = (tagsToSort: Array<Tag>) => {
    const currentFilteredMoments = getFilteredMoments()
    const visibleTagIds = currentFilteredMoments.flatMap((m) => m.tagIds)
    const countMap: Record<string, number> = {}

    for (const tagId of visibleTagIds) {
        const tagData = allTags[tagId]
        if (!tagData) continue
        if (!countMap[tagData.name]) {
            countMap[tagData.name] = 1
        } else {
            countMap[tagData.name] += 1
        }
    }

    return [...tagsToSort].sort((a, b) => {
        const aWeight = countMap[a.name]
        const bWeight = countMap[b.name]
        if (aWeight && bWeight) {
            if (aWeight > bWeight) {
                return -1
            } else {
                return 1
            }
        } else if (aWeight) {
            return -1
        } else if (bWeight) {
            return 1
        }
        return 0
    })
}

export const getFilteredMoments: Accessor<Array<MomentData>> = () => {
    const momentsPool = Object.values(allMoments)
    const textSearchQuery = searchQuery()
    const searchKeywords = textSearchQuery ? textSearchQuery.split(/\s+/) : []
    return momentsPool
        .filter((momentData) => {
            // Archive
            const currentArchiveId = selectedArchiveId()
            const momentArchiveId = momentData.archiveId

            if (momentData.deleted) return false

            if (
                currentArchiveId != defaultArchiveId &&
                momentArchiveId != currentArchiveId
            ) {
                return false
            }

            // Tags
            const currentSelectedTagsIds = selectedTagIds()
            if (currentSelectedTagsIds.length > 0) {
                for (const selectedTagId of currentSelectedTagsIds) {
                    if (!momentData.tagIds.includes(selectedTagId)) return false
                }
            }

            // Timeline
            const dateFilters = dateFilter()
            const startTime = dateFilters.start.getTime()
            const endTime = dateFilters.end.getTime()
            const momentDate = new Date(momentData.timestamp)
            momentDate.setUTCHours(0, 0, 0, 0)

            const momentTime = momentDate.getTime()

            if (!(startTime <= momentTime && momentTime <= endTime)) {
                return false
            }

            // Media
            const targetURLs = selectedURLFilters()
            if (targetURLs.length > 0) {
                const containsURL = targetURLs.some((url) =>
                    momentData.content
                        .toLowerCase()
                        .includes(url.toLowerCase()),
                )
                if (!containsURL) return false
            }

            // Text Content
            if (searchKeywords.length > 0) {
                const searchableText =
                    `${momentData.title} ${momentData.content}`.toLowerCase()

                const matchesSearch = searchKeywords.every((term) =>
                    searchableText.includes(term),
                )

                if (!matchesSearch) return false
            }

            return true
        })
        .sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
        )
}

// Moment Content
export const extractContentParts = (content: string) => {
    return content
        .replace(/(?<!-)--(?!-)/g, '—')
        .split(URL_FILE_REGEX)
        .filter((fragment) => fragment && fragment.trim() !== '')
}

export const iterateUrlsInContentParts = (
    contentParts: Array<string>,
    callback: (url: string) => any,
) => {
    for (const text of contentParts) {
        if (text.match(URL_REGEX)) {
            callback(text)
        }
    }
}

// Display Type
// for use in grid, as clicking a moment in a grid displays it as a modal.
export const [displayedMomentModalId, setDisplayedMomentModalId] = createSignal<
    MomentId | undefined
>()

export const [displayType, setDisplayType] = createSignal<'Grid' | 'Full'>(
    'Full',
)

export const closeMomentModal = () => {
    setDisplayedMomentModalId()
    setDisplayedModal('NONE')
}

export type MODAL_NAMES =
    | 'NONE'
    | 'EDIT_MODAL'
    | 'CONFIRM_MOMENT_DELETE'
    | 'DISPLAY_MOMENT_MODAL'
    | 'ADD_LIBRARY_MODAL'
    | 'CONFIRM_LIBRARY_DELETE'
    | 'SERVER_LOGIN_MODAL'
    | 'DOWNLOAD_SERVER_MODAL'
    | 'IMAGE_INSPECT_MODAL'

export const [displayedModal, setDisplayedModal] =
    createSignal<MODAL_NAMES>('NONE')

// Media
export const maxImageHeight = createMemo(() => {
    return ` ${displayedMomentModalId() ? 'max-h-100' : 'max-h-140'} `
})

// Constants
export const fixedIconClasses =
    'fa-solid text-icon hover:text-icon-strongest hover:scale-125 hover:cursor-pointer transition-all duration-200 '

export const animatedIconClasses = `opacity-0 group-hover:opacity-100 ${fixedIconClasses}`

export const rootMarginPixels = 2000
export const imageExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'svg',
    'webp',
    'avif',
]
