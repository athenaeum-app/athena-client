export interface AppSettings {
    uiScale: number
    fontFamily: string

    enableTransitions: boolean
    transitionSpeed: number

    activeTheme: 'light' | 'dark' | 'neutral' | string

    highlightSelectedTagsInMoments: boolean

    autoBackupEnabled: boolean
    maxBackupSizeMB: number
}

export const defaultSettings: AppSettings = {
    uiScale: 100,
    highlightSelectedTagsInMoments: false,
    fontFamily: 'Inter, sans-serif',
    enableTransitions: true,
    activeTheme: 'dark',
    autoBackupEnabled: true,
    maxBackupSizeMB: 500,
    transitionSpeed: 1,
}
