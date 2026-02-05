import React, { useState, useEffect } from 'react';
import { Home, Shield, Activity, Users, Settings, Lock, Unlock, DoorOpen, Eye, AlertTriangle, Bell, UserPlus, Trash2, LogOut, CheckCircle } from 'lucide-react';

const API_URL = 'http://35.158.231.80:3000/api';

const HouseholdDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newMember, setNewMember] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    member_role: 'viewer'
  });

  const handleLogin = async () => {
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
      } else {
        alert(data.error || 'Prihlásenie zlyhalo');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Chyba pripojenia k serveru');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
    setUser(null);
    localStorage.removeItem('household_token');
    localStorage.removeItem('household_user');
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('household_token');
    const savedUser = localStorage.getItem('household_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/household/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 403 || response.status === 401) {
        handleLogout();
        return;
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Fetch dashboard error:', error);
    }
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
      alert('Nemáte oprávnenie na ovládanie alarmu');
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
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Toggle alarm error:', error);
    }
  };

  const handleAddMember = async () => {
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
        alert('Člen pridaný úspešne!');
        setShowAddMemberModal(false);
        setNewMember({ username: '', password: '', full_name: '', email: '', phone: '', member_role: 'viewer' });
        fetchDashboard();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Add member error:', error);
      alert('Chyba pripojenia');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Naozaj chcete odstrániť tohto člena?')) return;

    try {
      const response = await fetch(`${API_URL}/household/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Člen odstránený');
        fetchDashboard();
      }
    } catch (error) {
      console.error('Remove member error:', error);
    }
  };

  const acknowledgeEvent = async (eventId) => {
    try {
      await fetch(`${API_URL}/household/events/${eventId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDashboard();
    } catch (error) {
      console.error('Acknowledge error:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/50 mb-4">
              <Home size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent mb-2">
              SecurityPlus
            </h1>
            <p className="text-gray-400">Domáci bezpečnostný systém</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Používateľské meno
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Heslo
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Prihlásiť sa
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Načítavam...</div>
      </div>
    );
  }

  const { household, sensors, events, members } = dashboardData;
  const alarmActive = household.alarm_status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/50">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                {household.name}
              </h1>
              <p className="text-gray-400 text-sm">{user.full_name} • {user.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700">
              <span className="text-xs text-gray-400">Kľúč: </span>
              <span className="text-cyan-300 font-mono text-sm">{household.household_key}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1 space-y-2">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 text-cyan-300'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              <Home size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveView('activity')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'activity'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 text-cyan-300'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
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
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 text-cyan-300'
                    : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                <Users size={20} />
                <span className="font-medium">Členovia</span>
              </button>
            )}
          </div>

          <div className="col-span-3 space-y-6">
            {activeView === 'dashboard' && (
              <>
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Stav Alarmu</h2>
                      <p className="text-gray-400">
                        {alarmActive ? 'Systém je aktívny a monitoruje všetky senzory' : 'Systém je v pohotovostnom režime'}
                      </p>
                    </div>
                    
                    <button
                      onClick={toggleAlarm}
                      disabled={user.role === 'viewer'}
                      className={`relative px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
                        alarmActive
                          ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/50'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/50'
                      } ${user.role === 'viewer' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {alarmActive ? <Lock size={24} /> : <Unlock size={24} />}
                        {alarmActive ? 'VYPNÚŤ' : 'ZAPNÚŤ'}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {sensors.map(sensor => (
                    <div
                      key={sensor.id}
                      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border transition-all ${
                        sensor.status === 'triggered'
                          ? 'border-red-500 shadow-lg shadow-red-500/30'
                          : sensor.status === 'active'
                          ? 'border-green-500/30'
                          : 'border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{sensor.name}</h3>
                          <p className="text-sm text-gray-400">{sensor.location}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${
                          sensor.status === 'triggered' ? 'bg-red-500/20 text-red-400' :
                          sensor.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          'bg-slate-700/50 text-gray-400'
                        }`}>
                          {sensor.type === 'door' || sensor.type === 'window' ? <DoorOpen size={20} /> : <Eye size={20} />}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Batéria:</span>
                        <span className={`font-semibold ${sensor.battery_level > 20 ? 'text-green-300' : 'text-red-300'}`}>
                          {sensor.battery_level}%
                        </span>
                      </div>

                      <div className={`h-1 rounded-full ${
                        sensor.status === 'triggered' ? 'bg-red-500' :
                        sensor.status === 'active' ? 'bg-green-500' :
                        'bg-slate-700'
                      }`} />
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                    <Activity className="text-cyan-400" size={24} />
                    Nedávna Aktivita
                  </h2>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {events.slice(0, 10).map(event => (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          event.severity === 'alert' ? 'bg-red-500/10 border-red-500/30' :
                          event.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-slate-700/30 border-slate-600/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {event.severity === 'alert' && <AlertTriangle size={18} className="text-red-400" />}
                          <div>
                            <p className="font-medium">{event.sensor_name || 'Systém'}</p>
                            <p className="text-xs text-gray-400">{event.description}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm flex items-center gap-3">
                          <div>
                            <p className="text-gray-300">{new Date(event.timestamp).toLocaleTimeString('sk-SK')}</p>
                            <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleDateString('sk-SK')}</p>
                          </div>
                          {!event.acknowledged && event.severity !== 'info' && (
                            <button
                              onClick={() => acknowledgeEvent(event.id)}
                              className="p-1 text-green-400 hover:bg-green-500/10 rounded"
                              title="Potvrdiť"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeView === 'activity' && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                <h2 className="text-xl font-bold mb-4">Kompletná História</h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {events.map(event => (
                    <div key={event.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{event.sensor_name || 'Systém'}</p>
                          <p className="text-sm text-gray-400">{event.description}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-300">{new Date(event.timestamp).toLocaleString('sk-SK')}</p>
                          {event.acknowledged && (
                            <p className="text-xs text-green-400">✓ Potvrdené</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'members' && user.role === 'admin' && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Správa Členov ({members.length}/7)</h2>
                  {members.length < 7 && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                    >
                      <UserPlus size={20} />
                      Pridať člena
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div>
                        <p className="font-semibold">{member.full_name}</p>
                        <p className="text-sm text-gray-400">{member.username}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          member.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                          member.role === 'editor' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {member.role}
                        </span>
                        {member.id !== user.id && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Pridať nového člena</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Používateľské meno</label>
                  <input
                    type="text"
                    value={newMember.username}
                    onChange={(e) => setNewMember({...newMember, username: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Heslo</label>
                  <input
                    type="password"
                    value={newMember.password}
                    onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Celé meno</label>
                  <input
                    type="text"
                    value={newMember.full_name}
                    onChange={(e) => setNewMember({...newMember, full_name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Telefón</label>
                  <input
                    type="tel"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rola</label>
                  <select
                    value={newMember.member_role}
                    onChange={(e) => setNewMember({...newMember, member_role: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="viewer">Viewer (Iba sledovanie)</option>
                    <option value="editor">Editor (Ovládanie)</option>
                    <option value="admin">Admin (Plná správa)</option>
                  </select>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setShowAddMemberModal(false)}
                    className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  >
                    Zrušiť
                  </button>
                  <button
                    onClick={handleAddMember}
                    className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50"
                  >
                    Pridať
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HouseholdDashboard;