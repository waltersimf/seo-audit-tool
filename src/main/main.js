// ============================================
// MAIN.JS - Головний процес Electron
// ============================================
// Версія: v0.7.0 - Google Docs/Sheets Export
// Зміни: Додано Google OAuth + Docs + Sheets
// ============================================

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { WebCrawler } = require('./crawler');
const HTMLAnalyzer = require('./analyzer');
const ExcelExporter = require('./excel-exporter');

// ✅ НОВИЙ: Google інтеграція
const { GoogleAuth } = require('./google-auth');
const { GoogleSheetsExporter } = require('./google-sheets');
const { GoogleDocsGenerator } = require('./google-docs');

// ============================================
// ВЕРСІЯ - Єдине джерело правди
// ============================================
const { version } = require('../../package.json');

// ============================================
// ЗМІННІ
// ============================================

let mainWindow = null;
let activeCrawler = null;  // Поточний активний crawler
let googleAuth = null;     // ✅ НОВИЙ: Google Auth instance

// ============================================
// СТВОРЕННЯ ГОЛОВНОГО ВІКНА
// ============================================

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../../public/icon.png'),
    webPreferences: {
      // ✅ SECURITY FIX v0.6.0
      nodeIntegration: false,        // ✅ Вимкнено
      contextIsolation: true,        // ✅ Увімкнено
      enableRemoteModule: false,     // ✅ Вимкнено
      preload: path.join(__dirname, 'preload.js')  // ✅ Preload script
    },
    show: false,
    backgroundColor: '#ffffff'
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // DevTools у режимі розробки
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Закриваємо crawler якщо вікно закрили
    if (activeCrawler) {
      activeCrawler.close();
      activeCrawler = null;
    }
  });
}

// ============================================
// LIFECYCLE ПОДІЇ
// ============================================

app.on('ready', () => {
  console.log(`🚀 SEO Audit Tool v${version} запускається...`);
  console.log(`🔐 Security: contextIsolation=true, nodeIntegration=false`);
  console.log(`☁️ Google Docs/Sheets integration enabled`);
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// ============================================
// IPC HANDLERS
// ============================================

/**
 * Тестовий handler
 */
ipcMain.handle('test-connection', async () => {
  return { 
    success: true, 
    message: 'Electron працює!',
    version: version
  };
});

/**
 * Handler для отримання версії
 */
ipcMain.handle('get-version', async () => {
  return { version: version };
});

/**
 * Валідація URL
 */
ipcMain.handle('validate-url', async (event, url) => {
  try {
    const urlObj = new URL(url);
    return {
      valid: true,
      protocol: urlObj.protocol,
      hostname: urlObj.hostname
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Неправильний формат URL. Використовуйте формат: https://example.com'
    };
  }
});

/**
 * Handler для початку аудиту
 */
ipcMain.handle('start-audit', async (event, url, options = {}) => {
  console.log('🔍 Початок аудиту:', url);
  console.log('⚙️ Налаштування:', options);

  try {
    // ========================================
    // КРОК 1: КРАУЛІНГ САЙТУ
    // ========================================
    console.log('🕷️ Крок 1/3: Краулінг сайту...');

    // Відправляємо початковий прогрес
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('audit-progress', {
        step: 'starting',
        current: 0,
        total: options.depth || 50,
        percent: 0,
        currentUrl: 'Запуск краулера...'
      });
    }

    // Створюємо новий crawler
    activeCrawler = new WebCrawler();

    // Відправляємо прогрес до UI
    activeCrawler.on('progress', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('audit-progress', {
          step: 'scanning',
          current: data.visited,
          total: data.total,
          percent: Math.round((data.visited / data.total) * 100),
          currentUrl: data.currentUrl
        });
      }
    });

    // Запускаємо краулінг
    const crawlResult = await activeCrawler.crawl(url, options.depth || 50);

    if (crawlResult.stopped) {
      console.log('⚠️ Краулінг зупинено користувачем');
      return {
        success: false,
        stopped: true,
        message: 'Аудит зупинено користувачем'
      };
    }

    console.log(`✅ Краулінг завершено: ${crawlResult.results.length} сторінок`);

    // ========================================
    // КРОК 2: АНАЛІЗ ДАНИХ
    // ========================================
    console.log('📊 Крок 2/3: Аналіз даних...');

    // Відправляємо прогрес аналізу
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('audit-progress', {
        step: 'analyzing',
        current: 100,
        total: 100,
        percent: 100,
        currentUrl: 'Виконання SEO перевірок...'
      });
    }

    // Створюємо analyzer
    const analyzer = new HTMLAnalyzer({
      baseUrl: crawlResult.stats.baseUrl,
      pages: crawlResult.results
    });

    // Виконуємо аналіз
    const technicalChecks = options.checks?.technical !== false;
    const seoChecks = options.checks?.seo !== false;

    const analysisResult = await analyzer.analyze(technicalChecks, seoChecks);
    console.log(`✅ Аналіз завершено. Бал: ${analysisResult.summary.score}/100`);

    // ========================================
    // КРОК 3: ГЕНЕРАЦІЯ ЗВІТУ
    // ========================================
    console.log('📄 Крок 3/3: Генерація звіту...');

    // Відправляємо прогрес генерації звіту
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('audit-progress', {
        step: 'generating',
        current: 100,
        total: 100,
        percent: 100,
        currentUrl: 'Генерація звіту...'
      });
    }

    const reportFilename = await analyzer.generateTextReport(crawlResult.stats);
    console.log(`✅ Звіт створено: ${reportFilename}`);

    // Закриваємо crawler
    await activeCrawler.close();
    activeCrawler = null;

    // ========================================
    // ПОВЕРНЕННЯ РЕЗУЛЬТАТІВ
    // ========================================
    
    return {
      success: true,
      report: analysisResult.report,
      summary: analysisResult.summary,
      issues: analysisResult.issues,  // ✅ BUGFIX v0.6.0
      pages: crawlResult.results,
      stats: crawlResult.stats,
      reportFilename: reportFilename,
      baseUrl: crawlResult.stats.baseUrl
    };

  } catch (error) {
    console.error('❌ Помилка аудиту:', error);
    
    // Закриваємо crawler у разі помилки
    if (activeCrawler) {
      await activeCrawler.close();
      activeCrawler = null;
    }

    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
});

/**
 * Handler для зупинки аудиту
 */
ipcMain.handle('stop-audit', async () => {
  console.log('🛑 Зупинка аудиту...');

  try {
    if (activeCrawler) {
      activeCrawler.stop();
      await activeCrawler.close();
      activeCrawler = null;
      console.log('✅ Аудит зупинено');
      return { success: true };
    } else {
      return { success: false, error: 'Немає активного аудиту' };
    }
  } catch (error) {
    console.error('❌ Помилка зупинки:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Handler для відкриття звіту
 */
ipcMain.handle('open-report', async (event, filename) => {
  try {
    const reportsDir = path.join(__dirname, '../../reports');
    const fullPath = path.join(reportsDir, filename);

    // Перевіряємо чи існує файл
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error('Файл звіту не знайдено');
    }

    console.log('📂 Відкриття звіту:', filename);
    console.log('📂 Повний шлях:', fullPath);

    await shell.openPath(fullPath);
    return { success: true };
  } catch (error) {
    console.error('❌ Помилка відкриття звіту:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Handler для відкриття папки зі звітами
 */
ipcMain.handle('open-reports-folder', async () => {
  try {
    const reportsDir = path.join(__dirname, '../../reports');
    await shell.openPath(reportsDir);
    return { success: true };
  } catch (error) {
    console.error('❌ Помилка відкриття папки:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Handler для експорту в Excel
 */
ipcMain.handle('export-to-excel', async (event, auditData, filename) => {
  console.log('📊 Експорт в Excel...');
  console.log('📊 Дані для експорту:', {
    baseUrl: auditData.baseUrl,
    score: auditData.score,
    totalPages: auditData.totalPages,
    issues: auditData.issues?.length || 0,
    pages: auditData.pages?.length || 0
  });
  
  try {
    const exporter = new ExcelExporter();
    const result = await exporter.generateReport(
      auditData,
      auditData.baseUrl,
      filename
    );

    console.log(`✅ Excel файл створено: ${result.filename}`);

    return {
      success: true,
      filename: result.filename,
      filepath: result.filepath
    };

  } catch (error) {
    console.error('❌ Помилка експорту в Excel:', error);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
});

// ============================================
// ✅ НОВИЙ: GOOGLE AUTH HANDLERS
// ============================================

/**
 * Перевірити статус Google авторизації
 */
ipcMain.handle('google-auth-status', async () => {
  try {
    if (!googleAuth) {
      googleAuth = new GoogleAuth();
      await googleAuth.initialize();
    }
    
    const isAuthorized = googleAuth.isAuthorized();
    
    if (isAuthorized) {
      const userInfo = await googleAuth.getUserInfo();
      return {
        isAuthorized: true,
        user: userInfo
      };
    }
    
    return { isAuthorized: false };
  } catch (error) {
    console.error('❌ Помилка перевірки статусу:', error.message);
    return { isAuthorized: false, error: error.message };
  }
});

/**
 * Авторизуватися в Google
 */
ipcMain.handle('google-auth-login', async () => {
  try {
    if (!googleAuth) {
      googleAuth = new GoogleAuth();
      await googleAuth.initialize();
    }
    
    await googleAuth.authorize();
    const userInfo = await googleAuth.getUserInfo();
    
    return {
      success: true,
      user: userInfo
    };
  } catch (error) {
    console.error('❌ Помилка авторизації:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Вийти з Google Account
 */
ipcMain.handle('google-auth-logout', async () => {
  try {
    if (!googleAuth) {
      return { success: true };
    }
    
    await googleAuth.logout();
    googleAuth = null;
    
    return { success: true };
  } catch (error) {
    console.error('❌ Помилка виходу:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// ============================================
// ✅ НОВИЙ: GOOGLE SHEETS EXPORT
// ============================================

/**
 * Експортувати аудит в Google Sheets
 */
ipcMain.handle('export-google-sheets', async (event, auditData) => {
  try {
    // Перевірити авторизацію
    if (!googleAuth || !googleAuth.isAuthorized()) {
      return {
        success: false,
        error: 'Потрібна авторизація. Натисніть "Підключити Google Account"'
      };
    }
    
    console.log('📊 Експорт в Google Sheets...');
    
    // Отримати OAuth клієнта
    const auth = await googleAuth.getClient();
    
    // Створити експортер
    const exporter = new GoogleSheetsExporter(auth);
    
    // Створити таблицю
    const result = await exporter.createAuditSpreadsheet(auditData);
    
    console.log(`✅ Google Sheets створено: ${result.url}`);
    
    return result;
  } catch (error) {
    console.error('❌ Помилка експорту в Google Sheets:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// ============================================
// ✅ НОВИЙ: GOOGLE DOCS EXPORT
// ============================================

/**
 * Експортувати аудит в Google Docs
 */
ipcMain.handle('export-google-docs', async (event, auditData) => {
  try {
    // Перевірити авторизацію
    if (!googleAuth || !googleAuth.isAuthorized()) {
      return {
        success: false,
        error: 'Потрібна авторизація. Натисніть "Підключити Google Account"'
      };
    }
    
    console.log('📄 Експорт в Google Docs...');
    
    // Отримати OAuth клієнта
    const auth = await googleAuth.getClient();
    
    // Створити генератор
    const generator = new GoogleDocsGenerator(auth);
    
    // Створити документ
    const result = await generator.createAuditDocument(auditData);
    
    console.log(`✅ Google Docs створено: ${result.url}`);
    
    return result;
  } catch (error) {
    console.error('❌ Помилка експорту в Google Docs:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// ============================================
// ГЛОБАЛЬНА ОБРОБКА ПОМИЛОК
// ============================================

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Rejection:', error);
});

console.log(`✅ Main process готовий до роботи (v${version})`);
console.log(`🔐 Security enabled: contextIsolation + preload.js`);
console.log(`☁️ Google Docs/Sheets integration ready`);