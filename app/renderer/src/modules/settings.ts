export interface AppSettings {
    uiScale: number
    fontFamily: string

    enableTransitions: boolean

    activeTheme: 'light' | 'dark' | 'neutral' | string

    autoBackupEnabled: boolean
    maxBackupSizeMB: number
}

export const defaultSettings: AppSettings = {
    uiScale: 100,
    fontFamily: 'Inter, sans-serif',
    enableTransitions: true,
    activeTheme: 'dark',
    autoBackupEnabled: true,
    maxBackupSizeMB: 500,
}
