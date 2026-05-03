import { createSignal, Match, Show, type Component } from 'solid-js'
import { setDisplayedModal } from '../modules/globals'
import {
    libraries,
    setLibraries,
    setActiveLibraryId,
    initializeNewLibrary,
    type LibraryType,
    type Library,
} from '../modules/data'
import { Switch } from 'solid-js'

const AddLibraryModal: Component = () => {
    const [name, setName] = createSignal('')
    const [type, setType] = createSignal<LibraryType>('local')
    const [url, setUrl] = createSignal('')

    const handleSubmit = (e: Event) => {
        e.preventDefault()
        if (!name().trim() || (type() === 'server' && !url().trim())) return

        const newLib: Library = {
            id: `${type()}-${Date.now()}`,
            name: name().trim(),
            type: type(),
            url: type() === 'server' ? `http://${url().trim()}` : undefined,
        }

        initializeNewLibrary(newLib.id)
        setLibraries([...libraries(), newLib])
        setActiveLibraryId(newLib.id)
        setDisplayedModal('NONE')
    }

    return (
        <div class="border-sub bg-element-matte flex w-xs flex-col gap-6 rounded-4xl border-4 p-8 shadow-2xl md:w-lg">
            <h1 class="text-plain pt-2 text-center text-xl font-bold">
                Add Library
            </h1>
            <p class="text-sub text-center font-bold">
                Create a local library or connect to an online library.
            </p>

            <form onSubmit={handleSubmit} class="flex flex-col gap-4">
                {/* Type Toggle */}
                <div class="bg-element flex rounded-2xl p-1 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setType('local')}
                        class={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${type() === 'local' ? 'bg-element-accent text-plain shadow-sm' : 'text-sub hover:text-plain'}`}
                    >
                        Local Library
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('server')}
                        class={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${type() === 'server' ? 'bg-element-accent text-plain shadow-sm' : 'text-sub hover:text-plain'}`}
                    >
                        Online Library
                    </button>
                </div>

                {/* Inputs */}
                <div class="flex flex-col gap-3">
                    <Show when={type() !== 'server'}>
                        <input
                            type="text"
                            placeholder="Library Name"
                            value={name()}
                            onInput={(e) => setName(e.currentTarget.value)}
                            class="bg-element text-plain border-element-accent focus:border-sub/50 w-full rounded-2xl border-2 px-4 py-3 transition-colors outline-none"
                            autofocus
                        />
                    </Show>
                    <Show when={type() === 'server'}>
                        <input
                            type="text"
                            placeholder="IP Address"
                            value={url()}
                            onInput={(e) => setUrl(e.currentTarget.value)}
                            class="bg-element text-plain border-element-accent focus:border-sub/50 w-full rounded-2xl border-2 px-4 py-3 transition-colors outline-none"
                        />
                    </Show>
                </div>

                {/* Actions */}
                <div class="flex justify-between pt-4">
                    <button
                        type="button"
                        onClick={() => setDisplayedModal('NONE')}
                        class="bold text-plain bg-danger w-1/3 rounded-2xl p-3 font-bold shadow-sm transition-all hover:-translate-y-1 hover:cursor-pointer hover:shadow-md active:scale-95 md:p-4"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={
                            (type() === 'local' && !name().trim()) ||
                            (type() === 'server' && !url().trim())
                        }
                        class="bold bg-success text-plain w-1/3 rounded-2xl p-3 font-bold shadow-sm transition-all hover:-translate-y-1 hover:cursor-pointer hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-50 md:p-4"
                    >
                        <Switch>
                            <Match when={type() === 'server'}>Join</Match>
                            <Match when={type() === 'local'}>Create</Match>
                        </Switch>
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddLibraryModal
