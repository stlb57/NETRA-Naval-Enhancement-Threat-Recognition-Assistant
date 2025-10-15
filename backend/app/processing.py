import torch
from torchvision import transforms
from PIL import Image
import numpy as np
import cv2

# --- Load the Super-Resolution model ---
sr_model_path = "app/ml/EDSR_x4.pb"
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(sr_model_path)
sr.setModel("edsr", 4)
print("✅ Super-Resolution model loaded successfully!")

def resize_with_padding(img, target_size):
    padded_img = img.copy()
    padded_img.thumbnail((target_size[0], target_size[1]))
    background = Image.new("RGB", (target_size[0], target_size[1]), (0, 0, 0))
    paste_x = (target_size[0] - padded_img.width) // 2
    paste_y = (target_size[1] - padded_img.height) // 2
    background.paste(padded_img, (paste_x, paste_y))
    crop_box = (paste_x, paste_y, paste_x + padded_img.width, paste_y + padded_img.height)
    return background, crop_box

transform = transforms.Compose([
    transforms.ToTensor(),
])

post_transform = transforms.ToPILImage()

def apply_false_color_edge_detection(image: Image.Image):
    img_np = np.array(image)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    heatmap = cv2.applyColorMap(edges, cv2.COLORMAP_JET)
    background = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
    superimposed_img = cv2.addWeighted(heatmap, 0.7, background, 0.3, 0)
    return Image.fromarray(superimposed_img)

def enhance_image_with_model(image: Image.Image, model: torch.nn.Module, mode: str = "normal", use_sr: bool = False) -> Image.Image:
    original_size = image.size
    padded_image, crop_box = resize_with_padding(image, (256, 256))
    input_tensor = transform(padded_image).unsqueeze(0)

    with torch.no_grad():
        output_tensor = model(input_tensor)

    enhanced_padded_image = post_transform(output_tensor.squeeze(0))
    enhanced_cropped_image = enhanced_padded_image.crop(crop_box)
    
    if use_sr and mode != 'thermal':
        sr_input_image = cv2.cvtColor(np.array(enhanced_cropped_image), cv2.COLOR_RGB2BGR)
        sr_output_image = sr.upsample(sr_input_image)
        final_image_np = cv2.resize(sr_output_image, original_size, interpolation=cv2.INTER_CUBIC)
        final_image = Image.fromarray(cv2.cvtColor(final_image_np, cv2.COLOR_BGR2RGB))
    else:
        final_image = enhanced_cropped_image.resize(original_size, Image.Resampling.LANCZOS)
    
    if mode == 'thermal':
        return apply_false_color_edge_detection(final_image)
    else:
        return final_image