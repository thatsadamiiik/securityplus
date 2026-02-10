const { spawn } = require('child_process');
const http = require('http');

// Spusti Vite
const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
});

// Počkaj kým Vite naštartuje na localhost:5173
function waitForVite(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (attempt) => {
      if (attempt >= retries) {
        reject(new Error('Vite sa nepodarilo spustiť'));
        return;
      }

      const req = http.get('http://localhost:5173', (res) => {
        resolve();
      });

      req.on('error', () => {
        console.log(`Čakám na Vite... (${attempt + 1}/${retries})`);
        setTimeout(() => check(attempt + 1), 1000);
      });

      req.setTimeout(1000, () => {
        req.destroy();
        setTimeout(() => check(attempt + 1), 1000);
      });
    };

    check(0);
  });
}

waitForVite()
  .then(() => {
    console.log('\n✓ Vite je pripravený! Spúšťam Electron...\n');

    const electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true
    });

    electron.on('close', () => {
      vite.kill();
      process.exit();
    });
  })
  .catch((err) => {
    console.error('Chyba:', err.message);
    vite.kill();
    process.exit(1);
  });

process.on('SIGINT', () => {
  vite.kill();
  process.exit();
});