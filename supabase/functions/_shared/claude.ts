import Anthropic from 'npm:@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const MODEL = 'claude-opus-5-5'

type Effort = 'low' | 'medium' | 'high'

/** One Claude call constrained to a JSON schema; returns the parsed object. */
export async function callJSON<T>(opts: {
  system: string
  user: string
  schema: Record<string, unknown>
  effort?: Effort
}): Promise<T> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: opts.effort ?? 'low',
      format: { type: 'json_schema', schema: opts.schema },
    },
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  } as never)
  const msg = await stream.finalMessage()

  if (msg.stop_reason === 'refusal') throw new Error('Claude declined this request')
  if (msg.stop_reason === 'max_tokens') throw new Error('Claude response was cut off (max_tokens)')

  const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  return JSON.parse(text) as T
}
