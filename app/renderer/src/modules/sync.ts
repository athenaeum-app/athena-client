import type { LibraryDataSnapshot } from './store'

const mergeRecords = <
    T extends { updated_at?: string | Date; timestamp?: string | Date },
>(
    local: Record<string, T>,
    server: Record<string, T>,
): Record<string, T> => {
    const merged = { ...local }

    for (const [id, serverItem] of Object.entries(server)) {
        const localItem = local[id]

        if (!localItem) {
            merged[id] = serverItem
            continue
        }

        const localTime = new Date(
            localItem.updated_at || localItem.timestamp || 0,
        ).getTime()
        const serverTime = new Date(
            serverItem.updated_at || serverItem.timestamp || 0,
        ).getTime()

        if (serverTime > localTime) {
            merged[id] = serverItem
        }
    }

    return merged
}

export const mergeLibraryData = (
    localData: Partial<LibraryDataSnapshot>,
    serverData: any,
) => {
    return {
        archives: mergeRecords(
            localData.archives || {},
            serverData.archives || {},
        ),
        moments: mergeRecords(
            localData.moments || {},
            serverData.moments || {},
        ),
        tags: mergeRecords(localData.tags || {}, serverData.tags || {}),
        linkPreviewCache: {
            ...(localData.linkPreviewCache || {}),
            ...(serverData.linkPreviewCache || {}),
        },
    }
}
