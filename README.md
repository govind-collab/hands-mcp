# hands-mcp

An MCP server for [hands](https://github.com/govind-collab/computer-use-automation).

hands records a UI flow in an old web app once and replays it without a model. This server reads the recorded capabilities at startup and registers each one as an MCP tool. An agent can then call `legacycu__member_savings_balance` with a member number and get the balance back.

Built with [mcp-use](https://github.com/mcp-use/mcp-use).

## Run

You need Node 22 and a working checkout of hands. Its README covers the Python setup.

From the hands checkout, start the demo app that the capabilities run against:

```bash
python -m hands.cli serve-target --port 8080
```

Then in this folder:

```bash
npm install
npm run dev
```

`HANDS_DIR` is the path to the hands checkout (default `../computer-use-automation`). `HANDS_PYTHON` is the interpreter (default `python`). Point it at the venv's python if the venv is not active.

Open http://localhost:3000/mcp/inspector and call a tool. Member 10041 has a savings balance of 15.02. Member 99999 does not exist. That run returns a `MEMBER_NOT_FOUND` outcome and `isError` stays false.

## How it works

`hands catalog` prints every capability as a tool definition with a JSON Schema for its inputs. The server turns each schema into a zod schema, so a bad member number is rejected before any browser starts.

A tool call runs `hands invoke` and returns its JSON result as structured content. A run that ends in `failure` sets `isError`.

Runs have no operator and no grant for steps that change data, so `legacycu__open_subaccount` stops at the hands policy and returns a `POLICY_BLOCKED` failure.

Each run writes its screenshots and step log under `evidence/` in this folder. The result includes the path.
