"use strict";

import {Range} from "./range";
import {preventParentScroll} from "./lib/scroll";
import qk, {Window, View,Text} from "quark";
import type {Ace} from "../ace-internal";
import {MouseEvent} from "./mouse/mouse_event";
import type { Editor } from "./editor";
import type {KeyEvent, MouseEvent as UIMouseEvent} from "quark/event";
import type { EditSession } from "./edit_session";
import {KeyboardKeyCode} from "quark/keyboard";

const CLASSNAME = "ace_tooltip";

export class Tooltip {
	public isOpen: boolean;
	public $element?: Text;
	private theme?: Ace.Theme;
	readonly $parentNode: View;
	public priority: number = 0;
	readonly window: Window;

	/**
	 * @param {View} parentNode
	 **/
	constructor(parentNode: View) {
		this.isOpen = false;
		this.$parentNode = parentNode;
		this.window = parentNode.window;
	}

	$init() {
		// this.$element = dom.createElement("div");
		this.$element = new Text(this.$parentNode.window);
		this.$element.class = [CLASSNAME];
		this.$element.style.visible = false;
		this.$parentNode.append(this.$element);
		return this.$element;
	}

	/**
	 * @returns {Text}
	 **/
	getElement() {
		return this.$element || this.$init();
	}

	/**
	 * @param {String} text
	 **/
	setText(text: string) {
		this.getElement().value = text;
	}

	/**
	 * @param {String} html
	 **/
	setHtml(html: string) {
		// this.getElement().innerHTML = html;
		// TODO: Quark Text node does not support innerHTML
		this.getElement().value = html;
	}

	/**
	 * @param {Number} x
	 * @param {Number} y
	 **/
	setPosition(x: number, y: number) {
		this.getElement().style.marginLeft = x;
		this.getElement().style.marginTop = y;
	}

	/**
	 * @param {String} className
	 **/
	setClassName(className: string) {
		this.getElement().cssclass.add(className);
	}

	/**
	 * @param {Ace.Theme} theme
	 */
	setTheme(theme: Ace.Theme) {
		if (this.theme) {
			this.theme.isDark && this.getElement().cssclass.remove("ace_dark");
			this.theme.cssClass && this.getElement().cssclass.remove(this.theme.cssClass);
		}
		if (theme.isDark) {
			this.getElement().cssclass.add("ace_dark");
		}
		if (theme.cssClass) {
			this.getElement().cssclass.add(theme.cssClass);
		}
		this.theme = {
			isDark: theme.isDark,
			cssClass: theme.cssClass
		};
	}

	/**
	 * @param {String} [text]
	 * @param {Number} [x]
	 * @param {Number} [y]
	 **/
	show(text?: string, x?: number, y?: number) {
		if (text != null)
			this.setText(text);
		if (x != null && y != null)
			this.setPosition(x, y);
		if (!this.isOpen) {
			this.getElement().style.visible = true;
			this.isOpen = true;
		}
	}

	hide(e?: any) {
		if (this.isOpen) {
			this.getElement().style.visible = false;
			this.getElement().class = [CLASSNAME]; // default class
			this.isOpen = false;
		}
	}

	/**
	 * @returns {Number}
	 **/
	getHeight() {
		return this.getElement().clientSize.height;
	}

	/**
	 * @returns {Number}
	 **/
	getWidth() {
		return this.getElement().clientSize.width;
	}

	destroy() {
		this.isOpen = false;
		if (this.$element) {
			this.$element.remove();
		}
	}
}

export class PopupManager {
	readonly popups: Tooltip[] = [];

	/**
	 * @param {Tooltip} popup
	 */
	addPopup(popup: Tooltip) {
		this.popups.push(popup);
		this.updatePopups();
	}

	/**
	 * @param {Tooltip} popup
	 */
	removePopup(popup: Tooltip) {
		var index = this.popups.indexOf(popup);
		if (index !== -1) {
			this.popups.splice(index, 1);
			this.updatePopups();
		}
	}

	updatePopups() {
		this.popups.sort((a, b) => b.priority - a.priority);
		let visiblepopups = [];

		for (let popup of this.popups) {
			let shouldDisplay = true;
			for (let visiblePopup of visiblepopups) {
				if (this.doPopupsOverlap(visiblePopup, popup)) {
					shouldDisplay = false;
					break;
				}
			}

			if (shouldDisplay) {
				visiblepopups.push(popup);
			} else {
				popup.hide();
			}
		}
	}

	/**
	 * @param {Tooltip} popupA
	 * @param {Tooltip} popupB
	 * @return {boolean}
	 */
	doPopupsOverlap(popupA: Tooltip, popupB: Tooltip) {
		var sizeA = popupA.getElement().clientSize;
		var posA = popupA.getElement().position;
		var sizeB = popupB.getElement().clientSize;
		var posB = popupB.getElement().position;
		
		var rectA = {
			left: posA.x,
			right: posA.x + sizeA.width,
			top: posA.y,
			bottom: posA.y + sizeA.height
		};
		var rectB = {
			left: posB.x,
			right: posB.x + sizeB.width,
			top: posB.y,
			bottom: posB.y + sizeB.height
		};

		return (rectA.left < rectB.right && rectA.right > rectB.left && rectA.top < rectB.bottom && rectA.bottom
			> rectB.top);
	}
}

export const popupManager = new PopupManager();

export class HoverTooltip extends Tooltip {
	private timeout?: ReturnType<typeof setTimeout>;
	private lastT: number;
	public  idleTime: number;
	private lastEvent?: MouseEvent;
	private range?: Range;
	private marker?: number;
	private $markerSession?: Ace.EditSession;
	private $gatherData: (event: MouseEvent, editor: Ace.Editor) => void = function() {};
	public $fromKeyboard: boolean = false;

	/**
	 * @param {View} [parentNode]
	 **/
	constructor(parentNode?: View) {
		super(parentNode || qk.app.activeWindow!.root);

		this.lastT = 0;
		this.idleTime = 350;
		this.lastEvent = undefined;

		this.onMouseLeave = this.onMouseLeave.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.waitForHover = this.waitForHover.bind(this);
		// this.hide = this.hide.bind(this);

		var el = this.getElement();
		el.style.textWhiteSpace = "preWrap";
		el.style.receive = true;
		// el.addEventListener("mouseout", this.onMouseOut, true);
		el.onMouseLeave.on(this.onMouseLeave);
		el.setAttribute("tabIndex", -1);

		el.onBlur.on(()=>{
			if (!el.isChild(this.$parentNode.window.activeView))
				this.hide();
		});

		el.onMouseWheel.on(preventParentScroll);
	}

	/**
	 * @param {Editor} editor
	 */
	addToEditor(editor: Editor) {
		editor.on("mousemove", this.onMouseMove);
		editor.on("mousedown", this.$hide);
		var target = editor.renderer.getMouseEventTarget();
		if (target && typeof target.addEventListener === "function") {
			// target.addEventListener("mouseout", this.onMouseOut, true);
			target.onMouseLeave.on(this.onMouseLeave);
		}
	}

	/**
	 * @param {Editor} editor
	 */
	removeFromEditor(editor: Editor) {
		editor.off("mousemove", this.onMouseMove);
		editor.off("mousedown", this.$hide);
		var target = editor.renderer.getMouseEventTarget();
		if (target && typeof target.removeEventListener === "function") {
			// target.removeEventListener("mouseout", this.onMouseOut, true);
			target.onMouseLeave.off(this.onMouseLeave);
		}
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = void 0;
		}
	}

	/**
	 * @param {MouseEvent} e
	 * @param {Editor} editor
	 * @internal
	 */
	onMouseMove(e: MouseEvent, editor: Editor) {
		this.lastEvent = e;
		this.lastT = Date.now();
		var isMousePressed = editor.$mouseHandler.isMousePressed;
		if (this.isOpen) {
			var pos = this.lastEvent && this.lastEvent.getDocumentPosition();
			if (
				!this.range
				|| !this.range.contains(pos.row, pos.column)
				|| isMousePressed
				|| this.isOutsideOfText(this.lastEvent)
			) {
				this.hide();
			}
		}
		if (this.timeout || isMousePressed) return;
		this.lastEvent = e;
		this.timeout = setTimeout(this.waitForHover, this.idleTime);
	}
	waitForHover() {
		if (this.timeout) clearTimeout(this.timeout);
		var dt = Date.now() - this.lastT;
		if (this.idleTime - dt > 10) {
			this.timeout = setTimeout(this.waitForHover, this.idleTime - dt);
			return;
		}

		this.timeout = void 0;
		if (this.lastEvent && !this.isOutsideOfText(this.lastEvent)) {
			this.$gatherData(this.lastEvent, this.lastEvent.editor);
		}
	}

	/**
	 * @param {MouseEvent} e
	 */
	isOutsideOfText(e: MouseEvent) {
		var editor = e.editor;
		var docPos = e.getDocumentPosition();
		var line = editor.session.getLine(docPos.row);
		if (docPos.column == line.length) {
			var screenPos = editor.renderer.pixelToScreenCoordinates(e.clientX, e.clientY);
			var clippedPos = editor.session.documentToScreenPosition(docPos.row, docPos.column);
			if (
				clippedPos.column != screenPos.column
				|| clippedPos.row != screenPos.row
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param {(event: MouseEvent, editor: Editor) => void} value
	 */
	setDataProvider(value: (event: MouseEvent, editor: Editor) => void) {
		this.$gatherData = value;
	}

	/**
	 * @param {Editor} editor
	 * @param {Range} range
	 * @param {Text} domNode
	 * @param {MouseEvent} [startingEvent]
	 */
	showForRange(editor: Editor, range: Range, domNode: Text, startingEvent?: MouseEvent) {
		if (startingEvent && startingEvent != this.lastEvent)
			return;
		if (this.isOpen && this.window.activeView == this.getElement())
			return;

		var renderer = editor.renderer;
		if (!this.isOpen) {
			popupManager.addPopup(this);
			this.$registerCloseEvents();
			this.setTheme(renderer.theme);
		}
		this.isOpen = true;

		this.range = Range.fromPoints(range.start, range.end);
		var position = renderer.textToScreenCoordinates(range.start.row, range.start.column);

		var rect = renderer.scroller.position;
		// clip position to visible area of the editor
		if (position.pageX < rect.x) position.pageX = rect.x;

		var element = this.getElement();
		// element.innerHTML = "";
		element.removeAllChild();
		element.append(domNode);

		element.style.maxHeight = "none"; // disable max height constraint
		element.style.visible = true;

		this.$setPosition(editor, position, true, range);
		
		// dom.$fixPositionBug(element);
	}

	/**
	 * @param {Editor} editor
	 * @param {{pageX: number;pageY: number;}} position
	 * @param {boolean} withMarker
	 * @param {Range} [range]
	 */
	$setPosition(editor: Editor, position: {pageX: number; pageY: number}, withMarker: boolean, range?: Range) {
		var MARGIN = 10;

		withMarker && this.addMarker(range, editor.session);

		var renderer = editor.renderer;
		var element = this.getElement();

		// measure the size of tooltip, without constraints on its height
		var clSize = element.clientSize;
		var labelHeight = clSize.height;
		var labelWidth = clSize.width;
		var anchorTop = position.pageY;
		var anchorLeft = position.pageX;
		var spaceBelow = this.window.size.height - anchorTop - renderer.lineHeight;

		// if tooltip fits above the line, or space below the line is smaller, show tooltip above
		var isAbove = this.$shouldPlaceAbove(labelHeight, anchorTop, spaceBelow - MARGIN);

		element.style.maxHeight = (isAbove ? anchorTop : spaceBelow) - MARGIN;
		element.style.marginTop = isAbove ? 0 : anchorTop + renderer.lineHeight;
		element.style.marginBottom = isAbove ? this.window.size.height - anchorTop : 0;
		element.style.align = isAbove ? "top": "bottom"; // vertical align

		// try to align tooltip left with the range, but keep it on screen
		element.style.marginLeft = Math.min(anchorLeft, this.window.size.width - labelWidth - MARGIN);
	}

	/**
	 * @param {number} labelHeight
	 * @param {number} anchorTop
	 * @param {number} spaceBelow
	 */
	$shouldPlaceAbove(labelHeight: number, anchorTop: number, spaceBelow: number) {
		return !(anchorTop - labelHeight < 0 && anchorTop < spaceBelow);
	}

	/**
	 * @param {Range} range
	 * @param {EditSession} [session]
	 */
	addMarker(range?: Range, session?: EditSession) {
		if (this.marker) {
			this.$markerSession!.removeMarker(this.marker);
		}
		this.$markerSession = session;
		this.marker = session && session.addMarker(range || Range.zero(), "ace_highlight-marker", "text");
	}

	private $hide = (e: MouseEvent) => {
		this.hide(e.domEvent as KeyEvent);
	};

	private $hideFromKeydown = (e: KeyEvent) => {
		this.hide(e, "keydown");
	}

	private $hideFrom = (e?: KeyEvent) => {
		this.hide(e);
	}

	hide(e?: KeyEvent, type?: string) {
		if (e && this.$fromKeyboard && type == "keydown") {
			if (e.keycode == KeyboardKeyCode.ESC) {
				return;
			}
		}
		if (!e && this.window.activeView == this.getElement())
			return;
		if (e && e.origin && (type != "keydown" || e.ctrl || e.command)
				&& this.$element!.isChild(e.origin))
			return;
		this.lastEvent = void 0;
		if (this.timeout) clearTimeout(this.timeout);
		this.timeout = void 0;
		this.addMarker(void 0);
		if (this.isOpen) {
			this.$fromKeyboard = false;
			this.$removeCloseEvents();
			this.getElement().style.visible = false;
			this.isOpen = false;
			popupManager.removePopup(this);
		}
	}

	$registerCloseEvents() {
		this.window.root.onKeyDown.on(this.$hideFromKeydown);
		this.window.root.onMouseWheel.on(this.$hideFrom);
		this.window.root.onMouseDown.on(this.$hideFrom);
	}

	$removeCloseEvents() {
		this.window.root.onKeyDown.off(this.$hideFromKeydown);
		this.window.root.onMouseWheel.off(this.$hideFrom);
		this.window.root.onMouseDown.off(this.$hideFrom);
	}

	/**
	 * @internal
	 */
	onMouseLeave(e: UIMouseEvent) {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = void 0;
		}
		this.lastEvent = void 0;
		if (!this.isOpen)
			return;

		// if (!e.relatedTarget || this.getElement().contains(e.relatedTarget)) return;
		if (e && this.getElement().isChild(e.origin))
			return;
		// if (e && e.currentTarget.contains(e.relatedTarget)) return;
		// if (!e.relatedTarget.classList.contains("ace_content")) this.hide();
		this.hide(); // hide unconditionally on mouse leave
	}
}
