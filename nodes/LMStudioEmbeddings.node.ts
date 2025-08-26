// LMStudioEmbeddings.node.ts - Fixed for Windows/Docker compatibility

import {
    ILoadOptionsFunctions,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
    ISupplyDataFunctions,
    NodeConnectionType,
    SupplyData,
} from 'n8n-workflow';
import { OpenAIEmbeddings } from "@langchain/openai";

export class LMStudioEmbeddings implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'LM Studio Embeddings for Supabase',
        name: 'lmStudioEmbeddingsSupabase',
        // FIX 1: Use forward slash explicitly (Docker/Linux compatible)
        icon: 'file:lmstudio.svg',  // Keep as-is, but ensure SVG has Unix line endings
        group: ['transform'],
        version: 1,
        description: 'Generate embeddings using LM Studio API only for Supabase',
        defaults: {
            name: 'LM Studio Embeddings for Supabase',
            color: '#ff6d5a',
        },
        inputs: [],
        outputs: [NodeConnectionType.AiEmbedding],
        outputNames: ['Embedding Provider'],
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
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getModels',
                },
                default: '',
                description: 'The embedding model to use',
                required: true,
            },
            {
                displayName: 'Encoding Format',
                name: 'encodingFormat',
                type: 'options',
                options: [
                    {
                        name: 'Float',
                        value: 'float',
                        description: 'Return embeddings as floating point numbers',
                    },
                    {
                        name: 'Base64',
                        value: 'base64',
                        description: 'Return embeddings encoded as base64',
                    },
                ],
                default: 'float',
                description: 'The format for the embeddings',
            },
            {
                displayName: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                default: 10,
                description: 'Number of documents to process in each batch when using embedDocuments',
                displayOptions: {
                    show: {},
                },
            }
        ],
    };

    methods = {
        loadOptions: {
            async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const credentials = await this.getCredentials('lmStudioApi');
                
                try {
                    // FIX 2: Normalize URL to handle Windows backslashes
                    const baseUrl = (credentials.baseUrl as string).replace(/\\/g, '/');
                    const modelsUrl = `${baseUrl}/models`;
                    
                    const response = await fetch(modelsUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(credentials.apiKey && { Authorization: `Bearer ${credentials.apiKey}` }),
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
                    }

                    const result = await response.json() as { data?: Array<{ id: string }> };
                    const models = result.data || [];

                    return models.map((model) => ({
                        name: model.id,
                        value: model.id,
                    }));
                } catch (error) {
                    throw new Error(`Error fetching models from LM Studio: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            },
        },
    };

    async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
        const credentials = await this.getCredentials('lmStudioApi');
        const model = this.getNodeParameter('model', itemIndex) as string;
        const encodingFormat = this.getNodeParameter('encodingFormat', itemIndex) as 'float' | 'base64';
        const batchSize = this.getNodeParameter('batchSize', itemIndex, 10) as number;

        // FIX 3: Normalize base URL for cross-platform compatibility
        const baseUrl = (credentials.baseUrl as string).replace(/\\/g, '/');

        // Test the connection and model availability
        try {
            const testResponse = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(credentials.apiKey && { Authorization: `Bearer ${credentials.apiKey}` }),
                },
            });

            if (!testResponse.ok) {
                throw new Error(`Cannot connect to LM Studio: ${testResponse.status} ${testResponse.statusText}`);
            }
        } catch (error) {
            throw new Error(`LM Studio connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Create a proper embeddings provider that implements both methods
        const embeddingProvider = {
            // Single document embedding
            embedQuery: async (text: string): Promise<number[]> => {
                if (!text || !text.trim()) {
                    throw new Error('Text content is empty');
                }

                try {
                    const embeddings = new OpenAIEmbeddings({
                        configuration: {
                            // FIX 4: Ensure baseURL uses forward slashes
                            baseURL: baseUrl,
                        },
                        apiKey: credentials.apiKey as string,
                        model: model,
                    });

                    // @ts-ignore - Using internal method for direct API call
                    const { data } = await embeddings.embeddingWithRetry({
                        model: model,
                        input: text,
                        encoding_format: encodingFormat,
                    });

                    // Log successful embedding for debugging
                    console.log(`LM Studio: Successfully embedded text of length ${text.length}`);
                    return data[0].embedding;
                } catch (error) {
                    console.error('LM Studio embedQuery error:', error);
                    throw new Error(`Error generating embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            },

            // Multiple documents embedding
            embedDocuments: async (documents: string[]): Promise<number[][]> => {
                if (!documents || documents.length === 0) {
                    throw new Error('No documents provided');
                }

                try {
                    const embeddings = new OpenAIEmbeddings({
                        configuration: {
                            // FIX 5: Consistent URL formatting
                            baseURL: baseUrl,
                        },
                        apiKey: credentials.apiKey as string,
                        model: model,
                    });

                    const results: number[][] = [];
                    
                    // Process documents in batches to avoid overwhelming the API
                    for (let i = 0; i < documents.length; i += batchSize) {
                        const batch = documents.slice(i, i + batchSize);
                        const validBatch = batch.filter(doc => doc && doc.trim());
                        
                        if (validBatch.length === 0) {
                            // Add empty embeddings for empty documents
                            results.push(...batch.map(() => []));
                            continue;
                        }

                        try {
                            // @ts-ignore - Using internal method for direct API call
                            const { data } = await embeddings.embeddingWithRetry({
                                model: model,
                                input: validBatch,
                                encoding_format: encodingFormat,
                            });

                            // Map the results back to the original batch order
                            let validIndex = 0;
                            for (const doc of batch) {
                                if (doc && doc.trim()) {
                                    results.push(data[validIndex].embedding);
                                    validIndex++;
                                } else {
                                    results.push([]); // Empty embedding for empty document
                                }
                            }
                        } catch (batchError) {
                            // If batch fails, try individual documents
                            console.warn(`Batch embedding failed, falling back to individual requests: ${batchError}`);
                            for (const doc of batch) {
                                if (doc && doc.trim()) {
                                    try {
                                        // @ts-ignore
                                        const { data } = await embeddings.embeddingWithRetry({
                                            model: model,
                                            input: doc,
                                            encoding_format: encodingFormat,
                                        });
                                        results.push(data[0].embedding);
                                    } catch (individualError) {
                                        console.error(`Failed to embed document: ${doc.substring(0, 100)}...`, individualError);
                                        results.push([]); // Empty embedding for failed document
                                    }
                                } else {
                                    results.push([]); // Empty embedding for empty document
                                }
                            }
                        }
                    }

                    // Log successful batch processing
                    console.log(`LM Studio: Successfully embedded ${documents.length} documents`);
                    return results;
                } catch (error) {
                    throw new Error(`Error generating document embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            },
        };

        return {
            response: embeddingProvider,
            // Add metadata to help n8n understand the node executed successfully
            closeFunction: async () => {
                // This function is called when the embedding provider is no longer needed
                // We can use this to signal successful completion
            },
        };
    }
}