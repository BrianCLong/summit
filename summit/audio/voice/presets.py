from typing import Dict

# Voice Instruct Presets (aligned with harvested patterns from ComfyUI-QwenTTS)
VOICE_INSTRUCT_PRESETS: dict[str, dict[str, str]] = {
    "en": {
        "calm": "A calm and professional male voice with a neutral tone.",
        "energetic": "An energetic and excited female voice with high pitch.",
        "whisper": "A soft, whispering voice suitable for narration.",
        "storyteller": "A warm, engaging voice that sounds like a storyteller."
    },
    "zh": {
        "calm": "一个平静且专业的男声，语调中性。",
        "energetic": "一个充满活力且兴奋的女声，音调较高。",
        "whisper": "一个柔和的轻声，适合叙事。",
        "storyteller": "一个温暖、引人入胜的声音，听起来像是在讲故事。"
    }
}

def get_preset(lang: str, key: str) -> str:
    return VOICE_INSTRUCT_PRESETS.get(lang, {}).get(key, "")
