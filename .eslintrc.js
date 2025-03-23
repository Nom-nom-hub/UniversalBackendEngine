module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'comma-dangle': ['error', 'never'],
    'arrow-parens': ['error', 'always'],
    'max-len': ['warn', { 'code': 120 }]
  }
}; 