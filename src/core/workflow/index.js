const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const eventManager = require('../events');

/**
 * Workflow Engine
 */
class WorkflowEngine {
  constructor(config = {}, dbConnections = {}) {
    this.config = config;
    this.dbConnections = dbConnections;
    this.workflows = new Map();
    this.workflowInstances = new Map();
  }
  
  /**
   * Initialize workflow engine
   */
  async initialize() {
    try {
      // Load workflows from database
      await this.loadWorkflows();
      
      // Subscribe to events
      this.setupEventListeners();
      
      logger.info(`Workflow engine initialized with ${this.workflows.size} workflows`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize workflow engine:', error);
      throw error;
    }
  }
  
  /**
   * Load workflows from database
   */
  async loadWorkflows() {
    try {
      // Choose the appropriate database client based on configuration
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for workflow storage: ${this.config.database}`);
      }
      
      // Load workflows from database
      let workflows = [];
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        workflows = await dbClient.query('SELECT * FROM workflows WHERE active = true');
        workflows = workflows.rows || workflows;
      } else if (this.config.database === 'mongodb') {
        workflows = await dbClient.collection('workflows').find({ active: true }).toArray();
      }
      
      // Store workflows in memory
      workflows.forEach(workflow => {
        this.workflows.set(workflow.id, {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          version: workflow.version,
          states: workflow.states,
          transitions: workflow.transitions,
          startState: workflow.start_state || workflow.startState,
          endStates: workflow.end_states || workflow.endStates,
          createdAt: workflow.created_at || workflow.createdAt,
          updatedAt: workflow.updated_at || workflow.updatedAt
        });
      });
      
      return this.workflows;
    } catch (error) {
      logger.error('Failed to load workflows:', error);
      throw error;
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for workflow events
    eventManager.subscribeToEvent('workflow:start', this.handleWorkflowStart.bind(this));
    eventManager.subscribeToEvent('workflow:transition', this.handleWorkflowTransition.bind(this));
    eventManager.subscribeToEvent('workflow:complete', this.handleWorkflowComplete.bind(this));
    eventManager.subscribeToEvent('workflow:cancel', this.handleWorkflowCancel.bind(this));
    
    logger.debug('Workflow event listeners registered');
  }
  
  /**
   * Handle workflow start event
   */
  async handleWorkflowStart(data) {
    try {
      const { workflowId, entityId, initialData } = data;
      
      // Start workflow
      const instance = await this.startWorkflow(workflowId, entityId, initialData);
      
      logger.debug(`Started workflow ${workflowId} for entity ${entityId}, instance ${instance.id}`);
      
      return instance;
    } catch (error) {
      logger.error('Failed to handle workflow start event:', error);
      throw error;
    }
  }
  
  /**
   * Handle workflow transition event
   */
  async handleWorkflowTransition(data) {
    try {
      const { instanceId, transition, transitionData } = data;
      
      // Execute transition
      const instance = await this.executeTransition(instanceId, transition, transitionData);
      
      logger.debug(`Executed transition ${transition} for workflow instance ${instanceId}`);
      
      return instance;
    } catch (error) {
      logger.error('Failed to handle workflow transition event:', error);
      throw error;
    }
  }
  
  /**
   * Handle workflow complete event
   */
  async handleWorkflowComplete(data) {
    try {
      const { instanceId, result } = data;
      
      // Complete workflow
      const instance = await this.completeWorkflow(instanceId, result);
      
      logger.debug(`Completed workflow instance ${instanceId}`);
      
      return instance;
    } catch (error) {
      logger.error('Failed to handle workflow complete event:', error);
      throw error;
    }
  }
  
  /**
   * Handle workflow cancel event
   */
  async handleWorkflowCancel(data) {
    try {
      const { instanceId, reason } = data;
      
      // Cancel workflow
      const instance = await this.cancelWorkflow(instanceId, reason);
      
      logger.debug(`Cancelled workflow instance ${instanceId}: ${reason}`);
      
      return instance;
    } catch (error) {
      logger.error('Failed to handle workflow cancel event:', error);
      throw error;
    }
  }
  
  /**
   * Start a workflow
   */
  async startWorkflow(workflowId, entityId, initialData = {}) {
    try {
      // Get workflow definition
      const workflow = this.workflows.get(workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }
      
      // Create workflow instance
      const instance = {
        id: uuidv4(),
        workflowId,
        entityId,
        currentState: workflow.startState,
        data: initialData,
        history: [
          {
            state: workflow.startState,
            timestamp: new Date(),
            data: initialData
          }
        ],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store instance
      this.workflowInstances.set(instance.id, instance);
      
      // Save to database
      await this.saveWorkflowInstance(instance);
      
      // Execute entry actions for start state
      await this.executeStateActions(instance, workflow.states[workflow.startState], 'entry', initialData);
      
      // Publish event
      await eventManager.publishEvent('workflow:started', {
        instanceId: instance.id,
        workflowId,
        entityId,
        state: workflow.startState,
        data: initialData
      });
      
      return instance;
    } catch (error) {
      logger.error('Failed to start workflow:', error);
      throw error;
    }
  }
  
  /**
   * Execute a workflow transition
   */
  async executeTransition(instanceId, transitionName, data = {}) {
    try {
      // Get workflow instance
      const instance = this.workflowInstances.get(instanceId);
      
      if (!instance) {
        throw new Error(`Workflow instance not found: ${instanceId}`);
      }
      
      // Get workflow definition
      const workflow = this.workflows.get(instance.workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow not found: ${instance.workflowId}`);
      }
      
      // Find transition
      const transition = workflow.transitions.find(t => 
        t.name === transitionName && 
        t.from === instance.currentState
      );
      
      if (!transition) {
        throw new Error(`Invalid transition ${transitionName} from state ${instance.currentState}`);
      }
      
      // Check if transition is allowed
      if (transition.condition && !this.evaluateCondition(transition.condition, instance.data, data)) {
        throw new Error(`Transition condition not met: ${transitionName}`);
      }
      
      // Execute exit actions for current state
      await this.executeStateActions(instance, workflow.states[instance.currentState], 'exit', data);
      
      // Execute transition actions
      if (transition.actions) {
        await this.executeActions(instance, transition.actions, data);
      }
      
      // Update instance state
      const previousState = instance.currentState;
      instance.currentState = transition.to;
      instance.data = {
        ...instance.data,
        ...data
      };
      instance.history.push({
        state: transition.to,
        transition: transitionName,
        timestamp: new Date(),
        data
      });
      instance.updatedAt = new Date();
      
      // Execute entry actions for new state
      await this.executeStateActions(instance, workflow.states[instance.currentState], 'entry', data);
      
      // Save instance
      await this.saveWorkflowInstance(instance);
      
      // Publish event
      await eventManager.publishEvent('workflow:transitioned', {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        entityId: instance.entityId,
        fromState: previousState,
        toState: instance.currentState,
        transition: transitionName,
        data
      });
      
      // Check if we've reached an end state
      if (workflow.endStates && workflow.endStates.includes(instance.currentState)) {
        await this.completeWorkflow(instanceId, instance.data);
      }
      
      return instance;
    } catch (error) {
      logger.error('Failed to execute workflow transition:', error);
      throw error;
    }
  }
  
  /**
   * Complete a workflow
   */
  async completeWorkflow(instanceId, result = {}) {
    try {
      // Get workflow instance
      const instance = this.workflowInstances.get(instanceId);
      
      if (!instance) {
        throw new Error(`Workflow instance not found: ${instanceId}`);
      }
      
      // Update instance
      instance.status = 'completed';
      instance.result = result;
      instance.completedAt = new Date();
      instance.updatedAt = new Date();
      
      // Save instance
      await this.saveWorkflowInstance(instance);
      
      // Publish event
      await eventManager.publishEvent('workflow:completed', {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        entityId: instance.entityId,
        state: instance.currentState,
        result
      });
      
      return instance;
    } catch (error) {
      logger.error('Failed to complete workflow:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a workflow
   */
  async cancelWorkflow(instanceId, reason = '') {
    try {
      // Get workflow instance
      const instance = this.workflowInstances.get(instanceId);
      
      if (!instance) {
        throw new Error(`Workflow instance not found: ${instanceId}`);
      }
      
      // Update instance
      instance.status = 'cancelled';
      instance.cancelReason = reason;
      instance.cancelledAt = new Date();
      instance.updatedAt = new Date();
      
      // Save instance
      await this.saveWorkflowInstance(instance);
      
      // Publish event
      await eventManager.publishEvent('workflow:cancelled', {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        entityId: instance.entityId,
        state: instance.currentState,
        reason
      });
      
      return instance;
    } catch (error) {
      logger.error('Failed to cancel workflow:', error);
      throw error;
    }
  }
  
  /**
   * Execute state actions
   */
  async executeStateActions(instance, state, actionType, data) {
    if (!state || !state.actions || !state.actions[actionType]) {
      return;
    }
    
    await this.executeActions(instance, state.actions[actionType], data);
  }
  
  /**
   * Execute actions
   */
  async executeActions(instance, actions, data) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'event':
            // Publish event
            await eventManager.publishEvent(action.event, {
              instanceId: instance.id,
              workflowId: instance.workflowId,
              entityId: instance.entityId,
              state: instance.currentState,
              data: {
                ...instance.data,
                ...data
              },
              ...action.payload
            });
            break;
          case 'http':
            // Execute HTTP request
            // Implementation omitted for brevity
            break;
          case 'function':
            if (typeof action.function === 'function') {
              await action.function(instance, data);
            }
            break;
          default:
            logger.warn(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        logger.error(`Error executing action ${action.type}:`, error);
        
        // Handle action error based on configuration
        if (action.errorBehavior === 'continue') {
          continue;
        } else {
          throw error;
        }
      }
    }
  }
  
  /**
   * Evaluate condition
   */
  evaluateCondition(condition, instanceData, transitionData) {
    try {
      if (typeof condition === 'function') {
        return condition(instanceData, transitionData);
      }
      
      // Simple condition evaluation for string expressions
      if (typeof condition === 'string') {
        // Create a safe evaluation context
        const context = {
          data: instanceData,
          input: transitionData
        };
        
        // Use Function constructor to create a function that evaluates the condition
        const evaluator = new Function('context', `
          with (context) {
            return ${condition};
          }
        `);
        
        return evaluator(context);
      }
      
      return true;
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }
  
  /**
   * Save workflow instance to database
   */
  async saveWorkflowInstance(instance) {
    try {
      // Choose the appropriate database client based on configuration
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for workflow storage: ${this.config.database}`);
      }
      
      // Save instance to database
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        // Check if instance exists
        const existingResult = await dbClient.query(
          'SELECT id FROM workflow_instances WHERE id = $1',
          [instance.id]
        );
        
        const exists = existingResult.rows && existingResult.rows.length > 0;
        
        if (exists) {
          // Update existing instance
          await dbClient.query(
            `UPDATE workflow_instances 
             SET workflow_id = $1, entity_id = $2, current_state = $3, 
                 data = $4, history = $5, status = $6, result = $7,
                 completed_at = $8, cancelled_at = $9, cancel_reason = $10, updated_at = $11
             WHERE id = $12`,
            [
              instance.workflowId,
              instance.entityId,
              instance.currentState,
              JSON.stringify(instance.data),
              JSON.stringify(instance.history),
              instance.status,
              JSON.stringify(instance.result || null),
              instance.completedAt || null,
              instance.cancelledAt || null,
              instance.cancelReason || null,
              instance.updatedAt,
              instance.id
            ]
          );
        } else {
          // Insert new instance
          await dbClient.query(
            `INSERT INTO workflow_instances 
             (id, workflow_id, entity_id, current_state, data, history, 
              status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              instance.id,
              instance.workflowId,
              instance.entityId,
              instance.currentState,
              JSON.stringify(instance.data),
              JSON.stringify(instance.history),
              instance.status,
              instance.createdAt,
              instance.updatedAt
            ]
          );
        }
      } else if (this.config.database === 'mongodb') {
        // MongoDB implementation
        await dbClient.collection('workflow_instances').updateOne(
          { id: instance.id },
          { $set: instance },
          { upsert: true }
        );
      }
      
      // Update in-memory cache
      this.workflowInstances.set(instance.id, instance);
      
      return true;
    } catch (error) {
      logger.error('Failed to save workflow instance:', error);
      throw error;
    }
  }
  
  /**
   * Get workflow instance
   */
  async getWorkflowInstance(instanceId) {
    try {
      // Check in-memory cache first
      if (this.workflowInstances.has(instanceId)) {
        return this.workflowInstances.get(instanceId);
      }
      
      // Get from database
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for workflow storage: ${this.config.database}`);
      }
      
      let instance = null;
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        const result = await dbClient.query(
          'SELECT * FROM workflow_instances WHERE id = $1',
          [instanceId]
        );
        
        if (result.rows && result.rows.length > 0) {
          instance = this.mapDatabaseInstanceToObject(result.rows[0]);
        }
      } else if (this.config.database === 'mongodb') {
        instance = await dbClient.collection('workflow_instances').findOne({ id: instanceId });
      }
      
      if (instance) {
        // Update in-memory cache
        this.workflowInstances.set(instanceId, instance);
      }
      
      return instance;
    } catch (error) {
      logger.error('Failed to get workflow instance:', error);
      throw error;
    }
  }
  
  /**
   * Map database instance to object
   */
  mapDatabaseInstanceToObject(dbInstance) {
    return {
      id: dbInstance.id,
      workflowId: dbInstance.workflow_id,
      entityId: dbInstance.entity_id,
      currentState: dbInstance.current_state,
      data: typeof dbInstance.data === 'string' ? JSON.parse(dbInstance.data) : dbInstance.data,
      history: typeof dbInstance.history === 'string' ? JSON.parse(dbInstance.history) : dbInstance.history,
      status: dbInstance.status,
      result: typeof dbInstance.result === 'string' ? JSON.parse(dbInstance.result) : dbInstance.result,
      createdAt: dbInstance.created_at,
      updatedAt: dbInstance.updated_at,
      completedAt: dbInstance.completed_at,
      cancelledAt: dbInstance.cancelled_at,
      cancelReason: dbInstance.cancel_reason
    };
  }
  
  /**
   * Get workflow instances for entity
   */
  async getWorkflowInstancesForEntity(entityId, options = {}) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for workflow storage: ${this.config.database}`);
      }
      
      let instances = [];
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        let query = 'SELECT * FROM workflow_instances WHERE entity_id = $1';
        const params = [entityId];
        
        if (options.status) {
          query += ' AND status = $2';
          params.push(options.status);
        }
        
        if (options.workflowId) {
          query += ` AND workflow_id = $${params.length + 1}`;
          params.push(options.workflowId);
        }
        
        query += ' ORDER BY created_at DESC';
        
        if (options.limit) {
          query += ` LIMIT $${params.length + 1}`;
          params.push(options.limit);
        }
        
        if (options.offset) {
          query += ` OFFSET $${params.length + 1}`;
          params.push(options.offset);
        }
        
        const result = await dbClient.query(query, params);
        
        if (result.rows) {
          instances = result.rows.map(row => this.mapDatabaseInstanceToObject(row));
        }
      } else if (this.config.database === 'mongodb') {
        const query = { entity_id: entityId };
        
        if (options.status) {
          query.status = options.status;
        }
        
        if (options.workflowId) {
          query.workflow_id = options.workflowId;
        }
        
        let cursor = dbClient.collection('workflow_instances')
          .find(query)
          .sort({ created_at: -1 });
        
        if (options.limit) {
          cursor = cursor.limit(options.limit);
        }
        
        if (options.offset) {
          cursor = cursor.skip(options.offset);
        }
        
        instances = await cursor.toArray();
      }
      
      // Update in-memory cache
      instances.forEach(instance => {
        this.workflowInstances.set(instance.id, instance);
      });
      
      return instances;
    } catch (error) {
      logger.error('Failed to get workflow instances for entity:', error);
      throw error;
    }
  }
}

module.exports = WorkflowEngine; 