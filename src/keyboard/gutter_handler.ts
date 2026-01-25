"use strict";

import * as keys from '../lib/keys';
import type {Editor} from '../editor';
import type {Text} from 'quark';
import type { Lines } from '../layer/lines';
import type { KeyEvent } from 'quark/event';
import type { Gutter } from '../layer/gutter';
import type { GutterTooltip } from '../mouse/default_gutter_handler';

/*
 * Custom Ace gutter keyboard handler
 */
export class GutterKeyboardHandler {
	private editor: Editor;
	private gutterLayer: Gutter;
	private element: Text;
	private lines: Lines;
	public activeRowIndex: number | null;
	public activeLane: "fold" | "annotation" | null;
	private annotationTooltip: GutterTooltip;

	constructor(editor: Editor) {
		this.editor = editor;
		this.gutterLayer = editor.renderer.$gutterLayer;
		this.element = editor.renderer.$gutter;
		this.lines = editor.renderer.$gutterLayer.$lines;

		this.activeRowIndex = null;
		this.activeLane = null;

		this.annotationTooltip = this.editor.$mouseHandler.$tooltip!;
	}

	addListener() {
		this.element.onKeyDown.on(this.$onGutterKeyDown.bind(this));
		this.element.onBlur.on(this.$blurGutter.bind(this));
		this.editor.on("mousewheel", this.$blurGutter.bind(this));
	}

	removeListener() {
		this.element.onKeyDown.off(this.$onGutterKeyDown.bind(this));
		this.element.onBlur.off(this.$blurGutter.bind(this));
		this.editor.off("mousewheel", this.$blurGutter.bind(this));
	}

	$onGutterKeyDown(e: KeyEvent) {
		// if the tooltip is open, we only want to respond to commands to close it (like a modal)
		if (this.annotationTooltip.isOpen) {
			e.cancelDefault();

			if (e.keycode === keys.default["escape"])
				this.annotationTooltip.hide();

			return;
		}

		// If focus is on the gutter element, set focus to nearest gutter icon on enter press.
		if (e.origin === this.element) {
			if (e.keycode != keys.default["enter"]) {return;}
			e.cancelDefault();

			// Scroll if the cursor is not currently within the viewport.
			var row = this.editor.getCursorPosition().row;
			if (!this.editor.isRowVisible(row))
				this.editor.scrollToLine(row, true, true);

			// After scrolling is completed, find the nearest gutter icon and set focus to it.
			setTimeout(()=>{
				var index = this.$rowToRowIndex(this.gutterLayer.$cursorCell!.row);
				var nearestFoldLaneWidgetIndex = this.$findNearestFoldLaneWidget(index);
				var nearestAnnotationIndex = this.$findNearestAnnotation(index);

				if (nearestFoldLaneWidgetIndex === null && nearestAnnotationIndex === null) return;

				var futureActiveRowIndex = this.$findClosestNumber(nearestFoldLaneWidgetIndex, nearestAnnotationIndex, index);

				if (futureActiveRowIndex === nearestFoldLaneWidgetIndex) {
					this.activeLane = "fold";
					this.activeRowIndex = nearestFoldLaneWidgetIndex;
					if(this.$isCustomWidgetVisible(nearestFoldLaneWidgetIndex)){
						this.$focusCustomWidget(this.activeRowIndex);
						return;
					}
					else {
						this.$focusFoldWidget(this.activeRowIndex);
						return;
					}
				}
				else {
					this.activeRowIndex = nearestAnnotationIndex;
					this.activeLane = "annotation";
					this.$focusAnnotation(this.activeRowIndex);
					return;
				}
			}, 10);
			return;
		}

		// After here, foucs is on a gutter icon and we want to interact with them.
		this.$handleGutterKeyboardInteraction(e);

		// Wait until folding is completed and then signal gutterkeydown to the editor.
		setTimeout(() => {
			// Signal to the editor that a key is pressed inside the gutter.
			this.editor._signal("gutterkeydown", new GutterKeyboardEvent(e, this), this.editor);
		}, 10);
	}

	private lane: "fold" | "annotation" | null = null;

	$handleGutterKeyboardInteraction(e: KeyEvent) {
		// Prevent tabbing when interacting with the gutter icons.
		if (e.keycode === keys.default["tab"]){
			e.cancelDefault();
			return;
		} 

		// If focus is on a gutter icon, set focus to gutter on escape press.
		if (e.keycode === keys.default["escape"]) {
			e.cancelDefault();
			this.$blurGutter();
			this.element.focus();
			this.lane = null;
			return;
		}

		if (e.keycode === keys.default["up"]) {
			e.cancelDefault();
  
			switch (this.activeLane){
				case "fold":
					this.$moveFoldWidgetUp();
					break;
				
				case "annotation":
					this.$moveAnnotationUp();
					break;
			}
			return;
		}

		if (e.keycode === keys.default["down"]) {
			e.cancelDefault();

			switch (this.activeLane){
				case "fold":
					this.$moveFoldWidgetDown();
					break;
				
				case "annotation":
					this.$moveAnnotationDown();
					break;
			}
			return;
		}

		// Try to switch from fold widgets to annotations.
		if (e.keycode === keys.default["left"]){
			e.cancelDefault();
			this.$switchLane("annotation");
			return;
		}

		// Try to switch from annotations to fold widgets.
		if (e.keycode === keys.default["right"]){
			e.cancelDefault();
			this.$switchLane("fold");
			return;
		}

		if (e.keycode === keys.default["enter"] || e.keycode === keys.default["space"]){
			e.cancelDefault();

			switch (this.activeLane) {
				case "fold":
					var row = this.$rowIndexToRow(this.activeRowIndex!)!;
					var customWidget = this.editor.session.$gutterCustomWidgets[row];
					if (customWidget) {
						if (customWidget.callbacks && customWidget.callbacks.onClick) {
							customWidget.callbacks.onClick(e, row);
						}
					}
					else if (this.gutterLayer.session.foldWidgets![row] === 'start') {
						this.editor.session.onFoldWidgetClick(this.$rowIndexToRow(this.activeRowIndex!)!, e);
						// After folding, check that the right fold widget is still in focus.
						// If not (e.g. folding close to bottom of doc), put right widget in focus.
						setTimeout(
							()=>{
								if (this.$rowIndexToRow(this.activeRowIndex!) !== row) {
									this.$blurFoldWidget(this.activeRowIndex);
									this.activeRowIndex = this.$rowToRowIndex(row);
									this.$focusFoldWidget(this.activeRowIndex);
								}
						}, 10);
						break;
					} else if (this.gutterLayer.session.foldWidgets![this.$rowIndexToRow(this.activeRowIndex!)!] === 'end') {
						/* TO DO: deal with 'end' fold widgets */
						break;
					}
					return; 
				
				case "annotation":
					this.annotationTooltip.showTooltip(this.$rowIndexToRow(this.activeRowIndex!)!);
					this.annotationTooltip.$fromKeyboard = true;
					break;
			}
			return;
		}   
	}

	$blurGutter() {
		if (this.activeRowIndex !== null) {
			switch (this.activeLane){
				case "fold":
					this.$blurFoldWidget(this.activeRowIndex);
					this.$blurCustomWidget(this.activeRowIndex);
					break;

				case "annotation":
					this.$blurAnnotation(this.activeRowIndex);
					break;
			}
		}

		if (this.annotationTooltip.isOpen)
			this.annotationTooltip.hide();

		return;
	}

	$isFoldWidgetVisible(index: number | null) {
		var isRowFullyVisible = this.editor.isRowFullyVisible(this.$rowIndexToRow(index)!);
		var isIconVisible = this.$getFoldWidget(index)!.style.visible !== false;
		return isRowFullyVisible && isIconVisible;
	}

	$isCustomWidgetVisible(index: number | null) {
		var isRowFullyVisible = this.editor.isRowFullyVisible(this.$rowIndexToRow(index)!);
		var isIconVisible = !!this.$getCustomWidget(index);
		return isRowFullyVisible && isIconVisible;
	}

	$isAnnotationVisible(index: number | null) {
		var isRowFullyVisible = this.editor.isRowFullyVisible(this.$rowIndexToRow(index)!);
		var isIconVisible = this.$getAnnotation(index)!.style.visible !== false;
		return isRowFullyVisible && isIconVisible;
	}

	$getFoldWidget(index: number | null) {
		var cell = this.lines.get(index as number);
		var v = cell.element.first; // at 0
		if (!v) return null;
		return v.next; // at 1
	}

	$getCustomWidget(index: number | null) {
		var cell = this.lines.get(index as number);
		var v = cell.element.first; // at 0
		if (!v) return null;
		v = v.next; // at 1
		if (!v) return null;
		v = v.next; // at 2
		if (!v) return null;
		return v.next; // at 3
	}

	$getAnnotation(index: number | null) {
		var cell = this.lines.get(index as number);
		var v = cell.element.first; // at 0
		if (!v) return null;
		v = v.next; // at 1
		if (!v) return null;
		return v.next; // at 2
	}

	// Given an index, find the nearest index with a widget in fold lane
	$findNearestFoldLaneWidget(index: number | null) {
		if (index === null) return null;
		// If custom widget exists at index, return index
		if (this.$isCustomWidgetVisible(index))
			return index;

		// If fold widget exists at index, return index.
		if (this.$isFoldWidgetVisible(index))
			return index;

		// else, find the nearest index with widget within viewport.
		var i = 0;
		while (index - i > 0 || index + i < this.lines.getLength() - 1){
			i++;
			if (index - i >= 0 && this.$isCustomWidgetVisible(index - i))
				return index - i;

			if (index + i <= this.lines.getLength() - 1 && this.$isCustomWidgetVisible(index + i))
				return index + i;

			if (index - i >= 0 && this.$isFoldWidgetVisible(index - i))
				return index - i;

			if (index + i <= this.lines.getLength() - 1 && this.$isFoldWidgetVisible(index + i))
				return index + i;
		}

		// If there are no widgets within the viewport, return null.
		return null;
	}

	// Given an index, find the nearest index with an annotation.
	$findNearestAnnotation(index: number | null) {
		if (index === null) return null;
		// If annotation exists at index, return index.
		if (this.$isAnnotationVisible(index))
			return index;

		// else, find the nearest index with annotation within viewport.
		var i = 0;
		while (index - i > 0 || index + i < this.lines.getLength() - 1){
			i++;

			if (index - i >= 0 && this.$isAnnotationVisible(index - i))
				return index - i;

			if (index + i <= this.lines.getLength() - 1 && this.$isAnnotationVisible(index + i))
				return index + i;
		}

		// If there are no annotations within the viewport, return null.
		return null;
	}

	$focusFoldWidget(index: number | null) {
		if (index == null)
			return;

		var foldWidget = this.$getFoldWidget(index)!;

		foldWidget.addClass(this.editor.renderer.keyboardFocusClassName!);
		foldWidget.focus();
	}

	$focusCustomWidget(index: number | null) {
		if (index == null)
			return;

		var customWidget = this.$getCustomWidget(index);
		if (customWidget) {
			customWidget.addClass(this.editor.renderer.keyboardFocusClassName!);
			customWidget.focus();
		}
	}

	$focusAnnotation(index: number | null) {
		if (index == null)
			return;

		var annotation = this.$getAnnotation(index)!;

		annotation.addClass(this.editor.renderer.keyboardFocusClassName!);
		annotation.focus();
	}

	$blurFoldWidget(index: number | null) {
		var foldWidget = this.$getFoldWidget(index)!;

		foldWidget.removeClass(this.editor.renderer.keyboardFocusClassName!);
		foldWidget.blur();
	}

	$blurCustomWidget(index: number | null) {
		var customWidget = this.$getCustomWidget(index);
		if (customWidget) {
			customWidget.removeClass(this.editor.renderer.keyboardFocusClassName!);
			customWidget.blur();
		}
	}

	$blurAnnotation(index: number | null) {
		var annotation = this.$getAnnotation(index)!;

		annotation.removeClass(this.editor.renderer.keyboardFocusClassName!);
		annotation.blur();
	}

	$moveFoldWidgetUp() {
		var index = this.activeRowIndex!;

		while (index > 0){
			index--;

			if (this.$isFoldWidgetVisible(index) || this.$isCustomWidgetVisible(index)){
				this.$blurFoldWidget(this.activeRowIndex);
				this.$blurCustomWidget(this.activeRowIndex);
				this.activeRowIndex = index;
				if (this.$isFoldWidgetVisible(index)) {
					this.$focusFoldWidget(this.activeRowIndex);
				}
				else {
					this.$focusCustomWidget(this.activeRowIndex);
				}
				return;
			}
		}
		return;
	}

	$moveFoldWidgetDown() {
		var index = this.activeRowIndex!;

		while (index < this.lines.getLength() - 1){
			index++;

			if (this.$isFoldWidgetVisible(index) || this.$isCustomWidgetVisible(index)){
				this.$blurFoldWidget(this.activeRowIndex);
				this.$blurCustomWidget(this.activeRowIndex);
				this.activeRowIndex = index;
				if (this.$isFoldWidgetVisible(index)) {
					this.$focusFoldWidget(this.activeRowIndex);
				}
				else {
					this.$focusCustomWidget(this.activeRowIndex);
				}
				return;
			}
		}
		return;
	}

	$moveAnnotationUp() {
		var index = this.activeRowIndex!;

		while (index > 0){
			index--;

			if (this.$isAnnotationVisible(index)){
				this.$blurAnnotation(this.activeRowIndex);
				this.activeRowIndex = index;
				this.$focusAnnotation(this.activeRowIndex);
				return;
			}
		}
		return;
	}

	$moveAnnotationDown() {
		var index = this.activeRowIndex!;

		while (index < this.lines.getLength() - 1){
			index++;

			if (this.$isAnnotationVisible(index)){
				this.$blurAnnotation(this.activeRowIndex);
				this.activeRowIndex = index;
				this.$focusAnnotation(this.activeRowIndex);
				return;
			}
		}
		return;
	}

	$findClosestNumber(num1: number | null, num2: number | null, target: number | null) {
		if (num1 === null) return num2;
		if (num2 === null) return num1;
		if (target === null) return num1;

		return (Math.abs(target - num1) <= Math.abs(target - num2)) ? num1 : num2;
	}

	$switchLane(desinationLane: "annotation" | "fold" | null) {
		switch (desinationLane) {
			case "annotation":
				if (this.activeLane === "annotation") {break;}
				var annotationIndex = this.$findNearestAnnotation(this.activeRowIndex);
				if (annotationIndex == null) {break;}

				this.activeLane = "annotation";

				this.$blurFoldWidget(this.activeRowIndex);
				this.$blurCustomWidget(this.activeRowIndex);
				this.activeRowIndex = annotationIndex;
				this.$focusAnnotation(this.activeRowIndex);

				break;

			case "fold": 
			if (this.activeLane === "fold") {break;}
			var foldLaneWidgetIndex = this.$findNearestFoldLaneWidget(this.activeRowIndex);
			if (foldLaneWidgetIndex === null) {break;}

			this.activeLane = "fold";

			this.$blurAnnotation(this.activeRowIndex);

			this.activeRowIndex = foldLaneWidgetIndex;

			if (this.$isCustomWidgetVisible(foldLaneWidgetIndex)) {
				this.$focusCustomWidget(this.activeRowIndex);
			}
			else {
				this.$focusFoldWidget(this.activeRowIndex);
			}
				break;
		}
		return;
	}

	// Convert row index (viewport space) to row (document space).
	$rowIndexToRow(index: number | null) {
		var cell = this.lines.get(index as number);
		if (cell)
			return cell.row;
		return null;
	}

	// Convert row (document space) to row index (viewport space).
	$rowToRowIndex(row: number) {
		for (var i = 0; i < this.lines.getLength(); i++){
			var cell = this.lines.get(i);
			if (cell.row == row)
				return i;
		}
		return null;
	}
}

/*
 * Custom Ace gutter keyboard event
 */
export class GutterKeyboardEvent {
	private gutterKeyboardHandler: GutterKeyboardHandler;
	private domEvent: KeyEvent;
	constructor(domEvent: KeyEvent, gutterKeyboardHandler: GutterKeyboardHandler) {
		this.gutterKeyboardHandler = gutterKeyboardHandler;
		this.domEvent = domEvent;
	}

	/**
	 * Returns the key that was presssed.
	 * 
	 * @return {string} the key that was pressed.
	 */
	getKey() {
		return keys.keyCodeToString(this.domEvent.keycode);
	}

	/**
	 * Returns the row in the gutter that was focused after the keyboard event was handled.
	 * 
	 * @return {number} the key that was pressed.
	 */
	getRow() {
		return this.gutterKeyboardHandler.$rowIndexToRow(this.gutterKeyboardHandler.activeRowIndex);
	}

	/**
	 * Returns whether focus is on the annotation lane after the keyboard event was handled.
	 * 
	 * @return {boolean} true if focus was on the annotation lane after the keyboard event.
	 */
	isInAnnotationLane() {
		return this.gutterKeyboardHandler.activeLane === "annotation";
	}

	/**
	 * Returns whether focus is on the fold lane after the keyboard event was handled.
	 * 
	 * @return {boolean} true if focus was on the fold lane after the keyboard event.
	 */
	isInFoldLane() {
		return this.gutterKeyboardHandler.activeLane === "fold";
	}
}
