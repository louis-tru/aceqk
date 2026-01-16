"use strict";

import {Point,Range,Delta,IRange} from "./range";
import type {EditSession} from "./edit_session";
const comparePoints = Range.comparePoints;

export class RangeList {
	readonly comparePoints = comparePoints;
	public ranges: Range[] = [];
	private session?: EditSession;
	private onChange?: ((delta: Delta) => void);
	public $bias: number = 1;

	/**
	 * @param {Point} pos
	 * @param {boolean} [excludeEdges]
	 * @param {number} [startIndex]
	 * @return {number}
	 */
	pointIndex(pos: Point, excludeEdges?: boolean, startIndex?: number) {
		var list = this.ranges;

		for (var i = startIndex || 0; i < list.length; i++) {
			var range = list[i];
			var cmpEnd = comparePoints(pos, range.end);
			if (cmpEnd > 0)
				continue;
			var cmpStart = comparePoints(pos, range.start);
			if (cmpEnd === 0)
				return excludeEdges && cmpStart !== 0 ? -i-2 : i;
			if (cmpStart > 0 || (cmpStart === 0 && !excludeEdges))
				return i;

			return -i-1;
		}
		return -i - 1;
	}

	/**
	 * @param {Range} range
	 */
	add(range: Range) {
		var excludeEdges = !Range.isEmpty(range);
		var startIndex = this.pointIndex(range.start, excludeEdges);
		if (startIndex < 0)
			startIndex = -startIndex - 1;

		var endIndex = this.pointIndex(range.end, excludeEdges, startIndex);

		if (endIndex < 0)
			endIndex = -endIndex - 1;
		else
			endIndex++;
		return this.ranges.splice(startIndex, endIndex - startIndex, range);
	}

	/**
	 * @param {Range[]} list
	 */
	addList(list: Range[]) {
		var removed: Range[] = [];
		for (var i = list.length; i--; ) {
			removed.push.apply(removed, this.add(list[i]));
		}
		return removed;
	}

	/**
	 * @param {Point} pos
	 */
	substractPoint(pos: Point) {
		var i = this.pointIndex(pos);

		if (i >= 0)
			return this.ranges.splice(i, 1);
	}

	// merge overlapping ranges
	merge() {
		var removed = [];
		var list = this.ranges;
		
		list = list.sort(function(a, b) {
			return comparePoints(a.start, b.start);
		});
		
		var next = list[0], range;
		for (var i = 1; i < list.length; i++) {
			range = next;
			next = list[i];
			var cmp = comparePoints(range.end, next.start);
			if (cmp < 0)
				continue;

			if (cmp == 0 && !Range.isEmpty(range) && !Range.isEmpty(next))
				continue;

			if (comparePoints(range.end, next.end) < 0) {
				range.end.row = next.end.row;
				range.end.column = next.end.column;
			}

			list.splice(i, 1);
			removed.push(next);
			next = range;
			i--;
		}
		
		this.ranges = list;

		return removed;
	}

	/**
	 * @param {number} row
	 * @param {number} column
	 */
	contains(row: number, column: number) {
		return this.pointIndex({row: row, column: column}) >= 0;
	}

	/**
	 * @param {Point} pos
	 */
	containsPoint(pos: Point) {
		return this.pointIndex(pos) >= 0;
	}

	/**
	 * @param {Point} pos
	 */
	rangeAtPoint(pos: Point) {
		var i = this.pointIndex(pos);
		if (i >= 0)
			return this.ranges[i];
	}


	/**
	 * @param {number} startRow
	 * @param {number} endRow
	 */
	clipRows(startRow: number, endRow: number) {
		var list = this.ranges;
		if (list[0].start.row > endRow || list[list.length - 1].start.row < startRow)
			return [];

		var startIndex = this.pointIndex({row: startRow, column: 0});
		if (startIndex < 0)
			startIndex = -startIndex - 1;
		//@ts-expect-error TODO: potential wrong argument
		var endIndex = this.pointIndex({row: endRow, column: 0}, startIndex);
		if (endIndex < 0)
			endIndex = -endIndex - 1;

		var clipped = [];
		for (var i = startIndex; i < endIndex; i++) {
			clipped.push(list[i]);
		}
		return clipped;
	}

	removeAll() {
		return this.ranges.splice(0, this.ranges.length);
	}

	/**
	 * @param {EditSession} session
	 */
	attach(session: EditSession) {
		if (this.session)
			this.detach();

		this.session = session;
		this.onChange = this.$onChange.bind(this);

		this.session.on('change', this.onChange);
	}

	detach(session?: any) {
		if (!this.session)
			return;
		this.session.removeListener('change', this.onChange!);
		this.session = undefined;
	}

	/**
	 * @param {Delta} delta
	 */
	$onChange(delta: Delta) {
		var start = delta.start;
		var end = delta.end;
		var startRow = start.row;
		var endRow = end.row;
		var ranges = this.ranges;
		for (var i = 0, n = ranges.length; i < n; i++) {
			var r = ranges[i];
			if (r.end.row >= startRow)
				break;
		}
		
		if (delta.action == "insert") {
			var lineDif = endRow - startRow;
			var colDiff = -start.column + end.column;
			for (; i < n; i++) {
				var r = ranges[i];
				if (r.start.row > startRow)
					break;
	
				if (r.start.row == startRow && r.start.column >= start.column) {
					if (r.start.column == start.column && this.$bias <= 0) {
						// do nothing
					} else {
						r.start.column += colDiff;
						r.start.row += lineDif;
					}
				}
				if (r.end.row == startRow && r.end.column >= start.column) {
					if (r.end.column == start.column && this.$bias < 0) {
						continue;
					}
					// special handling for the case when two ranges share an edge
					if (r.end.column == start.column && colDiff > 0 && i < n - 1) {
						if (r.end.column > r.start.column && r.end.column == ranges[i+1].start.column)
							r.end.column -= colDiff;
					}
					r.end.column += colDiff;
					r.end.row += lineDif;
				}
			}
		} else {
			var lineDif = startRow - endRow;
			var colDiff = start.column - end.column;
			for (; i < n; i++) {
				var r = ranges[i];
				
				if (r.start.row > endRow)
					break;
					
				if (r.end.row < endRow
					&& (
						startRow < r.end.row 
						|| startRow == r.end.row && start.column < r.end.column
					)
				) {
					r.end.row = startRow;
					r.end.column = start.column;
				}
				else if (r.end.row == endRow) {
					if (r.end.column <= end.column) {
						if (lineDif || r.end.column > start.column) {
							r.end.column = start.column;
							r.end.row = start.row;
						}
					}
					else {
						r.end.column += colDiff;
						r.end.row += lineDif;
					}
				}
				else if (r.end.row > endRow) {
					r.end.row += lineDif;
				}
				
				if (r.start.row < endRow
					&& (
						startRow < r.start.row 
						|| startRow == r.start.row && start.column < r.start.column
					)
				) {
					r.start.row = startRow;
					r.start.column = start.column;
				}
				else if (r.start.row == endRow) {
					if (r.start.column <= end.column) {
						if (lineDif || r.start.column > start.column) {
							r.start.column = start.column;
							r.start.row = start.row;
						}
					}
					else {
						r.start.column += colDiff;
						r.start.row += lineDif;
					}
				}
				else if (r.start.row > endRow) {
					r.start.row += lineDif;
				}
			}
		}

		if (lineDif != 0 && i < n) {
			for (; i < n; i++) {
				var r = ranges[i];
				r.start.row += lineDif;
				r.end.row += lineDif;
			}
		}
	}

}

