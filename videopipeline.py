import os
from omegaconf import OmegaConf
from tqdm import tqdm
from einops import rearrange, repeat
from collections import OrderedDict

import torch
import torchvision
import torchvision.transforms as transforms
from PIL import Image
from lvdm.models.samplers.ddim import DDIMSampler
from lvdm.models.samplers.ddim_multiplecond import DDIMSampler as DDIMSampler_multicond
from utils.utils import instantiate_from_config

from typing import List, NamedTuple
from tqdm import tqdm
from audiocraft.models import MusicGen
from audiocraft.data.audio_utils import normalize_audio

class Args(NamedTuple):
    savedir:str='results/dynamicrafter_256_seed123'
    ckpt_path:str='checkpoints/dynamicrafter_256_v1/model.ckpt'
    config:str='configs/inference_256_v1.0.yaml'
    prompt_dir:str='prompts/test'
    n_samples:int=1
    ddim_steps:int=50
    ddim_eta:float=1.0
    bs:int=1
    height:int=256
    width:int=256
    frame_stride:int=3
    unconditional_guidance_scale:float=7.5
    seed:int=123
    video_length:int=32
    negative_prompt:bool=False
    text_input:bool=True
    multiple_cond_cfg:bool=False
    cfg_img:float=None
    timestep_spacing:str="uniform"
    guidance_rescale:float=0.0
    perframe_ae:bool=False
    
    loop:bool=False
    interp:bool=False

transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.5, 0.5, 0.5), std=(0.5, 0.5, 0.5))])

def load_img(img_path):
    image = Image.open(img_path).convert('RGB')
    image_tensor = transform(image).unsqueeze(1)
    frame_tensor = repeat(image_tensor, 'c t h w -> c (repeat t) h w', repeat=32)
    return frame_tensor

def load_model_checkpoint(model, ckpt):
    state_dict = torch.load(ckpt, map_location="cpu")
    if "state_dict" in list(state_dict.keys()):
        state_dict = state_dict["state_dict"]
        try:
            model.load_state_dict(state_dict, strict=True)
        except:
            ## rename the keys for 256x256 model
            new_pl_sd = OrderedDict()
            for k,v in state_dict.items():
                new_pl_sd[k] = v

            for k in list(new_pl_sd.keys()):
                if "framestride_embed" in k:
                    new_key = k.replace("framestride_embed", "fps_embedding")
                    new_pl_sd[new_key] = new_pl_sd[k]
                    del new_pl_sd[k]
            model.load_state_dict(new_pl_sd, strict=True)
    else:
        # deepspeed
        new_pl_sd = OrderedDict()
        for key in state_dict['module'].keys():
            new_pl_sd[key[16:]]=state_dict['module'][key]
        model.load_state_dict(new_pl_sd)
    print('>>> model checkpoint loaded.')
    return model

def get_latent_z(model, videos):
    b, c, t, h, w = videos.shape
    x = rearrange(videos, 'b c t h w -> (b t) c h w')
    z = model.encode_first_stage(x)
    z = rearrange(z, '(b t) c h w -> b c t h w', b=b, t=t)
    return z

def image_guided_synthesis(model, prompts, videos, noise_shape, n_samples=1, ddim_steps=50, ddim_eta=1., \
                        unconditional_guidance_scale=1.0, cfg_img=None, fs=None, text_input=False, multiple_cond_cfg=False, loop=False, interp=False, timestep_spacing='uniform', guidance_rescale=0.0, **kwargs):
    ddim_sampler = DDIMSampler(model) if not multiple_cond_cfg else DDIMSampler_multicond(model)
    batch_size = noise_shape[0]
    fs = torch.tensor([fs] * batch_size, dtype=torch.long, device=model.device)

    if not text_input:
        prompts = [""]*batch_size

    img = videos[:,:,0] #bchw
    img_emb = model.embedder(img) ## blc
    img_emb = model.image_proj_model(img_emb)

    cond_emb = model.get_learned_conditioning(prompts)
    cond = {"c_crossattn": [torch.cat([cond_emb,img_emb], dim=1)]}
    if model.model.conditioning_key == 'hybrid':
        z = get_latent_z(model, videos) # b c t h w
        if loop or interp:
            img_cat_cond = torch.zeros_like(z)
            img_cat_cond[:,:,0,:,:] = z[:,:,0,:,:]
            img_cat_cond[:,:,-1,:,:] = z[:,:,-1,:,:]
        else:
            img_cat_cond = z[:,:,:1,:,:]
            img_cat_cond = repeat(img_cat_cond, 'b c t h w -> b c (repeat t) h w', repeat=z.shape[2])
        cond["c_concat"] = [img_cat_cond] # b c 1 h w
    
    if unconditional_guidance_scale != 1.0:
        if model.uncond_type == "empty_seq":
            prompts = batch_size * [""]
            uc_emb = model.get_learned_conditioning(prompts)
        elif model.uncond_type == "zero_embed":
            uc_emb = torch.zeros_like(cond_emb)
        uc_img_emb = model.embedder(torch.zeros_like(img)) ## b l c
        uc_img_emb = model.image_proj_model(uc_img_emb)
        uc = {"c_crossattn": [torch.cat([uc_emb,uc_img_emb],dim=1)]}
        if model.model.conditioning_key == 'hybrid':
            uc["c_concat"] = [img_cat_cond]
    else:
        uc = None

    ## we need one more unconditioning image=yes, text=""
    if multiple_cond_cfg and cfg_img != 1.0:
        uc_2 = {"c_crossattn": [torch.cat([uc_emb,img_emb],dim=1)]}
        if model.model.conditioning_key == 'hybrid':
            uc_2["c_concat"] = [img_cat_cond]
        kwargs.update({"unconditional_conditioning_img_nonetext": uc_2})
    else:
        kwargs.update({"unconditional_conditioning_img_nonetext": None})

    z0 = None
    cond_mask = None

    batch_variants = []
    for _ in range(n_samples):

        if z0 is not None:
            cond_z0 = z0.clone()
            kwargs.update({"clean_cond": True})
        else:
            cond_z0 = None
        if ddim_sampler is not None:

            samples, _ = ddim_sampler.sample(S=ddim_steps,
                                            conditioning=cond,
                                            batch_size=batch_size,
                                            shape=noise_shape[1:],
                                            verbose=False,
                                            unconditional_guidance_scale=unconditional_guidance_scale,
                                            unconditional_conditioning=uc,
                                            eta=ddim_eta,
                                            cfg_img=cfg_img, 
                                            mask=cond_mask,
                                            x0=cond_z0,
                                            fs=fs,
                                            timestep_spacing=timestep_spacing,
                                            guidance_rescale=guidance_rescale,
                                            **kwargs
                                            )

        ## reconstruct from latent to pixel space
        batch_images = model.decode_first_stage(samples)
        batch_variants.append(batch_images)
    ## variants, batch, c, t, h, w
    batch_variants = torch.stack(batch_variants)
    return batch_variants.permute(1, 0, 2, 3, 4, 5)


@torch.no_grad()
def inference_by_imgs(
    args: Args,
    imgs:List[str],
    prompts:List[str],
    audio_prompt:str='energetic EDM'
):
    # load images
    videos = [load_img(img) for img in imgs]
    
    ## model config
    config = OmegaConf.load(args.config)
    model_config = config.pop("model", OmegaConf.create())

    ## set use_checkpoint as False as when using deepspeed, it encounters an error "deepspeed backend not set"
    model_config['params']['unet_config']['params']['use_checkpoint'] = False
    model = instantiate_from_config(model_config)
    model = model.to(torch.float16).cuda()
    model.perframe_ae = args.perframe_ae
    assert os.path.exists(args.ckpt_path), "Error: checkpoint Not Found!"
    model = load_model_checkpoint(model, args.ckpt_path)
    model.eval()
    
    ## latent noise shape
    h, w = args.height // 8, args.width // 8
    channels = model.model.diffusion_model.out_channels
    n_frames = args.video_length
    print(f'Inference with {n_frames} frames')
    noise_shape = [args.bs, channels, n_frames, h, w]
    
    frames = []
    with torch.cuda.amp.autocast():
        for prompt, video in tqdm(zip(prompts, videos)):
            video = video.unsqueeze(0).to(torch.float16).cuda()
            prompt = [prompt]
            batch_sampler = image_guided_synthesis(model, prompt, video, noise_shape, args.n_samples, args.ddim_steps, args.ddim_eta, \
                                args.unconditional_guidance_scale, args.cfg_img, args.frame_stride, args.text_input, args.multiple_cond_cfg, args.loop, args.interp, args.timestep_spacing, args.guidance_rescale)
            frames.append(batch_sampler.squeeze().cpu())

    # list[tensor] -> tensor    
    video = torch.concat(frames, dim=1)
    video = torch.clamp(video.float(), -1., 1.)
    video = (video + 1.0) / 2.0
    video = (video * 255).to(torch.uint8).permute(1,2,3,0) #thwc
    
    video_time = len(video) / 8
    
    aud_model = MusicGen.get_pretrained('facebook/musicgen-melody')
    aud_model.set_generation_params(duration=video_time)
    wav = aud_model.generate([audio_prompt])
    wav = wav.squeeze(0).cpu()
    norm_wav = normalize_audio(
        wav=wav,
        normalize=True,
        strategy='loudness',
        peak_clip_headroom_db=1,
        rms_headroom_db=18,
        loudness_headroom_db=14,
        loudness_compressor=True,
        log_clipping=True,
        sample_rate=aud_model.sample_rate,
        stem_name='testout')
    
    torchvision.io.write_video('testout_aud.mp4', video, fps=8, video_codec='h264', options={'crf': '10'},
                           audio_array=norm_wav, audio_fps=aud_model.sample_rate, audio_codec='aac')
    