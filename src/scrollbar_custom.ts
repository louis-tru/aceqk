"use strict";

import type { MouseEvent } from "quark/event";
import * as dom from "./lib/dom";
import * as event from "./lib/event";
import type { MultiClickEvent } from "./lib/event";
import {EventEmitter} from "./lib/event_emitter";
import {View,Box} from "quark";
import type { VirtualRenderer } from "./virtual_renderer";
import type {IScrollBar} from "./scrollbar";

dom.importCss({
	'.ace_editor>.ace_sb-v .div, .ace_editor>.ace_sb-h .div': {
	backgroundColor: 'rgba(128, 128, 128, 0.6)',
	boxSizing: 'borderBox',
	border: '1 #bbb',
	borderRadius: 2,
	// zIndex: 8,
},
'.ace_editor>.ace_sb-v, .ace_editor>.ace_sb-h': {
	zIndex: 6,
},
'.ace_editor>.ace_sb-v': {
	// z-index: 6;
	align: 'end',
	width: 12,
},
'.ace_editor>.ace_sb-v .div': {
	// z-index: 8;
	width: '100%',
},
'.ace_editor>.ace_sb-h': {
	align: 'leftBottom',
	height: 12,
},
'.ace_editor>.ace_sb-h .div': {
	height: '100%',
},
'.ace_editor>.ace_sb_grabbed': {
	// z-index: 8;
	backgroundColor: '#000',
},
}, "ace_scrollbar.css", false);

/**
 * An abstract class representing a native scrollbar control.
 **/
export abstract class ScrollBar extends EventEmitter implements IScrollBar {
	public element: Box;
	public scrollTop: number = 0;
	public scrollLeft: number = 0;
	public scrollHeight: number = 0;
	public scrollWidth: number = 0;
	public width: number = 0;
	protected inner: Box;
	protected VScrollWidth: number;
	protected HScrollHeight: number;
	protected skipEvent: boolean;
	protected isVisible: boolean;
	protected coeff: number;
	/**
	 * Creates a new `ScrollBar`. `parent` is the owner of the scroll bar.
	 * @param {Element} parent A DOM element
	 * @param {string} classSuffix
	 **/
	constructor(parent: View, classSuffix: string) {
		super();
		// this.element = dom.createElement("div");
		this.element = new Box(parent.window);
		this.element.class = ["ace_sb" + classSuffix];
		this.element.style.layout = "free";

		// this.inner = dom.createElement("div");
		this.inner = new Box(parent.window);
		this.inner.addClass("div");
		this.element.append(this.inner);

		this.VScrollWidth = 12;
		this.HScrollHeight = 12;

		parent.append(this.element);
		this.setVisible(false);
		this.skipEvent = false;

		event.addMultiMouseDownListener(this.element, [500, 300, 300], (eType, e)=>{
			this.onMouseDown(eType, e);
		});
	}

	setVisible(isVisible: boolean) {
		this.element.visible = isVisible;
		this.isVisible = isVisible;
		this.coeff = 1;
	}
	setHeight(height: number): void {}
	setWidth(width: number): void {}
	getWidth(): number { return 0 }
	getHeight(): number { return 0 }
	setScrollHeight(height: number): void {}
	setScrollWidth(width: number): void {}
	setScrollTop(scrollTop: number): void {}
	setScrollLeft(scrollLeft: number): void {}
	protected abstract onMouseDown(
		eType: MultiClickEvent,
		e: MouseEvent & { _clicks?: number }
	): void;
}

/**
 * Represents a vertical scroll bar.
 * @class VScrollBar
 **/

/**
 * Creates a new `VScrollBar`. `parent` is the owner of the scroll bar.
 * @param {Element} parent A DOM element
 * @param {Object} renderer An editor renderer
 *
 * @constructor
 **/
export class VScrollBar extends ScrollBar {
	private $minWidth: number = 0;
	private renderer: VirtualRenderer;
	private thumbTop: number = 0;
	private thumbHeight: number = 0;
	private pageHeight: number = 0;
	private viewHeight: number = 0;
	private slideHeight: number = 0;
	private height: number = 0;

	constructor(parent: View, renderer: VirtualRenderer) {
		super(parent, '-v');
		this.width = this.VScrollWidth;
		this.renderer = renderer;
		this.inner.style.width = this.element.style.width = (this.width || 15);
	}

	/**
	 * Emitted when the scroll thumb dragged or scrollbar canvas clicked.
	 * @internal
	 **/
	onMouseDown(eType: MultiClickEvent, e: MouseEvent & { _clicks?: number }) {
		if (eType !== "mousedown") return;

		if (event.getButton(e) !== 0 || e._clicks === 2) {
			return;
		}

		if (e.origin === this.inner) {
			var self = this;
			var mousePageY = e.position.y;

			var onMouseMove = function (e: MouseEvent) {
				mousePageY = e.position.y;
			};

			var onMouseUp = function () {
				clearInterval(timerId);
			};
			var startY = e.position.y;
			var startTop = this.thumbTop;

			var onScrollInterval = function () {
				if (mousePageY === undefined) return;
				var scrollTop = self.scrollTopFromThumbTop(startTop + mousePageY - startY);
				if (scrollTop === self.scrollTop) return;
				self._emit("scroll", {data: scrollTop});
			};

			event.capture(this.inner, onMouseMove, onMouseUp);
			var timerId = setInterval(onScrollInterval, 20);
			return event.preventDefault(e);
		}

		var pos = this.element.position;
		var top = e.position.y - pos.y - this.thumbHeight / 2;
		this._emit("scroll", {data: this.scrollTopFromThumbTop(top)});
		return event.preventDefault(e);
	}

	getHeight() {
		return this.height;
	}

	/**
	 * Returns new top for scroll thumb
	 * @param {Number}thumbTop
	 * @returns {Number}
	 **/
	scrollTopFromThumbTop(thumbTop: number): number {
		var scrollTop = thumbTop * (this.pageHeight - this.viewHeight) / (this.slideHeight - this.thumbHeight);
		scrollTop = scrollTop >> 0;
		if (scrollTop < 0) {
			scrollTop = 0;
		}
		else if (scrollTop > this.pageHeight - this.viewHeight) {
			scrollTop = this.pageHeight - this.viewHeight;
		}
		return scrollTop;
	}

	/**
	 * Returns the width of the scroll bar.
	 * @returns {Number}
	 **/
	getWidth() {
		return Math.max(this.isVisible ? this.width : 0, this.$minWidth || 0);
	}

	/**
	 * Sets the height of the scroll bar, in pixels.
	 * @param {Number} height The new height
	 **/
	setHeight(height: number, scrollHeight?: number) {
		this.height = Math.max(0, height);
		this.slideHeight = this.height;
		this.viewHeight = this.height;

		this.setScrollHeight(scrollHeight || this.pageHeight, true);
	}

	/**
	 * Sets the inner and scroll height of the scroll bar, in pixels.
	 * @param {Number} height The new inner height
	 *
	 * @param {boolean} force Forcely update height
	 **/
	setScrollHeight(height: number, force?: boolean) {
		if (this.pageHeight === height && !force) return;
		this.pageHeight = height;
		this.thumbHeight = this.slideHeight * this.viewHeight / this.pageHeight;

		if (this.thumbHeight > this.slideHeight) this.thumbHeight = this.slideHeight;
		if (this.thumbHeight < 15) this.thumbHeight = 15;

		this.inner.style.height = this.thumbHeight;

		if (this.scrollTop > (this.pageHeight - this.viewHeight)) {
			this.scrollTop = (this.pageHeight - this.viewHeight);
			if (this.scrollTop < 0) this.scrollTop = 0;
			this._emit("scroll", {data: this.scrollTop});
		}
	}

	setInnerHeight(height: number) {
		this.setScrollHeight(height);
	}

	/**
	 * Sets the scroll top of the scroll bar.
	 * @param {Number} scrollTop The new scroll top
	 **/
	setScrollTop(scrollTop: number) {
		this.scrollTop = scrollTop;
		if (scrollTop < 0) scrollTop = 0;
		this.thumbTop = scrollTop * (this.slideHeight - this.thumbHeight) / (this.pageHeight - this.viewHeight);
		this.inner.style.marginTop = this.thumbTop;
	}
}

/**
 * Represents a horizontal scroll bar.
 **/
export class HScrollBar extends ScrollBar {
	private height: number;
	private renderer: VirtualRenderer;
	private thumbLeft: number;
	private thumbWidth: number;
	private pageWidth: number;
	private viewWidth: number;
	private slideWidth: number;
	/**
	 * Creates a new `HScrollBar`. `parent` is the owner of the scroll bar.
	 * @param {Element} parent A DOM element
	 * @param {Object} renderer An editor renderer
	 **/
	constructor(parent: View, renderer: VirtualRenderer) {
		super(parent, '-h');
		this.scrollLeft = 0;
		this.scrollWidth = 0;
		this.height = this.HScrollHeight;
		this.inner.style.height = this.element.style.height = (this.height || 12);
		this.renderer = renderer;
	}

	/**
	 * Emitted when the scroll thumb dragged or scrollbar canvas clicked.
	 * @internal
	 **/
	onMouseDown(eType: MultiClickEvent, e: MouseEvent & { _clicks?: number }) {
		if (eType !== "mousedown") return;

		if (event.getButton(e) !== 0 || e._clicks === 2) {
			return;
		}

		if (e.origin === this.inner) {
			var self = this;
			var mousePageX = e.position.x;

			var onMouseMove = function (e: MouseEvent) {
				mousePageX = e.position.x;
			};

			var onMouseUp = function () {
				clearInterval(timerId);
			};
			var startX = e.position.x;
			var startLeft = this.thumbLeft;

			var onScrollInterval = function () {
				if (mousePageX === undefined) return;
				var scrollLeft = self.scrollLeftFromThumbLeft(startLeft + mousePageX - startX);
				if (scrollLeft === self.scrollLeft) return;
				self._emit("scroll", {data: scrollLeft});
			};

			event.capture(this.inner, onMouseMove, onMouseUp);
			var timerId = setInterval(onScrollInterval, 20);
			return event.preventDefault(e);
		}

		var pos = this.element.position;
		var left = e.position.x - pos.x - this.thumbWidth / 2;
		this._emit("scroll", {data: this.scrollLeftFromThumbLeft(left)});
		return event.preventDefault(e);
	}

	/**
	 * Returns the height of the scroll bar.
	 * @returns {Number}
	 **/
	getHeight() {
		return this.isVisible ? this.height : 0;
	}

	/**
	 * Returns new left for scroll thumb
	 * @param {Number} thumbLeft
	 * @returns {Number}
	 **/
	scrollLeftFromThumbLeft(thumbLeft: number): number {
		var scrollLeft = thumbLeft * (this.pageWidth - this.viewWidth) / (this.slideWidth - this.thumbWidth);
		scrollLeft = scrollLeft >> 0;
		if (scrollLeft < 0) {
			scrollLeft = 0;
		}
		else if (scrollLeft > this.pageWidth - this.viewWidth) {
			scrollLeft = this.pageWidth - this.viewWidth;
		}
		return scrollLeft;
	}

	/**
	 * Sets the width of the scroll bar, in pixels.
	 * @param {Number} width The new width
	 **/
	setWidth(width: number) {
		this.width = Math.max(0, width);
		this.element.style.width = this.width;
		this.slideWidth = this.width;
		this.viewWidth = this.width;

		this.setScrollWidth(this.pageWidth, true);
	}

	getWidth(): number {
		return this.width;
	}

	/**
	 * Sets the inner and scroll width of the scroll bar, in pixels.
	 * @param {Number} width The new inner width
	 * @param {boolean} force Forcely update width
	 **/
	 setScrollWidth(width: number, force?: boolean) {
		if (this.pageWidth === width && !force) return;
		this.pageWidth = width;
		this.thumbWidth = this.slideWidth * this.viewWidth / this.pageWidth;

		if (this.thumbWidth > this.slideWidth) this.thumbWidth = this.slideWidth;
		if (this.thumbWidth < 15) this.thumbWidth = 15;
		this.inner.style.width = this.thumbWidth;

		if (this.scrollLeft > (this.pageWidth - this.viewWidth)) {
			this.scrollLeft = (this.pageWidth - this.viewWidth);
			if (this.scrollLeft < 0) this.scrollLeft = 0;
			this._emit("scroll", {data: this.scrollLeft});
		}
	}

	setInnerWidth(width: number) {
		this.setScrollWidth(width);
	}

	/**
	 * Sets the scroll left of the scroll bar.
	 * @param {Number} scrollLeft The new scroll left
	 **/
	setScrollLeft(scrollLeft: number) {
		this.scrollLeft = scrollLeft;
		if (scrollLeft < 0) scrollLeft = 0;
		this.thumbLeft = scrollLeft * (this.slideWidth - this.thumbWidth) / (this.pageWidth - this.viewWidth);
		this.inner.style.marginLeft = this.thumbLeft;
	}

}