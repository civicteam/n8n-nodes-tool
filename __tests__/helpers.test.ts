import { describe, expect, it } from 'vitest';

import {
	extractToolArgs,
	formatToolResult,
	N8N_DISPATCH_FIELDS,
} from '../nodes/Civic/helpers';

describe('extractToolArgs', () => {
	it('strips every n8n-injected dispatch field', () => {
		const input = {
			tool: 'google-calendar-get_events',
			toolCallId: 'toolu_abc',
			action: 'sendMessage',
			sessionId: '0078b6ba',
			chatInput: 'what is on my calendar?',
			time_min: '2026-05-11T00:00:00',
			time_max: '2026-05-11T23:59:59',
		};

		expect(extractToolArgs(input)).toEqual({
			time_min: '2026-05-11T00:00:00',
			time_max: '2026-05-11T23:59:59',
		});
	});

	it('returns an empty object when only metadata fields are present', () => {
		const input = {
			tool: 'help',
			toolCallId: 'toolu_xyz',
			action: 'sendMessage',
			sessionId: 'abc',
			chatInput: 'hi',
		};

		expect(extractToolArgs(input)).toEqual({});
	});

	it('returns an empty object for an empty input', () => {
		expect(extractToolArgs({})).toEqual({});
	});

	it('preserves nested arg values verbatim', () => {
		const nestedArgs = { calendar: { id: 'primary' }, attendees: ['a', 'b'] };
		const input = { tool: 'create_event', ...nestedArgs };

		expect(extractToolArgs(input)).toEqual(nestedArgs);
	});

	it('keeps fields whose names look like metadata but are not in the dispatch set', () => {
		// Civic tools may legitimately use camelCase keys; only the literal
		// dispatch fields should be stripped.
		const input = { tool: 'foo', sessionToken: 'keep-me', toolName: 'keep-me-too' };

		expect(extractToolArgs(input)).toEqual({
			sessionToken: 'keep-me',
			toolName: 'keep-me-too',
		});
	});

	it('exports the dispatch field set for inspection', () => {
		expect(N8N_DISPATCH_FIELDS.has('tool')).toBe(true);
		expect(N8N_DISPATCH_FIELDS.has('toolCallId')).toBe(true);
		expect(N8N_DISPATCH_FIELDS.has('time_min')).toBe(false);
	});
});

describe('formatToolResult', () => {
	it('returns strings unchanged', () => {
		expect(formatToolResult('hello world')).toBe('hello world');
	});

	it('JSON-stringifies objects', () => {
		expect(formatToolResult({ a: 1, b: 'two' })).toBe('{"a":1,"b":"two"}');
	});

	it('JSON-stringifies arrays', () => {
		expect(formatToolResult([{ type: 'text', text: 'ok' }])).toBe(
			'[{"type":"text","text":"ok"}]',
		);
	});

	it('JSON-stringifies null', () => {
		expect(formatToolResult(null)).toBe('null');
	});

	it('JSON-stringifies numbers and booleans', () => {
		expect(formatToolResult(42)).toBe('42');
		expect(formatToolResult(true)).toBe('true');
	});
});
