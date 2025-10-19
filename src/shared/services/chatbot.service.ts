// Prefer runtime require so we can support multiple package names/installations
import { GoogleGenerativeAI } from '@google/generative-ai';

export class ChatbotService {
  private apiKey: string | undefined;
  private genAI: any;
  private model: any;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn('[CHATBOT] GEMINI_API_KEY not set');
    }

    try {
  this.genAI = new GoogleGenerativeAI(this.apiKey || '');
      // Use a responsive model similar to geminiAI.service
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    } catch (err) {
      console.warn('[CHATBOT] Failed to initialize GoogleGenerativeAI client:', err);
      this.genAI = null;
      this.model = null;
    }
  }

  async ask(prompt: string, maxOutputTokens = 512): Promise<string> {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY not configured');

    if (!this.model) throw new Error('Gemini model not initialized. Check GEMINI_API_KEY and client availability.');

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (typeof text === 'string') return text.trim();
      return JSON.stringify(response);
    } catch (err: any) {
      const msg = `Gemini client error: ${err?.message || String(err)}. Check GEMINI_API_KEY, model access, and Generative Language API enablement.`;
      throw new Error(msg);
    }
  }

  /**
   * Stream tokens in real-time. Calls onToken for each token/chunk received.
   * Falls back to generating full text and streaming by whitespace chunks when
   * the SDK does not expose a streaming API.
   */
  async stream(prompt: string, onToken: (token: string) => void): Promise<void> {
    if (!this.model) throw new Error('Gemini model not initialized. Check GEMINI_API_KEY and client availability.');

    // If the model exposes a streaming generator, use it.
    try {
      // Try common streaming method names used by various GenAI clients
      if (typeof this.model.generateStream === 'function') {
        const stream = this.model.generateStream(prompt);
        for await (const part of stream) {
          const token = (part && (part.delta || part.text || part.content)) || String(part || '');
          onToken(String(token));
        }
        return;
      }

      // Some clients return an async iterator from generateContent with a .stream or similar
      if (typeof this.model.generate === 'function') {
        // Attempt generic generate() streaming
        const gen = this.model.generate(prompt);
        if (gen && typeof gen[Symbol.asyncIterator] === 'function') {
          for await (const part of gen) {
            const token = (part && (part.delta || part.text || part.content)) || String(part || '');
            onToken(String(token));
          }
          return;
        }
      }

      // Fallback: call full generation and stream by whitespace tokens
      const full = await this.ask(prompt, 512);
      // Split by spaces to mimic token streaming roughly
      const tokens = full.split(/(\s+)/);
      // Emit tokens with a tiny delay to allow the server to flush chunks
      // progressively. Without a delay, many environments will buffer the
      // writes and the client will see all tokens at once.
      for (const t of tokens) {
        if (t.length === 0) continue;
        onToken(t);
        // small pause (15-30ms) — feels real-time but avoids high CPU
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      return;
    } catch (err) {
      // If streaming fails, rethrow to let caller handle
      throw err;
    }
  }
}

export const chatbotService = new ChatbotService();
