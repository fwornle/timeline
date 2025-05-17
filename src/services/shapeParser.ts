import {
  Shape,
  ShapeRelationship,
  ShapeType,
  RelationshipType,
  TextShape,
  ElementStyleProps
} from './shapeModels';
import { VLMServiceResponse, DiagramElement } from './vlmService';

// Helper function to generate unique relationship IDs
let relIdCounter = 0;
const generateRelId = () => `flat-rel-${++relIdCounter}`;

// Add type guard for text elements
interface TextElement extends DiagramElement {
  text?: string;
}

function isTextElement(el: DiagramElement): el is TextElement {
  return el.type === 'text';
}

/**
 * Parses shapes and relationships from the VLM response (v2 schema).
 * Handles variations in response format and collects errors.
 * @param response The VLMServiceResponse object from the VLM
 * @returns { compositionDescription, shapes, relationships, errors }
 */
export function parseShapesFromVLMResponse(response: VLMServiceResponse): {
  compositionDescription?: string;
  shapes: Shape[];
  relationships: ShapeRelationship[];
  errors: string[];
} {
  const shapes: Shape[] = [];
  const relationships: ShapeRelationship[] = [];
  const errors: string[] = [];
  let compositionDescription: string | undefined;

  // Reset relationship ID counter for each parse
  relIdCounter = 0;

  // Basic validation of the response structure
  if (!response || typeof response !== 'object') {
    errors.push('Response is not an object');
    return { compositionDescription, shapes, relationships, errors };
  }
  if (!response.analysis_summary || typeof response.analysis_summary.composition_interpretation !== 'string') {
    errors.push('Missing or invalid analysis_summary.composition_interpretation');
    // Proceed anyway, just won't have a description
  } else {
    compositionDescription = response.analysis_summary.composition_interpretation;
  }

  if (!Array.isArray(response.elements)) {
    errors.push('Missing or invalid elements array');
    return { compositionDescription, shapes, relationships, errors };
  }

  const elements = response.elements;
  // Remove old top-level relationship parsing
  // const rels = Array.isArray(o.relationships) ? o.relationships : [];

  // Constants for shape dimensions
  const MIN_TEXT_WIDTH = 60;
  const MIN_TEXT_HEIGHT = 30;
  const CHAR_WIDTH = 8; // Approximate width per character at fontSize 14
  const LINE_WIDTH = 2;

  // Parse elements
  elements.forEach((el, i) => {
    // Use the imported VLMServiceResponse types for better checking
    if (!el || typeof el !== 'object') {
      errors.push(`Element at index ${i} is not an object`);
      return;
    }

    const id = typeof el.id === 'string' ? el.id : undefined; // Expect string ID from validator
    const type = typeof el.type === 'string' ? el.type : undefined;
    const bb = el.bounding_box;
    // Convert bounding_box (x1, y1, x2, y2) to expected format (x, y, width, height)
    // and ensure minimum dimensions
    const boundingBox = bb && typeof bb.x1 === 'number' && typeof bb.y1 === 'number' && typeof bb.x2 === 'number' && typeof bb.y2 === 'number'
      ? {
          x: bb.x1,
          y: bb.y1,
          width: el.type === 'text' 
            ? Math.max(MIN_TEXT_WIDTH, Math.max(CHAR_WIDTH * ((isTextElement(el) && el.text ? el.text.length : 0)), bb.x2 - bb.x1))
            : Math.max(LINE_WIDTH, bb.x2 - bb.x1),
          height: el.type === 'text'
            ? Math.max(MIN_TEXT_HEIGHT, bb.y2 - bb.y1)
            : Math.max(LINE_WIDTH, bb.y2 - bb.y1)
        }
      : undefined;

    // Map style_info to the simple Style object
    const style: ElementStyleProps = {}; // Use ElementStyleProps type
    if (el.style_info) {
      if (el.style_info.color && el.style_info.color !== 'unknown') style.color = el.style_info.color;
      if (el.style_info.fill && el.style_info.fill !== 'none') style.fill = el.style_info.fill;
      // Map line style - add more mappings if needed
      if (el.style_info.line_style === 'dashed') style.lineStyle = 'dashed';
      else if (el.style_info.line_style === 'dotted') style.lineStyle = 'dotted';
      else style.lineStyle = 'solid'; // Default to solid
      // We don't have a direct mapping for line_thickness or fontWeight in the simple model
    }

    const text = el.text_content ?? undefined;
    // Extract orientation_angle (keep old orientation undefined for now)
    const orientation_angle = typeof el.orientation_angle === 'number' ? el.orientation_angle : undefined;
    const orientation = undefined;
    const role = undefined;

    // Use the guaranteed ID, type, and boundingBox from vlmService
    // If the defaults from vlmService were applied, these will be defined
    const finalId = id ?? `parser_fallback_${i}`; // Add fallback just in case, though unlikely needed
    const finalType = type ?? 'rectangle'; // Add fallback
    const finalBoundingBox = boundingBox ?? { x: 0, y: 0, width: 100, height: 100 }; // Add fallback

    // Map VLM types to internal ShapeType, handle aliases *before* type checks
    let mappedType: string = finalType;
    // Handle aliases by mapping to valid ShapeType values
    switch (mappedType) {
      case 'square':
        mappedType = 'rectangle';
        break;
      case 'line_segment':
        mappedType = 'line';
        break;
    }

    // Use the mapped type. If it's not a valid ShapeType, the switch will skip it.
    const internalType = mappedType as ShapeType;

    // Constants for minimum dimensions
    const MIN_SIZE = 2; // Increased from 1 to make lines more visible
    const MIN_ARROW_LENGTH = 50; // Increased from 20 to make arrows more prominent
    const MIN_ARROW_HEAD = 10; // Minimum width for arrow head
    
    // Adjust bounding box based on shape type
    if (internalType === 'line' || internalType === 'arrow') {
      // Calculate the original center point
      const centerX = finalBoundingBox.x + finalBoundingBox.width / 2;
      const centerY = finalBoundingBox.y + finalBoundingBox.height / 2;

      // For vertical lines/arrows
      if (Math.abs(finalBoundingBox.width) < MIN_SIZE * 2) {
        finalBoundingBox.width = internalType === 'arrow' ? MIN_ARROW_HEAD : MIN_SIZE * 2;
        finalBoundingBox.height = Math.max(MIN_ARROW_LENGTH, Math.abs(finalBoundingBox.height));
      } 
      // For horizontal lines/arrows
      else if (Math.abs(finalBoundingBox.height) < MIN_SIZE * 2) {
        finalBoundingBox.height = internalType === 'arrow' ? MIN_ARROW_HEAD : MIN_SIZE * 2;
        finalBoundingBox.width = Math.max(MIN_ARROW_LENGTH, Math.abs(finalBoundingBox.width));
      } 
      // For diagonal lines/arrows
      else {
        // Ensure minimum length while preserving angle
        const length = Math.sqrt(finalBoundingBox.width ** 2 + finalBoundingBox.height ** 2);
        const minLength = internalType === 'arrow' ? MIN_ARROW_LENGTH : MIN_SIZE * 10;
        if (length < minLength) {
          const scale = minLength / length;
          finalBoundingBox.width *= scale;
          finalBoundingBox.height *= scale;
        }
        // Ensure minimum thickness
        const minThickness = internalType === 'arrow' ? MIN_ARROW_HEAD : MIN_SIZE * 2;
        if (Math.min(Math.abs(finalBoundingBox.width), Math.abs(finalBoundingBox.height)) < minThickness) {
          if (Math.abs(finalBoundingBox.width) < Math.abs(finalBoundingBox.height)) {
            finalBoundingBox.width = Math.sign(finalBoundingBox.width) * minThickness;
          } else {
            finalBoundingBox.height = Math.sign(finalBoundingBox.height) * minThickness;
          }
        }
      }

      // Recenter the shape around the original center point
      finalBoundingBox.x = centerX - finalBoundingBox.width / 2;
      finalBoundingBox.y = centerY - finalBoundingBox.height / 2;
    }
    // Ensure text shapes have sufficient size for content
    else if (internalType === 'text') {
      // Calculate minimum width based on text length if text exists
      const textLength = text ? text.length : 0;
      const estimatedWidth = Math.max(MIN_TEXT_WIDTH, textLength * 10); // Rough estimate of 10px per character
      finalBoundingBox.width = Math.max(finalBoundingBox.width, estimatedWidth);
      finalBoundingBox.height = Math.max(finalBoundingBox.height, MIN_TEXT_HEIGHT);
    }

    // Map to specific shape type using the final guaranteed values and validated type
    let shape: Shape | null = null; // Initialize as null
    switch (internalType) {
      case 'rectangle':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text, orientation, role, orientation_angle };
        break;
      case 'circle':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text, orientation, role, orientation_angle };
        break;
      case 'ellipse':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text, orientation, role, orientation_angle };
        break;
      case 'triangle':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text, orientation, role, orientation_angle };
        break;
      case 'arrow':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, orientation, role, orientation_angle };
        break;
      case 'line':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, orientation, role, orientation_angle };
        break;
      case 'parallelogram':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text, orientation, role, orientation_angle };
        break;
      case 'rhombus':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text, orientation, role, orientation_angle };
        break;
      case 'trapezoid':
        shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text, orientation, role, orientation_angle };
        break;
      case 'text':
        if (text !== undefined) { // Check against explicitly undefined text
          shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text, orientation, role, orientation_angle } as TextShape;
        } else {
          // Allow text shapes without text_content if bounding box is present
          shape = { id: finalId, type: internalType, boundingBox: finalBoundingBox, style, text: '', orientation, role, orientation_angle } as TextShape;
        }
        break;
      // Default case: if internalType is not one of the above, shape remains null
    }

    // Only push the shape if it was successfully created
    if (shape) {
      shapes.push(shape);
    } else {
      // Log error if the type was unknown/unhandled by the switch
      errors.push(`Skipping element at index ${i} with unhandled type '${internalType}'`);
    }

    // --- Flatten Nested Relationships ---
    if (Array.isArray(el.relationships)) {
      el.relationships.forEach(nestedRel => {
        if (nestedRel && typeof nestedRel === 'object' && typeof nestedRel.related_element_id === 'number' && typeof nestedRel.relation_type === 'string') {
          const sourceId = finalId; // Use the guaranteed finalId
          const targetId = String(nestedRel.related_element_id); // Convert target ID to string
          // Basic mapping of relation_type - TODO: Refine this mapping
          let relationshipType: RelationshipType;
          switch (nestedRel.relation_type) {
            case 'connected_to':
            case 'connected_to_start':
            case 'connected_to_end':
            case 'points_to':
              relationshipType = 'connects'; break;
            case 'inside':
            case 'contains':
            case 'part_of':
              relationshipType = 'contains'; break;
            case 'above':
            case 'on': // Map 'on' to 'above'
            case 'on_top_of': // Map 'on_top_of' to 'above'
              relationshipType = 'above'; break;
            case 'below': relationshipType = 'below'; break;
            case 'left_of': relationshipType = 'left-of'; break;
            case 'right_of': relationshipType = 'right-of'; break;
            case 'overlaps_with':
            case 'partially_overlaps_with':
              relationshipType = 'overlaps'; break;
            default:
              // Fallback: ignore unknown relation types, do not add error
              return; // Skip unknown relationship types
          }

          relationships.push({
            id: generateRelId(), // Generate a unique ID for the flattened relationship
            type: relationshipType,
            sourceId: sourceId,
            targetId: targetId,
            // Waypoints are not provided in the new nested structure
          });
        } else {
          errors.push(`Invalid nested relationship found for element ID ${finalId}`);
        }
      });
    }

    // For diagonal lines, maintain the center point while ensuring minimum size
    if ((internalType === 'line' || internalType === 'arrow') && boundingBox) {
      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;
      
      if (boundingBox.width < LINE_WIDTH) {
        boundingBox.x = centerX - LINE_WIDTH / 2;
        boundingBox.width = LINE_WIDTH;
      }
      if (boundingBox.height < LINE_WIDTH) {
        boundingBox.y = centerY - LINE_WIDTH / 2;
        boundingBox.height = LINE_WIDTH;
      }
    }
  });

  // Remove the old relationship parsing loop
  /*
  rels.forEach((rel, i) => {
    // ... old code ...
  });
  */

  // --- Post-process relationships: Correct 'above' relationships based on bounding box geometry ---
  // Remove existing 'above' relationships
  const filteredRelationships = relationships.filter(rel => rel.type !== 'above');
  // For each shape, check if it is above another and add 'above' relationship if so
  for (let i = 0; i < shapes.length; i++) {
    for (let j = 0; j < shapes.length; j++) {
      if (i === j) continue;
      const a = shapes[i];
      const b = shapes[j];
      // If bottom of a is above top of b (with a small tolerance)
      if ((a.boundingBox.y + a.boundingBox.height) <= b.boundingBox.y + 1) {
        filteredRelationships.push({
          id: generateRelId(),
          type: 'above',
          sourceId: a.id,
          targetId: b.id
        });
      }
    }
  }

  // --- Adjust triangle bounding boxes for Drawio ---
  shapes.forEach(shape => {
    if (shape.type === 'triangle') {
      // For a triangle, ensure the bounding box has the base at the bottom edge
      // Assume the apex is at the top center, base is at the bottom edge
      // Use the bounding box as detected, but enforce this structure
      const x1 = shape.boundingBox.x;
      const y1 = shape.boundingBox.y;
      const width = shape.boundingBox.width;
      const height = shape.boundingBox.height;
      // For Drawio, set y to the apex (top), height to (baseY - apexY)
      // If the triangle is axis-aligned, this is already correct
      // But if not, recalculate:
      // Find the minimum y (apex) and maximum y (base)
      const apexY = y1;
      const baseY = y1 + height;
      shape.boundingBox = {
        x: x1,
        y: apexY,
        width: width,
        height: baseY - apexY
      };
    }
  });

  return { compositionDescription, shapes, relationships: filteredRelationships, errors };
}

/**
 * Validates shape data for completeness and consistency.
 * @param shapes Array of shapes
 * @param relationships Array of relationships
 * @returns { valid: boolean; errors: string[] }
 */
export function validateShapeData(
  shapes: Shape[],
  relationships: ShapeRelationship[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const shapeIds = new Set(shapes.map(s => s.id));

  // Check for duplicate shape IDs
  if (shapeIds.size !== shapes.length) {
    const counts = shapes.reduce((acc, shape) => {
      acc[shape.id] = (acc[shape.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const duplicates = Object.entries(counts).filter(([, count]) => count > 1).map(([id]) => id);
    errors.push(`Duplicate shape IDs found: ${duplicates.join(', ')}`);
  }

  // Check relationship validity
  relationships.forEach((rel, i) => {
    if (!rel.sourceId || !rel.targetId) {
      errors.push(`Relationship at index ${i} (ID: ${rel.id}) is missing source or target ID.`);
    }
    if (!shapeIds.has(rel.sourceId)) {
      errors.push(`Relationship (ID: ${rel.id}) source ID '${rel.sourceId}' does not match any shape ID.`);
    }
    if (!shapeIds.has(rel.targetId)) {
      errors.push(`Relationship (ID: ${rel.id}) target ID '${rel.targetId}' does not match any shape ID.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// TODO: In the future, add NLP/text extraction for free-form VLM/LLM responses 