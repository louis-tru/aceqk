
import * as event from "../lib/event";
import * as useragent from "../lib/env";
import type {MouseEvent} from "./mouse_event";
import type { Point, Range } from "../range";
import type { MouseEvent as UIMouseEvent } from "quark/event";

// mouse
function isSamePoint(p1: Partial<Point> = {}, p2: Partial<Point> = {}) {
	return p1.row == p2.row && p1.column == p2.column;
}

export function onMouseDown(e: MouseEvent) {
	var ev = e.domEvent;
	var alt = ev.alt;
	var shift = ev.shift;
	var ctrl = ev.ctrl;
	var accel = e.getAccelKey();
	var button = e.getButton();
	
	// if (ctrl && useragent.isMac)
	// 	button = e.button;

	if (e.editor.inMultiSelectMode && button == 2) {
		e.editor.textInput.onContextMenu(e.domEvent);
		return;
	}
	
	if (!ctrl && !alt && !accel) {
		if (button === 0 && e.editor.inMultiSelectMode)
			e.editor.exitMultiSelectMode();
		return;
	}
	
	if (button !== 0)
		return;

	var editor = e.editor;
	var selection = editor.selection;
	var isMultiSelect = editor.inMultiSelectMode;
	var pos = e.getDocumentPosition();
	var cursor = selection.getCursor();
	var inSelection = e.inSelection() || (selection.isEmpty() && isSamePoint(pos, cursor));

	var mouseX = e.x, mouseY = e.y;
	var onMouseSelection = function(e: UIMouseEvent) {
		mouseX = e.position.x;
		mouseY = e.position.y;
	};
	
	var session = editor.session;
	var screenAnchor: Point = editor.renderer.pixelToScreenCoordinates(mouseX, mouseY);
	var screenCursor = screenAnchor;
	
	var selectionMode;
	if (editor.$mouseHandler.$enableJumpToDef) {
		if (ctrl && alt || accel && alt)
			selectionMode = shift ? "block" : "add";
		else if (alt && editor.$blockSelectEnabled)
			selectionMode = "block";
	} else {
		if (accel && !alt) {
			selectionMode = "add";
			if (!isMultiSelect && shift)
				return;
		} else if (alt && editor.$blockSelectEnabled) {
			selectionMode = "block";
		}
	}
	
	if (selectionMode && useragent.isMac && ev.ctrl) {
		editor.$mouseHandler.cancelContextMenu();
	}

	if (selectionMode == "add") {
		if (!isMultiSelect && inSelection)
			return; // dragging

		if (!isMultiSelect) {
			var range = selection.toOrientedRange();
			editor.addSelectionMarker(range);
		}

		var oldRange = selection.rangeList!.rangeAtPoint(pos);
		
		editor.inVirtualSelectionMode = true;

		if (shift) {
			oldRange = void 0;
			range = selection.ranges![0] || range!;
			editor.removeSelectionMarker(range);
		}
		editor.once("mouseup", function() {
			var tmpSel = selection.toOrientedRange();

			if (oldRange && tmpSel.isEmpty() && isSamePoint(oldRange.cursor, tmpSel.cursor))
				selection.substractPoint(tmpSel.cursor!);
			else {
				if (shift) {
					selection.substractPoint(range.cursor!);
				} else if (range) {
					editor.removeSelectionMarker(range);
					selection.addRange(range);
				}
				selection.addRange(tmpSel);
			}
			editor.inVirtualSelectionMode = false;
		});

	} else if (selectionMode == "block") {
		e.stop();
		editor.inVirtualSelectionMode = true;
		var initialRange: Range | null = null;
		var rectSel: Range[] = [];
		var blockSelect = function() {
			var newCursor = editor.renderer.pixelToScreenCoordinates(mouseX, mouseY);
			var cursor = session.screenToDocumentPosition(newCursor.row, newCursor.column, newCursor.offsetX);

			if (isSamePoint(screenCursor, newCursor) && isSamePoint(cursor, selection.lead))
				return;
			screenCursor = newCursor;
			
			editor.selection.moveToPosition(cursor);
			editor.renderer.scrollCursorIntoView();

			editor.removeSelectionMarkers(rectSel);
			rectSel = selection.rectangularRangeBlock(screenCursor, screenAnchor);
			if (editor.$mouseHandler.$clickSelection && rectSel.length == 1 && rectSel[0].isEmpty())
				rectSel[0] = editor.$mouseHandler.$clickSelection.clone();
			rectSel.forEach(editor.addSelectionMarker, editor);
			editor.updateSelectionMarkers();
		};
		if (isMultiSelect && !accel) {
			selection.toSingleRange();
		} else if (!isMultiSelect && accel) {
			initialRange = selection.toOrientedRange();
			editor.addSelectionMarker(initialRange);
		}
		
		if (shift)
			screenAnchor = session.documentToScreenPosition(selection.lead);
		else
			selection.moveToPosition(pos);
		
		screenCursor = {row: -1, column: -1};

		var onMouseSelectionEnd = function(e: UIMouseEvent) {
			blockSelect();
			clearInterval(timerId);
			editor.removeSelectionMarkers(rectSel);
			if (!rectSel.length)
				rectSel = [selection.toOrientedRange()];
			if (initialRange) {
				editor.removeSelectionMarker(initialRange);
				selection.toSingleRange(initialRange);
			}
			for (var i = 0; i < rectSel.length; i++)
				selection.addRange(rectSel[i]);
			editor.inVirtualSelectionMode = false;
			editor.$mouseHandler.$clickSelection = void 0;
		};

		var onSelectionInterval = blockSelect;

		event.capture(editor.container, onMouseSelection, onMouseSelectionEnd);
		var timerId = setInterval(function() {onSelectionInterval();}, 20);

		return e.preventDefault();
	}
}

