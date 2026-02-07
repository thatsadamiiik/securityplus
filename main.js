const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

let mainWindow;
let currentPort = null;
let parser = null;

// Lista dostupných portov
async function listPorts() {
  try {
    const ports = await SerialPort.list();
    // Filtruj iba ESP32 zariadenia (môžu mať rôzne názvy)
    const espPorts = ports.filter(port => {
      const description = (port.manufacturer || '').toLowerCase();
      const productId = (port.productId || '').toLowerCase();
      return description.includes('silicon labs') || 
             description.includes('ch340') || 
             description.includes('cp210') ||
             description.includes('ftdi') ||
             productId.includes('ea60');
    });
    return espPorts;
  } catch (error) {
    console.error('Error listing ports:', error);
    return [];
  }
}

// Otvor sériový port
async function openPort(portPath) {
  try {
    if (currentPort && currentPort.isOpen) {
      currentPort.close();
    }

    currentPort = new SerialPort({
      path: portPath,
      baudRate: 115200,
      autoOpen: false
    });

    parser = currentPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    return new Promise((resolve, reject) => {
      currentPort.open((err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Port ${portPath} opened successfully`);
          
          // Počúvaj na dáta z ESP32
          parser.on('data', (data) => {
            console.log('ESP32:', data);
            if (mainWindow) {
              mainWindow.webContents.send('esp32-data', data.trim());
            }
          });

          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error opening port:', error);
    throw error;
  }
}

// Pošli príkaz na ESP32
function sendCommand(command) {
  return new Promise((resolve, reject) => {
    if (!currentPort || !currentPort.isOpen) {
      reject(new Error('Port is not open'));
      return;
    }

    currentPort.write(command + '\n', (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Command sent:', command);
        resolve(true);
      }
    });
  });
}

// Zatvor port
function closePort() {
  if (currentPort && currentPort.isOpen) {
    currentPort.close();
    currentPort = null;
    parser = null;
  }
}

function createWindow() {
  // OPRAVENÉ: Správna cesta k preload.js v development aj production
  // V development mode je main.js zvyčajne spustený z root, takže preload.js je v rovnakom adresári
  // V production (packaged) je potrebné upraviť podľa štruktúry balíka
  const preloadPath = path.join(__dirname, 'preload.js');
  
  console.log('========================================');
  console.log('Creating Electron window');
  console.log('__dirname:', __dirname);
  console.log('preload path:', preloadPath);
  console.log('preload exists:', fs.existsSync(preloadPath));
  console.log('app.isPackaged:', app.isPackaged);
  console.log('========================================');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      // PRIDANÉ: Pre debug účely
      devTools: true
    },
    frame: true,
    backgroundColor: '#0f172a',
    title: 'SecurityPlus'
  });

  // V produkcii načítaj build, vo vývoji dev server
  if (app.isPackaged) {
    mainWindow.loadFile('dist/index.html');
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // DevTools v development mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  // PRIDANÉ: Log keď je window pripravené
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('========================================');
    console.log('Window finished loading');
    console.log('========================================');
  });
}

// IPC Handlers
ipcMain.handle('list-serial-ports', async () => {
  console.log('IPC: list-serial-ports called');
  try {
    const ports = await listPorts();
    console.log('Found ports:', ports);
    return { success: true, ports };
  } catch (error) {
    console.error('Error in list-serial-ports:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-serial-port', async (event, portPath) => {
  console.log('IPC: open-serial-port called with:', portPath);
  try {
    await openPort(portPath);
    return { success: true };
  } catch (error) {
    console.error('Error in open-serial-port:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-serial-command', async (event, command) => {
  console.log('IPC: send-serial-command called with:', command);
  try {
    await sendCommand(command);
    return { success: true };
  } catch (error) {
    console.error('Error in send-serial-command:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('close-serial-port', async () => {
  console.log('IPC: close-serial-port called');
  try {
    closePort();
    return { success: true };
  } catch (error) {
    console.error('Error in close-serial-port:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('configure-esp32-wifi', async (event, { portPath, ssid, password }) => {
  console.log('IPC: configure-esp32-wifi called');
  console.log('  portPath:', portPath);
  console.log('  ssid:', ssid);
  console.log('  password:', password ? '***' : '(empty)');
  
  try {
    // Otvor port ak nie je otvorený
    if (!currentPort || !currentPort.isOpen) {
      console.log('Opening port:', portPath);
      await openPort(portPath);
    }

    // Počkaj chvíľu
    await new Promise(resolve => setTimeout(resolve, 500));

    // Pošli CONFIG príkaz
    console.log('Sending CONFIG command');
    await sendCommand('CONFIG');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Pošli WiFi credentials
    const wifiCommand = `SET_WIFI ${ssid} ${password}`;
    console.log('Sending WiFi credentials');
    await sendCommand(wifiCommand);

    // Počkaj na odpoveď
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Configuration completed successfully');
    return { success: true, message: 'WiFi credentials sent to ESP32' };
  } catch (error) {
    console.error('Error in configure-esp32-wifi:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  console.log('========================================');
  console.log('Electron app is ready');
  console.log('========================================');
  createWindow();
});

app.on('window-all-closed', () => {
  closePort(); // Zatvor port pri ukončení
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  closePort();
});