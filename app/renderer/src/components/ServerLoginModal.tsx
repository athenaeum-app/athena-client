import { createSignal, Show, type Component } from 'solid-js'
import {
    activeLibraryId,
    libraries,
    updateActiveLibrary,
    flushActionQueue,
} from '../modules/data'
import { setDisplayedModal } from '../modules/globals'

export const ServerLoginModal: Component = () => {
    const [password, setPassword] = createSignal('')
    const [isLoggingIn, setIsLoggingIn] = createSignal(false)
    const [errorMsg, setErrorMsg] = createSignal('')

    const activeLib = () => libraries().find((l) => l.id === activeLibraryId())

    const handleLogin = async () => {
        const lib = activeLib()
        if (!lib || !lib.url) return

        setIsLoggingIn(true)
        setErrorMsg('')

        try {
            const res = await fetch(`${lib.url}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password() }),
            })

            if (!res.ok) throw new Error('Invalid password')

            const data = await res.json()

            updateActiveLibrary({
                token: data.token,
                role: data.role || 'admin',
                syncStatus: 'syncing',
            })

            setDisplayedModal('NONE')

            await flushActionQueue()
        } catch (err) {
            setErrorMsg('Incorrect password. Please try again.')
            setPassword('')
        } finally {
            setIsLoggingIn(false)
        }
    }

    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div class="bg-element border-element-accent flex w-[400px] flex-col gap-4 rounded-xl border p-6 shadow-2xl">
                <div class="flex flex-col gap-1">
                    <h2 class="text-main text-lg font-black tracking-wide">
                        Session Expired
                    </h2>
                    <p class="text-sub text-sm">
                        Please re-enter the password for{' '}
                        <strong>{activeLib()?.name}</strong> to resume syncing
                        your changes.
                    </p>
                </div>

                <div class="flex flex-col gap-2">
                    <input
                        type="password"
                        placeholder="Server Password..."
                        value={password()}
                        onInput={(e) => setPassword(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLogin()
                            if (e.key === 'Escape') setDisplayedModal('NONE')
                        }}
                        class="bg-element-matte text-plain border-element-accent focus:border-highlight-strong w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none"
                        autofocus
                    />
                    <Show when={errorMsg()}>
                        <span class="text-danger text-xs font-bold">
                            {errorMsg()}
                        </span>
                    </Show>
                </div>

                <div class="mt-2 flex justify-end gap-3">
                    <button
                        onClick={() => setDisplayedModal('NONE')}
                        class="text-sub hover:bg-element-lighter rounded-md px-4 py-2 text-sm font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleLogin}
                        disabled={isLoggingIn() || !password()}
                        class="bg-highlight hover:bg-highlight-strong text-plain rounded-md px-4 py-2 text-sm font-bold tracking-wider shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoggingIn() ? 'Authenticating...' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    )
}
