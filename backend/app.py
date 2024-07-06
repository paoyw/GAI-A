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
@torch.no_grad()
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
    prompts = list(request.form.values())
    train_images = list(
        Image.open(v).convert("RGB") for k, v in request.files.items() if k == "train"
    )
    print(prompts, train_images)

    import text2img
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
    print(inference_images, inference_prompts, prompts)
    for i, (inference_image, prompt) in enumerate(
        zip(inference_images, prompts)
    ):
        inference_image.save(f"cache/img/{i}.jpg")
        df["prompt"].append(prompt)
        df["filename"].append(f"{i}.jpg")
    pd.DataFrame(df).to_csv("cache/img/img.csv", index=False)

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
    imgs = []
    descriptions = []
    for k, v in request.files.items():
        descriptions.append(k)
        imgs.append(Image.open(v).convert("RGB"))
    print(imgs, descriptions)

    os.makedirs("cache/", exist_ok=True)
    import img2video

    img2video.inference_by_imgs(
        imgs=imgs,
        descriptions=descriptions,
        save_path="cache/video.mp4",
    )
    torch.cuda.empty_cache()
    return send_file("cache/video.mp4", mimetype="video/mp4")


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, threaded=True, use_reloader=False)
