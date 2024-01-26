const { closest } = require("fastest-levenshtein");
const { getAllNodesDisplayNames } = require("./getAllNodesDisplayNames");
const { TYPES, SCOPES, NO_CHANGELOG, ERRORS, REGEXES } = require("./constants");

/**
 * Validate that a pull request title matches n8n's version of the Conventional Commits spec.
 *
 * See: https://www.notion.so/n8n/Release-Process-fce65faea3d5403a85210f7e7a60d0f8
 */
async function validatePrTitle(title) {
  const match = title.match(REGEXES.CONVENTIONAL_SCHEMA);

  // general validation

  if (!match) return [ERRORS.CONVENTIONAL_SCHEMA_MISMATCH];

  if (containsTicketNumber(title)) return [ERRORS.TICKET_NUMBER_PRESENT];

  const issues = [];

  // type validation

  if (!match?.groups?.type) {
    issues.push(ERRORS.TYPE_NOT_FOUND);
  }

  const { type } = match.groups;

  if (isInvalidType(type)) {
    issues.push(ERRORS.INVALID_TYPE);
  }

  // scope validation

  const { scope } = match.groups;

  if (scope) {
    if (/,\S/.test(scope)) {
      issues.push(ERRORS.MISSING_WHITESPACE_AFTER_COMMA);
    } else {
      const scopeIssues = await Promise.all(
        scope.split(", ").map(getScopeIssue),
      );
      issues.push(...scopeIssues.filter((scopeIssue) => scopeIssue !== null));
    }
  }

  // subject validation

  const { subject } = match.groups;

  if (startsWithLowerCase(subject)) {
    issues.push(ERRORS.UPPERCASE_INITIAL_IN_SUBJECT);
  }

  if (endsWithPeriod(subject)) {
    issues.push(ERRORS.FINAL_PERIOD_IN_SUBJECT);
  }

  if (doesNotUsePresentTense(subject)) {
    issues.push(ERRORS.NO_PRESENT_TENSE_IN_SUBJECT);
  }

  if (hasSkipChangelog(subject) && skipChangelogIsNotInFinalPosition(subject)) {
    issues.push(ERRORS.SKIP_CHANGELOG_NOT_IN_FINAL_POSITION);
  }

  return issues;
}

/**
 * Helpers
 */

const isInvalidType = (str) => !TYPES.includes(str);

const isInvalidNodeScope = (str, allNodesDisplayNames) =>
  !allNodesDisplayNames.some((name) => str.startsWith(name));

const getScopeIssue = async (scope) => {
  if (scope.endsWith(" Node")) {
    const names = await getAllNodesDisplayNames();

    if (names.length === 0) {
      console.log("Failed to find all nodes display names. Skipping check...");
      return null;
    }

    if (isInvalidNodeScope(scope, names)) {
      const closest = getClosestMatch(scope, names);
      const supplement = `. Did you mean \`${closest} Node\`?`;

      return ERRORS.INVALID_SCOPE + supplement;
    }
  } else if (!SCOPES.includes(scope)) {
    return ERRORS.INVALID_SCOPE;
  }

  return null;
};

const startsWithLowerCase = (str) => /^[a-z]/.test(str);

const endsWithPeriod = (str) => /\.$/.test(str);

const containsTicketNumber = (str) => REGEXES.TICKET.test(str);

const doesNotUsePresentTense = (str) => {
  const verb = str.split(" ").shift();

  return verb.endsWith("ed"); // naive check
};

const hasSkipChangelog = (str) => str.includes(NO_CHANGELOG);

const skipChangelogIsNotInFinalPosition = (str) => {
  const suffixPattern = [" ", escapeForRegex(NO_CHANGELOG), "$"].join("");

  return !new RegExp(suffixPattern).test(str);
};

const escapeForRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getClosestMatch = (str, names) =>
  closest(str.split(" Node").shift(), names);

module.exports = { validatePrTitle };
