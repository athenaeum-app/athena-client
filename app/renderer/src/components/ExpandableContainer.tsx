import type { Component, ComponentProps } from 'solid-js'

interface ExpandableContainerProps extends ComponentProps<'div'> {
    expanded: boolean
}

export const ExpandableContainer: Component<ExpandableContainerProps> = (
    props,
) => (
    <div
        class={`grid w-full overflow-hidden transition-all duration-1500 ease-in-out ${props.expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
    >
        <div class="overflow-hidden">{props.children}</div>
    </div>
)
