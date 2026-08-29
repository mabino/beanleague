import io
import os
import re
import random
import logging
import asyncio
import urllib.parse
import urllib.robotparser
from typing import Optional, Dict, Any, List
from pathlib import Path
import httpx
from PIL import Image
import aiosqlite
from ..config import settings

logger = logging.getLogger("beanleague.photo_scraper")

PHOTOS_DIR = Path(settings.DATA_DIR) / "photos"
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}

class RobotChecker:
    """In-memory cached robots.txt compliance checker."""
    _parsers: Dict[str, urllib.robotparser.RobotFileParser] = {}

    @classmethod
    async def is_allowed(cls, url: str, user_agent: str = "*") -> bool:
        try:
            parsed = urllib.parse.urlparse(url)
            base = f"{parsed.scheme}://{parsed.netloc}"
            if base not in cls._parsers:
                robots_url = f"{base}/robots.txt"
                parser = urllib.robotparser.RobotFileParser()
                parser.set_url(robots_url)
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(robots_url, headers={"User-Agent": "BeanLeagueBot/1.0"})
                    if resp.status_code == 200:
                        parser.parse(resp.text.splitlines())
                    else:
                        parser.allow_all = True
                cls._parsers[base] = parser
            return cls._parsers[base].can_fetch(user_agent, url)
        except Exception:
            return True

async def fetch_wikimedia_portrait(player_name: str) -> Optional[str]:
    """Queries Wikimedia Commons / Wikipedia API for player portrait thumbnail."""
    # Clean player name
    clean_name = player_name.strip()
    encoded = urllib.parse.quote(clean_name)
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={encoded}&prop=pageimages&format=json&pithumbsize=250"
    
    if not await RobotChecker.is_allowed(url):
        return None

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "BeanLeagueBot/1.0 (https://binolabs.com/beanleague; mabino@gmail.com)"})
            if resp.status_code == 200:
                data = resp.json()
                pages = data.get("query", {}).get("pages", {})
                for _, page in pages.items():
                    if "thumbnail" in page:
                        return page["thumbnail"].get("source")
    except Exception as e:
        logger.debug(f"Wikimedia fetch for '{player_name}' failed: {e}")
    return None

async def fetch_web_portrait_fallback(player_name: str, team_name: str = "") -> Optional[str]:
    """Polite web search fallback for player portraits."""
    query = f"{player_name} {team_name} soccer player portrait"
    encoded_q = urllib.parse.quote(query)
    url = f"https://html.duckduckgo.com/html/?q={encoded_q}"
    
    if not await RobotChecker.is_allowed(url):
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=BROWSER_HEADERS)
            if resp.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(resp.text, "html.parser")
                for img in soup.find_all("img"):
                    src = img.get("src", "")
                    if src and not src.startswith("data:") and "duckduckgo" not in src:
                        if src.startswith("//"):
                            src = "https:" + src
                        return src
    except Exception as e:
        logger.debug(f"Web portrait fallback for '{player_name}' failed: {e}")
    return None

def generate_avatar_svg(player_name: str, position: str = "FWD") -> bytes:
    """Generates a lightweight, crisp SVG avatar with player initials and position color."""
    parts = player_name.strip().split()
    initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "BL"
    
    pos_colors = {
        "GK": ("#F59E0B", "#D97706"),   # Amber
        "DEF": ("#3B82F6", "#2563EB"),  # Blue
        "MID": ("#10B981", "#059669"),  # Emerald
        "FWD": ("#EF4444", "#DC2626")   # Rose/Red
    }
    c1, c2 = pos_colors.get(position, ("#6366F1", "#4F46E5"))
    
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{c1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{c2};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="140" height="140" rx="70" fill="url(#grad)" />
  <text x="70" y="82" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="bold" fill="#FFFFFF" text-anchor="middle">{initials}</text>
  <rect x="35" y="105" width="70" height="22" rx="11" fill="rgba(0,0,0,0.3)" />
  <text x="70" y="120" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF" text-anchor="middle">{position}</text>
</svg>"""
    return svg.encode("utf-8")

def process_and_optimize_image(image_bytes: bytes, target_path: Path) -> bool:
    """Resizes, center-crops to 140x140 square, and converts to low-bandwidth WebP."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = img.convert("RGBA")
            
            # Center-crop to square
            width, height = img.size
            min_dim = min(width, height)
            left = (width - min_dim) / 2
            top = (height - min_dim) / 2
            right = (width + min_dim) / 2
            bottom = (height + min_dim) / 2
            cropped = img.crop((left, top, right, bottom))
            
            # Resize with antialiasing
            resized = cropped.resize((140, 140), Image.Resampling.LANCZOS)
            
            # Save optimized WebP (< 8KB)
            resized.save(target_path, "WEBP", quality=82, method=6)
            return True
    except Exception as e:
        logger.warning(f"Failed to process image with PIL: {e}")
        return False

async def resolve_player_photo(
    player_id: int,
    player_name: str,
    real_team_name: str = "",
    position: str = "FWD",
    existing_url: Optional[str] = None,
    db: Optional[aiosqlite.Connection] = None
) -> Path:
    """
    Lazily resolves and caches a player's profile picture.
    Returns path to local cached file (.webp or .svg).
    """
    webp_path = PHOTOS_DIR / f"{player_id}.webp"
    svg_path = PHOTOS_DIR / f"{player_id}.svg"

    # 1. Return immediately if already cached
    if webp_path.exists() and webp_path.stat().st_size > 100:
        return webp_path
    if svg_path.exists() and svg_path.stat().st_size > 50:
        return svg_path

    # 2. Try downloading existing valid URL if present
    if existing_url and existing_url.startswith("http") and "placeholder" not in existing_url:
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(existing_url, headers=BROWSER_HEADERS)
                if resp.status_code == 200 and len(resp.content) > 500:
                    if process_and_optimize_image(resp.content, webp_path):
                        return webp_path
        except Exception:
            pass

    # 3. Try Wikimedia Commons / Wikipedia API
    wiki_img_url = await fetch_wikimedia_portrait(player_name)
    if wiki_img_url:
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(wiki_img_url, headers=BROWSER_HEADERS)
                if resp.status_code == 200 and len(resp.content) > 500:
                    if process_and_optimize_image(resp.content, webp_path):
                        if db:
                            local_url = f"/beanleague/api/players/{player_id}/photo"
                            await db.execute("UPDATE players SET photo_url = ? WHERE id = ?", (local_url, player_id))
                            await db.commit()
                        return webp_path
        except Exception as e:
            logger.debug(f"Failed to download wiki image for {player_name}: {e}")

    # 4. Fallback to custom vector avatar
    svg_bytes = generate_avatar_svg(player_name, position)
    with open(svg_path, "wb") as f:
        f.write(svg_bytes)
    
    return svg_path

async def run_photo_audit_and_sync(db: aiosqlite.Connection) -> Dict[str, Any]:
    """
    Periodic photo audit & sync:
    Checks if all players in the database have a fresh cached profile picture on disk.
    If all photos are present, EXITS IMMEDIATELY (zero network requests, zero overhead).
    If new/unpopulated players are found, politely resolves them with rate pacing.
    """
    cursor = await db.execute("SELECT id, name, real_team_name, position, photo_url FROM players ORDER BY current_price DESC")
    players = await cursor.fetchall()
    
    missing = []
    for p in players:
        webp_path = PHOTOS_DIR / f"{p['id']}.webp"
        svg_path = PHOTOS_DIR / f"{p['id']}.svg"
        has_webp = webp_path.exists() and webp_path.stat().st_size > 100
        has_svg = svg_path.exists() and svg_path.stat().st_size > 50
        if not has_webp and not has_svg:
            missing.append(p)
            
    if not missing:
        logger.info(f"Photo Scraper Audit: All {len(players)} players have fresh cached images. Exiting immediately with 0 network calls.")
        return {"status": "fresh", "total_players": len(players), "missing_count": 0, "processed_count": 0}

    logger.info(f"Photo Scraper Audit: Found {len(missing)} of {len(players)} players missing images. Lazily resolving with polite pacing...")
    processed = 0
    for p in missing:
        try:
            await resolve_player_photo(
                player_id=p["id"],
                player_name=p["name"],
                real_team_name=p["real_team_name"] or "",
                position=p["position"] or "FWD",
                existing_url=p["photo_url"],
                db=db
            )
            processed += 1
            await asyncio.sleep(random.uniform(2.5, 3.5))
        except Exception as e:
            logger.warning(f"Failed to resolve photo for {p['name']}: {e}")

    logger.info(f"Photo Scraper Audit: Completed processing {processed} players.")
    return {"status": "completed", "total_players": len(players), "missing_count": len(missing), "processed_count": processed}

class BackgroundPhotoWorker:
    """Polite, low-bandwidth background photo populator sidecar."""
    _running: bool = False
    _task: Optional[asyncio.Task] = None

    @classmethod
    def start(cls):
        if not cls._running:
            cls._running = True
            cls._task = asyncio.create_task(cls._worker_loop())
            logger.info("Background Photo Scraper Worker started.")

    @classmethod
    def stop(cls):
        cls._running = False
        if cls._task:
            cls._task.cancel()

    @classmethod
    async def _worker_loop(cls):
        while cls._running:
            try:
                async with aiosqlite.connect(settings.DATABASE_PATH) as db:
                    db.row_factory = aiosqlite.Row
                    await run_photo_audit_and_sync(db)

                # Sleep 2 hours before periodic check
                await asyncio.sleep(7200)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception(f"Error in BackgroundPhotoWorker loop: {e}")
                await asyncio.sleep(60)
