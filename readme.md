# LLM Dictionary - Local TTS Edition

🎯 **AI-powered multilingual dictionary** with offline Local TTS, Vietnamese translations, and unlimited audio generation for Obsidian.

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/MTQV002/LLM-obsidian)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-purple.svg)](https://obsidian.md/)

## ✨ Key Features

- **🧠 Smart AI Dictionary**: Context-aware definitions with Groq API (Free)
- **🇻🇳 Vietnamese Translations**: Automatic Vietnamese translations
- **🎙️ Local TTS**: Offline high-quality text-to-speech (unlimited)
- **📚 Multi-language**: English, Japanese, Korean, Chinese
- **📖 Anki Integration**: Auto-create flashcards with audio
- **⚡ Keyboard Shortcut**: Ctrl+D for quick lookups
- **📁 Auto-Organization**: Files sorted into Vocabulary/ and Audio/ folders

## 🚀 Quick Setup (3 minutes)

### Step 1: Install Plugin
1. Download the latest release from [GitHub Releases](https://github.com/MTQV002/LLM-obsidian/releases)
2. Extract to `.obsidian/plugins/llm-dictionary/`
3. Enable plugin in Obsidian settings

### Step 2: Get Groq API Key (Free)
1. Visit: [console.groq.com](https://console.groq.com/)
2. Sign up with Google/GitHub  
3. Create API Key: `grok_xxxxxxxxxxxx`
4. Paste into plugin settings

### Step 3: Setup Local TTS (Optional)
```bash
# Install dependencies
pip install TTS flask flask-cors

# Download TTS service script from releases
# Run the service
python tts-service.py

# Service starts on localhost:6789
# → Unlimited high-quality audio!
```

### Step 4: Usage
1. Select any text in Obsidian
2. Press `Ctrl+D`
3. Dictionary view opens with:
   - Definition + Vietnamese translation
   - IPA pronunciation + Audio
   - 3 example sentences with audio
   - Synonyms/Antonyms

## 📁 Project Structure
```bash
.obsidian/plugins/llm-dictionary/
├── main.js
├── manifest.json  
└── styles.css

# After using the plugin:
📁 Vocabulary/**: All dictionary notes automatically saved here
🎵 Audio/**: All audio files (IPA + examples) stored here
```

## 🎨 Audio Options

### Local TTS (Recommended - Free)
- ✅ **Unlimited usage** (no API limits)  
- ✅ **High quality** neural voices
- ✅ **Completely offline** after setup
- ✅ **Fast generation** (no network delays)
- 📋 **Setup**: Download script from plugin → Run locally

### Azure TTS (Fallback)
- ✅ **5,000 free requests/month**
- ✅ **Professional neural voices** 
- ✅ **Auto fallback** if local unavailable
- 📋 **Setup**: Register at portal.azure.com

## 📝 Template Configuration

### Enhanced Note Template với Audio:
```markdown
# {{Term}}

**Definition:** {{Definition}}
**Vietnamese:** {{Vietnamese}}  
**IPA:** {{IPA}} 🎙️ ![[Audio/audio_ipa_{{term}}_{{timestamp}}.mp3]]
**Type:** {{Type}}

## Synonyms
{{Synonyms}}

## Antonyms
{{Antonyms}}

## Examples
1. {{Example 1}} ![[Audio/audio_example_1_{{timestamp}}.mp3]]
2. {{Example 2}} ![[Audio/audio_example_2_{{timestamp}}.mp3]]
3. {{Example 3}} ![[Audio/audio_example_3_{{timestamp}}.mp3]]

**Source:** {{Source}}
**Date:** {{Date}}
```

### Available Fields:
- `{{Term}}` - Từ vựng chính
- `{{Definition}}` - Định nghĩa
- `{{Vietnamese}}` - Nghĩa tiếng Việt  
- `{{IPA}}` - Phiên âm quốc tế
- `{{Type}}` - Từ loại
- `{{Synonyms/Antonyms}}` - Từ đồng/trái nghĩa
- `{{Example 1-3}}` - Ví dụ thực tế
- `{{audio_ipa}}` - File âm thanh
- `{{Source}}` - Nguồn gốc

### Audio Features:
- **🎙️ IPA Pronunciation**: High-quality audio for word pronunciation
- **📢 Example Audio**: TTS for all example sentences  
- **🔗 Auto-embed**: Audio files automatically linked in notes
- **📁 Auto-organize**: Files sorted into Vocabulary/ and Audio/ folders
- **⚡ Instant Playback**: Click audio embeds to play in Obsidian

## ⚙️ Advanced Features

### 🎙️ Audio Generation
- **Voice Test**: Thử giọng đọc trong settings
- **Quality Settings**: High/Medium/Low quality  
- **Multiple Languages**: Tự động detect ngôn ngữ
- **File Export**: Tạo MP3 embed vào notes

### 📚 Anki Integration
```bash
1. Install AnkiConnect addon trong Anki
2. Enable "Anki Integration" trong settings  
3. Map fields theo ý muốn
4. Auto export với audio files
```

### 🗣️ Speech Features  
- **Pronunciation Test**: So sánh phát âm
- **Context Lookup**: Hiểu nghĩa theo ngữ cảnh
- **Batch Processing**: Lưu nhiều từ cùng lúc

## 🔧 Troubleshooting

### Common Issues:
```bash
# Plugin không hiển thị
→ Restart Obsidian, disable Safe Mode

# API errors  
→ Check Groq key: grok_xxxxxxxxxxxx
→ Verify internet connection

# Local TTS errors
→ Run: python tts-service.py  
→ Check: http://localhost:6789/health

# Audio không chạy
→ Check service status trong plugin
→ Try Azure fallback option
```

## 📋 Usage Examples

### English → Vietnamese:
```
Select: "serendipity"
Press: Ctrl+D
Result:
- Vietnamese: "sự tìm thấy điều tốt đẹp một cách tình cờ"
- IPA: /ˌserənˈdɪpɪti/ + Audio
- Examples với context
```

### Batch Learning Workflow:
```bash  
1. Reading articles → Select unknown words
2. Ctrl+D → Get instant definitions  
3. Save tab → Create vocabulary notes
4. Anki tab → Export flashcards với audio
5. Review → Learn với high-quality pronunciation
```

---

**🎓 Happy Learning with Unlimited Local TTS!**

*Hỗ trợ: [GitHub Issues](https://github.com/yourusername/llm-dictionary-local-tts/issues)*





