# Changelog

## 0.1.0 — Initial release

- AI Agent Tool sub-node connecting to Civic Hub via [`@civic/mcp-client`](https://www.npmjs.com/package/@civic/mcp-client).
- Exposes every tool from the user's Civic toolkit (Google Workspace, Microsoft 365, CRMs, finance, dev tools, …) as an individually-callable LangChain tool.
- Tool filter via "Tool Names or IDs" multi-select; leave empty to expose all.
- Bearer-token credential with MCP `initialize` test against `https://app.civic.com/hub/mcp`.
