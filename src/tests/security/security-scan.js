const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../../core/utils/logger');

/**
 * Security Scanner
 * Performs various security checks on the application
 */
class SecurityScanner {
  constructor(config = {}) {
    this.config = {
      baseUrl: 'http://localhost:3000',
      outputDir: path.join(process.cwd(), 'security-reports'),
      scanEndpoints: true,
      scanDependencies: true,
      scanCode: true,
      ...config
    };
  }
  
  /**
   * Run all security scans
   */
  async runAllScans() {
    logger.info('Starting security scans...');
    
    // Create output directory
    await fs.mkdir(this.config.outputDir, { recursive: true });
    
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        endpoints: { status: 'not run', issues: 0 },
        dependencies: { status: 'not run', issues: 0 },
        code: { status: 'not run', issues: 0 }
      },
      details: {}
    };
    
    // Run scans
    if (this.config.scanEndpoints) {
      results.details.endpoints = await this.scanEndpoints();
      results.summary.endpoints.status = 'completed';
      results.summary.endpoints.issues = this.countIssues(results.details.endpoints);
    }
    
    if (this.config.scanDependencies) {
      results.details.dependencies = await this.scanDependencies();
      results.summary.dependencies.status = 'completed';
      results.summary.dependencies.issues = this.countIssues(results.details.dependencies);
    }
    
    if (this.config.scanCode) {
      results.details.code = await this.scanCode();
      results.summary.code.status = 'completed';
      results.summary.code.issues = this.countIssues(results.details.code);
    }
    
    // Save results
    const reportPath = path.join(this.config.outputDir, `security-scan-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    
    logger.info(`Security scan completed. Report saved to ${reportPath}`);
    
    return results;
  }
  
  /**
   * Count issues in scan results
   */
  countIssues(scanResults) {
    if (!scanResults || !scanResults.issues) {
      return 0;
    }
    
    return scanResults.issues.length;
  }
  
  /**
   * Scan API endpoints for common vulnerabilities
   */
  async scanEndpoints() {
    logger.info('Scanning API endpoints...');
    
    const results = {
      status: 'completed',
      issues: []
    };
    
    try {
      // Test for common security headers
      const response = await axios.get(`${this.config.baseUrl}/api/health`);
      const headers = response.headers;
      
      const securityHeaders = [
        'strict-transport-security',
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];
      
      for (const header of securityHeaders) {
        if (!headers[header]) {
          results.issues.push({
            severity: 'medium',
            type: 'missing_security_header',
            description: `Missing security header: ${header}`,
            recommendation: `Add the ${header} header to all responses`
          });
        }
      }
      
      // Test for CORS misconfiguration
      const corsResponse = await axios.get(`${this.config.baseUrl}/api/health`, {
        headers: {
          'Origin': 'https://malicious-site.com'
        }
      });
      
      if (corsResponse.headers['access-control-allow-origin'] === '*') {
        results.issues.push({
          severity: 'high',
          type: 'cors_misconfiguration',
          description: 'CORS is configured to allow all origins (*)',
          recommendation: 'Restrict CORS to specific trusted origins'
        });
      }
      
      // Test for common endpoints that should be protected
      const sensitiveEndpoints = [
        '/api/users',
        '/api/admin',
        '/api/config'
      ];
      
      for (const endpoint of sensitiveEndpoints) {
        try {
          await axios.get(`${this.config.baseUrl}${endpoint}`);
          
          results.issues.push({
            severity: 'high',
            type: 'unprotected_endpoint',
            description: `Endpoint ${endpoint} is accessible without authentication`,
            recommendation: 'Add authentication middleware to protect sensitive endpoints'
          });
        } catch (error) {
          // 401 or 403 is expected for protected endpoints
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // This is good - endpoint is protected
          } else {
            logger.warn(`Error testing endpoint ${endpoint}:`, error.message);
          }
        }
      }
      
    } catch (error) {
      logger.error('Error scanning endpoints:', error);
      results.status = 'error';
      results.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Scan dependencies for vulnerabilities using npm audit
   */
  async scanDependencies() {
    logger.info('Scanning dependencies...');
    
    const results = {
      status: 'completed',
      issues: []
    };
    
    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditResults = JSON.parse(auditOutput);
      
      if (auditResults.vulnerabilities) {
        for (const [name, vulnerability] of Object.entries(auditResults.vulnerabilities)) {
          results.issues.push({
            severity: vulnerability.severity,
            type: 'vulnerable_dependency',
            description: `${name}@${vulnerability.version} has ${vulnerability.severity} vulnerability: ${vulnerability.title}`,
            recommendation: vulnerability.recommendation || `Update to ${name}@${vulnerability.fixAvailable?.version || 'latest'}`
          });
        }
      }
    } catch (error) {
      // npm audit returns non-zero exit code if vulnerabilities are found
      try {
        const auditResults = JSON.parse(error.stdout);
        
        if (auditResults.vulnerabilities) {
          for (const [name, vulnerability] of Object.entries(auditResults.vulnerabilities)) {
            results.issues.push({
              severity: vulnerability.severity,
              type: 'vulnerable_dependency',
              description: `${name}@${vulnerability.version} has ${vulnerability.severity} vulnerability: ${vulnerability.title}`,
              recommendation: vulnerability.recommendation || `Update to ${name}@${vulnerability.fixAvailable?.version || 'latest'}`
            });
          }
        }
      } catch (parseError) {
        logger.error('Error parsing npm audit results:', parseError);
        results.status = 'error';
        results.error = error.message;
      }
    }
    
    return results;
  }
  
  /**
   * Scan code for security issues
   */
  async scanCode() {
    logger.info('Scanning code...');
    
    const results = {
      status: 'completed',
      issues: []
    };
    
    try {
      // Check for hardcoded secrets
      const secretPatterns = [
        /const\s+(\w+)\s*=\s*['"]([A-Za-z0-9_\-]{30,})['"];?/g,
        /apiKey\s*[:=]\s*['"]([A-Za-z0-9_\-]{20,})['"];?/g,
        /password\s*[:=]\s*['"]([^'"]{8,})['"];?/g,
        /secret\s*[:=]\s*['"]([^'"]{8,})['"];?/g
      ];
      
      const sourceFiles = await this.findSourceFiles();
      
      for (const file of sourceFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        for (const pattern of secretPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            results.issues.push({
              severity: 'high',
              type: 'hardcoded_secret',
              description: `Possible hardcoded secret in ${file}: ${match[0].substring(0, 30)}...`,
              recommendation: 'Move secrets to environment variables or a secure vault'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error scanning code:', error);
      results.status = 'error';
      results.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Find all source files
   */
  async findSourceFiles() {
    const sourceDir = path.join(process.cwd(), 'src');
    const files = [];
    
    async function scanDir(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await scanDir(sourceDir);
    return files;
  }
}

// Run the scanner if executed directly
if (require.main === module) {
  const scanner = new SecurityScanner();
  scanner.runAllScans().catch(console.error);
}

module.exports = SecurityScanner; 