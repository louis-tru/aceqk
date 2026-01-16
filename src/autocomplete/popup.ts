"use strict";

import {VirtualRenderer as Renderer} from "../virtual_renderer";
import {Editor} from "../editor";
import {Range,Point} from "../range";
import * as lang from "../lib/lang";
import config from "../config";
import {Window,Text,View,createCss} from "quark";
import type { Completion, AcePopupNavigation } from "../autocomplete";
import { getChildren } from "../lib/dom";
import {MouseEvent} from "../mouse/mouse_event";

const nls = config.nls;

export var getAriaId = function (index: number) {
	return `suggest-aria-id:${index}`;
};

// Safari requires different ARIA A11Y attributes compared to other browsers
const popupAriaRole = /*userAgent.isSafari*/false ? "menu" : "listbox";
const optionAriaRole = /*userAgent.isSafari*/false ? "menuitem" : "option";
const ariaActiveState = /*userAgent.isSafari*/false ? "aria-current" : "aria-selected";

/**
 *
 * @param {Text} [el]
 * @return {Editor}
 */
export function $singleLineEditor(el?: Text, editor?: Editor): Editor {
	editor = editor || new Editor(new Renderer(el));
	editor.renderer.$maxLines = 4;

	editor.setHighlightActiveLine(false);
	editor.setShowPrintMargin(false);
	editor.renderer.setShowGutter(false);
	editor.renderer.setHighlightGutterLine(false);

	editor.$mouseHandler.$focusTimeout = 0;
	editor.$highlightTagPending = true;

	return editor;
};

export interface AcePopupEventsExtension {
	"click": (e: MouseEvent, emitter: AcePopup) => void;
	"dblclick": (e: MouseEvent, emitter: AcePopup) => void;
	"tripleclick": (e: MouseEvent, emitter: AcePopup) => void;
	"quadclick": (e: MouseEvent, emitter: AcePopup) => void;
	"show": (e: undefined, emitter: AcePopup) => void;
	"hide": (e: undefined, emitter: AcePopup) => void;
	// "select": (hide: boolean, emitter: AcePopup) => void;
	"changeHoverMarker": (e: any, emitter: AcePopup) => void;
}

type CompletionData = Completion & {
	name?: string, className?: string, matchMask?: any, message?: string
};

export interface AcePopup {
	setSelectOnHover: (val: boolean) => void,
	setRow: (line: number) => void,
	getRow: () => number,
	getHoveredRow: () => number,
	filterText: string,
	isOpen: boolean,
	isTopdown: boolean,
	autoSelect: boolean,
	data: CompletionData[],
	setData: (data: CompletionData[], filterText?: string) => void,
	getData: (row: number) => CompletionData,
	hide: () => void,
	anchor?: "top" | "bottom",
	anchorPosition: Point,
	tryShow: (pos: any, lineHeight: number, anchor?: "top" | "bottom", forceShow?: boolean) => boolean,
	$borderSize: number,
	show: (pos: any, lineHeight: number, topdownOnly?: boolean) => void,
	goTo: (where: AcePopupNavigation) => void,
	getTextLeftOffset: () => number,
	$imageSize: number,
	anchorPos: any,
	isMouseOver?: boolean,
	selectedNode?: View,
}

/**
 * This object is used in some places where needed to show popups - like prompt; autocomplete etc.
 */
export class AcePopup extends Editor {
	/**
	 * Creates and renders single line editor in popup window. If `parentNode` param is isset, then attaching it to this element.
	 * @param {View} [parentNode]
	 */
	constructor(win: Window, parentNode?: View) {
		// var el = dom.createElement("div");
		const el = new Text(win);
		super(new Renderer(el));
		$singleLineEditor(el, this);

		const popup = this;
		if (parentNode) {
			parentNode.append(el);
		}
		el.style.visible = false;
		popup.renderer.content.style.cursor = "normal";
		popup.renderer.setStyle("ace_autocomplete");

		// Set aria attributes for the popup
		popup.renderer.$textLayer.element.setAttribute("role", popupAriaRole);
		popup.renderer.$textLayer.element.setAttribute("aria-roledescription", nls("autocomplete.popup.aria-roledescription", "Autocomplete suggestions"));
		popup.renderer.$textLayer.element.setAttribute("aria-label", nls("autocomplete.popup.aria-label", "Autocomplete suggestions"));
		popup.renderer.textarea.setAttribute("aria-hidden", "true");

		popup.setOption("displayIndentGuides", false);
		popup.setOption("dragDelay", 150);

		var noop = function(){};

		popup.focus = noop;
		popup.$isFocused = true;

		popup.renderer.$cursorLayer.restartTimer = noop;
		popup.renderer.$cursorLayer.element.style.opacity = 0;

		popup.renderer.$maxLines = 8;
		popup.renderer.$keepTextAreaAtCursor = false;

		popup.setHighlightActiveLine(false);
		// set default highlight color
		popup.session.highlight(void 0);
		popup.session.$searchHighlight!.clazz = "ace_highlight-marker";

		popup.on("mousedown", function(e) {
			var pos = e.getDocumentPosition();
			popup.selection.moveToPosition(pos);
			selectionMarker.start.row = selectionMarker.end.row = pos.row;
			e.stop();
		});

		var lastMouseEvent: any = null;
		var hoverMarker = new Range(-1, 0, -1, Infinity);
		var selectionMarker = new Range(-1, 0, -1, Infinity);
		selectionMarker.id = popup.session.addMarker(selectionMarker, "ace_active-line", "fullLine");
		popup.setSelectOnHover = function (val) {
			if (!val) {
				hoverMarker.id = popup.session.addMarker(hoverMarker, "ace_line-hover", "fullLine");
			} else if (hoverMarker.id) {
				popup.session.removeMarker(hoverMarker.id);
				hoverMarker.id = void 0;
			}
		};
		popup.setSelectOnHover(false);
		popup.on("mousemove", function(e) {
			if (!lastMouseEvent) {
				lastMouseEvent = e;
				return;
			}
			if (lastMouseEvent.x == e.x && lastMouseEvent.y == e.y) {
				return;
			}
			lastMouseEvent = e;
			lastMouseEvent.scrollTop = popup.renderer.scrollTop;
			popup.isMouseOver = true;
			var row = lastMouseEvent.getDocumentPosition().row;
			if (hoverMarker.start.row != row) {
				if (!hoverMarker.id)
					popup.setRow(row);
				setHoverMarker(row);
			}
		});
		popup.renderer.on("beforeRender", function() {
			if (lastMouseEvent && hoverMarker.start.row != -1) {
				lastMouseEvent.$pos = null;
				var row = lastMouseEvent.getDocumentPosition().row;
				if (!hoverMarker.id)
					popup.setRow(row);
				setHoverMarker(row, true);
			}
		});
		// set aria attributes on all visible elements of the popup
		popup.renderer.on("afterRender", function () {
			var t = popup.renderer.$textLayer;
			var childNodes = getChildren(t.element);
			for (var row = t.config.firstRow, l = t.config.lastRow; row <= l; row++) {
				const popupRowElement = (childNodes[row - t.config.firstRow]);

				popupRowElement.setAttribute("role", optionAriaRole);
				popupRowElement.setAttribute("aria-roledescription", nls("autocomplete.popup.item.aria-roledescription", "item"));
				popupRowElement.setAttribute("aria-setsize", popup.data.length);
				popupRowElement.setAttribute("aria-describedby", "doc-tooltip");
				popupRowElement.setAttribute("aria-posinset", row + 1);

				const rowData = popup.getData(row);
				if (rowData) {
					const ariaLabel = `${rowData.caption || rowData.value}${rowData.meta ? `, ${rowData.meta}` : ''}`;
					popupRowElement.setAttribute("aria-label", ariaLabel);
				}

				const highlightedSpans = popupRowElement.querySelectorAllForClass(".ace_completion-highlight");
				highlightedSpans.forEach(span => {
					span.setAttribute("role", "mark");
				});
			}
		});
		popup.renderer.on("afterRender", () => {
			var row = popup.getRow();
			var t = popup.renderer.$textLayer;
			var selected = (getChildren(t.element)[row - t.config.firstRow]);
			var el = this.container.window.activeView; // Active element is textarea of main editor
			if (selected !== popup.selectedNode && popup.selectedNode) {
				popup.selectedNode.removeClass("ace_selected");
				popup.selectedNode.removeAttribute(ariaActiveState);
				popup.selectedNode.removeAttribute("id");
			}
			el.removeAttribute("aria-activedescendant");

			popup.selectedNode = selected;
			if (selected) {
				var ariaId = getAriaId(row);
				selected.addClass("ace_selected");
				selected.setAttribute("id", ariaId);
				t.element.setAttribute("aria-activedescendant", ariaId);
				el.setAttribute("aria-activedescendant", ariaId);
				selected.setAttribute(ariaActiveState, "true");
			}
		});
		var hideHoverMarker = function() { setHoverMarker(-1); };
		var setHoverMarker = function(row: number, suppressRedraw?: boolean) {
			if (row !== hoverMarker.start.row) {
				hoverMarker.start.row = hoverMarker.end.row = row;
				if (!suppressRedraw)
					popup.session._emit("changeBackMarker", void 0, popup.session);
				popup._emit("changeHoverMarker", void 0, popup);
			}
		};
		popup.getHoveredRow = function() {
			return hoverMarker.start.row;
		};

		// event.addListener(popup.container, "mouseout", function() {
		popup.container.onMouseLeave.on(function() {
			popup.isMouseOver = false;
			hideHoverMarker();
		});
		popup.on("hide", hideHoverMarker);
		popup.on("changeSelection", hideHoverMarker);

		popup.session.doc.getLength = function() {
			return popup.data.length;
		};
		popup.session.doc.getLine = function(i) {
			var data = popup.data[i];
			if (typeof data == "string")
				return data;
			return (data && data.value) || "";
		};

		var bgTokenizer = popup.session.bgTokenizer;
		bgTokenizer.$tokenizeRow = function(row) {
			var data = popup.data[row];
			var tokens: any[] = [];
			if (!data)
				return tokens;
			if (typeof data == "string")
				data = {value: data};
			var caption = data.caption || data.value || data.name || '';

			function addToken(value: string, className: string) {
				value && tokens.push({
					type: (data.className || "") + (className || ""),
					value: value
				});
			}

			var lower = caption.toLowerCase();
			var filterText = (popup.filterText || "").toLowerCase();
			var lastIndex = 0;
			var lastI = 0;
			for (var i = 0; i <= filterText.length; i++) {
				if (i != lastI && (data.matchMask & (1 << i) || i == filterText.length)) {
					var sub = filterText.slice(lastI, i);
					lastI = i;
					var index = lower.indexOf(sub, lastIndex);
					if (index == -1) continue;
					addToken(caption.slice(lastIndex, index), "");
					lastIndex = index + sub.length;
					addToken(caption.slice(index, lastIndex), "completion-highlight");
				}
			}
			addToken(caption.slice(lastIndex, caption.length), "");

			tokens.push({type: "completion-spacer", value: " "});
			if (data.meta)
				tokens.push({type: "completion-meta", value: data.meta});
			if (data.message)
				tokens.push({type: "completion-message", value: data.message});

			return tokens;
		};
		bgTokenizer.$updateOnChange = noop;
		bgTokenizer.start = noop;

		popup.session.$computeWidth = function() {
			return popup.session.screenWidth = 0;
		};

		// public
		popup.isOpen = false;
		popup.isTopdown = false;
		popup.autoSelect = true;
		popup.filterText = "";
		popup.isMouseOver = false;

		popup.data = [];
		popup.setData = function(list, filterText) {
			popup.filterText = filterText || "";
			popup.setValue(lang.stringRepeat("\n", list.length), -1);
			popup.data = list || [];
			popup.setRow(0);
		};
		popup.getData = function(row) {
			return popup.data[row];
		};

		popup.getRow = function() {
			return selectionMarker.start.row;
		};
		popup.setRow = function(line) {
			line = Math.max(this.autoSelect ? 0 : -1, Math.min(this.data.length - 1, line));
			if (selectionMarker.start.row != line) {
				popup.selection.clearSelection();
				selectionMarker.start.row = selectionMarker.end.row = line || 0;
				popup.session._emit("changeBackMarker", void 0, popup.session);
				popup.moveCursorTo(line || 0, 0);
				if (popup.isOpen)
					popup._signal("select", void 0, popup);
			}
		};

		popup.on("changeSelection", function() {
			if (popup.isOpen)
				popup.setRow(popup.selection.lead.row);
			popup.renderer.scrollCursorIntoView();
		});

		popup.hide = function() {
			popup.container.style.visible = false;
			popup.anchorPos = null;
			popup.anchor = void 0;
			if (popup.isOpen) {
				popup.isOpen = false;
				popup._signal("hide", undefined, popup);
			}
		};

		/**
		 * Tries to show the popup anchored to the given position and anchors.
		 * If the anchor is not specified it tries to align to bottom and right as much as possible.
		 * If the popup does not have enough space to be rendered with the given anchors, it returns false without rendering the popup.
		 * The forceShow flag can be used to render the popup in these cases, which slides the popup so it entirely fits on the screen.
		 * @param {{top: number, left: number}} pos
		 * @param {number} lineHeight
		 * @param {"top" | "bottom" | undefined} anchor
		 * @param {boolean} forceShow
		 * @returns {boolean}
		 */
		popup.tryShow = function(pos, lineHeight, anchor, forceShow) {
			if (!forceShow && popup.isOpen && popup.anchorPos && popup.anchor &&
				popup.anchorPos.top === pos.top && popup.anchorPos.left === pos.left &&
				popup.anchor === anchor
			) {
				return true;
			}

			var el = this.container;
			var scrollBarSize = this.renderer.scrollBar.width || 10;
			var screenHeight = this.window.size.height - scrollBarSize;
			var screenWidth = this.window.size.width - scrollBarSize;
			var renderer = this.renderer;
			// var maxLines = Math.min(renderer.$maxLines, this.session.getLength());
			var maxH = (renderer.$maxLines || 0) * lineHeight * 1.4;
			var dims = { top: 0, bottom: 0, left: 0 };

			var spaceBelow = screenHeight - pos.top - 3 * this.$borderSize - lineHeight;
			var spaceAbove = pos.top - 3 * this.$borderSize;
			if (!anchor) {
				if (spaceAbove <= spaceBelow || spaceBelow >= maxH) {
					anchor = "bottom";
				} else {
					anchor = "top";
				}
			}

			if (anchor === "top") {
				dims.bottom = pos.top - this.$borderSize;
				dims.top = dims.bottom - maxH;
			} else if (anchor === "bottom") {
				dims.top = pos.top + lineHeight + this.$borderSize;
				dims.bottom = dims.top + maxH;
			}

			var fitsX = dims.top >= 0 && dims.bottom <= screenHeight;

			if (!forceShow && !fitsX) {
				return false;
			}

			if (!fitsX) {
				if (anchor === "top") {
					renderer.$maxPixelHeight = spaceAbove;
				} else {
					renderer.$maxPixelHeight = spaceBelow;
				}
			} else {
				renderer.$maxPixelHeight = void 0;
			}

			if (anchor === "top") {
				el.style.marginTop = 0;
				el.style.marginBottom = (screenHeight + scrollBarSize - dims.bottom);
				el.style.align = "bottom";
				popup.isTopdown = false;
			} else {
				el.style.marginTop = dims.top;
				el.style.marginBottom = 0;
				el.style.align = "top";
				popup.isTopdown = true;
			}

			el.style.visible = true;

			var left = pos.left;
			var clSize = el.clientSize;
			if (left + clSize.width > screenWidth)
				left = screenWidth - clSize.width;

			el.style.marginLeft = left;
			el.style.marginRight = 0;
			// dom.$fixPositionBug(el);

			if (!popup.isOpen) {
				popup.isOpen = true;
				this._signal("show", void 0, this);
				lastMouseEvent = null;
			}

			popup.anchorPos = pos;
			popup.anchor = anchor;

			return true;
		};

		popup.show = function(pos, lineHeight, topdownOnly) {
			this.tryShow(pos, lineHeight, topdownOnly ? "bottom" : undefined, true);
		};

		popup.goTo = function(where) {
			var row = this.getRow();
			var max = this.session.getLength() - 1;

			switch(where) {
				case "up": row = row <= 0 ? max : row - 1; break;
				case "down": row = row >= max ? -1 : row + 1; break;
				case "start": row = 0; break;
				case "end": row = max; break;
			}

			this.setRow(row);
		};


		popup.getTextLeftOffset = function() {
			return this.$borderSize + this.renderer.$padding + this.$imageSize;
		};

		popup.$imageSize = 0;
		popup.$borderSize = 1;

		return popup;
	}
}

createCss({
	'.ace_editor.ace_autocomplete .ace_marker-layer .ace_active-line': {
		backgroundColor: '#CAD6FA',
		zIndex: 1
	},
	'.ace_dark.ace_editor.ace_autocomplete .ace_marker-layer .ace_active-line': {
		backgroundColor: '#3a674e',
	},
	'.ace_editor.ace_autocomplete .ace_line-hover': {
		border: '1 #abbffe',
		marginTop: -1,
		backgroundColor: 'rgba(233,233,253,0.4)',
		// position: 'absolute',
		zIndex: 2,
	},
	'.ace_dark.ace_editor.ace_autocomplete .ace_line-hover': {
		border: '1 rgba(109, 150, 13, 0.8)',
		backgroundColor: 'rgba(58, 103, 78, 0.62)',
	},
	'.ace_completion-meta ': {
		opacity: 0.5,
		// marginLeft: '0.9em',
	},
	'.ace_completion-message ': {
		// marginLeft: '0.9em',
		textColor: '#00f',
	},
	'.ace_editor.ace_autocomplete .ace_completion-highlight': {
		textColor: '#2d69c7',
	},
	'.ace_dark.ace_editor.ace_autocomplete .ace_completion-highlight': {
		textColor: '#93ca12',
	},
	'.ace_editor.ace_autocomplete': {
		width: 300,
		zIndex: 200000,
		border: '1 #D3D3D3',
		// position: 'fixed',
		boxShadow: '2 3 5 rgba(0,0,0,.2)',
		textLineHeight: 1.4,
		backgroundColor: '#fefefe',
		color: '#111',
	},
	'.ace_dark.ace_editor.ace_autocomplete': {
		border: '1 #484747',
		boxShadow: '2 3 5 rgba(0, 0, 0, 0.51)',
		textLineHeight: 1.4,
		backgroundColor: '#25282c',
		color: '#c1c1c1',
	},
	'.ace_autocomplete .ace_text-layer': {
		width: '8!',
	},
	'.ace_autocomplete .ace_line': {
		// display: flex;
		itemsAlign: 'center',
	},
	// '.ace_autocomplete .ace_line > *': {
	// 	minWidth: 0,
	// 	maxWidth: 'auto',
	// 	// flex: 0 0 auto;
	// },
	'.ace_autocomplete .ace_line .ace_': {
		// flex: 0 1 auto;
		// overflow: hidden;
		textOverflow: 'ellipsis',
	},
	'.ace_autocomplete .ace_completion-spacer': {
		// flex: 1;
	},
	// '.ace_autocomplete.ace_loading:after': {
		// content: "";
		// position: absolute;
		// top: 0px;
		// height: 2px;
		// width: 8%;
		// background: blue;
		// z-index: 100;
		// animation: ace_progress 3s infinite linear;
		// animation-delay: 300ms;
		// transform: translateX(-100%) scaleX(1);
	// },
	// @keyframes ace_progress {
	// 	0% { transform: translateX(-100%) scaleX(1) }
	// 	50% { transform: translateX(625%) scaleX(2) } 
	// 	100% { transform: translateX(1500%) scaleX(3) } 
	// }
	// @media (prefers-reduced-motion) {
	// 	.ace_autocomplete.ace_loading:after {
	// 		transform: translateX(625%) scaleX(2);
	// 		animation: none;
	// 	 }
	// }
});//	`, "autocompletion.css", false);