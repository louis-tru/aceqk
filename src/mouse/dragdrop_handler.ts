"use strict";

import type { MouseHandler } from "./mouse_handler";
import * as dom from "../lib/dom";
import * as event from "../lib/event";
import * as useragent from "../lib/env";
import { Text } from "quark";
import type { MouseEvent } from "./mouse_event";
import type { Point } from "../range";
import type { MouseEvent as UIMouseEvent } from "quark/event";
import {CursorStyle} from "quark/types";

const AUTOSCROLL_DELAY = 200;
const SCROLL_CURSOR_DELAY = 200;
const SCROLL_CURSOR_HYSTERESIS = 5;

type DragEvent = any;

export interface DragdropHandlerExtension {
	dragWait(): void;
	dragWaitEnd(): void;
	startDrag(): void;
	dragReadyEnd(e: MouseEvent): void;
	onMouseDrag(e: MouseEvent): void;
}

export interface DragdropHandler extends MouseHandler {}

export class DragdropHandler {

	constructor(mouseHandler: MouseHandler) {
		var editor = mouseHandler.editor;

		// var dragImage = dom.createElement("div");
		var dragImage = new Text(editor.window);
		dragImage.style = {
			marginTop:-100,
			// position:absolute;
			zIndex:2147483647,
			opacity:0.5
		}
		dragImage.value = "\xa0";

		mouseHandler.dragWait = this.dragWait;
		mouseHandler.dragWaitEnd = this.dragWaitEnd;
		mouseHandler.startDrag = this.startDrag;
		mouseHandler.dragReadyEnd = this.dragReadyEnd;
		mouseHandler.onMouseDrag = this.onMouseDrag;

		//// @ts-ignore
		editor.on("mousedown", this.onMouseDown.bind(mouseHandler));

		var mouseTarget = editor.container;
		var dragSelectionMarker: any, x: number, y: number;
		var timerId: any, range: any;
		var dragCursor: any, counter = 0;
		var dragOperation: string | null;
		var isInternal: boolean;
		var autoScrollStartTime: number | null;
		var cursorMovedTime: number | null;
		var cursorPointOnCaretMoved: {x: number, y: number};

		/**
		 * @param e
		 * @this {MouseHandler}
		 * @return {*}
		 */
		function onDragStart(this: MouseHandler, e: DragEvent) {
			// webkit workaround, see this.onMouseDown
			if (this.cancelDrag || !mouseTarget.getAttribute("draggable")) {
				var self = this;
				setTimeout(function(){
					self.startSelect!();
					self.captureMouse(e);
				}, 0);
				return e.preventDefault();
			}
			range = editor.getSelectionRange();

			var dataTransfer = e.dataTransfer;
			dataTransfer.effectAllowed = editor.getReadOnly() ? "copy" : "copyMove";
			editor.container.append(dragImage);

			dataTransfer.setDragImage && dataTransfer.setDragImage(dragImage, 0, 0);
			setTimeout(function() {
				dragImage.remove();
			});
			// clear Opera garbage
			dataTransfer.clearData();
			dataTransfer.setData("Text", editor.session.getTextRange());

			isInternal = true;
			this.setState("drag");
		};
		/**
		 * @param e
		 * @this {MouseHandler}
		 * @return {*}
		 */
		function onDragEnd(this: MouseHandler, e: DragEvent) {
			mouseTarget.setAttribute("draggable", false);
			isInternal = false;
			this.setState("");
			if (!editor.getReadOnly()) {
				var dropEffect = e.dataTransfer.dropEffect;
				if (!dragOperation && dropEffect == "move")
					// text was dragged outside the editor
					editor.session.remove(editor.getSelectionRange());
				editor.$resetCursorStyle();
			}
			this.editor.unsetStyle("ace_dragging");
			this.editor.renderer.setCursorStyle(CursorStyle.Normal);
		};
		/**
		 * @param e
		 * @this {MouseHandler}
		 * @return {*}
		 */
		function onDragEnter(e: DragEvent) {
			if (editor.getReadOnly() || !canAccept(e.dataTransfer))
				return;
			x = e.clientX;
			y = e.clientY;
			if (!dragSelectionMarker)
				addDragMarker();
			counter++;
			// dataTransfer object does not save dropEffect across events on IE, so we store it in dragOperation
			e.dataTransfer.dropEffect = dragOperation = getDropEffect(e);
			return event.preventDefault(e);
		};
		/**
		 * @param e
		 * @this {MouseHandler}
		 * @return {*}
		 */
		function onDragOver(e: DragEvent) {
			if (editor.getReadOnly() || !canAccept(e.dataTransfer))
				return;
			x = e.clientX;
			y = e.clientY;
			// Opera doesn't trigger dragenter event on drag start
			if (!dragSelectionMarker) {
				addDragMarker();
				counter++;
			}
			if (onMouseMoveTimer !== null)
				onMouseMoveTimer = null;

			e.dataTransfer.dropEffect = dragOperation = getDropEffect(e);
			return event.preventDefault(e);
		};

		function onDragLeave(e: DragEvent) {
			counter--;
			if (counter <= 0 && dragSelectionMarker) {
				clearDragMarker();
				dragOperation = null;
				return event.preventDefault(e);
			}
		};
		/**
		 * @param e
		 * @this {MouseHandler}
		 * @return {*}
		 */
		function onDrop(e: DragEvent) {
			if (!dragCursor)
				return;
			var dataTransfer = e.dataTransfer;
			if (isInternal) {
				switch (dragOperation) {
					case "move":
						if (range.contains(dragCursor.row, dragCursor.column)) {
							// clear selection
							range = {
								start: dragCursor,
								end: dragCursor
							};
						} else {
							// move text
							range = editor.moveText(range, dragCursor);
						}
						break;
					case "copy":
						// copy text
						range = editor.moveText(range, dragCursor, true);
						break;
				}
			} else {
				var dropData = dataTransfer.getData('Text');
				range = {
					start: dragCursor,
					end: editor.session.insert(dragCursor, dropData)
				};
				editor.focus();
				dragOperation = null;
			}
			clearDragMarker();
			return event.preventDefault(e);
		};

		// event.addListener(mouseTarget, "dragstart", onDragStart.bind(mouseHandler), editor);
		// event.addListener(mouseTarget, "dragend", onDragEnd.bind(mouseHandler), editor);
		// event.addListener(mouseTarget, "dragenter", onDragEnter.bind(mouseHandler), editor);
		// event.addListener(mouseTarget, "dragover", onDragOver.bind(mouseHandler), editor);
		// event.addListener(mouseTarget, "dragleave", onDragLeave.bind(mouseHandler), editor);
		// event.addListener(mouseTarget, "drop", onDrop.bind(mouseHandler), editor);

		function scrollCursorIntoView(cursor: Point, prevCursor: Point) {
			var now = Date.now();
			var vMovement = !prevCursor || cursor.row != prevCursor.row;
			var hMovement = !prevCursor || cursor.column != prevCursor.column;
			if (!cursorMovedTime || vMovement || hMovement) {
				editor.moveCursorToPosition(cursor);
				cursorMovedTime = now;
				cursorPointOnCaretMoved = {x: x, y: y};
			} else {
				var distance = calcDistance(cursorPointOnCaretMoved.x, cursorPointOnCaretMoved.y, x, y);
				if (distance > SCROLL_CURSOR_HYSTERESIS) {
					cursorMovedTime = null;
				} else if (now - cursorMovedTime >= SCROLL_CURSOR_DELAY) {
					editor.renderer.scrollCursorIntoView();
					cursorMovedTime = null;
				}
			}
		}

		function autoScroll(cursor: Point, prevCursor: Point) {
			var now = Date.now();
			var lineHeight = editor.renderer.layerConfig.lineHeight;
			var characterWidth = editor.renderer.layerConfig.characterWidth;
			var pos = editor.renderer.scroller.position;
			var size = editor.renderer.scroller.clientSize;
			var editorRect = {
				top: pos.y,
				bottom: pos.y + size.height,
				left: pos.x,
				right: pos.x + size.width
			}
			var offsets = {
				x: {
					left: x - editorRect.left,
					right: editorRect.right - x
				},
				y: {
					top: y - editorRect.top,
					bottom: editorRect.bottom - y
				}
			};
			var nearestXOffset = Math.min(offsets.x.left, offsets.x.right);
			var nearestYOffset = Math.min(offsets.y.top, offsets.y.bottom);
			var scrollCursor = {row: cursor.row, column: cursor.column};
			if (nearestXOffset / characterWidth <= 2) {
				scrollCursor.column += (offsets.x.left < offsets.x.right ? -3 : +2);
			}
			if (nearestYOffset / lineHeight <= 1) {
				scrollCursor.row += (offsets.y.top < offsets.y.bottom ? -1 : +1);
			}
			var vScroll = cursor.row != scrollCursor.row;
			var hScroll = cursor.column != scrollCursor.column;
			var vMovement = !prevCursor || cursor.row != prevCursor.row;
			if (vScroll || (hScroll && !vMovement)) {
				if (!autoScrollStartTime)
					autoScrollStartTime = now;
				else if (now - autoScrollStartTime >= AUTOSCROLL_DELAY)
					editor.renderer.scrollCursorIntoView(scrollCursor);
			} else {
				autoScrollStartTime = null;
			}
		}

		function onDragInterval() {
			var prevCursor = dragCursor;
			dragCursor = editor.renderer.screenToTextCoordinates(x, y);
			scrollCursorIntoView(dragCursor, prevCursor);
			autoScroll(dragCursor, prevCursor);
		}

		function addDragMarker() {
			range = editor.selection.toOrientedRange();
			dragSelectionMarker = editor.session.addMarker(range, "ace_selection", editor.getSelectionStyle());
			editor.clearSelection();
			if (editor.isFocused())
				editor.renderer.$cursorLayer.setBlinking(false);
			clearInterval(timerId);
			onDragInterval();
			timerId = setInterval(onDragInterval, 20);
			counter = 0;
			event.addListener(editor.window.root, "MouseMove", onMouseMove);
		}

		function clearDragMarker() {
			clearInterval(timerId);
			editor.session.removeMarker(dragSelectionMarker);
			dragSelectionMarker = null;
			editor.selection.fromOrientedRange(range);
			if (editor.isFocused() && !isInternal)
				editor.$resetCursorStyle();
			range = null;
			dragCursor = null;
			counter = 0;
			autoScrollStartTime = null;
			cursorMovedTime = null;
			event.removeListener(editor.window.root, "MouseMove", onMouseMove);
		}

		// sometimes other code on the page can stop dragleave event leaving editor stuck in the drag state
		var onMouseMoveTimer: TimeoutResult;
		function onMouseMove() {
			if (onMouseMoveTimer == null) {
				onMouseMoveTimer = setTimeout(function() {
					if (onMouseMoveTimer != null && dragSelectionMarker)
						clearDragMarker();
				}, 20);
			}
		}

		function canAccept(dataTransfer: {types?: string[]}) {
			var types = dataTransfer.types;
			return !types || Array.prototype.some.call(types, function(type) {
				return type == 'text/plain' || type == 'Text';
			});
		}

		function getDropEffect(e: UIMouseEvent & {dataTransfer?: {effectAllowed: string}}) {
			var copyAllowed = ['copy', 'copymove', 'all', 'uninitialized'];
			var moveAllowed = ['move', 'copymove', 'linkmove', 'all', 'uninitialized'];

			var copyModifierState = useragent.isMac ? e.alt : e.ctrl;

			// IE throws error while dragging from another app
			var effectAllowed = "uninitialized";
			// try {
			if (e.dataTransfer && e.dataTransfer.effectAllowed)
				effectAllowed = e.dataTransfer.effectAllowed.toLowerCase();
			// } catch (e) {}
			var dropEffect = "none";

			if (copyModifierState && copyAllowed.indexOf(effectAllowed) >= 0)
				dropEffect = "copy";
			else if (moveAllowed.indexOf(effectAllowed) >= 0)
				dropEffect = "move";
			else if (copyAllowed.indexOf(effectAllowed) >= 0)
				dropEffect = "copy";

			return dropEffect;
		}
	}

	/**
	 * @this {MouseHandler & this}
	 */
	dragWait() {
		var interval = Date.now() - this.mousedownEvent!.time;
		if (interval > this.editor.getDragDelay())
			this.startDrag();
	}

	/**
	 * @this {MouseHandler & this}
	 */
	dragWaitEnd() {
		var target = this.editor.container;
		// target.draggable = false;
		target.setAttribute("draggable", false);
		this.startSelect!(this.mousedownEvent!.getDocumentPosition());
		this.selectEnd!();
	}

	/**
	 * @this {MouseHandler & this}
	 */
	dragReadyEnd(e: DragEvent) {
		this.editor.$resetCursorStyle();
		this.editor.unsetStyle("ace_dragging");
		this.editor.renderer.setCursorStyle(CursorStyle.Normal);
		this.dragWaitEnd();
	}

	/**
	 * @this {MouseHandler & this}
	 */
	startDrag() {
		this.cancelDrag = false;
		var editor = this.editor;
		var target = editor.container;
		// target.draggable = true;
		target.setAttribute("draggable", true);
		editor.renderer.$cursorLayer.setBlinking(false);
		editor.setStyle("ace_dragging");
		// var cursorStyle = useragent.isWin ? "default" : "move";
		editor.renderer.setCursorStyle(CursorStyle.OpenHand);
		this.setState("dragReady");
	}

	/**
	 * @this {MouseHandler & this}
	 */
	onMouseDrag(e: DragEvent) {
		var target = this.editor.container;
		if (/*useragent.isIE && */this.state == "dragReady") {
			// IE does not handle [draggable] attribute set after mousedown
			var distance = calcDistance(this.mousedownEvent!.x, this.mousedownEvent!.y, this.x, this.y);
			if (distance > 3)
				// @ts-ignore
				target.dragDrop();
		}
		if (this.state === "dragWait") {
			var distance = calcDistance(this.mousedownEvent!.x, this.mousedownEvent!.y, this.x, this.y);
			if (distance > 0) {
				// target.draggable = false;
				this.startSelect!(this.mousedownEvent!.getDocumentPosition());
			}
		}
	}

	/**
	 * @this {MouseHandler & this}
	 */
	onMouseDown(e: MouseEvent) {
		if (!this.$dragEnabled)
			return;
		this.mousedownEvent = e;
		var editor = this.editor;

		var inSelection = e.inSelection();
		var button = e.getButton();
		var clickCount = e.detail || 1;
		if (clickCount === 1 && button === 0 && inSelection) {
			if (e.editor.inMultiSelectMode && (e.getAccelKey() || e.getShiftKey()))
				return;
			this.mousedownEvent.time = Date.now();
			var eventTarget = e.domEvent.origin;
			if ("unselectable" in eventTarget)
				eventTarget.unselectable = "on";
			if (editor.getDragDelay()) {
				// https://code.google.com/p/chromium/issues/detail?id=286700
				// if (useragent.isWebKit) {
				// 	this.cancelDrag = true;
				// 	var mouseTarget = editor.container;
				// 	mouseTarget.setAttribute("draggable", true);
				// }
				this.setState("dragWait");
			} else {
				this.startDrag();
			}
			this.captureMouse(e, this.onMouseDrag.bind(this));
			// TODO: a better way to prevent default handler without preventing browser default action
			e.defaultPrevented = true;
		}
	}
}

function calcDistance(ax: number, ay: number, bx: number, by: number) {
	return Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
}
