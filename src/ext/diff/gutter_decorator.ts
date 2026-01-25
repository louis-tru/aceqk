
import * as dom from "../../lib/dom";
import type {Editor} from "../../editor";
import type {DiffChunk} from "./base_diff_view";

export class MinimalGutterDiffDecorator {
	editor: Editor;
	type: number;
	gutterClass: string;
	gutterCellsClasses: {add: string; delete: string};
	chunks: DiffChunk[];
	/**
	 * @param {import("../../editor").Editor} editor
	 * @param {number} type
	 */
	constructor(editor: Editor, type: number) {
		this.gutterClass ="ace_mini-diff_gutter-enabled";
		this.gutterCellsClasses = {
			add: "mini-diff-added",
			delete: "mini-diff-deleted",
		};

		this.editor = editor;
		this.type = type;
		this.chunks = [];
		this.attachToEditor();
	}

	attachToEditor() {
		this.renderGutters = this.renderGutters.bind(this);

		dom.addCssClass(
			this.editor.renderer.$gutterLayer.element,
			this.gutterClass
		);
		this.editor.renderer.$gutterLayer.on(
			"afterRender",
			this.renderGutters
		);
	}

	renderGutters(e?: void, gutterLayer?: any) {
		const cells = this.editor.renderer.$gutterLayer.$lines.cells;
		cells.forEach((cell) => {
			Object.values(this.gutterCellsClasses).forEach(e=>cell.element.removeClass(e));
		});
		const dir = this.type === -1 ? "old" : "new";
		const diffClass = this.type === -1 ? this.gutterCellsClasses.delete : this.gutterCellsClasses.add;
		this.chunks.forEach((lineChange) => {
			let startRow = lineChange[dir].start.row;
			let endRow = lineChange[dir].end.row - 1;

			cells.forEach((cell) => {
				if (cell.row >= startRow && cell.row <= endRow) {
					cell.element.addClass(diffClass);
				}
			});
		});
	}

	setDecorations(changes: DiffChunk[]) {
		this.chunks = changes;
		this.renderGutters();
	}

	dispose() {
		dom.removeCssClass(
			this.editor.renderer.$gutterLayer.element,
			this.gutterClass
		);
		this.editor.renderer.$gutterLayer.off(
			"afterRender",
			this.renderGutters
		);
	}
}