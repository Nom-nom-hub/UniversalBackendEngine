/**
 * Middleware to set tenant context for database operations
 */
function tenantContextMiddleware(tenantManager) {
  return (req, res, next) => {
    if (req.tenant) {
      // Set tenant context for database operations
      req.tenantContext = {
        tenantId: req.tenant.id,
        databaseName: tenantManager.getTenantDatabaseName(req.tenant.id, process.env.POSTGRES_DB),
        schemaName: tenantManager.getTenantSchemaName(req.tenant.id)
      };
      
      // Add tenant filter for database queries
      req.tenantFilter = { tenantId: req.tenant.id };
    }
    
    next();
  };
}

module.exports = {
  tenantContextMiddleware
}; 