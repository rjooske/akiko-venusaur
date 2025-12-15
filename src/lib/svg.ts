import {
  vectorAdd,
  vectorAngle,
  vectorDot,
  vectorNormalize,
  vectorScale,
  vectorSub,
  type Rect,
  type Vector,
} from "./app";
import { sortByKeyCached, tryParseFloat, unreachable } from "./util";
import * as svgParser from "svg-parser";
import svgPathParser from "svg-path-parser";

function elementNodeToPathD(e: svgParser.ElementNode): string | undefined {
  if (
    e.tagName === "path" &&
    e.properties !== undefined &&
    typeof e.properties.d === "string"
  ) {
    return e.properties.d;
  }
}

function getPathDs(n: svgParser.Node): string[] {
  const paths: string[] = [];
  const f = (n: svgParser.Node): void => {
    if (n.type !== "element") {
      return;
    }
    const path = elementNodeToPathD(n);
    if (path !== undefined) {
      paths.push(path);
      return;
    }
    for (const m of n.children) {
      if (typeof m === "object") {
        f(m);
      }
    }
  };
  f(n);
  return paths;
}

const RIGHT: Vector = { x: 1, y: 0 };
const DOWN: Vector = { x: 0, y: 1 };
const LEFT: Vector = { x: -1, y: 0 };
const UP: Vector = { x: 0, y: -1 };

function pointsToRect(points: Vector[]): Rect | undefined {
  if (points.length !== 4) {
    return undefined;
  }

  let center: Vector = { x: 0, y: 0 };
  for (const p of points) {
    center = vectorAdd(center, p);
  }
  center = vectorScale(center, 1 / 4);
  sortByKeyCached(points, (p) => vectorAngle(vectorSub(p, center)));

  const tl = points[0];
  const tr = points[1];
  const br = points[2];
  const bl = points[3];

  const THRESHOLD = 1 - 0.001;
  if (
    vectorDot(vectorNormalize(vectorSub(tr, tl)), RIGHT) < THRESHOLD ||
    vectorDot(vectorNormalize(vectorSub(br, tr)), DOWN) < THRESHOLD ||
    vectorDot(vectorNormalize(vectorSub(bl, br)), LEFT) < THRESHOLD ||
    vectorDot(vectorNormalize(vectorSub(tl, bl)), UP) < THRESHOLD
  ) {
    return undefined;
  }

  return {
    x: (tl.x + bl.x) / 2,
    y: (tl.y + tr.y) / 2,
    width: (tr.x - tl.x + br.x - bl.x) / 2,
    height: (bl.y - tl.y + br.y - tr.y) / 2,
  };
}

function pathToRects(path: svgPathParser.Command[]): Rect[] {
  const rects: Rect[] = [];
  const points: Vector[] = [];
  let x = 0;
  let y = 0;

  for (const command of path) {
    switch (command.command) {
      case "moveto":
        points.splice(0);
      case "lineto":
        if (command.relative) {
          x += command.x;
          y += command.y;
        } else {
          x = command.x;
          y = command.y;
        }
        points.push({ x, y });
        break;
      case "horizontal lineto":
        if (command.relative) {
          x += command.x;
        } else {
          x = command.x;
        }
        points.push({ x, y });
        break;
      case "vertical lineto":
        if (command.relative) {
          y += command.y;
        } else {
          y = command.y;
        }
        points.push({ x, y });
      case "closepath": {
        const rect = pointsToRect(points);
        if (rect !== undefined) {
          rects.push(rect);
        }
        points.splice(0);
        break;
      }
      case "curveto":
      case "smooth curveto":
      case "quadratic curveto":
      case "smooth quadratic curveto":
      case "elliptical arc":
        return rects;
      default:
        unreachable(command);
    }
  }

  return rects;
}

function findRects(root: svgParser.RootNode): Rect[] | undefined {
  const rects: Rect[] = [];
  for (const d of getPathDs(root.children[0])) {
    let path: svgPathParser.Command[];
    try {
      path = svgPathParser.parseSVG(d);
    } catch {
      return undefined;
    }
    for (const rect of pathToRects(path)) {
      rects.push(rect);
    }
  }

  return rects;
}

function getViewBox(root: svgParser.RootNode): Rect | undefined {
  const node = root.children[0];
  if (
    !(
      node.type === "element" &&
      node.properties !== undefined &&
      typeof node.properties.viewBox === "string"
    )
  ) {
    return undefined;
  }
  const chunks = node.properties.viewBox
    .trim()
    .replaceAll(/\s+/g, " ")
    .split(" ");
  if (chunks.length !== 4) {
    return undefined;
  }
  const [leftString, topString, rightString, bottomString] = chunks;
  const left = tryParseFloat(leftString);
  const top = tryParseFloat(topString);
  const right = tryParseFloat(rightString);
  const bottom = tryParseFloat(bottomString);
  if (
    left === undefined ||
    top === undefined ||
    right === undefined ||
    bottom === undefined
  ) {
    return undefined;
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function parseSvg(
  svg: string,
): { rects: Rect[]; width: number; height: number } | undefined {
  let root: svgParser.RootNode;
  try {
    root = svgParser.parse(svg);
  } catch {
    return undefined;
  }

  const rects = findRects(root);
  if (rects === undefined) {
    return undefined;
  }

  const viewBox = getViewBox(root);
  if (
    viewBox === undefined ||
    // TODO: figure out what do to when the view box is not at the origin
    viewBox.x !== 0 ||
    viewBox.y !== 0
  ) {
    return undefined;
  }
  const { width, height } = viewBox;

  return { rects, width, height };
}
