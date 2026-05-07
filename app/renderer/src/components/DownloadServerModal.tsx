import { type Component } from 'solid-js'
import {
    isDownloading as isDownloadingServer,
    serverDownloadLibName,
    setServerDownloadLibName,
} from '../modules/store'
import { setDisplayedModal } from '../modules/globals'
import { downloadNewLibrary } from '../modules/libraries'

export const DownloadServerModal: Component = (props) => {
    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div class="bg-element border-element-accent w-full max-w-sm rounded-xl border p-5 shadow-xl">
                <h3 class="text-main mb-2 text-lg font-bold">
                    Create Local Copy
                </h3>
                <p class="text-sub mb-4 text-sm leading-relaxed">
                    Enter a name for your new local library. This new library
                    will be contain a duplicate of the selected server's data.
                </p>

                <input
                    type="text"
                    placeholder="Library Name"
                    value={serverDownloadLibName()}
                    onInput={(e) =>
                        setServerDownloadLibName(e.currentTarget.value)
                    }
                    class="bg-element-lighter text-main border-element-accent focus:border-sub/50 mb-4 w-full rounded-md border px-3 py-2 text-sm outline-none"
                    autofocus
                />

                <div class="flex justify-end gap-2">
                    <button
                        disabled={isDownloadingServer()}
                        onClick={() => {
                            setDisplayedModal('NONE')
                        }}
                        class="text-sub hover:bg-element-accent rounded-md px-4 py-2 text-sm font-bold transition-colors hover:cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            downloadNewLibrary()
                            setDisplayedModal('NONE')
                        }}
                        disabled={isDownloadingServer()}
                        class="bg-success/20 text-success hover:bg-success/30 rounded-md px-4 py-2 text-sm font-bold transition-colors hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Create & Download
                    </button>
                </div>
            </div>
        </div>
    )
}
