import torch
import torchvision
import os


from PIL.Image import Image
from typing import List
from omegaconf import OmegaConf
from tqdm import tqdm
from audiocraft.models import MusicGen
from audiocraft.data.audio_utils import normalize_audio

from Dynamicrafter.videopipeline import Args, load_model_checkpoint, image_guided_synthesis, img2video
from Dynamicrafter.utils.utils import instantiate_from_config

args = Args(
    ckpt_path='/tmp2/DynamiCrafter_checkpoints/dynamicrafter_256_v1/model.ckpt',
    config='./Dynamicrafter/configs/inference_256_v1.0.yaml',
)


@torch.no_grad()
def inference_by_imgs(
    imgs:List[Image],
    descriptions:List[str],
    audio_prompt:str='energetic EDM',
    args:Args=args,
    save_path='testout_aud.mp4',
):
    # load images
    videos = [img2video(img) for img in imgs]
    
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
        for prompt, video in tqdm(zip(descriptions, videos)):
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
    
    torchvision.io.write_video(save_path, video, fps=8, video_codec='h264', options={'crf': '10'},
                           audio_array=norm_wav, audio_fps=aud_model.sample_rate, audio_codec='aac')
    