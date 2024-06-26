import torch
import transformers
from datasets import load_dataset
import soundfile as sf

pipeline = transformers.pipeline("text-to-speech", "microsoft/speecht5_tts")
embeddings_dataset = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation")

print("The text-to-speech model is ready.")
