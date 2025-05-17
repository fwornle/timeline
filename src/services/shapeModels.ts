/**
 * Shape Models
 * Task 7: Define Shape Data Structures
 *
 * Defines TypeScript interfaces for shapes and relationships.
 */

// Removed incorrect import - Assuming BoundingBox is defined below or globally
// import type { BoundingBox } from './boundingBox'; 

// Define possible shape types
export type ShapeType = 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'line' | 'text' | 'parallelogram' | 'rhombus' | 'diamond' | 'hexagon' | 'octagon' | 'trapezoid';

/**
 * Represents the geometric bounding box of a shape.
 * Assuming this definition is needed here if not imported.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}


/**
 * Represents common properties for all shapes.
 */
export interface Shape {
    id: string;
    type: ShapeType;
    boundingBox: BoundingBox;
    // style?: Style; // Renamed to avoid conflict
    style?: ElementStyleProps;
    orientation?: 'north' | 'south' | 'east' | 'west'; // Optional orientation
    role?: string; // Optional role description
    orientation_angle?: number; // Added for v2 prompt compatibility
    confidence?: number;
    // style?: ElementStyleProps; // Ensure only one style property
    text?: string;
}


/**
 * Represents a text element, inheriting from Shape.
 */
export interface TextShape extends Shape {
    type: 'text';
    text: string;
}

// Define relationship types (e.g., association, inheritance)
// Updated to match parser usage
export type RelationshipType = 'connects' | 'contains' | 'above' | 'below' | 'left-of' | 'right-of' | 'overlaps';

/**
 * Properties specific to styling elements.
 */
export interface ElementStyleProps { // Renamed from StyleProps
    color?: string; // Stroke color
    fill?: string; // Fill color
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    fontWeight?: 'normal' | 'bold';
    fontSize?: number;
    opacity?: number;
}


/**
 * Represents a relationship between two shapes.
 */
export interface ShapeRelationship {
    id: string;
    type: RelationshipType;
    sourceId: string;
    targetId: string;
    waypoints?: { x: number; y: number }[]; // Optional edge routing
    style?: ElementStyleProps; // Optional style for the relationship edge
}

// No more code in this file 