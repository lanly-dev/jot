const js = require('@eslint/js')
const globals = require('globals')
const stylistic = require('@stylistic/eslint-plugin')

module.exports = [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'data/**']
  },
  { files: ['**/*.js'] },
  { plugins: { '@stylistic': stylistic } },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/max-len': ['warn', { code: 120 }],
      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'none',
            requireLast: false
          },
          singleline: {
            delimiter: 'comma',
            requireLast: false
          }
        }
      ],
      'comma-dangle': ['error', 'never'],
      'constructor-super': 'warn',
      'eol-last': ['error', 'always'],
      'no-const-assign': 'warn',
      'no-this-before-super': 'warn',
      'no-throw-literal': 'warn',
      'no-undef': 'warn',
      'no-unreachable': 'warn',
      'no-unused-vars': 'warn',
      'quote-props': ['error', 'as-needed'],
      'valid-typeof': 'warn',
      curly: ['error', 'multi-line'],
      eqeqeq: 'error',
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      semi: ['error', 'never']
    }
  }
]
