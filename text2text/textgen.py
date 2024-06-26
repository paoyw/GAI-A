import json

from flask import Flask, request
import transformers
import torch

# Prepares the LLM model.
model_id = "meta-llama/Meta-Llama-3-8B-Instruct"
pipeline = transformers.pipeline(
    "text-generation",
    model=model_id,
    model_kwargs={"torch_dtype": torch.bfloat16},
    device_map="auto",
)

terminators = [
    pipeline.tokenizer.eos_token_id,
    pipeline.tokenizer.convert_tokens_to_ids("<|eot_id|>")
]

print("The LLM model is prepared.")

# The backend endpoints.
app = Flask(__name__)

@app.route("/textgen", methods=["POST"])
def textgen():
    request_data = request.get_json()
    messages = [
        {"role": "system",
        "content": "You are a pirate chatbot who always responds in pirate speak!"},
        {"role": "user",
        "content": request_data["content"]},
    ]
    response_data = pipeline(
        messages,
        max_new_tokens=256,
        eos_token_id=terminators,
        do_sample=True,
        temperature=0.6,
        top_p=0.9
    )
    return json.dumps(response_data)

if __name__ == '__main__':
    app.run(debug=True, threaded=True, use_reloader=False)
