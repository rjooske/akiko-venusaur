import { unreachable } from "$lib/util";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function rectScale(r: Rect, s: number): Rect {
  return {
    x: r.x * s,
    y: r.y * s,
    width: r.width * s,
    height: r.height * s,
  };
}

function clamp(x: number, min: number, max: number): number {
  if (x < min) {
    return min;
  } else if (x > max) {
    return max;
  } else {
    return x;
  }
}

export type Vector = { x: number; y: number };

export function vectorMagnitude(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vectorNormalize(v: Vector): Vector {
  const m = vectorMagnitude(v);
  return { x: v.x / m, y: v.y / m };
}

export function vectorAdd(a: Vector, b: Vector): Vector {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vectorSub(a: Vector, b: Vector): Vector {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vectorScale(v: Vector, s: number): Vector {
  return { x: s * v.x, y: s * v.y };
}

export function vectorDot(a: Vector, b: Vector): number {
  return a.x * b.x + a.y * b.y;
}

export function vectorDistance(a: Vector, b: Vector): number {
  return vectorMagnitude(vectorSub(b, a));
}

export function vectorAngle(v: Vector): number {
  return Math.atan2(v.y, v.x);
}

export type Segment = { start: Vector; end: Vector };

function segmentLength(s: Segment): number {
  return vectorDistance(s.start, s.end);
}

function segmentClosestPoint(s: Segment, p: Vector): Vector {
  const dir = vectorNormalize(vectorSub(s.end, s.start));
  const mag = vectorDot(vectorSub(p, s.start), dir);
  const offset = vectorScale(dir, clamp(mag, 0, segmentLength(s)));
  return vectorAdd(s.start, offset);
}

export function pointSegmentDistance(s: Segment, p: Vector): number {
  return vectorDistance(p, segmentClosestPoint(s, p));
}

export type Edge =
  | { kind: "top" | "bottom"; x: number; y: number; width: number }
  | { kind: "left" | "right"; x: number; y: number; height: number };

export function edgeToSegment(e: Edge): Segment {
  switch (e.kind) {
    case "top":
    case "bottom":
      return { start: { x: e.x, y: e.y }, end: { x: e.x + e.width, y: e.y } };
    case "left":
    case "right":
      return {
        start: { x: e.x, y: e.y },
        end: { x: e.x, y: e.y + e.height },
      };
    default:
      unreachable(e);
  }
}

export function edgeToHighlightDimensions(e: Edge, thickness: number): Rect {
  switch (e.kind) {
    case "top":
      return {
        x: e.x,
        y: e.y - thickness,
        width: e.width,
        height: thickness,
      };
    case "bottom":
      return { x: e.x, y: e.y, width: e.width, height: thickness };
    case "left":
      return {
        x: e.x - thickness,
        y: e.y,
        width: thickness,
        height: e.height,
      };
    case "right":
      return { x: e.x, y: e.y, width: thickness, height: e.height };
    default:
      unreachable(e);
  }
}

export type CellPosition = { column: string; row: number };

export function cellNameToCellPosition(name: string): CellPosition | undefined {
  const match = /^([a-h])(\d+)$/.exec(name);
  if (match === null) {
    return undefined;
  }
  const [, column, rowString] = match;
  const row = parseInt(rowString);
  if (isNaN(row)) {
    return undefined;
  }
  return { column, row };
}

export function cellPositionToCellName(p: CellPosition): string {
  return p.column + p.row.toString();
}

export function cellPositionCompare(a: CellPosition, b: CellPosition): number {
  if (a.column < b.column) {
    return -1;
  } else if (a.column > b.column) {
    return 1;
  }
  return a.row - b.row;
}
