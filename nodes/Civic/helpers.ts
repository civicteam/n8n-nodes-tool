// Pure helpers used by CivicTool's `execute()` path. Kept dependency-free so
// they can be unit-tested in isolation.

/**
 * Fields n8n injects on the input envelope when dispatching a tool call to a
 * sub-node's `execute()`. Anything *not* in this set is treated as an argument
 * forwarded to the underlying MCP tool.
 */
export const N8N_DISPATCH_FIELDS: ReadonlySet<string> = new Set([
	'tool',
	'toolCallId',
	'action',
	'sessionId',
	'chatInput',
]);

/**
 * Strip n8n's dispatch metadata from the input envelope and return only the
 * fields that should be forwarded as the MCP tool's arguments. The agent
 * spreads Claude's tool args directly onto `json` alongside dispatch metadata,
 * so this is a simple subtraction.
 */
export const extractToolArgs = (json: Record<string, unknown>): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(json).filter(([key]) => !N8N_DISPATCH_FIELDS.has(key)),
	);

/**
 * Format an MCP `callTool` result's content for the LLM. Strings are returned
 * as-is; everything else is JSON-stringified.
 */
export const formatToolResult = (content: unknown): string =>
	typeof content === 'string' ? content : JSON.stringify(content);
