// ============================================
// ANALYZER.JS - Модуль аналізу SEO
// ============================================
// Версія: v0.4.0 - SEO Елементи
// Додано: 12 нових перевірок SEO елементів
// ============================================

const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class HTMLAnalyzer {
  constructor(crawlResults) {
    this.results = crawlResults;
    this.baseUrl = crawlResults.baseUrl;
    this.pages = crawlResults.pages;
    this.report = {
      summary: {},
      checks: {},
      issues: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Головний метод аналізу
   */
  async analyze(options = {}) {
    console.log('🔍 Початок аналізу...');

    // ТЕХНІЧНІ ПЕРЕВІРКИ (v0.3.0)
    if (options.technical !== false) {
      this.checkHTTPS();
      this.checkURLStructure();
      this.checkStatusCodes();
      await this.checkRobotsTxt();
      await this.checkSitemap();
      this.checkWWWRedirect();
      this.checkGETParameters();
      this.checkCanonicalTags();
    }

    // SEO ЕЛЕМЕНТИ (v0.4.0) - НОВЕ!
    if (options.seo !== false) {
      this.checkTitles();
      this.checkDescriptions();
      this.checkMetaKeywords();
      this.checkMetaRobots();
      this.checkH1Tags();
      this.checkHeadingsHierarchy();
      this.checkImageAltTags();
      this.checkImageSizes();
      this.checkImageOptimization();
      this.checkOpenGraph();
      this.checkTwitterCards();
      this.checkStructuredData();
    }

    // Генерація підсумку
    this.generateSummary();

    console.log('✅ Аналіз завершено!');
    
    // Генеруємо текстовий звіт
    const textReport = await this.generateTextReport();
    
return {
  summary: this.report.summary,
  checks: this.report.checks,
  issues: this.report.issues,
  report: textReport
};

    return {
      summary: this.report.summary,
      checks: this.report.checks,
      issues: this.report.issues,
      report: textReport
    };
  }

  // ============================================
  // ТЕХНІЧНІ ПЕРЕВІРКИ (v0.3.0)
  // ============================================

  /**
   * 1.1. Перевірка HTTPS
   */
  checkHTTPS() {
    console.log('  → Перевірка HTTPS...');
    
    const nonHTTPS = this.pages.filter(page => !page.url.startsWith('https://'));
    const httpsPages = this.pages.filter(page => page.url.startsWith('https://'));

    this.report.checks.https = {
      passed: nonHTTPS.length === 0,
      total: this.pages.length,
      httpsCount: httpsPages.length,
      nonHTTPSCount: nonHTTPS.length,
      issues: nonHTTPS.map(p => p.url)
    };

    if (nonHTTPS.length > 0) {
      this.report.issues.push({
        type: 'HTTPS',
        severity: 'critical',
        message: `Знайдено ${nonHTTPS.length} сторінок без HTTPS`,
        urls: nonHTTPS.map(p => p.url)
      });
    }
  }

  /**
   * 1.2. Структура URL
   */
  checkURLStructure() {
    console.log('  → Перевірка структури URL...');

    const issues = [];
    
    this.pages.forEach(page => {
      const url = page.url;
      const problems = [];

      if (/[а-яА-ЯіІїЇєЄґҐ]/.test(url)) {
        problems.push('кирилиця');
      }

      if (url.includes('%20') || url.includes(' ')) {
        problems.push('пробіли');
      }

      if (url.length > 100) {
        problems.push(`довгий URL (${url.length} символів)`);
      }

      if (/[^a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]/.test(url)) {
        problems.push('спецсимволи');
      }

      if (problems.length > 0) {
        issues.push({
          url: url,
          problems: problems
        });
      }
    });

    this.report.checks.urlStructure = {
      passed: issues.length === 0,
      total: this.pages.length,
      issuesCount: issues.length,
      issues: issues
    };

    if (issues.length > 0) {
      this.report.issues.push({
        type: 'URL Structure',
        severity: 'warning',
        message: `Знайдено ${issues.length} URL з проблемами структури`,
        details: issues,
        examples: issues.slice(0, 3).map(i => `${i.url} (${i.problems.join(', ')})`)
      });
    }
  }

  /**
   * 1.3. Коди відповідей
   */
  checkStatusCodes() {
    console.log('  → Перевірка кодів відповідей...');

    const codes = {
      success: 0,
      redirects: 0,
      clientErrors: 0,
      serverErrors: 0
    };

    this.pages.forEach(page => {
      const code = page.statusCode;
      if (code >= 200 && code < 300) codes.success++;
      else if (code >= 300 && code < 400) codes.redirects++;
      else if (code >= 400 && code < 500) codes.clientErrors++;
      else if (code >= 500) codes.serverErrors++;
    });

    this.report.checks.statusCodes = {
      passed: codes.clientErrors === 0 && codes.serverErrors === 0,
      ...codes
    };

    if (codes.clientErrors > 0 || codes.serverErrors > 0) {
      this.report.issues.push({
        type: 'Status Codes',
        severity: 'critical',
        message: `Знайдено помилки: ${codes.clientErrors} (4xx) + ${codes.serverErrors} (5xx)`
      });
    }
  }

  /**
   * 1.5. Robots.txt
   */
  async checkRobotsTxt() {
    console.log('  → Перевірка robots.txt...');

    try {
      const robotsUrl = new URL('/robots.txt', this.baseUrl).href;
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        validateStatus: () => true
      });

      const exists = response.status === 200;
      
      this.report.checks.robotsTxt = {
        passed: exists,
        exists: exists,
        size: exists ? response.data.length : 0
      };

      if (!exists) {
        this.report.issues.push({
          type: 'Robots.txt',
          severity: 'warning',
          message: 'Файл robots.txt не знайдено'
        });
      }
    } catch (error) {
      this.report.checks.robotsTxt = {
        passed: false,
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * 1.7. Sitemap.xml
   */
  async checkSitemap() {
    console.log('  → Перевірка sitemap.xml...');

    const sitemapUrls = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap-index.xml',
      '/sitemap1.xml',
      '/sitemap-1.xml',
      '/sitemaps.xml',
      '/sitemap/sitemap.xml',
      '/sitemap/index.xml'
    ];

    for (const path of sitemapUrls) {
      try {
        const url = new URL(path, this.baseUrl).href;
        const response = await axios.get(url, {
          timeout: 5000,
          validateStatus: () => true,
          headers: {
            'User-Agent': 'SEO-Audit-Tool/1.0'
          }
        });

        if (response.status === 200) {
          const content = response.data;
          const isSitemapIndex = content.includes('<sitemapindex');
          const isSitemap = content.includes('<urlset');

          this.report.checks.sitemap = {
            passed: true,
            exists: true,
            url: url,
            type: isSitemapIndex ? 'sitemap index' : (isSitemap ? 'sitemap' : 'unknown'),
            size: content.length
          };
          return;
        }
      } catch (error) {
        continue;
      }
    }

    this.report.checks.sitemap = {
      passed: false,
      exists: false
    };

    this.report.issues.push({
      type: 'Sitemap',
      severity: 'warning',
      message: 'Sitemap.xml не знайдено'
    });
  }

  /**
   * 1.8.1. WWW Redirect
   */
  checkWWWRedirect() {
    console.log('  → Перевірка WWW redirect...');

    const wwwPages = this.pages.filter(p => p.url.includes('://www.'));
    const nonWWWPages = this.pages.filter(p => !p.url.includes('://www.'));

    const mixed = wwwPages.length > 0 && nonWWWPages.length > 0;

    this.report.checks.wwwRedirect = {
      passed: !mixed,
      mixed: mixed,
      wwwCount: wwwPages.length,
      nonWWWCount: nonWWWPages.length,
      recommendation: wwwPages.length > nonWWWPages.length ? 'WWW версію' : 'non-WWW версію'
    };

    if (mixed) {
      this.report.issues.push({
        type: 'WWW Redirect',
        severity: 'medium',
        message: 'Змішані WWW та non-WWW версії URL',
        recommendation: `Використовуйте ${this.report.checks.wwwRedirect.recommendation}`
      });
    }
  }

  /**
   * 1.8.4. GET Parameters
   */
  checkGETParameters() {
    console.log('  → Перевірка GET-параметрів...');

    const issues = this.pages.filter(page => {
      try {
        const url = new URL(page.url);
        const params = Array.from(url.searchParams.keys());
        return params.length > 5;
      } catch {
        return false;
      }
    });

    this.report.checks.getParameters = {
      passed: issues.length === 0,
      issuesCount: issues.length,
      issues: issues.map(p => p.url)
    };

    if (issues.length > 0) {
      this.report.issues.push({
        type: 'GET Parameters',
        severity: 'low',
        message: `${issues.length} URL з більше ніж 5 параметрами`
      });
    }
  }

  /**
   * 1.10. Canonical Tags
   */
  checkCanonicalTags() {
    console.log('  → Перевірка canonical тегів...');

    const pagesWithCanonical = [];
    const pagesWithoutCanonical = [];
    const duplicates = new Map();

    this.pages.forEach(page => {
      if (!page.html) {
        pagesWithoutCanonical.push(page.url);
        return;
      }

      const $ = cheerio.load(page.html);
      const canonical = $('link[rel="canonical"]').attr('href');

      if (canonical) {
        pagesWithCanonical.push(page.url);
        
        if (!duplicates.has(canonical)) {
          duplicates.set(canonical, []);
        }
        duplicates.get(canonical).push(page.url);
      } else {
        pagesWithoutCanonical.push(page.url);
      }
    });

    const coverage = (pagesWithCanonical.length / this.pages.length) * 100;
    const passed = coverage >= 50;

    this.report.checks.canonicalTags = {
      passed: passed,
      withCanonical: pagesWithCanonical.length,
      withoutCanonical: pagesWithoutCanonical.length,
      coverage: Math.round(coverage),
      total: this.pages.length,
      missingPages: pagesWithoutCanonical
    };

    if (!passed) {
      this.report.issues.push({
        type: 'Canonical Tags',
        severity: 'medium',
        message: `Низьке покриття canonical тегів: ${Math.round(coverage)}%`,
        examples: pagesWithoutCanonical.slice(0, 3)
      });
    }
  }

  // ============================================
  // SEO ЕЛЕМЕНТИ (v0.4.0) - НОВІ ПЕРЕВІРКИ
  // ============================================

  /**
   * 2.1. Title теги
   */
  checkTitles() {
    console.log('  → Перевірка Title тегів...');

    const missing = [];
    const empty = [];
    const tooShort = [];
    const tooLong = [];
    const duplicates = new Map();

    this.pages.forEach(page => {
      if (!page.html) {
        missing.push(page.url);
        return;
      }

      const $ = cheerio.load(page.html);
      const title = $('title').first().text().trim();

      if (!title) {
        empty.push(page.url);
      } else {
        if (title.length < 30) {
          tooShort.push({ url: page.url, length: title.length, title });
        }
        if (title.length > 70) {
          tooLong.push({ url: page.url, length: title.length, title });
        }

        // Перевірка дублікатів
        if (!duplicates.has(title)) {
          duplicates.set(title, []);
        }
        duplicates.get(title).push(page.url);
      }
    });

    // Знаходимо тільки справжні дублікати (більше 1 сторінки)
    const realDuplicates = Array.from(duplicates.entries())
      .filter(([title, urls]) => urls.length > 1);

    const totalIssues = missing.length + empty.length + tooShort.length + tooLong.length;
    const passed = totalIssues === 0 && realDuplicates.length === 0;

    this.report.checks.titles = {
      passed,
      total: this.pages.length,
      missing: missing.length,
      empty: empty.length,
      tooShort: tooShort.length,
      tooLong: tooLong.length,
      duplicates: realDuplicates.length,
      missingPages: missing,
      emptyPages: empty,
      tooShortPages: tooShort,
      tooLongPages: tooLong,
      duplicateGroups: realDuplicates
    };

    if (!passed) {
      const issues = [];
      if (missing.length > 0) issues.push(`${missing.length} без title`);
      if (empty.length > 0) issues.push(`${empty.length} порожніх`);
      if (tooShort.length > 0) issues.push(`${tooShort.length} занадто коротких`);
      if (tooLong.length > 0) issues.push(`${tooLong.length} занадто довгих`);
      if (realDuplicates.length > 0) issues.push(`${realDuplicates.length} груп дублікатів`);

      this.report.issues.push({
        type: 'Title Tags',
        severity: 'high',
        message: `Проблеми з title тегами: ${issues.join(', ')}`,
        examples: missing.slice(0, 3),
        recommendation: 'Додайте унікальні title довжиною 30-60 символів на всі сторінки'
      });
    }
  }

  /**
   * 2.2. Meta Description
   */
  checkDescriptions() {
    console.log('  → Перевірка Meta Description...');

    const missing = [];
    const empty = [];
    const tooShort = [];
    const tooLong = [];
    const duplicates = new Map();

    this.pages.forEach(page => {
      if (!page.html) {
        missing.push(page.url);
        return;
      }

      const $ = cheerio.load(page.html);
      const description = $('meta[name="description"]').attr('content')?.trim() || '';

      if (!description) {
        empty.push(page.url);
      } else {
        if (description.length < 50) {
          tooShort.push({ url: page.url, length: description.length });
        }
        if (description.length > 160) {
          tooLong.push({ url: page.url, length: description.length });
        }

        if (!duplicates.has(description)) {
          duplicates.set(description, []);
        }
        duplicates.get(description).push(page.url);
      }
    });

    const realDuplicates = Array.from(duplicates.entries())
      .filter(([desc, urls]) => urls.length > 1);

    const totalIssues = missing.length + empty.length + tooShort.length + tooLong.length;
    const passed = totalIssues === 0 && realDuplicates.length === 0;

    this.report.checks.descriptions = {
      passed,
      total: this.pages.length,
      missing: missing.length,
      empty: empty.length,
      tooShort: tooShort.length,
      tooLong: tooLong.length,
      duplicates: realDuplicates.length,
      missingPages: missing,
      emptyPages: empty,
      tooShortPages: tooShort,
      tooLongPages: tooLong,
      duplicateGroups: realDuplicates
    };

    if (!passed) {
      const issues = [];
      if (missing.length > 0) issues.push(`${missing.length} без description`);
      if (empty.length > 0) issues.push(`${empty.length} порожніх`);
      if (tooShort.length > 0) issues.push(`${tooShort.length} занадто коротких`);
      if (tooLong.length > 0) issues.push(`${tooLong.length} занадто довгих`);
      if (realDuplicates.length > 0) issues.push(`${realDuplicates.length} груп дублікатів`);

      this.report.issues.push({
        type: 'Meta Description',
        severity: 'high',
        message: `Проблеми з meta description: ${issues.join(', ')}`,
        examples: missing.slice(0, 3),
        recommendation: 'Додайте унікальні description довжиною 120-160 символів'
      });
    }
  }

  /**
   * 2.3. Meta Keywords
   */
  checkMetaKeywords() {
    console.log('  → Перевірка Meta Keywords...');

    const withKeywords = [];
    const spamKeywords = [];

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const keywords = $('meta[name="keywords"]').attr('content')?.trim();

      if (keywords) {
        withKeywords.push(page.url);
        
        const keywordArray = keywords.split(',').map(k => k.trim());
        if (keywordArray.length > 10) {
          spamKeywords.push({ url: page.url, count: keywordArray.length });
        }
      }
    });

    this.report.checks.metaKeywords = {
      passed: true,
      total: this.pages.length,
      withKeywords: withKeywords.length,
      spamCount: spamKeywords.length,
      note: 'Meta keywords застарілі і не використовуються Google',
      spamPages: spamKeywords
    };

    if (spamKeywords.length > 0) {
      this.report.issues.push({
        type: 'Meta Keywords',
        severity: 'low',
        message: `${spamKeywords.length} сторінок з переспамом keywords (>10)`,
        recommendation: 'Meta keywords можна видалити, вони не впливають на SEO'
      });
    }
  }

  /**
   * 2.4. Meta Robots
   */
  checkMetaRobots() {
    console.log('  → Перевірка Meta Robots...');

    const noindex = [];
    const nofollow = [];
    const conflicts = [];

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const robots = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';

      if (robots.includes('noindex')) {
        noindex.push(page.url);
      }
      if (robots.includes('nofollow')) {
        nofollow.push(page.url);
      }

      // Перевірка конфліктів з canonical
      const canonical = $('link[rel="canonical"]').attr('href');
      if (robots.includes('noindex') && canonical) {
        conflicts.push({ url: page.url, issue: 'noindex + canonical' });
      }
    });

    const hasIssues = noindex.length > 0 || conflicts.length > 0;

    this.report.checks.metaRobots = {
      passed: !hasIssues,
      total: this.pages.length,
      noindexCount: noindex.length,
      nofollowCount: nofollow.length,
      conflictsCount: conflicts.length,
      noindexPages: noindex,
      nofollowPages: nofollow,
      conflictPages: conflicts
    };

    if (hasIssues) {
      this.report.issues.push({
        type: 'Meta Robots',
        severity: 'critical',
        message: `Знайдено ${noindex.length} сторінок з noindex`,
        examples: noindex.slice(0, 3),
        recommendation: 'Перевірте чи не заблоковані важливі сторінки'
      });
    }
  }

  /**
   * 2.5. H1 заголовки
   */
  checkH1Tags() {
    console.log('  → Перевірка H1 заголовків...');

    const missing = [];
    const multiple = [];
    const empty = [];
    const tooShort = [];
    const tooLong = [];

    this.pages.forEach(page => {
      if (!page.html) {
        missing.push(page.url);
        return;
      }

      const $ = cheerio.load(page.html);
      const h1Tags = $('h1');

      if (h1Tags.length === 0) {
        missing.push(page.url);
      } else if (h1Tags.length > 1) {
        multiple.push({ url: page.url, count: h1Tags.length });
      } else {
        const h1Text = h1Tags.first().text().trim();
        
        if (!h1Text) {
          empty.push(page.url);
        } else {
          if (h1Text.length < 20) {
            tooShort.push({ url: page.url, length: h1Text.length, text: h1Text });
          }
          if (h1Text.length > 70) {
            tooLong.push({ url: page.url, length: h1Text.length, text: h1Text });
          }
        }
      }
    });

    const totalIssues = missing.length + multiple.length + empty.length;
    const passed = totalIssues === 0;

    this.report.checks.h1Tags = {
      passed,
      total: this.pages.length,
      missing: missing.length,
      multiple: multiple.length,
      empty: empty.length,
      tooShort: tooShort.length,
      tooLong: tooLong.length,
      missingPages: missing,
      multiplePages: multiple,
      emptyPages: empty,
      tooShortPages: tooShort,
      tooLongPages: tooLong
    };

    if (!passed) {
      const issues = [];
      if (missing.length > 0) issues.push(`${missing.length} без H1`);
      if (multiple.length > 0) issues.push(`${multiple.length} з кількома H1`);
      if (empty.length > 0) issues.push(`${empty.length} з порожніми H1`);

      this.report.issues.push({
        type: 'H1 Tags',
        severity: 'critical',
        message: `Проблеми з H1 заголовками: ${issues.join(', ')}`,
        examples: missing.slice(0, 3),
        recommendation: 'Кожна сторінка повинна мати рівно один H1 заголовок довжиною 20-70 символів'
      });
    }
  }

  /**
   * 2.6. Ієрархія заголовків H2-H6
   */
  checkHeadingsHierarchy() {
    console.log('  → Перевірка ієрархії заголовків...');

    const violations = [];
    const skippedLevels = [];
    const emptyHeadings = [];

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const headings = [];

      // Збираємо всі заголовки
      $('h1, h2, h3, h4, h5, h6').each((i, el) => {
        const level = parseInt(el.tagName[1]);
        const text = $(el).text().trim();
        headings.push({ level, text, tag: el.tagName });

        if (!text) {
          emptyHeadings.push({ url: page.url, tag: el.tagName });
        }
      });

      // Перевіряємо ієрархію
      for (let i = 1; i < headings.length; i++) {
        const prev = headings[i - 1];
        const curr = headings[i];

        // Пропущені рівні (H1 → H3)
        if (curr.level - prev.level > 1) {
          skippedLevels.push({
            url: page.url,
            from: prev.tag,
            to: curr.tag,
            issue: `${prev.tag} → ${curr.tag} (пропущено ${curr.tag.replace(/\d/, curr.level - 1)})`
          });
        }
      }
    });

    const passed = violations.length === 0 && skippedLevels.length === 0 && emptyHeadings.length === 0;

    this.report.checks.headingsHierarchy = {
      passed,
      total: this.pages.length,
      violations: violations.length,
      skippedLevels: skippedLevels.length,
      emptyHeadings: emptyHeadings.length,
      violationPages: violations,
      skippedLevelPages: skippedLevels,
      emptyHeadingPages: emptyHeadings
    };

    if (!passed) {
      this.report.issues.push({
        type: 'Headings Hierarchy',
        severity: 'medium',
        message: `Проблеми з ієрархією заголовків: ${skippedLevels.length} порушень`,
        examples: skippedLevels.slice(0, 3).map(s => `${s.url}: ${s.issue}`),
        recommendation: 'Дотримуйтесь правильної ієрархії: H1 → H2 → H3'
      });
    }
  }

  /**
   * 2.7. ALT теги зображень
   */
  checkImageAltTags() {
    console.log('  → Перевірка ALT тегів зображень...');

    let totalImages = 0;
    const missingAlt = [];
    const emptyAlt = [];
    const tooLongAlt = [];

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const images = $('img');

      images.each((i, img) => {
        totalImages++;
        const alt = $(img).attr('alt');
        const src = $(img).attr('src');

        if (alt === undefined) {
          missingAlt.push({ url: page.url, src });
        } else if (alt.trim() === '') {
          emptyAlt.push({ url: page.url, src });
        } else if (alt.length > 125) {
          tooLongAlt.push({ url: page.url, src, length: alt.length });
        }
      });
    });

    const coverage = totalImages > 0 
      ? ((totalImages - missingAlt.length - emptyAlt.length) / totalImages) * 100 
      : 100;
    const passed = coverage >= 90;

    this.report.checks.imageAltTags = {
      passed,
      totalImages,
      missing: missingAlt.length,
      empty: emptyAlt.length,
      tooLong: tooLongAlt.length,
      coverage: Math.round(coverage),
      missingAltImages: missingAlt.slice(0, 10),
      emptyAltImages: emptyAlt.slice(0, 10),
      tooLongAltImages: tooLongAlt.slice(0, 10)
    };

    if (!passed) {
      this.report.issues.push({
        type: 'Image ALT Tags',
        severity: 'high',
        message: `${missingAlt.length + emptyAlt.length} зображень без ALT (${Math.round(100 - coverage)}%)`,
        examples: missingAlt.slice(0, 3).map(i => `${i.url}: ${i.src}`),
        recommendation: 'Додайте описові ALT теги для всіх зображень (до 125 символів)'
      });
    }
  }

  /**
   * 2.8. Розміри зображень (width/height)
   */
  checkImageSizes() {
    console.log('  → Перевірка розмірів зображень...');

    let totalImages = 0;
    const missingSizes = [];

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const images = $('img');

      images.each((i, img) => {
        totalImages++;
        const width = $(img).attr('width');
        const height = $(img).attr('height');
        const src = $(img).attr('src');

        if (!width || !height) {
          missingSizes.push({ url: page.url, src });
        }
      });
    });

    const coverage = totalImages > 0 
      ? ((totalImages - missingSizes.length) / totalImages) * 100 
      : 100;
    const passed = coverage >= 80;

    this.report.checks.imageSizes = {
      passed,
      totalImages,
      missingSizes: missingSizes.length,
      coverage: Math.round(coverage),
      missingSizeImages: missingSizes.slice(0, 10)
    };

    if (!passed) {
      this.report.issues.push({
        type: 'Image Sizes',
        severity: 'medium',
        message: `${missingSizes.length} зображень без width/height (${Math.round(100 - coverage)}%)`,
        examples: missingSizes.slice(0, 3).map(i => `${i.url}: ${i.src}`),
        recommendation: 'Додайте width/height для уникнення CLS (Cumulative Layout Shift)'
      });
    }
  }

  /**
   * 2.9. Оптимізація зображень
   */
  checkImageOptimization() {
    console.log('  → Перевірка оптимізації зображень...');

    let totalImages = 0;
    const largeImages = [];
    const modernFormats = { webp: 0, avif: 0 };

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const images = $('img');

      images.each((i, img) => {
        totalImages++;
        const src = $(img).attr('src') || '';

        // Рахуємо сучасні формати
        if (src.includes('.webp')) modernFormats.webp++;
        if (src.includes('.avif')) modernFormats.avif++;

        // Примітка: Не можемо перевірити реальний розмір без завантаження
        // Це буде додано в наступних версіях з Performance API
      });
    });

    const modernFormatPercent = totalImages > 0
      ? ((modernFormats.webp + modernFormats.avif) / totalImages) * 100
      : 0;

    const passed = modernFormatPercent > 30;

    this.report.checks.imageOptimization = {
      passed,
      totalImages,
      webpCount: modernFormats.webp,
      avifCount: modernFormats.avif,
      modernFormatPercent: Math.round(modernFormatPercent),
      note: 'Детальна перевірка розмірів файлів буде додана в v0.5.0 (PageSpeed API)'
    };

    if (!passed && totalImages > 0) {
      this.report.issues.push({
        type: 'Image Optimization',
        severity: 'low',
        message: `Низьке використання сучасних форматів: ${Math.round(modernFormatPercent)}%`,
        recommendation: 'Використовуйте WebP або AVIF для кращої оптимізації'
      });
    }
  }

  /**
   * 2.10. Open Graph теги
   */
  checkOpenGraph() {
    console.log('  → Перевірка Open Graph тегів...');

    const missing = [];
    const incomplete = [];

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const ogTags = {
        title: $('meta[property="og:title"]').attr('content'),
        description: $('meta[property="og:description"]').attr('content'),
        image: $('meta[property="og:image"]').attr('content'),
        url: $('meta[property="og:url"]').attr('content'),
        type: $('meta[property="og:type"]').attr('content')
      };

      const presentTags = Object.values(ogTags).filter(v => v).length;

      if (presentTags === 0) {
        missing.push(page.url);
      } else if (presentTags < 4) {
        incomplete.push({ url: page.url, present: presentTags, tags: ogTags });
      }
    });

    const coverage = this.pages.length > 0
      ? ((this.pages.length - missing.length) / this.pages.length) * 100
      : 100;
    const passed = coverage >= 80;

    this.report.checks.openGraph = {
      passed,
      total: this.pages.length,
      missing: missing.length,
      incomplete: incomplete.length,
      coverage: Math.round(coverage),
      missingPages: missing.slice(0, 10),
      incompletePages: incomplete.slice(0, 10)
    };

    if (!passed) {
      this.report.issues.push({
        type: 'Open Graph',
        severity: 'medium',
        message: `${missing.length} сторінок без Open Graph тегів`,
        examples: missing.slice(0, 3),
        recommendation: 'Додайте og:title, og:description, og:image, og:url для соцмереж'
      });
    }
  }

  /**
   * 2.11. Twitter Cards
   */
  checkTwitterCards() {
    console.log('  → Перевірка Twitter Cards...');

    const missing = [];
    const incomplete = [];

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const twitterTags = {
        card: $('meta[name="twitter:card"]').attr('content'),
        title: $('meta[name="twitter:title"]').attr('content'),
        description: $('meta[name="twitter:description"]').attr('content'),
        image: $('meta[name="twitter:image"]').attr('content')
      };

      const presentTags = Object.values(twitterTags).filter(v => v).length;

      if (presentTags === 0) {
        missing.push(page.url);
      } else if (presentTags < 3) {
        incomplete.push({ url: page.url, present: presentTags });
      }
    });

    const coverage = this.pages.length > 0
      ? ((this.pages.length - missing.length) / this.pages.length) * 100
      : 100;
    const passed = coverage >= 80;

    this.report.checks.twitterCards = {
      passed,
      total: this.pages.length,
      missing: missing.length,
      incomplete: incomplete.length,
      coverage: Math.round(coverage),
      missingPages: missing.slice(0, 10),
      incompletePages: incomplete.slice(0, 10)
    };

    if (!passed) {
      this.report.issues.push({
        type: 'Twitter Cards',
        severity: 'low',
        message: `${missing.length} сторінок без Twitter Cards`,
        examples: missing.slice(0, 3),
        recommendation: 'Додайте twitter:card, twitter:title, twitter:description, twitter:image'
      });
    }
  }

  /**
   * 2.12. Structured Data (Schema.org)
   */
  checkStructuredData() {
    console.log('  → Перевірка Structured Data...');

    const withStructuredData = [];
    const types = new Map();

    this.pages.forEach(page => {
      if (!page.html) return;

      const $ = cheerio.load(page.html);
      const jsonLdScripts = $('script[type="application/ld+json"]');

      if (jsonLdScripts.length > 0) {
        withStructuredData.push(page.url);

        jsonLdScripts.each((i, script) => {
          try {
            const data = JSON.parse($(script).html());
            const type = data['@type'] || 'Unknown';
            types.set(type, (types.get(type) || 0) + 1);
          } catch (e) {
            // Invalid JSON
          }
        });
      }
    });

    const coverage = this.pages.length > 0
      ? (withStructuredData.length / this.pages.length) * 100
      : 0;
    const passed = coverage >= 50;

    this.report.checks.structuredData = {
      passed,
      total: this.pages.length,
      withStructuredData: withStructuredData.length,
      coverage: Math.round(coverage),
      types: Object.fromEntries(types),
      pagesWithData: withStructuredData.slice(0, 10)
    };

    if (!passed) {
      this.report.issues.push({
        type: 'Structured Data',
        severity: 'medium',
        message: `Низьке покриття structured data: ${Math.round(coverage)}%`,
        recommendation: 'Додайте Schema.org розмітку (JSON-LD) для кращого розуміння контенту'
      });
    }
  }

  // ============================================
  // ГЕНЕРАЦІЯ ПІДСУМКУ ТА ЗВІТУ
  // ============================================

  /**
   * Генерація підсумку
   */
  generateSummary() {
    const checks = Object.values(this.report.checks);
    const passedChecks = checks.filter(c => c.passed).length;
    const totalChecks = checks.length;

    // Підрахунок проблем за критичністю
    const critical = this.report.issues.filter(i => i.severity === 'critical').length;
    const high = this.report.issues.filter(i => i.severity === 'high').length;
    const medium = this.report.issues.filter(i => i.severity === 'medium').length;
    const low = this.report.issues.filter(i => i.severity === 'low').length;

    // Розрахунок загального балу (0-100)
    const score = totalChecks > 0 
      ? Math.round((passedChecks / totalChecks) * 100)
      : 0;

    this.report.summary = {
      score,
      totalPages: this.pages.length,
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      totalIssues: this.report.issues.length,
      criticalIssues: critical,
      highIssues: high,
      mediumIssues: medium,
      lowIssues: low,
      timestamp: new Date().toLocaleString('uk-UA')
    };

    console.log(`📊 Загальний бал: ${score}/100`);
    console.log(`✅ Пройдено перевірок: ${passedChecks}/${totalChecks}`);
  }

  /**
   * Генерація текстового звіту
   */
  async generateTextReport() {
    const report = [];
    const s = this.report.summary;

    // Заголовок
    report.push('╔═══════════════════════════════════════════════════════╗');
    report.push('║            SEO АУДИТ - ' + this.baseUrl.padEnd(32) + '║');
    report.push('╚═══════════════════════════════════════════════════════╝');
    report.push('Дата: ' + s.timestamp);
    report.push('Проскановано сторінок: ' + s.totalPages);
    report.push('');

    // Загальний результат
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    report.push('              ЗАГАЛЬНИЙ РЕЗУЛЬТАТ');
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let scoreEmoji = '🌟';
    if (s.score < 50) scoreEmoji = '❌';
    else if (s.score < 70) scoreEmoji = '⚠️';
    else if (s.score < 90) scoreEmoji = '✅';

    report.push(`   📊 ЗАГАЛЬНИЙ БАЛ: ${s.score}/100 ${scoreEmoji}`);
    report.push(`   ✅ Пройдено перевірок: ${s.passedChecks}/${s.totalChecks}`);
    report.push(`   ❌ Не пройдено: ${s.failedChecks}`);
    report.push('');
    report.push(`   🔥 Критичні проблеми: ${s.criticalIssues}`);
    report.push(`   ⚠️  Високі проблеми: ${s.highIssues}`);
    report.push(`   ⚡ Середні проблеми: ${s.mediumIssues}`);
    report.push(`   💡 Низькі проблеми: ${s.lowIssues}`);

    // Знайдені проблеми
    if (this.report.issues.length > 0) {
      report.push('');
      report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      report.push('              ЗНАЙДЕНІ ПРОБЛЕМИ');
      report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      this.report.issues.forEach((issue, idx) => {
        const icon = {
          critical: '🔥',
          high: '⚠️',
          medium: '⚡',
          low: '💡'
        }[issue.severity] || '•';

        report.push('');
        report.push(`${icon} ${issue.type} [${issue.severity.toUpperCase()}]`);
        report.push(`   ${issue.message}`);
        
        if (issue.recommendation) {
          report.push(`   💡 Рекомендація: ${issue.recommendation}`);
        }
        
        if (issue.examples && issue.examples.length > 0) {
          report.push(`   📋 Приклади:`);
          issue.examples.forEach(example => {
            report.push(`      • ${example}`);
          });
          if (issue.details && issue.details.length > issue.examples.length) {
            report.push(`      ... та ще ${issue.details.length - issue.examples.length}`);
          }
        }
        
        if (issue.urls && issue.urls.length > 0) {
          report.push(`   🔗 Проблемних URL: ${issue.urls.length}`);
          const examples = issue.urls.slice(0, 3);
          examples.forEach(url => {
            report.push(`      • ${url}`);
          });
          if (issue.urls.length > 3) {
            report.push(`      ... та ще ${issue.urls.length - 3}`);
          }
        }
      });
      report.push('');
    }

    // Детальні результати перевірок
    report.push('');
    report.push('🔧 ТЕХНІЧНІ ПЕРЕВІРКИ');
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Додаємо всі технічні перевірки...
    this.addCheckToReport(report, '1.1. HTTPS', this.report.checks.https);
    this.addCheckToReport(report, '1.2. Структура URL', this.report.checks.urlStructure);
    this.addCheckToReport(report, '1.3. Коди відповідей', this.report.checks.statusCodes);
    this.addCheckToReport(report, '1.5. Robots.txt', this.report.checks.robotsTxt);
    this.addCheckToReport(report, '1.7. Sitemap.xml', this.report.checks.sitemap);
    this.addCheckToReport(report, '1.8.1. WWW vs non-WWW', this.report.checks.wwwRedirect);
    this.addCheckToReport(report, '1.8.4. GET-параметри', this.report.checks.getParameters);
    this.addCheckToReport(report, '1.10. Canonical теги', this.report.checks.canonicalTags);

    // SEO ЕЛЕМЕНТИ
    report.push('');
    report.push('📝 SEO ЕЛЕМЕНТИ');
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    this.addCheckToReport(report, '2.1. Title теги', this.report.checks.titles);
    this.addCheckToReport(report, '2.2. Meta Description', this.report.checks.descriptions);
    this.addCheckToReport(report, '2.3. Meta Keywords', this.report.checks.metaKeywords);
    this.addCheckToReport(report, '2.4. Meta Robots', this.report.checks.metaRobots);
    this.addCheckToReport(report, '2.5. H1 заголовки', this.report.checks.h1Tags);
    this.addCheckToReport(report, '2.6. Ієрархія заголовків', this.report.checks.headingsHierarchy);
    this.addCheckToReport(report, '2.7. ALT теги зображень', this.report.checks.imageAltTags);
    this.addCheckToReport(report, '2.8. Розміри зображень', this.report.checks.imageSizes);
    this.addCheckToReport(report, '2.9. Оптимізація зображень', this.report.checks.imageOptimization);
    this.addCheckToReport(report, '2.10. Open Graph', this.report.checks.openGraph);
    this.addCheckToReport(report, '2.11. Twitter Cards', this.report.checks.twitterCards);
    this.addCheckToReport(report, '2.12. Structured Data', this.report.checks.structuredData);

    // Збереження звіту
    const reportDir = path.join(__dirname, '../../reports');
    await fs.mkdir(reportDir, { recursive: true });

    const domain = new URL(this.baseUrl).hostname.replace('www.', '');
    const timestamp = Date.now();
    const filename = `seo-audit-${domain}-${timestamp}.txt`;
    const filepath = path.join(reportDir, filename);

    await fs.writeFile(filepath, report.join('\n'), 'utf8');

    console.log(`📄 Звіт збережено: ${filename}`);

    return {
      filepath,
      filename,
      content: report.join('\n')
    };
  }

  /**
   * Допоміжний метод для додавання перевірки до звіту
   */
  addCheckToReport(report, title, data) {
    if (!data) return;

    report.push('');
    report.push(title);
    report.push(`   ${data.passed ? '✅' : '❌'} Статус: ${data.passed ? 'OK' : 'ПРОБЛЕМИ'}`);
    
    // Додаємо специфічну інформацію для кожного типу
    if (data.total !== undefined) {
      report.push(`   Перевірено: ${data.total}`);
    }
    if (data.coverage !== undefined) {
      report.push(`   Покриття: ${data.coverage}%`);
    }
    if (data.missing !== undefined && data.missing > 0) {
      report.push(`   Відсутні: ${data.missing}`);
    }
    if (data.duplicates !== undefined && data.duplicates > 0) {
      report.push(`   Дублікатів: ${data.duplicates}`);
    }
  }
}

module.exports = HTMLAnalyzer;