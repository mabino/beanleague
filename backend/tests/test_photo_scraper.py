import pytest
from pathlib import Path
from PIL import Image
import io
from app.pipeline.photo_scraper import (
    generate_avatar_svg,
    process_and_optimize_image,
    RobotChecker,
    resolve_player_photo
)

def test_generate_avatar_svg():
    svg_bytes = generate_avatar_svg("Lamine Yamal", "FWD")
    assert b"LY" in svg_bytes
    assert b"FWD" in svg_bytes
    assert svg_bytes.startswith(b"<svg")

    gk_svg = generate_avatar_svg("Thibaut Courtois", "GK")
    assert b"TC" in gk_svg
    assert b"GK" in gk_svg

def test_process_and_optimize_image(tmp_path):
    # Create sample in-memory PNG
    img = Image.new("RGB", (300, 400), color=(255, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw_bytes = buf.getvalue()

    target_webp = tmp_path / "101.webp"
    success = process_and_optimize_image(raw_bytes, target_webp)
    assert success is True
    assert target_webp.exists()
    assert target_webp.stat().st_size > 0

    # Verify dimensions
    with Image.open(target_webp) as out_img:
        assert out_img.size == (140, 140)
        assert out_img.format == "WEBP"

@pytest.mark.asyncio
async def test_resolve_player_photo_fallback(tmp_path, monkeypatch):
    monkeypatch.setattr("app.pipeline.photo_scraper.PHOTOS_DIR", tmp_path)
    res_path = await resolve_player_photo(
        player_id=99999,
        player_name="Test Striker",
        position="FWD"
    )
    assert res_path.exists()
    assert res_path.suffix in (".webp", ".svg")
