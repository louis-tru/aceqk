"use strict";

import type {Point,Delta} from "./range";

function throwDeltaError(delta: Delta, errorText: string) {
	console.log("Invalid Delta:", delta);
	throw "Invalid Delta: " + errorText;
}

function positionInDocument(docLines: string[], position: Point) {
	return position.row    >= 0 && position.row    <  docLines.length &&
			position.column >= 0 && position.column <= docLines[position.row].length;
}

function validateDelta(docLines: string[], delta: Delta) {
	// Validate action string.
	if (delta.action != "insert" && delta.action != "remove")
		throwDeltaError(delta, "delta.action must be 'insert' or 'remove'");
	
	// Validate lines type.
	if (!(delta.lines instanceof Array))
		throwDeltaError(delta, "delta.lines must be an Array");

	// Validate range type.
	if (!delta.start || !delta.end)
	   throwDeltaError(delta, "delta.start/end must be an present");

	// Validate that the start point is contained in the document.
	var start = delta.start;
	if (!positionInDocument(docLines, delta.start))
		throwDeltaError(delta, "delta.start must be contained in document");
	
	// Validate that the end point is contained in the document (remove deltas only).
	var end = delta.end;
	if (delta.action == "remove" && !positionInDocument(docLines, end))
		throwDeltaError(delta, "delta.end must contained in document for 'remove' actions");
	
	// Validate that the .range size matches the .lines size.
	var numRangeRows = end.row - start.row;
	var numRangeLastLineChars = (end.column - (numRangeRows == 0 ? start.column : 0));
	if (numRangeRows != delta.lines.length - 1 || delta.lines[numRangeRows].length != numRangeLastLineChars)
		throwDeltaError(delta, "delta.range must match delta lines");
}

/**
 * Applies a delta to a document.
 * @param {string[]} docLines
 * @param {import("./range").Delta} delta
 * @param [doNotValidate]
 */
export function applyDelta(docLines: string[], delta: Delta, doNotValidate?: boolean) {
	// disabled validation since it breaks autocompletion popup
	// if (!doNotValidate)
	//    validateDelta(docLines, delta);

	var row = delta.start.row;
	var startColumn = delta.start.column;
	var line = docLines[row] || "";
	switch (delta.action) {
		case "insert":
			var lines = delta.lines;
			if (lines.length === 1) {
				docLines[row] = line.substring(0, startColumn) + delta.lines[0] + line.substring(startColumn);
			} else {
				//// @ts-ignore
				docLines.splice(row, 1, ...delta.lines);
				docLines[row] = line.substring(0, startColumn) + docLines[row];
				docLines[row + delta.lines.length - 1] += line.substring(startColumn);
			}
			break;
		case "remove":
			var endColumn = delta.end.column;
			var endRow = delta.end.row;
			if (row === endRow) {
				docLines[row] = line.substring(0, startColumn) + line.substring(endColumn);
			} else {
				docLines.splice(
					row, endRow - row + 1,
					line.substring(0, startColumn) + docLines[endRow].substring(endColumn)
				);
			}
			break;
	}
};
