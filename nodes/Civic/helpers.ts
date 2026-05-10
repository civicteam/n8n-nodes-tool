// Pure helpers used by CivicTool. Kept dependency-free (only zod type imports
// and the runtime descriptor type) so they can be unit-tested in isolation.

import type { ZodObject, ZodTypeAny } from 'zod';
import type { N8nRuntime } from './runtime';

/**
 * Shape of an MCP tool as returned by `@civic/mcp-client`'s `getTools()`.
 * Inlined so we don't have to depend on the SDK's internal type names.
 */
export interface McpToolDescriptor {
	name: string;
	description?: string;
	inputSchema?: unknown;
}

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

/**
 * Convert an MCP JSON-Schema input descriptor into a Zod ZodObject suitable
 * for LangChain's StructuredTool.
 *
 * - If the converted schema is already a ZodObject, return it as-is.
 * - If it's a non-object Zod type (rare; primitive-input MCP tools), wrap it
 *   under a single `value` key so it satisfies the StructuredTool contract.
 * - If the conversion throws, fall back to a permissive object so the tool
 *   still appears to the agent — it just won't have parameter validation.
 */
export const toZodObject = (
	schema: unknown,
	runtime: Pick<N8nRuntime, 'convertJsonSchemaToZod' | 'z'>,
): ZodObject<Record<string, ZodTypeAny>> => {
	const { convertJsonSchemaToZod, z } = runtime;
	try {
		const converted = convertJsonSchemaToZod(schema);
		if (converted instanceof z.ZodObject) {
			return converted as ZodObject<Record<string, ZodTypeAny>>;
		}
		return z.object({ value: converted }) as unknown as ZodObject<Record<string, ZodTypeAny>>;
	} catch {
		return z.object({}).passthrough() as unknown as ZodObject<Record<string, ZodTypeAny>>;
	}
};
