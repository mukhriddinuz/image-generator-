from PIL import Image

img = Image.open('ref.jpg').convert('RGB')
w, h = img.size

print("--- Scanning Sizes Box ---")
x = int(w * 0.10)
for py in range(400, 900):
    y = int(h * (py / 1000.0))
    r, g, b = img.getpixel((x, y))
    # just print when it becomes white
    if r > 240 and g > 240 and b > 240:
        print(f"Sizes box starts at y={py/1000.0:.3f}")
        break

print("--- Scanning Magnifier ---")
# scan horizontally across the bottom right
y = int(h * 0.85)
for px in range(700, 999):
    x = int(w * (px / 1000.0))
    r, g, b = img.getpixel((x, y))
    if r > 240 and g > 240 and b > 240:
        print(f"Magnifier circle starts at x={px/1000.0:.3f}")
        break
