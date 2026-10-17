import OpenAI from 'npm:openai'

// One key for everything: Whisper transcription + memo tagging + chapter writing.
export const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const client = new OpenAI({ apiKey: OPENAI_API_KEY })

// Change models without redeploying: set OPENAI_MODEL / OPENAI_TRANSCRIBE_MODEL in Supabase secrets.
const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1'
export const TRANSCRIBE_MODEL = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'whisper-1'

/** One OpenAI call constrained to a JSON schema (strict structured output); returns the parsed object. */
export async function callJSON<T>(opts: {
  name: string
  system: string
  user: string
  schema: Record<string, unknown>
}): Promise<T> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set in Supabase secrets')

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: opts.name, strict: true, schema: opts.schema },
    },
  })

  const choice = res.choices[0]
  if (choice.message.refusal) throw new Error(`Model declined: ${choice.message.refusal}`)
  if (choice.finish_reason === 'length') throw new Error('Model response was cut off (length)')
  if (!choice.message.content) throw new Error('Model returned no content')
  return JSON.parse(choice.message.content) as T
}
