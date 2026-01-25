"use strict";

import type {EditSession} from "./edit_session";
import type { Fold } from "./edit_session/fold";
import type {Editor} from "./editor";
import type { CodeLenseCommand } from "./ext/code_lens";
import {Box,Text} from 'quark';
import type { Delta, Point } from "./range";
import type {VirtualRenderer} from "./virtual_renderer";

export interface LineWidget {
	editor?: Editor,
	el?: Box;
	rowCount?: number;
	hidden?: boolean;
	_inDocument?: boolean;
	column?: number;
	row: number;
	$oldWidget?: LineWidget,
	session?: EditSession,
	html?: string,
	text?: string,
	className?: string,
	coverGutter?: boolean,
	pixelHeight?: number,
	$fold?: Fold,
	type?: any,
	destroy?: () => void;
	coverLine?: boolean,
	fixedWidth?: boolean,
	fullWidth?: boolean,
	screenWidth?: number,
	rowsAbove?: number,
	lenses?: CodeLenseCommand[],
	_width?: number,
	_height?: number,
}

export class LineWidgets {
	readonly session: EditSession;
	public lineWidgets: LineWidget[] = [];
	private editor?: Editor;

	/**
	 * @param {EditSession} session
	 */
	constructor(session: EditSession) {
		this.session = session;
		this.session.widgetManager = this;
		this.session.getRowLength = this.getRowLength;
		this.session.$getWidgetScreenLength = this.$getWidgetScreenLength;
		this.updateOnChange = this.updateOnChange.bind(this);
		this.renderWidgets = this.renderWidgets.bind(this);
		this.measureWidgets = this.measureWidgets.bind(this);
		this.session._changedWidgets = [];
		this.$onChangeEditor = this.$onChangeEditor.bind(this);

		this.session.on("change", this.updateOnChange);
		this.session.on("changeFold", this.updateOnFold);
		this.session.on("changeEditor", this.$onChangeEditor);
	}

	private $useWrapMode?: boolean;
	private $wrapData?: any;
	private firstRow?: number;
	private lastRow?: number;

	/**
	 * @param {number} row
	 * @return {number}
	 */
	getRowLength(row: number) {
		var h;
		if (this.lineWidgets)
			h = this.lineWidgets[row] && this.lineWidgets[row].rowCount || 0;
		else
			h = 0;
		if (!this["$useWrapMode"] || !this["$wrapData"][row]) {
			return 1 + h;
		} else {
			return this["$wrapData"][row].length + 1 + h;
		}
	}

	/**
	 * @return {number}
	 */
	$getWidgetScreenLength() {
		var screenRows = 0;
		this.lineWidgets.forEach(function(w){
			if (w && w.rowCount && !w.hidden)
				screenRows += w.rowCount;
		});
		return screenRows;
	}

	$onChangeEditor(e: { editor?: Editor }) {
		this.attach(e.editor);
	}

	/**
	 * @param {Editor} editor
	 */
	attach(editor?: Editor) {
		if (editor && editor.widgetManager && editor.widgetManager != this)
			editor.widgetManager.detach();

		if (this.editor == editor)
			return;

		this.detach();
		/**@type {Editor} */
		this.editor = editor;

		if (editor) {
			editor.widgetManager = this;
			editor.renderer.on("beforeRender", this.measureWidgets);
			editor.renderer.on("afterRender", this.renderWidgets);
		}
	}
	detach(e?: any) {
		var editor = this.editor;
		if (!editor)
			return;

		this.editor = void 0;
		editor.widgetManager = void 0;

		editor.renderer.off("beforeRender", this.measureWidgets);
		editor.renderer.off("afterRender", this.renderWidgets);
		var lineWidgets = this.session.lineWidgets;
		lineWidgets && lineWidgets.forEach(function(w) {
			if (w && w.el) {
				w._inDocument = false;
				w.el.remove(); // remove from parent
			}
		});
	}

	/**
	 *
	 * @param e
	 * @param {EditSession} session
	 */
	updateOnFold(e: {data: {start:{row: number}, end?: {row: number}} | Fold, action?: string}, session: EditSession) {
		var lineWidgets = session.lineWidgets;
		if (!lineWidgets || !e.action)
			return;
		var fold = e.data;
		var start = fold.start.row;
		var end = fold.end?.row || 0;
		var hide = e.action == "add";
		for (var i = start + 1; i < end; i++) {
			if (lineWidgets[i])
				lineWidgets[i]!.hidden = hide;
		}
		if (lineWidgets[end]) {
			if (hide) {
				if (!lineWidgets[start])
					lineWidgets[start] = lineWidgets[end];
				else
					lineWidgets[end]!.hidden = hide;
			} else {
				if (lineWidgets[start] == lineWidgets[end])
					lineWidgets[start] = undefined;
				lineWidgets[end]!.hidden = hide;
			}
		}
	}

	/**
	 *
	 * @param {Delta} delta
	 */
	updateOnChange(delta: Delta) {
		var lineWidgets = this.session.lineWidgets;
		if (!lineWidgets) return;

		var startRow = delta.start.row;
		var len = delta.end.row - startRow;

		if (len === 0) {
			// return
		} else if (delta.action == "remove") {
			var removed = lineWidgets.splice(startRow + 1, len);
			if (!lineWidgets[startRow] && removed[removed.length - 1]) {
				lineWidgets[startRow] = removed.pop();
			}
			removed.forEach((w) => {
				w && this.removeLineWidget(w);
			});
			this.$updateRows();
		} else {
			var args = new Array(len);
			if (lineWidgets[startRow] && lineWidgets[startRow]!.column != null) {
				if (delta.start.column > lineWidgets[startRow]!.column!)
					startRow++;
			}
			lineWidgets.splice(startRow, 0, ...args);
			this.$updateRows();
		}
	}

	$updateRows() {
		var lineWidgets = this.session.lineWidgets;
		if (!lineWidgets) return;
		var noWidgets = true;
		lineWidgets.forEach(function(w, i) {
			if (w) {
				noWidgets = false;
				w.row = i;
				while (w.$oldWidget) {
					w.$oldWidget.row = i;
					w = w.$oldWidget;
				}
			}
		});
		if (noWidgets)
			this.session.lineWidgets = void 0;
	}

	/**
	 *
	 * @param {LineWidget} w
	 * @return {LineWidget}
	 */
	$registerLineWidget(w: LineWidget) {
		if (!this.session.lineWidgets)
			this.session.lineWidgets = new Array(this.session.getLength());

		var old = this.session.lineWidgets[w.row];
		if (old) {
			w.$oldWidget = old;
			if (old.el) {
				old.el.remove(); // remove from parent
				old._inDocument = false;
			}
		}

		this.session.lineWidgets[w.row] = w;
		return w;
	}

	/**
	 *
	 * @param {LineWidget} w
	 * @return {LineWidget}
	 */
	addLineWidget(w: LineWidget) {
		this.$registerLineWidget(w);
		w.session = this.session;

		if (!this.editor) return w;

		var renderer = this.editor.renderer;
		if (w.html && !w.el) {
			// w.el = dom.createElement("div");
			w.el = new Box(renderer.window);
			// TODO: IGNORE html content for now
			// w.el.innerHTML = w.html;
		}
		if (w.text && !w.el) {
			// w.el = dom.createElement("div");
			w.el = new Text(renderer.window);
			(w.el as Text).value = w.text;
		}
		if (w.el) {
			w.el.addClass("ace_lineWidgetContainer");
			if (w.className) {
				w.el.addClass(w.className);
			}
			// w.el.style.position = "absolute";
			w.el.style.zIndex = 5;
			renderer.container.append(w.el);
			w._inDocument = true;

			if (!w.coverGutter) {
				w.el.style.zIndex = 3;
			}
			if (w.pixelHeight == null) {
				// TODO: IGNORE measuring for now
				w.pixelHeight = w.el.clientSize.height; // w.pixelHeight = w.el.offsetHeight;
			}
		}
		if (w.rowCount == null) {
			w.rowCount = w.pixelHeight! / renderer.layerConfig.lineHeight;
		}

		var fold = this.session.getFoldAt(w.row, 0);
		w.$fold = fold!;
		if (fold) {
			var lineWidgets = this.session.lineWidgets!;
			if (w.row == fold.end.row && !lineWidgets[fold.start.row])
				lineWidgets[fold.start.row] = w;
			else
				w.hidden = true;
		}

		this.session._emit("changeFold", {data:{start:{row: w.row}}}, this.session);

		this.$updateRows();
		this.renderWidgets(null, renderer);
		this.onWidgetChanged(w);
		return w;
	}

	/**
	 * @param {LineWidget} w
	 */
	removeLineWidget(w: LineWidget) {
		w._inDocument = false;
		w.session = void 0;
		if (w.el)
			w.el.remove(); // remove from parent
		if (w.editor && w.editor.destroy) try {
			w.editor.destroy();
		} catch(e){}
		if (this.session.lineWidgets) {
			var w1 = this.session.lineWidgets[w.row];
			if (w1 == w) {
				this.session.lineWidgets[w.row] = w.$oldWidget;
				if (w.$oldWidget)
					this.onWidgetChanged(w.$oldWidget);
			} else {
				while (w1) {
					if (w1.$oldWidget == w) {
						w1.$oldWidget = w.$oldWidget;
						break;
					}
					w1 = w1.$oldWidget;
				}
			}
		}
		this.session._emit("changeFold", {data:{start:{row: w.row}}}, this.session);
		this.$updateRows();
	}

	/**
	 * @param {number} row
	 * @return {LineWidget[]}
	 */
	getWidgetsAtRow(row: number) {
		var lineWidgets = this.session.lineWidgets;
		var w = lineWidgets && lineWidgets[row];
		var list = [];
		while (w) {
			list.push(w);
			w = w.$oldWidget;
		}
		return list;
	}

	/**
	 * @param {LineWidget} w
	 * @internal
	 */
	onWidgetChanged(w: LineWidget) {
		this.session._changedWidgets!.push(w);
		this.editor && this.editor.renderer.updateFull();
	}

	/**
	 * @param {any} e
	 * @param {VirtualRenderer} renderer
	 */
	measureWidgets(e: any, renderer: VirtualRenderer) {
		var changedWidgets = this.session._changedWidgets;
		var config = renderer.layerConfig;

		if (!changedWidgets || !changedWidgets.length) return;
		var min = Infinity;
		for (var i = 0; i < changedWidgets.length; i++) {
			var w = changedWidgets[i];
			if (!w || !w.el) continue;
			if (w.session != this.session) continue;
			if (!w._inDocument) {
				if (this.session.lineWidgets![w.row] != w)
					continue;
				w._inDocument = true;
				renderer.container.append(w.el);
			}

			const clSize = w.el.clientSize;

			w._height = clSize.height;

			if (!w.fixedWidth) {
				w._width = clSize.width;
				w.screenWidth = Math.ceil(w._width / config.characterWidth);
			}

			var rowCount = w._height / config.lineHeight;
			if (w.coverLine) {
				rowCount -= this.session.getRowLineCount(w.row);
				if (rowCount < 0)
					rowCount = 0;
			}
			if (w.rowCount != rowCount) {
				w.rowCount = rowCount;
				if (w.row < min)
					min = w.row;
			}
		}
		if (min != Infinity) {
			this.session._emit("changeFold", {data:{start:{row: min}}}, this.session);
			// this.session.lineWidgetWidth = null;
		}
		this.session._changedWidgets = [];
	}

	/**
	 * @param {any} e
	 * @param {VirtualRenderer} renderer
	 */
	renderWidgets(e: any, renderer: VirtualRenderer) {
		var config = renderer.layerConfig;
		var lineWidgets = this.session.lineWidgets;
		if (!lineWidgets)
			return;
		var first = Math.min(this.firstRow||0, config.firstRow);
		var last = Math.max(this.lastRow||0, config.lastRow, lineWidgets.length);

		while (first > 0 && !lineWidgets[first])
			first--;

		this.firstRow = config.firstRow;
		this.lastRow = config.lastRow;

		renderer.$cursorLayer.config = config;
		for (var i = first; i <= last; i++) {
			var w = lineWidgets[i];
			if (!w || !w.el) continue;
			if (w.hidden) {
				w.el.style.marginTop = -100 - (w.pixelHeight || 0);
				continue;
			}
			if (!w._inDocument) {
				w._inDocument = true;
				renderer.container.append(w.el);
			}
			var top = renderer.$cursorLayer.getPixelPosition({row: i, column:0}, true).top;
			if (!w.coverLine)
				top += config.lineHeight * this.session.getRowLineCount(w.row);
			w.el.style.marginTop = top - config.offset;

			var left = w.coverGutter ? 0 : renderer.gutterWidth;
			if (!w.fixedWidth)
				left -= renderer.scrollLeft;
			w.el.style.marginLeft = left;

			if (w.fullWidth && w.screenWidth) {
				w.el.style.minWidth = config.width + 2 * config.padding;
				w.el.style.maxWidth = "auto"; // don't limit width
			}
			if (w.fixedWidth) {
				w.el.style.marginRight = renderer.scrollBar.getWidth();
				w.el.style.width = "match"; // match parent width
			} else {
				// w.el.style.right = "";
			}
		}
	}

}