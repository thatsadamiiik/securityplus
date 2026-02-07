import React, { useState, useEffect } from 'react';
import { Usb, Wifi, RefreshCw, X, Check, AlertCircle } from 'lucide-react';

// Komponent pre konfiguráciu ESP32 cez USB
const ESP32USBConfig = ({ isOpen, onClose, onSuccess }) => {
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState(null);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [esp32Output, setEsp32Output] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // NOVÉ: State pre sledovanie Electron API
  const [electronChecked, setElectronChecked] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  // OPRAVENÉ: Kontrola Electron API s oneskorením
  useEffect(() => {
    const checkElectron = () => {
      console.log('=== ELECTRON CHECK ===');
      console.log('window exists:', typeof window !== 'undefined');
      console.log('window.electronAPI exists:', !!(window && window.electronAPI));
      
      if (window && window.electronAPI) {
        console.log('electronAPI keys:', Object.keys(window.electronAPI));
        console.log('listSerialPorts type:', typeof window.electronAPI.listSerialPorts);
        console.log('configureESP32WiFi type:', typeof window.electronAPI.configureESP32WiFi);
      }
      
      const hasElectron = typeof window !== 'undefined' && 
                         window.electronAPI &&
                         typeof window.electronAPI.listSerialPorts === 'function';
      
      console.log('isElectron result:', hasElectron);
      console.log('======================');
      
      setIsElectron(hasElectron);
      setElectronChecked(true);
    };

    // Počkaj chvíľu na načítanie preload.js
    const timer = setTimeout(checkElectron, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen && isElectron) {
      scanPorts();
      
      // Počúvaj na výstup z ESP32
      if (window.electronAPI.onESP32Data) {
        window.electronAPI.onESP32Data((data) => {
          setEsp32Output(prev => [...prev, data].slice(-20));
        });
      }

      return () => {
        if (window.electronAPI.removeESP32DataListener) {
          window.electronAPI.removeESP32DataListener();
        }
      };
    }
  }, [isOpen, isElectron]);

  const scanPorts = async () => {
    if (!isElectron) {
      console.error('Cannot scan ports: Electron API not available');
      return;
    }
    
    setIsScanning(true);
    setError('');
    
    try {
      console.log('Calling listSerialPorts...');
      const result = await window.electronAPI.listSerialPorts();
      console.log('listSerialPorts result:', result);
      
      if (result.success) {
        setAvailablePorts(result.ports);
        if (result.ports.length === 1) {
          setSelectedPort(result.ports[0].path);
        }
        if (result.ports.length === 0) {
          setError('Nenašli sa žiadne ESP32 zariadenia. Skontrolujte USB pripojenie.');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Scan ports error:', err);
      setError('Chyba pri skenovaní portov: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfigure = async () => {
    if (!isElectron || !selectedPort || !ssid) {
      setError('Vyplňte všetky polia a vyberte port');
      return;
    }

    setIsConfiguring(true);
    setError('');
    setSuccess(false);
    setEsp32Output([]);

    try {
      console.log('Configuring ESP32 with:', { selectedPort, ssid, password: '***' });
      
      const result = await window.electronAPI.configureESP32WiFi(
        selectedPort,
        ssid,
        password
      );

      console.log('Configuration result:', result);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 3000);
      } else {
        setError(result.error || 'Konfigurácia zlyhala');
      }
    } catch (err) {
      console.error('Configuration error:', err);
      setError('Chyba: ' + err.message);
    } finally {
      setIsConfiguring(false);
    }
  };

  if (!isOpen) return null;

  // Počkaj na kontrolu Electron API
  if (!electronChecked) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 max-w-md w-full">
          <div className="text-center">
            <RefreshCw size={48} className="text-cyan-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-4">Načítavam...</h2>
            <p className="text-gray-400">Kontrolujem dostupnosť USB rozhrania</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isElectron) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 max-w-md w-full">
          <div className="text-center">
            <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Funkcia nedostupná</h2>
            <p className="text-gray-400 mb-4">
              USB konfigurácia nie je dostupná v tejto verzii aplikácie.
            </p>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-400 mb-2">Debug informácie:</p>
              <pre className="text-xs text-gray-500 overflow-x-auto">
                {JSON.stringify({
                  hasWindow: typeof window !== 'undefined',
                  hasElectronAPI: !!(window && window.electronAPI),
                  electronAPIMethods: window?.electronAPI ? Object.keys(window.electronAPI) : []
                }, null, 2)}
              </pre>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
            >
              Zavrieť
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
              <Usb size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Konfigurácia ESP32 cez USB</h2>
              <p className="text-sm text-gray-400">Nastavte WiFi pripojenie pre váš ESP32</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <Check size={20} className="text-green-400" />
            <p className="text-green-400">WiFi credentials úspešne odoslané na ESP32!</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Výber portu */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">
                USB Port (ESP32)
              </label>
              <button
                onClick={scanPorts}
                disabled={isScanning}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                Skenovať
              </button>
            </div>

            {availablePorts.length === 0 && !isScanning && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">
                  Nenašli sa žiadne ESP32 zariadenia. Pripojte ESP32 cez USB kábel a stlačte "Skenovať".
                </p>
              </div>
            )}

            {availablePorts.length > 0 && (
              <select
                value={selectedPort || ''}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Vyberte port...</option>
                {availablePorts.map(port => (
                  <option key={port.path} value={port.path}>
                    {port.path} - {port.manufacturer || 'Neznámy'} {port.productId ? `(${port.productId})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* WiFi SSID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Wifi size={16} className="inline mr-2" />
              WiFi SSID (Názov siete)
            </label>
            <input
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="MojaDomacnostWiFi"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* WiFi Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Heslo WiFi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nechajte prázdne, ak WiFi nemá heslo
            </p>
          </div>

          {/* ESP32 Output Console */}
          {esp32Output.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Výstup z ESP32
              </label>
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-xs max-h-48 overflow-y-auto">
                {esp32Output.map((line, idx) => (
                  <div key={idx} className="text-green-400">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tlačidlá */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              disabled={isConfiguring}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50"
            >
              Zrušiť
            </button>
            <button
              onClick={handleConfigure}
              disabled={isConfiguring || !selectedPort || !ssid}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isConfiguring ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Konfigurujem...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Nastaviť WiFi
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Inštrukcie:</h3>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Pripojte ESP32 k počítaču cez USB kábel</li>
              <li>Stlačte "Skenovať" pre nájdenie zariadení</li>
              <li>Vyberte správny USB port</li>
              <li>Vyplňte SSID a heslo vašej WiFi siete</li>
              <li>Kliknite "Nastaviť WiFi"</li>
              <li>Počkajte na potvrdenie z ESP32</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ESP32USBConfig;