"""
Generate simple icon images for Chrome extension
Creates 16x16, 48x48, and 128x128 PNG icons
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Create icons directory
icons_dir = "icons"
if not os.path.exists(icons_dir):
    os.makedirs(icons_dir)
    print(f"✓ Created {icons_dir}/ directory")

# Icon sizes needed
sizes = [16, 48, 128]

# Colors (microphone theme for voice assistant)
bg_color = (52, 152, 219)  # Blue
icon_color = (255, 255, 255)  # White

for size in sizes:
    # Create image with blue background
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw a simple microphone icon
    if size == 16:
        # Small icon - simple circle with dot
        draw.ellipse([4, 4, 12, 12], fill=icon_color)
        draw.ellipse([7, 7, 9, 9], fill=bg_color)
    elif size == 48:
        # Medium icon - microphone shape
        # Mic body
        draw.ellipse([16, 10, 32, 26], fill=icon_color)
        # Mic stand
        draw.rectangle([23, 26, 25, 38], fill=icon_color)
        # Base
        draw.rectangle([18, 38, 30, 40], fill=icon_color)
    else:  # 128
        # Large icon - detailed microphone
        # Mic body (rounded rectangle)
        draw.ellipse([44, 25, 84, 65], fill=icon_color)
        # Mic grille lines
        for i in range(5):
            y = 35 + i * 6
            draw.line([50, y, 78, y], fill=bg_color, width=2)
        # Mic stand
        draw.rectangle([62, 65, 66, 100], fill=icon_color)
        # Base
        draw.rectangle([50, 100, 78, 106], fill=icon_color)
    
    # Save icon
    filename = f"{icons_dir}/icon{size}.png"
    img.save(filename)
    print(f"✓ Created {filename}")

print("\n✅ All icons created successfully!")
print(f"   Location: chrome_extension/{icons_dir}/")
