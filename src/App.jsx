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
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };

  return (
    <div className={`${styles[type] || styles.info} backdrop-blur-md border px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] animate-fade-in-up`}>
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg transition-all">
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
   BUZZER POPUP MODAL
   ════════════════════════════════════════════ */
const BuzzerPopup = ({ onDeactivate, onClose, eventDescription }) => {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border-2 border-red-500/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_0_60px_rgba(239,68,68,0.3)] animate-fade-in-up">
        {/* Pulsing icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center animate-pulse">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">⚠️ Alarm spustený!</h2>
        <p className="text-red-300 text-center text-sm mb-2">Bzučiak je aktívny — bol detekovaný narušenie.</p>
        {eventDescription && (
          <p className="text-[#A3A3A3] text-center text-xs mb-6 bg-white/5 rounded-lg px-3 py-2">
            {eventDescription}
          </p>
        )}

        <div className="space-y-3">
          <button
            onClick={onDeactivate}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all active:scale-[0.98] text-lg"
          >
            🔇 Vypnúť bzučiak
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-[#A3A3A3] font-medium rounded-xl border border-white/10 transition-all text-sm"
          >
            Zavrieť (alarm zostáva aktívny)
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   COMPONENTS: STAT CARD
   ════════════════════════════════════════════ */
const StatCard = ({ icon: Icon, label, value, sub, trend }) => {
  const trendColor = trend > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]';

  return (
    <div className="card-neon p-6 relative overflow-hidden group hover:border-[#9357b5]/50 transition-all duration-500 h-full flex flex-col justify-between">
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#9357b5]/5 rounded-full blur-3xl group-hover:bg-[#9357b5]/10 transition-all duration-500" />
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div>
          <p className="text-[11px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">{label}</p>
          <h3 className="text-4xl font-bold text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-white/5 border border-white/5 ${trendColor} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} />
        </div>
      </div>
      {(sub || trend !== undefined) && (
        <div className="mt-auto flex items-center gap-3 pt-4 border-t border-white/5">
          {trend !== undefined && trend !== 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${trend > 0 ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]' : 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]'}`}>
              {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-[11px] text-[#737373] font-medium truncate">{sub}</span>}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════
   SENSOR CARD — NEW DOT LOGIC
   All dots green by default.
   On trigger: yellow blink (alarm off), red blink (alarm on).
   ════════════════════════════════════════════ */
const SensorCard = ({ sensor, alarmActive }) => {
  const isTriggered = sensor.status === 'triggered';

  const IconComp = {
    door: DoorOpen,
    window: DoorOpen,
    motion: Footprints,
  }[sensor.type] || DoorOpen;

  // Dot logic:
  // - Default (active/inactive): green, steady glow
  // - Triggered + alarm OFF: yellow/amber, blinking
  // - Triggered + alarm ON: red, blinking
  let dotClass;
  if (isTriggered && alarmActive) {
    dotClass = 'bg-[#EF4444] shadow-[0_0_12px_#EF4444] animate-pulse';
  } else if (isTriggered && !alarmActive) {
    dotClass = 'bg-[#F59E0B] shadow-[0_0_12px_#F59E0B] animate-pulse';
  } else {
    dotClass = 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]';
  }

  return (
    <div className={`card-neon p-4 group transition-all duration-300 relative overflow-hidden ${isTriggered ? (alarmActive ? 'border-[#EF4444]/50' : 'border-[#F59E0B]/40') : 'hover:border-[#9357b5]/30'}`}>
      {isTriggered && alarmActive && <div className="absolute inset-0 bg-[#EF4444]/5 animate-pulse" />}
      {isTriggered && !alarmActive && <div className="absolute inset-0 bg-[#F59E0B]/5 animate-pulse" />}

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-colors ${isTriggered
            ? (alarmActive ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20')
            : 'bg-white/5 text-[#A3A3A3] border-white/5 group-hover:text-[#9357b5] group-hover:border-[#9357b5]/20'
            }`}>
            <IconComp size={18} />
          </div>
          <div>
            <p className={`text-sm font-bold ${isTriggered ? (alarmActive ? 'text-[#EF4444]' : 'text-[#F59E0B]') : 'text-white'}`}>{sensor.name}</p>
            <p className="text-[9px] text-[#737373] uppercase tracking-wider font-semibold">{sensor.location}</p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${dotClass}`} />
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   ACTIVITY HISTORY ITEM — coloring by severity
   severity 'alert'/'critical' → red tint
   severity 'warning' → mild orange tint
   severity 'info' → subtle gray
   ════════════════════════════════════════════ */
const ActivityItem = ({ event }) => {
  const isAlert = event.severity === 'alert' || event.severity === 'critical';
  const isWarning = event.severity === 'warning';

  const IconComp = {
    door_opened: DoorOpen,
    door_closed: DoorOpen,
    window_opened: DoorOpen,
    window_closed: DoorOpen,
    motion_detected: Footprints,
    alarm_triggered: ShieldAlert,
    alarm_activated: ShieldCheck,
    alarm_deactivated: ShieldAlert,
    sensor_error: AlertTriangle,
    other: Activity,
  }[event.event_type] || Activity;

  const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Práve teraz';
    if (mins < 60) return `pred ${mins}m`;
    if (hours < 24) return `pred ${hours}h`;
    return `pred ${days}d`;
  };

  let rowBg, iconBg, textColor, subColor;
  if (isAlert) {
    rowBg = 'bg-red-500/15 border border-red-500/25 hover:bg-red-500/20';
    iconBg = 'bg-red-500/20 text-red-400';
    textColor = 'text-red-300';
    subColor = 'text-red-400/60';
  } else if (isWarning) {
    rowBg = 'bg-amber-500/10 border border-amber-500/15 hover:bg-amber-500/15';
    iconBg = 'bg-amber-500/15 text-amber-400';
    textColor = 'text-amber-200';
    subColor = 'text-amber-400/50';
  } else {
    rowBg = 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]';
    iconBg = 'bg-white/5 text-[#525252]';
    textColor = 'text-[#A3A3A3]';
    subColor = 'text-[#525252]';
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all ${rowBg}`}>
      <div className={`p-2 rounded-lg mt-0.5 ${iconBg}`}>
        <IconComp size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${textColor}`}>
          {event.description || event.event_type}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {event.sensor_name && (
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${subColor}`}>
              {event.sensor_name}
            </span>
          )}
          <span className={`text-[9px] ${subColor}`}>
            {formatTime(event.timestamp)}
          </span>
        </div>
      </div>
      {isAlert && (
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mt-2 flex-shrink-0" />
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
  const [esp32Online, setEsp32Online] = useState(null);
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [showUSBConfig, setShowUSBConfig] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // POPUP STATE
  const [showBuzzerPopup, setShowBuzzerPopup] = useState(false);
  const [buzzerEventDesc, setBuzzerEventDesc] = useState('');
  const lastSeenEventId = useRef(0);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [newMember, setNewMember] = useState({
    username: '', password: '', full_name: '', email: '', phone: '', member_role: 'viewer'
  });

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

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    return id;
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const checkInternetConnection = () => { setHasInternet(navigator.onLine); };

  useEffect(() => {
    if (prevEsp32Online.current !== null && prevEsp32Online.current !== esp32Online) {
      addToast(esp32Online ? 'ESP32 pripojené!' : 'ESP32 sa odpojilo!', esp32Online ? 'success' : 'error');
    }
    prevEsp32Online.current = esp32Online;
  }, [esp32Online]);

  useEffect(() => {
    const handleOnline = () => { setHasInternet(true); addToast('Internet obnovený', 'success'); };
    const handleOffline = () => { setHasInternet(false); addToast('Stratené pripojenie', 'error'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkInternetConnection();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const handleLogin = async () => {
    if (!hasInternet) { addToast('Nie je internetové pripojenie', 'error'); return; }
    setLoginError('');
    if (!loginForm.username || !loginForm.password) { setLoginError('Vyplňte všetky polia'); return; }
    try {
      const res = await fetch(`${API_URL}/auth/household/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token); setUser(data.user); setIsLoggedIn(true);
        localStorage.setItem('household_token', data.token);
        localStorage.setItem('household_user', JSON.stringify(data.user));
        const savedPrefs = localStorage.getItem(`prefs_${data.user.id}`);
        if (savedPrefs) { const prefs = JSON.parse(savedPrefs); setUserPreferences(prefs); setTheme(prefs.theme || 'dark'); }
        addToast('Úspešne prihlásený!', 'success');
      } else {
        setLoginError(data.error || 'Prihlásenie zlyhalo');
        addToast(data.error || 'Nesprávne údaje', 'error');
      }
    } catch { setLoginError('Chyba pripojenia'); addToast('Chyba pripojenia k serveru', 'error'); }
  };

  const handleLogout = () => {
    setIsLoggedIn(false); setToken(''); setUser(null); setDashboardData(null);
    localStorage.removeItem('household_token'); localStorage.removeItem('household_user');
    addToast('Odhlásený', 'info');
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('household_token');
    const savedUser = localStorage.getItem('household_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      const userData = JSON.parse(savedUser);
      setUser(userData); setIsLoggedIn(true);
      const savedPrefs = localStorage.getItem(`prefs_${userData.id}`);
      if (savedPrefs) { const prefs = JSON.parse(savedPrefs); setUserPreferences(prefs); setTheme(prefs.theme || 'dark'); }
    }
  }, []);

  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/household/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 403 || res.status === 401) { handleLogout(); addToast('Relácia vypršala', 'warning'); return; }
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setDashboardData(data);
      setEsp32Online(data.system_status?.online === true);

      const serverBuzzerActive = data.system_status?.buzzer_active === true;
      setBuzzerActive(serverBuzzerActive);

      // POPUP TRIGGER: Check for new alert events OR buzzer_active from server
      const alarmOn = data.household?.alarm_status === 'active';
      if (alarmOn && data.events && data.events.length > 0) {
        // Find the newest event
        const newestEvent = data.events[0]; // events are sorted DESC by timestamp
        const newestId = newestEvent.id;

        if (newestId > lastSeenEventId.current && lastSeenEventId.current > 0) {
          // There are new events since last poll
          const newAlertEvents = data.events.filter(e =>
            e.id > lastSeenEventId.current &&
            (e.severity === 'alert' || e.severity === 'critical')
          );

          if (newAlertEvents.length > 0) {
            // New alert event during active alarm → show popup
            setBuzzerEventDesc(newAlertEvents[0].description || newAlertEvents[0].event_type);
            setShowBuzzerPopup(true);
          }
        }
        lastSeenEventId.current = newestId;
      } else if (data.events && data.events.length > 0) {
        lastSeenEventId.current = data.events[0].id;
      }

      // Also show popup if server says buzzer is active
      if (serverBuzzerActive && !showBuzzerPopup) {
        setShowBuzzerPopup(true);
        setBuzzerEventDesc('Bzučiak bol aktivovaný systémom');
      }

      calculateStatistics(data.events);
    } catch { }
  };

  const deactivateBuzzer = async () => {
    try {
      const res = await fetch(`${API_URL}/household/buzzer/deactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ household_id: dashboardData?.household?.id })
      });
      if (res.ok) {
        setBuzzerActive(false);
        setShowBuzzerPopup(false);
        addToast('Bzučiak vypnutý', 'success');
        fetchDashboard();
      } else { addToast('Nepodarilo sa vypnúť bzučiak', 'error'); }
    } catch { addToast('Chyba komunikácie so serverom', 'error'); }
  };

  const calculateStatistics = (events) => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
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
      if (eventDate >= monthStart) { monthStats.total++; if (ev.severity === 'alert') monthStats.alerts++; if (ev.severity === 'warning') monthStats.warnings++; }
      if (eventDate >= weekStart) { weekStats.total++; if (ev.severity === 'alert') weekStats.alerts++; if (ev.severity === 'warning') weekStats.warnings++; const dayIndex = Math.floor((now - eventDate) / 86400000); if (dayIndex < 7) dailyActivity[6 - dayIndex]++; }
      if (eventDate >= todayStart) { todayStats.total++; if (ev.severity === 'alert') todayStats.alerts++; if (ev.severity === 'warning') todayStats.warnings++; hourlyActivity[eventDate.getHours()]++; }
      if (ev.sensor_name) { sensorCounts[ev.sensor_name] = (sensorCounts[ev.sensor_name] || 0) + 1; }
    });
    let mostActiveSensor = null; let maxCount = 0;
    Object.entries(sensorCounts).forEach(([sensorName, count]) => { if (count > maxCount) { maxCount = count; mostActiveSensor = { name: sensorName, count }; } });
    setStatistics({ today: todayStats, week: weekStats, month: monthStats, mostActiveSensor, hourlyActivity, dailyActivity });
  };

  const toggleAlarm = async () => {
    if (user.role === 'viewer') { addToast('Nemáte oprávnenie', 'warning'); return; }
    try {
      const res = await fetch(`${API_URL}/household/alarm/toggle`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { fetchDashboard(); addToast(data.message || 'Alarm zmenený', 'success'); }
      else { addToast(data.error || 'Chyba', 'error'); }
    } catch { addToast('Chyba pripojenia', 'error'); }
  };

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchDashboard();
      const interval = setInterval(fetchDashboard, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, token]);

  /* ═══════════════════════════════════════════
     LOGIN SCREEN
     ═══════════════════════════════════════════ */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#9357b5] opacity-20 blur-[150px] rounded-full" />
        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-[#262626] shadow-[0_0_30px_rgba(147,87,181,0.2)] mb-6">
              <Shield size={32} className="text-[#9357b5]" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">SecurityPlus</h1>
            <p className="text-[#A3A3A3] text-sm">Prosím, prihláste sa.</p>
          </div>
          <div className="bg-[#0A0A0A]/80 backdrop-blur-md rounded-2xl p-8 border border-[#262626] shadow-2xl">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#737373] mb-2 uppercase tracking-wide">Meno</label>
                <input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-4 py-3 bg-[#171717] border border-[#262626] rounded-xl text-white text-sm focus:outline-none focus:border-[#9357b5] focus:shadow-[0_0_15px_rgba(147,87,181,0.3)] transition-all"
                  placeholder="Zadajte prihlasovacie meno" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#737373] mb-2 uppercase tracking-wide">Heslo</label>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-[#171717] border border-[#262626] rounded-xl text-white text-sm focus:outline-none focus:border-[#9357b5] focus:shadow-[0_0_15px_rgba(147,87,181,0.3)] transition-all"
                  placeholder="••••••••" />
              </div>
              <button onClick={handleLogin}
                className="w-full mt-2 py-3.5 bg-[#9357b5] hover:bg-[#7d4a9e] text-white font-bold rounded-xl shadow-[0_0_20px_rgba(147,87,181,0.4)] transition-all active:scale-[0.98]">
                Prihlásiť sa
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#9357b5] font-bold">Načítavam...</div>;

  const { household, sensors, events, members } = dashboardData;
  const alarmActive = household.alarm_status === 'active';

  /* ═══════════════════════════════════════════
     DASHBOARD
     ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* BUZZER POPUP */}
      {showBuzzerPopup && (
        <BuzzerPopup
          eventDescription={buzzerEventDesc}
          onDeactivate={deactivateBuzzer}
          onClose={() => setShowBuzzerPopup(false)}
        />
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-[#9357b5] flex items-center justify-center text-white shadow-[0_0_20px_rgba(147,87,181,0.4)]">
            <Shield size={20} fill="currentColor" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">SecurityPlus</span>
            <span className="text-[10px] text-[#A3A3A3] uppercase tracking-[0.2em] block">Domáci bezpečnostný systém</span>
          </div>
        </div>

        <div className="pointer-events-auto">
          <nav className="nav-pill flex items-center p-1.5 gap-1 shadow-2xl">
            <button onClick={() => setActiveView('dashboard')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${activeView === 'dashboard' ? 'bg-[#9357b5] text-white shadow-[0_0_15px_rgba(147,87,181,0.5)]' : 'text-[#A3A3A3] hover:text-white hover:bg-white/5'}`}>
              Dashboard
            </button>
            <button onClick={() => setActiveView('statistics')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${activeView === 'statistics' ? 'bg-[#9357b5] text-white shadow-[0_0_15px_rgba(147,87,181,0.5)]' : 'text-[#A3A3A3] hover:text-white hover:bg-white/5'}`}>
              Štatistiky
            </button>
            {user?.role === 'admin' && (
              <button onClick={() => setActiveView('members')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${activeView === 'members' ? 'bg-[#9357b5] text-white shadow-[0_0_15px_rgba(147,87,181,0.5)]' : 'text-[#A3A3A3] hover:text-white hover:bg-white/5'}`}>
                Členovia
              </button>
            )}
            <div className="w-px h-6 bg-white/10 mx-2" />
            <button onClick={toggleAlarm}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${alarmActive
                ? 'bg-[#EF4444] border-[#EF4444] text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                : 'bg-[#171717] border-[#262626] text-[#22C55E] hover:border-[#22C55E]'}`}>
              {alarmActive ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
              {alarmActive ? 'ALARM ZAPNUTÝ' : 'ALARM VYPNUTÝ'}
            </button>
            <button onClick={handleLogout}
              className="p-2.5 rounded-full text-[#A3A3A3] hover:bg-red-500/10 hover:text-red-500 transition-colors ml-1">
              <LogOut size={16} />
            </button>
          </nav>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-white">{user.full_name}</p>
            <p className="text-[10px] text-[#A3A3A3] uppercase">{user.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center">
            <User size={18} className="text-[#9357b5]" />
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32 pb-12 px-8 max-w-7xl mx-auto w-full relative z-0">
        {activeView === 'dashboard' && (
          <div className="space-y-12">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={Activity} label="Dnešná Aktivita" value={statistics.today.total}
                trend={statistics.today.total > 0 ? Math.round((statistics.today.total / Math.max(statistics.week.total / 7, 1)) * 10) : 0}
                sub="Udalostí za 24h" />
              <StatCard icon={ShieldCheck} label="Aktívne Senzory" value={sensors.length}
                sub={`${sensors.filter(s => s.status === 'active').length} online`} />
              <StatCard icon={AlertTriangle} label="Bezpečnostné Výstrahy" value={statistics.today.alerts}
                trend={statistics.today.alerts > 0 ? -(statistics.today.alerts) : 0}
                sub={statistics.today.alerts > 0 ? 'Dnešné výstrahy' : 'Žiadne výstrahy'} />
              <StatCard icon={Users} label="Počet registrovaných používateľov" value={members.length} />
            </div>

            {/* Sensors + Activity History */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Activity size={20} className="text-[#9357b5]" />
                  Stav Senzorov
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {sensors.map(sensor => (
                    <SensorCard key={sensor.id} sensor={sensor} alarmActive={alarmActive} />
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Clock size={20} className="text-[#9357b5]" />
                  História Aktivity
                </h3>
                <div className="card-neon p-2 overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {events.length === 0 ? (
                      <div className="text-center py-12 text-[#525252]">
                        <Activity size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">Žiadna aktivita</p>
                      </div>
                    ) : (
                      events.slice(0, 50).map(event => (
                        <ActivityItem key={event.id} event={event} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'statistics' && (
          <div className="text-center py-20">
            <BarChart3 size={48} className="mx-auto text-[#9357b5] mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-white">Štatistiky sú vo vývoji</h2>
            <p className="text-[#A3A3A3]">Podrobné grafy a analýzy budú dostupné čoskoro.</p>
          </div>
        )}

        {activeView === 'members' && (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto text-[#9357b5] mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-white">Správa Členov</h2>
            <p className="text-[#A3A3A3]">Zoznam a správa oprávnení.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-[#262626] bg-[#050505] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-8 flex justify-center items-center gap-8 text-[#525252] text-xs font-bold uppercase tracking-widest">
          <span>SecurityPlus</span><span>•</span><span>Maturitný projekt</span><span>•</span><span>Adam Humaj</span>
        </div>
      </footer>
    </div>
  );
};

export default HouseholdDashboard;