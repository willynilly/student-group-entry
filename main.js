const electron = require('electron')

const {app, BrowserWindow, Menu, ipcMain} = require('electron')

  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  let win

  function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({width: 800, height: 600})
    win.maximize();
    // and load the index.html of the app.
    win.loadFile('index.html')

    // Open the DevTools.
    win.webContents.openDevTools()

    // Emitted when the window is closed.
    win.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      win = null
    })

  }

  function createMenus() {
    const menuTemplate = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Students Data File',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              win.webContents.send('loadstudents');
            }
          },
          {
            id: 'exportsamegroupvectors',
            label: 'Export Same Group Vectors',
            accelerator: 'CmdOrCtrl+E',
            enabled: false,
            click: () => {
              win.webContents.send('exportsamegroupvectors');
            }
          },
          {role: 'quit'}
        ]
      },
      {
        label: 'Report',
        submenu: [
          {
            id: 'reportgroups',
            label: 'Groups',
            enabled: false,
            click: () => {
              win.webContents.send('reportgroups');
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => {
              win.webContents.send('about');
            }
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
  }

  function enableMenuItemsAfterLoaded() {
    Menu.getApplicationMenu().getMenuItemById('exportsamegroupvectors').enabled = true;
    Menu.getApplicationMenu().getMenuItemById('reportgroups').enabled = true;
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', () => {
    createWindow();
    createMenus();
  })

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow()
    }
  })

  ipcMain.on('studentsloaded', (event, args) => {
    enableMenuItemsAfterLoaded();
  });

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
