import React, { useState, useEffect, useRef } from 'react';
import { Home, Shield, Activity, Users, Settings, Lock, Unlock, DoorOpen, Eye, AlertTriangle, Bell, UserPlus, Trash2, LogOut, CheckCircle, BarChart3, TrendingUp, Clock, Zap, Volume2, VolumeX, Moon, Sun, User, PieChart, Calendar, Wifi, WifiOff, X, Usb, ChevronRight, Radio, Gauge, ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, Footprints, Power } from 'lucide-react';
import ESP32USBConfig from './ESP32USBConfig.jsx';

const API_URL = 'http://35.158.231.80:3000/api';

/* ════════════════════════════════════════════
   TOAST SYSTEM
   ════════════════════════════════════════════ */
const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-500/90 border-emerald-400/50',
    error: 'bg-red-500/90 border-red-400/50',
    warning: 'bg-amber-500/90 border-amber-400/50',
    info: 'bg-blue-500/90 border-blue-400/50'
  };

  return (
    <div className={`${styles[type]} backdrop-blur-xl text-white px-5 py-3.5 rounded-2xl border shadow-2xl flex items-center gap-3 min-w-[300px] animate-toast-in`}>
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition-all">
        <X size={16} />
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-6 right-6 z-[9999] space-y-3">
    {toasts.map(toast => (
      <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
    ))}
  </div>
);

/* ════════════════════════════════════════════
   MINI STAT CARD
   ════════════════════════════════════════════ */
const StatCard = ({ icon: Icon, label, value, sub, color = 'blue', trend }) => (
  <div className="group relative bg-[#0f1629]/60 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.06] hover:border-blue-500/30 transition-all duration-300 overflow-hidden">
    <div className={`absolute inset-0 bg-gradient-to-br ${color === 'blue' ? 'from-blue-500/5 to-cyan-500/5' : color === 'red' ? 'from-red-500/5 to-orange-500/5' : color === 'green' ? 'from-emerald-500/5 to-teal-500/5' : 'from-amber-500/5 to-yellow-500/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color === 'blue' ? 'bg-blue-500/10 text-blue-400' : color === 'red' ? 'bg-red-500/10 text-red-400' : color === 'green' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-[13px] text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  </div>
);

/* ════════════════════════════════════════════
   SENSOR CARD
   ════════════════════════════════════════════ */
const SensorCard = ({ sensor, theme }) => {
  const isTriggered = sensor.status === 'triggered';
  const typeConfig = {
    door: { icon: DoorOpen, label: 'Dvere', color: 'blue' },
    window: { icon: DoorOpen, label: 'Okno', color: 'cyan' },
    motion: { icon: Footprints, label: 'Pohyb', color: 'amber' },
  };
  const config = typeConfig[sensor.type] || typeConfig.door;
  const IconComp = config.icon;

  return (
    <div className={`relative bg-[#0f1629]/60 backdrop-blur-xl rounded-2xl p-5 border transition-all duration-300 overflow-hidden ${isTriggered ? 'border-red-500/40 shadow-lg shadow-red-500/10' : 'border-white/[0.06] hover:border-blue-500/20'}`}>
      {isTriggered && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" />}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isTriggered ? 'bg-red-500/15 text-red-400 animate-pulse' : 'bg-blue-500/10 text-blue-400'}`}>
            <IconComp size={20} />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{sensor.name}</p>
            <p className="text-gray-500 text-xs">{sensor.location}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${isTriggered ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
          {isTriggered ? 'Aktívny' : 'OK'}
        </div>
      </div>
      {sensor.last_triggered && (
        <p className="text-[11px] text-gray-600 mt-3 flex items-center gap-1.5">
          <Clock size={11} />
          {new Date(sensor.last_triggered).toLocaleString('sk-SK')}
        </p>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════
   MAIN APP COMPONENT
   ════════════════════════════════════════════ */
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
  const [hasInternet, setHasInternet] = useState(true);
  const [esp32Online, setEsp32Online] = useState(null); // null = ešte neznámy stav
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [showUSBConfig, setShowUSBConfig] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [newMember, setNewMember] = useState({
    username: '', password: '', full_name: '', email: '', phone: '', member_role: 'viewer'
  });

  // Ref pre sledovanie predchádzajúceho stavu ESP32 (null = ešte nekontrolované)
  const prevEsp32Online = useRef(null);

  const [userPreferences, setUserPreferences] = useState({
    notifications_enabled: true, sound_alerts: true, email_notifications: true,
    theme: 'dark', auto_acknowledge: false, notification_priority: 'all'
  });

  const [statistics, setStatistics] = useState({
    today: { total: 0, alerts: 0, warnings: 0 },
    week: { total: 0, alerts: 0, warnings: 0 },
    month: { total: 0, alerts: 0, warnings: 0 },
    mostActiveSensor: null,
    hourlyActivity: Array(24).fill(0),
    dailyActivity: Array(7).fill(0)
  });

  // ─── Toast helpers ───
  const addToast = (message, type = 'info') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ─── Connection checks ───
  const checkInternetConnection = () => { 
    const online = navigator.onLine; 
    setHasInternet(online); 
    return online; 
  };

  // ESP32 status sa berie z dashboard API (system_status.online z DB heartbeatu)
  // Žiadny samostatný ping - /api/household/ping je SERVER ping, nie ESP32!

  // ─── Effect pre detekciu zmeny stavu ESP32 (toast len pri reálnej zmene) ───
  useEffect(() => {
    // Ignoruj prvý load (prevEsp32Online.current === null)
    if (prevEsp32Online.current !== null && prevEsp32Online.current !== esp32Online) {
      if (esp32Online) {
        addToast('ESP32 pripojené!', 'success');
      } else {
        addToast('ESP32 sa odpojilo!', 'error');
      }
    }
    prevEsp32Online.current = esp32Online;
  }, [esp32Online]);

  useEffect(() => {
    const handleOnline = () => { 
      setHasInternet(true); 
      addToast('Internet obnovený', 'success'); 
    };
    const handleOffline = () => { 
      setHasInternet(false); 
      addToast('Stratené pripojenie k internetu', 'error'); 
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkInternetConnection();
    
    return () => { 
      window.removeEventListener('online', handleOnline); 
      window.removeEventListener('offline', handleOffline); 
    };
  }, []);

  // ESP32 status sa aktualizuje cez fetchDashboard (nižšie)

  // ─── Auth ───
  const handleLogin = async () => {
    if (!hasInternet) { 
      addToast('Nie je internetové pripojenie', 'error'); 
      return; 
    }
    
    setLoginError('');
    if (!loginForm.username || !loginForm.password) { 
      setLoginError('Vyplňte všetky polia'); 
      return; 
    }
    
    try {
      const res = await fetch(`${API_URL}/auth/household/login`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      
      if (res.ok) {
        setToken(data.token); 
        setUser(data.user); 
        setIsLoggedIn(true);
        localStorage.setItem('household_token', data.token);
        localStorage.setItem('household_user', JSON.stringify(data.user));
        
        const savedPrefs = localStorage.getItem(`prefs_${data.user.id}`);
        if (savedPrefs) { 
          const prefs = JSON.parse(savedPrefs); 
          setUserPreferences(prefs); 
          setTheme(prefs.theme || 'dark'); 
        }
        
        addToast('Úspešne prihlásený!', 'success');
      } else { 
        setLoginError(data.error || 'Prihlásenie zlyhalo'); 
        addToast(data.error || 'Nesprávne údaje', 'error'); 
      }
    } catch { 
      setLoginError('Chyba pripojenia'); 
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
      
      const savedPrefs = localStorage.getItem(`prefs_${userData.id}`);
      if (savedPrefs) { 
        const prefs = JSON.parse(savedPrefs); 
        setUserPreferences(prefs); 
        setTheme(prefs.theme || 'dark'); 
      }
    }
  }, []);

  // ─── Dashboard fetch - ESP32 status comes from DB heartbeat ───
  const fetchDashboard = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/household/dashboard`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      
      if (res.status === 403 || res.status === 401) { 
        handleLogout(); 
        addToast('Relácia vypršala', 'warning'); 
        return; 
      }
      
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      
      setDashboardData(data);
      
      // ESP32 online stav z DB heartbeatu (server kontroluje < 90 sekúnd)
      const newOnline = data.system_status?.online === true;
      setEsp32Online(newOnline);
      
      // Buzzer stav z DB
      setBuzzerActive(data.system_status?.buzzer_active === true);
      
      calculateStatistics(data.events);
      checkNewNotifications(data.events);
    } catch (error) { 
      // Server nedostupný - ale nezmeníme esp32Online
    }
  };

  // Buzzer stav sa teraz berie z DB (system_status.buzzer_active) vo fetchDashboard

  const deactivateBuzzer = async () => {
    try {
      const res = await fetch(`${API_URL}/household/buzzer/deactivate`, {
        method: 'POST', 
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ household_id: dashboardData?.household?.id })
      });
      
      if (res.ok) { 
        setBuzzerActive(false); 
        addToast('Bzučiak vypnutý', 'success'); 
        fetchDashboard(); 
      } else {
        addToast('Nepodarilo sa vypnúť bzučiak', 'error');
      }
    } catch { 
      addToast('Chyba komunikácie so serverom', 'error'); 
    }
  };

  const calculateStatistics = (events) => {
    const now = new Date();
    const todayStart = new Date(now); 
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getTime() - 30 * 86400000);
    
    let todayStats = { total: 0, alerts: 0, warnings: 0 };
    let weekStats = { total: 0, alerts: 0, warnings: 0 };
    let monthStats = { total: 0, alerts: 0, warnings: 0 };
    let sensorCounts = {};
    let hourlyActivity = Array(24).fill(0);
    let dailyActivity = Array(7).fill(0);
    
    events.forEach(ev => {
      const eventDate = new Date(ev.timestamp);
      
      if (eventDate >= monthStart) { 
        monthStats.total++; 
        if (ev.severity === 'alert') monthStats.alerts++; 
        if (ev.severity === 'warning') monthStats.warnings++; 
      }
      
      if (eventDate >= weekStart) { 
        weekStats.total++; 
        if (ev.severity === 'alert') weekStats.alerts++; 
        if (ev.severity === 'warning') weekStats.warnings++; 
        
        const dayIndex = Math.floor((now - eventDate) / 86400000); 
        if (dayIndex < 7) dailyActivity[6 - dayIndex]++; 
      }
      
      if (eventDate >= todayStart) { 
        todayStats.total++; 
        if (ev.severity === 'alert') todayStats.alerts++; 
        if (ev.severity === 'warning') todayStats.warnings++; 
        hourlyActivity[eventDate.getHours()]++; 
      }
      
      if (ev.sensor_name) {
        sensorCounts[ev.sensor_name] = (sensorCounts[ev.sensor_name] || 0) + 1;
      }
    });
    
    let mostActiveSensor = null;
    let maxCount = 0;
    Object.entries(sensorCounts).forEach(([sensorName, count]) => { 
      if (count > maxCount) { 
        maxCount = count; 
        mostActiveSensor = { name: sensorName, count }; 
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
    const newEvents = events.filter(ev => {
      const eventDate = new Date(ev.timestamp);
      
      if (userPreferences.notification_priority === 'critical' && ev.severity !== 'alert') {
        return false;
      }
      if (userPreferences.notification_priority === 'warnings' && ev.severity === 'info') {
        return false;
      }
      
      return eventDate > new Date(lastCheck) && !ev.acknowledged;
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
    } catch {
      // Audio not supported
    }
  };

  const savePreferences = () => {
    const prefs = { ...userPreferences, theme };
    localStorage.setItem(`prefs_${user.id}`, JSON.stringify(prefs));
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
    if (isLoggedIn && token) {
      fetchDashboard();
      const interval = setInterval(fetchDashboard, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, token]);

  const toggleAlarm = async () => {
    if (user.role === 'viewer') { 
      addToast('Nemáte oprávnenie', 'warning'); 
      return; 
    }
    
    try {
      const res = await fetch(`${API_URL}/household/alarm/toggle`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await res.json();
      
      if (res.ok) { 
        fetchDashboard(); 
        addToast(data.message || 'Alarm zmenený', 'success'); 
      } else {
        addToast(data.error || 'Chyba', 'error');
      }
    } catch { 
      addToast('Chyba pripojenia', 'error'); 
    }
  };

  const handleAddMember = async () => {
    try {
      const res = await fetch(`${API_URL}/household/members/add`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newMember)
      });
      const data = await res.json();
      
      if (res.ok) { 
        addToast('Člen pridaný!', 'success'); 
        setShowAddMemberModal(false); 
        setNewMember({ 
          username: '', 
          password: '', 
          full_name: '', 
          email: '', 
          phone: '', 
          member_role: 'viewer' 
        }); 
        fetchDashboard(); 
      } else {
        addToast(data.error || 'Chyba', 'error');
      }
    } catch { 
      addToast('Chyba pripojenia', 'error'); 
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Naozaj chcete odstrániť tohto člena?')) return;
    
    try {
      const res = await fetch(`${API_URL}/household/members/${memberId}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      
      if (res.ok) { 
        addToast('Člen odstránený', 'success'); 
        fetchDashboard(); 
      } else {
        addToast('Chyba', 'error');
      }
    } catch { 
      addToast('Chyba pripojenia', 'error'); 
    }
  };

  const acknowledgeEvent = async (eventId) => {
    try {
      await fetch(`${API_URL}/household/events/${eventId}/acknowledge`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      fetchDashboard(); 
      addToast('Udalosť potvrdená', 'success');
    } catch { 
      addToast('Chyba', 'error'); 
    }
  };

  /* ═══════════════════════════════════════════
     NAV ITEMS
     ═══════════════════════════════════════════ */
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'statistics', icon: BarChart3, label: 'Štatistiky' },
    { id: 'activity', icon: Activity, label: 'Aktivita' },
    ...(user?.role === 'admin' ? [{ id: 'members', icon: Users, label: 'Členovia' }] : []),
    { id: 'settings', icon: Settings, label: 'Nastavenia' },
  ];

  /* ═══════════════════════════════════════════
     LOGIN SCREEN
     ═══════════════════════════════════════════ */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#060b18] flex items-center justify-center p-6 relative overflow-hidden">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[120px] pointer-events-none" />

        {!hasInternet && (
          <div className="fixed top-0 left-0 right-0 bg-red-500/90 backdrop-blur-xl text-white py-3 px-6 flex items-center justify-center gap-3 z-50 animate-slide-down">
            <WifiOff size={18} /> 
            <span className="font-medium text-sm">Aplikácia nemá prístup na internet.</span>
          </div>
        )}

        <div className="max-w-md w-full relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-xl shadow-blue-500/30 mb-6 animate-float">
              <Shield size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">SecurityPlus</h1>
            <p className="text-gray-500 text-sm">Domáci bezpečnostný systém</p>
          </div>

          <div className="bg-[#0c1222]/80 backdrop-blur-2xl rounded-3xl p-8 border border-white/[0.06] shadow-2xl">
            {loginError && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium animate-shake">
                {loginError}
              </div>
            )}

            <div className="mb-5">
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Používateľské meno</label>
              <input 
                type="text" 
                value={loginForm.username}
                onChange={e => { setLoginForm({ ...loginForm, username: e.target.value }); setLoginError(''); }}
                onKeyPress={e => e.key === 'Enter' && handleLogin()}
                disabled={!hasInternet}
                className="w-full px-4 py-3.5 bg-[#0a0f1e] border border-white/[0.08] rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-40"
                placeholder="meno" 
              />
            </div>

            <div className="mb-7">
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Heslo</label>
              <input 
                type="password" 
                value={loginForm.password}
                onChange={e => { setLoginForm({ ...loginForm, password: e.target.value }); setLoginError(''); }}
                onKeyPress={e => e.key === 'Enter' && handleLogin()}
                disabled={!hasInternet}
                className="w-full px-4 py-3.5 bg-[#0a0f1e] border border-white/[0.08] rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-40"
                placeholder="••••••••" 
              />
            </div>

            <button 
              onClick={handleLogin} 
              disabled={!hasInternet}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {hasInternet ? 'Prihlásiť sa' : 'Chýba internetové pripojenie'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     LOADING
     ═══════════════════════════════════════════ */
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-[#060b18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Načítavam dashboard...</p>
        </div>
      </div>
    );
  }

  const { household, sensors, events, members } = dashboardData;
  const alarmActive = household.alarm_status === 'active';

  /* ═══════════════════════════════════════════
     RENDER DASHBOARD CONTENT VIEWS
     ═══════════════════════════════════════════ */
  const renderDashboardView = () => (
    <div className="space-y-6">
      {/* ESP32 Offline Banner */}
      {esp32Online === false && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
          <div className="p-3 bg-red-500/15 rounded-xl">
            <Power size={22} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-red-400 font-semibold text-sm">ESP32 je offline</p>
            <p className="text-gray-500 text-xs mt-0.5">Skontrolujte napájanie a WiFi pripojenie zariadenia.</p>
            {dashboardData.system_status?.last_seen && (
              <p className="text-gray-600 text-[11px] mt-1">
                Posledný kontakt: {new Date(dashboardData.system_status.last_seen).toLocaleString('sk-SK')}
              </p>
            )}
          </div>
          <button 
            onClick={() => setShowUSBConfig(true)}
            className="px-4 py-2 bg-red-500/15 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-500/25 transition-all flex items-center gap-1.5">
            <Usb size={14} /> USB konfigurácia
          </button>
        </div>
      )}

      {/* Alarm Toggle */}
      <div className={`relative rounded-3xl p-6 border overflow-hidden transition-all duration-500 ${alarmActive ? 'bg-gradient-to-r from-red-500/10 to-orange-500/5 border-red-500/30' : 'bg-[#0f1629]/60 border-white/[0.06]'}`}>
        {alarmActive && <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent animate-pulse" />}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${alarmActive ? 'bg-red-500/15 animate-pulse' : 'bg-blue-500/10'}`}>
              {alarmActive ? <ShieldAlert size={32} className="text-red-400" /> : <ShieldCheck size={32} className="text-blue-400" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{alarmActive ? 'Alarm aktívny' : 'Alarm neaktívny'}</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {alarmActive ? 'Systém monitoruje všetky senzory' : 'Senzory sú sledované, ale alarm nespustí'}
              </p>
            </div>
          </div>
          <button 
            onClick={toggleAlarm} 
            disabled={user.role === 'viewer'}
            className={`px-8 py-3.5 rounded-2xl font-semibold transition-all active:scale-95 disabled:opacity-40 ${alarmActive ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25' : 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:shadow-xl hover:shadow-blue-500/25'}`}>
            {alarmActive ? 'Deaktivovať' : 'Aktivovať'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Zap} label="Udalosti dnes" value={statistics.today.total} color="blue" />
        <StatCard icon={AlertTriangle} label="Výstrahy dnes" value={statistics.today.alerts} color="red" />
        <StatCard icon={Radio} label="Aktívne senzory" value={sensors.filter(s => s.is_enabled).length} color="green" />
        <StatCard 
          icon={Wifi} 
          label="ESP32 signál" 
          value={dashboardData.system_status?.rssi ? `${dashboardData.system_status.rssi} dBm` : '—'} 
          color={esp32Online ? 'green' : 'red'} 
        />
      </div>

      {/* Sensors + Recent Events */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sensors */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Radio size={18} className="text-blue-400" /> Senzory
          </h3>
          <div className="space-y-3">
            {sensors.map(sensor => (
              <SensorCard key={sensor.id} sensor={sensor} theme={theme} />
            ))}
            {sensors.length === 0 && (
              <p className="text-gray-500 text-sm">Žiadne senzory</p>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={18} className="text-blue-400" /> Posledné udalosti
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {events.slice(0, 15).map(event => (
              <div 
                key={event.id} 
                className={`bg-[#0f1629]/60 rounded-2xl p-4 border border-white/[0.04] flex items-start gap-3 group hover:border-white/[0.08] transition-all ${event.severity === 'alert' ? 'border-l-2 border-l-red-500' : event.severity === 'warning' ? 'border-l-2 border-l-amber-500' : ''}`}>
                <div className={`p-1.5 rounded-lg mt-0.5 ${event.severity === 'alert' ? 'bg-red-500/10 text-red-400' : event.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {event.severity === 'alert' ? (
                    <AlertTriangle size={14} />
                  ) : event.severity === 'warning' ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <Activity size={14} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{event.sensor_name || 'Systém'}</p>
                  <p className="text-xs text-gray-400 truncate">{event.description}</p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    {new Date(event.timestamp).toLocaleString('sk-SK')}
                  </p>
                </div>
                {!event.acknowledged && (
                  <button 
                    onClick={() => acknowledgeEvent(event.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" 
                    title="Potvrdiť">
                    <CheckCircle size={14} />
                  </button>
                )}
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-gray-500 text-sm">Žiadne udalosti</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatisticsView = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Štatistiky</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard 
          icon={Calendar} 
          label="Dnes" 
          value={statistics.today.total} 
          sub={`${statistics.today.alerts} výstrah, ${statistics.today.warnings} varovaní`} 
          color="blue" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Tento týždeň" 
          value={statistics.week.total} 
          sub={`${statistics.week.alerts} výstrah, ${statistics.week.warnings} varovaní`} 
          color="green" 
        />
        <StatCard 
          icon={PieChart} 
          label="Tento mesiac" 
          value={statistics.month.total} 
          sub={`${statistics.month.alerts} výstrah, ${statistics.month.warnings} varovaní`} 
          color="amber" 
        />
      </div>

      {statistics.mostActiveSensor && (
        <div className="bg-[#0f1629]/60 rounded-3xl p-6 border border-white/[0.06]">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Najaktívnejší senzor</h3>
          <p className="text-2xl font-bold text-white">{statistics.mostActiveSensor.name}</p>
          <p className="text-blue-400 text-sm mt-1">{statistics.mostActiveSensor.count} udalostí</p>
        </div>
      )}

      {/* Hourly chart */}
      <div className="bg-[#0f1629]/60 rounded-3xl p-6 border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">Aktivita po hodinách (dnes)</h3>
        <div className="flex items-end gap-1 h-32">
          {statistics.hourlyActivity.map((value, index) => {
            const maxValue = Math.max(...statistics.hourlyActivity, 1);
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-blue-500/20 rounded-t-sm relative" 
                  style={{ 
                    height: `${(value / maxValue) * 100}%`, 
                    minHeight: value > 0 ? '4px' : '2px' 
                  }}>
                  <div 
                    className="absolute inset-0 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm" 
                    style={{ opacity: value > 0 ? 0.8 : 0.1 }} 
                  />
                </div>
                {index % 4 === 0 && (
                  <span className="text-[9px] text-gray-600">{index}h</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderActivityView = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-2">Všetky udalosti</h2>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
        {events.map(event => (
          <div 
            key={event.id} 
            className={`bg-[#0f1629]/60 rounded-2xl p-4 border border-white/[0.04] flex items-start gap-3 group hover:border-white/[0.08] transition-all ${event.severity === 'alert' ? 'border-l-2 border-l-red-500' : event.severity === 'warning' ? 'border-l-2 border-l-amber-500' : ''}`}>
            <div className={`p-2 rounded-xl mt-0.5 ${event.severity === 'alert' ? 'bg-red-500/10 text-red-400' : event.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {event.severity === 'alert' ? (
                <AlertTriangle size={16} />
              ) : (
                <Activity size={16} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-medium">{event.sensor_name || 'Systém'}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${event.severity === 'alert' ? 'bg-red-500/15 text-red-400' : event.severity === 'warning' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {event.severity}
                </span>
                {event.acknowledged && (
                  <CheckCircle size={12} className="text-emerald-500" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{event.description}</p>
              <p className="text-[11px] text-gray-600 mt-1">
                {new Date(event.timestamp).toLocaleString('sk-SK')}
              </p>
            </div>
            {!event.acknowledged && (
              <button 
                onClick={() => acknowledgeEvent(event.id)} 
                className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all">
                Potvrdiť
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMembersView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Členovia domácnosti</h2>
        {user.role === 'admin' && (
          <button 
            onClick={() => setShowAddMemberModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-sm font-semibold rounded-2xl hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
            <UserPlus size={16} /> Pridať člena
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {members.map(member => (
          <div 
            key={member.id} 
            className="bg-[#0f1629]/60 rounded-2xl p-5 border border-white/[0.06] hover:border-blue-500/20 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                  <User size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{member.full_name}</p>
                  <p className="text-gray-500 text-xs">@{member.username}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${member.role === 'admin' ? 'bg-blue-500/15 text-blue-400' : 'bg-gray-500/15 text-gray-400'}`}>
                {member.role}
              </span>
            </div>
            {member.email && (
              <p className="text-xs text-gray-500 mt-3">{member.email}</p>
            )}
            {member.last_login && (
              <p className="text-[11px] text-gray-600 mt-1 flex items-center gap-1">
                <Clock size={10} /> Posledné prihlásenie: {new Date(member.last_login).toLocaleString('sk-SK')}
              </p>
            )}
            {user.role === 'admin' && member.id !== user.id && (
              <button 
                onClick={() => handleRemoveMember(member.id)} 
                className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-all">
                <Trash2 size={12} /> Odstrániť
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-[#0c1222] rounded-3xl p-8 border border-white/[0.06] shadow-2xl max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Nový člen</h3>
              <button 
                onClick={() => setShowAddMemberModal(false)} 
                className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'full_name', label: 'Meno a priezvisko', type: 'text' },
                { key: 'username', label: 'Používateľské meno', type: 'text' },
                { key: 'password', label: 'Heslo', type: 'password' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'Telefón', type: 'tel' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[12px] font-medium text-gray-400 mb-1.5">
                    {field.label}
                  </label>
                  <input 
                    type={field.type} 
                    value={newMember[field.key]}
                    onChange={e => setNewMember({ ...newMember, [field.key]: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0a0f1e] border border-white/[0.08] rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all" 
                  />
                </div>
              ))}
              <div>
                <label className="block text-[12px] font-medium text-gray-400 mb-1.5">Rola</label>
                <select 
                  value={newMember.member_role} 
                  onChange={e => setNewMember({ ...newMember, member_role: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0a0f1e] border border-white/[0.08] rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all">
                  <option value="viewer">Divák</option>
                  <option value="member">Člen</option>
                  <option value="admin">Administrátor</option>
                </select>
              </div>
            </div>
            <button 
              onClick={handleAddMember}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] transition-all">
              Pridať člena
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSettingsView = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Nastavenia</h2>

      <div className="bg-[#0f1629]/60 rounded-3xl p-6 border border-white/[0.06] space-y-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Notifikácie</h3>

        {[
          { key: 'notifications_enabled', label: 'Notifikácie', desc: 'Zapnúť notifikácie v aplikácii' },
          { key: 'sound_alerts', label: 'Zvukové upozornenia', desc: 'Prehrať zvuk pri výstrahách' },
          { key: 'email_notifications', label: 'Emailové notifikácie', desc: 'Posielať upozornenia na email' },
          { key: 'auto_acknowledge', label: 'Auto potvrdenie', desc: 'Automaticky potvrdiť info udalosti' },
        ].map(option => (
          <div key={option.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-white text-sm font-medium">{option.label}</p>
              <p className="text-gray-500 text-xs">{option.desc}</p>
            </div>
            <button 
              onClick={() => setUserPreferences({ 
                ...userPreferences, 
                [option.key]: !userPreferences[option.key] 
              })}
              className={`w-12 h-7 rounded-full transition-all duration-300 ${userPreferences[option.key] ? 'bg-blue-500' : 'bg-gray-700'} relative`}>
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${userPreferences[option.key] ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        ))}

        <div className="pt-2">
          <label className="block text-white text-sm font-medium mb-2">Priorita notifikácií</label>
          <select 
            value={userPreferences.notification_priority}
            onChange={e => setUserPreferences({ 
              ...userPreferences, 
              notification_priority: e.target.value 
            })}
            className="w-full px-4 py-3 bg-[#0a0f1e] border border-white/[0.08] rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all">
            <option value="all">Všetky udalosti</option>
            <option value="warnings">Varovania a výstrahy</option>
            <option value="critical">Len výstrahy</option>
          </select>
        </div>
      </div>

      <div className="bg-[#0f1629]/60 rounded-3xl p-6 border border-white/[0.06] space-y-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Zariadenie</h3>
        <button 
          onClick={() => setShowUSBConfig(true)}
          className="w-full py-3.5 bg-[#0a0f1e] border border-white/[0.08] text-white font-medium rounded-2xl hover:border-blue-500/30 transition-all flex items-center justify-center gap-2 text-sm">
          <Usb size={16} /> USB konfigurácia ESP32
        </button>
      </div>

      <button 
        onClick={savePreferences}
        className="px-8 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] transition-all">
        Uložiť nastavenia
      </button>

      <ESP32USBConfig 
        isOpen={showUSBConfig} 
        onClose={() => setShowUSBConfig(false)}
        onSuccess={() => { 
          addToast('ESP32 nakonfigurované!', 'success'); 
          setShowUSBConfig(false); 
          setTimeout(fetchDashboard, 3000); 
        }} 
      />
    </div>
  );

  const viewRenderers = {
    dashboard: renderDashboardView,
    statistics: renderStatisticsView,
    activity: renderActivityView,
    members: renderMembersView,
    settings: renderSettingsView,
  };

  /* ═══════════════════════════════════════════
     MAIN LAYOUT
     ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#060b18] text-white flex">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Buzzer Alert */}
      {buzzerActive && (
        <div className="fixed top-0 left-0 right-0 bg-red-500/90 backdrop-blur-xl text-white py-4 px-6 flex items-center justify-between gap-4 z-50 animate-slide-down">
          <div className="flex items-center gap-3">
            <Volume2 size={22} className="animate-bounce" />
            <span className="font-bold">BZUČIAK AKTÍVNY — Detekovaná bezpečnostná udalosť!</span>
          </div>
          <button 
            onClick={deactivateBuzzer}
            className="px-6 py-2 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2">
            <VolumeX size={18} /> Vypnúť
          </button>
        </div>
      )}

      {/* ─── SIDEBAR ─── */}
      <div className={`fixed left-0 top-0 bottom-0 ${sidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 z-40 flex flex-col`}>
        <div className="absolute inset-2 bg-[#0c1222]/80 backdrop-blur-2xl rounded-3xl border border-white/[0.06] shadow-2xl" />
        <div className={`absolute ${sidebarExpanded ? 'left-2' : 'left-2'} top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-blue-500/40 to-transparent rounded-full`} style={{ left: '9px' }} />

        <div className="relative flex flex-col h-full p-3">
          {/* Logo */}
          <div className={`flex items-center ${sidebarExpanded ? 'gap-3 px-3' : 'justify-center'} py-4 mb-2`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            {sidebarExpanded && (
              <span className="text-white font-bold text-lg tracking-tight">SecurityPlus</span>
            )}
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-1">
            {navItems.map(item => {
              const isActive = activeView === item.id;
              return (
                <button 
                  key={item.id} 
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center ${sidebarExpanded ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-2xl transition-all duration-200 relative group ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 to-cyan-500/10 rounded-2xl border border-blue-500/20" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
                    </>
                  )}
                  <item.icon size={20} className={`relative z-10 flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
                  {sidebarExpanded && (
                    <span className="relative z-10 text-sm font-medium">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="space-y-1 mt-auto">
            <button 
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className={`w-full flex items-center ${sidebarExpanded ? 'gap-3 px-4' : 'justify-center'} py-3 rounded-2xl text-gray-500 hover:text-gray-300 transition-all`}>
              <ChevronRight size={20} className={`transition-transform ${sidebarExpanded ? 'rotate-180' : ''}`} />
              {sidebarExpanded && <span className="text-sm">Zbaliť</span>}
            </button>
            <button 
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarExpanded ? 'gap-3 px-4' : 'justify-center'} py-3 rounded-2xl text-gray-500 hover:text-red-400 transition-all`}>
              <LogOut size={20} />
              {sidebarExpanded && <span className="text-sm">Odhlásiť</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className={`flex-1 ${sidebarExpanded ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Top Bar */}
        <div className={`sticky top-0 z-30 bg-[#060b18]/80 backdrop-blur-xl border-b border-white/[0.04] px-8 py-4 ${buzzerActive ? 'mt-16' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{household.name}</h1>
              <p className="text-gray-500 text-xs mt-0.5">
                {user.full_name} • {user.role} | <span className="text-blue-400 font-mono">{household.household_key}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* ESP32 Status */}
              <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 transition-all duration-500 ${esp32Online ? 'bg-emerald-500/5 border-emerald-500/20' : esp32Online === false ? 'bg-red-500/5 border-red-500/20' : 'bg-gray-500/5 border-gray-500/20'}`}>
                {esp32Online ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Online</span>
                  </>
                ) : esp32Online === false ? (
                  <>
                    <WifiOff size={14} className="text-red-400" />
                    <span className="text-xs font-medium text-red-400">Offline</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
                    <span className="text-xs font-medium text-gray-400">Kontrolujem...</span>
                  </>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all relative">
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] h-[18px] animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-[#0c1222]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-2xl z-50 max-h-96 overflow-hidden animate-scale-in">
                    <div className="p-4 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#0c1222]/95 backdrop-blur-xl">
                      <h3 className="font-semibold text-sm">Notifikácie</h3>
                      {notifications.length > 0 && (
                        <button 
                          onClick={clearNotifications} 
                          className="text-xs text-blue-400 hover:text-blue-300">
                          Vymazať
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-80">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Bell size={28} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Žiadne nové notifikácie</p>
                        </div>
                      ) : notifications.map((notification, index) => (
                        <div 
                          key={index} 
                          className={`p-3.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all ${notification.severity === 'alert' ? 'bg-red-500/[0.03]' : ''}`}>
                          <div className="flex items-start gap-2.5">
                            {notification.severity === 'alert' && (
                              <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-xs font-medium text-white">
                                {notification.sensor_name || 'Systém'}
                              </p>
                              <p className="text-[11px] text-gray-400">{notification.description}</p>
                              <p className="text-[10px] text-gray-600 mt-1">
                                {new Date(notification.timestamp).toLocaleString('sk-SK')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {viewRenderers[activeView]?.() || renderDashboardView()}
        </div>
      </div>

      {/* Global Styles */}
      <style>{`
        @keyframes toast-in { 
          from { transform: translateX(100%); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
        @keyframes slide-down {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-toast-in { animation: toast-in 0.3s ease-out; }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
      `}</style>
    </div>
  );
};

export default HouseholdDashboard;