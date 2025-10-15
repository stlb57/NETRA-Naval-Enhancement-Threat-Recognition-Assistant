# File: backend/debug_model.py

import torch
from app.ml.nets.funiegan import GeneratorFunieGAN as Generator
from PIL import Image
from app.processing import enhance_image_with_model
import sys

print("--- Starting Model Debug Script ---")

try:
    # 1. Try to initialize the model architecture
    print("[1/4] Initializing model architecture...")
    model = Generator()
    print("      ✅ Architecture initialized.")

    # 2. Try to load the weights from your .pth file
    print("[2/4] Loading weights from finetuned_generator.pth...")
    # NOTE: Make sure the path is relative to where you run the script (the backend folder)
    model.load_state_dict(torch.load("app/ml/finetuned_generator.pth", map_location=torch.device('cpu')))
    model.eval()
    print("      ✅ Weights loaded successfully!")

    # 3. Create a dummy image to test processing
    print("[3/4] Creating a dummy black image (256x256) for testing...")
    dummy_image = Image.new('RGB', (256, 256), 'black')
    print("      ✅ Dummy image created.")

    # 4. Try to run the model's enhancement function
    print("[4/4] Running enhancement function on the dummy image...")
    enhanced_image = enhance_image_with_model(dummy_image, model)
    print("      ✅ Enhancement function ran without crashing!")

    print("\n--- ✅ SUCCESS! The model and processing code seem to be working correctly. ---")

except Exception as e:
    print(f"\n--- ❌ CRASH! An error occurred: ---")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Message: {e}")
    print("\n--- This error indicates a problem with loading or running the model. ---")
    # Exit with a non-zero code to indicate an error
    sys.exit(1)