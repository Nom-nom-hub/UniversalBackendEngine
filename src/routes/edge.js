const express = require('express');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Edge API routes
 */
module.exports = (edgeManager) => {
  const router = express.Router();
  
  // Require authentication for all edge routes
  router.use(authenticateJWT);
  
  // Get all edge nodes
  router.get('/nodes', async (req, res) => {
    try {
      const nodes = edgeManager.getAllEdgeNodesStatus();
      res.json({ nodes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get edge node by ID
  router.get('/nodes/:id', async (req, res) => {
    try {
      const node = edgeManager.getEdgeNodeStatus(req.params.id);
      res.json({ node });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  
  // Register a new edge node
  router.post('/nodes', async (req, res) => {
    try {
      const node = await edgeManager.registerEdgeNode(req.body);
      res.status(201).json({ node });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Unregister an edge node
  router.delete('/nodes/:id', async (req, res) => {
    try {
      await edgeManager.unregisterEdgeNode(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  
  // Synchronize all edge nodes
  router.post('/sync', async (req, res) => {
    try {
      await edgeManager.synchronizeAll();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Synchronize a specific edge node
  router.post('/nodes/:id/sync', async (req, res) => {
    try {
      await edgeManager.synchronizeNode(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Deploy function to edge node
  router.post('/nodes/:id/functions', async (req, res) => {
    try {
      await edgeManager.deployFunctionToEdge(req.params.id, req.body);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Execute function on edge node
  router.post('/nodes/:id/functions/:name/execute', async (req, res) => {
    try {
      const result = await edgeManager.executeFunctionOnEdge(
        req.params.id,
        req.params.name,
        req.body
      );
      res.json({ result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Edge node sync endpoint (for edge nodes to receive changes)
  router.post('/sync-endpoint', async (req, res) => {
    try {
      // This would be implemented to receive changes from central server
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return router;
}; 