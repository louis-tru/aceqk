
import {Text} from "./text";
import {EditSession} from "../edit_session";
import { IRange } from "../range";
import { View, Label, Text as TextView, ViewType } from "quark";
import type { VirtualRenderer } from "../virtual_renderer";
import {Editor} from "../editor";
import config from "../config";
import { removeClassRecursive,getChildren,replaceChild } from "../lib/dom";

export type TextMarker = {
	range: IRange;
	id: number;
	className: string;
};

export type TextMarkerMixin = typeof textMarkerMixin;

const textMarkerMixin = {
	/**
	 * @param {string} className
	 * @this {Text}
	 */
	$removeClass(this: Text, className: string) {
		removeClassRecursive(this.element, className, true);
	},
	/**
	 * @this {Text}
	 */
	$applyTextMarkers(this: Text) {
		if (this.session.$scheduleForRemove) {
			this.session.$scheduleForRemove.forEach(className => {
				this.$removeClass(className);
			});

			this.session.$scheduleForRemove = new Set();
		}

		const textMarkers = this.session.getTextMarkers();

		if (textMarkers.length === 0) {
			return;
		}

		const classNameGroups = new Set<string>();
		textMarkers.forEach(marker => {
			classNameGroups.add(marker.className);
		});

		classNameGroups.forEach(className => {
			this.$removeClass(className);
		});

		textMarkers.forEach((marker) => {
			for (let row = marker.range.start.row; row <= marker.range.end.row; row++) {
				const cell = this.$lines.cells.find((el) => el.row === row);

				if (cell) {
					this.$modifyDomForMarkers(cell.element, row, marker);
				}
			}
		});
	},
	/**
	 * @param {View} lineElement
	 * @param {number} row
	 * @param {TextMarker} marker
	 * @this {Text}
	 */
	$modifyDomForMarkers(this: Text, lineElement: View, row: number, marker: TextMarker) {
		const lineLength = this.session.getLine(row).length;
		let startCol = row > marker.range.start.row ? 0 : marker.range.start.column;
		let endCol = row < marker.range.end.row ? lineLength : marker.range.end.column;

		var lineElements: View[] = [];
		if (lineElement.cssclass.has('ace_line_group')) {
			lineElements = getChildren(lineElement);
		}
		else {
			lineElements = [lineElement];
		}

		var currentColumn = 0;
		lineElements.forEach((lineElement) => {
			const childNodes = getChildren(lineElement);
			for (let i = 0; i < childNodes.length; i++) {
				let subChildNodes = [childNodes[i]];
				let parentNode = lineElement;
				let childNodes2 = getChildren(childNodes[i]);
				if (childNodes2.length > 0) {
					subChildNodes = childNodes2;
					parentNode = childNodes[i];
				}
				for (let j = 0; j < subChildNodes.length; j++) {
					const node = subChildNodes[j] as (Label|TextView) & { charCount?: number };
					const nodeText = node.value || '';
					const contentLength = node["charCount"] || (node.parent as Label & { charCount?: number })["charCount"] || nodeText.length;
					const nodeStart = currentColumn;
					const nodeEnd = currentColumn + contentLength;

					if (node["charCount"] === 0 || contentLength === 0) {
						continue;
					}

					if (nodeStart < endCol && nodeEnd > startCol) {
						// if (node.nodeType === 3) { // text node
						if (node.viewType == ViewType.Label) { // label view
							const beforeSelection = Math.max(0, startCol - nodeStart);
							const afterSelection = Math.max(0, nodeEnd - endCol);
							const selectionLength = contentLength - beforeSelection - afterSelection;

							if (beforeSelection > 0 || afterSelection > 0) {
								const fragment: Label[] = [];//this.dom.createFragment(this.element);

								if (beforeSelection > 0) {
									fragment.push(
										this.createTextNode(nodeText.substring(0, beforeSelection)));
								}

								if (selectionLength > 0) {
									// const selectedSpan = this.dom.createElement('span');
									const selectedSpan = new Label(this.element.window);
									selectedSpan.addClass(marker.className);
									selectedSpan.value = nodeText.substring(
										beforeSelection,
										beforeSelection + selectionLength
									);
									fragment.push(selectedSpan);
								}

								if (afterSelection > 0) {
									fragment.push(
										this.createTextNode(
											nodeText.substring(beforeSelection + selectionLength)
										));
								}

								// parentNode.replaceChild(fragment, node);
								replaceChild(node, fragment);
							}
							else {
								// const selectedSpan = this.dom.createElement('span');
								const selectedSpan = new Label(this.element.window) as Label & {"charCount"?: number};
								selectedSpan.addClass(marker.className);
								selectedSpan.value = nodeText;
								selectedSpan["charCount"] = node["charCount"];
								// parentNode.replaceChild(selectedSpan, node);
								node.after(selectedSpan); // insert after
								node.remove(); // remove original
							}
						}
						// else if (node.nodeType === 1) { //element node
						else {
							if (nodeStart >= startCol && nodeEnd <= endCol) {
								node.addClass(marker.className);
							}
							else {
								const beforeSelection = Math.max(0, startCol - nodeStart);
								const afterSelection = Math.max(0, nodeEnd - endCol);
								const selectionLength = contentLength - beforeSelection - afterSelection;

								if (beforeSelection > 0 || afterSelection > 0) {
									const nodeClasses = node.class;
									const fragment: Label[] = [];//this.dom.createFragment(this.element);

									if (beforeSelection > 0) {
										// const beforeSpan = this.dom.createElement('span');
										const beforeSpan = new Label(this.element.window);
										beforeSpan.class = nodeClasses;
										beforeSpan.value = nodeText.substring(0, beforeSelection);
										fragment.push(beforeSpan);
									}

									if (selectionLength > 0) {
										// const selectedSpan = this.dom.createElement('span');
										const selectedSpan = new Label(this.element.window);
										selectedSpan.class = [...nodeClasses, marker.className];
										selectedSpan.value = nodeText.substring(
											beforeSelection,
											beforeSelection + selectionLength
										);
										fragment.push(selectedSpan);
									}

									if (afterSelection > 0) {
										// const afterSpan = this.dom.createElement('span');
										const afterSpan = new Label(this.element.window);
										afterSpan.class = nodeClasses;
										afterSpan.value = nodeText.substring(beforeSelection + selectionLength);
										fragment.push(afterSpan);
									}

									// parentNode.replaceChild(fragment, node);
									replaceChild(node, fragment);
								}
							}
						}
					}
					currentColumn = nodeEnd;
				}
			}
		});
	}
};
Object.assign(Text.prototype, textMarkerMixin);

export type EditSessionTextMarkerMixin = typeof editSessionTextMarkerMixin;

export type TextMarkers = EditSessionTextMarkerMixin & {
	$textMarkers: TextMarker[];
	$textMarkerId: number;
	$scheduleForRemove: Set<string>;
};

const editSessionTextMarkerMixin = {
	/**
	 * Adds a text marker to the current edit session.
	 *
	 * @param {IRange} range - The range to mark in the document
	 * @param {string} className - The CSS class name to apply to the marked text
	 * @returns {number} The unique identifier for the added text marker
	 *
	 * @this {EditSession}
	 */
	addTextMarker(this: EditSession, range: IRange, className: string): number {
		/**@type{number}*/
		this.$textMarkerId = this.$textMarkerId || 0;
		this.$textMarkerId++;
		var marker = {
			range: range,
			id: this.$textMarkerId,
			className: className
		};
		if (!this.$textMarkers) {
			this.$textMarkers = [];
		}
		this.$textMarkers[marker.id] = marker;
		return marker.id;
	},
	/**
	 * Removes a text marker from the current edit session.
	 *
	 * @param {number} markerId - The unique identifier of the text marker to remove
	 *
	 * @this {EditSession}
	 */
	removeTextMarker(this: EditSession, markerId: number) {
		if (!this.$textMarkers) {
			return;
		}

		const marker = this.$textMarkers[markerId];
		if (!marker) {
			return;
		}
		if (!this.$scheduleForRemove) {
			this.$scheduleForRemove = new Set();
		}
		this.$scheduleForRemove.add(marker.className);
		delete this.$textMarkers[markerId];
	},
	/**
	 * Retrieves the text markers associated with the current edit session.
	 *
	 * @returns {TextMarker[]} An array of text markers, or an empty array if no markers exist
	 *
	 * @this {EditSession}
	 */
	getTextMarkers(this: EditSession): TextMarker[] {
		return this.$textMarkers || [];
	}
};
Object.assign(EditSession.prototype, editSessionTextMarkerMixin);

const onAfterRender = (e: any, renderer: VirtualRenderer) => {
	renderer.$textLayer.$applyTextMarkers();
};

config.defineOptions(Editor.prototype, "editor", {
	enableTextMarkers: {
		/**
		 * @param {boolean} val
		 * @this {Editor}
		 */
		set: function (this: Editor, val: boolean) {
			if (val) {
				this.renderer.on("afterRender", onAfterRender);
			}
			else {
				this.renderer.off("afterRender", onAfterRender);
			}
		},
		value: true
	}
});