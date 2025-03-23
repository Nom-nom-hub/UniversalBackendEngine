const ValidationManager = require('../../core/validation');

describe('ValidationManager', () => {
  let validationManager;
  
  beforeEach(() => {
    validationManager = new ValidationManager({
      removeAdditional: 'all',
      customFormats: {
        zipCode: {
          type: 'string',
          validate: (code) => /^\d{5}(-\d{4})?$/.test(code)
        }
      }
    });
  });
  
  test('should initialize with config', () => {
    expect(validationManager).toBeDefined();
    expect(validationManager.config.removeAdditional).toBe('all');
  });
  
  test('should add schema successfully', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    };
    
    expect(() => validationManager.addSchema('test', schema)).not.toThrow();
  });
  
  test('should validate data against schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' }
      },
      required: ['name', 'email']
    };
    
    validationManager.addSchema('user', schema);
    
    const validData = {
      name: 'John',
      email: 'john@example.com'
    };
    
    const invalidData = {
      name: 'J',
      email: 'not-an-email'
    };
    
    const validResult = validationManager.validate('user', validData);
    const invalidResult = validationManager.validate('user', invalidData);
    
    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors).toHaveLength(2);
  });
  
  test('should validate custom formats', () => {
    const schema = {
      type: 'object',
      properties: {
        zipCode: { type: 'string', format: 'zipCode' }
      }
    };
    
    validationManager.addSchema('address', schema);
    
    const validData = { zipCode: '12345' };
    const invalidData = { zipCode: 'invalid' };
    
    const validResult = validationManager.validate('address', validData);
    const invalidResult = validationManager.validate('address', invalidData);
    
    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
  });
  
  test('should throw error for non-existent schema', () => {
    expect(() => {
      validationManager.validate('nonexistent', {});
    }).toThrow('Schema \'nonexistent\' not found');
  });
}); 