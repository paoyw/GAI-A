import argparse
import logging
import math
import os
import random
import glob
import shutil
from pathlib import Path
import numpy as np
import torch
import torch.nn.functional as F
import torch.utils.checkpoint
import transformers
from PIL import Image
from torchvision import transforms
from torchvision.utils import save_image
from tqdm.auto import tqdm
from peft import LoraConfig
from peft.utils import get_peft_model_state_dict
from transformers import AutoProcessor, AutoModel, CLIPTextModel, CLIPTokenizer

import diffusers
from diffusers import StableDiffusionXLPipeline, AutoencoderKL, DDPMScheduler, DiffusionPipeline, StableDiffusionPipeline, UNet2DConditionModel, AutoPipelineForText2Image
from diffusers.optimization import get_scheduler
from diffusers.utils import convert_state_dict_to_diffusers
from diffusers.training_utils import compute_snr
from diffusers.utils.torch_utils import is_compiled_module
from deepface import DeepFace
import cv2
import argparse

from PIL import Image

# Prepares the Diffusion model.
DEVICE = "cuda"
IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".PNG", ".JPG", ".JPEG", ".WEBP", ".BMP"]

class Text2ImageDataset(torch.utils.data.Dataset):
    def __init__(self, images, product_name, transform, tokenizer):
        self.images = images
        captions = [product_name] * len(self.images)
        inputs = tokenizer(
            captions, max_length=tokenizer.model_max_length, padding="max_length", truncation=True, return_tensors="pt"
        )
        self.input_ids = inputs.input_ids
        self.transform = transform

    def __getitem__(self, idx):
        image = self.images[idx]
        input_id = self.input_ids[idx]
        tensor = self.transform(image)
        return tensor, input_id

    def __len__(self):
        return len(self.images)

def prepare_pipeline(
        pretrained_model_name_or_path="digiplay/Photon_v1", 
        lora_id="martintmv/advertisement-photography-SD1.5-LoRA", 
        weight_dtype=torch.bfloat16, 
):
    pipeline = AutoPipelineForText2Image.from_pretrained(
        pretrained_model_name_or_path,
        torch_dtype=weight_dtype,
    ).to("cuda" if torch.cuda.is_available() else "cpu")
    pipeline.load_lora_weights(
        lora_id, 
        weight_name="pytorch_lora_weights.safetensors", 
    )
    print("The text-to-image model is ready.")
    return pipeline

def prepare_optimizer(
        pipeline, 
        pretrained_model_name_or_path="digiplay/Photon_v1", 
        learning_rate=1e-4, 
        lr_scheduler_name="cosine_with_restarts", 
        lr_warmup_steps=100, 
        max_train_steps=1000, 
        weight_dtype=torch.bfloat16, 
):
    noise_scheduler = DDPMScheduler.from_pretrained(pretrained_model_name_or_path, subfolder="scheduler")
    tokenizer = pipeline.tokenizer
    text_encoder = pipeline.text_encoder
    unet = pipeline.unet
    vae = pipeline.vae
    text_encoder.requires_grad_(False)
    vae.requires_grad_(False)
    for name, param in unet.named_parameters():
        if "lora" in name:
            param.requires_grad_(True)
        else:
            param.requires_grad_(False)
    unet.to(DEVICE, dtype=weight_dtype)
    vae.to(DEVICE, dtype=weight_dtype)
    text_encoder.to(DEVICE, dtype=weight_dtype)

    unet_lora_layers = list(filter(lambda p: p.requires_grad, unet.parameters()))
    trainable_params = [
        {"params": unet_lora_layers, "lr": learning_rate},
    ]
    optimizer = torch.optim.AdamW(
        trainable_params,
        lr=learning_rate,
    )
    lr_scheduler = get_scheduler(
        lr_scheduler_name,
        optimizer=optimizer,
        num_warmup_steps=lr_warmup_steps,
        num_training_steps=max_train_steps,
        num_cycles=3
    )
    return optimizer, lr_scheduler, noise_scheduler

def prepare_dataloader(
        images, 
        tokenizer, 
        train_batch_size=2, 
        resolution=512, 
        product_name="An air fryer.", 
):
    def collate_fn(examples):
        pixel_values = []
        input_ids = []
        for tensor, input_id in examples:
            pixel_values.append(tensor)
            input_ids.append(input_id)
        pixel_values = torch.stack(pixel_values, dim=0).float()
        input_ids = torch.stack(input_ids, dim=0)
        return {"pixel_values": pixel_values, "input_ids": input_ids}

    train_transform = transforms.Compose(
        [
            transforms.Resize(resolution, interpolation=transforms.InterpolationMode.BILINEAR),
            transforms.CenterCrop(resolution),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.5], [0.5]),
        ]
    )
    dataset = Text2ImageDataset(
        images=images,
        transform=train_transform,
        tokenizer=tokenizer,
        product_name=product_name, 
    )
    train_dataloader = torch.utils.data.DataLoader(
        dataset,
        shuffle=True,
        collate_fn=collate_fn,
        batch_size=train_batch_size,
        num_workers=8,
    )
    return train_dataloader

def train(
        pipeline, 
        train_images, 
        product_name="An air fryer.", 
        max_train_steps=1000, 
        train_batch_size=2, 
        weight_dtype=torch.bfloat16, 
        learning_rate=1e-4, 
        lr_scheduler_name="cosine_with_restarts", 
        lr_warmup_steps=100, 
        validation_step_ratio=0.2, 
        output_folder="logs/test", 
):
    optimizer, lr_scheduler, noise_scheduler = prepare_optimizer(
        pipeline, 
        learning_rate=learning_rate, 
        lr_scheduler_name=lr_scheduler_name, 
        lr_warmup_steps=lr_warmup_steps, 
        max_train_steps=max_train_steps, 
    )
    tokenizer = pipeline.tokenizer
    text_encoder = pipeline.text_encoder
    unet = pipeline.unet
    vae = pipeline.vae
    snr_gamma = 5
    train_dataloader = prepare_dataloader(
        train_images, 
        tokenizer, 
        train_batch_size=train_batch_size, 
        product_name=product_name, 
    )
    init_image = train_images[0]
    save_path = os.path.join(output_folder, f"checkpoint-0")
    os.makedirs(save_path, exist_ok=True)
    for i, prompt in enumerate(prompts):
        image = pipeline(prompt, init_image=init_image).images[0]
        image.save(f"{save_path}/test_0_{i}.png")
        init_image = image
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    torch.backends.cuda.enable_mem_efficient_sdp(False)
    torch.backends.cuda.enable_flash_sdp(False)
    progress_bar = tqdm(
        range(0, max_train_steps),
        initial=0,
        desc="Steps",
    )
    global_step = 0
    num_epochs = math.ceil(max_train_steps / len(train_dataloader))
    validation_step = int(max_train_steps * validation_step_ratio)
    for epoch in range(num_epochs):
        unet.train()
        for step, batch in enumerate(train_dataloader):
            if global_step >= max_train_steps:
                break
            latents = vae.encode(batch["pixel_values"].to(DEVICE, dtype=weight_dtype)).latent_dist.sample()
            latents = latents * vae.config.scaling_factor
            # Sample noise that we'll add to the latents
            noise = torch.randn_like(latents)
            bsz = latents.shape[0]
            timesteps = torch.randint(0, noise_scheduler.config.num_train_timesteps, (bsz,), device=latents.device)
            timesteps = timesteps.long()
            noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)

            # Get the text embedding for conditioning
            encoder_hidden_states = text_encoder(batch["input_ids"].to(latents.device), return_dict=False)[0]
            if noise_scheduler.config.prediction_type == "epsilon":
                target = noise
            elif noise_scheduler.config.prediction_type == "v_prediction":
                target = noise_scheduler.get_velocity(latents, noise, timesteps)
            model_pred = unet(
                sample=noisy_latents, 
                timestep=timesteps, 
                encoder_hidden_states=encoder_hidden_states, 
                return_dict=False, 
            )[0]
            if not snr_gamma:
                loss = F.mse_loss(model_pred.float(), target.float(), reduction="mean")
            else:
                snr = compute_snr(noise_scheduler, timesteps)
                mse_loss_weights = torch.stack([snr, snr_gamma * torch.ones_like(timesteps)], dim=1).min(
                    dim=1
                )[0]
                if noise_scheduler.config.prediction_type == "epsilon":
                    mse_loss_weights = mse_loss_weights / snr
                elif noise_scheduler.config.prediction_type == "v_prediction":
                    mse_loss_weights = mse_loss_weights / (snr + 1)

                loss = F.mse_loss(model_pred.float(), target.float(), reduction="none")
                loss = loss.mean(dim=list(range(1, len(loss.shape)))) * mse_loss_weights
                loss = loss.mean()

            loss.backward()
            optimizer.step()
            lr_scheduler.step()
            optimizer.zero_grad()
            progress_bar.update(1)
            global_step += 1
            if global_step % validation_step == 0 or global_step == max_train_steps:
                init_image = Image.open("images/airfryer-3.png").convert("RGB")
                save_path = os.path.join(output_folder, f"checkpoint-{global_step}")
                os.makedirs(save_path, exist_ok=True)
                for i, prompt in enumerate(prompts):
                    image = pipeline(prompt, init_image=init_image).images[0]
                    image.save(f"{save_path}/test_{global_step}_{i}.png")
                    init_image = image
                unet_path = os.path.join(save_path, "unet.pt")
                torch.save(unet, unet_path)

# main function
def text2image(
        prompts=[], 
        train_images=[], 
        product_name="An air fryer.", 
        do_train=False, 
        pretrained_model_name_or_path="digiplay/Photon_v1", 
        lora_id="martintmv/advertisement-photography-SD1.5-LoRA", 
        weight_dtype=torch.bfloat16, 
        output_folder="logs/test/", 
        learning_rate=1e-4, 
        max_train_steps=1000, 
):
    pipeline = prepare_pipeline(
        pretrained_model_name_or_path=pretrained_model_name_or_path, 
        lora_id=lora_id, 
        weight_dtype=weight_dtype, 
    )
    if do_train:
        train(
            pipeline=pipeline, 
            train_images=train_images, 
            product_name=product_name, 
            output_folder=output_folder, 
            max_train_steps=max_train_steps, 
            learning_rate=learning_rate,    
        )
    init_image = train_images[0]
    images = []
    for i, prompt in enumerate(prompts):
        image = pipeline(prompt, init_image=init_image).images[0]
        init_image = image
        images.append(image)
    return images, prompts

if __name__ == "__main__":
    image_paths = []
    for ext in IMAGE_EXTENSIONS:
        image_paths.extend(glob.glob(f"images/*{ext}"))
    image_paths = sorted(image_paths)
    images = [Image.open(img_path).convert("RGB") for img_path in image_paths]
    prompts = [
        "a sleek, modern air fryer on a kitchen counter", 
        "a hand opens the air fryer", 
        "Fresh vegetables and chicken pieces are placed into the air fryer basket", 
        "The air fryer basket is pulled out, revealing perfectly cooked, crispy food", 
        "Golden, crispy chicken wings being taken out of the air fryer", 
        "Family enjoying the meal", 
    ]
    output_folder = "logs/test"
    learning_rate = 5e-4
    max_train_steps = 1000
    inference_images, prompts = text2image(
        prompts=prompts, 
        train_images=images, 
        product_name="An air fryer.", 
        do_train=True, 
        learning_rate=learning_rate, 
        output_folder=output_folder, 
        max_train_steps=max_train_steps, 
    )
    os.makedirs(output_folder, exist_ok=True)
    for i, img in enumerate(inference_images):
        img.save(f"{output_folder}/inference_{i}.png")
