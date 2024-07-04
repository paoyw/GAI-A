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
    -X POST \
    -F "train=@[path to finetune image]" \
    -F "prompt=[prompt content]" \
    "http://127.0.0.1:5000/imggen" \
    -o archive.zip
```

- text-to-speech generation.
```bash
curl \
    -H 'Content-Type: application/json' \
    -d '{"content": "The big brown fox jumps over the lazy dog.", "embed_idx": 0}' \
    -X POST "http://127.0.0.1:5000/speechgen" \
    -o speech.wav
```

- image-to-video generation.
```bash
curl \
    -F "[prompt]=[path to the key frame]" \
    "http://127.0.0.1:5000/videogen" \
    -o video.mp4
```