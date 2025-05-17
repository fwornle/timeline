import { describe, it, expect } from 'vitest';
import { parseShapesFromVLMResponse, validateShapeData } from './shapeParser';
import type { TextShape, Shape, ShapeRelationship } from './shapeModels';

const validResponse = {
  elements: [
    { id: '1', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 }, text: 'A', style: { color: 'red' } },
    { id: '2', type: 'circle', boundingBox: { x: 20, y: 20, width: 10, height: 10 }, text: 'B' },
    { id: '3', type: 'text', boundingBox: { x: 5, y: 5, width: 5, height: 2 }, text: 'Label' },
    { id: '4', type: 'arrow', boundingBox: { x: 10, y: 10, width: 5, height: 1 } },
  ],
  relationships: [
    { id: 'r1', type: 'connects', sourceId: '1', targetId: '2' },
    { id: 'r2', type: 'contains', sourceId: '1', targetId: '3' },
  ]
};

describe('shapeParser', () => {
  it('parses valid shapes and relationships', () => {
    const { shapes, relationships, errors } = parseShapesFromVLMResponse(validResponse);
    expect(errors.length).toBe(0);
    expect(shapes.length).toBe(4);
    expect(relationships.length).toBe(2);
    expect(shapes[0].type).toBe('rectangle');
    expect(shapes[2].type).toBe('text');
    expect((shapes[2] as TextShape).text).toBe('Label');
  });

  it('returns errors for missing/invalid fields', () => {
    const badResponse = {
      elements: [
        { id: '1', type: 'rectangle' }, // missing boundingBox
        { id: 2, type: 'circle', boundingBox: { x: 0, y: 0, width: 1, height: 1 } }, // id not string
        { id: '3', type: 'text', boundingBox: { x: 0, y: 0, width: 1, height: 1 } }, // text missing
        { id: '4', type: 'unknown', boundingBox: { x: 0, y: 0, width: 1, height: 1 } }, // unknown type
      ],
      relationships: [
        { id: 'r1', type: 'connects', sourceId: '1' }, // missing targetId
        { id: 'r2', type: 'connects', sourceId: '1', targetId: 2 }, // targetId not string
      ]
    };
    const { shapes, relationships, errors } = parseShapesFromVLMResponse(badResponse);
    expect(errors.length).toBeGreaterThan(0);
    expect(shapes.length).toBe(0);
    expect(relationships.length).toBe(0);
  });

  it('validates duplicate IDs and relationship errors', () => {
    const shapes: Shape[] = [
      { id: '1', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 1, height: 1 } } as Shape,
      { id: '1', type: 'circle', boundingBox: { x: 1, y: 1, width: 1, height: 1 } } as Shape,
    ];
    const relationships: ShapeRelationship[] = [
      { id: 'r1', type: 'connects', sourceId: '1', targetId: '2' },
      { id: 'r2', type: 'connects', sourceId: '3', targetId: '1' },
    ];
    const { valid, errors } = validateShapeData(shapes, relationships);
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('Duplicate'))).toBe(true);
    expect(errors.some(e => e.includes('unknown'))).toBe(true);
  });
}); 