import { createSignal, Match, Show, type Component } from 'solid-js'
import { setDisplayedModal } from '../modules/globals'
import {
    libraries,
    setLibraries,
    setActiveLibraryId,
    initializeNewLibrary,
    setJwtToken,
    setServerRole,
    type LibraryType,
    type Library,
} from '../modules/data'
import { Switch } from 'solid-js'

const AddLibraryModal: Component = () => {
    const [name, setName] = createSignal('')
    const [type, setType] = createSignal<LibraryType>('local')
    const [url, setUrl] = createSignal('')
    const [password, setPassword] = createSignal('')

    const [isLoading, setIsLoading] = createSignal(false)
    const [authError, setAuthError] = createSignal('')

    const getDerivedServerId = () => {
        const sanitised = url()
            .trim()
            .replace(/^https?:\/\//i, '')
            .replace(/\/+$/, '')
            .replace(/[.:\/\\]/g, '-')
        return `server-${sanitised}`
    }

    const isNameDuplicate = () => {
        const trimmed = name().trim().toLowerCase()
        if (!trimmed) return false
        return libraries().some((lib) => lib.name.toLowerCase() === trimmed)
    }

    const isURLDuplicate = () => {
        if (type() !== 'server' || !url().trim()) return false
        const targetId = getDerivedServerId()
        return libraries().some((lib) => lib.id === targetId)
    }

    const handleSubmit = async (e: Event) => {
        e.preventDefault()

        const trimmedName = name().trim()
        if (!trimmedName || isNameDuplicate()) return

        if (type() === 'server' && (!url().trim() || !password().trim())) return
        if (isURLDuplicate()) return

        setIsLoading(true)
        setAuthError('')

        if (type() === 'server') {
            const rawUrl = url().trim()
            const targetUrl = rawUrl.startsWith('http')
                ? rawUrl
                : `http://${rawUrl}`

            try {
                const res = await fetch(`${targetUrl}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password() }),
                })

                if (!res.ok) {
                    setAuthError('Invalid password or server unreachable.')
                    setIsLoading(false)
                    return
                }

                const data = await res.json()

                localStorage.setItem('athena_jwt', data.token)
                localStorage.setItem('athena_role', data.role)
                setJwtToken(data.token)
                setServerRole(data.role)
            } catch (err) {
                console.error(err)
                setAuthError('Network error. Is the server running?')
                setIsLoading(false)
                return
            }
        }

        const newId =
            type() === 'server' ? getDerivedServerId() : `local-${Date.now()}`

        const newLib: Library = {
            id: newId,
            name: trimmedName,
            type: type(),
            url:
                type() === 'server'
                    ? url().trim().startsWith('http')
                        ? url().trim()
                        : `http://${url().trim()}`
                    : undefined,
        }

        initializeNewLibrary(newLib.id)
        setLibraries([...libraries(), newLib])
        setActiveLibraryId(newLib.id)
        setDisplayedModal('NONE')
        setIsLoading(false)
        setName('')
        setType('local')
        setUrl('')
    }

    return (
        <div class="border-sub bg-element-matte flex w-xs flex-col gap-6 rounded-4xl border-4 p-8 shadow-2xl md:w-lg">
            <h1 class="text-plain pt-2 text-center text-xl font-bold">
                Add Library
            </h1>
            <p class="text-sub text-center font-bold">
                Create a local library or connect to a self-hosted server.
            </p>

            <form onSubmit={handleSubmit} class="flex flex-col gap-4">
                <div class="bg-element flex rounded-2xl p-1 shadow-inner">
                    <button
                        type="button"
                        onClick={() => {
                            setType('local')
                            setAuthError('')
                        }}
                        class={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${type() === 'local' ? 'bg-element-accent text-plain shadow-sm' : 'text-sub hover:text-plain'}`}
                    >
                        Local
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setType('server')
                            setAuthError('')
                        }}
                        class={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${type() === 'server' ? 'bg-element-accent text-plain shadow-sm' : 'text-sub hover:text-plain'}`}
                    >
                        Connect to Server
                    </button>
                </div>

                <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1">
                        <input
                            type="text"
                            placeholder={
                                type() === 'local'
                                    ? 'Library Name'
                                    : 'Library Alias'
                            }
                            value={name()}
                            onInput={(e) => setName(e.currentTarget.value)}
                            class="bg-element text-plain border-element-accent focus:border-sub/50 w-full rounded-2xl border-2 px-4 py-3 transition-colors outline-none"
                            disabled={isLoading()}
                            autofocus
                        />

                        <Show when={isNameDuplicate()}>
                            <span class="text-danger px-2 text-xs font-bold">
                                A library with this name already exists.
                            </span>
                        </Show>
                    </div>

                    <Show when={type() === 'server'}>
                        <div class="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="Server URL (e.g. 192.168.1.50:8080)"
                                value={url()}
                                onInput={(e) => setUrl(e.currentTarget.value)}
                                class="bg-element text-plain border-element-accent focus:border-sub/50 w-full rounded-2xl border-2 px-4 py-3 transition-colors outline-none"
                                disabled={isLoading()}
                            />
                            <input
                                type="password"
                                placeholder="Library Password"
                                value={password()}
                                onInput={(e) =>
                                    setPassword(e.currentTarget.value)
                                }
                                class="bg-element text-plain border-element-accent focus:border-sub/50 w-full rounded-2xl border-2 px-4 py-3 transition-colors outline-none"
                                disabled={isLoading()}
                            />

                            <Show when={isURLDuplicate()}>
                                <span class="text-danger px-2 text-xs font-bold">
                                    You are already connected to this server.
                                </span>
                            </Show>
                            <Show when={authError()}>
                                <span class="text-danger px-2 text-xs font-bold">
                                    {authError()}
                                </span>
                            </Show>
                        </div>
                    </Show>
                </div>

                <div class="flex justify-between pt-4">
                    <button
                        type="button"
                        onClick={() => setDisplayedModal('NONE')}
                        disabled={isLoading()}
                        class="bold text-plain bg-danger w-1/3 rounded-2xl p-3 font-bold shadow-sm transition-all hover:-translate-y-1 hover:cursor-pointer hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-50 md:p-4"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={
                            !name().trim() ||
                            isLoading() ||
                            isURLDuplicate() ||
                            (type() === 'server' &&
                                (!url().trim() || !password().trim()))
                        }
                        class="bold bg-success text-plain w-1/3 rounded-2xl p-3 font-bold shadow-sm transition-all hover:-translate-y-1 hover:cursor-pointer hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-50 md:p-4"
                    >
                        <Switch>
                            <Match when={isLoading()}>Connecting...</Match>
                            <Match when={type() === 'local'}>Create</Match>
                            <Match when={type() === 'server'}>Connect</Match>
                        </Switch>
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddLibraryModal
