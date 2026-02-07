const { contextBridge, ipcRenderer } = require('electron');

console.log('========================================');
console.log('PRELOAD.JS IS LOADING!');
console.log('========================================');

// Exposuj API do renderer procesu (React app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Zoznam sériových portov
  listSerialPorts: () => {
    console.log('electronAPI.listSerialPorts called');
    return ipcRenderer.invoke('list-serial-ports');
  },
  
  // Otvor port
  openSerialPort: (portPath) => {
    console.log('electronAPI.openSerialPort called with:', portPath);
    return ipcRenderer.invoke('open-serial-port', portPath);
  },
  
  // Pošli príkaz
  sendSerialCommand: (command) => {
    console.log('electronAPI.sendSerialCommand called with:', command);
    return ipcRenderer.invoke('send-serial-command', command);
  },
  
  // Zatvor port
  closeSerialPort: () => {
    console.log('electronAPI.closeSerialPort called');
    return ipcRenderer.invoke('close-serial-port');
  },
  
  // Konfiguruj ESP32 WiFi (wrapper pre jednoduchosť)
  configureESP32WiFi: (portPath, ssid, password) => {
    console.log('electronAPI.configureESP32WiFi called');
    return ipcRenderer.invoke('configure-esp32-wifi', { portPath, ssid, password });
  },
  
  // Počúvaj na dáta z ESP32
  onESP32Data: (callback) => {
    console.log('electronAPI.onESP32Data listener registered');
    ipcRenderer.on('esp32-data', (event, data) => callback(data));
  },
  
  // Odstráň listener
  removeESP32DataListener: () => {
    console.log('electronAPI.removeESP32DataListener called');
    ipcRenderer.removeAllListeners('esp32-data');
  }
});

console.log('========================================');
console.log('ELECTRON API EXPOSED!');
console.log('Available methods:', Object.keys(window.electronAPI || {}));
console.log('========================================');