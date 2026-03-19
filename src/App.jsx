import React, { useState, useEffect, useRef } from 'react';
import { Home, Shield, Activity, Users, Settings, Lock, Unlock, DoorOpen, Eye, AlertTriangle, Bell, UserPlus, Trash2, LogOut, CheckCircle, BarChart3, TrendingUp, Clock, Zap, Volume2, VolumeX, Moon, Sun, User, PieChart, Calendar, Wifi, WifiOff, X, Usb, ChevronRight, Radio, Gauge, ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, Footprints, Power } from 'lucide-react';


const API_URL = 'https://api.humaj.xyz/api';


const Toast = ({ message, type = 'info', onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 5000);
    return () => clearTimeout(timer);
  }, []);

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


const BuzzerPopup = ({ onDeactivate, onClose }) => {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border-2 border-red-500/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_0_60px_rgba(239,68,68,0.3)] animate-fade-in-up">
        {/* Pulsing icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center animate-pulse">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">Bolo detekované narušenie!</h2>
        <p className="text-red-300 text-center text-sm mb-6">Alarm bol uvedený do prevádzky.</p>

        <div className="space-y-3">
          <button
            onClick={onDeactivate}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all active:scale-[0.98] text-lg flex flex-col items-center justify-center gap-1"
          >
            <span>Vypnúť zvukové hlásenie</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-[#A3A3A3] font-medium rounded-xl border border-white/10 transition-all text-sm"
          >
            Ignorovať
          </button>
        </div>
      </div>
    </div>
  );
};


const StatCard = ({ icon: Icon, label, value, sub, trend, iconColor }) => {
  const trendColor = iconColor ? `text-[${iconColor}]` : (trend > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]');

  return (
    <div className="card-neon p-6 relative overflow-hidden group hover:border-[#9357b5]/50 transition-all duration-500 h-full flex flex-col justify-between">
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#9357b5]/5 rounded-full blur-3xl group-hover:bg-[#9357b5]/10 transition-all duration-500" />
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div>
          <p className="text-[11px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">{label}</p>
          <h3 className="text-4xl font-bold text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-300`} style={iconColor ? { color: iconColor } : undefined}>
          <Icon size={24} className={iconColor ? undefined : trendColor} />
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


const SensorCard = ({ sensor, alarmActive, onToggle, canToggle }) => {
  const isTriggered = sensor.status === 'triggered';
  const isEnabled = Boolean(sensor.is_enabled);

  const IconComp = {
    door: DoorOpen,
    window: DoorOpen,
    motion: Footprints,
  }[sensor.type] || DoorOpen;


  let dotClass;
  if (!isEnabled) {
    dotClass = 'bg-[#525252] shadow-none';
  } else if (isTriggered && alarmActive) {
    dotClass = 'bg-[#EF4444] shadow-[0_0_12px_#EF4444] animate-pulse';
  } else if (isTriggered && !alarmActive) {
    dotClass = 'bg-[#F59E0B] shadow-[0_0_12px_#F59E0B] animate-pulse';
  } else {
    dotClass = 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]';
  }

  return (
    <div className={`card-neon p-4 group transition-all duration-300 relative overflow-hidden ${!isEnabled ? 'opacity-50 grayscale border-white/5' : isTriggered ? (alarmActive ? 'border-[#EF4444]/50' : 'border-[#F59E0B]/40') : 'hover:border-[#9357b5]/30'}`}>
      {isEnabled && isTriggered && alarmActive && <div className="absolute inset-0 bg-[#EF4444]/5 animate-pulse" />}
      {isEnabled && isTriggered && !alarmActive && <div className="absolute inset-0 bg-[#F59E0B]/5 animate-pulse" />}

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-colors ${!isEnabled
            ? 'bg-transparent text-[#525252] border-white/5'
            : isTriggered
              ? (alarmActive ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20')
              : 'bg-white/5 text-[#A3A3A3] border-white/5 group-hover:text-[#9357b5] group-hover:border-[#9357b5]/20'
            }`}>
            <IconComp size={18} />
          </div>
          <div>
            <p className={`text-sm font-bold ${!isEnabled ? 'text-[#737373] line-through decoration-[#737373]/50' : isTriggered ? (alarmActive ? 'text-[#EF4444]' : 'text-[#F59E0B]') : 'text-white'} flex items-center gap-2`}>
              {sensor.name}
            </p>
            <p className="text-[9px] text-[#737373] uppercase tracking-wider font-semibold">{sensor.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${dotClass}`} />
          {canToggle && (
            <button
              onClick={onToggle}
              title={isEnabled ? 'Vypnúť senzor' : 'Zapnúť senzor'}
              className={`p-1.5 rounded-lg border transition-all ${isEnabled ? 'bg-[#9357b5]/10 text-[#9357b5] border-[#9357b5]/20 hover:bg-[#9357b5] hover:text-white' : 'bg-white/5 text-[#737373] border-white/10 hover:bg-white/10 hover:text-white'}`}
            >
              <Power size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


const ActivityItem = ({ event }) => {
  const isAlert = event.severity === 'alert' || event.severity === 'critical';
  const isWarning = event.severity === 'warning';
  const count = event.count || 1;

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
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all ${rowBg} relative`}>
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
      <div className="flex items-center gap-2 flex-shrink-0 mt-1">
        {count > 1 && (
          <span className="bg-[#9357b5] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(147,87,181,0.3)] min-w-[24px] text-center">
            +{count}
          </span>
        )}
        {isAlert && (
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        )}
      </div>
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
  const [hasInternet, setHasInternet] = useState(true);
  const [esp32Online, setEsp32Online] = useState(null);
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [showUSBConfig, setShowUSBConfig] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // POPUP STATE
  const [showBuzzerPopup, setShowBuzzerPopup] = useState(false);
  const showBuzzerPopupRef = useRef(false);
  const [buzzerEventDesc, setBuzzerEventDesc] = useState('');
  const lastSeenEventId = useRef(0);
  const buzzerDismissed = useRef(false);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [newMember, setNewMember] = useState({
    username: '', password: '', full_name: '', email: '', phone: '', member_role: 'viewer'
  });
  const [keypadCodeInput, setKeypadCodeInput] = useState('');

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
    dailyActivity: Array(7).fill(0),
    dailyLabels: ['', '', '', '', '', '', '']
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
      addToast(esp32Online ? 'Systém pripojený!' : 'Systém odpojený!', esp32Online ? 'success' : 'error');
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
    setLoginForm({ username: '', password: '' });
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

      // Buzzer/popup logic always runs (uses refs, not re-render dependent)
      const serverBuzzerActive = data.system_status?.buzzer_active === true;
      setBuzzerActive(serverBuzzerActive);

      // Auto-close popup when buzzer becomes inactive (e.g. code entered on keypad)
      if (!serverBuzzerActive) {
        setShowBuzzerPopup(false);
        showBuzzerPopupRef.current = false;
        buzzerDismissed.current = false;
      }

      // POPUP TRIGGER: Check for new alert events OR buzzer_active from server
      const alarmOn = data.household?.alarm_status === 'active';
      if (alarmOn && data.events && data.events.length > 0) {
        const newestEvent = data.events[0];
        const newestId = newestEvent.id;

        if (newestId > lastSeenEventId.current && lastSeenEventId.current > 0) {
          const newAlertEvents = data.events.filter(e =>
            e.id > lastSeenEventId.current &&
            (e.severity === 'alert' || e.severity === 'critical')
          );

          if (newAlertEvents.length > 0 && !buzzerDismissed.current) {
            setShowBuzzerPopup(true);
            showBuzzerPopupRef.current = true;
          }
        }
        lastSeenEventId.current = newestId;
      } else if (data.events && data.events.length > 0) {
        lastSeenEventId.current = data.events[0].id;
      }

      if (serverBuzzerActive && !showBuzzerPopupRef.current && !buzzerDismissed.current) {
        setShowBuzzerPopup(true);
        showBuzzerPopupRef.current = true;
      }

      // Skip UI update if user is typing in an input to prevent focus loss
      const isTyping = document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      if (!isTyping) {
        setDashboardData(data);
        setEsp32Online(data.system_status?.online === true);
        calculateStatistics(data.events, data.event_stats, data.hourly_activity);
      }
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
        showBuzzerPopupRef.current = false;
        addToast('Bzučiak vypnutý', 'success');
        fetchDashboard();
      } else { addToast('Nepodarilo sa vypnúť bzučiak', 'error'); }
    } catch { addToast('Chyba komunikácie so serverom', 'error'); }
  };

  const calculateStatistics = (events, serverStats, serverHourly) => {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    let sensorCounts = {};
    let dailyActivity = Array(7).fill(0);
    events.forEach(ev => {
      const eventDate = new Date(ev.timestamp);
      if (eventDate >= weekStart) {
        const evStr = eventDate.toDateString();
        for (let i = 0; i < 7; i++) {
          const d = new Date(now.getTime() - i * 86400000);
          if (evStr === d.toDateString()) dailyActivity[6 - i]++;
        }
      }
      if (ev.sensor_name) { sensorCounts[ev.sensor_name] = (sensorCounts[ev.sensor_name] || 0) + 1; }
    });
    let mostActiveSensor = null; let maxCount = 0;
    Object.entries(sensorCounts).forEach(([sensorName, count]) => { if (count > maxCount) { maxCount = count; mostActiveSensor = { name: sensorName, count }; } });
    const dayNamesArr = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
    const dailyLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      dailyLabels.push(dayNamesArr[d.getDay()]);
    }
    // Use server-provided stats (unlimited) if available, otherwise fallback to client-side
    const todayStats = serverStats?.today || { total: 0, alerts: 0, warnings: 0 };
    const weekStats = serverStats?.week || { total: 0, alerts: 0, warnings: 0 };
    const monthStats = serverStats?.month || { total: 0, alerts: 0, warnings: 0 };
    // Use server-provided hourly activity (correct timezone from MySQL HOUR())
    const hourlyActivity = serverHourly || Array(24).fill(0);
    setStatistics({ today: todayStats, week: weekStats, month: monthStats, mostActiveSensor, hourlyActivity, dailyActivity, dailyLabels });
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

  const clearHistory = async () => {
    if (!window.confirm('Naozaj chcete vymazať celú históriu udalostí?')) return;
    try {
      const res = await fetch(`${API_URL}/household/events`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('História vymazaná', 'success');
        fetchDashboard();
      } else {
        addToast('Nepodarilo sa vymazať históriu', 'error');
      }
    } catch {
      addToast('Chyba pripojenia', 'error');
    }
  };

  const handleSetCode = async () => {
    if (!keypadCodeInput || keypadCodeInput.length < 4) {
      addToast('Kód musí mať aspoň 4 znaky', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/household/me/keypad-code`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ keypad_code: keypadCodeInput })
      });
      if (res.ok) {
        addToast('Kód bol uložený', 'success');
        fetchDashboard();
        setKeypadCodeInput('');
      } else {
        addToast('Chyba pri ukladaní kódu', 'error');
      }
    } catch {
      addToast('Chyba pripojenia', 'error');
    }
  };

  const handleResetCode = async (memberId) => {
    if (!window.confirm('Naozaj chcete zmazať kód tohto používateľa?')) return;
    try {
      const res = await fetch(`${API_URL}/household/members/${memberId}/reset-code`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Kód používateľa zmazaný', 'success');
        fetchDashboard();
      } else {
        addToast('Chyba', 'error');
      }
    } catch {
      addToast('Chyba pripojenia', 'error');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Naozaj vymazať používateľa?')) return;
    try {
      const res = await fetch(`${API_URL}/household/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Používateľ vymazaný', 'success');
        fetchDashboard();
      }
    } catch {
      addToast('Chyba pripojenia', 'error');
    }
  };

  const handleAddMember = async () => {
    if (!newMember.username || !newMember.password || !newMember.full_name) {
      addToast('Vyplňte povinné údaje', 'error'); return;
    }
    try {
      const res = await fetch(`${API_URL}/household/members/add`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMember, role: newMember.member_role, household_id: dashboardData?.household?.id })
      });
      if (res.ok) {
        addToast('Člen pridaný', 'success');
        setNewMember({ username: '', password: '', full_name: '', email: '', phone: '', member_role: 'viewer' });
        fetchDashboard();
      } else { addToast('Chyba', 'error'); }
    } catch { addToast('Spojenie zlyhalo', 'error'); }
  };

  const handleToggleSensor = async (sensorId) => {
    try {
      const res = await fetch(`${API_URL}/household/sensors/${sensorId}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchDashboard();
      } else {
        addToast('Nepodarilo sa prepnúť senzor', 'error');
      }
    } catch {
      addToast('Chyba pripojenia', 'error');
    }
  };

  // Helper for grouping events
  const groupEvents = (rawEvents) => {
    if (!rawEvents || rawEvents.length === 0) return [];
    const grouped = [];
    let currentGroup = { ...rawEvents[0], count: 1 };

    for (let i = 1; i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const timeDiff = Math.abs(new Date(currentGroup.timestamp) - new Date(ev.timestamp)) / 1000;

      if (ev.sensor_name === currentGroup.sensor_name && ev.event_type === currentGroup.event_type && timeDiff <= 60) {
        currentGroup.count += 1;
      } else {
        grouped.push(currentGroup);
        currentGroup = { ...ev, count: 1 };
      }
    }
    grouped.push(currentGroup);
    return grouped;
  };

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
          onDeactivate={deactivateBuzzer}
          onClose={() => { setShowBuzzerPopup(false); showBuzzerPopupRef.current = false; buzzerDismissed.current = true; }}
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
            {user?.role !== 'admin' && (
              <button onClick={() => setActiveView('mycode')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${activeView === 'mycode' ? 'bg-[#9357b5] text-white shadow-[0_0_15px_rgba(147,87,181,0.5)]' : 'text-[#A3A3A3] hover:text-white hover:bg-white/5'}`}>
                Kód
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
              <StatCard icon={Activity} label="Dnešná Aktivita" value={statistics.today.total > 100 ? '100+' : statistics.today.total} />
              <StatCard icon={ShieldCheck} label="Aktívne senzory" value={sensors.length}
                iconColor="#f1ec63" />
              <StatCard icon={AlertTriangle} label="Bezpečnostné výstrahy" value={statistics.today.alerts} />
              <StatCard icon={Users} label="Počet používateľov" value={members.length}
                iconColor="#FFFFFF" />
            </div>

            {/* Sensors + Activity History */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Activity size={20} className="text-[#9357b5]" />
                  Stav senzorov
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {sensors.map(sensor => (
                    <SensorCard key={sensor.id} sensor={sensor} alarmActive={alarmActive} onToggle={() => handleToggleSensor(sensor.id)} canToggle={user?.role === 'admin'} />
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock size={20} className="text-[#9357b5]" />
                    História aktivity
                  </h3>
                  <button onClick={clearHistory} className="text-xs flex items-center gap-1 text-[#EF4444] hover:bg-[#EF4444]/10 px-3 py-1.5 rounded-lg transition-all">
                    <Trash2 size={14} /> Vymazať
                  </button>
                </div>
                <div className="card-neon p-2 overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {events.length === 0 ? (
                      <div className="text-center py-12 text-[#525252]">
                        <Activity size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">Žiadna aktivita</p>
                      </div>
                    ) : (
                      groupEvents(events).slice(0, 50).map((event, i) => (
                        <ActivityItem key={event.id || i} event={event} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'statistics' && (
          <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <PieChart className="text-[#9357b5]" />
              Podrobné štatistiky
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-neon p-6">
                <h3 className="text-lg font-bold text-white mb-4">Aktivita za posledných 7 dní</h3>
                <div className="h-40 flex flex-col">
                  <div className="flex-1 flex items-end gap-2 overflow-hidden">
                    {statistics.dailyActivity.map((count, idx) => (
                      <div key={idx} className="flex-1 h-full flex items-end group relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#9357b5] text-white text-[10px] font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
                          {count}
                        </div>
                        <div
                          className="w-full bg-[#9357b5] rounded-t-lg transition-all group-hover:bg-[#a66cc9] cursor-pointer"
                          style={{ height: `${Math.max(5, (count / Math.max(...statistics.dailyActivity, 1)) * 100)}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {statistics.dailyLabels.map((label, idx) => (
                      <p key={idx} className={`flex-1 text-[10px] text-center ${idx === 6 ? 'text-[#9357b5] font-bold' : 'text-[#A3A3A3]'}`}>{label}</p>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card-neon p-6">
                <h3 className="text-lg font-bold text-white mb-4">Aktivita počas dňa (24h)</h3>
                <div className="h-40 flex flex-col">
                  <div className="flex-1 flex items-end gap-[2px] overflow-hidden">
                    {statistics.hourlyActivity.map((count, idx) => (
                      <div key={idx} className="flex-1 h-full flex items-end group relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#3b82f6] text-white text-[10px] font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
                          {count}
                        </div>
                        <div
                          className="w-full bg-[#3b82f6] rounded-t-lg transition-all group-hover:bg-[#60a5fa] cursor-pointer"
                          style={{ height: `${Math.max(5, (count / Math.max(...statistics.hourlyActivity, 1)) * 100)}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-[2px] pt-2">
                    {statistics.hourlyActivity.map((_, idx) => (
                      <p key={idx} className={`flex-1 text-[7px] text-center ${idx === new Date().getHours() ? 'text-[#3b82f6] font-bold' : 'text-[#737373]'}`}>{idx}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-neon p-6">
              <h3 className="text-lg font-bold text-white mb-6">Prehľad aktivity</h3>
              <div className="space-y-4">
                {statistics.mostActiveSensor ? (
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div>
                      <p className="text-sm font-bold text-white">Najaktívnejší senzor</p>
                      <p className="text-xs text-[#A3A3A3]">{statistics.mostActiveSensor.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#9357b5]">{statistics.mostActiveSensor.count}</span>
                      <p className="text-[10px] text-[#737373] uppercase">Udalostí</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#737373]">Nedostatok údajov pre zobrazenie najaktívnejšieho senzora.</p>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold text-white">{statistics.month.total}</p>
                    <p className="text-xs text-[#737373] uppercase mt-1">Spolu za mesiac</p>
                  </div>
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
                    <p className="text-3xl font-bold text-red-400">{statistics.month.alerts}</p>
                    <p className="text-xs text-red-500/60 uppercase mt-1">Poplachov</p>
                  </div>
                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center">
                    <p className="text-3xl font-bold text-amber-400">{statistics.month.warnings}</p>
                    <p className="text-xs text-amber-500/60 uppercase mt-1">Varovaní</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'members' && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="text-[#9357b5]" />
                Spravovanie členov
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-4">
                  {members.map(member => (
                    <div key={member.id} className="card-neon p-5 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center">
                          <User size={20} className={member.role === 'admin' ? 'text-[#9357b5]' : 'text-[#A3A3A3]'} />
                        </div>
                        <div>
                          <p className="font-bold text-white flex items-center gap-2">
                            {member.full_name}
                            {member.id === user.id && <span className="px-2 py-0.5 rounded bg-[#9357b5]/20 text-[#9357b5] text-[10px] uppercase">Vy</span>}
                          </p>
                          <p className="text-xs text-[#A3A3A3]">{member.email || member.username}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px]">
                            <span className="uppercase text-[#737373] bg-white/5 px-2 py-0.5 rounded">{member.role}</span>
                            {member.keypad_code ? (
                              <span className="text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded flex items-center gap-1"><Lock size={10} /> Kód nastavený</span>
                            ) : (
                              <span className="text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded flex items-center gap-1"><Unlock size={10} /> Bez kódu</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {user.role === 'admin' && member.id !== user.id && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleResetCode(member.id)} className="p-2 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-colors" title="Resetovať kód">
                            <Unlock size={16} />
                          </button>
                          <button onClick={() => handleDeleteMember(member.id)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" title="Odstrániť člena">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {user.role === 'admin' && (
                  <div className="card-neon p-6 mt-4 border-dashed border-[#9357b5]/30 bg-[#9357b5]/5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><UserPlus size={16} className="text-[#9357b5]" /> Pridať nového člena</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Používateľské meno" value={newMember.username} onChange={e => setNewMember({ ...newMember, username: e.target.value })} className="w-full px-3 py-2 bg-[#171717] border border-[#262626] rounded-xl text-xs text-white" />
                      <input type="password" placeholder="Heslo" value={newMember.password} onChange={e => setNewMember({ ...newMember, password: e.target.value })} className="w-full px-3 py-2 bg-[#171717] border border-[#262626] rounded-xl text-xs text-white" />
                      <input type="text" placeholder="Celé meno" value={newMember.full_name} onChange={e => setNewMember({ ...newMember, full_name: e.target.value })} className="w-full px-3 py-2 bg-[#171717] border border-[#262626] rounded-xl text-xs text-white" />
                      <select value={newMember.member_role} onChange={e => setNewMember({ ...newMember, member_role: e.target.value })} className="w-full px-3 py-2 bg-[#171717] border border-[#262626] rounded-xl text-xs text-white">
                        <option value="viewer">Viewer (Zobrazenie)</option>
                        <option value="admin">Admin (Správa)</option>
                      </select>
                      <button onClick={handleAddMember} className="col-span-2 py-2 bg-[#9357b5] text-white text-xs font-bold rounded-xl mt-2 transition-all hover:bg-[#a66cc9]">Vytvoriť používateľa</button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="card-neon p-6 sticky top-28">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Lock size={18} className="text-[#9357b5]" />
                    Váš systémový kód
                  </h3>
                  <p className="text-xs text-[#A3A3A3] mb-6">
                    Nastavte si kód, ktorým môžete deaktivovať zvukové varovanie.
                  </p>
                  {(() => {
                    const myMember = members.find(m => m.id === user.id);
                    const hasCode = myMember && myMember.keypad_code;
                    if (hasCode) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl">
                            <Lock size={20} className="text-[#22C55E]" />
                            <div>
                              <p className="text-sm font-bold text-[#22C55E]">Kód je nastavený</p>
                              <p className="text-[10px] text-[#22C55E]/60">Váš systémový kód je aktívny a funkčný.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleResetCode(user.id)}
                            className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl border border-amber-500/20 transition-all"
                          >
                            Resetovať môj kód
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[#737373] mb-2 uppercase tracking-wide">Nový kód</label>
                            <input
                              type="password"
                              value={keypadCodeInput}
                              onChange={e => setKeypadCodeInput(e.target.value)}
                              className="w-full px-4 py-3 bg-[#171717] border border-[#262626] rounded-xl text-white text-sm focus:outline-none focus:border-[#9357b5] focus:shadow-[0_0_15px_rgba(147,87,181,0.3)] transition-all font-mono tracking-[0.5em] text-center"
                              placeholder="••••"
                              maxLength={10}
                            />
                          </div>
                          <button
                            onClick={handleSetCode}
                            className="w-full py-3 bg-[#9357b5] hover:bg-[#7d4a9e] text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,87,181,0.3)] transition-all"
                          >
                            Uložiť kód
                          </button>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'mycode' && (
          <div className="space-y-8 animate-fade-in-up max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Lock className="text-[#9357b5]" />
              Môj systémový kód
            </h2>
            <div className="card-neon p-6">
              <p className="text-xs text-[#A3A3A3] mb-6">
                Nastavte si kód, ktorým môžete deaktivovať zvukové varovanie pomocou fyzickej klávesnice.
              </p>
              {(() => {
                const myMember = members.find(m => m.id === user.id);
                const hasCode = myMember && myMember.keypad_code;
                if (hasCode) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl">
                        <Lock size={20} className="text-[#22C55E]" />
                        <div>
                          <p className="text-sm font-bold text-[#22C55E]">Kód je nastavený</p>
                          <p className="text-[10px] text-[#22C55E]/60">Váš systémový kód je aktívny a funkčný.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleResetCode(user.id)}
                        className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl border border-amber-500/20 transition-all"
                      >
                        Resetovať môj kód
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[#737373] mb-2 uppercase tracking-wide">Nový kód</label>
                        <input
                          type="password"
                          value={keypadCodeInput}
                          onChange={e => setKeypadCodeInput(e.target.value)}
                          className="w-full px-4 py-3 bg-[#171717] border border-[#262626] rounded-xl text-white text-sm focus:outline-none focus:border-[#9357b5] focus:shadow-[0_0_15px_rgba(147,87,181,0.3)] transition-all font-mono tracking-[0.5em] text-center"
                          placeholder="••••"
                          maxLength={10}
                        />
                      </div>
                      <button
                        onClick={handleSetCode}
                        className="w-full py-3 bg-[#9357b5] hover:bg-[#7d4a9e] text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,87,181,0.3)] transition-all"
                      >
                        Uložiť kód
                      </button>
                    </div>
                  );
                }
              })()}
            </div>
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