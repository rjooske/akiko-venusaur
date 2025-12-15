<script lang="ts">
  import { dev } from "$app/environment";
  import {
    cellNameToCellPosition,
    cellPositionCompare,
    type Edge,
    type Rect,
  } from "$lib/app";
  import { parseSvg } from "$lib/svg";
  import { assert } from "$lib/util";
  import type { EditorState } from "./Editor.svelte";
  import Editor from "./Editor.svelte";
  import { onMount } from "svelte";

  let editor = $state<EditorState | undefined>();
  let viewScale = $state(1);
  let brightness = $state(0.5);
  let keepVerticalSelection = $state(true);

  async function handleSvgInput(input: HTMLInputElement): Promise<void> {
    assert(input.files !== null);
    if (input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    const svg = parseSvg(await file.text());
    if (svg === undefined) {
      window.alert("ファイルの読み込みに失敗しました");
      return;
    }

    if (editor !== undefined) {
      URL.revokeObjectURL(editor.svgUrl);
    }
    const svgUrl = URL.createObjectURL(file);

    const edges: Edge[] = [];
    for (const { x, y, width, height } of svg.rects) {
      const ratio = Math.max(width, height) / Math.min(width, height);
      if (ratio < 11) {
        continue;
      }
      edges.push({ kind: "top", x, y, width: width });
      edges.push({ kind: "bottom", x, y: y + height, width: width });
      edges.push({ kind: "left", x, y, height: height });
      edges.push({ kind: "right", x: x + width, y, height: height });
    }

    editor = {
      svgUrl,
      svgWidth: svg.width,
      svgHeight: svg.height,
      edges,
      highlightedEdge: undefined,
      selectedEdges: {
        top: undefined,
        right: undefined,
        bottom: undefined,
        left: undefined,
      },
      cells: [],
      cellCreatedCount: 0,
    };
  }

  function handleCopyOutput(): void {
    assert(editor !== undefined);

    for (const c of editor.cells) {
      const pos = cellNameToCellPosition(c.name);
      if (pos === undefined) {
        window.alert(`不正なマスIDが存在します: "${c.name}"`);
        return;
      }
    }
    const cells = editor.cells.toSorted((a, b) => {
      const ap = cellNameToCellPosition(a.name);
      const bp = cellNameToCellPosition(b.name);
      assert(ap !== undefined && bp !== undefined);
      return cellPositionCompare(ap, bp);
    });

    const cellNameToRect: Record<string, Rect> = {};
    for (const cell of cells) {
      cellNameToRect[cell.name] = cell.rect;
    }
    const output = JSON.stringify(cellNameToRect, undefined, 2);

    window.navigator.clipboard.writeText(output);
  }

  let inputElement = $state<HTMLInputElement | undefined>();
  if (dev) {
    onMount(() => {
      if (inputElement !== undefined) {
        handleSvgInput(inputElement);
      }
    });
  }
</script>

<main class="root">
  <header>
    <h1>
      <img src="akiko-venusaur.png" alt="あきこフシギバナ" />
      <span>あきこフシギバナ</span>
    </h1>
    <div class="editor-control">
      <label
        for="view-scale-range"
        style="grid-column: label-left / label-right; grid-row: 1/2;"
      >
        拡大率:
      </label>
      <input
        id="view-scale-range"
        type="range"
        bind:value={viewScale}
        min="1"
        max="10"
        step="0.01"
        style="grid-column: range-left / range-right; grid-row: 1/2;"
      />
      <label
        for="brightness-range"
        style="grid-column: label-left / label-right; grid-row: 2/3;"
      >
        明度:
      </label>
      <input
        id="brightness-range"
        type="range"
        bind:value={brightness}
        min="0"
        max="1"
        step="0.01"
        style="grid-column: range-left / range-right; grid-row: 2/3;"
      />
      <label style="grid-column: button-left / button-right; grid-row: 1/2;">
        <input type="checkbox" bind:checked={keepVerticalSelection} />
        左右の辺を保持
      </label>
      <button
        disabled={editor === undefined ||
          (editor.selectedEdges.top === undefined &&
            editor.selectedEdges.right === undefined &&
            editor.selectedEdges.bottom === undefined &&
            editor.selectedEdges.left === undefined)}
        onclick={() => {
          if (editor !== undefined) {
            editor.selectedEdges.top = undefined;
            editor.selectedEdges.right = undefined;
            editor.selectedEdges.bottom = undefined;
            editor.selectedEdges.left = undefined;
          }
        }}
      >
        選択中の辺をクリア
      </button>
    </div>
    <div>
      <label>
        履修要覧SVG:
        <input
          bind:this={inputElement}
          type="file"
          accept=".svg"
          oninput={(event) => handleSvgInput(event.currentTarget)}
        />
      </label>
      <br />
      <br />
      <button onclick={handleCopyOutput}>出力をコピー</button>
    </div>
  </header>
  {#if editor === undefined}
    <main></main>
  {:else}
    <Editor bind:editor {viewScale} {brightness} {keepVerticalSelection} />
  {/if}
</main>

<style lang="scss">
  .root {
    position: fixed;
    inset: 0;
    display: grid;
    grid-template-rows: auto 1fr;
    font-family: sans-serif;
  }

  header {
    display: grid;
    grid-template-columns: auto 1fr 1fr;
    padding: 0 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    z-index: 1;

    & > h1 {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-right: 100px;

      & > img {
        width: 50px;
      }
    }

    & > div {
      align-self: center;
    }
  }

  .editor-control {
    display: grid;
    grid-template-columns: [label-left] auto [label-right] 10px [range-left] 150px [range-right] 30px [button-left] auto [button-right];
    width: fit-content;

    & > label[for="view-scale-range"],
    & > label[for="brightness-range"] {
      align-self: center;
      justify-self: right;
    }

    & > button {
      grid-column: button-left / button-right;
      grid-row: 2/3;
    }
  }
</style>
