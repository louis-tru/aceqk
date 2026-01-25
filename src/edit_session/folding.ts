"use strict";

import {Range,Point} from "../range";
import {FoldLine} from "./fold_line";
import {Fold} from "./fold";
import {TokenIterator} from "../token_iterator";
import type {EditSession} from "../edit_session";
import type { Delta, IRange } from "../range";
import type { FoldMode } from "../mode/folding/fold_mode";
import {MouseEvent} from "../mouse/mouse_event";
import type { UIEvent, KeyEvent } from "quark/event";
import type { Token } from "src/background_tokenizer";

/**
 * @typedef {import("../edit_session").EditSession & Folding} IFolding
 * @typedef {Delta } Delta
 */

export interface Folding {
	$foldData: FoldLine[];

	/**
	 * Looks up a fold at a given row/column. Possible values for side:
	 *   -1: ignore a fold if fold.start = row/column
	 *   +1: ignore a fold if fold.end = row/column
	 **/
	getFoldAt(row: number, column: number, side?: number): Fold | null;

	/**
	 * Returns all folds in the given range. Note, that this will return folds
	 **/
	getFoldsInRange(range: IRange | Delta): Fold[];

	getFoldsInRangeList(ranges: IRange[] | IRange): Fold[];

	/**
	 * Returns all folds in the document
	 */
	getAllFolds(): Fold[];

	/**
	 * Returns the string between folds at the given position.
	 * E.g.
	 *  foo<fold>b|ar<fold>wolrd -> "bar"
	 *  foo<fold>bar<fold>wol|rd -> "world"
	 *  foo<fold>bar<fo|ld>wolrd -> <null>
	 *
	 * where | means the position of row/column
	 *
	 * The trim option determs if the return string should be trimed according
	 * to the "side" passed with the trim value:
	 *
	 * E.g.
	 *  foo<fold>b|ar<fold>wolrd -trim=-1> "b"
	 *  foo<fold>bar<fold>wol|rd -trim=+1> "rld"
	 *  fo|o<fold>bar<fold>wolrd -trim=00> "foo"
	 */
	getFoldStringAt(row: number, column: number, trim?: number, foldLine?: FoldLine): string | null;

	getFoldLine(docRow: number, startFoldLine?: FoldLine): null | FoldLine;

	/**
	 * Returns the fold which starts after or contains docRow
	 */
	getNextFoldLine(docRow: number, startFoldLine?: FoldLine): null | FoldLine;

	getFoldedRowCount(first: number, last: number): number;

	$addFoldLine(foldLine: FoldLine): FoldLine;

	/**
	 * Adds a new fold.
	 * @returns {Fold}
	 *      The new created Fold object or an existing fold object in case the
	 *      passed in range fits an existing fold exactly.
	 */
	addFold(placeholder: Fold | string, range?: Range): Fold;

	$modified: boolean;

	addFolds(folds: Fold[]): void;

	removeFold(fold: Fold): void;

	removeFolds(folds: Fold[]): void;

	expandFold(fold: Fold): void;

	expandFolds(folds: Fold[]): void;

	unfold(location?: number | Point | IRange | IRange[], expandInner?: boolean): Fold[] | undefined;

	/**
	 * Checks if a given documentRow is folded. This is true if there are some
	 * folded parts such that some parts of the line is still visible.
	 **/
	isRowFolded(docRow: number, startFoldRow?: FoldLine): boolean;

	getRowFoldEnd(docRow: number, startFoldRow?: FoldLine): number;

	getRowFoldStart(docRow: number, startFoldRow?: FoldLine): number;

	getFoldDisplayLine(foldLine: FoldLine, endRow?: number, endColumn?: number, startRow?: number, startColumn?: number): string;

	getDisplayLine(row: number, endColumn?: number, startRow?: number, startColumn?: number): string;

	$cloneFoldData(): FoldLine[];

	toggleFold(tryToUnfold?: boolean): void;

	getCommentFoldRange(row: number, column: number, dir?: number): Range | undefined;

	foldAll(startRow?: number, endRow?: number, depth?: number, test?: (num: number) => boolean|void): void;

	foldToLevel(level: number): void;

	foldAllComments(): void;

	$foldStyles: {
		manual: number;
		markbegin: number;
		markbeginend: number;
	};
	$foldStyle: string;

	setFoldStyle(style: string): void;
	$setFolding(foldMode: FoldMode | null): void;

	$foldMode: any;
	foldWidgets?: any[];
	getFoldWidget: any;
	getFoldWidgetRange: any;
	$updateFoldWidgets: any;
	$tokenizerUpdateFoldWidgets: any;

	getParentFoldRangeData(row: number, ignoreCurrent?: boolean): {
		range?: Range;
		firstRange?: Range;
	};

	onFoldWidgetClick(row: number, e: MouseEvent | KeyEvent): void;

	$toggleFoldWidget(row: number, options: any): Fold | any;

	/**
	 *
	 * @param {boolean} [toggleParent]
	 */
	toggleFoldWidget(toggleParent?: boolean): void;

	updateFoldWidgets(delta: Delta): void;

	tokenizerUpdateFoldWidgets(e: any): void;
}

/**
 * @this {IFolding}
 * @type {IFolding}
 */
export function Folding(this: EditSession) {
	/**
	 * Looks up a fold at a given row/column. Possible values for side:
	 *   -1: ignore a fold if fold.start = row/column
	 *   +1: ignore a fold if fold.end = row/column
	 * @param {number} row
	 * @param {number} column
	 * @param {number} [side]
	 * @return {Fold}
	 **/
	this.getFoldAt = function(row, column, side) {
		var foldLine = this.getFoldLine(row);
		if (!foldLine)
			return null;

		var folds = foldLine.folds;
		for (var i = 0; i < folds.length; i++) {
			var range = folds[i].range;
			if (range.contains(row, column)) {
				if (side == 1 && range.isEnd(row, column) && !range.isEmpty()) {
					continue;
				} else if (side == -1 && range.isStart(row, column) && !range.isEmpty()) {
					continue;
				}
				return folds[i];
			}
		}
		return null;
	};

	/**
	 * Returns all folds in the given range. Note, that this will return folds
	 * @param {Range| Delta} range
	 * @returns {Fold[]}
	 **/
	this.getFoldsInRange = function(range) {
		var start = range.start;
		var end = range.end;
		var foldLines = this.$foldData;
		var foundFolds = [];

		start.column += 1;
		end.column -= 1;

		for (var i = 0; i < foldLines.length; i++) {
			var cmp = foldLines[i].range.compareRange(range);
			if (cmp == 2) {
				// Range is before foldLine. No intersection. This means,
				// there might be other foldLines that intersect.
				continue;
			}
			else if (cmp == -2) {
				// Range is after foldLine. There can't be any other foldLines then,
				// so let's give up.
				break;
			}

			var folds = foldLines[i].folds;
			for (var j = 0; j < folds.length; j++) {
				var fold = folds[j];
				cmp = fold.range.compareRange(range);
				if (cmp == -2) {
					break;
				} else if (cmp == 2) {
					continue;
				} else
				// WTF-state: Can happen due to -1/+1 to start/end column.
				if (cmp == 42) {
					break;
				}
				foundFolds.push(fold);
			}
		}
		start.column -= 1;
		end.column += 1;

		return foundFolds;
	};

	/**
	 * 
	 * @param {Range[]|Range}ranges
	 * @returns {Fold[]}
	 */
	this.getFoldsInRangeList = function(ranges) {
		if (Array.isArray(ranges)) {
			/**@type {Fold[]} */
			var folds: Fold[] = [];
			ranges.forEach((range) => {
				folds = folds.concat(this.getFoldsInRange(range));
			});
		} else {
			var folds = this.getFoldsInRange(ranges);
		}
		return folds;
	};
	
	/**
	 * Returns all folds in the document
	 * @returns {Fold[]}
	 */
	this.getAllFolds = function() {
		var folds = [];
		var foldLines = this.$foldData;
		
		for (var i = 0; i < foldLines.length; i++)
			for (var j = 0; j < foldLines[i].folds.length; j++)
				folds.push(foldLines[i].folds[j]);

		return folds;
	};

	/**
	 * Returns the string between folds at the given position.
	 * E.g.
	 *  foo<fold>b|ar<fold>wolrd -> "bar"
	 *  foo<fold>bar<fold>wol|rd -> "world"
	 *  foo<fold>bar<fo|ld>wolrd -> <null>
	 *
	 * where | means the position of row/column
	 *
	 * The trim option determs if the return string should be trimed according
	 * to the "side" passed with the trim value:
	 *
	 * E.g.
	 *  foo<fold>b|ar<fold>wolrd -trim=-1> "b"
	 *  foo<fold>bar<fold>wol|rd -trim=+1> "rld"
	 *  fo|o<fold>bar<fold>wolrd -trim=00> "foo"
	 *  @param {number} row
	 *  @param {number} column
	 *  @param {number} [trim]
	 *  @param {FoldLine} [foldLine]
	 *  @returns {string | null}
	 */
	this.getFoldStringAt = function(row, column, trim, foldLine) {
		foldLine = foldLine || this.getFoldLine(row)!!;
		if (!foldLine)
			return null;

		var lastFold = {
			end: { column: 0 }
		};
		// TODO: Refactor to use getNextFoldTo function.
		var str, fold: Fold;
		for (var i = 0; i < foldLine.folds.length; i++) {
			fold = foldLine.folds[i];
			var cmp = fold.range.compareEnd(row, column);
			if (cmp == -1) {
				str = this
					.getLine(fold.start.row)
					.substring(lastFold.end.column, fold.start.column);
				break;
			}
			else if (cmp === 0) {
				return null;
			}
			lastFold = fold;
		}
		if (!str)
			str = this.getLine(fold!.start.row).substring(lastFold.end.column);

		if (trim == -1)
			return str.substring(0, column - lastFold.end.column);
		else if (trim == 1)
			return str.substring(column - lastFold.end.column);
		else
			return str;
	};

	/**
	 * 
	 * @param {number} docRow
	 * @param {FoldLine} [startFoldLine]
	 * @returns {null|FoldLine}
	 */
	this.getFoldLine = function(docRow, startFoldLine) {
		var foldData = this.$foldData;
		var i = 0;
		if (startFoldLine)
			i = foldData.indexOf(startFoldLine);
		if (i == -1)
			i = 0;
		for (i; i < foldData.length; i++) {
			var foldLine = foldData[i];
			if (foldLine.start.row <= docRow && foldLine.end.row >= docRow) {
				return foldLine;
			} else if (foldLine.end.row > docRow) {
				return null;
			}
		}
		return null;
	};

	/**
	 * Returns the fold which starts after or contains docRow
	 * @param {number} docRow
	 * @param {FoldLine} [startFoldLine]
	 * @returns {null|FoldLine}
	 */
	this.getNextFoldLine = function(docRow, startFoldLine) {
		var foldData = this.$foldData;
		var i = 0;
		if (startFoldLine)
			i = foldData.indexOf(startFoldLine);
		if (i == -1)
			i = 0;
		for (i; i < foldData.length; i++) {
			var foldLine = foldData[i];
			if (foldLine.end.row >= docRow) {
				return foldLine;
			}
		}
		return null;
	};

	/**
	 * 
	 * @param {number} first
	 * @param {number} last
	 * @return {number}
	 */
	this.getFoldedRowCount = function(first, last) {
		var foldData = this.$foldData, rowCount = last-first+1;
		for (var i = 0; i < foldData.length; i++) {
			var foldLine = foldData[i],
				end = foldLine.end.row,
				start = foldLine.start.row;
			if (end >= last) {
				if (start < last) {
					if (start >= first)
						rowCount -= last-start;
					else
						rowCount = 0; // in one fold
				}
				break;
			} else if (end >= first){
				if (start >= first) // fold inside range
					rowCount -=  end-start;
				else
					rowCount -=  end-first+1;
			}
		}
		return rowCount;
	};

	/**
	 * 
	 * @param {FoldLine}foldLine
	 * @return {FoldLine}
	 */
	this.$addFoldLine = function(foldLine) {
		this.$foldData.push(foldLine);
		this.$foldData.sort(function(a, b) {
			return a.start.row - b.start.row;
		});
		return foldLine;
	};

	/**
	 * Adds a new fold.
	 *
	 * @param {Fold|string} placeholder
	 * @param {Range} [range]
	 * @returns {Fold}
	 *      The new created Fold object or an existing fold object in case the
	 *      passed in range fits an existing fold exactly.
	 * @this {IFolding}
	 */
	this.addFold = function(placeholder, range) {
		var foldData = this.$foldData;
		var added = false;
		var fold: Fold;
		
		if (placeholder instanceof Fold)
			fold = placeholder;
		else {
			fold = new Fold(range!, placeholder);
			fold.collapseChildren = range!.collapseChildren;
		}
		this.$clipRangeToDocument(fold.range);

		var startRow = fold.start.row;
		var startColumn = fold.start.column;
		var endRow = fold.end.row;
		var endColumn = fold.end.column;

		var startFold = this.getFoldAt(startRow, startColumn, 1);
		var endFold = this.getFoldAt(endRow, endColumn, -1);
		if (startFold && endFold == startFold)
			return startFold.addSubFold(fold)!;

		if (startFold && !startFold.range.isStart(startRow, startColumn))
			this.removeFold(startFold);
		
		if (endFold && !endFold.range.isEnd(endRow, endColumn))
			this.removeFold(endFold);
		
		// Check if there are folds in the range we create the new fold for.
		var folds = this.getFoldsInRange(fold.range);
		if (folds.length > 0) {
			// Remove the folds from fold data.
			this.removeFolds(folds);
			// Add the removed folds as subfolds on the new fold.
			if (!fold.collapseChildren) {
				folds.forEach(function(subFold) {
					fold.addSubFold(subFold);
				});
			}
		}

		for (var i = 0; i < foldData.length; i++) {
			var foldLine = foldData[i];
			if (endRow == foldLine.start.row) {
				foldLine.addFold(fold);
				added = true;
				break;
			} else if (startRow == foldLine.end.row) {
				foldLine.addFold(fold);
				added = true;
				if (!fold.sameRow) {
					// Check if we might have to merge two FoldLines.
					var foldLineNext = foldData[i + 1];
					if (foldLineNext && foldLineNext.start.row == endRow) {
						// We need to merge!
						foldLine.merge(foldLineNext);
						break;
					}
				}
				break;
			} else if (endRow <= foldLine.start.row) {
				break;
			}
		}

		if (!added)
			foldLine = this.$addFoldLine(new FoldLine(this.$foldData, fold));

		if (this.$useWrapMode)
			this.$updateWrapData(foldLine!.start.row, foldLine!.start.row);
		else
			this.$updateRowLengthCache(foldLine!.start.row, foldLine!.start.row);

		// Notify that fold data has changed.
		this.$modified = true;
		this._signal("changeFold", { data: fold, action: "add" }, this);

		return fold;
	};

	/**
	 * @param {Fold[]} folds
	 */
	this.addFolds = function(folds) {
		folds.forEach((fold) => {
			this.addFold(fold);
		});
	};

	/**
	 * 
	 * @param {Fold} fold
	 */
	this.removeFold = function(fold) {
		var foldLine = fold.foldLine!;
		var startRow = foldLine.start.row;
		var endRow = foldLine.end.row;

		var foldLines = this.$foldData;
		var folds = foldLine.folds;
		// Simple case where there is only one fold in the FoldLine such that
		// the entire fold line can get removed directly.
		if (folds.length == 1) {
			foldLines.splice(foldLines.indexOf(foldLine), 1);
		} else
		// If the fold is the last fold of the foldLine, just remove it.
		if (foldLine.range.isEnd(fold.end.row, fold.end.column)) {
			folds.pop();
			foldLine.end.row = folds[folds.length - 1].end.row;
			foldLine.end.column = folds[folds.length - 1].end.column;
		} else
		// If the fold is the first fold of the foldLine, just remove it.
		if (foldLine.range.isStart(fold.start.row, fold.start.column)) {
			folds.shift();
			foldLine.start.row = folds[0].start.row;
			foldLine.start.column = folds[0].start.column;
		} else
		// We know there are more then 2 folds and the fold is not at the edge.
		// This means, the fold is somewhere in between.
		//
		// If the fold is in one row, we just can remove it.
		if (fold.sameRow) {
			folds.splice(folds.indexOf(fold), 1);
		} else
		// The fold goes over more then one row. This means remvoing this fold
		// will cause the fold line to get splitted up. newFoldLine is the second part
		{
			var newFoldLine = foldLine.split(fold.start.row, fold.start.column)!;
			folds = newFoldLine.folds;
			folds.shift();
			newFoldLine.start.row = folds[0].start.row;
			newFoldLine.start.column = folds[0].start.column;
		}

		if (!this.$updating) {
			if (this.$useWrapMode)
				this.$updateWrapData(startRow, endRow);
			else
				this.$updateRowLengthCache(startRow, endRow);
		}
		
		// Notify that fold data has changed.
		this.$modified = true;
		this._signal("changeFold", { data: fold, action: "remove" }, this);
	};

	/**
	 * 
	 * @param {Fold[]} folds
	 */
	this.removeFolds = function(folds) {
		// We need to clone the folds array passed in as it might be the folds
		// array of a fold line and as we call this.removeFold(fold), folds
		// are removed from folds and changes the current index.
		var cloneFolds = [];
		for (var i = 0; i < folds.length; i++) {
			cloneFolds.push(folds[i]);
		}

		cloneFolds.forEach((fold) => {
			this.removeFold(fold);
		});
		this.$modified = true;
	};

	/**
	 * @param {Fold} fold
	 */
	this.expandFold = function(fold) {
		this.removeFold(fold);
		fold.subFolds.forEach((subFold) => {
			fold.restoreRange(subFold);
			this.addFold(subFold);
		});
		if (fold.collapseChildren! > 0) {
			this.foldAll(fold.start.row+1, fold.end.row, fold.collapseChildren!-1);
		}
		fold.subFolds = [];
	};

	/**
	 * @param {Fold[]}folds
	 */
	this.expandFolds = function(folds) {
		folds.forEach((fold) => {
			this.expandFold(fold);
		});
	};

	/**
	 * 
	 * @param {number|null|Point|Range|Range[]} [location]
	 * @param {boolean} [expandInner]
	 * @return {Fold[]| undefined}
	 */
	this.unfold = function(location, expandInner) {
		var range, folds: Fold[];
		if (location == null) {
			range = new Range(0, 0, this.getLength(), 0);
			if (expandInner == null) expandInner = true;
		} else if (typeof location == "number") {
			range = new Range(location, 0, location, this.getLine(location).length);
		} else if ("row" in location) {
			range = Range.fromPoints(location, location);
		} else if (Array.isArray(location)) {
			folds = [];
			location.forEach((range) => {
				folds = folds.concat(this.unfold(range)!);
			});
			return folds;
		} else {
			range = location;
		}
		
		folds = this.getFoldsInRangeList(range);
		var outermostFolds = folds;
		// if range itself is in a fold, expand that fold instead of removing, 
		// to not accidentally remove sibling folds
		while (
			folds.length == 1
			&& Range.comparePoints(folds[0].start, range.start) < 0 
			&& Range.comparePoints(folds[0].end, range.end) > 0
		) {
			this.expandFolds(folds);
			folds = this.getFoldsInRangeList(range);
		}
		
		if (expandInner != false) {
			this.removeFolds(folds);
		} else {
			this.expandFolds(folds);
		}
		if (outermostFolds.length)
			return outermostFolds;
	};

	/**
	 * Checks if a given documentRow is folded. This is true if there are some
	 * folded parts such that some parts of the line is still visible.
	 * @param {number} docRow
	 * @param {FoldLine} [startFoldRow]
	 * @returns {boolean}
	 **/
	this.isRowFolded = function(docRow, startFoldRow) {
		return !!this.getFoldLine(docRow, startFoldRow);
	};

	/**
	 * 
	 * @param {number} docRow
	 * @param {FoldLine} [startFoldRow]
	 * @return {number}
	 */
	this.getRowFoldEnd = function(docRow, startFoldRow) {
		var foldLine = this.getFoldLine(docRow, startFoldRow);
		return foldLine ? foldLine.end.row : docRow;
	};

	/**
	 * 
	 * @param {number} docRow
	 * @param {FoldLine} [startFoldRow]
	 * @returns {number}
	 */
	this.getRowFoldStart = function(docRow, startFoldRow) {
		var foldLine = this.getFoldLine(docRow, startFoldRow);
		return foldLine ? foldLine.start.row : docRow;
	};

	/**
	 * 
	 * @param {FoldLine} foldLine
	 * @param {number | null} [endRow]
	 * @param {number | null} [endColumn]
	 * @param {number | null} [startRow]
	 * @param {number | null} [startColumn]
	 * @return {string}
	 */
	this.getFoldDisplayLine = function(foldLine, endRow, endColumn, startRow, startColumn) {
		if (startRow == null)
			startRow = foldLine.start.row;
		if (startColumn == null)
			startColumn = 0;
		if (endRow == null)
			endRow = foldLine.end.row;
		if (endColumn == null)
			endColumn = this.getLine(endRow).length;
		

		// Build the textline using the FoldLine walker.
		var doc = this.doc;
		var textLine = "";

		foldLine.walk(function(placeholder, row, column, lastColumn) {
			if (row < startRow)
				return;
			if (row == startRow) {
				if (column < startColumn)
					return;
				lastColumn = Math.max(startColumn, lastColumn);
			}

			if (placeholder != null) {
				textLine += placeholder;
			} else {
				textLine += doc.getLine(row).substring(lastColumn, column);
			}
		}, endRow, endColumn);
		return textLine;
	};

	/**
	 * @param {number} row
	 * @param {number | null} endColumn
	 * @param {number | null} startRow
	 * @param {number | null} startColumn
	 * @return {string}
	 */
	this.getDisplayLine = function(row, endColumn, startRow, startColumn) {
		var foldLine = this.getFoldLine(row);

		if (!foldLine) {
			var line;
			line = this.doc.getLine(row);
			return line.substring(startColumn || 0, endColumn || line.length);
		} else {
			return this.getFoldDisplayLine(
				foldLine, row, endColumn, startRow, startColumn);
		}
	};

	/**
	 * @return {FoldLine[]}
	 */
	this.$cloneFoldData = function() {
		var fd: FoldLine[] = [];
		fd = this.$foldData.map(function(foldLine) {
			var folds = foldLine.folds.map(function(fold) {
				return fold.clone();
			});
			return new FoldLine(fd, folds);
		});

		return fd;
	};

	/**
	 * @param {boolean} [tryToUnfold]
	 */
	this.toggleFold = function(tryToUnfold) {
		var selection = this.selection;
		var range = selection.getRange();
		var fold;
		var bracketPos;

		if (range.isEmpty()) {
			var cursor = range.start;
			fold = this.getFoldAt(cursor.row, cursor.column);

			if (fold) {
				this.expandFold(fold);
				return;
			} else if (tryToUnfold) {
				var foldLine = this.getFoldLine(cursor.row);
				if (foldLine)
					this.expandFolds(foldLine.folds);
				return;
			} else if (bracketPos = this.findMatchingBracket(cursor)) {
				if (range.comparePoint(bracketPos) == 1) {
					range.end = bracketPos;
				} else {
					range.start = bracketPos;
					range.start.column++;
					range.end.column--;
				}
			} else if (bracketPos = this.findMatchingBracket({row: cursor.row, column: cursor.column + 1})) {
				if (range.comparePoint(bracketPos) == 1)
					range.end = bracketPos;
				else
					range.start = bracketPos;

				range.start.column++;
			} else {
				range = this.getCommentFoldRange(cursor.row, cursor.column) || range;
			}
		} else {
			var folds = this.getFoldsInRange(range);
			if (tryToUnfold && folds.length) {
				this.expandFolds(folds);
				return;
			} else if (folds.length == 1 ) {
				fold = folds[0];
			}
		}

		if (!fold)
			fold = this.getFoldAt(range.start.row, range.start.column);

		if (fold && fold.range.toString() == range.toString()) {
			this.expandFold(fold);
			return;
		}

		var placeholder = "...";
		if (!range.isMultiLine()) {
			placeholder = this.getTextRange(range);
			if (placeholder.length < 4)
				return;
			placeholder = placeholder.trim().substring(0, 2) + "..";
		}

		this.addFold(placeholder, range);
	};

	/**
	 * 
	 * @param {number} row
	 * @param {number} column
	 * @param {number} [dir]
	 * @return {Range | undefined}
	 */
	this.getCommentFoldRange = function(row, column, dir) {
		var iterator = new TokenIterator(this, row, column);
		var token = iterator.getCurrentToken();
		var type = token && token.type;
		if (token && /^comment|string/.test(type)) {
			type = type.match(/comment|string/)![0];
			if (type == "comment")
				type += "|doc-start|\\.doc";
			var re = new RegExp(type);
			var range = new Range(0,0,0,0);
			if (dir != 1) {
				do {
					token = iterator.stepBackward()!;
				} while (token && re.test(token.type));
				token = iterator.stepForward()!;
			}

			range.start.row = iterator.getCurrentTokenRow();
			range.start.column = iterator.getCurrentTokenColumn() + token.value.length;

			iterator = new TokenIterator(this, row, column);
			var initState = this.getState(iterator.$row);
			
			if (dir != -1) {
				var lastRow = -1;
				do {
					token = iterator.stepForward()!;
					if (lastRow == -1) {
						var state = this.getState(iterator.$row);
						if (initState.toString() !== state.toString())
							lastRow = iterator.$row;
					} else if (iterator.$row > lastRow) {
						break;
					}
				} while (token && re.test(token.type));
				token = iterator.stepBackward()!;
			} else
				token = iterator.getCurrentToken();

			range.end.row = iterator.getCurrentTokenRow();
			range.end.column = iterator.getCurrentTokenColumn();
			if (range.start.row == range.end.row && range.start.column > range.end.column)
				return;
			return range;
		}
	};

	/**
	 * 
	 * @param {number | null} [startRow]
	 * @param {number | null} [endRow]
	 * @param {number | null} [depth]
	 * @param {Function} [test]
	 */
	this.foldAll = function(startRow, endRow, depth, test) {
		if (depth == undefined)
			depth = 100000; // JSON.stringify doesn't hanle Infinity
		var foldWidgets = this.foldWidgets;
		if (!foldWidgets)
			return; // mode doesn't support folding
		endRow = endRow || this.getLength();
		startRow = startRow || 0;
		for (var row = startRow; row < endRow; row++) {
			if (foldWidgets[row] == null)
				foldWidgets[row] = this.getFoldWidget(row);
			if (foldWidgets[row] != "start")
				continue;
			
			if (test && !test(row)) continue;

			var range = this.getFoldWidgetRange(row);
			if (range && range.isMultiLine()
				&& range.end.row <= endRow
				&& range.start.row >= startRow
			) {
				row = range.end.row;
				range.collapseChildren = depth;
				// addFold can change the range
				this.addFold("...", range);
			}
		}
	};

	/**
	 * 
	 * @param {number} level
	 */
	this.foldToLevel = function(level) {
		this.foldAll();
		while (level-- > 0)
			this.unfold(void 0, false);
	};

	/**
	 *
	 */
	this.foldAllComments = function() {
		var session = this;
		this.foldAll(void 0, void 0, void 0, function(row) {
			var tokens = session.getTokens(row);
			for (var i = 0; i < tokens.length; i++) {
				var token = tokens[i];
				if (token.type == "text" && /^\s+$/.test(token.value))
					continue;
				if (/comment/.test(token.type))
					return true;
				return false;
			}
		});
	};
	
	// structured folding
	this.$foldStyles = {
		"manual": 1,
		"markbegin": 1,
		"markbeginend": 1
	};
	this.$foldStyle = "markbegin";
	
	/**
	 * @param {string} style
	 */
	this.setFoldStyle = function(style) {
		if (!this.$foldStyles[style as keyof typeof this.$foldStyles])
			throw new Error("invalid fold style: " + style + "[" + Object.keys(this.$foldStyles).join(", ") + "]");

		if (this.$foldStyle == style)
			return;

		this.$foldStyle = style;
		
		if (style == "manual")
			this.unfold();
		
		// reset folding
		var mode = this.$foldMode;
		this.$setFolding(null);
		this.$setFolding(mode);
	};

	/**
	 * @param {FoldMode} foldMode
	 */
	this.$setFolding = function(foldMode) {
		if (this.$foldMode == foldMode)
			return;


		this.$foldMode = foldMode;
		
		this.off('change', this.$updateFoldWidgets);
		this.off('tokenizerUpdate', this.$tokenizerUpdateFoldWidgets);
		this._signal("changeAnnotation", {}, this);

		if (!foldMode || this.$foldStyle == "manual") {
			this.foldWidgets = void 0;
			return;
		}

		this.foldWidgets = [];
		this.getFoldWidget = foldMode.getFoldWidget.bind(foldMode, this, this.$foldStyle);
		this.getFoldWidgetRange = foldMode.getFoldWidgetRange.bind(foldMode, this, this.$foldStyle);
		
		this.$updateFoldWidgets = this.updateFoldWidgets.bind(this);
		this.$tokenizerUpdateFoldWidgets = this.tokenizerUpdateFoldWidgets.bind(this);
		this.on('change', this.$updateFoldWidgets);
		this.on('tokenizerUpdate', this.$tokenizerUpdateFoldWidgets);
	};
	/**
	 * @param {number} row
	 * @param {boolean} [ignoreCurrent]
	 * @return {{range?: Range, firstRange?: Range}}
	 */
	this.getParentFoldRangeData = function (row, ignoreCurrent) {
		var fw = this.foldWidgets;
		if (!fw || (ignoreCurrent && fw[row]))
			return {};

		var i = row - 1, firstRange;
		while (i >= 0) {
			var c = fw[i];
			if (c == null)
				c = fw[i] = this.getFoldWidget(i);

			if (c == "start") {
				var range = this.getFoldWidgetRange(i);
				if (!firstRange)
					firstRange = range;
				if (range && range.end.row >= row)
					break;
			}
			i--;
		}

		return {
			range: i !== -1 && range,
			firstRange: firstRange
		};
	};

	/**
	 * 
	 * @param {number} row
	 * @param {any} e
	 */
	this.onFoldWidgetClick = function(row, e: MouseEvent | KeyEvent) {
		if (e instanceof MouseEvent)
			e = e.domEvent;

		var options = {
			children: e.shift,
			all: e.ctrl || e.command,
			siblings: e.alt
		};
		
		var range = this.$toggleFoldWidget(row, options);
		if (!range) {
			var el = e.origin;
			if (el && /ace_fold-widget/.test(el.class+''))
				el.addClass("ace_invalid");
		}
	};

	/**
	 * 
	 * @param {number} row
	 * @param options
	 * @return {Fold|*}
	 */
	this.$toggleFoldWidget = function(row, options) {
		if (!this.getFoldWidget)
			return;
		var type = this.getFoldWidget(row);
		var line = this.getLine(row);

		var dir = type === "end" ? -1 : 1;
		var fold = this.getFoldAt(row, dir === -1 ? 0 : line.length, dir);

		if (fold) {
			if (options.children || options.all)
				this.removeFold(fold);
			else
				this.expandFold(fold);
			return fold;
		}

		var range = this.getFoldWidgetRange(row, true);
		// sometimes singleline folds can be missed by the code above
		if (range && !range.isMultiLine()) {
			fold = this.getFoldAt(range.start.row, range.start.column, 1);
			if (fold && range.isEqual(fold.range)) {
				this.removeFold(fold);
				return fold;
			}
		}
		
		if (options.siblings) {
			var data = this.getParentFoldRangeData(row);
			var startRow, endRow;
			if (data.range) {
				startRow = data.range.start.row + 1;
				endRow = data.range.end.row;
			}
			this.foldAll(startRow, endRow, options.all ? 10000 : 0);
		} else if (options.children) {
			endRow = range ? range.end.row : this.getLength();
			this.foldAll(row + 1, endRow, options.all ? 10000 : 0);
		} else if (range) {
			if (options.all) 
				range.collapseChildren = 10000;
			this.addFold("...", range);
		}
		
		return range;
	};
	
	/**
	 * 
	 * @param {boolean} [toggleParent]
	 */
	this.toggleFoldWidget = function(toggleParent) {
		var row = this.selection.getCursor().row;
		row = this.getRowFoldStart(row);
		var range = this.$toggleFoldWidget(row, {});
		
		if (range)
			return;
		// handle toggleParent
		var data = this.getParentFoldRangeData(row, true);
		range = data.range || data.firstRange;
		
		if (range) {
			row = range.start.row;
			var fold = this.getFoldAt(row, this.getLine(row).length, 1);

			if (fold) {
				this.removeFold(fold);
			} else {
				this.addFold("...", range);
			}
		}
	};

	/**
	 * @param {Delta} delta
	 */
	this.updateFoldWidgets = function(delta) {
		var firstRow = delta.start.row;
		var len = delta.end.row - firstRow;

		if (len === 0) {
			this.foldWidgets![firstRow] = null;
		} else if (delta.action == 'remove') {
			this.foldWidgets!.splice(firstRow, len + 1, null);
		} else {
			var args = Array(len + 1);
			this.foldWidgets!.splice(firstRow, 1, ...args);
		}
	};
	/**
	 * @param e
	 */
	this.tokenizerUpdateFoldWidgets = function(e) {
		var rows = e.data;
		if (rows.first != rows.last) {
			if (this.foldWidgets!.length > rows.first)
				this.foldWidgets!.splice(rows.first, this.foldWidgets!.length);
		}
	};
}
