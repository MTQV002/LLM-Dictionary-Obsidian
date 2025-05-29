#!/usr/bin/env python3
"""
Lightweight TTS Service for LLM Dictionary
Uses Windows built-in voices - No Mozilla TTS dependencies!
"""

import pyttsx3
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tempfile
import os
import time

app = Flask(__name__)
CORS(app)

tts_engine = None
current_model = "pyttsx3_builtin"

def initialize_tts():
    global tts_engine
    try:
        print("📋 Initializing Windows TTS engine...")
        tts_engine = pyttsx3.init()
        
        # Configure voice
        voices = tts_engine.getProperty('voices')
        if voices:
            print(f"🎙️ Found {len(voices)} system voices")
            # Try to find English female voice
            for voice in voices:
                voice_name = voice.name.lower()
                if 'english' in voice_name or 'zira' in voice_name or 'hazel' in voice_name:
                    tts_engine.setProperty('voice', voice.id)
                    print(f"✅ Selected voice: {voice.name}")
                    break
            else:
                tts_engine.setProperty('voice', voices[0].id)
                print(f"✅ Selected default voice: {voices[0].name}")
        
        # Configure speech properties
        tts_engine.setProperty('rate', 180)    # Speed (words per minute)
        tts_engine.setProperty('volume', 0.9)  # Volume (0.0 to 1.0)
        
        print("✅ Lightweight TTS initialized successfully")
        return True
    except Exception as e:
        print(f"❌ TTS initialization failed: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'running',
        'model': current_model,
        'tts_loaded': tts_engine is not None,
        'engine': 'pyttsx3'
    })

@app.route('/voices', methods=['GET'])
def get_voices():
    """Return available system voices"""
    if tts_engine:
        try:
            voices = tts_engine.getProperty('voices')
            voice_list = []
            for voice in voices:
                voice_list.append({
                    'id': voice.id,
                    'name': voice.name,
                    'language': getattr(voice, 'languages', ['en'])
                })
            return jsonify(voice_list)
        except Exception as e:
            print(f"❌ Error getting voices: {e}")
    
    return jsonify([{
        'id': 'default',
        'name': 'System Default',
        'language': ['en']
    }])

@app.route('/synthesize', methods=['POST'])
def synthesize():
    global tts_engine
    
    if tts_engine is None:
        if not initialize_tts():
            return jsonify({'error': 'TTS not available'}), 500
    
    try:
        data = request.json
        text = data.get('text', '')
        format = data.get('format', 'wav')
        voice = data.get('voice', 'en-us')
        quality = data.get('quality', 'high')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        print(f"🎙️ Synthesizing: {text[:50]}...")
        
        # Create temporary file
        timestamp = str(int(time.time()))
        temp_filename = f"tts_audio_{timestamp}.{format}"
        with tempfile.NamedTemporaryFile(suffix=f'.{format}', delete=False) as tmp_file:
            temp_path = tmp_file.name
        
        # Generate audio with pyttsx3
        try:
            tts_engine.save_to_file(text, temp_path)
            tts_engine.runAndWait()
            
            # Wait a bit for file to be written
            time.sleep(0.5)
            
            # Check if file was created and has content
            if not os.path.exists(temp_path):
                return jsonify({'error': 'Audio file not created'}), 500
                
            file_size = os.path.getsize(temp_path)
            if file_size < 100:  # Less than 100 bytes probably means empty
                return jsonify({'error': f'Audio file too small ({file_size} bytes)'}), 500
            
            print(f"✅ Audio generated: {file_size} bytes")
            
            return send_file(
                temp_path,
                mimetype=f'audio/{format}',
                as_attachment=True,
                download_name=temp_filename
            )
            
        except Exception as e:
            print(f"❌ TTS generation error: {e}")
            return jsonify({'error': f'TTS generation failed: {str(e)}'}), 500
        
    except Exception as e:
        print(f"❌ Synthesis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/change_model', methods=['POST'])
def change_model():
    """Change voice model - for pyttsx3 compatibility"""
    global current_model
    
    try:
        data = request.json
        model_name = data.get('model', current_model)
        
        if tts_engine:
            voices = tts_engine.getProperty('voices')
            if voices:
                # Try to find requested voice
                for voice in voices:
                    if model_name.lower() in voice.name.lower():
                        tts_engine.setProperty('voice', voice.id)
                        current_model = voice.name
                        return jsonify({
                            'success': True,
                            'current_model': current_model
                        })
                
                # If not found, return available models
                return jsonify({
                    'success': False,
                    'message': 'Voice not found',
                    'available_models': [v.name for v in voices]
                })
        
        return jsonify({
            'success': True,
            'current_model': current_model
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    print("🚀 Starting Lightweight TTS Service...")
    print("🎙️ Using Windows built-in text-to-speech")
    
    if initialize_tts():
        print("✅ TTS Service ready!")
        print("🌐 Access at: http://localhost:6789")
        print("📖 Health check: http://localhost:6789/health")
        print("⏹️  Press Ctrl+C to stop")
        
        try:
            app.run(host='0.0.0.0', port=6789, debug=False)
        except KeyboardInterrupt:
            print("\n🛑 Service stopped by user")
    else:
        print("❌ Failed to start TTS service")
        print("💡 Make sure you have pyttsx3 installed: pip install pyttsx3")