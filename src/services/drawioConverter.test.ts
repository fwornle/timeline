import { describe, it, expect } from 'vitest';
import { generateDrawioXml } from './drawioConverter';
import type { Shape, ShapeRelationship } from './shapeModels';

describe('generateDrawioXml', () => {
  it('generates valid XML for a rectangle and a relationship', () => {
    const shapes: Shape[] = [
      {
        id: 's1',
        type: 'rectangle',
        boundingBox: { x: 10, y: 20, width: 100, height: 50 },
        text: 'My Rectangle',
      } as Shape & { text: string },
    ];
    const relationships: ShapeRelationship[] = [
      { id: 'r1', type: 'connects', sourceId: 's1', targetId: 's2' },
    ];
    const xml = generateDrawioXml(shapes, relationships);
    expect(xml).toContain('<mxCell id="s1"');
    expect(xml).toContain('value="My Rectangle"');
    expect(xml).toContain('x="10"');
    expect(xml).toContain('y="20"');
    expect(xml).toContain('<mxCell id="r1" edge="1"');
    expect(xml).toContain('source="s1"');
    expect(xml).toContain('target="s2"');
  });

  it('handles empty input arrays', () => {
    const xml = generateDrawioXml([], []);
    expect(xml).toContain('<root>');
    // Should not contain any shape or relationship cells
    expect(xml).not.toMatch(/<mxCell id="[^"]+" vertex="1"/);
    expect(xml).not.toMatch(/<mxCell id="[^"]+" edge="1"/);
  });

  it('encodes text with special XML characters', () => {
    const shapes: Shape[] = [
      {
        id: 's2',
        type: 'rectangle',
        boundingBox: { x: 0, y: 0, width: 10, height: 10 },
        text: 'A <B> & "C"',
      } as Shape & { text: string },
    ];
    const xml = generateDrawioXml(shapes, []);
    expect(xml).toContain('value="A &lt;B&gt; &amp; &quot;C&quot;"');
  });

  it('maps style attributes to Drawio style string for shapes', () => {
    const shapes: Shape[] = [
      {
        id: 's3',
        type: 'rectangle',
        boundingBox: { x: 5, y: 5, width: 50, height: 20 },
        text: 'Styled',
        style: {
          color: '#ff0000',
          fill: '#00ff00',
          lineStyle: 'dashed',
          fontWeight: 'bold',
          opacity: 0.5,
        },
      } as Shape & { text: string },
    ];
    const xml = generateDrawioXml(shapes, []);
    expect(xml).toContain('strokeColor=#ff0000');
    expect(xml).toContain('fillColor=#00ff00');
    expect(xml).toContain('dashed=1');
    expect(xml).toContain('fontStyle=1');
    expect(xml).toContain('opacity=50');
  });

  it('maps style attributes to Drawio style string for relationships', () => {
    const shapes: Shape[] = [
      {
        id: 's4',
        type: 'rectangle',
        boundingBox: { x: 0, y: 0, width: 10, height: 10 },
      },
      {
        id: 's5',
        type: 'rectangle',
        boundingBox: { x: 20, y: 0, width: 10, height: 10 },
      },
    ];
    const relationships: ShapeRelationship[] = [
      {
        id: 'r3',
        type: 'connects',
        sourceId: 's4',
        targetId: 's5',
        style: {
          color: '#0000ff',
          lineStyle: 'dotted',
          opacity: 0.8,
        },
      } as ShapeRelationship & { style: { color: string; lineStyle: string; opacity: number } },
    ];
    const xml = generateDrawioXml(shapes, relationships);
    expect(xml).toContain('strokeColor=#0000ff');
    expect(xml).toContain('dashed=1;dashPattern=1 4');
    expect(xml).toContain('opacity=80');
  });

  // TODO: Add tests for more complex shape and relationship types
}); 