import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { MCPServer } from "mcp-use";
import { z } from "zod";

const run = promisify(execFile);
const handsDir = process.env.HANDS_DIR ?? "../computer-use-automation";
const python = process.env.HANDS_PYTHON ?? "python";
const evidence = resolve("evidence");

if (!existsSync(handsDir)) throw new Error(`HANDS_DIR ${handsDir} does not exist`);

// a failed run exits 1 but still prints its result; any other exit is an error
const hands = (args: string[], signal?: AbortSignal) =>
  run(python, ["-m", "hands.cli", ...args], { cwd: handsDir, signal, timeout: 300_000 }).then(
    (r) => r.stdout,
    (e) => (e.code === 1 && e.stdout) || Promise.reject(e)
  );

const server = new MCPServer({
  name: "hands-mcp",
  version: "0.1.0",
  description: "Recorded hands capabilities as MCP tools",
});

for (const tool of JSON.parse(await hands(["catalog"]))) {
  server.tool(
    {
      name: tool.name,
      description: tool.description,
      inputSchema: z.fromJSONSchema(tool.input_schema),
      annotations: { readOnlyHint: tool.risk === "safe" },
    },
    async (args, ctx) => {
      const out = await hands(
        ["invoke", tool.name, "--json", JSON.stringify(args), "--operator", "none", "--evidence", evidence],
        ctx.signal
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
