# @civic/n8n-nodes-tool

An [n8n](https://n8n.io) community node that connects an AI Agent to **[Civic](https://www.civic.com)** — Civic's MCP gateway exposes 80+ managed tools (Google Workspace, Microsoft 365, CRMs, finance, dev tools) behind a single bearer token.

Drop the **Civic** node into the AI Agent's **Tools** slot, supply a token from [app.civic.com](https://app.civic.com), and every tool in your configured Civic toolkit becomes individually callable by the model — no per-service OAuth, no per-tool wiring.

For everything Civic Hub can do beyond what's covered here, see **[docs.civic.com](https://docs.civic.com)**.

![AI Agent calling a Civic tool mid-execution](https://raw.githubusercontent.com/civicteam/n8n-nodes-tool/main/screenshots/16-calendar-running.png)

## Installation

In your n8n instance:

1. Go to **Settings → Community Nodes**
2. Click **Install a community node**
3. Enter `@civic/n8n-nodes-tool` and accept the risk acknowledgement

![Install dialog with the package name filled in](https://raw.githubusercontent.com/civicteam/n8n-nodes-tool/main/screenshots/03-install-form-filled.png)

After installing, the package shows up in the Community Nodes list:

![Installed package showing v0.2.0 with one Civic node](https://raw.githubusercontent.com/civicteam/n8n-nodes-tool/main/screenshots/04-installed.png)

## Setup

### 1. Pick the apps you want the agent to reach

Sign in at [app.civic.com](https://app.civic.com) and open the **Applications** view. Click **Add** on every service you want the agent to be able to use — Google Workspace, Microsoft 365, CRMs, finance tools, and so on. Civic handles the OAuth dance for each. Bundle the apps you want into a **Toolkit**.

![Civic Applications view with Google Calendar already added](https://raw.githubusercontent.com/civicteam/n8n-nodes-tool/main/screenshots/05-civic-apps.png)

For more on toolkits, profiles, guardrails, audit logs, and the rest of Civic Hub, see **[docs.civic.com](https://docs.civic.com)**.

### 2. Generate a Civic token

Pick the toolkit you want to expose to n8n in the top-left toolkit switcher, then go to **Install → MCP URL**. Choose **Generate a Civic token** and click the button to create one. Copy the value — n8n will need it.

![Civic Install page with "Generate a Civic token" selected](https://raw.githubusercontent.com/civicteam/n8n-nodes-tool/main/screenshots/07-civic-generate-token-step.png)

### 3. Wire up the workflow in n8n

Create a workflow with an **AI Agent** node. Connect a chat model (Anthropic, OpenAI, …) and a memory node as usual.

On the Agent's **Tool** input click `+`, search for **Civic**, and add it.

![Civic in n8n's tool picker](https://raw.githubusercontent.com/civicteam/n8n-nodes-tool/main/screenshots/12-civic-search.png)

Configure a new **Civic API** credential with the token you copied. The credential test issues a real MCP `initialize` against `https://app.civic.com/hub/mcp` — a green check means the token authenticated successfully.

![Credential dialog showing successful connection test](https://raw.githubusercontent.com/civicteam/n8n-nodes-tool/main/screenshots/14-credential-edit.png)

(Optional) Use the **Tool Names or IDs** dropdown on the Civic node to expose only specific tools — leave empty to expose all.

### 4. Run

Open the chat panel and ask the agent something that needs a Civic tool — e.g. *what's on my calendar this week?* The agent will call Civic tools as it needs them and synthesise the answer.

## How it works

This is an n8n AI Tool sub-node:

- `supplyData()` lists every tool from your Civic toolkit via [`@civic/mcp-client`](https://www.npmjs.com/package/@civic/mcp-client)'s `langchainAdapter`, returning each one as a `DynamicStructuredTool`, packaged in an `n8n-core` `StructuredToolkit`.
- Each tool is wrapped with `logWrapper` so invocations appear in the n8n run log.
- When the AI Agent dispatches a tool call, `execute()` forwards it to Civic Hub via the SDK and returns the result.
- All n8n-internal classes (`StructuredToolkit`, `logWrapper`) are resolved at runtime from n8n's own module tree to avoid the JavaScript dual-package hazard. See [`nodes/Civic/runtime.ts`](nodes/Civic/runtime.ts) for the comment that explains this in detail — it's the non-obvious bit if you're forking this for your own MCP integration.

## Credentials

The **Civic API** credential takes a single field:

- **API Token** — bearer token from [app.civic.com](https://app.civic.com)

The credential test issues an MCP `initialize` against `https://app.civic.com/hub/mcp` with the token; a green check means the token authenticated successfully.

## Compatibility

- n8n `>= 2.19`
- Self-hosted only — n8n Cloud doesn't currently allow community nodes that ship third-party dependencies, and we ship `@civic/mcp-client`.

## Development

```bash
pnpm install      # install deps
pnpm lint         # n8n's community-node lint suite
pnpm test         # vitest unit tests
pnpm build        # compile TypeScript and copy static files into dist/
pnpm dev          # run a local n8n with this node loaded (hot reload)
```

CI runs lint + tests + build on every push and PR. Releases are triggered by pushing a version tag (e.g. `0.2.0`); GitHub Actions then publishes to npm with a provenance attestation.

## Resources

- **[docs.civic.com](https://docs.civic.com)** — full Civic Hub docs (toolkits, profiles, guardrails, audit logs, etc.)
- [Civic Hub overview](https://docs.civic.com/civic/overview)
- [Civic Hub credentials guide](https://docs.civic.com/civic/quickstart/credentials)
- [`@civic/mcp-client`](https://www.npmjs.com/package/@civic/mcp-client)
- [n8n community node docs](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
