import { type LibraryDataSnapshot } from './store'

const mergeRecords = <T extends Record<string, any>>(
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
            (localItem as any).updated_at || (localItem as any).timestamp || 0,
        ).getTime()

        const serverTime = new Date(
            (serverItem as any).updated_at ||
                (serverItem as any).timestamp ||
                0,
        ).getTime()
        if (serverTime > localTime) {
            merged[id] = serverItem
        }
    }

    return merged
}

export const mergeLibraryData = (
    local: LibraryDataSnapshot,
    server: LibraryDataSnapshot,
): LibraryDataSnapshot => {
    return {
        archives: mergeRecords(local.archives, server.archives),
        moments: mergeRecords(local.moments, server.moments),
        tags: mergeRecords(local.tags, server.tags),
        linkPreviewCache: {
            ...server.linkPreviewCache,
            ...local.linkPreviewCache,
        },
    } as LibraryDataSnapshot
}
