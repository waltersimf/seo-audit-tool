// ============================================
// GOOGLE-DOCS.JS - Google Docs Generator
// ============================================
// Версія: v0.7.0
// Призначення: Генерація SEO аудиту в Google Docs
// ============================================

const { google } = require('googleapis');

// ============================================
// GOOGLE DOCS GENERATOR
// ============================================

class GoogleDocsGenerator {
  constructor(auth) {
    this.docs = google.docs({ version: 'v1', auth });
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Створити аудит документ
   */
  async createAuditDocument(auditData) {
    try {
      console.log('📄 Створення Google Docs...');

      // Створити новий документ
      const doc = await this.createDocument(auditData);
      const documentId = doc.data.documentId;

      console.log('✍️ Заповнення документа...');

      // Заповнити документ
      await this.populateDocument(documentId, auditData);

      console.log('✅ Google Docs створено!');

      const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

      return {
        success: true,
        url: docUrl,
        documentId: documentId
      };
    } catch (error) {
      console.error('❌ Помилка створення Google Docs:', error.message);
      throw error;
    }
  }

  /**
   * Створити порожній документ
   */
  async createDocument(auditData) {
    const urlObj = new URL(auditData.url);
    const domain = urlObj.hostname;
    const date = new Date().toLocaleString('uk-UA', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return await this.docs.documents.create({
      resource: {
        title: `SEO Аудит - ${domain} - ${date}`
      }
    });
  }

  /**
   * Заповнити документ
   */
  async populateDocument(documentId, auditData) {
    const requests = [];

    // Титульна сторінка
    this.addTitle(requests, auditData);

    // Зміст
    this.addTableOfContents(requests);

    // 1. Загальна інформація
    this.addGeneralInfo(requests, auditData);

    // 2. Executive Summary
    this.addExecutiveSummary(requests, auditData);

    // 3. Технічний аудит
    this.addTechnicalAudit(requests, auditData);

    // 4. SEO аудит
    this.addSEOAudit(requests, auditData);

    // 5. Проблеми за пріоритетом
    this.addIssuesByPriority(requests, auditData);

    // 6. Рекомендації
    this.addRecommendations(requests, auditData);

    // Виконати всі запити
    if (requests.length > 0) {
      await this.docs.documents.batchUpdate({
        documentId,
        resource: { requests }
      });
    }
  }

  /**
   * Додати титульну сторінку
   */
  addTitle(requests, auditData) {
    const urlObj = new URL(auditData.url);
    const domain = urlObj.hostname;

    requests.push({
      insertText: {
        location: { index: 1 },
        text: `SEO АУДИТ\n${domain}\n\n`
      }
    });

    // Форматування заголовка
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: 11 },
        paragraphStyle: {
          namedStyleType: 'HEADING_1',
          alignment: 'CENTER'
        },
        fields: 'namedStyleType,alignment'
      }
    });

    // Форматування домену
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: 12, endIndex: 12 + domain.length + 1 },
        paragraphStyle: {
          namedStyleType: 'HEADING_2',
          alignment: 'CENTER'
        },
        fields: 'namedStyleType,alignment'
      }
    });
  }

  /**
   * Додати зміст
   */
  addTableOfContents(requests) {
    const endIndex = this.getCurrentEndIndex(requests);

    requests.push({
      insertText: {
        location: { index: endIndex },
        text: '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nЗМІСТ\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
              '1. Загальна інформація\n' +
              '2. Executive Summary\n' +
              '3. Технічний аудит\n' +
              '4. SEO аудит\n' +
              '5. Проблеми за пріоритетом\n' +
              '6. Рекомендації\n\n'
      }
    });
  }

  /**
   * Додати загальну інформацію
   */
  addGeneralInfo(requests, auditData) {
    const endIndex = this.getCurrentEndIndex(requests);

    const date = auditData.date || new Date().toLocaleString('uk-UA');
    const duration = this.formatDuration(auditData.duration);

    requests.push({
      insertText: {
        location: { index: endIndex },
        text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              '1. ЗАГАЛЬНА ІНФОРМАЦІЯ\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
              `📊 URL сайту: ${auditData.url}\n` +
              `📅 Дата аудиту: ${date}\n` +
              `📄 Сторінок проскановано: ${auditData.totalPages || 0}\n` +
              `⏱️ Час сканування: ${duration}\n` +
              `🚀 Швидкість: ${auditData.speed || 0} стор/сек\n\n`
      }
    });
  }

  /**
   * Додати Executive Summary
   */
  addExecutiveSummary(requests, auditData) {
    const endIndex = this.getCurrentEndIndex(requests);

    const score = auditData.score || 0;
    const scoreEmoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';

    requests.push({
      insertText: {
        location: { index: endIndex },
        text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              '2. EXECUTIVE SUMMARY\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
              `📊 Загальний бал: ${score}/100 ${scoreEmoji}\n\n` +
              `🎯 Критичні проблеми: ${auditData.criticalIssues || 0}\n` +
              `⚠️ Високі проблеми: ${auditData.highIssues || 0}\n` +
              `ℹ️ Середні проблеми: ${auditData.mediumIssues || 0}\n` +
              `💡 Низькі проблеми: ${auditData.lowIssues || 0}\n\n` +
              `✅ Пройдено перевірок: ${auditData.passedChecks || 0}\n\n`
      }
    });

    // Додати топ-5 проблем
    const topIssues = this.getTopIssues(auditData.issues || [], 5);
    
    if (topIssues.length > 0) {
      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: '🔴 ТОП-5 КРИТИЧНИХ ПРОБЛЕМ:\n\n'
        }
      });

      for (let i = 0; i < topIssues.length; i++) {
        const issue = topIssues[i];
        requests.push({
          insertText: {
            location: { index: this.getCurrentEndIndex(requests) },
            text: `${i + 1}. ${issue.message}\n` +
                  `   Severity: ${issue.severity}\n` +
                  `   Знайдено на: ${issue.urls ? issue.urls.length : 0} сторінках\n\n`
          }
        });
      }
    }

    requests.push({
      insertText: {
        location: { index: this.getCurrentEndIndex(requests) },
        text: '\n'
      }
    });
  }

  /**
   * Додати технічний аудит
   */
  addTechnicalAudit(requests, auditData) {
    const endIndex = this.getCurrentEndIndex(requests);

    requests.push({
      insertText: {
        location: { index: endIndex },
        text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              '3. ТЕХНІЧНИЙ АУДИТ\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
      }
    });

    // Технічні перевірки
    const technicalChecks = (auditData.checks || []).filter(check => 
      ['HTTPS', 'URL Structure', 'Status Codes', 'Robots.txt', 
       'Sitemap', 'WWW Redirect', 'GET Parameters', 'Canonical'].includes(check.name)
    );

    for (const check of technicalChecks) {
      const status = check.passed ? '✅' : '❌';
      const severity = check.severity || 'N/A';

      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: `${status} ${check.name}\n` +
                `Статус: ${check.passed ? 'Пройдено' : 'Проблема'}\n` +
                `Severity: ${severity}\n` +
                `Результат: ${check.details || 'Немає деталей'}\n`
        }
      });

      if (!check.passed && check.recommendation) {
        requests.push({
          insertText: {
            location: { index: this.getCurrentEndIndex(requests) },
            text: `🔧 Рекомендація: ${check.recommendation}\n`
          }
        });
      }

      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: '\n'
        }
      });
    }
  }

  /**
   * Додати SEO аудит
   */
  addSEOAudit(requests, auditData) {
    const endIndex = this.getCurrentEndIndex(requests);

    requests.push({
      insertText: {
        location: { index: endIndex },
        text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              '4. SEO АУДИТ\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
      }
    });

    // SEO перевірки
    const seoChecks = (auditData.checks || []).filter(check => 
      ['Title Tags', 'Meta Description', 'H1 Tags', 'Headings Hierarchy',
       'Image ALT', 'Image Sizes', 'Open Graph', 'Twitter Cards', 
       'Structured Data'].includes(check.name)
    );

    for (const check of seoChecks) {
      const status = check.passed ? '✅' : '❌';
      const severity = check.severity || 'N/A';

      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: `${status} ${check.name}\n` +
                `Статус: ${check.passed ? 'Пройдено' : 'Проблема'}\n` +
                `Severity: ${severity}\n` +
                `Результат: ${check.details || 'Немає деталей'}\n`
        }
      });

      if (!check.passed && check.recommendation) {
        requests.push({
          insertText: {
            location: { index: this.getCurrentEndIndex(requests) },
            text: `🔧 Рекомендація: ${check.recommendation}\n`
          }
        });
      }

      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: '\n'
        }
      });
    }
  }

  /**
   * Додати проблеми за пріоритетом
   */
  addIssuesByPriority(requests, auditData) {
    const endIndex = this.getCurrentEndIndex(requests);

    requests.push({
      insertText: {
        location: { index: endIndex },
        text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              '5. ПРОБЛЕМИ ЗА ПРІОРИТЕТОМ\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
      }
    });

    const issues = auditData.issues || [];
    
    // Критичні
    const critical = issues.filter(i => i.severity === 'CRITICAL');
    if (critical.length > 0) {
      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: '🔴 КРИТИЧНІ (виправити НЕГАЙНО):\n\n'
        }
      });

      for (let i = 0; i < Math.min(critical.length, 10); i++) {
        const issue = critical[i];
        requests.push({
          insertText: {
            location: { index: this.getCurrentEndIndex(requests) },
            text: `${i + 1}. ${issue.message}\n` +
                  `   Знайдено на: ${issue.urls ? issue.urls.length : 0} сторінках\n` +
                  `   Рекомендація: ${issue.recommendation || 'Немає рекомендації'}\n\n`
          }
        });
      }
    }

    // Високі
    const high = issues.filter(i => i.severity === 'HIGH');
    if (high.length > 0) {
      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: '🟠 ВИСОКІ (виправити цього тижня):\n\n'
        }
      });

      for (let i = 0; i < Math.min(high.length, 10); i++) {
        const issue = high[i];
        requests.push({
          insertText: {
            location: { index: this.getCurrentEndIndex(requests) },
            text: `${i + 1}. ${issue.message}\n` +
                  `   Знайдено на: ${issue.urls ? issue.urls.length : 0} сторінках\n` +
                  `   Рекомендація: ${issue.recommendation || 'Немає рекомендації'}\n\n`
          }
        });
      }
    }

    // Середні
    const medium = issues.filter(i => i.severity === 'MEDIUM');
    if (medium.length > 0) {
      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: '🟡 СЕРЕДНІ (виправити цього місяця):\n\n'
        }
      });

      for (let i = 0; i < Math.min(medium.length, 10); i++) {
        const issue = medium[i];
        requests.push({
          insertText: {
            location: { index: this.getCurrentEndIndex(requests) },
            text: `${i + 1}. ${issue.message}\n` +
                  `   Знайдено на: ${issue.urls ? issue.urls.length : 0} сторінках\n\n`
          }
        });
      }
    }

    requests.push({
      insertText: {
        location: { index: this.getCurrentEndIndex(requests) },
        text: '\n'
      }
    });
  }

  /**
   * Додати рекомендації
   */
  addRecommendations(requests, auditData) {
    const endIndex = this.getCurrentEndIndex(requests);

    requests.push({
      insertText: {
        location: { index: endIndex },
        text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              '6. РЕКОМЕНДАЦІЇ\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
              'На основі проведеного аудиту, рекомендуємо:\n\n'
      }
    });

    const recommendations = this.generateRecommendations(auditData);

    for (let i = 0; i < recommendations.length; i++) {
      requests.push({
        insertText: {
          location: { index: this.getCurrentEndIndex(requests) },
          text: `${i + 1}. ${recommendations[i]}\n\n`
        }
      });
    }

    // Підсумок
    requests.push({
      insertText: {
        location: { index: this.getCurrentEndIndex(requests) },
        text: '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              'ПІДСУМОК\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
              `Загальний стан сайту: ${this.getSiteCondition(auditData.score)}\n` +
              `Пріоритет роботи: ${this.getWorkPriority(auditData)}\n\n` +
              'Після виправлення зазначених проблем рекомендуємо повторити аудит.\n'
      }
    });
  }

  /**
   * Отримати поточний індекс кінця документа
   */
  getCurrentEndIndex(requests) {
    let index = 1;
    
    for (const request of requests) {
      if (request.insertText) {
        index += request.insertText.text.length;
      }
    }
    
    return index;
  }

  /**
   * Отримати топ проблем
   */
  getTopIssues(issues, count) {
    const sorted = issues.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return sorted.slice(0, count);
  }

  /**
   * Форматувати тривалість
   */
  formatDuration(ms) {
    if (!ms) return 'N/A';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes} хв ${remainingSeconds} с`;
    }
    return `${seconds} с`;
  }

  /**
   * Отримати стан сайту
   */
  getSiteCondition(score) {
    if (score >= 80) return '✅ Відмінно';
    if (score >= 60) return '⚠️ Добре, але є що покращити';
    if (score >= 40) return '🟠 Задовільно, потрібна робота';
    return '❌ Критичний, негайні дії необхідні';
  }

  /**
   * Отримати пріоритет роботи
   */
  getWorkPriority(auditData) {
    if (auditData.criticalIssues > 0) return '🔴 ВИСОКИЙ (критичні проблеми)';
    if (auditData.highIssues > 5) return '🟠 СЕРЕДНІЙ (багато високих проблем)';
    return '🟢 НИЗЬКИЙ (планові покращення)';
  }

  /**
   * Згенерувати рекомендації
   */
  generateRecommendations(auditData) {
    const recommendations = [];
    const issues = auditData.issues || [];

    // Критичні проблеми
    if (auditData.criticalIssues > 0) {
      recommendations.push('Негайно виправити критичні проблеми (4xx/5xx помилки, відсутні title теги)');
    }

    // Title теги
    const titleIssues = issues.filter(i => i.type === 'title_tags');
    if (titleIssues.length > 0) {
      recommendations.push('Додати або виправити title теги на всіх сторінках (унікальні, 50-60 символів)');
    }

    // Meta Description
    const descIssues = issues.filter(i => i.type === 'meta_description');
    if (descIssues.length > 0) {
      recommendations.push('Додати meta description на всі сторінки (унікальні, 150-160 символів)');
    }

    // H1
    const h1Issues = issues.filter(i => i.type === 'h1_tags');
    if (h1Issues.length > 0) {
      recommendations.push('Виправити H1 теги (один H1 на сторінку, унікальний)');
    }

    // Images
    const imageIssues = issues.filter(i => i.type === 'images');
    if (imageIssues.length > 0) {
      recommendations.push('Додати ALT атрибути до всіх зображень');
    }

    // Загальні
    recommendations.push('Регулярно проводити аудити (раз на місяць)');
    recommendations.push('Моніторити позиції та трафік в Google Search Console');
    recommendations.push('Працювати над швидкістю завантаження сайту');

    return recommendations;
  }
}

// ============================================
// ЕКСПОРТ
// ============================================

module.exports = { GoogleDocsGenerator };