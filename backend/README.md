# The backend of the text generation.

## Starts the server
```bash
python app.py
```

## API Examples
- text-to-text generation.
```bash
curl \
    -H 'Content-Type: application/json' \
    -d '{"content": "Tell me a story about a cat in the boots."}' \
    -X POST "http://127.0.0.1:5000/textgen"
```

- text-to-image generation.
```bash
curl \
    -H 'Content-Type: application/json' \
    -d '{"content": "Draw a cat in the Van Gogh style."}' \
    -X POST "http://127.0.0.1:5000/imggen"
```
