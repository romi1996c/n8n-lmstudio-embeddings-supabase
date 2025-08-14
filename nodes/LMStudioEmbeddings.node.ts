import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';
import { OpenAIEmbeddings } from '@langchain/openai';

export class LMStudioEmbeddings implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'LM Studio Embeddings',
        name: 'lmStudioEmbeddings',
        icon: 'file:lmstudio.svg',
        group: ['ai'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Generate embeddings using LM Studio API with encoding format selection via LangChain',
        defaults: {
            name: 'LM Studio Embeddings',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'lmStudioApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Model',
                name: 'model',
                type: 'string',
                default: 'text-embedding-ada-002',
                description: 'The model to use for generating embeddings',
                placeholder: 'e.g. text-embedding-ada-002, text-embedding-3-small',
            },
            {
                displayName: 'Input Text',
                name: 'input',
                type: 'string',
                default: '',
                required: true,
                description: 'The text to generate embeddings for',
                typeOptions: {
                    rows: 4,
                },
            },
            {
                displayName: 'Processing Mode',
                name: 'processingMode',
                type: 'options',
                options: [
                    {
                        name: 'Single Text',
                        value: 'single',
                        description: 'Process single input text',
                    },
                    {
                        name: 'Multiple Texts',
                        value: 'multiple',
                        description: 'Process array of input texts',
                    },
                ],
                default: 'single',
                description: 'Choose how to process the input',
            },
            {
                displayName: 'Encoding Format',
                name: 'encodingFormat',
                type: 'options',
                options: [
                    {
                        name: 'Float',
                        value: 'float',
                        description: 'Return embeddings as floating-point numbers (default)',
                    },
                    {
                        name: 'Base64',
                        value: 'base64',
                        description: 'Return embeddings as base64-encoded string (more efficient)',
                    },
                ],
                default: 'float',
                description: 'The format to return the embeddings in',
            },
            {
                displayName: 'Dimensions',
                name: 'dimensions',
                type: 'number',
                default: '',
                description: 'The number of dimensions the resulting output embeddings should have (optional)',
                placeholder: 'e.g. 1536',
            },
            {
                displayName: 'User ID',
                name: 'user',
                type: 'string',
                default: '',
                description: 'A unique identifier representing your end-user (optional)',
            },
            {
                displayName: 'Max Concurrent Calls',
                name: 'maxConcurrency',
                type: 'number',
                default: 2,
                description: 'Maximum number of concurrent embedding requests',
                displayOptions: {
                    show: {
                        processingMode: ['multiple'],
                    },
                },
            },
            {
                displayName: 'Max Retries',
                name: 'maxRetries',
                type: 'number',
                default: 2,
                description: 'Maximum number of retries on failure',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = await this.getCredentials('lmStudioApi');

        for (let i = 0; i < items.length; i++) {
            try {
                const model = this.getNodeParameter('model', i) as string;
                const input = this.getNodeParameter('input', i) as string;
                const processingMode = this.getNodeParameter('processingMode', i) as 'single' | 'multiple';
                const encodingFormat = this.getNodeParameter('encodingFormat', i) as 'float' | 'base64';
                const dimensions = this.getNodeParameter('dimensions', i) as number;
                const user = this.getNodeParameter('user', i) as string;
                const maxConcurrency = this.getNodeParameter('maxConcurrency', i) as number;
                const maxRetries = this.getNodeParameter('maxRetries', i) as number;

                if (!input || input.trim().length === 0) {
                    throw new NodeOperationError(this.getNode(), 'Input text is required', {
                        itemIndex: i,
                    });
                }

                // Configure OpenAI embeddings with LM Studio endpoint
                const embeddings = new OpenAIEmbeddings({
                    openAIApiKey: credentials.apiKey as string || 'dummy-key',
                    modelName: model,
                    maxConcurrency,
                    maxRetries,
                    configuration: {
                        baseURL: `${credentials.baseUrl}`,
                    },
                    // Add dimensions if specified
                    ...(dimensions && { dimensions }),
                });

                // Override the embedQuery and embedDocuments methods to pass encoding_format

                embeddings.embedQuery = async (document: string) => {
                    const response = await (embeddings as any).embeddingWithRetry({
                        input: document,
                        model: model,
                        encoding_format: encodingFormat,
                        ...(dimensions && { dimensions }),
                        ...(user && { user }),
                    });
                    return response.data[0].embedding;
                };

                embeddings.embedDocuments = async (documents: string[]) => {
                    const response = await (embeddings as any).embeddingWithRetry({
                        input: documents,
                        model: model,
                        encoding_format: encodingFormat,
                        ...(dimensions && { dimensions }),
                        ...(user && { user }),
                    });
                    return response.data.map((item: any) => item.embedding);
                };

                let result: number[] | number[][];
                let inputTexts: string | string[];

                if (processingMode === 'multiple') {
                    // Try to parse input as JSON array, fallback to single string
                    try {
                        inputTexts = JSON.parse(input);
                        if (!Array.isArray(inputTexts)) {
                            throw new Error('Input is not an array');
                        }
                    } catch {
                        inputTexts = [input.trim()];
                    }
                    
                    // Process multiple texts
                    result = await embeddings.embedDocuments(inputTexts as string[]);
                } else {
                    // Process single text
                    inputTexts = input.trim();
                    result = await embeddings.embedQuery(inputTexts);
                }

                // LM Studio returns data in the format specified by encoding_format
                // For base64: string, for float: number[]
                let processedData;
                if (Array.isArray(result)) {
                    // Multiple embeddings
                    processedData = (result as any[]).map((embedding, index) => ({
                        object: 'embedding',
                        index,
                        embedding, // Will be number[] or string depending on encoding_format
                    }));
                } else {
                    // Single embedding  
                    processedData = [{
                        object: 'embedding',
                        index: 0,
                        embedding: result, // Will be number[] or string depending on encoding_format
                    }];
                }

                // Calculate dimensions based on format
                let embeddingDimensions: number | string = 'unknown';
                if (encodingFormat === 'float') {
                    if (Array.isArray(result) && result.length > 0) {
                        // Multiple embeddings case
                        const firstEmbedding = result[0];
                        embeddingDimensions = Array.isArray(firstEmbedding) ? firstEmbedding.length : 'unknown';
                    } else if (Array.isArray(result)) {
                        // Single embedding case
                        embeddingDimensions = result.length;
                    }
                } else {
                    // For base64, we can't determine dimensions without decoding
                    embeddingDimensions = 'encoded_as_base64';
                }

                // Create response in format similar to OpenAI API
                const executionData: INodeExecutionData = {
                    json: {
                        model,
                        data: processedData,
                        input_text: inputTexts,
                        processing_mode: processingMode,
                        encoding_format: encodingFormat,
                        embedding_dimensions: embeddingDimensions,
                    },
                };

                returnData.push(executionData);
            } catch (error: any) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error?.message || 'Unknown error',
                            error_type: error?.constructor?.name || 'Error',
                        },
                        pairedItem: {
                            item: i,
                        },
                    });
                } else {
                    // Enhanced error handling for LangChain errors
                    let errorMessage = 'LM Studio API error';
                    
                    if (error?.message) {
                        errorMessage = error.message;
                    }
                    
                    if (error?.response?.data) {
                        errorMessage += `: ${error.response.data?.error?.message || error.response.statusText}`;
                    }
                    
                    throw new NodeOperationError(this.getNode(), errorMessage, {
                        itemIndex: i,
                    });
                }
            }
        }

        return [returnData];
    }
}

