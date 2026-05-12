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
        ConfirmedMessage?: string
        Cooldown?: number
        Text: string
    }
> = (props) => {
    let buttonRef: HTMLButtonElement | undefined

    const handleClick = (e: MouseEvent) => {
        if (buttonRef && !buttonRef.contains(e.target as Node)) {
            setIsConfirming(false)
        }
    }

    const [IsInCooldown, setIsInCooldown] = createSignal(false)

    document.addEventListener('click', handleClick)
    onCleanup(() => {
        document.removeEventListener('click', handleClick)
    })

    if (!props.SharedClasses) {
        props.SharedClasses =
            'bg-plain/20 text-plain/80 hover:text-plain cursor-pointer rounded-lg p-2 lg:p-4 lg:text-sm font-bold text-nowrap transition-all duration-100 hover:scale-105'
    }

    if (!props.ConfirmingClasses) {
        props.ConfirmingClasses = 'bg-success'
    }

    const [_, validProps] = splitProps(props, [
        'onClick',
        'class',
        'classList',
        'ref',
        'SharedClasses',
        'NonConfirmingClasses',
        'ConfirmingClasses',
        'ConfirmedMessage',
        'Text',
        'Cooldown',
    ])
    const [isConfirming, setIsConfirming] = createSignal(false)
    return (
        <button
            ref={buttonRef}
            onClick={() => {
                if (isConfirming()) {
                    setIsConfirming(false)
                    if (props.Cooldown && props.Cooldown > 0) {
                        setIsInCooldown(true)
                        setTimeout(() => {
                            setIsInCooldown(false)
                        }, props.Cooldown * 1000)
                    }
                    return props.onConfirm?.()
                } else {
                    setIsConfirming(true)

                    return props.onReject?.()
                }
            }}
            disabled={IsInCooldown()}
            class={`${props.SharedClasses ?? ''} ${isConfirming() ? props.ConfirmingClasses : props.NonConfirmingClasses} `}
            {...validProps}
        >
            <Show when={!isConfirming()} fallback={<span>Confirm?</span>}>
                {IsInCooldown()
                    ? (props.ConfirmedMessage ?? props.Text)
                    : props.Text}
            </Show>
        </button>
    )
}
