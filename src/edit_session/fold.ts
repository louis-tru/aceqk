"use strict";

import {RangeList} from "../range_list";
import type {Point, Range, IRange} from "../range";
import type { FoldLine } from "./fold_line";
import type {LineWidget} from "../line_widgets";

/*
 * Simple fold-data struct.
 **/
export class Fold { //extends RangeList {
	public range: Range;
	public placeholder: any;
	public foldLine?: FoldLine;
	public start: Point
	public end: Point
	public sameRow: boolean
	public subFolds: Fold[]
	public collapseChildren?: number
	public other?: Fold;
	public lineWidget?: LineWidget;

	/**
	 * @param {Range} range
	 * @param {any} placeholder
	 */
	constructor(range: Range, placeholder: any) {
		// super();
		this.foldLine = void 0;
		this.placeholder = placeholder;
		this.range = range;
		this.start = range.start;
		this.end = range.end;

		this.sameRow = range.start.row == range.end.row;
		this.subFolds = [];
		// this.subFolds = this.ranges = [];
	}

	toString() {
		return '"' + this.placeholder + '" ' + this.range.toString();
	}

	/**
	 * @param {FoldLine} foldLine
	 */
	setFoldLine(foldLine?: FoldLine) {
		this.foldLine = foldLine;
		this.subFolds.forEach(function(fold) {
			fold.setFoldLine(foldLine);
		});
	}

	clone() {
		var range = this.range.clone();
		var fold = new Fold(range, this.placeholder);
		this.subFolds.forEach(function(subFold) {
			fold.subFolds.push(subFold.clone());
		});
		fold.collapseChildren = this.collapseChildren;
		return fold;
	}

	/**
	 * @param {Fold} fold
	 */
	addSubFold(fold: Fold): Fold | null {
		if (this.range.isEqual(fold))
			return null;

		// transform fold to local coordinates
		consumeRange(fold, this.start);

		var row = fold.start.row, column = fold.start.column;
		for (var i = 0, cmp = -1; i < this.subFolds.length; i++) {
			cmp = this.subFolds[i].range.compare(row, column);
			if (cmp != 1)
				break;
		}
		var afterStart = this.subFolds[i];
		var firstConsumed = 0;

		if (cmp == 0) {
			if (afterStart.range.containsRange(fold))
				return afterStart.addSubFold(fold);
			else
				firstConsumed = 1;
		}

		// cmp == -1
		var row = fold.range.end.row, column = fold.range.end.column;
		for (var j = i, cmp = -1; j < this.subFolds.length; j++) {
			cmp = this.subFolds[j].range.compare(row, column);
			if (cmp != 1)
				break;
		}
		if (cmp == 0)  j++;
		var consumedFolds = this.subFolds.splice(i, j - i, fold);
		var last = cmp == 0 ? consumedFolds.length - 1 : consumedFolds.length;
		for (var k = firstConsumed; k < last; k++) {
			fold.addSubFold(consumedFolds[k]);
		}
		fold.setFoldLine(this.foldLine);

		return fold;
	}

	/**
	 * @param {IRange} range
	 */
	restoreRange(range: IRange) {
		restoreRange(range, this.start);
	}
}

/**
 * @param {Point} point
 * @param {Point} anchor
 */
function consumePoint(point: Point, anchor: Point) {
	point.row -= anchor.row;
	if (point.row == 0)
		point.column -= anchor.column;
}
/**
 * @param {IRange} range
 * @param {Point} anchor
 */
function consumeRange(range: IRange, anchor: Point) {
	consumePoint(range.start, anchor);
	consumePoint(range.end, anchor);
}
/**
 * @param {Point} point
 * @param {Point} anchor
 */
function restorePoint(point: Point, anchor: Point) {
	if (point.row == 0)
		point.column += anchor.column;
	point.row += anchor.row;
}
/**
 * @param {IRange} range
 * @param {Point} anchor
 */
function restoreRange(range: IRange, anchor: Point) {
	restorePoint(range.start, anchor);
	restorePoint(range.end, anchor);
}