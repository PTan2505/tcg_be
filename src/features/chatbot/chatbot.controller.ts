import { Context } from 'hono';
import { chatbotService } from '../../shared/services/chatbot.service';

const systemPrompt = `Bạn là một trợ lý chuyên về trò chơi thẻ bài (TCG). Trả lời chỉ những câu hỏi liên quan đến trò chơi thẻ bài (ví dụ: luật chơi, cách xây deck, giá trị thẻ, nhận diện thẻ, mẹo chơi). Nếu câu hỏi không liên quan đến TCG, hãy trả lời ngắn gọn bằng tiếng Việt: "Xin lỗi, tôi chỉ trả lời các câu hỏi liên quan đến trò chơi thẻ bài." Luôn trả lời bằng tiếng Việt.`;

export async function streamChat(c: Context) {
  try {
    const req = await c.req.json().catch(() => null);
    const userQuestion = (req && req.question) || c.req.query('question') || '';

    if (!userQuestion || userQuestion.toString().trim() === '') {
      return c.json({ error: 'Thiếu trường `question`' }, 400);
    }

    // Build the full prompt
    const prompt = `${systemPrompt}\n\nNgười dùng hỏi: "${userQuestion.toString()}"\nTrả lời:`;

    // Prepare SSE response streaming JSON-framed events: start, token, complete, error

    const stream = new ReadableStream({
      async start(controller) {
        // Helper to enqueue a JSON SSE event
        const pushEvent = (obj: any) => {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
          } catch (e) {
            // ignore enqueue errors
          }
        };

        // Send initial 'start' event
        pushEvent({ type: 'start', timestamp: new Date().toISOString() });

        try {
          // Stream tokens via chatbotService.stream; on each token, emit a token event
          await chatbotService.stream(prompt, (token) => {
            pushEvent({ type: 'token', token, timestamp: new Date().toISOString() });
          });

          // When stream finishes, send completion metadata (example metadata similar to your sample)
          const completionData = {
            type: 'complete',
            timestamp: new Date().toISOString(),
          };
          pushEvent(completionData);
          controller.close();
        } catch (err: any) {
          // Send error event then close
          pushEvent({ type: 'error', message: err?.message || String(err || 'stream error'), timestamp: new Date().toISOString() });
          controller.close();
        }
      }
    });

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type'
    });

    return new Response(stream, { headers, status: 200 });
  } catch (err: any) {
    console.error('[CHATBOT] Error', err);
    return c.json({ error: err?.message || 'Internal error' }, 500);
  }
}
