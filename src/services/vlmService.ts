import { usePreferences } from '../context/PreferencesContext';
import type { Preferences } from './storage';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Renamed original BoundingBox to avoid conflict
export interface BoundingBoxXYWH {
  x: number; // top-left x (percentage or pixels)
  y: number; // top-left y
  width: number;
  height: number;
}

// New BoundingBox format from v2 prompt
export interface BoundingBoxX1Y1X2Y2 {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Renamed original Style to avoid conflict
export interface StyleSimple {
  color?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fill?: string;
  fontWeight?: 'normal' | 'bold';
  // ... other relevant styles
}

// New Style format from v2 prompt
export interface StyleInfo {
  line_thickness?: 'thin' | 'medium' | 'thick' | string; // Allow string for flexibility
  line_style?: 'solid' | 'dashed' | 'dotted' | string; // Allow string
  color?: string;
  fill?: string | 'none';
}

// Relationship nested within elements (v2 prompt)
export interface NestedRelationship {
  related_element_id: number;
  relation_type: string; // e.g., "left_of", "above", "overlaps_with", etc.
}

// Define specific dimension types for the union
interface WidthHeight { width: number; height: number; }
interface Radius { radius: number; }
interface Length { length: number; }
interface BaseHeight { base: number; height: number; }

// Union type for dimensions
// Replace `any` with `unknown` for better type safety, keep fallback for flexibility
type ElementDimensions = WidthHeight | Radius | Length | BaseHeight | { [key: string]: unknown } | null;

// Updated DiagramElement to include 'trapezoid' as a valid type
export interface DiagramElement {
  id: number; // Changed to number
  type: 'rectangle' | 'square' | 'parallelogram' | 'rhombus' | 'triangle' | 'circle' | 'ellipse' | 'arrow' | 'line_segment' | 'text' | 'trapezoid' | 'other_shape'; // Added 'trapezoid'
  bounding_box: BoundingBoxX1Y1X2Y2;
  center_coordinates?: { cx: number; cy: number }; // Optional as it's approximate
  dimensions?: ElementDimensions; // Use the specific union type
  orientation_angle?: number;
  style_info?: StyleInfo | null;
  text_content?: string | null;
  relationships?: NestedRelationship[]; // Relationships are now nested here
  // Removed old fields like `style`, `orientation`, `role` if covered by new structure
}

// Renamed original Relationship
export interface RelationshipTopLevel {
  id: string;
  type: 'connects' | 'contains' | 'above' | 'below' | 'left-of' | 'right-of' | 'overlaps';
  sourceId: string;
  targetId: string;
}

// Summary object from v2 prompt
export interface AnalysisSummary {
  total_distinct_elements: number;
  composition_interpretation: string;
}

// Updated VLMServiceResponse for v2 prompt schema
export interface VLMServiceResponse {
  analysis_summary?: AnalysisSummary;
  elements: DiagramElement[];
  plausibility_check_notes?: string; // Optional as it's a note
  vlmProvider?: string; // Added to identify the VLM used
  // Removed top-level `relationships` and `compositionDescription`
}

export interface VLMService {
  analyzeImage(dataUrl: string, vlmType: string, apiKey?: string): Promise<VLMServiceResponse>;
}

/**
 * Prompt management utility for Gemini prompt engineering.
 * Supports versioning, easy updates, and A/B testing.
 */

/**
 * Map of prompt versions. Add new versions here for A/B testing or improvements.
 * Each version should include rationale and example usage in comments.
 */
const GEMINI_PROMPTS: Record<string, string> = {
  v1: `You are an expert visual analysis assistant specializing in interpreting whiteboard sketches containing geometric shapes and text. Your task is to meticulously analyze the provided image of a whiteboard sketch and extract comprehensive information about all its elements, their properties, and their relationships, outputting the result ONLY as a valid JSON object. It is absolutely critical that you achieve precise detection of ALL geometric shapes, accurately determine their exact size, and pinpoint their correct position, with a paramount focus on the **relative positioning and sizes of all detected shapes to one another**.

  **JSON Output Requirements:**

  The JSON object must have the following top-level keys:
  1.  \`analysis_summary\`: An object containing:
      * \`total_distinct_elements\`: (Integer) The total number of distinct geometric shapes and text blocks identified.
      * \`composition_interpretation\`: (String) A brief description of what the overall sketch might represent (e.g., "Flowchart illustrating a process", "Mind map exploring ideas", "Geometric construction study", "Architectural sketch/Simple house drawing").
  2.  \`elements\`: An array of objects, where each object represents a single detected element (shape or text). Each element object must have the following keys:
      * \`id\`: (Integer) A unique sequential identifier for each element (starting from 1).
      * \`type\`: (String) The type of the element. Must be one of: "rectangle", "square", "parallelogram", "rhombus", "triangle", "circle", "ellipse", "arrow", "line_segment", "text", **"trapezoid"**, "other_shape". (Explicitly include "trapezoid").
      * \`bounding_box\`: An object with \`x1\`, \`y1\`, \`x2\`, \`y2\` keys (Integers), representing the top-left and bottom-right pixel coordinates of the element's bounding box. Assume origin (0,0) is the top-left corner of the image. **Ensure these coordinates are as precise as possible.**
      * \`center_coordinates\`: An object with \`cx\`, \`cy\` keys (Floats or Integers), representing the approximate center coordinates.
      * \`dimensions\`: An object containing size information appropriate for the shape type:
          * For rectangles/squares/parallelograms/rhombus/ellipses/trapezoids: \`width\` (Integer), \`height\` (Integer). (Include trapezoids here).
          * For circles: \`radius\` (Float or Integer).
          * For triangles: \`base\` (Integer), \`height\` (Integer) (if easily determinable) or side lengths if possible.
          * For line_segments/arrows: \`length\` (Float or Integer).
          **Prioritize calculating dimensions accurately based on detected outlines and bounding boxes.**
      * \`orientation_angle\`: (Float) Estimated angle of rotation in degrees (0 for horizontal/vertical alignment, positive for counter-clockwise rotation), if applicable and significantly non-zero (e.g., > 5 degrees). Default to 0 if not applicable or axis-aligned.
      * \`style_info\`: An object with keys like:
          * \`line_thickness\`: (String) e.g., "thin", "medium", "thick".
          * \`line_style\`: (String) e.g., "solid", "dashed", "dotted".
          * \`color\`: (String) Detected color (e.g., "black", "red", "blue") if discernible, otherwise "unknown".
          * \`fill\`: (String) Fill color if applicable, otherwise "none".
      * \`text_content\`: (String) The recognized text within the element. Null if not a text element.
      * \`relationships\`: An array of objects describing spatial relationships to *other* elements. Each relationship object should have:
          * \`related_element_id\`: (Integer) The \`id\` of the other element.
          * \`relation_type\`: (String) The type of relationship (e.g., "left_of", "right_of", "above", "below", "overlaps_with", "partially_overlaps_with", "inside", "contains", "connected_to_start", "connected_to_end", "points_to"). **Be extremely precise** (e.g., specify which edge is aligned with or next to which other edge, describe overlaps accurately).
          **Quantify relationships where possible:** Instead of just "above", consider "bottom edge is slightly above top edge of X", or if possible, include relative distances or overlaps as a percentage of either element's size or the total image size.

  3.  \`plausibility_check_notes\`: (String) Describe potential inconsistencies or confirmations regarding the extracted coordinates and dimensions. **Critically evaluate the consistency of detected shapes, sizes, and relative positions.** For example, "The bottom edge of the triangle is aligned with the top edge of the rectangle below it, as expected from bounding box analysis", "The chimney's right edge is vertically aligned with the right vertex of the roof trapezoid", or "Detected dimensions for the roof trapezoid align with visual proportions".

  **Instructions:**

  1.  Carefully and meticulously examine the entire whiteboard sketch image.
  2.  **Identify *every single* distinct geometric shape** (rectangles, squares, circles, ellipses, triangles, **TRAPEZOIDS**, parallelograms, rhombus, arrows, lines) and block of text. Do not miss any element.
      Pay close attention to potentially unusual or approximate shapes, e.g. slightly crooked and not fully closed rectangles, symmetric and asymetric triangles pointing up/left/down/..., trapezoids with differently angled sides - say, 45° left side and -20° right side, black bold arrow pointing to the right at 30°, etc. **Explicitly look for and identify the trapezoidal shape of the roof.**
  3.  Pay close attention to the total number of geometric forms in the sketch image and **ensure that you have mapped every single discernable element to a detected shape** in the \`elements\` array.
  4.  For each element, determine its type, the **most precise possible** bounding box, approximate center, dimensions, orientation, style, and any text content.
  5.  **Critically analyze and verify** the spatial relationships between *all* pairs of elements (position, overlap, connection). Focus on immediate and clear relationships, but also consider broader alignments.
      **Perform internal verification:** Cross-reference the bounding box coordinates, dimensions, and relative positions. For example, if element A is reported as "above" element B, confirm that A's y2 coordinate is less than B's y1 coordinate (allowing for slight margins due to line thickness). If possible, calculate relative distances or overlaps between key points or edges of related shapes (e.g., percentage distance between the bottom of the triangle and the top of the roof). Use these internal checks to refine your reported coordinates and relationships for maximum accuracy. **Ensure the reported relative positions and sizes precisely reflect the visual appearance.**
  6.  Count the total number of distinct elements identified and report it accurately.
  7.  Provide a concise interpretation of the sketch's likely purpose or subject. Recognizing it as a "simple house drawing" is a valid interpretation.
  8.  Generate **ONLY** the JSON object conforming strictly to the structure specified above. Do not include any explanatory text before or after the JSON object.
  9.  Use the \`plausibility_check_notes\` to explicitly comment on the accuracy and consistency of your geometric and relational findings, noting where your analysis confirms the visual sketch and where any minor ambiguities might exist (though strive for high accuracy).

  Analyze the provided image now and generate the JSON output.`
};

/**
 * Returns the Gemini prompt for the given version.
 * @param version Prompt version key (default: 'v1')
 */
export function getGeminiPrompt(version: string = 'v1'): string {
  return GEMINI_PROMPTS[version] || GEMINI_PROMPTS['v1'];
}

// Update buildGeminiPrompt to use the prompt management utility
/**
 * Generates the prompt for Gemini, using the selected version.
 * @param version Prompt version key (default: 'v1')
 */
function buildGeminiPrompt(version: string = 'v1'): string {
  return getGeminiPrompt(version);
}

/**
 * Error thrown when authentication with the VLM API fails.
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when the API rate limit is exceeded.
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when the API quota is exceeded.
 */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * General error for other API failures.
 */
export class GeneralAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneralAPIError';
  }
}

/**
 * JSON schema for StructuredDiagram (expected Gemini output)
 *
 * {
 *   elements: [
 *     {
 *       id: string,
 *       type: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'line' | 'text',
 *       boundingBox: { x: number, y: number, width: number, height: number },
 *       text?: string,
 *       style?: { color?: string, lineStyle?: string, fill?: string, fontWeight?: string }
 *     }, ...
 *   ],
 *   relationships: [
 *     {
 *       id: string,
 *       type: string,
 *       sourceId: string,
 *       targetId: string
 *     }, ...
 *   ]
 * }
 */

/**
 * Validates a parsed object against the VLMServiceResponse schema (v2).
 * @param obj The parsed object to validate
 * @returns { valid: boolean, errors: string[], partial?: Partial<VLMServiceResponse> }
 */
export function validateStructuredDiagram(obj: unknown): { valid: boolean, errors: string[], partial?: Partial<VLMServiceResponse> } {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    errors.push('Root is not an object.');
    return { valid: false, errors };
  }
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.elements)) {
    errors.push('Missing or invalid elements array.');
  }
  // Type guards
  function isDiagramElement(el: unknown): el is DiagramElement {
    if (!el || typeof el !== 'object') return false;
    const e = el as Record<string, unknown>;
    const bb = e.bounding_box as Record<string, unknown>;
    return (
      typeof e.id === 'number' &&
      typeof e.type === 'string' &&
      bb && typeof bb.x1 === 'number'
    );
  }
  // Validate elements
  const validElements = Array.isArray(o.elements)
    ? o.elements.filter((el, i) => {
        if (!el || typeof el !== 'object') {
          errors.push(`Element at index ${i} is not an object.`);
          return false;
        }
        const e = el as Record<string, unknown>;
        if (typeof e.id !== 'number') errors.push(`Element at index ${i} missing id.`);
        if (typeof e.type !== 'string') errors.push(`Element at index ${i} missing type.`);
        if (!e.bounding_box || typeof e.bounding_box !== 'object') errors.push(`Element at index ${i} missing bounding_box.`);
        else {
          const bb = e.bounding_box as Record<string, unknown>;
          if (typeof bb.x1 !== 'number' || typeof bb.y1 !== 'number' || typeof bb.x2 !== 'number' || typeof bb.y2 !== 'number') {
            errors.push(`Element at index ${i} has invalid bounding_box.`);
          }
        }
        return isDiagramElement(el);
      }) as DiagramElement[]
    : [];
  const valid = errors.length === 0;
  const partial: Partial<VLMServiceResponse> = {
    analysis_summary: o.analysis_summary as AnalysisSummary, // Assume valid if present, or add checks
    elements: validElements,
    plausibility_check_notes: o.plausibility_check_notes as string // Assume valid if present
  };
  return { valid, errors, partial };
}

/**
 * Utility to hash image data for cache key (SHA-256, base64).
 * Uses browser SubtleCrypto API.
 */
async function hashImageData(imageDataUrl: string): Promise<string> {
  // Only hash the base64 part for efficiency
  const [, base64 = ''] = imageDataUrl.split(',');
  const encoder = new TextEncoder();
  const data = encoder.encode(base64);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  // Convert buffer to base64
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashString = btoa(String.fromCharCode(...hashArray));
  return hashString;
}

/**
 * Simple in-memory LRU cache for Gemini results (max 50 entries).
 * Keyed by image hash. Exposed for testing.
 */
const GEMINI_CACHE = new Map<string, VLMServiceResponse>();
const GEMINI_CACHE_MAX = 50;

/**
 * GeminiAdapter implements the VLMService interface for Google's Gemini Vision API.
 * Handles authentication, request formatting, response parsing, error handling, and logging.
 *
 * To add support for additional models, implement a new Adapter class with the VLMService interface.
 */
class GeminiAdapter implements VLMService {
  /** Gemini API key (from user preferences, not hardcoded) */
  private apiKey: string;
  /** Max number of retries for transient errors */
  private maxRetries = 3;
  /** Base delay (ms) for exponential backoff */
  private baseDelay = 500; // ms

  /**
   * @param apiKey Gemini API key (should be securely provided via preferences or environment)
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analyze a whiteboard image and return a structured diagram.
   * Uses in-memory LRU cache to avoid redundant API calls for the same image.
   * @param imageDataUrl Image as a base64 data URL (PNG recommended)
   * @returns Promise resolving to a StructuredDiagram
   */
  async analyzeImage(imageDataUrl: string, apiKey?: string): Promise<VLMServiceResponse> {
    console.log('[Gemini] Analyzing with Gemini adapter...', { apiKeyProvided: !!apiKey });
    const imageHash = await hashImageData(imageDataUrl);
    // Check cache first
    if (GEMINI_CACHE.has(imageHash)) {
      // Move to end (LRU)
      const cached = GEMINI_CACHE.get(imageHash)!;
      GEMINI_CACHE.delete(imageHash);
      GEMINI_CACHE.set(imageHash, cached);
      console.info('[Gemini] Cache hit for image');
      return cached;
    }
    const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + (apiKey || this.apiKey);
    const base64 = imageDataUrl.split(',')[1];
    const prompt = buildGeminiPrompt('v1');
    const requestBody = {
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64 } },
            { text: prompt }
          ]
        }
      ]
    };
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.info(`[Gemini] Request (attempt ${attempt + 1}):`, endpoint, { ...requestBody, contents: '[omitted image data]' });
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        const resText = await res.clone().text();
        console.info(`[Gemini] Response (attempt ${attempt + 1}):`, res.status, res.statusText, resText);
        if (!res.ok) {
          // Handle specific error types
          if (res.status === 401 || res.status === 403) {
            console.error('[Gemini] Authentication error:', res.status, res.statusText);
            throw new AuthenticationError('Authentication failed. Please check your Gemini API key.');
          }
          if (res.status === 429) {
            console.warn('[Gemini] Rate limit exceeded:', res.status, res.statusText);
            throw new RateLimitError('Gemini API rate limit exceeded. Please wait and try again later.');
          }
          if (res.status === 402 || resText.toLowerCase().includes('quota')) {
            console.warn('[Gemini] Quota exceeded:', res.status, res.statusText);
            throw new QuotaExceededError('Gemini API quota exceeded. Please check your usage or billing.');
          }
          if (res.status >= 500 && res.status < 600) {
            throw new GeneralAPIError(`Transient Gemini API error: ${res.status} ${res.statusText}`);
          }
          throw new GeneralAPIError(`Gemini API error: ${res.status} ${res.statusText} - ${resText}`);
        }
        const data = JSON.parse(resText);
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new GeneralAPIError('No response from Gemini.');
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new GeneralAPIError('No JSON found in Gemini response.');
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate against schema
        const validation = validateStructuredDiagram(parsed);
        if (!validation.valid) {
          // Check elements safely, provide default empty array if undefined
          if (validation.partial && (validation.partial.elements?.length ?? 0) > 0) {
            console.warn('[Gemini] Partial diagram parsed with errors:', validation.errors);
            // Construct the return object carefully to match VLMServiceResponse type
            return {
              analysis_summary: validation.partial.analysis_summary ?? { total_distinct_elements: 0, composition_interpretation: 'Partial parse error' }, // Provide default summary
              elements: validation.partial.elements ?? [], // Provide default empty array
              plausibility_check_notes: validation.partial.plausibility_check_notes ?? 'Partial parse error', // Provide default notes
              vlmProvider: 'gemini' // Add provider to partial response
            };
          }
          throw new GeneralAPIError('Malformed Gemini output: ' + validation.errors.join('; '));
        }
        // Cache successful result (including description)
        const finalResponse = { ...parsed, vlmProvider: 'gemini' } as VLMServiceResponse;
        GEMINI_CACHE.set(imageHash, finalResponse);
        // Enforce LRU max size
        if (GEMINI_CACHE.size > GEMINI_CACHE_MAX) {
          const firstKey = GEMINI_CACHE.keys().next().value;
          if (typeof firstKey === 'string') {
            GEMINI_CACHE.delete(firstKey);
          }
        }
        return finalResponse;
      } catch (err: unknown) {
        lastError = err;
        // Only retry on transient errors
        if (err instanceof GeneralAPIError && err.message.includes('Transient Gemini API error')) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.warn(`[Gemini] Transient error, retrying in ${delay}ms...`, err);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        // For non-retryable errors, break immediately
        break;
      }
    }
    // After retries, throw user-friendly error
    if (lastError instanceof AuthenticationError || lastError instanceof RateLimitError || lastError instanceof QuotaExceededError) {
      throw lastError;
    }
    let message = 'Failed to analyze image with Gemini after multiple attempts.';
    if (lastError instanceof GeneralAPIError) {
      message = lastError.message;
    } else if (lastError instanceof Error) {
      message = lastError.message;
    } else if (typeof lastError === 'string') {
      message = lastError;
    }
    console.error('[Gemini] Final error:', lastError);
    throw new GeneralAPIError(message);
  }
}

/* ClaudeAdapter: Implements VLMService for Anthropic Claude Vision API */
class ClaudeAdapter implements VLMService {
  private apiKey: string;
  private maxRetries = 3;
  private baseDelay = 500; // ms

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Helper to extract base64 PNG bytes from a data URL
  private dataUrlToBase64Png(dataUrl: string): string {
    if (!dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Only PNG images are supported for Claude Vision');
    }
    return dataUrl.replace(/^data:image\/png;base64,/, '');
  }

  async analyzeImage(imageDataUrl: string, apiKey?: string): Promise<VLMServiceResponse> {
    const imageBase64 = this.dataUrlToBase64Png(imageDataUrl);
    const prompt = buildGeminiPrompt('v1'); // Use the same prompt for consistency
    const anthropic = new Anthropic({ apiKey: apiKey || this.apiKey, dangerouslyAllowBrowser: true });
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const msg = await anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 4096,
          temperature: 0,
          system: 'You are an expert visual analysis assistant.',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: imageBase64,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        });
        const firstBlock = msg.content?.[0];
        // Only use .text if it exists on the block
        const text = (firstBlock && typeof firstBlock === 'object' && 'text' in firstBlock && typeof firstBlock.text === 'string') ? firstBlock.text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new GeneralAPIError('No JSON found in Claude response.');
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate against schema
        const validation = validateStructuredDiagram(parsed);
        if (!validation.valid) {
          if (validation.partial && (validation.partial.elements?.length ?? 0) > 0) {
            return {
              analysis_summary: validation.partial.analysis_summary ?? { total_distinct_elements: 0, composition_interpretation: 'Partial parse error' },
              elements: validation.partial.elements ?? [],
              plausibility_check_notes: validation.partial.plausibility_check_notes ?? 'Partial parse error',
              vlmProvider: 'claude',
            };
          }
          throw new GeneralAPIError('Malformed Claude output: ' + validation.errors.join('; '));
        }
        return { ...parsed, vlmProvider: 'claude' } as VLMServiceResponse;
      } catch (err: unknown) {
        lastError = err;
        // Only retry on transient errors
        if (err instanceof GeneralAPIError && err.message.includes('Transient')) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        break;
      }
    }
    if (lastError instanceof AuthenticationError || lastError instanceof RateLimitError || lastError instanceof QuotaExceededError) {
      throw lastError;
    }
    let message = 'Failed to analyze image with Claude after multiple attempts.';
    if (lastError instanceof GeneralAPIError) {
      message = lastError.message;
    } else if (lastError instanceof Error) {
      message = lastError.message;
    } else if (typeof lastError === 'string') {
      message = lastError;
    }
    throw new GeneralAPIError(message);
  }
}

// Gpt4oAdapter: Implements VLMService for OpenAI GPT-4o Vision
class Gpt4oAdapter implements VLMService {
  private apiKey: string;
  private maxRetries = 3;
  private baseDelay = 500; // ms

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Helper to extract base64 PNG bytes from a data URL
  private dataUrlToBase64Png(dataUrl: string): string {
    if (!dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Only PNG images are supported for GPT-4o Vision');
    }
    return dataUrl.replace(/^data:image\/png;base64,/, '');
  }

  async analyzeImage(imageDataUrl: string, apiKey?: string): Promise<VLMServiceResponse> {
    const openai = new OpenAI({ apiKey: apiKey || this.apiKey, dangerouslyAllowBrowser: true });
    const imageBase64 = this.dataUrlToBase64Png(imageDataUrl);
    const prompt = buildGeminiPrompt('v1'); // Use the same prompt for consistency
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 4096,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        });
        const text = response.choices?.[0]?.message?.content || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new GeneralAPIError('No JSON found in GPT-4o response.');
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate against schema
        const validation = validateStructuredDiagram(parsed);
        if (!validation.valid) {
          if (validation.partial && (validation.partial.elements?.length ?? 0) > 0) {
            return {
              analysis_summary: validation.partial.analysis_summary ?? { total_distinct_elements: 0, composition_interpretation: 'Partial parse error' },
              elements: validation.partial.elements ?? [],
              plausibility_check_notes: validation.partial.plausibility_check_notes ?? 'Partial parse error',
              vlmProvider: 'gpt4o',
            };
          }
          throw new GeneralAPIError('Malformed GPT-4o output: ' + validation.errors.join('; '));
        }
        return { ...parsed, vlmProvider: 'gpt4o' } as VLMServiceResponse;
      } catch (err: unknown) {
        lastError = err;
        // Only retry on transient errors
        if (err instanceof GeneralAPIError && err.message.includes('Transient')) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        break;
      }
    }
    let message = 'Failed to analyze image with GPT-4o after multiple attempts.';
    if (lastError instanceof GeneralAPIError) {
      message = lastError.message;
    } else if (lastError instanceof Error) {
      message = lastError.message;
    } else if (typeof lastError === 'string') {
      message = lastError;
    }
    throw new GeneralAPIError(message);
  }
}

/**
 * Factory function to select the appropriate VLMService implementation based on user preferences.
 *
 * To add support for new models, extend this function to check for additional API keys or settings.
 *
 * @param prefs User preferences (should include API keys for supported models)
 * @returns VLMService instance (GeminiAdapter, ClaudeAdapter, etc.)
 */
function getVLMService(prefs: Preferences): VLMService {
   if (prefs.geminiApiKey) {
       return new GeminiAdapter(prefs.geminiApiKey);
   }
   if (prefs.claudeApiKey) {
     return new ClaudeAdapter(prefs.claudeApiKey);
   }
   if (prefs.gpt4oApiKey) {
     return new Gpt4oAdapter(prefs.gpt4oApiKey);
   }
   console.warn("No suitable VLM API key found in preferences. Using dummy service.");
   return { analyzeImage: async () => ({
     analysis_summary: { total_distinct_elements: 0, composition_interpretation: 'Dummy response' },
     elements: [],
     plausibility_check_notes: 'Dummy response',
     vlmProvider: 'dummy'
   }) }
}

/**
 * React hook to access the current VLMService based on user preferences.
 *
 * Usage: const vlmService = useVLMService();
 *
 * @returns VLMService instance
 */
export function useVLMService(): VLMService {
    const { preferences } = usePreferences();
    // In a real app, you might memoize this based on preferences
    return getVLMService(preferences);
}

// Expose cache for testing/inspection
export { GEMINI_CACHE, hashImageData };

// Dummy Adapter for fallback/testing
class DummyVLMAdapter implements VLMService {
  public async analyzeImage(_dataUrl: string): Promise<VLMServiceResponse> {
    console.warn(`[DummyVLM] Using dummy adapter for type: ${_dataUrl}. Returning mock data.`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    // Return mock response matching VLMServiceResponse structure
    return {
      analysis_summary: { total_distinct_elements: 0, composition_interpretation: 'Dummy response' },
      elements: [],
      plausibility_check_notes: 'Dummy response',
      vlmProvider: 'dummy'
    };
  }
}

// Simple service factory or hook modification needed here
// For now, just exporting the interface and adapters
// The actual useVLMService hook needs modification to select the adapter based on vlmType

// Placeholder for a function that might select the adapter
// This logic should ideally live within useVLMService or a factory
function getVlmAdapter(vlmType: string, apiKey: string = ''): VLMService {
  console.log(`Selecting adapter for VLM type: ${vlmType}`);
  switch (vlmType) {
    case 'gemini':
      return new GeminiAdapter(apiKey);
    case 'claude':
      return new ClaudeAdapter(apiKey);
    case 'gpt4o':
      return new Gpt4oAdapter(apiKey);
    default:
      console.warn(`No adapter found for VLM type: ${vlmType}, using dummy adapter.`);
      return new DummyVLMAdapter();
  }
}

// Example usage (replace current useVLMService hook logic with something like this):
/*
export const useVLMService = (vlmType: string): VLMService => {
  // In a real app, you might memoize this based on vlmType
  return getVlmAdapter(vlmType);
};
*/

// Keeping original export for now until hook is refactored
// export const useVLMService = (): VLMService => {
//   // Check environment variable or default to Gemini
//   const defaultProvider = process.env.REACT_APP_VLM_PROVIDER || 'gemini';
//   if (defaultProvider === 'dummy') {
//     return new DummyVLMAdapter();
//   }
//   // Add logic for other providers if needed
//   return new GeminiAdapter();
// };

// NOTE: The current useVLMService hook needs refactoring to accept
// vlmType and return the correct adapter instance.
// The code above provides the interface changes and a basic factory pattern.
// The actual hook implementation is outside this edit.

// Make factory usable by Home.tsx temporarily
export { getVlmAdapter }; // Export the factory

export { GeminiAdapter }; // Also export adapter if needed directly