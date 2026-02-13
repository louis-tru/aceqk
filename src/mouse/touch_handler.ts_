"use strict";

import {MouseEvent} from "./mouse_event";
import * as event from "../lib/event";
import * as dom from "../lib/dom";
import type {Editor} from "../editor";
import type {View} from "quark";
import type {Point} from "../range";
import { ClickEvent, TouchEvent } from "quark/event";

export function addTouchListeners(el: View, editor: Editor) {
	var mode = "scroll";
	var startX: number;
	var startY: number;
	var touchStartT: number = -1;
	var lastT: number;
	var longTouchTimer: TimeoutResult;
	var animationTimer: TimeoutResult;
	var animationSteps = 0;
	var pos: Point;
	var clickCount = 0;
	var vX = 0;
	var vY = 0;
	var pressed;
	var contextMenu: View;

	function createContextMenu() {
		var clipboard = false;//window.navigator && window.navigator.clipboard;
		var isOpen = false;
		var updateMenu = function() {
			var selected = editor.getCopyText();
			var hasUndo = editor.session.getUndoManager().hasUndo();

			contextMenu.first?.remove(); // remove old menu

			dom.buildDom(isOpen ? ["text",
				!selected && canExecuteCommand("selectall") && ["label", { class: "ace_mobile-button", action: "selectall", value: "Select All" }],
				selected && canExecuteCommand("copy") && ["label", { class: "ace_mobile-button", action: "copy", value: "Copy" }],
				selected && canExecuteCommand("cut") && ["label", { class: "ace_mobile-button", action: "cut", value: "Cut" }],
				clipboard && canExecuteCommand("paste") && ["label", { class: "ace_mobile-button", action: "paste", value: "Paste" }],
				hasUndo && canExecuteCommand("undo") && ["label", { class: "ace_mobile-button", action: "undo", value: "Undo" }],
				canExecuteCommand("find") && ["label", { class: "ace_mobile-button", action: "find", value: "Find" }],
				canExecuteCommand("openCommandPalette") && ["label", { class: "ace_mobile-button", action: "openCommandPalette", value: "Palette" }]
			] : ["text"], contextMenu);
		};
		
		var canExecuteCommand = function (cmd: string) {
			return editor.commands.canExecute(cmd, editor);
		};
		
		var handleClick = function(e: ClickEvent | TouchEvent) {
			var action = e.origin.getAttribute("action");

			if (action == "more" || !isOpen) {
				isOpen = !isOpen;
				return updateMenu();
			}
			if (action == "paste") {
				// clipboard.readText().then(function (text) {
				// 	editor.execCommand(action, text);
				// });
			}
			else if (action) {
				if (action == "cut" || action == "copy") {
					// if (clipboard)
					// 	clipboard.writeText(editor.getCopyText());
					// else
					// 	document.execCommand("copy");
				}
				editor.execCommand(action);
			}
			contextMenu.first!.style.visible = false;
			isOpen = false;
			if (action != "openCommandPalette")
				editor.focus();
		};

		contextMenu = dom.buildDom(["box",
			{
				class: "ace_mobile-menu",
				onTouchStart: function(e: TouchEvent) {
					mode = "menu";
					e.stopPropagation();
					e.preventDefault();
					editor.textInput.focus();
				},
				onTouchEnd: function(e: TouchEvent) {
					e.stopPropagation();
					e.preventDefault();
					handleClick(e);
				},
				onClick: handleClick
			},
			["label"],
			["label", { class: "ace_mobile-button", action: "more", value: "..." }]
		], editor.container);
	}
	function showContextMenu() {
		if (!editor.getOption("enableMobileMenu")) {
			if (contextMenu) {
				hideContextMenu();
			}
			return;
		}
		if (!contextMenu) createContextMenu();
		var cursor = editor.selection.cursor;
		var pagePos = editor.renderer.textToScreenCoordinates(cursor.row, cursor.column);
		var leftOffset = editor.renderer.textToScreenCoordinates(0, 0).pageX;
		var scrollLeft = editor.renderer.scrollLeft;
		var pos = editor.container.position;
		var size = editor.container.clientSize;
		var rect = {
			left: pos.x,
			top: pos.y,
			width: size.width,
			height: size.height,
		};
		contextMenu.style.marginTop = pagePos.pageY - rect.top - 3;
		if (pagePos.pageX - rect.left < rect.width - 70) {
			contextMenu.style.marginLeft = 0;
			contextMenu.style.marginRight = 10;
			contextMenu.style.align = "end"; // align to right
		} else {
			contextMenu.style.marginRight = 0;
			contextMenu.style.marginLeft = leftOffset + scrollLeft - rect.left;
			contextMenu.style.align = "start"; // align to left
		}
		contextMenu.style.visible = true;
		contextMenu.first!.style.visible = false;
		editor.on("input", hideContextMenu);
	}
	function hideContextMenu(e?: any) {
		if (contextMenu)
			contextMenu.style.visible = false;
		editor.off("input", hideContextMenu);
	}

	function handleLongTap() {
		longTouchTimer = null;
		clearTimeout(longTouchTimer);
		var range = editor.selection.getRange();
		var inSelection = range.contains(pos.row, pos.column);
		if (range.isEmpty() || !inSelection) {
			editor.selection.moveToPosition(pos);
			editor.selection.selectWord();
		}
		mode = "wait";
		showContextMenu();
	}
	function switchToSelectionMode() {
		longTouchTimer = null;
		clearTimeout(longTouchTimer);
		editor.selection.moveToPosition(pos);
		var range = clickCount >= 2
			? editor.selection.getLineRange(pos.row)
			: editor.session.getBracketRange(pos);
		if (range && !range.isEmpty()) {
			editor.selection.setRange(range);
		} else {
			editor.selection.selectWord();
		}
		mode = "wait";
	}

	// event.addListener(el, "contextmenu", function(e) {
	// 	if (!pressed) return;
	// 	var textarea = editor.textInput.getElement();
	// 	textarea.focus();
	// }, editor);
	event.addListener(el, "TouchStart", function (e: TouchEvent & {}) {
		var touches = e.changedTouches;
		if (longTouchTimer || touches.length > 1) {
			clearTimeout(longTouchTimer);
			longTouchTimer = null;
			touchStartT = -1;
			mode = "zoom";
			return;
		}
		
		pressed = editor.$mouseHandler.isMousePressed = true;
		var h = editor.renderer.layerConfig.lineHeight;
		var w = editor.renderer.layerConfig.lineHeight;
		var t = e.timestamp;
		lastT = t;
		var touchObj = touches[0];
		var x = touchObj.position.x;
		var y = touchObj.position.y;
		// reset clickCount if the new touch is far from the old one
		if (Math.abs(startX - x) + Math.abs(startY - y) > h)
			touchStartT = -1;

		startX = x;
		startY = y;
		vX = vY = 0;

		var ev = new MouseEvent(e, editor);
		pos = ev.getDocumentPosition();

		if (t - touchStartT < 500 && touches.length == 1 && !animationSteps) {
			clickCount++;
			e.preventDefault();
			e.button = 0;
			switchToSelectionMode();
		} else {
			clickCount = 0;
			var cursor = editor.selection.cursor;
			var anchor = editor.selection.isEmpty() ? cursor : editor.selection.anchor;
			
			var cursorPos = editor.renderer.$cursorLayer.getPixelPosition(cursor, true);
			var anchorPos = editor.renderer.$cursorLayer.getPixelPosition(anchor, true);
			var pos = editor.renderer.scroller.position;
			var rect = { left: pos.x, top: pos.y };
			var offsetTop = editor.renderer.layerConfig.offset;
			var offsetLeft = editor.renderer.scrollLeft;
			var weightedDistance = function(x: number, y: number) {
				x = x / w;
				y = y / h - 0.75;
				return x * x + y * y;
			};
			var pos = e.position;

			if (pos.x < rect.left) {
				mode = "zoom";
				return;
			}

			var diff1 = weightedDistance(
				pos.x - rect.left - cursorPos.left + offsetLeft,
				pos.y - rect.top - cursorPos.top + offsetTop
			);
			var diff2 = weightedDistance(
				pos.x - rect.left - anchorPos.left + offsetLeft,
				pos.y - rect.top - anchorPos.top + offsetTop
			);
			if (diff1 < 3.5 && diff2 < 3.5)
				mode = diff1 > diff2 ? "cursor" : "anchor";
				
			if (diff2 < 3.5)
				mode = "anchor";
			else if (diff1 < 3.5)
				mode = "cursor";
			else
				mode = "scroll";
			longTouchTimer = setTimeout(handleLongTap, 450);
		}
		touchStartT = t;
	}, editor);

	event.addListener(el, "TouchEnd", function (e: TouchEvent) {
		pressed = editor.$mouseHandler.isMousePressed = false;
		if (animationTimer) clearInterval(animationTimer);
		if (mode == "zoom") {
			mode = "";
			animationSteps = 0;
		} else if (longTouchTimer) {
			editor.selection.moveToPosition(pos);
			animationSteps = 0;
			showContextMenu();
		} else if (mode == "scroll") {
			animate();
			hideContextMenu();
		} else {
			showContextMenu();
		}
		clearTimeout(longTouchTimer);
		longTouchTimer = null;
	}, editor);

	event.addListener(el, "TouchMove", function (e: TouchEvent) {
		if (longTouchTimer) {
			clearTimeout(longTouchTimer);
			longTouchTimer = null;
		}
		var touches = e.changedTouches;
		if (touches.length > 1 || mode == "zoom") return;

		var touchObj = touches[0];

		var wheelX = startX - touchObj.position.x;
		var wheelY = startY - touchObj.position.y;

		if (mode == "wait") {
			if (wheelX * wheelX + wheelY * wheelY > 4)
				mode = "cursor";
			else
				return e.preventDefault();
		}

		startX = touchObj.position.x;
		startY = touchObj.position.y;

		var t = e.timestamp;
		var dt = t - lastT;
		lastT = t;
		if (mode == "scroll") {
			var mouseEvent = new MouseEvent(e, editor);
			mouseEvent.speed = 1;
			mouseEvent.wheelX = wheelX;
			mouseEvent.wheelY = wheelY;
			if (10 * Math.abs(wheelX) < Math.abs(wheelY)) wheelX = 0;
			if (10 * Math.abs(wheelY) < Math.abs(wheelX)) wheelY = 0;
			if (dt != 0) {
				vX = wheelX / dt;
				vY = wheelY / dt;
			}
			editor._emit("mousewheel", mouseEvent, editor);
			if (!mouseEvent.propagationStopped) {
				vX = vY = 0;
			}
		}
		else {
			var ev = new MouseEvent(e, editor);
			var pos = ev.getDocumentPosition();
			if (mode == "cursor")
				editor.selection.moveCursorToPosition(pos);
			else if (mode == "anchor")
				editor.selection.setAnchor(pos.row, pos.column);
			editor.renderer.scrollCursorIntoView(pos);
			e.preventDefault();
		}
	}, editor);

	function animate() {
		animationSteps += 60;
		animationTimer = setInterval(function() {
			if (animationSteps-- <= 0) {
				clearInterval(animationTimer);
				animationTimer = null;
			}
			if (Math.abs(vX) < 0.01) vX = 0;
			if (Math.abs(vY) < 0.01) vY = 0;
			if (animationSteps < 20) vX = 0.9 * vX;
			if (animationSteps < 20) vY = 0.9 * vY;
			var oldScrollTop = editor.session.getScrollTop();
			editor.renderer.scrollBy(10 * vX, 10 * vY);
			if (oldScrollTop == editor.session.getScrollTop())
				animationSteps = 0;
		}, 10);
	}
};
