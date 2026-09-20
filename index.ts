import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { MCPServer } from "mcp-use";
import { z } from "zod";

const run = promisify(execFile);
const cwd = process.env.HANDS_DIR ?? "../computer-use-automation";
const python = process.env.HANDS_PYTHON ?? "python";

// a failed run exits 1 but still prints its result
const hands = (...args: string[]) =>
  run(python, ["-m", "hands.cli", ...args], { cwd }).then(
    (r) => r.stdout,
    (e) => e.stdout || Promise.reject(e)
  );

const server = new MCPServer({
  name: "hands-mcp",
  version: "0.1.0",
  description: "Recorded hands capabilities as MCP tools",
});

for (const tool of JSON.parse(await hands("catalog"))) {
  server.tool(
    {
      name: tool.name,
      description: tool.description,
      inputSchema: z.fromJSONSchema(tool.input_schema),
      annotations: { readOnlyHint: tool.description.endsWith("Risk: safe.") },
    },
    async (args) => {
      const out = await hands(
        "invoke", tool.name,
        "--json", JSON.stringify(args),
        "--operator", "none",
        "--evidence", resolve("evidence")
      );
      const result = JSON.parse(out);
      return {
        content: [{ type: "text", text: out }],
        structuredContent: result,
        isError: result.status === "failure",
      };
    }
  );
}

export default server;
