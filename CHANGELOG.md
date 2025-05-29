# Changelog

All notable changes to the LLM Dictionary - Local TTS Edition plugin will be documented in this file.

## [2.1.0] - 2024-12-19

### Added
- 📁 **Auto Folder Organization**: Vocabulary/ and Audio/ folders created automatically
- 🎙️ **Audio File Generation**: Real MP3 files embedded in notes
- 🔗 **Cross-folder Linking**: Audio embeds work seamlessly across folders
- 📋 **Clean Templates**: Removed redundant audio sections from notes
- 🎯 **Better File Management**: Unique filenames prevent conflicts

### Changed
- Improved note template structure
- Enhanced audio file organization
- Better error handling for folder creation
- Optimized audio generation workflow

### Fixed
- Settings access issues in DictionaryView
- Audio file naming conflicts
- Folder creation edge cases
- Template rendering with audio embeds

## [2.0.0] - 2024-12-18

### Added
- 🎙️ **Local TTS Service**: Unlimited offline text-to-speech
- 🇻🇳 **Vietnamese Translations**: Automatic translations for all words
- 📢 **Example Audio**: TTS for all example sentences
- ⚡ **Keyboard Shortcut**: Ctrl+D for quick lookups
- 🔧 **Multiple Audio Sources**: Local TTS + Azure TTS fallback
- 📊 **Voice Quality Settings**: High/Medium/Low quality options

### Changed
- Complete rewrite of audio generation system
- Improved AI service with better error handling
- Enhanced IPA fetching from external APIs
- Better plugin settings organization

### Fixed
- JSON parsing issues with Groq API responses
- Audio playback reliability
- Plugin initialization errors
- Memory leaks in audio generation

## [1.0.0] - 2024-12-15

### Added
- 🧠 **Smart AI Dictionary**: Context-aware definitions with Groq API
- 📚 **Multi-language Support**: English, Japanese, Korean, Chinese
- 📖 **Anki Integration**: Export vocabulary to Anki flashcards
- 🎯 **Dictionary View**: Dedicated sidebar for lookups
- 📝 **Note Creation**: Auto-generate vocabulary notes

### Technical Details
- Plugin framework setup
- Groq API integration
- Basic TTS functionality
- Obsidian plugin architecture
- Settings configuration system

---

## Version Numbering

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions  
- **PATCH** version for backwards-compatible bug fixes

## Upcoming Features

### Version 3.0 (Planned)
- 🐳 Docker integration for TTS service
- 📚 Enhanced Anki integration with AnkiConnect
- 🎛️ Multiple TTS models and voice customization
- 📊 Learning analytics and progress tracking
- 🌍 Extended language support
