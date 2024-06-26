# The backend of the text generation.

## Starts the server
```bash
python textgen.py
```
- Using `meta-llama/Meta-Llama-3-8B-Instruct` as the LLM.

## Prompt example
```bash
curl \
    -H 'Content-Type: application/json' \
    -d '{"content": "Tell me a story about a cat in the boots."}' \
    -X POST "http://127.0.0.1:5000/textgen"
```
