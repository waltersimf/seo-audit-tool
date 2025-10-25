// ============================================
// EXCEL-EXPORTER.JS - Експорт в Excel
// ============================================
// Версія: v0.6.0 - Окремі аркуші для кожного типу проблеми
// ============================================

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

class ExcelExporter {
  constructor() {
    this.workbook = null;
  }

  /**
   * Головний метод експорту
   */
  async generateReport(auditData) {
    console.log('📊 Експорт в Excel...');
    console.log('📊 Дані для експорту:', {
      baseUrl: auditData.baseUrl,
      score: auditData.score,
      totalPages: auditData.totalPages,
      issues: auditData.issues?.length || 0,
      pages: auditData.pages?.length || 0
    });

    this.workbook = new ExcelJS.Workbook();
    
    // Метадані
    this.workbook.creator = 'SEO Audit Tool';
    this.workbook.created = new Date();

    // Створюємо аркуші
    await this.createSummarySheet(auditData);
    await this.createStatsSheet(auditData);
    
    // Створюємо окремі аркуші для кожного типу проблеми
    await this.createSeparateIssueSheets(auditData);
    
    await this.createPagesSheet(auditData);

    // Зберігаємо файл
    const filename = await this.saveWorkbook(auditData.baseUrl);
    
    console.log('✅ Excel звіт збережено:', filename);
    return filename;
  }

  /**
   * Лист 1: Загальний звіт
   */
  async createSummarySheet(auditData) {
    const sheet = this.workbook.addWorksheet('Загальний звіт', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // Заголовок
    sheet.columns = [
      { header: 'URL', key: 'url', width: 60 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Title', key: 'title', width: 50 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'H1', key: 'h1', width: 40 },
      { header: 'Проблем', key: 'issues', width: 12 }
    ];

    // Стиль заголовка
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Дані
    if (auditData.pages && auditData.pages.length > 0) {
      auditData.pages.forEach(page => {
        const issuesCount = this.countPageIssues(page, auditData.checks);
        
        sheet.addRow({
          url: page.url,
          status: page.statusCode,
          title: this.extractTitle(page.html),
          description: this.extractDescription(page.html),
          h1: this.extractH1(page.html),
          issues: issuesCount
        });
      });
    }

    // Автофільтр
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 6 }
    };
  }

  /**
   * Лист 2: Статистика
   */
  async createStatsSheet(auditData) {
    const sheet = this.workbook.addWorksheet('Статистика');

    // Заголовок
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = '📊 СТАТИСТИКА SEO АУДИТУ';
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    let row = 3;

    // Загальна інформація
    this.addStatRow(sheet, row++, 'Сайт:', auditData.baseUrl, 'info');
    this.addStatRow(sheet, row++, 'Дата аудиту:', new Date().toLocaleString('uk-UA'), 'info');
    row++;

    // SEO бал
    const scoreColor = auditData.score >= 80 ? 'success' : auditData.score >= 60 ? 'warning' : 'error';
    this.addStatRow(sheet, row++, '🎯 SEO Бал:', `${auditData.score}/100`, scoreColor);
    row++;

    // Перевірки
    this.addStatRow(sheet, row++, 'Всього перевірок:', auditData.passedChecks + auditData.failedChecks, 'info');
    this.addStatRow(sheet, row++, '✅ Пройдено:', auditData.passedChecks, 'success');
    this.addStatRow(sheet, row++, '❌ Не пройдено:', auditData.failedChecks, 'error');
    row++;

    // Проблеми за критичністю
    this.addStatRow(sheet, row++, 'Всього проблем:', auditData.issues?.length || 0, 'info');
    this.addStatRow(sheet, row++, '🔥 Критичні:', auditData.criticalIssues, 'critical');
    this.addStatRow(sheet, row++, '⚠️ Високі:', auditData.highIssues, 'high');
    this.addStatRow(sheet, row++, '⚡ Середні:', auditData.mediumIssues, 'medium');
    this.addStatRow(sheet, row++, '💡 Низькі:', auditData.lowIssues, 'low');
    row++;

    // Сторінки
    this.addStatRow(sheet, row++, 'Проскановано сторінок:', auditData.totalPages, 'info');

    // Ширина колонок
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 40;
  }

  /**
   * Створення окремих аркушів для кожного типу проблеми
   */
  async createSeparateIssueSheets(auditData) {
    if (!auditData.issues || auditData.issues.length === 0) {
      console.log('📊 Немає issues для створення окремих аркушів');
      return;
    }

    console.log('🐛 DEBUG: Створюємо окремі аркуші для issues...');
    console.log('🐛 Total issues:', auditData.issues.length);

    // Групуємо issues по типу
    const issuesByType = {};
    auditData.issues.forEach(issue => {
      const type = issue.type;
      if (!issuesByType[type]) {
        issuesByType[type] = [];
      }
      issuesByType[type].push(issue);
    });

    console.log('🐛 Issue types:', Object.keys(issuesByType));
    console.log('🐛 Issues by type:', Object.entries(issuesByType).map(([type, issues]) => `${type}: ${issues.length}`));

    // Створюємо аркуш для кожного типу
    for (const [type, issues] of Object.entries(issuesByType)) {
      await this.createIssueSheet(type, issues, auditData);
    }
  }

  /**
   * Створення аркушу для конкретного типу проблеми
   */
  async createIssueSheet(issueType, issues, auditData) {
    console.log(`📋 Створюємо аркуш: "${issueType}" (${issues.length} issues)`);

    // Скорочуємо назву якщо занадто довга (Excel має ліміт 31 символ)
    let sheetName = issueType;
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 28) + '...';
    }

    const sheet = this.workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // Визначаємо структуру залежно від типу проблеми
    switch (issueType) {
      case 'Status Codes':
        this.createStatusCodesSheet(sheet, issues, auditData);
        break;
      
      case 'Title Tags':
        this.createTitleIssuesSheet(sheet, issues, auditData);
        break;
      
      case 'Meta Description':
        this.createDescriptionIssuesSheet(sheet, issues, auditData);
        break;
      
      case 'H1 Tags':
        this.createH1IssuesSheet(sheet, issues, auditData);
        break;
      
      case 'URL Structure':
        this.createURLIssuesSheet(sheet, issues, auditData);
        break;
      
      default:
        this.createGenericIssueSheet(sheet, issues, auditData);
    }
  }

  /**
   * Аркуш для помилок статус кодів (4xx, 5xx)
   */
  createStatusCodesSheet(sheet, issues, auditData) {
    // Заголовки
    sheet.columns = [
      { header: 'Де знаходиться', key: 'referrer', width: 60 },
      { header: 'Сторінка з помилкою', key: 'url', width: 60 },
      { header: 'Код', key: 'code', width: 10 },
      { header: 'Рішення', key: 'solution', width: 50 }
    ];

    this.styleHeader(sheet);

    // Знаходимо всі сторінки з 4xx/5xx кодами
    if (auditData.checks?.statusCodes) {
      const checks = auditData.checks.statusCodes;
      
      auditData.pages?.forEach(page => {
        if (page.statusCode >= 400) {
          const solution = page.statusCode >= 500 
            ? 'Перевірити сервер та налаштування хостингу'
            : 'Налаштувати 301 редирект або виправити посилання';

          sheet.addRow({
            referrer: 'N/A (потребує додаткового краулінгу)',
            url: page.url,
            code: page.statusCode,
            solution: solution
          });

          // Колір залежно від коду
          const lastRow = sheet.lastRow;
          const color = page.statusCode >= 500 ? 'FFFF0000' : 'FFFFA500';
          lastRow.getCell(3).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color }
          };
          lastRow.getCell(3).font = { color: { argb: 'FFFFFFFF' }, bold: true };
        }
      });
    }

    this.addAutoFilter(sheet);
  }

  /**
   * Аркуш для проблем з Title
   */
  createTitleIssuesSheet(sheet, issues, auditData) {
    sheet.columns = [
      { header: 'URL', key: 'url', width: 60 },
      { header: 'Поточний Title', key: 'title', width: 50 },
      { header: 'Довжина', key: 'length', width: 12 },
      { header: 'Проблема', key: 'problem', width: 30 },
      { header: 'Рекомендація', key: 'recommendation', width: 50 }
    ];

    this.styleHeader(sheet);

    // Беремо дані з checks
    const titleChecks = auditData.checks?.titles;
    if (!titleChecks) return;

    // Додаємо сторінки без title
    titleChecks.missingPages?.forEach(url => {
      sheet.addRow({
        url: url,
        title: '-',
        length: 0,
        problem: 'Відсутній Title',
        recommendation: 'Додати унікальний <title> в <head> секцію'
      });
    });

    // Додаємо порожні title
    titleChecks.emptyPages?.forEach(url => {
      sheet.addRow({
        url: url,
        title: '(порожній)',
        length: 0,
        problem: 'Порожній Title',
        recommendation: 'Додати змістовний title 30-60 символів'
      });
    });

    // Додаємо занадто короткі
    titleChecks.tooShortPages?.forEach(item => {
      sheet.addRow({
        url: item.url,
        title: item.title || '-',
        length: item.length,
        problem: 'Занадто короткий',
        recommendation: 'Збільшити до 30-60 символів'
      });
    });

    // Додаємо занадто довгі
    titleChecks.tooLongPages?.forEach(item => {
      sheet.addRow({
        url: item.url,
        title: item.title || '-',
        length: item.length,
        problem: 'Занадто довгий',
        recommendation: 'Скоротити до 30-60 символів (Google обріже)'
      });
    });

    // Додаємо дублікати
    titleChecks.duplicateGroups?.forEach(([title, urls]) => {
      urls.forEach((url, index) => {
        sheet.addRow({
          url: url,
          title: title,
          length: title.length,
          problem: `Дублікат (${urls.length} сторінок)`,
          recommendation: index === 0 
            ? 'Зробити унікальний title для кожної сторінки'
            : '↑ Той самий title що вище'
        });
      });
    });

    this.addAutoFilter(sheet);
  }

  /**
   * Аркуш для проблем з Description
   */
  createDescriptionIssuesSheet(sheet, issues, auditData) {
    sheet.columns = [
      { header: 'URL', key: 'url', width: 60 },
      { header: 'Поточний Description', key: 'description', width: 70 },
      { header: 'Довжина', key: 'length', width: 12 },
      { header: 'Проблема', key: 'problem', width: 30 },
      { header: 'Рекомендація', key: 'recommendation', width: 50 }
    ];

    this.styleHeader(sheet);

    const descChecks = auditData.checks?.descriptions;
    if (!descChecks) return;

    // Порожні
    descChecks.emptyPages?.forEach(url => {
      sheet.addRow({
        url: url,
        description: '-',
        length: 0,
        problem: 'Відсутній Description',
        recommendation: 'Додати унікальний description 120-160 символів'
      });
    });

    // Занадто короткі
    descChecks.tooShortPages?.forEach(item => {
      sheet.addRow({
        url: item.url,
        description: '(занадто короткий)',
        length: item.length,
        problem: 'Занадто короткий',
        recommendation: 'Збільшити до 120-160 символів'
      });
    });

    // Занадто довгі
    descChecks.tooLongPages?.forEach(item => {
      sheet.addRow({
        url: item.url,
        description: '(занадто довгий)',
        length: item.length,
        problem: 'Занадто довгий',
        recommendation: 'Скоротити до 120-160 символів'
      });
    });

    // Дублікати
    descChecks.duplicateGroups?.forEach(([description, urls]) => {
      urls.forEach((url, index) => {
        sheet.addRow({
          url: url,
          description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
          length: description.length,
          problem: `Дублікат (${urls.length} сторінок)`,
          recommendation: 'Зробити унікальний description'
        });
      });
    });

    this.addAutoFilter(sheet);
  }

  /**
   * Аркуш для проблем з H1
   */
  createH1IssuesSheet(sheet, issues, auditData) {
    sheet.columns = [
      { header: 'URL', key: 'url', width: 60 },
      { header: 'Поточний H1', key: 'h1', width: 50 },
      { header: 'Кількість H1', key: 'count', width: 15 },
      { header: 'Проблема', key: 'problem', width: 30 },
      { header: 'Рекомендація', key: 'recommendation', width: 50 }
    ];

    this.styleHeader(sheet);

    const h1Checks = auditData.checks?.h1Tags;
    if (!h1Checks) return;

    // Відсутні H1
    h1Checks.missingPages?.forEach(url => {
      sheet.addRow({
        url: url,
        h1: '-',
        count: 0,
        problem: 'Відсутній H1',
        recommendation: 'Додати один H1 заголовок 20-70 символів'
      });
    });

    // Кілька H1
    h1Checks.multiplePages?.forEach(item => {
      sheet.addRow({
        url: item.url,
        h1: '-',
        count: item.count,
        problem: `${item.count} H1 на сторінці`,
        recommendation: 'Залишити тільки один H1, інші змінити на H2-H6'
      });
    });

    // Порожні H1
    h1Checks.emptyPages?.forEach(url => {
      sheet.addRow({
        url: url,
        h1: '(порожній)',
        count: 1,
        problem: 'Порожній H1',
        recommendation: 'Додати текст в H1'
      });
    });

    this.addAutoFilter(sheet);
  }

  /**
   * Аркуш для проблем з URL структурою
   */
  createURLIssuesSheet(sheet, issues, auditData) {
    sheet.columns = [
      { header: 'URL', key: 'url', width: 70 },
      { header: 'Проблема', key: 'problem', width: 30 },
      { header: 'Деталі', key: 'details', width: 50 }
    ];

    this.styleHeader(sheet);

    const urlChecks = auditData.checks?.urlStructure;
    if (!urlChecks?.issues) return;

    urlChecks.issues.forEach(item => {
      sheet.addRow({
        url: item.url,
        problem: item.problems.join(', '),
        details: 'Використовуйте латиницю, дефіси замість пробілів, коротші URL'
      });
    });

    this.addAutoFilter(sheet);
  }

  /**
   * Універсальний аркуш для інших типів проблем
   */
  createGenericIssueSheet(sheet, issues, auditData) {
    sheet.columns = [
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Опис проблеми', key: 'message', width: 60 },
      { header: 'Рекомендація', key: 'recommendation', width: 60 }
    ];

    this.styleHeader(sheet);

    issues.forEach(issue => {
      const row = sheet.addRow({
        severity: issue.severity.toUpperCase(),
        message: issue.message,
        recommendation: issue.recommendation || 'Див. документацію'
      });

      // Колір severity
      const severityCell = row.getCell(1);
      const colors = {
        'CRITICAL': 'FFFF0000',
        'HIGH': 'FFFFA500',
        'MEDIUM': 'FFFFFF00',
        'LOW': 'FF90EE90',
        'WARNING': 'FFFFA500'
      };

      severityCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors[issue.severity.toUpperCase()] || 'FFCCCCCC' }
      };
      severityCell.font = { bold: true, color: { argb: 'FF000000' } };
    });

    this.addAutoFilter(sheet);
  }

  /**
   * Лист з усіма сторінками (детально)
   */
  async createPagesSheet(auditData) {
    const sheet = this.workbook.addWorksheet('Всі сторінки', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'URL', key: 'url', width: 60 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Title', key: 'title', width: 50 },
      { header: 'Title (довжина)', key: 'titleLength', width: 15 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'H1', key: 'h1', width: 40 }
    ];

    this.styleHeader(sheet);

    if (auditData.pages) {
      auditData.pages.forEach(page => {
        const title = this.extractTitle(page.html);
        
        sheet.addRow({
          url: page.url,
          status: page.statusCode,
          title: title || '-',
          titleLength: title ? title.length : 0,
          description: this.extractDescription(page.html) || '-',
          h1: this.extractH1(page.html) || '-'
        });
      });
    }

    this.addAutoFilter(sheet);
  }

  // ============================================
  // ДОПОМІЖНІ МЕТОДИ
  // ============================================

  /**
   * Додавання рядка статистики
   */
  addStatRow(sheet, row, label, value, type = 'info') {
    const labelCell = sheet.getCell(`A${row}`);
    const valueCell = sheet.getCell(`B${row}`);

    labelCell.value = label;
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: 'right' };

    valueCell.value = value;
    valueCell.font = { bold: true };

    const colors = {
      'success': 'FF90EE90',
      'warning': 'FFFFFF00',
      'error': 'FFFF6B6B',
      'critical': 'FFFF0000',
      'high': 'FFFFA500',
      'medium': 'FFFFFF00',
      'low': 'FF90EE90',
      'info': 'FFE3F2FD'
    };

    if (colors[type]) {
      valueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors[type] }
      };
    }

    sheet.getRow(row).height = 25;
  }

  /**
   * Стилізація заголовка
   */
  styleHeader(sheet) {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;
  }

  /**
   * Додавання автофільтру
   */
  addAutoFilter(sheet) {
    if (sheet.rowCount > 1) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columnCount }
      };
    }
  }

  /**
   * Витягування Title з HTML
   */
  extractTitle(html) {
    if (!html) return null;
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Витягування Description з HTML
   */
  extractDescription(html) {
    if (!html) return null;
    const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Витягування H1 з HTML
   */
  extractH1(html) {
    if (!html) return null;
    const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Підрахунок проблем на сторінці
   */
  countPageIssues(page, checks) {
    let count = 0;
    
    // Перевірка статус коду
    if (page.statusCode >= 400) count++;
    
    // Перевірка title
    const title = this.extractTitle(page.html);
    if (!title || title.length < 30 || title.length > 60) count++;
    
    // Перевірка h1
    const h1 = this.extractH1(page.html);
    if (!h1) count++;

    return count;
  }

  /**
   * Збереження файлу
   */
  async saveWorkbook(baseUrl) {
    const reportsDir = path.join(__dirname, '../../reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const domain = new URL(baseUrl).hostname.replace('www.', '');
    const timestamp = Date.now();
    const filename = `seo-audit-${domain}-${timestamp}.xlsx`;
    const filepath = path.join(reportsDir, filename);

    await this.workbook.xlsx.writeFile(filepath);

    return filename;
  }
}

module.exports = ExcelExporter;