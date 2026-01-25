"use strict";

import * as lang from "../lib/lang";
import {EventEmitter} from "../lib/event_emitter";
import {Lines,LayerConfig, Cell, CellElement} from "./lines";
import type { EditSession } from "../edit_session";
import config from "../config";
import {View, Box, Morph, Label} from "quark";
import type {UIEvent} from "quark/event";
import type {Delta, IRange} from "../range";
import type { Editor } from "../editor";

const nls = config.nls;

export type GutterRenderer = {
	/**
	 * - Gets the text to display for a given row
	 */
	getText: (session: EditSession, row: number) => string;
	/**
	 * - Calculates the width needed for the gutter
	 */
	getWidth: (session: EditSession, lastLineNumber: number, config: any) => number;
	/**
	 * - Updates the gutter display
	 */
	update?: (e: undefined, editor: Editor) => void;
	/**
	 * - Attaches the renderer to an editor
	 */
	attach?: (editor: Editor) => void;
	/**
	 * - Detaches the renderer from an editor
	 */
	detach?: (editor: Editor) => void;
};

export interface GutterEvents {
	"changeGutterWidth": (width: number, emitter: Gutter) => void;
	"afterRender": (e: undefined, emitter: Gutter) => void;
}

export interface Gutter extends EventEmitter<GutterEvents> {
	$useSvgGutterIcons?: boolean,
	$showFoldedAnnotations?: boolean,
}

export type Annotation = {
	row: number,
	column: number,
	text: string[],
	type: string[],
	className: string,
	displayText?: string[],
	html?: string,
}

export class Gutter extends EventEmitter<GutterEvents> {
	private $fixedWidth = false;
	private $highlightGutterLine = true;
	public $renderer?: GutterRenderer;
	private $showLineNumbers = true;
	private $showFoldWidgets = true;
	public $showCursorMarker: boolean | null | string;
	public element: Morph;
	public $annotations: (Annotation | null)[] = [];
	public $lines: Lines;
	private gutterWidth = 0;
	readonly session: EditSession;
	private config: LayerConfig;
	private oldLastRow: number;
	public $padding?: {left: number, right: number};
	private $cursorRow: number;
	public $cursorCell?: Cell;
	private $highlightElement?: Box;

	/**
	 * @param {View} parentEl
	 */
	constructor(parentEl: View) {
		super();
		this.$showCursorMarker = null;
		// this.element = dom.createElement("div");
		this.element = new Morph(parentEl.window);
		this.element.class = ["ace_layer", "ace_gutter-layer"];
		this.element.style.layout = 'free'; // absolute positioning of children
		parentEl.append(this.element);
		this.setShowFoldWidgets(this.$showFoldWidgets);

		this.$updateAnnotations = this.$updateAnnotations.bind(this);

		this.$lines = new Lines(this.element);
		this.$lines.$offsetCoefficient = 1;
	}

	/**
	 * @param {EditSession} session
	 */
	setSession(session: EditSession) {
		if (this.session)
			this.session.off("change", this.$updateAnnotations);
		(this as any).session = session;
		if (session)
			session.on("change", this.$updateAnnotations);
	}

	/**
	 * @param {number} row
	 * @param {string} className
	 */
	addGutterDecoration(row: number, className: string) {
		// if (window.console)
		console.warn && console.warn("deprecated use session.addGutterDecoration");
		this.session.addGutterDecoration(row, className);
	}

	/**
	 * @param {number} row
	 * @param {string} className
	 */
	removeGutterDecoration(row: number, className: string) {
		// if (window.console)
		console.warn && console.warn("deprecated use session.removeGutterDecoration");
		this.session.removeGutterDecoration(row, className);
	}

	/**
	 * @param {any[]} annotations
	 */
	setAnnotations(annotations: Annotation[]) {
		// iterate over sparse array
		this.$annotations = [];
		for (var i = 0; i < annotations.length; i++) {
			var annotation = annotations[i];
			var row = annotation.row;
			var rowInfo = this.$annotations[row];
			if (!rowInfo)
				rowInfo = this.$annotations[row] = {row:0, column:0, className: '', text: [], type: [], displayText: []};

			var annoText = annotation.text[0];
			var displayAnnoText = annotation.displayText?.[0] || annoText;
			var annoType = annotation.type[0];
			annoText = annoText ? lang.escapeHTML(annoText) : annotation.html || "";
			displayAnnoText = displayAnnoText ? displayAnnoText : annotation.html || "";

			if (rowInfo.text.indexOf(annoText) === -1){
				rowInfo.text.push(annoText);
				rowInfo.type.push(annoType);
				rowInfo.displayText!.push(displayAnnoText);
			}

			var className = annotation.className;
			if (className) {
				rowInfo.className = className;
			} else if (annoType === "error") {
				rowInfo.className = " ace_error";
			} else if (annoType === "security" && !/\bace_error\b/.test(rowInfo.className)) {
				rowInfo.className = " ace_security";
			} else if (annoType === "warning" && !/\bace_(error|security)\b/.test(rowInfo.className)) {
				rowInfo.className = " ace_warning";
			} else if (annoType === "info" && !rowInfo.className) {
				rowInfo.className = " ace_info";
			} else if (annoType === "hint" && !rowInfo.className) {
				rowInfo.className = " ace_hint";
			}
		}
	}

	/**
	 * @param {Delta} delta
	 */
	$updateAnnotations(delta: Delta) {
		if (!this.$annotations.length)
			return;
		var firstRow = delta.start.row;
		var len = delta.end.row - firstRow;
		if (len === 0) {
			// do nothing
		} else if (delta.action == 'remove') {
			this.$annotations.splice(firstRow, len + 1, null);
		} else {
			var args = new Array(len + 1);
			this.$annotations.splice(firstRow, 1, ...args);
		}
	}

	/**
	 * @param {LayerConfig} config
	 */
	update(config: LayerConfig) {
		this.config = config;
		
		var session = this.session;
		var firstRow = config.firstRow;
		var lastRow = Math.min(config.lastRow + config.gutterOffset,  // needed to compensate for hor scollbar
			session.getLength() - 1);

		this.oldLastRow = lastRow;
		this.config = config;
		
		this.$lines.moveContainer(config);
		this.$updateCursorRow();
			
		var fold = session.getNextFoldLine(firstRow);
		var foldStart = fold ? fold.start.row : Infinity;

		var cell = null;
		var index = -1;
		var row = firstRow;
		
		while (true) {
			if (row > foldStart) {
				row = fold!.end.row + 1;
				fold = session.getNextFoldLine(row, fold!);
				foldStart = fold ? fold.start.row : Infinity;
			}
			if (row > lastRow) {
				while (this.$lines.getLength() > index + 1)
					this.$lines.pop();
					
				break;
			}

			cell = this.$lines.get(++index);
			if (cell) {
				cell.row = row;
			} else {
				cell = this.$lines.createCell(row, config, this.session, onCreateCell);
				this.$lines.push(cell);
			}

			this.$renderCell(cell, config, fold!, row);
			row++;
		}
		
		this._signal("afterRender", void 0, this);
		this.$updateGutterWidth(config);
		
		if (this.$showCursorMarker && this.$highlightGutterLine)
			this.$updateCursorMarker();
	}

	/**
	 * @param {LayerConfig} config
	 */
	$updateGutterWidth(config: LayerConfig) {
		var session = this.session;
		
		var gutterRenderer = session.gutterRenderer || this.$renderer;

		var firstLineNumber = session.$firstLineNumber!;
		var lastLineText = this.$lines.last() ? this.$lines.last()!.text : "";
		
		if (this.$fixedWidth || session.$useWrapMode)
			lastLineText = String(session.getLength() + firstLineNumber - 1);

		var gutterWidth = gutterRenderer 
			? gutterRenderer.getWidth(session, lastLineText, config)
			: lastLineText.toString().length * config.characterWidth;
		
		var padding = this.$padding || this.$computePadding();
		gutterWidth += padding.left + padding.right;
		if (gutterWidth !== this.gutterWidth && !isNaN(gutterWidth)) {
			this.gutterWidth = gutterWidth;
			/**@type{any}*/
			(this.element.parent!).style.width =
				this.element.style.width = Math.ceil(this.gutterWidth);
			this._signal("changeGutterWidth", gutterWidth, this);
		}
	}

	$updateCursorRow() {
		if (!this.$highlightGutterLine)
			return;

		var position = this.session.selection.getCursor();
		if (this.$cursorRow === position.row)
			return;
		
		this.$cursorRow = position.row;
	}

	updateLineHighlight() {
		if (this.$showCursorMarker)
			this.$updateCursorMarker();

		if (!this.$highlightGutterLine)
			return;
		var row = this.session.selection.cursor.row;
		this.$cursorRow = row;

		if (this.$cursorCell && this.$cursorCell.row == row)
			return;
		if (this.$cursorCell)
			this.$cursorCell.element.removeClass("ace_gutter-active-line");
		var cells = this.$lines.cells;
		this.$cursorCell = void 0;
		for (var i = 0; i < cells.length; i++) {
			var cell = cells[i];
			if (cell.row >= this.$cursorRow) {
				if (cell.row > this.$cursorRow) {
					var fold = this.session.getFoldLine(this.$cursorRow);
					if (i > 0 && fold && fold.start.row == cells[i - 1].row)
						cell = cells[i - 1];
					else
						break;
				}
				cell.element.class = ["ace_gutter-active-line", ...cell.element.class];
				this.$cursorCell = cell;
				break;
			}
		}
	}

	$updateCursorMarker() {
		if (!this.session)
			return;
		var session = this.session;
		if (!this.$highlightElement) {
			// this.$highlightElement = dom.createElement("div");
			this.$highlightElement = new Box(this.element.window);
			this.$highlightElement.class = ["ace_gutter-cursor"];
			// this.$highlightElement.style.pointerEvents = "none";
			this.$highlightElement.receive = false;
			this.element.append(this.$highlightElement);
		}
		var pos = session.selection.cursor;
		var config = this.config;
		var lines = this.$lines;

		var screenTop = config.firstRowScreen * config.lineHeight;
		var screenPage = Math.floor(screenTop / lines.canvasHeight);
		var lineTop = session.documentToScreenRow(pos) * config.lineHeight;
		var top = lineTop - (screenPage * lines.canvasHeight);

		this.$highlightElement.style.height = config.lineHeight;
		this.$highlightElement.style.marginTop = top;
	}

	/**
	 * @param {LayerConfig} config
	 */
	scrollLines(config: LayerConfig) {
		var oldConfig = this.config;
		this.config = config;
		
		this.$updateCursorRow();
		if (this.$lines.pageChanged(oldConfig, config))
			return this.update(config);
		
		this.$lines.moveContainer(config);

		var lastRow = Math.min(config.lastRow + config.gutterOffset,  // needed to compensate for hor scollbar
			this.session.getLength() - 1);
		var oldLastRow = this.oldLastRow;
		this.oldLastRow = lastRow;
		
		if (!oldConfig || oldLastRow < config.firstRow)
			return this.update(config);

		if (lastRow < oldConfig.firstRow)
			return this.update(config);

		if (oldConfig.firstRow < config.firstRow)
			for (var row=this.session.getFoldedRowCount(oldConfig.firstRow, config.firstRow - 1); row>0; row--)
				this.$lines.shift();

		if (oldLastRow > lastRow)
			for (var row=this.session.getFoldedRowCount(lastRow + 1, oldLastRow); row>0; row--)
				this.$lines.pop();

		if (config.firstRow < oldConfig.firstRow) {
			this.$lines.unshift(this.$renderLines(config, config.firstRow, oldConfig.firstRow - 1));
		}

		if (lastRow > oldLastRow) {
			this.$lines.push(this.$renderLines(config, oldLastRow + 1, lastRow));
		}
		
		this.updateLineHighlight();
		
		this._signal("afterRender", void 0, this);
		this.$updateGutterWidth(config);
	}

	/**
	 * @param {LayerConfig} config
	 * @param {number} firstRow
	 * @param {number} lastRow
	 */
	$renderLines(config: LayerConfig, firstRow: number, lastRow: number) {
		var fragment = [];
		var row = firstRow;
		var foldLine = this.session.getNextFoldLine(row);
		var foldStart = foldLine ? foldLine.start.row : Infinity;

		while (true) {
			if (row > foldStart) {
				row = foldLine!.end.row+1;
				foldLine = this.session.getNextFoldLine(row, foldLine!);
				foldStart = foldLine ? foldLine.start.row : Infinity;
			}
			if (row > lastRow)
				break;

			var cell = this.$lines.createCell(row, config, this.session, onCreateCell);
			this.$renderCell(cell, config, foldLine!, row);
			fragment.push(cell);

			row++;
		}
		return fragment;
	}


	/**
	 * @param {any} cell
	 * @param {LayerConfig} config
	 * @param {IRange | undefined} fold
	 * @param {number} row
	 */
	$renderCell(cell: Cell, config: LayerConfig, fold: IRange | undefined, row: number) {
		var element = cell.element;

		var session = this.session;

		// var textNode = element.childNodes[0];
		var textNode = element.textNode;
		// var foldWidget = element.childNodes[1];
		var foldWidget = element.foldWidget;
		// var annotationNode = element.childNodes[2];
		var annotationNode = element.annotationNode;
		// var customWidget = element.childNodes[3];
		var customWidget = element.customWidget;
		// var annotationIconNode = annotationNode.firstChild;
		var annotationIconNode = element.annotationIconNode;

		var firstLineNumber = session.$firstLineNumber!;
		
		var breakpoints = session.$breakpoints;
		var decorations = session.$decorations;
		var gutterRenderer = session.gutterRenderer || this.$renderer;
		var foldWidgets = this.$showFoldWidgets && session.foldWidgets;
		var foldStart = fold ? fold.start.row : Number.MAX_VALUE;
		
		var lineHeight = config.lineHeight;

		var className = this.$useSvgGutterIcons ? "ace_gutter-cell_svg-icons " : "ace_gutter-cell ";
		var iconClassName = this.$useSvgGutterIcons ? "ace_icon_svg" : "ace_icon";
		
		var rowText = (gutterRenderer
			? gutterRenderer.getText(session, row)
			: row + firstLineNumber).toString();

		if (this.$highlightGutterLine) {
			if (row == this.$cursorRow || (fold && row < this.$cursorRow && row >= foldStart &&  this.$cursorRow <= fold.end.row)) {
				className += "ace_gutter-active-line ";
				if (this.$cursorCell != cell) {
					if (this.$cursorCell)
						this.$cursorCell.element.removeClass("ace_gutter-active-line");
					this.$cursorCell = cell;
				}
			}
		}
		
		if (breakpoints[row])
			className += breakpoints[row];
		if (decorations[row])
			className += decorations[row];
		if (this.$annotations[row] && row !== foldStart)
			className += this.$annotations[row].className;

		if (foldWidgets) {
			var c = foldWidgets[row];
			// check if cached value is invalidated and we need to recompute
			if (c == null)
				c = foldWidgets[row] = session.getFoldWidget(row);
		}

		var annotationInFold = false;
		var foldAnnotationClass = "";

		if (c) {
			var foldClass = "ace_fold-widget ace_" + c;
			var isClosedFold = c == "start" && row == foldStart && row < fold!.end.row;
			if (isClosedFold) {
				foldClass += " ace_closed";
				// var foldAnnotationClass = "";
				// var annotationInFold = false;

				for (var i = row + 1; i <= fold!.end.row; i++) {
					if (!this.$annotations[i])
						continue;

					if (this.$annotations[i]!.className === " ace_error") {
						annotationInFold = true;
						foldAnnotationClass = " ace_error_fold";
						break;
					}

					if (this.$annotations[i]!.className === " ace_security") {
						annotationInFold = true;
						foldAnnotationClass = " ace_security_fold";
					} else if (
						this.$annotations[i]!.className === " ace_warning" &&
						foldAnnotationClass !== " ace_security_fold"
					) {
						annotationInFold = true;
						foldAnnotationClass = " ace_warning_fold";
					}
				}

				className += foldAnnotationClass;
			}
			else
				foldClass += " ace_open";
			if (foldWidget.class.join(' ') != foldClass)
				foldWidget.class = foldClass.split(' ');

			// dom.setStyle(foldWidget.style, "height", lineHeight);
			foldWidget.style.height = lineHeight;
			// dom.setStyle(foldWidget.style, "display", "inline-block");

			// Set a11y properties.
			foldWidget.setAttribute("role", "button");
			foldWidget.setAttribute("tabindex", "-1");

			var foldRange = session.getFoldWidgetRange(row);

			// getFoldWidgetRange is optional to be implemented by fold modes, if not available we fall-back.
			if (foldRange)
				foldWidget.setAttribute("aria-label",
					nls("gutter.code-folding.range.aria-label", "Toggle code folding, rows $0 through $1", [
						foldRange.start.row + 1,
						foldRange.end.row + 1
					]));
			else {
				if (fold)
					foldWidget.setAttribute("aria-label",
						nls("gutter.code-folding.closed.aria-label", "Toggle code folding, rows $0 through $1", [
							fold.start.row + 1,
							fold.end.row + 1
						]));
				else
					foldWidget.setAttribute("aria-label",
						nls("gutter.code-folding.open.aria-label", "Toggle code folding, row $0", [row + 1]));
			}

			if (isClosedFold) {
				foldWidget.setAttribute("aria-expanded", "false");
				foldWidget.setAttribute("title", nls("gutter.code-folding.closed.title", "Unfold code"));
			} else {
				foldWidget.setAttribute("aria-expanded", "true");
				foldWidget.setAttribute("title", nls("gutter.code-folding.open.title", "Fold code"));
			}
		} else {
			if (foldWidget) {
				// dom.setStyle(foldWidget.style, "display", "none");
				foldWidget.visible = false;
				foldWidget.setAttribute("tabindex", "0");
				foldWidget.removeAttribute("role");
				foldWidget.removeAttribute("aria-label");
			}
		}
		// fold logic ends here 
		const customWidgetAttributes = this.session.$gutterCustomWidgets[row];
		if (customWidgetAttributes) {
			this.$addCustomWidget(row, customWidgetAttributes,cell);
		}
		else if (customWidget){
			this.$removeCustomWidget(row,cell);
		}

		if (annotationInFold && this.$showFoldedAnnotations){
			annotationNode.class = ["ace_gutter_annotation"];
			annotationIconNode.class = [iconClassName, foldAnnotationClass];

			// dom.setStyle(annotationIconNode.style, "height", lineHeight);
			annotationIconNode.style.height = lineHeight;
			// dom.setStyle(annotationNode.style, "display", "block");
			annotationNode.style.visible = true;
			// dom.setStyle(annotationNode.style, "height", lineHeight);
			annotationNode.style.height = lineHeight;

			var ariaLabel;
			switch(foldAnnotationClass) {
				case " ace_error_fold":
					ariaLabel = nls("gutter.annotation.aria-label.error", "Error, read annotations row $0", [rowText]);
					break;

				case " ace_security_fold":
					ariaLabel = nls("gutter.annotation.aria-label.security", "Security finding, read annotations row $0", [rowText]);
					break;

				case " ace_warning_fold":
					ariaLabel = nls("gutter.annotation.aria-label.warning", "Warning, read annotations row $0", [rowText]);
					break;
			}
			annotationNode.setAttribute("aria-label", ariaLabel);
			annotationNode.setAttribute("tabindex", -1);
			annotationNode.setAttribute("role", "button");
		}
		else if (this.$annotations[row]){
			annotationNode.class = ["ace_gutter_annotation"];
			annotationIconNode.class = [iconClassName];

			if (this.$useSvgGutterIcons)
				annotationIconNode.addClass(this.$annotations[row].className);
			else 
				element.addClass(this.$annotations[row].className.replace(" ", ""));

			// dom.setStyle(annotationIconNode.style, "height", lineHeight);
			annotationIconNode.style.height = lineHeight;
			// dom.setStyle(annotationNode.style, "display", "block");
			annotationNode.style.visible = true;
			// dom.setStyle(annotationNode.style, "height", lineHeight);
			annotationNode.style.height = lineHeight;
			var ariaLabel;
			switch(this.$annotations[row].className) {
				case " ace_error":
					ariaLabel = nls("gutter.annotation.aria-label.error", "Error, read annotations row $0", [rowText]);
					break;

				case " ace_security":
					ariaLabel = nls("gutter.annotation.aria-label.security", "Security finding, read annotations row $0", [rowText]);
					break;

				case " ace_warning":
					ariaLabel = nls("gutter.annotation.aria-label.warning", "Warning, read annotations row $0", [rowText]);
					break;

				case " ace_info":
					ariaLabel = nls("gutter.annotation.aria-label.info", "Info, read annotations row $0", [rowText]);
					break;

				case " ace_hint":
					ariaLabel = nls("gutter.annotation.aria-label.hint", "Suggestion, read annotations row $0", [rowText]);
					break;
			}
			annotationNode.setAttribute("aria-label", ariaLabel);
			annotationNode.setAttribute("tabindex", -1);
			annotationNode.setAttribute("role", "button");
		}
		else {
			// dom.setStyle(annotationNode.style, "display", "none");
			annotationNode.style.visible = false;
			annotationNode.removeAttribute("aria-label");
			annotationNode.removeAttribute("role");
			annotationNode.setAttribute("tabindex", 0);
		}
		if (rowText !== textNode.data) {
			textNode.data = rowText;
		} 

		if (element.class.join(' ') != className)
			element.class = className.split(' ');
		cell.element.style.height = this.$lines.computeLineHeight(row, config, session);
		cell.element.style.marginTop = this.$lines.computeLineTop(row, config, session);

		cell.text = rowText;

		// If there are no annotations or fold widgets in the gutter cell, hide it from assistive tech.
		if (annotationNode.visible === false && foldWidget.visible === false && !customWidgetAttributes)
			cell.element.setAttribute("aria-hidden", true);
		else
			cell.element.setAttribute("aria-hidden", false);

		return cell;
	}

	/**
	 * @param {boolean} highlightGutterLine
	 */
	setHighlightGutterLine(highlightGutterLine: boolean) {
		this.$highlightGutterLine = highlightGutterLine;
		if (!highlightGutterLine && this.$highlightElement) {
			this.$highlightElement.remove();
			this.$highlightElement = void 0;
		}
	}

	/**
	 * @param {boolean} show
	 */
	setShowLineNumbers(show: boolean) {
		/**@type{GutterRenderer}*/
		// this.$renderer = !show && {
		// 	getWidth: function() {return 0;},
		// 	getText: function() {return "";}
		// };
		this.$renderer = !show ? {
			getWidth: function() {return 0;},
			getText: function() {return "";}
		} : undefined;
	}
	
	getShowLineNumbers() {
		return this.$showLineNumbers;
	}

	/**
	 * @param {boolean} [show]
	 */
	setShowFoldWidgets(show: boolean) {
		if (show)
			this.element.addClass("ace_folding-enabled");
		else
			this.element.removeClass("ace_folding-enabled");

		this.$showFoldWidgets = show;
		this.$padding = void 0;
	}

	getShowFoldWidgets() {
		return this.$showFoldWidgets;
	}
	
	/**
	 * Hides the fold widget/icon from a specific row in the gutter
	 * @param {number} row The row number from which to hide the fold icon
	 * @param {any} cell - Gutter cell 
	 * @experimental
	 */
	$hideFoldWidget(row: number, cell?: Cell) {
		const rowCell = cell || this.$getGutterCell(row);
		if (rowCell && rowCell.element) {
			const foldWidget = rowCell.element.foldWidget;
			if (foldWidget) {
				foldWidget.visible = false;
			}
		}
	}

	/**
	 * Shows the fold widget/icon from a specific row in the gutter
	 * @param {number} row The row number from which to show the fold icon
	 * @param {any} cell - Gutter cell 
	 * @experimental
	 */
	$showFoldWidget(row: number, cell?: Cell) {
		const rowCell = cell || this.$getGutterCell(row);
		if (rowCell && rowCell.element) {
			const foldWidget = rowCell.element.foldWidget;
			if (foldWidget && this.session.foldWidgets && this.session.foldWidgets[rowCell.row]) {
				// dom.setStyle(foldWidget.style, "display", "inline-block");
				foldWidget.visible = true;
			}
		}
	}

	/**
	* Retrieves the gutter cell element at the specified cursor row position.
	* @param {number} row - The row number in the editor where the gutter cell is located starts from 0
	* @returns {Cell|undefined} The gutter cell element at the specified row, or undefined if not found
	* @experimental
	*/
	$getGutterCell(row: number) {
		var cells = this.$lines.cells;
		var min = 0;
		var max = cells.length - 1;
		
		if (row < cells[0].row || row > cells[max].row)
			return;
		var cell: Cell | undefined;
		while (min <= max) {
			var mid = Math.floor((min + max) / 2);
			cell = cells[mid];
			if (cell.row > row) {
				max = mid - 1;
			} else if (cell.row < row) {
				min = mid + 1;
			} else {
				return cell;
			}
		}
		return cell;
	}

	/**
	* Displays a custom widget for a specific row
	* @param {number} row - The row number where the widget will be displayed
	* @param {Object} attributes - Configuration attributes for the widget
	* @param {string} attributes.className - CSS class name for styling the widget
	* @param {string} attributes.label - Text label to display in the widget
	* @param {string} attributes.title - Tooltip text for the widget
	* @param {Object} attributes.callbacks - Event callback functions for the widget e.g onClick; 
	* @param {any} cell - Gutter cell 
	* @returns {void}
	* @experimental
	*/
	$addCustomWidget(row: number, {className, label, title, callbacks}:
			{className: string, label?: string, title?: string, callbacks?: {onClick?: (e: UIEvent, row: number)=>void }}, cell?: Cell) {
		this.session.$gutterCustomWidgets[row] = {className, label, title, callbacks};
		this.$hideFoldWidget(row,cell);

		// cell is required because when cached cell is used to render, $lines won't have that cell
		const rowCell = cell || this.$getGutterCell(row);
		if (rowCell && rowCell.element) {
			let customWidget = rowCell.element.customWidget;
			// deleting the old custom widget to remove the old click event listener
			if (customWidget) {
				customWidget.remove();
			}

			// customWidget = dom.createElement("span");
			customWidget = new Box(rowCell.element.window);
			rowCell.element.customWidget = customWidget; // storing reference to the custom widget in the cell element
			customWidget.class = [`ace_custom-widget`, className];
			customWidget.setAttribute("tabindex", -1);
			customWidget.setAttribute("role", 'button');
			customWidget.setAttribute("aria-label", label);
			customWidget.setAttribute("title", title);
			// dom.setStyle(customWidget.style, "display", "inline-block");
			customWidget.visible = true;
			// dom.setStyle(customWidget.style, "height", "inherit");
			customWidget.style.height = "auto";
			
			if (callbacks&& callbacks.onClick) {
				customWidget.addEventListener("click", (e) => {
					callbacks.onClick!(e, row);
					e.cancelBubble();
				});
			}

			rowCell.element.append(customWidget);
		}
	}
	
	/**
	* Remove a custom widget for a specific row
	* @param {number} row - The row number where the widget will be removed
	* @param {any} cell - Gutter cell 
	* @returns {void}
	* @experimental
	*/
	$removeCustomWidget(row: number, cell?: Cell) {
		delete this.session.$gutterCustomWidgets[row];
		this.$showFoldWidget(row,cell);

		// cell is required because when cached cell is used to render, $lines won't have that cell
		const rowCell = cell || this.$getGutterCell(row);
		if (rowCell && rowCell.element) {
			const customWidget = rowCell.element.customWidget;
			if (customWidget) {
				customWidget.remove();
			}
		}
	}

	$computePadding() {
		if (!this.element.first)
			return {left: 0, right: 0};
		const first = this.element.first as Box;
		this.$padding = {left: 0, right: 0};
		this.$padding.left = (first.borderLeftWidth || 0)
			+ (first.paddingLeft || 0) + 1;
		this.$padding.right = (first.borderRightWidth || 0)
			+ (first.paddingRight || 0);
		return this.$padding;
	}

	/**
	 * @param {{ x: number; }} point
	 */
	getRegion(point: { x: number; }) {
		var padding = this.$padding || this.$computePadding();
		var pos = this.element.position;
		var size = this.element.clientSize;
		if (point.x < padding.left + pos.x)
			return "markers";
		if (this.$showFoldWidgets && point.x > pos.x + size.x - padding.right)
			return "foldWidgets";
	}
}

function onCreateCell(element: CellElement) {
	// var textNode = document.createTextNode('');
	var textNode = new Label(element.window);
	// element.appendChild(textNode);
	element.append(textNode);
	element.textNode = textNode;

	// var foldWidget = dom.createElement("span");
	var foldWidget = new Box(element.window);
	element.append(foldWidget);
	element.foldWidget = foldWidget;

	// var annotationNode = dom.createElement("span");
	var annotationNode = new Box(element.window);
	element.append(annotationNode);
	element.annotationNode = annotationNode;

	// var annotationIconNode = dom.createElement("span");
	var annotationIconNode = new Box(element.window);
	annotationNode.append(annotationIconNode);
	element.annotationIconNode = annotationIconNode;
	
	return element;
}