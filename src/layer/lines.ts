"use strict";

import { Box, Label, Morph } from "quark";
import type { EditSession } from "../edit_session";

export interface LayerConfig {
	width: number,
	padding: number,
	firstRow: number,
	firstRowScreen: number,
	lastRow: number,
	lineHeight: number,
	characterWidth: number,
	minHeight: number,
	maxHeight: number,
	offset: number,
	height: number,
	gutterOffset: number
}

export type CellElement = Box & {
	data: Dict;
	textNode: Label & {data: Dict};
	foldWidget: Box & {data: Dict};
	annotationNode: Box & {data: Dict};
	annotationIconNode: Box & {data: Dict};
	customWidget?: Box & {data: Dict};
};

export interface Cell<El extends Box = CellElement> {
	element: El;
	text: string;
	row: number;
}

export class Lines<El extends Box = CellElement> {
	private element: Morph;
	public canvasHeight: number;
	public cells: Cell<El>[] = [];
	private cellCache: Cell<El>[] = [];
	public $offsetCoefficient = 0;

	/**
	 * @param {Morph} element
	 * @param {number} [canvasHeight]
	 */
	constructor(element: Morph, canvasHeight?: number) {
		this.element = element;
		this.canvasHeight = canvasHeight || 500000;
		this.element.style.height = this.canvasHeight * 2;
	}

	/**
	 * @param {LayerConfig} config
	 */
	moveContainer(config: LayerConfig) {
		this.element.y = -((config.firstRowScreen * config.lineHeight) % this.canvasHeight) - config.offset * this.$offsetCoefficient;
		// this.element.marginTop = -((config.firstRowScreen * config.lineHeight) % this.canvasHeight) - config.offset * this.$offsetCoefficient;
	}

	/**
	 * @param {LayerConfig} oldConfig
	 * @param {LayerConfig} newConfig
	 */
	pageChanged(oldConfig: LayerConfig, newConfig: LayerConfig) {
		return (
			Math.floor((oldConfig.firstRowScreen * oldConfig.lineHeight) / this.canvasHeight) !==
			Math.floor((newConfig.firstRowScreen * newConfig.lineHeight) / this.canvasHeight)
		);
	}

	/**
	 * @param {number} row
	 * @param {Partial<LayerConfig>} config
	 * @param {EditSession} session
	 */
	computeLineTop(row: number, config: LayerConfig, session: EditSession) {
		var screenTop = config.firstRowScreen * config.lineHeight;
		var screenPage = Math.floor(screenTop / this.canvasHeight);
		var lineTop = session.documentToScreenRow(row, 0) * config.lineHeight;
		return lineTop - (screenPage * this.canvasHeight);
	}

	/**
	 * @param {number} row
	 * @param {LayerConfig} config
	 * @param {EditSession} session
	 */
	computeLineHeight(row: number, config: LayerConfig, session: EditSession) {
		return config.lineHeight * session.getRowLineCount(row);
	}
	
	getLength() {
		return this.cells.length;
	}

	/**
	 * @param {number} index
	 */
	get(index: number) {
		return this.cells[index];
	}

	shift() {
		this.$cacheCell(this.cells.shift());
	}
	
	pop() {
		this.$cacheCell(this.cells.pop());
	}

	push(cell: Cell<El>| Cell<El>[]) {
		if (Array.isArray(cell)) {
			this.cells.push(...cell);
			for (var i=0; i<cell.length; i++) {
				this.element.append(cell[i].element);
			}
		} else {
			this.cells.push(cell);
			this.element.append(cell.element);
		}
	}

	unshift(cell: Cell<El>| Cell<El>[]) {
		if (Array.isArray(cell)) {
			this.cells.unshift(...cell);
			for (var i=cell.length-1; i >= 0; i--) {
				this.element.prepend(cell[i].element);
			}
		} else {
			this.cells.unshift(cell);
			this.element.prepend(cell.element);
		}
	}
	
	last() {
		if (this.cells.length)
			return this.cells[this.cells.length-1];
		else
			return null;
	}
	
	$cacheCell(cell?: Cell<El>) {
		if (!cell)
			return;
		// cell.element.remove();
		cell.element.visible = false; // hide the element instead of removing it from DOM
		this.cellCache.push(cell);
	}

	createCell(row: number, config: LayerConfig, session: EditSession): Cell<Box>;
	createCell(row: number, config: LayerConfig, session: EditSession, initElement: (element: El) => void): Cell<El>;
	createCell(row: number, config: LayerConfig, session: EditSession, initElement?: (element: El) => void) {
		var cell = this.cellCache.pop(); // reuse cached cell
		if (!cell) {
			// var element = dom.createElement("div");
			var element = new Box(this.element.window) as El;
			element.data = {};
			if (initElement)
				initElement(element);

			this.element.append(element);

			cell = {
				element,
				text: "",
				row: row
			};
		}
		cell.row = row;
		// cell.element.visible = true; // make sure the element is visible

		return cell;
	}
	
}
