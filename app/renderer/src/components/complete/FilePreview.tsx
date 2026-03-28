import { createMemo, Show, type Component, type ComponentProps } from 'solid-js'
import { getApi } from '../../modules/ipc_client'

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif']

export const FilePreview: Component<
    ComponentProps<'div'> & {
        uri: string
    }
> = (props) => {
    const isImage = createMemo(() => {
        const extension = props.uri.split('.').reverse()[0]
        return imageExtensions.includes(extension)
    })
    return (
        <div class="groupm bg-highlight border-sub hover:border-highlight-strongest flex w-full flex-col justify-center gap-1 rounded border-2 transition-all duration-300">
            <Show when={isImage()}>
                <div
                    class="hover:cursor-pointer"
                    onClick={() => {
                        getApi().openFileFromURI(props.uri)
                    }}
                >
                    <div class="flex w-full flex-col gap-2 p-2">
                        <span class="text-highlight-alt-strong text-lg font-black">
                            Image
                        </span>
                        <img src={props.uri} class="w-full"></img>
                    </div>
                </div>
            </Show>
        </div>
    )
}
