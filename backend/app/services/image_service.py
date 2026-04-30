import base64
import io
import logging
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)


def compress_card_image(
    image_base64: str,
    max_size: int = 800,
    quality: int = 70,
) -> Optional[bytes]:
    """Recebe base64 (com ou sem data:URL prefix), retorna bytes JPEG comprimido.

    Retorna None em caso de erro — não bloqueia o save do contato.
    """
    try:
        if "," in image_base64 and image_base64.lstrip().startswith("data:"):
            image_base64 = image_base64.split(",", 1)[1]

        raw = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(raw))

        if img.mode != "RGB":
            img = img.convert("RGB")

        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        return buf.getvalue()
    except Exception as e:
        logger.error("Erro ao comprimir imagem do cartão: %s", e)
        return None
