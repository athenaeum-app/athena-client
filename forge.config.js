import path from 'node:path'

export default {
    packagerConfig: {
        name: 'Athena',
        executableName: 'athena',
        icon: path.join(__dirname, 'assets', 'icon'),
        asar: true,
    },
    makers: [
        // Windows
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'athena',
                setupIcon: path.join(__dirname, 'assets', 'icon.ico'),
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
            config: {
                name: 'athena',
                setupIcon: path.join(__dirname, 'assets', 'icon.icon'),
            },
        },

        // Debian (ubuntu)
        {
            name: '@electron-forge/maker-deb',
            config: {
                name: 'athena',
                options: {
                    icon: path.join(__dirname, 'assets', 'icon.png'),
                },
            },
        },

        // Fedora
        {
            name: '@electron-forge/maker-rpm',
            config: {
                name: 'athena',
                options: {
                    icon: path.join(__dirname, 'assets', 'icon.png'),
                },
            },
        },
    ],
}
