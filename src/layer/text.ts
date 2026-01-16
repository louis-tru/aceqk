"use strict";

import type { LayerConfig } from "./lines";
import * as lang from "../lib/lang";
import { Lines, Cell} from "./lines";
import { EventEmitter} from "../lib/event_emitter";
import { isTextToken} from "./text_util";
import config from "../config";
import type {EditSession} from "../edit_session";
import {View, Text as TextView, Morph, Label, Box} from "quark";
import {FontMetrics} from "./font_metrics";
import type { Token } from "../background_tokenizer";
import type {FoldLine} from "../edit_session/fold_line";

const nls = config.nls;

type TextMarkersMixin = import("./text_markers").TextMarkerMixin;

export interface TextEvents {
	"changeCharacterSize": (e: any, emitter: Text) => void;
}

export interface Text extends EventEmitter<TextEvents>, TextMarkersMixin {
	config: LayerConfig
}

export class Text extends EventEmitter<TextEvents> {
	private EOF_CHAR = "\xB6";
	private EOL_CHAR_LF = "\xAC";
	private EOL_CHAR_CRLF = "\xa4";
	public EOL_CHAR = Text.prototype.EOL_CHAR_LF;
	private TAB_CHAR = "\u2014"; //"\u21E5";
	private SPACE_CHAR = "\xB7";
	private $padding = 0;
	public MAX_LINE_LENGTH = 10000;
	private showInvisibles: string | boolean = false;
	private showSpaces = false;
	private showTabs = false;
	private showEOL = false;
	private displayIndentGuides = true;
	private $highlightIndentGuides = true;
	private $tabStrings: (Label|TextView)[] & {" "?: Label, "\t"?: Label} = [];
	private destroy = {};
	public onChangeTabSize = Text.prototype.$computeTabString;
	public element: Morph;
	public $lines: Lines<Box>;
	public session: EditSession;
	private $fontMetrics: FontMetrics;
	private $highlightIndentGuideMarker?: { indentLevel?: number; start?: number; end?: number; dir?: number; };
	private $pollSizeChangesTimer?: TimeoutResult;
	private tabSize?: number;
	private $indentGuideRe?: RegExp;
	public $lenses?: TextView[]; // @ext/code_lens

	/**
	 * @param {View} parentEl
	 */
	constructor(parentEl: View) {
		super();
		// this.element = this.dom.createElement("div");
		this.element = new Morph(parentEl.window);
		this.element.class = ["ace_layer", "ace_text-layer"];
		this.element.style.layout = "free";
		this.element.data = {};
		parentEl.append(this.element);
		this.$updateEolChar = this.$updateEolChar.bind(this);
		this.$lines = new Lines(this.element);
	}

	$updateEolChar() {
		var doc = this.session.doc;
		var unixMode = doc.getNewLineCharacter() == "\n" && doc.getNewLineMode() != "windows";
		var EOL_CHAR = unixMode ? this.EOL_CHAR_LF : this.EOL_CHAR_CRLF;
		if (this.EOL_CHAR != EOL_CHAR) {
			this.EOL_CHAR = EOL_CHAR;
			return true;
		}
	}

	/**
	 * @param {number} padding
	 */
	setPadding(padding: number) {
		this.$padding = padding;
		this.element.style.margin = [0, padding]; // top/bottom, left/right
	}

	/**
	 * @returns {number}
	 */
	getLineHeight() {
		return this.$fontMetrics.$characterSize.height || 0;
	}

	/**
	 * @returns {number}
	 */
	getCharacterWidth() {
		return this.$fontMetrics.$characterSize.width || 0;
	}

	/**
	 * @param {FontMetrics} measure
	 */
	$setFontMetrics(measure: FontMetrics) {
		this.$fontMetrics = measure;
		this.$fontMetrics.on("changeCharacterSize", (e)=>{
			this._signal("changeCharacterSize", e, this);
		});
		this.$pollSizeChanges();
	}

	checkForSizeChanges() {
		this.$fontMetrics.checkForSizeChanges();
	}
	$pollSizeChanges() {
		return this.$pollSizeChangesTimer = this.$fontMetrics.$pollSizeChanges();
	}

	/**
	 * @param {EditSession} session
	 */
	setSession(session: EditSession) {
		/**@type {EditSession}*/
		this.session = session;
		if (session)
			this.$computeTabString();
	}

	/**
	 * @param {string} showInvisibles
	 */
	setShowInvisibles(showInvisibles: string | boolean) {
		if (this.showInvisibles == showInvisibles)
			return false;

		this.showInvisibles = showInvisibles;
		if (typeof showInvisibles == "string") {
			this.showSpaces = /tab/i.test(showInvisibles);
			this.showTabs = /space/i.test(showInvisibles);
			this.showEOL = /eol/i.test(showInvisibles);
		} else {
			this.showSpaces = this.showTabs = this.showEOL = showInvisibles;
		}
		this.$computeTabString();
		return true;
	}

	/**
	 * @param {boolean} display
	 */
	setDisplayIndentGuides(display: boolean) {
		if (this.displayIndentGuides == display)
			return false;

		this.displayIndentGuides = display;
		this.$computeTabString();
		return true;
	}

	/**
	 * @param {boolean} highlight
	 */
	setHighlightIndentGuides(highlight: boolean) {
		if (this.$highlightIndentGuides === highlight) return false;

		this.$highlightIndentGuides = highlight;
		return highlight;
	}

	$computeTabString() {
		var tabSize = this.session.getTabSize();
		this.tabSize = tabSize;
		this.$tabStrings = [0] as unknown as Label[]; // first element is dummy to make index == tabSize
		var tabStr = this.$tabStrings;
		for (var i = 1; i < tabSize + 1; i++) {
			if (this.showTabs) {
				// var span = this.dom.createElement("span");
				var span = new Label(this.element.window);
				span.class = ["ace_invisible", "ace_invisible_tab"];
				// span.textContent = lang.stringRepeat(this.TAB_CHAR, i);
				span.value = lang.stringRepeat(this.TAB_CHAR, i);
				tabStr.push(span);
			} else {
				// tabStr.push(this.dom.createTextNode(lang.stringRepeat(" ", i), this.element));
				var label = new Label(this.element.window);
				// label.textContent = lang.stringRepeat(" ", i);
				label.value = lang.stringRepeat(" ", i);
				tabStr.push(label);
			}
		}
		if (this.displayIndentGuides) {
			this.$indentGuideRe =  /\s\S| \t|\t |\s$/;
			var className = "ace_indent-guide";
			var spaceClass = this.showSpaces ? " ace_invisible ace_invisible_space" : "";
			var spaceContent = this.showSpaces
				? lang.stringRepeat(this.SPACE_CHAR, this.tabSize)
				: lang.stringRepeat(" ", this.tabSize);

			var tabClass = this.showTabs ? " ace_invisible ace_invisible_tab" : "";
			var tabContent = this.showTabs
				? lang.stringRepeat(this.TAB_CHAR, this.tabSize)
				: spaceContent;

			// var span = this.dom.createElement("span");
			var span = new Label(this.element.window);
			span.class = (className + spaceClass).split(" ");
			// span.textContent = spaceContent;
			span.value = spaceContent;
			this.$tabStrings[" "] = span;

			// var span = this.dom.createElement("span");
			var span = new Label(this.element.window);
			span.class = (className + tabClass).split(" ");
			// span.textContent = tabContent;
			span.value = tabContent;
			this.$tabStrings["\t"] = span;
		}
	}

	/**
	 * @param {LayerConfig} config
	 * @param {number} firstRow
	 * @param {number} lastRow
	 */
	updateLines(config: LayerConfig, firstRow: number, lastRow: number) {
		// Due to wrap line changes there can be new lines if e.g.
		// the line to updated wrapped in the meantime.
		if (this.config.lastRow != config.lastRow ||
			this.config.firstRow != config.firstRow) {
			return this.update(config);
		}

		this.config = config;

		var first = Math.max(firstRow, config.firstRow);
		var last = Math.min(lastRow, config.lastRow);

		var lineElements: View[] = [];//this.element.childNodes;
		var lineElementsIdx = 0;
		var v = this.element.first;
		while (v) {
			lineElements.push(v);
			v = v.next;
		}

		for (var row = config.firstRow; row < first; row++) {
			var foldLine = this.session.getFoldLine(row);
			if (foldLine) {
				if (foldLine.containsRow(first)) {
					first = foldLine.start.row;
					break;
				} else {
					row = foldLine.end.row;
				}
			}
			lineElementsIdx ++;
		}

		var heightChanged = false;
		var row = first;
		var foldLine = this.session.getNextFoldLine(row);
		var foldStart = foldLine ? foldLine.start.row : Infinity;

		while (true) {
			if (row > foldStart) {
				row = foldLine!.end.row+1;
				foldLine = this.session.getNextFoldLine(row, foldLine!);
				foldStart = foldLine ? foldLine.start.row :Infinity;
			}
			if (row > last)
				break;

			/**@type{any}*/var lineElement = lineElements[lineElementsIdx++];
			if (lineElement) {
				lineElement.removeAllChild();
				this.$renderLine(
					lineElement, row, row == foldStart ? foldLine : false
				);

				if (heightChanged)
					lineElement.style.marginTop = this.$lines.computeLineTop(row, config, this.session);

				var height = (config.lineHeight * this.session.getRowLength(row));
				if (lineElement.style.height != height) {
					heightChanged = true;
					lineElement.style.height = height;
				}
			}
			row++;
		}
		if (heightChanged) {
			while (lineElementsIdx < this.$lines.cells.length) {
				var cell = this.$lines.cells[lineElementsIdx++];
				cell.element.style.marginTop = this.$lines.computeLineTop(cell.row, config, this.session);
			}
		}
	}

	/**
	 * @param {LayerConfig} config
	 */
	scrollLines(config: LayerConfig) {
		var oldConfig = this.config;
		this.config = config;

		if (this.$lines.pageChanged(oldConfig, config))
			return this.update(config);

		this.$lines.moveContainer(config);

		var lastRow = config.lastRow;
		var oldLastRow = oldConfig ? oldConfig.lastRow : -1;

		if (!oldConfig || oldLastRow < config.firstRow)
			return this.update(config);

		if (lastRow < oldConfig.firstRow)
			return this.update(config);

		if (!oldConfig || oldConfig.lastRow < config.firstRow)
			return this.update(config);

		if (config.lastRow < oldConfig.firstRow)
			return this.update(config);

		if (oldConfig.firstRow < config.firstRow)
			for (var row=this.session.getFoldedRowCount(oldConfig.firstRow, config.firstRow - 1); row>0; row--)
				this.$lines.shift();

		if (oldConfig.lastRow > config.lastRow)
			for (var row=this.session.getFoldedRowCount(config.lastRow + 1, oldConfig.lastRow); row>0; row--)
				this.$lines.pop();

		if (config.firstRow < oldConfig.firstRow) {
			this.$lines.unshift(this.$renderLinesFragment(config, config.firstRow, oldConfig.firstRow - 1));
		}

		if (config.lastRow > oldConfig.lastRow) {
			this.$lines.push(this.$renderLinesFragment(config, oldConfig.lastRow + 1, config.lastRow));
		}
		this.$highlightIndentGuide();
	}

	/**
	 * @param {LayerConfig} config
	 * @param {number} firstRow
	 * @param {number} lastRow
	 */
	$renderLinesFragment(config: LayerConfig, firstRow: number, lastRow: number) {
		var fragment: Cell<Box>[] = [];
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

			var line = this.$lines.createCell(row, config, this.session);

			var lineEl = line.element;
			lineEl.removeAllChild(); // clear previous content
			lineEl.style.height = this.$lines.computeLineHeight(row, config, this.session);
			lineEl.style.marginTop = this.$lines.computeLineTop(row, config, this.session);

			// Get the tokens per line as there might be some lines in between
			// beeing folded.
			this.$renderLine(lineEl, row, row == foldStart ? foldLine : false);

			if (this.$useLineGroups()) {
				lineEl.class = ["ace_line_group"];
			} else {
				lineEl.class = ["ace_line"];
			}
			fragment.push(line);

			row++;
		}
		return fragment;
	}

	/**
	 * @param {LayerConfig} config
	 */
	update(config: LayerConfig) {
		this.$lines.moveContainer(config);

		this.config = config;

		var firstRow = config.firstRow;
		var lastRow = config.lastRow;

		var lines = this.$lines;
		while (lines.getLength())
			lines.pop();

		lines.push(this.$renderLinesFragment(config, firstRow, lastRow));
	}

	public createTextNode(text: string): Label & {"charCount"?: number} {
		var label = new Label(this.element.window);
		label.value = text;
		return label;
	}

	private cloneTextNode(label: Label, deep?: boolean): Label & {"charCount"?: number} {
		var newLabel = new Label(this.element.window);
		return newLabel;
	}

	$renderToken(parent: View, screenColumn: number, token: any, value: string) {
		var self = this;
		var re = /(\t)|( +)|([\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\uFEFF\uFFF9-\uFFFC\u2066\u2067\u2068\u202A\u202B\u202D\u202E\u202C\u2069\u2060\u2061\u2062\u2063\u2064\u206A\u206B\u206B\u206C\u206D\u206E\u206F]+)|(\u3000)|([\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3001-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF])/g;

		var valueFragment: Label[] = [];//this.dom.createFragment(this.element);

		var m;
		var i = 0;
		while (m = re.exec(value)) {
			var tab = m[1];
			var simpleSpace = m[2];
			var controlCharacter = m[3];
			var cjkSpace = m[4];
			var cjk = m[5];

			if (!self.showSpaces && simpleSpace)
				continue;

			var before = i != m.index ? value.slice(i, m.index) : "";

			i = m.index + m[0].length;

			if (before) {
				valueFragment.push(this.createTextNode(before));
			}

			if (tab) {
				var tabSize = self.session.getScreenTabSize(screenColumn + m.index);
				var text = this.cloneTextNode(self.$tabStrings[tabSize], true);
				text["charCount"] = 1;
				valueFragment.push(text);
				screenColumn += tabSize - 1;
			} else if (simpleSpace) {
				if (self.showSpaces) {
					// var span = this.dom.createElement("span");
					var span = new Label(this.element.window);
					span.class = ["ace_invisible", "ace_invisible_space"];
					span.value = lang.stringRepeat(self.SPACE_CHAR, simpleSpace.length);
					valueFragment.push(span);
				} else {
					valueFragment.push(this.createTextNode(simpleSpace));
				}
			} else if (controlCharacter) {
				// var span = this.dom.createElement("span");
				var span = new Label(this.element.window);
				span.class = ["ace_invisible", "ace_invisible_space", "ace_invalid"];
				span.value = lang.stringRepeat(self.SPACE_CHAR, controlCharacter.length);
				valueFragment.push(span);
			} else if (cjkSpace) {
				// U+3000 is both invisible AND full-width, so must be handled uniquely
				screenColumn += 1;

				// var span = this.dom.createElement("span");
				let span = new TextView(this.element.window); // Text node to allow setting width
				span.style.width = (self.config.characterWidth * 2);
				span.class = self.showSpaces ? ["ace_cjk", "ace_invisible", "ace_invisible_space"] : ["ace_cjk"];
				span.value = self.showSpaces ? self.SPACE_CHAR : cjkSpace;
				valueFragment.push(span);
			} else if (cjk) {
				screenColumn += 1;
				// var span = this.dom.createElement("span");
				let span = new TextView(this.element.window); // Text node to allow setting width
				span.style.width = (self.config.characterWidth * 2);
				span.class = ["ace_cjk"];
				span.value = cjk;
				valueFragment.push(span);
			}
		}

		valueFragment.push(this.createTextNode(i ? value.slice(i) : value));
		if (!isTextToken(token.type)) {
			let classes = "ace_" + token.type.replace(/\./g, " ace_");
			// let span = this.dom.createElement("span");
			let span = new TextView(this.element.window);
			if (token.type == "fold"){
				span.style.width = (token.value.length * this.config.characterWidth);
				span.data = {};
				span.data.title = nls("inline-fold.closed.title", "Unfold code");
			}
			span.class = classes.split(" ");
			valueFragment.forEach(function(child) {
				span.append(child);
			});
			parent.append(span);
		}
		else {
			valueFragment.forEach(function(child) {
				parent.append(child);
			});
		}

		return screenColumn + value.length;
	}

	renderIndentGuide(parent: View, value: string, max: number = Number.MAX_VALUE): string {
		var cols = value.search(this.$indentGuideRe!);
		if (cols <= 0 || cols >= max)
			return value;
		if (value[0] == " ") {
			cols -= cols % this.tabSize!;
			var count = cols/this.tabSize!;
			for (var i=0; i<count; i++) {
				parent.append(this.cloneTextNode(this.$tabStrings[" "]!, true));
			}
			this.$highlightIndentGuide();
			return value.substring(cols);
		} else if (value[0] == "\t") {
			for (var i=0; i<cols; i++) {
				parent.append(this.cloneTextNode(this.$tabStrings["\t"]!, true));
			}
			this.$highlightIndentGuide();
			return value.substring(cols);
		}
		this.$highlightIndentGuide();
		return value;
	}

	$highlightIndentGuide() {
		if (!this.$highlightIndentGuides || !this.displayIndentGuides)
			return;
		/**@type {{ indentLevel?: number; start?: number; end?: number; dir?: number; }}*/
		this.$highlightIndentGuideMarker = {
			indentLevel: undefined,
			start: undefined,
			end: undefined,
			dir: undefined
		};
		var lines = this.session.doc.$lines;
		if (!lines) return;

		var cursor = this.session.selection.getCursor();
		var initialIndent = /^\s*/.exec(this.session.doc.getLine(cursor.row))![0].length;
		var elementIndentLevel = Math.floor(initialIndent / this.tabSize!);
		this.$highlightIndentGuideMarker = {
			indentLevel: elementIndentLevel,
			start: cursor.row
		};

		var bracketHighlight = this.session.$bracketHighlight;
		if (bracketHighlight) {
			var ranges = bracketHighlight.ranges;
			for (var i = 0; i < ranges.length; i++) {
				if (cursor.row !== ranges[i].start.row) {
					this.$highlightIndentGuideMarker.end = ranges[i].start.row + 1;
					if (cursor.row > ranges[i].start.row) {
						this.$highlightIndentGuideMarker.dir = -1;
					}
					else {
						this.$highlightIndentGuideMarker.dir = 1;
					}
					break;
				}
			}
		}

		if (!this.$highlightIndentGuideMarker.end) {
			if (lines[cursor.row] !== '' && cursor.column === lines[cursor.row].length) {
				this.$highlightIndentGuideMarker.dir = 1;
				for (var i = cursor.row + 1; i < lines.length; i++) {
					var line = lines[i];
					var currentIndent = /^\s*/.exec(line)![0].length;
					if (line !== '') {
						this.$highlightIndentGuideMarker.end = i;
						if (currentIndent <= initialIndent) break;
					}
				}
			}
		}

		this.$renderHighlightIndentGuide();
	}

	$clearActiveIndentGuide(e?: any) {
		var activeIndentGuides: View[] = [];
		var v = this.element.first;
		while (v) {
			if (v.cssclass.has("ace_indent-guide-active"))
			activeIndentGuides.push(v);
			v = v.next;
		}
		// var activeIndentGuides = this.element.querySelectorAll(".ace_indent-guide-active");
		for (var i = 0; i < activeIndentGuides.length; i++) {
			activeIndentGuides[i].cssclass.remove("ace_indent-guide-active");
		}
	}

	$setIndentGuideActive(cell: Cell<Box>, indentLevel: number) {
		var line = this.session.doc.getLine(cell.row);
		if (line !== "") {
			let element = cell.element as View;
			if (element.cssclass.has("ace_line_group")) {
				if (element.first) {
					element = element.first;
				}
				else {
					return;
				}
			}
			var childNodes: View[] = [];
			var v = element.first;
			while (v) {
				childNodes.push(v);
				v = v.next;
			}
			if (childNodes.length) {
				let node = childNodes[indentLevel - 1];
				if (node && node.cssclass.has("ace_indent-guide"))
					node.cssclass.add("ace_indent-guide-active");
			}
		}
	}

	$renderHighlightIndentGuide() {
		if (!this.$lines) return;
		var cells = this.$lines.cells;
		this.$clearActiveIndentGuide();
		var $highlightIndentGuideMarker = this.$highlightIndentGuideMarker!;
		var indentLevel = $highlightIndentGuideMarker.indentLevel;
		if (indentLevel/*indentLevel !== 0*/) {
			if ($highlightIndentGuideMarker.dir === 1) {
				for (var i = 0; i < cells.length; i++) {
					var cell = cells[i];
					if ($highlightIndentGuideMarker.end && cell.row >= $highlightIndentGuideMarker.start! + 1) {
						if (cell.row >= $highlightIndentGuideMarker.end)
							break;
						this.$setIndentGuideActive(cell, indentLevel);
					}
				}
			}
			else {
				for (var i = cells.length - 1; i >= 0; i--) {
					var cell = cells[i];
					if ($highlightIndentGuideMarker.end && cell.row < $highlightIndentGuideMarker.start!) {
						if (cell.row < $highlightIndentGuideMarker.end) break;
						this.$setIndentGuideActive(cell, indentLevel);
					}
				}
			}
		}
	}

	$createLineElement() {
		// var lineEl = this.dom.createElement("div");
		var lineEl = new TextView(this.element.window);
		lineEl.class = ["ace_line"];
		lineEl.style.height = this.config.lineHeight;
		return lineEl;
	}

	$renderWrappedLine(parent: View, tokens: Token[], splits: number[] & {indent?: number}) {
		var chars = 0;
		var split = 0;
		var splitChars = splits[0];
		var screenColumn = 0;

		var lineEl = this.$createLineElement();
		parent.append(lineEl);

		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			var value = token.value;
			if (i == 0 && this.displayIndentGuides) {
				chars = value.length;
				value = this.renderIndentGuide(lineEl, value, splitChars);
				if (!value)
					continue;
				chars -= value.length;
			}

			if (chars + value.length < splitChars) {
				screenColumn = this.$renderToken(lineEl, screenColumn, token, value);
				chars += value.length;
			} else {
				while (chars + value.length >= splitChars) {
					screenColumn = this.$renderToken(
						lineEl, screenColumn,
						token, value.substring(0, splitChars - chars)
					);
					value = value.substring(splitChars - chars);
					chars = splitChars;

					lineEl = this.$createLineElement();
					parent.append(lineEl);

					var text = this.createTextNode(lang.stringRepeat("\xa0", splits.indent!));
					text["charCount"] = 0; // not to take into account when we are counting columns
					lineEl.append(text);

					split ++;
					screenColumn = 0;
					splitChars = splits[split] || Number.MAX_VALUE;
				}
				if (value.length != 0) {
					chars += value.length;
					screenColumn = this.$renderToken(
						lineEl, screenColumn, token, value
					);
				}
			}
		}

		if (splits[splits.length - 1] > this.MAX_LINE_LENGTH)
			this.$renderOverflowMessage(lineEl, screenColumn, null, "", true);
	}

	$renderSimpleLine(parent: View, tokens: Token[]) {
		var screenColumn = 0;

		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			var value = token.value;
			if (i == 0 && this.displayIndentGuides) {
				value = this.renderIndentGuide(parent, value);
				if (!value)
					continue;
			}
			if (screenColumn + value.length > this.MAX_LINE_LENGTH)
				return this.$renderOverflowMessage(parent, screenColumn, token, value);
			screenColumn = this.$renderToken(parent, screenColumn, token, value);
		}
	}

	$renderOverflowMessage(parent: View, screenColumn: number, token: Token | null, value: string, hide?: boolean) {
		token && this.$renderToken(parent, screenColumn, token,
			value.slice(0, this.MAX_LINE_LENGTH - screenColumn));

		// var overflowEl = this.dom.createElement("span");
		var overflowEl = new Label(parent.window);
		overflowEl.class = ["ace_inline_button", "ace_keyword ace_toggle_wrap"];
		overflowEl.value = hide ? "<hide>" : "<click to see more...>";

		parent.append(overflowEl);
	}

	// row is either first row of foldline or not in fold
	$renderLine(parent: View, row: number, foldLine?: FoldLine | null | false) {
		if (!foldLine && foldLine != false)
			foldLine = this.session.getFoldLine(row);

		var tokens: Token[];
		if (foldLine)
			tokens = this.$getFoldLineTokens(row, foldLine);
		else
			tokens = this.session.getTokens(row);

		var lastLineEl = parent;
		if (tokens.length) {
			var splits = this.session.getRowSplitData(row);
			if (splits && splits.length) {
				this.$renderWrappedLine(parent, tokens, splits);
				lastLineEl = parent.last!;
			} else {
				// var lastLineEl = parent;
				if (this.$useLineGroups()) {
					lastLineEl = this.$createLineElement();
					parent.append(lastLineEl);
				}
				this.$renderSimpleLine(lastLineEl, tokens);
			}
		} else if (this.$useLineGroups()) {
			lastLineEl = this.$createLineElement();
			parent.append(lastLineEl);
		}

		if (this.showEOL && lastLineEl) {
			if (foldLine)
				row = foldLine.end.row;

			// var invisibleEl = this.dom.createElement("span");
			var invisibleEl = new Label(this.element.window);
			invisibleEl.class = ["ace_invisible","ace_invisible_eol"];
			invisibleEl.value = row == this.session.getLength() - 1 ? this.EOF_CHAR : this.EOL_CHAR;

			lastLineEl.append(invisibleEl);
		}
	}

	/**
	 * @param {number} row
	 * @param {import("../../ace-internal").FoldLine} foldLine
	 * @return {import("../../ace-internal").Token[]}
	 */
	$getFoldLineTokens(row: number, foldLine: FoldLine): Token[] {
		var session = this.session;
		var renderTokens: Token[] = [];

		function addTokens(tokens: Token[], from: number, to: number) {
			var idx = 0, col = 0;
			while ((col + tokens[idx].value.length) < from) {
				col += tokens[idx].value.length;
				idx++;

				if (idx == tokens.length)
					return;
			}
			if (col != from) {
				var value = tokens[idx].value.substring(from - col);
				// Check if the token value is longer then the from...to spacing.
				if (value.length > (to - from))
					value = value.substring(0, to - from);

				renderTokens.push({
					type: tokens[idx].type,
					value: value
				});

				col = from + value.length;
				idx += 1;
			}

			while (col < to && idx < tokens.length) {
				var value = tokens[idx].value;
				if (value.length + col > to) {
					renderTokens.push({
						type: tokens[idx].type,
						value: value.substring(0, to - col)
					});
				} else
					renderTokens.push(tokens[idx]);
				col += value.length;
				idx += 1;
			}
		}

		var tokens = session.getTokens(row);
		foldLine.walk(function(placeholder: string | null, row: number, column: number, lastColumn: number, isNewRow: boolean) {
			if (placeholder != null) {
				renderTokens.push({
					type: "fold",
					value: placeholder
				});
			} else {
				if (isNewRow)
					tokens = session.getTokens(row);

				if (tokens.length)
					addTokens(tokens, lastColumn, column);
			}
		}, foldLine.end.row, this.session.getLine(foldLine.end.row).length);

		return renderTokens;
	}

	$useLineGroups() {
		// For the updateLines function to work correctly, it's important that the
		// child nodes of this.element correspond on a 1-to-1 basis to rows in the
		// document (as distinct from lines on the screen). For sessions that are
		// wrapped, this means we need to add a layer to the node hierarchy (tagged
		// with the class name ace_line_group).
		return this.session.getUseWrapMode();
	}
}
