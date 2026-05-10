import { type Component, createEffect } from 'solid-js'
import {
    inspectingImage,
    inspectingImageExternalLink,
    setInspectingImageExternalLink,
} from '../modules/store'
import { getApi } from '../modules/ipc_client'
import { URL_FILE_REGEX, URL_REGEX } from '../modules/regex'
import { displayedModal } from '../modules/globals'
export const ImageInspectModal: Component = () => {
    createEffect(() => {
        if (displayedModal() !== 'IMAGE_INSPECT_MODAL') {
            setInspectingImageExternalLink()
        }
    })

    return (
        <div class="relative flex flex-col items-center gap-4">
            <div class="border-sub bg-element-matte overflow-hidden rounded-2xl border-4 shadow-2xl">
                <img
                    alt="Expanded Preview"
                    class="max-h-[80vh] max-w-[80vw] min-w-3xl object-contain"
                    src={inspectingImage()}
                />
            </div>

            <a
                onClick={() => {
                    const externalLink = inspectingImageExternalLink()
                        ? inspectingImageExternalLink()
                        : inspectingImage()
                    if (externalLink) {
                        if (externalLink.match(URL_REGEX)) {
                            getApi().openExternalBrowser(externalLink)
                        } else if (externalLink.match(URL_FILE_REGEX)) {
                            getApi().openFileFromURI(externalLink)
                        }
                    }
                }}
                target="_blank"
                rel="noopener noreferrer"
                class="bg-element-matte hover:bg-element-matte/80 text-sub hover:text-sub flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
            >
                <span class="material-symbols-outlined text-lg">
                    open_in_new
                </span>
                Open External
            </a>
        </div>
    )
}

export default ImageInspectModal
