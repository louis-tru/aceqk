/**
 * ## Error Marker extension
 *
 * Provides inline error display functionality for Ace editor. Creates visual error markers that appear as tooltips
 * below editor lines containing annotations (errors, warnings, info). Enables navigation between error locations with
 * keyboard shortcuts and displays context-sensitive messages with proper styling based on annotation severity.
 *
 * @module
 */

"use strict";

import * as dom from "../lib/dom";
import {Point, Range} from "../range";
import {nls} from "../config";
import type {EditSession} from "../edit_session";
import type {Annotation} from "../layer/gutter";
import type {Editor} from "../editor";
import {Box,Text, Br} from "quark";

function binarySearch(array: Annotation[], needle: Point, comparator: (a: Point, b: Annotation) => number) {
	var first = 0;
	var last = array.length - 1;

	while (first <= last) {
		var mid = (first + last) >> 1;
		var c = comparator(needle, array[mid]);
		if (c > 0)
			first = mid + 1;
		else if (c < 0)
			last = mid - 1;
		else
			return mid;
	}

	// Return the nearest lesser index, "-1" means "0, "-2" means "1", etc.
	return -(first + 1);
}

/**
 * @param {import("../edit_session").EditSession} session
 * @param {number} row
 * @param {number} dir
 */
function findAnnotations(session: EditSession, row: number, dir: number) {
	var annotations = session.getAnnotations().sort(Range.comparePoints);
	if (!annotations.length)
		return;
	
	var i = binarySearch(annotations, {row: row, column: -1}, Range.comparePoints);
	if (i < 0)
		i = -i - 1;
	
	if (i >= annotations.length)
		i = dir > 0 ? 0 : annotations.length - 1;
	else if (i === 0 && dir < 0)
		i = annotations.length - 1;
	
	var annotation = annotations[i];
	if (!annotation || !dir)
		return;

		if (annotation.row === row) {
		do {
			annotation = annotations[i += dir];
		} while (annotation && annotation.row === row);
		if (!annotation)
			return annotations.slice();
	}
	
	
	var matched: Annotation[] = [];
	row = annotation.row;
	do {
		matched[dir < 0 ? "unshift" : "push"](annotation);
		annotation = annotations[i += dir];
	} while (annotation && annotation.row == row);
	return matched.length && matched;
}

/**
 * Displays an error marker widget in the editor for annotations at the current cursor position.
 *
 * @param {import("../editor").Editor} editor - The Ace editor instance
 * @param {number} dir - The direction of navigation through annotations (-1 or 1)
 */
exports.showErrorMarker = function(editor: Editor, dir: number) {
	var session = editor.session;
	var pos = editor.getCursorPosition();
	var row = pos.row;
	var oldWidget = session.widgetManager.getWidgetsAtRow(row).filter(function(w) {
		return w.type == "errorMarker";
	})[0];
	if (oldWidget) {
		oldWidget.destroy!();
	} else {
		row -= dir;
	}
	var annotations = findAnnotations(session, row, dir);
	var gutterAnno: Annotation;
	if (annotations) {
		var annotation = annotations[0];
		pos.column = ((annotation as any).pos && typeof annotation.column != "number"
			? (annotation as any).pos.sc
			: annotation.column) || 0;
		pos.row = annotation.row;
		gutterAnno = editor.renderer.$gutterLayer.$annotations[pos.row]!;
	} else if (oldWidget) {
		return;
	} else {
		gutterAnno = {
			row: 0, column: 0, text: [], type: [],
			displayText: [nls("error-marker.good-state", "Looks good!")],
			className: "ace_ok"
		};
	}
	editor.session.unfold(pos.row);
	editor.selection.moveToPosition(pos);

	var w = {
		row: pos.row,
		fixedWidth: true,
		coverGutter: true,
		// el: dom.createElement("div"),
		el: new Box(editor.window),
		type: "errorMarker",
		destroy: function() { /* Filled later */ }
	};
	// var el = w.el.appendChild(dom.createElement("div"));
	var el = new Text(editor.window);
	w.el.append(el);
	// var arrow = w.el.appendChild(dom.createElement("div"));
	var arrow = new Box(editor.window);
	w.el.append(arrow);
	arrow.class = ["error_widget_arrow", gutterAnno.className];
	
	var left = editor.renderer.$cursorLayer
		.getPixelPosition(pos).left;
	arrow.style.marginLeft = left + editor.renderer.gutterWidth - 5;
	
	w.el.class = ["error_widget_wrapper"];
	w.el.style.layout = "free";
	el.class = ["error_widget", gutterAnno.className];
	gutterAnno.displayText!.forEach(function (annoTextLine, i) {
		el.append(dom.createTextNode(annoTextLine, editor.window));
		if (i < gutterAnno.displayText!.length - 1) {
			// el.appendChild(dom.createElement("br"));
			el.append(new Br(editor.window));
		}
	});
	
	// el.appendChild(dom.createElement("div"));
	el.append(new Box(editor.window));
	
	var kb = function(_: any, hashId: number, keyString: string) {
		if (hashId === 0 && (keyString === "esc" || keyString === "return")) {
			w.destroy();
			return {command: "null"};
		}
	};

	w.destroy = function() {
		if (editor.$mouseHandler.isMousePressed)
			return;
		// @ts-ignore
		editor.keyBinding.removeKeyboardHandler(kb);
		session.widgetManager.removeLineWidget(w);
		editor.off("changeSelection", w.destroy);
		editor.off("changeSession", w.destroy);
		editor.off("mouseup", w.destroy);
		editor.off("change", w.destroy);
	};

	// @ts-ignore
	editor.keyBinding.addKeyboardHandler(kb);
	editor.on("changeSelection", w.destroy);
	editor.on("changeSession", w.destroy);
	editor.on("mouseup", w.destroy);
	editor.on("change", w.destroy);
	
	editor.session.widgetManager.addLineWidget(w);

	w.el.onMouseDown.on(e=>editor.focus());

	editor.renderer.scrollCursorIntoView(void 0, 0.5, {bottom: w.el.clientSize.height});
};

dom.importCss({
	'.error_widget_wrapper': {
		// background: inherit;
		// color: inherit;
		border: '0 #000',
	},
	'.error_widget': {
		borderTopWidth: 2,
		borderBottomWidth: 2,
		margin: [5,0],
		padding: [10, 40],
		textWhiteSpace: 'preWrap',
	},
	'.error_widget.ace_error, .error_widget_arrow.ace_error': {
		borderColor: '#ff5a5a'
	},
	'.error_widget.ace_warning, .error_widget_arrow.ace_warning': {
		borderColor: '#F1D817'
	},
	'.error_widget.ace_info, .error_widget_arrow.ace_info': {
		borderColor: '#5a5a5a'
	},
	'.error_widget.ace_ok, .error_widget_arrow.ace_ok': {
		borderColor: '#5aaa5a'
	},
	'.error_widget_arrow': {
		// position: absolute;
		borderWidth: 5,
		// border-top-color: transparent!important;
		// border-right-color: transparent!important;
		// border-left-color: transparent!important;
		borderTopColor: '#0000',
		borderRightColor: '#0000',
		borderLeftColor: '#0000',
		marginTop: -5,
	}
}, "error_marker.css", false);
