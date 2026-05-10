# Changelog

## 0.2.1

- Docs only. README walkthrough with screenshots from a clean install + setup
  flow, Civic banner at the top, link to `docs.civic.com`, and an importable
  example workflow at `examples/civic-calendar.json`.

## 0.2.0

### Major refactor — switch to `@civic/mcp-client`'s LangChain adapter

`@civic/mcp-client@1.0.1` ships a `langchainAdapter` that returns
`DynamicStructuredTool[]` directly, with proper JSON-Schema → Zod conversion,
content concatenation, and `isError` handling all built in. We now use it
instead of building tools by hand.

- `supplyData()` is now ~10 lines of orchestration (`client.getTools(langchainAdapter())`,
  `logWrapper` each, wrap in `StructuredToolkit`).
- Dropped the `toZodObject` helper, the `convertJsonSchemaToZod` runtime
  resolution, and the schema-fallback chain — the adapter handles all that.
- `runtime.ts` shrinks from 5 resolved exports to 2 (`StructuredToolkit` and
  `logWrapper`). `@langchain/core` no longer needs runtime resolution because
  the SDK declares it as a peer dependency, so the adapter's tool instances
  are constructed against n8n's `@langchain/core` automatically.
- Bumped `@civic/mcp-client` 0.1.1 → 1.0.1.
- Bumped `tsconfig` `module`/`moduleResolution` to `node16` so the SDK's
  exports map (`./adapters/langchain`) resolves at compile time.

No user-facing changes — the node's UI, credential, parameters, and
behaviour are identical to 0.1.1.

## 0.1.1

- Dependency bumps: `@langchain/core` 1.1.44 → 1.1.45, `zod` 3.25.67 → 3.25.76.
- CI/Publish workflows: bumped GitHub Actions to v6 (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`).
- First release published from GitHub Actions with npm provenance attestation.

## 0.1.0 — Initial release

- AI Agent Tool sub-node connecting to Civic Hub via [`@civic/mcp-client`](https://www.npmjs.com/package/@civic/mcp-client).
- Exposes every tool from the user's Civic toolkit (Google Workspace, Microsoft 365, CRMs, finance, dev tools, …) as an individually-callable LangChain tool.
- Tool filter via "Tool Names or IDs" multi-select; leave empty to expose all.
- Bearer-token credential with MCP `initialize` test against `https://app.civic.com/hub/mcp`.
