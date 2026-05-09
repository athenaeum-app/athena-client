import {
    createSignal,
    onCleanup,
    Show,
    splitProps,
    type Component,
    type ComponentProps,
} from 'solid-js'

export const ConfirmButton: Component<
    ComponentProps<'button'> & {
        onConfirm?: () => void
        onReject?: () => void
        SharedClasses?: string
        NonConfirmingClasses?: string
        ConfirmingClasses?: string
    }
> = (props) => {
    let buttonRef: HTMLButtonElement | undefined

    const handleClick = (e: MouseEvent) => {
        if (buttonRef && !buttonRef.contains(e.target as Node)) {
            setIsConfirming(false)
        }
    }

    document.addEventListener('click', handleClick)
    onCleanup(() => {
        document.removeEventListener('click', handleClick)
    })

    const [
        {
            SharedClasses = 'bg-plain/20 text-plain/80 hover:text-plain cursor-pointer rounded-lg px-4 py-4 text-sm font-bold text-nowrap transition-all duration-100 hover:scale-105',
        },
        { NonConfirmingClasses },
        { ConfirmingClasses = 'bg-success' },
        _,
        validProps,
    ] = splitProps(
        props,
        ['SharedClasses'],
        ['NonConfirmingClasses'],
        ['ConfirmingClasses'],
        ['onClick', 'class', 'classList', 'ref'],
    )
    const [isConfirming, setIsConfirming] = createSignal(false)
    return (
        <button
            ref={buttonRef}
            onClick={() => {
                if (isConfirming()) {
                    setIsConfirming(false)
                    return props.onConfirm?.()
                } else {
                    setIsConfirming(true)
                    return props.onReject?.()
                }
            }}
            class={`${SharedClasses ?? ''} ${isConfirming() ? ConfirmingClasses : NonConfirmingClasses}`}
            {...validProps}
        >
            <Show when={!isConfirming()} fallback={<span>Confirm?</span>}>
                {props.children}
            </Show>
        </button>
    )
}
