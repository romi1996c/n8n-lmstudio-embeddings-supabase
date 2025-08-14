# n8n-nodes-lmstudio-embeddings

An n8n community node for generating embeddings using LM Studio API with encoding format selection.

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

## Features

- 🚀 **LM Studio Integration**: Connect to your local LM Studio instance or remote endpoints
- 🔗 **LangChain Powered**: Built with LangChain for robust embedding processing
- 🎯 **Model Flexibility**: Use any embeddings model supported by LM Studio
- 📊 **Processing Modes**: Single text or multiple texts processing
- 🔄 **Built-in Retry**: Automatic retry mechanism for failed requests
- ⚡ **Concurrent Processing**: Configurable concurrency for batch operations
- 🛡️ **Error Handling**: Enhanced error handling with detailed error messages
- 🔐 **Secure Authentication**: Optional API key support for secured instances

## Installation

### Community Nodes (Recommended)

1. Go to **Settings** > **Community Nodes** in your n8n instance
2. Select **Install** and enter `n8n-nodes-lmstudio-embeddings`
3. Follow the installation prompts

### Manual Installation

```bash
# In your n8n root folder
npm install n8n-nodes-lmstudio-embeddings
```

## Prerequisites

- n8n version 0.199.0 or later
- LM Studio running locally or accessible endpoint
- Compatible embeddings model loaded in LM Studio

## Configuration

### Credentials Setup

1. Create new credentials in n8n
2. Select **LM Studio API** from the credentials list
3. Configure the following:
   - **API Key**: Enter your API key (leave empty for local instances without authentication)
   - **Base URL**: Your LM Studio endpoint (default: `http://localhost:1234/v1`)

### Node Parameters

- **Model**: The embeddings model to use (e.g., `text-embedding-ada-002`, `text-embedding-3-small`)
- **Input Text**: The text to generate embeddings for
- **Processing Mode**: Choose between:
  - `Single Text`: Process one text input
  - `Multiple Texts`: Process JSON array of text inputs
- **Encoding Format**: Choose between:
  - `Float`: Returns embeddings as floating-point arrays (standard format)
  - `Base64`: Returns embeddings as base64-encoded strings (more efficient for network transfer)
- **Dimensions** (Optional): Specify the number of output dimensions
- **User ID** (Optional): Unique identifier for end-user tracking
- **Max Concurrent Calls**: Maximum concurrent requests (for multiple texts mode)
- **Max Retries**: Number of retry attempts on failure

## Usage Example

### Basic Workflow

1. Add the **LM Studio Embeddings** node to your workflow
2. Connect your credentials
3. Configure the model and input text
4. Choose your preferred encoding format
5. Execute the workflow

### Response Format

#### Single Text Mode (Float Format)
```json
{
  "model": "text-embedding-ada-002",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.0023064255, -0.009327292, ...]
    }
  ],
  "input_text": "Hello world",
  "processing_mode": "single",
  "encoding_format": "float",
  "embedding_dimensions": 1536
}
```

#### Single Text Mode (Base64 Format)
```json
{
  "model": "text-embedding-ada-002",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": "base64-encoded-string-here..."
    }
  ],
  "input_text": "Hello world",
  "processing_mode": "single",
  "encoding_format": "base64",
  "embedding_dimensions": "encoded_as_base64"
}
```

#### Multiple Texts Mode
```json
{
  "model": "text-embedding-ada-002",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.0023064255, -0.009327292, ...]
    },
    {
      "object": "embedding", 
      "index": 1,
      "embedding": [0.0156789123, -0.007845632, ...]
    }
  ],
  "input_text": ["Hello world", "Another text"],
  "processing_mode": "multiple",
  "encoding_format": "float",
  "embedding_dimensions": 1536
}
```

## Development

### Setup

```bash
git clone <your-repo-url>
cd n8n-nodes-lmstudio-embeddings
npm install
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Compatible Models

This node works with any embeddings model supported by LM Studio, including:

- OpenAI embedding models (ada-002, text-embedding-3-small, text-embedding-3-large)
- Sentence transformers models
- Custom fine-tuned embedding models

## Troubleshooting

### Common Issues

1. **Connection Failed**: Ensure LM Studio is running and accessible at the configured Base URL
2. **Model Not Found**: Verify the model name matches exactly with what's loaded in LM Studio
3. **Authentication Error**: Check if API key is required and correctly configured

### Error Messages

The node provides detailed error messages to help diagnose issues:
- HTTP status codes and responses from LM Studio API
- Invalid response format warnings
- Base64 decoding errors

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Submit a pull request

## License

MIT

## Support

- [GitHub Issues](https://github.com/yourusername/n8n-nodes-lmstudio-embeddings/issues)
- [n8n Community](https://community.n8n.io/)
- [LM Studio Documentation](https://lmstudio.ai/docs)

## Related

- [n8n](https://n8n.io/) - Workflow automation tool
- [LM Studio](https://lmstudio.ai/) - Local AI model runner
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings) - Reference API documentation