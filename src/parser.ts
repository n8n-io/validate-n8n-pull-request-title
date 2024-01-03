import path from "path";
import { readFileSync } from "fs";
import glob from "fast-glob";
import ts from "typescript";

const NODES_DIR = path.resolve("packages", "nodes-base", "nodes");
const LANGCHAIN_NODES_DIR = path.resolve("packages", "@n8n", "nodes-langchain", "nodes");

async function getDisplayNames() {
  const [nodeFilepaths, versionDescriptionFilepaths, lcNodeFilepaths, lcVersionDescriptionFilepaths] = await Promise.all([
    glob(path.resolve(NODES_DIR, "**", "*.node.ts")),
    glob(path.resolve(NODES_DIR, "**", "versionDescription.ts")),
    glob(path.resolve(LANGCHAIN_NODES_DIR, "**", "*.node.ts")),
    glob(path.resolve(LANGCHAIN_NODES_DIR, "**", "versionDescription.ts")),
  ]);

  const nodeFiles = [...nodeFilepaths, ...lcNodeFilepaths].reduce<string[]>((acc, cur) => {
    let displayName = fromMajorityNodeFile(cur);

    if (!displayName) {
      displayName = fromBaseNodeFileForVersioning(cur);
    }

    return displayName ? [...acc, displayName] : acc;
  }, []);

  const versionDescriptionFiles = [...versionDescriptionFilepaths, ...lcVersionDescriptionFilepaths].reduce<string[]>(
    (acc, cur) => {
      const displayName = fromVersionDescription(cur);

      return displayName ? [...acc, displayName] : acc;
    },
    [],
  );

  const allDisplayNames = [...nodeFiles, ...versionDescriptionFiles];

  // remove duplicates occurring from nodes \`displayName\` being both in
  // base file for versioning and in each of a node's version files

  return [...new Set(allDisplayNames)].sort();
}

/**
 * Get \`displayName\` from \`versionDescription\` object in \`versionDescription.ts\` file,
 * e.g. BambooHR, Mattermost, SyncroMSP
 */
function fromVersionDescription(filename: string): string | null {
  const sourceFile = makeSourceFile(filename);

  const varStatement = sourceFile.statements.find(isVariableStatement);

  if (!varStatement) return null;

  const versionDescriptionDeclaration =
    varStatement.declarationList.declarations.find(
      (d) => isIdentifier(d.name) && d.name.text === "versionDescription",
    );

  if (!versionDescriptionDeclaration?.initializer) return null;

  if (!isObjectLiteralExpression(versionDescriptionDeclaration.initializer))
    return null;

  const { initializer } = versionDescriptionDeclaration;

  const displayNamePropertyAssignment = initializer.properties.find(
    (p): p is ts.PropertyAssignment & { initializer: { text: string } } =>
      isPropertyAssignment(p) &&
      isIdentifier(p.name) &&
      p.name.text === "displayName" &&
      isStringLiteral(p.initializer),
  );

  if (!displayNamePropertyAssignment) return null;

  return displayNamePropertyAssignment.initializer.text;
}

/**
 * Get \`displayName\` from \`description\` field in class in \`*.node.ts\` file,
 * i.e. the majority of node files.
 */
function fromMajorityNodeFile(filename: string): string | null {
  const sourceFile = makeSourceFile(filename);

  const classDeclaration = sourceFile.statements.find(isClassDeclaration);

  if (!classDeclaration) return null;

  const descriptionMember = classDeclaration.members.find(
    (
      m,
    ): m is ts.PropertyDeclaration & {
      initializer: ts.ObjectLiteralExpression;
    } =>
      isPropertyDeclaration(m) &&
      isIdentifier(m.name) &&
      "description" === m.name.text &&
      m.initializer !== undefined &&
      isObjectLiteralExpression(m.initializer),
  );

  if (!descriptionMember) return null;

  const propertyAssignment = descriptionMember.initializer.properties.find(
    (p): p is ts.PropertyAssignment & { initializer: { text: string } } =>
      isPropertyAssignment(p) &&
      isIdentifier(p.name) &&
      p.name.text === "displayName" &&
      isStringLiteral(p.initializer),
  );

  if (!propertyAssignment) return null;

  return propertyAssignment.initializer.text;
}

/**
 * Get \`displayName\` from base \`*.node.ts\` file for versioning, where
 * \`displayName\` is in \`baseDescription\` inside a class constructor,
 * e.g. Notion (Beta), Merge, HTTP Request, SyncroMSP, Gmail, Mattermost
 */
function fromBaseNodeFileForVersioning(filename: string): string | null {
  const sourceFile = makeSourceFile(filename);

  const classDeclaration = sourceFile.statements.find(isClassDeclaration);

  if (!classDeclaration) return null;

  // unclear how to type this - members[i].constructor.body.statements
  const constructor = classDeclaration.members.find(
    (m) =>
      m.kind === ts.SyntaxKind.Constructor &&
      // @ts-ignore
      Array.isArray(m.body.statements),
  ) as { body?: { statements?: ts.Node[] } } | undefined;

  if (!constructor?.body?.statements) return null;

  const varStatement = constructor.body.statements.find(isVariableStatement);

  if (!varStatement) return null;

  const firstDeclaration = varStatement.declarationList.declarations[0];

  if (
    !firstDeclaration?.initializer ||
    !isObjectLiteralExpression(firstDeclaration.initializer)
  ) {
    return null;
  }

  const propertyAssignment = firstDeclaration.initializer.properties.find(
    (p): p is ts.PropertyAssignment & { initializer: { text: string } } =>
      isPropertyAssignment(p) &&
      isIdentifier(p.name) &&
      p.name.text === "displayName" &&
      isStringLiteral(p.initializer),
  );

  if (!propertyAssignment) return null;

  return propertyAssignment.initializer.text;
}

/**
 * Helpers
 */

function makeSourceFile(filename: string) {
  return ts.createSourceFile(
    filename,
    readFileSync(filename).toString(),
    ts.ScriptTarget.ES2022,
  );
}

function isVariableStatement(node: ts.Node): node is ts.VariableStatement {
  return node.kind === ts.SyntaxKind.VariableStatement;
}

function isIdentifier(statement: ts.Node): statement is ts.Identifier {
  return statement.kind === ts.SyntaxKind.Identifier;
}

function isObjectLiteralExpression(
  node: ts.Node,
): node is ts.ObjectLiteralExpression {
  return node.kind === ts.SyntaxKind.ObjectLiteralExpression;
}

function isPropertyAssignment(node: ts.Node): node is ts.PropertyAssignment {
  return node.kind === ts.SyntaxKind.PropertyAssignment;
}

function isPropertyDeclaration(node: ts.Node): node is ts.PropertyDeclaration {
  return node.kind === ts.SyntaxKind.PropertyDeclaration;
}

function isStringLiteral(node: ts.Node): node is ts.StringLiteral {
  return node.kind === ts.SyntaxKind.StringLiteral;
}

function isClassDeclaration(node: ts.Node): node is ts.ClassDeclaration {
  return node.kind === ts.SyntaxKind.ClassDeclaration;
}

getDisplayNames().then((result) =>
  console.log(JSON.stringify(result, null, 2)),
);
