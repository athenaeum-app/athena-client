import {
    createSignal,
    Show,
    For,
    type Component,
    createEffect,
    batch,
    onCleanup,
    untrack,
    Switch,
    Match,
} from 'solid-js'
import { reconcile, unwrap } from 'solid-js/store'
import { animatedIconClasses, setDisplayedModal } from '../modules/globals'
import {
    activeLibraryId,
    setActiveLibraryId,
    libraries,
    jwtToken,
    serverRole,
    syncStatus,
    lastSyncTime,
    copyLibraryData,
    deleteLibraryData,
    setLibraryToDelete,
    updateActiveLibrary,
    archives,
    allMoments,
    allTags,
    setArchives,
    setAllMoments,
    setAllTags,
    setLinkPreviewCache,
    defaultArchiveId,
    setSelectedArchive,
    setSelectedTagIds,
    setSelectedURLFilters,
    flushActionQueue,
    editLibraryName,
    getActiveLibrary,
    setServerDownloadLibName,
    isDownloading,
} from '../modules/data'
import { LoadingSpinner } from './LoadingSpinner'

const SyncDashboard: Component = () => {
    const [isManualSyncing, setIsManualSyncing] = createSignal(false)

    const [localVersion, setLocalVersion] = createSignal<number>(-1)

    // Auto sync
    // Via polling (only if version mismatch)
    createEffect(() => {
        const activeLib = libraries().find((l) => l.id === activeLibraryId())
        const token = jwtToken()

        if (!activeLib || activeLib.type !== 'server' || !token) return

        let isPolling = true

        const pollServer = async () => {
            if (!isPolling) return

            try {
                const res = await fetch(`${activeLib.url}/api/version`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (res.ok) {
                    await untrack(async () => {
                        if (syncStatus() === 'offline') {
                            console.log(
                                '⚠️ Server reconnected! Restoring UI...',
                            )
                            await flushActionQueue()
                            updateActiveLibrary({ syncStatus: 'synced' })
                            if (isPolling) setTimeout(pollServer, 1000)
                            return
                        }

                        const data = await res.json()
                        const serverVer = data.version

                        if (localVersion() === -1) {
                            setLocalVersion(serverVer)
                        } else if (serverVer > localVersion()) {
                            console.log(
                                `Server version ${serverVer} > Local ${localVersion()}. Pulling data...`,
                            )
                            await flushActionQueue()
                            await handleManualSync()
                            setLocalVersion(serverVer)
                        }
                    })
                } else if (res.status >= 500 || res.status === 404) {
                    untrack(() => {
                        if (syncStatus() !== 'offline') {
                            console.warn(
                                '❌ Server returned an error. Marking as offline.',
                            )
                            updateActiveLibrary({ syncStatus: 'offline' })
                        }
                    })
                }
            } catch (err) {
                untrack(() => {
                    if (syncStatus() !== 'offline') {
                        console.warn(
                            '❌ Server unreachable. Switching to offline mode.',
                        )
                        updateActiveLibrary({ syncStatus: 'offline' })
                    }
                })
            }

            if (isPolling) {
                setTimeout(pollServer, 1000)
            }
        }

        pollServer()

        onCleanup(() => {
            isPolling = false
            setLocalVersion(-1)
        })
    })

    const checkAuth = () => {
        if (!jwtToken()) {
            setDisplayedModal('SERVER_LOGIN_MODAL')
            return false
        }
        return true
    }

    const handleManualSync = async () => {
        if (!checkAuth()) return
        setIsManualSyncing(true)

        const newTime = new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })

        updateActiveLibrary({
            syncStatus: 'syncing',
            lastSyncTime: newTime,
        })

        const activeLib = libraries().find((l) => l.id === activeLibraryId())
        if (!activeLib?.url || !jwtToken()) {
            updateActiveLibrary({
                syncStatus: 'conflict',
                lastSyncTime: newTime,
            })
            setIsManualSyncing(false)
            return
        }

        try {
            const res = await fetch(`${activeLib.url}/api/library`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${jwtToken()}` },
            })

            if (res.status === 401 || res.status === 403) {
                throw new Error('UNAUTHORIZED')
            }
            if (!res.ok) throw new Error('SERVER_ERROR')

            const serverData = await res.json()

            // Refresh local state with fresh server data
            // Abort if the library changed
            if (activeLibraryId() !== activeLib.id) {
                console.warn(
                    'Library switched during fetch! Discarding data to prevent corruption.',
                )
                return
            }
            batch(() => {
                setArchives(serverData.archives || {})

                const moments = serverData.moments || {}
                for (const moment of Object.values(moments) as any[]) {
                    if (
                        typeof moment.timestamp === 'string' ||
                        typeof moment.timestamp === 'number'
                    ) {
                        moment.timestamp = new Date(moment.timestamp)
                    }
                }
                setAllMoments(reconcile(moments))
                setAllTags(reconcile(serverData.tags || {}))
                setLinkPreviewCache(serverData.linkPreviewCache || {})
            })

            updateActiveLibrary({
                syncStatus: 'synced',
                lastSyncTime: newTime,
            })
        } catch (err: any) {
            console.error('Sync failed:', err)

            const msg = err.message || ''

            if (
                msg.includes('fetch') ||
                msg.includes('network') ||
                msg === 'SERVER_ERROR'
            ) {
                updateActiveLibrary({
                    syncStatus: 'offline',
                    lastSyncTime: newTime,
                })
            } else if (msg === 'UNAUTHORIZED') {
                console.error('Token expired or invalid password!')
                updateActiveLibrary({
                    token: '', // Wipe the bad token to force a re-login prompt
                    syncStatus: 'offline',
                    lastSyncTime: newTime,
                })
            } else {
                updateActiveLibrary({
                    syncStatus: 'conflict',
                    lastSyncTime: newTime,
                })
            }
        } finally {
            setIsManualSyncing(false)
            checkAuth()
        }
    }

    const statusIndicator = () => {
        const danger = 'bg-danger shadow-md shadow-danger/50'
        if (!jwtToken()) return danger
        switch (syncStatus()) {
            case 'synced':
                return 'bg-success shadow-md shadow-success/50'
            case 'dirty':
                return 'bg-highlight-alt-strongest shadow-md shadow-highlight-alt-strongest/50'
            case 'conflict':
                return danger
            case 'offline':
                return 'bg-warning shadow-md shadow-warning/50'
            case 'syncing':
                return 'bg-highlight-strongest animate-pulse shadow-md shadow-highlight-strongest/50'
            default:
                return 'bg-sub'
        }
    }

    return (
        <div class="border-element-accent mt-2 flex flex-col gap-4 border-t pt-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div
                        class={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${statusIndicator()}`}
                    />
                    <span class="text-sub text-xs font-medium tracking-wide">
                        {!jwtToken()
                            ? 'Logged out'
                            : syncStatus() === 'synced'
                              ? 'Library Synced'
                              : syncStatus() === 'dirty'
                                ? 'Unsaved Changes'
                                : syncStatus() === 'syncing'
                                  ? 'Syncing...'
                                  : syncStatus() === 'offline'
                                    ? 'Server Offline'
                                    : 'Sync Conflict'}
                    </span>
                </div>
                <Show when={serverRole() === 'viewer'}>
                    <span class="text-warning rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                        Read Only
                    </span>
                </Show>
            </div>

            <div class="text-sub/70 flex justify-between text-xs tracking-wider uppercase">
                <span>Last Sync: {lastSyncTime()}</span>
            </div>

            <div class="flex min-h-7 gap-2">
                <Show
                    when={!isManualSyncing()}
                    fallback={<LoadingSpinner text="Pulling..." />}
                >
                    <button
                        onClick={handleManualSync}
                        disabled={
                            (isManualSyncing() ||
                                syncStatus() === 'syncing' ||
                                syncStatus() === 'offline') &&
                            !!jwtToken()
                        }
                        class="bg-sub/10 text-sub hover:bg-sub/20 flex-1 rounded-md py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {!jwtToken() ? 'Log in' : 'Sync'}
                    </button>
                </Show>
            </div>
        </div>
    )
}

const PushPullSection: Component = () => {
    const localLibs = () => libraries().filter((l) => l.type === 'local')
    const serverLibs = () => libraries().filter((l) => l.type === 'server')
    const [isConfirmingDownload, setIsConfirmingDownload] = createSignal(false)
    const [selectedLibraryTargetId, setSelectedLibraryTargetId] = createSignal(
        serverLibs()[0]?.id || localLibs()[0]?.id,
    )
    const [isPublishing, setIsPublishing] = createSignal(false)
    const [isConfirmingPublishing, setIsConfirmingPublishing] =
        createSignal(false)

    const [targetHasData, setTargetHasData] = createSignal(false)
    const [isCheckingTarget, setIsCheckingTarget] = createSignal(false)

    const targetLib = () => {
        const targetId = selectedLibraryTargetId()
        if (isActiveLibraryLocal()) {
            return serverLibs().find((l) => l.id === targetId)
        } else {
            return localLibs().find((l) => l.id === targetId)
        }
    }

    createEffect(() => {
        const current = selectedLibraryTargetId()

        const allowedLibs = isActiveLibraryLocal() ? serverLibs() : localLibs()

        const isValid = allowedLibs.some((l) => l.id === current)

        if (!isValid) {
            setSelectedLibraryTargetId(allowedLibs[0]?.id || '')
        }
    })

    createEffect(() => {
        const targetId = selectedLibraryTargetId()
        const targetLib = serverLibs().find((l) => l.id === targetId)
        const token = targetLib?.token

        if (targetLib && targetLib.url && token) {
            setIsCheckingTarget(true)
            setTargetHasData(false)

            fetch(`${targetLib.url}/api/library`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => {
                    if (!res.ok) throw new Error('Failed to fetch')
                    return res.json()
                })
                .then((data) => {
                    const hasExistingMoments =
                        Object.keys(data.moments || {}).length > 0
                    setTargetHasData(hasExistingMoments)
                })
                .catch((err) => {
                    console.error('Failed to verify target server state:', err)
                    setTargetHasData(true)
                })
                .finally(() => {
                    setIsCheckingTarget(false)
                })
        }
    })

    const handleDownload = async () => {
        setServerDownloadLibName(
            `${getActiveLibrary()?.name || 'Server'} (Local Copy)`,
        )
        setDisplayedModal('DOWNLOAD_SERVER_MODAL')
    }

    const handlePublish = async () => {
        const targetId = selectedLibraryTargetId()
        const targetLib = serverLibs().find((l) => l.id === targetId)
        if (!targetLib || !targetLib.url) return

        const newTime = new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })

        setIsPublishing(true)
        updateActiveLibrary({
            syncStatus: 'syncing',
            lastSyncTime: newTime,
        })

        try {
            const actions: any[] = []

            // Archives and Tags
            Object.values(archives()).forEach((arch) => {
                actions.push({
                    type: 'CREATE',
                    target: 'ARCHIVE',
                    target_id: arch.uuid,
                    body: arch,
                })
            })
            Object.values(unwrap(allTags)).forEach((tag) => {
                actions.push({
                    type: 'CREATE',
                    target: 'TAG',
                    target_id: tag.id,
                    body: tag,
                })
            })
            // Moments
            Object.values(unwrap(allMoments)).forEach((moment) => {
                actions.push({
                    type: 'CREATE',
                    target: 'MOMENT',
                    target_id: moment.uuid,
                    body: moment,
                })
            })

            const res = await fetch(`${targetLib.url}/api/library`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${targetLib.token}`,
                },
                body: JSON.stringify({ actions }),
            })

            if (!res.ok)
                throw new Error(`Publish rejected by server (${res.status})`)

            const oldLocalId = activeLibraryId()
            copyLibraryData(oldLocalId, targetLib.id)

            // Clean up UI state
            batch(() => {
                setActiveLibraryId(targetLib.id)
                setSelectedArchive(defaultArchiveId)
                setSelectedTagIds([])
                setSelectedURLFilters([])
            })

            updateActiveLibrary({
                syncStatus: 'synced',
                lastSyncTime: newTime,
            })
        } catch (err: any) {
            console.error('Publish failed:', err)
            updateActiveLibrary({
                syncStatus: 'conflict',
                lastSyncTime: newTime,
            })
        } finally {
            setIsPublishing(false)
        }
    }

    const isActiveLibraryLocal = () => getActiveLibrary()?.type == 'local'

    const isSubmitDisabled = () => {
        if (isActiveLibraryLocal()) {
            return (
                !selectedLibraryTargetId() ||
                isPublishing() ||
                targetLib()?.role !== 'admin' ||
                !targetLib()?.token ||
                isCheckingTarget()
            )
        }
        return false
    }

    return (
        <Show when={serverLibs().length > 0}>
            <div class="border-element-accent mt-2 flex flex-col gap-3 border-t pt-4">
                <span class="text-sub text-[10px] font-bold tracking-widest uppercase">
                    {`${isActiveLibraryLocal() ? 'Publish To Server' : 'Import From Server'}`}
                </span>

                <p class="text-sub/60 text-xs leading-relaxed">
                    {`${isActiveLibraryLocal() ? 'Push this local library into an existing connected server library.' : 'Download the server to a local library.'}`}
                </p>

                <Show when={isActiveLibraryLocal()}>
                    <select
                        value={selectedLibraryTargetId()}
                        onChange={(e) => {
                            setSelectedLibraryTargetId(e.currentTarget.value)
                            setIsConfirmingPublishing(false)
                        }}
                        class="bg-element text-plain border-element-accent focus:border-sub/50 w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none"
                        disabled={isPublishing()}
                    >
                        <Switch
                            fallback={
                                <For each={serverLibs()}>
                                    {(lib) => (
                                        <option value={lib.id}>
                                            {lib.name}
                                        </option>
                                    )}
                                </For>
                            }
                        >
                            <Match when={!isActiveLibraryLocal()}>
                                <Show
                                    when={localLibs().length > 0}
                                    fallback={
                                        <option value="">
                                            No local libraries available!
                                        </option>
                                    }
                                >
                                    {' '}
                                    <For each={localLibs()}>
                                        {(lib) => (
                                            <option value={lib.id}>
                                                {lib.name}
                                            </option>
                                        )}
                                    </For>
                                </Show>
                            </Match>
                        </Switch>
                    </select>
                </Show>

                <Show when={jwtToken() && serverRole() === 'admin'}>
                    <Show when={isCheckingTarget()}>
                        <div class="text-sub/60 text-xs italic">
                            Checking server status...
                        </div>
                    </Show>
                    <Show
                        when={
                            !isCheckingTarget() &&
                            targetHasData() &&
                            isConfirmingPublishing()
                        }
                    >
                        <div class="bg-danger/10 text-danger rounded-md px-3 py-2 text-xs leading-relaxed font-black">
                            Warning: The selected server already contains data!
                            Publishing will merge and potentially overwrite it.
                        </div>
                    </Show>
                    <Show when={isActiveLibraryLocal()}>
                        <Show
                            when={
                                !isCheckingTarget() &&
                                !targetHasData() &&
                                selectedLibraryTargetId() !== ''
                            }
                        >
                            <div class="bg-success/10 text-success rounded-md px-3 py-2 text-xs font-bold">
                                Server is empty and ready to be published to.
                            </div>
                        </Show>
                    </Show>
                </Show>

                <Show
                    when={
                        (targetLib()?.role !== 'admin' ||
                            !targetLib()?.token) &&
                        isActiveLibraryLocal()
                    }
                >
                    <div class="bg-warning/40 text-warning rounded-md px-3 py-2 text-xs font-black">
                        You must connect to this server using the admin password
                        to publish.
                    </div>
                </Show>

                <button
                    onClick={() => {
                        if (isActiveLibraryLocal()) {
                            if (isConfirmingPublishing()) {
                                setIsConfirmingPublishing(false)
                                handlePublish()
                            } else {
                                setIsConfirmingPublishing(true)
                            }
                        } else {
                            if (isConfirmingDownload()) {
                                setIsConfirmingDownload(false)
                                handleDownload()
                            } else {
                                setIsConfirmingDownload(true)
                            }
                        }
                    }}
                    disabled={isSubmitDisabled()}
                    class={`mt-1 w-full rounded-md py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        isConfirmingPublishing() && targetHasData()
                            ? 'bg-danger text-plain hover:bg-danger/80'
                            : 'bg-success/20 text-success hover:bg-success/30'
                    }`}
                >
                    <Switch
                        fallback={
                            <Show
                                when={!isDownloading()}
                                fallback={
                                    <LoadingSpinner text="Downloading..." />
                                }
                            >
                                {isConfirmingDownload()
                                    ? targetHasData()
                                        ? 'Download Server'
                                        : 'Confirm Download?'
                                    : 'Download'}
                            </Show>
                        }
                    >
                        <Match when={isActiveLibraryLocal()}>
                            <Show
                                when={!isPublishing()}
                                fallback={
                                    <LoadingSpinner text="Publishing..." />
                                }
                            >
                                {isConfirmingPublishing()
                                    ? targetHasData()
                                        ? 'Force Publish (Overwrite Data)'
                                        : 'Confirm Publish?'
                                    : 'Publish'}
                            </Show>
                        </Match>
                    </Switch>
                </button>
            </div>
        </Show>
    )
}

export const deleteLibrary = (id: string) => {
    const lib = libraries().find((l) => l.id === id)
    if (lib) {
        deleteLibraryData(lib.id)
    }
}

const LibraryItem: Component<{ lib: any }> = (props) => {
    const [isEditing, setIsEditing] = createSignal<boolean>(false)
    const [bufferName, setBufferName] = createSignal<string>('')
    let bufferNameRef: HTMLInputElement | undefined

    createEffect(() => {
        if (isEditing()) {
            bufferNameRef?.focus()
        }
    })

    return (
        <div
            onClick={() => {
                if (!isEditing()) setActiveLibraryId(props.lib.id)
            }}
            class={`group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${
                activeLibraryId() === props.lib.id
                    ? 'bg-element-accent text-main'
                    : 'text-sub hover:bg-element-lighter'
            }`}
        >
            <span class="material-symbols-outlined text-lg">
                {props.lib.type === 'local' ? 'folder' : 'cloud'}
            </span>

            <Show
                when={!isEditing()}
                fallback={
                    <input
                        ref={bufferNameRef}
                        type="text"
                        value={bufferName()}
                        onClick={(e) => e.stopPropagation()}
                        onInput={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setBufferName(e.currentTarget.value)
                        }}
                        onFocusOut={() => {
                            setIsEditing(false)
                            setBufferName(props.lib.name)
                        }}
                        onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') {
                                const newName = bufferName().trim()
                                if (newName !== '') {
                                    editLibraryName(props.lib.id, newName)
                                }
                                setIsEditing(false)
                            }
                            if (e.key === 'Escape') {
                                setIsEditing(false)
                                setBufferName(props.lib.name)
                            }
                        }}
                        class="w-full bg-transparent text-sm font-medium outline-none"
                    />
                }
            >
                <span class="truncate text-sm font-medium">
                    {props.lib.name}
                </span>
            </Show>

            <div class="ml-auto flex items-center gap-2">
                <Show
                    when={
                        props.lib.type === 'server' &&
                        jwtToken() !== '' &&
                        jwtToken() !== undefined
                    }
                >
                    <div
                        class={`h-1.5 w-1.5 rounded-full shadow-sm transition-colors ${
                            activeLibraryId() === props.lib.id
                                ? syncStatus() === 'conflict'
                                    ? 'bg-danger shadow-danger/50'
                                    : syncStatus() === 'offline'
                                      ? 'bg-warning shadow-warning/50'
                                      : 'bg-success shadow-success/50'
                                : 'bg-sub opacity-50 shadow-none'
                        }`}
                    />
                </Show>

                <Show when={!isEditing()}>
                    <div class="hidden w-0 items-center gap-2 transition-none duration-0 group-hover:flex group-hover:w-auto">
                        <i
                            class={animatedIconClasses + 'fa-pencil'}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsEditing(true)
                                setBufferName(props.lib.name)
                            }}
                        />
                        <i
                            class={
                                animatedIconClasses +
                                'fa-trash hover:text-danger'
                            }
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setLibraryToDelete(props.lib.id)
                                setDisplayedModal('CONFIRM_LIBRARY_DELETE')
                            }}
                        />
                    </div>
                </Show>
            </div>
        </div>
    )
}

export const LibraryBar: Component = () => {
    const activeLib = () => libraries().find((l) => l.id === activeLibraryId())

    return (
        <div class="bg-element mt-auto flex flex-col gap-3 rounded-xl p-4 transition-all duration-300">
            <span class="text-sub mb-1 text-xs font-bold tracking-widest uppercase">
                Libraries
            </span>

            <div class="flex flex-col gap-1">
                <For each={libraries()}>
                    {(lib) => <LibraryItem lib={lib} />}
                </For>
            </div>

            <button
                onClick={() => setDisplayedModal('ADD_LIBRARY_MODAL')}
                class="text-sub hover:bg-element-lighter hover:text-main mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            >
                <span class="material-symbols-outlined text-lg">add</span>
                Add Library
            </button>

            <PushPullSection />

            <Show when={activeLib()?.type === 'server'}>
                <SyncDashboard />
            </Show>
        </div>
    )
}
