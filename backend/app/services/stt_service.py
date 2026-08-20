import os
import io
import wave
import base64
import tempfile
import asyncio
from typing import Optional, List
import httpx
import speech_recognition as sr
from app.core.config import settings
from app.core.logging import logger

# Lazy-loaded local whisper model singleton
_local_whisper_model = None

def _get_local_whisper():
    global _local_whisper_model
    if _local_whisper_model is None:
        try:
            import whisper
            logger.info("Loading local OpenAI Whisper model ('base')...")
            _local_whisper_model = whisper.load_model("base")
            logger.info("OpenAI Whisper base model loaded successfully!")
        except Exception as e:
            logger.warning(f"Could not load local OpenAI Whisper model: {e}")
            _local_whisper_model = False
    return _local_whisper_model if _local_whisper_model is not False else None

class STTService:
    def __init__(self):
        self.whisper_model = settings.GROQ_WHISPER_MODEL or "whisper-large-v3-turbo"
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 70
        self.recognizer.dynamic_energy_threshold = True

    @property
    def groq_api_key(self) -> str:
        return settings.GROQ_API_KEY

    async def transcribe_audio_base64(self, base64_audio: str, filename: str = "audio.wav") -> str:
        try:
            if "," in base64_audio:
                base64_audio = base64_audio.split(",", 1)[1]
            audio_bytes = base64.b64decode(base64_audio)
            return await self.transcribe_audio_bytes(audio_bytes, filename=filename)
        except Exception as e:
            logger.error(f"Error decoding base64 audio: {e}")
            return ""

    async def transcribe_audio_bytes(self, audio_bytes: bytes, filename: str = "audio.wav") -> str:
        if not audio_bytes or len(audio_bytes) < 100:
            logger.warning(f"Received empty or very short audio bytes ({len(audio_bytes)} bytes)")
            return ""

        # 1. Try Groq Whisper API if API key is provided (Ultra-fast 200ms)
        if self.groq_api_key:
            try:
                transcript = await self._call_groq_whisper(audio_bytes, filename=filename)
                if transcript:
                    logger.info(f"Groq Whisper transcription success: {transcript[:60]}...")
                    return transcript
            except Exception as e:
                logger.error(f"Groq Whisper API call failed: {e}")

        # 2. Local Offline OpenAI Whisper (High-Accuracy Technical Vocabulary)
        try:
            transcript = await asyncio.to_thread(self._transcribe_with_local_whisper, audio_bytes)
            if transcript:
                logger.info(f"Local Whisper transcription success ({len(transcript)} chars): {transcript[:80]}...")
                return transcript
        except Exception as e:
            logger.warning(f"Local Whisper error ({e}). Trying fallback.")

        # 3. Fallback to OpenAI Whisper cloud if configured
        if settings.OPENAI_API_KEY:
            try:
                transcript = await self._call_openai_whisper(audio_bytes, filename=filename)
                if transcript:
                    return transcript
            except Exception as e:
                logger.error(f"OpenAI Whisper API call failed: {e}")

        # 4. Long-Form Chunked Speech Recognition Fallback
        try:
            transcript = await asyncio.to_thread(self._transcribe_long_form_audio, audio_bytes)
            if transcript:
                logger.info(f"Speech recognition fallback success: {transcript[:60]}...")
                return transcript
        except Exception as e:
            logger.error(f"Speech recognition fallback error: {e}")

        return ""

    def _transcribe_with_local_whisper(self, audio_bytes: bytes) -> str:
        model = _get_local_whisper()
        if model is None:
            return ""

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
                tf.write(audio_bytes)
                temp_path = tf.name

            # Transcribe audio file with technical programming prompt
            result = model.transcribe(
                temp_path,
                language="en",
                initial_prompt="Technical software engineering mock interview discussing Flutter, Dart, Python, APIs, databases, architecture, and coding.",
                temperature=0.0
            )
            return (result.get("text") or "").strip()
        except Exception as e:
            logger.warning(f"Local whisper inference error: {e}")
            return ""
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass

    def _transcribe_long_form_audio(self, audio_bytes: bytes) -> str:
        chunks: List[bytes] = []
        try:
            with wave.open(io.BytesIO(audio_bytes), 'rb') as wf:
                params = wf.getparams()
                sample_rate = wf.getframerate()
                total_frames = wf.getnframes()
                duration_secs = total_frames / sample_rate

                if duration_secs <= 12:
                    return self._transcribe_single_chunk(audio_bytes)

                chunk_frame_count = sample_rate * 10
                while True:
                    frames = wf.readframes(chunk_frame_count)
                    if not frames:
                        break
                    out_buf = io.BytesIO()
                    with wave.open(out_buf, 'wb') as out_wf:
                        out_wf.setparams(params)
                        out_wf.writeframes(frames)
                    chunks.append(out_buf.getvalue())
        except Exception as e:
            logger.debug(f"WAV chunking note: {e}")
            return self._transcribe_single_chunk(audio_bytes)

        if not chunks:
            return self._transcribe_single_chunk(audio_bytes)

        recognized_parts = []
        for chunk_bytes in chunks:
            part_text = self._transcribe_single_chunk(chunk_bytes)
            if part_text and part_text.strip():
                recognized_parts.append(part_text.strip())

        return " ".join(recognized_parts).strip()

    def _transcribe_single_chunk(self, audio_bytes: bytes) -> str:
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
                tf.write(audio_bytes)
                temp_path = tf.name

            with sr.AudioFile(temp_path) as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.15)
                audio_data = self.recognizer.record(source)

                for lang in ["en-IN", "en-US", "en-GB"]:
                    try:
                        text = self.recognizer.recognize_google(audio_data, language=lang)
                        if text and len(text.strip()) > 0:
                            return text.strip()
                    except sr.UnknownValueError:
                        continue
                    except Exception:
                        pass
                return ""
        except Exception as e:
            logger.debug(f"Chunk transcription error: {e}")
            return ""
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass

    async def _call_groq_whisper(self, audio_bytes: bytes, filename: str = "audio.wav") -> str:
        files = {
            "file": (filename, audio_bytes, "audio/m4a" if filename.endswith(".m4a") else "audio/wav")
        }
        data = {
            "model": self.whisper_model,
            "response_format": "json",
            "temperature": 0.0,
            "prompt": "Technical software engineering mock interview. Key terms and frameworks: Flutter, Dart, BLoC, Riverpod, Provider, React, Next.js, Node.js, Python, FastAPI, Django, Flask, Java, Spring Boot, PostgreSQL, MySQL, Redis, MongoDB, SQLite, GraphQL, REST APIs, gRPC, Docker, Kubernetes, AWS, GCP, Azure, CI/CD, Git, microservices, async await, concurrency, multithreading, OOP, MVC, MVVM, Clean Architecture, caching, indexing, latency, state management, frontend, backend, full stack."
        }
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers=headers,
                files=files,
                data=data
            )
            response.raise_for_status()
            res_json = response.json()
            return res_json.get("text", "").strip()

    async def _call_openai_whisper(self, audio_bytes: bytes, filename: str = "audio.wav") -> str:
        files = {
            "file": (filename, audio_bytes, "audio/m4a" if filename.endswith(".m4a") else "audio/wav")
        }
        data = {
            "model": "whisper-1",
            "temperature": 0.0,
            "prompt": "Technical software engineering mock interview discussing Flutter, Dart, Python, FastAPI, PostgreSQL, Redis, Docker, microservices, and APIs."
        }
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers=headers,
                files=files,
                data=data
            )
            response.raise_for_status()
            res_json = response.json()
            return res_json.get("text", "").strip()

stt_service = STTService()
