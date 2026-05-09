import {
    createSignal,
    Switch,
    Match,
    type Component,
    For,
    Show,
    type ComponentProps,
    splitProps,
    type ValidComponent,
} from 'solid-js'
import {
    appVersion,
    setDisplayedModal,
    appSettings,
    systemFonts,
    GetContrastingColourForHSL,
} from '../modules/globals'
import {
    ClearWebsiteCache,
    regenerateAllColours,
    updateSetting,
} from '../modules/actions'
import { allTags, linkPreviewCache, setAllTags } from '../modules/store'
import { Buffer } from 'buffer'
import { ConfirmButton } from './ConfirmButton'
import { Dynamic } from 'solid-js/web'
import { Button } from './Button'
import { getApi } from '../modules/ipc_client'
import { defaultSettings, type AppSettings } from '../modules/settings'
import { TagBar } from './TagBar'

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
                        <Header title="Athena" />
                        <span class="text-sub text-xs font-bold tracking-widest">
                            {appVersion}
                        </span>
                    </div>

                    <SectionContainer>
                        <SubHeader title="Settings" />
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
                        <SubHeader title="Library" />
                        <TabButton
                            id="media"
                            icon="perm_media"
                            label="Media"
                            active={activeTab() === 'media'}
                            onClick={() => setActiveTab('media')}
                        />
                    </SectionContainer>

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

const Card: Component<
    {
        componentName?: ValidComponent
        title: string
        description?: string
    } & ComponentProps<'label'>
> = (props) => {
    const [_, validProps] = splitProps(props, [
        'title',
        'description',
        'class',
        'componentName',
    ])
    return (
        <Dynamic
            component={props.componentName ?? 'div'}
            {...validProps}
            class={`${props.componentName == 'label' ? 'hover:bg-element-accent' : ''} bg-element border-sub flex items-center justify-between rounded-xl border p-4`}
        >
            <div>
                <span class="text-sub block font-bold">{props.title}</span>

                <span class="text-sub text-sm">{props.description}</span>
            </div>
            {props.children}
        </Dynamic>
    )
}

const LargeHeader: Component<{ title: string } & ComponentProps<'div'>> = (
    props,
) => <h1 class="text-sub text-3xl font-black tracking-tight">{props.title}</h1>

const LargeHeaderCaption: Component<
    { caption: string } & ComponentProps<'div'>
> = (props) => (
    <p class="text-sub text-md font-medium tracking-tight">{props.caption}</p>
)

const Header: Component<{ title: string } & ComponentProps<'div'>> = (
    props,
) => (
    <h2 class="text-sub mb-1 text-xl font-bold tracking-tighter">
        {props.title}
    </h2>
)

const SubHeader: Component<{ title: string } & ComponentProps<'div'>> = (
    props,
) => (
    <span class="text-sub mt-2 mb-1 text-xs font-bold tracking-widest uppercase">
        {props.title}
    </span>
)

const SubHeaderCaption: Component<
    { caption: string } & ComponentProps<'div'>
> = (props) => <p class="text-sub text-sm italic">{props.caption}</p>

const SectionContainer: Component<ComponentProps<'div'>> = (props) => (
    <div class="flex flex-col gap-2">{props.children}</div>
)

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

const PageContainer: Component<ComponentProps<'div'>> = (props) => {
    return (
        <div class="animate-fade-in flex flex-col gap-10">{props.children}</div>
    )
}

const GeneralSettingsView: Component = () => {
    const [updateStatus, setUpdateStatus] =
        createSignal<string>('Check for Updates')

    const handleReset = async () => {}

    const handleUpdateCheck = async () => {
        setUpdateStatus('Checking...')

        const result = await getApi().requestUpdateCheck()

        if (result === 'AVAILABLE') {
            setUpdateStatus('Downloading in background...')
        } else if (result === 'UP_TO_DATE') {
            setUpdateStatus('Athena is up to date!')
            setTimeout(() => setUpdateStatus('Check for Updates'), 3000)
        } else {
            setUpdateStatus('Update check failed.')
            setTimeout(() => setUpdateStatus('Check for Updates'), 3000)
        }
    }

    return (
        <PageContainer>
            <SectionContainer>
                <LargeHeader title="General Settings" />
                <LargeHeaderCaption caption="Configure scaling, fonts, and application behavior." />
            </SectionContainer>
            <SectionContainer>
                <SubHeader title="Updates" />
                <Card
                    componentName="div"
                    title="Check for Updates"
                    description="Click to check for the latest version of Athena."
                >
                    <Button
                        disabled={updateStatus() !== 'Check for Updates'}
                        onClick={handleUpdateCheck}
                    >
                        {updateStatus()}
                    </Button>
                </Card>
            </SectionContainer>
            <SectionContainer>
                <SubHeader title="Reset" />
                <Card
                    componentName="div"
                    title="Reset"
                    description="Click to reset all settings to their default values."
                >
                    <ConfirmButton
                        onConfirm={handleReset}
                        Text="Reset"
                        ConfirmedMessage="Settings reset!"
                        Cooldown={1}
                    />
                </Card>
            </SectionContainer>
        </PageContainer>
    )
}

const SliderSetting: Component<{
    key: keyof AppSettings
    min?: number
    max?: number
    step?: number
    label: string
    caption?: string
    suffix?: string
    type?: 'Decimal' | 'Int'
}> = (props) => {
    console.assert(typeof defaultSettings[props.key] === 'number')

    const [scaleBuffer, setScaleBuffer] = createSignal<number>(
        appSettings()[props.key] as number,
    )

    return (
        <>
            <div class="flex items-center justify-between">
                <SubHeader title={props.label} />
                <span class="text-highlight-strong font-black">
                    {scaleBuffer()}
                    {props.suffix}
                </span>
            </div>
            <input
                type="range"
                min={props.min ?? 0}
                max={props.max ?? 100}
                step={props.step ?? 5}
                value={scaleBuffer()}
                onInput={(e) => {
                    if (props?.type === 'Decimal')
                        setScaleBuffer(parseFloat(e.target.value))
                    else setScaleBuffer(parseInt(e.target.value))
                }}
                onChange={() => {
                    updateSetting(props.key, scaleBuffer())
                }}
                class="bg-element-accent accent-highlight-strongest h-2 w-full cursor-pointer appearance-none rounded-lg"
            />
            <Show when={props.caption}>
                <SubHeaderCaption caption={props.caption ?? ''} />
            </Show>
        </>
    )
}

const AppearanceSettingsView: Component = () => {
    // thanks https://gist.github.com/xenozauros/f6e185c8de2a04cdfecf?permalink_comment_id=4193442#gistcomment-4193442
    const hexToHsl = (hex: string, valuesOnly = false) => {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        if (!result) {
            console.log('Failed to parse hex: ' + hex)
            return hex
        }
        let r = parseInt(result[1], 16)
        let g = parseInt(result[2], 16)
        let b = parseInt(result[3], 16)
        let cssString = ''
        ;((r /= 255), (g /= 255), (b /= 255))
        let max = Math.max(r, g, b),
            min = Math.min(r, g, b)
        let h,
            s,
            l = (max + min) / 2
        if (max == min) {
            h = s = 0 // achromatic
        } else {
            let d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0)
                    break
                case g:
                    h = (b - r) / d + 2
                    break
                case b:
                    h = (r - g) / d + 4
                    break
            }
            if (h) {
                h /= 6
            }
        }

        h = Math.round((h ?? 0) * 360)
        s = Math.round(s * 100)
        l = Math.round(l * 100)

        cssString = h + ',' + s + '%,' + l + '%'
        cssString = !valuesOnly ? 'hsl(' + cssString + ')' : cssString

        return cssString
    }

    return (
        <PageContainer>
            <SectionContainer>
                <LargeHeader title="Appearance"></LargeHeader>
                <LargeHeaderCaption caption="Customize animations and color themes."></LargeHeaderCaption>
            </SectionContainer>

            <SectionContainer>
                <Header title="Theme"></Header>
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-3">
                        <SubHeader title="System Themes"></SubHeader>
                        <div class="grid grid-cols-5 gap-4">
                            <For
                                each={[
                                    'dark',
                                    'light',
                                    'neutral',
                                    'rose',
                                    'valentine',
                                    'ocean',
                                    'royal blue',
                                    'sunset',
                                    'arctic',
                                    'rosewood',
                                ]}
                            >
                                {(themeId) => (
                                    <button
                                        onClick={() =>
                                            updateSetting(
                                                'activeTheme',
                                                themeId,
                                            )
                                        }
                                        class={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-black capitalize transition-all ${
                                            appSettings().activeTheme ===
                                            themeId
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
            </SectionContainer>

            <SectionContainer>
                <Header title="Global"></Header>

                <SliderSetting
                    key="uiScale"
                    min={75}
                    max={150}
                    step={5}
                    suffix="%"
                    label="UI Scale"
                    caption="Changes may take some time to apply if animations are enabled."
                />

                <SubHeader title="Font" />
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
            </SectionContainer>

            <SectionContainer>
                <Header title="Animations"></Header>
                <Card
                    componentName="label"
                    title="Enable UI Animations"
                    description="Toggle animations for UI property transitions. May affect performance."
                >
                    <input
                        type="checkbox"
                        checked={appSettings().enableTransitions}
                        onChange={(e) =>
                            updateSetting('enableTransitions', e.target.checked)
                        }
                        class="accent-highlight-strong h-6 w-6 cursor-pointer rounded"
                    />
                </Card>
                <SliderSetting
                    key="transitionSpeed"
                    min={0.1}
                    max={2}
                    step={0.1}
                    suffix="x"
                    label="Transition Speed"
                    type="Decimal"
                />
            </SectionContainer>

            <SectionContainer>
                <SectionContainer>
                    <LargeHeader title="Tags"></LargeHeader>
                    <LargeHeaderCaption caption="Customize your tags here."></LargeHeaderCaption>
                </SectionContainer>
                <SubHeader title="Colours"></SubHeader>
                <SubHeaderCaption caption="Customize the colours of your tags!"></SubHeaderCaption>
                <div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                    <For each={Object.values(allTags)}>
                        {(tag) => {
                            const [hexColourBuffer, setHexColourBuffer] =
                                createSignal('')
                            return (
                                <label
                                    style={{
                                        'background-color': tag.colour,

                                        color: GetContrastingColourForHSL(
                                            tag.colour,
                                        ),
                                    }}
                                    class="relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl p-4 text-sm font-black shadow-sm transition-all hover:scale-105 hover:brightness-110"
                                >
                                    <span class="truncate drop-shadow-sm">
                                        {tag.name}
                                    </span>

                                    <input
                                        type="color"
                                        value={hexColourBuffer()}
                                        onChange={(e) => {
                                            console.log(
                                                'New:',
                                                hexToHsl(e.target.value),
                                            )
                                            setHexColourBuffer(e.target.value)
                                            console.log(hexColourBuffer())
                                            setAllTags(tag.id, {
                                                colour: hexToHsl(
                                                    e.target.value,
                                                ),
                                            })
                                        }}
                                        class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    />
                                </label>
                            )
                        }}
                    </For>
                </div>
            </SectionContainer>
            <SectionContainer>
                <SubHeader title="Generator" />
                <Card
                    title="Generate vibrant colours"
                    description="Click the button below to generate vibrant colours for all tags. This will overwrite all tag colours."
                >
                    <ConfirmButton
                        onConfirm={regenerateAllColours}
                        Text="Generate"
                    ></ConfirmButton>
                </Card>
            </SectionContainer>
        </PageContainer>
    )
}

const MediaManagerView: Component = () => {
    const linkPreviewDataSizeInKB = () =>
        Buffer.byteLength(JSON.stringify(linkPreviewCache)) / 1024

    return (
        <PageContainer>
            <SectionContainer>
                <LargeHeader title="Media Manager"></LargeHeader>
                <LargeHeaderCaption caption="Manage locally stored data."></LargeHeaderCaption>
            </SectionContainer>

            <SectionContainer>
                <Header title="System"></Header>
                <Card
                    componentName="div"
                    title="Website Cache"
                    description="Clear stored website metadata and images. It is
                        recommended to only clear when needed as cache is
                        used to speed up the app and prevent network spam."
                >
                    <ConfirmButton
                        onConfirm={() => ClearWebsiteCache()}
                        SharedClasses="bg-danger/50 text-plain/80 hover:text-plain w-xs cursor-pointer rounded-lg px-2 py-4 text-sm font-bold text-nowrap transition-all duration-100 hover:scale-105"
                        Text={`Clear Cache (${linkPreviewDataSizeInKB().toFixed(2)} KB)`}
                        ConfirmedMessage="Cache cleared!"
                        Cooldown={1}
                    ></ConfirmButton>
                </Card>
            </SectionContainer>
        </PageContainer>
    )
}
