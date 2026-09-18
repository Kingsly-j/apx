import type { NextRequest } from 'next/server';
import { buildAnswerForQuestion, buildSupportFallback, isHumanEscalationRequired } from '@/lib/live-chat';

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = 'grok-2-latest';

function normalizeAiText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item && typeof (item as { text?: unknown }).text === 'string') {
          return (item as { text: string }).text;
        }
        return '';
      })
      .join(' ')
      .trim();
    return joined;
  }
  return '';
}

function parseXaiReply(payload: any): string {
  const messageContent = payload?.choices?.[0]?.message?.content;
  if (typeof messageContent === 'string') return messageContent.trim();
  return normalizeAiText(messageContent);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const question = String(body?.message ?? '').trim();
  const history = Array.isArray(body?.history) ? body.history : [];

  if (!question) {
    return Response.json({ answer: 'Please type your question and I will do my best to help.', needsHuman: false });
  }

  const fallback = buildSupportFallback(question);
  const faqAnswer = buildAnswerForQuestion(question);

  if (faqAnswer) {
    return Response.json({ answer: faqAnswer, needsHuman: false, adminContactHref: fallback.adminContactHref, adminEmail: fallback.adminEmail });
  }

  if (!process.env.XAI_API_KEY) {
    return Response.json(fallback);
  }

  try {
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0.2,
        max_tokens: 250,
        messages: [
          {
            role: 'system',
            content:
              'You are Bluecrest Logistics customer support. Answer simple customer questions about shipping, tracking, services, delivery timing, payment, customs, and contact options. Keep answers concise, friendly, and factual. If the user asks something outside your normal support scope, say that you are connecting them to the support team. Return valid JSON only in the format {"answer":"...","needsHuman":true|false}.',
          },
          ...history.slice(-6).map((entry: any) => ({
            role: entry?.role === 'assistant' ? 'assistant' : 'user',
            content: String(entry?.content ?? '').trim(),
          })),
          { role: 'user', content: question },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI request failed: ${response.status}`);
    }

    const payload = await response.json();
    const rawAnswer = parseXaiReply(payload);

    let parsed: { answer?: string; needsHuman?: boolean } | null = null;
    const trimmed = rawAnswer.trim();
    if (trimmed.startsWith('{')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        // ignore and fall back to text parsing below
      }
    }

    const answer = parsed?.answer || trimmed;
    const needsHuman = parsed?.needsHuman ?? isHumanEscalationRequired(answer);

    if (needsHuman) {
      return Response.json({
        ...fallback,
        answer: answer && answer.trim().length > 0 ? answer : fallback.answer,
        needsHuman: true,
      });
    }

    return Response.json({
      answer: answer || 'Thanks for reaching out. Our team can help with your shipment question.',
      needsHuman: false,
      adminContactHref: fallback.adminContactHref,
      adminEmail: fallback.adminEmail,
    });
  } catch (error) {
    console.error('Live chat xAI error:', error);
    return Response.json(fallback);
  }
}
