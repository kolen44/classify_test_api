import { Injectable, Logger } from '@nestjs/common';
import { ClassifyResult } from './interfaces/classify-result.interface';
import OpenAI from 'openai';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OpenAI API key not found, using fallback mode');
    }
  }

  private isValidResult(obj: any): obj is ClassifyResult {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      ['zip', 'brand', 'category', 'time_pref'].every((key) => key in obj)
    );
  }

  async classifyText(text: string): Promise<ClassifyResult> {
    if (!text || text.trim().length === 0) {
      this.logger.debug('Empty text received, returning default result');
      return { zip: '', brand: '', category: '', time_pref: '' };
    }

    if (this.openai) {
      const prompt = `
Extract the following fields from the text:
- zip (postal code)
- brand
- category
- time_pref
If a field is missing, leave it empty.
Return ONLY valid JSON:
{"zip": "string", "brand": "string", "category": "string", "time_pref": "string"}

Text:
${text}
`;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          this.logger.debug(`AI classification attempt ${attempt} started`);
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
          });

          const content = response.choices[0].message?.content?.trim();
          if (!content) throw new Error('Empty AI response');

          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found in AI output');

          const parsed = JSON.parse(jsonMatch[0]);
          if (this.isValidResult(parsed)) {
            this.logger.debug('AI classification successful');
            return {
              zip: parsed.zip || '',
              brand: parsed.brand || '',
              category: parsed.category || '',
              time_pref: parsed.time_pref || '',
            };
          }

          throw new Error('Invalid structure in AI output');
        } catch (err) {
          this.logger.warn(`AI classify attempt ${attempt} failed: ${err.message}`);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }
      }

      this.logger.error('All AI attempts failed, switching to fallback mode');
    }

    this.logger.debug('Using fallback regex classification');
    const zipMatch = text.match(/\b\d{5}\b/);
    const brandMatch = text.match(/brand:\s*(\w+)/i);
    const categoryMatch = text.match(/category:\s*(\w+)/i);
    const timePrefMatch = text.match(/time_pref:\s*(\w+)/i);

    const result = {
      zip: zipMatch?.[0] ?? '',
      brand: brandMatch?.[1] ?? '',
      category: categoryMatch?.[1] ?? '',
      time_pref: timePrefMatch?.[1] ?? '',
    };

    this.logger.debug(`Fallback classification result: ${JSON.stringify(result)}`);
    return result;
  }
}
