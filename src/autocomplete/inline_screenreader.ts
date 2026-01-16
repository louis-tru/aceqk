"use strict";

import {Box, Text, Label} from "quark";
import type {Editor} from "../editor";
import type { AcePopup } from "./popup";
import { getChildren } from "../lib/dom";
 
/**
 * This object is used to communicate inline code completions rendered into an editor with ghost text to screen reader users.
 */
export class AceInlineScreenReader {
	editor: Editor;
	screenReaderDiv: Box

	/**
	 * Creates the off-screen div in which the ghost text content in redered and which the screen reader reads.
	 * @param {Editor} editor
	 */
	constructor(editor: Editor) {
		this.editor = editor;
		// this.screenReaderDiv = document.createElement("div");
		this.screenReaderDiv = new Box(editor.window);
		this.screenReaderDiv.class = ["ace_screenreader-only"];
		this.editor.container.append(this.screenReaderDiv);
	}

	private popup?: AcePopup;
	private _lines: string[] = [];

	/**
	 * Set the ghost text content to the screen reader div
	 * @param {string} content
	 */
	setScreenReaderContent(content: string) {
		// Path for when inline preview is used with 'normal' completion popup.
		if (!this.popup && this.editor.completer && this.editor.completer.popup) {
			this.popup = this.editor.completer.popup;

			this.popup.renderer.on("afterRender", ()=>{
				let row = this.popup!.getRow();
				let t = this.popup!.renderer.$textLayer;
				let childNodes = getChildren(t.element);
				let selected = childNodes[row - t.config.firstRow];
				if (selected) {
					let idString = "doc-tooltip ";
					for (let lineIndex = 0; lineIndex < this._lines.length; lineIndex++) {
						idString += `ace-inline-screenreader-line-${lineIndex} `;
					}
					selected.setAttribute("aria-describedby", idString);      
				}
			});
		}

		// TODO: Path for when special inline completion popup is used.
		// https://github.com/ajaxorg/ace/issues/5348

		// Remove all children of the div
		while (this.screenReaderDiv.first) {
			this.screenReaderDiv.first.remove();
		}
		this._lines = content.split(/\r\n|\r|\n/);
		const codeElement = this.createCodeBlock();
		this.screenReaderDiv.append(codeElement);
	}

	destroy() {
		this.screenReaderDiv.remove();
	}

	/**
	 * Take this._lines, render it as <code> blocks and add those to the screen reader div.
	 */
	createCodeBlock() {
		// const container = document.createElement("pre");
		const window = this.editor.window;
		const container = new Box(window);
		container.setAttribute("id", "ace-inline-screenreader");

		for (let lineIndex = 0; lineIndex < this._lines.length; lineIndex++) {
			// const codeElement = document.createElement("code");
			const codeElement = new Text(window);
			codeElement.setAttribute("id", `ace-inline-screenreader-line-${lineIndex}`);
			// const line = document.createTextNode(this._lines[lineIndex]);
			const line = new Label(window);
			line.value = this._lines[lineIndex];

			codeElement.append(line);
			container.append(codeElement);
		}

		return container;
	}
}