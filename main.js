"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });

const { Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } = require('obsidian');

const DEFAULT_SETTINGS = {
    lang: "English",
    def: "Vietnamese", 
    llmkey: "",
    anki: false,
    ttsEnabled: true,
    audioSource: "local_tts",
    localTtsPort: 6789,
    localTtsHost: "localhost",
    ttsVoice: "en-us",
    audioQuality: "high"
};

class LocalTTSService {
    constructor() {
        this.baseUrl = 'http://localhost:6789';
        this.isServiceRunning = false;
    }

    // Check if local TTS service is running
    checkServiceStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${this.baseUrl}/health`, {
                    method: 'GET',
                    timeout: 3000
                });
                
                if (response.ok) {
                    const data = yield response.json();
                    this.isServiceRunning = data.status === 'running';
                    return this.isServiceRunning;
                }
                return false;
            } catch (error) {
                console.log('Local TTS service not running:', error.message);
                this.isServiceRunning = false;
                return false;
            }
        });
    }

    // Generate audio using local TTS service
    generateAudio(text, voice = 'en-us', quality = 'high') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Generating local TTS audio for: ${text}`);
                
                const response = yield fetch(`${this.baseUrl}/synthesize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        voice: voice,
                        quality: quality,
                        format: 'mp3'
                    })
                });

                if (!response.ok) {
                    throw new Error(`Local TTS failed: ${response.status} ${response.statusText}`);
                }

                const blob = yield response.blob();
                
                if (blob.size < 1000) {
                    throw new Error(`Generated audio too small: ${blob.size} bytes`);
                }

                console.log(`Local TTS success: ${blob.size} bytes`);
                return blob;
            } catch (error) {
                console.error('Local TTS error:', error);
                throw error;
            }
        });
    }

    // Get available voices from local service
    getAvailableVoices() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${this.baseUrl}/voices`);
                if (response.ok) {
                    return yield response.json();
                }
                return [];
            } catch (error) {
                console.error('Failed to get voices:', error);
                return [];
            }
        });
    }

    // Play audio immediately (for preview)
    speak(text, voice = 'en-us') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    speechSynthesis.speak(utterance);
                    return;
                }
                
                // Fallback to local TTS
                const blob = yield this.generateAudio(text, voice, 'medium');
                const audio = new Audio();
                audio.src = URL.createObjectURL(blob);
                yield audio.play();
            } catch (error) {
                console.error('Speak error:', error);
                new Notice('Text-to-speech failed');
            }
        });
    }
}

class AzureTTSService {
    constructor() {
        this.region = 'eastus';
        this.endpoint = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    }

    // Generate audio using Azure TTS (fallback option)
    generateAudio(text, apiKey, voice = 'en-US-AriaNeural') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Generating Azure TTS audio for: ${text}`);
                
                const ssml = `
                <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
                    <voice name="${voice}">
                        <prosody rate="0%" pitch="0%">
                            ${text}
                        </prosody>
                    </voice>
                </speak>`;

                const response = yield fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': apiKey,
                        'Content-Type': 'application/ssml+xml',
                        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
                    },
                    body: ssml
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Invalid Azure API key');
                    } else if (response.status === 429) {
                        throw new Error('Azure rate limit exceeded');
                    }
                    throw new Error(`Azure TTS failed: ${response.status}`);
                }

                const blob = yield response.blob();
                
                if (blob.size < 1000) {
                    throw new Error(`Azure audio too small: ${blob.size} bytes`);
                }

                console.log(`Azure TTS success: ${blob.size} bytes`);
                return blob;
            } catch (error) {
                console.error('Azure TTS error:', error);
                throw error;
            }
        });
    }
}

class IPAService {
    // Fetch IPA từ external API nếu Groq API không trả về
    getIPA(word) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Thử sử dụng Free Dictionary API để lấy IPA
                const response = yield fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
                if (!response.ok) {
                    throw new Error('Dictionary API failed');
                }
                
                const data = yield response.json();
                if (data && data.length > 0 && data[0].phonetics && data[0].phonetics.length > 0) {
                    // Tìm mục có text IPA
                    const phoneticWithText = data[0].phonetics.find(p => p.text && p.text.trim());
                    if (phoneticWithText && phoneticWithText.text) {
                        return phoneticWithText.text;
                    }
                }
                
                // Fallback nếu không tìm thấy trong Free Dictionary API
                return this.getSimpleIPA(word);
            } catch (error) {
                console.log('Failed to get IPA from API:', error);
                return this.getSimpleIPA(word);
            }
        });
    }
    
    // Tạo IPA đơn giản nếu không lấy được từ API
    getSimpleIPA(word) {
        // Mapping cơ bản cho âm tiếng Anh
        const phonemeMap = {
            'a': 'æ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɒ', 'u': 'ʌ',
            'aa': 'ɑː', 'ee': 'iː', 'oo': 'uː', 'ar': 'ɑːr', 'er': 'ɜːr', 'ir': 'ɪər', 'or': 'ɔːr', 'ur': 'ʊər',
            'ai': 'eɪ', 'ay': 'eɪ', 'ea': 'iː', 'ee': 'iː', 'ie': 'aɪ', 'oa': 'əʊ', 'oo': 'uː', 'ou': 'aʊ', 'ow': 'aʊ',
            'ch': 'tʃ', 'sh': 'ʃ', 'th': 'θ', 'zh': 'ʒ', 'ng': 'ŋ'
        };
        
        // Chuyển đổi đơn giản từ text sang IPA
        let simpleIPA = '';
        const lowerWord = word.toLowerCase();
        
        for (let i = 0; i < lowerWord.length; i++) {
            let processed = false;
            
            // Kiểm tra bigrams
            if (i < lowerWord.length - 1) {
                const bigram = lowerWord.substring(i, i + 2);
                if (phonemeMap[bigram]) {
                    simpleIPA += phonemeMap[bigram];
                    i++; // Bỏ qua ký tự tiếp theo
                    processed = true;
                }
            }
            
            // Nếu chưa xử lý, thử với từng ký tự
            if (!processed) {
                simpleIPA += phonemeMap[lowerWord[i]] || lowerWord[i];
            }
        }
        
        return `/${simpleIPA}/`;
    }
}

class AIService {
    constructor(app) {
        this.app = app;
        this.ipaService = new IPAService();
    }

    lookupWord(apiKey, term, context, targetLang) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('AI Service lookupWord called with:', { term, context, targetLang });
            
            const payload = {
                messages: [
                    {
                        role: "system",
                        content: `You are an English dictionary. Respond ONLY with valid JSON containing these fields: "Term", "Type", "Definition", "Vietnamese", "IPA", "Examples" (array), "Synonyms" (array), "Antonyms" (array). Use the EXACT term provided by user, do not lemmatize. Provide three examples using the EXACT term in bold. Do not include any explanations or text outside the JSON.`
                    },
                    {
                        role: "user",
                        content: `The definition and Type are in ${targetLang}. Vietnamese translation is required. Use the EXACT term "${term}" in all fields and examples.
Term: ${term}
Context: ${context}

Please include:
- Term: "${term}" (use exact term, do not change)
- Definition in ${targetLang}
- Vietnamese translation (always required)
- Type (Part of speech)
- Synonyms (array of similar words)
- Antonyms (array of opposite words)
- Examples with the EXACT term "${term}" in bold`
                    }
                ],
                model: "llama3-70b-8192",
                temperature: 0,
                max_tokens: 1024,
                top_p: 1,
                stream: false,
                stop: null
            };

            try {
                console.log('Sending request to Groq API...');
                const response = yield fetch("https://api.groq.com/openai/v1/chat/completions", {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    const errorText = yield response.text();
                    console.error('API Error Response:', errorText);
                    throw new Error(`API Error: ${response.status} - ${errorText}`);
                }

                const responseData = yield response.json();
                console.log('API Response:', responseData);

                if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
                    console.error('Invalid response structure:', responseData);
                    throw new Error('Invalid API response structure');
                }

                const content = responseData.choices[0].message.content;
                console.log('Raw content from API:', content);

                // Cải thiện JSON extraction với nhiều phương pháp backup
                let jsonData;
                try {
                    const cleanedContent = content.replace(/^```json|```$/g, '').trim();
                    console.log('Cleaned content:', cleanedContent);
                    jsonData = JSON.parse(cleanedContent);
                } catch (e) {
                    console.error('First parsing attempt failed:', e);
                    
                    try {
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            console.log('Extracted JSON via regex:', jsonMatch[0]);
                            jsonData = JSON.parse(jsonMatch[0]);
                        } else {
                            throw new Error('No valid JSON found in response');
                        }
                    } catch (e2) {
                        console.error('Second parsing attempt failed:', e2);
                        
                        if (content.includes('"Term"') && content.includes('"Definition"')) {
                            console.log('Attempting manual JSON construction');
                            jsonData = {
                                Term: term, // Đảm bảo dùng term gốc
                                Definition: "Could not parse definition",
                                Vietnamese: "Không thể phân tích nghĩa tiếng Việt",
                                Type: "unknown",
                                IPA: "",
                                Examples: [`Example with **${term}**`], // Dùng term gốc
                                Synonyms: [],
                                Antonyms: []
                            };

                            try {
                                const termMatch = content.match(/"Term"\s*:\s*"([^"]*)"/);
                                const defMatch = content.match(/"Definition"\s*:\s*"([^"]*)"/);
                                const vietMatch = content.match(/"Vietnamese"\s*:\s*"([^"]*)"/);
                                const typeMatch = content.match(/"Type"\s*:\s*"([^"]*)"/);
                                
                                // Luôn dùng term gốc, không dùng từ API trả về
                                if (defMatch) jsonData.Definition = defMatch[1];
                                if (vietMatch) jsonData.Vietnamese = vietMatch[1];
                                if (typeMatch) jsonData.Type = typeMatch[1];
                                
                                console.log('Manually extracted data:', jsonData);
                            } catch (e3) {
                                console.error('Manual extraction failed:', e3);
                            }
                        } else {
                            throw new Error('Response does not contain required fields');
                        }
                    }
                }

                console.log('Parsed JSON data:', jsonData);

                // Normalize các field và đảm bảo dùng term gốc
                const normalizedData = {
                    Term: term, // Luôn dùng term gốc từ user input
                    Type: jsonData.Type || jsonData.Part_of_speech || 'unknown',
                    Definition: jsonData.Definition || 'No definition available',
                    Vietnamese: jsonData.Vietnamese || 'Không có nghĩa tiếng Việt',
                    IPA: jsonData.IPA || '',
                    Examples: Array.isArray(jsonData.Examples) ? 
                             jsonData.Examples.map(ex => ex.replace(/\*\*[^*]+\*\*/g, `**${term}**`)) : // Thay thế bằng term gốc
                             [`Example with **${term}**`],
                    Synonyms: Array.isArray(jsonData.Synonyms) ? jsonData.Synonyms : 
                             (jsonData.Synonyms ? [jsonData.Synonyms] : []),
                    Antonyms: Array.isArray(jsonData.Antonyms) ? jsonData.Antonyms : 
                             (jsonData.Antonyms ? [jsonData.Antonyms] : []),
                    Source: `[[${this.app.workspace.getActiveFile()?.basename || 'Unknown'}]]`,
                    ID: `${Date.now()}`
                };

                // Bổ sung IPA nếu API không trả về
                if (!normalizedData.IPA || normalizedData.IPA.trim() === '') {
                    console.log('IPA missing, fetching from external service...');
                    try {
                        normalizedData.IPA = yield this.ipaService.getIPA(normalizedData.Term);
                        console.log('IPA fetched:', normalizedData.IPA);
                    } catch (ipaError) {
                        console.error('Failed to get IPA:', ipaError);
                    }
                }

                console.log('Normalized data with IPA:', normalizedData);
                return normalizedData;

            } catch (error) {
                console.error('AI Service Error Details:', error);
                new Notice(`Failed to lookup word: ${error.message}`);
                return null;
            }
        });
    }
}

class AnkiService {
    constructor() {
        this.ANKI_PORT = 8765;
    }

    invoke(action, params = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('error', () => reject('Failed to connect to Anki'));
            xhr.addEventListener('load', () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve(response.result);
                    }
                } catch (error) {
                    reject(error);
                }
            });
            
            xhr.open('POST', `http://127.0.0.1:${this.ANKI_PORT}`);
            xhr.send(JSON.stringify({
                action,
                version: 6,
                params
            }));
        });
    }

    getModelFieldNames(modelName) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.invoke('modelFieldNames', { modelName });
        });
    }

    addNote(deckName, modelName, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.invoke('addNote', {
                note: {
                    deckName,
                    modelName,
                    fields,
                    options: { allowDuplicate: true }
                }
            });
        });
    }
}

const DICTIONARY_VIEW_TYPE = "llm-dictionary-view";

class DictionaryView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin; // Store the plugin reference
        this.localTtsService = new LocalTTSService();
        this.azureTtsService = new AzureTTSService();
        this.aiService = new AIService(this.app);
        this.ankiService = new AnkiService();
        this.isLookingUp = false;
    }

    getViewType() {
        return DICTIONARY_VIEW_TYPE;
    }

    getDisplayText() {
        return "LLM Dictionary - Local TTS";
    }

    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            const container = this.containerEl.children[1];
            container.empty();
            container.createEl("h2", { text: "LLM Dictionary" });
            
            // Tạo container cho kết quả
            this.resultContainer = container.createDiv("dictionary-result");
            this.resultContainer.innerHTML = `
                <div class="lookup-info">
                    <p>Select text and press <kbd>Ctrl+D</kbd> to look up words</p>
                </div>
            `;
        });
    }

    // Hàm tra cứu từ vựng chính
    lookupWord(term, context = "") {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isLookingUp) {
                new Notice("Already looking up a word...");
                return;
            }

            if (!term || term.trim().length === 0) {
                new Notice("No text selected");
                return;
            }

            this.isLookingUp = true;
            
            try {
                // Hiển thị loading
                this.showLoading(term);
                
                const settings = this.plugin.settings;
                
                if (!settings.llmkey) {
                    new Notice("Please set Groq API key in settings");
                    this.showError("API key not configured");
                    return;
                }

                // Gọi AI service để tra cứu
                const result = yield this.aiService.lookupWord(
                    settings.llmkey,
                    term.trim(),
                    context,
                    settings.def
                );

                if (result) {
                    // Lấy IPA nếu không có
                    if (!result.IPA || result.IPA === "N/A") {
                        try {
                            result.IPA = yield this.aiService.ipaService.getIPA(term);
                        } catch (e) {
                            console.log("Failed to get IPA:", e);
                            result.IPA = `/${term}/`;
                        }
                    }

                    // Hiển thị kết quả
                    this.displayResult(result);
                    
                    // Tạo audio nếu có TTS
                    if (settings.ttsEnabled) {
                        yield this.generateAudio(result);
                    }
                } else {
                    this.showError("Failed to get dictionary result");
                }
            } catch (error) {
                console.error("Lookup error:", error);
                this.showError("Lookup failed: " + error.message);
                new Notice("Lookup failed: " + error.message);
            } finally {
                this.isLookingUp = false;
            }
        });
    }

    showLoading(term) {
        this.resultContainer.innerHTML = `
            <div class="lookup-loading">
                <div class="loading-spinner"></div>
                <p>Looking up "<strong>${term}</strong>"...</p>
            </div>
        `;
    }

    showError(message) {
        this.resultContainer.innerHTML = `
            <div class="lookup-error">
                <p>❌ ${message}</p>
            </div>
        `;
    }

    displayResult(result) {
        // Tạo HTML hiển thị kết quả
        const html = `
            <div class="dictionary-entry">
                <div class="word-header">
                    <h3 class="word-term">${result.Term}</h3>
                    <span class="word-type">${result.Type || ''}</span>
                </div>
                
                <div class="pronunciation">
                    <span class="ipa">${result.IPA}</span>
                    <button class="audio-btn" id="pronunciation-audio">🔊</button>
                </div>
                
                <div class="definitions">
                    <div class="definition-section">
                        <h4>Definition</h4>
                        <p>${result.Definition}</p>
                    </div>
                    
                    <div class="vietnamese-section">
                        <h4>Vietnamese</h4>
                        <p>${result.Vietnamese}</p>
                    </div>
                </div>
                
                <div class="examples">
                    <h4>Examples</h4>
                    <div class="example-list">
                        ${(result.Examples || []).map((example, index) => `
                            <div class="example-item">
                                <p>${example}</p>
                                <button class="audio-btn example-audio" data-index="${index}">🔊</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="synonyms-antonyms">
                    ${result.Synonyms && result.Synonyms.length > 0 ? `
                        <div class="synonyms">
                            <h4>Synonyms</h4>
                            <p>${result.Synonyms.join(', ')}</p>
                        </div>
                    ` : ''}
                    
                    ${result.Antonyms && result.Antonyms.length > 0 ? `
                        <div class="antonyms">
                            <h4>Antonyms</h4>
                            <p>${result.Antonyms.join(', ')}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="actions">
                    <button class="save-btn">💾 Save to Note</button>
                    <button class="anki-btn">📚 Add to Anki</button>
                </div>
            </div>
        `;
        
        this.resultContainer.innerHTML = html;
        
        // Bind sự kiện cho các nút
        this.bindAudioEvents(result);
        this.bindActionEvents(result);
    }

    bindAudioEvents(result) {
        // Nút phát âm chính
        const pronunciationBtn = this.resultContainer.querySelector('#pronunciation-audio');
        if (pronunciationBtn) {
            pronunciationBtn.addEventListener('click', () => {
                this.playAudio(result.Term, 'pronunciation');
            });
        }

        // Nút phát âm ví dụ  
        const exampleBtns = this.resultContainer.querySelectorAll('.example-audio');
        exampleBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const example = result.Examples[index];
                if (example) {
                    this.playAudio(example, 'example');
                }
            });
        });
    }

    bindActionEvents(result) {
        // Nút save
        const saveBtn = this.resultContainer.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveToNote(result);
            });
        }

        // Nút Anki
        const ankiBtn = this.resultContainer.querySelector('.anki-btn');
        if (ankiBtn) {
            ankiBtn.addEventListener('click', () => {
                this.addToAnki(result);
            });
        }
    }

    generateAudio(result) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = this.plugin.settings;
                
                if (settings.audioSource === "local_tts") {
                    // Kiểm tra Local TTS service
                    const isRunning = yield this.localTtsService.checkServiceStatus();
                    if (isRunning) {
                        // Tạo audio cho từ chính
                        yield this.localTtsService.generateAudio(result.Term, settings.ttsVoice, settings.audioQuality);
                        
                        // Tạo audio cho ví dụ (tùy chọn)
                        for (const example of result.Examples || []) {
                            yield this.localTtsService.generateAudio(example, settings.ttsVoice, settings.audioQuality);
                        }
                    }
                }
            } catch (error) {
                console.log("Audio generation failed:", error);
            }
        });
    }

    playAudio(text, type) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = this.plugin.settings;
                
                if (settings.audioSource === "local_tts") {
                    const isRunning = yield this.localTtsService.checkServiceStatus();
                    if (isRunning) {
                        yield this.localTtsService.speak(text, settings.ttsVoice);
                    } else {
                        new Notice("Local TTS service not running");
                    }
                } else {
                    // Fallback to browser speech synthesis
                    if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(text);
                        speechSynthesis.speak(utterance);
                    }
                }
            } catch (error) {
                console.error("Audio playback failed:", error);
                new Notice("Audio playback failed");
            }
        });
    }

    // Helper method to ensure folder exists
    ensureFolderExists(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (!folder) {
                    yield this.app.vault.createFolder(folderPath);
                    console.log(`Created folder: ${folderPath}`);
                }
            } catch (error) {
                console.log(`Folder ${folderPath} already exists or creation failed:`, error);
            }
        });
    }

    // Helper method to create audio file and return filename
    createAudioFile(text, type = 'pronunciation') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = this.plugin.settings;
                let audioBlob = null;
                
                if (settings.audioSource === "local_tts") {
                    const isRunning = yield this.localTtsService.checkServiceStatus();
                    if (isRunning) {
                        audioBlob = yield this.localTtsService.generateAudio(text, settings.ttsVoice, settings.audioQuality);
                    }
                }
                
                // Fallback to Azure TTS if local fails
                if (!audioBlob && settings.azureApiKey && settings.audioSource !== "local_tts") {
                    audioBlob = yield this.azureTtsService.generateAudio(text, settings.azureApiKey);
                }
                
                if (audioBlob) {
                    // Ensure Audio folder exists
                    yield this.ensureFolderExists('Audio');
                    
                    // Create unique filename in Audio folder
                    const timestamp = Date.now();
                    const sanitizedText = text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
                    const filename = `Audio/audio_${type}_${sanitizedText}_${timestamp}.mp3`;
                    
                    // Convert blob to array buffer
                    const arrayBuffer = yield audioBlob.arrayBuffer();
                    
                    // Save file to vault in Audio folder
                    yield this.app.vault.createBinary(filename, arrayBuffer);
                    
                    return filename;
                }
                
                return null;
            } catch (error) {
                console.error("Failed to create audio file:", error);
                return null;
            }
        });
    }

    saveToNote(result) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                new Notice("Creating note with audio files...");
                
                // Ensure Vocabulary folder exists
                yield this.ensureFolderExists('Vocabulary');
                
                // Generate audio files
                const ipaAudioFile = yield this.createAudioFile(result.Term, 'ipa');
                const exampleAudioFiles = [];
                
                // Generate audio for examples if TTS is enabled
                if (this.plugin.settings.ttsEnabled && result.Examples && result.Examples.length > 0) {
                    for (let i = 0; i < result.Examples.length; i++) {
                        const example = result.Examples[i];
                        // Remove markdown formatting for TTS
                        const cleanExample = example.replace(/\*\*([^*]+)\*\*/g, '$1');
                        const audioFile = yield this.createAudioFile(cleanExample, `example_${i + 1}`);
                        exampleAudioFiles.push(audioFile);
                    }
                }
                
                // Create clean note template without Audio Files section
                const template = `# ${result.Term}

**Definition:** ${result.Definition}
**Vietnamese:** ${result.Vietnamese}
**IPA:** ${result.IPA} ${ipaAudioFile ? `🎙️ ![[${ipaAudioFile}]]` : ''}
**Type:** ${result.Type}

## Synonyms
${(result.Synonyms || []).join(', ')}

## Antonyms  
${(result.Antonyms || []).join(', ')}

## Examples
${(result.Examples || []).map((ex, i) => {
    const audioEmbed = exampleAudioFiles[i] ? ` ![[${exampleAudioFiles[i]}]]` : '';
    return `${i + 1}. ${ex}${audioEmbed}`;
}).join('\n')}

**Source:** LLM Dictionary  
**Date:** ${new Date().toISOString().split('T')[0]}
`;

                // Save note in Vocabulary folder
                const fileName = `Vocabulary/Dictionary - ${result.Term}.md`;
                yield this.app.vault.create(fileName, template);
                
                const audioCount = (ipaAudioFile ? 1 : 0) + exampleAudioFiles.filter(f => f).length;
                new Notice(`Saved to ${fileName} with ${audioCount} audio files in Audio folder`);
                
            } catch (error) {
                console.error("Save failed:", error);
                new Notice("Failed to save note: " + error.message);
            }
        });
    }

    addToAnki(result) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.plugin.settings.anki) {
                    new Notice("Anki integration not enabled");
                    return;
                }

                const fields = {
                    'Front': result.Term,
                    'Back': result.Definition,
                    'Vietnamese': result.Vietnamese,
                    'IPA': result.IPA,
                    'Examples': (result.Examples || []).join('\n'),
                    'Synonyms': (result.Synonyms || []).join(', ')
                };

                yield this.ankiService.addNote('Default', 'Basic', fields);
                new Notice("Added to Anki");
            } catch (error) {
                console.error("Anki export failed:", error);
                new Notice("Failed to add to Anki");
            }
        });
    }
}

class LLMDictionaryPlugin extends Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();

            // Đăng ký view - Update to pass this (plugin instance) to the view
            this.registerView(
                DICTIONARY_VIEW_TYPE,
                (leaf) => new DictionaryView(leaf, this)
            );

            // Thêm command tra cứu từ
            this.addCommand({
                id: 'lookup-word',
                name: 'Look up selected text',
                hotkeys: [{ modifiers: ['Ctrl'], key: 'd' }],
                callback: () => {
                    this.lookupSelectedText();
                }
            });

            // Thêm command mở dictionary view
            this.addCommand({
                id: 'open-dictionary-view',
                name: 'Open Dictionary View',
                callback: () => {
                    this.activateView();
                }
            });

            // Thêm settings tab
            this.addSettingTab(new LLMDictionarySettingTab(this.app, this));

            console.log('LLM Dictionary Plugin loaded');
        });
    }

    lookupSelectedText() {
        return __awaiter(this, void 0, void 0, function* () {
            // Lấy text được chọn
            const activeLeaf = this.app.workspace.activeLeaf;
            let selectedText = '';

            if (activeLeaf && activeLeaf.view.editor) {
                // Markdown editor
                selectedText = activeLeaf.view.editor.getSelection();
            } else {
                // Fallback to window selection
                const selection = window.getSelection();
                selectedText = selection.toString();
            }

            if (!selectedText || selectedText.trim().length === 0) {
                new Notice("No text selected for lookup");
                return;
            }

            // Mở hoặc tìm dictionary view
            yield this.activateView();
            
            // Thực hiện tra cứu
            const view = this.getDictionaryView();
            if (view) {
                yield view.lookupWord(selectedText.trim());
            }
        });
    }

    activateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            
            let leaf = null;
            const leaves = workspace.getLeavesOfType(DICTIONARY_VIEW_TYPE);
            
            if (leaves.length > 0) {
                // Nếu đã có view, kích hoạt nó
                leaf = leaves[0];
            } else {
                // Tạo view mới ở sidebar phải
                leaf = workspace.getRightLeaf(false);
                yield leaf.setViewState({ type: DICTIONARY_VIEW_TYPE, active: true });
            }
            
            // Kích hoạt view
            workspace.revealLeaf(leaf);
            return leaf;
        });
    }

    getDictionaryView() {
        const leaves = this.app.workspace.getLeavesOfType(DICTIONARY_VIEW_TYPE);
        if (leaves.length > 0) {
            return leaves[0].view;
        }
        return null;
    }

    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }

    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}

class LLMDictionarySettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const containerEl = this.containerEl;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'LLM Dictionary - Local TTS Edition' });

        new Setting(containerEl)
            .setName('Groq API Key')
            .setDesc('Get your free API key from console.groq.com')
            .addText((text) => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.llmkey)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.llmkey = value;
                    yield this.plugin.saveSettings();
                })));

        new Setting(containerEl)
            .setName('Definition Language')
            .setDesc('Language for word definitions')
            .addDropdown((dropdown) => dropdown
                .addOption('English', 'English')
                .addOption('Vietnamese', 'Vietnamese')
                .addOption('Chinese', 'Chinese')
                .addOption('Korean', 'Korean')
                .addOption('Japanese', 'Japanese')
                .setValue(this.plugin.settings.def)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.def = value;
                    yield this.plugin.saveSettings();
                })));

        new Setting(containerEl)
            .setName('Audio Source')
            .setDesc('Choose audio generation method')
            .addDropdown((dropdown) => dropdown
                .addOption('local_tts', 'Local TTS Service (Recommended)')
                .addOption('local_first', 'Local TTS → Azure Fallback')
                .addOption('azure_tts', 'Azure TTS Only')
                .setValue(this.plugin.settings.audioSource || 'local_tts')
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.audioSource = value;
                    yield this.plugin.saveSettings();
                })));

        new Setting(containerEl)
            .setName('TTS Voice')
            .setDesc('Voice model for local TTS service')
            .addDropdown((dropdown) => dropdown
                .addOption('en-us', 'English (US)')
                .addOption('en-uk', 'English (UK)')
                .addOption('en-au', 'English (Australia)')
                .setValue(this.plugin.settings.ttsVoice || 'en-us')
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.ttsVoice = value;
                    yield this.plugin.saveSettings();
                })));

        new Setting(containerEl)
            .setName('Audio Quality')
            .setDesc('Quality level for generated audio')
            .addDropdown((dropdown) => dropdown
                .addOption('high', 'High Quality (Recommended)')
                .addOption('medium', 'Medium Quality (Faster)')
                .addOption('low', 'Low Quality (Fastest)')
                .setValue(this.plugin.settings.audioQuality || 'high')
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.audioQuality = value;
                    yield this.plugin.saveSettings();
                })));

        new Setting(containerEl)
            .setName('Azure API Key (Optional)')
            .setDesc('Azure Speech Services API key for fallback TTS (5000 free requests/month)')
            .addText((text) => text
                .setPlaceholder('Enter Azure API key (optional)')
                .setValue(this.plugin.settings.azureApiKey || '')
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.azureApiKey = value;
                    yield this.plugin.saveSettings();
                })));

        new Setting(containerEl)
            .setName('Enable Text-to-Speech')
            .setDesc('Enable audio playback for pronunciations')
            .addToggle((toggle) => toggle
                .setValue(this.plugin.settings.ttsEnabled)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.ttsEnabled = value;
                    yield this.plugin.saveSettings();
                })));

        new Setting(containerEl)
            .setName('Enable Anki Integration')
            .setDesc('Export vocabulary to Anki (requires AnkiConnect)')
            .addToggle((toggle) => toggle
                .setValue(this.plugin.settings.anki)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.anki = value;
                    yield this.plugin.saveSettings();
                    
                    const ankiSections = document.querySelectorAll('.anki-section');
                    ankiSections.forEach((section) => {
                        section.style.display = value ? 'block' : 'none';
                    });
                    
                    if (value) {
                        new Notice('Anki integration enabled. Make sure AnkiConnect addon is installed.');
                    }
                })));

        // Local TTS explanation
        const localTtsExplanation = containerEl.createEl('div', { cls: 'setting-item-description' });
        localTtsExplanation.innerHTML = `
            <p><strong>Local TTS Service Benefits:</strong></p>
            <ul>
                <li><strong>✅ Completely Free:</strong> No API keys, no rate limits, unlimited usage</li>
                <li><strong>✅ High Quality:</strong> Neural TTS models with near-native pronunciation</li>
                <li><strong>✅ Offline:</strong> Works without internet after initial setup</li>
                <li><strong>✅ Fast:</strong> Generate audio locally, no network delays</li>
                <li><strong>✅ Privacy:</strong> No data sent to external services</li>
                <li><strong>✅ Customizable:</strong> Multiple voice models and quality settings</li>
            </ul>
        `;

        // Setup guide
        containerEl.createEl('h3', { text: 'Local TTS Setup Guide' });
        const setupGuide = containerEl.createEl('div');
        setupGuide.innerHTML = `
            <p><strong>Quick Setup (5 minutes):</strong></p>
            <ol>
                <li>Go to TTS Service tab in plugin</li>
                <li>Click "Download Service Script"</li>
                <li>Run: <code>pip install TTS flask flask-cors</code></li>
                <li>Run: <code>python tts-service.py</code></li>
                <li>Service starts on localhost:6789</li>
                <li>Generate unlimited high-quality audio!</li>
            </ol>
            <p><em>First run downloads TTS models (~500MB). Subsequent runs are instant.</em></p>
        `;

        // Azure fallback section
        containerEl.createEl('h3', { text: 'Azure TTS Fallback (Optional)' });
        const azureDesc = containerEl.createEl('div');
        azureDesc.innerHTML = `
            <p><strong>Azure Speech Services (Optional Fallback):</strong></p>
            <ul>
                <li>✅ 5,000 free requests per month (no credit card required)</li>
                <li>✅ Professional neural voices</li>
                <li>✅ Automatic fallback if local service unavailable</li>
                <li>📋 Setup: Register at <a href="https://portal.azure.com">portal.azure.com</a></li>
            </ul>
        `;
    }
}

// IMPORTANT: Correct module export for Obsidian
module.exports = LLMDictionaryPlugin;
