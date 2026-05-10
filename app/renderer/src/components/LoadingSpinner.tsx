import { Show, type Component } from 'solid-js'

export const LoadingSpinner: Component<{ text?: string }> = (props) => (
    <div class="text-sub flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs">
        <div class="border-sub h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" />
        <Show when={props.text}>
            <span class="animate-pulse font-medium tracking-wide">
                {props.text}
            </span>
        </Show>
    </div>
)
