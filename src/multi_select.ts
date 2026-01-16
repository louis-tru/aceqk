
import * as lang from "./lib/lang";
import * as ms_commands from "./commands/multi_select_commands";
import {RangeList} from "./range_list";
import {IRange, Point, Range} from "./range";
import {Selection} from "./selection";
import {onMouseDown} from "./mouse/multi_select_handler";
import {EditSession} from "./edit_session";
import {Editor} from "./editor";
import {CursorStyle} from "quark/types";
import type {Command} from "./keyboard/hash_handler";
import type {Anchor} from "./anchor";

export const commands = ms_commands.defaultCommands.concat(ms_commands.multiSelectCommands);

export interface EditorMultiSelectProperties {
	inMultiSelectMode?: boolean,
	/**
	 * Updates the cursor and marker layers.
	 **/
	updateSelectionMarkers: () => void,
	/**
	 * Adds the selection and cursor.
	 * @param orientedRange A range containing a cursor
	 **/
	addSelectionMarker: (orientedRange: Range & { marker?: any }) => Range & { marker?: any },
	/**
	 * Removes the selection marker.
	 * @param range The selection range added with [[Editor.addSelectionMarker `addSelectionMarker()`]].
	 **/
	removeSelectionMarker: (range: Range & { marker?: any }) => void,
	removeSelectionMarkers: (ranges: (Range & { marker?: any })[]) => void,
	$onAddRange: (e: any) => void,
	$onRemoveRange: (e: any) => void,
	$onMultiSelect: (e: any) => void,
	$onSingleSelect: (e: any) => void,
	$onMultiSelectExec: (e: any) => void,
	/**
	 * Executes a command for each selection range.
	 * @param cmd The command to execute
	 * @param [args] Any arguments for the command
	 **/
	forEachSelection: (cmd: Command | NonNullable<Command["exec"]>, args?: string, options?: Object) => any,
	/**
	 * Removes all the selections except the last added one.
	 **/
	exitMultiSelectMode: () => void,
	getSelectedText: () => string,
	$checkMultiselectChange: (e: any, anchor: Anchor) => void,
	/**
	 * Finds and selects all the occurrences of `needle`.
	 * @param needle The text to find
	 * @param options The search options
	 * @param additive keeps
	 * @returns {Number} The cumulative count of all found matches
	 **/
	findAll: (needle?: string, options?: Partial<SearchOptions>, additive?: boolean) => number,
	/**
	 * Adds a cursor above or below the active cursor.
	 * @param dir The direction of lines to select: -1 for up, 1 for down
	 * @param [skip] If `true`, removes the active selection range
	 */
	selectMoreLines: (dir: number, skip?: boolean) => void,
	/**
	 * Transposes the selected ranges.
	 * @param {Number} dir The direction to rotate selections
	 **/
	transposeSelections: (dir: number) => void,
	/**
	 * Finds the next occurrence of text in an active selection and adds it to the selections.
	 * @param {Number} dir The direction of lines to select: -1 for up, 1 for down
	 * @param {Boolean} [skip] If `true`, removes the active selection range
	 * @param {Boolean} [stopAtFirst]
	 **/
	selectMore: (dir: number, skip?: boolean, stopAtFirst?: boolean) => void,
	/**
	 * Aligns the cursors or selected text.
	 **/
	alignCursors: () => void,
	$reAlignText: (lines: string[], forceLeft: boolean) => string[],
	multiSelect?: Selection,
	$multiselectOnSessionChange?: any,
	$blockSelectEnabled?: boolean,
}

export interface ScreenCoordinates {
	row: number,
	column: number,
	side?: 1 | -1,
	offsetX?: number
}

export interface MultiSelectProperties {
	ranges?: Range[];
	rangeList?: RangeList;
	inVirtualMode?: boolean;

	/**
	 * Adds a range to a selection by entering multiselect mode, if necessary.
	 * @param {Range} range The new range to add
	 * @param {Boolean} [$blockChangeEvents] Whether or not to block changing events
	 **/
	addRange(range: Range, $blockChangeEvents?: boolean): any;

	inMultiSelectMode: boolean;

	/**
	 * @param {IRange} [range]
	 **/
	toSingleRange(range?: IRange): void;

	/**
	 * Removes a Range containing pos (if it exists).
	 * @param {Point} pos The position to remove, as a `{row, column}` object
	 **/
	substractPoint(pos: Point): any;

	/**
	 * Merges overlapping ranges ensuring consistency after changes
	 **/
	mergeOverlappingRanges(): void;

	/**
	 * @param {Range} range
	 */
	$onAddRange(range: Range): void;

	rangeCount: number;

	/**
	 *
	 * @param {Range[]} removed
	 */
	$onRemoveRange(removed: Range[]): void;

	/**
	 * adds multicursor support to selection
	 */
	$initRangeList(): void;

	/**
	 * Returns a concatenation of all the ranges.
	 * @returns {Range[]}
	 **/
	getAllRanges(): Range[];

	/**
	 * Splits all the ranges into lines.
	 **/
	splitIntoLines(): void;

	/**
	 */
	joinSelections(): void;

	/**
	 **/
	toggleBlockSelection(): void;

	/**
	 *
	 * Gets list of ranges composing rectangular block on the screen
	 *
	 * @param {Ace.ScreenCoordinates} screenCursor The cursor to use
	 * @param {Ace.ScreenCoordinates} screenAnchor The anchor to use
	 * @param {Boolean} [includeEmptyLines] If true, this includes ranges inside the block which are empty due to clipping
	 * @returns {Range[]}
	 **/
	rectangularRangeBlock(screenCursor: ScreenCoordinates, screenAnchor: ScreenCoordinates, includeEmptyLines?: boolean): Range[];

	// _eventRegistry?: any;
	index?: number;
}

// Todo: session.find or editor.findVolatile that returns range
import {Search, SearchOptions} from "./search";
const search = new Search();
/**
 * @param {EditSession} session
 * @param {string | RegExp} needle
 * @param {number} dir
 */
function find(session: EditSession, needle: string | RegExp, dir: number) {
	search.$options.wrap = true;
	search.$options.needle = needle;
	search.$options.backwards = dir == -1;

	return search.find(session);
}

// extend EditSession
EditSession.prototype.getSelectionMarkers = function() {
	return this.$selectionMarkers!;
};

// extend Selection
(function(this: Selection & { ranges: Range[]; rangeList: RangeList; }) {
	/**
	 * Adds a range to a selection by entering multiselect mode, if necessary.
	 * @param {Range} range The new range to add
	 * @param {Boolean} $blockChangeEvents Whether or not to block changing events
	 * @this {Selection}
	 **/
	this.addRange = function(range, $blockChangeEvents) {
		if (!range)
			return;

		if (!this.inMultiSelectMode && this.rangeCount === 0) {
			var oldRange = this.toOrientedRange();
			this.rangeList.add(oldRange);
			this.rangeList.add(range);
			if (this.rangeList.ranges.length != 2) {
				this.rangeList.removeAll();
				return $blockChangeEvents || this.fromOrientedRange(range);
			}
			this.rangeList.removeAll();
			this.rangeList.add(oldRange);
			this.$onAddRange(oldRange);
		}

		if (!range.cursor)
			range.cursor = range.end;

		var removed = this.rangeList.add(range);

		this.$onAddRange(range);

		if (removed.length)
			this.$onRemoveRange(removed);

		if (this.rangeCount > 1 && !this.inMultiSelectMode) {
			this._signal("multiSelect", void 0, this);
			this.inMultiSelectMode = true;
			this.session.$undoSelect = false;
			this.rangeList.attach(this.session);
		}

		return $blockChangeEvents || this.fromOrientedRange(range);
	};

	/**
	 * @param {IRange} [range]
	 * @this {Selection}
	 **/
	this.toSingleRange = function(range) {
		range = range || this.ranges[0];
		var removed = this.rangeList.removeAll();
		if (removed.length)
			this.$onRemoveRange(removed);

		range && this.fromOrientedRange(range);
	};

	/**
	 * Removes a Range containing pos (if it exists).
	 * @param {Point} pos The position to remove, as a `{row, column}` object
	 * @this {Selection}
	 **/
	this.substractPoint = function(pos) {
		var removed = this.rangeList.substractPoint(pos);
		if (removed) {
			this.$onRemoveRange(removed);
			return removed[0];
		}
	};

	/**
	 * Merges overlapping ranges ensuring consistency after changes
	 * @this {Selection}
	 **/
	this.mergeOverlappingRanges = function() {
		var removed = this.rangeList.merge();
		if (removed.length)
			this.$onRemoveRange(removed);
	};

	/**
	 * @param {Range} range
	 * @this {Selection}
	 */
	this.$onAddRange = function(range) {
		this.rangeCount = this.rangeList.ranges.length;
		this.ranges.unshift(range);
		this._signal("addRange", {range: range}, this);
	};

	/**
	 * @param {Range[]} removed
	 * @this {Selection}
	 */
	this.$onRemoveRange = function(removed) {
		var lastRange: Range | undefined;
		this.rangeCount = this.rangeList.ranges.length;
		if (this.rangeCount == 1 && this.inMultiSelectMode) {
			lastRange = this.rangeList.ranges.pop()!;
			removed.push(lastRange);
			this.rangeCount = 0;
		}

		for (var i = removed.length; i--; ) {
			var index = this.ranges.indexOf(removed[i]);
			this.ranges.splice(index, 1);
		}

		this._signal("removeRange", {ranges: removed}, this);

		if (this.rangeCount === 0 && this.inMultiSelectMode) {
			this.inMultiSelectMode = false;
			this._signal("singleSelect", void 0, this);
			this.session.$undoSelect = true;
			this.rangeList.detach(this.session);
		}

		lastRange = lastRange || this.ranges[0];
		if (lastRange && !lastRange.isEqual(this.getRange()))
			this.fromOrientedRange(lastRange);
	};

	/**
	 * adds multicursor support to selection
	 * @this {Selection}
	 */
	this.$initRangeList = function() {
		if (this.rangeList)
			return;

		this.rangeList = new RangeList();
		this.ranges = [];
		this.rangeCount = 0;
	};

	/**
	 * Returns a concatenation of all the ranges.
	 * @returns {Range[]}
	 * @this {Selection}
	 **/
	this.getAllRanges = function() {
		return this.rangeCount ? this.rangeList.ranges.concat() : [this.getRange()];
	};

	/**
	 * Splits all the ranges into lines.
	 * @this {Selection}
	 **/
	this.splitIntoLines = function () {
		var ranges = this.ranges.length ? this.ranges : [this.getRange()];
		var newRanges: Range[] = [];
		for (var i = 0; i < ranges.length; i++) {
			var range = ranges[i];
			var row = range.start.row;
			var endRow = range.end.row;
			if (row === endRow) {
				newRanges.push(range.clone());
			} else {
				newRanges.push(new Range(row, range.start.column, row, this.session.getLine(row).length));
				while (++row < endRow)
					newRanges.push(this.getLineRange(row, true));
				newRanges.push(new Range(endRow, 0, endRow, range.end.column));
			}
			if (i == 0 && !this.isBackwards())
				newRanges = newRanges.reverse();
		}
		this.toSingleRange();
		for (var i = newRanges.length; i--;)
			this.addRange(newRanges[i]);
	};

	/**
	 * @this {Selection}
	 */
	this.joinSelections = function () {
		var ranges = this.rangeList.ranges;
		var lastRange = ranges[ranges.length - 1];
		var range = Range.fromPoints(ranges[0].start, lastRange.end);

		this.toSingleRange();
		this.setSelectionRange(range, lastRange.cursor == lastRange.start);
	};

	/**
	 * @this {Selection}
	 **/
	this.toggleBlockSelection = function () {
		if (this.rangeCount > 1) {
			var ranges = this.rangeList.ranges;
			var lastRange = ranges[ranges.length - 1];
			var range = Range.fromPoints(ranges[0].start, lastRange.end);

			this.toSingleRange();
			this.setSelectionRange(range, lastRange.cursor == lastRange.start);
		} else {
			var cursor = this.session.documentToScreenPosition(this.cursor);
			var anchor = this.session.documentToScreenPosition(this.anchor);

			var rectSel = this.rectangularRangeBlock(cursor, anchor);
			// @ts-expect-error TODO: possible bug
			rectSel.forEach(this.addRange, this);
		}
	};

	/**
	 * Gets list of ranges composing rectangular block on the screen
	 *
	 * @param {ScreenCoordinates} screenCursor The cursor to use
	 * @param {ScreenCoordinates} screenAnchor The anchor to use
	 * @param {Boolean} [includeEmptyLines] If true, this includes ranges inside the block which are empty due to clipping
	 * @returns {Range[]}
	 * @this {Selection}
	 **/
	this.rectangularRangeBlock = function(screenCursor, screenAnchor, includeEmptyLines) {
		var rectSel = [];

		var xBackwards = screenCursor.column < screenAnchor.column;
		if (xBackwards) {
			var startColumn = screenCursor.column;
			var endColumn = screenAnchor.column;
			var startOffsetX = screenCursor.offsetX;
			var endOffsetX = screenAnchor.offsetX;
		} else {
			var startColumn = screenAnchor.column;
			var endColumn = screenCursor.column;
			var startOffsetX = screenAnchor.offsetX;
			var endOffsetX = screenCursor.offsetX;
		}

		var yBackwards = screenCursor.row < screenAnchor.row;
		if (yBackwards) {
			var startRow = screenCursor.row;
			var endRow = screenAnchor.row;
		} else {
			var startRow = screenAnchor.row;
			var endRow = screenCursor.row;
		}

		if (startColumn < 0)
			startColumn = 0;
		if (startRow < 0)
			startRow = 0;

		if (startRow == endRow)
			includeEmptyLines = true;

		var docEnd;
		for (var row = startRow; row <= endRow; row++) {
			var range = Range.fromPoints(
				this.session.screenToDocumentPosition(row, startColumn, startOffsetX),
				this.session.screenToDocumentPosition(row, endColumn, endOffsetX)
			);
			if (range.isEmpty()) {
				if (docEnd && isSamePoint(range.end, docEnd))
					break;
				docEnd = range.end;
			}
			range.cursor = xBackwards ? range.start : range.end;
			rectSel.push(range);
		}

		if (yBackwards)
			rectSel.reverse();

		if (!includeEmptyLines) {
			var end = rectSel.length - 1;
			while (rectSel[end].isEmpty() && end > 0)
				end--;
			var start = 0;
			if (end > 0) {
				while (rectSel[start].isEmpty())
					start++;
			}
			for (var i = end; i >= start; i--) {
				if (rectSel[i].isEmpty())
					rectSel.splice(i, 1);
			}
		}

		return rectSel;
	};
}).call(Selection.prototype as any);

(function(this: Editor) {
	/**
	 * Updates the cursor and marker layers.
	 * @method Editor.updateSelectionMarkers
	 * @this {Editor}
	 **/
	this.updateSelectionMarkers = function() {
		this.renderer.updateCursor();
		this.renderer.updateBackMarkers();
	};

	/**
	 * Adds the selection and cursor.
	 * @param {Range & {marker?}} orientedRange A range containing a cursor
	 * @returns {Range & {marker?}}
	 * @this {Editor}
	 **/
	this.addSelectionMarker = function(orientedRange) {
		if (!orientedRange.cursor)
			orientedRange.cursor = orientedRange.end;

		var style = this.getSelectionStyle();
		orientedRange.marker = this.session.addMarker(orientedRange, "ace_selection", style);

		this.session.$selectionMarkers!.push(orientedRange);
		this.session.selectionMarkerCount = this.session.$selectionMarkers!.length;
		return orientedRange;
	};

	/**
	 * Removes the selection marker.
	 * @param {Range & {marker?}} range The selection range added with [[Editor.addSelectionMarker `addSelectionMarker()`]].
	 * @this {Editor}
	 **/
	this.removeSelectionMarker = function(range) {
		if (!range.marker)
			return;
		this.session.removeMarker(range.marker);
		var index = this.session.$selectionMarkers!.indexOf(range);
		if (index != -1)
			this.session.$selectionMarkers!.splice(index, 1);
		this.session.selectionMarkerCount = this.session.$selectionMarkers!.length;
	};

	/**
	 * @param {(Range & {marker?})[]} ranges
	 * @this {Editor}
	 */
	this.removeSelectionMarkers = function(ranges) {
		var markerList = this.session.$selectionMarkers!;
		for (var i = ranges.length; i--; ) {
			var range = ranges[i];
			if (!range.marker)
				continue;
			this.session.removeMarker(range.marker);
			var index = markerList.indexOf(range);
			if (index != -1)
				markerList.splice(index, 1);
		}
		this.session.selectionMarkerCount = markerList.length;
	};

	/**
	 * @param e
	 * @this {Editor}
	 */
	this.$onAddRange = function(e) {
		this.addSelectionMarker(e.range);
		this.renderer.updateCursor();
		this.renderer.updateBackMarkers();
	};

	/**
	 * @param e
	 * @this {Editor}
	 */
	this.$onRemoveRange = function(e) {
		this.removeSelectionMarkers(e.ranges);
		this.renderer.updateCursor();
		this.renderer.updateBackMarkers();
	};

	/**
	 * @param e
	 * @this {Editor}
	 */
	this.$onMultiSelect = function(e) {
		if (this.inMultiSelectMode)
			return;
		this.inMultiSelectMode = true;

		this.setStyle("ace_multiselect");
		this.keyBinding.addKeyboardHandler(ms_commands.keyboardHandler);
		this.commands.setDefaultHandler("exec", this.$onMultiSelectExec);

		this.renderer.updateCursor();
		this.renderer.updateBackMarkers();
	};

	/**
	 * @param e
	 * @this {Editor}
	 */
	this.$onSingleSelect = function(e) {
		if (this.session.multiSelect!.inVirtualMode)
			return;
		this.inMultiSelectMode = false;

		this.unsetStyle("ace_multiselect");
		this.keyBinding.removeKeyboardHandler(ms_commands.keyboardHandler);

		this.commands.removeDefaultHandler("exec", this.$onMultiSelectExec);
		this.renderer.updateCursor();
		this.renderer.updateBackMarkers();
		this._emit("changeSelection", void 0, this);
	};

	/**
	 * @param e
	 * @this {Editor}
	 */
	this.$onMultiSelectExec = function(e) {
		var command = e.command;
		var editor = e.editor;
		if (!editor.multiSelect)
			return;
		if (!command.multiSelectAction) {
			var result = command.exec(editor, e.args || {});
			editor.multiSelect.addRange(editor.multiSelect.toOrientedRange());
			editor.multiSelect.mergeOverlappingRanges();
		} else if (command.multiSelectAction == "forEach") {
			result = editor.forEachSelection(command, e.args);
		} else if (command.multiSelectAction == "forEachLine") {
			result = editor.forEachSelection(command, e.args, true);
		} else if (command.multiSelectAction == "single") {
			editor.exitMultiSelectMode();
			result = command.exec(editor, e.args || {});
		} else {
			result = command.multiSelectAction(editor, e.args || {});
		}
		return result;
	};

	/**
	 * Executes a command for each selection range.
	 * @param {any} cmd The command to execute
	 * @param {String} [args] Any arguments for the command
	 * @param {Object|true} [options]
	 * @this {Editor}
	 **/
	this.forEachSelection = function(cmd, args, options: any) {
		if (this.inVirtualSelectionMode)
			return;
		var keepOrder = options && options.keepOrder;
		var $byLines = options == true || options && options.$byLines;
		var session = this.session;
		var selection = this.selection as Selection & { _eventRegistry?: any };
		var rangeList = selection.rangeList!;
		var ranges = (keepOrder ? selection : rangeList).ranges!;
		var result;

		if (!ranges.length)
			return (cmd as any).exec ? (cmd as any).exec!(this, args || {}): (cmd as any)(this, args || {});

		var reg = selection._eventRegistry;
		selection._eventRegistry = {};
		var tmpSel = new Selection(session);
		this.inVirtualSelectionMode = true;
		for (var i = ranges.length; i--;) {
			if ($byLines) {
				while (i > 0 && ranges[i].start.row == ranges[i - 1].end.row)
					i--;
			}
			tmpSel.fromOrientedRange(ranges[i]);
			tmpSel.index = i;
			this.selection = session.selection = tmpSel;
			var cmdResult = (cmd as any).exec ? (cmd as any).exec(this, args || {}) : (cmd as any)(this, args || {});
			if (!result && cmdResult !== undefined)
				result = cmdResult;
			tmpSel.toOrientedRange(ranges[i]);
		}
		tmpSel.detach();

		this.selection = session.selection = selection;
		this.inVirtualSelectionMode = false;
		selection._eventRegistry = reg;
		selection.mergeOverlappingRanges();
		if (selection.ranges![0])
			selection.fromOrientedRange(selection.ranges![0]);

		var anim = this.renderer.$scrollAnimation;
		this.$onCursorChange();
		this.$onSelectionChange();
		if (anim && anim.from == anim.to)
			this.renderer.animateScrolling(anim.from);

		return result;
	};

	/**
	* Removes all the selections except the last added one.
	* @this {Editor}
	**/
	this.exitMultiSelectMode = function() {
		if (!this.inMultiSelectMode || this.inVirtualSelectionMode)
			return;
		this.multiSelect!.toSingleRange();
	};

	/**
	 * @this {Editor}
	 * @return {string}
	 */
	this.getSelectedText = function() {
		var text = "";
		if (this.inMultiSelectMode && !this.inVirtualSelectionMode) {
			var ranges = this.multiSelect!.rangeList!.ranges;
			var buf = [];
			for (var i = 0; i < ranges.length; i++) {
				buf.push(this.session.getTextRange(ranges[i]));
			}
			var nl = this.session.getDocument().getNewLineCharacter();
			text = buf.join(nl);
			if (text.length == (buf.length - 1) * nl.length)
				text = "";
		} else if (!this.selection.isEmpty()) {
			text = this.session.getTextRange(this.getSelectionRange());
		}
		return text;
	};

	/**
	 * @param e
	 * @param {Anchor} anchor
	 * @this {Editor}
	 */
	this.$checkMultiselectChange = function(e, anchor) {
		if (this.inMultiSelectMode && !this.inVirtualSelectionMode) {
			var range = this.multiSelect!.ranges![0];
			if (this.multiSelect!.isEmpty() && anchor == this.multiSelect!.anchor)
				return;
			var pos = anchor == this.multiSelect!.anchor
				? range.cursor == range.start ? range.end : range.start
				: range.cursor!;
			if (pos.row != anchor.row
				|| this.session.$clipPositionToDocument(pos.row, pos.column).column != anchor.column)
				this.multiSelect!.toSingleRange(this.multiSelect!.toOrientedRange());
			else
				this.multiSelect!.mergeOverlappingRanges();
		}
	};

	/**
	 * Finds and selects all the occurrences of `needle`.
	 * @param {String} [needle] The text to find
	 * @param {Partial<SearchOptions>} [options] The search options
	 * @param {Boolean} [additive] keeps
	 *
	 * @returns {Number} The cumulative count of all found matches
	 * @this {Editor}
	 **/
	this.findAll = function(needle, options, additive) {
		options = options || {};
		options.needle = needle || options.needle;
		var range: Range | undefined;
		if (options.needle == undefined) {
			range = this.selection.isEmpty()
				? this.selection.getWordRange()
				: this.selection.getRange();
			options.needle = this.session.getTextRange(range);
		}
		this.$search.set(options);

		var ranges = this.$search.findAll(this.session);
		if (!ranges.length)
			return 0;

		var selection = this.multiSelect!;

		if (!additive)
			selection.toSingleRange(ranges[0]);

		for (var i = ranges.length; i--; )
			selection.addRange(ranges[i], true);

		// keep old selection as primary if possible
		if (range && selection.rangeList!.rangeAtPoint(range.start))
			selection.addRange(range, true);

		return ranges.length;
	};

	/**
	 * Adds a cursor above or below the active cursor.
	 *
	 * @param {Number} dir The direction of lines to select: -1 for up, 1 for down
	 * @param {Boolean} [skip] If `true`, removes the active selection range
	 *
	 * @this {Editor}
	 */
	this.selectMoreLines = function(dir, skip) {
		var range = this.selection.toOrientedRange();
		var isBackwards = range.cursor == range.end;

		var screenLead = this.session.documentToScreenPosition(range.cursor!);
		if (this.selection.$desiredColumn)
			screenLead.column = this.selection.$desiredColumn;

		var lead = this.session.screenToDocumentPosition(screenLead.row + dir, screenLead.column);

		if (!range.isEmpty()) {
			var screenAnchor = this.session.documentToScreenPosition(isBackwards ? range.end : range.start);
			var anchor = this.session.screenToDocumentPosition(screenAnchor.row + dir, screenAnchor.column);
		} else {
			var anchor = lead;
		}

		var newRange: Range & {desiredColumn?: number};

		if (isBackwards) {
			newRange = Range.fromPoints(lead, anchor);
			newRange.cursor = newRange.start;
		} else {
			newRange = Range.fromPoints(anchor, lead);
			newRange.cursor = newRange.end;
		}

		newRange.desiredColumn = screenLead.column;
		if (!this.selection.inMultiSelectMode) {
			this.selection.addRange(range);
		} else {
			if (skip)
				var toRemove = range.cursor;
		}

		this.selection.addRange(newRange);
		if (toRemove)
			this.selection.substractPoint(toRemove);
	};

	/**
	 * Transposes the selected ranges.
	 * @param {Number} dir The direction to rotate selections
	 * @this {Editor}
	 **/
	this.transposeSelections = function(dir) {
		var session = this.session;
		var sel = session.multiSelect!;
		var all = sel.ranges;

		for (var i = all.length; i--; ) {
			var range = all[i];
			if (range.isEmpty()) {
				let tmp = session.getWordRange(range.start.row, range.start.column);
				range.start.row = tmp.start.row;
				range.start.column = tmp.start.column;
				range.end.row = tmp.end.row;
				range.end.column = tmp.end.column;
			}
		}
		sel.mergeOverlappingRanges();

		var words: string[] = [];
		for (var i = all.length; i--; ) {
			var range = all[i];
			words.unshift(session.getTextRange(range));
		}

		if (dir < 0)
			words.unshift(words.pop()!);
		else
			words.push(words.shift()!);

		for (var i = all.length; i--; ) {
			var range = all[i];
			var tmp = range.clone();
			session.replace(range, words[i]);
			range.start.row = tmp.start.row;
			range.start.column = tmp.start.column;
		}
		sel.fromOrientedRange(sel.ranges[0]);
	};

	/**
	 * Finds the next occurrence of text in an active selection and adds it to the selections.
	 * @param {Number} dir The direction of lines to select: -1 for up, 1 for down
	 * @param {Boolean} [skip] If `true`, removes the active selection range
	 * @param {Boolean} [stopAtFirst]
	 * @this {Editor}
	 **/
	this.selectMore = function(dir, skip, stopAtFirst) {
		var session = this.session;
		var sel = session.multiSelect!;

		var range = sel.toOrientedRange();
		if (range.isEmpty()) {
			range = session.getWordRange(range.start.row, range.start.column);
			range.cursor = dir == -1 ? range.start : range.end;
			this.multiSelect!.addRange(range);
			if (stopAtFirst)
				return;
		}
		var needle = session.getTextRange(range);

		var newRange = find(session, needle, dir);
		if (newRange) {
			newRange.cursor = dir == -1 ? newRange.start : newRange.end;
			this.session.unfold(newRange);
			this.multiSelect!.addRange(newRange);
			this.renderer.scrollCursorIntoView(void 0, 0.5);
		}
		if (skip)
			this.multiSelect!.substractPoint(range.cursor!);
	};

	/**
	 * Aligns the cursors or selected text.
	 * @this {Editor}
	 **/
	this.alignCursors = function() {
		var session = this.session;
		var sel = session.multiSelect!;
		var ranges = sel.ranges;
		// filter out ranges on same row
		var row = -1;
		var sameRowRanges = ranges.filter(function(r) {
			if (r.cursor!.row == row)
				return true;
			row = r.cursor!.row;
		});

		if (!ranges.length || sameRowRanges.length == ranges.length - 1) {
			var range = this.selection.getRange();
			var fr = range.start.row, lr = range.end.row;
			var guessRange = fr == lr;
			if (guessRange) {
				var max = this.session.getLength();
				var line;
				do {
					line = this.session.getLine(lr);
				} while (/[=:]/.test(line) && ++lr < max);
				do {
					line = this.session.getLine(fr);
				} while (/[=:]/.test(line) && --fr > 0);

				if (fr < 0) fr = 0;
				if (lr >= max) lr = max - 1;
			}
			var lines = this.session.removeFullLines(fr, lr);
			lines = this.$reAlignText(lines, guessRange);
			this.session.insert({row: fr, column: 0}, lines.join("\n") + "\n");
			if (!guessRange) {
				range.start.column = 0;
				range.end.column = lines[lines.length - 1].length;
			}
			this.selection.setRange(range);
		} else {
			sameRowRanges.forEach(function(r) {
				sel.substractPoint(r.cursor!);
			});

			var maxCol = 0;
			var minSpace = Infinity;
			var spaceOffsets = ranges.map(function(r) {
				var p = r.cursor!;
				var line = session.getLine(p.row);
				var spaceOffset = line.substring(p.column).search(/\S/g);
				if (spaceOffset == -1)
					spaceOffset = 0;

				if (p.column > maxCol)
					maxCol = p.column;
				if (spaceOffset < minSpace)
					minSpace = spaceOffset;
				return spaceOffset;
			});
			ranges.forEach(function(r, i) {
				var p = r.cursor!;
				var l = maxCol - p.column;
				var d = spaceOffsets[i] - minSpace;
				if (l > d)
					session.insert(p, lang.stringRepeat(" ", l - d));
				else
					session.remove(new Range(p.row, p.column, p.row, p.column - l + d));

				r.start.column = r.end.column = maxCol;
				r.start.row = r.end.row = p.row;
				r.cursor = r.end;
			});
			sel.fromOrientedRange(ranges[0]);
			this.renderer.updateCursor();
			this.renderer.updateBackMarkers();
		}
	};

	/**
	 * @param {string[]} lines
	 * @param {boolean} [forceLeft]
	 * @return {*}
	 * @this {Editor}
	 */
	this.$reAlignText = function(lines: string[], forceLeft: boolean) {
		var isLeftAligned = true, isRightAligned = true;
		var startW: number | undefined, textW: number | undefined, endW: number | undefined;

		return lines.map(function(line) {
			var m = line.match(/(\s*)(.*?)(\s*)([=:].*)/);
			if (!m)
				return [line];

			if (startW == null) {
				startW = m[1].length;
				textW = m[2].length;
				endW = m[3].length;
				return m;
			}

			if (startW + textW! + endW! != m[1].length + m[2].length + m[3].length)
				isRightAligned = false;
			if (startW != m[1].length)
				isLeftAligned = false;

			if (startW > m[1].length)
				startW = m[1].length;
			if (textW! < m[2].length)
				textW = m[2].length;
			if (endW! > m[3].length)
				endW = m[3].length;

			return m;
		}).map(forceLeft ? alignLeft :
			isLeftAligned ? isRightAligned ? alignRight : alignLeft : unAlign);

		function spaces(n: number) {
			return lang.stringRepeat(" ", n);
		}

		function alignLeft(m: string[]): string {
			return !m[2] ? m[0] : spaces(startW!) + m[2]
				+ spaces(textW! - m[2].length + endW!)
				+ m[4].replace(/^([=:])\s+/, "$1 ");
		}
		function alignRight(m: string[]): string {
			return !m[2] ? m[0] : spaces(startW! + textW! - m[2].length) + m[2]
				+ spaces(endW!)
				+ m[4].replace(/^([=:])\s+/, "$1 ");
		}
		function unAlign(m: string[]) {
			return !m[2] ? m[0] : spaces(startW!) + m[2]
				+ spaces(endW!)
				+ m[4].replace(/^([=:])\s+/, "$1 ");
		}
	};
}).call(Editor.prototype);

/** @param {Point} p1  @param {Point} p2 */
function isSamePoint(p1: Point, p2: Point) {
	return p1.row == p2.row && p1.column == p2.column;
}


/**
 * patch
 * adds multicursor support to a session
 * @this {Editor}
 * @type {(e: any) => void}
 */
export function onSessionChange(this: Editor, e: { session: EditSession, oldSession: EditSession }) {
	var session = e.session;
	if (session && !session.multiSelect) {
		session.$selectionMarkers = [];
		session.selection.$initRangeList();
		session.multiSelect = session.selection as EditSession["multiSelect"];
	}
	this.multiSelect = session && session.multiSelect;

	var oldSession = e.oldSession;
	if (oldSession) {
		const multiSelect = oldSession.multiSelect!;
		multiSelect.off("addRange", this.$onAddRange);
		multiSelect.off("removeRange", this.$onRemoveRange);
		multiSelect.off("multiSelect", this.$onMultiSelect);
		multiSelect.off("singleSelect", this.$onSingleSelect);
		multiSelect.lead.off("change", this.$checkMultiselectChange);
		multiSelect.anchor.off("change", this.$checkMultiselectChange);
	}

	if (session) {
		const multiSelect = session.multiSelect!;
		multiSelect.on("addRange", this.$onAddRange);
		multiSelect.on("removeRange", this.$onRemoveRange);
		multiSelect.on("multiSelect", this.$onMultiSelect);
		multiSelect.on("singleSelect", this.$onSingleSelect);
		multiSelect.lead.on("change", this.$checkMultiselectChange);
		multiSelect.anchor.on("change", this.$checkMultiselectChange);
	}

	if (session && this.inMultiSelectMode != session.selection.inMultiSelectMode) {
		if (session.selection.inMultiSelectMode)
			this.$onMultiSelect(void 0);
		else
			this.$onSingleSelect(void 0);
	}
};

// MultiSelect(editor)
// adds multiple selection support to the editor
// (note: should be called only once for each editor instance)
/**
 * @param {Editor} editor
 */
export function MultiSelect(editor: Editor) {
	if (editor.$multiselectOnSessionChange)
		return;
	editor.$onAddRange = editor.$onAddRange.bind(editor);
	editor.$onRemoveRange = editor.$onRemoveRange.bind(editor);
	editor.$onMultiSelect = editor.$onMultiSelect.bind(editor);
	editor.$onSingleSelect = editor.$onSingleSelect.bind(editor);
	editor.$multiselectOnSessionChange = onSessionChange.bind(editor);
	editor.$checkMultiselectChange = editor.$checkMultiselectChange.bind(editor);

	editor.$multiselectOnSessionChange(editor);
	editor.on("changeSession", editor.$multiselectOnSessionChange);

	editor.on("mousedown", onMouseDown);
	editor.commands.addCommands(ms_commands.defaultCommands);

	addAltCursorListeners(editor);
}

/**
 * @param {Editor} editor
 */
function addAltCursorListeners(editor: Editor) {
	if (!editor.textInput) return;
	var el = editor.textInput.getElement();
	var altCursor = false;
	el.onKeyDown.on(function(e) {
		var altDown = e.keycode == 18 && !(e.ctrl || e.shift || e.command);
		if (editor.$blockSelectEnabled && altDown) {
			if (!altCursor) {
				editor.renderer.setMouseCursor(CursorStyle.Crosshair);
				altCursor = true;
			}
		} else if (altCursor) {
			reset();
		}
	});
	el.onKeyUp.on(reset);
	el.onBlur.on(reset);
	function reset() {
		if (altCursor) {
			editor.renderer.setMouseCursor(CursorStyle.Normal);
			altCursor = false;
			// TODO disable menu popping up
			// e && e.preventDefault()
		}
	}
}

require("./config").defineOptions(Editor.prototype, "editor", {
	enableMultiselect: {
		/**
		 * @param {boolean} val
		 * @this {Editor}
		 */
		set: function(this: Editor, val: boolean) {
			MultiSelect(this);
			if (val) {
				this.on("mousedown", onMouseDown);
			} else {
				this.off("mousedown", onMouseDown);
			}
		},
		value: true
	},
	enableBlockSelect: {
		set: function(this: Editor, val: boolean) {
			this.$blockSelectEnabled = val;
		},
		value: true
	}
});
