require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sp_jwt_2024_xK9mP2qL8nR5vT3w';

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'alarm_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

pool.getConnection()
  .then(connection => {
    console.log('DB pripojenie OK');
    connection.release();
  })
  .catch(err => {
    console.error('DB chyba:', err.message);
  });

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token chýba' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Neplatný token' });
    }
    req.user = user;
    next();
  });
};


app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: dbConfig.database ? 'connected' : 'not configured'
  });
});

app.get('/api/migrate-db', async (req, res) => {
  try {
    await pool.execute('ALTER TABLE household_users ADD COLUMN keypad_code VARCHAR(10) DEFAULT NULL');
  } catch (e) { console.log(e.message); }
  try {
    await pool.execute('DELETE FROM sensors WHERE name LIKE "%spálňa%" OR name LIKE "%spalna%" OR id = 3');
  } catch (e) { console.log(e.message); }
  res.json({ success: true });
});

app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is online',
    timestamp: new Date().toISOString()
  });
});

// PRIDANÉ: Endpoint pre ESP32 a frontend kontrolu dostupnosti
app.get('/api/household/ping', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is online',
    timestamp: new Date().toISOString()
  });
});


app.post('/api/auth/company-owner/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await pool.execute(
      'SELECT * FROM company_owners WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Nesprávne prihlasovacie údaje' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Nesprávne prihlasovacie údaje' });
    }

    await pool.execute(
      'UPDATE company_owners SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, type: 'company_owner' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Company owner login error:', error);
    res.status(500).json({ error: 'Chyba servera' });
  }
});


app.post('/api/auth/household/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await pool.execute(
      `SELECT hu.*, h.household_key, h.name as household_name, h.alarm_status 
 FROM household_users hu
 JOIN households h ON hu.household_id = h.id
 WHERE hu.username = ? AND hu.is_active = TRUE AND h.is_active = TRUE`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Nesprávne prihlasovacie údaje' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Nesprávne prihlasovacie údaje' });
    }

    await pool.execute(
      'UPDATE household_users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        household_id: user.household_id,
        role: user.role,
        type: 'household_user',
        full_name: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        household_id: user.household_id,
        household_name: user.household_name,
        household_key: user.household_key
      }
    });
  } catch (error) {
    console.error('Household login error:', error);
    res.status(500).json({ error: 'Chyba servera' });
  }
});


app.get('/api/household/dashboard', authenticateToken, async (req, res) => {
  try {
    const household_id = req.user.household_id;

    // Získaj household info so system status
    const [household] = await pool.execute(
      `SELECT 
  h.*,
  COALESCE(sh.is_online, 0) AS system_online,
  sh.last_seen AS system_last_seen,
  sh.rssi AS system_rssi,
  sh.ip_address AS system_ip,
  COALESCE(bs.is_active, 0) AS buzzer_active,
  TIMESTAMPDIFF(SECOND, sh.last_seen, NOW()) AS seconds_since_heartbeat
 FROM households h
 LEFT JOIN system_heartbeat sh ON h.id = sh.household_id
 LEFT JOIN (SELECT * FROM buzzer_status WHERE household_id = ? ORDER BY id DESC LIMIT 1) bs ON h.id = bs.household_id
 WHERE h.id = ?`,
      [household_id, household_id]
    );

    if (household.length === 0) {
      return res.status(404).json({ error: 'Domácnosť nenájdená' });
    }

    // Reálny online stav: heartbeat musí byť < 90 sekúnd
    const hh = household[0];
    const realOnline = hh.system_online == 1 && hh.seconds_since_heartbeat !== null && hh.seconds_since_heartbeat < 90;

    // Získaj senzory
    const [sensors] = await pool.execute(
      'SELECT id, sensor_code, name, type, location, status, last_triggered, is_enabled FROM sensors WHERE household_id = ?',
      [household_id]
    );

    // Získaj nedávne udalosti (max 100 pre zobrazenie)
    const [events] = await pool.execute(
      `SELECT 
  e.*,
  s.name AS sensor_name,
  s.type AS sensor_type
 FROM events e
 LEFT JOIN sensors s ON e.sensor_id = s.id
 WHERE e.household_id = ?
 ORDER BY e.timestamp DESC
 LIMIT 100`,
      [household_id]
    );

    // Získaj štatistiky bez limitu (pre štatistiky)
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getTime() - 30 * 86400000);

    const [statsRows] = await pool.execute(
      `SELECT
        SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) AS today_total,
        SUM(CASE WHEN timestamp >= ? AND severity = 'alert' THEN 1 ELSE 0 END) AS today_alerts,
        SUM(CASE WHEN timestamp >= ? AND severity = 'warning' THEN 1 ELSE 0 END) AS today_warnings,
        SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) AS week_total,
        SUM(CASE WHEN timestamp >= ? AND severity = 'alert' THEN 1 ELSE 0 END) AS week_alerts,
        SUM(CASE WHEN timestamp >= ? AND severity = 'warning' THEN 1 ELSE 0 END) AS week_warnings,
        SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) AS month_total,
        SUM(CASE WHEN timestamp >= ? AND severity = 'alert' THEN 1 ELSE 0 END) AS month_alerts,
        SUM(CASE WHEN timestamp >= ? AND severity = 'warning' THEN 1 ELSE 0 END) AS month_warnings
      FROM events
      WHERE household_id = ?`,
      [
        todayStart, todayStart, todayStart,
        weekStart, weekStart, weekStart,
        monthStart, monthStart, monthStart,
        household_id
      ]
    );

    const stats = statsRows[0] || {};

    // Získaj hodinovú aktivitu pre dnešok (HOUR() používa správne časové pásmo MySQL)
    const [hourlyRows] = await pool.execute(
      `SELECT HOUR(timestamp) as hour, COUNT(*) as count
       FROM events
       WHERE household_id = ? AND DATE(timestamp) = CURDATE()
       GROUP BY HOUR(timestamp)`,
      [household_id]
    );
    const hourlyActivity = Array(24).fill(0);
    hourlyRows.forEach(row => { hourlyActivity[row.hour] = Number(row.count); });

    // Získaj členov domácnosti
    const [members] = await pool.execute(
      'SELECT id, username, full_name, email, phone, role, last_login, is_active, keypad_code FROM household_users WHERE household_id = ? AND is_active = TRUE',
      [household_id]
    );

    res.json({
      household: hh,
      sensors,
      events,
      members,
      event_stats: {
        today: { total: Number(stats.today_total || 0), alerts: Number(stats.today_alerts || 0), warnings: Number(stats.today_warnings || 0) },
        week: { total: Number(stats.week_total || 0), alerts: Number(stats.week_alerts || 0), warnings: Number(stats.week_warnings || 0) },
        month: { total: Number(stats.month_total || 0), alerts: Number(stats.month_alerts || 0), warnings: Number(stats.month_warnings || 0) }
      },
      hourly_activity: hourlyActivity,
      system_status: {
        online: realOnline,
        last_seen: hh.system_last_seen,
        rssi: hh.system_rssi,
        ip_address: hh.system_ip,
        seconds_since_heartbeat: hh.seconds_since_heartbeat,
        buzzer_active: hh.buzzer_active == 1
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Chyba pri načítaní dashboardu' });
  }
});

app.post('/api/household/alarm/toggle', authenticateToken, async (req, res) => {
  try {
    const { role, household_id } = req.user;

    if (role === 'viewer') {
      return res.status(403).json({ error: 'Nemáte oprávnenie na ovládanie alarmu' });
    }

    const [households] = await pool.execute(
      'SELECT alarm_status FROM households WHERE id = ?',
      [household_id]
    );

    const currentStatus = households[0].alarm_status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    await pool.execute(
      'UPDATE households SET alarm_status = ? WHERE id = ?',
      [newStatus, household_id]
    );

    await pool.execute(
      'INSERT INTO activity_log (household_id, user_id, user_type, action, description) VALUES (?, ?, ?, ?, ?)',
      [household_id, req.user.id, 'household_user', 'alarm_toggled', `Alarm ${newStatus === 'active' ? 'aktivovaný' : 'deaktivovaný'}`]
    );

    res.json({
      success: true,
      alarm_status: newStatus
    });
  } catch (error) {
    console.error('Toggle alarm error:', error);
    res.status(500).json({ error: 'Chyba pri prepínaní alarmu' });
  }
});

app.post('/api/household/members/add', authenticateToken, async (req, res) => {
  try {
    const { role, household_id } = req.user;
    const { username, password, full_name, email, phone, member_role } = req.body;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Len administrátor môže pridávať členov' });
    }

    const [memberCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM household_users WHERE household_id = ? AND is_active = TRUE',
      [household_id]
    );

    if (memberCount[0].count >= 7) {
      return res.status(400).json({ error: 'Dosiahnutý maximálny počet členov (7)' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO household_users 
 (household_id, username, password_hash, full_name, email, phone, role, created_by) 
 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [household_id, username, password_hash, full_name, email, phone, member_role, req.user.id]
    );

    res.json({
      success: true,
      message: 'Člen pridaný úspešne',
      member_id: result.insertId
    });
  } catch (error) {
    console.error('Add member error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Používateľské meno už existuje' });
    } else {
      res.status(500).json({ error: 'Chyba pri pridávaní člena' });
    }
  }
});

app.delete('/api/household/members/:id', authenticateToken, async (req, res) => {
  try {
    const { role, household_id } = req.user;
    const member_id = req.params.id;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Len administrátor môže odstraňovať členov' });
    }

    if (member_id == req.user.id) {
      return res.status(400).json({ error: 'Nemôžete odstrániť sám seba' });
    }

    await pool.execute(
      'UPDATE household_users SET is_active = FALSE WHERE id = ? AND household_id = ?',
      [member_id, household_id]
    );

    res.json({ success: true, message: 'Člen odstránený' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Chyba pri odstraňovaní člena' });
  }
});

app.post('/api/household/events/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { household_id } = req.user;
    const event_id = req.params.id;

    await pool.execute(
      `UPDATE events 
 SET acknowledged = TRUE, acknowledged_by = ?, acknowledged_at = NOW() 
 WHERE id = ? AND household_id = ?`,
      [req.user.id, event_id, household_id]
    );

    res.json({ success: true, message: 'Udalosť potvrdená' });
  } catch (error) {
    console.error('Acknowledge event error:', error);
    res.status(500).json({ error: 'Chyba pri potvrdzovaní udalosti' });
  }
});

app.get('/api/household/preferences', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const [prefs] = await pool.execute(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [user_id]
    );

    if (prefs.length === 0) {
      await pool.execute(
        `INSERT INTO user_preferences (user_id) VALUES (?)`,
        [user_id]
      );

      const [newPrefs] = await pool.execute(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [user_id]
      );

      return res.json(newPrefs[0]);
    }

    res.json(prefs[0]);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

app.put('/api/household/preferences', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const {
      notifications_enabled,
      sound_alerts,
      email_notifications,
      notification_priority,
      auto_acknowledge,
      theme
    } = req.body;

    await pool.execute(
      `UPDATE user_preferences 
 SET 
notifications_enabled = ?,
sound_alerts = ?,
email_notifications = ?,
notification_priority = ?,
auto_acknowledge = ?,
theme = ?
 WHERE user_id = ?`,
      [
        notifications_enabled,
        sound_alerts,
        email_notifications,
        notification_priority,
        auto_acknowledge,
        theme,
        user_id
      ]
    );

    res.json({
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// --- ESP32 volá tento endpoint keď bzuciak začne/skončí ---
app.post('/api/household/buzzer/notify', async (req, res) => {
  try {
    const { household_id, is_active } = req.body;
    if (!household_id) {
      return res.status(400).json({ error: 'household_id is required' });
    }

    // Skontroluj ci riadok existuje
    const [existing] = await pool.execute(
      'SELECT id FROM buzzer_status WHERE household_id = ? ORDER BY id ASC',
      [household_id]
    );

    // Vycisti duplicitne riadky - nechaj len prvy
    if (existing.length > 1) {
      const keepId = existing[0].id;
      await pool.execute(
        'DELETE FROM buzzer_status WHERE household_id = ? AND id != ?',
        [household_id, keepId]
      );
    }

    if (existing.length > 0) {
      // Aktualizuj existujuci riadok
      if (is_active) {
        await pool.execute(
          'UPDATE buzzer_status SET is_active = 1, activated_at = NOW(), deactivated_at = NULL, deactivated_by = NULL WHERE household_id = ?',
          [household_id]
        );
      } else {
        await pool.execute(
          'UPDATE buzzer_status SET is_active = 0, deactivated_at = NOW() WHERE household_id = ?',
          [household_id]
        );
      }
    } else {
      // Vloz novy riadok
      await pool.execute(
        'INSERT INTO buzzer_status (household_id, is_active, activated_at) VALUES (?, ?, NOW())',
        [household_id, is_active ? 1 : 0]
      );
    }

    res.json({ success: true, buzzer_active: is_active });
  } catch (error) {
    console.error('Buzzer notify error:', error);
    res.status(500).json({ error: 'Chyba servera' });
  }
});

app.post('/api/household/buzzer/deactivate', authenticateToken, async (req, res) => {
  try {
    const { household_id } = req.body || { household_id: req.user.household_id };
    const user_id = req.user.id;

    if (!household_id) {
      return res.status(400).json({ error: 'household_id is required' });
    }

    // Verify user has access
    const [access] = await pool.execute(
      'SELECT id FROM household_users WHERE id = ? AND household_id = ?',
      [user_id, household_id]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Deactivate buzzer
    await pool.execute(
      'CALL sp_deactivate_buzzer(?, ?)',
      [household_id, user_id]
    );

    // Log the event
    await pool.execute(
      `INSERT INTO events 
 (household_id, event_type, severity, description) 
 VALUES (?, 'other', 'info', ?)`,
      [household_id, `Bzučiak vypnutý používateľom ${req.user.full_name}`]
    );

    res.json({
      success: true,
      message: 'Buzzer deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate buzzer error:', error);
    res.status(500).json({ error: 'Failed to deactivate buzzer' });
  }
});

app.get('/api/household/system/status/:household_id', authenticateToken, async (req, res) => {
  try {
    const { household_id } = req.params;

    const [status] = await pool.execute(
      `SELECT 
  is_online,
  last_seen,
  ip_address,
  rssi,
  TIMESTAMPDIFF(SECOND, last_seen, NOW()) AS seconds_since_last_seen
 FROM system_heartbeat
 WHERE household_id = ? AND device_type = 'ESP32'`,
      [household_id]
    );

    if (status.length === 0) {
      return res.json({
        online: false,
        message: 'No heartbeat data available'
      });
    }

    res.json({
      online: status[0].is_online && status[0].seconds_since_last_seen < 60,
      last_seen: status[0].last_seen,
      ip_address: status[0].ip_address,
      signal_strength: status[0].rssi,
      seconds_ago: status[0].seconds_since_last_seen
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ error: 'Failed to check system status' });
  }
});


app.get('/api/household/status/:household_id', async (req, res) => {
  try {
    const { household_id } = req.params;

    const [household] = await pool.execute(
      'SELECT id, name, alarm_status FROM households WHERE id = ? AND is_active = TRUE',
      [household_id]
    );

    if (household.length === 0) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const [buzzer] = await pool.execute(
      'SELECT is_active FROM buzzer_status WHERE household_id = ? ORDER BY id DESC LIMIT 1',
      [household_id]
    );

    // Vráť aj stav senzorov pre ESP32
    const [sensors] = await pool.execute(
      'SELECT id, is_enabled FROM sensors WHERE household_id = ?',
      [household_id]
    );

    // Objekt: { "1": true, "2": true, "4": false, ... }
    const sensorsEnabled = {};
    sensors.forEach(s => { sensorsEnabled[s.id] = Boolean(s.is_enabled); });

    res.json({
      household_id: household[0].id,
      name: household[0].name,
      alarm_status: household[0].alarm_status,
      buzzer_active: buzzer.length > 0 ? Boolean(buzzer[0].is_active) : false,
      sensors_enabled: sensorsEnabled
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/household/events/add', async (req, res) => {
  try {
    const { household_id, sensor_id, event_type, severity, description } = req.body;

    if (!household_id || !event_type || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await pool.execute(
      `INSERT INTO events 
 (household_id, sensor_id, event_type, severity, description, timestamp) 
 VALUES (?, ?, ?, ?, ?, NOW())`,
      [household_id, sensor_id, event_type, severity, description]
    );

    res.status(201).json({
      success: true,
      event_id: result.insertId,
      message: 'Event recorded successfully'
    });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({ error: 'Failed to add event' });
  }
});

app.post('/api/household/heartbeat', async (req, res) => {
  try {
    const { household_id, device_type, rssi, ip } = req.body;

    if (!household_id) {
      return res.status(400).json({ error: 'household_id is required' });
    }

    await pool.execute(
      'CALL sp_update_heartbeat(?, ?, ?, ?)',
      [household_id, device_type || 'ESP32', ip, rssi]
    );

    res.json({
      success: true,
      message: 'Heartbeat received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});


app.get('/api/households', authenticateToken, async (req, res) => {
  try {
    const [households] = await pool.execute(`
SELECT 
  h.*,
  COUNT(DISTINCT s.id) as total_sensors,
  COUNT(DISTINCT CASE WHEN s.status = 'active' OR s.status = 'triggered' THEN s.id END) as active_sensors,
  COUNT(DISTINCT hu.id) as total_users,
  MAX(e.timestamp) as last_event_time
FROM households h
LEFT JOIN sensors s ON h.id = s.household_id AND s.is_enabled = TRUE
LEFT JOIN household_users hu ON h.id = hu.household_id AND hu.is_active = TRUE
LEFT JOIN events e ON h.id = e.household_id
WHERE h.owner_id = ? AND h.is_active = TRUE
GROUP BY h.id
ORDER BY h.created_at DESC
 `, [req.user.id]);

    res.json(households);
  } catch (error) {
    console.error('Get households error:', error);
    res.status(500).json({ error: 'Chyba pri načítaní domácností' });
  }
});

app.post('/api/households', authenticateToken, async (req, res) => {
  try {
    const { name, address, city, postal_code } = req.body;

    let household_key;
    let keyExists = true;

    while (keyExists) {
      household_key = `DOM-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const [existing] = await pool.execute(
        'SELECT id FROM households WHERE household_key = ?',
        [household_key]
      );
      keyExists = existing.length > 0;
    }

    const [result] = await pool.execute(
      'INSERT INTO households (household_key, name, address, city, postal_code, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
      [household_key, name, address, city, postal_code, req.user.id]
    );

    await pool.execute(
      'INSERT INTO activity_log (household_id, user_id, user_type, action, description) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, req.user.id, 'company_owner', 'household_created', `Vytvorená domácnosť: ${name}`]
    );

    res.json({
      id: result.insertId,
      household_key,
      name,
      address,
      city,
      postal_code,
      message: 'Domácnosť vytvorená úspešne'
    });
  } catch (error) {
    console.error('Create household error:', error);
    res.status(500).json({ error: 'Chyba pri vytváraní domácnosti' });
  }
});

app.put('/api/households/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, postal_code, is_active } = req.body;

    await pool.execute(
      'UPDATE households SET name = ?, address = ?, city = ?, postal_code = ?, is_active = ? WHERE id = ? AND owner_id = ?',
      [name, address, city, postal_code, is_active, id, req.user.id]
    );

    res.json({ message: 'Domácnosť aktualizovaná' });
  } catch (error) {
    console.error('Update household error:', error);
    res.status(500).json({ error: 'Chyba pri aktualizácii domácnosti' });
  }
});

app.delete('/api/households/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      'UPDATE households SET is_active = FALSE WHERE id = ? AND owner_id = ?',
      [id, req.user.id]
    );

    res.json({ message: 'Domácnosť vymazaná' });
  } catch (error) {
    console.error('Delete household error:', error);
    res.status(500).json({ error: 'Chyba pri mazaní domácnosti' });
  }
});

app.get('/api/households/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [households] = await pool.execute(
      'SELECT * FROM households WHERE id = ? AND owner_id = ?',
      [id, req.user.id]
    );

    if (households.length === 0) {
      return res.status(404).json({ error: 'Domácnosť nenájdená' });
    }

    const [users] = await pool.execute(
      'SELECT id, username, full_name, email, role, last_login, is_active FROM household_users WHERE household_id = ?',
      [id]
    );

    const [sensors] = await pool.execute(
      'SELECT * FROM sensors WHERE household_id = ?',
      [id]
    );

    const [events] = await pool.execute(
      'SELECT * FROM events WHERE household_id = ? ORDER BY timestamp DESC LIMIT 20',
      [id]
    );

    res.json({
      household: households[0],
      users,
      sensors,
      events
    });
  } catch (error) {
    console.error('Get household detail error:', error);
    res.status(500).json({ error: 'Chyba pri načítaní detailu' });
  }
});


app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.execute(`
SELECT 
  COUNT(DISTINCT h.id) as total_households,
  COUNT(DISTINCT CASE WHEN h.is_active = TRUE THEN h.id END) as active_households,
  COUNT(DISTINCT s.id) as total_sensors,
  COUNT(DISTINCT hu.id) as total_users,
  COUNT(DISTINCT e.id) as total_events_today
FROM households h
LEFT JOIN sensors s ON h.id = s.household_id
LEFT JOIN household_users hu ON h.id = hu.household_id
LEFT JOIN events e ON h.id = e.household_id AND DATE(e.timestamp) = CURDATE()
WHERE h.owner_id = ?
 `, [req.user.id]);

    const [alarmStats] = await pool.execute(`
SELECT 
  COUNT(CASE WHEN alarm_status = 'active' THEN 1 END) as active_alarms,
  COUNT(CASE WHEN alarm_status = 'inactive' THEN 1 END) as inactive_alarms
FROM households
WHERE owner_id = ? AND is_active = TRUE
 `, [req.user.id]);

    res.json({
      ...stats[0],
      ...alarmStats[0]
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Chyba pri načítaní štatistík' });
  }
});

app.get('/api/recent-events', authenticateToken, async (req, res) => {
  try {
    const [events] = await pool.execute(`
SELECT 
  e.*,
  h.name as household_name,
  h.household_key,
  s.name as sensor_name
FROM events e
JOIN households h ON e.household_id = h.id
LEFT JOIN sensors s ON e.sensor_id = s.id
WHERE h.owner_id = ?
ORDER BY e.timestamp DESC
LIMIT 50
 `, [req.user.id]);

    res.json(events);
  } catch (error) {
    console.error('Get recent events error:', error);
    res.status(500).json({ error: 'Chyba pri načítaní udalostí' });
  }
});


app.post('/api/arduino/sensor-data', async (req, res) => {
  try {
    const { household_key, sensor_code, event_type, value } = req.body;

    const [households] = await pool.execute(
      'SELECT id, alarm_status FROM households WHERE household_key = ? AND is_active = TRUE',
      [household_key]
    );

    if (households.length === 0) {
      return res.status(404).json({ error: 'Neplatný kľúč domácnosti' });
    }

    const household = households[0];

    const [sensors] = await pool.execute(
      'SELECT * FROM sensors WHERE sensor_code = ? AND household_id = ?',
      [sensor_code, household.id]
    );

    if (sensors.length === 0) {
      return res.status(404).json({ error: 'Senzor nenájdený' });
    }

    const sensor = sensors[0];

    // Ignorovať dáta v prípade, že dotyčný senzor bol "vypnutý" z UI
    if (!sensor.is_enabled) {
      return res.json({
        success: true,
        message: 'Senzor je momentálne vypnutý (is_enabled=0)',
        alarm_active: household.alarm_status === 'active'
      });
    }

    let severity = 'warning';
    if (household.alarm_status === 'active') {
      severity = 'alert';
    }

    await pool.execute(
      'INSERT INTO events (household_id, sensor_id, event_type, severity, description) VALUES (?, ?, ?, ?, ?)',
      [
        household.id,
        sensor.id,
        event_type,
        severity,
        `${sensor.name}: ${event_type} (hodnota: ${value || 'N/A'})`
      ]
    );

    await pool.execute(
      'UPDATE sensors SET status = ?, last_triggered = NOW() WHERE id = ?',
      ['triggered', sensor.id]
    );

    res.json({
      success: true,
      message: 'Dáta prijáté',
      alarm_active: household.alarm_status === 'active'
    });
  } catch (error) {
    console.error('Arduino data error:', error);
    res.status(500).json({ error: 'Chyba servera' });
  }
});

app.delete('/api/household/events', authenticateToken, async (req, res) => {
  try {
    const { household_id } = req.user;
    await pool.execute('DELETE FROM events WHERE household_id = ?', [household_id]);
    res.json({ success: true, message: 'História udalostí bola vymazaná' });
  } catch (error) {
    console.error('Delete events error:', error);
    res.status(500).json({ error: 'Chyba servera' });
  }
});

app.post('/api/arduino/keypad-deactivate', async (req, res) => {
  try {
    const { household_key, keypad_code } = req.body;

    if (!household_key || !keypad_code) {
      return res.status(400).json({ error: 'Chýbajú parametre' });
    }

    const [households] = await pool.execute(
      'SELECT id, name FROM households WHERE household_key = ? AND is_active = TRUE',
      [household_key]
    );

    if (households.length === 0) {
      return res.status(404).json({ error: 'Domácnosť nenájdená' });
    }
    const household = households[0];

    const [users] = await pool.execute(
      'SELECT id, full_name FROM household_users WHERE household_id = ? AND keypad_code = ? AND is_active = TRUE',
      [household.id, keypad_code]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Nesprávny kód' });
    }
    const user = users[0];

    await pool.execute('CALL sp_deactivate_buzzer(?, ?)', [household.id, user.id]);

    await pool.execute(
      `INSERT INTO events (household_id, event_type, severity, description) VALUES (?, 'other', 'info', ?)`,
      [household.id, `Bzučiak vypnutý pomocou kódu (Užívateľ: ${user.full_name})`]
    );

    res.json({ success: true, message: 'Bzučiak bol deaktivovaný' });
  } catch (error) {
    console.error('Keypad error:', error);
    res.status(500).json({ error: 'Chyba servera' });
  }
});

app.post('/api/household/members/:id/reset-code', authenticateToken, async (req, res) => {
  try {
    const { role, household_id, id: userId } = req.user;
    const targetId = parseInt(req.params.id);
    // Admin môže resetovať kohokoľvek, bežný user len seba
    if (role !== 'admin' && targetId !== userId) {
      return res.status(403).json({ error: 'Nemáte oprávnenie resetovať tento kód' });
    }
    await pool.execute('UPDATE household_users SET keypad_code = NULL WHERE id = ? AND household_id = ?', [targetId, household_id]);
    res.json({ success: true, message: 'Kód bol vymazaný' });
  } catch (error) {
    console.error('Reset code error:', error);
    res.status(500).json({ error: 'Chyba pri resetovaní kódu' });
  }
});

app.post('/api/household/me/keypad-code', authenticateToken, async (req, res) => {
  try {
    const { keypad_code } = req.body;
    await pool.execute('UPDATE household_users SET keypad_code = ? WHERE id = ?', [keypad_code, req.user.id]);
    res.json({ success: true, message: 'Váš kód pre klávesnicu bol uložený' });
  } catch (error) {
    console.error('Update code error:', error);
    res.status(500).json({ error: 'Chyba pri zmene kódu' });
  }
});

app.post('/api/household/sensors/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { household_id } = req.user;

    // Zistíme aktualny stav senzora
    const [sensors] = await pool.execute('SELECT is_enabled FROM sensors WHERE id = ? AND household_id = ?', [id, household_id]);
    if (sensors.length === 0) return res.status(404).json({ error: 'Senzor nenájdený' });

    // Prepneme is_enabled z true na false a naopak
    const newState = !sensors[0].is_enabled;
    await pool.execute('UPDATE sensors SET is_enabled = ? WHERE id = ?', [newState, id]);

    res.json({ success: true, is_enabled: newState, message: `Senzor bol ${newState ? 'zapnutý' : 'vypnutý'}` });
  } catch (error) {
    console.error('Toggle sensor error:', error);
    res.status(500).json({ error: 'Chyba pri zmene stavu senzora' });
  }
});

// --- JEDNORÁZOVÁ OPRAVA: vyčisti duplicitné riadky v buzzer_status ---
app.get('/api/fix-buzzer-duplicates', async (req, res) => {
  try {
    // Nájdi household_id s viacerými riadkami
    const [dups] = await pool.execute(
      'SELECT household_id, MIN(id) as keep_id, COUNT(*) as cnt FROM buzzer_status GROUP BY household_id HAVING COUNT(*) > 1'
    );

    let deleted = 0;
    for (const dup of dups) {
      const [result] = await pool.execute(
        'DELETE FROM buzzer_status WHERE household_id = ? AND id != ?',
        [dup.household_id, dup.keep_id]
      );
      deleted += result.affectedRows;
    }

    // Nastav vsetky na is_active = 0 (cisty stav)
    await pool.execute('UPDATE buzzer_status SET is_active = 0');

    res.json({ success: true, duplicates_found: dups.length, rows_deleted: deleted, message: 'Buzzer status vycisteny' });
  } catch (error) {
    console.error('Fix buzzer error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend API Server running on port ${PORT}`);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});