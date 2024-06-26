import torch
from diffusers import StableDiffusionPipeline

from PIL import Image

# Prepares the Diffusion model.
model_id = "runwayml/stable-diffusion-v1-5"
pipe = StableDiffusionPipeline.from_pretrained(
    model_id,
    torch_dtype=torch.float16,
).to('cuda' if torch.cuda.is_available() else 'cpu')
print("The imggen model is ready.")
