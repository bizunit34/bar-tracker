/* eslint-disable import/no-commonjs */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
    ecmaVersion: 'latest'
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
    'import',
    'simple-import-sort'
  ],
  extends: [
    '@react-native',
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
    'prettier'
  ],
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: true,
      node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] }
    }
  },
  env: {
    'react-native/react-native': true,
    es6: true
  },
  rules: {
    'import/no-unresolved': 'error',
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: '*', next: 'class' },
      { blankLine: 'always', prev: 'class', next: '*' },
      { blankLine: 'always', prev: '*', next: 'block' },
      { blankLine: 'always', prev: 'block', next: '*' },
      { blankLine: 'always', prev: '*', next: 'for' },
      { blankLine: 'always', prev: 'for', next: '*' },
      { blankLine: 'always', prev: '*', next: 'if' },
      { blankLine: 'always', prev: 'if', next: '*' },
      { blankLine: 'always', prev: '*', next: 'try' },
      { blankLine: 'always', prev: 'try', next: '*' },
      { blankLine: 'always', prev: '*', next: 'while' },
      { blankLine: 'always', prev: 'while', next: '*' }
    ],
    curly: 'error',
    'arrow-body-style': ['error', 'always'],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'keyword-spacing': ['error', { before: true, after: true }],
    '@typescript-eslint/explicit-member-accessibility': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'class', format: ['PascalCase'] }
    ],
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    '@typescript-eslint/typedef': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'dot-notation': ['error', { allowKeywords: true }],
    '@typescript-eslint/dot-notation': [
      'error',
      {
        allowKeywords: true,
        allowPrivateClassPropertyAccess: false,
        allowProtectedClassPropertyAccess: false,
        allowIndexSignaturePropertyAccess: false
      }
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],
    'react-native/no-raw-text': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off'
  },
  overrides: [
    {
      files: ['*.js'],
      parserOptions: { project: null }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'babel.config.js',
    'metro.config.js'
  ]
};
