const TYPES = [
  "feat",
  "fix",
  "perf",
  "test",
  "docs",
  "refactor",
  "build",
  "ci",
  "chore",
];

const SCOPES = ["API", "core", "editor", "benchmark"];

const displayTypes = TYPES.map((type) => `\`${type}\``).join(", ");
const displayScopes = SCOPES.map((type) => `\`${type}\``).join(", ");

const NO_CHANGELOG = "(no-changelog)";

const ERRORS = {
  CONVENTIONAL_SCHEMA_MISMATCH: [
    "PR title does not match PR title convention: type: subject or type(scope): subject",
    `For \`type\`, use \`type:\` or \`type(scope):\`, where \`type\` is one of ${displayTypes}`,
    `If present, \`scope\` must be one of ${displayScopes} or \`<displayName> Node\``,
    "For the subject, mind the whitespace, start with uppercase and omit final period",
  ].join(". "),
  TICKET_NUMBER_PRESENT: "PR title must not contain a ticket number",
  TYPE_NOT_FOUND: `Failed to find \`type\` in PR title. Expected one of ${displayTypes}`,
  INVALID_TYPE: `Unknown \`type\` in PR title. Expected one of ${displayTypes}`,
  INVALID_SCOPE: `Unknown \`scope\` in PR title. Expected one of ${displayScopes} or \`<displayName> Node\``,
  LOWERCASE_INITIAL_IN_SUBJECT: "First char of subject must be uppercase",
  FINAL_PERIOD_IN_SUBJECT: "Subject must not end with a period",
  NO_PRESENT_TENSE_IN_SUBJECT: "Subject must use present tense",
  SKIP_CHANGELOG_NOT_IN_FINAL_POSITION: `\`${NO_CHANGELOG}\` must be located at the end of the subject`,
  MISSING_WHITESPACE_AFTER_COMMA:
    "Missing whitespace after comma to separate multiple scopes",
};

const REGEXES = {
  CONVENTIONAL_SCHEMA: /(?<type>\w+)(\((?<scope>.*)\))?!?: (?<subject>.*)/,
  TICKET: /n8n-\d{3,5}/i,
};

module.exports = {
  TYPES,
  SCOPES,
  NO_CHANGELOG,
  ERRORS,
  REGEXES,
};
