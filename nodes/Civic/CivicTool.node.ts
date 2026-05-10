/* eslint-disable @n8n/community-nodes/node-usable-as-tool -- this node is already an AiTool sub-node; auto-wrapping it would create a duplicate */
import { CivicMcpClient } from '@civic/mcp-client';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	extractToolArgs,
	formatToolResult,
	type McpToolDescriptor,
	toZodObject,
} from './helpers';
import { loadN8nRuntime } from './runtime';

interface CivicCredentials {
	apiToken: string;
}

const CIVIC_CLIENT_NAME = '@civic/n8n-nodes-tool';
const CIVIC_CLIENT_VERSION = '0.1.1';

const buildClient = (apiToken: string): CivicMcpClient =>
	new CivicMcpClient({
		auth: { token: apiToken },
		clientName: CIVIC_CLIENT_NAME,
		clientVersion: CIVIC_CLIENT_VERSION,
	});

/**
 * The AI Agent connector for Civic Hub.
 *
 * Architecture
 * ------------
 * This is an AI Tool sub-node — it has no Main inputs and outputs an `AiTool`
 * connection. It exposes every tool from the user's Civic toolkit (Google
 * Workspace, Microsoft 365, CRMs, finance, dev tools, …) as an individually
 * callable LangChain tool.
 *
 * `supplyData()` returns a `StructuredToolkit` of `DynamicStructuredTool`s —
 * one per Civic-managed MCP tool. Each is wrapped with n8n's `logWrapper` so
 * invocations show up in the run log. When the agent dispatches a tool call,
 * the logWrapper bridge routes it through this node's `execute()` method,
 * which is why both methods exist on what would otherwise be a pure sub-node.
 *
 * All LangChain and n8n-internal classes are resolved at runtime from n8n's
 * own module tree (see `runtime.ts`) to side-step the JS dual-package hazard
 * that pnpm's strict isolation would otherwise cause.
 */
export class CivicTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Civic',
		name: 'civicTool',
		icon: {
			light: 'file:../../icons/civic.svg',
			dark: 'file:../../icons/civic.dark.svg',
		},
		group: ['output'],
		version: 1,
		description:
			'Connect an AI Agent to Civic — exposes tools from your configured Civic toolkit (Google Workspace, Microsoft 365, CRMs, finance, dev tools, and more)',
		subtitle: 'Civic',
		defaults: {
			name: 'Civic',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [{ url: 'https://docs.civic.com/civic/overview' }],
			},
		},
		credentials: [
			{
				name: 'civicApi',
				required: true,
			},
		],
		inputs: [],
		outputs: [
			{
				type: NodeConnectionTypes.AiTool,
				displayName: 'Tools',
			},
		],
		properties: [
			{
				displayName:
					'Connects to Civic. Configure your toolkit and generate an API token at <a href="https://app.civic.com" target="_blank">app.civic.com</a>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Tool Names or IDs',
				name: 'tools',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTools',
				},
				default: [],
				description:
					'Select which tools to expose to the agent. Leave empty to expose all available tools. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
			/**
			 * Populate the "Tool Names or IDs" multi-select at config time by
			 * listing every tool the configured Civic toolkit currently exposes.
			 */
			async getTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials<CivicCredentials>('civicApi');
				const client = buildClient(credentials.apiToken);
				try {
					const { tools } = await client.getTools();
					return tools.map((tool: McpToolDescriptor) => ({
						name: tool.name,
						value: tool.name,
						description: tool.description ?? '',
					}));
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to load Civic tools: ${(error as Error).message}`,
					);
				} finally {
					await client.close();
				}
			},
		},
	};

	/**
	 * Invoked when the AI Agent dispatches a Civic tool call. n8n's
	 * `logWrapper` bridges from a `DynamicStructuredTool.invoke()` to this
	 * method, supplying the chosen tool name (and any arguments) on the input
	 * envelope.
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const credentials = await this.getCredentials<CivicCredentials>('civicApi');
		const client = buildClient(credentials.apiToken);

		try {
			const results: INodeExecutionData[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const json = (items[itemIndex].json ?? {}) as Record<string, unknown>;
					const toolName = typeof json.tool === 'string' ? json.tool : undefined;
					if (!toolName) {
						throw new NodeOperationError(
							this.getNode(),
							'Civic tool dispatch is missing a `tool` field on the input',
							{ itemIndex },
						);
					}
					const toolArgs = extractToolArgs(json);
					const result = await client.callTool(toolName, toolArgs);
					results.push({
						json: { result: formatToolResult(result.content) },
						pairedItem: { item: itemIndex },
					});
				} catch (error) {
					if (this.continueOnFail()) {
						results.push({
							json: { error: (error as Error).message },
							pairedItem: { item: itemIndex },
						});
						continue;
					}
					throw error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex });
				}
			}
			return [results];
		} finally {
			await client.close();
		}
	}

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<CivicCredentials>('civicApi');
		// `tools` may come back as undefined when the user picks
		// "Let the model define this parameter" — coerce to an empty array.
		const rawSelected = this.getNodeParameter('tools', itemIndex, []);
		const selectedTools: string[] = Array.isArray(rawSelected) ? (rawSelected as string[]) : [];

		const client = buildClient(credentials.apiToken);

		let mcpTools: McpToolDescriptor[];
		try {
			const result = await client.getTools();
			mcpTools = result.tools as McpToolDescriptor[];
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to connect to Civic: ${(error as Error).message}`,
				{ itemIndex },
			);
		}

		const filtered =
			selectedTools.length > 0
				? mcpTools.filter((tool) => selectedTools.includes(tool.name))
				: mcpTools;

		const runtime = loadN8nRuntime();
		const { DynamicStructuredTool, StructuredToolkit, logWrapper } = runtime;

		const tools = filtered.map((mcpTool) => {
			const tool = new DynamicStructuredTool({
				name: mcpTool.name,
				description: mcpTool.description ?? `Civic tool: ${mcpTool.name}`,
				schema: toZodObject(mcpTool.inputSchema, runtime) as never,
				func: async (args: unknown) => {
					const result = await client.callTool(
						mcpTool.name,
						(args ?? {}) as Record<string, unknown>,
					);
					return formatToolResult(result.content);
				},
				metadata: { isFromToolkit: true },
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridging two DynamicStructuredTool generic instantiations
			return logWrapper(tool as any, this);
		});

		return {
			response: new StructuredToolkit(tools),
			closeFunction: async () => {
				await client.close();
			},
		};
	}
}
