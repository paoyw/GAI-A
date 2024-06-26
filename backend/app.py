from io import BytesIO
import json

from flask import Flask, request, send_file
import torch
import soundfile as sf

import text2text
import text2img
import text2speech

app = Flask(__name__)


@app.route("/textgen", methods=["POST"])
def app_text2text():
    request_data = request.get_json()
    messages = request_data["content"]
    response_data = text2text.pipeline(
        messages,
        max_new_tokens=512,
        eos_token_id=text2text.terminators,
        do_sample=True,
        temperature=0.6,
        top_p=0.9,
    )
    return json.dumps(response_data)


@app.route("/imggen", methods=["POST"])
def app_text2img():
    request_data = request.get_json()
    image = text2img.pipeline(
        request_data["content"],
    ).images[0]
    img_io = BytesIO()
    image.save(img_io, format="JPEG")
    img_io.seek(0)
    return send_file(img_io, mimetype="image/jpeg")


@app.route("/speechgen", methods=["POST"])
def app_text2speech():
    request_data = request.get_json()
    embed_idx = request_data["embed_idx"] if "embed_idx" in request_data else 0
    speaker_embedding = torch.tensor(
        text2speech.embeddings_dataset[embed_idx]["xvector"]
    ).unsqueeze(0)
    speech = text2speech.pipeline(
        request_data["content"],
        forward_params={"speaker_embeddings": speaker_embedding},
    )
    speech_io = BytesIO()
    sf.write(speech_io, speech["audio"], speech["sampling_rate"], format="WAV")
    speech_io.seek(0)
    return send_file(speech_io, mimetype="audio/WAV")


if __name__ == "__main__":
    app.run(debug=True, threaded=True, use_reloader=False)
