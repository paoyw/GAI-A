from io import BytesIO
import json

from flask import Flask, request, send_file

import text2text
import text2img

app = Flask(__name__)

@app.route("/textgen", methods=["POST"])
def app_text2text():
    request_data = request.get_json()
    messages = [
        {"role": "system",
        "content": "You are a pirate chatbot who always responds in pirate speak!"},
        {"role": "user",
        "content": request_data["content"]},
    ]
    response_data = text2text.pipeline(
        messages,
        max_new_tokens=512,
        eos_token_id=text2text.terminators,
        do_sample=True,
        temperature=0.6,
        top_p=0.9
    )
    return json.dumps(response_data)

@app.route("/imggen", methods=["POST"])
def app_text2img():
    request_data = request.get_json()
    image = text2img.pipe(
        request_data["content"],
    ).images[0]
    img_io = BytesIO()
    image.save(img_io, format='JPEG')
    img_io.seek(0)
    return send_file(img_io, mimetype="image/jpeg")

if __name__ == '__main__':
    app.run(debug=True, threaded=True, use_reloader=False)