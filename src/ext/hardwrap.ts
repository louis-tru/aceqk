/**
 * ## Text hard wrapping extension for automatic line breaking and text formatting.
 *
 * Provides intelligent line wrapping functionality that breaks long lines at configurable column limits while
 * preserving indentation and optionally merging short adjacent lines. Supports both automatic wrapping during text
 * input and manual formatting of selected text ranges.
 *
 * **Enable:** `editor.setOption("hardWrap", true)`
 * or configure it during editor initialization in the options object.
 * @module
 */

"use strict";

import {Range} from "../range";
import {Editor} from "../editor";
import config from "../config";

export interface HardWrapOptions {
	/** First row of the range to process */
	startRow: number;
	/** Last row of the range to process */
	endRow: number;
	/** Whether to merge short adjacent lines that fit within the limit */
	allowMerge?: boolean;
	/** Maximum column width for line wrapping (defaults to editor's print margin) */
	column?: number;
}

/**
 * Wraps lines at specified column limits and optionally merges short adjacent lines.
 *
 * Processes text within the specified row range, breaking lines that exceed the maximum column
 * width at appropriate word boundaries while preserving indentation. When merge is enabled,
 * combines short consecutive lines that can fit within the column limit. Automatically adjusts
 * the end row when new line breaks are inserted to ensure all affected content is processed.
 *
 * @param {Editor} editor - The editor instance containing the text to wrap
 * @param {HardWrapOptions} options - Configuration options for wrapping behavior
 */

function hardWrap(editor: Editor, options: HardWrapOptions) {
	var max = options.column || editor.getOption("printMarginColumn");
	var allowMerge = options.allowMerge != false;
	   
	var row = Math.min(options.startRow, options.endRow);
	var endRow = Math.max(options.startRow, options.endRow);
	
	var session = editor.session;
	
	while (row <= endRow) {
		var line = session.getLine(row);
		if (line.length > max) {
			var space = findSpace(line, max, 5);
			if (space) {
				var indentation = /^\s*/.exec(line)![0];
				session.replace(new Range(row,space.start,row,space.end), "\n" + indentation);
			}
			endRow++;
		} else if (allowMerge && /\S/.test(line) && row != endRow) {
			var nextLine = session.getLine(row + 1);
			if (nextLine && /\S/.test(nextLine)) {
				var trimmedLine = line.replace(/\s+$/, "");
				var trimmedNextLine = nextLine.replace(/^\s+/, "");
				var mergedLine = trimmedLine + " " + trimmedNextLine;

				var space = findSpace(mergedLine, max, 5);
				if (space && space.start > trimmedLine.length || mergedLine.length < max) {
					var replaceRange = new Range(row,trimmedLine.length,row + 1,nextLine.length - trimmedNextLine.length);
					session.replace(replaceRange, " ");
					row--;
					endRow--;
				} else if (trimmedLine.length < line.length) {
					session.remove(new Range(row, trimmedLine.length, row, line.length));
				}
			}
		}
		row++;
	}

	/**
	 * @param {string} line
	 * @param {number} max
	 * @param {number} min
	 */
	function findSpace(line: string, max: number, min: number) {
		if (line.length < max)
			return;
		var before = line.slice(0, max);
		var after = line.slice(max);
		var spaceAfter = /^(?:(\s+)|(\S+)(\s+))/.exec(after);
		var spaceBefore = /(?:(\s+)|(\s+)(\S+))$/.exec(before);
		var start = 0;
		var end = 0;
		if (spaceBefore && !spaceBefore[2]) {
			start = max - spaceBefore[1].length;
			end = max;
		}
		if (spaceAfter && !spaceAfter[2]) {
			if (!start)
				start = max;
			end = max + spaceAfter[1].length;
		}
		if (start) {
			return {
				start: start,
				end: end
			};
		}
		if (spaceBefore && spaceBefore[2] && spaceBefore.index > min) {
			return {
				start: spaceBefore.index,
				end: spaceBefore.index + spaceBefore[2].length
			};
		}
		if (spaceAfter && spaceAfter[2]) {
			start =  max + spaceAfter[2].length;
			return {
				start: start,
				end: start + spaceAfter[3].length
			};
		}
	}

}

function wrapAfterInput(e: {command: {name: string}, args: string, editor: Editor}) {
	if (e.command.name == "insertstring" && /\S/.test(e.args)) {
		var editor = e.editor;
		var cursor = editor.selection.cursor;
		if (cursor.column <= editor.renderer.$printMarginColumn!) return;
		var lastDelta = editor.session.$undoManager!.$lastDelta;

		hardWrap(editor, {
			startRow: cursor.row, endRow: cursor.row,
			allowMerge: false
		});
		if (lastDelta != editor.session.$undoManager!.$lastDelta) 
			editor.session.markUndoGroup();
	}
}

export interface HardWrapOptionsEditorExtension {
	hardWrap?: number;
}

config.defineOptions(Editor.prototype, "editor", {
	hardWrap: {
		set: function(val: boolean) {
			if (val) {
				this.commands.on("afterExec", wrapAfterInput);
			} else {
				this.commands.off("afterExec", wrapAfterInput);
			}
		},
		value: false
	}
});

exports.hardWrap = hardWrap;
