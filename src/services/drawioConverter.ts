/**
 * Drawio Converter
 * Task 8: Implement Drawio Format Conversion
 *
 * Converts internal shape/relationship data to Drawio XML format.
 */
import type { Shape, ShapeRelationship, TextShape } from './shapeModels';
import pako from 'pako';

/**
 * Represents the dimensions of the original image.
 */
interface OriginalImageDimensions {
  width: number;
  height: number;
}

/**
 * Escapes XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Generates the Drawio XML document, scaling coordinates based on original image dimensions.
 * @param shapes Array of shapes
 * @param relationships Array of relationships
 * @param originalDimensions Dimensions of the original image used for VLM analysis
 * @returns Drawio XML string
 */
export function generateDrawioXml(
  shapes: Shape[],
  _relationships: ShapeRelationship[],
  originalDimensions: OriginalImageDimensions
): string {
  const TARGET_DRAWIO_WIDTH = 850; // Corresponds to page width in template
  const TARGET_DRAWIO_HEIGHT = 1100; // Corresponds to page height in template
  const CANVAS_MARGIN = 50; // Add some visual padding within the Drawio canvas

  if (!originalDimensions || originalDimensions.width === 0 || originalDimensions.height === 0) {
    console.error('Invalid original image dimensions provided to generateDrawioXml');
    // Return a minimal valid XML to avoid breaking DrawioViewer
    return `<?xml version="1.0" encoding="UTF-8"?><mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;
  }

  // Calculate scaling factors
  const scaleX = TARGET_DRAWIO_WIDTH / originalDimensions.width;
  const scaleY = TARGET_DRAWIO_HEIGHT / originalDimensions.height;
  // Use the smaller scale factor to maintain aspect ratio and fit within target bounds
  const scale = Math.min(scaleX, scaleY);

  // Separate shapes into triangles and non-triangles for Z-ordering
  const nonTriangles = shapes.filter(s => s.type !== 'triangle');
  const triangles = shapes.filter(s => s.type === 'triangle');

  // Generate XML for non-triangles first
  const nonTriangleXml = nonTriangles.map(element => {
    // Scale coordinates and dimensions
    const scaledX = element.boundingBox.x * scale + CANVAS_MARGIN;
    const scaledY = element.boundingBox.y * scale + CANVAS_MARGIN; // Simply add margin to scaled Y
    const scaledWidth = element.boundingBox.width * scale;
    const scaledHeight = element.boundingBox.height * scale;

    const drawioId = `el-${element.id}`; // Prefix element IDs

    let styleString = '';
    // Calculate font size for text elements
    let style = '';
    if (element.type === 'text') {
        const text = (element as TextShape).text || '';
        const textLength = text.length;
        // Slightly increased base font size calculation
        const baseSize = Math.min(24, Math.max(12, Math.floor(scaledHeight * 0.8))); 
        // Adjust size down for longer text
        style = `fontSize=${textLength > 20 ? Math.max(12, baseSize * 0.8) : baseSize};`;
    }
    
    // Base shape style
    switch (element.type) {
        case 'rectangle': styleString += 'shape=rectangle;whiteSpace=wrap;html=1;'; break;
        case 'ellipse':
        case 'circle': styleString += 'shape=ellipse;whiteSpace=wrap;html=1;'; break;
        case 'triangle': styleString += 'shape=triangle;whiteSpace=wrap;html=1;'; break;
        case 'parallelogram': styleString += 'shape=parallelogram;whiteSpace=wrap;html=1;'; break;
        case 'trapezoid': 
            styleString += 'shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;html=1;size=0.23;'; 
            break;
        case 'rhombus': 
        case 'diamond':
            styleString += 'shape=rhombus;perimeter=rhombusPerimeter;whiteSpace=wrap;html=1;'; 
            break;
        case 'text': 
            // Treat text as an invisible vertex
            styleString += 'html=1;whiteSpace=wrap;';
            styleString += 'align=center;verticalAlign=middle;overflow=width;';
            styleString += 'autosize=1;'; // Re-enable autosize
            styleString += style; // Apply calculated font size
            
            // Apply fill color ONLY if specified, otherwise transparent
            if (element.style?.fill) {
                styleString += `fillColor=${element.style.fill};`;
            } else {
                styleString += 'fillColor=none;'; 
            }
            // Apply font color ONLY if specified, otherwise default
            if (element.style?.color) {
                styleString += `fontColor=${element.style.color};`;
            }
            // Always ensure no border for the text vertex itself
            styleString += 'strokeColor=none;';

            // Reduce vertical spacing slightly
            styleString += 'spacing=3;spacingTop=1;spacingBottom=1;';
            break;
        case 'line':
            // Create edge instead of vertex
            return `<mxCell id="${drawioId}" value="" style="endArrow=none;html=1;strokeWidth=2;${
              element.style?.color ? `strokeColor=${element.style.color};` : ''
            }" edge="1" parent="1">
              <mxGeometry relative="1" as="geometry">
                <mxPoint x="${scaledX}" y="${scaledY}" as="sourcePoint"/>
                <mxPoint x="${scaledX + scaledWidth}" y="${scaledY + scaledHeight}" as="targetPoint"/>
              </mxGeometry>
            </mxCell>`;
        case 'arrow':
            // Create edge with arrow
            return `<mxCell id="${drawioId}" value="" style="endArrow=classic;html=1;strokeWidth=2;${
              element.style?.color ? `strokeColor=${element.style.color};` : ''
            }" edge="1" parent="1">
              <mxGeometry relative="1" as="geometry">
                <mxPoint x="${scaledX}" y="${scaledY}" as="sourcePoint"/>
                <mxPoint x="${scaledX + scaledWidth}" y="${scaledY + scaledHeight}" as="targetPoint"/>
              </mxGeometry>
            </mxCell>`;
        case 'hexagon':
            // Ensure correct perimeter and aspect ratio
            styleString += 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;aspect=fixed;';
            break;
        case 'octagon':
            // Ensure correct perimeter and aspect ratio
            styleString += 'shape=octagon;perimeter=octagonPerimeter;whiteSpace=wrap;html=1;aspect=fixed;';
            break;
        default: styleString += 'shape=rectangle;whiteSpace=wrap;html=1;'; break;
    }

    // Additional styles (applied to all vertex shapes AFTER base styles)
    // Re-add fill color logic for non-text shapes
    if (element.style?.fill && element.type !== 'text') {
        styleString += `fillColor=${element.style.fill};`;
    }
    // Stroke color applies to the shape border (unless it's text)
    if (element.style?.color && element.type !== 'text') {
         styleString += `strokeColor=${element.style.color};`;
    }
    if (element.style?.lineStyle && element.style.lineStyle !== 'solid') {
      styleString += `dashed=${element.style.lineStyle === 'dashed' ? 1 : 0};`;
      if (element.style.lineStyle === 'dotted') styleString += 'dashPattern=1 4;';
    }
    if (element.style?.fontWeight === 'bold') styleString += 'fontStyle=1;';
    if (typeof element.style?.opacity === 'number') styleString += `opacity=${Math.round(element.style.opacity * 100)};`;

    // Orientation - Use rotation based on orientation_angle
    // Remove old direction logic
    /*
    if (element.type === 'triangle' || element.type === 'arrow') {
      switch (element.orientation) {
        case 'north': styleString += 'direction=south;'; break;
        case 'south': styleString += 'direction=north;'; break;
        case 'west': styleString += 'direction=west;'; break;
        case 'east':
        default: styleString += 'direction=east;'; break;
      }
    }
    */
    // Apply rotation if angle is significant (Drawio rotation is clockwise, angle is counter-clockwise)
    if (typeof element.orientation_angle === 'number' && Math.abs(element.orientation_angle) > 1) { // Threshold to avoid tiny rotations
      styleString += `rotation=${-element.orientation_angle};`;
    } else if (element.type === 'triangle' && (element.orientation_angle === undefined || Math.abs(element.orientation_angle) <= 1)) {
      // Default triangle rotation to point upwards if angle is 0 or not provided
      styleString += `rotation=-90;`;
    }

    const label = escapeXml(element.type === 'text' ? (element as TextShape).text || '' : '');
    const geometry = `<mxGeometry x="${scaledX}" y="${scaledY}" width="${scaledWidth}" height="${scaledHeight}" as="geometry" />`;

    return `<mxCell id="${drawioId}" value="${label}" style="${styleString.replace(/;$/, '')}" vertex="1" parent="1">
      ${geometry}
    </mxCell>`;
  }).join('\n');

  // Generate XML for triangles next (so they render on top)
  const triangleXml = triangles.map(element => {
    // Scale coordinates and dimensions
    const scaledX = element.boundingBox.x * scale + CANVAS_MARGIN;
    const scaledY = element.boundingBox.y * scale; // Scale Y without margin first
    const scaledWidth = element.boundingBox.width * scale;
    const scaledHeight = element.boundingBox.height * scale;

    // Coordinate transformation
    const drawioX = scaledX;
    const drawioY = scaledY + CANVAS_MARGIN;

    const drawioId = `el-${element.id}`; // Prefix element IDs

    let styleString = element.type === 'trapezoid' ? 'shape=trapezoid;' : 'shape=triangle;'; // Start with correct style

    // Additional styles
    if (element.style?.color) styleString += `strokeColor=${element.style.color};`;
    if (element.style?.fill) styleString += `fillColor=${element.style.fill};`;
    if (element.style?.lineStyle && element.style.lineStyle !== 'solid') {
      styleString += `dashed=${element.style.lineStyle === 'dashed' ? 1 : 0};`;
      if (element.style.lineStyle === 'dotted') styleString += 'dashPattern=1 4;';
    }
    if (element.style?.fontWeight === 'bold') styleString += 'fontStyle=1;';
    if (typeof element.style?.opacity === 'number') styleString += `opacity=${Math.round(element.style.opacity * 100)};`;

    // Apply rotation
    if (typeof element.orientation_angle === 'number' && Math.abs(element.orientation_angle) > 1) {
      styleString += `rotation=${-element.orientation_angle};`;
    } else if (element.type === 'triangle' && (element.orientation_angle === undefined || Math.abs(element.orientation_angle) <= 1)) {
      // Default triangle rotation to point upwards
      styleString += `rotation=-90;`;
    }

    const label = escapeXml(''); // Triangles from VLM unlikely to have labels directly
    const geometry = `<mxGeometry x="${drawioX}" y="${drawioY}" width="${scaledWidth}" height="${scaledHeight}" as="geometry" />`;

    return `<mxCell id="${drawioId}" value="${label}" style="${styleString.replace(/;$/, '')}" vertex="1" parent="1">
      ${geometry}
    </mxCell>`;
  }).join('\n');

  // Construct the full Drawio XML
  // Use fixed page size but the content will be scaled within it
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="embed.diagrams.net" modified="2024-03-21T12:00:00.000Z" agent="Sketcher v1.0" version="20.8.4">
  <diagram name="Diagram 1" id="diagram-1">
    <mxGraphModel dx="${TARGET_DRAWIO_WIDTH + CANVAS_MARGIN*2}" dy="${TARGET_DRAWIO_HEIGHT + CANVAS_MARGIN*2}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${TARGET_DRAWIO_WIDTH}" pageHeight="${TARGET_DRAWIO_HEIGHT}">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${nonTriangleXml} 
        ${triangleXml} 
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  return xml;
}

/**
 * Compresses and base64-encodes the <mxGraphModel> XML for Drawio Embed API
 *
 * Usage:
 *   const xml = generateDrawioXml(shapes, relationships);
 *   const encoded = encodeDrawioXml(xml);
 *   // Pass 'encoded' as the 'xml' property to the Drawio Embed API
 *
 * @param xml Full Drawio XML string (should include <mxGraphModel>...)</mxGraphModel>
 * @returns Base64-encoded, compressed XML string for Drawio Embed API
 */
export function encodeDrawioXml(xml: string): string {
  // Extract <mxGraphModel>...</mxGraphModel> content
  const match = xml.match(/<mxGraphModel[\s\S]*?<\/mxGraphModel>/);
  if (!match) {
    throw new Error('No <mxGraphModel> found in XML');
  }
  const mxGraphModelXml = match[0];
  // Compress using raw DEFLATE (no zlib header)
  const compressedUint8Array = pako.deflateRaw(mxGraphModelXml);
  // Convert Uint8Array to binary string for btoa
  let binaryString = '';
  for (let i = 0; i < compressedUint8Array.length; i++) {
    binaryString += String.fromCharCode(compressedUint8Array[i]);
  }
  // Base64 encode
  const base64Encoded = btoa(binaryString);
  // URL encode the result - REMOVED as DrawioViewer likely expects raw base64
  // return encodeURIComponent(base64Encoded);
  return base64Encoded; // Return raw base64
}

// TODO: Add tests for Drawio XML generation 