import { createSignal, Show, For, type Component } from 'solid-js'
import { setDisplayedModal } from '../modules/globals'
import {
    libraries,
    activeLibraryId,
    setActiveLibraryId,
    jwtToken,
    setJwtToken,
    syncStatus,
    setSyncStatus,
    localVersion,
    lastSyncTime,
    setLastSyncTime,
} from '../modules/data'

const LoadingSpinner: Component<{ text?: string }> = (props) => (
    <div class="text-sub flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs">
        <div class="border-sub h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent"></div>
        <Show when={props.text}>
            <span class="animate-pulse font-medium tracking-wide">
                {props.text}
            </span>
        </Show>
    </div>
)

const AuthForm: Component = () => {
    const [username, setUsername] = createSignal('')
    const [password, setPassword] = createSignal('')
    const [isLoading, setIsLoading] = createSignal(false)
    const [processingMessage, setProcessingMessage] = createSignal('')

    const handleAuth = async (
        event: MouseEvent & { currentTarget: HTMLButtonElement },
        type: 'login' | 'register',
    ) => {
        event.preventDefault()
        if (!username().trim() || !password().trim()) return

        setIsLoading(true)
        try {
            const activeLib = libraries().find(
                (l) => l.id === activeLibraryId(),
            )
            const url = activeLib?.url || 'http://localhost:8080'

            const res = await fetch(`${url}/auth/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username(),
                    password: password(),
                }),
            })

            if (!res.ok) throw new Error('Auth failed')

            const data = await res.json()
            localStorage.setItem('athena_jwt', data.token)
            setJwtToken(data.token)
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div class="border-element-accent mt-2 flex flex-col gap-3 border-t pt-4">
            <span class="text-sub text-[10px] font-bold tracking-widest uppercase">
                Server Auth Required
            </span>
            <input
                type="text"
                placeholder="Username"
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                class="bg-element text-sub border-element-accent focus:border-sub/50 w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none"
                disabled={isLoading()}
            />
            <input
                type="password"
                placeholder="Password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                class="bg-element text-sub border-element-accent focus:border-sub/50 w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none"
                disabled={isLoading()}
            />
            <div class="flex min-h-7 gap-2 pt-1">
                <Show
                    when={!isLoading()}
                    fallback={<LoadingSpinner text={processingMessage()} />}
                >
                    <button
                        onClick={(e) => {
                            handleAuth(e, 'login')
                            setProcessingMessage('Logging in...')
                        }}
                        class="bg-sub/10 text-sub hover:bg-sub/20 flex-1 rounded-md py-1.5 text-xs font-bold transition-colors hover:cursor-pointer"
                    >
                        Login
                    </button>
                    <button
                        onClick={(e) => {
                            handleAuth(e, 'register')
                            setProcessingMessage('Registering...')
                        }}
                        class="bg-element text-sub border-element-accent hover:bg-sub/10 flex-1 rounded-md border py-1.5 text-xs font-bold transition-colors hover:cursor-pointer"
                    >
                        Register
                    </button>
                </Show>
            </div>
        </div>
    )
}

const SyncDashboard: Component = () => {
    const handleLogout = () => {
        localStorage.removeItem('athena_jwt')
        setJwtToken('')
    }

    const handleManualSync = async () => {
        setSyncStatus('syncing')
        await new Promise((resolve) => setTimeout(resolve, 800))
        setSyncStatus('synced')
        setLastSyncTime(new Date().toLocaleTimeString())
    }

    const statusIndicator = () => {
        switch (syncStatus()) {
            case 'synced':
                return 'bg-success shadow-md shadow-success/50'
            case 'dirty':
                return 'bg-highlight-alt-strongest shadow-md shadow-highlight-alt-strongest/50'
            case 'conflict':
                return 'bg-danger shadow-md shadow-danger/50'
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
                            ? 'Vault Synced'
                            : syncStatus() === 'dirty'
                              ? 'Unsaved Changes'
                              : syncStatus() === 'syncing'
                                ? 'Syncing...'
                                : 'Sync Conflict'}
                    </span>
                </div>
            </div>

            <div class="text-sub/70 flex justify-between text-xs tracking-wider uppercase">
                <span>V.{localVersion()}</span>
                <span>Last: {lastSyncTime()}</span>
            </div>

            <div class="flex min-h-7 gap-2">
                <Show
                    when={syncStatus() !== 'syncing'}
                    fallback={<LoadingSpinner text="Pushing..." />}
                >
                    <button
                        onClick={handleManualSync}
                        disabled={syncStatus() === 'synced'}
                        class="bg-sub/10 text-sub hover:bg-sub/20 flex-1 rounded-md py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Sync Now
                    </button>
                    <button
                        onClick={handleLogout}
                        class="text-danger hover:bg-danger/20 rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                    >
                        Disconnect
                    </button>
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

            {/* Library List */}
            <div class="flex flex-col gap-1">
                <For each={libraries()}>
                    {(lib) => (
                        <div
                            onClick={() => setActiveLibraryId(lib.id)}
                            class={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${activeLibraryId() === lib.id ? 'bg-element-accent text-main' : 'text-sub hover:bg-element-lighter'}`}
                        >
                            <span class="material-symbols-outlined text-lg">
                                {lib.type === 'local' ? 'folder' : 'cloud'}
                            </span>
                            <span class="text-sm font-medium">{lib.name}</span>

                            {/* Small sync dot indicator for active server libraries in the list */}
                            <Show
                                when={
                                    lib.type === 'server' &&
                                    activeLibraryId() === lib.id &&
                                    jwtToken() !== ''
                                }
                            >
                                <div class="bg-success shadow-success/50 ml-auto h-1.5 w-1.5 rounded-full shadow-sm" />
                            </Show>
                        </div>
                    )}
                </For>
            </div>

            {/* Add Library Button */}
            <button
                onClick={() => setDisplayedModal('ADD_LIBRARY_MODAL')}
                class="text-sub hover:bg-element-lighter hover:text-main mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            >
                <span class="material-symbols-outlined text-lg">add</span>
                Add Library
            </button>

            {/* Conditional Vault Controls - Only shows if the active library is a Server */}
            <Show when={activeLib()?.type === 'server'}>
                <Show when={jwtToken() !== ''} fallback={<AuthForm />}>
                    <SyncDashboard />
                </Show>
            </Show>
        </div>
    )
}
