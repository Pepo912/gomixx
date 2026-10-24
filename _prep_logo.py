from pathlib import Path
from PIL import Image

src = Path(
    r"C:\Users\pedro\.cursor\projects\c-Users-pedro-Downloads-gomixx-gomixx-ruleta\assets\c__Users_pedro_AppData_Roaming_Cursor_User_workspaceStorage_7a3a58fb1fad795321de60e053f411f8_images_image-c26a2abc-cfce-41a6-bb52-7d3329413b60.png"
)
out = Path(r"C:\Users\pedro\Downloads\gomixx\gomixx_ruleta")
im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
bg = px[0, 0]


def far(a, b, t=18):
    return any(abs(a[i] - b[i]) > t for i in range(3))


minx, miny, maxx, maxy = w, h, 0, 0
for y in range(h):
    for x in range(w):
        if far(px[x, y], bg):
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)

pad = 36
box = (max(0, minx - pad), max(0, miny - pad), min(w, maxx + 1 + pad), min(h, maxy + 1 + pad))
logo = im.crop(box)
logo.save(out / "logo.png", "PNG")

side = max(maxx - minx + 1, maxy - miny + 1)
cx = (minx + maxx) // 2
cy = (miny + maxy) // 2
half = side // 2 + 48
sq = im.crop((max(0, cx - half), max(0, cy - half), min(w, cx + half), min(h, cy + half)))
sq = sq.resize((256, 256), Image.Resampling.LANCZOS)
sq.save(out / "favicon.png", "PNG")
sq.resize((32, 32), Image.Resampling.LANCZOS).save(out / "favicon.ico", "ICO", sizes=[(32, 32)])
print("logo", logo.size)
print("favicon", sq.size)
