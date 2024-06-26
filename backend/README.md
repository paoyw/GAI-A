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
    -d '{"content": [{"role": "system", "content": "You are a IT guy from a big company."},
        {"role": "user", "content": "Tell me fun story about a cat."}]}' \
    -X POST "http://127.0.0.1:5000/textgen"
```

- text-to-image generation.
```bash
curl \
    -H 'Content-Type: application/json' \
    -d '{"content": "Draw a cat in the Van Gogh style."}' \
    -X POST "http://127.0.0.1:5000/imggen" \
    -o image.jpg
```

- text-to-speech generation.
```bash
curl \
    -H 'Content-Type: application/json' \
    -d '{"content": "The big brown fox jumps over the lazy dog.", "embed_idx": 0}' \
    -X POST "http://127.0.0.1:5000/speechgen" \
    -o speech.wav
```