<script lang="ts" module>
  export type Cell = { id: number; name: string; rect: Rect };

  export type EditorState = {
    svgUrl: string;
    svgWidth: number;
    svgHeight: number;
    edges: Edge[];
    highlightedEdge: Edge | undefined;
    selectedEdges: {
      top: Edge | undefined;
      right: Edge | undefined;
      bottom: Edge | undefined;
      left: Edge | undefined;
    };
    cells: Cell[];
    cellCreatedCount: number;
  };
</script>

<script lang="ts">
  import {
    cellNameToCellPosition,
    cellPositionToCellName,
    edgeToHighlightDimensions,
    edgeToSegment,
    pointSegmentDistance,
    rectScale,
    type Edge,
    type Rect,
    type Vector,
  } from "$lib/app";
  import { maxByKey, minByKey, Throttle } from "$lib/util";

  let {
    editor = $bindable(),
    viewScale,
    brightness,
    keepVerticalSelection,
  }: {
    editor: EditorState;
    viewScale: number;
    brightness: number;
    keepVerticalSelection: boolean;
  } = $props();

  function getClosestSelectableEdge(
    app: EditorState,
    p: Vector,
  ): Edge | undefined {
    const predicate = {
      top: app.selectedEdges.top === undefined,
      right: app.selectedEdges.right === undefined,
      bottom: app.selectedEdges.bottom === undefined,
      left: app.selectedEdges.left === undefined,
    } as const;
    const es = app.edges.filter((e) => predicate[e.kind]);
    const e = minByKey(es, (e) => pointSegmentDistance(edgeToSegment(e), p));
    if (e === undefined) {
      return undefined;
    }
    if (pointSegmentDistance(edgeToSegment(e), p) < 50 / viewScale) {
      return e;
    }
  }

  function mouseEventToCursorPosition(event: MouseEvent): Vector | undefined {
    if (event.target instanceof HTMLImageElement) {
      const rect = event.target.getBoundingClientRect();
      return {
        x: (event.clientX - rect.x) / viewScale,
        y: (event.clientY - rect.y) / viewScale,
      };
    }
  }

  const handleMouseMoveThrottled = new Throttle(50, (event: MouseEvent) => {
    if (editor === undefined) {
      return;
    }
    const pos = mouseEventToCursorPosition(event);
    if (pos === undefined) {
      editor.highlightedEdge = undefined;
      return;
    }
    editor.highlightedEdge = getClosestSelectableEdge(editor, pos);
  });

  function handleClick(event: MouseEvent): void {
    if (editor === undefined) {
      return;
    }

    const pos = mouseEventToCursorPosition(event);
    if (pos === undefined) {
      return;
    }
    const closest = getClosestSelectableEdge(editor, pos);
    if (closest === undefined) {
      return;
    }
    editor.selectedEdges[closest.kind] = closest;
    if (
      editor.selectedEdges.top !== undefined &&
      editor.selectedEdges.right !== undefined &&
      editor.selectedEdges.bottom !== undefined &&
      editor.selectedEdges.left !== undefined
    ) {
      editor.cellCreatedCount++;
      const cell: Cell = {
        id: editor.cellCreatedCount,
        name: editor.cellCreatedCount.toString(),
        rect: {
          x: editor.selectedEdges.right.x,
          y: editor.selectedEdges.bottom.y,
          width: editor.selectedEdges.left.x - editor.selectedEdges.right.x,
          height: editor.selectedEdges.top.y - editor.selectedEdges.bottom.y,
        },
      };

      const centerX = cell.rect.x + cell.rect.width / 2;
      const topY = cell.rect.y;
      const alignedCells = editor.cells.filter(
        (c) =>
          c.rect.y + c.rect.height < topY &&
          c.rect.x <= centerX &&
          centerX <= c.rect.x + c.rect.width,
      );
      const cellAbove = maxByKey(alignedCells, (c) => c.rect.y + c.rect.height);
      if (cellAbove !== undefined) {
        const pos = cellNameToCellPosition(cellAbove.name);
        if (pos !== undefined) {
          pos.row++;
          cell.name = cellPositionToCellName(pos);
        }
      }

      editor.cells.push(cell);
      editor.highlightedEdge = undefined;
      editor.selectedEdges.top = undefined;
      editor.selectedEdges.bottom = undefined;
      if (!keepVerticalSelection) {
        editor.selectedEdges.left = undefined;
        editor.selectedEdges.right = undefined;
      }
    }
  }

  function handleCellDelete(cell: Cell): void {
    if (editor === undefined) {
      return;
    }
    const i = editor.cells.indexOf(cell);
    if (i >= 0) {
      editor.cells.splice(i, 1);
    }
  }

  function handleCellNameInput(cell: Cell, value: string): void {
    if (editor === undefined) {
      return;
    }

    cell.name = value;
    const pos = cellNameToCellPosition(value);
    if (pos === undefined) {
      return;
    }

    const centerX = cell.rect.x + cell.rect.width / 2;
    const bottomY = cell.rect.y + cell.rect.height;
    const alignedCells = editor.cells.filter(
      (c) =>
        bottomY < c.rect.y &&
        c.rect.x <= centerX &&
        centerX <= c.rect.x + c.rect.width,
    );
    alignedCells.sort((a, b) => a.rect.y - b.rect.y);
    for (let i = 0; i < alignedCells.length; i++) {
      alignedCells[i].name = cellPositionToCellName({
        column: pos.column,
        row: pos.row + i + 1,
      });
    }
  }
</script>

{#snippet edge(className: string, e: Edge)}
  {@const rect = rectScale(
    edgeToHighlightDimensions(e, 4 / viewScale),
    viewScale,
  )}
  <div
    class={className}
    style="left: {rect.x}px; top:{rect.y}px; width: {rect.width}px; height:{rect.height}px"
  ></div>
{/snippet}

<main
  onmousemove={(event) => handleMouseMoveThrottled.call(event)}
  onclick={handleClick}
>
  <img
    src={editor.svgUrl}
    width={editor.svgWidth * viewScale}
    height={editor.svgHeight * viewScale}
    style="--brightness: {brightness}"
  />
  {#if editor.highlightedEdge !== undefined}
    {@render edge("edge-highlight", editor.highlightedEdge)}
  {/if}
  {#if editor.selectedEdges.top !== undefined}
    {@render edge("selected-edge-highlight", editor.selectedEdges.top)}
  {/if}
  {#if editor.selectedEdges.right !== undefined}
    {@render edge("selected-edge-highlight", editor.selectedEdges.right)}
  {/if}
  {#if editor.selectedEdges.bottom !== undefined}
    {@render edge("selected-edge-highlight", editor.selectedEdges.bottom)}
  {/if}
  {#if editor.selectedEdges.left !== undefined}
    {@render edge("selected-edge-highlight", editor.selectedEdges.left)}
  {/if}
  {#each editor.cells as cell (cell.id)}
    {@const rect = rectScale(cell.rect, viewScale)}
    <div
      class="cell"
      style="left: {rect.x}px; top:{rect.y}px; width: {rect.width}px; height:{rect.height}px"
    >
      <input
        type="text"
        bind:value={cell.name}
        oninput={(event) =>
          handleCellNameInput(cell, event.currentTarget.value)}
      />
      <button onclick={() => handleCellDelete(cell)}>削除</button>
    </div>
  {/each}
</main>

<style lang="scss">
  main {
    overflow: scroll;
    position: relative;

    & > img {
      background-color: white;
      filter: brightness(var(--brightness, 1));
    }
  }

  .edge-highlight,
  .selected-edge-highlight {
    position: absolute;
    pointer-events: none;
  }

  .edge-highlight {
    background-color: lime;
  }

  .selected-edge-highlight {
    background-color: hsl(30, 100%, 60%);
  }

  .cell {
    box-sizing: border-box;
    position: absolute;
    background-color: rgba(0, 0, 255, 0.3);
    border: 5px solid rgba(200, 200, 255, 0.5);
    padding: 5px;

    & > input {
      box-sizing: border-box;
      max-width: 100%;
    }
  }
</style>
