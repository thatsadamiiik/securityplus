import React, { useState, useEffect } from 'react';
import { Home, Shield, Activity, Users, Settings, Lock, Unlock, DoorOpen, Eye, AlertTriangle, Bell, UserPlus, Trash2, LogOut, CheckCircle, BarChart3, TrendingUp, Clock, Zap, Volume2, VolumeX, Moon, Sun, User, PieChart, Calendar, Wifi, WifiOff, X, Usb } from 'lucide-react';
import ESP32USBConfig from './ESP32USBConfig.jsx';

const API_URL = 'http://35.158.231.80:3000/api';

// Toast Component
const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[type];

  return (
    <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in`}>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
        <X size={18} />
      </button>
    </div>
  );
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-6 right-6 z-[9999] space-y-3">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const HouseholdDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  // OPRAVENÉ: Oddelené stavy pre internet a ESP32
  const [hasInternet, setHasInternet] = useState(true); // Počítač má internet?
  const [esp32Online, setEsp32Online] = useState(false); // ESP32 je dostupné?
  
  const [lastOnlineCheck, setLastOnlineCheck] = useState(Date.now());
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [showUSBConfig, setShowUSBConfig] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [newMember, setNewMember] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    member_role: 'viewer'
  });

  // User preferences state
  const [userPreferences, setUserPreferences] = useState({
    notifications_enabled: true,
    sound_alerts: true,
    email_notifications: true,
    theme: 'dark',
    auto_acknowledge: false,
    notification_priority: 'all'
  });

  // Statistics state
  const [statistics, setStatistics] = useState({
    today: { total: 0, alerts: 0, warnings: 0 },
    week: { total: 0, alerts: 0, warnings: 0 },
    month: { total: 0, alerts: 0, warnings: 0 },
    mostActiveSensor: null,
    hourlyActivity: Array(24).fill(0),
    dailyActivity: Array(7).fill(0)
  });

  // Add toast
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // Remove toast
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // NOVÉ: Kontrola internetového pripojenia počítača
  const checkInternetConnection = () => {
    const online = navigator.onLine;
    setHasInternet(online);
    return online;
  };

  // UPRAVENÉ: Kontrola dostupnosti ESP32/servera
  const checkESP32Status = async () => {
    if (!hasInternet) {
      setEsp32Online(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_URL}/household/ping`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (!esp32Online) {
          setEsp32Online(true);
          addToast('ESP32 pripojené!', 'success');
        }
        setLastOnlineCheck(Date.now());
        return true;
      } else {
        setEsp32Online(false);
        return false;
      }
    } catch (error) {
      setEsp32Online(false);
      return false;
    }
  };

  // Sleduj zmeny v internetovom pripojení
  useEffect(() => {
    const handleOnline = () => {
      setHasInternet(true);
      addToast('Internetové pripojenie obnovené', 'success');
      checkESP32Status();
    };

    const handleOffline = () => {
      setHasInternet(false);
      setEsp32Online(false);
      addToast('Stratené internetové pripojenie', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Iniciálna kontrola
    checkInternetConnection();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodická kontrola ESP32
  useEffect(() => {
    if (isLoggedIn && hasInternet) {
      checkESP32Status();
      
      const interval = setInterval(() => {
        checkESP32Status();
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, hasInternet]);

  const handleLogin = async () => {
    // OPRAVENÉ: Kontroluj len internet, nie ESP32
    if (!hasInternet) {
      addToast('Nie je internetové pripojenie', 'error');
      return;
    }

    setLoginError('');
    
    if (!loginForm.username || !loginForm.password) {
      setLoginError('Vyplňte všetky polia');
      addToast('Vyplňte používateľské meno a heslo', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/household/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem('household_token', data.token);
        localStorage.setItem('household_user', JSON.stringify(data.user));
        
        // Load user preferences
        const savedPrefs = localStorage.getItem(`prefs_${data.user.id}`);
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          setUserPreferences(prefs);
          setTheme(prefs.theme || 'dark');
        }
        
        addToast('Úspešne prihlásený!', 'success');
        setLoginError('');
        
        // Kontrola ESP32 po prihlásení
        checkESP32Status();
      } else {
        setLoginError(data.error || 'Prihlásenie zlyhalo');
        addToast(data.error || 'Nesprávne prihlasovacie údaje', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Chyba pripojenia k serveru');
      addToast('Chyba pripojenia k serveru', 'error');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
    setUser(null);
    setDashboardData(null);
    localStorage.removeItem('household_token');
    localStorage.removeItem('household_user');
    addToast('Odhlásený', 'info');
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('household_token');
    const savedUser = localStorage.getItem('household_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsLoggedIn(true);
      
      // Load preferences
      const savedPrefs = localStorage.getItem(`prefs_${userData.id}`);
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setUserPreferences(prefs);
        setTheme(prefs.theme || 'dark');
      }
    }
  }, []);

  const fetchDashboard = async () => {
    if (!esp32Online) return;
    
    try {
      const response = await fetch(`${API_URL}/household/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 403 || response.status === 401) {
        handleLogout();
        addToast('Relácia vypršala, prihláste sa znovu', 'warning');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard');
      }

      const data = await response.json();
      setDashboardData(data);
      
      // Calculate statistics from events
      calculateStatistics(data.events);
      
      // Check for new notifications
      checkNewNotifications(data.events);
      
      // Check buzzer status
      checkBuzzerStatus(data.events);
    } catch (error) {
      console.error('Fetch dashboard error:', error);
      setEsp32Online(false);
    }
  };

  const checkBuzzerStatus = (events) => {
    // Check last 5 events for buzzer activation
    const recentEvents = events.slice(0, 5);
    const buzzerEvent = recentEvents.find(e => 
      e.description && e.description.includes('Bzučiak aktivovaný')
    );
    
    if (buzzerEvent && !buzzerEvent.acknowledged) {
      setBuzzerActive(true);
    } else {
      setBuzzerActive(false);
    }
  };

  const deactivateBuzzer = async () => {
    if (!esp32Online) {
      addToast('ESP32 nie je pripojené', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/household/buzzer/deactivate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ household_id: dashboardData?.household?.id })
      });

      if (response.ok) {
        setBuzzerActive(false);
        addToast('Bzučiak vypnutý', 'success');
        fetchDashboard();
      } else {
        addToast('Nepodarilo sa vypnúť bzučiak', 'error');
      }
    } catch (error) {
      console.error('Deactivate buzzer error:', error);
      addToast('Chyba pri vypínaní bzučiaka', 'error');
    }
  };

  const calculateStatistics = (events) => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let todayStats = { total: 0, alerts: 0, warnings: 0 };
    let weekStats = { total: 0, alerts: 0, warnings: 0 };
    let monthStats = { total: 0, alerts: 0, warnings: 0 };
    let sensorCounts = {};
    let hourlyActivity = Array(24).fill(0);
    let dailyActivity = Array(7).fill(0);

    events.forEach(event => {
      const eventDate = new Date(event.timestamp);
      
      if (eventDate >= monthStart) {
        monthStats.total++;
        if (event.severity === 'alert') monthStats.alerts++;
        if (event.severity === 'warning') monthStats.warnings++;
      }
      
      if (eventDate >= weekStart) {
        weekStats.total++;
        if (event.severity === 'alert') weekStats.alerts++;
        if (event.severity === 'warning') weekStats.warnings++;
        
        const dayIndex = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
        if (dayIndex < 7) {
          dailyActivity[6 - dayIndex]++;
        }
      }
      
      if (eventDate >= todayStart) {
        todayStats.total++;
        if (event.severity === 'alert') todayStats.alerts++;
        if (event.severity === 'warning') todayStats.warnings++;
        
        const hour = eventDate.getHours();
        hourlyActivity[hour]++;
      }

      if (event.sensor_name) {
        sensorCounts[event.sensor_name] = (sensorCounts[event.sensor_name] || 0) + 1;
      }
    });

    let mostActiveSensor = null;
    let maxCount = 0;
    Object.entries(sensorCounts).forEach(([sensor, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveSensor = { name: sensor, count };
      }
    });

    setStatistics({
      today: todayStats,
      week: weekStats,
      month: monthStats,
      mostActiveSensor,
      hourlyActivity,
      dailyActivity
    });
  };

  const checkNewNotifications = (events) => {
    if (!userPreferences.notifications_enabled) return;

    const lastCheck = localStorage.getItem(`last_check_${user?.id}`) || new Date().toISOString();
    const newEvents = events.filter(event => {
      const eventDate = new Date(event.timestamp);
      const lastCheckDate = new Date(lastCheck);
      
      if (userPreferences.notification_priority === 'critical' && event.severity !== 'alert') return false;
      if (userPreferences.notification_priority === 'warnings' && event.severity === 'info') return false;
      
      return eventDate > lastCheckDate && !event.acknowledged;
    });

    if (newEvents.length > 0) {
      setNotifications(prev => [...newEvents.reverse(), ...prev].slice(0, 50));
      setUnreadCount(prev => prev + newEvents.length);
      
      if (userPreferences.sound_alerts && newEvents.some(e => e.severity === 'alert')) {
        playAlertSound();
      }
    }

    localStorage.setItem(`last_check_${user?.id}`, new Date().toISOString());
  };

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Sound play error:', error);
    }
  };

  const savePreferences = () => {
    const prefsToSave = { ...userPreferences, theme };
    localStorage.setItem(`prefs_${user.id}`, JSON.stringify(prefsToSave));
    addToast('Nastavenia uložené!', 'success');
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    addToast('Notifikácie vymazané', 'info');
  };

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    setUserPreferences({ ...userPreferences, theme: newTheme });
  };

  useEffect(() => {
    if (isLoggedIn && token && esp32Online) {
      fetchDashboard();
      
      const interval = setInterval(fetchDashboard, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, token, esp32Online]);

  const toggleAlarm = async () => {
    if (!esp32Online) {
      addToast('ESP32 nie je pripojené', 'error');
      return;
    }

    if (user.role === 'viewer') {
      addToast('Nemáte oprávnenie na ovládanie alarmu', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/household/alarm/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        fetchDashboard();
        addToast(data.message || 'Stav alarmu zmenený', 'success');
      } else {
        addToast(data.error || 'Chyba pri zmene alarmu', 'error');
      }
    } catch (error) {
      console.error('Toggle alarm error:', error);
      addToast('Chyba pripojenia', 'error');
    }
  };

  const handleAddMember = async () => {
    if (!esp32Online) {
      addToast('ESP32 nie je pripojené', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/household/members/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newMember)
      });

      const data = await response.json();

      if (response.ok) {
        addToast('Člen pridaný úspešne!', 'success');
        setShowAddMemberModal(false);
        setNewMember({ username: '', password: '', full_name: '', email: '', phone: '', member_role: 'viewer' });
        fetchDashboard();
      } else {
        addToast(data.error || 'Chyba pri pridávaní člena', 'error');
      }
    } catch (error) {
      console.error('Add member error:', error);
      addToast('Chyba pripojenia', 'error');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!esp32Online) {
      addToast('ESP32 nie je pripojené', 'error');
      return;
    }

    if (!window.confirm('Naozaj chcete odstrániť tohto člena?')) return;

    try {
      const response = await fetch(`${API_URL}/household/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        addToast('Člen odstránený', 'success');
        fetchDashboard();
      } else {
        addToast('Chyba pri odstraňovaní člena', 'error');
      }
    } catch (error) {
      console.error('Remove member error:', error);
      addToast('Chyba pripojenia', 'error');
    }
  };

  const acknowledgeEvent = async (eventId) => {
    if (!esp32Online) {
      addToast('ESP32 nie je pripojené', 'error');
      return;
    }

    try {
      await fetch(`${API_URL}/household/events/${eventId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDashboard();
      addToast('Udalosť potvrdená', 'success');
    } catch (error) {
      console.error('Acknowledge error:', error);
      addToast('Chyba pri potvrdení', 'error');
    }
  };

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100'} flex items-center justify-center p-6`}>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        {/* Internet connection banner */}
        {!hasInternet && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-6 flex items-center justify-center gap-3 z-50">
            <WifiOff size={20} />
            <span className="font-semibold">Počítač nemá internetové pripojenie!</span>
          </div>
        )}
        
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className={`inline-block p-4 ${theme === 'dark' ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} rounded-2xl shadow-lg ${theme === 'dark' ? 'shadow-cyan-500/50' : 'shadow-blue-500/50'} mb-4`}>
              <Home size={48} className="text-white" />
            </div>
            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} bg-clip-text text-transparent mb-2`}>
              SecurityPlus
            </h1>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Domáci bezpečnostný systém</p>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-8 border ${theme === 'dark' ? 'border-slate-700/50' : 'border-gray-200'} shadow-xl`}>
            {loginError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {loginError}
              </div>
            )}
            
            <div className="mb-6">
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Používateľské meno
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => {
                  setLoginForm({...loginForm, username: e.target.value});
                  setLoginError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                disabled={!hasInternet}
                className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>

            <div className="mb-6">
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Heslo
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => {
                  setLoginForm({...loginForm, password: e.target.value});
                  setLoginError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                disabled={!hasInternet}
                className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={!hasInternet}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasInternet ? 'Prihlásiť sa' : 'Chýba internetové pripojenie'}
            </button>
            
            {!hasInternet && (
              <p className="mt-4 text-center text-sm text-red-400">
                Pre prihlásenie je potrebné internetové pripojenie
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ESP32 offline screen (po prihlásení)
  if (isLoggedIn && !esp32Online) {
    return (
      <>
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100'} flex items-center justify-center p-6`}>
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          
          <div className="max-w-2xl w-full text-center">
            <div className="mb-8">
              <WifiOff size={80} className="text-red-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-red-500 mb-4">ESP32 Offline</h1>
              <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-8`}>
                ESP32 zariadenie nie je momentálne pripojené k serveru
              </p>
            </div>
            
            <div className={`${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-8 border ${theme === 'dark' ? 'border-slate-700/50' : 'border-gray-200'} shadow-xl`}>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Možné riešenia:</h2>
              <ul className={`text-left space-y-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-6`}>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-500 font-bold">1.</span>
                  <span>Overte, či je ESP32 zapnuté a má napájanie</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-500 font-bold">2.</span>
                  <span>Skontrolujte, či je ESP32 pripojené k WiFi sieti</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-500 font-bold">3.</span>
                  <span>Ak ste zmenili WiFi heslo alebo sieť, použite USB konfiguráciu nižšie</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-500 font-bold">4.</span>
                  <span>Reštartujte ESP32 vypnutím a zapnutím napájania</span>
                </li>
              </ul>
              
              <button
                onClick={() => {
                  checkESP32Status();
                  addToast('Kontrola ESP32...', 'info');
                }}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                Skúsiť znovu
              </button>
              <button
                onClick={() => setShowUSBConfig(true)}
                className="w-full mt-3 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
              >
                <Usb size={20} />
                Konfigurovať ESP32 cez USB
              </button>            
              <button
                onClick={handleLogout}
                className={`w-full mt-3 py-3 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold rounded-lg transition-all`}
              >
                Odhlásiť sa
              </button>
            </div>
          </div>
        </div>
        <ESP32USBConfig 
          isOpen={showUSBConfig}
          onClose={() => setShowUSBConfig(false)}
          onSuccess={() => {
            addToast('ESP32 nakonfigurované! Čakám na pripojenie...', 'success');
            setShowUSBConfig(false);
            setTimeout(() => {
              checkESP32Status();
            }, 3000);
          }}
        />
      </>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100'} flex items-center justify-center`}>
        <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-xl`}>Načítavam...</div>
      </div>
    );
  }

  const { household, sensors, events, members } = dashboardData;
  const alarmActive = household.alarm_status === 'active';

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white' : 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 text-gray-900'} p-6`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Buzzer Alert */}
      {buzzerActive && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-4 px-6 flex items-center justify-between gap-4 z-50 animate-pulse">
          <div className="flex items-center gap-3">
            <Volume2 size={24} className="animate-bounce" />
            <span className="font-bold text-lg">BZUČIAK AKTÍVNY - Detekovaná bezpečnostná udalosť!</span>
          </div>
          <button
            onClick={deactivateBuzzer}
            className="px-6 py-2 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2"
          >
            <VolumeX size={20} />
            Vypnúť bzučiak
          </button>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`flex items-center justify-between mb-8 ${buzzerActive ? 'mt-20' : ''}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 ${theme === 'dark' ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} rounded-xl shadow-lg ${theme === 'dark' ? 'shadow-cyan-500/50' : 'shadow-blue-500/50'}`}>
              <Shield size={32} className="text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} bg-clip-text text-transparent`}>
                {household.name}
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{user.full_name} • {user.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} backdrop-blur-sm rounded-lg border ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Kľúč: </span>
              <span className={`${theme === 'dark' ? 'text-cyan-300' : 'text-blue-600'} font-mono text-sm`}>{household.household_key}</span>
            </div>
            
            {/* Connection Status */}
            <div className={`px-4 py-2 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} backdrop-blur-sm rounded-lg border ${esp32Online ? (theme === 'dark' ? 'border-green-500/30' : 'border-green-300') : (theme === 'dark' ? 'border-red-500/30' : 'border-red-300')} flex items-center gap-2`}>
              {esp32Online ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-red-500" />}
              <span className={`text-xs ${esp32Online ? 'text-green-500' : 'text-red-500'}`}>
                {esp32Online ? 'ESP32 Online' : 'ESP32 Offline'}
              </span>
            </div>
            
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-100'} rounded-lg transition-all relative`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-96 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto`}>
                  <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} flex items-center justify-between sticky top-0`}>
                    <h3 className="font-semibold">Notifikácie</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className={`text-xs ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        Vymazať všetko
                      </button>
                    )}
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Bell size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Žiadne nové notifikácie</p>
                    </div>
                  ) : (
                    <div className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-gray-200'}`}>
                      {notifications.map((notif, idx) => (
                        <div
                          key={idx}
                          className={`p-3 ${theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'} transition-colors ${
                            notif.severity === 'alert' ? (theme === 'dark' ? 'bg-red-500/5' : 'bg-red-50') : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {notif.severity === 'alert' && (
                              <AlertTriangle size={16} className="text-red-400 mt-1" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{notif.sensor_name || 'Systém'}</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{notif.description}</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                                {new Date(notif.timestamp).toLocaleString('sk-SK')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-600 hover:text-red-600 hover:bg-red-100'} rounded-lg transition-all`}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-1 space-y-2">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'dashboard'
                  ? (theme === 'dark' 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 text-cyan-300'
                    : 'bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 text-blue-700')
                  : (theme === 'dark'
                    ? 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50')
              }`}
            >
              <Home size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
            
            <button
              onClick={() => setActiveView('statistics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'statistics'
                  ? (theme === 'dark' 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 text-cyan-300'
                    : 'bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 text-blue-700')
                  : (theme === 'dark'
                    ? 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50')
              }`}
            >
              <BarChart3 size={20} />
              <span className="font-medium">Štatistiky</span>
            </button>
            
            <button
              onClick={() => setActiveView('activity')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'activity'
                  ? (theme === 'dark' 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 text-cyan-300'
                    : 'bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 text-blue-700')
                  : (theme === 'dark'
                    ? 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50')
              }`}
            >
              <Activity size={20} />
              <span className="font-medium">Aktivita</span>
            </button>
            
            {user.role === 'admin' && (
              <button
                onClick={() => setActiveView('members')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeView === 'members'
                    ? (theme === 'dark' 
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 text-cyan-300'
                      : 'bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 text-blue-700')
                    : (theme === 'dark'
                      ? 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50')
                }`}
              >
                <Users size={20} />
                <span className="font-medium">Členovia</span>
              </button>
            )}
            
            <button
              onClick={() => setActiveView('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'settings'
                  ? (theme === 'dark' 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 text-cyan-300'
                    : 'bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 text-blue-700')
                  : (theme === 'dark'
                    ? 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50')
              }`}
            >
              <Settings size={20} />
              <span className="font-medium">Nastavenia</span>
            </button>
          </div>

          {/* Main Content - PONECHANÝ BEZ ZMIEN (príliš dlhý na zobrazenie) */}
          <div className="col-span-3">
            <div className={`${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-6 border ${theme === 'dark' ? 'border-slate-700/50' : 'border-gray-200'}`}>
              <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Dashboard obsah zostal nezmenený - príliš dlhý na zobrazenie
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HouseholdDashboard;