import os
from io import BytesIO
import json

from flask import Flask, request, send_file
import torch
import soundfile as sf
from PIL import Image
import pandas as pd
import shutil

app = Flask(__name__)


@app.route("/textgen", methods=["POST"])
def app_text2text():
    import text2text

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
    torch.cuda.empty_cache()

    return json.dumps(response_data)


@app.route("/imggen", methods=["POST"])
def app_text2img():
    import text2img

    prompts = list(k for k, v in request.files.items() if "null" == v.filename)
    train_images = list(
        Image.open(v).convert("RGB")
        for k, v in request.files.items()
        if "null" != v.filename
    )

    inference_images, inference_prompts = text2img.text2image(
        prompts=prompts,
        train_images=train_images,
        product_name="<PRODUCT>",
        do_train=False,
    )
    torch.cuda.empty_cache()

    if os.path.exists("cache/img/"):
        os.system("rm -r cache/img/")
    os.makedirs("cache/img/", exist_ok=True)

    df = {"prompt": [], "filename": []}
    for i, (inference_image, prompt) in enumerate(
        zip(inference_images, inference_prompts)
    ):
        inference_image.save(f"cache/img/{i}.jpg")
        df["prompt"].append(prompt)
        df["filename"].append(os.path.join("img", f"{i}.jpg"))
    pd.DataFrame(df).to_csv("cache/img/img.csv")

    shutil.make_archive("cache/archive", "zip", "cache/img/")
    return send_file("cache/archive.zip", mimetype="application/zip")


@app.route("/speechgen", methods=["POST"])
def app_text2speech():
    import text2speech

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


@app.route("/videogen", methods=["POST"])
def app_img2video():
    text_img_pair = []
    for k, v in request.files.items():
        print(k, v)
        print(type(v))
        Image.open(v)
    return ""
    # return send_file(video, mimetype="video/mp4")


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, threaded=True, use_reloader=False)
