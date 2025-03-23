const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Security Vulnerability Scanner
 */
class SecurityScanner {
  constructor(config = {}) {
    this.config = config;
    this.vulnerabilities = [];
    this.lastScanTime = null;
  }
  
  /**
   * Initialize security scanner
   */
  async initialize() {
    try {
      logger.info('Security scanner initialized');
      
      // Run initial scan if configured
      if (this.config.scanOnStartup) {
        await this.runScan();
      }
      
      // Set up scheduled scans if configured
      if (this.config.scheduledScans && this.config.scanInterval) {
        this.scanIntervalId = setInterval(
          () => this.runScan(),
          this.config.scanInterval * 1000 * 60 // Convert minutes to milliseconds
        );
        
        logger.info(`Scheduled security scans set up to run every ${this.config.scanInterval} minutes`);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize security scanner:', error);
      throw error;
    }
  }
  
  /**
   * Run a security scan
   */
  async runScan() {
    try {
      logger.info('Starting security vulnerability scan');
      this.lastScanTime = new Date();
      this.vulnerabilities = [];
      
      // Run different types of scans based on configuration
      if (this.config.scanDependencies) {
        await this.scanDependencies();
      }
      
      if (this.config.scanCode) {
        await this.scanCode();
      }
      
      if (this.config.scanConfigurations) {
        await this.scanConfigurations();
      }
      
      // Generate report
      const report = this.generateReport();
      
      // Save report if configured
      if (this.config.saveReports) {
        await this.saveReport(report);
      }
      
      // Send notifications if configured
      if (this.config.notifications && this.config.notifications.enabled) {
        await this.sendNotifications(report);
      }
      
      logger.info(`Security scan completed. Found ${this.vulnerabilities.length} vulnerabilities.`);
      return report;
    } catch (error) {
      logger.error('Failed to run security scan:', error);
      throw error;
    }
  }
  
  /**
   * Scan dependencies for vulnerabilities
   */
  async scanDependencies() {
    try {
      logger.info('Scanning dependencies for vulnerabilities');
      
      // Use npm audit to check for vulnerabilities
      const { stdout } = await execPromise('npm audit --json');
      const auditResult = JSON.parse(stdout);
      
      // Process npm audit results
      if (auditResult.vulnerabilities) {
        for (const [name, vulnerability] of Object.entries(auditResult.vulnerabilities)) {
          this.vulnerabilities.push({
            type: 'dependency',
            name,
            severity: vulnerability.severity,
            description: vulnerability.overview,
            recommendation: vulnerability.recommendation,
            path: vulnerability.path,
            fixAvailable: vulnerability.fixAvailable
          });
        }
      }
      
      logger.info(`Dependency scan completed. Found ${this.vulnerabilities.length} vulnerabilities.`);
      return this.vulnerabilities;
    } catch (error) {
      logger.error('Failed to scan dependencies:', error);
      throw error;
    }
  }
  
  /**
   * Scan code for vulnerabilities
   */
  async scanCode() {
    try {
      logger.info('Scanning code for vulnerabilities');
      
      // This would typically use a tool like ESLint with security plugins
      // For demonstration, we'll do a simple pattern-based scan
      
      const patterns = [
        { pattern: /eval\s*\(/g, description: 'Use of eval() can lead to code injection', severity: 'high' },
        { pattern: /exec\s*\(/g, description: 'Use of exec() can lead to command injection if not properly sanitized', severity: 'high' },
        { pattern: /document\.write\s*\(/g, description: 'Use of document.write can lead to XSS vulnerabilities', severity: 'medium' },
        { pattern: /innerHTML\s*=/g, description: 'Assignment to innerHTML can lead to XSS vulnerabilities', severity: 'medium' },
        { pattern: /password.*=.*['"].*['"];/g, description: 'Hardcoded passwords detected', severity: 'high' },
        { pattern: /api[kK]ey.*=.*['"].*['"];/g, description: 'Hardcoded API keys detected', severity: 'high' },
        { pattern: /secret.*=.*['"].*['"];/g, description: 'Hardcoded secrets detected', severity: 'high' }
      ];
      
      // Get all JavaScript files
      const sourceDir = path.resolve(process.cwd(), 'src');
      const jsFiles = await this.getJsFiles(sourceDir);
      
      // Scan each file
      for (const file of jsFiles) {
        const content = await fs.readFile(file, 'utf8');
        const relativePath = path.relative(process.cwd(), file);
        
        // Check for each pattern
        for (const { pattern, description, severity } of patterns) {
          pattern.lastIndex = 0; // Reset regex
          let match;
          
          while ((match = pattern.exec(content)) !== null) {
            // Get line number
            const lineNumber = this.getLineNumber(content, match.index);
            
            this.vulnerabilities.push({
              type: 'code',
              file: relativePath,
              line: lineNumber,
              severity,
              description,
              code: content.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20).trim()
            });
          }
        }
      }
      
      logger.info(`Code scan completed. Found ${this.vulnerabilities.filter(v => v.type === 'code').length} vulnerabilities.`);
      return this.vulnerabilities.filter(v => v.type === 'code');
    } catch (error) {
      logger.error('Failed to scan code:', error);
      throw error;
    }
  }
  
  /**
   * Scan configuration files for vulnerabilities
   */
  async scanConfigurations() {
    try {
      logger.info('Scanning configuration files for vulnerabilities');
      
      // Get configuration files
      const configDir = path.resolve(process.cwd(), 'src/config');
      const configFiles = await this.getConfigFiles(configDir);
      
      // Define patterns to look for in configuration files
      const patterns = [
        { pattern: /password['"]\s*:\s*['"](?!process|env)/g, description: 'Hardcoded password in configuration', severity: 'high' },
        { pattern: /secret['"]\s*:\s*['"](?!process|env)/g, description: 'Hardcoded secret in configuration', severity: 'high' },
        { pattern: /key['"]\s*:\s*['"](?!process|env)/g, description: 'Hardcoded key in configuration', severity: 'medium' },
        { pattern: /cors['"]\s*:\s*\{\s*origin\s*:\s*['"]?\*/g, description: 'CORS configured to allow all origins', severity: 'medium' },
        { pattern: /ssl['"]\s*:\s*false/g, description: 'SSL disabled in configuration', severity: 'medium' }
      ];
      
      // Scan each file
      for (const file of configFiles) {
        const content = await fs.readFile(file, 'utf8');
        const relativePath = path.relative(process.cwd(), file);
        
        // Check for each pattern
        for (const { pattern, description, severity } of patterns) {
          pattern.lastIndex = 0; // Reset regex
          let match;
          
          while ((match = pattern.exec(content)) !== null) {
            // Get line number
            const lineNumber = this.getLineNumber(content, match.index);
            
            this.vulnerabilities.push({
              type: 'configuration',
              file: relativePath,
              line: lineNumber,
              severity,
              description,
              code: content.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20).trim()
            });
          }
        }
      }
      
      logger.info(`Configuration scan completed. Found ${this.vulnerabilities.filter(v => v.type === 'configuration').length} vulnerabilities.`);
      return this.vulnerabilities.filter(v => v.type === 'configuration');
    } catch (error) {
      logger.error('Failed to scan configurations:', error);
      throw error;
    }
  }
  
  /**
   * Get all JavaScript files in a directory (recursively)
   */
  async getJsFiles(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    const jsFiles = [];
    
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        // Skip node_modules and other excluded directories
        if (file.name !== 'node_modules' && !this.config.excludeDirs?.includes(file.name)) {
          const subDirFiles = await this.getJsFiles(filePath);
          jsFiles.push(...subDirFiles);
        }
      } else if (file.name.endsWith('.js')) {
        jsFiles.push(filePath);
      }
    }
    
    return jsFiles;
  }
  
  /**
   * Get all configuration files in a directory (recursively)
   */
  async getConfigFiles(dir) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      const configFiles = [];
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          const subDirFiles = await this.getConfigFiles(filePath);
          configFiles.push(...subDirFiles);
        } else if (file.name.endsWith('.js') || file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          configFiles.push(filePath);
        }
      }
      
      return configFiles;
    } catch (error) {
      // If the directory doesn't exist, return an empty array
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * Get line number from content and position
   */
  getLineNumber(content, position) {
    const lines = content.substring(0, position).split('\n');
    return lines.length;
  }
  
  /**
   * Generate security report
   */
  generateReport() {
    // Group vulnerabilities by severity
    const groupedVulnerabilities = {
      high: this.vulnerabilities.filter(v => v.severity === 'high'),
      medium: this.vulnerabilities.filter(v => v.severity === 'medium'),
      low: this.vulnerabilities.filter(v => v.severity === 'low')
    };
    
    // Calculate risk score (simple weighted calculation)
    const riskScore = (
      groupedVulnerabilities.high.length * 10 +
      groupedVulnerabilities.medium.length * 5 +
      groupedVulnerabilities.low.length * 1
    );
    
    // Generate report
    return {
      timestamp: new Date().toISOString(),
      scanDuration: Date.now() - this.lastScanTime.getTime(),
      summary: {
        total: this.vulnerabilities.length,
        high: groupedVulnerabilities.high.length,
        medium: groupedVulnerabilities.medium.length,
        low: groupedVulnerabilities.low.length,
        riskScore
      },
      vulnerabilities: this.vulnerabilities,
      recommendations: this.generateRecommendations(groupedVulnerabilities)
    };
  }
  
  /**
   * Generate recommendations based on vulnerabilities
   */
  generateRecommendations(groupedVulnerabilities) {
    const recommendations = [];
    
    // Add recommendations for high severity vulnerabilities
    if (groupedVulnerabilities.high.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Fix high severity vulnerabilities immediately',
        description: 'These vulnerabilities pose a significant security risk and should be addressed as soon as possible.',
        items: groupedVulnerabilities.high.map(v => ({
          description: v.description,
          recommendation: v.recommendation || 'Review and fix the issue'
        }))
      });
    }
    
    // Add recommendations for medium severity vulnerabilities
    if (groupedVulnerabilities.medium.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Address medium severity vulnerabilities',
        description: 'These vulnerabilities should be addressed in the near future.',
        items: groupedVulnerabilities.medium.map(v => ({
          description: v.description,
          recommendation: v.recommendation || 'Review and fix the issue'
        }))
      });
    }
    
    // Add general recommendations
    recommendations.push({
      priority: 'general',
      title: 'General security recommendations',
      description: 'These recommendations will help improve the overall security of your application.',
      items: [
        {
          description: 'Keep dependencies up to date',
          recommendation: 'Regularly run npm update and npm audit to keep dependencies updated and fix vulnerabilities.'
        },
        {
          description: 'Implement Content Security Policy (CSP)',
          recommendation: 'Add a Content Security Policy to prevent XSS attacks.'
        },
        {
          description: 'Use HTTPS everywhere',
          recommendation: 'Ensure all communication is encrypted with HTTPS.'
        },
        {
          description: 'Implement proper input validation',
          recommendation: 'Validate all user input on both client and server side.'
        }
      ]
    });
    
    return recommendations;
  }
  
  /**
   * Save security report to file
   */
  async saveReport(report) {
    try {
      // Create reports directory if it doesn't exist
      const reportsDir = path.resolve(process.cwd(), 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `security-report-${timestamp}.json`;
      const filePath = path.join(reportsDir, filename);
      
      // Write report to file
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      
      logger.info(`Security report saved to ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Failed to save security report:', error);
      throw error;
    }
  }
  
  /**
   * Send notifications about security report
   */
  async sendNotifications(report) {
    try {
      if (!this.config.notifications || !this.config.notifications.enabled) {
        return;
      }
      
      // Only send notifications if there are high severity vulnerabilities
      // or if the total number of vulnerabilities exceeds the threshold
      const highSeverityCount = report.summary.high;
      const totalCount = report.summary.total;
      const threshold = this.config.notifications.threshold || 5;
      
      if (highSeverityCount === 0 && totalCount < threshold) {
        logger.info('No notifications sent (below threshold)');
        return;
      }
      
      // Prepare notification message
      const message = `
        Security Scan Results:
        - High: ${report.summary.high}
        - Medium: ${report.summary.medium}
        - Low: ${report.summary.low}
        - Total: ${report.summary.total}
        - Risk Score: ${report.summary.riskScore}
        
        ${highSeverityCount > 0 ? 'HIGH SEVERITY VULNERABILITIES DETECTED! Immediate action required.' : ''}
        
        See the full report for details.
      `.trim();
      
      // Send notifications based on configured channels
      if (this.config.notifications.email) {
        await this.sendEmailNotification(message, report);
      }
      
      if (this.config.notifications.slack) {
        await this.sendSlackNotification(message, report);
      }
      
      logger.info('Security notifications sent');
    } catch (error) {
      logger.error('Failed to send security notifications:', error);
    }
  }
  
  /**
   * Send email notification
   */
  async sendEmailNotification(message, report) {
    // This would be implemented with an email sending library
    logger.info('Email notification would be sent with:', message);
  }
  
  /**
   * Send Slack notification
   */
  async sendSlackNotification(message, report) {
    // This would be implemented with the Slack API
    logger.info('Slack notification would be sent with:', message);
  }
  
  /**
   * Shutdown security scanner
   */
  async shutdown() {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
    }
    
    logger.info('Security scanner shut down');
  }
}

module.exports = SecurityScanner; 