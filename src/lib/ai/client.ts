import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton — avoids throwing at build time when ANTHROPIC_API_KEY is not set
let _anthropic: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_, prop) {
    return Reflect.get(getAnthropicClient(), prop);
  },
});

export const AI_MODEL = "claude-sonnet-4-6";
