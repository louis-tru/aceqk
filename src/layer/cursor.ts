"use strict";

import type { EditSession } from "../edit_session";
import type {Point} from "../range";
import {View, Morph} from "quark";
import type { LayerConfig } from "./lines";
import { Vec2 } from "quark/types";

export interface Cursor {
	timeoutId?: TimeoutResult;
}

export type DrawCursor = (
	element: Morph,
	pixelPos: {left: number,  top: number},
	config: LayerConfig,
	selection: {cursor: Point | null},
	session: EditSession
) => void;

export class Cursor {
	private $padding = 0;
	private drawCursor?: DrawCursor;
	public element: Morph;
	private isVisible = false;
	public isBlinking = true;
	private blinkInterval = 1000;
	private smoothBlinking = false;
	private session: EditSession;
	private cursors: Morph[] = [];
	private cursor: Morph;
	private $updateCursors: (val: boolean) => void;
	private intervalId?: TimeoutResult;
	private $isSmoothBlinking?: boolean;
	public config?: LayerConfig;
	private overwrite = false;
	private $isAnimating = false;

	/**
	 * @param {View} parentEl
	 */
	constructor(parentEl: View) {
		// this.element = dom.createElement("div");
		this.element = new Morph(parentEl.window);
		this.element.class = ["ace_layer", "ace_cursor-layer", "ace_hidden-cursors"];
		this.element.style.layout = 'free';
		parentEl.append(this.element);

		this.cursor = this.addCursor();
		this.$updateCursors = this.$updateOpacity.bind(this);
	}

	/**
	 * @param {boolean} [val]
	 */
	private $updateOpacity(val?: boolean) {
		var cursors = this.cursors;
		for (var i = cursors.length; i--; )
			cursors[i].opacity = val ? 1 : 0;
	}

	$startCssAnimation() {
		// var cursors = this.cursors;
		// for (var i = cursors.length; i--; )
		// 	cursors[i].style.animationDuration = this.blinkInterval + "ms";
		// this.$isAnimating = true;
		// setTimeout(() => {
		// 	if (this.$isAnimating) {
		// 		this.element.addClass("ace_animate-blinking");
		// 	}
		// });
	}
	
	$stopCssAnimation() {
		this.$isAnimating = false;
		this.element.removeClass("ace_animate-blinking");
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

	/**
	 * @param {boolean} blinking
	 */
	setBlinking(blinking: boolean) {
		if (blinking != this.isBlinking) {
			this.isBlinking = blinking;
			this.restartTimer();
		}
	}

	/**
	 * @param {number} blinkInterval
	 */
	setBlinkInterval(blinkInterval: number) {
		if (blinkInterval != this.blinkInterval) {
			this.blinkInterval = blinkInterval;
			this.restartTimer();
		}
	}

	/**
	 * @param {boolean} smoothBlinking
	 */
	setSmoothBlinking(smoothBlinking: boolean) {
		if (smoothBlinking != this.smoothBlinking) {
			this.smoothBlinking = smoothBlinking;
			this.element.cssclass[smoothBlinking ? "add" : "remove"]("ace_smooth-blinking");
			this.$updateCursors(true);
			this.restartTimer();
		}
	}

	addCursor() {
		// var el = dom.createElement("div");
		var el = new Morph(this.element.window);
		el.class = ["ace_cursor"];
		this.element.append(el);
		this.cursors.push(el);
		return el;
	}

	removeCursor() {
		if (this.cursors.length > 1) {
			var el = this.cursors.pop()!;
			el.remove();
			return el;
		}
	}

	hideCursor() {
		this.isVisible = false;
		this.element.addClass("ace_hidden-cursors");
		this.restartTimer();
	}

	showCursor() {
		this.isVisible = true;
		this.element.removeClass("ace_hidden-cursors");
		this.restartTimer();
	}

	restartTimer() {
		var update = this.$updateCursors;
		clearInterval(this.intervalId);
		clearTimeout(this.timeoutId);
		this.$stopCssAnimation();

		if (this.smoothBlinking) {
			this.$isSmoothBlinking = false;
			this.element.removeClass("ace_smooth-blinking");
		}
		
		update(true);

		if (!this.isBlinking || !this.blinkInterval || !this.isVisible) {
			this.$stopCssAnimation();
			return;
		}

		if (this.smoothBlinking) {
			this.$isSmoothBlinking = true;
			setTimeout(() => {
				if (this.$isSmoothBlinking) {
					this.element.addClass("ace_smooth-blinking");
				}
			});
		}
		
		// TODO : CSS Animation
		if (false/*dom.HAS_CSS_ANIMATION*/) {
			this.$startCssAnimation();
		} else {
			var blink = /**@this{Cursor}*/() => {
				/**@type{ReturnType<typeof setTimeout>}*/
				this.timeoutId = setTimeout(function() {
					update(false);
				}, 0.6 * this.blinkInterval);
			};

			/**@type{ReturnType<typeof setInterval>}*/
			this.intervalId = setInterval(function() {
				update(true);
				blink();
			}, this.blinkInterval);
			blink();
		}
	}

	/**
	 * @param {Point} [position]
	 * @param {boolean} [onScreen]
	 */
	getPixelPosition(position?: Point, onScreen?: boolean) {
		if (!this.config || !this.session)
			return {left : 0, top : 0};

		if (!position)
			position = this.session.selection.getCursor();
		var pos = this.session.documentToScreenPosition(position);
		var cursorLeft = this.$padding + (this.session.$bidiHandler.isBidiRow(pos.row, position.row)
			? this.session.$bidiHandler.getPosLeft(pos.column)
			: pos.column * this.config.characterWidth);

		var cursorTop = (pos.row - (onScreen ? this.config.firstRowScreen : 0)) *
			this.config.lineHeight;

		return {left : cursorLeft, top : cursorTop};
	}

	isCursorInView(pixelPos: {top: number}, config: LayerConfig) {
		return pixelPos.top >= 0 && pixelPos.top < config.maxHeight;
	}

	public $pixelPos?: {left: number, top: number};

	update(config: LayerConfig) {
		this.config = config;

		var selections = this.session.$selectionMarkers;
		var i = 0, cursorIndex = 0;

		if (selections === undefined || selections.length === 0){
			selections = [{cursor: null}];
		}

		var pixelPos: typeof this.$pixelPos;

		for (var i = 0, n = selections.length; i < n; i++) {
			pixelPos = this.getPixelPosition(selections[i].cursor, true);
			if ((pixelPos.top > config.height + config.offset ||
				 pixelPos.top < 0) && i > 1) {
				continue;
			}

			var element = this.cursors[cursorIndex++] || this.addCursor();
			var style = element.style;
			
			if (!this.drawCursor) {
				if (!this.isCursorInView(pixelPos, config)) {
					style.visible = false;
				} else {
					style.visible = true;
					style.translate = Vec2.new(pixelPos.left, pixelPos.top);
					style.width = Math.round(config.characterWidth);
					style.height = config.lineHeight;
				}
			} else {
				this.drawCursor(element, pixelPos, config, selections[i], this.session);
			}
		}
		while (this.cursors.length > cursorIndex)
			this.removeCursor();

		var overwrite = this.session.getOverwrite();
		this.$setOverwrite(overwrite);

		// cache for textarea and gutter highlight
		this.$pixelPos = pixelPos;
		this.restartTimer();
	}

	/**
	 * @param {boolean} overwrite
	 */
	$setOverwrite(overwrite: boolean) {
		if (overwrite != this.overwrite) {
			this.overwrite = overwrite;
			if (overwrite)
				this.element.addClass("ace_overwrite-cursors");
			else
				this.element.removeClass("ace_overwrite-cursors");
		}
	}

	destroy() {
		clearInterval(this.intervalId);
		clearTimeout(this.timeoutId);
	}

}
