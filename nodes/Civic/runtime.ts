// Runtime resolution of n8n-internal classes used by AI Tool sub-nodes.
//
// THE PROBLEM
// -----------
// JavaScript's `instanceof` operator and class-identity checks rely on
// reference equality of the constructor function. Two classes with the same
// name and source code, loaded from different physical files, are different
// JS objects — `instanceof` will return false across them.
//
// pnpm's "strict isolation" creates a separate physical copy of a package per
// peer-dependency context. So a community node that ships an n8n-internal
// module in its own deps ends up with a class instance distinct from the one
// n8n's runtime uses, even at the same version. n8n then refuses to recognise
// the toolkit / treats wrapped tools as foreign.
//
// THE FIX
// -------
// Resolve every shared class/function from n8n's own module tree at runtime.
// We anchor `createRequire` to `require.main` (the n8n CLI entry point), so
// Node's resolver walks n8n's `node_modules` and returns the same physical
// files n8n's agent already loaded. `instanceof` then works.
//
// Pattern adapted from n8n-nodes-hudu's runtime probe:
//   https://github.com/msoukhomlinov/n8n-nodes-hudu/blob/main/nodes/Hudu/ai-tools/runtime.ts
//
// We resolve only two things, both required for an AI Tool sub-node that
// exposes multiple tools:
//   1. `StructuredToolkit` (`n8n-core`) — `supplyData` must return a Toolkit,
//      not a bare array, for n8n to recognise the AI Tool connection.
//   2. `logWrapper` (`@n8n/ai-utilities`) — wraps each tool so n8n's execution
//      layer can intercept invocations and surface them in the run log.
//
// `DynamicStructuredTool` itself does NOT need runtime resolution — the
// `@civic/mcp-client` `langchainAdapter` constructs tool instances using
// `@langchain/core` resolved through its own peerDependency, which (via Node's
// upward node_modules walk) ends up pointing at n8n's instance. Same physical
// file, no dual-package hazard.

import type { DynamicStructuredTool as DynamicStructuredToolType } from '@langchain/core/tools';
import type { ISupplyDataFunctions } from 'n8n-workflow';

export interface N8nRuntime {
	StructuredToolkit: new (tools: DynamicStructuredToolType[]) => unknown;
	logWrapper: (
		tool: DynamicStructuredToolType,
		ctx: ISupplyDataFunctions,
	) => DynamicStructuredToolType;
}

let cached: N8nRuntime | undefined;

/**
 * Lazily resolve n8n-internal modules from n8n's own node_modules tree. The
 * result is cached for the lifetime of the process — these modules are
 * singletons inside n8n.
 *
 * Throws if either module cannot be resolved (e.g. an n8n version that no
 * longer ships them).
 */
export const loadN8nRuntime = (): N8nRuntime => {
	if (cached) return cached;

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { createRequire } = require('module') as {
		createRequire: (path: string) => NodeRequire;
	};

	const anchor = require.main?.filename ?? __filename;
	const req = createRequire(anchor);

	const { StructuredToolkit } = req('n8n-core') as {
		StructuredToolkit: new (tools: DynamicStructuredToolType[]) => unknown;
	};
	const { logWrapper } = req('@n8n/ai-utilities') as {
		logWrapper: N8nRuntime['logWrapper'];
	};

	cached = { StructuredToolkit, logWrapper };
	return cached;
};
