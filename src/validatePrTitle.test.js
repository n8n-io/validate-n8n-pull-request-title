const { validatePrTitle: validate } = require("./validatePrTitle");
const { ERRORS, NO_CHANGELOG } = require("./constants");
const displayNamesModule = require("./getAllNodesDisplayNames");
const { TYPES } = require("./constants");
const {
  ALL_NODES_DISPLAY_NAMES_FOR_TESTING_ONLY,
} = require("./testDisplayNames");

jest.mock("./getAllNodesDisplayNames");

jest
  .spyOn(displayNamesModule, "getAllNodesDisplayNames")
  .mockReturnValue(ALL_NODES_DISPLAY_NAMES_FOR_TESTING_ONLY);

describe("schema", () => {
  test("Validation should fail for conventional schema mismatch", () => {
    ["feat(core):", "feat(core)", "feat(core) implement feature"].forEach(
      async (title) => {
        const issues = await validate(title);
        expect(issues)
          .toHaveLength(1)
          .toContain(ERRORS.CONVENTIONAL_SCHEMA_MISMATCH);
      },
    );
  });

  test("Validation should fail for valid ticket number in schema", () => {
    [
      "feat(Mattermost node): Add new resource n8n-1234",
      "n8n-1234 feat(Mattermost node): Add new resource",
      "feat(Mattermost node) n8n-1234: Add new resource",
    ].forEach(async (title) => {
      const issues = await validate(title);
      expect(issues).toHaveLength(1).toContain(ERRORS.TICKET_NUMBER_PRESENT);
    });
  });
});

describe("type", () => {
  test("Validation should pass for valid type", () => {
    TYPES.forEach(async (type) => {
      const issues = await validate(`${type}(core): Implement feature`);
      expect(issues).toHaveLength(0);
    });
  });

  test("Validation should fail for invalid type", async () => {
    const issues = await validate("wrong(core): Implement feature");
    expect(issues).toHaveLength(1).toContain(ERRORS.INVALID_TYPE);
  });
});

describe("scope", () => {
  test("Validation should pass for valid title with scope", async () => {
    const issues = await validate("feat(core): Implement feature");
    expect(issues).toHaveLength(0);
  });

  test("Validation should pass for title with multiple valid scopes", async () => {
    const issues = await validate("feat(core, editor): Implement feature");
    expect(issues).toHaveLength(0);
  });

  test("Validation should fail for title with valid scope and invalid scope", async () => {
    const issues = await validate("feat(core, wrong): Implement feature");
    expect(issues).toHaveLength(1).toContain(ERRORS.INVALID_SCOPE);
  });

  test("Validation should fail for title with multiple invalid scopes", async () => {
    const issues = await validate("feat(wrong1, wrong2): Implement feature");
    expect(issues).toHaveLength(2).toContain(ERRORS.INVALID_SCOPE);
  });

  test("Validation should fail for title with misdelimited valid scopes", async () => {
    expect(await validate("feat(core,editor): Implement feature"))
      .toHaveLength(1)
      .toContain(ERRORS.MISSING_WHITESPACE_AFTER_COMMA);
  });

  test("Validation should pass for valid title without scope", async () => {
    const issues = await validate("feat: Implement feature");
    expect(issues).toHaveLength(0);
  });

  test("Validation should fail for miscased node suffix", async () => {
    const issues = await validate("feat(Mattermost node): Add new resource");
    expect(issues).toHaveLength(1).toContain(ERRORS.INVALID_SCOPE);
  });

  test("Validation should fail for misspelled node scope", async () => {
    let issues = await validate("feat(Mattermos Node): Change default value");
    expect(issues)
      .toHaveLength(1)
      .toContain(ERRORS.INVALID_SCOPE + ". Did you mean `Mattermost Node`?");

    issues = await validate("feat(Gmai Trigger Node): Change default value");
    expect(issues)
      .toHaveLength(1)
      .toContain(ERRORS.INVALID_SCOPE + ". Did you mean `Gmail Trigger Node`?");
  });
});

describe("subject", () => {
  test("Validation should fail for lowercase initial in subject", async () => {
    const issues = await validate("feat(core): implement feature");
    expect(issues)
      .toHaveLength(1)
      .toContain(ERRORS.LOWERCASE_INITIAL_IN_SUBJECT);
  });

  test("Validation should fail for final period in subject", async () => {
    const issues = await validate("feat(core): Implement feature.");
    expect(issues).toHaveLength(1).toContain(ERRORS.FINAL_PERIOD_IN_SUBJECT);
  });

  test("Validation should pass for present-tense verb", async () => {
    const issues = await validate("feat(editor): Update something");
    expect(issues).toHaveLength(0);
  });

  test("Validation should fail for non-present-tense verb", async () => {
    [
      "feat(Mattermost Node): Added new resource",
      "feat(Mattermost Node): Created new resource",
    ].forEach(async (title) => {
      const issues = await validate(title);
      expect(issues)
        .toHaveLength(1)
        .toContain(ERRORS.NO_PRESENT_TENSE_IN_SUBJECT);
    });
  });

  test("Validation should pass for breaking-change indicator `!`", async () => {
    const issues = await validate("feat(Oura Node)!: Change default value");
    expect(issues).toHaveLength(0);
  });

  test(`Validation should pass for \`${NO_CHANGELOG}\` in final position`, async () => {
    const issues = await validate("docs(Oura Node): Fix typo (no-changelog)");
    expect(issues).toHaveLength(0);
  });

  test(`Validation should fail for \`${NO_CHANGELOG}\` not in final position`, () => {
    [
      "docs(Oura Node): Fix (no-changelog) typo",
      "docs(Oura Node): Fix typo(no-changelog) ",
      "docs(Oura Node): (no-changelog) Fix typo",
    ].forEach(async (title) => {
      const issues = await validate(title);
      expect(issues)
        .toHaveLength(1)
        .toContain(ERRORS.SKIP_CHANGELOG_NOT_IN_FINAL_POSITION);
    });
  });
});
