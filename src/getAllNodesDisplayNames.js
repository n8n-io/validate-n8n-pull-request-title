const { exec: callbackExec } = require("child_process");
const { promisify } = require("util");
const exec = promisify(callbackExec);

/**
 * @returns { Promise<string[]> } e.g. ["Action Network", "Active Campaign", etc.]
 */
async function getAllNodesDisplayNames() {
  try {
    await exec(
      "npm i typescript@5.3 @types/node@18.16 fast-glob; npm i -g ts-node@10.9",
    );
    await exec(`cp "${__dirname}/../src/parser.ts" parser.ts`);
    const result = await exec("ts-node parser.ts");
    return JSON.parse(result.stdout);
  } catch (error) {
    console.error("Failed to generate list of node display names");
    console.error(error);
  }
}

module.exports = {
  getAllNodesDisplayNames,
};
