import {
    IAuthenticateGeneric, ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class LMStudioApi implements ICredentialType {
	name = 'lmStudioApi';
	displayName = 'LM Studio API';
	documentationUrl = 'https://lmstudio.ai/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:1234/v1',
			description: 'Base URL for LM Studio server',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API Key for LM Studio (optional for local server)',
		},
	];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: 'Bearer {{$credentials.apiKey}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.baseUrl}}',
            url: '/models',
            method: 'GET',
        },
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'data',
                    message: 'Connection established successfully',
                    value: [],
                },
            },
        ],
    };
}