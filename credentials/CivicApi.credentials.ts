import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class CivicApi implements ICredentialType {
	name = 'civicApi';

	displayName = 'Civic API';

	icon: Icon = {
		light: 'file:../icons/civic.svg',
		dark: 'file:../icons/civic.dark.svg',
	};

	documentationUrl = 'https://docs.civic.com/civic/quickstart/credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Civic bearer token. Generate one at app.civic.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.civic.com/hub',
			url: '/mcp',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
			},
			body: {
				jsonrpc: '2.0',
				method: 'initialize',
				params: {
					protocolVersion: '2024-11-05',
					capabilities: {},
					clientInfo: { name: 'n8n-nodes-civic', version: '0.1.0' },
				},
				id: 1,
			},
		},
	};
}
