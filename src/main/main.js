// ============================================
// MAIN.JS - Головний процес Electron
// ============================================
// Версія: v0.6.0 - Security + Excel - BUGFIX
// Зміни: ВИПРАВЛЕНО шлях до issues!
// ============================================

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { WebCrawler } = require('./crawler');
const HTMLAnalyzer = require('./analyzer');
const ExcelExporter = require('./excel-exporter');

// ============================================
// ВЕРСІЯ - Єдине джерело правди
// ============================================
const { version } = require('../../package.json');

// ============================================
// ЗМІННІ
// ============================================

let mainWindow = null;
let activeCrawler = null;  // Поточний активний crawler

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

    const report = await analyzer.generateTextReport();
    console.log(`✅ Звіт збережено: ${report.filename}`);

    // ========================================
    // РЕЗУЛЬТАТ
    // ========================================

    // Закриваємо crawler
    await activeCrawler.close();
    activeCrawler = null;

    // ✅✅✅ КРИТИЧНО ВАЖЛИВО - ПРАВИЛЬНА СТРУКТУРА ДАНИХ:
    return {
      success: true,
      message: `Аудит завершено! Бал: ${analysisResult.summary.score}/100`,
      data: {
        baseUrl: crawlResult.stats.baseUrl,
        score: analysisResult.summary.score,
        totalPages: crawlResult.stats.visitedPages,
        
        // Метрики з summary
        passedChecks: analysisResult.summary.passedChecks,
        failedChecks: analysisResult.summary.failedChecks,
        criticalIssues: analysisResult.summary.criticalIssues,
        highIssues: analysisResult.summary.highIssues,
        mediumIssues: analysisResult.summary.mediumIssues,
        lowIssues: analysisResult.summary.lowIssues,
        
        // ✅ ВИПРАВЛЕНО: Дані для UI та Excel
        checks: analysisResult.checks,        // ✅ Правильно
        issues: analysisResult.issues,        // ✅✅✅ НЕ analysisResult.report.issues!
        pages: crawlResult.results,           // ✅ Для Excel експорту
        reportFile: report.filename
      }
    };

  } catch (error) {
    console.error('❌ Помилка аудиту:', error);

    // Закриваємо crawler якщо помилка
    if (activeCrawler) {
      await activeCrawler.close();
      activeCrawler = null;
    }

    return {
      success: false,
      error: error.message
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
      console.log('✅ Краулер зупинено');
      return { success: true, message: 'Аудит зупинено' };
    }
    return { success: false, message: 'Аудит не запущено' };
  } catch (error) {
    console.error('❌ Помилка зупинки:', error);
    return { success: false, error: error.message };
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
 * ✅ НОВИЙ: Handler для експорту в Excel
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