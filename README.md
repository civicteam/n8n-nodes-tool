# @civic/n8n-nodes-tool

An [n8n](https://n8n.io) community node that connects an AI Agent to **[Civic](https://www.civic.com)** — Civic's MCP gateway exposes 80+ managed tools (Google Workspace, Microsoft 365, CRMs, finance, dev tools) behind a single bearer token.

Drop the **Civic** node into the AI Agent's **Tools** slot, supply a token from [app.civic.com](https://app.civic.com), and every tool in your configured Civic toolkit becomes individually callable by the model — no per-service OAuth, no per-tool wiring.

## Installation

In your n8n instance:

1. Go to **Settings → Community Nodes**
2. Enter `@civic/n8n-nodes-tool`
3. Click **Install**

## Setup

1. Sign up at [app.civic.com](https://app.civic.com), configure your toolkit, and generate a token from the Install screen.
2. In n8n, create a workflow with an **AI Agent** node.
3. Connect a chat model (any provider — Anthropic, OpenAI, etc.) and a memory node as usual.
4. On the Agent's **Tool** input, click `+`, search for **Civic**, and add it.
5. Configure a new **Civic API** credential with your token.
6. (Optional) Use the **Tool Names or IDs** dropdown on the Civic node to expose only specific tools — leave empty to expose all.

## How it works

This is an n8n AI Tool sub-node:

- `supplyData()` lists every tool from your Civic toolkit via [`@civic/mcp-client`](https://www.npmjs.com/package/@civic/mcp-client) and returns each one as a `DynamicStructuredTool`, packaged in an `n8n-core` `StructuredToolkit`.
- Each tool is wrapped with `logWrapper` so invocations appear in the n8n run log.
- When the AI Agent dispatches a tool call, `execute()` forwards it to Civic Hub via the SDK and returns the result.
- All LangChain and n8n-internal classes are resolved at runtime from n8n's own module tree to avoid the JavaScript dual-package hazard. See [`nodes/Civic/runtime.ts`](nodes/Civic/runtime.ts) for the comment that explains this in detail — it's the non-obvious bit if you're forking this for your own MCP integration.

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

- [Civic Hub overview](https://docs.civic.com/civic/overview)
- [Civic Hub credentials guide](https://docs.civic.com/civic/quickstart/credentials)
- [`@civic/mcp-client`](https://www.npmjs.com/package/@civic/mcp-client)
- [n8n community node docs](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
