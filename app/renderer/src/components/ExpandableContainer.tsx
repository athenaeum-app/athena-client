import type { Component, ComponentProps } from 'solid-js'

interface ExpandableContainerProps extends ComponentProps<'div'> {
    expanded: boolean
}

export const ExpandableContainer: Component<ExpandableContainerProps> = (
    props,
) => (
    <div
        class={`grid w-full max-w-[40vw] overflow-hidden transition-all duration-500 ease-in-out ${props.expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
    >
        {props.children}
    </div>
)
