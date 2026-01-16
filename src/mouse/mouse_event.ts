"use strict";

import * as useragent from "../lib/env";
import * as event from "../lib/event";
import {MouseEvent as UIMouseEvent} from "quark/event";
import type {UIEvent, ClickEvent, KeyEvent} from "quark/event";
import type { Editor } from "../editor";
import type { Point } from "../range";
import { KeyboardKeyCode } from "quark/keyboard";
import { Vec2 } from "quark/types";

export type ClipboardEvent = UIEvent;

/*
 * Custom Ace mouse event
 */
export class MouseEvent {
	public domEvent: KeyEvent & {_clicks?: number};
	public x: number;
	public y: number;
	public position: Vec2;
	public editor: Editor;
	private $pos: Point | null;
	private $inSelection: boolean | null;
	public propagationStopped: boolean;
	public defaultPrevented: boolean;
	public speed: number;
	public wheelX: number;
	public wheelY: number;
	readonly detail: number;
	public time: number = 0;

	get clientY() {
		return this.x;
	}

	get clientX() {
		return this.y;
	}

	/**
	 * @param {UIMouseEvent | ClickEvent} domEvent
	 * @param {Editor} editor
	 */
	constructor(domEvent: UIMouseEvent | ClickEvent, editor: Editor) {
		this.domEvent = domEvent;
		this.editor = editor;

		this.x = domEvent.position.x;
		this.y = domEvent.position.y;
		this.position = Vec2.new(this.x, this.y);
		this.speed = 1;

		this.$pos = null;
		this.$inSelection = null;

		this.propagationStopped = false;
		this.defaultPrevented = false;
		this.detail = 0;

		if (domEvent.keycode == KeyboardKeyCode.MOUSE_LEFT && domEvent instanceof UIMouseEvent) {
			const now = Date.now();
			let detail = domEvent.sender.getAttribute("detail") as number || 0;
			let detailTime = domEvent.sender.getAttribute("detailTime") as number || 0;
			if (now - detailTime > 400) {
				detail = 1;
				detailTime = now;
			} else {
				detail++;
			}
			domEvent.sender.setAttribute("detail", detail);
			domEvent.sender.setAttribute("detailTime", detailTime);
			this.detail = detail;
		}
	}
	
	stopPropagation() {
		event.stopPropagation(this.domEvent);
		this.propagationStopped = true;
	}
	
	preventDefault() {
		event.preventDefault(this.domEvent);
		this.defaultPrevented = true;
	}
	
	stop() {
		this.stopPropagation();
		this.preventDefault();
	}

	/**
	 * Get the document position below the mouse cursor
	 * 
	 * @return {Object} 'row' and 'column' of the document position
	 */
	getDocumentPosition(): Point {
		if (this.$pos)
			return this.$pos;
		
		this.$pos = this.editor.renderer.screenToTextCoordinates(this.position.x, this.position.y);
		return this.$pos;
	}

	/**
	 * Get the relative position within the gutter.
	 * 
	 * @return {Number} 'row' within the gutter. 
	 */
	getGutterRow() {
		var documentRow = this.getDocumentPosition().row;
		var screenRow = this.editor.session.documentToScreenRow(documentRow, 0);
		var screenTopRow = this.editor.session.documentToScreenRow(this.editor.renderer.$gutterLayer.$lines.get(0).row, 0);
		return screenRow - screenTopRow;
	}
	
	/**
	 * Check if the mouse cursor is inside of the text selection
	 * 
	 * @return {Boolean} whether the mouse cursor is inside of the selection
	 */
	inSelection() {
		if (this.$inSelection !== null)
			return this.$inSelection;
			
		var editor = this.editor;
		

		var selectionRange = editor.getSelectionRange();
		if (selectionRange.isEmpty())
			this.$inSelection = false;
		else {
			var pos = this.getDocumentPosition();
			this.$inSelection = selectionRange.contains(pos.row, pos.column);
		}

		return this.$inSelection;
	}
	
	/**
	 * Get the clicked mouse button
	 * 
	 * @return {Number} 0 for left button, 1 for middle button, 2 for right button
	 */
	getButton() {
		return event.getButton(this.domEvent);
	}
	
	/**
	 * @return {Boolean} whether the shift key was pressed when the event was emitted
	 */
	getShiftKey() {
		return this.domEvent.shift;
	}

	getAccelKey() {
		return useragent.isMac ? this.domEvent.command : this.domEvent.ctrl;
	}
}