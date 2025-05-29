import { App, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, TFile } from 'obsidian';

// Interfaces
interface LLMDictionarySettings {
	lang: string;
	voice: string;
	def: string;
	llmkey: string;
	activation: string;
	anki: boolean;
	ttsEnabled: boolean;
}

interface VocabularyData {
	Term: string;
	Part_of_speech: string;
	Definition: string;
	IPA: string;
	Examples: string[];
	Source: string;
	ID: string;
}

const DEFAULT_SETTINGS: LLMDictionarySettings = {
	lang: "English",
	voice: "en-US-AriaNeural",
	def: "English",
	llmkey: "",
	activation: "",
	anki: false,
	ttsEnabled: true
}

// TTS Configuration using Microsoft Edge API
class TTSService {
	private webSocket: WebSocket | null = null;
	private readonly baseUrl = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
	private readonly token = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

	async speak(text: string, voice: string = 'en-US-AriaNeural'): Promise<void> {
		try {
			// Fallback to Web Speech API for free TTS
			if ('speechSynthesis' in window) {
				const utterance = new SpeechSynthesisUtterance(text);
				const voices = speechSynthesis.getVoices();
				
				const selectedVoice = voices.find(v => 
					v.name.includes(voice) || v.lang.includes(voice.substring(0, 5))
				);
				
				if (selectedVoice) {
					utterance.voice = selectedVoice;
				}
				
				speechSynthesis.speak(utterance);
				return;
			}

			// If Web Speech API not available, try Edge TTS
			await this.edgeTTS(text, voice);
		} catch (error) {
			console.error('TTS Error:', error);
			new Notice('Text-to-speech failed');
		}
	}

	private async edgeTTS(text: string, voice: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const wsUrl = `wss://${this.baseUrl}/edge/v1?TrustedClientToken=${this.token}`;
			const ws = new WebSocket(wsUrl);
			
			ws.onopen = () => {
				const configMessage = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{
					"context": {
						"synthesis": {
							"audio": {
								"metadataoptions": {
									"sentenceBoundaryEnabled": "false",
									"wordBoundaryEnabled": "false"
								},
								"outputFormat": "audio-24khz-48kbitrate-mono-mp3"
							}
						}
					}
				}`;
				
				ws.send(configMessage);
				
				const requestId = this.generateRequestId();
				const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
					<voice name="${voice}">
						<prosody rate="0%" pitch="0%" volume="0%">
							${text}
						</prosody>
					</voice>
				</speak>`;
				
				const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
				ws.send(ssmlMessage);
			};

			ws.onmessage = (event) => {
				if (typeof event.data === 'string') {
					if (event.data.includes('Path:turn.end')) {
						ws.close();
						resolve();
					}
				} else {
					// Audio data received - could play it here
					const audio = new Audio();
					const blob = new Blob([event.data], { type: 'audio/mp3' });
					audio.src = URL.createObjectURL(blob);
					audio.play();
				}
			};

			ws.onerror = (error) => {
				reject(error);
			};
		});
	}

	private generateRequestId(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = Math.random() * 16 | 0;
			const v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}
}

// AI Chat Service
class AIService {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	async lookupWord(apiKey: string, term: string, context: string, targetLang: string): Promise<VocabularyData | null> {
		const payload = {
			messages: [
				{
					role: "system",
					content: 'Act like an English dictionary. Response in JSON format with "Term", "Part_of_speech", "Definition", "IPA", "Examples". The term should be lemmatised. Provide three examples using the term in bold.'
				},
				{
					role: "user",
					content: `The definition and Part of speech are in ${targetLang}\nTerm: ${term}\nContext: ${context}`
				}
			],
			model: "llama3-70b-8192",
			temperature: 0,
			max_tokens: 1024,
			top_p: 1,
			stream: true,
			stop: null
		};

		try {
			const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json"
				},
				method: "POST",
				body: JSON.stringify(payload)
			});

			const text = await response.text();
			const lines = text.trim().split('\n');
			let result = '';

			lines.forEach(line => {
				const jsonStart = line.indexOf('{');
				if (jsonStart !== -1) {
					try {
						const jsonPart = line.substring(jsonStart);
						const parsed = JSON.parse(jsonPart);
						if (parsed.choices?.[0]?.delta?.content) {
							result += parsed.choices[0].delta.content;
						}
					} catch (e) {
						// ignore parsing errors
					}
				}
			});

			if (result) {
				const data = JSON.parse(result) as VocabularyData;
				data.Source = `[[${this.app.workspace.getActiveFile()?.basename || 'Unknown'}]]`;
				data.ID = `${Date.now()}`;
				return data;
			}
		} catch (error) {
			console.error('AI Service Error:', error);
			new Notice('Failed to lookup word');
		}

		return null;
	}
}

// Dictionary View
const DICTIONARY_VIEW_TYPE = "llm-dictionary-view";

class DictionaryView extends ItemView {
	private ttsService: TTSService;
	private aiService: AIService;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.ttsService = new TTSService();
		this.aiService = new AIService(this.app);
	}

	getViewType() {
		return DICTIONARY_VIEW_TYPE;
	}

	getDisplayText() {
		return "LLM Dictionary";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('llm-dictionary-view');
		
		const viewDiv = container.createEl("div", { cls: "dictionary-view-content" });
		viewDiv.innerHTML = `
			<div class="tab-container">
				<div class="tab-bar">
					<button class="tab-link active" data-tab="dictionary">Dictionary</button>
					<button class="tab-link" data-tab="save">Save</button>
				</div>
				<div id="dictionary-tab" class="tab-content active">
					<div id="dictionary-container"></div>
				</div>
				<div id="save-tab" class="tab-content">
					<div class="save-section">
						<h3>Save Options</h3>
						<button id="dict-save" class="save-btn">Save to Obsidian</button>
						<div class="input-group">
							<label>Note Name Template:</label>
							<input id="dict-note-name" placeholder="Vocabulary/{{Term}}.md" class="dict-input"/>
						</div>
						<div class="input-group">
							<label>Audio Folder:</label>
							<input id="dict-note-audio" placeholder="Vocabulary/Audio" class="dict-input"/>
						</div>
						<div class="input-group">
							<label>Note Template:</label>
							<textarea id="dict-note-content" class="dict-textarea" placeholder="# {{Term}}

**Definition:** {{Definition}}
**IPA:** {{IPA}}
**Part of Speech:** {{Part_of_speech}}

## Examples
1. {{Example 1}}
2. {{Example 2}}
3. {{Example 3}}

**Source:** {{Source}}"></textarea>
						</div>
						<div class="field-info">
							<h4>Available Fields:</h4>
							<p>{{Term}}, {{Definition}}, {{IPA}}, {{Part_of_speech}}, {{Example 1}}, {{Example 2}}, {{Example 3}}, {{Source}}, {{Audio}}</p>
						</div>
					</div>
				</div>
			</div>
		`;

		this.setupEventListeners();
		this.addStyles();
	}

	private setupEventListeners() {
		// Tab switching
		this.containerEl.addEventListener('click', (e: Event) => {
			const target = e.target as HTMLElement;
			
			if (target.classList.contains('tab-link')) {
				const tabName = target.getAttribute('data-tab');
				if (tabName) {
					this.switchTab(tabName);
				}
			}
			
			if (target.id === 'dict-save') {
				this.saveVocabulary();
			}
			
			if (target.classList.contains('dict-audio-btn')) {
				const text = target.getAttribute('data-text') || '';
				this.ttsService.speak(text);
			}
			
			if (target.classList.contains('delete-btn')) {
				const callout = target.closest('.vocabulary-item');
				if (callout) {
					callout.remove();
				}
			}
		});
	}

	private switchTab(tabName: string) {
		// Remove active class from all tabs and contents
		this.containerEl.querySelectorAll('.tab-link').forEach((tab: Element) => {
			tab.removeClass('active');
		});
		this.containerEl.querySelectorAll('.tab-content').forEach((content: Element) => {
			content.removeClass('active');
		});

		// Add active class to selected tab and content
		const selectedTab = this.containerEl.querySelector(`[data-tab="${tabName}"]`);
		const selectedContent = this.containerEl.querySelector(`#${tabName}-tab`);
		
		if (selectedTab && selectedContent) {
			selectedTab.addClass('active');
			selectedContent.addClass('active');
		}
	}

	async addVocabularyItem(data: VocabularyData, settings: LLMDictionarySettings) {
		const container = this.containerEl.querySelector('#dictionary-container');
		if (!container) return;

		const item = container.createEl('div', { cls: 'vocabulary-item' });
		
		const audioBtn = settings.ttsEnabled ? 
			`<button class="dict-audio-btn" data-text="${data.Term}" title="Play pronunciation">🔊</button>` : '';
		
		item.innerHTML = `
			<div class="vocab-header">
				<h3 class="vocab-term">${audioBtn} ${data.Term}</h3>
				<button class="delete-btn" title="Remove">✕</button>
			</div>
			<div class="vocab-details">
				<div class="vocab-ipa">${data.IPA}</div>
				<div class="vocab-pos">${data.Part_of_speech}</div>
				<div class="vocab-definition">${data.Definition}</div>
			</div>
			<div class="vocab-examples">
				<h4>Examples:</h4>
				<ul>
					${data.Examples.map(example => {
						const audioBtn = settings.ttsEnabled ? 
							`<button class="dict-audio-btn example-audio" data-text="${example.replace(/\*\*/g, '')}" title="Play example">🔊</button>` : '';
						return `<li>${audioBtn} ${example}</li>`;
					}).join('')}
				</ul>
			</div>
		`;

		item.setAttribute('data-vocab', JSON.stringify(data));
		container.insertBefore(item, container.firstChild);
	}

	private async saveVocabulary() {
		const container = this.containerEl.querySelector('#dictionary-container');
		if (!container) return;

		const items = container.querySelectorAll('.vocabulary-item');
		if (items.length === 0) {
			new Notice('No vocabulary items to save');
			return;
		}

		const noteNameInput = this.containerEl.querySelector('#dict-note-name') as HTMLInputElement;
		const noteContentInput = this.containerEl.querySelector('#dict-note-content') as HTMLTextAreaElement;
		
		const noteNameTemplate = noteNameInput?.value || 'Vocabulary/{{Term}}.md';
		const noteContentTemplate = noteContentInput?.value || '# {{Term}}\n\n**Definition:** {{Definition}}';

		for (const item of Array.from(items)) {
			const dataStr = item.getAttribute('data-vocab');
			if (!dataStr) continue;

			try {
				const data = JSON.parse(dataStr) as VocabularyData;
				
				let noteName = noteNameTemplate;
				let noteContent = noteContentTemplate;

				// Replace template fields
				const replacements: Record<string, string> = {
					'{{Term}}': data.Term,
					'{{Definition}}': data.Definition,
					'{{IPA}}': data.IPA,
					'{{Part_of_speech}}': data.Part_of_speech,
					'{{Example 1}}': data.Examples[0] || '',
					'{{Example 2}}': data.Examples[1] || '',
					'{{Example 3}}': data.Examples[2] || '',
					'{{Source}}': data.Source
				};

				for (const [key, value] of Object.entries(replacements)) {
					const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
					noteName = noteName.replace(regex, value);
					noteContent = noteContent.replace(regex, value);
				}

				// Create the note
				const file = await this.app.vault.create(noteName, noteContent);
				new Notice(`Saved: ${file.basename}`);
				
				// Remove the item after saving
				item.remove();
			} catch (error) {
				console.error('Failed to save vocabulary item:', error);
				new Notice('Failed to save vocabulary item');
			}
		}
	}

	private addStyles() {
		const style = document.createElement('style');
		style.textContent = `
			.llm-dictionary-view {
				padding: 10px;
			}
			
			.tab-container {
				height: 100%;
				display: flex;
				flex-direction: column;
			}
			
			.tab-bar {
				display: flex;
				border-bottom: 1px solid var(--background-modifier-border);
				margin-bottom: 10px;
			}
			
			.tab-link {
				padding: 8px 16px;
				border: none;
				background: transparent;
				cursor: pointer;
				border-bottom: 2px solid transparent;
				color: var(--text-muted);
			}
			
			.tab-link.active {
				color: var(--text-normal);
				border-bottom-color: var(--interactive-accent);
			}
			
			.tab-content {
				flex: 1;
				display: none;
			}
			
			.tab-content.active {
				display: block;
			}
			
			.vocabulary-item {
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				padding: 12px;
				margin-bottom: 10px;
				background: var(--background-secondary);
			}
			
			.vocab-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 8px;
			}
			
			.vocab-term {
				margin: 0;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			
			.delete-btn {
				background: transparent;
				border: none;
				color: var(--text-muted);
				cursor: pointer;
				font-size: 16px;
				padding: 4px;
			}
			
			.delete-btn:hover {
				color: var(--text-error);
			}
			
			.dict-audio-btn {
				background: transparent;
				border: none;
				cursor: pointer;
				font-size: 14px;
				padding: 2px;
				color: var(--interactive-accent);
			}
			
			.dict-audio-btn:hover {
				opacity: 0.7;
			}
			
			.vocab-ipa {
				font-style: italic;
				color: var(--text-muted);
				margin-bottom: 4px;
			}
			
			.vocab-pos {
				font-size: 0.9em;
				color: var(--text-accent);
				margin-bottom: 8px;
			}
			
			.vocab-definition {
				margin-bottom: 10px;
			}
			
			.vocab-examples h4 {
				margin: 0 0 6px 0;
				font-size: 0.9em;
			}
			
			.vocab-examples ul {
				margin: 0;
				padding-left: 20px;
			}
			
			.vocab-examples li {
				margin-bottom: 4px;
				display: flex;
				align-items: center;
				gap: 6px;
			}
			
			.save-section {
				padding: 10px;
			}
			
			.save-btn {
				background: var(--interactive-accent);
				color: var(--text-on-accent);
				border: none;
				padding: 8px 16px;
				border-radius: 4px;
				cursor: pointer;
				margin-bottom: 16px;
			}
			
			.input-group {
				margin-bottom: 12px;
			}
			
			.input-group label {
				display: block;
				margin-bottom: 4px;
				font-weight: 500;
			}
			
			.dict-input, .dict-textarea {
				width: 100%;
				padding: 6px 8px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				background: var(--background-primary);
				color: var(--text-normal);
			}
			
			.dict-textarea {
				min-height: 100px;
				resize: vertical;
				font-family: var(--font-monospace);
			}
			
			.field-info {
				margin-top: 16px;
				padding: 10px;
				background: var(--background-secondary);
				border-radius: 4px;
			}
			
			.field-info h4 {
				margin: 0 0 6px 0;
			}
			
			.field-info p {
				margin: 0;
				font-size: 0.9em;
				color: var(--text-muted);
			}
		`;
		
		document.head.appendChild(style);
	}

	async onClose() {
		// Cleanup
	}
}

// Main Plugin Class
export default class LLMDictionaryPlugin extends Plugin {
	settings!: LLMDictionarySettings;
	public ttsService!: TTSService;
	private aiService!: AIService;

	async onload() {
		await this.loadSettings();
		
		this.ttsService = new TTSService();
		this.aiService = new AIService(this.app);

		// Register view
		this.registerView(
			DICTIONARY_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new DictionaryView(leaf)
		);

		// Add commands
		this.addCommand({
			id: 'look-up',
			name: 'Look up selected text',
			callback: async () => {
				await this.activateView();
				await this.lookUpTerm();
			}
		});

		this.addCommand({
			id: 'speak-selection',
			name: 'Speak selected text',
			callback: async () => {
				const selection = window.getSelection();
				if (selection && selection.toString().trim()) {
					await this.ttsService.speak(selection.toString().trim(), this.settings.voice);
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new LLMDictionarySettingTab(this.app, this));

		// Add ribbon icon
		this.addRibbonIcon('book-open', 'LLM Dictionary', () => {
			this.activateView();
		});
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(DICTIONARY_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(true);
			if (leaf) {
				await leaf.setViewState({ type: DICTIONARY_VIEW_TYPE, active: true });
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async lookUpTerm() {
		if (!this.settings.llmkey) {
			new Notice('Please set your Groq API key in settings');
			return;
		}

		const selection = window.getSelection();
		let term = "";
		let context = "";

		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			term = selection.toString().trim();
			
			const container = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
				? range.commonAncestorContainer.parentNode as Element
				: range.commonAncestorContainer as Element;
			
			context = container.textContent?.replace(/\n/g, " ").trim() || "";
			if (context === term && container.parentElement) {
				context = container.parentElement.textContent?.replace(/\n/g, " ").trim() || "";
			}
		}

		if (!term) {
			new Notice('Please select a word or phrase to look up');
			return;
		}

		new Notice('Looking up: ' + term);

		const data = await this.aiService.lookupWord(
			this.settings.llmkey, 
			term, 
			context, 
			this.settings.def
		);

		if (data) {
			const view = this.app.workspace.getLeavesOfType(DICTIONARY_VIEW_TYPE)[0]?.view as DictionaryView;
			if (view) {
				await view.addVocabularyItem(data, this.settings);
			}
		}
	}

	onunload() {
		// Cleanup
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Settings Tab
class LLMDictionarySettingTab extends PluginSettingTab {
	plugin: LLMDictionaryPlugin;

	constructor(app: App, plugin: LLMDictionaryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'LLM Dictionary Settings' });

		new Setting(containerEl)
			.setName('Groq API Key')
			.setDesc('Get your free API key from console.groq.com')
			.addText((text) => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.llmkey)
				.onChange(async (value: string) => {
					this.plugin.settings.llmkey = value;
					await this.plugin.saveSettings();
				}));

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
				.onChange(async (value: string) => {
					this.plugin.settings.def = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Voice for TTS')
			.setDesc('Text-to-speech voice selection')
			.addDropdown((dropdown) => dropdown
				.addOption('en-US-AriaNeural', 'English (US) - Aria')
				.addOption('en-GB-SoniaNeural', 'English (UK) - Sonia')
				.addOption('en-AU-NatashaNeural', 'English (AU) - Natasha')
				.addOption('zh-CN-XiaoxiaoNeural', 'Chinese (CN) - Xiaoxiao')
				.addOption('ja-JP-NanamiNeural', 'Japanese - Nanami')
				.addOption('ko-KR-SunHiNeural', 'Korean - SunHi')
				.addOption('vi-VN-HoaiMyNeural', 'Vietnamese - HoaiMy')
				.setValue(this.plugin.settings.voice)
				.onChange(async (value: string) => {
					this.plugin.settings.voice = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Text-to-Speech')
			.setDesc('Enable audio playback for pronunciations')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.ttsEnabled)
				.onChange(async (value: boolean) => {
					this.plugin.settings.ttsEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Anki Integration')
			.setDesc('Export vocabulary to Anki (requires AnkiConnect)')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.anki)
				.onChange(async (value: boolean) => {
					this.plugin.settings.anki = value;
					await this.plugin.saveSettings();
				}));

		// Test TTS section
		containerEl.createEl('h3', { text: 'Test Text-to-Speech' });
		
		const testDiv = containerEl.createEl('div', { cls: 'tts-test-section' });
		const testInput = testDiv.createEl('input', {
			type: 'text',
			placeholder: 'Enter text to test pronunciation...',
			value: 'Hello, this is a test of the text-to-speech feature.'
		});
		
		const testBtn = testDiv.createEl('button', { text: 'Test Voice' });
		testBtn.onclick = () => {
			if (testInput.value.trim()) {
				this.plugin.ttsService.speak(testInput.value.trim(), this.plugin.settings.voice);
			}
		};

		// Add some styling
		const style = containerEl.createEl('style');
		style.textContent = `
			.tts-test-section {
				display: flex;
				gap: 10px;
				margin-top: 10px;
				align-items: center;
			}
			
			.tts-test-section input {
				flex: 1;
				padding: 6px 8px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				background: var(--background-primary);
				color: var(--text-normal);
			}
			
			.tts-test-section button {
				padding: 6px 12px;
				background: var(--interactive-accent);
				color: var(--text-on-accent);
				border: none;
				border-radius: 4px;
				cursor: pointer;
			}
		`;
	}
}
