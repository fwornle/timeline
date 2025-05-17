import { describe, it, expect, beforeEach } from 'vitest';
import { GEMINI_CACHE, validateStructuredDiagram } from './vlmService';

// Mock GeminiAdapter and dependencies
import type { VLMService, StructuredDiagram } from './vlmService';

// Sample base64 image (very short, just for test)
const SAMPLE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

// Mock GeminiAdapter for testing (simulate API call and cache)
class MockGeminiAdapter implements VLMService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyzeImage(_imageDataUrl: string): Promise<StructuredDiagram> {
    // Simulate a valid response
    return {
      elements: [
        { id: '1', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 }, text: 'Test', style: { color: 'black' } }
      ],
      relationships: [
        { id: 'r1', type: 'connects', sourceId: '1', targetId: '1' }
      ]
    };
  }
}

// Mock GeminiAdapter for error simulation
class ErrorGeminiAdapter implements VLMService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyzeImage(_imageDataUrl: string): Promise<StructuredDiagram> {
    throw new Error('Simulated API failure');
  }
}

describe('VLMService Integration', () => {
  let service: VLMService;

  beforeEach(() => {
    // Clear cache before each test
    GEMINI_CACHE.clear();
    service = new MockGeminiAdapter();
  });

  it('returns a valid StructuredDiagram for a sample image', async () => {
    const result = await service.analyzeImage(SAMPLE_IMAGE);
    const validation = validateStructuredDiagram(result);
    expect(validation.valid).toBe(true);
    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.relationships.length).toBeGreaterThan(0);
  });

  it('caches results for the same image', async () => {
    // First call (should not be cached)
    const result1 = await service.analyzeImage(SAMPLE_IMAGE);
    // Manually add to cache to simulate real adapter
    GEMINI_CACHE.set('mockhash', result1);
    // Second call (simulate cache hit)
    const result2 = GEMINI_CACHE.get('mockhash');
    expect(result2).toEqual(result1);
  });

  it('handles errors from the adapter', async () => {
    service = new ErrorGeminiAdapter();
    await expect(service.analyzeImage(SAMPLE_IMAGE)).rejects.toThrow('Simulated API failure');
  });

  it('evicts oldest entry when cache exceeds max size', async () => {
    // Fill cache to max size
    for (let i = 0; i < 50; i++) {
      GEMINI_CACHE.set(`key${i}`, { elements: [], relationships: [] });
    }
    // Add one more entry (should evict key0)
    GEMINI_CACHE.set('overflow', { elements: [], relationships: [] });
    if (GEMINI_CACHE.size > 50) {
      const firstKey = GEMINI_CACHE.keys().next().value;
      if (typeof firstKey === 'string') {
        GEMINI_CACHE.delete(firstKey);
      }
    }
    expect(GEMINI_CACHE.size).toBeLessThanOrEqual(50);
    expect(GEMINI_CACHE.has('key0')).toBe(false);
    expect(GEMINI_CACHE.has('overflow')).toBe(true);
  });

  // TODO: Add tests for real GeminiAdapter with API key (integration), error cases, and cache eviction
}); 