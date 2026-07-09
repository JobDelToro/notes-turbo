// commitlint — Conventional Commits with notes-turbo scopes.
// Reference: docs/developer-guide.md §2 (Git workflow).
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allowed commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'refactor',
        'docs',
        'test',
        'perf',
        'ci',
        'build',
        'style',
        'revert',
      ],
    ],

    // Allowed scopes — areas of the Notes app.
    'scope-enum': [
      2,
      'always',
      [
        'backend', // Django / DRF project
        'frontend', // Next.js app
        'notes', // notes + categories domain
        'auth', // accounts, JWT cookies, permissions
        'ai', // Groq / LLM assist (categorize, summarize)
        'ci', // GitHub Actions, workflows
        'docker', // Dockerfiles, compose
        'docs', // documentation, ADRs
        'deps', // dependency bumps
        'infra', // env, tooling, repo config
        'release', // version / release chores
      ],
    ],
    // A scope is required — keeps history greppable by area.
    // Relax to a warning (1) instead of an error (2) if it proves too strict.
    'scope-empty': [2, 'never'],

    // Subject formatting
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 100],

    // Body / footer
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 200],
    'footer-leading-blank': [2, 'always'],

    // Header total
    'header-max-length': [2, 'always', 120],
  },
};
