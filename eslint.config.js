const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'data/**']
  },
  { files: ['**/*.js'] },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser
      }
    },
    rules: {
      'comma-dangle': ['error', 'never'],
      'eol-last': ['error', 'always'],
      'no-throw-literal': 'warn',
      'quote-props': ['error', 'as-needed'],
      'constructor-super': 'warn',
      'no-const-assign': 'warn',
      'no-this-before-super': 'warn',
      'no-undef': 'warn',
      'no-unreachable': 'warn',
      'no-unused-vars': 'warn',
      'valid-typeof': 'warn',
      curly: ['error', 'multi-or-nest'],
      eqeqeq: 'error',
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      semi: ['error', 'never']
    }
  }
]
