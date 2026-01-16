"use strict";

import * as event from "../lib/event";
import * as useragent from "../lib/env";
import {DefaultHandlers,DefaultHandlersExtension} from "./default_handlers";
import {GutterHandler as DefaultGutterHandler} from "./default_gutter_handler";
import {DragdropHandler,DragdropHandlerExtension} from "./dragdrop_handler";
import {MouseEvent} from "./mouse_event";
import type {ClickEvent, MouseEvent as UIMouseEvent} from "quark/event";
import {addTouchListeners} from "./touch_handler";
import config from "../config";
import type {Editor} from "../editor";
import type {Range} from "../range";
import type {GutterTooltip} from "./default_gutter_handler";
import { CursorStyle } from "quark/types";
import type {OptionsProvider} from "../lib/app_config";

export interface MouseHandlerOptions {
	scrollSpeed: number;
	dragDelay: number;
	dragEnabled: boolean;
	focusTimeout: number;
	enableJumpToDef: boolean;
}

export interface MouseHandler extends
		OptionsProvider<MouseHandlerOptions>,
		Partial<DefaultHandlersExtension>,
		Partial<DragdropHandlerExtension>
{
	cancelDrag?: boolean
	$clickSelection?: Range, // from DefaultHandlers
	mousedownEvent?: MouseEvent,
	$lastScroll?: { t: number, vx: number, vy: number, allowed: number }
	dragDropHandler?: DragdropHandler;
	$tooltip?: GutterTooltip
}

export class MouseHandler {
	private $scrollSpeed: number; // options
	private $dragDelay: boolean; // options
	public $dragEnabled: boolean; // options
	public $focusTimeout: number; // options
	public $enableJumpToDef?: boolean; // options
	private $mouseMoved: boolean;
	private mouseEvent: MouseEvent;
	public editor: Editor;
	public state: string = "";
	public isMousePressed: boolean = false;
	public x: number = 0;
	public y: number = 0;

	/**
	 * @param {Editor} editor
	 */
	constructor(editor: Editor) {
		var _self = this;
		this.editor = editor;

		new DefaultHandlers(this);
		new DefaultGutterHandler(this);
		new DragdropHandler(this);

		var focusEditor = function(e?: any) {
			// because we have to call event.preventDefault() any window on ie and iframes
			// on other browsers do not get focus, so we have to call window.focus() here
			var windowBlurred = // !document.hasFocus || !document.hasFocus() ||
				!editor.isFocused() && _self.editor.window.activeView == (editor.textInput && editor.textInput.getElement());
			if (windowBlurred)
				editor.window.root.focus();
			editor.focus();
			// Without this editor is blurred after double click
			setTimeout(function () {
				if (!editor.isFocused()) editor.focus();
			});
		};

		var mouseTarget = editor.renderer.getMouseEventTarget();
		event.addListener(mouseTarget, "Click", this.onMouseEvent.bind(this, "click"), editor);
		event.addListener(mouseTarget, "MouseMove", this.onMouseMove.bind(this, "mousemove"), editor);
		event.addMultiMouseDownListener([
			mouseTarget,
			editor.renderer.scrollBarV && editor.renderer.scrollBarV.inner,
			editor.renderer.scrollBarH && editor.renderer.scrollBarH.inner,
			editor.textInput && editor.textInput.getElement()
		].filter(Boolean), [400, 300, 250], this.onMouseEvent.bind(this), editor);
		event.addMouseWheelListener(editor.container, this.onMouseWheel.bind(this, "mousewheel"), editor);

		addTouchListeners(editor.container, editor);

		var gutterEl = editor.renderer.$gutter;
		event.addListener(gutterEl, "MouseDown", this.onMouseEvent.bind(this, "guttermousedown"), editor);
		event.addListener(gutterEl, "Click", this.onMouseEvent.bind(this, "gutterclick"), editor);
		event.addListener(gutterEl, "MultiClick", this.onMouseEvent.bind(this, "gutterdblclick"), editor);
		event.addListener(gutterEl, "MouseMove", this.onMouseEvent.bind(this, "guttermousemove"), editor);

		event.addListener(mouseTarget, "MouseDown", focusEditor, editor);
		event.addListener(gutterEl, "MouseDown", focusEditor, editor);

		// if (useragent.isIE && editor.renderer.scrollBarV) {
		// 	event.addListener(editor.renderer.scrollBarV.element, "MouseDown", focusEditor, editor);
		// 	event.addListener(editor.renderer.scrollBarH.element, "MouseDown", focusEditor, editor);
		// }

		editor.on("mousemove", function(e){
			if (_self.state || _self.$dragDelay || !_self.$dragEnabled)
				return;
			var character = editor.renderer.screenToTextCoordinates(e.x, e.y);
			var range = editor.session.selection.getRange();
			var renderer = editor.renderer;

			if (!range.isEmpty() && range.insideStart(character.row, character.column)) {
				renderer.setCursorStyle(CursorStyle.Default);
			} else {
				renderer.setCursorStyle(CursorStyle.Normal);
			}
		}, true);
	}

	onMouseEvent(name: string, e: UIMouseEvent | ClickEvent) {
		if (!this.editor.session)
			return;
		this.editor._emit(name as any, new MouseEvent(e, this.editor), this.editor);
	}

	onMouseMove(name: string, e: UIMouseEvent) {
		// optimization, because mousemove doesn't have a default handler.
		var listeners = this.editor._eventRegistry && this.editor._eventRegistry.mousemove;
		if (!listeners || !listeners.length)
			return;

		this.editor._emit(name as any, new MouseEvent(e, this.editor), this.editor);
	}

	/**
	 * @param {any} name
	 * @param {{ wheelX: number; wheelY: number; }} e
	 */
	onMouseWheel(name: string, e: UIMouseEvent) {
		var mouseEvent = new MouseEvent(e, this.editor);
		////@ts-expect-error TODO: couldn't find this property init in the ace codebase
		mouseEvent.speed = this.$scrollSpeed * 2;
		mouseEvent.wheelX = e.delta.x;
		mouseEvent.wheelY = e.delta.y;

		this.editor._emit(name as any, mouseEvent, this.editor);
	}

	setState(state: string) {
		this.state = state;
	}

	private releaseMouse?: (e: UIMouseEvent) => void;
	private $onCaptureMouseMove?: (e: UIMouseEvent) => void;

	/**
	 * @param {UIMouseEvent} ev
	 * @param [mouseMoveHandler]
	 * @return {ReturnType<typeof setTimeout> | undefined}
	 */
	captureMouse(ev: MouseEvent, mouseMoveHandler?: (e: UIMouseEvent) => void) {
		this.x = ev.x;
		this.y = ev.y;

		this.isMousePressed = true;

		// do not move textarea during selection
		var editor = this.editor;
		var renderer = this.editor.renderer;
		renderer.$isMousePressed = true;

		var self = this;
		var continueCapture = true;

		var onMouseMove = function(e: UIMouseEvent) {
			if (!e) return;
			// if editor is loaded inside iframe, and mouseup event is outside
			// we won't recieve it, so we cancel on first mousemove without button
			// if (useragent.isWebKit && !e.which && self.releaseMouse)
			// 	return self.releaseMouse();

			self.x = e.position.x;
			self.y = e.position.y;
			mouseMoveHandler && mouseMoveHandler(e);
			self.mouseEvent = new MouseEvent(e, self.editor);
			self.$mouseMoved = true;
		};

		var onCaptureEnd = function(e: UIMouseEvent) {
			editor.off("beforeEndOperation", onOperationEnd);
			continueCapture = false;
			if (editor.session) onCaptureUpdate();
			(self as any)[self.state + "End"] && (self as any)[self.state + "End"](e);
			self.state = "";
			self.isMousePressed = renderer.$isMousePressed = false;
			if (renderer.$keepTextAreaAtCursor)
				renderer.$moveTextAreaToCursor();
			self.$onCaptureMouseMove = self.releaseMouse = void 0;
			e && self.onMouseEvent("mouseup", e);
			editor.endOperation();
		};

		var onCaptureUpdate = function() {
			(self as any)[self.state] && (self as any)[self.state]();
			self.$mouseMoved = false;
		};

		var onCaptureInterval = function() {
			if (continueCapture) {
				onCaptureUpdate();
				event.nextFrame(onCaptureInterval, self.editor.window);
			}
		};

		// if (useragent.isOldIE && ev.domEvent.type == "dblclick") {
		// 	return setTimeout(function() {onCaptureEnd(ev);});
		// }

		var onOperationEnd = function(e: any) {
			if (!self.releaseMouse) return;
			// some touchpads fire mouseup event after a slight delay,
			// which can cause problems if user presses a keyboard shortcut quickly
			if (editor.curOp!.command!.name && editor!.curOp!.selectionChanged) {
				(self as any)[self.state + "End"] && (self as any)[self.state + "End"]();
				self.state = "";
				self.releaseMouse({} as any);
			}
		};

		editor.on("beforeEndOperation", onOperationEnd);
		editor.startOperation({command: {name: "mouse"}});

		self.$onCaptureMouseMove = onMouseMove;
		self.releaseMouse = event.capture(this.editor.container, onMouseMove, onCaptureEnd);

		onCaptureInterval();
	}
	cancelContextMenu() {
		var stop = (e?: MouseEvent)=>{
			// if (e && e.domEvent && e.domEvent.type != "contextmenu")
			// 	return;
			this.editor.off("nativecontextmenu", stop);
			if (e && e.domEvent)
				event.stopEvent(e.domEvent);
		};
		setTimeout(stop, 10);
		this.editor.on("nativecontextmenu", stop);
	}
	destroy() {
		if (this.releaseMouse) this.releaseMouse({} as any);
		if (this.$tooltip) this.$tooltip.destroy();
	}
}

config.defineOptions(MouseHandler.prototype, "mouseHandler", {
	scrollSpeed: {initialValue: 2},
	dragDelay: {initialValue: (useragent.isMac ? 150 : 0)},
	dragEnabled: {initialValue: true},
	focusTimeout: {initialValue: 0},
});