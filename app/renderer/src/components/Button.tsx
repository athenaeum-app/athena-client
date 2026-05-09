import { splitProps, type Component, type ComponentProps } from 'solid-js'

export const Button: Component<ComponentProps<'button'>> = (props) => {
    const [someProps, validProps] = splitProps(props, ['class', 'children'])
    return (
        <button
            class={
                someProps.class ??
                `bg-plain/20 text-plain/80 hover:text-plain min-w[5vw] cursor-pointer rounded-lg px-4 py-4 text-sm font-bold text-nowrap transition-all duration-100 hover:scale-105 active:scale-95 active:transition-none`
            }
            {...validProps}
        >
            {props.children}
        </button>
    )
}
