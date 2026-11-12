// One ESLint flat config for the whole repo (DESIGN D13). Warnings fail CI (--max-warnings=0).
// Layer boundaries are enforced by tooling/repo-checks tests, not here.
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const WEB = 'apps/web/**/*.{ts,tsx,js,jsx,mjs}';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  // Next.js rules, scoped to the web app only.
  ...[...nextVitals, ...nextTs].map((entry) => ({ ...entry, files: [WEB] })),
  {
    files: [WEB],
    settings: { next: { rootDir: 'apps/web' } },
  },
  {
    // Security bans that apply everywhere (DESIGN §8 R3).
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Provider data is untrusted; render it as text (DESIGN §8 R3).',
        },
        {
          selector: "MemberExpression[property.name='innerHTML']",
          message: 'Use textContent; never inject HTML (DESIGN §8 R3).',
        },
      ],
    },
  },
  {
    // Tests may use non-null assertions on fixtures they just built.
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
