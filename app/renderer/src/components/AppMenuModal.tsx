import {
    createSignal,
    Switch,
    Match,
    type Component,
    For,
    Show,
    type ComponentProps,
} from 'solid-js'
import {
    appVersion,
    setDisplayedModal,
    appSettings,
    systemFonts,
} from '../modules/globals'
import { updateSetting } from '../modules/actions'
import { Button } from './Button'

type MenuTab = 'general' | 'appearance' | 'media' | 'about'

export const AppMenuModal: Component = () => {
    const [activeTab, setActiveTab] = createSignal<MenuTab>('general')

    return (
        <div
            class="flex items-center justify-center p-4 transition-all"
            onClick={(e) => {
                if (e.target === e.currentTarget) setDisplayedModal('NONE')
            }}
        >
            <div class="bg-element-matte border-sub flex h-[80vh] w-full overflow-hidden rounded-3xl border-4 shadow-2xl">
                <div class="bg-element border-highlight flex w-sm shrink-0 flex-col gap-2 border-r-2 p-6">
                    <div class="mb-4 flex items-center justify-between">
                        <h2 class="text-sub text-xl font-black tracking-tighter">
                            Athena
                        </h2>
                        <span class="text-sub text-xs font-bold tracking-widest">
                            {appVersion}
                        </span>
                    </div>

                    <div class="flex flex-col gap-1">
                        <span class="text-sub mt-2 mb-1 text-xs font-bold tracking-widest uppercase">
                            Settings
                        </span>
                        <TabButton
                            id="general"
                            icon="settings"
                            label="General"
                            active={activeTab() === 'general'}
                            onClick={() => setActiveTab('general')}
                        />
                        <TabButton
                            id="appearance"
                            icon="palette"
                            label="Appearance"
                            active={activeTab() === 'appearance'}
                            onClick={() => setActiveTab('appearance')}
                        />

                        <span class="text-sub mt-4 mb-1 text-xs font-bold tracking-widest uppercase">
                            Library
                        </span>
                        <TabButton
                            id="media"
                            icon="perm_media"
                            label="Media Manager"
                            active={activeTab() === 'media'}
                            onClick={() => setActiveTab('media')}
                        />
                    </div>

                    <div class="mt-auto">
                        <button
                            onClick={() => setDisplayedModal('NONE')}
                            class="hover:bg-element-lighter text-sub hover:text-sub flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 font-bold transition-colors"
                        >
                            <span class="material-symbols-outlined text-lg">
                                close
                            </span>
                            Close Menu
                        </button>
                    </div>
                </div>

                <div class="w-4xl flex-1 overflow-y-auto p-10">
                    <Switch>
                        <Match when={activeTab() === 'general'}>
                            <GeneralSettingsView />
                        </Match>
                        <Match when={activeTab() === 'appearance'}>
                            <AppearanceSettingsView />
                        </Match>
                        <Match when={activeTab() === 'media'}>
                            <MediaManagerView />
                        </Match>
                    </Switch>
                </div>
            </div>
        </div>
    )
}

const TabButton: Component<{
    id: MenuTab
    icon: string
    label: string
    active: boolean
    onClick: () => void
}> = (props) => (
    <button
        onClick={props.onClick}
        class={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
            props.active
                ? 'bg-element-accent text-sub shadow-md'
                : 'text-sub hover:bg-element-lighter hover:text-sub'
        }`}
    >
        <span class="material-symbols-outlined text-lg">{props.icon}</span>
        {props.label}
    </button>
)

const GeneralSettingsView: Component = () => {
    const [scaleBuffer, setScaleBuffer] = createSignal(appSettings().uiScale)
    return (
        <div class="animate-fade-in flex flex-col gap-10">
            <div>
                <h1 class="text-sub text-3xl font-black tracking-tight">
                    General Settings
                </h1>
                <p class="text-sub">
                    Configure scaling, fonts, and application behavior.
                </p>
            </div>

            <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                    <span class="text-sub text-xs font-bold tracking-widest uppercase">
                        UI Scale
                    </span>
                    <span class="text-highlight-strong font-black">
                        {scaleBuffer()}%
                    </span>
                </div>
                <input
                    type="range"
                    min="75"
                    max="150"
                    step="5"
                    value={scaleBuffer()}
                    onInput={(e) => {
                        setScaleBuffer(parseInt(e.target.value))
                    }}
                    onChange={() => {
                        updateSetting('uiScale', scaleBuffer())
                    }}
                    class="bg-element-accent accent-highlight-strongest h-2 w-full cursor-pointer appearance-none rounded-lg"
                />
                <p class="text-sub text-sm italic">
                    Changes may take some time to apply.
                </p>
            </div>

            <div class="flex flex-col gap-3">
                <span class="text-sub text-xs font-bold tracking-widest uppercase">
                    Global Font
                </span>
                <select
                    value={appSettings().fontFamily}
                    onChange={(e) =>
                        updateSetting('fontFamily', e.target.value)
                    }
                    class="bg-element-accent text-sub cursor-pointer rounded-xl p-3 font-bold transition-colors outline-none"
                >
                    <optgroup label="Recommended">
                        <option value="Inter, sans-serif">
                            Inter (Default)
                        </option>
                        <option value="system-ui, sans-serif">System UI</option>
                        <option value="monospace">System Monospace</option>
                    </optgroup>

                    <Show when={systemFonts() && systemFonts()!.length > 0}>
                        <optgroup label="Installed on your PC">
                            <For each={systemFonts()}>
                                {(font) => (
                                    <option value={`"${font}", sans-serif`}>
                                        {font}
                                    </option>
                                )}
                            </For>
                        </optgroup>
                    </Show>

                    <Show when={!systemFonts() || systemFonts()!.length === 0}>
                        <optgroup label="Web Safe (Fallback)">
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="Helvetica, sans-serif">
                                Helvetica
                            </option>
                            <option value="Verdana, sans-serif">Verdana</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="Consolas, monospace">
                                Consolas
                            </option>
                        </optgroup>
                    </Show>
                </select>
            </div>
        </div>
    )
}

const AppearanceSettingsView: Component = () => (
    <div class="animate-fade-in flex flex-col gap-10">
        <div>
            <h1 class="text-sub text-3xl font-black tracking-tight">
                Appearance
            </h1>
            <p class="text-sub">Customize animations and color themes.</p>
        </div>

        <div class="flex flex-col gap-3">
            <span class="text-sub text-xs font-bold tracking-widest uppercase">
                Color Theme
            </span>
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-3">
                    <span class="text-sub text-xs font-bold tracking-widest uppercase">
                        System Themes
                    </span>
                    <div class="grid grid-cols-3 gap-4">
                        <For each={['dark', 'light', 'neutral']}>
                            {(themeId) => (
                                <button
                                    onClick={() =>
                                        updateSetting('activeTheme', themeId)
                                    }
                                    class={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-black capitalize transition-all ${
                                        appSettings().activeTheme === themeId
                                            ? 'border-highlight-strong bg-element-accent text-sub'
                                            : 'border-sub text-sub hover:border-highlight hover:text-sub'
                                    }`}
                                >
                                    {themeId}
                                </button>
                            )}
                        </For>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-col gap-3">
            <span class="text-sub text-xs font-bold tracking-widest uppercase">
                Animations
            </span>
            <label class="bg-element border-sub hover:border-highlight flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors">
                <div>
                    <span class="text-sub block font-bold">
                        Enable UI Transitions
                    </span>
                    <span class="text-sub text-sm">
                        Smooth fades and expanding menus. Disable for
                        performance.
                    </span>
                </div>
                <input
                    type="checkbox"
                    checked={appSettings().enableTransitions}
                    onChange={(e) =>
                        updateSetting('enableTransitions', e.target.checked)
                    }
                    class="accent-highlight-strong h-6 w-6 cursor-pointer rounded"
                />
            </label>
        </div>
    </div>
)

const MediaManagerView: Component = () => (
    <div class="animate-fade-in flex flex-col gap-10">
        <div>
            <h1 class="text-sub text-3xl font-black tracking-tight">
                Media Manager
            </h1>
            <p class="text-sub">
                Manage local attachments, orphaned files, and cache data.
            </p>
        </div>

        <div class="flex flex-col gap-3">
            <span class="text-sub text-xs font-bold tracking-widest uppercase">
                System Caches
            </span>
            <div class="bg-element border-sub flex items-center justify-between rounded-xl border p-4">
                <div>
                    <span class="text-sub block font-bold">
                        Link Preview Cache
                    </span>
                    <span class="text-sub text-sm">
                        Clear stored website metadata and images.
                    </span>
                </div>
                <button class="bg-danger/10 text-danger hover:bg-danger hover:text-sub cursor-pointer rounded-lg px-4 py-2 font-bold transition-colors">
                    Clear Cache
                </button>
            </div>
        </div>

        <div class="flex flex-col gap-3">
            <span class="text-sub text-xs font-bold tracking-widest uppercase">
                Local Files
            </span>
            <div class="bg-element border-sub flex items-center justify-between rounded-xl border p-4">
                <div>
                    <span class="text-sub block font-bold">
                        Scan for Orphaned Media
                    </span>
                    <span class="text-sub text-sm">
                        Find and delete images/videos not linked to any moment.
                    </span>
                </div>
                <button class="bg-highlight-alt/20 text-highlight-alt-strong hover:bg-highlight-alt-strong hover:text-sub cursor-pointer rounded-lg px-4 py-2 font-bold transition-colors">
                    Scan Drive
                </button>
            </div>
        </div>
    </div>
)
