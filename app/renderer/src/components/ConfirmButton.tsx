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
        if (e.target != buttonRef) {
            setIsConfirming(false)
        }
    }

    document.addEventListener('click', handleClick)
    onCleanup(() => {
        document.removeEventListener('click', handleClick)
    })

    const [
        { SharedClasses },
        { NonConfirmingClasses },
        { ConfirmingClasses },
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
