"use strict";

import {View, Morph, Box} from "quark";
import {StyleSheets} from "quark/css";
import {Range} from "../range";
import type {LayerConfig} from "./lines";
import type { EditSession } from "../edit_session";

export type MarkerRenderer = (html: string[],
						range: Range,
						left: number,
						top: number,
						config: any) => void;

export interface MarkerLike {
	range?: Range;
	type?: string | number;
	renderer?: MarkerRenderer;
	inFront?: boolean;
	id?: number;
	clazz: string;
	update: (html: string[],
				// TODO maybe define Marker class
				marker: Marker,
				session: EditSession,
				config: LayerConfig) => void;
	// [key: string]: any;
	setRegexp?(regExp?: RegExp): void;
	regExp?: RegExp;
}

export class Marker {
	private $padding = 0;
	public element: Morph & {childNodes: View[]};
	private session: EditSession;

	/**
	 * @param {View} parentEl
	 */
	constructor(parentEl: View) {
		// this.element = dom.createElement("div");
		this.element = new Morph(parentEl.window) as typeof this.element;
		this.element.childNodes = [];
		this.element.class = ["ace_layer", "ace_marker-layer"];
		this.element.style.layout = 'free'; // allow absolute positioning of children
		parentEl.append(this.element);
	}

	/**
	 * @param {number} padding
	 */
	setPadding(padding: number) {
		this.$padding = padding;
	}

	/**
	 * @param {EditSession} session
	 */
	setSession(session: EditSession) {
		this.session = session;
	}

	private markers: { [x: number]: MarkerLike };

	/**
	 * @param {{ [x: number]: MarkerLike; }} markers
	 */
	setMarkers(markers: { [x: number]: MarkerLike }) {
		this.markers = markers;
	}

	private i = 0;

	/**
	 * @param {string} className
	 * @param {StyleSheets} css
	 */
	elt(className: string, css: StyleSheets) {
		/**@type {any}*/
		var childNodes = this.element.childNodes;
		var x = this.i != -1 && childNodes[this.i];
		if (!x) {
			// x = document.createElement("div");
			x = new Box(this.element.window);
			this.element.append(x);
			childNodes.push(x); // also add to childNodes array
			this.i = -1;
		} else {
			this.i++;
		}
		// x.style.cssText = css;
		Object.assign(x.style, css);
		x.class = className.split(" ");
	}

	private config?: LayerConfig;

	/**
	 * @param {LayerConfig} config
	 */
	update(config: LayerConfig) {
		if (!config) return;

		this.config = config;

		this.i = 0;
		var html: string[] = [];
		for (var key in this.markers) {
			var marker = this.markers[key];

			if (!marker.range) {
				marker.update(html, this, this.session, config);
				continue;
			}

			var range = marker.range.clipRows(config.firstRow, config.lastRow);
			if (range.isEmpty()) continue;

			range = range.toScreenRange(this.session);
			if (marker.renderer) {
				var top = this.$getTop(range.start.row, config);
				var left = this.$padding + range.start.column * config.characterWidth;
				marker.renderer(html, range, left, top, config);
			} else if (marker.type == "fullLine") {
				this.drawFullLineMarker(html, range, marker.clazz, config);
			} else if (marker.type == "screenLine") {
				this.drawScreenLineMarker(html, range, marker.clazz, config);
			} else if (range.isMultiLine()) {
				if (marker.type == "text")
					this.drawTextMarker(html, range, marker.clazz, config);
				else
					this.drawMultiLineMarker(html, range, marker.clazz, config);
			} else {
				this.drawSingleLineMarker(html, range, marker.clazz + " ace_start" + " ace_br15", config);
			}
		}
		if (this.i !=-1) {
			while (this.i < this.element.childNodes.length) {
				const last = this.element.last!;
				last.remove();
				this.element.childNodes.deleteOf(last); // also remove from childNodes array
			}
		}
	}

	/**
	 * @param {number} row
	 * @param {Partial<LayerConfig>} layerConfig
	 */
	$getTop(row: number, layerConfig: {firstRowScreen: number, lineHeight: number}): number {
		return (row - layerConfig.firstRowScreen) * layerConfig.lineHeight;
	}

	// Draws a marker, which spans a range of text on multiple lines 
	/**
	 * @param {undefined} stringBuilder
	 * @param {Range} range
	 * @param {string} clazz
	 * @param {Partial<LayerConfig>} layerConfig
	 * @param {string} [extraStyle]
	 */
	drawTextMarker(stringBuilder: string[], range: Range, clazz: string, layerConfig: LayerConfig, extraStyle?: StyleSheets) {
		var session = this.session;
		var start = range.start.row;
		var end = range.end.row;
		var row = start;
		var prev = 0; 
		var curr = 0;
		var next = session.getScreenLastRowColumn(row);
		var lineRange = new Range(row, range.start.column, row, curr);
		for (; row <= end; row++) {
			lineRange.start.row = lineRange.end.row = row;
			lineRange.start.column = row == start ? range.start.column : session.getRowWrapIndent(row);
			lineRange.end.column = next;
			prev = curr;
			curr = next;
			next = row + 1 < end ? session.getScreenLastRowColumn(row + 1) : row == end ? 0 : range.end.column;
			this.drawSingleLineMarker(stringBuilder, lineRange, 
				clazz + (row == start  ? " ace_start" : "") + " ace_br"
					+ getBorderClass(row == start || row == start + 1 && range.start.column, prev < curr, curr > next, row == end),
				layerConfig, row == end ? 0 : 1, extraStyle);
		}
	}

	// Draws a multi line marker, where lines span the full width
	/**
	 * @param {string[]} stringBuilder
	 * @param {Range} range
	 * @param {string} clazz
	 * @param {LayerConfig} config
	 * @param {string} [extraStyle]
	 */
	drawMultiLineMarker(stringBuilder: string[], range: Range, clazz: string, config: LayerConfig, extraStyle?: StyleSheets) {
		// from selection start to the end of the line
		var padding = this.$padding;
		var height = config.lineHeight;
		var top = this.$getTop(range.start.row, config);
		var left = padding + range.start.column * config.characterWidth;

		if (this.session.$bidiHandler.isBidiRow(range.start.row)) {
			 var range1 = range.clone();
			 range1.end.row = range1.start.row;
			 range1.end.column = this.session.getLine(range1.start.row).length;
			 this.drawBidiSingleLineMarker(stringBuilder, range1, clazz + " ace_br1 ace_start", config, void 0, extraStyle);
		} else {
			this.elt(
				clazz + " ace_br1 ace_start",
				{
					width: 'match',
					height: height,
					marginRight: padding,
					marginTop: top,
					marginLeft: left,
					...extraStyle,
				}
			);
		}
		// from start of the last line to the selection end
		if (this.session.$bidiHandler.isBidiRow(range.end.row)) {
			 var range1 = range.clone();
			 range1.start.row = range1.end.row;
			 range1.start.column = 0;
			 this.drawBidiSingleLineMarker(stringBuilder, range1, clazz + " ace_br12", config, void 0, extraStyle);
		} else {
			top = this.$getTop(range.end.row, config);
			var width = range.end.column * config.characterWidth;

			this.elt(
				clazz + " ace_br12",
				{
					"height": height,
					"width": width,
					"marginTop": top,
					"marginLeft": padding,
					...extraStyle
				}
			);
		}
		// all the complete lines
		height = (range.end.row - range.start.row - 1) * config.lineHeight;
		if (height <= 0)
			return;
		top = this.$getTop(range.start.row + 1, config);
		
		var radiusClass = (range.start.column ? 1 : 0) | (range.end.column ? 0 : 8);

		this.elt(
			clazz + (radiusClass ? " ace_br" + radiusClass : ""),
			{
				width: 'match',
				height: height,
				marginRight: padding,
				marginTop: top,
				marginLeft: padding,
				...extraStyle
			}
		);
	}

	// Draws a marker which covers part or whole width of a single screen line
	/**
	 * @param {undefined} stringBuilder
	 * @param {Range} range
	 * @param {string} clazz
	 * @param {Partial<LayerConfig>} config
	 * @param {number} [extraLength]
	 * @param {string} [extraStyle]
	 */
	drawSingleLineMarker(stringBuilder: string[], range: Range, clazz: string, config: LayerConfig, extraLength?: number, extraStyle?: StyleSheets) {
		if (this.session.$bidiHandler.isBidiRow(range.start.row))
			return this.drawBidiSingleLineMarker(stringBuilder, range, clazz, config, extraLength, extraStyle);
		var height = config.lineHeight;
		var width = (range.end.column + (extraLength || 0) - range.start.column) * config.characterWidth;

		var top = this.$getTop(range.start.row, config);
		var left = this.$padding + range.start.column * config.characterWidth;

		this.elt(
			clazz,
			{
				height: height,
				width: width,
				marginTop: top,
				marginLeft: left,
				...extraStyle
			}
		);
	}

	// Draws Bidi marker which covers part or whole width of a single screen line
	/**
	 * @param {string[]} stringBuilder
	 * @param {Range} range
	 * @param {string} clazz
	 * @param {Partial<LayerConfig>} config
	 * @param {number} extraLength
	 * @param {string} extraStyle
	 */
	drawBidiSingleLineMarker(stringBuilder: string[], range: Range, clazz: string, config: LayerConfig, extraLength?: number, extraStyle?: StyleSheets) {
		var height = config.lineHeight, top = this.$getTop(range.start.row, config), padding = this.$padding;
		var selections = this.session.$bidiHandler.getSelections(range.start.column, range.end.column);

		selections.forEach((selection) => {
			this.elt(
				clazz,
				{
					height: height,
					width: (selection.width + (extraLength || 0)),
					marginTop: top,
					marginLeft: (padding + selection.left),
					...extraStyle,
				}
			);
		});
	}

	/**
	 * @param {string[]} stringBuilder
	 * @param {Range} range
	 * @param {string} clazz
	 * @param {Partial<LayerConfig>} config
	 * @param {undefined} [extraStyle]
	 */
	drawFullLineMarker(stringBuilder: string[], range: Range, clazz: string, config: LayerConfig, extraStyle?: StyleSheets) {
		var top = this.$getTop(range.start.row, config);
		var height = config.lineHeight;
		if (range.start.row != range.end.row)
			height += this.$getTop(range.end.row, config) - top;

		this.elt(
			clazz,
			{
				width: 'match',
				height: height,
				marginTop: top,
				marginLeft: 0,
				marginRight: 0,
				...extraStyle
			}
		);
	}

	/**
	 * @param {undefined} stringBuilder
	 * @param {Range} range
	 * @param {string} clazz
	 * @param {Partial<LayerConfig>} config
	 * @param {undefined} [extraStyle]
	 */
	drawScreenLineMarker(stringBuilder: string[], range: Range, clazz: string, config: LayerConfig, extraStyle?: StyleSheets) {
		var top = this.$getTop(range.start.row, config);
		var height = config.lineHeight;

		this.elt(
			clazz,
			{
				width: 'match',
				height: height,
				marginTop: top,
				marginLeft: 0,
				marginRight: 0,
				...extraStyle
			}
		);
	}

}

function getBorderClass(tl: any, tr: any, br: any, bl: any) {
	return (tl ? 1 : 0) | (tr ? 2 : 0) | (br ? 4 : 0) | (bl ? 8 : 0);
}
