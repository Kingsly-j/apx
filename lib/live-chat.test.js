import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnswerForQuestion, buildSupportFallback, isHumanEscalationRequired } from './live-chat.js';

test('escales when the bot is uncertain or cannot answer', () => {
  assert.equal(isHumanEscalationRequired('I am not sure about that. Please contact support.'), true);
  assert.equal(isHumanEscalationRequired('Tracking updates can take up to 24 hours after dispatch.'), false);
  assert.equal(isHumanEscalationRequired('We offer domestic and international freight services.'), false);
});

test('answers a tracking question directly instead of escalating immediately', () => {
  const question = 'How do I track my shipment?';
  const answer = buildAnswerForQuestion(question);
  assert.ok(answer);
  assert.match(answer, /track/i);
  assert.equal(isHumanEscalationRequired(answer), false);
});

test('fallback includes a direct admin contact', () => {
  const result = buildSupportFallback('I need help with a customs issue.');
  assert.match(result.answer, /support team/i);
  assert.match(result.adminContactHref, /wa\.me\/19152019157/i);
  assert.equal(result.needsHuman, true);
});
