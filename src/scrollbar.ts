"use strict";

import type { VirtualRenderer } from "./virtual_renderer";
import {EventEmitter} from "./lib/event_emitter";
import {View,Box, Scroll} from 'quark';
import {UIEvent} from 'quark/event';

// on ie maximal element height is smaller than what we get from 4-5K line document
// so scrollbar doesn't work, as a workaround we do not set height higher than MAX_SCROLL_H
// and rescale scrolltop
const MAX_SCROLL_H = 0x8000;
const SCROLLBAR_SIZE = 15;

export interface ScrollbarEvents {
	"scroll": (e: { data: number }, emitter: Scrollbar) => void;
}

export interface IScrollBar extends EventEmitter<ScrollbarEvents> {
	element: View;
	scrollTop: number;
	scrollLeft: number;
	scrollHeight: number;
	scrollWidth: number;
	width: number;
	setVisible(isVisible: boolean): void;
	setHeight(height: number, scrollHeight?: number): void;
	setWidth(width: number): void;
	getWidth(): number;
	getHeight(): number;
	setScrollHeight(height: number): void;
	setScrollWidth(width: number): void;
	setScrollTop(scrollTop: number): void;
	setScrollLeft(scrollLeft: number): void;
}

/**
 * An abstract class representing a native scrollbar control.
 **/
export abstract class Scrollbar extends EventEmitter<ScrollbarEvents> implements IScrollBar {
	public element: Scroll;
	public scrollTop: number = 0;
	public scrollLeft: number = 0;
	public scrollHeight: number = 0;
	public scrollWidth: number = 0;
	public width: number = 0;
	protected inner: Box;
	protected skipEvent: number;
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
		this.element = new Scroll(parent.window);
		this.element.class = ["ace_scrollbar", "ace_scrollbar" + classSuffix];

		// this.inner = dom.createElement("div");
		this.inner = new Box(parent.window);
		this.inner.addClass("ace_scrollbar-inner");
		this.element.append(this.inner);

		parent.append(this.element);

		this.setVisible(false);
		this.skipEvent = 0;

		this.element.onScroll.on(this.onScroll.bind(this));
		this.element.onMouseWheel.on(e => e.cancelBubble());
		// this.element.onMouseDown.on(e => e.cancelDefault());
	}

	setVisible(isVisible: boolean) {
		this.element.style.visible = isVisible;
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

	protected abstract onScroll(e: UIEvent): void;
}

/**
 * Represents a vertical scroll bar.
 **/
export class VScrollBar extends Scrollbar {
	private $minWidth: number;

	/**
	 * Creates a new `VScrollBar`. `parent` is the owner of the scroll bar.
	 * @param {Element} parent A DOM element
	 * @param {Object} renderer An editor renderer
	 **/
	constructor(parent: View, renderer: VirtualRenderer) {
		super(parent, '-v');
		this.scrollTop = 0;
		this.scrollHeight = 0;
		this.width = 0;//SCROLLBAR_SIZE;
		//this.element.style.width = SCROLLBAR_SIZE;
		this.element.style.width = '90%';
		this.inner.style.width = SCROLLBAR_SIZE;
		this.element.style.height = 'match';
	}

	/**
	 * Emitted when the scroll bar, well, scrolls.
	 * @event scroll
	 * @internal
	 **/

	protected onScroll() {
		if (!this.skipEvent && this.element.scrollTop != this.scrollTop) {
			this.scrollTop = this.element.scrollTop;
			if (this.coeff != 1) {
				var h = this.element.clientSize.y / this.scrollHeight;
				this.scrollTop = this.scrollTop * (1 - h) / (this.coeff - h);
			}
			this._emit("scroll", {data: this.scrollTop}, this);
		}
		this.skipEvent = Math.max(0, this.skipEvent - 1);
	}

	/**
	 * Returns the width of the scroll bar.
	 * @returns {Number}
	 **/
	getWidth() {
		return this.isVisible ? this.width : 0;
	}

	/**
	 * Sets the height of the scroll bar, in pixels.
	 * @param {Number} height The new height
	 **/
	setHeight(height: number) {
		this.element.style.height = height;
	}

	/**
	 * Sets the inner height of the scroll bar, in pixels.
	 * @param {Number} height The new inner height
	 * @deprecated Use setScrollHeight instead
	 **/
	setInnerHeight = VScrollBar.prototype.setScrollHeight;

	/**
	 * Sets the scroll height of the scroll bar, in pixels.
	 * @param {Number} height The new scroll height
	 **/
	setScrollHeight(height: number) {
		this.scrollHeight = height >>> 0;
		if (height > MAX_SCROLL_H) {
			this.coeff = MAX_SCROLL_H / height;
			height = MAX_SCROLL_H;
		} else if (this.coeff != 1) {
			this.coeff = 1;
		}
		this.inner.style.height = height;
	}

	/**
	 * Sets the scroll top of the scroll bar.
	 * @param {Number} scrollTop The new scroll top
	 **/
	setScrollTop(scrollTop: number) {
		// on chrome 17+ for small zoom levels after calling this function
		// this.element.scrollTop != scrollTop which makes page to scroll up.
		if (this.scrollTop != scrollTop) {
			this.skipEvent = 2;
			this.scrollTop = scrollTop;
			this.element.scrollTop = scrollTop * this.coeff;
		}
	}
}

/**
 * Represents a horisontal scroll bar.
 **/
export class HScrollBar extends Scrollbar {
	public height: number;
	/**
	 * Creates a new `HScrollBar`. `parent` is the owner of the scroll bar.
	 * @param {Element} parent A DOM element
	 * @param {Object} renderer An editor renderer
	 **/
	constructor(parent: View, renderer: VirtualRenderer) {
		super(parent, '-h');
		this.scrollLeft = 0;
		this.height = 0;//SCROLLBAR_SIZE;
		this.inner.style.height = SCROLLBAR_SIZE;
		this.element.style.height = SCROLLBAR_SIZE;
		this.element.style.width = 'match';
		this.element.style.marginRight = SCROLLBAR_SIZE;
	}

	/**
	 * Emitted when the scroll bar, well, scrolls.
	 * @event scroll
	 * @internal
	 **/
	protected onScroll() {
		if (!this.skipEvent && this.element.scrollLeft != this.scrollLeft) {
			this.scrollLeft = this.element.scrollLeft;
			this._emit("scroll", {data: this.scrollLeft}, this);
		}
		this.skipEvent = Math.max(0, this.skipEvent - 1);
	}

	/**
	 * Returns the height of the scroll bar.
	 * @returns {Number}
	 **/
	getHeight() {
		return this.isVisible ? this.height : 0;
	}

	/**
	 * Sets the width of the scroll bar, in pixels.
	 * @param {Number} width The new width
	 **/
	setWidth(width: number) {
		this.element.style.width = width;
	}

	/**
	 * Sets the inner width of the scroll bar, in pixels.
	 * @param {Number} width The new inner width
	 * @deprecated Use setScrollWidth instead
	 **/
	setInnerWidth(width: number) {
		this.inner.style.width = width;
	}

	/**
	 * Sets the scroll width of the scroll bar, in pixels.
	 * @param {Number} width The new scroll width
	 **/
	setScrollWidth(width: number) {
		this.inner.style.width = width;
	}

	/**
	 * Sets the scroll left of the scroll bar.
	 * @param {Number} scrollLeft The new scroll left
	 **/
	setScrollLeft(scrollLeft: number) {
		scrollLeft = scrollLeft >>> 0;
		// on chrome 17+ for small zoom levels after calling this function
		// this.element.scrollTop != scrollTop which makes page to scroll up.
		if (this.scrollLeft != scrollLeft) {
			this.skipEvent = 2;
			this.scrollLeft = this.element.scrollLeft = scrollLeft;
		}
	}
}