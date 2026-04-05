module.exports = {
  appId: "com.briefvid.desktop",
  productName: "BriefVid",
  artifactName: "${productName}-${version}-${os}-${arch}-Setup.${ext}",
  directories: {
    output: "../../dist/desktop"
  },
  files: [
    "dist-electron/**/*"
  ],
  extraResources: [
    {
      "from": "../../dist/BriefVid",
      "to": "backend/BriefVid"
    },
    {
      "from": "../../apps/web/static/favicon.ico",
      "to": "icon.ico"
    }
  ],
  win: {
    "target": [
      {
        "target": "nsis",
        "arch": [
          "x64"
        ]
      }
    ],
    "icon": "../../apps/web/static/favicon.ico",
    "sign": null,
    "signAndEditExecutable": false,
    "signDlls": false,
    "requestedExecutionLevel": "asInvoker"
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    perMachine: false
  },
  // Disable code signing completely
  afterSign: null
};
