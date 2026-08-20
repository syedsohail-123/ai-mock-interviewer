import os
import base64
import tempfile
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
from app.core.config import settings
from app.core.logging import logger

# Dedicated single-thread worker for Windows SAPI COM operations
_tts_executor = ThreadPoolExecutor(max_workers=1)

class TTSService:
    def __init__(self):
        self._enabled = settings.TTS_ENABLED

    async def synthesize_to_base64_async(self, text: str) -> Optional[str]:
        if not self._enabled or not text or len(text.strip()) == 0:
            return None
        try:
            loop = asyncio.get_running_loop()
            return await asyncio.wait_for(
                loop.run_in_executor(_tts_executor, self._synthesize_blocking, text),
                timeout=8.0
            )
        except Exception as e:
            logger.debug(f"TTS synthesis non-critical note: {e}")
            return None

    def synthesize_to_base64(self, text: str) -> Optional[str]:
        if not self._enabled or not text:
            return None
        try:
            future = _tts_executor.submit(self._synthesize_blocking, text)
            return future.result(timeout=8.0)
        except Exception as e:
            logger.debug(f"TTS sync synthesis note: {e}")
            return None

    def _synthesize_blocking(self, text: str) -> Optional[str]:
        temp_path = None
        try:
            import pyttsx3
            # Initialize engine safely in single-threaded worker
            engine = pyttsx3.init()
            engine.setProperty('rate', 175)
            
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                temp_path = tmp.name
            
            # Synthesize the complete full interview question
            engine.save_to_file(text, temp_path)
            engine.runAndWait()
            engine.stop()

            if os.path.exists(temp_path) and os.path.getsize(temp_path) > 100:
                with open(temp_path, "rb") as f:
                    audio_bytes = f.read()
                return base64.b64encode(audio_bytes).decode("utf-8")
        except Exception as e:
            logger.debug(f"pyttsx3 synthesis error: {e}")
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
        return None

tts_service = TTSService()
