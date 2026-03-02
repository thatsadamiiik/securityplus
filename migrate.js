const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alarm_system',
};

async function run() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.query('ALTER TABLE household_users ADD COLUMN keypad_code VARCHAR(10) DEFAULT NULL');
        console.log('Added keypad_code column');
    } catch (e) {
        console.log('Column might exist:', e.message);
    }
    try {
        await connection.query('DELETE FROM sensors WHERE id = 3 OR name = "Okno spálňa"');
        console.log('Deleted window sensor');
    } catch (e) {
        console.log('Sensor not found or deleted:', e.message);
    }
    await connection.end();
}

run();
