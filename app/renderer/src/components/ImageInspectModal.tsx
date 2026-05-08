import { type Component } from 'solid-js'
import { inspectingImage } from '../modules/store'
import { getApi } from '../modules/ipc_client'
export const ImageInspectModal: Component = () => {
    console.log(inspectingImage())
    return (
        <div class="relative flex flex-col items-center gap-4">
            <div class="border-sub bg-element-matte overflow-hidden rounded-2xl border-4 shadow-2xl">
                <img
                    alt="Expanded Preview"
                    class="min-w-3xl object-contain"
                    src={inspectingImage()}
                />
            </div>

            <a
                onClick={() => {
                    const imageLink = inspectingImage()
                    if (imageLink) {
                        getApi().openExternalBrowser(imageLink)
                    }
                }}
                target="_blank"
                rel="noopener noreferrer"
                class="bg-element-matte hover:bg-element-matte/80 text-sub hover:text-main flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
            >
                <span class="material-symbols-outlined text-lg">
                    open_in_new
                </span>
                Open In Browser
            </a>
        </div>
    )
}

export default ImageInspectModal
