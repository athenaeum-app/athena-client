import { createSignal, Show, For, type Component, createEffect } from 'solid-js'
import { iconClasses, setDisplayedModal } from '../modules/globals'
import {
    activeLibraryId,
    setActiveLibraryId,
    libraries,
    jwtToken,
    serverRole,
    syncStatus,
    lastSyncTime,
    pushPayloadToServer,
    copyLibraryData,
    deleteLibraryData,
    setLibraryToDelete,
    updateActiveLibrary,
} from '../modules/data'

const LoadingSpinner: Component<{ text?: string }> = (props) => (
    <div class="text-sub flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs">
        <div class="border-sub h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" />
        <Show when={props.text}>
            <span class="animate-pulse font-medium tracking-wide">
                {props.text}
            </span>
        </Show>
    </div>
)

const SyncDashboard: Component = () => {
    const [isManualSyncing, setIsManualSyncing] = createSignal(false)

    const handleManualSync = async () => {
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
        if (!activeLib?.url) {
            updateActiveLibrary({
                syncStatus: 'conflict',
                lastSyncTime: newTime,
            })
            setIsManualSyncing(false)
            return
        }

        try {
            await Promise.all([
                pushPayloadToServer(activeLib.url, activeLib.id),
                new Promise((resolve) => setTimeout(resolve, 600)),
            ])

            updateActiveLibrary({
                syncStatus: 'synced',
                lastSyncTime: newTime,
            })
        } catch (err: any) {
            console.error('Sync failed:', err)
            if (
                err.message?.toLowerCase().includes('fetch') ||
                err.message?.toLowerCase().includes('network')
            ) {
                updateActiveLibrary({
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
        }
    }

    const statusIndicator = () => {
        switch (syncStatus()) {
            case 'synced':
                return 'bg-success shadow-md shadow-success/50'
            case 'dirty':
                return 'bg-highlight-alt-strongest shadow-md shadow-highlight-alt-strongest/50'
            case 'conflict':
                return 'bg-danger shadow-md shadow-danger/50'
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
                        {syncStatus() === 'synced'
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
                    fallback={<LoadingSpinner text="Pushing..." />}
                >
                    <Show when={serverRole() === 'admin'}>
                        <button
                            onClick={handleManualSync}
                            class="bg-sub/10 text-sub hover:bg-sub/20 flex-1 rounded-md py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Sync Now
                        </button>
                    </Show>
                </Show>
            </div>
        </div>
    )
}

const PublishSection: Component = () => {
    const serverLibs = () => libraries().filter((l) => l.type === 'server')
    const [isConfirmingPublishing, setIsConfirmingPublishing] =
        createSignal(false)
    const [selectedLibraryTargetId, setSelectedLibraryTargetId] = createSignal(
        serverLibs()[0]?.id || '',
    )
    const [isPublishing, setIsPublishing] = createSignal(false)

    const [targetHasData, setTargetHasData] = createSignal(false)
    const [isCheckingTarget, setIsCheckingTarget] = createSignal(false)

    const targetLib = () => {
        const targetId = selectedLibraryTargetId()
        return serverLibs().find((l) => l.id === targetId)
    }

    createEffect(() => {
        const current = selectedLibraryTargetId()
        const libs = serverLibs()
        if (!current && libs.length > 0) {
            setSelectedLibraryTargetId(libs[0].id)
        } else if (current && !libs.find((l) => l.id === current)) {
            setSelectedLibraryTargetId(libs[0]?.id || '')
        }
    })

    createEffect(() => {
        const targetId = selectedLibraryTargetId()
        const targetLib = serverLibs().find((l) => l.id === targetId)
        const token = targetLib?.token

        if (targetLib && targetLib.url && token) {
            setIsCheckingTarget(true)
            setTargetHasData(false)

            fetch(`${targetLib.url}/api/library/${targetLib.id}`, {
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
            await pushPayloadToServer(
                targetLib.url,
                targetLib.id,
                targetLib.token,
            )

            const oldLocalId = activeLibraryId()
            copyLibraryData(oldLocalId, targetLib.id)
            setActiveLibraryId(targetLib.id)

            updateActiveLibrary({
                syncStatus: 'synced',
                lastSyncTime: newTime,
            })
        } catch (err: any) {
            console.error('Publish failed:', err)
            if (
                err.message?.toLowerCase().includes('fetch') ||
                err.message?.toLowerCase().includes('network')
            ) {
                updateActiveLibrary({
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
            setIsPublishing(false)
        }
    }

    return (
        <Show when={serverLibs().length > 0}>
            <div class="border-element-accent mt-2 flex flex-col gap-3 border-t pt-4">
                <span class="text-sub text-[10px] font-bold tracking-widest uppercase">
                    Publish to Server
                </span>

                <p class="text-sub/60 text-xs leading-relaxed">
                    Push this local library into an existing connected server
                    library.
                </p>

                <select
                    value={selectedLibraryTargetId()}
                    onChange={(e) => {
                        setSelectedLibraryTargetId(e.currentTarget.value)
                        setIsConfirmingPublishing(false)
                    }}
                    class="bg-element text-plain border-element-accent focus:border-sub/50 w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none"
                    disabled={isPublishing()}
                >
                    <For each={serverLibs()}>
                        {(lib) => <option value={lib.id}>{lib.name}</option>}
                    </For>
                </select>

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
                            Publishing will permanently overwrite it.
                        </div>
                    </Show>
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

                <Show
                    when={targetLib()?.role !== 'admin' || !targetLib()?.token}
                >
                    <div class="bg-warning/40 text-warning rounded-md px-3 py-2 text-xs font-black">
                        You must connect to this server using the admin password
                        to publish.
                    </div>
                </Show>

                <button
                    onClick={() => {
                        if (isConfirmingPublishing()) {
                            setIsConfirmingPublishing(false)
                            handlePublish()
                        } else {
                            setIsConfirmingPublishing(true)
                        }
                    }}
                    disabled={
                        !selectedLibraryTargetId() ||
                        isPublishing() ||
                        targetLib()?.role !== 'admin' ||
                        !targetLib()?.token ||
                        isCheckingTarget()
                    }
                    class={`mt-1 w-full rounded-md py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        isConfirmingPublishing() && targetHasData()
                            ? 'bg-danger text-plain hover:bg-danger/80'
                            : 'bg-success/20 text-success hover:bg-success/30'
                    }`}
                >
                    <Show
                        when={!isPublishing()}
                        fallback={<LoadingSpinner text="Publishing..." />}
                    >
                        {isConfirmingPublishing()
                            ? targetHasData()
                                ? 'Force Publish (Overwrite Data)'
                                : 'Confirm Publish?'
                            : 'Publish'}
                    </Show>
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

export const LibraryBar: Component = () => {
    const activeLib = () => libraries().find((l) => l.id === activeLibraryId())

    return (
        <div class="bg-element mt-auto flex flex-col gap-3 rounded-xl p-4 transition-all duration-300">
            <span class="text-sub mb-1 text-xs font-bold tracking-widest uppercase">
                Libraries
            </span>

            <div class="flex flex-col gap-1">
                <For each={libraries()}>
                    {(lib) => (
                        <div
                            onClick={() => setActiveLibraryId(lib.id)}
                            class={`group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${
                                activeLibraryId() === lib.id
                                    ? 'bg-element-accent text-main'
                                    : 'text-sub hover:bg-element-lighter'
                            }`}
                        >
                            <span class="material-symbols-outlined text-lg">
                                {lib.type === 'local' ? 'folder' : 'cloud'}
                            </span>
                            <span class="text-sm font-medium">{lib.name}</span>

                            <div class="ml-auto flex items-center gap-2">
                                <Show
                                    when={
                                        lib.type === 'server' &&
                                        jwtToken() !== ''
                                    }
                                >
                                    <div
                                        class={`h-1.5 w-1.5 rounded-full shadow-sm transition-colors ${
                                            activeLibraryId() === lib.id
                                                ? syncStatus() === 'conflict'
                                                    ? 'bg-danger shadow-danger/50'
                                                    : syncStatus() === 'offline'
                                                      ? 'bg-warning shadow-warning/50'
                                                      : 'bg-success shadow-success/50'
                                                : 'bg-sub opacity-50 shadow-none'
                                        }`}
                                    />
                                </Show>
                                <div class="hidden w-0 transition-none duration-0 group-hover:block group-hover:w-auto">
                                    <i
                                        class={
                                            iconClasses +
                                            'fa-trash hover:text-danger'
                                        }
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setLibraryToDelete(lib.id)
                                            setDisplayedModal(
                                                'CONFIRM_LIBRARY_DELETE',
                                            )
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </For>
            </div>

            <button
                onClick={() => setDisplayedModal('ADD_LIBRARY_MODAL')}
                class="text-sub hover:bg-element-lighter hover:text-main mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            >
                <span class="material-symbols-outlined text-lg">add</span>
                Add Library
            </button>

            <Show when={activeLib()?.type === 'local'}>
                <PublishSection />
            </Show>

            <Show when={activeLib()?.type === 'server'}>
                <SyncDashboard />
            </Show>
        </div>
    )
}
