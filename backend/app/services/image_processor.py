import io
from PIL import Image, ImageDraw, ImageFont

class ImageProcessor:
    @staticmethod
    def create_thumbnail(image_bytes: bytes, max_width: int = 800) -> bytes:
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Convert to RGB if it's RGBA (WebP doesn't strictly need it but for consistency)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Calculate new height preserving aspect ratio
            w_percent = (max_width / float(img.size[0]))
            h_size = int((float(img.size[1]) * float(w_percent)))

            img = img.resize((max_width, h_size), Image.Resampling.LANCZOS)

            out_io = io.BytesIO()
            # Save as WebP
            img.save(out_io, format="WEBP", quality=80)
            return out_io.getvalue()

    @staticmethod
    def apply_watermark(image_bytes: bytes, watermark_text: str = "STREET PHOTO") -> bytes:
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Convert to RGBA for alpha compositing
            if img.mode != "RGBA":
                img = img.convert("RGBA")

            # Create a transparent overlay
            overlay = Image.new("RGBA", img.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(overlay)

            # Basic font setup (in production, use a TTF file)
            # Default PIL font is small, so we might need a custom font for large text
            font = ImageFont.load_default()

            # Draw text repeatedly or in the center (simplistic centering here)
            text_bbox = draw.textbbox((0, 0), watermark_text, font=font)
            text_w, text_h = text_bbox[2] - text_bbox[0], text_bbox[3] - text_bbox[1]

            x = (img.size[0] - text_w) / 2
            y = (img.size[1] - text_h) / 2

            # Draw text with 128 alpha (semi-transparent)
            draw.text((x, y), watermark_text, font=font, fill=(255, 255, 255, 128))

            # Combine image and watermark
            watermarked = Image.alpha_composite(img, overlay)

            # Convert back to RGB to save as JPEG/WEBP
            watermarked = watermarked.convert("RGB")
            out_io = io.BytesIO()
            watermarked.save(out_io, format="JPEG", quality=85)
            return out_io.getvalue()

image_processor = ImageProcessor()
